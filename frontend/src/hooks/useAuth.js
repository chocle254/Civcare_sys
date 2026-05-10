import { useState, useEffect } from 'react';

export default function useAuth(role = 'patient') {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('civtech_token');
    const storedUser  = role === 'doctor'
      ? localStorage.getItem('civtech_doctor')
      : localStorage.getItem('civtech_patient');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, [role]);

  const logout = () => {
    localStorage.removeItem('civtech_token');
    localStorage.removeItem('civtech_patient');
    localStorage.removeItem('civtech_doctor');
    setUser(null);
    setToken(null);
  };

  return { user, token, loading, logout };
}
