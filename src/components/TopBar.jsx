import React from 'react';
import { 
  User, 
  Plus, 
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const TopBar = ({ 
  rates, 
  onOpenSale, 
  isStoreOpen = true, 
  activeRateType,
  onToggleRateType
}) => {
  const { user } = useAuth();
  
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: '40px',
      flexWrap: 'wrap',
      gap: '20px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '20px', 
            backgroundColor: 'var(--gold-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--gold-glow)'
          }}>
            <User color="black" size={32} />
          </div>
          <div style={{ 
            position: 'absolute', 
            bottom: '-2px', 
            right: '-2px', 
            width: '18px', 
            height: '18px', 
            borderRadius: '50%', 
            backgroundColor: isStoreOpen ? '#4caf50' : '#ff4d4d',
            border: '3px solid var(--bg-primary)'
          }} />
        </div>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '950', letterSpacing: '-1px' }}>
            ¡Hola, <span className="text-gold">{user?.name?.split(' ')[0] || 'Astro'}</span>!
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: isStoreOpen ? '#4caf50' : '#ff4d4d', textTransform: 'uppercase', letterSpacing: '1px' }}>
              ● TIENDA ABIERTA
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>|</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700' }}>PANEL CONTROL</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Rate Toggle Card */}
        <div className="glass-card" style={{ padding: '8px', display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '18px', border: '1px solid rgba(212,175,55,0.1)' }}>
          {/* BCV Button */}
          <button
            onClick={() => onToggleRateType('bcv')}
            style={{
              padding: '10px 18px',
              borderRadius: '14px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              transition: 'all 0.3s ease',
              background: activeRateType === 'bcv' 
                ? 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))' 
                : 'transparent',
              border: activeRateType === 'bcv' 
                ? '1.5px solid var(--gold-primary)' 
                : '1.5px solid transparent',
              boxShadow: activeRateType === 'bcv' ? '0 0 15px rgba(212,175,55,0.15)' : 'none'
            }}
          >
            <span style={{ 
              fontSize: '9px', 
              fontWeight: '900', 
              color: activeRateType === 'bcv' ? 'var(--gold-primary)' : 'var(--text-muted)',
              letterSpacing: '0.5px'
            }}>
              BCV
            </span>
            <span style={{ 
              fontSize: '15px', 
              fontWeight: '950', 
              color: activeRateType === 'bcv' ? 'var(--gold-primary)' : 'white'
            }}>
              {rates.bcv > 0 ? rates.bcv.toFixed(2) : '—'}
            </span>
          </button>

          {/* USDT Button */}
          <button
            onClick={() => onToggleRateType('usdt')}
            style={{
              padding: '10px 18px',
              borderRadius: '14px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              transition: 'all 0.3s ease',
              background: activeRateType === 'usdt' 
                ? 'linear-gradient(135deg, rgba(38,166,91,0.2), rgba(38,166,91,0.05))' 
                : 'transparent',
              border: activeRateType === 'usdt' 
                ? '1.5px solid #26a65b' 
                : '1.5px solid transparent',
              boxShadow: activeRateType === 'usdt' ? '0 0 15px rgba(38,166,91,0.15)' : 'none'
            }}
          >
            <span style={{ 
              fontSize: '9px', 
              fontWeight: '900', 
              color: activeRateType === 'usdt' ? '#26a65b' : 'var(--text-muted)',
              letterSpacing: '0.5px'
            }}>
              USDT
            </span>
            <span style={{ 
              fontSize: '15px', 
              fontWeight: '950', 
              color: activeRateType === 'usdt' ? '#26a65b' : 'white'
            }}>
              {rates.usdt > 0 ? rates.usdt.toFixed(2) : '—'}
            </span>
          </button>

          {/* Gap indicator */}
          <div style={{ 
            padding: '4px 10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1px'
          }}>
            <span style={{ fontSize: '8px', fontWeight: '800', color: 'var(--text-muted)' }}>GAP</span>
            <span style={{ 
              fontSize: '11px', 
              fontWeight: '900', 
              color: rates.gap > 10 ? '#ff4d4d' : '#4caf50',
              backgroundColor: rates.gap > 10 ? 'rgba(255,77,77,0.1)' : 'rgba(76,175,80,0.1)',
              padding: '2px 6px',
              borderRadius: '4px'
            }}>
              {rates.gap > 0 ? rates.gap.toFixed(1) : '0'}%
            </span>
          </div>
        </div>
        
        <button 
          className="btn-gold" 
          onClick={onOpenSale}
          style={{ 
            height: '52px', 
            padding: '0 24px', 
            borderRadius: '16px', 
            fontWeight: '900',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '15px'
          }}
        >
          <Plus size={20} /> Nueva Operación Astro
        </button>
      </div>
    </div>
  );
};

export default TopBar;
