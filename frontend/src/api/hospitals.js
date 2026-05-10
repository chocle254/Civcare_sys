import client from './client';
export const getNearbyHospitals = (lat, lon) => client.get(`/hospitals/nearby?lat=${lat}&lon=${lon}`);
