import { supabase, getSetting } from '../supabase.js';
import { sendMessage, isWhatsAppReady } from '../bot.js';
import { renderTemplate } from '../utils/messageTemplates.js';

const DEFAULT_TEMPLATE = 'Hola {{nombre}}! 🎉 Es tu cumpleaños y te regalamos 10% de descuento en tu próxima visita a Panda Barber Studio.';

export async function runBirthdayJob(now = new Date()) {
  if (!isWhatsAppReady()) {
    console.log('[Birthday] WhatsApp not ready; will retry next cycle.');
    return;
  }

  try {
    const [{ data: clients, error }, template] = await Promise.all([
      supabase.from('clients').select('id, name, phone, birth_date').eq('active', true).not('birth_date', 'is', null),
      getSetting('whatsapp_template_birthday', DEFAULT_TEMPLATE)
    ]);
    if (error) throw error;

    const month = now.getMonth();
    const day = now.getDate();
    const birthdayClients = (clients || []).filter(client => {
      const birthDate = new Date(`${client.birth_date}T12:00:00`);
      return birthDate.getMonth() === month && birthDate.getDate() === day;
    });

    const clientIds = birthdayClients.map(client => client.id);
    let clientsToSend = birthdayClients;

    if (clientIds.length > 0) {
      const currentYear = now.getFullYear();
      const { data: sentReminders, error: remindersError } = await supabase
        .from('scheduled_reminders')
        .select('client_id')
        .eq('kind', 'birthday')
        .eq('sent', true)
        .in('client_id', clientIds)
        .gte('sent_at', `${currentYear}-01-01T00:00:00Z`);

      if (remindersError) throw remindersError;

      const sentClientIds = new Set(sentReminders?.map(r => r.client_id) || []);
      clientsToSend = birthdayClients.filter(client => !sentClientIds.has(client.id));
    }

    if (clientsToSend.length === 0) {
      console.log('[Birthday] No hay nuevos cumpleaños para enviar hoy (o ya fueron procesados).');
      return;
    }

    let sentCount = 0;
    for (const client of clientsToSend) {
      try {
        await sendMessage(client.phone, renderTemplate(template, { nombre: client.name }));
        const sentAt = new Date().toISOString();
        await supabase.from('scheduled_reminders').insert({
          client_id: client.id,
          kind: 'birthday',
          remind_at: sentAt,
          sent: true,
          sent_at: sentAt,
          attempts: 1
        });
        sentCount++;
      } catch (err) {
        console.error(`[Birthday] No se pudo enviar o registrar para ${client.name}:`, err.message);
      }
    }
    console.log(`[Birthday] Enviados y registrados ${sentCount}/${clientsToSend.length}`);
  } catch (error) {
    console.error('[Birthday] Error del job:', error);
  }
}
