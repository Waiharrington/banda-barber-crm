import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Minus, 
  Search, 
  AlertTriangle, 
  Edit3,
  Loader2,
  TrendingDown,
  ChevronRight,
  Zap,
  Trash2,
  History
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import AstroSelect from './AstroSelect';
import AstroCamera from './AstroCamera';
import { Camera } from 'lucide-react';

const InventoryModule = ({ isMobile, currency, rates }) => {
  const { user } = useAuth();
  const { showToast } = useNotifs();
  const [inventory, setInventory] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [newItem, setNewItem] = useState({ 
    name: '', 
    stock: 0, 
    price: 0, 
    cost_price: 0,
    category: 'Venta', 
    image_url: '',
    staff_id: null,
    cost_price_dirty: false,
    price_dirty: false,
    stock_dirty: false
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const [invData, staffData] = await Promise.all([
        dataService.getInventory(),
        dataService.getStaff()
      ]);
      setInventory(invData);
      setStaff(staffData);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handeAdjustStock = async (id, currentStock, amount) => {
    try {
      const newStock = Math.max(0, currentStock + amount);
      await dataService.updateStock(id, newStock);
      
      // Log movement
      await dataService.logInventoryMovement({
        product_id: id,
        type: amount > 0 ? 'entry' : 'exit',
        amount: Math.abs(amount),
        reason: 'Ajuste Manual'
      });

      fetchInventory();
    } catch (error) {
      showToast('Error al ajustar stock', 'error');
    }
  };

  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const handleAddItem = async () => {
    if (!newItem.name || saving) return;
    try {
      setSaving(true);
      // Sanitize object: Only send database-columns
      const { cost_price_dirty, price_dirty, stock_dirty, ...cleanItem } = newItem;
      
      // Ensure empty strings are treated as 0
      const finalItem = {
        ...cleanItem,
        price: Number(cleanItem.price) || 0,
        cost_price: Number(cleanItem.cost_price) || 0,
        stock: Number(cleanItem.stock) || 0
      };

      const created = await dataService.addInventoryItem(finalItem);
      
      // Log initial movement if stock > 0
      if (finalItem.stock > 0 && created?.id) {
        await dataService.logInventoryMovement({
          product_id: created.id,
          type: 'entry',
          amount: finalItem.stock,
          reason: 'Carga Inicial'
        });
      }

      setShowAddForm(false);
      setNewItem({ name: '', stock: 0, price: 0, cost_price: 0, category: 'Venta', image_url: '', cost_price_dirty: false, price_dirty: false, stock_dirty: false });
      fetchInventory();
      showToast('Producto agregado al almacén');
    } catch (error) {
      console.error(error);
      showToast('Error al agregar item de inventario', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id, name) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar "${name}" del inventario?`)) return;
    try {
      await dataService.deleteInventoryItem(id);
      fetchInventory();
      showToast('Producto eliminado');
    } catch (error) {
      showToast('Error al eliminar producto', 'error');
    }
  };

  const lowStockCount = inventory.filter(item => item.stock <= 5 && item.category !== 'Accesorios').length;

  const filteredInventory = inventory.filter(item => {
    const searchMatch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!searchMatch) return false;

    // Filter for barbers: They see everything EXCEPT other barbers' tools
    const isBarber = user?.role === 'Barbero' || user?.role?.startsWith('Barbero|');
    if (isBarber) {
      // If it's a tool, it MUST be mine or have no owner
      if (item.category === 'Herramienta') {
        return String(item.staff_id) === String(user.id);
      }
      // They also see general sales/internal items
    }
    return true;
  });

  return (
    <div className="animate-fade-in" style={{ paddingBottom: isMobile ? '80px' : '0' }}>
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        marginBottom: '40px' 
      }}>
        <div>
          <h2 style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '800', letterSpacing: '-0.5px' }}>Control de <span className="text-gold">Stock</span></h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Gestión de productos y suministros críticos.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn-gold" 
            onClick={async () => {
              setShowHistoryModal(true);
              setLoadingHistory(true);
              try {
                const data = await dataService.getInventoryMovements();
                setHistory(data);
              } catch (e) {
                console.error(e);
              } finally {
                setLoadingHistory(false);
              }
            }} 
            style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', color: 'var(--gold-primary)', border: '1px solid rgba(212, 175, 55, 0.2)' }}
          >
            <History size={18} style={{ marginRight: '8px' }} />
            Ver Historial
          </button>
          <button className="btn-gold" onClick={() => setShowAddForm(true)}>
            <Plus size={18} style={{ marginRight: '8px' }} />
            Nuevo Producto
          </button>
        </div>
      </header>

      {showAddForm && (
        <div className="glass-card animate-slide-up" style={{ marginBottom: '32px', borderRadius: '28px' }}>
          <h3 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: '800' }}>Nuevo Producto en Inventario</h3>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>NOMBRE</label>
              <input type="text" placeholder="Ej. Cera Gold Premium" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} style={{ width: '100%', height: '48px' }} />
            </div>
            <AstroSelect 
              label="CATEGORÍA"
              value={newItem.category}
              onChange={(val) => setNewItem({...newItem, category: val})}
              options={[
                { label: '🛒 Para Venta', value: 'Venta' },
                { label: '💈 Uso Interno', value: 'Uso Interno' },
                { label: '✂️ Accesorios', value: 'Accesorios' },
                { label: '🔧 Herramienta', value: 'Herramienta' }
              ]}
            />

            {newItem.category === 'Herramienta' && (
              <AstroSelect 
                label="ASIGNAR A"
                placeholder="Selecciona barbero"
                value={newItem.staff_id}
                onChange={(val) => setNewItem({...newItem, staff_id: val})}
                options={[
                  { label: '💈 Local / General', value: null },
                  ...staff.map(s => ({ label: s.name, value: s.id }))
                ]}
              />
            )}
             <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>IMAGEN DEL PRODUCTO</label>
              <div 
                onClick={() => setShowCamera(true)}
                style={{ 
                  height: '48px', 
                  backgroundColor: 'rgba(255,255,255,0.03)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  padding: '0 16px',
                  cursor: 'pointer',
                  overflow: 'hidden'
                }}
              >
                {newItem.image_url ? (
                  <>
                    <img src={newItem.image_url} style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }} />
                    <span style={{ fontSize: '13px', color: 'var(--gold-primary)', fontWeight: '700' }}>¡Imagen lista!</span>
                  </>
                ) : (
                  <>
                    <Camera size={18} color="var(--gold-primary)" />
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Tomar o subir foto...</span>
                  </>
                )}
              </div>
            </div>

            {/* Dynamic Price Fields */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>PRECIO DE COSTO ($)</label>
              <input 
                type="number" 
                placeholder="0.00" 
                value={newItem.cost_price === 0 && !newItem.cost_price_dirty ? '' : newItem.cost_price} 
                onChange={(e) => setNewItem({...newItem, cost_price: e.target.value === '' ? '' : Number(e.target.value), cost_price_dirty: true})} 
                style={{ width: '100%', height: '48px' }} 
              />
            </div>

            {(newItem.category === 'Venta' || newItem.category === 'Accesorios') && (
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>PRECIO DE VENTA ($)</label>
                <input 
                  type="number" 
                  placeholder="0.00" 
                  value={newItem.price === 0 && !newItem.price_dirty ? '' : newItem.price} 
                  onChange={(e) => setNewItem({...newItem, price: e.target.value === '' ? '' : Number(e.target.value), price_dirty: true})} 
                  style={{ width: '100%', height: '48px' }} 
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>STOCK INICIAL</label>
              <input 
                type="number" 
                placeholder="0" 
                value={newItem.stock === 0 && !newItem.stock_dirty ? '' : newItem.stock} 
                onChange={(e) => setNewItem({...newItem, stock: e.target.value === '' ? '' : Number(e.target.value), stock_dirty: true})} 
                style={{ width: '100%', height: '48px' }} 
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button 
                className="btn-gold" 
                onClick={handleAddItem} 
                disabled={saving}
                style={{ width: '100%', height: '48px', opacity: saving ? 0.6 : 1 }}
              >
                {saving ? <Loader2 className="animate-spin" /> : 'Registrar Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCamera && (
        <AstroCamera 
          onCapture={(img) => setNewItem({...newItem, image_url: img})} 
          onClose={() => setShowCamera(false)} 
        />
      )}

      {/* Search & Alerts Header */}
      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row', 
        gap: '16px', 
        marginBottom: '32px' 
      }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={{ position: 'absolute', left: '16px', top: '14px' }} size={18} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Buscar en el almacén..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '48px', height: '48px', backgroundColor: 'rgba(255,255,255,0.03)' }}
          />
        </div>
         {lowStockCount > 0 && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            backgroundColor: 'rgba(255, 69, 58, 0.05)', 
            padding: '0 20px', 
            borderRadius: '12px', 
            border: '1px solid rgba(255,69,58,0.1)',
            color: '#ff453a',
            fontSize: '13px',
            fontWeight: '750'
          }}>
            <AlertTriangle size={16} /> {lowStockCount} {lowStockCount === 1 ? 'Producto' : 'Productos'} con Stock Bajo
          </div>
        )}

        <div style={{ display: 'flex', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '4px' }}>
          <button 
            onClick={() => setViewMode('grid')}
            style={{ 
              padding: '8px 16px', 
              border: 'none', 
              borderRadius: '8px', 
              backgroundColor: viewMode === 'grid' ? 'var(--gold-primary)' : 'transparent',
              color: viewMode === 'grid' ? 'black' : 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              fontWeight: '800'
            }}
          >
            <Package size={16} /> Cuadrícula
          </button>
          <button 
            onClick={() => setViewMode('list')}
            style={{ 
              padding: '8px 16px', 
              border: 'none', 
              borderRadius: '8px', 
              backgroundColor: viewMode === 'list' ? 'var(--gold-primary)' : 'transparent',
              color: viewMode === 'list' ? 'black' : 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              fontWeight: '800'
            }}
          >
            <Search size={16} style={{ transform: 'rotate(90deg)' }} /> Lista
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader2 className="animate-spin" size={48} color="var(--gold-primary)" />
        </div>
      ) : filteredInventory.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '80px', borderRadius: '32px' }}>
          <Package size={64} color="rgba(255,255,255,0.05)" style={{ marginBottom: '24px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '18px' }}>No hay productos que coincidan.</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="glass-card" style={{ borderRadius: '24px', overflow: 'hidden', padding: '0' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '20px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)' }}>PRODUCTO</th>
                  <th style={{ padding: '20px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)' }}>CATEGORÍA</th>
                  <th style={{ padding: '20px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)' }}>STOCK</th>
                  <th style={{ padding: '20px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)' }}>COSTO</th>
                  <th style={{ padding: '20px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)' }}>VENTA</th>
                  <th style={{ padding: '20px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textAlign: 'right' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }} className="table-row-hover">
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {item.image_url ? (
                            <img src={item.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <Package size={20} color="rgba(255,255,255,0.1)" />
                          )}
                        </div>
                        <span style={{ fontWeight: '800', fontSize: '14px' }}>{item.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ fontSize: '10px', backgroundColor: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '6px', color: 'var(--text-secondary)', fontWeight: '800' }}>
                        {item.category}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                          fontWeight: '950', 
                          fontSize: '15px',
                          color: (item.stock <= 5 && item.category !== 'Accesorios') ? 'var(--gold-primary)' : 'white'
                        }}>
                          {item.stock}
                        </span>
                        {(item.stock <= 5 && item.category !== 'Accesorios') && <AlertTriangle size={12} color="var(--gold-primary)" />}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: '700', color: 'var(--text-muted)' }}>
                      ${item.cost_price?.toFixed(2)}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ fontWeight: '900', color: 'var(--gold-primary)' }}>${item.price?.toFixed(2)}</div>
                      {rates?.usd > 0 && (
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {Math.round(item.price * rates.usd).toLocaleString()} Bs.
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => handeAdjustStock(item.id, item.stock, -1)}
                          className="action-btn" style={{ width: '32px', height: '32px' }}
                        >
                          <Minus size={14} />
                        </button>
                        <button 
                          onClick={() => handeAdjustStock(item.id, item.stock, 1)}
                          className="action-btn" style={{ width: '32px', height: '32px' }}
                        >
                          <Plus size={14} />
                        </button>
                        <button 
                          onClick={() => setEditingItem(item)}
                          className="action-btn" style={{ width: '32px', height: '32px', backgroundColor: 'rgba(212,175,55,0.1)', color: 'var(--gold-primary)' }}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteItem(item.id, item.name)}
                          className="action-btn" style={{ width: '32px', height: '32px', backgroundColor: 'rgba(255,69,58,0.1)', color: '#ff453a' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {filteredInventory.map(item => {
            const isLowStock = item.stock <= 5 && item.category !== 'Accesorios';
            return (
              <div key={item.id} className="glass-card animate-scale-in" style={{ 
                position: 'relative',
                borderRadius: '24px',
                border: isLowStock ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                boxShadow: isLowStock ? '0 10px 30px rgba(212, 175, 55, 0.1)' : '0 10px 30px rgba(0,0,0,0.2)',
                background: isLowStock ? 'linear-gradient(135deg, rgba(28,28,30,0.9), rgba(212, 175, 55, 0.05))' : 'var(--bg-secondary)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button 
                      onClick={() => setEditingItem(item)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                      onMouseOver={(e) => e.currentTarget.style.color = 'var(--gold-primary)'}
                      onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteItem(item.id, item.name)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                      onMouseOver={(e) => e.currentTarget.style.color = '#ff453a'}
                      onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      <Trash2 size={16} />
                    </button>
                    <span style={{ 
                      fontSize: '10px', 
                      backgroundColor: 'rgba(255,255,255,0.05)', 
                      padding: '4px 12px', 
                      borderRadius: '20px',
                      color: 'var(--text-secondary)',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {item.category}
                    </span>
                  </div>
                  {isLowStock && (
                    <span style={{ 
                      color: 'var(--gold-primary)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px', 
                      fontSize: '11px',
                      fontWeight: '900',
                      animation: 'pulse 2s infinite'
                    }}>
                      <Zap size={14} fill="var(--gold-primary)" /> GOLD ALERT
                    </span>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
                  <div style={{ 
                    width: '64px', 
                    height: '64px', 
                    borderRadius: '16px', 
                    backgroundColor: 'rgba(255,255,255,0.02)', 
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {item.image_url ? (
                      <img src={item.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Package size={24} color="rgba(255,255,255,0.1)" />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <h4 style={{ fontSize: '18px', fontWeight: '850', letterSpacing: '-0.3px', margin: 0 }}>{item.name}</h4>
                      {item.category === 'Herramienta' && item.staff_id && (
                        <div style={{ 
                          fontSize: '10px', 
                          fontWeight: '800', 
                          padding: '4px 8px', 
                          backgroundColor: 'rgba(212,175,55,0.1)', 
                          color: 'var(--gold-primary)', 
                          borderRadius: '8px',
                          border: '1px solid rgba(212,175,55,0.2)'
                        }}>
                          ASIGNADA A {staff.find(s => s.id === item.staff_id)?.name.split(' ')[0].toUpperCase() || 'DESCONOCIDO'}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      {(item.category === 'Venta' || item.category === 'Accesorios') ? (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)' }}>VENTA</span>
                            <div style={{ fontSize: '18px', fontWeight: '950', color: 'var(--gold-primary)' }}>
                              <span style={{ fontSize: '12px', verticalAlign: 'super', marginRight: '2px' }}>$</span>
                              {item.price?.toFixed(2) || '0.00'}
                            </div>
                            {rates?.usd > 0 && (
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '2px' }}>
                                ≈ {Math.round(item.price * rates.usd).toLocaleString()} Bs.
                              </div>
                            )}
                          </div>
                          <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)' }}>COSTO</span>
                            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-secondary)' }}>
                              <span style={{ fontSize: '10px', verticalAlign: 'super', marginRight: '2px' }}>$</span>
                              {item.cost_price?.toFixed(2) || '0.00'}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)' }}>COSTO (USO INTERNO)</span>
                          <div style={{ fontSize: '20px', fontWeight: '950', color: 'white' }}>
                            <span style={{ fontSize: '12px', verticalAlign: 'super', marginRight: '2px' }}>$</span>
                            {item.cost_price?.toFixed(2) || '0.00'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '16px',
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)' }}>ALMACÉN</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button 
                      onClick={() => handeAdjustStock(item.id, item.stock, -1)}
                      className="action-btn"
                      style={{ width: '32px', height: '32px' }}
                    >
                      <Minus size={14} />
                    </button>
                    <span style={{ fontSize: '22px', fontWeight: '950', minWidth: '32px', textAlign: 'center', color: isLowStock ? 'var(--gold-primary)' : 'white' }}>
                      {item.stock}
                    </span>
                    <button 
                      onClick={() => handeAdjustStock(item.id, item.stock, 1)}
                      className="action-btn"
                      style={{ width: '32px', height: '32px' }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingItem && (
        <EditInventoryModal 
          item={editingItem} 
          onClose={() => setEditingItem(null)} 
          onSave={async (updates) => {
            try {
              // Sanitize updates
              const { cost_price_dirty, price_dirty, stock_dirty, ...cleanUpdates } = updates;
              await dataService.updateInventoryItem(editingItem.id, cleanUpdates);
              fetchInventory();
              setEditingItem(null);
              showToast('Producto actualizado');
            } catch (error) {
              showToast('Error al actualizar producto', 'error');
            }
          }}
        />
      )}

      <style>{`
        @keyframes pulse {
          0% { opacity: 0.6; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1); }
          100% { opacity: 0.6; transform: scale(0.95); }
        }
        .table-row-hover:hover {
          background-color: rgba(255,255,255,0.02) !important;
        }
      `}</style>

      {showHistoryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className="glass-card animate-scale-in" style={{ maxWidth: '800px', width: '100%', borderRadius: '32px', border: '1.5px solid rgba(212,175,55,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', padding: '24px 32px 0 32px' }}>
              <div>
                <h2 style={{ fontWeight: '900', fontSize: '24px' }}>Historial de Movimientos</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Registro detallado de entradas y salidas de almacén.</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '32px', cursor: 'pointer' }}>&times;</button>
            </div>

            <div style={{ padding: '0 32px 32px 32px' }}>
              {loadingHistory ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                  <Loader2 className="animate-spin" size={40} color="var(--gold-primary)" />
                </div>
              ) : history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                  <History size={48} style={{ marginBottom: '16px', opacity: 0.1 }} />
                  <p>No hay movimientos registrados aún.</p>
                </div>
              ) : (
                <div style={{ borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                      <tr>
                        <th style={{ padding: '16px', fontSize: '11px', color: 'var(--text-muted)' }}>FECHA</th>
                        <th style={{ padding: '16px', fontSize: '11px', color: 'var(--text-muted)' }}>PRODUCTO</th>
                        <th style={{ padding: '16px', fontSize: '11px', color: 'var(--text-muted)' }}>TIPO</th>
                        <th style={{ padding: '16px', fontSize: '11px', color: 'var(--text-muted)' }}>CANT.</th>
                        <th style={{ padding: '16px', fontSize: '11px', color: 'var(--text-muted)' }}>MOTIVO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map(move => (
                        <tr key={move.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '16px', fontSize: '12px' }}>{new Date(move.created_at).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                          <td style={{ padding: '16px', fontSize: '13px', fontWeight: '700' }}>{move.inventory?.name || 'Producto Eliminado'}</td>
                          <td style={{ padding: '16px' }}>
                            <span style={{ 
                              padding: '4px 10px', 
                              borderRadius: '8px', 
                              fontSize: '10px', 
                              fontWeight: '800',
                              backgroundColor: move.type === 'entry' ? 'rgba(50,215,75,0.1)' : 'rgba(255,69,58,0.1)',
                              color: move.type === 'entry' ? '#32d74b' : '#ff453a'
                            }}>
                              {move.type === 'entry' ? 'ENTRADA' : 'SALIDA'}
                            </span>
                          </td>
                          <td style={{ padding: '16px', fontSize: '14px', fontWeight: '900' }}>{move.type === 'entry' ? '+' : '-'}{move.amount}</td>
                          <td style={{ padding: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>{move.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const EditInventoryModal = ({ item, onClose, onSave }) => {
  const [formData, setFormData] = useState({ ...item });
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    await onSave(formData);
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <div className="glass-card animate-scale-in" style={{ maxWidth: '500px', width: '100%', borderRadius: '28px', padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '900' }}>Editar <span className="text-gold">Producto</span></h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><Plus size={24} style={{ transform: 'rotate(45deg)' }} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>NOMBRE</label>
            <input type="text" className="astro-input" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} style={{ width: '100%' }} />
          </div>

          <AstroSelect 
            label="CATEGORÍA"
            value={formData.category}
            onChange={(val) => setFormData({...formData, category: val})}
            options={[
              { label: '🛒 Para Venta', value: 'Venta' },
              { label: '💈 Uso Interno', value: 'Uso Interno' },
              { label: '✂️ Accesorios', value: 'Accesorios' },
              { label: '🔧 Herramienta', value: 'Herramienta' }
            ]}
          />

          {formData.category === 'Herramienta' && (
            <AstroSelect 
              label="ASIGNAR A"
              placeholder="Selecciona barbero"
              value={formData.staff_id}
              onChange={(val) => setFormData({...formData, staff_id: val})}
              options={[
                { label: '💈 Local / General', value: null },
                ...staff.map(s => ({ label: s.name, value: s.id }))
              ]}
            />
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>PRECIO COSTO ($)</label>
              <input type="number" className="astro-input" value={formData.cost_price} onChange={(e) => setFormData({...formData, cost_price: Number(e.target.value)})} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>PRECIO VENTA ($)</label>
              <input type="number" className="astro-input" value={formData.price} onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} style={{ width: '100%' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>FOTO DEL PRODUCTO</label>
            <div 
              onClick={() => setShowCamera(true)}
              style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
            >
              <Camera size={18} color="var(--gold-primary)" />
              <span style={{ fontSize: '13px' }}>{formData.image_url ? 'Cambiar Foto' : 'Añadir Foto'}</span>
              {formData.image_url && <img src={formData.image_url} style={{ width: '24px', height: '24px', borderRadius: '4px', marginLeft: 'auto' }} />}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
          <button onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
          <button onClick={handleSave} className="btn-gold" style={{ flex: 2 }} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : 'Guardar Cambios'}
          </button>
        </div>

        {showCamera && (
          <AstroCamera 
            onCapture={(img) => { setFormData({...formData, image_url: img}); setShowCamera(false); }} 
            onClose={() => setShowCamera(false)} 
          />
        )}
      </div>
    </div>
  );
};

export default InventoryModule;
