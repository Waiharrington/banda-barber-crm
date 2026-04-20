import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Rocket,
  Sparkles,
  Target,
  Edit3
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
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';

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

const QUOTES = [
  { text: "Cada cabeza es un mundo.", creator: "Refrán Popular" },
  { text: "La grandeza nace de pequeños comienzos.", creator: "Sir Francis Drake" },
  { text: "La disciplina es el puente entre metas y logros.", creator: "Jim Rohn" },
  { text: "El estilo es una forma de decir quién eres sin hablar.", creator: "Rachel Zoe" },
  { text: "Invierte en tu imagen, es tu carta de presentación.", creator: "Negocios" },
  { text: "Un corte de pelo puede cambiar una vida.", creator: "Arte Astro" },
  { text: "La calidad atrae, el detalle retiene.", creator: "Estrategia" },
  { text: "No busques clientes, busca fans.", creator: "Crecimiento" },
  { text: "La barbería es el arte de esculpir confianza.", creator: "Mística Astro" },
  { text: "El éxito es la suma de pequeños esfuerzos diarios.", creator: "Robert Collier" },
  { text: "Domina tu oficio, luego rompe las reglas.", creator: "Maestros" },
  { text: "Cada cliente es una oportunidad de crear una obra maestra.", creator: "Visión" },
  { text: "El mejor marketing es un cliente satisfecho.", creator: "Marketing" },
  { text: "Sé tan bueno que no puedan ignorarte.", creator: "Steve Martin" },
  { text: "Tu única competencia es la persona que ves en el espejo.", creator: "Superación" },
  { text: "El negocio de la belleza es el negocio de la felicidad.", creator: "Emprendimiento" }
];

const DashboardModule = ({ isMobile, onOpenSale, stats, chartData, dbData, handleSeedData, onNavigate }) => {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const { showToast } = useNotifs();
  const dailyGoal = parseFloat(localStorage.getItem('astro_daily_goal') || '500');

  useEffect(() => {
    // Pick random quote on mount / login
    setQuoteIndex(Math.floor(Math.random() * QUOTES.length));
  }, []);

  const shuffleQuote = () => {
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * QUOTES.length);
    } while (newIndex === quoteIndex && QUOTES.length > 1);
    setQuoteIndex(newIndex);
  };

  const handleEditGoal = () => {
    const newGoal = window.prompt('Define la Meta del Día ($):', dailyGoal);
    if (newGoal && !isNaN(newGoal)) {
      localStorage.setItem('astro_daily_goal', newGoal);
      showToast(`Meta diaria actualizada a $${newGoal}`);
      // Simple force re-render via state or just let next refresh handle it
      // But for better UX, we could use a local state. For now, it's a persistent setting.
      window.location.reload(); 
    }
  };

  const currentQuote = QUOTES[quoteIndex];

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
      <div className="glass-card animate-slide-up" style={{ 
        marginBottom: '60px', 
        padding: '0', 
        borderRadius: '32px',
        background: 'linear-gradient(135deg, rgba(28,28,30,0.95), rgba(212,175,55,0.05))',
        border: '1px solid rgba(255,255,255,0.03)',
        position: 'relative',
        overflow: 'visible',
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
            <span style={{ color: 'var(--gold-primary)', fontSize: '10px', fontWeight: '900', letterSpacing: '3px', textTransform: 'uppercase' }}>Pensamiento Astro</span>
            <button 
              onClick={shuffleQuote}
              style={{ background: 'none', border: 'none', color: 'var(--gold-primary)', cursor: 'pointer', padding: '4px', opacity: 0.6, display: 'flex', alignItems: 'center', transition: 'all 0.3s' }}
              className="refresh-btn"
            >
              <Sparkles size={12} />
            </button>
          </div>
          <h2 key={quoteIndex} className="animate-fade-in" style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: '900', letterSpacing: '-1px', marginBottom: '16px', lineHeight: 1.1 }}>
            {currentQuote.text.includes('<br />') ? currentQuote.text : (
              <>
                {currentQuote.text.split(' ').slice(0, Math.ceil(currentQuote.text.split(' ').length / 2)).join(' ')} <br />
                <span className="text-gold">{currentQuote.text.split(' ').slice(Math.ceil(currentQuote.text.split(' ').length / 2)).join(' ')}</span>
              </>
            )}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', opacity: 0.7 }}>— {currentQuote.creator}</p>
        </div>

        <div style={{ 
          flex: isMobile ? 'none' : '0.8', 
          position: 'relative', 
          height: isMobile ? '240px' : '280px',
          width: isMobile ? '100%' : 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: isMobile ? '0' : '20px'
        }}>
          <div style={{
            position: 'absolute',
            width: '240px',
            height: '240px',
            background: 'radial-gradient(circle, rgba(212,175,55,0.2) 0%, rgba(212,175,55,0.05) 40%, transparent 70%)',
            filter: 'blur(30px)',
            zIndex: 1,
            animation: 'pulse-gold 4s infinite ease-in-out'
          }} />

          <div style={{
            position: 'absolute',
            bottom: '10px',
            width: '120px',
            height: '15px',
            background: 'rgba(0,0,0,0.6)',
            filter: 'blur(12px)',
            borderRadius: '50%',
            zIndex: 2,
            transform: 'scaleX(1.5)',
            animation: 'shadow-scale 4s infinite ease-in-out'
          }} />
          
          <img 
            src="/barber-chair.png" 
            alt="Astro Chair" 
            className="chair-float"
            style={{ 
              height: isMobile ? '280px' : '360px', 
              width: 'auto',
              objectFit: 'contain',
              zIndex: 3,
              filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.7))',
              pointerEvents: 'none',
              animation: 'float 4s infinite ease-in-out'
            }} 
          />
        </div>
      </div>

      {/* Goal Progress Section */}
      <div className="glass-card animate-slide-up" style={{ marginBottom: '40px', padding: '20px 24px', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Target size={18} color="var(--gold-primary)" />
            <span style={{ fontSize: '14px', fontWeight: '850', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Misión del Día</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--gold-primary)' }}>
              ${stats.income.toFixed(2)} / <span style={{ opacity: 0.6 }}>${dailyGoal}</span>
            </span>
            <button 
              onClick={handleEditGoal}
              style={{ background: 'rgba(212,175,55,0.1)', border: 'none', color: 'var(--gold-primary)', padding: '6px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <Edit3 size={14} />
            </button>
          </div>
        </div>
        <div className="goal-bar-container" style={{ height: '10px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '5px', overflow: 'hidden' }}>
          <div className="goal-bar-fill" style={{ 
            width: `${Math.min((stats.income / dailyGoal) * 100, 100)}%`,
            height: '100%',
            background: 'var(--gold-gradient)',
            boxShadow: 'var(--gold-glow)',
            transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            <div className="goal-bar-glow" />
          </div>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px', textAlign: 'right', fontWeight: '600' }}>
          {stats.income >= dailyGoal ? '¡MISIÓN CUMPLIDA! 🚀' : `${(100 - (stats.income / dailyGoal) * 100).toFixed(0)}% restante para el objetivo`}
        </p>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-25px); }
        }
        @keyframes shadow-scale {
          0%, 100% { transform: scaleX(1.5) opacity(0.6); }
          50% { transform: scaleX(1.1) opacity(0.2); }
        }
        @keyframes pulse-gold {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.15); opacity: 0.7; }
        }
        .chair-float {
          transition: all 0.5s ease;
        }
        .chair-float:hover {
          filter: drop-shadow(0 40px 70px rgba(212,175,55,0.4)) brightness(1.2) !important;
        }
        .refresh-btn:hover {
          opacity: 1 !important;
          transform: rotate(15deg) scale(1.2);
        }
      `}</style>

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
        gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
        gap: '24px',
        marginBottom: '40px'
      }}>
        <div className="glass-card">
          <h3 style={{ marginBottom: '20px' }}>Evolución de Ventas Semanal</h3>
          <div style={{ height: '300px' }}>
            < Line data={chartData} options={chartOptions} />
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
