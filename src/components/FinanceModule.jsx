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

const FinanceModule = ({ isMobile, currency, rates }) => {
  const { showToast } = useNotifs();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
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

  const totalIncome = transactions.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc, 0);
  const totalExpense = transactions.reduce((acc, t) => t.type === 'expense' ? acc + t.amount : acc, 0);
  const balance = totalIncome - totalExpense;

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
