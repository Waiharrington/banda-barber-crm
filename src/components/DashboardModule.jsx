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

const DashboardModule = ({ onOpenSale, stats, chartData, dbData, handleSeedData }) => {
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
      <div className="glass-card" style={{ 
        marginBottom: '40px', 
        textAlign: 'center', 
        padding: '32px',
        border: '1px solid rgba(212, 175, 55, 0.2)',
        background: 'linear-gradient(rgba(31,31,31,0.8), rgba(20,20,20,0.9))'
      }}>
        <h4 className="text-gold" style={{ letterSpacing: '4px', fontSize: '14px', marginBottom: '12px', opacity: 0.8 }}>"SIC PARVIS MAGNA"</h4>
        <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '8px', letterSpacing: '1px' }}>LA GRANDEZA NACE DE PEQUEÑOS COMIENZOS</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>— FRANCIS DRAKE</p>
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
