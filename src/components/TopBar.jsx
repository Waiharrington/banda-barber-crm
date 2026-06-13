import React, { useState, useEffect } from 'react';
import { 
  User, 
  Plus, 
  RefreshCw,
  Bell,
  Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/notificationService';

const TopBar = ({ 
  activeTab,
  rates, 
  onOpenSale, 
  isStoreOpen = true, 
  activeRateType,
  onToggleRateType,
  onOpenNotifications
}) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [currentDayStr, setCurrentDayStr] = useState('');

  useEffect(() => {
    const updateUnread = () => {
      const history = notificationService.getHistory();
      const count = history.filter(n => !n.read).length;
      setUnreadCount(count);
    };

    updateUnread();
    window.addEventListener('astro_new_notification', updateUnread);
    
    // Set current date in Spanish
    const today = new Date();
    const optionsDate = { year: 'numeric', month: 'long', day: 'numeric' };
    const optionsDay = { weekday: 'long' };
    
    const rawDay = today.toLocaleDateString('es-ES', optionsDay);
    const capitalizedDay = rawDay.charAt(0).toUpperCase() + rawDay.slice(1);
    
    setCurrentDateStr(`Hoy es ${today.toLocaleDateString('es-ES', optionsDate)}`);
    setCurrentDayStr(capitalizedDay);

    return () => {
      window.removeEventListener('astro_new_notification', updateUnread);
    };
  }, []);

  const getTabTitle = () => {
    switch (activeTab) {
      case 'my-profile': return 'Mi Perfil';
      case 'scheduling': return 'Calendario';
      case 'reception': return 'Citas / Recepción';
      case 'checkout': return 'Caja / Punto de Venta';
      case 'barber': return 'Panel de Barberos';
      case 'clients': return 'Clientes';
      case 'personnel': return 'Panda Team / Personal';
      case 'services': return 'Servicios';
      case 'inventory': return 'Inventario';
      case 'finance': return 'Finanzas';
      case 'reports': return 'Reportes';
      case 'history': return 'Historial de Transacciones';
      default: return '';
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: '14px',
      flexWrap: 'wrap',
      gap: '12px'
    }} className="animate-fade-in">
      
      {/* Left side: Greeting for dashboard, or Tab Title for others */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {activeTab === 'dashboard' ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'white', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              Buenos días, Panda Barber <span style={{ fontSize: '16px' }}>🐼</span>
            </h1>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '500', marginTop: '2px' }}>
              Aquí tienes el resumen de tu barbería.
            </span>
          </div>
        ) : (
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '-0.5px', color: 'white' }}>
              {getTabTitle()}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '10px', fontWeight: '800', color: '#4caf50', textTransform: 'uppercase', letterSpacing: '1px' }}>
                ● TIENDA ABIERTA
              </span>
              <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: '11px' }}>|</span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', textTransform: 'uppercase' }}>
                {activeTab}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Right side controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Date block on the right for dashboard */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', marginRight: '6px' }}>
            <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', fontWeight: '600', whiteSpace: 'nowrap' }}>
              {currentDateStr}
            </span>
            <span style={{ fontSize: '11px', color: 'white', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              {currentDayStr} <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>▾</span>
            </span>
          </div>
        )}
        
        {/* Rate Toggle Card */}
        <div className="glass-card" style={{ 
          padding: '4px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '4px', 
          borderRadius: '12px', 
          border: '1px solid rgba(255,255,255,0.06)',
          backgroundColor: 'rgba(255, 255, 255, 0.02)'
        }}>
          {/* BCV Button */}
          <button
            onClick={() => onToggleRateType('bcv')}
            style={{
              padding: '6px 12px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1px',
              transition: 'all 0.3s ease',
              background: activeRateType === 'bcv' ? 'rgba(34, 197, 94, 0.08)' : 'transparent',
              border: activeRateType === 'bcv' ? '1.5px solid #22c55e' : '1.5px solid transparent',
              boxShadow: 'none'
            }}
          >
            <span style={{ 
              fontSize: '8px', 
              fontWeight: '800', 
              color: activeRateType === 'bcv' ? '#22c55e' : 'rgba(255,255,255,0.5)',
              letterSpacing: '0.5px'
            }}>
              BCV
            </span>
            <span style={{ 
              fontSize: '12px', 
              fontWeight: '800', 
              color: activeRateType === 'bcv' ? '#22c55e' : 'white'
            }}>
              {rates.bcv > 0 ? rates.bcv.toFixed(2) : '—'}
            </span>
          </button>

          {/* USDT Button */}
          <button
            onClick={() => onToggleRateType('usdt')}
            style={{
              padding: '6px 12px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1px',
              transition: 'all 0.3s ease',
              background: activeRateType === 'usdt' ? 'rgba(34, 197, 94, 0.08)' : 'transparent',
              border: activeRateType === 'usdt' ? '1.5px solid #22c55e' : '1.5px solid transparent',
              boxShadow: 'none'
            }}
          >
            <span style={{ 
              fontSize: '8px', 
              fontWeight: '800', 
              color: activeRateType === 'usdt' ? '#22c55e' : 'rgba(255,255,255,0.5)',
              letterSpacing: '0.5px'
            }}>
              USDT
            </span>
            <span style={{ 
              fontSize: '12px', 
              fontWeight: '800', 
              color: activeRateType === 'usdt' ? '#22c55e' : 'white'
            }}>
              {rates.usdt > 0 ? rates.usdt.toFixed(2) : '—'}
            </span>
          </button>

          {/* Gap indicator */}
          <div style={{ 
            padding: '4px 8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1px'
          }}>
            <span style={{ fontSize: '7px', fontWeight: '800', color: 'rgba(255,255,255,0.5)' }}>GAP</span>
            <span style={{ 
              fontSize: '10px', 
              fontWeight: '950', 
              color: rates.gap > 10 ? '#ef4444' : '#22c55e',
              backgroundColor: rates.gap > 10 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
              padding: '2px 6px',
              borderRadius: '6px'
            }}>
              {rates.gap > 0 ? rates.gap.toFixed(1) : '0'}%
            </span>
          </div>
        </div>

        {/* Premium Notification Bell Button */}
        <button
          onClick={onOpenNotifications}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            color: 'white',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <div style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              backgroundColor: 'white',
              color: 'black',
              fontSize: '8px',
              fontWeight: '900',
              borderRadius: '50%',
              width: '14px',
              height: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {unreadCount}
            </div>
          )}
        </button>

        {/* Calendar Button (mockup style) */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('astro_navigate', { detail: 'scheduling' }))}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'white',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <Calendar size={18} />
        </button>

        {/* "+ Nueva cita" rounded button (mockup style) */}
        <button
          onClick={onOpenSale}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 20px',
            borderRadius: '100px',
            background: 'var(--gold-gradient)',
            border: 'none',
            color: '#000000',
            fontWeight: '750',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 4px 12px rgba(255, 255, 255, 0.08)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 18px rgba(255, 255, 255, 0.15)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.08)';
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          Nueva cita
        </button>

      </div>
    </div>
  );
};

export default TopBar;
