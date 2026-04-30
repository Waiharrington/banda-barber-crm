import React, { useState, useEffect } from 'react';
import { useNotifs } from '../context/NotificationContext';
import { X, User, Star, Scissors, CreditCard, Loader2, Plus, Sparkles } from 'lucide-react';
import { dataService } from '../services/dataService';
import AstroSelect from './AstroSelect';

const SaleServiceModal = ({ isOpen, onClose, clients, services, staff, onRefresh, rates, currency }) => {
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [totalPrice, setTotalPrice] = useState(0);
  const [involvedStaff, setInvolvedStaff] = useState([{ staffId: '', commissionEarned: 0 }]);
  const [loading, setLoading] = useState(false);
  const { showToast, triggerConfetti, sendPushNotification } = useNotifs();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!selectedClient || !selectedService || involvedStaff.length === 0) {
      showToast('Por favor completa todos los campos.', 'error');
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
      
      // Astro Experience Triggers
      triggerConfetti();
      showToast(`¡Venta de ${serviceObj?.name} exitosa!`);
      sendPushNotification('🚀 ¡Nueva Venta!', `${serviceObj?.name} por ${currency === 'USD' ? '$' : '€'}${totalPrice}`);
      
      onClose();
    } catch (error) {
      console.error('Error registering sale:', error);
      showToast('Error técnico al registrar venta.', 'error');
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
              <AstroSelect 
                label="Cliente"
                value={selectedClient}
                onChange={val => setSelectedClient(val)}
                options={clients.map(c => ({ label: c.name, value: c.id }))}
                placeholder="Seleccionar cliente..."
                icon={<User size={18} color="var(--gold-primary)" />}
              />

                <AstroSelect 
                  label="Servicio Estrella"
                  value={selectedService}
                  onChange={val => handleServiceChange(val)}
                  options={services.map(s => ({ 
                    label: `${s.name} — $${s.price}${rates?.usd > 0 ? ` (${Math.round(s.price * rates.usd).toLocaleString()} Bs.)` : ''}`, 
                    value: s.id 
                  }))}
                  placeholder="Seleccionar servicio..."
                  icon={<Sparkles size={18} color="var(--gold-primary)" />}
                />
                
                {selectedService && services.find(s => s.id === selectedService)?.description && (
                  <div className="animate-fade-in" style={{ 
                    marginTop: '-8px',
                    padding: '12px 16px', 
                    backgroundColor: 'rgba(212, 175, 55, 0.05)', 
                    borderLeft: '3px solid var(--gold-primary)', 
                    borderRadius: '8px',
                    fontSize: '11px',
                    lineHeight: '1.5',
                    color: 'var(--text-secondary)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: 'var(--gold-primary)', fontWeight: '800', textTransform: 'uppercase', fontSize: '9px' }}>
                      <Sparkles size={12} /> Guion de Venta para Caja
                    </div>
                    {services.find(s => s.id === selectedService).description}
                  </div>
                )}
              </div>
          </div>

          {/* Section: The Team */}
          <div>
            <label style={{ display: 'block', marginBottom: '12px', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Personal Asignado</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {involvedStaff.map((item, index) => (
                <div key={index} className="animate-fade-in" style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <AstroSelect 
                      value={item.staffId}
                      onChange={val => handleStaffChange(index, val)}
                      options={staff.map(s => ({ label: s.name, value: s.id }))}
                      placeholder="¿Quién atendió?"
                      icon={<Scissors size={18} color="var(--gold-primary)" />}
                    />
                  </div>
                  <button onClick={() => handleRemoveStaff(index)} className="action-btn" style={{ color: '#ff4d4d', height: '48px', width: '48px', borderRadius: '12px', border: '1px solid rgba(255,77,77,0.2)' }}>
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
                    {Math.round(totalPrice * (rates?.[currency?.toLowerCase()] || rates?.usd || 1)).toLocaleString()} BS
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
