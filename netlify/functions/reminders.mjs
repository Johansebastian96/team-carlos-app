// Función programada: recordatorios push dos veces al día.
// 11:30 UTC = 6:30 a. m. en Colombia (mañana) · 23:30 UTC = 6:30 p. m. (tarde)
import { getStore } from '@netlify/blobs';
import { runReminders } from '../../src/push.mjs';

export default async () => {
  const result = await runReminders(getStore({ name: 'tmc', consistency: 'strong' }));
  console.log('[reminders]', JSON.stringify(result));
  return new Response(JSON.stringify(result), { headers: { 'content-type': 'application/json' } });
};

export const config = { schedule: '30 11,23 * * *' };
