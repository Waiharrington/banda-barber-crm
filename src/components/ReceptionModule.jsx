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
  ArrowRight
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import AstroSelect from './AstroSelect';
import NewClientModal from './NewClientModal';
import ScheduleModal from './ScheduleModal';

const ReceptionModule = ({ isMobile }) => {
  const { showToast, triggerConfetti } = useNotifs();
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedServices, setSelectedServices] = useState([]);
  const [idSearch, setIdSearch] = useState('');
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  
  const [activeAppointments, setActiveAppointments] = useState([]);
  
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
      const [c, s, st, active] = await Promise.all([
        dataService.getClients(),
        dataService.getServices(),
        dataService.getStaff(),
        dataService.getAppointmentsByState(['En Silla'])
      ]);
      setClients(c);
      setServices(s);
      setStaff(st);
      setActiveAppointments(active);
    } catch (err) {
      console.error(err);
    }
  };

  const handleIdSearch = () => {
    const client = clients.find(c => c.id_card === idSearch);
    if (client) {
      setSelectedClient(client);
      setIdSearch('');
      showToast(`Cliente identificado: ${client.name}`);
    } else {
      showToast("Cédula no encontrada. Registra al cliente.", "warning");
    }
  };

  const addService = (serviceId) => {
    const service = services.find(s => s.id === serviceId);
    if (service && !selectedServices.find(s => s.id === serviceId)) {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const removeService = (serviceId) => {
    setSelectedServices(selectedServices.filter(s => s.id !== serviceId));
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

  const handleSubmit = async (statusOverride, scheduledAt = null) => {
    if (!selectedClient || selectedServices.length === 0 || !formData.staffId) {
      showToast("Selecciona cliente, al menos un servicio y barbero", "error");
      return;
    }

    try {
      setLoading(true);
      
      // We process multiple services as individual appointments/lines for now 
      // but linked to the same event. In a complex DB we'd have a Transaction table.
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
      
      await Promise.all(promises);

      showToast(scheduledAt ? `¡Cita agendada para las ${new Date(scheduledAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}!` : `¡Orden enviada! ${selectedServices.length} servicios en cola.`);
      if (!statusOverride || statusOverride === 'En Silla') triggerConfetti();
      
      // Reset
      setSelectedClient(null);
      setSelectedServices([]);
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '18px' }}>{selectedClient.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>V-{selectedClient.id_card}</div>
                  </div>
                  <button onClick={() => setSelectedClient(null)} style={{ background: 'none', border: 'none', color: '#ff453a', fontWeight: '800', cursor: 'pointer' }}>Cambiar</button>
                </div>
                
                {/* Technical File Mini View */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Cabello</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--gold-primary)' }}>{selectedClient.hair_type || 'No especificado'}</div>
                  </div>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Cuero</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--gold-primary)' }}>{selectedClient.scalp_type || 'No especificado'}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search style={{ position: 'absolute', left: '16px', top: '14px' }} size={18} color="var(--text-muted)" />
                  <input 
                    type="text" 
                    placeholder="Escribe Cédula..." 
                    value={idSearch}
                    onChange={(e) => setIdSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleIdSearch()}
                    style={{ width: '100%', paddingLeft: '48px', height: '48px' }}
                  />
                </div>
                <button onClick={handleIdSearch} className="btn-gold" style={{ width: '48px', height: '48px', padding: 0, borderRadius: '12px' }}>
                  <ArrowRight size={20} />
                </button>
              </div>
            )}
          </div>

          <div className="glass-card" style={{ borderRadius: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Scissors size={20} color="var(--gold-primary)" />
              <span style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>2. Detalle del Servicio</span>
            </div>
            
            <AstroSelect 
              label="AÑADIR SERVICIO / UPSELL"
              placeholder="Selecciona servicio"
              value="" // Static selector that adds to list
              onChange={val => addService(val)}
              options={services.map(s => ({ label: `${s.name} ($${s.price})`, value: s.id }))}
              style={{ marginBottom: '16px' }}
            />

            {selectedServices.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                {selectedServices.map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700' }}>{s.name}</div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ fontSize: '11px', color: 'var(--gold-primary)', fontWeight: '800' }}>${s.price}</div>
                        {s.included_items && s.included_items.length > 0 && (
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            • {s.included_items.join(' • ')}
                          </div>
                        )}
                      </div>
                    </div>
                    <button onClick={() => removeService(s.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }}>&times;</button>
                  </div>
                ))}
                <div style={{ textAlign: 'right', padding: '10px', fontWeight: '800', color: 'var(--gold-primary)' }}>
                  TOTAL: ${selectedServices.reduce((acc, s) => acc + s.price, 0)}
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
                      onClick={() => setFormData({...formData, staffId: s.id})}
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
            ) : selectedServices.length === 0 ? (
              <>
                <Scissors size={48} color="rgba(212,175,55,0.2)" style={{ marginBottom: '20px' }} />
                <h3 style={{ color: 'var(--text-secondary)' }}>Añade los servicios</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>Busca el MVP y añade los Upsells correspondientes.</p>
              </>
            ) : (
              <div className="animate-slide-up">
                <CheckCircle2 size={56} color="var(--gold-primary)" style={{ marginBottom: '24px' }} />
                <h3 style={{ fontSize: '24px', marginBottom: '8px' }}>Todo Listo</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
                  {selectedClient.name} se atenderá con {staff.find(s => s.id === formData.staffId)?.name || '...'}
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                  <button 
                    disabled={loading || activeAppointments.some(a => a.staff_id === formData.staffId)}
                    onClick={() => handleSubmit('En Silla')}
                    className="btn-gold" 
                    style={{ 
                      height: '60px', 
                      borderRadius: '18px', 
                      fontSize: '16px',
                      opacity: activeAppointments.some(a => a.staff_id === formData.staffId) ? 0.5 : 1,
                      cursor: activeAppointments.some(a => a.staff_id === formData.staffId) ? 'not-allowed' : 'pointer'
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

      <style>{`
        .hover-item:hover {
          background-color: rgba(212,175,55,0.1) !important;
          transform: translateX(5px);
        }
      `}</style>
    </div>
  );
};

export default ReceptionModule;
