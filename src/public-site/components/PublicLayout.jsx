import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Menu, X, Scissors, Phone, MapPin } from 'lucide-react';

export default function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const client = localStorage.getItem('panda_public_client');
    setIsLoggedIn(!!client);
  }, [location]);

  const navLinks = [
    { path: '/', label: 'Inicio' },
    { path: '/servicios', label: 'Servicios' },
  ];

  if (isLoggedIn) {
    navLinks.push({ path: '/agendar', label: 'Agendar Cita' });
  }

  const isActive = (path) => location.pathname === path;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar - Floating Hamburger Menu */}
      <nav 
        className="fixed top-0 w-full z-50 pointer-events-none"
      >
        {/* We use padding-top: 32px to align the hamburger icon properly with the content instead of sticking to the top */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          
          {/* Menu Button - Always visible */}
          <div className="pointer-events-none">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{ background: 'rgba(7, 7, 10, 0.8)', backdropFilter: 'blur(10px)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', padding: '10px', borderRadius: '10px' }}
              className="pointer-events-auto flex items-center justify-center shadow-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors"
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Menu Dropdown - Always visible when open */}
        {menuOpen && (
          <div 
            className="pointer-events-auto"
            style={{
              background: 'rgba(7, 7, 10, 0.98)',
              backdropFilter: 'blur(20px)',
              borderBottom: '1px solid var(--border-color)',
              padding: '24px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              position: 'absolute',
              top: '80px',
              right: '16px',
              width: '280px',
              borderRadius: '16px',
              border: '1px solid var(--border-color)'
            }}>
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMenuOpen(false)}
                style={{
                  padding: '12px 16px',
                  fontSize: 16,
                  fontWeight: 600,
                  textDecoration: 'none',
                  borderRadius: '8px',
                  background: isActive(link.path) ? 'rgba(203, 183, 154, 0.1)' : 'transparent',
                  color: isActive(link.path) ? 'var(--champagne)' : 'var(--text-secondary)',
                  transition: 'all 0.2s'
                }}
              >
                {link.label}
              </Link>
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {isLoggedIn ? (
                <>
                  <Link to="/perfil" onClick={() => setMenuOpen(false)} className="btn-outline" style={{ padding: '12px 0', fontSize: 14, textAlign: 'center', borderRadius: 'var(--radius-pill)' }}>
                    Mi Perfil
                  </Link>
                  <Link to="/agendar" onClick={() => setMenuOpen(false)} className="btn-gold" style={{ padding: '12px 0', fontSize: 14, textAlign: 'center', borderRadius: 'var(--radius-pill)' }}>
                    Reservar
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-outline" style={{ padding: '12px 0', fontSize: 14, textAlign: 'center', borderRadius: 'var(--radius-pill)' }}>
                    Iniciar Sesión
                  </Link>
                  <Link to="/registro" onClick={() => setMenuOpen(false)} className="btn-gold" style={{ padding: '12px 0', fontSize: 14, textAlign: 'center', borderRadius: 'var(--radius-pill)' }}>
                    Registrarse
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-color)',
        padding: '48px 16px',
        background: 'rgba(7, 7, 10, 0.8)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 40 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 30, height: 30, background: 'var(--gold-gradient)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Scissors size={14} color="#000" />
                </div>
                <span className="text-gold" style={{ fontSize: 16 }}>Panda Barber Studio</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                Tu estilo, nuestra pasión. Barbería y tatuajes en Maracaibo.
              </p>
            </div>
            <div>
              <h3 style={{ color: 'var(--champagne)', fontWeight: 700, marginBottom: 12, fontSize: 15 }}>Horarios</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 4 }}>Lunes a Sábado: 9AM - 8PM</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Domingo: Cerrado</p>
            </div>
            <div>
              <h3 style={{ color: 'var(--champagne)', fontWeight: 700, marginBottom: 12, fontSize: 15 }}>Contacto</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 4 }}>📍 CC Ciudad Jardín, Local 74</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 12 }}>📞 +58 412-1234567</p>
              <a
                href="https://wa.me/584121234567"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  background: '#25D366',
                  color: '#fff',
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: 'none',
                  transition: 'filter 0.2s',
                }}
              >
                WhatsApp
              </a>
            </div>
          </div>
          <div style={{
            borderTop: '1px solid var(--border-color)',
            marginTop: 32,
            paddingTop: 24,
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 12,
          }}>
            © 2025 Panda Barber Studio. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
