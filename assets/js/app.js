// =========================================================
// Routeur (navigation par #/…) et initialisation
// =========================================================
import { homePage, coursesPage, coursePage, trainingPage, gamePage, progressPage, notesPage, searchPage, settingsPage } from './views.js';
import { stopGame } from './games.js';
import { applyMotionSetting } from './fx.js';

const main = document.getElementById('main');

const routes = [
  [/^\/?$/, (q) => homePage(main, q), 'home'],
  [/^\/cours\/?$/, (q) => coursesPage(main, q), 'cours'],
  [/^\/cours\/([\w-]+)$/, (q, id) => coursePage(main, id, q), 'cours'],
  [/^\/entrainement\/?$/, (q) => trainingPage(main, q), 'entrainement'],
  [/^\/jeu\/(\w+)$/, (q, g) => gamePage(main, g, q), 'entrainement'],
  [/^\/progres\/?$/, (q) => progressPage(main, q), 'progres'],
  [/^\/notes\/?$/, (q) => notesPage(main, q), 'notes'],
  [/^\/recherche\/?$/, (q) => searchPage(main, q), ''],
  [/^\/reglages\/?$/, (q) => settingsPage(main, q), ''],
];

let lastPath = null;
async function route() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs = ''] = raw.split('?');
  const query = new URLSearchParams(qs);
  // même cours, seule la section change : on fait défiler sans recharger
  if (lastPath === path && path.startsWith('/cours/') && query.get('s')) {
    const el = document.getElementById(query.get('s'));
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  }
  lastPath = path;
  stopGame();
  document.getElementById('fx').innerHTML = '';
  document.querySelector('.tip')?.classList.add('hidden');
  document.title = 'Révisions';
  for (const [re, fn, nav] of routes) {
    const m = path.match(re);
    if (!m) continue;
    document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === nav));
    try { await fn(query, ...m.slice(1)); }
    catch (e) {
      console.error(e);
      main.innerHTML = `<div class="card"><h2>Oups, un problème de chargement 😿</h2><p>${String(e.message || e)}</p>
        <p class="small muted">Si tu ouvres le fichier directement depuis ton ordinateur, il faut passer par un petit serveur (voir le README) ou par le lien GitHub Pages.</p>
        <a class="btn" href="#/">Retour à l'accueil</a></div>`;
    }
    if (!query.get('s')) main.focus({ preventScroll: true });
    return;
  }
  main.innerHTML = `<div class="card"><h2>Page introuvable</h2><a class="btn" href="#/">Retour à l'accueil</a></div>`;
}

window.addEventListener('hashchange', route);
applyMotionSetting();
route();

// Recherche
const form = document.getElementById('searchForm');
const input = document.getElementById('searchInput');
form.addEventListener('submit', e => {
  e.preventDefault();
  const q = input.value.trim();
  if (q) location.hash = '#/recherche?q=' + encodeURIComponent(q);
});
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); input.focus(); input.select(); }
});

