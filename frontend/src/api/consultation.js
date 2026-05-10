import client from './client';
export const initiateConsultation  = (data) => client.post('/consultation/initiate', data);
export const completeConsultation  = (data) => client.post('/consultation/complete', data);
export const rateConsultation      = (data) => client.post('/consultation/rate', data);
