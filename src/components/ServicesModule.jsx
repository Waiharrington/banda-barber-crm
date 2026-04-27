import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Clock, Scissors, 
  Sparkles, Droplets, Zap, Check, X, Loader2,
  Settings, DollarSign, LayoutList, Star, Crown
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';

const AstroSelect = ({ label, value, onChange, options }) => (
  <div className="form-group" style={{ flex: 1 }}>
    <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>{label}</label>
    <div style={{ position: 'relative' }}>
      <select 
        value={value} 
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%',
          backgroundColor: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '12px 16px',
          color: 'white',
          fontSize: '14px',
          appearance: 'none',
          cursor: 'pointer',
          outline: 'none'
        }}
      >
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }}>
        <Zap size={14} />
      </div>
    </div>
  </div>
);

const ServicesModule = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExtrasModalOpen, setIsExtrasModalOpen] = useState(false);
  const [baseItems, setBaseItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCost, setNewItemCost] = useState('0.50');
  const [showAddItemInput, setShowAddItemInput] = useState(false);
  const { showToast } = useNotifs();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    fetchServices();
    fetchBaseItems();
    return () => window.removeEventListener('resize', handleResize);
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
      showToast('Error al cargar extras.', 'error');
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
      showToast('Extra actualizado.');
    } catch (e) {
      showToast('Error al actualizar extra.', 'error');
    }
  };

  const handleDeleteMasterItem = async (e, id, name) => {
    e.stopPropagation();
    if (window.confirm(`¿Seguro que quieres borrar "${name}" de la lista maestra?`)) {
      try {
        await dataService.deleteChecklistItem(id);
        await fetchBaseItems();
        showToast('Extra eliminado.');
      } catch (e) {
        showToast('Error al eliminar extra.', 'error');
      }
    }
  };

  const handleDeleteService = async (id, name) => {
    if (!window.confirm(`¿Estás seguro de eliminar "${name}"?`)) return;
    try {
      setLoading(true);
      await dataService.deleteService(id);
      await fetchServices();
      showToast(`Servicio ${name} eliminado.`);
    } catch (e) {
      showToast('Error al eliminar servicio.', 'error');
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
    commission_washer: 10,
    commission_cashier: 0,
    commission_receptionist: 0
  });

  const handleEditClick = (service) => {
    setNewService({
      ...service,
      variable_cost: service.variable_cost || 0.50,
      included_items: service.included_items || [],
      commission_barber: service.commission_barber || 40,
      commission_washer: service.commission_washer || 10,
      commission_cashier: service.commission_cashier || 0,
      commission_receptionist: service.commission_receptionist || 0
    });
    setIsEditing(true);
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
        included_items: [],
        commission_barber: 40,
        commission_washer: 10,
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
      case 'Estilismo': return <Sparkles size={20} />;
      case 'Tratamientos': return <Droplets size={20} />;
      default: return <Zap size={20} />;
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: isMobile ? '80px' : '0' }}>
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: isMobile ? '20px' : '0',
        marginBottom: '40px'
      }}>
        <div>
          <h2 style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '800', letterSpacing: '-0.5px' }}>
            Catálogo de <span className="text-gold">Experiencias</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Define los servicios y el valor de tu arte.</p>
        </div>
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
                included_items: [],
                commission_barber: 40,
                commission_washer: 10,
                commission_cashier: 0,
                commission_receptionist: 0
              });
            } else {
              setShowAddForm(true);
            }
          }} 
          style={{ height: '48px', padding: '0 24px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {showAddForm ? <X size={18} /> : <Plus size={18} />}
          {showAddForm ? 'Cancelar' : 'Agregar Servicio'}
        </button>
      </div>

           {showAddForm && (
          <div className="glass-card animate-slide-up" style={{ marginBottom: '32px', padding: '32px', borderRadius: '28px' }}>
            <h3 style={{ marginBottom: '24px', fontSize: '22px', fontWeight: '800' }}>
              {isEditing ? `Editando Servicio: ${newService.name}` : 'Nueva Experiencia Astro'}
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '32px' }}>
              {/* Left Column: Basic Info & Commissions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Basic Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px' }}>NOMBRE DEL SERVICIO</label>
                    <input className="form-input" placeholder="Ej. Corte Astro MVP" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} style={{ width: '100%' }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px' }}>PRECIO ($)</label>
                      <input className="form-input" type="number" placeholder="25" value={newService.price} onChange={e => setNewService({...newService, price: Number(e.target.value)})} style={{ width: '100%' }} />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px' }}>DURACIÓN (MIN)</label>
                      <input className="form-input" type="number" placeholder="45" value={newService.duration} onChange={e => setNewService({...newService, duration: Number(e.target.value)})} style={{ width: '100%' }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <AstroSelect 
                      label="CATEGORÍA"
                      value={newService.category}
                      onChange={val => setNewService({...newService, category: val})}
                      options={[
                        { label: 'Barbería', value: 'Barbería' },
                        { label: 'Estilismo', value: 'Estilismo' },
                        { label: 'Tratamientos', value: 'Tratamientos' }
                      ]}
                    />
                    <AstroSelect 
                      label="ESTRATEGIA"
                      value={newService.strategy_type}
                      onChange={val => setNewService({...newService, strategy_type: val})}
                      options={[
                        { label: 'MVP (Estrella)', value: 'MVP' },
                        { label: 'Comodín Entrada', value: 'Entrada' },
                        { label: 'Comodín Upsell', value: 'Upsell' },
                        { label: 'Mantenimiento', value: 'Mantenimiento' }
                      ]}
                    />
                  </div>
                </div>

                {/* Costs & Calculations */}
                <div style={{ padding: '20px', borderRadius: '20px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px' }}>GASTOS OPERATIVOS ($)</label>
                      <input 
                        className="form-input" 
                        type="number" 
                        step="0.01"
                        placeholder="0.50"
                        value={newService.variable_cost} 
                        onChange={e => setNewService({...newService, variable_cost: Number(e.target.value)})} 
                        style={{ width: '100%', color: '#64d2ff', fontWeight: '800' }} 
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px' }}>TOTAL INSUMOS ($)</label>
                      <div style={{ 
                        backgroundColor: 'rgba(255,159,10,0.1)', 
                        padding: '10px', 
                        borderRadius: '12px', 
                        border: '1px solid rgba(255,159,10,0.3)',
                        color: '#ff9f0a',
                        fontWeight: '900',
                        fontSize: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        height: '46px'
                      }}>
                        <DollarSign size={18} /> {newService.insumo_cost}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Commissions Distribution */}
                <div style={{ padding: '20px', borderRadius: '20px', backgroundColor: 'rgba(212,175,55,0.03)', border: '1px solid rgba(212,175,55,0.1)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '16px', letterSpacing: '1px' }}>
                    <DollarSign size={14} /> DISTRIBUCIÓN DE COMISIONES (%)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>BARBERO</label>
                      <input className="form-input" type="number" value={newService.commission_barber} onChange={e => setNewService({...newService, commission_barber: Number(e.target.value)})} style={{ width: '100%', fontSize: '13px' }} />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>ASISTENTE LAVADO</label>
                      <input className="form-input" type="number" value={newService.commission_washer} onChange={e => setNewService({...newService, commission_washer: Number(e.target.value)})} style={{ width: '100%', fontSize: '13px' }} />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>CAJA</label>
                      <input className="form-input" type="number" value={newService.commission_cashier} onChange={e => setNewService({...newService, commission_cashier: Number(e.target.value)})} style={{ width: '100%', fontSize: '13px', opacity: 0.5 }} />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>RECEPCIÓN</label>
                      <input className="form-input" type="number" value={newService.commission_receptionist} onChange={e => setNewService({...newService, commission_receptionist: Number(e.target.value)})} style={{ width: '100%', fontSize: '13px', opacity: 0.5 }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Checklist */}
              <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '1px' }}>
                    <LayoutList size={16} /> CHECKLIST: QUÉ INCLUYE
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
                    <Settings size={12} /> Modificar Extras
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
                          <div style={{ fontSize: '10px', color: 'var(--gold-primary)' }}>+${item.base_cost}</div>
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-gold" onClick={handleCreateService} style={{ height: '54px', padding: '0 40px', fontSize: '16px', borderRadius: '16px' }}>
                {isEditing ? 'Guardar Cambios' : 'Lanzar Servicio al Catálogo'}
              </button>
            </div>
          </div>
        )}


      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader2 className="animate-spin" size={48} color="var(--gold-primary)" />
        </div>
      ) : services.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '80px', borderRadius: '32px' }}>
          <Star size={64} color="rgba(212, 175, 55, 0.1)" style={{ marginBottom: '24px' }} />
          <h3 style={{ fontSize: '20px', color: 'var(--text-primary)' }}>Tu catálogo está vacío</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Comienza agregando los servicios que definirán tu marca.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {services.map(service => (
            <div key={service.id} className="glass-card animate-scale-in" style={{ 
              borderRadius: '20px',
              padding: '16px 24px',
              border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: '24px'
            }}>
              {/* Left: Category Badge & Icon */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '200px' }}>
                <div style={{ 
                  width: '44px', 
                  height: '44px', 
                  borderRadius: '12px', 
                  backgroundColor: 'rgba(212, 175, 55, 0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  {getCategoryIcon(service.category)}
                </div>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{service.category}</div>
                  <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'white', margin: '2px 0' }}>{service.name}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <Clock size={12} /> {service.duration || 30} min
                  </div>
                </div>
              </div>

              {/* Middle: Included Items Summary */}
              <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {(service.included_items || []).map((item, idx) => (
                  <span key={idx} style={{ 
                    fontSize: '10px', 
                    padding: '4px 10px', 
                    borderRadius: '8px', 
                    backgroundColor: 'rgba(255,255,255,0.03)', 
                    color: 'var(--text-muted)',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    {item}
                  </span>
                ))}
              </div>

              {/* Right: Strategy & Price & Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                {service.strategy_type && (
                  <div style={{ 
                    padding: '4px 12px', 
                    borderRadius: '20px', 
                    border: '1px solid rgba(212, 175, 55, 0.3)', 
                    fontSize: '10px', 
                    fontWeight: '900', 
                    color: 'var(--gold-primary)',
                    backgroundColor: 'rgba(212, 175, 55, 0.05)'
                  }}>
                    {service.strategy_type}
                  </div>
                )}
                
                <div style={{ textAlign: 'right', minWidth: '80px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)' }}>PRECIO</div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: 'white' }}>${service.price}</div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="action-btn" 
                    onClick={() => handleEditClick(service)}
                    style={{ width: '36px', height: '36px' }}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteService(service.id, service.name)}
                    className="action-btn" 
                    style={{ width: '36px', height: '36px', color: '#ff453a', backgroundColor: 'rgba(255,69,58,0.1)' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
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
                <h3 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.5px' }}>Gestionar <span className="text-gold">Extras</span></h3>
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
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gold-primary)', fontSize: '11px', fontWeight: '800' }}>$</span>
                      <input 
                        className="form-input" 
                        type="number" 
                        step="0.01"
                        value={editingItem?.id === item.id ? editingItem.base_cost : item.base_cost} 
                        onChange={(e) => setEditingItem({ ...(editingItem || item), id: item.id, base_cost: e.target.value })}
                        onFocus={() => setEditingItem(item)}
                        style={{ width: '60px', fontSize: '13px', height: '36px', paddingLeft: '18px', paddingRight: '4px', textAlign: 'right', fontWeight: '700', color: 'var(--gold-primary)', background: 'rgba(0,0,0,0.2)', border: editingItem?.id === item.id ? '1px solid var(--gold-primary)' : '1px solid transparent' }}
                      />
                    </div>
                    
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
                        <button 
                          onClick={(e) => handleDeleteMasterItem(e, item.id, item.name)}
                          style={{ backgroundColor: 'rgba(255,69,58,0.1)', color: '#ff453a', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          <Trash2 size={16} />
                        </button>
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
                  placeholder="Nuevo extra..." 
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  style={{ flex: 1, height: '40px', fontSize: '13px', minWidth: 0 }}
                />
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '11px' }}>$</span>
                  <input 
                    className="form-input" 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    value={newItemCost}
                    onChange={e => setNewItemCost(e.target.value)}
                    style={{ width: '70px', height: '40px', paddingLeft: '20px', fontSize: '13px', fontWeight: '700' }}
                  />
                </div>
                <button onClick={handleAddMasterChecklistItem} className="btn-gold" style={{ width: '40px', height: '40px', borderRadius: '10px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesModule;
