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

import { useAuth } from '../context/AuthContext';

const DashboardModule = ({ 
  isMobile, 
  onOpenSale, 
  stats, 
  chartData, 
  dbData, 
  handleSeedData, 
  rates, 
  bcvRates,
  isCustomRate,
  setIsCustomRate,
  customRates,
  setCustomRates,
  onNavigate
}) => {
  const { user } = useAuth();
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isEditingRates, setIsEditingRates] = useState(false);
  const [tempRates, setTempRates] = useState({ ...customRates });
  const { showToast } = useNotifs();
  const dailyGoal = parseFloat(localStorage.getItem('astro_daily_goal') || '500');
  const [isStoreOpen] = useState(true); 

  const isBarber = user?.role === 'Barbero' || user?.role?.includes('Barbero|');

  // Filter stats for barber
  const myStats = isBarber ? (dbData.staff.find(s => s.id === user.id)?.stats || { income: 0, appointments: 0 }) : stats;

  useEffect(() => {
    setQuoteIndex(Math.floor(Math.random() * QUOTES.length));
  }, []);

  const handleEditGoal = () => {
    const newGoal = prompt("Establecer nueva meta diaria ($):", dailyGoal);
    if (newGoal && !isNaN(newGoal)) {
      localStorage.setItem('astro_daily_goal', newGoal);
      window.location.reload();
    }
  };

  return (
    <div style={{ paddingBottom: isMobile ? '100px' : '40px' }}>
      {/* Top Header Section */}
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
          <div className="glass-card" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '16px', borderRadius: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                padding: '4px 8px', 
                backgroundColor: isCustomRate ? 'var(--gold-primary)' : 'rgba(255,255,255,0.05)', 
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: '900',
                color: isCustomRate ? 'black' : 'var(--text-muted)'
              }}>
                {isCustomRate ? 'MAN' : 'BCV'}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '9px', fontWeight: '800', opacity: 0.5 }}>USD</div>
                <div style={{ fontSize: '14px', fontWeight: '900', color: 'white' }}>{rates.usd.toFixed(2)}</div>
              </div>
            </div>
            <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '9px', fontWeight: '800', opacity: 0.5 }}>EUR</div>
              <div style={{ fontSize: '14px', fontWeight: '900', color: 'white' }}>{rates.eur.toFixed(2)}</div>
            </div>
            <button 
              onClick={() => setIsEditingRates(true)}
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

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '32px' }}>
        
        {/* Left Column: Vision & Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Main Hero Card */}
          <div className="glass-card" style={{ 
            minHeight: '340px', 
            borderRadius: '32px', 
            padding: '48px', 
            position: 'relative', 
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <div style={{ position: 'relative', zIndex: 2, maxWidth: '60%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '20px', height: '2px', backgroundColor: 'var(--gold-primary)' }} />
                <span style={{ fontSize: '12px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '2px', textTransform: 'uppercase' }}>Pensamiento Astro</span>
                <Sparkles size={14} color="var(--gold-primary)" className="animate-pulse" />
              </div>
              <h2 style={{ fontSize: isMobile ? '32px' : '42px', fontWeight: '950', lineHeight: '1.1', marginBottom: '24px', letterSpacing: '-1.5px' }}>
                {QUOTES[quoteIndex].text}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '16px', fontWeight: '600' }}>
                — {QUOTES[quoteIndex].creator}
              </p>
            </div>

            {/* Visual Elements */}
            <div style={{ position: 'absolute', right: '-20px', bottom: '-40px', width: '380px', height: '420px' }}>
              <div className="chair-shadow" style={{ 
                position: 'absolute', 
                bottom: '80px', 
                left: '50%', 
                transform: 'translateX(-50%)', 
                width: '180px', 
                height: '40px', 
                background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.8) 0%, transparent 70%)',
                zIndex: 1,
                animation: 'shadow-scale 4s infinite ease-in-out'
              }} />
              <img 
                src="https://zntofmpxxicpjsizclqf.supabase.co/storage/v1/object/public/system-assets/gold_chair_pro.png" 
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

          {/* Business Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '20px' }}>
            <StatCard title="Tu Producción" value={`$${myStats.income.toFixed(2)}`} icon={<TrendingUp size={18} color="var(--gold-primary)" />} color="var(--gold-primary)" trend="+12%" positive={true} />
            <StatCard title="Tus Servicios" value={myStats.appointments} icon={<ScissorsIcon size={18} color="var(--gold-primary)" />} color="#4caf50" trend="Activo" positive={true} />
            {!isBarber && <StatCard title="En Inventario" value={dbData.services.length + dbData.clients.length} icon={<ShoppingBag size={18} color="var(--gold-primary)" />} color="#2196f3" trend="Ok" positive={true} />}
          </div>

          {/* Goal Progress */}
          {!isBarber && (
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
          )}
        </div>

        {/* Right Column: Rankings */}
        {!isBarber && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <PodiumSection 
              title="Top Artistas" 
              icon={<Trophy size={20} color="var(--gold-primary)" />}
              data={dbData.staff.sort((a,b) => (b.stats?.monthlyIncome || 0) - (a.stats?.monthlyIncome || 0)).slice(0, 3)}
              labelKey="name"
              scoreKey={(item) => `$${(item.stats?.monthlyIncome || 0).toFixed(0)}`}
              scoreLabel="ÚLTIMOS 30 DÍAS"
            />

            <PodiumSection 
              title="Top Clientes" 
              icon={<Users size={20} color="var(--gold-primary)" />}
              data={dbData.clients.sort((a,b) => (b.total_visits || 0) - (a.total_visits || 0)).slice(0, 3)}
              labelKey="name"
              scoreKey={(item) => `${item.total_visits || 0}`}
              scoreLabel="VISITAS"
              isClient
              onNavigate={onNavigate}
            />
          </div>
        )}
      </div>

      {/* Manual Rate Edit Modal */}
      {isEditingRates && (
        <div className="modal-overlay animate-fade-in" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(10px)'
        }}>
          <div className="glass-card animate-scale-in" style={{ width: '400px', padding: '40px', borderRadius: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Edit3 color="var(--gold-primary)" size={20} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '900' }}>Tasas <span className="text-gold">Astro</span></h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '8px' }}>TASA USD / BS</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="number" 
                    value={tempRates.usd}
                    onChange={(e) => setTempRates({ ...tempRates, usd: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', height: '52px', paddingLeft: '44px', fontSize: '18px', fontWeight: '900', color: 'var(--gold-primary)' }}
                  />
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: '900', color: 'rgba(255,255,255,0.2)' }}>$</span>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '8px' }}>TASA EUR / BS</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="number" 
                    value={tempRates.eur}
                    onChange={(e) => setTempRates({ ...tempRates, eur: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', height: '52px', paddingLeft: '44px', fontSize: '18px', fontWeight: '900', color: 'var(--gold-primary)' }}
                  />
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: '900', color: 'rgba(255,255,255,0.2)' }}>€</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setIsEditingRates(false)}
                className="action-btn"
                style={{ flex: 1, height: '48px', opacity: 0.5 }}
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  setCustomRates(tempRates);
                  setIsCustomRate(true);
                  setIsEditingRates(false);
                  showToast('Tasa personalizada activada');
                }}
                className="btn-gold"
                style={{ flex: 1, height: '48px' }}
              >
                Activar Tasa
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-25px) rotate(5deg); }
        }
        @keyframes shadow-scale {
          0%, 100% { transform: scaleX(1.5); opacity: 0.6; }
          50% { transform: scaleX(1.1); opacity: 0.2; }
        }
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .refresh-btn:hover, .edit-rates-btn:hover {
          opacity: 1 !important;
          transform: rotate(15deg) scale(1.1);
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

const PodiumSection = ({ title, icon, data, labelKey, scoreKey, scoreLabel, isClient, onNavigate }) => {
  // Sort into 2nd, 1st, 3rd for visual podium order
  const podiumOrder = [data[1], data[0], data[2]].filter(Boolean);

  return (
    <div className="glass-card" style={{ padding: '24px', borderRadius: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: '900' }}>{title.split(' ')[0]} <span className="text-gold">{title.split(' ')[1]}</span></h3>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '12px', minHeight: '180px' }}>
        {podiumOrder.map((item, idx) => {
          const originalIdx = data.indexOf(item);
          const isFirst = originalIdx === 0;
          const isSecond = originalIdx === 1;
          const isThird = originalIdx === 2;

          return (
            <div key={item.id} style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              animation: `slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
              animationDelay: `${idx * 0.1}s`
            }}>
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <div style={{ 
                  width: isFirst ? '70px' : '56px', 
                  height: isFirst ? '70px' : '56px', 
                  borderRadius: '20px', 
                  backgroundColor: 'var(--bg-tertiary)',
                  border: isFirst ? '3px solid var(--gold-primary)' : '2px solid rgba(255,255,255,0.1)',
                  overflow: 'hidden',
                  boxShadow: isFirst ? 'var(--gold-glow)' : 'none',
                  display: isClient ? 'none' : 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {item.image_url ? (
                    <img src={item.image_url} alt={item[labelKey]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={isFirst ? 32 : 24} color="var(--gold-primary)" opacity={0.5} />
                  )}
                </div>
                {isFirst && <Crown size={20} color="var(--gold-primary)" fill="var(--gold-primary)" style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)' }} />}
                <div style={{ 
                  position: 'absolute', 
                  bottom: '-8px', 
                  left: '50%', 
                  transform: 'translateX(-50%)',
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  backgroundColor: isFirst ? 'var(--gold-primary)' : isSecond ? '#C0C0C0' : '#CD7F32',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '12px', 
                  fontWeight: '900', 
                  color: 'black'
                }}>
                  {originalIdx + 1}
                </div>
              </div>

              <div 
                style={{ textAlign: 'center', marginTop: '12px', cursor: isClient ? 'pointer' : 'default' }}
                onClick={() => isClient && onNavigate && onNavigate('clients', { clientId: item.id })}
              >
                <div style={{ 
                  fontWeight: '900', 
                  fontSize: isFirst ? '14px' : '12px', 
                  whiteSpace: 'nowrap', 
                  maxWidth: '80px', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis',
                  color: isClient ? 'var(--gold-primary)' : 'white',
                  textDecoration: isClient ? 'underline' : 'none',
                  textUnderlineOffset: '4px'
                }}>
                  {item[labelKey].split(' ')[0]}
                </div>
                <div style={{ color: 'var(--gold-primary)', fontWeight: '950', fontSize: '15px' }}>{scoreKey(item)}</div>
                <div style={{ fontSize: '8px', fontWeight: '800', opacity: 0.4, letterSpacing: '0.5px' }}>{scoreLabel}</div>
              {/* Visual Podium Base */}
              <div style={{ 
                width: '100%', 
                height: isFirst ? '60px' : isSecond ? '40px' : '25px', 
                background: 'linear-gradient(to top, rgba(212, 175, 55, 0.3), rgba(212, 175, 55, 0.1))',
                borderRadius: '8px 8px 0 0',
                marginTop: '10px',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                borderBottom: 'none',
                boxShadow: isFirst ? '0 -10px 20px rgba(212, 175, 55, 0.1)' : 'none'
              }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardModule;
