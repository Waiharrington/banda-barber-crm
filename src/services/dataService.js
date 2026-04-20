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

  // Staff
  async getStaff() {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('active', true);
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

  // Services
  async getServices() {
    const { data, error } = await supabase
      .from('services')
      .select('*');
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

  // Transactions (Finance)
  async getTransactions() {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
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

    // 3. Add to finance (Income)
    await this.addTransaction({
      description: `Servicio: ${appointmentData.serviceName} - Cliente ID: ${appointmentData.clientId}`,
      amount: appointmentData.totalPrice,
      type: 'income',
      category: 'Servicios'
    });

    return appointment;
  }
};
