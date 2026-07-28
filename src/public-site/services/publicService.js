import { publicSupabase as supabase, authClient } from '../../lib/supabase';

const normalizeIdCard = value => {
  const raw = String(value || '').trim().toUpperCase();
  const digits = raw.replace(/\D/g, '');
  return digits || raw.replace(/[^A-Z0-9]/g, '');
};

const normalizePhone = value => String(value || '').replace(/\D/g, '');

const findExistingClientRecord = async ({ id_card, email, phone }) => {
  const { data: clients, error } = await authClient
    .from('clients')
    .select('*, appointments(id)');

  if (error) throw error;

  const normalizedId = normalizeIdCard(id_card);
  if (normalizedId) {
    const identityMatches = (clients || []).filter(client =>
      normalizeIdCard(client.id_card) === normalizedId
    );

    if (identityMatches.length > 0) {
      return identityMatches.sort((a, b) => {
        const linkedDifference = Number(Boolean(b.auth_user_id)) - Number(Boolean(a.auth_user_id));
        if (linkedDifference !== 0) return linkedDifference;

        const historyDifference = (b.appointments?.length || 0) - (a.appointments?.length || 0);
        if (historyDifference !== 0) return historyDifference;

        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      })[0];
    }
  }

  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (normalizedEmail) {
    const emailMatch = (clients || []).find(client =>
      String(client.email || '').trim().toLowerCase() === normalizedEmail
    );
    if (emailMatch) return emailMatch;
  }

  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone) {
    return (clients || []).find(client =>
      normalizePhone(client.phone) === normalizedPhone
    ) || null;
  }

  return null;
};

const findRelatedClientRecords = async clientId => {
  const { data: clients, error } = await authClient
    .from('clients')
    .select('id, id_card, points, auth_user_id');

  if (error) throw error;

  const currentClient = (clients || []).find(client => String(client.id) === String(clientId));
  if (!currentClient) return [];

  const normalizedId = normalizeIdCard(currentClient.id_card);
  if (!normalizedId) return [currentClient];

  return (clients || []).filter(client =>
    normalizeIdCard(client.id_card) === normalizedId
  );
};

const linkClientRecord = async (existing, userId, incoming) => {
  if (existing.auth_user_id && String(existing.auth_user_id) !== String(userId)) {
    throw new Error('Esta cédula ya está vinculada a otra cuenta. Contacta a la barbería.');
  }

  const { data, error } = await authClient
    .from('clients')
    .update({
      auth_user_id: userId,
      name: existing.name || incoming.name,
      phone: existing.phone || incoming.phone,
      email: existing.email || incoming.email || null,
      birth_date: existing.birth_date || incoming.birth_date || null,
      status: existing.status || 'Activo'
    })
    .eq('id', existing.id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

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

  // Listen to auth state changes
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },

  // Get active staff (barbers)
  async getStaff() {
    const { data, error } = await supabase
      .from('staff')
      .select('id, name, role, image_url, active, specialty, badge, biography')
      .eq('active', true)
      .not('role', 'like', 'ARCHIVED|%')
      .order('name');
    if (error) throw error;
    return (data || []).filter(s => !s.role?.startsWith('ARCHIVED|'));
  },

  // Get portfolio photos for a specific staff member
  async getStaffPortfolio(staffId) {
    if (!staffId) return [];
    const { data, error } = await supabase
      .from('staff_portfolio')
      .select('id, image_url, created_at')
      .eq('staff_id', staffId)
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('Portfolio fetch error:', error.message);
      return [];
    }
    return data || [];
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
    // Return occupied time slots (hour:minute)
    return (data || []).map(a => {
      const d = new Date(a.scheduled_at);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    });
  },

  // Register new client
  async registerClient({ name, phone, id_card, email, password, birth_date }) {
    const effectiveEmail = email || `${phone}@pandabarber.app`;

    // Step 1: Try to create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: effectiveEmail,
      password: password,
      options: { data: { name, id_card } }
    });

    // If user already exists in Auth, sign them in to get their session
    let userId = authData?.user?.id;
    if (authError && authError.message?.toLowerCase().includes('already registered')) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: effectiveEmail,
        password: password
      });
      if (signInError) throw new Error('Este usuario ya existe. Intenta iniciar sesión.');
      userId = signInData?.user?.id;
    } else if (authError) {
      throw authError;
    }

    // Step 2: Check if client record already exists (by phone or email)
    const existing = await findExistingClientRecord({ id_card, email, phone });

    if (existing) {
      // Client record already exists — return it
      const linkedClient = await linkClientRecord(existing, userId, {
        name,
        phone,
        email,
        birth_date
      });
      return { user: { id: userId }, client: linkedClient, linkedExisting: true };
    }

    // Step 3: Insert new client record using service role (bypasses RLS)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    const res = await fetch(`${supabaseUrl}/rest/v1/clients`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        'Accept-Profile': 'pandabarber',
        'Content-Profile': 'pandabarber'
      },
      body: JSON.stringify({
        name,
        phone,
        id_card,
        email: email || null,
        birth_date: birth_date || null,
        auth_user_id: userId,
        points: 0,
        status: 'Activo'
      })
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody?.message || 'Error al crear el perfil del cliente.');
    }
    const [clientData] = await res.json();
    return { user: { id: userId }, client: clientData };
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
        redirectTo: `${window.location.origin}/`
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
    const existing = await findExistingClientRecord({ id_card, email, phone });

    if (existing) {
      // Update existing client
      return linkClientRecord(existing, user_id, {
        name,
        email,
        phone
      });
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

  // Check if client exists by email
  async getClientByEmail(email) {
    const { data, error } = await authClient
      .from('clients')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // Get client by phone
  async getClientByPhone(phone) {
    const { data, error } = await authClient
      .from('clients')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // Get client appointments
  async getClientAppointments(clientId) {
    const relatedClients = await findRelatedClientRecords(clientId);
    const relatedClientIds = relatedClients.map(client => client.id);
    if (relatedClientIds.length === 0) return [];

    const { data, error } = await authClient
      .from('appointments')
      .select('*, services(name, price), staff(name)')
      .in('client_id', relatedClientIds)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Create appointment
  async createAppointment({ client_id, service_id, staff_id, scheduled_at, beverage_selection, notes }) {
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
        beverage_selection: beverage_selection || null,
        notes: notes || null
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Get client points
  async getClientPoints(clientId) {
    const relatedClients = await findRelatedClientRecords(clientId);
    return relatedClients.reduce((total, client) => total + Number(client.points || 0), 0);
  },

  // Get top clients of the month
  async getTopClientsOfMonth() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const isoString = thirtyDaysAgo.toISOString();

    const { data: apps, error } = await supabase
      .from('appointments')
      .select('client_id, status, created_at')
      .in('status', ['Pagado', 'COMPLETED', 'Completado'])
      .gte('created_at', isoString);

    if (error) throw error;

    const counts = {};
    (apps || []).forEach(app => {
      const clientId = app.client_id;
      if (clientId) {
        counts[clientId] = (counts[clientId] || 0) + 1;
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

  // Get barber of the month (based on completed appointments total price in last 30 days)
  async getBarberOfMonth() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const isoString = thirtyDaysAgo.toISOString();

    const { data: apps, error } = await supabase
      .from('appointments')
      .select('staff_id, total_price')
      .eq('status', 'Completado')
      .gte('scheduled_at', isoString);

    if (error) throw error;

    const earnings = {};
    (apps || []).forEach(app => {
      if (app.staff_id) {
        earnings[app.staff_id] = (earnings[app.staff_id] || 0) + Number(app.total_price || 0);
      }
    });

    const sorted = Object.entries(earnings)
      .sort((a, b) => b[1] - a[1]);

    if (sorted.length === 0) return null;

    const topBarberId = sorted[0][0];
    const totalGenerated = sorted[0][1];

    const { data: barberData, error: staffErr } = await supabase
      .from('staff')
      .select('*')
      .eq('id', topBarberId)
      .single();

    if (staffErr) throw staffErr;

    return { ...barberData, total_generated: totalGenerated };
  }
};

