import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Calendar, Gift, Star, LogOut, Clock, Heart, ChevronRight } from 'lucide-react';
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
      selectedCategory: barber.role?.includes('Tatuador') ? 'Tatuajes' : 'Barbería',
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
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: 'var(--gold-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
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
            onWin={(prize) => {
              setHasSpun(true);
              localStorage.setItem(`panda_spun_${client?.id}`, 'true');
            }} 
          />
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[
            { id: 'citas', label: 'Mis Citas', icon: Calendar },
            { id: 'premios', label: 'Premios', icon: Gift },
            { id: 'favoritos', label: 'Favoritos', icon: Heart },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 0',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                fontSize: 14,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === tab.id ? 'var(--gold-gradient)' : 'var(--bg-tertiary)',
                color: activeTab === tab.id ? '#000' : 'var(--text-muted)',
                transition: 'all 0.2s',
              }}
            >
              <tab.icon size={15} fill={activeTab === tab.id && tab.id === 'favoritos' ? '#000' : 'none'} />
              {tab.label}
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
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: 12,
                      fontWeight: 700,
                      background: apt.status === 'Agendado' ? 'rgba(203, 183, 154, 0.15)' : apt.status === 'Completado' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                      color: apt.status === 'Agendado' ? 'var(--champagne)' : apt.status === 'Completado' ? '#22c55e' : '#fbbf24',
                    }}>
                      {apt.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Prizes */}
        {activeTab === 'premios' && (
          <div>
            <div style={{
              background: 'var(--gold-gradient)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              marginBottom: 20,
              color: '#000',
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
                      padding: '8px 20px',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: 13,
                      fontWeight: 700,
                      border: prize.available ? 'none' : '1px solid var(--border-color)',
                      background: prize.available ? undefined : 'var(--bg-tertiary)',
                      color: prize.available ? undefined : 'var(--text-muted)',
                      cursor: prize.available ? 'pointer' : 'not-allowed',
                      opacity: prize.available ? 1 : 0.5,
                    }}
                  >
                    {prize.available ? 'Canjear' : `${prize.points - points} más`}
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
                <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 600 }}>Aún no tienes artistas favoritos</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>Agrégalos desde la pantalla de reservas.</p>
              </div>
            ) : (
              favBarbers.map((barber) => {
                const isTattooist = barber.role?.toLowerCase().includes('tatuador');
                return (
                  <div key={barber.id} className="glass-card animate-scale-in" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    {/* Avatar */}
                    <div style={{
                      width: 52,
                      height: 52,
                      borderRadius: '16px',
                      overflow: 'hidden',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      border: '1.5px solid rgba(255,255,255,0.08)',
                      flexShrink: 0
                    }}>
                      {barber.image_url ? (
                        <img src={barber.image_url} alt={barber.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)' }}>
                          <User size={20} color="var(--text-muted)" />
                        </div>
                      )}
                    </div>

                    {/* Barber Details */}
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontWeight: 800, fontSize: 15, color: 'white' }}>{barber.name}</h3>
                      <span style={{
                        fontSize: 9,
                        fontWeight: 900,
                        backgroundColor: isTattooist ? 'rgba(168,85,247,0.12)' : 'rgba(212,188,154,0.12)',
                        color: isTattooist ? '#c084fc' : 'var(--champagne)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        display: 'inline-block',
                        marginTop: 4
                      }}>
                        {isTattooist ? 'Tatuador' : 'Barbero'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button 
                        onClick={() => removeFavorite(barber.id)}
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: '#ff453a',
                          padding: '10px',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s'
                        }}
                        title="Eliminar de favoritos"
                      >
                        <Heart size={16} fill="#ff453a" stroke="#ff453a" />
                      </button>
                      
                      <button 
                        onClick={() => handleReserveFav(barber)}
                        className="btn-gold"
                        style={{
                          padding: '10px 16px',
                          borderRadius: '12px',
                          fontSize: 12,
                          fontWeight: 800,
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
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
    </div>
  );
}
