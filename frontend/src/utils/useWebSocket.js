import { useState, useEffect, useRef } from 'react';

const WS_URL = `ws://${window.location.hostname}:5000/ws`;

/**
 * Custom hook that connects to the backend WebSocket
 * and provides real-time model health status updates.
 */
export function useWebSocket() {
  const [modelStatuses, setModelStatuses] = useState([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  useEffect(() => {
    let active = true;

    function connect() {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          if (active) setConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'model-status' && active) {
              setModelStatuses(data.models);
              setLastUpdate(data.timestamp);
            }
          } catch {
            // Ignore parse errors
          }
        };

        ws.onclose = () => {
          if (active) {
            setConnected(false);
            reconnectTimerRef.current = setTimeout(connect, 5000);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        if (active) {
          reconnectTimerRef.current = setTimeout(connect, 5000);
        }
      }
    }

    connect();

    return () => {
      active = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return { modelStatuses, connected, lastUpdate };
}
