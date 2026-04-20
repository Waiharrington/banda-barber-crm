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
    // Note: description contains 'Cliente ID: XYZ'. 
    // Ideally we have a client_id column. 
    // In current registerServiceSale we save 'description'.
    // Let's first check if we have client_id in transactions.
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

  // Appointments (The Core Logic)
  async registerServiceSale(appointmentData, staffInvolved) {
    // 1. Create the appointment
    const { data: appointment, error: appError } = await supabase
      .from('appointments')
      .insert([{
        client_id: appointmentData.clientId,
        service_id: appointmentData.serviceId,
        total_price: appointmentData.totalPrice
      }])
      .select()
      .single();

    if (appError) throw appError;

    // 2. Register staff involved and their commissions
    const staffRecords = staffInvolved.map(s => ({
      appointment_id: appointment.id,
      staff_id: s.staffId,
      commission_earned: s.commissionEarned
    }));

    const { error: staffError } = await supabase
      .from('appointment_staff')
      .insert(staffRecords);

    if (staffError) throw staffError;
    
    // 3. Add to finance (Income) with exchange rate snapshot
    await this.addTransaction({
      description: `Servicio: ${appointmentData.serviceName} - Cliente ID: ${appointmentData.clientId}`,
      amount: appointmentData.totalPrice,
      type: 'income',
      category: 'Servicios',
      exchange_rate: appointmentData.exchangeRate || 1,
      currency: appointmentData.currency || 'USD'
    });

    return appointment;
  },

  // BCV Exchange Rates
  async getExchangeRates() {
    try {
      // 1. Get USD/BS (Official/BCV)
      const usdRes = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
      if (!usdRes.ok) throw new Error('USD rate not available');
      const usdData = await usdRes.json();
      
      // 2. Get EUR/BS (Official/BCV)
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
      // Fallback rates if API is down
      return {
        usd: 36.5, 
        eur: 39.5,
        updated_at: null,
        error: true
      };
    }
  },

  async resetDatabase() {
    if (!window.confirm('¿ESTÁS ABSOLUTAMENTE SEGURO? Se borrarán todos los clientes, personal y ventas. Esta acción es irreversible.')) return;
    
    try {
      // Order of deletion to avoid foreign key issues
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
