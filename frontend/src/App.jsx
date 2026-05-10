import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Register      from './pages/patient/Register';
import OTPVerify     from './pages/patient/OTPVerify';
import Chat          from './pages/patient/Chat';
import ArrivalConfirm from './pages/patient/ArrivalConfirm';
import Medications   from './pages/patient/Medications';
import Consultation  from './pages/patient/Consultation';
import Payment       from './pages/patient/Payment';
import RateExperience from './pages/patient/RateExperience';
import DoctorLogin   from './pages/doctor/Login';
import Dashboard     from './pages/doctor/Dashboard';
import PatientProfile from './pages/doctor/PatientProfile';
import Verdict       from './pages/doctor/Verdict';
import ActiveConsult from './pages/doctor/ActiveConsult';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Patient */}
        <Route path="/"                   element={<Register />} />
        <Route path="/verify"             element={<OTPVerify />} />
        <Route path="/chat"               element={<Chat />} />
        <Route path="/arrival"            element={<ArrivalConfirm />} />
        <Route path="/medications"        element={<Medications />} />
        <Route path="/consultation"       element={<Consultation />} />
        <Route path="/payment"            element={<Payment />} />
        <Route path="/rate"               element={<RateExperience />} />

        {/* Doctor */}
        <Route path="/doctor"             element={<DoctorLogin />} />
        <Route path="/doctor/dashboard"   element={<Dashboard />} />
        <Route path="/doctor/patient/:id" element={<PatientProfile />} />
        <Route path="/doctor/verdict/:id" element={<Verdict />} />
        <Route path="/doctor/consult/:id" element={<ActiveConsult />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
