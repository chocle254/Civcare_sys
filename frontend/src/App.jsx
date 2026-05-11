import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Register       from './pages/patient/Register';
import Chat           from './pages/patient/Chat';
import HospitalSelect from './pages/patient/HospitalSelect';
import ArrivalConfirm from './pages/patient/ArrivalConfirm';
import Medications    from './pages/patient/Medications';
import Consultation   from './pages/patient/Consultation';
import Payment        from './pages/patient/Payment';
import RateExperience from './pages/patient/RateExperience';
import DoctorLogin    from './pages/doctor/Login';
import Dashboard      from './pages/doctor/Dashboard';
import PatientProfile from './pages/doctor/PatientProfile';
import Verdict        from './pages/doctor/Verdict';
import RateAI         from './pages/doctor/RateAI';
import ActiveConsult  from './pages/doctor/ActiveConsult';
import './index.css';
import SessionDashboard from './pages/patient/SessionDashboard';



export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Patient */}
        <Route path="/"                    element={<Register />} />
        <Route path="/chat"                element={<Chat />} />
        <Route path="/hospitals"           element={<HospitalSelect />} />
        <Route path="/arrival"             element={<ArrivalConfirm />} />
        <Route path="/medications"         element={<Medications />} />
        <Route path="/consultation"        element={<Consultation />} />
        <Route path="/payment"             element={<Payment />} />
        <Route path="/rate"                element={<RateExperience />} />
        <Route path="/dashboard"           element={<SessionDashboard />} />
        {/* Doctor */}
        <Route path="/doctor"              element={<DoctorLogin />} />
        <Route path="/doctor/dashboard"    element={<Dashboard />} />
        <Route path="/doctor/patient/:id"  element={<PatientProfile />} />
        <Route path="/doctor/verdict/:id"  element={<Verdict />} />
        <Route path="/doctor/rate/:id"     element={<RateAI />} />
        <Route path="/doctor/consult/:id"  element={<ActiveConsult />} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
