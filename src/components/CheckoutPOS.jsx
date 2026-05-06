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
  Zap,
  Droplets
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import AstroSelect from './AstroSelect';
import AstroDialog from './AstroDialog';
import NewClientModal from './NewClientModal';
import { UserPlus } from 'lucide-react';

const CheckoutPOS = ({ isMobile, rates, onNavigate }) => {
  const { showToast, triggerConfetti, triggerRocket } = useNotifs();
  const [pendingServices, setPendingServices] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [allExtras, setAllExtras] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selection State
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isDirectSale, setIsDirectSale] = useState(false);
  const [idSearch, setIdSearch] = useState('');
  const [directSaleIdSearch, setDirectSaleIdSearch] = useState('');
  const [directSaleSearchResults, setDirectSaleSearchResults] = useState([]);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  
  // Checkout Multi-State
  const [fixedRate, setFixedRate] = useState(rates?.usd || 0);
  const [tips, setTips] = useState([]); // Array of { id, staffId, amount }
  const [cart, setCart] = useState([]); // Sold products
  const [paymentMode, setPaymentMode] = useState('full_usd'); // or 'mixed'
  const [cashUsd, setCashUsd] = useState(0);
  const [methodUsd, setMethodUsd] = useState('Efectivo');
  const [methodBs, setMethodBs] = useState('Pago Móvil');
  const [didWash, setDidWash] = useState(false);
  const [selectedWasherId, setSelectedWasherId] = useState('');

  // Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showBarberModal, setShowBarberModal] = useState(false);
  const [selectedServiceForBarber, setSelectedServiceForBarber] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog State
  const [dialog, setDialog] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null });

  useEffect(() => {
    loadData();
    if (rates?.usd) setFixedRate(rates.usd);
  }, [rates]);

  useEffect(() => {
    if (selectedApp) {
      const products = selectedApp.appointment_products?.map(ap => ({
        id: ap.inventory?.id,
        name: ap.inventory?.name,
        price: ap.price,
        quantity: ap.quantity
      })) || [];
      setCart(products);

      // Auto-load primary staff for tip
      setTips([{ id: Date.now().toString(), staffId: selectedApp.staff_id, amount: 0 }]);
      
      // Auto-detect washing
      const hasWashing = selectedApp.services?.included_items?.some(i => i.toLowerCase().includes('lavado')) || 
                        selectedApp.appointment_extras?.some(e => e.service_extras?.name?.toLowerCase().includes('lavado'));
      setDidWash(hasWashing);
      
      // Select assistant as default ONLY if there is exactly one available
      const washers = allStaff.filter(s => s.role?.includes('Asistente de Lavado'));
      if (washers.length === 1) {
        setSelectedWasherId(washers[0].id);
      } else {
        setSelectedWasherId('');
      }
    } else if (!isDirectSale) {
      setCart([]);
      setTips([]);
      setDidWash(false);
      setSelectedWasherId('');
    }
  }, [selectedApp, isDirectSale, allStaff]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [apps, inv, ext, cls, staff, srv] = await Promise.all([
        dataService.getAppointmentsByState(['En Silla', 'Por Pagar', 'Agendado']),
        dataService.getInventory(),
        dataService.getExtras(),
        dataService.getClients(),
        dataService.getStaff(),
        dataService.getServices()
      ]);
      
      const today = new Date().toISOString().split('T')[0];
      const filtered = apps.filter(a => 
        a.status !== 'Agendado' || 
        (a.scheduled_at?.startsWith(today) || a.created_at?.startsWith(today))
      );

      setPendingServices(filtered);
      setInventory(inv.filter(i => i.stock > 0 && i.category === 'Venta'));
      setAllExtras(ext || []);
      setAllServices(srv || []);
      setAllClients(cls || []);
      setAllStaff(staff || []);
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
  const extrasTotal = selectedApp?.appointment_extras?.reduce((acc, e) => acc + (e.price || 0), 0) || 0;
  const totalTips = tips.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const totalUsd = servicePrice + productsTotal + extrasTotal + totalTips;
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

  const handleAddExtra = async (extra) => {
    if (!selectedApp) {
      setCart([...cart, { id: 'extra_' + extra.id, name: extra.name, price: extra.price, quantity: 1, type: 'extra' }]);
      showToast(`${extra.name} añadido al carrito`);
      setShowExtraModal(false);
      return;
    }
    try {
      setLoading(true);
      await dataService.addExtraToAppointment(selectedApp.id, extra.id, extra.price);
      showToast(`${extra.name} añadido a la cuenta.`);
      await loadData();
      const updatedApps = await dataService.getAppointmentsByState(['En Silla', 'Por Pagar', 'Agendado']);
      const updatedSelected = updatedApps.find(a => a.id === selectedApp.id);
      setSelectedApp(updatedSelected);
    } catch (e) {
      showToast("Error al añadir extra", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveExtra = async (extraId) => {
    try {
      setLoading(true);
      await dataService.removeExtraFromAppointment(extraId);
      showToast("Extra eliminado.");
      await loadData();
      const updatedApps = await dataService.getAppointmentsByState(['En Silla', 'Por Pagar', 'Agendado']);
      const updatedSelected = updatedApps.find(a => a.id === selectedApp.id);
      setSelectedApp(updatedSelected);
    } catch (e) {
      showToast("Error al eliminar extra", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessCheckout = async () => {
    if (!selectedApp && !selectedClient) {
      showToast("Selecciona un cliente para la venta directa", "warning");
      return;
    }
    if (!selectedApp && cart.length === 0) {
      showToast("Agrega al menos un producto al carrito", "warning");
      return;
    }

    try {
      setLoading(true);
      
      const paymentData = {
        appointmentId: selectedApp?.id || null,
        clientId: selectedApp?.client_id || selectedClient?.id,
        clientName: selectedApp?.clients?.name || selectedClient?.name,
        serviceName: selectedApp?.services?.name || 'Venta de Productos',
        totalUsd: totalUsd,
        fixedRate: fixedRate,
        isMixed: paymentMode === 'mixed',
        cashUsd: Number(cashUsd),
        transferBs: Number(remainingBs),
        totalTips: totalTips,
        staffInvolved: (() => {
          const involved = [];
          const washer = allStaff.find(s => s.id === selectedWasherId);
          const washRate = washer ? Number(washer.washing_rate || 0) : 0;
          
          if (selectedApp && selectedApp.staff_id) {
            const role = selectedApp.staff?.role;
            let price = selectedApp.services?.price || 0;
            const extrasTotal = selectedApp.appointment_extras?.reduce((acc, e) => acc + (e.price || 0), 0) || 0;
            let grossBase = price + extrasTotal;

            if (didWash && selectedWasherId) {
              grossBase -= washRate;
            }

            let pct = 40;
            if (role === 'Barbero') pct = selectedApp.services?.commission_barber ?? 40;
            else if (role === 'Asistente de Lavado') pct = selectedApp.services?.commission_washer ?? 10;
            else if (role === 'Caja') pct = selectedApp.services?.commission_cashier ?? 0;
            else if (role === 'Recepcionista') pct = selectedApp.services?.commission_receptionist ?? 0;
            else pct = selectedApp.staff?.commission_pct ?? 40;

            involved.push({
              staffId: selectedApp.staff_id,
              commissionEarned: grossBase * (pct / 100),
              productCommissionEarned: cart.reduce((acc, p) => acc + (p.price * p.quantity * 0.10), 0),
              tip: tips.filter(t => t.staffId === selectedApp.staff_id).reduce((acc, t) => acc + Number(t.amount || 0), 0)
            });
          }

          if (didWash && selectedWasherId) {
            const existing = involved.find(i => i.staffId === selectedWasherId);
            if (existing) {
              existing.commissionEarned += washRate;
            } else {
              involved.push({
                staffId: selectedWasherId,
                commissionEarned: washRate,
                productCommissionEarned: 0,
                tip: tips.filter(t => t.staffId === selectedWasherId).reduce((acc, t) => acc + Number(t.amount || 0), 0)
              });
            }
          }

          tips.forEach(t => {
            if (!t.staffId) return;
            const existing = involved.find(i => i.staffId === t.staffId);
            if (!existing) {
              involved.push({
                staffId: t.staffId,
                commissionEarned: 0,
                productCommissionEarned: 0,
                tip: tips.filter(tip => tip.staffId === t.staffId).reduce((acc, tip) => acc + Number(tip.amount || 0), 0)
              });
            }
          });

          return involved;
        })(),
        products: cart,
        methodUsd: methodUsd,
        methodBs: methodBs
      };

      await dataService.processFinalPayment(paymentData);
      
      triggerRocket();
      showToast("¡Venta completada con éxito!", "success");
      
      setSelectedApp(null);
      setSelectedClient(null);
      setIsDirectSale(false);
      setCart([]);
      setTips([]);
      setCashUsd(0);
      loadData();
    } catch (err) {
      console.error("Error en checkout:", err);
      showToast("Error al procesar pago", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSale = () => {
    setIsDirectSale(true);
    setSelectedApp(null);
    setSelectedClient(null);
    setDirectSaleIdSearch('');
    setCart([]);
    showToast("Venta Directa activada. Identifica al cliente si lo deseas.");
  };

  const handleAddService = (service) => {
    if (!selectedApp) {
      if (!selectedClient) {
        showToast("Por favor, identifica al cliente primero en la barra superior.", "warning");
        return;
      }
      setSelectedServiceForBarber(service);
      setShowServiceModal(false);
      setShowBarberModal(true);
    } else {
      showToast("Para añadir otro servicio, genéralo desde Recepción.", "warning");
    }
  };

  const handleConfirmServiceBarber = async (barberId) => {
    try {
      setLoading(true);
      setShowBarberModal(false);
      
      const newApp = await dataService.createAppointment({
        client_id: selectedClient.id,
        service_id: selectedServiceForBarber.id,
        staff_id: barberId,
        status: 'Por Pagar',
        total_price: selectedServiceForBarber.price
      });
      
      await loadData();
      const updatedApps = await dataService.getAppointmentsByState(['En Silla', 'Por Pagar', 'Agendado']);
      const fullyLoadedApp = updatedApps.find(a => a.id === newApp.id);
      
      if (fullyLoadedApp) {
        setIsDirectSale(false);
        setSelectedApp(fullyLoadedApp);
        showToast("Servicio añadido y barbero asignado.");
      } else {
        showToast("Cita creada. Selecciona el servicio en la lista.");
      }
      setSelectedServiceForBarber(null);
    } catch (e) {
      console.error(e);
      showToast("Error al asignar barbero", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDirectSaleSearchInput = (val) => {
    setDirectSaleIdSearch(val);
    if (val.length >= 2) {
      const term = val.toLowerCase();
      const results = allClients.filter(c => 
        (c.id_card && c.id_card.toLowerCase().includes(term)) || 
        (c.name && c.name.toLowerCase().includes(term))
      );
      setDirectSaleSearchResults(results.slice(0, 5));
    } else {
      setDirectSaleSearchResults([]);
    }
  };

  const handleSelectDirectSaleClient = (client) => {
    setSelectedClient(client);
    setDirectSaleIdSearch('');
    setDirectSaleSearchResults([]);
    showToast(`Cliente enlazado: ${client.name}`);
  };

  const handleDirectSaleIdSearch = () => {
    if (directSaleSearchResults.length === 1) {
      handleSelectDirectSaleClient(directSaleSearchResults[0]);
    } else {
      const exact = allClients.find(c => c.id_card === directSaleIdSearch || c.name.toLowerCase() === directSaleIdSearch.toLowerCase());
      if (exact) {
        handleSelectDirectSaleClient(exact);
      } else if (directSaleSearchResults.length > 1) {
        showToast("Múltiples coincidencias. Selecciona uno de la lista.", "info");
      } else {
        showToast("Cliente no encontrado. ¿Es un cliente nuevo?", "warning");
      }
    }
  };

  const handleNewClientSuccess = (newClient) => {
    setAllClients([...allClients, newClient]);
    setSelectedClient(newClient);
    setShowNewClientModal(false);
    showToast(`¡Cliente ${newClient.name} registrado y enlazado!`);
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
        
        <section>
          <div className="glass-card" style={{ marginBottom: '32px', borderRadius: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <History size={20} color="var(--gold-primary)" />
                <span style={{ fontWeight: '800', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' }}>Cola de Cobro</span>
              </div>
              <button 
                className="btn-gold" 
                onClick={handleManualSale}
                style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '10px' }}
              >
                <Plus size={14} /> VENTA DIRECTA
              </button>
            </div>

            <div style={{ position: 'relative', marginBottom: '24px' }}>
              <Search style={{ position: 'absolute', left: '16px', top: '14px' }} size={18} color="var(--gold-primary)" />
              <input 
                type="text" 
                placeholder="Buscar por Cédula o Nombre..." 
                value={idSearch}
                onChange={(e) => {
                  const val = e.target.value;
                  setIdSearch(val);
                  
                  const activeMatch = pendingServices.find(app => app.status !== 'Agendado' && app.clients?.id_card === val);
                  if (activeMatch) {
                    setSelectedApp(activeMatch);
                    return;
                  }

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
                        <Scissors size={12} /> {app.services?.name || 'Venta de Productos'} • <span style={{ fontWeight: '600' }}>{app.staff?.name?.split(' ')[0] || 'Caja'}</span>
                      </div>
                      <span style={{ fontWeight: '700', color: 'var(--gold-primary)' }}>${app.services?.price || app.total_price || 0}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

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
                        onClick={() => {
                          handleStartAppointment(app.id);
                          triggerRocket();
                        }}
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

          {(selectedApp || isDirectSale) && (
            <div className="glass-card animate-slide-up" style={{ borderRadius: '24px', display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowProductModal(true)}
                style={{ flex: 1, padding: '24px', borderRadius: '20px', border: '1px solid rgba(212,175,55,0.3)', background: 'rgba(212,175,55,0.05)', color: 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
                className="hover-item"
              >
                <div style={{ background: 'var(--gold-primary)', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black' }}>
                  <ShoppingBag size={24} />
                </div>
                <div style={{ fontWeight: '900', fontSize: '12px', letterSpacing: '1px' }}>PRODUCTOS</div>
              </button>

              <button 
                onClick={() => setShowExtraModal(true)}
                style={{ flex: 1, padding: '24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)', color: 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
                className="hover-item"
              >
                <div style={{ background: 'rgba(255,255,255,0.1)', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <Zap size={24} />
                </div>
                <div style={{ fontWeight: '900', fontSize: '12px', letterSpacing: '1px' }}>EXTRAS</div>
              </button>

              <button 
                onClick={() => setShowServiceModal(true)}
                style={{ flex: 1, padding: '24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)', color: 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
                className="hover-item"
              >
                <div style={{ background: 'rgba(255,255,255,0.1)', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <Scissors size={24} />
                </div>
                <div style={{ fontWeight: '900', fontSize: '12px', letterSpacing: '1px' }}>SERVICIOS</div>
              </button>
            </div>
          )}
        </section>

        <section>
          {(!selectedApp && !isDirectSale) ? (
            <div className="glass-card" style={{ height: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', borderRadius: '24px', color: 'var(--text-muted)' }}>
              <CreditCard size={48} style={{ marginBottom: '20px', opacity: 0.2 }} />
              <h3>Selecciona un cliente de la lista para cobrar</h3>
            </div>
          ) : (
            <div className="glass-card animate-scale-in" style={{ borderRadius: '32px', padding: '32px', border: '1.5px solid rgba(212,175,55,0.3)', background: 'linear-gradient(135deg, var(--bg-secondary) 0%, rgba(28,28,30,1) 100%)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
                <div>
                  <h3 style={{ fontSize: '24px', fontWeight: '900' }}>{selectedApp ? 'Resumen de Cobro' : 'Venta Directa'}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                    {selectedApp ? (
                      <>{selectedApp.clients.name} • {selectedApp.services?.name || 'Venta Directa'} • <span style={{ color: 'var(--gold-primary)', fontWeight: '700' }}>{selectedApp.staff?.name || 'Caja'}</span></>
                    ) : (
                      <>
                        {selectedClient ? (
                          <div className="animate-scale-in" style={{ padding: '12px 16px', background: 'rgba(212,175,55,0.1)', borderRadius: '12px', border: '1px solid rgba(212,175,55,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: '800', fontSize: '16px' }}>{selectedClient.name}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>V-{selectedClient.id_card}</div>
                            </div>
                            <button onClick={() => setSelectedClient(null)} style={{ background: 'none', border: 'none', color: '#ff453a', fontWeight: '800', cursor: 'pointer', fontSize: '11px' }}>CAMBIAR</button>
                          </div>
                        ) : (
                          <div style={{ position: 'relative' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <div style={{ position: 'relative', flex: 1 }}>
                                <Search style={{ position: 'absolute', left: '12px', top: '12px' }} size={16} color="var(--text-muted)" />
                                <input 
                                  type="text" 
                                  placeholder="Cédula o nombre del cliente..." 
                                  value={directSaleIdSearch}
                                  onChange={(e) => handleDirectSaleSearchInput(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleDirectSaleIdSearch()}
                                  style={{ width: '100%', paddingLeft: '40px', height: '40px', fontSize: '13px' }}
                                />
                              </div>
                              <button onClick={handleDirectSaleIdSearch} className="btn-gold" style={{ padding: '0 12px', height: '40px' }}>ENLAZAR</button>
                              <button 
                                onClick={() => setShowNewClientModal(true)} 
                                style={{ padding: '0 12px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                              >
                                <UserPlus size={16} />
                              </button>
                            </div>
                            
                            {/* Autocomplete Dropdown */}
                            {directSaleSearchResults.length > 0 && (
                              <div className="animate-scale-in" style={{ 
                                position: 'absolute', top: '100%', left: 0, right: '110px', 
                                marginTop: '8px', background: 'rgba(28,28,30,0.95)', 
                                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', 
                                overflow: 'hidden', zIndex: 10, backdropFilter: 'blur(10px)',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                              }}>
                                {directSaleSearchResults.map(c => (
                                  <div 
                                    key={c.id} 
                                    onClick={() => handleSelectDirectSaleClient(c)}
                                    style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(212,175,55,0.1)'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                  >
                                    <span style={{ fontWeight: '700', fontSize: '13px', color: 'white' }}>{c.name}</span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>V-{c.id_card}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px', padding: '24px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '20px' }}>
                {selectedApp && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Servicio: {selectedApp.services?.name}</span>
                    <span style={{ fontWeight: '700' }}>${servicePrice}</span>
                  </div>
                )}
                
                {cart.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button onClick={() => setCart(cart.filter(item => item.id !== p.id))} style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer' }}>[X]</button>
                      {p.name} (x{p.quantity})
                    </span>
                    <span>${(p.price * p.quantity).toFixed(2)}</span>
                  </div>
                ))}

                {selectedApp?.appointment_extras?.map(extra => (
                  <div key={extra.id} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--gold-primary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button onClick={() => handleRemoveExtra(extra.id)} style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer' }}>[X]</button>
                      {extra.service_extras?.name}
                    </span>
                    <span style={{ fontWeight: '700' }}>${extra.price}</span>
                  </div>
                ))}

                {/* Washing Section */}
                {(selectedApp?.services?.included_items?.some(i => i.toLowerCase().includes('lavado')) || 
                  selectedApp?.appointment_extras?.some(e => e.service_extras?.name?.toLowerCase().includes('lavado'))) && (
                  <div className="glass-card animate-slide-up" style={{ padding: '24px', borderRadius: '24px', marginBottom: '24px', border: '1px solid rgba(10,132,255,0.1)', background: 'rgba(10,132,255,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(10,132,255,0.1)', color: '#0a84ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Droplets size={20} />
                        </div>
                        <div>
                          <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'white' }}>¿Se realizó el lavado?</h4>
                          <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Asigna el costo del lavado a la asistente.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setDidWash(!didWash)}
                        style={{ 
                          padding: '8px 24px', 
                          borderRadius: '12px', 
                          border: 'none', 
                          backgroundColor: didWash ? '#0a84ff' : 'rgba(255,255,255,0.05)',
                          color: didWash ? 'white' : 'var(--text-muted)',
                          fontWeight: '900',
                          fontSize: '12px',
                          cursor: 'pointer',
                          transition: '0.3s'
                        }}
                      >
                        {didWash ? 'SÍ' : 'NO'}
                      </button>
                    </div>

                    {didWash && (
                      <div className="animate-fade-in">
                        <select 
                          value={selectedWasherId}
                          onChange={e => setSelectedWasherId(e.target.value)}
                          style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                        >
                          <option value="">Seleccionar Asistente de Lavado</option>
                          {allStaff
                            .filter(s => s.role?.includes('Asistente de Lavado'))
                            .map(s => {
                              // We simulate availability: if there's only 1, she's always available for this checkout.
                              // Since we don't track real-time washer assignment during 'En Silla', we show them as Disponible.
                              return (
                                <option key={s.id} value={s.id}>
                                  {s.name} (${s.washing_rate || 0}/wash) - Disponible
                                </option>
                              );
                            })
                          }
                        </select>
                        {allStaff.filter(s => s.role?.includes('Asistente de Lavado')).length > 1 && !selectedWasherId && (
                          <div style={{ marginTop: '8px', fontSize: '11px', color: '#ff9500', fontWeight: '800' }}>
                            ⚠️ Hay múltiples asistentes. Por favor selecciona una.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Dynamic Tips Section */}
                <div style={{ paddingTop: '10px', borderTop: '1px dashed rgba(255,255,255,0.1)', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                      <TrendingUp size={14} color="var(--gold-primary)" /> PROPINAS
                    </span>
                    <button 
                      onClick={() => setTips([...tips, { id: Date.now().toString(), staffId: allStaff[0]?.id || '', amount: 0 }])}
                      style={{ background: 'rgba(212,175,55,0.1)', border: 'none', color: 'var(--gold-primary)', borderRadius: '8px', padding: '4px 8px', fontSize: '10px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Plus size={12} /> AGREGAR PROPINA
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {tips.map((t, idx) => (
                      <div key={t.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }} className="animate-fade-in">
                        <select 
                          value={t.staffId} 
                          onChange={(e) => {
                            const newTips = [...tips];
                            newTips[idx].staffId = e.target.value;
                            setTips(newTips);
                          }}
                          style={{ flex: 1, height: '36px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0 8px' }}
                        >
                          <option value="" disabled>Seleccionar Integrante</option>
                          {allStaff.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                        <div style={{ position: 'relative', width: '80px' }}>
                          <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', opacity: 0.5 }}>$</span>
                          <input 
                            type="number" 
                            placeholder="0"
                            value={t.amount || ''} 
                            onChange={(e) => {
                              const newTips = [...tips];
                              newTips[idx].amount = parseFloat(e.target.value) || 0;
                              setTips(newTips);
                            }}
                            style={{ width: '100%', height: '36px', textAlign: 'right', background: 'rgba(212,175,55,0.1)', border: 'none', borderRadius: '10px', color: 'var(--gold-primary)', fontWeight: '800', paddingRight: '12px' }} 
                          />
                        </div>
                        <button 
                          onClick={() => setTips(tips.filter(item => item.id !== t.id))}
                          style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', padding: '4px' }}
                        >
                          <Minus size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '16px' }}>
                  <span style={{ fontSize: '18px', fontWeight: '900' }}>TOTAL A PAGAR</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '32px', fontWeight: '950', color: 'var(--gold-primary)' }}>${totalUsd}</div>
                    <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>≈ {totalBs} BS</div>
                  </div>
                </div>
              </div>

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

      {/* Product Selection Modal */}
      {showProductModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className="glass-card animate-scale-in" style={{ maxWidth: '600px', width: '100%', borderRadius: '32px', border: '1.5px solid rgba(212,175,55,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontWeight: '900' }}>Seleccionar Productos</h2>
              <button onClick={() => {setShowProductModal(false); setSearchTerm('');}} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
            </div>
            <div style={{ position: 'relative', marginBottom: '24px' }}>
              <Search style={{ position: 'absolute', left: '16px', top: '14px' }} size={18} color="var(--gold-primary)" />
              <input type="text" placeholder="Buscar producto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '14px 48px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: 'white' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
              {inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).map(item => (
                <button key={item.id} onClick={() => handleAddToCart(item)} style={{ padding: '16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', textAlign: 'center', cursor: 'pointer' }} className="hover-item">
                  {item.image_url && <img src={item.image_url} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '12px', marginBottom: '10px' }} alt="" />}
                  <div style={{ fontWeight: '800', fontSize: '13px', marginBottom: '4px', color: 'white' }}>{item.name}</div>
                  <div style={{ color: 'var(--gold-primary)', fontWeight: '900' }}>
                    <div>${item.price}</div>
                    {rates?.usd > 0 && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>≈ {Math.round(item.price * rates.usd).toLocaleString()} Bs.</div>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Extras Selection Modal */}
      {showExtraModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className="glass-card animate-scale-in" style={{ maxWidth: '500px', width: '100%', borderRadius: '32px', border: '1.5px solid rgba(212,175,55,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontWeight: '900' }}>Servicios Extras</h2>
              <button onClick={() => setShowExtraModal(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '10px' }}>
              {allExtras.map(extra => (
                <button key={extra.id} onClick={() => handleAddExtra(extra)} style={{ padding: '20px', borderRadius: '20px', border: '1px solid rgba(212,175,55,0.2)', background: 'rgba(212,175,55,0.02)', textAlign: 'left', cursor: 'pointer' }} className="hover-item">
                  <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '4px', color: 'white' }}>{extra.name}</div>
                  <div style={{ color: 'var(--gold-primary)', fontWeight: '900' }}>
                    <div>${extra.price}</div>
                    {rates?.usd > 0 && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>≈ {Math.round(extra.price * rates.usd).toLocaleString()} Bs.</div>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Service Modal */}
      {showServiceModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '80px', overflowY: 'auto' }}>
          <div className="glass-card animate-scale-in" style={{ width: '100%', maxWidth: '600px', borderRadius: '32px', padding: '32px', marginBottom: '80px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontWeight: '900' }}>Catálogo de Servicios</h2>
              <button onClick={() => setShowServiceModal(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '10px' }}>
              {allServices.map(service => (
                <button key={service.id} onClick={() => handleAddService(service)} style={{ padding: '20px', borderRadius: '20px', border: '1px solid rgba(212,175,55,0.2)', background: 'rgba(212,175,55,0.02)', textAlign: 'left', cursor: 'pointer' }} className="hover-item">
                  <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '4px', color: 'white' }}>{service.name}</div>
                  <div style={{ color: 'var(--gold-primary)', fontWeight: '900' }}>
                    <div>${service.price}</div>
                    {rates?.usd > 0 && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>≈ {Math.round(service.price * rates.usd).toLocaleString()} Bs.</div>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Barber Select Modal */}
      {showBarberModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className="glass-card animate-scale-in" style={{ width: '100%', maxWidth: '400px', borderRadius: '32px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontWeight: '900', fontSize: '20px' }}>Seleccionar Barbero</h2>
              <button onClick={() => setShowBarberModal(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '13px' }}>
              Selecciona el barbero al que se le asignará la comisión por el servicio <strong>{selectedServiceForBarber?.name}</strong>.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
              {allStaff.filter(s => s.role?.includes('Barbero')).map(barber => (
                <button 
                  key={barber.id} 
                  onClick={() => handleConfirmServiceBarber(barber.id)} 
                  style={{ padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }} 
                  className="hover-item"
                >
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--gold-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black' }}>
                    <Scissors size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: '800', color: 'white', fontSize: '15px' }}>{barber.name}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <NewClientModal 
        isOpen={showNewClientModal}
        onClose={() => setShowNewClientModal(false)}
        onSuccess={handleNewClientSuccess}
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
