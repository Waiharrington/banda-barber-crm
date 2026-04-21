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
  Edit3,
  User,
  Trophy, 
  Crown, 
  Medal, 
  ArrowRight,
  ShoppingBag,
  Scissors as ScissorsIcon,
  Circle,
  RefreshCw
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

const DashboardModule = ({ isMobile, onOpenSale, stats, chartData, dbData, handleSeedData, rates }) => {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const { showToast } = useNotifs();
  const dailyGoal = parseFloat(localStorage.getItem('astro_daily_goal') || '500');
  const [isStoreOpen] = useState(true); // Can be linked to schedule later

  useEffect(() => {
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
        titleColor: '#d4af37',
        padding: 12,
        cornerRadius: 12
      }
    },
    scales: {
      y: { display: false },
      x: { 
        grid: { display: false },
        ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10, weight: '700' } }
      }
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: isMobile ? '100px' : '0' }}>
      {/* Header Elite */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: '20px',
        marginBottom: '40px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--gold-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--gold-glow)' }}>
              <User size={24} color="black" />
            </div>
            <Circle size={12} fill={isStoreOpen ? '#32d74b' : '#ff453a'} color="none" style={{ position: 'absolute', bottom: 0, right: 0, border: '2px solid var(--bg-primary)', borderRadius: '50%' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-0.5px' }}>¡Hola, <span className="text-gold">Admin</span>!</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              <span style={{ color: isStoreOpen ? '#32d74b' : '#ff453a', fontWeight: '800' }}>● {isStoreOpen ? 'TIENDA ABIERTA' : 'CERRADO'}</span>
              <span style={{ opacity: 0.3 }}>|</span>
              <span>{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* REPLACEMENT: BCV Rates Widget (Elegante) */}
        {!isMobile && rates && rates.usd > 0 && (
          <div style={{ 
            display: 'flex', 
            gap: '24px', 
            padding: '12px 24px', 
            backgroundColor: 'rgba(255,255,255,0.02)', 
            borderRadius: '20px',
            border: '1px solid rgba(212,175,55,0.05)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '2px' }}>USD / BS</span>
              <span style={{ fontSize: '16px', fontWeight: '900', color: 'var(--gold-primary)' }}>{rates.usd.toFixed(2)}</span>
            </div>
            <div style={{ width: '1px', backgroundColor: 'rgba(212,175,55,0.1)', height: '24px', alignSelf: 'center' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '2px' }}>EUR / BS</span>
              <span style={{ fontSize: '16px', fontWeight: '900', color: 'var(--gold-primary)' }}>{rates.eur.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginLeft: '4px' }}>
              <div title={`Actualizado: ${new Date(rates.updated_at).toLocaleTimeString()}`} style={{ cursor: 'help' }}>
                <RefreshCw size={12} color="var(--text-muted)" opacity={0.5} />
              </div>
            </div>
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '12px', width: isMobile ? '100%' : 'auto' }}>
          {dbData.staff.length === 0 && (
            <button key="seed" onClick={handleSeedData} className="action-btn" style={{ flex: 1 }}><Rocket size={18} /> Demo</button>
          )}
          <button 
            key="sale"
            className="btn-gold" 
            onClick={onOpenSale}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: isMobile ? 3 : 'none', height: '48px', borderRadius: '14px' }}
          >
            <Plus size={18} /> Nueva Operación Astro
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '24px', marginBottom: '40px' }}>
        {/* Main Section */}
        <div style={{ gridColumn: isMobile ? 'span 1' : 'span 2', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Decorative Quote Section (RESTORED MAGIC) */}
          <div className="glass-card animate-slide-up" style={{ 
            marginBottom: '24px', 
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
              padding: isMobile ? '40px 24px' : '32px 48px', 
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
              <h2 key={quoteIndex} className="animate-fade-in" style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: '900', letterSpacing: '-1px', marginBottom: '16px', lineHeight: 1.1 }}>
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
              height: isMobile ? '200px' : '240px',
              width: isMobile ? '100%' : 'auto',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: isMobile ? '0' : '0'
            }}>
              <div style={{
                position: 'absolute',
                width: '180px',
                height: '180px',
                background: 'radial-gradient(circle, rgba(212,175,55,0.2) 0%, rgba(212,175,55,0.05) 40%, transparent 70%)',
                filter: 'blur(30px)',
                zIndex: 1,
                animation: 'pulse-gold 4s infinite ease-in-out'
              }} />

              <div style={{
                position: 'absolute',
                bottom: '10px',
                width: '100px',
                height: '12px',
                background: 'rgba(0,0,0,0.6)',
                filter: 'blur(10px)',
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
                  height: isMobile ? '220px' : '280px', 
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

          {/* Business Stats (Astro Style) */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '20px' }}>
            <StatCard title="Producción Hoy" value={`$${stats.income.toFixed(2)}`} icon={<TrendingUp size={18} color="var(--gold-primary)" />} color="var(--gold-primary)" trend="+12%" positive={true} />
            <StatCard title="Servicios" value={stats.appointments} icon={<ScissorsIcon size={18} color="var(--gold-primary)" />} color="#4caf50" trend="Listo" positive={true} />
            <StatCard title="En Inventario" value={dbData.services.length + dbData.clients.length} icon={<ShoppingBag size={18} color="var(--gold-primary)" />} color="#2196f3" trend="Ok" positive={true} />
          </div>

          {/* Goal Progress (Refined) */}
          <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Target size={18} color="var(--gold-primary)" />
                <span style={{ fontWeight: '900', fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>Misión Diaria</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: '800' }}>${stats.income.toFixed(0)} <span style={{ opacity: 0.3 }}>/</span> ${dailyGoal}</span>
                <button onClick={handleEditGoal} className="action-btn" style={{ padding: '6px', borderRadius: '8px' }}><Edit3 size={14} /></button>
              </div>
            </div>
            <div style={{ height: '10px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{ 
                width: `${Math.min((stats.income / dailyGoal) * 100, 100)}%`, 
                height: '100%', 
                background: 'var(--gold-gradient)', 
                boxShadow: 'var(--gold-glow)',
                transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' 
              }} />
            </div>
          </div>
        </div>

        {/* Top Performers Ranking (Sidebar) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-card" style={{ 
            height: '100%', 
            borderRadius: '28px', 
            padding: '24px', 
            background: 'rgba(28,28,30,0.6)',
            border: '1px solid rgba(255,255,255,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trophy size={20} color="var(--gold-primary)" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '900' }}>Top <span className="text-gold">Artistas</span></h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {dbData.staff.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>Sin datos de personal.</p>
              ) : dbData.staff.slice(0, 5).sort((a,b) => (b.stats?.income || 0) - (a.stats?.income || 0)).map((barber, index) => (
                <div key={barber.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ 
                      width: '44px', 
                      height: '44px', 
                      borderRadius: '14px', 
                      backgroundColor: 'var(--bg-tertiary)', 
                      overflow: 'hidden',
                      border: index === 0 ? '2px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <img src={barber.image_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${barber.name}`} alt={barber.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    {index === 0 && <Crown size={14} color="var(--gold-primary)" fill="var(--gold-primary)" style={{ position: 'absolute', top: '-6px', right: '-6px' }} />}
                    {index === 1 && <Medal size={14} color="#C0C0C0" style={{ position: 'absolute', top: '-6px', right: '-6px' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '800', fontSize: '13px' }}>{barber.name.split(' ')[0]}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{barber.role}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '900', color: 'var(--gold-primary)', fontSize: '14px' }}>${(barber.stats?.income || 0).toFixed(0)}</div>
                    <div style={{ fontSize: '9px', fontWeight: '800', opacity: 0.4 }}>PRODUCCIÓN</div>
                  </div>
                </div>
              ))}
            </div>
            
            <button style={{ width: '100%', marginTop: '24px', backgroundColor: 'rgba(255,255,255,0.03)', border: 'none', color: 'var(--text-secondary)', padding: '12px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              Ver Todos los Miembros <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-25px) rotate(5deg); }
        }
        @keyframes shadow-scale {
          0%, 100% { transform: scaleX(1.5); opacity: 0.6; }
          50% { transform: scaleX(1.1); opacity: 0.2; }
        }
        @keyframes pulse-gold {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.15); opacity: 0.7; }
        }
        .refresh-btn:hover {
          opacity: 1 !important;
          transform: rotate(15deg) scale(1.2);
        }
        .chair-float {
          transition: all 0.5s ease;
        }
        .chair-float:hover {
          filter: drop-shadow(0 40px 70px rgba(212,175,55,0.4)) brightness(1.2) !important;
        }
      `}</style>
    </div>
  );
};

const StatCard = ({ title, value, icon, color, trend, positive }) => (
  <div className="glass-card" style={{ padding: '20px', borderRadius: '20px', border: `1px solid ${color}1A`, position: 'relative' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: `${color}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      {trend && (
        <span style={{ 
          color: positive ? '#4caf50' : '#ff4d4d', 
          fontSize: '11px', 
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '2px'
        }}>
          {trend} {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        </span>
      )}
    </div>
    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>{title}</div>
    <div style={{ fontSize: '24px', fontWeight: '900', marginTop: '4px' }}>{value}</div>
  </div>
);

export default DashboardModule;
