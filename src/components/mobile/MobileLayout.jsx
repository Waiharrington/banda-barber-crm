import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import MobileBottomNav from './MobileBottomNav';
import logo from '../../assets/logo.png';

const MobileLayout = ({ children, activeTab, setActiveTab, onOpenSale }) => {
  const { logout } = useAuth();
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
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <div style={{ width: '40px' }} /> {/* Spacer */}
        <img src={logo} alt="Astro Barber" style={{ height: '30px', width: 'auto' }} />
        <button 
          onClick={logout}
          style={{ background: 'none', border: 'none', color: '#ff453a', padding: '10px' }}
        >
          <LogOut size={20} />
        </button>
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
