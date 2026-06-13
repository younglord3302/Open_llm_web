import { WebSocketServer } from 'ws';
import { getAvailableModels, checkEndpointHealth } from './llmService.js';
import { db } from './db.js';

let wss = null;

// ─── Start WebSocket server ───────────────────────────────────────────────────
export function startWebSocketServer(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('[WS] Client connected');

    // Send current model status immediately on connect
    broadcastModelStatus();

    ws.on('close', () => {
      console.log('[WS] Client disconnected');
    });

    ws.on('error', (err) => {
      console.error('[WS] Client error:', err.message);
    });
  });

  // Start periodic health check polling (every 30 seconds)
  setInterval(broadcastModelStatus, 30000);

  console.log('[WS] WebSocket server started on /ws');
}

// ─── Broadcast model health status to all connected clients ───────────────────
export async function broadcastModelStatus() {
  if (!wss || wss.clients.size === 0) return;

  const models = db.getModels().filter(m => m.enabled && m.provider !== 'mock');

  const statusPromises = models.map(async (model) => {
    try {
      const healthy = await checkEndpointHealth(model.provider, model.endpoint);
      return { id: model.id, name: model.name, provider: model.provider, endpoint: model.endpoint, healthy };
    } catch {
      return { id: model.id, name: model.name, provider: model.provider, endpoint: model.endpoint, healthy: false };
    }
  });

  const statuses = await Promise.all(statusPromises);

  const message = JSON.stringify({
    type: 'model-status',
    timestamp: new Date().toISOString(),
    models: statuses
  });

  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  });
}

// ─── Send a custom event to all clients ───────────────────────────────────────
export function broadcastEvent(event) {
  if (!wss) return;
  const message = JSON.stringify(event);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}