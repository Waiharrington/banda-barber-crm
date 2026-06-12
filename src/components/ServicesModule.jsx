import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Clock, Scissors, 
  Rocket, Droplets, Zap, Check, X, Loader2,
  Settings, DollarSign, LayoutList, Star, Crown,
  LayoutGrid, Table, Eye, Info, Pencil
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useDialog } from '../context/DialogContext';
import { useNotifs } from '../context/NotificationContext';
import AstroSelect from './AstroSelect';

const ServicesModule = ({ isMobile, currency, rates }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [isExtrasModalOpen, setIsExtrasModalOpen] = useState(false);
  const [isBillableExtrasModalOpen, setIsBillableExtrasModalOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [isStrategiesModalOpen, setIsStrategiesModalOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newStrategyValue, setNewStrategyValue] = useState('');
  const [newStrategyLabel, setNewStrategyLabel] = useState('');
  const [baseItems, setBaseItems] = useState([]);
  const [billableExtras, setBillableExtras] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [editingExtra, setEditingExtra] = useState(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCost, setNewItemCost] = useState('0.00');
  const [newExtraName, setNewExtraName] = useState('');
  const [newExtraPrice, setNewExtraPrice] = useState('2.00');
  const [newExtraCost, setNewExtraCost] = useState('0.50');
  const [selectedServiceDetail, setSelectedServiceDetail] = useState(null);
  const { showToast } = useNotifs();
  const { confirm } = useDialog();

  useEffect(() => {
    fetchServices();
    fetchBaseItems();
    fetchBillableExtras();
    fetchCategories();
    fetchStrategies();
  }, []);

  const fetchServices = async () => {
    try {
      const data = await dataService.getServices();
      setServices(data || []);
    } catch (e) {
      showToast('Error al cargar servicios.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchBaseItems = async () => {
    try {
      const items = await dataService.getChecklistItems();
      setBaseItems(items || []);
    } catch (e) {
      showToast('Error al cargar ítems incluidos.', 'error');
    }
  };

  const fetchBillableExtras = async () => {
    try {
      const data = await dataService.getExtras();
      setBillableExtras(data?.filter(e => e.name !== 'SYSTEM_CONFIG_RATES') || []);
    } catch (e) {
      showToast('Error al cargar extras cobrables.', 'error');
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await dataService.getServiceCategories();
      setCategories(data || []);
    } catch (e) {
      showToast('Error al cargar categorías.', 'error');
    }
  };

  const fetchStrategies = async () => {
    try {
      const data = await dataService.getServiceStrategies();
      setStrategies(data || []);
    } catch (e) {
      showToast('Error al cargar estrategias.', 'error');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await dataService.addServiceCategory(newCategoryName.trim());
      setNewCategoryName('');
      await fetchCategories();
      showToast('Nueva categoría creada.');
    } catch (e) {
      showToast('Error al crear categoría.', 'error');
    }
  };

  const handleDeleteCategory = async (name) => {
    if (!await confirm(`¿Estás seguro de eliminar la categoría "${name}"?`)) return;
    try {
      await dataService.deleteServiceCategory(name);
      await fetchCategories();
      showToast('Categoría eliminada.');
    } catch (e) {
      showToast('Error al eliminar categoría.', 'error');
    }
  };

  const handleAddStrategy = async () => {
    if (!newStrategyValue.trim() || !newStrategyLabel.trim()) {
      showToast('Debe ingresar el valor y la etiqueta.', 'warning');
      return;
    }
    try {
      await dataService.addServiceStrategy(newStrategyValue.trim(), newStrategyLabel.trim());
      setNewStrategyValue('');
      setNewStrategyLabel('');
      await fetchStrategies();
      showToast('Nueva estrategia creada.');
    } catch (e) {
      showToast('Error al crear estrategia.', 'error');
    }
  };

  const handleDeleteStrategy = async (value) => {
    if (!await confirm('¿Estás seguro de eliminar esta estrategia?')) return;
    try {
      await dataService.deleteServiceStrategy(value);
      await fetchStrategies();
      showToast('Estrategia eliminada.');
    } catch (e) {
      showToast('Error al eliminar estrategia.', 'error');
    }
  };

  const handleAddMasterChecklistItem = async () => {
    if (!newItemName) return;
    try {
      await dataService.addChecklistItem(newItemName, Number(newItemCost));
      setNewItemName('');
      setNewItemCost('0.50');
      setShowAddItemInput(false);
      await fetchBaseItems();
      showToast('Nuevo extra agregado al maestro.');
    } catch (e) {
      showToast('Error al agregar extra.', 'error');
    }
  };

  const handleUpdateMasterItem = async (id, name, base_cost) => {
    try {
      await dataService.updateChecklistItem(id, { name, base_cost: Number(base_cost) });
      await fetchBaseItems();
      showToast('Ítem del checklist actualizado.');
    } catch (e) {
      showToast('Error al actualizar ítem.', 'error');
    }
  };

  const handleDeleteMasterItem = async (e, id, name) => {
    e.stopPropagation();
    if (!await confirm(`¿Eliminar "${name}" del checklist maestro?`)) return;
    try {
      await dataService.deleteChecklistItem(id);
      await fetchBaseItems();
      showToast('Ítem eliminado.');
    } catch (e) {
      showToast('Error al eliminar ítem.', 'error');
    }
  };

  const handleAddBillableExtra = async () => {
    if (!newExtraName) return;
    try {
      await dataService.addExtra({
        name: newExtraName,
        price: Number(newExtraPrice),
        cost: Number(newExtraCost)
      });
      setNewExtraName('');
      setNewExtraPrice('2.00');
      setNewExtraCost('0.50');
      await fetchBillableExtras();
      showToast('Servicio adicional (Extra) creado.');
    } catch (e) {
      showToast('Error al crear extra.', 'error');
    }
  };

  const handleUpdateBillableExtra = async (id, updates) => {
    try {
      await dataService.updateExtra(id, updates);
      await fetchBillableExtras();
      showToast('Extra actualizado.');
    } catch (e) {
      showToast('Error al actualizar extra.', 'error');
    }
  };

  const handleDeleteBillableExtra = async (e, id, name) => {
    e.stopPropagation();
    if (!await confirm(`¿Archivar el extra "${name}"? Se mantendrá en el historial pero ya no se podrá seleccionar para nuevos servicios.`)) return;
    try {
      await dataService.deleteExtra(id);
      await fetchBillableExtras();
      showToast('Extra archivado correctamente.');
    } catch (e) {
      showToast('Error al archivar el extra.', 'error');
    }
  };

  const handleDeleteService = async (id, name) => {
    if (!await confirm(`¿Archivar el servicio "${name}"? Se mantendrá en el historial pero ya no se podrá seleccionar.`)) return;
    try {
      setLoading(true);
      await dataService.deleteService(id);
      await fetchServices();
      showToast(`Servicio "${name}" archivado.`);
    } catch (e) {
      showToast('Error al archivar el servicio.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const [showAddForm, setShowAddForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newService, setNewService] = useState({ 
    name: '', 
    price: '', 
    category: 'Barbería',
    strategy_type: 'MVP',
    duration: 30,
    insumo_cost: 0,
    variable_cost: 0.50,
    included_items: [],
    commission_barber: 40,
    commission_washer: 0,
    commission_cashier: 0,
    commission_receptionist: 0
  });

  const handleEditClick = (service) => {
    setIsEditing(true);
    setNewService({
      id: service.id,
      name: service.name,
      price: service.price,
      category: service.category,
      strategy_type: service.strategy_type || 'MVP',
      duration: service.duration || 30,
      description: service.description || '',
      included_items: service.included_items || [],
      commission_barber: service.commission_barber || 40,
      commission_washer: 0,
      commission_cashier: 0,
      commission_receptionist: 0
    });
    setShowAddForm(true);
  };

  const handleCreateService = async () => {
    if (!newService.name || !newService.price) return;
    try {
      setLoading(true);
      if (isEditing && newService.id) {
        await dataService.updateService(newService.id, newService);
        showToast(`¡Servicio ${newService.name} actualizado!`);
      } else {
        await dataService.addService(newService);
        showToast(`¡Servicio ${newService.name} agregado al catálogo!`);
      }
      setNewService({ 
        name: '', 
        price: '', 
        category: 'Barbería',
        strategy_type: 'MVP',
        duration: 30,
        insumo_cost: 0,
        variable_cost: 0.50,
        description: '',
        included_items: [],
        commission_barber: 40,
        commission_washer: 0,
        commission_cashier: 0,
        commission_receptionist: 0
      });
      setIsEditing(false);
      setShowAddForm(false);
      await fetchServices();
    } catch (e) {
      showToast('Error al guardar el servicio.', 'error');
    } finally {
      setLoading(false);
    }
  };

   // Effect to auto-calculate insumo_cost based on items + variable
  useEffect(() => {
    const itemsTotal = baseItems
      .filter(item => newService.included_items?.includes(item.name))
      .reduce((sum, item) => sum + (Number(item.base_cost) || 0), 0);
    
    setNewService(prev => ({
      ...prev,
      insumo_cost: Number((itemsTotal + (Number(prev.variable_cost) || 0)).toFixed(2))
    }));
  }, [newService.included_items, newService.variable_cost, baseItems]);

  const getCategoryIcon = (cat) => {
    switch(cat) {
      case 'Barbería': return <Scissors size={20} />;
      case 'Estilismo': return <Rocket size={20} />;
      case 'Tratamientos': return <Droplets size={20} />;
      default: return <Zap size={20} />;
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: isMobile ? '120px' : '60px' }}>
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: isMobile ? '20px' : '0',
        marginBottom: '40px'
      }}>
        <div>
          <h2 style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '800', letterSpacing: '-0.5px' }}><span className="text-gold">Servicios</span></h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Define tu oferta y servicios adicionales.</p>
        </div>
        <div style={{ 
          display: isMobile ? 'grid' : 'flex', 
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'none',
          gap: '12px', 
          alignItems: 'center',
          width: isMobile ? '100%' : 'auto'
        }}>
          {/* View Toggles */}
          {!isMobile && (
            <div style={{ 
              display: 'flex', 
              backgroundColor: 'rgba(255,255,255,0.03)', 
              borderRadius: '12px', 
              padding: '4px',
              border: '1px solid rgba(255,255,255,0.05)',
              marginRight: '12px'
            }}>
              <button 
                onClick={() => setViewMode('grid')}
                style={{ 
                  padding: '8px 12px', 
                  borderRadius: '8px', 
                  border: 'none', 
                  backgroundColor: viewMode === 'grid' ? 'rgba(212,175,55,0.1)' : 'transparent',
                  color: viewMode === 'grid' ? 'var(--gold-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: '700'
                }}
              >
                <LayoutGrid size={16} /> Tarjetas
              </button>
              <button 
                onClick={() => setViewMode('table')}
                style={{ 
                  padding: '8px 12px', 
                  borderRadius: '8px', 
                  border: 'none', 
                  backgroundColor: viewMode === 'table' ? 'rgba(212,175,55,0.1)' : 'transparent',
                  color: viewMode === 'table' ? 'var(--gold-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: '700'
                }}
              >
                <Table size={16} /> Tabla
              </button>
            </div>
          )}

          <button className="btn-gold" onClick={() => setIsCategoriesModalOpen(true)} style={{ backgroundColor: 'rgba(212,175,55,0.1)', color: 'var(--gold-primary)', border: '1px solid rgba(212,175,55,0.2)', justifyContent: 'center', width: isMobile ? '100%' : 'auto', padding: isMobile ? '10px 8px' : undefined, fontSize: isMobile ? '12px' : undefined }}>
            <Settings size={18} style={{ marginRight: '8px' }} />
            Categorías
          </button>
          <button className="btn-gold" onClick={() => setIsStrategiesModalOpen(true)} style={{ backgroundColor: 'rgba(212,175,55,0.1)', color: 'var(--gold-primary)', border: '1px solid rgba(212,175,55,0.2)', justifyContent: 'center', width: isMobile ? '100%' : 'auto', padding: isMobile ? '10px 8px' : undefined, fontSize: isMobile ? '12px' : undefined }}>
            <Crown size={18} style={{ marginRight: '8px' }} />
            Estrategias
          </button>
          <button className="btn-gold" onClick={() => setIsBillableExtrasModalOpen(true)} style={{ backgroundColor: 'rgba(212,175,55,0.1)', color: 'var(--gold-primary)', border: '1px solid rgba(212,175,55,0.2)', justifyContent: 'center', width: isMobile ? '100%' : 'auto', padding: isMobile ? '10px 8px' : undefined, fontSize: isMobile ? '12px' : undefined }}>
            <Rocket size={18} style={{ marginRight: '8px' }} />
            Extras
          </button>
          <button 
            className="btn-gold" 
            onClick={() => {
              if (showAddForm) {
                setShowAddForm(false);
                setIsEditing(false);
                setNewService({ 
                  name: '', 
                  price: '', 
                  category: 'Barbería',
                  strategy_type: 'MVP',
                  duration: 30,
                  insumo_cost: 0,
                  variable_cost: 0.50,
                  description: '',
                  included_items: [],
                  commission_barber: 40,
                  commission_washer: 0,
                  commission_cashier: 0,
                  commission_receptionist: 0
                });
              } else {
                setShowAddForm(true);
              }
            }} 
            style={{ height: '48px', padding: isMobile ? '10px 8px' : '0 24px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: isMobile ? '100%' : 'auto', fontSize: isMobile ? '12px' : undefined }}
          >
            {showAddForm ? <X size={18} /> : <Plus size={18} />}
            {showAddForm ? 'Cancelar' : 'Nuevo Servicio'}
          </button>
        </div>
        {showAddForm && !isEditing && (
        <div className="glass-card animate-slide-up" style={{ 
          marginBottom: '32px', 
          padding: '32px', 
          borderRadius: '28px', 
          position: 'relative', 
          zIndex: 999,
          overflow: 'visible' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '22px', fontWeight: '800', margin: 0 }}>
              Nuevo Servicio al Catálogo
            </h3>
            <button 
              onClick={() => { setShowAddForm(false); setIsEditing(false); }}
              style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', color: 'white', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={16} />
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: '32px' }}>
            {/* Left Column: Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>NOMBRE DEL SERVICIO</label>
                <div style={{ position: 'relative' }}>
                  <Scissors size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                  <input className="form-input" placeholder="Ej. Corte Suprema" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>DESCRIPCIÓN DEL SERVICIO</label>
                <textarea 
                  className="form-input" 
                  placeholder="Describe los beneficios premium del servicio..." 
                  value={newService.description || ''} 
                  onChange={e => setNewService({...newService, description: e.target.value})} 
                  onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                  ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                  style={{ width: '100%', minHeight: '80px', paddingTop: '12px', resize: 'none', fontSize: '13px', lineHeight: '1.5', overflow: 'hidden' }} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px' }}>PRECIO ($)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input className="form-input" type="number" placeholder="25" value={newService.price === 0 ? '' : newService.price} onChange={e => setNewService({...newService, price: e.target.value === '' ? '' : Number(e.target.value)})} style={{ flex: 1 }} />
                    {rates?.usd > 0 && (
                      <div style={{ padding: '0 16px', height: '48px', backgroundColor: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', color: 'var(--gold-primary)', fontSize: '13px', fontWeight: '800', whiteSpace: 'nowrap' }}>
                        {Math.round((Number(newService.price) || 0) * rates.usd).toLocaleString()} Bs.
                      </div>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px' }}>DURACIÓN (MIN)</label>
                  <input className="form-input" type="number" placeholder="45" value={newService.duration === 0 ? '' : newService.duration} onChange={e => setNewService({...newService, duration: e.target.value === '' ? '' : Number(e.target.value)})} style={{ width: '100%' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <AstroSelect 
                  label="CATEGORÍA"
                  value={newService.category}
                  onChange={val => setNewService({...newService, category: val})}
                  options={categories.map(cat => ({ label: cat, value: cat }))}
                />
                <AstroSelect 
                  label="ESTRATEGIA"
                  value={newService.strategy_type}
                  onChange={val => setNewService({...newService, strategy_type: val})}
                  options={strategies.map(strat => ({ label: strat.label, value: strat.value }))}
                />
              </div>
            </div>


            {/* Right Column: Checklist */}
            <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '1px' }}>
                  <LayoutList size={16} /> CHECKLIST (INCLUIDO)
                </label>
                <button 
                  onClick={() => setIsExtrasModalOpen(true)}
                  style={{ 
                    background: 'rgba(212,175,55,0.1)', 
                    border: '1px solid rgba(212,175,55,0.2)', 
                    borderRadius: '8px', 
                    padding: '4px 12px', 
                    fontSize: '10px',
                    fontWeight: '800',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    cursor: 'pointer', 
                    color: 'var(--gold-primary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  <Settings size={12} /> Items
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                {baseItems.map(item => (
                  <div key={item.id} style={{ position: 'relative' }} className="group">
                    <button 
                      onClick={() => {
                        const current = newService.included_items || [];
                        const next = current.includes(item.name) 
                          ? current.filter(i => i !== item.name)
                          : [...current, item.name];
                        setNewService({...newService, included_items: next});
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: newService.included_items?.includes(item.name) ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.02)',
                        border: newService.included_items?.includes(item.name) ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)',
                        color: newService.included_items?.includes(item.name) ? 'white' : 'var(--text-muted)'
                      }}
                    >
                      <div style={{ 
                        width: '18px', 
                        height: '18px', 
                        borderRadius: '4px', 
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: newService.included_items?.includes(item.name) ? 'var(--gold-primary)' : 'transparent'
                      }}>
                        {newService.included_items?.includes(item.name) && <Check size={12} color="black" strokeWidth={4} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700' }}>{item.name}</div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Commissions Distribution */}
            <div style={{ padding: '20px', borderRadius: '20px', backgroundColor: 'rgba(212,175,55,0.03)', border: '1px solid rgba(212,175,55,0.1)', gridColumn: isMobile ? 'span 1' : 'span 2' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '16px', letterSpacing: '1px' }}>
                <DollarSign size={14} /> DISTRIBUCIÓN DE COMISIONES (%)
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>COMISIÓN BARBERO (%)</label>
                  <input 
                    className="form-input" 
                    type="number" 
                    value={newService.commission_barber === 0 ? '' : newService.commission_barber} 
                    onChange={e => setNewService({...newService, commission_barber: e.target.value === '' ? '' : Number(e.target.value)})} 
                    style={{ width: '100%', fontSize: '16px', fontWeight: '900', color: 'var(--gold-primary)', height: '54px' }} 
                  />
                </div>
              </div>
              
              {/* Business Net Margin Indicator */}
              {(newService.price > 0) && (
                <div style={{ 
                  marginTop: '20px', 
                  padding: '16px', 
                  borderRadius: '16px', 
                  background: 'rgba(50, 215, 75, 0.05)', 
                  border: '1px solid rgba(50, 215, 75, 0.2)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: '800', color: '#32d74b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Margen Real Astro</div>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: 'white' }}>
                      ${((Number(newService.price) || 0) - ((Number(newService.price) || 0) * (Number(newService.commission_barber) || 0) / 100)).toFixed(2)}
                    </div>
                  </div>
                  {rates?.usd > 0 && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>EQUIVALENTE BS.</div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#32d74b' }}>
                        {Math.round(((Number(newService.price) || 0) - ((Number(newService.price) || 0) * (Number(newService.commission_barber) || 0) / 100)) * rates.usd).toLocaleString()} Bs.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-gold" onClick={handleCreateService} style={{ height: '54px', padding: '0 40px', fontSize: '16px', borderRadius: '16px' }}>
              Lanzar Servicio al Catálogo
            </button>
          </div>
        </div>
      )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
          <Loader2 className="animate-spin" color="var(--gold-primary)" size={40} />
        </div>
      ) : services.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '80px', borderRadius: '32px' }}>
          <Star size={64} color="rgba(212, 175, 55, 0.1)" style={{ marginBottom: '24px' }} />
          <h3 style={{ fontSize: '20px', color: 'var(--text-primary)' }}>Tu catálogo está vacío</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Comienza agregando los servicios que definirán tu marca.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {viewMode === 'grid' || isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {services.map(service => {
                if (isMobile) {
                  return (
                    <React.Fragment key={service.id}>
                      <div 
                        className="glass-card animate-slide-up" 
                        onClick={() => setSelectedServiceDetail(service)}
                        style={{ 
                          borderRadius: '24px',
                          padding: '20px',
                          border: '1px solid rgba(255,255,255,0.05)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px',
                          cursor: 'pointer',
                          transition: 'all 0.3s'
                        }}
                      >
                        {/* Top: Icon + Name & Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'rgba(212, 175, 55, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--gold-primary)' }}>
                              {getCategoryIcon(service.category)}
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: '9px', fontWeight: '900', color: 'var(--gold-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{service.category}</div>
                              <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'white', margin: '2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{service.name}</h4>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                <Clock size={12} /> {service.duration || 30} min
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                            <button 
                              className="action-btn" 
                              onClick={(e) => { e.stopPropagation(); handleEditClick(service); }} 
                              style={{ width: '36px', height: '36px', borderRadius: '10px' }}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteService(service.id, service.name); }} 
                              className="action-btn" 
                              style={{ width: '36px', height: '36px', borderRadius: '10px', color: '#ff453a', backgroundColor: 'rgba(255,69,58,0.1)' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Description */}
                        {service.description && (
                          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', margin: '0', lineHeight: '1.4', fontStyle: 'italic', borderLeft: '2px solid rgba(212, 175, 55, 0.3)', paddingLeft: '10px' }}>
                            {service.description}
                          </p>
                        )}

                        {/* Included Checklist Items */}
                        {(service.included_items || []).length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {(service.included_items || []).map((item, idx) => (
                              <span key={idx} style={{ fontSize: '10px', padding: '4px 10px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap' }}>
                                {item}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Bottom Info: Strategy Tag & Price */}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          gap: '16px',
                          borderTop: '1px solid rgba(255,255,255,0.06)',
                          paddingTop: '12px',
                          marginTop: '4px'
                        }}>
                          <div>
                            {service.strategy_type ? (
                              <div style={{ padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(212, 175, 55, 0.3)', fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)', backgroundColor: 'rgba(212, 175, 55, 0.05)' }}>
                                {service.strategy_type}
                              </div>
                            ) : <div />}
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PRECIO</div>
                            <div style={{ fontSize: '18px', fontWeight: '900', color: 'white', display: 'flex', alignItems: 'baseline', gap: '6px', justifyContent: 'flex-end' }}>
                              <span>${service.price}</span>
                              {rates?.usd > 0 && (
                                <span style={{ fontSize: '12px', color: 'var(--gold-primary)', fontWeight: '700' }}>
                                  ≈ {Math.round(service.price * rates.usd).toLocaleString()} Bs.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Inline Edit Form for mobile grid item */}
                      {showAddForm && isEditing && newService.id === service.id && (
                        <div className="glass-card animate-slide-up" style={{ 
                          marginTop: '-6px',
                          marginBottom: '16px', 
                          padding: '20px', 
                          borderRadius: '20px', 
                          border: '1px solid rgba(212,175,55,0.3)',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>
                              Editar: <span className="text-gold">{service.name}</span>
                            </h4>
                            <button 
                              onClick={() => { setShowAddForm(false); setIsEditing(false); }}
                              style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', color: 'white', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                          
                          <div className="form-group">
                            <label style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)' }}>NOMBRE</label>
                            <input className="form-input" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} style={{ width: '100%', height: '44px' }} />
                          </div>

                          <div className="form-group">
                            <label style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)' }}>DESCRIPCIÓN</label>
                            <textarea className="form-input" value={newService.description || ''} onChange={e => setNewService({...newService, description: e.target.value})} onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }} style={{ width: '100%', minHeight: '60px', paddingTop: '8px', resize: 'none', overflow: 'hidden' }} />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div className="form-group">
                              <label style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)' }}>PRECIO ($)</label>
                              <input className="form-input" type="number" value={newService.price} onChange={e => setNewService({...newService, price: Number(e.target.value)})} style={{ width: '100%' }} />
                            </div>
                            <div className="form-group">
                              <label style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)' }}>DURACIÓN (MIN)</label>
                              <input className="form-input" type="number" value={newService.duration} onChange={e => setNewService({...newService, duration: Number(e.target.value)})} style={{ width: '100%' }} />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <AstroSelect label="CATEGORÍA" value={newService.category} onChange={val => setNewService({...newService, category: val})} options={categories.map(cat => ({ label: cat, value: cat }))} />
                            <AstroSelect label="ESTRATEGIA" value={newService.strategy_type} onChange={val => setNewService({...newService, strategy_type: val})} options={strategies.map(strat => ({ label: strat.label, value: strat.value }))} />
                          </div>

                          <div className="form-group">
                            <label style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)' }}>COMISIÓN BARBERO (%)</label>
                            <input className="form-input" type="number" value={newService.commission_barber} onChange={e => setNewService({...newService, commission_barber: Number(e.target.value)})} style={{ width: '100%', color: 'var(--gold-primary)', fontWeight: '900' }} />
                          </div>

                          <button className="btn-gold" onClick={handleCreateService} style={{ height: '48px', borderRadius: '12px', fontSize: '14px', fontWeight: '800' }}>
                            Guardar Cambios
                          </button>
                        </div>
                      )}
                    </React.Fragment>
                  );
                }

                // Desktop / non-mobile card
                return (
                  <React.Fragment key={service.id}>
                    <div className="glass-card animate-slide-up" style={{ 
                      borderRadius: '24px',
                      padding: '20px 28px',
                      border: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '32px',
                      transition: 'all 0.3s'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: '260px', maxAdaptiveWidth: '30%' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: 'rgba(212, 175, 55, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--gold-primary)' }}>
                          {getCategoryIcon(service.category)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>{service.category}</div>
                          <h4 style={{ fontSize: '17px', fontWeight: '800', color: 'white', margin: '4px 0 2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{service.name}</h4>
                          {service.description && (
                            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', margin: '4px 0', lineHeight: '1.4', fontStyle: 'italic' }}>{service.description}</p>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                            <Clock size={13} style={{ color: 'var(--gold-primary)' }} /> <span>{service.duration || 30} min</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '0 16px' }}>
                        {(service.included_items || []).map((item, idx) => (
                          <span key={idx} style={{ fontSize: '10.5px', padding: '5px 12px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            {item}
                          </span>
                        ))}
                      </div>

                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '40px',
                        flexShrink: 0
                      }}>
                        {service.strategy_type && (
                          <div style={{ padding: '5px 14px', borderRadius: '20px', border: '1px solid rgba(212, 175, 55, 0.3)', fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)', backgroundColor: 'rgba(212, 175, 55, 0.05)', letterSpacing: '0.5px' }}>
                            {service.strategy_type}
                          </div>
                        )}
                        
                        <div style={{ textAlign: 'right', minWidth: '110px' }}>
                          <div style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>PRECIO</div>
                          <div style={{ fontSize: '20px', fontWeight: '950', color: 'white', margin: '2px 0' }}>${service.price}</div>
                          {rates?.usd > 0 && (
                            <div style={{ fontSize: '12px', color: 'var(--gold-primary)', fontWeight: '800' }}>
                              ≈ {Math.round(service.price * rates.usd).toLocaleString()} Bs.
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button className="action-btn" onClick={() => handleEditClick(service)} style={{ width: '38px', height: '38px', borderRadius: '10px' }}>
                            <Edit2 size={15} />
                          </button>
                          <button onClick={() => handleDeleteService(service.id, service.name)} className="action-btn" style={{ width: '38px', height: '38px', borderRadius: '10px', color: '#ff453a', backgroundColor: 'rgba(255,69,58,0.1)' }}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Inline Edit Form for desktop card item */}
                    {showAddForm && isEditing && newService.id === service.id && (
                      <div className="glass-card animate-slide-up" style={{ 
                        marginTop: '-12px',
                        marginBottom: '24px', 
                        marginLeft: '20px',
                        padding: '32px', 
                        borderRadius: '28px', 
                        position: 'relative', 
                        zIndex: 998,
                        overflow: 'visible',
                        border: '1px solid rgba(212,175,55,0.3)',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                          <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>
                            Editar Servicio: <span className="text-gold">{service.name}</span>
                          </h3>
                          <button 
                            onClick={() => { setShowAddForm(false); setIsEditing(false); }}
                            style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', color: 'white', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px' }}>
                          {/* Left Column: Form Fields */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="form-group">
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>NOMBRE DEL SERVICIO</label>
                              <div style={{ position: 'relative' }}>
                                <Scissors size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                                <input className="form-input" placeholder="Ej. Corte Suprema" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                              </div>
                            </div>

                            <div className="form-group">
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>DESCRIPCIÓN DEL SERVICIO</label>
                              <textarea 
                                className="form-input" 
                                placeholder="Describe los beneficios premium del servicio..." 
                                value={newService.description || ''} 
                                onChange={e => setNewService({...newService, description: e.target.value})} 
                                onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                                ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                                style={{ width: '100%', minHeight: '80px', paddingTop: '12px', resize: 'none', fontSize: '13px', lineHeight: '1.5', overflow: 'hidden' }} 
                              />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <div className="form-group">
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px' }}>PRECIO ($)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <input className="form-input" type="number" placeholder="25" value={newService.price === 0 ? '' : newService.price} onChange={e => setNewService({...newService, price: e.target.value === '' ? '' : Number(e.target.value)})} style={{ flex: 1 }} />
                                  {rates?.usd > 0 && (
                                    <div style={{ padding: '0 16px', height: '48px', backgroundColor: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', color: 'var(--gold-primary)', fontSize: '13px', fontWeight: '800', whiteSpace: 'nowrap' }}>
                                      {Math.round((Number(newService.price) || 0) * rates.usd).toLocaleString()} Bs.
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="form-group">
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px' }}>DURACIÓN (MIN)</label>
                                <input className="form-input" type="number" placeholder="45" value={newService.duration === 0 ? '' : newService.duration} onChange={e => setNewService({...newService, duration: e.target.value === '' ? '' : Number(e.target.value)})} style={{ width: '100%' }} />
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <AstroSelect 
                                label="CATEGORÍA"
                                value={newService.category}
                                onChange={val => setNewService({...newService, category: val})}
                                options={categories.map(cat => ({ label: cat, value: cat }))}
                              />
                              <AstroSelect 
                                label="ESTRATEGIA"
                                value={newService.strategy_type}
                                onChange={val => setNewService({...newService, strategy_type: val})}
                                options={strategies.map(strat => ({ label: strat.label, value: strat.value }))}
                              />
                            </div>
                          </div>

                          {/* Right Column: Checklist */}
                          <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '1px' }}>
                                <LayoutList size={16} /> CHECKLIST (INCLUIDO)
                              </label>
                              <button 
                                onClick={() => setIsExtrasModalOpen(true)}
                                style={{ 
                                  background: 'rgba(212,175,55,0.1)', 
                                  border: '1px solid rgba(212,175,55,0.2)', 
                                  borderRadius: '8px', 
                                  padding: '4px 12px', 
                                  fontSize: '10px',
                                  fontWeight: '800',
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '6px',
                                  cursor: 'pointer', 
                                  color: 'var(--gold-primary)',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px'
                                }}
                              >
                                <Settings size={12} /> Items
                              </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                              {baseItems.map(item => (
                                <div key={item.id} style={{ position: 'relative' }} className="group">
                                  <button 
                                    onClick={() => {
                                      const current = newService.included_items || [];
                                      const next = current.includes(item.name) 
                                        ? current.filter(i => i !== item.name)
                                        : [...current, item.name];
                                      setNewService({...newService, included_items: next});
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '10px 14px',
                                      borderRadius: '12px',
                                      fontSize: '13px',
                                      textAlign: 'left',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '10px',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s',
                                      background: newService.included_items?.includes(item.name) ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.02)',
                                      border: newService.included_items?.includes(item.name) ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)',
                                      color: newService.included_items?.includes(item.name) ? 'white' : 'var(--text-muted)'
                                    }}
                                  >
                                    <div style={{ 
                                      width: '18px', 
                                      height: '18px', 
                                      borderRadius: '4px', 
                                      border: '1px solid var(--border-color)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      backgroundColor: newService.included_items?.includes(item.name) ? 'var(--gold-primary)' : 'transparent'
                                    }}>
                                      {newService.included_items?.includes(item.name) && <Check size={12} color="black" strokeWidth={4} />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontWeight: '700' }}>{item.name}</div>
                                    </div>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Commissions Distribution */}
                          <div style={{ padding: '20px', borderRadius: '20px', backgroundColor: 'rgba(212,175,55,0.03)', border: '1px solid rgba(212,175,55,0.1)', gridColumn: 'span 2' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '16px', letterSpacing: '1px' }}>
                              <DollarSign size={14} /> DISTRIBUCIÓN DE COMISIONES (%)
                            </label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div className="form-group">
                                <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>COMISIÓN BARBERO (%)</label>
                                <input 
                                  className="form-input" 
                                  type="number" 
                                  value={newService.commission_barber === 0 ? '' : newService.commission_barber} 
                                  onChange={e => setNewService({...newService, commission_barber: e.target.value === '' ? '' : Number(e.target.value)})} 
                                  style={{ width: '100%', fontSize: '16px', fontWeight: '900', color: 'var(--gold-primary)', height: '54px' }} 
                                />
                              </div>
                            </div>
                            
                            {/* Business Net Margin Indicator */}
                            {(newService.price > 0) && (
                              <div style={{ 
                                marginTop: '20px', 
                                padding: '16px', 
                                borderRadius: '16px', 
                                background: 'rgba(50, 215, 75, 0.05)', 
                                border: '1px solid rgba(50, 215, 75, 0.2)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}>
                                <div>
                                  <div style={{ fontSize: '10px', fontWeight: '800', color: '#32d74b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Margen Real Astro</div>
                                  <div style={{ fontSize: '20px', fontWeight: '900', color: 'white' }}>
                                    ${((Number(newService.price) || 0) - ((Number(newService.price) || 0) * (Number(newService.commission_barber) || 0) / 100)).toFixed(2)}
                                  </div>
                                </div>
                                {rates?.usd > 0 && (
                                  <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>EQUIVALENTE BS.</div>
                                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#32d74b' }}>
                                      {Math.round(((Number(newService.price) || 0) - ((Number(newService.price) || 0) * (Number(newService.commission_barber) || 0) / 100)) * rates.usd).toLocaleString()} Bs.
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
                          <button className="btn-gold" onClick={handleCreateService} style={{ height: '54px', padding: '0 40px', fontSize: '16px', borderRadius: '16px' }}>
                            Guardar Cambios
                          </button>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          ) : (
            <div className="glass-card animate-fade-in" style={{ padding: '0', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.03)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Servicio</th>
                    <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Categoría</th>
                    <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Duración</th>
                    <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Precio</th>
                    <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Comisiones (%)</th>
                    <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service) => (
                    <tr key={service.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background-color 0.2s' }} className="table-row-hover">
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: '700', color: 'white', marginBottom: '4px' }}>{service.name}</div>
                        {service.description && <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{service.description}</div>}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--gold-primary)', backgroundColor: 'rgba(212,175,55,0.05)', padding: '4px 10px', borderRadius: '8px' }}>
                          {service.category}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {service.duration} min
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: '800', color: 'white' }}>${service.price}</div>
                        {rates?.usd > 0 && <div style={{ fontSize: '11px', color: 'var(--gold-primary)' }}>{Math.round(service.price * rates.usd).toLocaleString()} Bs.</div>}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <span title="Comisión del Barbero" style={{ fontSize: '11px', color: '#32d74b', fontWeight: '700' }}>
                            Barbero: {service.commission_barber}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button className="action-btn" onClick={() => handleEditClick(service)} style={{ width: '32px', height: '32px' }}>
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDeleteService(service.id, service.name)} className="action-btn" style={{ width: '32px', height: '32px', color: '#ff453a', backgroundColor: 'rgba(255,69,58,0.1)' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

       {/* Extras Manager Modal */}
      {isExtrasModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(15px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 3000, padding: '20px'
        }}>
          <div className="glass-card animate-scale-in" style={{
            width: '100%', maxWidth: '420px', maxHeight: '80vh',
            display: 'flex', flexDirection: 'column', padding: '24px',
            borderRadius: '28px', border: '1px solid rgba(212,175,55,0.2)',
            boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.5px' }}><span className="text-gold">Items</span></h3>
              </div>
              <button 
                onClick={() => setIsExtrasModalOpen(false)} 
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px', overflowX: 'hidden' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {baseItems.map(item => (
                  <div key={item.id} style={{ 
                    display: 'flex', gap: '8px', alignItems: 'center', 
                    padding: '6px 10px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    <input 
                      className="form-input" 
                      value={editingItem?.id === item.id ? editingItem.name : item.name} 
                      onChange={(e) => setEditingItem({ ...(editingItem || item), id: item.id, name: e.target.value })}
                      onFocus={() => setEditingItem(item)}
                      style={{ flex: 1, fontSize: '13px', height: '36px', background: 'transparent', border: 'none', fontWeight: '600', minWidth: 0 }}
                    />

                    
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {editingItem?.id === item.id ? (
                        <button 
                          onClick={() => {
                            handleUpdateMasterItem(item.id, editingItem.name, editingItem.base_cost);
                            setEditingItem(null);
                          }}
                          style={{ backgroundColor: '#32d74b', color: 'black', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          <Check size={16} strokeWidth={3} />
                        </button>
                      ) : (
                        <>
                          <button 
                            onClick={() => setEditingItem(item)}
                            style={{ backgroundColor: 'rgba(212,175,55,0.1)', color: 'var(--gold-primary)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          >
                            <Pencil size={14} />
                          </button>
                          <button 
                            onClick={(e) => handleDeleteMasterItem(e, item.id, item.name)}
                            style={{ backgroundColor: 'rgba(255,69,58,0.1)', color: '#ff453a', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input 
                  className="form-input" 
                  placeholder="Nuevo ítem..." 
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  style={{ flex: 1, height: '40px', fontSize: '13px', minWidth: 0 }}
                />

                <button onClick={handleAddMasterChecklistItem} className="btn-gold" style={{ width: '40px', height: '40px', borderRadius: '10px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Billable Extras Management Modal */}
      {isBillableExtrasModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card animate-scale-in" style={{ width: '100%', maxWidth: '500px', padding: '32px', borderRadius: '32px', border: '1px solid rgba(212,175,55,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Rocket size={24} color="var(--gold-primary)" /> Servicios Adicionales (Extras)
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Servicios con costo extra que se añaden en caja.</p>
              </div>
              <button onClick={() => setIsBillableExtrasModalOpen(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '8px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {billableExtras.map(extra => (
                  <div key={extra.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <input 
                        className="form-input"
                        value={editingExtra?.id === extra.id ? editingExtra.name : extra.name}
                        onChange={e => setEditingExtra({ ...(editingExtra || extra), id: extra.id, name: e.target.value })}
                        readOnly={editingExtra?.id !== extra.id}
                        style={{ 
                          background: 'transparent', 
                          border: 'none', 
                          padding: 0, 
                          height: 'auto', 
                          fontSize: '14px', 
                          fontWeight: '700', 
                          width: '100%',
                          color: editingExtra?.id === extra.id ? 'var(--gold-primary)' : 'white',
                          pointerEvents: editingExtra?.id === extra.id ? 'auto' : 'none'
                        }}
                      />
                      <div style={{ fontSize: '11px', color: 'var(--gold-primary)', marginTop: '4px', fontWeight: '800' }}>PRECIO EN CAJA</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <div style={{ position: 'relative', width: '80px' }}>
                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gold-primary)', fontSize: '11px', fontWeight: '800' }}>$</span>
                        <input 
                          className="form-input"
                          type="number"
                          step="0.01"
                          value={editingExtra?.id === extra.id ? editingExtra.price : extra.price}
                          onChange={e => setEditingExtra({ ...(editingExtra || extra), id: extra.id, price: e.target.value })}
                          readOnly={editingExtra?.id !== extra.id}
                          style={{ 
                            height: '36px', 
                            paddingLeft: '22px', 
                            fontSize: '13px', 
                            fontWeight: '800', 
                            textAlign: 'right', 
                            background: editingExtra?.id === extra.id ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.2)', 
                            border: editingExtra?.id === extra.id ? '1px solid var(--gold-primary)' : '1px solid transparent', 
                            width: '100%',
                            pointerEvents: editingExtra?.id === extra.id ? 'auto' : 'none'
                          }}
                        />
                      </div>
                      
                      {editingExtra?.id === extra.id ? (
                        <button onClick={() => { handleUpdateBillableExtra(extra.id, { name: editingExtra.name, price: Number(editingExtra.price) }); setEditingExtra(null); }} className="action-btn" style={{ backgroundColor: '#32d74b', color: 'black', flexShrink: 0 }}>
                          <Check size={16} strokeWidth={3} />
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => setEditingExtra(extra)} className="action-btn" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', flexShrink: 0 }}>
                            <Pencil size={14} />
                          </button>
                          <button onClick={(e) => handleDeleteBillableExtra(e, extra.id, extra.name)} className="action-btn" style={{ backgroundColor: 'rgba(255,69,58,0.1)', color: '#ff453a', flexShrink: 0 }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '0.5px' }}>NOMBRE DEL EXTRA</label>
                  <input className="form-input" placeholder="Ej. Mascarilla..." value={newExtraName} onChange={e => setNewExtraName(e.target.value)} style={{ height: '44px', fontSize: '13px', width: '100%' }} />
                </div>
                <div style={{ width: '90px', flexShrink: 0 }}>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '0.5px' }}>PRECIO</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gold-primary)', fontSize: '12px', fontWeight: '800' }}>$</span>
                    <input className="form-input" type="number" step="0.01" value={newExtraPrice} onChange={e => setNewExtraPrice(e.target.value)} style={{ height: '44px', paddingLeft: '24px', fontSize: '13px', fontWeight: '800', width: '100%' }} />
                  </div>
                </div>
                <button onClick={handleAddBillableExtra} className="btn-gold" style={{ height: '44px', width: '44px', borderRadius: '12px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Plus size={24} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
       {/* Details Modal */}
      {selectedServiceDetail && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 3000, padding: '20px'
        }}>
          <div className="glass-card animate-scale-in" style={{
            width: '100%', maxWidth: '440px',
            padding: '24px', borderRadius: '28px',
            border: '1px solid rgba(212,175,55,0.2)',
            boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.6)',
            position: 'relative'
          }}>
            <button 
              onClick={() => setSelectedServiceDetail(null)} 
              style={{ position: 'absolute', right: '20px', top: '20px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-primary)' }}>
                {getCategoryIcon(selectedServiceDetail.category)}
              </div>
              <div>
                <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{selectedServiceDetail.category}</span>
                {selectedServiceDetail.strategy_type && (
                  <span style={{ marginLeft: '8px', fontSize: '9px', fontWeight: '900', backgroundColor: 'rgba(212,175,55,0.1)', padding: '2px 8px', borderRadius: '10px', border: '1px solid rgba(212,175,55,0.2)', color: 'var(--gold-primary)' }}>
                    {selectedServiceDetail.strategy_type}
                  </span>
                )}
              </div>
            </div>

            <h3 style={{ fontSize: '22px', fontWeight: '800', color: 'white', marginBottom: '16px' }}>{selectedServiceDetail.name}</h3>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '10px' }}>
                <Clock size={14} color="var(--gold-primary)" />
                <strong>Duración:</strong> {selectedServiceDetail.duration || 30} min
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '10px' }}>
                <Scissors size={14} color="var(--gold-primary)" />
                <strong>Comisión:</strong> {selectedServiceDetail.commission_barber}%
              </div>
            </div>

            {selectedServiceDetail.description && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>Guión de Venta / Descripción</div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5', margin: 0, padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(0,0,0,0.2)', fontStyle: 'italic', border: '1px solid rgba(255,255,255,0.03)' }}>
                  "{selectedServiceDetail.description}"
                </p>
              </div>
            )}

            {selectedServiceDetail.included_items && selectedServiceDetail.included_items.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Checklist Incluido ({selectedServiceDetail.included_items.length})</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {selectedServiceDetail.included_items.map((item, idx) => (
                    <span key={idx} style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '8px', backgroundColor: 'rgba(212,175,55,0.05)', color: 'white', border: '1px solid rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Check size={12} color="var(--gold-primary)" strokeWidth={3} /> {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              borderTop: '1px solid rgba(255,255,255,0.08)', 
              paddingTop: '20px',
              marginBottom: '20px'
            }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Precio Base</div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: 'white' }}>${selectedServiceDetail.price}</div>
              </div>
              {rates?.usd > 0 && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Precio en Bolívares</div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--gold-primary)' }}>
                    {Math.round(selectedServiceDetail.price * rates.usd).toLocaleString()} Bs.
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => {
                  setSelectedServiceDetail(null);
                  handleEditClick(selectedServiceDetail);
                }} 
                className="btn-gold" 
                style={{ flex: 1, height: '44px', borderRadius: '12px' }}
              >
                Editar Servicio
              </button>
              <button 
                onClick={() => setSelectedServiceDetail(null)} 
                style={{ flex: 1, height: '44px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', fontWeight: '700', transition: 'background-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Categorías */}
      {isCategoriesModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 3000, padding: '20px'
        }}>
          <div className="glass-card animate-scale-in" style={{
            width: '100%', maxWidth: '480px',
            padding: '28px', borderRadius: '28px',
            border: '1px solid rgba(212,175,55,0.2)',
            boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.6)',
            position: 'relative'
          }}>
            <button 
              onClick={() => setIsCategoriesModalOpen(false)} 
              style={{ position: 'absolute', right: '20px', top: '20px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'white', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={20} color="var(--gold-primary)" /> Gestionar Categorías
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '20px' }}>Agrega o elimina las categorías disponibles para clasificar tus servicios.</p>

            {/* Agregar Categoría */}
            <div style={{ marginBottom: '24px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px' }}>NUEVA CATEGORÍA</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  className="form-input" 
                  placeholder="Ej. Manicura, Masajes" 
                  value={newCategoryName} 
                  onChange={e => setNewCategoryName(e.target.value)} 
                  style={{ height: '44px', flex: 1 }} 
                />
                <button 
                  onClick={handleAddCategory} 
                  className="btn-gold" 
                  style={{ height: '44px', width: '44px', borderRadius: '12px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >
                  <Plus size={24} />
                </button>
              </div>
            </div>

            {/* Listado de Categorías */}
            <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              {categories.map((cat, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ color: 'var(--gold-primary)' }}>
                      {getCategoryIcon(cat)}
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{cat}</span>
                  </div>
                  <button 
                    onClick={() => handleDeleteCategory(cat)} 
                    style={{ background: 'rgba(255,69,58,0.1)', border: 'none', color: '#ff453a', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
              <button 
                onClick={() => setIsCategoriesModalOpen(false)} 
                className="btn-gold" 
                style={{ flex: 1, height: '44px', borderRadius: '12px' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Estrategias */}
      {isStrategiesModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 3000, padding: '20px'
        }}>
          <div className="glass-card animate-scale-in" style={{
            width: '100%', maxWidth: '520px',
            padding: '28px', borderRadius: '28px',
            border: '1px solid rgba(212,175,55,0.2)',
            boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.6)',
            position: 'relative'
          }}>
            <button 
              onClick={() => setIsStrategiesModalOpen(false)} 
              style={{ position: 'absolute', right: '20px', top: '20px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'white', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Crown size={20} color="var(--gold-primary)" /> Gestionar Estrategias de Venta
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '20px' }}>Configura los tipos de estrategias de venta cruzada y retención para tus servicios.</p>

            {/* Agregar Estrategia */}
            <div style={{ marginBottom: '24px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px' }}>VALOR CLAVE</label>
                  <input 
                    className="form-input" 
                    placeholder="Ej. VIP, Promo" 
                    value={newStrategyValue} 
                    onChange={e => setNewStrategyValue(e.target.value)} 
                    style={{ height: '44px', width: '100%' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px' }}>ETIQUETA VISIBLE</label>
                  <input 
                    className="form-input" 
                    placeholder="Ej. Servicio VIP Astro" 
                    value={newStrategyLabel} 
                    onChange={e => setNewStrategyLabel(e.target.value)} 
                    style={{ height: '44px', width: '100%' }} 
                  />
                </div>
              </div>
              <button 
                onClick={handleAddStrategy} 
                className="btn-gold" 
                style={{ height: '44px', width: '100%', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Plus size={18} /> Agregar Estrategia
              </button>
            </div>

            {/* Listado de Estrategias */}
            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              {strategies.map((strat, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{strat.label}</span>
                    <span style={{ fontSize: '11px', color: 'var(--gold-primary)', fontWeight: '900' }}>VALOR: {strat.value}</span>
                  </div>
                  <button 
                    onClick={() => handleDeleteStrategy(strat.value)} 
                    style={{ background: 'rgba(255,69,58,0.1)', border: 'none', color: '#ff453a', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
              <button 
                onClick={() => setIsStrategiesModalOpen(false)} 
                className="btn-gold" 
                style={{ flex: 1, height: '44px', borderRadius: '12px' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesModule;
