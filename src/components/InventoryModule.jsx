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
  Zap
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';

const InventoryModule = ({ isMobile }) => {
  const { showToast } = useNotifs();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', stock: 0, price: 0, category: 'Producto' });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const data = await dataService.getInventory();
      setInventory(data);
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
      fetchInventory();
    } catch (error) {
      showToast('Error al ajustar stock', 'error');
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name) return;
    try {
      await dataService.addInventoryItem(newItem);
      setShowAddForm(false);
      setNewItem({ name: '', stock: 0, price: 0, category: 'Producto' });
      fetchInventory();
      showToast('Producto agregado al almacén');
    } catch (error) {
      showToast('Error al agregar item de inventario', 'error');
    }
  };

  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            Control de <span className="text-gold">Stock</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Gestión de productos y suministros críticos.</p>
        </div>
        <button 
          className="btn-gold" 
          onClick={() => setShowAddForm(!showAddForm)}
          style={{ width: isMobile ? '100%' : 'auto' }}
        >
          <Plus size={18} /> {showAddForm ? 'Cancelar' : 'Nuevo Producto'}
        </button>
      </div>

      {showAddForm && (
        <div className="glass-card animate-slide-up" style={{ marginBottom: '32px', borderRadius: '28px' }}>
          <h3 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: '800' }}>Nuevo Producto en Inventario</h3>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>NOMBRE</label>
              <input type="text" placeholder="Ej. Cera Gold Premium" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} style={{ width: '100%', height: '48px' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>CATEGORÍA</label>
              <select value={newItem.category} onChange={(e) => setNewItem({...newItem, category: e.target.value})} style={{ width: '100%', height: '48px' }}>
                <option value="Venta">🛒 Para Venta</option>
                <option value="Uso Interno">💈 Uso Interno</option>
                <option value="Accesorios">✂️ Accesorios</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>STOCK INICIAL</label>
              <input type="number" value={newItem.stock} onChange={(e) => setNewItem({...newItem, stock: Number(e.target.value)})} style={{ width: '100%', height: '48px' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn-gold" onClick={handleAddItem} style={{ width: '100%', height: '48px' }}>Registrar Stock</button>
            </div>
          </div>
        </div>
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
        {!isMobile && (
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
            <AlertTriangle size={16} /> 2 Productos con Stock Bajo
          </div>
        )}
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
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {filteredInventory.map(item => {
            const isLowStock = item.stock <= 5;
            return (
              <div key={item.id} className="glass-card animate-scale-in" style={{ 
                position: 'relative',
                borderRadius: '24px',
                border: isLowStock ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                boxShadow: isLowStock ? '0 10px 30px rgba(212, 175, 55, 0.1)' : '0 10px 30px rgba(0,0,0,0.2)',
                background: isLowStock ? 'linear-gradient(135deg, rgba(28,28,30,0.9), rgba(212, 175, 55, 0.05))' : 'var(--bg-secondary)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
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
                
                <h4 style={{ fontSize: '20px', fontWeight: '850', marginBottom: '4px', letterSpacing: '-0.3px' }}>{item.name}</h4>
                <div style={{ fontSize: '24px', fontWeight: '950', color: 'var(--text-primary)', marginBottom: '24px' }}>
                  <span style={{ fontSize: '14px', verticalAlign: 'super', marginRight: '2px', opacity: 0.6 }}>$</span>
                  {item.price.toFixed(2)}
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

      <style>{`
        @keyframes pulse {
          0% { opacity: 0.6; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1); }
          100% { opacity: 0.6; transform: scale(0.95); }
        }
      `}</style>
    </div>
  );
};

export default InventoryModule;
