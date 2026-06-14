import { useRef, useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  Scissors, 
  Package, 
  Wallet, 
  Star,
  Calendar,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  ClipboardList,
  CreditCard,
  UserCheck,
  Settings
} from 'lucide-react';
import logo from '../assets/logo.png';
import sidebarLogo from '../assets/sidebar_logo.png';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';

const Sidebar = ({ activeTab, setActiveTab, isMobile, rates, isCollapsed, setIsCollapsed, activeRateType, onToggleRateType }) => {
  const { user, logout } = useAuth();
  const { isModalOpen } = useModal();

  const allMenuItems = [
    { id: 'dashboard', label: 'Inicio', icon: BarChart3, roles: ['Admin', 'Barbero', 'Recepcionista', 'Caja', 'Asistente de Lavado'] },
    { id: 'scheduling', label: 'Calendario', icon: Calendar, roles: ['Admin', 'Barbero', 'Recepcionista'] },
    { id: 'reception', label: 'Citas', icon: ClipboardList, roles: ['Admin', 'Recepcionista'] },
    { id: 'checkout', label: 'Caja', icon: CreditCard, roles: ['Admin', 'Caja'] },
    { id: 'barber', label: 'Panel Barberos', icon: Scissors, roles: ['Admin', 'Barbero'] },
    { id: 'clients', label: 'Clientes', icon: Users, roles: ['Admin', 'Recepcionista', 'Barbero', 'Caja'] },
    { id: 'services', label: 'Servicios', icon: Star, roles: ['Admin'] },
    { id: 'personnel', label: 'Equipo', icon: UserCheck, roles: ['Admin'] },
    { id: 'inventory', label: 'Inventario', icon: Package, roles: ['Admin', 'Caja'] },
    { id: 'reports', label: 'Reportes', icon: PieChart, roles: ['Admin'] },
    { id: 'finance', label: 'Finanzas', icon: Wallet, roles: ['Admin', 'Caja'] },
    { id: 'history', label: 'Ajustes', icon: Settings, roles: ['Admin', 'Barbero', 'Recepcionista', 'Caja', 'Asistente de Lavado'] },
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
    }, 20);
    return () => clearTimeout(timer);
  }, [displayedTab, menuItems, isCollapsed]);

  const sidebarStyle = isMobile ? {
    width: '100%', height: 'auto', backgroundColor: 'transparent', display: 'flex', flexDirection: 'column', padding: '0'
  } : {
    width: isCollapsed ? '75px' : '245px',
    height: '100vh',
    background: 'linear-gradient(180deg, #09090d 0%, #07070a 100%)',
    borderRight: '1px solid rgba(255, 255, 255, 0.04)',
    display: 'flex',
    flexDirection: 'column',
    padding: isCollapsed ? '12px 8px' : '16px 12px 14px 12px',
    position: 'fixed', left: 0, top: 0,
    overflowY: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    zIndex: 100,
    transform: isModalOpen ? 'translateX(-100%)' : 'translateX(0)',
    opacity: isModalOpen ? 0 : 1,
    pointerEvents: isModalOpen ? 'none' : 'auto',
    boxShadow: '4px 0 40px rgba(0,0,0,0.6)',
  };

  const userRoleName = (user?.role || '').split('|')[0] || 'Administrador';

  return (
    <div className="sidebar animate-fade-in" style={sidebarStyle}>

      {!isMobile && (
        <div className="logo-container" style={{ marginBottom: isCollapsed ? '12px' : '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', position: 'relative', zIndex: 2 }}>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{ 
              position: isCollapsed ? 'static' : 'absolute', 
              right: isCollapsed ? 'auto' : '0', 
              top: '0', 
              background: 'transparent', 
              border: 'none', 
              color: 'rgba(255,255,255,0.25)',
              cursor: 'pointer',
              marginBottom: isCollapsed ? '10px' : '0',
              transition: 'color 0.2s ease',
              padding: '4px',
              borderRadius: '6px',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
          >
            {isCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>

          {!isCollapsed && (
            <img
              src={sidebarLogo}
              alt="Panda Barber Studio"
              style={{
                width: '85%', height: 'auto', maxWidth: '185px', marginTop: '8px',
                filter: 'drop-shadow(0 0 12px rgba(203,183,154,0.12)) brightness(1.05)'
              }}
            />
          )}
        </div>
      )}

      <nav 
        onMouseLeave={() => setHoveredTab(null)}
        style={{ display: 'flex', flexDirection: 'column', gap: '2px', position: 'relative', zIndex: 2 }}
      >
        {/* Gliding active indicator pill */}
        <div 
          className="menu-active-indicator"
          style={{
            position: 'absolute',
            left: 0,
            width: '100%',
            background: 'linear-gradient(135deg, rgba(203, 183, 154, 0.10) 0%, rgba(203, 183, 154, 0.02) 100%)',
            border: '1px solid rgba(203, 183, 154, 0.18)',
            borderRadius: '9px',
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
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: isCollapsed ? '8px 0' : '8px 12px',
                backgroundColor: 'transparent', border: 'none', borderRadius: '9px',
                cursor: 'pointer',
                transition: 'color 0.2s ease',
                textAlign: 'left', width: '100%',
                fontWeight: isActive ? '700' : '500',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                position: 'relative', zIndex: 1,
              }}
              title={isCollapsed ? item.label : undefined}
            >
              <div style={{ 
                color: isActive ? 'var(--champagne)' : 'rgba(200,200,200,0.32)',
                display: 'flex', alignItems: 'center',
                filter: isActive ? 'drop-shadow(0 0 7px rgba(203,183,154,0.65))' : 'none',
                transition: 'all 0.25s ease',
              }}>
                <Icon size={17} strokeWidth={isActive ? 2.2 : 1.7} />
              </div>
              {!isCollapsed && (
                <span style={{ 
                  fontSize: '13.5px',
                  letterSpacing: isActive ? '-0.2px' : '0',
                  color: isActive ? '#f8f8f8' : 'rgba(200,200,200,0.42)',
                  transition: 'all 0.2s ease',
                }}>
                  {item.label}
                </span>
              )}
              {!isCollapsed && isActive && (
                <div className="menu-gold-dot" />
              )}
            </button>
          );
        })}
      </nav>

      {!isMobile && (
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', zIndex: 2 }}>
          
          {/* Premium Profile Card with Glassmorphism */}
          {!isCollapsed && (
            <div
              onClick={() => setActiveTab('my-profile')}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                padding: '10px 12px', 
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.07)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.055)';
                e.currentTarget.style.borderColor = 'rgba(203,183,154,0.22)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
              }}
            >
              {/* Avatar with gold ring */}
              <div style={{ 
                width: '32px', height: '32px', borderRadius: '50%', 
                background: 'linear-gradient(135deg, rgba(203,183,154,0.25) 0%, rgba(100,80,50,0.15) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
                border: '1.5px solid rgba(203,183,154,0.28)',
                boxShadow: '0 0 12px rgba(203,183,154,0.12)',
                flexShrink: 0,
              }}>
                {user?.image_url ? (
                  <img src={user.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <img src={logo} alt="" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  fontSize: '12.5px', fontWeight: '700', color: '#f5f5f5',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  letterSpacing: '-0.2px',
                }}>
                  {user?.name || 'Panda Barber'}
                </div>
                <div style={{ 
                  fontSize: '9.5px', color: 'var(--champagne)', fontWeight: '600',
                  opacity: 0.65, marginTop: '1px',
                  textTransform: 'uppercase', letterSpacing: '0.6px',
                }}>
                  {userRoleName}
                </div>
              </div>
              <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.18)', fontWeight: '700' }}>▼</span>
            </div>
          )}

          <button 
            onClick={logout}
            title={isCollapsed ? 'Cerrar Sesión' : undefined}
            style={{ 
              width: '100%', display: 'flex', alignItems: 'center', 
              justifyContent: isCollapsed ? 'center' : 'flex-start', 
              gap: '8px', padding: isCollapsed ? '8px 0' : '8px 10px', 
              background: 'rgba(255, 69, 58, 0.04)', 
              border: '1px solid rgba(255, 69, 58, 0.12)', 
              borderRadius: '9px', 
              color: 'rgba(255, 80, 68, 0.7)', 
              cursor: 'pointer', fontSize: '12px', fontWeight: '600',
              letterSpacing: '0.1px',
              transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255, 69, 58, 0.1)';
              e.currentTarget.style.border = '1px solid rgba(255, 69, 58, 0.35)';
              e.currentTarget.style.boxShadow = '0 0 16px rgba(255, 69, 58, 0.15)';
              e.currentTarget.style.color = '#ff5a4e';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255, 69, 58, 0.04)';
              e.currentTarget.style.border = '1px solid rgba(255, 69, 58, 0.12)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.color = 'rgba(255, 80, 68, 0.7)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <LogOut size={isCollapsed ? 15 : 13} /> {!isCollapsed && "Cerrar Sesión"}
          </button>
        </div>
      )}    </div>
  );
};

export default Sidebar;
