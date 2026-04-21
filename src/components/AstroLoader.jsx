import React from 'react';
import { Scissors } from 'lucide-react';

const AstroLoader = ({ visible }) => {
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
      
      {/* Background glow behind scissors */}
      <div style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)',
        zIndex: -1,
        filter: 'blur(40px)'
      }} />
    </div>
  );
};

export default AstroLoader;
