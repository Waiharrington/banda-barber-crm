import React from 'react';
import { Scissors } from 'lucide-react';

const AstroLoader = ({ visible }) => {
  React.useEffect(() => {
    if (visible) {
      const prevBodyOverflow = document.body.style.overflow;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevBodyOverflow || '';
        document.documentElement.style.overflow = prevHtmlOverflow || '';
      };
    }
  }, [visible]);

  return (
    <div 
      className="astro-loader-container" 
      style={{ 
        opacity: visible ? 1 : 0, 
        pointerEvents: visible ? 'all' : 'none' 
      }}
    >
      <div className="spinning-scissors">
        <Scissors size={80} strokeWidth={1.5} />
      </div>
      <div className="loader-text">Astro Experience</div>
      
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
