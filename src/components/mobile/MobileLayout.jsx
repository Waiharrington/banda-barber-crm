import React from 'react';
import MobileBottomNav from './MobileBottomNav';
import logo from '../../assets/logo.png';

const MobileLayout = ({ children, activeTab, setActiveTab, onOpenSale }) => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-primary)',
      color: 'white',
      padding: '10px 20px 120px 20px',
      position: 'relative'
    }}>
      {/* Global Brand Header */}
      <header style={{ 
        height: '60px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        marginBottom: '20px'
      }}>
        <img src={logo} alt="Astro Barber" style={{ height: '35px', width: 'auto' }} />
      </header>
      
      {children}

      <MobileBottomNav 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenSale={onOpenSale} 
      />

      <style>{`
        body {
          overflow-x: hidden;
          background-color: var(--bg-primary);
        }
        * {
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>
    </div>
  );
};

export default MobileLayout;
