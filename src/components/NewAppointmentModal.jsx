import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Calendar as CalendarIcon, 
  Search, 
  Check, 
  Clock, 
  User, 
  Scissors, 
  Package, 
  Plus, 
  Minus, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import { ModalShield } from '../context/ModalContext';
import AnimatedModal from './AnimatedModal';
import PandaSelect from './PandaSelect';
import { useScrollLock } from '../hooks/useScrollLock';

const NewAppointmentModal = ({ isOpen, onClose, onSuccess, rates }) => {
  const { showToast } = useNotifs();
  const activeRate = rates?.usd || rates?.euro || 841.84;

  const [step, setStep] = useState(1); // 1: Form details, 2: Select Date & Time Slot
  const [submitting, setSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [allExtras, setAllExtras] = useState([]);
  const [allProducts, setAllProducts] = useState([]);

  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [clientSearchResults, setClientSearchResults] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);

  const [newApp, setNewApp] = useState({
    clientId: '',
    serviceId: '',
    staffId: '',
    extras: [],
    products: []
  });

  // Time slot scheduling state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedSlot(null);
      setSelectedDate(new Date());
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (step === 2 && newApp.staffId) {
      loadAvailability();
    }
  }, [step, selectedDate, newApp.staffId]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const [cl, sv, st, ex, pr] = await Promise.all([
        dataService.getClients(),
        dataService.getServices(),
        dataService.getStaff(),
        dataService.getExtras(),
        dataService.getInventory()
      ]);
      setClients(cl || []);
      setServices(sv || []);
      setStaff(st || []);

      // Filter out invalid/roulette extras
      const validExtras = (ex || []).filter(e => {
        if (!e.name) return false;
        const nameUpper = e.name.toUpperCase();
        return !nameUpper.includes('ROULETTE_PRIZE') && !nameUpper.includes('CORTE GRATIS');
      });
      setAllExtras(validExtras);
      setAllProducts(pr || []);
    } catch (err) {
      console.error('Error loading data for new appointment:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const loadAvailability = async () => {
    try {
      setLoadingSlots(true);
      const dateStr = selectedDate.toISOString().split('T')[0];
      const allApps = await dataService.getAppointmentsByState(['Agendado', 'En Silla', 'Por Pagar']);
      const dailyApps = (allApps || []).filter(a => 
        a.staff_id === newApp.staffId && 
        (a.scheduled_at?.startsWith(dateStr) || (!a.scheduled_at && a.created_at?.startsWith(dateStr)))
      );

      const slots = [];
      const startHour = 8;
      const endHour = 20;
      const now = new Date();
      const isToday = selectedDate.toDateString() === now.toDateString();
      const currentHour = now.getHours();
      const currentMinutes = now.getMinutes();

      for (let hour = startHour; hour < endHour; hour++) {
        for (let min of [0, 30]) {
          if (isToday && (hour < currentHour || (hour === currentHour && min <= currentMinutes))) {
            continue;
          }

          const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
          const isOccupied = dailyApps.some(a => {
            const appDate = new Date(a.scheduled_at || a.created_at);
            return appDate.getHours() === hour && appDate.getMinutes() === min;
          });

          slots.push({
            time: timeStr,
            isAvailable: !isOccupied
          });
        }
      }
      setAvailableSlots(slots);
    } catch (err) {
      console.error('Error loading slots:', err);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleClientSearch = (term) => {
    setClientSearchTerm(term);
    if (!term || term.trim().length === 0) {
      setClientSearchResults([]);
      return;
    }
    const cleanTerm = term.toLowerCase().trim();
    const matches = clients.filter(c => 
      (c.name && c.name.toLowerCase().includes(cleanTerm)) ||
      (c.id_card && c.id_card.toString().includes(cleanTerm)) ||
      (c.phone && c.phone.includes(cleanTerm))
    );
    setClientSearchResults(matches.slice(0, 5));
  };

  const handleSelectClient = (c) => {
    setSelectedClient(c);
    setNewApp(prev => ({ ...prev, clientId: c.id }));
    setClientSearchTerm(c.name);
    setClientSearchResults([]);
  };

  const handleClearClient = () => {
    setSelectedClient(null);
    setNewApp(prev => ({ ...prev, clientId: '' }));
    setClientSearchTerm('');
    setClientSearchResults([]);
  };

  const serviceVal = services.find(s => s.id === newApp.serviceId);
  const selectedStaff = staff.find(s => s.id === newApp.staffId);
  const servicePrice = serviceVal ? parseFloat(serviceVal.price || 0) : 0;
  const extrasPrice = newApp.extras.reduce((acc, exId) => {
    const ex = allExtras.find(e => e.id === exId);
    return acc + (ex ? parseFloat(ex.price || 0) : 0);
  }, 0);
  const productsPrice = newApp.products.reduce((acc, p) => {
    const pr = allProducts.find(prod => prod.id === p.id);
    return acc + (pr ? parseFloat(pr.price || 0) * p.quantity : 0);
  }, 0);
  const totalEstimated = servicePrice + extrasPrice + productsPrice;

  const handleGoToStep2 = () => {
    if (!newApp.clientId || !newApp.serviceId || !newApp.staffId) {
      showToast("Selecciona cliente, servicio y barbero", "error");
      return;
    }
    setStep(2);
  };

  const handleConfirmAppointment = async () => {
    if (!selectedSlot) {
      showToast("Selecciona un horario disponible", "error");
      return;
    }

    try {
      setSubmitting(true);
      const [hours, minutes] = selectedSlot.split(':');
      const scheduledAt = new Date(selectedDate);
      scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      const isoTime = scheduledAt.toISOString();

      const created = await dataService.createAppointment({
        client_id: newApp.clientId,
        service_id: newApp.serviceId,
        staff_id: newApp.staffId,
        status: 'Agendado',
        total_price: serviceVal ? serviceVal.price : 0,
        scheduled_at: isoTime
      });

      const appointmentId = created.id;

      const extrasPromises = newApp.extras.map(exId => {
        const ex = allExtras.find(e => e.id === exId);
        return dataService.addExtraToAppointment(appointmentId, exId, ex ? ex.price : 0);
      });

      const productsPromises = newApp.products.map(p => {
        const pr = allProducts.find(prod => prod.id === p.id);
        return dataService.addProductToAppointment(appointmentId, p.id, p.quantity, pr ? pr.price : 0);
      });

      await Promise.all([...extrasPromises, ...productsPromises]);

      showToast("Cita agendada correctamente", "success");
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating appointment:', err);
      showToast("Error al agendar la cita", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatedModal isOpen={isOpen}>
      {(overlayClass, cardClass) => (
        <ModalShield active={true}>
          <div 
            className={overlayClass.replace('global-modal-overlay', '')} 
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              backgroundColor: 'rgba(0,0,0,0.85)', 
              backdropFilter: 'blur(10px)', 
              zIndex: 10000, 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              padding: '20px' 
            }}
          >
            <div 
              className={`glass-card ${cardClass.replace('global-modal-card', '')}`} 
              style={{ 
                maxWidth: '480px', 
                width: '100%', 
                borderRadius: '32px', 
                border: '1.5px solid rgba(255, 255, 255, 0.3)',
                padding: '32px',
                position: 'relative',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
            >
              <button 
                onClick={onClose} 
                style={{ 
                  position: 'absolute', 
                  top: '24px', 
                  right: '24px', 
                  background: 'rgba(255,255,255,0.05)', 
                  border: 'none', 
                  color: 'white', 
                  width: '36px', 
                  height: '36px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer' 
                }}
              >
                <X size={18} />
              </button>

              {/* STEP 1: FORM DETAILS */}
              {step === 1 && (
                <div>
                  <header style={{ marginBottom: '28px' }}>
                    <h2 style={{ 
                      fontSize: '24px', 
                      fontWeight: '900', 
                      color: 'white', 
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <CalendarIcon size={24} color="var(--gold-primary)" />
                      <span>Nueva <span className="text-gold">Cita</span></span>
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Completa los detalles del servicio a agendar.
                    </p>
                  </header>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* CLIENT SELECTOR */}
                    <div style={{ position: 'relative' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                        CLIENTE
                      </label>
                      {selectedClient ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255,0.06)', border: '1px solid rgba(255, 255, 255,0.15)', padding: '12px 16px', borderRadius: '14px' }}>
                          <div>
                            <div style={{ fontWeight: '800', color: 'white', fontSize: '15px' }}>{selectedClient.name}</div>
                            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span><strong style={{ color: 'var(--gold-primary)', fontWeight: '800' }}>Cédula:</strong> V-{selectedClient.id_card}</span>
                            </div>
                          </div>
                          <button 
                            onClick={handleClearClient}
                            style={{ background: 'rgba(255,69,58,0.1)', color: '#ff453a', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ position: 'relative' }}>
                          <Search style={{ position: 'absolute', left: '16px', top: '14px', pointerEvents: 'none' }} size={18} color="var(--gold-primary)" />
                          <input
                            type="text"
                            placeholder="Buscar por cédula o nombre..."
                            value={clientSearchTerm}
                            onChange={(e) => handleClientSearch(e.target.value)}
                            style={{
                              width: '100%',
                              paddingLeft: '48px',
                              height: '48px',
                              fontSize: '14px',
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: '14px',
                              color: 'white',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      )}

                      {/* Client search dropdown */}
                      {!selectedClient && clientSearchResults.length > 0 && (
                        <div style={{
                          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                          background: 'rgba(22,22,23,0.98)',
                          border: '1.5px solid rgba(255, 255, 255, 0.25)',
                          borderRadius: '16px', zIndex: 99, padding: '6px',
                          boxShadow: '0 20px 40px rgba(0,0,0,0.8)'
                        }}>
                          {clientSearchResults.map(c => (
                            <div 
                              key={c.id} 
                              onClick={() => handleSelectClient(c)}
                              style={{ padding: '10px 14px', borderRadius: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: '0.2s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <span style={{ fontWeight: '800', color: 'white', fontSize: '13px' }}>{c.name}</span>
                              <span style={{ fontSize: '11px', color: 'var(--gold-primary)' }}>V-{c.id_card}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* SERVICE SELECTOR */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                        SERVICIO
                      </label>
                      <PandaSelect 
                        placeholder="Selecciona servicio" 
                        value={newApp.serviceId} 
                        onChange={(val) => setNewApp({ ...newApp, serviceId: val })} 
                        options={services.map(s => ({ label: `${s.name} (€${s.price})`, value: s.id }))} 
                      />
                    </div>

                    {/* BARBER SELECTOR */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                        BARBERO
                      </label>
                      <PandaSelect 
                        placeholder="Selecciona barbero" 
                        value={newApp.staffId} 
                        onChange={(val) => setNewApp({ ...newApp, staffId: val })} 
                        options={staff
                          .filter(s => {
                            const roleName = (s.role?.split('|')[0] || '').toLowerCase();
                            return roleName.includes('barber') && !roleName.includes('admin');
                          })
                          .map(s => ({ label: s.name, value: s.id }))
                        } 
                      />
                    </div>

                    {/* EXTRAS SELECTOR */}
                    {allExtras.length > 0 && (
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                          EXTRAS
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {allExtras.map(ex => {
                            const isSelected = newApp.extras.includes(ex.id);
                            return (
                              <button 
                                key={ex.id}
                                onClick={() => {
                                  setNewApp({
                                    ...newApp,
                                    extras: isSelected ? newApp.extras.filter(id => id !== ex.id) : [...newApp.extras, ex.id]
                                  });
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '8px 14px',
                                  borderRadius: '12px',
                                  border: '1px solid',
                                  borderColor: isSelected ? 'var(--gold-primary)' : 'rgba(255,255,255,0.08)',
                                  background: isSelected ? 'rgba(255, 255, 255,0.08)' : 'rgba(255,255,255,0.02)',
                                  color: isSelected ? 'var(--gold-primary)' : 'rgba(255,255,255,0.8)',
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                              >
                                {isSelected && <Check size={12} strokeWidth={3} />}
                                <span>{ex.name} (+€{ex.price})</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* TOTAL ESTIMATED */}
                    <div style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255,0.06) 0%, rgba(255, 255, 255,0.02) 100%)', border: '1px solid rgba(255, 255, 255,0.15)', borderRadius: '16px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '0.5px' }}>TOTAL ESTIMADO</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
                          <span style={{ fontSize: '22px', fontWeight: '950', color: 'var(--gold-primary)' }}>€{totalEstimated.toFixed(2)}</span>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>
                            (Ref: {(totalEstimated * activeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                      <button 
                        type="button"
                        onClick={onClose} 
                        style={{ 
                          flex: 1, 
                          background: 'none', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          color: 'white', 
                          height: '52px',
                          borderRadius: '16px', 
                          fontWeight: '700', 
                          cursor: 'pointer' 
                        }}
                      >
                        CANCELAR
                      </button>
                      <button 
                        type="button"
                        onClick={handleGoToStep2}
                        className="btn-gold" 
                        style={{ flex: 1.5, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '800' }}
                      >
                        <Clock size={16} /> SELECCIONAR HORARIO
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: SELECT DATE & TIME SLOT */}
              {step === 2 && (
                <div>
                  <header style={{ marginBottom: '24px' }}>
                    <button 
                      onClick={() => setStep(1)}
                      style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--gold-primary)', padding: '6px 12px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', marginBottom: '12px' }}
                    >
                      <ArrowLeft size={14} /> VOLVER AL FORMULARIO
                    </button>
                    <h2 style={{ fontSize: '22px', fontWeight: '900', color: 'white', marginBottom: '4px' }}>
                      Agendar <span className="text-gold">Turno</span>
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                      {serviceVal?.name} con <strong>{selectedStaff?.name}</strong>
                    </p>
                  </header>

                  {/* DATE NAVIGATOR */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: 'rgba(0,0,0,0.3)', padding: '10px 16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <button 
                      onClick={() => {
                        const prev = new Date(selectedDate);
                        prev.setDate(selectedDate.getDate() - 1);
                        setSelectedDate(prev);
                        setSelectedSlot(null);
                      }} 
                      style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: '800', fontSize: '14px', color: 'white' }}>
                        {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        const next = new Date(selectedDate);
                        next.setDate(selectedDate.getDate() + 1);
                        setSelectedDate(next);
                        setSelectedSlot(null);
                      }} 
                      style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>

                  {/* SLOTS GRID */}
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '12px', letterSpacing: '1px' }}>
                      HORARIOS DISPONIBLES
                    </label>
                    {loadingSlots ? (
                      <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        <Loader2 className="animate-spin" size={24} style={{ marginBottom: '8px' }} />
                        <div>Cargando disponibilidad...</div>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat( auto-fill, minmax(80px, 1fr) )', gap: '8px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }} className="panda-scrollbar">
                        {availableSlots.map(slot => {
                          const [h, m] = slot.time.split(':');
                          const hour = parseInt(h);
                          const ampm = hour >= 12 ? 'PM' : 'AM';
                          const h12 = hour % 12 || 12;
                          const time12 = `${h12}:${m} ${ampm}`;
                          const isSelected = selectedSlot === slot.time;

                          return (
                            <button
                              key={slot.time}
                              disabled={!slot.isAvailable}
                              onClick={() => setSelectedSlot(slot.time)}
                              style={{
                                padding: '10px 0',
                                borderRadius: '10px',
                                fontSize: '11px',
                                fontWeight: '800',
                                cursor: slot.isAvailable ? 'pointer' : 'not-allowed',
                                backgroundColor: isSelected ? 'var(--gold-primary)' : slot.isAvailable ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)',
                                border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.06)',
                                color: isSelected ? 'black' : slot.isAvailable ? 'white' : 'rgba(255,255,255,0.2)',
                                transition: 'all 0.2s',
                                textDecoration: !slot.isAvailable ? 'line-through' : 'none'
                              }}
                            >
                              {time12}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* ACTION BUTTONS STEP 2 */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      type="button"
                      onClick={() => setStep(1)} 
                      style={{ 
                        flex: 1, 
                        background: 'none', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        color: 'white', 
                        height: '52px',
                        borderRadius: '16px', 
                        fontWeight: '700', 
                        cursor: 'pointer' 
                      }}
                    >
                      VOLVER
                    </button>
                    <button 
                      type="button"
                      disabled={!selectedSlot || submitting}
                      onClick={handleConfirmAppointment}
                      className="btn-gold" 
                      style={{ flex: 1.5, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '800', opacity: selectedSlot ? 1 : 0.5 }}
                    >
                      {submitting ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <>
                          <Check size={18} />
                          {selectedSlot ? `CONFIRMAR (${(() => {
                            const [h, m] = selectedSlot.split(':');
                            const hour = parseInt(h);
                            const ampm = hour >= 12 ? 'PM' : 'AM';
                            const h12 = hour % 12 || 12;
                            return `${h12}:${m} ${ampm}`;
                          })()})` : 'SELECCIONA HORA'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ModalShield>
      )}
    </AnimatedModal>,
    document.body
  );
};

export default NewAppointmentModal;
