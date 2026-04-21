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
  
  const [formData, setFormData] = useState({
    serviceId: '',
    staffId: '',
    status: 'En Silla' // Default flow: receive and sit
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [c, s, st] = await Promise.all([
        dataService.getClients(),
        dataService.getServices(),
        dataService.getStaff()
      ]);
      setClients(c);
      setServices(s);
      setStaff(st);
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

  const handleCreateClient = async () => {
    const name = window.prompt("Nombre del nuevo cliente:");
    if (!name) return;
    const phone = window.prompt("Teléfono:");
    try {
      const newC = await dataService.addClient({ name, phone });
      setClients([...clients, newC]);
      setSelectedClient(newC);
      showToast(`Cliente ${name} creado con éxito`);
    } catch (err) {
      showToast("Error al crear cliente", "error");
    }
  };

  const handleSubmit = async (statusOverride) => {
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
          total_price: service.price
        })
      );
      
      await Promise.all(promises);

      showToast(`¡Orden enviada! ${selectedServices.length} servicios en cola.`);
      if (!statusOverride || statusOverride === 'En Silla') triggerConfetti();
      
      // Reset
      setSelectedClient(null);
      setSelectedServices([]);
      setFormData({ serviceId: '', staffId: '', status: 'En Silla' });
    } catch (err) {
      showToast("Error al procesar orden", "error");
      console.error(err);
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
                      <div style={{ fontSize: '11px', color: 'var(--gold-primary)' }}>${s.price}</div>
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
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px' }}>BARBERO DISPONIBLE</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
                {staff.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setFormData({...formData, staffId: s.id})}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '16px',
                      border: formData.staffId === s.id ? '1.5px solid var(--gold-primary)' : '1px solid var(--border-color)',
                      backgroundColor: formData.staffId === s.id ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.02)',
                      color: formData.staffId === s.id ? 'var(--gold-primary)' : 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.3s'
                    }}
                  >
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Users size={16} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: '800', textAlign: 'center' }}>{s.name.split(' ')[0]}</span>
                  </button>
                ))}
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
                    disabled={loading}
                    onClick={() => handleSubmit('En Silla')}
                    className="btn-gold" 
                    style={{ height: '60px', borderRadius: '18px', fontSize: '16px' }}
                  >
                    <Zap size={20} fill="currentColor" /> INICIAR AHORA
                  </button>
                  <button 
                    disabled={loading}
                    onClick={() => handleSubmit('Agendado')}
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
