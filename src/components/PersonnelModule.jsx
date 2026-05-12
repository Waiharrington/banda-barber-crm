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
  Headset,
  Phone,
  MapPin,
  Key,
  Lock,
  Mail,
  MoreHorizontal,
  ChevronRight,
  Shield,
  Eye,
  EyeOff,
  Plus
} from 'lucide-react';
import { dataService } from '../services/dataService';
import AstroSelect from './AstroSelect';
import AstroCamera from './AstroCamera';
import StaffProfileModal from './StaffProfileModal';

import { useAuth } from '../context/AuthContext';
import RoleManagerModal from './RoleManagerModal';

const availableModules = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'scheduling', label: 'Agenda (Astro)' },
  { id: 'reception', label: 'Recepción (Padre)' },
  { id: 'checkout', label: 'Caja (Pro)' },
  { id: 'barber', label: 'Panel Barber (Hijo)' },
  { id: 'clients', label: 'Clientes' },
  { id: 'personnel', label: 'Personal' },
  { id: 'services', label: 'Servicios' },
  { id: 'inventory', label: 'Inventario' },
  { id: 'finance', label: 'Caja Chica' },
  { id: 'history', label: 'Historial' },
];

const rolePresets = {
  'Admin': availableModules.map(m => m.id),
  'Barbero': ['scheduling', 'barber', 'clients', 'history'],
  'Recepcionista': ['reception', 'scheduling', 'clients', 'history'],
  'Caja': ['checkout', 'finance', 'inventory', 'clients', 'history'],
  'Asistente de Lavado': ['dashboard', 'history']
};

const PersonnelModule = ({ isMobile, inventory = [] }) => {
  const { showToast } = useNotifs();
  const { user, refreshUser } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form & Editing State
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [profileModalData, setProfileModalData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    roles: ['Barbero'], 
    image_url: '',
    phone: '',
    address: '',
    username: '',
    password: '',
    permissions: rolePresets['Barbero'],
    washing_rate: 0
  });

  // Camera State
  const [showCamera, setShowCamera] = useState(false);

  // New Role State
  const [isCreatingNewRole, setIsCreatingNewRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  // Advanced Roles Management
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [customRolePresets, setCustomRolePresets] = useState(() => {
    const saved = localStorage.getItem('astro_custom_roles');
    return saved ? JSON.parse(saved) : {};
  });

  const allRolePresets = {
    ...rolePresets,
    ...customRolePresets
  };

  // Sync custom roles with roles found in staff members
  useEffect(() => {
    if (staff.length > 0) {
      const foundRoles = {};
      staff.forEach(s => {
        if (s.role?.includes('|')) {
          const [name, permsStr] = s.role.split('|');
          if (name && !allRolePresets[name]) {
            foundRoles[name] = permsStr.split(',');
          }
        }
      });
      
      if (Object.keys(foundRoles).length > 0) {
        const updated = { ...customRolePresets, ...foundRoles };
        setCustomRolePresets(updated);
        localStorage.setItem('astro_custom_roles', JSON.stringify(updated));
      }
    }
  }, [staff]);


  const [exchangeRate, setExchangeRate] = useState(58); // Default

  useEffect(() => {
    fetchStaff();
    loadRates();
  }, []);

  const loadRates = async () => {
    try {
      const rates = await dataService.getGlobalRates();
      if (rates.shop) {
        setExchangeRate(rates.shop);
      } else {
        const bcv = await dataService.getExchangeRates();
        setExchangeRate(bcv.usd || 58);
      }
    } catch (err) {
      console.error("Error loading rates:", err);
    }
  };

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
    let rolePart = person.role || 'Barbero';
    let perms = allRolePresets[rolePart] || [];
    let rolesArray = [rolePart];
    
    if (person.role?.includes('|')) {
      const [rPart, pPart] = person.role.split('|');
      rolesArray = rPart.split(', ');
      perms = pPart.split(',');
    }

    setFormData({
      name: person.name,
      roles: rolesArray,
      image_url: person.image_url || '',
      phone: person.phone || '',
      address: person.address || '',
      username: person.username || '',
      password: person.password || '',
      permissions: perms,
      washing_rate: person.washing_rate || 0
    });
    setEditingId(person.id);
    setIsEditing(true);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setIsEditing(false);
    setEditingId(null);
    setFormData({ 
      name: '', 
      role: 'Barbero', 
      image_url: '',
      phone: '',
      address: '',
      username: '',
      password: '',
      permissions: rolePresets['Barbero'],
      washing_rate: 0,
      roles: ['Barbero']
    });
    setIsCreatingNewRole(false);
    setNewRoleName('');
    setShowPassword(false);
  };

  const handleSaveCustomRole = (name, perms, oldName) => {
    const updated = { ...customRolePresets };
    
    // If we're renaming, remove the old one
    if (oldName && oldName !== name) {
      delete updated[oldName];
      // If the old one was a default role, we "hide" it by shadowing it with an empty entry or just letting the custom overwrite
      // Actually, if it was default, it will stay in rolePresets but be shadowed by 'updated' if it has the same name.
      // If the name changed, we should mark the default as 'hidden' if we wanted to remove it from the list.
    }
    
    updated[name] = perms;
    setCustomRolePresets(updated);
    localStorage.setItem('astro_custom_roles', JSON.stringify(updated));
    showToast(`Rol "${name}" guardado correctamente.`);
  };

  const handleDeleteCustomRole = (name) => {
    if (!window.confirm(`¿Estás seguro de eliminar el rol "${name}"? Los miembros actuales que tengan este rol mantendrán sus permisos individuales, pero el rol ya no podrá ser asignado a nuevos artistas.`)) return;
    
    const updated = { ...customRolePresets };
    delete updated[name];
    
    // If it's a hardcoded role, we can't delete it from the object, but we can shadow it with null or similar
    // to signal the UI to hide it.
    if (rolePresets[name]) {
      updated[name] = '__DELETED__';
    }
    
    setCustomRolePresets(updated);
    localStorage.setItem('astro_custom_roles', JSON.stringify(updated));
    showToast(`Rol "${name}" eliminado.`);
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      showToast('Por favor ingresa un nombre.', 'error');
      return;
    }
    try {
      setLoading(true);
      
      // Construct role string: Role1, Role2|perm1,perm2...
      const roleNames = isCreatingNewRole ? [...formData.roles, newRoleName] : formData.roles;
      if (roleNames.length === 0) {
        showToast('Por favor selecciona al menos un rol.', 'error');
        return;
      }
      const finalRole = `${roleNames.join(', ')}|${formData.permissions.join(',')}`;

      // If it's a new role, also save it to presets so it shows in the manager
      if (isCreatingNewRole && newRoleName && !allRolePresets[newRoleName]) {
        handleSaveCustomRole(newRoleName, formData.permissions);
      }

      const submissionData = {
        name: formData.name,
        role: finalRole,
        image_url: formData.image_url,
        phone: formData.phone,
        address: formData.address,
        username: formData.username,
        password: formData.password,
        commission_pct: 40,
        washing_rate: formData.washing_rate || 0
      };

      if (isEditing) {
        await dataService.updateStaff(editingId, submissionData);
        if (editingId === user?.id) {
          await refreshUser();
        }
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
    if (!window.confirm(`¿Estás seguro de archivar a ${name}? Ya no aparecerá en las listas activas pero su historial se mantendrá.`)) return;
    try {
      setLoading(true);
      await dataService.deleteStaff(id);
      await fetchStaff();
      showToast(`${name} ha sido archivado correctamente.`);
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
          <h2 style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '800', letterSpacing: '-0.5px' }}>Astro <span className="text-gold">Team</span></h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Gestión de talento y desempeño.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {!isMobile && (
            <button 
              className="btn-gold" 
              onClick={() => setIsRoleModalOpen(true)}
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <Shield size={18} style={{ marginRight: '8px' }} /> Roles
            </button>
          )}
          <button className="btn-gold" onClick={() => showForm ? handleCloseForm() : setShowForm(true)}>
            {showForm ? <X size={18} style={{ marginRight: '8px' }} /> : <UserPlus size={18} style={{ marginRight: '8px' }} />}
            {showForm ? 'Cancelar' : 'Nuevo miembro'}
          </button>
        </div>
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
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px' }}>
            {/* Photo Section */}
            <div style={{ position: 'relative', width: '120px' }}>
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

            {/* Fields Section */}
            <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Basic Info */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>NOMBRE COMPLETO</label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                    <input className="form-input" placeholder="Ej. Marco Silva" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                  </div>
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '1px' }}>ROLES EN EL EQUIPO</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {Object.entries(allRolePresets)
                      .filter(([_, v]) => v !== '__DELETED__')
                      .map(([r]) => (
                        <div 
                          key={r}
                          onClick={() => {
                            const isSelected = formData.roles.includes(r);
                            let newRoles = isSelected 
                              ? formData.roles.filter(x => x !== r)
                              : [...formData.roles, r];
                            
                            // If we click a new role, we add its permissions
                            let newPerms = [...formData.permissions];
                            if (!isSelected) {
                              const rolePerms = allRolePresets[r] || [];
                              newPerms = Array.from(new Set([...newPerms, ...rolePerms]));
                            }

                            setFormData({ ...formData, roles: newRoles, permissions: newPerms });
                          }}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            backgroundColor: formData.roles.includes(r) ? 'var(--gold-primary)' : 'rgba(255,255,255,0.05)',
                            color: formData.roles.includes(r) ? 'black' : 'white',
                            border: '1px solid rgba(255,255,255,0.1)',
                            transition: '0.2s'
                          }}
                        >
                          {r}
                        </div>
                      ))
                    }
                    <div 
                      onClick={() => setIsCreatingNewRole(true)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        backgroundColor: isCreatingNewRole ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.02)',
                        color: 'var(--gold-primary)',
                        border: '1px dashed var(--gold-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Plus size={14} /> NUEVO ROL
                    </div>
                  </div>
                  {isCreatingNewRole && (
                    <div className="animate-slide-left" style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '1px' }}>NOMBRE DEL NUEVO ROL</label>
                        <button 
                          onClick={() => { setIsCreatingNewRole(false); setNewRoleName(''); }}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '10px', cursor: 'pointer', fontWeight: '800' }}
                        >
                          DESCARTAR
                        </button>
                      </div>
                      <div style={{ position: 'relative' }}>
                        <Sparkles size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                        <input 
                          className="form-input" 
                          placeholder="Ej. Gerente de Piso" 
                          value={newRoleName} 
                          onChange={e => setNewRoleName(e.target.value)} 
                          style={{ width: '100%', height: '50px', paddingLeft: '48px', border: '1px solid var(--gold-primary)' }} 
                        />
                      </div>
                    </div>
                  )}
                </div>

                {formData.roles.includes('Asistente de Lavado') && (
                  <div className="form-group animate-slide-right">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '1px' }}>TARIFA POR LAVADO ($)</label>
                      {formData.washing_rate > 0 && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>
                          ≈ {(formData.washing_rate * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                        </span>
                      )}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <Droplets size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                      <input 
                        className="form-input" 
                        type="number" 
                        step="0.01" 
                        placeholder="Ej. 2.00" 
                        value={formData.washing_rate} 
                        onChange={e => setFormData({...formData, washing_rate: e.target.value})} 
                        style={{ width: '100%', height: '50px', paddingLeft: '48px', border: '1px solid rgba(212,175,55,0.3)' }} 
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Permissions Section */}
              <div style={{ padding: '24px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Key size={18} color="var(--gold-primary)" />
                  <label style={{ fontSize: '12px', fontWeight: '900', color: 'white', letterSpacing: '1px' }}>MÓDULOS ACCESIBLES</label>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '12px' }}>
                  {availableModules.map(mod => (
                    <div 
                      key={mod.id} 
                      onClick={() => {
                        const newPerms = formData.permissions.includes(mod.id)
                          ? formData.permissions.filter(p => p !== mod.id)
                          : [...formData.permissions, mod.id];
                        setFormData({ ...formData, permissions: newPerms });
                      }}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        padding: '12px', 
                        borderRadius: '12px', 
                        backgroundColor: formData.permissions.includes(mod.id) ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${formData.permissions.includes(mod.id) ? 'var(--gold-primary)' : 'rgba(255,255,255,0.05)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ 
                        width: '18px', 
                        height: '18px', 
                        borderRadius: '4px', 
                        border: '1px solid var(--gold-primary)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        backgroundColor: formData.permissions.includes(mod.id) ? 'var(--gold-primary)' : 'transparent'
                      }}>
                        {formData.permissions.includes(mod.id) && <Check size={14} color="black" strokeWidth={3} />}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: formData.permissions.includes(mod.id) ? 'white' : 'var(--text-secondary)' }}>{mod.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Info */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>TELÉFONO</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                    <input className="form-input" placeholder="+58 412..." value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                  </div>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>DIRECCIÓN DE HABITACIÓN</label>
                  <div style={{ position: 'relative' }}>
                    <MapPin size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                    <input className="form-input" placeholder="Av. Principal, Edif..." value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                  </div>
                </div>
              </div>

              {/* Login Credentials */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', padding: '20px', backgroundColor: 'rgba(212,175,55,0.03)', borderRadius: '16px', border: '1px solid rgba(212,175,55,0.1)' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '8px', letterSpacing: '1px' }}>USUARIO DE ACCESO</label>
                  <div style={{ position: 'relative' }}>
                    <Key size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                    <input className="form-input" placeholder="usuario.barbero" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px', border: '1px solid rgba(212,175,55,0.2)' }} />
                  </div>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '8px', letterSpacing: '1px' }}>CONTRASEÑA</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                    <input 
                      className="form-input" 
                      type={showPassword ? "text" : "password"} 
                      placeholder="••••••••" 
                      value={formData.password} 
                      onChange={e => setFormData({...formData, password: e.target.value})} 
                      style={{ width: '100%', height: '50px', paddingLeft: '48px', paddingRight: '48px', border: '1px solid rgba(212,175,55,0.2)' }} 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '16px',
                        top: '16px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--gold-primary)',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0.7,
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <button className="btn-gold" onClick={handleSubmit} style={{ height: '56px', width: '100%', borderRadius: '16px', fontSize: '16px', fontWeight: '800', marginTop: '10px' }}>
                <Check size={20} style={{ marginRight: '10px' }} />
                {isEditing ? 'Actualizar Perfil de Miembro' : 'Confirmar y unir al equipo'}
              </button>
            </div>
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
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Comienza agregando a los miembros que harán brillar tu marca.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* List Header */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr auto' : '80px 1.5fr 1fr 1.5fr 1fr auto', 
            gap: '20px', 
            padding: '0 24px',
            color: 'var(--text-muted)',
            fontSize: '11px',
            fontWeight: '900',
            letterSpacing: '1px',
            textTransform: 'uppercase'
          }}>
            {!isMobile && (
              <>
                <div>MIEMBRO</div>
                <div>NOMBRE / ROL</div>
                <div>TELÉFONO</div>
                <div>DIRECCIÓN</div>
                <div>ACCESO</div>
                <div style={{ textAlign: 'right' }}>ACCIONES</div>
              </>
            )}
          </div>

          {staff.map(person => (
            <div key={person.id} className="glass-card animate-slide-up" style={{ 
              padding: '16px 24px', 
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.05)',
              display: 'grid',
              gridTemplateColumns: isMobile ? 'auto 1fr auto' : '80px 1.5fr 1fr 1.5fr 1fr auto',
              alignItems: 'center',
              gap: '20px',
              transition: 'all 0.3s'
            }}>
              {/* Photo Column */}
              <div style={{ 
                width: '56px', 
                height: '56px', 
                borderRadius: '14px', 
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
                  <span style={{ fontSize: '20px', fontWeight: '900', color: 'var(--gold-primary)', opacity: 0.5 }}>
                    {person.name.substring(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              
              {/* Name/Role Column */}
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'white' }}>{person.name}</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--gold-primary)', fontSize: '11px', fontWeight: '700', marginTop: '2px' }}>
                  {getRoleIcon(person.role?.split('|')[0]?.split(', ')[0])}
                  {person.role?.split('|')[0]}
                  {person.role?.split('|')[0]?.includes(', ') && (
                    <span style={{ 
                      padding: '2px 6px', 
                      backgroundColor: 'rgba(212,175,55,0.1)', 
                      borderRadius: '4px', 
                      fontSize: '9px',
                      marginLeft: '4px',
                      border: '1px solid rgba(212,175,55,0.2)'
                    }}>
                      MULTI-ROL
                    </span>
                  )}
                </div>
              </div>

              {/* Phone Column */}
              {!isMobile && (
                <div style={{ color: person.phone ? 'var(--text-secondary)' : 'var(--text-muted)', fontSize: '14px' }}>
                  {person.phone ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Phone size={14} color="var(--gold-primary)" />
                      {person.phone}
                    </div>
                  ) : 'Sin teléfono'}
                </div>
              )}

              {/* Address Column */}
              {!isMobile && (
                <div style={{ color: person.address ? 'var(--text-secondary)' : 'var(--text-muted)', fontSize: '13px' }}>
                  {person.address ? (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <MapPin size={14} color="var(--gold-primary)" style={{ marginTop: '2px' }} />
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {person.address}
                      </span>
                    </div>
                  ) : 'Sin dirección'}
                </div>
              )}

              {/* Access Column */}
              {!isMobile && (
                <div>
                  {person.username ? (
                    <div style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      padding: '4px 10px', 
                      backgroundColor: 'rgba(50, 215, 75, 0.08)', 
                      color: '#32d74b', 
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: '800'
                    }}>
                      <Key size={12} />
                      {person.username}
                    </div>
                  ) : (
                    <div style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      padding: '4px 10px', 
                      backgroundColor: 'rgba(255, 69, 58, 0.08)', 
                      color: '#ff453a', 
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: '800'
                    }}>
                      <Lock size={12} />
                      SIN ACCESO
                    </div>
                  )}
                </div>
              )}

              {/* Actions Column */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button className="action-btn" onClick={() => setProfileModalData(person)} title="Ver Perfil" style={{ color: 'var(--gold-primary)', backgroundColor: 'rgba(212,175,55,0.1)' }}>
                  <User size={18} />
                </button>
                <button className="action-btn" onClick={() => handleEditClick(person)} title="Editar Miembro">
                  <Edit2 size={18} />
                </button>
                <button className="action-btn" onClick={() => handleDeleteStaff(person.id, person.name)} style={{ color: '#ff453a', backgroundColor: 'rgba(255,69,58,0.05)' }} title="Dar de baja">
                  <Trash2 size={18} />
                </button>
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

      <StaffProfileModal 
        isOpen={!!profileModalData}
        onClose={() => setProfileModalData(null)}
        staffMember={profileModalData}
        inventory={inventory}
        onUpdate={fetchStaff}
      />

      <RoleManagerModal 
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        roles={Object.fromEntries(Object.entries(allRolePresets).filter(([_, v]) => v !== '__DELETED__'))}
        onSaveRole={handleSaveCustomRole}
        onDeleteRole={handleDeleteCustomRole}
        availableModules={availableModules}
      />
    </div>
  );
};

export default PersonnelModule;
