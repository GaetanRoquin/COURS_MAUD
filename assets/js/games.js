// =========================================================
// Les mini-jeux : Tirs au but (quiz), Sprint V/F, Cartes mémoire,
// Memory, Remettre dans l'ordre, Texte à trous.
// =========================================================
import { esc, inline, norm } from './content.js';
import { addAttempt, runKey, runsFor, compareRuns, gradeCard, cardState, wrongQuestionIds, store } from './store.js';
import { goal, save as keeperSave, streak, record, confetti, sound, peekCat, toast, mascot, clearFx } from './fx.js';

export const GAMES = [
  { id: 'penalty', icon: '⚽', name: 'Tirs au but', desc: 'Le quiz complet : QCM, vrai/faux, mots à compléter. Chaque bonne réponse = un but.', ranked: true,
    available: p => p.questions.length >= 1 },
  { id: 'sprint', icon: '⏱️', name: 'Sprint Vrai/Faux', desc: '60 secondes : un maximum de bonnes réponses. Une erreur coûte 3 s.', ranked: true,
    available: p => sprintPool(p).length >= 4 },
  { id: 'flash', icon: '🐱', name: 'Cartes mémoire', desc: 'Retourne la carte, dis si tu savais. Les cartes ratées reviennent plus souvent.', ranked: false,
    available: p => p.cards.length >= 1 },
  { id: 'memory', icon: '🧩', name: 'Memory', desc: 'Retrouve les paires notion ↔ définition en un minimum de coups.', ranked: true,
    available: p => p.cards.filter(c => c.short || c.back).length >= 4 },
  { id: 'ordre', icon: '🔢', name: 'Remettre dans l\'ordre', desc: 'Glisse les étapes d\'une méthode ou d\'une chronologie à leur place.', ranked: true,
    available: p => p.order.length >= 1 },
  { id: 'trous', icon: '✍️', name: 'Texte à trous', desc: 'Écris le mot manquant. Les petites fautes de frappe sont tolérées.', ranked: true,
    available: p => trousPool(p).length >= 3 },
];

let cleanup = [];
export function stopGame() { cleanup.forEach(f => { try { f(); } catch (e) {} }); cleanup = []; }
function onKey(fn) { const h = e => { if (e.target.matches('input, textarea') && e.key !== 'Enter') return; fn(e); }; document.addEventListener('keydown', h); cleanup.push(() => document.removeEventListener('keydown', h)); }
function every(ms, fn) { const t = setInterval(fn, ms); cleanup.push(() => clearInterval(t)); return t; }
function later(ms, fn) { const t = setTimeout(fn, ms); cleanup.push(() => clearTimeout(t)); return t; }

export const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const fmtTime = ms => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const pct = x => Math.round(x * 100) + ' %';

function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
// Vérifie une réponse tapée : 'exact' | 'close' (faute de frappe) | false
export function checkTyped(input, q) {
  const v = norm(input);
  if (!v) return false;
  const answers = [q.answer, ...(q.alts || [])].map(norm);
  if (answers.includes(v)) return 'exact';
  if (answers.some(a => a.length >= 5 && lev(v, a) <= 1)) return 'close';
  return false;
}

function sprintPool(p) {
  const out = p.questions.filter(q => q.type === 'vf').map(q => ({ ...q, statement: q.q }));
  for (const q of p.questions.filter(q => q.type === 'qcm')) {
    const right = Math.random() < .5;
    const wrongIdx = shuffle(q.choices.map((_, i) => i).filter(i => i !== q.answer))[0];
    const ch = right ? q.choices[q.answer] : q.choices[wrongIdx];
    out.push({ ...q, statement: `${q.q.replace(/[?…:]\s*$/, '')} → ${ch}`, answer: right, fromQcm: true, rightAnswer: q.choices[q.answer] });
  }
  return out;
}
function trousPool(p) {
  const out = p.questions.filter(q => q.type === 'trou');
  if (out.length < 6) {
    for (const c of p.cards) {
      if (c.front.length > 40) continue;
      out.push({ id: 'card-' + c.id, course: c.course, type: 'trou', q: `${c.back} → ___`, answer: c.front.replace(/\s*\(.*?\)\s*$/, ''), alts: [c.front], explain: '', section: c.section });
    }
  }
  return out;
}

// ---------- En-tête commun ----------
function scoreboardHTML({ left, right, shots, cur, time }) {
  return `<div class="scoreboard">
    <div class="sb-score">TOI <b>${left}</b> – <b>${right}</b> ${store.settings().catName.toUpperCase()}</div>
    <div class="shots">${shots.map((s, i) => `<span class="shot ${s === true ? 'ok' : s === false ? 'ko' : ''} ${i === cur ? 'cur' : ''}"></span>`).join('')}</div>
    ${time != null ? `<div class="sb-time" aria-label="Chronomètre">⏱ <span data-time>${time}</span></div>` : ''}
  </div>`;
}
function reviewLink(q) {
  return q.section ? `<a href="#/cours/${q.course}?s=${q.section}" target="_blank" rel="noopener">Revoir la notion →</a>` : '';
}

// =========================================================
// 1. TIRS AU BUT (quiz)
// =========================================================
function playPenalty(root, ctx) {
  const all = ctx.pool.questions;
  let qs = ctx.options.errorsOnly ? all.filter(q => ctx.wrongSet.has(q.course + ':' + q.id)) : all;
  qs = shuffle(qs).slice(0, ctx.options.n || 15);
  if (!qs.length) return emptyState(root, ctx, 'Aucune erreur à revoir pour cette sélection. Bravo ! 🎉');
  const shots = qs.map(() => null);
  const results = [];
  let i = 0, spent = 0, startedAt = 0, run = 0, answered = false;

  const tick = () => { const el = root.querySelector('[data-time]'); if (el && ctx.options.timer) el.textContent = fmtTime(spent + (answered ? 0 : Date.now() - startedAt)); };
  if (ctx.options.timer) every(250, tick);

  function show() {
    answered = false; startedAt = Date.now();
    const q = qs[i];
    const goals = shots.filter(s => s === true).length, saves = shots.filter(s => s === false).length;
    let body = '';
    if (q.type === 'qcm') {
      q._order = shuffle(q.choices.map((_, k) => k));
      body = `<div class="choices">${q._order.map((k, n) => `<button class="choice" data-k="${k}"><span class="key">${n + 1}</span><span>${inline(q.choices[k])}</span></button>`).join('')}</div>`;
    } else if (q.type === 'vf') {
      body = `<div class="vf-buttons"><button class="choice" data-vf="true"><span class="key">V</span>Vrai</button><button class="choice" data-vf="false"><span class="key">F</span>Faux</button></div>`;
    } else {
      body = `<form class="trou-input" data-trou><input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Ta réponse" placeholder="Ta réponse…"><button class="btn" type="submit">Tirer ⚽</button></form>`;
    }
    const prompt = q.type === 'trou' ? inline(q.q).replace('___', '<span class="gap"></span>') : inline(q.q);
    root.innerHTML = `<div class="game-shell">
      ${scoreboardHTML({ left: goals, right: saves, shots, cur: i, time: ctx.options.timer ? fmtTime(spent) : null })}
      <div class="progressbar"><span style="width:${(i / qs.length) * 100}%"></span></div>
      <article class="qcard" aria-live="polite">
        <div class="qmeta"><span>Tir ${i + 1} / ${qs.length}</span>${ctx.multi ? `<span>· ${esc(ctx.titles[q.course])}</span>` : ''}<span>· ${q.type === 'qcm' ? 'QCM' : q.type === 'vf' ? 'Vrai ou faux' : 'À compléter'}</span></div>
        <h2>${prompt}</h2>
        ${body}
        <div data-fb></div>
      </article></div>`;
    const inp = root.querySelector('[data-trou] input');
    if (inp) inp.focus();
  }

  function answer(ok, detail) {
    if (answered) return;
    answered = true; spent += Date.now() - startedAt;
    const q = qs[i];
    shots[i] = ok;
    results.push({ c: q.course, q: q.id, ok });
    run = ok ? run + 1 : 0;
    if (ok) { goal(); if ([3, 5, 10, 15].includes(run)) later(900, () => streak(run)); }
    else keeperSave();
    const right = q.type === 'qcm' ? q.choices[q.answer] : q.type === 'vf' ? (q.answer ? 'Vrai' : 'Faux') : q.answer;
    const fb = root.querySelector('[data-fb]');
    fb.innerHTML = `<div class="feedback ${ok ? 'ok' : 'ko'}">
      <strong>${ok ? (detail === 'close' ? '⚽ But ! (attention à l\'orthographe)' : pick(['⚽ But !', '⚽ Lucarne !', '⚽ Quel tir !', '⚽ Imparable !'])) : '🧤 Arrêté par le gardien'}</strong>
      ${!ok || detail === 'close' ? `<p>Bonne réponse : <b>${inline(right)}</b></p>` : ''}
      ${q.explain ? `<p>${inline(q.explain)}</p>` : ''}
      ${!ok ? `<p class="small">${reviewLink(q)}</p>` : ''}
    </div>
    <div class="next-row"><span class="kbd-hint">Entrée pour continuer</span><button class="btn btn-ball" data-next>${i + 1 < qs.length ? 'Tir suivant →' : 'Coup de sifflet final 🏁'}</button></div>`;
    root.querySelector('.scoreboard').outerHTML = scoreboardHTML({ left: shots.filter(s => s === true).length, right: shots.filter(s => s === false).length, shots, cur: i, time: ctx.options.timer ? fmtTime(spent) : null });
    root.querySelector('[data-next]').focus({ preventScroll: true });
  }

  function next() {
    if (!answered) return;
    i++;
    if (i < qs.length) show();
    else finish(root, ctx, { game: 'penalty', results, timeMs: spent, total: qs.length, correct: results.filter(r => r.ok).length, items: qs });
  }

  root.addEventListener('click', function handler(e) {
    if (!root.isConnected) return;
    const c = e.target.closest('.choice');
    if (c && !answered) {
      const q = qs[i];
      let ok;
      if (c.dataset.k != null) ok = Number(c.dataset.k) === q.answer;
      else ok = (c.dataset.vf === 'true') === q.answer;
      root.querySelectorAll('.choice').forEach(b => {
        b.disabled = true;
        if (b.dataset.k != null && Number(b.dataset.k) === q.answer) b.classList.add('correct');
        if (b.dataset.vf != null && (b.dataset.vf === 'true') === q.answer) b.classList.add('correct');
      });
      if (!ok) c.classList.add('wrong');
      answer(ok);
    }
    if (e.target.closest('[data-next]')) next();
  });
  root.addEventListener('submit', e => {
    if (!e.target.matches('[data-trou]')) return;
    e.preventDefault();
    if (answered) return next();
    const inp = e.target.querySelector('input');
    if (!inp.value.trim()) return;
    const res = checkTyped(inp.value, qs[i]);
    inp.classList.add(res ? 'correct' : 'wrong'); inp.readOnly = true;
    e.target.querySelector('button').classList.add('hidden');
    answer(!!res, res);
  });
  onKey(e => {
    if (!root.isConnected) return;
    const q = qs[i];
    if (answered && e.key === 'Enter') { e.preventDefault(); return next(); }
    if (answered) return;
    if (q.type === 'qcm' && /^[1-9]$/.test(e.key)) root.querySelectorAll('.choice')[Number(e.key) - 1]?.click();
    if (q.type === 'vf' && /^[vf]$/i.test(e.key)) root.querySelector(`[data-vf="${e.key.toLowerCase() === 'v'}"]`)?.click();
  });
  show();
}
const pick = a => a[Math.floor(Math.random() * a.length)];

// =========================================================
// 2. SPRINT VRAI / FAUX
// =========================================================
function playSprint(root, ctx) {
  const DURATION = 60000;
  let pool = shuffle(sprintPool(ctx.pool));
  if (ctx.options.errorsOnly) {
    const f = pool.filter(q => ctx.wrongSet.has(q.course + ':' + q.id));
    if (!f.length) return emptyState(root, ctx, 'Aucune erreur à revoir pour cette sélection. Bravo ! 🎉');
    pool = f;
  }
  let idx = 0, correct = 0, wrong = 0, run = 0, end = 0, penalty = 0, started = false;
  const results = [], seen = [];
  root.innerHTML = `<div class="game-shell">
    <div class="card" style="text-align:center">
      <div style="font-size:3rem">⏱️</div>
      <h2>Sprint Vrai / Faux</h2>
      <p>60 secondes pour enchaîner un maximum de bonnes réponses.<br>Une erreur fait perdre <b>3 secondes</b>.</p>
      <p class="small muted">Clavier : <b>V</b> ou ← pour Vrai, <b>F</b> ou → pour Faux</p>
      <button class="btn btn-ball btn-lg" data-go>Coup d'envoi !</button>
    </div></div>`;
  root.querySelector('[data-go]').focus();

  function start() {
    started = true; end = Date.now() + DURATION; sound.whistle();
    root.innerHTML = `<div class="game-shell">
      <div class="scoreboard"><div class="sb-score">✅ <b data-c>0</b> &nbsp; ❌ <b data-w>0</b></div><div class="sb-time">⏱ <span data-t>1:00</span></div></div>
      <div class="progressbar"><span data-bar style="width:100%"></span></div>
      <article class="qcard" data-card><div class="qmeta"><span data-src></span></div><div class="sprint-statement" data-s></div>
      <div class="vf-buttons" style="margin-top:14px"><button class="choice" data-vf="true"><span class="key">V</span>Vrai</button><button class="choice" data-vf="false"><span class="key">F</span>Faux</button></div></article>
    </div>`;
    showQ();
    every(100, () => {
      const left = Math.max(0, end - Date.now());
      const t = root.querySelector('[data-t]'); if (!t) return;
      t.textContent = fmtTime(left);
      root.querySelector('[data-bar]').style.width = (left / DURATION * 100) + '%';
      if (left <= 0) done();
    });
  }
  function showQ() {
    if (idx >= pool.length) { pool = shuffle(pool); idx = 0; }
    const q = pool[idx];
    root.querySelector('[data-s]').innerHTML = inline(q.statement);
    root.querySelector('[data-src]').textContent = ctx.multi ? ctx.titles[q.course] : '';
  }
  function ans(v) {
    if (!started || end - Date.now() <= 0) return;
    const q = pool[idx];
    const ok = v === q.answer;
    const card = root.querySelector('[data-card]');
    card.classList.remove('sprint-flash-ok', 'sprint-flash-ko'); void card.offsetWidth;
    card.classList.add(ok ? 'sprint-flash-ok' : 'sprint-flash-ko');
    if (ok) { correct++; run++; sound.goal && (store.settings().sound && sound.click()); if (run % 5 === 0) peekCat('happy'); }
    else { wrong++; run = 0; end -= 3000; penalty += 3000; sound.miss(); }
    results.push({ c: q.course, q: q.id, ok });
    seen.push({ ...q, ok, given: v });
    root.querySelector('[data-c]').textContent = correct;
    root.querySelector('[data-w]').textContent = wrong;
    idx++; showQ();
  }
  let finished = false;
  function done() {
    if (finished) return; finished = true; stopGame();
    sound.whistle();
    finish(root, ctx, { game: 'sprint', results, timeMs: DURATION, total: correct + wrong, correct, scoreOverride: correct, scoreLabel: `${correct} ✓`, items: seen, sprint: true });
  }
  root.addEventListener('click', e => {
    if (e.target.closest('[data-go]')) start();
    const b = e.target.closest('[data-vf]'); if (b) ans(b.dataset.vf === 'true');
  });
  onKey(e => {
    if (!started) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(); } return; }
    if (/^(v|ArrowLeft)$/i.test(e.key)) ans(true);
    if (/^(f|ArrowRight)$/i.test(e.key)) ans(false);
  });
}

// =========================================================
// 3. CARTES MÉMOIRE (répétition espacée)
// =========================================================
function playFlash(root, ctx) {
  const now = Date.now();
  const withState = ctx.pool.cards.map(c => ({ c, s: cardState(c.course + ':' + c.id) }));
  const due = withState.filter(x => x.s.seen && x.s.due <= now).sort((a, b) => a.s.box - b.s.box);
  const fresh = withState.filter(x => !x.s.seen);
  const later_ = withState.filter(x => x.s.seen && x.s.due > now).sort((a, b) => a.s.due - b.s.due);
  let deck = [...shuffle(due), ...shuffle(fresh), ...later_].map(x => x.c).slice(0, ctx.options.n || 20);
  if (ctx.options.errorsOnly) deck = ctx.pool.cards.filter(c => cardState(c.course + ':' + c.id).box === 1 && cardState(c.course + ':' + c.id).seen);
  if (!deck.length) return emptyState(root, ctx, 'Aucune carte à revoir pour l\'instant.');
  let i = 0, flipped = false;
  const results = [];
  const t0 = Date.now();

  function show() {
    flipped = false;
    const c = deck[i];
    const s = cardState(c.course + ':' + c.id);
    root.innerHTML = `<div class="game-shell">
      <div class="row" style="margin-bottom:10px"><b>Carte ${i + 1} / ${deck.length}</b><span class="spacer"></span><span class="muted small">${ctx.multi ? esc(ctx.titles[c.course]) : ''}</span></div>
      <div class="progressbar"><span style="width:${i / deck.length * 100}%"></span></div>
      <div class="flash-wrap"><div class="flash" data-flip tabindex="0" role="button" aria-label="Retourner la carte">
        <div class="face front">${inline(c.front)}<span class="paw">🐾 clique pour retourner</span></div>
        <div class="face back"><div>${inline(c.back)}</div><span class="paw">${reviewLink(c)}</span></div>
      </div></div>
      <div class="boxes" title="Boîte de révision (1 = à revoir souvent, 5 = bien su)">${[1, 2, 3, 4, 5].map(b => `<span class="${s.seen && s.box === b ? 'on' : ''}">${b}</span>`).join('')}</div>
      <div class="flash-actions">
        <button class="btn btn-ghost" data-grade="0" disabled>😿 Pas encore</button>
        <button class="btn" data-grade="1" disabled>😺 Je savais</button>
      </div>
      <p class="small muted" style="text-align:center">Espace : retourner · ← pas encore · → je savais</p>
    </div>`;
  }
  function flip() {
    const f = root.querySelector('[data-flip]'); if (!f) return;
    flipped = !flipped; f.classList.toggle('flipped', flipped); sound.flip();
    root.querySelectorAll('[data-grade]').forEach(b => b.disabled = false);
  }
  function grade(knew) {
    if (!root.querySelector('[data-grade]') || root.querySelector('[data-grade]').disabled) return;
    const c = deck[i];
    const st = gradeCard(c.course + ':' + c.id, knew);
    results.push({ c: c.course, q: 'card:' + c.id, ok: knew });
    if (knew) { sound.goal && store.settings().sound && sound.click(); if (st.box >= 4) peekCat('happy'); }
    i++;
    if (i < deck.length) show();
    else finish(root, ctx, { game: 'flash', results, timeMs: Date.now() - t0, total: deck.length, correct: results.filter(r => r.ok).length, items: deck, practice: true, cards: true });
  }
  root.addEventListener('click', e => {
    if (e.target.closest('a')) return;
    if (e.target.closest('[data-flip]')) flip();
    const g = e.target.closest('[data-grade]'); if (g) grade(g.dataset.grade === '1');
  });
  onKey(e => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
    if (e.key === 'ArrowRight') grade(true);
    if (e.key === 'ArrowLeft') grade(false);
  });
  show();
}

// =========================================================
// 4. MEMORY
// =========================================================
function playMemory(root, ctx) {
  const PAIRS = 6;
  const cards = shuffle(ctx.pool.cards.filter(c => (c.short || c.back).length <= 70 && c.front.length <= 45)).slice(0, PAIRS);
  if (cards.length < 4) return emptyState(root, ctx, 'Pas assez de notions courtes pour un Memory sur cette sélection.');
  const tiles = shuffle(cards.flatMap(c => [{ id: c.id, k: c.course + c.id, text: c.front, term: true }, { id: c.id, k: c.course + c.id, text: c.short || c.back, term: false }]));
  let open = [], moves = 0, found = 0, lock = false;
  const t0 = Date.now();
  root.innerHTML = `<div class="game-shell">
    <div class="scoreboard"><div class="sb-score">Coups : <b data-m>0</b> · Paires : <b data-f>0</b>/${cards.length}</div><div class="sb-time">⏱ <span data-t>0:00</span></div></div>
    <p class="small muted">Retrouve chaque notion (en bleu) et sa définition.</p>
    <div class="memory-grid">${tiles.map((t, n) => `<button class="tile" data-n="${n}" aria-label="Carte ${n + 1}"><div class="in"><div class="f">🐾</div><div class="b ${t.term ? 'term' : ''}">${esc(t.text)}</div></div></button>`).join('')}</div>
  </div>`;
  every(500, () => { const el = root.querySelector('[data-t]'); if (el) el.textContent = fmtTime(Date.now() - t0); });
  root.addEventListener('click', e => {
    const b = e.target.closest('.tile'); if (!b || lock) return;
    const n = Number(b.dataset.n);
    if (b.classList.contains('open') || b.classList.contains('done')) return;
    b.classList.add('open'); sound.flip();
    b.setAttribute('aria-label', tiles[n].text);
    open.push(n);
    if (open.length === 2) {
      moves++; root.querySelector('[data-m]').textContent = moves;
      const [a, c] = open; const A = tiles[a], C = tiles[c];
      const els = open.map(x => root.querySelector(`[data-n="${x}"]`));
      if (A.k === C.k && A.term !== C.term) {
        els.forEach(x => { x.classList.add('done'); x.classList.remove('open'); });
        found++; root.querySelector('[data-f]').textContent = found; open = [];
        sound.goal(); if (found < cards.length) peekCat('happy');
        if (found === cards.length) {
          const time = Date.now() - t0;
          later(600, () => finish(root, ctx, { game: 'memory', results: [], timeMs: time, total: cards.length, correct: cards.length, scoreOverride: Math.min(1, cards.length / moves), scoreLabel: `${moves} coups`, moves, items: [] }));
        }
      } else {
        lock = true; els.forEach(x => x.classList.add('miss'));
        later(950, () => { els.forEach(x => { x.classList.remove('open', 'miss'); x.setAttribute('aria-label', 'Carte cachée'); }); open = []; lock = false; });
      }
    }
  });
}

// =========================================================
// 5. REMETTRE DANS L'ORDRE
// =========================================================
function playOrdre(root, ctx) {
  const exos = shuffle(ctx.pool.order).slice(0, ctx.options.n || 10);
  if (!exos.length) return emptyState(root, ctx, 'Pas d\'exercice d\'ordre pour cette sélection.');
  let i = 0, order = [], checked = false;
  const results = []; const t0 = Date.now(); let spent = 0, startedAt = 0;

  function show() {
    checked = false; startedAt = Date.now();
    const ex = exos[i];
    do { order = shuffle(ex.items.map((_, k) => k)); } while (ex.items.length > 1 && order.every((v, k) => v === k));
    root.innerHTML = `<div class="game-shell">
      <div class="row" style="margin-bottom:10px"><b>Exercice ${i + 1} / ${exos.length}</b><span class="spacer"></span><span class="muted small">${ctx.multi ? esc(ctx.titles[ex.course]) : ''}</span></div>
      <div class="progressbar"><span style="width:${i / exos.length * 100}%"></span></div>
      <article class="qcard"><h2>${inline(ex.q)}</h2>
        <p class="small muted">Glisse les étiquettes avec ☰, ou utilise les flèches.</p>
        <ol class="order-list" data-list></ol>
        <div data-fb></div>
        <div class="next-row"><button class="btn btn-ball" data-check>Valider ✔</button></div>
      </article></div>`;
    drawList();
  }
  function drawList() {
    const ex = exos[i];
    const ul = root.querySelector('[data-list]');
    ul.innerHTML = order.map((k, pos) => `<li class="order-item" data-pos="${pos}">
      <span class="pos">${pos + 1}</span><span class="grip" aria-hidden="true">☰</span><span class="txt">${inline(ex.items[k])}</span>
      <button class="mv" data-up="${pos}" aria-label="Monter" ${pos === 0 || checked ? 'disabled' : ''}>▲</button>
      <button class="mv" data-down="${pos}" aria-label="Descendre" ${pos === order.length - 1 || checked ? 'disabled' : ''}>▼</button></li>`).join('');
    if (checked) ul.querySelectorAll('.order-item').forEach((li, pos) => li.classList.add(order[pos] === pos ? 'correct' : 'wrong'));
    enableDrag(ul);
  }
  function move(from, to) { if (to < 0 || to >= order.length) return; const [x] = order.splice(from, 1); order.splice(to, 0, x); drawList(); }
  function enableDrag(ul) {
    ul.querySelectorAll('.grip').forEach(g => {
      g.addEventListener('pointerdown', e => {
        if (checked) return;
        e.preventDefault();
        const li = g.closest('.order-item'); const from = Number(li.dataset.pos);
        const items = [...ul.children]; const rects = items.map(x => x.getBoundingClientRect());
        const startY = e.clientY; li.classList.add('dragging'); g.setPointerCapture(e.pointerId);
        let to = from;
        const mv = ev => {
          const dy = ev.clientY - startY; li.style.transform = `translateY(${dy}px)`;
          const y = rects[from].top + rects[from].height / 2 + dy;
          to = rects.findIndex(r => y < r.bottom); if (to === -1) to = items.length - 1;
        };
        const up = () => { g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up); g.removeEventListener('pointercancel', up); li.style.transform = ''; li.classList.remove('dragging'); move(from, to); };
        g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up);
      });
    });
  }
  function check() {
    const ex = exos[i];
    if (checked) { i++; return i < exos.length ? show() : finish(root, ctx, { game: 'ordre', results, timeMs: spent, total: exos.length, correct: results.filter(r => r.ok).length, items: exos }); }
    checked = true; spent += Date.now() - startedAt;
    const ok = order.every((v, k) => v === k);
    const nRight = order.filter((v, k) => v === k).length;
    results.push({ c: ex.course, q: ex.id, ok });
    ok ? goal('PARFAIT !') : keeperSave('Presque !');
    drawList();
    root.querySelector('[data-fb]').innerHTML = `<div class="feedback ${ok ? 'ok' : 'ko'}"><strong>${ok ? '⚽ Tout est à sa place !' : `🧤 ${nRight} / ${order.length} bien placé${nRight > 1 ? 's' : ''}`}</strong>
      ${ok ? '' : `<p>Le bon ordre :</p><ol>${ex.items.map(t => `<li>${inline(t)}</li>`).join('')}</ol><p class="small">${reviewLink(ex)}</p>`}</div>`;
    const btn = root.querySelector('[data-check]'); btn.textContent = i + 1 < exos.length ? 'Suivant →' : 'Terminer 🏁'; btn.focus({ preventScroll: true });
  }
  root.addEventListener('click', e => {
    const u = e.target.closest('[data-up]'); if (u) move(Number(u.dataset.up), Number(u.dataset.up) - 1);
    const d = e.target.closest('[data-down]'); if (d) move(Number(d.dataset.down), Number(d.dataset.down) + 1);
    if (e.target.closest('[data-check]')) check();
  });
  show();
}

// =========================================================
// 6. TEXTE À TROUS
// =========================================================
function playTrous(root, ctx) {
  let qs = trousPool(ctx.pool);
  if (ctx.options.errorsOnly) qs = qs.filter(q => ctx.wrongSet.has(q.course + ':' + q.id));
  qs = shuffle(qs).slice(0, ctx.options.n || 15);
  if (!qs.length) return emptyState(root, ctx, 'Aucune erreur à revoir pour cette sélection. Bravo ! 🎉');
  let i = 0, answered = false, hinted = false, spent = 0, startedAt = 0, run = 0;
  const results = [];
  function show() {
    answered = false; hinted = false; startedAt = Date.now();
    const q = qs[i];
    root.innerHTML = `<div class="game-shell">
      <div class="row" style="margin-bottom:10px"><b>Phrase ${i + 1} / ${qs.length}</b><span class="spacer"></span><span class="muted small">${ctx.multi ? esc(ctx.titles[q.course]) : ''}</span></div>
      <div class="progressbar"><span style="width:${i / qs.length * 100}%"></span></div>
      <article class="qcard"><h2>${inline(q.q).replace('___', '<span class="gap"></span>')}</h2>
        <form class="trou-input" data-form><input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Mot manquant" placeholder="Le mot manquant…"><button class="btn" type="submit">Valider</button></form>
        <div class="row" style="margin-top:8px"><button class="linkbtn" data-hint type="button">💡 Indice</button><span class="small muted" data-hinttxt></span></div>
        <div data-fb></div></article></div>`;
    root.querySelector('input').focus();
  }
  function next() { i++; if (i < qs.length) show(); else finish(root, ctx, { game: 'trous', results, timeMs: spent, total: qs.length, correct: results.filter(r => r.ok).length, items: qs }); }
  root.addEventListener('submit', e => {
    e.preventDefault();
    if (answered) return next();
    const inp = root.querySelector('input'); if (!inp.value.trim()) return;
    answered = true; spent += Date.now() - startedAt;
    const q = qs[i]; const res = checkTyped(inp.value, q); const ok = !!res;
    results.push({ c: q.course, q: q.id, ok });
    inp.classList.add(ok ? 'correct' : 'wrong'); inp.readOnly = true;
    run = ok ? run + 1 : 0;
    ok ? goal() : keeperSave(); if (ok && [5, 10].includes(run)) later(900, () => streak(run));
    root.querySelector('[data-fb]').innerHTML = `<div class="feedback ${ok ? 'ok' : 'ko'}"><strong>${ok ? (res === 'close' ? '⚽ But ! (petite faute de frappe)' : '⚽ But !') : '🧤 Arrêté'}</strong>
      ${!ok || res === 'close' ? `<p>Réponse attendue : <b>${esc(q.answer)}</b></p>` : ''}${q.explain ? `<p>${inline(q.explain)}</p>` : ''}${!ok ? `<p class="small">${reviewLink(q)}</p>` : ''}</div>
      <div class="next-row"><span class="kbd-hint">Entrée pour continuer</span><button class="btn btn-ball" type="button" data-next>${i + 1 < qs.length ? 'Suivant →' : 'Terminer 🏁'}</button></div>`;
    root.querySelector('form button').classList.add('hidden');
  });
  root.addEventListener('click', e => {
    if (e.target.closest('[data-next]')) next();
    if (e.target.closest('[data-hint]') && !answered) {
      const a = qs[i].answer; hinted = true;
      root.querySelector('[data-hinttxt]').textContent = `Commence par « ${a[0]} », ${a.length} lettres`;
    }
  });
  show();
}

// =========================================================
// Écran vide / fin de partie
// =========================================================
function emptyState(root, ctx, msg) {
  root.innerHTML = `<div class="game-shell"><div class="card" style="text-align:center">
    <div style="width:130px;margin:0 auto">${mascot({ mood: 'happy' })}</div>
    <h2>${esc(msg)}</h2><a class="btn" href="#/entrainement">Choisir un autre entraînement</a></div></div>`;
}

const RUNNERS = { penalty: playPenalty, sprint: playSprint, flash: playFlash, memory: playMemory, ordre: playOrdre, trous: playTrous };

export function startGame(root, gameId, ctx) {
  stopGame();
  ctx.wrongSet = new Set();
  for (const id of ctx.courses) for (const q of wrongQuestionIds(id)) ctx.wrongSet.add(id + ':' + q);
  ctx.multi = ctx.courses.length > 1;
  const fresh = root.cloneNode(false); root.replaceWith(fresh); // retire les anciens écouteurs
  RUNNERS[gameId](fresh, ctx);
  return fresh;
}

function finish(root, ctx, data) {
  stopGame();
  clearFx();
  const meta = GAMES.find(g => g.id === data.game);
  const key = runKey(data.game, ctx.courses);
  const practice = !!(data.practice || ctx.options.errorsOnly || (data.game !== 'memory' && data.game !== 'sprint' && (ctx.options.n || 15) < 5));
  const score = data.scoreOverride ?? (data.total ? data.correct / data.total : 0);
  const before = runsFor(key);
  const prevBest = before[0];
  const att = addAttempt({ game: data.game, key, courses: ctx.courses, correct: data.correct, total: data.total, score, timeMs: data.timeMs, results: data.results, practice: practice || !meta.ranked, moves: data.moves });
  const isRecord = meta.ranked && !practice && (!prevBest || compareRuns(att, prevBest) < 0);
  const ratio = data.total ? data.correct / data.total : 1;
  const mood = ratio >= .7 ? 'happy' : ratio >= .4 ? 'neutral' : 'sad';
  const verdict = data.game === 'memory' ? (score >= .75 ? 'Mémoire d\'éléphant… euh, de chat ! 🐱' : 'Toutes les paires trouvées !')
    : ratio === 1 ? 'Sans faute ! Ballon d\'or ! 🏆' : ratio >= .8 ? 'Très beau match ! 👏' : ratio >= .5 ? 'Bon match, on continue ! 💪' : 'Match difficile, on revoit les notions 📚';

  const bigText = data.scoreLabel || pct(score);
  const sub = data.game === 'penalty' ? `${data.correct} but${data.correct > 1 ? 's' : ''} sur ${data.total} tirs` : data.game === 'flash' ? `${data.correct} / ${data.total} cartes sues` : data.game === 'memory' ? `${data.total} paires · ${fmtTime(data.timeMs)}` : data.game === 'sprint' ? `bonne${data.correct > 1 ? 's' : ''} réponse${data.correct > 1 ? 's' : ''} en 60 s · ${data.total - data.correct} erreur${data.total - data.correct > 1 ? 's' : ''}` : `${data.correct} / ${data.total}`;
  const wrong = (data.items || []).filter((it, k) => data.sprint ? !it.ok : data.cards ? !data.results[k]?.ok : data.results[k] && !data.results[k].ok);

  root.innerHTML = `<div class="game-shell">
    <div class="card result-hero">
      <div style="width:120px;margin:0 auto">${mascot({ mood })}</div>
      ${isRecord && prevBest ? '<span class="record-badge">🏆 Nouveau record personnel !</span>' : isRecord ? '<span class="record-badge">⭐ Premier record établi</span>' : ''}
      <div class="big">${esc(bigText)}</div>
      <div class="muted">${esc(sub)}</div>
      <p class="verdict">${verdict}</p>
      <div class="result-grid">
        ${data.game !== 'flash' && data.game !== 'sprint' ? `<div class="stat"><div class="stat-value">${fmtTime(data.timeMs)}</div><div class="stat-label">Temps de réponse</div></div>` : ''}
        ${meta.ranked && prevBest ? `<div class="stat"><div class="stat-value">${prevBest.game === 'sprint' ? prevBest.correct : prevBest.game === 'memory' ? prevBest.moves + ' coups' : pct(prevBest.score)}</div><div class="stat-label">Ancien record</div></div>` : ''}
        ${meta.ranked ? `<div class="stat"><div class="stat-value">${before.length + (practice ? 0 : 1)}</div><div class="stat-label">Partie${before.length ? 's' : ''} classée${before.length ? 's' : ''}</div></div>` : ''}
        <div class="stat"><div class="stat-value">+${data.results.filter(r => r.ok).length * 10}</div><div class="stat-label">XP gagnés</div></div>
      </div>
      ${practice && meta.ranked ? `<p class="small muted">${ctx.options.errorsOnly ? 'Mode « erreurs » : cette partie compte pour la maîtrise, pas pour les records.' : ''}</p>` : ''}
      <div class="row" style="justify-content:center">
        <button class="btn btn-ball" data-again>🔁 Rejouer</button>
        ${wrong.length && data.game !== 'memory' ? `<button class="btn" data-errors>🎯 Revoir mes ${wrong.length} erreur${wrong.length > 1 ? 's' : ''}</button>` : ''}
        <a class="btn btn-ghost" href="#/entrainement">Autre jeu</a>
        <a class="btn btn-ghost" href="#/progres">Mes progrès</a>
      </div>
    </div>
    ${wrong.length ? `<h3 class="section-title">À revoir</h3><ul class="review-list">${wrong.map(it => {
      const right = it.fromQcm ? `${it.statement} est ${it.answer ? 'VRAI' : 'FAUX'}${!it.answer ? ` (réponse : ${it.rightAnswer})` : ''}` : it.type === 'qcm' ? it.choices[it.answer] : it.type === 'vf' ? (it.answer ? 'Vrai' : 'Faux') : it.items ? it.items.join(' → ') : it.back || it.answer;
      return `<li><div><b>${inline(it.q || it.front || it.statement)}</b></div><div class="ans">✅ ${inline(right)}</div>${it.explain ? `<div class="ans">${inline(it.explain)}</div>` : ''}<div class="ans">${reviewLink(it)}</div></li>`;
    }).join('')}</ul>` : ''}
  </div>`;
  if (isRecord && prevBest) later(300, () => record());
  else if (ratio >= .8 && data.total >= 3) later(200, () => confetti(80));
  root.querySelector('[data-again]').addEventListener('click', () => { ctx.options.errorsOnly = false; ctx.restart(); });
  root.querySelector('[data-errors]')?.addEventListener('click', () => { ctx.options.errorsOnly = true; ctx.restart(); });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
