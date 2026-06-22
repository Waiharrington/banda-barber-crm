import { supabase } from '../../lib/supabase';

export const publicService = {
  // Get active services
  async getServices() {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('active', true)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  // Get active staff (barbers)
  async getStaff() {
    const { data, error } = await supabase
      .from('staff')
      .select('id, name, role, image_url, active')
      .eq('active', true)
      .not('role', 'like', 'ARCHIVED|%')
      .order('name');
    if (error) throw error;
    return (data || []).filter(s => !s.role?.startsWith('ARCHIVED|'));
  },

  // Get available time slots for a specific barber and date
  async getOccupiedSlots(staffId, date) {
    const { data, error } = await supabase
      .from('appointments')
      .select('scheduled_at, services(duration)')
      .eq('staff_id', staffId)
      .gte('scheduled_at', `${date}T00:00:00`)
      .lte('scheduled_at', `${date}T23:59:59`)
      .in('status', ['Agendado', 'En Silla', 'Por Pagar']);
    if (error) throw error;
    
    // Return occupied time slots (hour:minute) based on duration
    const occupied = [];
    (data || []).forEach(a => {
      const d = new Date(a.scheduled_at);
      const durationMins = a.services?.duration || 30; // Default 30 mins
      const slotsCount = Math.ceil(durationMins / 30);
      
      for (let i = 0; i < slotsCount; i++) {
        const slotTime = new Date(d.getTime() + (i * 30 * 60000));
        occupied.push(`${String(slotTime.getHours()).padStart(2, '0')}:${String(slotTime.getMinutes()).padStart(2, '0')}`);
      }
    });
    return occupied;
  },

  // Register new client
  async registerClient({ name, phone, id_card, email, password, birth_date }) {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email || `${phone}@pandabarber.app`,
      password: password,
      phone: phone,
      options: {
        data: { name, id_card }
      }
    });
    if (authError) throw authError;

    // Create client record with birth_date
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .insert([{
        name,
        phone,
        id_card,
        email: email || null,
        birth_date: birth_date || null,
        points: 0,
        status: 'Activo'
      }])
      .select()
      .single();
    if (clientError) throw clientError;

    return { user: authData.user, client: clientData };
  },

  // Login client (accepts email or phone)
  async loginClient({ identifier, password }) {
    const isEmail = identifier.includes('@');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: isEmail ? identifier : `${identifier}@pandabarber.app`,
      password
    });
    if (error) throw error;
    return data;
  },

  // Sign in with Google
  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/#/completar-registro'
      }
    });
    if (error) throw error;
    return data;
  },

  // Get current session
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  // Get user from session
  async getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // Reset password
  async resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/#/restablecer-contraseña'
    });
    if (error) throw error;
    return true;
  },

  // Update password
  async updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return true;
  },

  // Complete Google registration (create client record)
  async completeGoogleRegistration({ user_id, name, email, phone, id_card }) {
    // Check if client already exists
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      // Update existing client
      const { data, error } = await supabase
        .from('clients')
        .update({ phone, id_card, name })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    // Create new client
    const { data, error } = await supabase
      .from('clients')
      .insert([{
        name,
        email,
        phone,
        id_card,
        points: 0,
        status: 'Activo',
        auth_user_id: user_id
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Check if user has completed registration
  async getClientByUserId(userId) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('auth_user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // Update client profile
  async updateClientProfile(clientId, updates) {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', clientId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Check if client exists by email
  async getClientByEmail(email) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // Get client by phone
  async getClientByPhone(phone) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('phone', phone)
      .single();
    if (error) throw error;
    return data;
  },

  // Get client appointments
  async getClientAppointments(clientId) {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, services(name, price), staff(name)')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Create appointment
  async createAppointment({ client_id, service_id, staff_id, scheduled_at, beverage_selection }) {
    const { data: service } = await supabase
      .from('services')
      .select('price')
      .eq('id', service_id)
      .single();

    const { data, error } = await supabase
      .from('appointments')
      .insert([{
        client_id,
        service_id,
        staff_id,
        scheduled_at,
        total_price: service?.price || 0,
        status: 'Agendado',
        beverage_selection: beverage_selection || null
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Get client points
  async getClientPoints(clientId) {
    const { data, error } = await supabase
      .from('clients')
      .select('points')
      .eq('id', clientId)
      .single();
    if (error) throw error;
    return data?.points || 0;
  },

  // Get top clients of the month
  async getTopClientsOfMonth() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const isoString = thirtyDaysAgo.toISOString();

    const { data: txs, error } = await supabase
      .from('transactions')
      .select('client_id, amount, status, type, created_at')
      .eq('status', 'PAID')
      .eq('type', 'income')
      .gte('created_at', isoString);

    if (error) throw error;

    const counts = {};
    (txs || []).forEach(tx => {
      if (tx.client_id) {
        counts[tx.client_id] = (counts[tx.client_id] || 0) + 1;
      }
    });

    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (sorted.length === 0) return [];

    const clientIds = sorted.map(s => s[0]);
    const { data: clientsData, error: clientErr } = await supabase
      .from('clients')
      .select('*')
      .in('id', clientIds);

    if (clientErr) throw clientErr;

    return sorted.map(([id, count]) => {
      const client = (clientsData || []).find(c => c.id === id);
      if (!client) return null;
      return { ...client, visit_count: count };
    }).filter(Boolean);
  },

  // Coupons
  async getRoulettePrizes() {
    try {
      const { data, error } = await supabase.from('service_extras').select('*');
      if (error) return [];
      return data.filter(d => d.name && d.name.startsWith('ROULETTE_PRIZE:'));
    } catch { return []; }
  },

  async getCoupons(clientId = null) {
    let query = supabase.from('coupons').select('*');
    if (clientId) {
      query = query.eq('client_id', clientId);
    }
    const { data, error } = await query.order('generated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async generateCoupon(clientId, prizeName) {
    const { data, error } = await supabase
      .from('coupons')
      .insert([{ client_id: clientId, prize_name: prizeName, status: 'UNUSED' }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async submitStaffReview(staffId, rating, comment) {
    const { data, error } = await supabase
      .from('staff_reviews')
      .insert([{ staff_id: staffId, rating: Number(rating), comment }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getStaffReviews(staffId = null) {
    let query = supabase.from('staff_reviews').select('*');
    if (staffId) {
      query = query.eq('staff_id', staffId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getWhatsAppNumber() {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'whatsapp_business_number')
      .single();
    if (error || !data?.value) return '584129206984';
    return data.value;
  }
};
