import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, '../db.json');

// Default Database Structure
const DEFAULT_DB = {
  users: [
    { id: 'local-user', email: 'user@local.ai', name: 'Local User' }
  ],
  chats: [],
  messages: [],
  models: [
    { id: 'mock-model', name: 'Mock Fast LLM (Fallback)', provider: 'mock', endpoint: 'mock', enabled: true, active: true },
    { id: 'ollama-default', name: 'Ollama Autodetect', provider: 'ollama', endpoint: 'http://localhost:11434', enabled: true, active: false },
    { id: 'lmstudio-default', name: 'LM Studio Autodetect', provider: 'lmstudio', endpoint: 'http://127.0.0.1:1234', enabled: true, active: false },
    { id: 'lmstudio-machine-1', name: 'LM Studio Machine 1', provider: 'lmstudio', endpoint: 'http://127.0.0.1:1234', enabled: false, active: false },
    { id: 'lmstudio-machine-2', name: 'LM Studio Machine 2', provider: 'lmstudio', endpoint: 'http://192.168.1.10:1234', enabled: false, active: false },
    { id: 'lmstudio-machine-3', name: 'LM Studio Machine 3', provider: 'lmstudio', endpoint: 'http://192.168.1.11:1234', enabled: false, active: false }
  ],
  documents: [],
  embedding: {
    provider: 'lmstudio',
    endpoint: 'http://127.0.0.1:1234',
    model: 'nomic-embed-text-v1.5'
  }
};

// Initialize database file
function initDb() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
  } else {
    // Read and merge any missing top-level keys to support upgrades
    try {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      let modified = false;
      for (const key of Object.keys(DEFAULT_DB)) {
        if (!data[key]) {
          data[key] = DEFAULT_DB[key];
          modified = true;
        }
      }
      if (modified) {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
      }
    } catch (err) {
      console.error("Error reading db file, resetting to default", err);
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
    }
  }
}

initDb();

export const db = {
  read() {
    try {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    } catch (e) {
      return DEFAULT_DB;
    }
  },

  write(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  },

  getChats() {
    const data = this.read();
    return data.chats.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  getChat(id) {
    const data = this.read();
    return data.chats.find(c => c.id === id);
  },

  createChat(title, modelId = 'mock-model', agentId = null) {
    const data = this.read();
    const newChat = {
      id: Math.random().toString(36).substring(2, 11),
      title: title || 'New Conversation',
      model_id: modelId,
      agent_id: agentId,
      created_at: new Date().toISOString()
    };
    data.chats.push(newChat);
    this.write(data);
    return newChat;
  },

  deleteChat(id) {
    const data = this.read();
    data.chats = data.chats.filter(c => c.id !== id);
    data.messages = data.messages.filter(m => m.chat_id !== id);
    this.write(data);
    return true;
  },

  getMessages(chatId) {
    const data = this.read();
    return data.messages.filter(m => m.chat_id === chatId).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  },

  addMessage(chatId, role, content, sources = null, reasoning = null) {
    const data = this.read();
    const newMessage = {
      id: Math.random().toString(36).substring(2, 11),
      chat_id: chatId,
      role,
      content,
      sources,
      reasoning,
      timestamp: new Date().toISOString()
    };
    data.messages.push(newMessage);
    this.write(data);
    return newMessage;
  },

  getModels() {
    const data = this.read();
    return data.models;
  },

  saveModel(model) {
    const data = this.read();
    const idx = data.models.findIndex(m => m.id === model.id);
    if (idx >= 0) {
      data.models[idx] = { ...data.models[idx], ...model };
    } else {
      data.models.push(model);
    }
    this.write(data);
    return model;
  },

  setActiveModel(id) {
    const data = this.read();
    data.models = data.models.map(m => ({
      ...m,
      active: m.id === id
    }));
    this.write(data);
    return data.models;
  },

  getDocuments() {
    const data = this.read();
    return data.documents;
  },

  addDocument(fileName, filePath, rawText, chunks) {
    const data = this.read();
    const newDoc = {
      id: Math.random().toString(36).substring(2, 11),
      name: fileName,
      path: filePath,
      text_length: rawText.length,
      chunks_count: chunks.length,
      chunks,
      created_at: new Date().toISOString()
    };
    data.documents.push(newDoc);
    this.write(data);
    return newDoc;
  },

  deleteDocument(id) {
    const data = this.read();
    data.documents = data.documents.filter(d => d.id !== id);
    this.write(data);
    return true;
  }
};
