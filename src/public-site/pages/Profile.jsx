import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Calendar, Gift, Star, LogOut, Clock, Heart, ChevronRight, FileCheck, AlertTriangle, Check, X, PenTool } from 'lucide-react';
import { publicService } from '../services/publicService';
import PrizeWheel from '../components/PrizeWheel';

export default function Profile() {
  const [activeTab, setActiveTab] = useState('citas');
  const [client, setClient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [points, setPoints] = useState(0);
  const [allBarbers, setAllBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTopClient, setIsTopClient] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('favorite_barbers') || '[]');
    } catch {
      return [];
    }
  });
  const [selectedConsent, setSelectedConsent] = useState(null);
  const [consentSaving, setConsentSaving] = useState(false);
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef(null);
  const hasDrawn = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    const clientData = JSON.parse(localStorage.getItem('panda_public_client') || 'null');
    if (!clientData) {
      navigate('/login');
      return;
    }
    setClient(clientData);
    setHasSpun(localStorage.getItem(`panda_spun_${clientData.id}`) === 'true');
    loadData(clientData.id);
  }, [navigate]);

  const loadData = async (clientId) => {
    try {
      const [appts, pts, topClients, staffData] = await Promise.all([
        publicService.getClientAppointments(clientId),
        publicService.getClientPoints(clientId),
        publicService.getTopClientsOfMonth().catch(() => []),
        publicService.getStaff().catch(() => [])
      ]);
      setAppointments(appts);
      setPoints(pts);
      const isTop = (topClients || []).some(c => c.id === clientId);
      setIsTopClient(isTop);
      setAllBarbers(staffData);
    } catch (e) {
      console.error('Error loading profile data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('panda_public_client');
    localStorage.removeItem('panda_public_session');
    navigate('/');
  };

  const removeFavorite = (barberId) => {
    const updated = favorites.filter(id => id !== barberId);
    setFavorites(updated);
    localStorage.setItem('favorite_barbers', JSON.stringify(updated));
  };

  const handleReserveFav = (barber) => {
    const bookingState = {
      selectedCategory: barber.role?.includes('Tatuador') ? 'Tatuajes' : 'Barberia',
      selectedService: null,
      selectedBarber: barber,
      selectedDate: null,
      selectedTime: null
    };
    localStorage.setItem('bookingState', JSON.stringify(bookingState));
    navigate('/');
  };

  const prizes = [
    { name: 'Corte Gratis', points: 500, available: points >= 500 },
    { name: 'Lavado Premium', points: 200, available: points >= 200 },
    { name: '10% Descuento', points: 100, available: points >= 100 },
  ];

  const tattooAppointments = appointments.filter(a => a.tattoo_data);
  const pendingConsent = tattooAppointments.filter(a => !a.tattoo_data?.consent_signed);
  const signedConsent = tattooAppointments.filter(a => a.tattoo_data?.consent_signed);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = '#CBB79A';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  useEffect(() => {
    if (selectedConsent && !selectedConsent.tattoo_data?.consent_signed) {
      setTimeout(() => {
        initCanvas();
        hasDrawn.current = false;
      }, 100);
    }
  }, [selectedConsent, initCanvas]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    isDrawing.current = true;
    const canvas = canvasRef.current;
    lastPoint.current = getPos(e, canvas);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPoint.current = pos;
    hasDrawn.current = true;
  };

  const stopDraw = () => {
    isDrawing.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fillRect(0, 0, rect.width, rect.height);
    hasDrawn.current = false;
  };

  const saveConsent = async () => {
    if (!selectedConsent || !hasDrawn.current) return;
    setConsentSaving(true);
    try {
      const canvas = canvasRef.current;
      const signature = canvas.toDataURL('image/png');
      const updatedData = {
        ...selectedConsent.tattoo_data,
        consent_signed: true,
        consent_signature: signature,
        consent_date: new Date().toISOString(),
        consent_client_name: client?.name || ''
      };
      await publicService.updateAppointmentTattooConsent(selectedConsent.id, updatedData);
      setAppointments(prev => prev.map(a =>
        a.id === selectedConsent.id ? { ...a, tattoo_data: updatedData } : a
      ));
      setSelectedConsent(null);
    } catch (e) {
      console.error('Error saving consent:', e);
    } finally {
      setConsentSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)' }}>Cargando perfil...</div>
      </div>
    );
  }

  const favBarbers = allBarbers.filter(b => favorites.includes(b.id));

  return (
    <div style={{ minHeight: '100vh', padding: '60px 16px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {/* Profile Header */}
        <div className="glass-card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: 'var(--gold-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <User size={28} color="#000" />
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 18, fontWeight: 700 }}>{client?.name}</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{client?.phone}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Star size={13} style={{ color: 'var(--champagne)', fill: 'var(--champagne)' }} />
                <span className="text-gold" style={{ fontSize: 13, fontWeight: 700 }}>{points} puntos</span>
              </div>
            </div>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {isTopClient && !hasSpun && (
          <PrizeWheel
            clientId={client?.id}
            onWin={() => {
              setHasSpun(true);
              localStorage.setItem(`panda_spun_${client?.id}`, 'true');
            }}
          />
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { id: 'citas', label: 'Mis Citas', icon: Calendar },
            { id: 'consent', label: 'Consentimiento', icon: FileCheck, badge: pendingConsent.length },
            { id: 'premios', label: 'Premios', icon: Gift },
            { id: 'favoritos', label: 'Favoritos', icon: Heart },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, minWidth: 'fit-content',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 6, padding: '10px 8px', borderRadius: 'var(--radius-md)',
                fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer',
                background: activeTab === tab.id ? 'var(--gold-gradient)' : 'var(--bg-tertiary)',
                color: activeTab === tab.id ? '#000' : 'var(--text-muted)',
                transition: 'all 0.2s', position: 'relative',
              }}
            >
              <tab.icon size={14} fill={activeTab === tab.id && tab.id === 'favoritos' ? '#000' : 'none'} />
              {tab.label}
              {tab.badge > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -2,
                  width: 18, height: 18, borderRadius: '50%',
                  background: '#ff453a', color: 'white',
                  fontSize: 10, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Appointments */}
        {activeTab === 'citas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {appointments.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                <Calendar size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', opacity: 0.5 }} />
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No tienes citas programadas</p>
              </div>
            ) : (
              appointments.map((apt) => (
                <div key={apt.id} className="glass-card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontWeight: 700, fontSize: 15 }}>{apt.services?.name || 'Servicio'}</h3>
                      <p style={{ color: 'var(--champagne)', fontSize: 13 }}>{apt.staff?.name || 'Barbero'}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} />
                        {apt.scheduled_at ? new Date(apt.scheduled_at).toLocaleString('es', { date: 'short', time: 'short' }) : 'Sin fecha'}
                      </p>
                    </div>
                    <span style={{
                      padding: '4px 12px', borderRadius: 'var(--radius-pill)',
                      fontSize: 12, fontWeight: 700,
                      background: apt.status === 'Agendado' ? 'rgba(203, 183, 154, 0.15)' : apt.status === 'Completado' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                      color: apt.status === 'Agendado' ? 'var(--champagne)' : apt.status === 'Completado' ? '#22c55e' : '#fbbf24',
                    }}>
                      {apt.status}
                    </span>
                  </div>

                  {apt.tattoo_data && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed rgba(255,255,255,0.08)' }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: '#c084fc', letterSpacing: '1px' }}>DETALLES DEL TATUAJE</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
                        {apt.tattoo_data.size && (
                          <div>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Tamano</span>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: 0 }}>{apt.tattoo_data.size}</p>
                          </div>
                        )}
                        {apt.tattoo_data.zone && (
                          <div>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Zona</span>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: 0 }}>{apt.tattoo_data.zone}</p>
                          </div>
                        )}
                        {apt.tattoo_data.style && (
                          <div>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Estilo</span>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: 0 }}>{apt.tattoo_data.style}</p>
                          </div>
                        )}
                        {apt.tattoo_data.theme && (
                          <div>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Tematica</span>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: 0 }}>{apt.tattoo_data.theme}</p>
                          </div>
                        )}
                      </div>
                      {apt.tattoo_data.idea && (
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 8, fontStyle: 'italic' }}>"{apt.tattoo_data.idea}"</p>
                      )}
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: apt.tattoo_data.consent_signed ? '#34c759' : '#ff453a' }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: apt.tattoo_data.consent_signed ? '#34c759' : '#ff453a' }}>
                          {apt.tattoo_data.consent_signed ? 'Consentimiento firmado' : 'Pendiente de consentimiento'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Consent Tab */}
        {activeTab === 'consent' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tattooAppointments.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                <FileCheck size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', opacity: 0.4 }} />
                <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 600 }}>No tienes citas de tatuaje</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>El consentimiento aparece aqui cuando agendes una sesion de tatuaje.</p>
              </div>
            ) : (
              <>
                {pendingConsent.length > 0 && (
                  <div style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#ff453a', letterSpacing: '1px' }}>PENDIENTES DE FIRMA ({pendingConsent.length})</span>
                  </div>
                )}

                {pendingConsent.map((apt) => (
                  <div key={apt.id} className="glass-card" style={{ padding: '16px', border: '1px solid rgba(255,69,58,0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <h3 style={{ fontWeight: 700, fontSize: 14 }}>{apt.services?.name || 'Sesion de tatuaje'}</h3>
                        <p style={{ color: 'var(--champagne)', fontSize: 12 }}>{apt.staff?.name || 'Tatuador'}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                          {apt.scheduled_at ? new Date(apt.scheduled_at).toLocaleString('es', { date: 'short', time: 'short' }) : ''}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#ff453a' }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#ff453a' }}>Pendiente</span>
                      </div>
                    </div>

                    {apt.tattoo_data && (
                      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 10, marginBottom: 10 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                          {apt.tattoo_data.size && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Tamano: <strong style={{ color: 'white' }}>{apt.tattoo_data.size}</strong></span>}
                          {apt.tattoo_data.zone && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Zona: <strong style={{ color: 'white' }}>{apt.tattoo_data.zone}</strong></span>}
                          {apt.tattoo_data.style && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Estilo: <strong style={{ color: 'white' }}>{apt.tattoo_data.style}</strong></span>}
                          {apt.tattoo_data.theme && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Tematica: <strong style={{ color: 'white' }}>{apt.tattoo_data.theme}</strong></span>}
                        </div>
                      </div>
                    )}

                    {!apt.tattoo_data?.is_of_legal_age && (
                      <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 8, padding: 10, marginBottom: 10, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <AlertTriangle size={14} style={{ color: '#fbbf24', flexShrink: 0, marginTop: 1 }} />
                        <span style={{ fontSize: 11, color: '#fbbf24' }}>Menor de edad - Requiere consentimiento de padre/tutor</span>
                      </div>
                    )}

                    <button
                      onClick={() => setSelectedConsent(apt)}
                      style={{
                        width: '100%', padding: '10px 0', borderRadius: 'var(--radius-pill)',
                        fontSize: 13, fontWeight: 800,
                        background: 'var(--gold-gradient)', color: '#000',
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}
                    >
                      <PenTool size={14} /> Firmar Consentimiento
                    </button>
                  </div>
                ))}

                {signedConsent.length > 0 && (
                  <div style={{ marginTop: pendingConsent.length > 0 ? 8 : 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#34c759', letterSpacing: '1px' }}>FIRMADOS ({signedConsent.length})</span>
                  </div>
                )}

                {signedConsent.map((apt) => (
                  <div
                    key={apt.id}
                    className="glass-card"
                    onClick={() => setSelectedConsent({ ...apt, _viewOnly: true })}
                    style={{ padding: '16px', cursor: 'pointer', border: '1px solid rgba(52,199,89,0.15)', transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(52,199,89,0.35)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(52,199,89,0.15)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ fontWeight: 700, fontSize: 14 }}>{apt.services?.name || 'Sesion de tatuaje'}</h3>
                        <p style={{ color: 'var(--champagne)', fontSize: 12 }}>{apt.staff?.name || 'Tatuador'}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#34c759' }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#34c759' }}>Firmado</span>
                      </div>
                    </div>
                    {apt.tattoo_data?.consent_date && (
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                        Firmado el {new Date(apt.tattoo_data.consent_date).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                    <p style={{ fontSize: 10, color: 'var(--champagne)', marginTop: 8, fontWeight: 600 }}>Ver contrato firmado →</p>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Prizes */}
        {activeTab === 'premios' && (
          <div>
            <div style={{
              background: 'var(--gold-gradient)', borderRadius: 'var(--radius-lg)',
              padding: '24px', marginBottom: 20, color: '#000',
            }}>
              <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 4 }}>{points} Puntos</h2>
              <p style={{ color: 'rgba(0,0,0,0.6)', fontSize: 14 }}>Sigue acumulando para canjear premios</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {prizes.map((prize, i) => (
                <div key={i} className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: 15 }}>{prize.name}</h3>
                    <p className="text-gold" style={{ fontSize: 13, fontWeight: 600 }}>{prize.points} puntos</p>
                  </div>
                  <button
                    disabled={!prize.available}
                    className={prize.available ? 'btn-gold' : ''}
                    style={{
                      padding: '8px 20px', borderRadius: 'var(--radius-pill)',
                      fontSize: 13, fontWeight: 700,
                      border: prize.available ? 'none' : '1px solid var(--border-color)',
                      background: prize.available ? undefined : 'var(--bg-tertiary)',
                      color: prize.available ? undefined : 'var(--text-muted)',
                      cursor: prize.available ? 'pointer' : 'not-allowed',
                      opacity: prize.available ? 1 : 0.5,
                    }}
                  >
                    {prize.available ? 'Canjear' : `${prize.points - points} mas`}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Favorites */}
        {activeTab === 'favoritos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {favBarbers.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                <Heart size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', opacity: 0.4 }} />
                <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 600 }}>Aun no tienes artistas favoritos</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>Agregalos desde la pantalla de reservas.</p>
              </div>
            ) : (
              favBarbers.map((barber) => {
                const isTattooist = barber.role?.toLowerCase().includes('tatuador');
                return (
                  <div key={barber.id} className="glass-card animate-scale-in" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: '16px', overflow: 'hidden',
                      backgroundColor: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.08)', flexShrink: 0
                    }}>
                      {barber.image_url ? (
                        <img src={barber.image_url} alt={barber.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)' }}>
                          <User size={20} color="var(--text-muted)" />
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontWeight: 800, fontSize: 15, color: 'white' }}>{barber.name}</h3>
                      <span style={{
                        fontSize: 9, fontWeight: 900,
                        backgroundColor: isTattooist ? 'rgba(168,85,247,0.12)' : 'rgba(212,188,154,0.12)',
                        color: isTattooist ? '#c084fc' : 'var(--champagne)',
                        padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase',
                        letterSpacing: '0.5px', display: 'inline-block', marginTop: 4
                      }}>
                        {isTattooist ? 'Tatuador' : 'Barbero'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        onClick={() => removeFavorite(barber.id)}
                        style={{
                          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                          color: '#ff453a', padding: '10px', borderRadius: '12px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                        }}
                      >
                        <Heart size={16} fill="#ff453a" stroke="#ff453a" />
                      </button>
                      <button
                        onClick={() => handleReserveFav(barber)}
                        className="btn-gold"
                        style={{
                          padding: '10px 16px', borderRadius: '12px', fontSize: 12, fontWeight: 800,
                          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                        }}
                      >
                        Reservar <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Consent Modal */}
      {selectedConsent && (() => {
        const isViewOnly = selectedConsent._viewOnly;
        const td = selectedConsent.tattoo_data;
        return (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }} onClick={() => !consentSaving && setSelectedConsent(null)}>
            <div style={{
              background: 'var(--bg-secondary)', borderRadius: 20,
              border: '1px solid var(--border-color)', padding: '24px 20px',
              maxWidth: 440, width: '100%', maxHeight: '90vh', overflowY: 'auto',
            }} onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 800, color: 'white' }}>
                    {isViewOnly ? 'Consentimiento Firmado' : 'Consentimiento Informado'}
                  </h2>
                  {isViewOnly && td?.consent_date && (
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                      Firmado el {new Date(td.consent_date).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>
                {!consentSaving && (
                  <button onClick={() => setSelectedConsent(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={20} />
                  </button>
                )}
              </div>

              {/* Contract document */}
              <div style={{
                background: 'rgba(255,255,255,0.04)', borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.08)', padding: '20px 16px',
                marginBottom: 16,
              }}>
                {/* Contract title */}
                <div style={{ textAlign: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--champagne)', letterSpacing: '2px', margin: 0 }}>PANDA BARBER STUDIO</p>
                  <p style={{ fontSize: 14, fontWeight: 800, color: 'white', margin: '6px 0 0' }}>CONSENTIMIENTO INFORMADO</p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '4px 0 0' }}>Para procedimientos de tatuaje</p>
                </div>

                {/* Legal paragraphs */}
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', margin: '0 0 6px' }}>1. DECLARACION</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: 0 }}>
                    Declaro que soy mayor de edad y acepto de forma voluntaria el procedimiento de tatuaje propuesto por Panda Barber Studio.
                    Comprendo que el proceso implica la insercion permanente de pigmento en la piel mediante agujas esterilizadas, y que conlleva
                    riesgos inherentemente asociados.
                  </p>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', margin: '0 0 6px' }}>2. RIESGOS ACEPTADOS</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: 0 }}>
                    Acepto que los riesgos del procedimiento incluyen, pero no se limitan a: infeccion en la zona del tatuaje, reacciones alergicas
                    al pigmento o materiales utilizados, cicatrizacion anormal (queloide), irritacion cutanea prolongada, sangrado excesivo y
                    posibles complicaciones relacionadas con la sensibilidad individual de la piel.
                  </p>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', margin: '0 0 6px' }}>3. CUIDADOS POSTERIORES</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: 0 }}>
                    Me comprometo a seguir rigurosamente las indicaciones de cuidado posterior proporcionadas por el artista de tatuaje, incluyendo
                    la limpieza, hidratacion y proteccion de la zona tatuada durante el proceso de cicatrizacion.
                  </p>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', margin: '0 0 6px' }}>4. USO DE IMAGEN</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: 0 }}>
                    Autorizo de forma voluntaria a Panda Barber Studio a tomar fotografias y/o videos del procedimiento y del resultado final
                    del tatuaje, para su uso exclusivo con fines promocionales en redes sociales, pagina web y plataformas digitales del estudio.
                  </p>
                </div>

                <div style={{ marginBottom: 0 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', margin: '0 0 6px' }}>5. RESPONSABILIDAD</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: 0 }}>
                    Declaro que no estoy bajo los efectos de alcohol, drogas o sustancias que puedan afectar mi juicio. Asumo plena responsabilidad
                    sobre la decision de realizarme el tatuaje y libero a Panda Barber Studio de cualquier responsabilidad por complicaciones
                    derivadas de mi incumplimiento de los cuidados posteriores.
                  </p>
                </div>
              </div>

              {/* Tattoo details */}
              {td && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
                  {td.size && (
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 10px' }}>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Tamano</span>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'white', margin: 0 }}>{td.size}</p>
                    </div>
                  )}
                  {td.zone && (
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 10px' }}>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Zona</span>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'white', margin: 0 }}>{td.zone}</p>
                    </div>
                  )}
                  {td.style && (
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 10px' }}>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Estilo</span>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'white', margin: 0 }}>{td.style}</p>
                    </div>
                  )}
                  {td.theme && (
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 10px' }}>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Tematica</span>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'white', margin: 0 }}>{td.theme}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Minor warning */}
              {!td?.is_of_legal_age && (
                <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 10, padding: 12, marginBottom: 14, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <AlertTriangle size={14} style={{ color: '#fbbf24', flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 11, color: '#fbbf24' }}>Cliente menor de edad. Requiere autorizacion de padre/tutor legal.</span>
                </div>
              )}

              {/* VIEW ONLY: Signature image */}
              {isViewOnly && td?.consent_signature && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 14, border: '1px solid rgba(52,199,89,0.15)' }}>
                    <p style={{ fontSize: 10, fontWeight: 800, color: '#34c759', letterSpacing: '1px', margin: '0 0 10px' }}>FIRMA DEL CLIENTE</p>
                    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 10 }}>
                      <img
                        src={td.consent_signature}
                        alt="Firma del consentimiento"
                        style={{ width: '100%', display: 'block', borderRadius: 6 }}
                      />
                    </div>
                    {td.consent_client_name && (
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 10, textAlign: 'center', fontStyle: 'italic' }}>
                        {td.consent_client_name}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* SIGN MODE: Canvas signature */}
              {!isViewOnly && (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px' }}>FIRMA AQUI</span>
                      <button
                        onClick={clearCanvas}
                        disabled={consentSaving}
                        style={{
                          padding: '4px 12px', borderRadius: 'var(--radius-pill)',
                          fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.06)',
                          color: 'var(--text-muted)', border: 'none',
                          cursor: consentSaving ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Limpiar
                      </button>
                    </div>
                    <div style={{
                      borderRadius: 12, overflow: 'hidden',
                      border: '2px dashed rgba(203,183,154,0.3)',
                      background: 'rgba(255,255,255,0.02)',
                    }}>
                      <canvas
                        ref={canvasRef}
                        style={{ width: '100%', height: 140, touchAction: 'none', display: 'block', cursor: 'crosshair' }}
                        onMouseDown={startDraw}
                        onMouseMove={draw}
                        onMouseUp={stopDraw}
                        onMouseLeave={stopDraw}
                        onTouchStart={startDraw}
                        onTouchMove={draw}
                        onTouchEnd={stopDraw}
                      />
                    </div>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
                      Dibuja tu firma con el dedo o el mouse
                    </p>
                  </div>

                  <button
                    onClick={saveConsent}
                    disabled={consentSaving}
                    style={{
                      width: '100%', padding: '14px 0',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: 14, fontWeight: 800,
                      background: consentSaving ? 'rgba(203,183,154,0.3)' : 'var(--gold-gradient)',
                      color: consentSaving ? 'rgba(255,255,255,0.5)' : '#000',
                      border: 'none', cursor: consentSaving ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    <Check size={16} />
                    {consentSaving ? 'Guardando...' : 'Guardar Consentimiento'}
                  </button>
                </>
              )}

              {/* VIEW ONLY: Close button */}
              {isViewOnly && (
                <button
                  onClick={() => setSelectedConsent(null)}
                  style={{
                    width: '100%', padding: '12px 0',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: 13, fontWeight: 700,
                    background: 'rgba(255,255,255,0.06)',
                    color: 'var(--text-muted)',
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  Cerrar
                </button>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
