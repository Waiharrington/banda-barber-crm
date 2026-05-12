import React, { useState, useEffect } from 'react';
import { useNotifs } from '../context/NotificationContext';
import { 
  Plus, 
  Minus, 
  Search, 
  Download, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Filter,
  Wallet,
  Calendar,
  ChevronRight
} from 'lucide-react';

import { dataService } from '../services/dataService';
import AstroDialog from './AstroDialog';

const FinanceModule = ({ isMobile, currency, rates, staff = [] }) => {
  const { showToast } = useNotifs();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' or 'analysis'
  
  // Custom Dialog State
  const [dialog, setDialog] = useState({
    isOpen: false,
    type: 'prompt',
    title: '',
    message: '',
    placeholder: '',
    onConfirm: null,
    step: 1, // To handle sequential prompts (desc -> amount)
    tempData: {}
  });

  // Business Logic States (from Excel 2)
  const [fixedCosts, setFixedCosts] = useState(() => {
    const saved = localStorage.getItem('astro_fixed_costs');
    return saved ? JSON.parse(saved) : { 
      rent: 522, 
      services: 300, 
      payroll: 60, 
      software: 45,
      marketing: 60,
      tax: 200,
      workstations: 3,
      avgServiceTime: 45 // minutes
    };
  });
  const [isEditingCosts, setIsEditingCosts] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await dataService.getTransactions();
      setTransactions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleManualTransaction = (type) => {
    setDialog({
      isOpen: true,
      type: 'prompt',
      title: type === 'income' ? 'Registrar Ingreso' : 'Registrar Gasto',
      message: 'Ingresa una descripción para este movimiento:',
      placeholder: 'Ej. Compra de Insumos, Propina...',
      step: 1,
      tempData: { type },
      onConfirm: (desc) => {
        if (!desc) {
          setDialog(prev => ({ ...prev, isOpen: false }));
          return;
        }
        // Move to step 2: Amount
        setDialog({
          isOpen: true,
          type: 'prompt',
          title: 'Monto de la Operación',
          message: `¿Cuánto es el monto para: "${desc}"?`,
          placeholder: 'Monto en $ (USD)',
          step: 2,
          tempData: { type, desc },
          onConfirm: async (amount) => {
            if (!amount || isNaN(amount)) {
              showToast("Monto inválido", "error");
              setDialog(prev => ({ ...prev, isOpen: false }));
              return;
            }
            try {
              await dataService.addTransaction({
                description: desc,
                amount: parseFloat(amount),
                type: type,
                category: type === 'income' ? 'Ingreso Manual' : 'Gasto Manual',
                currency: 'USD',
                exchange_rate: 1
              });
              fetchTransactions();
              showToast(`${type === 'income' ? 'Ingreso' : 'Gasto'} registrado correctamente.`);
            } catch (e) {
              showToast('Error al registrar transacción.', 'error');
            } finally {
              setDialog(prev => ({ ...prev, isOpen: false }));
            }
          }
        });
      }
    });
  };

  const handleExport = () => {
    try {
      const headers = ['ID', 'Fecha', 'Descripción', 'Tipo', 'Monto', 'Categoría'];
      const rows = transactions.map(t => [
        t.id, 
        new Date(t.created_at).toLocaleString('es-VE', { hour12: true }), 
        t.description, 
        t.type, 
        t.amount, 
        t.category
      ]);
      
      let csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n"
        + rows.map(e => e.join(",")).join("\n");
        
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `finanzas_astro_${new Date().toLocaleDateString()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Reporte exportado con éxito.');
    } catch (e) {
      showToast('Error al exportar reporte.', 'error');
    }
  };

  const handleImportHistory = () => {
    showToast("Función de importación de Excel en preparación...", "info");
    // This will trigger a script in the future to read the provided Excel files
  };

  const totalIncome = transactions.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc, 0);
  const totalExpense = transactions.reduce((acc, t) => t.type === 'expense' ? acc + t.amount : acc, 0);
  const balance = totalIncome - totalExpense;

  // Analysis Logic (Excel Replication)
  const analysisData = (() => {
    const barberStats = {};
    const paymentStats = {};
    const serviceStats = {};

    transactions.forEach(t => {
      if (t.type !== 'income') return;

      const meta = t.metadata || {};
      const staffInvolved = meta.staffInvolved || [];
      const bsAmount = t.amount * (t.exchange_rate || 1);

      // 1. Payment Methods
      const method = meta.method_usd || meta.method_bs || 'Otro';
      paymentStats[method] = (paymentStats[method] || 0) + t.amount;

      // 2. Barber Stats (Based on staffInvolved)
      staffInvolved.forEach(s => {
        // Find staff name from staffId if possible, or use ID
        // Note: We might need the full staff list here or just use what's in metadata if we store names there.
        // For now, let's assume we can at least aggregate by ID and we'll need names later.
        const sId = s.staffId;
        if (!barberStats[sId]) {
          barberStats[sId] = { id: sId, services: 0, incomeBs: 0, lavados: 0 };
        }
        
        // If they earned commission and it's an appointment (not just tip)
        if (meta.appointment_id) {
          barberStats[sId].services += 1;
          barberStats[sId].incomeBs += bsAmount;
          
          // Washing Logic: If this staff member was involved and there was a washer selected
          if (meta.staffInvolved.some(si => si.staffId === sId && si.commissionEarned > 0)) {
             // This is a bit complex without knowing roles here. 
             // We'll simplify: if they are in staffInvolved, they did a service.
          }
        }
      });

      // 3. Service Stats
      if (meta.appointment_id) {
        // Extract service name from description or metadata
        const serviceName = t.description.split(' - ')[1]?.replace('Servi: ', '') || 'Varios';
        serviceStats[serviceName] = (serviceStats[serviceName] || 0) + 1;
      }
    });

    return { barberStats, paymentStats, serviceStats };
  })();

  const totalFixedCosts = Object.entries(fixedCosts).reduce((acc, [key, val]) => {
    return (key !== 'workstations' && key !== 'avgServiceTime') ? acc + Number(val) : acc;
  }, 0);

  const netProfit = balance - totalFixedCosts;
  const breakEven = totalFixedCosts / 0.4; // Assuming 40% margin (after 60% commission)
  const avgTicket = totalIncome / (Object.values(analysisData.barberStats).reduce((acc, b) => acc + b.services, 0) || 1);

  const handleSaveCosts = (e) => {
    e.preventDefault();
    localStorage.setItem('astro_fixed_costs', JSON.stringify(fixedCosts));
    setIsEditingCosts(false);
    showToast("Estructura de costos actualizada.");
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: isMobile ? '80px' : '0' }}>
      {/* Header Section */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: isMobile ? '20px' : '0',
        marginBottom: '40px'
      }}>
        <div>
          <h2 style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '800', letterSpacing: '-0.5px' }}>
            Caja <span className="text-gold">Chica</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Control de flujo y conciliación.</p>
        </div>
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          width: isMobile ? '100%' : 'auto',
          flexDirection: isMobile ? 'row' : 'row' // Keep side-by-side if refined enough
        }}>
          <button className="btn-gold" onClick={() => handleManualTransaction('income')} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '8px', 
            borderRadius: '12px',
            height: '44px',
            flex: 1,
            fontSize: '14px',
            fontWeight: '600'
          }}>
            <Plus size={16} /> Ingreso
          </button>
          <button onClick={() => handleManualTransaction('expense')} style={{ 
            backgroundColor: 'rgba(255, 69, 58, 0.08)', 
            border: '1px solid rgba(255, 69, 58, 0.15)', 
            color: '#ff453a',
            height: '44px',
            padding: '0 16px',
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontWeight: '600',
            fontSize: '14px',
            flex: 1,
            transition: 'all 0.2s'
          }}>
            <Minus size={16} /> Gasto
          </button>
        </div>
      </div>

      {/* Tab Selector */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '32px', borderBottom: '1px solid var(--border-color)' }}>
        <button 
          onClick={() => setActiveTab('transactions')}
          style={{ 
            padding: '12px 20px', 
            background: 'none', 
            border: 'none', 
            color: activeTab === 'transactions' ? 'var(--gold-primary)' : 'var(--text-secondary)',
            fontWeight: '800',
            fontSize: '14px',
            cursor: 'pointer',
            borderBottom: activeTab === 'transactions' ? '2px solid var(--gold-primary)' : 'none',
            transition: '0.2s'
          }}
        >
          TRANSACCIONES
        </button>
        <button 
          onClick={() => setActiveTab('analysis')}
          style={{ 
            padding: '12px 20px', 
            background: 'none', 
            border: 'none', 
            color: activeTab === 'analysis' ? 'var(--gold-primary)' : 'var(--text-secondary)',
            fontWeight: '800',
            fontSize: '14px',
            cursor: 'pointer',
            borderBottom: activeTab === 'analysis' ? '2px solid var(--gold-primary)' : 'none',
            transition: '0.2s'
          }}
        >
          ANÁLISIS ASTRO (EXCEL)
        </button>
        <button 
          onClick={() => setActiveTab('profitability')}
          style={{ 
            padding: '12px 20px', 
            background: 'none', 
            border: 'none', 
            color: activeTab === 'profitability' ? 'var(--gold-primary)' : 'var(--text-secondary)',
            fontWeight: '800',
            fontSize: '14px',
            cursor: 'pointer',
            borderBottom: activeTab === 'profitability' ? '2px solid var(--gold-primary)' : 'none',
            transition: '0.2s'
          }}
        >
          RENTABILIDAD Y COSTOS
        </button>
      </div>

      {activeTab === 'transactions' && (
        <>
        {/* Stats Cards Grid */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: '20px',
          marginBottom: '40px'
        }}>
        <div className="glass-card" style={{ 
          textAlign: 'center', 
          padding: '32px',
          border: '1px solid var(--border-color)',
          borderRadius: '24px'
        }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase' }}>Saldo Actual</div>
          <div style={{ fontSize: '40px', fontWeight: '900', letterSpacing: '-1px', color: balance >= 0 ? 'var(--gold-primary)' : '#ff453a' }}>
            ${balance.toFixed(2)}
          </div>
        </div>
        
        <div className="glass-card" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '20px', 
          padding: '24px',
          borderRadius: '24px' 
        }}>
          <div style={{ 
            width: '56px', 
            height: '56px', 
            backgroundColor: 'rgba(50, 215, 75, 0.1)', 
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ArrowUpCircle size={28} color="#32d74b" />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>INGRESOS (HOY)</div>
            <div style={{ fontSize: '24px', fontWeight: '800' }}>${totalIncome.toFixed(2)}</div>
          </div>
        </div>

        <div className="glass-card" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '20px', 
          padding: '24px',
          borderRadius: '24px' 
        }}>
          <div style={{ 
            width: '56px', 
            height: '56px', 
            backgroundColor: 'rgba(255, 69, 58, 0.1)', 
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ArrowDownCircle size={28} color="#ff453a" />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>EGRESOS (HOY)</div>
            <div style={{ fontSize: '24px', fontWeight: '800' }}>${totalExpense.toFixed(2)}</div>
          </div>
        </div>
      </section>

      {/* Astro Cash Closing (AUTOCONCILIATION) */}
      <section className="glass-card animate-slide-up" style={{ 
        marginBottom: '40px', 
        padding: '32px', 
        borderRadius: '28px',
        background: 'linear-gradient(135deg, rgba(28,28,30,0.8), rgba(212,175,55,0.05))',
        border: '1px solid rgba(212,175,55,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'var(--gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={20} color="black" />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: '900' }}>Cierre de Caja <span className="text-gold">Astro</span></h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '20px' }}>
          <div style={{ padding: '20px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '20px' }}>
            <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px' }}>EFECTIVO ($)</div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#32d74b' }}>
              ${transactions.filter(t => t.metadata?.cash_usd).reduce((acc, t) => acc + (t.metadata.cash_usd || 0), 0).toFixed(2)}
            </div>
          </div>
          <div style={{ padding: '20px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '20px' }}>
            <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px' }}>TRANSFERENCIA (BS)</div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--gold-primary)' }}>
              {transactions.filter(t => t.metadata?.transfer_bs).reduce((acc, t) => acc + (t.metadata.transfer_bs || 0), 0).toFixed(2)} <span style={{fontSize: '12px'}}>BS</span>
            </div>
          </div>
          <div style={{ padding: '20px', backgroundColor: 'rgba(255,69,58,0.05)', borderRadius: '20px' }}>
            <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px' }}>COMISIONES DEUDA</div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#ff453a' }}>
              ${(totalIncome * 0.4).toFixed(2)} {/* Placeholder for real aggregated commission logic */}
            </div>
          </div>
          <div style={{ padding: '20px', backgroundColor: 'rgba(212,175,55,0.1)', borderRadius: '20px', border: '1px solid var(--gold-primary)' }}>
            <div style={{ fontSize: '10px', fontWeight: '900', color: 'black', backgroundColor: 'var(--gold-primary)', display: 'inline-block', padding: '2px 6px', borderRadius: '4px', marginBottom: '4px' }}>NETO REAL</div>
            <div style={{ fontSize: '24px', fontWeight: '950', color: 'white' }}>
              ${(totalIncome - totalExpense).toFixed(2)}
            </div>
          </div>
        </div>
      </section>

      {/* Transactions Section */}
      <div className="glass-card" style={{ padding: isMobile ? '20px' : '32px', borderRadius: '28px' }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between', 
          gap: isMobile ? '16px' : '0',
          marginBottom: '32px',
          alignItems: isMobile ? 'flex-start' : 'center'
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: '700' }}>Historial de Transacciones</h3>
          <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
            <button onClick={handleExport} style={{ 
              flex: 1,
              background: 'var(--bg-tertiary)', 
              border: '1px solid var(--border-color)', 
              color: 'var(--text-secondary)', 
              padding: '10px 16px', 
              borderRadius: '12px', 
              display: 'flex', 
              gap: '8px', 
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px'
            }}>
              <Download size={16} /> Exportar
            </button>
            <button style={{ 
              flex: 1,
              background: 'var(--bg-tertiary)', 
              border: '1px solid var(--border-color)', 
              color: 'var(--text-secondary)', 
              padding: '10px 16px', 
              borderRadius: '12px', 
              display: 'flex', 
              gap: '8px', 
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px'
            }}>
              <Filter size={16} /> Filtros
            </button>
          </div>
        </div>

        {isMobile ? (
          /* Mobile Card List */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {transactions.map(t => (
              <div key={t.id} style={{ 
                backgroundColor: 'rgba(255,255,255,0.02)', 
                padding: '16px', 
                borderRadius: '18px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    backgroundColor: t.type === 'income' ? 'rgba(50, 215, 75, 0.1)' : 'rgba(255, 69, 58, 0.1)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {t.type === 'income' ? <Plus size={18} color="#32d74b" /> : <Minus size={18} color="#ff453a" />}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700' }}>{t.description}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(t.created_at).toLocaleString('es-VE', { hour12: true })}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: '800', 
                    color: t.type === 'income' ? '#32d74b' : '#ff453a' 
                  }}>
                    {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t.category}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Desktop Table */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', fontSize: '13px', borderBottom: '1px solid var(--border-color)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '12px 16px' }}>Fecha/Hora</th>
                  <th style={{ padding: '12px 16px' }}>Descripción</th>
                  <th style={{ padding: '12px 16px' }}>Categoría</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--border-color)', fontSize: '14px', transition: 'all 0.2s' }}>
                    <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{new Date(t.created_at).toLocaleString('es-VE', { hour12: true })}</td>
                    <td style={{ padding: '16px', fontWeight: '600' }}>{t.description}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ 
                        padding: '6px 12px', 
                        borderRadius: '8px', 
                        backgroundColor: 'var(--bg-tertiary)', 
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        fontWeight: '500'
                      }}>
                        {t.category}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right', fontWeight: '700', color: t.type === 'income' ? '#32d74b' : '#ff453a' }}>
                      {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

      {activeTab === 'analysis' && (
        /* ANALYSIS TAB - REPLICATING EXCEL LOGIC */
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '1px' }}>DASHBOARD DE ANÁLISIS ASTRO</h3>
            <button onClick={handleImportHistory} className="btn-gold" style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '10px' }}>
              <Download size={14} style={{ marginRight: '8px' }} /> Sincronizar Historial Excel
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '24px', marginBottom: '32px' }}>
            {/* Barber Performance Table */}
            <div className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '20px' }}>Rendimiento por Barbero (Bs)</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Barbero</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Servicios</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Total (Bs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(analysisData.barberStats).map(b => (
                      <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px', fontWeight: '700' }}>
                          {staff.find(s => String(s.id) === String(b.id))?.name || `ID: ${b.id}`}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>{b.services}</td>
                        <td style={{ padding: '12px', textAlign: 'right', color: 'var(--gold-primary)', fontWeight: '800' }}>
                          {b.incomeBs.toLocaleString('es-VE')} Bs
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Methods Chart Replacement */}
            <div className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '20px' }}>Métodos de Pago</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(analysisData.paymentStats).map(([method, amount]) => (
                  <div key={method} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                    <span style={{ fontWeight: '600', fontSize: '14px' }}>{method}</span>
                    <span style={{ fontWeight: '800', color: 'var(--gold-primary)' }}>${amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px' }}>
            {/* Services Volume */}
            <div className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '20px' }}>Volumen de Servicios</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                {Object.entries(analysisData.serviceStats).map(([name, count]) => (
                  <div key={name} style={{ padding: '16px', backgroundColor: 'rgba(212,175,55,0.05)', borderRadius: '16px', border: '1px solid rgba(212,175,55,0.1)', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: '900' }}>{count}</div>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '4px' }}>{name}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Washing Ratio Logic */}
            <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(10,132,255,0.1), transparent)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '8px' }}>Ratio de Lavados</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>Replica del análisis de ocupación de lavados.</p>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', border: '4px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   {/* This would be a real chart, but for now we show the global ratio */}
                   <span style={{ fontSize: '20px', fontWeight: '900' }}>
                     {Math.round((Object.values(analysisData.barberStats).reduce((acc, b) => acc + b.lavados, 0) / 
                      Object.values(analysisData.barberStats).reduce((acc, b) => acc + b.services, 0) || 0) * 100)}%
                   </span>
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700' }}>Eficiencia Operativa</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Basado en el registro de asistentes.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'profitability' && (
        /* PROFITABILITY TAB - REPLICATING EXCEL 2 LOGIC */
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '1px' }}>RENTABILIDAD, OCUPACIÓN Y COSTOS</h3>
            <button onClick={() => setIsEditingCosts(true)} className="btn-gold" style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '10px' }}>
              Configurar Costos Fijos
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
            <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '8px' }}>UTILIDAD NETA (PROY)</div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: netProfit >= 0 ? '#32d74b' : '#ff453a' }}>
                ${netProfit.toFixed(2)}
              </div>
            </div>
            <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '8px' }}>RENTABILIDAD</div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--gold-primary)' }}>
                {totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : 0}%
              </div>
            </div>
            <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '8px' }}>PUNTO DE EQUILIBRIO</div>
              <div style={{ fontSize: '24px', fontWeight: '900' }}>
                ${breakEven.toFixed(0)}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Facturación Necesaria</div>
            </div>
            <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '8px' }}>TICKET PROMEDIO</div>
              <div style={{ fontSize: '24px', fontWeight: '900' }}>
                ${avgTicket.toFixed(2)}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px' }}>
            {/* Cost Breakdown */}
            <div className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '900', marginBottom: '20px' }}>Estructura de Gastos Mensuales</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                   <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Costos Fijos (Configurados)</span>
                   <span style={{ fontWeight: '700' }}>${totalFixedCosts.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                   <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Gastos Variables (Registrados hoy)</span>
                   <span style={{ fontWeight: '700', color: '#ff453a' }}>-${totalExpense.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: '800', marginTop: '10px' }}>
                   <span>Total Egresos Mensuales</span>
                   <span style={{ color: '#ff453a' }}>-${(totalFixedCosts + totalExpense).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Occupancy Logic */}
            <div className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '900', marginBottom: '20px' }}>Capacidad y Ocupación</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Sillas / Estaciones Activas</span>
                  <span style={{ fontWeight: '700' }}>{fixedCosts.workstations}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Servicios Realizados</span>
                  <span style={{ fontWeight: '700' }}>{Object.values(analysisData.barberStats).reduce((acc, b) => acc + b.services, 0)}</span>
                </div>
                {/* Proyección de Ocupación */}
                <div style={{ marginTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800' }}>NIVEL DE OCUPACIÓN PROYECTADO</span>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--gold-primary)' }}>32%</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '32%', height: '100%', background: 'var(--gold-gradient)' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Costs Config Modal */}
          {isEditingCosts && (
            <div className="modal-overlay animate-fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <div className="glass-card animate-scale-in" style={{ maxWidth: '500px', width: '100%', borderRadius: '32px', padding: '32px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '24px' }}>Configuración de <span className="text-gold">Costos Fijos</span></h3>
                <form onSubmit={handleSaveCosts} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {[
                    { label: 'Alquiler ($)', key: 'rent' },
                    { label: 'Servicios ($)', key: 'services' },
                    { label: 'Nómina Fija ($)', key: 'payroll' },
                    { label: 'Software ($)', key: 'software' },
                    { label: 'Marketing ($)', key: 'marketing' },
                    { label: 'Impuestos ($)', key: 'tax' },
                    { label: 'Sillas Activas', key: 'workstations' },
                    { label: 'Tiempo Prom. (min)', key: 'avgServiceTime' },
                  ].map(field => (
                    <div key={field.key}>
                      <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>{field.label}</label>
                      <input 
                        type="number" 
                        value={fixedCosts[field.key]} 
                        onChange={(e) => setFixedCosts({ ...fixedCosts, [field.key]: parseFloat(e.target.value) || 0 })}
                        style={{ width: '100%', height: '44px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0 12px' }}
                      />
                    </div>
                  ))}
                  <div style={{ gridColumn: 'span 2', display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button type="button" onClick={() => setIsEditingCosts(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Cancelar</button>
                    <button type="submit" className="btn-gold" style={{ flex: 1, padding: '14px', borderRadius: '12px', fontWeight: '800' }}>Guardar Cambios</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      <AstroDialog 
        isOpen={dialog.isOpen}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
        placeholder={dialog.placeholder}
        onConfirm={dialog.onConfirm}
        onCancel={() => setDialog({ ...dialog, isOpen: false })}
      />

      <style>{`
        .table-row-hover:hover {
          background-color: rgba(255,255,255,0.02);
        }
      `}</style>
    </div>
  );
};

export default FinanceModule;
