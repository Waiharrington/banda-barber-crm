import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, Phone, CreditCard, Mail, Lock, Eye, EyeOff, Calendar, Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { publicService } from '../services/publicService';
import PandaDatePicker from '../../components/PandaDatePicker';

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', id_card: '', email: '', password: '', birth_date: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleGoogleLogin = async () => {
    setError('');
    try {
      localStorage.setItem('panda_google_login_pending', 'true');
      if (location.state?.startBooking) {
        localStorage.setItem('panda_login_return_to_booking', 'true');
        localStorage.removeItem('bookingState');
      }
      await publicService.signInWithGoogle();
    } catch (e) {
      localStorage.removeItem('panda_google_login_pending');
      console.error('Google register error:', e);
      setError('Error al registrarse con Google');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await publicService.registerClient(form);
      localStorage.setItem('panda_public_client', JSON.stringify(result.client));
      
      const shouldStartBooking = location.state?.startBooking
        || localStorage.getItem('panda_login_return_to_booking') === 'true';

      if (shouldStartBooking) {
        localStorage.removeItem('panda_login_return_to_booking');
        localStorage.removeItem('bookingState');
        navigate('/agendar', { replace: true, state: { startBooking: true } });
      } else {
        navigate('/perfil');
      }
    } catch (e) {
      console.error('Register error:', e);
      setError(e.message || 'Error al registrar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { label: 'Nombre completo', icon: User, key: 'name', placeholder: 'Juan Pérez', type: 'text', required: true },
    { label: 'Teléfono', icon: Phone, key: 'phone', placeholder: '+58 412-1234567', type: 'tel', required: true },
    { label: 'Cédula', icon: CreditCard, key: 'id_card', placeholder: 'V-12345678', type: 'text', required: true },
    { label: 'Fecha de Nacimiento', icon: Calendar, key: 'birth_date', placeholder: '', type: 'date', required: true },
    { label: 'Email (opcional)', icon: Mail, key: 'email', placeholder: 'correo@ejemplo.com', type: 'email' },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#050506' }}>
      
      {/* Left Panel - Image (hidden on mobile) */}
      <div 
        style={{
          display: 'none',
          position: 'relative',
          overflow: 'hidden',
        }}
        className="register-image-panel"
      >
        <img 
          src="/register-bg.jpg" 
          alt="Barbería Premium"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />
        {/* Overlay gradient */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to right, transparent 60%, #050506 100%), linear-gradient(to top, #050506 0%, transparent 40%)',
        }} />

        {/* Floating text on image */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'absolute',
            bottom: 60,
            left: 40,
            right: 40,
          }}
        >
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8, 
            marginBottom: 16,
            color: '#CBB79A',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}>
            <Sparkles size={14} />
            EXPERIENCIA PREMIUM
          </div>
          <h2 style={{
            fontSize: 36,
            fontWeight: 900,
            color: '#fff',
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            margin: 0,
          }}>
            Tu estilo,<br />
            <span style={{ color: '#CBB79A' }}>nuestra pasión.</span>
          </h2>
          <p style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 14,
            lineHeight: 1.6,
            marginTop: 12,
            maxWidth: 300,
          }}>
            Únete a la comunidad Panda y disfruta de una experiencia de barbería única.
          </p>
        </motion.div>
      </div>

      {/* Right Panel - Form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 24px 40px',
        overflowY: 'auto',
      }}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ width: '100%', maxWidth: 440 }}
        >
          {/* Header */}
          <div style={{ marginBottom: 36 }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 100,
                background: 'rgba(203, 183, 154, 0.08)',
                border: '1px solid rgba(203, 183, 154, 0.15)',
                marginBottom: 20,
              }}
            >
              <Sparkles size={12} style={{ color: '#CBB79A' }} />
              <span style={{ color: '#CBB79A', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Cuenta nueva
              </span>
            </motion.div>

            <h1 style={{
              fontSize: 38,
              fontWeight: 900,
              color: '#fff',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              margin: 0,
            }}>
              Crear<br />
              <span style={{ 
                background: 'linear-gradient(135deg, #E2D1B9, #CBB79A, #A8967D)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>Cuenta</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 10, lineHeight: 1.5 }}>
              Regístrate para agendar citas y ganar premios exclusivos.
            </p>
          </div>

          {/* Google Button */}
          <motion.button
            whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.08)' }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogleLogin}
            style={{
              width: '100%',
              padding: '15px',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255, 255, 255, 0.03)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              transition: 'all 0.3s ease',
              marginBottom: 28,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </motion.button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent)' }} />
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: 500, letterSpacing: '0.05em' }}>o completa el formulario</span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent)' }} />
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ 
                  background: 'rgba(239, 68, 68, 0.08)', 
                  border: '1px solid rgba(239, 68, 68, 0.2)', 
                  borderRadius: 14, 
                  padding: '14px 18px', 
                  marginBottom: 20, 
                  color: '#ef4444', 
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {error}
              </motion.div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {fields.map((field, index) => (
                <motion.div 
                  key={field.key}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 + 0.3 }}
                >
                  <label style={{ 
                    display: 'block', 
                    fontSize: 12, 
                    fontWeight: 700, 
                    color: focusedField === field.key ? '#CBB79A' : 'rgba(255,255,255,0.4)', 
                    marginBottom: 8,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    transition: 'color 0.3s ease',
                  }}>
                    {field.label}
                  </label>
                  <div style={{ position: 'relative' }}>
                    {field.type === 'date' ? (
                      <div style={{ position: 'relative' }}>
                        <PandaDatePicker
                          value={form[field.key]}
                          onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                          placeholder={field.placeholder}
                          onFocus={() => setFocusedField(field.key)}
                          onBlur={() => setFocusedField(null)}
                          style={{ 
                            paddingLeft: '44px', 
                            width: '100%', 
                            boxSizing: 'border-box',
                            background: 'rgba(255,255,255,0.03)',
                            border: focusedField === field.key ? '1px solid rgba(203,183,154,0.4)' : '1px solid rgba(255,255,255,0.06)',
                            borderRadius: 14,
                            padding: '14px 16px 14px 44px',
                            color: '#fff',
                            fontSize: 14,
                            outline: 'none',
                            transition: 'all 0.3s ease',
                          }}
                        />
                        <field.icon size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focusedField === field.key ? '#CBB79A' : 'rgba(255,255,255,0.2)', transition: 'color 0.3s ease', zIndex: 10, pointerEvents: 'none' }} />
                      </div>
                    ) : (
                      <>
                        <field.icon size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focusedField === field.key ? '#CBB79A' : 'rgba(255,255,255,0.2)', transition: 'color 0.3s ease', zIndex: 2 }} />
                        <input
                          type={field.type}
                          value={form[field.key]}
                          onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                          placeholder={field.placeholder}
                          required={field.required}
                          onFocus={() => setFocusedField(field.key)}
                          onBlur={() => setFocusedField(null)}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            background: 'rgba(255,255,255,0.03)',
                            border: focusedField === field.key ? '1px solid rgba(203,183,154,0.4)' : '1px solid rgba(255,255,255,0.06)',
                            borderRadius: 14,
                            padding: '14px 16px 14px 44px',
                            color: '#fff',
                            fontSize: 14,
                            outline: 'none',
                            transition: 'all 0.3s ease',
                          }}
                        />
                      </>
                    )}
                    {/* Subtle glow on focus */}
                    {focusedField === field.key && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{
                          position: 'absolute',
                          inset: -1,
                          borderRadius: 15,
                          background: 'transparent',
                          boxShadow: '0 0 20px rgba(203,183,154,0.08)',
                          pointerEvents: 'none',
                        }}
                      />
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Password Field */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: fields.length * 0.06 + 0.3 }}
              >
                <label style={{ 
                  display: 'block', 
                  fontSize: 12, 
                  fontWeight: 700, 
                  color: focusedField === 'password' ? '#CBB79A' : 'rgba(255,255,255,0.4)', 
                  marginBottom: 8,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  transition: 'color 0.3s ease',
                }}>
                  Contraseña *
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focusedField === 'password' ? '#CBB79A' : 'rgba(255,255,255,0.2)', transition: 'color 0.3s ease', zIndex: 2 }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      background: 'rgba(255,255,255,0.03)',
                      border: focusedField === 'password' ? '1px solid rgba(203,183,154,0.4)' : '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 14,
                      padding: '14px 44px 14px 44px',
                      color: '#fff',
                      fontSize: 14,
                      outline: 'none',
                      transition: 'all 0.3s ease',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: showPassword ? '#CBB79A' : 'rgba(255,255,255,0.3)', cursor: 'pointer', transition: 'color 0.3s', zIndex: 2 }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  {focusedField === 'password' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{
                        position: 'absolute',
                        inset: -1,
                        borderRadius: 15,
                        background: 'transparent',
                        boxShadow: '0 0 20px rgba(203,183,154,0.08)',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                </div>
              </motion.div>
            </div>

            {/* Submit Button */}
            <motion.button 
              type="submit" 
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              style={{ 
                width: '100%', 
                marginTop: 28, 
                padding: '16px', 
                fontSize: 13, 
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                borderRadius: 16,
                border: 'none',
                background: 'linear-gradient(135deg, #E2D1B9, #CBB79A, #A8967D)',
                color: '#1a1410',
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 0 30px rgba(203,183,154,0.15)',
                transition: 'all 0.3s ease',
              }}
            >
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
              {!loading && <ArrowRight size={16} strokeWidth={2.5} />}
            </motion.button>
          </form>

          {/* Footer link */}
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', marginTop: 28, fontSize: 14 }}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" style={{ color: '#CBB79A', fontWeight: 700, textDecoration: 'none', transition: 'opacity 0.2s' }}>
              Iniciar Sesión
            </Link>
          </p>
        </motion.div>
      </div>

      {/* CSS for responsive image panel */}
      <style>{`
        @media (min-width: 900px) {
          .register-image-panel {
            display: block !important;
            width: 45%;
            min-height: 100vh;
            position: sticky;
            top: 0;
          }
        }
        
        /* Custom placeholder styling */
        input::placeholder {
          color: rgba(255,255,255,0.2) !important;
        }
      `}</style>
    </div>
  );
}
