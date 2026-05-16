import { useEffect, useRef } from 'react';
export default function useWebSocket(hospitalId, onMessage) {
  const ws = useRef(null);
  const onMsgRef = useRef(onMessage);

  // Keep ref updated without triggering reconnect
  useEffect(() => {
    onMsgRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!hospitalId) return;

    const url = `${process.env.REACT_APP_WS_URL || 'ws://localhost:8000'}/ws/queue/${hospitalId}`;
    let reconnectTimer = null;
    let active = true;

    const connect = () => {
      if (!active) return;
      ws.current = new WebSocket(url);

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMsgRef.current(data);
        } catch { }
      };

      ws.current.onerror = () => {
        console.warn('WebSocket connection error. Live updates paused.');
      };

      ws.current.onclose = () => {
        if (active) {
          reconnectTimer = setTimeout(connect, 5000);
        }
      };
    };

    connect();

    return () => {
      active = false;
      clearTimeout(reconnectTimer);
      ws.current?.close();
    };
  }, [hospitalId]);
}