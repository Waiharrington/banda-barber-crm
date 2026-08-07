import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Calendar, Gift, Star, LogOut, Clock, Heart, ChevronRight, ChevronLeft, FileCheck, AlertTriangle, Check, X, PenTool, Scissors, Droplets, Sparkles, Eye, Zap, Shield, Award } from 'lucide-react';
import { publicService } from '../services/publicService';
import PrizeWheel from '../components/PrizeWheel';

export default function Profile() {
  const [activeTab, setActiveTab] = useState('citas');
  const [client, setClient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  const [points, setPoints] = useState(0);
  const [allBarbers, setAllBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTopClient, setIsTopClient] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('favorite_barbers') || '[]'); } catch { return []; }
  });
  const [selectedConsent, setSelectedConsent] = useState(null);
  const [consentSaving, setConsentSaving] = useState(false);
  const [ratingModal, setRatingModal] = useState(null);
  const [ratings, setRatings] = useState({ rapidez: 0, limpieza: 0, habilidad: 0 });
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratedAppointments, setRatedAppointments] = useState({});
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef(null);
  const hasDrawn = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    const clientData = JSON.parse(localStorage.getItem('panda_public_client') || 'null');
    if (!clientData) { navigate('/login'); return; }
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
      setIsTopClient((topClients || []).some(c => c.id === clientId));
      setAllBarbers(staffData);

      // Check which appointments have been rated (parallelized for ultra-fast loading)
      const completedApts = (appts || []).filter(apt => apt.status === 'Completado' || apt.status === 'Pagado');
      const reviewResults = await Promise.all(
        completedApts.map(apt =>
          publicService.hasClientReviewed(apt.id)
            .then(reviewed => ({ id: apt.id, reviewed }))
            .catch(() => ({ id: apt.id, reviewed: false }))
        )
      );
      const rated = {};
      reviewResults.forEach(item => {
        if (item.reviewed) rated[item.id] = true;
      });
      setRatedAppointments(rated);
    } catch (e) { console.error('Error loading profile data:', e); }
    finally { setLoading(false); }
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
    localStorage.setItem('bookingState', JSON.stringify({
      selectedCategory: barber.role?.includes('Tatuador') ? 'Tatuajes' : 'Barberia',
      selectedService: null, selectedBarber: barber, selectedDate: null, selectedTime: null
    }));
    navigate('/');
  };

  const prizes = [
    { name: 'Corte Gratis', points: 300, icon: Scissors, available: points >= 300 },
    { name: 'Servicio de Barba Gratis', points: 200, icon: Sparkles, available: points >= 200 },
    { name: 'Lavado Premium Gratis', points: 100, icon: Droplets, available: points >= 100 },
  ];

  const validAppointments = (appointments || []).filter(a => {
    const status = (a.status || '').toLowerCase();
    return !status.includes('cancelad');
  });

  const totalPages = Math.ceil(validAppointments.length / ITEMS_PER_PAGE) || 1;
  const paginatedAppointments = validAppointments.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const tattooAppointments = validAppointments.filter(a => a.tattoo_data);
  const pendingConsent = tattooAppointments.filter(a => !a.tattoo_data?.consent_signed);
  const signedConsent = tattooAppointments.filter(a => a.tattoo_data?.consent_signed);

  const nextPrize = [...prizes].reverse().find(p => !p.available);
  const progressPercent = nextPrize ? Math.min((points / nextPrize.points) * 100, 100) : 100;

  const getServiceIcon = (serviceName, category) => {
    const name = (serviceName || '').toLowerCase();
    const cat = (category || '').toLowerCase();
    if (cat.includes('tatuaj') || name.includes('tatuaj')) return <Sparkles size={14} />;
    if (name.includes('lavado') || cat.includes('lavado')) return <Droplets size={14} />;
    return <Scissors size={14} />;
  };

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
      setTimeout(() => { initCanvas(); hasDrawn.current = false; }, 100);
    }
  }, [selectedConsent, initCanvas]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e) => { e.preventDefault(); isDrawing.current = true; lastPoint.current = getPos(e, canvasRef.current); };
  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e, canvasRef.current);
    ctx.beginPath(); ctx.moveTo(lastPoint.current.x, lastPoint.current.y); ctx.lineTo(pos.x, pos.y); ctx.stroke();
    lastPoint.current = pos; hasDrawn.current = true;
  };
  const stopDraw = () => { isDrawing.current = false; };
  const clearCanvas = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = 'rgba(255,255,255,0.02)'; ctx.fillRect(0, 0, rect.width, rect.height);
    hasDrawn.current = false;
  };

  const saveConsent = async () => {
    if (!selectedConsent || !hasDrawn.current) return;
    setConsentSaving(true);
    try {
      const signature = canvasRef.current.toDataURL('image/png');
      const updatedData = { ...selectedConsent.tattoo_data, consent_signed: true, consent_signature: signature, consent_date: new Date().toISOString(), consent_client_name: client?.name || '' };
      await publicService.updateAppointmentTattooConsent(selectedConsent.id, updatedData);
      setAppointments(prev => prev.map(a => a.id === selectedConsent.id ? { ...a, tattoo_data: updatedData } : a));
      setSelectedConsent(null);
    } catch (e) { console.error('Error saving consent:', e); }
    finally { setConsentSaving(false); }
  };

  const submitRating = async () => {
    if (!ratingModal || ratings.rapidez === 0 || ratings.limpieza === 0 || ratings.habilidad === 0) return;
    setRatingSaving(true);
    try {
      await publicService.submitStaffReview({
        staff_id: ratingModal.staff_id,
        client_id: client?.id,
        appointment_id: ratingModal.id,
        rapidez: ratings.rapidez,
        limpieza: ratings.limpieza,
        habilidad: ratings.habilidad,
        comment: ratingComment || null
      });
      setRatedAppointments(prev => ({ ...prev, [ratingModal.id]: true }));
      setRatingModal(null);
      setRatings({ rapidez: 0, limpieza: 0, habilidad: 0 });
      setRatingComment('');
    } catch (e) {
      console.error('Error submitting rating:', e);
    } finally {
      setRatingSaving(false);
    }
  };

  const StarRating = ({ label, icon: Icon, value, onChange }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 110 }}>
        <Icon size={14} style={{ color: 'var(--champagne)' }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4, 5].map(star => (
          <button key={star} onClick={() => onChange(star)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 2,
            transition: 'transform 0.15s',
          }}>
            <Star size={22} fill={star <= value ? '#CBB79A' : 'none'} stroke={star <= value ? '#CBB79A' : 'rgba(255,255,255,0.2)'}
              style={{ transition: 'all 0.2s', transform: star <= value ? 'scale(1.1)' : 'scale(1)' }} />
          </button>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontFamily: 'General Sans', fontWeight: 600 }}>Cargando perfil...</div>
      </div>
    );
  }

  const favBarbers = allBarbers.filter(b => favorites.includes(b.id));

  const tabStyle = (active) => ({
    flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 5, padding: '10px 4px', borderRadius: 'var(--radius-pill)',
    fontWeight: 700, fontSize: 11, border: 'none', cursor: 'pointer',
    background: active ? 'var(--gold-gradient)' : 'transparent',
    color: active ? '#000' : 'var(--text-muted)',
    transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)', position: 'relative',
    fontFamily: 'General Sans',
  });

  return (
    <div style={{ minHeight: '100vh', padding: '100px 16px 40px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>

        {/* ── PROFILE HEADER ── */}
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          {/* Avatar */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%', margin: '0 auto 14px',
            background: 'var(--gold-gradient)', padding: 3,
            boxShadow: '0 0 30px rgba(203,183,154,0.25), 0 0 60px rgba(203,183,154,0.1)',
            animation: 'pulse 3s ease-in-out infinite',
          }}>
            <div style={{
              width: '100%', height: '100%', borderRadius: '50%',
              background: 'var(--bg-secondary)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <User size={32} style={{ color: 'var(--champagne)' }} />
            </div>
          </div>

          {/* Name & Phone */}
          <h1 style={{
            fontSize: 22, fontWeight: 800, color: 'white',
            fontFamily: 'General Sans', margin: 0, letterSpacing: '-0.3px',
          }}>{client?.name}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>{client?.phone}</p>

          {/* Logout moved up */}
          <div style={{ marginTop: 6 }}>
            <button onClick={handleLogout} style={{
              background: 'none', border: 'none',
              color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11,
              fontFamily: 'General Sans', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4,
              opacity: 0.65, transition: 'opacity 0.2s', padding: '4px 8px', borderRadius: '6px'
            }} onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = 0.65}>
              <LogOut size={13} /> Cerrar sesión
            </button>
          </div>

          {/* Botón Agendar Cita */}
          <div style={{ marginTop: 14 }}>
            <button
              onClick={() => navigate('/agendar', { state: { startBooking: true, bookingRequestId: Date.now() } })}
              className="btn-gold"
              style={{
                width: '100%',
                padding: '13px 20px',
                borderRadius: 'var(--radius-pill)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontWeight: 700,
                fontSize: 14,
                fontFamily: 'General Sans',
                boxShadow: '0 4px 20px rgba(203,183,154,0.25)',
                cursor: 'pointer',
                border: 'none'
              }}
            >
              <Calendar size={17} />
              <span>Agendar Cita</span>
              <ChevronRight size={17} />
            </button>
          </div>

          {/* Points display */}
          <div style={{
            marginTop: 14, padding: '14px 20px', borderRadius: 'var(--radius-lg)',
            background: 'rgba(203,183,154,0.06)', border: '1px solid rgba(203,183,154,0.12)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
              <Star size={16} style={{ color: 'var(--champagne)', fill: 'var(--champagne)' }} />
              <span style={{
                fontSize: 26, fontWeight: 900, fontFamily: 'General Sans',
                background: 'var(--gold-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>{points}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>puntos</span>
            </div>
            {nextPrize && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Siguiente: <strong style={{ color: 'var(--champagne)' }}>{nextPrize.name}</strong></span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--champagne)' }}>{points}/{nextPrize.points}</span>
                </div>
                <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 4, background: 'var(--gold-gradient)',
                    width: `${progressPercent}%`, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                  }} />
                </div>
              </>
            )}
            {points === 0 && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Acumula puntos con cada servicio</p>
            )}
          </div>
        </div>

        {isTopClient && !hasSpun && (
          <PrizeWheel clientId={client?.id} onWin={() => { setHasSpun(true); localStorage.setItem(`panda_spun_${client?.id}`, 'true'); }} />
        )}

        {/* ── TABS ── */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 24, padding: 4,
          background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-pill)',
          border: '1px solid rgba(255,255,255,0.04)',
        }}>
          {[
            { id: 'citas', label: 'Citas', icon: Calendar },
            { id: 'consent', label: 'Consent.', icon: FileCheck, badge: pendingConsent.length },
            { id: 'premios', label: 'Premios', icon: Gift },
            { id: 'favoritos', label: 'Favs', icon: Heart },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={tabStyle(activeTab === tab.id)}>
              <tab.icon size={14} fill={activeTab === tab.id && tab.id === 'favoritos' ? '#000' : 'none'} />
              <span style={{ whiteSpace: 'nowrap' }}>{tab.label}</span>
              {tab.badge > 0 && (
                <span style={{
                  position: 'absolute', top: -3, right: -1,
                  minWidth: 16, height: 16, borderRadius: 8, padding: '0 4px',
                  background: '#ff453a', color: 'white',
                  fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{tab.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── CITAS TAB ── */}
        {activeTab === 'citas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {validAppointments.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '48px 20px' }}>
                <Calendar size={44} style={{ color: 'var(--champagne)', margin: '0 auto 14px', opacity: 0.3 }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: 15, fontWeight: 700, fontFamily: 'General Sans' }}>Sin citas aun</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>Tus citas apareceran aqui cuando reserves.</p>
              </div>
            ) : (
              <>
                {paginatedAppointments.map((apt, idx) => (
                  <div key={apt.id} className="glass-card" style={{
                    padding: '16px',
                    animation: `fadeInUp 0.4s ease ${idx * 0.05}s both`,
                  }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      {/* Service icon */}
                      <div style={{
                        width: 40, height: 40, borderRadius: 'var(--radius-md)',
                        background: 'rgba(203,183,154,0.08)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        color: 'var(--champagne)',
                      }}>
                        {getServiceIcon(apt.services?.name, apt.services?.category)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ minWidth: 0 }}>
                            <h3 style={{ fontWeight: 700, fontSize: 14, fontFamily: 'General Sans', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{apt.services?.name || 'Servicio'}</h3>
                            <p style={{ color: 'var(--champagne)', fontSize: 12, fontWeight: 600, margin: '2px 0 0' }}>{apt.staff?.name || 'Barbero'}</p>
                          </div>
                          <span style={{
                            padding: '3px 10px', borderRadius: 'var(--radius-pill)', fontSize: 10, fontWeight: 700, flexShrink: 0,
                            background: apt.status === 'Agendado' ? 'rgba(203,183,154,0.12)' : apt.status === 'Completado' ? 'rgba(34,197,94,0.12)' : 'rgba(251,191,36,0.12)',
                            color: apt.status === 'Agendado' ? 'var(--champagne)' : apt.status === 'Completado' ? '#34c759' : '#fbbf24',
                          }}>{apt.status}</span>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={11} />
                          {apt.scheduled_at ? new Date(apt.scheduled_at).toLocaleString('es', { date: 'short', time: 'short' }) : 'Sin fecha'}
                        </p>
                      </div>
                    </div>

                    {/* Rating button for completed appointments */}
                    {(apt.status === 'Completado' || apt.status === 'Pagado') && apt.staff?.name && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                        {ratedAppointments[apt.id] ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#34c759' }}>
                            <Check size={13} /> Calificado
                          </div>
                        ) : (
                          <button onClick={() => { setRatingModal(apt); setRatings({ rapidez: 0, limpieza: 0, habilidad: 0 }); setRatingComment(''); }} style={{
                            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                            borderRadius: 'var(--radius-pill)', fontSize: 11, fontWeight: 800,
                            background: 'rgba(203,183,154,0.1)', color: 'var(--champagne)',
                            border: '1px solid rgba(203,183,154,0.2)', cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}>
                            <Star size={13} fill="#CBB79A" stroke="#CBB79A" /> Calificar servicio
                          </button>
                        )}
                      </div>
                    )}

                    {apt.tattoo_data && (
                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: 8, fontWeight: 800, color: '#c084fc', letterSpacing: '1.5px' }}>TATUAJE</span>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 6 }}>
                          {apt.tattoo_data.size && <div><span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Tamano</span><p style={{ fontSize: 12, fontWeight: 700, color: 'white', margin: 0 }}>{apt.tattoo_data.size}</p></div>}
                          {apt.tattoo_data.zone && <div><span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Zona</span><p style={{ fontSize: 12, fontWeight: 700, color: 'white', margin: 0 }}>{apt.tattoo_data.zone}</p></div>}
                          {apt.tattoo_data.style && <div><span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Estilo</span><p style={{ fontSize: 12, fontWeight: 700, color: 'white', margin: 0 }}>{apt.tattoo_data.style}</p></div>}
                          {apt.tattoo_data.theme && <div><span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Tematica</span><p style={{ fontSize: 12, fontWeight: 700, color: 'white', margin: 0 }}>{apt.tattoo_data.theme}</p></div>}
                        </div>
                        {apt.tattoo_data.idea && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 6, fontStyle: 'italic' }}>"{apt.tattoo_data.idea}"</p>}
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: apt.tattoo_data.consent_signed ? '#34c759' : '#ff453a' }} />
                          <span style={{ fontSize: 10, fontWeight: 700, color: apt.tattoo_data.consent_signed ? '#34c759' : '#ff453a' }}>
                            {apt.tattoo_data.consent_signed ? 'Consentimiento firmado' : 'Pendiente'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Controles de Paginación */}
                {totalPages > 1 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: '1px solid rgba(255,255,255,0.06)'
                  }}>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      style={{
                        background: currentPage === 1 ? 'rgba(255,255,255,0.02)' : 'rgba(203,183,154,0.1)',
                        border: '1px solid rgba(203,183,154,0.2)',
                        color: currentPage === 1 ? 'var(--text-muted)' : 'var(--champagne)',
                        padding: '6px 14px',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: 12,
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        opacity: currentPage === 1 ? 0.35 : 1,
                        transition: 'all 0.2s',
                        fontFamily: 'General Sans'
                      }}
                    >
                      <ChevronLeft size={14} /> Anterior
                    </button>

                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'General Sans' }}>
                      Página <strong style={{ color: 'var(--champagne)' }}>{currentPage}</strong> de {totalPages}
                    </span>

                    <button
                      onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      style={{
                        background: currentPage === totalPages ? 'rgba(255,255,255,0.02)' : 'rgba(203,183,154,0.1)',
                        border: '1px solid rgba(203,183,154,0.2)',
                        color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--champagne)',
                        padding: '6px 14px',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: 12,
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        opacity: currentPage === totalPages ? 0.35 : 1,
                        transition: 'all 0.2s',
                        fontFamily: 'General Sans'
                      }}
                    >
                      Siguiente <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── CONSENT TAB ── */}
        {activeTab === 'consent' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tattooAppointments.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '48px 20px' }}>
                <FileCheck size={44} style={{ color: 'var(--champagne)', margin: '0 auto 14px', opacity: 0.3 }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: 15, fontWeight: 700, fontFamily: 'General Sans' }}>Sin citas de tatuaje</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>El consentimiento aparece al agendar una sesion.</p>
              </div>
            ) : (
              <>
                {pendingConsent.length > 0 && (
                  <div style={{ padding: '0 4px', marginBottom: 2 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: '#ff453a', letterSpacing: '1.5px' }}>PENDIENTES ({pendingConsent.length})</span>
                  </div>
                )}
                {pendingConsent.map((apt, idx) => (
                  <div key={apt.id} className="glass-card" style={{
                    padding: '14px', border: '1px solid rgba(255,69,58,0.15)',
                    animation: `fadeInUp 0.4s ease ${idx * 0.05}s both`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <h3 style={{ fontWeight: 700, fontSize: 13, fontFamily: 'General Sans', margin: 0 }}>{apt.services?.name || 'Sesion de tatuaje'}</h3>
                        <p style={{ color: 'var(--champagne)', fontSize: 11, margin: '2px 0 0' }}>{apt.staff?.name}</p>
                      </div>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#ff453a' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff453a' }} /> Pendiente
                      </span>
                    </div>
                    {!apt.tattoo_data?.is_of_legal_age && (
                      <div style={{ background: 'rgba(251,191,36,0.06)', borderRadius: 8, padding: '8px 10px', marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                        <AlertTriangle size={12} style={{ color: '#fbbf24' }} />
                        <span style={{ fontSize: 10, color: '#fbbf24' }}>Menor de edad</span>
                      </div>
                    )}
                    <button onClick={() => setSelectedConsent(apt)} style={{
                      width: '100%', padding: '10px 0', borderRadius: 'var(--radius-pill)',
                      fontSize: 12, fontWeight: 800, fontFamily: 'General Sans',
                      background: 'var(--gold-gradient)', color: '#000',
                      border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                      <PenTool size={13} /> Firmar Consentimiento
                    </button>
                  </div>
                ))}

                {signedConsent.length > 0 && (
                  <div style={{ padding: '0 4px', marginTop: pendingConsent.length > 0 ? 6 : 0, marginBottom: 2 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: '#34c759', letterSpacing: '1.5px' }}>FIRMADOS ({signedConsent.length})</span>
                  </div>
                )}
                {signedConsent.map((apt, idx) => (
                  <div key={apt.id} className="glass-card" onClick={() => setSelectedConsent({ ...apt, _viewOnly: true })}
                    style={{
                      padding: '14px', cursor: 'pointer', border: '1px solid rgba(52,199,89,0.12)',
                      animation: `fadeInUp 0.4s ease ${idx * 0.05}s both`, transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(52,199,89,0.3)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(52,199,89,0.12)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ fontWeight: 700, fontSize: 13, fontFamily: 'General Sans', margin: 0 }}>{apt.services?.name || 'Sesion de tatuaje'}</h3>
                        <p style={{ color: 'var(--champagne)', fontSize: 11, margin: '2px 0 0' }}>{apt.staff?.name}</p>
                      </div>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#34c759' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34c759' }} /> Firmado
                      </span>
                    </div>
                    {apt.tattoo_data?.consent_date && (
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                        {new Date(apt.tattoo_data.consent_date).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                    <p style={{ fontSize: 10, color: 'var(--champagne)', marginTop: 6, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Eye size={12} /> Ver contrato
                    </p>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── PREMIOS TAB ── */}
        {activeTab === 'premios' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {prizes.map((prize, i) => {
              const prizeProgress = Math.min((points / prize.points) * 100, 100);
              const PrizeIcon = prize.icon;
              return (
                <div key={i} className="glass-card" style={{
                  padding: '16px', display: 'flex', flexDirection: 'column', gap: 12,
                  animation: `fadeInUp 0.4s ease ${i * 0.08}s both`,
                  borderColor: prize.available ? 'rgba(203,183,154,0.2)' : undefined,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 'var(--radius-md)', flexShrink: 0,
                      background: prize.available ? 'rgba(203,183,154,0.12)' : 'rgba(255,255,255,0.04)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: prize.available ? 'var(--champagne)' : 'var(--text-muted)',
                    }}>
                      <PrizeIcon size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontWeight: 700, fontSize: 14, fontFamily: 'General Sans', margin: 0, color: prize.available ? 'white' : 'var(--text-secondary)' }}>{prize.name}</h3>
                      <p style={{ fontSize: 12, fontWeight: 700, margin: '2px 0 0', color: 'var(--champagne)' }}>{prize.points} puntos</p>
                    </div>
                    <button disabled={!prize.available} style={{
                      padding: '8px 18px', borderRadius: 'var(--radius-pill)',
                      fontSize: 12, fontWeight: 800, fontFamily: 'General Sans',
                      background: prize.available ? 'var(--gold-gradient)' : 'rgba(255,255,255,0.04)',
                      color: prize.available ? '#000' : 'var(--text-muted)',
                      border: 'none', cursor: prize.available ? 'pointer' : 'not-allowed',
                      opacity: prize.available ? 1 : 0.5, transition: 'all 0.2s',
                    }}>
                      {prize.available ? 'Canjear' : `${prize.points - points} mas`}
                    </button>
                  </div>
                  {/* Mini progress bar */}
                  <div>
                    <div style={{ height: 3, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 3, transition: 'width 0.6s ease',
                        background: prize.available ? 'var(--gold-gradient)' : 'rgba(203,183,154,0.25)',
                        width: `${prizeProgress}%`,
                      }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── FAVORITOS TAB ── */}
        {activeTab === 'favoritos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {favBarbers.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '48px 20px' }}>
                <Heart size={44} style={{ color: 'var(--champagne)', margin: '0 auto 14px', opacity: 0.3 }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: 15, fontWeight: 700, fontFamily: 'General Sans' }}>Sin favoritos</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>Agrega favoritos desde la reserva.</p>
              </div>
            ) : (
              favBarbers.map((barber, idx) => {
                const isTattooist = barber.role?.toLowerCase().includes('tatuador');
                return (
                  <div key={barber.id} className="glass-card" style={{
                    padding: '14px', display: 'flex', alignItems: 'center', gap: 12,
                    animation: `fadeInUp 0.4s ease ${idx * 0.05}s both`,
                  }}>
                    <div style={{
                      width: 50, height: 50, borderRadius: 'var(--radius-md)', overflow: 'hidden',
                      background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.06)',
                      flexShrink: 0,
                    }}>
                      {barber.image_url ? (
                        <img src={barber.image_url} alt={barber.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={20} style={{ color: 'var(--text-muted)' }} />
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontWeight: 700, fontSize: 14, color: 'white', fontFamily: 'General Sans', margin: 0 }}>{barber.name}</h3>
                      <span style={{
                        fontSize: 9, fontWeight: 800,
                        background: isTattooist ? 'rgba(168,85,247,0.1)' : 'rgba(203,183,154,0.1)',
                        color: isTattooist ? '#c084fc' : 'var(--champagne)',
                        padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase',
                        letterSpacing: '0.5px', display: 'inline-block', marginTop: 3,
                      }}>{isTattooist ? 'Tatuador' : 'Barbero'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => removeFavorite(barber.id)} style={{
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                        color: '#ff453a', padding: '8px', borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Heart size={14} fill="#ff453a" stroke="#ff453a" />
                      </button>
                      <button onClick={() => handleReserveFav(barber)} style={{
                        padding: '8px 14px', borderRadius: 'var(--radius-pill)',
                        fontSize: 11, fontWeight: 800, fontFamily: 'General Sans',
                        background: 'var(--gold-gradient)', color: '#000',
                        border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3,
                      }}>
                        Reservar <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── CONSENT MODAL ── */}
      {selectedConsent && (() => {
        const isViewOnly = selectedConsent._viewOnly;
        const td = selectedConsent.tattoo_data;
        return (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }} onClick={() => !consentSaving && setSelectedConsent(null)}>
            <div style={{
              background: 'var(--bg-secondary)', borderRadius: 20,
              border: '1px solid var(--border-color)', padding: '24px 20px',
              maxWidth: 420, width: '100%', maxHeight: '90vh', overflowY: 'auto',
            }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: 'white', fontFamily: 'General Sans', margin: 0 }}>
                    {isViewOnly ? 'Consentimiento Firmado' : 'Consentimiento Informado'}
                  </h2>
                  {isViewOnly && td?.consent_date && (
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                      Firmado el {new Date(td.consent_date).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>
                {!consentSaving && (
                  <button onClick={() => setSelectedConsent(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                )}
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.03)', borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.06)', padding: '16px 14px', marginBottom: 14,
              }}>
                <div style={{ textAlign: 'center', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--champagne)', letterSpacing: '2px', margin: 0 }}>PANDA BARBER STUDIO</p>
                  <p style={{ fontSize: 13, fontWeight: 800, color: 'white', margin: '4px 0 0', fontFamily: 'General Sans' }}>CONSENTIMIENTO INFORMADO</p>
                  <p style={{ fontSize: 9, color: 'var(--text-muted)', margin: '3px 0 0' }}>Para procedimientos de tatuaje</p>
                </div>
                {[
                  { title: '1. DECLARACION', text: 'Declaro que soy mayor de edad y acepto de forma voluntaria el procedimiento de tatuaje propuesto por Panda Barber Studio. Comprendo que el proceso implica la insercion permanente de pigmento en la piel mediante agujas esterilizadas, y que conlleva riesgos inherentemente asociados.' },
                  { title: '2. RIESGOS ACEPTADOS', text: 'Acepto que los riesgos del procedimiento incluyen: infeccion en la zona del tatuaje, reacciones alergicas al pigmento o materiales utilizados, cicatrizacion anormal (queloide), irritacion cutanea prolongada, sangrado excesivo y posibles complicaciones relacionadas con la sensibilidad individual de la piel.' },
                  { title: '3. CUIDADOS POSTERIORES', text: 'Me comprometo a seguir rigurosamente las indicaciones de cuidado posterior proporcionadas por el artista de tatuaje, incluyendo la limpieza, hidratacion y proteccion de la zona tatuada durante el proceso de cicatrizacion.' },
                  { title: '4. USO DE IMAGEN', text: 'Autorizo de forma voluntaria a Panda Barber Studio a tomar fotografias y/o videos del procedimiento y del resultado final del tatuaje, para su uso exclusivo con fines promocionales en redes sociales, pagina web y plataformas digitales del estudio.' },
                  { title: '5. RESPONSABILIDAD', text: 'Declaro que no estoy bajo los efectos de alcohol, drogas o sustancias que puedan afectar mi juicio. Asumo plena responsabilidad sobre la decision de realizarme el tatuaje y libero a Panda Barber Studio de cualquier responsabilidad por complicaciones derivadas de mi incumplimiento de los cuidados posteriores.' },
                ].map((section, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', margin: '0 0 4px' }}>{section.title}</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, margin: 0 }}>{section.text}</p>
                  </div>
                ))}
              </div>

              {td && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 14 }}>
                  {td.size && <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '7px 10px' }}><span style={{ fontSize: 8, color: 'var(--text-muted)' }}>Tamano</span><p style={{ fontSize: 11, fontWeight: 700, color: 'white', margin: 0 }}>{td.size}</p></div>}
                  {td.zone && <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '7px 10px' }}><span style={{ fontSize: 8, color: 'var(--text-muted)' }}>Zona</span><p style={{ fontSize: 11, fontWeight: 700, color: 'white', margin: 0 }}>{td.zone}</p></div>}
                  {td.style && <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '7px 10px' }}><span style={{ fontSize: 8, color: 'var(--text-muted)' }}>Estilo</span><p style={{ fontSize: 11, fontWeight: 700, color: 'white', margin: 0 }}>{td.style}</p></div>}
                  {td.theme && <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '7px 10px' }}><span style={{ fontSize: 8, color: 'var(--text-muted)' }}>Tematica</span><p style={{ fontSize: 11, fontWeight: 700, color: 'white', margin: 0 }}>{td.theme}</p></div>}
                </div>
              )}

              {!td?.is_of_legal_age && (
                <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.12)', borderRadius: 8, padding: 10, marginBottom: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <AlertTriangle size={13} style={{ color: '#fbbf24' }} />
                  <span style={{ fontSize: 10, color: '#fbbf24' }}>Menor de edad. Requiere autorizacion de padre/tutor.</span>
                </div>
              )}

              {isViewOnly && td?.consent_signature && (
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12, border: '1px solid rgba(52,199,89,0.1)', marginBottom: 14 }}>
                  <p style={{ fontSize: 8, fontWeight: 800, color: '#34c759', letterSpacing: '1.5px', margin: '0 0 8px' }}>FIRMA DEL CLIENTE</p>
                  <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 8 }}>
                    <img src={td.consent_signature} alt="Firma" style={{ width: '100%', display: 'block', borderRadius: 4 }} />
                  </div>
                  {td.consent_client_name && (
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 8, textAlign: 'center', fontStyle: 'italic' }}>{td.consent_client_name}</p>
                  )}
                </div>
              )}

              {!isViewOnly && (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1.5px' }}>FIRMA AQUI</span>
                      <button onClick={clearCanvas} disabled={consentSaving} style={{
                        padding: '3px 10px', borderRadius: 'var(--radius-pill)',
                        fontSize: 10, fontWeight: 700, background: 'rgba(255,255,255,0.05)',
                        color: 'var(--text-muted)', border: 'none', cursor: consentSaving ? 'not-allowed' : 'pointer',
                      }}>Limpiar</button>
                    </div>
                    <div style={{ borderRadius: 10, overflow: 'hidden', border: '2px dashed rgba(203,183,154,0.2)', background: 'rgba(255,255,255,0.01)' }}>
                      <canvas ref={canvasRef} style={{ width: '100%', height: 120, touchAction: 'none', display: 'block', cursor: 'crosshair' }}
                        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
                    </div>
                    <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4, textAlign: 'center' }}>Dibuja tu firma con el dedo o mouse</p>
                  </div>
                  <button onClick={saveConsent} disabled={consentSaving} style={{
                    width: '100%', padding: '13px 0', borderRadius: 'var(--radius-pill)',
                    fontSize: 13, fontWeight: 800, fontFamily: 'General Sans',
                    background: consentSaving ? 'rgba(203,183,154,0.2)' : 'var(--gold-gradient)',
                    color: consentSaving ? 'rgba(255,255,255,0.4)' : '#000',
                    border: 'none', cursor: consentSaving ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                    <Check size={15} /> {consentSaving ? 'Guardando...' : 'Guardar Consentimiento'}
                  </button>
                </>
              )}

              {isViewOnly && (
                <button onClick={() => setSelectedConsent(null)} style={{
                  width: '100%', padding: '11px 0', borderRadius: 'var(--radius-pill)',
                  fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text-muted)', border: 'none', cursor: 'pointer',
                }}>Cerrar</button>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── RATING MODAL ── */}
      {ratingModal && (() => {
        const apt = ratingModal;
        const avgRating = (ratings.rapidez + ratings.limpieza + ratings.habilidad) / 3;
        return (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: 16,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          }}>
            <div className="glass-card" style={{
              width: '100%', maxWidth: 380, padding: '24px 20px',
              background: 'linear-gradient(135deg, rgba(20,20,20,0.97), rgba(10,10,10,0.99))',
              border: '1px solid rgba(203,183,154,0.15)', borderRadius: 20,
              animation: 'fadeInUp 0.3s ease',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'white', margin: 0, fontFamily: 'General Sans' }}>Calificar servicio</h3>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>{apt.services?.name} con {apt.staff?.name}</p>
                </div>
                <button onClick={() => setRatingModal(null)} style={{
                  background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%',
                  width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-muted)',
                }}><X size={16} /></button>
              </div>

              {/* Rating Categories */}
              <div style={{ marginBottom: 16 }}>
                <StarRating label="Rapidez" icon={Zap} value={ratings.rapidez} onChange={v => setRatings(p => ({ ...p, rapidez: v }))} />
                <StarRating label="Limpieza" icon={Shield} value={ratings.limpieza} onChange={v => setRatings(p => ({ ...p, limpieza: v }))} />
                <StarRating label="Habilidad" icon={Award} value={ratings.habilidad} onChange={v => setRatings(p => ({ ...p, habilidad: v }))} />
              </div>

              {/* Average */}
              {avgRating > 0 && (
                <div style={{ textAlign: 'center', marginBottom: 14, padding: '10px 0', background: 'rgba(203,183,154,0.06)', borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Star size={18} fill="#CBB79A" stroke="#CBB79A" />
                    <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--champagne)' }}>{avgRating.toFixed(1)}</span>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Promedio</span>
                </div>
              )}

              {/* Comment */}
              <textarea
                placeholder="Comentario opcional..."
                value={ratingComment}
                onChange={e => setRatingComment(e.target.value)}
                rows={2}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10, resize: 'none',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  color: 'white', fontSize: 12, fontFamily: 'General Sans', marginBottom: 14,
                }}
              />

              {/* Submit */}
              <button
                onClick={submitRating}
                disabled={ratingSaving || ratings.rapidez === 0 || ratings.limpieza === 0 || ratings.habilidad === 0}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 'var(--radius-pill)',
                  fontSize: 13, fontWeight: 800, fontFamily: 'General Sans',
                  background: (ratings.rapidez > 0 && ratings.limpieza > 0 && ratings.habilidad > 0) ? 'var(--gold-gradient)' : 'rgba(255,255,255,0.05)',
                  color: (ratings.rapidez > 0 && ratings.limpieza > 0 && ratings.habilidad > 0) ? '#000' : 'rgba(255,255,255,0.3)',
                  border: 'none', cursor: ratingSaving ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Check size={15} /> {ratingSaving ? 'Enviando...' : 'Enviar calificación'}
              </button>
            </div>
          </div>
        );
      })()}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 30px rgba(203,183,154,0.25), 0 0 60px rgba(203,183,154,0.1); }
          50% { box-shadow: 0 0 40px rgba(203,183,154,0.35), 0 0 80px rgba(203,183,154,0.15); }
        }
      `}</style>
    </div>
  );
}
