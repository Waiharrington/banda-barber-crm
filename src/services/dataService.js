import { supabase } from '../lib/supabase';

export const dataService = {
  // Clients
  async getClients() {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name');
    if (error) throw error;
    return data;
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
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .ilike('description', `%Cliente ID: ${clientId}%`)
      .order('created_at', { ascending: false });
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
    let query = supabase.from('appointments').select('*, clients(name, phone), services(name, price)');
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
        status: appointment.status || 'Agendado'
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateAppointmentStatus(id, newStatus) {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
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
        mixed_payment: paymentRecord.isMixed,
        cash_usd: paymentRecord.cashUsd,
        transfer_bs: paymentRecord.transferBs,
        tips_total: paymentRecord.totalTips
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
