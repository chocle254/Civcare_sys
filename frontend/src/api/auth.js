import client from './client';

export const registerPatient  = (data)  => client.post('/auth/patient/register', data);
export const verifyPatientOTP = (data)  => client.post('/auth/patient/verify', data);
export const doctorLogin      = (data)  => client.post('/auth/doctor/login', data);
