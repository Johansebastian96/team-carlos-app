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
    closeModal();
    clearPhotoCache();
    if (!silent) releasePush(S.token);
    setSession({ role: null, token: null, gate: null, me: null });
    S.state = null; S.plan = undefined; S.rms = null; S.history = {}; S.drafts = {}; S.cstate = null;
    S.pe = { athleteId: '', plan: null, exists: false, dirty: false, open: {}, loading: false };
    S.ne = { athleteId: '', nutri: null, exists: false, dirty: false, loading: false, failed: '' };
    S.pagos = null; S.segBody = null; S.segBodyFor = null; S.segClient = ''; S.segCi = null; S.feedback = null; S.payOpen = null;
    S.retoEdit = false; S.retoDraft = null;
    S.nutri = undefined; S.body = undefined; S.checkins = undefined; S.pay = null; S.ciDraft = null; S.ciEdit = false;
    if (!silent) loginError.classList.remove('show');
    showOnly('splash');
  }
  logoutBtn.addEventListener('click', () => {
    if (S.role === 'coach' && (S.pe.dirty || S.ne.dirty) && !window.confirm('Tienes cambios sin guardar en un plan. ¿Salir de todos modos?')) return;
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
    S.nutri = undefined; S.nutriLog = null; S.nutriDraft = { meals: {}, vasos: 0 }; S.pay = null;
    S.body = undefined; S.checkins = undefined; S.ciDraft = null; S.ciEdit = false;
    $('#me-avatar').textContent = initials(S.me.name);
    switchView('home');
    await refreshAthlete();
  }
  async function refreshAthlete() {
    if (!S.me) return;
    const id = S.me.id;
    const results = await Promise.allSettled([loadState(), loadPlan(), loadHistory(), loadRms(), loadNutri(), loadPay()]);
    if (!sameMe(id)) return;
    if (S.state && S.state.me === null) { profileGone(); return; }
    if (S.plan === undefined) S.plan = null;
    if (S.nutri === undefined) S.nutri = null;
    if (!S.rms) S.rms = rmDefaultDoc();
    renderAthleteAll();
    const fail = results.find((r) => r.status === 'rejected' && r.reason && !r.reason.stale && r.reason.code !== 'NO_SESSION');
    if (fail) toastErr(fail.reason);
  }
  function renderAthleteAll() {
    renderHome();
    if (S.view === 'rms') renderRms();
    if (S.view === 'nutri') renderNutri();
    if (S.view === 'progreso') renderProgress();
    if (S.view === 'stats') renderPodio();
    if (S.view === 'timer') renderTimer();
    applyDeepLink();
  }

  let stateTimer = null;
  function scheduleStateRefresh() {
    clearTimeout(stateTimer);
    stateTimer = setTimeout(async () => {
      try {
        await loadState();
        if (S.state.me === null) return profileGone();
        renderStats();
        renderHomeAlerts();
        if (S.view === 'stats') renderPodio();
        if (S.view === 'progreso' && S.progTab === 'logros') renderProgress();
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
      if (S.role === 'athlete' && S.me && app.classList.contains('active') && S.view === 'stats') {
        await loadState();
        if (S.state.me === null) return profileGone();
        renderStats();
        renderPodio();
      } else if (S.role === 'coach' && coach.classList.contains('active') && (S.cview === 'dashboard' || (S.cview === 'seguimiento' && S.segTab === 'cumplimiento'))) {
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
    if (v === 'timer' && S.view !== 'timer') S.prevView = S.view;
    closeModal();
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
    if (v === 'nutri') renderNutri();
    if (v === 'progreso') renderProgress();
    if (v === 'stats') renderPodio();
    updateRestFloat();
    window.scrollTo(0, 0);
  }
  $('#me-avatar').addEventListener('click', () => {
    flushSaves();
    clearTimeout(stateTimer);
    closeModal();
    clearPhotoCache();
    releasePush(S.token);
    S.ciDraft = null; S.ciEdit = false;
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
    renderHomeAlerts();
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
          '<button type="button" data-act="unfinish">Deshacer</button></div>' +
          '<button type="button" class="btn-outline" data-act="share-session" style="margin-top:10px;"><i class="ti ti-brand-instagram" aria-hidden="true"></i> COMPARTIR MI ENTRENO</button>';
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

    const rec = exRecord(iso, e);
    const tools = [];
    if (e.video) tools.push('<a class="tool-link" href="' + esc(e.video) + '" target="_blank" rel="noopener noreferrer"><i class="ti ti-player-play" aria-hidden="true"></i>Ver técnica</a>');
    if (e.alt) hints.push('<div class="hint"><i class="ti ti-replace" aria-hidden="true"></i><span>¿MÁQUINA OCUPADA? ALTERNATIVA: ' + esc(e.alt) + '</span></div>');

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
    return '<div class="ex-body">' + (tools.length ? '<div class="ex-tools">' + tools.join('') + '</div>' : '') +
      (hints.length ? '<div class="ex-hints">' + hints.join('') + '</div>' : '') + rows +
      '<div class="ex-actions">' +
        '<button type="button" data-act="set-add"><i class="ti ti-plus" aria-hidden="true"></i>Serie</button>' +
        (sets.length > 1 ? '<button type="button" data-act="set-del"><i class="ti ti-minus" aria-hidden="true"></i>Serie</button>' : '') +
        (rest ? '<button type="button" class="rest-btn" data-act="rest"><i class="ti ti-clock-play" aria-hidden="true"></i>' + fmtClock(rest) + '</button>' : '') +
      '</div>' +
      '<div class="ex-note"><input type="text" data-note maxlength="200" value="' + esc((rec && rec.nota) || '') + '" placeholder="Nota para Carlos (ej: me molestó el hombro)" aria-label="Nota para el coach"></div>' +
      '</div>';
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
    if (act === 'share-session') { shareSession(iso); return; }
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
    if (input.hasAttribute('data-note')) {
      const item = input.closest('.ex-item');
      const e = item && findExercise(item.dataset.ex);
      if (!e || S.sel > today()) return;
      ensureEx(ensureDraft(S.sel), e).nota = input.value.slice(0, 200);
      scheduleSave(S.sel, 1200);
      return;
    }
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
    flushNutri();
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
    html += '<button type="button" class="btn-outline" id="plan-image-btn"><i class="ti ti-download" aria-hidden="true"></i> DESCARGAR MI PLAN (IMAGEN)</button>';
    html += pushCardHtml('athlete');
    html += '<div class="motto">DISCIPLINA <b>+</b> CONSTANCIA <b>=</b> RESULTADOS</div>';
    el.innerHTML = html;
    refreshPushCards();
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
        (h[h.length - 1].isPR ? '<button type="button" class="btn-outline" data-act="rm-share" style="margin-bottom:10px;"><i class="ti ti-brand-instagram" aria-hidden="true"></i> COMPARTIR MI PR</button>' : '') +
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
    if (act === 'rm-share') { sharePr(meta); return; }
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
    if (!st) { if (S.podioTab === 'equipo') renderEquipo(); else panel.innerHTML = '<div class="loading-line">Cargando…</div>'; return; }
    if (S.podioTab === 'hoy') panel.innerHTML = podioHoy(st);
    if (S.podioTab === 'semana') panel.innerHTML = podioSemana(st);
    if (S.podioTab === 'mes') panel.innerHTML = podioMes(st);
    if (S.podioTab === 'alltime') panel.innerHTML = podioAll(st);
    if (S.podioTab === 'reto') panel.innerHTML = podioReto(st);
    if (S.podioTab === 'equipo') renderEquipo();
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
      ['DÍA DE NUTRICIÓN COMPLETO', '+5', ''],
      ['CHECK-IN SEMANAL', '+20', ''],
      ['CUMPLIR EL RETO DEL MES', '+100', 'pv-accent'],
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

  /* ================================================================ utilidades v3 */
  const money = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CO');
  const inDays = (n) => (n === 0 ? 'HOY' : n === 1 ? 'MAÑANA' : n === -1 ? 'AYER' : n > 0 ? 'EN ' + n + ' DÍAS' : 'HACE ' + (-n) + ' DÍAS');
  const inflight = {};
  function loadOnce(k, fn) {
    if (!inflight[k]) inflight[k] = fn().finally(() => { delete inflight[k]; });
    return inflight[k];
  }
  const quietErr = (e) => !e || e.stale || ['NO_SESSION', 'PROFILE_GONE', 'PIN_CHANGED'].indexOf(e.code) !== -1;

  // Para fotos y archivos (la API normal solo maneja JSON)
  async function apiBlob(method, path, blob, type) {
    let res;
    try {
      res = await fetch('/api/' + path, {
        method,
        headers: Object.assign(type ? { 'content-type': type } : {}, S.token ? { authorization: 'Bearer ' + S.token } : {}),
        body: blob || undefined,
        cache: 'no-store',
      });
    } catch (e) {
      const err = new Error('Sin conexión. Revisa tu internet.');
      err.offline = true;
      throw err;
    }
    if (!res.ok) {
      let data = {};
      try { data = await res.json(); } catch (e) { /* sin cuerpo */ }
      const err = new Error(data.message || ('Error ' + res.status));
      err.status = res.status; err.code = data.error;
      throw err;
    }
    return res;
  }

  // ---- ventana emergente
  const modal = $('#modal');
  let modalOpts = null;
  function openModal(title, html, opts) {
    if (modalOpts && modalOpts.cleanup) { try { modalOpts.cleanup(); } catch (e) { /* nada */ } }
    modalOpts = opts || {};
    $('#modal-title').textContent = title;
    $('#modal-body').innerHTML = html;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    if (modal.classList.contains('hidden')) return;
    modal.classList.add('hidden');
    $('#modal-body').innerHTML = '';
    document.body.style.overflow = '';
    if (modalOpts && modalOpts.cleanup) { try { modalOpts.cleanup(); } catch (e) { /* nada */ } }
    modalOpts = null;
  }
  $('#modal-close').addEventListener('click', closeModal);
  modal.addEventListener('click', (ev) => {
    if (ev.target === modal) { closeModal(); return; }
    if (modalOpts && modalOpts.onClick) modalOpts.onClick(ev);
  });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeModal(); });

  // ---- enlaces directos (?v=checkin, ?v=pagos…) desde las notificaciones
  let deepLink = null;
  try { deepLink = new URLSearchParams(location.search).get('v'); } catch (e) { /* nada */ }
  function applyDeepLink() {
    if (!deepLink) return;
    const v = deepLink;
    const ok = S.role === 'athlete' ? ['checkin', 'nutri', 'progreso', 'reto'].indexOf(v) !== -1 : ['pagos', 'seguimiento'].indexOf(v) !== -1;
    if (!ok) return;
    deepLink = null;
    try { history.replaceState(null, '', location.pathname); } catch (e) { /* nada */ }
    if (S.role === 'athlete') goTo(v);
    else if (v === 'pagos') switchCoachView('pagos');
    else { S.segTab = 'checkins'; switchCoachView('seguimiento'); }
  }

  /* ================================================================ HOY: avisos */
  $('#open-timer').addEventListener('click', () => switchView('timer'));
  $('#timer-back').addEventListener('click', () => switchView(S.prevView && S.prevView !== 'timer' ? S.prevView : 'home'));

  function goTo(where) {
    if (where === 'checkin') { S.progTab = 'checkin'; switchView('progreso'); }
    else if (where === 'reto') { S.podioTab = 'reto'; switchView('stats'); }
    else switchView(where);
  }
  function renderHomeAlerts() {
    const el = $('#home-alerts');
    if (!el || !S.me) return;
    const st = S.state;
    const t = today();
    const items = [];
    if (S.pay && S.pay.proximoPago) {
      const d = daysBetween(t, S.pay.proximoPago);
      if (d < 0) items.push({ cls: 'danger', icon: 'ti-alert-circle', title: 'Tu mensualidad está vencida', sub: 'VENCIÓ EL ' + fmtDay(S.pay.proximoPago) + ' · HABLA CON CARLOS' });
      else if (d <= 3) items.push({ cls: 'warn', icon: 'ti-calendar-dollar', title: 'Tu mensualidad vence ' + inDays(d).toLowerCase(), sub: (S.pay.plan || 'MENSUALIDAD') + ' · ' + fmtDay(S.pay.proximoPago) });
    }
    if (st && st.me && !st.me.checkinThisWeek && dowOf(t) >= 4) {
      items.push({ icon: 'ti-clipboard-check', title: 'Haz tu check-in semanal', sub: 'CUÉNTALE A CARLOS CÓMO VAS · +20 PTS', go: 'checkin' });
    }
    if (S.nutri) {
      const n = nutriProgress();
      items.push({ icon: n.complete ? 'ti-circle-check' : 'ti-salad', title: n.complete ? 'Nutrición de hoy completa' : 'Tu nutrición de hoy',
        sub: n.done + '/' + n.total + ' COMIDAS' + (n.meta ? ' · ' + n.vasos + '/' + n.meta + ' VASOS DE AGUA' : '') + (n.complete ? ' · +5 PTS' : ''), go: 'nutri', pct: n.pct });
    }
    if (st && st.reto) {
      const mine = st.reto.progreso.find((p) => p.athleteId === S.me.id);
      const v = mine ? mine.value : 0;
      items.push({ icon: 'ti-target', title: 'Reto: ' + (st.reto.titulo || 'Reto del mes'), sub: (mine && mine.done ? '¡CUMPLIDO! · ' : '') + v + '/' + st.reto.meta + ' ' + String(st.reto.unidad || '').toUpperCase(), go: 'reto', pct: Math.min(100, v / st.reto.meta * 100) });
    }
    el.innerHTML = items.map((x) => {
      const open = x.go ? '<button type="button" data-go="' + x.go + '"' : '<div';
      return open + ' class="alert-card' + (x.cls ? ' ' + x.cls : '') + '"><i class="ti ' + x.icon + '" aria-hidden="true"></i><div class="alert-main"><div class="alert-title">' + esc(x.title) + '</div><div class="alert-sub">' + esc(x.sub) + '</div>' +
        (x.pct != null ? '<div class="mini-progress"><span style="width:' + Math.round(x.pct) + '%"></span></div>' : '') + '</div>' +
        (x.go ? '<i class="ti ti-chevron-right" aria-hidden="true"></i></button>' : '</div>');
    }).join('');
  }
  $('#home-alerts').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-go]');
    if (b) goTo(b.dataset.go);
  });

  /* ================================================================ NUTRICIÓN (cliente) */
  async function loadNutri() {
    const id = S.me.id;
    const t = today();
    const [a, b] = await Promise.all([api('GET', 'nutri?athleteId=' + id), api('GET', 'nutrilog?athleteId=' + id + '&date=' + t)]);
    if (!sameMe(id)) throw stale();
    S.nutri = a.nutri || null;
    S.nutriLog = b.log || null;
    // si este mismo cliente tiene un guardado pendiente, se conserva lo que acaba de marcar
    const busy = (pendingNutri || nutriInFlight || nutriNext) && nutriFor === id && S.nutriDraft && S.nutriDraft.date === t;
    if (!busy) S.nutriDraft = { date: t, meals: Object.assign({}, (b.log && b.log.meals) || {}), vasos: (b.log && b.log.vasos) || 0 };
  }
  async function loadPay() {
    const id = S.me.id;
    const r = await api('GET', 'pay?athleteId=' + id);
    if (!sameMe(id)) throw stale();
    S.pay = r.pago || null;
  }
  const vasosMetaOf = (n) => Math.round(((n && n.agua) || 0) * 4);
  function ensureNutriDraft() {
    const t = today();
    if (!S.nutriDraft || S.nutriDraft.date !== t) S.nutriDraft = { date: t, meals: {}, vasos: 0 };
    return S.nutriDraft;
  }
  function nutriProgress() {
    const n = S.nutri;
    const d = ensureNutriDraft();
    const ids = n ? n.comidas.map((c) => c.id) : [];
    const done = ids.filter((id) => d.meals[id]).length;
    const total = ids.length;
    const meta = vasosMetaOf(n);
    const vasos = d.vasos || 0;
    const complete = total > 0 && done >= total && vasos >= meta;
    const pct = total ? Math.round((done + (meta ? Math.min(1, vasos / meta) : 0)) / (total + (meta ? 1 : 0)) * 100) : 0;
    return { done, total, meta, vasos, complete, pct };
  }
  const mktKey = () => 'mkt_' + (S.me ? S.me.id : '');
  function mercadoChecks() { try { return JSON.parse(store.get(mktKey()) || '{}') || {}; } catch (e) { return {}; } }
  function saveMercado(o) { store.set(mktKey(), Object.keys(o).length ? JSON.stringify(o) : null); }

  function renderNutri() {
    const el = $('#nutri-content');
    if (!S.me) return;
    if (S.nutri === undefined) { el.innerHTML = '<div class="loading-line">Cargando tu plan de comidas…</div>'; return; }
    if (!S.nutri) {
      el.innerHTML = emptyCard('ti-salad', 'Tu plan de alimentación está en camino',
        'Carlos te va a armar tu plan de comidas con tus macros. Mientras tanto: proteína en cada comida, verduras y 2–3 litros de agua al día.');
      return;
    }
    const n = S.nutri;
    const d = ensureNutriDraft();
    const pr = nutriProgress();
    let html = '<div class="nutri-head"><div class="dh-eyebrow">PLAN DE ALIMENTACIÓN · COACH CARLOS</div><div class="dh-title">' + esc(n.objetivo || 'MI PLAN') + '</div>' +
      '<div class="dh-sub">' + esc(fmtLong(today())) + '</div>' +
      '<div class="dh-progress"><div class="dh-progress-top"><span>' + (pr.complete ? '¡DÍA COMPLETO! +5 PTS' : 'TU DÍA') + '</span><span><b>' + pr.done + '</b>/' + pr.total + ' COMIDAS</span></div>' +
      '<div class="progress-track"><div class="progress-fill" style="width:' + pr.pct + '%"></div></div></div></div>';
    const macros = [['kcal', n.kcal, 'KCAL', ''], ['p', n.proteina, 'PROTEÍNA', 'g'], ['c', n.carbos, 'CARBOS', 'g'], ['g', n.grasas, 'GRASAS', 'g']].filter((m) => m[1] > 0);
    if (macros.length) {
      html += '<div class="macro-grid" style="grid-template-columns:repeat(' + macros.length + ',minmax(0,1fr));">' + macros.map((m) =>
        '<div class="macro' + (m[0] === 'kcal' ? ' kcal' : '') + '"><div class="v">' + m[1].toLocaleString('es-CO') + '<span class="u">' + m[3] + '</span></div><div class="l">' + m[2] + '</div></div>').join('') + '</div>';
    }
    const glasses = Math.min(40, Math.max(pr.meta, pr.vasos, 4));
    html += '<div class="water"><div class="water-top"><div class="water-title"><i class="ti ti-droplet" aria-hidden="true"></i>AGUA</div>' +
      '<div class="water-count">' + pr.vasos + (pr.meta ? '/' + pr.meta : '') + ' VASOS · ' + String(pr.vasos * 0.25).replace('.', ',') + (n.agua ? ' DE ' + fmtNum(n.agua) : '') + ' L</div></div>' +
      '<div class="glasses">' + Array.from({ length: glasses }, (_, i) => '<button type="button" class="glass' + (i < pr.vasos ? ' full' : '') + '" data-glass="' + i + '" aria-label="Vaso ' + (i + 1) + '"></button>').join('') + '</div>' +
      '<div class="water-btns"><button type="button" class="btn-ghost btn-sm" data-water="-1">− VASO</button><button type="button" class="btn-accent btn-sm" data-water="1">+ VASO (250 ML)</button></div></div>';
    html += '<div class="section-title-podio">COMIDAS DE HOY</div>';
    html += n.comidas.map((c) => {
      const done = !!d.meals[c.id];
      return '<div class="meal' + (done ? ' done' : '') + '"><div class="meal-head"><div class="meal-name">' + esc(c.nombre || 'Comida') + '</div>' + (c.hora ? '<div class="meal-hora">' + esc(c.hora) + '</div>' : '') + '</div>' +
        (c.items.length ? '<ul class="meal-items">' + c.items.map((i) => '<li>' + esc(i.texto) + (i.alt ? '<span class="alt">o ' + esc(i.alt) + '</span>' : '') + '</li>').join('') + '</ul>' : '') +
        (c.nota ? '<div class="meal-note">' + esc(c.nota) + '</div>' : '') +
        '<button type="button" class="meal-check" data-meal="' + esc(c.id) + '" aria-pressed="' + done + '"><i class="ti ' + (done ? 'ti-circle-check' : 'ti-circle') + '" aria-hidden="true"></i>' + (done ? 'HECHA' : 'MARCAR COMO HECHA') + '</button></div>';
    }).join('');
    if (n.suplementos && n.suplementos.length) {
      html += '<div class="tip-card"><div class="tip-card-title"><i class="ti ti-pill" aria-hidden="true"></i>SUPLEMENTOS</div><ul>' + n.suplementos.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></div>';
    }
    if (n.notas) html += '<div class="tip-card"><div class="tip-card-title"><i class="ti ti-bulb" aria-hidden="true"></i>NOTAS DE CARLOS</div><div class="ci-text" style="white-space:pre-line;margin:0;">' + esc(n.notas) + '</div></div>';
    if (n.mercado && n.mercado.length) {
      const got = mercadoChecks();
      const left = n.mercado.filter((x) => !got[nameKey(x)]).length;
      html += '<div class="tip-card collapse' + (S.mktOpen ? ' open' : '') + '" id="mkt"><button type="button" class="collapse-head" data-act="mkt-toggle" aria-expanded="' + !!S.mktOpen + '">' +
        '<span><i class="ti ti-shopping-cart" aria-hidden="true" style="color:var(--accent);margin-right:8px;"></i>LISTA DE MERCADO · ' + (left ? left + ' PENDIENTES' : 'TODO LISTO') + '</span><i class="ti ti-chevron-down" aria-hidden="true"></i></button>' +
        '<div class="collapse-body"><ul class="check-list">' + n.mercado.map((x) => '<li class="' + (got[nameKey(x)] ? 'on' : '') + '"><button type="button" data-mkt="' + esc(x) + '"><span class="check-box"><i class="ti ti-check" aria-hidden="true"></i></span>' + esc(x) + '</button></li>').join('') + '</ul>' +
        '<button type="button" class="link-btn" data-act="mkt-clear" style="margin-top:8px;">Desmarcar todo</button></div></div>';
    }
    el.innerHTML = html;
  }
  $('#nutri-content').addEventListener('click', (ev) => {
    const t = ev.target;
    if (!S.nutri || !S.me) return;
    const mk = t.closest('[data-mkt]');
    const act = t.closest('[data-act]');
    if (mk) {
      const got = mercadoChecks();
      const k = nameKey(mk.dataset.mkt);
      if (got[k]) delete got[k]; else got[k] = 1;
      saveMercado(got);
      renderNutri();
      return;
    }
    if (act && act.dataset.act === 'mkt-toggle') { S.mktOpen = !S.mktOpen; renderNutri(); return; }
    if (act && act.dataset.act === 'mkt-clear') { saveMercado({}); renderNutri(); return; }
    const meal = t.closest('[data-meal]');
    const glass = t.closest('[data-glass]');
    const water = t.closest('[data-water]');
    if (!meal && !glass && !water) return;
    const before = nutriProgress().complete;
    const d = ensureNutriDraft();
    if (meal) { const id = meal.dataset.meal; if (d.meals[id]) delete d.meals[id]; else d.meals[id] = true; }
    else if (glass) { const i = +glass.dataset.glass; d.vasos = d.vasos === i + 1 ? i : i + 1; }
    else d.vasos = Math.max(0, Math.min(40, (d.vasos || 0) + +water.dataset.water));
    if (!before && nutriProgress().complete) toast('¡Nutrición del día completa! +5 puntos', 'ti-salad');
    renderNutri();
    renderHomeAlerts();
    scheduleNutriSave();
  });
  let nutriSaveTimer = null;
  let pendingNutri = null;
  let nutriInFlight = false;
  let nutriNext = null;
  let nutriFor = null;
  function scheduleNutriSave() {
    if (!S.me || !S.token) return;
    nutriFor = S.me.id;
    pendingNutri = { me: S.me, token: S.token, date: S.nutriDraft.date, body: clone({ meals: S.nutriDraft.meals, vasos: S.nutriDraft.vasos }) };
    clearTimeout(nutriSaveTimer);
    nutriSaveTimer = setTimeout(flushNutri, 700);
  }
  function flushNutri() {
    clearTimeout(nutriSaveTimer);
    nutriSaveTimer = null;
    const snap = pendingNutri;
    pendingNutri = null;
    if (snap) saveNutriLog(snap);
  }
  async function saveNutriLog(snap) {
    if (nutriInFlight) { nutriNext = snap; return; }
    nutriInFlight = true;
    try {
      const r = await api('PUT', 'nutrilog?athleteId=' + snap.me.id + '&date=' + snap.date, snap.body, { token: snap.token });
      if (sameMe(snap.me.id)) { S.nutriLog = r.log; scheduleStateRefresh(); }
    } catch (e) {
      if (sameMe(snap.me.id) && !quietErr(e)) {
        if (e.code === 'NO_NUTRI') { S.nutri = null; renderNutri(); }
        else toast(e.offline ? 'Sin conexión: tu nutrición no se guardó' : e.message, 'ti-alert-triangle', true);
      }
    } finally {
      nutriInFlight = false;
      if (nutriNext) { const n = nutriNext; nutriNext = null; saveNutriLog(n); }
    }
  }

  /* ================================================================ PROGRESO (cliente) */
  S.progTab = 'cuerpo';
  S.cmpAngle = 'frente';
  $('#prog-tabs').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-prog]');
    if (!b) return;
    S.progTab = b.dataset.prog;
    renderProgress();
  });
  async function loadBody() {
    const id = S.me.id;
    const r = await api('GET', 'body?athleteId=' + id);
    if (!sameMe(id)) throw stale();
    S.body = r.body;
  }
  async function loadCheckins() {
    const id = S.me.id;
    const r = await api('GET', 'checkins?athleteId=' + id);
    if (!sameMe(id)) throw stale();
    S.checkins = r.checkins.sort((a, b) => (a.week < b.week ? 1 : -1));
  }
  function renderProgress() {
    const tab = S.progTab || 'cuerpo';
    $$('#prog-tabs .tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.prog === tab));
    $$('#view-progreso .tab-panel').forEach((p) => { const on = p.id === 'prog-panel-' + tab; p.classList.toggle('active', on); p.classList.toggle('on', on); });
    if (!S.me) return;
    const failed = (el) => (e) => { if (!quietErr(e)) el.innerHTML = emptyCard('ti-wifi-off', 'No se pudo cargar', e.message); };
    if (tab === 'cuerpo') {
      const el = $('#prog-panel-cuerpo');
      if (S.body === undefined) {
        el.innerHTML = '<div class="loading-line">Cargando…</div>';
        loadOnce('body', loadBody).then(() => { if (S.view === 'progreso' && S.progTab === 'cuerpo') renderProgress(); }, failed(el));
        return;
      }
      renderBodyPanel(el, bodyCtxClient());
    }
    if (tab === 'checkin') renderCheckinPanel();
    if (tab === 'logros') renderLogrosPanel();
  }

  // ---- cuerpo: medidas, gráfica y fotos (se usa también en el panel del coach)
  const MEDIDAS = [['peso', 'PESO', 'KG'], ['cintura', 'CINTURA', 'CM'], ['cadera', 'CADERA', 'CM'], ['pecho', 'PECHO', 'CM'], ['brazo', 'BRAZO', 'CM'], ['pierna', 'PIERNA', 'CM'], ['grasa', '% GRASA', '%']];
  const ANGLES = [['frente', 'FRENTE'], ['perfil', 'PERFIL'], ['espalda', 'ESPALDA']];
  const angleLabel = (a) => (ANGLES.find((x) => x[0] === a) || ['', 'FOTO'])[1];
  function bodyCtxClient() {
    return {
      athleteId: S.me && S.me.id, doc: S.body, mine: true,
      alive: (id) => sameMe(id),
      set(doc) { S.body = doc; },
      render() { if (S.view === 'progreso' && S.progTab === 'cuerpo') renderProgress(); },
    };
  }
  function bodyEntries(doc) { return ((doc && doc.entries) || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1)); }
  function bodyPanelHtml(ctx) {
    const doc = ctx.doc || { entries: [], fotos: [] };
    const entries = bodyEntries(doc);
    const lastOf = (k) => { for (let i = entries.length - 1; i >= 0; i--) if (entries[i][k] != null) return entries[i]; return null; };
    const firstOf = (k) => entries.find((e) => e[k] != null) || null;
    const tile = (k, label, unit) => {
      const l = lastOf(k), f = firstOf(k);
      if (!l) return '<div class="stat-tile"><div class="l">' + label + '</div><div class="v">—</div><div class="d">SIN DATOS</div></div>';
      const diff = f && f !== l ? Math.round((l[k] - f[k]) * 10) / 10 : null;
      return '<div class="stat-tile"><div class="l">' + label + '</div><div class="v">' + fmtNum(l[k]) + '<small>' + unit + '</small></div>' +
        '<div class="d">' + (diff == null ? fmtDay(l.date) : (diff > 0 ? '+' : '') + fmtNum(diff) + ' DESDE ' + fmtDay(f.date)) + '</div></div>';
    };
    let html = '<div class="stat-tiles">' + tile('peso', 'PESO', 'KG') + tile('cintura', 'CINTURA', 'CM') + tile('grasa', '% GRASA', '%') + '</div>';
    const pts = entries.filter((e) => e.peso != null).map((e) => ({ date: e.date, v: e.peso }));
    if (pts.length >= 2) html += lineChartHtml('chart-peso-' + (ctx.mine ? 'me' : 'coach'), 'PESO (KG)', pts, 'KG');
    else html += '<div class="fair-note" style="margin-bottom:12px;">Registra tu peso al menos dos veces para ver tu gráfica de progreso. Lo ideal: una vez por semana, en ayunas.</div>';

    // formulario
    const t = today();
    const cur = entries.find((e) => e.date === t) || {};
    html += '<form class="editor-card measure-form" data-form="body" autocomplete="off"><div class="editor-card-title">REGISTRAR MEDIDAS</div>' +
      '<div class="form-row"><div><label class="form-label">FECHA</label><input class="form-input" type="date" name="date" value="' + t + '" max="' + t + '" required></div>' +
      '<div><label class="form-label">PESO (KG)</label><input class="form-input" name="peso" inputmode="decimal" value="' + (cur.peso != null ? fmtNum(cur.peso) : '') + '" placeholder="—"></div></div>';
    for (let i = 1; i < MEDIDAS.length; i += 2) {
      html += '<div class="form-row">' + [MEDIDAS[i], MEDIDAS[i + 1]].filter(Boolean).map((m) =>
        '<div><label class="form-label">' + m[1] + (m[2] === 'CM' ? ' (CM)' : '') + '</label><input class="form-input" name="' + m[0] + '" inputmode="decimal" value="' + (cur[m[0]] != null ? fmtNum(cur[m[0]]) : '') + '" placeholder="—"></div>').join('') + '</div>';
    }
    html += '<div class="form-field-group"><input class="form-input" name="nota" maxlength="120" value="' + esc(cur.nota || '') + '" placeholder="Nota (opcional): ej. después de vacaciones"></div>' +
      '<button type="submit" class="btn-accent btn-full">GUARDAR MEDIDAS</button></form>';

    // fotos
    const fotos = ((doc.fotos) || []).slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.ts - b.ts));
    html += '<div class="section-title-podio">FOTOS DE PROGRESO</div>' +
      '<div class="fair-note" style="margin:-4px 0 10px;">' + (ctx.mine ? 'Privadas: solo tú y Carlos las ven.' : 'Privadas: solo el cliente y tú las ven.') + ' Misma luz, misma pose y misma hora cada vez.</div>' +
      '<div class="photo-angles">' + ANGLES.map((a) => '<button type="button" data-photo-add="' + a[0] + '"><i class="ti ti-camera-plus" aria-hidden="true"></i>' + a[1] + '</button>').join('') + '</div>';
    const angle = S.cmpAngle || 'frente';
    const ofAngle = fotos.filter((f) => f.angle === angle);
    const withPairs = ANGLES.filter((a) => fotos.filter((f) => f.angle === a[0]).length >= 2);
    if (withPairs.length) {
      const showAngle = ofAngle.length >= 2 ? angle : withPairs[0][0];
      const list = fotos.filter((f) => f.angle === showAngle);
      const a0 = list[0], a1 = list[list.length - 1];
      html += '<div class="section-title-podio">ANTES Y AHORA</div>';
      if (withPairs.length > 1) html += '<div class="mini-filter-row">' + withPairs.map((a) => '<button type="button" class="mini-filter-btn' + (a[0] === showAngle ? ' active' : '') + '" data-cmp-angle="' + a[0] + '">' + a[1] + '</button>').join('') + '</div>';
      html += '<div class="compare"><figure><img data-photo="' + a0.id + '" alt="Antes, ' + fmtDay(a0.date) + '"><figcaption>ANTES · ' + fmtDay(a0.date) + '</figcaption></figure>' +
        '<figure><img data-photo="' + a1.id + '" alt="Ahora, ' + fmtDay(a1.date) + '"><figcaption>AHORA · ' + fmtDay(a1.date) + '</figcaption></figure></div>';
    }
    if (fotos.length) {
      html += '<div class="photo-grid">' + fotos.slice().reverse().map((f) => '<button type="button" class="photo-cell" data-photo-open="' + f.id + '" aria-label="Ver foto ' + angleLabel(f.angle).toLowerCase() + ' del ' + fmtDay(f.date) + '"><img data-photo="' + f.id + '" alt=""><span>' + angleLabel(f.angle) + ' · ' + fmtDay(f.date) + '</span></button>').join('') + '</div>';
    } else {
      html += '<div class="empty-sub" style="text-align:left;">Todavía no hay fotos. Tómate la primera hoy: en 8 semanas vas a agradecerlo.</div>';
    }

    // historial (también es la vista en tabla de la gráfica)
    if (entries.length) {
      const cols = MEDIDAS.filter((m) => entries.some((e) => e[m[0]] != null));
      html += '<div class="section-title-podio">HISTORIAL DE MEDIDAS</div><div class="hist-wrap"><table class="hist-table"><thead><tr><th>FECHA</th>' + cols.map((m) => '<th>' + m[1] + '</th>').join('') + '<th></th></tr></thead><tbody>' +
        entries.slice().reverse().map((e) => '<tr><td>' + fmtDay(e.date) + '</td>' + cols.map((m) => '<td' + (e[m[0]] == null ? ' class="muted"' : '') + '>' + (e[m[0]] != null ? fmtNum(e[m[0]]) : '—') + '</td>').join('') +
          '<td><button type="button" class="icon-btn" data-body-del="' + e.date + '" aria-label="Borrar medidas del ' + fmtDay(e.date) + '"><i class="ti ti-trash" aria-hidden="true"></i></button></td></tr>').join('') +
        '</tbody></table></div>';
    }
    return html;
  }
  function renderBodyPanel(el, ctx) {
    el.innerHTML = bodyPanelHtml(ctx);
    bindChart(el);
    loadPhotos(el, ctx.athleteId);
  }

  // ---- gráfica de línea (una serie): línea de 2 px, área suave, punto final con su valor y lectura al tocar
  const chartData = {};
  function lineChartHtml(id, title, pts, unit) {
    const W = 340, H = 168, L = 30, R = 50, T = 14, B = 24;
    const t0 = isoDate(pts[0].date).getTime(), t1 = isoDate(pts[pts.length - 1].date).getTime();
    let lo = Math.min.apply(null, pts.map((p) => p.v)), hi = Math.max.apply(null, pts.map((p) => p.v));
    const pad = Math.max(0.5, (hi - lo) * 0.15);
    lo -= pad; hi += pad;
    const step = niceStep((hi - lo) / 3);
    lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
    const x = (d) => L + (t1 === t0 ? (W - L - R) / 2 : (isoDate(d).getTime() - t0) / (t1 - t0) * (W - L - R));
    const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    const xy = pts.map((p) => ({ x: x(p.date), y: y(p.v), date: p.date, v: p.v }));
    chartData[id] = { xy, unit };
    let grid = '';
    for (let v = lo; v <= hi + 1e-9; v += step) {
      const yy = y(v).toFixed(1);
      grid += '<line x1="' + L + '" x2="' + (W - R + 8) + '" y1="' + yy + '" y2="' + yy + '" style="stroke:var(--border);stroke-width:0.5"/>' +
        '<text x="' + (L - 6) + '" y="' + (+yy + 3) + '" text-anchor="end">' + fmtNum(v) + '</text>';
    }
    const line = xy.map((p, i) => (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' ');
    const base = (H - B).toFixed(1);
    const area = line + ' L' + xy[xy.length - 1].x.toFixed(1) + ' ' + base + ' L' + xy[0].x.toFixed(1) + ' ' + base + ' Z';
    const end = xy[xy.length - 1];
    const svg = '<svg class="chart-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(title) + ': de ' + fmtNum(pts[0].v) + ' a ' + fmtNum(end.v) + ' ' + unit + '">' + grid +
      '<path d="' + area + '" style="fill:var(--accent);fill-opacity:0.1;stroke:none"/>' +
      '<path d="' + line + '" style="fill:none;stroke:var(--accent);stroke-width:2;stroke-linejoin:round;stroke-linecap:round"/>' +
      '<circle cx="' + end.x.toFixed(1) + '" cy="' + end.y.toFixed(1) + '" r="4.5" style="fill:var(--accent);stroke:var(--bg1);stroke-width:2"/>' +
      '<text class="end-label" x="' + (end.x + 9).toFixed(1) + '" y="' + (end.y + 4).toFixed(1) + '">' + fmtNum(end.v) + '</text>' +
      '<text x="' + L + '" y="' + (H - 6) + '">' + fmtDay(pts[0].date) + '</text>' +
      '<text x="' + (W - R) + '" y="' + (H - 6) + '" text-anchor="end">' + fmtDay(end.date) + '</text>' +
      '<g class="cross" style="display:none"><line y1="' + T + '" y2="' + (H - B) + '" style="stroke:var(--w4);stroke-width:1;stroke-dasharray:2 3"/><circle r="4.5" style="fill:var(--accent);stroke:var(--bg1);stroke-width:2"/></g>' +
      '<rect class="hit" x="0" y="0" width="' + W + '" height="' + H + '" style="fill:transparent"/></svg>';
    return '<div class="chart-card" data-chart="' + id + '"><div class="chart-title">' + esc(title) + '</div><div class="chart-sub">' + plural(pts.length, 'REGISTRO', 'REGISTROS') + ' · TOCA LA GRÁFICA PARA VER CADA FECHA</div>' + svg + '<div class="chart-tip"></div></div>';
  }
  function niceStep(raw) {
    const p = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-6))));
    const n = raw / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  function bindChart(scope) {
    $$('[data-chart]', scope).forEach((card) => {
      const data = chartData[card.dataset.chart];
      const svg = $('svg', card);
      if (!data || !svg) return;
      const cross = $('.cross', svg), tip = $('.chart-tip', card);
      const show = (ev) => {
        const r = svg.getBoundingClientRect();
        const vx = (ev.clientX - r.left) / r.width * 340;
        let best = data.xy[0];
        data.xy.forEach((p) => { if (Math.abs(p.x - vx) < Math.abs(best.x - vx)) best = p; });
        cross.style.display = '';
        $('line', cross).setAttribute('x1', best.x); $('line', cross).setAttribute('x2', best.x);
        $('circle', cross).setAttribute('cx', best.x); $('circle', cross).setAttribute('cy', best.y);
        tip.innerHTML = '<b>' + fmtNum(best.v) + ' ' + data.unit + '</b><span>' + fmtDay(best.date) + '</span>';
        tip.style.display = 'block';
        const cr = card.getBoundingClientRect();
        tip.style.left = Math.min(cr.width - 50, Math.max(50, r.left - cr.left + best.x / 340 * r.width)) + 'px';
        const ty = r.top - cr.top + best.y / 168 * r.height;
        const below = ty < 70;
        tip.style.transform = below ? 'translate(-50%, 14px)' : 'translate(-50%, -100%)';
        tip.style.top = (below ? ty : ty - 10) + 'px';
      };
      const hide = () => { cross.style.display = 'none'; tip.style.display = 'none'; };
      svg.addEventListener('pointermove', show);
      svg.addEventListener('pointerdown', show);
      svg.addEventListener('pointerleave', hide);
    });
  }

  // ---- fotos privadas: se descargan con la sesión y se muestran como blob
  const photoCache = new Map();
  function clearPhotoCache() { photoCache.forEach((p) => p.then((u) => { if (u) URL.revokeObjectURL(u); })); photoCache.clear(); }
  function photoUrl(athleteId, id) {
    const k = athleteId + '/' + id;
    if (!photoCache.has(k)) {
      photoCache.set(k, apiBlob('GET', 'photo?athleteId=' + athleteId + '&id=' + id).then((r) => r.blob()).then((b) => URL.createObjectURL(b)).catch(() => { photoCache.delete(k); return null; }));
    }
    return photoCache.get(k);
  }
  function loadPhotos(scope, athleteId) {
    $$('img[data-photo]', scope).forEach((img) => {
      photoUrl(athleteId, img.dataset.photo).then((u) => { if (u && img.isConnected) img.src = u; });
    });
  }
  async function resizeImage(file, max) {
    let src = null;
    try { src = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { src = null; }
    if (!src) {
      src = await new Promise((res, rej) => {
        const img = new Image();
        const u = URL.createObjectURL(file);
        img.onload = () => { URL.revokeObjectURL(u); res(img); };
        img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('No se pudo leer la foto. Prueba con otra.')); };
        img.src = u;
      });
    }
    const w0 = src.width, h0 = src.height;
    const k = Math.min(1, max / Math.max(w0, h0));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w0 * k)); c.height = Math.max(1, Math.round(h0 * k));
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
    let q = 0.82, blob = null;
    for (let i = 0; i < 4; i++) {
      blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', q));
      if (blob && blob.size <= 880000) break;
      q -= 0.14;
    }
    if (!blob || blob.size > 900000) throw new Error('La foto es muy pesada. Prueba con otra.');
    return blob;
  }
  let photoTarget = null;
  let photoBusy = false;
  $('#photo-input').addEventListener('change', async (ev) => {
    const f = ev.target.files && ev.target.files[0];
    ev.target.value = '';
    const tgt = photoTarget;
    photoTarget = null;
    if (!f || !tgt || photoBusy) return;
    photoBusy = true;
    try {
      toast('Subiendo foto…', 'ti-upload');
      const blob = await resizeImage(f, 1080);
      const res = await apiBlob('PUT', 'photo?athleteId=' + tgt.athleteId + '&date=' + today() + '&angle=' + tgt.angle, blob, 'image/jpeg');
      const r = await res.json();
      tgt.done(r.body);
      toast('Foto guardada · ' + angleLabel(tgt.angle).toLowerCase(), 'ti-photo-check');
    } catch (e) { if (!quietErr(e)) toastErr(e); } finally { photoBusy = false; }
  });

  // Un solo manejador por panel; ctxFn devuelve el contexto actual (cliente o el elegido por el coach).
  function bindBodyPanel(panel, ctxFn) {
    panel.addEventListener('click', async (ev) => {
      const ctx = ctxFn();
      if (!ctx.athleteId) return;
      const id = ctx.athleteId;
      const add = ev.target.closest('[data-photo-add]');
      if (add) {
        if (photoBusy) { toast('Espera a que termine de subir la foto anterior', 'ti-hourglass'); return; }
        photoTarget = { athleteId: id, angle: add.dataset.photoAdd, done: (doc) => { if (ctxFn().athleteId === id && ctx.alive(id)) { ctxFn().set(doc); S.cmpAngle = add.dataset.photoAdd; ctxFn().render(); } } };
        $('#photo-input').click();
        return;
      }
      const cmp = ev.target.closest('[data-cmp-angle]');
      if (cmp) { S.cmpAngle = cmp.dataset.cmpAngle; ctx.render(); return; }
      const open = ev.target.closest('[data-photo-open]');
      if (open) {
        const f = ((ctx.doc && ctx.doc.fotos) || []).find((x) => x.id === open.dataset.photoOpen);
        if (!f) return;
        openModal(angleLabel(f.angle) + ' · ' + fmtShort(f.date), '<img class="photo-full" data-photo="' + f.id + '" alt="Foto de progreso">' +
          '<button type="button" class="delete-btn" data-photo-del="' + f.id + '" style="margin-top:12px;">BORRAR FOTO</button>', {
          onClick: async (e2) => {
            const del = e2.target.closest('[data-photo-del]');
            if (!del || !confirmTap(del, '¿BORRAR? TOCA OTRA VEZ')) return;
            del.disabled = true;
            try {
              const r = await api('DELETE', 'photo?athleteId=' + id + '&id=' + f.id);
              closeModal();
              if (ctxFn().athleteId === id && ctx.alive(id)) { ctxFn().set(r.body); ctxFn().render(); }
              toast('Foto borrada');
            } catch (err) { del.disabled = false; if (!quietErr(err)) toastErr(err); }
          },
        });
        loadPhotos($('#modal-body'), id);
        return;
      }
      const del = ev.target.closest('[data-body-del]');
      if (del) {
        if (!confirmTap(del)) { toast('Toca otra vez para borrar esas medidas', 'ti-info-circle'); return; }
        try {
          const r = await api('DELETE', 'body?athleteId=' + id + '&date=' + del.dataset.bodyDel);
          if (ctxFn().athleteId === id && ctx.alive(id)) { ctxFn().set(r.body); ctxFn().render(); }
          toast('Medidas borradas');
        } catch (err) { if (!quietErr(err)) toastErr(err); }
      }
    });
    panel.addEventListener('change', (ev) => {
      const input = ev.target;
      if (input.name !== 'date' || !input.form || input.form.dataset.form !== 'body') return;
      const e = bodyEntries(ctxFn().doc).find((x) => x.date === input.value) || {};
      MEDIDAS.forEach((m) => { input.form.elements[m[0]].value = e[m[0]] != null ? fmtNum(e[m[0]]) : ''; });
      input.form.elements.nota.value = e.nota || '';
    });
    panel.addEventListener('submit', async (ev) => {
      const form = ev.target;
      if (form.dataset.form !== 'body') return;
      ev.preventDefault();
      const ctx = ctxFn();
      const id = ctx.athleteId;
      if (!id) return;
      const entry = { date: form.elements.date.value, nota: form.elements.nota.value.trim() };
      let any = false;
      MEDIDAS.forEach((m) => { const v = parseNum(form.elements[m[0]].value); if (v != null) { entry[m[0]] = v; any = true; } });
      if (!any) { toast('Escribe al menos una medida', 'ti-alert-triangle', true); return; }
      const btn = $('button[type="submit"]', form);
      btn.disabled = true;
      try {
        const r = await api('PUT', 'body?athleteId=' + id, { entry });
        if (ctxFn().athleteId === id && ctx.alive(id)) { ctxFn().set(r.body); ctxFn().render(); }
        toast('Medidas guardadas', 'ti-ruler-measure');
      } catch (err) {
        btn.disabled = false;
        if (!quietErr(err)) toastErr(err);
      }
    });
  }
  bindBodyPanel($('#prog-panel-cuerpo'), bodyCtxClient);

  // ---- check-in semanal
  const CI_SCALES = [
    ['sueno', 'SUEÑO', '1 = MUY MAL · 5 = EXCELENTE', 'SUEÑO'],
    ['energia', 'ENERGÍA', '1 = SIN ENERGÍA · 5 = A TOPE', 'ENERGÍA'],
    ['estres', 'ESTRÉS', '1 = TRANQUILO · 5 = MUY ESTRESADO', 'ESTRÉS'],
    ['hambre', 'HAMBRE', '1 = POCA · 5 = MUCHA', 'HAMBRE'],
    ['nutricion', 'CUMPLÍ MI ALIMENTACIÓN', '1 = NADA · 5 = AL 100%', 'ALIMENTACIÓN'],
  ];
  const ciLow = (k, v) => !!v && (k === 'estres' ? v >= 4 : k === 'hambre' ? false : v <= 2);
  function ciCardHtml(c, opts) {
    opts = opts || {};
    const pills = CI_SCALES.filter((s) => c[s[0]]).map((s) => '<span class="ci-pill' + (ciLow(s[0], c[s[0]]) ? ' low' : '') + '">' + s[3] + ' ' + c[s[0]] + '/5</span>').join('') +
      (c.peso ? '<span class="ci-pill">PESO ' + fmtNum(c.peso) + ' KG</span>' : '');
    return '<div class="ci-card" data-ci-athlete="' + esc(c.athleteId) + '"><div class="ci-top"><div class="ci-week">' + esc(opts.title || 'SEMANA DEL ' + fmtDay(c.week)) + '</div><div class="rate-hint">' + agoTs(c.ts) + '</div></div>' +
      '<div class="ci-pills">' + pills + '</div>' +
      (c.molestias ? '<div class="ci-text"><b>MOLESTIAS</b>' + esc(c.molestias) + '</div>' : '') +
      (c.comentario ? '<div class="ci-text"><b>COMENTARIO</b>' + esc(c.comentario) + '</div>' : '') +
      (c.respuesta ? '<div class="ci-reply"><div class="who">RESPUESTA DE CARLOS · ' + agoTs(c.respuesta.ts) + '</div><div class="txt">' + esc(c.respuesta.texto) + '</div></div>' : '') +
      (opts.reply ? '<form class="inline-form" data-form="ci-reply" style="margin-top:10px;"><textarea class="form-textarea" name="texto" maxlength="600" placeholder="Respóndele (ej: buen trabajo, esta semana sube 2,5 kg en sentadilla)" style="min-height:70px;">' + esc(c.respuesta ? c.respuesta.texto : '') + '</textarea>' +
        '<button type="submit" class="btn-accent">' + (c.respuesta ? 'ACTUALIZAR' : 'RESPONDER') + '</button></form>' : '') +
      '</div>';
  }
  function renderCheckinPanel() {
    const el = $('#prog-panel-checkin');
    if (S.checkins === undefined) {
      el.innerHTML = '<div class="loading-line">Cargando…</div>';
      loadOnce('ci', loadCheckins).then(() => { if (S.view === 'progreso' && S.progTab === 'checkin') renderProgress(); },
        (e) => { if (!quietErr(e)) el.innerHTML = emptyCard('ti-wifi-off', 'No se pudo cargar', e.message); });
      return;
    }
    const wk = weekStart(today());
    const cur = S.checkins.find((c) => c.week === wk);
    let html = '';
    if (cur && !S.ciEdit) {
      html += '<div class="focus-card f-green" style="margin-bottom:14px;"><div class="focus-label">✓ CHECK-IN DE ESTA SEMANA ENVIADO</div>' +
        '<div class="focus-text">' + (cur.respuesta ? 'Carlos ya te respondió. Míralo abajo.' : 'Carlos lo va a revisar y te responde aquí mismo.') + '</div>' +
        '<div class="btn-row" style="margin-top:10px;"><button type="button" class="btn-ghost" data-act="ci-edit">EDITAR</button></div></div>';
    } else {
      if (!S.ciDraft) {
        S.ciDraft = cur ? { sueno: cur.sueno, energia: cur.energia, estres: cur.estres, hambre: cur.hambre, nutricion: cur.nutricion, peso: cur.peso != null ? fmtNum(cur.peso) : '', molestias: cur.molestias || '', comentario: cur.comentario || '' }
          : { sueno: 0, energia: 0, estres: 0, hambre: 0, nutricion: 0, peso: '', molestias: '', comentario: '' };
      }
      const d = S.ciDraft;
      html += '<form class="editor-card" data-form="checkin" autocomplete="off"><div class="editor-card-title">CHECK-IN · SEMANA DEL ' + fmtDay(wk) + '</div>' +
        '<div class="fair-note" style="margin:-4px 0 14px;">Toma 1 minuto y le ayuda a Carlos a ajustar tu plan.</div>' +
        CI_SCALES.map((s) => '<div class="rate-row" data-rate="' + s[0] + '"><div class="rate-top"><span class="rate-label">' + s[1] + '</span><span class="rate-hint">' + s[2] + '</span></div>' +
          '<div class="rate" role="group" aria-label="' + s[1] + '">' + [1, 2, 3, 4, 5].map((v) => '<button type="button" data-v="' + v + '" class="' + (d[s[0]] === v ? 'on' : '') + '" aria-pressed="' + (d[s[0]] === v) + '">' + v + '</button>').join('') + '</div></div>').join('') +
        '<div class="form-field-group"><label class="form-label">PESO DE ESTA SEMANA (KG · OPCIONAL)</label><input class="form-input" name="peso" inputmode="decimal" value="' + esc(d.peso) + '" placeholder="En ayunas"></div>' +
        '<div class="form-field-group"><label class="form-label">¿MOLESTIAS O DOLORES?</label><textarea class="form-textarea" name="molestias" maxlength="300" placeholder="Ej: rodilla derecha en la sentadilla">' + esc(d.molestias) + '</textarea></div>' +
        '<div class="form-field-group"><label class="form-label">¿CÓMO TE FUE ESTA SEMANA?</label><textarea class="form-textarea" name="comentario" maxlength="500" placeholder="Lo bueno, lo difícil y tus dudas para Carlos">' + esc(d.comentario) + '</textarea></div>' +
        '<div class="form-error" id="ci-error"></div>' +
        '<button type="submit" class="publish-btn"><i class="ti ti-send" aria-hidden="true"></i><span>' + (cur ? 'GUARDAR CAMBIOS' : 'ENVIAR CHECK-IN · +20 PTS') + '</span></button>' +
        (cur ? '<button type="button" class="link-btn" data-act="ci-cancel" style="margin-top:10px;">Cancelar</button>' : '') + '</form>';
    }
    html += '<div class="section-title-podio">MIS CHECK-INS</div>';
    html += S.checkins.length ? S.checkins.map((c) => ciCardHtml(c)).join('') : '<div class="empty-sub" style="text-align:left;">Aún no has hecho check-ins. El primero suma +20 puntos.</div>';
    el.innerHTML = html;
  }
  const ciPanel = $('#prog-panel-checkin');
  ciPanel.addEventListener('click', (ev) => {
    const act = ev.target.closest('[data-act]');
    if (act && act.dataset.act === 'ci-edit') { S.ciEdit = true; S.ciDraft = null; renderCheckinPanel(); return; }
    if (act && act.dataset.act === 'ci-cancel') { S.ciEdit = false; S.ciDraft = null; renderCheckinPanel(); return; }
    const b = ev.target.closest('[data-rate] button');
    if (!b || !S.ciDraft) return;
    const row = b.closest('[data-rate]');
    S.ciDraft[row.dataset.rate] = +b.dataset.v;
    $$('button', row).forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
  });
  ciPanel.addEventListener('input', (ev) => {
    const t = ev.target;
    if (S.ciDraft && t.name && Object.prototype.hasOwnProperty.call(S.ciDraft, t.name)) S.ciDraft[t.name] = t.value;
  });
  ciPanel.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (ev.target.dataset.form !== 'checkin' || !S.ciDraft || !S.me) return;
    const d = S.ciDraft;
    const err = $('#ci-error');
    const missing = CI_SCALES.filter((s) => !d[s[0]]);
    if (missing.length) { err.textContent = 'Califica: ' + missing.map((s) => s[3].toLowerCase()).join(', '); return; }
    const peso = parseNum(d.peso);
    if (d.peso && (peso == null || peso < 20 || peso > 400)) { err.textContent = 'Revisa el peso'; return; }
    err.textContent = '';
    const btn = $('button[type="submit"]', ev.target);
    btn.disabled = true;
    const id = S.me.id;
    const first = !(S.checkins || []).some((c) => c.week === weekStart(today()));
    try {
      const r = await api('PUT', 'checkin?athleteId=' + id + '&date=' + today(), {
        sueno: d.sueno, energia: d.energia, estres: d.estres, hambre: d.hambre, nutricion: d.nutricion, peso, molestias: d.molestias.trim(), comentario: d.comentario.trim(),
      });
      if (!sameMe(id)) return;
      S.checkins = [r.checkin].concat((S.checkins || []).filter((c) => c.week !== r.checkin.week));
      S.ciEdit = false; S.ciDraft = null;
      toast(first ? '¡Check-in enviado! +20 puntos' : 'Check-in actualizado', 'ti-clipboard-check');
      scheduleStateRefresh();
      renderCheckinPanel();
      if (peso != null) {
        // el peso del check-in también queda en tus medidas de hoy
        try {
          if (S.body === undefined) await loadBody();
          const ex = bodyEntries(S.body).find((e) => e.date === today()) || {};
          const rb = await api('PUT', 'body?athleteId=' + id, { entry: Object.assign({}, ex, { date: today(), peso }) });
          if (sameMe(id)) S.body = rb.body;
        } catch (e2) { /* opcional */ }
      }
    } catch (e) {
      btn.disabled = false;
      if (!quietErr(e)) err.textContent = e.message;
    }
  });

  // ---- logros
  function renderLogrosPanel() {
    const el = $('#prog-panel-logros');
    const me = S.state && S.state.me;
    if (!me) { el.innerHTML = '<div class="loading-line">Cargando…</div>'; return; }
    const earned = me.badgeList.filter((b) => b.earned).length;
    const tile = (l, v, d) => '<div class="stat-tile"><div class="l">' + l + '</div><div class="v">' + v + '</div><div class="d">' + d + '</div></div>';
    let html = '<div class="stat-tiles">' + tile('PUNTOS', me.points.toLocaleString('es-CO'), me.rankAll ? '#' + me.rankAll + ' DEL TEAM' : '') +
      tile('MEJOR RACHA', me.bestStreak, 'ACTUAL ' + me.streak) + tile('LOGROS', earned + '<small>/' + me.badgeList.length + '</small>', earned ? 'SIGUE ASÍ' : 'EL PRIMERO ESTÁ CERCA') + '</div>';
    html += '<div class="badge-grid">' + me.badgeList.map((b) => '<div class="badge' + (b.earned ? ' earned' : '') + '"><i class="ti ' + b.icon + '" aria-hidden="true"></i><div class="t">' + esc(b.titulo) + '</div>' +
      '<div class="p">' + (b.earned ? '✓ GANADO' : Math.min(b.value, b.target) + '/' + b.target) + '</div></div>').join('') + '</div>';
    html += '<button type="button" class="btn-outline" data-act="share-logros" style="margin-top:14px;"><i class="ti ti-brand-instagram" aria-hidden="true"></i> COMPARTIR MIS LOGROS</button>';
    const rows = [['ENTRENOS', me.days], ['SESIONES COMPLETAS', me.complete], ['SEMANAS PERFECTAS', me.weeks], ['PRs', me.prs], ['DÍAS DE NUTRICIÓN AL 100%', me.nutriDays], ['CHECK-INS', me.checkins], ['RETOS CUMPLIDOS', me.retos]];
    html += '<div class="points-card" style="margin-top:14px;"><div class="section-title-podio" style="margin-top:0;">MI TEMPORADA</div>' +
      rows.map((r) => '<div class="points-row"><span class="points-label">' + r[0] + '</span><span class="points-value">' + (r[1] || 0) + '</span></div>').join('') + '</div>';
    el.innerHTML = html;
  }
  $('#prog-panel-logros').addEventListener('click', (ev) => {
    if (ev.target.closest('[data-act="share-logros"]')) shareLogros();
  });

  /* ================================================================ TEAM: reto del mes */
  function podioReto(st) {
    const r = st.reto;
    const mes = MESES[isoDate(today()).getUTCMonth()];
    if (!r) return emptyCard('ti-target', 'Este mes no hay reto todavía', 'Cuando Carlos lance el reto de ' + mes.toLowerCase() + ', aquí verás la meta, el premio y cómo vas.');
    const last = addDays(addDays(today().slice(0, 7) + '-01', 32).slice(0, 7) + '-01', -1);
    const left = daysBetween(today(), last);
    const mine = S.me ? r.progreso.find((p) => p.athleteId === S.me.id) : null;
    const done = r.progreso.filter((p) => p.done).length;
    let html = '<div class="reto-card"><div class="reto-eyebrow">RETO DE ' + mes + '</div><div class="reto-title">' + esc(r.titulo || 'Reto del mes') + '</div>' +
      (r.descripcion ? '<div class="reto-desc">' + esc(r.descripcion) + '</div>' : '') +
      '<div class="reto-meta"><span class="ci-pill">META: ' + r.meta + ' ' + esc(String(r.unidad).toUpperCase()) + '</span>' + (r.premio ? '<span class="ci-pill">PREMIO: ' + esc(r.premio.toUpperCase()) + '</span>' : '') +
      '<span class="ci-pill">+100 PTS</span><span class="ci-pill">' + (left > 0 ? 'QUEDAN ' + plural(left, 'DÍA', 'DÍAS') : 'ÚLTIMO DÍA') + '</span></div>';
    if (mine) {
      const pct = Math.min(100, mine.value / r.meta * 100);
      html += '<div class="reto-me"><div class="reto-me-top"><span>' + (mine.done ? '¡RETO CUMPLIDO! +100 PTS' : 'TU PROGRESO') + '</span><span>' + mine.value + '/' + r.meta + '</span></div>' +
        '<div class="progress-track"><div class="progress-fill" style="width:' + Math.round(pct) + '%"></div></div></div>';
    }
    html += '</div>';
    html += '<div class="section-title-podio">' + (done ? plural(done, 'YA LO CUMPLIÓ', 'YA LO CUMPLIERON') : 'NADIE LO HA CUMPLIDO TODAVÍA') + '</div>';
    html += r.progreso.map((p) => {
      const a = athleteById(p.athleteId);
      if (!a) return '';
      return barRow(shortName(a.name) + (S.me && a.id === S.me.id ? ' (TÚ)' : ''), p.value + '/' + r.meta + (p.done ? ' ✓' : ''), p.value / r.meta * 100, p.done ? 'gold-bar' : 'green-bar');
    }).join('');
    return html;
  }

  /* ================================================================ imágenes para compartir */
  const CC = { bg: '#050505', panel: '#0E0E0E', line: '#232323', accent: '#39FF14', white: '#FFFFFF', w2: 'rgba(255,255,255,0.8)', w3: 'rgba(255,255,255,0.55)', w4: 'rgba(255,255,255,0.35)' };
  const FD = 'Montserrat, Arial, sans-serif';
  const FB = 'Poppins, Arial, sans-serif';
  const font = (w, px, body) => w + ' ' + px + 'px ' + (body ? FB : FD);
  let logoP = null;
  function loadLogo() {
    if (!logoP) logoP = new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = './assets/logo-mark.png'; });
    return logoP;
  }
  async function canvasFonts() {
    try { await Promise.all(['900 60px Montserrat', '800 30px Montserrat', '700 26px Montserrat', '500 26px Poppins', '600 26px Poppins'].map((f) => document.fonts.load(f))); } catch (e) { /* usa la fuente del sistema */ }
  }
  function wrapLines(ctx, text, maxW, maxLines) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    words.forEach((w) => {
      const tt = line ? line + ' ' + w : w;
      if (line && ctx.measureText(tt).width > maxW) { lines.push(line); line = w; } else line = tt;
    });
    if (line) lines.push(line);
    if (maxLines && lines.length > maxLines) {
      const keep = lines.slice(0, maxLines);
      let l = keep[maxLines - 1];
      while (l.length > 1 && ctx.measureText(l + '…').width > maxW) l = l.slice(0, -1);
      keep[maxLines - 1] = l + '…';
      return keep;
    }
    return lines;
  }
  function fitFont(ctx, text, maxW, weight, start, min) {
    let px = start;
    ctx.font = font(weight, px);
    while (px > min && ctx.measureText(text).width > maxW) { px -= 2; ctx.font = font(weight, px); }
    return px;
  }
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function mottoLine(ctx, cx, y, px) {
    const parts = ['DISCIPLINA ', '+', ' CONSTANCIA ', '=', ' RESULTADOS'];
    ctx.font = font(900, px);
    const total = parts.reduce((s, p) => s + ctx.measureText(p).width, 0);
    let x = cx - total / 2;
    ctx.textAlign = 'left';
    parts.forEach((p, i) => { ctx.fillStyle = i % 2 ? CC.accent : CC.white; ctx.fillText(p, x, y); x += ctx.measureText(p).width; });
  }
  async function storyCanvas(draw) {
    await canvasFonts();
    const logo = await loadLogo();
    const c = document.createElement('canvas');
    c.width = 1080; c.height = 1920;
    const ctx = c.getContext('2d');
    ctx.fillStyle = CC.bg; ctx.fillRect(0, 0, 1080, 1920);
    const g = ctx.createRadialGradient(1000, 80, 0, 1000, 80, 1100);
    g.addColorStop(0, 'rgba(57,255,20,0.24)'); g.addColorStop(1, 'rgba(57,255,20,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1920);
    const g2 = ctx.createRadialGradient(60, 1900, 0, 60, 1900, 900);
    g2.addColorStop(0, 'rgba(57,255,20,0.10)'); g2.addColorStop(1, 'rgba(57,255,20,0)');
    ctx.fillStyle = g2; ctx.fillRect(0, 0, 1080, 1920);
    if (logo) { const h = 92, w = logo.width * h / logo.height; ctx.drawImage(logo, 90, 150, w, h); }
    ctx.textAlign = 'right';
    ctx.fillStyle = CC.white; ctx.font = font(900, 32); ctx.fillText('TEAM CARLOS', 990, 192);
    ctx.fillStyle = CC.accent; ctx.font = font(800, 20); ctx.fillText('ENTRENAMIENTO PERSONALIZADO', 990, 228);
    ctx.textAlign = 'left';
    draw(ctx);
    ctx.fillStyle = CC.line; ctx.fillRect(90, 1700, 900, 2);
    mottoLine(ctx, 540, 1790, 36);
    ctx.font = font(800, 22); ctx.fillStyle = CC.w4; ctx.textAlign = 'center';
    ctx.fillText('#TEAMCARLOS', 540, 1842);
    ctx.textAlign = 'left';
    return c;
  }
  function eyebrow(ctx, text, y) {
    ctx.fillStyle = CC.accent; ctx.fillRect(90, y - 24, 56, 6);
    ctx.font = font(800, 30); ctx.fillStyle = CC.accent; ctx.fillText(text, 166, y - 10);
  }
  function bigTitle(ctx, text, y, maxLines) {
    ctx.fillStyle = CC.white;
    const t = String(text || '').toUpperCase();
    let px = 120;
    let lines;
    do { ctx.font = font(900, px); lines = wrapLines(ctx, t, 900); px -= 6; } while (lines.length > (maxLines || 3) && px > 60);
    ctx.font = font(900, px + 6);
    lines.slice(0, maxLines || 3).forEach((l, i) => ctx.fillText(l, 90, y + i * (px + 10)));
    return y + Math.min(lines.length, maxLines || 3) * (px + 10);
  }
  function statBlocks(ctx, y, items, h) {
    h = h || 210;
    const n = items.length, gap = 22, w = (900 - gap * (n - 1)) / n;
    items.forEach((it, i) => {
      const x = 90 + i * (w + gap);
      rrect(ctx, x, y, w, h, 24);
      ctx.fillStyle = it[2] ? 'rgba(57,255,20,0.12)' : CC.panel; ctx.fill();
      ctx.strokeStyle = it[2] ? 'rgba(57,255,20,0.5)' : CC.line; ctx.lineWidth = 2; ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillStyle = it[2] ? CC.accent : CC.white;
      fitFont(ctx, String(it[0]), w - 36, 900, 84, 34);
      ctx.fillText(String(it[0]), x + w / 2, y + h * 0.56);
      ctx.font = font(800, 22); ctx.fillStyle = CC.w3;
      ctx.fillText(it[1], x + w / 2, y + h * 0.82);
      ctx.textAlign = 'left';
    });
    return y + h;
  }
  function presentCanvas(canvas, filename, text, title) {
    canvas.toBlob((blob) => {
      if (!blob) { toast('No se pudo crear la imagen', 'ti-alert-triangle', true); return; }
      const url = URL.createObjectURL(blob);
      let file = null;
      try { file = new File([blob], filename, { type: 'image/png' }); } catch (e) { file = null; }
      let canShare = false;
      try { canShare = !!(file && navigator.canShare && navigator.canShare({ files: [file] })); } catch (e) { canShare = false; }
      openModal(title || 'COMPARTIR', '<img class="share-preview" src="' + url + '" alt="Vista previa de la imagen">' +
        '<div class="row-actions">' + (canShare ? '<button type="button" class="btn-accent" data-share-go><i class="ti ti-share" aria-hidden="true"></i>COMPARTIR</button>' : '') +
        '<a class="btn-ghost" href="' + url + '" download="' + esc(filename) + '"><i class="ti ti-download" aria-hidden="true"></i>DESCARGAR</a></div>' +
        '<div class="fair-note" style="margin-top:10px;">' + (canShare ? 'Súbela a tu historia de Instagram o mándala por WhatsApp.' : 'Descárgala y súbela a tu historia de Instagram.') + '</div>', {
        cleanup: () => URL.revokeObjectURL(url),
        onClick: (ev) => { if (ev.target.closest('[data-share-go]')) navigator.share({ files: [file], text }).catch(() => {}); },
      });
    }, 'image/png');
  }

  async function shareSession(iso) {
    const day = planDayFor(iso);
    const sess = sessionFor(iso);
    if (!day || !sess || !S.me) return;
    const exs = dayExercises(day);
    const doneN = exs.filter((e) => exDone(sess.ex && sess.ex[e.id])).length;
    const sets = okSets(sess);
    const unit = unitOf().toUpperCase();
    let vol = 0;
    const best = [];
    exs.forEach((e) => {
      const rec = sess.ex && sess.ex[e.id];
      if (!rec || !rec.sets) return;
      const ok = rec.sets.filter((s) => s.ok);
      ok.forEach((s) => { if (s.w > 0 && s.r > 0) vol += s.w * s.r; });
      const top = ok.filter((s) => s.w > 0).sort((a, b) => b.w - a.w)[0];
      if (top) best.push(e.nombre + ' · ' + fmtNum(top.w) + ' ' + unit + (top.r ? ' × ' + top.r : ''));
    });
    const me = S.state && S.state.me;
    const hoy = S.state && iso === today() ? S.state.hoy.find((h) => h.athleteId === S.me.id) : null;
    const complete = exs.length && doneN >= exs.length;
    const pts = hoy ? hoy.points : 10 + (complete ? 15 : 0);
    const c = await storyCanvas((ctx) => {
      eyebrow(ctx, complete ? 'SESIÓN COMPLETA' : 'ENTRENAMIENTO HECHO', 470);
      let y = bigTitle(ctx, day.titulo || DIAS[dowOf(iso)], 590, 3);
      ctx.font = font(800, 30); ctx.fillStyle = CC.w3; ctx.fillText(fmtLong(iso), 90, y + 6);
      ctx.font = font(900, 40); ctx.fillStyle = CC.white; ctx.fillText(S.me.name.toUpperCase(), 90, y + 66);
      y = Math.max(y + 130, 900);
      y = statBlocks(ctx, y, [[doneN + '/' + exs.length, 'EJERCICIOS'], [sets, 'SERIES'], [vol ? Math.round(vol).toLocaleString('es-CO') : '—', 'VOLUMEN ' + unit]]);
      y = statBlocks(ctx, y + 22, [[me ? me.streak : '—', 'DÍAS DE RACHA'], ['+' + pts, 'PUNTOS', true]], 190);
      if (best.length) {
        y += 70;
        ctx.font = font(800, 22); ctx.fillStyle = CC.accent; ctx.fillText('MEJORES SERIES', 90, y);
        ctx.font = font(500, 28, true); ctx.fillStyle = CC.w2;
        best.slice(0, Math.max(0, Math.floor((1660 - y) / 46))).forEach((b, i) => {
          const l = wrapLines(ctx, b, 900, 1)[0];
          ctx.fillText(l, 90, y + 50 + i * 46);
        });
      }
    });
    presentCanvas(c, 'team-carlos-entreno-' + iso + '.png', 'Entrenamiento hecho con Team Carlos 💪', 'COMPARTIR MI ENTRENO');
  }

  async function sharePr(meta) {
    const h = rmHist(meta.name);
    const last = h[h.length - 1];
    if (!last || !S.me) return;
    const prevMax = h.length > 1 ? Math.max.apply(null, h.slice(0, -1).map((x) => x.value)) : null;
    const u = unitLabel(meta.unit);
    const c = await storyCanvas((ctx) => {
      eyebrow(ctx, 'NUEVO RÉCORD PERSONAL', 470);
      let y = bigTitle(ctx, meta.name, 590, 2);
      ctx.textAlign = 'center';
      const val = fmtNum(last.value);
      fitFont(ctx, val, 760, 900, 360, 140);
      ctx.fillStyle = CC.accent;
      ctx.fillText(val, 540, Math.max(y + 330, 1010));
      ctx.font = font(900, 64); ctx.fillStyle = CC.white;
      ctx.fillText(u, 540, Math.max(y + 420, 1100));
      if (prevMax != null && last.value > prevMax) {
        const pct = prevMax > 0 ? Math.round((last.value - prevMax) / prevMax * 100) : 0;
        ctx.font = font(800, 40); ctx.fillStyle = CC.w2;
        ctx.fillText('+' + fmtNum(last.value - prevMax) + ' ' + u + (pct ? ' · +' + pct + '%' : '') + ' VS. TU MÁXIMO ANTERIOR', 540, Math.max(y + 510, 1190));
      }
      ctx.font = font(900, 44); ctx.fillStyle = CC.white;
      ctx.fillText(S.me.name.toUpperCase(), 540, 1480);
      ctx.font = font(800, 28); ctx.fillStyle = CC.w3;
      ctx.fillText(fmtLong(last.date), 540, 1530);
      ctx.textAlign = 'left';
    });
    presentCanvas(c, 'team-carlos-pr.png', '¡Nuevo PR con Team Carlos! 🏆', 'COMPARTIR MI PR');
  }

  async function shareLogros() {
    const me = S.state && S.state.me;
    if (!me || !S.me) return;
    const earned = me.badgeList.filter((b) => b.earned);
    const c = await storyCanvas((ctx) => {
      eyebrow(ctx, 'MI TEMPORADA', 470);
      let y = bigTitle(ctx, S.me.name, 590, 2);
      y = Math.max(y + 40, 820);
      y = statBlocks(ctx, y, [[me.points.toLocaleString('es-CO'), 'PUNTOS', true], [me.rankAll ? '#' + me.rankAll : '—', 'EN EL TEAM']]);
      y = statBlocks(ctx, y + 22, [[me.days, 'ENTRENOS'], [me.bestStreak, 'MEJOR RACHA'], [me.prs, 'PRs']], 190);
      y += 80;
      ctx.font = font(800, 24); ctx.fillStyle = CC.accent;
      ctx.fillText('LOGROS · ' + earned.length + ' DE ' + me.badgeList.length, 90, y);
      y += 30;
      let x = 90;
      ctx.font = font(800, 24);
      earned.slice(0, 12).forEach((b) => {
        const t = b.titulo.toUpperCase();
        const w = ctx.measureText(t).width + 44;
        if (x + w > 990) { x = 90; y += 70; }
        if (y > 1600) return;
        rrect(ctx, x, y, w, 54, 27); ctx.fillStyle = 'rgba(57,255,20,0.12)'; ctx.fill();
        ctx.strokeStyle = 'rgba(57,255,20,0.45)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = CC.white; ctx.fillText(t, x + 22, y + 36);
        x += w + 14;
      });
      if (!earned.length) { ctx.font = font(500, 28, true); ctx.fillStyle = CC.w3; ctx.fillText('El primer logro está a un entreno de distancia.', 90, y + 40); }
    });
    presentCanvas(c, 'team-carlos-logros.png', 'Mi temporada en Team Carlos 💪', 'COMPARTIR MIS LOGROS');
  }

  // ---- imagen del plan semanal (como el que entrega Carlos)
  async function planCanvas(plan, name) {
    await canvasFonts();
    const logo = await loadLogo();
    const days = plan.dias.slice().sort((a, b) => a.dow - b.dow);
    const n = Math.max(1, days.length);
    const W = n <= 2 ? 1400 : n <= 4 ? 2000 : n <= 5 ? 2400 : 2800;
    const M = 70, gap = 26;
    const colW = (W - 2 * M - gap * (n - 1)) / n;
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    // medir (pasada 1) y dibujar (pasada 2)
    const column = (d, x, y0, draw) => {
      let y = y0;
      const pad = 26, inner = colW - pad * 2;
      y += 34;
      if (draw) { ctx.font = font(800, 22); ctx.fillStyle = CC.accent; ctx.fillText(DIAS[d.dow], x + pad, y); }
      y += 14;
      ctx.font = font(900, 34);
      const tl = wrapLines(ctx, String(d.titulo || DIAS[d.dow]).toUpperCase(), inner, 3);
      tl.forEach((l) => { y += 40; if (draw) { ctx.fillStyle = CC.white; ctx.fillText(l, x + pad, y); } });
      const chips = [d.subtitulo, d.duracion, d.rpe ? 'RPE ' + d.rpe : ''].filter(Boolean).join(' · ').toUpperCase();
      if (chips) {
        ctx.font = font(800, 18);
        wrapLines(ctx, chips, inner, 2).forEach((l) => { y += 26; if (draw) { ctx.fillStyle = CC.w3; ctx.fillText(l, x + pad, y); } });
      }
      y += 18;
      if (draw) { ctx.fillStyle = CC.line; ctx.fillRect(x + pad, y, inner, 2); }
      y += 8;
      (d.secciones || []).forEach((s) => {
        if (s.titulo) {
          y += 34;
          if (draw) { ctx.font = font(800, 18); ctx.fillStyle = CC.accent; ctx.fillText((s.titulo + (s.nota ? ' · ' + s.nota : '')).toUpperCase(), x + pad, y); }
        }
        (s.ejercicios || []).forEach((e, i) => {
          y += 12;
          ctx.font = font(600, 22, true);
          const nl = wrapLines(ctx, (i + 1) + '. ' + e.nombre, inner, 2);
          nl.forEach((l) => { y += 30; if (draw) { ctx.fillStyle = CC.white; ctx.fillText(l, x + pad, y); } });
          const presc = [e.series && e.reps ? e.series + ' × ' + e.reps : e.reps || '', e.descanso ? 'DESC. ' + e.descanso : ''].filter(Boolean).join('  ·  ').toUpperCase();
          if (presc) { y += 28; if (draw) { ctx.font = font(800, 18); ctx.fillStyle = CC.w3; ctx.fillText(presc, x + pad, y); } }
        });
      });
      return y + 30 - y0;
    };
    const headH = 250;
    const colH = Math.max(420, Math.max.apply(null, days.map((d) => column(d, 0, 0, false))));
    const tips = (plan.consejos || []).filter((t) => t.items && t.items.length).slice(0, 3);
    const tipW = tips.length ? (W - 2 * M - gap * (tips.length - 1)) / tips.length : 0;
    const tipBlock = (t, x, y0, draw) => {
      let y = y0 + 44;
      if (draw) { ctx.font = font(900, 22); ctx.fillStyle = CC.accent; ctx.fillText(String(t.titulo || 'CONSEJOS').toUpperCase(), x + 26, y); }
      ctx.font = font(500, 21, true);
      t.items.forEach((it) => {
        y += 8;
        wrapLines(ctx, '• ' + it, tipW - 52, 3).forEach((l) => { y += 30; if (draw) { ctx.fillStyle = CC.w2; ctx.fillText(l, x + 26, y); } });
      });
      return y + 26 - y0;
    };
    const tipH = tips.length ? Math.max.apply(null, tips.map((t) => tipBlock(t, 0, 0, false))) : 0;
    const H = headH + colH + (tips.length ? 40 + tipH : 0) + 150;
    c.width = W; c.height = H;
    ctx.fillStyle = CC.bg; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W, 0, 0, W, 0, W * 0.6);
    g.addColorStop(0, 'rgba(57,255,20,0.16)'); g.addColorStop(1, 'rgba(57,255,20,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // encabezado
    let lx = M;
    if (logo) { const h = 86, w = logo.width * h / logo.height; ctx.drawImage(logo, M, 56, w, h); lx = M + w + 40; }
    ctx.font = font(900, 50); ctx.fillStyle = CC.white; ctx.fillText('PLAN SEMANAL DE ENTRENAMIENTO', lx, 100);
    ctx.font = font(800, 26); ctx.fillStyle = CC.accent; ctx.fillText(String(name || '').toUpperCase() + ' · COACH CARLOS', lx, 140);
    const facts = [['ENFOQUE', plan.enfoque], ['FRECUENCIA', plan.frecuencia], ['NIVEL', plan.nivel], ['EDAD', plan.edad ? plan.edad + ' AÑOS' : ''], ['OBJETIVO', plan.objetivo]].filter((f) => f[1]);
    let fx = M;
    facts.forEach((f) => {
      ctx.font = font(800, 16); ctx.fillStyle = CC.w4; ctx.fillText(f[0], fx, 196);
      ctx.font = font(800, 22); ctx.fillStyle = CC.white;
      const v = wrapLines(ctx, String(f[1]).toUpperCase(), f[0] === 'OBJETIVO' ? Math.max(300, W - M - fx) : 520, 1)[0];
      ctx.fillText(v, fx, 226);
      fx += Math.max(ctx.measureText(v).width, ctx.measureText(f[0]).width) + 60;
    });
    // columnas
    days.forEach((d, i) => {
      const x = M + i * (colW + gap);
      rrect(ctx, x, headH, colW, colH, 18);
      ctx.fillStyle = CC.panel; ctx.fill();
      ctx.strokeStyle = CC.line; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = CC.accent; ctx.fillRect(x + 18, headH, colW - 36, 4);
      column(d, x, headH, true);
    });
    // consejos
    if (tips.length) {
      const ty = headH + colH + 40;
      tips.forEach((t, i) => {
        const x = M + i * (tipW + gap);
        rrect(ctx, x, ty, tipW, tipH, 18);
        ctx.fillStyle = CC.panel; ctx.fill();
        ctx.strokeStyle = CC.line; ctx.lineWidth = 2; ctx.stroke();
        tipBlock(t, x, ty, true);
      });
    }
    mottoLine(ctx, W / 2, H - 64, 34);
    return c;
  }
  async function sharePlanImage(plan, name) {
    if (!plan || !plan.dias || !plan.dias.length) { toast('Ese plan todavía no tiene días', 'ti-alert-triangle', true); return; }
    try {
      const c = await planCanvas(plan, name);
      presentCanvas(c, 'plan-team-carlos-' + nameKey(name).replace(/[^a-z0-9]+/g, '-') + '.png', 'Plan semanal · Team Carlos', 'IMAGEN DEL PLAN');
    } catch (e) { toastErr(e); }
  }
  $('#plan-info').addEventListener('click', (ev) => {
    if (ev.target.closest('#plan-image-btn') && S.plan && S.me) sharePlanImage(S.plan, S.me.name);
  });

  /* ================================================================ recordatorios (push) */
  const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = () => (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  let pushKeyP = null;
  function pushKey() {
    if (!pushKeyP) pushKeyP = api('GET', 'push/key').then((d) => d.key || '').catch(() => { pushKeyP = null; return ''; });
    return pushKeyP;
  }
  function b64ToBytes(b64) {
    const pad = '='.repeat((4 - (b64.length % 4)) % 4);
    const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(raw, (ch) => ch.charCodeAt(0));
  }
  const swReady = () => Promise.race([navigator.serviceWorker.ready, new Promise((res) => setTimeout(() => res(null), 4000))]);
  async function currentSub() {
    try { const reg = await swReady(); return reg ? await reg.pushManager.getSubscription() : null; } catch (e) { return null; }
  }
  let lastPushBody = '';
  let pushClaimed = null;
  // Al salir o cambiar de perfil, este teléfono deja de recibir los recordatorios de esa persona.
  function releasePush(token) {
    if (!token || !pushSupported() || Notification.permission !== 'granted') return;
    pushClaimed = null; lastPushBody = '';
    currentSub().then((sub) => {
      if (!sub) return;
      fetch('/api/push', { method: 'DELETE', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, body: JSON.stringify({ endpoint: sub.endpoint }) })
        .catch(() => {}).then(() => sub.unsubscribe()).catch(() => {});
    });
  }
  function pushCardHtml(role) {
    return '<div class="push-card" data-push-card="' + role + '"><div class="t"><i class="ti ti-bell" aria-hidden="true"></i>RECORDATORIOS</div>' + (lastPushBody || '<div class="d">Cargando…</div>') + '</div>';
  }
  async function refreshPushCards() {
    const cards = $$('[data-push-card]');
    if (!cards.length) return;
    const key = await pushKey();
    let body;
    const role = S.role;
    const what = role === 'coach' ? 'Te avisamos las mensualidades por vencer y los check-ins de la semana.' : 'Te avisamos el día que toca entrenar, si se te olvida marcar tus series y el domingo para tu check-in.';
    if (!key) body = '<div class="d">Los recordatorios todavía no están activos en el servidor.</div>';
    else if (!pushSupported()) {
      body = isIOS() && !isStandalone()
        ? '<div class="d">En iPhone: toca <b>Compartir</b> → <b>Agregar a pantalla de inicio</b>, abre Team Carlos desde el ícono y vuelve aquí para activarlos.</div>'
        : '<div class="d">Este navegador no permite notificaciones. Prueba con Chrome o instala la app en tu pantalla de inicio.</div>';
    } else if (Notification.permission === 'denied') {
      body = '<div class="d">Bloqueaste las notificaciones de Team Carlos. Actívalas en los ajustes del navegador y vuelve aquí.</div>';
    } else {
      const sub = Notification.permission === 'granted' ? await currentSub() : null;
      const who = S.role + ':' + (S.me ? S.me.id : '');
      if (sub && pushClaimed !== who) {
        pushClaimed = who;
        api('POST', 'push', { subscription: sub.toJSON() }).catch(() => { pushClaimed = null; });
      }
      body = sub
        ? '<div class="d">Activados en este teléfono ✓ ' + what + '</div><div class="row-actions"><button type="button" class="btn-ghost btn-sm" data-push="test">PROBAR</button><button type="button" class="btn-ghost btn-sm" data-push="off">DESACTIVAR</button></div>'
        : '<div class="d">' + what + '</div><div class="row-actions"><button type="button" class="btn-accent btn-sm" data-push="on"><i class="ti ti-bell-ringing" aria-hidden="true"></i>ACTIVAR RECORDATORIOS</button></div>';
    }
    lastPushBody = body;
    $$('[data-push-card]').forEach((c) => { c.innerHTML = '<div class="t"><i class="ti ti-bell" aria-hidden="true"></i>RECORDATORIOS</div>' + body; });
  }
  document.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-push]');
    if (!b) return;
    const act = b.dataset.push;
    b.disabled = true;
    try {
      if (act === 'on') {
        const key = await pushKey();
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') { toast('Sin permiso no te podemos avisar', 'ti-bell-off', true); return; }
        const reg = await swReady();
        if (!reg) { toast('Abre la app de nuevo e intenta otra vez', 'ti-alert-triangle', true); return; }
        let sub = await reg.pushManager.getSubscription();
        if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) });
        await api('POST', 'push', { subscription: sub.toJSON() });
        toast('Recordatorios activados', 'ti-bell-ringing');
      } else if (act === 'off') {
        const sub = await currentSub();
        if (sub) {
          await api('DELETE', 'push', { endpoint: sub.endpoint }).catch(() => {});
          await sub.unsubscribe().catch(() => {});
        }
        toast('Recordatorios desactivados', 'ti-bell-off');
      } else if (act === 'test') {
        const sub = await currentSub();
        if (sub) await api('POST', 'push', { subscription: sub.toJSON() });
        const r = await api('POST', 'push/test');
        toast(r.sent ? 'Te enviamos una notificación de prueba' : 'No se pudo enviar. Desactiva y vuelve a activar.', r.sent ? 'ti-bell' : 'ti-alert-triangle', !r.sent);
      }
    } catch (e) {
      if (!quietErr(e)) toastErr(e);
    } finally {
      b.disabled = false;
      refreshPushCards();
    }
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
    loadLibrary();
    if (['pagos', 'seguimiento'].indexOf(deepLink) === -1) switchCoachView('dashboard');
    applyDeepLink();
  }
  $$('#coach-panel .nav-item').forEach((b) => b.addEventListener('click', () => switchCoachView(b.dataset.coachView)));
  async function switchCoachView(v) {
    S.cview = v;
    $$('#coach-panel .nav-item').forEach((b) => b.classList.toggle('active', b.dataset.coachView === v));
    $$('#coach-panel main.view').forEach((el) => { const on = el.id === 'coach-view-' + v; el.classList.toggle('active', on); el.classList.toggle('on', on); });
    window.scrollTo(0, 0);
    closeModal();
    if (v === 'seguimiento') { S.segCi = null; S.feedback = null; S.segBodyFor = null; }
    renderCoachView();
    if (v === 'plan' && S.cstate) return;
    const loads = [loadCoachState()];
    if (v === 'pagos' || v === 'dashboard') loads.push(loadPagos());
    try { await Promise.all(loads); if (S.cview === v) renderCoachView(); } catch (e) { if (e.code !== 'NO_SESSION' && !e.stale) toastErr(e); }
  }
  function renderCoachView() {
    if (S.cview === 'dashboard') renderCoachDashboard();
    if (S.cview === 'clientes') renderClients();
    if (S.cview === 'plan') renderPlanView();
    if (S.cview === 'seguimiento') renderSeguimiento();
    if (S.cview === 'pagos') renderPagos();
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
    renderCoachExtras();
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
          '<button type="button" class="action-btn" data-act="c-nutri"><i class="ti ti-salad" aria-hidden="true"></i>COMIDAS</button>' +
          '<button type="button" class="action-btn" data-act="c-body"><i class="ti ti-ruler-measure" aria-hidden="true"></i>MEDIDAS Y FOTOS</button>' +
          '<button type="button" class="action-btn" data-act="c-pay"><i class="ti ti-cash" aria-hidden="true"></i>MENSUALIDAD</button>' +
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
    if (act === 'c-plan') { openPlanFor(id, 'entreno'); return; }
    if (act === 'c-nutri') { openPlanFor(id, 'nutri'); return; }
    if (act === 'c-body') { S.segClient = id; S.segTab = 'cuerpo'; switchCoachView('seguimiento'); return; }
    if (act === 'c-pay') { S.payOpen = id; switchCoachView('pagos'); return; }
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

  function openPlanFor(id, kind) {
    if (S.pe.athleteId !== id && (S.pe.dirty || S.ne.dirty) && !window.confirm('Tienes cambios sin guardar. ¿Descartarlos?')) { switchCoachView('plan'); return; }
    if (kind) S.planKind = kind;
    switchCoachView('plan');
    if (S.pe.athleteId !== id) loadPlanEditor(id);
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
    if ((S.pe.dirty || S.ne.dirty) && !window.confirm('Tienes cambios sin guardar. ¿Descartarlos?')) { planSelect.value = S.pe.athleteId; return; }
    loadPlanEditor(planSelect.value);
  });
  function renderPlanView() {
    const roster = (S.cstate && S.cstate.roster) || [];
    planSelect.innerHTML = '<option value="">ELIGE UN CLIENTE…</option>' + roster.map((a) => '<option value="' + a.id + '">' + esc(a.name.toUpperCase()) + (hasPlan(a.id) ? '' : ' · SIN PLAN') + '</option>').join('');
    planSelect.value = S.pe.athleteId || '';
    $$('#plan-kind button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.planKind));
    const isNutri = S.planKind === 'nutri';
    $('#plan-editor').classList.toggle('hidden', isNutri);
    $('#nutri-editor').classList.toggle('hidden', !isNutri);
    if (isNutri) { renderNutriEditor(); return; }
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
      (p.dias.length ? '<button type="button" class="action-btn" data-act="pe-image"><i class="ti ti-photo" aria-hidden="true"></i>IMAGEN DEL PLAN</button>' : '') +
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
            '<input class="form-input" data-ef="nombre" list="ex-library" maxlength="80" value="' + esc(e.nombre) + '" placeholder="Ejercicio" aria-label="Ejercicio ' + (ei + 1) + '"></div>' +
            '<div class="pex-grid"><label>SERIES' + input('data-ef="series" inputmode="numeric" maxlength="6"', e.series, '3') + '</label>' +
            '<label>REPS / TIEMPO' + input('data-ef="reps" maxlength="16"', e.reps, '10–12') + '</label>' +
            '<label>DESCANSO' + input('data-ef="descanso" maxlength="16"', e.descanso, '60 seg') + '</label></div>' +
            (e.video || e.alt || (S.pe.extra && S.pe.extra[e.id]) ? '<div class="pex-extra"><label>VIDEO DE TÉCNICA (LINK)' + input('data-ef="video" inputmode="url" maxlength="300"', e.video || '', 'https://youtu.be/…') + '</label>' +
              '<label>ALTERNATIVA' + input('data-ef="alt" maxlength="80"', e.alt || '', 'Si la máquina está ocupada') + '</label></div>' : '') +
            '<div class="pex-foot"><button type="button" class="pex-mode' + (libre ? ' libre' : '') + '" data-act="pe-ex-mode" title="Con peso: el cliente anota peso y reps. Libre: solo marca la serie (movilidad, estiramientos, plancha).">' +
            '<i class="ti ' + (libre ? 'ti-stretching' : 'ti-barbell') + '" aria-hidden="true"></i>' + (libre ? 'LIBRE (SIN PESO)' : 'CON PESO') + '</button>' +
            (e.video || e.alt || (S.pe.extra && S.pe.extra[e.id]) ? '' : '<button type="button" class="pex-mode" data-act="pe-ex-extra" title="Agrega un video de técnica y una alternativa"><i class="ti ti-player-play" aria-hidden="true"></i>VIDEO / ALT.</button>') +
            '<span class="grow"></span>' +
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
    if (ev.target.dataset.ef === 'nombre' && S.pe.plan) {
      const r = peRefs(ev.target);
      const lib = r.ex && libFor(r.ex.nombre);
      if (lib && !r.ex.video && !r.ex.alt && (lib.video || lib.alt)) {
        r.ex.video = lib.video || ''; r.ex.alt = lib.alt || '';
        markDirty();
        renderPlanView();
        toast('Agregué el video y la alternativa que ya tenías para ' + lib.nombre, 'ti-player-play');
      }
      return;
    }
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
    if (act === 'pe-image') {
      const pl = clone(p);
      pl.dias = pl.dias.filter((d) => dayExercises(d).some((e) => e.nombre.trim()));
      pl.dias.forEach((d) => d.secciones.forEach((s) => { s.ejercicios = s.ejercicios.filter((e) => e.nombre.trim()); }));
      sharePlanImage(pl, cName(S.pe.athleteId));
      return;
    }
    if (act === 'pe-ex-extra') { (S.pe.extra || (S.pe.extra = {}))[r.ex.id] = true; renderPlanView(); const v = $('[data-di="' + r.dayEl.dataset.di + '"] [data-si="' + r.secEl.dataset.si + '"] [data-ei="' + r.exEl.dataset.ei + '"] [data-ef="video"]', planEditor); if (v) v.focus(); return; }
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
    animateBars($('#seg-panel-cumplimiento'));
  }

  /* ================================================================ COACH: avisos, reto y recordatorios */
  async function loadPagos() {
    const r = await api('GET', 'pay');
    if (S.role !== 'coach') throw stale();
    S.pagos = r.pagos || [];
  }
  function payStatus(p, t) {
    if (!p || !p.proximoPago) return { cls: 'pill-none', label: 'SIN FECHA', rank: 3, d: 9999 };
    const d = daysBetween(t, p.proximoPago);
    if (d < 0) return { cls: 'pill-late', label: 'VENCIDA ' + inDays(d), rank: 0, d };
    if (d <= 5) return { cls: 'pill-soon', label: 'VENCE ' + inDays(d), rank: 1, d };
    return { cls: 'pill-paid', label: 'AL DÍA · ' + fmtDay(p.proximoPago), rank: 2, d };
  }
  const alertHtml = (x) => {
    const open = x.go ? '<button type="button" data-go="' + x.go + '"' : '<div';
    return open + ' class="alert-card' + (x.cls ? ' ' + x.cls : '') + '"><i class="ti ' + x.icon + '" aria-hidden="true"></i><div class="alert-main"><div class="alert-title">' + esc(x.title) + '</div><div class="alert-sub">' + esc(x.sub) + '</div>' +
      (x.pct != null ? '<div class="mini-progress"><span style="width:' + Math.round(x.pct) + '%"></span></div>' : '') + '</div>' +
      (x.go ? '<i class="ti ti-chevron-right" aria-hidden="true"></i></button>' : '</div>');
  };
  function renderCoachExtras() {
    const st = S.cstate;
    if (!st) return;
    const t = today();
    const alerts = [];
    const n = st.roster.length;
    if (n) {
      const ci = st.coach.checkinsWeek.length;
      alerts.push({ icon: 'ti-clipboard-check', title: 'Check-ins de esta semana', sub: ci + ' DE ' + n + ' CLIENTES · TOCA PARA LEER Y RESPONDER', go: 'checkins', pct: ci / n * 100 });
    }
    const nt = st.coach.nutriToday;
    if (nt.length) {
      const full = nt.filter((x) => x.total > 0 && x.done >= x.total && x.vasos >= x.meta).length;
      alerts.push({ icon: 'ti-salad', title: 'Nutrición de hoy', sub: plural(full, 'CLIENTE COMPLETÓ', 'CLIENTES COMPLETARON') + ' SU DÍA · ' + nt.length + ' REGISTRARON' });
    }
    if (S.pagos) {
      let late = 0, soon = 0;
      S.pagos.forEach((p) => { if (!cAthlete(p.athleteId)) return; const s = payStatus(p, t); if (s.rank === 0) late++; else if (s.rank === 1) soon++; });
      if (late || soon) {
        alerts.push({ cls: late ? 'danger' : 'warn', icon: 'ti-cash', go: 'pagos',
          title: late ? plural(late, 'mensualidad vencida', 'mensualidades vencidas') : plural(soon, 'mensualidad por vencer', 'mensualidades por vencer'),
          sub: (late && soon ? soon + ' MÁS POR VENCER · ' : '') + 'TOCA PARA COBRAR POR WHATSAPP' });
      }
    }
    $('#coach-alerts').innerHTML = alerts.length ? '<div style="padding:0 20px 6px;">' + alerts.map(alertHtml).join('') + '</div>' : '';
    renderCoachReto();
    $('#coach-push').innerHTML = '<div style="padding:0 20px;">' + pushCardHtml('coach') + '</div>';
    refreshPushCards();
  }
  $('#coach-alerts').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-go]');
    if (!b) return;
    if (b.dataset.go === 'checkins') { S.segTab = 'checkins'; switchCoachView('seguimiento'); }
    else switchCoachView(b.dataset.go);
  });

  const RETO_TXT = { entrenos: 'Días entrenados', completas: 'Sesiones completas', nutricion: 'Días de nutrición al 100%', checkins: 'Check-ins semanales', prs: 'PRs (récords)' };
  const RETO_TPLS = [
    { titulo: '16 entrenos en el mes', tipo: 'entrenos', meta: 16, descripcion: 'Entrena al menos 16 días este mes siguiendo tu plan.' },
    { titulo: '12 sesiones completas', tipo: 'completas', meta: 12, descripcion: 'Termina 12 sesiones completas, sin saltarte ejercicios.' },
    { titulo: '20 días comiendo al 100%', tipo: 'nutricion', meta: 20, descripcion: 'Cumple todas tus comidas y tu agua 20 días del mes.' },
    { titulo: '3 PRs este mes', tipo: 'prs', meta: 3, descripcion: 'Rompe 3 de tus récords personales este mes.' },
  ];
  function renderCoachReto() {
    const el = $('#coach-reto');
    const st = S.cstate;
    if (!el || !st) return;
    const r = st.reto;
    const mes = MESES[isoDate(today()).getUTCMonth()];
    let html = '<div style="padding:0 20px;"><div class="section-title-podio">RETO DE ' + mes + '</div>';
    if (r && !S.retoEdit) {
      const done = r.progreso.filter((p) => p.done).length;
      html += '<div class="reto-card"><div class="reto-eyebrow">EN CURSO · +100 PTS A QUIEN LO CUMPLA</div><div class="reto-title">' + esc(r.titulo || 'Reto del mes') + '</div>' +
        (r.descripcion ? '<div class="reto-desc">' + esc(r.descripcion) + '</div>' : '') +
        '<div class="reto-meta"><span class="ci-pill">META ' + r.meta + ' ' + esc(String(r.unidad).toUpperCase()) + '</span>' + (r.premio ? '<span class="ci-pill">PREMIO: ' + esc(r.premio.toUpperCase()) + '</span>' : '') +
        '<span class="ci-pill">' + done + ' DE ' + st.roster.length + ' CUMPLIERON</span></div></div>';
      html += r.progreso.slice(0, 6).map((p) => barRow(shortName(cName(p.athleteId)), p.value + '/' + r.meta + (p.done ? ' ✓' : ''), p.value / r.meta * 100, p.done ? 'gold-bar' : 'green-bar')).join('');
      html += '<div class="btn-row" style="margin-top:10px;"><button type="button" class="btn-ghost" data-reto="edit">EDITAR</button><button type="button" class="btn-ghost" data-reto="del">QUITAR RETO</button></div>';
      el.innerHTML = html + '</div>';
      animateBars(el);
      return;
    }
    if (!r && !S.retoEdit) {
      html += '<div class="push-card" style="margin-top:0;"><div class="t"><i class="ti ti-target" aria-hidden="true"></i>SIN RETO ESTE MES</div><div class="d">Un reto mensual motiva al team: quien cumpla la meta suma +100 puntos y aparece en la pestaña RETO del podio.</div>' +
        '<div class="row-actions"><button type="button" class="btn-accent btn-sm" data-reto="new"><i class="ti ti-plus" aria-hidden="true"></i>LANZAR RETO</button></div></div>';
      el.innerHTML = html + '</div>';
      return;
    }
    const d = S.retoDraft || (S.retoDraft = r ? { titulo: r.titulo || '', tipo: r.tipo, meta: r.meta, descripcion: r.descripcion || '', premio: r.premio || '' } : clone(RETO_TPLS[0]));
    html += '<form class="editor-card" data-form="reto" autocomplete="off"><div class="editor-card-title">' + (r ? 'EDITAR RETO' : 'NUEVO RETO DE ' + mes) + '</div>' +
      (r ? '' : '<div class="mini-filter-row" style="margin-bottom:12px;">' + RETO_TPLS.map((x, i) => '<button type="button" class="mini-filter-btn" data-reto-tpl="' + i + '">' + esc(x.titulo.toUpperCase()) + '</button>').join('') + '</div>') +
      '<div class="form-field-group"><label class="form-label">TÍTULO</label><input class="form-input" name="titulo" maxlength="60" value="' + esc(d.titulo) + '" placeholder="16 entrenos en el mes"></div>' +
      '<div class="form-row" style="margin-bottom:14px;"><div><label class="form-label">QUÉ SE MIDE</label><select class="form-select" name="tipo">' +
      Object.keys(RETO_TXT).map((k) => '<option value="' + k + '"' + (d.tipo === k ? ' selected' : '') + '>' + RETO_TXT[k].toUpperCase() + '</option>').join('') + '</select></div>' +
      '<div><label class="form-label">META</label><input class="form-input" name="meta" inputmode="numeric" maxlength="3" value="' + esc(d.meta) + '"></div></div>' +
      '<div class="form-field-group"><label class="form-label">DESCRIPCIÓN</label><input class="form-input" name="descripcion" maxlength="200" value="' + esc(d.descripcion) + '"></div>' +
      '<div class="form-field-group"><label class="form-label">PREMIO (OPCIONAL)</label><input class="form-input" name="premio" maxlength="100" value="' + esc(d.premio) + '" placeholder="Ej: camiseta TMC o una sesión gratis"></div>' +
      '<div class="form-error" id="reto-error"></div>' +
      '<div class="btn-row"><button type="submit" class="btn-accent">' + (r ? 'GUARDAR' : 'LANZAR RETO') + '</button><button type="button" class="btn-ghost" data-reto="cancel">CANCELAR</button></div></form>';
    el.innerHTML = html + '</div>';
  }
  const retoEl = $('#coach-reto');
  retoEl.addEventListener('click', async (ev) => {
    const tpl = ev.target.closest('[data-reto-tpl]');
    if (tpl) { S.retoDraft = clone(RETO_TPLS[+tpl.dataset.retoTpl]); renderCoachReto(); return; }
    const b = ev.target.closest('[data-reto]');
    if (!b) return;
    const act = b.dataset.reto;
    if (act === 'new' || act === 'edit') { S.retoEdit = true; S.retoDraft = null; renderCoachReto(); return; }
    if (act === 'cancel') { S.retoEdit = false; S.retoDraft = null; renderCoachReto(); return; }
    if (act === 'del') {
      if (!confirmTap(b, '¿QUITAR? TOCA OTRA VEZ')) return;
      try {
        await api('DELETE', 'reto?month=' + today().slice(0, 7));
        await loadCoachState();
        toast('Reto quitado');
        renderCoachView();
      } catch (e) { toastErr(e); }
    }
  });
  retoEl.addEventListener('input', (ev) => {
    if (S.retoDraft && ev.target.name) S.retoDraft[ev.target.name] = ev.target.value;
  });
  retoEl.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const d = S.retoDraft;
    if (!d) return;
    const meta = parseInt(d.meta, 10);
    const err = $('#reto-error');
    if (!(meta >= 1 && meta <= 100)) { err.textContent = 'La meta debe estar entre 1 y 100'; return; }
    const btn = $('button[type="submit"]', ev.target);
    btn.disabled = true;
    try {
      await api('PUT', 'reto?month=' + today().slice(0, 7), { titulo: d.titulo.trim(), tipo: d.tipo, meta, descripcion: d.descripcion.trim(), premio: d.premio.trim() });
      S.retoEdit = false; S.retoDraft = null;
      await loadCoachState();
      toast('Reto publicado · el team ya lo ve', 'ti-target');
      renderCoachView();
    } catch (e) { btn.disabled = false; err.textContent = e.message; }
  });

  /* ================================================================ COACH: biblioteca de ejercicios */
  function loadLibrary() {
    api('GET', 'library').then((r) => { S.library = r.items || []; fillDatalist(); }).catch(() => {});
  }
  function fillDatalist() {
    let dl = $('#ex-library');
    if (!dl) { dl = document.createElement('datalist'); dl.id = 'ex-library'; document.body.appendChild(dl); }
    const names = new Map();
    (S.library || []).forEach((i) => names.set(nameKey(i.nombre), i.nombre));
    TPL.dias.forEach((d) => d.secciones.forEach((s) => s.ejercicios.forEach((e) => { if (!names.has(nameKey(e.nombre))) names.set(nameKey(e.nombre), e.nombre); })));
    dl.innerHTML = Array.from(names.values()).sort((a, b) => a.localeCompare(b, 'es')).map((n) => '<option value="' + esc(n) + '"></option>').join('');
  }
  const libFor = (nombre) => (S.library || []).find((i) => nameKey(i.nombre) === nameKey(nombre)) || null;

  /* ================================================================ COACH: plan de alimentación */
  S.planKind = 'entreno';
  S.ne = { athleteId: '', nutri: null, exists: false, dirty: false, loading: false, failed: '' };
  $('#plan-kind').addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    S.planKind = b.dataset.v;
    renderPlanView();
  });
  const ACTIVIDAD = [[1.2, 'SEDENTARIO'], [1.375, 'LIGERO · 1–3 DÍAS'], [1.55, 'MODERADO · 3–5 DÍAS'], [1.725, 'ALTO · 6–7 DÍAS'], [1.9, 'MUY ALTO · DOBLE SESIÓN']];
  const OBJETIVOS = [['VOLUMEN', 0.1], ['DEFINICIÓN', -0.2], ['MANTENIMIENTO', 0], ['RECOMPOSICIÓN', -0.1]];
  function calcMacros(c, gender, objetivo) {
    const peso = parseNum(c.peso), est = parseNum(c.estatura), edad = parseNum(c.edad), act = Number(c.actividad) || 1.55;
    if (!(peso >= 30 && est >= 120 && edad >= 12)) return null;
    const bmr = 10 * peso + 6.25 * est - 5 * edad + (gender === 'f' ? -161 : 5);
    const tdee = bmr * act;
    const adj = (OBJETIVOS.find((o) => o[0] === objetivo) || [0, 0])[1];
    const kcal = Math.round(tdee * (1 + adj) / 10) * 10;
    const proteina = Math.round(peso * (objetivo === 'DEFINICIÓN' ? 2.2 : objetivo === 'VOLUMEN' ? 1.8 : 2));
    const grasas = Math.round(peso * (objetivo === 'DEFINICIÓN' ? 0.8 : 0.9));
    const carbos = Math.max(0, Math.round((kcal - proteina * 4 - grasas * 9) / 4));
    const agua = Math.round(peso * 0.035 * 10) / 10;
    return { bmr: Math.round(bmr), tdee: Math.round(tdee), adj, kcal, proteina, carbos, grasas, agua };
  }
  const M = (nombre, hora, items, nota) => ({ id: '', nombre, hora, items: items.map((i) => ({ texto: i[0], alt: i[1] || '' })), nota: nota || '' });
  const NUT_TPL = {
    comidas: [
      M('Desayuno', '6:30 a. m.', [['3 huevos revueltos o en tortilla', '1 taza de claras + 1 huevo'], ['1 arepa mediana o 2 tajadas de pan integral', '1 taza de avena en hojuelas'], ['1 fruta (banano, papaya o piña)'], ['Café o chocolate sin azúcar']]),
      M('Media mañana', '10:00 a. m.', [['1 yogur griego sin azúcar', '1 scoop de proteína en agua'], ['1 puñado de maní o almendras (30 g)'], ['1 fruta']]),
      M('Almuerzo', '1:00 p. m.', [['150–200 g de pechuga, carne magra o pescado', 'atún, cerdo magro o pavo'], ['1 taza de arroz o 1 papa mediana', '1 taza de pasta o 1 plátano pequeño'], ['Ensalada grande con 1 cda de aceite de oliva', 'verduras salteadas'], ['½ taza de fríjoles o lentejas']], 'Empieza por la proteína y las verduras.'),
      M('Pre-entreno', '4:30 p. m.', [['1 banano + 1 cda de mantequilla de maní', '2 tajadas de pan con jamón de pavo'], ['Café negro (opcional)']], '60–90 minutos antes de entrenar.'),
      M('Cena', '8:00 p. m.', [['150 g de proteína (pollo, pescado, huevos o carne)'], ['Verduras al gusto'], ['½ aguacate', '1 cda de aceite de oliva'], ['½ taza de arroz o 1 arepa pequeña (días de entreno)']]),
    ],
    suplementos: ['Proteína whey: 1 scoop después de entrenar', 'Creatina monohidratada: 5 g al día, a cualquier hora'],
    mercado: ['Huevos', 'Pechuga de pollo', 'Carne molida magra', 'Atún en agua', 'Yogur griego sin azúcar', 'Avena en hojuelas', 'Arroz', 'Papa', 'Arepas', 'Pan integral', 'Plátano', 'Fríjoles o lentejas', 'Banano', 'Papaya', 'Piña', 'Aguacate', 'Maní o almendras', 'Mantequilla de maní', 'Aceite de oliva', 'Verduras variadas'],
    notas: 'Toma el agua repartida en el día, no toda de golpe. Si no puedes hacer una comida, usa la alternativa. Evita gaseosas y alcohol entre semana; una comida libre el fin de semana está bien.',
  };
  const emptyNutri = () => ({ objetivo: '', kcal: '', proteina: '', carbos: '', grasas: '', agua: '', comidas: [M('Desayuno', '', [['']])], suplementos: [], mercado: [], notas: '', calc: { peso: '', estatura: '', edad: '', actividad: 1.55 } });
  const nutriWithIds = (n) => { const x = clone(n); x.comidas.forEach((c) => { c.id = rid(); }); return x; };

  async function loadNutriEditor(id) {
    S.ne = { athleteId: id, nutri: null, exists: false, dirty: false, loading: !!id, failed: '' };
    if (S.planKind === 'nutri') renderPlanView();
    if (!id) return;
    try {
      const [r, b] = await Promise.all([api('GET', 'nutri?athleteId=' + id), api('GET', 'body?athleteId=' + id).catch(() => ({ body: null }))]);
      if (S.ne.athleteId !== id) return;
      const n = r.nutri ? clone(r.nutri) : emptyNutri();
      n.calc = Object.assign({ peso: '', estatura: '', edad: '', actividad: 1.55 }, n.calc || {});
      ['peso', 'estatura', 'edad'].forEach((k) => { if (!n.calc[k]) n.calc[k] = ''; });
      const lastPeso = b.body ? bodyEntries(b.body).filter((e) => e.peso != null).pop() : null;
      if (!n.calc.peso && lastPeso) n.calc.peso = Math.round(lastPeso.peso);
      if (!n.calc.edad && S.pe.athleteId === id && S.pe.plan && S.pe.plan.edad) n.calc.edad = S.pe.plan.edad;
      S.ne.nutri = n;
      S.ne.exists = !!r.nutri;
    } catch (e) {
      if (S.ne.athleteId !== id) return;
      if (!quietErr(e)) toastErr(e);
      S.ne.failed = id;
    }
    S.ne.loading = false;
    if (S.planKind === 'nutri') renderPlanView();
  }
  function neStatusHtml() {
    if (S.ne.dirty) return '<span class="plan-status ps-dirty" id="ne-status">CAMBIOS SIN GUARDAR</span>';
    return S.ne.exists ? '<span class="plan-status ps-live" id="ne-status">PLAN DE COMIDAS PUBLICADO · EL CLIENTE YA LO VE</span>' : '<span class="plan-status ps-new" id="ne-status">SIN PLAN DE COMIDAS TODAVÍA</span>';
  }
  function neDirty() {
    S.ne.dirty = true;
    const s = $('#ne-status');
    if (s) { s.className = 'plan-status ps-dirty'; s.textContent = 'CAMBIOS SIN GUARDAR'; }
  }
  const macroKcal = (n) => (parseNum(n.proteina) || 0) * 4 + (parseNum(n.carbos) || 0) * 4 + (parseNum(n.grasas) || 0) * 9;
  function macroHintText(n) {
    const k = macroKcal(n);
    if (!k) return 'Usa la calculadora o escribe los macros a mano.';
    const target = parseNum(n.kcal) || 0;
    const diff = target ? Math.round(k - target) : 0;
    return 'Proteína×4 + carbos×4 + grasas×9 = ' + Math.round(k).toLocaleString('es-CO') + ' kcal' + (target ? (Math.abs(diff) <= 50 ? ' ✓ cuadra con el total' : ' (' + (diff > 0 ? '+' : '') + diff + ' vs. el total)') : '');
  }
  function renderNutriEditor() {
    const el = $('#nutri-editor');
    const id = S.pe.athleteId;
    if (!id) { el.innerHTML = emptyCard('ti-salad', 'Elige un cliente', 'Selecciona un cliente para armar su plan de alimentación.'); return; }
    if (S.ne.athleteId !== id && S.ne.failed !== id && !S.ne.loading) { loadNutriEditor(id); return; }
    if (S.ne.failed === id) { el.innerHTML = emptyCard('ti-wifi-off', 'No se pudo cargar', '', '<button type="button" class="btn-accent" data-act="ne-retry" style="margin-top:12px;">REINTENTAR</button>'); return; }
    if (S.ne.loading || !S.ne.nutri) { el.innerHTML = '<div class="loading-line">Cargando plan de comidas…</div>'; return; }
    const n = S.ne.nutri;
    const a = cAthlete(id);
    const others = ((S.cstate && S.cstate.roster) || []).filter((x) => x.id !== id);
    const inp = (attr, val, ph) => '<input class="form-input" ' + attr + ' value="' + esc(val == null ? '' : val) + '" placeholder="' + esc(ph || '') + '">';
    let html = neStatusHtml();
    html += '<div class="plan-tools"><button type="button" class="action-btn" data-act="ne-tpl"><i class="ti ti-template" aria-hidden="true"></i>PLANTILLA TMC</button>' +
      '<select class="form-select" id="ne-copy" aria-label="Copiar plan de comidas de otro cliente"' + (others.length ? '' : ' disabled') + '><option value="">COPIAR DE…</option>' +
      others.map((x) => '<option value="' + x.id + '">' + esc(x.name.toUpperCase()) + '</option>').join('') + '</select></div>';
    const res = calcMacros(n.calc, a && a.gender, n.objetivo);
    html += '<div class="editor-card"><div class="editor-card-title">CALCULADORA DE CALORÍAS</div>' +
      '<div class="calc-grid"><label>PESO (KG)' + inp('data-cf="peso" inputmode="decimal" maxlength="5"', n.calc.peso, '75') + '</label>' +
      '<label>ESTATURA (CM)' + inp('data-cf="estatura" inputmode="numeric" maxlength="3"', n.calc.estatura, '175') + '</label>' +
      '<label>EDAD' + inp('data-cf="edad" inputmode="numeric" maxlength="3"', n.calc.edad, '30') + '</label></div>' +
      '<div class="form-row" style="margin-bottom:10px;"><div><label class="form-label">ACTIVIDAD</label><select class="form-select" data-cf="actividad">' +
      ACTIVIDAD.map((x) => '<option value="' + x[0] + '"' + (Math.abs((Number(n.calc.actividad) || 1.55) - x[0]) < 0.01 ? ' selected' : '') + '>' + x[1] + '</option>').join('') + '</select></div>' +
      '<div><label class="form-label">OBJETIVO</label><select class="form-select" data-nf="objetivo"><option value="">—</option>' +
      OBJETIVOS.map((o) => '<option value="' + o[0] + '"' + (n.objetivo === o[0] ? ' selected' : '') + '>' + o[0] + '</option>').join('') + '</select></div></div>' +
      '<button type="button" class="btn-accent btn-full" data-act="ne-calc"><i class="ti ti-calculator" aria-hidden="true"></i> CALCULAR MACROS</button>' +
      '<div class="calc-result" id="ne-calc-result">' + (res ? 'Metabolismo basal ' + res.bmr.toLocaleString('es-CO') + ' kcal · gasto diario ' + res.tdee.toLocaleString('es-CO') + ' kcal' +
        (n.objetivo ? ' · ' + n.objetivo.toLowerCase() + ' ' + (res.adj > 0 ? '+' : '') + Math.round(res.adj * 100) + '% → ' + res.kcal.toLocaleString('es-CO') + ' kcal' : '') + '. Fórmula Mifflin-St Jeor (' + (a && a.gender === 'f' ? 'mujer' : 'hombre') + ').'
        : 'Escribe peso, estatura y edad del cliente para calcular.') + '</div></div>';
    html += '<div class="editor-card"><div class="editor-card-title">MACROS DEL DÍA</div><div class="macro-edit">' +
      '<label>KCAL' + inp('data-nf="kcal" inputmode="numeric" maxlength="5"', n.kcal || '', '2400') + '</label>' +
      '<label>PROTEÍNA G' + inp('data-nf="proteina" inputmode="numeric" maxlength="4"', n.proteina || '', '150') + '</label>' +
      '<label>CARBOS G' + inp('data-nf="carbos" inputmode="numeric" maxlength="4"', n.carbos || '', '250') + '</label>' +
      '<label>GRASAS G' + inp('data-nf="grasas" inputmode="numeric" maxlength="4"', n.grasas || '', '70') + '</label>' +
      '<label>AGUA L' + inp('data-nf="agua" inputmode="decimal" maxlength="4"', n.agua ? fmtNum(n.agua) : '', '3') + '</label></div>' +
      '<div class="calc-result" id="ne-macro-hint">' + esc(macroHintText(n)) + '</div></div>';
    html += '<div class="editor-card"><div class="editor-card-title">COMIDAS (' + n.comidas.length + '/8)</div>';
    n.comidas.forEach((c, mi) => {
      html += '<div class="meal-edit" data-mi="' + mi + '"><div class="meal-edit-head">' +
        '<input class="form-input mn" data-mf="nombre" maxlength="40" value="' + esc(c.nombre) + '" placeholder="Comida" aria-label="Nombre de la comida">' +
        '<input class="form-input mh" data-mf="hora" maxlength="12" value="' + esc(c.hora) + '" placeholder="Hora" aria-label="Hora">' +
        '<button type="button" class="pex-mini" data-act="ne-meal-up" aria-label="Subir"' + (mi === 0 ? ' disabled' : '') + '><i class="ti ti-arrow-up" aria-hidden="true"></i></button>' +
        '<button type="button" class="pex-mini" data-act="ne-meal-down" aria-label="Bajar"' + (mi === n.comidas.length - 1 ? ' disabled' : '') + '><i class="ti ti-arrow-down" aria-hidden="true"></i></button>' +
        '<button type="button" class="pex-mini danger" data-act="ne-meal-del" aria-label="Quitar comida"><i class="ti ti-trash" aria-hidden="true"></i></button></div>' +
        c.items.map((it, fi) => '<div class="food-row" data-fi="' + fi + '"><input class="form-input" data-ff="texto" maxlength="100" value="' + esc(it.texto) + '" placeholder="Ej: 150 g de pechuga">' +
          '<input class="form-input" data-ff="alt" maxlength="100" value="' + esc(it.alt) + '" placeholder="Alternativa (opcional)" aria-label="Alternativa">' +
          '<button type="button" class="pex-mini danger" data-act="ne-food-del" aria-label="Quitar alimento"><i class="ti ti-x" aria-hidden="true"></i></button></div>').join('') +
        '<button type="button" class="add-exercise-btn" data-act="ne-food-add"' + (c.items.length >= 15 ? ' disabled' : '') + '>+ ALIMENTO</button>' +
        '<input class="form-input" data-mf="nota" maxlength="200" value="' + esc(c.nota) + '" placeholder="Nota (opcional)" style="margin-top:8px;"></div>';
    });
    html += (n.comidas.length < 8 ? '<button type="button" class="add-exercise-btn" data-act="ne-meal-add">+ COMIDA</button>' : '') + '</div>';
    html += '<div class="editor-card"><div class="editor-card-title">SUPLEMENTOS</div><textarea class="form-textarea" data-nt="suplementos" placeholder="Uno por línea">' + esc((n.suplementos || []).join('\n')) + '</textarea></div>';
    html += '<div class="editor-card"><div class="editor-card-title">LISTA DE MERCADO</div><textarea class="form-textarea" data-nt="mercado" placeholder="Un producto por línea" style="min-height:120px;">' + esc((n.mercado || []).join('\n')) + '</textarea></div>';
    html += '<div class="editor-card"><div class="editor-card-title">NOTAS PARA EL CLIENTE</div><textarea class="form-textarea" data-nt="notas" maxlength="600" placeholder="Ej: el día de descanso baja los carbohidratos a la mitad">' + esc(n.notas || '') + '</textarea></div>';
    html += '<button type="button" class="publish-btn" data-act="ne-save"><i class="ti ti-send" aria-hidden="true"></i><span>' + (S.ne.exists ? 'GUARDAR CAMBIOS' : 'PUBLICAR PLAN DE COMIDAS') + '</span></button>';
    if (S.ne.exists) html += '<button type="button" class="delete-btn" data-act="ne-delete">BORRAR PLAN DE COMIDAS</button>';
    el.innerHTML = html;
  }
  const nutriEditor = $('#nutri-editor');
  nutriEditor.addEventListener('input', (ev) => {
    const t = ev.target;
    const n = S.ne.nutri;
    if (!n || t.id === 'ne-copy') return;
    const mealEl = t.closest('[data-mi]');
    const meal = mealEl ? n.comidas[+mealEl.dataset.mi] : null;
    if (t.dataset.cf) n.calc[t.dataset.cf] = t.value;
    else if (t.dataset.nf) {
      n[t.dataset.nf] = t.value;
      const h = $('#ne-macro-hint');
      if (h) h.textContent = macroHintText(n);
    } else if (t.dataset.mf && meal) meal[t.dataset.mf] = t.value;
    else if (t.dataset.ff && meal) meal.items[+t.closest('[data-fi]').dataset.fi][t.dataset.ff] = t.value;
    else if (t.dataset.nt) n[t.dataset.nt] = t.dataset.nt === 'notas' ? t.value : t.value.split('\n');
    else return;
    neDirty();
  });
  nutriEditor.addEventListener('change', async (ev) => {
    const t = ev.target;
    if (t.dataset.cf === 'actividad' || t.dataset.nf === 'objetivo') { neDirty(); renderNutriEditor(); return; }
    if (t.id !== 'ne-copy' || !t.value) return;
    const from = t.value;
    if (S.ne.exists || S.ne.dirty) { if (!window.confirm('Esto reemplaza las comidas de este cliente (sin guardar todavía). ¿Continuar?')) { t.value = ''; return; } }
    try {
      const r = await api('GET', 'nutri?athleteId=' + from);
      if (!r.nutri) { toast('Ese cliente no tiene plan de comidas', 'ti-alert-triangle', true); t.value = ''; return; }
      const cur = S.ne.nutri;
      const next = nutriWithIds(r.nutri);
      next.calc = cur.calc;
      delete next.updatedAt;
      S.ne.nutri = next;
      neDirty();
      renderNutriEditor();
      toast('Comidas copiadas de ' + firstName(cName(from)) + '. Ajusta los macros y guarda.', 'ti-copy');
    } catch (e) { toastErr(e); t.value = ''; }
  });
  nutriEditor.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'ne-retry') { S.ne.failed = ''; loadNutriEditor(S.pe.athleteId); return; }
    const n = S.ne.nutri;
    if (!n) return;
    const mealEl = btn.closest('[data-mi]');
    const mi = mealEl ? +mealEl.dataset.mi : -1;
    const rerender = () => { neDirty(); renderNutriEditor(); };
    if (act === 'ne-calc') {
      const a = cAthlete(S.pe.athleteId);
      if (!n.objetivo) { toast('Elige el objetivo primero', 'ti-alert-triangle', true); return; }
      const r = calcMacros(n.calc, a && a.gender, n.objetivo);
      if (!r) { toast('Escribe peso, estatura y edad', 'ti-alert-triangle', true); return; }
      Object.assign(n, { kcal: r.kcal, proteina: r.proteina, carbos: r.carbos, grasas: r.grasas, agua: r.agua });
      rerender();
      toast('Macros calculados: ' + r.kcal.toLocaleString('es-CO') + ' kcal', 'ti-calculator');
      return;
    }
    if (act === 'ne-tpl') {
      if ((S.ne.exists || n.comidas.some((c) => c.items.some((i) => i.texto.trim()))) && !confirmTap(btn, '¿REEMPLAZAR? TOCA OTRA VEZ')) return;
      const next = nutriWithIds(NUT_TPL);
      S.ne.nutri = Object.assign({}, n, { comidas: next.comidas, suplementos: next.suplementos.slice(), mercado: next.mercado.slice(), notas: next.notas });
      rerender();
      toast('Plantilla cargada. Calcula los macros y ajusta las porciones.', 'ti-template');
      return;
    }
    if (act === 'ne-meal-add') { if (n.comidas.length < 8) { const m = M('', '', [['']]); m.id = rid(); n.comidas.push(m); } rerender(); return; }
    if (act === 'ne-meal-del') {
      if (n.comidas.length <= 1) { toast('El plan necesita al menos una comida', 'ti-info-circle'); return; }
      if (!confirmTap(btn)) return;
      n.comidas.splice(mi, 1); rerender(); return;
    }
    if (act === 'ne-meal-up' || act === 'ne-meal-down') {
      const j = act === 'ne-meal-up' ? mi - 1 : mi + 1;
      if (j < 0 || j >= n.comidas.length) return;
      const tmp = n.comidas[mi]; n.comidas[mi] = n.comidas[j]; n.comidas[j] = tmp;
      rerender(); return;
    }
    if (act === 'ne-food-add') {
      const c = n.comidas[mi];
      if (c.items.length < 15) c.items.push({ texto: '', alt: '' });
      rerender();
      const rows = $$('[data-mi="' + mi + '"] [data-ff="texto"]', nutriEditor);
      if (rows.length) rows[rows.length - 1].focus();
      return;
    }
    if (act === 'ne-food-del') {
      const c = n.comidas[mi];
      c.items.splice(+btn.closest('[data-fi]').dataset.fi, 1);
      if (!c.items.length) c.items.push({ texto: '', alt: '' });
      rerender(); return;
    }
    if (act === 'ne-save') {
      const lines = (v) => (Array.isArray(v) ? v : String(v || '').split('\n')).map((x) => String(x).trim()).filter(Boolean);
      const payload = {
        objetivo: n.objetivo, kcal: parseNum(n.kcal) || 0, proteina: parseNum(n.proteina) || 0, carbos: parseNum(n.carbos) || 0, grasas: parseNum(n.grasas) || 0, agua: parseNum(n.agua) || 0,
        comidas: n.comidas.map((c) => ({ id: c.id, nombre: c.nombre.trim(), hora: c.hora.trim(), nota: c.nota.trim(), items: c.items.map((i) => ({ texto: i.texto.trim(), alt: i.alt.trim() })).filter((i) => i.texto) }))
          .filter((c) => c.nombre || c.items.length),
        suplementos: lines(n.suplementos), mercado: lines(n.mercado), notas: (n.notas || '').trim(),
        calc: { peso: parseNum(n.calc.peso) || 0, estatura: parseNum(n.calc.estatura) || 0, edad: parseNum(n.calc.edad) || 0, actividad: Number(n.calc.actividad) || 1.55 },
      };
      if (!payload.comidas.length) { toast('Agrega al menos una comida', 'ti-alert-triangle', true); return; }
      btn.classList.add('publishing'); btn.disabled = true;
      const id = S.pe.athleteId;
      try {
        const r = await api('PUT', 'nutri?athleteId=' + id, payload);
        if (S.ne.athleteId !== id) return;
        const next = clone(r.nutri);
        next.calc = Object.assign({}, n.calc);
        S.ne.nutri = next; S.ne.exists = true; S.ne.dirty = false;
        toast('Plan de comidas publicado · ' + firstName(cName(id)) + ' ya lo ve', 'ti-send');
        renderNutriEditor();
      } catch (e) {
        toastErr(e);
        btn.classList.remove('publishing'); btn.disabled = false;
      }
      return;
    }
    if (act === 'ne-delete') {
      if (!confirmTap(btn, '¿BORRAR? TOCA OTRA VEZ')) return;
      try {
        await api('DELETE', 'nutri?athleteId=' + S.pe.athleteId);
        const calc = n.calc;
        S.ne.nutri = emptyNutri(); S.ne.nutri.calc = calc; S.ne.exists = false; S.ne.dirty = false;
        toast('Plan de comidas borrado');
        renderNutriEditor();
      } catch (e) { toastErr(e); }
    }
  });

  /* ================================================================ COACH: seguimiento */
  S.segTab = 'cumplimiento';
  $('#seg-tabs').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-seg]');
    if (!b) return;
    S.segTab = b.dataset.seg;
    renderSeguimiento();
  });
  function renderSeguimiento() {
    $$('#seg-tabs .tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.seg === S.segTab));
    $$('#coach-view-seguimiento .tab-panel').forEach((p) => { const on = p.id === 'seg-panel-' + S.segTab; p.classList.toggle('active', on); p.classList.toggle('on', on); });
    if (S.segTab === 'cumplimiento') renderProgreso();
    if (S.segTab === 'checkins') renderSegCheckins();
    if (S.segTab === 'cuerpo') renderSegCuerpo();
    if (S.segTab === 'comentarios') renderSegComentarios();
  }
  // ---- check-ins de la semana
  function segCiWeek() {
    if (S.segCiOffset == null) S.segCiOffset = dowOf(today()) <= 1 ? -1 : 0;
    return addDays(weekStart(today()), S.segCiOffset * 7);
  }
  function renderSegCheckins() {
    const el = $('#seg-panel-checkins');
    const st = S.cstate;
    const wk = segCiWeek();
    let html = '<div class="week-nav" style="padding:0 0 14px;"><button type="button" class="icon-btn" data-ciwk="-1" aria-label="Semana anterior"' + (S.segCiOffset <= -11 ? ' disabled' : '') + '><i class="ti ti-chevron-left" aria-hidden="true"></i></button>' +
      '<div class="wn-label">' + (S.segCiOffset === 0 ? 'ESTA SEMANA · ' : S.segCiOffset === -1 ? 'SEMANA PASADA · ' : '') + fmtDay(wk) + ' – ' + fmtDay(addDays(wk, 6)) + '</div>' +
      '<button type="button" class="icon-btn" data-ciwk="1" aria-label="Semana siguiente"' + (S.segCiOffset >= 0 ? ' disabled' : '') + '><i class="ti ti-chevron-right" aria-hidden="true"></i></button></div>';
    if (!st) { el.innerHTML = html + '<div class="loading-line">Cargando…</div>'; return; }
    if (!S.segCi || S.segCi.week !== wk) {
      el.innerHTML = html + '<div class="loading-line">Cargando…</div>';
      loadOnce('segci' + wk, () => api('GET', 'checkins?week=' + wk)).then((r) => {
        S.segCi = { week: wk, list: r.checkins };
        if (S.cview === 'seguimiento' && S.segTab === 'checkins' && segCiWeek() === wk) renderSegCheckins();
      }, (e) => { if (!quietErr(e)) el.innerHTML = html + emptyCard('ti-wifi-off', 'No se pudo cargar', e.message); });
      return;
    }
    const list = S.segCi.list.filter((c) => cAthlete(c.athleteId)).sort((a, b) => (!!a.respuesta - !!b.respuesta) || b.ts - a.ts);
    const done = new Set(list.map((c) => c.athleteId));
    const pending = st.roster.filter((a) => !done.has(a.id));
    const unanswered = list.filter((c) => !c.respuesta).length;
    html += '<div class="stat-tiles"><div class="stat-tile"><div class="l">CHECK-INS</div><div class="v">' + list.length + '<small>/' + st.roster.length + '</small></div><div class="d">ESTA SEMANA</div></div>' +
      '<div class="stat-tile"><div class="l">SIN RESPONDER</div><div class="v">' + unanswered + '</div><div class="d">' + (unanswered ? 'RESPÓNDELES HOY' : 'AL DÍA') + '</div></div>' +
      '<div class="stat-tile"><div class="l">CON MOLESTIAS</div><div class="v">' + list.filter((c) => c.molestias).length + '</div><div class="d">' + (list.some((c) => c.molestias) ? 'REVISA SU PLAN' : 'NINGUNO') + '</div></div></div>';
    html += list.length ? list.map((c) => ciCardHtml(c, { title: cName(c.athleteId), reply: true })).join('') : emptyCard('ti-clipboard-check', 'Nadie ha hecho su check-in esta semana', 'Los clientes lo ven en Progreso → Check-in. El domingo les llega un recordatorio si activaron las notificaciones.');
    if (pending.length) {
      html += '<div class="section-title-podio">FALTAN (' + pending.length + ')</div>' + pending.map((a) =>
        '<div class="who-registered-row" style="padding-left:0;padding-right:0;"><div class="who-avatar wa-gray">' + esc(initials(a.name)) + '</div><div class="who-info"><div class="who-name">' + esc(a.name) + ' <span class="pill pill-pending">PENDIENTE</span></div></div></div>').join('');
    }
    el.innerHTML = html;
  }
  const segCiEl = $('#seg-panel-checkins');
  segCiEl.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-ciwk]');
    if (!b || b.disabled) return;
    S.segCiOffset = Math.max(-11, Math.min(0, segCiOffsetSafe() + +b.dataset.ciwk));
    renderSegCheckins();
  });
  const segCiOffsetSafe = () => (S.segCiOffset == null ? 0 : S.segCiOffset);
  segCiEl.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const form = ev.target;
    if (form.dataset.form !== 'ci-reply') return;
    const card = form.closest('[data-ci-athlete]');
    const id = card.dataset.ciAthlete;
    const wk = S.segCi.week;
    const texto = form.elements.texto.value.trim();
    const btn = $('button[type="submit"]', form);
    btn.disabled = true;
    try {
      const r = await api('POST', 'checkin/reply?athleteId=' + id + '&date=' + wk, { texto });
      if (S.segCi && S.segCi.week === wk) S.segCi.list = S.segCi.list.map((c) => (c.athleteId === id ? r.checkin : c));
      toast(texto ? 'Respuesta enviada a ' + firstName(cName(id)) : 'Respuesta borrada', 'ti-send');
      renderSegCheckins();
    } catch (e) { btn.disabled = false; toastErr(e); }
  });
  // ---- cuerpo de cada cliente
  function bodyCtxCoach() {
    return {
      athleteId: S.segClient, doc: S.segBody, mine: false,
      alive: () => S.role === 'coach',
      set(doc) { S.segBody = doc; },
      render() { if (S.cview === 'seguimiento' && S.segTab === 'cuerpo') renderSegCuerpo(); },
    };
  }
  function renderSegCuerpo() {
    const el = $('#seg-panel-cuerpo');
    const roster = (S.cstate && S.cstate.roster) || [];
    if (S.segClient && !roster.some((a) => a.id === S.segClient)) S.segClient = '';
    let html = '<div class="form-field-group"><label class="form-label" for="seg-body-client">CLIENTE</label><select class="form-select" id="seg-body-client"><option value="">ELIGE UN CLIENTE…</option>' +
      roster.map((a) => '<option value="' + a.id + '"' + (a.id === S.segClient ? ' selected' : '') + '>' + esc(a.name.toUpperCase()) + '</option>').join('') + '</select></div><div id="seg-body"></div>';
    el.innerHTML = html;
    const box = $('#seg-body');
    if (!S.segClient) { box.innerHTML = emptyCard('ti-ruler-measure', 'Elige un cliente', 'Mira su peso, medidas y fotos de progreso. También puedes registrar sus medidas en la sesión.'); return; }
    if (S.segBodyFor !== S.segClient) {
      box.innerHTML = '<div class="loading-line">Cargando…</div>';
      const id = S.segClient;
      loadOnce('segbody' + id, () => api('GET', 'body?athleteId=' + id)).then((r) => {
        if (S.segClient !== id) return;
        S.segBody = r.body; S.segBodyFor = id;
        if (S.cview === 'seguimiento' && S.segTab === 'cuerpo') renderSegCuerpo();
      }, (e) => { if (!quietErr(e)) box.innerHTML = emptyCard('ti-wifi-off', 'No se pudo cargar', e.message); });
      return;
    }
    renderBodyPanel(box, bodyCtxCoach());
  }
  $('#seg-panel-cuerpo').addEventListener('change', (ev) => {
    if (ev.target.id !== 'seg-body-client') return;
    S.segClient = ev.target.value;
    S.segBodyFor = null; S.segBody = null;
    renderSegCuerpo();
  });
  bindBodyPanel($('#seg-panel-cuerpo'), bodyCtxCoach);
  // ---- comentarios de los clientes en sus ejercicios
  function renderSegComentarios() {
    const el = $('#seg-panel-comentarios');
    if (!S.feedback) el.innerHTML = '<div class="loading-line">Cargando…</div>';
    loadOnce('feedback', () => api('GET', 'feedback?days=14')).then((r) => {
      S.feedback = r.notas;
      if (S.cview !== 'seguimiento' || S.segTab !== 'comentarios') return;
      const list = S.feedback.filter((x) => cAthlete(x.athleteId));
      el.innerHTML = '<div class="fair-note" style="margin-bottom:6px;">Notas que tus clientes dejaron en sus ejercicios en los últimos 14 días.</div>' +
        (list.length ? list.map((x) => '<div class="note-row"><div class="who">' + esc(cName(x.athleteId)) + '</div><div class="meta">' + esc(x.ejercicio) + ' · ' + fmtDay(x.date) + ' · ' + agoDate(x.date) + '</div><div class="txt">' + esc(x.nota) + '</div></div>').join('')
          : emptyCard('ti-message-circle', 'Sin comentarios recientes', 'Cuando un cliente escriba una nota en un ejercicio (por ejemplo, una molestia), aparece aquí.'));
    }, (e) => { if (!quietErr(e)) el.innerHTML = emptyCard('ti-wifi-off', 'No se pudo cargar', e.message); });
  }

  /* ================================================================ COACH: mensualidades */
  function waLink(phone, msg) {
    let p = String(phone || '').replace(/[^\d]/g, '');
    if (p.length === 10 && p[0] === '3') p = '57' + p;
    return p.length >= 8 ? 'https://wa.me/' + p + '?text=' + encodeURIComponent(msg) : '';
  }
  function renderPagos() {
    const el = $('#pagos-content');
    const st = S.cstate;
    if (!st || !S.pagos) { el.innerHTML = '<div class="loading-line">Cargando…</div>'; return; }
    const t = today();
    const month = t.slice(0, 7);
    const byId = {};
    S.pagos.forEach((p) => { byId[p.athleteId] = p; });
    const rows = st.roster.map((a) => { const p = byId[a.id] || null; return { a, p, s: payStatus(p, t) }; })
      .sort((x, y) => x.s.rank - y.s.rank || x.s.d - y.s.d || x.a.name.localeCompare(y.a.name, 'es'));
    let cobrado = 0;
    S.pagos.forEach((p) => (p.historial || []).forEach((h) => { if (h.fecha && h.fecha.slice(0, 7) === month) cobrado += h.valor || 0; }));
    const late = rows.filter((r) => r.s.rank === 0).length;
    const soon = rows.filter((r) => r.s.rank === 1).length;
    const ok = rows.filter((r) => r.s.rank === 2).length;
    let html = '<div class="stat-tiles"><div class="stat-tile"><div class="l">COBRADO EN ' + MESES3[+month.slice(5) - 1] + '</div><div class="v" style="font-size:16px;">' + money(cobrado) + '</div><div class="d">REGISTRADO EN LA APP</div></div>' +
      '<div class="stat-tile"><div class="l">AL DÍA</div><div class="v">' + ok + '</div><div class="d">' + soon + ' POR VENCER</div></div>' +
      '<div class="stat-tile"><div class="l">VENCIDAS</div><div class="v" style="color:' + (late ? 'var(--danger)' : 'inherit') + ';">' + late + '</div><div class="d">' + (late ? 'COBRA POR WHATSAPP' : 'TODO EN ORDEN') + '</div></div></div>';
    if (!rows.length) { el.innerHTML = html + emptyCard('ti-users', 'Aún no hay clientes', 'Agrega clientes en la pestaña Clientes.'); return; }
    html += '<div class="fair-note" style="margin-bottom:6px;">Los clientes solo ven su fecha de pago (nunca los valores de otros).</div>';
    html += rows.map(({ a, p, s }) => {
      const open = S.payOpen === a.id;
      const d = p || { plan: 'Mensualidad', valor: '', ciclo: 30, proximoPago: '', telefono: '', nota: '', historial: [] };
      let body = '';
      if (open) {
        const msg = 'Hola ' + firstName(a.name) + ', ¿cómo vas? Te recuerdo que tu mensualidad de Team Carlos' + (d.valor ? ' (' + money(d.valor) + ')' : '') +
          (d.proximoPago ? (s.rank === 0 ? ' venció el ' : ' vence el ') + fmtLong(d.proximoPago).toLowerCase() : ' está pendiente') + '. ¡Gracias y a seguir dándole! 💪';
        const wa = waLink(d.telefono, msg);
        body = '<div class="pay-body"><form data-form="pay" data-id="' + a.id + '" autocomplete="off">' +
          '<div class="form-row" style="margin-bottom:10px;"><div><label class="form-label">PLAN</label><input class="form-input" name="plan" maxlength="40" value="' + esc(d.plan) + '" placeholder="Mensualidad"></div>' +
          '<div><label class="form-label">VALOR ($)</label><input class="form-input" name="valor" inputmode="numeric" maxlength="10" value="' + esc(d.valor || '') + '" placeholder="250000"></div></div>' +
          '<div class="form-row" style="margin-bottom:10px;"><div><label class="form-label">PRÓXIMO PAGO</label><input class="form-input" type="date" name="proximoPago" value="' + esc(d.proximoPago || '') + '"></div>' +
          '<div><label class="form-label">CADA (DÍAS)</label><input class="form-input" name="ciclo" inputmode="numeric" maxlength="3" value="' + esc(d.ciclo || 30) + '"></div></div>' +
          '<div class="form-field-group"><label class="form-label">WHATSAPP</label><input class="form-input" name="telefono" type="tel" inputmode="tel" maxlength="20" value="' + esc(d.telefono || '') + '" placeholder="300 123 4567"></div>' +
          '<div class="form-field-group"><label class="form-label">NOTA</label><input class="form-input" name="nota" maxlength="200" value="' + esc(d.nota || '') + '" placeholder="Ej: paga por Nequi"></div>' +
          '<div class="btn-row"><button type="submit" class="btn-ghost">GUARDAR DATOS</button><button type="button" class="btn-accent" data-pay="registrar">REGISTRAR PAGO HOY</button></div></form>' +
          (wa ? '<a class="wa-link" href="' + esc(wa) + '" target="_blank" rel="noopener noreferrer" style="margin-top:10px;"><i class="ti ti-brand-whatsapp" aria-hidden="true"></i>RECORDAR POR WHATSAPP</a>' : '<div class="fair-note" style="margin-top:10px;">Agrega su WhatsApp para enviarle el recordatorio con un toque.</div>') +
          ((d.historial || []).length ? '<div class="section-title-podio">PAGOS REGISTRADOS</div>' + d.historial.slice().reverse().slice(0, 8).map((h) =>
            '<div class="points-row"><span class="points-label">' + fmtShort(h.fecha) + (h.nota ? ' · ' + esc(h.nota) : '') + '</span><span class="points-value">' + money(h.valor) + '</span></div>').join('') : '') +
          (p ? '<button type="button" class="delete-btn" data-pay="delete" style="margin-top:12px;">QUITAR DATOS DE PAGO</button>' : '') + '</div>';
      }
      return '<div class="pay-row' + (open ? ' open' : '') + '" data-id="' + a.id + '"><button type="button" class="pay-head" data-pay="toggle" aria-expanded="' + open + '"><div class="who-avatar ' + (s.rank === 0 ? 'wa-gray' : 'wa-green') + '">' + esc(initials(a.name)) + '</div>' +
        '<div class="client-info"><div class="client-name">' + esc(a.name) + '</div><div class="client-sub"><span class="pill ' + s.cls + '">' + esc(s.label) + '</span>' + (p && p.plan ? ' · ' + esc(p.plan.toUpperCase()) : '') + '</div></div>' +
        '<div class="pay-amount">' + (p && p.valor ? money(p.valor) : '—') + '</div></button>' + body + '</div>';
    }).join('');
    el.innerHTML = html;
  }
  const pagosEl = $('#pagos-content');
  pagosEl.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-pay]');
    if (!b) return;
    const row = b.closest('.pay-row');
    const id = row && row.dataset.id;
    if (!id) return;
    const act = b.dataset.pay;
    if (act === 'toggle') { S.payOpen = S.payOpen === id ? null : id; renderPagos(); return; }
    if (act === 'registrar') {
      const form = $('form[data-form="pay"]', row);
      const valor = pesos(form.elements.valor.value);
      if (!valor) { toast('Escribe el valor de la mensualidad', 'ti-alert-triangle', true); return; }
      b.disabled = true;
      try {
        await api('PUT', 'pay?athleteId=' + id, payPayload(form));
        const r = await api('POST', 'pay/registrar?athleteId=' + id, { fecha: today(), valor });
        upsertPago(id, r.pago);
        toast('Pago registrado · próximo: ' + fmtDay(r.pago.proximoPago), 'ti-cash');
        renderPagos();
      } catch (e) { b.disabled = false; toastErr(e); }
      return;
    }
    if (act === 'delete') {
      if (!confirmTap(b, '¿QUITAR? TOCA OTRA VEZ')) return;
      try {
        await api('DELETE', 'pay?athleteId=' + id);
        S.pagos = S.pagos.filter((p) => p.athleteId !== id);
        toast('Datos de pago quitados');
        renderPagos();
      } catch (e) { toastErr(e); }
    }
  });
  const pesos = (v) => parseInt(String(v || '').replace(/[^\d]/g, ''), 10) || 0;
  function payPayload(form) {
    return {
      plan: form.elements.plan.value.trim(), valor: pesos(form.elements.valor.value), ciclo: parseInt(form.elements.ciclo.value, 10) || 30,
      proximoPago: form.elements.proximoPago.value || null, telefono: form.elements.telefono.value.trim(), nota: form.elements.nota.value.trim(),
    };
  }
  function upsertPago(id, pago) {
    S.pagos = (S.pagos || []).filter((p) => p.athleteId !== id).concat([Object.assign({ athleteId: id }, pago)]);
  }
  pagosEl.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const form = ev.target;
    if (form.dataset.form !== 'pay') return;
    const id = form.dataset.id;
    const btn = $('button[type="submit"]', form);
    btn.disabled = true;
    try {
      const r = await api('PUT', 'pay?athleteId=' + id, payPayload(form));
      upsertPago(id, r.pago);
      toast('Datos guardados');
      renderPagos();
    } catch (e) { btn.disabled = false; toastErr(e); }
  });

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
