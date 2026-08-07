import 'dotenv/config';
import express from 'express';
import cron from 'node-cron';
import { initializeWhatsApp, isWhatsAppReady, stopWhatsApp } from './src/bot.js';
import { runBirthdayJob } from './src/jobs/birthday.js';
import { sendAppointmentConfirmation } from './src/jobs/appointmentConfirmation.js';
import { sendRecurrenceMessages } from './src/jobs/recurrence.js';
import { sendThankYouMessages } from './src/jobs/thankYou.js';
import { sendWelcome } from './src/jobs/welcome.js';

const app = express();
const port = Number(process.env.PORT) || 3002;
const timezone = process.env.TZ || 'America/Caracas';

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

app.get('/health', (request, response) => response.json({
  ok: true,
  whatsappReady: isWhatsAppReady(),
  timestamp: new Date().toISOString()
}));

// Cron jobs
cron.schedule('30 7 * * *', () => runBirthdayJob(new Date()), { timezone });
cron.schedule('0 10 * * *', () => sendRecurrenceMessages(), { timezone });
cron.schedule('* * * * *', () => sendThankYouMessages(), { timezone });

const server = app.listen(port, () => console.log(`[HTTP] Servidor escuchando en :${port}`));
initializeWhatsApp().catch(error => console.error('[WhatsApp] Error al iniciar:', error));

async function shutdown(signal) {
  console.log(`[System] ${signal}: cerrando servicio`);
  server.close();
  await stopWhatsApp().catch(() => undefined);
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
