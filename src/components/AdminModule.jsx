import React, { useState } from 'react';
import { 
  Settings, 
  Database, 
  Bell, 
  Download, 
  RefreshCw, 
  Plus,
  UserPlus,
  Trash2,
  Sparkles,
  Loader2
} from 'lucide-react';
import { dataService } from '../services/dataService';

const AdminModule = ({ isMobile, onRefresh, rates, setRates }) => {
  const [businessName, setBusinessName] = useState('ASTRO BARBERSHOP');
  const [currency, setCurrency] = useState('USD');
  const [notifsEnabled, setNotifsEnabled] = useState(true);

  // Management States
  const [loading, setLoading] = useState(false);
  const [newService, setNewService] = useState({ name: '', price: '', category: 'Barbería' });
  const [newMember, setNewMember] = useState({ name: '', role: 'Barbero', commission_pct: 40, image_url: '' });

  const handleAddService = async () => {
    if (!newService.name || !newService.price) return;
    try {
      setLoading(true);
      await dataService.addService(newService);
      setNewService({ name: '', price: '', category: 'Barbería' });
      if (onRefresh) onRefresh();
      alert('Servicio agregado exitosamente');
    } catch (error) {
      alert('Error al agregar servicio');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async () => {
    if (!newMember.name) return;
    try {
      setLoading(true);
      await dataService.addStaff(newMember);
      setNewMember({ name: '', role: 'Barbero', commission_pct: 40, image_url: '' });
      if (onRefresh) onRefresh();
      alert('Trabajador agregado exitosamente');
    } catch (error) {
      alert('Error al agregar personal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: isMobile ? '80px' : '0' }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '900', letterSpacing: '-1.5px' }}>
          Panel de <span className="text-gold">Administración</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Control central y configuración del sistema.</p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
        gap: '20px' 
      }}>
        
        {/* SECCIÓN: SERVICIOS */}
        <section className="glass-card animate-slide-up" style={{ borderRadius: '24px', borderLeft: '4px solid var(--gold-primary)', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Sparkles size={18} color="var(--gold-primary)" />
            <h3 style={{ fontSize: '16px', fontWeight: '800' }}>Catálogo de Servicios</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>NOMBRE</label>
              <input 
                type="text" 
                placeholder="Ej. Corte Legendario" 
                value={newService.name} 
                onChange={(e) => setNewService({...newService, name: e.target.value})}
                style={{ width: '100%', height: '40px', fontSize: '13px' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>CATEGORÍA</label>
                <select 
                  value={newService.category} 
                  onChange={(e) => setNewService({...newService, category: e.target.value})}
                  style={{ width: '100%', height: '40px', fontSize: '13px' }}
                >
                  <option value="Barbería">Barbería</option>
                  <option value="Estilismo">Estilismo</option>
                  <option value="Tattoo">Tattoo Studio</option>
                  <option value="Tratamientos">Tratamientos</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>PRECIO ($)</label>
                <input 
                  type="number" 
                  placeholder="0" 
                  value={newService.price} 
                  onChange={(e) => setNewService({...newService, price: e.target.value})}
                  style={{ width: '100%', height: '40px', fontSize: '13px' }}
                />
              </div>
            </div>
            <button 
              className="btn-gold" 
              onClick={handleAddService} 
              disabled={loading}
              style={{ width: '100%', height: '40px', marginTop: '4px', fontSize: '13px' }}
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <><Plus size={16} style={{ marginRight: '6px' }} /> Guardar Servicio</>}
            </button>
          </div>
        </section>

        {/* SECCIÓN: PERSONAL */}
        <section className="glass-card animate-slide-up" style={{ borderRadius: '24px', borderLeft: '4px solid #fff', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <UserPlus size={18} color="white" />
            <h3 style={{ fontSize: '16px', fontWeight: '800' }}>Talento (Equipo)</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>NOMBRE</label>
                <input 
                  type="text" 
                  placeholder="Ej. Marco Silva" 
                  value={newMember.name} 
                  onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                  style={{ width: '100%', height: '40px', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>ROL</label>
                <select 
                  value={newMember.role} 
                  onChange={(e) => setNewMember({...newMember, role: e.target.value})}
                  style={{ width: '100%', height: '40px', fontSize: '13px' }}
                >
                  <option value="Barbero">Barbero</option>
                  <option value="Lavacabezas">Asistente</option>
                  <option value="Estilista">Estilista</option>
                  <option value="Mánager">Mánager</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>% COM.</label>
                <input 
                  type="number" 
                  value={newMember.commission_pct} 
                  onChange={(e) => setNewMember({...newMember, commission_pct: e.target.value})}
                  style={{ width: '100%', height: '40px', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>URL AVATAR (OPCIONAL)</label>
                <input 
                  type="text" 
                  placeholder="https://..." 
                  value={newMember.image_url} 
                  onChange={(e) => setNewMember({...newMember, image_url: e.target.value})}
                  style={{ width: '100%', height: '40px', fontSize: '13px' }}
                />
              </div>
            </div>
            <button 
              className="btn-gold" 
              onClick={handleAddStaff} 
              disabled={loading}
              style={{ width: '100%', height: '40px', marginTop: '4px', fontSize: '13px' }}
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <><Plus size={16} style={{ marginRight: '6px' }} /> Contratar Artista</>}
            </button>
          </div>
        </section>

        {/* SECCIÓN: IDENTIDAD */}
        <section className="glass-card animate-slide-up" style={{ borderRadius: '24px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Settings size={18} color="var(--gold-primary)" />
            <h3 style={{ fontSize: '16px', fontWeight: '800' }}>Identidad</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>NOMBRE COMERCIAL</label>
              <input 
                type="text" 
                value={businessName} 
                onChange={(e) => setBusinessName(e.target.value)}
                style={{ width: '100%', height: '40px', fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>URL LOGOTIPO (BRANDING)</label>
              <input 
                type="text" 
                placeholder="URL de la imagen..."
                style={{ width: '100%', height: '40px', fontSize: '13px' }}
              />
            </div>
          </div>
        </section>

        {/* SECCIÓN: CONFIGURACIÓN */}
        <section className="glass-card animate-slide-up" style={{ borderRadius: '24px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Bell size={18} color="var(--gold-primary)" />
            <h3 style={{ fontSize: '16px', fontWeight: '800' }}>Configuración</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600' }}>Notificaciones Push</span>
                <div 
                  onClick={() => setNotifsEnabled(!notifsEnabled)}
                  style={{ 
                    width: '36px', 
                    height: '20px', 
                    backgroundColor: notifsEnabled ? 'var(--gold-primary)' : 'var(--bg-tertiary)', 
                    borderRadius: '20px',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                >
                  <div style={{ 
                    width: '14px', 
                    height: '14px', 
                    backgroundColor: notifsEnabled ? 'black' : 'white', 
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '3px',
                    left: notifsEnabled ? '19px' : '3px',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }} />
                </div>
             </div>

             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600' }}>Moneda Principal</span>
                <select 
                  value={currency} 
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{ width: '80px', height: '32px', background: 'none', border: 'none', fontSize: '12px', color: 'white' }}
                >
                  <option value="USD">USD ($)</option>
                  <option value="COP">COP ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
             </div>
          </div>
        </section>

        {/* SECCIÓN: MANTENIMIENTO & DIVISAS */}
        <section className="glass-card animate-slide-up" style={{ borderRadius: '24px', padding: '20px', gridColumn: isMobile ? 'span 1' : 'span 2' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: '32px' }}>
            
            {/* Tasas de Cambio BCV */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <RefreshCw size={18} color="var(--gold-primary)" className={!rates.updated_at ? 'animate-spin' : ''} />
                <h3 style={{ fontSize: '16px', fontWeight: '800' }}>Tasas de Cambio (BCV)</h3>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '16px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800' }}>USD / BS</div>
                  <input 
                    type="number" 
                    value={rates.usd} 
                    onChange={(e) => setRates({...rates, usd: parseFloat(e.target.value)})}
                    style={{ background: 'none', border: 'none', fontSize: '18px', fontWeight: '900', color: 'var(--gold-primary)', padding: '4px 0' }}
                  />
                </div>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '16px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800' }}>EUR / BS</div>
                  <input 
                    type="number" 
                    value={rates.eur} 
                    onChange={(e) => setRates({...rates, eur: parseFloat(e.target.value)})}
                    style={{ background: 'none', border: 'none', fontSize: '18px', fontWeight: '900', color: 'var(--gold-primary)', padding: '4px 0' }}
                  />
                </div>
              </div>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                Actualizado: {rates.updated_at ? new Date(rates.updated_at).toLocaleString() : 'Sincronizando...'}
              </p>
            </div>

            {/* Acciones de Base de Datos */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Database size={18} color="var(--gold-primary)" />
                <h3 style={{ fontSize: '16px', fontWeight: '800' }}>Base de Datos</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <AdminActionRow 
                  compact 
                  icon={<Download size={14} />} 
                  label="Exportar Backup" 
                  actionLabel="Descargar" 
                  onClick={async () => {
                    const data = await dataService.getTransactions();
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `backup_astro_${new Date().getTime()}.json`;
                    a.click();
                  }}
                />
                <AdminActionRow 
                  compact 
                  isDanger 
                  icon={<Trash2 size={14} />} 
                  label="Reset Datos" 
                  actionLabel="Borrar" 
                  onClick={async () => {
                    try {
                      const success = await dataService.resetDatabase();
                      if (success) {
                        alert('Sistema reiniciado. La página se recargará.');
                        window.location.reload();
                      }
                    } catch (e) {
                      alert('Error al reiniciar');
                    }
                  }}
                />
              </div>
            </div>

          </div>
        </section>
      </div>

      <div style={{ textAlign: 'center', marginTop: '48px', padding: '20px', color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '1px' }}>
        ASTRO BARBER CRM — SISTEMA PROFESIONAL DE GESTIÓN
      </div>
    </div>
  );
};

const AdminActionRow = ({ icon, label, actionLabel, isDanger, compact, onClick }) => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: compact ? '12px 16px' : '20px', 
    backgroundColor: 'rgba(255,255,255,0.02)', 
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.03)'
  }}>
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <div style={{ color: isDanger ? '#ff453a' : 'var(--text-secondary)' }}>{icon}</div>
      <div style={{ fontWeight: '700', fontSize: '13px' }}>{label}</div>
    </div>
    <button 
      onClick={onClick}
      style={{ 
        backgroundColor: isDanger ? 'rgba(255, 69, 58, 0.1)' : 'rgba(255,255,255,0.05)', 
        color: isDanger ? '#ff453a' : 'white', 
        border: 'none', 
        padding: '6px 12px', 
        borderRadius: '8px', 
        fontSize: '11px', 
        fontWeight: '800',
        cursor: 'pointer'
      }}
    >
      {actionLabel}
    </button>
  </div>
);

export default AdminModule;
