// =========================================================
// Données locales : résultats, cartes, notes, réglages
// Tout est stocké dans le navigateur (localStorage) sous une seule clé.
// =========================================================

const KEY = 'revisions.v1';
const DAY = 86400000;

const DEFAULT = () => ({
  version: 1,
  attempts: [],      // {id, date, game, courses:[], correct, total, score, timeMs, results:[{c,q,ok}], extra}
  qstats: {},        // "courseId:qid" -> {ok, ko, last: true|false, date}
  cards: {},         // "courseId:cardId" -> {box: 1..5, due: timestamp}
  notes: {},         // courseId -> {general: '', items: [{id, quote, sec, text, date}]}
  settings: { theme: 'auto', anim: true, sound: true, catName: 'Pelote', printNotes: true, quizSize: 15, outfit: [] },
  xp: 0,
  createdAt: Date.now(),
});

let state = load();
let memoryOnly = false;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT();
    const s = JSON.parse(raw);
    const d = DEFAULT();
    return { ...d, ...s, settings: { ...d.settings, ...(s.settings || {}) } };
  } catch (e) {
    memoryOnly = true;
    return DEFAULT();
  }
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { memoryOnly = true; }
}

export const store = {
  get state() { return state; },
  get memoryOnly() { return memoryOnly; },
  settings() { return state.settings; },
  setSetting(k, v) { state.settings[k] = v; save(); },
};

// ---------- Tentatives ----------
export function addAttempt(a) {
  const att = { id: 'a' + Date.now().toString(36), date: Date.now(), ...a };
  state.attempts.push(att);
  for (const r of a.results || []) {
    const k = r.c + ':' + r.q;
    const s = state.qstats[k] || { ok: 0, ko: 0 };
    r.ok ? s.ok++ : s.ko++;
    s.last = r.ok; s.date = att.date;
    state.qstats[k] = s;
  }
  state.xp += (a.results || []).filter(r => r.ok).length * 10 + (a.bonusXp || 0);
  save();
  return att;
}

export function wrongQuestionIds(courseId) {
  const out = new Set();
  for (const [k, s] of Object.entries(state.qstats)) {
    const [c, q] = k.split(/:(.+)/);
    if (c === courseId && s.last === false) out.add(q);
  }
  return out;
}

// ---------- Maîtrise ----------
// Maîtrise = moyenne pondérée des scores récents, avec :
//  - décroissance dans le temps (demi-vie de 21 jours) : un vieux 100 % compte moins
//  - poids réduit pour les petites séances (moins de 5 questions)
//  - facteur de confiance : il faut plusieurs séances récentes pour atteindre 100 %
export const HALF_LIFE_DAYS = 21;
export function mastery(courseId, at = Date.now()) {
  let sw = 0, sws = 0, n = 0;
  for (const a of state.attempts) {
    if (a.date > at) continue;
    const rs = (a.results || []).filter(r => r.c === courseId);
    if (!rs.length) continue;
    const s = rs.filter(r => r.ok).length / rs.length;
    const age = (at - a.date) / DAY;
    const w = Math.pow(0.5, age / HALF_LIFE_DAYS) * Math.min(1, rs.length / 5);
    sw += w; sws += w * s; n++;
  }
  if (!n) return null;
  const avg = sws / sw;
  const confidence = Math.min(1, sw / 2.5);
  return { value: avg * confidence, avg, confidence, sessions: n };
}

export function lastScore(courseId) {
  for (let i = state.attempts.length - 1; i >= 0; i--) {
    const rs = (state.attempts[i].results || []).filter(r => r.c === courseId);
    if (rs.length) return rs.filter(r => r.ok).length / rs.length;
  }
  return null;
}

export function levelOf(v) {
  if (v == null) return { cls: 'l0', label: 'Pas encore joué', icon: '⚪' };
  if (v < 0.5) return { cls: 'l1', label: 'À revoir', icon: '🔴' };
  if (v < 0.8) return { cls: 'l2', label: 'En progrès', icon: '🟠' };
  return { cls: 'l3', label: 'Maîtrisé', icon: '🟢' };
}

// ---------- Records ----------
// Règle de classement : d'abord le score (précision), le temps ne sert qu'à départager.
export function compareRuns(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  return (a.timeMs || 0) - (b.timeMs || 0);
}
export function runKey(game, courses) { return game + '|' + [...courses].sort().join(','); }
export function runsFor(key) {
  return state.attempts.filter(a => a.key === key && !a.practice).sort(compareRuns);
}

// ---------- Répétition espacée (système de Leitner) ----------
const BOX_DAYS = [0, 0, 1, 3, 7, 16]; // boîte 1 = à revoir tout de suite … boîte 5 = dans 16 jours
export function cardState(k) { return state.cards[k] || { box: 1, due: 0, seen: false }; }
export function gradeCard(k, knew) {
  const s = cardState(k);
  const box = knew ? Math.min(5, (s.seen ? s.box : 1) + 1) : 1;
  state.cards[k] = { box, due: Date.now() + BOX_DAYS[box] * DAY, seen: true };
  save();
  return state.cards[k];
}
export function dueCount(cardKeys) {
  const now = Date.now();
  return cardKeys.filter(k => { const s = state.cards[k]; return s && s.seen && s.due <= now; }).length;
}

// ---------- Notes ----------
export function notesFor(courseId) {
  if (!state.notes[courseId]) state.notes[courseId] = { general: '', items: [] };
  return state.notes[courseId];
}
export function setGeneral(courseId, text) { notesFor(courseId).general = text; save(); }
export function addNote(courseId, item) {
  const n = { id: 'n' + Date.now().toString(36), date: Date.now(), ...item };
  notesFor(courseId).items.push(n); save(); return n;
}
export function updateNote(courseId, id, text) {
  const it = notesFor(courseId).items.find(x => x.id === id);
  if (it) { it.text = text; save(); }
}
export function deleteNote(courseId, id) {
  const n = notesFor(courseId); n.items = n.items.filter(x => x.id !== id); save();
}

// ---------- Série de jours ----------
export function streakDays() {
  const days = new Set(state.attempts.map(a => new Date(a.date).toDateString()));
  let d = new Date(); let n = 0;
  if (!days.has(d.toDateString())) d = new Date(Date.now() - DAY); // la série tient jusqu'à ce soir
  while (days.has(d.toDateString())) { n++; d = new Date(d.getTime() - DAY); }
  return n;
}

// ---------- Sauvegarde / restauration ----------
export function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `revisions-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export function importData(text) {
  const s = JSON.parse(text);
  if (!s || !Array.isArray(s.attempts)) throw new Error('Fichier non reconnu');
  const d = DEFAULT();
  state = { ...d, ...s, settings: { ...d.settings, ...(s.settings || {}) } };
  save();
}
export function resetAll() { state = DEFAULT(); save(); }
