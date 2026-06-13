import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

export async function getEmbedding(text, embeddingConfig) {
  const { provider, endpoint, model } = embeddingConfig;
  try {
    if (provider === 'ollama') {
      const res = await fetch(`${endpoint}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: text })
      });
      const data = await res.json();
      return data.embedding || [];
    } else {
      // LM Studio / OpenAI compatible
      const res = await fetch(`${endpoint}/v1/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, input: text })
      });
      const data = await res.json();
      return data.data?.[0]?.embedding || [];
    }
  } catch (err) {
    console.error("Embedding generation failed:", err);
    return [];
  }
}

// ─── Text extraction ──────────────────────────────────────────────────────────
export async function extractTextFromFile(file) {
  const mime = file.mimetype || '';
  const name = (file.originalname || '').toLowerCase();

  if (mime === 'application/pdf' || name.endsWith('.pdf')) {
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(file.buffer);
    return data.text;
  }

  // Plain text formats
  const textTypes = ['text/plain', 'text/markdown', 'application/json',
                     'text/javascript', 'text/x-python', 'text/csv'];
  if (textTypes.some(t => mime.includes(t)) ||
      /\.(txt|md|json|js|ts|py|csv|yaml|yml|html|css|jsx|tsx)$/.test(name)) {
    return file.buffer.toString('utf-8');
  }

  throw new Error(`Unsupported file type: ${mime || name}`);
}

// ─── Chunking with overlap ────────────────────────────────────────────────────
export function chunkText(text, chunkSize = 500, overlap = 80) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  let i = 0;
  while (i < words.length) {
    const slice = words.slice(i, i + chunkSize).join(' ');
    if (slice.trim()) chunks.push(slice.trim());
    i += chunkSize - overlap;
  }
  return chunks;
}

// ─── Knowledge base query ─────────────────────────────────────────────────────
export async function queryKnowledgeBase(query, documentIds, topK = 3) {
  const { db } = await import('./db.js');
  const documents = db.getDocuments().filter(d => documentIds.includes(d.id));
  if (!documents.length) return [];

  const embeddingConfig = db.read().embedding || { provider: 'lmstudio', endpoint: 'http://127.0.0.1:1234', model: 'nomic-embed-text-v1.5' };
  
  // Get query embedding
  const queryVec = await getEmbedding(query, embeddingConfig);
  if (!queryVec.length) return []; // Fallback or error

  const allChunks = [];
  for (const doc of documents) {
    for (const chunkData of (doc.chunks || [])) {
      // chunkData should now be { text: string, embedding: number[] }
      if (chunkData.embedding && chunkData.embedding.length > 0) {
        allChunks.push({ 
          text: chunkData.text, 
          embedding: chunkData.embedding,
          documentName: doc.name, 
          docId: doc.id 
        });
      }
    }
  }

  // Cosine similarity function
  function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  const scored = allChunks.map(chunk => ({
    ...chunk,
    similarity: cosineSimilarity(queryVec, chunk.embedding)
  }));

  return scored
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)
    .filter(c => c.similarity > 0.1); // Minimum relevance threshold
}
