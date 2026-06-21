import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Scissors, 
  Sparkles, 
  Coffee, 
  Compass,
  Phone, 
  CreditCard, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Info,
  Star,
  Award,
  ChevronDown
} from 'lucide-react';
import { publicService } from '../services/publicService';
import PandaLoader from '../../components/PandaLoader';

// Import background images and logo
import bgDesktop from '../../assets/barbershop_desktop.png';
import bgMobile from '../../assets/barbershop_mobile.png';
import logo from '../../assets/logo.png';

// Generate time slots from 9 AM to 10 PM (22:00) in 30-min intervals
function generateTimeSlots() {
  const slots = [];
  for (let hour = 9; hour <= 22; hour++) {
    for (let min = 0; min < 60; min += 30) {
      if (hour === 22 && min > 0) break; // Stop at 22:00
      slots.push(`${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
    }
  }
  return slots;
}

// Convert "09:00" to "9:00 AM", "14:30" to "2:30 PM" etc
function formatTime12(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

// Check if a time slot is in the past (for today)
function isTimePast(time24) {
  const now = new Date();
  const [h, m] = time24.split(':').map(Number);
  return h < now.getHours() || (h === now.getHours() && m <= now.getMinutes());
}

export default function BookAppointment() {
  const navigate = useNavigate();
  const [showWelcome, setShowWelcome] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);
  
  // Selections
  const [selectedCategory, setSelectedCategory] = useState('Barbería');
  const [openCategory, setOpenCategory] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedBeverage, setSelectedBeverage] = useState('');
  
  // Auth state at step 6
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authTab, setAuthTab] = useState('register'); // 'register' or 'login'
  const [showPassword, setShowPassword] = useState(false);
  const [authForm, setAuthForm] = useState({
    name: '',
    lastname: '',
    phone: '',
    id_card: '',
    email: '',
    password: '',
    birth_date: ''
  });
  const [loginForm, setLoginForm] = useState({
    identifier: '',
    password: ''
  });
  const [authError, setAuthError] = useState('');
  
  // General flow states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [occupiedSlots, setOccupiedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  const allTimeSlots = useMemo(() => generateTimeSlots(), []);

  const handleStartBooking = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setShowWelcome(false);
      setIsTransitioning(false);
    }, 750);
  };

  // Lock body/html scroll on welcome screen to prevent any viewport bounce/scroll
  useEffect(() => {
    if (showWelcome || isTransitioning) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, [showWelcome, isTransitioning]);

  // Restore draft booking (e.g. after Google OAuth redirect)
  useEffect(() => {
    const draft = localStorage.getItem('panda_draft_booking');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.service) {
          setSelectedService(parsed.service);
          const nameLower = parsed.service.name.toLowerCase();
          const isCombo = nameLower.includes('corte') && nameLower.includes('barba');
          if (isCombo) setOpenCategory('Corte+Barba');
          else if (parsed.service.category === 'Barbería' || parsed.service.category === 'Servicios') setOpenCategory('Corte');
          else if (parsed.service.category === 'Tratamientos' || nameLower.includes('barba')) setOpenCategory('Barba');
          else if (parsed.service.category === 'Tatuajes') setOpenCategory('Tatuajes');
        }
        if (parsed.barber) setSelectedBarber(parsed.barber);
        if (parsed.date) setSelectedDate(new Date(parsed.date));
        if (parsed.time) setSelectedTime(parsed.time);
        if (parsed.beverage) setSelectedBeverage(parsed.beverage);
        if (parsed.category) setSelectedCategory(parsed.category);
        if (parsed.step) {
          setStep(parsed.step);
          setShowWelcome(false);
        }
        localStorage.removeItem('panda_draft_booking');
      } catch (e) {
        console.error('Error restoring draft booking:', e);
      }
    }
    
    // Check if client is logged in
    const clientData = localStorage.getItem('panda_public_client');
    if (clientData) {
      setIsLoggedIn(true);
    }
  }, []);

  // Fetch services and staff
  useEffect(() => {
    const loadData = async () => {
      try {
        const [servicesData, staffData] = await Promise.all([
          publicService.getServices(),
          publicService.getStaff()
        ]);
        setServices(servicesData);
        setBarbers(staffData.filter(s => s.role?.includes('Barbero') || s.role?.includes('Artista') || s.role?.includes('Tatuador')));
      } catch (e) {
        console.error('Error loading data:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Fetch occupied slots when barber and date are selected
  useEffect(() => {
    if (!selectedBarber || !selectedDate) {
      setOccupiedSlots([]);
      return;
    }

    const fetchOccupied = async () => {
      setLoadingSlots(true);
      try {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const occupied = await publicService.getOccupiedSlots(selectedBarber.id, dateStr);
        setOccupiedSlots(occupied);
      } catch (e) {
        console.error('Error fetching occupied slots:', e);
        setOccupiedSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchOccupied();
  }, [selectedBarber, selectedDate]);

  // Filter visible time slots
  const visibleSlots = useMemo(() => {
    const isToday = selectedDate?.toDateString() === new Date().toDateString();
    return allTimeSlots.map(time => ({
      time,
      label: formatTime12(time),
      isPast: isToday && isTimePast(time),
      isOccupied: occupiedSlots.includes(time),
    }));
  }, [allTimeSlots, selectedDate, occupiedSlots]);

  // Filter services by category key
  const getServicesForCategory = (catKey) => {
    return services.filter(service => {
      const c = service.category || 'Barbería';
      const nameLower = service.name.toLowerCase();
      const isCombo = nameLower.includes('corte') && nameLower.includes('barba');
      
      if (catKey === 'Corte+Barba') {
        return isCombo;
      }
      if (catKey === 'Corte') {
        return (c === 'Barbería' || c === 'Servicios') && !isCombo;
      }
      if (catKey === 'Barba') {
        return (c === 'Tratamientos' || nameLower.includes('barba')) && !isCombo;
      }
      if (catKey === 'Tatuajes') {
        return c === 'Tatuajes';
      }
      return false;
    });
  };

  // Reset selected time when date/barber changes
  useEffect(() => {
    setSelectedTime(null);
  }, [selectedDate, selectedBarber]);

  const steps = [
    { num: 1, label: 'Servicio' },
    { num: 2, label: 'Artista' },
    { num: 3, label: 'Fecha' },
    { num: 4, label: 'Hora' },
    { num: 5, label: 'Bebida' },
    { num: 6, label: 'Cierre' },
  ];

  const canNext = () => {
    if (step === 1) return selectedService;
    if (step === 2) return selectedBarber;
    if (step === 3) return selectedDate;
    if (step === 4) return selectedTime;
    if (step === 5) return selectedBeverage;
    return false;
  };

  // Save current progress & trigger Google Login redirect
  const handleGoogleLogin = () => {
    localStorage.setItem('panda_draft_booking', JSON.stringify({
      service: selectedService,
      barber: selectedBarber,
      date: selectedDate ? selectedDate.toISOString() : null,
      time: selectedTime,
      beverage: selectedBeverage,
      category: selectedCategory,
      step: 6
    }));
    publicService.signInWithGoogle();
  };

  // Unified final checkout handling
  const handleCheckout = async (e) => {
    if (e) e.preventDefault();
    setAuthError('');
    setSubmitting(true);
    
    let activeClient = null;

    try {
      if (!isLoggedIn) {
        if (authTab === 'register') {
          // Validate required fields
          if (!authForm.name || !authForm.phone || !authForm.id_card || !authForm.birth_date || !authForm.password) {
            throw new Error('Por favor completa todos los campos obligatorios.');
          }
          // Combine first name & last name
          const fullName = `${authForm.name} ${authForm.lastname}`.trim();
          const regResult = await publicService.registerClient({
            name: fullName,
            phone: authForm.phone,
            id_card: authForm.id_card,
            email: authForm.email || null,
            password: authForm.password,
            birth_date: authForm.birth_date
          });
          activeClient = regResult.client;
          localStorage.setItem('panda_public_client', JSON.stringify(activeClient));
          setIsLoggedIn(true);
        } else {
          // Log in existing client
          if (!loginForm.identifier || !loginForm.password) {
            throw new Error('Por favor completa los campos de inicio de sesión.');
          }
          const loginResult = await publicService.loginClient({
            identifier: loginForm.identifier,
            password: loginForm.password
          });
          
          let client = null;
          if (loginForm.identifier.includes('@')) {
            client = await publicService.getClientByEmail(loginForm.identifier);
          } else {
            client = await publicService.getClientByPhone(loginForm.identifier);
          }
          
          if (!client) {
            throw new Error('No se encontró información del cliente.');
          }
          
          activeClient = client;
          localStorage.setItem('panda_public_client', JSON.stringify(activeClient));
          setIsLoggedIn(true);
        }
      } else {
        activeClient = JSON.parse(localStorage.getItem('panda_public_client') || 'null');
      }

      if (!activeClient) {
        throw new Error('No hay una sesión activa de cliente.');
      }

      // Schedule appointment
      const scheduledAt = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':');
      scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      await publicService.createAppointment({
        client_id: activeClient.id,
        service_id: selectedService.id,
        staff_id: selectedBarber.id,
        scheduled_at: scheduledAt.toISOString(),
        beverage_selection: selectedBeverage
      });
      setSuccess(true);
    } catch (err) {
      console.error('Booking checkout error:', err);
      setAuthError(err.message || 'Error al agendar la cita. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderWelcomeContent = (sliceClass = "") => {
    return (
      <div className={`slice-screen ${sliceClass}`}>
        {/* Background photo inside slice */}
        <div 
          className={`absolute top-0 left-0 w-full pointer-events-none z-0 animate-bg-zoom ${isTransitioning ? 'welcome-exit-bg' : ''}`}
          style={{
            height: '45%',
            backgroundImage: `url(${window.innerWidth > 768 ? bgDesktop : bgMobile})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: 'brightness(0.70) contrast(1.05)',
            maskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.95) 50%, rgba(0, 0, 0, 0) 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.95) 50%, rgba(0, 0, 0, 0) 100%)',
          }}
        />
        
        {/* Centered welcome content */}
        <div className="w-full h-full max-h-full flex flex-col justify-center items-center text-center px-6 py-5 relative z-10 box-border gap-6 md:gap-7">
          {/* Logo and header */}
          <div className="flex flex-col items-center relative z-20 fade-up-1">
            <img src={logo} alt="Panda Barber" className="w-24 h-24 object-contain filter brightness-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
          </div>

          {/* Hero Welcome content */}
          <div className="w-full max-w-sm space-y-4 relative z-10">
            <div className="fade-up-2">
              <span className="text-[12px] font-bold uppercase tracking-[0.3em] text-[#CBB79A] block mb-1">BIENVENIDO A</span>
              <h1 className="text-4xl font-extrabold tracking-wider text-white leading-none gold-glow-text">PANDA BARBER</h1>
            </div>

            {/* Division Line with Scissors character */}
            <div className="flex items-center justify-center gap-4 my-2 fade-up-3">
              <div className="h-[1px] w-16 bg-[#CBB79A]/40"></div>
              <Scissors size={14} className="text-[#CBB79A] gold-glow-scissors" />
              <div className="h-[1px] w-16 bg-[#CBB79A]/40"></div>
            </div>

            <p className="text-white/70 text-sm leading-relaxed max-w-xs mx-auto font-medium font-outfit fade-up-3">
              Precisión en cada detalle. <br/> Distinción en cada estilo.
            </p>

            {/* Features highlight enclosed in a premium floating bar */}
            <div className="w-full bg-black/45 backdrop-blur-md border border-white/5 rounded-2xl p-4.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] fade-up-4 glass-features-bar">
              <div className="grid grid-cols-3 gap-0">
                <div className="flex flex-col items-center justify-center p-1">
                  <Star className="text-[#CBB79A] mb-2" size={22} strokeWidth={1.5} />
                  <span className="text-[10px] font-bold tracking-wider text-white/90 uppercase">Barberos</span>
                  <span className="text-[10px] font-bold tracking-wider text-white/90 uppercase">Expertos</span>
                </div>
                <div className="flex flex-col items-center justify-center p-1 border-x border-white/10">
                  <svg className="w-5.5 h-5.5 text-[#CBB79A] mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M7 10V5C7 3.89543 7.89543 3 9 3H15C16.1046 3 17 3.89543 17 5V10" />
                    <path d="M5 10H19C20.1046 10 21 10.8954 21 12V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V12C3 10.8954 3.89543 10 5 10Z" />
                    <path d="M8 19V22M16 19V22" />
                  </svg>
                  <span className="text-[10px] font-bold tracking-wider text-white/90 uppercase">Experiencia</span>
                  <span className="text-[10px] font-bold tracking-wider text-white/90 uppercase">Premium</span>
                </div>
                <div className="flex flex-col items-center justify-center p-1">
                  <Award className="text-[#CBB79A] mb-2" size={22} strokeWidth={1.5} />
                  <span className="text-[10px] font-bold tracking-wider text-white/90 uppercase">Resultados</span>
                  <span className="text-[10px] font-bold tracking-wider text-white/90 uppercase">Garantizados</span>
                </div>
              </div>
            </div>
          </div>

          {/* Buttons drawer */}
          <div className="w-full max-w-sm space-y-3.5 relative z-10 fade-up-5">
            <button 
              onClick={handleStartBooking}
              className="w-full py-4.5 rounded-xl font-extrabold text-sm uppercase tracking-widest transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 btn-premium-shimmer"
              style={{ 
                background: 'linear-gradient(to bottom, #d2c1aa, #bba789)', 
                color: '#000'
              }}
            >
              Reservar mi primera visita <span className="text-sm">→</span>
            </button>
            
            <button
              onClick={() => {
                setIsTransitioning(true);
                setStep(6);
                setAuthTab('login');
                setTimeout(() => {
                  setShowWelcome(false);
                  setIsTransitioning(false);
                }, 750);
              }}
              className="btn-glass-gold py-3.5 text-xs font-extrabold"
            >
              Ya tengo cuenta
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Base layout wrapper (same as admin login screen with full-screen, frame borders, and parallax styling)
  return (
    <div 
      className="w-screen overflow-hidden flex items-center justify-center bg-[#050506]"
      style={{
        height: '100dvh',
        padding: window.innerWidth > 768 ? '24px' : '0'
      }}
    >
      <PandaLoader visible={loading && !showWelcome} />
      <div 
        className={`relative w-full h-full overflow-x-hidden flex flex-col justify-between items-center bg-center ${showWelcome ? 'overflow-y-hidden text-clip' : 'overflow-y-auto'}`}
        style={{
          height: window.innerWidth > 768 ? 'calc(100vh - 48px)' : '100dvh',
          borderRadius: window.innerWidth > 768 ? '28px' : '0',
          border: window.innerWidth > 768 ? '1.5px solid var(--border-color)' : 'none',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)',
          backgroundColor: '#07070a',
          scrollbarWidth: 'none'
        }}
      >
        {/* Ambient auroras for premium glowing background */}
        <div className={`aurora-container ${isTransitioning ? 'welcome-exit-aurora' : ''}`}>
          <div className="ambient-aurora-gold"></div>
          <div className="ambient-aurora-bronze"></div>
        </div>

         {/* ── WELCOME SCREEN ── */}
        {/* At rest: single unclipped fullscreen container (no diagonal line visible) */}
        {showWelcome && !isTransitioning && renderWelcomeContent("")}

        {/* On click: two slices with @keyframe exit animation (starts from full-screen, splits apart) */}
        {isTransitioning && (
          <div className="slice-container welcome-exit">
            {renderWelcomeContent("slice-top-left")}
            {renderWelcomeContent("slice-bottom-right")}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-[40]">
              <line x1="100%" y1="0%" x2="0%" y2="100%" className="scissors-cut-line" />
            </svg>
            <div className="scissors-cutter-icon">
              <div className="scissors-blades origin-[28px_28px]">
                <Scissors size={42} className="text-[#CBB79A] drop-shadow-[0_0_15px_rgba(203,183,154,0.8)]" />
              </div>
            </div>
          </div>
        )}

        {/* ── SUCCESS VIEW SCREEN ── */}
        {!showWelcome && success && (
          <div className="w-full flex-1 flex items-center justify-center p-4">
            <div className="glass-card text-center py-10 px-8 max-w-md w-full border border-[var(--border-color)] relative overflow-hidden animate-page-fade-in">
              <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-[rgba(203,183,154,0.08)] blur-3xl"></div>
              <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-[rgba(197,168,128,0.05)] blur-3xl"></div>

              <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
                <Check size={40} className="text-emerald-400" />
              </div>
              <h2 className="text-3xl font-extrabold mb-3 text-white tracking-tight">¡Cita Agendada!</h2>
              <p className="text-[var(--text-secondary)] mb-8 text-sm leading-relaxed">
                Tu reserva ha sido registrada exitosamente. Hemos preparado todo para tu llegada. ¡Disfruta de la experiencia!
              </p>

              <div className="bg-black/40 rounded-xl p-5 border border-white/5 text-left mb-8 space-y-3">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-xs text-white/40 uppercase tracking-wider">Servicio</span>
                  <span className="text-sm font-bold text-white">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-xs text-white/40 uppercase tracking-wider">Especialista</span>
                  <span className="text-sm font-bold text-[var(--champagne)]">{selectedBarber?.name}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-xs text-white/40 uppercase tracking-wider">Fecha & Hora</span>
                  <span className="text-sm font-bold text-white">
                    {selectedDate?.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} a las {formatTime12(selectedTime)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/40 uppercase tracking-wider">Bebida</span>
                  <span className="text-sm font-bold text-emerald-400">{selectedBeverage}</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/perfil')}
                className="btn-gold w-full py-3.5 rounded-full font-bold uppercase tracking-wider text-sm shadow-[var(--shadow-glow-gold)] cursor-pointer"
              >
                Ir a mi Perfil
              </button>
            </div>
          </div>
        )}

        {/* ── INTERACTIVE WIZARD FLOW SCREEN (STEPS 1-6) ── */}
        {(!showWelcome || isTransitioning) && !success && (
          <div className="w-full max-w-xl mx-auto px-4 py-8 flex flex-col justify-between flex-1 relative z-10 wizard-3d-reveal">
            
            {/* Wizard Header: PASO X DE 6 with title/subtitle and back button */}
            <div className="mb-8 relative text-center">
              {/* Circular back button on the left */}
              <div className="absolute left-0 top-0">
                <button 
                  onClick={() => step > 1 ? setStep(step - 1) : setShowWelcome(true)}
                  className="wizard-back-button"
                  type="button"
                >
                  <ChevronLeft size={18} />
                </button>
              </div>

              {/* Step indicator */}
              <div className="inline-block mt-2">
                <span className="text-[10px] font-black tracking-[0.25em] text-[var(--champagne)] uppercase block mb-2.5">
                  PASO {step} DE 6
                </span>
                
                {/* Segmented Progress Bar */}
                <div className="flex gap-1 w-32 justify-center mx-auto mb-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div 
                      key={i} 
                      className={`h-0.5 rounded-full transition-all duration-300 ${
                        i === step 
                          ? 'w-6 bg-[var(--champagne)] shadow-[0_0_8px_rgba(203,183,154,0.6)]' 
                          : i < step 
                            ? 'w-3 bg-[var(--champagne-dark)] opacity-70' 
                            : 'w-3 bg-white/10'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="mt-3 space-y-1">
                <h1 className="text-2xl font-extrabold tracking-tight text-white leading-tight">
                  {step === 1 && "¿Qué servicio buscas hoy?"}
                  {step === 2 && <>Elige tu <span className="text-[var(--champagne)]">Artista</span></>}
                  {step === 3 && <>Selecciona la <span className="text-[var(--champagne)]">Fecha</span></>}
                  {step === 4 && <>Elige la <span className="text-[var(--champagne)]">Hora</span></>}
                  {step === 5 && <>Protocolo de <span className="text-[var(--champagne)]">Conserjería</span></>}
                  {step === 6 && <>Completa tu <span className="text-[var(--champagne)]">Reserva</span></>}
                </h1>
                <p className="text-[var(--text-secondary)] text-[11px] font-medium max-w-sm mx-auto">
                  {step === 1 && "Elige el servicio que mejor se adapte a tu estilo."}
                  {step === 2 && "El match perfecto para tu look ideal."}
                  {step === 3 && "Elige el día que mejor se adapte a tu agenda."}
                  {step === 4 && "Elige el bloque horario disponible."}
                  {step === 5 && "Ameniza tu espera con una de nuestras bebidas de cortesía."}
                  {step === 6 && "Ingresa tus datos para asegurar tu cita en 1 clic."}
                </p>
              </div>
            </div>

            {/* Content Glass Card */}
            <div className="glass-card border border-[var(--border-color)] p-6 min-h-[320px] flex flex-col justify-between flex-1 mb-4 relative overflow-hidden">
              <div key={step} className="transition-step-container w-full h-full flex flex-col justify-between flex-1">
                
                {/* STEP 1: Categories & Services (Accordion) */}
                {step === 1 && (
                  <div className="space-y-4 w-full">
                    {[
                      { key: 'Corte', label: 'Corte', sub: 'Renueva tu estilo', icon: '✂️' },
                      { key: 'Barba', label: 'Barba', sub: 'Perfilado & arreglo', icon: '🧔' },
                      { key: 'Corte+Barba', label: 'Corte + Barba', sub: 'El combo completo', icon: '💈' },
                      { key: 'Tatuajes', label: 'Tatuajes', sub: 'Arte en tu piel', icon: '🖊️' },
                    ].map(cat => {
                      const isOpen = openCategory === cat.key;
                      const catServices = getServicesForCategory(cat.key);
                      return (
                        <div 
                          key={cat.key} 
                          className={`rounded-xl border overflow-hidden transition-all duration-300 accordion-category-card ${
                            isOpen ? 'is-open' : ''
                          }`}
                        >
                          {/* Header card — click to toggle */}
                          <button 
                            onClick={() => setOpenCategory(isOpen ? null : cat.key)}
                            className="accordion-category-header"
                            type="button"
                          >
                            <div className="accordion-category-header-content">
                              <div className="category-icon-wrapper">
                                {cat.icon}
                              </div>
                              <div className="category-title-wrapper">
                                <span className="category-title">{cat.label}</span>
                                <span className="category-subtitle">{cat.sub}</span>
                              </div>
                            </div>
                            <ChevronDown size={18} className="accordion-chevron" />
                          </button>

                          {/* Expandable list of services */}
                          {isOpen && (
                            <div className="accordion-services-list">
                              {catServices.length === 0 ? (
                                <div className="text-center py-6 text-white/35 text-xs font-semibold">
                                  No hay servicios disponibles en esta categoría.
                                </div>
                              ) : (
                                catServices.map(service => {
                                  const isSelected = selectedService?.id === service.id;
                                  return (
                                    <button
                                      key={service.id}
                                      onClick={() => {
                                        setSelectedService(service);
                                        setSelectedCategory(cat.key);
                                      }}
                                      type="button"
                                      className={`accordion-service-item ${isSelected ? 'is-selected' : ''}`}
                                    >
                                      <div className="service-left">
                                        <div className="service-check-wrapper">
                                          <Check size={12} strokeWidth={3} />
                                        </div>
                                        <div className="service-details">
                                          <span className="service-name">{service.name}</span>
                                          {service.duration && (
                                            <span className="service-duration">
                                              <Clock size={10} /> {service.duration} min
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="service-price">
                                        ${service.price}
                                      </div>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* STEP 2: Barbers Match Carousel */}
                {step === 2 && (
                  <div className="space-y-6 w-full">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">Nuestros Profesionales</h3>
                    
                    <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x snap-mandatory px-1">
                      {barbers.map((barber) => {
                        const isSelected = selectedBarber?.id === barber.id;
                        const rating = (barber.id % 2 === 0) ? '4.9' : '4.8';
                        const specialty = barber.role?.includes('Tatuador') ? 'Artista' : (barber.id % 2 === 0) ? 'Master Fade' : 'Estilo Clásico';
                        return (
                          <button
                            key={barber.id}
                            onClick={() => setSelectedBarber(barber)}
                            className={`flex-shrink-0 w-36 snap-start p-4 rounded-2xl border text-center transition-all duration-300 relative cursor-pointer flex flex-col items-center justify-between ${
                              isSelected 
                                ? 'border-[var(--champagne)] bg-[rgba(203,183,154,0.08)] scale-[1.03] shadow-md' 
                                : 'border-white/5 bg-black/40 hover:border-white/10'
                            }`}
                          >
                            <div className="relative mb-3">
                              <div className="w-16 h-16 rounded-full mx-auto overflow-hidden border-2 border-[var(--border-color)] relative">
                                {barber.image_url ? (
                                  <img src={barber.image_url} alt={barber.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-[var(--champagne-dark)] flex items-center justify-center text-black">
                                    <User size={24} />
                                  </div>
                                )}
                                {isSelected && (
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <Check size={18} className="text-[var(--champagne)]" strokeWidth={3} />
                                  </div>
                                )}
                              </div>
                              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-[#07070a] border border-white/10 text-[8px] font-bold text-amber-400 flex items-center gap-0.5 shadow-sm whitespace-nowrap">
                                ★ {rating}
                              </span>
                            </div>
                            <div className="w-full space-y-1">
                              <span className="block font-bold text-sm truncate text-white">{barber.name}</span>
                              <span className="text-[9px] px-2 py-0.5 rounded-full inline-block barber-badge font-bold uppercase tracking-wider scale-90">
                                {specialty}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {selectedBarber ? (
                      <div className="bg-black/30 border border-white/5 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-[var(--champagne)]/10 flex items-center justify-center text-[var(--champagne)] flex-shrink-0">
                            <Star size={18} className="fill-[var(--champagne)]" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-white">Sobre {selectedBarber.name}</h4>
                            <p className="text-xs text-white/50 mt-1 leading-relaxed">
                              Especialista certificado en cortes modernos, degradados clásicos y diseño de barba personalizado. Comprometido en entregarte un servicio de primer nivel.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white/3 text-center py-6 rounded-xl border border-dashed border-white/10 text-white/40 text-xs">
                        Selecciona un barbero para ver su biografía y calificaciones.
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 3: Dates */}
                {step === 3 && (
                  <div className="space-y-6 w-full">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">Selecciona el Día</h3>
                    
                    <div className="grid grid-cols-4 gap-3">
                      {Array.from({ length: 12 }, (_, i) => {
                        const date = new Date();
                        date.setDate(date.getDate() + i);
                        const isSelected = selectedDate?.toDateString() === date.toDateString();
                        const isWeekend = date.getDay() === 0;
                        
                        return (
                          <button
                            key={i}
                            onClick={() => !isWeekend && setSelectedDate(date)}
                            disabled={isWeekend}
                            className={`p-3.5 rounded-xl text-center flex flex-col items-center justify-center border transition-all duration-200 cursor-pointer ${
                              isWeekend
                                ? 'opacity-20 cursor-not-allowed border-none bg-transparent'
                                : isSelected
                                  ? 'border-[var(--champagne)] bg-[rgba(203,183,154,0.1)] shadow-sm'
                                  : 'border-white/5 bg-black/40 hover:bg-[#0e0e12]/60 hover:border-white/10'
                            }`}
                          >
                            <span className={`text-[10px] uppercase font-bold tracking-wider ${isSelected ? 'text-[var(--champagne)]' : 'text-white/40'}`}>
                              {date.toLocaleDateString('es', { weekday: 'short' })}
                            </span>
                            <span className="text-xl font-extrabold my-1">{date.getDate()}</span>
                            <span className="text-[9px] font-semibold text-white/40 capitalize">
                              {date.toLocaleDateString('es', { month: 'short' })}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    
                    <div className="flex items-center gap-2 text-white/40 text-xs bg-white/3 p-3 rounded-lg border border-white/5">
                      <Info size={14} className="text-[var(--champagne)] flex-shrink-0" />
                      <span>Atendemos de lunes a sábado. Los domingos permanecemos cerrados por descanso.</span>
                    </div>
                  </div>
                )}

                {/* STEP 4: Time Slots */}
                {step === 4 && (
                  <div className="space-y-5 w-full">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">Módulos de Hora</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                        {selectedDate?.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>

                    {loadingSlots ? (
                      <div className="text-center py-12 text-white/30 text-sm">
                        Cargando disponibilidad...
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                        {visibleSlots.map(({ time, label, isPast, isOccupied }) => {
                          const isSelected = selectedTime === time;
                          const isDisabled = isPast || isOccupied;

                          return (
                            <button
                              key={time}
                              onClick={() => !isDisabled && setSelectedTime(time)}
                              disabled={isDisabled}
                              className={`py-3 rounded-xl border text-center transition-all duration-200 cursor-pointer ${
                                isOccupied 
                                  ? 'border-red-500/20 bg-red-500/5 text-red-400/40 cursor-not-allowed opacity-50'
                                  : isPast
                                    ? 'border-white/3 bg-transparent text-white/10 cursor-not-allowed'
                                    : isSelected
                                      ? 'border-[var(--champagne)] bg-[rgba(203,183,154,0.1)] text-[var(--champagne)] font-bold scale-[1.02]'
                                      : 'border-white/5 bg-black/40 hover:bg-[#0e0e12] hover:border-white/10 text-white'
                              }`}
                            >
                              <span className="text-sm font-bold block">{label}</span>
                              {isOccupied && <span className="text-[8px] tracking-wider uppercase font-semibold text-red-500/60 mt-0.5 block">Ocupado</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 5: Beverage Concierge */}
                {step === 5 && (
                  <div className="space-y-6 w-full">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 mb-1">Protocolo de Bienvenida</h3>
                      <p className="text-xs text-white/40">
                        Disfruta de una bebida premium de cortesía durante tu espera o servicio.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { id: 'Cerveza', label: 'Cerveza Fría', desc: 'Polar Light / Pilsen', icon: '🍺' },
                        { id: 'Café', label: 'Café Premium', desc: 'Expreso / Macchiato', icon: '☕' },
                        { id: 'Whiskey', label: 'Whiskey On Rocks', desc: 'Servicio premium de bar', icon: '🥃' },
                        { id: 'Agua', label: 'Agua Mineral', desc: 'Con o sin gas', icon: '💧' }
                      ].map((bev) => {
                        const isSelected = selectedBeverage === bev.id;
                        return (
                          <button
                            key={bev.id}
                            onClick={() => setSelectedBeverage(bev.id)}
                            className={`p-4 rounded-2xl text-left cursor-pointer transition-all duration-300 flex flex-col justify-between h-28 beverage-card ${
                              isSelected ? 'selected' : ''
                            }`}
                          >
                            <div className="flex justify-between items-start w-full">
                              <span className="text-xl filter drop-shadow-[0_2px_6px_rgba(203,183,154,0.35)]">{bev.icon}</span>
                              {isSelected && (
                                <span className="w-4 h-4 rounded-full bg-[var(--champagne)] flex items-center justify-center text-black text-[9px] font-extrabold">
                                  ✓
                                </span>
                              )}
                            </div>
                            <div className="space-y-0.5">
                              <span className={`block font-extrabold text-[11px] uppercase tracking-wider ${isSelected ? 'text-[var(--champagne)]' : 'text-white/95'}`}>
                                {bev.label}
                              </span>
                              <span className="text-[9px] text-white/45 font-medium block leading-tight">
                                {bev.desc}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 6: Confirmation & Cierre Mágico (Registration) */}
                {step === 6 && (
                  <div className="space-y-6 w-full">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 text-center">Resumen de tu Turno</h3>

                    <div className="bg-[#0e0e12] border border-white/5 rounded-2xl p-4 text-sm space-y-3 shadow-inner">
                      <div className="flex justify-between items-center">
                        <span className="text-white/40 text-xs uppercase tracking-wider">Servicio</span>
                        <span className="font-bold text-white">{selectedService?.name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/40 text-xs uppercase tracking-wider">Especialista</span>
                        <span className="font-bold text-[var(--champagne)]">{selectedBarber?.name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/40 text-xs uppercase tracking-wider">Horario</span>
                        <span className="font-bold text-white">
                          {selectedDate?.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} • {formatTime12(selectedTime)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/40 text-xs uppercase tracking-wider">Bebida</span>
                        <span className="font-bold text-emerald-400">{selectedBeverage}</span>
                      </div>
                      <div className="border-t border-white/5 pt-3 flex justify-between items-center">
                        <span className="text-white/60 font-bold">Total a Pagar:</span>
                        <span className="text-xl font-extrabold text-[var(--champagne)]">${selectedService?.price}</span>
                      </div>
                    </div>

                    {!isLoggedIn && (
                      <div className="bg-black/50 border border-[var(--border-color)] rounded-2xl p-5 space-y-5">
                        <div className="text-center space-y-1">
                          <h4 className="font-bold text-white text-base">Cierre Mágico</h4>
                          <p className="text-xs text-white/40">Agenda tu cita y crea tu perfil express en un paso.</p>
                        </div>

                        <button
                          type="button"
                          onClick={handleGoogleLogin}
                          className="w-full py-3 px-4 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          Conectar con Google
                        </button>

                        <div className="flex items-center gap-3">
                          <div className="h-px bg-white/5 flex-1"></div>
                          <span className="text-[10px] uppercase font-bold tracking-widest text-white/20">o llena tus datos</span>
                          <div className="h-px bg-white/5 flex-1"></div>
                        </div>

                        <div className="flex p-0.5 rounded-lg bg-[#0e0e12] border border-white/5">
                          <button
                            type="button"
                            onClick={() => { setAuthTab('register'); setAuthError(''); }}
                            className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${authTab === 'register' ? 'bg-[var(--champagne)] text-black' : 'text-white/40'}`}
                          >
                            Registro Rápido
                          </button>
                          <button
                            type="button"
                            onClick={() => { setAuthTab('login'); setAuthError(''); }}
                            className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${authTab === 'login' ? 'bg-[var(--champagne)] text-black' : 'text-white/40'}`}
                          >
                            Tengo Cuenta
                          </button>
                        </div>

                        {authError && (
                          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-xl">
                            {authError}
                          </div>
                        )}

                        {authTab === 'register' ? (
                          <form onSubmit={handleCheckout} className="space-y-3.5 text-left">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Nombre</label>
                                <input
                                  type="text"
                                  value={authForm.name}
                                  onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                                  className="w-full bg-[#0e0e12] border border-white/5 rounded-xl px-3 py-2 text-xs focus:border-[var(--champagne)] outline-none"
                                  placeholder="Juan"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Apellido</label>
                                <input
                                  type="text"
                                  value={authForm.lastname}
                                  onChange={(e) => setAuthForm({ ...authForm, lastname: e.target.value })}
                                  className="w-full bg-[#0e0e12] border border-white/5 rounded-xl px-3 py-2 text-xs focus:border-[var(--champagne)] outline-none"
                                  placeholder="Pérez"
                                  required
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Teléfono</label>
                                <input
                                  type="tel"
                                  value={authForm.phone}
                                  onChange={(e) => setAuthForm({ ...authForm, phone: e.target.value })}
                                  className="w-full bg-[#0e0e12] border border-white/5 rounded-xl px-3 py-2 text-xs focus:border-[var(--champagne)] outline-none"
                                  placeholder="+58 412..."
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Cédula</label>
                                <input
                                  type="text"
                                  value={authForm.id_card}
                                  onChange={(e) => setAuthForm({ ...authForm, id_card: e.target.value })}
                                  className="w-full bg-[#0e0e12] border border-white/5 rounded-xl px-3 py-2 text-xs focus:border-[var(--champagne)] outline-none"
                                  placeholder="V-12345678"
                                  required
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Fecha de Nacimiento</label>
                              <input
                                type="date"
                                value={authForm.birth_date}
                                onChange={(e) => setAuthForm({ ...authForm, birth_date: e.target.value })}
                                className="w-full bg-[#0e0e12] border border-white/5 rounded-xl px-3 py-2 text-xs focus:border-[var(--champagne)] outline-none text-white"
                                required
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Email (Opcional)</label>
                              <input
                                type="email"
                                value={authForm.email}
                                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                                className="w-full bg-[#0e0e12] border border-white/5 rounded-xl px-3 py-2 text-xs focus:border-[var(--champagne)] outline-none"
                                placeholder="juan@ejemplo.com"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Contraseña de Cuenta</label>
                              <div className="relative">
                                <input
                                  type={showPassword ? 'text' : 'password'}
                                  value={authForm.password}
                                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                                  className="w-full bg-[#0e0e12] border border-white/5 rounded-xl pl-3 pr-10 py-2 text-xs focus:border-[var(--champagne)] outline-none"
                                  placeholder="Mínimo 6 caracteres"
                                  minLength={6}
                                  required
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-pointer"
                                >
                                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                              </div>
                            </div>

                            <button
                              type="submit"
                              disabled={submitting}
                              className="btn-gold w-full py-3.5 mt-2 rounded-full font-bold uppercase tracking-wider text-xs shadow-md cursor-pointer"
                            >
                              {submitting ? 'Agendando...' : 'Crear Cuenta & Confirmar'}
                            </button>
                          </form>
                        ) : (
                          <form onSubmit={handleCheckout} className="space-y-4 text-left">
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Email o Teléfono</label>
                              <input
                                type="text"
                                value={loginForm.identifier}
                                onChange={(e) => setLoginForm({ ...loginForm, identifier: e.target.value })}
                                className="w-full bg-[#0e0e12] border border-white/5 rounded-xl px-3 py-2 text-xs focus:border-[var(--champagne)] outline-none"
                                placeholder="juan@ejemplo.com o 0412..."
                                required
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Contraseña</label>
                              <div className="relative">
                                <input
                                  type={showPassword ? 'text' : 'password'}
                                  value={loginForm.password}
                                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                  className="w-full bg-[#0e0e12] border border-white/5 rounded-xl pl-3 pr-10 py-2 text-xs focus:border-[var(--champagne)] outline-none"
                                  placeholder="Contraseña"
                                  required
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-pointer"
                                >
                                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                              </div>
                            </div>

                            <button
                              type="submit"
                              disabled={submitting}
                              className="btn-gold w-full py-3.5 mt-2 rounded-full font-bold uppercase tracking-wider text-xs shadow-md cursor-pointer"
                            >
                              {submitting ? 'Verificando...' : 'Iniciar Sesión & Confirmar'}
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>

            {/* Floating Booking choices summary */}
            {step < 6 && (selectedService || selectedBarber || selectedDate || selectedTime) && (
              <div className="w-full bg-black/45 backdrop-blur-md border border-white/5 rounded-2xl p-3 mb-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] text-center flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-wider text-white/60">
                {selectedService && (
                  <span className="flex items-center gap-1"><Scissors size={10} className="text-[var(--champagne)]" /> {selectedService.name}</span>
                )}
                {selectedBarber && (
                  <span className="flex items-center gap-1 border-l border-white/10 pl-3"><User size={10} className="text-[var(--champagne)]" /> {selectedBarber.name}</span>
                )}
                {selectedDate && (
                  <span className="flex items-center gap-1 border-l border-white/10 pl-3"><CalendarIcon size={10} className="text-[var(--champagne)]" /> {selectedDate.toLocaleDateString('es', { day: 'numeric', month: 'short' })}</span>
                )}
              </div>
            )}

            {/* Footer Navigation Buttons */}
            <div className="flex gap-4 mt-2">
              {step > 1 ? (
                <button
                  onClick={() => setStep(step - 1)}
                  className="flex-1 py-3.5 px-6 rounded-full border border-white/10 hover:border-white/20 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 bg-white/3 active:scale-95 transition-all text-white cursor-pointer"
                >
                  <ChevronLeft size={16} /> Atrás
                </button>
              ) : (
                <button
                  onClick={() => setShowWelcome(true)}
                  className="flex-1 py-3.5 px-6 rounded-full border border-white/10 hover:border-white/20 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 bg-white/3 active:scale-95 transition-all text-white cursor-pointer"
                >
                  <ChevronLeft size={16} /> Volver
                </button>
              )}
              {step < 6 ? (
                <button
                  onClick={() => canNext() && setStep(step + 1)}
                  disabled={!canNext()}
                  className={`flex-1 py-3.5 px-6 rounded-full font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                    canNext() 
                      ? 'btn-gold shadow-md cursor-pointer' 
                      : 'bg-white/5 border border-white/10 text-white/25 cursor-not-allowed'
                  }`}
                >
                  Siguiente <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={handleCheckout}
                  disabled={submitting}
                  className="btn-gold flex-1 py-3.5 px-6 rounded-full font-bold uppercase tracking-wider text-xs shadow-[var(--shadow-glow-gold)] cursor-pointer"
                >
                  {submitting ? 'Agendando...' : 'Confirmar Reserva'}
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
