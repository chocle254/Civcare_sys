import { useState } from 'react';

export default function useLocation() {
  const [coords,  setCoords]  = useState(null);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const getLocation = () => {
    setLoading(true);
    setError('');

    if (!navigator.geolocation) {
      setError('Location is not supported on this device.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
        setLoading(false);
      },
      () => {
        setError('Could not get your location. Please allow location access.');
        setLoading(false);
      }
    );
  };

  return { coords, error, loading, getLocation };
}
