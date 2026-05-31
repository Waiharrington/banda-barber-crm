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

const HistoryModule = ({ isMobile, rates, onNavigate }) => {
  const { user } = useAuth();
  const { showToast } = useNotifs();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [selectedId, setSelectedId] = useState(null);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const isAdmin = user?.role?.toLowerCase().includes('admin');

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
        // Fetch from appointment_staff to include all services where the user participated
        const { data: staffData, error } = await dataService.supabase
          .from('appointment_staff')
          .select(`
            *,
            appointments!inner (
              *,
              clients(id, name, phone, id_card, work_gallery),
              services(name, price, included_items, commission_barber, commission_washer, commission_cashier, commission_receptionist),
              appointment_extras(id, price, service_extras(name)),
              appointment_products(id, quantity, price, inventory(id, name))
            )
          `)
          .eq('staff_id', user.id)
          .eq('appointments.status', 'Completado');

        if (error) throw error;

        data = staffData.map(record => {
          const item = record.appointments;
          if (!item) return null;

          return {
            ...item,
            commission_earned: Number(record.commission_earned || 0),
            tip_amount: Number(record.tip_amount || 0),
            isStaffView: true
          };
        }).filter(Boolean);
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

  const totalIncome = filteredHistory.reduce((acc, item) => {
    if (!isAdmin) return acc + (item.commission_earned || 0) + (item.tip_amount || 0);
    
    // Admin: Sum everything including tips from appointment_staff
    const serviceBase = Number(item.services?.price || 0);
    const extras = item.appointment_extras?.reduce((sum, e) => sum + Number(e.price || 0), 0) || 0;
    const products = item.appointment_products?.reduce((sum, p) => sum + (Number(p.price || 0) * (p.quantity || 1)), 0) || 0;
    const tips = item.appointment_staff?.reduce((sum, s) => sum + Number(s.tip_amount || 0), 0) || 0;
    return acc + serviceBase + extras + products + tips;
  }, 0);

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
                <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--gold-primary)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span>{formatCurrency(totalIncome * (rates?.bcv || rates?.usd || 550))} Bs.</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '750', marginTop: '2px' }}>
                    Ref: ${formatCurrency(totalIncome)}
                  </span>
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
                  <th style={{ padding: isMobile ? '12px 8px' : '20px 24px', fontSize: isMobile ? '10px' : '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Fecha</th>
                  <th style={{ padding: isMobile ? '12px 8px' : '20px 24px', fontSize: isMobile ? '10px' : '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Cliente</th>
                  <th style={{ padding: isMobile ? '12px 8px' : '20px 24px', fontSize: isMobile ? '10px' : '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Servicio</th>
                  <th style={{ padding: isMobile ? '12px 8px' : '20px 24px', fontSize: isMobile ? '10px' : '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>{isAdmin ? 'Total' : 'Ganancia'}</th>
                  <th style={{ padding: isMobile ? '12px 4px' : '20px 24px', width: isMobile ? '30px' : '60px' }}></th>
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
                        <td style={{ padding: isMobile ? '12px 8px' : '18px 24px', fontSize: isMobile ? '12px' : '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                          {new Date(item.created_at).toLocaleDateString([], {day: '2-digit', month: 'numeric'})}
                        </td>
                        <td style={{ padding: isMobile ? '12px 8px' : '18px 24px' }}>
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate('clients', { clientId: item.clients?.id });
                            }}
                            className="client-link"
                            style={{ fontSize: isMobile ? '13px' : '15px', fontWeight: '700', color: 'white', cursor: 'pointer', display: 'inline-block', transition: '0.2s' }}
                          >
                            {item.clients?.name}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{item.clients?.id_card}</div>
                        </td>
                        <td style={{ padding: isMobile ? '12px 8px' : '18px 24px' }}>
                          <div style={{ fontSize: isMobile ? '13px' : '15px', fontWeight: '700', color: 'var(--gold-primary)' }}>{item.services?.name}</div>
                        </td>
                        <td style={{ padding: isMobile ? '12px 8px' : '18px 24px', textAlign: 'right' }}>
                          <div style={{ fontSize: isMobile ? '13px' : '16px', fontWeight: '900', color: 'white' }}>
                            {(() => {
                              let val = 0;
                              if (!isAdmin) val = ((item.commission_earned || 0) + (item.tip_amount || 0));
                              else {
                                const serviceBase = Number(item.services?.price || 0);
                                const extras = item.appointment_extras?.reduce((sum, e) => sum + Number(e.price || 0), 0) || 0;
                                const products = item.appointment_products?.reduce((sum, p) => sum + (Number(p.price || 0) * (p.quantity || 1)), 0) || 0;
                                const tips = item.appointment_staff?.reduce((sum, s) => sum + Number(s.tip_amount || 0), 0) || 0;
                                val = (serviceBase + extras + products + tips);
                              }
                              const rate = Number(item.exchange_rate || rates?.bcv || rates?.usd || 550);
                              return `${formatCurrency(val * rate)} Bs.`;
                            })()}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '750', marginTop: '2px' }}>
                            {(() => {
                              let val = 0;
                              if (!isAdmin) val = ((item.commission_earned || 0) + (item.tip_amount || 0));
                              else {
                                const serviceBase = Number(item.services?.price || 0);
                                const extras = item.appointment_extras?.reduce((sum, e) => sum + Number(e.price || 0), 0) || 0;
                                const products = item.appointment_products?.reduce((sum, p) => sum + (Number(p.price || 0) * (p.quantity || 1)), 0) || 0;
                                const tips = item.appointment_staff?.reduce((sum, s) => sum + Number(s.tip_amount || 0), 0) || 0;
                                val = (serviceBase + extras + products + tips);
                              }
                              return `Ref: $${formatCurrency(val)}`;
                            })()}
                          </div>
                        </td>
                        <td style={{ padding: isMobile ? '12px 4px' : '18px 24px', textAlign: 'right' }}>
                          <div style={{ color: isSelected ? 'var(--gold-primary)' : 'var(--text-muted)', transition: 'all 0.3s', transform: isSelected ? 'rotate(180deg)' : 'rotate(0)' }}>
                            <ChevronDown size={isMobile ? 14 : 18} />
                          </div>
                        </td>
                      </tr>
                      {isSelected && (
                        <tr style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
                          <td colSpan="5" style={{ padding: '0' }}>
                            <div className="animate-slide-down" style={{ padding: '32px 48px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1.2fr', gap: '40px' }}>
                                {/* Client Section */}
                                <div>
                                  <SectionHeader icon={<User size={14} />} title="Detalles del Cliente" />
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div 
                                      onClick={() => onNavigate('clients', { clientId: item.clients?.id })}
                                      className="client-link"
                                      style={{ cursor: 'pointer', transition: '0.2s' }}
                                    >
                                      <DetailItem label="Nombre" value={item.clients?.name} />
                                    </div>
                                    <DetailItem label="Cédula" value={item.clients?.id_card} />
                                    <DetailItem label="Teléfono" value={item.clients?.phone || 'No registrado'} />
                                  </div>
                                </div>

                                {/* Service Section */}
                                <div>
                                  <SectionHeader icon={<Package size={14} />} title="Servicio y Extras" />
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <DetailItem 
                                      label="Servicio Base" 
                                      value={item.services?.name} 
                                      subValue={user.role !== 'Asistente de Lavado' ? `${formatCurrency((item.services?.price || 0) * Number(item.exchange_rate || rates?.bcv || rates?.usd || 550))} Bs. ($${formatCurrency(item.services?.price || 0)})` : null} 
                                    />
                                    <div>
                                      <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Extras / Productos</span>
                                      {item.appointment_extras?.map(ex => (
                                        <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                                          <span>{ex.service_extras?.name}</span>
                                          <span style={{ fontWeight: '700', color: 'var(--gold-primary)' }}>
                                            +{formatCurrency(Number(ex.price) * Number(item.exchange_rate || rates?.bcv || rates?.usd || 550))} Bs. (Ref: +${ex.price})
                                          </span>
                                        </div>
                                      ))}
                                      {item.appointment_products?.map(pr => (
                                        <div key={pr.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                                          <span>{pr.inventory?.name} ({pr.quantity}u)</span>
                                          <span style={{ fontWeight: '700', color: 'var(--gold-primary)' }}>
                                            +{formatCurrency(Number(pr.price) * Number(item.exchange_rate || rates?.bcv || rates?.usd || 550))} Bs. (Ref: +${pr.price})
                                          </span>
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
                                    {user.role !== 'Asistente de Lavado' && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Monto de Venta (Serv + Ext + Prod)</span>
                                      <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '16px', fontWeight: '900', color: 'white' }}>
                                            {(() => {
                                              const serviceBase = Number(item.services?.price || 0);
                                              const extras = item.appointment_extras?.reduce((sum, e) => sum + Number(e.price || 0), 0) || 0;
                                              const products = item.appointment_products?.reduce((sum, pr) => sum + (Number(pr.price || 0) * (pr.quantity || 1)), 0) || 0;
                                              const rate = Number(item.exchange_rate || rates?.bcv || rates?.usd || 550);
                                              return `${formatCurrency((serviceBase + extras + products) * rate)} Bs.`;
                                            })()}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '750', marginTop: '2px' }}>
                                            {(() => {
                                              const serviceBase = Number(item.services?.price || 0);
                                              const extras = item.appointment_extras?.reduce((sum, e) => sum + Number(e.price || 0), 0) || 0;
                                              const products = item.appointment_products?.reduce((sum, pr) => sum + (Number(pr.price || 0) * (pr.quantity || 1)), 0) || 0;
                                              return `Ref: $${formatCurrency(serviceBase + extras + products)}`;
                                            })()}
                                        </div>
                                      </div>
                                    </div>
                                    )}
                                    
                                    {isAdmin ? (
                                      <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                                        <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>Desglose de Propinas y Comisiones</span>
                                        {item.appointment_staff?.length > 0 ? item.appointment_staff.map((st, sidx) => {
                                          const rate = Number(item.exchange_rate || rates?.bcv || rates?.usd || 550);
                                          return (
                                            <div key={sidx} style={{ marginBottom: '12px', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)' }}>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{st.staff?.name}</span>
                                                <div style={{ textAlign: 'right' }}>
                                                  <div style={{ fontSize: '14px', fontWeight: '900', color: 'var(--gold-primary)' }}>
                                                    +{formatCurrency(Number(st.commission_earned || 0) * rate)} Bs.
                                                  </div>
                                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>
                                                    Ref: +${Number(st.commission_earned || 0).toFixed(2)} Comisión
                                                  </div>
                                                </div>
                                              </div>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', alignItems: 'center' }}>
                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Propina:</span>
                                                <div style={{ textAlign: 'right' }}>
                                                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                                    {formatCurrency(Number(st.tip_amount || 0) * rate)} Bs.
                                                  </span>
                                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginLeft: '6px' }}>
                                                    (Ref: ${Number(st.tip_amount || 0).toFixed(2)})
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        }) : (
                                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>No hay personal registrado en esta venta.</div>
                                        )}
                                      </div>
                                    ) : (
                                      <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
                                          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                            {user.role === 'Asistente de Lavado' ? 'Tu Tarifa de Lavado' : 'Tu Comisión'}
                                          </span>
                                          <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>
                                              {formatCurrency((item.commission_earned || 0) * Number(item.exchange_rate || rates?.bcv || rates?.usd || 550))} Bs.
                                            </span>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>
                                              Ref: ${formatCurrency(item.commission_earned || 0)}
                                            </div>
                                          </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px', alignItems: 'center' }}>
                                          <span style={{ fontSize: '13px', color: 'var(--gold-primary)', fontWeight: '800' }}>Tu Propina</span>
                                          <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontSize: '14px', fontWeight: '900', color: 'var(--gold-primary)' }}>
                                              +{formatCurrency((item.tip_amount || 0) * Number(item.exchange_rate || rates?.bcv || rates?.usd || 550))} Bs.
                                            </span>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>
                                              Ref: +${formatCurrency(item.tip_amount || 0)}
                                            </div>
                                          </div>
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
        .client-link:hover {
          color: var(--gold-primary) !important;
          transform: translateX(4px);
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
