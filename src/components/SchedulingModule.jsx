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
  AlertCircle,
  Trash2,
  XCircle,
  Pencil
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import AstroSelect from './AstroSelect';
import AstroTimePicker from './AstroTimePicker';
import AstroDialog from './AstroDialog';
import ScheduleModal from './ScheduleModal';

const SchedulingModule = ({ isMobile }) => {
  const { showToast } = useNotifs();
  const [appointments, setAppointments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [dialog, setDialog] = useState({ isOpen: false, appointmentId: null });
  const [editingApp, setEditingApp] = useState(null);

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
    setShowScheduleModal(true);
  };

  const handleEditAppointment = (app) => {
    setEditingApp(app);
    setNewApp({
      clientId: app.client_id,
      serviceId: app.service_id,
      staffId: app.staff_id,
      time: new Date(app.scheduled_at || app.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    });
    setShowAddModal(true);
  };

  const handleTimeSelected = async (isoTime) => {
    try {
      const service = services.find(s => s.id === newApp.serviceId);
      
      if (editingApp) {
        await dataService.updateAppointment(editingApp.id, {
          client_id: newApp.clientId,
          service_id: newApp.serviceId,
          staff_id: newApp.staffId,
          total_price: service.price,
          scheduled_at: isoTime
        });
        showToast("Cita actualizada");
      } else {
        await dataService.createAppointment({
          client_id: newApp.clientId,
          service_id: newApp.serviceId,
          staff_id: newApp.staffId,
          status: 'Agendado',
          total_price: service.price,
          scheduled_at: isoTime
        });
        showToast("Cita agendada correctamente");
      }

      setShowAddModal(false);
      setShowScheduleModal(false);
      setEditingApp(null);
      loadDailyAppointments();
    } catch (err) {
      showToast("Error al procesar cita", "error");
    }
  };

  const handleManageAppointment = (id) => {
    setDialog({ isOpen: true, appointmentId: id });
  };

  const processAction = async (action) => {
    try {
      if (action === 'cancel') {
        await dataService.updateAppointmentStatus(dialog.appointmentId, 'Cancelada');
        showToast("Cita marcada como cancelada");
      } else if (action === 'delete') {
        await dataService.deleteAppointment(dialog.appointmentId);
        showToast("Cita eliminada permanentemente");
      }
      setDialog({ isOpen: false, appointmentId: null });
      loadDailyAppointments();
    } catch (err) {
      showToast("Error al procesar acción", "error");
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

      {/* Agenda Content */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden', borderRadius: '24px' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '80px 1.5fr 1.5fr 1.5fr 100px 120px 60px', gap: '15px', alignItems: 'center' }}>
          {!isMobile && (
            <>
              <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '1px' }}>HORA</div>
              <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '1px' }}>BARBERO</div>
              <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '1px' }}>SERVICIO</div>
              <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '1px' }}>CLIENTE</div>
              <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '1px' }}>VALOR</div>
              <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '1px', textAlign: 'center' }}>ESTADO</div>
              <div style={{ textAlign: 'right' }}></div>
            </>
          )}
        </div>

        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '100px', textAlign: 'center' }}>
              <div className="animate-pulse" style={{ color: 'var(--gold-primary)', fontWeight: '800' }}>Sincronizando Agenda...</div>
            </div>
          ) : appointments.length === 0 ? (
            <div style={{ padding: '100px', textAlign: 'center' }}>
              <CalendarIcon size={48} color="rgba(255,255,255,0.05)" style={{ marginBottom: '16px' }} />
              <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic' }}>No hay citas registradas para este día</div>
            </div>
          ) : (
            appointments
              .sort((a, b) => new Date(a.scheduled_at || a.created_at) - new Date(b.scheduled_at || b.created_at))
              .map(app => (
              <div 
                key={app.id} 
                className="hover-item"
                style={{ 
                  padding: '16px 24px', 
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  display: 'grid', 
                  gridTemplateColumns: isMobile ? '1fr' : '80px 1.5fr 1.5fr 1.5fr 100px 120px 60px', 
                  gap: '15px', 
                  alignItems: 'center',
                  transition: 'all 0.2s',
                  backgroundColor: app.status === 'Cancelada' ? 'rgba(255,69,58,0.02)' : 'transparent'
                }}
              >
                {/* Time */}
                <div style={{ fontWeight: '900', fontSize: '13px', color: 'white' }}>
                  {new Date(app.scheduled_at || app.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                </div>

                {/* Barber */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'black', fontWeight: '900' }}>
                    {app.staff?.name?.charAt(0)}
                  </div>
                  <div style={{ fontWeight: '700', fontSize: '13px' }}>{app.staff?.name}</div>
                </div>

                {/* Service */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Scissors size={14} color="var(--text-muted)" />
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{app.services?.name}</div>
                </div>

                {/* Client */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={14} color="var(--text-muted)" />
                  <div style={{ fontWeight: '700', fontSize: '13px' }}>{app.clients?.name}</div>
                </div>

                {/* Value */}
                <div style={{ fontWeight: '900', fontSize: '14px', color: 'var(--gold-primary)' }}>
                  ${app.total_price || app.services?.price}
                </div>

                {/* Status */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{ 
                    fontSize: '9px', 
                    fontWeight: '900', 
                    padding: '4px 10px', 
                    borderRadius: '20px', 
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    backgroundColor: app.status === 'Agendado' ? 'rgba(212,175,55,0.1)' : app.status === 'Cancelada' ? 'rgba(255,69,58,0.1)' : 'rgba(76,175,80,0.1)',
                    color: app.status === 'Agendado' ? 'var(--gold-primary)' : app.status === 'Cancelada' ? '#ff453a' : '#4caf50',
                    border: `1px solid ${app.status === 'Agendado' ? 'rgba(212,175,55,0.2)' : app.status === 'Cancelada' ? 'rgba(255,69,58,0.2)' : 'rgba(76,175,80,0.2)'}`
                  }}>
                    {app.status}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button 
                    onClick={() => handleEditAppointment(app)}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: '8px', transition: 'color 0.2s' }}
                    className="hover-gold"
                  >
                    <Pencil size={16} />
                  </button>
                  <button 
                    onClick={() => handleManageAppointment(app.id)}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: '8px', transition: 'color 0.2s' }}
                    className="hover-red"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Action Dialog */}
      <AstroDialog 
        isOpen={dialog.isOpen}
        title="Gestionar Cita"
        message="¿Qué deseas hacer con esta cita seleccionada?"
        onCancel={() => setDialog({ isOpen: false, appointmentId: null })}
        customFooter={
          <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '20px' }}>
            <button 
              onClick={() => processAction('cancel')}
              style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1px solid #ff453a', background: 'rgba(255,69,58,0.1)', color: '#ff453a', fontWeight: '800', cursor: 'pointer', fontSize: '12px' }}
            >
              MARCAR CANCELADA
            </button>
            <button 
              onClick={() => processAction('delete')}
              style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontWeight: '800', cursor: 'pointer', fontSize: '12px' }}
            >
              BORRAR PERMANENTE
            </button>
          </div>
        }
      />

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleModal 
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          onSchedule={handleTimeSelected}
          defaultDate={selectedDate}
          client={clients.find(c => c.id === newApp.clientId)}
          service={services.find(s => s.id === newApp.serviceId)}
          staff={staff.find(s => s.id === newApp.staffId)}
        />
      )}

      {/* Add Modal */}
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

              <AstroSelect 
                label="BARBERO"
                placeholder="Cualquiera"
                value={newApp.staffId}
                onChange={(val) => setNewApp({...newApp, staffId: val})}
                options={staff.map(s => ({ label: s.name, value: s.id }))}
              />
                
              {/* Time Selection Button */}
              <div style={{ marginTop: '20px' }}>
                <button 
                  onClick={() => {
                    if (!newApp.clientId || !newApp.serviceId || !newApp.staffId) {
                      showToast("Primero selecciona cliente, servicio y barbero", "error");
                      return;
                    }
                    setShowScheduleModal(true);
                  }}
                  className="btn-gold"
                  style={{ width: '100%', height: '56px', borderRadius: '16px', fontSize: '15px' }}
                >
                  <Clock size={18} style={{ marginRight: '8px' }} />
                  {editingApp ? 'CAMBIAR HORARIO' : 'SELECCIONAR HORARIO'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '40px' }}>
              <button onClick={() => setShowAddModal(false)} style={{ flex: 1, background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '14px', fontWeight: '700', cursor: 'pointer' }}>CANCELAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulingModule;
