// Lógica pura de Team Carlos: claves de almacenamiento, constancia, rachas y puntos.
// No toca la red ni el almacenamiento, así se puede probar directamente.

export const GENDERS = ['m', 'f'];
export const PR_UNITS = ['kg', 'lb', 'reps'];
export const DEFAULT_MASK = '1111100'; // lunes a viernes
export const HISTORY_START = '2020-01-01';
const LB_TO_KG = 0.45359237;
const MAX_LOOKBACK_DAYS = 400; // las rachas se calculan sobre poco más de un año

// Los puntos premian la constancia, no cuánto levanta cada quien.
export const POINTS = {
  day: 10,        // entrenar (marcar al menos una serie ese día)
  complete: 15,   // completar todos los ejercicios del día
  pr: 25,         // superar un RM
  week: 50,       // cumplir todos los días del plan en la semana
  nutri: 5,       // cumplir todas las comidas y el agua del día
  checkin: 20,    // hacer el check-in de la semana
  reto: 100,      // cumplir el reto del mes
  streak: [[5, 30], [10, 75], [20, 200]], // bonos al alcanzar la racha
};

export const RETO_TIPOS = {
  entrenos: 'días entrenados',
  completas: 'sesiones completas',
  nutricion: 'días de nutrición completa',
  checkins: 'check-ins',
  prs: 'PRs',
};

// Logros: se ganan solos con la constancia.
export const BADGES = [
  { id: 'entreno-1', titulo: 'Primer entreno', icon: 'ti-flame', stat: 'days', target: 1 },
  { id: 'entreno-10', titulo: '10 entrenos', icon: 'ti-flame', stat: 'days', target: 10 },
  { id: 'entreno-25', titulo: '25 entrenos', icon: 'ti-flame', stat: 'days', target: 25 },
  { id: 'entreno-50', titulo: '50 entrenos', icon: 'ti-flame', stat: 'days', target: 50 },
  { id: 'entreno-100', titulo: '100 entrenos', icon: 'ti-crown', stat: 'days', target: 100 },
  { id: 'racha-5', titulo: 'Racha de 5', icon: 'ti-bolt', stat: 'bestStreak', target: 5 },
  { id: 'racha-10', titulo: 'Racha de 10', icon: 'ti-bolt', stat: 'bestStreak', target: 10 },
  { id: 'racha-20', titulo: 'Racha de 20', icon: 'ti-bolt', stat: 'bestStreak', target: 20 },
  { id: 'semana-1', titulo: 'Semana perfecta', icon: 'ti-calendar-check', stat: 'weeks', target: 1 },
  { id: 'semana-4', titulo: '4 semanas perfectas', icon: 'ti-calendar-check', stat: 'weeks', target: 4 },
  { id: 'completa-10', titulo: '10 sesiones completas', icon: 'ti-circle-check', stat: 'complete', target: 10 },
  { id: 'pr-1', titulo: 'Primer PR', icon: 'ti-trophy', stat: 'prs', target: 1 },
  { id: 'pr-5', titulo: '5 PRs', icon: 'ti-trophy', stat: 'prs', target: 5 },
  { id: 'pr-10', titulo: '10 PRs', icon: 'ti-trophy', stat: 'prs', target: 10 },
  { id: 'nutri-7', titulo: '7 días comiendo al 100%', icon: 'ti-salad', stat: 'nutriDays', target: 7 },
  { id: 'nutri-30', titulo: '30 días comiendo al 100%', icon: 'ti-salad', stat: 'nutriDays', target: 30 },
  { id: 'checkin-4', titulo: '4 check-ins', icon: 'ti-clipboard-check', stat: 'checkins', target: 4 },
  { id: 'reto-1', titulo: 'Reto del mes cumplido', icon: 'ti-medal', stat: 'retos', target: 1 },
];

// ---------------------------------------------------------------- fechas (ISO, sin zona)
export function isISODate(s) {
  if (typeof s !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === s && s >= HISTORY_START && s <= '2100-12-31';
}
export function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function weekdayIdx(iso) { // 0 = lunes … 6 = domingo
  return (new Date(iso + 'T00:00:00Z').getUTCDay() + 6) % 7;
}
export function weekStart(iso) { return addDays(iso, -weekdayIdx(iso)); }
export function isMask(m) { return typeof m === 'string' && /^[01]{7}$/.test(m) && m.includes('1'); }
export const plannedDays = (mask) => Math.max(1, [...mask].filter((c) => c === '1').length);
const minDate = (a, b) => (a < b ? a : b);
const maxDate = (a, b) => (a > b ? a : b);

// ---------------------------------------------------------------- texto
// Corta por caracteres completos (no parte emojis) y quita símbolos que rompen las claves.
export function cleanName(s) {
  const t = String(s || '').replace(/[~\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return Array.from(t).slice(0, 40).join('')
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '').trim();
}
export function nameKey(s) {
  return cleanName(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
// Los nombres van en base64url dentro de las claves: sin '%', '/', '~' ni espacios,
// porque el almacenamiento decodifica secuencias '%xx' en las claves.
const enc = (s) => Buffer.from(String(s), 'utf8').toString('base64url');
const dec = (s) => { try { return Buffer.from(String(s), 'base64url').toString('utf8'); } catch { return s; } };
const num = (s) => { const n = Number(s); return Number.isFinite(n) ? n : 0; };

// ---------------------------------------------------------------- claves
// Cliente:   a/{id}~{genero}~{nombre}
export function athleteKey(a) { return `a/${a.id}~${a.gender}~${enc(cleanName(a.name))}`; }
export function parseAthleteKey(key) {
  const m = /^a\/([a-z0-9]{4,16})~([mf])~([A-Za-z0-9_-]+)$/.exec(key);
  return m ? { id: m[1], gender: m[2], name: dec(m[3]) } : null;
}

// Días del plan, con historial: pd/{id}~{máscara lunes..domingo}~{desde}
// Así, cambiar el plan no recalcula las semanas y rachas que ya pasaron.
export function maskKey(athleteId, mask, from) { return `pd/${athleteId}~${mask}~${from}`; }
export function parseMaskKey(key) {
  const m = /^pd\/([a-z0-9]{4,16})~([01]{7})~(\d{4}-\d{2}-\d{2})$/.exec(key);
  return m ? { athleteId: m[1], mask: m[2], from: m[3], key } : null;
}
export function maskAt(list, date) {
  if (!list || !list.length) return DEFAULT_MASK;
  let cur = list[0];
  for (const e of list) if (e.from <= date) cur = e;
  return isMask(cur.mask) ? cur.mask : DEFAULT_MASK;
}

// Sesión:    s/{fecha}/{id}~{ejercicios hechos}~{total}~{series marcadas}~{ts}
export function sessionPrefix(date, athleteId) {
  return athleteId ? `s/${date}/${athleteId}~` : `s/${date}/`;
}
export function sessionKey(s) {
  return `${sessionPrefix(s.date, s.athleteId)}${s.done}~${s.total}~${s.sets}~${s.ts}`;
}
export function parseSessionKey(key) {
  const m = /^s\/(\d{4}-\d{2}-\d{2})\/([a-z0-9]{4,16})~(\d+)~(\d+)~(\d+)~(\d+)$/.exec(key);
  if (!m || !isISODate(m[1])) return null;
  return { date: m[1], athleteId: m[2], done: Number(m[3]), total: Number(m[4]), sets: Number(m[5]), ts: Number(m[6]), key };
}

// RM superado: p/{fecha}/{id}/{movimiento}~{valor}~{anterior}~{unidad}~{ts}
export function prKey(e) {
  return `p/${e.date}/${e.athleteId}/${enc(cleanName(e.name))}~${e.value}~${e.prev}~${e.unit}~${e.ts}`;
}
export function parsePrKey(key) {
  const m = /^p\/(\d{4}-\d{2}-\d{2})\/([a-z0-9]{4,16})\/([A-Za-z0-9_-]+)~([^~]+)~([^~]+)~(kg|lb|reps)~(\d+)$/.exec(key);
  if (!m || !isISODate(m[1])) return null;
  return { date: m[1], athleteId: m[2], name: dec(m[3]), value: num(m[4]), prev: num(m[5]), unit: m[6], ts: Number(m[7]), key };
}

// Nutrición del día: n/{fecha}/{id}~{comidas hechas}~{comidas del plan}~{vasos}~{meta de vasos}~{ts}
export function nutriPrefix(date, athleteId) { return athleteId ? `n/${date}/${athleteId}~` : `n/${date}/`; }
export function nutriKey(n) { return `${nutriPrefix(n.date, n.athleteId)}${n.done}~${n.total}~${n.vasos}~${n.meta}~${n.ts}`; }
export function parseNutriKey(key) {
  const m = /^n\/(\d{4}-\d{2}-\d{2})\/([a-z0-9]{4,16})~(\d+)~(\d+)~(\d+)~(\d+)~(\d+)$/.exec(key);
  if (!m || !isISODate(m[1])) return null;
  return { date: m[1], athleteId: m[2], done: +m[3], total: +m[4], vasos: +m[5], meta: +m[6], ts: +m[7], key };
}
export const nutriComplete = (n) => n.total > 0 && n.done >= n.total && n.vasos >= n.meta;

// Check-in semanal: ci/{lunes}/{id}~{ts}
export function checkinKey(week, athleteId, ts) { return `ci/${week}/${athleteId}~${ts}`; }
export function parseCheckinKey(key) {
  const m = /^ci\/(\d{4}-\d{2}-\d{2})\/([a-z0-9]{4,16})~(\d+)$/.exec(key);
  return m && isISODate(m[1]) ? { week: m[1], athleteId: m[2], ts: +m[3], key } : null;
}

// Reto del mes: rt/{aaaa-mm}~{tipo}~{meta}
export function retoKey(month, tipo, meta) { return `rt/${month}~${tipo}~${meta}`; }
export function parseRetoKey(key) {
  const m = /^rt\/(\d{4}-\d{2})~([a-z]+)~(\d+)$/.exec(key);
  return m && RETO_TIPOS[m[2]] ? { month: m[1], tipo: m[2], meta: +m[3], key } : null;
}

// Si hay dos registros del mismo día para el mismo cliente, gana el más reciente.
export function dedupeSessions(list) {
  const best = new Map();
  for (const s of list) {
    const k = `${s.date}|${s.athleteId}`;
    const cur = best.get(k);
    if (!cur || s.ts > cur.ts) best.set(k, s);
  }
  return [...best.values()];
}

// Racha: días seguidos entrenando. Los días que no están en el plan (de ese momento)
// no la rompen, y hoy sin entrenar todavía tampoco.
// maskFor: string fijo o función (fecha) -> máscara.
export function streakInfo(days, maskFor, today) {
  const maskOf = typeof maskFor === 'function' ? maskFor : () => maskFor;
  const valid = [...days].filter((d) => d <= today);
  if (!valid.length) return { current: 0, best: 0, bonus: 0 };
  const first = maxDate(valid.sort()[0], addDays(today, -MAX_LOOKBACK_DAYS));
  let run = 0, best = 0, bonus = 0;
  for (let d = first, i = 0; d <= today && i <= MAX_LOOKBACK_DAYS + 1; d = addDays(d, 1), i++) {
    if (days.has(d)) {
      run++;
      best = Math.max(best, run);
      for (const [len, pts] of POINTS.streak) if (run === len) bonus += pts;
    } else if (maskOf(d)[weekdayIdx(d)] === '1' && d !== today) {
      run = 0;
    }
  }
  return { current: run, best, bonus };
}

// Semanas en las que el cliente entrenó todos los días de su plan (el plan vigente esa semana).
export function completeWeeks(days, maskFor, today) {
  const maskOf = typeof maskFor === 'function' ? maskFor : () => maskFor;
  const byWeek = new Map();
  for (const d of days) {
    if (today && d > today) continue;
    const w = weekStart(d);
    byWeek.set(w, (byWeek.get(w) || 0) + 1);
  }
  let n = 0;
  for (const [w, c] of byWeek) {
    const ref = today ? minDate(addDays(w, 6), today) : addDays(w, 6);
    if (c >= plannedDays(maskOf(ref))) n++;
  }
  return n;
}

// ---------------------------------------------------------------- estado agregado
// masks: { [athleteId]: [{ mask, from }] } (historial de días del plan)
// planIds: ids de clientes que tienen plan publicado hoy
export function computeState({ today, roster, sessions, prs, masks, planIds, meId, withHistory, nutri = [], checkins = [], retos = [], retoInfo = null }) {
  const ids = new Set(roster.map((a) => a.id));
  const hist = {};
  for (const a of roster) {
    const raw = masks[a.id];
    const list = Array.isArray(raw) ? raw.filter((e) => isMask(e.mask)) : (isMask(raw) ? [{ mask: raw, from: HISTORY_START }] : []);
    hist[a.id] = list.sort((x, y) => (x.from < y.from ? -1 : x.from > y.from ? 1 : 0));
  }
  const maskFn = (id) => (date) => maskAt(hist[id], date);
  const withPlan = new Set((planIds || []).filter((id) => ids.has(id)));
  const ses = dedupeSessions(sessions).filter((s) => ids.has(s.athleteId) && s.date <= today && s.sets > 0);
  const prList = prs.filter((p) => ids.has(p.athleteId) && p.date <= today);
  const isComplete = (s) => s.total > 0 && s.done >= s.total;
  const nutriList = dedupeSessions(nutri).filter((n) => ids.has(n.athleteId) && n.date <= today);
  const nutriDone = nutriList.filter(nutriComplete);
  const ciWeeks = new Map(); // atleta -> Set(semanas)
  for (const c of checkins) {
    if (!ids.has(c.athleteId) || c.week > today) continue;
    if (!ciWeeks.has(c.athleteId)) ciWeeks.set(c.athleteId, new Set());
    ciWeeks.get(c.athleteId).add(c.week);
  }
  const retoList = retos.filter((r) => r.month <= today.slice(0, 7));

  const byAthlete = new Map(roster.map((a) => [a.id, []]));
  for (const s of ses) byAthlete.get(s.athleteId).push(s);

  const wkStart = weekStart(today);
  const wkEnd = addDays(wkStart, 6);
  const inWeek = (d) => d >= wkStart && d <= wkEnd;
  const month = today.slice(0, 7);

  // valor de un cliente para un tipo de reto en un mes
  const retoValue = (id, tipo, month) => {
    const inMonth = (d) => d.startsWith(month);
    const mine = byAthlete.get(id) || [];
    if (tipo === 'entrenos') return mine.filter((s) => inMonth(s.date)).length;
    if (tipo === 'completas') return mine.filter((s) => inMonth(s.date) && isComplete(s)).length;
    if (tipo === 'nutricion') return nutriDone.filter((n) => n.athleteId === id && inMonth(n.date)).length;
    if (tipo === 'checkins') return [...(ciWeeks.get(id) || [])].filter(inMonth).length;
    if (tipo === 'prs') return prList.filter((p) => p.athleteId === id && inMonth(p.date)).length;
    return 0;
  };

  const stats = new Map();
  for (const a of roster) {
    const mine = byAthlete.get(a.id);
    const days = new Set(mine.map((s) => s.date));
    const mf = maskFn(a.id);
    const st = streakInfo(days, mf, today);
    const complete = mine.filter(isComplete).length;
    const prCount = prList.filter((p) => p.athleteId === a.id).length;
    const weeks = completeWeeks(days, mf, today);
    const nutriDays = nutriDone.filter((n) => n.athleteId === a.id).length;
    const checkinCount = (ciWeeks.get(a.id) || new Set()).size;
    const retosDone = retoList.filter((r) => retoValue(a.id, r.tipo, r.month) >= r.meta).length;
    const points = days.size * POINTS.day + complete * POINTS.complete + prCount * POINTS.pr + weeks * POINTS.week + st.bonus
      + nutriDays * POINTS.nutri + checkinCount * POINTS.checkin + retosDone * POINTS.reto;
    const badgeCount = BADGES.filter((b) => ({ days: days.size, bestStreak: st.best, weeks, complete, prs: prCount, nutriDays, checkins: checkinCount, retos: retosDone })[b.stat] >= b.target).length;
    stats.set(a.id, {
      athleteId: a.id, days: days.size, complete, prs: prCount, weeks, nutriDays, checkins: checkinCount, retos: retosDone, badges: badgeCount,
      streak: st.current, bestStreak: st.best, bonus: st.bonus, points,
      weekDays: mine.filter((s) => inWeek(s.date)).length,
      weekPlanned: plannedDays(mf(today)),
      weekComplete: mine.filter((s) => inWeek(s.date) && isComplete(s)).length,
    });
  }

  // ---- hoy: quién entrenó y cuántos puntos sumó hoy
  const prsToday = (id) => prList.filter((p) => p.athleteId === id && p.date === today).length;
  const hoy = ses.filter((s) => s.date === today).map((s) => {
    const prsT = prsToday(s.athleteId);
    return {
      athleteId: s.athleteId, done: s.done, total: s.total, sets: s.sets, ts: s.ts, complete: isComplete(s), prs: prsT,
      points: POINTS.day + (isComplete(s) ? POINTS.complete : 0) + prsT * POINTS.pr,
    };
  }).sort((x, y) => y.points - x.points
    || (y.total ? y.done / y.total : 0) - (x.total ? x.done / x.total : 0)
    || x.ts - y.ts);

  // ---- semana (lunes a domingo de "today")
  const semana = roster.map((a) => {
    const s = stats.get(a.id);
    return { athleteId: a.id, days: s.weekDays, planned: s.weekPlanned, complete: s.weekComplete };
  }).sort((x, y) => (y.days / y.planned) - (x.days / x.planned) || y.days - x.days || y.complete - x.complete
    || nameCmp(roster, x.athleteId, y.athleteId));

  // ---- mes (RMs superados)
  const monthPrs = prList.filter((p) => p.date.startsWith(month));
  const mes = roster.map((a) => {
    const mine = monthPrs.filter((p) => p.athleteId === a.id);
    const kg = mine.reduce((sum, p) => {
      if (p.unit === 'reps' || !(p.prev > 0)) return sum;
      const gain = p.value - p.prev;
      return sum + (p.unit === 'lb' ? gain * LB_TO_KG : gain);
    }, 0);
    return { athleteId: a.id, prs: mine.length, kgGain: Math.round(kg * 10) / 10 };
  }).filter((x) => x.prs > 0)
    .sort((x, y) => y.prs - x.prs || y.kgGain - x.kgGain || nameCmp(roster, x.athleteId, y.athleteId));
  const feed = monthPrs.slice().sort((x, y) => y.ts - x.ts).slice(0, 8).map(({ key, ...p }) => ({
    ...p, pct: p.prev > 0 ? Math.round((p.value - p.prev) / p.prev * 100) : 0,
  }));

  // ---- temporada
  const alltime = [...stats.values()].sort((x, y) => y.points - x.points || y.days - x.days
    || nameCmp(roster, x.athleteId, y.athleteId));

  // ---- reto del mes en curso
  let reto = null;
  const cur = retoList.find((r) => r.month === month);
  if (cur) {
    const progreso = roster.map((a) => {
      const value = retoValue(a.id, cur.tipo, month);
      return { athleteId: a.id, value, done: value >= cur.meta };
    }).sort((x, y) => y.value - x.value || nameCmp(roster, x.athleteId, y.athleteId));
    reto = { month, tipo: cur.tipo, meta: cur.meta, unidad: RETO_TIPOS[cur.tipo], ...(retoInfo || {}), progreso };
  }

  // ---- yo
  let me = null;
  if (meId && stats.has(meId)) {
    const pos = hoy.findIndex((h) => h.athleteId === meId);
    const sm = stats.get(meId);
    me = {
      ...sm,
      badgeList: BADGES.map((b) => ({ ...b, value: sm[b.stat] || 0, earned: (sm[b.stat] || 0) >= b.target })),
      checkinThisWeek: (ciWeeks.get(meId) || new Set()).has(wkStart),
      nutriToday: nutriList.find((n) => n.athleteId === meId && n.date === today) || null,
      mask: maskFn(meId)(today),
      prsMonth: monthPrs.filter((p) => p.athleteId === meId).length,
      rankAll: alltime.findIndex((x) => x.athleteId === meId) + 1,
      rankToday: pos >= 0 ? pos + 1 : null,
    };
  }

  const dow = weekdayIdx(today);
  const out = {
    today,
    week: { start: wkStart, end: wkEnd },
    roster,
    hoy,
    semana,
    mes: { ranking: mes, feed },
    alltime,
    reto,
    me,
    trainedToday: hoy.map((h) => h.athleteId),
  };
  if (withHistory) {
    const from = addDays(today, -84);
    const history = {};
    const weekMasks = {};
    for (const a of roster) {
      history[a.id] = byAthlete.get(a.id).filter((s) => s.date >= from)
        .map((s) => ({ date: s.date, done: s.done, total: s.total })).sort((x, y) => (x.date < y.date ? -1 : 1));
      // máscara vigente en cada una de las últimas 12 semanas (para la vista de progreso)
      weekMasks[a.id] = {};
      for (let w = 0; w < 12; w++) {
        const ws = addDays(wkStart, -7 * w);
        weekMasks[a.id][ws] = maskAt(hist[a.id], minDate(addDays(ws, 6), today));
      }
    }
    out.coach = {
      masks: Object.fromEntries(roster.map((a) => [a.id, maskFn(a.id)(today)])),
      weekMasks,
      withPlan: roster.filter((a) => withPlan.has(a.id)).map((a) => a.id),
      scheduledToday: roster.filter((a) => withPlan.has(a.id) && maskFn(a.id)(today)[dow] === '1').map((a) => a.id),
      checkinsWeek: roster.filter((a) => (ciWeeks.get(a.id) || new Set()).has(wkStart)).map((a) => a.id),
      nutriToday: nutriList.filter((n) => n.date === today).map(({ key, ...n }) => n),
      prsWeek: prList.filter((p) => inWeek(p.date)).length,
      history,
    };
  }
  return out;
}

function nameCmp(roster, idA, idB) {
  const a = roster.find((x) => x.id === idA)?.name || '';
  const b = roster.find((x) => x.id === idB)?.name || '';
  return a.localeCompare(b, 'es');
}
