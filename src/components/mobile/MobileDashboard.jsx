import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Rocket,
  Bell,
  X,
  MessageCircle,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';
import { dataService } from '../../services/dataService';
import { useNotifs } from '../../context/NotificationContext';
import { useScrollLock } from '../../hooks/useScrollLock';

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

const MobileDashboard = ({ onOpenSale, stats, chartData, dbData, onNavigate, onOpenNotifications }) => {
  const { user } = useAuth();
  const { showToast } = useNotifs();
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [goals, setGoals] = useState({
    daily: parseFloat(localStorage.getItem('astro_daily_goal') || '500'),
    weekly: parseFloat(localStorage.getItem('astro_weekly_goal') || '3000'),
    monthly: parseFloat(localStorage.getItem('astro_monthly_goal') || '12000')
  });

  const [whatsappModalData, setWhatsappModalData] = useState(null);
  const [editedPhone, setEditedPhone] = useState('');
  const [editedMessage, setEditedMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useScrollLock(whatsappModalData !== null || isEditingGoals);

  useEffect(() => {
    setQuoteIndex(Math.floor(Math.random() * QUOTES.length));

    const updateUnread = () => {
      const history = notificationService.getHistory();
      const count = history.filter(n => !n.read).length;
      setUnreadCount(count);
    };

    updateUnread();
    window.addEventListener('astro_new_notification', updateUnread);
    return () => window.removeEventListener('astro_new_notification', updateUnread);
  }, []);

  const handleSaveGoals = (newGoals) => {
    localStorage.setItem('astro_daily_goal', newGoals.daily);
    localStorage.setItem('astro_weekly_goal', newGoals.weekly);
    localStorage.setItem('astro_monthly_goal', newGoals.monthly);
    setGoals(newGoals);
    setIsEditingGoals(false);
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

  // Get first 3 active barbers for team overview (monthly income podium)
  const teamOverview = (dbData?.staff || [])
    .filter(s => {
      const r = s.role?.toLowerCase() || '';
      return (r.includes('barbero') || r.includes('barber')) && !r.includes('archived');
    })
    .sort((a, b) => (b.stats?.monthlyIncome || 0) - (a.stats?.monthlyIncome || 0))
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
    <div className="mobile-dashboard animate-fade-in" style={{ paddingBottom: '100px', fontFamily: "'Inter', sans-serif", overflowX: 'hidden', position: 'relative' }}>
      
      {/* Hello Greeting Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--gold-primary)', fontWeight: '900', letterSpacing: '1.5px', textTransform: 'uppercase' }}>BIENVENIDO A CASA</div>
          <div style={{ fontSize: '28px', fontWeight: '950', letterSpacing: '-1px', marginTop: '4px', color: '#ffffff' }}>
            Panel de <span className="text-gold">Control</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Notification Bell */}
          <button
            onClick={onOpenNotifications}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              border: '1.5px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: unreadCount > 0 ? 'var(--gold-primary)' : 'white',
              position: 'relative',
              cursor: 'pointer',
              outline: 'none',
              padding: 0
            }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <div style={{
                position: 'absolute',
                top: '0px',
                right: '0px',
                backgroundColor: '#ff4d4d',
                color: 'white',
                fontSize: '8px',
                fontWeight: '900',
                borderRadius: '50%',
                minWidth: '13px',
                height: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 2px',
                border: '1.5px solid var(--bg-primary)'
              }}>
                {unreadCount}
              </div>
            )}
          </button>

          {/* Crown */}
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
      </div>

      {/* Main Hero Card (Quotes & Floating Chair - Identical to PC Dashboard) */}
      <div className="glass-card" style={{ 
        minHeight: '220px', 
        borderRadius: '28px', 
        padding: '24px 20px', 
        position: 'relative', 
        overflow: 'visible',
        marginBottom: '24px',
        background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(42, 34, 15, 0.65) 100%)',
        border: '1px solid rgba(212, 175, 55, 0.35)',
        boxShadow: '0 16px 45px rgba(0, 0, 0, 0.75), inset 0 0 35px rgba(212, 175, 55, 0.08)',
        transition: 'all 0.3s ease'
      }}>
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '60%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ width: '12px', height: '2px', backgroundColor: 'var(--gold-primary)' }} />
            <span style={{ fontSize: '10px', fontWeight: '950', color: 'var(--gold-primary)', letterSpacing: '1px', textTransform: 'uppercase' }}>PENSAMIENTO ASTRO</span>
            <button 
              onClick={() => setQuoteIndex((prev) => (prev + 1) % QUOTES.length)}
              style={{ 
                background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%',
                transition: 'transform 0.2s ease, background-color 0.2s ease'
              }}
              title="Descubrir otro Pensamiento Astro"
            >
              <Rocket size={12} color="var(--gold-primary)" className="animate-pulse" />
            </button>
          </div>
          <h2 style={{ 
            fontSize: '17px', 
            fontWeight: '700', 
            lineHeight: '1.35', 
            marginBottom: '12px', 
            color: 'white',
            fontFamily: "'Georgia', serif",
            fontStyle: 'italic',
            textShadow: '0 2px 12px rgba(0,0,0,0.6)',
            textWrap: 'pretty'
          }}>
            “{QUOTES[quoteIndex].text}”
          </h2>
          <p style={{ color: 'var(--gold-primary)', fontSize: '11px', fontWeight: '800', opacity: 0.9, letterSpacing: '0.5px' }}>
            — {QUOTES[quoteIndex].creator}
          </p>
        </div>

        {/* Visual Elements (Floating Chair - Identical to PC Dashboard) */}
        <div className="chair-entrance" style={{ 
          position: 'absolute', 
          right: '-10px', 
          bottom: '-10px', 
          width: '45%', 
          height: '110%',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          zIndex: 10,
          pointerEvents: 'none'
        }}>
          {/* Soft Golden Glow behind the chair */}
          <div style={{
            position: 'absolute',
            top: '45%',
            left: '42%',
            transform: 'translate(-50%, -50%)',
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(212, 175, 55, 0.14) 0%, rgba(212, 175, 55, 0.05) 35%, rgba(212, 175, 55, 0.01) 65%, transparent 100%)',
            zIndex: 2,
            pointerEvents: 'none'
          }} />
          <div className="chair-shadow" style={{ 
            position: 'absolute', 
            bottom: '8px', 
            left: '42%', 
            transform: 'translateX(-50%)', 
            width: '80px', 
            height: '16px', 
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
              height: 'auto',
              maxHeight: '115%',
              objectFit: 'contain',
              zIndex: 3,
              filter: 'drop-shadow(0 10px 25px rgba(0,0,0,0.7)) drop-shadow(0 0 15px rgba(212, 175, 55, 0.3))',
              animation: 'float 8s infinite ease-in-out'
            }} 
          />
        </div>
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

      {/* Visual Podium Section for Top Barbers (Identical to Desktop) */}
      {isAdmin && teamOverview.length >= 2 && (
        <PodiumWidget 
          title="Top Barberos" 
          icon={<Trophy size={16} />}
          data={teamOverview}
          labelKey="name"
          scoreKey={(item) => `$${(item.stats?.monthlyIncome || 0).toFixed(0)}`}
          scoreLabel="ÚLTIMOS 30 DÍAS"
        />
      )}

      {/* Visual Podium Section for Top Clients (Identical to Desktop) */}
      {isAdmin && topClients.length >= 2 && (
        <PodiumWidget 
          title="Top Clientes" 
          icon={<Users size={16} />}
          data={topClients}
          labelKey="name"
          scoreKey={(item) => `$${(item.total_spent || 0).toFixed(0)}`}
          scoreLabel="TOTAL CONSUMIDO"
          isClient={true}
          onNavigate={onNavigate}
        />
      )}

      {/* Fallback list if podium data is too fresh */}
      {isAdmin && teamOverview.length < 2 && (
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {todaysBirthdays.map(c => (
                    <div 
                      key={c.id} 
                      style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap',
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '10px 12px', 
                        backgroundColor: 'rgba(212,175,55,0.08)', 
                        border: '1px solid rgba(212,175,55,0.2)', 
                        borderRadius: '12px',
                        gap: '8px 10px'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '100px', flex: '1 1 0%' }}>
                        <span 
                          style={{ fontWeight: '800', color: 'white', fontSize: '13px', textDecoration: 'underline', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} 
                          onClick={() => onNavigate && onNavigate('clients', { clientId: c.id })}
                        >
                          {c.name}
                        </span>
                        <span style={{ alignSelf: 'flex-start', fontSize: '8px', fontWeight: '900', color: 'var(--gold-primary)', backgroundColor: 'rgba(212,175,55,0.1)', padding: '1px 4px', borderRadius: '3px' }}>
                          CLIENTE
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', flexShrink: 0, flexGrow: 1, justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => handleWhatsAppCongratulate(c)}
                          style={{ 
                            padding: '6px 12px', 
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
                          <MessageCircle size={12} fill="black" /> Felicitar
                        </button>
                      </div>
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
      {/* WhatsApp Message Customization Modal Portal */}
      {whatsappModalData && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(10px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-card" style={{
            width: '100%',
            maxWidth: '380px',
            background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.95) 0%, rgba(10, 10, 10, 0.98) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.25)',
            borderRadius: '24px',
            padding: '20px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(212, 175, 55, 0.05)',
            position: 'relative'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageCircle size={18} color="var(--gold-primary)" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '900', color: 'white' }}>
                  Felicitar a {whatsappModalData.name}
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
                <X size={14} />
              </button>
            </div>

            {/* Description */}
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4', margin: '0 0 14px 0' }}>
              Personaliza el mensaje y el número. Al editar el teléfono, se guardará en la base de datos automáticamente.
            </p>

            {/* Phone Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
              <label style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Número de Teléfono
              </label>
              <input 
                type="text" 
                value={editedPhone} 
                onChange={(e) => setEditedPhone(e.target.value)}
                placeholder="Ej: +584121234567"
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: '600',
                  outline: 'none',
                }}
              />
            </div>

            {/* Message Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '18px' }}>
              <label style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Mensaje de Felicitación
              </label>
              <textarea 
                value={editedMessage} 
                onChange={(e) => setEditedMessage(e.target.value)}
                rows={5}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: '600',
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: '110px',
                  lineHeight: '1.4'
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button 
                onClick={() => handleSendWhatsApp(true)}
                disabled={isSaving || !editedPhone}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  backgroundColor: editedPhone ? '#25d366' : 'rgba(255,255,255,0.05)',
                  color: editedPhone ? 'black' : 'var(--text-muted)',
                  fontWeight: '850',
                  fontSize: '12px',
                  border: 'none',
                  cursor: (isSaving || !editedPhone) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: editedPhone ? '0 4px 12px rgba(37, 211, 102, 0.25)' : 'none',
                }}
              >
                <MessageCircle size={14} />
                {isSaving ? 'Guardando...' : 'Enviar al Número Registrado'}
              </button>

              <button 
                onClick={() => handleSendWhatsApp(false)}
                disabled={isSaving}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '12px',
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
                  padding: '10px',
                  borderRadius: '10px',
                  backgroundColor: 'transparent',
                  color: 'var(--text-muted)',
                  fontWeight: '600',
                  fontSize: '12px',
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

// Premium visual podium component cloned and scaled for Mobile Screens
const PodiumWidget = ({ title, icon, data, labelKey, scoreKey, scoreLabel, isClient, onNavigate }) => {
  const podiumOrder = [data[1], data[0], data[2]].filter(Boolean);

  return (
    <div className="glass-card" style={{ padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.04)', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <h3 style={{ fontSize: '14px', fontWeight: '900', color: 'white' }}>{title.split(' ')[0]} <span className="text-gold">{title.split(' ')[1]}</span></h3>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '8px', minHeight: '140px' }}>
        {podiumOrder.map((item, idx) => {
          const originalIdx = data.indexOf(item);
          const isFirst = originalIdx === 0;
          const isSecond = originalIdx === 1;
          const isThird = originalIdx === 2;

          return (
            <div key={item.id || idx} style={{ 
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
                  border: isFirst ? '2.5px solid var(--gold-primary)' : '1.5px solid rgba(255,255,255,0.1)',
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
                {isFirst && <Crown size={16} color="var(--gold-primary)" fill="var(--gold-primary)" style={{ position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)' }} />}
                <div style={{ 
                  position: 'absolute', 
                  bottom: '-6px', 
                  left: '50%', 
                  transform: 'translateX(-50%)',
                  width: '18px', 
                  height: '18px', 
                  borderRadius: '50%', 
                  backgroundColor: isFirst ? 'var(--gold-primary)' : isSecond ? '#C0C0C0' : '#CD7F32',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '9px', 
                  fontWeight: '900', 
                  color: 'black'
                }}>
                  {originalIdx + 1}
                </div>
              </div>

              <div 
                style={{ textAlign: 'center', marginTop: '8px', cursor: isClient ? 'pointer' : 'default', width: '100%' }}
                onClick={() => isClient && onNavigate && onNavigate('clients', { clientId: item.id })}
              >
                <div style={{ 
                  fontWeight: '850', 
                  fontSize: isFirst ? '11px' : '10px', 
                  whiteSpace: 'nowrap', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis',
                  color: isClient ? 'var(--gold-primary)' : 'white',
                  textDecoration: isClient ? 'underline' : 'none',
                  textUnderlineOffset: '2px',
                  maxWidth: '75px',
                  margin: '0 auto'
                }}>
                  {item[labelKey].split(' ')[0]}
                </div>
                <div style={{ color: 'var(--gold-primary)', fontWeight: '950', fontSize: '12px', marginTop: '2px' }}>{scoreKey(item)}</div>
                <div style={{ fontSize: '7px', fontWeight: '800', opacity: 0.4, letterSpacing: '0.3px', textTransform: 'uppercase' }}>{scoreLabel}</div>
                
                {/* Visual Podium Base */}
                <div style={{ 
                  width: '100%', 
                  height: isFirst ? '40px' : isSecond ? '25px' : '15px', 
                  background: 'linear-gradient(to top, rgba(212, 175, 55, 0.25), rgba(212, 175, 55, 0.08))',
                  borderRadius: '6px 6px 0 0',
                  marginTop: '8px',
                  border: '1px solid rgba(212, 175, 55, 0.25)',
                  borderBottom: 'none'
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MobileDashboard;
