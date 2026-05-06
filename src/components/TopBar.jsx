import React, { useState } from 'react';
import { 
  User, 
  Edit3, 
  Plus, 
  Target 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifs } from '../context/NotificationContext';

const TopBar = ({ 
  rates, 
  onOpenSale, 
  isStoreOpen = true, 
  onEditRates,
  onNavigate
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
        <div className="glass-card" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '24px', borderRadius: '18px', border: '1px solid rgba(212,175,55,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              padding: '4px 8px', 
              backgroundColor: 'rgba(255,255,255,0.05)', 
              borderRadius: '6px',
              fontSize: '9px',
              fontWeight: '900',
              color: 'var(--text-muted)'
            }}>
              BCV
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', fontWeight: '900', color: 'white' }}>{rates.bcv.toFixed(2)}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              padding: '4px 8px', 
              backgroundColor: 'rgba(255,255,255,0.05)', 
              borderRadius: '6px',
              fontSize: '9px',
              fontWeight: '900',
              color: 'var(--text-muted)'
            }}>
              USDT
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', fontWeight: '900', color: 'white' }}>{rates.usdt.toFixed(2)}</div>
            </div>
            <div style={{ 
              fontSize: '10px', 
              fontWeight: '800', 
              color: rates.gap > 10 ? '#ff4d4d' : '#4caf50',
              backgroundColor: rates.gap > 10 ? 'rgba(255,77,77,0.1)' : 'rgba(76,175,80,0.1)',
              padding: '2px 6px',
              borderRadius: '4px'
            }}>
              {rates.gap.toFixed(1)}%
            </div>
          </div>

          <div style={{ width: '1px', height: '30px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
          
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '9px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '0.5px' }}>TASA BARBERÍA</div>
            <div style={{ fontSize: '18px', fontWeight: '950', color: 'var(--gold-primary)' }}>{rates.usd.toFixed(2)}</div>
          </div>

          <button 
            onClick={onEditRates}
            className="edit-rates-btn"
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--gold-primary)', 
              cursor: 'pointer',
              padding: '4px',
              transition: '0.2s'
            }}
          >
            <Edit3 size={16} />
          </button>
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
