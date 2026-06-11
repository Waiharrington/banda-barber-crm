import React, {  useState, useEffect , useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '../hooks/useScrollLock';
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
  Edit2,
  Eye,
  WalletCards,
  List,
  RefreshCw
} from 'lucide-react';

import { dataService } from '../services/dataService';
import AstroDialog from './AstroDialog';
import AstroDatePicker from './AstroDatePicker';
import AstroSelect from './AstroSelect';

const getStartOfWeek = () => {
  const now = new Date();
  const day = now.getDay(); // 0 is Sunday, 1 is Monday, etc.
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const FinanceModule = ({ isMobile, currency, rates, staff = [] }) => {
  const { showToast } = useNotifs();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' or 'analysis'

  // Transaction Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterService, setFilterService] = useState('all');
  const [filterType, setFilterType] = useState('all'); // 'all', 'income', 'expense'
  const [filterBarber, setFilterBarber] = useState('all'); // 'all' or staff ID
  const [filterDate, setFilterDate] = useState('all'); // 'all', 'today', 'this_week', 'this_month', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  
  // Payroll Date Filter States
  const [payrollFilterDate, setPayrollFilterDate] = useState('this_week'); // 'this_week', 'last_week', 'custom'
  const [payrollStartDate, setPayrollStartDate] = useState('');
  const [payrollEndDate, setPayrollEndDate] = useState('');
  
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
    const defaults = {
      weeklyVacaUsd: 20,
      splits: {}
    };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migrate old config if necessary
        if (parsed.baseSalaryUsd && !parsed.weeklyVacaUsd) {
          const weeklyTotal = parsed.baseSalaryUsd / 4;
          const newSplits = {};
          Object.entries(parsed.splits || {}).forEach(([id, pct]) => {
            newSplits[id] = Number((weeklyTotal * (pct / 100)).toFixed(2));
          });
          return {
            weeklyVacaUsd: weeklyTotal,
            splits: newSplits
          };
        }
        return { ...defaults, ...parsed, splits: { ...defaults.splits, ...parsed.splits } };
      } catch (e) {
        console.error("Error parsing assistant config", e);
      }
    }
    return defaults;
  });
  const [isConfiguringPayroll, setIsConfiguringPayroll] = useState(false);
  const [weeklyCloseModal, setWeeklyCloseModal] = useState({
    isOpen: false,
    loading: false,
    success: false,
    error: null
  });
  const [payrollModal, setPayrollModal] = useState({ 
    isOpen: false, 
    staff: null, 
    earnedBs: 0, 
    deductionBs: 0, 
    paymentAmountBs: 0,
    isAbono: false,
    file: null,
    paymentMethod: 'Efectivo ($)'
  });
  const [payrollDetail, setPayrollDetail] = useState({ isOpen: false, staff: null, transactions: [] });
  const [valeModal, setValeModal] = useState({ isOpen: false, staff: null, amountBs: '', paymentMethod: 'Efectivo ($)' });

  useScrollLock(
    isEditingCosts || 
    isConfiguringPayroll || 
    weeklyCloseModal.isOpen || 
    payrollModal.isOpen || 
    payrollDetail.isOpen || 
    valeModal.isOpen ||
    dialog.isOpen
  );

  const handleRegisterVale = async () => {
    if (!valeModal.amountBs || Number(valeModal.amountBs) <= 0) {
      showToast("Ingresa un monto válido para el vale", "warning");
      return;
    }
    
    if (valeModal.maxBalance !== undefined && Number(valeModal.amountBs) > valeModal.maxBalance) {
      showToast(`No puedes dar un vale mayor al saldo disponible (${valeModal.maxBalance} Bs)`, "warning");
      return;
    }

    try {
      setLoading(true);
      const amountBs = Number(valeModal.amountBs);
      const amountUsd = amountBs / (rates?.usd || 550);
      const chosenMethod = valeModal.paymentMethod || 'Efectivo ($)';
      
      const newTx = {
        description: `ADELANTO VALE - Barbero: ${valeModal.staff.name} (${chosenMethod})`,
        amount: amountUsd,
        type: 'expense',
        category: 'Vales Barberos',
        currency: 'USD',
        exchange_rate: rates?.usd || 550,
        metadata: {
          staffId: valeModal.staff.id,
          amountBs: amountBs,
          isVale: true,
          paymentMethod: chosenMethod
        }
      };
      
      await dataService.addTransaction(newTx);
      
      // Sincronizar Vale con Google Sheets de forma dinámica
      try {
        const isUsdMethod = ['Efectivo ($)', 'Zelle', 'Binance', 'Zinli'].includes(chosenMethod);
        const formattedMethod = chosenMethod.includes('($)') || chosenMethod.includes('(Bs)')
          ? chosenMethod
          : `${chosenMethod} (${isUsdMethod ? '$' : 'Bs'})`;

        await dataService.syncValeToSheets({
          fecha: new Date().toLocaleDateString('es-VE'),
          barbero: valeModal.staff.name,
          vale: amountBs,
          montoUsd: isUsdMethod ? `${amountUsd.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}$` : "0,00$",
          montoBs: !isUsdMethod ? `${amountBs.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}Bs.` : "0,00Bs.",
          metodoPagoUsd: isUsdMethod ? formattedMethod : "No aplica",
          metodoPagoBs: !isUsdMethod ? formattedMethod : "No aplica",
          servicio: "Adelanto (Vale)",
          cliente: "ADELANTO VALE",
          cedula: "S/C",
          lavado: 0,
          tasa: `${(rates?.usd || 550).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}Bs./$`
        });
      } catch (sheetErr) {
        console.error("Error al sincronizar vale a Sheets:", sheetErr);
      }

      showToast(`Vale de ${amountBs} Bs registrado con éxito para ${valeModal.staff.name} en ${chosenMethod}`, 'success');
      setValeModal({ isOpen: false, staff: null, amountBs: '', paymentMethod: 'Efectivo ($)' });
      fetchTransactions();
    } catch (err) {
      console.error(err);
      showToast("Error al registrar vale", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleWeeklyCloseExecute = async () => {
    setWeeklyCloseModal(prev => ({ ...prev, loading: true, error: null }));
    try {
      const success = await dataService.triggerWeeklyClosing();
      if (success) {
        setWeeklyCloseModal(prev => ({ ...prev, loading: false, success: true }));
        showToast("Cierre semanal ejecutado en Google Sheets con éxito", "success");
      } else {
        throw new Error("El URL de Google Sheets no está configurado.");
      }
    } catch (e) {
      console.error(e);
      setWeeklyCloseModal(prev => ({ 
        ...prev, 
        loading: false, 
        error: e.message || "Error al ejecutar el cierre en Google Sheets." 
      }));
      showToast("Error al ejecutar cierre semanal", "error");
    }
  };

  const eligibleBarbers = staff.filter(s => {
    const role = s.role?.toLowerCase() || '';
    return (role.includes('barbero') || role.includes('barber')) && !role.includes('archived') && !role.includes('admin');
  });

  const handleWeeklyTotalChange = (val) => {
    const numVal = Number(val) || 0;
    const count = eligibleBarbers.length || 1;
    const equalShare = Number((numVal / count).toFixed(2));
    
    const newSplits = {};
    eligibleBarbers.forEach(s => {
      newSplits[s.id] = equalShare;
    });
    
    setAssistantConfig({
      weeklyVacaUsd: numVal,
      splits: newSplits
    });
  };

  const handleBarberSplitChange = (staffId, val) => {
    const numVal = Number(val) || 0;
    const newSplits = {
      ...(assistantConfig?.splits || {}),
      [staffId]: numVal
    };
    
    const newTotal = Number(Object.values(newSplits).reduce((sum, v) => sum + (v || 0), 0).toFixed(2));
    
    setAssistantConfig({
      weeklyVacaUsd: newTotal,
      splits: newSplits
    });
  };

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
      const finalAmountBs = payrollModal.isAbono ? payrollModal.paymentAmountBs : (payrollModal.earnedBs - payrollModal.deductionBs);
      const amountUsd = finalAmountBs / (rates?.usd || 550); 
      const chosenMethod = payrollModal.paymentMethod || 'Efectivo ($)';
      
      const newTx = {
        description: `Pago Nómina: ${payrollModal.staff.name}${payrollModal.isAbono ? ' (Abono)' : ''} (Descuento Asist. ${payrollModal.isAbono ? 0 : payrollModal.deductionBs}Bs) [${chosenMethod}]`,
        amount: amountUsd,
        type: 'expense',
        category: 'Pago Nómina',
        currency: 'USD',
        exchange_rate: rates?.usd || 550,
        metadata: {
          staffId: payrollModal.staff.id,
          amountBs: finalAmountBs,
          deductionBs: payrollModal.isAbono ? 0 : payrollModal.deductionBs,
          isAbono: payrollModal.isAbono,
          voucherImage: payrollModal.file,
          paymentMethod: chosenMethod
        }
      };
      
      await dataService.addTransaction(newTx);
      showToast(`Nómina pagada con éxito (${chosenMethod})`, 'success');
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
    
    let paymentMethod = meta.paymentMethod || "Efectivo ($)";
    if (!meta.paymentMethod) {
      const transferAmount = Number(meta.transfer_bs || meta.transferBs || 0);
      const isMixed = meta.mixed_payment || meta.isMixed;
      
      if (transferAmount > 0) {
        paymentMethod = isMixed ? "Mixto ($ + Bs)" : "Pago Móvil / Transferencia";
      } else if (isMixed) {
        paymentMethod = "Mixto ($ + Bs)";
      }
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

  const filteredTransactions = useMemo(() => transactions.filter(t => {
    // 1. Filter by Type
    if (filterType !== 'all' && t.type !== filterType) return false;
    
    // Parse transaction details
    const { clientName, serviceName } = parseTxExcel(t);
    
    // 2. Filter by Service
    if (filterService !== 'all' && serviceName.toLowerCase() !== filterService.toLowerCase()) return false;

    // 3. Filter by Search Query (Client Name / Description)
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchClient = clientName.toLowerCase().includes(q);
      const matchDesc = (t.description || '').toLowerCase().includes(q);
      if (!matchClient && !matchDesc) return false;
    }
    
    // 4. Filter by Barber
    if (filterBarber !== 'all') {
      const isAssociated = t.metadata?.staffInvolved?.some(s => String(s.staffId) === String(filterBarber));
      if (!isAssociated) return false;
    }
    
    // 5. Filter by Date
    if (filterDate !== 'all') {
      const txDate = new Date(t.created_at);
      const today = new Date();
      if (filterDate === 'today') {
        if (txDate.toDateString() !== today.toDateString()) return false;
      } else if (filterDate === 'this_week') {
        const startOfWeek = getStartOfWeek();
        if (txDate < startOfWeek) return false;
      } else if (filterDate === 'this_month') {
        if (txDate.getMonth() !== today.getMonth() || txDate.getFullYear() !== today.getFullYear()) return false;
      } else if (filterDate === 'custom') {
        if (startDate) {
          const sDate = new Date(startDate);
          sDate.setHours(0, 0, 0, 0);
          if (txDate < sDate) return false;
        }
        if (endDate) {
          const eDate = new Date(endDate);
          eDate.setHours(23, 59, 59, 999);
          if (txDate > eDate) return false;
        }
      }
    }
    
    return true;
  }), [transactions, filterType, filterService, searchQuery, filterBarber, filterDate, startDate, endDate]);

  const uniqueServices = useMemo(() => (
    Array.from(new Set(transactions.map(t => parseTxExcel(t).serviceName).filter(Boolean)))
  ), [transactions]);

  const payrollDateRange = useMemo(() => {
    let dateFilterStart;
    let dateFilterEnd;

    if (payrollFilterDate === 'this_week') {
      dateFilterStart = getStartOfWeek();
      dateFilterEnd = new Date();
    } else if (payrollFilterDate === 'last_week') {
      const startOfThisWeek = getStartOfWeek();
      dateFilterStart = new Date(startOfThisWeek);
      dateFilterStart.setDate(startOfThisWeek.getDate() - 7);
      dateFilterEnd = new Date(startOfThisWeek);
      dateFilterEnd.setMilliseconds(-1);
    } else if (payrollFilterDate === 'custom') {
      dateFilterStart = payrollStartDate ? new Date(payrollStartDate + 'T00:00:00') : getStartOfWeek();
      dateFilterEnd = payrollEndDate ? new Date(payrollEndDate + 'T23:59:59') : new Date();
    } else {
      dateFilterStart = getStartOfWeek();
      dateFilterEnd = new Date();
    }

    return { dateFilterStart, dateFilterEnd };
  }, [payrollFilterDate, payrollStartDate, payrollEndDate]);

  const { dateFilterStart, dateFilterEnd } = payrollDateRange;

  const weeklyTransactions = useMemo(() => transactions.filter(t => {
    const d = new Date(t.created_at);
    return d >= dateFilterStart && d <= dateFilterEnd;
  }), [transactions, dateFilterStart, dateFilterEnd]);

  const processedPayroll = useMemo(() => staff.map(st => {
    const serviceTransactions = weeklyTransactions.filter(t => t.type === 'income' && t.metadata?.staffInvolved?.some(x => String(x.staffId) === String(st.id)));
    const valesTransactions = transactions.filter(t => {
      const d = new Date(t.created_at);
      return t.type === 'expense' &&
             t.category === 'Vales Barberos' &&
             String(t.metadata?.staffId) === String(st.id) &&
             d >= dateFilterStart &&
             d <= dateFilterEnd;
    });
    const staffTransactions = [...serviceTransactions, ...valesTransactions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    const servicesCount = serviceTransactions.length;
    
    const earnedBs = serviceTransactions.reduce((sum, t) => {
      const s = t.metadata?.staffInvolved?.find(x => String(x.staffId) === String(st.id));
      return sum + (s ? (s.commissionBs || 0) + (s.productCommissionBs || 0) : 0);
    }, 0);

    const propinasBs = serviceTransactions.reduce((sum, t) => {
      const s = t.metadata?.staffInvolved?.find(x => String(x.staffId) === String(st.id));
      return sum + (s ? (s.tipBs || 0) : 0);
    }, 0);

    const valesBs = valesTransactions.reduce((sum, t) => sum + (t.metadata?.amountBs || 0), 0);
    
    const paidBs = weeklyTransactions.filter(t => t.type === 'expense' && t.category === 'Pago NÃ³mina' && String(t.metadata?.staffId) === String(st.id)).reduce((sum, t) => sum + (t.metadata?.amountBs || 0) + (t.metadata?.deductionBs || 0), 0);
    
    const roleLower = st.role?.toLowerCase() || '';
    const isAssistant = roleLower.includes('asistente') || roleLower.includes('lavado') || roleLower.includes('operaciones');
    const isBarber = !isAssistant && (roleLower.includes('barbero') || roleLower.includes('barber') || roleLower.includes('socio') || roleLower.includes('estilista') || roleLower.includes('lider'));
    
    let grossIncomeBs = 0;
    let lavadosCount = 0;
    let lavadoDeductionBs = 0;
    let weeklyAssistanceUsd = 0;
    let weeklyAssistanceBs = 0;
    let netIncomeBs = 0;
    
    if (isBarber) {
      grossIncomeBs = serviceTransactions.reduce((sum, t) => sum + ((t.amount || 0) * (t.exchange_rate || rates?.usd || 550)), 0);
      lavadosCount = serviceTransactions.filter(t => t.metadata?.didWash).length;
      lavadoDeductionBs = lavadosCount * 1.00 * (rates?.usd || 550);
      weeklyAssistanceUsd = assistantConfig?.splits?.[st.id] || 0;
      weeklyAssistanceBs = weeklyAssistanceUsd * (rates?.usd || 550);
      netIncomeBs = earnedBs - lavadoDeductionBs - weeklyAssistanceBs;
    } else if (isAssistant) {
      lavadosCount = serviceTransactions.filter(t => t.metadata?.didWash).length;
      const totalBarberAssistanceUsd = Object.values(assistantConfig?.splits || {}).reduce((sum, val) => sum + (Number(val) || 0), 0);
      weeklyAssistanceUsd = totalBarberAssistanceUsd;
      weeklyAssistanceBs = totalBarberAssistanceUsd * (rates?.usd || 550);
      netIncomeBs = earnedBs + weeklyAssistanceBs;
    } else {
      netIncomeBs = earnedBs;
    }
    
    const balanceBs = netIncomeBs + propinasBs - valesBs - paidBs;
    const netIncomeUsd = netIncomeBs / (rates?.usd || 550);
    
    return {
      ...st,
      isBarber,
      isAssistant,
      servicesCount,
      lavadosCount,
      grossIncomeBs,
      lavadoDeductionBs,
      weeklyAssistanceUsd,
      weeklyAssistanceBs,
      earnedBs,
      propinasBs,
      valesBs,
      netIncomeBs,
      netIncomeUsd,
      paidBs,
      balanceBs,
      staffTransactions
    };
  }), [staff, weeklyTransactions, transactions, dateFilterStart, dateFilterEnd, rates, assistantConfig])
    .filter(s => s.balanceBs !== 0 || s.earnedBs > 0 || s.paidBs > 0 || s.valesBs > 0);

  const astroGrossIncomeBs = processedPayroll.reduce((sum, s) => sum + (s.isBarber ? s.grossIncomeBs : 0), 0);
  const totalStaffNetIncomeBs = processedPayroll.reduce((sum, s) => sum + s.netIncomeBs, 0);
  const astroNetProfitBs = Math.max(0, astroGrossIncomeBs - totalStaffNetIncomeBs);
  const astroNetProfitUsd = astroNetProfitBs / (rates?.usd || 550);

  const handleSaveCosts = (e) => {
    e.preventDefault();
    localStorage.setItem('astro_fixed_costs', JSON.stringify(fixedCosts));
    setIsEditingCosts(false);
    showToast("Estructura de costos actualizada.");
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: isMobile ? '120px' : '80px' }}>
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
            background: 'linear-gradient(145deg, rgba(255, 69, 58, 0.15) 0%, rgba(255, 69, 58, 0.05) 100%)', 
            border: '1px solid rgba(255, 69, 58, 0.3)', 
            color: '#ff6961',
            height: '44px',
            padding: '0 16px',
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontWeight: '700',
            fontSize: '14px',
            flex: 1,
            transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(255, 69, 58, 0.1)'
          }}>
            <Minus size={16} /> Gasto
          </button>
        </div>
      </div>

      {/* Tab Selector */}
      <div style={{ 
        display: 'flex', 
        gap: isMobile ? '8px' : '20px', 
        marginBottom: '32px', 
        borderBottom: '1px solid var(--border-color)',
        width: '100%'
      }}>
        <button 
          onClick={() => setActiveTab('transactions')}
          style={{ 
            padding: isMobile ? '12px 4px' : '12px 20px', 
            background: 'none', 
            border: 'none', 
            color: activeTab === 'transactions' ? 'var(--gold-primary)' : 'var(--text-secondary)',
            fontWeight: '800',
            fontSize: isMobile ? '12px' : '14px',
            cursor: 'pointer',
            flex: isMobile ? 1 : 'none',
            textAlign: 'center',
            borderBottom: activeTab === 'transactions' ? '2px solid var(--gold-primary)' : '2px solid transparent',
            transition: '0.2s'
          }}
        >
          {isMobile ? 'MOVIMIENTOS' : 'TRANSACCIONES'}
        </button>
        <button 
          onClick={() => setActiveTab('payroll')}
          style={{ 
            padding: isMobile ? '12px 4px' : '12px 20px', 
            background: 'none', 
            border: 'none', 
            color: activeTab === 'payroll' ? 'var(--gold-primary)' : 'var(--text-secondary)',
            fontWeight: '800',
            fontSize: isMobile ? '12px' : '14px',
            cursor: 'pointer',
            flex: isMobile ? 1 : 'none',
            textAlign: 'center',
            borderBottom: activeTab === 'payroll' ? '2px solid var(--gold-primary)' : '2px solid transparent',
            transition: '0.2s'
          }}
        >
          {isMobile ? 'NÓMINA' : 'NÓMINA Y PAGOS'}
        </button>
        <button 
          onClick={() => setActiveTab('analysis')}
          style={{ 
            padding: isMobile ? '12px 4px' : '12px 20px', 
            background: 'none', 
            border: 'none', 
            color: activeTab === 'analysis' ? 'var(--gold-primary)' : 'var(--text-secondary)',
            fontWeight: '800',
            fontSize: isMobile ? '12px' : '14px',
            cursor: 'pointer',
            flex: isMobile ? 1 : 'none',
            textAlign: 'center',
            borderBottom: activeTab === 'analysis' ? '2px solid var(--gold-primary)' : '2px solid transparent',
            transition: '0.2s'
          }}
        >
          {isMobile ? 'ANÁLISIS' : 'RENTABILIDAD Y OCUPACIÓN'}
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
          padding: isMobile ? '24px' : '32px',
          border: '1px solid rgba(212, 175, 55, 0.2)',
          borderRadius: '24px',
          background: 'linear-gradient(145deg, rgba(28, 28, 30, 0.95) 0%, rgba(35, 35, 38, 0.98) 100%)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)'
        }}>
          <div>
            <div style={{ fontSize: isMobile ? '12px' : '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Saldo Actual</div>
            <div style={{ fontSize: isMobile ? '38px' : '48px', fontWeight: '950', color: 'var(--gold-primary)', letterSpacing: '-1px' }}>
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
              {formatCurrency(transactions.filter(t => t.metadata?.cash_usd || t.metadata?.cashUsd).reduce((acc, t) => acc + Number(t.metadata?.cash_usd || t.metadata?.cashUsd || 0), 0) * (rates?.usd || 550), '')} <span style={{fontSize: '12px'}}>BS</span>
            </div>
            <div style={{ fontSize: '11px', color: 'white', marginTop: '4px' }}>
              REF: ${formatCurrency(transactions.filter(t => t.metadata?.cash_usd || t.metadata?.cashUsd).reduce((acc, t) => acc + Number(t.metadata?.cash_usd || t.metadata?.cashUsd || 0), 0), '')}
            </div>
          </div>
          <div style={{ padding: '20px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '20px' }}>
            <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px' }}>PAGO MÓVIL (BS)</div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--gold-primary)' }}>
              {formatCurrency(transactions.filter(t => t.metadata?.transfer_bs || t.metadata?.transferBs).reduce((acc, t) => acc + Number(t.metadata?.transfer_bs || t.metadata?.transferBs || 0), 0), '')} <span style={{fontSize: '12px'}}>BS</span>
            </div>
            <div style={{ fontSize: '11px', color: 'white', marginTop: '4px' }}>
              REF: ${formatCurrency(transactions.filter(t => t.metadata?.transfer_bs || t.metadata?.transferBs).reduce((acc, t) => acc + Number(t.metadata?.transfer_bs || t.metadata?.transferBs || 0), 0) / (rates?.usd || 550), '')}
            </div>
          </div>
          <div style={{ padding: '20px', backgroundColor: 'rgba(255,69,58,0.05)', borderRadius: '20px' }}>
            <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px' }}>COMISIONES DEUDA</div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#ff453a' }}>
              {formatCurrency((totalIncome * 0.4) * (rates?.usd || 550), '')} <span style={{fontSize: '12px'}}>BS</span>
            </div>
            <div style={{ fontSize: '11px', color: 'white', marginTop: '4px' }}>
              REF: ${(totalIncome * 0.4).toFixed(2)}
            </div>
          </div>
          <div style={{ padding: '20px', backgroundColor: 'rgba(212,175,55,0.1)', borderRadius: '20px', border: '1px solid var(--gold-primary)' }}>
            <div style={{ fontSize: '10px', fontWeight: '900', color: 'black', backgroundColor: 'var(--gold-primary)', display: 'inline-block', padding: '2px 6px', borderRadius: '4px', marginBottom: '4px' }}>NETO REAL</div>
            <div style={{ fontSize: '24px', fontWeight: '950', color: 'white' }}>
              {formatCurrency((totalIncome - totalExpense) * (rates?.usd || 550), '')} <span style={{fontSize: '12px'}}>BS</span>
            </div>
            <div style={{ fontSize: '12px', color: 'white', marginTop: '4px' }}>
              REF: ${formatCurrency(totalIncome - totalExpense, '')}
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
            <button onClick={() => setShowFilterPanel(!showFilterPanel)} style={{ 
              flex: 1,
              background: showFilterPanel ? 'var(--gold-primary)' : 'var(--bg-tertiary)', 
              border: '1px solid var(--border-color)', 
              color: showFilterPanel ? 'black' : 'var(--text-secondary)', 
              padding: '10px 16px', 
              borderRadius: '12px', 
              display: 'flex', 
              gap: '8px', 
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: showFilterPanel ? '850' : '600'
            }}>
              <Filter size={16} /> {showFilterPanel ? 'Ocultar Filtros' : 'Filtros'}
            </button>
          </div>
        </div>

        {/* HIGH-END TRANSACTIONS FILTER PANEL */}
        {showFilterPanel && (() => {
          return (
            <div className="glass-card animate-fade-in" style={{
              padding: '20px',
              borderRadius: '20px',
              marginBottom: '24px',
              backgroundColor: 'rgba(255, 255, 255, 0.01)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px'
              }}>
                {/* Search Input (Cliente) */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Buscar por Cliente</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Ej. Luis, Juan..."
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    />
                    <Search size={14} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
                  </div>
                </div>

                {/* Service Filter */}
                {/* Service Filter */}
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <AstroSelect 
                    label="Servicio"
                    value={filterService}
                    onChange={setFilterService}
                    options={[
                      { value: 'all', label: 'Todos los Servicios' },
                      ...uniqueServices.map(s => ({ value: s, label: s }))
                    ]}
                  />
                </div>

                {/* Type Select */}
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <AstroSelect 
                    label="Tipo de Movimiento"
                    value={filterType}
                    onChange={setFilterType}
                    options={[
                      { value: 'all', label: 'Todos los Movimientos' },
                      { value: 'income', label: 'Ingresos (+)' },
                      { value: 'expense', label: 'Egresos (-)' }
                    ]}
                  />
                </div>

                {/* Barber Select */}
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <AstroSelect 
                    label="Barbero Asignado"
                    value={filterBarber}
                    onChange={setFilterBarber}
                    options={[
                      { value: 'all', label: 'Cualquier Barbero' },
                      ...staff.filter(s => {
                        const role = s.role?.toLowerCase() || '';
                        return role.includes('barber') || role.includes('estilista') || role.includes('socio') || role.includes('lider');
                      }).map(s => ({ value: s.id, label: s.name }))
                    ]}
                  />
                </div>

                {/* Date Select */}
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <AstroSelect 
                    label="Fecha"
                    value={filterDate}
                    onChange={setFilterDate}
                    options={[
                      { value: 'all', label: 'Todo el Historial' },
                      { value: 'today', label: 'Hoy' },
                      { value: 'yesterday', label: 'Ayer' },
                      { value: 'this_week', label: 'Esta Semana' },
                      { value: 'last_week', label: 'Semana Pasada' },
                      { value: 'this_month', label: 'Este Mes' },
                      { value: 'custom', label: 'Rango Personalizado' }
                    ]}
                  />
                </div>
              </div>

              {/* Custom Date Range Picker */}
              {filterDate === 'custom' && (
                <div className="animate-fade-in" style={{
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'center',
                  padding: '16px',
                  backgroundColor: 'rgba(0,0,0,0.15)',
                  borderRadius: '12px',
                  flexWrap: 'wrap',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700' }}>Desde:</span>
                    <AstroDatePicker 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700' }}>Hasta:</span>
                    <AstroDatePicker 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {isMobile ? (
          /* Mobile Card List */
          <div className="hide-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '65vh', overflowY: 'auto', paddingRight: '4px' }}>
            {filteredTransactions.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No hay transacciones registradas que coincidan.</div>
            ) : filteredTransactions.map((t, idx) => {
              const txDate = new Date(t.created_at);
              const currentTxDateStr = txDate.toLocaleDateString();
              const prevTxDateStr = idx > 0 ? new Date(filteredTransactions[idx-1].created_at).toLocaleDateString() : null;
              const showDateHeader = currentTxDateStr !== prevTxDateStr;
              
              let dateLabel = currentTxDateStr;
              if (showDateHeader) {
                const today = new Date();
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                if (txDate.toDateString() === today.toDateString()) dateLabel = 'Hoy';
                else if (txDate.toDateString() === yesterday.toDateString()) dateLabel = 'Ayer';
                else dateLabel = txDate.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'short' });
              }

              let titleText = t.description;
              let subtitleText = t.category;
              let isParsed = false;
              
              if (t.description.includes('VENTA FINAL -')) {
                const descParts = t.description.split(' - ');
                const clientPart = descParts.find(p => p.toLowerCase().includes('cliente:'));
                const servicePart = descParts.find(p => p.toLowerCase().includes('servi:'));
                
                if (servicePart) {
                  titleText = servicePart.split(': ')[1] || servicePart;
                }
                if (clientPart) {
                  subtitleText = clientPart.split(': ')[1] || clientPart;
                  isParsed = true;
                }
              } else if (t.category === 'Cierre Semanal') {
                titleText = 'Cierre Semanal';
                subtitleText = t.description;
              }

              return (
                <React.Fragment key={t.id}>
                  {showDateHeader && (
                    <div style={{ padding: '8px 4px 0px 4px', color: 'var(--gold-primary)', fontWeight: '900', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', marginTop: idx === 0 ? '0' : '16px' }}>
                      {dateLabel}
                    </div>
                  )}
                  <div style={{ 
                    backgroundColor: 'rgba(255,255,255,0.02)', 
                    padding: '16px', 
                    borderRadius: '20px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    width: '42px', 
                    height: '42px', 
                    flexShrink: 0,
                    backgroundColor: t.type === 'income' ? 'rgba(50, 215, 75, 0.1)' : 'rgba(255, 69, 58, 0.1)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: t.type === 'income' ? '1px solid rgba(50, 215, 75, 0.2)' : '1px solid rgba(255, 69, 58, 0.2)'
                  }}>
                    {t.type === 'income' ? <Plus size={20} color="#32d74b" /> : <Minus size={20} color="#ff453a" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {titleText}
                    </div>
                    <div style={{ fontSize: '12px', color: isParsed ? 'var(--gold-primary)' : 'var(--text-muted)', fontWeight: isParsed ? '800' : '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {isParsed ? subtitleText : t.category}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '600', marginTop: '2px' }}>
                      {new Date(t.created_at).toLocaleString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                  <div style={{ 
                    fontSize: '15px', 
                    fontWeight: '900', 
                    color: t.type === 'income' ? '#32d74b' : '#ff453a',
                    whiteSpace: 'nowrap',
                    letterSpacing: '-0.5px'
                  }}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount * (t.exchange_rate || rates?.usd || 550), '')} Bs
                  </div>
                  <div style={{ fontSize: '11px', color: 'white', marginTop: '2px', fontWeight: '800', whiteSpace: 'nowrap' }}>
                    ${t.amount.toFixed(2)} USD
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '4px', letterSpacing: '0.5px', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                    REF
                  </div>
                </div>
              </div>
            </React.Fragment>
            );
          })}
          </div>
        ) : (
          /* Desktop Table - EXCEL STYLE */
          <div className="astro-scrollbar" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '500px', paddingRight: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'rgba(28,28,30,0.98)' }}>
                <tr style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '900' }}>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>FECHA</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>CLIENTE</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>BARBERO</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>SERVICIO</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>MÉTODO DE PAGO</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>LAVADO</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>MONTO</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay transacciones registradas que coincidan.</td>
                  </tr>
                ) : filteredTransactions.map((t, idx) => {
                  const { clientName, serviceName, barbero, paymentMethod, didWash } = parseTxExcel(t);
                  const isExpanded = selectedTxId === t.id;
                  
                  const txDate = new Date(t.created_at);
                  const currentTxDateStr = txDate.toLocaleDateString();
                  const prevTxDateStr = idx > 0 ? new Date(filteredTransactions[idx-1].created_at).toLocaleDateString() : null;
                  const showDateHeader = currentTxDateStr !== prevTxDateStr;
                  
                  let dateLabel = currentTxDateStr;
                  if (showDateHeader) {
                    const today = new Date();
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    if (txDate.toDateString() === today.toDateString()) dateLabel = 'Hoy';
                    else if (txDate.toDateString() === yesterday.toDateString()) dateLabel = 'Ayer';
                    else dateLabel = txDate.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'short' });
                  }

                  return (
                    <React.Fragment key={t.id}>
                      {showDateHeader && (
                        <tr>
                          <td colSpan="7" style={{ padding: idx === 0 ? '8px 0 8px 16px' : '24px 0 8px 16px', color: 'var(--gold-primary)', fontWeight: '900', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                            {dateLabel}
                          </td>
                        </tr>
                      )}
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
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
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
                            {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount * (t.exchange_rate || rates?.usd || 550), '')} BS
                          </div>
                          {!t.metadata?.isHistorical && (
                            <div style={{ fontSize: '11px', color: 'white' }}>
                              REF: ${formatCurrency(t.amount, '')}
                            </div>
                          )}
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
                              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1.2fr', gap: '32px' }}>
                                {/* Detalles del Cliente */}
                                <div>
                                  <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '16px', textTransform: 'uppercase' }}>Detalles del Cliente</div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                      <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nombre</span>
                                      <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{clientName}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                      <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cédula</span>
                                      <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{t.metadata?.clientCedula || 'No registrada'}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Servicio y Extras */}
                                <div>
                                  <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '16px', textTransform: 'uppercase' }}>Servicio y Extras</div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                      <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Servicio Base</span>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{serviceName}</span>
                                        {serviceName !== 'N/A' && t.type === 'income' && (
                                          <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--gold-primary)' }}>
                                              {formatCurrency(Math.max(0, (t.amount - (t.metadata?.tips_total || 0) - (t.metadata?.extras?.reduce((acc, ex) => acc + (ex.price || 0), 0) || 0) - (t.metadata?.products_sold?.reduce((acc, pr) => acc + (pr.price || 0), 0) || 0))) * (t.exchange_rate || rates?.usd || 550), '')} BS
                                            </span>
                                            <div style={{ fontSize: '10px', color: 'white' }}>
                                              REF: ${formatCurrency(Math.max(0, t.amount - (t.metadata?.tips_total || 0) - (t.metadata?.extras?.reduce((acc, ex) => acc + (ex.price || 0), 0) || 0) - (t.metadata?.products_sold?.reduce((acc, pr) => acc + (pr.price || 0), 0) || 0)), '')}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Extras / Productos</span>
                                      {t.metadata?.extras?.map((ex, i) => (
                                        <div key={`ex-${i}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                                          <span>{ex.name || ex.service_extras?.name}</span>
                                          <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontWeight: '700', color: 'var(--gold-primary)' }}>+{formatCurrency(ex.price * (t.exchange_rate || rates?.usd || 550), '')} BS</span>
                                            <div style={{ fontSize: '10px', color: 'white' }}>REF: ${formatCurrency(ex.price, '')}</div>
                                          </div>
                                        </div>
                                      ))}
                                      {t.metadata?.products_sold?.map((pr, i) => (
                                        <div key={`pr-${i}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                                          <span>{pr.name || pr.inventory?.name} ({pr.quantity}u)</span>
                                          <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontWeight: '700', color: 'var(--gold-primary)' }}>+{formatCurrency(pr.price * (t.exchange_rate || rates?.usd || 550), '')} BS</span>
                                            <div style={{ fontSize: '10px', color: 'white' }}>REF: ${formatCurrency(pr.price, '')}</div>
                                          </div>
                                        </div>
                                      ))}
                                      {(!t.metadata?.extras?.length && !t.metadata?.products_sold?.length) && <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Ninguno</div>}
                                    </div>
                                    {t.metadata?.tips_total > 0 && (
                                      <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                                        <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Propinas Recibidas</span>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                          <span>Total Propinas</span>
                                          <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontWeight: '700', color: 'var(--gold-primary)' }}>+{formatCurrency(t.metadata.tips_total * (t.exchange_rate || rates?.usd || 550), '')} BS</span>
                                            <div style={{ fontSize: '10px', color: 'white' }}>REF: ${formatCurrency(t.metadata.tips_total, '')}</div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Liquidación */}
                                <div>
                                  <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '16px', textTransform: 'uppercase' }}>Liquidación y Ganancias</div>
                                  <div className="glass-card" style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(212,175,55,0.1)', marginBottom: '24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Venta Bruta (Serv + Ext + Prod)</span>
                                      <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>{formatCurrency((t.amount - (t.metadata?.tips_total || 0)) * (t.exchange_rate || rates?.usd || 550), '')} BS</span>
                                        <div style={{ fontSize: '10px', color: 'white' }}>REF: ${formatCurrency(t.amount - (t.metadata?.tips_total || 0), '')}</div>
                                      </div>
                                    </div>
                                    {t.metadata?.tips_total > 0 && (
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px dashed rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Propinas Totales</span>
                                        <div style={{ textAlign: 'right' }}>
                                          <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--gold-primary)' }}>+{formatCurrency(t.metadata.tips_total * (t.exchange_rate || rates?.usd || 550), '')} BS</span>
                                          <div style={{ fontSize: '10px', color: 'white' }}>REF: ${formatCurrency(t.metadata.tips_total, '')}</div>
                                        </div>
                                      </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                      <span style={{ fontSize: '14px', color: 'white', fontWeight: '900' }}>TOTAL COBRADO</span>
                                      <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontSize: '18px', fontWeight: '900', color: 'var(--gold-primary)' }}>{formatCurrency(t.amount * (t.exchange_rate || rates?.usd || 550), '')} BS</span>
                                        <div style={{ fontSize: '12px', color: 'white' }}>REF: ${formatCurrency(t.amount, '')}</div>
                                      </div>
                                    </div>

                                    {/* Información de pago */}
                                    <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '12px', marginBottom: '16px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Efectivo USD:</span>
                                        <span style={{ fontSize: '11px', fontWeight: '800' }}>${formatCurrency(t.metadata?.cash_usd || t.metadata?.cashUsd || (t.type === 'income' && !(t.metadata?.transfer_bs || t.metadata?.transferBs) ? t.amount : 0), '')}</span>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Pago Móvil (Bs):</span>
                                        <span style={{ fontSize: '11px', fontWeight: '800' }}>{formatCurrency(t.metadata?.transfer_bs || t.metadata?.transferBs || 0, '')} BS</span>
                                      </div>
                                    </div>

                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                                      <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>Desglose de Personal</span>
                                      {t.metadata?.staffInvolved?.length > 0 ? t.metadata.staffInvolved.map((s, idx) => (
                                        <div key={idx} style={{ marginBottom: '8px', padding: '10px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                              <span style={{ fontSize: '13px', fontWeight: '700', color: 'white', display: 'block' }}>{s.name}</span>
                                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{s.role?.split('|')[0] || 'Personal'}</span>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                              <div style={{ fontSize: '13px', fontWeight: '900', color: 'var(--gold-primary)' }}>+{formatCurrency((s.commissionEarned || 0) * (t.exchange_rate || rates?.usd || 550), '')} BS Comisión</div>
                                              <div style={{ fontSize: '10px', color: 'white' }}>REF: ${formatCurrency(s.commissionEarned || 0, '')}</div>
                                              {s.tip > 0 && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', marginTop: '4px' }}>+{formatCurrency(s.tip * (t.exchange_rate || rates?.usd || 550), '')} BS Propina (REF: <span style={{color: 'white'}}>${formatCurrency(s.tip, '')}</span>)</div>}
                                            </div>
                                          </div>
                                        </div>
                                      )) : (
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>Operación manual / No vinculada a personal.</div>
                                      )}
                                    </div>

                                    {/* GANANCIA ASTRO */}
                                    <div style={{ marginTop: '16px', padding: '16px', borderRadius: '12px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: '900', color: 'var(--gold-primary)' }}>Ganancia Astro</span>
                                        <div style={{ textAlign: 'right' }}>
                                          <span style={{ fontSize: '16px', fontWeight: '950', color: '#32d74b' }}>
                                            {formatCurrency(((t.amount - (t.metadata?.tips_total || 0)) - (t.metadata?.staffInvolved?.reduce((acc, s) => acc + (s.commissionEarned || 0), 0) || 0)) * (t.exchange_rate || rates?.usd || 550), '')} BS
                                          </span>
                                          <div style={{ fontSize: '12px', color: 'white', fontWeight: '700' }}>
                                            REF: ${formatCurrency((t.amount - (t.metadata?.tips_total || 0)) - (t.metadata?.staffInvolved?.reduce((acc, s) => acc + (s.commissionEarned || 0), 0) || 0), '')}
                                          </div>
                                        </div>
                                      </div>
                                      <div style={{ fontSize: '12px', color: 'white', display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px dashed rgba(212,175,55,0.2)', paddingTop: '12px', marginTop: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                          <span>Venta Bruta:</span>
                                          <span>{formatCurrency((t.amount - (t.metadata?.tips_total || 0)) * (t.exchange_rate || rates?.usd || 550), '')} BS</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ff453a' }}>
                                          <span>- Comisiones Pagadas:</span>
                                          <span>{formatCurrency((t.metadata?.staffInvolved?.reduce((acc, s) => acc + (s.commissionEarned || 0), 0) || 0) * (t.exchange_rate || rates?.usd || 550), '')} BS</span>
                                        </div>
                                      </div>
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


      {activeTab === 'payroll' && (
          <div className="animate-fade-in">
             <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: '20px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '1px', margin: 0 }}>NÓMINA Y CORTE SEMANAL</h3>
                
                {/* DATE RANGE FILTER */}
                <div style={{ width: isMobile ? '100%' : '240px' }}>
                  <AstroSelect
                    value={payrollFilterDate}
                    onChange={setPayrollFilterDate}
                    options={[
                      { value: 'this_week', label: 'Esta Semana (Actual)' },
                      { value: 'last_week', label: 'Semana Pasada' },
                      { value: 'custom', label: 'Rango Personalizado' }
                    ]}
                  />
                </div>
                {payrollFilterDate === 'custom' && (
                  <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Desde:</span>
                    <AstroDatePicker 
                      value={payrollStartDate}
                      onChange={(e) => setPayrollStartDate(e.target.value)}
                    />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Hasta:</span>
                    <AstroDatePicker 
                      value={payrollEndDate}
                      onChange={(e) => setPayrollEndDate(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px', width: isMobile ? '100%' : 'auto' }}>
                <button 
                  onClick={() => setIsConfiguringPayroll(true)} 
                  style={{ 
                    padding: '14px 16px', 
                    fontSize: '13px', 
                    borderRadius: '12px',
                    background: 'rgba(212,175,55,0.1)',
                    border: '1px solid rgba(212,175,55,0.3)',
                    color: 'var(--gold-primary)',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: isMobile ? '100%' : 'auto',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <WalletCards size={16} /> Salario Asistente
                </button>
                <button 
                  onClick={() => setWeeklyCloseModal({ isOpen: true, loading: false, success: false, error: null })} 
                  style={{ 
                    padding: '14px 16px', 
                    fontSize: '13px', 
                    borderRadius: '12px', 
                    background: 'rgba(255, 69, 58, 0.1)', 
                    border: '1px solid rgba(255, 69, 58, 0.3)', 
                    color: '#ff453a',
                    fontWeight: '800',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: isMobile ? '100%' : 'auto'
                  }}
                >
                  <RefreshCw size={16} className={weeklyCloseModal.loading ? "animate-spin" : ""} /> Cierre Semanal
                </button>
              </div>
            </div>

            {/* ASTRO GENERAL RESULTS (Resultados Astro) */}
            <div className="glass-card animate-fade-in" style={{ 
              background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.02) 100%)', 
              border: '1px solid rgba(212,175,55,0.3)',
              borderRadius: '24px',
              padding: isMobile ? '20px' : '24px',
              marginBottom: '32px',
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'flex-start' : 'center',
              gap: isMobile ? '16px' : '24px'
            }}>
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--gold-primary)' }}></div>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--gold-primary)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                    Resultados Astro ({
                      payrollFilterDate === 'this_week' ? 'Semanal' :
                      payrollFilterDate === 'last_week' ? 'Semana Pasada' : 'Personalizado'
                    })
                  </span>
                </div>
                <h4 style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: '900', color: 'white', margin: 0, lineHeight: '1.3' }}>Rendimiento General de la Barbería</h4>
              </div>
              
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '40px', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'flex-start' : 'flex-end', background: isMobile ? 'rgba(0,0,0,0.2)' : 'transparent', padding: isMobile ? '16px' : '0', borderRadius: isMobile ? '16px' : '0' }}>
                <div style={{ textAlign: 'left', display: 'flex', justifyContent: isMobile ? 'space-between' : 'flex-start', width: '100%', flexDirection: isMobile ? 'row' : 'column', alignItems: isMobile ? 'center' : 'flex-end' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', marginBottom: isMobile ? '0' : '4px' }}>Ingreso Bruto</div>
                  <div style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: '900', color: 'white' }}>{formatCurrency(astroGrossIncomeBs, '')} Bs</div>
                </div>
                {isMobile && <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', width: '100%' }}></div>}
                <div style={{ textAlign: 'left', display: 'flex', justifyContent: isMobile ? 'space-between' : 'flex-start', width: '100%', flexDirection: isMobile ? 'row' : 'column', alignItems: isMobile ? 'center' : 'flex-end' }}>
                  <div style={{ fontSize: '11px', color: 'var(--gold-primary)', fontWeight: '800', textTransform: 'uppercase', marginBottom: isMobile ? '0' : '4px' }}>Ganancia Neta</div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: '900', color: '#32d74b' }}>{formatCurrency(astroNetProfitBs, '')} Bs</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '2px' }}>REF: ${astroNetProfitUsd.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {processedPayroll.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay saldos pendientes.</div>
              ) : processedPayroll.map(st => (
                <div key={st.id} className="glass-card animate-fade-in" style={{ 
                  padding: '24px', 
                  borderRadius: '24px',
                  border: st.isAssistant ? '1px solid rgba(0, 191, 255, 0.2)' : '1px solid rgba(255,255,255,0.08)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '12px', 
                        background: st.isAssistant ? 'rgba(0,191,255,0.1)' : 'rgba(212,175,55,0.1)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: st.isAssistant ? '#00bfff' : 'var(--gold-primary)', 
                        fontWeight: '900', 
                        fontSize: '18px' 
                      }}>
                        {st.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '16px', color: 'white' }}>{st.name}</div>
                        <div style={{ fontSize: '11px', color: st.isAssistant ? '#00bfff' : 'var(--gold-primary)', fontWeight: '800', textTransform: 'uppercase' }}>
                          {st.role?.split('|')[0] || 'Miembro'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', marginBottom: '16px' }}>
                    {st.isBarber ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Servicios Realizados</span>
                          <span style={{ fontSize: '12px', fontWeight: '850', color: 'white' }}>{st.servicesCount}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Lavados (#)</span>
                          <span style={{ fontSize: '12px', fontWeight: '850', color: 'white' }}>{st.lavadosCount}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Lavado (Bs)</span>
                          <span style={{ fontSize: '12px', fontWeight: '850', color: 'var(--gold-primary)' }}>{formatCurrency(st.lavadoDeductionBs, '')} Bs.</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ingreso Bruto</span>
                          <span style={{ fontSize: '12px', fontWeight: '850', color: 'white' }}>{formatCurrency(st.grossIncomeBs, '')} Bs.</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Deducción Asistencia</span>
                          <span style={{ fontSize: '12px', fontWeight: '850', color: '#ff453a' }}>-{formatCurrency(st.weeklyAssistanceBs, '')} Bs.</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ingreso Neto</span>
                          <span style={{ fontSize: '12px', fontWeight: '900', color: 'white' }}>{formatCurrency(st.netIncomeBs, '')} Bs.</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>REF (USD)</span>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--gold-primary)' }}>${formatCurrency(st.netIncomeUsd, '')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                          <span style={{ fontSize: '12px', color: '#32d74b', fontWeight: '800' }}>Propinas (+)</span>
                          <span style={{ fontSize: '12px', fontWeight: '850', color: '#32d74b' }}>+{formatCurrency(st.propinasBs, '')} Bs.</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: '#ff453a', fontWeight: '800' }}>Vales / Adelantos (-)</span>
                          <span style={{ fontSize: '12px', fontWeight: '850', color: '#ff453a' }}>-{formatCurrency(st.valesBs, '')} Bs.</span>
                        </div>
                      </>
                    ) : st.isAssistant ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Lavados Realizados</span>
                          <span style={{ fontSize: '12px', fontWeight: '850', color: 'white' }}>{st.lavadosCount}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Asistencia Semanal</span>
                          <span style={{ fontSize: '12px', fontWeight: '850', color: '#00bfff' }}>{formatCurrency(st.weeklyAssistanceBs, '')} Bs.</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Comisión Lavados</span>
                          <span style={{ fontSize: '12px', fontWeight: '850', color: 'white' }}>{formatCurrency(st.earnedBs, '')} Bs.</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ingreso Neto</span>
                          <span style={{ fontSize: '12px', fontWeight: '900', color: 'white' }}>{formatCurrency(st.netIncomeBs, '')} Bs.</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>REF (USD)</span>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: '#00bfff' }}>${formatCurrency(st.netIncomeUsd, '')}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Comisiones Acumuladas</span>
                          <span style={{ fontSize: '12px', fontWeight: '850', color: 'white' }}>{formatCurrency(st.earnedBs, '')} Bs.</span>
                        </div>
                      </>
                    )}
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Pagado/Deducido (Bs)</span>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#ff453a' }}>-{formatCurrency(st.paidBs, '')} Bs.</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--gold-primary)' }}>Por Pagar (Bs)</span>
                      <span style={{ fontSize: '16px', fontWeight: '950', color: '#32d74b' }}>{formatCurrency(st.balanceBs, '')} Bs.</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>REF (USD)</span>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--gold-primary)' }}>${formatCurrency(st.balanceBs / (rates?.usd || 550), '')}</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <button 
                      onClick={() => setPayrollDetail({ isOpen: true, staff: st, transactions: st.staffTransactions })}
                      style={{ flex: 1, minWidth: '70px', padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
                    >
                      <Eye size={16} /> <span style={{fontSize: '11px', fontWeight: '800'}}>Detalle</span>
                    </button>
                    
                    {(st.isBarber || st.isAssistant) && (
                      <button 
                        onClick={() => {
                          setValeModal({
                            isOpen: true,
                            staff: st,
                            amountBs: '',
                            paymentMethod: 'Efectivo ($)',
                            maxBalance: st.balanceBs
                          });
                        }}
                        style={{ flex: 1, minWidth: '70px', padding: '10px', borderRadius: '10px', background: 'rgba(255, 69, 58, 0.1)', color: '#ff453a', border: '1px solid rgba(255, 69, 58, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
                      >
                        <Minus size={16} /> <span style={{fontSize: '11px', fontWeight: '800'}}>Vale</span>
                      </button>
                    )}

                    <button 
                      onClick={() => {
                        setPayrollModal({
                          isOpen: true,
                          staff: st,
                          earnedBs: st.balanceBs,
                          deductionBs: 0,
                          paymentAmountBs: Math.round(st.balanceBs / 2),
                          isAbono: true,
                          file: null,
                          paymentMethod: 'Efectivo ($)'
                        });
                      }}
                      disabled={st.balanceBs <= 0}
                      style={{ flex: 1, minWidth: '70px', padding: '10px', borderRadius: '10px', background: 'rgba(212,175,55,0.1)', color: 'var(--gold-primary)', border: '1px solid var(--gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: st.balanceBs > 0 ? 'pointer' : 'not-allowed', opacity: st.balanceBs > 0 ? 1 : 0.5 }}
                    >
                      <WalletCards size={16} /> <span style={{fontSize: '11px', fontWeight: '800'}}>Abonar</span>
                    </button>

                    <button 
                      onClick={() => {
                        setPayrollModal({
                          isOpen: true,
                          staff: st,
                          earnedBs: st.balanceBs,
                          deductionBs: 0,
                          paymentAmountBs: st.balanceBs,
                          isAbono: false,
                          file: null,
                          paymentMethod: 'Efectivo ($)'
                        });
                      }}
                      disabled={st.balanceBs <= 0}
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', background: st.balanceBs > 0 ? 'var(--gold-primary)' : 'rgba(255,255,255,0.05)', color: st.balanceBs > 0 ? '#000' : 'var(--text-muted)', fontWeight: '950', border: 'none', cursor: st.balanceBs > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      {st.balanceBs > 0 ? 'Realizar Pago Total' : 'Al Día'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
      )}

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
                   
                   {/* Grilla de Desglose de Costos (2 columnas para ahorrar espacio) */}
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', margin: '8px 0' }}>
                     {[
                       { key: 'rent', defaultLabel: 'Alquiler' },
                       { key: 'services', defaultLabel: 'Servicios' },
                       { key: 'payroll', defaultLabel: 'Nómina Fija' },
                       { key: 'software', defaultLabel: 'Software' },
                       { key: 'marketing', defaultLabel: 'Marketing' },
                       { key: 'tax', defaultLabel: 'Impuestos' }
                     ].map(c => (
                       <div key={c.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>↳ {fixedCosts.customLabels?.[c.key] || c.defaultLabel}</span>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginLeft: '8px' }}>-${formatCurrency(fixedCosts[c.key] || 0)}</span>
                       </div>
                     ))}

                     {fixedCosts.extraCosts?.map((c, i) => (
                       <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>↳ {c.label || 'Sin nombre'}</span>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginLeft: '8px' }}>-${formatCurrency(c.value)}</span>
                       </div>
                     ))}
                   </div>

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
          {isEditingCosts && createPortal(
            <div className="modal-overlay animate-fade-in" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,10,12,0.96)', backdropFilter: 'blur(20px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <div className="glass-card animate-scale-in" style={{ maxWidth: '850px', width: '100%', borderRadius: '32px', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
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
                    <div key={field.key} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '4px' }}>
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
                      <div style={{ flex: 1.5 }}>
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

                  <div style={{ gridColumn: 'span 2', height: '1px', background: 'rgba(255,255,255,0.05)', margin: '8px 0' }} />

                  {fixedCosts.extraCosts?.map((cost, idx) => (
                    <div key={idx} style={{ gridColumn: 'span 2', display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '8px' }}>
                      <div style={{ flex: 2 }}>
                        <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Nombre del Gasto Extra</label>
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
            </div>,
            document.body
          )}
          
          {/* Assistant Config Modal */}
          {isConfiguringPayroll && createPortal(
            <div className="modal-overlay animate-fade-in" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,10,12,0.96)', backdropFilter: 'blur(20px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <div className="glass-card animate-scale-in" style={{ maxWidth: '500px', width: '100%', borderRadius: '32px', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '24px' }}>Configuración <span className="text-gold">Sueldo Asistente</span></h3>
                <form onSubmit={handleSaveAssistantConfig} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Monto Semanal del Salario (USD $)</label>
                    <input 
                      type="number" 
                      step="any"
                      value={assistantConfig.weeklyVacaUsd || ''} 
                      onChange={(e) => handleWeeklyTotalChange(e.target.value)} 
                      style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '16px' }} 
                    />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>Aporte Semanal por Barbero (USD $)</h4>
                    {eligibleBarbers.map(s => (
                      <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div>
                          <span style={{ fontSize: '14px', fontWeight: '600' }}>{s.name}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                            ({s.role?.split('|')[0] || 'Miembro'})
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>$</span>
                          <input 
                            type="number" 
                            step="any"
                            value={assistantConfig?.splits?.[s.id] || 0} 
                            onChange={(e) => handleBarberSplitChange(s.id, e.target.value)} 
                            style={{ width: '100px', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', textAlign: 'center' }} 
                          />
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
            </div>,
            document.body
          )}

          {/* Weekly Close Modal */}
          {weeklyCloseModal.isOpen && createPortal(
            <div className="modal-overlay animate-fade-in" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,10,12,0.96)', backdropFilter: 'blur(20px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <div className="glass-card animate-scale-in" style={{ maxWidth: '450px', width: '100%', borderRadius: '32px', padding: '32px', textAlign: 'center' }}>
                {!weeklyCloseModal.success ? (
                  <>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255, 69, 58, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#ff453a' }}>
                      <RefreshCw size={30} className={weeklyCloseModal.loading ? "animate-spin" : ""} />
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '12px' }}>Realizar <span style={{ color: '#ff453a' }}>Cierre Semanal</span></h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
                      {weeklyCloseModal.loading 
                        ? 'Archivando registros de la semana en Google Sheets... Por favor espera.'
                        : 'Esta acción moverá todos los registros de la pestaña "DATOS" a "HISTORIAL" en la hoja de cálculo de Google Sheets y limpiará la hoja activa para el nuevo ciclo.'
                      }
                    </p>

                    {weeklyCloseModal.error && (
                      <div style={{ background: 'rgba(255, 69, 58, 0.1)', border: '1px solid rgba(255, 69, 58, 0.2)', color: '#ff453a', padding: '12px', borderRadius: '12px', fontSize: '13px', marginBottom: '20px', textAlign: 'left' }}>
                        <strong>Error:</strong> {weeklyCloseModal.error}
                      </div>
                    )}

                    {!weeklyCloseModal.loading && (
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', textAlign: 'left' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          ⚠️ Asegúrate de haber completado y registrado todos los pagos de nómina en el CRM antes de archivar.
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button 
                        disabled={weeklyCloseModal.loading} 
                        onClick={() => setWeeklyCloseModal({ isOpen: false, loading: false, success: false, error: null })} 
                        style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', fontWeight: '700', cursor: weeklyCloseModal.loading ? 'not-allowed' : 'pointer' }}
                      >
                        Cancelar
                      </button>
                      <button 
                        disabled={weeklyCloseModal.loading} 
                        onClick={handleWeeklyCloseExecute} 
                        style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#ff453a', border: 'none', color: 'white', fontWeight: '800', cursor: weeklyCloseModal.loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      >
                        {weeklyCloseModal.loading ? 'Cerrando...' : 'Confirmar Cierre'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(50, 215, 75, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#32d74b' }}>
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '12px' }}><span style={{ color: '#32d74b' }}>Cierre Exitoso</span></h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
                      Las transacciones de la semana se han archivado correctamente en la pestaña "HISTORIAL" de tu hoja de cálculo.
                    </p>
                    <button 
                      onClick={() => setWeeklyCloseModal({ isOpen: false, loading: false, success: false, error: null })} 
                      style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--gold-primary)', border: 'none', color: '#000', fontWeight: '900', cursor: 'pointer' }}
                    >
                      Entendido
                    </button>
                  </>
                )}
              </div>
            </div>,
            document.body
          )}

          {/* Payroll Payment Modal */}
          {payrollModal.isOpen && createPortal(
            <div className="modal-overlay animate-fade-in" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,10,12,0.96)', backdropFilter: 'blur(20px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <div className="glass-card animate-scale-in" style={{ maxWidth: '400px', width: '100%', borderRadius: '32px', padding: '32px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '8px' }}>
                  {payrollModal.isAbono ? 'Abono a' : 'Pago a'} <span className="text-gold">{payrollModal.staff?.name}</span>
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
                  {payrollModal.isAbono ? 'Indica el monto que deseas abonar hoy.' : 'Realiza el descuento de asistencia y sube el comprobante.'}
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Por Cobrar:</span>
                    <span style={{ fontSize: '18px', fontWeight: '900' }}>{formatCurrency(payrollModal.earnedBs, '')} Bs</span>
                  </div>

                  {payrollModal.isAbono ? (
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--gold-primary)', display: 'block', marginBottom: '8px' }}>Monto a Abonar (Bs)</label>
                      <input 
                        type="number" 
                        value={payrollModal.paymentAmountBs} 
                        onChange={(e) => setPayrollModal({...payrollModal, paymentAmountBs: Number(e.target.value)})} 
                        style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--gold-primary)', color: 'white', fontSize: '18px', fontWeight: '900' }} 
                      />
                    </div>
                  ) : (
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Deducción Asistente / Insumos (Bs)</label>
                      <input type="number" value={payrollModal.deductionBs} onChange={(e) => setPayrollModal({...payrollModal, deductionBs: Number(e.target.value)})} style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.2)', color: '#ff453a', fontSize: '16px', fontWeight: '900' }} />
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>Monto sugerido basado en la configuración de la Vaca.</p>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: '16px', fontWeight: '900', color: 'var(--gold-primary)' }}>Total a Transferir:</span>
                    <span style={{ fontSize: '24px', fontWeight: '900', color: '#32d74b' }}>
                      {formatCurrency(payrollModal.isAbono ? payrollModal.paymentAmountBs : (payrollModal.earnedBs - payrollModal.deductionBs), '')} Bs
                    </span>
                  </div>

                  <div>
                    <AstroSelect 
                      label="Método de Pago"
                      value={payrollModal.paymentMethod} 
                      onChange={(val) => setPayrollModal({...payrollModal, paymentMethod: val})} 
                      options={[
                        { value: 'Efectivo ($)', label: 'Efectivo ($)' },
                        { value: 'Zelle', label: 'Zelle' },
                        { value: 'Pago Móvil', label: 'Pago Móvil' },
                        { value: 'Efectivo (Bs)', label: 'Efectivo (Bs)' },
                        { value: 'Binance', label: 'Binance' },
                        { value: 'Zinli', label: 'Zinli' }
                      ]}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Comprobante de Pago (Foto / Capture)</label>
                    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: payrollModal.file ? '12px' : '24px 16px', background: payrollModal.file ? 'rgba(50,215,75,0.05)' : 'rgba(212,175,55,0.05)', border: payrollModal.file ? '1px dashed rgba(50,215,75,0.3)' : '1px dashed rgba(212,175,55,0.3)', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.3s' }}>
                      <input type="file" accept="image/*" onChange={handleFileUpload} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10 }} />
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: payrollModal.file ? '16px' : '24px' }}>{payrollModal.file ? '✅' : '📸'}</span>
                        <span style={{ color: payrollModal.file ? '#32d74b' : 'var(--gold-primary)', fontWeight: '800', fontSize: '12px' }}>
                          {payrollModal.file ? '¡Comprobante cargado! (Toca para cambiar)' : 'Toca para subir comprobante'}
                        </span>
                      </div>
                    </div>
                    {payrollModal.file && (
                      <div style={{ marginTop: '12px', height: '140px', borderRadius: '16px', overflow: 'hidden', backgroundImage: `url(${payrollModal.file})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '2px solid rgba(50,215,75,0.3)' }}></div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button onClick={() => setPayrollModal({...payrollModal, isOpen: false})} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', fontWeight: '700' }}>Cancelar</button>
                    <button onClick={handleProcessPayroll} className="btn-gold" style={{ flex: 1, padding: '14px', borderRadius: '12px', fontWeight: '800' }}>Confirmar {payrollModal.isAbono ? 'Abono' : 'Pago'}</button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Registrar Vale Modal */}
          {valeModal.isOpen && createPortal(
            <div className="modal-overlay animate-fade-in" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,10,12,0.96)', backdropFilter: 'blur(20px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <div className="glass-card animate-scale-in" style={{ maxWidth: '400px', width: '100%', borderRadius: '32px', padding: '32px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '8px' }}>
                  Registrar <span className="text-gold">Vale / Adelanto</span>
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
                  Ingresa el monto del adelanto en Bolívares (Bs) para <span style={{ fontWeight: '800', color: 'white' }}>{valeModal.staff?.name}</span>. Este monto se descontará automáticamente de su pago semanal.
                  <br /><br />
                  <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--gold-primary)' }}>Saldo Disponible: {formatCurrency(valeModal.maxBalance || 0, '')} Bs.</span>
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--gold-primary)', display: 'block', marginBottom: '8px' }}>Monto del Vale (Bs)</label>
                    <input 
                      type="number" 
                      value={valeModal.amountBs} 
                      onChange={(e) => setValeModal({...valeModal, amountBs: e.target.value})} 
                      placeholder="Ej. 500, 1000..."
                      style={{ 
                        width: '100%', 
                        padding: '14px', 
                        borderRadius: '12px', 
                        background: 'rgba(255,255,255,0.05)', 
                        border: '1px solid var(--gold-primary)', 
                        color: 'white', 
                        fontSize: '18px', 
                        fontWeight: '900',
                        outline: 'none'
                      }} 
                    />
                  </div>

                  <div>
                    <AstroSelect 
                      label="Método de Pago"
                      value={valeModal.paymentMethod} 
                      onChange={(val) => setValeModal({...valeModal, paymentMethod: val})} 
                      options={[
                        { value: 'Efectivo ($)', label: 'Efectivo ($)' },
                        { value: 'Zelle', label: 'Zelle' },
                        { value: 'Pago Móvil', label: 'Pago Móvil' },
                        { value: 'Efectivo (Bs)', label: 'Efectivo (Bs)' },
                        { value: 'Binance', label: 'Binance' },
                        { value: 'Zinli', label: 'Zinli' }
                      ]}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button 
                      onClick={() => setValeModal({ isOpen: false, staff: null, amountBs: '', paymentMethod: 'Efectivo ($)' })} 
                      style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleRegisterVale} 
                      className="btn-gold" 
                      style={{ flex: 1, padding: '14px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' }}
                    >
                      Registrar Vale
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Payroll Detail Modal */}
          {payrollDetail.isOpen && createPortal(
            <div className="modal-overlay animate-fade-in" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,10,12,0.96)', backdropFilter: 'blur(20px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <div className="glass-card animate-scale-in" style={{ maxWidth: '600px', width: '100%', borderRadius: '32px', padding: '32px', maxHeight: '80vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: '900' }}>Detalle de Servicios: <span className="text-gold">{payrollDetail.staff?.name}</span></h3>
                  <button onClick={() => setPayrollDetail({ isOpen: false, staff: null, transactions: [] })} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {payrollDetail.transactions.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No hay transacciones registradas.</p>
                  ) : (
                    payrollDetail.transactions.map((t, idx) => {
                                // CASO 1: VALE / ADELANTO (Gasto - En Rojo)
                      if (t.type === 'expense' && t.category === 'Vales Barberos') {
                        const amountBs = t.metadata?.amountBs || t.amount * (rates?.usd || 550);
                        const amountUsd = t.amount;
                        const reason = t.description.replace(`ADELANTO VALE - Barbero: ${payrollDetail.staff?.name}`, '').replace(' - ', '').trim();
                        
                        return (
                          <div key={idx} style={{ background: 'rgba(255, 69, 58, 0.04)', padding: '20px', borderRadius: '20px', borderLeft: '4px solid #ff453a', border: '1px solid rgba(255, 69, 58, 0.12)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: '900', fontSize: '15px', color: '#ff453a' }}>💸 VALE / ADELANTO</span>
                                {reason && reason !== 'Vale de efectivo' && (
                                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', marginTop: '2px' }}>{reason}</span>
                                )}
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ color: '#ff453a', fontWeight: '950', fontSize: '16px' }}>-{formatCurrency(amountBs, '')} Bs</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800' }}>-${formatCurrency(amountUsd, '')} USD</div>
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', marginTop: '12px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                                {t.created_at ? new Date(t.created_at).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }) : 'S/F'}
                              </span>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px' }}>ID: {t.id.slice(0,8)}</span>
                            </div>
                          </div>
                        );
                      }

                      // CASO 2: SERVICIO / VENTA (Ingresos)
                      const descParts = t.description.split(' - ');
                      const clientFromDesc = descParts.find(s => s.toLowerCase().includes('cliente:'))?.split(': ')[1];
                      const serviceFromDesc = descParts.find(s => s.toLowerCase().includes('servi:'))?.split(': ')[1];

                      const clientName = t.metadata?.clientName || clientFromDesc || 'S/N';
                      const serviceName = t.metadata?.serviceName || serviceFromDesc || (t.category === 'Ventas Astro' ? 'Servicio' : t.description);
                      
                      const stInvolved = t.metadata?.staffInvolved?.find(s => String(s.staffId) === String(payrollDetail.staff.id));
                      const commBs = stInvolved?.commissionBs || 0;
                      const commUsd = stInvolved?.commissionEarned || 0;
                      const prodCommBs = stInvolved?.productCommissionBs || 0;
                      const prodCommUsd = stInvolved?.productCommissionEarned || 0;
                      const tipBs = stInvolved?.tipBs || 0;
                      const tipUsd = stInvolved?.tip || 0;
                      
                      const totalEarningsBs = commBs + prodCommBs;
                      const totalEarningsUsd = commUsd + prodCommUsd;

                      // Identificación inteligente del método de pago real basada en montos reales
                      let methodText = 'Efectivo';
                      const cashUsdAmount = Number(t.metadata?.cash_usd) || 0;
                      const transferBsAmount = Number(t.metadata?.transfer_bs) || 0;

                      if (t.metadata?.mixed_payment || (cashUsdAmount > 0 && transferBsAmount > 0)) {
                        const usdPart = t.metadata?.method_usd || 'Efectivo';
                        const bsPart = t.metadata?.method_bs || 'Pago Móvil';
                        methodText = `Mixto (${usdPart} + ${bsPart})`;
                      } else if (transferBsAmount > 0 && cashUsdAmount === 0) {
                        methodText = t.metadata?.method_bs || 'Pago Móvil';
                      } else if (cashUsdAmount > 0 && transferBsAmount === 0) {
                        methodText = t.metadata?.method_usd || 'Efectivo';
                      } else {
                        const mUsd = t.metadata?.method_usd;
                        const mBs = t.metadata?.method_bs;
                        if (mUsd && mUsd !== 'N/A' && mUsd !== 'No aplica') {
                          methodText = mUsd;
                        } else if (mBs && mBs !== 'N/A' && mBs !== 'No aplica') {
                          methodText = mBs;
                        } else {
                          methodText = t.description.split(' - ')[2] || 'Efectivo';
                        }
                      }

                      return (
                        <div key={idx} style={{ 
                          background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 100%)', 
                          padding: '24px', 
                          borderRadius: '24px', 
                          border: '1px solid rgba(255,255,255,0.05)',
                          position: 'relative',
                          overflow: 'hidden',
                          marginBottom: '16px'
                        }}>
                          {/* Accent line */}
                          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: t.metadata?.didWash ? 'linear-gradient(to bottom, #007aff, #00c6ff)' : 'rgba(255,255,255,0.15)' }}></div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingLeft: '8px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: '900', fontSize: '18px', color: 'white', letterSpacing: '-0.5px' }}>{serviceName}</span>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '6px' }}>
                                <span style={{ color: 'var(--gold-primary)', fontWeight: '800' }}>{clientName}</span> <span style={{opacity: 0.5, margin: '0 4px'}}>•</span> Costo Total: <span style={{ color: 'white', fontWeight: '800' }}>${(commUsd / 0.4).toFixed(2)} USD</span> <span style={{opacity: 0.6}}>({(commBs / 0.4).toFixed(2)} Bs)</span>
                              </span>
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                              <div style={{ color: '#32d74b', fontWeight: '900', fontSize: '20px', letterSpacing: '-0.5px' }}>+{formatCurrency(totalEarningsBs, '')} Bs</div>
                              <div style={{ color: '#32d74b', opacity: 0.9, fontSize: '12px', fontWeight: '800', background: 'rgba(50, 215, 75, 0.15)', padding: '2px 8px', borderRadius: '12px', marginTop: '4px' }}>+${formatCurrency(totalEarningsUsd, '')} USD</div>
                            </div>
                          </div>
                          
                          {/* Desglose de ganancias reales del barbero */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '16px 0', padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '16px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.03)', boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.2)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Comisión Servicio:</span>
                              <span style={{ color: 'white', fontWeight: '800', fontFamily: 'monospace', fontSize: '13px' }}>${commUsd.toFixed(2)} USD <span style={{opacity: 0.5}}>({commBs.toFixed(2)} Bs)</span></span>
                            </div>
                            {prodCommUsd > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Comisión Productos:</span>
                                <span style={{ color: 'white', fontWeight: '800', fontFamily: 'monospace', fontSize: '13px' }}>${prodCommUsd.toFixed(2)} USD <span style={{opacity: 0.5}}>({prodCommBs.toFixed(2)} Bs)</span></span>
                              </div>
                            )}
                            {tipUsd > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#32d74b', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid rgba(50,215,75,0.2)' }}>
                                <span style={{ fontWeight: '800' }}>🍬 Propina:</span>
                                <span style={{ fontWeight: '800', fontFamily: 'monospace', fontSize: '13px' }}>+${tipUsd.toFixed(2)} USD <span style={{opacity: 0.7}}>(+{tipBs.toFixed(2)} Bs)</span></span>
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px', paddingLeft: '8px' }}>
                            <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.08)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontWeight: '700', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.5px' }}>
                              <span style={{opacity: 0.6}}>💳</span> {methodText.toUpperCase()}
                            </span>
                            {t.metadata?.didWash && (
                              <span style={{ fontSize: '11px', background: 'linear-gradient(45deg, rgba(0,122,255,0.15), rgba(0,198,255,0.15))', color: '#64d2ff', padding: '6px 12px', borderRadius: '8px', fontWeight: '800', border: '1px solid rgba(0,122,255,0.3)', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.5px' }}>
                                💧 LAVADO
                              </span>
                            )}
                          </div>

                          {(t.metadata?.extras?.length > 0 || t.metadata?.products_sold?.length > 0) && (
                            <div style={{ padding: '16px', background: 'rgba(212, 175, 55, 0.05)', borderRadius: '16px', marginBottom: '16px', border: '1px dashed rgba(212, 175, 55, 0.2)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <span style={{ color: 'var(--gold-primary)' }}>🛍️</span>
                                <div style={{ fontSize: '11px', color: 'var(--gold-primary)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Detalle de Venta</div>
                              </div>
                              {t.metadata?.extras?.map((ex, eidx) => (
                                <div key={eidx} style={{ fontSize: '12px', color: 'white', display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>• {ex.service_extras?.name || 'Extra'} <span style={{opacity:0.5, fontSize:'10px'}}>(Extra)</span></span>
                                  <span style={{ color: 'var(--gold-primary)', fontWeight: '800', fontFamily: 'monospace' }}>+${ex.price.toFixed(2)}</span>
                                </div>
                              ))}
                              {t.metadata?.products_sold?.map((p, pidx) => (
                                <div key={pidx} style={{ fontSize: '12px', color: 'white', display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>• {p.name} <span style={{color: 'var(--gold-primary)', opacity: 0.8}}>(x{p.quantity})</span></span>
                                  <span style={{ color: 'var(--gold-primary)', fontWeight: '800', fontFamily: 'monospace' }}>+${(p.price * p.quantity).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '16px', paddingLeft: '8px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{opacity:0.5}}>🕒</span> {t.created_at ? new Date(t.created_at).toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) : 'S/F'}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px', fontWeight: '600' }}>ID: {t.id.slice(0,8)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <button onClick={() => setPayrollDetail({ isOpen: false, staff: null, transactions: [] })} className="btn-gold" style={{ width: '100%', marginTop: '24px', padding: '14px', borderRadius: '12px', fontWeight: '800' }}>Cerrar</button>
              </div>
            </div>,
            document.body
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
