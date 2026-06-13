import { db } from './db.js';

// Dynamically fetch models from active provider endpoints with short timeouts
export async function getAvailableModels() {
  const models = db.getModels();
  const activeModels = [...models];

  // Ollama Discovery
  const ollamaModels = models.filter(m => m.provider === 'ollama' && m.enabled);
  for (const ollama of ollamaModels) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${ollama.endpoint}/api/tags`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.models && Array.isArray(data.models)) {
          data.models.forEach(m => {
            activeModels.push({
              id: `ollama-${m.name}-${ollama.id}`,
              name: `${m.name} (${ollama.name})`,
              provider: 'ollama',
              endpoint: ollama.endpoint,
              modelName: m.name,
              machineId: ollama.id,
              enabled: true,
              active: false
            });
          });
        }
      }
    } catch (e) {
      // Skip unreachable machines
    }
  }

  // LM Studio Discovery
  const lmstudioModels = models.filter(m => m.provider === 'lmstudio' && m.enabled);
  for (const lmstudio of lmstudioModels) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${lmstudio.endpoint}/v1/models`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.data && Array.isArray(data.data)) {
          data.data.forEach(m => {
            activeModels.push({
              id: `lmstudio-${m.id}-${lmstudio.id}`,
              name: `${m.id} (${lmstudio.name})`,
              provider: 'lmstudio',
              endpoint: lmstudio.endpoint,
              modelName: m.id,
              machineId: lmstudio.id,
              enabled: true,
              active: false
            });
          });
        }
      }
    } catch (e) {
      // Skip unreachable machines
    }
  }

  return activeModels;
}

// Check endpoint health status
export async function checkEndpointHealth(provider, endpoint) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    if (provider === 'ollama') {
      const res = await fetch(`${endpoint}/api/tags`, { signal: controller.signal });
      clearTimeout(timeoutId);
      return res.ok;
    } else if (provider === 'lmstudio') {
      const res = await fetch(`${endpoint}/v1/models`, { signal: controller.signal });
      clearTimeout(timeoutId);
      return res.ok;
    }
    clearTimeout(timeoutId);
    return false;
  } catch (e) {
    return false;
  }
}

// Mock streaming response generator
export function generateMockStream(prompt, systemPrompt, onChunk, onDone) {
  const responses = [
    `Here's a comprehensive response about your inquiry. Since we are running in **Mock Mode**, I'm demonstrating the full markdown streaming capability of this Local LLM platform.\n\n### Core Concept\nTo work with local models, ensure you have Ollama or LM Studio running on your computer. Once running, you can connect the models via the **Model Manager** page.\n\n### Sample Code Block\nHere is a code snippet showing how simple it is to query local models via Node.js:\n\`\`\`javascript\nasync function queryLocalOllama() {\n  const response = await fetch("http://localhost:11434/api/generate", {\n    method: "POST",\n    body: JSON.stringify({\n      model: "llama3",\n      prompt: "Hello!"\n    })\n  });\n  const result = await response.json();\n  console.log(result.response);\n}\n\`\`\`\n\nIs there anything specific you would like to test or simulate? I can act as different personas or write code segments for you!`,
    `Sure! I've loaded your context. To achieve this, we can follow these core guidelines:\n\n1. **Data Separation**: Clean modular service layers.\n2. **State Management**: React state or lightweight stores.\n3. **Interface Simplicity**: A sleek glassmorphic dashboard.\n\nLet's write a simple HTML structure:\n\`\`\`html\n<div class="glass-card">\n  <h2>Local AI Orchestrator</h2>\n  <p>Status: Active</p>\n</div>\n\`\`\`\nLet me know if you would like me to expand this template!`,
    `As a mock language model, I'm streaming this text directly to demonstrate the responsive, real-time message stream. In a real environment, this text would be flowing word-by-word directly from your local llama.cpp or Ollama service.\n\nWould you like to try uploading a document next to test the local RAG knowledge-base querying?`
  ];

  // Pick a response based on the prompt content keyword search or randomly
  let text = responses[0];
  if (prompt.toLowerCase().includes('code') || prompt.toLowerCase().includes('create') || prompt.toLowerCase().includes('build')) {
    text = responses[1];
  } else if (prompt.length < 15) {
    text = responses[2];
  }

  // Simulate text chunk by chunk streaming
  let index = 0;
  const words = text.split(/(\s+)/);
  const interval = setInterval(() => {
    if (index < words.length) {
      onChunk(words[index]);
      index++;
    } else {
      clearInterval(interval);
      onDone();
    }
  }, 25); // Faster streaming for responsive feeling

  return () => clearInterval(interval);
}

// Primary Stream router
export async function streamChatCompletion({ messages, modelInfo, onChunk, onDone, onError }) {
  if (!modelInfo || modelInfo.provider === 'mock') {
    // Generate Mock response stream
    const prompt = messages[messages.length - 1]?.content || '';
    const systemMessage = messages.find(m => m.role === 'system')?.content || 'You are a helpful AI Assistant.';
    return generateMockStream(prompt, systemMessage, onChunk, onDone);
  }

  const { provider, endpoint, modelName } = modelInfo;

  if (!modelName) {
    onError(new Error("Model name is missing. Please select a specific discovered model from the Model Manager."));
    return () => {};
  }

  try {
    if (provider === 'ollama') {
      const response = await fetch(`${endpoint}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          stream: true
        })
      });

      if (!response.ok) {
        let errorMsg = `Ollama returned status code: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMsg = `Ollama Error: ${typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error)}`;
          } else {
            errorMsg = `Ollama Error: ${JSON.stringify(errorData)}`;
          }
        } catch (e) {
          // Ignore if not JSON
        }
        throw new Error(errorMsg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      let active = true;
      const read = async () => {
        while (active) {
          const { done, value } = await reader.read();
          if (done) {
            onDone();
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop(); // Keep last incomplete line

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const json = JSON.parse(line);
              if (json.message && json.message.content) {
                onChunk(json.message.content);
              }
            } catch (err) {
              console.error("Error parsing Ollama stream chunk", err);
            }
          }
        }
      };

      read().catch(e => {
        if (active) onError(e);
      });

      return () => {
        active = false;
        reader.cancel();
      };
    } else if (provider === 'lmstudio') {
      // LM Studio uses OpenAI chat/completions compatible SSE format
      const response = await fetch(`${endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          stream: true
        })
      });

      if (!response.ok) {
        let errorMsg = `LM Studio returned status code: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error && errorData.error.message) {
            errorMsg = `LM Studio Error: ${errorData.error.message}`;
          } else {
            errorMsg = `LM Studio Error: ${JSON.stringify(errorData)}`;
          }
        } catch (e) {
          // Ignore if not JSON
        }
        throw new Error(errorMsg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let active = true;
      let doneCalled = false; // Guard against double onDone()

      const callDone = () => {
        if (!doneCalled) {
          doneCalled = true;
          onDone();
        }
      };

      const read = async () => {
        while (active) {
          const { done, value } = await reader.read();
          if (done) {
            callDone();
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine || !cleanLine.startsWith('data:')) continue;
            const dataStr = cleanLine.substring(5).trim();
            if (dataStr === '[DONE]') {
              active = false;
              callDone();
              break;
            }
            try {
              const json = JSON.parse(dataStr);
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                onChunk(content);
              }
            } catch (err) {
              // Ignore parse errors on invalid stream lines
            }
          }
        }
      };

      read().catch(e => {
        if (active) onError(e);
      });

      return () => {
        active = false;
        reader.cancel();
      };
    }
  } catch (err) {
    onError(err);
  }
}
