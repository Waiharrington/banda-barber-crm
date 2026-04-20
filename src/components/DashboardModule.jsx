import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Rocket
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import SaleServiceModal from './SaleServiceModal';
import { dataService } from '../services/dataService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const DashboardModule = ({ isMobile, onOpenSale, stats, chartData, dbData, handleSeedData }) => {
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1a1a',
        borderColor: '#d4af37',
        borderWidth: 1,
        titleColor: '#d4af37'
      }
    },
    scales: {
      y: { display: false },
      x: { 
        grid: { display: false },
        ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 10 } }
      }
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px'
      }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Panel de <span className="text-gold">Control</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Resumen celestial del día.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {dbData.staff.length === 0 && (
            <button 
              onClick={handleSeedData}
              style={{ background: 'none', border: '1px solid var(--gold-primary)', color: 'var(--gold-primary)', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Rocket size={18} /> Cargar Demo
            </button>
          )}
          <button 
            className="btn-gold" 
            onClick={onOpenSale}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={18} /> Nueva Venta / Servicio
          </button>
        </div>
      </div>

      {/* Decorative Quote Section */}
      {/* 3D Hero Section - Brand Identity */}
      <div className="glass-card animate-slide-up" style={{ 
        marginBottom: '60px', 
        padding: '0', 
        borderRadius: '32px',
        background: 'linear-gradient(135deg, rgba(28,28,30,0.95), rgba(212,175,55,0.05))',
        border: '1px solid rgba(255,255,255,0.03)',
        position: 'relative',
        overflow: 'visible', // Critical for 3D effect
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: 'center',
        minHeight: '220px'
      }}>
        <div style={{ 
          flex: 1, 
          padding: isMobile ? '40px 24px' : '48px', 
          textAlign: isMobile ? 'center' : 'left',
          zIndex: 2 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', justifyContent: isMobile ? 'center' : 'flex-start' }}>
            <div style={{ width: '30px', height: '1px', backgroundColor: 'var(--gold-primary)' }} />
            <span style={{ color: 'var(--gold-primary)', fontSize: '10px', fontWeight: '900', letterSpacing: '3px', textTransform: 'uppercase' }}>Identidad Astro</span>
          </div>
          <h2 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: '900', letterSpacing: '-1px', marginBottom: '16px', lineHeight: 1.1 }}>
            LA GRANDEZA NACE DE <br />
            <span className="text-gold">PEQUEÑOS COMIENZOS</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', opacity: 0.7 }}>— CONCEPT BRAND EXPERIENCE</p>
        </div>

        <div style={{ 
          flex: isMobile ? 'none' : '0.8', 
          position: 'relative', 
          height: isMobile ? '200px' : '100%',
          width: isMobile ? '100%' : 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: isMobile ? 'flex-end' : 'center'
        }}>
          {/* Shadow/Glow effect behind chair */}
          <div style={{
            position: 'absolute',
            width: '180px',
            height: '180px',
            background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)',
            filter: 'blur(20px)',
            zIndex: 1
          }} />
          
          <img 
            src="/barber-chair.png" 
            alt="Astro Chair" 
            style={{ 
              height: isMobile ? '240px' : '320px', 
              width: 'auto',
              objectFit: 'contain',
              zIndex: 3,
              transform: isMobile ? 'translateY(20px) rotate(-5deg)' : 'translate(20px, -20px) rotate(-8deg)',
              filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.8))',
              transition: 'all 0.5s ease',
              pointerEvents: 'none'
            }} 
          />
        </div>
      </div>

      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '24px',
        marginBottom: '40px'
      }}>
        <StatCard 
          title="Ingresos Hoy" 
          value={`$${stats.income.toFixed(2)}`} 
          trend="+12.5%" 
          icon={<TrendingUp size={20} color="var(--gold-primary)" />} 
          positive={true}
        />
        <StatCard 
          title="Total Clientes" 
          value={stats.clients} 
          trend="+4 hoy" 
          icon={<Users size={20} color="var(--gold-primary)" />} 
          positive={true}
        />
        <StatCard 
          title="Gastos (Caja)" 
          value={`$${stats.expenses.toFixed(2)}`} 
          trend="-5%" 
          icon={<ArrowDownRight size={20} color="#ff4d4d" />} 
          positive={false}
        />
        <StatCard 
          title="Servicios Hoy" 
          value={stats.appointments} 
          trend="Listo" 
          icon={<Clock size={20} color="var(--gold-primary)" />} 
          positive={true}
        />
      </section>

      <section style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '24px',
        marginBottom: '40px'
      }}>
        <div className="glass-card">
          <h3 style={{ marginBottom: '20px' }}>Evolución de Ventas Semanal</h3>
          <div style={{ height: '300px' }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
        
        <div className="glass-card">
          <h3 style={{ marginBottom: '20px' }}>Servicios Top</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <TopService label="Corte Astro Deluxe" count={12} percentage={45} />
            <TopService label="Lavado Estimulante" count={8} percentage={30} />
            <TopService label="Perfilado Barba" count={5} percentage={18} />
          </div>
        </div>
      </section>
    </div>
  );
};

const StatCard = ({ title, value, trend, icon, positive }) => (
  <div className="glass-card" style={{ position: 'relative', overflow: 'hidden' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
      <div style={{ 
        width: '40px', 
        height: '40px', 
        borderRadius: '10px', 
        backgroundColor: 'rgba(212,175,55,0.1)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        {icon}
      </div>
      <span style={{ 
        color: positive ? '#4caf50' : '#ff4d4d', 
        fontSize: '12px', 
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        {trend} {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
      </span>
    </div>
    <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '4px' }}>{title}</div>
    <div style={{ fontSize: '24px', fontWeight: '700' }}>{value}</div>
  </div>
);

const TopService = ({ label, count, percentage }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
      <span>{label}</span>
      <span style={{ color: 'var(--text-secondary)' }}>{count} serv.</span>
    </div>
    <div style={{ 
      height: '6px', 
      width: '100%', 
      backgroundColor: 'var(--bg-tertiary)', 
      borderRadius: '3px',
      overflow: 'hidden'
    }}>
      <div style={{ 
        height: '100%', 
        width: `${percentage}%`, 
        background: 'var(--gold-gradient)',
        boxShadow: 'var(--gold-glow)'
      }} />
    </div>
  </div>
);

export default DashboardModule;
