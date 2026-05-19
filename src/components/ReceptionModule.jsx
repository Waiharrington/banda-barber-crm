import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  UserPlus, 
  Scissors, 
  Calendar, 
  Zap,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShoppingBag,
  Rocket,
  X,
  Package,
  Edit3
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import AstroSelect from './AstroSelect';
import NewClientModal from './NewClientModal';
import ScheduleModal from './ScheduleModal';
import { supabase } from '../lib/supabase';

const ReceptionModule = ({ isMobile }) => {
  const { showToast, triggerConfetti, triggerRocket } = useNotifs();
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedServices, setSelectedServices] = useState([]);
  const [allExtras, setAllExtras] = useState([]);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [idSearch, setIdSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  // Modals
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isExtraModalOpen, setIsExtraModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  
  const [activeAppointments, setActiveAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [exchangeRate, setExchangeRate] = useState(58); // Default
  
  const [formData, setFormData] = useState({
    serviceId: '',
    staffId: '',
    status: 'En Silla' // Default flow: receive and sit
  });

  useEffect(() => {
    loadData();
    // Auto-refresh every minute to update countdowns
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [c, s, st, active, ext, inv, allApps, rates] = await Promise.all([
        dataService.getClients(),
        dataService.getServices(),
        dataService.getStaff(),
        dataService.getAppointmentsByState(['En Silla']),
        dataService.getExtras(),
        dataService.getInventory(),
        dataService.getAppointmentsByState(['Agendado']),
        dataService.getGlobalRates()
      ]);
      setClients(c);
      setServices(s);
      setStaff(st.filter(member => {
        const role = (member.role || 'Barbero').toLowerCase();
        return role.includes('barber') && !role.includes('asistente') && !role.includes('admin');
      }));
      setActiveAppointments(active);
      setAllExtras(ext || []);
      setInventory(inv.filter(i => 
        i.is_for_sale !== false && 
        i.category === 'Venta'
      ));
      
      const today = new Date().toISOString().split('T')[0];
      setUpcomingAppointments(allApps.filter(a => a.scheduled_at?.startsWith(today) || a.created_at?.startsWith(today)));

      if (rates && rates.shop) {
        setExchangeRate(rates.shop);
      } else {
        const bcv = await dataService.getExchangeRates();
        setExchangeRate(bcv.usd || 58);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartAppointment = async (id) => {
    try {
      setLoading(true);
      await dataService.updateAppointmentStatus(id, 'En Silla');
      showToast("¡Servicio iniciado! El cliente ya está en silla.");
      triggerRocket();
      loadData();
    } catch (error) {
      showToast("Error al iniciar servicio", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleIdSearch = () => {
    if (searchResults.length === 1) {
      handleSelectClient(searchResults[0]);
    } else {
      const exact = clients.find(c => c.id_card === idSearch || c.name.toLowerCase() === idSearch.toLowerCase());
      if (exact) {
        handleSelectClient(exact);
      } else if (searchResults.length > 1) {
        showToast("Múltiples coincidencias. Selecciona uno de la lista.", "info");
      } else {
        showToast("Cliente no encontrado. Proceda a registrarlo.", "warning");
      }
    }
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setIdSearch('');
    setSearchResults([]);
    showToast(`Cliente identificado: ${client.name}`);
  };

  const handleSearchInput = (val) => {
    setIdSearch(val);
    if (val.length >= 2) {
      const term = val.toLowerCase();
      const results = clients.filter(c => 
        (c.id_card && c.id_card.toLowerCase().includes(term)) || 
        (c.name && c.name.toLowerCase().includes(term))
      );
      setSearchResults(results.slice(0, 5));
    } else {
      setSearchResults([]);
    }
  };

  const toggleService = (serviceId) => {
    const exists = selectedServices.find(s => s.id === serviceId);
    if (exists) {
      setSelectedServices(selectedServices.filter(s => s.id !== serviceId));
      return;
    }
    
    const service = services.find(s => s.id === serviceId);
    if (service) {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const handleCreateClient = () => {
    setIsNewClientModalOpen(true);
  };

  const handleNewClientSuccess = (newClient) => {
    setClients([...clients, newClient]);
    setSelectedClient(newClient);
  };

  const handleScheduleClick = () => {
    if (!selectedClient || selectedServices.length === 0 || !formData.staffId) {
      showToast("Selecciona cliente, servicio y barbero primero", "warning");
      return;
    }
    setIsScheduleModalOpen(true);
  };
  
  const toggleExtra = (extra) => {
    const exists = selectedExtras.find(e => e.id === extra.id);
    if (exists) {
      setSelectedExtras(selectedExtras.filter(e => e.id !== extra.id));
    } else {
      // Add with default price as initial customPrice
      setSelectedExtras([...selectedExtras, { ...extra, customPrice: extra.price }]);
    }
  };

  const updateExtraPrice = (id, newPrice) => {
    setSelectedExtras(selectedExtras.map(e => 
      e.id === id ? { ...e, customPrice: parseFloat(newPrice) || 0 } : e
    ));
  };

  const [editingExtraPriceId, setEditingExtraPriceId] = useState(null);
  
  const toggleProduct = (product) => {
    const exists = selectedProducts.find(p => p.id === product.id);
    if (exists) {
      setSelectedProducts(selectedProducts.filter(p => p.id !== product.id));
    } else {
      setSelectedProducts([...selectedProducts, { ...product, quantity: 1 }]);
    }
  };

  const handleSubmit = async (statusOverride, scheduledAt = null) => {
    const isProductOnly = selectedServices.length === 0 && selectedExtras.length === 0 && selectedProducts.length > 0;
    
    if (!selectedClient) {
      showToast("Selecciona un cliente primero", "error");
      return;
    }

    if (selectedServices.length === 0 && selectedExtras.length === 0 && selectedProducts.length === 0) {
      showToast("Agrega al menos un servicio, extra o producto", "error");
      return;
    }

    const hasStaffRequired = selectedServices.length > 0 || selectedExtras.length > 0;
    if (hasStaffRequired && !formData.staffId) {
      showToast("Selecciona un barbero", "error");
      return;
    }

    try {
      setLoading(true);
      
      // We process multiple services as individual appointments/lines for now 
      // but linked to the same event. In a complex DB we'd have a Transaction table.
      let appointments = [];
      
      if (isProductOnly) {
        // Create a shell appointment for the products to live in
        const { data: directSale, error: dsError } = await supabase
          .from('appointments')
          .insert([{
            client_id: selectedClient.id,
            status: 'Por Pagar',
            total_price: selectedProducts.reduce((acc, p) => acc + (p.price * p.quantity), 0)
          }])
          .select()
          .single();
        
        if (dsError) throw dsError;
        appointments = [directSale];
      } else {
        if (selectedServices.length > 0) {
          const promises = selectedServices.map(service => 
            dataService.createAppointment({
              client_id: selectedClient.id,
              service_id: service.id,
              staff_id: formData.staffId,
              status: statusOverride || formData.status,
              total_price: service.price,
              scheduled_at: scheduledAt
            })
          );
          appointments = await Promise.all(promises);
        } else {
          // Only extras (no main services)
          const shellApp = await dataService.createAppointment({
            client_id: selectedClient.id,
            service_id: null,
            staff_id: formData.staffId,
            status: statusOverride || formData.status,
            total_price: 0,
            scheduled_at: scheduledAt
          });
          appointments = [shellApp];
        }
      }
      
      // If there are extras/products, link them to the first appointment
      if (appointments.length > 0) {
        const mainAppId = appointments[0].id;
        
        const extraPromises = selectedExtras.map(extra => 
          dataService.addExtraToAppointment(mainAppId, extra.id, extra.customPrice ?? extra.price)
        );
        
        const productPromises = selectedProducts.map(prod => 
          dataService.addProductToAppointment(mainAppId, prod.id, prod.quantity, prod.price)
        );
        
        await Promise.all([...extraPromises, ...productPromises]);
      }

      showToast(isProductOnly ? "Venta enviada a caja" : (scheduledAt ? `¡Cita agendada para las ${new Date(scheduledAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}!` : `¡Orden enviada! ${selectedServices.length} servicios en cola.`));
      if (!statusOverride || statusOverride === 'En Silla') triggerRocket();
      
      // Reset
      setSelectedClient(null);
      setSelectedServices([]);
      setSelectedExtras([]);
      setSelectedProducts([]);
      setFormData({ serviceId: '', staffId: '', status: 'En Silla' });
      setIsScheduleModalOpen(false);
      loadData();
     } catch (error) {
      showToast("Error al procesar orden", "error");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '100px' }}>
      <header style={{ marginBottom: '40px', textAlign: isMobile ? 'center' : 'left' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '900' }}>Recepción <span className="text-gold">Astro</span></h1>
        <p style={{ color: 'var(--text-secondary)' }}>Módulo de atención y agendamiento rápido.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr', gap: '32px' }}>
        
        {/* Step 1: Client Selection */}
        <section>
          <div className="glass-card" style={{ marginBottom: '24px', borderRadius: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Users size={20} color="var(--gold-primary)" />
                <span style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>1. Cliente</span>
              </div>
              <button 
                onClick={handleCreateClient}
                style={{ background: 'rgba(212,175,55,0.1)', border: 'none', color: 'var(--gold-primary)', padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <UserPlus size={14} /> Nuevo
              </button>
            </div>

            {selectedClient ? (
              <div className="animate-scale-in" style={{ padding: '20px', backgroundColor: 'rgba(212,175,55,0.05)', borderRadius: '16px', border: '1px solid rgba(212,175,55,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '18px' }}>{selectedClient.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>V-{selectedClient.id_card}</div>
                  </div>
                  <button onClick={() => setSelectedClient(null)} style={{ background: 'none', border: 'none', color: '#ff453a', fontWeight: '800', cursor: 'pointer' }}>Cambiar</button>
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search style={{ position: 'absolute', left: '16px', top: '14px' }} size={18} color="var(--text-muted)" />
                    <input 
                      type="text" 
                      placeholder="Escribe Nombre o Cédula..." 
                      value={idSearch}
                      onChange={(e) => handleSearchInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleIdSearch()}
                      style={{ width: '100%', paddingLeft: '48px', height: '48px' }}
                    />
                  </div>
                  <button onClick={handleIdSearch} className="btn-gold" style={{ width: '48px', height: '48px', padding: 0, borderRadius: '12px' }}>
                    <ArrowRight size={20} />
                  </button>
                </div>
                
                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="animate-scale-in" style={{ 
                    position: 'absolute', top: '100%', left: 0, right: '58px', 
                    marginTop: '8px', background: 'rgba(28,28,30,0.95)', 
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', 
                    overflow: 'hidden', zIndex: 10, backdropFilter: 'blur(10px)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                  }}>
                    {searchResults.map(c => (
                      <div 
                        key={c.id} 
                        onClick={() => handleSelectClient(c)}
                        style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(212,175,55,0.1)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <span style={{ fontWeight: '700', fontSize: '14px', color: 'white' }}>{c.name}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>V-{c.id_card}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="glass-card" style={{ borderRadius: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <Scissors size={20} color="var(--gold-primary)" />
              <span style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>2. Detalle de la Orden</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '24px' }}>
              <button 
                onClick={() => setIsServiceModalOpen(true)}
                style={{ background: 'rgba(212,175,55,0.05)', border: '1px dashed rgba(212,175,55,0.3)', padding: '12px', borderRadius: '16px', color: 'var(--gold-primary)', fontWeight: '800', fontSize: '11px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
              >
                <Scissors size={18} /> + SERVICIO
              </button>
              <button 
                onClick={() => setIsExtraModalOpen(true)}
                style={{ background: 'rgba(212,175,55,0.05)', border: '1px dashed rgba(212,175,55,0.3)', padding: '12px', borderRadius: '16px', color: 'var(--gold-primary)', fontWeight: '800', fontSize: '11px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
              >
                <Rocket size={18} /> + EXTRA
              </button>
              <button 
                onClick={() => setIsProductModalOpen(true)}
                style={{ background: 'rgba(212,175,55,0.05)', border: '1px dashed rgba(212,175,55,0.3)', padding: '12px', borderRadius: '16px', color: 'var(--gold-primary)', fontWeight: '800', fontSize: '11px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
              >
                <ShoppingBag size={18} /> + PRODUCTO
              </button>
            </div>

            {(selectedServices.length > 0 || selectedExtras.length > 0 || selectedProducts.length > 0) && (
              <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '20px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedServices.map(s => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'white', fontWeight: '700' }}>{s.name}</span>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          <span style={{ color: 'var(--gold-primary)', fontWeight: '800' }}>{(s.price * exchangeRate).toLocaleString('es-VE', {minimumFractionDigits: 2})} Bs.</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: '600' }}>Ref: ${s.price}</span>
                        </div>
                        <button onClick={() => toggleService(s.id)} style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', fontSize: '14px', marginLeft: '4px' }}>&times;</button>
                      </div>
                    </div>
                  ))}
                  {selectedExtras.map(e => (
                    <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)' }}>+ {e.name}</span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {editingExtraPriceId === e.id ? (
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <span style={{ position: 'absolute', left: '6px', fontSize: '10px', color: 'var(--gold-primary)', fontWeight: '800' }}>$</span>
                            <input 
                              type="number"
                              autoFocus
                              value={e.customPrice}
                              onChange={(val) => updateExtraPrice(e.id, val.target.value)}
                              onBlur={() => setEditingExtraPriceId(null)}
                              onKeyDown={(key) => key.key === 'Enter' && setEditingExtraPriceId(null)}
                              style={{ width: '60px', height: '24px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--gold-primary)', borderRadius: '4px', color: 'white', paddingLeft: '14px', fontSize: '12px', fontWeight: '800', textAlign: 'right' }}
                            />
                          </div>
                        ) : (
                          <div 
                            onClick={() => setEditingExtraPriceId(e.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', transition: 'all 0.2s' }}
                            onMouseOver={(ev) => ev.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                            onMouseOut={(ev) => ev.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                              <span style={{ color: 'var(--gold-primary)', fontWeight: '800' }}>{((e.customPrice ?? e.price) * exchangeRate).toLocaleString('es-VE', {minimumFractionDigits: 2})} Bs.</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: '600' }}>Ref: ${e.customPrice ?? e.price}</span>
                                <Edit3 size={8} color="var(--text-muted)" />
                              </div>
                            </div>
                          </div>
                        )}
                        <button onClick={() => toggleExtra(e)} style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', padding: '0 4px' }}>&times;</button>
                      </div>
                    </div>
                  ))}
                  {selectedProducts.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#32d74b' }}>📦 {p.name}</span>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          <span style={{ color: 'var(--gold-primary)', fontWeight: '800' }}>{(p.price * exchangeRate).toLocaleString('es-VE', {minimumFractionDigits: 2})} Bs.</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: '600' }}>Ref: ${p.price}</span>
                        </div>
                        <button onClick={() => toggleProduct(p)} style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', fontSize: '14px', marginLeft: '4px' }}>&times;</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'right', fontWeight: '900', color: 'var(--gold-primary)' }}>
                  <div style={{ fontSize: '18px' }}>
                    TOTAL: {((selectedServices.reduce((acc, s) => acc + s.price, 0) + selectedExtras.reduce((acc, e) => acc + (e.customPrice ?? e.price), 0) + selectedProducts.reduce((acc, p) => acc + (p.price * p.quantity), 0)) * exchangeRate).toLocaleString('es-VE', {minimumFractionDigits: 2})} Bs.
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    REF: ${selectedServices.reduce((acc, s) => acc + s.price, 0) + selectedExtras.reduce((acc, e) => acc + (e.customPrice ?? e.price), 0) + selectedProducts.reduce((acc, p) => acc + (p.price * p.quantity), 0)}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '12px' }}>BARBEROS (DISPONIBILIDAD EN VIVO)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px' }}>
                {staff.map(s => {
                  const active = activeAppointments.find(a => a.staff_id === s.id);
                  const isBusy = !!active;
                  let timeLeft = 0;
                  
                  if (isBusy && active.started_at) {
                    const startTime = new Date(active.started_at);
                    const duration = active.services?.duration || 30;
                    const endTime = new Date(startTime.getTime() + duration * 60000);
                    timeLeft = Math.max(0, Math.ceil((endTime - new Date()) / 60000));
                  }

                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        if (formData.staffId === s.id) {
                          setFormData({...formData, staffId: ''});
                        } else {
                          setFormData({...formData, staffId: s.id});
                        }
                      }}
                      style={{
                        padding: '16px 8px',
                        borderRadius: '20px',
                        border: formData.staffId === s.id ? '2px solid var(--gold-primary)' : isBusy ? '1px solid rgba(255,69,58,0.3)' : '1px solid var(--border-color)',
                        backgroundColor: formData.staffId === s.id ? 'rgba(212,175,55,0.1)' : isBusy ? 'rgba(255,69,58,0.05)' : 'rgba(255,255,255,0.02)',
                        color: formData.staffId === s.id ? 'var(--gold-primary)' : 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.3s',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {isBusy && (
                        <div style={{ 
                          position: 'absolute', 
                          top: 0, 
                          right: 0, 
                          backgroundColor: '#ff453a', 
                          color: 'white', 
                          fontSize: '8px', 
                          padding: '2px 6px', 
                          fontWeight: '900',
                          borderBottomLeftRadius: '8px'
                        }}>
                          BUSY
                        </div>
                      )}
                      
                      <div style={{ 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '50%', 
                        backgroundColor: isBusy ? 'rgba(255,69,58,0.1)' : 'rgba(255,255,255,0.05)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: isBusy ? '#ff453a' : 'inherit'
                      }}>
                        <Users size={18} />
                      </div>
                      
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', fontWeight: '800' }}>{s.name.split(' ')[0]}</div>
                        {isBusy ? (
                          <div style={{ fontSize: '9px', color: '#ff453a', fontWeight: '700', marginTop: '2px' }}>
                            {timeLeft > 0 ? `Libre: ${timeLeft}m` : 'Por terminar'}
                          </div>
                        ) : (
                          <div style={{ fontSize: '9px', color: '#32d74b', fontWeight: '700', marginTop: '2px' }}>Disponible</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Upcoming Appointments List */}
            <div style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Calendar size={16} color="var(--gold-primary)" />
                <span style={{ fontWeight: '800', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--gold-primary)' }}>Próximas Citas (Agenda Hoy)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {upcomingAppointments.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.1)', fontSize: '12px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px' }}>No hay más citas para hoy</div>
                ) : (
                  upcomingAppointments.map(app => (
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
        </section>

        {/* Action Panel */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-card" style={{ borderRadius: '24px', background: 'linear-gradient(135deg, rgba(28,28,30,0.9), rgba(212,175,55,0.05))', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '40px 30px' }}>
            {!selectedClient ? (
              <>
                <Search size={48} color="rgba(255,255,255,0.1)" style={{ marginBottom: '20px' }} />
                <h3 style={{ color: 'var(--text-muted)' }}>Identifica al cliente</h3>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.2)', marginTop: '8px' }}>Ingresa la Cédula para cargar su ficha técnica.</p>
              </>
            ) : selectedServices.length === 0 && selectedProducts.length === 0 && selectedExtras.length === 0 ? (
              <>
                <Scissors size={48} color="rgba(212,175,55,0.2)" style={{ marginBottom: '20px' }} />
                <h3 style={{ color: 'var(--text-secondary)' }}>Añade productos o servicios</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>Selecciona lo que el cliente desea adquirir.</p>
              </>
            ) : (
              <div className="animate-slide-up" style={{ width: '100%' }}>
                <CheckCircle2 size={56} color="var(--gold-primary)" style={{ marginBottom: '24px' }} />
                <h3 style={{ fontSize: '24px', marginBottom: '8px' }}>Todo Listo</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
                  Confirmación para <span style={{ color: 'white', fontWeight: '800' }}>{selectedClient.name}</span>
                </p>

                {/* Detailed Summary for Confirmation */}
                <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '20px', padding: '20px', marginBottom: '32px', textAlign: 'left', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '1px', marginBottom: '12px', textTransform: 'uppercase' }}>Resumen de Atención</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedServices.map(s => (
                      <div key={s.id}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Scissors size={14} color="var(--gold-primary)" />
                          <span style={{ fontSize: '13px', fontWeight: '700' }}>{s.name}</span>
                        </div>
                        {s.included_items && s.included_items.length > 0 && (
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '24px', marginTop: '2px' }}>
                            Incluye: {s.included_items.join(' • ')}
                          </div>
                        )}
                      </div>
                    ))}
                    {selectedExtras.map(e => (
                      <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Rocket size={14} color="var(--gold-primary)" />
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{e.name} (Extra)</span>
                      </div>
                    ))}
                    {selectedProducts.map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ShoppingBag size={14} color="#32d74b" />
                        <span style={{ fontSize: '13px', color: '#32d74b' }}>{p.name}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <Users size={14} color="var(--text-muted)" />
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Barbero: <span style={{ color: 'white', fontWeight: '700' }}>{staff.find(s => s.id === formData.staffId)?.name || 'No seleccionado'}</span></span>
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                  {(selectedServices.length > 0 || selectedExtras.length > 0) ? (
                    <>
                      <button 
                        disabled={loading || (formData.staffId && activeAppointments.some(a => a.staff_id === formData.staffId))}
                        onClick={() => handleSubmit('En Silla')}
                        className="btn-gold" 
                        style={{ 
                          height: '60px', 
                          borderRadius: '18px', 
                          fontSize: '16px',
                          opacity: (formData.staffId && activeAppointments.some(a => a.staff_id === formData.staffId)) ? 0.5 : 1,
                          cursor: (formData.staffId && activeAppointments.some(a => a.staff_id === formData.staffId)) ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <Zap size={20} fill="currentColor" /> 
                        {activeAppointments.some(a => a.staff_id === formData.staffId) ? 'BARBERO OCUPADO' : 'INICIAR AHORA'}
                      </button>
                      
                      {activeAppointments.some(a => a.staff_id === formData.staffId) && (
                        <p style={{ fontSize: '11px', color: '#ff453a', fontWeight: '700', marginTop: '-4px' }}>
                          Usa "Agendar para después" para poner al cliente en cola.
                        </p>
                      )}

                      <button 
                        disabled={loading}
                        onClick={handleScheduleClick}
                        style={{ background: 'none', border: '1px solid var(--border-color)', color: 'white', height: '56px', borderRadius: '18px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                      >
                        <Calendar size={18} /> AGENDAR PARA DESPUÉS
                      </button>
                    </>
                  ) : (
                    <button 
                      disabled={loading}
                      onClick={() => handleSubmit('Por Pagar')}
                      className="btn-gold" 
                      style={{ height: '60px', borderRadius: '18px', fontSize: '16px', backgroundColor: '#32d74b', color: 'black', border: 'none' }}
                    >
                      <ShoppingBag size={20} /> ENVIAR A CAJA (PRODUCTOS)
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <NewClientModal 
        isOpen={isNewClientModalOpen} 
        onClose={() => setIsNewClientModalOpen(false)}
        onSuccess={handleNewClientSuccess}
      />

      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        client={selectedClient}
        staff={staff.find(s => s.id === formData.staffId)}
        service={selectedServices[0]}
        onSchedule={(date) => handleSubmit('Agendado', date)}
      />

      {/* Selection Modals */}
      <SelectionModal 
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        title="Seleccionar Servicios"
        icon={<Scissors size={24} color="var(--gold-primary)" />}
        items={services}
        selectedItems={selectedServices}
        onToggle={(s) => toggleService(s.id)}
        exchangeRate={exchangeRate}
      />

      <SelectionModal 
        isOpen={isExtraModalOpen}
        onClose={() => setIsExtraModalOpen(false)}
        title="Añadir Extras"
        icon={<Rocket size={24} color="var(--gold-primary)" />}
        items={allExtras}
        selectedItems={selectedExtras}
        onToggle={toggleExtra}
        exchangeRate={exchangeRate}
      />

      <SelectionModal 
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title="Venta de Productos"
        icon={<ShoppingBag size={24} color="var(--gold-primary)" />}
        items={inventory}
        selectedItems={selectedProducts}
        onToggle={toggleProduct}
        exchangeRate={exchangeRate}
      />

      <style>{`
        .hover-item:hover {
          background-color: rgba(212,175,55,0.1) !important;
          transform: translateX(5px);
        }
      `}</style>
    </div>
  );
};

const SelectionModal = ({ isOpen, onClose, title, icon, items, selectedItems, onToggle, exchangeRate = 58 }) => {
  if (!isOpen) return null;
  
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="glass-card animate-scale-in" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: '32px', border: '1px solid rgba(212,175,55,0.2)', padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {icon}
            <h3 style={{ fontSize: '20px', fontWeight: '800' }}>{title}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {items.map(item => {
              const isSelected = selectedItems.find(si => si.id === item.id);
              return (
                <button 
                  key={item.id}
                  onClick={() => onToggle(item)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '16px',
                    border: isSelected ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)',
                    background: isSelected ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.02)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%'
                  }}
                >
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '10px', 
                    background: isSelected ? 'var(--gold-primary)' : 'rgba(255,255,255,0.05)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    flexShrink: 0 
                  }}>
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', borderRadius: '10px', objectFit: 'cover' }} />
                    ) : (
                      <Package size={20} color={isSelected ? 'black' : 'rgba(255,255,255,0.2)'} />
                    )}
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: isSelected ? 'var(--gold-primary)' : 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginLeft: '10px' }}>
                        <div style={{ fontSize: '15px', fontWeight: '900', color: 'var(--gold-primary)' }}>{(item.price * exchangeRate).toLocaleString('es-VE', {minimumFractionDigits: 2})} Bs.</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Ref: ${item.price}</div>
                      </div>
                    </div>
                    {item.included_items && item.included_items.length > 0 && (
                      <div style={{ 
                        fontSize: '10px', 
                        color: isSelected ? 'rgba(212,175,55,0.6)' : 'var(--text-muted)', 
                        marginTop: '2px',
                        lineHeight: '1.4'
                      }}>
                        {item.included_items.join(' • ')}
                      </div>
                    )}
                  </div>

                  {isSelected && (
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckCircle2 size={14} color="black" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <button 
          onClick={onClose}
          className="btn-gold"
          style={{ marginTop: '24px', height: '54px', borderRadius: '16px' }}
        >
          LISTO
        </button>
      </div>
    </div>
  );
};

export default ReceptionModule;
