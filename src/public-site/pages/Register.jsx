import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Phone, CreditCard, Mail, Lock, Eye, EyeOff, Calendar } from 'lucide-react';
import { publicService } from '../services/publicService';

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', id_card: '', email: '', password: '', birth_date: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await publicService.registerClient(form);
      localStorage.setItem('panda_public_client', JSON.stringify(result.client));
      navigate('/perfil');
    } catch (e) {
      console.error('Register error:', e);
      setError(e.message || 'Error al registrar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 16px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 className="section-title">
            Crear <span className="text-gold">Cuenta</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Regístrate para agendar citas y ganar premios</p>
        </div>

        {/* Google Button */}
        <button
          onClick={() => publicService.signInWithGoogle()}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--border-color)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'var(--text-primary)',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            transition: 'all 0.2s',
            marginBottom: 20,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuar con Google
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>o completa el formulario</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
        </div>

        <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '24px' }}>
          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Nombre completo', icon: User, key: 'name', placeholder: 'Juan Pérez', type: 'text', required: true },
              { label: 'Teléfono', icon: Phone, key: 'phone', placeholder: '+58 412-1234567', type: 'tel', required: true },
              { label: 'Cédula', icon: CreditCard, key: 'id_card', placeholder: 'V-12345678', type: 'text', required: true },
              { label: 'Fecha de Nacimiento', icon: Calendar, key: 'birth_date', placeholder: '', type: 'date', required: true },
              { label: 'Email (opcional)', icon: Mail, key: 'email', placeholder: 'correo@ejemplo.com', type: 'email' },
            ].map((field) => (
              <div key={field.key}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  {field.label}
                </label>
                <div style={{ position: 'relative' }}>
                  <field.icon size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type={field.type}
                    value={form[field.key]}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    className="input-field"
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                </div>
              </div>
            ))}

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Contraseña *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-field"
                  placeholder="••••••••"
                  style={{ paddingRight: 44 }}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <button type="submit" className="btn-gold" disabled={loading} style={{ width: '100%', marginTop: 20, padding: '14px', fontSize: 15, borderRadius: 'var(--radius-pill)', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: 20, fontSize: 14 }}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" style={{ color: 'var(--champagne)', fontWeight: 700, textDecoration: 'none' }}>
            Iniciar Sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
