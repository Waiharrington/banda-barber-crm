import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  RefreshCw,
  Gift,
  Cake,
  MessageCircle,
  Sparkles,
  X
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
import { notificationService } from '../services/notificationService';
import { useScrollLock } from '../hooks/useScrollLock';
import { ModalShield } from '../context/ModalContext';

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
  onNavigate,
  onRefresh
}) => {
  const { user } = useAuth();
  const [quoteIndex, setQuoteIndex] = useState(0);
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
    <div style={{ 
      paddingBottom: (isMobile || isTablet) ? '100px' : '0px', 
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative',
      overflow: (isMobile || isTablet) ? 'visible' : 'hidden',
      height: (isMobile || isTablet) ? 'auto' : 'calc(100vh - 145px)',
      minHeight: 0
    }}>
      {/* Ambient glowing background orbs */}
      <div className="l-dashboard-orb l-orb-1" />
      <div className="l-dashboard-orb l-orb-2" />

      <div style={{ display: 'grid', gridTemplateColumns: (isMobile || isTablet) ? '1fr' : '2fr 1fr', gap: '16px', flex: 1, minHeight: 0 }}>
        
        {/* Left Column: Vision & Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', justifyContent: 'flex-start' }}>
          
          {/* Main Hero & Birthday Row */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: (isMobile || (isTablet && !isCollapsed) || isBarber || isAssistant) ? '1fr' : '1.55fr 1fr', 
            gap: '16px', 
            alignItems: 'stretch',
            flex: (isMobile || (isTablet && !isCollapsed)) ? 'auto' : '1.3',
            minHeight: (isMobile || (isTablet && !isCollapsed)) ? 'auto' : '190px'
          }}>
            
            {/* Main Hero Card (Premium View) */}
            <div className="hero-card-container animate-slide-up animate-stagger-1" style={{ 
              minHeight: '200px', 
              padding: '20px 28px', 
              position: 'relative', 
              overflow: 'visible',
              zIndex: 5,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              height: '100%'
            }}>
              {/* Inner container to clip the soft background glow and prevent bleeding to neighbor cards */}
              <div className="hero-card-bg">
                <div style={{
                  position: 'absolute',
                  top: '45%',
                  right: '-40px',
                  transform: 'translateY(-50%)',
                  width: '320px',
                  height: '320px',
                  background: 'radial-gradient(circle, rgba(212, 175, 55, 0.16) 0%, rgba(212, 175, 55, 0.05) 35%, rgba(212, 175, 55, 0.01) 65%, transparent 100%)',
                  pointerEvents: 'none'
                }} />
              </div>

              <div style={{ position: 'relative', zIndex: 2, maxWidth: isMobile ? '65%' : '55%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ width: '24px', height: '2px', backgroundColor: 'var(--gold-primary)' }} />
                  <span style={{ fontSize: '11px', fontWeight: '950', color: 'var(--gold-primary)', letterSpacing: '2px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Pensamiento Astro</span>
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
                    <Rocket size={14} color="var(--gold-primary)" className="animate-pulse" />
                  </button>
                </div>
                <h2 style={{ 
                  fontSize: isMobile ? '18px' : (isTablet ? '20px' : (isCollapsed ? '25px' : '19px')), 
                  fontWeight: '700', 
                  lineHeight: '1.35', 
                  marginBottom: '14px', 
                  letterSpacing: '-0.3px', 
                  position: 'relative', 
                  zIndex: 20, 
                  textWrap: 'pretty',
                  fontFamily: "'Georgia', serif",
                  fontStyle: 'italic',
                  color: 'white',
                  textShadow: '0 2px 12px rgba(0,0,0,0.6)'
                }}>
                  “{QUOTES[quoteIndex].text}”
                </h2>
                <p style={{ color: 'var(--gold-primary)', fontSize: '13px', fontWeight: '800', position: 'relative', zIndex: 20, opacity: 0.9, letterSpacing: '0.5px' }}>
                  — {QUOTES[quoteIndex].creator}
                </p>
              </div>

              {/* Visual Elements (Astro Premium Responsive - Compacted) */}
              <div className="chair-entrance" style={{ 
                position: 'absolute', 
                right: '-10px', 
                top: '-70px',
                bottom: '-10px', 
                width: isMobile ? '45%' : '40%', 
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                zIndex: 10,
                pointerEvents: 'none'
              }}>
                <div className="chair-shadow" style={{ 
                  position: 'absolute', 
                  bottom: '8px', 
                  left: '42%', 
                  transform: 'translateX(-50%)', 
                  width: '130px', 
                  height: '24px', 
                  background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.65) 0%, transparent 70%)',
                  zIndex: 1,
                  animation: 'shadow-scale 8s infinite ease-in-out'
                }} />
                <img 
                  src="/barber-chair.png" 
                  alt="Astro Chair" 
                  className="chair-float"
                  style={{ 
                    width: '100%', 
                    maxWidth: isMobile ? '180px' : '240px',
                    height: 'auto',
                    objectFit: 'contain',
                    zIndex: 3,
                    filter: 'drop-shadow(0 10px 25px rgba(0,0,0,0.7)) drop-shadow(0 0 15px rgba(212, 175, 55, 0.3))',
                    animation: 'float 8s infinite ease-in-out'
                  }} 
                />
              </div>
            </div>

            {/* Birthday Section Card */}
            {!isBarber && !isAssistant && (
              <BirthdaySection clients={dbData?.clients || []} dbData={dbData} onNavigate={onNavigate} onRefresh={onRefresh} isEditingGoals={isEditingGoals} />
            )}

          </div>

          {/* Business Stats Grid (Compact) */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px', flex: isMobile ? 'auto' : '1', minHeight: isMobile ? 'auto' : '90px' }}>
            <StatCard title="Tu Producción" value={`$${formatCurrency(myStats.income)}`} icon={<TrendingUp size={16} color="var(--gold-primary)" />} color="var(--gold-primary)" trend="+12%" positive={true} staggerIndex={3} />
            {!isAssistant && <StatCard title="Tus Servicios" value={myStats.appointments} icon={<ScissorsIcon size={16} color="var(--gold-primary)" />} color="#4caf50" trend="Activo" positive={true} staggerIndex={4} />}
            {!isBarber && !isAssistant && <StatCard title="En Inventario" value={(dbData?.services?.length || 0) + (dbData?.clients?.length || 0)} icon={<ShoppingBag size={16} color="var(--gold-primary)" />} color="#2196f3" trend="Ok" positive={true} staggerIndex={5} />}
            {isAssistant && <StatCard title="Lavados Realizados" value={myStats.appointments} icon={<Rocket size={16} color="var(--gold-primary)" />} color="#2196f3" trend="Ok" positive={true} staggerIndex={4} />}
          </div>

          {/* Goals Grid - Only for Admins (Compact Grid) */}
          {(user?.role === 'Admin' || user?.role?.includes('Admin|')) && (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px', flex: isMobile ? 'auto' : '1', minHeight: isMobile ? 'auto' : '90px' }}>
              {[
                { id: 'daily', title: 'Misión Diaria', current: stats?.income || 0, goal: goals.daily, icon: <Target size={16} />, label: 'HOY' },
                { id: 'weekly', title: 'Meta Semanal', current: stats?.weeklyIncome || 0, goal: goals.weekly, icon: <TrendingUp size={16} />, label: 'SEMANA ACTUAL' },
                { id: 'monthly', title: 'Objetivo Mensual', current: stats?.monthlyIncome || 0, goal: goals.monthly, icon: <Trophy size={16} />, label: 'MES EN CURSO' }
              ].map((m, i) => (
                <div key={m.id} className={`glass-card animate-slide-up animate-stagger-${6 + i}`} style={{ padding: '12px 18px', borderRadius: '20px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '95px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ color: 'var(--gold-primary)', display: 'flex', alignItems: 'center' }}>{m.icon}</div>
                      <span style={{ fontWeight: '900', fontSize: '11px', letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{m.title}</span>
                    </div>
                    {i === 0 && (
                      <button 
                        onClick={() => setIsEditingGoals(true)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                      >
                        <Edit3 size={12} />
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                    <div style={{ fontSize: '18px', fontWeight: '950', color: 'white' }}>
                      ${formatCurrency(m.current || 0)} <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>/ ${formatCurrency(m.goal)}</span>
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)', backgroundColor: 'rgba(212,175,55,0.08)', padding: '2px 6px', borderRadius: '4px' }}>
                      {Math.min(Math.round(((m.current || 0) / m.goal) * 100), 100)}%
                    </div>
                  </div>

                  <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div 
                      className="l-progress-fill"
                      style={{ 
                        width: `${Math.min(((m.current || 0) / m.goal) * 100, 100)}%`, 
                        height: '100%', 
                        background: 'var(--gold-gradient)', 
                        boxShadow: 'var(--gold-glow)',
                        transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' 
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          
        </div>

        {/* Right Column: Rankings */}
        {!isBarber && !isAssistant && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <PodiumSection 
                title="Top Barbers" 
                icon={<Trophy size={20} color="var(--gold-primary)" />}
                data={(dbData?.staff || [])
                  .filter(s => {
                    const role = (s.role || 'Barbero').toLowerCase();
                    return role.includes('barber') && !role.includes('asistente') && !role.includes('admin');
                  })
                  .sort((a,b) => (b.stats?.monthlyIncome || 0) - (a.stats?.monthlyIncome || 0))
                  .slice(0, 3)
                }
                labelKey="name"
                scoreKey={(item) => `$${(item.stats?.monthlyIncome || 0).toFixed(0)}`}
                scoreLabel="MES EN CURSO"
                staggerIndex={6}
              />
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <PodiumSection 
                title="Top Clientes" 
                icon={<Users size={20} color="var(--gold-primary)" />}
                data={(dbData?.clients || []).sort((a,b) => (b.total_spent || 0) - (a.total_spent || 0)).slice(0, 3)}
                labelKey="name"
                scoreKey={(item) => `$${(item.total_spent || 0).toFixed(0)}`}
                scoreLabel="TOTAL CONSUMIDO"
                isClient
                onNavigate={onNavigate}
                staggerIndex={8}
              />
            </div>
          </div>
        )}

        {isAssistant && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                            <div 
                              className="l-progress-fill"
                              style={{ 
                                width: `${percentage}%`, 
                                height: '100%', 
                                background: 'var(--gold-gradient)', 
                                boxShadow: 'var(--gold-glow)',
                                borderRadius: '4px',
                                transition: 'width 1s ease-out'
                              }} 
                            />
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
                          {app.scheduled_at ? new Date(app.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : 'S/H'}
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
        <ModalShield active={isEditingGoals}>
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(10,10,10,0.94)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999
          }}>
            <div className="glass-card animate-scale-in" style={{ 
              width: '400px', 
              padding: '40px', 
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
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
            <button 
              onClick={() => setIsEditingGoals(false)} 
              style={{ 
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Cancelar
            </button>
            <button className="btn-gold" onClick={() => handleSaveGoals(goals)} style={{ flex: 2 }}>Guardar Metas</button>
          </div>
            </div>
          </div>
        </ModalShield>
      )}

      <style>{`
        .hero-card-container {
          position: relative;
          transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .hero-card-container:hover {
          transform: translateY(-5px) scale(1.006);
        }
        .hero-card-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(42, 34, 15, 0.65) 100%);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border: 1px solid rgba(212, 175, 55, 0.35);
          border-radius: 24px;
          box-shadow: 0 16px 45px rgba(0, 0, 0, 0.75), inset 0 0 35px rgba(212, 175, 55, 0.08);
          transition: border-color 0.45s ease, box-shadow 0.45s ease;
          overflow: hidden;
          z-index: 1;
        }
        .hero-card-container:hover .hero-card-bg {
          border-color: rgba(212, 175, 55, 0.5) !important;
          box-shadow: 0 24px 50px rgba(0, 0, 0, 0.8), 
                      0 0 25px rgba(212, 175, 55, 0.08) !important;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-25px) rotate(5deg); }
        }
        @keyframes shadow-scale {
          0%, 100% { transform: translateX(-50%) scaleX(1); opacity: 0.7; }
          50% { transform: translateX(-50%) scaleX(0.7) scaleY(0.8); opacity: 0.25; }
        }
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .refresh-btn:hover, .edit-rates-btn:hover {
          opacity: 1 !important;
          transform: rotate(15deg) scale(1.1);
        }

        /* ── AMBIENT BACKLIGHT GLOWING ORBS ── */
        .l-dashboard-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(140px);
          opacity: 0.09;
          z-index: 0;
          pointer-events: none;
          animation: orb-float 22s infinite ease-in-out;
        }
        .l-orb-1 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, #d4af37 0%, transparent 70%);
          top: -10%;
          right: -10%;
          animation-duration: 24s;
        }
        .l-orb-2 {
          width: 550px;
          height: 550px;
          background: radial-gradient(circle, #8a6d1c 0%, transparent 70%);
          bottom: -20%;
          left: -12%;
          animation-duration: 32s;
          animation-delay: -6s;
        }
        @keyframes orb-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, -60px) scale(1.15); }
          66% { transform: translate(-30px, 50px) scale(0.9); }
        }

        /* ── GLASSMORPHISM PREMIUM HOVER EFFECT ON ALL CARDS ── */
        .glass-card {
          position: relative;
          background: rgba(18, 18, 21, 0.75) !important;
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border: 1px solid rgba(255, 255, 255, 0.04) !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), 
                      border-color 0.45s ease, 
                      box-shadow 0.45s ease !important;
          z-index: 2;
        }
        .glass-card:hover {
          transform: translateY(-5px) scale(1.006);
          border-color: rgba(212, 175, 55, 0.28) !important;
          box-shadow: 0 24px 50px rgba(0, 0, 0, 0.8), 
                      0 0 25px rgba(212, 175, 55, 0.08) !important;
        }

        /* ── METRICS SHIMMER EFFECT ── */
        .l-progress-fill {
          position: relative;
          overflow: hidden;
        }
        .l-progress-fill::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.35),
            transparent
          );
          transform: translateX(-100%);
          animation: progress-shimmer 2.2s infinite ease-in-out;
        }
        @keyframes progress-shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

const StatCard = ({ title, value, icon, color, trend, positive, goal, current, onEditGoal, staggerIndex }) => {
  const percentage = goal ? Math.min(Math.round((current / goal) * 100), 100) : null;
  const staggerClass = staggerIndex ? `animate-stagger-${staggerIndex}` : '';
  return (
    <div className={`glass-card animate-slide-up ${staggerClass}`} style={{ padding: '12px 18px', borderRadius: '20px', border: `1px solid ${color}1A`, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '95px' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: `${color}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {icon}
          </div>
          {trend && !goal && (
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
          {percentage !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', backgroundColor: 'rgba(212,175,55,0.1)', padding: '2px 6px', borderRadius: '6px' }}>
                Meta: {percentage}%
              </span>
              {onEditGoal && (
                <button 
                  onClick={onEditGoal}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                  title="Editar Metas"
                >
                  <Edit3 size={12} />
                </button>
              )}
            </div>
          )}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>{title}</div>
        <div style={{ fontSize: '20px', fontWeight: '950', marginTop: '2px', color: 'white' }}>{value}</div>
      </div>

      {percentage !== null && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ 
              width: `${percentage}%`, 
              height: '100%', 
              background: 'var(--gold-gradient)', 
              boxShadow: 'var(--gold-glow)',
              transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' 
            }} />
          </div>
        </div>
      )}
    </div>
  );
};

const BirthdaySection = ({ clients, dbData, onNavigate, onRefresh, isEditingGoals }) => {
  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();
  const [isLaunching, setIsLaunching] = useState(false);
  const [whatsappModalData, setWhatsappModalData] = useState(null);
  const [activePerson, setActivePerson] = useState(null);
  const [editedPhone, setEditedPhone] = useState('');
  const [editedMessage, setEditedMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useScrollLock(activePerson !== null || isEditingGoals);

  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin' || user?.role?.includes('Admin|');

  useEffect(() => {
    if (whatsappModalData) {
      setActivePerson(whatsappModalData);
    }
  }, [whatsappModalData]);

  // Map real database staff members to birthday objects
  const dbStaffBirthdays = (dbData?.staff || []).map(s => {
    return {
      id: s.id,
      name: s.name.trim(),
      role: s.role?.split('|')[0] || 'Personal',
      phone: s.phone || '',
      birth_date: s.birth_date || null,
      isStaff: true
    };
  });

  // Combine clients with isStaff: false, and database staff with isStaff: true
  const allPeople = [
    ...(clients || []).map(c => ({ ...c, isStaff: false })),
    ...dbStaffBirthdays
  ];

  // Birthdays Today
  const todaysBirthdays = allPeople.filter(p => {
    if (!p.birth_date) return false;
    const parts = p.birth_date.split('-');
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    return m === todayMonth && d === todayDay;
  });

  // Upcoming Birthdays (next 15 days)
  const upcomingBirthdays = allPeople
    .filter(p => {
      if (!p.birth_date) return false;
      const parts = p.birth_date.split('-');
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      
      const bday = new Date(today.getFullYear(), m - 1, d);
      if (bday < today && !(m === todayMonth && d === todayDay)) {
        bday.setFullYear(today.getFullYear() + 1);
      }
      
      const diffTime = bday - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      p.daysToBday = diffDays;
      p.bdayDateStr = `${d} de ${bday.toLocaleDateString([], { month: 'long' })}`;
      
      return diffDays > 0 && diffDays <= 15;
    })
    .sort((a, b) => a.daysToBday - b.daysToBday)
    .slice(0, 4);

  const handleCongratulate = async (person) => {
    setIsLaunching(true);
    setTimeout(() => {
      setIsLaunching(false);
    }, 3000);

    try {
      if (notificationService.getPermissionStatus() === 'default') {
        await notificationService.requestPermission();
      }
    } catch (e) {
      console.warn('Fallo al solicitar permisos de notificación:', e);
    }

    notificationService.sendNotification(
      `🚀 ¡Despegue Estelar para ${person.name}!`,
      `El Astro Team felicita hoy a ${person.name} (${person.role}) en su cumpleaños. 🎂💈`
    );
  };

  const handleWhatsAppCongratulate = (person) => {
    let template = localStorage.getItem('astro_default_bday_message');
    const isCorrupted = !template || 
      template.includes('\uFFFD') || 
      template.includes('ï¿½') ||
      /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|([^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/.test(template);
    if (isCorrupted) {
      template = `¡Hola {name}! ${String.fromCodePoint(0x1F389)} Te deseamos un muy feliz cumpleaños de parte de todo el equipo de Astro Barbershop. ${String.fromCodePoint(0x1F488)} ¡Que tengas un día excelente!`;
      localStorage.setItem('astro_default_bday_message', template);
    }
    const whatsappMsg = template.replace('{name}', person.name);
    setEditedPhone(person.phone || '');
    setEditedMessage(whatsappMsg);
    setWhatsappModalData(person);
  };

  const handleSendWhatsApp = async (isDirect = true) => {
    if (!whatsappModalData) return;

    const isRealClient = !whatsappModalData.isStaff && 
      !String(whatsappModalData.id).startsWith('staff-') && 
      !String(whatsappModalData.id).startsWith('client-');

    if (isRealClient && editedPhone !== (whatsappModalData.phone || '')) {
      setIsSaving(true);
      try {
        await dataService.updateClient(whatsappModalData.id, { phone: editedPhone });
        if (onRefresh) await onRefresh();
      } catch (err) {
        console.error("Error al actualizar teléfono de cliente:", err);
      } finally {
        setIsSaving(false);
      }
    }

    let url;
    if (isDirect && editedPhone) {
      url = `https://wa.me/${editedPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(editedMessage)}`;
    } else {
      url = `https://wa.me/?text=${encodeURIComponent(editedMessage)}`;
    }

    window.open(url, '_blank');
    setWhatsappModalData(null);
  };

  const hasBirthdaysToday = todaysBirthdays.length > 0;

  return (
    <div 
      className="glass-card animate-slide-up animate-stagger-2" 
      style={{ 
        padding: '14px 16px', 
        borderRadius: '24px', 
        background: hasBirthdaysToday ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(10, 10, 10, 0.4) 100%)' : 'rgba(255,255,255,0.02)', 
        border: hasBirthdaysToday ? '1px solid rgba(212, 175, 55, 0.25)' : '1px solid rgba(255,255,255,0.05)',
        boxShadow: hasBirthdaysToday ? '0 8px 32px rgba(212, 175, 55, 0.05)' : 'none',
        position: 'relative',
        overflow: 'visible',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      {/* Space Rocket Launch Elements */}
      {isLaunching && (
        <>
          <div className="rocket-container">
            <div className="rocket-body">
              🚀
              <div className="rocket-trail"></div>
            </div>
          </div>
          {/* Multiple smoke particles rising */}
          {[...Array(12)].map((_, i) => (
            <div 
              key={i} 
              className="rocket-smoke" 
              style={{ 
                animationDelay: `${i * 0.08}s`,
                left: `calc(50% + ${Math.sin(i) * 35}px)` 
              }} 
            />
          ))}
          {/* Magical golden sparkles shooting upwards */}
          {[...Array(15)].map((_, i) => {
            const randomX = Math.random() * 80 - 40;
            const randomDelay = Math.random() * 1.5;
            const randomSize = Math.random() * 16 + 12;
            return (
              <span
                key={`sparkle-${i}`}
                className="animate-fade-in"
                style={{
                  position: 'fixed',
                  bottom: '-50px',
                  left: `calc(50% + ${randomX}px)`,
                  fontSize: `${randomSize}px`,
                  zIndex: 10001,
                  pointerEvents: 'none',
                  animation: 'launchRocket 2s cubic-bezier(0.25, 1, 0.5, 1) forwards',
                  animationDelay: `${randomDelay}s`,
                  filter: 'drop-shadow(0 0 8px var(--gold-primary))'
                }}
              >
                {i % 2 === 0 ? '✨' : '⭐'}
              </span>
            );
          })}
        </>
      )}

      {/* 1. HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: hasBirthdaysToday ? 'var(--gold-primary)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cake size={16} color={hasBirthdaysToday ? 'black' : 'var(--text-muted)'} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '900', color: 'white', letterSpacing: '-0.3px' }}>
              {hasBirthdaysToday ? '¡Cumpleaños Hoy!' : 'Cumpleaños'}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>
              {hasBirthdaysToday ? 'Festejo en el equipo' : 'Próximos 15 días'}
            </div>
          </div>
        </div>
        {hasBirthdaysToday && (
          <span className="animate-pulse" style={{ backgroundColor: 'var(--gold-primary)', color: 'black', fontSize: '9px', fontWeight: '950', padding: '2px 8px', borderRadius: '20px' }}>
            FIESTA 🎉
          </span>
        )}
      </div>

      {/* 2. BODY CONTENT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', margin: '8px 0', width: '100%' }}>
        {hasBirthdaysToday ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {todaysBirthdays.map(p => {
              const whatsappMsg = `¡Hola ${p.name}! 🎉 Te deseamos un muy feliz cumpleaños de parte de todo el equipo de Astro Barbershop. 💈 Queremos regalarte un detalle en tu próximo servicio. ¡Reserva hoy!`;
              const whatsappUrl = `https://wa.me/${p.phone ? p.phone.replace(/[^0-9]/g, '') : ''}?text=${encodeURIComponent(whatsappMsg)}`;

              return (
                <div 
                  key={p.id} 
                  style={{ 
                    padding: '10px 12px', 
                    backgroundColor: 'rgba(10, 10, 10, 0.4)', 
                    border: '1px solid rgba(212, 175, 55, 0.15)', 
                    borderRadius: '14px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px 10px',
                    width: '100%'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '100px', flex: '1 1 0%' }}>
                    <span style={{ fontWeight: '850', color: 'white', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                      {p.name}
                    </span>
                    <span style={{ alignSelf: 'flex-start', fontSize: '8px', fontWeight: '950', color: p.isStaff ? 'black' : 'white', backgroundColor: p.isStaff ? 'var(--gold-primary)' : 'rgba(255,255,255,0.1)', padding: '1px 4px', borderRadius: '3px', whiteSpace: 'nowrap' }}>
                      {p.isStaff ? p.role || 'TEAM' : 'CLIENTE'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexShrink: 0, flexGrow: 1, justifyContent: 'flex-end' }}>
                    {p.isStaff ? (
                      <button 
                        onClick={() => handleCongratulate(p)}
                        style={{ 
                          padding: '6px 10px', 
                          borderRadius: '8px', 
                          border: 'none', 
                          backgroundColor: 'rgba(212, 175, 55, 0.15)', 
                          color: 'var(--gold-primary)', 
                          fontSize: '11px', 
                          fontWeight: '800', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <Sparkles size={11} /> Felicitar
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleWhatsAppCongratulate(p)}
                        style={{ 
                          padding: '6px 10px', 
                          borderRadius: '8px', 
                          border: 'none', 
                          backgroundColor: '#25d366', 
                          color: 'black', 
                          fontSize: '11px', 
                          fontWeight: '850', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <MessageCircle size={11} fill="black" /> Felicitar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ 
              textAlign: 'center', 
              padding: '8px 12px', 
              backgroundColor: 'rgba(255,255,255,0.01)', 
              borderRadius: '12px', 
              border: '1px dashed rgba(255,255,255,0.05)', 
              color: 'var(--text-muted)', 
              fontSize: '11px', 
              fontWeight: '700' 
            }}>
              Sin cumpleaños el día de hoy
            </div>
            
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', margin: '4px 0' }} />
            
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '0.5px', marginBottom: '2px' }}>
              PRÓXIMOS 15 DÍAS
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {upcomingBirthdays.length === 0 ? (
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600', padding: '6px 0', textAlign: 'center' }}>
                  Sin cumpleaños en los próximos 15 días
                </div>
              ) : (
                upcomingBirthdays.map(p => (
                  <div 
                    key={p.id} 
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: '8px', cursor: p.isStaff ? 'default' : 'pointer' }}
                    onClick={() => !p.isStaff && onNavigate && onNavigate('clients', { clientId: p.id })}
                  >
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                      {p.name} 
                      {p.isStaff ? (
                        <span style={{ fontSize: '9px', fontWeight: '900', color: 'rgba(212,175,55,0.7)', marginLeft: '4px' }}>TEAM</span>
                      ) : (
                        <span style={{ fontSize: '9px', fontWeight: '900', color: 'rgba(255,255,255,0.4)', marginLeft: '4px' }}>CLIENTE</span>
                      )}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.bdayDateStr}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. FOOTER CONTENT (UPCOMING LIST) */}
      {hasBirthdaysToday && upcomingBirthdays.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', margin: '4px 0' }} />
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '0.5px', marginBottom: '2px' }}>
            PRÓXIMOS CUMPLEAÑOS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {upcomingBirthdays.slice(0, 2).map(p => (
              <div 
                key={p.id} 
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: '6px', cursor: p.isStaff ? 'default' : 'pointer' }}
                onClick={() => !p.isStaff && onNavigate && onNavigate('clients', { clientId: p.id })}
              >
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                  {p.name} 
                  {p.isStaff ? (
                    <span style={{ fontSize: '8px', fontWeight: '900', color: 'rgba(212,175,55,0.7)', marginLeft: '4px' }}>TEAM</span>
                  ) : (
                    <span style={{ fontSize: '8px', fontWeight: '900', color: 'rgba(255,255,255,0.4)', marginLeft: '4px' }}>CLIENTE</span>
                  )}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{p.bdayDateStr}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom styled modal overlay for WhatsApp congratulations */}
      {activePerson && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: whatsappModalData ? 'blur(8px)' : 'blur(0px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          opacity: whatsappModalData ? 1 : 0,
          visibility: whatsappModalData ? 'visible' : 'hidden',
          pointerEvents: whatsappModalData ? 'auto' : 'none',
          transition: 'opacity 0.3s ease, backdrop-filter 0.3s ease, visibility 0.3s'
        }}>
          <div className="glass-card" style={{
            width: '100%',
            maxWidth: '440px',
            background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.95) 0%, rgba(10, 10, 10, 0.98) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.25)',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(212, 175, 55, 0.05)',
            position: 'relative',
            transform: whatsappModalData ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)',
            transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
            opacity: whatsappModalData ? 1 : 0
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageCircle size={20} color="var(--gold-primary)" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: 'white' }}>
                  Felicitar a {activePerson.name}
                </h3>
              </div>
              <button 
                onClick={() => setWhatsappModalData(null)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Description */}
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 16px 0' }}>
              Puedes personalizar el mensaje y el número. Si editas el teléfono de un cliente registrado, se guardará el nuevo número automáticamente en la base de datos.
            </p>

            {/* Phone Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Número de Teléfono
              </label>
              <input 
                type="text" 
                value={editedPhone} 
                onChange={(e) => setEditedPhone(e.target.value)}
                placeholder="Ej: +584121234567"
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: '600',
                  outline: 'none',
                }}
              />
            </div>

            {/* Message Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Mensaje de Felicitación
              </label>
              <textarea 
                value={editedMessage} 
                onChange={(e) => setEditedMessage(e.target.value)}
                rows={6}
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: '600',
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: '140px',
                  lineHeight: '1.5'
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={() => handleSendWhatsApp(true)}
                disabled={isSaving || !editedPhone}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: editedPhone ? '#25d366' : 'rgba(255,255,255,0.05)',
                  color: editedPhone ? 'black' : 'var(--text-muted)',
                  fontWeight: '850',
                  fontSize: '13px',
                  border: 'none',
                  cursor: (isSaving || !editedPhone) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: editedPhone ? '0 4px 12px rgba(37, 211, 102, 0.25)' : 'none',
                }}
              >
                <MessageCircle size={16} />
                {isSaving ? 'Guardando Teléfono...' : 'Enviar al Número Registrado'}
              </button>

              <button 
                onClick={() => handleSendWhatsApp(false)}
                disabled={isSaving}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '13px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                Elegir Contacto Manualmente
              </button>

              <button 
                onClick={() => setWhatsappModalData(null)}
                disabled={isSaving}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: 'transparent',
                  color: 'var(--text-muted)',
                  fontWeight: '600',
                  fontSize: '13px',
                  border: 'none',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  textAlign: 'center'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const PodiumSection = ({ title, icon, data, labelKey, scoreKey, scoreLabel, isClient, onNavigate, staggerIndex }) => {
  // Sort into 2nd, 1st, 3rd for visual podium order
  const podiumOrder = [data[1], data[0], data[2]].filter(Boolean);
  const staggerClass = staggerIndex ? `animate-stagger-${staggerIndex}` : '';

  return (
    <div className={`glass-card animate-slide-up ${staggerClass}`} style={{ padding: '12px 18px', borderRadius: '24px', minHeight: '210px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <div style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundColor: 'rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <h3 style={{ fontSize: '15px', fontWeight: '900' }}>{title.split(' ')[0]} <span className="text-gold">{title.split(' ')[1]}</span></h3>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '12px', minHeight: '130px', flex: 1 }}>
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
              alignItems: 'center'
            }}>
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <div style={{ 
                  width: isFirst ? '56px' : '44px', 
                  height: isFirst ? '56px' : '44px', 
                  borderRadius: '16px', 
                  backgroundColor: 'var(--bg-tertiary)',
                  border: isFirst ? '3px solid var(--gold-primary)' : '2px solid rgba(255,255,255,0.1)',
                  overflow: 'hidden',
                  boxShadow: isFirst ? 'var(--gold-glow)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {item.image_url ? (
                    <img src={item.image_url} alt={item[labelKey]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={isFirst ? 24 : 18} color="var(--gold-primary)" opacity={0.5} />
                  )}
                </div>
                {isFirst && <Crown size={16} color="var(--gold-primary)" fill="var(--gold-primary)" style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)' }} />}
                <div style={{ 
                  position: 'absolute', 
                  bottom: '-8px', 
                  left: '50%', 
                  transform: 'translateX(-50%)',
                  width: '20px', 
                  height: '20px', 
                  borderRadius: '50%', 
                  backgroundColor: isFirst ? 'var(--gold-primary)' : isSecond ? '#C0C0C0' : '#CD7F32',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '11px', 
                  fontWeight: '900', 
                  color: 'black'
                }}>
                  {originalIdx + 1}
                </div>
              </div>

              <div 
                style={{ textAlign: 'center', marginTop: '8px', cursor: isClient ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                onClick={() => isClient && onNavigate && onNavigate('clients', { clientId: item.id })}
              >
                <div style={{ 
                  fontWeight: '900', 
                  fontSize: isFirst ? '13px' : '11px', 
                  whiteSpace: 'nowrap', 
                  maxWidth: '70px', 
                  margin: '0 auto 3px auto',
                  textAlign: 'center',
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis',
                  color: isClient ? 'var(--gold-primary)' : 'white',
                  textDecoration: isClient ? 'underline' : 'none',
                  textUnderlineOffset: '3px'
                }}>
                  {item[labelKey].split(' ')[0]}
                </div>
                <div style={{ color: 'var(--gold-primary)', fontWeight: '950', fontSize: '13px', textAlign: 'center', marginBottom: '2px' }}>{scoreKey(item)}</div>
                <div style={{ fontSize: '8px', fontWeight: '800', opacity: 0.4, letterSpacing: '0.5px', marginBottom: '4px', textAlign: 'center' }}>{scoreLabel}</div>
              {/* Visual Podium Base */}
              <div style={{ 
                width: '46px', 
                height: isFirst ? '40px' : isSecond ? '26px' : '14px', 
                background: 'linear-gradient(to top, rgba(212, 175, 55, 0.3), rgba(212, 175, 55, 0.1))',
                borderRadius: '6px 6px 0 0',
                margin: '8px auto 0 auto',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                borderBottom: 'none',
                boxShadow: isFirst ? '0 -8px 15px rgba(212, 175, 55, 0.15)' : 'none'
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

