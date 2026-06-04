import React, { useState, useEffect, useCallback } from 'react';
import { 
  Scissors, 
  Camera, 
  CheckCircle, 
  Clock, 
  User, 
  CameraOff,
  ChevronRight,
  TrendingUp,
  Award,
  Zap,
  LogOut,
  Trash2,
  RefreshCw,
  Edit3,
  Droplets
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import AstroCamera from './AstroCamera';
import { Plus, ShoppingBag, Loader2 } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { notificationService } from '../services/notificationService';

const BarberPanel = ({ isMobile, rates }) => {
  const { user } = useAuth();
  const { showToast, triggerConfetti, triggerRocket } = useNotifs();
  const [staff, setStaff] = useState([]);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [myServices, setMyServices] = useState([]);
  const [completedToday, setCompletedToday] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // New States for Extras/Products
  const [allExtras, setAllExtras] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeAppId, setActiveAppId] = useState(null);
  const [addMode, setAddMode] = useState('extra'); // 'extra' or 'product'

  // Photo States
  const [showCamera, setShowCamera] = useState(false);
  const [cameraTarget, setCameraTarget] = useState({ appId: null, type: 'Antes' });
  const [editingExtraPriceId, setEditingExtraPriceId] = useState(null);
  const [selectedCompletedApp, setSelectedCompletedApp] = useState(null);

  const handleUpdateExtraPrice = async (extraId, newPrice) => {
    try {
      setLoading(true);
      await dataService.updateAppointmentExtraPrice(extraId, parseFloat(newPrice) || 0);
      showToast("Precio actualizado");
      await loadMyWork();
      await loadStats();
    } catch (e) {
      showToast("Error al actualizar precio", "error");
    } finally {
      setLoading(false);
      setEditingExtraPriceId(null);
    }
  };

  const [stats, setStats] = useState({ production: 0, services: 0, earnings: 0 });

  useEffect(() => {
    loadStaff();
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      const [extras, items] = await Promise.all([
        dataService.getExtras(),
        dataService.getInventory()
      ]);
      setAllExtras(extras);
      setInventory(items);
    } catch (err) {
      console.error(err);
    }
  };

  // Auto-select if current user is a selectable staff member
  useEffect(() => {
    if (staff.length > 0 && user) {
      const roleName = (user.role || '').toLowerCase();
      const isSelectableRole = !roleName.includes('admin') && !roleName.includes('recepcionista') && !roleName.includes('caja');
      if (isSelectableRole) {
        const me = staff.find(s => s.id === user.id);
        if (me) setSelectedBarber(me);
      }
    }
  }, [staff, user]);

  const loadMyWork = useCallback(async () => {
    if (!selectedBarber) return;
    try {
      setLoading(true);
      const isAssistant = selectedBarber.role?.toLowerCase().includes('asistente');
      const states = isAssistant ? ['En Silla', 'En Lavado'] : ['En Silla', 'Agendado', 'En Lavado'];
      const data = await dataService.getAppointmentsByState(states);
      if (isAssistant) {
        setMyServices(data);
      } else {
        const filtered = data.filter(s => String(s.staff_id) === String(selectedBarber.id));
        setMyServices(filtered);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedBarber]);

  const loadCompletedToday = useCallback(async () => {
    if (!selectedBarber) return;
    try {
      const data = await dataService.getAppointmentsByState(['Completado', 'Por Pagar']);
      const today = new Date().toISOString().split('T')[0];
      const isAssistant = selectedBarber.role?.toLowerCase().includes('asistente');
      const filtered = data.filter(s => {
        const createdDate = s.created_at ? new Date(s.created_at).toISOString().split('T')[0] : '';
        const isToday = createdDate === today;
        if (!isToday) return false;
        
        if (isAssistant) {
          return s.appointment_staff?.some(as => String(as.staff_id) === String(selectedBarber.id));
        } else {
          return String(s.staff_id) === String(selectedBarber.id);
        }
      });
      setCompletedToday(filtered);
    } catch (err) {
      console.error(err);
    }
  }, [selectedBarber]);

  useEffect(() => {
    if (selectedBarber) {
      loadMyWork();
      loadStats();
      loadCompletedToday();
      
      // Real-time listener for appointments
      const subscription = supabase
        .channel(`barber-realtime-${selectedBarber.id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'appointments' 
        }, (payload) => {
          const isAssistant = selectedBarber.role?.toLowerCase().includes('asistente');
          const isForMe = isAssistant || 
                          String(payload.new?.staff_id) === String(selectedBarber.id) || 
                          String(payload.old?.staff_id) === String(selectedBarber.id);
          
          if (isForMe) {
            if (payload.eventType === 'INSERT') {
              showToast("🚀 ¡Nueva cita asignada!");
              triggerRocket();
            } else if (payload.eventType === 'UPDATE' && payload.new.status === 'En Silla') {
              showToast("🚀 ¡Cliente listo en silla!", "success");
              triggerRocket();
            } else if (payload.eventType === 'UPDATE' && payload.new.status === 'En Lavado') {
              showToast("💧 Cliente en estación de lavado", "info");
            } else {
              showToast("Actualizando silla...", "info");
            }
            
            // Reload with a tiny delay to ensure DB consistency
            setTimeout(() => {
              loadMyWork();
              loadStats();
              loadCompletedToday();
            }, 500);
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [selectedBarber, loadMyWork, loadCompletedToday]);

  const loadStaff = async () => {
    try {
      const data = await dataService.getStaff();
      setStaff(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadStats = async () => {
    if (!selectedBarber) return;
    try {
      const isAssistant = selectedBarber.role?.toLowerCase().includes('asistente');
      if (isAssistant) {
        const data = await dataService.getAppointmentsByState(['Completado', 'Por Pagar']);
        const today = new Date().toISOString().split('T')[0];
        let count = 0;
        let earned = 0;
        data.forEach(s => {
          const createdDate = s.created_at ? new Date(s.created_at).toISOString().split('T')[0] : '';
          if (createdDate === today) {
            const myRecord = s.appointment_staff?.find(as => String(as.staff_id) === String(selectedBarber.id));
            if (myRecord) {
              count++;
              earned += Number(myRecord.commission_earned || 0);
            }
          }
        });
        setStats({ production: earned, services: count, earnings: earned });
      } else {
        const data = await dataService.getBarberDailyStats(selectedBarber.id);
        setStats({ production: data.productionUsd, services: data.services, earnings: data.earningsUsd });
      }
    } catch (err) {
      console.error("Error loading stats:", err);
    }
  };

  const handleFinishService = async (serviceId) => {
    try {
      setLoading(true);
      await dataService.updateAppointmentStatus(serviceId, 'Por Pagar');
      showToast("¡Servicio finalizado! Enviado a caja para cobro.");
      triggerConfetti();
      loadMyWork();
      loadStats();
      loadCompletedToday();
    } catch (err) {
      showToast("Error al finalizar servicio", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSendToWash = async (serviceId) => {
    try {
      setLoading(true);
      const app = myServices.find(s => s.id === serviceId);
      const clientName = app?.clients?.name || 'Cliente';

      await dataService.updateAppointmentStatus(serviceId, 'En Lavado');
      showToast("¡Cliente enviado a la estación de lavado!");
      triggerRocket();
      
      // Broadcast to wash assistants
      notificationService.broadcastNotification(
        supabase,
        '💧 Nuevo Cliente para Lavado',
        `Hey, te toca lavar a ${clientName}. (Enviado por: ${selectedBarber.name})`,
        { recipientRole: 'Asistente' }
      );

      loadMyWork();
      loadStats();
      loadCompletedToday();
    } catch (err) {
      showToast("Error al enviar a lavado", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleReturnToBarber = async (serviceId) => {
    try {
      setLoading(true);
      const app = myServices.find(s => s.id === serviceId);
      const clientName = app?.clients?.name || 'Cliente';
      const barberId = app?.staff_id;
      const barberName = app?.staff?.name || 'Barbero';

      await dataService.updateAppointmentStatus(serviceId, 'En Silla');
      showToast("¡Cliente enviado de regreso al barbero!");
      
      // Broadcast back to the specific barber
      notificationService.broadcastNotification(
        supabase,
        '💈 Cliente de regreso del Lavado',
        `Hey ${barberName}, te toca volver a atender a ${clientName}. (Lavado listo)`,
        { recipientId: barberId, recipientRole: 'Barbero' }
      );

      loadMyWork();
      loadStats();
      loadCompletedToday();
    } catch (err) {
      showToast("Error al regresar al barbero", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAssistantSendToCheckout = async (serviceId) => {
    try {
      setLoading(true);
      const app = myServices.find(s => s.id === serviceId);
      const clientName = app?.clients?.name || 'Cliente';

      // Assign this assistant to the appointment
      await dataService.assignAssistantToAppointment(serviceId, selectedBarber.id);
      // Update status to 'Por Pagar' (sent to checkout)
      await dataService.updateAppointmentStatus(serviceId, 'Por Pagar');
      showToast("¡Lavado completado! Enviado a caja.");
      triggerConfetti();

      // Broadcast to Admin / Caja
      notificationService.broadcastNotification(
        supabase,
        '💳 Cliente enviado a Caja',
        `El cliente ${clientName} terminó su lavado y fue enviado a caja.`,
        { recipientRole: 'Admin' }
      );

      loadMyWork();
      loadStats();
      loadCompletedToday();
    } catch (err) {
      showToast("Error al procesar el lavado", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoCaptured = async (image) => {
    if (!cameraTarget.appId) return;
    try {
      showToast("Sincronizando con la nube...", "info");
      const app = myServices.find(s => s.id === cameraTarget.appId);
      if (!app) return;

      // 1. Optimize Image (Small but pro)
      const img = new Image();
      img.src = image;
      await new Promise(r => img.onload = r);
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 800;
      let width = img.width;
      let height = img.height;
      if (width > MAX_WIDTH) {
        height = (MAX_WIDTH / width) * height;
        width = MAX_WIDTH;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const optimizedImage = canvas.toDataURL('image/jpeg', 0.6);

      // 2. Update Client Gallery with metadata
      const photoObj = {
        url: optimizedImage,
        type: cameraTarget.type,
        date: new Date().toISOString(),
        service_id: app.id,
        service_name: app.services.name
      };

      // 2. Fetch latest gallery from DB to avoid race conditions (overwriting)
      const { data: latestClient } = await supabase
        .from('clients')
        .select('work_gallery')
        .eq('id', app.client_id)
        .single();

      const currentGallery = Array.isArray(latestClient?.work_gallery) ? latestClient.work_gallery : [];
      const newGallery = [photoObj, ...currentGallery];
      await dataService.updateClient(app.client_id, { work_gallery: newGallery });
      
      showToast("¡Foto guardada con éxito!", "success");
      await loadMyWork();
    } catch (err) {
      console.error(err);
      showToast("Error al guardar foto", "error");
    } finally {
      setShowCamera(false);
    }
  };

  const handleAddExtra = async (extra) => {
    try {
      setLoading(true);
      await dataService.addExtraToAppointment(activeAppId, extra.id, extra.price);
      showToast(`+ ${extra.name} añadido`);
      setShowAddModal(false);
      loadMyWork();
      loadStats();
    } catch (err) {
      showToast("Error al añadir extra", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (product) => {
    try {
      setLoading(true);
      await dataService.addProductToAppointment(activeAppId, product.id, 1, product.price);
      showToast(`+ ${product.name} añadido`);
      setShowAddModal(false);
      loadMyWork();
      loadStats();
    } catch (err) {
      showToast("Error al añadir producto", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExtra = async (id) => {
    try {
      setLoading(true);
      await dataService.deleteAppointmentExtra(id);
      showToast("Extra eliminado");
      loadMyWork();
      loadStats();
    } catch (err) {
      showToast("Error al eliminar", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    try {
      setLoading(true);
      await dataService.deleteAppointmentProduct(id);
      showToast("Producto eliminado");
      loadMyWork();
      loadStats();
    } catch (err) {
      showToast("Error al eliminar", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!selectedBarber) {
    return (
      <div className="animate-fade-in" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '28px', fontWeight: '900', marginBottom: '10px' }}>Panel de <span className="text-gold">Barberos / Asistentes</span></h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>Selecciona tu perfil para comenzar tu turno.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '20px', maxWidth: '600px', margin: '0 auto' }}>
          {staff
            .filter(s => {
              const roleName = (s.role?.split('|')[0] || '').toLowerCase();
              return !roleName.includes('admin') && 
                     !roleName.includes('recepcionista') && 
                     !roleName.includes('caja');
            })
            .map(s => (
            <button 
              key={s.id} 
              onClick={() => setSelectedBarber(s)}
              className="glass-card hover-item" 
              style={{ padding: '30px 20px', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
            >
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--gold-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--gold-glow)' }}>
                <User size={32} color="black" />
              </div>
              <span style={{ fontWeight: '800', fontSize: '15px', color: 'white' }}>{s.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const isAssistant = selectedBarber?.role?.toLowerCase().includes('asistente');

  return (
    <div className="animate-fade-in" style={{ maxWidth: '550px', margin: '0 auto', paddingBottom: '100px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: isAssistant ? 'linear-gradient(135deg, #007aff, #00d2ff)' : 'var(--gold-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isAssistant ? <Droplets size={20} color="white" /> : <Scissors size={20} color="black" />}
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '900' }}>Hola, <span className="text-gold">{selectedBarber.name.split(' ')[0]}</span></h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            {isAssistant ? "Gestiona las estaciones de lavado del día." : "Gestiona tus servicios activos y citas."}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => { loadMyWork(); showToast("Sincronizado"); }}
            disabled={loading}
            style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', color: 'var(--gold-primary)', width: '40px', height: '40px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Sincronizar silla"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          {!(user?.role === 'Barbero' || user?.role?.startsWith('Barbero|')) && (
            <button 
              onClick={() => setSelectedBarber(null)}
              style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-secondary)', padding: '10px 16px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}
            >
              <LogOut size={16} /> Salir
            </button>
          )}
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr', gap: '32px' }}>
        
        {/* Active Services List */}
        {isAssistant ? (
          <section>
            {/* 1. Clientes Listos para Lavar (En Lavado) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Droplets size={18} color="#007aff" fill="#007aff" />
              <span style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>En Estación de Lavado</span>
              <span style={{ 
                marginLeft: 'auto', 
                fontSize: '12px', 
                fontWeight: '900', 
                color: 'white', 
                background: 'rgba(0,122,255,0.15)', 
                padding: '4px 12px', 
                borderRadius: '20px',
                border: '1px solid rgba(0,122,255,0.3)'
              }}>{myServices.filter(app => app.status === 'En Lavado').length}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
              {myServices.filter(app => app.status === 'En Lavado').length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '40px', borderRadius: '24px', opacity: 0.5 }}>
                  <Droplets size={32} style={{ marginBottom: '12px', color: 'var(--text-muted)' }} />
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No hay clientes listos para lavar en este momento.</p>
                </div>
              ) : (
                myServices.filter(app => app.status === 'En Lavado').map(app => (
                  <div key={app.id} className="glass-card animate-slide-up" style={{ borderRadius: '28px', padding: '24px', border: '1px solid rgba(0, 122, 255, 0.25)', background: 'linear-gradient(135deg, rgba(28,28,30,0.95), rgba(0,122,255,0.05))' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div>
                        <span style={{ fontSize: '10px', fontWeight: '900', color: '#007aff', textTransform: 'uppercase', letterSpacing: '1px' }}>Listo en Lavado</span>
                        <h3 style={{ fontSize: '20px', fontWeight: '900', marginTop: '4px' }}>{app.clients?.name}</h3>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                          Barbero: <span style={{ color: 'white', fontWeight: '700' }}>{app.staff?.name || 'Otro'}</span> · Servicio: <span style={{ color: 'var(--gold-primary)', fontWeight: '700' }}>{app.services?.name}</span>
                        </div>
                        {app.services?.included_items && app.services.included_items.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                            {app.services.included_items.map((item, idx) => (
                              <span key={idx} style={{ fontSize: '10px', fontWeight: '800', color: item.toLowerCase().includes('lavado') ? '#007aff' : 'var(--text-secondary)', background: item.toLowerCase().includes('lavado') ? 'rgba(0,122,255,0.1)' : 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '20px', border: item.toLowerCase().includes('lavado') ? '1px solid rgba(0,122,255,0.2)' : '1px solid rgba(255,255,255,0.08)' }}>
                                {item.toLowerCase().includes('lavado') ? '💧' : '✦'} {item}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '18px', fontWeight: '900' }}>${app.services?.price}</div>
                      </div>
                    </div>

                    {/* Extras and Products List for Washer */}
                    {(app.appointment_extras?.length > 0 || app.appointment_products?.length > 0) && (
                      <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {app.appointment_extras.map(ex => (
                          <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '13px', fontWeight: '600' }}>{ex.service_extras?.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {editingExtraPriceId === ex.id ? (
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                  <span style={{ position: 'absolute', left: '6px', fontSize: '10px', color: 'var(--gold-primary)', fontWeight: '800' }}>$</span>
                                  <input 
                                    type="number"
                                    autoFocus
                                    defaultValue={ex.price}
                                    onBlur={(e) => handleUpdateExtraPrice(ex.id, e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateExtraPrice(ex.id, e.target.value)}
                                    style={{ width: '60px', height: '24px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--gold-primary)', borderRadius: '4px', color: 'white', paddingLeft: '14px', fontSize: '12px', fontWeight: '800', textAlign: 'right' }}
                                  />
                                </div>
                              ) : (
                                <div 
                                  onClick={() => setEditingExtraPriceId(ex.id)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px' }}
                                >
                                  <span style={{ color: 'var(--gold-primary)', fontWeight: '800' }}>+${ex.price}</span>
                                  <Edit3 size={10} color="var(--gold-primary)" style={{ opacity: 0.6 }} />
                                </div>
                              )}
                              <button 
                                onClick={() => handleDeleteExtra(ex.id)}
                                style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                        {app.appointment_products.map(pr => (
                          <div key={pr.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '13px', fontWeight: '600' }}>{pr.inventory?.name} <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>x{pr.quantity}</span></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ color: 'var(--gold-primary)', fontWeight: '800' }}>+${pr.price * pr.quantity}</span>
                              <button 
                                onClick={() => handleDeleteProduct(pr.id)}
                                style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Extras/Products Buttons for Washer */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
                      <button 
                        onClick={() => { setActiveAppId(app.id); setAddMode('extra'); setShowAddModal(true); }}
                        style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <Plus size={14} color="var(--gold-primary)" /> Extra
                      </button>
                      <button 
                        onClick={() => { setActiveAppId(app.id); setAddMode('product'); setShowAddModal(true); }}
                        style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <ShoppingBag size={14} color="var(--gold-primary)" /> Producto
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button 
                        onClick={() => handleReturnToBarber(app.id)}
                        disabled={loading}
                        className="hover-item"
                        style={{ 
                          flex: 1, 
                          height: '48px', 
                          borderRadius: '14px', 
                          fontSize: '13px', 
                          fontWeight: '800',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        <RefreshCw size={16} /> REGRESAR A BARBERO
                      </button>
                      <button 
                        onClick={() => handleAssistantSendToCheckout(app.id)}
                        disabled={loading}
                        className="hover-item"
                        style={{ 
                          flex: 1.2, 
                          height: '48px', 
                          borderRadius: '14px', 
                          fontSize: '13px', 
                          fontWeight: '900',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          background: 'linear-gradient(135deg, #007aff, #00d2ff)',
                          border: 'none',
                          color: 'white',
                          boxShadow: '0 4px 15px rgba(0,122,255,0.3)'
                        }}
                      >
                        <CheckCircle size={16} /> COMPLETAR Y ENVIAR A CAJA
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 2. Clientes en Silla de Barbero (Con Lavado) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Scissors size={18} color="var(--gold-primary)" />
              <span style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>En Silla de Barbero (Con Lavado)</span>
              <span style={{ 
                marginLeft: 'auto', 
                fontSize: '12px', 
                fontWeight: '900', 
                color: 'white', 
                background: 'rgba(212,175,55,0.1)', 
                padding: '4px 12px', 
                borderRadius: '20px',
                border: '1px solid rgba(212,175,55,0.2)'
              }}>{
                myServices.filter(app => 
                  app.status === 'En Silla' && (
                    app.services?.included_items?.some(i => i.toLowerCase().includes('lavado')) || 
                    app.appointment_extras?.some(e => e.service_extras?.name?.toLowerCase().includes('lavado'))
                  )
                ).length
              }</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {myServices.filter(app => 
                app.status === 'En Silla' && (
                  app.services?.included_items?.some(i => i.toLowerCase().includes('lavado')) || 
                  app.appointment_extras?.some(e => e.service_extras?.name?.toLowerCase().includes('lavado'))
                )
              ).length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '30px', borderRadius: '20px', opacity: 0.4 }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Ningún barbero tiene clientes con lavado activo en este momento.</p>
                </div>
              ) : (
                myServices.filter(app => 
                  app.status === 'En Silla' && (
                    app.services?.included_items?.some(i => i.toLowerCase().includes('lavado')) || 
                    app.appointment_extras?.some(e => e.service_extras?.name?.toLowerCase().includes('lavado'))
                  )
                ).map(app => (
                  <div key={app.id} className="glass-card animate-slide-up" style={{ borderRadius: '20px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.85, background: 'rgba(255,255,255,0.02)' }}>
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'white', margin: 0 }}>{app.clients?.name}</h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                        Barbero: <span style={{ color: 'var(--gold-primary)', fontWeight: '700' }}>{app.staff?.name || 'Otro'}</span> · <span style={{ color: 'var(--text-muted)' }}>{app.services?.name}</span>
                      </p>
                      {app.services?.included_items && app.services.included_items.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                          {app.services.included_items.map((item, idx) => (
                            <span key={idx} style={{ fontSize: '9px', fontWeight: '800', color: item.toLowerCase().includes('lavado') ? '#007aff' : 'var(--text-muted)', background: item.toLowerCase().includes('lavado') ? 'rgba(0,122,255,0.1)' : 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '12px', border: item.toLowerCase().includes('lavado') ? '1px solid rgba(0,122,255,0.15)' : '1px solid rgba(255,255,255,0.06)' }}>
                              {item.toLowerCase().includes('lavado') ? '💧' : '✦'} {item}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', background: 'rgba(212,175,55,0.1)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(212,175,55,0.2)' }}>
                      EN SILLA 💈
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        ) : (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Zap size={18} color="var(--gold-primary)" fill="var(--gold-primary)" />
              <span style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>Tu Silla Hoy</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {myServices.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '60px', borderRadius: '24px', borderStyle: 'dashed', opacity: 0.5 }}>
                  <Clock size={40} style={{ marginBottom: '16px' }} />
                  <p>No tienes clientes asignados en este momento.</p>
                </div>
              ) : (
                myServices.map(app => {
                  const includesWashing = app.services?.included_items?.some(i => i.toLowerCase().includes('lavado')) || 
                                          app.appointment_extras?.some(e => e.service_extras?.name?.toLowerCase().includes('lavado'));
                  return (
                    <div key={app.id} className="glass-card animate-slide-up" style={{ borderRadius: '28px', padding: '24px', background: app.status === 'En Silla' ? 'linear-gradient(135deg, rgba(28,28,30,0.95), rgba(212,175,55,0.03))' : 'var(--bg-secondary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                        <div>
                          <span style={{ fontSize: '10px', fontWeight: '900', color: app.status === 'En Lavado' ? '#007aff' : 'var(--gold-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {app.status} {app.status === 'En Lavado' && '💧'}
                          </span>
                          <h3 style={{ fontSize: '22px', fontWeight: '900', marginTop: '4px' }}>{app.clients?.name}</h3>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '15px', marginTop: '4px' }}>{app.services?.name}</div>
                          {app.services?.included_items && app.services.included_items.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                              {app.services.included_items.map((item, idx) => (
                                <span key={idx} style={{ fontSize: '10px', fontWeight: '800', color: item.toLowerCase().includes('lavado') ? '#007aff' : 'var(--text-secondary)', background: item.toLowerCase().includes('lavado') ? 'rgba(0,122,255,0.1)' : 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '20px', border: item.toLowerCase().includes('lavado') ? '1px solid rgba(0,122,255,0.2)' : '1px solid rgba(255,255,255,0.08)' }}>
                                  {item.toLowerCase().includes('lavado') ? '💧' : '✦'} {item}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '20px', fontWeight: '900' }}>${app.services?.price}</div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                        <div 
                          onClick={() => { setCameraTarget({ appId: app.id, type: 'Antes' }); setShowCamera(true); }}
                          style={{ height: '110px', borderRadius: '16px', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px dashed rgba(212,175,55,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
                        >
                          {app.clients?.work_gallery?.find(p => p.type === 'Antes' && p.service_id === app.id) ? (
                            <img src={app.clients.work_gallery.find(p => p.type === 'Antes' && p.service_id === app.id).url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <>
                              <Camera size={20} color="var(--gold-primary)" />
                              <span style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)' }}>FOTO ANTES</span>
                            </>
                          )}
                        </div>
                        <div 
                          onClick={() => { setCameraTarget({ appId: app.id, type: 'Después' }); setShowCamera(true); }}
                          style={{ height: '110px', borderRadius: '16px', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px dashed rgba(212,175,55,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
                        >
                          {app.clients?.work_gallery?.find(p => p.type === 'Después' && p.service_id === app.id) ? (
                            <img src={app.clients.work_gallery.find(p => p.type === 'Después' && p.service_id === app.id).url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <>
                              <Camera size={20} color="var(--gold-primary)" />
                              <span style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)' }}>FOTO DESPUÉS</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Extras and Products List */}
                      {(app.appointment_extras?.length > 0 || app.appointment_products?.length > 0) && (
                        <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {app.appointment_extras.map(ex => (
                            <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ fontSize: '13px', fontWeight: '600' }}>{ex.service_extras?.name}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {editingExtraPriceId === ex.id ? (
                                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <span style={{ position: 'absolute', left: '6px', fontSize: '10px', color: 'var(--gold-primary)', fontWeight: '800' }}>$</span>
                                    <input 
                                      type="number"
                                      autoFocus
                                      defaultValue={ex.price}
                                      onBlur={(e) => handleUpdateExtraPrice(ex.id, e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && handleUpdateExtraPrice(ex.id, e.target.value)}
                                      style={{ width: '60px', height: '24px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--gold-primary)', borderRadius: '4px', color: 'white', paddingLeft: '14px', fontSize: '12px', fontWeight: '800', textAlign: 'right' }}
                                    />
                                  </div>
                                ) : (
                                  <div 
                                    onClick={() => setEditingExtraPriceId(ex.id)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px' }}
                                  >
                                    <span style={{ color: 'var(--gold-primary)', fontWeight: '800' }}>+${ex.price}</span>
                                    <Edit3 size={10} color="var(--gold-primary)" style={{ opacity: 0.6 }} />
                                  </div>
                                )}
                                <button 
                                  onClick={() => handleDeleteExtra(ex.id)}
                                  style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                          {app.appointment_products.map(pr => (
                            <div key={pr.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ fontSize: '13px', fontWeight: '600' }}>{pr.inventory?.name} <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>x{pr.quantity}</span></div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ color: 'var(--gold-primary)', fontWeight: '800' }}>+${pr.price * pr.quantity}</span>
                                <button 
                                  onClick={() => handleDeleteProduct(pr.id)}
                                  style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Extras/Products */}
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
                        <button 
                          onClick={() => { setActiveAppId(app.id); setAddMode('extra'); setShowAddModal(true); }}
                          style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                          <Plus size={14} color="var(--gold-primary)" /> Extra
                        </button>
                        <button 
                          onClick={() => { setActiveAppId(app.id); setAddMode('product'); setShowAddModal(true); }}
                          style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                          <ShoppingBag size={14} color="var(--gold-primary)" /> Producto
                        </button>
                      </div>

                      {app.status === 'En Silla' ? (
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button 
                            onClick={() => handleSendToWash(app.id)}
                            disabled={loading}
                            className="hover-item"
                            style={{ 
                              flex: 1.2, 
                              height: '56px', 
                              borderRadius: '16px', 
                              fontSize: '14px', 
                              fontWeight: '800',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              cursor: 'pointer',
                              background: includesWashing ? 'linear-gradient(135deg, #007aff, #00d2ff)' : 'rgba(0,122,255,0.15)',
                              border: includesWashing ? 'none' : '1px solid rgba(0,122,255,0.3)',
                              color: includesWashing ? 'white' : '#007aff',
                              boxShadow: includesWashing ? '0 4px 15px rgba(0,122,255,0.3)' : 'none',
                              transition: 'all 0.2s',
                              animation: includesWashing ? 'pulse-blue 2s infinite' : 'none'
                            }}
                          >
                            <Droplets size={18} /> ENVIAR A LAVADO
                          </button>
                          <button 
                            onClick={() => handleFinishService(app.id)}
                            disabled={loading}
                            className="btn-gold" 
                            style={{ 
                              flex: 1, 
                              height: '56px', 
                              borderRadius: '16px', 
                              fontSize: '14px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              gap: '8px' 
                            }}
                          >
                            <CheckCircle size={18} /> A CAJA
                          </button>
                        </div>
                      ) : app.status === 'En Lavado' ? (
                        <button 
                          disabled
                          style={{ width: '100%', height: '56px', borderRadius: '16px', backgroundColor: 'rgba(0,122,255,0.1)', color: '#007aff', border: '1px solid rgba(0,122,255,0.2)', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                          <Droplets size={18} className="animate-pulse" /> EN PROCESO DE LAVADO...
                        </button>
                      ) : (
                        <button 
                          disabled
                          style={{ width: '100%', height: '56px', borderRadius: '16px', backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: 'none', fontWeight: '700' }}
                        >
                          ESPERANDO AL CLIENTE...
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}

        {/* Add Modal */}
        {showAddModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
            <div className="glass-card animate-scale-in" style={{ maxWidth: '400px', width: '100%', borderRadius: '24px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontWeight: '900' }}>Añadir <span className="text-gold">{addMode === 'extra' ? 'Extra' : 'Producto'}</span></h3>
                <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto', paddingRight: '10px' }}>
                {(addMode === 'extra' ? allExtras : inventory).map(item => (
                  <button 
                    key={item.id}
                    onClick={() => addMode === 'extra' ? handleAddExtra(item) : handleAddProduct(item)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span style={{ fontWeight: '700' }}>{item.name}</span>
                    <span style={{ color: 'var(--gold-primary)', fontWeight: '800' }}>${item.price}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {showCamera && (
          <AstroCamera 
            onCapture={handlePhotoCaptured}
            onClose={() => setShowCamera(false)}
          />
        )}

        {/* Stats Overlay for the barber / assistant */}
        <section style={{ display: 'grid', gridTemplateColumns: isAssistant ? '1fr 1fr' : '1fr 1fr 1fr', gap: '16px' }}>
          <div className="glass-card" style={{ padding: '20px 16px', borderRadius: '24px', textAlign: 'center' }}>
            <TrendingUp size={24} color={isAssistant ? '#007aff' : "var(--gold-primary)"} style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              {isAssistant ? "Comisiones Hoy" : "Producción Hoy"}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '8px' }}>
              <div style={{ fontSize: '22px', fontWeight: '900' }}>${stats.production.toFixed(2)}</div>
              {rates?.usd > 0 && stats.production > 0 && (
                <div style={{ fontSize: '11px', color: isAssistant ? '#007aff' : 'var(--gold-primary)', fontWeight: '800', marginTop: '2px' }}>
                  {Math.round(stats.production * rates.usd).toLocaleString()} BS
                </div>
              )}
            </div>
          </div>

          {!isAssistant && (
            <div className="glass-card animate-scale-in" style={{ padding: '20px 16px', borderRadius: '24px', textAlign: 'center', border: '1px solid rgba(50, 215, 75, 0.2)', background: 'linear-gradient(135deg, rgba(28,28,30,0.95), rgba(50,215,75,0.02))' }}>
              <Award size={24} color="#32d74b" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Ganancia Hoy
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '8px' }}>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#32d74b' }}>${stats.earnings.toFixed(2)}</div>
                {rates?.usd > 0 && stats.earnings > 0 && (
                  <div style={{ fontSize: '11px', color: '#32d74b', fontWeight: '800', marginTop: '2px' }}>
                    {Math.round(stats.earnings * rates.usd).toLocaleString()} BS
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="glass-card" style={{ padding: '20px 16px', borderRadius: '24px', textAlign: 'center' }}>
            {isAssistant ? (
              <Droplets size={24} color="#007aff" style={{ margin: '0 auto 12px' }} />
            ) : (
              <Scissors size={24} color="var(--gold-primary)" style={{ margin: '0 auto 12px' }} />
            )}
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              {isAssistant ? "Lavados" : "Servicios"}
            </div>
            <div style={{ fontSize: '22px', fontWeight: '900', marginTop: '8px' }}>{stats.services}</div>
          </div>
        </section>

        {/* Completed Today Section */}
        <section style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            {isAssistant ? <Droplets size={18} color="#007aff" /> : <CheckCircle size={18} color="#32d74b" />}
            <span style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>
              {isAssistant ? "Lavados Completados Hoy" : "Trabajos Completados Hoy"}
            </span>
            <span style={{ 
              marginLeft: 'auto', 
              fontSize: '12px', 
              fontWeight: '900', 
              color: isAssistant ? '#007aff' : 'var(--gold-primary)', 
              background: isAssistant ? 'rgba(0,122,255,0.1)' : 'rgba(212,175,55,0.1)', 
              padding: '4px 12px', 
              borderRadius: '20px',
              border: isAssistant ? '1px solid rgba(0,122,255,0.2)' : '1px solid rgba(212,175,55,0.2)'
            }}>{completedToday.length}</span>
          </div>

          {completedToday.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '40px', borderRadius: '20px', opacity: 0.4 }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {isAssistant ? "Aún no has realizado lavados hoy." : "Aún no has completado servicios hoy."}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {completedToday.map(app => {
                const extrasTotal = app.appointment_extras?.reduce((sum, e) => sum + (Number(e.price) || 0), 0) || 0;
                const productsTotal = app.appointment_products?.reduce((sum, p) => sum + ((Number(p.price) || 0) * (p.quantity || 1)), 0) || 0;
                const totalUsd = (Number(app.services?.price) || 0) + extrasTotal + productsTotal;
                const completedTime = app.completed_at ? new Date(app.completed_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
                const startedTime = app.started_at ? new Date(app.started_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
                let durationMin = 0;
                if (app.started_at && app.completed_at) {
                  durationMin = Math.round((new Date(app.completed_at) - new Date(app.started_at)) / 60000);
                }

                // If assistant, show commission earned instead of total usd
                const myRecord = app.appointment_staff?.find(as => String(as.staff_id) === String(selectedBarber.id));
                const displayVal = isAssistant ? (Number(myRecord?.commission_earned) || 0) : totalUsd;

                return (
                  <div key={app.id} className="glass-card" onClick={() => setSelectedCompletedApp(app)} style={{ 
                    padding: '16px 20px', 
                    borderRadius: '20px',
                    border: isAssistant ? '1px solid rgba(0, 122, 255, 0.1)' : '1px solid rgba(50, 215, 75, 0.1)',
                    background: isAssistant ? 'linear-gradient(135deg, rgba(0,122,255,0.03), transparent)' : 'linear-gradient(135deg, rgba(50,215,75,0.03), transparent)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          width: '36px', height: '36px', borderRadius: '10px', 
                          background: isAssistant ? 'rgba(0,122,255,0.1)' : 'rgba(50,215,75,0.1)', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center' 
                        }}>
                          {isAssistant ? <Droplets size={18} color="#007aff" /> : <CheckCircle size={18} color="#32d74b" />}
                        </div>
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '14px', color: 'white' }}>{app.clients?.name || 'Cliente'}</div>
                          <div style={{ fontSize: '12px', color: 'var(--gold-primary)', fontWeight: '700' }}>
                            {isAssistant ? `${app.services?.name} (${app.staff?.name || 'Barbero'})` : app.services?.name}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '16px', fontWeight: '900', color: isAssistant ? '#007aff' : '#32d74b' }}>
                          ${displayVal.toFixed(2)} {isAssistant && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>(Comisión)</span>}
                        </div>
                        {rates?.usd > 0 && (
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>{(displayVal * rates.usd).toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Bs.</div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      {startedTime && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>⏱ {startedTime} → {completedTime}</span>
                      )}
                      {durationMin > 0 && (
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '800' }}>{durationMin} min</span>
                      )}
                      {!isAssistant && (app.appointment_extras?.length > 0 || app.appointment_products?.length > 0) && (
                        <span style={{ fontSize: '11px', color: 'var(--gold-primary)', fontWeight: '700', marginLeft: 'auto' }}>
                          +{(app.appointment_extras?.length || 0) + (app.appointment_products?.length || 0)} items
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>

      {/* Detail Modal for Completed Service */}
      {selectedCompletedApp && (() => {
        const app = selectedCompletedApp;
        const extrasTotal = app.appointment_extras?.reduce((sum, e) => sum + (Number(e.price) || 0), 0) || 0;
        const productsTotal = app.appointment_products?.reduce((sum, p) => sum + ((Number(p.price) || 0) * (p.quantity || 1)), 0) || 0;
        const servicePrice = Number(app.services?.price) || 0;
        const totalUsd = servicePrice + extrasTotal + productsTotal;
        const totalBs = totalUsd * (rates?.usd || 550);
        const completedTime = app.completed_at ? new Date(app.completed_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
        const startedTime = app.started_at ? new Date(app.started_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
        let durationMin = 0;
        if (app.started_at && app.completed_at) {
          durationMin = Math.round((new Date(app.completed_at) - new Date(app.started_at)) / 60000);
        }
        const beforePhoto = app.clients?.work_gallery?.find(p => p.type === 'Antes' && p.service_id === app.id);
        const afterPhoto = app.clients?.work_gallery?.find(p => p.type === 'Después' && p.service_id === app.id);

        return (
          <div 
            onClick={() => setSelectedCompletedApp(null)}
            style={{ 
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
              backgroundColor: 'rgba(0,0,0,0.85)', 
              backdropFilter: 'blur(12px)', 
              zIndex: 1000, 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              padding: '20px' 
            }}
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="animate-scale-in" 
              style={{ 
                maxWidth: '480px', 
                width: '100%', 
                maxHeight: '90vh',
                overflowY: 'auto',
                borderRadius: '28px', 
                background: 'linear-gradient(180deg, rgba(28,28,30,0.98), rgba(20,20,22,0.99))', 
                border: isAssistant ? '1px solid rgba(0,122,255,0.15)' : '1px solid rgba(50,215,75,0.15)',
                boxShadow: '0 30px 80px rgba(0,0,0,0.7)'
              }}
            >
              {/* Header */}
              <div style={{ 
                padding: '24px 24px 20px', 
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: isAssistant ? 'linear-gradient(135deg, rgba(0,122,255,0.08), transparent)' : 'linear-gradient(135deg, rgba(50,215,75,0.08), transparent)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      {isAssistant ? <Droplets size={16} color="#007aff" /> : <CheckCircle size={16} color="#32d74b" />}
                      <span style={{ fontSize: '10px', fontWeight: '900', color: isAssistant ? '#007aff' : '#32d74b', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                        {isAssistant ? "LAVADO COMPLETADO" : "SERVICIO COMPLETADO"}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '22px', fontWeight: '900', color: 'white', margin: 0 }}>{app.clients?.name || 'Cliente'}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {app.clients?.phone || ''}{app.clients?.id_card ? ` · C.I. ${app.clients.id_card}` : ''}
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedCompletedApp(null)}
                    style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: '20px 24px' }}>

                {/* Service Info */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '12px' }}>SERVICIO REALIZADO</div>
                  <div style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: '16px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: 'white' }}>{app.services?.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Barbero: {app.staff?.name || 'Otro'}
                        </div>
                        {app.services?.included_items && app.services.included_items.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                            {app.services.included_items.map((item, idx) => (
                              <span key={idx} style={{ fontSize: '9px', fontWeight: '800', color: item.toLowerCase().includes('lavado') ? '#007aff' : 'var(--text-muted)', background: item.toLowerCase().includes('lavado') ? 'rgba(0,122,255,0.1)' : 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '12px', border: item.toLowerCase().includes('lavado') ? '1px solid rgba(0,122,255,0.15)' : '1px solid rgba(255,255,255,0.06)' }}>
                                {item.toLowerCase().includes('lavado') ? '💧' : '✦'} {item}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '18px', fontWeight: '900', color: 'var(--gold-primary)' }}>${servicePrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Extras */}
                {app.appointment_extras?.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-secondary)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>EXTRAS AGREGADOS</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {app.appointment_extras.map(ex => (
                        <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>{ex.service_extras?.name}</span>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--gold-primary)' }}>+${Number(ex.price).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Products */}
                {app.appointment_products?.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-secondary)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>PRODUCTOS VENDIDOS</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {app.appointment_products.map(pr => (
                        <div key={pr.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>{pr.inventory?.name}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>x{pr.quantity}</span>
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--gold-primary)' }}>+${(Number(pr.price) * (pr.quantity || 1)).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Photos Before/After */}
                {(beforePhoto || afterPhoto) && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-secondary)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>GALERÍA</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {beforePhoto && (
                        <div style={{ borderRadius: '14px', overflow: 'hidden', position: 'relative', aspectRatio: '1' }}>
                          <img src={beforePhoto.url} alt="Antes" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.7)', padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '800', color: 'white' }}>ANTES</div>
                        </div>
                      )}
                      {afterPhoto && (
                        <div style={{ borderRadius: '14px', overflow: 'hidden', position: 'relative', aspectRatio: '1' }}>
                          <img src={afterPhoto.url} alt="Después" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.7)', padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '800', color: '#32d74b' }}>DESPUÉS</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Timing */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-secondary)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>TIEMPOS</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '4px' }}>INICIO</div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>{startedTime}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '4px' }}>FIN</div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>{completedTime}</div>
                    </div>
                    <div style={{ background: 'rgba(212,175,55,0.06)', padding: '12px', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(212,175,55,0.12)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--gold-primary)', fontWeight: '700', marginBottom: '4px' }}>DURACIÓN</div>
                      <div style={{ fontSize: '14px', fontWeight: '900', color: 'var(--gold-primary)' }}>{durationMin > 0 ? `${durationMin} min` : '—'}</div>
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div style={{ 
                  background: isAssistant ? 'linear-gradient(135deg, rgba(0,122,255,0.08), rgba(0,122,255,0.02))' : 'linear-gradient(135deg, rgba(50,215,75,0.08), rgba(50,215,75,0.02))', 
                  border: isAssistant ? '1px solid rgba(0,122,255,0.15)' : '1px solid rgba(50,215,75,0.15)', 
                  borderRadius: '16px', 
                  padding: '20px',
                  marginBottom: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700' }}>Servicio base</span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>${servicePrice.toFixed(2)}</span>
                  </div>
                  {extrasTotal > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700' }}>Extras ({app.appointment_extras.length})</span>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>+${extrasTotal.toFixed(2)}</span>
                    </div>
                  )}
                  {productsTotal > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700' }}>Productos ({app.appointment_products.length})</span>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>+${productsTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ borderTop: isAssistant ? '1px solid rgba(0,122,255,0.15)' : '1px solid rgba(50,215,75,0.15)', paddingTop: '12px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: '900', color: isAssistant ? '#007aff' : '#32d74b' }}>TOTAL</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '22px', fontWeight: '950', color: isAssistant ? '#007aff' : '#32d74b' }}>${totalUsd.toFixed(2)}</div>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>{totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.</div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      <style>{`
        .hover-item:hover {
          border-color: var(--gold-primary) !important;
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        @keyframes pulse-blue {
          0% {
            box-shadow: 0 0 0 0 rgba(0, 122, 255, 0.4);
            transform: scale(1);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(0, 122, 255, 0);
            transform: scale(1.02);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(0, 122, 255, 0);
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default BarberPanel;
