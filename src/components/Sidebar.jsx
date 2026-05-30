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
  PanelLeftOpen
} from 'lucide-react';
import logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ activeTab, setActiveTab, isMobile, rates, isCollapsed, setIsCollapsed, activeRateType, onToggleRateType }) => {
  const { user, logout } = useAuth();

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['Admin', 'Barbero', 'Recepcionista', 'Caja', 'Asistente de Lavado'] },
    { id: 'my-profile', label: 'Mi Perfil', icon: UserCircle, roles: ['Admin', 'Barbero', 'Recepcionista', 'Caja', 'Asistente de Lavado'] },
    { id: 'scheduling', label: 'Agenda', icon: Calendar, roles: ['Admin', 'Barbero', 'Recepcionista'] },
    { id: 'reception', label: 'Recepción', icon: UserCircle, roles: ['Admin', 'Recepcionista'] },
    { id: 'checkout', label: 'Caja', icon: Wallet, roles: ['Admin', 'Caja'] },
    { id: 'barber', label: 'Panel Barber', icon: Scissors, roles: ['Admin', 'Barbero'] },
    { id: 'clients', label: 'Clientes', icon: Users, roles: ['Admin', 'Recepcionista', 'Barbero', 'Caja'] },
    { id: 'personnel', label: 'Astro Team', icon: Scissors, roles: ['Admin'] },
    { id: 'services', label: 'Servicios', icon: Star, roles: ['Admin'] },
    { id: 'inventory', label: 'Inventario', icon: Package, roles: ['Admin', 'Caja'] },
    { id: 'finance', label: 'Caja Chica', icon: Wallet, roles: ['Admin', 'Caja'] },
    { id: 'reports', label: 'Reportes', icon: BarChart3, roles: ['Admin'] },
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

  const sidebarStyle = isMobile ? {
    width: '100%', height: 'auto', backgroundColor: 'transparent', display: 'flex', flexDirection: 'column', padding: '0'
  } : {
    width: isCollapsed ? '80px' : '260px', height: '100vh', backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)',
    display: 'flex', flexDirection: 'column', padding: isCollapsed ? '20px 10px' : '20px 16px', position: 'fixed', left: 0, top: 0, overflowY: 'auto',
    transition: 'all 0.3s ease', zIndex: 100
  };

  return (
    <div className="sidebar" style={sidebarStyle}>
      {!isMobile && (
        <div className="logo-container" style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', position: 'relative' }}>
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
              marginBottom: isCollapsed ? '24px' : '0'
            }}
          >
            {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>

          {!isCollapsed && (
            <>
              <img src={logo} alt="Astro Barber" style={{ width: '100%', height: 'auto', maxWidth: '140px', marginTop: '24px' }} />
              
              {/* Rate Toggle Badge */}
              {(rates?.bcv > 0 || rates?.usdt > 0) && (
                <div style={{ 
                  backgroundColor: 'rgba(212, 175, 55, 0.05)', 
                  border: '1px solid rgba(212, 175, 55, 0.15)', 
                  borderRadius: '14px', 
                  padding: '10px',
                  width: '100%',
                  display: 'flex',
                  gap: '6px'
                }}>
                  <button
                    onClick={() => onToggleRateType && onToggleRateType('bcv')}
                    style={{
                      flex: 1,
                      padding: '8px 6px',
                      borderRadius: '10px',
                      border: activeRateType === 'bcv' ? '1.5px solid var(--gold-primary)' : '1.5px solid transparent',
                      background: activeRateType === 'bcv' ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.02)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                      transition: 'all 0.25s ease'
                    }}
                  >
                    <span style={{ fontSize: '8px', fontWeight: '900', color: activeRateType === 'bcv' ? 'var(--gold-primary)' : 'var(--text-muted)', letterSpacing: '0.5px' }}>BCV</span>
                    <span style={{ fontSize: '13px', fontWeight: '950', color: activeRateType === 'bcv' ? 'var(--gold-primary)' : 'white' }}>
                      {rates.bcv > 0 ? rates.bcv.toFixed(2) : '—'}
                    </span>
                  </button>
                  <button
                    onClick={() => onToggleRateType && onToggleRateType('usdt')}
                    style={{
                      flex: 1,
                      padding: '8px 6px',
                      borderRadius: '10px',
                      border: activeRateType === 'usdt' ? '1.5px solid #26a65b' : '1.5px solid transparent',
                      background: activeRateType === 'usdt' ? 'rgba(38,166,91,0.12)' : 'rgba(255,255,255,0.02)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                      transition: 'all 0.25s ease'
                    }}
                  >
                    <span style={{ fontSize: '8px', fontWeight: '900', color: activeRateType === 'usdt' ? '#26a65b' : 'var(--text-muted)', letterSpacing: '0.5px' }}>USDT</span>
                    <span style={{ fontSize: '13px', fontWeight: '950', color: activeRateType === 'usdt' ? '#26a65b' : 'white' }}>
                      {rates.usdt > 0 ? rates.usdt.toFixed(2) : '—'}
                    </span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id} onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: isCollapsed ? '12px 0' : '10px 12px',
                backgroundColor: isActive ? 'rgba(212, 175, 55, 0.08)' : 'transparent', border: 'none', borderRadius: '12px',
                color: isActive ? 'var(--gold-primary)' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                textAlign: 'left', width: '100%', fontWeight: isActive ? '700' : '500',
                justifyContent: isCollapsed ? 'center' : 'flex-start'
              }}
              title={isCollapsed ? item.label : undefined}
            >
              <div style={{ color: isActive ? 'var(--gold-primary)' : 'var(--text-muted)' }}>
                <Icon size={24} />
              </div>
              {!isCollapsed && <span style={{ fontSize: '15px' }}>{item.label}</span>}
              {!isCollapsed && isActive && (
                <div style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--gold-primary)', boxShadow: '0 0 10px var(--gold-primary)' }} />
              )}
            </button>
          );
        })}
      </nav>

      {!isMobile && (
        <div style={{ marginTop: 'auto' }}>
          <div className="user-profile" style={{ padding: isCollapsed ? '16px 0' : '16px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <UserCircle size={20} color="var(--gold-primary)" />
            </div>
            {!isCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: '14px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{user?.role?.split('|')[0]}</span>
              </div>
            )}
          </div>
          <button 
            onClick={logout}
            title={isCollapsed ? 'Cerrar Sesión' : undefined}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '10px', padding: '10px 12px', background: 'rgba(255, 69, 58, 0.05)', border: 'none', borderRadius: '12px', color: '#ff453a', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
          >
            <LogOut size={isCollapsed ? 24 : 18} /> {!isCollapsed && "Cerrar Sesión"}
          </button>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
