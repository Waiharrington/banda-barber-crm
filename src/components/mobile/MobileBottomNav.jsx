import React, { useState } from 'react';
import { 
  Home, 
  Users, 
  Package, 
  Wallet, 
  MoreHorizontal,
  X,
  Calendar,
  UserCircle,
  Scissors,
  Star,
  Plus,
  History,
  Settings,
  BarChart3
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

const MobileBottomNav = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const allMainItems = [
    { id: 'dashboard', label: 'Inicio', icon: Home, roles: ['Admin', 'Asistente de Lavado'] },
    { id: 'clients', label: 'Clientes', icon: Users, roles: ['Admin', 'Barbero', 'Recepcionista', 'Caja'] },
    { id: 'inventory', label: 'Stock', icon: Package, roles: ['Admin', 'Caja'] },
    { id: 'finance', label: 'Caja', icon: Wallet, roles: ['Admin', 'Caja'] },
  ];

  const allSecondaryItems = [
    { id: 'scheduling', label: 'Agenda', icon: Calendar, roles: ['Admin', 'Barbero', 'Recepcionista'] },
    { id: 'reception', label: 'Recepción', icon: UserCircle, roles: ['Admin', 'Recepcionista'] },
    { id: 'checkout', label: 'Caja', icon: Wallet, roles: ['Admin', 'Caja'] },
    { id: 'barber', label: 'Panel Barber', icon: Scissors, roles: ['Admin', 'Barbero', 'Asistente de Lavado'] },
    { id: 'history', label: 'Historial', icon: History, roles: ['Admin', 'Barbero', 'Recepcionista', 'Caja', 'Asistente de Lavado'] },
    { id: 'personnel', label: 'Equipo', icon: Scissors, roles: ['Admin'] },
    { id: 'reports', label: 'Reportes', icon: BarChart3, roles: ['Admin'] },
    { id: 'services', label: 'Servicios', icon: Star, roles: ['Admin'] },
  ];

  const filterByPerms = (items) => items.filter(item => {
    const userRole = user?.role || '';
    const [roleName, customPerms] = userRole.split('|');

    if (roleName === 'Admin') return true;
    
    // Asistente de Lavado: only dashboard, history, barber, my-profile
    if (roleName === 'Asistente de Lavado') {
      return ['dashboard', 'history', 'barber', 'my-profile'].includes(item.id);
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

  const mainItems = filterByPerms(allMainItems);
  const secondaryItems = filterByPerms(allSecondaryItems);

  const handleSelect = (id) => {
    setActiveTab(id);
    setIsMenuOpen(false);
  };

  return (
    <>
      <nav style={{
        position: 'fixed',
        bottom: '0',
        left: '0',
        right: '0',
        height: '70px',
        backgroundColor: '#111111',
        backdropFilter: 'blur(20px)',
        borderRadius: '0',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '0 10px 12px 10px', // Extra bottom padding for safe-area / traditional look
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.6)',
        zIndex: 1000
      }}>
        {mainItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              style={{
                background: 'none',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '12px 10px 4px 10px',
                color: isActive ? 'var(--gold-primary)' : 'var(--text-muted)',
                transition: 'all 0.2s',
                cursor: 'pointer',
                position: 'relative',
                height: '100%',
                justifyContent: 'center'
              }}
            >
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  width: '28px',
                  height: '3px',
                  borderRadius: '0 0 3px 3px',
                  background: 'var(--gold-gradient)',
                  boxShadow: '0 0 10px var(--gold-primary)',
                  animation: 'fadeIn 0.25s ease-out'
                }} />
              )}
              <item.icon 
                size={22} 
                strokeWidth={isActive ? 2.5 : 2} 
                style={{
                  transform: isActive ? 'scale(1.1)' : 'scale(1)',
                  transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
              />
              <span style={{ fontSize: '10px', fontWeight: isActive ? '700' : '500' }}>
                {item.label}
              </span>
            </button>
          );
        })}

        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            padding: '12px 10px 4px 10px',
            color: isMenuOpen ? 'var(--gold-primary)' : 'var(--text-muted)',
            transition: 'all 0.2s',
            cursor: 'pointer',
            position: 'relative',
            height: '100%',
            justifyContent: 'center'
          }}
        >
          {isMenuOpen && (
            <div style={{
              position: 'absolute',
              top: 0,
              width: '28px',
              height: '3px',
              borderRadius: '0 0 3px 3px',
              background: 'var(--gold-gradient)',
              boxShadow: '0 0 10px var(--gold-primary)',
              animation: 'fadeIn 0.25s ease-out'
            }} />
          )}
          <div style={{
            transform: isMenuOpen ? 'scale(1.1) rotate(90deg)' : 'scale(1) rotate(0deg)',
            transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            {isMenuOpen ? <X size={22} /> : <MoreHorizontal size={22} />}
          </div>
          <span style={{ fontSize: '10px', fontWeight: isMenuOpen ? '700' : '500' }}>Más</span>
        </button>
      </nav>

      {/* Global "More" Menu Overlay */}
      {isMenuOpen && (
        <div 
          onClick={() => setIsMenuOpen(false)}
          className="animate-fade-in"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(10px)',
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '100px 16px 82px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="animate-slide-up"
            style={{
              backgroundColor: 'rgba(28,28,30,0.95)',
              borderRadius: '28px',
              padding: '24px',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.8)'
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {secondaryItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '16px 8px',
                    color: activeTab === item.id ? 'var(--gold-primary)' : 'white',
                    borderRadius: '16px',
                    backgroundColor: activeTab === item.id ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.02)',
                    transition: 'all 0.2s'
                  }}
                >
                  <item.icon size={24} />
                  <span style={{ fontSize: '10px', textAlign: 'center', fontWeight: '700' }}>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileBottomNav;
