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
  ChevronRight,
  Trash2,
  Edit2
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
    const defaults = { 
      rent: 522, 
      services: 300, 
      payroll: 60, 
      software: 45, 
      marketing: 60, 
      tax: 200, 
      workstations: 3, 
      avgServiceTime: 45, 
      extraCosts: [],
      customLabels: {
        rent: 'Alquiler ($)',
        services: 'Servicios ($)',
        payroll: 'Nómina Fija ($)',
        software: 'Software ($)',
        marketing: 'Marketing ($)',
        tax: 'Impuestos ($)',
        workstations: 'Sillas Activas',
        avgServiceTime: 'Tiempo Prom. (min)'
      }
    };
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return { ...defaults, ...parsed, customLabels: { ...defaults.customLabels, ...parsed.customLabels } };
  });
  const [isEditingCosts, setIsEditingCosts] = useState(false);
  const [isCostsLocked, setIsCostsLocked] = useState(true);
  const [selectedTxId, setSelectedTxId] = useState(null);

  // Payroll / Nómina States
  const [assistantConfig, setAssistantConfig] = useState(() => {
    const saved = localStorage.getItem('astro_assistant_config');
    return saved ? JSON.parse(saved) : { 
      baseSalaryUsd: 80,
      splits: {} 
    };
  });
  const [isConfiguringPayroll, setIsConfiguringPayroll] = useState(false);
  const [payrollModal, setPayrollModal] = useState({ isOpen: false, staff: null, earnedBs: 0, deductionBs: 0, file: null });

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleSaveAssistantConfig = (e) => {
    e.preventDefault();
    localStorage.setItem('astro_assistant_config', JSON.stringify(assistantConfig));
    setIsConfiguringPayroll(false);
    showToast('Configuración de Asistente guardada', 'success');
  };

  const handleProcessPayroll = async () => {
    try {
      setLoading(true);
      const totalToPayBs = payrollModal.earnedBs - payrollModal.deductionBs;
      const amountUsd = totalToPayBs / (rates?.usd || 550); 
      
      const newTx = {
        description: `Pago Nómina: ${payrollModal.staff.name} (Descuento Asist. ${payrollModal.deductionBs}Bs)`,
        amount: amountUsd,
        type: 'expense',
        category: 'Pago Nómina',
        currency: 'USD',
        exchange_rate: rates?.usd || 550,
        metadata: {
          staffId: payrollModal.staff.id,
          amountBs: totalToPayBs,
          deductionBs: payrollModal.deductionBs,
          voucherImage: payrollModal.file
        }
      };
      
      await dataService.addTransaction(newTx);
      showToast('Nómina pagada con éxito', 'success');
      setPayrollModal(prev => ({ ...prev, isOpen: false }));
      fetchTransactions();
    } catch(err) {
      console.error(err);
      showToast('Error al pagar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Compress slightly by drawing to canvas
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
          setPayrollModal(prev => ({ ...prev, file: compressedBase64 }));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

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

  const parseTxExcel = (t) => {
    const meta = t.metadata || {};
    const desc = t.description || "";
    
    let clientName = meta.clientName || desc.split(' - Cliente: ')[1]?.split(' - ')[0] || "S/N";
    let serviceName = meta.serviceName || desc.split(' - Servi: ')[1] || (t.category === 'Ventas Astro' || t.category === 'Ventas Pro' ? "Servicio" : t.description);
    let barbero = meta.staffInvolved?.find(s => s.role?.includes('Barbero'))?.name || 
                  meta.staffInvolved?.[0]?.name || 
                  "N/A";
    
    let paymentMethod = "Efectivo ($)";
    const transferAmount = Number(meta.transfer_bs || meta.transferBs || 0);
    const isMixed = meta.mixed_payment || meta.isMixed;
    
    if (transferAmount > 0) {
      paymentMethod = isMixed ? "Mixto ($ + Bs)" : "Pago Móvil / Transferencia";
    } else if (isMixed) {
      paymentMethod = "Mixto ($ + Bs)";
    }
    
    // Lavado: check if any staff member is involved with washing logic or if it's in meta
    let didWash = meta.didWash ? 'Si' : 'No';
    if (didWash === 'No' && meta.staffInvolved?.some(s => s.role?.includes('Asistente de Lavado'))) {
      didWash = 'Si';
    }

    return { clientName, serviceName, barbero, paymentMethod, didWash };
  };

  const formatCurrency = (amount, currencySymbol = '$') => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
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
    if (['workstations', 'avgServiceTime', 'extraCosts', 'customLabels'].includes(key)) return acc;
    return acc + Number(val || 0);
  }, 0) + (fixedCosts.extraCosts?.reduce((acc, c) => acc + Number(c.value || 0), 0) || 0);

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
          RENTABILIDAD Y OCUPACIÓN
        </button>
        <button 
          onClick={() => setActiveTab('payroll')}
          style={{ 
            padding: '12px 20px', 
            background: 'none', 
            border: 'none', 
            color: activeTab === 'payroll' ? 'var(--gold-primary)' : 'var(--text-secondary)',
            fontWeight: '800',
            fontSize: '14px',
            cursor: 'pointer',
            borderBottom: activeTab === 'payroll' ? '2px solid var(--gold-primary)' : 'none',
            transition: '0.2s'
          }}
        >
          NÓMINA Y PAGOS
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
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase' }}>Saldo Actual</div>
            <div style={{ fontSize: '48px', fontWeight: '950', color: 'var(--gold-primary)', letterSpacing: '-1px' }}>
              ${formatCurrency(balance, '')}
            </div>
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
            <div style={{ fontSize: '24px', fontWeight: '800' }}>${formatCurrency(totalIncome, '')}</div>
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
            <div style={{ fontSize: '24px', fontWeight: '800' }}>${formatCurrency(totalExpense, '')}</div>
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
              ${formatCurrency(transactions.filter(t => t.metadata?.cash_usd || t.metadata?.cashUsd).reduce((acc, t) => acc + Number(t.metadata?.cash_usd || t.metadata?.cashUsd || 0), 0), '')}
            </div>
          </div>
          <div style={{ padding: '20px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '20px' }}>
            <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px' }}>PAGO MÓVIL (BS)</div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--gold-primary)' }}>
              {formatCurrency(transactions.filter(t => t.metadata?.transfer_bs || t.metadata?.transferBs).reduce((acc, t) => acc + Number(t.metadata?.transfer_bs || t.metadata?.transferBs || 0), 0), '')} <span style={{fontSize: '12px'}}>BS</span>
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
              ${formatCurrency(totalIncome - totalExpense, '')}
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
          /* Desktop Table - EXCEL STYLE */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', textAlign: 'left' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '900' }}>
                  <th style={{ padding: '12px 16px' }}>FECHA</th>
                  <th style={{ padding: '12px 16px' }}>CLIENTE</th>
                  <th style={{ padding: '12px 16px' }}>BARBERO</th>
                  <th style={{ padding: '12px 16px' }}>SERVICIO</th>
                  <th style={{ padding: '12px 16px' }}>MÉTODO DE PAGO</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>LAVADO</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>MONTO</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => {
                  const { clientName, serviceName, barbero, paymentMethod, didWash } = parseTxExcel(t);
                  const isExpanded = selectedTxId === t.id;
                  
                  return (
                    <React.Fragment key={t.id}>
                      <tr 
                        onClick={() => setSelectedTxId(isExpanded ? null : t.id)}
                        className="table-row-hover" 
                        style={{ 
                          backgroundColor: isExpanded ? 'rgba(212,175,55,0.05)' : 'rgba(255,255,255,0.02)',
                          fontSize: '13px', 
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          borderLeft: isExpanded ? '4px solid var(--gold-primary)' : '4px solid transparent'
                        }}
                      >
                        <td style={{ padding: '16px', borderRadius: '12px 0 0 12px' }}>
                          <div style={{ fontWeight: '700' }}>{new Date(t.created_at).toLocaleDateString()}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>
                        <td style={{ padding: '16px', fontWeight: '800', color: 'white' }}>{clientName.toUpperCase()}</td>
                        <td style={{ padding: '16px', fontWeight: '700', color: 'var(--text-secondary)' }}>{barbero}</td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ color: 'var(--gold-primary)', fontWeight: '800' }}>{serviceName}</span>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>{paymentMethod}</span>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <span style={{ 
                            padding: '4px 10px', 
                            borderRadius: '6px', 
                            backgroundColor: didWash === 'Si' ? 'rgba(50, 215, 75, 0.1)' : 'rgba(255,255,255,0.05)',
                            color: didWash === 'Si' ? '#32d74b' : 'var(--text-muted)',
                            fontWeight: '900',
                            fontSize: '11px'
                          }}>
                            {didWash}
                          </span>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right', borderRadius: '0 12px 12px 0' }}>
                          <div style={{ 
                            fontWeight: '950', 
                            color: t.type === 'income' ? '#32d74b' : '#ff453a',
                            fontSize: '15px'
                          }}>
                            {t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount, '')}
                          </div>
                        </td>
                      </tr>
                      
                      {isExpanded && (
                        <tr>
                          <td colSpan="7" style={{ padding: '0 0 16px 0' }}>
                            <div className="glass-card animate-slide-down" style={{ 
                              margin: '0 16px', 
                              padding: '24px', 
                              borderRadius: '0 0 20px 20px',
                              background: 'linear-gradient(180deg, rgba(212,175,55,0.05), transparent)',
                              border: '1px solid rgba(212,175,55,0.1)',
                              borderTop: 'none'
                            }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '32px' }}>
                                <div>
                                  <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '8px', textTransform: 'uppercase' }}>Detalle de Liquidación</div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {t.metadata?.staffInvolved?.map((s, idx) => {
                                      const computedBs = s.commissionBs || (s.commissionEarned * (t.exchange_rate || t.metadata?.fixedRate || 0));
                                      return (
                                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '8px' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '12px', fontWeight: '800', color: 'white' }}>{s.name}</span>
                                            <div style={{ textAlign: 'right' }}>
                                              <div style={{ fontSize: '12px', fontWeight: '900', color: 'var(--gold-primary)' }}>+${formatCurrency(s.commissionEarned || 0, '')}</div>
                                              {computedBs > 0 && <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>≈ {formatCurrency(computedBs, '')} BS</div>}
                                            </div>
                                          </div>
                                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                            {s.role?.split('|')[0] || 'Personal'}
                                          </span>
                                        </div>
                                      );
                                    })}
                                    {!t.metadata?.staffInvolved && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Operación manual / No vinculada a personal.</div>}
                                  </div>
                                </div>
                                
                                <div>
                                  <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '8px', textTransform: 'uppercase' }}>Información de Pago</div>
                                  <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Efectivo USD:</span>
                                      <span style={{ fontSize: '12px', fontWeight: '800' }}>${formatCurrency(t.metadata?.cash_usd || t.metadata?.cashUsd || (t.type === 'income' && !(t.metadata?.transfer_bs || t.metadata?.transferBs) ? t.amount : 0), '')}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Pago Móvil (Bs):</span>
                                      <span style={{ fontSize: '12px', fontWeight: '800' }}>{formatCurrency(t.metadata?.transfer_bs || t.metadata?.transferBs || 0, '')} BS</span>
                                    </div>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                                  <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '8px', textTransform: 'uppercase' }}>Resumen de Utilidad (Astro)</div>
                                  <div style={{ backgroundColor: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)', padding: '16px', borderRadius: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ingreso Bruto:</span>
                                      <span style={{ fontSize: '12px', fontWeight: '800', color: 'white' }}>${formatCurrency(t.amount, '')}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px dashed rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Pago Personal:</span>
                                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#ff453a' }}>
                                        -${formatCurrency(t.metadata?.staffInvolved?.reduce((acc, s) => acc + (s.commissionEarned || 0), 0) || 0, '')}
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ fontSize: '12px', color: 'var(--gold-primary)', fontWeight: '900' }}>Ganancia Neta:</span>
                                      <span style={{ fontSize: '14px', fontWeight: '900', color: '#32d74b' }}>
                                        ${formatCurrency(t.amount - (t.metadata?.staffInvolved?.reduce((acc, s) => acc + (s.commissionEarned || 0), 0) || 0), '')}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

      {activeTab === 'payroll' && (() => {
        const payrollSummary = staff.map(st => {
          const earnedBs = transactions.filter(t => t.type === 'income').reduce((sum, t) => {
            const s = t.metadata?.staffInvolved?.find(x => String(x.staffId) === String(st.id));
            return sum + (s ? (s.commissionBs || 0) + (s.tipBs || 0) + (s.productCommissionBs || 0) : 0);
          }, 0);
          const paidBs = transactions.filter(t => t.type === 'expense' && t.category === 'Pago Nómina' && String(t.metadata?.staffId) === String(st.id)).reduce((sum, t) => sum + (t.metadata?.amountBs || 0) + (t.metadata?.deductionBs || 0), 0);
          const balanceBs = earnedBs - paidBs;
          return { ...st, earnedBs, paidBs, balanceBs };
        }).filter(s => s.balanceBs > 0 || s.earnedBs > 0 || s.paidBs > 0);

        return (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '1px' }}>NÓMINA Y CORTE SEMANAL</h3>
              <button onClick={() => setIsConfiguringPayroll(true)} className="btn-gold" style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '10px' }}>
                Configurar Vaca (Asistente)
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {payrollSummary.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay saldos pendientes.</div>
              ) : payrollSummary.map(st => (
                <div key={st.id} className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-primary)', fontWeight: '900', fontSize: '18px' }}>
                        {st.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '16px' }}>{st.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{st.role}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Acumulado (Bs)</span>
                      <span style={{ fontSize: '12px', fontWeight: '700' }}>{formatCurrency(st.earnedBs, '')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Pagado/Deducido (Bs)</span>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#ff453a' }}>-{formatCurrency(st.paidBs, '')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--gold-primary)' }}>Por Pagar (Bs)</span>
                      <span style={{ fontSize: '16px', fontWeight: '900', color: '#32d74b' }}>{formatCurrency(st.balanceBs, '')}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const splitPct = assistantConfig.splits[st.id] || 0;
                      const suggestedDeductionBs = ((assistantConfig.baseSalaryUsd / 4) * (splitPct / 100)) * (rates?.usd || 550);
                      setPayrollModal({
                        isOpen: true,
                        staff: st,
                        earnedBs: st.balanceBs,
                        deductionBs: Math.round(suggestedDeductionBs),
                        file: null
                      });
                    }}
                    disabled={st.balanceBs <= 0}
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', background: st.balanceBs > 0 ? 'var(--gold-primary)' : 'rgba(255,255,255,0.05)', color: st.balanceBs > 0 ? '#000' : 'var(--text-muted)', fontWeight: '800', border: 'none', cursor: st.balanceBs > 0 ? 'pointer' : 'not-allowed' }}
                  >
                    {st.balanceBs > 0 ? 'Realizar Pago' : 'Al Día'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {activeTab === 'analysis' && (() => {
        // Ejecución de Fórmulas Financieras (Basadas en el Excel de Rentabilidad)
        const ingresosTotales = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + (t.amount || 0), 0);
        const egresosBarberos = transactions.filter(t => t.type === 'income').reduce((acc, t) => {
          return acc + (t.metadata?.staffInvolved?.reduce((sum, s) => sum + (s.commissionEarned || 0), 0) || 0);
        }, 0);
        
        const profitBruto = ingresosTotales - egresosBarberos;
        const costosVariables = totalExpense; // Usamos los gastos registrados como variables
        const utilidadNetaCalculada = profitBruto - totalFixedCosts - costosVariables;
        const rentabilidadReal = ingresosTotales > 0 ? (utilidadNetaCalculada / ingresosTotales) * 100 : 0;
        
        const serviciosTotales = Object.values(analysisData.barberStats).reduce((acc, b) => acc + b.services, 0) || 0;
        const ticketProm = serviciosTotales > 0 ? ingresosTotales / serviciosTotales : 0;
        
        // Ocupación
        const sillas = Number(fixedCosts.workstations || 3);
        const capacidadMensual = sillas * 6 * 4 * 13; // 6 dias, 4 semanas, 13 servicios por silla
        const ocupacionPct = capacidadMensual > 0 ? (serviciosTotales / capacidadMensual) * 100 : 0;
        
        // Punto de Equilibrio
        const margenContribucion = ingresosTotales - costosVariables - egresosBarberos;
        const margenPct = ingresosTotales > 0 ? margenContribucion / ingresosTotales : 0;
        const ptoEquilibrio = margenPct > 0 ? totalFixedCosts / margenPct : 0;

        return (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '1px' }}>DASHBOARD DE RENTABILIDAD Y OCUPACIÓN</h3>
              <button onClick={() => setIsEditingCosts(true)} className="btn-gold" style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '10px' }}>
                Configurar Costos Fijos
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
              <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '8px' }}>UTILIDAD NETA</div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: utilidadNetaCalculada >= 0 ? '#32d74b' : '#ff453a' }}>
                  ${formatCurrency(utilidadNetaCalculada)}
                </div>
              </div>
              <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '8px' }}>RENTABILIDAD</div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: rentabilidadReal >= 0 ? 'var(--gold-primary)' : '#ff453a' }}>
                  {rentabilidadReal.toFixed(1)}%
                </div>
              </div>
              <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '8px' }}>PUNTO DE EQUILIBRIO</div>
                <div style={{ fontSize: '24px', fontWeight: '900' }}>
                  ${formatCurrency(ptoEquilibrio)}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Facturación Necesaria</div>
              </div>
              <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '8px' }}>TICKET PROMEDIO</div>
                <div style={{ fontSize: '24px', fontWeight: '900' }}>
                  ${formatCurrency(ticketProm)}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '24px', marginBottom: '32px' }}>
              {/* Estructura de Gastos e Ingresos */}
              <div className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '20px' }}>Estructura de Gastos Mensuales</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                     <span style={{ fontSize: '14px', color: 'white', fontWeight: '700' }}>Ingresos Brutos (Facturación)</span>
                     <span style={{ fontWeight: '800', color: '#32d74b' }}>${formatCurrency(ingresosTotales)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                     <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Egresos Totales a Barberos</span>
                     <span style={{ fontWeight: '700', color: '#ff453a' }}>-${formatCurrency(egresosBarberos)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Costos Fijos Operativos</span>
                      <span style={{ fontWeight: '700', color: '#ff453a' }}>-${formatCurrency(totalFixedCosts)}</span>
                   </div>
                   
                   {/* Desglose de Costos Base */}
                   {[
                     { key: 'rent', defaultLabel: 'Alquiler' },
                     { key: 'services', defaultLabel: 'Servicios' },
                     { key: 'payroll', defaultLabel: 'Nómina Fija' },
                     { key: 'software', defaultLabel: 'Software' },
                     { key: 'marketing', defaultLabel: 'Marketing' },
                     { key: 'tax', defaultLabel: 'Impuestos' }
                   ].map(c => (
                     <div key={c.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 6px 16px', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>↳ {fixedCosts.customLabels?.[c.key] || c.defaultLabel}</span>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>-${formatCurrency(fixedCosts[c.key] || 0)}</span>
                     </div>
                   ))}

                   {/* Desglose de Costos Extra */}
                   {fixedCosts.extraCosts?.map((c, i) => (
                     <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 6px 16px', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>↳ {c.label || 'Sin nombre'}</span>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>-${formatCurrency(c.value)}</span>
                     </div>
                   ))}

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                     <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Costos Variables (Caja Chica)</span>
                     <span style={{ fontWeight: '700', color: '#ff453a' }}>-${formatCurrency(costosVariables)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: '900', marginTop: '10px', fontSize: '18px' }}>
                     <span style={{ color: 'var(--gold-primary)' }}>Utilidad Neta</span>
                     <span style={{ color: utilidadNetaCalculada >= 0 ? '#32d74b' : '#ff453a' }}>${formatCurrency(utilidadNetaCalculada)}</span>
                  </div>
                </div>
              </div>

              {/* Occupancy Logic */}
              <div className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '900', marginBottom: '20px' }}>Capacidad y Ocupación</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Sillas / Estaciones Activas</span>
                    <span style={{ fontWeight: '700' }}>{sillas}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Servicios Realizados</span>
                    <span style={{ fontWeight: '700' }}>{serviciosTotales}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Capacidad Máxima Mensual</span>
                    <span style={{ fontWeight: '700' }}>{capacidadMensual}</span>
                  </div>
                  {/* Proyección de Ocupación */}
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800' }}>NIVEL DE OCUPACIÓN REAL</span>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--gold-primary)' }}>{ocupacionPct.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(ocupacionPct, 100)}%`, height: '100%', background: 'var(--gold-gradient)' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Rendimiento por Barbero */}
            <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', marginBottom: '32px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '20px' }}>Rendimiento por Barbero (Bs)</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Barbero</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Servicios</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Total Creado (Bs)</th>
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
                          {formatCurrency(b.incomeBs, '')} Bs
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        );
      })()}


          {/* Costs Config Modal */}
          {isEditingCosts && (
            <div className="modal-overlay animate-fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <div className="glass-card animate-scale-in" style={{ maxWidth: '500px', width: '100%', borderRadius: '32px', padding: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: '900', margin: 0 }}>Configuración de <span className="text-gold">Costos Fijos</span></h3>
                  <button 
                    type="button" 
                    onClick={() => setIsCostsLocked(!isCostsLocked)}
                    style={{ 
                      background: isCostsLocked ? 'rgba(212,175,55,0.1)' : 'var(--gold-primary)', 
                      color: isCostsLocked ? 'var(--gold-primary)' : 'black', 
                      border: 'none', 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '12px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      cursor: 'pointer', 
                      transition: 'all 0.3s ease',
                      boxShadow: !isCostsLocked ? '0 0 15px rgba(212,175,55,0.3)' : 'none'
                    }}
                    title={isCostsLocked ? "Desbloquear para editar" : "Bloquear edición"}
                  >
                    <Edit2 size={18} />
                  </button>
                </div>
                <form onSubmit={handleSaveCosts} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {[
                    { key: 'rent', defaultLabel: 'Alquiler ($)' },
                    { key: 'services', defaultLabel: 'Servicios ($)' },
                    { key: 'payroll', defaultLabel: 'Nómina Fija ($)' },
                    { key: 'software', defaultLabel: 'Software ($)' },
                    { key: 'marketing', defaultLabel: 'Marketing ($)' },
                    { key: 'tax', defaultLabel: 'Impuestos ($)' },
                    { key: 'workstations', defaultLabel: 'Sillas Activas' },
                    { key: 'avgServiceTime', defaultLabel: 'Tiempo Prom. (min)' },
                  ].map(field => (
                    <div key={field.key} style={{ gridColumn: 'span 2', display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '4px' }}>
                      <div style={{ flex: 2 }}>
                        <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Nombre</label>
                        <input 
                          type="text" 
                          disabled={isCostsLocked}
                          value={fixedCosts.customLabels?.[field.key] || field.defaultLabel} 
                          onChange={(e) => setFixedCosts({ 
                            ...fixedCosts, 
                            customLabels: { ...fixedCosts.customLabels, [field.key]: e.target.value } 
                          })}
                          style={{ width: '100%', height: '44px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0 12px', opacity: isCostsLocked ? 0.6 : 1, cursor: isCostsLocked ? 'not-allowed' : 'text', transition: 'all 0.3s' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>{field.key === 'workstations' || field.key === 'avgServiceTime' ? 'Valor' : 'Monto ($)'}</label>
                        <input 
                          type="number" 
                          disabled={isCostsLocked}
                          value={fixedCosts[field.key]} 
                          onChange={(e) => setFixedCosts({ ...fixedCosts, [field.key]: parseFloat(e.target.value) || 0 })}
                          style={{ width: '100%', height: '44px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0 12px', opacity: isCostsLocked ? 0.6 : 1, cursor: isCostsLocked ? 'not-allowed' : 'text', transition: 'all 0.3s' }}
                        />
                      </div>
                    </div>
                  ))}

                  {fixedCosts.extraCosts?.map((cost, idx) => (
                    <div key={idx} style={{ gridColumn: 'span 2', display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '8px' }}>
                      <div style={{ flex: 2 }}>
                        <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Nombre del Gasto</label>
                        <input 
                          type="text" 
                          placeholder="Ej. Internet"
                          value={cost.label} 
                          disabled={isCostsLocked}
                          onChange={(e) => {
                            const newExtras = [...fixedCosts.extraCosts];
                            newExtras[idx].label = e.target.value;
                            setFixedCosts({ ...fixedCosts, extraCosts: newExtras });
                          }}
                          style={{ width: '100%', height: '44px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0 12px', opacity: isCostsLocked ? 0.6 : 1, cursor: isCostsLocked ? 'not-allowed' : 'text', transition: 'all 0.3s' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Monto ($)</label>
                        <input 
                          type="number" 
                          value={cost.value} 
                          disabled={isCostsLocked}
                          onChange={(e) => {
                            const newExtras = [...fixedCosts.extraCosts];
                            newExtras[idx].value = parseFloat(e.target.value) || 0;
                            setFixedCosts({ ...fixedCosts, extraCosts: newExtras });
                          }}
                          style={{ width: '100%', height: '44px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0 12px', opacity: isCostsLocked ? 0.6 : 1, cursor: isCostsLocked ? 'not-allowed' : 'text', transition: 'all 0.3s' }}
                        />
                      </div>
                      <button 
                        type="button" 
                        disabled={isCostsLocked}
                        onClick={() => {
                          const newExtras = fixedCosts.extraCosts.filter((_, i) => i !== idx);
                          setFixedCosts({ ...fixedCosts, extraCosts: newExtras });
                        }}
                        style={{ background: 'rgba(255,69,58,0.1)', border: 'none', color: '#ff453a', borderRadius: '10px', width: '44px', height: '44px', cursor: isCostsLocked ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isCostsLocked ? 0.4 : 1, transition: 'all 0.3s' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}

                  <button 
                    type="button" 
                    disabled={isCostsLocked}
                    onClick={() => {
                      setFixedCosts({ 
                        ...fixedCosts, 
                        extraCosts: [...(fixedCosts.extraCosts || []), { label: '', value: 0 }] 
                      });
                    }}
                    style={{ gridColumn: 'span 2', background: 'rgba(212,175,55,0.1)', border: '1px dashed var(--gold-primary)', color: 'var(--gold-primary)', padding: '12px', borderRadius: '12px', cursor: isCostsLocked ? 'not-allowed' : 'pointer', fontWeight: '800', fontSize: '12px', marginTop: '8px', opacity: isCostsLocked ? 0.5 : 1, transition: 'all 0.3s' }}
                  >
                    + AGREGAR COSTO ADICIONAL
                  </button>
                  <div style={{ gridColumn: 'span 2', display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button type="button" onClick={() => { setIsEditingCosts(false); setIsCostsLocked(true); }} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Cancelar</button>
                    <button type="submit" disabled={isCostsLocked} className="btn-gold" style={{ flex: 1, padding: '14px', borderRadius: '12px', fontWeight: '800', opacity: isCostsLocked ? 0.5 : 1, cursor: isCostsLocked ? 'not-allowed' : 'pointer' }}>Guardar Cambios</button>
                  </div>
                </form>
              </div>
            </div>
          )}
          
          {/* Assistant Config Modal */}
          {isConfiguringPayroll && (
            <div className="modal-overlay animate-fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <div className="glass-card animate-scale-in" style={{ maxWidth: '500px', width: '100%', borderRadius: '32px', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '24px' }}>Configuración <span className="text-gold">Vaca Asistente</span></h3>
                <form onSubmit={handleSaveAssistantConfig} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Sueldo Mensual del Asistente (USD $)</label>
                    <input type="number" value={assistantConfig.baseSalaryUsd} onChange={(e) => setAssistantConfig({...assistantConfig, baseSalaryUsd: Number(e.target.value)})} style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '16px' }} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>% Aporte Mensual por Barbero</h4>
                    {staff.filter(s => s.role?.toLowerCase().includes('barbero') && !s.role?.toLowerCase().includes('archived') && !s.role?.toLowerCase().includes('admin')).map(s => (
                      <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600' }}>{s.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input type="number" value={assistantConfig.splits[s.id] || 0} onChange={(e) => setAssistantConfig({...assistantConfig, splits: {...assistantConfig.splits, [s.id]: Number(e.target.value)}})} style={{ width: '80px', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', textAlign: 'center' }} />
                          <span style={{ color: 'var(--text-muted)' }}>%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                    <button type="button" onClick={() => setIsConfiguringPayroll(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', fontWeight: '700' }}>Cancelar</button>
                    <button type="submit" className="btn-gold" style={{ flex: 1, padding: '14px', borderRadius: '12px', fontWeight: '800' }}>Guardar</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Payroll Payment Modal */}
          {payrollModal.isOpen && (
            <div className="modal-overlay animate-fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <div className="glass-card animate-scale-in" style={{ maxWidth: '400px', width: '100%', borderRadius: '32px', padding: '32px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '8px' }}>Pago a <span className="text-gold">{payrollModal.staff?.name}</span></h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>Realiza el descuento de asistencia y sube el comprobante.</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Por Cobrar:</span>
                    <span style={{ fontSize: '18px', fontWeight: '900' }}>{formatCurrency(payrollModal.earnedBs, '')} Bs</span>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Deducción Asistente / Insumos (Bs)</label>
                    <input type="number" value={payrollModal.deductionBs} onChange={(e) => setPayrollModal({...payrollModal, deductionBs: Number(e.target.value)})} style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.2)', color: '#ff453a', fontSize: '16px', fontWeight: '900' }} />
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>Monto sugerido basado en la configuración de la Vaca.</p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: '16px', fontWeight: '900', color: 'var(--gold-primary)' }}>Total a Pagar:</span>
                    <span style={{ fontSize: '24px', fontWeight: '900', color: '#32d74b' }}>{formatCurrency(payrollModal.earnedBs - payrollModal.deductionBs, '')} Bs</span>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Comprobante de Pago (Foto / Capture)</label>
                    <input type="file" accept="image/*" onChange={handleFileUpload} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '12px' }} />
                    {payrollModal.file && (
                      <div style={{ marginTop: '12px', height: '100px', borderRadius: '12px', overflow: 'hidden', backgroundImage: `url(${payrollModal.file})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid var(--gold-primary)' }}></div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button onClick={() => setPayrollModal({...payrollModal, isOpen: false})} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', fontWeight: '700' }}>Cancelar</button>
                    <button onClick={handleProcessPayroll} className="btn-gold" style={{ flex: 1, padding: '14px', borderRadius: '12px', fontWeight: '800' }}>Confirmar Pago</button>
                  </div>
                </div>
              </div>
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
