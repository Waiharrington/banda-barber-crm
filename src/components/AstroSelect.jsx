import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * AstroSelect - Un componente de selección premium que evita los estilos nativos de Windows.
 */
const AstroSelect = ({ 
  options = [], 
  value, 
  onChange, 
  placeholder = "Seleccionar...", 
  label = "",
  style = {},
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find(opt => opt.value == value);

  const [popDirection, setPopDirection] = useState('down');

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 260) { // Approx max height + padding
        setPopDirection('up');
      } else {
        setPopDirection('down');
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className="form-group" style={{ position: 'relative', width: '100%', zIndex: isOpen ? 9999 : 1, ...style, opacity: disabled ? 0.6 : 1, pointerEvents: disabled ? 'none' : 'auto' }} ref={containerRef}>
      {label && <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</label>}
      
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: isOpen ? '1px solid var(--gold-primary)' : '1px solid rgba(255, 255, 255, 0.1)',
          padding: '12px 16px',
          borderRadius: '12px',
          color: selectedOption ? 'white' : 'var(--text-muted)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isOpen ? '0 0 0 4px rgba(212, 175, 55, 0.1)' : 'none',
          fontSize: '15px'
        }}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown size={18} color="var(--gold-primary)" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.3s' }} />
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: popDirection === 'down' ? 'calc(100% + 8px)' : 'auto',
          bottom: popDirection === 'up' ? 'calc(100% + 8px)' : 'auto',
          left: 0,
          right: 0,
          backgroundColor: '#1c1c1e',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
          zIndex: 9999,
          maxHeight: '250px',
          overflowY: 'auto',
          padding: '8px',
          animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }} className="astro-scrollbar">
          {options.length === 0 ? (
            <div style={{ padding: '12px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '13px' }}>Sin opciones</div>
          ) : (
            options.map((opt) => (
              <div 
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  backgroundColor: value === opt.value ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                  color: value === opt.value ? 'var(--gold-primary)' : 'white',
                  transition: '0.2s',
                  fontSize: '14px',
                  fontWeight: value === opt.value ? '700' : '500',
                  marginBottom: '2px'
                }}
                className="astro-option"
              >
                {opt.label}
              </div>
            ))
          )}
        </div>
      )}

      <style>{`
        .astro-option:hover {
          background-color: rgba(255, 255, 255, 0.05) !important;
          transform: translateX(4px);
        }
        .astro-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .astro-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(212, 175, 55, 0.2);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default AstroSelect;
