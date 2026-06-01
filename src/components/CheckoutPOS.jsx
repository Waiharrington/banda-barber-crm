import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Search, 
  ShoppingBag, 
  DollarSign, 
  RefreshCcw, 
  Plus, 
  Minus, 
  CheckCircle,
  CreditCard,
  History,
  TrendingUp,
  User,
  Scissors,
  Zap,
  Droplets,
  Edit3,
  XCircle
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import AstroSelect from './AstroSelect';
import AstroDialog from './AstroDialog';
import NewClientModal from './NewClientModal';
import { UserPlus } from 'lucide-react';

const CheckoutPOS = ({ isMobile, rates, onNavigate }) => {
  const { showToast, triggerConfetti, triggerRocket } = useNotifs();
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };
  const [pendingServices, setPendingServices] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [allExtras, setAllExtras] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selection State
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isDirectSale, setIsDirectSale] = useState(false);
  const [idSearch, setIdSearch] = useState('');
  const [directSaleIdSearch, setDirectSaleIdSearch] = useState('');
  const [directSaleSearchResults, setDirectSaleSearchResults] = useState([]);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  
  // Checkout Multi-State
  const [fixedRate, setFixedRate] = useState(rates?.usd || 0);
  const [tips, setTips] = useState([]); // Array of { id, staffId, amount }
  const [cart, setCart] = useState([]); // Sold products
  const [itemSalesAssociations, setItemSalesAssociations] = useState({}); // { itemId: staffId }
  const [paymentMode, setPaymentMode] = useState('full_bs'); // or 'mixed'
  const [cashUsd, setCashUsd] = useState(0);
  const [methodUsd, setMethodUsd] = useState('Efectivo');
  const [methodBs, setMethodBs] = useState('Pago Móvil');
  const [selectedWasherId, setSelectedWasherId] = useState('');
  const [washCount, setWashCount] = useState(0);
  const [bundledApps, setBundledApps] = useState([]);
  const [linkedApps, setLinkedApps] = useState([]);
  const [totalAppsInCheckout, setTotalAppsInCheckout] = useState([]);
  const [activeAppForBarberChange, setActiveAppForBarberChange] = useState(null);

  // Modal State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showBarberModal, setShowBarberModal] = useState(false);
  const [selectedServiceForBarber, setSelectedServiceForBarber] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog State
  const [dialog, setDialog] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null });
  const [editingExtraPriceId, setEditingExtraPriceId] = useState(null);
  const [isChangingBarber, setIsChangingBarber] = useState(false);

  const handleUpdateExtraPrice = async (extraId, newPrice) => {
    try {
      setLoading(true);
      await dataService.updateAppointmentExtraPrice(extraId, parseFloat(newPrice) || 0);
      showToast("Precio actualizado");
      await loadData();
      if (selectedApp) {
        const updatedApps = await dataService.getAppointmentsByState(['En Silla', 'Por Pagar', 'Agendado', 'En Lavado']);
        const updatedSelected = updatedApps.find(a => a.id === selectedApp.id);
        setSelectedApp(updatedSelected);
      }
    } catch (e) {
      showToast("Error al actualizar precio", "error");
    } finally {
      setLoading(false);
      setEditingExtraPriceId(null);
    }
  };

  useEffect(() => {
    loadData();
    if (rates?.usd) setFixedRate(rates.usd);
  }, [rates]);

  useEffect(() => {
    if (selectedApp) {
      const clientPendingApps = pendingServices.filter(
        app => app.client_id === selectedApp.client_id
      );
      
      const uniqueApps = [
        selectedApp, 
        ...clientPendingApps.filter(app => app.id !== selectedApp.id)
      ];
      setBundledApps(uniqueApps);
    } else {
      setBundledApps([]);
    }
  }, [selectedApp, pendingServices]);

  useEffect(() => {
    setLinkedApps([]);
  }, [selectedApp]);

  useEffect(() => {
    setTotalAppsInCheckout([...bundledApps, ...linkedApps]);
  }, [bundledApps, linkedApps]);

  useEffect(() => {
    if (totalAppsInCheckout.length > 0) {
      // 1. Merge products
      const mergedProducts = [];
      totalAppsInCheckout.forEach(app => {
        app.appointment_products?.forEach(ap => {
          const exists = mergedProducts.find(p => p.id === ap.inventory?.id);
          if (exists) {
            exists.quantity += ap.quantity;
            if (ap.id) exists.dbIds.push(ap.id);
          } else {
            mergedProducts.push({
              id: ap.inventory?.id,
              name: ap.inventory?.name,
              price: ap.price,
              quantity: ap.quantity,
              commission_pct: ap.inventory?.commission_pct,
              dbIds: ap.id ? [ap.id] : []
            });
          }
        });
      });
      setCart(mergedProducts);

      // 2. Initialize tips for all unique staff in the bundle
      const uniqueStaffIds = Array.from(new Set(totalAppsInCheckout.map(a => a.staff_id).filter(Boolean)));
      const initialTips = uniqueStaffIds.map((staffId, idx) => ({
        id: (Date.now() + idx).toString(),
        staffId: staffId,
        amount: 0,
        currency: 'USD'
      }));
      setTips(initialTips);

      // 3. Auto-detect washing count
      const washEligibleCount = totalAppsInCheckout.filter(app => 
        app.services?.included_items?.some(i => i.toLowerCase().includes('lavado')) || 
        app.appointment_extras?.some(e => e.service_extras?.name?.toLowerCase().includes('lavado'))
      ).length;
      setWashCount(washEligibleCount);
      
      // Check if there is already a washer associated in database
      const existingWasherRecord = totalAppsInCheckout
        .flatMap(a => a.appointment_staff || [])
        .find(as => as.staff?.role?.toLowerCase().includes('asistente'));

      let currentWasherId = '';
      if (existingWasherRecord) {
        setSelectedWasherId(existingWasherRecord.staff_id);
        currentWasherId = existingWasherRecord.staff_id;
      } else {
        // Default wash assistant selection (ONLY if exactly one is available)
        const washers = allStaff.filter(s => s.role?.toLowerCase().includes('asistente'));
        if (washers.length === 1) {
          setSelectedWasherId(washers[0].id);
          currentWasherId = washers[0].id;
        } else {
          setSelectedWasherId('');
        }
      }

      // 4. Initialize item sales associations intelligently
      const newAssociations = { ...itemSalesAssociations };
      let changed = false;

      totalAppsInCheckout.forEach(app => {
        // Products default association
        app.appointment_products?.forEach(ap => {
          const itemId = ap.inventory?.id;
          if (itemId && !newAssociations[itemId]) {
            newAssociations[itemId] = app.staff_id || '';
            changed = true;
          }
        });

        // Extras default association
        app.appointment_extras?.forEach(ex => {
          const itemId = ex.id;
          if (itemId && !newAssociations[itemId]) {
            const isWashExtra = ex.service_extras?.name?.toLowerCase().includes('lavado');
            if (isWashExtra && currentWasherId) {
              newAssociations[itemId] = currentWasherId;
            } else {
              newAssociations[itemId] = app.staff_id || '';
            }
            changed = true;
          }
        });
      });

      if (changed) {
        setItemSalesAssociations(newAssociations);
      }
    } else if (!isDirectSale) {
      setCart([]);
      setTips([]);
      setWashCount(0);
      setSelectedWasherId('');
      setItemSalesAssociations({});
    }
  }, [totalAppsInCheckout, isDirectSale, allStaff, itemSalesAssociations, selectedWasherId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [apps, inv, ext, cls, staff, srv] = await Promise.all([
        dataService.getAppointmentsByState(['En Silla', 'Por Pagar', 'Agendado', 'En Lavado']),
        dataService.getInventory(),
        dataService.getExtras(),
        dataService.getClients(),
        dataService.getStaff(),
        dataService.getServices()
      ]);
      
      const today = new Date().toISOString().split('T')[0];
      const filtered = apps.filter(a => 
        a.status !== 'Agendado' || 
        (a.scheduled_at?.startsWith(today) || a.created_at?.startsWith(today))
      );

      setPendingServices(filtered);
      setInventory(inv.filter(i => i.stock > 0 && i.category === 'Venta'));
      setAllExtras(ext?.filter(e => e.name !== 'SYSTEM_CONFIG_RATES') || []);
      setAllServices(srv || []);
      setAllClients(cls || []);
      setAllStaff(staff || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAppointment = async (id) => {
    try {
      setLoading(true);
      await dataService.updateAppointmentStatus(id, 'En Silla');
      showToast("¡Servicio iniciado! El cliente ya está en silla.");
      loadData();
    } catch (error) {
      showToast("Error al iniciar servicio", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleStartGroupAppointments = async (apps) => {
    try {
      setLoading(true);
      for (const app of apps) {
        await dataService.updateAppointmentStatus(app.id, 'En Silla');
      }
      showToast("¡Servicios iniciados! El cliente ya está en silla.");
      loadData();
    } catch (error) {
      showToast("Error al iniciar servicios", "error");
    } finally {
      setLoading(false);
    }
  };

  const servicePrice = totalAppsInCheckout.reduce((acc, app) => acc + (app.services?.price || 0), 0);
  const productsTotal = cart.reduce((acc, p) => acc + (p.price * p.quantity), 0);
  const extrasTotal = totalAppsInCheckout.reduce((acc, app) => acc + (app.appointment_extras?.reduce((subAcc, e) => subAcc + (e.price || 0), 0) || 0), 0);
  const totalTips = tips.reduce((acc, t) => {
    const isBs = t.currency === 'BS';
    const amountVal = Number(t.amount || 0);
    const usdVal = isBs ? (amountVal / fixedRate) : amountVal;
    return acc + usdVal;
  }, 0);
  const totalUsd = servicePrice + productsTotal + extrasTotal + totalTips;
  const totalBs = (totalUsd * fixedRate).toFixed(2);
  
  const remainingBs = Math.max(0, (totalUsd - Number(cashUsd)) * fixedRate).toFixed(2);

  const washEligibleCount = totalAppsInCheckout.filter(app => 
    app.services?.included_items?.some(i => i.toLowerCase().includes('lavado')) || 
    app.appointment_extras?.some(e => e.service_extras?.name?.toLowerCase().includes('lavado'))
  ).length;

  const didWash = washCount > 0;

  const handleAddToCart = async (product) => {
    if (!selectedApp) {
      const exists = cart.find(p => p.id === product.id);
      if (exists) {
        setCart(cart.map(p => p.id === product.id ? {...p, quantity: p.quantity + 1} : p));
      } else {
        setCart([...cart, {...product, quantity: 1}]);
      }
      showToast(`${product.name} añadido`);
      return;
    }

    try {
      setLoading(true);
      // Check if product already exists in selectedApp's products
      const existingProductRecord = selectedApp.appointment_products?.find(
        ap => ap.inventory?.id === product.id
      );

      if (existingProductRecord) {
        await dataService.updateAppointmentProductQuantity(
          existingProductRecord.id,
          (existingProductRecord.quantity || 0) + 1
        );
      } else {
        await dataService.addProductToAppointment(
          selectedApp.id,
          product.id,
          1,
          product.price
        );
      }

      showToast(`${product.name} añadido a la cuenta.`);
      await loadData();
      const updatedApps = await dataService.getAppointmentsByState(['En Silla', 'Por Pagar', 'Agendado', 'En Lavado']);
      const updatedSelected = updatedApps.find(a => a.id === selectedApp.id);
      setSelectedApp(updatedSelected);
    } catch (e) {
      console.error(e);
      showToast("Error al añadir producto", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveProduct = async (product) => {
    if (!selectedApp) {
      setCart(cart.filter(item => item.id !== product.id));
      showToast("Producto eliminado del carrito");
      return;
    }

    try {
      setLoading(true);
      if (product.dbIds && product.dbIds.length > 0) {
        for (const dbId of product.dbIds) {
          await dataService.removeProductFromAppointment(dbId);
        }
      }
      showToast(`${product.name} eliminado de la cuenta.`);
      await loadData();
      const updatedApps = await dataService.getAppointmentsByState(['En Silla', 'Por Pagar', 'Agendado', 'En Lavado']);
      const updatedSelected = updatedApps.find(a => a.id === selectedApp.id);
      setSelectedApp(updatedSelected);
    } catch (e) {
      console.error(e);
      showToast("Error al eliminar producto", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleIncrementProduct = async (product) => {
    if (!selectedApp) {
      setCart(cart.map(p => p.id === product.id ? {...p, quantity: p.quantity + 1} : p));
      return;
    }
    try {
      setLoading(true);
      if (product.dbIds && product.dbIds.length > 0) {
        const record = selectedApp.appointment_products?.find(ap => ap.id === product.dbIds[0]);
        if (record) {
          await dataService.updateAppointmentProductQuantity(record.id, (record.quantity || 0) + 1);
        }
      }
      await loadData();
      const updatedApps = await dataService.getAppointmentsByState(['En Silla', 'Por Pagar', 'Agendado', 'En Lavado']);
      const updatedSelected = updatedApps.find(a => a.id === selectedApp.id);
      setSelectedApp(updatedSelected);
    } catch (e) {
      console.error(e);
      showToast("Error al incrementar cantidad", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDecrementProduct = async (product) => {
    if (product.quantity <= 1) {
      handleRemoveProduct(product);
      return;
    }
    if (!selectedApp) {
      setCart(cart.map(p => p.id === product.id ? {...p, quantity: p.quantity - 1} : p));
      return;
    }
    try {
      setLoading(true);
      if (product.dbIds && product.dbIds.length > 0) {
        const record = selectedApp.appointment_products?.find(ap => ap.id === product.dbIds[0]);
        if (record) {
          await dataService.updateAppointmentProductQuantity(record.id, (record.quantity || 0) - 1);
        }
      }
      await loadData();
      const updatedApps = await dataService.getAppointmentsByState(['En Silla', 'Por Pagar', 'Agendado', 'En Lavado']);
      const updatedSelected = updatedApps.find(a => a.id === selectedApp.id);
      setSelectedApp(updatedSelected);
    } catch (e) {
      console.error(e);
      showToast("Error al disminuir cantidad", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddExtra = async (extra) => {
    if (!selectedApp) {
      setCart([...cart, { id: 'extra_' + extra.id, name: extra.name, price: extra.price, quantity: 1, type: 'extra' }]);
      showToast(`${extra.name} añadido al carrito`);
      setShowExtraModal(false);
      return;
    }
    try {
      setLoading(true);
      await dataService.addExtraToAppointment(selectedApp.id, extra.id, extra.price);
      showToast(`${extra.name} añadido a la cuenta.`);
      await loadData();
      const updatedApps = await dataService.getAppointmentsByState(['En Silla', 'Por Pagar', 'Agendado', 'En Lavado']);
      const updatedSelected = updatedApps.find(a => a.id === selectedApp.id);
      setSelectedApp(updatedSelected);
    } catch (e) {
      showToast("Error al añadir extra", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveExtra = async (extraId) => {
    try {
      setLoading(true);
      await dataService.removeExtraFromAppointment(extraId);
      showToast("Extra eliminado.");
      await loadData();
      const updatedApps = await dataService.getAppointmentsByState(['En Silla', 'Por Pagar', 'Agendado', 'En Lavado']);
      const updatedSelected = updatedApps.find(a => a.id === selectedApp.id);
      setSelectedApp(updatedSelected);
    } catch (e) {
      showToast("Error al eliminar extra", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkApp = (appId) => {
    setLinkedApps(linkedApps.filter(a => a.id !== appId));
    showToast("Cita desenlazada de la cuenta.");
  };

  const handleCancelOrder = () => {
    if (totalAppsInCheckout.length === 0) return;
    
    setDialog({
      isOpen: true,
      title: "Cancelar Orden",
      message: `¿Seguro que deseas cancelar toda la orden de este cliente? Se marcarán los servicios como 'Cancelado'.`,
      type: "confirm",
      onConfirm: async () => {
        setDialog(prev => ({ ...prev, isOpen: false }));
        try {
          setLoading(true);
          
          for (const app of totalAppsInCheckout) {
            await dataService.updateAppointmentStatus(app.id, 'Cancelado');
          }
          
          showToast("Orden cancelada correctamente", "success");
          setSelectedApp(null);
          setSelectedClient(null);
          await loadData();
        } catch (e) {
          console.error(e);
          showToast("Error al cancelar la orden", "error");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleProcessCheckout = async () => {
    if (!selectedApp && !selectedClient) {
      showToast("Selecciona un cliente para la venta directa", "warning");
      return;
    }
    if (!selectedApp && cart.length === 0) {
      showToast("Agrega al menos un producto al carrito", "warning");
      return;
    }

    try {
      setLoading(true);
      
      const paymentData = {
        appointmentId: selectedApp?.id || null,
        appointmentIds: totalAppsInCheckout.map(a => a.id),
        clientId: selectedApp?.client_id || selectedClient?.id,
        clientName: selectedApp?.clients?.name || selectedClient?.name,
        clientCedula: selectedApp?.clients?.id_card || selectedClient?.id_card,
        serviceName: totalAppsInCheckout.map(a => a.services?.name).filter(Boolean).join(' + ') || 'Venta de Productos',
        totalUsd: totalUsd,
        fixedRate: fixedRate,
        isMixed: paymentMode === 'mixed',
        cashUsd: Number(cashUsd),
        transferBs: Number(remainingBs),
        totalTips: totalTips,
        didWash: washCount > 0,
        washCount: washCount,
        extras: totalAppsInCheckout.flatMap(a => a.appointment_extras || []),
        appointments: totalAppsInCheckout.map(app => {
          const appExtrasTotal = app.appointment_extras?.reduce((sum, e) => sum + (e.price || 0), 0) || 0;
          const servicePrice = app.services?.price || 0;
          const includesWashing = app.services?.included_items?.some(i => i.toLowerCase().includes('lavado')) || false;
          return {
            id: app.id,
            clientName: app.clients?.name || 'Cliente',
            clientCedula: app.clients?.id_card || 'S/C',
            barberName: app.staff?.name || 'Barbero',
            serviceName: app.services?.name || 'Servicio',
            servicePrice: servicePrice,
            extrasPrice: appExtrasTotal,
            totalPrice: servicePrice + appExtrasTotal,
            didWash: includesWashing || (washCount > 0)
          };
        }),
        staffInvolved: (() => {
          const involved = [];
          const washer = allStaff.find(s => s.id === selectedWasherId);
          const washRate = washer ? Number(washer.washing_rate || 0) : 0;
          
          let appliedWashes = 0;
          totalAppsInCheckout.forEach(app => {
            if (!app.staff_id) return;
            const role = app.staff?.role;
            let price = app.services?.price || 0;
            let grossBase = price;

            const includesWashing = app.services?.included_items?.some(i => i.toLowerCase().includes('lavado'));
            if (includesWashing && appliedWashes < washCount && washRate > 0) {
              grossBase = Math.max(0, grossBase - washRate);
              appliedWashes++;
            }

            let pct = 40;
            if (role === 'Barbero') pct = app.services?.commission_barber ?? 40;
            else if (role === 'Asistente de Lavado') pct = app.services?.commission_washer ?? 10;
            else if (role === 'Caja') pct = app.services?.commission_cashier ?? 0;
            else if (role === 'Recepcionista') pct = app.services?.commission_receptionist ?? 0;
            else pct = app.staff?.commission_pct ?? 40;

            const comm = grossBase * (pct / 100);
            const tipVal = tips.filter(t => t.staffId === app.staff_id).reduce((acc, t) => {
              const isBs = t.currency === 'BS';
              const amountVal = Number(t.amount || 0);
              const usdVal = isBs ? (amountVal / fixedRate) : amountVal;
              return acc + usdVal;
            }, 0);

            const existing = involved.find(i => i.staffId === app.staff_id);
            if (existing) {
              existing.commissionEarned += comm;
              existing.commissionBs += comm * fixedRate;
            } else {
              involved.push({
                staffId: app.staff_id,
                name: app.staff?.name || 'Barbero',
                role: app.staff?.role || 'Barbero',
                commissionEarned: comm,
                commissionBs: comm * fixedRate,
                productCommissionEarned: 0,
                productCommissionBs: 0,
                tip: tipVal,
                tipBs: tipVal * fixedRate
              });
            }
          });

          if (washCount > 0 && selectedWasherId) {
            const washCommission = washCount * washRate;
            const existing = involved.find(i => i.staffId === selectedWasherId);
            if (existing) {
              existing.commissionEarned += washCommission;
              existing.commissionBs += washCommission * fixedRate;
            } else {
              const tipValW = tips.filter(t => t.staffId === selectedWasherId).reduce((acc, t) => {
                const isBs = t.currency === 'BS';
                const amountVal = Number(t.amount || 0);
                const usdVal = isBs ? (amountVal / fixedRate) : amountVal;
                return acc + usdVal;
              }, 0);
              involved.push({
                staffId: selectedWasherId,
                name: washer?.name || 'Asistente',
                role: washer?.role || 'Asistente de Lavado',
                commissionEarned: washCommission,
                commissionBs: washCommission * fixedRate,
                productCommissionEarned: 0,
                tip: tipValW,
                tipBs: tipValW * fixedRate
              });
            }
          }

          tips.forEach(t => {
            if (!t.staffId) return;
            const existing = involved.find(i => i.staffId === t.staffId);
            if (!existing) {
              const staffObj = allStaff.find(s => s.id === t.staffId);
              const isBs = t.currency === 'BS';
              const tipValT = isBs ? (Number(t.amount || 0) / fixedRate) : Number(t.amount || 0);
              involved.push({
                staffId: t.staffId,
                name: staffObj?.name || 'Staff',
                role: staffObj?.role || 'Barbero',
                commissionEarned: 0,
                productCommissionEarned: 0,
                tip: tipValT,
                tipBs: tipValT * fixedRate
              });
            }
          });


 
          // 5. Products Commission Assignment (10% standard product commission)
          cart.forEach(p => {
            const assignedStaffId = itemSalesAssociations[p.id];
            if (!assignedStaffId) return;
 
            const staffObj = allStaff.find(s => s.id === assignedStaffId);
            const commPct = typeof p.commission_pct === 'number' ? p.commission_pct : 10;
            const productComm = (p.price || 0) * (p.quantity || 1) * (commPct / 100);
 
            const existing = involved.find(i => i.staffId === assignedStaffId);
            if (existing) {
              existing.productCommissionEarned = (existing.productCommissionEarned || 0) + productComm;
              existing.productCommissionBs = (existing.productCommissionBs || 0) + (productComm * fixedRate);
            } else {
              involved.push({
                staffId: assignedStaffId,
                name: staffObj?.name || 'Staff',
                role: staffObj?.role || 'Staff',
                commissionEarned: 0,
                commissionBs: 0,
                productCommissionEarned: productComm,
                productCommissionBs: productComm * fixedRate,
                tip: 0,
                tipBs: 0
              });
            }
          });

          return involved;
        })(),
        products: cart,
        methodUsd: methodUsd,
        methodBs: methodBs
      };

      await dataService.processFinalPayment(paymentData);
      
      triggerRocket();
      showToast("¡Venta completada con éxito!", "success");
      
      setSelectedApp(null);
      setSelectedClient(null);
      setIsDirectSale(false);
      setCart([]);
      setTips([]);
      setCashUsd(0);
      setPaymentMode('full_bs');
      loadData();
    } catch (err) {
      console.error("Error en checkout:", err);
      showToast("Error al procesar pago", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSale = () => {
    setIsDirectSale(true);
    setSelectedApp(null);
    setSelectedClient(null);
    setDirectSaleIdSearch('');
    setCart([]);
    showToast("Venta Directa activada. Identifica al cliente si lo deseas.");
  };

  const handleAddService = (service) => {
    if (!selectedApp && !selectedClient) {
      showToast("Por favor, identifica al cliente primero en la barra superior.", "warning");
      return;
    }
    setSelectedServiceForBarber(service);
    setShowServiceModal(false);
    setShowBarberModal(true);
  };

  const handleConfirmServiceBarber = async (barberId) => {
    try {
      setLoading(true);
      setShowBarberModal(false);
      
      const clientId = selectedClient?.id || selectedApp?.client_id;
      if (!clientId) {
        showToast("Error: No hay cliente seleccionado", "error");
        return;
      }

      const newApp = await dataService.createAppointment({
        client_id: clientId,
        service_id: selectedServiceForBarber.id,
        staff_id: barberId,
        status: 'En Silla',
        total_price: selectedServiceForBarber.price
      });
      
      await loadData();
      const updatedApps = await dataService.getAppointmentsByState(['En Silla', 'Por Pagar', 'Agendado', 'En Lavado']);
      
      if (selectedApp) {
        const currentAppResel = updatedApps.find(a => a.id === selectedApp.id);
        if (currentAppResel) setSelectedApp(currentAppResel);
        showToast("Servicio añadido y barbero asignado.");
      } else {
        const fullyLoadedApp = updatedApps.find(a => a.id === newApp.id);
        if (fullyLoadedApp) {
          setIsDirectSale(false);
          setSelectedApp(fullyLoadedApp);
          showToast("Servicio añadido y barbero asignado.");
        } else {
          showToast("Cita creada. Selecciona el servicio en la lista.");
        }
      }
      setSelectedServiceForBarber(null);
    } catch (e) {
      console.error(e);
      showToast("Error al asignar barbero", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChangeBarber = () => {
    if (!selectedApp) return;
    setIsChangingBarber(true);
    setShowBarberModal(true);
  };

  const handleOpenChangeBundledBarber = (app) => {
    setActiveAppForBarberChange(app);
    setIsChangingBarber(true);
    setShowBarberModal(true);
  };

  const handleChangeBarber = async (barberId) => {
    const appToChange = activeAppForBarberChange || selectedApp;
    if (!appToChange) return;

    try {
      setLoading(true);
      setShowBarberModal(false);
      setIsChangingBarber(false);
      setActiveAppForBarberChange(null);
      
      await dataService.updateAppointment(appToChange.id, { staff_id: barberId });
      showToast("Barbero actualizado correctamente");
      await loadData();
      
      const updatedApps = await dataService.getAppointmentsByState(['En Silla', 'Por Pagar', 'Agendado', 'En Lavado']);
      const updatedSelected = updatedApps.find(a => a.id === selectedApp.id);
      setSelectedApp(updatedSelected);
    } catch (e) {
      console.error(e);
      showToast("Error al cambiar de barbero", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBundledService = (app) => {
    if (!app) return;
    
    setDialog({
      isOpen: true,
      title: "Eliminar Servicio",
      message: `¿Seguro que deseas eliminar el servicio "${app.services?.name}" de esta cita?`,
      type: "confirm",
      onConfirm: async () => {
        setDialog(prev => ({ ...prev, isOpen: false }));
        try {
          setLoading(true);
          
          await dataService.updateAppointment(app.id, { 
            service_id: null,
            total_price: Math.max(0, (app.total_price || 0) - (app.services?.price || 0))
          });
          
          showToast("Servicio eliminado de la cita.");
          await loadData();
          
          const updatedApps = await dataService.getAppointmentsByState(['En Silla', 'Por Pagar', 'Agendado', 'En Lavado']);
          const currentAppResel = updatedApps.find(a => a.id === selectedApp.id);
          if (currentAppResel) {
            setSelectedApp(currentAppResel);
          } else {
            const nextApp = updatedApps.find(a => a.client_id === selectedApp.client_id);
            if (nextApp) {
              setSelectedApp(nextApp);
            } else {
              setSelectedApp(null);
            }
          }
        } catch (e) {
          console.error(e);
          showToast("Error al eliminar el servicio", "error");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleDirectSaleSearchInput = (val) => {
    setDirectSaleIdSearch(val);
    if (val.length >= 2) {
      const term = val.toLowerCase();
      const results = allClients.filter(c => 
        (c.id_card && c.id_card.toLowerCase().includes(term)) || 
        (c.name && c.name.toLowerCase().includes(term))
      );
      setDirectSaleSearchResults(results.slice(0, 5));
    } else {
      setDirectSaleSearchResults([]);
    }
  };

  const handleSelectDirectSaleClient = (client) => {
    setSelectedClient(client);
    setDirectSaleIdSearch('');
    setDirectSaleSearchResults([]);
    showToast(`Cliente enlazado: ${client.name}`);
  };

  const handleDirectSaleIdSearch = () => {
    if (directSaleSearchResults.length === 1) {
      handleSelectDirectSaleClient(directSaleSearchResults[0]);
    } else {
      const exact = allClients.find(c => c.id_card === directSaleIdSearch || c.name.toLowerCase() === directSaleIdSearch.toLowerCase());
      if (exact) {
        handleSelectDirectSaleClient(exact);
      } else if (directSaleSearchResults.length > 1) {
        showToast("Múltiples coincidencias. Selecciona uno de la lista.", "info");
      } else {
        showToast("Cliente no encontrado. ¿Es un cliente nuevo?", "warning");
      }
    }
  };

  const handleNewClientSuccess = (newClient) => {
    setAllClients([...allClients, newClient]);
    setSelectedClient(newClient);
    setShowNewClientModal(false);
    showToast(`¡Cliente ${newClient.name} registrado y enlazado!`);
  };

  // Group active services (status !== 'Agendado') by client
  const activeServices = pendingServices.filter(a => a.status !== 'Agendado');
  const groupedActiveServices = [];
  activeServices.forEach(app => {
    const existing = groupedActiveServices.find(g => g.client_id === app.client_id);
    if (existing) {
      existing.apps.push(app);
    } else {
      groupedActiveServices.push({
        client_id: app.client_id,
        client_name: app.clients?.name || 'Cliente',
        status: app.status,
        apps: [app]
      });
    }
  });

  // Group scheduled services (status === 'Agendado') by client
  const scheduledServices = pendingServices.filter(a => a.status === 'Agendado');
  const groupedScheduledServices = [];
  scheduledServices.forEach(app => {
    const existing = groupedScheduledServices.find(g => g.client_id === app.client_id);
    if (existing) {
      existing.apps.push(app);
    } else {
      groupedScheduledServices.push({
        client_id: app.client_id,
        client_name: app.clients?.name || 'Cliente',
        apps: [app]
      });
    }
  });

  if (!rates?.usd && !loading) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
        <RefreshCcw className="animate-spin" style={{ marginBottom: '20px' }} />
        <p>Sincronizando tasa de cambio oficial...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '900' }}>Caja <span className="text-gold">Astro Pro</span></h1>
        <p style={{ color: 'var(--text-secondary)' }}>Liquidación de servicios y venta de productos.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.5fr', gap: '32px', alignItems: 'start' }}>
        
        <section>
          <div className="glass-card" style={{ marginBottom: '32px', borderRadius: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <History size={20} color="var(--gold-primary)" />
                <span style={{ fontWeight: '800', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' }}>Cola de Cobro</span>
              </div>
              <button 
                className="btn-gold" 
                onClick={handleManualSale}
                style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '10px' }}
              >
                <Plus size={14} /> VENTA DIRECTA
              </button>
            </div>

            <div style={{ position: 'relative', marginBottom: '24px' }}>
              <Search style={{ position: 'absolute', left: '16px', top: '14px' }} size={18} color="var(--gold-primary)" />
              <input 
                type="text" 
                placeholder="Buscar por Cédula o Nombre..." 
                value={idSearch}
                onChange={(e) => {
                  const val = e.target.value;
                  setIdSearch(val);
                  
                  const activeMatch = pendingServices.find(app => app.status !== 'Agendado' && app.clients?.id_card === val);
                  if (activeMatch) {
                    setSelectedApp(activeMatch);
                    return;
                  }

                  const scheduledMatch = pendingServices.find(app => app.status === 'Agendado' && app.clients?.id_card === val);
                  if (scheduledMatch) {
                    setDialog({
                      isOpen: true,
                      type: 'confirm',
                      title: 'Cita Encontrada',
                      message: `El cliente ${scheduledMatch.clients?.name} tiene una cita agendada para hoy. ¿Deseas iniciar su servicio ahora?`,
                      onConfirm: () => {
                        const clientApps = pendingServices.filter(app => app.client_id === scheduledMatch.client_id && app.status === 'Agendado');
                        handleStartGroupAppointments(clientApps);
                        setDialog({ ...dialog, isOpen: false });
                        setIdSearch('');
                      }
                    });
                  }
                }}
                style={{ width: '100%', paddingLeft: '48px', backgroundColor: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)', height: '48px', borderRadius: '14px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <TrendingUp size={16} color="var(--text-muted)" />
              <span style={{ fontWeight: '800', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Lista de Espera por Cobrar</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {groupedActiveServices.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay clientes por cobrar.</div>
              ) : (
                groupedActiveServices.map(group => {
                  const isSelected = selectedApp?.client_id === group.client_id;
                  const badgeStatus = group.apps.some(a => a.status === 'En Silla') ? 'En Silla' : (group.apps.some(a => a.status === 'En Lavado') ? 'En Lavado' : 'Por Pagar');
                  const serviceNames = group.apps.map(a => a.services?.name).filter(Boolean).join(' + ') || 'Venta de Productos';
                  const staffNames = Array.from(new Set(group.apps.map(a => a.staff?.name?.split(' ')[0]).filter(Boolean))).join(', ') || 'Caja';
                  const totalUsd = group.apps.reduce((acc, a) => acc + (a.services?.price || a.total_price || 0), 0);
                  
                  return (
                    <div 
                      key={group.client_id} 
                      onClick={() => setSelectedApp(group.apps[0])}
                      style={{ 
                        padding: '16px', 
                        borderRadius: '16px', 
                        border: isSelected ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)',
                        background: isSelected ? 'rgba(212,175,55,0.05)' : 'rgba(255,255,255,0.02)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '800' }}>{group.client_name}</span>
                        <span style={{ 
                          fontSize: '10px', 
                          backgroundColor: badgeStatus === 'En Silla' ? 'var(--gold-primary)' : (badgeStatus === 'En Lavado' ? 'rgba(0,122,255,0.15)' : '#4caf50'), 
                          color: badgeStatus === 'En Silla' ? 'black' : (badgeStatus === 'En Lavado' ? '#007aff' : 'white'), 
                          border: badgeStatus === 'En Lavado' ? '1px solid rgba(0,122,255,0.3)' : 'none',
                          padding: '2px 8px', 
                          borderRadius: '10px', 
                          fontWeight: '900' 
                        }}>{badgeStatus}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <Scissors size={12} /> {serviceNames} • <span style={{ fontWeight: '600' }}>{staffNames}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          <span style={{ fontWeight: '700', color: 'var(--gold-primary)' }}>{(totalUsd * fixedRate).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Bs.</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Ref: ${totalUsd}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ marginTop: '24px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '16px', letterSpacing: '1px' }}>PRÓXIMAS CITAS (AGENDA HOY)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {groupedScheduledServices.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.1)', fontSize: '12px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px' }}>No hay más citas para hoy</div>
                ) : (
                  groupedScheduledServices.map(group => {
                    const firstApp = group.apps[0];
                    const serviceNames = group.apps.map(a => a.services?.name).filter(Boolean).join(' + ') || 'Venta de Productos';
                    const staffNames = Array.from(new Set(group.apps.map(a => a.staff?.name?.split(' ')[0]).filter(Boolean))).join(', ') || 'Caja';
                    const timeString = new Date(firstApp.scheduled_at || firstApp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    
                    return (
                      <div 
                        key={group.client_id} 
                        style={{ 
                          padding: '16px', 
                          borderRadius: '16px', 
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.03)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ maxWidth: '70%' }}>
                          <div style={{ fontWeight: '800', fontSize: '14px' }}>{group.client_name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {timeString} • {serviceNames} • {staffNames}
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            handleStartGroupAppointments(group.apps);
                            triggerRocket();
                          }}
                          className="btn-gold"
                          style={{ padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '900' }}
                        >
                          Iniciar
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {(selectedApp || isDirectSale) && (
            <div className="glass-card animate-slide-up" style={{ borderRadius: '24px', display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowProductModal(true)}
                style={{ flex: 1, padding: '24px', borderRadius: '20px', border: '1px solid rgba(212,175,55,0.3)', background: 'rgba(212,175,55,0.05)', color: 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
                className="hover-item"
              >
                <div style={{ background: 'var(--gold-primary)', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black' }}>
                  <ShoppingBag size={24} />
                </div>
                <div style={{ fontWeight: '900', fontSize: '12px', letterSpacing: '1px' }}>PRODUCTOS</div>
              </button>

              <button 
                onClick={() => setShowExtraModal(true)}
                style={{ flex: 1, padding: '24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)', color: 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
                className="hover-item"
              >
                <div style={{ background: 'rgba(255,255,255,0.1)', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <Zap size={24} />
                </div>
                <div style={{ fontWeight: '900', fontSize: '12px', letterSpacing: '1px' }}>EXTRAS</div>
              </button>

              <button 
                onClick={() => setShowServiceModal(true)}
                style={{ flex: 1, padding: '24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)', color: 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
                className="hover-item"
              >
                <div style={{ background: 'rgba(255,255,255,0.1)', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <Scissors size={24} />
                </div>
                <div style={{ fontWeight: '900', fontSize: '12px', letterSpacing: '1px' }}>SERVICIOS</div>
              </button>
            </div>
          )}
        </section>

        <section>
          {(!selectedApp && !isDirectSale) ? (
            <div className="glass-card" style={{ height: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', borderRadius: '24px', color: 'var(--text-muted)' }}>
              <CreditCard size={48} style={{ marginBottom: '20px', opacity: 0.2 }} />
              <h3>Selecciona un cliente de la lista para cobrar</h3>
            </div>
          ) : (
            <div className="glass-card animate-scale-in" style={{ borderRadius: '32px', padding: '32px', border: '1.5px solid rgba(212,175,55,0.3)', background: 'linear-gradient(135deg, var(--bg-secondary) 0%, rgba(28,28,30,1) 100%)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
                <div>
                  <h3 style={{ fontSize: '24px', fontWeight: '900' }}>{selectedApp ? 'Resumen de Cobro' : 'Venta Directa'}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                    {selectedApp ? (
                      <>
                        {selectedApp.clients.name} 
                        {bundledApps.length > 0 && bundledApps.map(a => a.services?.name).filter(Boolean).length > 0 ? (
                          ` • ${bundledApps.map(a => a.services?.name).filter(Boolean).join(' + ')}`
                        ) : ''}
                      </>
                    ) : (
                      <>
                        {selectedClient ? (
                          <div className="animate-scale-in" style={{ padding: '12px 16px', background: 'rgba(212,175,55,0.1)', borderRadius: '12px', border: '1px solid rgba(212,175,55,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: '800', fontSize: '16px' }}>{selectedClient.name}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>V-{selectedClient.id_card}</div>
                            </div>
                            <button onClick={() => setSelectedClient(null)} style={{ background: 'none', border: 'none', color: '#ff453a', fontWeight: '800', cursor: 'pointer', fontSize: '11px' }}>CAMBIAR</button>
                          </div>
                        ) : (
                          <div style={{ position: 'relative' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <div style={{ position: 'relative', flex: 1 }}>
                                <Search style={{ position: 'absolute', left: '12px', top: '12px' }} size={16} color="var(--text-muted)" />
                                <input 
                                  type="text" 
                                  placeholder="Cédula o nombre del cliente..." 
                                  value={directSaleIdSearch}
                                  onChange={(e) => handleDirectSaleSearchInput(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleDirectSaleIdSearch()}
                                  style={{ width: '100%', paddingLeft: '40px', height: '40px', fontSize: '13px' }}
                                />
                              </div>
                              <button onClick={handleDirectSaleIdSearch} className="btn-gold" style={{ padding: '0 12px', height: '40px' }}>ENLAZAR</button>
                              <button 
                                onClick={() => setShowNewClientModal(true)} 
                                style={{ padding: '0 12px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                              >
                                <UserPlus size={16} />
                              </button>
                            </div>
                            
                            {/* Autocomplete Dropdown */}
                            {directSaleSearchResults.length > 0 && (
                              <div className="animate-scale-in" style={{ 
                                position: 'absolute', top: '100%', left: 0, right: '110px', 
                                marginTop: '8px', background: 'rgba(28,28,30,0.95)', 
                                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', 
                                overflow: 'hidden', zIndex: 10, backdropFilter: 'blur(10px)',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                              }}>
                                {directSaleSearchResults.map(c => (
                                  <div 
                                    key={c.id} 
                                    onClick={() => handleSelectDirectSaleClient(c)}
                                    style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(212,175,55,0.1)'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                  >
                                    <span style={{ fontWeight: '700', fontSize: '13px', color: 'white' }}>{c.name}</span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>V-{c.id_card}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '900' }}>TASA MANUAL ($)</label>
                  <input 
                    type="number" 
                    value={fixedRate} 
                    onChange={(e) => setFixedRate(e.target.value)}
                    style={{ width: '100px', textAlign: 'right', fontWeight: '900', color: 'var(--gold-primary)', background: 'none', border: '1px solid rgba(212,175,55,0.3)', marginLeft: '10px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '8px' : '12px', marginBottom: '24px', padding: isMobile ? '12px 10px' : '20px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '16px' }}>
                {totalAppsInCheckout.map(app => {
                  const sPrice = app.services?.price || 0;
                  const isLinked = app.client_id !== selectedApp?.client_id;
                  return (
                    <div key={app.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: isMobile ? '11px' : '13px', flex: 1, minWidth: 0 }}>
                        {isLinked ? (
                          <button 
                            onClick={() => handleUnlinkApp(app.id)} 
                            style={{ background: 'none', border: 'none', color: '#ff9500', cursor: 'pointer', fontWeight: '800', fontSize: '9px', padding: '2px', marginRight: '2px', flexShrink: 0 }}
                            title="Desenlazar cita"
                          >
                            [Unlink]
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleRemoveBundledService(app)} 
                            style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', padding: '2px', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
                            title={app.services ? "Eliminar servicio" : "Eliminar extras"}
                          >
                            <XCircle size={isMobile ? 12 : 14} style={{ opacity: 0.8 }} />
                          </button>
                        )}
                        {isLinked && <span style={{ color: 'var(--gold-primary)', fontWeight: '800', fontSize: '10px', flexShrink: 0 }}>({app.clients?.name?.split(' ')[0]}):</span>}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.9)' }}>
                          {app.services ? `Servicio: ${app.services.name}` : 'Extras'}
                        </span>
                        {' • '}
                        <span 
                          onClick={() => handleOpenChangeBundledBarber(app)}
                          style={{ 
                            color: 'var(--gold-primary)', 
                            fontWeight: '700', 
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '1px',
                            fontSize: '10px',
                            flexShrink: 0
                          }}
                          title="Click para cambiar barbero"
                        >
                          {app.staff?.name?.split(' ')[0] || 'Caja'}
                          <Edit3 size={8} />
                        </span>
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0px', flexShrink: 0 }}>
                        {app.services ? (
                          <>
                            <span style={{ fontWeight: '800', fontSize: isMobile ? '12px' : '14px', color: 'white' }}>
                              {isMobile ? `${Math.round(sPrice * fixedRate).toLocaleString('es-VE')} Bs.` : `${(sPrice * fixedRate).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Bs.`}
                            </span>
                            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Ref: ${sPrice}</span>
                          </>
                        ) : (
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Monto en extras</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {selectedApp && (
                  <button 
                    onClick={() => setShowLinkModal(true)}
                    style={{ 
                      width: '100%', 
                      padding: '8px', 
                      borderRadius: '10px', 
                      border: '1px dashed var(--gold-primary)', 
                      background: 'rgba(212,175,55,0.05)', 
                      color: 'var(--gold-primary)', 
                      fontWeight: '800', 
                      fontSize: '10px', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      marginTop: '2px',
                      marginBottom: '4px'
                    }}
                  >
                    🔗 ENLAZAR OTRAS CITAS (PAGO GRUPAL)
                  </button>
                )}
                 {cart.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: isMobile ? '11px' : '13px', flex: 1, minWidth: 0 }}>
                      <button onClick={() => handleRemoveProduct(p)} style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', padding: '2px', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                        <XCircle size={isMobile ? 12 : 14} style={{ opacity: 0.8 }} />
                      </button>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.9)' }}>{p.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(255,255,255,0.05)', padding: '1px 4px', borderRadius: '4px', flexShrink: 0 }}>
                        <button 
                          onClick={() => handleDecrementProduct(p)}
                          style={{ background: 'none', border: 'none', color: 'var(--gold-primary)', cursor: 'pointer', padding: '1px', display: 'flex', alignItems: 'center' }}
                        >
                          <Minus size={8} />
                        </button>
                        <span style={{ fontSize: '9px', fontWeight: '900', color: 'white', minWidth: '10px', textAlign: 'center' }}>{p.quantity}</span>
                        <button 
                          onClick={() => handleIncrementProduct(p)}
                          style={{ background: 'none', border: 'none', color: 'var(--gold-primary)', cursor: 'pointer', padding: '1px', display: 'flex', alignItems: 'center' }}
                        >
                          <Plus size={8} />
                        </button>
                      </div>
                      
                      {/* Staff Selector for Product Sale */}
                      <select
                        value={itemSalesAssociations[p.id] || ''}
                        onChange={(e) => setItemSalesAssociations({ ...itemSalesAssociations, [p.id]: e.target.value })}
                        style={{
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          MozAppearance: 'none',
                          background: 'rgba(212, 175, 55, 0.08)',
                          border: '1px solid rgba(212, 175, 55, 0.3)',
                          color: 'var(--gold-primary)',
                          fontSize: '9px',
                          fontWeight: '800',
                          borderRadius: '12px',
                          padding: '1px 6px',
                          height: '16px',
                          lineHeight: '14px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          outline: 'none',
                          maxWidth: '75px',
                          flexShrink: 0,
                          transition: 'all 0.2s',
                          marginLeft: '8px'
                        }}
                      >
                        <option value="" style={{ background: '#1c1c1e', color: 'white' }}>+ Vendedor</option>
                        {allStaff.map(s => (
                          <option key={s.id} value={s.id} style={{ background: '#1c1c1e', color: 'white' }}>
                            {s.name?.split(' ')[0]}
                          </option>
                        ))}
                      </select>
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0px', flexShrink: 0 }}>
                      <span style={{ fontWeight: '800', fontSize: isMobile ? '12px' : '14px', color: 'white' }}>
                        {isMobile ? `${Math.round(p.price * p.quantity * fixedRate).toLocaleString('es-VE')} Bs.` : `${(p.price * p.quantity * fixedRate).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Bs.`}
                      </span>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Ref: ${(p.price * p.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
 
                {totalAppsInCheckout.flatMap(app => 
                  app.appointment_extras?.map(extra => ({
                    ...extra,
                    appId: app.id
                  })) || []
                ).map(extra => (
                  <div key={extra.id} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--gold-primary)', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: isMobile ? '11px' : '13px', flex: 1, minWidth: 0 }}>
                      <button onClick={() => handleRemoveExtra(extra.id)} style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', padding: '2px', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                        <XCircle size={isMobile ? 12 : 14} style={{ opacity: 0.8 }} />
                      </button>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--gold-primary)' }}>{extra.service_extras?.name}</span>
                      
                      {/* Staff Selector for Extra */}
                      <select
                        value={itemSalesAssociations[extra.id] || ''}
                        onChange={(e) => setItemSalesAssociations({ ...itemSalesAssociations, [extra.id]: e.target.value })}
                        style={{
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          MozAppearance: 'none',
                          background: 'rgba(212, 175, 55, 0.08)',
                          border: '1px solid rgba(212, 175, 55, 0.3)',
                          color: 'var(--gold-primary)',
                          fontSize: '9px',
                          fontWeight: '800',
                          borderRadius: '12px',
                          padding: '1px 6px',
                          height: '16px',
                          lineHeight: '14px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          outline: 'none',
                          maxWidth: '75px',
                          flexShrink: 0,
                          transition: 'all 0.2s',
                          marginLeft: '8px'
                        }}
                      >
                        <option value="" style={{ background: '#1c1c1e', color: 'white' }}>+ Asignar</option>
                        {allStaff.map(s => (
                          <option key={s.id} value={s.id} style={{ background: '#1c1c1e', color: 'white' }}>
                            {s.name?.split(' ')[0]}
                          </option>
                        ))}
                      </select>
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                      {editingExtraPriceId === extra.id ? (
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <span style={{ position: 'absolute', left: '4px', fontSize: '8px', color: 'var(--gold-primary)', fontWeight: '800' }}>$</span>
                          <input 
                            type="number"
                            autoFocus
                            defaultValue={extra.price}
                            onBlur={(e) => handleUpdateExtraPrice(extra.id, e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateExtraPrice(extra.id, e.target.value)}
                            style={{ width: '40px', height: '18px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--gold-primary)', borderRadius: '3px', color: 'white', paddingLeft: '10px', fontSize: '9px', fontWeight: '800', textAlign: 'right' }}
                          />
                        </div>
                      ) : (
                        <div 
                          onClick={() => setEditingExtraPriceId(extra.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer', padding: '1px 3px', borderRadius: '3px', transition: 'all 0.2s' }}
                          onMouseOver={(ev) => ev.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                          onMouseOut={(ev) => ev.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0px' }}>
                            <span style={{ fontWeight: '800', fontSize: isMobile ? '12px' : '14px' }}>
                              {isMobile ? `${Math.round(extra.price * fixedRate).toLocaleString('es-VE')} Bs.` : `${(extra.price * fixedRate).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Bs.`}
                            </span>
                            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Ref: ${extra.price}</span>
                          </div>
                          <Edit3 size={7} color="var(--gold-primary)" style={{ opacity: 0.6 }} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Washing Section */}
                {washEligibleCount > 0 && (
                  <div className="glass-card animate-slide-up" style={{ padding: isMobile ? '12px 14px' : '24px', borderRadius: '16px', marginBottom: isMobile ? '16px' : '24px', border: '1px solid rgba(10,132,255,0.15)', background: 'rgba(10,132,255,0.02)' }}>
                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: '8px', marginBottom: isMobile ? '10px' : '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: isMobile ? '30px' : '40px', height: isMobile ? '30px' : '40px', borderRadius: '8px', background: 'rgba(10,132,255,0.1)', color: '#0a84ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Droplets size={isMobile ? 16 : 20} />
                        </div>
                        <div>
                          <h4 style={{ fontSize: isMobile ? '12px' : '15px', fontWeight: '800', color: 'white', margin: 0 }}>Lavados de Cabello</h4>
                          <p style={{ fontSize: isMobile ? '9px' : '11px', color: 'var(--text-secondary)', margin: 0 }}>Selecciona la cantidad de lavados.</p>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '6px', width: isMobile ? '100%' : 'auto' }}>
                        {Array.from({ length: washEligibleCount + 1 }).map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setWashCount(idx)}
                            style={{
                              padding: isMobile ? '4px 8px' : '8px 16px',
                              borderRadius: '8px',
                              border: 'none',
                              backgroundColor: washCount === idx ? '#0a84ff' : 'rgba(255,255,255,0.05)',
                              color: washCount === idx ? 'white' : 'var(--text-muted)',
                              fontWeight: '900',
                              fontSize: isMobile ? '10px' : '12px',
                              cursor: 'pointer',
                              transition: '0.2s',
                              flex: isMobile ? 1 : 'none'
                            }}
                          >
                            {idx} {idx === 1 ? 'lavado' : 'lavados'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {washCount > 0 && (
                      <div className="animate-fade-in">
                        <select 
                          value={selectedWasherId}
                          onChange={e => setSelectedWasherId(e.target.value)}
                          style={{ width: '100%', padding: isMobile ? '8px 10px' : '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: isMobile ? '11px' : '13px' }}
                        >
                          <option value="">Seleccionar Asistente de Lavado</option>
                          {allStaff
                            .filter(s => s.role?.toLowerCase().includes('asistente'))
                            .map(s => {
                              return (
                                <option key={s.id} value={s.id}>
                                  {s.name} (${s.washing_rate || 0}/wash) - Disponible
                                </option>
                              );
                            })
                          }
                        </select>
                        {allStaff.filter(s => s.role?.toLowerCase().includes('asistente')).length > 1 && !selectedWasherId && (
                          <div style={{ marginTop: '6px', fontSize: '9px', color: '#ff9500', fontWeight: '800' }}>
                            ⚠️ Hay múltiples asistentes. Por favor selecciona una.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Dynamic Tips Section */}
                <div style={{ paddingTop: '10px', borderTop: '1px dashed rgba(255,255,255,0.1)', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                      <TrendingUp size={14} color="var(--gold-primary)" /> PROPINAS
                    </span>
                    <button 
                      onClick={() => setTips([...tips, { id: Date.now().toString(), staffId: allStaff[0]?.id || '', amount: 0, currency: 'USD' }])}
                      style={{ background: 'rgba(212,175,55,0.1)', border: 'none', color: 'var(--gold-primary)', borderRadius: '8px', padding: '4px 8px', fontSize: '10px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Plus size={12} /> AGREGAR PROPINA
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {tips.map((t, idx) => (
                      <div key={t.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }} className="animate-fade-in">
                        <select 
                          value={t.staffId} 
                          onChange={(e) => {
                            const newTips = [...tips];
                            newTips[idx].staffId = e.target.value;
                            setTips(newTips);
                          }}
                          style={{ flex: 1, height: '36px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0 8px' }}
                        >
                          <option value="" disabled>Seleccionar Integrante</option>
                          {allStaff.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                        
                        {/* Currency Selector (USD/BS Toggle) */}
                        <button
                          type="button"
                          onClick={() => {
                            const newTips = [...tips];
                            newTips[idx].currency = newTips[idx].currency === 'BS' ? 'USD' : 'BS';
                            setTips(newTips);
                          }}
                          style={{ 
                            width: '44px', 
                            height: '36px', 
                            background: t.currency === 'BS' ? 'rgba(255,255,255,0.05)' : 'rgba(212,175,55,0.15)', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            borderRadius: '10px', 
                            color: t.currency === 'BS' ? '#ffffff' : 'var(--gold-primary)', 
                            fontWeight: '900', 
                            fontSize: '11px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {t.currency === 'BS' ? 'Bs' : '$'}
                        </button>
                        
                        <div style={{ position: 'relative', width: '80px' }}>
                          <input 
                            type="number" 
                            placeholder="0"
                            value={t.amount || ''} 
                            onChange={(e) => {
                              const newTips = [...tips];
                              newTips[idx].amount = parseFloat(e.target.value) || 0;
                              setTips(newTips);
                            }}
                            style={{ width: '100%', height: '36px', textAlign: 'right', background: 'rgba(212,175,55,0.1)', border: 'none', borderRadius: '10px', color: 'var(--gold-primary)', fontWeight: '800', paddingRight: '12px' }} 
                          />
                        </div>
                        <button 
                          onClick={() => setTips(tips.filter(item => item.id !== t.id))}
                          style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', padding: '4px' }}
                        >
                          <Minus size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '12px' }}>
                  <span style={{ fontSize: isMobile ? '13px' : '16px', fontWeight: '900' }}>TOTAL A PAGAR</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: '950', color: 'var(--gold-primary)' }}>{formatCurrency(totalBs)} Bs.</div>
                    <div style={{ fontSize: isMobile ? '11px' : '13px', color: 'var(--text-muted)' }}>Ref: ${formatCurrency(totalUsd)}</div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <button 
                    onClick={() => { setPaymentMode('full_usd'); setCashUsd(totalUsd); }}
                    style={{ flex: 1, height: '38px', borderRadius: '10px', border: paymentMode === 'full_usd' ? '2px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.1)', background: paymentMode === 'full_usd' ? 'rgba(212,175,55,0.1)' : 'none', color: paymentMode === 'full_usd' ? 'var(--gold-primary)' : 'white', fontWeight: '800', cursor: 'pointer', fontSize: '9px' }}
                  >TODO EN $</button>
                  <button 
                    onClick={() => { setPaymentMode('full_bs'); setCashUsd(0); }}
                    style={{ flex: 1, height: '38px', borderRadius: '10px', border: paymentMode === 'full_bs' ? '2px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.1)', background: paymentMode === 'full_bs' ? 'rgba(212,175,55,0.1)' : 'none', color: paymentMode === 'full_bs' ? 'var(--gold-primary)' : 'white', fontWeight: '800', cursor: 'pointer', fontSize: '9px' }}
                  >TODO EN BS</button>
                  <button 
                    onClick={() => setPaymentMode('mixed')}
                    style={{ flex: 1, height: '38px', borderRadius: '10px', border: paymentMode === 'mixed' ? '2px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.1)', background: paymentMode === 'mixed' ? 'rgba(212,175,55,0.1)' : 'none', color: paymentMode === 'mixed' ? 'var(--gold-primary)' : 'white', fontWeight: '800', cursor: 'pointer', fontSize: '9px' }}
                  >PAGO MIXTO</button>
                </div>

                {paymentMode === 'full_usd' && (
                  <div className="animate-slide-up" style={{ padding: '16px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '16px', marginBottom: '12px' }}>
                    <label style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>MÉTODO DE PAGO ($)</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {['Efectivo', 'Zelle', 'Binance', 'Zinli'].map(m => (
                        <button 
                          key={m}
                          onClick={() => setMethodUsd(m)}
                          style={{ flex: 1, padding: '8px', borderRadius: '10px', border: methodUsd === m ? '1.5px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)', background: methodUsd === m ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.02)', color: methodUsd === m ? 'var(--gold-primary)' : 'white', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}
                        >{m}</button>
                      ))}
                    </div>
                  </div>
                )}

                {paymentMode === 'full_bs' && (
                  <div className="animate-slide-up" style={{ padding: '16px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '16px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>TOTAL EN BOLÍVARES (BS)</label>
                      <div style={{ fontWeight: '900', color: 'var(--gold-primary)', fontSize: '16px' }}>{formatCurrency(totalBs)} BS</div>
                    </div>
                    <label style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>MÉTODO DE PAGO (BS)</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {['Pago Móvil', 'Efectivo', 'Transferencia'].map(m => (
                        <button 
                          key={m}
                          onClick={() => setMethodBs(m)}
                          style={{ flex: 1, padding: '8px', borderRadius: '10px', border: methodBs === m ? '1.5px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)', background: methodBs === m ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.02)', color: methodBs === m ? 'var(--gold-primary)' : 'white', fontSize: '9px', fontWeight: '700', cursor: 'pointer' }}
                        >{m}</button>
                      ))}
                    </div>
                  </div>
                )}

                {paymentMode === 'mixed' && (
                  <div className="animate-slide-up" style={{ padding: '16px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>1. PAGO EN DÓLARES ($)</label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                        <input 
                          type="number" 
                          value={cashUsd} 
                          onChange={(e) => setCashUsd(e.target.value)}
                          style={{ flex: 1, height: '36px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', textAlign: 'right', paddingRight: '10px', fontSize: '12px' }} 
                        />
                        <div style={{ display: 'flex', flex: 2, gap: '4px', flexWrap: 'wrap' }}>
                          {['Efectivo', 'Zelle', 'Binance', 'Zinli'].map(m => (
                            <button 
                              key={m}
                              onClick={() => setMethodUsd(m)}
                              style={{ flex: '1 0 45%', padding: '6px', borderRadius: '8px', border: methodUsd === m ? '1.5px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)', background: methodUsd === m ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.02)', color: methodUsd === m ? 'var(--gold-primary)' : 'white', fontSize: '9px', fontWeight: '700', cursor: 'pointer' }}
                            >{m}</button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                      <label style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>2. RESTANTE EN BOLÍVARES (BS)</label>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ fontWeight: '900', color: 'var(--gold-primary)', fontSize: '16px' }}>{formatCurrency(remainingBs)} BS</div>
                        <div style={{ display: 'flex', flex: 1.5, gap: '4px', flexWrap: 'wrap', marginLeft: '10px' }}>
                          {['Pago Móvil', 'Efectivo', 'Transfe'].map(m => (
                            <button 
                              key={m}
                              onClick={() => setMethodBs(m === 'Transfe' ? 'Transferencia' : m)}
                              style={{ flex: '1 0 45%', padding: '6px', borderRadius: '8px', border: (methodBs === m || (m==='Transfe' && methodBs==='Transferencia')) ? '1.5px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)', background: (methodBs === m || (m==='Transfe' && methodBs==='Transferencia')) ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.02)', color: (methodBs === m || (m==='Transfe' && methodBs==='Transferencia')) ? 'var(--gold-primary)' : 'white', fontSize: '9px', fontWeight: '700', cursor: 'pointer' }}
                            >{m}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button 
                  onClick={handleCancelOrder}
                  disabled={loading}
                  style={{ 
                    flex: '1', 
                    height: isMobile ? '44px' : '54px', 
                    borderRadius: '14px', 
                    fontSize: isMobile ? '12px' : '14px', 
                    gap: '6px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255, 69, 58, 0.1)',
                    border: '1.5px solid rgba(255, 69, 58, 0.4)',
                    color: '#ff453a',
                    fontWeight: '900',
                    cursor: 'pointer',
                    transition: '0.3s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 69, 58, 0.2)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 69, 58, 0.1)'}
                >
                  <XCircle size={isMobile ? 16 : 20} /> CANCELAR
                </button>

                <button 
                  onClick={handleProcessCheckout}
                  disabled={loading}
                  className="btn-gold" 
                  style={{ flex: '2', height: isMobile ? '44px' : '54px', borderRadius: '14px', fontSize: isMobile ? '13px' : '15px', gap: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <CheckCircle size={isMobile ? 18 : 22} /> FINALIZAR COBRO
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <AstroDialog 
        isOpen={dialog.isOpen}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
        onConfirm={dialog.onConfirm}
        onCancel={() => setDialog({ ...dialog, isOpen: false })}
      />

      {/* Product Selection Modal */}
      {showProductModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className="glass-card animate-scale-in" style={{ maxWidth: '600px', width: '100%', borderRadius: '32px', border: '1.5px solid rgba(212,175,55,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontWeight: '900' }}>Seleccionar Productos</h2>
              <button onClick={() => {setShowProductModal(false); setSearchTerm('');}} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
            </div>
            <div style={{ position: 'relative', marginBottom: '24px' }}>
              <Search style={{ position: 'absolute', left: '16px', top: '14px' }} size={18} color="var(--gold-primary)" />
              <input type="text" placeholder="Buscar producto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '14px 48px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: 'white' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
              {inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).map(item => (
                <button key={item.id} onClick={() => handleAddToCart(item)} style={{ padding: '16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', textAlign: 'center', cursor: 'pointer' }} className="hover-item">
                  {item.image_url && <img src={item.image_url} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '12px', marginBottom: '10px' }} alt="" />}
                  <div style={{ fontWeight: '800', fontSize: '13px', marginBottom: '4px', color: 'white' }}>{item.name}</div>
                  <div style={{ color: 'var(--gold-primary)', fontWeight: '900' }}>
                    <div>${item.price}</div>
                    {rates?.usd > 0 && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>≈ {Math.round(item.price * rates.usd).toLocaleString()} Bs.</div>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Extras Selection Modal */}
      {showExtraModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className="glass-card animate-scale-in" style={{ maxWidth: '500px', width: '100%', borderRadius: '32px', border: '1.5px solid rgba(212,175,55,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontWeight: '900' }}>Servicios Extras</h2>
              <button onClick={() => setShowExtraModal(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '10px' }}>
              {allExtras.map(extra => (
                <button key={extra.id} onClick={() => handleAddExtra(extra)} style={{ padding: '20px', borderRadius: '20px', border: '1px solid rgba(212,175,55,0.2)', background: 'rgba(212,175,55,0.02)', textAlign: 'left', cursor: 'pointer' }} className="hover-item">
                  <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '4px', color: 'white' }}>{extra.name}</div>
                  <div style={{ color: 'var(--gold-primary)', fontWeight: '900' }}>
                    <div>${extra.price}</div>
                    {rates?.usd > 0 && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>≈ {Math.round(extra.price * rates.usd).toLocaleString()} Bs.</div>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Service Modal */}
      {showServiceModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '80px', overflowY: 'auto' }}>
          <div className="glass-card animate-scale-in" style={{ width: '100%', maxWidth: '600px', borderRadius: '32px', padding: '32px', marginBottom: '80px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontWeight: '900' }}>Catálogo de Servicios</h2>
              <button onClick={() => setShowServiceModal(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '10px' }}>
              {allServices.map(service => (
                <button key={service.id} onClick={() => handleAddService(service)} style={{ padding: '20px', borderRadius: '20px', border: '1px solid rgba(212,175,55,0.2)', background: 'rgba(212,175,55,0.02)', textAlign: 'left', cursor: 'pointer' }} className="hover-item">
                  <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '4px', color: 'white' }}>{service.name}</div>
                  <div style={{ color: 'var(--gold-primary)', fontWeight: '900' }}>
                    <div>${service.price}</div>
                    {rates?.usd > 0 && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>≈ {Math.round(service.price * rates.usd).toLocaleString()} Bs.</div>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Barber Select Modal */}
      {showBarberModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className="glass-card animate-scale-in" style={{ width: '100%', maxWidth: '400px', borderRadius: '32px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontWeight: '900', fontSize: '20px' }}>Seleccionar Barbero / Asistente</h2>
              <button onClick={() => { setShowBarberModal(false); setIsChangingBarber(false); }} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '13px' }}>
              {isChangingBarber ? (
                "Selecciona el nuevo barbero o asistente para esta cita."
              ) : (
                <>Selecciona el barbero o asistente al que se le asignará la comisión por el servicio <strong>{selectedServiceForBarber?.name}</strong>.</>
              )}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
              {allStaff.filter(s => {
                const roleName = (s.role?.split('|')[0] || '').toLowerCase();
                return !roleName.includes('admin') && 
                       !roleName.includes('recepcionista') && 
                       !roleName.includes('caja');
              }).map(barber => (
                <button 
                  key={barber.id} 
                  onClick={() => isChangingBarber ? handleChangeBarber(barber.id) : handleConfirmServiceBarber(barber.id)} 
                  style={{ padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }} 
                  className="hover-item"
                >
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--gold-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black' }}>
                    <Scissors size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: '800', color: 'white', fontSize: '15px' }}>{barber.name}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <NewClientModal 
        isOpen={showNewClientModal}
        onClose={() => setShowNewClientModal(false)}
        onSuccess={handleNewClientSuccess}
      />

      {/* Link Citas Modal (Pago Grupal) */}
      {showLinkModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className="glass-card animate-scale-in" style={{ maxWidth: '500px', width: '100%', borderRadius: '32px', border: '1.5px solid rgba(212,175,55,0.3)', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontWeight: '900', fontSize: '20px' }}>Enlazar Citas en Espera</h2>
              <button onClick={() => setShowLinkModal(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '13px' }}>
              Selecciona los clientes que están en silla o pendientes de cobro para cargarlos a la cuenta de <strong>{selectedApp?.clients?.name}</strong>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto', paddingRight: '8px' }} className="astro-scrollbar">
              {groupedActiveServices.filter(g => g.client_id !== selectedApp?.client_id && !linkedApps.some(la => la.client_id === g.client_id)).length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No hay otros clientes pendientes en silla o por pagar.
                </div>
              ) : (
                groupedActiveServices
                  .filter(g => g.client_id !== selectedApp?.client_id && !linkedApps.some(la => la.client_id === g.client_id))
                  .map(group => {
                    const sNames = group.apps.map(a => a.services?.name).filter(Boolean).join(' + ') || 'Servicio';
                    const tPrice = group.apps.reduce((acc, a) => acc + (a.services?.price || a.total_price || 0), 0);
                    return (
                      <div 
                        key={group.client_id}
                        style={{ padding: '14px 16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      >
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '14px', color: 'white' }}>{group.client_name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{sNames}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontWeight: '700', color: 'var(--gold-primary)', fontSize: '13px' }}>${tPrice}</span>
                          <button 
                            onClick={() => {
                              setLinkedApps([...linkedApps, ...group.apps]);
                              showToast(`Cita de ${group.client_name} enlazada.`);
                            }}
                            className="btn-gold"
                            style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '900' }}
                          >
                            Enlazar
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowLinkModal(false)} 
                className="btn-gold" 
                style={{ padding: '10px 24px', borderRadius: '12px', fontWeight: '800' }}
              >
                LISTO
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .hover-item:hover {
          border-color: var(--gold-primary) !important;
          background-color: rgba(212,175,55,0.05) !important;
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
};

export default CheckoutPOS;
