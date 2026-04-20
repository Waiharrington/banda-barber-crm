import React from 'react';
import { 
  Home, 
  Users, 
  Package, 
  Wallet, 
  Scissors,
  Plus
} from 'lucide-react';

const MobileBottomNav = ({ activeTab, setActiveTab, onOpenSale }) => {
  const items = [
    { id: 'dashboard', label: 'Inicio', icon: Home },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'inventory', label: 'Stock', icon: Package },
    { id: 'finance', label: 'Caja', icon: Wallet },
    { id: 'personnel', label: 'Equipo', icon: Scissors },
  ];

  return (
    <nav style={{
      position: 'fixed',
      bottom: '16px',
      left: '16px',
      right: '16px',
      height: '70px',
      backgroundColor: 'rgba(20, 20, 20, 0.85)',
      backdropFilter: 'blur(15px)',
      borderRadius: 'var(--radius-pill)',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: '0 10px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      zIndex: 1000
    }}>
      {items.map((item, index) => (
        <React.Fragment key={item.id}>
          <button
            onClick={() => setActiveTab(item.id)}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '10px',
              color: activeTab === item.id ? 'var(--gold-primary)' : 'var(--text-muted)',
              transition: 'var(--transition-fast)',
              cursor: 'pointer'
            }}
          >
            <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
            <span style={{ fontSize: '10px', fontWeight: activeTab === item.id ? '700' : '500' }}>
              {item.label}
            </span>
          </button>
          
          {/* Action button in the middle if needed, but user asked for 5 buttons in total menu. 
              Let's make them 5 items + the floating button at top right or middle?
              Actually, the reference has 4 + 1 home. 
              If user wants 5 buttons, these 5 are perfect. 
              I'll add the "Plus" as a separate floating button usually, 
              but let's integrate it as a 6th central one or just keep it floating.
          */}
        </React.Fragment>
      ))}

      {/* Floating Action Button (Optional, but user reference had a plus) */}
      <style>{`
        .fab-mobile {
          position: fixed;
          bottom: 100px;
          right: 20px;
          width: 56px;
          height: 56px;
          background: var(--gold-gradient);
          border-radius: 50%;
          display: flex;
          alignItems: center;
          justify-content: center;
          box-shadow: var(--gold-glow);
          color: var(--bg-primary);
          border: none;
          z-index: 999;
          transition: var(--transition-fast);
        }
        .fab-mobile:active {
          transform: scale(0.9);
        }
      `}</style>
    </nav>
  );
};

export default MobileBottomNav;
