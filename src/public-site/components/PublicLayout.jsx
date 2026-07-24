import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Menu, X, Scissors, Phone, MapPin, Calendar, User } from 'lucide-react';
import { publicService } from '../services/publicService';
import logo from '../../assets/logo_full.png';

export default function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    // Run once initially to check scroll position
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const client = localStorage.getItem('panda_public_client');
    setIsLoggedIn(!!client);
  }, [location]);

  useEffect(() => {
    const { data: authListener } = publicService.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const client = await publicService.getClientByUserId(session.user.id);
          if (!client) {
            navigate('/completar-registro');
          } else {
            localStorage.setItem('panda_public_client', JSON.stringify(client));
            setIsLoggedIn(true);
          }
        } catch (e) {
          console.error('Error fetching client after login:', e);
        }
      }
    });
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [navigate]);

  const navLinks = [
    { path: '/', label: 'Inicio' },
    { path: '/servicios', label: 'Servicios' },
  ];

  if (isLoggedIn) {
    navLinks.push({ path: '/agendar', label: 'Agendar Cita' });
  }

  const isActive = (path) => location.pathname === path;

  // Helper to scroll to section
  const handleScrollTo = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Desktop Header */}
      <header 
        className={`hidden lg:flex fixed top-0 w-full z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isScrolled 
            ? 'bg-[rgba(7,7,10,0.85)] backdrop-blur-xl border-b border-[rgba(203,183,154,0.12)] py-3 shadow-[0_4px_30px_rgba(0,0,0,0.6)]' 
            : 'bg-transparent border-b border-transparent py-6'
        }`}
      >
        <div className="w-full max-w-[1200px] mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center no-underline">
            <img src={logo} alt="Panda Barber Studio" className="h-[48px] object-contain" style={{ filter: 'brightness(1.15)' }} />
          </a>
          
           {/* Navigation Links */}
          <div className="flex items-center gap-8 nav-links-desktop">
            <a href="/" className="text-white hover:text-[var(--champagne)] transition-colors text-xs uppercase font-extrabold tracking-widest no-underline">Inicio</a>
            <a href="#servicios" className="text-white hover:text-[var(--champagne)] transition-colors text-xs uppercase font-extrabold tracking-widest no-underline">Servicios</a>
            <a href="#equipo" className="text-white hover:text-[var(--champagne)] transition-colors text-xs uppercase font-extrabold tracking-widest no-underline">Equipo</a>
            <a href="#experiencia" className="text-white hover:text-[var(--champagne)] transition-colors text-xs uppercase font-extrabold tracking-widest no-underline">Experiencia</a>
            <a href="#ubicacion" className="text-white hover:text-[var(--champagne)] transition-colors text-xs uppercase font-extrabold tracking-widest no-underline">Ubicación</a>
          </div>
 
          {/* Action Buttons */}
          <div className="flex items-center gap-4 header-actions-desktop">
            {isLoggedIn ? (
              <>
                <Link to="/perfil" className="btn-outline flex items-center gap-2" style={{ padding: '8px 20px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', tracking: '0.15em', borderRadius: '100px' }}>
                  <User size={13} /> Mi Perfil
                </Link>
                <Link to="/agendar" className="btn-gold flex items-center gap-2" style={{ padding: '8px 20px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', tracking: '0.15em', borderRadius: '100px' }}>
                  <Calendar size={13} /> Reservar
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-outline flex items-center gap-2" style={{ padding: '8px 20px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', tracking: '0.15em', borderRadius: '100px' }}>
                  <User size={13} /> Iniciar Sesión
                </Link>
                <Link to="/registro" className="btn-gold flex items-center gap-2" style={{ padding: '8px 20px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', tracking: '0.15em', borderRadius: '100px' }}>
                  <Calendar size={13} /> Reservar mi visita
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Navbar - Glassmorphic Mobile Header Bar (Mobile Only) */}
      <nav 
        className={`fixed top-0 left-0 w-full h-[64px] z-50 flex items-center justify-between px-6 lg:hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isScrolled 
            ? 'bg-[rgba(7,7,10,0.85)] backdrop-blur-xl border-b border-[rgba(255,255,255,0.06)] shadow-[0_4px_25px_rgba(0,0,0,0.5)]' 
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        {/* Clickable Logo */}
        <Link to="/" onClick={() => setMenuOpen(false)} className="flex items-center">
          <img src={logo} alt="Panda Barber Studio" className="h-[38px] object-contain filter brightness-110" />
        </Link>

        {/* Menu Toggle Button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ cursor: 'pointer', padding: '8px', color: 'var(--text-primary)' }}
          className="flex items-center justify-center transition-colors"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Menu Dropdown - Floating clean menu */}
        {menuOpen && (
          <div 
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
              top: '72px',
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


    </div>
  );
}
