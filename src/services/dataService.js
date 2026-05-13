import { supabase } from '../lib/supabase';

export const dataService = {
  supabase,
  // Clients
  async getClients() {
    const { data, error } = await supabase
      .from('clients')
      .select('*, appointments(status, total_price)')
      .order('name');
    
    if (error) throw error;
    
    return data.map(client => {
      const validApps = client.appointments?.filter(a => ['Completado', 'En Silla', 'Por Pagar'].includes(a.status)) || [];
      return {
        ...client,
        total_visits: validApps.length,
        total_spent: validApps.reduce((acc, a) => acc + (Number(a.total_price) || 0), 0)
      };
    });
  },

  async addClient(client) {
    const { data, error } = await supabase
      .from('clients')
      .insert([client])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async checkClientExists(idCard) {
    const { data, error } = await supabase
      .from('clients')
      .select('id, name')
      .eq('id_card', idCard);
    
    if (error) throw error;
    return data.length > 0 ? data[0] : null;
  },

  async updateClient(id, updates) {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteClient(id) {
    // 1. Get all appointments for this client
    const { data: apps } = await supabase
      .from('appointments')
      .select('id')
      .eq('client_id', id);
    
    if (apps && apps.length > 0) {
      const appIds = apps.map(a => a.id);
      
      // 2. Delete dependencies of those appointments
      await Promise.all([
        supabase.from('appointment_staff').delete().in('appointment_id', appIds),
        supabase.from('appointment_extras').delete().in('appointment_id', appIds),
        supabase.from('appointment_products').delete().in('appointment_id', appIds)
      ]);
      
      // 3. Delete appointments
      await supabase.from('appointments').delete().in('id', appIds);
    }
    
    // 4. Finally delete the client
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  },

  // Staff
  async getStaff() {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('name');
    if (error) throw error;
    // Filter out archived staff from active lists
    return data.filter(s => !s.role?.startsWith('ARCHIVED|'));
  },

  async addStaff(member) {
    const { data, error } = await supabase
      .from('staff')
      .insert([member])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateStaff(id, updates) {
    const { data, error } = await supabase
      .from('staff')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getStaffProfileStats(staffId) {
    const { data: staffRecords, error } = await supabase
      .from('appointment_staff')
      .select(`
        commission_earned,
        product_commission,
        tip_amount,
        appointments!inner (
          id,
          status,
          total_price,
          started_at,
          completed_at,
          services (name, price)
        )
      `)
      .eq('staff_id', staffId)
      .eq('appointments.status', 'Completado');

    if (error) {
      console.error('Error fetching staff stats:', error);
      throw error;
    }

    let totalServiceComm = 0;
    let totalProductComm = 0;
    let totalTips = 0;
    let totalDurationMs = 0;
    let durationCount = 0;
    const serviceCounts = {};

    staffRecords?.forEach(record => {
      const app = record.appointments;
      if (!app) return;

      totalServiceComm += Number(record.commission_earned || 0);
      totalProductComm += Number(record.product_commission || 0);
      totalTips += Number(record.tip_amount || 0);

      // Services
      const sName = app.services?.name;
      if (sName) {
        serviceCounts[sName] = (serviceCounts[sName] || 0) + 1;
      }

      // Duration
      if (app.started_at && app.completed_at) {
        const start = new Date(app.started_at).getTime();
        const end = new Date(app.completed_at).getTime();
        if (end > start) {
          totalDurationMs += (end - start);
          durationCount++;
        }
      }
    });

    const topServices = Object.entries(serviceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    const avgDurationMin = durationCount > 0 ? Math.round(totalDurationMs / durationCount / 60000) : 0;

    return {
      totalAppointments: staffRecords?.length || 0,
      totalServiceComm,
      totalProductComm,
      totalTips,
      topServices,
      avgDurationMin
    };
  },

  async updateStaffTools(id, toolsArray) {
    const { data, error } = await supabase
      .from('staff')
      .update({ tools: toolsArray })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteStaff(id) {
    // 1. Fetch current staff to preserve their role info
    const { data: member } = await supabase
      .from('staff')
      .select('role')
      .eq('id', id)
      .single();
    
    if (!member) return;

    // 2. Archive instead of delete
    const { error } = await supabase
      .from('staff')
      .update({ role: `ARCHIVED|${member.role}` })
      .eq('id', id);
      
    if (error) throw error;
  },

  // Services

  async getServices() {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('name');
    
    if (error) throw error;
    // Filter out archived services
    return data.filter(s => !s.name?.startsWith('ARCHIVED|'));
  },

  async addService(service) {
    const { data, error } = await supabase
      .from('services')
      .insert([service])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateService(id, updates) {
    const { data, error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteService(id) {
    // 1. Fetch current service to get name
    const { data: service } = await supabase.from('services').select('name').eq('id', id).single();
    if (!service) return;

    // 2. Archive instead of delete
    const { error } = await supabase
      .from('services')
      .update({ name: `ARCHIVED|${service.name}` })
      .eq('id', id);
    if (error) throw error;
  },

  // Extras
  async getExtras() {
    const { data, error } = await supabase.from('service_extras').select('*').order('name');
    if (error) throw error;
    // Filter out archived extras and system config items
    return data.filter(e => 
      !e.name?.startsWith('ARCHIVED|') && 
      e.name !== 'SYSTEM_CONFIG_RATES'
    );
  },

  async addExtra(extra) {
    const { data, error } = await supabase.from('service_extras').insert([extra]).select().single();
    if (error) throw error;
    return data;
  },

  async updateExtra(id, updates) {
    const { data, error } = await supabase.from('service_extras').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteExtra(id) {
    // 1. Fetch current extra to get name
    const { data: extra } = await supabase.from('service_extras').select('name').eq('id', id).single();
    if (!extra) return;

    // 2. Archive instead of delete
    const { error } = await supabase
      .from('service_extras')
      .update({ name: `ARCHIVED|${extra.name}` })
      .eq('id', id);
    if (error) throw error;
  },

  async addExtraToAppointment(appointmentId, extraId, price) {
    const { data, error } = await supabase.from('appointment_extras').insert([{ appointment_id: appointmentId, extra_id: extraId, price }]).select().single();
    if (error) throw error;
    return data;
  },

  async updateAppointmentExtraPrice(id, price) {
    const { data, error } = await supabase.from('appointment_extras').update({ price }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async getAppointmentExtras(appointmentId) {
    const { data, error } = await supabase.from('appointment_extras').select('*, service_extras(*)').eq('appointment_id', appointmentId);
    if (error) throw error;
    return data;
  },

  async removeExtraFromAppointment(id) {
    const { error } = await supabase.from('appointment_extras').delete().eq('id', id);
    if (error) throw error;
  },

  async addProductToAppointment(appointmentId, productId, quantity, price) {
    const { data, error } = await supabase.from('appointment_products').insert([{ appointment_id: appointmentId, product_id: productId, quantity, price }]).select().single();
    if (error) throw error;
    return data;
  },

  async getAppointmentProducts(appointmentId) {
    const { data, error } = await supabase.from('appointment_products').select('*, inventory(*)').eq('appointment_id', appointmentId);
    if (error) throw error;
    return data;
  },

  async removeProductFromAppointment(id) {
    const { error } = await supabase.from('appointment_products').delete().eq('id', id);
    if (error) throw error;
  },

  // Service Checklist Items
  async getChecklistItems() {
    const { data, error } = await supabase
      .from('service_checklist_items')
      .select('*')
      .order('name');
    if (error) throw error;
    return data;
  },

  async addChecklistItem(name, base_cost = 0) {
    const { data, error } = await supabase
      .from('service_checklist_items')
      .insert([{ name, base_cost }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteChecklistItem(id) {
    const { error } = await supabase
      .from('service_checklist_items')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async updateChecklistItem(id, updates) {
    const { data, error } = await supabase
      .from('service_checklist_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Transactions (Finance)
  async getTransactions() {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getClientTransactions(clientId) {
    // 1. Fetch appointments with full details
    const { data: apps, error: appError } = await supabase
      .from('appointments')
      .select(`
        id, 
        created_at, 
        total_price,
        status,
        services(name, price, included_items),
        staff(name)
      `)
      .eq('client_id', clientId)
      .in('status', ['Completado', 'En Silla', 'Por Pagar'])
      .order('created_at', { ascending: false });
    
    if (appError) throw appError;

    // 2. Fetch related transactions to get payment methods
    const { data: txs, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .contains('metadata', { client_id: clientId });
    
    if (txError) console.error('Error fetching TXs for history:', txError);

    return apps.map(app => {
      // Find the specific transaction for this appointment if it exists
      const relatedTx = txs?.find(t => t.metadata?.appointment_id === app.id);
      
      return {
        id: app.id,
        created_at: app.created_at,
        amount: app.total_price,
        status: app.status,
        barber_name: app.staff?.name,
        service_name: app.services?.name,
        service_price: app.services?.price,
        included_items: app.services?.included_items || [],
        payment_method: relatedTx?.metadata?.method_usd || relatedTx?.metadata?.method_bs || relatedTx?.description?.split(' - ')[2] || 'No registrado',
        payment_metadata: relatedTx?.metadata || {},
        exchange_rate: relatedTx?.exchange_rate,
        description: `Servicio: ${app.services?.name} - Barbero: ${app.staff?.name}`
      };
    });
  },

  async getStaffHistory(staffId) {
    const { data, error } = await supabase
      .from('appointment_staff')
      .select(`
        *,
        appointments (
          *,
          clients(name, phone, id_card, work_gallery),
          services(name, price, included_items, commission_barber, commission_washer, commission_cashier, commission_receptionist),
          appointment_extras(id, price, service_extras(name)),
          appointment_products(id, quantity, price, inventory(id, name))
        )
      `)
      .eq('staff_id', staffId);
    
    if (error) throw error;
    return data;
  },

  async addTransaction(transaction) {
    const { data, error } = await supabase
      .from('transactions')
      .insert([transaction])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Inventory
  async getInventory() {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('name');
    if (error) throw error;
    return data;
  },

  async addInventoryItem(item) {
    const { data, error } = await supabase
      .from('inventory')
      .insert([item])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateInventoryItem(id, updates) {
    const { data, error } = await supabase
      .from('inventory')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteInventoryItem(id) {
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async updateStock(id, newStock) {
    const { data, error } = await supabase
      .from('inventory')
      .update({ stock: newStock, updated_at: new Date() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  
  // Inventory Movements
  async logInventoryMovement(movement) {
    const { data, error } = await supabase
      .from('inventory_movements')
      .insert([movement])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getInventoryMovements() {
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*, inventory(name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // Appointments (Operational States)
  async getAppointmentsByState(states = []) {
    let query = supabase.from('appointments').select(`
      *, 
      clients(id, name, phone, id_card, work_gallery), 
      services(name, price, included_items, commission_barber, commission_washer, commission_cashier, commission_receptionist),
      staff(*),
      appointment_extras(id, price, service_extras(id, name)),
      appointment_products(id, quantity, price, inventory(id, name)),
      appointment_staff(*, staff(name, role))
    `);
    if (states.length > 0) query = query.in('status', states);
    const { data, error } = await query.order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },

  async getTodayAppointments() {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase.from('appointments').select(`
      *, 
      clients(id, name, phone), 
      services(name, price),
      staff(name)
    `)
    .gte('created_at', today)
    .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  async createAppointment(appointment) {
    const { data, error } = await supabase
      .from('appointments')
      .insert([{
        ...appointment,
        status: appointment.status || 'Agendado',
        scheduled_at: appointment.scheduled_at || null,
        started_at: (appointment.status === 'En Silla') ? new Date().toISOString() : null
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateAppointment(id, updates) {
    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateAppointmentStatus(id, newStatus) {
    const updates = { status: newStatus };
    if (newStatus === 'En Silla') updates.started_at = new Date().toISOString();
    if (newStatus === 'Completado' || newStatus === 'Por Pagar') updates.completed_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteAppointment(id) {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  async deleteAppointmentExtra(id) {
    const { error } = await supabase
      .from('appointment_extras')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  async deleteAppointmentProduct(id) {
    const { error } = await supabase
      .from('appointment_products')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  async getBarberDailyStats(staffId) {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        status,
        total_price,
        services(price),
        appointment_extras(price),
        appointment_products(quantity, price)
      `)
      .eq('staff_id', staffId)
      .gte('created_at', today)
      .in('status', ['En Silla', 'Por Pagar', 'Completado']);
    
    if (error) throw error;

    let totalUsd = 0;
    let serviceCount = data.length;

    data.forEach(app => {
      const sPrice = app.services?.price || 0;
      const ePrice = app.appointment_extras?.reduce((sum, e) => sum + (e.price || 0), 0) || 0;
      const pPrice = app.appointment_products?.reduce((sum, p) => sum + ((p.price || 0) * (p.quantity || 1)), 0) || 0;
      totalUsd += (sPrice + ePrice + pPrice);
    });

    return { productionUsd: totalUsd, services: serviceCount };
  },

  // Final Checkout Logic
  async processFinalPayment(paymentRecord) {
    // 1. Mark appointment as completed (if exists)
    if (paymentRecord.appointmentId) {
      await this.updateAppointmentStatus(paymentRecord.appointmentId, 'Completado');
    }

    // 2. Register commissioners (Staff involved)
    if (paymentRecord.staffInvolved && paymentRecord.staffInvolved.length > 0) {
      const staffRecords = paymentRecord.staffInvolved
        .filter(s => s.staffId) // Only if there is a staff member
        .map(s => ({
          appointment_id: paymentRecord.appointmentId || null,
          staff_id: s.staffId,
          commission_earned: s.commissionEarned || 0,
          product_commission: s.productCommissionEarned || 0,
          tip_amount: s.tip || 0
        }));
      if (staffRecords.length > 0) {
        const { error: staffError } = await supabase.from('appointment_staff').insert(staffRecords);
        if (staffError) {
          console.error("Error inserting appointment_staff:", staffError);
          // Don't throw here to avoid blocking the whole process if it's just a commission log error
        }
      }
    }

    // 3. Register Sold Products and Stock reduction
    if (paymentRecord.products && paymentRecord.products.length > 0) {
      for (const p of paymentRecord.products) {
        const { data: inv } = await supabase.from('inventory').select('stock').eq('id', p.id).single();
        if (inv) {
          await this.updateStock(p.id, inv.stock - (p.quantity || 1));
          // Log movement
          await supabase.from('inventory_movements').insert([{
            product_id: p.id,
            type: 'exit',
            amount: p.quantity || 1,
            reason: `Venta - Cliente: ${paymentRecord.clientName}`
          }]);
        }
      }
    }

    // 4. Create Financial Transaction
    await this.addTransaction({
      description: paymentRecord.appointmentId 
        ? `VENTA FINAL - Cliente: ${paymentRecord.clientName} - Servi: ${paymentRecord.serviceName}`
        : `VENTA DIRECTA PRODUCTOS - Cliente: ${paymentRecord.clientName}`,
      amount: Number(paymentRecord.totalUsd),
      type: 'income',
      category: 'Ventas Astro',
      exchange_rate: Number(paymentRecord.fixedRate),
      currency: 'USD',
      metadata: { 
        appointment_id: paymentRecord.appointmentId || null,
        client_id: paymentRecord.clientId || null,
        mixed_payment: paymentRecord.isMixed,
        cash_usd: Number(paymentRecord.cashUsd),
        transfer_bs: Number(paymentRecord.transferBs),
        tips_total: Number(paymentRecord.totalTips),
        method_usd: paymentRecord.methodUsd,
        method_bs: paymentRecord.methodBs,
        products_sold: paymentRecord.products || [],
        extras: paymentRecord.extras || [],
        staffInvolved: paymentRecord.staffInvolved || [],
        serviceName: paymentRecord.serviceName,
        didWash: paymentRecord.didWash,
        clientCedula: paymentRecord.clientCedula
      }
    });

    // 5. Sincronizar con Google Sheets
    await this.syncTransactionToSheets(paymentRecord);

    return true;
  },

  async syncTransactionToSheets(paymentRecord) {
    // URL de la Web App de Google Apps Script configurada
    const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwqkYcgz10iRU6w6kH_Y1VFxxSQQEd6dDKvIu6ZUCz03g1qPfMC09M6Fe2rSChiP085jA/exec"; 
    
    if (WEBHOOK_URL === "URL_DE_LA_WEB_APP_AQUI") return; // Si no está configurada, ignorar

    try {
      const barbero = paymentRecord.staffInvolved?.find(s => s.role?.toLowerCase().includes('barbero'))?.name || 'Venta Directa';
      
      const payload = {
        fecha: new Date().toLocaleDateString('es-VE'),
        cliente: paymentRecord.clientName || 'Cliente General',
        cedula: paymentRecord.clientCedula || 'S/C',
        barbero: barbero,
        servicio: paymentRecord.serviceName || 'Productos',
        metodoPago: paymentRecord.isMixed ? 'Mixto' : (paymentRecord.methodBs && paymentRecord.methodBs !== 'N/A' ? paymentRecord.methodBs : paymentRecord.methodUsd),
        lavado: paymentRecord.didWash ? 1 : 0,
        monto: `${(paymentRecord.totalUsd * paymentRecord.fixedRate).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}Bs.`
      };

      await fetch(WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: JSON.stringify(payload)
      });
      console.log('Sincronizado con Google Sheets exitosamente');
    } catch (e) {
      console.error('Error al sincronizar con Google Sheets:', e);
    }
  },

  // BCV Exchange Rates
  async getExchangeRates() {
    try {
      const usdRes = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
      if (!usdRes.ok) throw new Error('USD rate not available');
      const usdData = await usdRes.json();
      
      return {
        usd: usdData.promedio,
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching BCV rates:', error);
      return { usd: 36.5, updated_at: null, error: true };
    }
  },

  // Global App Settings (Synchronized Rates)
  async getGlobalRates() {
    try {
      const { data, error } = await supabase
        .from('service_extras')
        .select('*')
        .eq('name', 'SYSTEM_CONFIG_RATES')
        .limit(1);
      
      if (error || !data || data.length === 0) {
        // Create default if not exists
        const defaultRates = { name: 'SYSTEM_CONFIG_RATES', price: 58.00, cost: 58.50 };
        const { data: newData, error: insertError } = await supabase.from('service_extras').insert([defaultRates]).select();
        if (insertError) throw insertError;
        return { shop: newData[0].price, usdt: newData[0].cost };
      }
      
      return { shop: data[0].price, usdt: data[0].cost };
    } catch (err) {
      console.error('Error getting global rates:', err);
      return { shop: 58.00, usdt: 58.50 };
    }
  },

  async updateGlobalRates(rates) {
    const { data, error } = await supabase
      .from('service_extras')
      .update({ price: rates.shop, cost: rates.usdt })
      .eq('name', 'SYSTEM_CONFIG_RATES')
      .select();
    
    if (error) throw error;
    if (!data || data.length === 0) {
      // If for some reason it was deleted, recreate it
      const defaultRates = { name: 'SYSTEM_CONFIG_RATES', price: rates.shop, cost: rates.usdt };
      await supabase.from('service_extras').insert([defaultRates]);
      return { shop: rates.shop, usdt: rates.usdt };
    }
    return { shop: data[0].price, usdt: data[0].cost };
  },

  async resetDatabase() {
    if (!window.confirm('¿ESTÁS ABSOLUTAMENTE SEGURO? Se borrarán todos los clientes, personal y ventas. Esta acción es irreversible.')) return;
    try {
      await supabase.from('appointment_staff').delete().neq('id', 0);
      await supabase.from('appointments').delete().neq('id', 0);
      await supabase.from('transactions').delete().neq('id', 0);
      await supabase.from('clients').delete().neq('id', 0);
      await supabase.from('staff').delete().neq('id', 0);
      await supabase.from('services').delete().neq('id', 0);
      await supabase.from('inventory').delete().neq('id', 0);
      return true;
    } catch (error) {
      console.error('Reset error:', error);
      throw error;
    }
  }
};
