import React from 'react';
import { 
  BarChart3, 
  Users, 
  UserCircle, 
  Scissors, 
  Package, 
  Wallet, 
  Settings,
  Star,
  Calendar
} from 'lucide-react';

import logo from '../assets/logo.png';

const Sidebar = ({ activeTab, setActiveTab, isMobile }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'scheduling', label: 'Agenda (Astro)', icon: Calendar },
    { id: 'reception', label: 'Recepción (Padre)', icon: UserCircle },
    { id: 'checkout', label: 'Caja (Pro)', icon: Wallet },
    { id: 'barber', label: 'Panel Barber (Hijo)', icon: Scissors },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'personnel', label: 'Personal', icon: Scissors },
    { id: 'services', label: 'Servicios', icon: Star },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'finance', label: 'Caja Chica', icon: Wallet },
    { id: 'admin', label: 'Administración', icon: Settings },
  ];

  const sidebarStyle = isMobile ? {
    width: '100%',
    height: 'auto',
    backgroundColor: 'transparent',
    display: 'flex',
    flexDirection: 'column',
    padding: '0'
  } : {
    width: '260px',
    height: '100vh',
    backgroundColor: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 16px',
    position: 'fixed',
    left: 0,
    top: 0,
    overflowY: 'auto'
  };

  return (
    <div className="sidebar" style={sidebarStyle}>
      {!isMobile && (
        <div className="logo-container" style={{
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <img src={logo} alt="Astro Barber" style={{ width: '100%', height: 'auto', maxWidth: '140px' }} />
        </div>
      )}

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                backgroundColor: isActive ? 'rgba(212, 175, 55, 0.08)' : 'transparent',
                border: 'none',
                borderRadius: '12px',
                color: isActive ? 'var(--gold-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                textAlign: 'left',
                width: '100%',
                fontWeight: isActive ? '700' : '500',
                letterSpacing: isActive ? '0.1px' : '0'
              }}
            >
              <div style={{
                color: isActive ? 'var(--gold-primary)' : 'var(--text-muted)',
                transition: 'color 0.2s'
              }}>
                <Icon size={20} />
              </div>
              <span style={{ fontSize: '15px' }}>{item.label}</span>
              {isActive && (
                <div style={{
                  marginLeft: 'auto',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--gold-primary)',
                  boxShadow: '0 0 10px var(--gold-primary)'
                }} />
              )}
            </button>
          );
        })}
      </nav>

      {!isMobile && (
        <div className="user-profile" style={{
          marginTop: 'auto',
          padding: '16px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <UserCircle size={32} color="var(--text-secondary)" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '14px', fontWeight: '600' }}>Admin Barbero</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mánager</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
