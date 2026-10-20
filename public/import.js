// Importador de rutinas de Team Carlos.
// Convierte lo que el coach ya tiene (filas de Excel o Google Sheets, un .xlsx o .csv,
// texto de WhatsApp o notas, un PDF o una imagen) en un plan semanal de la app.
// Todo corre en el navegador: nada sale del teléfono o del computador del coach.
(function () {
  'use strict';

  /* ------------------------------------------------------------ utilidades */
  const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const clean = (s) => String(s == null ? '' : s).replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
  const DOWS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  const DOW_RE = /(^|[^a-záéíóúñü])(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|lun|mar|mi[eé]|jue|vie|s[aá]b|dom)(?![a-záéíóúñü])\.?/i;
  // lo que puede ir antes del día en un encabezado: "Día", "Rutina del", "Semana 2 -", emojis o viñetas
  const DOW_PREFIX_RE = /^(?:(?:d[ií]a|rutina|entreno|entrenamiento|sesi[oó]n|semana\s*\d+)(?:\s+(?:de|del))?)?$/i;
  const DAYNUM_RE = /^(?:d[ií]a|day|sesi[oó]n|rutina|entreno|entrenamiento)\s*(\d)\b/i;
  const SHORT = { lun: 0, mar: 1, mie: 2, jue: 3, vie: 4, sab: 5, dom: 6 };
  function dowOf(word) {
    const w = fold(word).replace(/\./g, '');
    const i = DOWS.indexOf(w);
    if (i !== -1) return i;
    return Object.prototype.hasOwnProperty.call(SHORT, w) ? SHORT[w] : -1;
  }
  const isCaps = (s) => /[A-ZÁÉÍÓÚÑ]/.test(s) && s === s.toUpperCase();
  const words = (s) => clean(s).split(' ').filter(Boolean).length;
  const dash = (s) => s.replace(/\s*(?:-|–|—|a)\s*(?=\d)/g, '–');
  function normTime(num, unit) {
    const u = fold(unit || '');
    const n = dash(String(num).replace(/\s+/g, ''));
    if (/^m/.test(u) || u === "'") return n + ' min';
    return n + ' seg';
  }

  /* ------------------------------------------------------------ un ejercicio en una línea */
  const NUM = String.raw`\d{1,3}(?:\s*(?:-|–|—|a)\s*\d{1,3})?`;
  const TUNIT = String.raw`(?:seg(?:undos?)?|s|min(?:utos?)?|''|"|'|’’)`;
  const RE_SXR = new RegExp(String.raw`(\d{1,2})\s*(?:x|×|\*|por)\s*(${NUM})\s*(${TUNIT}|reps?|repeticiones)?(?![\w])`, 'i');
  const RE_SERIES_DE = new RegExp(String.raw`(\d{1,2})\s*(?:series|sets|rondas)\s*(?:de|x|×)?\s*(${NUM})?\s*(${TUNIT}|reps?|repeticiones)?`, 'i');
  const RE_SERIES_KV = /(?:series|sets)\s*[:=]\s*(\d{1,2})/i;
  const RE_REPS_KV = new RegExp(String.raw`(?:reps?|repeticiones)\s*[:=]\s*(${NUM})\s*(${TUNIT})?`, 'i');
  const RE_REST_KW = new RegExp(String.raw`(?:desc(?:anso)?\.?|rest|pausa|recuperaci[oó]n)\s*[:=\-]?\s*(\d+(?:[.,]\d+)?(?:\s*(?:-|–|a)\s*\d+(?:[.,]\d+)?)?)\s*(${TUNIT})`, 'i');
  const RE_TIME = new RegExp(String.raw`(\d+(?:[.,]\d+)?(?:\s*(?:-|–|a)\s*\d+(?:[.,]\d+)?)?)\s*(${TUNIT})(?![\w])`, 'i');
  const LIBRE_RE = /movilidad|estiramient|foam|roller|lacrosse|plancha|respiraci|caminata|cardio|bicicleta|el[ií]ptica|trote|saltar la cuerda|liberaci/i;

  function parseExercise(raw) {
    let line = clean(raw).replace(/^[\-•·*►▪➤✓✔→]+\s*/, '').replace(/^\(?\d{1,2}[.)]\s+/, '');
    const cut = [];
    let series = '', reps = '', descanso = '', found = false;
    let m = RE_SXR.exec(line);
    if (m) {
      series = m[1];
      reps = m[3] && !/^rep/i.test(m[3]) ? normTime(m[2], m[3]) : dash(m[2].replace(/\s+/g, ''));
      cut.push([m.index, m.index + m[0].length]);
      found = true;
    } else if ((m = RE_SERIES_DE.exec(line))) {
      series = m[1];
      if (m[2]) reps = m[3] && !/^rep/i.test(m[3]) ? normTime(m[2], m[3]) : dash(m[2].replace(/\s+/g, ''));
      cut.push([m.index, m.index + m[0].length]);
      found = true;
    } else {
      const ms = RE_SERIES_KV.exec(line);
      const mr = RE_REPS_KV.exec(line);
      if (ms) { series = ms[1]; cut.push([ms.index, ms.index + ms[0].length]); found = true; }
      if (mr) { reps = mr[2] ? normTime(mr[1], mr[2]) : dash(mr[1].replace(/\s+/g, '')); cut.push([mr.index, mr.index + mr[0].length]); found = true; }
    }
    const masked = () => {
      let s = line;
      cut.slice().sort((a, b) => b[0] - a[0]).forEach(([a, b]) => { s = s.slice(0, a) + ' '.repeat(b - a) + s.slice(b); });
      return s;
    };
    let mk = RE_REST_KW.exec(masked());
    if (mk) { descanso = normTime(mk[1], mk[2]); cut.push([mk.index, mk.index + mk[0].length]); found = true; }
    else {
      const mt = RE_TIME.exec(masked());
      if (mt) {
        if (!reps && !series) reps = normTime(mt[1], mt[2]);
        else descanso = normTime(mt[1], mt[2]);
        cut.push([mt.index, mt.index + mt[0].length]);
        found = true;
      }
    }
    if (/descanso|rest/i.test(line) && !descanso) {
      const mt2 = RE_TIME.exec(masked());
      if (mt2) { descanso = normTime(mt2[1], mt2[2]); cut.push([mt2.index, mt2.index + mt2[0].length]); }
    }
    // nombre: lo que va antes de la primera cifra reconocida
    const first = cut.length ? Math.min.apply(null, cut.map((c) => c[0])) : line.length;
    let nombre = clean(line.slice(0, first)).replace(/[\s:;,|·\-–—(]+$/, '');
    let rest = clean(masked().slice(first)).replace(/^[\s:;,|·\-–—)]+/, '');
    if (!nombre && rest) {
      const mm = /^[^\d(]{3,}/.exec(rest.replace(/\b(?:series|sets|reps?|repeticiones|desc(?:anso)?\.?|rest)\b/gi, ' '));
      if (mm) { nombre = clean(mm[0]).replace(/[\s:;,|·\-–—]+$/, ''); rest = clean(rest.replace(mm[0], '')); }
    }
    rest = clean(rest.replace(/\b(?:series|sets|reps?|repeticiones|desc(?:anso)?\.?|rest|de)\b/gi, ' ').replace(/[()|·,;:\-–—]+/g, ' '));
    const nota = /[a-záéíóúñ]{3,}/i.test(rest) ? rest.slice(0, 120) : '';
    nombre = nombre.replace(/^\(?\d{1,2}[.)]\s*/, '').slice(0, 80);
    const modo = /seg|min/.test(reps) || LIBRE_RE.test(nombre) ? 'libre' : 'carga';
    return { ex: { id: '', nombre, series, reps, descanso, modo, nota, video: '', alt: '' }, found };
  }

  /* ------------------------------------------------------------ texto: WhatsApp, notas, PDF, imagen */
  const SECTION_RE = /^(movilidad|estiramientos?|calentamiento|activaci[oó]n|core|abdomen|abdominales|cardio|liberaci[oó]n|finisher|circuito|bloque|parte|superserie|biserie|triserie|enfriamiento|vuelta a la calma|t[eé]cnica|potencia|accesorios?)\b/i;
  const ENFOQUE_RE = /^(fuerza|hipertrofia|resistencia|recuperaci[oó]n|prevenci[oó]n|potencia|definici[oó]n|volumen|tonificaci[oó]n|acondicionamiento)\b/i;
  const TIPS_RE = /^(consejos?|recomendaciones|progresi[oó]n de cargas|manejo de la fatiga|notas? (?:del coach|generales|finales)|tips|importante|observaciones)\b/i;
  const META_RE = /^(enfoque|frecuencia|nivel|objetivo|edad|unidad)\s*[:\-]\s*(.+)$/i;

  function newDay(dow, titulo) { return { dow, titulo: titulo || '', subtitulo: '', duracion: '', rpe: '', nota: '', secciones: [{ titulo: '', nota: '', ejercicios: [] }] }; }
  function curSec(day) { return day.secciones[day.secciones.length - 1]; }
  function dayHeader(line) {
    const l = clean(line).replace(/^[\-•·*#]+\s*/, '');
    if (RE_SXR.test(l) || words(l) > 9) return null;
    let m = DAYNUM_RE.exec(l);
    if (m) return { num: +m[1], titulo: clean(l.slice(m[0].length).replace(/^[\s:\-–—|·.)]+/, '')) };
    m = DOW_RE.exec(l);
    if (!m) return null;
    const at = m.index + m[1].length;
    const isFull = DOWS.indexOf(fold(m[2])) !== -1;
    // el día tiene que abrir la línea: "Mismo calentamiento del martes" o "descansa el domingo" no son días
    const lead = clean(l.slice(0, at).replace(/[^\p{L}\p{N}\s]/gu, ' '));
    if (isFull ? !DOW_PREFIX_RE.test(lead) : lead !== '') return null;
    const after = clean(l.slice(m.index + m[0].length)).replace(/^[\s:\-–—|·.)]+/, '').replace(/[()]/g, '').trim();
    // "Lunes y miércoles" o "lunes a viernes" no es un día de plan
    if (/^(y|a|al|e)\b/i.test(after)) return null;
    return { dow: dowOf(m[2]), titulo: /[\p{L}\p{N}]/u.test(after) ? after : '' };
  }

  function parseText(text) {
    const plan = { enfoque: '', frecuencia: '', nivel: '', objetivo: '', edad: '', unidad: '', dias: [], consejos: [] };
    const warnings = [];
    const lines = String(text || '').replace(/\r/g, '').split('\n').map(clean).filter(Boolean);
    let day = null;
    let tips = null;
    const used = new Set();
    const pushDay = (d) => {
      const prev = plan.dias.find((x) => x.dow === d.dow);
      if (prev) { day = prev; return; }
      plan.dias.push(d);
      used.add(d.dow);
      day = d;
    };
    const nextFree = () => { for (let i = 0; i < 7; i++) if (!used.has(i)) return i; return -1; };
    lines.forEach((line, i) => {
      const meta = META_RE.exec(line);
      if (meta && !day) {
        const k = fold(meta[1]);
        const v = clean(meta[2]);
        if (k === 'edad') plan.edad = (v.match(/\d{1,3}/) || [''])[0];
        else if (k === 'unidad') plan.unidad = /lb|libra/i.test(v) ? 'lb' : 'kg';
        else if (k === 'nivel') plan.nivel = /princip/i.test(v) ? 'PRINCIPIANTE' : /interm/i.test(v) ? 'INTERMEDIO' : /avanz/i.test(v) ? 'AVANZADO' : '';
        else plan[k] = v.slice(0, k === 'objetivo' ? 160 : 60);
        return;
      }
      const dh = dayHeader(line);
      if (dh) {
        tips = null;
        let dow = dh.dow != null ? dh.dow : -1;
        if (dh.num) dow = nextFree();
        if (dow < 0) { warnings.push('Hay más de 7 días; se ignoró: "' + line + '"'); day = null; return; }
        pushDay(newDay(dow, dh.titulo.toUpperCase().slice(0, 60)));
        return;
      }
      if (TIPS_RE.test(line) && words(line) <= 6) {
        tips = { titulo: line.replace(/[:.]+$/, '').toUpperCase().slice(0, 40), items: [] };
        plan.consejos.push(tips);
        day = null;
        return;
      }
      if (tips) {
        if (isCaps(line) && words(line) <= 5 && !/\d/.test(line)) {
          tips = { titulo: line.replace(/[:.]+$/, '').slice(0, 40), items: [] };
          plan.consejos.push(tips);
        } else tips.items.push(line.replace(/^[\-•·*►▪➤✓✔]+\s*/, '').slice(0, 160));
        return;
      }
      if (!day) {
        if (/plan semanal|rutina semanal|entrenamiento personalizado/i.test(line)) return;
        warnings.push('Antes del primer día, no se usó: "' + line + '"');
        return;
      }
      const sec = curSec(day);
      const noEx = !day.secciones.some((s) => s.ejercicios.length);
      const hasSets = RE_SXR.test(line) || RE_SERIES_DE.test(line);
      // duración y RPE del día: solo cuando la línea no dice nada más ("Caminadora 10 min" es un ejercicio)
      const rpe = /\brpe\s*[:\-]?\s*(\d+(?:[.,]\d)?(?:\s*(?:-|–|a)\s*\d+(?:[.,]\d)?)?)/i.exec(line);
      const dur = /(?:duraci[oó]n\s*[:\-]?\s*)?(\d{2,3}(?:\s*(?:-|–|a)\s*\d{2,3})?)\s*(?:min(?:utos)?)\b/i.exec(line);
      if (!hasSets && (rpe || dur)) {
        let rest = line;
        if (dur) rest = rest.replace(dur[0], '');
        if (rpe) rest = rest.replace(rpe[0], '');
        rest = fold(rest).replace(/duracion|aprox(?:imadamente)?|total|sesion|tiempo|del dia|de entreno|entreno/g, '');
        if (!/[a-z]/.test(rest) && (!dur || rpe || noEx || /duraci/i.test(line))) {
          if (rpe) day.rpe = dash(rpe[1].replace(/\s+/g, ''));
          if (dur) day.duracion = dash(dur[1].replace(/\s+/g, '')) + ' min';
          return;
        }
      }
      // títulos y secciones
      if (!hasSets && !/\d/.test(line.replace(/\(.*\)/, '')) && words(line) <= 7) {
        const nextIsEx = lines[i + 1] && !dayHeader(lines[i + 1]) && !TIPS_RE.test(lines[i + 1]);
        if (!day.titulo && noEx) { day.titulo = line.replace(/[:.]+$/, '').toUpperCase().slice(0, 60); return; }
        if (noEx && !day.subtitulo && !sec.titulo && ENFOQUE_RE.test(line)) { day.subtitulo = line.toUpperCase().slice(0, 60); return; }
        const bare = line.replace(/\(.*\)/, '').trim();
        if (nextIsEx && (/:$/.test(line) || SECTION_RE.test(line) || (isCaps(bare) && words(bare) <= 5))) {
          const par = /\(([^)]+)\)/.exec(line);
          const titulo = line.replace(/\(.*\)/, '').replace(/[:.]+$/, '').trim().toUpperCase().slice(0, 60);
          const s = { titulo, nota: par ? dash(clean(par[1])).slice(0, 40) : '', ejercicios: [], _raw: (/:$/.test(line) || SECTION_RE.test(line)) ? '' : line };
          if (!sec.ejercicios.length && !sec.titulo) day.secciones[day.secciones.length - 1] = s; else day.secciones.push(s);
          return;
        }
      }
      const r = parseExercise(line);
      if (!r.ex.nombre) { warnings.push('No encontré el nombre del ejercicio en: "' + line + '"'); return; }
      curSec(day).ejercicios.push(r.ex);
    });
    return finish(plan, warnings);
  }

  /* ------------------------------------------------------------ tablas: Excel, Google Sheets, CSV */
  const HEAD = {
    dia: /^(d[ií]a|day|fecha|d[ií]a de la semana)$/, titulo: /^(t[ií]tulo|grupo|grupo muscular|m[uú]sculos?|rutina|enfoque del d[ií]a|sesi[oó]n|entreno|nombre del d[ií]a)$/,
    seccion: /^(secci[oó]n|bloque|parte|fase)$/, nombre: /^(ejercicio|ejercicios|movimiento|exercise|nombre)$/,
    series: /^(series|sets|serie|rondas)$/, reps: /^(reps?|repeticiones|rep\.?|tiempo|duraci[oó]n del ejercicio)$/,
    descanso: /^(descanso|desc\.?|rest|pausa|recuperaci[oó]n)$/, nota: /^(notas?|observaciones|indicaciones|comentarios?|tempo|carga|peso|rir|rpe)$/,
    video: /^(video|v[ií]deo|link|enlace|url|t[eé]cnica)$/, alt: /^(alternativa|sustituto|reemplazo|opci[oó]n b)$/,
  };
  function headerMap(row) {
    const map = {};
    let hits = 0;
    row.forEach((c, i) => {
      const f = fold(clean(c)).replace(/[:.]$/, '');
      Object.keys(HEAD).forEach((k) => {
        if (map[k] === undefined && HEAD[k].test(f)) { map[k] = i; hits++; }
      });
    });
    return hits >= 2 && map.nombre !== undefined ? map : null;
  }
  function parseCells(cells) {
    // filas sin encabezado: el primer texto es el ejercicio, luego series, reps y descanso
    const c = cells.map(clean).filter(Boolean);
    const joined = c.join(' ');
    if (RE_SXR.test(joined) || RE_SERIES_DE.test(joined)) return parseExercise(joined).ex;
    const ex = { id: '', nombre: '', series: '', reps: '', descanso: '', modo: 'carga', nota: '', video: '', alt: '' };
    const rest = [];
    c.forEach((v) => {
      if (!ex.nombre && /[a-záéíóúñ]{3,}/i.test(v) && !RE_TIME.test(v)) { ex.nombre = v.slice(0, 80); return; }
      if (/^https?:\/\//i.test(v)) { ex.video = v; return; }
      if (!ex.series && /^\d{1,2}$/.test(v)) { ex.series = v; return; }
      const t = RE_TIME.exec(v);
      if (!ex.reps && (new RegExp('^' + NUM + '$').test(v) || (t && !ex.series))) { ex.reps = t ? normTime(t[1], t[2]) : dash(v.replace(/\s+/g, '')); return; }
      if (!ex.descanso && t) { ex.descanso = normTime(t[1], t[2]); return; }
      rest.push(v);
    });
    ex.nota = rest.join(' · ').slice(0, 120);
    ex.modo = /seg|min/.test(ex.reps) || LIBRE_RE.test(ex.nombre) ? 'libre' : 'carga';
    return ex;
  }
  function rowsToText(rows) {
    return rows.map((r) => r.map(clean).filter(Boolean).join('  ')).filter(Boolean).join('\n');
  }
  function parseRows(rowsIn) {
    const rows = rowsIn.map((r) => r.map((c) => clean(c))).filter((r) => r.some(Boolean));
    if (!rows.length) return finish({ dias: [], consejos: [] }, ['No hay filas para importar.']);
    // días en columnas (como el plan en imagen): una columna por día
    for (let h = 0; h < Math.min(rows.length, 6); h++) {
      const dayCols = rows[h].map((c, i) => ({ i, d: dayHeader(c) })).filter((x) => x.d && x.d.dow != null && x.d.dow >= 0 && words(rows[h][x.i]) <= 6);
      if (dayCols.length >= 2) {
        const text = dayCols.map(({ i }) => rows.slice(h).map((r) => r[i] || '').filter(Boolean).join('\n')).join('\n');
        return parseText(text);
      }
    }
    const hi = rows.findIndex((r) => headerMap(r));
    if (hi === -1) {
      // sin encabezado: se lee como texto, fila por fila
      const plan = { dias: [], consejos: [] };
      const warnings = [];
      let day = null;
      const used = new Set();
      const nextFree = () => { for (let i = 0; i < 7; i++) if (!used.has(i)) return i; return -1; };
      rows.forEach((r) => {
        const cells = r.filter(Boolean);
        const dh = dayHeader(cells[0]);
        if (dh && (cells.length === 1 || cells.length === 2 && !/\d/.test(cells[1]))) {
          let dow = dh.dow != null ? dh.dow : nextFree();
          if (dh.num) dow = nextFree();
          if (dow < 0) return;
          const t = (dh.titulo || cells[1] || '').toUpperCase().slice(0, 60);
          day = plan.dias.find((x) => x.dow === dow) || (plan.dias.push(newDay(dow, t)), plan.dias[plan.dias.length - 1]);
          used.add(dow);
          return;
        }
        if (dh && cells.length > 2) {
          // "Lunes | Press banca | 4 | 8-10" en la misma fila
          let dow = dh.dow != null ? dh.dow : nextFree();
          day = plan.dias.find((x) => x.dow === dow) || (plan.dias.push(newDay(dow, dh.titulo.toUpperCase())), plan.dias[plan.dias.length - 1]);
          used.add(dow);
          const ex = parseCells(cells.slice(1));
          if (ex.nombre) curSec(day).ejercicios.push(ex);
          return;
        }
        if (!day) { warnings.push('Antes del primer día, no se usó: "' + cells.join(' ') + '"'); return; }
        if (cells.length === 1 && !/\d/.test(cells[0]) && words(cells[0]) <= 6 && (isCaps(cells[0]) || SECTION_RE.test(cells[0]))) {
          if (!day.titulo) { day.titulo = cells[0].toUpperCase().slice(0, 60); return; }
          day.secciones.push({ titulo: cells[0].toUpperCase().slice(0, 60), nota: '', ejercicios: [] });
          return;
        }
        const ex = parseCells(cells);
        if (ex.nombre) curSec(day).ejercicios.push(ex);
        else warnings.push('Fila sin ejercicio: "' + cells.join(' ') + '"');
      });
      return finish(plan, warnings);
    }
    const map = headerMap(rows[hi]);
    const plan = { dias: [], consejos: [] };
    const warnings = [];
    let day = null;
    let secName = null;
    const used = new Set();
    const nextFree = () => { for (let i = 0; i < 7; i++) if (!used.has(i)) return i; return -1; };
    const get = (r, k) => (map[k] !== undefined ? clean(r[map[k]] || '') : '');
    rows.slice(hi + 1).forEach((r) => {
      const d = get(r, 'dia');
      if (d) {
        const dh = dayHeader(d) || (/^\d$/.test(d) ? { num: +d, titulo: '' } : null);
        let dow = dh ? (dh.num ? -1 : dh.dow) : -1;
        const existing = dh && dh.num ? plan.dias.find((x) => x._key === 'n' + dh.num) : plan.dias.find((x) => x.dow === dow);
        if (existing) day = existing;
        else if (dh) {
          if (dow < 0) dow = nextFree();
          if (dow < 0) return;
          day = newDay(dow, '');
          if (dh.num) day._key = 'n' + dh.num;
          plan.dias.push(day);
          used.add(dow);
          secName = null;
        }
      }
      if (!day) {
        if (get(r, 'nombre')) { day = newDay(nextFree(), ''); plan.dias.push(day); used.add(day.dow); }
        else return;
      }
      const t = get(r, 'titulo');
      if (t && !day.titulo) day.titulo = t.toUpperCase().slice(0, 60);
      const s = get(r, 'seccion');
      if (s && s !== secName) {
        secName = s;
        const sec = { titulo: s.toUpperCase().slice(0, 60), nota: '', ejercicios: [] };
        if (!curSec(day).ejercicios.length && !curSec(day).titulo) day.secciones[day.secciones.length - 1] = sec; else day.secciones.push(sec);
      }
      const nombre = get(r, 'nombre');
      if (!nombre) return;
      const sr = get(r, 'series');
      const rp = get(r, 'reps');
      const ex = parseExercise([nombre, /x|×/i.test(sr) ? sr : (sr && rp ? sr + 'x' + rp : ''), !/x|×/i.test(sr) && !(sr && rp) ? rp : '', get(r, 'descanso') ? 'descanso ' + get(r, 'descanso') : ''].filter(Boolean).join(' ')).ex;
      ex.nombre = nombre.slice(0, 80);
      if (!ex.series && /^\d{1,2}$/.test(sr)) ex.series = sr;
      if (!ex.reps && rp) ex.reps = dash(rp).slice(0, 16);
      if (!ex.descanso && get(r, 'descanso')) ex.descanso = get(r, 'descanso').slice(0, 16);
      ex.nota = get(r, 'nota').slice(0, 120);
      ex.video = get(r, 'video');
      ex.alt = get(r, 'alt').slice(0, 80);
      ex.modo = /seg|min/.test(ex.reps) || LIBRE_RE.test(ex.nombre) ? 'libre' : 'carga';
      curSec(day).ejercicios.push(ex);
    });
    plan.dias.forEach((x) => { delete x._key; });
    return finish(plan, warnings);
  }

  const MAX_SEC_EX = 20, MAX_DAY_EX = 40, MAX_SECS = 8;
  function finish(plan, warnings) {
    plan.dias = (plan.dias || []).map((d) => {
      // "PRESS DE BANCA" sin números se leyó como título; si no quedó nada debajo, es un ejercicio
      const secs = [];
      d.secciones.forEach((s) => {
        if (!s.ejercicios.length && s._raw) {
          const ex = parseExercise(s._raw).ex;
          if (!ex.nombre) ex.nombre = s._raw.replace(/[:.]+$/, '').slice(0, 80);
          if (secs.length) secs[secs.length - 1].ejercicios.push(ex); else secs.push({ titulo: '', nota: '', ejercicios: [ex] });
          return;
        }
        delete s._raw;
        secs.push(s);
      });
      // la app guarda hasta 20 ejercicios por sección: una sección más larga se parte en dos
      const out = [];
      secs.filter((s) => s.ejercicios.length).forEach((s) => {
        delete s._raw;
        for (let k = 0; k < s.ejercicios.length; k += MAX_SEC_EX) {
          out.push({ titulo: k ? (s.titulo || 'EJERCICIOS') + ' (' + (k / MAX_SEC_EX + 1) + ')' : s.titulo, nota: k ? '' : s.nota, ejercicios: s.ejercicios.slice(k, k + MAX_SEC_EX) });
        }
      });
      d.secciones = out;
      const n = out.reduce((a, s) => a + s.ejercicios.length, 0);
      if (n > MAX_DAY_EX || out.length > MAX_SECS) warnings.push((d.titulo || 'Un día') + ' tiene ' + n + ' ejercicios en ' + out.length + ' secciones: la app guarda hasta ' + MAX_DAY_EX + ' ejercicios y ' + MAX_SECS + ' secciones por día. Pásalos a otro día.');
      return d;
    }).filter((d) => d.secciones.length).sort((a, b) => a.dow - b.dow);
    plan.consejos = (plan.consejos || []).filter((c) => c.items.length).slice(0, 3);
    let exercises = 0, sinSeries = 0;
    plan.dias.forEach((d) => d.secciones.forEach((s) => s.ejercicios.forEach((e) => { exercises++; if (!e.series && !e.reps) sinSeries++; })));
    if (!plan.dias.length) warnings.unshift('No encontré días con ejercicios. Revisa que cada día empiece con su nombre (por ejemplo "LUNES - PECHO") y que cada ejercicio vaya en su propia línea.');
    return { plan, warnings: warnings.slice(0, 30), stats: { dias: plan.dias.length, exercises, sinSeries } };
  }

  /* ------------------------------------------------------------ pegar: ¿tabla o texto? */
  function splitDelimited(text, delim) {
    const rows = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch;
      } else if (ch === '"' && !cell) q = true;
      else if (ch === delim) { row.push(cell); cell = ''; }
      else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (ch !== '\r') cell += ch;
    }
    row.push(cell); rows.push(row);
    return rows;
  }
  function parsePasted(text) {
    const t = String(text || '');
    if ((t.match(/\t/g) || []).length >= 2) return parseRows(splitDelimited(t, '\t'));
    return parseText(t);
  }
  function parseCsv(text) {
    const first = String(text).split('\n')[0] || '';
    const delim = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : (first.includes('\t') ? '\t' : ',');
    return parseRows(splitDelimited(String(text).replace(/^\ufeff/, ''), delim));
  }

  /* ------------------------------------------------------------ .xlsx sin librerías externas */
  const MAX_XLSX = 15 * 1024 * 1024, MAX_PART = 40 * 1024 * 1024;
  const TOO_BIG = 'El Excel es demasiado grande. Copia solo las filas de la rutina y pégalas.';
  async function inflate(bytes, method, budget) {
    if (method === 0) { budget.left -= bytes.length; if (budget.left < 0) throw new Error(TOO_BIG); return bytes; }
    if (method !== 8 || typeof DecompressionStream === 'undefined') throw new Error('Este navegador no puede abrir archivos de Excel. Copia las filas y pégalas.');
    const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
    const chunks = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      budget.left -= value.length;
      if (total > MAX_PART || budget.left < 0) { try { reader.cancel(); } catch (e) { /* nada */ } throw new Error(TOO_BIG); }
      chunks.push(value);
    }
    const out = new Uint8Array(total);
    let o = 0;
    chunks.forEach((c) => { out.set(c, o); o += c.length; });
    return out;
  }
  async function unzip(buf, wanted) {
    if (buf.byteLength > MAX_XLSX) throw new Error(TOO_BIG);
    const budget = { left: MAX_PART * 2 };
    const u8 = new Uint8Array(buf);
    const dv = new DataView(buf);
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('El archivo no parece un Excel (.xlsx).');
    const count = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    const out = {};
    const dec = new TextDecoder();
    for (let n = 0; n < count; n++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true);
      const csize = dv.getUint32(p + 20, true);
      const nlen = dv.getUint16(p + 28, true), elen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
      const off = dv.getUint32(p + 42, true);
      const name = dec.decode(u8.subarray(p + 46, p + 46 + nlen));
      p += 46 + nlen + elen + clen;
      if (!wanted(name)) continue;
      const lnl = dv.getUint16(off + 26, true), lel = dv.getUint16(off + 28, true);
      const start = off + 30 + lnl + lel;
      out[name] = dec.decode(await inflate(u8.subarray(start, start + csize), method, budget));
    }
    return out;
  }
  const colIndex = (ref) => { let n = 0; const m = /^[A-Z]+/.exec(ref) || ['A']; for (const ch of m[0]) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
  async function readXlsx(file) {
    const files = await unzip(await file.arrayBuffer(), (n) => /^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|styles\.xml|worksheets\/sheet\d+\.xml)$/.test(n));
    const parse = (s) => new DOMParser().parseFromString(s || '<x/>', 'application/xml');
    const shared = [];
    if (files['xl/sharedStrings.xml']) {
      parse(files['xl/sharedStrings.xml']).querySelectorAll('si').forEach((si) => {
        shared.push(Array.from(si.getElementsByTagName('t')).map((t) => t.textContent).join(''));
      });
    }
    // formatos de fecha y hora: Excel convierte "8-10" en el 8 de octubre y "1:30" en una hora
    const fmtCodes = {};
    const xfFmt = [];
    if (files['xl/styles.xml']) {
      const st = parse(files['xl/styles.xml']);
      Array.from(st.getElementsByTagName('numFmt')).forEach((f) => { fmtCodes[f.getAttribute('numFmtId')] = f.getAttribute('formatCode') || ''; });
      const xfs = st.getElementsByTagName('cellXfs')[0];
      if (xfs) Array.from(xfs.getElementsByTagName('xf')).forEach((x) => xfFmt.push(x.getAttribute('numFmtId') || '0'));
    }
    const kindOf = (styleIdx) => {
      const id = xfFmt[styleIdx];
      if (id == null) return null;
      const n = +id;
      if (n >= 18 && n <= 21 || n >= 45 && n <= 47) return { time: true };
      if (n >= 14 && n <= 17 || n === 22) return { mFirst: false };
      const code = (fmtCodes[id] || '').replace(/"[^"]*"|\[[^\]]*\]|\\./g, '').toLowerCase();
      if (!/[dmyhs]/.test(code)) return null;
      if (!/[dy]/.test(code)) return { time: true };
      return { mFirst: code.indexOf('m') !== -1 && code.indexOf('m') < code.indexOf('d') };
    };
    const fromSerial = (num, kind) => {
      if (kind.time && num < 1) {
        const mins = Math.round(num * 24 * 60);
        return Math.floor(mins / 60) + ':' + String(mins % 60).padStart(2, '0');
      }
      const d = new Date(Date.UTC(1899, 11, 30) + Math.round(num) * 86400000);
      const a = d.getUTCDate(), b = d.getUTCMonth() + 1;
      return kind.mFirst ? b + '-' + a : a + '-' + b;
    };
    const wb = parse(files['xl/workbook.xml']);
    const rels = parse(files['xl/_rels/workbook.xml.rels']);
    const relMap = {};
    rels.querySelectorAll('Relationship').forEach((r) => { relMap[r.getAttribute('Id')] = r.getAttribute('Target'); });
    const sheets = Array.from(wb.getElementsByTagName('sheet')).map((s, i) => {
      const rid = s.getAttribute('r:id') || s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
      let target = relMap[rid] || ('worksheets/sheet' + (i + 1) + '.xml');
      target = target.replace(/^\/?xl\//, '');
      return { name: s.getAttribute('name') || ('Hoja ' + (i + 1)), path: 'xl/' + target };
    }).filter((s) => files[s.path]);
    return sheets.map((s) => {
      const doc = parse(files[s.path]);
      const rows = [];
      Array.from(doc.getElementsByTagName('row')).forEach((row) => {
        const r = [];
        let col = -1;
        Array.from(row.getElementsByTagName('c')).forEach((c) => {
          const t = c.getAttribute('t');
          const v = c.getElementsByTagName('v')[0];
          let val = '';
          if (t === 's') val = shared[+(v ? v.textContent : 0)] || '';
          else if (t === 'inlineStr') val = Array.from(c.getElementsByTagName('t')).map((x) => x.textContent).join('');
          else if (v) {
            val = v.textContent;
            const kind = (!t || t === 'n') && /^\d+(\.\d+)?$/.test(val) ? kindOf(+(c.getAttribute('s') || 0)) : null;
            if (kind) val = fromSerial(+val, kind);
          }
          const ref = c.getAttribute('r');
          col = ref ? colIndex(ref) : col + 1;
          if (col < 200) r[col] = val;
        });
        rows.push(Array.from(r, (x) => (x == null ? '' : String(x))));
      });
      return { name: s.name, rows };
    }).filter((s) => s.rows.some((r) => r.some(Boolean)));
  }

  /* ------------------------------------------------------------ librerías que se cargan solo al usarlas */
  const loaded = {};
  function loadScript(src) {
    if (!loaded[src]) {
      loaded[src] = new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = src; s.async = true;
        s.onload = res;
        s.onerror = () => { delete loaded[src]; rej(new Error('No se pudo cargar el lector. Revisa tu internet.')); };
        document.head.appendChild(s);
      });
    }
    return loaded[src];
  }

  /* ------------------------------------------------------------ imagen → texto (Tesseract, en el navegador) */
  async function prepImage(source) {
    let img = source;
    if (source instanceof Blob) {
      try { img = await createImageBitmap(source); } catch (e) {
        img = await new Promise((res, rej) => { const i = new Image(); const u = URL.createObjectURL(source); i.onload = () => { URL.revokeObjectURL(u); res(i); }; i.onerror = () => rej(new Error('No se pudo leer la imagen')); i.src = u; });
      }
    }
    const w0 = img.width, h0 = img.height;
    const k = Math.min(3, 2400 / Math.max(w0, h0)); // amplía las pequeñas y reduce las grandes a ~2400 px
    const c = document.createElement('canvas');
    c.width = Math.round(w0 * k); c.height = Math.round(h0 * k);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const data = ctx.getImageData(0, 0, c.width, c.height);
    const px = data.data;
    let sum = 0;
    for (let i = 0; i < px.length; i += 4) sum += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    const dark = sum / (px.length / 4) < 120; // fondo oscuro (como el negro TMC): se invierte
    for (let i = 0; i < px.length; i += 4) {
      let g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      if (dark) g = 255 - g;
      g = g < 150 ? Math.max(0, g * 0.6) : 255; // más contraste: texto negro sobre blanco
      px[i] = px[i + 1] = px[i + 2] = g;
    }
    ctx.putImageData(data, 0, 0);
    return c;
  }
  async function ocr(source, onProgress) {
    await loadScript('./vendor/tesseract/tesseract.min.js');
    const T = window.Tesseract;
    const base = new URL('./vendor/tesseract/', location.href).href;
    const worker = await T.createWorker('spa', 1, {
      workerPath: base + 'worker.min.js', corePath: base + 'core', langPath: base + 'lang', workerBlobURL: false, gzip: true,
      logger: (m) => { if (onProgress && m.status === 'recognizing text') onProgress(m.progress); },
    });
    try {
      const canvas = await prepImage(source);
      const { data } = await worker.recognize(canvas);
      return data.text;
    } finally { worker.terminate(); }
  }

  /* ------------------------------------------------------------ PDF → texto (pdf.js), o imagen si viene escaneado */
  function pageText(items) {
    const segs = [];
    items.forEach((it) => {
      const s = it.str;
      if (!s || !s.trim()) return;
      const x = it.transform[4], y = it.transform[5], w = it.width || s.length * 4, h = Math.abs(it.transform[3]) || 10;
      segs.push({ s, x, y, w, h });
    });
    if (!segs.length) return '';
    // agrupa por renglón y corta cuando hay un hueco grande (columnas)
    segs.sort((a, b) => b.y - a.y || a.x - b.x);
    const lines = [];
    segs.forEach((g) => {
      const line = lines.find((l) => Math.abs(l.y - g.y) < g.h * 0.5);
      if (line) line.items.push(g); else lines.push({ y: g.y, items: [g] });
    });
    const pieces = [];
    lines.forEach((l) => {
      l.items.sort((a, b) => a.x - b.x);
      let cur = null;
      l.items.forEach((g) => {
        if (cur && g.x - (cur.x1) < g.h * 1.6) { cur.s += (g.x - cur.x1 > g.h * 0.15 ? ' ' : '') + g.s; cur.x1 = g.x + g.w; }
        else { cur = { s: g.s, x: g.x, x1: g.x + g.w, y: l.y }; pieces.push(cur); }
      });
    });
    // columnas: inicios de x que se repiten mucho
    const starts = pieces.map((p) => Math.round(p.x / 20) * 20);
    const freq = {};
    starts.forEach((x) => { freq[x] = (freq[x] || 0) + 1; });
    const anchors = Object.keys(freq).map(Number).filter((x) => freq[x] >= 4).sort((a, b) => a - b)
      .filter((x, i, a) => i === 0 || x - a[i - 1] > 60);
    if (anchors.length >= 2) {
      const cols = anchors.map(() => []);
      pieces.forEach((p) => {
        let ci = 0;
        anchors.forEach((a, i) => { if (p.x >= a - 20) ci = i; });
        cols[ci].push(p);
      });
      return cols.map((c) => c.sort((a, b) => b.y - a.y).map((p) => p.s).join('\n')).join('\n');
    }
    return pieces.sort((a, b) => b.y - a.y || a.x - b.x).map((p) => p.s).join('\n');
  }
  async function readPdf(file, onProgress) {
    await loadScript('./vendor/pdfjs/pdf.min.js');
    const lib = window.pdfjsLib;
    lib.GlobalWorkerOptions.workerSrc = './vendor/pdfjs/pdf.worker.min.js';
    const pdf = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
    const out = [];
    const pages = Math.min(pdf.numPages, 10);
    for (let n = 1; n <= pages; n++) {
      const page = await pdf.getPage(n);
      const tc = await page.getTextContent();
      let text = pageText(tc.items);
      if (text.replace(/\s/g, '').length < 20) {
        // PDF escaneado: se dibuja la página y se lee como imagen
        const vp = page.getViewport({ scale: 2 });
        const c = document.createElement('canvas');
        c.width = vp.width; c.height = vp.height;
        await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
        text = await ocr(c, (p) => onProgress && onProgress((n - 1 + p) / pages));
      }
      out.push(text);
      if (onProgress) onProgress(n / pages);
    }
    return out.join('\n');
  }

  /* ------------------------------------------------------------ plantilla para Google Sheets o Excel */
  const SAMPLE = [
    ['DÍA', 'TÍTULO', 'SECCIÓN', 'EJERCICIO', 'SERIES', 'REPS', 'DESCANSO', 'NOTA', 'VIDEO', 'ALTERNATIVA'],
    ['LUNES', 'PECHO + TRÍCEPS', '', 'Press de banca con barra', '4', '4–6', '2–3 min', '', '', 'Press con mancuernas'],
    ['LUNES', '', '', 'Press inclinado con mancuernas', '3', '8–10', '90 seg', '', '', ''],
    ['MIÉRCOLES', 'MOVILIDAD', 'MOVILIDAD ARTICULAR', 'Movilidad de hombros', '2', '10–12', '45 seg', '', '', ''],
    ['MIÉRCOLES', '', 'ESTIRAMIENTOS', 'Isquiotibiales', '3', '45 seg', '30 seg', '', '', ''],
  ];

  function decodeText(buf) {
    const u8 = new Uint8Array(buf);
    try { return new TextDecoder('utf-8', { fatal: true }).decode(u8).replace(/^\ufeff/, ''); } catch (e) {
      try { return new TextDecoder('windows-1252').decode(u8); } catch (e2) { return new TextDecoder().decode(u8); }
    }
  }

  window.TMCImport = { decodeText, parseText, parseRows, parsePasted, parseCsv, readXlsx, readPdf, ocr, parseExercise, SAMPLE, sampleTsv: SAMPLE.map((r) => r.join('\t')).join('\n') };
})();
