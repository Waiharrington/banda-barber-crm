import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useModal } from '../context/ModalContext';
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
  Coins,
  LogOut,
  Trash2,
  RefreshCw,
  Edit3,
  Droplets,
  Coffee,
  Beer,
  GlassWater
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import PandaCamera from './PandaCamera';
import { Plus, ShoppingBag, Loader2, Users } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { notificationService } from '../services/notificationService';
import { useDialog } from '../context/DialogContext';
import AnimatedModal from './AnimatedModal';

const renderBeverageIcon = (beverageName, size = 16, className = "text-[var(--champagne)]") => {
  if (!beverageName) return null;
  const name = beverageName.toLowerCase();
  if (name.includes('café') || name.includes('cafe')) return <Coffee size={size} className={className} />;
  if (name.includes('cerveza')) return <Beer size={size} className={className} />;
  if (name.includes('whiskey')) return <GlassWater size={size} className={className} />;
  return <GlassWater size={size} className={className} />;
};

const BarberPanel = ({ isMobile, rates }) => {
  const { user } = useAuth();
  const { showToast, triggerConfetti, triggerRocket } = useNotifs();
  const { confirm } = useDialog();
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
  const [addMode, setAddMode] = useState(null); // 'extra' | 'product'
  const { pushModal, popModal } = useModal();
  const [showCamera, setShowCamera] = useState(false);
  const [cameraTarget, setCameraTarget] = useState({ appId: null, type: 'Antes' });
  const [editingExtraPriceId, setEditingExtraPriceId] = useState(null);
  const [visibleCompletedCount, setVisibleCompletedCount] = useState(5);
  const [showWashModal, setShowWashModal] = useState(false);
  const [washAppId, setWashAppId] = useState(null);
  const [assistantQueue, setAssistantQueue] = useState([]);
  const [loadingAssistantQueue, setLoadingAssistantQueue] = useState(false);
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

  const [stats, setStats] = useState({ production: 0, services: 0, earnings: 0, tips: 0 });

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
        if (me) {
          setSelectedBarber(me);
          window.dispatchEvent(new CustomEvent('panda_active_barber_changed', { detail: me }));
        }
      }
    }
  }, [staff, user]);

  // Sync modal state with global context to hide sidebar
  useEffect(() => {
    const isAnyModalOpen = !!selectedCompletedApp || showAddModal || showCamera || showWashModal;
    if (isAnyModalOpen) {
      pushModal();
      return () => popModal();
    }
  }, [selectedCompletedApp, showAddModal, showCamera, showWashModal, pushModal, popModal]);

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
          schema: 'pandabarber', 
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
    } else {
      window.dispatchEvent(new CustomEvent('panda_active_barber_changed', { detail: null }));
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
        let tips = 0;
        data.forEach(s => {
          const createdDate = s.created_at ? new Date(s.created_at).toISOString().split('T')[0] : '';
          if (createdDate === today) {
            const myRecord = s.appointment_staff?.find(as => String(as.staff_id) === String(selectedBarber.id));
            if (myRecord) {
              count++;
              earned += Number(myRecord.commission_earned || 0);
              tips += Number(myRecord.tip_amount || 0);
            }
          }
        });
        setStats({ production: earned, services: count, earnings: earned, tips: tips });
      } else {
        const data = await dataService.getBarberDailyStats(selectedBarber.id);
        setStats({ production: data.productionUsd, services: data.services, earnings: data.earningsUsd, tips: data.tipsUsd || 0 });
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

  const handlePullFromWash = async (serviceId) => {
    try {
      setLoading(true);
      await dataService.updateAppointmentStatus(serviceId, 'En Silla');
      showToast("¡Cliente recuperado a tu silla!");
      loadMyWork();
      loadStats();
      loadCompletedToday();
    } catch (err) {
      showToast("Error al recuperar de lavado", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadAssistantQueue = async () => {
    try {
      setLoadingAssistantQueue(true);
      const queue = await dataService.getTurnQueue();
      const assistants = queue.filter(q => 
        q.status !== 'ABSENT' && 
        (q.staff?.role?.toLowerCase().includes('asistente') || 
         q.staff?.role?.toLowerCase().includes('lavado') || 
         q.staff?.role?.toLowerCase().includes('operaciones'))
      );
      setAssistantQueue(assistants);
    } catch (e) {
      console.error("Error loading assistant queue:", e);
    } finally {
      setLoadingAssistantQueue(false);
    }
  };

  const handleSendToWash = async (serviceId) => {
    setWashAppId(serviceId);
    setShowWashModal(true);
    await loadAssistantQueue();
  };

  const confirmSendToWash = async (assistantId) => {
    try {
      setLoading(true);
      const app = myServices.find(s => s.id === washAppId);
      const clientName = app?.clients?.name || 'Cliente';

      if (assistantId) {
        await dataService.assignAssistantToAppointment(washAppId, assistantId);
      }

      await dataService.updateAppointmentStatus(washAppId, 'En Lavado');
      showToast("¡Cliente enviado a la estación de lavado!");
      triggerRocket();
      setShowWashModal(false);
      
      notificationService.broadcastNotification(
        supabase,
        '💧 Nuevo Cliente para Lavado',
        `Hey, te toca lavar a ${clientName}. (Enviado por: ${selectedBarber.name})`,
        assistantId ? { recipientId: assistantId } : { recipientRole: 'Asistente' }
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

  const skipAssistantTurn = async (assistantId) => {
    try {
      setLoading(true);
      await dataService.skipTurn(assistantId);
      showToast("Turno del asistente saltado");
      await loadAssistantQueue();
    } catch (err) {
      showToast("Error al saltar turno", "error");
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
      
      // Notify barbers that client is ready
      notificationService.broadcastNotification(
        supabase,
        '💈 Cliente listo',
        `El cliente ${clientName} terminó su lavado y está listo para pasar a silla.`,
        { recipientRole: 'Barbero' }
      );

      loadMyWork();
      loadStats();
      loadCompletedToday();
    } catch (err) {
      showToast("Error al procesar", "error");
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
        service_name: app.services?.name || 'Servicio'
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
      
      // Update local state instantly for real-time feedback
      setMyServices(prev => prev.map(s => {
        if (s.client_id === app.client_id) {
          return {
            ...s,
            clients: {
              ...s.clients,
              work_gallery: newGallery
            }
          };
        }
        return s;
      }));
      setCompletedToday(prev => prev.map(s => {
        if (s.client_id === app.client_id) {
          return {
            ...s,
            clients: {
              ...s.clients,
              work_gallery: newGallery
            }
          };
        }
        return s;
      }));
      if (selectedCompletedApp && selectedCompletedApp.client_id === app.client_id) {
        setSelectedCompletedApp(prev => ({
          ...prev,
          clients: {
            ...prev.clients,
            work_gallery: newGallery
          }
        }));
      }

      showToast("¡Foto guardada con éxito!", "success");
      await loadMyWork();
    } catch (err) {
      console.error(err);
      showToast("Error al guardar foto", "error");
    } finally {
      setShowCamera(false);
    }
  };

  const handleDeletePhoto = async (appId, type) => {
    try {
      const app = myServices.find(s => s.id === appId);
      if (!app) return;

      if (!await confirm("¿Quieres borrar la foto de esta cita?")) return;

      showToast("Borrando foto...", "info");

      const { data: latestClient } = await supabase
        .from('clients')
        .select('work_gallery')
        .eq('id', app.client_id)
        .single();

      const currentGallery = Array.isArray(latestClient?.work_gallery) ? latestClient.work_gallery : [];
      const newGallery = currentGallery.filter(p => !(p.service_id === appId && p.type === type));

      await dataService.updateClient(app.client_id, { work_gallery: newGallery });
      
      // Update local state instantly for real-time feedback
      setMyServices(prev => prev.map(s => {
        if (s.client_id === app.client_id) {
          return {
            ...s,
            clients: {
              ...s.clients,
              work_gallery: newGallery
            }
          };
        }
        return s;
      }));
      setCompletedToday(prev => prev.map(s => {
        if (s.client_id === app.client_id) {
          return {
            ...s,
            clients: {
              ...s.clients,
              work_gallery: newGallery
            }
          };
        }
        return s;
      }));
      if (selectedCompletedApp && selectedCompletedApp.client_id === app.client_id) {
        setSelectedCompletedApp(prev => ({
          ...prev,
          clients: {
            ...prev.clients,
            work_gallery: newGallery
          }
        }));
      }

      showToast("Foto eliminada", "success");
      await loadMyWork();
    } catch (err) {
      console.error(err);
      showToast("Error al eliminar la foto", "error");
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
      <div className="animate-fade-in" style={{ padding: '40px 20px 100px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(18px, 5.5vw, 28px)', fontWeight: '900', marginBottom: '10px', whiteSpace: 'nowrap' }}>Panel de <span className="text-gold">Barberos / Asistentes</span></h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>Selecciona tu perfil para comenzar tu turno.</p>
        
        <div className="animate-page-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '20px', maxWidth: '600px', margin: '0 auto' }}>
          {staff
            .filter(s => {
              const roleName = (s.role?.split('|')[0] || '').toLowerCase();
              return !roleName.includes('admin') && 
                     !roleName.includes('recepcionista') && 
                     !roleName.includes('caja');
            })
            .map(s => {
              const displayRole = (s.role?.split('|')[0] || 'Barbero').trim();
              return (
              <button 
                key={s.id} 
                onClick={() => {
                  setSelectedBarber(s);
                  window.dispatchEvent(new CustomEvent('panda_active_barber_changed', { detail: s }));
                }}
                className="glass-card hover-item" 
                style={{ padding: '30px 10px', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', cursor: 'pointer', width: '100%' }}
              >
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--gold-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--gold-glow)', marginBottom: '4px' }}>
                  {s.image_url ? (
                    <img src={s.image_url} alt={s.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <User size={32} color="black" />
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '100%' }}>
                  <span style={{ fontWeight: '800', fontSize: '16px', color: 'white' }}>{s.name}</span>
                  <span style={{ 
                    fontSize: '9.5px', 
                    fontWeight: '700', 
                    color: 'var(--text-muted)', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0px',
                    textAlign: 'center',
                    lineHeight: '1.2',
                    width: '100%',
                    textWrap: 'balance'
                  }}>{displayRole}</span>
                </div>
              </button>
            )})}
        </div>
      </div>
    );
  }

  const isAssistant = selectedBarber?.role?.toLowerCase().includes('asistente');
  const getGreeting = () => {
    const options = { timeZone: 'America/Caracas', hour: 'numeric', hour12: false };
    const hour = parseInt(new Date().toLocaleString('en-US', options), 10);
    if (hour >= 5 && hour < 12) return '¡Buenos días,';
    if (hour >= 12 && hour < 19) return '¡Buenas tardes,';
    return '¡Buenas noches,';
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '550px', margin: '0 auto', paddingBottom: '100px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: isAssistant ? 'linear-gradient(135deg, #007aff, #00d2ff)' : 'var(--gold-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {selectedBarber.image_url ? (
                <img src={selectedBarber.image_url} alt={selectedBarber.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                isAssistant ? <Droplets size={20} color="white" /> : <Scissors size={20} color="black" />
              )}
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '900' }}>¡Hola, <span className="text-gold">{selectedBarber.name.split(' ')[0]}!</span></h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            {isAssistant ? "Gestiona las estaciones de lavado del día." : "Gestiona tus servicios activos y citas."}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => { loadMyWork(); showToast("Sincronizado"); }}
            disabled={loading}
            style={{ background: 'rgba(255, 255, 255,0.1)', border: '1px solid rgba(255, 255, 255,0.2)', color: 'var(--gold-primary)', width: '40px', height: '40px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Sincronizar silla"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          {!(user?.role === 'Barbero' || user?.role?.startsWith('Barbero|')) && (
            <button 
              onClick={() => {
                setSelectedBarber(null);
                window.dispatchEvent(new CustomEvent('panda_active_barber_changed', { detail: null }));
              }}
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', padding: '10px 16px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', transition: 'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ff4d4d'; e.currentTarget.style.borderColor = 'rgba(255,77,77,0.3)'; e.currentTarget.style.background = 'rgba(255,77,77,0.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'transparent'; }}
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
                <div className="glass-card" style={{ 
                  textAlign: 'center', 
                  padding: '40px', 
                  borderRadius: '24px',
                  border: '2px dashed rgba(0, 122, 255, 0.4)',
                  background: 'radial-gradient(circle at center, rgba(0,122,255,0.08) 0%, transparent 70%)'
                }}>
                  <style>{`
                    @keyframes pulseBlue {
                      0%, 100% { transform: scale(1); filter: drop-shadow(0 0 5px rgba(0,122,255,0.4)); opacity: 0.8; }
                      50% { transform: scale(1.1); filter: drop-shadow(0 0 15px rgba(0,122,255,0.8)); opacity: 1; }
                    }
                  `}</style>
                  <div style={{ display: 'inline-flex', animation: 'pulseBlue 2s infinite' }}>
                    <Droplets size={44} color="#007aff" style={{ marginBottom: '16px' }} />
                  </div>
                  <p style={{ fontSize: '15px', color: '#007aff', fontWeight: '800', letterSpacing: '0.3px', textShadow: '0 0 10px rgba(0,122,255,0.3)' }}>
                    Estación impecable y lista...
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', fontWeight: '600' }}>
                    Esperando al próximo cliente.
                  </p>
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
                                  <span style={{ position: 'absolute', left: '6px', fontSize: '10px', color: 'var(--gold-primary)', fontWeight: '800' }}>€</span>
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
          </section>
        ) : (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Scissors 
                size={18} 
                color="var(--gold-primary)" 
                style={{ filter: 'drop-shadow(0 1px 3px rgba(255, 255, 255, 0.4))' }} 
              />
              <span style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>Tu Silla Hoy</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {myServices.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '60px', borderRadius: '24px', border: '2px dashed rgba(255, 255, 255,0.2)', background: 'rgba(255, 255, 255,0.02)' }}>
                  <style>{`
                    @keyframes chair-float-small {
                      0%, 100% { transform: translateY(0px) rotate(0deg); }
                      50% { transform: translateY(-10px) rotate(3deg); }
                    }
                    @keyframes shadow-scale-small {
                      0%, 100% { transform: translateX(-50%) scaleX(1); opacity: 0.7; }
                      50% { transform: translateX(-50%) scaleX(0.8) scaleY(0.9); opacity: 0.3; }
                    }
                  `}</style>
                  <div className="chair-entrance" style={{ position: 'relative', height: '110px', width: '80px', margin: '0 auto 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <div style={{ 
                      position: 'absolute', 
                      bottom: '-8px', 
                      left: '50%', 
                      transform: 'translateX(-50%)', 
                      width: '60px', 
                      height: '8px', 
                      background: 'radial-gradient(ellipse at center, rgba(255, 255, 255,0.4) 0%, transparent 70%)',
                      zIndex: 1,
                      animation: 'shadow-scale-small 6s infinite ease-in-out'
                    }} />
                    <img 
                      src="/barber-chair.png" 
                      alt="Panda Chair" 
                      style={{ 
                        width: '80px', 
                        height: 'auto',
                        objectFit: 'contain',
                        zIndex: 3,
                        filter: 'drop-shadow(0 5px 15px rgba(0,0,0,0.5)) drop-shadow(0 0 10px rgba(255, 255, 255, 0.4))',
                        animation: 'chair-float-small 6s infinite ease-in-out'
                      }} 
                    />
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Buscando clientes... La silla está libre.</p>
                </div>
              ) : (
                myServices.map(app => {
                  const includesWashing = app.services?.included_items?.some(i => i.toLowerCase().includes('lavado')) || 
                                          app.appointment_extras?.some(e => e.service_extras?.name?.toLowerCase().includes('lavado'));
                  return (
                    <div key={app.id} className="glass-card animate-slide-up" style={{ 
                      borderRadius: '28px', 
                      padding: '24px', 
                      background: app.status === 'En Silla' ? 'linear-gradient(135deg, rgba(28,28,30,0.98), rgba(255, 255, 255,0.02))' : 'var(--bg-secondary)',
                      border: app.status === 'En Silla' ? '1px solid rgba(255, 255, 255,0.15)' : '1px solid rgba(255,255,255,0.05)',
                      boxShadow: '0 20px 45px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                        <div>
                          <span style={{ 
                            fontSize: '9px', 
                            fontWeight: '900', 
                            color: app.status === 'En Lavado' ? '#007aff' : 'var(--gold-primary)', 
                            textTransform: 'uppercase', 
                            letterSpacing: '1.5px',
                            background: app.status === 'En Lavado' ? 'rgba(0,122,255,0.12)' : 'rgba(255, 255, 255,0.1)',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            border: app.status === 'En Lavado' ? '1px solid rgba(0,122,255,0.2)' : '1px solid rgba(255, 255, 255,0.15)',
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            {app.status} 
                            {app.status === 'En Lavado' ? '💧' : (
                              <img 
                                src="/barber-chair.png" 
                                alt="Silla" 
                                style={{ 
                                  width: '16px', 
                                  height: '16px', 
                                  objectFit: 'contain',
                                  filter: 'drop-shadow(0 1px 2px rgba(255, 255, 255, 0.6))'
                                }} 
                              />
                            )}
                          </span>
                          <h3 style={{ fontSize: '24px', fontWeight: '900', marginTop: '10px', color: 'white', letterSpacing: '-0.3px' }}>{app.clients?.name}</h3>
                          <div style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            color: 'var(--gold-primary)', 
                            fontSize: '13px', 
                            fontWeight: '800', 
                            marginTop: '6px',
                            background: 'rgba(255, 255, 255,0.06)',
                            padding: '4px 12px',
                            borderRadius: '10px',
                            border: '1px solid rgba(255, 255, 255,0.12)'
                          }}>
                            {app.services?.name}
                          </div>
                          
                          {app.services?.included_items && app.services.included_items.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '14px' }}>
                              {app.services.included_items.map((item, idx) => {
                                const isWashing = item.toLowerCase().includes('lavado');
                                return (
                                  <span 
                                    key={idx} 
                                    style={{ 
                                      fontSize: '10px', 
                                      fontWeight: '800', 
                                      color: isWashing ? '#007aff' : 'rgba(255,255,255,0.6)', 
                                      background: isWashing ? 'rgba(0,122,255,0.08)' : 'rgba(255,255,255,0.03)', 
                                      padding: '4px 10px', 
                                      borderRadius: '12px', 
                                      border: isWashing ? '1px solid rgba(0,122,255,0.2)' : '1px solid rgba(255,255,255,0.05)',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    <span style={{ color: isWashing ? '#007aff' : 'var(--gold-primary)', fontSize: '8px' }}>
                                      {isWashing ? '💧' : '✦'}
                                    </span>
                                    {item}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '22px', fontWeight: '900', color: 'white' }}>${app.services?.price}</div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                        {/* Polaroid Antes */}
                        <div 
                          onClick={() => { setCameraTarget({ appId: app.id, type: 'Antes' }); setShowCamera(true); }}
                          style={{ 
                            height: '120px', 
                            borderRadius: '20px', 
                            backgroundColor: 'rgba(0,0,0,0.4)', 
                            border: '1.5px dashed rgba(255, 255, 255,0.25)', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '8px', 
                            cursor: 'pointer', 
                            overflow: 'hidden', 
                            position: 'relative',
                            boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.5)',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {app.clients?.work_gallery?.find(p => p.type === 'Antes' && p.service_id === app.id) ? (
                            <>
                              <img src={app.clients.work_gallery.find(p => p.type === 'Antes' && p.service_id === app.id).url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', padding: '4px 10px', borderRadius: '8px', fontSize: '9px', fontWeight: '900', color: 'var(--gold-primary)', border: '1px solid rgba(255, 255, 255,0.3)', letterSpacing: '0.5px' }}>ANTES</div>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeletePhoto(app.id, 'Antes'); }}
                                style={{ 
                                  position: 'absolute', 
                                  top: '8px', 
                                  right: '8px', 
                                  background: 'rgba(255, 69, 58, 0.25)', 
                                  backdropFilter: 'blur(8px)', 
                                  border: '1px solid rgba(255, 69, 58, 0.4)', 
                                  color: '#ff453a', 
                                  borderRadius: '50%', 
                                  width: '28px', 
                                  height: '28px', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                                }}
                              >
                                <Trash2 size={12} strokeWidth={2.5} />
                              </button>
                            </>
                          ) : (
                            <>
                              <div style={{ background: 'rgba(255, 255, 255,0.06)', padding: '10px', borderRadius: '50%', border: '1px solid rgba(255, 255, 255,0.15)' }}>
                                <Camera size={20} color="var(--gold-primary)" />
                              </div>
                              <span style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '1px' }}>FOTO ANTES</span>
                            </>
                          )}
                        </div>

                        {/* Polaroid Después */}
                        <div 
                          onClick={() => { setCameraTarget({ appId: app.id, type: 'Después' }); setShowCamera(true); }}
                          style={{ 
                            height: '120px', 
                            borderRadius: '20px', 
                            backgroundColor: 'rgba(0,0,0,0.4)', 
                            border: '1.5px dashed rgba(255, 255, 255,0.25)', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '8px', 
                            cursor: 'pointer', 
                            overflow: 'hidden', 
                            position: 'relative',
                            boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.5)',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {app.clients?.work_gallery?.find(p => p.type === 'Después' && p.service_id === app.id) ? (
                            <>
                              <img src={app.clients.work_gallery.find(p => p.type === 'Después' && p.service_id === app.id).url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', padding: '4px 10px', borderRadius: '8px', fontSize: '9px', fontWeight: '900', color: '#32d74b', border: '1px solid rgba(50,215,75,0.3)', letterSpacing: '0.5px' }}>DESPUÉS</div>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeletePhoto(app.id, 'Después'); }}
                                style={{ 
                                  position: 'absolute', 
                                  top: '8px', 
                                  right: '8px', 
                                  background: 'rgba(255, 69, 58, 0.25)', 
                                  backdropFilter: 'blur(8px)', 
                                  border: '1px solid rgba(255, 69, 58, 0.4)', 
                                  color: '#ff453a', 
                                  borderRadius: '50%', 
                                  width: '28px', 
                                  height: '28px', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                                }}
                              >
                                <Trash2 size={12} strokeWidth={2.5} />
                              </button>
                            </>
                          ) : (
                            <>
                              <div style={{ background: 'rgba(255, 255, 255,0.06)', padding: '10px', borderRadius: '50%', border: '1px solid rgba(255, 255, 255,0.15)' }}>
                                <Camera size={20} color="var(--gold-primary)" />
                              </div>
                              <span style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '1px' }}>FOTO DESPUÉS</span>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Beverage selection & Notes */}
                      {(app.beverage_selection || app.notes) && (
                        <div style={{ 
                          background: 'rgba(255, 255, 255, 0.03)', 
                          borderRadius: '16px', 
                          padding: '12px 16px', 
                          marginBottom: '16px', 
                          border: '1px solid rgba(255, 255, 255, 0.06)' 
                        }}>
                          {app.beverage_selection && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: app.notes ? '8px' : '0' }}>
                              <span style={{ fontSize: '14px' }}>
                                {app.beverage_selection.includes('Café') ? '☕' : 
                                 app.beverage_selection.includes('Cerveza') ? '🍺' : 
                                 app.beverage_selection.includes('Whiskey') ? '🥃' : '💧'}
                              </span>
                              <div>
                                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: '800', display: 'block', lineHeight: '1.2' }}>Bebida Solicitada</span>
                                <span style={{ fontSize: '12px', color: 'white', fontWeight: '700' }}>{app.beverage_selection}</span>
                              </div>
                            </div>
                          )}
                          {app.notes && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                              <span style={{ fontSize: '14px', marginTop: '2px' }}>📝</span>
                              <div>
                                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: '800', display: 'block', lineHeight: '1.2' }}>Notas del Cliente</span>
                                <span style={{ fontSize: '12px', color: 'var(--gold-primary)', fontWeight: '700', wordBreak: 'break-word' }}>"{app.notes}"</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Extras and Products List */}
                      {(app.appointment_extras?.length > 0 || app.appointment_products?.length > 0) && (
                        <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {app.appointment_extras.map(ex => (
                            <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ fontSize: '13px', fontWeight: '600' }}>{ex.service_extras?.name}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {editingExtraPriceId === ex.id ? (
                                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <span style={{ position: 'absolute', left: '6px', fontSize: '10px', color: 'var(--gold-primary)', fontWeight: '800' }}>€</span>
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
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                        <button 
                          onClick={() => { setActiveAppId(app.id); setAddMode('extra'); setShowAddModal(true); }}
                          style={{ 
                            flex: 1, 
                            padding: '14px', 
                            borderRadius: '16px', 
                            background: 'rgba(255,255,255,0.02)', 
                            border: '1px solid rgba(255, 255, 255,0.15)', 
                            color: 'white', 
                            fontSize: '12px', 
                            fontWeight: '800', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '8px',
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                            transition: 'all 0.2s'
                          }}
                        >
                          <Plus size={16} color="var(--gold-primary)" style={{ filter: 'drop-shadow(0 0 5px rgba(255, 255, 255,0.4))' }} /> Extra
                        </button>
                        <button 
                          onClick={() => { setActiveAppId(app.id); setAddMode('product'); setShowAddModal(true); }}
                          style={{ 
                            flex: 1, 
                            padding: '14px', 
                            borderRadius: '16px', 
                            background: 'rgba(255,255,255,0.02)', 
                            border: '1px solid rgba(255, 255, 255,0.15)', 
                            color: 'white', 
                            fontSize: '12px', 
                            fontWeight: '800', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '8px',
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                            transition: 'all 0.2s'
                          }}
                        >
                          <ShoppingBag size={15} color="var(--gold-primary)" style={{ filter: 'drop-shadow(0 0 5px rgba(255, 255, 255,0.4))' }} /> Producto
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
                              fontSize: '13px', 
                              fontWeight: '800',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '0 10px',
                              cursor: 'pointer',
                              background: includesWashing ? 'linear-gradient(135deg, #007aff, #00d2ff)' : 'rgba(0,122,255,0.15)',
                              border: includesWashing ? 'none' : '1px solid rgba(0,122,255,0.3)',
                              color: includesWashing ? 'white' : '#007aff',
                              boxShadow: includesWashing ? '0 4px 15px rgba(0,122,255,0.3)' : 'none',
                              transition: 'all 0.2s',
                              animation: includesWashing ? 'pulse-blue 2s infinite' : 'none'
                            }}
                          >
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center', width: 'fit-content', margin: '0 auto' }}>
                              <Droplets size={16} style={{ flexShrink: 0 }} />
                              <span style={{ whiteSpace: 'nowrap', lineHeight: '1.1' }}>ENVIAR A LAVADO</span>
                            </div>
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
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button 
                            disabled
                            style={{ flex: 1.5, height: '56px', borderRadius: '16px', backgroundColor: 'rgba(0,122,255,0.1)', color: '#007aff', border: '1px solid rgba(0,122,255,0.2)', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                          >
                            <Droplets size={18} className="animate-pulse" /> EN LAVADO...
                          </button>
                          <button 
                            onClick={() => handlePullFromWash(app.id)}
                            disabled={loading}
                            className="hover-item"
                            style={{ flex: 1, height: '56px', borderRadius: '16px', backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.15)', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                          >
                            <RefreshCw size={16} /> VOLVER A SILLA
                          </button>
                        </div>
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
        <AnimatedModal isOpen={showAddModal}>
          {(overlayClass, cardClass) => (
            <div 
              className={overlayClass.replace('global-modal-overlay', '')} 
              onClick={() => setShowAddModal(false)}
              style={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0, 
                backgroundColor: 'rgba(0,0,0,0.85)', 
                backdropFilter: 'blur(10px)', 
                zIndex: 99999, 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                padding: '20px' 
              }}
            >
              <div 
                className={`glass-card ${cardClass.replace('global-modal-card', '')}`} 
                onClick={(e) => e.stopPropagation()}
                style={{ 
                  width: '100%', 
                  maxWidth: '360px', 
                  borderRadius: '24px', 
                  padding: '20px',
                  maxHeight: '90vh', 
                  overflowY: 'auto',
                  boxSizing: 'border-box',
                  border: '1.5px solid rgba(255, 255, 255, 0.25)',
                  color: 'white'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '900' }}>Añadir <span className="text-gold">{addMode === 'extra' ? 'Extra' : 'Producto'}</span></h3>
                  <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer', padding: '4px' }}>&times;</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                  {(addMode === 'extra' ? allExtras : inventory).map(item => (
                    <button 
                      key={item.id}
                      onClick={() => addMode === 'extra' ? handleAddExtra(item) : handleAddProduct(item)}
                      className="selection-modal-item"
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '12px 16px', 
                        borderRadius: '16px', 
                        background: 'rgba(255,255,255,0.02)', 
                        border: '1px solid rgba(255,255,255,0.05)', 
                        color: 'white', 
                        cursor: 'pointer', 
                        textAlign: 'left',
                        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}
                    >
                      <span style={{ fontWeight: '700', fontSize: '13px' }}>{item.name}</span>
                      <span style={{ color: 'var(--gold-primary)', fontWeight: '800', fontSize: '13px' }}>${item.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </AnimatedModal>

        <AnimatedModal isOpen={showCamera}>
          {(overlayClass, cardClass) => (
            <PandaCamera 
              onCapture={handlePhotoCaptured}
              onClose={() => setShowCamera(false)}
              overlayClass={overlayClass}
              cardClass={cardClass}
            />
          )}
        </AnimatedModal>

        <section style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? '1fr 1fr' : (isAssistant ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)'), 
          gap: '16px' 
        }}>
          <div className="glass-card" style={{ padding: '20px 16px', borderRadius: '24px', textAlign: 'center' }}>
            <TrendingUp size={24} color={isAssistant ? '#007aff' : "var(--gold-primary)"} style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              {isAssistant ? "Comisiones Hoy" : "Producción Hoy"}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '8px' }}>
              <div style={{ fontSize: '26px', fontWeight: '900', color: isAssistant ? '#007aff' : 'var(--gold-primary)', textShadow: isAssistant ? '0 0 15px rgba(0,122,255,0.4)' : '0 0 15px rgba(255, 255, 255,0.4)' }}>${stats.production.toFixed(2)}</div>
              {rates?.usd > 0 && stats.production > 0 && (
                <div style={{ fontSize: '12px', color: isAssistant ? '#007aff' : 'var(--gold-primary)', fontWeight: '800', marginTop: '4px' }}>
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
                <div style={{ fontSize: '26px', fontWeight: '900', color: '#32d74b', textShadow: '0 0 15px rgba(50,215,75,0.4)' }}>${stats.earnings.toFixed(2)}</div>
                {rates?.usd > 0 && stats.earnings > 0 && (
                  <div style={{ fontSize: '12px', color: '#32d74b', fontWeight: '800', marginTop: '4px' }}>
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
            <div style={{ fontSize: '26px', fontWeight: '900', marginTop: '8px', color: 'white' }}>{stats.services}</div>
          </div>

          <div className="glass-card animate-scale-in" style={{ padding: '20px 16px', borderRadius: '24px', textAlign: 'center', border: '1px solid rgba(255, 159, 10, 0.2)', background: 'linear-gradient(135deg, rgba(28,28,30,0.95), rgba(255, 159, 10, 0.02))' }}>
            <Coins size={24} color="#ff9f0a" style={{ margin: '0 auto 12px', filter: 'drop-shadow(0 0 5px rgba(255, 159, 10, 0.4))' }} />
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Propinas Hoy
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '8px' }}>
              <div style={{ fontSize: '26px', fontWeight: '900', color: '#ff9f0a', textShadow: '0 0 15px rgba(255, 159, 10, 0.4)' }}>${stats.tips.toFixed(2)}</div>
              {rates?.usd > 0 && stats.tips > 0 && (
                <div style={{ fontSize: '12px', color: '#ff9f0a', fontWeight: '800', marginTop: '4px' }}>
                  {Math.round(stats.tips * rates.usd).toLocaleString()} BS
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Completed Today Section */}
        <section style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <CheckCircle size={18} color={isAssistant ? "#007aff" : "#32d74b"} />
            <span style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>
              {isAssistant ? "Lavados Completados Hoy" : "Trabajos Completados Hoy"}
            </span>
            <span style={{ 
              marginLeft: 'auto', 
              fontSize: '12px', 
              fontWeight: '900', 
              color: isAssistant ? '#007aff' : 'var(--gold-primary)', 
              background: isAssistant ? 'rgba(0,122,255,0.1)' : 'rgba(255, 255, 255,0.1)', 
              padding: '4px 12px', 
              borderRadius: '20px',
              border: isAssistant ? '1px solid rgba(0,122,255,0.2)' : '1px solid rgba(255, 255, 255,0.2)'
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
              {(() => {
                const totalItems = completedToday;
                const visibleItems = totalItems.slice(0, visibleCompletedCount);
                
                return (
                  <>
                    {visibleItems.map(app => {
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
                    border: isAssistant ? '1px solid rgba(0, 122, 255, 0.15)' : '1px solid rgba(50, 215, 75, 0.15)',
                    background: isAssistant ? 'linear-gradient(135deg, rgba(0,122,255,0.05), rgba(0,0,0,0.4))' : 'linear-gradient(135deg, rgba(50,215,75,0.05), rgba(0,0,0,0.4))',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = isAssistant ? '0 8px 25px rgba(0,122,255,0.15)' : '0 8px 25px rgba(50,215,75,0.15)';
                    e.currentTarget.style.borderColor = isAssistant ? 'rgba(0,122,255,0.4)' : 'rgba(50,215,75,0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = isAssistant ? 'rgba(0, 122, 255, 0.15)' : 'rgba(50, 215, 75, 0.15)';
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          width: '40px', height: '40px', borderRadius: '12px', 
                          background: isAssistant ? 'linear-gradient(135deg, rgba(0,122,255,0.2), rgba(0,122,255,0.05))' : 'linear-gradient(135deg, rgba(50,215,75,0.2), rgba(50,215,75,0.05))', 
                          border: isAssistant ? '1px solid rgba(0,122,255,0.3)' : '1px solid rgba(50,215,75,0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: isAssistant ? 'inset 0 0 10px rgba(0,122,255,0.2)' : 'inset 0 0 10px rgba(50,215,75,0.2)'
                        }}>
                          {isAssistant ? <Droplets size={20} color="#007aff" style={{ filter: 'drop-shadow(0 0 5px rgba(0,122,255,0.5))' }} /> : <Scissors size={20} color="#32d74b" style={{ filter: 'drop-shadow(0 0 5px rgba(50,215,75,0.5))' }} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: '900', fontSize: '16px', color: 'white', letterSpacing: '0.3px' }}>{app.clients?.name || 'Cliente'}</div>
                          <div style={{ fontSize: '13px', color: 'var(--gold-primary)', fontWeight: '800' }}>
                            {isAssistant ? `${app.services?.name} (${app.staff?.name || 'Barbero'})` : app.services?.name}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '18px', fontWeight: '900', color: isAssistant ? '#007aff' : '#32d74b', textShadow: isAssistant ? '0 0 10px rgba(0,122,255,0.4)' : '0 0 10px rgba(50,215,75,0.4)' }}>
                          ${displayVal.toFixed(2)} {isAssistant && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>(Comisión)</span>}
                        </div>
                        {rates?.usd > 0 && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800' }}>{(displayVal * rates.usd).toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Bs.</div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed rgba(255, 255, 255,0.25)' }}>
                      {startedTime && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '800' }}>⏱ {startedTime} → {completedTime}</span>
                          <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: '900', color: isAssistant ? '#007aff' : 'var(--gold-primary)', background: isAssistant ? 'rgba(0,122,255,0.1)' : 'rgba(255, 255, 255,0.1)', padding: '4px 10px', borderRadius: '12px', border: isAssistant ? '1px solid rgba(0,122,255,0.2)' : '1px solid rgba(255, 255, 255,0.2)' }}>
                            {durationMin > 0 ? `${durationMin} min` : 'Completado'}
                          </span>
                        </div>
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
              {completedToday.length > visibleCompletedCount && (
                <button 
                  onClick={() => setVisibleCompletedCount(prev => prev + 5)}
                  style={{
                    background: isAssistant ? 'rgba(0,122,255,0.05)' : 'rgba(50,215,75,0.05)',
                    border: isAssistant ? '1px solid rgba(0,122,255,0.15)' : '1px solid rgba(50,215,75,0.15)',
                    color: isAssistant ? '#007aff' : '#32d74b',
                    padding: '12px',
                    borderRadius: '16px',
                    fontWeight: '800',
                    fontSize: '14px',
                    cursor: 'pointer',
                    marginTop: '10px',
                    transition: 'all 0.2s',
                    boxShadow: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = isAssistant ? 'rgba(0,122,255,0.15)' : 'rgba(50,215,75,0.15)';
                    e.target.style.border = isAssistant ? '1px solid rgba(0,122,255,0.4)' : '1px solid rgba(50,215,75,0.4)';
                    e.target.style.boxShadow = isAssistant ? '0 0 15px rgba(0,122,255,0.2)' : '0 0 15px rgba(50,215,75,0.2)';
                    e.target.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = isAssistant ? 'rgba(0,122,255,0.05)' : 'rgba(50,215,75,0.05)';
                    e.target.style.border = isAssistant ? '1px solid rgba(0,122,255,0.15)' : '1px solid rgba(50,215,75,0.15)';
                    e.target.style.boxShadow = 'none';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  Ver más antiguos ({completedToday.length - visibleCompletedCount})
                </button>
              )}
              </>
              );
              })()}
            </div>
          )}
        </section>

      </div>

      {/* Detail Modal for Completed Service */}
      <AnimatedModal isOpen={!!selectedCompletedApp}>
        {(overlayClass, cardClass) => {
          const app = selectedCompletedApp;
          if (!app) return null;
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
              className={overlayClass}
              onClick={() => setSelectedCompletedApp(null)}
              style={{ 
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                backgroundColor: 'rgba(0,0,0,0.85)', 
                backdropFilter: 'blur(12px)', 
                zIndex: 99999, 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                padding: '20px' 
              }}
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                className={cardClass}
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
                  <div style={{ background: 'rgba(255, 255, 255,0.06)', border: '1px solid rgba(255, 255, 255,0.12)', borderRadius: '16px', padding: '16px' }}>
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
                    <div style={{ background: 'rgba(255, 255, 255,0.06)', padding: '12px', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(255, 255, 255,0.12)' }}>
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
        }}
      </AnimatedModal>

      {/* Modal Enviar a Lavado con Cola de Asistentes */}
      <AnimatedModal isOpen={showWashModal}>
        {(overlayClass, cardClass) => (
          <div
            className={overlayClass.replace('global-modal-overlay', '')}
            onClick={() => setShowWashModal(false)}
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              backgroundColor: 'rgba(0,0,0,0.85)', 
              backdropFilter: 'blur(10px)', 
              zIndex: 99999, 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              padding: '20px' 
            }}
          >
            <div
              className={`glass-card ${cardClass.replace('global-modal-card', '')}`}
              onClick={(e) => e.stopPropagation()}
              style={{ 
                padding: '20px', 
                color: 'white', 
                width: '100%', 
                maxWidth: '360px', 
                borderRadius: '24px', 
                maxHeight: '90vh', 
                overflowY: 'auto',
                boxSizing: 'border-box',
                border: '1.5px solid rgba(255, 255, 255, 0.25)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Droplets size={18} color="#64d2ff" /> Enviar a Lavado
                </h3>
                <button 
                  onClick={() => setShowWashModal(false)} 
                  style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer', padding: '4px' }}
                >
                  &times;
                </button>
              </div>

              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.4' }}>
                Selecciona la asistente de lavado:
              </p>

              {loadingAssistantQueue ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                  Cargando cola de asistentes...
                </div>
              ) : assistantQueue.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '13px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px' }}>
                    No hay asistentes de lavado activos/disponibles hoy.
                  </div>
                  <button
                    onClick={() => confirmSendToWash(null)}
                    style={{
                      height: '48px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #007aff, #00d2ff)',
                      color: 'white',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: '900',
                      cursor: 'pointer'
                    }}
                  >
                    Enviar a Lavado sin Asignar
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                  {assistantQueue.map((q, idx) => {
                    const isActuallyBusy = q.status === 'BUSY';
                    return (
                      <div 
                        key={q.id}
                        className="selection-modal-item"
                        style={{
                          padding: '10px 14px',
                          borderRadius: '16px',
                          border: '1px solid rgba(255,255,255,0.05)',
                          background: 'rgba(255,255,255,0.02)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          width: '100%',
                          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                      >
                        <div style={{ 
                          width: '36px', 
                          height: '36px', 
                          borderRadius: '10px', 
                          background: 'rgba(255,255,255,0.04)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          flexShrink: 0,
                          fontWeight: '900',
                          color: 'var(--gold-primary)',
                          fontSize: '13px',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                          #{idx + 1}
                        </div>
                        
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: '750', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.staff?.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                            <span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', backgroundColor: !isActuallyBusy ? '#32d74b' : '#ff9500' }}></span>
                            <span style={{ fontSize: '10px', color: !isActuallyBusy ? '#32d74b' : '#ff9500', fontWeight: '700' }}>
                              {!isActuallyBusy ? 'Disponible' : 'Atendiendo'}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <button
                            onClick={() => skipAssistantTurn(q.staff_id)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              background: 'rgba(255, 69, 58, 0.1)',
                              border: '1px solid rgba(255, 69, 58, 0.15)',
                              color: '#ff453a',
                              fontSize: '10px',
                              fontWeight: '850',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            Saltar
                          </button>
                          <button
                            onClick={() => confirmSendToWash(q.staff_id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              background: 'var(--gold-primary)',
                              border: 'none',
                              color: 'black',
                              fontSize: '10px',
                              fontWeight: '900',
                              cursor: 'pointer',
                              boxShadow: '0 3px 8px rgba(212, 175, 55, 0.2)',
                              transition: 'all 0.2s'
                            }}
                          >
                            Asignar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatedModal>


      <style>{`
        .hover-item:hover {
          border-color: var(--gold-primary) !important;
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .selection-modal-item {
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .selection-modal-item:hover {
          transform: translateY(-2px) scale(1.008);
          background: rgba(255, 255, 255, 0.04) !important;
          border-color: rgba(255, 255, 255, 0.3) !important;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
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
