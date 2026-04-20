import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  User, 
  Phone, 
  Calendar, 
  Scissors, 
  Image as ImageIcon,
  ChevronRight,
  Filter,
  Columns as ColumnsIcon,
  Loader2
} from 'lucide-react';
import { dataService } from '../services/dataService';

const ClientModule = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', phone: '', hair_type: 'Normal', scalp_type: 'Normal' });

  useEffect(() => {
    fetchClients();
  }, []);

  const [creating, setCreating] = useState(false);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const data = await dataService.getClients();
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async (id, name) => {
    if (!window.confirm(`¿Estás seguro de eliminar a ${name}? Esta acción no se puede deshacer.`)) return;
    try {
      setLoading(true);
      await dataService.deleteClient(id);
      if (selectedClient?.id === id) setSelectedClient(null);
      await fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Error al eliminar cliente.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async () => {
    if (!newClient.name) return;
    try {
      setCreating(true);
      await dataService.addClient(newClient);
      setNewClient({ name: '', phone: '', hair_type: 'Normal', scalp_type: 'Normal' });
      setShowAddForm(false);
      await fetchClients();
      alert('¡Ficha de cliente creada con éxito!');
    } catch (error) {
      console.error('Error addClient:', error);
      alert('Error técnico al agregar cliente. Revisa la consola.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="client-module animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {!selectedClient ? (
        <>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '40px'
          }}>
            <div>
              <h2 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px' }}>Archivo de <span className="text-gold">Clientes</span></h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Fichas técnicas y galería de evolución.</p>
            </div>
            <button className="btn-gold" onClick={() => setShowAddForm(!showAddForm)} style={{ borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} /> {showAddForm ? 'Cancelar' : 'Nuevo Cliente'}
            </button>
          </div>

          {showAddForm && (
            <div className="glass-card animate-fade-in" style={{ marginBottom: '40px', padding: '32px', borderRadius: '24px' }}>
              <h3 style={{ marginBottom: '24px', fontSize: '20px' }}>Alta de Cliente</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>Nombre Completo</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Juan Pérez" 
                    value={newClient.name}
                    onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '12px' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>Teléfono</label>
                  <input 
                    type="text" 
                    placeholder="Ej. 123456789" 
                    value={newClient.phone}
                    onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '12px' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>Tipo de Cabello</label>
                  <select 
                    value={newClient.hair_type}
                    onChange={(e) => setNewClient({...newClient, hair_type: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '12px' }}
                  >
                    <option value="Normal">Normal</option>
                    <option value="Graso">Graso</option>
                    <option value="Seco">Seco</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button 
                    className="btn-gold" 
                    onClick={handleAddClient} 
                    disabled={creating}
                    style={{ width: '100%', height: '48px', borderRadius: '12px' }}
                  >
                    {creating ? <Loader2 className="animate-spin" /> : 'Crear Ficha'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* iOS Style Search Bar with focus-ring */}
          <div className="focus-ring" style={{ 
            backgroundColor: 'var(--bg-tertiary)', 
            borderRadius: '16px', 
            padding: '4px 16px', 
            marginBottom: '32px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            border: '1px solid var(--border-color)',
            transition: 'all 0.2s'
          }}>
            <Search size={20} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                width: '100%',
                padding: '12px 0',
                fontSize: '16px',
                boxShadow: 'none' /* Remove individual input shadow */
              }}
            />
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
              <Loader2 className="animate-spin" size={40} color="var(--gold-primary)" />
            </div>
          ) : clients.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '80px', borderStyle: 'dashed' }}>
              <User size={48} color="var(--bg-tertiary)" style={{ marginBottom: '20px' }} />
              <p style={{ color: 'var(--text-muted)' }}>Archivo vacío. Agrega a tu primer cliente.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone?.includes(searchTerm)).map(client => (
                <div 
                  key={client.id} 
                  className="glass-card list-item" 
                  onClick={() => setSelectedClient(client)}
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'minmax(200px, 1.5fr) 1fr 1fr 1fr auto',
                    alignItems: 'center',
                    cursor: 'pointer',
                    padding: '20px 24px',
                    borderRadius: '20px',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      borderRadius: '14px', 
                      backgroundColor: 'rgba(212,175,55,0.05)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      border: '1px solid rgba(212,175,55,0.1)'
                    }}>
                      <User size={20} color="var(--gold-primary)" />
                    </div>
                    <span style={{ fontWeight: '700', fontSize: '16px' }}>{client.name}</span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500' }}>
                    <Phone size={14} /> {client.phone}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                    Registrado: {client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A'}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ 
                      padding: '6px 14px', 
                      borderRadius: '10px', 
                      backgroundColor: 'rgba(212,175,55,0.05)', 
                      color: 'var(--gold-primary)',
                      fontSize: '12px',
                      fontWeight: '700',
                      letterSpacing: '0.3px'
                    }}>
                      {client.total_visits || 0} VISITAS
                    </span>
                  </div>
                  <ChevronRight size={20} color="var(--text-muted)" />
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <ClientDetail 
          client={selectedClient} 
          onBack={() => setSelectedClient(null)} 
          onDelete={() => handleDeleteClient(selectedClient.id, selectedClient.name)}
          onUpdate={async (updates) => {
            try {
              const updated = await dataService.updateClient(selectedClient.id, updates);
              setSelectedClient(updated);
              fetchClients();
              alert('Datos actualizados');
            } catch (e) {
              alert('Error al actualizar');
            }
          }}
        />
      )}
      
      <style>{`
        .list-item:hover {
          border-color: var(--gold-primary);
          transform: scale(1.01) translateY(-2px);
          background-color: var(--bg-tertiary) !important;
          box-shadow: 0 12px 24px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
};

const ClientDetail = ({ client, onBack, onDelete, onUpdate }) => {
  const [showCollage, setShowCollage] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: client.name, phone: client.phone });

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoadingHistory(true);
        const data = await dataService.getClientTransactions(client.id);
        setHistory(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingHistory(false);
      }
    };
    loadHistory();
  }, [client.id]);

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <button onClick={onBack} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          &larr; Volver al Listado
        </button>
        <button 
          onClick={onDelete}
          style={{ 
            color: '#ff453a', 
            background: 'rgba(255, 69, 58, 0.1)', 
            border: 'none', 
            padding: '8px 16px', 
            borderRadius: '8px', 
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600'
          }}
        >
          Eliminar Ficha
        </button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 300px) 1fr', gap: '32px' }}>
        {/* Left Sidebar: Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-card" style={{ textAlign: 'center' }}>
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '2px solid var(--border-color)' }}>
              <User size={64} color="var(--gold-primary)" />
            </div>
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input 
                  className="form-input" 
                  value={editData.name} 
                  onChange={e => setEditData({...editData, name: e.target.value})}
                  placeholder="Nombre"
                  style={{ width: '100%', padding: '8px' }}
                />
                <input 
                  className="form-input" 
                  value={editData.phone} 
                  onChange={e => setEditData({...editData, phone: e.target.value})}
                  placeholder="Teléfono"
                  style={{ width: '100%', padding: '8px' }}
                />
                <button className="btn-gold" onClick={() => { onUpdate(editData); setIsEditing(false); }}>Guardar</button>
                <button onClick={() => setIsEditing(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px' }}>Cancelar</button>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: '20px', marginBottom: '4px' }}>{client.name}</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>{client.phone}</p>
                <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', fontSize: '14px' }}>
                  <span style={{ color: 'var(--gold-primary)', fontWeight: '700' }}>{history.length}</span> Visitas registradas
                </div>
              </>
            )}
          </div>

          <div className="glass-card">
            <h4 style={{ marginBottom: '16px', fontSize: '16px' }}>Ficha Técnica Capilar</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <DetailItem label="Tipo de Cabello" value={client.hair_type || 'Normal'} />
              <DetailItem label="Cuero Cabelludo" value={client.scalp_type || 'Normal'} />
              <DetailItem label="Registrado" value={client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A'} />
            </div>
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                style={{ width: '100%', marginTop: '20px', background: 'none', border: '1px solid var(--gold-primary)', color: 'var(--gold-primary)', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}
              >
                Editar Perfil
              </button>
            )}
          </div>
        </div>
        
        {/* Right Content: History & Gallery */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ImageIcon size={18} color="var(--gold-primary)" /> Galería de Trabajos
              </h4>
              <button 
                onClick={() => setShowCollage(!showCollage)}
                style={{ 
                  background: 'rgba(212,175,55,0.1)', 
                  border: '1px solid var(--gold-primary)', 
                  color: 'var(--gold-primary)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <ColumnsIcon size={14} /> {showCollage ? 'Ver Galería' : 'Crear Comparativa'}
              </button>
            </div>

            {showCollage ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: 'var(--bg-secondary)', padding: '12px', borderRadius: '12px' }}>
                <div style={{ aspectRatio: '4/5', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', position: 'relative' }}>
                  <span style={{ position: 'absolute', bottom: '12px', left: '12px', backgroundColor: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '4px', fontSize: '10px' }}>ANTES</span>
                </div>
                <div style={{ aspectRatio: '4/5', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', border: '2px dashed var(--gold-primary)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={24} color="var(--gold-primary)" />
                  <span style={{ position: 'absolute', bottom: '12px', left: '12px', backgroundColor: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '4px', fontSize: '10px' }}>DESPUÉS</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                <div style={{ aspectRatio: '1/1', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', border: '2px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Plus size={24} color="var(--text-muted)" />
                </div>
              </div>
            )}
          </div>

          <div className="glass-card">
            <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="var(--gold-primary)" /> Historial de Visitas
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {loadingHistory ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Loader2 className="animate-spin" size={16} /> Cargando...
                </div>
              ) : history.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No hay historial registrado.</p>
              ) : (
                history.map(h => (
                  <HistoryItem 
                    key={h.id} 
                    date={new Date(h.created_at).toLocaleString('es-VE', { hour12: true })} 
                    service={h.description.split(' - ')[0].replace('Servicio: ', '')} 
                    price={h.amount} 
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailItem = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
    <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{label}</span>
    <span style={{ fontWeight: '600', fontSize: '14px' }}>{value}</span>
  </div>
);

const HistoryItem = ({ date, service, price }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px' }}>
    <div>
      <div style={{ fontWeight: '600', fontSize: '14px' }}>{service}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{date}</div>
    </div>
    <div style={{ fontWeight: '700', color: 'var(--gold-primary)' }}>${price}</div>
  </div>
);

export default ClientModule;
