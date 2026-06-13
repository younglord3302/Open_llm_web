import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from './services/db.js';
import { getAvailableModels, streamChatCompletion, checkEndpointHealth } from './services/llmService.js';
import { extractTextFromFile, chunkText, queryKnowledgeBase, getEmbedding } from './services/ragService.js';
import { AGENTS, getSimulatedReasoning } from './services/agentService.js';
import { registerUser, loginUser, authMiddleware } from './services/authService.js';
import { workspaceService } from './services/workspaceService.js';
import { fileURLToPath } from 'url';
import { startWebSocketServer } from './services/wsService.js';
import { exec } from 'child_process';

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,       // Allow inline styles/scripts for SSE
  crossOriginEmbedderPolicy: false,   // Allow local LLM endpoints
}));

// Rate limiting — 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' }
});
app.use('/api/', limiter);

// Stricter limit on auth endpoints — 10 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts. Please try again later.' }
});

// Configure Multer in-memory storage for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

app.use(cors());
app.use(express.json({ limit: '1mb' }));  // Limit JSON body size

// Serve built frontend in production
const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

// --- Auth Routes (public, no middleware) ---

app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    const result = await registerUser(email, password, name);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    const result = await loginUser(email, password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// All routes below this line require a valid JWT
app.use('/api/chats', authMiddleware);
app.use('/api/messages', authMiddleware);
app.use('/api/models', authMiddleware);
app.use('/api/agents', authMiddleware);
app.use('/api/documents', authMiddleware);
app.use('/api/upload', authMiddleware);
app.use('/api/chat', authMiddleware);
app.use('/api/workspace', authMiddleware);

// --- Workspace Routes ---

app.get('/api/workspace/tree', (req, res) => {
  try {
    res.json(workspaceService.getFileTree());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/workspace/file', (req, res) => {
  try {
    const { path: filePath } = req.query;
    if (!filePath) return res.status(400).json({ error: 'File path is required' });
    const content = workspaceService.readFile(filePath);
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/workspace/file', (req, res) => {
  try {
    const { path: filePath, content } = req.body;
    if (!filePath) return res.status(400).json({ error: 'File path is required' });
    workspaceService.writeFile(filePath, content || '');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/workspace/file', (req, res) => {
  try {
    const { path: filePath } = req.query;
    if (!filePath) return res.status(400).json({ error: 'File path is required' });
    workspaceService.deleteFile(filePath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/workspace/clear', (req, res) => {
  try {
    workspaceService.clearWorkspace();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Simple MIME type mapping to avoid extra dependencies
const MIME_TYPES = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

app.get('/api/workspace/preview', authMiddleware, (req, res) => {
  try {
    const { path: filePath } = req.query;
    if (!filePath) return res.status(400).send('File path is required');
    
       const safePath = path.resolve(__dirname, 'workspace', filePath);
       const workspaceRoot = path.resolve(__dirname, 'workspace');
       if (!safePath.startsWith(workspaceRoot)) {
         return res.status(403).send('Invalid path');
       }

    if (!fs.existsSync(safePath)) {
      return res.status(404).send('File not found');
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'text/plain';
    
    res.setHeader('Content-Type', contentType);
    // Allow embedding in iframes if needed, though we are opening in new tab
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    
    const fileContent = fs.readFileSync(safePath, 'utf-8');
    res.send(fileContent);
  } catch (err) {
    res.status(500).send('Error serving file: ' + err.message);
  }
});

// --- Chat Routes ---

app.get('/api/chats', (req, res) => {
  try {
    res.json(db.getChats());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chats', (req, res) => {
  try {
    const { title, model_id, agent_id } = req.body;
    const chat = db.createChat(title, model_id || 'mock-model', agent_id || null);
    res.status(201).json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/chats/:id', (req, res) => {
  try {
    db.deleteChat(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Chat File Attachments ---
app.post('/api/chats/:chatId/attach', upload.single('file'), async (req, res) => {
  try {
    const { chatId } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const rawText = await extractTextFromFile(req.file);
    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ error: 'Failed to extract text or file is empty' });
    }

    const attachment = {
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      chatId,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      text: rawText,
      timestamp: new Date().toISOString()
    };

    // Store attachment in db
    const data = db.read();
    if (!data.chatAttachments) data.chatAttachments = [];
    data.chatAttachments.push(attachment);
    db.write(data);

    res.status(201).json({ success: true, attachment: { id: attachment.id, fileName: attachment.fileName, fileSize: attachment.fileSize } });
  } catch (err) {
    console.error("Chat attach error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/chats/:chatId/attachments', (req, res) => {
  try {
    const { chatId } = req.params;
    const data = db.read();
    const attachments = (data.chatAttachments || []).filter(a => a.chatId === chatId);
    res.json(attachments.map(a => ({ id: a.id, fileName: a.fileName, fileSize: a.fileSize, mimeType: a.mimeType, timestamp: a.timestamp })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/chats/:chatId/attachments/:attId', (req, res) => {
  try {
    const { chatId, attId } = req.params;
    const data = db.read();
    data.chatAttachments = (data.chatAttachments || []).filter(a => !(a.chatId === chatId && a.id === attId));
    db.write(data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/messages/:chatId', (req, res) => {
  try {
    res.json(db.getMessages(req.params.chatId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Model Routes ---

app.get('/api/models', async (req, res) => {
  try {
    const models = await getAvailableModels();
    res.json(models);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/models/connect', async (req, res) => {
  try {
    const { id, enabled, endpoint } = req.body;
    const models = db.getModels();
    const existing = models.find(m => m.id === id);
    if (!existing) {
      return res.status(404).json({ error: 'Model template not found' });
    }

    // Ping check health if enabling/updating endpoint
    let isHealthy = true;
    if (enabled && endpoint && existing.provider !== 'mock') {
      isHealthy = await checkEndpointHealth(existing.provider, endpoint);
    }

    existing.enabled = enabled;
    if (endpoint) existing.endpoint = endpoint;
    db.saveModel(existing);

    res.json({ success: true, model: existing, healthy: isHealthy });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/models/select', (req, res) => {
  try {
    const { id } = req.body;
    const models = db.setActiveModel(id);
    res.json({ success: true, models });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Agent Routes ---

app.get('/api/agents', (req, res) => {
  res.json(Object.values(AGENTS));
});

// --- Document/RAG Routes ---

app.get('/api/documents', (req, res) => {
  try {
    res.json(db.getDocuments());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const rawText = await extractTextFromFile(req.file);
    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ error: 'Failed to extract text or file is empty' });
    }

    // Split text into overlapping chunks
    const chunks = chunkText(rawText);

    // Generate embeddings for each chunk
    const embeddingConfig = db.read().embedding || { provider: 'lmstudio', endpoint: 'http://127.0.0.1:1234', model: 'nomic-embed-text-v1.5' };
    
    const chunksWithEmbeddings = [];
    for (const chunk of chunks) {
      const embedding = await getEmbedding(chunk, embeddingConfig);
      chunksWithEmbeddings.push({ text: chunk, embedding });
    }

    // Save to db.json
    const newDoc = db.addDocument(
      req.file.originalname,
      req.file.path || 'memory',
      rawText,
      chunksWithEmbeddings
    );

    res.status(201).json(newDoc);
  } catch (err) {
    console.error("Upload error", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/documents/:id', (req, res) => {
  try {
    db.deleteDocument(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Unified Streaming Chat Endpoint ---

app.post('/api/chat', async (req, res) => {
  try {
    const { chatId, content, modelId, agentId, documentIds } = req.body;
    console.log("[CHAT DEBUG] Request received. Body:", { chatId, content, modelId });

    if (!chatId || !content) {
      return res.status(400).json({ error: 'Missing chatId or content' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullResponse = '';
    let reasoningLogs = '';
    let sources = null;

    const models = await getAvailableModels();
    const modelInfo = models.find(m => m.id === modelId) || models.find(m => m.active) || models[0];

    if (!modelInfo) {
      res.write(`data: ${JSON.stringify({ error: 'No models available or model not found.' })}\n\n`);
      return res.end();
    }

    // 2. Fetch history
    const history = db.getMessages(chatId);
    
    // 3. Setup context query if documents are attached (RAG)
    let ragContext = '';
    if (documentIds && Array.isArray(documentIds) && documentIds.length > 0) {
      const matchedChunks = await queryKnowledgeBase(content, documentIds, 3);
      if (matchedChunks && matchedChunks.length > 0) {
        sources = matchedChunks.map(c => ({
          documentName: c.documentName,
          similarity: c.similarity
        }));
        ragContext = `Use the following documents context to answer the user query accurately:\n\n${
          matchedChunks.map((c, i) => `[Source ${i+1}]: ${c.documentName}\nContent: ${c.text}`).join('\n\n')
        }\n\n`;
      }
    }

    // 4. Setup agent system prompt if applicable
    let systemPrompt = 'You are a helpful local AI assistant.';
    if (agentId && AGENTS[agentId]) {
      systemPrompt = AGENTS[agentId].systemPrompt;
      
      // Inject reasoning logs first
      reasoningLogs = getSimulatedReasoning(agentId, content);
      res.write(`data: ${JSON.stringify({ chunk: reasoningLogs })}\n\n`);
      fullResponse += reasoningLogs;
    }

    // Combine history, system inputs and latest prompts
    const formattedMessages = [];
    formattedMessages.push({ role: 'system', content: systemPrompt + (ragContext ? `\n\n${ragContext}` : '') });
    
    // Append past messages
    history.forEach(m => {
      formattedMessages.push({ role: m.role, content: m.content });
    });
    
    // Append current prompt
    formattedMessages.push({ role: 'user', content });

    // Save user's question to the database
    db.addMessage(chatId, 'user', content);

    // 5. Query LLM via provider adapter
    let cleanupStream = null;
    
    console.log("[CHAT DEBUG] About to call streamChatCompletion with model:", modelInfo?.name);
    cleanupStream = await streamChatCompletion({
      messages: formattedMessages,
      modelInfo,
      onChunk: (chunk) => {
        try {
          fullResponse += chunk;
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        } catch (e) {
          console.error("Error in onChunk:", e);
        }
      },
      onDone: () => {
        try {
          // Save assistant's reply to the database
          db.addMessage(chatId, 'assistant', fullResponse, sources);
          res.write('data: [DONE]\n\n');
          res.end();
        } catch (e) {
          console.error("Error in onDone (e.g., database save failed):", e);
          if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ error: 'Failed to save message' })}\n\n`);
            res.end();
          }
        }
      },
      onError: (err) => {
        try {
          console.error("Streaming error:", err);
          if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ error: err.message || 'Unknown streaming error' })}\n\n`);
            res.end();
          }
        } catch (e) {
          console.error("Error in onError handler:", e);
          if (!res.writableEnded) res.end();
        }
      }
    });

    req.on('close', () => {
      if (cleanupStream && typeof cleanupStream === 'function') {
        cleanupStream();
      }
    });

  } catch (err) {
    console.error("[CHAT FATAL] Endpoint crashed with error:", err);
    // If headers are already sent, we can't change status, just write error and end
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: 'Server error during stream: ' + err.message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: 'Internal server error: ' + err.message });
    }
  }
});

app.post('/api/webdev/orchestrate', authMiddleware, async (req, res) => {
  console.log("[Orchestrate] Received body:", req.body);
  const { prompt, roleAssignments } = req.body;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const models = await getAvailableModels();
    console.log("[Orchestrate] Available models count:", models.length);
    
    const runAgent = async (agentId, modelId, taskPrompt) => {
      console.log(`[Orchestrate] Running agent: ${agentId} with model: ${modelId}`);
      const modelInfo = models.find(m => m.id === modelId);
      console.log(`[Orchestrate] Model info found:`, modelInfo ? modelInfo.name : 'NOT FOUND');
      if (!modelInfo) throw new Error(`Model ${modelId} not found`);
      
      const agent = AGENTS[agentId];
      const messages = [
        { role: 'system', content: agent ? agent.systemPrompt : 'You are a helpful assistant.' },
        { role: 'user', content: taskPrompt }
      ];

      let fullResponse = '';
      res.write(`data: ${JSON.stringify({ type: 'start', agent: agentId })}\n\n`);
      
      await new Promise((resolve, reject) => {
        streamChatCompletion({
          messages,
          modelInfo,
          onChunk: (chunk) => {
            fullResponse += chunk;
            res.write(`data: ${JSON.stringify({ type: 'chunk', agent: agentId, chunk })}\n\n`);
          },
          onDone: () => {
            res.write(`data: ${JSON.stringify({ type: 'done', agent: agentId, content: fullResponse })}\n\n`);
            resolve(fullResponse);
          },
          onError: (err) => reject(err)
        });
      });
      return fullResponse;
    };

    // Sequential (Sync) orchestration: each agent builds on the previous one's context
    const activeRoles = Object.entries(roleAssignments || {}).filter(([_, modelId]) => modelId);
    console.log("[Orchestrate] Active roles to run (Sequential):", activeRoles.map(([role]) => role));
    
    let accumulatedContext = `Original Request: ${prompt}\n`;
    
    for (const [role, modelId] of activeRoles) {
      const agentId = `webdev-${role}`;
      const taskPrompt = `${accumulatedContext}\n\n--- YOUR TASK ---\nPlease perform your ${role} task based on the accumulated context above. Provide your output clearly.`;
      
      console.log(`[Orchestrate] Running ${agentId}...`);
      try {
        const result = await runAgent(agentId, modelId, taskPrompt);
        accumulatedContext += `\n\n--- ${role.toUpperCase()} OUTPUT ---\n${result}`;
        console.log(`[Orchestrate] ${agentId} completed successfully.`);
      } catch (err) {
        console.error(`[Orchestrate] Agent ${agentId} failed:`, err);
        res.write(`data: ${JSON.stringify({ type: 'error', agent: agentId, message: err.message })}\n\n`);
        break; // Stop the chain if one agent fails
      }
    }
    
    console.log("[Orchestrate] Orchestration finished.");
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error("[Orchestrate] Top-level error:", err);
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    res.end();
  }
});

// ── Conversation Search ──
app.post('/api/search', (req, res) => {
  try {
    const { query } = req.body;
    if (!query || !query.trim()) return res.status(400).json({ error: 'Query is required' });
    const results = db.searchMessages(query);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Chat Forking ──
app.post('/api/chats/:id/fork', (req, res) => {
  try {
    const forked = db.forkChat(req.params.id);
    if (!forked) return res.status(404).json({ error: 'Chat not found' });
    res.status(201).json(forked);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Prompt Templates ──
app.get('/api/prompts', (req, res) => {
  res.json(db.getPromptTemplates());
});
app.post('/api/prompts', (req, res) => {
  const { id, name, content, category } = req.body;
  if (!name || !content) return res.status(400).json({ error: 'Name and content are required' });
  const saved = db.savePromptTemplate({ id: id || null, name, content, category: category || 'general' });
  res.status(201).json(saved);
});
app.delete('/api/prompts/:id', (req, res) => {
  db.deletePromptTemplate(req.params.id);
  res.json({ success: true });
});

// ── API Key Management ──
app.get('/api/keys', (req, res) => {
  res.json(db.getApiKeys());
});
app.post('/api/keys', (req, res) => {
  const { provider, key } = req.body;
  if (!provider || !key) return res.status(400).json({ error: 'Provider and key are required' });
  const saved = db.saveApiKey({ provider, key });
  res.status(201).json(saved);
});
app.delete('/api/keys/:id', (req, res) => {
  db.deleteApiKey(req.params.id);
  res.json({ success: true });
});

// ── Image Generation (Stable Diffusion / DALL-E) ──
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, provider, size } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
    
    const activeProvider = provider || 'stability';
    const imageSize = size || '1024x1024';
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    res.write(`data: ${JSON.stringify({ type: 'status', message: `Generating with ${activeProvider}… Size: ${imageSize}` })}\n\n`);

    // Mock image generation (in production, call provider API)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    res.write(`data: ${JSON.stringify({ type: 'complete', url: null, prompt, message: 'Mock image generation complete. Configure a real API key in Settings > API Keys for real generation.' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// ── Plugins ──
app.get('/api/plugins', (req, res) => {
  res.json(db.getPlugins());
});
app.post('/api/plugins', (req, res) => {
  const plugin = req.body;
  if (!plugin.name || !plugin.handler) return res.status(400).json({ error: 'Name and handler are required' });
  const saved = db.savePlugin({ ...plugin, enabled: true });
  res.status(201).json(saved);
});
app.delete('/api/plugins/:id', (req, res) => {
  db.deletePlugin(req.params.id);
  res.json({ success: true });
});

// SPA catch-all — serve index.html for any non-API route
if (fs.existsSync(publicDir)) {
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(publicDir, 'index.html'));
    }
  });
}

const server = app.listen(PORT, () => {
  console.log(`Local LLM Backend running on http://localhost:${PORT}`);
  startWebSocketServer(server);
});
