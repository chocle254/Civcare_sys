import { useEffect, useRef } from 'react';

export default function useWebSocket(hospitalId, onMessage) {
  const ws = useRef(null);

  useEffect(() => {
    if (!hospitalId) return;

    const url = `${process.env.REACT_APP_WS_URL || 'ws://localhost:8000'}/ws/queue/${hospitalId}`;
    ws.current = new WebSocket(url);

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch {
        // ignore malformed messages
      }
    };

    ws.current.onerror = () => {
      console.warn('WebSocket connection error. Live updates paused.');
    };

    ws.current.onclose = () => {
      // Attempt reconnect after 5 seconds
      setTimeout(() => {
        if (ws.current?.readyState === WebSocket.CLOSED) {
          ws.current = new WebSocket(url);
        }
      }, 5000);
    };

    return () => {
      ws.current?.close();
    };
  }, [hospitalId, onMessage]);
}
