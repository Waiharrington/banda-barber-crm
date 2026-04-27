import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Search, 
  ShoppingBag, 
  DollarSign, 
  RefreshCcw, 
  Plus, 
  Minus, 
  CheckCircle,
  CreditCard,
  History,
  TrendingUp,
  User,
  Scissors,
  Zap
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import AstroSelect from './AstroSelect';
import AstroDialog from './AstroDialog';

const CheckoutPOS = ({ isMobile, rates }) => {
  const { showToast, triggerConfetti } = useNotifs();
  const [pendingServices, setPendingServices] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selection State
  const [selectedApp, setSelectedApp] = useState(null);
  const [idSearch, setIdSearch] = useState('');
  
  // Checkout Multi-State
  const [fixedRate, setFixedRate] = useState(rates?.usd || 0);
  const [tip, setTip] = useState(0);
  const [cart, setCart] = useState([]); // Sold products
  const [paymentMode, setPaymentMode] = useState('full_usd'); // or 'mixed'
  const [cashUsd, setCashUsd] = useState(0);
  const [methodUsd, setMethodUsd] = useState('Efectivo');
  const [methodBs, setMethodBs] = useState('Pago Móvil');

  // Dialog State
  const [dialog, setDialog] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null });

  useEffect(() => {
    loadData();
    if (rates?.usd) setFixedRate(rates.usd);
  }, [rates]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [apps, inv] = await Promise.all([
        dataService.getAppointmentsByState(['En Silla', 'Por Pagar', 'Agendado']),
        dataService.getInventory()
      ]);
      
      const today = new Date().toISOString().split('T')[0];
      const filtered = apps.filter(a => 
        a.status !== 'Agendado' || 
        (a.scheduled_at?.startsWith(today) || a.created_at?.startsWith(today))
      );

      setPendingServices(filtered);
      setInventory(inv.filter(i => i.stock > 0 && i.category === 'Venta'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAppointment = async (id) => {
    try {
      setLoading(true);
      await dataService.updateAppointmentStatus(id, 'En Silla');
      showToast("¡Servicio iniciado! El cliente ya está en silla.");
      loadData();
    } catch (error) {
      showToast("Error al iniciar servicio", "error");
    } finally {
      setLoading(false);
    }
  };

  const servicePrice = selectedApp?.services?.price || 0;
  const productsTotal = cart.reduce((acc, p) => acc + (p.price * p.quantity), 0);
  const totalUsd = servicePrice + productsTotal + Number(tip);
  const totalBs = (totalUsd * fixedRate).toFixed(2);
  
  const remainingBs = Math.max(0, (totalUsd - Number(cashUsd)) * fixedRate).toFixed(2);

  const handleAddToCart = (product) => {
    const exists = cart.find(p => p.id === product.id);
    if (exists) {
      setCart(cart.map(p => p.id === product.id ? {...p, quantity: p.quantity + 1} : p));
    } else {
      setCart([...cart, {...product, quantity: 1}]);
    }
    showToast(`${product.name} añadido`);
  };

  const handleProcessCheckout = async () => {
    if (!selectedApp) return;

    try {
      setLoading(true);
      
        const paymentData = {
          appointmentId: selectedApp.id,
          clientName: selectedApp.clients.name,
          serviceName: selectedApp.services.name,
          totalUsd: totalUsd,
          fixedRate: fixedRate,
          isMixed: paymentMode === 'mixed',
          cashUsd: Number(cashUsd),
          transferBs: Number(remainingBs),
          totalTips: Number(tip),
          staffInvolved: [
            { 
              staffId: selectedApp.staff_id, 
              commissionEarned: (() => {
                const role = selectedApp.staff?.role;
                const price = selectedApp.services?.price || 0;
                let pct = 40;
                
                if (role === 'Barbero') pct = selectedApp.services?.commission_barber ?? 40;
                else if (role === 'Asistente de Lavado') pct = selectedApp.services?.commission_washer ?? 10;
                else if (role === 'Caja') pct = selectedApp.services?.commission_cashier ?? 0;
                else if (role === 'Recepcionista') pct = selectedApp.services?.commission_receptionist ?? 0;
                else pct = selectedApp.staff?.commission_pct ?? 40;
                
                return price * (pct / 100);
              })(), 
              tip: Number(tip)
            }
          ],
          products: cart,
          methodUsd: methodUsd,
          methodBs: methodBs
        };

      await dataService.processFinalPayment(paymentData);
      
      triggerConfetti();
      showToast("¡Venta completada con éxito!", "success");
      
      // Clear state
      setSelectedApp(null);
      setCart([]);
      setTip(0);
      setCashUsd(0);
      loadData();
    } catch (err) {
      showToast("Error al procesar pago", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSale = () => {
    setDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Nueva Venta Directa',
      message: '¿Deseas iniciar una venta manual sin cita previa?',
      onConfirm: () => {
        // Implementation for direct sale if needed
        setDialog({ ...dialog, isOpen: false });
        showToast("Selecciona los productos y servicios abajo.");
      }
    });
  };

  if (!rates?.usd && !loading) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
        <RefreshCcw className="animate-spin" style={{ marginBottom: '20px' }} />
        <p>Sincronizando tasa de cambio oficial...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '900' }}>Caja <span className="text-gold">Astro Pro</span></h1>
        <p style={{ color: 'var(--text-secondary)' }}>Liquidación de servicios y venta de productos.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.5fr', gap: '32px', alignItems: 'start' }}>
        
        {/* Left: Pending Queue */}
        <section>
          <div className="glass-card" style={{ marginBottom: '32px', borderRadius: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <History size={20} color="var(--gold-primary)" />
              <span style={{ fontWeight: '800', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' }}>Sincronizar por Cédula</span>
            </div>

            <div style={{ position: 'relative', marginBottom: '24px' }}>
              <Search style={{ position: 'absolute', left: '16px', top: '14px' }} size={18} color="var(--gold-primary)" />
              <input 
                type="text" 
                placeholder="Ingresa Cédula / ID del cliente..." 
                value={idSearch}
                onChange={(e) => {
                  const val = e.target.value;
                  setIdSearch(val);
                  
                  // 1. Search in Active (En Silla)
                  const activeMatch = pendingServices.find(app => app.status !== 'Agendado' && app.clients?.id_card === val);
                  if (activeMatch) {
                    setSelectedApp(activeMatch);
                    return;
                  }

                  // 2. Search in Scheduled (Agendado Hoy)
                  const scheduledMatch = pendingServices.find(app => app.status === 'Agendado' && app.clients?.id_card === val);
                  if (scheduledMatch) {
                    setDialog({
                      isOpen: true,
                      type: 'confirm',
                      title: 'Cita Encontrada',
                      message: `El cliente ${scheduledMatch.clients?.name} tiene una cita agendada para hoy. ¿Deseas iniciar su servicio ahora?`,
                      onConfirm: () => {
                        handleStartAppointment(scheduledMatch.id);
                        setDialog({ ...dialog, isOpen: false });
                        setIdSearch('');
                      }
                    });
                  }
                }}
                style={{ width: '100%', paddingLeft: '48px', backgroundColor: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)', height: '48px', borderRadius: '14px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <TrendingUp size={16} color="var(--text-muted)" />
              <span style={{ fontWeight: '800', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Lista de Espera por Cobrar</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingServices.filter(a => a.status !== 'Agendado').length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay clientes por cobrar.</div>
              ) : (
                pendingServices.filter(a => a.status !== 'Agendado').map(app => (
                  <div 
                    key={app.id} 
                    onClick={() => setSelectedApp(app)}
                    style={{ 
                      padding: '16px', 
                      borderRadius: '16px', 
                      border: selectedApp?.id === app.id ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)',
                      background: selectedApp?.id === app.id ? 'rgba(212,175,55,0.05)' : 'rgba(255,255,255,0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '800' }}>{app.clients.name}</span>
                      <span style={{ fontSize: '10px', backgroundColor: app.status === 'En Silla' ? 'var(--gold-primary)' : '#4caf50', color: 'black', padding: '2px 8px', borderRadius: '10px', fontWeight: '900' }}>{app.status}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Scissors size={12} /> {app.services.name} • <span style={{ fontWeight: '600' }}>{app.staff?.name.split(' ')[0]}</span>
                      </div>
                      <span style={{ fontWeight: '700', color: 'var(--gold-primary)' }}>${app.services.price}</span>
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                      ID: {app.clients.id_card || 'Sin Cédula'}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Upcoming Appointments Section */}
            <div style={{ marginTop: '24px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '16px', letterSpacing: '1px' }}>PRÓXIMAS CITAS (AGENDA HOY)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pendingServices.filter(a => a.status === 'Agendado').length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.1)', fontSize: '12px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px' }}>No hay más citas para hoy</div>
                ) : (
                  pendingServices.filter(a => a.status === 'Agendado').map(app => (
                    <div 
                      key={app.id} 
                      style={{ 
                        padding: '16px', 
                        borderRadius: '16px', 
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.03)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '14px' }}>{app.clients?.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {new Date(app.scheduled_at || app.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {app.staff?.name}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleStartAppointment(app.id)}
                        style={{ padding: '8px 12px', borderRadius: '10px', background: 'var(--gold-primary)', color: 'black', border: 'none', fontSize: '10px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                      >
                        <Zap size={12} /> INICIAR
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {selectedApp && (
            <div className="glass-card animate-slide-up" style={{ borderRadius: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <ShoppingBag size={20} color="var(--gold-primary)" />
                <span style={{ fontWeight: '800', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' }}>Upselling: Productos</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {inventory.map(item => (
                  <button 
                    key={item.id} 
                    onClick={() => handleAddToCart(item)}
                    style={{ 
                      padding: '12px', 
                      borderRadius: '16px', 
                      border: '1px solid rgba(255,255,255,0.05)', 
                      textAlign: 'left',
                      background: 'rgba(255,255,255,0.01)',
                      cursor: 'pointer'
                    }}
                    className="hover-item"
                  >
                    <div style={{ fontWeight: '700', fontSize: '12px', marginBottom: '4px' }}>{item.name}</div>
                    <div style={{ color: 'var(--gold-primary)', fontWeight: '800', fontSize: '14px' }}>${item.price}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Right: Checkout Calculator */}
        <section>
          {!selectedApp ? (
            <div className="glass-card" style={{ height: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', borderRadius: '24px', color: 'var(--text-muted)' }}>
              <CreditCard size={48} style={{ marginBottom: '20px', opacity: 0.2 }} />
              <h3>Selecciona un cliente de la lista para cobrar</h3>
            </div>
          ) : (
            <div className="glass-card animate-scale-in" style={{ borderRadius: '32px', padding: '32px', border: '1.5px solid rgba(212,175,55,0.3)', background: 'linear-gradient(135deg, var(--bg-secondary) 0%, rgba(28,28,30,1) 100%)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
                <div>
                  <h3 style={{ fontSize: '24px', fontWeight: '900' }}>Resumen de Cobro</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    {selectedApp.clients.name} • {selectedApp.services.name} • <span style={{ color: 'var(--gold-primary)', fontWeight: '700' }}>{selectedApp.staff?.name}</span>
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '900' }}>TASA MANUAL ($)</label>
                  <input 
                    type="number" 
                    value={fixedRate} 
                    onChange={(e) => setFixedRate(e.target.value)}
                    style={{ width: '100px', textAlign: 'right', fontWeight: '900', color: 'var(--gold-primary)', background: 'none', border: '1px solid rgba(212,175,55,0.3)', marginLeft: '10px' }}
                  />
                </div>
              </div>

              {/* Price Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px', padding: '24px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Servicio: {selectedApp.services.name}</span>
                    {selectedApp.services.included_items && selectedApp.services.included_items.length > 0 && (
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Incluye: {selectedApp.services.included_items.join(' • ')}
                      </span>
                    )}
                  </div>
                  <span style={{ fontWeight: '700' }}>${servicePrice}</span>
                </div>
                
                {cart.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button onClick={() => setCart(cart.filter(item => item.id !== p.id))} style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', fontSize: '10px' }}>[X]</button>
                      {p.name} (x{p.quantity})
                    </span>
                    <span>${(p.price * p.quantity).toFixed(2)}</span>
                  </div>
                ))}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                  <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp size={14} color="var(--gold-primary)" /> PROPINA
                  </span>
                  <input 
                    type="number" 
                    value={tip} 
                    onChange={(e) => setTip(e.target.value)}
                    style={{ width: '80px', textAlign: 'right', background: 'rgba(212,175,55,0.1)', border: 'none', borderRadius: '8px', color: 'var(--gold-primary)', fontWeight: '800' }} 
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '16px' }}>
                  <span style={{ fontSize: '18px', fontWeight: '900' }}>TOTAL A PAGAR</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '32px', fontWeight: '950', color: 'var(--gold-primary)' }}>${totalUsd}</div>
                    <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>≈ {totalBs} BS</div>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                  <button 
                    onClick={() => { setPaymentMode('full_usd'); setCashUsd(totalUsd); }}
                    style={{ flex: 1, height: '44px', borderRadius: '12px', border: paymentMode === 'full_usd' ? '2px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.1)', background: paymentMode === 'full_usd' ? 'rgba(212,175,55,0.1)' : 'none', color: paymentMode === 'full_usd' ? 'var(--gold-primary)' : 'white', fontWeight: '800', cursor: 'pointer', fontSize: '10px' }}
                  >TODO EN $</button>
                  <button 
                    onClick={() => { setPaymentMode('full_bs'); setCashUsd(0); }}
                    style={{ flex: 1, height: '44px', borderRadius: '12px', border: paymentMode === 'full_bs' ? '2px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.1)', background: paymentMode === 'full_bs' ? 'rgba(212,175,55,0.1)' : 'none', color: paymentMode === 'full_bs' ? 'var(--gold-primary)' : 'white', fontWeight: '800', cursor: 'pointer', fontSize: '10px' }}
                  >TODO EN BS</button>
                  <button 
                    onClick={() => setPaymentMode('mixed')}
                    style={{ flex: 1, height: '44px', borderRadius: '12px', border: paymentMode === 'mixed' ? '2px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.1)', background: paymentMode === 'mixed' ? 'rgba(212,175,55,0.1)' : 'none', color: paymentMode === 'mixed' ? 'var(--gold-primary)' : 'white', fontWeight: '800', cursor: 'pointer', fontSize: '10px' }}
                  >PAGO MIXTO</button>
                </div>

                {paymentMode === 'full_usd' && (
                  <div className="animate-slide-up" style={{ padding: '20px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '20px', marginBottom: '16px' }}>
                    <label style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '12px', display: 'block' }}>MÉTODO DE PAGO ($)</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {['Efectivo', 'Zelle', 'Binance', 'Zinli'].map(m => (
                        <button 
                          key={m}
                          onClick={() => setMethodUsd(m)}
                          style={{ flex: 1, padding: '10px', borderRadius: '12px', border: methodUsd === m ? '1.5px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)', background: methodUsd === m ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.02)', color: methodUsd === m ? 'var(--gold-primary)' : 'white', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                        >{m}</button>
                      ))}
                    </div>
                  </div>
                )}

                {paymentMode === 'full_bs' && (
                  <div className="animate-slide-up" style={{ padding: '20px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '20px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '800' }}>TOTAL EN BOLÍVARES (BS)</label>
                      <div style={{ fontWeight: '900', color: 'var(--gold-primary)', fontSize: '20px' }}>{totalBs} BS</div>
                    </div>
                    <label style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '12px', display: 'block' }}>MÉTODO DE PAGO (BS)</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {['Pago Móvil', 'Efectivo', 'Transferencia'].map(m => (
                        <button 
                          key={m}
                          onClick={() => setMethodBs(m)}
                          style={{ flex: 1, padding: '10px', borderRadius: '12px', border: methodBs === m ? '1.5px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)', background: methodBs === m ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.02)', color: methodBs === m ? 'var(--gold-primary)' : 'white', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}
                        >{m}</button>
                      ))}
                    </div>
                  </div>
                )}

                {paymentMode === 'mixed' && (
                  <div className="animate-slide-up" style={{ padding: '20px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '12px', display: 'block' }}>1. PAGO EN DÓLARES ($)</label>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                        <input 
                          type="number" 
                          value={cashUsd} 
                          onChange={(e) => setCashUsd(e.target.value)}
                          style={{ flex: 1, height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', textAlign: 'right', paddingRight: '12px' }} 
                        />
                        <div style={{ display: 'flex', flex: 2, gap: '6px', flexWrap: 'wrap' }}>
                          {['Efectivo', 'Zelle', 'Binance', 'Zinli'].map(m => (
                            <button 
                              key={m}
                              onClick={() => setMethodUsd(m)}
                              style={{ flex: '1 0 45%', padding: '8px', borderRadius: '10px', border: methodUsd === m ? '1.5px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)', background: methodUsd === m ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.02)', color: methodUsd === m ? 'var(--gold-primary)' : 'white', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}
                            >{m}</button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                      <label style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '12px', display: 'block' }}>2. RESTANTE EN BOLÍVARES (BS)</label>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ fontWeight: '900', color: 'var(--gold-primary)', fontSize: '20px' }}>{remainingBs} BS</div>
                        <div style={{ display: 'flex', flex: 1.5, gap: '6px', flexWrap: 'wrap', marginLeft: '20px' }}>
                          {['Pago Móvil', 'Efectivo', 'Transfe'].map(m => (
                            <button 
                              key={m}
                              onClick={() => setMethodBs(m === 'Transfe' ? 'Transferencia' : m)}
                              style={{ flex: '1 0 45%', padding: '8px', borderRadius: '10px', border: (methodBs === m || (m==='Transfe' && methodBs==='Transferencia')) ? '1.5px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)', background: (methodBs === m || (m==='Transfe' && methodBs==='Transferencia')) ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.02)', color: (methodBs === m || (m==='Transfe' && methodBs==='Transferencia')) ? 'var(--gold-primary)' : 'white', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}
                            >{m}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={handleProcessCheckout}
                disabled={loading}
                className="btn-gold" 
                style={{ width: '100%', height: '64px', borderRadius: '20px', fontSize: '18px', gap: '12px' }}
              >
                <CheckCircle size={24} /> FINALIZAR COBRO
              </button>
            </div>
          )}
        </section>
      </div>

      <AstroDialog 
        isOpen={dialog.isOpen}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
        onConfirm={dialog.onConfirm}
        onCancel={() => setDialog({ ...dialog, isOpen: false })}
      />

      <style>{`
        .hover-item:hover {
          border-color: var(--gold-primary) !important;
          background-color: rgba(212,175,55,0.05) !important;
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
};

export default CheckoutPOS;
