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
  Calendar
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
import StaffProfileModal from './components/StaffProfileModal';

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

function App() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('astro_active_tab') || 'dashboard');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [tabParams, setTabParams] = useState({});
  const [isMyProfileOpen, setIsMyProfileOpen] = useState(false);
  
  // Multi-currency State
  const [currency, setCurrency] = useState('USD'); 
  const [rates, setRates] = useState({ usd: 0, eur: 0, updated_at: null });
  
  // Custom Rates State (Persisted)
  const [isCustomRate, setIsCustomRate] = useState(() => localStorage.getItem('astro_is_custom_rate') === 'true');
  const [customRates, setCustomRates] = useState(() => {
    const saved = localStorage.getItem('astro_custom_rates');
    return saved ? JSON.parse(saved) : { usd: 40, eur: 45 };
  });

  // Effective Rates Logic
  const effectiveRates = isCustomRate ? { ...customRates, updated_at: 'Manual' } : rates;

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  // Auto-Sync BCV Rates on Mount
  useEffect(() => {
    const syncRates = async () => {
      const data = await dataService.getExchangeRates();
      if (data) setRates(data);
    };
    syncRates();
  }, []);

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
    { id: 'history', label: 'Historial', icon: History, roles: ['Admin', 'Barbero', 'Recepcionista', 'Caja', 'Asistente'] },
  ];

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    
    // Initial Load Sequence
    const initApp = async () => {
      const startTime = Date.now();
      await fetchInitialData();
      
      // Ensure at least 1.5s of "Astro Experience" loader
      const elapsed = Date.now() - startTime;
      const delay = Math.max(0, 1500 - elapsed);
      
      setTimeout(() => {
        setIsAppLoading(false);
      }, delay);
    };

    initApp();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchInitialData = async () => {
    try {
      const [c, s, st, t, ext, inv, apps] = await Promise.all([
        dataService.getClients(),
        dataService.getServices(),
        dataService.getStaff(),
        dataService.getTransactions(),
        dataService.getExtras(),
        dataService.getInventory(),
        dataService.getAppointmentsByState(['Completado'])
      ]);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

      const staffWithStats = st.map(barber => {
        // Historical Appts logic (services and extras)
        const barberApps = apps.filter(a => a.staff_id === barber.id);
        
        const monthlyApptsProd = barberApps
          .filter(a => (a.created_at >= thirtyDaysAgoISO) || (a.scheduled_at && a.scheduled_at >= thirtyDaysAgoISO))
          .reduce((acc, a) => acc + Number(a.total_price || 0), 0);
          
        const todayDate = new Date().toISOString().split('T')[0];
        const todayApptsProd = barberApps
          .filter(a => a.created_at.startsWith(todayDate) || (a.scheduled_at && a.scheduled_at.startsWith(todayDate)))
          .reduce((acc, a) => acc + Number(a.total_price || 0), 0);
          
        const todayCount = barberApps.filter(a => a.created_at.startsWith(todayDate) || (a.scheduled_at && a.scheduled_at.startsWith(todayDate))).length;

        // Direct Sales without appointment link (new POS logic)
        const directMonthlyProd = t
          .filter(tr => tr.type === 'income' && tr.created_at >= thirtyDaysAgoISO && !tr.metadata?.appointment_id && tr.metadata?.staffInvolved?.some(si => si.staffId === barber.id))
          .reduce((acc, tr) => acc + Number(tr.amount), 0);

        const directTodayProd = t
          .filter(tr => tr.type === 'income' && tr.created_at.startsWith(todayDate) && !tr.metadata?.appointment_id && tr.metadata?.staffInvolved?.some(si => si.staffId === barber.id))
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
        inventory: inv?.filter(i => i.is_for_sale !== false) || [] 
      });
      const today = new Date().toISOString().split('T')[0];
      const todayTransactions = t.filter(trans => trans.created_at.startsWith(today));
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
        const dailyTotals = last7Days.map(day => t.filter(tr => tr.created_at.startsWith(day) && tr.type === 'income').reduce((acc, tr) => acc + Number(tr.amount), 0));
        setChartData({
          labels: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'],
          datasets: [{ label: 'Ventas ($)', data: dailyTotals, borderColor: '#d4af37', backgroundColor: 'rgba(212, 175, 55, 0.1)', fill: true, tension: 0.4 }]
        });
      }
    } catch (error) { console.error('Error fetching data:', error); }
  };

  const handleTabChange = (tabId, params = {}) => {
    if (tabId === 'my-profile') {
      setIsMyProfileOpen(true);
      if (isMobile) setIsSidebarOpen(false);
      return;
    }
    setTabParams(params);
    if (tabId === activeTab) return;
    setIsTabLoading(true);
    // Short transition to maintain the premium feel
    setTimeout(() => {
      setActiveTab(tabId);
      localStorage.setItem('astro_active_tab', tabId);
      setIsTabLoading(false);
      if (isMobile) setIsSidebarOpen(false);
    }, 600);
  };

  const handleSeedData = async () => {
    if (!window.confirm('¿Quieres cargar datos de prueba para ver el CRM funcionando?')) return;
    try {
      await dataService.addStaff({ name: 'Marco Silva', role: 'Barbero Principal', commission_pct: 40 });
      await dataService.addService({ name: 'Corte Astro Deluxe', price: 80, category: 'Barbería' });
      await dataService.addClient({ name: 'Carlos Demo', phone: '555-0123', hair_type: 'Normal' });
      alert('Datos de demo cargados!');
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
          />
        ) : (
          <DashboardModule 
            isMobile={isMobile} 
            onOpenSale={() => setIsSaleModalOpen(true)} 
            stats={stats} 
            chartData={chartData} 
            dbData={dbData} 
            handleSeedData={handleSeedData} 
            rates={effectiveRates}
            bcvRates={rates}
            isCustomRate={isCustomRate}
            setIsCustomRate={(val) => {
              setIsCustomRate(val);
              localStorage.setItem('astro_is_custom_rate', val);
            }}
            customRates={customRates}
            setCustomRates={(val) => {
              setCustomRates(val);
              localStorage.setItem('astro_custom_rates', JSON.stringify(val));
            }}
            onNavigate={handleTabChange}
          />
        );
      case 'reception': return <div className="p-container"><ReceptionModule isMobile={isMobile} /></div>;
      case 'checkout': return <div className="p-container"><CheckoutPOS isMobile={isMobile} rates={effectiveRates} onOpenSale={() => setIsSaleModalOpen(true)} onNavigate={handleTabChange} /></div>;
      case 'barber': return <div className="p-container"><BarberPanel isMobile={isMobile} /></div>;
      case 'scheduling': return <div className="p-container"><SchedulingModule isMobile={isMobile} /></div>;
      case 'services': return <div className="p-container"><ServicesModule isMobile={isMobile} currency={currency} rates={effectiveRates} /></div>;
      case 'inventory': return <div className="p-container"><InventoryModule isMobile={isMobile} currency={currency} rates={effectiveRates} /></div>;
      case 'finance': return <div className="p-container"><FinanceModule isMobile={isMobile} currency={currency} rates={effectiveRates} /></div>;
      case 'clients': return <div className="p-container"><ClientModule isMobile={isMobile} clients={dbData.clients} onRefresh={fetchInitialData} initialClientId={tabParams.clientId} /></div>;
      case 'personnel': return <div className="p-container"><PersonnelModule isMobile={isMobile} inventory={dbData.inventory || []} /></div>;
      case 'history': return <div className="p-container"><HistoryModule isMobile={isMobile} rates={effectiveRates} onNavigate={handleTabChange} /></div>;
      default: return <div className="p-container"><DashboardModule isMobile={isMobile} currency={currency} rates={effectiveRates} onNavigate={handleTabChange} /></div>;
    }
  };

  if (!user) return <Login />;

  if (isMobile) {
    return (
      <MobileLayout activeTab={activeTab} setActiveTab={handleTabChange} onOpenSale={() => setIsSaleModalOpen(true)}>
        <AstroLoader visible={isAppLoading || isTabLoading} />
        <div key={activeTab} className="animate-fade-in" style={{ height: '100%' }}>
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
        <StaffProfileModal 
          isOpen={isMyProfileOpen} 
          onClose={() => setIsMyProfileOpen(false)} 
          staffMember={dbData.staff.find(s => s.id === user?.id)} 
          inventory={dbData.inventory || []}
          onUpdate={fetchInitialData} 
        />
      </MobileLayout>
    );
  }

  return (
    <div className="app-container" style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)', position: 'relative' }}>
      <AstroLoader visible={isAppLoading || isTabLoading} />
      <ParticleBackground />
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(id) => handleTabChange(id, {})} 
        rates={effectiveRates} 
        bcvRates={rates}
        isCustomRate={isCustomRate}
        onToggleCustom={setIsCustomRate}
        onUpdateCustom={setCustomRates}
        customRates={customRates}
      />
      <main className="main-content" style={{ 
        flex: 1, 
        marginLeft: isMobile ? '0' : '260px', 
        padding: 'var(--spacing-xl)', 
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)'
      }}>
        <div key={activeTab} className="animate-fade-in" style={{ height: '100%' }}>
          {renderContent()}
        </div>
      </main>
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
      <StaffProfileModal 
        isOpen={isMyProfileOpen} 
        onClose={() => setIsMyProfileOpen(false)} 
        staffMember={dbData.staff.find(s => s.id === user?.id)} 
        inventory={dbData.inventory || []}
        onUpdate={fetchInitialData} 
      />
    </div>
  );
}

export default App;
