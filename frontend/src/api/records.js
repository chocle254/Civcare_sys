import client from './client';

export const requestRecordAccess = (data)       => client.post('/records/request-access', data);
export const viewPatientRecord   = (data)       => client.post('/records/view', data);
