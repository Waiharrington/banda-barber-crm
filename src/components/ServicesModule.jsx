import React, { useState, useEffect } from 'react';
import { useNotifs } from '../context/NotificationContext';
import { 
  Star, 
  Trash2, 
  Edit2, 
  DollarSign, 
  Plus,
  Scissors,
  CheckCircle2,
  Loader2,
  Sparkles,
  Zap,
  Droplets,
  Crown,
  Clock,
  LayoutList,
  Check
} from 'lucide-react';
import { dataService } from '../services/dataService';

const ServicesModule = ({ isMobile }) => {
  const { showToast } = useNotifs();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [baseItems, setBaseItems] = useState([
    "Bebida de Cortesía", "Lavado de Cabello", "Toalla Caliente", 
    "Exfoliación", "Masaje Capilar", "Secado / Peinado", "Afeitado a Navaja"
  ]);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const data = await dataService.getServices();
      setServices(data);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteService = async (id, name) => {
    if (!window.confirm(`¿Estás seguro de eliminar el servicio: ${name}?`)) return;
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
  const [newService, setNewService] = useState({ 
    name: '', 
    price: '', 
    category: 'Barbería',
    strategy_type: 'MVP',
    duration: 30,
    insumo_cost: 0,
    included_items: []
  });

  const handleCreateService = async () => {
    if (!newService.name || !newService.price) return;
    try {
      setLoading(true);
      await dataService.addService(newService);
      setNewService({ 
        name: '', 
        price: '', 
        category: 'Barbería',
        strategy_type: 'MVP',
        duration: 30,
        insumo_cost: 0,
        included_items: []
      });
      setShowAddForm(false);
      await fetchServices();
      showToast(`¡Servicio ${newService.name} agregado al catálogo!`);
    } catch (e) {
      showToast('Error al crear servicio.', 'error');
    } finally {
      setLoading(false);
    }
  };


  const getCategoryIcon = (cat) => {
    switch(cat) {
      case 'Barbería': return <Scissors size={20} />;
      case 'Estilismo': return <Sparkles size={20} />;
      case 'Tratamientos': return <Droplets size={20} />;
      default: return <Zap size={20} />;
    }
  };

  const getStrategyColor = (type) => {
    switch(type) {
      case 'MVP': return 'var(--gold-primary)';
      case 'Entrada': return '#32d74b';
      case 'Upsell': return '#ff9f0a';
      case 'Mantenimiento': return '#5e5ce6';
      default: return 'white';
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
        <button className="btn-gold" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={18} style={{ marginRight: '8px' }} />
          {showAddForm ? 'Cancelar' : 'Agregar Servicio'}
        </button>
      </div>

        {showAddForm && (
          <div className="glass-card animate-slide-up" style={{ marginBottom: '32px', padding: '32px', borderRadius: '28px' }}>
            <h3 style={{ marginBottom: '24px', fontSize: '22px', fontWeight: '800' }}>Nueva Experiencia Astro</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '32px' }}>
              {/* Left Column: Basic Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px' }}>CATEGORÍA</label>
                    <select className="form-input" value={newService.category} onChange={e => setNewService({...newService, category: e.target.value})} style={{ width: '100%' }}>
                      <option value="Barbería">Barbería</option>
                      <option value="Estilismo">Estilismo</option>
                      <option value="Tratamientos">Tratamientos</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px' }}>ESTRATEGIA</label>
                    <select className="form-input" value={newService.strategy_type} onChange={e => setNewService({...newService, strategy_type: e.target.value})} style={{ width: '100%' }}>
                      <option value="MVP">MVP (Estrella)</option>
                      <option value="Entrada">Comodín Entrada</option>
                      <option value="Upsell">Comodín Upsell</option>
                      <option value="Mantenimiento">Mantenimiento</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px' }}>COSTO INSUMOS ($ TOTAL)</label>
                  <input className="form-input" type="number" step="0.1" placeholder="1.50" value={newService.insumo_cost} onChange={e => setNewService({...newService, insumo_cost: Number(e.target.value)})} style={{ width: '100%', color: '#ff9f0a', fontWeight: '800' }} />
                </div>
              </div>

              {/* Right Column: Checklist */}
              <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '20px', letterSpacing: '1px' }}>
                  <LayoutList size={16} /> CHECKLIST: QUÉ INCLUYE
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {baseItems.map(item => (
                    <button 
                      key={item}
                      onClick={() => {
                        const current = newService.included_items || [];
                        const next = current.includes(item) 
                          ? current.filter(i => i !== item)
                          : [...current, item];
                        setNewService({...newService, included_items: next});
                      }}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: newService.included_items?.includes(item) ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.02)',
                        border: newService.included_items?.includes(item) ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)',
                        color: newService.included_items?.includes(item) ? 'white' : 'var(--text-muted)'
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
                        backgroundColor: newService.included_items?.includes(item) ? 'var(--gold-primary)' : 'transparent'
                      }}>
                        {newService.included_items?.includes(item) && <Check size={12} color="black" strokeWidth={4} />}
                      </div>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-gold" onClick={handleCreateService} style={{ height: '54px', padding: '0 40px', fontSize: '16px', borderRadius: '16px' }}>
                Lanzar Servicio al Catálogo
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
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {services.map(service => (
            <div key={service.id} className="glass-card animate-scale-in" style={{ 
              position: 'relative', 
              borderRadius: '24px',
              border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '160px',
              overflow: 'hidden'
            }}>
              {/* Category Badge Top Left */}
              <div style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                backgroundColor: 'rgba(212, 175, 55, 0.1)', 
                color: 'var(--gold-primary)',
                padding: '6px 16px',
                borderBottomRightRadius: '16px',
                fontSize: '10px',
                fontWeight: '900',
                letterSpacing: '0.8px',
                textTransform: 'uppercase'
              }}>
                {service.category}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '14px', 
                    backgroundColor: 'rgba(0,0,0,0.3)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: 'var(--gold-primary)',
                    border: '1px solid var(--border-color)'
                  }}>
                    {getCategoryIcon(service.category)}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {service.name}
                      <span style={{ 
                        fontSize: '10px', 
                        padding: '2px 8px', 
                        borderRadius: '6px', 
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        border: `1px solid ${getStrategyColor(service.strategy_type)}`,
                        color: getStrategyColor(service.strategy_type),
                        fontWeight: '900'
                      }}>
                        {service.strategy_type}
                      </span>
                    </h4>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={12} /> {service.duration || 30} min
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <button className="action-btn" onClick={() => {
                    const newPrice = window.prompt(`Nuevo precio para ${service.name}:`, service.price);
                    if (newPrice) {
                      dataService.updateService(service.id, { price: Number(newPrice) })
                        .then(() => {
                          fetchServices();
                          showToast('Precio actualizado');
                        })
                        .catch(() => showToast('Error al actualizar precio.', 'error'));
                    }
                  }}><Edit2 size={16} /></button>
                  <button className="action-btn" style={{ color: '#ff453a' }} onClick={() => handleDeleteService(service.id, service.name)}><Trash2 size={16} /></button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '20px', padding: '16px', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  <div style={{ fontWeight: '800', color: 'var(--gold-primary)', marginBottom: '4px', fontSize: '10px' }}>INCLUYE:</div>
                  {(service.included_items || []).slice(0, 3).join(' • ')}
                  {(service.included_items || []).length > 3 && '...'}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '28px', fontWeight: '950', color: 'var(--text-primary)', letterSpacing: '-1px' }}>
                    <span style={{ fontSize: '14px', verticalAlign: 'super', marginRight: '2px', opacity: 0.6 }}>$</span>
                    {service.price}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Logic Summary Card */}
      <div className="glass-card animate-slide-up" style={{ 
        marginTop: '40px', 
        borderRadius: '28px', 
        background: 'linear-gradient(to right, rgba(28,28,30,0.8), rgba(212, 175, 55, 0.03))'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          < Crown size={24} color="var(--gold-primary)" />
          <h3 style={{ fontSize: '20px', fontWeight: '800' }}>Configuración de Comisiones Globales</h3>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '600px' }}>
          El sistema distribuye automáticamente las ganancias basándose en los roles implicados en cada servicio.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '16px' }}>
          <MiniRule role="Lavacabezas" pct={20} />
          <MiniRule role="Barbero" pct={40} />
          <MiniRule role="Estilista" pct={35} />
          <MiniRule role="Tatuador" pct={60} />
        </div>
      </div>
    </div>
  );
};

const MiniRule = ({ role, pct }) => (
  <div style={{ 
    padding: '16px', 
    backgroundColor: 'rgba(255,255,255,0.03)', 
    borderRadius: '16px', 
    border: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  }}>
    <div style={{ fontSize: '13px', fontWeight: '600' }}>{role}</div>
    <div style={{ color: 'var(--gold-primary)', fontWeight: '850', fontSize: '16px' }}>{pct}%</div>
  </div>
);

export default ServicesModule;
