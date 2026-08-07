import { supabase } from '../supabase.js';
import { sendMessage, isWhatsAppReady } from '../bot.js';
import { renderTemplate } from '../utils/messageTemplates.js';

const THANKYOU_TEMPLATE = '¡Hola {{nombre}}! 🎉 Muchas gracias por visitarnos hoy en Panda Barber Studio. Esperamos verte pronto.';

let processedIds = new Set();

export async function sendThankYouMessages() {
  if (!isWhatsAppReady()) {
    return { success: false, sent: 0 };
  }

  try {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        completed_at,
        client_id,
        clients (id, name, phone)
      `)
      .eq('status', 'Completado')
      .gte('completed_at', thirtyMinAgo)
      .not('clients.phone', 'is', null);

    if (error) {
      console.error('[ThankYou] Query error:', error.message);
      return { success: false, sent: 0 };
    }

    let sent = 0;
    for (const appt of (appointments || [])) {
      if (processedIds.has(appt.id)) continue;
      if (!appt.clients?.phone) continue;

      const message = renderTemplate(THANKYOU_TEMPLATE, { nombre: appt.clients.name });
      const result = await sendMessage(appt.clients.phone, message);

      if (result.success) {
        processedIds.add(appt.id);
        sent++;
      }
    }

    if (processedIds.size > 1000) {
      const arr = [...processedIds];
      processedIds = new Set(arr.slice(-500));
    }

    return { success: true, sent };
  } catch (err) {
    console.error('[ThankYou] Error:', err.message);
    return { success: false, sent: 0 };
  }
}
