import React, { useState, useEffect } from 'react';
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
  LogOut
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';

const BarberPanel = ({ isMobile }) => {
  const { showToast, triggerConfetti } = useNotifs();
  const [staff, setStaff] = useState([]);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [myServices, setMyServices] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStaff();
  }, []);

  useEffect(() => {
    if (selectedBarber) {
      loadMyWork();
      const interval = setInterval(loadMyWork, 15000); // Auto-refresh every 15s
      return () => clearInterval(interval);
    }
  }, [selectedBarber]);

  const loadStaff = async () => {
    try {
      const data = await dataService.getStaff();
      setStaff(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMyWork = async () => {
    if (!selectedBarber) return;
    try {
      const data = await dataService.getAppointmentsByState(['En Silla', 'Agendado']);
      // Filter services assigned to ME
      const filtered = data.filter(s => s.staff_id === selectedBarber.id);
      setMyServices(filtered);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFinishService = async (serviceId) => {
    try {
      setLoading(true);
      await dataService.updateAppointmentStatus(serviceId, 'Por Pagar');
      showToast("¡Servicio finalizado! Enviado a caja para cobro.");
      triggerConfetti();
      loadMyWork();
    } catch (err) {
      showToast("Error al finalizar servicio", "error");
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
              <span style={{ fontWeight: '800', fontSize: '15px' }}>{s.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
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
        <button 
          onClick={() => setSelectedBarber(null)}
          style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-secondary)', padding: '10px 16px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}
        >
          <LogOut size={16} /> Salir
        </button>
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ height: '120px', borderRadius: '16px', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px dashed rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
                      <Camera size={24} color="var(--text-muted)" />
                      <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>FOTO ANTES</span>
                    </div>
                    <div style={{ height: '120px', borderRadius: '16px', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px dashed rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
                      <Camera size={24} color="var(--text-muted)" />
                      <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>FOTO DESPUÉS</span>
                    </div>
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

        {/* Stats Overlay for the barber */}
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="glass-card" style={{ borderRadius: '24px', textAlign: 'center' }}>
            <TrendingUp size={24} color="var(--gold-primary)" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Producción Hoy</div>
            <div style={{ fontSize: '24px', fontWeight: '900' }}>$0.00</div>
          </div>
          <div className="glass-card" style={{ borderRadius: '24px', textAlign: 'center' }}>
            <Award size={24} color="var(--gold-primary)" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Servicios</div>
            <div style={{ fontSize: '24px', fontWeight: '900' }}>0</div>
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
