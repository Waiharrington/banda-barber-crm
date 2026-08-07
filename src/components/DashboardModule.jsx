import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import CheckoutPOS from './CheckoutPOS';
import NewClientModal from './NewClientModal';
import NewAppointmentModal from './NewAppointmentModal';
const ReceptionModule = lazy(() => import('./ReceptionModule'));
const PersonnelModule = lazy(() => import('./PersonnelModule'));
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
  Bell,
  Store,
  ChevronDown,
  UserX,
  CreditCard,
  Wallet
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
  onOpenSchedule,
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
  const [globalSearch, setGlobalSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
  const searchContainerRef = useRef(null);

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

  useEffect(() => {
    const handleOutsideSearch = event => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsSearchOpen(false);
        setActiveSearchIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleOutsideSearch);
    return () => document.removeEventListener('mousedown', handleOutsideSearch);
  }, []);
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getShortName = (fullName) => fullName ? fullName.split(' ')[0] : '';
  const staffList = dbData?.staff || [];
  const sortedStaff = [...staffList]
    .filter(s => {
      const role = String(s.role || '').toLowerCase();
      return role.includes('barbero') || role.includes('tatuador');
    })
    .sort((a, b) => (b.stats?.monthlyIncome || 0) - (a.stats?.monthlyIncome || 0));

  const firstPlace = sortedStaff[0] || { name: 'Sin datos', stats: { monthlyIncome: 0 }, image_url: '' };
  const secondPlace = sortedStaff[1] || { name: 'Sin datos', stats: { monthlyIncome: 0 }, image_url: '' };
  const thirdPlace = sortedStaff[2] || { name: 'Sin datos', stats: { monthlyIncome: 0 }, image_url: '' };
  const [realtimeAppointments, setRealtimeAppointments] = useState([]);
  const [attendanceQueue, setAttendanceQueue] = useState([]);

  const normalizeSearchValue = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const searchTerm = normalizeSearchValue(globalSearch);
  const searchableAppointments = [
    ...(dbData?.todayAppointments || []),
    ...(dbData?.appointments || [])
  ].filter((appointment, index, appointments) =>
    appointments.findIndex(item => String(item.id) === String(appointment.id)) === index
  );

  const globalSearchResults = searchTerm.length < 2
    ? []
    : [
        ...(dbData?.clients || [])
          .filter(client => normalizeSearchValue([
            client.name,
            client.phone,
            client.id_card
          ].filter(Boolean).join(' ')).includes(searchTerm))
          .map(client => ({
            id: `client-${client.id}`,
            type: 'client',
            title: client.name || 'Cliente',
            subtitle: [client.phone, client.id_card].filter(Boolean).join(' · ') || 'Ficha de cliente',
            data: client
          })),
        ...searchableAppointments
          .filter(appointment => normalizeSearchValue([
            appointment.clients?.name,
            appointment.services?.name,
            appointment.staff?.name,
            appointment.status
          ].filter(Boolean).join(' ')).includes(searchTerm))
          .map(appointment => ({
            id: `appointment-${appointment.id}`,
            type: 'appointment',
            title: appointment.clients?.name || 'Cita',
            subtitle: [
              appointment.services?.name || 'Servicio',
              appointment.staff?.name,
              appointment.status
            ].filter(Boolean).join(' · '),
            data: appointment
          })),
        ...staffList
          .filter(member => normalizeSearchValue([
            member.name,
            member.role,
            member.phone,
            member.id_card
          ].filter(Boolean).join(' ')).includes(searchTerm))
          .map(member => ({
            id: `staff-${member.id}`,
            type: 'staff',
            title: member.name || 'Personal',
            subtitle: member.role || 'Miembro del equipo',
            data: member
          }))
      ].slice(0, 8);

  const selectGlobalSearchResult = result => {
    if (!result) return;

    if (result.type === 'client') {
      onNavigate?.('clients', { clientId: result.data.id });
    } else if (result.type === 'appointment') {
      onNavigate?.('scheduling', { appointmentId: result.data.id });
    } else {
      onNavigate?.('personnel', { staffId: result.data.id });
    }

    setGlobalSearch('');
    setIsSearchOpen(false);
    setActiveSearchIndex(-1);
  };

  const handleGlobalSearchKeyDown = event => {
    if (event.key === 'Escape') {
      setIsSearchOpen(false);
      setActiveSearchIndex(-1);
      event.currentTarget.blur();
      return;
    }

    if (globalSearchResults.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsSearchOpen(true);
      setActiveSearchIndex(index => (index + 1) % globalSearchResults.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsSearchOpen(true);
      setActiveSearchIndex(index =>
        index <= 0 ? globalSearchResults.length - 1 : index - 1
      );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      selectGlobalSearchResult(globalSearchResults[activeSearchIndex >= 0 ? activeSearchIndex : 0]);
    }
  };

  // --- Real Database Metrics Calculations ---
  const getLocalDateKey = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayStr = getLocalDateKey();

  const citasHoyCount = stats?.appointments ?? dbData?.todayAppointments?.length ?? 0;
  const facturadoHoyAmount = stats?.income || 0;
  const clientesNuevosCount = stats?.newClientsToday ??
    (dbData?.clients || []).filter(client => {
      if (client.created_at && getLocalDateKey(new Date(client.created_at)) === todayStr) return true;
      const validApps = Array.isArray(client.appointments)
        ? client.appointments.filter(a => ['Completado', 'En Silla', 'Por Pagar'].includes(a.status))
        : [];
      if (validApps.length === 1) {
        const appDate = validApps[0].completed_at || validApps[0].scheduled_at || validApps[0].created_at;
        if (appDate && getLocalDateKey(new Date(appDate)) === todayStr) return true;
      }
      return false;
    }).length;

  const occupiedChairsCount = (realtimeAppointments || []).filter(a => a.status === 'En Silla').length;
  const totalChairs = 7;
  const ocupacionPercent = Math.round((occupiedChairsCount / totalChairs) * 100);

  const activeBarbers = staffList.filter(member => {
    const role = String(member.role || '').toLowerCase();
    return member.active !== false
      && !role.includes('archived')
      && (role.includes('barbero') || role.includes('barber'));
  });
  const checkedInBarberIds = new Set(
    attendanceQueue
      .filter(entry => entry.status !== 'ABSENT')
      .map(entry => String(entry.staff_id))
  );
  const barbersPendingArrival = activeBarbers.filter(
    member => !checkedInBarberIds.has(String(member.id))
  );
  const pendingBarbersCount = barbersPendingArrival.length;

  const realUpcomingAppointments = (dbData?.todayAppointments || [])
    .filter(a => a.status === 'Agendado')
    .sort((a, b) => new Date(a.scheduled_at || 0) - new Date(b.scheduled_at || 0))
    .map(a => {
      let timeFormatted = 'Ahora';
      if (a.scheduled_at) {
        const d = new Date(a.scheduled_at);
        const h = d.getHours();
        const m = d.getMinutes().toString().padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        timeFormatted = `${h12}:${m} ${ampm}`;
      }
      return {
        id: a.id,
        time: timeFormatted,
        name: a.clients?.name || 'Cliente',
        service: a.services?.name || 'Servicio',
        barber: a.staff?.name || 'Barbero',
        avatar: a.staff?.image_url,
        status: a.status
      };
    });

  const weeklyIncomeAmount = stats?.weeklyIncome || stats?.income || 0;

  const serviceCounts = {};
  (dbData?.appointments || []).forEach(a => {
    const sName = a.services?.name;
    if (sName) serviceCounts[sName] = (serviceCounts[sName] || 0) + 1;
  });
  const sortedServices = Object.entries(serviceCounts)
    .map(([name, val]) => ({ name, val }))
    .sort((a, b) => b.val - a.val);

  const finalTopServices = sortedServices.length > 0
    ? sortedServices.slice(0, 5)
    : (dbData?.services || []).slice(0, 5).map(s => ({ name: s.name, val: 0 }));

  const realTotalClients = dbData?.clients?.length || 0;
  const originCounts = {};
  (dbData?.clients || []).forEach(c => {
    const origin = String(c.origin || c.source || c.referral_source || 'Sin registrar').trim();
    originCounts[origin] = (originCounts[origin] || 0) + 1;
  });
  const originColors = ['var(--champagne)', 'rgba(255,255,255,0.6)', 'rgba(255,255,255,0.2)'];
  const originPercentages = Object.entries(originCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([label, count], index) => {
      const pct = realTotalClients ? Math.round((count / realTotalClients) * 100) : 0;
      return { label, val: `${pct}%`, color: originColors[index], pct };
    });
  let originGradientOffset = 0;
  const originGradient = originPercentages.length
    ? `conic-gradient(${originPercentages.map(origin => {
        const start = originGradientOffset;
        originGradientOffset += origin.pct;
        return `${origin.color} ${start}% ${originGradientOffset}%`;
      }).join(', ')})`
    : 'conic-gradient(rgba(255,255,255,0.04) 0 100%)';

  const currentMonthAmountReal = stats?.monthlyIncome || 0;

  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [monthlyGoal, setMonthlyGoal] = useState(() => {
    const val = parseFloat(localStorage.getItem('panda_monthly_goal') || '35000');
    return val < 1000 ? val * 1000 : val;
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [selectedChair, setSelectedChair] = useState(null);
  const [chairPage, setChairPage] = useState(0);
  const [checkoutChairModal, setCheckoutChairModal] = useState(null);
  const [modalPaymentMethod, setModalPaymentMethod] = useState('Efectivo');
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [showCheckoutPopup, setShowCheckoutPopup] = useState(false);
  const [showAttendancePopup, setShowAttendancePopup] = useState(false);
  const [showReceptionPopup, setShowReceptionPopup] = useState(false);
  const [showSchedulePopup, setShowSchedulePopup] = useState(false);

  useEffect(() => {
    const fetchChairData = async () => {
      try {
        const [activeApps, queue] = await Promise.all([
          dataService.getAppointmentsByState(['En Silla', 'Agendado']),
          dataService.getTurnQueue().catch(() => [])
        ]);
        setRealtimeAppointments(activeApps || []);
        setAttendanceQueue(queue || []);
      } catch (e) {
        console.error("Error fetching realtime chair data:", e);
      }
    };
    fetchChairData();
    const interval = setInterval(fetchChairData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleQuickCheckout = async () => {
    if (!checkoutChairModal) return;
    try {
      setIsProcessingCheckout(true);
      const chair = checkoutChairModal;
      
      await dataService.processFinalPayment({
        appointmentId: chair.appointmentId,
        appointmentIds: [chair.appointmentId],
        paymentMethod: modalPaymentMethod,
        totalAmountUsd: chair.rawPrice || 0,
        staffInvolved: chair.appointment?.staff_id ? [{ staffId: chair.appointment.staff_id, role: 'barber', amountUsd: chair.rawPrice || 0 }] : []
      });

      showToast(`¡Cobro de ${chair.price} registrado con éxito! Silla liberada.`);
      setCheckoutChairModal(null);
      
      const activeApps = await dataService.getAppointmentsByState(['En Silla', 'Agendado']);
      setRealtimeAppointments(activeApps || []);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Error processing quick checkout:", err);
      showToast("Error al procesar el cobro", "error");
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const formatElapsedTime = React.useCallback((startedAt) => {
    if (!startedAt) return '00:00 min';
    const start = new Date(startedAt);
    const now = currentTime;
    const diffMs = Math.max(0, now.getTime() - start.getTime());
    const totalSecs = Math.floor(diffMs / 1000);

    if (totalSecs < 3600) {
      const mins = Math.floor(totalSecs / 60);
      const secs = String(totalSecs % 60).padStart(2, '0');
      return `${mins}:${secs} min`;
    } else {
      const hrs = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      return `${hrs}h ${mins}m`;
    }
  }, [currentTime]);

  const allChairsData = React.useMemo(() => {
    const activeInChair = realtimeAppointments.filter(a => a.status === 'En Silla');
    const result = [];

    for (let i = 1; i <= 7; i++) {
      const chairId = String(i).padStart(2, '0');
      const activeApp = activeInChair[i - 1];

      if (activeApp) {
        const elapsedStr = formatElapsedTime(activeApp.started_at || activeApp.created_at);

        const priceVal = activeApp.total_price || activeApp.services?.price || 0;
        const priceStr = `$${priceVal}`;

        const barber = activeApp.staff || {};
        const barberName = barber.name || activeApp.staff_name || `Barbero`;

        result.push({
          id: chairId,
          appointmentId: activeApp.id,
          type: barberName,
          barberAvatar: barber.image_url,
          name: activeApp.clients?.name || activeApp.client_name || 'Cliente',
          service: activeApp.services?.name || 'Servicio',
          price: priceStr,
          rawPrice: priceVal,
          elapsed: elapsedStr,
          status: 'En servicio',
          glowClass: 'chair-halo-en-servicio',
          statusColor: '#ef4444',
          isOccupied: true,
          appointment: activeApp
        });
      } else {
        result.push({
          id: chairId,
          type: `Silla ${chairId}`,
          status: 'Disponible',
          glowClass: 'chair-halo-disponible',
          statusColor: '#22c55e',
          info: 'Disponible',
          isOccupied: false
        });
      }
    }
    return result;
  }, [realtimeAppointments, formatElapsedTime]);

  const itemsPerPage = isMobile ? 1 : 4;
  const maxPages = Math.max(0, Math.ceil(allChairsData.length / itemsPerPage) - 1);
  const visibleChairs = React.useMemo(() => {
    const startIndex = chairPage * itemsPerPage;
    return allChairsData.slice(startIndex, startIndex + itemsPerPage);
  }, [allChairsData, chairPage, itemsPerPage]);

  const monthlyProgressReal = Math.round((currentMonthAmountReal / (monthlyGoal || 1)) * 100);
  const percentChange = (current, previous) => {
    const currentValue = Number(current || 0);
    const previousValue = Number(previous || 0);
    if (previousValue === 0) return currentValue === 0 ? 0 : null;
    return Math.round(((currentValue - previousValue) / Math.abs(previousValue)) * 100);
  };
  const renderComparison = (current, previous, label) => {
    const change = percentChange(current, previous);
    if (change === null) {
      return <><span style={{ fontSize: '7px' }}>●</span> Sin base <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: '500' }}>{label}</span></>;
    }
    const isUp = change > 0;
    const isDown = change < 0;
    return (
      <>
        <span style={{ fontSize: '7px' }}>{isUp ? '▲' : isDown ? '▼' : '●'}</span>
        {Math.abs(change)}%
        <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: '500' }}>{label}</span>
      </>
    );
  };

  const formattedTime = currentTime.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).toLowerCase();

  const weekdayName = currentTime.toLocaleDateString('es-ES', { weekday: 'long' });
  const capitalizedWeekday = weekdayName.charAt(0).toUpperCase() + weekdayName.slice(1);

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const formattedDate = capitalizedWeekday + ', ' + currentTime.getDate() + ' de ' + monthNames[currentTime.getMonth()].toLowerCase() + ' de ' + currentTime.getFullYear();
  
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
        data: chartData?.datasets?.[0]?.data || [0, 0, 0, 0, 0, 0, 0],
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
              Hora actual: {formattedTime} &bull; {formattedDate}
            </span>
          </div>

          {/* Search, Dropdown & + Nueva cita */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Search Input Bar */}
            <div ref={searchContainerRef} style={{
              position: 'relative',
              width: '260px',
              zIndex: 120
            }}>
              <input 
                type="text" 
                placeholder="Buscar citas, clientes, barberos..." 
                value={globalSearch}
                onChange={(event) => {
                  setGlobalSearch(event.target.value);
                  setIsSearchOpen(true);
                  setActiveSearchIndex(-1);
                }}
                onKeyDown={handleGlobalSearchKeyDown}
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
                  setIsSearchOpen(true);
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
              {isSearchOpen && searchTerm.length >= 2 && (
                <div
                  role="listbox"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    right: 0,
                    padding: '6px',
                    borderRadius: '12px',
                    background: '#18181b',
                    border: '1px solid rgba(203, 183, 154, 0.2)',
                    boxShadow: '0 18px 45px rgba(0,0,0,0.55)',
                    maxHeight: '340px',
                    overflowY: 'auto'
                  }}
                >
                  {globalSearchResults.length > 0 ? globalSearchResults.map((result, index) => {
                    const ResultIcon = result.type === 'client'
                      ? User
                      : result.type === 'appointment'
                        ? Calendar
                        : ScissorsIcon;
                    const typeLabel = result.type === 'client'
                      ? 'Cliente'
                      : result.type === 'appointment'
                        ? 'Cita'
                        : 'Equipo';
                    const isActive = index === activeSearchIndex;

                    return (
                      <button
                        key={result.id}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        onMouseEnter={() => setActiveSearchIndex(index)}
                        onClick={() => selectGlobalSearchResult(result)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '9px 10px',
                          border: 'none',
                          borderRadius: '9px',
                          background: isActive ? 'rgba(203, 183, 154, 0.12)' : 'transparent',
                          color: 'white',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <span style={{
                          width: '30px',
                          height: '30px',
                          flexShrink: 0,
                          display: 'grid',
                          placeItems: 'center',
                          borderRadius: '8px',
                          color: 'var(--champagne)',
                          background: 'rgba(203, 183, 154, 0.09)',
                          border: '1px solid rgba(203, 183, 154, 0.14)'
                        }}>
                          <ResultIcon size={15} />
                        </span>
                        <span style={{ minWidth: 0, flex: 1 }}>
                          <span style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: 750,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {result.title}
                          </span>
                          <span style={{
                            display: 'block',
                            marginTop: '2px',
                            fontSize: '10px',
                            color: 'rgba(255,255,255,0.46)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {result.subtitle}
                          </span>
                        </span>
                        <span style={{
                          flexShrink: 0,
                          fontSize: '8px',
                          fontWeight: 800,
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                          color: 'rgba(203, 183, 154, 0.7)'
                        }}>
                          {typeLabel}
                        </span>
                      </button>
                    );
                  }) : (
                    <div style={{
                      padding: '18px 12px',
                      textAlign: 'center',
                      fontSize: '11px',
                      color: 'rgba(255,255,255,0.45)'
                    }}>
                      No se encontraron coincidencias
                    </div>
                  )}
                </div>
              )}
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

                {/* EURO Button */}
                <button
                  onClick={() => onToggleRateType('euro')}
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
                    background: activeRateType === 'euro' ? 'rgba(34, 197, 94, 0.08)' : 'transparent',
                    border: activeRateType === 'euro' ? '1.5px solid #22c55e' : '1.5px solid transparent',
                    boxShadow: 'none'
                  }}
                >
                  <span style={{ 
                    fontSize: '8px', 
                    fontWeight: '800', 
                    color: activeRateType === 'euro' ? '#22c55e' : 'rgba(255,255,255,0.5)',
                    letterSpacing: '0.5px'
                  }}>
                    EURO
                  </span>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: '800', 
                    color: activeRateType === 'euro' ? '#22c55e' : 'white'
                  }}>
                    {rates.euro > 0 ? rates.euro.toFixed(2) : '—'}
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
                  <span style={{ fontSize: '7px', fontWeight: '800', color: 'rgba(255,255,255,0.5)' }}>BRECHA</span>
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

            {/* + Nueva cita gold button */}
            {!(user?.role === 'Barbero' || user?.role?.startsWith('Barbero|')) && (
            <button 
              onClick={() => setShowSchedulePopup(true)}
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
            )}
          </div>
        </div>
      )}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: (isMobile || isTablet) ? '1fr' : '3.1fr 1.3fr', 
        gap: '16px', 
        flex: 1, 
        minHeight: 0,
        height: (isMobile || isTablet) ? 'auto' : 'calc(100vh - 110px)',
        padding: '0 8px',
        overflow: 'hidden'
      }}>
        
        {/* Left Column: Metrics & Main Dashboard Content */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '14px', 
          flex: 1, 
          minHeight: 0,
          overflow: 'hidden'
        }}>
          
          {/* Top KPI Cards Row */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(5, 1fr)', 
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
                {citasHoyCount}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '9px', color: '#c5a880', fontWeight: '700' }}>
                {renderComparison(citasHoyCount, stats?.yesterdayAppointments, 'vs ayer')}
              </div>
            </div>

            {/* KPI Card 2: Facturado Hoy */}
            <div className="glass-card" style={{ padding: '8px 10px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '76px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.7 }}>
                <span style={{ fontSize: '9px', fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>FACTURADO HOY</span>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: '800' }}>$</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: 'white', margin: '1px 0' }}>
                ${formatCurrency(facturadoHoyAmount)}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '9px', color: '#c5a880', fontWeight: '700' }}>
                {renderComparison(facturadoHoyAmount, stats?.yesterdayIncome, 'vs ayer')}
              </div>
            </div>

            {/* KPI Card 3: Clientes Nuevos */}
            <div className="glass-card" style={{ padding: '8px 10px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '76px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.7 }}>
                <span style={{ fontSize: '9px', fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>CLIENTES NUEVOS</span>
                <Users size={13} color="rgba(255,255,255,0.6)" />
              </div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: 'white', margin: '1px 0' }}>
                {clientesNuevosCount}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '9px', color: '#c5a880', fontWeight: '700' }}>
                {renderComparison(clientesNuevosCount, stats?.newClientsYesterday, 'vs ayer')}
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
                  {ocupacionPercent}%
                </div>
                <div style={{ width: '45px', height: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${ocupacionPercent}%`, height: '100%', background: 'linear-gradient(to right, var(--champagne), #fff)', borderRadius: '2px' }} />
                </div>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '9px', color: '#c5a880', fontWeight: '700' }}>
                <span>{occupiedChairsCount} de {totalChairs}</span> <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: '500' }}>sillas ocupadas</span>
              </div>
            </div>

            {/* KPI Card 5: Staff pending arrival */}
            <div className="glass-card" style={{ padding: '8px 10px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '76px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.7 }}>
                <span style={{ fontSize: '9px', fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>POR LLEGAR</span>
                <UserX size={13} color="rgba(255,255,255,0.6)" />
              </div>
              <div
                style={{ fontSize: '18px', fontWeight: '900', color: 'white', margin: '1px 0' }}
                title={barbersPendingArrival.length > 0 ? barbersPendingArrival.map(member => member.name).join(', ') : 'Todos los barberos activos están presentes'}
              >
                {pendingBarbersCount}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '9px', color: '#c5a880', fontWeight: '700' }}>
                <span style={{ fontSize: '7px' }}>●</span>
                {pendingBarbersCount === 0
                  ? 'Todos presentes'
                  : `${activeBarbers.length - pendingBarbersCount} de ${activeBarbers.length} presentes`}
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
                <button 
                  onClick={() => setChairPage(prev => Math.max(0, prev - 1))}
                  style={{ width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: chairPage === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.75)', cursor: chairPage === 0 ? 'default' : 'pointer' }}
                  disabled={chairPage === 0}
                >
                  &lt;
                </button>
                <button 
                  onClick={() => setChairPage(prev => Math.min(maxPages, prev + 1))}
                  style={{ width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: chairPage >= maxPages ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.75)', cursor: chairPage >= maxPages ? 'default' : 'pointer' }}
                  disabled={chairPage >= maxPages}
                >
                  &gt;
                </button>
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
              {visibleChairs.map((chair) => {
                 const isOccupied = chair.status === 'En servicio' || chair.status === 'Reservada';
                 const isCleaning = chair.status === 'Limpieza';
                 const isAvailable = chair.status === 'Disponible';

                return (
                  <div 
                    key={chair.id} 
                    onClick={() => {
                      if (chair.isOccupied) {
                        setCheckoutChairModal(chair);
                      } else if (chair.status === 'Disponible') {
                        setShowReceptionPopup(true);
                      } else {
                        setSelectedChair(chair);
                      }
                    }}
                    role={isAvailable ? 'button' : undefined}
                    tabIndex={isAvailable ? 0 : undefined}
                    onKeyDown={(event) => {
                      if (isAvailable && (event.key === 'Enter' || event.key === ' ')) {
                        event.preventDefault();
                        setShowReceptionPopup(true);
                      }
                    }}
                    title={isAvailable ? 'Abrir Recepción' : undefined}
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.15)',
                      border: `1.5px solid ${chair.statusColor || 'rgba(255,255,255,0.04)'}`,
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
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 2, height: '40px', flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {isOccupied ? (
                          chair.barberAvatar ? (
                            <img 
                              src={chair.barberAvatar} 
                              alt={chair.type} 
                              style={{ 
                                width: '40px', 
                                height: '40px', 
                                borderRadius: '50%', 
                                objectFit: 'cover',
                                border: '2px solid var(--champagne)',
                                boxShadow: '0 0 12px rgba(197, 168, 128, 0.6)',
                                transform: 'translate(-4px, -4px)'
                              }} 
                            />
                          ) : (
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              border: '2px solid var(--champagne)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: '900',
                              color: 'var(--champagne)',
                              boxShadow: '0 0 12px rgba(197, 168, 128, 0.6)',
                              transform: 'translate(-4px, -4px)'
                            }}>
                              {chair.type ? chair.type.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : ''}
                            </div>
                          )
                        ) : (
                          <span style={{ fontSize: '16px', fontWeight: '900', color: 'rgba(255,255,255,0.2)' }}>{chair.id}</span>
                        )}
                      </div>

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
                          transform: isOccupied ? 'scale(1.38) translateY(2px)' : 'scale(1.35)',
                          transition: 'transform 0.3s ease',
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
                          padding: '4px 8px',
                          border: '1px solid rgba(255,255,255,0.03)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          height: '100%',
                          boxSizing: 'border-box'
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '10px', fontWeight: '800', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chair.name}</div>
                            <div style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.75)', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chair.service}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--champagne)' }}>{chair.price}</div>
                            <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.75)', fontWeight: '600' }}>{chair.elapsed}</div>
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
                          <Clock size={11} color="var(--champagne)" />
                          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>Disponible en 10 min</span>
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
                            onClick={(event) => {
                              event.stopPropagation();
                              setShowReceptionPopup(true);
                            }}
                            aria-label="Abrir Recepción"
                            title="Abrir Recepción"
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
                  ${formatCurrency(weeklyIncomeAmount)}
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '9px', color: '#c5a880', fontWeight: '700', marginTop: '2px' }}>
                  {renderComparison(weeklyIncomeAmount, stats?.previousWeekIncome, 'vs semana anterior')}
                </div>
              </div>
              <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                <Line 
                  data={chartData ? weeklyChartData : {
                    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
                    datasets: [
                      {
                        data: [0, 0, 0, 0, 0, 0, 0],
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
                {finalTopServices.map((s, idx) => (
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
                {/* Donut generated from the real client-origin distribution */}
                <div style={{ position: 'relative', width: '65px', height: '65px', flexShrink: 0, borderRadius: '50%', background: originGradient }}>
                  <div style={{ position: 'absolute', inset: '8px', borderRadius: '50%', backgroundColor: '#161617' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
                  {originPercentages.map((origin, idx) => (
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
                  <div style={{ fontSize: '13px', fontWeight: '900', color: 'white' }}>{realTotalClients}</div>
                </div>
                <div style={{ fontSize: '8.5px', color: '#c5a880', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  {renderComparison(stats?.clientsThisWeek, stats?.clientsPreviousWeek, 'vs semana ant.')}
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
          flex: 1,
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
              {realUpcomingAppointments.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>
                  No hay citas próximas agendadas para hoy
                </div>
              ) : (
                realUpcomingAppointments.map((item) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.02)', flexShrink: 0 }}>
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
                      {item.avatar ? (
                        <img src={item.avatar} alt={item.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        item.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '11px', fontWeight: '800', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.service} • {item.barber}</div>
                    </div>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: item.status === 'En Silla' ? '#30d158' : 'var(--champagne)' }} />
                  </div>
                ))
              )}
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
                { label: 'Nueva Cita', action: () => setShowSchedulePopup(true), icon: Plus },
                { label: 'Cliente', action: () => setShowNewClientModal(true), icon: User },
                { label: 'Asistencia', action: () => setShowAttendancePopup(true), icon: CheckCircle2 },
                { label: 'Caja', action: () => setShowCheckoutPopup(true), icon: CreditCard }
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexShrink: 0 }}>
              <h3 style={{ fontSize: '10px', fontWeight: '800', color: 'white', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Top barberos</h3>
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
                    {secondPlace.image_url ? (
                      <img 
                        src={secondPlace.image_url} 
                        alt={secondPlace.name} 
                        style={{ width: '100%', height: '100%', borderRadius: '8px', objectFit: 'cover' }} 
                      />
                    ) : (
                      <span style={{ fontSize: '13px', fontWeight: '900', color: '#a1a1aa' }}>
                        {getShortName(secondPlace.name).substring(0, 1).toUpperCase()}
                      </span>
                    )}
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
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'white', marginTop: '2px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                  {getShortName(secondPlace.name)}
                </span>
                <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--champagne)', marginTop: '2px' }}>
                  ${formatCurrency(secondPlace.stats?.monthlyIncome || 0)}
                </span>
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
                    {firstPlace.image_url ? (
                      <img 
                        src={firstPlace.image_url} 
                        alt={firstPlace.name} 
                        style={{ width: '100%', height: '100%', borderRadius: '10px', objectFit: 'cover' }} 
                      />
                    ) : (
                      <span style={{ fontSize: '15px', fontWeight: '900', color: 'var(--champagne)' }}>
                        {getShortName(firstPlace.name).substring(0, 1).toUpperCase()}
                      </span>
                    )}
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
                <span style={{ fontSize: '12.5px', fontWeight: '900', color: 'white', marginTop: '2px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                  {getShortName(firstPlace.name)}
                </span>
                <span style={{ fontSize: '11.5px', fontWeight: '900', color: 'var(--champagne)', marginTop: '2px' }}>
                  ${formatCurrency(firstPlace.stats?.monthlyIncome || 0)}
                </span>
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
                    {thirdPlace.image_url ? (
                      <img 
                        src={thirdPlace.image_url} 
                        alt={thirdPlace.name} 
                        style={{ width: '100%', height: '100%', borderRadius: '8px', objectFit: 'cover' }} 
                      />
                    ) : (
                      <span style={{ fontSize: '13px', fontWeight: '900', color: '#b45309' }}>
                        {getShortName(thirdPlace.name).substring(0, 1).toUpperCase()}
                      </span>
                    )}
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
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'white', marginTop: '2px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                  {getShortName(thirdPlace.name)}
                </span>
                <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--champagne)', marginTop: '2px' }}>
                  ${formatCurrency(thirdPlace.stats?.monthlyIncome || 0)}
                </span>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--champagne)' }}>
                <span style={{ fontSize: '9px', fontWeight: '700' }}>Editar meta</span>
                <Edit3 size={10} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '900', color: 'white' }}>
                ${formatCurrency(currentMonthAmountReal)} <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>/ ${formatCurrency(monthlyGoal)}</span>
              </span>
              <span style={{ fontSize: '10.5px', fontWeight: '900', color: 'var(--champagne)' }}>
                {monthlyProgressReal}%
              </span>
            </div>
            <div style={{ height: '5px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '2.5px', overflow: 'hidden', marginBottom: '6px' }}>
              <div style={{ width: `${Math.min(100, monthlyProgressReal)}%`, height: '100%', background: 'linear-gradient(to right, #c5a880, #e5d4bc)', borderRadius: '2.5px' }} />
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '9px', color: '#c5a880', fontWeight: '700' }}>
              {renderComparison(currentMonthAmountReal, stats?.previousMonthIncome, 'vs mes anterior')}
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
                    setSelectedChair(null);
                    showToast('El estado de las sillas se actualiza desde Recepción.');
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
                <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.75)' }}>FACTURACIÓN ACTUAL (USD)</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div style={{ position: 'absolute', left: '12px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center' }}>
                    <DollarSign size={15} color="var(--champagne)" />
                  </div>
                  <input 
                    type="number" 
                    step="1"
                    value={currentMonthAmountReal}
                    readOnly
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
                <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.75)' }}>META DEL MES (USD)</label>
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

      {/* Modal Resumen de Cobro Emergente desde Silla */}
      <AnimatedModal isOpen={!!checkoutChairModal}>
        {(overlayClass, cardClass) => (
          checkoutChairModal && (
            <div className={`${overlayClass} modal-centered-overlay`}>
              <div className={`${cardClass} modal-popup-centered`}>
                <button 
                  onClick={() => setCheckoutChairModal(null)}
                  style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 99
                  }}
                  title="Cerrar"
                >
                  <X size={18} />
                </button>

                <CheckoutPOS 
                  rates={rates} 
                  isMobile={isMobile} 
                  onNavigate={onNavigate}
                  preselectAppId={checkoutChairModal.appointmentId}
                  isModalView={true}
                  onClose={() => {
                    setCheckoutChairModal(null);
                    const fetchChairData = async () => {
                      try {
                        const activeApps = await dataService.getAppointmentsByState(['En Silla', 'Agendado']);
                        setRealtimeAppointments(activeApps || []);
                      } catch (e) { console.error(e); }
                    };
                    fetchChairData();
                    if (onRefresh) onRefresh();
                  }}
                />
              </div>
            </div>
          )
        )}
      </AnimatedModal>

      {/* Modal: Nuevo Cliente */}
      <NewClientModal 
        isOpen={showNewClientModal}
        onClose={() => setShowNewClientModal(false)}
        onSuccess={(newClient) => {
          setShowNewClientModal(false);
          if (onRefresh) onRefresh();
        }}
      />

      {/* Modal: Control de Asistencia */}
      <AnimatedModal isOpen={showAttendancePopup}>
        {(overlayClass, cardClass) => (
          showAttendancePopup && (
            <div className={`${overlayClass} modal-centered-overlay`}>
              <div className={`${cardClass} modal-popup-fullmodule`}>
                <button
                  onClick={() => {
                    setShowAttendancePopup(false);
                    const refreshAttendance = async () => {
                      const queue = await dataService.getTurnQueue().catch(() => []);
                      setAttendanceQueue(queue || []);
                    };
                    refreshAttendance();
                    if (onRefresh) onRefresh();
                  }}
                  style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 99
                  }}
                  title="Cerrar"
                  aria-label="Cerrar control de asistencia"
                >
                  <X size={18} />
                </button>
                <Suspense fallback={<div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando asistencia...</div>}>
                  <PersonnelModule
                    isMobile={isMobile}
                    inventory={dbData?.inventory || []}
                    initialTab="attendance"
                    attendanceOnly
                  />
                </Suspense>
              </div>
            </div>
          )
        )}
      </AnimatedModal>

      {/* Modal: Cobro POS Popup */}
      <AnimatedModal isOpen={showCheckoutPopup}>
        {(overlayClass, cardClass) => (
          showCheckoutPopup && (
            <div className={`${overlayClass} modal-centered-overlay`}>
              <div className={`${cardClass} modal-popup-fullmodule`}>
                <button 
                  onClick={() => setShowCheckoutPopup(false)}
                  style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 99
                  }}
                  title="Cerrar"
                >
                  <X size={18} />
                </button>
                <CheckoutPOS 
                  rates={rates} 
                  isMobile={isMobile} 
                  onNavigate={onNavigate}
                  isModalView={false}
                  onClose={() => {
                    setShowCheckoutPopup(false);
                    if (onRefresh) onRefresh();
                  }}
                />
              </div>
            </div>
          )
        )}
      </AnimatedModal>

      {/* Modal: Recepción Popup */}
      <AnimatedModal isOpen={showReceptionPopup}>
        {(overlayClass, cardClass) => (
          showReceptionPopup && (
            <div className={`${overlayClass} modal-centered-overlay`}>
              <div className={`${cardClass} modal-popup-fullmodule`}>
                <button 
                  onClick={() => setShowReceptionPopup(false)}
                  style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 99
                  }}
                  title="Cerrar"
                >
                  <X size={18} />
                </button>
                <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}><RefreshCw className="animate-spin" style={{ marginBottom: '10px' }} /> Cargando Recepción...</div>}>
                  <ReceptionModule isMobile={isMobile} rates={rates} />
                </Suspense>
              </div>
            </div>
          )
        )}
      </AnimatedModal>

      {/* Modal: Nueva Cita Popup */}
      <NewAppointmentModal 
        isOpen={showSchedulePopup}
        onClose={() => setShowSchedulePopup(false)}
        rates={rates}
        onSuccess={() => {
          setShowSchedulePopup(false);
          if (onRefresh) onRefresh();
        }}
      />

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
