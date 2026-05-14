import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Rocket,
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
  { text: "Tu única competencia es la persona en el espejo.", creator: "Superación" },
  { text: "El negocio de la belleza es el negocio de la felicidad.", creator: "Emprendimiento" }
];

import { useAuth } from '../context/AuthContext';

const DashboardModule = ({ 
  isMobile, 
  isTablet,
  isCollapsed,
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
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [goals, setGoals] = useState({
    daily: parseFloat(localStorage.getItem('astro_daily_goal') || '500'),
    weekly: parseFloat(localStorage.getItem('astro_weekly_goal') || '3000'),
    monthly: parseFloat(localStorage.getItem('astro_monthly_goal') || '12000')
  });
  const [isStoreOpen] = useState(true); 

  const isBarber = user?.role === 'Barbero' || user?.role?.includes('Barbero|');
  const isAssistant = user?.role?.includes('Asistente de Lavado');

  // Filter stats for barber or assistant
  const myStats = ((isBarber || isAssistant) && dbData?.staff) 
    ? (dbData.staff.find(s => s.id === user.id)?.stats || { income: 0, appointments: 0 }) 
    : (stats || { income: 0, weeklyIncome: 0, monthlyIncome: 0, appointments: 0 });

  // Assistant specific: Calculate earnings per barber (Weekly)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoISO = sevenDaysAgo.toISOString();

  const washingByBarber = (isAssistant && dbData?.appointments) ? (dbData.appointments || [])
    .filter(a => a.created_at >= sevenDaysAgoISO && a.appointment_staff?.some(as => as.staff_id === user.id))
    .reduce((acc, a) => {
      const barberName = a.staff?.name || 'Otro';
      const myRecord = a.appointment_staff?.find(as => as.staff_id === user.id);
      const amount = Number(myRecord?.commission_earned || 0);
      
      const existing = acc.find(item => item.name === barberName);
      if (existing) {
        existing.total += amount;
        existing.count += 1;
      } else {
        acc.push({ name: barberName, total: amount, count: 1 });
      }
      return acc;
    }, [])
    .sort((a, b) => b.total - a.total) : [];

  useEffect(() => {
    setQuoteIndex(Math.floor(Math.random() * QUOTES.length));
  }, []);

  const handleSaveGoals = (newGoals) => {
    localStorage.setItem('astro_daily_goal', newGoals.daily);
    localStorage.setItem('astro_weekly_goal', newGoals.weekly);
    localStorage.setItem('astro_monthly_goal', newGoals.monthly);
    setGoals(newGoals);
    setIsEditingGoals(false);
    showToast('Metas actualizadas correctamente.');
  };

  return (
    <div style={{ paddingBottom: isMobile ? '100px' : '40px' }}>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '32px' }}>
        
        {/* Left Column: Vision & Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Main Hero Card */}
          <div className="glass-card" style={{ 
            minHeight: '340px', 
            borderRadius: '32px', 
            padding: '48px', 
            position: 'relative', 
            overflow: 'visible',
            zIndex: 5,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <div style={{ position: 'relative', zIndex: 2, maxWidth: isTablet ? '55%' : (isMobile ? '65%' : '55%'), transform: isTablet ? 'translateY(-40px)' : (isMobile ? 'translateY(-20px)' : 'translateY(0)') }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '20px', height: '2px', backgroundColor: 'var(--gold-primary)' }} />
                <span style={{ fontSize: '12px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '2px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Pensamiento Astro</span>
                <button 
                  onClick={() => setQuoteIndex((prev) => (prev + 1) % QUOTES.length)}
                  style={{ 
                    background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%',
                    transition: 'transform 0.2s ease, background-color 0.2s ease'
                  }}
                  title="Descubrir otro Pensamiento Astro"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.2) rotate(15deg)';
                    e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Rocket size={16} color="var(--gold-primary)" className="animate-pulse" />
                </button>
              </div>
              <h2 style={{ fontSize: isMobile ? '20px' : (isTablet ? '22px' : '32px'), fontWeight: '950', lineHeight: '1.2', marginBottom: '24px', letterSpacing: '-1px', position: 'relative', zIndex: 20, textWrap: 'pretty' }}>
                {QUOTES[quoteIndex].text}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '16px', fontWeight: '600', position: 'relative', zIndex: 20 }}>
                — {QUOTES[quoteIndex].creator}
              </p>
            </div>

            {/* Visual Elements (Astro Premium Responsive) */}
            <div style={{ 
              position: 'absolute', 
              right: isMobile ? '-10px' : '-20px', 
              bottom: isMobile ? '-10px' : '-15px', 
              width: isMobile ? '50%' : '55%', 
              height: '100%',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              zIndex: 10,
              pointerEvents: 'none'
            }}>
              <div className="chair-shadow" style={{ 
                position: 'absolute', 
                bottom: '10px', 
                left: '50%', 
                transform: 'translateX(-50%)', 
                width: '90%', 
                height: '30px', 
                background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, transparent 70%)',
                zIndex: 1,
                animation: 'shadow-scale 8s infinite ease-in-out'
              }} />
              <img 
                src="/barber-chair.png" 
                alt="Astro Chair" 
                className="chair-float"
                style={{ 
                  width: '100%', 
                  maxWidth: '400px',
                  height: 'auto',
                  maxHeight: '95%',
                  objectFit: 'contain',
                  zIndex: 3,
                  /* Doble drop-shadow para crear el resplandor "Oro Astro" premium */
                  filter: 'drop-shadow(0 15px 35px rgba(0,0,0,0.7)) drop-shadow(0 0 25px rgba(212, 175, 55, 0.35))',
                  animation: 'float 8s infinite ease-in-out'
                }} 
              />
            </div>
          </div>

          {/* Business Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '20px' }}>
            <StatCard title="Tu Producción" value={`$${formatCurrency(myStats.income)}`} icon={<TrendingUp size={18} color="var(--gold-primary)" />} color="var(--gold-primary)" trend="+12%" positive={true} />
            {!isAssistant && <StatCard title="Tus Servicios" value={myStats.appointments} icon={<ScissorsIcon size={18} color="var(--gold-primary)" />} color="#4caf50" trend="Activo" positive={true} />}
            {!isBarber && !isAssistant && <StatCard title="En Inventario" value={(dbData?.services?.length || 0) + (dbData?.clients?.length || 0)} icon={<ShoppingBag size={18} color="var(--gold-primary)" />} color="#2196f3" trend="Ok" positive={true} />}
            {isAssistant && <StatCard title="Lavados Realizados" value={myStats.appointments} icon={<Rocket size={18} color="var(--gold-primary)" />} color="#2196f3" trend="Ok" positive={true} />}
          </div>

          {/* Goals Grid - Only for Admins */}
          {(user?.role === 'Admin' || user?.role?.includes('Admin|')) && (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '20px' }}>
              {[
                { id: 'daily', title: 'Misión Diaria', current: stats?.income || 0, goal: goals.daily, icon: <Target size={18} />, label: 'HOY' },
                { id: 'weekly', title: 'Meta Semanal', current: stats?.weeklyIncome || 0, goal: goals.weekly, icon: <TrendingUp size={18} />, label: '7 DÍAS' },
                { id: 'monthly', title: 'Objetivo Mensual', current: stats?.monthlyIncome || 0, goal: goals.monthly, icon: <Trophy size={18} />, label: '30 DÍAS' }
              ].map((m, i) => (
                <div key={m.id} className="glass-card" style={{ padding: '24px', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ color: 'var(--gold-primary)' }}>{m.icon}</div>
                      <span style={{ fontWeight: '900', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' }}>{m.title}</span>
                    </div>
                    {i === 0 && (
                      <button 
                        onClick={() => setIsEditingGoals(true)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                      >
                        <Edit3 size={14} />
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
                    <div style={{ fontSize: '24px', fontWeight: '950', color: 'white' }}>
                      ${formatCurrency(m.current || 0)} <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '700' }}>/ ${formatCurrency(m.goal)}</span>
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', backgroundColor: 'rgba(212,175,55,0.1)', padding: '4px 8px', borderRadius: '6px' }}>
                      {Math.min(Math.round(((m.current || 0) / m.goal) * 100), 100)}%
                    </div>
                  </div>

                  <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${Math.min(((m.current || 0) / m.goal) * 100, 100)}%`, 
                      height: '100%', 
                      background: 'var(--gold-gradient)', 
                      boxShadow: 'var(--gold-glow)',
                      transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' 
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Rankings */}
        {!isBarber && !isAssistant && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <PodiumSection 
              title="Top Barbers" 
              icon={<Trophy size={20} color="var(--gold-primary)" />}
              data={(dbData?.staff || [])
                .filter(s => {
                  const role = (s.role || 'Barbero').toLowerCase();
                  return role.includes('barber') && !role.includes('asistente');
                })
                .sort((a,b) => (b.stats?.monthlyIncome || 0) - (a.stats?.monthlyIncome || 0))
                .slice(0, 3)
              }
              labelKey="name"
              scoreKey={(item) => `$${(item.stats?.monthlyIncome || 0).toFixed(0)}`}
              scoreLabel="ÚLTIMOS 30 DÍAS"
            />

            <PodiumSection 
              title="Top Clientes" 
              icon={<Users size={20} color="var(--gold-primary)" />}
              data={(dbData?.clients || []).sort((a,b) => (b.total_spent || 0) - (a.total_spent || 0)).slice(0, 3)}
              labelKey="name"
              scoreKey={(item) => `$${(item.total_spent || 0).toFixed(0)}`}
              scoreLabel="TOTAL CONSUMIDO"
              isClient
              onNavigate={onNavigate}
            />
          </div>
        )}

        {isAssistant && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div className="glass-card" style={{ padding: '24px', borderRadius: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={20} color="var(--gold-primary)" />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '900' }}>Producción Semanal por <span className="text-gold">Barbero</span></h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {washingByBarber.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <Circle size={40} style={{ opacity: 0.1, marginBottom: '12px' }} />
                    <p style={{ fontSize: '14px' }}>Aún no hay lavados registrados hoy.</p>
                  </div>
                ) : (
                  washingByBarber.map((item, idx) => {
                    const maxVal = washingByBarber[0].total || 1;
                    const percentage = (item.total / maxVal) * 100;
                    
                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: '800', fontSize: '14px', color: 'white' }}>{item.name}</span>
                          <span style={{ fontWeight: '900', fontSize: '14px', color: 'var(--gold-primary)' }}>${item.total.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ flex: 1, height: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ 
                              width: `${percentage}%`, 
                              height: '100%', 
                              background: 'var(--gold-gradient)', 
                              boxShadow: 'var(--gold-glow)',
                              borderRadius: '4px',
                              transition: 'width 1s ease-out'
                            }} />
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', width: '60px' }}>{item.count} lavados</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '24px', borderRadius: '28px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={20} color="var(--gold-primary)" />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '900' }}>Agenda del <span className="text-gold">Día</span></h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '300px' }} className="astro-scrollbar">
                {(!dbData?.todayAppointments || dbData.todayAppointments.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: '14px' }}>No hay citas agendadas para hoy.</p>
                  </div>
                ) : (
                  dbData.todayAppointments.map((app, idx) => (
                    <div key={idx} className="glass-card" style={{ 
                      padding: '16px', 
                      borderRadius: '16px', 
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontWeight: '800', fontSize: '14px', color: 'white' }}>{app.clients?.name || 'Cliente'}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--gold-primary)', fontWeight: '700' }}>{app.staff?.name?.split(' ')[0]}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>•</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{app.services?.name}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: '900', color: 'white' }}>
                          {app.scheduled_at ? new Date(app.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'S/H'}
                        </div>
                        <div style={{ 
                          fontSize: '9px', 
                          fontWeight: '900', 
                          padding: '2px 6px', 
                          borderRadius: '4px',
                          marginTop: '4px',
                          backgroundColor: app.status === 'En Silla' ? 'rgba(76,175,80,0.1)' : 'rgba(212,175,55,0.1)',
                          color: app.status === 'En Silla' ? '#4caf50' : 'var(--gold-primary)',
                          display: 'inline-block'
                        }}>
                          {app.status}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Goal Edit Modal */}
      {isEditingGoals && (
        <div className="modal-overlay animate-fade-in" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(10px)'
        }}>
          <div className="glass-card animate-scale-in" style={{ width: '400px', padding: '40px', borderRadius: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Target color="var(--gold-primary)" size={20} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '900' }}>Metas <span className="text-gold">Astro</span></h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>META DIARIA ($)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={goals.daily} 
                  onChange={e => setGoals({...goals, daily: e.target.value})}
                  style={{ width: '100%', fontSize: '16px', fontWeight: '800' }}
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>META SEMANAL ($)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={goals.weekly} 
                  onChange={e => setGoals({...goals, weekly: e.target.value})}
                  style={{ width: '100%', fontSize: '16px', fontWeight: '800' }}
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>META MENSUAL ($)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={goals.monthly} 
                  onChange={e => setGoals({...goals, monthly: e.target.value})}
                  style={{ width: '100%', fontSize: '16px', fontWeight: '800' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-secondary" onClick={() => setIsEditingGoals(false)} style={{ flex: 1 }}>Cancelar</button>
              <button className="btn-gold" onClick={() => handleSaveGoals(goals)} style={{ flex: 2 }}>Guardar Metas</button>
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
