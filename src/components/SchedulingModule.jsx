import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Scissors, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import AstroSelect from './AstroSelect';
import AstroTimePicker from './AstroTimePicker';

const SchedulingModule = ({ isMobile }) => {
  const { showToast } = useNotifs();
  const [appointments, setAppointments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newApp, setNewApp] = useState({
    clientId: '',
    serviceId: '',
    staffId: '',
    time: '10:00'
  });

  useEffect(() => {
    loadBaseData();
  }, []);

  useEffect(() => {
    loadDailyAppointments();
  }, [selectedDate]);

  const loadBaseData = async () => {
    try {
      const [st, cl, sv] = await Promise.all([
        dataService.getStaff(),
        dataService.getClients(),
        dataService.getServices()
      ]);
      setStaff(st);
      setClients(cl);
      setServices(sv);
    } catch (err) {
      console.error(err);
    }
  };

  const loadDailyAppointments = async () => {
    try {
      setLoading(true);
      // In a real app we'd filter by date in SQL
      // For now we get all and filter locally
      const data = await dataService.getAppointmentsByState(['Agendado', 'En Silla', 'Por Pagar']);
      const dateStr = selectedDate.toISOString().split('T')[0];
      const daily = data.filter(a => a.created_at?.startsWith(dateStr));
      setAppointments(daily);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAppointment = async () => {
    if (!newApp.clientId || !newApp.serviceId || !newApp.staffId) {
      showToast("Completa los datos de la cita", "error");
      return;
    }

    try {
      const service = services.find(s => s.id === newApp.serviceId);
      // Combine selectedDate and newApp.time
      const [hours, minutes] = newApp.time.split(':');
      const appDateTime = new Date(selectedDate);
      appDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      await dataService.createAppointment({
        client_id: newApp.clientId,
        service_id: newApp.serviceId,
        staff_id: newApp.staffId,
        status: 'Agendado',
        total_price: service.price,
        created_at: appDateTime.toISOString() // Explicit date for scheduling
      });

      showToast("Cita agendada correctamente");
      setShowAddModal(false);
      loadDailyAppointments();
    } catch (err) {
      showToast("Error al agendar cita", "error");
    }
  };

  const changeDate = (days) => {
    const next = new Date(selectedDate);
    next.setDate(selectedDate.getDate() + days);
    setSelectedDate(next);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '100px' }}>
      <header style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'flex-start' : 'center', 
        gap: '20px',
        marginBottom: '40px' 
      }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '900' }}>Agenda <span className="text-gold">Astro</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gestión de citas cronológica por barbero.</p>
        </div>
        <button className="btn-gold" onClick={() => setShowAddModal(true)}>
          <Plus size={18} /> Agendar Cita
        </button>
      </header>

      {/* Date Selector */}
      <div className="glass-card" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '32px',
        padding: '16px 24px',
        borderRadius: '20px'
      }}>
        <button onClick={() => changeDate(-1)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><ChevronLeft /></button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '2px', marginBottom: '4px' }}>Mostrando Agenda</div>
          <div style={{ fontWeight: '800', fontSize: '18px' }}>{formatDate(selectedDate)}</div>
        </div>
        <button onClick={() => changeDate(1)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><ChevronRight /></button>
      </div>

      {/* Agenda Board */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : `repeat(${staff.length || 1}, 1fr)`, 
        gap: '20px',
        overflowX: 'auto'
      }}>
        {staff.map(barber => (
          <div key={barber.id} className="glass-card" style={{ minWidth: '260px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.03)', background: 'rgba(28,28,30,0.4)' }}>
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--gold-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={16} color="black" />
              </div>
              <span style={{ fontWeight: '900', fontSize: '14px', letterSpacing: '0.5px' }}>{barber.name}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {appointments.filter(a => a.staff_id === barber.id).length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>Sin citas este día</div>
              ) : (
                appointments.filter(a => a.staff_id === barber.id).map(app => (
                  <div key={app.id} style={{ 
                    padding: '12px', 
                    borderRadius: '16px', 
                    background: 'rgba(255,255,255,0.03)',
                    borderLeft: `4px solid ${app.status === 'Agendado' ? 'var(--gold-primary)' : '#4caf50'}`,
                  }}>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                      <Clock size={10} /> {new Date(app.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ fontWeight: '800', fontSize: '14px' }}>{app.clients?.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{app.services?.name}</div>
                    <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '9px', fontWeight: '900', padding: '2px 8px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.05)' }}>{app.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal Placeholder Logic */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className="glass-card animate-scale-in" style={{ maxWidth: '500px', width: '100%', borderRadius: '32px', border: '1.5px solid rgba(212,175,55,0.3)' }}>
            <h2 style={{ marginBottom: '24px', fontWeight: '900' }}>Nueva Cita</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <AstroSelect 
                label="CLIENTE"
                placeholder="Selecciona cliente"
                value={newApp.clientId}
                onChange={(val) => setNewApp({...newApp, clientId: val})}
                options={clients.map(c => ({ label: c.name, value: c.id }))}
              />

              <AstroSelect 
                label="SERVICIO"
                placeholder="Selecciona servicio"
                value={newApp.serviceId}
                onChange={(val) => setNewApp({...newApp, serviceId: val})}
                options={services.map(s => ({ label: `${s.name} ($${s.price})`, value: s.id }))}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px' }}>
                <AstroSelect 
                  label="BARBERO"
                  placeholder="Cualquiera"
                  value={newApp.staffId}
                  onChange={(val) => setNewApp({...newApp, staffId: val})}
                  options={staff.map(s => ({ label: s.name, value: s.id }))}
                />
                
                <AstroTimePicker 
                  label="HORA"
                  value={newApp.time}
                  onChange={(val) => setNewApp({...newApp, time: val})}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '40px' }}>
              <button onClick={() => setShowAddModal(false)} style={{ flex: 1, background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '14px', fontWeight: '700', cursor: 'pointer' }}>CANCELAR</button>
              <button onClick={handleAddAppointment} className="btn-gold" style={{ flex: 1.5, height: '56px', borderRadius: '18px' }}>CONFIRMAR CITA</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulingModule;
