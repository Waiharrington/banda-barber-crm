import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Check, ArrowLeft } from 'lucide-react';
import { publicService } from '../services/publicService';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await publicService.resetPassword(email);
      setSent(true);
    } catch (e) {
      console.error('Reset error:', e);
      setError(e.message || 'Error al enviar el correo. Verifica tu email.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 16px' }}>
        <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(34, 197, 94, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <Check size={32} style={{ color: '#22c55e' }} />
          </div>
          <h1 className="section-title" style={{ fontSize: '1.8rem' }}>
            Correo <span className="text-gold">Enviado</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 12, marginBottom: 24, lineHeight: 1.6 }}>
            Revisa tu bandeja de entrada en <strong style={{ color: 'var(--champagne)' }}>{email}</strong> y sigue las instrucciones para restablecer tu contraseña.
          </p>
          <Link to="/login" className="btn-outline" style={{ padding: '12px 24px', borderRadius: 'var(--radius-pill)', textDecoration: 'none' }}>
            <ArrowLeft size={16} style={{ marginRight: 6 }} /> Volver al Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 16px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 className="section-title" style={{ fontSize: '1.8rem' }}>
            ¿Olvidaste tu <span className="text-gold">Contraseña</span>?
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 8 }}>
            Ingresa tu email y te enviaremos las instrucciones
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '24px' }}>
          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="correo@ejemplo.com"
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-gold" disabled={loading} style={{ width: '100%', marginTop: 20, padding: '14px', fontSize: 15, borderRadius: 'var(--radius-pill)', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Enviando...' : 'Enviar Instrucciones'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14 }}>
          <Link to="/login" style={{ color: 'var(--champagne)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ArrowLeft size={14} /> Volver al Login
          </Link>
        </p>
      </div>
    </div>
  );
}
