import React, { useState, useEffect } from 'react';
import { useNotifs } from '../context/NotificationContext';
import { 
  Scissors, 
  Trash2, 
  Edit2, 
  UserPlus,
  Loader2,
  Droplets,
  Sparkles,
  Settings,
  Camera,
  X,
  User,
  Check,
  CreditCard,
  Headset
} from 'lucide-react';
import { dataService } from '../services/dataService';
import AstroSelect from './AstroSelect';
import AstroCamera from './AstroCamera';

const PersonnelModule = ({ isMobile }) => {
  const { showToast } = useNotifs();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form & Editing State
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    role: 'Barbero', 
    image_url: '' 
  });

  // Camera State
  const [showCamera, setShowCamera] = useState(false);

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
      showToast('Error al cargar personal.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (person) => {
    setFormData({
      name: person.name,
      role: person.role,
      image_url: person.image_url || ''
    });
    setEditingId(person.id);
    setIsEditing(true);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setIsEditing(false);
    setEditingId(null);
    setFormData({ name: '', role: 'Barbero', image_url: '' });
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      showToast('Por favor ingresa un nombre.', 'error');
      return;
    }
    try {
      setLoading(true);
      const submissionData = {
        name: formData.name,
        role: formData.role,
        image_url: formData.image_url,
        commission_pct: 40 // Valor por defecto para compatibilidad
      };

      if (isEditing) {
        await dataService.updateStaff(editingId, submissionData);
        showToast('Perfil actualizado correctamente.');
      } else {
        await dataService.addStaff(submissionData);
        showToast(`¡${formData.name} se ha unido al equipo!`);
      }
      handleCloseForm();
      await fetchStaff();
    } catch (e) {
      console.error('Error saving staff:', e);
      showToast(e.message || 'Error al guardar registro.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStaff = async (id, name) => {
    if (!window.confirm(`¿Estás seguro de eliminar a ${name}? Esta acción es irreversible.`)) return;
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

  const getRoleIcon = (role) => {
    switch(role) {
      case 'Barbero': return <Scissors size={18} />;
      case 'Recepcionista': return <Headset size={18} />;
      case 'Caja': return <CreditCard size={18} />;
      case 'Asistente de Lavado': return <Droplets size={18} />;
      default: return <User size={18} />;
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '40px'
      }}>
        <div>
          <h2 style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '800', letterSpacing: '-0.5px' }}>Nuestro <span className="text-gold">Equipo</span></h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Gestión de talento y desempeño.</p>
        </div>
        <button className="btn-gold" onClick={() => showForm ? handleCloseForm() : setShowForm(true)}>
          {showForm ? <X size={18} style={{ marginRight: '8px' }} /> : <UserPlus size={18} style={{ marginRight: '8px' }} />}
          {showForm ? 'Cancelar' : 'Contratar Artista'}
        </button>
      </div>

      {showForm && (
        <div className="glass-card animate-slide-up" style={{ 
          marginBottom: '32px', 
          padding: '32px', 
          borderRadius: '28px', 
          position: 'relative', 
          zIndex: 999,
          overflow: 'visible' 
        }}>
          <h3 style={{ marginBottom: '24px', fontSize: '22px', fontWeight: '800' }}>
            {isEditing ? `Editando Perfil: ${formData.name}` : 'Nuevo integrante del equipo'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr 1fr', gap: '24px', alignItems: 'end' }}>
            
            {/* Photo Section */}
            <div style={{ position: 'relative', width: '120px', margin: isMobile ? '0 auto 16px' : '0' }}>
              <div 
                onClick={() => setShowCamera(true)}
                style={{ 
                  width: '120px', 
                  height: '120px', 
                  backgroundColor: 'rgba(255,255,255,0.05)', 
                  borderRadius: '24px', 
                  border: '2px dashed var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  transition: 'all 0.3s'
                }}
              >
                {formData.image_url ? (
                  <img src={formData.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <Camera size={32} color="var(--text-muted)" />
                    <div style={{ fontSize: '10px', marginTop: '4px', color: 'var(--text-muted)', fontWeight: '800' }}>FOTO</div>
                  </div>
                )}
              </div>
              {formData.image_url && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, image_url: '' }); }}
                  style={{ position: 'absolute', top: '-10px', right: '-10px', backgroundColor: '#ff453a', border: 'none', borderRadius: '50%', color: 'white', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 10 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Inputs Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>NOMBRE COMPLETO</label>
                <input className="form-input" placeholder="Ej. Marco Silva" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', height: '50px' }} />
              </div>
              <AstroSelect 
                label="ROL EN EL EQUIPO"
                value={formData.role}
                onChange={val => setFormData({...formData, role: val})}
                options={[
                  { label: 'Barbero', value: 'Barbero' },
                  { label: 'Recepcionista', value: 'Recepcionista' },
                  { label: 'Caja', value: 'Caja' },
                  { label: 'Asistente de Lavado', value: 'Asistente de Lavado' }
                ]}
              />
            </div>

            {/* Actions */}
            <button className="btn-gold" onClick={handleSubmit} style={{ height: '50px', width: '100%', borderRadius: '14px', fontSize: '15px', fontWeight: '800' }}>
              {isEditing ? 'Guardar Cambios' : 'Confirmar Contratación'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader2 className="animate-spin" size={48} color="var(--gold-primary)" />
        </div>
      ) : staff.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '80px', borderRadius: '32px' }}>
          <User size={64} color="rgba(212, 175, 55, 0.1)" style={{ marginBottom: '24px' }} />
          <h3 style={{ fontSize: '20px', color: 'var(--text-primary)' }}>El equipo está esperando</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Comienza agregando a los artistas que harán brillar tu marca.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          {staff.map(person => (
            <div key={person.id} className="glass-card animate-scale-in" style={{ 
              padding: '24px', 
              borderRadius: '24px',
              border: '1px solid rgba(255,255,255,0.05)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div style={{ 
                  width: '80px', 
                  height: '80px', 
                  borderRadius: '20px', 
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  overflow: 'hidden',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}>
                  {person.image_url ? (
                    <img src={person.image_url} alt={person.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '28px', fontWeight: '900', color: 'var(--gold-primary)', opacity: 0.5 }}>
                      {person.name.substring(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '20px', fontWeight: '850', color: 'white', marginBottom: '4px' }}>{person.name}</h4>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    color: 'var(--gold-primary)', 
                    fontSize: '11px', 
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    backgroundColor: 'rgba(212, 175, 55, 0.08)',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    width: 'fit-content'
                  }}>
                    {getRoleIcon(person.role)}
                    {person.role}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button className="action-btn" onClick={() => handleEditClick(person)} style={{ width: '38px', height: '38px' }}>
                    <Edit2 size={18} />
                  </button>
                  <button className="action-btn" onClick={() => handleDeleteStaff(person.id, person.name)} style={{ width: '38px', height: '38px', color: '#ff453a', backgroundColor: 'rgba(255,69,58,0.1)' }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div style={{ 
                marginTop: '20px', 
                paddingTop: '16px', 
                borderTop: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '800' }}>ESTADO</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#32d74b', fontSize: '12px', fontWeight: '900', marginTop: '2px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#32d74b' }} />
                      ACTIVO
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>ID: {person.id.substring(0, 8)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCamera && (
        <AstroCamera 
          onClose={() => setShowCamera(false)}
          onCapture={(image) => {
            setFormData({ ...formData, image_url: image });
            setShowCamera(false);
          }}
        />
      )}
    </div>
  );
};

export default PersonnelModule;
