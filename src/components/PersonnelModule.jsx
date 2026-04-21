import React, { useState, useEffect } from 'react';
import { useNotifs } from '../context/NotificationContext';
import { 
  Scissors, 
  Trash2, 
  Edit2, 
  TrendingUp, 
  DollarSign, 
  UserPlus,
  Loader2,
  Droplets,
  Sparkles,
  Settings
} from 'lucide-react';
import { dataService } from '../services/dataService';

const PersonnelModule = ({ isMobile }) => {
  const { showToast } = useNotifs();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const data = await dataService.getStaff();
      setStaff(data);
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStaff = async (id, name) => {
    if (!window.confirm(`¿Estás seguro de eliminar a ${name}?`)) return;
    try {
      setLoading(true);
      await dataService.deleteStaff(id);
      await fetchStaff();
      showToast(`${name} ha sido eliminado del equipo.`);
    } catch (error) {
      showToast('Error al eliminar personal.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const [showAddForm, setShowAddForm] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', role: 'Barbero', commission_pct: 40, image_url: '' });

  const handleCreateStaff = async () => {
    if (!newStaff.name) return;
    try {
      setLoading(true);
      await dataService.addStaff(newStaff);
      setNewStaff({ name: '', role: 'Barbero', commission_pct: 40, image_url: '' });
      setShowAddForm(false);
      await fetchStaff();
      showToast(`¡${newStaff.name} se ha unido al equipo!`);
    } catch (e) {
      showToast('Error al crear registro de personal.', 'error');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '40px'
      }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-0.5px' }}>Nuestro <span className="text-gold">Equipo</span></h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Gestión de talento y desempeño.</p>
        </div>
        <button className="btn-gold" onClick={() => setShowAddForm(!showAddForm)}>
          <UserPlus size={18} style={{ marginRight: '8px' }} />
          {showAddForm ? 'Cancelar' : 'Contratar Artista'}
        </button>
      </div>

      {showAddForm && (
        <div className="glass-card animate-slide-up" style={{ marginBottom: '32px', padding: '24px' }}>
          <h3 style={{ marginBottom: '20px' }}>Nuevo integrante del equipo</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <input className="form-input" placeholder="Nombre" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} />
            <select className="form-input" value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})}>
              <option value="Barbero">Barbero</option>
              <option value="Estilista">Estilista</option>
              <option value="Asistente">Asistente</option>
            </select>
            <input className="form-input" type="number" placeholder="% Comisión" value={newStaff.commission_pct} onChange={e => setNewStaff({...newStaff, commission_pct: Number(e.target.value)})} />
            <input className="form-input" placeholder="URL Foto (opcional)" value={newStaff.image_url} onChange={e => setNewStaff({...newStaff, image_url: e.target.value})} />
            <button className="btn-gold" onClick={handleCreateStaff}>Guardar Registro</button>
          </div>
        </div>
      )}


      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader2 className="animate-spin" size={40} color="var(--gold-primary)" />
        </div>
      ) : staff.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '80px', borderStyle: 'dashed' }}>
          <Scissors size={48} color="var(--bg-tertiary)" style={{ marginBottom: '20px' }} />
          <p style={{ color: 'var(--text-muted)' }}>El equipo está vacío. ¡Comienza agregando a tu primer artista!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          {staff.map(person => (
            <div key={person.id} className="glass-card" style={{ 
              padding: '24px', 
              transition: 'var(--transition-fast)',
              border: '1px solid var(--border-color)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <div style={{ 
                    width: '64px', 
                    height: '64px', 
                    borderRadius: '18px', 
                    backgroundColor: 'var(--bg-tertiary)',
                    overflow: 'hidden',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    border: '1px solid var(--border-color)'
                  }}>
                    {person.image_url ? (
                      <img src={person.image_url} alt={person.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--gold-primary)' }}>
                        {person.name.substring(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '20px', fontWeight: '700' }}>{person.name}</h4>
                    <span style={{ color: 'var(--gold-primary)', fontSize: '13px', fontWeight: '600' }}>{person.role.toUpperCase()}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="action-btn" onClick={() => {
                    const newName = window.prompt('Nuevo nombre:', person.name);
                    const newRole = window.prompt('Nuevo rol (Barbero/Estilista/Asistente):', person.role);
                    const newComm = window.prompt('Nueva comisión (%):', person.commission_pct);
                    const newImg = window.prompt('Nueva URL de foto:', person.image_url || '');
                    
                    if (newName || newRole || newComm || newImg) {
                      const updates = {};
                      if (newName) updates.name = newName;
                      if (newRole) updates.role = newRole;
                      if (newComm) updates.commission_pct = Number(newComm);
                      if (newImg !== null) updates.image_url = newImg;

                      dataService.updateStaff(person.id, updates)
                        .then(() => {
                          fetchStaff();
                          showToast('Personal actualizado con éxito');
                        })
                        .catch(() => showToast('Error al actualizar', 'error'));
                    }
                  }}><Edit2 size={16} /></button>
                  <button className="action-btn" style={{ color: '#ff453a' }} onClick={() => handleDeleteStaff(person.id, person.name)}><Trash2 size={16} /></button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Comisión</div>
                  <div style={{ fontSize: '24px', fontWeight: '800' }}>{person.commission_pct}<span style={{ fontSize: '14px', color: 'var(--gold-primary)' }}>%</span></div>
                </div>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Estado</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#32d74b', marginTop: '8px' }}>Activo</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Global Commissions Section (Pro Design) */}
      <div className="glass-card animate-fade-in" style={{ 
        marginTop: '40px', 
        padding: isMobile ? '24px' : '32px',
        borderRadius: '28px',
        border: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <div style={{ 
            width: '44px', 
            height: '44px', 
            backgroundColor: 'rgba(212, 175, 55, 0.1)', 
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Settings size={22} color="var(--gold-primary)" />
          </div>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: '850', letterSpacing: '-0.3px' }}>Lógica de Comisiones</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Configuración automática por categoría.</p>
          </div>
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', 
          gap: '16px' 
        }}>
          <CommissionRule 
            label="Lavado de Cabello" 
            defaultPct={20} 
            role="Lavacabezas" 
            icon={<Droplets size={20} />} 
            isMobile={isMobile}
          />
          <CommissionRule 
            label="Corte / Barba" 
            defaultPct={40} 
            role="Barbero" 
            icon={<Scissors size={20} />} 
            isMobile={isMobile}
          />
          <CommissionRule 
            label="Estilismo / Tintes" 
            defaultPct={35} 
            role="Estilista" 
            icon={<Sparkles size={20} />} 
            isMobile={isMobile}
          />
        </div>
      </div>
    </div>
  );
};

const CommissionRule = ({ label, defaultPct, role, icon, isMobile }) => (
  <div style={{ 
    padding: '24px', 
    backgroundColor: 'rgba(255,255,255,0.02)', 
    borderRadius: '20px', 
    border: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: isMobile ? 'row' : 'column',
    alignItems: isMobile ? 'center' : 'flex-start',
    justifyContent: 'space-between',
    gap: isMobile ? '16px' : '24px',
    transition: 'all 0.3s ease'
  }}>
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <div style={{ 
        width: '48px', 
        height: '48px', 
        backgroundColor: 'var(--bg-tertiary)', 
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--gold-primary)',
        border: '1px solid var(--border-color)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontWeight: '800', fontSize: '16px', letterSpacing: '-0.2px' }}>{label}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: '2px' }}>{role}</div>
      </div>
    </div>

    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '10px',
      backgroundColor: 'var(--bg-tertiary)',
      padding: '10px 16px',
      borderRadius: '14px',
      border: '1px solid var(--border-color)',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <input 
        type="number" 
        defaultValue={defaultPct} 
        style={{ 
          width: '50px', 
          background: 'none',
          border: 'none', 
          color: 'var(--gold-primary)',
          fontSize: '22px',
          fontWeight: '900',
          textAlign: 'right',
          outline: 'none',
          padding: 0
        }} 
      />
      <span style={{ fontWeight: '900', color: 'var(--gold-primary)', fontSize: '15px' }}>%</span>
    </div>
  </div>
);

export default PersonnelModule;
