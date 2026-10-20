(function () {
  'use strict';

  /* ================================================================ utilidades */
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DIAS = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];
  const DIAS_CORTOS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  const MESES3 = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  const LB = 0.45359237;

  const pad2 = (n) => (n < 10 ? '0' : '') + n;
  const localISO = (d) => { d = d || new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); };
  const today = () => localISO();
  const isoDate = (iso) => new Date(iso + 'T00:00:00Z');
  const addDays = (iso, n) => { const d = isoDate(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const dowOf = (iso) => (isoDate(iso).getUTCDay() + 6) % 7;
  const weekStart = (iso) => addDays(iso, -dowOf(iso));
  const daysBetween = (a, b) => Math.round((isoDate(b) - isoDate(a)) / 864e5);
  const fmtLong = (iso) => { const d = isoDate(iso); return DIAS[dowOf(iso)] + ', ' + d.getUTCDate() + ' DE ' + MESES[d.getUTCMonth()] + ' DE ' + d.getUTCFullYear(); };
  const fmtShort = (iso) => { const d = isoDate(iso); return d.getUTCDate() + ' ' + MESES3[d.getUTCMonth()] + '. ' + d.getUTCFullYear(); };
  const fmtDay = (iso) => { const d = isoDate(iso); return d.getUTCDate() + ' ' + MESES3[d.getUTCMonth()]; };
  function dayWord(iso) {
    const diff = daysBetween(today(), iso);
    if (diff === 0) return 'HOY';
    if (diff === 1) return 'MAÑANA';
    if (diff === -1) return 'AYER';
    return DIAS[dowOf(iso)];
  }
  function agoTs(ts) {
    const m = Math.max(0, Math.round((Date.now() - ts) / 60000));
    if (m < 1) return 'AHORA';
    if (m < 60) return 'HACE ' + m + ' MIN';
    const h = Math.round(m / 60);
    if (h < 24) return 'HACE ' + h + ' H';
    return 'HACE ' + Math.round(h / 24) + ' D';
  }
  function agoDate(iso) {
    const n = daysBetween(iso, today());
    if (n <= 0) return 'HOY';
    if (n === 1) return 'AYER';
    return 'HACE ' + n + ' DÍAS';
  }
  const nameKey = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  function initials(name) {
    const p = String(name || '').trim().split(/\s+/).filter(Boolean);
    return ((p[0] || '?').charAt(0) + (p[1] ? p[1].charAt(0) : '')).toUpperCase();
  }
  const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || '';
  const shortName = (name) => { const p = String(name || '').trim().split(/\s+/); return p[0] + (p[1] ? ' ' + p[1].charAt(0) + '.' : ''); };
  const fmtNum = (n) => { if (n == null || !isFinite(n)) return '—'; return String(Math.round(n * 10) / 10).replace('.', ','); };
  const parseNum = (v) => {
    if (v == null || v === '') return null;
    const n = parseFloat(String(v).replace(',', '.'));
    return isFinite(n) && n >= 0 ? n : null;
  };
  const roundTo = (n, step) => Math.round(n / step) * step;
  const rid = () => (Math.random().toString(36).slice(2) + '00000000').slice(0, 8);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const fmtClock = (sec) => { sec = Math.max(0, Math.ceil(sec)); return pad2(Math.floor(sec / 60)) + ':' + pad2(sec % 60); };
  const fmtWatch = (sec) => {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return (h ? h + ':' + pad2(m) : pad2(m)) + ':' + pad2(s);
  };
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);

  // ---- ejercicios
  const isLibre = (e) => e.modo === 'libre' || /\b(seg|min)\b/.test(nameKey(e.reps));
  const targetSets = (e) => { const n = parseInt(e.series, 10); return n > 0 && n <= 12 ? n : 1; };
  function repRange(txt) {
    const t = nameKey(txt);
    if (!t || /seg|min/.test(t)) return null;
    const nums = t.match(/\d+/g);
    if (!nums) return null;
    const a = +nums[0], b = +(nums[1] || nums[0]);
    return { lo: Math.min(a, b), hi: Math.max(a, b) };
  }
  function restSeconds(txt) {
    const t = nameKey(txt);
    const m = t.match(/(\d+(?:[.,]\d+)?)/);
    if (!m) return 0;
    let n = parseFloat(m[1].replace(',', '.'));
    if (/min/.test(t)) n *= 60;
    return Math.min(900, Math.round(n));
  }
  function prescText(e) {
    let p = '';
    if (e.series && e.reps) p = '<b>' + esc(e.series) + ' × ' + esc(e.reps) + '</b>';
    else if (e.reps || e.series) p = '<b>' + esc(e.reps || e.series + ' SERIES') + '</b>';
    if (e.descanso && e.descanso !== '-') p += (p ? ' · ' : '') + 'DESC. ' + esc(e.descanso);
    return p;
  }

  /* ================================================================ toast y confirmación */
  const toastEl = $('#toast');
  function toast(msg, icon, isErr) {
    toastEl.innerHTML = '<i class="ti ' + (icon || 'ti-check') + '" aria-hidden="true"></i><span>' + esc(msg) + '</span>';
    toastEl.style.color = isErr ? 'var(--danger)' : '';
    toastEl.style.borderColor = isErr ? 'var(--border-danger)' : '';
    toastEl.classList.add('show');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove('show'), isErr ? 4200 : 3000);
  }
  const toastErr = (e) => toast(e && e.message ? e.message : 'Algo salió mal. Intenta de nuevo.', 'ti-alert-triangle', true);

  // Primer toque: pide confirmación. Segundo toque (en 3 s): confirma.
  function confirmTap(btn, label) {
    if (btn.classList.contains('confirming')) {
      clearTimeout(btn._ct);
      btn.classList.remove('confirming');
      if (btn._orig !== undefined) { btn.innerHTML = btn._orig; delete btn._orig; }
      return true;
    }
    btn.classList.add('confirming');
    if (label) { btn._orig = btn.innerHTML; btn.textContent = label; }
    btn._ct = setTimeout(() => {
      btn.classList.remove('confirming');
      if (btn._orig !== undefined) { btn.innerHTML = btn._orig; delete btn._orig; }
    }, 3000);
    return false;
  }

  /* ================================================================ almacenamiento local */
  const store = {
    get(k) { try { return localStorage.getItem('tmc2_' + k); } catch (e) { return null; } },
    set(k, v) { try { if (v == null) localStorage.removeItem('tmc2_' + k); else localStorage.setItem('tmc2_' + k, v); } catch (e) { /* sin almacenamiento */ } },
  };
  // La versión anterior guardaba datos de prueba en el teléfono: se limpian.
  try { Object.keys(localStorage).forEach((k) => { if (/^tmc_/.test(k)) localStorage.removeItem(k); }); } catch (e) { /* nada */ }

  const S = {
    role: store.get('role'),
    token: store.get('token'),
    gate: store.get('gate'),
    me: (() => { try { return JSON.parse(store.get('me') || 'null'); } catch (e) { return null; } })(),
    day: today(),
    state: null,
    stateAt: 0,
    plan: undefined,     // undefined = cargando, null = sin plan
    rms: null,
    history: {},         // fecha -> sesión guardada en el servidor
    drafts: {},          // fecha -> sesión en edición
    sel: today(),
    openEx: null,
    view: 'home',
    saveMsg: '',
    saveErr: false,
    podioTab: 'hoy',
    podioFilter: 'todos',
    rmFilter: 'todos',
    rmOpen: null,
    rmTab: 'mis-rms',
    timerMode: 'rest',
    // coach
    cstate: null,
    cview: 'dashboard',
    clientOpen: null,
    clientInline: null,
    lastCreated: null,
    pe: { athleteId: '', plan: null, exists: false, dirty: false, open: {}, loading: false },
    wk: 0,
  };

  function setSession(o) {
    Object.assign(S, o);
    store.set('role', S.role);
    store.set('token', S.token);
    store.set('gate', S.gate);
    store.set('me', S.me ? JSON.stringify(S.me) : null);
  }

  /* ================================================================ API */
  let expiring = false;
  async function api(method, path, body, opts) {
    opts = opts || {};
    const token = opts.token !== undefined ? opts.token : S.token;
    let res;
    try {
      res = await fetch('/api/' + path, {
        method,
        headers: Object.assign({ 'content-type': 'application/json' }, token ? { authorization: 'Bearer ' + token } : {}),
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: 'no-store',
      });
    } catch (e) {
      const err = new Error('Sin conexión. Revisa tu internet.');
      err.offline = true;
      throw err;
    }
    let data = {};
    try { data = await res.json(); } catch (e) { /* sin cuerpo */ }
    if (!res.ok) {
      const err = new Error(data.message || ('Error ' + res.status));
      err.status = res.status;
      err.code = data.error;
      if (data.error === 'NO_SESSION' && !expiring) {
        expiring = true;
        setTimeout(() => { expiring = false; }, 1500);
        logout(true);
        showLoginError('Tu sesión expiró. Vuelve a entrar.');
      } else if ((data.error === 'PROFILE_GONE' || data.error === 'PIN_CHANGED') && S.role === 'athlete' && S.me && !expiring) {
        expiring = true;
        setTimeout(() => { expiring = false; }, 1500);
        profileGone(err.message);
      }
      throw err;
    }
    return data;
  }

  /* ================================================================ pantallas */
  const splash = $('#splash-screen');
  const who = $('#who-screen');
  const app = $('#app');
  const coach = $('#coach-panel');
  const logoutBtn = $('#logout-btn');
  const loginError = $('#login-error');

  function showOnly(which) {
    splash.classList.toggle('hidden', which !== 'splash');
    who.classList.toggle('hidden', which !== 'who');
    app.classList.toggle('active', which === 'app');
    coach.classList.toggle('active', which === 'coach');
    logoutBtn.classList.toggle('show', which === 'app' || which === 'coach');
    document.body.classList.toggle('has-nav', which === 'app' || which === 'coach');
    updateRestFloat();
    window.scrollTo(0, 0);
  }
  function showLoginError(msg) {
    loginError.textContent = msg;
    loginError.classList.add('show');
  }

  $('#splash-date').textContent = fmtLong(today());

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#login-btn');
    const email = $('#login-email').value.trim();
    const password = $('#login-password').value;
    loginError.classList.remove('show');
    btn.disabled = true;
    try {
      const r = await api('POST', 'login', { email, password }, { token: null });
      $('#login-password').value = '';
      if (r.role === 'coach') {
        setSession({ role: 'coach', token: r.token, gate: null, me: null });
        enterCoach();
      } else {
        setSession({ role: 'athlete', token: null, gate: r.token, me: null });
        showWho();
      }
    } catch (err) {
      showLoginError(err.status === 401 ? 'Correo o contraseña incorrectos' : err.message);
    } finally {
      btn.disabled = false;
    }
  });

  function logout(silent) {
    flushSaves();
    clearTimeout(stateTimer);
    toastEl.classList.remove('show');
    restStop(); swReset(); ivReset();
    setSession({ role: null, token: null, gate: null, me: null });
    S.state = null; S.plan = undefined; S.rms = null; S.history = {}; S.drafts = {}; S.cstate = null;
    S.pe = { athleteId: '', plan: null, exists: false, dirty: false, open: {}, loading: false };
    if (!silent) loginError.classList.remove('show');
    showOnly('splash');
  }
  logoutBtn.addEventListener('click', () => {
    if (S.role === 'coach' && S.pe.dirty && !window.confirm('Tienes cambios sin guardar en un plan. ¿Salir de todos modos?')) return;
    logout();
  });

  /* ================================================================ ¿quién eres? */
  let whoRoster = [];
  let whoPick = null;
  let newGender = null;
  const digitsOnly = (el) => el.addEventListener('input', () => { el.value = el.value.replace(/\D/g, '').slice(0, 4); });
  digitsOnly($('#pin-input'));
  digitsOnly($('#new-pin'));

  async function showWho() {
    showOnly('who');
    $('#who-list').classList.remove('hidden');
    $('#who-pin-form').classList.add('hidden');
    $('#who-grid').innerHTML = '<div class="who-empty">Cargando…</div>';
    try {
      const r = await api('GET', 'roster', undefined, { token: S.gate || S.token });
      whoRoster = r.roster;
      $('#who-grid').innerHTML = whoRoster.length
        ? whoRoster.map((a) => '<button type="button" class="who-btn" data-id="' + a.id + '"><span class="who-av">' + esc(initials(a.name)) + '</span><span class="who-btn-name">' + esc(a.name) + '</span></button>').join('')
        : '<div class="who-empty">Aún no hay nadie. Crea tu perfil abajo.</div>';
    } catch (e) {
      if (e.code !== 'NO_SESSION') $('#who-grid').innerHTML = '<div class="who-empty">' + esc(e.message) + '</div>';
    }
  }
  $('#who-grid').addEventListener('click', (e) => {
    const b = e.target.closest('.who-btn');
    if (!b) return;
    whoPick = whoRoster.find((a) => a.id === b.dataset.id);
    if (!whoPick) return;
    $('#pin-name').textContent = whoPick.name;
    $('#pin-input').value = '';
    $('#pin-error').textContent = '';
    $('#who-list').classList.add('hidden');
    $('#who-pin-form').classList.remove('hidden');
    window.scrollTo(0, 0);
    setTimeout(() => $('#pin-input').focus(), 50);
  });
  $('#pin-back').addEventListener('click', () => {
    $('#who-pin-form').classList.add('hidden');
    $('#who-list').classList.remove('hidden');
  });
  $('#who-pin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pin = $('#pin-input').value;
    const errEl = $('#pin-error');
    if (!/^\d{4}$/.test(pin)) { errEl.textContent = 'El PIN tiene 4 números'; return; }
    const btn = $('#pin-btn');
    btn.disabled = true;
    errEl.textContent = '';
    try {
      const r = await api('POST', 'athletes/' + whoPick.id + '/enter', { pin }, { token: S.gate || S.token });
      setSession({ role: 'athlete', token: r.token, me: r.athlete });
      enterApp();
    } catch (err) {
      if (err.code === 'BAD_PIN') { errEl.textContent = 'PIN incorrecto'; $('#pin-input').value = ''; $('#pin-input').focus(); }
      else if (err.code === 'LOCKED') errEl.textContent = err.message;
      else if (err.code === 'ATHLETE_NOT_FOUND') { showWho(); toast('Ese perfil ya no existe', 'ti-alert-triangle', true); }
      else if (err.code !== 'NO_SESSION') errEl.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });
  $('#new-gender').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    newGender = b.dataset.v;
    $$('#new-gender button').forEach((x) => x.classList.toggle('on', x === b));
  });
  $('#who-new-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#new-name').value.trim();
    const pin = $('#new-pin').value;
    const errEl = $('#new-error');
    if (name.length < 2) { errEl.textContent = 'Escribe tu nombre'; return; }
    if (!newGender) { errEl.textContent = 'Elige hombre o mujer'; return; }
    if (!/^\d{4}$/.test(pin)) { errEl.textContent = 'Crea un PIN de 4 números'; return; }
    const btn = $('#new-btn');
    btn.disabled = true;
    errEl.textContent = '';
    try {
      const r = await api('POST', 'athletes', { name, gender: newGender, pin }, { token: S.gate || S.token });
      setSession({ role: 'athlete', token: r.token, me: r.athlete });
      $('#new-name').value = ''; $('#new-pin').value = '';
      toast('¡Bienvenido al team, ' + firstName(r.athlete.name) + '!', 'ti-confetti');
      enterApp();
    } catch (err) {
      if (err.code === 'NAME_TAKEN') errEl.textContent = 'Ya existe alguien con ese nombre. Búscalo arriba y entra con tu PIN.';
      else if (err.code !== 'NO_SESSION') errEl.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });
  $('#who-logout').addEventListener('click', () => logout());

  /* ================================================================ app del cliente: carga */
  // Cada carga verifica que sigue siendo el mismo cliente (pudo cambiar de perfil o salir mientras tanto).
  const sameMe = (id) => S.role === 'athlete' && !!S.me && S.me.id === id;
  const stale = () => Object.assign(new Error('stale'), { stale: true });
  async function loadState() {
    const id = S.me && S.me.id;
    const st = await api('GET', 'state?date=' + today());
    if (!sameMe(id)) throw stale();
    S.state = st;
    S.stateAt = Date.now();
  }
  async function loadPlan() {
    const id = S.me.id;
    const r = await api('GET', 'plan?athleteId=' + id);
    if (!sameMe(id)) throw stale();
    S.plan = r.plan || null;
  }
  async function loadHistory() {
    const id = S.me.id;
    const from = addDays(today(), -56);
    const to = addDays(weekStart(today()), 6);
    const r = await api('GET', 'sessions?athleteId=' + id + '&from=' + from + '&to=' + to);
    if (!sameMe(id)) throw stale();
    const map = {};
    r.sessions.forEach((s) => { s.finished = !!s.finishedAt; map[s.date] = s; });
    S.history = map;
  }
  async function loadRms() {
    const id = S.me.id;
    const r = await api('GET', 'rms?athleteId=' + id);
    if (!sameMe(id)) throw stale();
    S.rms = r.doc ? { catalog: r.doc.catalog || [], data: r.doc.data || {} } : rmDefaultDoc();
  }

  function profileGone(msg) {
    toast(msg || 'Tu perfil ya no existe. Habla con Carlos.', 'ti-alert-triangle', true);
    setSession({ token: null, me: null });
    if (S.gate) showWho(); else logout(true);
  }

  async function enterApp() {
    showOnly('app');
    S.sel = today(); S.day = today();
    S.plan = undefined; S.history = {}; S.drafts = {}; S.rms = null; S.state = null; S.openEx = null;
    $('#me-avatar').textContent = initials(S.me.name);
    switchView('home');
    await refreshAthlete();
  }
  async function refreshAthlete() {
    if (!S.me) return;
    const id = S.me.id;
    const results = await Promise.allSettled([loadState(), loadPlan(), loadHistory(), loadRms()]);
    if (!sameMe(id)) return;
    if (S.state && S.state.me === null) { profileGone(); return; }
    if (S.plan === undefined) S.plan = null;
    if (!S.rms) S.rms = rmDefaultDoc();
    renderAthleteAll();
    const fail = results.find((r) => r.status === 'rejected' && r.reason && !r.reason.stale && r.reason.code !== 'NO_SESSION');
    if (fail) toastErr(fail.reason);
  }
  function renderAthleteAll() {
    renderHome();
    if (S.view === 'rms') renderRms();
    if (S.view === 'atletas') renderEquipo();
    if (S.view === 'stats') renderPodio();
    if (S.view === 'timer') renderTimer();
  }

  let stateTimer = null;
  function scheduleStateRefresh() {
    clearTimeout(stateTimer);
    stateTimer = setTimeout(async () => {
      try {
        await loadState();
        if (S.state.me === null) return profileGone();
        renderStats();
        if (S.view === 'atletas') renderEquipo();
        if (S.view === 'stats') renderPodio();
      } catch (e) { /* se reintenta en el próximo ciclo */ }
    }, 1500);
  }

  // Refresco automático del podio y del equipo, y cambio de día a medianoche.
  async function periodic() {
    if (document.hidden) return;
    if (today() !== S.day) {
      S.day = today();
      $('#splash-date').textContent = fmtLong(today());
      if (S.role === 'athlete' && S.me && app.classList.contains('active')) {
        const d = S.drafts[S.sel];
        const midWorkout = d && okSets(d) > 0 && !d.finished;
        if (!midWorkout) { S.sel = today(); S.openEx = null; }
        await refreshAthlete();
        return;
      }
    }
    try {
      if (S.role === 'athlete' && S.me && app.classList.contains('active') && ['atletas', 'stats'].indexOf(S.view) !== -1) {
        await loadState();
        if (S.state.me === null) return profileGone();
        renderStats();
        if (S.view === 'atletas') renderEquipo();
        if (S.view === 'stats') renderPodio();
      } else if (S.role === 'coach' && coach.classList.contains('active') && (S.cview === 'dashboard' || S.cview === 'progreso')) {
        await loadCoachState();
        renderCoachView();
      }
    } catch (e) { /* silencioso */ }
  }
  setInterval(periodic, 45000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { flushSaves(); return; }
    if (anyTimerRunning()) wake();
    if (Date.now() - S.stateAt > 20000) periodic();
  });

  /* ================================================================ navegación del cliente */
  $$('#app .nav-item').forEach((btn) => btn.addEventListener('click', () => switchView(btn.dataset.view)));
  function switchView(v) {
    S.view = v;
    $$('#app .nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
    $$('#app main.view').forEach((el) => {
      const on = el.id === 'view-' + v;
      el.classList.toggle('active', on);
      el.classList.toggle('on', on);
    });
    if (v === 'home') renderHome();
    if (v === 'rms') renderRms();
    if (v === 'timer') renderTimer();
    if (v === 'atletas') renderEquipo();
    if (v === 'stats') renderPodio();
    updateRestFloat();
    window.scrollTo(0, 0);
  }
  $('#me-avatar').addEventListener('click', () => {
    flushSaves();
    clearTimeout(stateTimer);
    setSession({ token: null, me: null });
    if (S.gate) showWho(); else logout();
  });

  /* ================================================================ HOY */
  const planDayFor = (iso) => (S.plan && S.plan.dias ? S.plan.dias.find((d) => d.dow === dowOf(iso)) || null : null);
  const dayExercises = (day) => { const out = []; (day.secciones || []).forEach((s) => (s.ejercicios || []).forEach((e) => out.push(e))); return out; };
  const sessionFor = (iso) => S.drafts[iso] || S.history[iso] || null;
  const okSets = (s) => Object.keys((s && s.ex) || {}).reduce((n, k) => n + (s.ex[k].sets || []).filter((x) => x.ok).length, 0);
  const trainedOn = (iso) => okSets(sessionFor(iso)) > 0;
  const exRecord = (iso, e) => { const s = sessionFor(iso); return s && s.ex ? s.ex[e.id] || null : null; };
  const exDone = (rec) => !!(rec && rec.sets && rec.sets.length && rec.sets.every((x) => x.ok));
  const defaultSets = (e) => Array.from({ length: targetSets(e) }, () => ({ w: null, r: null, ok: false }));
  const unitOf = () => ((S.plan && S.plan.unidad) || 'kg');

  function heroTitle(text) {
    return esc(text).split(' + ').join(' +<br>');
  }
  function renderHero() {
    const t = today();
    $('#hero-date').textContent = fmtLong(t);
    const day = planDayFor(t);
    let title = 'TU<br>PLAN';
    if (S.plan === null) title = 'TU PLAN<br>ESTÁ EN CAMINO';
    else if (S.plan) title = day ? heroTitle(day.titulo || DIAS[dowOf(t)]) : 'DÍA DE<br>DESCANSO';
    $('#hero-title').innerHTML = title;
    $('#hero-eyebrow').textContent = 'HOY · ' + (S.me ? firstName(S.me.name).toUpperCase() + ' · ' : '') + 'COACH CARLOS';
  }
  function renderStats() {
    const me = S.state && S.state.me;
    const planned = S.plan && S.plan.dias ? S.plan.dias.length : (me ? me.weekPlanned : 0);
    const ws = weekStart(today());
    let weekDays = 0;
    for (let i = 0; i < 7; i++) if (trainedOn(addDays(ws, i))) weekDays++;
    $('#stat-streak').textContent = me ? me.streak : 0;
    $('#stat-week').textContent = weekDays + '/' + planned;
    $('#stat-prs').textContent = me ? me.prsMonth : 0;
  }
  function renderStrip() {
    const ws = weekStart(today());
    const t = today();
    let html = '';
    for (let i = 0; i < 7; i++) {
      const iso = addDays(ws, i);
      const cls = ['day-chip'];
      if (planDayFor(iso)) cls.push('has-plan');
      if (trainedOn(iso)) cls.push('trained');
      if (iso === t) cls.push('is-today');
      if (iso === S.sel) cls.push('selected');
      html += '<button type="button" class="' + cls.join(' ') + '" data-date="' + iso + '" aria-label="' + DIAS[i] + ' ' + fmtDay(iso) + '">' +
        '<span class="dl">' + DIAS_CORTOS[i] + '</span><span class="dn">' + isoDate(iso).getUTCDate() + '</span><span class="dd"></span></button>';
    }
    $('#day-strip').innerHTML = html;
  }
  function renderHome() {
    if (!S.me) return;
    renderHero();
    renderStats();
    renderStrip();
    renderDay();
    renderPlanInfo();
  }

  function emptyCard(icon, title, sub, extra) {
    return '<div class="empty-card"><i class="ti ' + icon + '" aria-hidden="true"></i><div class="empty-title">' + esc(title) + '</div>' +
      (sub ? '<div class="empty-sub">' + esc(sub) + '</div>' : '') + (extra || '') + '</div>';
  }

  function renderDay() {
    const el = $('#day-content');
    const iso = S.sel;
    if (S.plan === undefined) { el.innerHTML = '<div class="loading-line">Cargando tu plan…</div>'; return; }
    if (!S.plan) {
      el.innerHTML = emptyCard('ti-clipboard-list', 'Tu plan está en camino', 'Carlos está armando tu plan personalizado. Cuando lo publique, aquí verás tu entrenamiento de cada día.');
      return;
    }
    const day = planDayFor(iso);
    const word = dayWord(iso);
    const dname = DIAS[dowOf(iso)];
    if (!day) {
      el.innerHTML = '<div class="section-row"><div class="section-heading">' + esc(word) + '</div></div>' +
        emptyCard('ti-moon', 'Día de descanso', 'Recupera bien: duerme 7–9 horas, hidrátate y come acorde a tu gasto. Tu cuerpo crece mientras descansa.');
      return;
    }
    const future = iso > today();
    const exs = dayExercises(day);
    const doneN = exs.filter((e) => exDone(exRecord(iso, e))).length;
    const pct = exs.length ? Math.round(doneN / exs.length * 100) : 0;
    let html = '<div class="day-head">' +
      '<div class="dh-eyebrow">' + esc(word === dname ? dname : word + ' · ' + dname) + ' · ' + fmtDay(iso) + '</div>' +
      '<div class="dh-title">' + esc(day.titulo || dname) + '</div>' +
      (day.subtitulo ? '<div class="dh-sub">' + esc(day.subtitulo) + '</div>' : '') +
      '<div class="dh-chips">' +
        (day.duracion ? '<span class="dh-chip"><i class="ti ti-clock" aria-hidden="true"></i>' + esc(day.duracion) + '</span>' : '') +
        (day.rpe ? '<span class="dh-chip"><i class="ti ti-flame" aria-hidden="true"></i>RPE ' + esc(day.rpe) + '</span>' : '') +
        '<span class="dh-chip"><i class="ti ti-list-check" aria-hidden="true"></i>' + plural(exs.length, 'EJERCICIO', 'EJERCICIOS') + '</span>' +
      '</div>' +
      (day.nota ? '<div class="dh-note">' + esc(day.nota) + '</div>' : '') +
      (future ? '' : '<div class="dh-progress"><div class="dh-progress-top"><span>PROGRESO</span><span><b>' + doneN + '</b>/' + exs.length + ' EJERCICIOS</span></div>' +
        '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div></div>') +
      '</div>';

    (day.secciones || []).forEach((s, si) => {
      const title = s.titulo || (day.secciones.length > 1 ? 'PARTE ' + (si + 1) : 'EJERCICIOS');
      html += '<div class="sec-block"><div class="sec-head"><div class="wod-tag"><span class="tag-rule"></span><span class="tag-name">' + esc(title) + '</span></div>' +
        (s.nota ? '<span class="sec-note">' + esc(s.nota) + '</span>' : '') + '</div>';
      s.ejercicios.forEach((e, i) => { html += exItemHtml(e, i + 1, iso, future); });
      html += '</div>';
    });

    if (future) {
      html += '<div class="readonly-note">Podrás registrar este día el ' + esc(dname.toLowerCase()) + '</div>';
    } else {
      const sess = sessionFor(iso);
      html += '<div class="finish-wrap">';
      if (sess && sess.finished) {
        html += '<div class="finished-card"><i class="ti ti-circle-check" aria-hidden="true"></i><div class="fc-main">' +
          '<div class="fc-title">Entrenamiento terminado</div><div class="fc-sub">' + doneN + '/' + exs.length + ' ejercicios · ' + okSets(sess) + ' series</div></div>' +
          '<button type="button" data-act="unfinish">Deshacer</button></div>';
      } else if (okSets(sess) > 0) {
        html += '<button type="button" class="publish-btn" data-act="finish"><i class="ti ti-flag-check" aria-hidden="true"></i><span>TERMINAR ENTRENAMIENTO</span></button>';
      }
      html += '<div class="save-state' + (S.saveErr ? ' err' : '') + '" id="save-state">' + esc(S.saveMsg) + '</div></div>';
    }
    el.innerHTML = html;
  }

  function exItemHtml(e, n, iso, future) {
    const rec = exRecord(iso, e);
    const sets = rec && rec.sets && rec.sets.length ? rec.sets : defaultSets(e);
    const ok = sets.filter((x) => x.ok).length;
    const done = exDone(rec);
    const cls = 'ex-item' + (done ? ' done' : ok ? ' partial' : '') + (S.openEx === e.id && !future ? ' open' : '');
    const state = done ? '<i class="ti ti-check" aria-hidden="true"></i>' : ok ? ok + '/' + sets.length : '';
    let html = '<div class="' + cls + '" data-ex="' + esc(e.id) + '">' +
      '<button type="button" class="ex-head" data-act="toggle-ex" aria-expanded="' + (!future && S.openEx === e.id) + '">' +
        '<span class="ex-idx">' + n + '</span>' +
        '<span class="ex-main"><span class="ex-name">' + esc(e.nombre) + '</span><span class="ex-presc">' + prescText(e) + '</span></span>' +
        (future ? '' : '<span class="ex-state">' + state + '</span>') +
      '</button>';
    if (!future && S.openEx === e.id) html += exBodyHtml(e, iso, sets);
    return html + '</div>';
  }

  function lastTimeFor(e, iso) {
    const key = nameKey(e.nombre);
    const dates = Object.keys(S.history).filter((d) => d < iso).sort().reverse();
    for (const d of dates) {
      const ex = S.history[d].ex || {};
      for (const id of Object.keys(ex)) {
        const x = ex[id];
        if ((id === e.id || nameKey(x.nombre) === key) && x.sets && x.sets.some((t) => t.ok)) {
          return { date: d, sets: x.sets.filter((t) => t.ok) };
        }
      }
    }
    return null;
  }
  // Regla de Carlos: sube 2,5–5 % cuando completas el rango alto de repeticiones.
  function progressionHint(e, last) {
    if (!last || isLibre(e)) return null;
    const range = repRange(e.reps);
    if (!range) return null;
    const done = last.sets.filter((s) => s.w > 0 && s.r != null);
    if (done.length < targetSets(e) || !done.every((s) => s.r >= range.hi)) return null;
    const top = Math.max.apply(null, done.map((s) => s.w));
    const step = unitOf() === 'lb' ? 1 : 0.5;
    let lo = Math.ceil(top * 1.025 / step - 1e-9) * step;
    const hi = roundTo(top * 1.05, step);
    if (lo <= top) lo = top + step;
    return hi > lo ? fmtNum(lo) + '–' + fmtNum(hi) : fmtNum(lo);
  }
  function matchRm(nombre) {
    if (!S.rms) return null;
    const n = nameKey(nombre);
    let best = null;
    S.rms.catalog.forEach((c) => {
      const k = nameKey(c.name);
      const hit = n === k || (n.indexOf(k + ' ') === 0 && /^(con|en|\(|\/|-|o )/.test(n.slice(k.length + 1)));
      if (hit && (!best || k.length > nameKey(best.name).length)) best = c;
    });
    return best;
  }
  // Carga sugerida a partir de tu RM, dejando 2 repeticiones en reserva.
  function rmHint(e) {
    const rm = matchRm(e.nombre);
    if (!rm || rm.unit === 'reps') return null;
    const d = rmEntry(rm.name);
    if (!d || !d.current) return null;
    const range = repRange(e.reps);
    if (!range) return null;
    const pct = (r) => 1 / (1 + (r + 2) / 30);
    const unit = unitOf();
    let v = d.current;
    if (rm.unit !== unit) v = rm.unit === 'kg' ? v / LB : v * LB;
    const step = unit === 'lb' ? 5 : 2.5;
    const lo = roundTo(v * pct(range.hi), step);
    const hi = roundTo(v * pct(range.lo), step);
    return {
      text: (lo === hi ? fmtNum(lo) : fmtNum(lo) + '–' + fmtNum(hi)) + ' ' + unit.toUpperCase(),
      pct: Math.round(pct(range.hi) * 100) + (range.hi !== range.lo ? '–' + Math.round(pct(range.lo) * 100) : '') + '%',
      rm: fmtNum(d.current) + ' ' + rm.unit.toUpperCase(),
    };
  }

  function exBodyHtml(e, iso, sets) {
    const libre = isLibre(e);
    const unit = unitOf().toUpperCase();
    const last = lastTimeFor(e, iso);
    const hints = [];
    if (e.nota) hints.push('<div class="hint"><i class="ti ti-info-circle" aria-hidden="true"></i><span>' + esc(e.nota) + '</span></div>');
    if (last) {
      const txt = libre ? plural(last.sets.length, 'serie hecha', 'series hechas')
        : last.sets.map((s) => (s.w != null ? fmtNum(s.w) + ' × ' : '') + (s.r != null ? s.r : '—')).join(' · ');
      hints.push('<div class="hint"><i class="ti ti-history" aria-hidden="true"></i><span>ÚLTIMA VEZ (' + agoDate(last.date) + '): ' + esc(txt) + (libre || !last.sets.some((s) => s.w != null) ? '' : ' ' + unit) + '</span></div>');
    }
    const up = progressionHint(e, last);
    if (up) hints.push('<div class="hint up"><i class="ti ti-trending-up" aria-hidden="true"></i><span>¡Completaste el rango alto! Sube a ' + up + ' ' + unit + '</span></div>');
    const rmh = libre ? null : rmHint(e);
    if (rmh) hints.push('<div class="hint rm"><i class="ti ti-target" aria-hidden="true"></i><span>CARGA SUGERIDA ' + esc(rmh.text) + ' <span class="muted">· ' + rmh.pct + ' DE TU RM (' + esc(rmh.rm) + ')</span></span></div>');

    const range = repRange(e.reps);
    let rows = '';
    sets.forEach((s, i) => {
      const ph = last ? last.sets[i] || last.sets[last.sets.length - 1] : null;
      if (libre) {
        rows += '<div class="set-row' + (s.ok ? ' ok' : '') + '" data-i="' + i + '"><span class="set-label">SERIE ' + (i + 1) + '</span>' +
          '<span class="set-free">' + esc(e.reps || 'HECHO') + '</span>' +
          '<button type="button" class="set-ok" data-act="set-ok" aria-label="Marcar serie ' + (i + 1) + '"><i class="ti ti-check" aria-hidden="true"></i></button></div>';
      } else {
        const wPh = ph && ph.w != null ? fmtNum(ph.w) : '—';
        const rPh = ph && ph.r != null ? ph.r : (range ? (range.lo === range.hi ? range.lo : range.lo + '-' + range.hi) : '—');
        rows += '<div class="set-row' + (s.ok ? ' ok' : '') + '" data-i="' + i + '"><span class="set-label">SERIE ' + (i + 1) + '</span>' +
          '<label class="set-field"><input type="text" inputmode="decimal" autocomplete="off" data-f="w" value="' + (s.w != null ? fmtNum(s.w) : '') + '" placeholder="' + esc(wPh) + '" aria-label="Peso serie ' + (i + 1) + '"><span>' + unit + '</span></label>' +
          '<label class="set-field"><input type="text" inputmode="numeric" autocomplete="off" data-f="r" value="' + (s.r != null ? s.r : '') + '" placeholder="' + esc(rPh) + '" aria-label="Repeticiones serie ' + (i + 1) + '"><span>REPS</span></label>' +
          '<button type="button" class="set-ok" data-act="set-ok" aria-label="Marcar serie ' + (i + 1) + '"><i class="ti ti-check" aria-hidden="true"></i></button></div>';
      }
    });
    const rest = restSeconds(e.descanso);
    return '<div class="ex-body">' + (hints.length ? '<div class="ex-hints">' + hints.join('') + '</div>' : '') + rows +
      '<div class="ex-actions">' +
        '<button type="button" data-act="set-add"><i class="ti ti-plus" aria-hidden="true"></i>Serie</button>' +
        (sets.length > 1 ? '<button type="button" data-act="set-del"><i class="ti ti-minus" aria-hidden="true"></i>Serie</button>' : '') +
        (rest ? '<button type="button" class="rest-btn" data-act="rest"><i class="ti ti-clock-play" aria-hidden="true"></i>' + fmtClock(rest) + '</button>' : '') +
      '</div></div>';
  }

  function findExercise(id) {
    const day = planDayFor(S.sel);
    if (!day) return null;
    return dayExercises(day).find((e) => e.id === id) || null;
  }
  function ensureDraft(iso) {
    if (!S.drafts[iso]) {
      const base = S.history[iso];
      S.drafts[iso] = base ? clone(base) : { date: iso, ex: {}, finished: false };
      if (!S.drafts[iso].ex) S.drafts[iso].ex = {};
    }
    return S.drafts[iso];
  }
  function ensureEx(draft, e) {
    if (!draft.ex[e.id] || !draft.ex[e.id].sets || !draft.ex[e.id].sets.length) draft.ex[e.id] = { nombre: e.nombre, sets: defaultSets(e) };
    draft.ex[e.id].nombre = e.nombre;
    return draft.ex[e.id];
  }

  $('#day-strip').addEventListener('click', (ev) => {
    const b = ev.target.closest('.day-chip');
    if (!b) return;
    S.sel = b.dataset.date;
    S.openEx = null;
    S.saveMsg = ''; S.saveErr = false;
    renderStrip();
    renderDay();
  });

  const dayContent = $('#day-content');
  dayContent.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    const iso = S.sel;
    if (act === 'finish' || act === 'unfinish') {
      const d = ensureDraft(iso);
      d.finished = act === 'finish';
      if (d.finished) {
        const day = planDayFor(iso);
        const exs = day ? dayExercises(day) : [];
        const complete = exs.length && exs.every((e) => exDone(d.ex[e.id]));
        toast(complete ? '¡Sesión completa! +25 puntos' : '¡Buen trabajo! +10 puntos', 'ti-trophy');
      }
      renderDay();
      saveNow(iso);
      return;
    }
    const item = btn.closest('.ex-item');
    if (!item) return;
    const e = findExercise(item.dataset.ex);
    if (!e) return;
    if (act === 'toggle-ex') {
      S.openEx = S.openEx === e.id ? null : e.id;
      renderDay();
      if (S.openEx) scrollIntoViewIfNeeded($('.ex-item.open', dayContent));
      return;
    }
    if (iso > today()) return;
    const draft = ensureDraft(iso);
    const rec = ensureEx(draft, e);
    if (act === 'set-ok') {
      const i = +btn.closest('.set-row').dataset.i;
      const s = rec.sets[i];
      s.ok = !s.ok;
      if (s.ok) {
        const last = lastTimeFor(e, iso);
        const ph = last ? last.sets[i] || last.sets[last.sets.length - 1] : null;
        if (!isLibre(e) && ph) {
          if (s.w == null && ph.w != null) s.w = ph.w;
          if (s.r == null && ph.r != null) s.r = ph.r;
        }
        const allDone = rec.sets.every((x) => x.ok);
        const rest = restSeconds(e.descanso);
        if (rest) restStart(rest, e.nombre);
        if (allDone) {
          const day = planDayFor(iso);
          const next = dayExercises(day).find((x) => !exDone(draft.ex[x.id]));
          S.openEx = next ? next.id : null;
        }
      }
      renderDay();
      renderStrip();
      renderStats();
      if (S.openEx && S.openEx !== e.id) scrollIntoViewIfNeeded($('.ex-item.open', dayContent));
      scheduleSave(iso, 400);
      return;
    }
    if (act === 'set-add') {
      const lastSet = rec.sets[rec.sets.length - 1];
      rec.sets.push({ w: lastSet ? lastSet.w : null, r: null, ok: false });
      if (rec.sets.length > 12) rec.sets.length = 12;
      renderDay(); scheduleSave(iso); return;
    }
    if (act === 'set-del') {
      if (rec.sets.length > 1) rec.sets.pop();
      renderDay(); renderStrip(); scheduleSave(iso); return;
    }
    if (act === 'rest') {
      restStart(restSeconds(e.descanso), e.nombre);
    }
  });
  dayContent.addEventListener('input', (ev) => {
    const input = ev.target;
    if (!input.dataset.f) return;
    const item = input.closest('.ex-item');
    const e = item && findExercise(item.dataset.ex);
    if (!e || S.sel > today()) return;
    const rec = ensureEx(ensureDraft(S.sel), e);
    const i = +input.closest('.set-row').dataset.i;
    const v = parseNum(input.value);
    if (input.dataset.f === 'w') rec.sets[i].w = v != null ? Math.min(v, 2000) : null;
    else rec.sets[i].r = v != null ? Math.min(Math.round(v), 999) : null;
    scheduleSave(S.sel);
  });
  function scrollIntoViewIfNeeded(el) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < 60 || r.top > window.innerHeight - 200) window.scrollBy({ top: r.top - 80, behavior: 'smooth' });
  }

  // ---- guardado automático del entrenamiento
  // Cada guardado lleva una "foto" (cliente, token y contenido) tomada en el momento,
  // así nada se pierde aunque cambie el perfil o se cierre sesión mientras tanto.
  const saveTimers = {};
  const saving = {};
  function setSaveState(msg, err) {
    S.saveMsg = msg; S.saveErr = !!err;
    const el = $('#save-state');
    if (el) { el.textContent = msg; el.classList.toggle('err', !!err); }
  }
  function sessionSnapshot(iso) {
    const d = S.drafts[iso];
    if (!d || !S.me || !S.token) return null;
    const day = planDayFor(iso);
    return {
      iso, me: S.me, token: S.token,
      body: clone({ dow: dowOf(iso), titulo: day ? day.titulo : (d.titulo || ''), total: day ? dayExercises(day).length : 0, ex: d.ex, finished: !!d.finished }),
    };
  }
  function scheduleSave(iso, delay) {
    setSaveState('Guardando…');
    clearTimeout(saveTimers[iso]);
    saveTimers[iso] = setTimeout(() => { delete saveTimers[iso]; saveSession(sessionSnapshot(iso)); }, delay || 800);
  }
  function flushSaves() {
    Object.keys(saveTimers).forEach((iso) => { clearTimeout(saveTimers[iso]); delete saveTimers[iso]; saveSession(sessionSnapshot(iso)); });
  }
  async function saveSession(snap) {
    if (!snap) return;
    const k = snap.me.id + '|' + snap.iso;
    if (saving[k]) { saving[k].next = snap; return; }
    saving[k] = { next: null };
    const mine = () => S.role === 'athlete' && S.me && S.me.id === snap.me.id;
    try {
      const r = await api('PUT', 'session?athleteId=' + snap.me.id + '&date=' + snap.iso, snap.body, { token: snap.token });
      if (mine()) {
        r.session.finished = !!r.session.finishedAt;
        S.history[snap.iso] = r.session;
        setSaveState('Guardado ✓');
        scheduleStateRefresh();
      }
    } catch (e) {
      if (['ATHLETE_NOT_FOUND', 'NO_SESSION', 'NOT_YOURS', 'PROFILE_GONE', 'PIN_CHANGED', 'BAD_DATE'].indexOf(e.code) !== -1) {
        if (mine() && e.code === 'BAD_DATE') setSaveState(e.message, true);
      } else {
        if (mine()) setSaveState(e.offline ? 'Sin conexión · reintentando…' : 'No se pudo guardar · reintentando…', true);
        setTimeout(() => {
          const cur = saving[k];
          if (cur) cur.next = cur.next || snap; else saveSession(snap);
        }, 5000);
      }
    } finally {
      const next = saving[k] && saving[k].next;
      delete saving[k];
      if (next) saveSession(next);
    }
  }
  function saveNow(iso) { clearTimeout(saveTimers[iso]); delete saveTimers[iso]; saveSession(sessionSnapshot(iso)); }

  // ---- mi plan y consejos del coach
  const TIP_ICONS = ['ti-chart-bar', 'ti-bolt', 'ti-target', 'ti-bulb'];
  function renderPlanInfo() {
    const el = $('#plan-info');
    if (!S.plan) { el.innerHTML = S.plan === null ? '<div class="motto">DISCIPLINA <b>+</b> CONSTANCIA <b>=</b> RESULTADOS</div>' : ''; return; }
    const p = S.plan;
    const facts = [];
    if (p.enfoque) facts.push(['ENFOQUE', p.enfoque]);
    if (p.frecuencia) facts.push(['FRECUENCIA', p.frecuencia]);
    if (p.nivel) facts.push(['NIVEL', p.nivel]);
    if (p.edad) facts.push(['EDAD', p.edad + ' AÑOS']);
    let html = '<div class="section-title-podio" style="margin-top:26px;">MI PLAN</div><div class="plan-card"><div class="plan-card-label">PLAN SEMANAL DE ENTRENAMIENTO</div><div class="plan-facts">' +
      facts.map((f) => '<div class="plan-fact"><div class="k">' + f[0] + '</div><div class="v">' + esc(f[1]) + '</div></div>').join('') +
      (p.objetivo ? '<div class="plan-fact wide"><div class="k">OBJETIVO</div><div class="v">' + esc(p.objetivo) + '</div></div>' : '') +
      '<div class="plan-fact wide"><div class="k">DÍAS</div><div class="v" style="text-transform:uppercase;font-family:var(--font-display);font-weight:800;font-size:12px;">' +
      p.dias.map((d) => esc(DIAS[d.dow].slice(0, 3) + ' · ' + (d.titulo || ''))).join('<br>') + '</div></div>' +
      '</div></div>';
    (p.consejos || []).forEach((c, i) => {
      if (!c.items || !c.items.length) return;
      html += '<div class="tip-card"><div class="tip-card-title"><i class="ti ' + TIP_ICONS[i % TIP_ICONS.length] + '" aria-hidden="true"></i>' + esc(c.titulo || 'CONSEJOS') + '</div><ul>' +
        c.items.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></div>';
    });
    html += '<div class="motto">DISCIPLINA <b>+</b> CONSTANCIA <b>=</b> RESULTADOS</div>';
    el.innerHTML = html;
  }

  /* ================================================================ RMs */
  const RM_DEFAULT = [
    { name: 'Press de banca', unit: 'kg', category: 'empuje' },
    { name: 'Press militar', unit: 'kg', category: 'empuje' },
    { name: 'Dominadas', unit: 'reps', category: 'traccion' },
    { name: 'Remo con barra', unit: 'kg', category: 'traccion' },
    { name: 'Sentadilla trasera', unit: 'kg', category: 'pierna' },
    { name: 'Peso muerto', unit: 'kg', category: 'pierna' },
    { name: 'Prensa de piernas', unit: 'kg', category: 'pierna' },
    { name: 'Hip thrust', unit: 'kg', category: 'pierna' },
  ];
  const CAT_LABEL = { empuje: 'EMPUJE', traccion: 'TRACCIÓN', pierna: 'PIERNA', otros: 'OTROS' };
  const PERCENTS = [60, 70, 75, 80, 85];
  const rmDefaultDoc = () => ({ catalog: clone(RM_DEFAULT), data: {} });
  const hasOwn = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
  const rmEntry = (name) => (S.rms && hasOwn(S.rms.data, name) ? S.rms.data[name] : null);
  const rmHist = (name) => (rmEntry(name) || {}).history || [];
  const RESERVED_NAMES = ['__proto__', 'constructor', 'prototype'];
  const unitLabel = (u) => (u === 'reps' ? 'REPS' : u.toUpperCase());

  // Devuelve null si falló, o { pr } con lo que validó el servidor.
  async function saveRms(event, prev) {
    const id = S.me.id;
    try {
      const r = await api('PUT', 'rms?athleteId=' + id, { doc: S.rms, event });
      if (!sameMe(id)) return null;
      S.rms = { catalog: r.doc.catalog, data: r.doc.data };
      return { pr: !!r.pr };
    } catch (e) {
      if (!sameMe(id)) return null;
      if (prev) S.rms = prev;
      if (e.code === 'ATHLETE_NOT_FOUND') profileGone();
      else if (['NO_SESSION', 'PROFILE_GONE', 'PIN_CHANGED'].indexOf(e.code) === -1) toastErr(e);
      return null;
    }
  }

  function rmCardHtml(meta) {
    const h = rmHist(meta.name);
    const open = S.rmOpen === meta.name;
    const u = meta.unit;
    if (!h.length) {
      return '<div class="rm-card empty' + (open ? ' expanded' : '') + '" data-rm="' + esc(meta.name) + '">' +
        '<div class="rm-card-head" data-act="rm-toggle"><i class="ti ti-barbell rm-card-icon" aria-hidden="true"></i>' +
        '<div class="rm-card-info"><div class="rm-card-name">' + esc(meta.name) + '</div><div class="rm-card-meta">SIN REGISTRAR · ' + CAT_LABEL[meta.category] + '</div></div>' +
        '<div class="rm-card-right"><div class="rm-card-value">—</div></div><i class="ti ti-chevron-down rm-chevron" aria-hidden="true"></i></div>' +
        '<div class="rm-card-body"><div class="rm-section"><label class="form-label">REGISTRA TU RM</label>' +
        (u !== 'reps' ? '<div class="seg" data-act="rm-unit" style="margin-bottom:10px;"><button type="button" data-v="kg" class="' + (u === 'kg' ? 'on' : '') + '">KG</button><button type="button" data-v="lb" class="' + (u === 'lb' ? 'on' : '') + '">LB</button></div>' : '') +
        '<div class="rm-update-row"><input type="text" inputmode="decimal" class="form-input rm-update-input" placeholder="Tu máximo actual"><span class="rm-update-unit">' + unitLabel(u) + '</span></div>' +
        '<button class="rm-save-btn" type="button" data-act="rm-save">GUARDAR</button></div>' +
        '<div class="rm-card-actions"><button type="button" class="rm-remove-btn" data-act="rm-remove">Quitar de mi lista</button></div></div></div>';
    }
    const cur = h[h.length - 1].value;
    const prev = h.length > 1 ? h[h.length - 2].value : null;
    const delta = prev != null ? Math.round((cur - prev) * 10) / 10 : 0;
    const max = Math.max.apply(null, h.map((x) => x.value));
    const pcts = PERCENTS.map((p) => {
      const v = u === 'reps' ? Math.round(cur * p / 100) : roundTo(cur * p / 100, u === 'lb' ? 5 : 2.5);
      return '<div class="rm-pct-cell' + (p === 80 ? ' active-wod' : '') + '"><div class="pct">' + p + '%</div><div class="val">' + fmtNum(v) + '</div><div class="unit">' + u + '</div></div>';
    }).join('');
    const shown = h.slice(-8);
    const bars = shown.map((x, i) => {
      const hp = Math.max(12, Math.round(x.value / max * 100));
      const c = i === shown.length - 1 ? 'is-latest' : x.isPR ? 'is-pr' : '';
      return '<div class="rm-bar-col"><div class="rm-bar ' + c + '" style="height:' + hp + '%"></div><div class="rm-bar-value">' + fmtNum(x.value) + '</div><div class="rm-bar-date">' + fmtDay(x.date) + '</div></div>';
    }).join('');
    const rev = h.slice().reverse();
    const list = rev.slice(0, 10).map((x, i) => {
      const older = rev[i + 1];
      const d = older ? Math.round((x.value - older.value) * 10) / 10 : null;
      return '<div class="rm-history-row"><span class="rm-history-date">' + fmtDay(x.date) + '</span><span class="rm-history-value">' + fmtNum(x.value) + ' ' + unitLabel(u) + '</span>' +
        (d == null ? '<span class="rm-history-delta">BASE</span>' : '<span class="rm-history-delta ' + (d >= 0 ? 'up' : 'down') + '">' + (d >= 0 ? '▲ +' + fmtNum(d) : '▼ ' + fmtNum(d)) + '</span>') +
        (x.isPR ? '<span class="rm-history-pr">PR</span>' : '') +
        (i === 0 ? '<button type="button" class="icon-btn" data-act="rm-undo" aria-label="Borrar este registro"><i class="ti ti-arrow-back-up" aria-hidden="true"></i></button>' : '') +
        '</div>';
    }).join('');
    let tip = 'Registra más actualizaciones para ver una recomendación personalizada.';
    if (h.length >= 2) {
      const weeks = Math.max(1, daysBetween(h[0].date, h[h.length - 1].date) / 7);
      const rate = (cur - h[0].value) / weeks;
      if (rate > 0) {
        const step = u === 'reps' ? 1 : u === 'lb' ? 5 : 2.5;
        const target = u === 'reps' ? cur + 1 : roundTo(cur + step, step);
        const eta = Math.min(26, Math.max(1, Math.ceil((target - cur) / rate)));
        tip = 'A tu ritmo (~+' + fmtNum(rate) + ' ' + u + ' por semana), tu próximo objetivo realista es ' + fmtNum(target) + ' ' + u + ' en unas ' + plural(eta, 'semana', 'semanas') + '.';
      } else {
        tip = 'Llevas un tiempo estable. Revisa con Carlos tu técnica, descanso y alimentación para volver a progresar.';
      }
    }
    return '<div class="rm-card' + (open ? ' expanded' : '') + '" data-rm="' + esc(meta.name) + '">' +
      '<div class="rm-card-head" data-act="rm-toggle"><i class="ti ti-barbell rm-card-icon" aria-hidden="true"></i>' +
      '<div class="rm-card-info"><div class="rm-card-name">' + esc(meta.name) + '</div><div class="rm-card-meta">' + fmtDay(h[h.length - 1].date) + ' · ' + CAT_LABEL[meta.category] + '</div></div>' +
      '<div class="rm-card-right"><div class="rm-card-value">' + fmtNum(cur) + '<span class="rm-unit">' + u + '</span></div>' +
      (prev != null ? '<div class="rm-card-delta ' + (delta >= 0 ? 'up' : 'down') + '">' + (delta >= 0 ? '▲ +' + fmtNum(delta) : '▼ ' + fmtNum(delta)) + '</div>' : '') +
      '</div><i class="ti ti-chevron-down rm-chevron" aria-hidden="true"></i></div>' +
      '<div class="rm-card-body">' +
        (u !== 'reps' ? '<div class="rm-section"><div class="rm-percents-grid5">' + pcts + '</div></div>' : '') +
        '<div class="rm-section"><label class="form-label">ACTUALIZAR RM</label><div class="rm-update-row"><input type="text" inputmode="decimal" class="form-input rm-update-input" placeholder="' + fmtNum(cur) + '"><span class="rm-update-unit">' + unitLabel(u) + '</span></div>' +
        '<button class="rm-save-btn" type="button" data-act="rm-save">GUARDAR</button></div>' +
        '<div class="rm-section"><label class="form-label">HISTORIAL</label><div class="rm-bar-chart">' + bars + '</div><div class="rm-history-list">' + list + '</div></div>' +
        '<div class="rm-tip"><div class="rm-tip-label"><i class="ti ti-bulb" aria-hidden="true"></i>TIP DE PROGRESIÓN</div><div class="rm-tip-text">' + esc(tip) + '</div></div>' +
        '<div class="rm-card-actions"><button type="button" class="rm-remove-btn" data-act="rm-remove">Quitar de mi lista</button></div>' +
      '</div></div>';
  }

  function renderRms() {
    if (!S.rms) { $('#rm-cards-list').innerHTML = '<div class="loading-line">Cargando…</div>'; return; }
    $$('#rm-filters .mini-filter-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.filter === S.rmFilter);
      if (b.dataset.filter === 'otros') b.classList.toggle('hidden', !S.rms.catalog.some((c) => c.category === 'otros'));
    });
    const list = S.rms.catalog.filter((c) => S.rmFilter === 'todos' || c.category === S.rmFilter);
    $('#rm-cards-list').innerHTML = list.length ? list.map(rmCardHtml).join('')
      : emptyCard('ti-barbell', 'Nada en esta categoría', 'Toca NUEVO RM para agregar un ejercicio.');
    if (S.rmTab === 'analisis') renderRmAnalisis();
    if (S.rmTab === 'ratios') renderRmRatios();
  }

  $('#rm-cards-list').addEventListener('click', async (ev) => {
    const el = ev.target.closest('[data-act]');
    if (!el) return;
    const card = el.closest('.rm-card');
    const name = card.dataset.rm;
    const meta = S.rms.catalog.find((c) => c.name === name);
    if (!meta) return;
    const act = el.dataset.act;
    if (act === 'rm-toggle') { S.rmOpen = S.rmOpen === name ? null : name; renderRms(); return; }
    if (act === 'rm-unit') {
      const b = ev.target.closest('button');
      if (!b) return;
      meta.unit = b.dataset.v;
      $$('button', el).forEach((x) => x.classList.toggle('on', x === b));
      $('.rm-update-unit', card).textContent = unitLabel(meta.unit);
      return;
    }
    if (act === 'rm-save') {
      const val = parseNum($('.rm-update-input', card).value);
      if (!val || val > 2000) { toast('Escribe un valor válido', 'ti-alert-triangle', true); return; }
      const prev = clone(S.rms);
      if (!hasOwn(S.rms.data, name)) S.rms.data[name] = { current: 0, history: [] };
      const d = S.rms.data[name];
      const maxBefore = d.history.length ? Math.max.apply(null, d.history.map((x) => x.value)) : null;
      const isPR = maxBefore != null && val > maxBefore;
      d.history.push({ date: today(), value: val, isPR });
      d.current = val;
      el.disabled = true;
      const res = await saveRms(isPR ? { type: 'pr', name, value: val, prev: maxBefore, unit: meta.unit, date: today() } : undefined, prev);
      if (res) {
        if (isPR && res.pr) { toast('¡NUEVO PR! +' + fmtNum(val - maxBefore) + ' ' + unitLabel(meta.unit) + ' · +25 puntos', 'ti-trophy'); scheduleStateRefresh(); }
        else if (isPR) toast('¡Nuevo máximo! (ya sumaste los PRs permitidos de hoy)', 'ti-trophy');
        else toast(maxBefore == null ? 'RM registrado' : 'RM actualizado');
      }
      renderRms();
      return;
    }
    if (act === 'rm-undo') {
      if (!confirmTap(el)) return;
      const prev = clone(S.rms);
      const d = rmEntry(name);
      if (!d) return;
      const last = d.history.pop();
      if (!d.history.length) delete S.rms.data[name];
      const res = await saveRms(last.isPR ? { type: 'undo', name, date: last.date, value: last.value } : undefined, prev);
      if (res) { toast('Registro borrado'); if (last.isPR) scheduleStateRefresh(); }
      renderRms();
      return;
    }
    if (act === 'rm-remove') {
      if (!confirmTap(el, '¿Quitar? Toca otra vez')) return;
      const prev = clone(S.rms);
      S.rms.catalog = S.rms.catalog.filter((c) => c.name !== name);
      delete S.rms.data[name];
      if (await saveRms(undefined, prev)) toast(name + ' quitado de tu lista');
      renderRms();
    }
  });
  $('#rm-filters').addEventListener('click', (ev) => {
    const b = ev.target.closest('.mini-filter-btn');
    if (!b) return;
    S.rmFilter = b.dataset.filter;
    renderRms();
  });
  // nuevo RM
  let rmnUnit = 'kg';
  $('#add-rm-btn').addEventListener('click', () => {
    const panel = $('#rm-new-panel');
    panel.classList.toggle('show');
    if (panel.classList.contains('show')) {
      if (S.rmTab !== 'mis-rms') $('#rm-main-tabs [data-rmtab="mis-rms"]').click();
      $('#rmn-error').textContent = '';
      setTimeout(() => $('#rmn-name').focus(), 50);
    }
  });
  $('#rmn-cancel').addEventListener('click', () => $('#rm-new-panel').classList.remove('show'));
  $('#rmn-unit').addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    rmnUnit = b.dataset.v;
    $$('#rmn-unit button').forEach((x) => x.classList.toggle('on', x === b));
  });
  $('#rm-new-panel').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const name = $('#rmn-name').value.replace(/\s+/g, ' ').trim().slice(0, 40);
    const err = $('#rmn-error');
    if (name.length < 2) { err.textContent = 'Escribe el nombre del ejercicio'; return; }
    if (S.rms.catalog.some((c) => nameKey(c.name) === nameKey(name))) { err.textContent = 'Ya tienes ese RM en tu lista'; return; }
    if (RESERVED_NAMES.indexOf(name) !== -1) { err.textContent = 'Usa otro nombre'; return; }
    const raw = $('#rmn-value').value;
    const value = parseNum(raw);
    if (raw && (!value || value > 2000)) { err.textContent = 'El valor no es válido'; return; }
    const prev = clone(S.rms);
    S.rms.catalog.push({ name, unit: rmnUnit, category: $('#rmn-cat').value });
    if (value) S.rms.data[name] = { current: value, history: [{ date: today(), value, isPR: false }] };
    if (await saveRms(undefined, prev)) {
      toast(name + ' agregado');
      $('#rmn-name').value = ''; $('#rmn-value').value = '';
      $('#rm-new-panel').classList.remove('show');
      S.rmFilter = 'todos';
      S.rmOpen = name;
    }
    renderRms();
  });
  $$('#rm-main-tabs .tab-btn').forEach((btn) => btn.addEventListener('click', () => {
    S.rmTab = btn.dataset.rmtab;
    $$('#rm-main-tabs .tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
    $$('#view-rms .tab-panel').forEach((p) => { const on = p.id === 'rm-tab-' + S.rmTab; p.classList.toggle('active', on); p.classList.toggle('on', on); });
    renderRms();
  }));

  function animateBars(scope) {
    const bars = $$('.bar-fill', scope);
    bars.forEach((b) => { b.style.width = '0%'; });
    requestAnimationFrame(() => requestAnimationFrame(() => bars.forEach((b) => { b.style.width = b.dataset.target + '%'; })));
  }
  function barRow(name, value, pct, cls) {
    return '<div class="bar-row"><div class="bar-row-top"><span class="bar-row-name">' + esc(name) + '</span><span class="bar-row-value">' + esc(value) + '</span></div>' +
      '<div class="bar-track"><div class="bar-fill ' + (cls || 'green-bar') + '" data-target="' + Math.max(0, Math.min(100, Math.round(pct))) + '"></div></div></div>';
  }
  const toKg = (v, u) => (u === 'lb' ? v * LB : v);

  function renderRmAnalisis() {
    const el = $('#rm-analisis-content');
    const year = today().slice(0, 4);
    const month = today().slice(0, 7);
    const items = S.rms.catalog.map((c) => ({ c, h: rmHist(c.name) })).filter((x) => x.h.length);
    if (!items.length) { el.innerHTML = emptyCard('ti-chart-line', 'Aún no hay datos', 'Registra tus RMs en MIS RMS y aquí verás tu progreso, tus próximos PRs y en qué enfocarte.'); return; }
    const improved = items.filter((x) => x.h.length > 1 && x.h[x.h.length - 1].value > x.h[0].value).length;
    let prsYear = 0, prsMonth = 0;
    items.forEach((x) => x.h.forEach((e) => { if (e.isPR && e.date.slice(0, 4) === year) prsYear++; if (e.isPR && e.date.slice(0, 7) === month) prsMonth++; }));
    let totalKg = 0, best = null;
    items.forEach((x) => {
      const cur = x.h[x.h.length - 1].value;
      const before = x.h.filter((e) => e.date.slice(0, 4) < year);
      const base = before.length ? before[before.length - 1].value : x.h.find((e) => e.date.slice(0, 4) === year)?.value;
      if (base == null) return;
      if (x.c.unit !== 'reps') totalKg += Math.max(0, toKg(cur - base, x.c.unit));
      const pct = base > 0 ? (cur - base) / base * 100 : 0;
      if (pct > 0 && (!best || pct > best.pct)) best = { name: x.c.name, pct };
    });
    let html = '<div class="stat-grid-2x2" style="padding:0 0 14px;">' +
      '<div class="stat-box"><div class="stat-box-num">' + items.length + '</div><div class="stat-box-label">RMs REGISTRADOS</div></div>' +
      '<div class="stat-box sb-green"><div class="stat-box-num">' + improved + '</div><div class="stat-box-label">CON MEJORA</div></div>' +
      '<div class="stat-box"><div class="stat-box-num">' + prsYear + '</div><div class="stat-box-label">PRs ' + year + '</div></div>' +
      '<div class="stat-box"><div class="stat-box-num">' + prsMonth + '</div><div class="stat-box-label">PRs ESTE MES</div></div></div>';
    html += '<div class="big-stat-card"><div class="big-stat-label-top">TOTAL GANADO EN ' + year + '</div><div class="big-stat-num">+' + fmtNum(totalKg) + '<span style="font-size:18px;letter-spacing:0;"> KG</span></div>' +
      '<div class="big-stat-grid"><div><div class="v">' + prsYear + '</div><div class="l">PRs</div></div><div><div class="v">' + (best ? esc(best.name) : '—') + '</div><div class="l">MEJOR AVANCE</div></div>' +
      '<div><div class="v">' + (best ? '+' + Math.round(best.pct) + '%' : '—') + '</div><div class="l">EN ESE LIFT</div></div></div></div>';
    const targets = [];
    items.forEach((x) => {
      if (x.h.length < 2) return;
      const u = x.c.unit;
      const first = x.h[0], last = x.h[x.h.length - 1];
      const weeks = Math.max(1, daysBetween(first.date, last.date) / 7);
      const rate = (last.value - first.value) / weeks;
      if (rate <= 0) return;
      const step = u === 'reps' ? 1 : u === 'lb' ? 5 : 2.5;
      const target = u === 'reps' ? last.value + 1 : roundTo(last.value + step, step);
      targets.push({ name: x.c.name, u, cur: last.value, target, rate, eta: Math.min(26, Math.max(1, Math.ceil((target - last.value) / rate))) });
    });
    targets.sort((a, b) => a.eta - b.eta);
    html += '<div class="section-title-podio">PRÓXIMOS PRs ESTIMADOS</div>';
    html += targets.length ? '<div class="plan-card">' + targets.slice(0, 5).map((t) =>
      '<div class="target-row"><div class="target-top"><span class="target-name">' + esc(t.name) + '</span><span class="target-eta">~' + plural(t.eta, 'SEMANA', 'SEMANAS') + '</span></div>' +
      '<div class="bar-track"><div class="bar-fill gold-bar" data-target="' + Math.round(t.cur / t.target * 100) + '"></div></div>' +
      '<div class="target-sub">OBJETIVO ' + fmtNum(t.target) + ' ' + unitLabel(t.u) + ' · RITMO +' + fmtNum(t.rate) + ' ' + t.u + '/SEM</div></div>').join('') + '</div>'
      : '<div class="empty-sub" style="margin-bottom:10px;">Actualiza tus RMs al menos dos veces para estimar tus próximos PRs.</div>';
    const rows = items.map((x) => {
      const f = x.h[0].value, l = x.h[x.h.length - 1].value;
      return { name: x.c.name, pct: f > 0 ? Math.round((l - f) / f * 100) : 0 };
    }).sort((a, b) => b.pct - a.pct);
    const maxPct = Math.max(1, ...rows.map((r) => r.pct));
    html += '<div class="section-title-podio">MAYOR PROGRESO DESDE TU PRIMER REGISTRO</div>' +
      rows.map((r) => barRow(r.name, (r.pct >= 0 ? '+' : '') + r.pct + '%', r.pct / maxPct * 100)).join('');
    el.innerHTML = html;
    animateBars(el);
  }

  const RATIOS = [
    { a: 'Press de banca', b: 'Sentadilla trasera', min: 65, max: 80,
      low: 'Tu press de banca va por detrás de tu pierna. Prioriza press de banca e inclinado.', high: 'Tu pierna va por detrás de tu pecho. Dale prioridad a la sentadilla.' },
    { a: 'Peso muerto', b: 'Sentadilla trasera', min: 110, max: 125,
      low: 'Refuerza la cadena posterior: peso muerto, rumano y curl femoral.', high: 'Tu sentadilla tiene margen. Trabaja técnica y volumen de sentadilla.' },
    { a: 'Press militar', b: 'Press de banca', min: 58, max: 70,
      low: 'Tus hombros van por detrás de tu pecho. Más press militar y elevaciones laterales.', high: 'Buen hombro. Tu press de banca puede subir más.' },
    { a: 'Remo con barra', b: 'Press de banca', min: 80, max: 100,
      low: 'Desbalance empuje/tracción. Más remo y face pull para cuidar tus hombros.', high: 'Espalda fuerte. Puedes empujar más el pecho.' },
  ];
  function rmKg(name) {
    const meta = S.rms.catalog.find((c) => nameKey(c.name) === nameKey(name));
    const h = meta ? rmHist(meta.name) : [];
    if (!meta || !h.length || meta.unit === 'reps') return null;
    return toKg(h[h.length - 1].value, meta.unit);
  }
  function renderRmRatios() {
    const el = $('#rm-ratios-content');
    const focus = [];
    let html = '<div class="empty-sub" style="text-align:left;margin:0 0 14px;">Comparan tus RMs entre sí para encontrar desbalances. Son referencias generales; Carlos ajusta según tu caso.</div>';
    RATIOS.forEach((r) => {
      const a = rmKg(r.a), b = rmKg(r.b);
      const label = r.a.toUpperCase() + ' / ' + r.b.toUpperCase();
      if (a == null || b == null || !b) {
        const miss = [a == null ? r.a : null, b == null ? r.b : null].filter(Boolean).join(' y ');
        html += '<div class="rm-ratio-card dim"><div class="rm-ratio-top"><div class="rm-ratio-label">' + esc(label) + '</div></div>' +
          '<div class="rm-ratio-range">REGISTRA ' + esc(miss.toUpperCase()) + ' PARA VER ESTE RATIO · IDEAL ' + r.min + '–' + r.max + '%</div></div>';
        return;
      }
      const pct = Math.round(a / b * 100);
      const status = pct < r.min ? 'POR MEJORAR' : pct > r.max ? 'ALTO' : 'ÓPTIMO';
      const cls = status === 'ÓPTIMO' ? 'pv-green' : status === 'POR MEJORAR' ? 'pv-red' : 'pv-gold';
      const scale = Math.max(r.max * 1.35, pct * 1.1);
      html += '<div class="rm-ratio-card"><div class="rm-ratio-top"><div class="rm-ratio-label">' + esc(label) + '</div><span class="points-value ' + cls + '">' + status + '</span></div>' +
        '<div class="rm-ratio-pct">' + pct + '%</div><div class="rm-ratio-range">' + fmtNum(a) + ' / ' + fmtNum(b) + ' KG · IDEAL ' + r.min + '–' + r.max + '%</div>' +
        '<div class="ratio-track"><div class="ratio-ideal" style="left:' + (r.min / scale * 100) + '%;width:' + ((r.max - r.min) / scale * 100) + '%"></div>' +
        '<div class="ratio-dot" style="left:' + Math.min(100, pct / scale * 100) + '%"></div></div></div>';
      const gap = pct < r.min ? r.min - pct : pct > r.max ? pct - r.max : 0;
      focus.push({ r, pct, gap, status });
    });
    if (focus.length) {
      focus.sort((x, y) => y.gap - x.gap);
      html += '<div class="section-title-podio">DÓNDE ENFOCAR</div>' + focus.map((f) => {
        if (f.status === 'ÓPTIMO') return '<div class="focus-card f-green"><div class="focus-label">EN BUENA FORMA · ' + esc(f.r.a) + '</div><div class="focus-text">Tu relación ' + esc(f.r.a) + ' / ' + esc(f.r.b) + ' está en el rango ideal (' + f.pct + '%). Mantén el trabajo actual.</div></div>';
        const cls = f.gap >= 8 ? 'f-red' : 'f-gold';
        const lbl = f.gap >= 8 ? 'PRIORIDAD ALTA' : 'A MEJORAR';
        return '<div class="focus-card ' + cls + '"><div class="focus-label">' + lbl + ' · ' + esc(f.status === 'ALTO' ? f.r.b : f.r.a) + '</div><div class="focus-text">' +
          esc(f.status === 'ALTO' ? f.r.high : f.r.low) + ' (' + f.pct + '% vs ideal ' + f.r.min + '–' + f.r.max + '%)</div></div>';
      }).join('');
    }
    el.innerHTML = html;
  }

  /* ================================================================ timers */
  let audioCtx = null;
  function ensureAudio() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) { /* sin audio */ }
  }
  function beep(freq, dur, vol) {
    try {
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq || 880;
      gain.gain.setValueAtTime(vol || 0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (dur || 0.2));
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(); osc.stop(audioCtx.currentTime + (dur || 0.2));
    } catch (e) { /* sin audio */ }
  }
  const vibrate = (p) => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* nada */ } };
  let wakeLock = null;
  async function wake() {
    try {
      if ('wakeLock' in navigator && !wakeLock && !document.hidden) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      }
    } catch (e) { /* no disponible */ }
  }
  function releaseWake() { try { if (wakeLock) wakeLock.release(); } catch (e) { /* nada */ } wakeLock = null; }

  // Descanso entre series (también se muestra flotando sobre la app)
  const REST = { total: 90, left: 90, endAt: 0, state: 'idle', label: '', lastBeep: null, doneAt: 0 };
  function restStart(sec, label) {
    if (!sec) return;
    ensureAudio();
    REST.total = sec; REST.left = sec; REST.endAt = Date.now() + sec * 1000;
    REST.state = 'run'; REST.label = label || ''; REST.lastBeep = null;
    tickOn(); wake(); tick();
  }
  function restToggle() {
    ensureAudio();
    if (REST.state === 'run') { REST.left = Math.max(0, (REST.endAt - Date.now()) / 1000); REST.state = 'pause'; }
    else if (REST.state === 'pause') { REST.endAt = Date.now() + REST.left * 1000; REST.state = 'run'; tickOn(); wake(); }
    else { restStart(REST.total, ''); return; }
    tick();
  }
  function restAdd(d) {
    if (REST.state === 'run') {
      REST.endAt = Math.max(Date.now() + 1000, REST.endAt + d * 1000);
      REST.total = Math.max(REST.total, (REST.endAt - Date.now()) / 1000);
    } else if (REST.state === 'pause') {
      REST.left = Math.max(1, REST.left + d);
      REST.total = Math.max(REST.total, REST.left);
    } else {
      REST.total = Math.min(600, Math.max(15, REST.total + d));
      REST.left = REST.total;
    }
    tick();
  }
  function restStop() { REST.state = 'idle'; REST.left = REST.total; REST.label = ''; tick(); }
  function restTick(now) {
    if (REST.state === 'run') {
      REST.left = (REST.endAt - now) / 1000;
      const s = Math.ceil(REST.left);
      if (s <= 3 && s >= 1 && REST.lastBeep !== s) { REST.lastBeep = s; beep(660, 0.12); }
      if (REST.left <= 0) {
        REST.left = 0; REST.state = 'done'; REST.doneAt = now;
        beep(990, 0.45, 0.35); setTimeout(() => beep(1320, 0.5, 0.35), 220);
        vibrate([250, 120, 250]);
      }
    } else if (REST.state === 'done' && now - REST.doneAt > 6000) {
      REST.state = 'idle'; REST.left = REST.total; REST.label = '';
    }
  }

  // Cronómetro de la sesión
  const SW = { acc: 0, startAt: 0, running: false };
  const swElapsed = (now) => (SW.acc + (SW.running ? now - SW.startAt : 0)) / 1000;
  function swToggle() {
    if (SW.running) { SW.acc += Date.now() - SW.startAt; SW.running = false; }
    else { SW.startAt = Date.now(); SW.running = true; tickOn(); wake(); }
    tick();
  }
  function swReset() { SW.acc = 0; SW.running = false; tick(); }

  // Intervalos (HIIT / Tabata) con 5 s de preparación
  const IV = { work: 20, rest: 10, rounds: 8, acc: 0, startAt: 0, running: false, started: false, last: null, lastBeep: null, finished: false };
  function ivStatus(now) {
    if (!IV.started) return { phase: 'idle', left: IV.work, round: 1 };
    const e = (IV.acc + (IV.running ? now - IV.startAt : 0)) / 1000;
    if (e < 5) return { phase: 'prep', left: 5 - e, round: 1 };
    const t = e - 5, cycle = IV.work + IV.rest, end = IV.rounds * cycle - IV.rest;
    if (t >= end) return { phase: 'done', left: 0, round: IV.rounds };
    const round = Math.floor(t / cycle) + 1;
    const inC = t % cycle;
    return inC < IV.work ? { phase: 'work', left: IV.work - inC, round } : { phase: 'rest', left: cycle - inC, round };
  }
  function ivToggle() {
    ensureAudio();
    if (IV.finished) ivReset();
    if (IV.running) { IV.acc += Date.now() - IV.startAt; IV.running = false; }
    else { IV.started = true; IV.startAt = Date.now(); IV.running = true; tickOn(); wake(); }
    tick();
  }
  function ivReset() { IV.acc = 0; IV.running = false; IV.started = false; IV.finished = false; IV.last = null; IV.lastBeep = null; tick(); }
  function ivTick(now) {
    if (!IV.running) return;
    const st = ivStatus(now);
    const key = st.phase + st.round;
    if (IV.last && IV.last !== key) {
      if (st.phase === 'work') { beep(1046, 0.4, 0.35); vibrate(200); }
      else if (st.phase === 'rest') { beep(523, 0.4, 0.35); vibrate(120); }
    }
    IV.last = key;
    const s = Math.ceil(st.left);
    if ((st.phase === 'work' || st.phase === 'rest' || st.phase === 'prep') && s <= 3 && s >= 1 && IV.lastBeep !== key + s) { IV.lastBeep = key + s; beep(700, 0.1); }
    if (st.phase === 'done') {
      IV.acc += now - IV.startAt; IV.running = false; IV.finished = true;
      beep(990, 0.5, 0.35); setTimeout(() => beep(1320, 0.6, 0.35), 250); vibrate([300, 150, 300]);
    }
  }

  let ticker = null;
  const anyTimerRunning = () => REST.state === 'run' || SW.running || IV.running;
  function tickOn() { if (!ticker) ticker = setInterval(tick, 200); }
  function tick() {
    const now = Date.now();
    restTick(now);
    ivTick(now);
    if (S.view === 'timer' && app.classList.contains('active')) updateTimerDisplay(now);
    updateRestFloat(now);
    if (!anyTimerRunning() && REST.state !== 'done') {
      if (ticker) { clearInterval(ticker); ticker = null; }
      releaseWake();
    }
  }

  // ---- descanso flotante
  const rf = $('#rest-float');
  function updateRestFloat(now) {
    now = now || Date.now();
    const visible = app.classList.contains('active') && REST.state !== 'idle' && !(S.view === 'timer' && S.timerMode === 'rest');
    rf.classList.toggle('hidden', !visible);
    document.body.classList.toggle('resting', visible);
    if (!visible) return;
    rf.classList.toggle('done', REST.state === 'done');
    rf.classList.toggle('urgent', REST.state === 'run' && REST.left <= 10);
    $('#rf-label').textContent = REST.state === 'pause' ? 'DESCANSO EN PAUSA' : 'DESCANSO' + (REST.label ? ' · ' + REST.label.toUpperCase() : '');
    $('#rf-time').textContent = REST.state === 'done' ? '¡A LA SIGUIENTE SERIE!' : fmtClock(REST.left);
    $('#rf-fill').style.width = (REST.total ? Math.max(0, Math.min(100, REST.left / REST.total * 100)) : 0) + '%';
  }
  $('#rf-minus').addEventListener('click', () => restAdd(-15));
  $('#rf-plus').addEventListener('click', () => restAdd(15));
  $('#rf-close').addEventListener('click', () => restStop());

  // ---- pantalla de timer
  const REST_PRESETS = [45, 60, 90, 120, 180];
  const IV_PRESETS = [
    { label: 'TABATA 20/10 ×8', work: 20, rest: 10, rounds: 8 },
    { label: '40/20 ×8', work: 40, rest: 20, rounds: 8 },
    { label: '30/30 ×10', work: 30, rest: 30, rounds: 10 },
    { label: '45/15 ×6', work: 45, rest: 15, rounds: 6 },
  ];
  function stepper(id, label, val) {
    return '<div class="stepper"><div class="stepper-label">' + label + '</div><div class="stepper-row">' +
      '<button type="button" data-step="' + id + '" data-d="-1" aria-label="Menos">−</button><span class="stepper-val">' + val + '</span>' +
      '<button type="button" data-step="' + id + '" data-d="1" aria-label="Más">+</button></div></div>';
  }
  function renderTimer() {
    $$('#timer-modes .tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.mode === S.timerMode));
    const presets = $('#timer-presets');
    const config = $('#timer-config');
    const note = $('#timer-note');
    if (S.timerMode === 'rest') {
      presets.innerHTML = REST_PRESETS.map((s) => '<button type="button" class="preset-chip' + (REST.total === s ? ' on' : '') + '" data-rest="' + s + '">' + fmtClock(s) + '</button>').join('');
      config.innerHTML = stepper('rest', 'AJUSTAR ±15 S', fmtClock(REST.state === 'idle' ? REST.total : REST.left));
      note.textContent = 'EL DESCANSO TAMBIÉN ARRANCA SOLO AL MARCAR UNA SERIE';
    } else if (S.timerMode === 'sw') {
      presets.innerHTML = '';
      config.innerHTML = '';
      const day = planDayFor(today());
      note.textContent = day && day.duracion ? 'DURACIÓN DE TU SESIÓN DE HOY: ' + day.duracion.toUpperCase() : 'MIDE LA DURACIÓN DE TU SESIÓN COMPLETA';
    } else {
      presets.innerHTML = IV_PRESETS.map((p, i) => '<button type="button" class="preset-chip' + (IV.work === p.work && IV.rest === p.rest && IV.rounds === p.rounds ? ' on' : '') + '" data-iv="' + i + '">' + p.label + '</button>').join('');
      config.innerHTML = stepper('work', 'TRABAJO (S)', IV.work) + stepper('ivrest', 'DESCANSO (S)', IV.rest) + stepper('rounds', 'RONDAS', IV.rounds);
      note.textContent = 'IDEAL PARA CARDIO, CORE Y FINALIZADORES · 5 S DE PREPARACIÓN';
    }
    updateTimerDisplay(Date.now());
  }
  function updateTimerDisplay(now) {
    const disp = $('#timer-display');
    const sub = $('#timer-sub');
    const label = $('#timer-label');
    const start = $('#timer-start');
    disp.classList.remove('danger', 'timer-urgent', 'finished', 'prep', 'rest');
    sub.classList.remove('finished');
    if (S.timerMode === 'rest') {
      label.textContent = 'DESCANSO ENTRE SERIES';
      if (REST.state === 'done') { disp.textContent = '00:00'; disp.classList.add('finished'); sub.textContent = '¡A LA SIGUIENTE SERIE!'; sub.classList.add('finished'); }
      else {
        disp.textContent = fmtClock(REST.state === 'idle' ? REST.total : REST.left);
        if (REST.state === 'run' && REST.left <= 10) disp.classList.add('danger', 'timer-urgent');
        sub.textContent = REST.state === 'run' ? 'DESCANSANDO' + (REST.label ? ' · ' + REST.label.toUpperCase() : '') : REST.state === 'pause' ? 'EN PAUSA' : 'LISTO';
      }
      start.textContent = REST.state === 'run' ? 'PAUSAR' : REST.state === 'pause' ? 'SEGUIR' : 'INICIAR';
      start.classList.toggle('pause-state', REST.state === 'run');
      const sv = $('#timer-config .stepper-val');
      if (sv) sv.textContent = fmtClock(REST.state === 'idle' ? REST.total : REST.left);
    } else if (S.timerMode === 'sw') {
      label.textContent = 'CRONÓMETRO DE SESIÓN';
      disp.textContent = fmtWatch(swElapsed(now));
      sub.textContent = SW.running ? 'EN CURSO' : SW.acc ? 'EN PAUSA' : 'LISTO';
      start.textContent = SW.running ? 'PAUSAR' : SW.acc ? 'SEGUIR' : 'INICIAR';
      start.classList.toggle('pause-state', SW.running);
    } else {
      const st = ivStatus(now);
      const names = { idle: 'INTERVALOS', prep: 'PREPÁRATE', work: 'TRABAJO', rest: 'DESCANSO', done: 'TERMINADO' };
      label.textContent = names[st.phase];
      if (st.phase === 'done' || IV.finished) { disp.textContent = '00:00'; disp.classList.add('finished'); sub.textContent = '¡TERMINASTE ' + IV.rounds + ' RONDAS!'; sub.classList.add('finished'); }
      else {
        disp.textContent = fmtClock(st.left);
        if (st.phase === 'prep') disp.classList.add('prep');
        if (st.phase === 'rest') disp.classList.add('rest');
        if (st.phase === 'work' && st.left <= 3) disp.classList.add('danger', 'timer-urgent');
        sub.textContent = st.phase === 'idle' ? IV.rounds + ' RONDAS · ' + IV.work + ' S / ' + IV.rest + ' S' : 'RONDA ' + st.round + ' / ' + IV.rounds;
      }
      start.textContent = IV.running ? 'PAUSAR' : IV.started && !IV.finished ? 'SEGUIR' : 'INICIAR';
      start.classList.toggle('pause-state', IV.running);
    }
  }
  $('#timer-modes').addEventListener('click', (ev) => {
    const b = ev.target.closest('.tab-btn');
    if (!b) return;
    S.timerMode = b.dataset.mode;
    renderTimer();
    updateRestFloat();
  });
  $('#timer-start').addEventListener('click', () => {
    if (S.timerMode === 'rest') restToggle();
    else if (S.timerMode === 'sw') swToggle();
    else ivToggle();
    renderTimer();
  });
  $('#timer-reset').addEventListener('click', () => {
    if (S.timerMode === 'rest') restStop();
    else if (S.timerMode === 'sw') swReset();
    else ivReset();
    renderTimer();
  });
  $('#timer-presets').addEventListener('click', (ev) => {
    const b = ev.target.closest('.preset-chip');
    if (!b) return;
    if (b.dataset.rest) restStart(+b.dataset.rest, '');
    if (b.dataset.iv) {
      if (IV.running) return toast('Pausa los intervalos para cambiarlos', 'ti-info-circle');
      const p = IV_PRESETS[+b.dataset.iv];
      IV.work = p.work; IV.rest = p.rest; IV.rounds = p.rounds;
      ivReset();
    }
    renderTimer();
  });
  $('#timer-config').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-step]');
    if (!b) return;
    const d = +b.dataset.d;
    const k = b.dataset.step;
    if (k === 'rest') restAdd(d * 15);
    else {
      if (IV.running) return toast('Pausa los intervalos para cambiarlos', 'ti-info-circle');
      if (k === 'work') IV.work = Math.min(300, Math.max(5, IV.work + d * 5));
      if (k === 'ivrest') IV.rest = Math.min(300, Math.max(0, IV.rest + d * 5));
      if (k === 'rounds') IV.rounds = Math.min(50, Math.max(1, IV.rounds + d));
      ivReset();
    }
    renderTimer();
  });

  /* ================================================================ EQUIPO */
  function renderEquipo() {
    const st = S.state;
    const grid = $('#athletes-grid');
    if (!st) { grid.innerHTML = '<div class="loading-line" style="grid-column:1/-1;">Cargando…</div>'; return; }
    const trained = new Set(st.trainedToday);
    const byId = {};
    st.alltime.forEach((x) => { byId[x.athleteId] = x; });
    const n = st.roster.length;
    $('#attendance-count').textContent = trained.size + '/' + n;
    $('#attendance-fill').style.width = (n ? Math.round(trained.size / n * 100) : 0) + '%';
    grid.innerHTML = n ? st.roster.map((a) => {
      const s = byId[a.id] || {};
      const mine = S.me && a.id === S.me.id;
      return '<div class="athlete-card' + (mine ? ' me' : '') + '"><div class="avatar">' + esc(initials(a.name)) + '<span class="presence-dot' + (trained.has(a.id) ? ' active' : '') + '"></span></div>' +
        '<div class="athlete-name">' + esc(a.name) + (mine ? ' <span class="tag-me">TÚ</span>' : '') + '</div>' +
        '<div class="athlete-meta">' + (trained.has(a.id) ? 'ENTRENÓ HOY' : 'RACHA ' + (s.streak || 0)) + '</div></div>';
    }).join('') : '<div class="who-empty" style="grid-column:1/-1;">Aún no hay clientes</div>';
  }

  /* ================================================================ PODIO */
  const athleteById = (id) => ((S.state && S.state.roster) || []).find((a) => a.id === id) || null;
  function podiumCol(rank, metal, entry) {
    if (!entry) {
      return '<div class="podium-col ' + metal + ' placeholder">' + (metal === 'gold' ? '<div class="podium-crown">&#9812;</div>' : '<div class="podium-rankmark">#' + rank + '</div>') +
        '<div class="podium-avatar-wrap"><div class="podium-avatar">?</div><div class="podium-medal">' + rank + '</div></div>' +
        '<div class="podium-name">—</div><div class="podium-score">LIBRE</div><div class="podium-block"></div></div>';
    }
    const a = athleteById(entry.id);
    const name = a ? shortName(a.name) : '—';
    return '<div class="podium-col ' + metal + '">' + (metal === 'gold' ? '<div class="podium-crown">&#9812;</div>' : '<div class="podium-rankmark">#' + rank + '</div>') +
      '<div class="podium-avatar-wrap"><div class="podium-avatar">' + esc(initials(a ? a.name : '?')) + '</div><div class="podium-medal">' + rank + '</div></div>' +
      '<div class="podium-name">' + esc(name) + (S.me && entry.id === S.me.id ? ' <span class="tag-me">TÚ</span>' : '') + '</div>' +
      '<div class="podium-score">' + esc(entry.score) + '</div><div class="podium-block"></div></div>';
  }
  function podium(entries) {
    return '<div class="podium-row">' + podiumCol(2, 'silver', entries[1]) + podiumCol(1, 'gold', entries[0]) + podiumCol(3, 'bronze', entries[2]) + '</div>';
  }
  const meTag = (id) => (S.me && id === S.me.id ? ' <span class="tag-me">TÚ</span>' : '');

  function renderPodio() {
    const st = S.state;
    $$('#podio-tabs .tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.podio === S.podioTab));
    $$('#view-stats .podio-panel').forEach((p) => { const on = p.id === 'podio-panel-' + S.podioTab; p.classList.toggle('active', on); p.classList.toggle('on', on); });
    const panel = $('#podio-panel-' + S.podioTab);
    if (!st) { panel.innerHTML = '<div class="loading-line">Cargando…</div>'; return; }
    if (S.podioTab === 'hoy') panel.innerHTML = podioHoy(st);
    if (S.podioTab === 'semana') panel.innerHTML = podioSemana(st);
    if (S.podioTab === 'mes') panel.innerHTML = podioMes(st);
    if (S.podioTab === 'alltime') panel.innerHTML = podioAll(st);
    animateBars(panel);
    $('#podio-updated').textContent = 'SE ACTUALIZA SOLO · ' + agoTs(S.stateAt);
  }
  function podioHoy(st) {
    const f = S.podioFilter;
    const list = st.hoy.filter((h) => {
      const a = athleteById(h.athleteId);
      if (!a) return false;
      if (f === 'mujeres') return a.gender === 'f';
      if (f === 'hombres') return a.gender === 'm';
      return true;
    });
    let html = '<div class="wod-live-card"><div class="wod-live-top"><div class="wod-tag"><span class="tag-rule"></span><span class="tag-name">HOY · ' + fmtShort(today()) + '</span></div>' +
      '<div class="wod-live-status"><span class="live-dot"></span><span>EN VIVO</span></div></div>' +
      '<div class="wod-live-title">' + st.hoy.length + ' DE ' + st.roster.length + ' ENTRENARON HOY</div>' +
      '<div class="wod-live-sub">PUNTOS POR CONSTANCIA: ENTRENAR, COMPLETAR TU SESIÓN Y ROMPER RMs</div></div>';
    html += '<div class="mini-filter-row" data-podio-filter>' + [['todos', 'TODOS'], ['mujeres', 'MUJERES'], ['hombres', 'HOMBRES']].map((x) =>
      '<button type="button" class="mini-filter-btn' + (f === x[0] ? ' active' : '') + '" data-filter="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>';
    if (!st.hoy.length) return html + emptyCard('ti-run', 'Nadie ha entrenado hoy todavía', 'El primero en marcar una serie estrena el podio de hoy.');
    if (!list.length) return html + emptyCard('ti-filter', 'Nadie en este filtro hoy', '');
    html += podium(list.slice(0, 3).map((h) => ({ id: h.athleteId, score: '+' + h.points + ' PTS' + (h.complete ? ' · COMPLETO' : '') })));
    html += list.map((h, i) => {
      const a = athleteById(h.athleteId);
      return '<div class="podio-row' + (S.me && h.athleteId === S.me.id ? ' me' : '') + '"><div class="prow-num">' + (i + 1) + '</div><div class="prow-avatar">' + esc(initials(a.name)) + '</div>' +
        '<div class="prow-info"><div class="prow-name-line"><span class="prow-name">' + esc(a.name) + '</span>' + meTag(h.athleteId) +
        (h.complete ? '<span class="pill pill-rx">COMPLETO</span>' : '') + (h.prs ? '<span class="pill pill-pr">' + (h.prs > 1 ? h.prs + ' PRs' : 'PR') + '</span>' : '') + '</div>' +
        '<div class="prow-time">' + h.done + '/' + h.total + ' EJERCICIOS · ' + agoTs(h.ts) + '</div></div>' +
        '<div class="prow-score">+' + h.points + '</div></div>';
    }).join('');
    return html;
  }
  function podioSemana(st) {
    const active = st.semana.filter((x) => x.days > 0);
    let html = '';
    if (!active.length) return emptyCard('ti-calendar-week', 'La semana apenas empieza', 'Cada día que entrenes según tu plan suma. Cumple todos tus días y ganas +50 puntos.');
    html += podium(active.slice(0, 3).map((x) => ({ id: x.athleteId, score: x.days + '/' + x.planned + ' DÍAS' + (x.complete ? ' · ' + x.complete + ' COMPLETAS' : '') })));
    html += '<div class="section-title-podio">CONSTANCIA · SEMANA DEL ' + fmtDay(st.week.start) + ' AL ' + fmtDay(st.week.end) + '</div>';
    html += st.semana.map((x) => {
      const a = athleteById(x.athleteId);
      return barRow(shortName(a.name) + (S.me && a.id === S.me.id ? ' (TÚ)' : ''), x.days + '/' + x.planned, x.days / x.planned * 100, x.days >= x.planned ? 'gold-bar' : 'red-bar');
    }).join('');
    const full = st.semana.filter((x) => x.days >= x.planned);
    html += '<div class="top1-card"><div class="section-title-podio" style="margin-top:0;">SEMANA COMPLETA · +50 PTS</div>' +
      (full.length ? full.map((x) => '<div class="top1-row"><div><div class="top1-name">' + esc(athleteById(x.athleteId).name) + '</div><div class="top1-count">CUMPLIÓ SUS ' + x.planned + ' DÍAS</div></div><div class="top1-bonus">+50 PTS</div></div>').join('')
        : '<div class="fair-note">Nadie ha cumplido todos sus días todavía. ¿Serás el primero?</div>') + '</div>';
    return html;
  }
  function podioMes(st) {
    const r = st.mes.ranking;
    const mes = MESES[isoDate(today()).getUTCMonth()];
    if (!r.length) return emptyCard('ti-trophy', 'Nadie ha roto un RM en ' + mes.toLowerCase(), 'Cuando superes un RM, regístralo en la pestaña RMs: suma +25 puntos y aparece aquí.');
    let html = podium(r.slice(0, 3).map((x) => ({ id: x.athleteId, score: plural(x.prs, 'PR', 'PRs') + (x.kgGain ? ' · +' + fmtNum(x.kgGain) + ' KG' : '') })));
    const max = Math.max.apply(null, r.map((x) => x.prs));
    html += '<div class="section-title-podio">PRs DE ' + mes + '</div>' + r.map((x, i) => barRow(shortName(athleteById(x.athleteId).name), String(x.prs), x.prs / max * 100, i === 0 ? 'gold-bar' : 'red-bar')).join('');
    html += '<div class="section-title-podio">ÚLTIMOS PRs</div>' + st.mes.feed.map((p) => {
      const a = athleteById(p.athleteId);
      if (!a) return '';
      return '<div class="pr-feed-row"><div class="pr-feed-avatar">' + esc(initials(a.name)) + '</div><div class="pr-feed-info">' +
        '<div class="pr-feed-title">' + esc(shortName(a.name)) + '</div><div class="pr-feed-detail">NUEVO RM · ' + esc(p.name) + '</div></div>' +
        '<div class="pr-feed-side"><div class="pr-feed-delta">' + (p.pct > 0 ? '+' + p.pct + '%' : 'PR') + '</div><div class="pr-feed-time">' + agoDate(p.date) + '</div></div></div>';
    }).join('');
    return html;
  }
  function podioAll(st) {
    const ranked = st.alltime.filter((x) => x.points > 0);
    let html = '';
    if (!ranked.length) html += emptyCard('ti-medal', 'La temporada está por empezar', 'Entrena, completa tus sesiones y rompe RMs para sumar puntos.');
    else {
      html += podium(ranked.slice(0, 3).map((x) => ({ id: x.athleteId, score: x.points.toLocaleString('es-CO') + ' PTS' })));
      const top = st.alltime.slice().sort((a, b) => b.streak - a.streak)[0];
      if (top && top.streak > 0) {
        html += '<div class="streak-banner"><i class="ti ti-bolt" aria-hidden="true"></i><div class="streak-banner-text">RACHA MÁS LARGA ACTIVA<br>' +
          esc(athleteById(top.athleteId).name) + ' · ' + plural(top.streak, 'DÍA', 'DÍAS') + '</div></div>';
      }
      html += st.alltime.map((x, i) => {
        const a = athleteById(x.athleteId);
        const meta = [x.streak ? 'RACHA ' + x.streak : '', plural(x.days, 'ENTRENO', 'ENTRENOS'), x.prs ? plural(x.prs, 'PR', 'PRs') : '', x.weeks ? plural(x.weeks, 'SEMANA COMPLETA', 'SEMANAS COMPLETAS') : ''].filter(Boolean).join(' · ');
        return '<div class="alltime-row"><div class="arow-rank">' + (i + 1) + '</div><div class="arow-avatar">' + esc(initials(a.name)) + '</div>' +
          '<div class="arow-info"><div class="arow-name">' + esc(a.name) + meTag(x.athleteId) + '</div><div class="arow-meta">' + meta + '</div></div>' +
          '<div class="arow-pts">' + x.points.toLocaleString('es-CO') + '</div></div>';
      }).join('');
    }
    const rules = [
      ['ENTRENAR (MARCAR AL MENOS UNA SERIE)', '+10', ''],
      ['COMPLETAR TODA TU SESIÓN', '+15', ''],
      ['ROMPER UN RM', '+25', 'pv-green'],
      ['CUMPLIR TODOS LOS DÍAS DE TU SEMANA', '+50', 'pv-accent'],
      ['RACHA 5 DÍAS', '+30 BONUS', 'pv-gold'],
      ['RACHA 10 DÍAS', '+75 BONUS', 'pv-gold'],
      ['RACHA 20 DÍAS', '+200 BONUS', 'pv-gold'],
    ];
    html += '<div class="points-card"><div class="section-title-podio" style="margin-top:0;">SISTEMA DE PUNTOS</div>' +
      rules.map((r) => '<div class="points-row"><span class="points-label">' + r[0] + '</span><span class="points-value ' + r[2] + '">' + r[1] + '</span></div>').join('') +
      '<div class="fair-note">Cada quien compite contra su propio plan: los puntos premian la constancia, no el peso que levantas. Los días de descanso de tu plan no rompen tu racha.</div></div>';
    return html;
  }
  $('#podio-tabs').addEventListener('click', (ev) => {
    const b = ev.target.closest('.tab-btn');
    if (!b) return;
    S.podioTab = b.dataset.podio;
    renderPodio();
  });
  $('#view-stats').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-podio-filter] .mini-filter-btn');
    if (!b) return;
    S.podioFilter = b.dataset.filter;
    renderPodio();
  });

  /* ================================================================ PANEL DEL COACH */
  async function loadCoachState() {
    const st = await api('GET', 'state?date=' + today());
    if (S.role !== 'coach') throw stale();
    S.cstate = st;
    S.stateAt = Date.now();
  }
  async function enterCoach() {
    showOnly('coach');
    switchCoachView('dashboard');
  }
  $$('#coach-panel .nav-item').forEach((b) => b.addEventListener('click', () => switchCoachView(b.dataset.coachView)));
  async function switchCoachView(v) {
    S.cview = v;
    $$('#coach-panel .nav-item').forEach((b) => b.classList.toggle('active', b.dataset.coachView === v));
    $$('#coach-panel main.view').forEach((el) => { const on = el.id === 'coach-view-' + v; el.classList.toggle('active', on); el.classList.toggle('on', on); });
    window.scrollTo(0, 0);
    renderCoachView();
    if (v === 'plan' && S.cstate) return;
    try { await loadCoachState(); if (S.cview === v) renderCoachView(); } catch (e) { if (e.code !== 'NO_SESSION' && !e.stale) toastErr(e); }
  }
  function renderCoachView() {
    if (S.cview === 'dashboard') renderCoachDashboard();
    if (S.cview === 'clientes') renderClients();
    if (S.cview === 'plan') renderPlanView();
    if (S.cview === 'progreso') renderProgreso();
  }
  const cAthlete = (id) => ((S.cstate && S.cstate.roster) || []).find((a) => a.id === id) || null;
  const cName = (id) => { const a = cAthlete(id); return a ? a.name : '—'; };
  const hasPlan = (id) => !!(S.cstate && S.cstate.coach.withPlan.indexOf(id) !== -1);
  const maskDays = (m) => (m || '').split('').filter((c) => c === '1').length;

  function renderCoachDashboard() {
    const st = S.cstate;
    if (!st) { $('#coach-stats').innerHTML = '<div class="loading-line" style="grid-column:1/-1;">Cargando…</div>'; return; }
    const trained = new Set(st.hoy.map((h) => h.athleteId));
    const scheduled = st.coach.scheduledToday.filter(hasPlan);
    const pending = scheduled.filter((id) => !trained.has(id));
    $('#coach-stats').innerHTML =
      '<div class="stat-box sb-green"><div class="stat-box-num">' + trained.size + '</div><div class="stat-box-label">ENTRENARON HOY</div></div>' +
      '<div class="stat-box sb-red"><div class="stat-box-num">' + pending.length + '</div><div class="stat-box-label">PENDIENTES HOY</div></div>' +
      '<div class="stat-box"><div class="stat-box-num">' + st.roster.length + '</div><div class="stat-box-label">CLIENTES</div></div>' +
      '<div class="stat-box"><div class="stat-box-num">' + st.coach.prsWeek + '</div><div class="stat-box-label">PRs SEMANA</div></div>';
    const doneSched = scheduled.filter((id) => trained.has(id)).length;
    $('#coach-today').innerHTML = '<div class="dash-today"><div class="wod-live-top" style="margin-bottom:0;"><div class="wod-tag"><span class="tag-rule"></span><span class="tag-name">HOY · ' + DIAS[dowOf(today())] + '</span></div>' +
      '<div class="wod-live-status"><span class="live-dot"></span><span>EN VIVO</span></div></div>' +
      '<div class="dash-today-title">' + (scheduled.length ? doneSched + ' DE ' + plural(scheduled.length, 'CLIENTE PROGRAMADO', 'CLIENTES PROGRAMADOS') + ' YA ENTRENARON' : 'HOY NO HAY CLIENTES PROGRAMADOS') + '</div>' +
      '<div class="progress-track"><div class="progress-fill" style="width:' + (scheduled.length ? Math.round(doneSched / scheduled.length * 100) : 0) + '%"></div></div></div>';
    let rows = st.hoy.map((h) => {
      const a = cAthlete(h.athleteId);
      if (!a) return '';
      return '<div class="who-registered-row"><div class="who-avatar wa-green">' + esc(initials(a.name)) + '</div><div class="who-info">' +
        '<div class="who-name">' + esc(a.name) + ' ' + (h.complete ? '<span class="pill pill-rx">COMPLETO</span>' : '<span class="pill pill-scaled">EN CURSO</span>') + (h.prs ? ' <span class="pill pill-pr">PR</span>' : '') + '</div>' +
        '<div class="who-sub">' + h.done + '/' + h.total + ' EJERCICIOS · ' + plural(h.sets, 'SERIE', 'SERIES') + ' · ' + agoTs(h.ts) + '</div></div><div class="who-score">+' + h.points + '</div></div>';
    }).join('');
    rows += pending.map((id) => {
      const a = cAthlete(id);
      if (!a) return '';
      return '<div class="who-registered-row"><div class="who-avatar wa-gray">' + esc(initials(a.name)) + '</div><div class="who-info">' +
        '<div class="who-name">' + esc(a.name) + ' <span class="pill pill-pending">PENDIENTE</span></div><div class="who-sub">PROGRAMADO HOY</div></div></div>';
    }).join('');
    $('#coach-today-list').innerHTML = rows || '<div class="empty-sub" style="padding:0 20px 10px;">Todavía nadie ha entrenado hoy.</div>';
    const noPlan = st.roster.filter((a) => !hasPlan(a.id));
    $('#coach-noplan').innerHTML = noPlan.length ? '<div class="section-title-podio" style="padding:0 20px;">CLIENTES SIN PLAN</div>' + noPlan.map((a) =>
      '<div class="who-registered-row"><div class="who-avatar wa-gray">' + esc(initials(a.name)) + '</div><div class="who-info"><div class="who-name">' + esc(a.name) + '</div><div class="who-sub">SIN PLAN SEMANAL</div></div>' +
      '<button type="button" class="action-btn" data-plan-for="' + a.id + '" style="padding:9px 12px;">CREAR PLAN</button></div>').join('') : '';
  }
  $('#coach-noplan').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-plan-for]');
    if (b) openPlanFor(b.dataset.planFor);
  });

  // ---- clientes
  const randomPin = () => String(Math.floor(1000 + Math.random() * 9000));
  let caGender = 'm';
  $('#ca-pin').value = randomPin();
  digitsOnly($('#ca-pin'));
  $('#ca-gender').addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    caGender = b.dataset.v;
    $$('#ca-gender button').forEach((x) => x.classList.toggle('on', x === b));
  });
  $('#client-add-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const name = $('#ca-name').value.trim();
    const pin = $('#ca-pin').value;
    const err = $('#ca-error');
    if (name.length < 2) { err.textContent = 'Escribe el nombre del cliente'; return; }
    if (!/^\d{4}$/.test(pin)) { err.textContent = 'El PIN debe tener 4 números'; return; }
    err.textContent = '';
    const btn = $('button[type="submit"]', ev.target);
    btn.disabled = true;
    try {
      const r = await api('POST', 'athletes', { name, gender: caGender, pin });
      S.lastCreated = { id: r.athlete.id, name: r.athlete.name, pin };
      $('#ca-name').value = '';
      $('#ca-pin').value = randomPin();
      toast(firstName(r.athlete.name) + ' creado · PIN ' + pin);
      await loadCoachState();
      renderClients();
    } catch (e) {
      err.textContent = e.code === 'NAME_TAKEN' ? 'Ya existe un cliente con ese nombre' : e.message;
    } finally {
      btn.disabled = false;
    }
  });
  function renderClients() {
    const st = S.cstate;
    const el = $('#client-list');
    if (!st) { el.innerHTML = '<div class="loading-line">Cargando…</div>'; return; }
    const stats = {};
    st.alltime.forEach((x) => { stats[x.athleteId] = x; });
    let html = '';
    if (S.lastCreated && cAthlete(S.lastCreated.id)) {
      html += '<div class="focus-card f-green" style="margin-bottom:16px;"><div class="focus-label">✓ ' + esc(S.lastCreated.name) + ' YA ESTÁ EN EL TEAM</div>' +
        '<div class="focus-text">Compártele cómo entrar: correo <b>atletas@teamcarlos.com</b>, la contraseña del team y su PIN <b>' + esc(S.lastCreated.pin) + '</b>.</div>' +
        '<div class="btn-row" style="margin-top:10px;"><button type="button" class="btn-accent" data-plan-for="' + S.lastCreated.id + '">CREAR SU PLAN</button><button type="button" class="btn-ghost" data-dismiss-created>LISTO</button></div></div>';
    }
    html += '<div class="section-title-podio" style="margin-top:0;">' + plural(st.roster.length, 'CLIENTE', 'CLIENTES') + '</div>';
    if (!st.roster.length) html += '<div class="empty-sub" style="text-align:left;">Agrega tu primer cliente arriba. También pueden registrarse solos desde la app con el correo del team.</div>';
    html += st.roster.map((a) => {
      const s = stats[a.id] || {};
      const open = S.clientOpen === a.id;
      const plan = hasPlan(a.id);
      const sub = (plan ? '<span class="ok">PLAN ' + maskDays(st.coach.masks[a.id]) + ' DÍAS</span>' : '<span class="warn">SIN PLAN</span>') +
        ' · ' + (a.gender === 'f' ? 'MUJER' : 'HOMBRE') + ' · RACHA ' + (s.streak || 0) + ' · ' + plural(s.days || 0, 'ENTRENO', 'ENTRENOS');
      let inline = '';
      if (open && S.clientInline === 'rename') {
        inline = '<form class="inline-form" data-form="rename"><input class="form-input" name="v" value="' + esc(a.name) + '" maxlength="40" aria-label="Nuevo nombre"><button type="submit" class="btn-accent">GUARDAR</button></form>';
      } else if (open && S.clientInline === 'pin') {
        inline = '<form class="inline-form" data-form="pin"><input class="form-input pin-mini" name="v" value="' + randomPin() + '" inputmode="numeric" maxlength="4" aria-label="PIN nuevo"><button type="submit" class="btn-accent">ASIGNAR PIN</button></form>';
      }
      return '<div class="client-row' + (open ? ' open' : '') + '" data-id="' + a.id + '">' +
        '<button type="button" class="client-head" data-act="c-toggle"><div class="who-avatar ' + (plan ? 'wa-green' : 'wa-gray') + '">' + esc(initials(a.name)) + '</div>' +
        '<div class="client-info"><div class="client-name">' + esc(a.name) + '</div><div class="client-sub">' + sub + '</div></div><i class="ti ti-chevron-down cb-chevron" aria-hidden="true"></i></button>' +
        '<div class="client-actions"><div class="action-grid">' +
          '<button type="button" class="action-btn primary" data-act="c-plan"><i class="ti ti-clipboard-list" aria-hidden="true"></i>' + (plan ? 'EDITAR PLAN' : 'CREAR PLAN') + '</button>' +
          '<button type="button" class="action-btn" data-act="c-rename"><i class="ti ti-pencil" aria-hidden="true"></i>RENOMBRAR</button>' +
          '<button type="button" class="action-btn" data-act="c-gender"><i class="ti ti-arrows-exchange" aria-hidden="true"></i>' + (a.gender === 'f' ? 'CAMBIAR A HOMBRE' : 'CAMBIAR A MUJER') + '</button>' +
          '<button type="button" class="action-btn" data-act="c-pin"><i class="ti ti-key" aria-hidden="true"></i>NUEVO PIN</button>' +
          '<button type="button" class="action-btn danger" data-act="c-delete"><i class="ti ti-trash" aria-hidden="true"></i>ELIMINAR</button>' +
        '</div>' + inline + '</div></div>';
    }).join('');
    el.innerHTML = html;
  }
  $('#client-list').addEventListener('click', async (ev) => {
    if (ev.target.closest('[data-dismiss-created]')) { S.lastCreated = null; renderClients(); return; }
    const pf = ev.target.closest('[data-plan-for]');
    if (pf) { openPlanFor(pf.dataset.planFor); return; }
    const btn = ev.target.closest('[data-act]');
    if (!btn) return;
    const row = btn.closest('.client-row');
    const id = row.dataset.id;
    const a = cAthlete(id);
    if (!a) { renderClients(); return; }
    const act = btn.dataset.act;
    if (act === 'c-toggle') { S.clientOpen = S.clientOpen === id ? null : id; S.clientInline = null; renderClients(); return; }
    if (act === 'c-plan') { openPlanFor(id); return; }
    if (act === 'c-rename' || act === 'c-pin') {
      S.clientInline = act === 'c-rename' ? 'rename' : 'pin';
      renderClients();
      const input = $('.client-row.open input', $('#client-list'));
      if (input) { input.focus(); if (act === 'c-rename') input.select(); }
      return;
    }
    if (act === 'c-gender') {
      btn.disabled = true;
      try { await api('PATCH', 'athletes/' + id, { gender: a.gender === 'f' ? 'm' : 'f' }); await loadCoachState(); toast('Actualizado'); }
      catch (e) { toastErr(e); }
      renderClients();
      return;
    }
    if (act === 'c-delete') {
      if (!confirmTap(btn, '¿BORRAR TODO? TOCA OTRA VEZ')) return;
      btn.disabled = true;
      try {
        await api('DELETE', 'athletes/' + id);
        toast(firstName(a.name) + ' eliminado');
        if (S.pe.athleteId === id) S.pe = { athleteId: '', plan: null, exists: false, dirty: false, open: {}, loading: false };
        S.clientOpen = null;
        await loadCoachState();
      } catch (e) { toastErr(e); }
      renderClients();
    }
  });
  $('#client-list').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const form = ev.target;
    const id = form.closest('.client-row').dataset.id;
    const v = form.elements.v.value.trim();
    const btn = $('button', form);
    btn.disabled = true;
    try {
      if (form.dataset.form === 'rename') {
        await api('PATCH', 'athletes/' + id, { name: v });
        toast('Nombre actualizado');
      } else {
        if (!/^\d{4}$/.test(v)) { toast('El PIN debe tener 4 números', 'ti-alert-triangle', true); btn.disabled = false; return; }
        await api('PATCH', 'athletes/' + id, { pin: v });
        toast('PIN nuevo: ' + v + ' · compártelo con tu cliente', 'ti-key');
      }
      S.clientInline = null;
      await loadCoachState();
      renderClients();
    } catch (e) {
      btn.disabled = false;
      toastErr(e);
    }
  });

  // ---- plan semanal (editor)
  const X = (rows, modo) => rows.map((r) => ({ id: '', nombre: r[0], series: r[1], reps: r[2], descanso: r[3], modo: r[4] || modo || 'carga', nota: '' }));
  const FH = 'FUERZA + HIPERTROFIA';
  const TPL = {
    enfoque: FH, frecuencia: 'GYM 5 DÍAS (MAÑANA)', edad: '', nivel: 'AVANZADO',
    objetivo: 'Más fuerza, más músculo, mejor rendimiento', unidad: 'kg',
    dias: [
      { dow: 0, titulo: 'PECHO + TRÍCEPS', subtitulo: FH, duracion: '60–70 min', rpe: '7–8', nota: '', secciones: [{ titulo: '', nota: '', ejercicios: X([
        ['Press de banca con barra', '4', '4–6', '2–3 min'],
        ['Press inclinado con mancuernas', '3', '8–10', '90 seg'],
        ['Aperturas en máquina o polea', '3', '10–12', '60–90 seg'],
        ['Fondos en paralelas o máquina', '3', '8–12', '90 seg'],
        ['Extensión de tríceps en polea', '2', '10–12', '60 seg'],
        ['Press francés con barra o mancuerna', '2', '12–15', '45 seg'],
        ['Empuje de tríceps en polea (cuerda)', '2', '12–15', '45 seg'],
      ]) }] },
      { dow: 1, titulo: 'ESPALDA + BÍCEPS', subtitulo: FH, duracion: '60–70 min', rpe: '7–8', nota: '', secciones: [{ titulo: '', nota: '', ejercicios: X([
        ['Dominadas lastradas o jalón al pecho', '4', '4–8', '2–3 min'],
        ['Remo con barra', '4', '6–10', '2 min'],
        ['Remo en máquina o polea', '3', '8–12', '90 seg'],
        ['Face pull', '3', '12–15', '60 seg'],
        ['Curl de bíceps con barra', '3', '10–12', '60 seg'],
        ['Curl martillo con mancuernas', '2', '12', '60 seg'],
        ['Curl en polea (con cuerda o barra)', '2', '12–15', '60 seg'],
      ]) }] },
      { dow: 2, titulo: 'MOVILIDAD + ESTIRAMIENTOS', subtitulo: 'RECUPERACIÓN Y PREVENCIÓN', duracion: '40–60 min', rpe: '6–7', nota: '', secciones: [
        { titulo: 'MOVILIDAD ARTICULAR', nota: '10–15 min', ejercicios: X([
          ['Movilidad de hombros (círculos + rotaciones)', '2', '10–12', '45 seg'],
          ['Movilidad de cadera (90/90 + apertura)', '2', '10–12', '45 seg'],
          ['Movilidad de columna (gato-vaca + rotaciones)', '2', '10–12', '45 seg'],
          ['Movilidad de tobillos (círculos + dorsiflexión)', '2', '10–12', '45 seg'],
        ], 'libre') },
        { titulo: 'ESTIRAMIENTOS DINÁMICOS', nota: '10–15 min', ejercicios: X([
          ['Cadena posterior (balanceo)', '2', '30 seg', '30 seg'],
          ['Pecho y hombros', '2', '30 seg', '30 seg'],
          ['Espalda y columna', '2', '30 seg', '30 seg'],
          ['Tobillos y pantorrillas', '2', '30 seg', '30 seg'],
        ], 'libre') },
        { titulo: 'ESTIRAMIENTOS ESTÁTICOS', nota: '10–15 min', ejercicios: X([
          ['Isquiotibiales', '3', '45 seg', '30 seg'],
          ['Cuádriceps', '3', '45 seg', '30 seg'],
          ['Glúteos', '3', '45 seg', '30 seg'],
          ['Espalda', '3', '45 seg', '30 seg'],
          ['Pecho y hombros', '3', '45 seg', '30 seg'],
        ], 'libre') },
        { titulo: 'LIBERACIÓN MIOFASCIAL', nota: '10–15 min', ejercicios: X([
          ['Foam roller (espalda, piernas)', '', '5–10 min', ''],
          ['Pelota de lacrosse (puntos gatillo)', '', '5–10 min', ''],
        ], 'libre') },
      ] },
      { dow: 3, titulo: 'PIERNAS', subtitulo: FH, duracion: '60–70 min', rpe: '7–8', nota: '', secciones: [{ titulo: '', nota: '', ejercicios: X([
        ['Sentadilla trasera con barra', '4', '4–6', '2–3 min'],
        ['Peso muerto rumano', '4', '6–8', '2 min'],
        ['Prensa de piernas', '3', '8–12', '90 seg'],
        ['Zancadas caminando o búlgaras', '3', '10–12', '90 seg'],
        ['Extensión de cuádriceps en máquina', '3', '10–12', '60 seg'],
        ['Curl femoral', '3', '10–12', '60 seg'],
        ['Elevación de pantorrillas en máquina o de pie', '4', '12–15', '45 seg'],
        ['Ab wheel / plancha abdominal', '3', '10–15', '45 seg', 'libre'],
      ]) }] },
      { dow: 4, titulo: 'HOMBROS + BRAZOS', subtitulo: FH, duracion: '60–70 min', rpe: '7–8', nota: '', secciones: [{ titulo: '', nota: '', ejercicios: X([
        ['Press militar con barra o mancuernas', '4', '6–10', '2 min'],
        ['Elevaciones laterales', '3', '10–15', '60 seg'],
        ['Elevaciones frontales', '3', '10–15', '60 seg'],
        ['Pájaros en máquina o polea', '3', '12–15', '60 seg'],
        ['Remo al mentón (o face pull)', '3', '10–12', '60 seg'],
        ['Curl de bíceps con barra', '3', '8–12', '90 seg'],
        ['Curl martillo con mancuernas', '3', '10–12', '60 seg'],
        ['Extensión de tríceps en polea', '3', '10–12', '60 seg'],
        ['Fondos en máquina o paralelas', '3', '10–12', '60 seg'],
      ]) }] },
    ],
    consejos: [
      { titulo: 'PROGRESIÓN DE CARGAS', items: ['Aumenta la carga 2,5–5% cuando completes el rango alto de repeticiones con buena técnica.', 'Mantén 1–3 repeticiones en reserva (RIR).'] },
      { titulo: 'MANEJO DE LA FATIGA', items: ['Duerme 7–9 horas diarias.', 'Mantén una buena hidratación.', 'Nutrición acorde al gasto calórico.', 'Escucha tu cuerpo y ajusta cargas si es necesario.'] },
      { titulo: 'CONSEJOS FINALES', items: ['Mantén la constancia y la técnica.', 'Enfócate en la calidad del movimiento.', 'La clave está en la consistencia, la buena técnica y la recuperación.'] },
    ],
  };
  const withNewIds = (plan) => {
    const p = clone(plan);
    p.dias.forEach((d) => d.secciones.forEach((s) => s.ejercicios.forEach((e) => { e.id = rid(); })));
    return p;
  };
  const emptyPlan = () => ({ enfoque: '', frecuencia: '', edad: '', nivel: '', objetivo: '', unidad: 'kg', dias: [], consejos: clone(TPL.consejos) });
  const newEx = () => ({ id: rid(), nombre: '', series: '3', reps: '10–12', descanso: '60 seg', modo: 'carga', nota: '' });
  const newDay = (dow) => ({ dow, titulo: '', subtitulo: '', duracion: '60–70 min', rpe: '7–8', nota: '', secciones: [{ titulo: '', nota: '', ejercicios: [newEx()] }] });

  function openPlanFor(id) {
    switchCoachView('plan');
    if (S.pe.athleteId !== id) {
      if (S.pe.dirty && !window.confirm('Tienes cambios sin guardar. ¿Descartarlos?')) return;
      loadPlanEditor(id);
    }
  }
  async function loadPlanEditor(id) {
    S.pe = { athleteId: id, plan: null, exists: false, dirty: false, open: {}, loading: !!id };
    renderPlanView();
    if (!id) return;
    try {
      const r = await api('GET', 'plan?athleteId=' + id);
      if (S.pe.athleteId !== id) return;
      S.pe.plan = r.plan ? clone(r.plan) : emptyPlan();
      S.pe.exists = !!r.plan;
      if (!S.pe.plan.consejos || !S.pe.plan.consejos.length) S.pe.plan.consejos = clone(TPL.consejos);
      if (S.pe.plan.dias[0]) S.pe.open[S.pe.plan.dias[0].dow] = true;
    } catch (e) {
      toastErr(e);
      S.pe.athleteId = '';
    }
    S.pe.loading = false;
    renderPlanView();
  }
  const planSelect = $('#plan-client');
  planSelect.addEventListener('change', () => {
    if (S.pe.dirty && !window.confirm('Tienes cambios sin guardar. ¿Descartarlos?')) { planSelect.value = S.pe.athleteId; return; }
    loadPlanEditor(planSelect.value);
  });
  function renderPlanView() {
    const roster = (S.cstate && S.cstate.roster) || [];
    planSelect.innerHTML = '<option value="">ELIGE UN CLIENTE…</option>' + roster.map((a) => '<option value="' + a.id + '">' + esc(a.name.toUpperCase()) + (hasPlan(a.id) ? '' : ' · SIN PLAN') + '</option>').join('');
    planSelect.value = S.pe.athleteId || '';
    const el = $('#plan-editor');
    if (!S.pe.athleteId) { el.innerHTML = emptyCard('ti-clipboard-list', 'Elige un cliente', roster.length ? 'Selecciona un cliente para crear o editar su plan semanal.' : 'Primero agrega clientes en la pestaña Clientes.'); return; }
    if (S.pe.loading || !S.pe.plan) { el.innerHTML = '<div class="loading-line">Cargando plan…</div>'; return; }
    el.innerHTML = planEditorHtml();
  }
  function planStatusHtml() {
    if (S.pe.dirty) return '<span class="plan-status ps-dirty" id="pe-status">CAMBIOS SIN GUARDAR</span>';
    return S.pe.exists ? '<span class="plan-status ps-live" id="pe-status">PLAN PUBLICADO · EL CLIENTE YA LO VE</span>' : '<span class="plan-status ps-new" id="pe-status">SIN PLAN TODAVÍA</span>';
  }
  function markDirty() {
    S.pe.dirty = true;
    const s = $('#pe-status');
    if (s) { s.className = 'plan-status ps-dirty'; s.textContent = 'CAMBIOS SIN GUARDAR'; }
  }
  function planEditorHtml() {
    const p = S.pe.plan;
    const others = ((S.cstate && S.cstate.roster) || []).filter((a) => a.id !== S.pe.athleteId && hasPlan(a.id));
    const input = (attr, val, ph, extra) => '<input class="form-input" ' + attr + ' value="' + esc(val) + '" placeholder="' + esc(ph) + '"' + (extra || '') + '>';
    let html = planStatusHtml();
    html += '<div class="plan-tools"><button type="button" class="action-btn" data-act="pe-tpl"><i class="ti ti-template" aria-hidden="true"></i>PLANTILLA TMC 5 DÍAS</button>' +
      '<select class="form-select" id="pe-copy" aria-label="Copiar plan de otro cliente"' + (others.length ? '' : ' disabled') + '><option value="">' + (others.length ? 'COPIAR DE…' : 'COPIAR (SIN OTROS PLANES)') + '</option>' +
      others.map((a) => '<option value="' + a.id + '">' + esc(a.name.toUpperCase()) + '</option>').join('') + '</select></div>';
    html += '<div class="editor-card"><div class="editor-card-title">PERFIL DEL PLAN</div>' +
      '<div class="form-field-group"><label class="form-label">ENFOQUE</label>' + input('data-pf="enfoque" maxlength="60"', p.enfoque, 'FUERZA + HIPERTROFIA') + '</div>' +
      '<div class="form-field-group"><label class="form-label">FRECUENCIA</label>' + input('data-pf="frecuencia" maxlength="60"', p.frecuencia, 'GYM 5 DÍAS (MAÑANA)') + '</div>' +
      '<div class="form-row" style="margin-bottom:14px;"><div><label class="form-label">EDAD</label>' + input('data-pf="edad" inputmode="numeric" maxlength="3"', p.edad, 'AÑOS') + '</div>' +
      '<div><label class="form-label">NIVEL</label><select class="form-select" data-pf="nivel">' + ['', 'PRINCIPIANTE', 'INTERMEDIO', 'AVANZADO'].map((n) => '<option value="' + n + '"' + (p.nivel === n ? ' selected' : '') + '>' + (n || '—') + '</option>').join('') + '</select></div></div>' +
      '<div class="form-field-group"><label class="form-label">OBJETIVO</label>' + input('data-pf="objetivo" maxlength="160"', p.objetivo, 'Más fuerza, más músculo, mejor rendimiento') + '</div>' +
      '<label class="form-label">UNIDAD DE PESO</label><div class="seg" data-act="pe-unit"><button type="button" data-v="kg" class="' + (p.unidad !== 'lb' ? 'on' : '') + '">KG</button><button type="button" data-v="lb" class="' + (p.unidad === 'lb' ? 'on' : '') + '">LB</button></div></div>';
    const active = {};
    p.dias.forEach((d) => { active[d.dow] = true; });
    html += '<div class="editor-card"><div class="editor-card-title">DÍAS DE ENTRENAMIENTO</div><div class="dow-toggles">' +
      DIAS_CORTOS.map((l, i) => '<button type="button" class="dow-toggle' + (active[i] ? ' on' : '') + '" data-act="pe-dow" data-dow="' + i + '" aria-label="' + DIAS[i] + '">' + l + '</button>').join('') + '</div>' +
      '<div class="fair-note">Los días que no marques son de descanso y no rompen la racha del cliente.</div></div>';
    p.dias.slice().sort((a, b) => a.dow - b.dow).forEach((d) => {
      const di = p.dias.indexOf(d);
      const n = dayExercises(d).length;
      html += '<div class="collapsible-block cb-red' + (S.pe.open[d.dow] ? ' open' : '') + '" data-di="' + di + '">' +
        '<div class="cb-header" data-act="pe-day-toggle"><i class="ti ti-calendar-event cb-icon" aria-hidden="true"></i><div class="cb-header-text">' +
        '<div class="cb-title" data-day-title>' + esc(DIAS[d.dow] + ' · ' + (d.titulo || 'SIN TÍTULO')) + '</div><div class="cb-subtitle" data-day-sub>' + plural(n, 'EJERCICIO', 'EJERCICIOS') + (d.duracion ? ' · ' + esc(d.duracion) : '') + '</div></div>' +
        '<i class="ti ti-chevron-down cb-chevron" aria-hidden="true"></i></div><div class="cb-body">' +
        '<div class="form-row" style="margin-bottom:10px;"><div><label class="form-label">TÍTULO DEL DÍA</label>' + input('data-df="titulo" maxlength="60"', d.titulo, 'PECHO + TRÍCEPS') + '</div>' +
        '<div><label class="form-label">ENFOQUE</label>' + input('data-df="subtitulo" maxlength="60"', d.subtitulo, 'FUERZA + HIPERTROFIA') + '</div></div>' +
        '<div class="form-row" style="margin-bottom:14px;"><div><label class="form-label">DURACIÓN</label>' + input('data-df="duracion" maxlength="20"', d.duracion, '60–70 min') + '</div>' +
        '<div><label class="form-label">RPE</label>' + input('data-df="rpe" maxlength="12"', d.rpe, '7–8') + '</div></div>';
      d.secciones.forEach((s, si) => {
        html += '<div class="sec-edit" data-si="' + si + '"><div class="sec-edit-head">' +
          '<input class="form-input sec-t" data-sf="titulo" maxlength="60" value="' + esc(s.titulo) + '" placeholder="SECCIÓN (OPCIONAL)">' +
          '<input class="form-input sec-n" data-sf="nota" maxlength="40" value="' + esc(s.nota) + '" placeholder="10–15 MIN">' +
          (d.secciones.length > 1 ? '<button type="button" class="pex-mini danger" data-act="pe-sec-del" aria-label="Quitar sección"><i class="ti ti-trash" aria-hidden="true"></i></button>' : '') + '</div>';
        s.ejercicios.forEach((e, ei) => {
          const libre = e.modo === 'libre';
          html += '<div class="pex" data-ei="' + ei + '"><div class="pex-top"><span class="pex-num">' + (ei + 1) + '</span>' +
            '<input class="form-input" data-ef="nombre" maxlength="80" value="' + esc(e.nombre) + '" placeholder="Ejercicio" aria-label="Ejercicio ' + (ei + 1) + '"></div>' +
            '<div class="pex-grid"><label>SERIES' + input('data-ef="series" inputmode="numeric" maxlength="6"', e.series, '3') + '</label>' +
            '<label>REPS / TIEMPO' + input('data-ef="reps" maxlength="16"', e.reps, '10–12') + '</label>' +
            '<label>DESCANSO' + input('data-ef="descanso" maxlength="16"', e.descanso, '60 seg') + '</label></div>' +
            '<div class="pex-foot"><button type="button" class="pex-mode' + (libre ? ' libre' : '') + '" data-act="pe-ex-mode" title="Con peso: el cliente anota peso y reps. Libre: solo marca la serie (movilidad, estiramientos, plancha).">' +
            '<i class="ti ' + (libre ? 'ti-stretching' : 'ti-barbell') + '" aria-hidden="true"></i>' + (libre ? 'LIBRE (SIN PESO)' : 'CON PESO') + '</button><span class="grow"></span>' +
            '<button type="button" class="pex-mini" data-act="pe-ex-up" aria-label="Subir"' + (ei === 0 ? ' disabled' : '') + '><i class="ti ti-arrow-up" aria-hidden="true"></i></button>' +
            '<button type="button" class="pex-mini" data-act="pe-ex-down" aria-label="Bajar"' + (ei === s.ejercicios.length - 1 ? ' disabled' : '') + '><i class="ti ti-arrow-down" aria-hidden="true"></i></button>' +
            '<button type="button" class="pex-mini danger" data-act="pe-ex-del" aria-label="Quitar ejercicio"><i class="ti ti-trash" aria-hidden="true"></i></button></div></div>';
        });
        html += '<button type="button" class="add-exercise-btn" data-act="pe-ex-add">+ EJERCICIO</button></div>';
      });
      html += '<button type="button" class="add-exercise-btn" data-act="pe-sec-add" style="margin-bottom:12px;">+ SECCIÓN (EJ: MOVILIDAD, ESTIRAMIENTOS)</button>' +
        '<div class="form-field-group" style="margin-bottom:0;"><label class="form-label">NOTA DEL DÍA (OPCIONAL)</label>' + input('data-df="nota" maxlength="300"', d.nota, 'Ej: hoy prioriza la técnica en el press') + '</div>' +
        '</div></div>';
    });
    if (!p.dias.length) html += '<div class="empty-sub" style="margin-bottom:14px;">Marca los días de entrenamiento arriba o usa la plantilla TMC para empezar.</div>';
    while (p.consejos.length < 3) p.consejos.push({ titulo: '', items: [] });
    html += '<div class="editor-card"><div class="editor-card-title">CONSEJOS DEL COACH</div>' + p.consejos.slice(0, 3).map((c, ci) =>
      '<div class="tip-edit" data-ci="' + ci + '"><input class="form-input" data-cf="titulo" maxlength="40" value="' + esc(c.titulo) + '" placeholder="TÍTULO (EJ: MANEJO DE LA FATIGA)">' +
      '<textarea class="form-textarea" data-cf="items" placeholder="Un consejo por línea">' + esc((c.items || []).join('\n')) + '</textarea></div>').join('') + '</div>';
    html += '<button type="button" class="publish-btn" data-act="pe-save"><i class="ti ti-send" aria-hidden="true"></i><span>' + (S.pe.exists ? 'GUARDAR CAMBIOS' : 'PUBLICAR PLAN') + '</span></button>';
    if (S.pe.exists) html += '<button type="button" class="delete-btn" data-act="pe-delete">BORRAR PLAN</button>';
    return html;
  }
  const planEditor = $('#plan-editor');
  function peRefs(t) {
    const p = S.pe.plan;
    const dayEl = t.closest('[data-di]');
    const day = dayEl ? p.dias[+dayEl.dataset.di] : null;
    const secEl = t.closest('[data-si]');
    const sec = day && secEl ? day.secciones[+secEl.dataset.si] : null;
    const exEl = t.closest('[data-ei]');
    const ex = sec && exEl ? sec.ejercicios[+exEl.dataset.ei] : null;
    return { p, day, dayEl, sec, secEl, ex, exEl };
  }
  planEditor.addEventListener('input', (ev) => {
    const t = ev.target;
    if (!S.pe.plan || t.id === 'pe-copy') return;
    const r = peRefs(t);
    if (t.dataset.pf) r.p[t.dataset.pf] = t.value;
    else if (t.dataset.df && r.day) {
      r.day[t.dataset.df] = t.value;
      const title = $('[data-day-title]', r.dayEl);
      const sub = $('[data-day-sub]', r.dayEl);
      if (title) title.textContent = DIAS[r.day.dow] + ' · ' + (r.day.titulo || 'SIN TÍTULO');
      if (sub) sub.textContent = plural(dayExercises(r.day).length, 'EJERCICIO', 'EJERCICIOS') + (r.day.duracion ? ' · ' + r.day.duracion : '');
    } else if (t.dataset.sf && r.sec) r.sec[t.dataset.sf] = t.value;
    else if (t.dataset.ef && r.ex) r.ex[t.dataset.ef] = t.value;
    else if (t.dataset.cf) {
      const c = r.p.consejos[+t.closest('[data-ci]').dataset.ci];
      if (t.dataset.cf === 'items') c.items = t.value.split('\n'); else c.titulo = t.value;
    } else return;
    markDirty();
  });
  planEditor.addEventListener('change', async (ev) => {
    if (ev.target.id !== 'pe-copy' || !ev.target.value) return;
    const sel = ev.target;
    const from = sel.value;
    if (S.pe.plan.dias.length && !window.confirm('Esto reemplaza el plan actual de este cliente (sin guardar todavía). ¿Continuar?')) { sel.value = ''; return; }
    try {
      const r = await api('GET', 'plan?athleteId=' + from);
      if (!r.plan) { toast('Ese cliente ya no tiene plan', 'ti-alert-triangle', true); return; }
      const cur = S.pe.plan;
      const next = withNewIds(r.plan);
      next.edad = cur.edad; next.objetivo = cur.objetivo || next.objetivo;
      delete next.updatedAt;
      S.pe.plan = next;
      S.pe.open = {};
      if (next.dias[0]) S.pe.open[next.dias[0].dow] = true;
      markDirty();
      renderPlanView();
      toast('Plan copiado de ' + firstName(cName(from)) + '. Revísalo y guarda.', 'ti-copy');
    } catch (e) { toastErr(e); sel.value = ''; }
  });
  planEditor.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('[data-act]');
    if (!btn || !S.pe.plan) return;
    const act = btn.dataset.act;
    const r = peRefs(btn);
    const p = r.p;
    const rerender = () => { markDirty(); renderPlanView(); };
    if (act === 'pe-day-toggle') { const dow = r.day.dow; S.pe.open[dow] = !S.pe.open[dow]; r.dayEl.classList.toggle('open', S.pe.open[dow]); return; }
    if (act === 'pe-unit') {
      const b = ev.target.closest('button');
      if (!b) return;
      p.unidad = b.dataset.v;
      $$('button', btn).forEach((x) => x.classList.toggle('on', x === b));
      markDirty();
      return;
    }
    if (act === 'pe-dow') {
      const dow = +btn.dataset.dow;
      const idx = p.dias.findIndex((d) => d.dow === dow);
      if (idx === -1) { p.dias.push(newDay(dow)); p.dias.sort((a, b) => a.dow - b.dow); S.pe.open[dow] = true; rerender(); return; }
      const hasContent = dayExercises(p.dias[idx]).some((e) => e.nombre);
      if (hasContent && !confirmTap(btn)) { toast('Toca otra vez para quitar el ' + DIAS[dow].toLowerCase(), 'ti-info-circle'); return; }
      p.dias.splice(idx, 1);
      rerender();
      return;
    }
    if (act === 'pe-tpl') {
      if (p.dias.length && !confirmTap(btn, '¿REEMPLAZAR? TOCA OTRA VEZ')) return;
      const next = withNewIds(TPL);
      next.edad = p.edad; next.objetivo = p.objetivo || next.objetivo;
      if (p.nivel) next.nivel = p.nivel;
      S.pe.plan = next;
      S.pe.open = { 0: true };
      rerender();
      toast('Plantilla cargada. Ajústala y publica.', 'ti-template');
      return;
    }
    if (act === 'pe-sec-add') { r.day.secciones.push({ titulo: '', nota: '', ejercicios: [newEx()] }); rerender(); return; }
    if (act === 'pe-sec-del') { if (!confirmTap(btn)) return; r.day.secciones.splice(+r.secEl.dataset.si, 1); rerender(); return; }
    if (act === 'pe-ex-add') {
      r.sec.ejercicios.push(newEx());
      rerender();
      const inputs = $$('[data-di="' + r.dayEl.dataset.di + '"] [data-si="' + r.secEl.dataset.si + '"] [data-ef="nombre"]', planEditor);
      if (inputs.length) inputs[inputs.length - 1].focus();
      return;
    }
    const ei = r.exEl ? +r.exEl.dataset.ei : -1;
    if (act === 'pe-ex-del') {
      r.sec.ejercicios.splice(ei, 1);
      if (!r.sec.ejercicios.length && r.day.secciones.length > 1) r.day.secciones.splice(+r.secEl.dataset.si, 1);
      else if (!r.sec.ejercicios.length) r.sec.ejercicios.push(newEx());
      rerender();
      return;
    }
    if (act === 'pe-ex-up' || act === 'pe-ex-down') {
      const j = act === 'pe-ex-up' ? ei - 1 : ei + 1;
      if (j < 0 || j >= r.sec.ejercicios.length) return;
      const tmp = r.sec.ejercicios[ei]; r.sec.ejercicios[ei] = r.sec.ejercicios[j]; r.sec.ejercicios[j] = tmp;
      rerender();
      return;
    }
    if (act === 'pe-ex-mode') { r.ex.modo = r.ex.modo === 'libre' ? 'carga' : 'libre'; rerender(); return; }
    if (act === 'pe-save') {
      const days = p.dias.filter((d) => dayExercises(d).some((e) => e.nombre.trim()));
      if (!days.length) { toast('Agrega al menos un día con ejercicios', 'ti-alert-triangle', true); return; }
      const payload = clone(p);
      const dropped = payload.dias.length - days.length;
      payload.dias = payload.dias.filter((d) => dayExercises(d).some((e) => e.nombre.trim()));
      payload.consejos = payload.consejos.map((c) => ({ titulo: c.titulo.trim(), items: (c.items || []).map((x) => x.trim()).filter(Boolean) })).filter((c) => c.titulo || c.items.length);
      btn.classList.add('publishing');
      btn.disabled = true;
      try {
        const id = S.pe.athleteId;
        const res = await api('PUT', 'plan?athleteId=' + id + '&date=' + today(), payload);
        if (S.pe.athleteId !== id) return;
        S.pe.plan = clone(res.plan);
        S.pe.exists = true;
        S.pe.dirty = false;
        const a = cAthlete(id);
        toast(dropped ? 'Plan publicado · se quitaron ' + plural(dropped, 'día vacío', 'días vacíos') : 'Plan publicado · ' + (a ? firstName(a.name) : 'tu cliente') + ' ya lo puede ver', 'ti-send');
        await loadCoachState().catch(() => {});
        renderPlanView();
      } catch (e) {
        toastErr(e);
        btn.classList.remove('publishing');
        btn.disabled = false;
      }
      return;
    }
    if (act === 'pe-delete') {
      if (!confirmTap(btn, '¿BORRAR EL PLAN? TOCA OTRA VEZ')) return;
      try {
        await api('DELETE', 'plan?athleteId=' + S.pe.athleteId);
        S.pe.plan = emptyPlan(); S.pe.exists = false; S.pe.dirty = false; S.pe.open = {};
        toast('Plan borrado');
        await loadCoachState().catch(() => {});
        renderPlanView();
      } catch (e) { toastErr(e); }
    }
  });

  // ---- progreso (cumplimiento semanal)
  $('#wk-prev').addEventListener('click', () => { if (S.wk > -11) { S.wk--; renderProgreso(); } });
  $('#wk-next').addEventListener('click', () => { if (S.wk < 0) { S.wk++; renderProgreso(); } });
  function renderProgreso() {
    const st = S.cstate;
    const start = addDays(weekStart(today()), S.wk * 7);
    const end = addDays(start, 6);
    $('#wk-label').textContent = (S.wk === 0 ? 'ESTA SEMANA · ' : '') + fmtDay(start) + ' – ' + fmtDay(end);
    $('#wk-prev').disabled = S.wk <= -11;
    $('#wk-next').disabled = S.wk >= 0;
    const el = $('#adherence');
    if (!st) { el.innerHTML = '<div class="loading-line">Cargando…</div>'; return; }
    const t = today();
    let html = '<div class="adh-head"><span>CLIENTE</span>' + DIAS_CORTOS.map((d) => '<span>' + d + '</span>').join('') + '<span></span></div>';
    html += st.roster.map((a) => {
      const mask = (st.coach.weekMasks[a.id] && st.coach.weekMasks[a.id][start]) || st.coach.masks[a.id];
      const plan = hasPlan(a.id);
      const hist = {};
      (st.coach.history[a.id] || []).forEach((h) => { hist[h.date] = h; });
      let trained = 0;
      const cells = DIAS_CORTOS.map((_, i) => {
        const iso = addDays(start, i);
        const h = hist[iso];
        const planned = plan && mask[i] === '1';
        let cls = 'c-off';
        if (h) { cls = h.total && h.done >= h.total ? 'c-full' : 'c-part'; trained++; }
        else if (planned) cls = iso < t ? 'c-miss' : 'c-plan';
        return '<span class="adh-cell ' + cls + '" title="' + DIAS[i] + '"></span>';
      }).join('');
      const goal = plan ? maskDays(mask) : 0;
      return '<div class="adh-row"><span class="adh-name">' + esc(a.name) + '</span>' + cells + '<span class="adh-count">' + trained + (goal ? '/' + goal : '') + '</span></div>';
    }).join('');
    if (!st.roster.length) html = '<div class="empty-sub" style="padding:0 20px;">Aún no hay clientes.</div>';
    html += '<div class="adh-legend"><span><i class="adh-cell c-full"></i>COMPLETO</span><span><i class="adh-cell c-part"></i>PARCIAL</span><span><i class="adh-cell c-miss"></i>FALTÓ</span><span><i class="adh-cell c-plan"></i>PROGRAMADO</span></div>';
    el.innerHTML = html;
    const streaks = st.alltime.filter((x) => x.streak > 0).sort((a, b) => b.streak - a.streak);
    const maxS = streaks.length ? streaks[0].streak : 1;
    $('#coach-streak-bars').innerHTML = streaks.length ? streaks.map((x) => barRow(cName(x.athleteId), String(x.streak), x.streak / maxS * 100, 'red-bar')).join('')
      : '<div class="empty-sub" style="text-align:left;">Nadie tiene racha activa todavía.</div>';
    const prs = st.mes.ranking;
    const maxP = prs.length ? prs[0].prs : 1;
    $('#coach-pr-bars').innerHTML = prs.length ? prs.map((x) => barRow(cName(x.athleteId), x.prs + (x.kgGain ? ' · +' + fmtNum(x.kgGain) + ' KG' : ''), x.prs / maxP * 100, 'green-bar')).join('')
      : '<div class="empty-sub" style="text-align:left;">Sin PRs este mes todavía.</div>';
    animateBars($('#coach-view-progreso'));
  }

  /* ================================================================ arranque */
  function boot() {
    if (S.role === 'coach' && S.token) enterCoach();
    else if (S.role === 'athlete' && S.token && S.me) enterApp();
    else if (S.role === 'athlete' && S.gate) showWho();
    else showOnly('splash');
  }
  boot();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
  }
})();
