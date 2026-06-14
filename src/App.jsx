import React, { lazy, Suspense, useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import { 
  BarChart3, 
  UserCircle, 
  Users, 
  Scissors, 
  Star, 
  Package, 
  Wallet, 
  Settings,
  Calendar,
  X,
  History
} from 'lucide-react';
import { dataService } from './services/dataService';

// Mobile Components
import MobileLayout from './components/mobile/MobileLayout';
import ParticleBackground from './components/ParticleBackground';
import PandaLoader from './components/PandaLoader';
import Login from './components/Login';
import { useAuth } from './context/AuthContext';
import TopBar from './components/TopBar';
import NotificationsDrawer from './components/NotificationsDrawer';
import { notificationService } from './services/notificationService';
import { useDialog } from './context/DialogContext';
import { useScrollLock } from './hooks/useScrollLock';
import { useModal, ModalShield } from './context/ModalContext';

const DashboardModule = lazy(() => import('./components/DashboardModule'));
const MobileDashboard = lazy(() => import('./components/mobile/MobileDashboard'));
const ClientModule = lazy(() => import('./components/ClientModule'));
const PersonnelModule = lazy(() => import('./components/PersonnelModule'));
const FinanceModule = lazy(() => import('./components/FinanceModule'));
const ServicesModule = lazy(() => import('./components/ServicesModule'));
const InventoryModule = lazy(() => import('./components/InventoryModule'));
const SaleServiceModal = lazy(() => import('./components/SaleServiceModal'));
const HistoryModule = lazy(() => import('./components/HistoryModule'));
const UserProfilePage = lazy(() => import('./components/UserProfilePage'));
const ReportsModule = lazy(() => import('./components/ReportsModule'));
const ReceptionModule = lazy(() => import('./components/ReceptionModule'));
const CheckoutPOS = lazy(() => import('./components/CheckoutPOS'));
const BarberPanel = lazy(() => import('./components/BarberPanel'));
const SchedulingModule = lazy(() => import('./components/SchedulingModule'));

const ModuleFallback = () => (
  <div style={{ minHeight: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontWeight: 800 }}>
    Cargando...
  </div>
);

function getLastSundayDateString() {
  const now = new Date();
  const day = now.getDay(); // 0 is Sunday, 1 is Monday, ...
  const lastSunday = new Date(now);
  if (day !== 0) {
    lastSunday.setDate(now.getDate() - day);
  }
  lastSunday.setHours(0, 0, 0, 0);
  const yyyy = lastSunday.getFullYear();
  const mm = String(lastSunday.getMonth() + 1).padStart(2, '0');
  const dd = String(lastSunday.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getStartOfCurrentWeek() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getStartOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function isImportedHistoricalTransaction(transaction) {
  return transaction?.metadata?.importedHistorical === true;
}

function App() {
  const { user, loading: authLoading } = useAuth();
  const { alert, confirm } = useDialog();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('panda_active_tab') || 'dashboard');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [tabParams, setTabParams] = useState({});
  const [isReceptionModalOpen, setIsReceptionModalOpen] = useState(false);
  const { isModalOpen } = useModal();

  useScrollLock(isReceptionModalOpen);

  // Multi-currency State

  const [currency, setCurrency] = useState('USD'); 
  const [rates, setRates] = useState({ bcv: 0, usdt: 0, updated_at: null });
  
  // Active Rate Toggle (BCV or USDT) - persisted
  const [activeRateType, setActiveRateType] = useState(() => {
    return localStorage.getItem('panda_active_rate') || 'usdt';
  });

  // Calculate Exchange Gap
  const exchangeGap = rates.bcv > 0 ? ((rates.usdt - rates.bcv) / rates.bcv) * 100 : 0;

  // Effective Rates Logic - Use selected rate for all Bs calculations
  const effectiveRates = { 
    usd: activeRateType === 'bcv' ? rates.bcv : rates.usdt, 
    bcv: rates.bcv,
    usdt: rates.usdt,
    gap: exchangeGap,
    activeType: activeRateType,
    updated_at: rates.updated_at 
  };

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  // Auto-Sync BCV and USDT Rates on Mount + every 10 min
  useEffect(() => {
    const syncRates = async () => {
      const ratesData = await dataService.getExchangeRates();
      if (ratesData) setRates(ratesData);
    };
    syncRates();
    const interval = setInterval(syncRates, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Real-time Broadcast Notifications Subscription
  useEffect(() => {
    if (!user) return;

    const channel = dataService.supabase.channel('panda-notifications')
      .on('broadcast', { event: 'crm-notification' }, ({ payload }) => {
        const userRole = user?.role || '';
        const roleName = userRole.split('|')[0];
        
        let shouldShow = false;

        // 1. Admins see all notifications
        if (roleName === 'Admin') {
          shouldShow = true;
        } 
        // 2. Filter by recipient ID or role
        else if (payload.recipientId && String(payload.recipientId) === String(user.id)) {
          shouldShow = true;
        } else if (payload.recipientRole === 'Barbero' && (roleName === 'Barbero' || userRole.startsWith('Barbero|'))) {
          shouldShow = true;
        } else if (payload.recipientRole === 'Asistente' && roleName.includes('Asistente')) {
          shouldShow = true;
        }

        if (shouldShow) {
          notificationService.sendNotification(payload.title, payload.body);
        }
      })
      .subscribe();

    return () => {
      dataService.supabase.removeChannel(channel);
    };
  }, [user]);

  // Persist active rate type
  const handleSetActiveRateType = (type) => {
    setActiveRateType(type);
    localStorage.setItem('panda_active_rate', type);
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  
  // Global Data State
  const [stats, setStats] = useState({ income: 0, clients: 0, expenses: 0, appointments: 0 });
  const [dbData, setDbData] = useState({ clients: [], services: [], staff: [], extras: [], inventory: [] });
  const [chartData, setChartData] = useState({
    labels: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'],
    datasets: [{
      label: 'Ventas ($)',
      data: [0, 0, 0, 0, 0, 0, 0],
      borderColor: '#ffffff',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      fill: true,
      tension: 0.4
    }]
  });

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'my-profile', label: 'Mi Perfil', icon: UserCircle },
    { id: 'reception', label: 'Recepción (Padre)', icon: UserCircle },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'personnel', label: 'Panda Team', icon: Scissors },
    { id: 'services', label: 'Servicios', icon: Star },
    { id: 'inventory', label: 'Inventario', icon: Package, roles: ['Admin', 'Caja'] },
    { id: 'finance', label: 'Finanzas', icon: Wallet, roles: ['Admin', 'Caja'] },
    { id: 'reports', label: 'Reportes', icon: BarChart3, roles: ['Admin'] },
    { id: 'history', label: 'Historial', icon: History, roles: ['Admin', 'Barbero', 'Recepcionista', 'Caja', 'Asistente'] },
  ];

  useEffect(() => {
    if (!user) return;

    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      if (width < 1024 && width >= 768) {
        setIsCollapsed(true);
      } else if (width >= 1024) {
        setIsCollapsed(false);
      }
    };
    const handleNavigation = (e) => {
      handleTabChange(e.detail);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('panda_navigate', handleNavigation);
    
    // One-time cleanup of corrupted default birthday templates in localStorage
    if (!localStorage.getItem('panda_bday_cleaned_v6')) {
      localStorage.removeItem('panda_default_bday_message');
      localStorage.setItem('panda_bday_cleaned_v6', 'true');
    }

    // Fast-Path Load Sequence
    // Phase 1: Load only what's needed to show the UI (fast)
    // Phase 2: Load heavy data silently in background
    const initApp = async () => {
      try {
        await fetchCriticalData();
      } catch (error) {
        console.error('Initial app load failed:', error);
      } finally {
        setIsAppLoading(false); // Dismiss loader immediately after critical data
      }
      // Phase 2: heavy data loads in background, no spinner
      try {
        await fetchSecondaryData();
      } catch (e) {
        console.warn('Secondary data load failed:', e);
      }
    };

    initApp();
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('panda_navigate', handleNavigation);
    };
  }, [user]);

  const checkAutomaticWeeklyClose = async () => {
    try {
      const sundayStr = getLastSundayDateString();
      
      const { data, error } = await dataService.supabase
        .from('transactions')
        .select('id')
        .eq('description', 'Cierre Semanal Automático')
        .contains('metadata', { week_date: sundayStr });

      if (error) throw error;

      if (!data || data.length === 0) {
        console.log(`Ejecutando cierre semanal automático para la semana finalizada en ${sundayStr}...`);
        
        const success = await dataService.triggerWeeklyClosing();
        if (success) {
          await dataService.addTransaction({
            amount: 0,
            type: 'expense',
            description: 'Cierre Semanal Automático',
            exchange_rate: 1,
            metadata: { type: 'weekly_close', week_date: sundayStr }
          });

          notificationService.sendNotification(
            '📉 Cierre Semanal Automático 🔒',
            `El cierre semanal correspondiente al domingo ${sundayStr} se ha ejecutado y sincronizado automáticamente en Google Sheets.`
          );
        }
      }
    } catch (e) {
      console.error('Error en checkAutomaticWeeklyClose:', e);
    }
  };

  const checkBirthdaysAndNotify = (clients) => {
    try {
      const today = new Date();
      const todayMonth = today.getMonth() + 1;
      const todayDay = today.getDate();
      const todayStr = today.toISOString().split('T')[0];

      const lastNotifiedDate = localStorage.getItem('panda_birthday_notified_date');
      if (lastNotifiedDate === todayStr) return;

      const birthdayClients = clients.filter(c => {
        if (!c.birth_date) return false;
        const parts = c.birth_date.split('-');
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        return m === todayMonth && d === todayDay;
      });

      if (birthdayClients.length > 0) {
        const names = birthdayClients.map(c => c.name).join(', ');
        notificationService.sendNotification(
          '🎉 ¡Cumpleaños de Clientes hoy! 🎂',
          `Hoy cumplen años: ${names}. ¡Recuerda felicitarlos o enviarles una promoción especial!`
        );
      }
      localStorage.setItem('panda_birthday_notified_date', todayStr);
    } catch (e) {
      console.error('Error en checkBirthdaysAndNotify:', e);
    }
  };

  const checkGoalsAndNotify = (computedStats) => {
    try {
      const dailyGoal = parseFloat(localStorage.getItem('panda_daily_goal') || '500');
      const weeklyGoal = parseFloat(localStorage.getItem('panda_weekly_goal') || '3000');
      const monthlyGoal = parseFloat(localStorage.getItem('panda_monthly_goal') || '12000');

      const todayStr = new Date().toISOString().split('T')[0];
      const lastSundayStr = getLastSundayDateString();
      const currentMonthStr = todayStr.substring(0, 7);

      // 1. Daily Goal
      if (computedStats.income >= dailyGoal) {
        const lastNotifiedDaily = localStorage.getItem('panda_goal_notified_daily');
        if (lastNotifiedDaily !== todayStr) {
          notificationService.sendNotification(
            '🎯 ¡Meta Diaria Alcanzada! 🎉',
            `¡Espectacular! Se ha alcanzado la meta diaria de $${dailyGoal} USD (Total hoy: $${computedStats.income.toFixed(2)} USD).`
          );
          localStorage.setItem('panda_goal_notified_daily', todayStr);
        }
      }

      // 2. Weekly Goal
      if (computedStats.weeklyIncome >= weeklyGoal) {
        const lastNotifiedWeekly = localStorage.getItem('panda_goal_notified_weekly');
        if (lastNotifiedWeekly !== lastSundayStr) {
          notificationService.sendNotification(
            '🏆 ¡Meta Semanal Alcanzada! 🌟',
            `¡Increíble trabajo equipo! Se alcanzó la meta semanal de $${weeklyGoal} USD (Total semanal: $${computedStats.weeklyIncome.toFixed(2)} USD).`
          );
          localStorage.setItem('panda_goal_notified_weekly', lastSundayStr);
        }
      }

      // 3. Monthly Goal
      if (computedStats.monthlyIncome >= monthlyGoal) {
        const lastNotifiedMonthly = localStorage.getItem('panda_goal_notified_monthly');
        if (lastNotifiedMonthly !== currentMonthStr) {
          notificationService.sendNotification(
            '👑 ¡Objetivo Mensual Completado! 🚀',
            `¡Histórico! Se ha completado el objetivo mensual de $${monthlyGoal} USD (Total mensual: $${computedStats.monthlyIncome.toFixed(2)} USD).`
          );
          localStorage.setItem('panda_goal_notified_monthly', currentMonthStr);
        }
      }
    } catch (e) {
      console.error('Error en checkGoalsAndNotify:', e);
    }
  };

  // Phase 1: Ultra-fast — only 3 simple queries with NO joins!
  async function fetchCriticalData() {
    try {
      const [c, s, st] = await Promise.all([
        dataService.getClientsLite(),
        dataService.getServices(),
        dataService.getStaff()
      ]);
      setDbData(prev => ({
        ...prev,
        clients: c,
        services: s,
        staff: st,
        extras: [],
        inventory: []
      }));
      checkBirthdaysAndNotify(c);
    } catch (error) { console.error('Error in critical data fetch:', error); }
  }

  // Phase 2: Heavy data — runs silently after loader is gone
  async function fetchSecondaryData() {
    try {
      const currentWeekStartISO = getStartOfCurrentWeek().toISOString();
      const currentMonthStartISO = getStartOfCurrentMonth().toISOString();
      const chartStart = new Date();
      chartStart.setDate(chartStart.getDate() - 6);
      chartStart.setHours(0, 0, 0, 0);
      const dashboardStartISO = new Date(Math.min(
        new Date(currentWeekStartISO).getTime(),
        new Date(currentMonthStartISO).getTime(),
        chartStart.getTime()
      )).toISOString();

      const [t, ext, inv, apps, todayApps, fullClients] = await Promise.all([
        dataService.getTransactions(dashboardStartISO),
        dataService.getExtras(),
        dataService.getInventory(),
        dataService.getAppointmentsByState(['Completado'], dashboardStartISO),
        dataService.getTodayAppointments(),
        dataService.getClients() // Full client data with visit counts
      ]);

      const st = await dataService.getStaff();
      const operationalTransactions = t.filter(tr => !isImportedHistoricalTransaction(tr));
      
      const staffWithStats = st.map(barber => {
        // Historical Appts logic (services and extras)
        const barberApps = apps.filter(a => a.staff_id === barber.id);
        
        const monthlyApptsProd = barberApps
          .filter(a => (a.created_at >= currentMonthStartISO) || (a.scheduled_at && a.scheduled_at >= currentMonthStartISO))
          .reduce((acc, a) => acc + Number(a.total_price || 0), 0);
          
        const todayDate = new Date().toISOString().split('T')[0];
        const todayApptsProd = barberApps
          .filter(a => a.created_at?.startsWith(todayDate) || a.scheduled_at?.startsWith(todayDate))
          .reduce((acc, a) => acc + Number(a.total_price || 0), 0);
          
        const todayCount = barberApps.filter(a => a.created_at?.startsWith(todayDate) || a.scheduled_at?.startsWith(todayDate)).length;

        // Direct Sales without appointment link (new POS logic)
        const directMonthlyProd = operationalTransactions
          .filter(tr => tr.type === 'income' && tr.created_at >= currentMonthStartISO && !tr.metadata?.appointment_id && tr.metadata?.staffInvolved?.some(si => si.staffId === barber.id))
          .reduce((acc, tr) => acc + Number(tr.amount), 0);

        const directTodayProd = operationalTransactions
          .filter(tr => tr.type === 'income' && tr.created_at?.startsWith(todayDate) && !tr.metadata?.appointment_id && tr.metadata?.staffInvolved?.some(si => si.staffId === barber.id))
          .reduce((acc, tr) => acc + Number(tr.amount), 0);

        return { 
          ...barber, 
          stats: { 
            ...barber.stats, 
            monthlyIncome: monthlyApptsProd + directMonthlyProd,
            income: todayApptsProd + directTodayProd,
            appointments: todayCount 
          } 
        };
      });

      setDbData(prev => ({ 
        ...prev,
        clients: fullClients, // Now with real visit counts
        staff: staffWithStats, 
        extras: ext || [], 
        inventory: inv?.filter(i => i.is_for_sale !== false) || [],
        appointments: apps,
        todayAppointments: todayApps
      }));
      const today = new Date().toISOString().split('T')[0];
      const todayTransactions = operationalTransactions.filter(trans => trans.created_at?.startsWith(today));

      setStats({
        income: todayTransactions.filter(tr => tr.type === 'income').reduce((acc, tr) => acc + Number(tr.amount), 0),
        weeklyIncome: operationalTransactions.filter(tr => tr.type === 'income' && tr.created_at >= currentWeekStartISO).reduce((acc, tr) => acc + Number(tr.amount), 0),
        monthlyIncome: operationalTransactions.filter(tr => tr.type === 'income' && tr.created_at >= currentMonthStartISO).reduce((acc, tr) => acc + Number(tr.amount), 0),
        expenses: todayTransactions.filter(tr => tr.type === 'expense').reduce((acc, tr) => acc + Number(tr.amount), 0),
        clients: fullClients.length,
        appointments: todayTransactions.length 
      });
      if (operationalTransactions.length > 0) {
        const last7Days = [...Array(7)].map((_, i) => {
          const d = new Date(); d.setDate(d.getDate() - (6 - i));
          return d.toISOString().split('T')[0];
        });
        const dailyTotals = last7Days.map(day => operationalTransactions.filter(tr => tr.created_at?.startsWith(day) && tr.type === 'income').reduce((acc, tr) => acc + Number(tr.amount), 0));
        setChartData({
          labels: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'],
          datasets: [{ label: 'Ventas ($)', data: dailyTotals, borderColor: '#ffffff', backgroundColor: 'rgba(255, 255, 255, 0.1)', fill: true, tension: 0.4 }]
        });
      }

      // Automatic weekly close
      await checkAutomaticWeeklyClose();

      // Check goals
      checkGoalsAndNotify({
        income: todayTransactions.filter(tr => tr.type === 'income').reduce((acc, tr) => acc + Number(tr.amount), 0),
        weeklyIncome: operationalTransactions.filter(tr => tr.type === 'income' && tr.created_at >= currentWeekStartISO).reduce((acc, tr) => acc + Number(tr.amount), 0),
        monthlyIncome: operationalTransactions.filter(tr => tr.type === 'income' && tr.created_at >= currentMonthStartISO).reduce((acc, tr) => acc + Number(tr.amount), 0)
      });
    } catch (error) { console.error('Error fetching secondary data:', error); }
  }

  async function fetchInitialData() {
    await fetchCriticalData();
    await fetchSecondaryData();
  }

  const handleTabChange = (tabId, params = {}) => {
    // Permission check for non-admins
    const userRole = user?.role || '';
    const roleName = userRole.split('|')[0];
    if (roleName === 'Asistente de Lavado' && !['dashboard', 'history', 'my-profile', 'barber'].includes(tabId)) {
      return;
    }

    if (tabId === 'my-profile') {
      setTabParams(params);
      setActiveTab('my-profile');
      localStorage.setItem('panda_active_tab', 'my-profile');
      if (isMobile) setIsSidebarOpen(false);
      return;
    }
    setTabParams(params);
    if (tabId === activeTab) return;
    setActiveTab(tabId);
    localStorage.setItem('panda_active_tab', tabId);
    if (isMobile) setIsSidebarOpen(false);
  };

  const handleCaptureFullPage = async () => {
    try {
      // Small delay to let UI settle (no full reload)
      await new Promise(r => setTimeout(r, 1000));
      const { default: html2canvas } = await import('html2canvas');
      const element = document.body;
      const canvas = await html2canvas(element, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#121212',
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: document.documentElement.offsetWidth,
        windowHeight: document.documentElement.scrollHeight,
        height: document.documentElement.scrollHeight,
      });
      const link = document.createElement('a');
      link.download = `panda-barber-crm-${activeTab}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Error capturing screenshot:', e);
      await alert('Error al generar la captura de pantalla: ' + e.message);
    } finally {
      // ensure loading flag is cleared if it was set elsewhere
    }
  };

  const handleSeedData = async () => {
    if (!await confirm('¿Quieres cargar datos de prueba para ver el CRM funcionando?')) return;
    try {
      await dataService.addStaff({ name: 'Marco Silva', role: 'Barbero Principal', commission_pct: 40 });
      await dataService.addService({ name: 'Corte Panda Deluxe', price: 80, category: 'Barbería' });
      await dataService.addClient({ name: 'Carlos Demo', phone: '555-0123', hair_type: 'Normal' });
      await alert('Datos de demo cargados!');
      fetchInitialData();
    } catch (error) { console.error('Error seeding:', error); }
  };

  const renderContent = () => {
    // Shared content logic (Desktop and mobile modules call the same components but with different props/layouts)
    switch (activeTab) {
      case 'dashboard':
        return isMobile ? (
          <MobileDashboard 
            onOpenSale={() => setIsSaleModalOpen(true)} 
            stats={stats} 
            chartData={chartData} 
            dbData={dbData} 
            rates={effectiveRates} 
            onNavigate={handleTabChange}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
          />
        ) : (
          <DashboardModule 
            isMobile={isMobile}
            isTablet={isTablet}
            isCollapsed={isCollapsed}
            onOpenSale={() => setIsSaleModalOpen(true)} 
            stats={stats} 
            chartData={chartData} 
            dbData={dbData} 
            handleSeedData={handleSeedData} 
            rates={effectiveRates}
            activeRateType={activeRateType}
            onToggleRateType={handleSetActiveRateType}
            onNavigate={handleTabChange}
            onRefresh={fetchInitialData}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
          />
        );
      case 'reception': return <div className="p-container"><ReceptionModule isMobile={isMobile} /></div>;
      case 'checkout': return <div className="p-container"><CheckoutPOS isMobile={isMobile} rates={effectiveRates} onOpenSale={() => setIsSaleModalOpen(true)} onNavigate={handleTabChange} /></div>;
      case 'barber': return <div className="p-container"><BarberPanel isMobile={isMobile} /></div>;
      case 'scheduling': return <div className="p-container"><SchedulingModule isMobile={isMobile} rates={effectiveRates} /></div>;
      case 'services': return <div className="p-container"><ServicesModule isMobile={isMobile} currency={currency} rates={effectiveRates} /></div>;
      case 'inventory': return <div className="p-container"><InventoryModule isMobile={isMobile} currency={currency} rates={effectiveRates} /></div>;
      case 'finance': return <div className="p-container"><FinanceModule isMobile={isMobile} currency={currency} rates={effectiveRates} staff={dbData.staff} /></div>;
      case 'reports': return <div className="p-container"><ReportsModule isMobile={isMobile} rates={effectiveRates} staff={dbData.staff} /></div>;
      case 'clients': return <div className="p-container"><ClientModule isMobile={isMobile} clients={dbData.clients} onRefresh={fetchInitialData} initialClientId={tabParams.clientId} /></div>;
      case 'personnel': return <div className="p-container"><PersonnelModule isMobile={isMobile} inventory={dbData.inventory || []} /></div>;
      case 'history': return <div className="p-container"><HistoryModule isMobile={isMobile} rates={effectiveRates} onNavigate={handleTabChange} /></div>;
      case 'my-profile':
        return (
          <div className="p-container">
            <UserProfilePage 
              isMobile={isMobile}
              staffMember={dbData.staff.find(s => s.id === user?.id)} 
              inventory={dbData.inventory || []}
              onUpdate={fetchInitialData}
            />
          </div>
        );
      default: return <div className="p-container"><DashboardModule isMobile={isMobile} currency={currency} rates={effectiveRates} activeRateType={activeRateType} onToggleRateType={handleSetActiveRateType} onNavigate={handleTabChange} /></div>;
    }
  };

  const hasSessionKey = Object.keys(localStorage).some(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
  if (authLoading && !user) {
    if (!hasSessionKey) {
      return <Login />;
    }
    return <PandaLoader visible={true} />;
  }
  if (!user) {
    return <Login />;
  }

  if (isMobile) {
    return (
      <MobileLayout activeTab={activeTab} setActiveTab={handleTabChange} onOpenSale={() => setIsSaleModalOpen(true)}>
        <PandaLoader visible={isAppLoading} />
        <div key={activeTab} className={isAppLoading ? "opacity-0" : "animate-page-fade-in"} style={{ minHeight: '100%' }}>
          <Suspense fallback={<ModuleFallback />}>
            {renderContent()}
          </Suspense>
        </div>
        {isSaleModalOpen && (
          <Suspense fallback={null}>
            <SaleServiceModal 
              isOpen={isSaleModalOpen} 
              onClose={() => setIsSaleModalOpen(false)} 
              clients={dbData.clients}
              services={dbData.services}
              staff={dbData.staff}
              extras={dbData.extras || []}
              inventory={dbData.inventory || []}
              onRefresh={fetchInitialData}
              rates={rates}
              currency={currency}
            />
          </Suspense>
        )}
        <NotificationsDrawer 
          isOpen={isNotificationsOpen} 
          onClose={() => setIsNotificationsOpen(false)} 
        />
      </MobileLayout>
    );
  }

  return (
    <div className="app-container no-scrollbar" style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'transparent', position: 'relative', overflowX: 'hidden' }}>
      <PandaLoader visible={isAppLoading} />
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(id) => handleTabChange(id, {})} 
        rates={effectiveRates} 
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        activeRateType={activeRateType}
        onToggleRateType={handleSetActiveRateType}
      />
      <main className="main-content no-scrollbar" style={{ 
        flex: 1, 
        marginLeft: isMobile ? '0' : (isModalOpen ? '0' : (isCollapsed ? '80px' : '260px')), 
        padding: 'var(--spacing-xl)', 
        paddingBottom: activeTab === 'dashboard' ? '12px' : '80px',
        height: '100vh',
        overflowY: activeTab === 'dashboard' ? 'hidden' : 'auto',
        overflowX: 'hidden',
        backgroundColor: 'transparent',
        transition: 'margin-left 0.3s ease'
      }}>
        <div key={activeTab} className={isAppLoading ? "opacity-0" : "animate-page-fade-in"} style={{ height: '100%' }}>
          {activeTab !== 'dashboard' && (
            <TopBar 
              activeTab={activeTab}
              rates={effectiveRates} 
              onOpenSale={() => setIsReceptionModalOpen(true)}
              activeRateType={activeRateType}
              onToggleRateType={handleSetActiveRateType}
              onOpenNotifications={() => setIsNotificationsOpen(true)}
            />
          )}
          <Suspense fallback={<ModuleFallback />}>
            {renderContent()}
          </Suspense>
        </div>
      </main>

      {/* Reception Modal (Floating Workspace) */}
      <ModalShield active={isReceptionModalOpen}>
        <div className="global-modal-overlay" style={{ 
          position: 'fixed', 
          inset: 0, 
          zIndex: 3000, 
          backgroundColor: 'rgba(0,0,0,0.9)', 
          backdropFilter: isReceptionModalOpen ? 'blur(20px)' : 'blur(0px)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: isMobile ? '0' : '20px',
          opacity: isReceptionModalOpen ? 1 : 0,
          visibility: isReceptionModalOpen ? 'visible' : 'hidden',
          pointerEvents: isReceptionModalOpen ? 'auto' : 'none',
          transition: 'opacity 0.35s ease, backdrop-filter 0.35s ease, visibility 0.35s'
        }}>
          <div className="glass-card global-modal-card" style={{ 
            width: '100%', 
            maxWidth: '1400px', 
            height: isMobile ? '100%' : '90vh', 
            overflowY: isModalOpen ? 'hidden' : 'auto', 
            borderRadius: isMobile ? '0' : '32px', 
            border: '1px solid rgba(255, 255, 255,0.3)', 
            position: 'relative', 
            background: 'var(--bg-primary)',
            transform: isReceptionModalOpen ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(20px)',
            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s ease',
            opacity: isReceptionModalOpen ? 1 : 0
          }}>
            <button 
              onClick={() => setIsReceptionModalOpen(false)}
              style={{ position: 'absolute', right: '20px', top: '20px', zIndex: 3001, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={20} />
            </button>
            {isReceptionModalOpen && (
              <div style={{ padding: isMobile ? '20px' : '40px' }}>
                <Suspense fallback={<ModuleFallback />}>
                  <ReceptionModule isMobile={isMobile} rates={effectiveRates} />
                </Suspense>
              </div>
            )}
          </div>
        </div>
      </ModalShield>

      {isSaleModalOpen && (
        <Suspense fallback={null}>
          <SaleServiceModal 
            isOpen={isSaleModalOpen} 
            onClose={() => setIsSaleModalOpen(false)} 
            clients={dbData.clients}
            services={dbData.services}
            staff={dbData.staff}
            extras={dbData.extras || []}
            inventory={dbData.inventory || []}
            onRefresh={fetchInitialData}
            rates={rates}
            currency={currency}
          />
        </Suspense>
      )}
      <NotificationsDrawer 
        isOpen={isNotificationsOpen} 
        onClose={() => setIsNotificationsOpen(false)} 
      />
    </div>
  );
}

export default App;
