import client from './client';

// Patient
export const registerPatient = (data) => client.post('/auth/patient/register', data);
export const loginPatient    = (data) => client.post('/auth/patient/login', data);

// Doctor
export const registerDoctor  = (data) => client.post('/auth/doctor/register', data);
export const loginDoctor     = (data) => client.post('/auth/doctor/login', data);
