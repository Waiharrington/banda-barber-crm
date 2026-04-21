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
import { dataService } from './services/dataService';
import logo from './assets/logo.png';

// Mobile Components
import MobileLayout from './components/mobile/MobileLayout';
import MobileDashboard from './components/mobile/MobileDashboard';
import AdminModule from './components/AdminModule';
import ParticleBackground from './components/ParticleBackground';
import AstroLoader from './components/AstroLoader';
import ReceptionModule from './components/ReceptionModule';
import CheckoutPOS from './components/CheckoutPOS';
import BarberPanel from './components/BarberPanel';
import SchedulingModule from './components/SchedulingModule';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isTabLoading, setIsTabLoading] = useState(false);
  
  // Multi-currency State
  const [currency, setCurrency] = useState('USD'); // Moneda de vista GLOBAL
  const [rates, setRates] = useState({ usd: 0, eur: 0, updated_at: null });

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
  const [dbData, setDbData] = useState({ clients: [], services: [], staff: [] });
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
    { id: 'reception', label: 'Recepción (Padre)', icon: UserCircle },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'personnel', label: 'Personal', icon: Scissors },
    { id: 'services', label: 'Servicios', icon: Star },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'finance', label: 'Caja Chica', icon: Wallet },
    { id: 'admin', label: 'Administración', icon: Settings },
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
      const [c, s, st, t] = await Promise.all([
        dataService.getClients(),
        dataService.getServices(),
        dataService.getStaff(),
        dataService.getTransactions()
      ]);
      setDbData({ clients: c, services: s, staff: st });
      const today = new Date().toISOString().split('T')[0];
      const todayTransactions = t.filter(trans => trans.created_at.startsWith(today));
      setStats({
        income: todayTransactions.filter(tr => tr.type === 'income').reduce((acc, tr) => acc + Number(tr.amount), 0),
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

  const handleTabChange = (tabId) => {
    if (tabId === activeTab) return;
    setIsTabLoading(true);
    // Short transition to maintain the premium feel
    setTimeout(() => {
      setActiveTab(tabId);
      setIsTabLoading(false);
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
          <MobileDashboard onOpenSale={() => setIsSaleModalOpen(true)} stats={stats} chartData={chartData} dbData={dbData} />
        ) : (
          <DashboardModule isMobile={isMobile} onOpenSale={() => setIsSaleModalOpen(true)} stats={stats} chartData={chartData} dbData={dbData} handleSeedData={handleSeedData} />
        );
      case 'reception': return <div className="p-container"><ReceptionModule isMobile={isMobile} /></div>;
      case 'checkout': return <div className="p-container"><CheckoutPOS isMobile={isMobile} rates={rates} /></div>;
      case 'barber': return <div className="p-container"><BarberPanel isMobile={isMobile} /></div>;
      case 'scheduling': return <div className="p-container"><SchedulingModule isMobile={isMobile} /></div>;
      case 'services': return <div className="p-container"><ServicesModule isMobile={isMobile} currency={currency} rates={rates} /></div>;
      case 'inventory': return <div className="p-container"><InventoryModule isMobile={isMobile} currency={currency} rates={rates} /></div>;
      case 'finance': return <div className="p-container"><FinanceModule isMobile={isMobile} currency={currency} rates={rates} /></div>;
      case 'clients': return <div className="p-container"><ClientModule isMobile={isMobile} /></div>;
      case 'personnel': return <div className="p-container"><PersonnelModule isMobile={isMobile} /></div>;
      case 'admin': return <div className="p-container"><AdminModule isMobile={isMobile} onRefresh={handleRefresh} rates={rates} setRates={setRates} /></div>;
      default: return <div className="p-container"><DashboardModule isMobile={isMobile} currency={currency} rates={rates} /></div>;
    }
  };

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
          onRefresh={fetchInitialData}
          rates={rates}
          currency={currency}
        />
      </MobileLayout>
    );
  }

  return (
    <div className="app-container" style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)', position: 'relative' }}>
      <AstroLoader visible={isAppLoading || isTabLoading} />
      <ParticleBackground />
      <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />
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
        onRefresh={fetchInitialData}
        rates={rates}
        currency={currency}
      />
    </div>
  );
}

export default App;
