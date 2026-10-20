// Recordatorios push de Team Carlos (Web Push con claves VAPID).
// Las claves viven en variables de entorno de Netlify: TMC_VAPID_PUBLIC y TMC_VAPID_PRIVATE.
import webpush from 'web-push';
import { createHash } from 'node:crypto';
import {
  parseAthleteKey, parseSessionKey, parseMaskKey, parseCheckinKey, maskAt, weekdayIdx, weekStart, addDays,
} from './core.mjs';

export const vapidPublicKey = () => process.env.TMC_VAPID_PUBLIC || '';

function configured() {
  const pub = process.env.TMC_VAPID_PUBLIC;
  const priv = process.env.TMC_VAPID_PRIVATE;
  if (!pub || !priv) return false;
  webpush.setVapidDetails('https://team-carlos-app.netlify.app', pub, priv);
  return true;
}

// who: id del cliente o 'coach'
export const subKey = (who, endpoint) => `push/${who}/${createHash('sha256').update(String(endpoint)).digest('hex').slice(0, 24)}`;

export async function sendToSubscriptions(store, who, payload) {
  if (!configured()) return 0;
  const { blobs } = await store.list({ prefix: `push/${who}/` });
  let sent = 0;
  await Promise.all(blobs.map(async ({ key }) => {
    const sub = await store.get(key, { type: 'json' });
    if (!sub) return;
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 6 * 3600, urgency: 'normal' });
      sent++;
    } catch (e) {
      // suscripción vencida o desinstalada: se borra
      if (e && (e.statusCode === 404 || e.statusCode === 410)) await store.delete(key);
      else console.error('[push]', who, e && e.statusCode, e && e.body);
    }
  }));
  return sent;
}

const bogotaNow = () => new Date(Date.now() - 5 * 3600e3);
const firstName = (n) => String(n || '').trim().split(/\s+/)[0] || '';

// Se corre dos veces al día (mañana y tarde, hora de Colombia).
//  - Mañana: "hoy toca …" a quien tiene día de plan; al coach, mensualidades por vencer.
//  - Tarde: "¿entrenaste hoy?" a quien tenía día de plan y no ha marcado series;
//           el domingo, el check-in semanal a quien no lo ha hecho.
export async function runReminders(store, { force = false, slot } = {}) {
  const now = bogotaNow();
  const today = now.toISOString().slice(0, 10);
  const dow = weekdayIdx(today);
  const when = slot || (force ? 'morning' : now.getUTCHours() < 12 ? 'morning' : 'evening');
  const list = async (p) => (await store.list({ prefix: p })).blobs.map((b) => b.key);
  const [aKeys, pushKeys, sKeys, mKeys, ciKeys, payKeys] = await Promise.all([
    list('a/'), list('push/'), list(`s/${today}/`), list('pd/'), list(`ci/${weekStart(today)}/`), list('pay/'),
  ]);
  const withPush = new Set(pushKeys.map((k) => k.split('/')[1]));
  const roster = aKeys.map(parseAthleteKey).filter(Boolean);
  const trained = new Set(sKeys.map(parseSessionKey).filter((x) => x && x.sets > 0).map((x) => x.athleteId));
  const masks = {};
  for (const k of mKeys) { const m = parseMaskKey(k); if (m) (masks[m.athleteId] = masks[m.athleteId] || []).push(m); }
  const checked = new Set(ciKeys.map(parseCheckinKey).filter(Boolean).map((c) => c.athleteId));
  let sent = 0;
  for (const a of roster) {
    if (!withPush.has(a.id)) continue;
    const hist = (masks[a.id] || []).sort((x, y) => (x.from < y.from ? -1 : 1));
    const planned = hist.length && maskAt(hist, today)[dow] === '1';
    const msgs = [];
    if (planned && !trained.has(a.id)) {
      const plan = await store.get(`plan/${a.id}`, { type: 'json' });
      const day = plan?.dias?.find((d) => d.dow === dow);
      if (day && when === 'morning') {
        msgs.push({ title: `Hoy toca ${day.titulo || 'entrenar'} 💪`, body: `${firstName(a.name)}, tu plan de hoy está listo${day.duracion ? ' · ' + day.duracion : ''}.`, url: '/', tag: 'entreno' });
      }
      if (day && when === 'evening') {
        msgs.push({ title: '¿Entrenaste hoy?', body: 'Marca tus series en la app para sumar puntos y no perder tu racha.', url: '/', tag: 'entreno' });
      }
    }
    if (when === 'evening' && dow === 6 && !checked.has(a.id)) {
      msgs.push({ title: 'Check-in semanal', body: 'Cuéntale a Carlos cómo te fue esta semana. Toma 1 minuto.', url: '/?v=checkin', tag: 'checkin' });
    }
    for (const m of msgs) sent += await sendToSubscriptions(store, a.id, m);
  }
  if (withPush.has('coach') && when === 'morning') {
    const pays = await Promise.all(payKeys.map((k) => store.get(k, { type: 'json' })));
    const due = pays.filter((p) => p && p.proximoPago && p.proximoPago <= addDays(today, 2)).length;
    if (due) {
      sent += await sendToSubscriptions(store, 'coach', {
        title: 'Mensualidades', body: due === 1 ? '1 mensualidad vence pronto o ya venció.' : `${due} mensualidades vencen pronto o ya vencieron.`, url: '/?v=pagos', tag: 'pagos',
      });
    }
    if (dow === 0) {
      const lastWeek = addDays(weekStart(today), -7);
      const n = (await list(`ci/${lastWeek}/`)).length;
      if (n) sent += await sendToSubscriptions(store, 'coach', { title: 'Check-ins de la semana', body: `${n} ${n === 1 ? 'cliente hizo' : 'clientes hicieron'} su check-in. Revísalos y respóndeles.`, url: '/?v=seguimiento', tag: 'checkins' });
    }
  }
  return { ok: true, today, when, sent };
}
