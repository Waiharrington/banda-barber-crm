import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Edit2, 
  Plus, 
  Trash2, 
  Check, 
  Shield, 
  Lock,
  Key,
  ChevronRight,
  Info
} from 'lucide-react';
import { useScrollLock } from '../hooks/useScrollLock';
import AnimatedModal from './AnimatedModal';

const RoleManagerModal = ({ isOpen, onClose, roles, onSaveRole, onDeleteRole, availableModules }) => {
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({ name: '', permissions: [] });

  useScrollLock(isOpen);

  const handleEditClick = (roleName, perms) => {
    setEditingRole(roleName);
    setFormData({ name: roleName, permissions: [...perms] });
  };

  const handleCreateClick = () => {
    setEditingRole('__NEW__');
    setFormData({ name: '', permissions: [] });
  };

  const togglePermission = (modId) => {
    const newPerms = formData.permissions.includes(modId)
      ? formData.permissions.filter(p => p !== modId)
      : [...formData.permissions, modId];
    setFormData({ ...formData, permissions: newPerms });
  };

  const handleSave = () => {
    if (!formData.name) return;
    onSaveRole(formData.name, formData.permissions, editingRole === '__NEW__' ? null : editingRole);
    setEditingRole(null);
  };

  return createPortal(
    <AnimatedModal isOpen={isOpen}>
      {(overlayClass, cardClass) => (
        <div className={overlayClass} style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div className={`glass-card ${cardClass}`} style={{
            width: '100%',
            maxWidth: '700px',
            maxHeight: '90vh',
            borderRadius: '32px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }}>
            {/* Header */}
            <div style={{
              padding: '24px 32px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={22} color="var(--gold-primary)" />
                </div>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>Gestión de Roles</h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Define accesos y permisos por cargo</p>
                </div>
              </div>
              <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }} className="astro-scrollbar">
              {!editingRole ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '1px' }}>ROLES ACTUALES</span>
                    <button 
                      onClick={handleCreateClick}
                      className="btn-gold" 
                      style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '12px' }}
                    >
                      <Plus size={16} style={{ marginRight: '6px' }} /> Nuevo Rol
                    </button>
                  </div>

                  {Object.entries(roles).map(([name, perms]) => (
                    <div key={name} className="glass-card" style={{ 
                      padding: '16px 20px', 
                      borderRadius: '16px', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      border: '1px solid rgba(255,255,255,0.05)',
                      backgroundColor: 'rgba(255,255,255,0.02)'
                    }}>
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>{name}</h3>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {perms.slice(0, 4).map(p => (
                            <span key={p} style={{ fontSize: '9px', backgroundColor: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-muted)' }}>
                              {availableModules.find(m => m.id === p)?.label || p}
                            </span>
                          ))}
                          {perms.length > 4 && <span style={{ fontSize: '9px', color: 'var(--gold-primary)' }}>+{perms.length - 4} más</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => handleEditClick(name, perms)}
                          style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', color: 'white' }}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => onDeleteRole(name)}
                          style={{ background: 'rgba(255,69,58,0.1)', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', color: '#ff453a' }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="animate-fade-in">
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>NOMBRE DEL ROL</label>
                    <input 
                      className="form-input" 
                      value={formData.name} 
                      onChange={e => setFormData({ ...formData, name: e.target.value })} 
                      placeholder="Ej. Especialista de Color"
                      style={{ width: '100%', height: '50px' }}
                    />
                  </div>

                  <div style={{ padding: '24px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                      <Key size={18} color="var(--gold-primary)" />
                      <label style={{ fontSize: '12px', fontWeight: '900', color: 'white', letterSpacing: '1px' }}>PERMISOS PREDETERMINADOS</label>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                      {availableModules.map(mod => (
                        <div 
                          key={mod.id} 
                          onClick={() => togglePermission(mod.id)}
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

                  <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                    <button 
                      onClick={() => setEditingRole(null)}
                      style={{ flex: 1, height: '50px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'transparent', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleSave}
                      className="btn-gold"
                      style={{ flex: 2, height: '50px', borderRadius: '12px', fontWeight: '800' }}
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer info */}
            <div style={{ padding: '16px 32px', backgroundColor: 'rgba(212,175,55,0.05)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Info size={16} color="var(--gold-primary)" />
              <p style={{ fontSize: '11px', color: 'var(--gold-primary)', margin: 0, fontWeight: '600' }}>
                Los cambios en los permisos se aplicarán a los nuevos miembros que se unan con este rol.
              </p>
            </div>
          </div>
        </div>
      )}
    </AnimatedModal>,
    document.body
  );
};

export default RoleManagerModal;
