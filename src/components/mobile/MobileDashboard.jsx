import React from 'react';
import { 
  Search, 
  Bell, 
  ChevronRight, 
  Star,
  Zap,
  TrendingUp,
  Plus,
  Scissors,
  User,
  Package,
  DollarSign,
  Users
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import logo from '../../assets/logo.png';

const MobileDashboard = ({ onOpenSale, stats, chartData, dbData }) => {
  const categories = [
    { label: 'Corte', icon: <Scissors size={20} />, active: true },
    { label: 'Clientes', icon: <User size={20} /> },
    { label: 'Inventario', icon: <Package size={20} /> },
    { label: 'Caja', icon: <DollarSign size={20} /> },
    { label: 'Equipo', icon: <Users size={20} /> },
  ];

  return (
    <div className="mobile-dashboard animate-fade-in" style={{ paddingBottom: '100px' }}>
      {/* Hello Greeting */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.8 }}>BIENVENIDO A CASA</div>
        <div style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '-1.5px', marginTop: '4px' }}>Panel de <span className="text-gold">Control</span></div>
      </div>

      {/* Brand Quote - SIC PARVIS MAGNA */}
      <div className="glass-card" style={{ 
        marginBottom: '32px', 
        padding: '24px', 
        textAlign: 'center',
        border: '1px solid rgba(212, 175, 55, 0.2)',
        backgroundColor: 'rgba(10,10,10,0.4)',
        borderRadius: '24px'
      }}>
        <div style={{ fontSize: '12px', color: 'var(--gold-primary)', fontWeight: '800', letterSpacing: '4px', marginBottom: '8px', opacity: 0.9 }}>"SIC PARVIS MAGNA"</div>
        <div style={{ fontSize: '15px', fontWeight: '800', letterSpacing: '0.2px', lineHeight: '1.4' }}>LA GRANDEZA NACE DE PEQUEÑOS COMIENZOS</div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic', opacity: 0.6 }}>— FRANCIS DRAKE</div>
      </div>

      {/* Smart Insights Pills (New) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '32px' }}>
        <div style={{ 
          backgroundColor: 'rgba(212, 175, 55, 0.05)', 
          padding: '16px', 
          borderRadius: '20px', 
          border: '1px solid rgba(212, 175, 55, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--gold-primary)' }}>
            <Star size={14} />
            <span style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px' }}>TOP MIEMBRO</span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: '800' }}>Marco Silva</div>
        </div>
        <div style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.03)', 
          padding: '16px', 
          borderRadius: '20px', 
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
            <TrendingUp size={14} />
            <span style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px' }}>TENDENCIA</span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: '800' }}>Corte Deluxe</div>
        </div>
      </div>

      {/* Main Feature Card (Stats Summary) */}
      <div className="animate-slide-up" style={{
        background: 'var(--gold-gradient)',
        borderRadius: '32px',
        padding: '32px',
        marginBottom: '28px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(212, 175, 55, 0.3)'
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '12px', color: 'rgba(0,0,0,0.5)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.2px' }}>Balance General (Hoy)</div>
          <div style={{ fontSize: '48px', fontWeight: '950', color: '#000', marginTop: '8px', letterSpacing: '-2px' }}>
            ${stats.income - stats.expenses}
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
            <div style={{ backgroundColor: 'rgba(0,0,0,0.08)', padding: '14px 20px', borderRadius: '20px', flex: 1, backdropFilter: 'blur(10px)' }}>
              <div style={{ fontSize: '10px', color: 'rgba(0,0,0,0.4)', fontWeight: '900' }}>+ INGRESOS</div>
              <div style={{ fontSize: '22px', fontWeight: '950', color: '#000' }}>${stats.income}</div>
            </div>
            <div style={{ backgroundColor: 'rgba(0,0,0,0.08)', padding: '14px 20px', borderRadius: '20px', flex: 1, backdropFilter: 'blur(10px)' }}>
              <div style={{ fontSize: '10px', color: 'rgba(0,0,0,0.4)', fontWeight: '900' }}>- GASTOS</div>
              <div style={{ fontSize: '22px', fontWeight: '950', color: '#000' }}>${stats.expenses}</div>
            </div>
          </div>
        </div>
        {/* Subtle decorative glass circle */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.12)',
          zIndex: 0
        }}></div>
      </div>

      {/* Secondary Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--gold-primary)', marginBottom: '16px' }}>
            <div style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', padding: '8px', borderRadius: '10px' }}><Zap size={18} /></div>
            <span style={{ fontSize: '12px', fontWeight: '800', letterSpacing: '0.5px' }}>CITAS</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800' }}>{stats.appointments}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', fontWeight: '500' }}>Para hoy</div>
        </div>
        <div className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--gold-primary)', marginBottom: '16px' }}>
            <div style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', padding: '8px', borderRadius: '10px' }}><TrendingUp size={18} /></div>
            <span style={{ fontSize: '12px', fontWeight: '800', letterSpacing: '0.5px' }}>CLIENTES</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800' }}>{stats.clients}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', fontWeight: '500' }}>Registrados</div>
        </div>
      </div>

      {/* Analytics Chart Section */}
      <div className="glass-card" style={{ padding: '28px', borderRadius: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ fontWeight: '800', fontSize: '17px', letterSpacing: '-0.3px' }}>Tendencia de Ventas</div>
          <div style={{ fontSize: '11px', color: 'var(--gold-primary)', fontWeight: '700', backgroundColor: 'rgba(212, 175, 55, 0.1)', padding: '4px 10px', borderRadius: '8px' }}>SEMANAL</div>
        </div>
        <div style={{ height: '200px', width: '100%' }}>
          <Line 
            data={chartData} 
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: { display: false },
                x: {
                  grid: { display: false },
                  ticks: { color: '#666', font: { size: 10, weight: '600' } }
                }
              }
            }} 
          />
        </div>
      </div>

      <style>{`
        .icon-badge {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background-color: var(--bg-tertiary);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border-color);
        }
        .mobile-dashboard::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default MobileDashboard;
