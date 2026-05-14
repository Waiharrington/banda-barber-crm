import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Loader2, Rocket, Eye, EyeOff } from 'lucide-react';
import logo from '../assets/logo.png';
import ParticleBackground from './ParticleBackground';

const Login = () => {
  const { login, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(username, password);
    if (!result.success) {
      setError(result.message);
    }
  };

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: '#000',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <ParticleBackground />
      
      <div className="glass-card animate-scale-in" style={{ 
        width: '100%', 
        maxWidth: '400px', 
        padding: '48px', 
        borderRadius: '32px',
        border: '1.5px solid rgba(212,175,55,0.3)',
        background: 'rgba(28,28,30,0.8)',
        backdropFilter: 'blur(20px)',
        textAlign: 'center',
        zIndex: 10
      }}>
        <img src={logo} alt="Astro" style={{ width: '120px', marginBottom: '32px' }} />
        
        <h2 style={{ fontSize: '24px', fontWeight: '900', color: 'white', marginBottom: '8px' }}>
          BIENVENIDO A <span className="text-gold">ASTRO</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '40px' }}>
          Ingresa tus credenciales para continuar
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ position: 'relative' }}>
            <User size={18} color="var(--gold-primary)" style={{ position: 'absolute', left: '16px', top: '14px' }} />
            <input 
              type="text"
              placeholder="Nombre de usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '14px 48px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                color: 'white',
                fontSize: '15px'
              }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={18} color="var(--gold-primary)" style={{ position: 'absolute', left: '16px', top: '14px' }} />
            <input 
              type={showPassword ? "text" : "password"}
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '14px 48px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                color: 'white',
                fontSize: '15px'
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '16px',
                top: '14px',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <div className="animate-fade-in" style={{ color: '#ff453a', fontSize: '13px', fontWeight: '600' }}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="btn-gold"
            style={{ 
              marginTop: '12px',
              height: '56px',
              borderRadius: '18px',
              fontSize: '16px',
              fontWeight: '900',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            {loading ? <Loader2 className="animate-spin" /> : (
                <Rocket size={18} /> INICIAR SESIÓN
            )}
          </button>
        </form>

      </div>
    </div>
  );
};

export default Login;
