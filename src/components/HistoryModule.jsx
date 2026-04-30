import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Calendar, 
  User, 
  Scissors, 
  TrendingUp, 
  Loader2,
  ChevronDown,
  Package,
  Camera
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useAuth } from '../context/AuthContext';
import { useNotifs } from '../context/NotificationContext';

const HistoryModule = ({ isMobile, rates }) => {
  const { user } = useAuth();
  const { showToast } = useNotifs();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [selectedId, setSelectedId] = useState(null);

  const isAdmin = user?.role === 'Admin';

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      let data = [];
      if (isAdmin) {
        data = await dataService.getAppointmentsByState(['Completado']);
      } else {
        // Para barberos, traer directamente de la tabla appointments para asegurar sincronía con la agenda
        const query = dataService.supabase
          .from('appointments')
          .select(`
            *,
            clients(name, phone, id_card, work_gallery),
            services(name, price, included_items, commission_barber, commission_washer, commission_cashier, commission_receptionist),
            appointment_staff(*),
            appointment_extras(id, price, service_extras(name)),
            appointment_products(id, quantity, price, inventory(id, name))
          `)
          .eq('staff_id', user.id)
          .eq('status', 'Completado')
          .eq('appointment_staff.staff_id', user.id);

        const { data: staffData, error } = await query;
        if (error) throw error;

        data = staffData.map(item => ({
          ...item,
          commission_earned: item.appointment_staff?.[0]?.commission_earned || 0,
          tip_amount: item.appointment_staff?.[0]?.tip_amount || 0
        }));
      }
      // Sort by date (newest first)
      data.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
      });
      setHistory(data);
    } catch (error) {
      console.error('Error fetching history:', error);
      showToast('Error al cargar historial', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(item => {
    const searchMatch = (item.clients?.name || '').toLowerCase().includes(filter.toLowerCase()) ||
                       (item.services?.name || '').toLowerCase().includes(filter.toLowerCase());
    if (!searchMatch) return false;
    if (dateRange === 'today') {
      const today = new Date().toISOString().split('T')[0];
      return item.created_at.startsWith(today);
    }
    if (dateRange === 'week') {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      return new Date(item.created_at) >= lastWeek;
    }
    return true;
  });

  const totalIncome = filteredHistory.reduce((acc, item) => acc + (isAdmin ? (item.total_price || 0) : (item.commission_earned || 0) + (item.tip_amount || 0)), 0);

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '-0.5px' }}>
            {isAdmin ? 'Historial' : 'Mi Historial'} <span className="text-gold">Astro</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            {isAdmin ? 'Registro completo de servicios y transacciones.' : 'Consulta tus servicios realizados y propinas.'}
          </p>
        </div>
        {!isMobile && (
          <div style={{ display: 'flex', gap: '12px' }}>
             <div className="glass-card" style={{ padding: '12px 24px', borderRadius: '16px', textAlign: 'right' }}>
                <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {isAdmin ? 'VENTAS FILTRADAS' : 'MIS GANANCIAS'}
                </div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--gold-primary)' }}>
                  ${totalIncome.toFixed(2)}
                </div>
             </div>
          </div>
        )}
      </header>

      {/* Filters Bar */}
      <div className="glass-card" style={{ padding: '16px', borderRadius: '20px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
          <input 
            className="form-input" 
            placeholder="Buscar por cliente o servicio..." 
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ width: '100%', height: '48px', paddingLeft: '48px', borderRadius: '12px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {['all', 'today', 'week'].map(range => (
            <button 
              key={range}
              onClick={() => setDateRange(range)}
              style={{ 
                padding: '10px 16px', 
                borderRadius: '10px', 
                border: '1px solid var(--border-color)', 
                backgroundColor: dateRange === range ? 'var(--gold-primary)' : 'transparent', 
                color: dateRange === range ? 'black' : 'white', 
                fontWeight: '700', 
                fontSize: '13px', 
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {range === 'all' ? 'Todo' : range === 'today' ? 'Hoy' : 'Semana'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
          <Loader2 className="animate-spin" size={48} color="var(--gold-primary)" />
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="glass-card" style={{ padding: '80px', textAlign: 'center', borderRadius: '32px', opacity: 0.5 }}>
          <History size={48} style={{ margin: '0 auto 20px', color: 'var(--text-muted)' }} />
          <h3>No hay registros</h3>
          <p>No se encontraron servicios que coincidan con los filtros.</p>
        </div>
      ) : (
        <div className="glass-card" style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Fecha</th>
                  <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Cliente</th>
                  <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Servicio</th>
                  <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>{isAdmin ? 'Total' : 'Ganancia'}</th>
                  <th style={{ padding: '20px 24px', width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map(item => {
                  const isSelected = selectedId === item.id;
                  return (
                    <React.Fragment key={item.id}>
                      <tr 
                        onClick={() => setSelectedId(isSelected ? null : item.id)}
                        className="history-table-row"
                        style={{ 
                          borderBottom: '1px solid rgba(255,255,255,0.03)', 
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'rgba(212,175,55,0.05)' : 'transparent',
                          transition: 'all 0.2s'
                        }}
                      >
                        <td style={{ padding: '18px 24px', fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '18px 24px' }}>
                          <div style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>{item.clients?.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.clients?.id_card}</div>
                        </td>
                        <td style={{ padding: '18px 24px' }}>
                          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--gold-primary)' }}>{item.services?.name}</div>
                        </td>
                        <td style={{ padding: '18px 24px', textAlign: 'right' }}>
                          <div style={{ fontSize: '16px', fontWeight: '900', color: 'white' }}>
                            ${isAdmin ? item.total_price?.toFixed(2) : ((item.commission_earned || 0) + (item.tip_amount || 0)).toFixed(2)}
                          </div>
                          {rates?.usd > 0 && (
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              ≈ {Math.round( (isAdmin ? item.total_price : ((item.commission_earned || 0) + (item.tip_amount || 0))) * rates.usd).toLocaleString()} Bs.
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '18px 24px', textAlign: 'right' }}>
                          <div style={{ color: isSelected ? 'var(--gold-primary)' : 'var(--text-muted)', transition: 'all 0.3s', transform: isSelected ? 'rotate(180deg)' : 'rotate(0)' }}>
                            <ChevronDown size={18} />
                          </div>
                        </td>
                      </tr>
                      {isSelected && (
                        <tr style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
                          <td colSpan="5" style={{ padding: '0' }}>
                            <div className="animate-slide-down" style={{ padding: '32px 48px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '40px' }}>
                                {/* Client Section */}
                                <div>
                                  <SectionHeader icon={<User size={14} />} title="Detalles del Cliente" />
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <DetailItem label="Nombre" value={item.clients?.name} />
                                    <DetailItem label="Cédula" value={item.clients?.id_card} />
                                    <DetailItem label="Teléfono" value={item.clients?.phone || 'No registrado'} />
                                  </div>
                                </div>

                                {/* Service Section */}
                                <div>
                                  <SectionHeader icon={<Package size={14} />} title="Servicio y Extras" />
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <DetailItem label="Servicio Base" value={item.services?.name} subValue={`$${item.services?.price}`} />
                                    <div>
                                      <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Extras / Productos</span>
                                      {item.appointment_extras?.map(ex => (
                                        <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                                          <span>{ex.service_extras?.name}</span>
                                          <span style={{ fontWeight: '700', color: 'var(--gold-primary)' }}>+${ex.price}</span>
                                        </div>
                                      ))}
                                      {item.appointment_products?.map(pr => (
                                        <div key={pr.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                                          <span>{pr.inventory?.name} ({pr.quantity}u)</span>
                                          <span style={{ fontWeight: '700', color: 'var(--gold-primary)' }}>+${pr.price}</span>
                                        </div>
                                      ))}
                                      {(!item.appointment_extras?.length && !item.appointment_products?.length) && <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Ninguno</div>}
                                    </div>
                                  </div>
                                </div>

                                {/* Finance Section */}
                                <div>
                                  <SectionHeader icon={<TrendingUp size={14} />} title="Liquidación" />
                                  <div className="glass-card" style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(212,175,55,0.1)', marginBottom: '24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Monto de Venta</span>
                                      <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '14px', fontWeight: '900' }}>${item.total_price?.toFixed(2)}</div>
                                        {rates?.usd > 0 && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{Math.round(item.total_price * rates.usd).toLocaleString()} Bs.</div>}
                                      </div>
                                    </div>
                                    {!isAdmin && (
                                      <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Tu Comisión</span>
                                          <span style={{ fontSize: '14px', fontWeight: '700' }}>${item.commission_earned?.toFixed(2)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                                          <span style={{ fontSize: '13px', color: 'var(--gold-primary)', fontWeight: '800' }}>Tu Propina</span>
                                          <span style={{ fontSize: '14px', fontWeight: '900', color: 'var(--gold-primary)' }}>+${item.tip_amount?.toFixed(2)}</span>
                                        </div>
                                      </>
                                    )}
                                  </div>

                                  {/* Visual Record in History */}
                                  {item.clients?.work_gallery?.some(p => p.service_id === item.id) && (
                                    <div style={{ marginTop: '24px' }}>
                                      <SectionHeader icon={<Camera size={14} />} title="Registro Visual" />
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        {item.clients.work_gallery
                                          .filter(p => p.service_id === item.id)
                                          .map((photo, pidx) => (
                                           <div key={pidx} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                                              <img src={photo.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                              <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', background: 'rgba(0,0,0,0.6)', padding: '4px', fontSize: '8px', fontWeight: '900', textAlign: 'center', color: 'var(--gold-primary)' }}>
                                                {photo.type.toUpperCase()}
                                              </div>
                                           </div>
                                         ))}
                                       </div>
                                     </div>
                                   )}
                                 </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        .history-table-row:hover {
          background-color: rgba(255,255,255,0.03) !important;
        }
      `}</style>
    </div>
  );
};

const SectionHeader = ({ icon, title }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
    <div style={{ color: 'var(--gold-primary)' }}>{icon}</div>
    <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '1px', textTransform: 'uppercase' }}>{title}</div>
  </div>
);

const DetailItem = ({ label, value, subValue }) => (
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
      <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{value}</span>
      {subValue && <span style={{ fontSize: '12px', fontWeight: '900', color: 'var(--gold-primary)' }}>{subValue}</span>}
    </div>
  </div>
);

export default HistoryModule;
