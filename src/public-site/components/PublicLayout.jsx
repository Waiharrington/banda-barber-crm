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
      {/* Top Bar */}
      <div style={{
        background: 'var(--gold-gradient)',
        color: '#000',
        fontSize: '13px',
        fontWeight: 600,
        padding: '8px 16px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Phone size={13} /> +58 412-1234567
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={13} /> CC Ciudad Jardín, Local 74
            </span>
          </div>
          <span style={{ fontWeight: 700 }}>Lun-Sáb: 9AM - 8PM</span>
        </div>
      </div>

      {/* Navbar */}
      <nav style={{
        background: 'rgba(7, 7, 10, 0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-color)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{
              width: 38,
              height: 38,
              background: 'var(--gold-gradient)',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Scissors size={18} color="#000" />
            </div>
            <div>
              <div className="text-gold" style={{ fontSize: 18, lineHeight: 1 }}>Panda Barber</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, fontWeight: 700 }}>STUDIO</div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: 'none',
                  color: isActive(link.path) ? 'var(--champagne)' : 'var(--text-secondary)',
                  transition: 'color 0.2s',
                }}
              >
                {link.label}
              </Link>
            ))}
            {isLoggedIn ? (
              <>
                <Link to="/perfil" className="btn-outline" style={{ padding: '8px 18px', fontSize: 13, borderRadius: 'var(--radius-pill)' }}>
                  Mi Perfil
                </Link>
                <Link to="/agendar" className="btn-gold" style={{ padding: '8px 20px', fontSize: 13, borderRadius: 'var(--radius-pill)' }}>
                  Reservar Ahora
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-outline" style={{ padding: '8px 18px', fontSize: 13, borderRadius: 'var(--radius-pill)' }}>
                  Iniciar Sesión
                </Link>
                <Link to="/registro" className="btn-gold" style={{ padding: '8px 20px', fontSize: 13, borderRadius: 'var(--radius-pill)' }}>
                  Registrarse
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ display: 'none', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
            className="mobile-menu-btn"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div style={{
            padding: '16px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMenuOpen(false)}
                style={{
                  padding: '12px 0',
                  fontSize: 15,
                  fontWeight: 600,
                  textDecoration: 'none',
                  color: isActive(link.path) ? 'var(--champagne)' : 'var(--text-secondary)',
                }}
              >
                {link.label}
              </Link>
            ))}
            <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
              {isLoggedIn ? (
                <>
                  <Link to="/perfil" onClick={() => setMenuOpen(false)} className="btn-outline" style={{ flex: 1, padding: '10px 0', fontSize: 13, textAlign: 'center' }}>
                    Mi Perfil
                  </Link>
                  <Link to="/agendar" onClick={() => setMenuOpen(false)} className="btn-gold" style={{ flex: 1, padding: '10px 0', fontSize: 13, textAlign: 'center' }}>
                    Reservar
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-outline" style={{ flex: 1, padding: '10px 0', fontSize: 13, textAlign: 'center' }}>
                    Iniciar Sesión
                  </Link>
                  <Link to="/registro" onClick={() => setMenuOpen(false)} className="btn-gold" style={{ flex: 1, padding: '10px 0', fontSize: 13, textAlign: 'center' }}>
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
