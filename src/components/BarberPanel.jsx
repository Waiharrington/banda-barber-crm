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
  RefreshCw
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import AstroCamera from './AstroCamera';
import { Plus, ShoppingBag, Loader2 } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const BarberPanel = ({ isMobile, rates }) => {
  const { user } = useAuth();
  const { showToast, triggerConfetti, triggerRocket } = useNotifs();
  const [staff, setStaff] = useState([]);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [myServices, setMyServices] = useState([]);
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

  const [stats, setStats] = useState({ production: 0, services: 0 });

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

  // Auto-select if current user is a barber
  useEffect(() => {
    if (staff.length > 0 && user) {
      const isBarber = user.role === 'Barbero' || user.role?.startsWith('Barbero|');
      if (isBarber) {
        const me = staff.find(s => s.id === user.id);
        if (me) setSelectedBarber(me);
      }
    }
  }, [staff, user]);

  const loadMyWork = useCallback(async () => {
    if (!selectedBarber) return;
    try {
      setLoading(true);
      const data = await dataService.getAppointmentsByState(['En Silla', 'Agendado']);
      // Filter services assigned to ME
      const filtered = data.filter(s => String(s.staff_id) === String(selectedBarber.id));
      setMyServices(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedBarber]);

  useEffect(() => {
    if (selectedBarber) {
      loadMyWork();
      loadStats();
      
      // Real-time listener for appointments
      const subscription = supabase
        .channel(`barber-realtime-${selectedBarber.id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'appointments' 
        }, (payload) => {
          // Check if this change belongs to THIS barber
          const isForMe = String(payload.new?.staff_id) === String(selectedBarber.id) || 
                          String(payload.old?.staff_id) === String(selectedBarber.id);
          
          if (isForMe) {
            if (payload.eventType === 'INSERT') {
              showToast("🚀 ¡Nueva cita asignada!");
              triggerRocket();
            } else if (payload.eventType === 'UPDATE' && payload.new.status === 'En Silla') {
              showToast("🚀 ¡Cliente listo en silla!", "success");
              triggerRocket();
            } else {
              showToast("Actualizando silla...", "info");
            }
            
            // Reload with a tiny delay to ensure DB consistency
            setTimeout(() => {
              loadMyWork();
              loadStats();
            }, 500);
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [selectedBarber, loadMyWork]);

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
      const data = await dataService.getBarberDailyStats(selectedBarber.id);
      setStats({ production: data.productionUsd, services: data.services });
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
    } catch (err) {
      showToast("Error al finalizar servicio", "error");
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
        <h2 style={{ fontSize: '28px', fontWeight: '900', marginBottom: '10px' }}>Panel del <span className="text-gold">Barbero</span></h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>Selecciona tu perfil para comenzar tu turno.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '20px', maxWidth: '600px', margin: '0 auto' }}>
          {staff.map(s => (
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

  return (
    <div className="animate-fade-in" style={{ maxWidth: '550px', margin: '0 auto', paddingBottom: '100px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--gold-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Scissors size={20} color="black" />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '900' }}>Hola, <span className="text-gold">{selectedBarber.name.split(' ')[0]}</span></h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>Gestiona tus servicios activos y citas.</p>
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
              myServices.map(app => (
                <div key={app.id} className="glass-card animate-slide-up" style={{ borderRadius: '28px', padding: '24px', background: app.status === 'En Silla' ? 'linear-gradient(135deg, rgba(28,28,30,0.95), rgba(212,175,55,0.03))' : 'var(--bg-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{app.status}</span>
                      <h3 style={{ fontSize: '22px', fontWeight: '900', marginTop: '4px' }}>{app.clients.name}</h3>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '15px', marginTop: '4px' }}>{app.services.name}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '20px', fontWeight: '900' }}>${app.services.price}</div>
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
                            <span style={{ color: 'var(--gold-primary)', fontWeight: '800' }}>+${ex.price}</span>
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
                    <button 
                      onClick={() => handleFinishService(app.id)}
                      disabled={loading}
                      className="btn-gold" 
                      style={{ width: '100%', height: '56px', borderRadius: '16px', fontSize: '16px', gap: '10px' }}
                    >
                      <CheckCircle size={20} /> FINALIZAR Y ENVIAR A CAJA
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
              ))
            )}
          </div>
        </section>

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

        {/* Stats Overlay for the barber */}
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', textAlign: 'center' }}>
            <TrendingUp size={24} color="var(--gold-primary)" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Producción Hoy</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: '900' }}>${stats.production.toFixed(2)}</div>
              {rates?.usd > 0 && stats.production > 0 && (
                <div style={{ fontSize: '12px', color: 'var(--gold-primary)', fontWeight: '800', marginTop: '2px' }}>{Math.round(stats.production * rates.usd).toLocaleString()} BS</div>
              )}
            </div>
          </div>
          <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', textAlign: 'center' }}>
            <Award size={24} color="var(--gold-primary)" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Servicios</div>
            <div style={{ fontSize: '24px', fontWeight: '900', marginTop: '8px' }}>{stats.services}</div>
          </div>
        </section>

      </div>

      <style>{`
        .hover-item:hover {
          border-color: var(--gold-primary) !important;
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
      `}</style>
    </div>
  );
};

export default BarberPanel;
