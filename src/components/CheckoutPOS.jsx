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
  Scissors
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
  
  // Checkout Multi-State
  const [fixedRate, setFixedRate] = useState(rates?.usd || 0);
  const [tip, setTip] = useState(0);
  const [cart, setCart] = useState([]); // Sold products
  const [paymentMode, setPaymentMode] = useState('full_usd'); // or 'mixed'
  const [cashUsd, setCashUsd] = useState(0);

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
        dataService.getAppointmentsByState(['En Silla', 'Por Pagar']),
        dataService.getInventory()
      ]);
      setPendingServices(apps);
      setInventory(inv.filter(i => i.stock > 0 && i.category === 'Venta'));
    } catch (err) {
      console.error(err);
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
              commissionEarned: selectedApp.services.price * ((selectedApp.staff?.commission_pct || 40) / 100), 
              tip: Number(tip)
            }
          ],
          products: cart
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <History size={20} color="var(--gold-primary)" />
              <span style={{ fontWeight: '800', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' }}>Servicios en Curso</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingServices.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay clientes por cobrar.</div>
              ) : (
                pendingServices.map(app => (
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
                      <span style={{ fontSize: '10px', backgroundColor: 'var(--gold-primary)', color: 'black', padding: '2px 8px', borderRadius: '10px', fontWeight: '900' }}>{app.status}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Scissors size={12} /> {app.services.name} — <span style={{ fontWeight: '700', color: 'white' }}>${app.services.price}</span>
                    </div>
                  </div>
                ))
              )}
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
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{selectedApp.clients.name} • {selectedApp.services.name}</p>
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
                  <span style={{ color: 'var(--text-secondary)' }}>Servicio: {selectedApp.services.name}</span>
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
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                  <button 
                    onClick={() => { setPaymentMode('full_usd'); setCashUsd(totalUsd); }}
                    style={{ flex: 1, height: '48px', borderRadius: '14px', border: paymentMode === 'full_usd' ? '2px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.1)', background: paymentMode === 'full_usd' ? 'rgba(212,175,55,0.1)' : 'none', color: paymentMode === 'full_usd' ? 'var(--gold-primary)' : 'white', fontWeight: '800', cursor: 'pointer' }}
                  >TODO EN $</button>
                  <button 
                    onClick={() => setPaymentMode('mixed')}
                    style={{ flex: 1, height: '48px', borderRadius: '14px', border: paymentMode === 'mixed' ? '2px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.1)', background: paymentMode === 'mixed' ? 'rgba(212,175,55,0.1)' : 'none', color: paymentMode === 'mixed' ? 'var(--gold-primary)' : 'white', fontWeight: '800', cursor: 'pointer' }}
                  >PAGO MIXTO</button>
                </div>

                {paymentMode === 'mixed' && (
                  <div className="animate-slide-up" style={{ padding: '20px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '12px', fontWeight: '800' }}>PAGO EN EFECTIVO ($)</label>
                      <input 
                        type="number" 
                        value={cashUsd} 
                        onChange={(e) => setCashUsd(e.target.value)}
                        style={{ width: '120px', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', textAlign: 'right' }} 
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '12px', fontWeight: '800' }}>RESTANTE EN BOLÍVARES (BS)</label>
                      <div style={{ textAlign: 'right', fontWeight: '900', color: 'var(--gold-primary)', fontSize: '20px' }}>{remainingBs} BS</div>
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
