import { supabase } from '../supabase.js';
import { sendMessage, isWhatsAppReady } from '../bot.js';
import { renderTemplate } from '../utils/messageTemplates.js';

const RECURRENCE_TEMPLATE = 'Hola {{nombre}}! Ya es momento de renovar tu corte. Te esperamos en Panda Barber Studio.';
const RECURRENCE_DAYS = 30;

export async function sendRecurrenceMessages() {
  if (!isWhatsAppReady()) {
    console.error('[Recurrence] WhatsApp not ready');
    return { success: false, sent: 0 };
  }

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RECURRENCE_DAYS);
    const cutoffISO = cutoffDate.toISOString();

    const { data: clients, error } = await supabase
      .from('clients')
      .select('id, name, phone, last_visit')
      .not('phone', 'is', null)
      .not('last_visit', 'is', null)
      .lt('last_visit', cutoffISO);

    if (error) {
      console.error('[Recurrence] Query error:', error.message);
      return { success: false, sent: 0 };
    }

    console.log(`[Recurrence] Found ${clients?.length || 0} clients eligible for reminder`);

    let sent = 0;
    for (const client of (clients || [])) {
      const message = renderTemplate(RECURRENCE_TEMPLATE, { nombre: client.name });
      const result = await sendMessage(client.phone, message);
      if (result.success) sent++;
    }

    console.log(`[Recurrence] Sent ${sent} messages`);
    return { success: true, sent };
  } catch (err) {
    console.error('[Recurrence] Error:', err.message);
    return { success: false, sent: 0 };
  }
}
