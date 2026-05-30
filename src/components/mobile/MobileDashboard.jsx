import React from 'react';
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
  ArrowUpRight
} from 'lucide-react';

const MobileDashboard = ({ onOpenSale, stats, chartData, dbData }) => {
  
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
    .slice(0, 3);

  // SVG Chart Calculation (Custom Glowing Line Chart)
  const lineValues = chartData?.datasets?.[0]?.data || [240, 350, 200, 380, 480, 520, 600];
  const maxVal = Math.max(...lineValues) || 100;
  const chartHeight = 120;
  const chartWidth = 320;
  
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

      {/* SIC PARVIS MAGNA - Brand Quote (Premium Metallic Glassmorphism) */}
      <div className="glass-card" style={{ 
        marginBottom: '24px', 
        padding: '20px', 
        textAlign: 'center',
        border: '1px solid rgba(212, 175, 55, 0.25)',
        background: 'linear-gradient(135deg, rgba(20,20,20,0.8), rgba(10,10,10,0.5))',
        borderRadius: '24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-20px',
          left: '-20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'rgba(212,175,55,0.03)',
          filter: 'blur(10px)'
        }}></div>
        <div style={{ fontSize: '11px', color: 'var(--gold-primary)', fontWeight: '900', letterSpacing: '5px', marginBottom: '6px' }}>"SIC PARVIS MAGNA"</div>
        <div style={{ fontSize: '13px', fontWeight: '900', color: '#ffffff', letterSpacing: '0.5px' }}>LA GRANDEZA NACE DE PEQUEÑOS COMIENZOS</div>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '6px', fontStyle: 'italic', letterSpacing: '0.5px' }}>— SIR FRANCIS DRAKE</div>
      </div>

      {/* Smart Insights Pills (Looker Studio Inspired Metrics) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
        <div style={{ 
          backgroundColor: 'rgba(212, 175, 55, 0.04)', 
          padding: '16px', 
          borderRadius: '20px', 
          border: '1px solid rgba(212, 175, 55, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--gold-primary)' }}>
            <Trophy size={14} />
            <span style={{ fontSize: '9px', fontWeight: '900', letterSpacing: '0.8px' }}>LÍDER DE HOY</span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: '900', color: '#ffffff' }}>{topBarber.name}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>{topBarber.count} serv. realizados</div>
        </div>
        
        <div style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.02)', 
          padding: '16px', 
          borderRadius: '20px', 
          border: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
            <TrendingUp size={14} />
            <span style={{ fontSize: '9px', fontWeight: '900', letterSpacing: '0.8px' }}>SERVICIOS TOP</span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: '900', color: '#ffffff' }}>Corte & Barba</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>Tendencia semanal</div>
        </div>
      </div>

      {/* Main Feature Card (Balance General) */}
      <div className="animate-slide-up" style={{
        background: 'var(--gold-gradient)',
        borderRadius: '28px',
        padding: '24px 20px',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(212, 175, 55, 0.2)'
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.5)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Ingreso Neto Acumulado</div>
          <div style={{ fontSize: '38px', fontWeight: '950', color: '#000000', marginTop: '6px', letterSpacing: '-1.5px' }}>
            ${formatCurrency(stats.income - stats.expenses)}
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
            <div style={{ backgroundColor: 'rgba(0,0,0,0.06)', padding: '10px 14px', borderRadius: '14px', flex: 1, backdropFilter: 'blur(5px)' }}>
              <div style={{ fontSize: '9px', color: 'rgba(0,0,0,0.4)', fontWeight: '900' }}>+ INGRESOS</div>
              <div style={{ fontSize: '16px', fontWeight: '950', color: '#000000' }}>${formatCurrency(stats.income)}</div>
            </div>
            <div style={{ backgroundColor: 'rgba(0,0,0,0.06)', padding: '10px 14px', borderRadius: '14px', flex: 1, backdropFilter: 'blur(5px)' }}>
              <div style={{ fontSize: '9px', color: 'rgba(0,0,0,0.4)', fontWeight: '900' }}>- GASTOS</div>
              <div style={{ fontSize: '16px', fontWeight: '950', color: '#000000' }}>${formatCurrency(stats.expenses)}</div>
            </div>
          </div>
        </div>
        <div style={{
          position: 'absolute',
          top: '-30px',
          right: '-30px',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          zIndex: 0
        }}></div>
      </div>

      {/* Secondary Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
        <div className="glass-card" style={{ padding: '18px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gold-primary)', marginBottom: '12px' }}>
            <div style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', padding: '6px', borderRadius: '8px' }}><Zap size={14} /></div>
            <span style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '0.5px' }}>CITAS HOY</span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: '#ffffff' }}>{stats.appointments}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: '700' }}>En agenda</div>
        </div>
        
        <div className="glass-card" style={{ padding: '18px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gold-primary)', marginBottom: '12px' }}>
            <div style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', padding: '6px', borderRadius: '8px' }}><Users size={14} /></div>
            <span style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '0.5px' }}>CLIENTES</span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: '#ffffff' }}>{stats.clients}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: '700' }}>Registrados</div>
        </div>
      </div>

      {/* Team Production Overview (New and Highly Premium) */}
      <div className="glass-card" style={{ padding: '20px', borderRadius: '24px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ fontWeight: '900', fontSize: '15px', color: '#ffffff', marginBottom: '16px', letterSpacing: '-0.3px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Crown size={16} color="var(--gold-primary)" /> RENDIMIENTO DEL EQUIPO
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {teamOverview.map((st, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: idx !== teamOverview.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: '950', color: 'var(--gold-primary)', width: '16px' }}>{idx+1}.</span>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff' }}>{st.name}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '13px', fontWeight: '900', color: '#32d74b' }}>${formatCurrency(st.stats?.income || 0)}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', fontWeight: '600' }}>{st.stats?.appointments || 0} citas</span>
              </div>
            </div>
          ))}
          {teamOverview.length === 0 && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>No hay barberos registrados.</span>
          )}
        </div>
      </div>

      {/* Analytics Chart Section (Custom SVG Looker Studio Style) */}
      <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.04)' }}>
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

    </div>
  );
};

export default MobileDashboard;
