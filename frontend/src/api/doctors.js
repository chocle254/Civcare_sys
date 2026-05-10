import client from './client';
export const getAvailableDoctors = (hospitalId) => client.get(`/doctors/available?hospital_id=${hospitalId}`);
export const updateDoctorStatus  = (data)        => client.patch('/doctors/status', data);
export const redirectPatients    = (data)        => client.post('/doctors/redirect-patients', data);
export const pingDoctor          = (doctorId)    => client.post(`/doctors/ping?doctor_id=${doctorId}`);
