import { supabase as anonClient, authClient } from '../lib/supabase';
const supabase = authClient || anonClient;
import { notificationService } from './notificationService';

// ─── Smart In-Memory Cache ────────────────────────────────────────────────────
// Reduces redundant Supabase calls from ~35+ per session to ~8.
// Static data (inventory, clients, staff, services, extras) caches 45s.
// Operational data (appointments) caches 15s since it changes more often.
const _cache = {};
const STAFF_PUBLIC_SELECT = 'id, auth_user_id, email, name, role, commission_pct, active, created_at, image_url, phone, address, username, tools, washing_rate, birth_date, skipped_count, specialty, badge, biography, payroll_frequency';

function _cacheGet(key) {
  const entry = _cache[key];
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    delete _cache[key];
    return null;
  }
  return entry.data;
}

function _cacheSet(key, data, ttlMs = 45000) {
  _cache[key] = { data, expiresAt: Date.now() + ttlMs };
}

function _cacheInvalidate(...keys) {
  keys.forEach(k => delete _cache[k]);
}

function _cacheInvalidateAppts() {
  Object.keys(_cache).filter(k => k.startsWith('appts_')).forEach(k => delete _cache[k]);
}

function _asArray(value) {
  return Array.isArray(value) ? value : [];
}

function _normalizeAppointment(app) {
  if (!app || typeof app !== 'object') return app;

  return {
    ...app,
    clients: app.clients ? {
      ...app.clients,
      work_gallery: _asArray(app.clients.work_gallery)
    } : app.clients,
    services: app.services ? {
      ...app.services,
      included_items: _asArray(app.services.included_items)
    } : app.services,
    appointment_extras: _asArray(app.appointment_extras),
    appointment_products: _asArray(app.appointment_products),
    appointment_staff: _asArray(app.appointment_staff)
  };
}

function _normalizeStaff(member) {
  if (!member || typeof member !== 'object') return member;

  return {
    ...member,
    tools: _asArray(member.tools)
  };
}
// ─────────────────────────────────────────────────────────────────────────────

export const dataService = {
  supabase: anonClient,
  // Clients
  async getClients() {
    const cached = _cacheGet('clients');
    if (cached) return cached;

    const { data, error } = await supabase
      .from('clients')
      .select('*, appointments(status, total_price)')
      .order('name');

    if (error) throw error;

    const result = _asArray(data).map(client => {
      const validApps = _asArray(client.appointments).filter(a => ['Completado', 'En Silla', 'Por Pagar'].includes(a.status));
      return {
        ...client,
        total_visits: validApps.length,
        total_spent: validApps.reduce((acc, a) => acc + (Number(a.total_price) || 0), 0)
      };
    });
    _cacheSet('clients', result, 45000);
    return result;
  },

  // Lightweight clients list — no joins, fast for initial load
  async getClientsLite() {
    const cached = _cacheGet('clients_lite');
    if (cached) return cached;
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name');
    if (error) throw error;
    const result = _asArray(data).map(c => ({ ...c, total_visits: 0, total_spent: 0 }));
    _cacheSet('clients_lite', result, 45000);
    return result;
  },

  async addClient(client) {
    _cacheInvalidate('clients');
    const allowedColumns = [
      'name', 'phone', 'id_card', 'email', 'status', 'points', 'last_visit', 'work_gallery'
    ];
    const filtered = {};
    allowedColumns.forEach(col => {
      if (client[col] !== undefined) {
        filtered[col] = client[col];
      }
    });

    const { data, error } = await supabase
      .from('clients')
      .insert([filtered])
      .select()
      .single();
    if (error) throw error;

    // Notificar registro de nuevo cliente
    try {
      notificationService.sendNotification(
        'Nuevo Cliente Registrado 👤',
        `Se ha registrado a ${data.name || 'un nuevo cliente'} (Tlf: ${data.phone || 'No registrado'}) en el sistema.`
      );
    } catch (e) {
      console.error('Error al enviar notificacion de cliente nuevo:', e);
    }

    return data;
  },

  async checkClientExists(idCard) {
    const { data, error } = await supabase
      .from('clients')
      .select('id, name')
      .eq('id_card', idCard);

    if (error) throw error;
    return _asArray(data).length > 0 ? data[0] : null;
  },

  async updateClient(id, updates) {
    _cacheInvalidate('clients');
    _cacheInvalidateAppts();
    const allowedColumns = [
      'name', 'phone', 'id_card', 'email', 'status', 'points', 'last_visit', 'work_gallery'
    ];
    const filtered = {};
    allowedColumns.forEach(col => {
      if (updates[col] !== undefined) {
        filtered[col] = updates[col];
      }
    });

    const { data, error } = await supabase
      .from('clients')
      .update(filtered)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteClient(id) {
    _cacheInvalidate('clients');
    // 1. Get all appointments for this client
    const { data: apps } = await supabase
      .from('appointments')
      .select('id')
      .eq('client_id', id);

    if (apps && apps.length > 0) {
      const appIds = _asArray(apps).map(a => a.id);

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
    const cached = _cacheGet('staff');
    if (cached) return cached;

    const client = authClient || supabase;
    const { data, error } = await client
      .from('staff')
      .select(STAFF_PUBLIC_SELECT)
      .order('name');
    if (error) throw error;
    const result = _asArray(data).map(_normalizeStaff).filter(s => !s.role?.startsWith('ARCHIVED|'));
    _cacheSet('staff', result, 45000);
    return result;
  },

  async getStaffByAuthUserId(authUserId) {
    // Use authClient (service role) to bypass RLS on the staff table.
    // This is safe because it's an internal CRM auth lookup and the user
    // has already passed Supabase authentication.
    const client = authClient || supabase;
    const { data, error } = await client
      .from('staff')
      .select(STAFF_PUBLIC_SELECT)
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    if (error) throw error;
    if (!data || data.role?.startsWith('ARCHIVED|')) return null;
    return _normalizeStaff(data);
  },

  async createAuthUser(email, password) {
    const isServiceKeyPresent = !!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    if (isServiceKeyPresent && authClient?.auth?.admin) {
      const { data, error } = await authClient.auth.admin.createUser({
        email: String(email || '').trim().toLowerCase(),
        password,
        email_confirm: true
      });
      if (error) throw error;
      return data.user;
    } else {
      const { data, error } = await authClient.auth.signUp({
        email: String(email || '').trim().toLowerCase(),
        password
      });
      if (error) throw error;
      return data.user;
    }
  },

  async updateAuthUserPassword(authUserId, password) {
    const isServiceKeyPresent = !!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    if (isServiceKeyPresent && authClient?.auth?.admin) {
      const { data, error } = await authClient.auth.admin.updateUserById(
        authUserId,
        { password }
      );
      if (error) throw error;
      return data.user;
    } else {
      throw new Error("Se requiere la clave de servicio de Supabase para restablecer contraseñas.");
    }
  },

  async deleteAuthUser(authUserId) {
    const isServiceKeyPresent = !!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    if (isServiceKeyPresent && authClient?.auth?.admin) {
      const { error } = await authClient.auth.admin.deleteUser(authUserId);
      if (error) throw error;
    }
  },

  async addStaff(member) {
    _cacheInvalidate('staff');
    const { data, error } = await supabase
      .from('staff')
      .insert([member])
      .select(STAFF_PUBLIC_SELECT)
      .single();
    if (error) throw error;
    return data;
  },

  async updateStaff(id, updates) {
    _cacheInvalidate('staff');
    const { data, error } = await supabase
      .from('staff')
      .update(updates)
      .eq('id', id)
      .select(STAFF_PUBLIC_SELECT)
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

    _asArray(staffRecords).forEach(record => {
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
      totalAppointments: _asArray(staffRecords).length,
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
      .select(STAFF_PUBLIC_SELECT)
      .single();
    if (error) throw error;
    return data;
  },

  async deleteStaff(id) {
    _cacheInvalidate('staff');
    // 1. Fetch current staff to preserve their role info and get auth_user_id
    const { data: member } = await supabase
      .from('staff')
      .select('role, auth_user_id')
      .eq('id', id)
      .single();

    if (!member) return;

    // 2. Delete auth user if exists
    if (member.auth_user_id) {
      const isServiceKeyPresent = !!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
      if (isServiceKeyPresent && authClient?.auth?.admin) {
        await authClient.auth.admin.deleteUser(member.auth_user_id);
      }
    }

    // 3. Archive staff record
    const { error } = await supabase
      .from('staff')
      .update({ role: `ARCHIVED|${member.role}` })
      .eq('id', id);

    if (error) throw error;
  },

  // Services

  async getServices() {
    const cached = _cacheGet('services');
    if (cached) return cached;

    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('name');

    if (error) throw error;
    const result = _asArray(data).filter(s => !s.name?.startsWith('ARCHIVED|'));
    _cacheSet('services', result, 45000);
    return result;
  },

  async addService(service) {
    _cacheInvalidate('services');
    const allowedColumns = [
      'name', 'price', 'duration', 'active', 'category',
      'commission_barber', 'commission_washer', 'commission_cashier', 'commission_receptionist',
      'included_items'
    ];
    const filtered = {};
    allowedColumns.forEach(col => {
      if (service[col] !== undefined) {
        filtered[col] = service[col];
      }
    });

    const { data, error } = await supabase
      .from('services')
      .insert([filtered])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateService(id, updates) {
    _cacheInvalidate('services');
    const allowedColumns = [
      'name', 'price', 'duration', 'active', 'category',
      'commission_barber', 'commission_washer', 'commission_cashier', 'commission_receptionist',
      'included_items'
    ];
    const filtered = {};
    allowedColumns.forEach(col => {
      if (updates[col] !== undefined) {
        filtered[col] = updates[col];
      }
    });

    const { data, error } = await supabase
      .from('services')
      .update(filtered)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteService(id) {
    _cacheInvalidate('services');
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
    const cached = _cacheGet('extras');
    if (cached) return cached;

    const { data, error } = await supabase.from('service_extras').select('*').order('name');
    if (error) throw error;
    const result = _asArray(data).filter(e =>
      !e.name?.startsWith('ARCHIVED|') &&
      !e.name?.startsWith('SYSTEM_CATEGORY:') &&
      !e.name?.startsWith('SYSTEM_STRATEGY:') &&
      e.name !== 'SYSTEM_CONFIG_RATES'
    );
    _cacheSet('extras', result, 45000);
    return result;
  },

  // Categories
  async getServiceCategories() {
    const { data, error } = await supabase
      .from('service_extras')
      .select('*')
      .order('name');
    if (error) throw error;

    const categories = _asArray(data)
      .filter(e => e.name?.startsWith('SYSTEM_CATEGORY:'))
      .map(e => {
        const fullString = e.name.replace('SYSTEM_CATEGORY:', '');
        const parts = fullString.split('|');
        const name = parts[0];
        const icon = parts[1] || '';
        return { name, icon };
      })
      .filter((cat, idx, arr) => arr.findIndex(c => c.name === cat.name) === idx);

    if (categories.length === 0) {
      // Seed default categories
      const defaults = [
        { name: 'Barbería', icon: 'Scissors' },
        { name: 'Estilismo', icon: 'Rocket' },
        { name: 'Tratamientos', icon: 'Droplets' }
      ];
      await Promise.all(
        defaults.map(cat =>
          supabase.from('service_extras').insert([{ name: 'SYSTEM_CATEGORY:' + cat.name + '|' + cat.icon, price: 0, cost: 0 }])
        )
      );
      return defaults;
    }
    return categories;
  },

  async addServiceCategory(name, icon) {
    const fullName = 'SYSTEM_CATEGORY:' + name + '|' + (icon || 'Zap');
    const { error } = await supabase
      .from('service_extras')
      .insert([{ name: fullName, price: 0, cost: 0 }])
      .select()
      .single();
    if (error) throw error;
    return { name, icon: icon || 'Zap' };
  },

  async deleteServiceCategory(name, icon) {
    const fullName = 'SYSTEM_CATEGORY:' + name + (icon ? '|' + icon : '');
    const { error } = await supabase
      .from('service_extras')
      .delete()
      .eq('name', fullName);
    if (error) throw error;

    if (icon) {
      await supabase
        .from('service_extras')
        .delete()
        .eq('name', 'SYSTEM_CATEGORY:' + name);
    }
  },

  async updateServiceCategory(oldName, oldIcon, newName, newIcon) {
    const oldFullName = 'SYSTEM_CATEGORY:' + oldName + (oldIcon ? '|' + oldIcon : '');
    const newFullName = 'SYSTEM_CATEGORY:' + newName + '|' + (newIcon || 'Zap');
    
    const { data, error } = await supabase
      .from('service_extras')
      .update({ name: newFullName })
      .eq('name', oldFullName)
      .select();
      
    if (error) throw error;
    
    if (!data || data.length === 0) {
      const { error: fallbackError } = await supabase
        .from('service_extras')
        .update({ name: newFullName })
        .eq('name', 'SYSTEM_CATEGORY:' + oldName);
      if (fallbackError) throw fallbackError;
    }
    
    if (oldName !== newName) {
      const { error: serviceError } = await supabase
        .from('services')
        .update({ category: newName })
        .eq('category', oldName);
      if (serviceError) console.error('Error updating services category link:', serviceError);
    }
    
    return { name: newName, icon: newIcon };
  },

  // Strategies
  async getServiceStrategies() {
    const { data, error } = await supabase
      .from('service_extras')
      .select('*')
      .order('name');
    if (error) throw error;

    const strategies = _asArray(data)
      .filter(e => e.name?.startsWith('SYSTEM_STRATEGY:'))
      .map(e => {
        const parts = e.name.replace('SYSTEM_STRATEGY:', '').split(':');
        return {
          value: parts[0] || '',
          label: parts[1] || parts[0] || ''
        };
      });

    if (strategies.length === 0) {
      // Seed default strategies
      const defaults = [
        { value: 'MVP', label: 'MVP (Estrella)' },
        { value: 'Entrada', label: 'Comodín Entrada' },
        { value: 'Upsell', label: 'Comodín Upsell' },
        { value: 'Mantenimiento', label: 'Mantenimiento' },
        { value: 'Rápido', label: 'Rápido' },
        { value: 'Promo', label: 'Promo' }
      ];
      await Promise.all(
        defaults.map(strat =>
          supabase.from('service_extras').insert([{ name: `SYSTEM_STRATEGY:${strat.value}:${strat.label}`, price: 0, cost: 0 }])
        )
      );
      return defaults;
    }
    return strategies;
  },

  async addServiceStrategy(value, label) {
    const { error } = await supabase
      .from('service_extras')
      .insert([{ name: `SYSTEM_STRATEGY:${value}:${label}`, price: 0, cost: 0 }])
      .select()
      .single();
    if (error) throw error;
    return { value, label };
  },

  async deleteServiceStrategy(value) {
    const { data, error: selectError } = await supabase
      .from('service_extras')
      .select('name')
      .order('name');
    if (selectError) throw selectError;

    const matching = _asArray(data).filter(e => e.name?.startsWith(`SYSTEM_STRATEGY:${value}:`));
    if (matching.length > 0) {
      await Promise.all(
        matching.map(e =>
          supabase.from('service_extras').delete().eq('name', e.name)
        )
      );
    }
  },

  async addExtra(extra) {
    _cacheInvalidate('extras');
    const { data, error } = await supabase.from('service_extras').insert([extra]).select().single();
    if (error) throw error;
    return data;
  },

  async updateExtra(id, updates) {
    _cacheInvalidate('extras');
    const { data, error } = await supabase.from('service_extras').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteExtra(id) {
    _cacheInvalidate('extras');
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
    _cacheInvalidateAppts();
    const { data, error } = await supabase.from('appointment_extras').insert([{ appointment_id: appointmentId, extra_id: extraId, price }]).select().single();
    if (error) throw error;
    return data;
  },

  async updateAppointmentExtraPrice(id, price) {
    _cacheInvalidateAppts();
    const { data, error } = await supabase.from('appointment_extras').update({ price }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async getAppointmentExtras(appointmentId) {
    const { data, error } = await supabase.from('appointment_extras').select('*, service_extras(*)').eq('appointment_id', appointmentId);
    if (error) throw error;
    return _asArray(data);
  },

  async removeExtraFromAppointment(id) {
    _cacheInvalidateAppts();
    const { error } = await supabase.from('appointment_extras').delete().eq('id', id);
    if (error) throw error;
  },

  async addProductToAppointment(appointmentId, productId, quantity, price) {
    _cacheInvalidateAppts();
    const { data, error } = await supabase.from('appointment_products').insert([{ appointment_id: appointmentId, product_id: productId, quantity, price }]).select().single();
    if (error) throw error;
    return data;
  },

  async updateAppointmentProductQuantity(id, quantity) {
    _cacheInvalidateAppts();
    const { data, error } = await supabase.from('appointment_products').update({ quantity }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async getAppointmentProducts(appointmentId) {
    const { data, error } = await supabase.from('appointment_products').select('*, inventory(*)').eq('appointment_id', appointmentId);
    if (error) throw error;
    return _asArray(data);
  },

  async removeProductFromAppointment(id) {
    _cacheInvalidateAppts();
    const { error } = await supabase.from('appointment_products').delete().eq('id', id);
    if (error) throw error;
  },

  // Service Checklist Items
  async getChecklistItems() {
    const { data, error } = await authClient
      .from('service_checklist_items')
      .select('*')
      .order('name');
    if (error) throw error;
    return _asArray(data);
  },

  async addChecklistItem(name, base_cost = 0) {
    const { data, error } = await authClient
      .from('service_checklist_items')
      .insert([{ name, base_cost }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteChecklistItem(id) {
    const { error } = await authClient
      .from('service_checklist_items')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async updateChecklistItem(id, updates) {
    const { data, error } = await authClient
      .from('service_checklist_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Transactions (Finance)
  async getTransactions(startDate = null) {
    const cacheKey = 'transactions' + (startDate ? `_${startDate}` : '');
    const cached = _cacheGet(cacheKey);
    if (cached) return cached;
    let query = supabase.from('transactions').select('*');
    if (startDate) query = query.gte('created_at', startDate);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    const result = _asArray(data);
    _cacheSet(cacheKey, result, 15000);
    return result;
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

    return _asArray(apps).map(app => {
      // Find the specific transaction for this appointment if it exists
      const relatedTx = _asArray(txs).find(t => t.metadata?.appointment_id === app.id);

      return {
        id: app.id,
        created_at: app.created_at || relatedTx?.created_at || app.started_at || app.scheduled_at || new Date().toISOString(),
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
    return _asArray(data).map(record => ({
      ...record,
      appointments: _normalizeAppointment(record.appointments)
    }));
  },

  async addTransaction(transaction) {
    _cacheInvalidate('transactions');
    const { data, error } = await supabase
      .from('transactions')
      .insert([{ created_at: new Date().toISOString(), ...transaction }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Inventory
  async getInventory(type = 'barbershop', staffId = null) {
    const cacheKey = `inventory_${type}_${staffId || 'all'}`;
    const cached = _cacheGet(cacheKey);
    if (cached) return cached;

    let query = supabase
      .from('inventory')
      .select('*')
      .eq('inventory_type', type)
      .order('name');
    
    if (type === 'personal' && staffId) {
      query = query.eq('owner_staff_id', staffId);
    }

    const { data, error } = await query;
    if (error) throw error;
    const result = _asArray(data);
    _cacheSet(cacheKey, result, 45000);
    return result;
  },

  async addInventoryItem(item) {
    _cacheInvalidate('inventory');
    // Ensure default type if not provided
    if (!item.inventory_type) item.inventory_type = 'barbershop';
    
    const { data, error } = await supabase
      .from('inventory')
      .insert([item])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateInventoryItem(id, updates) {
    _cacheInvalidate('inventory');
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
    _cacheInvalidate('inventory');
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async updateStock(id, newStock) {
    _cacheInvalidate('inventory');
    const { data, error } = await supabase
      .from('inventory')
      .update({ stock: newStock, last_updated: new Date().toISOString() })
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
    const cached = _cacheGet('inventory_movements');
    if (cached) return cached;
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*, inventory(name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return _asArray(data);
  },

  // Appointments (Operational States)
  async getAppointmentsByState(states = [], startDate = null) {
    // Cache key based on the states array and startDate
    const cacheKey = 'appts_' + [...states].sort().join(',') + (startDate ? `_${startDate}` : '');
    const cached = _cacheGet(cacheKey);
    if (cached) return cached;

    let query = supabase.from('appointments').select(`
      *, 
      clients(id, name, phone, id_card, work_gallery), 
      services(name, price, included_items, commission_barber, commission_washer, commission_cashier, commission_receptionist),
      staff(id, name, email, role, username, image_url, commission_pct, washing_rate),
      appointment_extras(id, price, service_extras(id, name)),
      appointment_products(id, quantity, price, inventory(id, name)),
      appointment_staff(*, staff(name, role))
    `);
    if (states.length > 0) query = query.in('status', states);
    if (startDate) query = query.gte('created_at', startDate);
    const { data, error } = await query.order('created_at', { ascending: true });
    if (error) throw error;
    // Short TTL: appointments change frequently
    const result = _asArray(data).map(_normalizeAppointment);
    _cacheSet(cacheKey, result, 15000);
    return result;
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
    return _asArray(data).map(_normalizeAppointment);
  },

  async createAppointment(appointment) {
    // Invalidate all appointment caches
    _cacheInvalidateAppts();
    const { data, error } = await supabase
      .from('appointments')
      .insert([{
        created_at: new Date().toISOString(),
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
    _cacheInvalidateAppts();
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
    _cacheInvalidateAppts();
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

    // Handle queue status transitions (push to end of queue when starting/finishing a service)
    if (data && data.staff_id) {
      if (newStatus === 'En Silla') {
        await this.updateQueueStatus(data.staff_id, 'BUSY').catch(e => console.error("Error setting queue busy:", e));
      } else if (newStatus === 'Completado' || newStatus === 'Por Pagar') {
        await this.updateQueueStatus(data.staff_id, 'AVAILABLE').catch(e => console.error("Error setting queue available:", e));
      }
    }

    // Notificar al barbero en tiempo real si el cliente pasa a la silla
    if (newStatus === 'En Silla') {
      try {
        const { data: appDetails } = await supabase
          .from('appointments')
          .select('*, clients(name), services(name, included_items)')
          .eq('id', id)
          .single();

        if (appDetails && appDetails.staff_id) {
          const clientName = appDetails.clients?.name || 'Cliente';
          const serviceName = appDetails.services?.name || 'Servicio';
          const includedList = Array.isArray(appDetails.services?.included_items) && appDetails.services.included_items.length > 0
            ? ` (Incluye: ${appDetails.services.included_items.join(', ')})`
            : '';

          notificationService.broadcastNotification(
            supabase,
            '💈 Nuevo Cliente en Silla',
            `Hey, te toca atender a ${clientName} para el servicio: ${serviceName}${includedList}.`,
            { recipientId: appDetails.staff_id, recipientRole: 'Barbero' }
          );
        }
      } catch (e) {
        console.error('Error al enviar notificacion de cliente en silla:', e);
      }
    }

    return data;
  },

  async assignAssistantToAppointment(appointmentId, assistantId) {
    _cacheInvalidateAppts();
    // Delete any existing washer records for this appointment in appointment_staff to avoid duplicates
    const { data: staffList } = await supabase
      .from('appointment_staff')
      .select('id, staff(role)')
      .eq('appointment_id', appointmentId);

    if (staffList) {
      const toDelete = staffList.filter(s => s.staff?.role?.includes('Asistente de Lavado')).map(s => s.id);
      if (toDelete.length > 0) {
        await supabase.from('appointment_staff').delete().in('id', toDelete);
      }
    }

    // Insert the new assistant record
    const { data, error } = await supabase
      .from('appointment_staff')
      .insert([{
        appointment_id: appointmentId,
        staff_id: assistantId,
        commission_earned: 0,
        product_commission: 0,
        tip_amount: 0
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteAppointment(id) {
    _cacheInvalidateAppts();
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  async deleteAppointmentExtra(id) {
    _cacheInvalidateAppts();
    const { error } = await supabase
      .from('appointment_extras')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  async deleteAppointmentProduct(id) {
    _cacheInvalidateAppts();
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
        services(price, commission_barber),
        appointment_extras(price),
        appointment_products(quantity, price, inventory(id, name, commission_pct)),
        appointment_staff(staff_id, commission_earned, product_commission, tip_amount)
      `)
      .eq('staff_id', staffId)
      .gte('created_at', today)
      .in('status', ['En Silla', 'Por Pagar', 'Completado']);

    if (error) throw error;

    let totalUsd = 0;
    let earningsUsd = 0;
    let tipsUsd = 0;
    const apps = _asArray(data).map(_normalizeAppointment);
    let serviceCount = apps.length;

    apps.forEach(app => {
      const sPrice = app.services?.price || 0;
      const ePrice = app.appointment_extras?.reduce((sum, e) => sum + (e.price || 0), 0) || 0;
      const pPrice = app.appointment_products?.reduce((sum, p) => sum + ((p.price || 0) * (p.quantity || 1)), 0) || 0;
      totalUsd += (sPrice + ePrice + pPrice);

      const myStaffRecord = app.appointment_staff?.find(as => String(as.staff_id) === String(staffId));
      if (myStaffRecord) {
        earningsUsd += Number(myStaffRecord.commission_earned || 0) + Number(myStaffRecord.product_commission || 0) + Number(myStaffRecord.tip_amount || 0);
        tipsUsd += Number(myStaffRecord.tip_amount || 0);
      } else {
        const pct = app.services?.commission_barber ?? 40;
        const serviceComm = sPrice * (pct / 100);
        const productsComm = app.appointment_products?.reduce((sum, pr) => {
          const pCommPct = typeof pr.inventory?.commission_pct === 'number' ? pr.inventory.commission_pct : 10;
          return sum + ((pr.price || 0) * (pr.quantity || 1) * (pCommPct / 100));
        }, 0) || 0;
        earningsUsd += (serviceComm + productsComm);
      }
    });

    return { productionUsd: totalUsd, services: serviceCount, earningsUsd: earningsUsd, tipsUsd: tipsUsd };
  },

  // Final Checkout Logic
  async processFinalPayment(paymentRecord) {
    // 1. Mark appointments as completed
    if (paymentRecord.appointmentIds && paymentRecord.appointmentIds.length > 0) {
      for (const appId of paymentRecord.appointmentIds) {
        await this.updateAppointmentStatus(appId, 'Completado');
      }
    } else if (paymentRecord.appointmentId) {
      await this.updateAppointmentStatus(paymentRecord.appointmentId, 'Completado');
    }

    // 2. Register commissioners (Staff involved)
    if (paymentRecord.staffInvolved && paymentRecord.staffInvolved.length > 0) {
      const primaryAppId = paymentRecord.appointmentId || paymentRecord.appointmentIds?.[0] || null;

      // Delete any temporary/placeholder staff records for these appointments to prevent duplicates
      if (paymentRecord.appointmentIds && paymentRecord.appointmentIds.length > 0) {
        await supabase.from('appointment_staff').delete().in('appointment_id', paymentRecord.appointmentIds);
      } else if (primaryAppId) {
        await supabase.from('appointment_staff').delete().eq('appointment_id', primaryAppId);
      }

      const staffRecords = paymentRecord.staffInvolved
        .filter(s => s.staffId) // Only if there is a staff member
        .map(s => ({
          appointment_id: primaryAppId,
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
      category: 'Ventas Panda',
      exchange_rate: Number(paymentRecord.fixedRate),
      currency: 'EUR',
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

    

    return true;
  },

  // EURO BCV + Dolar BCV Exchange Rates (Auto from DolarApi)
  async getExchangeRates() {
    try {
      const [usdRes, eurRes] = await Promise.all([
        fetch('https://ve.dolarapi.com/v1/dolares'),
        fetch('https://ve.dolarapi.com/v1/euros')
      ]);
      if (!usdRes.ok || !eurRes.ok) throw new Error('Rates not available');
      const usdData = await usdRes.json();
      const eurData = await eurRes.json();

      const bcvRate = usdData.find(r => r.fuente === 'oficial');
      const euroRate = eurData.find(r => r.fuente === 'oficial');

      return {
        bcv: bcvRate?.promedio || 0,
        euro: euroRate?.promedio || 0,
        updated_at: bcvRate?.fechaActualizacion || new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      return { bcv: 36.5, euro: 42.0, updated_at: null, error: true };
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
        const defaultRates = { name: 'SYSTEM_CONFIG_RATES', price: 58.00, cost: 70.00 };
        const { data: newData, error: insertError } = await supabase.from('service_extras').insert([defaultRates]).select();
        if (insertError) throw insertError;
        return { shop: newData[0].price, euro: newData[0].cost };
      }

      return { shop: data[0].price, euro: data[0].cost };
    } catch (err) {
      console.error('Error getting global rates:', err);
      return { shop: 58.00, euro: 70.00 };
    }
  },

  async updateGlobalRates(rates) {
    const { data, error } = await supabase
      .from('service_extras')
      .update({ price: rates.shop, cost: rates.euro })
      .eq('name', 'SYSTEM_CONFIG_RATES')
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      // If for some reason it was deleted, recreate it
      const defaultRates = { name: 'SYSTEM_CONFIG_RATES', price: rates.shop, cost: rates.euro };
      await supabase.from('service_extras').insert([defaultRates]);
      return { shop: rates.shop, euro: rates.euro };
    }
    return { shop: data[0].price, euro: data[0].cost };
  },

  // FIFO Turn Queue Management
  async getTurnQueue() {
    const { data, error } = await supabase
      .from('turn_queue')
      .select('*, staff(*)')
      .order('position');
    if (error) throw error;
    return _asArray(data);
  },

  async checkInBarber(staffId) {
    const { data: existing, error: err } = await supabase
      .from('turn_queue')
      .select('*')
      .eq('staff_id', staffId)
      .maybeSingle();
    if (err) throw err;
    if (existing) {
      if (existing.status !== 'AVAILABLE') {
        const { data, error } = await supabase
          .from('turn_queue')
          .update({ status: 'AVAILABLE' })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      return existing;
    }

    const { data: maxPosData, error: maxErr } = await supabase
      .from('turn_queue')
      .select('position')
      .order('position', { ascending: false })
      .limit(1);
    if (maxErr) throw maxErr;
    const nextPos = (maxPosData && maxPosData.length > 0) ? (maxPosData[0].position + 1) : 1;

    const { data, error } = await supabase
      .from('turn_queue')
      .insert([{ staff_id: staffId, position: nextPos, status: 'AVAILABLE' }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async skipTurn(staffId) {
    const { data: queue, error: getErr } = await supabase
      .from('turn_queue')
      .select('*')
      .order('position');
    if (getErr) throw getErr;

    const skippedIndex = queue.findIndex(q => q.staff_id === staffId);
    if (skippedIndex === -1) return;

    const skippedItem = queue[skippedIndex];
    const maxPos = queue.length;

    // Increment skipped count in staff table
    try {
      const { data: currentStaff } = await supabase
        .from('staff')
        .select('skipped_count')
        .eq('id', staffId)
        .maybeSingle();
      const currentCount = currentStaff?.skipped_count || 0;
      await supabase
        .from('staff')
        .update({ skipped_count: currentCount + 1 })
        .eq('id', staffId);
      _cacheInvalidate('staff');
    } catch (e) {
      console.error("Error incrementing skipped count:", e);
    }

    const updates = [];
    let currentPos = 1;
    for (let i = 0; i < queue.length; i++) {
      if (i === skippedIndex) continue;
      updates.push({ id: queue[i].id, staff_id: queue[i].staff_id, position: currentPos, status: queue[i].status });
      currentPos++;
    }
    updates.push({ id: skippedItem.id, staff_id: skippedItem.staff_id, position: maxPos, status: 'ABSENT' });

    for (let i = 0; i < updates.length; i++) {
      await supabase.from('turn_queue').update({ position: -updates[i].position }).eq('id', updates[i].id);
    }
    for (let i = 0; i < updates.length; i++) {
      await supabase.from('turn_queue').update({ position: updates[i].position, status: updates[i].status }).eq('id', updates[i].id);
    }
  },

  async updateQueueStatus(staffId, status) {
    const { data: queue, error: getErr } = await supabase
      .from('turn_queue')
      .select('*')
      .order('position');
    if (getErr) throw getErr;

    const targetIndex = queue.findIndex(q => q.staff_id === staffId);
    if (targetIndex === -1) {
      // If not in queue, just try to update status directly
      const { data, error } = await supabase
        .from('turn_queue')
        .update({ status })
        .eq('staff_id', staffId)
        .select();
      if (error) throw error;
      return data;
    }

    const targetItem = queue[targetIndex];
    const maxPos = queue.length;

    const updates = [];
    let currentPos = 1;
    for (let i = 0; i < queue.length; i++) {
      if (i === targetIndex) continue;
      updates.push({ id: queue[i].id, staff_id: queue[i].staff_id, position: currentPos, status: queue[i].status });
      currentPos++;
    }

    // Append target item at the end of the queue with new status
    updates.push({ id: targetItem.id, staff_id: targetItem.staff_id, position: maxPos, status: status });

    // Update in database using negative positions first to avoid unique key constraint
    for (let i = 0; i < updates.length; i++) {
      await supabase.from('turn_queue').update({ position: -updates[i].position }).eq('id', updates[i].id);
    }
    for (let i = 0; i < updates.length; i++) {
      await supabase.from('turn_queue').update({ position: updates[i].position, status: updates[i].status }).eq('id', updates[i].id);
    }
    
    return updates;
  },

  async checkOutBarber(staffId) {
    const { error: deleteErr } = await supabase
      .from('turn_queue')
      .delete()
      .eq('staff_id', staffId);
    if (deleteErr) throw deleteErr;

    const { data: queue, error: getErr } = await supabase
      .from('turn_queue')
      .select('*')
      .order('position');
    if (getErr) throw getErr;

    for (let i = 0; i < queue.length; i++) {
      const newPos = i + 1;
      if (queue[i].position !== newPos) {
        await supabase
          .from('turn_queue')
          .update({ position: newPos })
          .eq('id', queue[i].id);
      }
    }
  },

  async getTopClientsOfMonth() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const isoString = thirtyDaysAgo.toISOString();

    const { data: txs, error } = await supabase
      .from('transactions')
      .select('metadata, amount, status, type, created_at')
      .eq('status', 'PAID')
      .eq('type', 'income')
      .gte('created_at', isoString);

    if (error) throw error;

    const counts = {};
    _asArray(txs).forEach(tx => {
      const clientId = tx.metadata?.client_id;
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
      const client = _asArray(clientsData).find(c => c.id === id);
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
  async addRoulettePrize(prizeName) {
    const { data, error } = await supabase.from('service_extras').insert([{ name: 'ROULETTE_PRIZE:' + prizeName, price: 0 }]).select();
    if (error) throw error;
    return data;
  },
  async removeRoulettePrize(id) {
    const { error } = await supabase.from('service_extras').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async getCoupons(clientId = null) {
    let query = supabase.from('coupons').select('*, clients:client_id(*)');
    if (clientId) {
      query = query.eq('client_id', clientId);
    }
    const { data, error } = await query.order('generated_at', { ascending: false });
    if (error) throw error;
    return _asArray(data);
  },

  async generateCoupon(clientId, prizeName) {
    const { data, error } = await supabase
      .from('coupons')
      .insert([{ client_id: clientId || null, prize_name: prizeName, status: 'UNUSED' }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateCoupon(couponId, newPrizeName) {
    const { data, error } = await supabase.from('coupons').update({ prize_name: newPrizeName }).eq('id', couponId).select().single();
    if (error) throw error;
    return data;
  },
  async deleteCoupon(couponId) {
    const { error } = await supabase.from('coupons').delete().eq('id', couponId);
    if (error) throw error;
    return true;
  },
  async assignCoupon(couponId, clientId) {
    const { data, error } = await supabase
      .from('coupons')
      .update({ client_id: clientId })
      .eq('id', couponId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async redeemCoupon(couponId) {
    const { data, error } = await supabase
      .from('coupons')
      .update({ status: 'USED', redeemed_at: new Date().toISOString() })
      .eq('id', couponId)
      .eq('status', 'UNUSED')
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getStaffTransactions(staffId, startDate = null, endDate = null) {
    let query = supabase
      .from('transactions')
      .select('id, client_id, created_at, amount, exchange_rate, currency, description, metadata')
      .eq('type', 'income')
      .contains('metadata', { staffInvolved: [{ staffId: String(staffId) }] });
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) throw error;
    const transactions = _asArray(data);
    const appointmentIds = Array.from(new Set(transactions.flatMap(transaction => [
      transaction.metadata?.appointment_id,
      ..._asArray(transaction.metadata?.appointmentIds)
    ]).filter(Boolean)));
    const clientIds = Array.from(new Set(transactions.map(transaction =>
      transaction.client_id || transaction.metadata?.client_id || transaction.metadata?.clientId
    ).filter(Boolean)));

    const [appointmentsResult, clientsResult] = await Promise.all([
      appointmentIds.length > 0
        ? supabase
            .from('appointments')
            .select(`
              id, client_id, staff_id, total_price, scheduled_at, completed_at,
              clients(id, name, phone, id_card),
              services(id, name, price),
              staff(id, name),
              appointment_extras(id, price, service_extras(id, name)),
              appointment_products(id, quantity, price, inventory(id, name))
            `)
            .in('id', appointmentIds)
        : Promise.resolve({ data: [], error: null }),
      clientIds.length > 0
        ? supabase.from('clients').select('id, name, phone, id_card').in('id', clientIds)
        : Promise.resolve({ data: [], error: null })
    ]);
    if (appointmentsResult.error) throw appointmentsResult.error;
    if (clientsResult.error) throw clientsResult.error;

    const appointmentsById = new Map(_asArray(appointmentsResult.data).map(appointment => [String(appointment.id), appointment]));
    const clientsById = new Map(_asArray(clientsResult.data).map(client => [String(client.id), client]));

    return transactions.map(transaction => {
      const transactionAppointmentIds = [
        transaction.metadata?.appointment_id,
        ..._asArray(transaction.metadata?.appointmentIds)
      ].filter(Boolean);
      const appointments = transactionAppointmentIds
        .map(id => appointmentsById.get(String(id)))
        .filter(Boolean);
      const clientId = transaction.client_id || transaction.metadata?.client_id || transaction.metadata?.clientId;
      const client = appointments.find(appointment => appointment.clients)?.clients
        || clientsById.get(String(clientId))
        || null;
      return {
        ...transaction,
        client,
        appointments
      };
    });
  },

  async getDailyEarningsForStaff(staffId) {
    const todayStr = new Date().toISOString().split('T')[0];
    const startOfToday = `${todayStr}T00:00:00.000Z`;
    const endOfToday = `${todayStr}T23:59:59.999Z`;

    const { data: staffMember, error: staffErr } = await supabase
      .from('staff')
      .select('role')
      .eq('id', staffId)
      .single();
    if (staffErr) throw staffErr;

    const roleLower = staffMember.role?.toLowerCase() || '';
    const isAssistant = roleLower.includes('asistente') || roleLower.includes('lavado') || roleLower.includes('operaciones');
    const isBarber = !isAssistant && (roleLower.includes('barbero') || roleLower.includes('barber') || roleLower.includes('socio') || roleLower.includes('estilista') || roleLower.includes('lider'));

    const { data: txs, error: txsErr } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', startOfToday)
      .lte('created_at', endOfToday);
    if (txsErr) throw txsErr;

    const serviceTransactions = txs.filter(t => t.type === 'income' && t.metadata?.staffInvolved?.some(x => String(x.staffId) === String(staffId)));
    const valesTransactions = txs.filter(t => t.type === 'expense' && t.category === 'Vales Barberos' && String(t.metadata?.staffId) === String(staffId));
    const payrollTransactions = txs.filter(t => t.type === 'expense' && t.category === 'Pago Nómina' && String(t.metadata?.staffId) === String(staffId));

    const earnedBs = serviceTransactions.reduce((sum, t) => {
      const s = t.metadata?.staffInvolved?.find(x => String(x.staffId) === String(staffId));
      return sum + (s ? (s.commissionBs || 0) + (s.productCommissionBs || 0) : 0);
    }, 0);

    const propinasBs = serviceTransactions.reduce((sum, t) => {
      const s = t.metadata?.staffInvolved?.find(x => String(x.staffId) === String(staffId));
      return sum + (s ? (s.tipBs || 0) : 0);
    }, 0);

    const valesBs = valesTransactions.reduce((sum, t) => sum + (t.metadata?.amountBs || 0), 0);
    const paidBs = payrollTransactions.reduce((sum, t) => sum + (t.metadata?.amountBs || 0) + (t.metadata?.deductionBs || 0), 0);

    let rate = 40.00;
    try {
      const rates = await this.getExchangeRates();
      if (rates && rates.bcv) rate = rates.bcv;
    } catch (e) {
      console.error('Error fetching rates inside getDailyEarningsForStaff:', e);
    }

    let grossIncomeBs = 0;
    let lavadosCount = 0;
    let lavadoDeductionBs = 0;
    let netIncomeBs = 0;

    if (isBarber) {
      grossIncomeBs = serviceTransactions.reduce((sum, t) => sum + ((t.amount || 0) * (t.exchange_rate || rate)), 0);
      lavadosCount = serviceTransactions.filter(t => t.metadata?.didWash).length;
      lavadoDeductionBs = lavadosCount * 1.00 * rate;
      netIncomeBs = earnedBs - lavadoDeductionBs;
    } else {
      netIncomeBs = earnedBs;
    }

    const balanceBs = netIncomeBs + propinasBs - valesBs - paidBs;

    return {
      earnedBs,
      propinasBs,
      valesBs,
      paidBs,
      lavadosCount,
      lavadoDeductionBs,
      netIncomeBs,
      balanceBs,
      rate
    };
  },


  async getStaffReviews(staffId = null) {
    let query = supabase.from('staff_reviews').select('*');
    if (staffId) {
      query = query.eq('staff_id', staffId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return _asArray(data);
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

  async resetDatabase() {
    if (import.meta.env.PROD || import.meta.env.VITE_ENABLE_DATABASE_RESET !== 'true') {
      throw new Error('Database reset is disabled outside explicit local maintenance mode.');
    }
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
  },

  // ==========================================
  // SYSTEM SETTINGS
  // ==========================================

  async getSystemSettings() {
    try {
      const { data, error } = await supabase.from('system_settings').select('*');
      if (error) throw error;
      const settingsObj = {};
      if (data) { data.forEach(item => { settingsObj[item.key] = item.value; }); }
      return settingsObj;
    } catch (error) { console.error('Error fetching system settings:', error); return {}; }
  },

  async updateSystemSetting(key, value) {
    try {
      const { data, error } = await supabase.from('system_settings').upsert({ key, value, updated_at: new Date().toISOString() }).select();
      if (error) throw error;
      return data;
    } catch (error) { console.error('Error updating setting:', error); throw error; }
  }
};
