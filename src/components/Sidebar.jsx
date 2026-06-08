import { useRef, useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  UserCircle, 
  Scissors, 
  Package, 
  Wallet, 
  Star,
  Calendar,
  History,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  ClipboardList,
  CreditCard,
  UserCheck
} from 'lucide-react';
import logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';

const Sidebar = ({ activeTab, setActiveTab, isMobile, rates, isCollapsed, setIsCollapsed, activeRateType, onToggleRateType }) => {
  const { user, logout } = useAuth();
  const { isModalOpen } = useModal();

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['Admin', 'Barbero', 'Recepcionista', 'Caja', 'Asistente de Lavado'] },
    { id: 'my-profile', label: 'Mi Perfil', icon: UserCircle, roles: ['Admin', 'Barbero', 'Recepcionista', 'Caja', 'Asistente de Lavado'] },
    { id: 'scheduling', label: 'Agenda', icon: Calendar, roles: ['Admin', 'Barbero', 'Recepcionista'] },
    { id: 'reception', label: 'Recepción', icon: ClipboardList, roles: ['Admin', 'Recepcionista'] },
    { id: 'checkout', label: 'Caja', icon: CreditCard, roles: ['Admin', 'Caja'] },
    { id: 'barber', label: 'Panel Barber', icon: Scissors, roles: ['Admin', 'Barbero'] },
    { id: 'clients', label: 'Clientes', icon: Users, roles: ['Admin', 'Recepcionista', 'Barbero', 'Caja'] },
    { id: 'personnel', label: 'Astro Team', icon: UserCheck, roles: ['Admin'] },
    { id: 'services', label: 'Servicios', icon: Star, roles: ['Admin'] },
    { id: 'inventory', label: 'Inventario', icon: Package, roles: ['Admin', 'Caja'] },
    { id: 'finance', label: 'Caja Chica', icon: Wallet, roles: ['Admin', 'Caja'] },
    { id: 'reports', label: 'Reportes', icon: PieChart, roles: ['Admin'] },
    { id: 'history', label: 'Historial', icon: History, roles: ['Admin', 'Barbero', 'Recepcionista', 'Caja', 'Asistente de Lavado'] },
  ];

  const menuItems = allMenuItems.filter(item => {
    const userRole = user?.role || '';
    const [roleName, customPerms] = userRole.split('|');

    if (roleName === 'Admin') return true;
    if (item.id === 'my-profile') return true;
    
    if (roleName === 'Asistente de Lavado') {
      return ['dashboard', 'history', 'barber'].includes(item.id);
    }

    if (customPerms) {
      const perms = customPerms.split(',');
      return perms.includes(item.id);
    }

    if (roleName.startsWith('Custom:')) {
      const perms = roleName.split(':')[1].split(',');
      return perms.includes(item.id);
    }

    return item.roles.includes(roleName);
  });

  const sidebarRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!sidebarRef.current) return;
    const rect = sidebarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    sidebarRef.current.style.setProperty('--mouse-x', `${x}px`);
    sidebarRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  const itemRefs = useRef([]);
  const [hoveredTab, setHoveredTab] = useState(null);
  const [indicatorStyle, setIndicatorStyle] = useState({
    transform: 'translateY(0px)',
    height: '0px',
    opacity: 0
  });

  const updateIndicator = (element) => {
    if (!element) return;
    setIndicatorStyle({
      transform: `translateY(${element.offsetTop}px)`,
      height: `${element.offsetHeight}px`,
      opacity: 1
    });
  };

  const displayedTab = hoveredTab || activeTab;

  useEffect(() => {
    const timer = setTimeout(() => {
      const activeIndex = menuItems.findIndex(item => item.id === displayedTab);
      if (activeIndex !== -1 && itemRefs.current[activeIndex]) {
        updateIndicator(itemRefs.current[activeIndex]);
      }
    }, 20); // Quick sync
    return () => clearTimeout(timer);
  }, [displayedTab, menuItems, isCollapsed]);

  const sidebarStyle = isMobile ? {
    width: '100%', height: 'auto', backgroundColor: 'transparent', display: 'flex', flexDirection: 'column', padding: '0'
  } : {
    width: isCollapsed ? '80px' : '260px', height: '100vh', backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)',
    display: 'flex', flexDirection: 'column', padding: isCollapsed ? '16px 10px' : '20px 16px', position: 'fixed', left: 0, top: 0, overflowY: 'auto',
    transition: 'all 0.3s ease', zIndex: 100,
    transform: isModalOpen ? 'translateX(-100%)' : 'translateX(0)',
    opacity: isModalOpen ? 0 : 1,
    pointerEvents: isModalOpen ? 'none' : 'auto',
  };

  return (
    <div className="sidebar" style={sidebarStyle}>
      {!isMobile && (
        <div className="logo-container" style={{ marginBottom: isCollapsed ? '16px' : '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', position: 'relative' }}>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{ 
              position: isCollapsed ? 'static' : 'absolute', 
              right: isCollapsed ? 'auto' : '0', 
              top: '0', 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-muted)', 
              cursor: 'pointer',
              marginBottom: isCollapsed ? '16px' : '0'
            }}
          >
            {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>

          {!isCollapsed && (
            <img src={logo} alt="Astro Barber" style={{ width: '100%', height: 'auto', maxWidth: '120px', marginTop: '12px' }} />
          )}
        </div>
      )}

      <nav 
        onMouseLeave={() => setHoveredTab(null)}
        style={{ display: 'flex', flexDirection: 'column', gap: '2px', position: 'relative' }}
      >
        <div 
          className="menu-active-indicator"
          style={{
            position: 'absolute',
            left: 0,
            width: '100%',
            backgroundColor: 'rgba(212, 175, 55, 0.08)',
            borderRadius: '10px',
            transition: 'transform 0.22s cubic-bezier(0.25, 1, 0.5, 1), height 0.22s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease',
            pointerEvents: 'none',
            zIndex: 0,
            ...indicatorStyle
          }}
        />
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id} 
              ref={el => itemRefs.current[index] = el}
              onClick={() => setActiveTab(item.id)}
              onMouseEnter={() => setHoveredTab(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: isCollapsed ? '7px 0' : '8px 10px',
                backgroundColor: 'transparent', border: 'none', borderRadius: '10px',
                color: isActive ? 'var(--gold-primary)' : 'var(--text-secondary)', cursor: 'pointer', transition: 'color 0.25s ease',
                textAlign: 'left', width: '100%', fontWeight: isActive ? '700' : '500',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                position: 'relative',
                zIndex: 1
              }}
              title={isCollapsed ? item.label : undefined}
            >
              <div style={{ color: isActive ? 'var(--gold-primary)' : 'var(--text-muted)' }}>
                <Icon size={20} />
              </div>
              {!isCollapsed && <span style={{ fontSize: '13.5px' }}>{item.label}</span>}
              {!isCollapsed && isActive && (
                <div style={{ marginLeft: 'auto', width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--gold-primary)', boxShadow: '0 0 8px var(--gold-primary)' }} />
              )}
            </button>
          );
        })}
      </nav>

      {!isMobile && (
        <div style={{ marginTop: 'auto' }}>
          <button 
            onClick={logout}
            title={isCollapsed ? 'Cerrar Sesión' : undefined}
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: isCollapsed ? 'center' : 'flex-start', 
              gap: '10px', 
              padding: isCollapsed ? '10px 0' : '10px 12px', 
              background: 'rgba(255, 69, 58, 0.05)', 
              border: '1px solid rgba(255, 69, 58, 0.15)', 
              borderRadius: '10px', 
              color: '#ff453a', 
              cursor: 'pointer', 
              fontSize: '13px', 
              fontWeight: '600',
              transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: 'none'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255, 69, 58, 0.12)';
              e.currentTarget.style.border = '1px solid rgba(255, 69, 58, 0.4)';
              e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 69, 58, 0.2)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255, 69, 58, 0.05)';
              e.currentTarget.style.border = '1px solid rgba(255, 69, 58, 0.15)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <LogOut size={isCollapsed ? 20 : 16} /> {!isCollapsed && "Cerrar Sesión"}
          </button>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
