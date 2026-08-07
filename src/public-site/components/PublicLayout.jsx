import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Menu, X, Scissors, Phone, MapPin, Calendar, User, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { publicService } from '../services/publicService';
import logo from '../../assets/logo_full.png';

export default function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [clickedId, setClickedId] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const googleCallbackHandledRef = useRef(false);

  useEffect(() => {
    const handleScroll = (e) => {
      const scrollTop = e.target?.scrollTop ?? window.scrollY;
      if (scrollTop > 30) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    // Use capture phase (true) to intercept scroll events from scrollable divs inside child pages
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  useEffect(() => {
    const client = localStorage.getItem('panda_public_client');
    setIsLoggedIn(!!client);
  }, [location]);

  useEffect(() => {
    const completeGoogleLogin = async session => {
      if (
        !session?.user
        || localStorage.getItem('panda_google_login_pending') !== 'true'
        || googleCallbackHandledRef.current
      ) {
        return;
      }

      googleCallbackHandledRef.current = true;
      try {
        const client = await publicService.getClientByUserId(session.user.id);
        localStorage.removeItem('panda_google_login_pending');

        if (!client) {
          navigate('/completar-registro', { replace: true });
          return;
        }

        localStorage.setItem('panda_public_client', JSON.stringify(client));
        setIsLoggedIn(true);
        if (localStorage.getItem('panda_login_return_to_booking') === 'true') {
          localStorage.removeItem('panda_login_return_to_booking');
          localStorage.removeItem('bookingState');
          navigate('/agendar', { replace: true, state: { startBooking: true } });
        } else {
          navigate('/perfil', { replace: true });
        }
      } catch (e) {
        googleCallbackHandledRef.current = false;
        console.error('Error fetching client after login:', e);
      }
    };

    const { data: authListener } = publicService.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        completeGoogleLogin(session);
      }
    });

    publicService.getSession()
      .then(completeGoogleLogin)
      .catch(error => console.error('Error restoring Google session:', error));

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [navigate]);

  const mobileNavLinks = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'servicios', label: 'Servicios' },
    { id: 'equipo', label: 'Equipo' },
    { id: 'experiencia-section', label: 'Experiencia' },
    { id: 'ubicacion', label: 'Ubicación' }
  ];

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
            <a 
              href="#inicio" 
              onClick={(e) => {
                e.preventDefault();
                // Find the main scrollable container div by tracking parents or selector
                const container = document.getElementById('inicio')?.closest('.overflow-y-auto') || window;
                container.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-white hover:text-[var(--champagne)] transition-colors text-xs uppercase font-extrabold tracking-widest no-underline"
            >
              Inicio
            </a>
            <a 
              href="#servicios" 
              onClick={(e) => {
                e.preventDefault();
                const element = document.getElementById('servicios');
                const container = element?.closest('.overflow-y-auto') || window;
                if (element) {
                  // If container is window, use standard bounding rect, else use relative offsetTop
                  const scrollTarget = container === window 
                    ? element.getBoundingClientRect().top + window.scrollY - 120
                    : element.offsetTop - 120;
                  container.scrollTo({ top: scrollTarget, behavior: 'smooth' });
                }
              }}
              className="text-white hover:text-[var(--champagne)] transition-colors text-xs uppercase font-extrabold tracking-widest no-underline"
            >
              Servicios
            </a>
            <a 
              href="#equipo" 
              onClick={(e) => {
                e.preventDefault();
                const element = document.getElementById('equipo');
                const container = element?.closest('.overflow-y-auto') || window;
                if (element) {
                  const scrollTarget = container === window 
                    ? element.getBoundingClientRect().top + window.scrollY - 120
                    : element.offsetTop - 120;
                  container.scrollTo({ top: scrollTarget, behavior: 'smooth' });
                }
              }}
              className="text-white hover:text-[var(--champagne)] transition-colors text-xs uppercase font-extrabold tracking-widest no-underline"
            >
              Equipo
            </a>
            <a 
              href="#experiencia-section" 
              onClick={(e) => {
                e.preventDefault();
                const element = document.getElementById('experiencia-section');
                const container = element?.closest('.overflow-y-auto') || window;
                if (element) {
                  const scrollTarget = container === window 
                    ? element.getBoundingClientRect().top + window.scrollY - 120
                    : element.offsetTop - 120;
                  container.scrollTo({ top: scrollTarget, behavior: 'smooth' });
                }
              }}
              className="text-white hover:text-[var(--champagne)] transition-colors text-xs uppercase font-extrabold tracking-widest no-underline"
            >
              Experiencia
            </a>
            <a 
              href="#ubicacion" 
              onClick={(e) => {
                e.preventDefault();
                const element = document.getElementById('ubicacion');
                const container = element?.closest('.overflow-y-auto') || window;
                if (element) {
                  const scrollTarget = container === window 
                    ? element.getBoundingClientRect().top + window.scrollY - 120
                    : element.offsetTop - 120;
                  container.scrollTo({ top: scrollTarget, behavior: 'smooth' });
                }
              }}
              className="text-white hover:text-[var(--champagne)] transition-colors text-xs uppercase font-extrabold tracking-widest no-underline"
            >
              Ubicación
            </a>
          </div>
 
          {/* Action Buttons */}
          <div className="flex items-center gap-4 header-actions-desktop">
            {isLoggedIn ? (
              <>
                <Link to="/perfil" className="btn-outline flex items-center gap-2" style={{ padding: '8px 20px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', tracking: '0.15em', borderRadius: '100px' }}>
                  <User size={13} /> Mi Perfil
                </Link>
                <Link
                  to="/agendar"
                  state={{ startBooking: true, bookingRequestId: Date.now() }}
                  className="btn-gold flex items-center gap-2"
                  style={{ padding: '8px 20px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', tracking: '0.15em', borderRadius: '100px' }}
                >
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
          onClick={() => {
            setMenuOpen(!menuOpen);
            setClickedId(null);
          }}
          className="relative z-[60] flex items-center justify-center p-2 text-white transition-all active:scale-90"
        >
          <motion.div
            initial={false}
            animate={{ rotate: menuOpen ? 90 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {menuOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
          </motion.div>
        </button>

        {/* Menu Dropdown - Apple Premium UX (Framer Motion) */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div 
              initial={{ opacity: 0, scale: 1.05, filter: 'blur(20px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(15px)', transition: { duration: 0.4, ease: [0.32, 0, 0.67, 0] } }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-0 z-50 flex flex-col pt-[80px]"
              style={{
                backgroundColor: '#050506',
                backgroundImage: 'radial-gradient(circle at top right, rgba(203,183,154,0.08) 0%, transparent 60%)',
                height: '100dvh'
              }}
            >
              <div className="flex-1 px-8 pt-12 overflow-y-auto pb-32">
                {/* Parent group to handle dimming of non-hovered items */}
                <div className="flex flex-col gap-2 group/menu">
                  {mobileNavLinks.map((link, index) => (
                    <motion.a
                      key={link.id}
                      href={`#${link.id}`}
                      initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
                      animate={
                        clickedId === link.id
                          ? { scale: 0.95, backgroundColor: 'rgba(255, 255, 255, 0.15)', opacity: 1, y: 0, filter: 'blur(0px)' }
                          : { scale: 1, backgroundColor: 'rgba(255, 255, 255, 0)', opacity: 1, y: 0, filter: 'blur(0px)' }
                      }
                      exit={{ opacity: 0, x: -40, filter: 'blur(10px)', transition: { duration: 0.3, ease: 'easeIn', delay: index * 0.03 } }}
                      whileTap={{ scale: 0.95, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25, delay: clickedId ? 0 : index * 0.08 + 0.1 }}
                      onClick={(e) => {
                        e.preventDefault();
                        setClickedId(link.id);
                        setTimeout(() => setMenuOpen(false), 200);
                        setTimeout(() => handleScrollTo(link.id), 400);
                      }}
                      className="group flex items-center gap-6 px-6 py-4 rounded-2xl text-white transition-all duration-300 ease-out hover:!opacity-100 hover:bg-white/10 group-hover/menu:opacity-30 cursor-pointer"
                    >
                      {/* Numbering */}
                      <span className="text-[#CBB79A] text-sm font-bold tracking-widest opacity-60">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      {/* Main Text */}
                      <span className="text-4xl sm:text-5xl font-black uppercase tracking-tighter group-hover:text-[#CBB79A] group-hover:translate-x-2 transition-all duration-500">
                        {link.label}
                      </span>
                    </motion.a>
                  ))}
                </div>
              </div>

              {/* Bottom Actions - Seamless Gradient Dock */}
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40, scale: 0.95, filter: 'blur(5px)', transition: { duration: 0.3, ease: 'easeIn' } }}
                transition={{ type: 'spring', stiffness: 200, damping: 24, delay: 0.3 }}
                className="absolute bottom-0 left-0 right-0 p-8 pt-16 bg-gradient-to-t from-[#050506] via-[#050506]/90 to-transparent flex flex-col gap-4 pointer-events-none"
              >
                <div className="grid grid-cols-2 gap-3 pointer-events-auto">
                  {isLoggedIn ? (
                    <>
                      <motion.div 
                        animate={clickedId === 'reservar' ? { scale: 0.95, opacity: 0.8 } : { scale: 1, opacity: 1 }}
                        whileHover={{ scale: 1.02 }} 
                        whileTap={{ scale: 0.95 }}
                      >
                        <Link 
                          to="/agendar"
                          state={{ startBooking: true, bookingRequestId: Date.now() }}
                          onClick={(e) => {
                            e.preventDefault();
                            setClickedId('reservar');
                            setTimeout(() => setMenuOpen(false), 200);
                            setTimeout(() => navigate('/agendar', { state: { startBooking: true, bookingRequestId: Date.now() } }), 150);
                          }}
                          className="relative w-full py-4 rounded-full bg-gradient-to-br from-[#E2D1B9] via-[#CBB79A] to-[#A8967D] text-[#312313] font-black text-[10px] uppercase tracking-widest flex justify-center items-center gap-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),0_0_20px_rgba(203,183,154,0.15)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),0_0_30px_rgba(203,183,154,0.3)] active:scale-95 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] transition-all duration-200 overflow-hidden group/btn"
                        >
                          {/* Inner shine effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 ease-in-out" />
                          <Calendar size={13} strokeWidth={2.5} className="opacity-80 relative z-10" /> <span className="relative z-10">Reservar</span>
                        </Link>
                      </motion.div>
                      <motion.div 
                        animate={clickedId === 'perfil' ? { scale: 0.95, backgroundColor: 'rgba(255,255,255,0.15)' } : { scale: 1 }}
                        whileHover={{ scale: 1.02 }} 
                        whileTap={{ scale: 0.95 }}
                      >
                        <Link 
                          to="/perfil" 
                          onClick={(e) => {
                            e.preventDefault();
                            setClickedId('perfil');
                            setTimeout(() => setMenuOpen(false), 200);
                            setTimeout(() => navigate('/perfil'), 200);
                          }} 
                          className="w-full py-4 rounded-full bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] text-white font-extrabold text-[10px] uppercase tracking-widest flex justify-center items-center gap-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_10px_rgba(0,0,0,0.2)] hover:bg-white/[0.06] hover:border-white/[0.15] active:scale-95 active:bg-white/[0.1] active:shadow-none transition-all duration-200"
                        >
                          <User size={13} strokeWidth={2.5} className="opacity-60" /> Mi Perfil
                        </Link>
                      </motion.div>
                    </>
                  ) : (
                    <>
                      <motion.div 
                        animate={clickedId === 'registro' ? { scale: 0.95, opacity: 0.8 } : { scale: 1, opacity: 1 }}
                        whileHover={{ scale: 1.02 }} 
                        whileTap={{ scale: 0.95 }}
                      >
                        <Link 
                          to="/registro" 
                          onClick={(e) => {
                            e.preventDefault();
                            setClickedId('registro');
                            setTimeout(() => setMenuOpen(false), 200);
                            setTimeout(() => navigate('/registro'), 150);
                          }} 
                          className="relative w-full py-4 rounded-full bg-gradient-to-br from-[#E2D1B9] via-[#CBB79A] to-[#A8967D] text-[#312313] font-black text-[10px] uppercase tracking-widest flex justify-center items-center gap-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),0_0_20px_rgba(203,183,154,0.15)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),0_0_30px_rgba(203,183,154,0.3)] active:scale-95 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] transition-all duration-200 overflow-hidden group/btn"
                        >
                          {/* Inner shine effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 ease-in-out" />
                          <Calendar size={13} strokeWidth={2.5} className="opacity-80 relative z-10" /> <span className="relative z-10">Reservar</span>
                        </Link>
                      </motion.div>
                      <motion.div 
                        animate={clickedId === 'login' ? { scale: 0.95, backgroundColor: 'rgba(255,255,255,0.15)' } : { scale: 1 }}
                        whileHover={{ scale: 1.02 }} 
                        whileTap={{ scale: 0.95 }}
                      >
                        <Link 
                          to="/login" 
                          onClick={(e) => {
                            e.preventDefault();
                            setClickedId('login');
                            setTimeout(() => setMenuOpen(false), 200);
                            setTimeout(() => navigate('/login'), 200);
                          }} 
                          className="w-full py-4 rounded-full bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] text-white font-extrabold text-[10px] uppercase tracking-widest flex justify-center items-center gap-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_10px_rgba(0,0,0,0.2)] hover:bg-white/[0.06] hover:border-white/[0.15] active:scale-95 active:bg-white/[0.1] active:shadow-none transition-all duration-200"
                        >
                          <User size={13} strokeWidth={2.5} className="opacity-60" /> Entrar
                        </Link>
                      </motion.div>
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>


    </div>
  );
}
