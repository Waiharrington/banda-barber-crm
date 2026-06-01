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
  Pencil,
  Filter,
  List,
  Search
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import AstroSelect from './AstroSelect';
import AstroDialog from './AstroDialog';
import ScheduleModal from './ScheduleModal';
import { useAuth } from '../context/AuthContext';

const SchedulingModule = ({ isMobile }) => {
  const { user } = useAuth();
  const { showToast } = useNotifs();
  const [appointments, setAppointments] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [allExtras, setAllExtras] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [dialog, setDialog] = useState({ isOpen: false, appointmentId: null });
  const [editingApp, setEditingApp] = useState(null);
  const [filterType, setFilterType] = useState('day'); // 'day', 'week', 'fortnight', 'month'
  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [clientSearchResults, setClientSearchResults] = useState([]);

  const [newApp, setNewApp] = useState({
    clientId: '',
    serviceId: '',
    staffId: '',
    time: '10:00',
    extras: [],
    products: []
  });

  useEffect(() => {
    loadBaseData();
    loadAllAppointments(); // For calendar dots
  }, []);

  useEffect(() => {
    loadFilteredAppointments();
  }, [selectedDate, filterType]);

  const loadBaseData = async () => {
    try {
      const [st, cl, sv, ex, pr] = await Promise.all([
        dataService.getStaff(),
        dataService.getClients(),
        dataService.getServices(),
        dataService.getExtras(),
        dataService.getInventory()
      ]);
      setStaff(st);
      setClients(cl);
      setServices(sv);
      setAllExtras(ex.filter(e => e.name !== 'SYSTEM_CONFIG_RATES'));
      setAllProducts(pr.filter(p => p.category === 'Venta'));
    } catch (err) {
      console.error(err);
    }
  };

  const loadAllAppointments = async () => {
    try {
      let data = await dataService.getAppointmentsByState(['Agendado', 'En Silla', 'En Lavado', 'Por Pagar', 'Completado', 'Cancelada']);
      
      const isBarber = user?.role === 'Barbero' || user?.role?.startsWith('Barbero|');
      if (isBarber) {
        data = data.filter(a => String(a.staff_id) === String(user.id));
      }
      
      setAllAppointments(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadFilteredAppointments = async () => {
    try {
      setLoading(true);
      let data = await dataService.getAppointmentsByState(['Agendado', 'En Silla', 'En Lavado', 'Por Pagar', 'Completado', 'Cancelada']);
      
      const isBarber = user?.role === 'Barbero' || user?.role?.startsWith('Barbero|');
      if (isBarber) {
        data = data.filter(a => String(a.staff_id) === String(user.id));
      }
      
      const start = new Date(selectedDate);
      start.setHours(0, 0, 0, 0);
      
      let end = new Date(start);
      if (filterType === 'day') end.setDate(start.getDate() + 1);
      else if (filterType === 'week') end.setDate(start.getDate() + 7);
      else if (filterType === 'fortnight') end.setDate(start.getDate() + 14);
      else if (filterType === 'month') {
        start.setDate(1);
        end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
      }

      const filtered = data.filter(a => {
        const appDate = new Date(a.scheduled_at || a.created_at);
        return appDate >= start && appDate < end;
      });

      setAppointments(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditAppointment = (app) => {
    setEditingApp(app);
    const clientName = clients.find(c => c.id === app.client_id)?.name || '';
    setClientSearchTerm(clientName);
    setClientSearchResults([]);
    setNewApp({
      clientId: app.client_id,
      serviceId: app.service_id,
      staffId: app.staff_id,
      time: new Date(app.scheduled_at || app.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      extras: app.appointment_extras?.map(e => e.service_extras?.id) || [],
      products: app.appointment_products?.map(p => ({ id: p.inventory?.id, quantity: p.quantity })) || []
    });
    setShowAddModal(true);
  };

  const handleClientSearch = (val) => {
    setClientSearchTerm(val);
    setNewApp(prev => ({ ...prev, clientId: '' }));
    if (val.length >= 2) {
      const term = val.toLowerCase();
      const results = clients.filter(c =>
        (c.id_card && c.id_card.toLowerCase().includes(term)) ||
        (c.name && c.name.toLowerCase().includes(term))
      );
      setClientSearchResults(results.slice(0, 5));
    } else {
      setClientSearchResults([]);
    }
  };

  const handleSelectClient = (client) => {
    setNewApp(prev => ({ ...prev, clientId: client.id }));
    setClientSearchTerm(client.name);
    setClientSearchResults([]);
  };

  const handleTimeSelected = async (isoTime) => {
    try {
      const service = services.find(s => s.id === newApp.serviceId);
      
      let appointmentId = editingApp?.id;

      if (editingApp) {
        await dataService.updateAppointment(editingApp.id, {
          client_id: newApp.clientId,
          service_id: newApp.serviceId,
          staff_id: newApp.staffId,
          total_price: service.price,
          scheduled_at: isoTime
        });
        
        // Limpiar extras y productos anteriores para re-insertar
        await Promise.all([
          dataService.supabase.from('appointment_extras').delete().eq('appointment_id', editingApp.id),
          dataService.supabase.from('appointment_products').delete().eq('appointment_id', editingApp.id)
        ]);
        
        showToast("Cita actualizada");
      } else {
        const created = await dataService.createAppointment({
          client_id: newApp.clientId,
          service_id: newApp.serviceId,
          staff_id: newApp.staffId,
          status: 'Agendado',
          total_price: service.price,
          scheduled_at: isoTime
        });
        appointmentId = created.id;
        showToast("Cita agendada correctamente");
      }

      // Insertar extras y productos
      const extrasPromises = newApp.extras.map(exId => {
        const ex = allExtras.find(e => e.id === exId);
        return dataService.addExtraToAppointment(appointmentId, exId, ex.price);
      });

      const productsPromises = newApp.products.map(p => {
        const prod = allProducts.find(pr => pr.id === p.id);
        return dataService.addProductToAppointment(appointmentId, p.id, p.quantity, prod.price);
      });

      await Promise.all([...extrasPromises, ...productsPromises]);

      setShowAddModal(false);
      setShowScheduleModal(false);
      setEditingApp(null);
      loadFilteredAppointments();
      loadAllAppointments();
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
      loadFilteredAppointments();
      loadAllAppointments();
    } catch (err) {
      showToast("Error al procesar acción", "error");
    }
  };

  const formatDateLabel = (date) => {
    if (filterType === 'day') return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    if (filterType === 'month') return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    
    const end = new Date(date);
    if (filterType === 'week') end.setDate(date.getDate() + 6);
    else if (filterType === 'fortnight') end.setDate(date.getDate() + 13);
    
    return `${date.getDate()} ${date.toLocaleDateString('es-ES', { month: 'short' })} - ${end.getDate()} ${end.toLocaleDateString('es-ES', { month: 'short' })}`;
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '100px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '900' }}>Agenda <span className="text-gold">Astro</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gestión inteligente de citas y disponibilidad.</p>
        </div>
        <button className="btn-gold" onClick={() => {
            setEditingApp(null);
            setNewApp({ clientId: '', serviceId: '', staffId: user?.id || '', time: '10:00', extras: [], products: [] });
            setClientSearchTerm('');
            setClientSearchResults([]);
            setShowAddModal(true);
          }}>
          <Plus size={18} /> Agendar Cita
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '320px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Side: Mini Calendar */}
        <aside style={{ position: isMobile ? 'relative' : 'sticky', top: '20px' }}>
          <MiniCalendar 
            selectedDate={selectedDate} 
            onDateSelect={(d) => {
              setSelectedDate(d);
              setFilterType('day');
            }} 
            allAppointments={allAppointments}
          />

          <div className="glass-card" style={{ marginTop: '20px', padding: '20px', borderRadius: '24px' }}>
            <h4 style={{ fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '1.5px', marginBottom: '16px', textTransform: 'uppercase' }}>Filtros de Vista</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { id: 'day', label: 'Hoy / Día', icon: <Clock size={14} /> },
                { id: 'week', label: 'Semanal', icon: <CalendarIcon size={14} /> },
                { id: 'fortnight', label: 'Quincenal', icon: <Filter size={14} /> },
                { id: 'month', label: 'Mensual', icon: <List size={14} /> }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '14px',
                    border: 'none',
                    background: filterType === f.id ? 'var(--gold-primary)' : 'rgba(255,255,255,0.03)',
                    color: filterType === f.id ? 'black' : 'white',
                    fontWeight: '800',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                >
                  {f.icon}
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Side: Appointments List */}
        <main>
          <div className="glass-card" style={{ padding: '20px 24px', marginBottom: '20px', borderRadius: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ background: 'var(--gold-primary)', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black' }}>
                <CalendarIcon size={16} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: '900', textTransform: 'capitalize' }}>{formatDateLabel(selectedDate)}</h2>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => {
                const d = new Date(selectedDate);
                if (filterType === 'day') d.setDate(d.getDate() - 1);
                else if (filterType === 'week') d.setDate(d.getDate() - 7);
                else if (filterType === 'fortnight') d.setDate(d.getDate() - 14);
                else if (filterType === 'month') d.setMonth(d.getMonth() - 1);
                setSelectedDate(d);
              }} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', width: '36px', height: '36px', color: 'white', cursor: 'pointer' }}><ChevronLeft size={18} /></button>
              <button onClick={() => {
                const d = new Date(selectedDate);
                if (filterType === 'day') d.setDate(d.getDate() + 1);
                else if (filterType === 'week') d.setDate(d.getDate() + 7);
                else if (filterType === 'fortnight') d.setDate(d.getDate() + 14);
                else if (filterType === 'month') d.setMonth(d.getMonth() + 1);
                setSelectedDate(d);
              }} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', width: '36px', height: '36px', color: 'white', cursor: 'pointer' }}><ChevronRight size={18} /></button>
            </div>
          
          </div>

          <div className="glass-card" style={{ padding: '16px 24px', marginBottom: '20px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <Search size={18} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Buscar por nombre, cédula o teléfono..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                flex: 1, 
                background: 'none', 
                border: 'none', 
                color: 'white', 
                fontSize: '15px', 
                fontWeight: '700',
                outline: 'none'
              }}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <XCircle size={14} />
              </button>
            )}
          </div>

          <div className="glass-card" style={{ padding: '0', overflow: 'hidden', borderRadius: '24px' }}>
            {loading ? (
              <div style={{ padding: '100px', textAlign: 'center' }}>
                <div className="animate-pulse" style={{ color: 'var(--gold-primary)', fontWeight: '800' }}>Cargando agenda...</div>
              </div>
            ) : appointments.filter(app => {
                if (!searchTerm) return true;
                const term = searchTerm.toLowerCase();
                return (
                  (app.clients?.name || '').toLowerCase().includes(term) ||
                  (app.clients?.id_card || '').toLowerCase().includes(term) ||
                  (app.clients?.phone || '').toLowerCase().includes(term)
                );
              }).length === 0 ? (
              <div style={{ padding: '100px', textAlign: 'center' }}>
                <Search size={48} color="rgba(255,255,255,0.05)" style={{ marginBottom: '16px' }} />
                <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No se encontraron citas que coincidan con la búsqueda</div>
              </div>
            ) : (
              <div style={{ maxHeight: '700px', overflowY: 'auto' }}>
                {appointments
                  .filter(app => {
                    if (!searchTerm) return true;
                    const term = searchTerm.toLowerCase();
                    return (
                      (app.clients?.name || '').toLowerCase().includes(term) ||
                      (app.clients?.id_card || '').toLowerCase().includes(term) ||
                      (app.clients?.phone || '').toLowerCase().includes(term)
                    );
                  })
                  .sort((a, b) => new Date(a.scheduled_at || a.created_at) - new Date(b.scheduled_at || b.created_at))
                  .map(app => (
                  isMobile ? (
                    <div key={app.id} style={{ 
                      padding: '10px 8px', 
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      display: 'flex', 
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '4px',
                      opacity: app.status === 'Completado' ? 0.6 : 1,
                      fontSize: '11px',
                      color: '#fff'
                    }}>
                      {/* Column 1: Time (compact) */}
                      <div style={{ flexShrink: 0, width: '48px', fontWeight: '800' }}>
                        <div style={{ fontSize: '11px' }}>
                          {new Date(app.scheduled_at || app.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).replace(' ', '').toLowerCase()}
                        </div>
                        {filterType !== 'day' && (
                          <div style={{ fontSize: '8px', color: 'var(--text-muted)' }}>
                            {new Date(app.scheduled_at || app.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </div>
                        )}
                      </div>

                      {/* Column 2: Client */}
                      <div style={{ flex: 1, minWidth: 0, paddingLeft: '4px' }}>
                        <div style={{ fontWeight: '800', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {app.clients?.name?.split(' ')[0]} {app.clients?.name?.split(' ')[1] ? app.clients?.name?.split(' ')[1]?.charAt(0) + '.' : ''}
                        </div>
                      </div>

                      {/* Column 3: Service (exactly in the middle space) */}
                      <div style={{ flex: 1.2, minWidth: 0, paddingLeft: '4px', color: 'var(--text-secondary)', fontSize: '10px' }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {app.services?.name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin serv.</span>}
                        </div>
                      </div>

                      {/* Column 4: Barber */}
                      <div style={{ flexShrink: 0, width: '45px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingLeft: '2px' }}>
                        {app.staff?.name?.split(' ')[0]}
                      </div>

                      {/* Column 5: Price */}
                      <div style={{ flexShrink: 0, width: '28px', fontWeight: '900', color: 'var(--gold-primary)', textAlign: 'right' }}>
                        ${app.total_price}
                      </div>

                      {/* Column 6: Status Badge */}
                      <div style={{ flexShrink: 0, width: '52px', textAlign: 'center' }}>
                        <span style={{ 
                          fontSize: '8px', fontWeight: '900', padding: '2px 5px', borderRadius: '4px', textTransform: 'uppercase',
                          backgroundColor: app.status === 'Agendado' ? 'rgba(212,175,55,0.1)' : app.status === 'En Silla' ? 'rgba(0,122,255,0.1)' : app.status === 'En Lavado' ? 'rgba(0,191,255,0.1)' : app.status === 'Por Pagar' ? 'rgba(50,215,75,0.1)' : app.status === 'Completado' ? 'rgba(142,142,147,0.1)' : 'rgba(255,69,58,0.1)',
                          color: app.status === 'Agendado' ? 'var(--gold-primary)' : app.status === 'En Silla' ? '#007aff' : app.status === 'En Lavado' ? '#00bfff' : app.status === 'Por Pagar' ? '#32d74b' : app.status === 'Completado' ? '#8e8e93' : '#ff453a'
                        }}>
                          {app.status === 'Agendado' ? 'Agenda' : app.status === 'En Silla' ? 'Silla' : app.status === 'En Lavado' ? 'Lavado' : app.status === 'Por Pagar' ? 'Cobro' : app.status === 'Completado' ? 'Listo' : 'Canc'}
                        </span>
                      </div>

                      {/* Column 7: Actions */}
                      <div style={{ flexShrink: 0, display: 'flex', gap: '1px' }}>
                        <button onClick={() => handleEditAppointment(app)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '3px' }}><Pencil size={11} /></button>
                        <button onClick={() => handleManageAppointment(app.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '3px' }}><Trash2 size={11} /></button>
                      </div>
                    </div>
                  ) : (
                    <div key={app.id} className="hover-item" style={{ 
                      padding: '16px 24px', 
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      display: 'grid', 
                      gridTemplateColumns: '100px 1.5fr 1.5fr 1.5fr 80px 120px 60px', 
                      gap: '15px', 
                      alignItems: 'center',
                      opacity: app.status === 'Completado' ? 0.6 : 1
                    }}>
                      <div>
                        <div style={{ fontWeight: '900', fontSize: '14px' }}>{new Date(app.scheduled_at || app.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                        {filterType !== 'day' && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(app.scheduled_at || app.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</div>}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'black', fontWeight: '900' }}>{app.staff?.name?.charAt(0)}</div>
                        <div style={{ fontWeight: '700', fontSize: '13px' }}>{app.staff?.name}</div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Scissors size={14} color="var(--text-muted)" />
                        <div style={{ fontSize: '13px' }}>{app.services?.name}</div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={14} color="var(--text-muted)" />
                        <div style={{ fontWeight: '700', fontSize: '13px' }}>{app.clients?.name}</div>
                      </div>

                      <div style={{ fontWeight: '900', color: 'var(--gold-primary)' }}>${app.total_price}</div>

                      <div style={{ textAlign: 'center' }}>
                        <span style={{ 
                          fontSize: '9px', fontWeight: '900', padding: '4px 10px', borderRadius: '20px', textTransform: 'uppercase',
                          backgroundColor: app.status === 'Agendado' ? 'rgba(212,175,55,0.1)' : app.status === 'En Silla' ? 'rgba(0,122,255,0.1)' : app.status === 'En Lavado' ? 'rgba(0,191,255,0.1)' : app.status === 'Por Pagar' ? 'rgba(50,215,75,0.1)' : app.status === 'Completado' ? 'rgba(142,142,147,0.1)' : 'rgba(255,69,58,0.1)',
                          color: app.status === 'Agendado' ? 'var(--gold-primary)' : app.status === 'En Silla' ? '#007aff' : app.status === 'En Lavado' ? '#00bfff' : app.status === 'Por Pagar' ? '#32d74b' : app.status === 'Completado' ? '#8e8e93' : '#ff453a'
                        }}>
                          {app.status}
                        </span>
                      </div>

                      <div style={{ textAlign: 'right', display: 'flex', gap: '4px' }}>
                        <button onClick={() => handleEditAppointment(app)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: '8px' }} className="hover-gold"><Pencil size={14} /></button>
                        <button onClick={() => handleManageAppointment(app.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: '8px' }} className="hover-red"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <AstroDialog 
        isOpen={dialog.isOpen} 
        title="Gestionar Cita" 
        message="¿Qué deseas hacer con esta cita?" 
        onCancel={() => setDialog({ isOpen: false, appointmentId: null })}
        customFooter={
          <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '20px' }}>
            <button onClick={() => processAction('cancel')} style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1px solid #ff453a', background: 'rgba(255,69,58,0.1)', color: '#ff453a', fontWeight: '800' }}>MARCAR CANCELADA</button>
            <button onClick={() => processAction('delete')} style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontWeight: '800' }}>BORRAR PERMANENTE</button>
          </div>
        }
      />

      {showScheduleModal && (
        <ScheduleModal 
          isOpen={showScheduleModal} onClose={() => setShowScheduleModal(false)} onSchedule={handleTimeSelected} defaultDate={selectedDate}
          client={clients.find(c => c.id === newApp.clientId)} service={services.find(s => s.id === newApp.serviceId)} staff={staff.find(s => s.id === newApp.staffId)}
        />
      )}

      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className="glass-card animate-scale-in" style={{ maxWidth: '550px', width: '100%', borderRadius: '32px', border: '1.5px solid rgba(212,175,55,0.3)', maxHeight: '90vh', overflowY: 'auto', padding: '32px' }}>
            <h2 style={{ marginBottom: '24px', fontWeight: '900' }}>{editingApp ? 'Editar Cita' : 'Nueva Cita'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Client Search */}
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>CLIENTE</label>
                <div style={{ position: 'relative', display: 'flex', gap: '8px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} size={16} color="var(--text-muted)" />
                    <input
                      type="text"
                      placeholder="Buscar por cédula o nombre..."
                      value={clientSearchTerm}
                      onChange={(e) => handleClientSearch(e.target.value)}
                      style={{
                        width: '100%',
                        paddingLeft: '40px',
                        height: '48px',
                        fontSize: '14px',
                        background: 'rgba(255,255,255,0.05)',
                        border: `1px solid ${newApp.clientId ? 'var(--gold-primary)' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: '14px',
                        color: 'white',
                        outline: 'none',
                        fontWeight: '700',
                        boxSizing: 'border-box'
                      }}
                    />
                    {newApp.clientId && (
                      <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: 'var(--gold-primary)', fontWeight: '900' }}>✓</span>
                    )}
                  </div>
                  {clientSearchTerm && (
                    <button
                      onClick={() => { setClientSearchTerm(''); setClientSearchResults([]); setNewApp(prev => ({ ...prev, clientId: '' })); }}
                      style={{ background: 'rgba(255,69,58,0.1)', color: '#ff453a', border: 'none', borderRadius: '12px', padding: '0 14px', fontSize: '11px', fontWeight: '900', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >LIMPIAR</button>
                  )}
                </div>
                {clientSearchResults.length > 0 && (
                  <div className="animate-scale-in" style={{
                    position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                    background: 'rgba(18,18,22,0.98)',
                    border: '1px solid rgba(212,175,55,0.2)', borderRadius: '14px',
                    overflow: 'hidden', zIndex: 200, backdropFilter: 'blur(20px)',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.6)'
                  }}>
                    {clientSearchResults.map(c => (
                      <div
                        key={c.id}
                        onClick={() => handleSelectClient(c)}
                        style={{ padding: '12px 18px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(212,175,55,0.08)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <span style={{ fontWeight: '700', fontSize: '14px', color: 'white' }}>{c.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>V-{c.id_card}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <AstroSelect label="SERVICIO" placeholder="Selecciona servicio" value={newApp.serviceId} onChange={(val) => setNewApp({...newApp, serviceId: val})} options={services.map(s => ({ label: `${s.name} ($${s.price})`, value: s.id }))} />
              <AstroSelect 
                label="BARBERO" 
                placeholder="Selecciona barbero" 
                value={newApp.staffId} 
                onChange={(val) => setNewApp({...newApp, staffId: val})} 
                options={staff
                  .filter(s => s.role?.toLowerCase().includes('barbero'))
                  .map(s => ({ label: s.name, value: s.id }))
                } 
                disabled={user?.role === 'Barbero' || user?.role?.startsWith('Barbero|')}
              />

              {/* Extras Selection */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>EXTRAS</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {allExtras.map(ex => (
                    <button 
                      key={ex.id}
                      onClick={() => {
                        const exists = newApp.extras.includes(ex.id);
                        setNewApp({
                          ...newApp,
                          extras: exists ? newApp.extras.filter(id => id !== ex.id) : [...newApp.extras, ex.id]
                        });
                      }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '12px',
                        border: '1px solid',
                        borderColor: newApp.extras.includes(ex.id) ? 'var(--gold-primary)' : 'rgba(255,255,255,0.1)',
                        background: newApp.extras.includes(ex.id) ? 'rgba(212,175,55,0.1)' : 'transparent',
                        color: newApp.extras.includes(ex.id) ? 'var(--gold-primary)' : 'white',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: '0.2s'
                      }}
                    >
                      {ex.name} (+${ex.price})
                    </button>
                  ))}
                </div>
              </div>

              {/* Products Selection */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>PRODUCTOS ADICIONALES</label>
                <AstroSelect 
                  placeholder="Añadir producto..." 
                  onChange={(val) => {
                    const prod = allProducts.find(p => p.id === val);
                    const exists = newApp.products.find(p => p.id === val);
                    if (exists) return;
                    setNewApp({
                      ...newApp,
                      products: [...newApp.products, { id: val, quantity: 1 }]
                    });
                  }} 
                  options={allProducts.map(p => ({ label: `${p.name} ($${p.price})`, value: p.id }))} 
                />
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  {newApp.products.map(p => {
                    const product = allProducts.find(pr => pr.id === p.id);
                    if (!product) return null;
                    return (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '10px 16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontWeight: '700', color: 'var(--gold-primary)' }}>{p.quantity}x</span>
                          <span style={{ fontSize: '13px', fontWeight: '500' }}>{product.name}</span>
                        </div>
                        <button 
                          onClick={() => setNewApp({ ...newApp, products: newApp.products.filter(item => item.id !== p.id) })} 
                          style={{ color: '#ff453a', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button onClick={() => { if (!newApp.clientId || !newApp.serviceId || !newApp.staffId) { showToast("Selecciona cliente, servicio y barbero", "error"); return; } setShowScheduleModal(true); }} className="btn-gold" style={{ width: '100%', height: '56px', borderRadius: '16px', marginTop: '10px' }}><Clock size={18} style={{ marginRight: '8px' }} /> {editingApp ? 'CONFIRMAR CAMBIOS' : 'SELECCIONAR HORARIO'}</button>
              <button onClick={() => setShowAddModal(false)} style={{ width: '100%', background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '14px', padding: '14px', fontWeight: '700' }}>CANCELAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MiniCalendar = ({ selectedDate, onDateSelect, allAppointments }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();
  
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const days = [];
  const totalDays = daysInMonth(currentMonth.getMonth(), currentMonth.getFullYear());
  const startDay = firstDayOfMonth(currentMonth.getMonth(), currentMonth.getFullYear());
  
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let i = 1; i <= totalDays; i++) days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
  
  return (
    <div className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><ChevronLeft size={16} /></button>
        <span style={{ fontSize: '14px', fontWeight: '900', textTransform: 'uppercase' }}>{monthNames[currentMonth.getMonth()]}</span>
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><ChevronRight size={16} /></button>
      </header>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
        {["D", "L", "M", "M", "J", "V", "S"].map(d => <div key={d} style={{ fontSize: '9px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '8px' }}>{d}</div>)}
        {days.map((date, idx) => {
          if (!date) return <div key={`empty-${idx}`} />;
          const isSelected = selectedDate.toDateString() === date.toDateString();
          const dateStr = date.toISOString().split('T')[0];
          const hasApps = allAppointments.some(a => (a.scheduled_at || a.created_at).startsWith(dateStr));

          return (
            <button 
              key={date.toISOString()} onClick={() => onDateSelect(date)}
              style={{
                aspectRatio: '1/1', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: isSelected ? '900' : '500',
                background: isSelected ? 'var(--gold-primary)' : 'none', color: isSelected ? 'black' : 'white', transition: 'all 0.2s', position: 'relative'
              }}
            >
              {date.getDate()}
              {hasApps && (
                <div style={{ 
                  width: '5px', 
                  height: '5px', 
                  borderRadius: '50%', 
                  backgroundColor: isSelected ? 'black' : 'var(--gold-primary)',
                  position: 'absolute',
                  bottom: '6px',
                  left: '50%',
                  transform: 'translateX(-50%)'
                }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SchedulingModule;
