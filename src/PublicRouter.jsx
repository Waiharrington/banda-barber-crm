import { HashRouter, Routes, Route } from 'react-router-dom';
import PublicLayout from './public-site/components/PublicLayout';
import Home from './public-site/pages/Home';
import Services from './public-site/pages/Services';
import BookAppointment from './public-site/pages/BookAppointment';
import Register from './public-site/pages/Register';
import Login from './public-site/pages/Login';
import Profile from './public-site/pages/Profile';
import ForgotPassword from './public-site/pages/ForgotPassword';
import ResetPassword from './public-site/pages/ResetPassword';
import CompleteRegistration from './public-site/pages/CompleteRegistration';
import { AuthProvider } from './context/AuthContext';
import { DialogProvider } from './context/DialogContext';
import { NotificationProvider } from './context/NotificationContext';
import { ModalProvider } from './context/ModalContext';

export default function PublicRouter() {
  return (
    <HashRouter>
      <AuthProvider>
        <DialogProvider>
          <NotificationProvider>
            <ModalProvider>
              <Routes>
                <Route path="/admin.html" element={<Home />} />  {/* legacy redirect */}
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/servicios" element={<Services />} />
                  <Route path="/agendar" element={<BookAppointment />} />
                  <Route path="/registro" element={<Register />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/olvidar-contraseña" element={<ForgotPassword />} />
                  <Route path="/restablecer-contraseña" element={<ResetPassword />} />
                  <Route path="/completar-registro" element={<CompleteRegistration />} />
                  <Route path="/perfil" element={<Profile />} />
                  <Route path="*" element={<Home />} />
                </Route>
              </Routes>
            </ModalProvider>
          </NotificationProvider>
        </DialogProvider>
      </AuthProvider>
    </HashRouter>
  );
}
