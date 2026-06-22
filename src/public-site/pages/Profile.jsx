import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Calendar, Gift, LogOut, Clock, Pencil, X, Ticket, IdCard, Cake } from 'lucide-react';
import { publicService } from '../services/publicService';
import PrizeWheel from '../components/PrizeWheel';

export default function Profile() {
  const [activeTab, setActiveTab] = useState('citas');
  const [client, setClient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTopClient, setIsTopClient] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', id_card: '', birth_date: '' });
  const navigate = useNavigate();

  useEffect(() => {
    const clientData = JSON.parse(localStorage.getItem('panda_public_client') || 'null');
    if (!clientData) {
      navigate('/login');
      return;
    }
    setClient(clientData);
    setEditForm({
      name: clientData.name || '',
      phone: clientData.phone || '',
      id_card: clientData.id_card || '',
      birth_date: clientData.birth_date || ''
    });
    setHasSpun(localStorage.getItem(`panda_spun_${clientData.id}`) === 'true');
    loadData(clientData.id);
  }, [navigate]);

  const loadData = async (clientId) => {
    try {
      const [appts, userCoupons, topClients] = await Promise.all([
        publicService.getClientAppointments(clientId),
        publicService.getCoupons(clientId).catch(() => []),
        publicService.getTopClientsOfMonth().catch(() => [])
      ]);
      setAppointments(appts);
      setCoupons(userCoupons);
      const isTop = (topClients || []).length > 0 && topClients[0].id === clientId;
      setIsTopClient(isTop);
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

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const updated = await publicService.updateClientProfile(client.id, editForm);
      setClient(updated);
      localStorage.setItem('panda_public_client', JSON.stringify(updated));
      setShowEditModal(false);
      alert('Perfil actualizado con éxito');
    } catch (error) {
      console.error('Error al actualizar perfil', error);
      alert('Error al actualizar el perfil');
    }
  };

  const isBirthdayToday = () => {
    if (!client?.birth_date) return false;
    const today = new Date();
    // Parse birth_date accounting for timezone issues, we just need MM-DD
    const bDateParts = client.birth_date.split('-');
    if (bDateParts.length < 3) return false;
    const bMonth = parseInt(bDateParts[1], 10);
    const bDay = parseInt(bDateParts[2], 10);
    
    return today.getMonth() + 1 === bMonth && today.getDate() === bDay;
  };

  const canSpin = (isTopClient || isBirthdayToday()) && !hasSpun;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)' }}>Cargando perfil...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '60px 16px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {/* Profile Header */}
        <div className="glass-card" style={{ marginBottom: 20, position: 'relative' }}>
          <button 
            onClick={() => setShowEditModal(true)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', color: 'white' }}
          >
            <Pencil size={16} />
          </button>
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
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 4 }}>{client?.phone}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', fontSize: 12 }}>
                  <IdCard size={14} /> {client?.id_card || 'Sin Cédula'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', fontSize: 12 }}>
                  <Cake size={14} /> {client?.birth_date ? new Date(client.birth_date + 'T12:00:00Z').toLocaleDateString() : 'Sin Cumpleaños'}
                </div>
              </div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ marginTop: 16, width: '100%', background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.2)', padding: '10px', borderRadius: '8px', color: '#ff453a', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>

        {isBirthdayToday() && !hasSpun && (
          <div style={{ background: 'linear-gradient(45deg, #FF9A9E 0%, #FECFEF 99%, #FECFEF 100%)', borderRadius: '16px', padding: '16px', marginBottom: 20, textAlign: 'center', color: '#000', boxShadow: '0 4px 15px rgba(255, 154, 158, 0.4)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 4 }}>🎉 ¡Feliz Cumpleaños! 🎉</h3>
            <p style={{ fontSize: 13, fontWeight: 600 }}>Es tu día especial. ¡Gira la ruleta y gana tu regalo!</p>
          </div>
        )}

        {isTopClient && !hasSpun && !isBirthdayToday() && (
          <div style={{ background: 'linear-gradient(135deg, rgba(203, 183, 154, 0.2) 0%, rgba(203, 183, 154, 0.4) 100%)', borderRadius: '16px', padding: '16px', marginBottom: 20, textAlign: 'center', color: 'white', border: '1px solid var(--champagne)', boxShadow: '0 4px 20px rgba(203, 183, 154, 0.15)' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏆</div>
            <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 4, color: 'var(--gold-primary)' }}>¡Felicidades, eres el Cliente del Mes!</h3>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>Has sido nuestro cliente más fiel. ¡Juega la ruleta para saber cuál es tu premio!</p>
          </div>
        )}

        {canSpin && (
          <PrizeWheel 
            clientId={client?.id} 
            onWin={(prize) => {
              setHasSpun(true);
              localStorage.setItem(`panda_spun_${client?.id}`, 'true');
              loadData(client?.id); // Reload to fetch the new coupon
            }} 
          />
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[
            { id: 'citas', label: 'Mis Citas', icon: Calendar },
            { id: 'premios', label: 'Tus Premios Ganados', icon: Gift },
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
              <tab.icon size={15} />
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

        {/* Prizes / Coupons */}
        {activeTab === 'premios' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {coupons.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px', borderStyle: 'dashed' }}>
                <Ticket size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', opacity: 0.5 }} />
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Aún no tienes premios ganados.</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 8 }}>Te notificaremos cuando ganes algún premio o llegue tu cumpleaños.</p>
              </div>
            ) : (
              coupons.map((coupon, i) => (
                <div key={i} className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: coupon.status === 'USED' ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ background: coupon.status === 'UNUSED' ? 'rgba(203, 183, 154, 0.1)' : 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px' }}>
                      <Gift size={20} color={coupon.status === 'UNUSED' ? 'var(--gold-primary)' : 'var(--text-muted)'} />
                    </div>
                    <div>
                      <h3 style={{ fontWeight: 700, fontSize: 15, color: coupon.status === 'UNUSED' ? 'white' : 'var(--text-secondary)' }}>{coupon.prize_name}</h3>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Código: {coupon.id?.substring(0,8).toUpperCase()}</p>
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: 10,
                    fontWeight: 800,
                    background: coupon.status === 'UNUSED' ? 'rgba(0,255,0,0.1)' : 'rgba(255,255,255,0.1)',
                    color: coupon.status === 'UNUSED' ? 'var(--success-color)' : 'var(--text-muted)',
                  }}>
                    {coupon.status === 'UNUSED' ? 'DISPONIBLE' : 'CANJEADO'}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20, zIndex: 1000
        }}>
          <div className="glass-card animate-slide-up" style={{ width: '100%', maxWidth: 400, position: 'relative' }}>
            <button 
              onClick={() => setShowEditModal(false)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Editar Perfil</h2>
            
            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Nombre Completo</label>
                <input 
                  type="text" 
                  className="modern-input" 
                  value={editForm.name} 
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Teléfono</label>
                <input 
                  type="tel" 
                  className="modern-input" 
                  value={editForm.phone} 
                  onChange={e => setEditForm({...editForm, phone: e.target.value})}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Cédula</label>
                <input 
                  type="text" 
                  className="modern-input" 
                  value={editForm.id_card} 
                  onChange={e => setEditForm({...editForm, id_card: e.target.value})}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Fecha de Nacimiento</label>
                <input 
                  type="date" 
                  className="modern-input" 
                  value={editForm.birth_date} 
                  onChange={e => setEditForm({...editForm, birth_date: e.target.value})}
                  disabled={!!client?.birth_date} // Disable if it already has a value in DB
                  style={{ opacity: client?.birth_date ? 0.6 : 1, cursor: client?.birth_date ? 'not-allowed' : 'text' }}
                />
                {client?.birth_date && (
                  <p style={{ fontSize: 10, color: 'var(--gold-primary)', marginTop: 4 }}>
                    Tu fecha de nacimiento ya está registrada y no puede modificarse.
                  </p>
                )}
              </div>
              
              <button type="submit" className="btn-gold" style={{ width: '100%', padding: '14px', borderRadius: '12px', marginTop: 8, fontWeight: 'bold' }}>
                Guardar Cambios
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
