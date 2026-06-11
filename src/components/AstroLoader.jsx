import React, { useState, useEffect } from 'react';
import { Scissors } from 'lucide-react';

const loadingTexts = [
  "Afilando navajas estelares...",
  "Calibrando tijeras de alta precisión...",
  "Preparando la espuma perfecta...",
  "Calculando el desvanecido ideal...",
  "Encendiendo las luces de la estación...",
  "Cargando la Astro Experience..."
];

const AstroLoader = ({ visible }) => {
  const [progress, setProgress] = useState(0);
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    if (visible) {
      const prevBodyOverflow = document.body.style.overflow;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      setProgress(0);
      setTextIndex(0);

      // Fake progress that slows down as it approaches 95%
      const interval = setInterval(() => {
        setProgress(p => {
          if (p >= 95) return 95;
          const increment = (95 - p) * 0.08;
          return p + Math.max(increment, 0.5);
        });
      }, 100);

      // Rotate texts every 1.5s
      const textInterval = setInterval(() => {
        setTextIndex(i => (i + 1) % loadingTexts.length);
      }, 1500);

      return () => {
        document.body.style.overflow = prevBodyOverflow || '';
        document.documentElement.style.overflow = prevHtmlOverflow || '';
        clearInterval(interval);
        clearInterval(textInterval);
      };
    } else {
      // Snap to 100% when loading finishes before hiding
      setProgress(100);
    }
  }, [visible]);

  return (
    <div 
      className="astro-loader-container" 
      style={{ 
        opacity: visible ? 1 : 0, 
        pointerEvents: visible ? 'all' : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '30px'
      }}
    >
      <div className="spinning-scissors">
        <Scissors size={80} strokeWidth={1.5} color="var(--gold-primary)" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '280px', gap: '12px' }}>
        <div className="loader-text" style={{ fontSize: '18px', letterSpacing: '4px', textAlign: 'center' }}>
          ASTRO EXPERIENCE
        </div>
        
        {/* Dynamic Text */}
        <div style={{ 
          fontSize: '11px', 
          color: 'var(--text-muted)', 
          fontWeight: '600', 
          textTransform: 'uppercase',
          letterSpacing: '1px',
          height: '18px',
          transition: 'opacity 0.3s ease',
          textAlign: 'center',
          whiteSpace: 'nowrap'
        }}>
          {loadingTexts[textIndex]}
        </div>

        {/* Progress Bar Container */}
        <div style={{
          width: '100%',
          height: '4px',
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderRadius: '4px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {/* Golden Progress Fill */}
          <div style={{
            height: '100%',
            backgroundColor: 'var(--gold-primary)',
            width: `${progress}%`,
            transition: 'width 0.1s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 0 10px var(--gold-primary)'
          }} />
        </div>
        
        {/* Percentage Text */}
        <div style={{ fontSize: '10px', color: 'var(--gold-primary)', fontWeight: '800', alignSelf: 'flex-end' }}>
          {Math.round(progress)}%
        </div>
      </div>
      
      {/* Background glow behind scissors - enlarged, multi-stop extra-soft gradient to avoid banding */}
      <div style={{
        position: 'absolute',
        width: '600px',
        height: '600px',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(circle, rgba(212,175,55,0.06) 0%, rgba(212,175,55,0.02) 30%, rgba(212,175,55,0.005) 55%, transparent 75%)',
        zIndex: -1,
        filter: 'blur(120px)',
        pointerEvents: 'none'
      }} />
    </div>
  );
};

export default AstroLoader;
