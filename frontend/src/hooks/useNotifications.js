import { useEffect } from 'react';

export default function useNotifications() {

  const requestPermission = async () => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const showNotification = (title, body, onClick) => {
    if (Notification.permission !== 'granted') return;
    const n = new Notification(title, {
      body,
      icon: '/logo192.png',
    });
    if (onClick) n.onclick = onClick;
  };

  useEffect(() => {
    requestPermission();
  }, []);

  return { showNotification };
}
