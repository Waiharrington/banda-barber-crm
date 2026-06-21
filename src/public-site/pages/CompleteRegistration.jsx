import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, CreditCard, Check, Loader } from 'lucide-react';
import { publicService } from '../services/publicService';

export default function CompleteRegistration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [googleUser, setGoogleUser] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    id_card: '',
  });

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await publicService.getSession();
        if (!session?.user) {
          navigate('/login');
          return;
        }

        const user = session.user;
        setGoogleUser(user);

        // Pre-fill form with Google data
        const metadata = user.user_metadata || {};
        setForm({
          name: metadata.full_name || metadata.name || '',
          email: user.email || '',
          phone: '',
          id_card: '',
        });

        // Check if client already completed registration
        const existingClient = await publicService.getClientByUserId(user.id);
        if (existingClient) {
          // Already registered, save and redirect
          localStorage.setItem('panda_public_client', JSON.stringify(existingClient));
          navigate('/perfil');
          return;
        }
      } catch (e) {
        console.error('Session check error:', e);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.phone.trim()) {
      setError('El teléfono es obligatorio');
      return;
    }
    if (!form.id_card.trim()) {
      setError('La cédula es obligatoria');
      return;
    }

    setSubmitting(true);
    try {
      const client = await publicService.completeGoogleRegistration({
        user_id: googleUser.id,
        name: form.name,
        email: form.email,
        phone: form.phone,
        id_card: form.id_card,
      });
      localStorage.setItem('panda_public_client', JSON.stringify(client));
      navigate('/perfil');
    } catch (e) {
      console.error('Registration error:', e);
      setError(e.message || 'Error al completar el registro');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader size={40} style={{ color: 'var(--champagne)', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)' }}>Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 16px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'var(--gold-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Check size={28} color="#000" />
          </div>
          <h1 className="section-title" style={{ fontSize: '1.8rem' }}>
            Completa tu <span className="text-gold">Registro</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5 }}>
            Confirma tus datos de Google y agrega la información faltante
          </p>
        </div>

        {/* Google info badge */}
        <div style={{
          background: 'rgba(66, 133, 244, 0.1)',
          border: '1px solid rgba(66, 133, 244, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span style={{ color: '#8ab4f8', fontSize: 13 }}>Conectado con {googleUser?.email}</span>
        </div>

        <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '24px' }}>
          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Nombre completo (de Google)
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                  placeholder="Tu nombre"
                />
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Verifica que sea correcto</p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Email (de Google)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  value={form.email}
                  disabled
                  className="input-field"
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Teléfono *
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input-field"
                  placeholder="+58 412-1234567"
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Cédula *
              </label>
              <div style={{ position: 'relative' }}>
                <CreditCard size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={form.id_card}
                  onChange={(e) => setForm({ ...form, id_card: e.target.value })}
                  className="input-field"
                  placeholder="V-12345678"
                  required
                />
              </div>
            </div>
          </div>

          <button type="submit" className="btn-gold" disabled={submitting} style={{ width: '100%', marginTop: 20, padding: '14px', fontSize: 15, borderRadius: 'var(--radius-pill)', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Guardando...' : 'Completar Registro'}
          </button>
        </form>
      </div>
    </div>
  );
}
