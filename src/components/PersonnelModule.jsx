import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNotifs } from '../context/NotificationContext';
import { supabase } from '../lib/supabase';
import { 
  Scissors, 
  Trash2, 
  Edit2, 
  UserPlus,
  Loader2,
  Droplets,
  Rocket,
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
  Plus,
  Cake,
  BarChart2,
  Star,
  FileText
} from 'lucide-react';
import { dataService } from '../services/dataService';
import PandaSelect from './PandaSelect';
import PandaCamera from './PandaCamera';
import StaffProfileModal from './StaffProfileModal';
import PandaDatePicker from './PandaDatePicker';
import { formatName } from '../utils/stringUtils';

import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import RoleManagerModal from './RoleManagerModal';
import AnimatedModal from './AnimatedModal';

const availableModules = [
  { id: 'my-profile', label: 'Mi Perfil' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'scheduling', label: 'Agenda (Panda)' },
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
  'Barbero': ['my-profile', 'scheduling', 'barber', 'clients', 'history'],
  'Recepcionista': ['reception', 'scheduling', 'clients', 'history'],
  'Caja': ['checkout', 'finance', 'inventory', 'clients', 'history'],
  'Asistente de Lavado': ['dashboard', 'history']
};

const PersonnelModule = ({ isMobile, inventory = [] }) => {
  const { showToast } = useNotifs();
  const { user, refreshUser } = useAuth();
  const { confirm } = useDialog();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('management'); // 'management' | 'attendance'
  const [turnQueue, setTurnQueue] = useState([]);
  const [reportsData, setReportsData] = useState({});
  const [loadingReports, setLoadingReports] = useState(false);

  // Form & Editing State
  const [showForm, setShowForm] = useState(false);
  const [isFormExiting, setIsFormExiting] = useState(false);
  const [profileModalData, setProfileModalData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    roles: ['Barbero'], 
    image_url: '',
    phone: '',
    address: '',
    email: '',
    username: '',
    permissions: rolePresets['Barbero'],
    washing_rate: 0,
    birth_date: '',
    password: '',
    specialty: '',
    badge: '',
    biography: ''
  });

  // Camera State
  const [showCamera, setShowCamera] = useState(false);

  // Portfolio state
  const [portfolio, setPortfolio] = useState([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioUploading, setPortfolioUploading] = useState(false);
  const MAX_PORTFOLIO = 5;

  // New Role State
  const [isCreatingNewRole, setIsCreatingNewRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  // Advanced Roles Management
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [customRolePresets, setCustomRolePresets] = useState(() => {
    const saved = localStorage.getItem('panda_custom_roles');
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
        localStorage.setItem('panda_custom_roles', JSON.stringify(updated));
      }
    }
  }, [staff]);


  const [exchangeRate, setExchangeRate] = useState(58); // Default

  useEffect(() => {
    fetchStaff();
    loadRates();
  }, []);

  // Load portfolio when editing (max 5)
  const loadPortfolio = async (staffId) => {
    if (!staffId) return;
    setPortfolioLoading(true);
    try {
      const { data } = await supabase
        .from('staff_portfolio')
        .select('*')
        .eq('staff_id', staffId)
        .order('created_at', { ascending: false })
        .limit(5);
      setPortfolio(data || []);
    } catch (e) {
      console.error('Portfolio load error:', e);
    } finally {
      setPortfolioLoading(false);
    }
  };

  // Compress image before uploading
  const compressImage = (file, maxWidth = 800, quality = 0.7) => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        URL.revokeObjectURL(url);
        canvas.toBlob(
          (blob) => {
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.src = url;
    });
  };

  const addPortfolioPhoto = async (staffId, file) => {
    if (!file || !staffId) return;
    if (portfolio.length >= MAX_PORTFOLIO) {
      showToast(`Máximo ${MAX_PORTFOLIO} fotos por portafolio.`, 'error');
      return;
    }
    setPortfolioUploading(true);
    try {
      showToast('Comprimiendo imagen...');
      const compressedFile = await compressImage(file, 800, 0.7);

      const path = `${staffId}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('portfolio')
        .upload(path, compressedFile, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('portfolio').getPublicUrl(path);
      const { data, error: dbError } = await supabase
        .from('staff_portfolio')
        .insert([{ staff_id: staffId, image_url: publicUrl, storage_path: path }])
        .select()
        .single();
      if (dbError) throw dbError;
      setPortfolio(prev => [data, ...prev]);
      showToast('Foto agregada al portafolio.');
    } catch (e) {
      console.error('Portfolio upload error:', e);
      showToast('Error al subir la foto. Intenta de nuevo.', 'error');
    } finally {
      setPortfolioUploading(false);
    }
  };

  const removePortfolioPhoto = async (photo) => {
    try {
      // Delete from Storage if we have the path
      if (photo.storage_path) {
        await supabase.storage.from('portfolio').remove([photo.storage_path]);
      }
      await supabase.from('staff_portfolio').delete().eq('id', photo.id);
      setPortfolio(prev => prev.filter(p => p.id !== photo.id));
      showToast('Foto eliminada.');
    } catch (e) {
      console.error('Portfolio remove error:', e);
    }
  };

  const loadRates = async () => {
    try {
      const ratesData = await dataService.getExchangeRates();
      if (ratesData) {
        const activeType = localStorage.getItem('panda_active_rate') || 'euro';
        setExchangeRate(activeType === 'euro' ? (ratesData.euro || 42.0) : (ratesData.bcv || 36.5));
      }
    } catch (err) {
      console.error("Error loading rates:", err);
    }
  };

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const [data, queue] = await Promise.all([
        dataService.getStaff(),
        dataService.getTurnQueue().catch(() => [])
      ]);
      setStaff(data);
      setTurnQueue(queue || []);
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
      email: person.email || '',
      username: person.username || '',
      permissions: perms,
      washing_rate: person.washing_rate || 0,
      birth_date: person.birth_date || '',
      password: '',
      specialty: person.specialty || '',
      badge: person.badge || '',
      biography: person.biography || ''
    });
    setEditingId(person.id);
    loadPortfolio(person.id);
    setIsEditing(true);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setIsFormExiting(true);
    setTimeout(() => {
      setShowForm(false);
      setIsEditing(false);
      setEditingId(null);
      setIsFormExiting(false);
      setFormData({ 
        name: '', 
        role: 'Barbero', 
        image_url: '',
        phone: '',
        address: '',
        email: '',
        username: '',
        permissions: rolePresets['Barbero'],
        washing_rate: 0,
        roles: ['Barbero'],
        birth_date: '',
        password: '',
        specialty: '',
        badge: '',
        biography: ''
      });
      setIsCreatingNewRole(false);
      setNewRoleName('');
    }, 250);
  };

  const handleSaveCustomRole = async (name, perms, oldName) => {
    try {
      setLoading(true);
      const updated = { ...customRolePresets };
      
      // If we're renaming, remove or shadow the old one
      if (oldName && oldName !== name) {
        if (rolePresets[oldName]) {
          updated[oldName] = '__DELETED__';
        } else {
          delete updated[oldName];
        }
        
        // Find staff members with the old role and update them in Supabase
        let shouldRefreshUser = false;
        const updates = staff.map(async (s) => {
          if (!s.role) return;
          const parts = s.role.split('|');
          const roleNames = parts[0].split(', ');
          if (roleNames.includes(oldName)) {
            const updatedRoleNames = roleNames.map(r => r === oldName ? name : r).join(', ');
            const newRole = parts.length > 1 ? `${updatedRoleNames}|${parts[1]}` : updatedRoleNames;
            
            if (s.id === user?.id) {
              shouldRefreshUser = true;
            }
            return dataService.updateStaff(s.id, { role: newRole });
          }
        }).filter(Boolean);
        
        if (updates.length > 0) {
          await Promise.all(updates);
          if (shouldRefreshUser) {
            await refreshUser();
          }
        }
      }
      
      updated[name] = perms;
      setCustomRolePresets(updated);
      localStorage.setItem('panda_custom_roles', JSON.stringify(updated));
      showToast(`Rol "${name}" guardado correctamente.`);
      await fetchStaff();
    } catch (err) {
      console.error("Error updating staff roles:", err);
      showToast("Error al actualizar miembros con el nuevo rol.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomRole = async (name) => {
    if (!await confirm(`¿Estás seguro de eliminar el rol "${name}"? Los miembros actuales que tengan este rol mantendrán sus permisos individuales, pero el rol ya no podrá ser asignado a nuevos artistas.`)) return;
    
    const updated = { ...customRolePresets };
    delete updated[name];
    
    // If it's a hardcoded role, we can't delete it from the object, but we can shadow it with null or similar
    // to signal the UI to hide it.
    if (rolePresets[name]) {
      updated[name] = '__DELETED__';
    }
    
    setCustomRolePresets(updated);
    localStorage.setItem('panda_custom_roles', JSON.stringify(updated));
    showToast(`Rol "${name}" eliminado.`);
  };

   const handleSubmit = async () => {
    if (!formData.name) {
      showToast('Por favor ingresa un nombre.', 'error');
      return;
    }
    if (!formData.email) {
      showToast('Por favor ingresa el email de acceso.', 'error');
      return;
    }
    if (!isEditing && !formData.password) {
      showToast('Por favor ingresa la contraseña para el nuevo miembro.', 'error');
      return;
    }
    if (formData.password && formData.password.length < 6) {
      showToast('La contraseña debe tener al menos 6 caracteres.', 'error');
      return;
    }
    try {
      setLoading(true);
      
      // Construct role string (Single selection format): Role|perm1,perm2...
      const roleNames = isCreatingNewRole ? [newRoleName] : formData.roles;
      if (roleNames.length === 0 || !roleNames[0]) {
        showToast('Por favor selecciona un rol.', 'error');
        return;
      }
      const finalRole = `${roleNames[0]}|${formData.permissions.join(',')}`;

      // If it's a new role, also save it to presets so it shows in the manager
      if (isCreatingNewRole && newRoleName && !allRolePresets[newRoleName]) {
        await handleSaveCustomRole(newRoleName, formData.permissions);
      }

      const submissionData = {
        name: formData.name,
        role: finalRole,
        image_url: formData.image_url,
        phone: formData.phone,
        address: formData.address,
        email: formData.email ? formData.email.trim().toLowerCase() : null,
        username: formData.username || formData.email?.split('@')[0] || '',
        commission_pct: 40,
        washing_rate: formData.washing_rate || 0,
        birth_date: formData.birth_date || null,
        specialty: formData.specialty || '',
        badge: formData.badge || '',
        biography: formData.biography || ''
      };

      if (isEditing) {
        const personObj = staff.find(s => s.id === editingId);
        if (personObj && personObj.auth_user_id && formData.password) {
          await dataService.updateAuthUserPassword(personObj.auth_user_id, formData.password);
        } else if (personObj && !personObj.auth_user_id && formData.email && formData.password) {
          const authUser = await dataService.createAuthUser(formData.email, formData.password);
          submissionData.auth_user_id = authUser.id;
        }
        await dataService.updateStaff(editingId, submissionData);
        if (editingId === user?.id) {
          await refreshUser();
        }
        showToast('Perfil actualizado correctamente.');
      } else {
        // Check if email already exists in staff (including archived)
        if (formData.email) {
          const trimmedEmail = formData.email.trim().toLowerCase();
          
          // Check staff table
          const { data: existingStaff } = await supabase
            .from('staff')
            .select('id, name, role')
            .ilike('email', trimmedEmail)
            .maybeSingle();
          if (existingStaff) {
            if (existingStaff.role?.startsWith('ARCHIVED|')) {
              showToast(`El email ${formData.email} pertenece a un usuario archivado (${existingStaff.name}). Elimínalo primero desde Supabase.`, 'error');
            } else {
              showToast(`El email ${formData.email} ya está registrado para ${existingStaff.name}.`, 'error');
            }
            setLoading(false);
            return;
          }
        }
        if (formData.email && formData.password) {
          try {
            const authUser = await dataService.createAuthUser(formData.email, formData.password);
            submissionData.auth_user_id = authUser.id;
          } catch (authError) {
            if (authError.message?.includes('already') || authError.message?.includes('exist')) {
              showToast(`El email ${formData.email} ya tiene una cuenta de acceso. Elimínala desde Supabase → Authentication → Users.`, 'error');
            } else {
              showToast(`Error al crear cuenta de acceso: ${authError.message}`, 'error');
            }
            setLoading(false);
            return;
          }
        }
        try {
          // Check if a trigger already created the staff record (common in Supabase)
          if (submissionData.auth_user_id) {
            const { data: existingByAuth } = await supabase
              .from('staff')
              .select('id')
              .eq('auth_user_id', submissionData.auth_user_id)
              .maybeSingle();
            if (existingByAuth) {
              // Trigger already created it — update instead of insert
              await dataService.updateStaff(existingByAuth.id, submissionData);
            } else {
              await dataService.addStaff(submissionData);
            }
          } else {
            await dataService.addStaff(submissionData);
          }
        } catch (staffError) {
          if (submissionData.auth_user_id) {
            try { await dataService.deleteAuthUser(submissionData.auth_user_id); } catch (_) {}
          }
          throw staffError;
        }
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
    if (!await confirm(`¿Estás seguro de archivar a ${name}? Ya no aparecerá en las listas activas pero su historial se mantendrá.`)) return;
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
    const iconStyle = { flexShrink: 0 };
    switch(role) {
      case 'Barbero': return <Scissors size={16} style={iconStyle} />;
      case 'Recepcionista': return <Headset size={16} style={iconStyle} />;
      case 'Caja': return <CreditCard size={16} style={iconStyle} />;
      case 'Asistente de Lavado': return <Droplets size={16} style={iconStyle} />;
      default: return <User size={16} style={iconStyle} />;
    }
  };

  const handleCheckIn = async (staffId) => {
    try {
      setLoading(true);
      await dataService.checkInBarber(staffId);
      showToast('Llegada registrada con éxito');
      await fetchStaff();
    } catch (e) {
      console.error(e);
      showToast('Error al registrar llegada', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async (staffId) => {
    try {
      setLoading(true);
      await dataService.checkOutBarber(staffId);
      showToast('Salida registrada con éxito');
      await fetchStaff();
    } catch (e) {
      console.error(e);
      showToast('Error al registrar salida', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      setLoadingReports(true);
      
      const [apptsRes, reviewsRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('staff_id, services(duration)')
          .eq('status', 'Completado'),
        supabase
          .from('staff_reviews')
          .select('staff_id, rating')
      ]);

      if (apptsRes.error) throw apptsRes.error;
      if (reviewsRes.error) throw reviewsRes.error;

      const appts = apptsRes.data || [];
      const reviews = reviewsRes.data || [];

      const stats = {};
      staff.forEach(member => {
        const memberAppts = appts.filter(a => a.staff_id === member.id);
        const totalDuration = memberAppts.reduce((acc, a) => acc + (a.services?.duration || 30), 0);
        const avgDuration = memberAppts.length > 0 ? Math.round(totalDuration / memberAppts.length) : 0;
        
        const memberReviews = reviews.filter(r => r.staff_id === member.id);
        const avgRating = memberReviews.length > 0 
          ? (memberReviews.reduce((acc, r) => acc + r.rating, 0) / memberReviews.length).toFixed(1)
          : 'N/A';

        const isInQueue = turnQueue.some(q => q.staff_id === member.id && q.status !== 'ABSENT');
        const checkedInHours = isInQueue ? 6.5 : 0;
        const totalHours = ((memberAppts.length * 45) / 60) + checkedInHours;

        stats[member.id] = {
          avgDuration: avgDuration || 35,
          totalHours: totalHours > 0 ? totalHours.toFixed(1) : (memberAppts.length > 0 ? (memberAppts.length * 0.8).toFixed(1) : '0.0'),
          avgRating,
          reviewsCount: memberReviews.length
        };
      });

      setReportsData(stats);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports();
    }
  }, [activeTab, staff, turnQueue]);

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <div>
          <h2 style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '800', letterSpacing: '-0.5px' }}>Panda <span className="text-gold">Team</span></h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Gestión de talento y desempeño.</p>
        </div>
        {activeTab === 'management' && (
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
            <button className="btn-gold" onClick={() => {
              if (showForm) {
                handleCloseForm();
              } else {
                setFormData({ 
                  name: '', 
                  roles: ['Barbero'], 
                  image_url: '',
                  phone: '',
                  address: '',
                  email: '',
                  username: '',
                  permissions: rolePresets['Barbero'],
                  washing_rate: 0,
                  birth_date: '',
                  password: ''
                });
                setShowForm(true);
              }
            }}>
              {showForm ? <X size={18} style={{ marginRight: '8px' }} /> : <UserPlus size={18} style={{ marginRight: '8px' }} />}
              {showForm ? 'Cancelar' : 'Nuevo miembro'}
            </button>
          </div>
        )}
      </div>

      {/* Sub-navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '32px',
        background: 'rgba(255, 255, 255, 0.02)',
        padding: '6px',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        width: 'fit-content'
      }}>
        <button
          onClick={() => { setActiveTab('management'); handleCloseForm(); }}
          style={{
            padding: '10px 20px',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === 'management' ? 'var(--gold-primary)' : 'transparent',
            color: activeTab === 'management' ? 'black' : 'white',
            fontWeight: '800',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <User size={16} /> Gestión de Personal
        </button>
        <button
          onClick={() => { setActiveTab('attendance'); handleCloseForm(); }}
          style={{
            padding: '10px 20px',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === 'attendance' ? 'var(--gold-primary)' : 'transparent',
            color: activeTab === 'attendance' ? 'black' : 'white',
            fontWeight: '800',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Check size={16} /> Control de Asistencia
        </button>
        <button
          onClick={() => { setActiveTab('reports'); handleCloseForm(); }}
          style={{
            padding: '10px 20px',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === 'reports' ? 'var(--gold-primary)' : 'transparent',
            color: activeTab === 'reports' ? 'black' : 'white',
            fontWeight: '800',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <BarChart2 size={16} /> Reportes de Desempeño
        </button>
      </div>

      {activeTab === 'management' && (
        <>
          {(showForm || isFormExiting) && !isEditing && (
        <div className={`glass-card ${isFormExiting ? 'animate-slide-down-fade' : 'animate-slide-up'}`} style={{ 
          marginBottom: '32px', 
          padding: '32px', 
          borderRadius: '28px', 
          position: 'relative', 
          zIndex: 999,
          overflow: 'visible' 
        }}>
          <h3 style={{ marginBottom: '24px', fontSize: '22px', fontWeight: '800' }}>
            Nuevo integrante del equipo
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

            {/* Portfolio Section - solo visible al editar */}
            {isEditing && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '1px' }}>PORTAFOLIO DE TRABAJOS</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>{portfolio.length}/{MAX_PORTFOLIO}</span>
                </div>
                {portfolioLoading ? (
                  <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)', fontSize: '12px' }}>Cargando...</div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {portfolio.map(photo => (
                      <div key={photo.id} style={{ position: 'relative', width: '72px', height: '72px' }}>
                        <img src={photo.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }} />
                        <button
                          type="button"
                          onClick={() => removePortfolioPhoto(photo)}
                          style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', background: '#ff453a', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '900', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
                        >×</button>
                      </div>
                    ))}
                    {portfolio.length < MAX_PORTFOLIO && (
                      <label style={{ width: '72px', height: '72px', borderRadius: '10px', border: '2px dashed rgba(255,255,255,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: portfolioUploading ? 'not-allowed' : 'pointer', background: 'rgba(255,255,255,0.03)', gap: '4px', opacity: portfolioUploading ? 0.5 : 1 }}>
                        {portfolioUploading
                          ? <Loader2 size={20} color="var(--gold-primary)" style={{ animation: 'spin 1s linear infinite' }} />
                          : <><Plus size={20} color="var(--gold-primary)" /><span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800' }}>SUBIR</span></>
                        }
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          disabled={portfolioUploading}
                          onChange={e => { const f = e.target.files?.[0]; if (f) { addPortfolioPhoto(editingId, f); e.target.value = ''; } }}
                        />
                      </label>
                    )}
                    {portfolio.length === 0 && !portfolioUploading && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}>Sube hasta 5 fotos de tus trabajos</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Fields Section */}
            <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Basic Info */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>NOMBRE COMPLETO</label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                    <input className="form-input" placeholder="Ej. Marco Silva" value={formData.name} onChange={e => setFormData({...formData, name: formatName(e.target.value)})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                  </div>
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '1px' }}>ROL EN EL EQUIPO</label>
                  
                  <PandaSelect 
                    options={[
                      ...Object.entries(allRolePresets)
                        .filter(([_, v]) => v !== '__DELETED__')
                        .map(([r]) => ({ value: r, label: r })),
                      // Dynamic legacy multiple role support so old profiles don't break
                      ...(formData.roles.length > 0 && !allRolePresets[formData.roles.join(', ')] ? [{ value: formData.roles.join(', '), label: formData.roles.join(', ') }] : []),
                      { value: '__NEW_ROLE__', label: '+ CREAR NUEVO ROL...' }
                    ]}
                    value={isCreatingNewRole ? '__NEW_ROLE__' : formData.roles.join(', ')}
                    onChange={(val) => {
                      if (val === '__NEW_ROLE__') {
                        setIsCreatingNewRole(true);
                        setFormData({ ...formData, roles: [] });
                      } else {
                        setIsCreatingNewRole(false);
                        setNewRoleName('');
                        const selectedRoles = val.split(', ');
                        let newPerms = [];
                        if (selectedRoles.length === 1) {
                          newPerms = allRolePresets[selectedRoles[0]] || [];
                        } else {
                          selectedRoles.forEach(r => {
                            const rolePerms = allRolePresets[r] || [];
                            newPerms = Array.from(new Set([...newPerms, ...rolePerms]));
                          });
                        }
                        setFormData({ ...formData, roles: selectedRoles, permissions: newPerms });
                      }
                    }}
                    placeholder="Selecciona un rol..."
                  />

                  {isCreatingNewRole && (
                    <div className="animate-slide-left" style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '1px' }}>NOMBRE DEL NUEVO ROL</label>
                        <button 
                          onClick={() => { 
                            setIsCreatingNewRole(false); 
                            setNewRoleName(''); 
                            setFormData({ ...formData, roles: ['Barbero'], permissions: allRolePresets['Barbero'] || [] });
                          }}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '10px', cursor: 'pointer', fontWeight: '800' }}
                        >
                          DESCARTAR
                        </button>
                      </div>
                      <div style={{ position: 'relative' }}>
                        <Rocket size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
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
                      <label style={{ fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '1px' }}>TARIFA POR LAVADO (€)</label>
                      {formData.washing_rate > 0 && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>
                          ≈ {(formData.washing_rate * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
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
                        style={{ width: '100%', height: '50px', paddingLeft: '48px', border: '1px solid rgba(255, 255, 255,0.3)' }} 
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
                        backgroundColor: formData.permissions.includes(mod.id) ? 'rgba(255, 255, 255,0.1)' : 'rgba(255,255,255,0.03)',
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

              {/* Contact & Birthday Info */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 2fr', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>TELÉFONO</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                    <input className="form-input" placeholder="+58 412..." value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                  </div>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>CUMPLEAÑOS</label>
                  <div style={{ position: 'relative' }}>
                    <Cake size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                    <input type="date" className="form-input" value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
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

              {/* Specialty & Badge Info */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>¿EN QUÉ SE ESPECIALIZA? (PUESTO / ENFOQUE)</label>
                  <div style={{ position: 'relative' }}>
                    <Scissors size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                    <input className="form-input" placeholder="Ej. Especialista en degradados y barba" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                  </div>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>PALABRA CLAVE DE RECONOCIMIENTO (Ej. TOP, EXPERTO, ESTRELLA)</label>
                  <div style={{ position: 'relative' }}>
                    <Star size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                    <input className="form-input" placeholder="Ej. TOP FADE o EXPERTO" value={formData.badge} onChange={e => setFormData({...formData, badge: e.target.value.toUpperCase()})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                  </div>
                </div>
              </div>

              {/* Biography Info */}
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>SOBRE MÍ (DESCRIPCIÓN DE TU ESTILO O TRAYECTORIA)</label>
                <div style={{ position: 'relative' }}>
                  <FileText size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                  <textarea 
                    className="form-input" 
                    placeholder="Ej. Especialista en fades y cortes modernos. Me enfoco en resaltar tu estilo y personalidad con cada detalle." 
                    value={formData.biography} 
                    onChange={e => setFormData({...formData, biography: e.target.value})} 
                    style={{ width: '100%', minHeight: '90px', padding: '12px 12px 12px 48px', resize: 'vertical' }} 
                  />
                </div>
              </div>

              {/* Login Credentials */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '16px', padding: '20px', backgroundColor: 'rgba(255, 255, 255,0.03)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255,0.1)' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '8px', letterSpacing: '1px' }}>EMAIL DE ACCESO</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                    <input className="form-input" type="email" placeholder="persona@pandabarber.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px', border: '1px solid rgba(255, 255, 255,0.2)' }} />
                  </div>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '8px', letterSpacing: '1px' }}>CONTRASEÑA</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                    <input 
                      className="form-input" 
                      type="password" 
                      placeholder="Mínimo 6 caracteres" 
                      value={formData.password} 
                      onChange={e => setFormData({...formData, password: e.target.value})} 
                      autoComplete="new-password"
                      style={{ width: '100%', height: '50px', paddingLeft: '48px', border: '1px solid rgba(255, 255, 255,0.2)' }} 
                    />
                  </div>
                </div>
              </div>

              <button className="btn-gold" onClick={handleSubmit} style={{ height: '56px', width: '100%', borderRadius: '16px', fontSize: '16px', fontWeight: '800', marginTop: '10px' }}>
                <Check size={20} style={{ marginRight: '10px' }} />
                Confirmar y unir al equipo
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
          <User size={64} color="rgba(255, 255, 255, 0.1)" style={{ marginBottom: '24px' }} />
          <h3 style={{ fontSize: '20px', color: 'var(--text-primary)' }}>El equipo está esperando</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Comienza agregando a los miembros que harán brillar tu marca.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr auto' : '80px 1.5fr 1fr 1.5fr 1.2fr 140px', 
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
            <React.Fragment key={person.id}>
              {isMobile ? (
                <div className="glass-card animate-slide-up" style={{ 
                  padding: '16px', 
                  borderRadius: '20px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  transition: 'all 0.3s'
                }}>
                  {/* Top section: Photo + Name/Role + Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      {/* Photo */}
                      <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '12px', 
                        backgroundColor: 'rgba(255,255,255,0.02)',
                        overflow: 'hidden',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        border: '1px solid rgba(255,255,255,0.08)',
                        flexShrink: 0
                      }}>
                        {person.image_url ? (
                          <img src={person.image_url} alt={person.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '18px', fontWeight: '900', color: 'var(--gold-primary)', opacity: 0.5 }}>
                            {person.name.substring(0, 1).toUpperCase()}
                          </span>
                        )}
                      </div>
                      
                      {/* Name and Role */}
                      <div style={{ minWidth: 0 }}>
                        <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.name}</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--gold-primary)', fontSize: '11px', fontWeight: '700', marginTop: '2px' }}>
                          {getRoleIcon(person.role?.split('|')[0]?.split(', ')[0])}
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.role?.split('|')[0]}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button className="action-btn" onClick={() => setProfileModalData(person)} title="Ver Perfil" style={{ color: 'var(--gold-primary)', backgroundColor: 'rgba(255, 255, 255,0.1)', width: '34px', height: '34px', borderRadius: '8px' }}>
                        <User size={15} />
                      </button>
                      <button className="action-btn" onClick={() => handleEditClick(person)} title="Editar Miembro" style={{ width: '34px', height: '34px', borderRadius: '8px' }}>
                        <Edit2 size={15} />
                      </button>
                      <button className="action-btn" onClick={() => handleDeleteStaff(person.id, person.name)} style={{ color: '#ff453a', backgroundColor: 'rgba(255,69,58,0.05)', width: '34px', height: '34px', borderRadius: '8px' }} title="Dar de baja">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Divider line */}
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', width: '100%' }} />

                  {/* Details Section */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                    {/* Phone */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: person.phone ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                      <Phone size={13} color={person.phone ? "var(--gold-primary)" : "rgba(255,255,255,0.2)"} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{person.phone || 'Sin teléfono'}</span>
                    </div>

                    {/* Address */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: person.address ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                      <MapPin size={13} color={person.address ? "var(--gold-primary)" : "rgba(255,255,255,0.2)"} style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {person.address || 'Sin dirección'}
                      </span>
                    </div>

                    {/* Access */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Mail size={13} color={person.email ? '#32d74b' : '#ff453a'} style={{ flexShrink: 0 }} />
                      {person.email ? (
                        <span style={{ color: '#32d74b', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{person.email}</span>
                      ) : (
                        <span style={{ color: '#ff453a', fontWeight: '700' }}>Sin email de acceso</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-card animate-slide-up" style={{ 
                  padding: '16px 24px', 
                  borderRadius: '20px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  display: 'grid',
                  gridTemplateColumns: '80px 1.5fr 1fr 1.5fr 1.2fr 140px',
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
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.name}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--gold-primary)', fontSize: '11px', fontWeight: '700', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {getRoleIcon(person.role?.split('|')[0]?.split(', ')[0])}
                      <span>{person.role?.split('|')[0]}</span>
                      {person.role?.split('|')[0]?.includes(', ') && (
                        <span style={{ 
                          padding: '2px 6px', 
                          backgroundColor: 'rgba(255, 255, 255,0.1)', 
                          borderRadius: '4px', 
                          fontSize: '9px',
                          marginLeft: '4px',
                          border: '1px solid rgba(255, 255, 255,0.2)',
                          flexShrink: 0
                        }}>
                          MULTI-ROL
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Phone Column */}
                  <div style={{ color: person.phone ? 'var(--text-secondary)' : 'var(--text-muted)', fontSize: '14px', minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Phone size={14} color={person.phone ? "var(--gold-primary)" : "rgba(255,255,255,0.2)"} style={{ flexShrink: 0 }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.phone || 'Sin teléfono'}</span>
                    </div>
                    {person.birth_date && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '11px', color: 'var(--gold-primary)' }}>
                        <Cake size={12} fill="var(--gold-primary)" style={{ flexShrink: 0 }} />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{new Date(person.birth_date + 'T00:00:00').toLocaleDateString([], { day: '2-digit', month: 'short' })}</span>
                      </div>
                    )}
                  </div>

                  {/* Address Column */}
                  <div style={{ color: person.address ? 'var(--text-secondary)' : 'var(--text-muted)', fontSize: '13px', minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <MapPin size={14} color={person.address ? "var(--gold-primary)" : "rgba(255,255,255,0.2)"} style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {person.address || 'Sin dirección'}
                      </span>
                    </div>
                  </div>

                  {/* Access Column */}
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    {person.email ? (
                      <div style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        padding: '4px 10px', 
                        backgroundColor: 'rgba(50, 215, 75, 0.08)', 
                        color: '#32d74b', 
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '800',
                        maxWidth: '100%'
                      }}>
                        <Mail size={12} style={{ flexShrink: 0 }} />
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{person.email}</span>
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
                        fontWeight: '800',
                        maxWidth: '100%'
                      }}>
                        <Lock size={12} style={{ flexShrink: 0 }} />
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>SIN EMAIL AUTH</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="action-btn" onClick={() => setProfileModalData(person)} title="Ver Perfil" style={{ color: 'var(--gold-primary)', backgroundColor: 'rgba(255, 255, 255,0.1)' }}>
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
              )}

              {/* Inline Edit Form directly under the card being edited */}
              {(showForm || isFormExiting) && isEditing && editingId === person.id && (
                <div className={`glass-card ${isFormExiting ? 'animate-slide-down-fade' : 'animate-slide-up'}`} style={{ 
                  marginTop: '-8px',
                  marginBottom: '24px', 
                  marginLeft: isMobile ? '0' : '20px',
                  padding: '32px', 
                  borderRadius: '28px', 
                  position: 'relative', 
                  zIndex: 998,
                  overflow: 'visible',
                  border: '1px solid rgba(255, 255, 255,0.3)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>
                      Editar Perfil de <span className="text-gold">{formData.name}</span>
                    </h3>
                    <button 
                      onClick={handleCloseForm}
                      style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', color: 'white', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  
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

                    {/* Portfolio Section */}
                    <div style={{ width: '100%', marginTop: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '1px' }}>PORTAFOLIO DE TRABAJOS</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>{portfolio.length}/{MAX_PORTFOLIO}</span>
                      </div>
                      {portfolioLoading ? (
                        <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)', fontSize: '12px' }}>Cargando...</div>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                          {portfolio.map(photo => (
                            <div key={photo.id} style={{ position: 'relative', width: '72px', height: '72px' }}>
                              <img src={photo.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }} />
                              <button
                                type="button"
                                onClick={() => removePortfolioPhoto(photo)}
                                style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', background: '#ff453a', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '900', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
                              >×</button>
                            </div>
                          ))}
                          {portfolio.length < MAX_PORTFOLIO && (
                            <label style={{ width: '72px', height: '72px', borderRadius: '10px', border: '2px dashed rgba(255,255,255,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: portfolioUploading ? 'not-allowed' : 'pointer', background: 'rgba(255,255,255,0.03)', gap: '4px', opacity: portfolioUploading ? 0.5 : 1 }}>
                              {portfolioUploading
                                ? <Loader2 size={20} color="var(--gold-primary)" style={{ animation: 'spin 1s linear infinite' }} />
                                : <><Plus size={20} color="var(--gold-primary)" /><span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800' }}>SUBIR</span></>
                              }
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                disabled={portfolioUploading}
                                onChange={e => { const f = e.target.files?.[0]; if (f) { addPortfolioPhoto(editingId, f); e.target.value = ''; } }}
                              />
                            </label>
                          )}
                          {portfolio.length === 0 && !portfolioUploading && (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}>Sube hasta 5 fotos de tus trabajos</span>
                          )}
                        </div>
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
                            <input className="form-input" placeholder="Ej. Marco Silva" value={formData.name} onChange={e => setFormData({...formData, name: formatName(e.target.value)})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                          </div>
                        </div>
                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '1px' }}>ROL EN EL EQUIPO</label>
                          
                          <PandaSelect 
                            options={[
                              ...Object.entries(allRolePresets)
                                .filter(([_, v]) => v !== '__DELETED__')
                                .map(([r]) => ({ value: r, label: r })),
                              // Dynamic legacy multiple role support so old profiles don't break
                              ...(formData.roles.length > 0 && !allRolePresets[formData.roles.join(', ')] ? [{ value: formData.roles.join(', '), label: formData.roles.join(', ') }] : []),
                              { value: '__NEW_ROLE__', label: '+ CREAR NUEVO ROL...' }
                            ]}
                            value={isCreatingNewRole ? '__NEW_ROLE__' : formData.roles.join(', ')}
                            onChange={(val) => {
                              if (val === '__NEW_ROLE__') {
                                setIsCreatingNewRole(true);
                                setFormData({ ...formData, roles: [] });
                              } else {
                                setIsCreatingNewRole(false);
                                setNewRoleName('');
                                const selectedRoles = val.split(', ');
                                let newPerms = [];
                                if (selectedRoles.length === 1) {
                                  newPerms = allRolePresets[selectedRoles[0]] || [];
                                } else {
                                  selectedRoles.forEach(r => {
                                    const rolePerms = allRolePresets[r] || [];
                                    newPerms = Array.from(new Set([...newPerms, ...rolePerms]));
                                  });
                                }
                                setFormData({ ...formData, roles: selectedRoles, permissions: newPerms });
                              }
                            }}
                            placeholder="Selecciona un rol..."
                          />

                          {isCreatingNewRole && (
                            <div className="animate-slide-left" style={{ marginTop: '12px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '1px' }}>NOMBRE DEL NUEVO ROL</label>
                                <button 
                                  onClick={() => { 
                                    setIsCreatingNewRole(false); 
                                    setNewRoleName(''); 
                                    setFormData({ ...formData, roles: ['Barbero'], permissions: allRolePresets['Barbero'] || [] });
                                  }}
                                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '10px', cursor: 'pointer', fontWeight: '800' }}
                                >
                                  DESCARTAR
                                </button>
                              </div>
                              <div style={{ position: 'relative' }}>
                                <Rocket size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
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
                              <label style={{ fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '1px' }}>TARIFA POR LAVADO (€)</label>
                              {formData.washing_rate > 0 && (
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>
                                  ≈ {(formData.washing_rate * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
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
                                style={{ width: '100%', height: '50px', paddingLeft: '48px', border: '1px solid rgba(255, 255, 255,0.3)' }} 
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
                                backgroundColor: formData.permissions.includes(mod.id) ? 'rgba(255, 255, 255,0.1)' : 'rgba(255,255,255,0.03)',
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

                      {/* Contact & Birthday Info */}
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 2fr', gap: '16px' }}>
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>TELÉFONO</label>
                          <div style={{ position: 'relative' }}>
                            <Phone size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                            <input className="form-input" placeholder="+58 412..." value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                          </div>
                        </div>
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>CUMPLEAÑOS</label>
                          <div style={{ position: 'relative' }}>
                            <Cake size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                            <input type="date" className="form-input" value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
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

                      {/* Specialty & Badge Info */}
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>¿EN QUÉ SE ESPECIALIZA? (PUESTO / ENFOQUE)</label>
                          <div style={{ position: 'relative' }}>
                            <Scissors size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                            <input className="form-input" placeholder="Ej. Especialista en degradados y barba" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                          </div>
                        </div>
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>PALABRA CLAVE DE RECONOCIMIENTO (Ej. TOP, EXPERTO, ESTRELLA)</label>
                          <div style={{ position: 'relative' }}>
                            <Star size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                            <input className="form-input" placeholder="Ej. TOP FADE o EXPERTO" value={formData.badge} onChange={e => setFormData({...formData, badge: e.target.value.toUpperCase()})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                          </div>
                        </div>
                      </div>

                      {/* Biography Info */}
                      <div className="form-group" style={{ marginTop: '16px', marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>SOBRE MÍ (DESCRIPCIÓN DE TU ESTILO O TRAYECTORIA)</label>
                        <div style={{ position: 'relative' }}>
                          <FileText size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                          <textarea 
                            className="form-input" 
                            placeholder="Ej. Especialista en fades y cortes modernos. Me enfoco en resaltar tu estilo y personalidad con cada detalle." 
                            value={formData.biography} 
                            onChange={e => setFormData({...formData, biography: e.target.value})} 
                            style={{ width: '100%', minHeight: '90px', padding: '12px 12px 12px 48px', resize: 'vertical' }} 
                          />
                        </div>
                      </div>

                      {/* Login Credentials */}
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '16px', padding: '20px', backgroundColor: 'rgba(255, 255, 255,0.03)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255,0.1)' }}>
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '8px', letterSpacing: '1px' }}>EMAIL DE ACCESO</label>
                          <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                            <input className="form-input" type="email" placeholder="persona@pandabarber.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px', border: '1px solid rgba(255, 255, 255,0.2)' }} />
                          </div>
                        </div>
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '8px', letterSpacing: '1px' }}>NUEVA CONTRASEÑA</label>
                          <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                            <input 
                              className="form-input" 
                              type="password" 
                              placeholder="Vacío para no cambiar" 
                              value={formData.password} 
                              onChange={e => setFormData({...formData, password: e.target.value})} 
                              autoComplete="new-password"
                              style={{ width: '100%', height: '50px', paddingLeft: '48px', border: '1px solid rgba(255, 255, 255,0.2)' }} 
                            />
                          </div>
                        </div>
                      </div>

                      <button className="btn-gold" onClick={handleSubmit} style={{ height: '56px', width: '100%', borderRadius: '16px', fontSize: '16px', fontWeight: '800', marginTop: '10px' }}>
                        <Check size={20} style={{ marginRight: '10px' }} />
                        Actualizar Perfil de Miembro
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
        </>
      )}

      {activeTab === 'attendance' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: 'white' }}>Barbería Hoy</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              Registra la llegada de los barberos y asistentes para que aparezcan en la recepción. El orden de llegada determina el orden en la cola de turnos.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {staff
              .filter(member => {
                const roleName = (member.role?.split('|')[0] || 'Barbero').toLowerCase();
                return !roleName.includes('admin') && 
                       !roleName.includes('recepcionista') && 
                       !roleName.includes('caja');
              })
              .map(member => {
                const queueEntry = turnQueue.find(q => q.staff_id === member.id);
                const isCheckedIn = queueEntry && queueEntry.status !== 'ABSENT';
                const queueIndex = turnQueue.filter(q => q.status !== 'ABSENT').findIndex(q => q.staff_id === member.id);

                return (
                  <div 
                    key={member.id} 
                    className="glass-card" 
                    style={{ 
                      padding: '24px', 
                      borderRadius: '24px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      gap: '16px',
                      border: isCheckedIn ? '1px solid rgba(50, 215, 75, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                      background: isCheckedIn ? 'rgba(50, 215, 75, 0.02)' : 'rgba(255,255,255,0.01)',
                      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  >
                    <div style={{ 
                      width: '80px', 
                      height: '80px', 
                      borderRadius: '20px', 
                      overflow: 'hidden',
                      border: '2px solid ' + (isCheckedIn ? '#32d74b' : 'rgba(255,255,255,0.1)'),
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {member.image_url ? (
                        <img src={member.image_url} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '28px', fontWeight: '900', color: 'var(--gold-primary)', opacity: 0.6 }}>
                          {member.name.substring(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'white', margin: 0 }}>{member.name}</h4>
                      <p style={{ fontSize: '12px', color: 'var(--gold-primary)', fontWeight: '700', marginTop: '4px' }}>
                        {member.role?.split('|')[0]}
                      </p>
                    </div>

                    <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.05)' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div>
                        {isCheckedIn ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '12px', color: '#32d74b', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#32d74b' }} />
                              En barbería {queueEntry?.updated_at ? `(${new Date(queueEntry.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })})` : ''}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--text-muted)' }} />
                            Ausente
                          </span>
                        )}
                      </div>

                      {isCheckedIn ? (
                        <button
                          onClick={() => handleCheckOut(member.id)}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '10px',
                            background: 'rgba(255, 69, 58, 0.1)',
                            border: 'none',
                            color: '#ff453a',
                            fontWeight: '800',
                            fontSize: '11px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 69, 58, 0.2)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 69, 58, 0.1)'}
                        >
                          Registrar Salida
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCheckIn(member.id)}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '10px',
                            background: 'var(--gold-primary)',
                            border: 'none',
                            color: 'black',
                            fontWeight: '900',
                            fontSize: '11px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        >
                          Registrar Llegada
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: 'white' }}>Rendimiento del Equipo</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              Métricas clave de productividad, velocidad de atención, opiniones de clientes y turnos saltados (clientes perdidos).
            </p>
          </div>

          {loadingReports ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <Loader2 className="animate-spin" size={32} color="var(--gold-primary)" />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {staff
                .filter(member => {
                  const roleName = (member.role?.split('|')[0] || 'Barbero').toLowerCase();
                  return !roleName.includes('admin') && 
                         !roleName.includes('recepcionista') && 
                         !roleName.includes('caja');
                })
                .map(member => {
                  const stats = reportsData[member.id] || { avgDuration: 35, totalHours: '0.0', avgRating: 'N/A', reviewsCount: 0 };
                  const skipped = member.skipped_count || 0;

                  return (
                    <div 
                      key={member.id} 
                      className="glass-card" 
                      style={{ 
                        padding: '24px', 
                        borderRadius: '24px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '20px',
                        border: '1px solid rgba(255,255,255,0.05)',
                        background: 'rgba(255,255,255,0.01)'
                      }}
                    >
                      {/* Member Info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ 
                          width: '60px', 
                          height: '60px', 
                          borderRadius: '16px', 
                          overflow: 'hidden',
                          border: '1px solid rgba(255,255,255,0.1)',
                          backgroundColor: 'rgba(255,255,255,0.02)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {member.image_url ? (
                            <img src={member.image_url} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '20px', fontWeight: '900', color: 'var(--gold-primary)', opacity: 0.6 }}>
                              {member.name.substring(0, 1).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'white', margin: 0 }}>{member.name}</h4>
                          <span style={{ fontSize: '12px', color: 'var(--gold-primary)', fontWeight: '700', marginTop: '2px', display: 'block' }}>
                            {member.role?.split('|')[0]}
                          </span>
                        </div>
                      </div>

                      <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />

                      {/* Metrics Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.03)' }}>
                          <span style={{ fontSize: '11px', color: '#8e8e93', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>⏱️ Demora Prom.</span>
                          <div style={{ fontSize: '18px', fontWeight: '900', color: 'white', marginTop: '4px' }}>{stats.avgDuration} min</div>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.03)' }}>
                          <span style={{ fontSize: '11px', color: '#8e8e93', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📅 Horas en Tienda</span>
                          <div style={{ fontSize: '18px', fontWeight: '900', color: 'white', marginTop: '4px' }}>{stats.totalHours} hrs</div>
                        </div>

                        <div style={{ 
                          background: skipped > 0 ? 'rgba(255,69,58,0.05)' : 'rgba(255,255,255,0.02)', 
                          padding: '12px', 
                          borderRadius: '14px', 
                          border: skipped > 0 ? '1px solid rgba(255,69,58,0.15)' : '1px solid rgba(255,255,255,0.03)' 
                        }}>
                          <span style={{ fontSize: '11px', color: skipped > 0 ? '#ff453a' : 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🚷 Turnos Saltados</span>
                          <div style={{ fontSize: '18px', fontWeight: '900', color: skipped > 0 ? '#ff453a' : 'white', marginTop: '4px' }}>
                            {skipped} {skipped === 1 ? 'cliente' : 'clientes'}
                          </div>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.03)' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>⭐ Reseña Promedio</span>
                          <div style={{ fontSize: '18px', fontWeight: '900', color: 'white', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {stats.avgRating} {stats.avgRating !== 'N/A' && <Star size={16} fill="var(--gold-primary)" color="var(--gold-primary)" />}
                          </div>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                            ({stats.reviewsCount} {stats.reviewsCount === 1 ? 'reseña' : 'reseñas'})
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      <AnimatedModal isOpen={showCamera}>
        {(overlayClass, cardClass) => (
          <PandaCamera 
            onClose={() => setShowCamera(false)}
            onCapture={(image) => {
              setFormData({ ...formData, image_url: image });
              setShowCamera(false);
            }}
            overlayClass={overlayClass}
            cardClass={cardClass}
          />
        )}
      </AnimatedModal>

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
