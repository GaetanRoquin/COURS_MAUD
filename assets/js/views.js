// =========================================================
// Les pages du site
// =========================================================
import { getManifest, getCourse, getCourseMd, getQuiz, renderCourse, esc, inline, search } from './content.js';
import {
  store, mastery, lastScore, levelOf, notesFor, setGeneral, addNote, deleteNote, updateNote, streakDays,
  runsFor, runKey, exportData, importData, resetAll, dueCount, cardState, wrongQuestionIds, save, HALF_LIFE_DAYS
} from './store.js';
import { GAMES, startGame, fmtTime } from './games.js';
import { mascot, OUTFITS, toast, applyMotionSetting, confetti } from './fx.js';

const DAY = 86400000;
const pct = v => v == null ? '–' : Math.round(v * 100) + ' %';
const typeChip = t => `<span class="chip chip-${t}">${t === 'amphi' ? 'Amphi' : 'TD'}</span>`;
const fmtDate = ts => new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const fmtDateTime = ts => new Date(ts).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const gameName = id => GAMES.find(g => g.id === id)?.name || id;
const gameIcon = id => GAMES.find(g => g.id === id)?.icon || '🎮';

function groupBy(arr, f) { const m = new Map(); for (const x of arr) { const k = f(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); } return m; }

// =========================================================
// ACCUEIL
// =========================================================
export async function homePage(main) {
  const { courses } = await getManifest();
  const st = store.state;
  const withM = courses.map(c => ({ c, m: mastery(c.id) }));
  const played = withM.filter(x => x.m);
  const mastered = played.filter(x => x.m.value >= .8).length;
  const priorities = [...withM].sort((a, b) => (a.m ? a.m.value : -1) - (b.m ? b.m.value : -1));
  const weak = priorities.filter(x => x.m && x.m.value < .8).slice(0, 3);
  const notStarted = priorities.filter(x => !x.m).slice(0, Math.max(0, 4 - weak.length));
  // cartes à revoir aujourd'hui
  const cardKeys = Object.keys(st.cards);
  const due = dueCount(cardKeys);
  const dueCourses = [...new Set(cardKeys.filter(k => { const s = st.cards[k]; return s.seen && s.due <= Date.now(); }).map(k => k.split(':')[0]))];
  const streak = streakDays();
  const hour = new Date().getHours();
  const hello = hour < 6 ? 'Encore debout ?' : hour < 12 ? 'Bonjour !' : hour < 18 ? 'Salut !' : 'Bonsoir !';
  const cat = store.settings().catName;
  const recent = [...st.attempts].reverse().slice(0, 5);
  const xp = st.xp;
  const nextOutfit = OUTFITS.find(o => o.xp > xp);

  main.innerHTML = `
  <section class="hero">
    <div>
      <h1>${hello} ${esc(cat)} t'attend sur le terrain ⚽</h1>
      <p>${played.length ? `Tu as déjà travaillé ${played.length} cours sur ${courses.length}. ${weak.length ? `Prochain objectif : <b>${esc(weak[0].c.title)}</b>.` : 'Continue comme ça !'}` : `${courses.length} cours t'attendent, en amphi et en TD. Choisis un cours à lire, ou lance directement un entraînement.`}</p>
      <div class="row">
        ${weak[0] ? `<a class="btn btn-ball btn-lg" href="#/jeu/penalty?c=${weak[0].c.id}">⚽ Tirs au but : ${esc(weak[0].c.title.slice(0, 28))}${weak[0].c.title.length > 28 ? '…' : ''}</a>` : `<a class="btn btn-ball btn-lg" href="#/entrainement">⚽ Lancer un entraînement</a>`}
        <a class="btn btn-ghost" style="color:#fff;border-color:rgba(255,255,255,.5)" href="#/cours">📚 Lire un cours</a>
      </div>
    </div>
    <div class="mascot-wrap">${mascot({ mood: 'happy' })}</div>
  </section>

  <div class="stats">
    <div class="stat"><div class="stat-value">${streak} 🔥</div><div class="stat-label">jour${streak > 1 ? 's' : ''} de suite</div></div>
    <div class="stat"><div class="stat-value">${mastered}/${courses.length}</div><div class="stat-label">cours maîtrisés</div></div>
    <div class="stat"><div class="stat-value">${due}</div><div class="stat-label">carte${due > 1 ? 's' : ''} à revoir aujourd'hui</div></div>
    <div class="stat"><div class="stat-value">${xp}</div><div class="stat-label">points d'XP</div></div>
  </div>

  <div class="grid grid-2" style="margin-top:22px">
    <div class="card">
      <h2>🎯 À travailler en priorité</h2>
      ${weak.length || notStarted.length ? `<ul class="todo-list">${[...weak, ...notStarted].map(({ c, m }) => {
        const lv = levelOf(m ? m.value : null);
        return `<li><a href="#/cours/${c.id}"><span aria-hidden="true">${c.emoji}</span><span>${esc(c.title)}<br><span class="level ${lv.cls}">${lv.icon} ${lv.label}</span></span><span class="pct">${m ? pct(m.value) : ''}</span></a></li>`;
      }).join('')}</ul>` : '<p>Tout est maîtrisé ! 🏆 Les cartes mémoire t\'aideront à ne rien oublier.</p>'}
      ${due ? `<p style="margin-top:14px"><a class="btn" href="#/jeu/flash?c=${dueCourses.join(',')}">🐱 Réviser mes ${due} carte${due > 1 ? 's' : ''} du jour</a></p>` : ''}
    </div>
    <div class="card">
      <h2>👕 Le vestiaire de ${esc(cat)}</h2>
      <p class="small muted">Chaque bonne réponse rapporte 10 XP. Débloque des tenues pour ${esc(cat)} !</p>
      <div class="xpbar" aria-label="Progression vers la prochaine tenue"><span style="width:${nextOutfit ? Math.min(100, xp / nextOutfit.xp * 100) : 100}%"></span></div>
      <p class="small">${nextOutfit ? `Encore <b>${nextOutfit.xp - xp} XP</b> pour débloquer : ${nextOutfit.icon} ${nextOutfit.label}` : 'Toutes les tenues sont débloquées ! 👑'}</p>
      <div class="locker">${OUTFITS.map(o => `<button data-outfit="${o.id}" aria-pressed="${(store.settings().outfit || []).includes(o.id)}" ${xp < o.xp ? 'disabled' : ''} title="${xp < o.xp ? `Débloqué à ${o.xp} XP` : 'Cliquer pour équiper / retirer'}"><span class="ic">${xp < o.xp ? '🔒' : o.icon}</span>${o.label}<span class="muted small">${o.xp} XP</span></button>`).join('')}</div>
    </div>
  </div>

  ${recent.length ? `<h2 class="section-title">🕒 Derniers matchs</h2>
  <div class="card"><ul class="todo-list">${await Promise.all(recent.map(async a => {
    const names = (await Promise.all(a.courses.slice(0, 2).map(getCourse))).filter(Boolean).map(c => c.title);
    return `<li><a href="#/jeu/${a.game}?c=${a.courses.join(',')}"><span aria-hidden="true">${gameIcon(a.game)}</span><span>${esc(gameName(a.game))} · <span class="muted">${esc(names.join(', '))}${a.courses.length > 2 ? ` +${a.courses.length - 2}` : ''}</span><br><span class="small muted">${fmtDateTime(a.date)}</span></span><span class="pct">${a.game === 'sprint' ? a.correct + ' ✓' : a.game === 'memory' ? a.moves + ' coups' : pct(a.score)}</span></a></li>`;
  })).then(x => x.join(''))}</ul></div>` : ''}
  `;
  main.querySelectorAll('[data-outfit]').forEach(b => b.addEventListener('click', () => {
    const o = new Set(store.settings().outfit || []);
    o.has(b.dataset.outfit) ? o.delete(b.dataset.outfit) : o.add(b.dataset.outfit);
    store.setSetting('outfit', [...o]);
    b.setAttribute('aria-pressed', o.has(b.dataset.outfit));
    main.querySelector('.mascot-wrap').innerHTML = mascot({ mood: 'happy' });
  }));
}

// =========================================================
// LISTE DES COURS
// =========================================================
export async function coursesPage(main, query) {
  const { courses } = await getManifest();
  const filter = query.get('type') || 'all';
  const list = courses.filter(c => filter === 'all' || c.type === filter);
  const byMat = groupBy(list, c => c.matiere);
  main.innerHTML = `
    <h1 class="page-title">📚 Mes cours</h1>
    <p class="page-sub">${courses.filter(c => c.type === 'amphi').length} cours d'amphi et ${courses.filter(c => c.type === 'td').length} TD, rangés par matière.</p>
    <div class="tabs" role="tablist">
      ${[['all', 'Tout'], ['amphi', '🎓 Amphi'], ['td', '✏️ TD']].map(([k, l]) => `<a class="tab" role="tab" aria-selected="${filter === k}" href="#/cours${k === 'all' ? '' : '?type=' + k}" style="text-decoration:none">${l}</a>`).join('')}
    </div>
    ${[...byMat].map(([mat, cs]) => `<section class="matiere"><h3>${esc(mat)}</h3><div class="grid grid-3">${cs.map(courseCard).join('')}</div></section>`).join('')}
  `;
}
function courseCard(c) {
  const m = mastery(c.id);
  const lv = levelOf(m ? m.value : null);
  return `<a class="course-card" href="#/cours/${c.id}">
    <div class="row"><span class="emoji" aria-hidden="true">${c.emoji}</span><span class="spacer"></span>${typeChip(c.type)}</div>
    <h4>${esc(c.title)}</h4>
    <p>${esc(c.chapitre)}${c.chapitre && c.description ? ' — ' : ''}${esc(c.description)}</p>
    <div class="meta"><span class="level ${lv.cls}">${lv.icon} ${lv.label}</span>${c.quiz ? `<span class="chip chip-plain">${c.quiz.questions} questions</span>` : ''}</div>
    <div class="meter" aria-label="Maîtrise ${pct(m?.value)}"><span style="width:${m ? m.value * 100 : 0}%"></span></div>
  </a>`;
}

// =========================================================
// PAGE D'UN COURS (+ notes)
// =========================================================
export async function coursePage(main, id, query) {
  const c = await getCourse(id);
  if (!c) { main.innerHTML = `<h1>Cours introuvable</h1><a href="#/cours">Retour aux cours</a>`; return; }
  const md = await getCourseMd(id);
  const { html, sections } = renderCourse(md);
  const m = mastery(id);
  const lv = levelOf(m ? m.value : null);
  const wrong = wrongQuestionIds(id).size;
  document.title = c.title + ' · Révisions';

  main.innerHTML = `
  <div class="course-layout">
    <aside class="toc no-print"><details open><summary class="sr">Sommaire</summary><h4>Sommaire</h4><ol>${sections.map(s => `<li class="lvl${s.level}"><a href="#/cours/${id}?s=${s.id}" data-sec="${s.id}">${esc(s.title)}</a></li>`).join('')}</ol></details></aside>
    <article>
      <header class="course-head">
        <div class="row"><a href="#/cours" class="small">← Tous les cours</a></div>
        <div class="row">${typeChip(c.type)}<span class="chip chip-plain">${esc(c.matiere)}</span>${c.chapitre ? `<span class="chip chip-plain">${esc(c.chapitre)}</span>` : ''}<span class="level ${lv.cls}">${lv.icon} ${lv.label}${m ? ' · ' + pct(m.value) : ''}</span></div>
        <h1>${c.emoji} ${esc(c.title)}</h1>
        <p class="muted">${esc(c.description)}</p>
        <div class="course-actions">
          ${c.quiz?.questions ? `<a class="btn btn-ball" href="#/jeu/penalty?c=${id}">⚽ Tirs au but</a>` : ''}
          ${c.quiz?.cards ? `<a class="btn" href="#/jeu/flash?c=${id}">🐱 Cartes mémoire</a>` : ''}
          <a class="btn btn-ghost" href="#/entrainement?c=${id}">🎮 Autres jeux</a>
          ${wrong ? `<a class="btn btn-ghost" href="#/jeu/penalty?c=${id}&e=1">🎯 Mes ${wrong} erreur${wrong > 1 ? 's' : ''}</a>` : ''}
          <button class="btn btn-ghost" data-print>🖨️ Imprimer</button>
        </div>
        <div class="legend"><span>Texte normal = tes notes, reformulées</span><span>🌐 ajout externe sourcé</span><span>🔎 point à vérifier / corrigé</span><span>✨ Surligne un passage pour l'annoter</span></div>
      </header>
      <div class="prose" id="prose" ${c.lang === 'en' ? 'lang="en"' : ''}>${html}</div>
      <section class="print-notes" id="printNotes"></section>
    </article>
  </div>
  <button class="fab-notes no-print" data-open-notes>📝 Mes notes <span data-notecount></span></button>
  <aside class="notes-panel no-print" id="notesPanel" aria-label="Mes notes sur ce cours">
    <header><h3>📝 Mes notes</h3><span class="spacer"></span><button class="btn btn-ghost btn-sm" data-close-notes aria-label="Fermer">✕</button></header>
    <div class="body" data-notes-body></div>
  </aside>`;

  const prose = main.querySelector('#prose');
  const panel = main.querySelector('#notesPanel');
  const notes = notesFor(id);

  // ---- Panneau de notes ----
  function renderPanel(focusNew) {
    const n = notesFor(id);
    main.querySelector('[data-notecount]').textContent = n.items.length || n.general ? `(${n.items.length + (n.general ? 1 : 0)})` : '';
    panel.querySelector('[data-notes-body]').innerHTML = `
      ${focusNew ? `<div class="note-item" style="border-color:var(--ball)"><b>Nouvelle annotation</b><blockquote>${esc(focusNew.quote)}</blockquote>
        <textarea data-new placeholder="Ton commentaire, une question, un moyen mnémotechnique…" style="min-height:90px"></textarea>
        <div class="row" style="margin-top:8px"><button class="btn btn-sm" data-save-new>Enregistrer</button><button class="btn btn-ghost btn-sm" data-cancel-new>Annuler</button></div></div>` : ''}
      <div class="field"><label for="genNote">Notes sur ce cours</label>
        <textarea id="genNote" placeholder="Écris ce que tu veux : résumé, questions pour le prof, astuces…">${esc(n.general)}</textarea>
        <span class="saved-hint" data-saved>Enregistrement automatique</span></div>
      <div><b>Passages annotés (${n.items.length})</b>
      ${n.items.length ? '' : '<p class="small muted">Surligne un passage du cours avec la souris (ou le doigt) puis clique sur « 📝 Annoter ».</p>'}</div>
      ${n.items.map(it => `<div class="note-item" data-note="${it.id}"><blockquote>${esc(it.quote)}</blockquote>
        <div class="note-text" data-text>${esc(it.text || '')}</div>
        <div class="row"><button class="linkbtn" data-goto="${it.id}">Voir le passage</button><button class="linkbtn" data-edit="${it.id}">Modifier</button><button class="linkbtn danger" data-del="${it.id}">Supprimer</button><span class="spacer"></span><span class="muted">${fmtDate(it.date)}</span></div></div>`).join('')}`;
    const ta = panel.querySelector('#genNote');
    let t;
    ta.addEventListener('input', () => {
      clearTimeout(t);
      panel.querySelector('[data-saved]').textContent = '…';
      t = setTimeout(() => { setGeneral(id, ta.value); panel.querySelector('[data-saved]').textContent = 'Enregistré ✓'; }, 400);
    });
    if (focusNew) panel.querySelector('[data-new]').focus();
  }
  let pending = null;
  const openPanel = (newItem) => { pending = newItem || null; renderPanel(pending); panel.classList.add('open'); };
  renderPanel();
  main.querySelector('[data-open-notes]').addEventListener('click', () => openPanel());
  panel.addEventListener('click', e => {
    if (e.target.closest('[data-close-notes]')) panel.classList.remove('open');
    if (e.target.closest('[data-cancel-new]')) { pending = null; renderPanel(); }
    if (e.target.closest('[data-save-new]') && pending) {
      addNote(id, { quote: pending.quote, sec: pending.sec, text: panel.querySelector('[data-new]').value.trim() });
      pending = null; renderPanel(); applyHighlights(); toast('Annotation enregistrée 📝');
    }
    const del = e.target.closest('[data-del]');
    if (del) {
      if (del.dataset.confirm) { deleteNote(id, del.dataset.del); renderPanel(); applyHighlights(true); }
      else { del.dataset.confirm = '1'; del.textContent = 'Confirmer la suppression'; }
    }
    const ed = e.target.closest('[data-edit]');
    if (ed) {
      const box = panel.querySelector(`[data-note="${ed.dataset.edit}"] [data-text]`);
      if (box.querySelector('textarea')) { updateNote(id, ed.dataset.edit, box.querySelector('textarea').value.trim()); renderPanel(); return; }
      const cur = notesFor(id).items.find(x => x.id === ed.dataset.edit)?.text || '';
      box.innerHTML = `<textarea style="min-height:80px">${esc(cur)}</textarea>`; ed.textContent = 'Enregistrer';
      box.querySelector('textarea').focus();
    }
    const go = e.target.closest('[data-goto]');
    if (go) {
      const mk = prose.querySelector(`mark[data-note="${go.dataset.goto}"]`);
      const it = notesFor(id).items.find(x => x.id === go.dataset.goto);
      const target = mk || (it?.sec && prose.querySelector('#' + CSS.escape(it.sec)));
      if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (window.innerWidth < 700) panel.classList.remove('open'); }
      else toast('Passage introuvable (le cours a peut-être changé)');
    }
  });

  // ---- Surlignages ----
  function applyHighlights(reset) {
    if (reset) prose.querySelectorAll('mark.hl').forEach(mk => { mk.replaceWith(...mk.childNodes); });
    prose.normalize();
    for (const it of notesFor(id).items) {
      if (prose.querySelector(`mark[data-note="${it.id}"]`)) continue;
      wrapText(prose, it.quote, it.id);
    }
  }
  applyHighlights();
  prose.addEventListener('click', e => {
    const mk = e.target.closest('mark.hl'); if (!mk) return;
    openPanel();
    setTimeout(() => panel.querySelector(`[data-note="${mk.dataset.note}"]`)?.scrollIntoView({ block: 'center' }), 50);
  });

  // ---- Bouton « Annoter » sur sélection ----
  const annot = document.createElement('button');
  annot.className = 'annotate-btn hidden'; annot.textContent = '📝 Annoter';
  main.appendChild(annot);
  let selInfo = null;
  const onSel = () => setTimeout(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) { annot.classList.add('hidden'); return; }
    const r = sel.getRangeAt(0);
    if (!prose.contains(r.commonAncestorContainer)) { annot.classList.add('hidden'); return; }
    const quote = sel.toString().replace(/\s+/g, ' ').trim();
    if (quote.length < 3 || quote.length > 400) { annot.classList.add('hidden'); return; }
    const heads = [...prose.querySelectorAll('h2[id], h3[id]')];
    let sec = '';
    for (const h of heads) if (h.compareDocumentPosition(r.startContainer) & Node.DOCUMENT_POSITION_FOLLOWING) sec = h.id;
    selInfo = { quote, sec };
    const rect = r.getBoundingClientRect();
    annot.style.top = (window.scrollY + rect.bottom + 8) + 'px';
    annot.style.left = Math.min(window.innerWidth - 130, Math.max(8, window.scrollX + rect.left + rect.width / 2 - 55)) + 'px';
    annot.classList.remove('hidden');
  }, 10);
  prose.addEventListener('mouseup', onSel);
  prose.addEventListener('touchend', onSel);
  document.addEventListener('selectionchange', function h() {
    if (!main.contains(annot)) return document.removeEventListener('selectionchange', h);
    const s = window.getSelection(); if (!s || s.isCollapsed) annot.classList.add('hidden');
  });
  annot.addEventListener('mousedown', e => e.preventDefault());
  annot.addEventListener('click', () => { if (!selInfo) return; annot.classList.add('hidden'); window.getSelection().removeAllRanges(); openPanel(selInfo); });

  // ---- Impression ----
  main.querySelector('[data-print]').addEventListener('click', () => {
    const n = notesFor(id), pn = main.querySelector('#printNotes');
    const on = store.settings().printNotes && (n.general || n.items.length);
    pn.classList.toggle('on', !!on);
    pn.innerHTML = on ? `<h2>📝 Mes notes</h2>${n.general ? `<p style="white-space:pre-wrap">${esc(n.general)}</p>` : ''}${n.items.map(it => `<blockquote>${esc(it.quote)}</blockquote><p>${esc(it.text)}</p>`).join('')}` : '';
    window.print();
  });

  // ---- Sommaire actif + défilement vers la section demandée ----
  const links = [...main.querySelectorAll('.toc a')];
  const obs = new IntersectionObserver(entries => {
    for (const en of entries) if (en.isIntersecting) {
      links.forEach(a => a.classList.toggle('active', a.dataset.sec === en.target.id));
    }
  }, { rootMargin: '-80px 0px -70% 0px' });
  prose.querySelectorAll('h2[id], h3[id]').forEach(h => obs.observe(h));
  const s = query.get('s');
  if (s) {
    const el = prose.querySelector('#' + CSS.escape(s));
    if (el) setTimeout(() => { el.scrollIntoView({ block: 'start' }); el.animate?.([{ background: 'var(--ball-soft)' }, { background: 'transparent' }], { duration: 1800 }); }, 60);
  } else window.scrollTo(0, 0);
}

function wrapText(root, quote, noteId) {
  // Cherche le passage cité dans le texte du cours (même s'il traverse plusieurs balises)
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = []; let text = '';
  while (walker.nextNode()) { const n = walker.currentNode; nodes.push({ n, start: text.length }); text += n.nodeValue; }
  const flat = text.replace(/\s/g, ' ');
  const q = quote.replace(/\s+/g, ' ');
  // tolère les différences d'espaces : on compare sur une version compactée
  const map = []; let compact = '';
  for (let i = 0; i < flat.length; i++) { if (flat[i] === ' ' && compact.endsWith(' ')) continue; map.push(i); compact += flat[i]; }
  const at = compact.indexOf(q);
  if (at < 0) return false;
  const s = map[at], e = map[at + q.length - 1] + 1;
  for (const { n, start } of nodes) {
    const end = start + n.nodeValue.length;
    if (end <= s || start >= e) continue;
    const a = Math.max(0, s - start), b = Math.min(n.nodeValue.length, e - start);
    if (b <= a || !n.nodeValue.slice(a, b).trim()) continue;
    const mid = n.splitText(a); mid.splitText(b - a);
    const mk = document.createElement('mark'); mk.className = 'hl'; mk.dataset.note = noteId; mk.title = 'Voir mon annotation';
    mid.replaceWith(mk); mk.appendChild(mid);
  }
  return true;
}

// =========================================================
// CHOIX DE L'ENTRAÎNEMENT
// =========================================================
export async function trainingPage(main, query) {
  const { courses } = await getManifest();
  const pre = new Set((query.get('c') || '').split(',').filter(Boolean));
  let type = query.get('type') || (pre.size ? 'all' : 'all');
  let selected = new Set(pre);
  let game = query.get('g') || 'penalty';
  const sz = store.settings().quizSize || 15;

  main.innerHTML = `
    <h1 class="page-title">🎮 S'entraîner</h1>
    <p class="page-sub">Choisis ce que tu veux réviser, puis le jeu. Toutes les questions viennent de tes cours.</p>
    <div class="picker">
      <section class="card"><h2 class="step-title"><span class="step-num">1</span>Quels cours ?</h2>
        <div class="tabs" data-types>${[['all', 'Tout'], ['amphi', '🎓 Amphi'], ['td', '✏️ TD']].map(([k, l]) => `<button class="tab" data-type="${k}" aria-selected="${type === k}">${l}</button>`).join('')}</div>
        <div class="check-tree" data-tree></div>
      </section>
      <section class="card"><h2 class="step-title"><span class="step-num">2</span>Quel jeu ?</h2><div class="game-grid" data-games></div></section>
      <section class="card"><h2 class="step-title"><span class="step-num">3</span>Réglages</h2>
        <div class="grid grid-3">
          <div class="field"><label for="optN">Nombre de questions</label><select id="optN">${[5, 10, 15, 20, 30, 50].map(n => `<option ${n === sz ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          <label class="toggle"><input type="checkbox" id="optT" checked> Chronomètre</label>
          <label class="toggle"><input type="checkbox" id="optE"> Seulement mes erreurs <span class="muted small" data-errcount></span></label>
        </div>
      </section>
      <div class="row" style="justify-content:center"><button class="btn btn-ball btn-lg" data-start>⚽ Coup d'envoi</button></div>
      <p class="small muted" style="text-align:center" data-summary></p>
    </div>`;

  const quizzes = new Map(await Promise.all(courses.map(async c => [c.id, c.quiz ? await getQuiz(c.id) : { questions: [], order: [], cards: [] }])));

  function drawTree() {
    const list = courses.filter(c => type === 'all' || c.type === type);
    const byMat = groupBy(list, c => c.matiere);
    main.querySelector('[data-tree]').innerHTML = [...byMat].map(([mat, cs]) => {
      const all = cs.every(c => selected.has(c.id)), some = cs.some(c => selected.has(c.id));
      return `<div class="check-group"><label class="check"><input type="checkbox" data-mat="${esc(mat)}" ${all ? 'checked' : ''} ${!all && some ? 'data-indet="1"' : ''}> ${esc(mat)}</label>
        <div class="items">${cs.map(c => `<label class="check"><input type="checkbox" data-course="${c.id}" ${selected.has(c.id) ? 'checked' : ''}> ${typeChip(c.type)} ${esc(c.title)} <span class="muted small">${c.quiz ? c.quiz.questions + ' q.' : ''}</span></label>`).join('')}</div></div>`;
    }).join('');
    main.querySelectorAll('[data-indet]').forEach(x => x.indeterminate = true);
    drawGames();
  }
  function pool() {
    const p = { questions: [], order: [], cards: [] };
    for (const id of selected) { const q = quizzes.get(id); if (!q) continue; p.questions.push(...q.questions); p.order.push(...q.order); p.cards.push(...q.cards); }
    return p;
  }
  function drawGames() {
    const p = pool();
    const avail = GAMES.filter(g => g.available(p));
    if (!avail.find(g => g.id === game) && avail.length) game = avail[0].id;
    main.querySelector('[data-games]').innerHTML = GAMES.map(g => `<button class="game-card" data-game="${g.id}" aria-pressed="${g.id === game}" ${selected.size && !g.available(p) ? 'disabled' : ''}>
      <span class="gi" aria-hidden="true">${g.icon}</span><strong>${g.name}</strong><span class="small">${g.desc}</span></button>`).join('');
    let errs = 0; for (const id of selected) errs += wrongQuestionIds(id).size;
    main.querySelector('[data-errcount]').textContent = selected.size ? `(${errs})` : '';
    main.querySelector('[data-start]').disabled = !selected.size || !GAMES.find(g => g.id === game).available(p);
    main.querySelector('[data-summary]').textContent = selected.size
      ? `${selected.size} cours sélectionné${selected.size > 1 ? 's' : ''} · ${p.questions.length} questions · ${p.cards.length} cartes · ${p.order.length} exercices d'ordre`
      : 'Coche au moins un cours.';
    const showN = ['penalty', 'trous', 'flash', 'ordre'].includes(game);
    main.querySelector('#optN').closest('.field').style.visibility = showN ? 'visible' : 'hidden';
  }
  main.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.course) { t.checked ? selected.add(t.dataset.course) : selected.delete(t.dataset.course); drawTree(); }
    if (t.dataset.mat) { courses.filter(c => c.matiere === t.dataset.mat && (type === 'all' || c.type === type)).forEach(c => t.checked ? selected.add(c.id) : selected.delete(c.id)); drawTree(); }
  });
  main.addEventListener('click', e => {
    const ty = e.target.closest('[data-type]');
    if (ty) { type = ty.dataset.type; main.querySelectorAll('[data-type]').forEach(b => b.setAttribute('aria-selected', b === ty)); drawTree(); }
    const g = e.target.closest('[data-game]');
    if (g && !g.disabled) { game = g.dataset.game; drawGames(); }
    if (e.target.closest('[data-start]')) {
      const n = main.querySelector('#optN').value;
      store.setSetting('quizSize', Number(n));
      location.hash = `#/jeu/${game}?c=${[...selected].join(',')}&n=${n}&t=${main.querySelector('#optT').checked ? 1 : 0}&e=${main.querySelector('#optE').checked ? 1 : 0}`;
    }
  });
  drawTree();
}

// =========================================================
// PARTIE EN COURS
// =========================================================
export async function gamePage(main, gameId, query) {
  const ids = (query.get('c') || '').split(',').filter(Boolean);
  const meta = GAMES.find(g => g.id === gameId);
  const { courses } = await getManifest();
  const valid = ids.filter(id => courses.find(c => c.id === id));
  if (!meta || !valid.length) { location.hash = '#/entrainement'; return; }
  const titles = Object.fromEntries(courses.map(c => [c.id, c.title]));
  const quizzes = await Promise.all(valid.map(getQuiz));
  const pool = { questions: quizzes.flatMap(q => q.questions), order: quizzes.flatMap(q => q.order), cards: quizzes.flatMap(q => q.cards) };
  if (!meta.available(pool)) { main.innerHTML = `<div class="card"><h2>Ce jeu n'est pas disponible pour cette sélection</h2><a class="btn" href="#/entrainement?c=${valid.join(',')}">Choisir un autre jeu</a></div>`; return; }
  const quizSize = quizzes.reduce((m, q) => Math.max(m, q.quizSize || 0), 0);
  const options = { n: Number(query.get('n')) || quizSize || store.settings().quizSize || 15, timer: query.get('t') !== '0', errorsOnly: query.get('e') === '1' };
  const label = valid.length === 1 ? titles[valid[0]] : `${valid.length} cours`;
  main.innerHTML = `<div class="row no-print" style="max-width:760px;margin:0 auto 14px"><a href="${valid.length === 1 ? `#/cours/${valid[0]}` : '#/entrainement'}" class="small">← ${esc(valid.length === 1 ? 'Retour au cours' : 'Retour')}</a><span class="spacer"></span><b>${meta.icon} ${meta.name}</b><span class="muted small">· ${esc(label)}${options.errorsOnly ? ' · mode erreurs' : ''}</span></div><div data-game-root></div>`;
  let root = main.querySelector('[data-game-root]');
  const ctx = { courses: valid, titles, pool, options };
  ctx.restart = () => { root = startGame(main.querySelector('[data-game-root]'), gameId, ctx); window.scrollTo(0, 0); };
  root = startGame(root, gameId, ctx);
}

// =========================================================
// PROGRÈS
// =========================================================
export async function progressPage(main, query) {
  const { courses } = await getManifest();
  const st = store.state;
  const now = Date.now(), weekAgo = now - 7 * DAY;
  const rows = courses.map(c => ({ c, now: mastery(c.id, now), before: mastery(c.id, weekAgo), last: lastScore(c.id) }));
  const played = rows.filter(r => r.now);
  const avgNow = played.length ? played.reduce((s, r) => s + r.now.value, 0) / played.length : null;
  // même ensemble de cours, un cours pas encore travaillé il y a 7 jours compte pour 0
  const avgBefore = played.length ? played.reduce((s, r) => s + (r.before ? r.before.value : 0), 0) / played.length : null;
  const improved = rows.filter(r => r.now && (!r.before || r.now.value - r.before.value > .02)).length;
  const totalQ = st.attempts.reduce((s, a) => s + (a.results || []).length, 0);
  const totalOk = st.attempts.reduce((s, a) => s + (a.results || []).filter(r => r.ok).length, 0);
  const byMat = groupBy(rows, r => r.c.matiere);
  const selCourse = query.get('c') || (played[0]?.c.id ?? courses[0].id);

  main.innerHTML = `
    <h1 class="page-title">🏆 Mes progrès</h1>
    <p class="page-sub">La <b>maîtrise</b> n'est pas ton dernier score : c'est une moyenne de tes séances récentes, où les plus anciennes comptent de moins en moins (elles perdent la moitié de leur poids tous les ${HALF_LIFE_DAYS} jours). Il faut plusieurs séances réussies pour atteindre 100 %.</p>
    ${!st.attempts.length ? `<div class="card" style="text-align:center"><div style="width:130px;margin:0 auto">${mascot({ mood: 'neutral' })}</div><h2>Pas encore de match joué</h2><p>Lance un premier entraînement pour voir ta progression ici.</p><a class="btn btn-ball" href="#/entrainement">⚽ S'entraîner</a></div>` : `
    <div class="stats">
      <div class="stat"><div class="stat-value">${pct(avgNow)}</div><div class="stat-label">maîtrise moyenne (cours travaillés)</div></div>
      <div class="stat"><div class="stat-value">${avgBefore == null ? '–' : (avgNow - avgBefore >= 0 ? '+' : '') + Math.round((avgNow - avgBefore) * 100) + ' pts'}</div><div class="stat-label">par rapport à il y a 7 jours</div></div>
      <div class="stat"><div class="stat-value">${improved}</div><div class="stat-label">cours en progrès cette semaine</div></div>
      <div class="stat"><div class="stat-value">${totalQ ? Math.round(totalOk / totalQ * 100) + ' %' : '–'}</div><div class="stat-label">de bonnes réponses (${totalQ} au total)</div></div>
    </div>

    <h2 class="section-title">📊 Maîtrise par cours : toi maintenant vs toi il y a 7 jours</h2>
    <div class="card">
      <div class="chart-legend"><span><i></i>Maîtrise aujourd'hui</span><span><i class="ghost"></i>Il y a 7 jours</span><span>🔴 &lt; 50 % · 🟠 50-79 % · 🟢 ≥ 80 %</span></div>
      ${[...byMat].map(([mat, rs]) => `<h3 style="font-size:1rem;margin:16px 0 6px;color:var(--ink-2)">${esc(mat)}</h3><div class="mastery-list">${rs.map(r => {
        const v = r.now?.value, b = r.before?.value; const lv = levelOf(v);
        const d = v != null && b != null ? Math.round((v - b) * 100) : null;
        return `<a class="mrow" href="#/cours/${r.c.id}" data-tip="${esc(r.c.title)} — maîtrise ${pct(v)}${b != null ? ` (il y a 7 jours : ${pct(b)})` : ''}${r.last != null ? ` · dernier score ${pct(r.last)}` : ''}${r.now ? ` · ${r.now.sessions} séance${r.now.sessions > 1 ? 's' : ''}` : ''}">
          <span class="name">${r.c.emoji} ${esc(r.c.title)}<small>${r.c.type === 'amphi' ? 'Amphi' : 'TD'} · ${lv.icon} ${lv.label}</small></span>
          <span class="mbar"><span class="fill" style="width:0%" data-w="${(v || 0) * 100}"></span>${b != null ? `<span class="ghost" style="left:calc(${b * 100}% - 1px)"></span>` : ''}</span>
          <span class="val">${pct(v)}${d ? `<span class="delta ${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲ +' : '▼ '}${d}</span>` : ''}</span></a>`;
      }).join('')}</div>`).join('')}
    </div>

    <div class="grid grid-2" style="margin-top:22px">
      <div class="card">
        <h2>📈 Évolution d'un cours</h2>
        <div class="field"><label for="selC">Cours</label><select id="selC">${courses.map(c => `<option value="${c.id}" ${c.id === selCourse ? 'selected' : ''}>${esc(c.title)}</option>`).join('')}</select></div>
        <div data-line style="margin-top:12px"></div>
      </div>
      <div class="card records">
        <h2>🥇 Mes records</h2>
        <div class="row"><div class="field" style="flex:1"><label for="selG">Jeu</label><select id="selG">${GAMES.filter(g => g.ranked).map(g => `<option value="${g.id}">${g.icon} ${g.name}</option>`).join('')}</select></div></div>
        <p class="small muted">Classement : d'abord le score, puis le temps pour départager. Un temps rapide ne passe jamais devant un meilleur score.</p>
        <div data-records></div>
      </div>
    </div>

    <h2 class="section-title">🕒 Historique</h2>
    <div class="card records"><table><thead><tr><th>Date</th><th>Jeu</th><th>Cours</th><th>Score</th><th>Temps</th></tr></thead><tbody>
      ${[...st.attempts].reverse().slice(0, 25).map(a => `<tr><td>${fmtDateTime(a.date)}</td><td>${gameIcon(a.game)} ${esc(gameName(a.game))}</td><td>${esc(a.courses.map(id => courses.find(c => c.id === id)?.title || id).slice(0, 2).join(', '))}${a.courses.length > 2 ? ` +${a.courses.length - 2}` : ''}</td><td class="num">${a.game === 'sprint' ? a.correct + ' ✓' : a.game === 'memory' ? a.moves + ' coups' : `${a.correct}/${a.total} (${pct(a.score)})`}</td><td class="num">${a.game === 'flash' || a.game === 'sprint' ? '–' : fmtTime(a.timeMs || 0)}</td></tr>`).join('')}
    </tbody></table></div>`}
  `;
  if (!st.attempts.length) return;
  requestAnimationFrame(() => main.querySelectorAll('.fill[data-w]').forEach(f => f.style.width = f.dataset.w + '%'));
  tooltips(main);

  const drawLine = id => { main.querySelector('[data-line]').innerHTML = lineChart(id); tooltips(main.querySelector('[data-line]')); };
  const drawRecords = () => {
    const g = main.querySelector('#selG').value, id = main.querySelector('#selC').value;
    const runs = runsFor(runKey(g, [id])).slice(0, 10);
    const others = st.attempts.filter(a => a.game === g && !a.practice && a.courses.length > 1 && a.courses.includes(id)).length;
    main.querySelector('[data-records]').innerHTML = runs.length ? `<table><thead><tr><th>#</th><th>Date</th><th>Score</th><th>Temps</th></tr></thead><tbody>${runs.map((r, k) => `<tr class="${k === 0 ? 'best' : ''}"><td>${k === 0 ? '🏆' : k + 1}</td><td>${fmtDateTime(r.date)}</td><td class="num">${g === 'sprint' ? r.correct + ' bonnes rép.' : g === 'memory' ? r.moves + ' coups' : pct(r.score)}</td><td class="num">${g === 'sprint' ? '60 s' : fmtTime(r.timeMs || 0)}</td></tr>`).join('')}</tbody></table>`
      : `<p class="muted">Pas encore de partie classée pour ce jeu sur « ${esc(courses.find(c => c.id === id)?.title)} »${others ? ` (${others} partie${others > 1 ? 's' : ''} sur plusieurs cours à la fois)` : ''}.</p>`;
  };
  main.querySelector('#selC').addEventListener('change', e => { drawLine(e.target.value); drawRecords(); });
  main.querySelector('#selG').addEventListener('change', drawRecords);
  drawLine(selCourse); drawRecords();
}

function lineChart(courseId) {
  const pts = store.state.attempts.map(a => {
    const rs = (a.results || []).filter(r => r.c === courseId);
    return rs.length ? { date: a.date, v: rs.filter(r => r.ok).length / rs.length, n: rs.length, game: a.game } : null;
  }).filter(Boolean);
  if (!pts.length) return '<p class="muted">Aucune séance sur ce cours pour l\'instant.</p>';
  const W = 520, H = 220, L = 38, R = 12, T = 12, B = 30;
  const x = i => pts.length === 1 ? (L + W - R) / 2 : L + i * (W - L - R) / (pts.length - 1);
  const y = v => T + (1 - v) * (H - T - B);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
  const mNow = mastery(courseId);
  return `<svg class="linechart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Scores des séances sur ce cours">
    <g class="grid">${[0, .5, 1].map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/>`).join('')}</g>
    <g class="axis">${[0, .5, 1].map(v => `<text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v * 100}%</text>`).join('')}
      <text x="${x(0)}" y="${H - 8}" text-anchor="${pts.length === 1 ? 'middle' : 'start'}">${fmtDate(pts[0].date)}</text>
      ${pts.length > 1 ? `<text x="${x(pts.length - 1)}" y="${H - 8}" text-anchor="end">${fmtDate(pts[pts.length - 1].date)}</text>` : ''}</g>
    <path class="line" d="${path}"/>
    ${pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.v)}" r="5" data-tip="${fmtDateTime(p.date)} · ${esc(gameName(p.game))} · ${pct(p.v)} (${p.n} rép.)"/>`).join('')}
  </svg><p class="small muted">Chaque point = une séance. Maîtrise actuelle : <b>${pct(mNow?.value)}</b>.</p>`;
}

function tooltips(scope) {
  let tip = document.querySelector('.tip');
  if (!tip) { tip = document.createElement('div'); tip.className = 'tip hidden'; document.body.appendChild(tip); }
  scope.querySelectorAll('[data-tip]').forEach(el => {
    el.addEventListener('pointerenter', () => { tip.textContent = el.dataset.tip; tip.classList.remove('hidden'); });
    el.addEventListener('pointermove', e => { tip.style.left = Math.min(window.innerWidth - tip.offsetWidth - 8, e.clientX + 12) + 'px'; tip.style.top = (e.clientY + 14) + 'px'; });
    el.addEventListener('pointerleave', () => tip.classList.add('hidden'));
  });
}

// =========================================================
// TOUTES MES NOTES
// =========================================================
export async function notesPage(main) {
  const { courses } = await getManifest();
  const withNotes = courses.map(c => ({ c, n: store.state.notes[c.id] })).filter(x => x.n && (x.n.general || x.n.items.length));
  main.innerHTML = `
    <h1 class="page-title">📝 Mes notes</h1>
    <p class="page-sub">Toutes les notes prises pendant la lecture des cours.</p>
    ${withNotes.length ? `<div class="row" style="margin-bottom:16px"><button class="btn btn-ghost btn-sm" data-dl>⬇️ Télécharger toutes mes notes (.txt)</button></div>
    <div class="grid">${withNotes.map(({ c, n }) => `<section class="card"><div class="row">${typeChip(c.type)}<h2 style="margin:0;font-size:1.2rem">${c.emoji} ${esc(c.title)}</h2><span class="spacer"></span><a class="btn btn-sm btn-ghost" href="#/cours/${c.id}">Ouvrir le cours →</a></div>
      ${n.general ? `<p style="white-space:pre-wrap">${esc(n.general)}</p>` : ''}
      ${n.items.map(it => `<div class="note-item" style="margin-top:8px"><blockquote>${esc(it.quote)}</blockquote>${it.text ? `<div class="note-text">${esc(it.text)}</div>` : ''}<div class="row"><a class="small" href="#/cours/${c.id}${it.sec ? '?s=' + it.sec : ''}">Voir le passage</a><span class="spacer"></span><span class="muted small">${fmtDate(it.date)}</span></div></div>`).join('')}
    </section>`).join('')}</div>`
    : `<div class="card" style="text-align:center"><div style="width:120px;margin:0 auto">${mascot({ mood: 'neutral' })}</div><h2>Pas encore de notes</h2><p>Ouvre un cours et clique sur « 📝 Mes notes », ou surligne un passage pour l'annoter.</p><a class="btn" href="#/cours">📚 Ouvrir un cours</a></div>`}`;
  main.querySelector('[data-dl]')?.addEventListener('click', () => {
    const txt = withNotes.map(({ c, n }) => `=== ${c.title} (${c.matiere}) ===\n${n.general ? n.general + '\n' : ''}${n.items.map(it => `\n« ${it.quote} »\n→ ${it.text || ''}`).join('\n')}\n`).join('\n');
    const url = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'mes-notes.txt'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  });
}

// =========================================================
// RECHERCHE
// =========================================================
export async function searchPage(main, query) {
  const q = query.get('q') || '';
  main.innerHTML = `<h1 class="page-title">🔍 Recherche</h1><p class="page-sub">Résultats pour « ${esc(q)} »…</p>`;
  const res = await search(q);
  const ACC = { a: '[aàâä]', e: '[eéèêë]', i: '[iîï]', o: '[oôö]', u: '[uùûü]', c: '[cç]' };
  const terms = q.trim().split(/\s+/).filter(t => t.length > 1)
    .map(t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[aeiouc]/g, ch => ACC[ch]));
  const hl = s => terms.length ? esc(s).replace(new RegExp(`(${terms.join('|')})`, 'gi'), '<mark>$1</mark>') : esc(s);
  main.innerHTML = `<h1 class="page-title">🔍 Recherche</h1>
    <p class="page-sub">${res.length} résultat${res.length > 1 ? 's' : ''} pour « ${esc(q)} »</p>
    ${res.length ? `<ul class="search-results">${res.map(r => `<li><a href="#/cours/${r.course.id}${r.sec.id ? '?s=' + r.sec.id : ''}">
      <div class="where">${r.course.emoji} ${esc(r.course.title)} · ${r.course.type === 'amphi' ? 'Amphi' : 'TD'}</div>
      <b>${hl(r.sec.title)}</b><div class="small">${r.snippet ? '…' + hl(r.snippet) + '…' : ''}</div></a></li>`).join('')}</ul>`
      : `<div class="card"><p>Aucun résultat. Essaie un autre mot (sans accent, ça marche aussi).</p></div>`}`;
}

// =========================================================
// RÉGLAGES
// =========================================================
export async function settingsPage(main) {
  const s = store.settings();
  main.innerHTML = `
    <h1 class="page-title">⚙️ Réglages</h1>
    <div class="grid grid-2">
      <section class="card"><h2>Apparence</h2>
        <div class="field"><label for="theme">Thème</label><select id="theme">
          <option value="auto" ${s.theme === 'auto' ? 'selected' : ''}>Automatique (comme l'appareil)</option>
          <option value="light" ${s.theme === 'light' ? 'selected' : ''}>☀️ Clair</option>
          <option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>🌙 Sombre</option></select></div>
        <p><label class="toggle"><input type="checkbox" id="anim" ${s.anim ? 'checked' : ''}> Animations (buts, confettis, chat)</label></p>
        <p><label class="toggle"><input type="checkbox" id="sound" ${s.sound ? 'checked' : ''}> Sons</label></p>
        <p><label class="toggle"><input type="checkbox" id="printNotes" ${s.printNotes ? 'checked' : ''}> Ajouter mes notes quand j'imprime un cours</label></p>
        <div class="field"><label for="catName">Nom de la mascotte</label><input id="catName" value="${esc(s.catName)}" maxlength="20"></div>
        <div style="width:110px;margin-top:10px" data-cat>${mascot({ mood: 'happy' })}</div>
      </section>
      <section class="card"><h2>💾 Sauvegarde</h2>
        <p>Tes résultats et tes notes sont enregistrés <b>dans ce navigateur, sur cet appareil</b>. Si tu vides l'historique du navigateur ou changes d'appareil, ils disparaissent.</p>
        <p><b>Pense à télécharger une sauvegarde de temps en temps</b>, et à la restaurer sur un autre appareil si besoin.</p>
        ${store.memoryOnly ? '<p class="c-verifier callout">⚠️ Le stockage local est bloqué (navigation privée ?) : rien ne sera conservé après fermeture de l\'onglet.</p>' : ''}
        <div class="row"><button class="btn" data-export>⬇️ Télécharger ma sauvegarde</button>
        <label class="btn btn-ghost" style="cursor:pointer">⬆️ Restaurer<input type="file" accept="application/json,.json" data-import hidden></label></div>
        <p class="small muted">Dernière activité : ${store.state.attempts.length ? fmtDateTime(store.state.attempts[store.state.attempts.length - 1].date) : 'aucune'} · ${store.state.attempts.length} partie(s) enregistrée(s)</p>
        <hr style="border:0;border-top:1px solid var(--line);margin:18px 0">
        <h3>Tout effacer</h3>
        <p class="small">Supprime tous les résultats, records, cartes et notes de ce navigateur.</p>
        <button class="btn btn-danger btn-sm" data-reset>🗑️ Tout effacer</button>
      </section>
    </div>`;
  const applyTheme = v => { v === 'auto' ? document.documentElement.removeAttribute('data-theme') : document.documentElement.setAttribute('data-theme', v); };
  main.querySelector('#theme').addEventListener('change', e => { store.setSetting('theme', e.target.value); applyTheme(e.target.value); });
  main.querySelector('#anim').addEventListener('change', e => { store.setSetting('anim', e.target.checked); applyMotionSetting(); if (e.target.checked) confetti(30); });
  main.querySelector('#sound').addEventListener('change', e => store.setSetting('sound', e.target.checked));
  main.querySelector('#printNotes').addEventListener('change', e => store.setSetting('printNotes', e.target.checked));
  main.querySelector('#catName').addEventListener('input', e => { store.setSetting('catName', e.target.value.trim() || 'Pelote'); });
  main.querySelector('[data-export]').addEventListener('click', () => { exportData(); toast('Sauvegarde téléchargée 💾'); });
  main.querySelector('[data-import]').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try { importData(await f.text()); toast('Sauvegarde restaurée ✅'); settingsPage(main); }
    catch (err) { toast('Fichier invalide : ' + err.message); }
  });
  const rb = main.querySelector('[data-reset]');
  rb.addEventListener('click', () => {
    if (!rb.dataset.confirm) { rb.dataset.confirm = '1'; rb.textContent = '⚠️ Cliquer à nouveau pour confirmer'; setTimeout(() => { if (rb.isConnected) { delete rb.dataset.confirm; rb.textContent = '🗑️ Tout effacer'; } }, 5000); return; }
    resetAll(); toast('Tout a été effacé'); settingsPage(main);
  });
}
