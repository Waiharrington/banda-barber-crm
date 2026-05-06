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
  Pencil,
  RefreshCcw,
  Save
} from 'lucide-react';
import logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

const Sidebar = ({ activeTab, setActiveTab, isMobile, rates, bcvRates, isCustomRate, onToggleCustom, onUpdateCustom, customRates }) => {
  const { user, logout } = useAuth();
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [tempRate, setTempRate] = useState(rates?.usd || 0);

  const handleSaveRate = () => {
    onUpdateCustom({ ...customRates, shop: Number(tempRate) });
    localStorage.setItem('astro_custom_rates', JSON.stringify({ ...customRates, shop: Number(tempRate) }));
    setIsEditingRate(false);
  };

  const handleResetRate = () => {
    setIsEditingRate(false);
  };

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['Admin'] },
    { id: 'my-profile', label: 'Mi Perfil', icon: UserCircle, roles: ['Admin', 'Barbero', 'Recepcionista', 'Caja', 'Asistente'] },
    { id: 'scheduling', label: 'Agenda', icon: Calendar, roles: ['Admin', 'Barbero', 'Recepcionista'] },
    { id: 'reception', label: 'Recepción', icon: UserCircle, roles: ['Admin', 'Recepcionista'] },
    { id: 'checkout', label: 'Caja', icon: Wallet, roles: ['Admin', 'Caja'] },
    { id: 'barber', label: 'Panel Barber', icon: Scissors, roles: ['Admin', 'Barbero'] },
    { id: 'clients', label: 'Clientes', icon: Users, roles: ['Admin', 'Recepcionista', 'Barbero', 'Caja'] },
    { id: 'personnel', label: 'Astro Team', icon: Scissors, roles: ['Admin'] },
    { id: 'services', label: 'Servicios', icon: Star, roles: ['Admin'] },
    { id: 'inventory', label: 'Inventario', icon: Package, roles: ['Admin', 'Caja'] },
    { id: 'finance', label: 'Caja Chica', icon: Wallet, roles: ['Admin', 'Caja'] },
    { id: 'history', label: 'Historial', icon: History, roles: ['Admin', 'Barbero', 'Recepcionista', 'Caja', 'Asistente'] },
  ];

  const menuItems = allMenuItems.filter(item => {
    const userRole = user?.role || '';
    const [roleName, customPerms] = userRole.split('|');

    if (roleName === 'Admin') return true;
    if (item.id === 'my-profile') return true; // Everyone can see their own profile
    
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
    width: '260px', height: '100vh', backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)',
    display: 'flex', flexDirection: 'column', padding: '20px 16px', position: 'fixed', left: 0, top: 0, overflowY: 'auto'
  };

  return (
    <div className="sidebar" style={sidebarStyle}>
      {!isMobile && (
        <div className="logo-container" style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <img src={logo} alt="Astro Barber" style={{ width: '100%', height: 'auto', maxWidth: '140px' }} />
          
          {/* Global Rate Badge */}
          {rates?.usd > 0 && (
            <div style={{ 
              backgroundColor: 'rgba(212, 175, 55, 0.05)', 
              border: '1px solid rgba(212, 175, 55, 0.2)', 
              borderRadius: '12px', 
              padding: '8px 12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              position: 'relative',
              transition: 'all 0.3s'
            }}>
              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isEditingRate ? '10px' : '2px' }}>
                <span style={{ fontSize: '9px', fontWeight: '900', color: 'var(--gold-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Tasa Barbería
                </span>
                {!isEditingRate && (
                  <button 
                    onClick={() => {
                      setTempRate(rates.usd);
                      setIsEditingRate(true);
                    }}
                    style={{ background: 'transparent', border: 'none', padding: '2px', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center' }}
                  >
                    <Pencil size={10} />
                  </button>
                )}
              </div>

              {isEditingRate ? (
                <div style={{ width: '100%', display: 'flex', gap: '8px' }}>
                  <input 
                    type="number"
                    value={tempRate}
                    onChange={(e) => setTempRate(e.target.value)}
                    autoFocus
                    style={{ 
                      width: '75%', 
                      backgroundColor: 'rgba(0,0,0,0.3)', 
                      border: '1px solid rgba(212,175,55,0.3)', 
                      borderRadius: '8px', 
                      padding: '6px 10px', 
                      color: 'white', 
                      fontSize: '14px', 
                      fontWeight: '800',
                      outline: 'none'
                    }}
                  />
                  <button 
                    onClick={handleSaveRate}
                    title="Guardar Tasa"
                    style={{ flex: 1, backgroundColor: 'var(--gold-primary)', color: 'black', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Save size={16} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '15px', fontWeight: '900', color: 'white' }}>1$ = {rates.usd.toLocaleString()} Bs.</span>
                </div>
              )}
            </div>
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
                display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                backgroundColor: isActive ? 'rgba(212, 175, 55, 0.08)' : 'transparent', border: 'none', borderRadius: '12px',
                color: isActive ? 'var(--gold-primary)' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                textAlign: 'left', width: '100%', fontWeight: isActive ? '700' : '500'
              }}
            >
              <div style={{ color: isActive ? 'var(--gold-primary)' : 'var(--text-muted)' }}>
                <Icon size={20} />
              </div>
              <span style={{ fontSize: '15px' }}>{item.label}</span>
              {isActive && (
                <div style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--gold-primary)', boxShadow: '0 0 10px var(--gold-primary)' }} />
              )}
            </button>
          );
        })}
      </nav>

      {!isMobile && (
        <div style={{ marginTop: 'auto' }}>
          <div className="user-profile" style={{ padding: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCircle size={20} color="var(--gold-primary)" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: '14px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{user?.role?.split('|')[0]}</span>
            </div>
          </div>
          <button 
            onClick={logout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'rgba(255, 69, 58, 0.05)', border: 'none', borderRadius: '12px', color: '#ff453a', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
          >
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
