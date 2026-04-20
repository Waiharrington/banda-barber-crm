import React, { useState, useEffect } from 'react';
import { X, User, Star, Scissors, CreditCard, Loader2, Plus, Sparkles } from 'lucide-react';
import { dataService } from '../services/dataService';

const SaleServiceModal = ({ isOpen, onClose, clients, services, staff, onRefresh, rates, currency }) => {
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [involvedStaff, setInvolvedStaff] = useState([]); 
  const [totalPrice, setTotalPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!selectedClient || !selectedService || involvedStaff.length === 0) {
      alert('Por favor completa todos los campos.');
      return;
    }

    try {
      setLoading(true);
      const serviceObj = services.find(s => s.id === selectedService);
      
      await dataService.registerServiceSale({
        clientId: selectedClient,
        serviceId: selectedService,
        serviceName: serviceObj?.name,
        totalPrice: totalPrice,
        exchangeRate: currency === 'EUR' ? rates.eur : rates.usd,
        currency: currency
      }, involvedStaff);

      if (onRefresh) onRefresh();
      onClose();
    } catch (error) {
      console.error('Error registering sale:', error);
      alert('Error técnico al registrar venta. Revisa la tasa.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = () => {
    setInvolvedStaff([...involvedStaff, { staffId: '', commissionEarned: 0 }]);
  };

  const handleRemoveStaff = (index) => {
    const newStaff = [...involvedStaff];
    newStaff.splice(index, 1);
    setInvolvedStaff(newStaff);
  };

  const handleStaffChange = (index, staffId) => {
    const person = staff.find(s => s.id === staffId);
    const newStaff = [...involvedStaff];
    newStaff[index] = { 
      ...newStaff[index], 
      staffId, 
      commissionEarned: (totalPrice * (person?.commission || 0)) / 100 
    };
    setInvolvedStaff(newStaff);
  };

  const handleServiceChange = (serviceId) => {
    const service = services.find(s => s.id === parseInt(serviceId));
    setSelectedService(serviceId);
    setTotalPrice(service?.price || 0);
  };

  const modalContainerStyle = isMobile ? {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#161616',
    borderTopLeftRadius: '32px',
    borderTopRightRadius: '32px',
    padding: '32px 24px 44px 24px',
    zIndex: 1100,
    boxShadow: '0 -20px 40px rgba(0,0,0,0.4)',
    maxHeight: '90vh',
    overflowY: 'auto'
  } : {
    width: '500px',
    maxWidth: '90vw',
    backgroundColor: '#161616',
    borderRadius: '28px',
    padding: '32px',
    position: 'relative',
    zIndex: 1100,
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
  };

  return (
    <div className="modal-overlay animate-fade-in" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: isMobile ? 'flex-end' : 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(10px)'
    }}>
      <div className={isMobile ? 'animate-slide-up' : 'animate-scale-in'} style={modalContainerStyle}>
        {/* iOS Grabber for Mobile */}
        {isMobile && (
          <div style={{
            width: '40px',
            height: '4px',
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: '2px',
            margin: '-12px auto 24px auto'
          }} />
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-0.5px' }}>Nueva <span className="text-gold">Venta</span></h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Registra el servicio en tiempo real.</p>
          </div>
          <button onClick={onClose} className="action-btn" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Section: Who & What */}
          <div className="glass-card" style={{ padding: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '10px', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cliente</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: '16px', top: '14px' }} color="var(--gold-primary)" />
                  <select 
                    value={selectedClient} 
                    onChange={(e) => setSelectedClient(e.target.value)}
                    style={{ width: '100%', paddingLeft: '48px', height: '48px', fontSize: '15px', fontWeight: '600' }}
                  >
                    <option value="">Seleccionar cliente...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '10px', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Servicio Estrella</label>
                <div style={{ position: 'relative' }}>
                  <Sparkles size={18} style={{ position: 'absolute', left: '16px', top: '14px' }} color="var(--gold-primary)" />
                  <select 
                    value={selectedService} 
                    onChange={(e) => handleServiceChange(e.target.value)}
                    style={{ width: '100%', paddingLeft: '48px', height: '48px', fontSize: '15px', fontWeight: '600' }}
                  >
                    <option value="">Seleccionar servicio...</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name} — ${s.price}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section: The Team */}
          <div>
            <label style={{ display: 'block', marginBottom: '12px', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Personal Asignado</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {involvedStaff.map((item, index) => (
                <div key={index} className="animate-fade-in" style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  padding: '12px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div style={{ color: 'var(--gold-primary)' }}><Scissors size={18} /></div>
                  <select 
                    value={item.staffId} 
                    onChange={(e) => handleStaffChange(index, e.target.value)}
                    style={{ flex: 1, height: '40px', background: 'none', border: 'none', padding: 0 }}
                  >
                    <option value="">¿Quién atendió?</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button onClick={() => handleRemoveStaff(index)} style={{ color: '#ff4d4d', background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                    <X size={18} />
                  </button>
                </div>
              ))}
              <button 
                onClick={handleAddStaff}
                style={{ 
                  background: 'rgba(212, 175, 55, 0.05)', 
                  border: '1.5px dashed rgba(212, 175, 55, 0.2)', 
                  color: 'var(--gold-primary)', 
                  padding: '14px', 
                  borderRadius: '16px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px'
                }}
              >
                <Plus size={18} /> Añadir Barbero / Lavado
              </button>
            </div>
          </div>

          {/* Checkout Footer with Dual Pricing */}
          <div style={{ 
            marginTop: '12px', 
            padding: '20px 24px', 
            backgroundColor: 'rgba(212, 175, 55, 0.08)', 
            borderRadius: '24px',
            border: '1px solid rgba(212, 175, 55, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--gold-primary)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>RESUMEN DE COBRO</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ fontSize: '28px', fontWeight: '950', color: 'white', letterSpacing: '-1px' }}>
                    {currency === 'USD' ? '$' : '€'}{totalPrice}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                    {(totalPrice * (rates?.[currency?.toLowerCase()] || rates?.usd || 1)).toFixed(2)} BS
                  </div>
                </div>
              </div>
              <button 
                className="btn-gold" 
                onClick={handleSubmit}
                disabled={loading}
                style={{ height: '56px', padding: '0 32px', borderRadius: '16px', fontSize: '15px' }}
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaleServiceModal;
