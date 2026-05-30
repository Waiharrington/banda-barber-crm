import React, { useState, useEffect } from 'react';
import { 
  Zap,
  TrendingUp,
  Scissors,
  User,
  Package,
  DollarSign,
  Users,
  Trophy,
  Crown,
  Calendar,
  ArrowUpRight,
  Target,
  Edit3,
  Gift,
  Cake,
  Rocket
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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

const MobileDashboard = ({ onOpenSale, stats, chartData, dbData, onNavigate }) => {
  const { user } = useAuth();
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [goals, setGoals] = useState({
    daily: parseFloat(localStorage.getItem('astro_daily_goal') || '500'),
    weekly: parseFloat(localStorage.getItem('astro_weekly_goal') || '3000'),
    monthly: parseFloat(localStorage.getItem('astro_monthly_goal') || '12000')
  });

  useEffect(() => {
    setQuoteIndex(Math.floor(Math.random() * QUOTES.length));
  }, []);

  const handleSaveGoals = (newGoals) => {
    localStorage.setItem('astro_daily_goal', newGoals.daily);
    localStorage.setItem('astro_weekly_goal', newGoals.weekly);
    localStorage.setItem('astro_monthly_goal', newGoals.monthly);
    setGoals(newGoals);
    setIsEditingGoals(false);
  };

  const isBarber = user?.role === 'Barbero' || user?.role?.includes('Barbero|');
  const isAssistant = user?.role?.includes('Asistente de Lavado');
  const isAdmin = user?.role === 'Admin' || user?.role?.includes('Admin|');

  const myStats = ((isBarber || isAssistant) && dbData?.staff) 
    ? (dbData.staff.find(s => s.id === user.id)?.stats || { income: 0, appointments: 0 }) 
    : (stats || { income: 0, weeklyIncome: 0, monthlyIncome: 0, appointments: 0 });

  // Calculate dynamic top performing staff
  const getTopBarber = () => {
    if (!dbData?.staff || dbData.staff.length === 0) return { name: "Marco Silva", count: 12 };
    const barbers = dbData.staff.filter(s => {
      const r = s.role?.toLowerCase() || '';
      return r.includes('barbero') || r.includes('barber');
    });
    if (barbers.length === 0) return { name: "Marco Silva", count: 12 };
    const sorted = [...barbers].sort((a, b) => (b.stats?.income || 0) - (a.stats?.income || 0));
    return {
      name: sorted[0]?.name || "Marco Silva",
      income: sorted[0]?.stats?.income || 0,
      count: sorted[0]?.stats?.appointments || 3
    };
  };

  const topBarber = getTopBarber();

  // Get first 3 active barbers for team overview
  const teamOverview = (dbData?.staff || [])
    .filter(s => {
      const r = s.role?.toLowerCase() || '';
      return (r.includes('barbero') || r.includes('barber')) && !r.includes('archived');
    })
    .sort((a, b) => (b.stats?.income || 0) - (a.stats?.income || 0))
    .slice(0, 3);

  // Top Clientes
  const topClients = (dbData?.clients || [])
    .sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0))
    .slice(0, 3);

  // SVG Chart Calculation (Custom Glowing Line Chart)
  const lineValues = chartData?.datasets?.[0]?.data || [240, 350, 200, 380, 480, 520, 600];
  const maxVal = Math.max(...lineValues) || 100;
  const chartHeight = 120;
  
  const points = lineValues.map((val, idx) => {
    const x = 20 + idx * 45;
    const y = 130 - (val / maxVal) * chartHeight;
    return { x, y, val };
  });

  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    return `${acc} C ${(prev.x + p.x) / 2} ${prev.y}, ${(prev.x + p.x) / 2} ${p.y}, ${p.x} ${p.y}`;
  }, '');

  const fillD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} 150 L ${points[0].x} 150 Z`
    : '';

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Birthday Stats
  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  const todaysBirthdays = (dbData?.clients || []).filter(c => {
    if (!c.birth_date) return false;
    const parts = c.birth_date.split('-');
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    return m === todayMonth && d === todayDay;
  });

  const upcomingBirthdays = (dbData?.clients || [])
    .filter(c => {
      if (!c.birth_date) return false;
      const parts = c.birth_date.split('-');
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      
      const bday = new Date(today.getFullYear(), m - 1, d);
      if (bday < today && !(m === todayMonth && d === todayDay)) {
        bday.setFullYear(today.getFullYear() + 1);
      }
      
      const diffTime = bday - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      c.daysToBday = diffDays;
      c.bdayDateStr = `${d} de ${bday.toLocaleDateString([], { month: 'long' })}`;
      
      return diffDays > 0 && diffDays <= 15;
    })
    .sort((a, b) => a.daysToBday - b.daysToBday)
    .slice(0, 3);

  return (
    <div className="mobile-dashboard animate-fade-in" style={{ paddingBottom: '100px', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Hello Greeting Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--gold-primary)', fontWeight: '900', letterSpacing: '1.5px', textTransform: 'uppercase' }}>BIENVENIDO A CASA</div>
          <div style={{ fontSize: '28px', fontWeight: '950', letterSpacing: '-1px', marginTop: '4px', color: '#ffffff' }}>
            Panel de <span className="text-gold">Control</span>
          </div>
        </div>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          border: '1.5px solid var(--gold-primary)',
          background: 'rgba(212,175,55,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--gold-primary)'
        }}>
          <Crown size={20} />
        </div>
      </div>

      {/* Main Hero Card (Quotes & Floating Chair - Identical to PC Dashboard) */}
      <div className="glass-card" style={{ 
        minHeight: '220px', 
        borderRadius: '28px', 
        padding: '24px 20px', 
        position: 'relative', 
        overflow: 'hidden',
        marginBottom: '24px',
        background: 'linear-gradient(135deg, rgba(20,20,20,0.9), rgba(10,10,10,0.6))',
        border: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div style={{ position: 'relative', zIndex: 5, maxWidth: '60%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ width: '12px', height: '2px', backgroundColor: 'var(--gold-primary)' }} />
            <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '1px', textTransform: 'uppercase' }}>PENSAMIENTO ASTRO</span>
            <button 
              onClick={() => setQuoteIndex((prev) => (prev + 1) % QUOTES.length)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
            >
              <Rocket size={12} color="var(--gold-primary)" />
            </button>
          </div>
          <h2 style={{ fontSize: '15px', fontWeight: '950', lineHeight: '1.3', marginBottom: '12px', color: 'white' }}>
            "{QUOTES[quoteIndex].text}"
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '700' }}>
            — {QUOTES[quoteIndex].creator}
          </p>
        </div>

        {/* Floating Barber Chair Animation */}
        <div style={{ 
          position: 'absolute', 
          right: '-10px', 
          bottom: '-10px', 
          width: '45%', 
          height: '100%',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          zIndex: 2,
          pointerEvents: 'none'
        }}>
          <img 
            src="/barber-chair.png" 
            alt="Astro Chair" 
            style={{ 
              width: '100%', 
              height: 'auto',
              maxHeight: '90%',
              objectFit: 'contain',
              filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.8)) drop-shadow(0 0 15px rgba(212, 175, 55, 0.25))',
              animation: 'float 6s infinite ease-in-out'
            }} 
          />
        </div>
      </div>

      {/* SIC PARVIS MAGNA Card */}
      <div className="glass-card" style={{ 
        marginBottom: '24px', 
        padding: '16px', 
        textAlign: 'center',
        border: '1px solid rgba(212, 175, 55, 0.2)',
        borderRadius: '20px',
        backgroundColor: 'rgba(255,255,255,0.01)'
      }}>
        <div style={{ fontSize: '10px', color: 'var(--gold-primary)', fontWeight: '900', letterSpacing: '4px', marginBottom: '4px' }}>"SIC PARVIS MAGNA"</div>
        <div style={{ fontSize: '12px', fontWeight: '900', color: '#ffffff' }}>LA GRANDEZA NACE DE PEQUEÑOS COMIENZOS</div>
      </div>

      {/* Business Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}>
        <div className="glass-card" style={{ padding: '12px 8px', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.03)' }}>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '4px' }}>PRODUCCIÓN</div>
          <div style={{ fontSize: '15px', fontWeight: '950', color: 'var(--gold-primary)' }}>${formatCurrency(myStats.income)}</div>
        </div>
        <div className="glass-card" style={{ padding: '12px 8px', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.03)' }}>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '4px' }}>{isAssistant ? 'LAVADOS' : 'CITAS'}</div>
          <div style={{ fontSize: '15px', fontWeight: '950', color: 'white' }}>{myStats.appointments}</div>
        </div>
        <div className="glass-card" style={{ padding: '12px 8px', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.03)' }}>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '4px' }}>CLIENTES</div>
          <div style={{ fontSize: '15px', fontWeight: '950', color: 'white' }}>{stats.clients}</div>
        </div>
      </div>

      {/* Admin Goals Meters Widget (Identical to PC Goals Module) */}
      {isAdmin && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          {[
            { id: 'daily', title: 'Misión Diaria', current: stats?.income || 0, goal: goals.daily, label: 'HOY' },
            { id: 'weekly', title: 'Meta Semanal', current: stats?.weeklyIncome || 0, goal: goals.weekly, label: '7 DÍAS' },
            { id: 'monthly', title: 'Objetivo Mensual', current: stats?.monthlyIncome || 0, goal: goals.monthly, label: '30 DÍAS' }
          ].map((m, i) => (
            <div key={m.id} className="glass-card" style={{ padding: '18px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target size={14} color="var(--gold-primary)" />
                  <span style={{ fontWeight: '900', fontSize: '11px', letterSpacing: '0.5px', textTransform: 'uppercase', color: 'white' }}>{m.title}</span>
                </div>
                {i === 0 && (
                  <button 
                    onClick={() => setIsEditingGoals(true)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                  >
                    <Edit3 size={12} />
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                <div style={{ fontSize: '18px', fontWeight: '900', color: 'white' }}>
                  ${formatCurrency(m.current || 0)} <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>/ ${formatCurrency(m.goal)}</span>
                </div>
                <div style={{ fontSize: '9px', fontWeight: '900', color: 'var(--gold-primary)', backgroundColor: 'rgba(212,175,55,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                  {Math.min(Math.round(((m.current || 0) / m.goal) * 100), 100)}%
                </div>
              </div>

              <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
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

      {/* Team Production Overview Ranking */}
      {isAdmin && (
        <div className="glass-card" style={{ padding: '20px', borderRadius: '24px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontWeight: '900', fontSize: '13px', color: '#ffffff', marginBottom: '16px', letterSpacing: '-0.3px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={14} color="var(--gold-primary)" /> TOP BARBEROS (ÚLTIMOS 30 DÍAS)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {teamOverview.map((st, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: idx !== teamOverview.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '950', color: 'var(--gold-primary)', width: '16px' }}>{idx+1}.</span>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff' }}>{st.name}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '13px', fontWeight: '900', color: 'var(--gold-primary)' }}>${formatCurrency(st.stats?.monthlyIncome || 0)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Customers Overview Ranking (Ported from PC Dashboard) */}
      {isAdmin && (
        <div className="glass-card" style={{ padding: '20px', borderRadius: '24px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontWeight: '900', fontSize: '13px', color: '#ffffff', marginBottom: '16px', letterSpacing: '-0.3px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={14} color="var(--gold-primary)" /> TOP CLIENTES (TOTAL CONSUMIDO)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topClients.map((c, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: idx !== topClients.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }} onClick={() => onNavigate && onNavigate('clients', { clientId: c.id })}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <span style={{ fontSize: '11px', fontWeight: '950', color: 'var(--gold-primary)', width: '16px' }}>{idx+1}.</span>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: 'white', textDecoration: 'underline' }}>{c.name}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '13px', fontWeight: '900', color: '#32d74b' }}>${formatCurrency(c.total_spent || 0)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Birthdays Section (Ported from PC Dashboard) */}
      {isAdmin && (
        <div className="glass-card" style={{ padding: '20px', borderRadius: '24px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Cake size={16} color="var(--gold-primary)" />
            <h3 style={{ fontSize: '14px', fontWeight: '900', color: '#ffffff' }}>CUMPLEAÑOS DE CLIENTES</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Today */}
            <div>
              <div style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', backgroundColor: todaysBirthdays.length > 0 ? '#4caf50' : 'rgba(255,255,255,0.1)' }}></span>
                CUMPLEN HOY
              </div>
              {todaysBirthdays.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '6px 10px', backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: '8px' }}>
                  Ningún cliente cumple años hoy.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {todaysBirthdays.map(c => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '10px', cursor: 'pointer' }} onClick={() => onNavigate && onNavigate('clients', { clientId: c.id })}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Gift size={14} color="var(--gold-primary)" />
                        <span style={{ fontWeight: '800', color: 'white', fontSize: '12px', textDecoration: 'underline' }}>{c.name}</span>
                      </div>
                      <span style={{ fontSize: '9px', fontWeight: '900', color: 'var(--gold-primary)', backgroundColor: 'rgba(212,175,55,0.1)', padding: '1px 6px', borderRadius: '3px' }}>¡FELICIDADES!</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming */}
            <div>
              <div style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px' }}>
                PRÓXIMOS 15 DÍAS
              </div>
              {upcomingBirthdays.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '6px 10px', backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: '8px' }}>
                  Sin cumpleaños próximos.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {upcomingBirthdays.map(c => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '10px', cursor: 'pointer' }} onClick={() => onNavigate && onNavigate('clients', { clientId: c.id })}>
                      <span style={{ fontWeight: '700', color: 'var(--text-secondary)', fontSize: '12px' }}>{c.name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--gold-primary)', fontWeight: '800' }}>{c.bdayDateStr} <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '600' }}>(en {c.daysToBday}d)</span></span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Analytics Chart Section (Custom SVG Looker Studio Style) */}
      <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.04)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontWeight: '900', fontSize: '15px', color: '#ffffff', letterSpacing: '-0.3px', fontStyle: 'italic' }}>Tendencia de Ventas</div>
          <div style={{ fontSize: '10px', color: 'var(--gold-primary)', fontWeight: '900', backgroundColor: 'rgba(212, 175, 55, 0.1)', padding: '4px 10px', borderRadius: '8px' }}>DIARIA</div>
        </div>
        
        {/* Glow Line Chart in pure SVG */}
        <div style={{ height: '160px', width: '100%', position: 'relative' }}>
          <svg width="100%" height="150" viewBox="0 0 320 150" style={{ overflow: 'visible' }}>
            {/* Grid Lines */}
            {[30, 60, 90, 120].map((gY, gi) => (
              <line key={gi} x1="20" y1={gY} x2="300" y2={gY} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            ))}

            {/* Glowing path area */}
            {fillD && (
              <path d={fillD} fill="url(#mobileGoldGrad)" opacity="0.1" />
            )}

            {/* Curved Path */}
            {pathD && (
              <path d={pathD} fill="none" stroke="var(--gold-primary)" strokeWidth="2.5" strokeLinecap="round" />
            )}

            {/* Points & Tags */}
            {points.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="4" fill="var(--gold-primary)" stroke="#121212" strokeWidth="1.5" />
                
                {/* Micro Label Pill */}
                {i % 2 === 0 && (
                  <g transform={`translate(${p.x}, ${p.y - 14})`}>
                    <rect x="-16" y="-6" width="32" height="12" rx="2" fill="#ffffff" />
                    <text x="0" y="3" fill="#000000" fontSize="8" fontWeight="950" textAnchor="middle">
                      ${Math.round(p.val)}
                    </text>
                  </g>
                )}

                {/* X Axis tick labels */}
                {i < 7 && chartData?.labels?.[i] && (
                  <text x={p.x} y="145" fill="#8c8c8c" fontSize="8" fontWeight="800" textAnchor="middle">
                    {chartData.labels[i]}
                  </text>
                )}
              </g>
            ))}

            <defs>
              <linearGradient id="mobileGoldGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--gold-primary)" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Goal Edit Modal */}
      {isEditingGoals && (
        <div className="modal-overlay animate-fade-in" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, backdropFilter: 'blur(10px)', padding: '20px'
        }}>
          <div className="glass-card animate-scale-in" style={{ width: '100%', maxWidth: '360px', padding: '30px', borderRadius: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Target color="var(--gold-primary)" size={18} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '900', color: 'white' }}>Metas <span className="text-gold">Astro</span></h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '1px' }}>META DIARIA ($)</label>
                <input 
                  type="number" 
                  value={goals.daily} 
                  onChange={e => setGoals({...goals, daily: e.target.value})}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '14px', fontWeight: '700', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '1px' }}>META SEMANAL ($)</label>
                <input 
                  type="number" 
                  value={goals.weekly} 
                  onChange={e => setGoals({...goals, weekly: e.target.value})}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '14px', fontWeight: '700', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '1px' }}>META MENSUAL ($)</label>
                <input 
                  type="number" 
                  value={goals.monthly} 
                  onChange={e => setGoals({...goals, monthly: e.target.value})}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '14px', fontWeight: '700', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setIsEditingGoals(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', fontWeight: '700' }}>Cancelar</button>
              <button onClick={() => handleSaveGoals(goals)} className="btn-gold" style={{ flex: 1.5, padding: '12px', borderRadius: '10px', fontWeight: '800' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(3deg); }
        }
        .mobile-dashboard::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default MobileDashboard;
