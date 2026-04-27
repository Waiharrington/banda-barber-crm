import { supabase } from '../lib/supabase';

export const dataService = {
  // Clients
  async getClients() {
    const { data, error } = await supabase
      .from('clients')
      .select('*, appointments(status)')
      .order('name');
    
    if (error) throw error;
    
    return data.map(client => ({
      ...client,
      total_visits: client.appointments?.filter(a => ['Completado', 'En Silla', 'Por Pagar'].includes(a.status)).length || 0
    }));
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
    return data;
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

  async deleteStaff(id) {
    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', id);
    if (error) throw error;
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

  // Services
  async getServices() {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('name');
    if (error) throw error;
    return data;
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
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);
    if (error) throw error;
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
        payment_method: relatedTx?.description?.split(' - ')[2] || relatedTx?.metadata?.method_usd || relatedTx?.metadata?.method_bs || 'No registrado',
        payment_metadata: relatedTx?.metadata || {},
        description: `Servicio: ${app.services?.name} - Barbero: ${app.staff?.name}`
      };
    });
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

  async deleteInventoryItem(id) {
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Appointments (Operational States)
  async getAppointmentsByState(states = []) {
    let query = supabase.from('appointments').select(`
      *, 
      clients(name, phone, id_card), 
      services(name, price, included_items, commission_barber, commission_washer, commission_cashier, commission_receptionist),
      staff(*)
    `);
    if (states.length > 0) query = query.in('status', states);
    const { data, error } = await query.order('created_at', { ascending: true });
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
    if (newStatus === 'Completado') {
      updates.completed_at = new Date().toISOString();
    }
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

  // Final Checkout Logic
  async processFinalPayment(paymentRecord) {
    // 1. Mark appointment as completed
    await this.updateAppointmentStatus(paymentRecord.appointmentId, 'Completado');

    // 2. Register commissioners (Staff involved)
    if (paymentRecord.staffInvolved) {
      const staffRecords = paymentRecord.staffInvolved.map(s => ({
        appointment_id: paymentRecord.appointmentId,
        staff_id: s.staffId,
        commission_earned: s.commissionEarned,
        tip_amount: s.tip || 0
      }));
      await supabase.from('appointment_staff').insert(staffRecords);
    }

    // 3. Register Sold Products and Stock reduction
    if (paymentRecord.products && paymentRecord.products.length > 0) {
      for (const p of paymentRecord.products) {
        // Reduced stock logic should be handle in real usage
        const { data: inv } = await supabase.from('inventory').select('stock').eq('id', p.id).single();
        if (inv) await this.updateStock(p.id, inv.stock - (p.quantity || 1));
      }
    }

    // 4. Create Financial Transaction (CONGELED SNAPSHOT)
    await this.addTransaction({
      description: `VENTA FINAL - Cliente: ${paymentRecord.clientName} - Servi: ${paymentRecord.serviceName}`,
      amount: paymentRecord.totalUsd,
      type: 'income',
      category: 'Ventas Pro',
      exchange_rate: paymentRecord.fixedRate,
      currency: 'USD',
      metadata: { 
        appointment_id: paymentRecord.appointmentId,
        client_id: (await supabase.from('appointments').select('client_id').eq('id', paymentRecord.appointmentId).single()).data?.client_id,
        mixed_payment: paymentRecord.isMixed,
        cash_usd: paymentRecord.cashUsd,
        transfer_bs: paymentRecord.transferBs,
        tips_total: paymentRecord.totalTips,
        method_usd: paymentRecord.methodUsd,
        method_bs: paymentRecord.methodBs,
        products_sold: paymentRecord.products || []
      }
    });

    return true;
  },

  // BCV Exchange Rates
  async getExchangeRates() {
    try {
      const usdRes = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
      if (!usdRes.ok) throw new Error('USD rate not available');
      const usdData = await usdRes.json();
      
      const eurRes = await fetch('https://ve.dolarapi.com/v1/euros/oficial');
      if (!eurRes.ok) throw new Error('EUR rate not available');
      const eurData = await eurRes.json();

      return {
        usd: usdData.promedio,
        eur: eurData.promedio,
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching BCV rates:', error);
      return { usd: 36.5, eur: 39.5, updated_at: null, error: true };
    }
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
