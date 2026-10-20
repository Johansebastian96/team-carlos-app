// Sesiones firmadas (HMAC) y PIN de clientes.
// Las contraseñas y el secreto viven en variables de entorno de Netlify, nunca en el código.
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const ATHLETE_EMAIL = 'atletas@teamcarlos.com';
export const COACH_EMAIL = 'coach@teamcarlos.com';
const SESSION_DAYS = 60;

const b64 = (buf) => Buffer.from(buf).toString('base64url');
const sha = (s) => createHash('sha256').update(String(s)).digest();

function secret() {
  const s = process.env.TMC_SECRET;
  if (!s || s.length < 16) throw new Error('SERVER_NOT_CONFIGURED');
  return s;
}
function passwords() {
  const athlete = process.env.TMC_ATHLETE_PASS;
  const coach = process.env.TMC_COACH_PASS;
  // Si fueran iguales, cualquier cliente podría entrar como coach.
  if (!athlete || !coach || athlete === coach) throw new Error('SERVER_NOT_CONFIGURED');
  return { athlete, coach };
}

function sign(body) {
  return createHmac('sha256', secret()).update(body).digest('base64url');
}

// Comparación en tiempo constante (sin filtrar el largo).
function safeEqual(a, b) {
  return timingSafeEqual(sha(a), sha(b));
}

// "Época" de la contraseña: si Netlify cambia la contraseña, las sesiones viejas dejan de servir.
function epoch(role) {
  const p = passwords();
  return createHmac('sha256', secret()).update('epoch:' + role + ':' + (role === 'coach' ? p.coach : p.athlete)).digest('base64url').slice(0, 10);
}

// Devuelve el rol si el correo y la contraseña coinciden, o null.
export function checkCredentials(email, password) {
  const e = String(email || '').trim().toLowerCase();
  const p = String(password || '');
  const pw = passwords();
  const isCoach = safeEqual(p, pw.coach);
  const isAthlete = safeEqual(p, pw.athlete);
  if (e === COACH_EMAIL && isCoach) return 'coach';
  if (e === ATHLETE_EMAIL && isAthlete) return 'athlete';
  return null;
}

// role: 'coach' | 'athlete'. aid: cliente que entró con su PIN. v: versión de su PIN.
export function issueToken(role, aid = null, v = 0) {
  const payload = { r: role, e: epoch(role), exp: Date.now() + SESSION_DAYS * 864e5 };
  if (aid) { payload.a = aid; payload.v = v; }
  const body = b64(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

// Devuelve { role, aid, v } o null
export function verifyToken(token) {
  if (typeof token !== 'string' || token.length > 1000 || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig || !safeEqual(sig, sign(body))) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!data || typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    if (data.r !== 'coach' && data.r !== 'athlete') return null;
    if (data.e !== epoch(data.r)) return null;
    const aid = data.r === 'athlete' && typeof data.a === 'string' ? data.a : null;
    return { role: data.r, aid, v: aid ? Number(data.v) || 0 : 0 };
  } catch {
    return null;
  }
}

// PIN: hash con sal propia (no depende de TMC_SECRET, así cambiar el secreto no borra los PIN).
// Se guarda como JSON { s, h, v } donde v es la versión: al cambiar el PIN se cierran sus sesiones.
export const PIN_RE = /^\d{4}$/;
export function makePinRecord(pin, prevVersion = 0) {
  const s = randomBytes(16).toString('base64url');
  const h = scryptSync(String(pin), s, 32).toString('base64url');
  return { s, h, v: (Number(prevVersion) || 0) + 1 };
}
export function checkPin(pin, record) {
  if (!PIN_RE.test(String(pin || '')) || !record || !record.s || !record.h) return false;
  const h = scryptSync(String(pin), record.s, 32).toString('base64url');
  return safeEqual(h, record.h);
}
