import client from './client';

export const checkMedication = (data) => client.post('/medscan/check', data);
