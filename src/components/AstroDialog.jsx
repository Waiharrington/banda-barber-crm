import React, { useState, useEffect } from 'react';

/**
 * AstroDialog - Un modal premium para reemplazar alerts, prompts y confirms nativos.
 */
const AstroDialog = ({ 
  isOpen, 
  title, 
  message, 
  type = 'prompt', // 'alert' | 'confirm' | 'prompt'
  inputValue = '',
  placeholder = '',
  onConfirm, 
  onCancel,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  customFooter = null
}) => {
  const [val, setVal] = useState(inputValue);

  useEffect(() => {
    if (isOpen) setVal(inputValue);
  }, [isOpen, inputValue]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(10px)',
      zIndex: 9999,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div className="glass-card" style={{
        maxWidth: '450px',
        width: '100%',
        padding: '32px',
        borderRadius: '28px',
        border: '1.5px solid rgba(212, 175, 55, 0.3)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 20px rgba(212,175,55,0.1)',
        textAlign: 'center',
        animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        {title && <h3 style={{ fontSize: '22px', fontWeight: '900', marginBottom: '12px', color: 'white' }}>{title}</h3>}
        {message && <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>{message}</p>}

        {type === 'prompt' && (
          <div style={{ marginBottom: '32px' }}>
            <input 
              autoFocus
              className="form-input"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder={placeholder}
              style={{ width: '100%', textAlign: 'center', fontSize: '16px' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onConfirm(val);
                if (e.key === 'Escape') onCancel();
              }}
            />
          </div>
        )}

        {customFooter ? (
          customFooter
        ) : (
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: type === 'prompt' ? '0' : '8px' }}>
            {(type === 'confirm' || type === 'prompt') && (
              <button 
                onClick={onCancel}
                style={{ 
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.05)', 
                  border: '1px solid rgba(255, 255, 255, 0.1)', 
                  color: 'white', 
                  padding: '14px', 
                  borderRadius: '14px', 
                  fontWeight: '700', 
                  cursor: 'pointer',
                  transition: '0.2s'
                }}
              >
                {cancelText}
              </button>
            )}
            <button 
              onClick={() => onConfirm(type === 'prompt' ? val : true)}
              className="btn-gold" 
              style={{ 
                flex: 1.5,
                padding: '14px', 
                borderRadius: '14px', 
                fontWeight: '850', 
                fontSize: '15px'
              }}
            >
              {confirmText}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default AstroDialog;
