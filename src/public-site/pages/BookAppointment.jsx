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
  Crown,
  ChevronDown,
  ArrowRight,
  PenTool,
  MessageSquare,
  Sunrise,
  Sun,
  Moon,
  Beer,
  GlassWater
} from 'lucide-react';
import { publicService } from '../services/publicService';
import PandaLoader from '../../components/PandaLoader';
import PandaDatePicker from '../../components/PandaDatePicker';

// Import background images and logo
import bgDesktop from '../../assets/barbershop_desktop.png';
import bgMobile from '../../assets/barbershop_mobile.png';
import logo from '../../assets/logo.png';
import pandaImg from '../../assets/panda_logo_nobg.png';
import heroWebp from '../../assets/hero_video.webp';
import heroVideo from '../../assets/hero_video.mp4';
import bearBody from '../../assets/oso_saludando.png';
import bearHand from '../../assets/mano_oso_saludando.png';

// Reusable AnimatedSection component to perform fade-up on scroll reveal
function AnimatedSection({ children, className = "", delay = 0, from = "bottom" }) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.08 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => { if (ref.current) observer.unobserve(ref.current); };
  }, []);

  const hiddenTransform = from === "left" ? "translateX(-32px)" : from === "right" ? "translateX(32px)" : "translateY(30px)";

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transition: `opacity 650ms cubic-bezier(0.25,1,0.5,1) ${delay}ms, transform 650ms cubic-bezier(0.25,1,0.5,1) ${delay}ms`,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'none' : hiddenTransform,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}

// Helper to render beverage icons uniformly without using raw system emojis
const renderBeverageIcon = (beverageName, size = 16, className = "text-[var(--champagne)]") => {
  if (!beverageName) return null;
  const name = beverageName.toLowerCase();
  if (name.includes('café') || name.includes('cafe')) return <Coffee size={size} className={className} />;
  if (name.includes('cerveza')) return <Beer size={size} className={className} />;
  if (name.includes('whiskey')) return <GlassWater size={size} className={className} />;
  return <GlassWater size={size} className={className} />;
};

// Minimal beard glyph used in the popular-services grid (lucide has no beard icon)
const BeardIcon = ({ size = 26, className = "landing-service-icon" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 5c0 0-.6 7 1.2 10.5C8.7 18.4 10.2 20 12 20s3.3-1.6 4.8-4.5C18.6 12 18 5 18 5" />
    <path d="M8.5 5.5c0 1.8 1.4 3 3.5 3s3.5-1.2 3.5-3" />
  </svg>
);

// Pick an icon for a service based on its name/category to match the popular-services design
const getServiceIcon = (service) => {
  const n = (service?.name || '').toLowerCase();
  const c = (service?.category || '').toLowerCase();
  if (n.includes('premium') || c.includes('premium')) return <Crown size={26} className="landing-service-icon" />;
  const hasCorte = n.includes('corte');
  const hasBarba = n.includes('barba');
  if (hasCorte && hasBarba) {
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Scissors size={20} className="landing-service-icon" />
        <BeardIcon size={20} />
      </span>
    );
  }
  if (hasBarba) return <BeardIcon size={26} />;
  if (n.includes('tatu')) return <PenTool size={26} className="landing-service-icon" />;
  return <Scissors size={26} className="landing-service-icon" />;
};

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

// Custom Barber Avatar component that falls back gracefully if image is missing or fails to load
function BarberAvatar({ url, name, className = "w-10 h-10 rounded-xl", iconSize = 16 }) {
  const [error, setError] = useState(!url);

  useEffect(() => {
    setError(!url);
  }, [url]);

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-white/5 border border-white/10 flex-shrink-0`}>
        <User size={iconSize} className="text-[#CBB79A]" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={name}
      onError={() => setError(true)}
      className={`${className} object-cover object-top border border-white/10 flex-shrink-0`}
    />
  );
}

export default function BookAppointment() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [showWelcome, setShowWelcome] = useState(() => {
    const saved = localStorage.getItem('bookingState');
    return saved ? JSON.parse(saved).showWelcome : true;
  });
  const [videoBlocked, setVideoBlocked] = useState(false);

  // Force video playback to bypass some mobile browser restrictions
  useEffect(() => {
    if (videoRef.current && showWelcome) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      videoRef.current.play().catch(e => {
        console.log('Autoplay blocked by browser:', e);
        // The poster attribute automatically handles the animated WebP fallback
      });
    }
  }, [showWelcome]);

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
  const scrollContainerRef = useRef(null);
  
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
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
  const [showInlineEdit, setShowInlineEdit] = useState(false);
  const [isInlineEditOpen, setIsInlineEditOpen] = useState(false);
  const [inlineEditTab, setInlineEditTab] = useState('barber');
  
  const handleOpenInlineEdit = () => {
    setShowInlineEdit(true);
    setTimeout(() => {
      setIsInlineEditOpen(true);
    }, 20);
  };

  const handleCloseInlineEdit = () => {
    setIsInlineEditOpen(false);
    setTimeout(() => {
      setShowInlineEdit(false);
    }, 300);
  };
  const [expandedBarber, setExpandedBarber] = useState(null);
  const [expandedBarberPortfolio, setExpandedBarberPortfolio] = useState([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [activeLightboxImage, setActiveLightboxImage] = useState(null);
  const [toast, setToast] = useState(null);
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('favorite_barbers') || '[]');
    } catch {
      return [];
    }
  });
  const [barberOfMonth, setBarberOfMonth] = useState(null);
  const [topClients, setTopClients] = useState([]);
  const [reviews, setReviews] = useState([]);
  // One-time migration: the hero was recomposed (text left / bear right), so the
  // old bear & hand fine-tuning offsets no longer apply. Clear them once so the
  // new reference-matched defaults take effect. Video & gradient tuning is kept.
  if (typeof window !== 'undefined' && localStorage.getItem('hero_cfg_v') !== '10') {
    ['bear_scale', 'bear_x', 'bear_y', 'bear_rotate', 'hand_x', 'hand_y', 'hand_scale', 'hand_rotate', 'hero_height', 'hero_y_offset', 'hero_zoom', 'hero_gradient_stop'].forEach(k => localStorage.removeItem(k));
    localStorage.setItem('hero_cfg_v', '10');
  }

  const [heroHeight, setHeroHeight] = useState(() => Number(localStorage.getItem('hero_height') || 102));
  const [videoYOffset, setVideoYOffset] = useState(() => Number(localStorage.getItem('hero_y_offset') || 0));
  const [videoZoom, setVideoZoom] = useState(() => Number(localStorage.getItem('hero_zoom') || 1.02));
  const [gradientStop, setGradientStop] = useState(() => Number(localStorage.getItem('hero_gradient_stop') || 51));
  
  // Separate controls for the fallback photo (battery saving mode)
  const [posterHeight, setPosterHeight] = useState(() => Number(localStorage.getItem('poster_height') || 82));
  const [posterXOffset, setPosterXOffset] = useState(() => Number(localStorage.getItem('poster_x_offset') || 50));
  const [posterYOffset, setPosterYOffset] = useState(() => Number(localStorage.getItem('poster_y_offset') || 100));
  const [posterZoom, setPosterZoom] = useState(() => Number(localStorage.getItem('poster_zoom') || 1.03));
  const [showConfigurator, setShowConfigurator] = useState(false);
  const [configTab, setConfigTab] = useState('video'); // 'video' or 'bear'
  const [dBearCfg, setDBearCfg] = useState(() => ({
    scale: Number(localStorage.getItem('d_bear_scale') || 0.6),
    x: Number(localStorage.getItem('d_bear_x') || 10),
    y: Number(localStorage.getItem('d_bear_y') || -5),
    rotate: Number(localStorage.getItem('d_bear_rotate') || -7),
    handScale: Number(localStorage.getItem('d_hand_scale') || 0.3),
    handX: Number(localStorage.getItem('d_hand_x') || 30),
    handY: Number(localStorage.getItem('d_hand_y') || 20),
    handRotate: Number(localStorage.getItem('d_hand_rotate') || 21),
  }));

  const [mBearCfg, setMBearCfg] = useState(() => ({
    scale: Number(localStorage.getItem('bear_scale') || 1.1),
    x: Number(localStorage.getItem('bear_x') || -30),
    y: Number(localStorage.getItem('bear_y') || -2.5),
    rotate: Number(localStorage.getItem('bear_rotate') || -9),
    handScale: Number(localStorage.getItem('hand_scale') || 0.43),
    handX: Number(localStorage.getItem('hand_x') || 20),
    handY: Number(localStorage.getItem('hand_y') || 59),
    handRotate: Number(localStorage.getItem('hand_rotate') || 35),
  }));

  const activeBearCfg = isDesktop ? dBearCfg : mBearCfg;
  const updateBearCfg = (key, val, storageKey) => {
    if (isDesktop) {
      setDBearCfg(prev => ({ ...prev, [key]: val }));
      localStorage.setItem('d_' + storageKey, val);
    } else {
      setMBearCfg(prev => ({ ...prev, [key]: val }));
      localStorage.setItem(storageKey, val);
    }
  };



  const triggerToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast(null);
    }, 2500);
  };

  const handleShare = async (barber) => {
    if (!barber) return;
    const shareData = {
      title: `Panda Barber - ${barber.name}`,
      text: `¡Mira el perfil de ${barber.name} en Panda Barber y reserva tu cita!`,
      url: window.location.href
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        triggerToast('success', 'Enlace copiado al portapapeles');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleFavorite = (barberId) => {
    let updated;
    const isFav = favorites.includes(barberId);
    if (isFav) {
      updated = favorites.filter(id => id !== barberId);
      triggerToast('unfavorite', 'Removido de favoritos');
    } else {
      updated = [...favorites, barberId];
      triggerToast('favorite', 'Agregado a favoritos');
    }
    setFavorites(updated);
    localStorage.setItem('favorite_barbers', JSON.stringify(updated));
  };
  const [selectedDate, setSelectedDate] = useState(() => {
    const saved = localStorage.getItem('bookingState');
    return saved && JSON.parse(saved).selectedDate ? new Date(JSON.parse(saved).selectedDate) : null;
  });
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(() => {
    const saved = localStorage.getItem('bookingState');
    if (saved && JSON.parse(saved).selectedDate) {
      return new Date(JSON.parse(saved).selectedDate);
    }
    return new Date();
  });
  const [selectedTime, setSelectedTime] = useState(() => {
    const saved = localStorage.getItem('bookingState');
    return saved ? JSON.parse(saved).selectedTime : null;
  });
  const [selectedBeverage, setSelectedBeverage] = useState('');
  const [notes, setNotes] = useState('');
  const [imgErrors, setImgErrors] = useState({});
  
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
      selectedTime,
      selectedBeverage,
      notes
    };
    localStorage.setItem('bookingState', JSON.stringify(state));
  }, [showWelcome, hasVisited, step, selectedCategory, selectedService, selectedBarber, selectedDate, selectedTime, selectedBeverage, notes, success]);

  // Scroll to top on step changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo(0, 0);
      scrollContainerRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
    
    const timer = setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo(0, 0);
        scrollContainerRef.current.scrollTop = 0;
      }
      window.scrollTo(0, 0);
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }, 60);
    return () => clearTimeout(timer);
  }, [step]);

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
  const scrollToNextButton = () => {
    setTimeout(() => {
      nextBtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };
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

  // Check if client is logged in
  useEffect(() => {
    const clientData = localStorage.getItem('panda_public_client');
    if (clientData) {
      setIsLoggedIn(true);
    }
  }, []);

  // Fetch services and staff
  useEffect(() => {
    const loadData = async () => {
      try {
        const [servicesData, staffData, topClientsData, topBarberData, reviewsData] = await Promise.all([
          publicService.getServices(),
          publicService.getStaff(),
          publicService.getTopClientsOfMonth().catch(() => []),
          publicService.getBarberOfMonth().catch(() => null),
          publicService.getStaffReviews().catch(() => [])
        ]);
        setServices(servicesData);
        const filteredBarbers = staffData.filter(s => s.role?.includes('Barbero') || s.role?.includes('Artista') || s.role?.includes('Tatuador'));
        setBarbers(filteredBarbers);
        setTopClients(topClientsData || []);
        setBarberOfMonth(topBarberData);
        setReviews(reviewsData || []);


        // Restore draft booking (e.g. after Google OAuth redirect)
        const draft = localStorage.getItem('panda_draft_booking');
        if (draft) {
          try {
            const parsed = JSON.parse(draft);
            if (parsed.serviceId) {
              const matchedService = servicesData.find(s => s.id === parsed.serviceId);
              if (matchedService) {
                setSelectedService(matchedService);
                const nameLower = matchedService.name.toLowerCase();
                if (matchedService.category === 'Barbería' || matchedService.category === 'Servicios') setOpenCategory('Corte');
                else if (matchedService.category === 'Tratamientos' || nameLower.includes('barba')) setOpenCategory('Barba');
                else if (matchedService.category === 'Tatuajes') setOpenCategory('Tatuajes');
              }
            }
            if (parsed.barberId) {
              const matchedBarber = filteredBarbers.find(b => b.id === parsed.barberId);
              if (matchedBarber) setSelectedBarber(matchedBarber);
            }
            if (parsed.date) setSelectedDate(new Date(parsed.date));
            if (parsed.time) setSelectedTime(parsed.time);
            if (parsed.beverage) setSelectedBeverage(parsed.beverage);
            if (parsed.notes) setNotes(parsed.notes);
            if (parsed.category) setSelectedCategory(parsed.category);
            if (parsed.step) {
              setStep(parsed.step === 6 ? 5 : parsed.step);
              setShowWelcome(false);
            }
            localStorage.removeItem('panda_draft_booking');
          } catch (e) {
            console.error('Error restoring draft booking:', e);
          }
        }
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

  const calendarDays = useMemo(() => {
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();
    
    // First day of current calendar month
    const firstDay = new Date(year, month, 1);
    // Last day of current calendar month
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();
    
    // Weekday of 1st day (Spanish: Mon=0, Tue=1, ..., Sun=6)
    const startDayIndex = (firstDay.getDay() + 6) % 7;
    
    const days = [];
    
    // Trailing days from previous month
    const prevMonthLastDay = new Date(year, month, 0);
    const prevMonthTotalDays = prevMonthLastDay.getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const d = prevMonthTotalDays - i;
      const dateVal = new Date(year, month - 1, d);
      days.push({
        dayNumber: d,
        date: dateVal,
        isCurrentMonth: false,
        isSelectable: false,
        isToday: false,
        isSelected: false
      });
    }
    
    // Days of current month
    const today = new Date();
    today.setHours(0,0,0,0);
    
    for (let d = 1; d <= totalDays; d++) {
      const dateVal = new Date(year, month, d);
      const dateValCompare = new Date(year, month, d);
      dateValCompare.setHours(0,0,0,0);
      
      const isSelectable = dateValCompare >= today;
      const isToday = dateValCompare.getTime() === today.getTime();
      const isSelected = selectedDate && selectedDate.toDateString() === dateVal.toDateString();
      
      days.push({
        dayNumber: d,
        date: dateVal,
        isCurrentMonth: true,
        isSelectable,
        isToday,
        isSelected
      });
    }
    
    // Padding days from next month to complete the week
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const dateVal = new Date(year, month + 1, d);
      days.push({
        dayNumber: d,
        date: dateVal,
        isCurrentMonth: false,
        isSelectable: false,
        isToday: false,
        isSelected: false
      });
    }
    
    return days;
  }, [currentCalendarMonth, selectedDate]);

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

  const steps = [
    { num: 1, label: 'Servicio' },
    { num: 2, label: 'Artista' },
    { num: 3, label: 'Fecha y Hora' },
    { num: 4, label: 'Bebida' },
    { num: 5, label: 'Cierre' },
  ];

  const canNext = () => {
    if (step === 1) return selectedService;
    if (step === 2) return selectedBarber;
    if (step === 3) return selectedDate && selectedTime;
    if (step === 4) return selectedBeverage;
    return false;
  };

  // Save current progress & trigger Google Login redirect
  const handleGoogleLogin = () => {
    localStorage.setItem('panda_draft_booking', JSON.stringify({
      serviceId: selectedService?.id,
      barberId: selectedBarber?.id,
      date: selectedDate ? selectedDate.toISOString() : null,
      time: selectedTime,
      beverage: selectedBeverage,
      notes: notes,
      category: selectedCategory,
      step: 5
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
          await publicService.loginClient({
            identifier: loginForm.identifier,
            password: loginForm.password
          });
          
          let client = null;
          const id = loginForm.identifier.trim();

          if (id.includes('@')) {
            // Try real email first, then pandabarber.app email
            client = await publicService.getClientByEmail(id);
          } else {
            // It's a phone number — try by phone
            client = await publicService.getClientByPhone(id);
            // If not found by phone, try with fake email format
            if (!client) {
              client = await publicService.getClientByEmail(`${id}@pandabarber.app`);
            }
          }
          
          if (!client) {
            throw new Error('Tu cuenta fue creada pero el perfil no se encontró. Contacta al negocio.');
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
        beverage_selection: selectedBeverage,
        notes: notes
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
    const isResting = sliceClass === "";

    const heroContent = (
      <div className={`w-full min-h-[66vh] lg:min-h-[65vh] flex flex-col justify-between items-stretch text-left px-6 lg:px-12 pt-8 pb-8 relative lg:overflow-visible overflow-hidden box-border gap-5 transition-all duration-500`}>
        
        {/* Highly Optimized Video (Hardware Accelerated + Native Animated Fallback via Poster) */}
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          webkit-playsinline="true"
          preload="none"
          poster={heroWebp}
          className="absolute top-0 left-0 w-full object-cover pointer-events-none z-1 animate-video-fade-in"
          style={{
            height: '100%',
            objectPosition: `center ${videoYOffset}%`,
            transform: `scale(${videoZoom})`,
            willChange: 'transform',
            filter: 'brightness(0.55) contrast(1.05)',
            maskImage: `linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.95) ${gradientStop - 20}%, rgba(0, 0, 0, 0) ${gradientStop}%)`,
            WebkitMaskImage: `linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.95) ${gradientStop - 20}%, rgba(0, 0, 0, 0) ${gradientStop}%)`,
          }}
        >
          <source src={heroVideo} type="video/mp4" />
        </video>

        {/* Subtle gradient overlay to ensure text contrast as requested */}
        <div className="absolute inset-0 z-2 pointer-events-none bg-gradient-to-b from-black/20 via-transparent to-black/60"></div>



        {/* ── Spotlight behind bear ── */}
        <div className={`absolute inset-0 pointer-events-none z-1 ${!isResting ? 'opacity-0' : ''}`} style={{
          background: `radial-gradient(ellipse 55% 60% at ${100 - activeBearCfg.x}% ${100 - activeBearCfg.y - 20}%, rgba(203,183,154,0.09) 0%, transparent 70%)`,
        }} />

        {/* ── 3D PANDA BEAR & WAVING HAND LAYERING (Background Layer z-5) ── */}
        {!isDesktop ? (
          // GROUPED MOBILE RENDER (Responsive & Locked)
          <div className={`absolute pointer-events-none z-5 flex items-end justify-end overflow-visible ${!isResting ? 'opacity-0' : ''}`}
            style={{
              width: `${80 * activeBearCfg.scale}%`,
              maxWidth: `${600 * activeBearCfg.scale}px`,
              bottom: `${activeBearCfg.y}%`,
              right: `${activeBearCfg.x}%`,
              transform: `rotate(${activeBearCfg.rotate}deg)`,
              transformOrigin: 'center bottom',
            }}
          >
            <div className="relative w-full">
              {/* Bear Body */}
              <img
                src={bearBody}
                alt="Panda Barber 3D"
                className="w-full h-auto object-contain block"
                style={{
                  filter: 'drop-shadow(-6px 12px 18px rgba(0,0,0,0.65)) drop-shadow(0px 4px 8px rgba(0,0,0,0.4))',
                }}
              />
              
              {/* Bear Waving Hand Wrapper grouped relative to Bear Body */}
              <div
                className="absolute flex items-center justify-center"
                style={{
                  width: `${(35 * activeBearCfg.handScale) / (80 * activeBearCfg.scale) * 100}%`,
                  bottom: `${activeBearCfg.handY}%`,
                  right: `${activeBearCfg.handX}%`,
                  transform: `rotate(${activeBearCfg.handRotate}deg)`,
                  transformOrigin: '70% 85%',
                }}
              >
                <img
                  src={bearHand}
                  alt="Waving Hand"
                  className="w-full h-auto object-contain origin-[70%_85%] animate-hand-wave"
                  style={{ filter: 'drop-shadow(-4px 8px 12px rgba(0,0,0,0.5))' }}
                />
              </div>
            </div>
          </div>
        ) : (
          // UNGROUPED DESKTOP RENDER (Absolute screen positioning)
          <div className={`absolute inset-0 pointer-events-none z-5 flex items-center justify-center overflow-visible ${!isResting ? 'opacity-0' : ''}`}>
            <div className="relative w-full h-full">
              {/* Bear Body */}
              <img
                src={bearBody}
                alt="Panda Barber 3D"
                className="absolute object-contain lg:object-bottom"
                style={{
                  width: `${80 * activeBearCfg.scale}%`,
                  maxWidth: `${600 * activeBearCfg.scale}px`,
                  bottom: `${activeBearCfg.y}%`,
                  right: `${activeBearCfg.x}%`,
                  transform: `rotate(${activeBearCfg.rotate}deg)`,
                  transformOrigin: 'center bottom',
                  filter: 'drop-shadow(-6px 12px 18px rgba(0,0,0,0.65)) drop-shadow(0px 4px 8px rgba(0,0,0,0.4))',
                }}
              />
              {/* Bear Waving Hand Wrapper (ungrouped for manual configurator usage) */}
              <div
                className="absolute flex items-center justify-center"
                style={{
                  width: `${35 * activeBearCfg.handScale}%`,
                  maxWidth: `${260 * activeBearCfg.handScale}px`,
                  bottom: `${activeBearCfg.handY}%`,
                  right: `${activeBearCfg.handX}%`,
                  transform: `rotate(${activeBearCfg.handRotate}deg)`,
                  transformOrigin: '70% 85%',
                }}
              >
                <img
                  src={bearHand}
                  alt="Waving Hand"
                  className="w-full h-auto object-contain origin-[70%_85%] animate-hand-wave"
                  style={{ filter: 'drop-shadow(-4px 8px 12px rgba(0,0,0,0.5))' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Left-side text legibility gradient (z-10 overlays Bear) ── */}
        <div className="absolute inset-0 pointer-events-none z-10" style={{
          background: 'linear-gradient(to right, rgba(5,5,6,0.95) 0%, rgba(5,5,6,0.5) 38%, rgba(5,5,6,0.1) 68%, transparent 85%)',
        }} />

        {/* ── Bottom legibility gradient for buttons (z-10 overlays Bear) ── */}
        <div className="absolute inset-x-0 bottom-0 pointer-events-none z-10" style={{
          height: '40%',
          background: 'linear-gradient(to top, rgba(5,5,6,1) 0%, rgba(5,5,6,0.7) 35%, transparent 100%)',
        }} />

        {/* ── Cinematic vignette ── */}
        <div className="absolute inset-0 pointer-events-none z-10" style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.72) 100%)',
        }} />

        {/* ── Grain/noise texture ── */}
        <div className="absolute inset-0 pointer-events-none z-15 hero-grain" />


        {/* Logo top-left */}
        <div className={`flex flex-col items-start relative z-20 ${fade(1)}`}>
          <img src={logo} alt="Panda Barber" className="w-20 h-20 object-contain filter brightness-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
        </div>

        {/* Bottom content container pushed to the bottom edge */}
        <div className="w-full flex flex-col items-start gap-4 lg:gap-8 relative z-20 mt-auto pb-1 lg:pb-12 lg:pl-16">
          {/* Hero Welcome content (left-aligned, kept clear of the bear on the right) */}
          <div className="w-full space-y-4" style={{ maxWidth: isDesktop ? '100%' : '66%' }}>
            <div className={fade(2)}>
              <span className="text-[12px] font-bold uppercase tracking-[0.3em] text-[#CBB79A] block mb-2">BIENVENIDO A</span>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-wide text-white leading-[0.95] gold-glow-text title-sustained-glow">PANDA BARBER</h1>
            </div>

            {/* Division Line with Scissors character */}
            <div className={`flex items-center justify-start gap-4 my-1 ${fade(3)}`}>
              <div className="h-[1px] w-12 bg-[#CBB79A]/40"></div>
              <Scissors size={14} className="text-[#CBB79A] gold-glow-scissors" />
              <div className="h-[1px] w-12 bg-[#CBB79A]/40"></div>
            </div>

            <p className={`text-white/70 text-sm leading-relaxed font-medium font-outfit ${fade(3)}`}>
              Precisión en cada detalle. <br/> Distinción en cada estilo.
            </p>
          </div>

          {/* Buttons drawer (left-aligned, restricted width on mobile so it doesn't cover bear, row on desktop) */}
          <div className={`hero-buttons-container w-[80%] max-w-[260px] lg:w-auto lg:max-w-none flex flex-col lg:flex-row gap-3 lg:gap-5 ${fade(5)}`}>
            <button
              onClick={(e) => { createRipple(e); handleStartBooking(); }}
              className="btn-primary w-full lg:w-auto py-4 px-6 rounded-xl font-extrabold text-[11px] lg:text-[13px] uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 btn-premium-shimmer haptic-bounce ripple-container"
              style={{
                background: 'linear-gradient(to bottom, #d2c1aa, #bba789)',
                color: '#000',
              }}
            >
              <CalendarIcon size={16} /> <span className="whitespace-nowrap">Reservar mi visita</span> <span className="text-[14px]">→</span>
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
              className="btn-glass-gold w-full lg:w-auto py-4 px-6 rounded-xl text-[11px] lg:text-[13px] uppercase tracking-widest font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer haptic-bounce"
            >
              <User size={15} /> <span className="whitespace-nowrap">Ya soy cliente</span>
            </button>
          </div>
        </div>

        {/* ── HERO CONFIGURATOR (hidden debug tool) ── */}
        {isResting && (
          <>
            {/* Toggle button — tiny, bottom-left corner */}
            <button
              onClick={() => setShowConfigurator(v => !v)}
              style={{
                position: 'absolute', bottom: 12, left: 12, zIndex: 50,
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.25)', fontSize: 14,
                display: 'none', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', backdropFilter: 'blur(6px)',
              }}
              title="Configurador"
            >⚙</button>

            {/* Configurator panel */}
            {showConfigurator && (
              <div style={{
                position: 'absolute', bottom: 48, left: 8, zIndex: 60,
                width: 220, background: 'rgba(14,14,18,0.96)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
                padding: '14px 16px', backdropFilter: 'blur(20px)',
                boxShadow: '0 16px 40px rgba(0,0,0,0.7)',
              }}>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  {['bear', 'video', 'foto'].map(t => (
                    <button key={t} onClick={() => setConfigTab(t)} style={{
                      flex: 1, padding: '6px', fontSize: 10, borderRadius: 6,
                      fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                      cursor: 'pointer', border: 'none',
                      background: configTab === t ? 'rgba(203,183,154,0.2)' : 'rgba(255,255,255,0.04)',
                      color: configTab === t ? '#CBB79A' : 'rgba(255,255,255,0.35)',
                    }}>{t}</button>
                  ))}
                </div>

                {configTab === 'foto' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Altura foto %', val: posterHeight, set: setPosterHeight, min: 30, max: 120, step: 1, key: 'poster_height' },
                      { label: 'Posición X foto %', val: posterXOffset, set: setPosterXOffset, min: 0, max: 100, step: 1, key: 'poster_x_offset' },
                      { label: 'Posición Y foto %', val: posterYOffset, set: setPosterYOffset, min: 0, max: 100, step: 1, key: 'poster_y_offset' },
                      { label: 'Zoom foto', val: posterZoom, set: setPosterZoom, min: 0.8, max: 2.5, step: 0.01, key: 'poster_zoom' },
                    ].map(({ label, val, set, min, max, step, key }) => (
                      <div key={key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>{label}</span>
                          <span style={{ fontSize: 9, color: '#CBB79A', fontWeight: 800 }}>{val}</span>
                        </div>
                        <input type="range" min={min} max={max} step={step} value={val}
                          onChange={e => { 
                            const v = Number(e.target.value); 
                            set(v); 
                            localStorage.setItem(key, v.toString());
                          }} 
                          style={{ width: '100%', accentColor: '#CBB79A' }} 
                        />
                      </div>
                    ))}
                  </div>
                )}

                {configTab === 'video' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Altura hero %', val: heroHeight, set: setHeroHeight, min: 30, max: 120, step: 1, key: 'hero_height' },
                      { label: 'Posición Y video %', val: videoYOffset, set: setVideoYOffset, min: 0, max: 100, step: 1, key: 'hero_y_offset' },
                      { label: 'Zoom video', val: videoZoom, set: setVideoZoom, min: 0.8, max: 1.6, step: 0.01, key: 'hero_zoom' },
                      { label: 'Degradado stop %', val: gradientStop, set: setGradientStop, min: 30, max: 100, step: 1, key: 'hero_gradient_stop' },
                    ].map(({ label, val, set, min, max, step, key }) => (
                      <div key={key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>{label}</span>
                          <span style={{ fontSize: 9, color: '#CBB79A', fontWeight: 800 }}>{val}</span>
                        </div>
                        <input type="range" min={min} max={max} step={step} value={val}
                          onChange={e => { 
                            const v = Number(e.target.value); 
                            set(v); 
                            const storageKey = (window.innerWidth > 768 && ['bear_scale', 'bear_x', 'bear_y', 'bear_rotate', 'hand_x', 'hand_y', 'hand_scale', 'hand_rotate'].includes(key)) ? `d_${key}` : key;
                            localStorage.setItem(storageKey, v); 
                          }}
                          style={{ width: '100%', accentColor: '#CBB79A', height: 3 }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {configTab === 'bear' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Escala oso', val: activeBearCfg.scale, stateKey: 'scale', min: 0.3, max: 2.5, step: 0.01, storageKey: 'bear_scale' },
                      { label: 'Oso X (right %)', val: activeBearCfg.x, stateKey: 'x', min: -30, max: 80, step: 0.5, storageKey: 'bear_x' },
                      { label: 'Oso Y (bottom %)', val: activeBearCfg.y, stateKey: 'y', min: -20, max: 80, step: 0.5, storageKey: 'bear_y' },
                      { label: 'Rotación oso °', val: activeBearCfg.rotate, stateKey: 'rotate', min: -180, max: 180, step: 1, storageKey: 'bear_rotate' },
                      { label: 'Escala mano', val: activeBearCfg.handScale, stateKey: 'handScale', min: 0.1, max: 1.5, step: 0.01, storageKey: 'hand_scale' },
                      { label: 'Mano X (right %)', val: activeBearCfg.handX, stateKey: 'handX', min: -30, max: 80, step: 0.5, storageKey: 'hand_x' },
                      { label: 'Mano Y (bottom %)', val: activeBearCfg.handY, stateKey: 'handY', min: -20, max: 100, step: 0.5, storageKey: 'hand_y' },
                      { label: 'Rotación mano °', val: activeBearCfg.handRotate, stateKey: 'handRotate', min: -180, max: 180, step: 1, storageKey: 'hand_rotate' },
                    ].map(({ label, val, stateKey, min, max, step, storageKey }) => (
                      <div key={stateKey}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>{label}</span>
                          <span style={{ fontSize: 9, color: '#CBB79A', fontWeight: 800 }}>{val}</span>
                        </div>
                        <input type="range" min={min} max={max} step={step} value={val}
                          onChange={e => { 
                            const v = Number(e.target.value); 
                            updateBearCfg(stateKey, v, storageKey);
                          }}
                          style={{ width: '100%', accentColor: '#CBB79A', height: 3 }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );

    if (isResting) {
      const marco = barbers.find(b => b.name.toLowerCase().includes('marco'));
      const topBarber = marco || barberOfMonth || (barbers.length > 0 ? barbers[0] : null);
      const featuredReviews = topBarber ? reviews.filter(r => r.staff_id === topBarber.id) : [];
      const featuredAvg = featuredReviews.length
        ? (featuredReviews.reduce((acc, r) => acc + (r.rating || 0), 0) / featuredReviews.length).toFixed(1)
        : null;

      return (
        <div className="landing-scroll-container">
          {heroContent}

          {/* Additional landing sections */}
          <div className={`landing-content relative z-10 w-full lg:max-w-[1200px] lg:grid lg:grid-cols-12 lg:gap-6 lg:px-8 lg:mx-auto ${isTransitioning ? 'landing-content-exit' : ''}`}>
            
            {/* Section: Servicios Populares */}
            <div className="landing-section lg:col-span-7">
              <AnimatedSection className="landing-section-head" delay={0}>
                <span className="landing-section-head-title">Servicios Populares</span>
                <button onClick={() => handleStartBooking()} className="landing-see-all">
                  Ver todos <ChevronRight size={13} />
                </button>
              </AnimatedSection>
              <div className="landing-services-scroll">
                {services.slice(0, 4).map((service, i) => (
                  <AnimatedSection key={service.id} delay={i * 70} className="landing-service-snap">
                    <button
                      onClick={() => { setSelectedService(service); handleStartBooking(); }}
                      className="landing-service-card"
                    >
                      <span className="landing-service-num">0{i + 1}</span>
                      {i === 0 && <span className="landing-service-badge">Popular</span>}
                      <div className="landing-service-icon-area">
                        {getServiceIcon(service)}
                      </div>
                      <div className="landing-service-info">
                        <span className="landing-service-name">{service.name}</span>
                        <span className="landing-service-meta">{service.duration} min</span>
                      </div>
                      <div className="landing-service-price">${service.price}</div>
                    </button>
                  </AnimatedSection>
                ))}
              </div>
            </div>

            {/* Section: Barbero Destacado del Mes */}
            <div className="landing-section lg:col-span-5">
              {topBarber ? (
                <div className="landing-barber-month-card">
                  <AnimatedSection delay={0} from="left" className="landing-bm-photo-wrapper">
                    <div className="landing-bm-medal"><Award size={20} fill="#D5B990" strokeWidth={1} /></div>
                    <BarberAvatar url={topBarber.image_url} name={topBarber.name} className="landing-bm-photo" iconSize={34} />
                  </AnimatedSection>
                  <AnimatedSection className="landing-bm-content" delay={120}>
                    <span className="landing-bm-label"><Crown size={12} /> Barbero Destacado del Mes</span>
                    <h3 className="landing-bm-name">{topBarber.name.split(' ')[0]}</h3>
                    <span className="landing-bm-role">{topBarber.specialty || 'Master Barber'}</span>
                    <div className="landing-bm-rating">
                      <Star size={13} fill="var(--champagne)" color="var(--champagne)" />
                      {featuredAvg ? (
                        <>
                          <strong>{featuredAvg}</strong>
                          <span style={{ opacity: 0.35 }}>|</span>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {featuredReviews.length} {featuredReviews.length === 1 ? 'reseña' : 'reseñas'}
                          </span>
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>Top del mes</span>
                      )}
                    </div>
                    <p className="landing-bm-quote">"{topBarber.biography || 'Especializado en cortes clásicos y modernos con un estilo y precisión impecables.'}"</p>
                    <button
                      onClick={() => { setSelectedBarber(topBarber); handleStartBooking(); }}
                      className="landing-bm-btn"
                    >
                      AGENDAR CON {topBarber.name.split(' ')[0]} <ArrowRight size={14} strokeWidth={2.5} />
                    </button>
                  </AnimatedSection>
                </div>
              ) : (
                <p className="text-white/40 text-xs">Cargando especialista destacado...</p>
              )}
            </div>

            {/* Section: Equipo Disponible */}
            <div className="landing-section lg:col-span-7">
              <AnimatedSection className="landing-section-head" delay={0}>
                <span className="landing-section-head-title">Equipo Disponible</span>
                <button onClick={() => handleStartBooking()} className="landing-see-all">
                  Ver todos <ChevronRight size={13} />
                </button>
              </AnimatedSection>
              <div className="landing-team-scroll">
                {barbers.slice(0, 6).map((barber, i) => (
                  <AnimatedSection key={barber.id} delay={i * 70}>
                    <div className="landing-barber-card">
                      <BarberAvatar url={barber.image_url} name={barber.name} className="landing-bc-photo" iconSize={26} />
                      <span className="landing-bc-name">{barber.name.split(' ')[0]}</span>
                      <span className="landing-bc-role">{barber.specialty || barber.role?.split('|')[0] || 'Barber'}</span>
                      <span className="landing-bc-avail"><span className="landing-bc-dot" /> Disponible hoy</span>
                      <button
                        onClick={() => { setSelectedBarber(barber); handleStartBooking(); }}
                        className="landing-bc-btn"
                      >
                        Reservar
                      </button>
                    </div>
                  </AnimatedSection>
                ))}
              </div>
            </div>

            {/* Section: Cliente del Mes / VIP */}
            <div className="landing-section lg:col-span-5">
              <div className="landing-vip-card">
                <AnimatedSection className="landing-vip-left" delay={0} from="left">
                  <div className="landing-vip-badge"><Crown size={22} /></div>
                  <span className="landing-vip-title">Cliente del Mes</span>
                  <p className="landing-vip-desc">El cliente que más nos visita este mes se lleva el reconocimiento. ¿Serás tú el próximo?</p>
                </AnimatedSection>
                <AnimatedSection className="landing-vip-winner" delay={180} from="right">
                  <Crown size={28} className="vip-winner-crown" />
                  <span className="vip-winner-name">
                    {topClients[0] ? topClients[0].name.split(' ')[0] : '???'}
                  </span>
                  <span className="vip-winner-visits">
                    {topClients[0] ? `${topClients[0].visit_count} visitas este mes` : 'Sin ganador aún'}
                  </span>
                </AnimatedSection>
              </div>
            </div>

            {/* Section: Footer Features (Desktop only or responsive) */}


          </div>
        </div>
      );
    }

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
        {heroContent}
      </div>
    );
  };

  // Base layout wrapper
  return (
    <div 
      className="w-screen overflow-hidden flex items-center justify-center bg-[#050506]"
      style={{
        height: '100dvh'
      }}
    >
      <PandaLoader visible={loading && !showWelcome} />
      <div 
        ref={scrollContainerRef}
        className="relative w-full h-full overflow-x-hidden flex flex-col justify-between items-center bg-center overflow-y-auto"
        style={{
          height: '100dvh',
          backgroundColor: '#050506',
          scrollbarWidth: 'none'
        }}
      >
        {/* Ambient auroras for premium glowing background */}
        <div className={`aurora-container ${isTransitioning ? 'welcome-exit-aurora' : ''} ${isReturning ? 'welcome-return-aurora' : ''}`}>
          <div className="ambient-aurora-gold"></div>
          <div className="ambient-aurora-bronze"></div>
        </div>

        {/* ── WELCOME SCREEN ── */}
        {/* Render welcome screen while showWelcome is true, adding fade-out class during transitions */}
        {showWelcome && (
          <div className={`w-full h-full ${isTransitioning ? 'welcome-screen-exit-fade pointer-events-none' : ''}`}>
            {renderWelcomeContent("", hasVisited)}
          </div>
        )}

        {/* On click: two slices with @keyframe exit animation (starts from full-screen, splits apart) */}
        {isTransitioning && (
          <div className="slice-container welcome-exit absolute inset-0 z-50">
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
          <div className={`w-full max-w-xl mx-auto px-4 pb-24 flex flex-col flex-1 relative z-10 ${step === 2 && expandedBarber ? 'pt-0' : 'pt-6'}`}>
            
            {/* Wizard Header: PASO X DE 6 with title/subtitle and back button */}
            {!(step === 2 && expandedBarber) && (
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
                  PASO {step} DE 5
                </span>
                
                {/* Segmented Progress Bar */}
                <div className="flex gap-1 w-32 justify-center mx-auto mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
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
                  {step === 2 && selectedCategory === 'Tatuajes' && <>Elige tu <span className="text-[var(--champagne)]">Tatuador</span></>}
                  {step === 2 && selectedCategory !== 'Tatuajes' && <>Elige tu <span className="text-[var(--champagne)]">Barbero</span></>}
                  {step === 3 && <>Elige tu <span className="text-[var(--champagne)]">fecha y hora</span></>}
                  {step === 4 && <>Personaliza tu <span className="text-[var(--champagne)]">Experiencia</span></>}
                  {step === 5 && <>Completa tu <span className="text-[var(--champagne)]">Reserva</span></>}
                </h1>
                <p className="text-[var(--text-secondary)] text-[11px] font-medium max-w-sm mx-auto">
                  {step === 1 && "Elige el servicio que mejor se adapte a tu estilo."}
                  {step === 2 && selectedCategory === 'Tatuajes' && "Cada artista tiene su estilo único. Escoge el que mejor se adapte a tu visión."}
                  {step === 2 && selectedCategory !== 'Tatuajes' && "Cada barbero tiene su especialidad. Escoge el que mejor va contigo."}
                  {step === 3 && "Selecciona el día y la hora que mejor se adapten a ti."}
                  {step === 4 && "Queremos que tu visita sea perfecta desde que llegas hasta que te vas."}
                  {step === 5 && "Ingresa tus datos para asegurar tu cita en 1 clic."}
                </p>
              </div>
            </div>
            )}

            {/* Content - No wrapper card */}
            <div className="flex flex-col flex-1 relative z-10">
              <div key={step} className="transition-step-container w-full h-full flex flex-col justify-between flex-1 wizard-content-enter pt-4">
                
                {/* STEP 1: Categories & Services (Accordion) */}
                {step === 1 && (
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
                                        scrollToNextButton();
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
{/* STEP 2: Barbers */}
                {step === 2 && (
                  <div className="w-full">
                    {expandedBarber ? (
                      <div className="expanded-card-reveal">
                        {(() => {
                          const bIdx = barbers.findIndex(b => b.id === expandedBarber.id);
                          const specialty = expandedBarber.specialty || (expandedBarber.role?.includes('Tatuador') ? 'Artista Tatuador' : 'Barbero Profesional');
                          const badge = expandedBarber.badge || '';
                          const ratings = ['4.9', '4.8', '4.9', '4.7', '4.8'];
                          const rating = ratings[bIdx % ratings.length];
                          const reviewsList = [324, 210, 189, 98, 142];
                          const reviews = reviewsList[bIdx % reviewsList.length];
                          return (
                            <>
                              {/* Hero photo */}
                              <div className="relative h-56 -mx-4 mb-4 overflow-hidden rounded-b-3xl border-b border-white/5 shadow-2xl bg-white/[0.02]">
                                {expandedBarber.image_url ? (
                                  <img src={expandedBarber.image_url} alt={expandedBarber.name} className="w-full h-full object-cover object-top" />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-white/[0.04] to-transparent">
                                    <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/20">
                                      <User size={32} />
                                    </div>
                                    <span className="text-[10px] text-white/20 font-bold uppercase tracking-wider">Sin foto de perfil</span>
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0e] via-[#0a0a0e]/20 to-transparent"></div>
                                <button onClick={() => { setExpandedBarber(null); setExpandedBarberPortfolio([]); }} className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center z-10 hover:bg-black/70 active:scale-95 transition-all border border-white/10 cursor-pointer">
                                  <ChevronLeft size={18} className="text-white" />
                                </button>
                                <div className="absolute top-4 right-4 flex gap-2 z-10">
                                  <button 
                                    onClick={() => handleShare(expandedBarber)}
                                    className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center hover:bg-black/70 active:scale-95 transition-all border border-white/10 cursor-pointer"
                                    title="Compartir"
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                                  </button>
                                  <button 
                                    onClick={() => toggleFavorite(expandedBarber.id)}
                                    className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center hover:bg-black/70 active:scale-95 transition-all border border-white/10 cursor-pointer"
                                    title="Favorito"
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill={favorites.includes(expandedBarber.id) ? "#ff453a" : "none"} stroke={favorites.includes(expandedBarber.id) ? "#ff453a" : "white"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                                  </button>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                                  {badge && <span className="inline-block px-3 py-1 rounded-lg bg-white/10 backdrop-blur-sm text-[9px] font-black text-white uppercase tracking-wider mb-2">{badge}</span>}
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
                                <h4 className="font-bold text-sm text-white mb-2">Sobre {expandedBarber.name}</h4>
                                <p className="text-[11px] text-white/40 leading-relaxed">
                                  {expandedBarber.biography || "Especialista en fades y cortes modernos. Me enfoco en resaltar tu estilo y personalidad con cada detalle."}
                                </p>
                              </div>

                              {/* Recent works — real photos from staff_portfolio */}
                              <div className="mb-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-bold text-sm text-white">Trabajos recientes</h4>
                                </div>
                                {portfolioLoading ? (
                                  <div className="flex gap-2">
                                    {[1,2,3].map(i => (
                                      <div key={i} className="w-28 h-36 rounded-2xl flex-shrink-0 bg-white/5 animate-pulse" />
                                    ))}
                                  </div>
                                ) : expandedBarberPortfolio.length === 0 ? (
                                  <div className="flex items-center justify-center h-16 rounded-xl border border-white/5 bg-white/[0.02]">
                                    <p className="text-[10px] text-white/25 font-medium">Sin fotos de trabajos aún</p>
                                  </div>
                                ) : (
                                  <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                                    {expandedBarberPortfolio.map(photo => (
                                      <div 
                                        key={photo.id} 
                                        onClick={() => setActiveLightboxImage(photo.image_url)}
                                        className="w-28 h-36 rounded-2xl overflow-hidden flex-shrink-0 bg-white/5 border border-white/10 hover:border-[var(--champagne)] cursor-pointer transition-all duration-300 active:scale-95 shadow-lg group"
                                      >
                                        <img src={photo.image_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                      </div>
                                    ))}
                                  </div>
                                )}
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
                                onClick={(e) => { createRipple(e); setSelectedBarber(expandedBarber); setStep(step + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                className="w-full relative overflow-hidden rounded-2xl haptic-bounce ripple-container group"
                                style={{
                                  background: 'linear-gradient(135deg, #d4bc9a 0%, #c4a882 40%, #b8976e 100%)',
                                  boxShadow: '0 8px 32px rgba(203,183,154,0.35), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.25)'
                                }}
                              >
                                {/* Shimmer sweep */}
                                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                                <div className="relative z-10 py-4 px-6 flex items-center justify-between">
                                  <div className="flex flex-col items-start">
                                    <span className="text-black/50 text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-1">Reservar con</span>
                                    <span className="text-black font-black text-lg leading-none tracking-tight">{expandedBarber.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-full bg-black/15 flex items-center justify-center">
                                      <Check size={18} className="text-black" strokeWidth={3} />
                                    </div>
                                  </div>
                                </div>
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      /* GRID CARDS */
                      <div className="grid grid-cols-2 gap-3">
                        {barbers
                          .filter(b => selectedCategory === 'Tatuajes'
                            ? b.role?.includes('Tatuador') || b.role?.includes('Artista')
                            : b.role?.includes('Barbero')
                          )
                          .map((barber, bIdx) => {
                          const specialty = barber.specialty || (barber.role?.includes('Tatuador') ? 'Artista Tatuador' : 'Barbero Profesional');
                          const badge = barber.badge || '';
                          const ratings = ['4.9', '4.8', '4.9', '4.7', '4.8'];
                          const rating = ratings[bIdx % ratings.length];
                          const reviewsList = [324, 210, 189, 98, 142];
                          const reviews = reviewsList[bIdx % reviewsList.length];
                          const available = bIdx % 4 !== 2;
                          const availTexts = ['Disponible hoy', 'Disponible hoy', 'Disponible mañana', 'Disponible hoy', 'Disponible el sábado'];
                          const availText = availTexts[bIdx % availTexts.length];
                          const isSelected = selectedBarber?.id === barber.id;
                          return (
                            <button
                              key={barber.id}
                              onClick={async () => {
                                setExpandedBarber(barber);
                                setExpandedBarberPortfolio([]);
                                setPortfolioLoading(true);
                                const photos = await publicService.getStaffPortfolio(barber.id);
                                setExpandedBarberPortfolio(photos);
                                setPortfolioLoading(false);
                              }}
                              className={`relative rounded-2xl border overflow-hidden transition-all duration-300 cursor-pointer text-left bg-[#131316] hover:border-white/15 active:scale-[0.98] collapsed-card-reveal flex flex-col ${
                                isSelected 
                                  ? 'border-[var(--champagne)] shadow-[0_0_22px_rgba(203,183,154,0.18)] ring-1 ring-[var(--champagne)]' 
                                  : 'border-white/8'
                              }`}
                            >
                              <div className="relative h-44 overflow-hidden bg-white/[0.02]">
                                {barber.image_url ? (
                                  <img src={barber.image_url} alt={barber.name} className="w-full h-full object-cover object-top" />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-[var(--champagne-dark)]/5 to-transparent">
                                    <div className="w-14 h-14 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center text-[var(--champagne)] shadow-inner">
                                      <User size={26} strokeWidth={1.5} />
                                    </div>
                                    <span className="text-[8px] text-[var(--champagne)]/40 font-bold uppercase tracking-widest">Panda Barber</span>
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-[#131316] via-transparent to-transparent"></div>
                                
                                {/* Selection mark */}
                                {isSelected && (
                                  <div className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-[var(--champagne)] flex items-center justify-center shadow-lg border border-black/10 z-10 animate-scale-up">
                                    <Check size={14} className="text-black" strokeWidth={3} />
                                  </div>
                                )}

                                {badge && (
                                  <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-gradient-to-br from-amber-500/80 to-orange-600/80 backdrop-blur-sm flex items-center gap-1">
                                    <span className="text-[8px] font-black text-white uppercase tracking-wider">{badge}</span>
                                  </div>
                                )}
                                <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center z-10" onClick={(e) => { e.stopPropagation(); toggleFavorite(barber.id); }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill={favorites.includes(barber.id) ? "#ff453a" : "none"} stroke={favorites.includes(barber.id) ? "#ff453a" : "white"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                                </div>
                              </div>
                              <div className="p-3 flex flex-col gap-1.5 flex-1 justify-between">
                                <div>
                                  <h4 className="font-extrabold text-sm text-white leading-tight">{barber.name}</h4>
                                  <p className="text-white/40 text-[10px] font-medium mt-0.5">{specialty}</p>
                                  <div className="flex items-center gap-1 mt-1">
                                    <Star size={10} className="text-amber-400 fill-amber-400" />
                                    <span className="text-[11px] font-bold text-white">{rating}</span>
                                    <span className="text-[9px] text-white/30">({reviews})</span>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-white/5">
                                  {/* Availability */}
                                  <div className="flex items-center gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full availability-pulse ${available ? '' : 'amber'}`}></span>
                                    <span className={`text-[9px] font-bold ${available ? 'text-emerald-400' : 'text-amber-400'}`}>{availText}</span>
                                  </div>
                                  {/* Full-width ELEGIR button */}
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedBarber(isSelected ? null : barber);
                                      if (!isSelected) scrollToNextButton();
                                    }}
                                    className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer haptic-bounce ${
                                      isSelected 
                                        ? 'bg-[var(--champagne)] text-black shadow-[0_4px_14px_rgba(203,183,154,0.35)] scale-[1.02]' 
                                        : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
                                    }`}
                                  >
                                    {isSelected ? '✓ Elegido' : 'Elegir'}
                                  </button>
                                  {/* Tap hint — only when not selected */}
                                  {!isSelected && (
                                    <p className="text-center text-[8px] text-white/20 font-medium tracking-wide -mt-0.5">
                                      Tócame para escoger
                                    </p>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 3: Unified Date & Time Selection */}
                {step === 3 && (
                  <div className="space-y-6 w-full animate-fade-in py-2">
                    
                    {/* Calendar Card */}
                    <div className="bg-[#0b0b0d]/60 backdrop-blur-md border border-white/5 rounded-3xl p-5 shadow-xl space-y-4">
                      
                      {/* Calendar Header: Month, Year and Arrows */}
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-base font-extrabold text-white">
                          {(() => {
                            const monthName = currentCalendarMonth.toLocaleDateString('es-ES', { month: 'long' });
                            const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                            const year = currentCalendarMonth.getFullYear();
                            return `${capitalizedMonth} ${year}`;
                          })()}
                        </span>
                        
                        <div className="flex items-center gap-3">
                          {/* Prev Month Button */}
                          <button
                            type="button"
                            onClick={() => {
                              const today = new Date();
                              const isPrevDisabled = currentCalendarMonth.getFullYear() === today.getFullYear() && currentCalendarMonth.getMonth() === today.getMonth();
                              if (!isPrevDisabled) {
                                setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() - 1, 1));
                              }
                            }}
                            disabled={currentCalendarMonth.getFullYear() === new Date().getFullYear() && currentCalendarMonth.getMonth() === new Date().getMonth()}
                            className={`p-1.5 transition-colors cursor-pointer ${
                              currentCalendarMonth.getFullYear() === new Date().getFullYear() && currentCalendarMonth.getMonth() === new Date().getMonth()
                                ? 'text-white/10 cursor-not-allowed'
                                : 'text-white/40 hover:text-white'
                            }`}
                          >
                            <ChevronLeft size={20} />
                          </button>
                          
                          {/* Next Month Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() + 1, 1));
                            }}
                            className="w-8 h-8 rounded-full bg-[var(--champagne)] text-black flex items-center justify-center hover:bg-[#b8a283] transition-all active:scale-95 cursor-pointer shadow-md"
                          >
                            <ChevronRight size={18} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                      
                      {/* Weekday abbreviations */}
                      <div className="grid grid-cols-7 gap-1 text-center">
                        {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map(d => (
                          <span key={d} className="text-[10px] font-black text-white/30 tracking-wider">
                            {d}
                          </span>
                        ))}
                      </div>
                      
                      {/* Days Grid */}
                      <div className="grid grid-cols-7 gap-y-2 gap-x-1">
                        {calendarDays.map((dayObj, index) => {
                          const { dayNumber, date, isCurrentMonth, isSelectable, isToday, isSelected } = dayObj;
                          
                          return (
                            <button
                              key={index}
                              type="button"
                              disabled={!isSelectable}
                              onClick={() => {
                                if (isSelectable) {
                                  if (!selectedDate || selectedDate.toDateString() !== date.toDateString()) {
                                    setSelectedDate(date);
                                    setSelectedTime(null);
                                  }
                                }
                              }}
                              className="relative py-1 cursor-pointer outline-none focus:outline-none"
                            >
                              <div
                                className={`w-9 h-9 rounded-full mx-auto flex items-center justify-center text-sm transition-all duration-200 ${
                                  isSelected
                                    ? 'bg-[var(--champagne)] text-black font-extrabold shadow-[0_0_12px_rgba(203,183,154,0.4)] scale-105'
                                    : isToday
                                      ? 'border border-[var(--champagne)]/40 text-white font-bold'
                                      : !isCurrentMonth
                                        ? 'text-white/10 pointer-events-none'
                                        : isSelectable
                                          ? 'text-white hover:bg-white/5'
                                          : 'text-white/20 pointer-events-none'
                                }`}
                              >
                                {dayNumber}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      
                    </div>
                    
                    {/* Time Slots Block */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-white/50">
                          {selectedDate ? (
                            (() => {
                              const weekday = selectedDate.toLocaleDateString('es-ES', { weekday: 'long' });
                              const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
                              const day = selectedDate.getDate();
                              const monthName = selectedDate.toLocaleDateString('es-ES', { month: 'long' });
                              const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                              return `${capitalizedWeekday} ${day} de ${capitalizedMonth}`;
                            })()
                          ) : (
                            "Horarios Disponibles"
                          )}
                        </h4>
                        
                        {selectedDate && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                            Disponible
                          </span>
                        )}
                      </div>
                      
                      {!selectedDate ? (
                        <div className="text-center py-10 bg-white/[0.01] border border-white/5 rounded-2xl text-white/30 text-xs">
                          Selecciona un día en el calendario para ver las horas disponibles.
                        </div>
                      ) : loadingSlots ? (
                        <div className="text-center py-12 text-white/30 text-sm">
                          Cargando disponibilidad...
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-2.5">
                          {visibleSlots.map(({ time, label, isPast, isOccupied }) => {
                            const isSelected = selectedTime === time;
                            const isDisabled = isPast || isOccupied;
                            
                            return (
                              <button
                                key={time}
                                type="button"
                                onClick={() => {
                                  if (!isDisabled) {
                                    setSelectedTime(time);
                                  }
                                }}
                                disabled={isDisabled}
                                className={`py-3 rounded-xl border text-center transition-all duration-200 cursor-pointer ${
                                  isOccupied
                                    ? 'border-red-500/20 bg-red-500/5 text-red-400/40 cursor-not-allowed opacity-50'
                                    : isPast
                                      ? 'border-white/3 bg-transparent text-white/10 cursor-not-allowed'
                                      : isSelected
                                        ? 'border-[var(--champagne)] bg-[rgba(203,183,154,0.12)] text-[var(--champagne)] font-bold scale-[1.02] shadow-[0_0_12px_rgba(203,183,154,0.2)]'
                                        : 'border-white/5 bg-black/40 hover:bg-[#0e0e12] hover:border-white/10 text-white'
                                }`}
                              >
                                <span className="text-xs font-bold block">{label}</span>
                                {isOccupied && <span className="text-[7px] tracking-wider uppercase font-semibold text-red-500/60 mt-0.5 block">Ocupado</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    {/* TU SELECCIÓN Card — Premium */}
                    {selectedDate && selectedTime && (
                      <div className="relative rounded-3xl overflow-hidden animate-fade-in" style={{
                        background: 'linear-gradient(135deg, rgba(203,183,154,0.08) 0%, rgba(13,13,17,0.95) 50%, rgba(203,183,154,0.04) 100%)',
                        border: '1px solid rgba(203,183,154,0.25)',
                        boxShadow: '0 0 40px rgba(203,183,154,0.08), inset 0 1px 0 rgba(203,183,154,0.12)'
                      }}>
                        {/* Top shimmer line */}
                        <div className="absolute top-0 left-0 right-0 h-px" style={{background: 'linear-gradient(90deg, transparent, rgba(203,183,154,0.5), transparent)'}} />
                        
                        {/* Glow orb */}
                        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none" style={{background: 'radial-gradient(circle, rgba(203,183,154,0.12) 0%, transparent 70%)'}} />
                        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full pointer-events-none" style={{background: 'radial-gradient(circle, rgba(203,183,154,0.06) 0%, transparent 70%)'}} />

                        <div className="relative p-4">
                          {/* Header label */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1 h-3 rounded-full" style={{background: 'var(--champagne)'}} />
                              <span className="text-[9px] font-black tracking-[0.22em] uppercase" style={{color: 'var(--champagne)'}}>Tu Reserva</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => { handleOpenInlineEdit(); setInlineEditTab('barber'); }}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95"
                              style={{
                                background: 'rgba(203,183,154,0.08)',
                                border: '1px solid rgba(203,183,154,0.2)',
                              }}
                            >
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(203,183,154,0.9)" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              <span className="text-[9px] font-bold tracking-wider" style={{color: 'rgba(203,183,154,0.9)'}}>Editar</span>
                            </button>
                          </div>

                          {/* Main content row */}
                          <div className="flex items-center gap-3">
                            {/* Barber photo with gold ring */}
                            <div className="flex-shrink-0 relative">
                              <div className="w-14 h-14 rounded-2xl overflow-hidden" style={{
                                border: '1.5px solid rgba(203,183,154,0.35)',
                                boxShadow: '0 0 16px rgba(203,183,154,0.15)'
                              }}>
                                {selectedBarber?.image_url ? (
                                  <img src={selectedBarber.image_url} alt={selectedBarber.name} className="w-full h-full object-cover object-top" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center" style={{background: 'rgba(203,183,154,0.05)'}}>
                                    <User size={22} strokeWidth={1.5} style={{color: 'rgba(203,183,154,0.6)'}} />
                                  </div>
                                )}
                              </div>
                              {/* Confirmed badge */}
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{
                                background: 'linear-gradient(135deg, #CBB79A, #a8936b)',
                                boxShadow: '0 2px 8px rgba(203,183,154,0.4)'
                              }}>
                                <Check size={10} className="text-black" strokeWidth={3} />
                              </div>
                            </div>

                            {/* Date & time info */}
                            <div className="flex-1 min-w-0">
                              {/* Date */}
                              <div className="text-white font-extrabold text-[14px] leading-tight tracking-tight">
                                {(() => {
                                  const weekday = selectedDate.toLocaleDateString('es-ES', { weekday: 'long' });
                                  const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
                                  const day = selectedDate.getDate();
                                  const monthName = selectedDate.toLocaleDateString('es-ES', { month: 'long' });
                                  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                                  return `${capitalizedWeekday} ${day} de ${capitalizedMonth}`;
                                })()}
                              </div>
                              {/* Time chip */}
                              <div className="flex items-center gap-1.5 mt-1">
                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{
                                  background: 'rgba(203,183,154,0.1)',
                                  border: '1px solid rgba(203,183,154,0.2)'
                                }}>
                                  <Clock size={9} style={{color: 'var(--champagne)'}} />
                                  <span className="text-[10px] font-bold" style={{color: 'var(--champagne)'}}>{formatTime12(selectedTime)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Divider */}
                          <div className="mt-3 mb-3 h-px" style={{background: 'linear-gradient(90deg, rgba(203,183,154,0.15), rgba(203,183,154,0.04), transparent)'}} />

                          {/* Service & Artist chips row */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)'}}>
                              <Scissors size={9} className="text-white/40" />
                              <span className="text-[9px] font-semibold text-white/60 truncate max-w-[100px]">{selectedService?.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)'}}>
                              <User size={9} className="text-white/40" />
                              <span className="text-[9px] font-semibold text-white/60">{selectedBarber?.name}</span>
                            </div>
                            {selectedService?.price && (
                              <div className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full" style={{
                                background: 'rgba(203,183,154,0.06)',
                                border: '1px solid rgba(203,183,154,0.15)'
                              }}>
                                <span className="text-[10px] font-black" style={{color: 'rgba(203,183,154,0.8)'}}>
                                  ${selectedService.price}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    

                    {/* Big Gold CONTINUAR Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          createRipple(e);
                          if (selectedDate && selectedTime) {
                            setStep(4);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }
                        }}
                        disabled={!selectedDate || !selectedTime}
                        className={`w-full py-4 px-6 rounded-3xl font-extrabold text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 haptic-bounce ripple-container shadow-[0_4px_20px_rgba(203,183,154,0.15)] ${
                          selectedDate && selectedTime
                            ? 'btn-gold cursor-pointer text-black'
                            : 'bg-white/5 border border-white/10 text-white/25 cursor-not-allowed'
                        }`}
                      >
                        Continuar
                        <ChevronRight size={18} strokeWidth={2.5} />
                      </button>
                    </div>
                    
                  </div>
                )}

                {/* STEP 4: Beverage Concierge & Experience Customization */}
                {step === 4 && (
                  <div className="space-y-10 w-full animate-fade-in py-2">
                    {/* 1. Beverage Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-white/90 text-left">
                        <Coffee size={18} className="text-[var(--champagne)]" />
                        <h3 className="text-xs font-bold uppercase tracking-widest">¿Qué te gustaría tomar?</h3>
                      </div>
                      <p className="text-[10px] text-white/40 -mt-1 text-left">
                        Tu bebida estará lista cuando llegues.
                      </p>
                      <div className="grid grid-cols-4 gap-2.5">
                        {[
                          { id: 'Cerveza Fría', label: 'Cerveza Fría', img: '/cerveza.png', fallbackIcon: '🍺' },
                          { id: 'Café Premium', label: 'Café Premium', img: '/cafe.png', fallbackIcon: '☕' },
                          { id: 'Whiskey Premium', label: 'Whiskey Premium', img: '/whiskey.png', fallbackIcon: '🥃' },
                          { id: 'Agua Natural', label: 'Agua Natural', img: '/agua.png', fallbackIcon: '💧' }
                        ].map((bev) => {
                          const isSelected = selectedBeverage === bev.id;
                          return (
                            <button
                              key={bev.id}
                              type="button"
                              onClick={() => { setSelectedBeverage(bev.id); scrollToNextButton(); }}
                              className={`relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 flex flex-col justify-between h-36 border text-center ${
                                isSelected 
                                  ? 'border-[var(--champagne)] bg-[rgba(203,183,154,0.05)] scale-[1.03] shadow-[0_4px_15px_rgba(203,183,154,0.15)]' 
                                  : 'border-white/5 bg-[#0e0e12] hover:bg-[#121216] hover:border-white/10'
                              }`}
                            >
                              {/* Selection Indicator Badge */}
                              <div className="absolute top-1.5 right-1.5 z-20">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-extrabold transition-all duration-300 ${
                                  isSelected 
                                    ? 'bg-[var(--champagne)] text-black scale-100' 
                                    : 'bg-black/40 text-transparent border border-white/15 scale-90'
                                }`}>
                                  ✓
                                </div>
                              </div>

                              {/* Drink image */}
                              <div className="h-24 w-full overflow-hidden relative bg-black/40 flex items-center justify-center">
                                {!imgErrors[bev.id] ? (
                                  <img 
                                    src={bev.img} 
                                    alt={bev.label} 
                                    onError={() => setImgErrors(prev => ({ ...prev, [bev.id]: true }))}
                                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                                  />
                                ) : (
                                  <span className="text-3xl filter drop-shadow-[0_2px_8px_rgba(203,183,154,0.3)] animate-pulse">{bev.fallbackIcon}</span>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e12] via-transparent to-transparent z-10" />
                              </div>

                              {/* Label */}
                              <div className="pb-2.5 px-1 z-20">
                                <span className={`block font-extrabold text-[9px] uppercase tracking-wider ${
                                  isSelected ? 'text-[var(--champagne)]' : 'text-white/80'
                                }`}>
                                  {bev.label}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. Customer Notes Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-white/90 text-left">
                        <MessageSquare size={18} className="text-[var(--champagne)]" />
                        <h3 className="text-xs font-bold uppercase tracking-widest">¿Algo que debamos saber?</h3>
                      </div>
                      <p className="text-[10px] text-white/40 -mt-1 text-left">
                        Cuéntanos cualquier detalle especial.
                      </p>

                      <div className="relative">
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value.slice(0, 120))}
                          placeholder="Ej: Mantener laterales bajos, no tocar la barra, quiero probar algo nuevo, etc."
                          className="w-full h-20 bg-black/40 border border-white/5 rounded-xl p-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[var(--champagne)]/40 focus:bg-black/60 transition-all resize-none pr-12 text-left"
                        />
                        <span className="absolute bottom-2.5 right-3 text-[9px] font-bold text-white/25">
                          {notes.length}/120
                        </span>
                      </div>
                    </div>

                  </div>
                )}

                {/* STEP 5: Confirmation & Cierre Mágico (Registration) */}
                {step === 5 && (
                  <div className="space-y-6 w-full animate-fade-in">
                    {/* PREMIUM BOOKING SUMMARY CARD */}
                    <div className="relative rounded-3xl overflow-hidden shadow-2xl animate-fade-in" style={{
                      border: '1px solid rgba(203,183,154,0.2)',
                      boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(203,183,154,0.08)'
                    }}>
                      {/* Premium Header: Barber Avatar + Details */}
                      <div className="relative p-5 bg-[#0a0a0f] border-b border-white/5 flex items-center justify-between gap-4 overflow-hidden">
                        {/* Ambient glow in header */}
                        <div className="absolute top-0 left-0 w-32 h-32 rounded-full" style={{background: 'radial-gradient(circle, rgba(203,183,154,0.08) 0%, transparent 70%)'}} />
                        
                        <div className="flex items-center gap-4 relative z-10">
                          {/* Barber Portrait Avatar */}
                          <div className="w-20 h-20 rounded-2xl overflow-hidden border border-[#CBB79A]/30 shadow-lg flex-shrink-0 bg-black">
                            {selectedBarber?.image_url ? (
                              <img src={selectedBarber.image_url} alt={selectedBarber.name} className="w-full h-full object-cover object-top" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center" style={{
                                background: 'linear-gradient(135deg, #111110 0%, #1a1810 100%)'
                              }}>
                                <User size={24} className="text-[#CBB79A]" />
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <p className="text-[9px] font-black tracking-[0.2em] uppercase text-white/40 mb-1">Tu especialista</p>
                            <h3 className="text-lg font-black text-white leading-none">{selectedBarber?.name}</h3>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="flex flex-col items-end relative z-10">
                          <span className="text-[8px] font-bold text-white/40 uppercase tracking-wider mb-0.5">Total</span>
                          <span className="text-2xl font-black leading-none" style={{
                            background: 'linear-gradient(135deg, #CBB79A, #e8d5b7)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                          }}>${selectedService?.price}</span>
                        </div>
                      </div>

                      {/* Content section */}
                      <div className="p-4 space-y-2.5" style={{background: 'linear-gradient(180deg, #0a0a0f 0%, #0d0d13 100%)'}}>
                        
                        {/* Service chip — champagne */}
                        <div className="flex items-center gap-3 p-3 rounded-2xl" style={{
                          background: 'rgba(203,183,154,0.06)',
                          border: '1px solid rgba(203,183,154,0.14)'
                        }}>
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{background: 'rgba(203,183,154,0.12)'}}>
                            <Scissors size={14} style={{color: '#CBB79A'}} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[8px] font-black uppercase tracking-widest" style={{color: 'rgba(203,183,154,0.55)'}}>Servicio</p>
                            <p className="text-sm font-extrabold text-white truncate">{selectedService?.name}</p>
                          </div>
                        </div>

                        {/* Date & Time chip — champagne slightly lighter */}
                        <div className="flex items-center gap-3 p-3 rounded-2xl" style={{
                          background: 'rgba(203,183,154,0.04)',
                          border: '1px solid rgba(203,183,154,0.10)'
                        }}>
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{background: 'rgba(203,183,154,0.10)'}}>
                            <CalendarIcon size={14} style={{color: '#CBB79A'}} />
                          </div>
                          <div className="flex-1">
                            <p className="text-[8px] font-black uppercase tracking-widest" style={{color: 'rgba(203,183,154,0.55)'}}>Fecha y Hora</p>
                            <p className="text-sm font-extrabold text-white">
                              {selectedDate?.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                              <span className="mx-1.5 text-white/20">·</span>
                              <span style={{color: '#CBB79A'}}>{formatTime12(selectedTime)}</span>
                            </p>
                          </div>
                        </div>

                        {/* Beverage chip — champagne darkest */}
                        {selectedBeverage && (
                          <div className="flex items-center gap-3 p-3 rounded-2xl" style={{
                            background: 'rgba(203,183,154,0.06)',
                            border: '1px solid rgba(203,183,154,0.14)'
                          }}>
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{background: 'rgba(203,183,154,0.10)'}}>
                              {renderBeverageIcon(selectedBeverage, 14, '')}
                            </div>
                            <div className="flex-1">
                              <p className="text-[8px] font-black uppercase tracking-widest" style={{color: 'rgba(203,183,154,0.55)'}}>Tu Bebida</p>
                              <p className="text-sm font-extrabold text-white">{selectedBeverage}</p>
                            </div>
                            <span className="text-[9px] font-black px-2.5 py-1 rounded-full" style={{
                              background: 'rgba(203,183,154,0.1)',
                              color: 'rgba(203,183,154,0.85)',
                              border: '1px solid rgba(203,183,154,0.2)'
                            }}>Gratis</span>
                          </div>
                        )}

                        {/* Shimmer divider */}
                        <div className="h-px w-full" style={{background: 'linear-gradient(90deg, transparent, rgba(203,183,154,0.25), transparent)'}} />

                        {/* Confirmed indicator */}
                        <div className="flex items-center justify-center gap-2 py-0.5">
                          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background: '#CBB79A'}} />
                          <span className="text-[10px] font-bold tracking-wider" style={{color: 'rgba(203,183,154,0.45)'}}>Todo listo para confirmar</span>
                        </div>
                      </div>
                    </div>

                    {!isLoggedIn && (
                      <div className="bg-[#0b0b0e]/90 backdrop-blur-md border border-white/5 rounded-3xl p-6 space-y-6 shadow-2xl">
                        <div className="text-center space-y-1">
                          <h4 className="font-bold text-white text-lg tracking-tight">Cierre Mágico</h4>
                          <p className="text-xs text-white/40">Agenda tu cita y crea tu perfil express en un paso.</p>
                        </div>

                        <button
                          type="button"
                          onClick={handleGoogleLogin}
                          className="w-full py-3.5 px-4 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center justify-center gap-2.5 transition-all duration-300 hover:scale-[1.01] hover:border-white/20 active:scale-[0.99] cursor-pointer shadow-md"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          Conectar con Google
                        </button>

                        <div className="flex items-center gap-4 py-1">
                          <div className="h-px bg-white/10 flex-1"></div>
                          <span className="text-[9px] uppercase font-black tracking-widest text-white/30">o completa tus datos</span>
                          <div className="h-px bg-white/10 flex-1"></div>
                        </div>

                        <div className="flex p-1 rounded-xl bg-black/40 border border-white/5">
                          <button
                            type="button"
                            onClick={() => { setAuthTab('register'); setAuthError(''); }}
                            className={`flex-1 py-2.5 rounded-lg text-xs font-black transition-all duration-300 cursor-pointer ${authTab === 'register' ? 'bg-[var(--champagne)] text-black shadow-md' : 'text-white/40 hover:text-white/60'}`}
                          >
                            Registro Rápido
                          </button>
                          <button
                            type="button"
                            onClick={() => { setAuthTab('login'); setAuthError(''); }}
                            className={`flex-1 py-2.5 rounded-lg text-xs font-black transition-all duration-300 cursor-pointer ${authTab === 'login' ? 'bg-[var(--champagne)] text-black shadow-md' : 'text-white/40 hover:text-white/60'}`}
                          >
                            Tengo Cuenta
                          </button>
                        </div>

                        {authError && (
                          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-xl text-left">
                            {authError}
                          </div>
                        )}

                        {authTab === 'register' ? (
                          <form onSubmit={handleCheckout} className="space-y-4 text-left">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-extrabold text-white/40 uppercase tracking-widest">Nombre</label>
                                <input
                                  type="text"
                                  value={authForm.name}
                                  onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                                  className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:border-[var(--champagne)] focus:bg-white/[0.04] focus:shadow-[0_0_12px_rgba(203,183,154,0.1)] transition-all duration-200 outline-none"
                                  placeholder="Juan"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-extrabold text-white/40 uppercase tracking-widest">Apellido</label>
                                <input
                                  type="text"
                                  value={authForm.lastname}
                                  onChange={(e) => setAuthForm({ ...authForm, lastname: e.target.value })}
                                  className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:border-[var(--champagne)] focus:bg-white/[0.04] focus:shadow-[0_0_12px_rgba(203,183,154,0.1)] transition-all duration-200 outline-none"
                                  placeholder="Pérez"
                                  required
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-extrabold text-white/40 uppercase tracking-widest">Teléfono</label>
                                <input
                                  type="tel"
                                  value={authForm.phone}
                                  onChange={(e) => setAuthForm({ ...authForm, phone: e.target.value })}
                                  className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:border-[var(--champagne)] focus:bg-white/[0.04] focus:shadow-[0_0_12px_rgba(203,183,154,0.1)] transition-all duration-200 outline-none"
                                  placeholder="04121234567"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-extrabold text-white/40 uppercase tracking-widest">Cédula</label>
                                <input
                                  type="text"
                                  value={authForm.id_card}
                                  onChange={(e) => setAuthForm({ ...authForm, id_card: e.target.value })}
                                  className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:border-[var(--champagne)] focus:bg-white/[0.04] focus:shadow-[0_0_12px_rgba(203,183,154,0.1)] transition-all duration-200 outline-none"
                                  placeholder="V-12345678"
                                  required
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-extrabold text-white/40 uppercase tracking-widest">Email (Opcional)</label>
                              <input
                                type="email"
                                value={authForm.email}
                                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                                className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:border-[var(--champagne)] focus:bg-white/[0.04] focus:shadow-[0_0_12px_rgba(203,183,154,0.1)] transition-all duration-200 outline-none"
                                placeholder="juan@ejemplo.com"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-extrabold text-white/40 uppercase tracking-widest">Fecha de Nacimiento</label>
                                <PandaDatePicker
                                  value={authForm.birth_date}
                                  onChange={(e) => setAuthForm({ ...authForm, birth_date: e.target.value })}
                                  placeholder="Seleccionar fecha"
                                  className="w-full"
                                  style={{ height: '40px', padding: '0 12px' }}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-extrabold text-white/40 uppercase tracking-widest">Contraseña</label>
                                <div className="relative">
                                  <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={authForm.password}
                                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                                    className="w-full bg-white/[0.02] border border-white/5 rounded-xl pl-4 pr-10 py-3 text-xs text-white focus:border-[var(--champagne)] focus:bg-white/[0.04] focus:shadow-[0_0_12px_rgba(203,183,154,0.1)] transition-all duration-200 outline-none"
                                    placeholder="••••••••"
                                    required
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-colors duration-200"
                                    style={{ color: showPassword ? 'var(--champagne)' : 'rgba(255,255,255,0.6)' }}
                                  >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                  </button>
                                </div>
                              </div>
                            </div>

                            <button
                              type="submit"
                              disabled={submitting}
                              className="btn-gold w-full py-4 mt-3 rounded-full font-bold uppercase tracking-wider text-xs shadow-md cursor-pointer haptic-bounce"
                            >
                              {submitting ? 'Agendando...' : 'Crear Cuenta & Confirmar'}
                            </button>
                          </form>
                        ) : (
                          <form onSubmit={handleCheckout} className="space-y-4 text-left">
                            <div className="space-y-1">
                              <label className="text-[10px] font-extrabold text-white/40 uppercase tracking-widest">Email o Teléfono</label>
                              <input
                                type="text"
                                value={loginForm.identifier}
                                onChange={(e) => setLoginForm({ ...loginForm, identifier: e.target.value })}
                                className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:border-[var(--champagne)] focus:bg-white/[0.04] focus:shadow-[0_0_12px_rgba(203,183,154,0.1)] transition-all duration-200 outline-none"
                                placeholder="juan@ejemplo.com o 0412..."
                                required
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-extrabold text-white/40 uppercase tracking-widest">Contraseña</label>
                              <div className="relative">
                                <input
                                  type={showPassword ? 'text' : 'password'}
                                  value={loginForm.password}
                                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                  className="w-full bg-white/[0.02] border border-white/5 rounded-xl pl-4 pr-10 py-3 text-xs text-white focus:border-[var(--champagne)] focus:bg-white/[0.04] focus:shadow-[0_0_12px_rgba(203,183,154,0.1)] transition-all duration-200 outline-none"
                                  placeholder="Contraseña"
                                  required
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-colors duration-200"
                                  style={{ color: showPassword ? 'var(--champagne)' : 'rgba(255,255,255,0.6)' }}
                                >
                                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </div>
                            </div>

                            <button
                              type="submit"
                              disabled={submitting}
                              className="btn-gold w-full py-4 mt-3 rounded-full font-bold uppercase tracking-wider text-xs shadow-md cursor-pointer haptic-bounce"
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

            {/* Footer Navigation Buttons — hidden when barber profile is expanded or when in Step 3 (which has its own button) */}
            <div className={`mt-4 pb-2 ${(step === 2 && expandedBarber) || step === 3 ? 'hidden' : ''}`}>
              {step < 5 ? (
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
              ) : isLoggedIn ? (
                <button
                  onClick={(e) => { createRipple(e); handleCheckout(); }}
                  disabled={submitting}
                  className="btn-gold w-full py-4 px-6 rounded-full font-bold uppercase tracking-wider text-sm shadow-[var(--shadow-glow-gold)] cursor-pointer haptic-bounce ripple-container"
                >
                  {submitting ? 'Agendando...' : 'Confirmar Reserva'}
                </button>
              ) : null}
            </div>
          </div>
        )}

      </div>

      {/* Lightbox Overlay for Recent Works */}
      {activeLightboxImage && (
        <div 
          className="fixed inset-0 bg-black/95 z-[99999] flex items-center justify-center p-4 transition-all duration-300 animate-fade-in"
          onClick={() => setActiveLightboxImage(null)}
        >
          <button 
            className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-full flex items-center justify-center text-white border border-white/10 cursor-pointer"
            onClick={() => setActiveLightboxImage(null)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
          <div 
            className="relative max-w-full max-h-[85vh] aspect-[3/4] rounded-3xl overflow-hidden border border-white/15 shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={activeLightboxImage} 
              alt="Recent Work" 
              className="w-full h-full object-cover" 
            />
          </div>
        </div>
      )}

      {/* INLINE EDIT MODAL */}
      {showInlineEdit && (
        <div 
          className={`fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all duration-300 ${
            isInlineEditOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`} 
          style={{fontFamily: 'Outfit, sans-serif'}}
        >
          <div 
            className={`w-full max-w-md bg-[#0e0e12] border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative overflow-hidden transition-all duration-300 ${
              isInlineEditOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-95'
            }`}
            style={{transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'}}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--champagne)]/20" />
            
            {/* Header */}
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Editar Reserva</h3>
              <button 
                type="button" 
                onClick={handleCloseInlineEdit}
                className="text-white/40 hover:text-white text-[10px] font-bold px-3 py-1.5 rounded-full bg-white/5 border border-white/5 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
            
            {/* Unified Inline Content */}
            <div className="space-y-5">
              
              {/* 1. Especialistas Section - Horizontal Scroll */}
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-2.5">Especialista</p>
                <div className="flex gap-2.5 overflow-x-auto pb-1.5 -mx-1 px-1 scrollbar-none">
                  {barbers.map((b) => {
                    const isSelected = selectedBarber?.id === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBarber(b)}
                        className={`flex-shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer w-20 text-center ${
                          isSelected
                            ? 'border-[var(--champagne)] bg-[rgba(203,183,154,0.08)]'
                            : 'border-white/5 bg-black/40 hover:bg-black/60'
                        }`}
                      >
                        <div className="relative">
                          <BarberAvatar url={b.image_url} name={b.name} />
                          {isSelected && (
                            <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-[var(--champagne)] text-black flex items-center justify-center text-[8px] font-black border border-[#0e0e12]">
                              ✓
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-white truncate w-full">{b.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Servicios Section - Two Column Grid */}
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-2.5">Servicio</p>
                <div className="max-h-60 overflow-y-auto grid grid-cols-2 gap-2 pr-1">
                  {services.map((s) => {
                    const isSelected = selectedService?.id === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedService(s)}
                        className={`w-full flex flex-col justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer relative h-22 ${
                          isSelected
                            ? 'border-[var(--champagne)] bg-[rgba(203,183,154,0.06)] shadow-[0_0_12px_rgba(203,183,154,0.1)]'
                            : 'border-white/5 bg-black/40 hover:bg-black/60'
                        }`}
                      >
                        {/* Selection Check Circle */}
                        <div className={`absolute top-2.5 right-2.5 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[8px] font-black transition-all duration-300 ${
                          isSelected 
                            ? 'bg-[var(--champagne)] text-black scale-100' 
                            : 'bg-black/40 text-transparent border border-white/15 scale-90'
                        }`}>
                          ✓
                        </div>

                        <div className="pr-4">
                          <p className="text-[11px] font-bold text-white leading-tight line-clamp-2">{s.name}</p>
                          <p className="text-[9px] text-white/40 mt-1">{s.duration} min</p>
                        </div>
                        
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="text-xs font-black text-[var(--champagne)]">${s.price}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
            
            {/* Done Button */}
            <button
              type="button"
              onClick={handleCloseInlineEdit}
              className="w-full mt-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-[var(--champagne)] text-black hover:bg-[#b8a283] transition-all cursor-pointer text-center"
            >
              Listo
            </button>
          </div>
        </div>
      )}

      {/* Toast Alert for Share & Favorites */}
      {toast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[999999] bg-black/80 border border-white/10 text-white/90 px-4 py-2.5 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.6)] text-[11px] font-semibold flex items-center gap-3 backdrop-blur-xl animate-scale-in tracking-wide border-t border-white/15">
          {toast.type === 'success' && (
            <svg className="text-[var(--champagne)] animate-pulse" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          )}
          {toast.type === 'favorite' && (
            <svg className="text-red-500 animate-pulse" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          )}
          {toast.type === 'unfavorite' && (
            <svg className="text-white/40" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          )}
          <span className="opacity-95 leading-none pr-1">{toast.text}</span>
        </div>
      )}
    </div>
  );
}
