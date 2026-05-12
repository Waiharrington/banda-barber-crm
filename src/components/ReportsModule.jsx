import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Users, 
  Scissors, 
  TrendingUp, 
  Download,
  Filter,
  Clock,
  ChevronDown
} from 'lucide-react';
import { dataService } from '../services/dataService';

const ReportsModule = ({ isMobile, rates, staff = [] }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('all'); // 'today', 'week', 'month', 'all'
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await dataService.getTransactions();
      setTransactions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (dateRange === 'all') return true;
    const now = new Date();
    const tDate = new Date(t.created_at);
    if (dateRange === 'today') {
      return tDate.toDateString() === now.toDateString();
    }
    if (dateRange === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      return tDate >= weekAgo;
    }
    if (dateRange === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(now.getMonth() - 1);
      return tDate >= monthAgo;
    }
    return true;
  });

  // 1. SERVICIOS Y CANTIDAD
  const serviceStats = (() => {
    const stats = {};
    filteredTransactions.forEach(t => {
      if (t.type !== 'income') return;
      
      let serviceName = t.metadata?.serviceName;
      if (!serviceName) {
        const parts = t.description.split(' - ');
        // If it's VENTA FINAL - Cliente: Name - Servi: Service
        if (parts.length >= 3 && parts[2].includes('Servi:')) {
          serviceName = parts[2].replace('Servi: ', '');
        } else {
          serviceName = 'Venta Directa/Otros';
        }
      }
      
      stats[serviceName] = (stats[serviceName] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  })();

  // 2. BARBERO | TOTAL SERVICIOS | INGRESOS BS
  const barberStats = (() => {
    const stats = {};
    filteredTransactions.forEach(t => {
      if (t.type !== 'income') return;
      const staffInvolved = t.metadata?.staffInvolved || [];
      
      staffInvolved.forEach(s => {
        // Only count if they are Barbero
        if (!s.role?.toLowerCase().includes('barbero')) return;
        
        if (!stats[s.staffId]) {
          stats[s.staffId] = { name: s.name, totalServices: 0, totalIncomeBs: 0, totalLavados: 0 };
        }
        stats[s.staffId].totalServices += 1;
        
        // Income in Bs
        const bsAmount = t.amount * (t.exchange_rate || rates?.usd || 550);
        stats[s.staffId].totalIncomeBs += bsAmount;

        // Si la transacción general tiene didWash, se le suma al barbero
        if (t.metadata?.didWash) {
          stats[s.staffId].totalLavados += 1;
        }
      });
    });
    return Object.values(stats).sort((a, b) => b.totalIncomeBs - a.totalIncomeBs);
  })();

  // 3. DÍA DE LA SEMANA
  const dayStats = (() => {
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const stats = {};
    filteredTransactions.forEach(t => {
      if (t.type !== 'income') return;
      const day = days[new Date(t.created_at).getDay()];
      stats[day] = (stats[day] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  })();

  // 4. HORA DEL DÍA
  const hourStats = (() => {
    const stats = {};
    filteredTransactions.forEach(t => {
      if (t.type !== 'income') return;
      const hour = new Date(t.created_at).getHours();
      stats[hour] = (stats[hour] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => Number(a[0]) - Number(b[0]));
  })();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gold-primary)' }}>Generando reportes de alta fidelidad...</div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: isMobile ? '80px' : '0' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: isMobile ? '20px' : '0',
        marginBottom: '40px'
      }}>
        <div>
          <h2 style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '800', letterSpacing: '-0.5px' }}>
            Centro de <span className="text-gold">Analítica</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Auditoría y rendimiento operativo.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-color)',
                color: 'white',
                padding: '10px 40px 10px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600',
                appearance: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="today">Hoy</option>
              <option value="week">Esta Semana</option>
              <option value="month">Este Mes</option>
              <option value="all">Histórico Total</option>
            </select>
            <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
          </div>
          
          <button style={{ 
            backgroundColor: 'var(--bg-tertiary)', 
            border: '1px solid var(--border-color)', 
            color: 'white', 
            padding: '0 16px', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            <Download size={16} /> PDF
          </button>
        </div>
      </div>

      {/* Main Grid Section */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '24px', marginBottom: '40px' }}>
        
        {/* SERVICIOS Y CANTIDAD */}
        <div className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <TrendingUp size={18} color="var(--gold-primary)" />
            <h3 style={{ fontSize: '14px', fontWeight: '900', letterSpacing: '1px' }}>SERVICIOS MÁS SOLICITADOS</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {serviceStats.map(([name, count]) => (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)' }}>{name}</span>
                <span style={{ fontSize: '13px', fontWeight: '900', color: 'white' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* BARBERO | TOTAL SERVICIOS */}
        <div className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Scissors size={18} color="var(--gold-primary)" />
            <h3 style={{ fontSize: '14px', fontWeight: '900', letterSpacing: '1px' }}>VOLUMEN POR BARBERO</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {barberStats.map(b => (
              <div key={b.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)' }}>{b.name}</span>
                <span style={{ fontSize: '13px', fontWeight: '900', color: 'white' }}>{b.totalServices}</span>
              </div>
            ))}
          </div>
        </div>

        {/* BARBERO | INGRESOS TOTALES BS */}
        <div className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <BarChart3 size={18} color="var(--gold-primary)" />
            <h3 style={{ fontSize: '14px', fontWeight: '900', letterSpacing: '1px' }}>INGRESOS TOTALES (BS)</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {barberStats.map(b => (
              <div key={b.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: 'rgba(212,175,55,0.05)', borderRadius: '12px', border: '1px solid rgba(212,175,55,0.1)' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)' }}>{b.name}</span>
                <span style={{ fontSize: '13px', fontWeight: '900', color: 'var(--gold-primary)' }}>{formatCurrency(b.totalIncomeBs)} Bs.</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '24px' }}>
        
        {/* BARBERO | RATIO LAVADOS */}
        <div className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <TrendingUp size={18} color="#32d74b" />
            <h3 style={{ fontSize: '14px', fontWeight: '900', letterSpacing: '1px' }}>TOTAL LAVADOS Y RATIO</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {barberStats.map(b => {
              const ratio = b.totalServices > 0 ? (b.totalLavados / b.totalServices) * 100 : 0;
              return (
                <div key={b.name} style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '800' }}>{b.name}</span>
                    <span style={{ fontSize: '13px', fontWeight: '900', color: '#32d74b' }}>{b.totalLavados} Lav.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ flex: 1, height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${ratio}%`, height: '100%', backgroundColor: '#32d74b' }}></div>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)' }}>{ratio.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* DÍA DE LA SEMANA | TOTAL CLIENTES */}
        <div className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Calendar size={18} color="var(--gold-primary)" />
            <h3 style={{ fontSize: '14px', fontWeight: '900', letterSpacing: '1px' }}>FLUJO POR DÍA</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {dayStats.map(([day, count]) => (
              <div key={day} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{day}</span>
                <span style={{ fontSize: '13px', fontWeight: '900', color: 'white' }}>{count} Clientes</span>
              </div>
            ))}
          </div>
        </div>

        {/* HORA | CANTIDAD DE CLIENTES */}
        <div className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Clock size={18} color="var(--gold-primary)" />
            <h3 style={{ fontSize: '14px', fontWeight: '900', letterSpacing: '1px' }}>HISTOGRAMA HORARIO</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {hourStats.map(([hour, count]) => {
              const maxCount = Math.max(...hourStats.map(s => s[1]));
              const barWidth = (count / maxCount) * 100;
              return (
                <div key={hour} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', width: '30px' }}>{hour}:00</span>
                  <div style={{ flex: 1, height: '12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ width: `${barWidth}%`, height: '100%', background: 'var(--gold-gradient)', borderRadius: '4px' }}></div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '900', color: 'white', width: '20px', textAlign: 'right' }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};

export default ReportsModule;
