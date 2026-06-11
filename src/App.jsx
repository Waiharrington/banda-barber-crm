import React, { useState, useEffect } from 'react';
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
import DashboardModule from './components/DashboardModule';
import ClientModule from './components/ClientModule';
import PersonnelModule from './components/PersonnelModule';
import FinanceModule from './components/FinanceModule';
import ServicesModule from './components/ServicesModule';
import InventoryModule from './components/InventoryModule';
import SaleServiceModal from './components/SaleServiceModal';
import HistoryModule from './components/HistoryModule';
import { dataService } from './services/dataService';
import logo from './assets/logo.png';
import UserProfilePage from './components/UserProfilePage';
import ReportsModule from './components/ReportsModule';

// Mobile Components
import MobileLayout from './components/mobile/MobileLayout';
import MobileDashboard from './components/mobile/MobileDashboard';
import ParticleBackground from './components/ParticleBackground';
import AstroLoader from './components/AstroLoader';
import ReceptionModule from './components/ReceptionModule';
import CheckoutPOS from './components/CheckoutPOS';
import BarberPanel from './components/BarberPanel';
import SchedulingModule from './components/SchedulingModule';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import TopBar from './components/TopBar';
import NotificationsDrawer from './components/NotificationsDrawer';
import { notificationService } from './services/notificationService';
import { useDialog } from './context/DialogContext';
import { useScrollLock } from './hooks/useScrollLock';
import { useModal } from './context/ModalContext';

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

function App() {
  const { user, loading: authLoading } = useAuth();
  const { alert, confirm } = useDialog();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('astro_active_tab') || 'dashboard');
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
    return localStorage.getItem('astro_active_rate') || 'usdt';
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

    const channel = dataService.supabase.channel('astro-notifications')
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
    localStorage.setItem('astro_active_rate', type);
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
      borderColor: '#d4af37',
      backgroundColor: 'rgba(212, 175, 55, 0.1)',
      fill: true,
      tension: 0.4
    }]
  });

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'my-profile', label: 'Mi Perfil', icon: UserCircle },
    { id: 'reception', label: 'Recepción (Padre)', icon: UserCircle },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'personnel', label: 'Astro Team', icon: Scissors },
    { id: 'services', label: 'Servicios', icon: Star },
    { id: 'inventory', label: 'Inventario', icon: Package, roles: ['Admin', 'Caja'] },
    { id: 'finance', label: 'Caja Chica', icon: Wallet, roles: ['Admin', 'Caja'] },
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
    window.addEventListener('resize', handleResize);
    
    // One-time cleanup of corrupted default birthday templates in localStorage
    if (!localStorage.getItem('astro_bday_cleaned_v6')) {
      localStorage.removeItem('astro_default_bday_message');
      localStorage.setItem('astro_bday_cleaned_v6', 'true');
    }

    const bdayMsg = localStorage.getItem('astro_default_bday_message');
    if (bdayMsg) {
      console.log('DEBUG BDAY MSG:', bdayMsg);
      console.log('DEBUG BDAY MSG CODES:', Array.from(bdayMsg).map(c => c.charCodeAt(0)));
    }

    // Initial Load Sequence
    const initApp = async () => {
      const startTime = Date.now();
      try {
        await fetchInitialData();
      } catch (error) {
        console.error('Initial app load failed:', error);
      } finally {
        // Ensure at least 300ms of "Astro Experience" loader
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 300 - elapsed);
        
        setTimeout(() => {
          setIsAppLoading(false);
        }, delay);
      }
    };

    initApp();
    return () => window.removeEventListener('resize', handleResize);
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

      const lastNotifiedDate = localStorage.getItem('astro_birthday_notified_date');
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
      localStorage.setItem('astro_birthday_notified_date', todayStr);
    } catch (e) {
      console.error('Error en checkBirthdaysAndNotify:', e);
    }
  };

  const checkGoalsAndNotify = (computedStats) => {
    try {
      const dailyGoal = parseFloat(localStorage.getItem('astro_daily_goal') || '500');
      const weeklyGoal = parseFloat(localStorage.getItem('astro_weekly_goal') || '3000');
      const monthlyGoal = parseFloat(localStorage.getItem('astro_monthly_goal') || '12000');

      const todayStr = new Date().toISOString().split('T')[0];
      const lastSundayStr = getLastSundayDateString();
      const currentMonthStr = todayStr.substring(0, 7);

      // 1. Daily Goal
      if (computedStats.income >= dailyGoal) {
        const lastNotifiedDaily = localStorage.getItem('astro_goal_notified_daily');
        if (lastNotifiedDaily !== todayStr) {
          notificationService.sendNotification(
            '🎯 ¡Meta Diaria Alcanzada! 🎉',
            `¡Espectacular! Se ha alcanzado la meta diaria de $${dailyGoal} USD (Total hoy: $${computedStats.income.toFixed(2)} USD).`
          );
          localStorage.setItem('astro_goal_notified_daily', todayStr);
        }
      }

      // 2. Weekly Goal
      if (computedStats.weeklyIncome >= weeklyGoal) {
        const lastNotifiedWeekly = localStorage.getItem('astro_goal_notified_weekly');
        if (lastNotifiedWeekly !== lastSundayStr) {
          notificationService.sendNotification(
            '🏆 ¡Meta Semanal Alcanzada! 🌟',
            `¡Increíble trabajo equipo! Se alcanzó la meta semanal de $${weeklyGoal} USD (Total semanal: $${computedStats.weeklyIncome.toFixed(2)} USD).`
          );
          localStorage.setItem('astro_goal_notified_weekly', lastSundayStr);
        }
      }

      // 3. Monthly Goal
      if (computedStats.monthlyIncome >= monthlyGoal) {
        const lastNotifiedMonthly = localStorage.getItem('astro_goal_notified_monthly');
        if (lastNotifiedMonthly !== currentMonthStr) {
          notificationService.sendNotification(
            '👑 ¡Objetivo Mensual Completado! 🚀',
            `¡Histórico! Se ha completado el objetivo mensual de $${monthlyGoal} USD (Total mensual: $${computedStats.monthlyIncome.toFixed(2)} USD).`
          );
          localStorage.setItem('astro_goal_notified_monthly', currentMonthStr);
        }
      }
    } catch (e) {
      console.error('Error en checkGoalsAndNotify:', e);
    }
  };

  async function fetchInitialData() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

      const [c, s, st, t, ext, inv, apps, todayApps] = await Promise.all([
        dataService.getClients(),
        dataService.getServices(),
        dataService.getStaff(),
        dataService.getTransactions(thirtyDaysAgoISO),
        dataService.getExtras(),
        dataService.getInventory(),
        dataService.getAppointmentsByState(['Completado'], thirtyDaysAgoISO),
        dataService.getTodayAppointments()
      ]);

      const staffWithStats = st.map(barber => {
        // Historical Appts logic (services and extras)
        const barberApps = apps.filter(a => a.staff_id === barber.id);
        
        const monthlyApptsProd = barberApps
          .filter(a => (a.created_at >= thirtyDaysAgoISO) || (a.scheduled_at && a.scheduled_at >= thirtyDaysAgoISO))
          .reduce((acc, a) => acc + Number(a.total_price || 0), 0);
          
        const todayDate = new Date().toISOString().split('T')[0];
        const todayApptsProd = barberApps
          .filter(a => a.created_at?.startsWith(todayDate) || a.scheduled_at?.startsWith(todayDate))
          .reduce((acc, a) => acc + Number(a.total_price || 0), 0);
          
        const todayCount = barberApps.filter(a => a.created_at?.startsWith(todayDate) || a.scheduled_at?.startsWith(todayDate)).length;

        // Direct Sales without appointment link (new POS logic)
        const directMonthlyProd = t
          .filter(tr => tr.type === 'income' && tr.created_at >= thirtyDaysAgoISO && !tr.metadata?.appointment_id && tr.metadata?.staffInvolved?.some(si => si.staffId === barber.id))
          .reduce((acc, tr) => acc + Number(tr.amount), 0);

        const directTodayProd = t
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

      setDbData({ 
        clients: c, 
        services: s, 
        staff: staffWithStats, 
        extras: ext || [], 
        inventory: inv?.filter(i => i.is_for_sale !== false) || [],
        appointments: apps,
        todayAppointments: todayApps
      });
      const today = new Date().toISOString().split('T')[0];
      const todayTransactions = t.filter(trans => trans.created_at?.startsWith(today));
      const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoISO = sevenDaysAgo.toISOString();

      setStats({
        income: todayTransactions.filter(tr => tr.type === 'income').reduce((acc, tr) => acc + Number(tr.amount), 0),
        weeklyIncome: t.filter(tr => tr.type === 'income' && tr.created_at >= sevenDaysAgoISO).reduce((acc, tr) => acc + Number(tr.amount), 0),
        monthlyIncome: t.filter(tr => tr.type === 'income' && tr.created_at >= thirtyDaysAgoISO).reduce((acc, tr) => acc + Number(tr.amount), 0),
        expenses: todayTransactions.filter(tr => tr.type === 'expense').reduce((acc, tr) => acc + Number(tr.amount), 0),
        clients: c.length,
        appointments: todayTransactions.length 
      });
      if (t.length > 0) {
        const last7Days = [...Array(7)].map((_, i) => {
          const d = new Date(); d.setDate(d.getDate() - (6 - i));
          return d.toISOString().split('T')[0];
        });
        const dailyTotals = last7Days.map(day => t.filter(tr => tr.created_at?.startsWith(day) && tr.type === 'income').reduce((acc, tr) => acc + Number(tr.amount), 0));
        setChartData({
          labels: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'],
          datasets: [{ label: 'Ventas ($)', data: dailyTotals, borderColor: '#d4af37', backgroundColor: 'rgba(212, 175, 55, 0.1)', fill: true, tension: 0.4 }]
        });
      }

      // Automatic weekly close
      await checkAutomaticWeeklyClose();

      // Check birthdays
      checkBirthdaysAndNotify(c);

      // Check goals
      checkGoalsAndNotify({
        income: todayTransactions.filter(tr => tr.type === 'income').reduce((acc, tr) => acc + Number(tr.amount), 0),
        weeklyIncome: t.filter(tr => tr.type === 'income' && tr.created_at >= sevenDaysAgoISO).reduce((acc, tr) => acc + Number(tr.amount), 0),
        monthlyIncome: t.filter(tr => tr.type === 'income' && tr.created_at >= thirtyDaysAgoISO).reduce((acc, tr) => acc + Number(tr.amount), 0)
      });
    } catch (error) { console.error('Error fetching data:', error); }
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
      localStorage.setItem('astro_active_tab', 'my-profile');
      if (isMobile) setIsSidebarOpen(false);
      return;
    }
    setTabParams(params);
    if (tabId === activeTab) return;
    setActiveTab(tabId);
    localStorage.setItem('astro_active_tab', tabId);
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
      link.download = `astro-barber-crm-${activeTab}-${Date.now()}.png`;
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
      await dataService.addService({ name: 'Corte Astro Deluxe', price: 80, category: 'Barbería' });
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
            onNavigate={handleTabChange}
            onRefresh={fetchInitialData}
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
      default: return <div className="p-container"><DashboardModule isMobile={isMobile} currency={currency} rates={effectiveRates} onNavigate={handleTabChange} /></div>;
    }
  };

  if (authLoading && !user) return <AstroLoader visible={true} />;
  if (!user) return <Login />;

  if (isMobile) {
    return (
      <MobileLayout activeTab={activeTab} setActiveTab={handleTabChange} onOpenSale={() => setIsSaleModalOpen(true)}>
        <AstroLoader visible={isAppLoading} />
        <div key={activeTab} className={isAppLoading ? "opacity-0" : "animate-page-fade-in"} style={{ minHeight: '100%' }}>
          {renderContent()}
        </div>
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
        <NotificationsDrawer 
          isOpen={isNotificationsOpen} 
          onClose={() => setIsNotificationsOpen(false)} 
        />
      </MobileLayout>
    );
  }

  return (
    <div className="app-container no-scrollbar" style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'transparent', position: 'relative', overflowX: 'hidden' }}>
      <AstroLoader visible={isAppLoading} />
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
        marginLeft: isMobile ? '0' : (isCollapsed ? '80px' : '260px'), 
        padding: 'var(--spacing-xl)', 
        height: '100vh',
        overflowY: 'auto',
        backgroundColor: 'transparent',
        transition: 'margin-left 0.3s ease'
      }}>
        <div key={activeTab} className={isAppLoading ? "opacity-0" : "animate-page-fade-in"} style={{ height: '100%' }}>
          <TopBar 
            activeTab={activeTab}
            rates={effectiveRates} 
            onOpenSale={() => setIsReceptionModalOpen(true)}
            activeRateType={activeRateType}
            onToggleRateType={handleSetActiveRateType}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
          />
          {renderContent()}
        </div>
      </main>

      {/* Reception Modal (Floating Workspace) */}
      <div style={{ 
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
        <div className="glass-card" style={{ 
          width: '100%', 
          maxWidth: '1400px', 
          height: isMobile ? '100%' : '90vh', 
          overflowY: isModalOpen ? 'hidden' : 'auto', 
          borderRadius: isMobile ? '0' : '32px', 
          border: '1px solid rgba(212,175,55,0.3)', 
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
          <div style={{ padding: isMobile ? '20px' : '40px' }}>
            <ReceptionModule isMobile={isMobile} rates={effectiveRates} />
          </div>
        </div>
      </div>

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
      <NotificationsDrawer 
        isOpen={isNotificationsOpen} 
        onClose={() => setIsNotificationsOpen(false)} 
      />
    </div>
  );
}

export default App;
