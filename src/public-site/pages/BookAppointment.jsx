import { useState, useEffect, useMemo, useRef } from 'react';
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
  ChevronDown,
  PenTool,
  MessageCircle
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
  const [showWelcome, setShowWelcome] = useState(() => {
    const saved = localStorage.getItem('bookingState');
    return saved ? JSON.parse(saved).showWelcome : true;
  });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [hasVisited, setHasVisited] = useState(() => {
    const saved = localStorage.getItem('bookingState');
    return saved ? JSON.parse(saved).hasVisited : false;
  });
  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem('bookingState');
    return saved ? JSON.parse(saved).step : 1;
  });
  const [stepDirection, setStepDirection] = useState('enter');
  const [stepKey, setStepKey] = useState(0);
  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);
  
  // Selections
  const [selectedCategory, setSelectedCategory] = useState(() => {
    const saved = localStorage.getItem('bookingState');
    return saved ? JSON.parse(saved).selectedCategory : 'Barbería';
  });
  const [openCategory, setOpenCategory] = useState(null);
  const [selectedService, setSelectedService] = useState(() => {
    const saved = localStorage.getItem('bookingState');
    return saved ? JSON.parse(saved).selectedService : null;
  });
  const [selectedBarber, setSelectedBarber] = useState(() => {
    const saved = localStorage.getItem('bookingState');
    return saved ? JSON.parse(saved).selectedBarber : null;
  });
  const [expandedBarber, setExpandedBarber] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const saved = localStorage.getItem('bookingState');
    return saved && JSON.parse(saved).selectedDate ? new Date(JSON.parse(saved).selectedDate) : null;
  });
  const [selectedTime, setSelectedTime] = useState(() => {
    const saved = localStorage.getItem('bookingState');
    return saved ? JSON.parse(saved).selectedTime : null;
  });
  const [selectedBeverage, setSelectedBeverage] = useState('');
  const [allStaff, setAllStaff] = useState([]);
  const [tattooDescription, setTattooDescription] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('584129206984');
  
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

  const isTattooService = useMemo(() => {
    return (selectedService?.category || '').toLowerCase().includes('tatuaj');
  }, [selectedService]);

  const displayStaff = useMemo(() => {
    if (isTattooService) {
      return allStaff.filter(s => s.role?.includes('Tatuador'));
    }
    return barbers;
  }, [isTattooService, allStaff, barbers]);

  // Persist booking progress to localStorage
  useEffect(() => {
    if (success) {
      localStorage.removeItem('bookingState');
      return;
    }
    const state = {
      showWelcome,
      hasVisited,
      step,
      selectedCategory,
      selectedService,
      selectedBarber,
      selectedDate: selectedDate?.toISOString() || null,
      selectedTime
    };
    localStorage.setItem('bookingState', JSON.stringify(state));
  }, [showWelcome, hasVisited, step, selectedCategory, selectedService, selectedBarber, selectedDate, selectedTime, success]);

  // Ripple effect handler
  const createRipple = (e) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  };

  const handleStartBooking = () => {
    setIsTransitioning(true);
    setHasVisited(true);
    setTimeout(() => {
      setShowWelcome(false);
      setIsTransitioning(false);
    }, 750);
  };

  const handleReturnToWelcome = () => {
    setIsReturning(true);
    localStorage.removeItem('bookingState');
    setTimeout(() => {
      setShowWelcome(true);
      setIsReturning(false);
      setStep(1);
      setSelectedService(null);
      setSelectedBarber(null);
      setSelectedDate(null);
      setSelectedTime(null);
      setOpenCategory(null);
    }, 750);
  };

  // Step transition - instant (no animation)
  const prevStepRef = useRef(1);
  const nextBtnRef = useRef(null);
  useEffect(() => {
    if (step !== prevStepRef.current) {
      setExpandedBarber(null);
      prevStepRef.current = step;
    }
  }, [step]);

  // Lock body/html scroll on welcome screen to prevent any viewport bounce/scroll
  useEffect(() => {
    if (showWelcome || isTransitioning || isReturning) {
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
  }, [showWelcome, isTransitioning, isReturning]);

  // Restore draft booking (e.g. after Google OAuth redirect)
  useEffect(() => {
    const draft = localStorage.getItem('panda_draft_booking');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.service) {
          setSelectedService(parsed.service);
          const nameLower = parsed.service.name.toLowerCase();
          if (parsed.service.category === 'Barbería' || parsed.service.category === 'Servicios') setOpenCategory('Corte');
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
        const [servicesData, staffData, waNumber] = await Promise.all([
          publicService.getServices(),
          publicService.getStaff(),
          publicService.getWhatsAppNumber()
        ]);
        setServices(servicesData);
        setAllStaff(staffData);
        setBarbers(staffData.filter(s => s.role?.includes('Barbero') || s.role?.includes('Artista') || s.role?.includes('Tatuador')));
        setWhatsappNumber(waNumber);
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
      
      if (catKey === 'Corte') {
        return (c === 'Barbería' || c === 'Servicios' || isCombo);
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

  // Reset selected barber when tattoo status changes
  useEffect(() => {
    setSelectedBarber(null);
  }, [isTattooService]);

  const steps = useMemo(() => {
    const base = [
      { num: 1, label: 'Servicio' },
      { num: 2, label: isTattooService ? 'Tatuador' : 'Artista' },
    ];
    if (isTattooService) {
      base.push({ num: 3, label: 'Referencia' });
      base.push({ num: 4, label: 'Fecha' });
      base.push({ num: 5, label: 'Hora' });
      base.push({ num: 6, label: 'Cierre' });
    } else {
      base.push({ num: 3, label: 'Fecha' });
      base.push({ num: 4, label: 'Hora' });
      base.push({ num: 5, label: 'Bebida' });
      base.push({ num: 6, label: 'Cierre' });
    }
    return base;
  }, [isTattooService]);

  const totalSteps = steps.length;

  const canNext = () => {
    const currentLabel = steps.find(s => s.num === step)?.label;
    if (currentLabel === 'Servicio') return !!selectedService;
    if (currentLabel === 'Artista' || currentLabel === 'Tatuador') return !!selectedBarber;
    if (currentLabel === 'Referencia') return tattooDescription.trim().length > 0;
    if (currentLabel === 'Fecha') return !!selectedDate;
    if (currentLabel === 'Hora') return !!selectedTime;
    if (currentLabel === 'Bebida') return !!selectedBeverage;
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

    try {
      if (isTattooService) {
        const clientData = JSON.parse(localStorage.getItem('panda_public_client') || 'null');
        if (!clientData) {
          throw new Error('Debes iniciar sesión para solicitar una cotización.');
        }
        const dateStr = selectedDate?.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = formatTime12(selectedTime);

        let message = `Hola, quiero cotizar un tatuaje en Panda Barber Studio\n\n`;
        message += `*Cliente:* ${clientData.name || clientData.full_name || ''}\n`;
        message += `*Servicio:* ${selectedService?.name}\n`;
        message += `*Tatuador:* ${selectedBarber?.name}\n`;
        message += `*Fecha:* ${dateStr}\n`;
        message += `*Hora:* ${timeStr}\n`;
        message += `\n*Descripcion del tatuaje:*\n${tattooDescription}\n`;
        message += `\nAdjunto fotos de referencia.`;

        const encodedMsg = encodeURIComponent(message);
        const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${cleanNumber}?text=${encodedMsg}`, '_blank');
        setSuccess(true);
        return;
      }

      let activeClient = null;

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

  const renderWelcomeContent = (sliceClass = "", skipAnimations = false) => {
    const fade = (n) => skipAnimations ? '' : `fade-up-${n}`;
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
          <div className={`flex flex-col items-center relative z-20 ${fade(1)}`}>
            <img src={logo} alt="Panda Barber" className="w-24 h-24 object-contain filter brightness-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
          </div>

          {/* Hero Welcome content */}
          <div className="w-full max-w-sm space-y-4 relative z-10">
            <div className={fade(2)}>
              <span className="text-[12px] font-bold uppercase tracking-[0.3em] text-[#CBB79A] block mb-1">BIENVENIDO A</span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-wider text-white leading-none gold-glow-text title-sustained-glow whitespace-nowrap">PANDA BARBER</h1>
            </div>

            {/* Division Line with Scissors character */}
            <div className={`flex items-center justify-center gap-4 my-2 ${fade(3)}`}>
              <div className="h-[1px] w-16 bg-[#CBB79A]/40"></div>
              <Scissors size={14} className="text-[#CBB79A] gold-glow-scissors" />
              <div className="h-[1px] w-16 bg-[#CBB79A]/40"></div>
            </div>

            <p className={`text-white/70 text-sm leading-relaxed max-w-xs mx-auto font-medium font-outfit ${fade(3)}`}>
              Precisión en cada detalle. <br/> Distinción en cada estilo.
            </p>

            {/* Features highlight enclosed in a premium floating bar */}
            <div className={`w-full bg-black/45 backdrop-blur-md border border-white/5 rounded-2xl p-4.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${fade(4)} glass-features-bar`}>
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
          <div className={`w-full max-w-sm space-y-3.5 relative z-10 ${fade(5)}`}>
            <button 
              onClick={(e) => { createRipple(e); handleStartBooking(); }}
              className="w-full py-4.5 rounded-xl font-extrabold text-sm uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 btn-premium-shimmer haptic-bounce ripple-container"
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
        <div className={`aurora-container ${isTransitioning ? 'welcome-exit-aurora' : ''} ${isReturning ? 'welcome-return-aurora' : ''}`}>
          <div className="ambient-aurora-gold"></div>
          <div className="ambient-aurora-bronze"></div>
        </div>

         {/* ── WELCOME SCREEN ── */}
        {/* At rest: single unclipped fullscreen container (no diagonal line visible) */}
        {showWelcome && !isTransitioning && renderWelcomeContent("", hasVisited)}

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

        {/* On return: slices come back together */}
        {isReturning && (
          <div className="slice-container welcome-return">
            {renderWelcomeContent("slice-return-top-left", true)}
            {renderWelcomeContent("slice-return-bottom-right", true)}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-[40]">
              <line x1="100%" y1="0%" x2="0%" y2="100%" className="scissors-cut-line-return" />
            </svg>
            <div className="scissors-cutter-icon-return">
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
          <div className="w-full max-w-xl mx-auto px-4 pt-6 pb-24 flex flex-col flex-1 relative z-10">
            
            {/* Wizard Header: PASO X DE 6 with title/subtitle and back button */}
            <div className="mb-4 relative text-center">
              {/* Circular back button on the left */}
              <div className="absolute left-0 top-0">
                <button 
                  onClick={() => { step > 1 ? setStep(step - 1) : handleReturnToWelcome(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
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
              <div className="mt-2 space-y-1">
                <h1 className="text-2xl font-extrabold tracking-tight text-white leading-tight">
                  {step === 1 && "¿Qué servicio buscas hoy?"}
                  {step === 2 && <>Elige tu <span className="text-[var(--champagne)]">{isTattooService ? 'Tatuador' : 'Artista'}</span></>}
                  {step === 3 && isTattooService && <>Cuéntanos tu <span className="text-[var(--champagne)]">Idea</span></>}
                  {step === 3 && !isTattooService && <>Selecciona la <span className="text-[var(--champagne)]">Fecha</span></>}
                  {step === 4 && isTattooService && <>Selecciona la <span className="text-[var(--champagne)]">Fecha</span></>}
                  {step === 4 && !isTattooService && <>Elige la <span className="text-[var(--champagne)]">Hora</span></>}
                  {step === 5 && isTattooService && <>Elige la <span className="text-[var(--champagne)]">Hora</span></>}
                  {step === 5 && !isTattooService && <>Protocolo de <span className="text-[var(--champagne)]">Conserjería</span></>}
                  {step === 6 && <>Completa tu <span className="text-[var(--champagne)]">Reserva</span></>}
                </h1>
                <p className="text-[var(--text-secondary)] text-[11px] font-medium max-w-sm mx-auto">
                  {step === 1 && "Elige el servicio que mejor se adapte a tu estilo."}
                  {step === 2 && (isTattooService ? "Selecciona el artista que realizará tu tatuaje." : "Cada barbero tiene su especialidad. Escoge el que mejor va contigo.")}
                  {step === 3 && isTattooService && "Describe el tatuaje que deseas para que puedan cotizarlo con precisión."}
                  {step === 3 && !isTattooService && "Elige el día que mejor se adapte a tu agenda."}
                  {step === 4 && isTattooService && "Elige el día que mejor se adapte a tu agenda."}
                  {step === 4 && !isTattooService && "Elige el bloque horario disponible."}
                  {step === 5 && isTattooService && "Elige el bloque horario disponible."}
                  {step === 5 && !isTattooService && "Ameniza tu espera con una de nuestras bebidas de cortesía."}
                  {step === 6 && "Ingresa tus datos para asegurar tu cita en 1 clic."}
                </p>
              </div>
            </div>

            {/* Content - No wrapper card */}
            <div className="flex flex-col flex-1 relative z-10">
              <div key={step} className="transition-step-container w-full h-full flex flex-col justify-between flex-1 wizard-content-enter">
                {(() => {
                  const currentLabel = steps.find(s => s.num === step)?.label;
                  return (
                <>
                
                {/* STEP 1: Categories & Services (Accordion) */}
                {currentLabel === 'Servicio' && (
                  <div className="space-y-3 w-full">
                    {[
                      { key: 'Corte', label: 'Corte', sub: 'Renueva tu estilo', icon: <Scissors size={22} strokeWidth={1.5} />, img: '/services/corte.png' },
                      { key: 'Barba', label: 'Barba', sub: 'Perfilado y define', icon: <User size={22} strokeWidth={1.5} />, img: '/services/barba.png' },
                      { key: 'Tatuajes', label: 'Tatuaje', sub: 'Arte que se queda', icon: <PenTool size={22} strokeWidth={1.5} />, img: '/services/tatuaje.png' },
                    ].map((cat, catIndex) => {
                      const isOpen = openCategory === cat.key;
                      const catServices = getServicesForCategory(cat.key);
                      return (
                        <div 
                          key={cat.key} 
                          className={`rounded-2xl border overflow-hidden transition-all duration-300 accordion-category-card stagger-enter stagger-${catIndex + 1} ${
                            isOpen ? 'is-open' : ''
                          }`}
                        >
                          {/* Header card — click to toggle */}
                          <button 
                            onClick={() => setOpenCategory(isOpen ? null : cat.key)}
                            className="accordion-category-header"
                            type="button"
                          >
                            <div className="category-image-wrapper">
                              <img src={cat.img} alt={cat.label} />
                            </div>
                            <div className="accordion-category-header-content">
                              <div className="category-icon-wrapper">
                                {cat.icon}
                              </div>
                              <div className="category-title-wrapper">
                                <span className="category-title">{cat.label}</span>
                                <span className="category-subtitle">{cat.sub}</span>
                                <div className="category-underline"></div>
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
                                        setTimeout(() => {
                                          nextBtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }, 100);
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

                {/* STEP 2: Barbers */}
                {(currentLabel === 'Artista' || currentLabel === 'Tatuador') && (
                  <div className="w-full">
                    {expandedBarber ? (
                      <div className="expanded-card-reveal">
                        {(() => {
                          const bIdx = barbers.findIndex(b => b.id === expandedBarber.id);
                          const barberPhotos = ['/barbers/barber1.jpg', '/barbers/barber2.jpg', '/barbers/barber3.jpg', '/barbers/barber4.jpg', '/barbers/barber5.jpg'];
                          const photo = expandedBarber.image_url || barberPhotos[bIdx % barberPhotos.length];
                          const specialties = ['Especialista en Fade', 'Especialista en Barba', 'Especialista en Diseños', 'Master Barber', 'Especialista en Fade'];
                          const specialty = specialties[bIdx % specialties.length];
                          const badges = ['TOP FADE ARTIST', 'EXPERTO EN BARBA', 'DISEÑADOR CREATIVO', 'MASTER BARBER', 'FADE SPECIALIST'];
                          const badge = badges[bIdx % badges.length];
                          const ratings = ['4.9', '4.8', '4.9', '4.7', '4.8'];
                          const rating = ratings[bIdx % ratings.length];
                          const reviewsList = [324, 210, 189, 98, 142];
                          const reviews = reviewsList[bIdx % reviewsList.length];
                          return (
                            <>
                              {/* Hero photo */}
                              <div className="relative h-56 -mx-4 -mt-4 mb-4 overflow-hidden">
                                {photo && <img src={photo} alt={expandedBarber.name} className="w-full h-full object-cover" />}
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0e] via-[#0a0a0e]/30 to-transparent"></div>
                                <button onClick={() => setExpandedBarber(null)} className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center z-10">
                                  <ChevronLeft size={18} className="text-white" />
                                </button>
                                <div className="absolute top-3 right-3 flex gap-2 z-10">
                                  <button className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                                  </button>
                                  <button className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                                  </button>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                                  <span className="inline-block px-3 py-1 rounded-lg bg-white/10 backdrop-blur-sm text-[9px] font-black text-white uppercase tracking-wider mb-2">{badge}</span>
                                  <h3 className="font-black text-3xl text-white leading-none">{expandedBarber.name}</h3>
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <Star size={14} className="text-amber-400 fill-amber-400" />
                                    <span className="text-sm font-bold text-white">{rating}</span>
                                    <span className="text-xs text-white/40">({reviews} reseñas)</span>
                                  </div>
                                </div>
                              </div>

                              {/* Stats row */}
                              <div className="flex justify-between py-3 border-y border-white/5 mb-4">
                                {[
                                  { icon: <Scissors size={16} />, value: '324', label: 'Servicios' },
                                  { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>, value: '98%', label: 'Clientes felices' },
                                  { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, value: '5 años', label: 'Experiencia' },
                                  { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>, value: 'Panda', label: 'Sede Principal' }
                                ].map((s, i) => (
                                  <div key={i} className="flex flex-col items-center gap-1 flex-1">
                                    <span className="text-[var(--champagne)]">{s.icon}</span>
                                    <span className="text-xs font-bold text-white">{s.value}</span>
                                    <span className="text-[8px] text-white/35 font-medium">{s.label}</span>
                                  </div>
                                ))}
                              </div>

                              {/* About */}
                              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 mb-4">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-bold text-sm text-white">Sobre {expandedBarber.name}</h4>
                                  <button className="text-[var(--champagne)] text-[11px] font-bold flex items-center gap-1">Más información <ChevronRight size={12} /></button>
                                </div>
                                <p className="text-[11px] text-white/40 leading-relaxed">Especialista en fades y cortes modernos. Me enfoco en resaltar tu estilo y personalidad con cada detalle.</p>
                              </div>

                              {/* Recent works */}
                              <div className="mb-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-bold text-sm text-white">Trabajos recientes</h4>
                                  <button className="text-[var(--champagne)] text-[11px] font-bold">Ver todos</button>
                                </div>
                                <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                                  {[1,2,3,4].map(i => (
                                    <div key={i} className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-white/5">
                                      {photo && <img src={photo} alt="" className="w-full h-full object-cover" />}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Services */}
                              <div className="mb-4">
                                <h4 className="font-bold text-sm text-white mb-3">Servicios</h4>
                                <div className="grid grid-cols-2 gap-2">
                                  {[
                                    { icon: <Scissors size={16} />, name: 'Corte', price: '$25' },
                                    { icon: <Scissors size={16} />, name: 'Corte + Barba', price: '$35' },
                                    { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5.5 8.5L9 12l-3.5 3.5L2 12l3.5-3.5zM18.5 8.5L15 12l3.5 3.5L22 12l-3.5-3.5z"/></svg>, name: 'Barba', price: '$15' },
                                    { icon: <Star size={16} />, name: 'Diseños', price: '$10' },
                                    { icon: <Award size={16} />, name: 'Premium', price: '$50' }
                                  ].map((s, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                                      <span className="text-[var(--champagne)]">{s.icon}</span>
                                      <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-white/60">{s.name}</span>
                                        <span className="text-[11px] font-extrabold text-[var(--champagne)]">{s.price}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* CTA */}
                              <button
                                onClick={() => { setSelectedBarber(expandedBarber); setStep(step + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                className="w-full py-3.5 bg-gradient-to-b from-[#d2c1aa] to-[#bba789] text-black font-extrabold text-xs uppercase tracking-widest flex items-center justify-center gap-2 haptic-bounce ripple-container"
                              >
                                Seleccionar {expandedBarber.name} <ChevronRight size={14} />
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      /* GRID CARDS */
                      <div className="grid grid-cols-2 gap-3">
                        {barbers.map((barber, bIdx) => {
                          const specialties = ['Especialista en Fade', 'Especialista en Barba', 'Especialista en Diseños', 'Master Barber', 'Especialista en Fade'];
                          const specialty = specialties[bIdx % specialties.length];
                          const badgeLabels = ['TOP FADE', 'EXPERTO BARBA', 'DISEÑOS', 'PREMIUM', 'FADE PRO'];
                          const badge = badgeLabels[bIdx % badgeLabels.length];
                          const badgeColors = ['from-amber-500/80 to-orange-600/80', 'from-purple-500/80 to-purple-700/80', 'from-blue-500/80 to-blue-700/80', 'from-amber-400/80 to-yellow-600/80', 'from-emerald-500/80 to-emerald-700/80'];
                          const badgeColor = badgeColors[bIdx % badgeColors.length];
                          const ratings = ['4.9', '4.8', '4.9', '4.7', '4.8'];
                          const rating = ratings[bIdx % ratings.length];
                          const reviewsList = [324, 210, 189, 98, 142];
                          const reviews = reviewsList[bIdx % reviewsList.length];
                          const available = bIdx % 4 !== 2;
                          const availTexts = ['Disponible hoy', 'Disponible hoy', 'Disponible mañana', 'Disponible hoy', 'Disponible el sábado'];
                          const availText = availTexts[bIdx % availTexts.length];
                          const barberPhotos = ['/barbers/barber1.jpg', '/barbers/barber2.jpg', '/barbers/barber3.jpg', '/barbers/barber4.jpg', '/barbers/barber5.jpg'];
                          const photo = barber.image_url || barberPhotos[bIdx % barberPhotos.length];
                          return (
                            <button
                              key={barber.id}
                              onClick={() => setExpandedBarber(barber)}
                              className="relative rounded-2xl border border-white/8 overflow-hidden transition-all duration-300 cursor-pointer text-left bg-[#131316] hover:border-white/15 active:scale-[0.98] collapsed-card-reveal flex flex-col"
                            >
                              <div className="relative h-44 overflow-hidden">
                                {photo && <img src={photo} alt={barber.name} className="w-full h-full object-cover" />}
                                <div className="absolute inset-0 bg-gradient-to-t from-[#131316] via-transparent to-transparent"></div>
                                <div className={`absolute top-2 left-2 px-2 py-1 rounded-lg bg-gradient-to-br ${badgeColor} backdrop-blur-sm flex items-center gap-1`}>
                                  <span className="text-[8px] font-black text-white uppercase tracking-wider">{badge}</span>
                                </div>
                                <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                                </div>
                              </div>
                              <div className="p-3 flex flex-col gap-1.5">
                                <h4 className="font-extrabold text-sm text-white leading-tight">{barber.name}</h4>
                                <p className="text-white/40 text-[10px] font-medium">{specialty}</p>
                                <div className="flex items-center gap-1">
                                  <Star size={10} className="text-amber-400 fill-amber-400" />
                                  <span className="text-[11px] font-bold text-white">{rating}</span>
                                  <span className="text-[9px] text-white/30">({reviews})</span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className={`w-1.5 h-1.5 rounded-full availability-pulse ${available ? '' : 'amber'}`}></span>
                                  <span className={`text-[9px] font-bold ${available ? 'text-emerald-400' : 'text-amber-400'}`}>{availText}</span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* STEP: Tattoo Reference */}
                {currentLabel === 'Referencia' && (
                  <div className="space-y-6 w-full">
                    <div className="space-y-4">
                      <label className="block text-xs font-bold uppercase tracking-widest text-[var(--gold-primary)]">Descripcion del tatuaje *</label>
                      <textarea
                        className="form-input w-full"
                        rows={4}
                        placeholder="Ej: Quiero un leon realista en el brazo derecho, de tamano mediano, con detalle en la melena..."
                        value={tattooDescription}
                        onChange={(e) => setTattooDescription(e.target.value)}
                        style={{ resize: 'vertical', fontSize: 14, lineHeight: 1.5 }}
                      />
                    </div>
                    <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(212, 175, 55, 0.06)', border: '1px solid rgba(212, 175, 55, 0.15)' }}>
                      <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                        <strong style={{ color: 'var(--gold-primary)' }}>Fotos de referencia:</strong> Al dirigirte a WhatsApp podras adjuntar directamente las imagenes de la inspiracion de tu tatuaje.
                      </p>
                    </div>
                  </div>
                )}

                {/* STEP 3/4: Dates */}
                {currentLabel === 'Fecha' && (
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

                {/* STEP: Time Slots */}
                {currentLabel === 'Hora' && (
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

                {/* STEP: Beverage Concierge */}
                {currentLabel === 'Bebida' && (
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

                {/* STEP: Confirmation & Cierre Mágico (Registration) */}
                {currentLabel === 'Cierre' && (
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
                </>
                );
                })()}

              </div>
            </div>

            {/* Footer Navigation Buttons */}
            <div className="mt-4 pb-2">
              {step < totalSteps ? (
                <button
                  ref={nextBtnRef}
                  onClick={(e) => { createRipple(e); if (canNext()) { setStep(step + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); } }}
                  disabled={!canNext()}
                  className={`w-full py-4 px-6 rounded-full font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all haptic-bounce ripple-container ${
                    canNext() 
                      ? 'btn-gold shadow-md cursor-pointer' 
                      : 'bg-white/5 border border-white/10 text-white/25 cursor-not-allowed'
                  }`}
                >
                  Siguiente <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  onClick={(e) => { createRipple(e); handleCheckout(); }}
                  disabled={submitting}
                  className="btn-gold w-full py-4 px-6 rounded-full font-bold uppercase tracking-wider text-sm shadow-[var(--shadow-glow-gold)] cursor-pointer haptic-bounce ripple-container"
                >
                  {isTattooService ? 'Enviar por WhatsApp' : (submitting ? 'Agendando...' : 'Confirmar Reserva')}
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
