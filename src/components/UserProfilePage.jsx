import React, { useState, useEffect } from 'react';
import { 
  User, 
  Scissors, 
  ShoppingBag, 
  Clock, 
  Star, 
  Wrench, 
  Plus, 
  Trash2, 
  TrendingUp,
  Loader2,
  Sparkles,
  Shield,
  Activity,
  Package,
  Calendar,
  DollarSign,
  Smartphone,
  Tag,
  Key,
  ChevronDown,
  Target,
  Pencil,
  Check,
  X,
  History,
  Minus
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import PersonalInventoryHistoryModal from './PersonalInventoryHistoryModal';

const asArray = (value) => Array.isArray(value) ? value : [];

const UserProfilePage = ({ staffMember, inventory = [], onUpdate, isMobile }) => {
  const { user } = useAuth();
  const { showToast } = useNotifs();
  const { confirm } = useDialog();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAppointments: 0,
    totalServiceComm: 0,
    totalProductComm: 0,
    totalTips: 0,
    topServices: [],
    avgDurationMin: 0
  });
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState({ servicesCount: 0, income: 0 });
  const [editingGoals, setEditingGoals] = useState(false);
  const [goalDraft, setGoalDraft] = useState({ income: '', services: '' });

  // Inventory/Tools State
  const [tools, setTools] = useState([]);
  const [showAddTool, setShowAddTool] = useState(false);
  const [newTool, setNewTool] = useState({
    name: '',
    brand: '',
    ownership: 'Propia',
    status: 'Operativa',
    inventory_id: '',
    item_type: 'Herramienta',
    quantity: 1
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showInventoryHistory, setShowInventoryHistory] = useState(false);
  const [adjustingToolId, setAdjustingToolId] = useState(null);

  const logPersonalInventoryMovement = async (tool, action, amount, type, productId = tool.inventory_id || null) => {
    try {
      await dataService.logInventoryMovement({
        product_id: productId,
        type,
        amount,
        reason: `[PERSONAL:${staffMember.id}] ${action}|${tool.name}`
      });
    } catch (error) {
      console.error('Error logging personal inventory movement:', error);
    }
  };

  useEffect(() => {
    if (staffMember) {
      loadProfileData();
      setTools(asArray(staffMember.tools));
    }
  }, [staffMember]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const [profileStats, today] = await Promise.all([
        dataService.getStaffProfileStats(staffMember.id),
        dataService.getTodayAppointments()
      ]);
      setStats(profileStats);

      const assistantRole = (staffMember.role || '').toLowerCase();
      const assistant = assistantRole.includes('asistente') || assistantRole.includes('lavado');
      setTodayAppointments(asArray(today).filter(appointment => (
        assistant
          ? asArray(appointment.appointment_staff).some(entry => String(entry.staff_id) === String(staffMember.id))
          : String(appointment.staff_id) === String(staffMember.id)
      )));

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthRecords = asArray(profileStats.rawRecords).filter(record => {
        const appointment = record.appointments;
        const date = new Date(appointment?.scheduled_at || appointment?.created_at || 0);
        return appointment && date >= monthStart;
      });
      setMonthlyStats({
        servicesCount: monthRecords.length,
        income: monthRecords.reduce((sum, record) => (
          sum
          + Number(record.commission_earned || 0)
          + Number(record.product_commission || 0)
          + Number(record.tip_amount || 0)
        ), 0)
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      showToast('Error cargando métricas del perfil', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTool = async () => {
    const quantity = Math.max(1, Number.parseInt(newTool.quantity, 10) || 1);
    let adjustedInventoryItem = null;
    if (newTool.ownership === 'Propia') {
      if (!newTool.name.trim()) {
        showToast('Ingresa el nombre del artículo', 'warning');
        return;
      }
    } else {
      if (!newTool.inventory_id) {
        showToast('Selecciona un artículo del inventario', 'warning');
        return;
      }
    }

    try {
      setLoading(true);
      let toolToAdd = {
        ...newTool,
        quantity,
        id: Date.now().toString(),
        date_added: new Date().toISOString()
      };

      if (newTool.ownership === 'Asignada') {
        const invItem = inventory.find(i => i.id === newTool.inventory_id);
        if (invItem) {
          const availableStock = Number(invItem.stock || 0);
          if (availableStock < quantity) {
            showToast(`Solo hay ${availableStock} unidad(es) disponibles`, 'warning');
            return;
          }
          toolToAdd.name = invItem.name;
          toolToAdd.brand = invItem.brand || invItem.category || '';
          await dataService.updateStock(invItem.id, availableStock - quantity);
          adjustedInventoryItem = invItem;
        }
      }

      const updatedTools = [...tools, toolToAdd];
      await dataService.updateStaffTools(staffMember.id, updatedTools);
      setTools(updatedTools);
      await logPersonalInventoryMovement(
        toolToAdd,
        toolToAdd.ownership === 'Asignada' ? 'ASIGNACION' : 'REGISTRO',
        quantity,
        toolToAdd.ownership === 'Asignada' ? 'exit' : 'entry'
      );
      setNewTool({
        name: '',
        brand: '',
        ownership: 'Propia',
        status: 'Operativa',
        inventory_id: '',
        item_type: 'Herramienta',
        quantity: 1
      });
      setShowAddTool(false);
      showToast('Artículo registrado con éxito');
      if (onUpdate) {
        try {
          await onUpdate();
        } catch (refreshError) {
          console.error('Error refreshing profile data:', refreshError);
        }
      }
    } catch (error) {
      console.error('Error saving tool:', error);
      if (adjustedInventoryItem) {
        try {
          await dataService.updateStock(adjustedInventoryItem.id, Number(adjustedInventoryItem.stock || 0));
        } catch (rollbackError) {
          console.error('Error restoring inventory stock:', rollbackError);
        }
      }
      showToast('Error al guardar el artículo', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTool = async (toolId) => {
    if (!await confirm('¿Seguro que deseas eliminar este artículo del inventario personal?')) return;
    try {
      setLoading(true);
      const toolToRemove = tools.find(t => t.id === toolId);
      
      if (toolToRemove?.inventory_id) {
        if (toolToRemove.quantity == null) {
          await dataService.updateInventoryItem(toolToRemove.inventory_id, { staff_id: null });
        } else {
          const invItem = inventory.find(item => item.id === toolToRemove.inventory_id);
          if (invItem) {
            await dataService.updateStock(
              invItem.id,
              Number(invItem.stock || 0) + Math.max(1, Number(toolToRemove.quantity) || 1)
            );
          }
        }
      }

      const updatedTools = tools.filter(t => t.id !== toolId);
      await dataService.updateStaffTools(staffMember.id, updatedTools);
      setTools(updatedTools);
      if (toolToRemove) {
        await logPersonalInventoryMovement(
          toolToRemove,
          toolToRemove.inventory_id ? 'DEVOLUCION' : 'RETIRO',
          Math.max(1, Number(toolToRemove.quantity) || 1),
          toolToRemove.inventory_id ? 'entry' : 'exit'
        );
      }
      showToast(toolToRemove?.inventory_id
        ? 'Artículo removido y devuelto al inventario general'
        : 'Artículo removido del perfil');
      if (onUpdate) {
        try {
          await onUpdate();
        } catch (refreshError) {
          console.error('Error refreshing profile data:', refreshError);
        }
      }
    } catch (error) {
      showToast('Error al eliminar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const isToolInventoryItem = item => (
    item.inventory_type === 'tools'
    || ['herramienta', 'herramientas', 'accesorios', 'uso interno']
      .includes(String(item.category || '').toLowerCase())
  );
  const availableInventoryTools = asArray(inventory).filter(item => {
    const matchesType = newTool.item_type === 'Herramienta'
      ? isToolInventoryItem(item)
      : !isToolInventoryItem(item);
    return matchesType && Number(item.stock || 0) > 0 && !item.staff_id;
  });

  const handleAdjustPersonalProduct = async (toolId, amount) => {
    const tool = tools.find(item => item.id === toolId);
    if (!tool || (tool.item_type || 'Herramienta') !== 'Producto') return;

    const currentQuantity = Math.max(0, Number(tool.quantity) || 0);
    if (amount < 0 && currentQuantity === 0) {
      showToast('Este producto ya está agotado.', 'warning');
      return;
    }

    let adjustedInventoryItem = null;
    try {
      setAdjustingToolId(toolId);
      if (amount > 0 && tool.inventory_id) {
        const invItem = inventory.find(item => item.id === tool.inventory_id);
        if (!invItem || Number(invItem.stock || 0) < 1) {
          showToast('No quedan unidades disponibles en el almacén.', 'warning');
          return;
        }
        await dataService.updateStock(invItem.id, Number(invItem.stock) - 1);
        adjustedInventoryItem = invItem;
      }

      const nextQuantity = Math.max(0, currentQuantity + amount);
      const updatedTools = tools.map(item => item.id === toolId
        ? { ...item, quantity: nextQuantity, status: nextQuantity === 0 ? 'Agotado' : 'Disponible' }
        : item);
      await dataService.updateStaffTools(staffMember.id, updatedTools);
      setTools(updatedTools);
      await logPersonalInventoryMovement(
        tool,
        amount < 0 ? 'CONSUMO' : 'REPOSICION',
        1,
        amount < 0 || tool.inventory_id ? 'exit' : 'entry',
        amount > 0 ? tool.inventory_id || null : null
      );
      showToast(amount < 0 ? `Registrado: gastaste 1 ${tool.name}` : `Se repuso 1 ${tool.name}`);

      if (onUpdate) {
        try {
          await onUpdate();
        } catch (refreshError) {
          console.error('Error refreshing profile data:', refreshError);
        }
      }
    } catch (error) {
      console.error('Error adjusting personal inventory:', error);
      if (adjustedInventoryItem) {
        try {
          await dataService.updateStock(adjustedInventoryItem.id, Number(adjustedInventoryItem.stock || 0));
        } catch (rollbackError) {
          console.error('Error restoring inventory stock:', rollbackError);
        }
      }
      showToast('No se pudo actualizar la cantidad.', 'error');
    } finally {
      setAdjustingToolId(null);
    }
  };

  // Parse Role & Permissions
  const roleRaw = staffMember?.role || 'ASISTENTE';
  const roleName = roleRaw.includes('|') ? roleRaw.split('|')[0] : roleRaw;
  const rawPermissions = roleRaw.includes('|') ? roleRaw.split('|')[1].split(',') : [];
  const isAssistant = roleName.toLowerCase().includes('asistente') || roleName.toLowerCase().includes('lavado');
  const goalStoragePrefix = `panda_profile_goal_${staffMember?.id}`;
  const monthlyGoalIncome = Number(localStorage.getItem(`${goalStoragePrefix}_income`) || (isAssistant ? 100 : 400));
  const monthlyGoalServices = Number(localStorage.getItem(`${goalStoragePrefix}_services`) || (isAssistant ? 50 : 40));
  const incomeProgress = Math.min(100, Math.round((monthlyStats.income / Math.max(1, monthlyGoalIncome)) * 100));
  const serviceProgress = Math.min(100, Math.round((monthlyStats.servicesCount / Math.max(1, monthlyGoalServices)) * 100));
  const completedToday = todayAppointments.filter(appointment => appointment.status === 'Completado').length;
  const todayIncome = asArray(stats.rawRecords).reduce((sum, record) => {
    const appointment = record.appointments;
    const date = new Date(appointment?.scheduled_at || appointment?.created_at || 0);
    const now = new Date();
    if (date.toDateString() !== now.toDateString()) return sum;
    return sum + Number(record.commission_earned || 0) + Number(record.product_commission || 0) + Number(record.tip_amount || 0);
  }, 0);

  const openGoalEditor = () => {
    setGoalDraft({ income: String(monthlyGoalIncome), services: String(monthlyGoalServices) });
    setEditingGoals(true);
  };

  const saveGoals = () => {
    const income = Number(goalDraft.income);
    const services = Number(goalDraft.services);
    if (income > 0) localStorage.setItem(`${goalStoragePrefix}_income`, String(income));
    if (services > 0) localStorage.setItem(`${goalStoragePrefix}_services`, String(services));
    setEditingGoals(false);
    showToast('Metas actualizadas');
  };

  const formatTime = (value) => value
    ? new Date(value).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true })
    : '--:--';

  const translatePermission = (perm) => {
    const mapping = {
      'DASHBOARD': 'Panel Principal',
      'SCHEDULING': 'Agenda',
      'RECEPTION': 'Recepción',
      'CHECKOUT': 'Caja Chica',
      'BARBER': 'Panel Barber',
      'CLIENTS': 'Clientes',
      'PERSONNEL': 'Equipo de Personal',
      'SERVICES': 'Servicios',
      'INVENTORY': 'Inventario',
      'FINANCE': 'Reportes y Métricas',
      'HISTORY': 'Historial de Operaciones'
    };
    return mapping[perm.toUpperCase()] || perm;
  };

  if (!staffMember) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Cargando información del perfil...
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* Premium UI Styles injection */}
      <style>{`
        .premium-profile-card {
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(255, 255, 255, 0.03);
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .premium-profile-card:hover {
          border-color: rgba(255, 255, 255, 0.4);
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(255, 255, 255, 0.08);
        }
        .glow-avatar-border {
          position: relative;
          background: linear-gradient(135deg, var(--gold-primary) 0%, #a67c1e 100%);
          padding: 4px;
          border-radius: 50%;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 255, 255, 0.3);
          transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .glow-avatar-border:hover {
          transform: scale(1.05) rotate(5deg);
        }
        .permission-badge-tag {
          font-size: 11px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.85);
          background-color: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 4px 10px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
        }
        .permission-badge-tag:hover {
          background-color: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.3);
          color: var(--gold-primary);
          transform: translateY(-2px);
        }
        .stat-glow-card {
          padding: 24px;
          border-radius: 24px;
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          border: 1px solid rgba(255, 255, 255, 0.04);
        }
        .stat-glow-card:hover {
          transform: translateY(-5px);
          border-color: rgba(255, 255, 255, 0.25);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5), 0 0 25px rgba(255, 255, 255, 0.05);
        }
        .stat-indicator-bar {
          width: 50px;
          height: 3px;
          margin-top: 16px;
          border-radius: 4px;
          transition: width 0.3s ease;
        }
        .stat-glow-card:hover .stat-indicator-bar {
          width: 80px;
        }
        .rank-row {
          background-color: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          padding: 10px 14px;
          transition: all 0.2s ease;
        }
        .rank-row:hover {
          background-color: rgba(255, 255, 255, 0.03);
          border-color: rgba(255, 255, 255, 0.15);
          transform: translateX(4px);
        }
        .custom-form-input {
          height: 40px;
          padding: 0 14px;
          font-size: 13px;
          border-radius: 10px;
          background-color: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: white;
          width: 100%;
          outline: none;
          transition: all 0.2s ease;
        }
        .custom-form-input:focus {
          border-color: var(--gold-primary);
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
          background-color: rgba(0, 0, 0, 0.5);
        }
        .inventory-tool-row {
          padding: 12px 16px;
          background-color: rgba(0,0,0,0.15);
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.03);
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.2s ease;
        }
        .inventory-tool-row:hover {
          border-color: rgba(255, 255, 255, 0.08);
          background-color: rgba(255, 255, 255, 0.02);
          transform: translateY(-1px);
        }
        .animated-aurora {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(20, 20, 20, 0.95) 0%, rgba(42, 34, 15, 0.8) 50%, rgba(20, 20, 20, 0.95) 100%);
          background-size: 200% 200%;
          animation: auroraBg 15s ease infinite;
        }
        @keyframes auroraBg {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(28px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes slideRightFade {
          0% { opacity: 0; transform: translateX(-24px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.85); }
          70% { transform: scale(1.03); }
          100% { opacity: 1; transform: scale(1); }
        }
        .anim-0 { animation: slideUpFade 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: 0.05s; }
        .anim-1 { animation: slideUpFade 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: 0.15s; }
        .anim-2 { animation: slideUpFade 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: 0.25s; }
        .anim-3 { animation: slideUpFade 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: 0.35s; }
        .anim-4 { animation: slideUpFade 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: 0.45s; }
        .anim-5 { animation: slideUpFade 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: 0.55s; }
        .anim-pop { animation: popIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: 0.1s; }
      `}</style>
      
      {/* 1. Header Banner & Profile Info Card */}
      <div className="glass-card premium-profile-card anim-0" style={{ 
        padding: '0', 
        borderRadius: '32px', 
        overflow: 'hidden'
      }}>
        {/* Banner with animated golden aurora effect */}
        <div style={{ height: '150px', position: 'relative', overflow: 'hidden' }}>
          <div className="animated-aurora" />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 80% 30%, rgba(255, 255, 255, 0.2) 0%, transparent 60%)',
            pointerEvents: 'none'
          }} />
        </div>

        {/* Profile Card Overlay Content */}
        <div style={{ 
          padding: '24px 32px 32px 32px', 
          position: 'relative', 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row', 
          alignItems: isMobile ? 'center' : 'flex-start', 
          gap: '28px', 
          marginTop: '-75px' 
        }}>
          
          {/* Glowing Avatar - Perfectly Rounded & flex-shrink: 0 */}
          <div className="glow-avatar-border" style={{ flexShrink: 0 }}>
            <div style={{ 
              width: '110px', 
              height: '110px', 
              borderRadius: '50%', 
              backgroundColor: '#121212',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {staffMember?.image_url ? (
                <img src={staffMember.image_url} alt={staffMember.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ fontSize: '46px', fontWeight: '950', color: 'white', fontFamily: 'Outfit, var(--font-sans), system-ui', textShadow: '0 0 10px rgba(255,255,255,0.2)' }}>
                  {staffMember?.name ? staffMember.name.charAt(0) : 'A'}
                </div>
              )}
            </div>
            {/* Status dot in the corner of the avatar */}
            <div style={{ 
              position: 'absolute', 
              bottom: '4px', 
              right: '4px', 
              width: '18px', 
              height: '18px', 
              borderRadius: '50%', 
              backgroundColor: '#30d158', 
              border: '3px solid #161616',
              boxShadow: '0 0 10px rgba(48,209,88,0.5)'
            }} />
          </div>

          {/* User Details */}
          <div style={{ flex: 1, textAlign: isMobile ? 'center' : 'left', width: '100%' }}>
            
            {/* Top row alignment */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'flex-start', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '32px', fontWeight: '950', color: 'white', letterSpacing: '-0.8px', marginBottom: '8px', fontFamily: 'Outfit, var(--font-sans), system-ui' }}>
                  {staffMember.name}
                </h2>
                
                {/* Styled Clean Badge for Role and Credentials info */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-start', alignItems: 'center' }}>
                  <span style={{ 
                    fontSize: '11px', 
                    fontWeight: '900', 
                    color: '#121212', 
                    backgroundColor: 'var(--gold-primary)', 
                    padding: '5px 12px', 
                    borderRadius: '20px', 
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 15px rgba(255, 255, 255, 0.3)'
                  }}>
                    <Shield size={12} /> {roleName}
                  </span>
                  
                  {staffMember.id_card && (
                    <span style={{ 
                      fontSize: '11px', 
                      color: 'rgba(255, 255, 255, 0.5)', 
                      fontWeight: '700', 
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Tag size={10} /> ID: {staffMember.id_card}
                    </span>
                  )}
                  
                  {staffMember.phone && (
                    <span style={{ 
                      fontSize: '11px', 
                      color: 'rgba(255, 255, 255, 0.5)', 
                      fontWeight: '700', 
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Smartphone size={10} /> {staffMember.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* 2. Key Performance Metrics Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Loader2 className="animate-spin" size={36} color="var(--gold-primary)" style={{ margin: '0 auto' }} />
        </div>
      ) : (
        <>
          <div className="glass-card anim-1" style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
            borderRadius: '22px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            {[
              { label: isAssistant ? 'Lavados hoy' : 'Servicios hoy', value: completedToday },
              { label: 'Este mes', value: monthlyStats.servicesCount },
              { label: 'Ganancia hoy', value: `$${todayIncome.toFixed(2)}` },
              { label: 'Ganancia mes', value: `$${monthlyStats.income.toFixed(2)}` },
              { label: 'Tiempo prom.', value: `${stats.avgDurationMin} min` }
            ].map((item, index) => (
              <div key={item.label} style={{
                padding: '18px 16px',
                textAlign: 'center',
                borderRight: !isMobile && index < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                borderBottom: isMobile && index < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                gridColumn: isMobile && index === 4 ? '1 / -1' : 'auto'
              }}>
                <div style={{ color: 'var(--gold-primary)', fontSize: isMobile ? '21px' : '24px', fontWeight: '950' }}>{item.value}</div>
                <div style={{ marginTop: '5px', color: 'rgba(255,255,255,0.38)', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{item.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px' }} className="anim-1">
            
            {/* Services Commission Card */}
            <div className="glass-card stat-glow-card anim-2" style={{ background: 'linear-gradient(135deg, rgba(28,28,30,0.6) 0%, rgba(255, 255, 255,0.02) 100%)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: '850', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{isAssistant ? 'Ingresos por lavados' : 'Comisión servicios'}</span>
                  <h3 style={{ fontSize: '30px', fontWeight: '950', color: 'white', marginTop: '6px', fontFamily: 'Outfit, var(--font-sans), system-ui' }}>${stats.totalServiceComm.toFixed(2)}</h3>
                </div>
                <div style={{ width: '44px', height: '44px', borderRadius: '14px', backgroundColor: 'rgba(255, 255, 255,0.1)', border: '1px solid rgba(255, 255, 255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Scissors size={20} color="var(--gold-primary)" />
                </div>
              </div>
              <div className="stat-indicator-bar" style={{ backgroundColor: 'var(--gold-primary)', boxShadow: '0 0 10px rgba(255, 255, 255,0.4)' }} />
            </div>

            {/* Product Commission Card */}
            <div className="glass-card stat-glow-card anim-3" style={{ background: 'linear-gradient(135deg, rgba(28,28,30,0.6) 0%, rgba(48,209,88,0.02) 100%)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: '850', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Comisión Productos</span>
                  <h3 style={{ fontSize: '30px', fontWeight: '950', color: 'white', marginTop: '6px', fontFamily: 'Outfit, var(--font-sans), system-ui' }}>${stats.totalProductComm.toFixed(2)}</h3>
                </div>
                <div style={{ width: '44px', height: '44px', borderRadius: '14px', backgroundColor: 'rgba(48,209,88,0.1)', border: '1px solid rgba(48,209,88,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShoppingBag size={20} color="#30d158" />
                </div>
              </div>
              <div className="stat-indicator-bar" style={{ backgroundColor: '#30d158', boxShadow: '0 0 10px rgba(48,209,88,0.4)' }} />
            </div>

            {/* Tips Card */}
            <div className="glass-card stat-glow-card anim-4" style={{ background: 'linear-gradient(135deg, rgba(28,28,30,0.6) 0%, rgba(10,132,255,0.02) 100%)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: '850', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Total Propinas</span>
                  <h3 style={{ fontSize: '30px', fontWeight: '950', color: 'white', marginTop: '6px', fontFamily: 'Outfit, var(--font-sans), system-ui' }}>${stats.totalTips.toFixed(2)}</h3>
                </div>
                <div style={{ width: '44px', height: '44px', borderRadius: '14px', backgroundColor: 'rgba(10,132,255,0.1)', border: '1px solid rgba(10,132,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={20} color="#0a84ff" />
                </div>
              </div>
              <div className="stat-indicator-bar" style={{ backgroundColor: '#0a84ff', boxShadow: '0 0 10px rgba(10,132,255,0.4)' }} />
            </div>

          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '16px' }} className="anim-3">
            <div className="glass-card" style={{ padding: isMobile ? '20px' : '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <Calendar size={17} color="var(--gold-primary)" />
                  <h4 style={{ fontSize: '13px', fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    {isAssistant ? 'Servicios asignados hoy' : 'Agenda de hoy'}
                  </h4>
                </div>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{completedToday}/{todayAppointments.length} completados</span>
              </div>

              {todayAppointments.length === 0 ? (
                <div style={{ padding: '30px 18px', textAlign: 'center', color: 'rgba(255,255,255,0.28)', fontSize: '12px', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '14px' }}>
                  {isAssistant ? 'No tienes servicios asignados para hoy' : 'No tienes citas agendadas para hoy'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {todayAppointments.map(appointment => {
                    const active = appointment.status === 'En Silla';
                    const completed = appointment.status === 'Completado';
                    return (
                      <div key={appointment.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', background: active ? 'rgba(214,190,151,0.08)' : 'rgba(255,255,255,0.025)', border: active ? '1px solid rgba(214,190,151,0.22)' : '1px solid rgba(255,255,255,0.035)' }}>
                        <span style={{ width: '62px', flexShrink: 0, color: active ? 'var(--gold-primary)' : 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '700' }}>{formatTime(appointment.scheduled_at || appointment.created_at)}</span>
                        <span style={{ width: 7, height: 7, flexShrink: 0, borderRadius: '50%', background: completed ? '#30d158' : active ? 'var(--gold-primary)' : '#555' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: 'white', fontSize: '13px', fontWeight: '750', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{appointment.clients?.name || 'Cliente'}</div>
                          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{appointment.services?.name || 'Servicio'}</div>
                        </div>
                        <span style={{ flexShrink: 0, padding: '4px 9px', borderRadius: '20px', color: completed ? '#30d158' : active ? 'var(--gold-primary)' : '#888', background: completed ? 'rgba(48,209,88,0.1)' : active ? 'rgba(214,190,151,0.1)' : 'rgba(255,255,255,0.05)', fontSize: '10px', fontWeight: '800' }}>{appointment.status}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="glass-card" style={{ padding: isMobile ? '20px' : '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <Target size={17} color="var(--gold-primary)" />
                  <h4 style={{ fontSize: '13px', fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Metas del mes</h4>
                </div>
                {!editingGoals ? (
                  <button onClick={openGoalEditor} style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#999', borderRadius: '8px', padding: '5px 9px', cursor: 'pointer', display: 'flex', gap: '5px', alignItems: 'center', fontSize: '10px', fontWeight: '800' }}><Pencil size={10} /> Editar</button>
                ) : (
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={saveGoals} style={{ border: '1px solid rgba(214,190,151,0.3)', background: 'rgba(214,190,151,0.12)', color: 'var(--gold-primary)', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer' }}><Check size={11} /></button>
                    <button onClick={() => setEditingGoals(false)} style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#888', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer' }}><X size={11} /></button>
                  </div>
                )}
              </div>

              {editingGoals ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ color: '#888', fontSize: '10px', fontWeight: '800' }}>META {isAssistant ? 'LAVADOS' : 'SERVICIOS'}<input className="custom-form-input" type="number" value={goalDraft.services} onChange={event => setGoalDraft(current => ({ ...current, services: event.target.value }))} style={{ marginTop: '6px' }} /></label>
                  <label style={{ color: '#888', fontSize: '10px', fontWeight: '800' }}>META INGRESOS (USD)<input className="custom-form-input" type="number" value={goalDraft.income} onChange={event => setGoalDraft(current => ({ ...current, income: event.target.value }))} style={{ marginTop: '6px' }} /></label>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {[
                    { label: isAssistant ? 'Lavados' : 'Servicios', value: `${monthlyStats.servicesCount} / ${monthlyGoalServices}`, progress: serviceProgress, color: 'var(--gold-primary)' },
                    { label: 'Ingresos', value: `$${monthlyStats.income.toFixed(2)} / $${monthlyGoalIncome.toFixed(2)}`, progress: incomeProgress, color: '#30d158' }
                  ].map(goal => (
                    <div key={goal.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#aaa', fontSize: '12px' }}><span>{goal.label}</span><strong style={{ color: 'white' }}>{goal.value}</strong></div>
                      <div style={{ height: 6, borderRadius: 6, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}><div style={{ height: '100%', width: `${goal.progress}%`, background: goal.color, borderRadius: 6 }} /></div>
                      <div style={{ marginTop: '5px', textAlign: 'right', color: goal.progress >= 100 ? goal.color : '#555', fontSize: '10px' }}>{goal.progress >= 100 ? '¡Meta alcanzada!' : `${goal.progress}% completado`}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3. Double Column Detail Section */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px' }}>
            
            {/* Left Column: Historial & Rendimiento */}
            <div className="glass-card anim-4" style={{ borderRadius: '28px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px', border: '1px solid rgba(255,255,255,0.04)' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Activity size={18} color="var(--gold-primary)" />
                <h4 style={{ fontSize: '15px', fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rendimiento Histórico</h4>
              </div>

              {/* Service & Time Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ padding: '20px', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px' }}>
                    <Star size={12} color="var(--gold-primary)" /> {isAssistant ? 'LAVADOS' : 'SERVICIOS'}
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '950', color: 'white', marginTop: '8px', fontFamily: 'Outfit, var(--font-sans), system-ui' }}>{stats.totalAppointments}</div>
                </div>
                <div style={{ padding: '20px', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px' }}>
                    <Clock size={12} color="var(--gold-primary)" /> TIEMPO PROMEDIO
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '950', color: 'white', marginTop: '8px', fontFamily: 'Outfit, var(--font-sans), system-ui' }}>
                    {stats.avgDurationMin} <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', fontWeight: '800' }}>min</span>
                  </div>
                </div>
              </div>

              {/* Top Services ranking list */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '850', color: 'rgba(255,255,255,0.4)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{isAssistant ? 'Lavados más realizados' : 'Servicios más realizados'}</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {stats.topServices.length === 0 ? (
                    <div style={{ padding: '30px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '12px', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '16px' }}>No hay registros de servicios aún</div>
                  ) : (
                    stats.topServices.map((srv, idx) => (
                      <div key={idx} className="rank-row" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                          <span style={{ fontWeight: '750', color: 'white' }}>{srv.service_name}</span>
                          <span style={{ fontWeight: '900', color: 'var(--gold-primary)', backgroundColor: 'rgba(255, 255, 255,0.08)', border: '1px solid rgba(255, 255, 255,0.15)', padding: '3px 8px', borderRadius: '8px', fontSize: '10px' }}>{srv.count} veces</span>
                        </div>
                        <div style={{ height: '5px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${Math.min(100, (srv.count / Math.max(1, stats.totalAppointments)) * 100)}%`, 
                            height: '100%', 
                            background: 'var(--gold-gradient)',
                            boxShadow: 'var(--gold-glow)'
                          }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Herramientas e Inventario */}
            <div className="glass-card anim-5" style={{ borderRadius: '28px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px', border: '1px solid rgba(255,255,255,0.04)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Wrench size={18} color="var(--gold-primary)" />
                  <h4 style={{ fontSize: '15px', fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Inventario Personal</h4>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setShowInventoryHistory(true)}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: 'white',
                    padding: '8px 11px',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <History size={12} /> Historial
                </button>
                <button
                  onClick={() => setShowAddTool(!showAddTool)}
                  style={{
                    backgroundColor: showAddTool ? 'rgba(255,255,255,0.05)' : 'rgba(255, 255, 255, 0.1)',
                    border: showAddTool ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: '10px',
                    color: showAddTool ? 'white' : 'var(--gold-primary)',
                    padding: '8px 14px',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Plus size={12} /> {showAddTool ? 'Cerrar' : 'Asignar'}
                </button>
                </div>
              </div>

              {/* Add Tool Form */}
              {showAddTool && (
                <div className="animate-scale-in" style={{ padding: '20px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '20px', border: '1px solid rgba(255, 255, 255,0.2)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {['Herramienta', 'Producto'].map(itemType => (
                        <button
                          key={itemType}
                          type="button"
                          onClick={() => setNewTool({
                            ...newTool,
                            item_type: itemType,
                            inventory_id: '',
                            status: itemType === 'Producto' ? 'Disponible' : 'Operativa'
                          })}
                          style={{
                            flex: 1,
                            height: '34px',
                            borderRadius: '8px',
                            border: newTool.item_type === itemType ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.08)',
                            backgroundColor: newTool.item_type === itemType ? 'rgba(197,168,128,0.16)' : 'rgba(255,255,255,0.04)',
                            color: newTool.item_type === itemType ? 'var(--gold-primary)' : 'rgba(255,255,255,0.65)',
                            fontSize: '11px',
                            fontWeight: '900',
                            cursor: 'pointer'
                          }}
                        >
                          {itemType}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        onClick={() => setNewTool({ ...newTool, ownership: 'Propia', inventory_id: '' })}
                        style={{ 
                          flex: 1, 
                          height: '34px', 
                          borderRadius: '8px', 
                          border: 'none', 
                          backgroundColor: newTool.ownership === 'Propia' ? 'var(--gold-primary)' : 'rgba(255,255,255,0.04)', 
                          color: newTool.ownership === 'Propia' ? 'black' : 'white', 
                          fontSize: '11px', 
                          fontWeight: '900', 
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        Propia
                      </button>
                      <button 
                        onClick={() => setNewTool({ ...newTool, ownership: 'Asignada', inventory_id: '' })}
                        style={{ 
                          flex: 1, 
                          height: '34px', 
                          borderRadius: '8px', 
                          border: 'none', 
                          backgroundColor: newTool.ownership === 'Asignada' ? 'var(--gold-primary)' : 'rgba(255,255,255,0.04)', 
                          color: newTool.ownership === 'Asignada' ? 'black' : 'white', 
                          fontSize: '11px', 
                          fontWeight: '900', 
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        Asignada del Stock
                      </button>
                    </div>

                    {newTool.ownership === 'Propia' ? (
                      <>
                        <input 
                          type="text" 
                          placeholder={newTool.item_type === 'Producto' ? 'Nombre (Ej: Laca profesional)' : 'Nombre (Ej: Clipper Magic Clip)'}
                          value={newTool.name}
                          onChange={e => setNewTool({ ...newTool, name: e.target.value })}
                          className="custom-form-input"
                        />
                        <input 
                          type="text" 
                          placeholder={newTool.item_type === 'Producto' ? 'Marca/Detalles (opcional)' : 'Marca/Modelo (opcional)'}
                          value={newTool.brand}
                          onChange={e => setNewTool({ ...newTool, brand: e.target.value })}
                          className="custom-form-input"
                        />
                      </>
                    ) : (
                      <div style={{ position: 'relative' }}>
                        {/* Custom Dropdown Trigger */}
                        <button
                          type="button"
                          onClick={() => setDropdownOpen(!dropdownOpen)}
                          className="custom-form-input"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            textAlign: 'left',
                            width: '100%',
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: dropdownOpen ? '1px solid var(--gold-primary)' : '1px solid rgba(255, 255, 255, 0.08)',
                            boxShadow: dropdownOpen ? '0 0 10px rgba(255, 255, 255, 0.2)' : 'none',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <span style={{ color: newTool.inventory_id ? 'white' : 'rgba(255, 255, 255, 0.4)' }}>
                            {newTool.inventory_id 
                              ? `${availableInventoryTools.find(t => t.id === newTool.inventory_id)?.name} · Stock: ${availableInventoryTools.find(t => t.id === newTool.inventory_id)?.stock}`
                              : `Selecciona ${newTool.item_type === 'Producto' ? 'un producto' : 'una herramienta'}...`}
                          </span>
                          <ChevronDown size={16} color="var(--gold-primary)" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                        </button>

                        {/* Custom Dropdown Floating Panel */}
                        {dropdownOpen && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            marginTop: '6px',
                            background: 'rgba(20, 20, 20, 0.95)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            boxShadow: '0 15px 35px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 255, 255, 0.08)',
                            borderRadius: '10px',
                            maxHeight: '180px',
                            overflowY: 'auto',
                            zIndex: 100
                          }}>
                            {availableInventoryTools.length === 0 ? (
                              <div style={{ padding: '12px 14px', color: 'rgba(255, 255, 255, 0.4)', fontSize: '13px', textAlign: 'center' }}>
                                No hay {newTool.item_type.toLowerCase()}s disponibles en stock
                              </div>
                            ) : (
                              availableInventoryTools.map(t => (
                                <div
                                  key={t.id}
                                  onClick={() => {
                                    setNewTool({ ...newTool, inventory_id: t.id });
                                    setDropdownOpen(false);
                                  }}
                                  style={{
                                    padding: '10px 14px',
                                    color: newTool.inventory_id === t.id ? 'var(--gold-primary)' : 'white',
                                    backgroundColor: newTool.inventory_id === t.id ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    transition: 'all 0.15s ease',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.02)'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                                    e.currentTarget.style.color = 'var(--gold-primary)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = newTool.inventory_id === t.id ? 'rgba(255, 255, 255, 0.08)' : 'transparent';
                                    e.currentTarget.style.color = newTool.inventory_id === t.id ? 'var(--gold-primary)' : 'white';
                                  }}
                                >
                                  {t.name} · Stock: {t.stock}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <label style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: '800', minWidth: '70px' }}>
                        CANTIDAD
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={newTool.ownership === 'Asignada'
                          ? availableInventoryTools.find(item => item.id === newTool.inventory_id)?.stock
                          : undefined}
                        value={newTool.quantity}
                        onChange={event => setNewTool({ ...newTool, quantity: event.target.value })}
                        className="custom-form-input"
                        style={{ width: '110px' }}
                      />
                    </div>

                    <button 
                      onClick={handleAddTool}
                      className="btn-gold" 
                      style={{ 
                        height: '42px', 
                        borderRadius: '10px', 
                        fontSize: '12px', 
                        fontWeight: '900', 
                        marginTop: '4px',
                        boxShadow: '0 5px 15px rgba(255, 255, 255, 0.25)' 
                      }}
                    >
                      CONFIRMAR ASIGNACIÓN
                    </button>
                  </div>
                </div>
              )}

              {/* Tools List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                {tools.length === 0 ? (
                  <div style={{ padding: '30px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '12px', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '16px' }}>
                    Ningún artículo registrado en este perfil.
                  </div>
                ) : (
                  tools.map(tool => {
                    const itemType = tool.item_type || 'Herramienta';
                    const resolvedStatus = tool.status || (itemType === 'Producto' ? 'Disponible' : 'Operativa');
                    const isHealthy = ['Operativa', 'Disponible'].includes(resolvedStatus);
                    return (
                    <div 
                      key={tool.id} 
                      className="inventory-tool-row"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {itemType === 'Producto'
                          ? <Package size={16} color="var(--gold-primary)" />
                          : <Wrench size={16} color="var(--gold-primary)" />}
                        <div>
                        <div style={{ fontWeight: '800', fontSize: '13px', color: 'white' }}>
                          {tool.name} <span style={{ color: 'var(--gold-primary)', fontSize: '11px' }}>× {tool.quantity || 1}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                          {itemType}{tool.brand ? ` · ${tool.brand}` : ''} · <span style={{ color: tool.ownership === 'Propia' ? 'var(--gold-primary)' : '#30d158', fontWeight: '800' }}>{tool.ownership}</span>
                        </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {itemType === 'Producto' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <button
                              onClick={() => handleAdjustPersonalProduct(tool.id, -1)}
                              disabled={adjustingToolId === tool.id || Number(tool.quantity || 0) <= 0}
                              title="Registrar que gastaste una unidad"
                              style={{
                                height: '29px',
                                padding: '0 9px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,159,10,0.25)',
                                background: 'rgba(255,159,10,0.1)',
                                color: '#ffb340',
                                fontSize: '10px',
                                fontWeight: '900',
                                cursor: Number(tool.quantity || 0) > 0 ? 'pointer' : 'not-allowed',
                                opacity: Number(tool.quantity || 0) > 0 ? 1 : 0.45,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Minus size={11} /> Gasté 1
                            </button>
                            <button
                              onClick={() => handleAdjustPersonalProduct(tool.id, 1)}
                              disabled={adjustingToolId === tool.id}
                              title="Reponer una unidad"
                              style={{
                                width: '29px',
                                height: '29px',
                                borderRadius: '8px',
                                border: '1px solid rgba(48,209,88,0.22)',
                                background: 'rgba(48,209,88,0.1)',
                                color: '#30d158',
                                cursor: 'pointer',
                                display: 'grid',
                                placeItems: 'center'
                              }}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        )}
                        <span style={{ 
                          fontSize: '10px', 
                          fontWeight: '900', 
                          color: isHealthy ? '#30d158' : '#ff453a',
                          backgroundColor: isHealthy ? 'rgba(48,209,88,0.1)' : 'rgba(255,69,58,0.1)',
                          border: isHealthy ? '1px solid rgba(48,209,88,0.2)' : '1px solid rgba(255,69,58,0.2)',
                          padding: '3px 8px', 
                          borderRadius: '6px' 
                        }}>
                          {resolvedStatus.toUpperCase()}
                        </span>
                        <button 
                          onClick={() => handleRemoveTool(tool.id)}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: 'rgba(255, 69, 58, 0.7)', 
                            cursor: 'pointer', 
                            padding: '6px', 
                            display: 'flex', 
                            alignItems: 'center',
                            borderRadius: '8px',
                            transition: 'all 0.2s ease',
                            backgroundColor: 'rgba(255, 69, 58, 0.05)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#ff453a';
                            e.currentTarget.style.backgroundColor = 'rgba(255, 69, 58, 0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'rgba(255, 69, 58, 0.7)';
                            e.currentTarget.style.backgroundColor = 'rgba(255, 69, 58, 0.05)';
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
          <PersonalInventoryHistoryModal
            isOpen={showInventoryHistory}
            onClose={() => setShowInventoryHistory(false)}
            staffId={staffMember.id}
          />
        </>
      )}

    </div>
  );
};

export default UserProfilePage;
