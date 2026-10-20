// API de Team Carlos (Netlify Functions + Netlify Blobs).
// Todas las rutas viven bajo /api/* y, salvo /api/login, requieren sesión.
//
// Roles:
//   coach                  → todo
//   athlete (sin cliente)  → ver la lista de nombres, registrarse, entrar con PIN
//   athlete (con cliente)  → lo anterior + su plan, sus sesiones, sus RMs y el podio
import { getStore } from '@netlify/blobs';
import { randomBytes } from 'node:crypto';
import {
  GENDERS, PR_UNITS, HISTORY_START,
  athleteKey, parseAthleteKey, maskKey, parseMaskKey, sessionKey, sessionPrefix, parseSessionKey,
  prKey, parsePrKey, cleanName, nameKey, isISODate, addDays, weekdayIdx, computeState,
} from '../../src/core.mjs';
import { checkCredentials, issueToken, verifyToken, makePinRecord, checkPin, PIN_RE } from '../../src/auth.mjs';

export const config = { path: '/api/*' };

const MAX_BODY = 300_000;
const ID_RE = /^[a-z0-9]{4,16}$/;
const EX_RE = /^[a-z0-9]{2,16}$/;
const MAX_PIN_TRIES = 5;
const LOCK_MS = 15 * 60 * 1000; // ventana de intentos de PIN
const MAX_ROSTER_SELF = 150;   // tope de registros hechos por los propios clientes
const MAX_ROSTER = 400;
const MAX_EX_PER_DAY = 40;
const MAX_PRS_PER_DAY = 6;
const RESERVED = new Set(['__proto__', 'constructor', 'prototype']);

class HttpError extends Error {
  constructor(status, code, message) { super(message || code); this.status = status; this.code = code; }
}

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

const db = () => getStore({ name: 'tmc', consistency: 'strong' });
async function listKeys(prefix) {
  const { blobs } = await db().list({ prefix });
  return blobs.map((b) => b.key);
}
async function deleteKeys(keys) {
  const s = db();
  for (let i = 0; i < keys.length; i += 20) await Promise.all(keys.slice(i, i + 20).map((k) => s.delete(k)));
}

async function readBody(req) {
  const text = await req.text();
  if (text.length > MAX_BODY) throw new HttpError(413, 'TOO_LARGE');
  if (!text) return {};
  let data;
  try { data = JSON.parse(text); } catch { throw new HttpError(400, 'BAD_JSON'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, 'BAD_JSON');
  return data;
}

const wellFormed = (s) => (typeof s.toWellFormed === 'function' ? s.toWellFormed() : s.replace(/[\uD800-\uDFFF]/g, ''));
const str = (v, max = 200) => wellFormed(Array.from(String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim()).slice(0, max).join(''));
const arr = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const newId = () => randomBytes(5).toString('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const numOrNull = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 2000 ? Math.round(n * 100) / 100 : null;
};
// "Hoy" del servidor en UTC. El cliente (Colombia, UTC-5) puede ir un día atrás.
const serverToday = () => new Date().toISOString().slice(0, 10);
function dateInWindow(d, back, ahead) {
  const t = serverToday();
  return isISODate(d) && d >= addDays(t, -back) && d <= addDays(t, ahead);
}

async function getRoster() {
  const seen = new Set();
  return (await listKeys('a/')).map(parseAthleteKey).filter((a) => a && !seen.has(a.id) && seen.add(a.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

// ---------------------------------------------------------------- plan semanal
const NIVELES = ['PRINCIPIANTE', 'INTERMEDIO', 'AVANZADO'];
function sanitizePlan(p) {
  const seenDow = new Set();
  const seenEx = new Set();
  const exId = (id) => {
    let x = EX_RE.test(id || '') && !seenEx.has(id) ? id : newId();
    while (seenEx.has(x)) x = newId();
    seenEx.add(x);
    return x;
  };
  const dias = arr(p?.dias, 7).map((d) => {
    let budget = MAX_EX_PER_DAY;
    return {
      dow: Number.isInteger(d?.dow) && d.dow >= 0 && d.dow <= 6 ? d.dow : -1,
      titulo: str(d?.titulo, 60),
      subtitulo: str(d?.subtitulo, 60),
      duracion: str(d?.duracion, 20),
      rpe: str(d?.rpe, 12),
      nota: str(d?.nota, 300),
      secciones: arr(d?.secciones, 8).map((s) => ({
        titulo: str(s?.titulo, 60),
        nota: str(s?.nota, 40),
        ejercicios: arr(s?.ejercicios, 20).map((e) => ({
          id: e?.id,
          nombre: str(e?.nombre, 80),
          series: str(e?.series, 6),
          reps: str(e?.reps, 16),
          descanso: str(e?.descanso, 16),
          modo: e?.modo === 'libre' ? 'libre' : 'carga',
          nota: str(e?.nota, 120),
        })).filter((e) => e.nombre).filter(() => budget-- > 0).map((e) => ({ ...e, id: exId(e.id) })),
      })).filter((s) => s.ejercicios.length),
    };
  }).filter((d) => {
    if (d.dow < 0 || seenDow.has(d.dow) || !d.secciones.length) return false;
    seenDow.add(d.dow);
    return true;
  }).sort((a, b) => a.dow - b.dow);
  if (!dias.length) throw new HttpError(400, 'EMPTY_PLAN', 'El plan necesita al menos un día con ejercicios');
  const nivel = str(p?.nivel, 20).toUpperCase();
  return {
    enfoque: str(p?.enfoque, 60),
    frecuencia: str(p?.frecuencia, 60),
    edad: str(p?.edad, 3).replace(/\D/g, ''),
    nivel: NIVELES.includes(nivel) ? nivel : '',
    objetivo: str(p?.objetivo, 160),
    unidad: p?.unidad === 'lb' ? 'lb' : 'kg',
    dias,
    consejos: arr(p?.consejos, 4).map((c) => ({
      titulo: str(c?.titulo, 40),
      items: arr(c?.items, 8).map((x) => str(x, 160)).filter(Boolean),
    })).filter((c) => c.titulo || c.items.length),
    updatedAt: Date.now(),
  };
}
function planMask(plan) {
  const m = ['0', '0', '0', '0', '0', '0', '0'];
  for (const d of plan.dias) m[d.dow] = '1';
  return m.join('');
}

// ---------------------------------------------------------------- sesión del día
// El total y lo hecho se calculan con el plan guardado (no con lo que diga el teléfono).
function sanitizeSession(b, date, athleteId, plan, prev) {
  const day = plan?.dias?.find((d) => d.dow === weekdayIdx(date)) || null;
  const planIds = day ? day.secciones.flatMap((s) => s.ejercicios.map((e) => e.id)) : null;
  const allowed = planIds ? new Set(planIds) : null;
  const ex = Object.create(null);
  let count = 0;
  for (const [id, e] of Object.entries(obj(b?.ex))) {
    if (!EX_RE.test(id) || RESERVED.has(id) || (allowed && !allowed.has(id))) continue;
    if (++count > 60) break;
    const sets = arr(obj(e).sets, 12).map((s) => ({ w: numOrNull(s?.w), r: numOrNull(s?.r), ok: !!s?.ok }));
    ex[id] = { nombre: str(e?.nombre, 80), sets, done: sets.length > 0 && sets.every((s) => s.ok) };
  }
  const total = planIds ? planIds.length : 0;
  const doneCount = Object.values(ex).filter((e) => e.done).length;
  const sets = Object.values(ex).reduce((n, e) => n + e.sets.filter((s) => s.ok).length, 0);
  return {
    date, athleteId,
    dow: weekdayIdx(date),
    titulo: day ? day.titulo : str(b?.titulo, 60),
    total,
    done: Math.min(doneCount, total || doneCount),
    sets: Math.min(sets, 9999),
    ex,
    nota: str(b?.nota, 300),
    finishedAt: b?.finished ? prev?.finishedAt || Date.now() : null,
    ts: Date.now(),
  };
}

// ---------------------------------------------------------------- RMs
const RM_CATS = ['empuje', 'traccion', 'pierna', 'otros'];
function sanitizeRmDoc(doc) {
  const seen = new Set();
  const catalog = arr(doc?.catalog, 60).map((c) => ({
    name: cleanName(c?.name),
    unit: PR_UNITS.includes(c?.unit) ? c.unit : 'kg',
    category: RM_CATS.includes(c?.category) ? c.category : 'otros',
  })).filter((c) => c.name && !RESERVED.has(c.name) && !seen.has(c.name) && seen.add(c.name));
  const data = Object.create(null);
  const src = obj(doc?.data);
  for (const c of catalog) {
    if (!Object.prototype.hasOwnProperty.call(src, c.name)) continue;
    const history = arr(obj(src[c.name]).history, 400).map((h) => ({
      date: isISODate(h?.date) ? h.date : null,
      value: Number(h?.value),
      isPR: !!h?.isPR,
    })).filter((h) => h.date && Number.isFinite(h.value) && h.value > 0 && h.value <= 2000);
    if (history.length) data[c.name] = { current: history[history.length - 1].value, history };
  }
  return { catalog, data, updatedAt: Date.now() };
}
const rmMax = (doc, name) => {
  const d = doc?.data && Object.prototype.hasOwnProperty.call(doc.data, name) ? doc.data[name] : null;
  return d && Array.isArray(d.history) && d.history.length ? Math.max(...d.history.map((h) => Number(h.value) || 0)) : 0;
};

// ---------------------------------------------------------------- bloqueo de PIN (atómico)
// Cada intento ocupa un "cupo" (pa/{id}/{ventana}/{n}) creado con escritura condicional
// ANTES de revisar el PIN: solo hay 5 cupos por ventana de 15 minutos, así que ni
// intentos en paralelo pueden pasar el límite.
async function reservePinAttempt(id) {
  const store = db();
  const bucket = Math.floor(Date.now() / LOCK_MS);
  for (let k = 1; k <= MAX_PIN_TRIES; k++) {
    const res = await store.set(`pa/${id}/${bucket}/${k}`, '1', { onlyIfNew: true });
    if (res && res.modified !== false) {
      if (k === 1) {
        const stale = (await listKeys(`pa/${id}/`)).filter((key) => !key.startsWith(`pa/${id}/${bucket}/`));
        if (stale.length) await deleteKeys(stale);
      }
      return true;
    }
  }
  return false;
}
const clearPinAttempts = async (id) => deleteKeys(await listKeys(`pa/${id}/`));

// ---------------------------------------------------------------- router
export default async function handler(req) {
  try {
    const url = new URL(req.url);
    const parts = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
    const route = parts[0] || '';
    const method = req.method;
    const q = url.searchParams;

    if (route === 'login' && method === 'POST') {
      const body = await readBody(req);
      const role = checkCredentials(body.email, body.password);
      if (!role) {
        await sleep(400);
        throw new HttpError(401, 'BAD_CREDENTIALS', 'Correo o contraseña incorrectos');
      }
      return json({ token: issueToken(role), role });
    }

    const auth = verifyToken((req.headers.get('authorization') || '').replace(/^Bearer\s+/i, ''));
    if (!auth) throw new HttpError(401, 'NO_SESSION', 'Tu sesión expiró');
    const { role, aid } = auth;
    const isCoach = role === 'coach';
    const requireCoach = () => { if (!isCoach) throw new HttpError(403, 'COACH_ONLY'); };
    // Un cliente con perfil: su PIN debe seguir siendo el mismo con el que entró.
    let memberChecked = false;
    const requireMember = async () => {
      if (isCoach || memberChecked) return;
      if (!aid) throw new HttpError(403, 'PICK_ATHLETE', 'Elige tu nombre primero');
      const rec = await db().get(`pin/${aid}`, { type: 'json' });
      if (!rec) throw new HttpError(401, 'PROFILE_GONE', 'Tu perfil ya no existe. Habla con Carlos.');
      if ((Number(rec.v) || 0) !== auth.v) throw new HttpError(401, 'PIN_CHANGED', 'Tu PIN cambió. Entra de nuevo con el PIN nuevo.');
      memberChecked = true;
    };
    // El coach ve a todos; cada cliente solo lo suyo.
    const requireSelf = async (id) => {
      if (!ID_RE.test(id || '')) throw new HttpError(400, 'BAD_ATHLETE');
      if (isCoach) return;
      await requireMember();
      if (aid !== id) throw new HttpError(403, 'NOT_YOURS');
    };
    const dateParam = (name = 'date') => {
      const d = q.get(name);
      if (!isISODate(d)) throw new HttpError(400, 'BAD_DATE');
      return d;
    };
    const mustExist = async (id) => {
      const roster = await getRoster();
      const a = roster.find((x) => x.id === id);
      if (!a) throw new HttpError(404, 'ATHLETE_NOT_FOUND', 'Ese cliente ya no existe');
      return { roster, athlete: a };
    };
    const maskHistory = async (id) => (await listKeys(`pd/${id}~`)).map(parseMaskKey).filter(Boolean)
      .sort((a, b) => (a.from < b.from ? -1 : 1));

    // ---- lista de nombres (para "¿quién eres?")
    if (route === 'roster' && method === 'GET') {
      return json({ roster: await getRoster() });
    }

    // ---- estado completo para pintar la app
    if (route === 'state' && method === 'GET') {
      await requireMember();
      const today = dateParam('date');
      if (!dateInWindow(today, 2, 1)) throw new HttpError(400, 'BAD_DATE', 'Revisa la fecha y hora de tu teléfono');
      const [roster, sKeys, pKeys, mKeys, planKeys] = await Promise.all([
        getRoster(), listKeys('s/'), listKeys('p/'), listKeys('pd/'), listKeys('plan/'),
      ]);
      const masks = {};
      for (const k of mKeys) {
        const m = parseMaskKey(k);
        if (m) (masks[m.athleteId] = masks[m.athleteId] || []).push({ mask: m.mask, from: m.from });
      }
      const state = computeState({
        today,
        roster,
        sessions: sKeys.map(parseSessionKey).filter(Boolean),
        prs: pKeys.map(parsePrKey).filter(Boolean),
        masks,
        planIds: planKeys.map((k) => k.slice(5)).filter((id) => ID_RE.test(id)),
        meId: isCoach ? null : aid,
        withHistory: isCoach,
      });
      // Los pesos de cada quien son privados: el podio de clientes solo ve el avance.
      if (!isCoach) {
        state.mes.feed = state.mes.feed.map((p) => ({ date: p.date, athleteId: p.athleteId, name: p.name, unit: p.unit, pct: p.pct, ts: p.ts }));
        state.mes.ranking = state.mes.ranking.map((r) => ({ athleteId: r.athleteId, prs: r.prs }));
      }
      return json({ ...state, role, aid: isCoach ? null : aid });
    }

    // ---- clientes
    if (route === 'athletes') {
      const id = parts[1];
      if (method === 'POST' && !id) {
        const body = await readBody(req);
        const name = cleanName(body.name);
        if (name.length < 2) throw new HttpError(400, 'BAD_NAME', 'Escribe tu nombre completo');
        const gender = GENDERS.includes(body.gender) ? body.gender : null;
        if (!gender) throw new HttpError(400, 'BAD_GENDER', 'Elige hombre o mujer');
        const pin = String(body.pin || '');
        if (!PIN_RE.test(pin)) throw new HttpError(400, 'BAD_PIN', 'El PIN debe tener 4 números');
        const roster = await getRoster();
        if (roster.length >= (isCoach ? MAX_ROSTER : MAX_ROSTER_SELF)) {
          throw new HttpError(409, 'ROSTER_FULL', 'El team está lleno. Pídele a Carlos que te agregue.');
        }
        if (roster.some((a) => nameKey(a.name) === nameKey(name))) {
          throw new HttpError(409, 'NAME_TAKEN', 'Ya existe alguien con ese nombre');
        }
        const athlete = { id: newId(), name, gender };
        const key = athleteKey(athlete);
        const rec = makePinRecord(pin, 0);
        await db().setJSON(`pin/${athlete.id}`, rec);
        await db().set(key, '1');
        return json({ athlete, token: isCoach ? undefined : issueToken('athlete', athlete.id, rec.v) }, 201);
      }
      if (id && ID_RE.test(id) && parts[2] === 'enter' && method === 'POST') {
        const body = await readBody(req);
        const { athlete } = await mustExist(id);
        // Bloqueo tras 5 intentos fallidos seguidos (15 minutos), para que nadie adivine un PIN.
        if (!(await reservePinAttempt(id))) {
          throw new HttpError(429, 'LOCKED', 'Demasiados intentos. Espera unos minutos o pídele a Carlos un PIN nuevo.');
        }
        const rec = await db().get(`pin/${id}`, { type: 'json' });
        if (!checkPin(body.pin, rec)) {
          await sleep(500);
          throw new HttpError(401, 'BAD_PIN', 'PIN incorrecto');
        }
        await clearPinAttempts(id);
        return json({ athlete, token: issueToken('athlete', id, Number(rec.v) || 0) });
      }
      if (id && ID_RE.test(id) && !parts[2]) {
        requireCoach();
        const { roster, athlete: current } = await mustExist(id);
        if (method === 'PATCH') {
          const body = await readBody(req);
          const next = {
            id,
            name: body.name !== undefined ? cleanName(body.name) : current.name,
            gender: GENDERS.includes(body.gender) ? body.gender : current.gender,
          };
          if (next.name.length < 2) throw new HttpError(400, 'BAD_NAME', 'Escribe el nombre completo');
          if (roster.some((a) => a.id !== id && nameKey(a.name) === nameKey(next.name))) {
            throw new HttpError(409, 'NAME_TAKEN', 'Ya existe un cliente con ese nombre');
          }
          const key = athleteKey(next);
          if (body.pin !== undefined) {
            if (!PIN_RE.test(String(body.pin))) throw new HttpError(400, 'BAD_PIN', 'El PIN debe tener 4 números');
            const old = await db().get(`pin/${id}`, { type: 'json' });
            // nueva versión: las sesiones abiertas con el PIN viejo se cierran
            await db().setJSON(`pin/${id}`, makePinRecord(String(body.pin), old?.v || 0));
            await clearPinAttempts(id);
          }
          await db().set(key, '1');
          await deleteKeys((await listKeys(`a/${id}~`)).filter((k) => k !== key));
          return json({ athlete: next });
        }
        if (method === 'DELETE') {
          const [sKeys, pKeys, mKeys, aKeys, paKeys] = await Promise.all([
            listKeys('s/'), listKeys('p/'), listKeys(`pd/${id}~`), listKeys(`a/${id}~`), listKeys(`pa/${id}/`),
          ]);
          const theirs = [
            ...sKeys.filter((k) => parseSessionKey(k)?.athleteId === id),
            ...pKeys.filter((k) => parsePrKey(k)?.athleteId === id),
            ...mKeys, ...paKeys,
            `rm/${id}`, `plan/${id}`,
          ];
          await deleteKeys(theirs);
          await deleteKeys([...aKeys, `pin/${id}`]);
          return json({ ok: true, removed: theirs.length });
        }
      }
    }

    // ---- plan semanal de un cliente
    if (route === 'plan') {
      const athleteId = q.get('athleteId');
      await requireSelf(athleteId);
      if (method === 'GET') return json({ plan: (await db().get(`plan/${athleteId}`, { type: 'json' })) || null });
      requireCoach();
      await mustExist(athleteId);
      if (method === 'PUT') {
        const plan = sanitizePlan(await readBody(req));
        const mask = planMask(plan);
        // Los días nuevos aplican desde hoy; el historial anterior conserva su plan.
        const reqDate = q.get('date');
        const from = dateInWindow(reqDate, 2, 1) ? reqDate : serverToday();
        const history = await maskHistory(athleteId);
        const last = history[history.length - 1];
        await db().setJSON(`plan/${athleteId}`, plan);
        if (!last) await db().set(maskKey(athleteId, mask, HISTORY_START), '1');
        else if (last.mask !== mask) {
          if (last.from >= from) {
            await db().set(maskKey(athleteId, mask, last.from), '1');
            await db().delete(last.key);
          } else {
            await db().set(maskKey(athleteId, mask, from), '1');
          }
        }
        return json({ plan });
      }
      if (method === 'DELETE') {
        await db().delete(`plan/${athleteId}`);
        return json({ ok: true });
      }
    }

    // ---- historial de sesiones de un cliente
    if (route === 'sessions' && method === 'GET') {
      const athleteId = q.get('athleteId');
      await requireSelf(athleteId);
      const from = dateParam('from');
      const to = dateParam('to');
      if (to < from || addDays(from, 120) < to) throw new HttpError(400, 'BAD_RANGE');
      const keys = (await listKeys('s/')).map(parseSessionKey)
        .filter((s) => s && s.athleteId === athleteId && s.date >= from && s.date <= to);
      const latest = new Map();
      for (const s of keys) if (!latest.has(s.date) || latest.get(s.date).ts < s.ts) latest.set(s.date, s);
      const docs = await Promise.all([...latest.values()].map((s) => db().get(s.key, { type: 'json' })));
      return json({ sessions: docs.filter(Boolean).sort((a, b) => (a.date < b.date ? -1 : 1)) });
    }

    // ---- registro del entrenamiento del día
    if (route === 'session') {
      const athleteId = q.get('athleteId');
      await requireSelf(athleteId);
      const date = dateParam();
      const old = await listKeys(sessionPrefix(date, athleteId));
      if (method === 'PUT') {
        // Se puede registrar hasta ~una semana atrás (por si se olvidó), no el futuro.
        if (!dateInWindow(date, 10, 1)) throw new HttpError(400, 'BAD_DATE', 'Ese día ya no se puede registrar');
        await mustExist(athleteId);
        const body = await readBody(req);
        const prevKey = old.map(parseSessionKey).filter(Boolean).sort((a, b) => b.ts - a.ts)[0];
        const [plan, prev] = await Promise.all([
          db().get(`plan/${athleteId}`, { type: 'json' }),
          prevKey && body.finished ? db().get(prevKey.key, { type: 'json' }) : null,
        ]);
        const session = sanitizeSession(body, date, athleteId, plan, prev);
        const key = sessionKey(session);
        await db().setJSON(key, session);
        await deleteKeys(old.filter((k) => k !== key));
        return json({ session });
      }
      if (method === 'DELETE') {
        await deleteKeys(old);
        return json({ ok: true, removed: old.length });
      }
    }

    // ---- RMs por cliente
    if (route === 'rms') {
      const athleteId = q.get('athleteId');
      await requireSelf(athleteId);
      if (method === 'GET') return json({ doc: (await db().get(`rm/${athleteId}`, { type: 'json' })) || null });
      if (method === 'PUT') {
        const body = await readBody(req);
        await mustExist(athleteId);
        const before = await db().get(`rm/${athleteId}`, { type: 'json' });
        const doc = sanitizeRmDoc(body.doc);
        // Un PR cuenta solo si de verdad supera el máximo guardado antes (se valida aquí, no en el teléfono).
        const ev = obj(body.event);
        const name = cleanName(ev.name);
        let prKeyToWrite = null;
        let undoKeys = [];
        if (name && dateInWindow(ev.date, 2, 1)) {
          if (ev.type === 'pr') {
            const meta = doc.catalog.find((c) => c.name === name);
            const entry = doc.data[name];
            const last = entry?.history[entry.history.length - 1];
            const prevMax = rmMax(before, name);
            const value = Number(ev.value);
            const todays = await listKeys(`p/${ev.date}/${athleteId}/`);
            if (meta && last && last.value === value && last.date === ev.date && prevMax > 0 && value > prevMax
              && value <= 2000 && todays.length < MAX_PRS_PER_DAY) {
              prKeyToWrite = prKey({ date: ev.date, athleteId, name, value, prev: prevMax, unit: meta.unit, ts: Date.now() });
            }
          }
          if (ev.type === 'undo') {
            undoKeys = (await listKeys(`p/${ev.date}/${athleteId}/`)).filter((k) => {
              const p = parsePrKey(k);
              return p && p.name === name && p.value === Number(ev.value);
            });
          }
        }
        await db().setJSON(`rm/${athleteId}`, doc);
        if (prKeyToWrite) await db().set(prKeyToWrite, '1');
        if (undoKeys.length) await deleteKeys(undoKeys);
        return json({ doc, pr: !!prKeyToWrite });
      }
    }

    throw new HttpError(404, 'NOT_FOUND');
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.code, message: err.message }, err.status);
    if (err && err.message === 'SERVER_NOT_CONFIGURED') {
      return json({ error: 'SERVER_NOT_CONFIGURED', message: 'Falta configurar el servidor' }, 503);
    }
    console.error('[api]', err);
    return json({ error: 'SERVER_ERROR', message: 'Error del servidor. Intenta de nuevo.' }, 500);
  }
}
