import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Scissors, 
  ShoppingBag, 
  Clock, 
  Star, 
  Wrench, 
  Plus, 
  Trash2, 
  TrendingUp,
  Loader2
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

const StaffProfileModal = ({ isOpen, onClose, staffMember, inventory = [], onUpdate }) => {
  const { user } = useAuth();
  const isAdmin = user?.role?.startsWith('Admin');
  
  const { showToast } = useNotifs();
  const [activeTab, setActiveTab] = useState('rendimiento');
  const [loading, setLoading] = useState(true);
  
  // Stats State
  const [stats, setStats] = useState({
    totalAppointments: 0,
    totalServiceComm: 0,
    totalProductComm: 0,
    totalTips: 0,
    topServices: [],
    avgDurationMin: 0
  });

  // Inventory State
  const [tools, setTools] = useState([]);
  const [showAddTool, setShowAddTool] = useState(false);
  const [newTool, setNewTool] = useState({ name: '', brand: '', ownership: 'Propia', status: 'Operativa', inventory_id: '' });

  useEffect(() => {
    if (isOpen && staffMember) {
      loadProfileData();
      setTools(staffMember.tools || []);
    }
  }, [isOpen, staffMember]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const profileStats = await dataService.getStaffProfileStats(staffMember.id);
      setStats(profileStats);
    } catch (error) {
      console.error('Error loading stats:', error);
      showToast('Error cargando métricas del barbero', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTool = async () => {
    if (newTool.ownership === 'Propia') {
      if (!newTool.name || !newTool.brand) {
        showToast('Ingresa nombre y marca', 'warning');
        return;
      }
    } else {
      if (!newTool.inventory_id) {
        showToast('Selecciona una herramienta del inventario', 'warning');
        return;
      }
    }

    try {
      setLoading(true);
      let toolToAdd = { ...newTool, id: Date.now().toString(), date_added: new Date().toISOString() };

      if (newTool.ownership === 'Asignada') {
        const invItem = inventory.find(i => i.id === newTool.inventory_id);
        if (invItem) {
          toolToAdd.name = invItem.name;
          toolToAdd.brand = invItem.category; // Or any other field
          await dataService.updateInventoryItem(invItem.id, { staff_id: staffMember.id });
        }
      }

      const updatedTools = [...tools, toolToAdd];
      await dataService.updateStaffTools(staffMember.id, updatedTools);
      setTools(updatedTools);
      setNewTool({ name: '', brand: '', ownership: 'Propia', status: 'Operativa', inventory_id: '' });
      setShowAddTool(false);
      showToast('Herramienta asignada');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error saving tool:', error);
      showToast('Error al guardar herramienta', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTool = async (toolId) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta herramienta del inventario del barbero?')) return;
    try {
      setLoading(true);
      const toolToRemove = tools.find(t => t.id === toolId);
      
      // If it was assigned from global inventory, return it to stock
      if (toolToRemove && toolToRemove.inventory_id) {
        await dataService.updateInventoryItem(toolToRemove.inventory_id, { staff_id: null });
      }

      const updatedTools = tools.filter(t => t.id !== toolId);
      await dataService.updateStaffTools(staffMember.id, updatedTools);
      setTools(updatedTools);
      showToast('Herramienta removida y regresada al almacén general');
      if (onUpdate) onUpdate();
    } catch (error) {
      showToast('Error al eliminar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const availableInventoryTools = inventory.filter(i => 
    (i.category === 'Herramienta' || i.category === 'Accesorios') && !i.staff_id
  );

  if (!isOpen || !staffMember) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div className="glass-card animate-slide-up" style={{
        width: '100%',
        maxWidth: '800px',
        maxHeight: '90vh',
        borderRadius: '32px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative'
      }}>
        
        {/* Header Section */}
        <div style={{ padding: '32px 32px 24px', background: 'linear-gradient(to bottom, rgba(212,175,55,0.1), transparent)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <button 
            onClick={onClose}
            style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ width: '90px', height: '90px', borderRadius: '24px', backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden', border: '2px solid var(--gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {staffMember.image_url ? (
                <img src={staffMember.image_url} alt={staffMember.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={40} color="var(--gold-primary)" opacity={0.5} />
              )}
            </div>
            <div>
              <h2 style={{ fontSize: '28px', fontWeight: '900', color: 'white' }}>{staffMember.name}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gold-primary)', fontWeight: '700', fontSize: '14px', marginTop: '4px' }}>
                <Star size={16} fill="var(--gold-primary)" />
                {staffMember.role?.split('|')[0] || 'Barbero'}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
            <button 
              onClick={() => setActiveTab('rendimiento')}
              style={{ padding: '12px 24px', borderRadius: '12px', background: activeTab === 'rendimiento' ? 'var(--gold-primary)' : 'rgba(255,255,255,0.05)', color: activeTab === 'rendimiento' ? 'black' : 'white', fontWeight: '800', border: 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <TrendingUp size={18} /> Rendimiento Histórico
            </button>
            <button 
              onClick={() => setActiveTab('inventario')}
              style={{ padding: '12px 24px', borderRadius: '12px', background: activeTab === 'inventario' ? 'var(--gold-primary)' : 'rgba(255,255,255,0.05)', color: activeTab === 'inventario' ? 'black' : 'white', fontWeight: '800', border: 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Wrench size={18} /> Inventario Personal
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
              <Loader2 className="animate-spin" size={48} color="var(--gold-primary)" />
            </div>
          ) : activeTab === 'rendimiento' ? (
            <div className="animate-fade-in">
              {/* Top Stats Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(50,215,75,0.1)', color: '#32d74b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Scissors size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '900', letterSpacing: '1px', marginBottom: '4px' }}>COMISIONES SERVICIOS</div>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: 'white' }}>${stats.totalServiceComm.toFixed(2)}</div>
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(10,132,255,0.1)', color: '#0a84ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShoppingBag size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '900', letterSpacing: '1px', marginBottom: '4px' }}>COMISIONES PRODUCTOS</div>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: 'white' }}>${stats.totalProductComm.toFixed(2)}</div>
                  </div>
                </div>
                <div style={{ background: 'rgba(212,175,55,0.02)', padding: '24px', borderRadius: '20px', border: '1px solid rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(212,175,55,0.1)', color: 'var(--gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '900', letterSpacing: '1px', marginBottom: '4px' }}>TOTAL PROPINAS</div>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--gold-primary)' }}>${(stats.totalTips || 0).toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Bottom Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Time & Volume */}
                <div style={{ background: 'rgba(212,175,55,0.02)', padding: '24px', borderRadius: '20px', border: '1px solid rgba(212,175,55,0.1)' }}>
                  <h4 style={{ color: 'var(--gold-primary)', fontSize: '14px', fontWeight: '900', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={16} /> Volumen y Tiempos
                  </h4>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Servicios Totales</span>
                    <span style={{ color: 'white', fontWeight: '900', fontSize: '18px' }}>{stats.totalAppointments}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Tiempo Promedio x Trabajo</span>
                    <span style={{ color: 'white', fontWeight: '900', fontSize: '18px' }}>{stats.avgDurationMin > 0 ? `${stats.avgDurationMin} min` : 'N/A'}</span>
                  </div>
                </div>

                {/* Top Services */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h4 style={{ color: 'white', fontSize: '14px', fontWeight: '900', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp size={16} color="var(--gold-primary)" /> Servicios Más Realizados
                  </h4>
                  
                  {stats.topServices.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {stats.topServices.map((srv, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '14px' }}>{srv.name}</span>
                          <span style={{ background: 'rgba(212,175,55,0.1)', color: 'var(--gold-primary)', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '800' }}>{srv.count} veces</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>No hay datos suficientes</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '900', color: 'white' }}>Equipamiento de {staffMember.name.split(' ')[0]}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>Control de herramientas asignadas o propias.</p>
                </div>
                <button 
                  onClick={() => setShowAddTool(!showAddTool)}
                  style={{ background: showAddTool ? 'rgba(255,255,255,0.1)' : 'var(--gold-primary)', color: showAddTool ? 'white' : 'black', border: 'none', padding: '10px 16px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
                >
                  {showAddTool ? 'Cancelar' : <><Plus size={16} /> Añadir Herramienta</>}
                </button>
              </div>

              {showAddTool && (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '20px', borderRadius: '16px', marginBottom: '24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    
                    {newTool.ownership === 'Propia' ? (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '1px' }}>TIPO / NOMBRE</label>
                          <input className="form-input" placeholder="Ej. Máquina Clipper" value={newTool.name} onChange={e => setNewTool({...newTool, name: e.target.value})} style={{ height: '44px', width: '100%' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '1px' }}>MARCA / MODELO</label>
                          <input className="form-input" placeholder="Ej. Wahl Magic Clip" value={newTool.brand} onChange={e => setNewTool({...newTool, brand: e.target.value})} style={{ height: '44px', width: '100%' }} />
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}>
                        <label style={{ fontSize: '10px', color: 'var(--gold-primary)', fontWeight: '800', letterSpacing: '1px' }}>SELECCIONAR DEL ALMACÉN (HERRAMIENTAS LIBRES)</label>
                        <select 
                          className="form-input" 
                          value={newTool.inventory_id} 
                          onChange={e => setNewTool({...newTool, inventory_id: e.target.value})} 
                          style={{ height: '44px', width: '100%', border: '1px solid var(--gold-primary)' }}
                        >
                          <option value="">-- Selecciona una herramienta del inventario --</option>
                          {availableInventoryTools.map(item => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '1px' }}>PERTENENCIA</label>
                      <select 
                        className="form-input" 
                        value={newTool.ownership} 
                        onChange={e => setNewTool({...newTool, ownership: e.target.value})} 
                        style={{ height: '44px', width: '100%', opacity: isAdmin ? 1 : 0.7, cursor: isAdmin ? 'pointer' : 'not-allowed' }}
                        disabled={!isAdmin}
                      >
                        <option value="Propia">Propia del Barbero</option>
                        {isAdmin && <option value="Asignada">Asignada (Astro)</option>}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '1px' }}>ESTADO</label>
                      <select className="form-input" value={newTool.status} onChange={e => setNewTool({...newTool, status: e.target.value})} style={{ height: '44px', width: '100%' }}>
                        <option value="Operativa">Operativa</option>
                        <option value="En Mantenimiento">En Mantenimiento</option>
                        <option value="Dañada">Dañada</option>
                      </select>
                    </div>
                  </div>
                  <button onClick={handleAddTool} style={{ width: '100%', background: 'white', color: 'black', border: 'none', borderRadius: '12px', height: '44px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}>Guardar Herramienta</button>
                </div>
              )}

              {tools.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.01)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <Wrench size={40} color="var(--text-muted)" opacity={0.5} style={{ marginBottom: '16px' }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No hay herramientas registradas para este empleado.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {tools.map(tool => (
                    <div key={tool.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '16px 24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: tool.ownership === 'Asignada' ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Wrench size={18} color={tool.ownership === 'Asignada' ? 'var(--gold-primary)' : 'white'} />
                        </div>
                        <div>
                          <div style={{ fontWeight: '800', color: 'white', fontSize: '15px' }}>{tool.name}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600' }}>{tool.brand}</div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '6px', background: tool.ownership === 'Asignada' ? 'var(--gold-primary)' : 'rgba(255,255,255,0.1)', color: tool.ownership === 'Asignada' ? 'black' : 'white' }}>
                            {tool.ownership}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: tool.status === 'Operativa' ? '#32d74b' : tool.status === 'En Mantenimiento' ? '#ff9f0a' : '#ff453a' }}>
                            {tool.status}
                          </span>
                        </div>
                        <button onClick={() => handleRemoveTool(tool.id)} style={{ background: 'transparent', border: 'none', color: '#ff453a', cursor: 'pointer', opacity: 0.7 }} title="Eliminar">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default StaffProfileModal;
