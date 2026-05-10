import client from './client';
export const triggerMpesa  = (data) => client.post('/payment/mpesa', data);
export const triggerAirtel = (data) => client.post('/payment/airtel', data);
