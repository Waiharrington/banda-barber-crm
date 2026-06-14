import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  TrendingUp, 
  Users, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Rocket,
  Target,
  Edit3,
  User,
  Trophy, 
  Crown, 
  Medal, 
  ArrowRight,
  ShoppingBag,
  Scissors as ScissorsIcon,
  Circle,
  RefreshCw,
  Gift,
  Cake,
  MessageCircle,
  Sparkles,
  X,
  Calendar,
  CheckCircle2,
  DollarSign,
  Bell
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import { notificationService } from '../services/notificationService';
import { useScrollLock } from '../hooks/useScrollLock';
import { ModalShield } from '../context/ModalContext';
import AnimatedModal from './AnimatedModal';
import { useAuth } from '../context/AuthContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const QUOTES = [
  { text: "Cada cabeza es un mundo.", creator: "Refrán Popular" },
  { text: "La grandeza nace de pequeños comienzos.", creator: "Sir Francis Drake" },
  { text: "La disciplina es el puente entre metas y logros.", creator: "Jim Rohn" },
  { text: "El estilo es una forma de decir quién eres sin hablar.", creator: "Rachel Zoe" },
  { text: "Invierte en tu imagen, es tu carta de presentación.", creator: "Negocios" },
  { text: "Un corte de pelo puede cambiar una vida.", creator: "Arte Panda" },
  { text: "La calidad atrae, el detalle retiene.", creator: "Estrategia" },
  { text: "No busques clientes, busca fans.", creator: "Crecimiento" },
  { text: "La barbería es el arte de esculpir confianza.", creator: "Mística Panda" },
  { text: "El éxito es la suma de pequeños esfuerzos diarios.", creator: "Robert Collier" },
  { text: "Domina tu oficio, luego rompe las reglas.", creator: "Maestros" },
  { text: "Cada cliente es una oportunidad de crear una obra maestra.", creator: "Visión" },
  { text: "El mejor marketing es un cliente satisfecho.", creator: "Marketing" },
  { text: "Sé tan bueno que no puedan ignorarte.", creator: "Steve Martin" },
  { text: "Tu única competencia es la persona en el espejo.", creator: "Superación" },
  { text: "El negocio de la belleza es el negocio de la felicidad.", creator: "Emprendimiento" }
];

const DashboardModule = ({ 
  isMobile, 
  isTablet,
  isCollapsed,
  onOpenSale, 
  stats, 
  chartData, 
  dbData, 
  handleSeedData, 
  rates, 
  activeRateType,
  onToggleRateType,
  onNavigate,
  onRefresh,
  onOpenNotifications
}) => {
  const { user } = useAuth();
  const [quoteIndex, setQuoteIndex] = useState(0);
  const { showToast } = useNotifs();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const updateUnread = () => {
      const history = notificationService.getHistory();
      const count = history.filter(n => !n.read).length;
      setUnreadCount(count);
    };

    updateUnread();
    window.addEventListener('panda_new_notification', updateUnread);
    return () => {
      window.removeEventListener('panda_new_notification', updateUnread);
    };
  }, []);
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [currentMonthAmount, setCurrentMonthAmount] = useState(() => {
    const val = parseFloat(localStorage.getItem('panda_current_month_amount') || '28400');
    return val < 1000 ? val * 1000 : val;
  });
  const [monthlyGoal, setMonthlyGoal] = useState(() => {
    const val = parseFloat(localStorage.getItem('panda_monthly_goal') || '35000');
    return val < 1000 ? val * 1000 : val;
  });
  const [selectedChair, setSelectedChair] = useState(null);

  const [chairs, setChairs] = useState(() => {
    const saved = localStorage.getItem('panda_chairs_state');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      { 
        id: '01', 
        type: 'Luis Gómez', 
        name: 'Juan Pérez', 
        service: 'Corte + Barba', 
        time: '09:30', 
        duration: '30 min', 
        status: 'En servicio', 
        glowClass: 'chair-halo-en-servicio',
        statusColor: '#ef4444',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100'
      },
      { 
        id: '02', 
        type: 'Mateo Fernández', 
        status: 'Limpieza', 
        glowClass: 'chair-halo-limpieza',
        statusColor: '#eab308',
        info: 'Disponible en 10 min'
      },
      { 
        id: '03', 
        type: 'Alejandro Ruiz', 
        name: 'Carlos Ramírez', 
        service: 'Degradado', 
        time: '10:15', 
        duration: '25 min', 
        status: 'Reservada', 
        glowClass: 'chair-halo-reservada',
        statusColor: '#f97316',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100'
      },
      { 
        id: '04', 
        type: 'Daniel Medina', 
        status: 'Disponible', 
        glowClass: 'chair-halo-disponible',
        statusColor: '#22c55e',
        info: 'Próximo: 11:00 AM'
      },
    ];
  });

  const monthlyProgress = Math.round((currentMonthAmount / (monthlyGoal || 1)) * 100);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).toUpperCase();

  const formattedDate = currentTime.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  const currentMonthName = `${monthNames[currentTime.getMonth()]} ${currentTime.getFullYear()}`;
  const currentDateVal = currentTime.getDate();

  const firstDayIndex = (new Date(currentTime.getFullYear(), currentTime.getMonth(), 1).getDay() + 6) % 7;
  const totalDays = new Date(currentTime.getFullYear(), currentTime.getMonth() + 1, 0).getDate();
  const prevMonthTotalDays = new Date(currentTime.getFullYear(), currentTime.getMonth(), 0).getDate();

  const daysGrid = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    daysGrid.push({ day: prevMonthTotalDays - i, isCurrentMonth: false });
  }
  for (let i = 1; i <= totalDays; i++) {
    daysGrid.push({ day: i, isCurrentMonth: true });
  }
  const gridLength = daysGrid.length > 35 ? 42 : 35;
  const suffixDays = gridLength - daysGrid.length;
  for (let i = 1; i <= suffixDays; i++) {
    daysGrid.push({ day: i, isCurrentMonth: false });
  }

  // Week revenues line chart — premium champagne glow style
  const weeklyChartData = {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    datasets: [
      {
        data: chartData?.income || [400, 520, 480, 600, 720, 950, 920],
        borderColor: '#CBB79A',
        borderWidth: 2.5,
        pointBackgroundColor: '#CBB79A',
        pointBorderColor: '#07070a',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointHoverBackgroundColor: '#e0cfba',
        tension: 0.45,
        fill: true,
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return null;
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(203, 183, 154, 0.18)');
          gradient.addColorStop(0.6, 'rgba(203, 183, 154, 0.04)');
          gradient.addColorStop(1, 'rgba(203, 183, 154, 0.0)');
          return gradient;
        },
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#101014',
        titleColor: '#f8f8f8',
        bodyColor: '#CBB79A',
        borderColor: 'rgba(203,183,154,0.15)',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 10,
        displayColors: false
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 9, weight: '600', family: 'Outfit' } }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.025)', drawBorder: false },
        ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 8, weight: '500', family: 'Outfit' } }
      }
    }
  };

  // Sillas representadas en el estado local editable.

  return (
    <div style={{ 
      paddingBottom: '0px', 
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative',
      overflowX: 'hidden',
      height: (isMobile || isTablet) ? 'auto' : '100%',
      minHeight: 0,
      backgroundColor: 'transparent',
    }}>
      {/* Ambient glowing background orbs — deep & cinematic */}
      <div className="l-dashboard-orb l-orb-1" />
      <div className="l-dashboard-orb l-orb-2" />
      <div className="l-dashboard-orb l-orb-3" />

      {/* Premium Dashboard Header (Mockup Style) */}
      {!isMobile && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 14px 10px 14px',
          backgroundColor: 'transparent',
          zIndex: 2,
          flexShrink: 0
        }}>
          {/* Welcome Greeting */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ 
              fontSize: '22px', 
              fontWeight: '800', 
              color: 'white', 
              letterSpacing: '-0.5px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              margin: 0 
            }}>
              ¡Buenos días, Panda Barber! 
              <span className="wave-hand-span" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <svg 
                  width="22" 
                  height="22" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="var(--champagne)" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  style={{
                    marginLeft: '8px',
                    transformOrigin: '70% 70%',
                    animation: 'wave-animation 2.5s infinite'
                  }}
                >
                  <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5" />
                  <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
                  <path d="M10 10.5V5.5a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
                  <path d="M6 11.5V9a1.5 1.5 0 0 0-1.5-1.5v0A1.5 1.5 0 0 0 3 9v7.5A6.5 6.5 0 0 0 9.5 23h3.75A5.75 5.75 0 0 0 19 17.25V11" />
                </svg>
              </span>
            </h1>
            <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.45)', fontWeight: '600', marginTop: '4px' }}>
              Hora actual: {formattedTime}
            </span>
          </div>

          {/* Search, Notifications, + Nueva cita */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Search Input Bar */}
            <div style={{
              position: 'relative',
              width: '260px'
            }}>
              <input 
                type="text" 
                placeholder="Buscar citas, clientes, barberos..." 
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'white',
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.07)';
                  e.target.style.borderColor = 'rgba(203, 183, 154, 0.3)';
                }}
                onBlur={(e) => {
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.04)';
                  e.target.style.borderColor = 'rgba(255,255,255,0.06)';
                }}
              />
              <svg 
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}
                width="14" 
                height="14" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="white" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
                      {/* Rate Toggle Card */}
            {rates && (
              <div className="glass-card" style={{ 
                padding: '4px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px', 
                borderRadius: '12px', 
                border: '1px solid rgba(255,255,255,0.06)',
                backgroundColor: 'rgba(255, 255, 255, 0.02)'
              }}>
                {/* BCV Button */}
                <button
                  onClick={() => onToggleRateType('bcv')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1px',
                    transition: 'all 0.3s ease',
                    background: activeRateType === 'bcv' ? 'rgba(34, 197, 94, 0.08)' : 'transparent',
                    border: activeRateType === 'bcv' ? '1.5px solid #22c55e' : '1.5px solid transparent',
                    boxShadow: 'none'
                  }}
                >
                  <span style={{ 
                    fontSize: '8px', 
                    fontWeight: '800', 
                    color: activeRateType === 'bcv' ? '#22c55e' : 'rgba(255,255,255,0.5)',
                    letterSpacing: '0.5px'
                  }}>
                    BCV
                  </span>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: '800', 
                    color: activeRateType === 'bcv' ? '#22c55e' : 'white'
                  }}>
                    {rates.bcv > 0 ? rates.bcv.toFixed(2) : '—'}
                  </span>
                </button>

                {/* USDT Button */}
                <button
                  onClick={() => onToggleRateType('usdt')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1px',
                    transition: 'all 0.3s ease',
                    background: activeRateType === 'usdt' ? 'rgba(34, 197, 94, 0.08)' : 'transparent',
                    border: activeRateType === 'usdt' ? '1.5px solid #22c55e' : '1.5px solid transparent',
                    boxShadow: 'none'
                  }}
                >
                  <span style={{ 
                    fontSize: '8px', 
                    fontWeight: '800', 
                    color: activeRateType === 'usdt' ? '#22c55e' : 'rgba(255,255,255,0.5)',
                    letterSpacing: '0.5px'
                  }}>
                    USDT
                  </span>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: '800', 
                    color: activeRateType === 'usdt' ? '#22c55e' : 'white'
                  }}>
                    {rates.usdt > 0 ? rates.usdt.toFixed(2) : '—'}
                  </span>
                </button>

                {/* Gap indicator */}
                <div style={{ 
                  padding: '4px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1px'
                }}>
                  <span style={{ fontSize: '7px', fontWeight: '800', color: 'rgba(255,255,255,0.5)' }}>GAP</span>
                  <span style={{ 
                    fontSize: '10px', 
                    fontWeight: '950', 
                    color: rates.gap > 10 ? '#ef4444' : '#22c55e',
                    backgroundColor: rates.gap > 10 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                    padding: '2px 6px',
                    borderRadius: '6px'
                  }}>
                    {rates.gap > 0 ? rates.gap.toFixed(1) : '0'}%
                  </span>
                </div>
              </div>
            )}

            {/* Notification Bell */}
            <button 
              onClick={onOpenNotifications}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '50%',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--champagne)',
                  boxShadow: '0 0 8px var(--champagne)'
                }} />
              )}
            </button>

            {/* + Nueva cita gold button */}
            <button 
              onClick={onOpenSale}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 20px',
                borderRadius: '100px',
                background: 'var(--gold-gradient)',
                border: 'none',
                color: '#000000',
                fontWeight: '750',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 4px 12px rgba(255, 255, 255, 0.08)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(255, 255, 255, 0.15)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.08)';
              }}
            >
              <Plus size={16} strokeWidth={2.5} />
              Nueva cita
            </button>
          </div>
        </div>
      )}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: (isMobile || isTablet) ? '1fr' : '3.1fr 1.3fr', 
        gap: '16px', 
        flex: 1, 
        minHeight: 0,
        height: '100%',
        padding: '0 8px',
        overflow: 'hidden'
      }}>
        
        {/* Left Column: Metrics & Main Dashboard Content */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '14px', 
          height: '100%', 
          minHeight: 0,
          overflow: 'hidden'
        }}>
          
          {/* Top KPI Cards Row */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', 
            gap: '10px',
            flexShrink: 0
          }}>
            {/* KPI Card 1: Citas Hoy */}
            <div className="glass-card" style={{ padding: '8px 10px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '76px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.7 }}>
                <span style={{ fontSize: '9px', fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>CITAS HOY</span>
                <Calendar size={13} color="rgba(255,255,255,0.6)" />
              </div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: 'white', margin: '1px 0' }}>
                {dbData?.todayAppointments?.length || 12}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '9px', color: '#c5a880', fontWeight: '700' }}>
                <span style={{ fontSize: '7px' }}>▲</span> 20% <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: '500' }}>vs ayer</span>
              </div>
            </div>

            {/* KPI Card 2: Facturado Hoy */}
            <div className="glass-card" style={{ padding: '8px 10px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '76px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.7 }}>
                <span style={{ fontSize: '9px', fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>FACTURADO HOY</span>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: '800' }}>$</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: 'white', margin: '1px 0' }}>
                ${formatCurrency(stats?.income || 245000)}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '9px', color: '#c5a880', fontWeight: '700' }}>
                <span style={{ fontSize: '7px' }}>▲</span> 18% <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: '500' }}>vs ayer</span>
              </div>
            </div>

            {/* KPI Card 3: Clientes Nuevos */}
            <div className="glass-card" style={{ padding: '8px 10px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '76px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.7 }}>
                <span style={{ fontSize: '9px', fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>CLIENTES NUEVOS</span>
                <Users size={13} color="rgba(255,255,255,0.6)" />
              </div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: 'white', margin: '1px 0' }}>
                4
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '9px', color: '#c5a880', fontWeight: '700' }}>
                <span style={{ fontSize: '7px' }}>▲</span> 33% <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: '500' }}>vs ayer</span>
              </div>
            </div>

            {/* KPI Card 4: Ocupación */}
            <div className="glass-card" style={{ padding: '8px 10px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '76px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.7 }}>
                <span style={{ fontSize: '9px', fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>OCUPACIÓN</span>
                <Clock size={13} color="rgba(255,255,255,0.6)" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1px 0' }}>
                <div style={{ fontSize: '18px', fontWeight: '900', color: 'white' }}>
                  86%
                </div>
                <div style={{ width: '45px', height: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: '86%', height: '100%', background: 'linear-gradient(to right, var(--champagne), #fff)', borderRadius: '2px' }} />
                </div>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '9px', color: '#c5a880', fontWeight: '700' }}>
                <span style={{ fontSize: '7px' }}>▲</span> 8% <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: '500' }}>vs ayer</span>
              </div>
            </div>
          </div>

          {/* "Estado de las sillas" Real-time panel */}
          <div className="glass-card" style={{ 
            padding: '10px 14px', 
            borderRadius: '16px', 
            border: '1px solid rgba(255, 255, 255, 0.05)', 
            backgroundColor: '#161617',
            display: 'flex',
            flexDirection: 'column',
            flex: '1.2 1 0%',
            minHeight: 0,
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: '800', color: 'white', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estado de sillas</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--champagne)' }} />
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>En tiempo real</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button style={{ width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)', cursor: 'pointer' }}>&lt;</button>
                <button style={{ width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)', cursor: 'pointer' }}>&gt;</button>
              </div>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', 
              gap: '14px',
                  flex: 1,
              minHeight: 0,
              alignItems: 'stretch'
            }}>
              {chairs.map((chair) => {
                 const isOccupied = chair.status === 'En servicio' || chair.status === 'Reservada';
                 const isCleaning = chair.status === 'Limpieza';
                 const isAvailable = chair.status === 'Disponible';

                return (
                  <div 
                    key={chair.id} 
                    onClick={() => setSelectedChair(chair)}
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.15)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      borderRadius: '16px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: 0,
                      height: '100%',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      overflow: 'hidden',
                      cursor: 'pointer'
                    }}>
                    {/* Ring glow backdrop */}
                    <div className={`chair-halo ${chair.glowClass}`} />
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 2, height: '26px', flexShrink: 0 }}>
                      <span style={{ fontSize: '15px', fontWeight: '900', color: 'rgba(255,255,255,0.2)' }}>{chair.id}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', textAlign: 'right' }}>
                        <span style={{ fontSize: '10px', fontWeight: '900', color: 'white', letterSpacing: '0.3px', lineHeight: '1' }}>{chair.type}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: chair.statusColor }} />
                          <span style={{ fontSize: '8px', fontWeight: '800', color: chair.statusColor }}>{chair.status}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, minHeight: 0, position: 'relative', zIndex: 2, margin: '4px 0' }}>
                      <img 
                        src="/barber-chair.png" 
                        alt="Silla" 
                        style={{ 
                          maxHeight: '100%', 
                          maxWidth: '100%',
                          transform: 'scale(1.25)',
                          objectFit: 'contain',
                          filter: isAvailable ? 'brightness(0.3) grayscale(0.5)' : isCleaning ? 'brightness(0.5) drop-shadow(0 8px 16px rgba(0,0,0,0.65))' : 'drop-shadow(0 8px 16px rgba(0,0,0,0.65))',
                          zIndex: 2
                        }} 
                      />
                    </div>

                    <div style={{ zIndex: 2, marginTop: 'auto', height: '36px', display: 'flex', flexDirection: 'column', justifyContent: 'center', flexShrink: 0 }}>
                      {/* Sub-widget based on status */}
                      {isOccupied && (
                        <div style={{ 
                          backgroundColor: 'rgba(0,0,0,0.45)', 
                          borderRadius: '8px', 
                          padding: '4px 6px',
                          border: '1px solid rgba(255,255,255,0.03)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          height: '100%',
                          boxSizing: 'border-box'
                        }}>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '8px',
                            fontWeight: '800',
                            color: 'var(--champagne)',
                            flexShrink: 0
                          }}>
                            {chair.name ? chair.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : ''}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '10px', fontWeight: '800', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chair.name}</div>
                            <div style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.75)', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chair.service}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '9px', fontWeight: '800', color: 'white' }}>{chair.time}</div>
                            <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.75)', fontWeight: '600' }}>{chair.duration}</div>
                          </div>
                        </div>
                      )}

                      {isCleaning && (
                        <div style={{ 
                          backgroundColor: 'rgba(0,0,0,0.45)', 
                          borderRadius: '8px', 
                          padding: '4px 6px',
                          border: '1px solid rgba(255,255,255,0.03)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          height: '100%',
                          boxSizing: 'border-box'
                        }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.2)', borderTopColor: 'white', animation: 'spin 1s linear infinite' }} />
                          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>{chair.info}</span>
                        </div>
                      )}

                      {isAvailable && (
                        <div style={{ 
                          backgroundColor: 'rgba(0,0,0,0.45)', 
                          borderRadius: '8px', 
                          padding: '4px 6px',
                          border: '1px solid rgba(255,255,255,0.03)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px',
                          height: '100%',
                          boxSizing: 'border-box'
                        }}>
                          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>{chair.info}</span>
                          <button 
                            onClick={onOpenSale}
                            style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(255,255,255,0.06)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontWeight: '800'
                            }}
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Row: Ingresos Chart, Top Services, Client Origin */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : '1.1fr 1.15fr 1fr', 
            gap: '12px',
            flex: '1 1 0%',
            minHeight: 0
          }}>
            {/* 1. Ingresos Card */}
            <div className="glass-card" style={{ padding: '12px 14px', borderRadius: '16px', backgroundColor: '#161617', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px', flexShrink: 0 }}>
                <span style={{ fontSize: '10px', fontWeight: '800', color: 'white', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Ingresos</span>
                <span style={{ fontSize: '8.5px', fontWeight: '700', color: 'rgba(255,255,255,0.75)', cursor: 'pointer' }}>Esta semana ▾</span>
              </div>
              <div style={{ flexShrink: 0, marginBottom: '6px' }}>
                <div style={{ fontSize: '18px', fontWeight: '900', color: 'white' }}>
                  $6.580.000
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '9px', color: '#c5a880', fontWeight: '700', marginTop: '2px' }}>
                  <span style={{ fontSize: '7px' }}>▲</span> 18% <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: '500' }}>vs semana anterior</span>
                </div>
              </div>
              <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                <Line 
                  data={{
                    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
                    datasets: [
                      {
                        data: [450, 520, 480, 600, 720, 950, 920],
                        borderColor: '#c5a880',
                        borderWidth: 2,
                        pointBackgroundColor: '#c5a880',
                        pointBorderColor: '#161617',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        tension: 0.4,
                        fill: true,
                        backgroundColor: (context) => {
                          const chart = context.chart;
                          const { ctx, chartArea } = chart;
                          if (!chartArea) return null;
                          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                          gradient.addColorStop(0, 'rgba(197, 168, 128, 0.2)');
                          gradient.addColorStop(1, 'rgba(197, 168, 128, 0.0)');
                          return gradient;
                        },
                      }
                    ]
                  }} 
                  options={chartOptions} 
                />
              </div>
            </div>

            {/* 2. Servicios más vendidos */}
            <div className="glass-card" style={{ padding: '12px 14px', borderRadius: '16px', backgroundColor: '#161617', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', minHeight: 0 }}>
              <div style={{ flexShrink: 0, marginBottom: '6px' }}>
                <h4 style={{ fontSize: '10px', fontWeight: '800', color: 'white', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Servicios más vendidos</h4>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', flex: 1, margin: '2px 0' }} className="panda-scrollbar">
                {[
                  { name: 'Degradado + Barba', val: 236 },
                  { name: 'Corte Clásico', val: 189 },
                  { name: 'Corte + Barba', val: 142 },
                  { name: 'Afeitado Premium', val: 98 },
                  { name: 'Diseño', val: 67 }
                ].map((s, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10.5px', paddingBottom: '2px', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <span style={{ color: 'white', fontWeight: '600' }}>
                      <span style={{ color: 'rgba(255,255,255,0.35)', marginRight: '6px', fontWeight: '800' }}>{idx + 1}</span> {s.name}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>{s.val}</span>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => onNavigate && onNavigate('services')}
                style={{
                  width: '100%',
                  marginTop: '6px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px',
                  padding: '7px 0',
                  color: 'white',
                  fontSize: '10.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'background 0.2s',
                  flexShrink: 0
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
              >
                Ver todos los servicios
              </button>
            </div>

            {/* 3. Clientes por origen */}
            <div className="glass-card" style={{ padding: '12px 14px', borderRadius: '16px', backgroundColor: '#161617', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              <div style={{ flexShrink: 0, marginBottom: '6px' }}>
                <h4 style={{ fontSize: '10px', fontWeight: '800', color: 'white', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Clientes por origen</h4>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minHeight: 0 }}>
                {/* SVG Donut */}
                <div style={{ position: 'relative', width: '65px', height: '65px', flexShrink: 0 }}>
                  <svg width="65" height="65" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="4" />
                    {/* Instagram (52%) */}
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--champagne)" strokeWidth="4" strokeDasharray="52 48" strokeDashoffset="25" />
                    {/* Referidos (28%) */}
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="4" strokeDasharray="28 72" strokeDashoffset="-27" />
                    {/* Presencial (20%) */}
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" strokeDasharray="20 80" strokeDashoffset="-55" />
                  </svg>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
                  {[
                    { label: 'Instagram', val: '52%', color: 'var(--champagne)' },
                    { label: 'Referidos', val: '28%', color: 'rgba(255,255,255,0.6)' },
                    { label: 'Presencial', val: '20%', color: 'rgba(255,255,255,0.2)' }
                  ].map((origin, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9.5px', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: origin.color }} />
                        <span style={{ color: 'rgba(255,255,255,0.65)', fontWeight: '500' }}>{origin.label}</span>
                      </div>
                      <span style={{ color: 'white', fontWeight: '800' }}>{origin.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Summary Footer */}
              <div style={{ 
                marginTop: '4px', 
                borderTop: '1px solid rgba(255,255,255,0.03)', 
                paddingTop: '6px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                flexShrink: 0
              }}>
                <div>
                  <div style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.75)', fontWeight: '600' }}>Clientes totales</div>
                  <div style={{ fontSize: '13px', fontWeight: '900', color: 'white' }}>248</div>
                </div>
                <div style={{ fontSize: '8.5px', color: '#c5a880', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <span>▲ 15%</span> <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: '500' }}>vs semana ant.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Appointments & Schedule Widget */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px', 
          height: '100%',
          minHeight: 0,
          overflow: 'hidden'
        }}>
          {/* Card 1: Próximas citas */}
          <div className="glass-card" style={{ 
            padding: '12px 14px', 
            borderRadius: '16px', 
            backgroundColor: '#161617', 
            border: '1px solid rgba(255,255,255,0.05)', 
            display: 'flex', 
            flexDirection: 'column', 
            flex: '1.2 1 0%', 
            minHeight: 0,
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexShrink: 0 }}>
              <h3 style={{ fontSize: '11.5px', fontWeight: '800', color: 'white', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Próximas citas</h3>
              <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.75)', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => onNavigate && onNavigate('scheduling')}>Ver calendario</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', flex: 1 }} className="panda-scrollbar">
              {[
                { time: '10:00 AM', name: 'Miguel Torres', service: 'Corte Clásico', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=60', status: 'active' },
                { time: '10:45 AM', name: 'Andrés Gómez', service: 'Fade + Barba', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=60', status: 'active' },
                { time: '11:30 AM', name: 'Luis Martínez', service: 'Degradado', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=60', status: 'active' },
                { time: '12:15 PM', name: 'David Rojas', service: 'Afeitado Premium', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=60', status: 'inactive' },
                { time: '01:00 PM', name: 'Sebastián López', service: 'Corte + Barba', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=60', status: 'inactive' }
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.02)', flexShrink: 0 }}>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.6)', width: '60px' }}>{item.time}</span>
                  <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '9px',
                    fontWeight: '800',
                    color: 'var(--champagne)',
                    flexShrink: 0
                  }}>
                    {item.name ? item.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : ''}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '11.5px', fontWeight: '700', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                    <div style={{ fontSize: '9.5px', color: 'rgba(255,255,255,0.75)', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.service}</div>
                  </div>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: item.status === 'active' ? 'var(--champagne)' : 'rgba(255,255,255,0.2)' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Acciones Rápidas */}
          <div className="glass-card" style={{ 
            padding: '10px 12px', 
            borderRadius: '16px', 
            backgroundColor: '#161617', 
            border: '1px solid rgba(255,255,255,0.05)', 
            display: 'flex', 
            flexDirection: 'column', 
            flexShrink: 0
          }}>
            <h3 style={{ fontSize: '10px', fontWeight: '800', color: 'white', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Acciones rápidas</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {[
                { label: 'Nueva Cita', action: onOpenSale, icon: Plus },
                { label: 'Cliente', action: () => onNavigate && onNavigate('clients'), icon: User },
                { label: 'Cobro POS', action: onOpenSale, icon: ShoppingBag },
                { label: 'Inventario', action: () => onNavigate && onNavigate('inventory'), icon: ScissorsIcon }
              ].map((act, idx) => {
                const ActIcon = act.icon;
                return (
                  <button 
                    key={idx}
                    onClick={act.action}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '8px 4px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      color: 'rgba(255,255,255,0.8)',
                      cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = 'rgba(197, 168, 128, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(197, 168, 128, 0.3)';
                      e.currentTarget.style.color = 'var(--champagne)';
                      e.currentTarget.style.transform = 'translateY(-1.5px)';
                      e.currentTarget.style.boxShadow = '0 4px 10px rgba(197, 168, 128, 0.1)';
                      const icon = e.currentTarget.querySelector('svg');
                      if (icon) icon.style.color = 'var(--champagne)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                      const icon = e.currentTarget.querySelector('svg');
                      if (icon) icon.style.color = 'rgba(255,255,255,0.6)';
                    }}
                  >
                    <ActIcon size={13} color="rgba(255,255,255,0.6)" style={{ transition: 'color 0.25s' }} />
                    <span style={{ fontSize: '9px', fontWeight: '700' }}>{act.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 3: Top 3 Barberos del Mes (Podium Style) */}
          <div className="glass-card" style={{ 
            padding: '14px 16px', 
            borderRadius: '16px', 
            backgroundColor: '#161617', 
            border: '1px solid rgba(255,255,255,0.05)', 
            display: 'flex', 
            flexDirection: 'column', 
            flexShrink: 0
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '26px', 
                  height: '26px', 
                  borderRadius: '8px', 
                  backgroundColor: 'rgba(197, 168, 128, 0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <Trophy size={14} color="var(--champagne)" />
                </div>
                <h3 style={{ fontSize: '12px', fontWeight: '900', margin: 0, color: 'white', letterSpacing: '-0.3px' }}>
                  Top <span style={{ color: 'var(--champagne)' }}>Barbers</span>
                </h3>
              </div>
            </div>

            {/* Podium Grid */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-around', 
              alignItems: 'flex-end', 
              padding: '15px 0 5px 0', 
              minHeight: '175px', 
              position: 'relative' 
            }}>
              
              {/* 2nd Place (Left) */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%' }}>
                {/* Avatar Frame with Border */}
                <div style={{ position: 'relative', marginBottom: '8px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    border: '2px solid #a1a1aa',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255,255,255,0.02)'
                  }}>
                    <img 
                      src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=60" 
                      alt="Luis Gómez" 
                      style={{ width: '100%', height: '100%', borderRadius: '8px', objectFit: 'cover' }} 
                    />
                  </div>
                  {/* Rank Badge */}
                  <div style={{
                    position: 'absolute',
                    bottom: '-6px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '15px',
                    height: '15px',
                    borderRadius: '50%',
                    backgroundColor: '#a1a1aa',
                    color: 'black',
                    fontSize: '8.5px',
                    fontWeight: '950',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                  }}>
                    2
                  </div>
                </div>
                
                {/* Info */}
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'white', marginTop: '2px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>Luis</span>
                <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--champagne)', marginTop: '2px' }}>$2,120</span>
                <span style={{ fontSize: '6.5px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', letterSpacing: '0.2px', marginTop: '1px' }}>MES EN CURSO</span>

                {/* Podium Block */}
                <div style={{
                  width: '34px',
                  height: '22px',
                  background: 'linear-gradient(to bottom, rgba(161, 161, 170, 0.2), rgba(161, 161, 170, 0.03))',
                  border: '1.5px solid rgba(161, 161, 170, 0.25)',
                  borderBottom: 'none',
                  borderRadius: '6px 6px 0 0',
                  marginTop: '8px'
                }} />
              </div>

              {/* 1st Place (Center - Elevated) */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '34%', transform: 'translateY(-14px)' }}>
                {/* Avatar Frame with Border & Glow */}
                <div style={{ position: 'relative', marginBottom: '8px' }}>
                  {/* Floating Crown */}
                  <div style={{ position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}>
                    <Crown size={12} color="var(--champagne)" fill="var(--champagne)" />
                  </div>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    border: '2px solid var(--champagne)',
                    boxShadow: '0 0 10px rgba(197, 168, 128, 0.45)',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(197, 168, 128, 0.05)'
                  }}>
                    <img 
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=60" 
                      alt="Mateo Fernández" 
                      style={{ width: '100%', height: '100%', borderRadius: '10px', objectFit: 'cover' }} 
                    />
                  </div>
                  {/* Rank Badge */}
                  <div style={{
                    position: 'absolute',
                    bottom: '-6px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--champagne)',
                    color: 'black',
                    fontSize: '9px',
                    fontWeight: '950',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                  }}>
                    1
                  </div>
                </div>
                
                {/* Info */}
                <span style={{ fontSize: '12.5px', fontWeight: '900', color: 'white', marginTop: '2px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>Mateo</span>
                <span style={{ fontSize: '11.5px', fontWeight: '900', color: 'var(--champagne)', marginTop: '2px' }}>$2,840</span>
                <span style={{ fontSize: '6.5px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', letterSpacing: '0.2px', marginTop: '1px' }}>MES EN CURSO</span>

                {/* Podium Block */}
                <div style={{
                  width: '38px',
                  height: '35px',
                  background: 'linear-gradient(to bottom, rgba(197, 168, 128, 0.22), rgba(197, 168, 128, 0.03))',
                  border: '1.5px solid rgba(197, 168, 128, 0.3)',
                  borderBottom: 'none',
                  borderRadius: '6px 6px 0 0',
                  marginTop: '8px'
                }} />
              </div>

              {/* 3rd Place (Right) */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%' }}>
                {/* Avatar Frame with Border */}
                <div style={{ position: 'relative', marginBottom: '8px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    border: '2px solid #b45309',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255,255,255,0.02)'
                  }}>
                    <img 
                      src="https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=60" 
                      alt="Alejandro Ruiz" 
                      style={{ width: '100%', height: '100%', borderRadius: '8px', objectFit: 'cover' }} 
                    />
                  </div>
                  {/* Rank Badge */}
                  <div style={{
                    position: 'absolute',
                    bottom: '-6px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '15px',
                    height: '15px',
                    borderRadius: '50%',
                    backgroundColor: '#b45309',
                    color: 'white',
                    fontSize: '8.5px',
                    fontWeight: '950',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                  }}>
                    3
                  </div>
                </div>
                
                {/* Info */}
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'white', marginTop: '2px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>Alejandro</span>
                <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--champagne)', marginTop: '2px' }}>$1,850</span>
                <span style={{ fontSize: '6.5px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', letterSpacing: '0.2px', marginTop: '1px' }}>MES EN CURSO</span>

                {/* Podium Block */}
                <div style={{
                  width: '34px',
                  height: '14px',
                  background: 'linear-gradient(to bottom, rgba(180, 83, 9, 0.2), rgba(180, 83, 9, 0.03))',
                  border: '1.5px solid rgba(180, 83, 9, 0.25)',
                  borderBottom: 'none',
                  borderRadius: '6px 6px 0 0',
                  marginTop: '8px'
                }} />
              </div>

            </div>
          </div>

          {/* Card 4: Meta Mensual */}
          <div 
            onClick={() => setIsEditingGoals(true)}
            className="glass-card" 
            style={{ 
              padding: '8px 12px', 
              borderRadius: '16px', 
              backgroundColor: '#161617', 
              border: '1px solid rgba(255,255,255,0.05)', 
              display: 'flex', 
              flexDirection: 'column', 
              flexShrink: 0,
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9.5px', color: 'rgba(255,255,255,0.75)', fontWeight: '700', marginBottom: '4px' }}>
              <span>META MENSUAL</span>
              <Edit3 size={10.5} color="var(--champagne)" style={{ opacity: 0.7 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '900', color: 'white' }}>
                ${formatCurrency(currentMonthAmount)} <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>/ ${formatCurrency(monthlyGoal)}</span>
              </span>
              <span style={{ fontSize: '10.5px', fontWeight: '900', color: 'var(--champagne)' }}>
                {monthlyProgress}%
              </span>
            </div>
            <div style={{ height: '5px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '2.5px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, monthlyProgress)}%`, height: '100%', background: 'linear-gradient(to right, #c5a880, #e5d4bc)', borderRadius: '2.5px' }} />
            </div>
          </div>

        </div>

      </div>

      {/* Edit Chair Modal */}
      <AnimatedModal isOpen={!!selectedChair}>
        {(overlayClass, cardClass) => (
          selectedChair && (
            <div className={`${overlayClass} global-modal-overlay`} style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '16px'
            }}>
              <div className={`${cardClass} glass-card global-modal-card modal-small`} style={{
              width: '100%',
              maxWidth: '420px',
              backgroundColor: '#161617',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.8)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'white', margin: 0 }}>EDITAR SILLA {selectedChair.id}</h3>
                <button 
                  onClick={(e) => { e.stopPropagation(); setSelectedChair(null); }} 
                  style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.75)', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.75)' }}>BARBERO</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div style={{ position: 'absolute', left: '12px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center' }}>
                    <Crown size={15} color="var(--champagne)" />
                  </div>
                  <input 
                    type="text" 
                    value={selectedChair.type || ''} 
                    onChange={(e) => setSelectedChair({ ...selectedChair, type: e.target.value })}
                    placeholder="Ej. Luis Gómez"
                    className="premium-modal-input"
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '12px 12px 12px 36px',
                      color: 'white',
                      outline: 'none',
                      fontSize: '13px',
                      transition: 'all 0.25s ease',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.75)' }}>ESTADO</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[
                    { val: 'Disponible', label: 'Disponible', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)', glow: 'rgba(34, 197, 94, 0.4)' },
                    { val: 'En servicio', label: 'En servicio', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', glow: 'rgba(239, 68, 68, 0.4)' },
                    { val: 'Limpieza', label: 'Limpieza', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)', glow: 'rgba(234, 179, 8, 0.4)' },
                    { val: 'Reservada', label: 'Reservada', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', glow: 'rgba(249, 115, 22, 0.4)' }
                  ].map(opt => {
                    const isSelected = selectedChair.status === opt.val;
                    return (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => {
                          let glow = 'chair-halo-disponible';
                          let sCol = '#22c55e';
                          if (opt.val === 'En servicio') {
                            glow = 'chair-halo-en-servicio';
                            sCol = '#ef4444';
                          } else if (opt.val === 'Limpieza') {
                            glow = 'chair-halo-limpieza';
                            sCol = '#eab308';
                          } else if (opt.val === 'Reservada') {
                            glow = 'chair-halo-reservada';
                            sCol = '#f97316';
                          }
                          setSelectedChair({
                            ...selectedChair,
                            status: opt.val,
                            glowClass: glow,
                            statusColor: sCol
                          });
                        }}
                        style={{
                          padding: '12px 10px',
                          borderRadius: '12px',
                          border: isSelected ? `2px solid ${opt.color}` : '1px solid rgba(255,255,255,0.08)',
                          background: isSelected ? opt.bg : 'rgba(255,255,255,0.03)',
                          color: isSelected ? 'white' : 'rgba(255,255,255,0.6)',
                          fontWeight: '800',
                          fontSize: '11px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease',
                          transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                          boxShadow: isSelected ? `0 0 15px ${opt.glow}` : 'none'
                        }}
                      >
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: opt.color, boxShadow: `0 0 6px ${opt.color}` }} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {(selectedChair.status === 'En servicio' || selectedChair.status === 'Reservada') && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.75)' }}>CLIENTE</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <div style={{ position: 'absolute', left: '12px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center' }}>
                        <User size={15} color="var(--champagne)" />
                      </div>
                      <input 
                        type="text" 
                        value={selectedChair.name || ''} 
                        onChange={(e) => setSelectedChair({ ...selectedChair, name: e.target.value })}
                        placeholder="Ej. Juan Pérez"
                        className="premium-modal-input"
                        style={{
                          width: '100%',
                          backgroundColor: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          padding: '12px 12px 12px 36px',
                          color: 'white',
                          outline: 'none',
                          fontSize: '13px',
                          transition: 'all 0.25s ease',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.75)' }}>SERVICIO</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <div style={{ position: 'absolute', left: '12px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center' }}>
                        <ScissorsIcon size={15} color="var(--champagne)" />
                      </div>
                      <input 
                        type="text" 
                        value={selectedChair.service || ''} 
                        onChange={(e) => setSelectedChair({ ...selectedChair, service: e.target.value })}
                        placeholder="Ej. Corte + Barba"
                        className="premium-modal-input"
                        style={{
                          width: '100%',
                          backgroundColor: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          padding: '12px 12px 12px 36px',
                          color: 'white',
                          outline: 'none',
                          fontSize: '13px',
                          transition: 'all 0.25s ease',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.75)' }}>HORA INICIO</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <div style={{ position: 'absolute', left: '12px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center' }}>
                          <Clock size={15} color="var(--champagne)" />
                        </div>
                        <input 
                          type="text" 
                          value={selectedChair.time || ''} 
                          onChange={(e) => setSelectedChair({ ...selectedChair, time: e.target.value })}
                          placeholder="Ej. 09:30 AM"
                          className="premium-modal-input"
                          style={{
                            width: '100%',
                            backgroundColor: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            padding: '12px 12px 12px 36px',
                            color: 'white',
                            outline: 'none',
                            fontSize: '13px',
                            transition: 'all 0.25s ease',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.75)' }}>DURACIÓN</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <div style={{ position: 'absolute', left: '12px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center' }}>
                          <Clock size={15} color="var(--champagne)" />
                        </div>
                        <input 
                          type="text" 
                          value={selectedChair.duration || ''} 
                          onChange={(e) => setSelectedChair({ ...selectedChair, duration: e.target.value })}
                          placeholder="Ej. 30 min"
                          className="premium-modal-input"
                          style={{
                            width: '100%',
                            backgroundColor: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            padding: '12px 12px 12px 36px',
                            color: 'white',
                            outline: 'none',
                            fontSize: '13px',
                            transition: 'all 0.25s ease',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {(selectedChair.status === 'Limpieza' || selectedChair.status === 'Disponible') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.75)' }}>INFORMACIÓN DE ESTADO</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <div style={{ position: 'absolute', left: '12px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center' }}>
                      <Sparkles size={15} color="var(--champagne)" />
                    </div>
                    <input 
                      type="text" 
                      value={selectedChair.info || ''} 
                      onChange={(e) => setSelectedChair({ ...selectedChair, info: e.target.value })}
                      placeholder={selectedChair.status === 'Limpieza' ? 'Ej. Disponible en 10 min' : 'Ej. Próximo: 11:00 AM'}
                      className="premium-modal-input"
                      style={{
                        width: '100%',
                        backgroundColor: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        padding: '12px 12px 12px 36px',
                        color: 'white',
                        outline: 'none',
                        fontSize: '13px',
                        transition: 'all 0.25s ease',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button 
                  onClick={(e) => { e.stopPropagation(); setSelectedChair(null); }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'white',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const updatedChairs = chairs.map(c => {
                      if (c.id === selectedChair.id) {
                        return selectedChair;
                      }
                      return c;
                    });
                    setChairs(updatedChairs);
                    localStorage.setItem('panda_chairs_state', JSON.stringify(updatedChairs));
                    setSelectedChair(null);
                    showToast('Silla actualizada correctamente.');
                  }}
                  className="premium-btn-gold"
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  Guardar
                </button>
              </div>
              </div>
            </div>
          )
        )}
      </AnimatedModal>

      {/* Edit Goals Modal */}
      <AnimatedModal isOpen={isEditingGoals}>
        {(overlayClass, cardClass) => (
          isEditingGoals && (
            <div className={`${overlayClass} global-modal-overlay`} style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '16px'
            }}>
              <div className={`${cardClass} glass-card global-modal-card modal-small`} style={{
              width: '100%',
              maxWidth: '360px',
              backgroundColor: '#161617',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.8)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'white', margin: 0 }}>EDITAR META MENSUAL</h3>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsEditingGoals(false); }} 
                  style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.75)', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.75)' }}>FACTURACIÓN ACTUAL ($)</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div style={{ position: 'absolute', left: '12px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center' }}>
                    <DollarSign size={15} color="var(--champagne)" />
                  </div>
                  <input 
                    type="number" 
                    step="1"
                    value={currentMonthAmount} 
                    onChange={(e) => setCurrentMonthAmount(parseFloat(e.target.value) || 0)}
                    placeholder="Ej. 28400"
                    className="premium-modal-input"
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '12px 12px 12px 36px',
                      color: 'white',
                      outline: 'none',
                      fontSize: '13px',
                      transition: 'all 0.25s ease',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.75)' }}>META DEL MES ($)</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div style={{ position: 'absolute', left: '12px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center' }}>
                    <Target size={15} color="var(--champagne)" />
                  </div>
                  <input 
                    type="number" 
                    step="1"
                    value={monthlyGoal} 
                    onChange={(e) => setMonthlyGoal(parseFloat(e.target.value) || 1)}
                    placeholder="Ej. 35000"
                    className="premium-modal-input"
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '12px 12px 12px 36px',
                      color: 'white',
                      outline: 'none',
                      fontSize: '13px',
                      transition: 'all 0.25s ease',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsEditingGoals(false); }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'white',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    localStorage.setItem('panda_current_month_amount', currentMonthAmount.toString());
                    localStorage.setItem('panda_monthly_goal', monthlyGoal.toString());
                    setIsEditingGoals(false);
                    showToast('Meta mensual actualizada correctamente.');
                  }}
                  className="premium-btn-gold"
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  Guardar
                </button>
              </div>
              </div>
            </div>
          )
        )}
      </AnimatedModal>
      <style>{`
        /* ── AMBIENT CINEMATIC ORBS ── */
        .l-dashboard-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(130px);
          z-index: 0;
          pointer-events: none;
          animation: orb-float 22s infinite ease-in-out;
        }
        .l-orb-1 {
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(203,183,154,0.55) 0%, rgba(180,140,90,0.2) 40%, transparent 70%);
          opacity: 0.07;
          top: -15%;
          right: -12%;
          animation-duration: 28s;
        }
        .l-orb-2 {
          width: 700px;
          height: 700px;
          background: radial-gradient(circle, rgba(120,80,180,0.5) 0%, rgba(80,40,140,0.2) 40%, transparent 70%);
          opacity: 0.05;
          bottom: -25%;
          left: -18%;
          animation-duration: 36s;
          animation-delay: -8s;
        }
        .l-orb-3 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(203,183,154,0.4) 0%, transparent 70%);
          opacity: 0.04;
          top: 40%;
          left: 45%;
          animation-duration: 20s;
          animation-delay: -14s;
        }
        @keyframes orb-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(50px, -70px) scale(1.12); }
          66% { transform: translate(-40px, 55px) scale(0.92); }
        }

        @keyframes wave-animation {
          0% { transform: rotate( 0.0deg) }
          10% { transform: rotate(14.0deg) }
          20% { transform: rotate(-8.0deg) }
          30% { transform: rotate(14.0deg) }
          40% { transform: rotate(-4.0deg) }
          50% { transform: rotate(10.0deg) }
          60% { transform: rotate( 0.0deg) }
          100% { transform: rotate( 0.0deg) }
        }

        /* ── PREMIUM GLASS CARD HOVER ── */
        .glass-card {
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), 
                      border-color 0.35s ease, 
                      box-shadow 0.35s ease !important;
        }
        .glass-card:hover {
          transform: translateY(-3px) !important;
          border-color: rgba(203, 183, 154, 0.15) !important;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7), 0 0 20px rgba(203,183,154,0.04) !important;
        }
      `}</style>
    </div>
  );
};

export default DashboardModule;
