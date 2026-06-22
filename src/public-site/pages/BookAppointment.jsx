import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, ChevronLeft, ChevronRight, Check, MessageCircle } from 'lucide-react';
import { publicService } from '../services/publicService';

// Generate time slots from 9 AM to 10 PM (22:00) in 30-min intervals
function generateTimeSlots() {
  const slots = [];
  for (let hour = 9; hour <= 22; hour++) {
    for (let min = 0; min < 60; min += 30) {
      if (hour === 22 && min > 0) break; // Stop at 22:00
      slots.push(`${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
    }
  }
  return slots;
}

// Convert "09:00" to "9:00 AM", "14:30" to "2:30 PM" etc
function formatTime12(time24) {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

// Check if a time slot is in the past (for today)
function isTimePast(time24) {
  const now = new Date();
  const [h, m] = time24.split(':').map(Number);
  return h < now.getHours() || (h === now.getHours() && m <= now.getMinutes());
}

export default function BookAppointment() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [occupiedSlots, setOccupiedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedBeverage, setSelectedBeverage] = useState('');
  const [tattooDescription, setTattooDescription] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('584129206984');

  const allTimeSlots = useMemo(() => generateTimeSlots(), []);

  const isTattooService = useMemo(() => {
    return (selectedService?.category || '').toLowerCase().includes('tatuaj');
  }, [selectedService]);

  const displayStaff = useMemo(() => {
    if (isTattooService) {
      return allStaff.filter(s => s.role?.includes('Tatuador'));
    }
    return barbers;
  }, [isTattooService, allStaff, barbers]);

  useEffect(() => {
    const client = localStorage.getItem('panda_public_client');
    if (!client) {
      navigate('/login');
      return;
    }

    const loadData = async () => {
      try {
        const [servicesData, staffData, waNumber] = await Promise.all([
          publicService.getServices(),
          publicService.getStaff(),
          publicService.getWhatsAppNumber()
        ]);
        setServices(servicesData);
        setAllStaff(staffData);
        setBarbers(staffData.filter(s => s.role?.includes('Barbero')));
        setWhatsappNumber(waNumber);
      } catch (e) {
        console.error('Error loading data:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [navigate]);

  // Fetch occupied slots when barber and date are selected
  useEffect(() => {
    if (!selectedBarber || !selectedDate) {
      setOccupiedSlots([]);
      return;
    }

    const fetchOccupied = async () => {
      setLoadingSlots(true);
      try {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const occupied = await publicService.getOccupiedSlots(selectedBarber.id, dateStr);
        setOccupiedSlots(occupied);
      } catch (e) {
        console.error('Error fetching occupied slots:', e);
        setOccupiedSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchOccupied();
  }, [selectedBarber, selectedDate]);

  // Filter visible time slots
  const visibleSlots = useMemo(() => {
    const isToday = selectedDate?.toDateString() === new Date().toDateString();
    return allTimeSlots.map(time => ({
      time,
      label: formatTime12(time),
      isPast: isToday && isTimePast(time),
      isOccupied: occupiedSlots.includes(time),
    }));
  }, [allTimeSlots, selectedDate, occupiedSlots]);

  // Reset selected time when date/barber changes
  useEffect(() => {
    setSelectedTime(null);
  }, [selectedDate, selectedBarber]);

  // Reset selected barber when tattoo status changes
  useEffect(() => {
    setSelectedBarber(null);
  }, [isTattooService]);

  const steps = useMemo(() => {
    const base = [
      { num: 1, label: 'Servicio' },
      { num: 2, label: isTattooService ? 'Tatuador' : 'Barbero' },
    ];
    if (isTattooService) {
      base.push({ num: 3, label: 'Referencia' });
      base.push({ num: 4, label: 'Fecha' });
      base.push({ num: 5, label: 'Hora' });
      base.push({ num: 6, label: 'Confirmar' });
    } else {
      base.push({ num: 3, label: 'Fecha' });
      base.push({ num: 4, label: 'Hora' });
      base.push({ num: 5, label: 'Bebida' });
      base.push({ num: 6, label: 'Confirmar' });
    }
    return base;
  }, [isTattooService]);

  const totalSteps = steps.length;

  const canNext = () => {
    const currentLabel = steps.find(s => s.num === step)?.label;
    if (currentLabel === 'Servicio') return !!selectedService;
    if (currentLabel === 'Barbero' || currentLabel === 'Tatuador') return !!selectedBarber;
    if (currentLabel === 'Referencia') return tattooDescription.trim().length > 0;
    if (currentLabel === 'Fecha') return !!selectedDate;
    if (currentLabel === 'Hora') return !!selectedTime;
    if (currentLabel === 'Bebida') return !!selectedBeverage;
    return false;
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const clientData = JSON.parse(localStorage.getItem('panda_public_client') || 'null');
      if (!clientData) {
        alert('Debes iniciar sesión para agendar una cita');
        return;
      }

      if (isTattooService) {
        const dateStr = selectedDate?.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = formatTime12(selectedTime);

        let message = `Hola, quiero cotizar un tatuaje en Panda Barber Studio\n\n`;
        message += `*Cliente:* ${clientData.name || clientData.full_name || ''}\n`;
        message += `*Servicio:* ${selectedService?.name}\n`;
        message += `*Tatuador:* ${selectedBarber?.name}\n`;
        message += `*Fecha:* ${dateStr}\n`;
        message += `*Hora:* ${timeStr}\n`;
        message += `\n*Descripcion del tatuaje:*\n${tattooDescription}\n`;
        message += `\nAdjunto fotos de referencia.`;

        const encodedMsg = encodeURIComponent(message);
        const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '');
        let waUrl = `https://wa.me/${cleanNumber}?text=${encodedMsg}`;

        window.open(waUrl, '_blank');
        setSuccess(true);
        return;
      }

      const scheduledAt = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':');
      scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      await publicService.createAppointment({
        client_id: clientData.id,
        service_id: selectedService.id,
        staff_id: selectedBarber.id,
        scheduled_at: scheduledAt.toISOString(),
        beverage_selection: selectedBeverage
      });
      setSuccess(true);
    } catch (e) {
      console.error('Error creating appointment:', e);
      alert('Error al agendar la cita. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)' }}>Cargando...</div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px 32px', maxWidth: 400 }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(34, 197, 94, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <Check size={40} style={{ color: '#22c55e' }} />
          </div>
          <h2 style={{ fontWeight: 800, fontSize: 24, marginBottom: 8 }}>{isTattooService ? '¡Solicitud Enviada!' : '¡Cita Agendada!'}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            {isTattooService ? 'Tu solicitud de tatuaje ha sido enviada por WhatsApp. Te contactaremos pronto con la cotización.' : 'Tu cita ha sido registrada. Recibirás una confirmación pronto.'}
          </p>
          <a href="/" className="btn-gold" style={{ padding: '12px 32px', borderRadius: 'var(--radius-pill)', textDecoration: 'none' }}>
            Volver al Inicio
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '60px 16px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 className="section-title">
            Agendar <span className="text-gold">Cita</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Reserva en solo 5 pasos</p>
        </div>

        {/* Progress Steps */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32, padding: '0 16px' }}>
          {steps.map((s) => (
            <div key={s.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 14,
                background: step >= s.num ? 'var(--gold-gradient)' : 'var(--bg-tertiary)',
                color: step >= s.num ? '#000' : 'var(--text-muted)',
                border: `1px solid ${step >= s.num ? 'transparent' : 'var(--border-color)'}`,
              }}>
                {step > s.num ? <Check size={14} /> : s.num}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: step >= s.num ? 'var(--champagne)' : 'var(--text-muted)' }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="glass-card" style={{ padding: '24px', minHeight: 280 }}>
          {(() => {
            const currentLabel = steps.find(s => s.num === step)?.label;
            return (
            <>
          {/* Step: Services */}
          {currentLabel === 'Servicio' && (
            <div>
              <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>Selecciona un servicio</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => setSelectedService(service)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${selectedService?.id === service.id ? 'var(--champagne)' : 'var(--border-color)'}`,
                      background: selectedService?.id === service.id ? 'rgba(203, 183, 154, 0.08)' : 'rgba(7, 7, 10, 0.5)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{service.name}</div>
                        {service.duration && <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{service.duration} min</div>}
                      </div>
                      <span className="text-gold" style={{ fontSize: 18, fontWeight: 900 }}>
                        {service.price === 0 || service.name.toLowerCase().includes('cotizar') ? 'A Cotizar' : `$${service.price}`}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Barber / Tatuador */}
          {(currentLabel === 'Barbero' || currentLabel === 'Tatuador') && (
            <div>
              <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>Elige tu {isTattooService ? 'tatuador' : 'barbero'}</h2>
              {displayStaff.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                  {isTattooService ? 'No hay tatuadores disponibles actualmente.' : 'No hay barberos disponibles actualmente.'}
                </div>
              ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {displayStaff.map((barber) => (
                  <button
                    key={barber.id}
                    onClick={() => setSelectedBarber(barber)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${selectedBarber?.id === barber.id ? 'var(--champagne)' : 'var(--border-color)'}`,
                      background: selectedBarber?.id === barber.id ? 'rgba(203, 183, 154, 0.08)' : 'rgba(7, 7, 10, 0.5)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: 'var(--gold-gradient)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        overflow: 'hidden',
                      }}>
                        {barber.image_url ? (
                          <img src={barber.image_url} alt={barber.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <User size={20} color="#000" />
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{barber.name}</div>
                        <div style={{ color: 'var(--champagne)', fontSize: 13, marginTop: 2 }}>{barber.role}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              )}
            </div>
          )}

          {/* Step: Tattoo Reference */}
          {currentLabel === 'Referencia' && (
            <div>
              <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Cuéntanos tu idea</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
                Describe el tatuaje que deseas y adjunta fotos de referencia para que tu tatuador pueda cotizarlo con precisión.
              </p>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--gold-primary)', marginBottom: 8, letterSpacing: '0.5px' }}>DESCRIPCIÓN DEL TATUAJE *</label>
                <textarea
                  className="form-input"
                  rows={4}
                  placeholder="Ej: Quiero un león realista en el brazo derecho, de tamaño mediano, con detalle en la melena..."
                  value={tattooDescription}
                  onChange={(e) => setTattooDescription(e.target.value)}
                  style={{ width: '100%', resize: 'vertical', fontSize: 14, lineHeight: 1.5 }}
                />
              </div>

              <div style={{ marginBottom: 20, padding: '14px 16px', borderRadius: 12, background: 'rgba(212, 175, 55, 0.06)', border: '1px solid rgba(212, 175, 55, 0.15)' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                  📸 <strong style={{ color: 'var(--gold-primary)' }}>Fotos de referencia:</strong> Al dirigirte a WhatsApp podrás adjuntar directamente las imágenes de las inspiración de tu tatuaje.
                </p>
              </div>
            </div>
          )}

          {/* Step: Date */}
          {currentLabel === 'Fecha' && (
            <div>
              <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>Selecciona fecha</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                {Array.from({ length: 14 }, (_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() + i);
                  const isSelected = selectedDate?.toDateString() === date.toDateString();
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(date)}
                      style={{
                        padding: '10px 4px',
                        borderRadius: 'var(--radius-sm)',
                        textAlign: 'center',
                        border: 'none',
                        cursor: 'pointer',
                        background: isSelected ? 'var(--gold-gradient)' : 'var(--bg-tertiary)',
                        color: isSelected ? '#000' : 'var(--text-primary)',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ fontSize: 10, color: isSelected ? 'rgba(0,0,0,0.5)' : 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {date.toLocaleDateString('es', { weekday: 'short' })}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>{date.getDate()}</div>
                      <div style={{ fontSize: 10, color: isSelected ? 'rgba(0,0,0,0.5)' : 'var(--text-muted)' }}>
                        {date.toLocaleDateString('es', { month: 'short' })}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step: Time */}
          {currentLabel === 'Hora' && (
            <div>
              <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Hora disponible</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
                {loadingSlots ? 'Cargando disponibilidad...' : `${occupiedSlots.length} horario(s) ocupado(s)`}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {visibleSlots.map(({ time, label, isPast, isOccupied }) => {
                  const isSelected = selectedTime === time;
                  const isDisabled = isPast || isOccupied;

                  let bg = 'var(--bg-tertiary)';
                  let color = 'var(--text-primary)';
                  let borderColor = 'transparent';

                  if (isOccupied) {
                    bg = 'rgba(239, 68, 68, 0.15)';
                    color = '#ef4444';
                    borderColor = 'rgba(239, 68, 68, 0.3)';
                  } else if (isPast) {
                    bg = 'rgba(255, 255, 255, 0.03)';
                    color = 'var(--text-muted)';
                  } else if (isSelected) {
                    bg = 'var(--gold-gradient)';
                    color = '#000';
                  }

                  return (
                    <button
                      key={time}
                      onClick={() => !isDisabled && setSelectedTime(time)}
                      disabled={isDisabled}
                      style={{
                        padding: '14px 8px',
                        borderRadius: 'var(--radius-sm)',
                        textAlign: 'center',
                        border: `1px solid ${borderColor}`,
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        background: bg,
                        color: color,
                        transition: 'all 0.2s',
                        opacity: isPast && !isOccupied ? 0.4 : 1,
                      }}
                    >
                      <Clock size={14} style={{ margin: '0 auto 4px', display: 'block' }} />
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{label}</span>
                      {isOccupied && (
                        <span style={{ display: 'block', fontSize: 10, marginTop: 2, fontWeight: 600 }}>Ocupado</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step: Beverage */}
          {currentLabel === 'Bebida' && (
            <div>
              <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>Selecciona tu bebida de cortesía</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
                Elige una bebida obligatoria de cortesía que te entregaremos al llegar para tu protocolo de bienvenida.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {[
                  { id: 'Cerveza', label: 'Cerveza Fría', desc: 'Polar Light / Pilsen' },
                  { id: 'Refresco', label: 'Refresco', desc: 'Coca-Cola / Pepsi / 7Up' },
                  { id: 'Agua', label: 'Agua Mineral', desc: 'Con o sin gas' },
                  { id: 'Café', label: 'Café Expreso', desc: 'Caliente o frío' }
                ].map((bev) => {
                  const isSelected = selectedBeverage === bev.id;
                  return (
                    <button
                      key={bev.id}
                      onClick={() => setSelectedBeverage(bev.id)}
                      style={{
                        padding: '20px 16px',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'center',
                        cursor: 'pointer',
                        border: `1px solid ${isSelected ? 'var(--champagne)' : 'var(--border-color)'}`,
                        background: isSelected ? 'rgba(203, 183, 154, 0.08)' : 'rgba(7, 7, 10, 0.5)',
                        color: 'var(--text-primary)',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4, color: isSelected ? 'var(--gold-primary)' : 'white' }}>{bev.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{bev.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step: Confirm */}
          {currentLabel === 'Confirmar' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <Check size={32} style={{ color: '#22c55e' }} />
              </div>
              <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 20 }}>
                {isTattooService ? 'Confirma tu solicitud de tatuaje' : 'Confirma tu cita'}
              </h2>

              <div style={{ background: 'rgba(7, 7, 10, 0.6)', borderRadius: 'var(--radius-md)', padding: 16, textAlign: 'left' }}>
                {[
                  { label: 'Servicio', value: selectedService?.name },
                  { label: isTattooService ? 'Tatuador' : 'Barbero', value: selectedBarber?.name },
                  ...(isTattooService ? [{ label: 'Descripción', value: tattooDescription }] : []),
                  { label: 'Fecha', value: selectedDate?.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
                  { label: 'Hora', value: formatTime12(selectedTime) },
                  ...(!isTattooService ? [{ label: 'Bebida', value: selectedBeverage }] : []),
                ].map((row, i, arr) => (
                  <div key={i} style={{ padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 14, display: 'block', marginBottom: row.label === 'Descripción' ? 4 : 0 }}>{row.label}:</span>
                    <span style={{ fontWeight: 700, fontSize: row.label === 'Descripción' ? 13 : 14, lineHeight: row.label === 'Descripción' ? 1.5 : 1, whiteSpace: 'pre-wrap' }}>{row.value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, marginTop: 4, borderTop: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{isTattooService ? 'Precio:' : 'Total aproximado:'}</span>
                  <span className="text-gold" style={{ fontSize: 22, fontWeight: 900 }}>
                    {selectedService?.price === 0 || selectedService?.name?.toLowerCase().includes('cotizar') ? 'A Cotizar' : `$${selectedService?.price}`}
                  </span>
                </div>
              </div>

              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="btn-gold"
                style={{
                  width: '100%',
                  marginTop: 20,
                  padding: '16px',
                  fontSize: 16,
                  borderRadius: 'var(--radius-pill)',
                  opacity: submitting ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                {isTattooService ? <><MessageCircle size={18} /> Enviar por WhatsApp</> : (submitting ? 'Agendando...' : 'Confirmar Reserva')}
              </button>
            </div>
          )}
            </>
            );
          })()}
        </div>

        {/* Navigation */}
        {step < totalSteps && (
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="btn-outline"
                style={{ flex: 1, padding: '14px', fontSize: 15, borderRadius: 'var(--radius-pill)' }}
              >
                <ChevronLeft size={16} style={{ marginRight: 4 }} /> Atrás
              </button>
            )}
            <button
              onClick={() => canNext() && setStep(step + 1)}
              disabled={!canNext()}
              className="btn-gold"
              style={{
                flex: 1,
                padding: '14px',
                fontSize: 15,
                borderRadius: 'var(--radius-pill)',
                opacity: canNext() ? 1 : 0.4,
                cursor: canNext() ? 'pointer' : 'not-allowed',
              }}
            >
              Siguiente <ChevronRight size={16} style={{ marginLeft: 4 }} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
