// =========================================================
// Chargement et rendu des cours (Markdown + blocs :::)
// =========================================================

let manifest = null;
const mdCache = new Map();
const quizCache = new Map();

export async function getManifest() {
  if (manifest) return manifest;
  const r = await fetch('content/manifest.json', { cache: 'no-cache' });
  if (!r.ok) throw new Error('manifest.json introuvable');
  manifest = await r.json();
  manifest.courses.sort((a, b) => a.matiere.localeCompare(b.matiere, 'fr') || a.order - b.order);
  return manifest;
}
export async function getCourse(id) {
  const m = await getManifest();
  return m.courses.find(c => c.id === id) || null;
}
export async function getCourseMd(id) {
  if (mdCache.has(id)) return mdCache.get(id);
  const r = await fetch(`content/courses/${id}/course.md`, { cache: 'no-cache' });
  if (!r.ok) throw new Error('Cours introuvable');
  const t = (await r.text()).replace(/^---[\s\S]*?\n---\s*\n/, '');
  mdCache.set(id, t);
  return t;
}
export async function getQuiz(id) {
  if (quizCache.has(id)) return quizCache.get(id);
  const r = await fetch(`content/courses/${id}/quiz.json`, { cache: 'no-cache' });
  const q = r.ok ? await r.json() : { questions: [], order: [], cards: [] };
  q.questions ||= []; q.order ||= []; q.cards ||= [];
  for (const x of [...q.questions, ...q.order, ...q.cards]) x.course = id;
  quizCache.set(id, q);
  return q;
}

// ---------- Utilitaires ----------
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const inline = s => window.marked ? window.marked.parseInline(String(s ?? '')) : esc(s);
export const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();

// ---------- Rendu Markdown ----------
const CALLOUTS = {
  def: { icon: '📖', label: 'Définition' },
  retenir: { icon: '⭐', label: 'À retenir' },
  exemple: { icon: '💡', label: 'Exemple' },
  methode: { icon: '🧭', label: 'Méthode' },
  attention: { icon: '⚠️', label: 'Attention' },
  verifier: { icon: '🔎', label: 'À vérifier' },
  complement: { icon: '🌐', label: 'Complément externe' },
};

export function renderCourse(md) {
  const lines = md.split('\n');
  const out = [];
  const sections = [];
  let buf = [];
  const flush = () => { if (buf.length) { out.push(window.marked.parse(buf.join('\n'))); buf = []; } };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h = line.match(/^(#{2,3})\s+(.*?)\s*\{#([\w-]+)\}\s*$/);
    if (h) {
      flush();
      const lvl = h[1].length, title = h[2], id = h[3];
      sections.push({ id, title: title.replace(/\*|_/g, ''), level: lvl });
      out.push(`<h${lvl} id="${id}">${inline(title)}</h${lvl}>`);
      continue;
    }
    const c = line.match(/^:::(\w+)\s*(.*)$/);
    if (c && (CALLOUTS[c[1]] || c[1] === 'schema')) {
      flush();
      const kind = c[1], title = c[2];
      const inner = [];
      i++;
      while (i < lines.length && !/^:::\s*$/.test(lines[i])) inner.push(lines[i++]);
      if (kind === 'schema') out.push(renderSchema(title.trim(), inner));
      else {
        const meta = CALLOUTS[kind];
        out.push(`<aside class="callout c-${kind}"><div class="callout-title"><span aria-hidden="true">${meta.icon}</span><span class="kind">${meta.label}</span>${title ? `<span>· ${inline(title)}</span>` : ''}</div>${window.marked.parse(inner.join('\n'))}</aside>`);
      }
      continue;
    }
    buf.push(line);
  }
  flush();
  let html = out.join('\n');
  html = html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>');
  html = html.replace(/<a href="http/g, '<a target="_blank" rel="noopener" href="http');
  return { html, sections };
}

// ---------- Schémas dessinés (remplacent les images des notes) ----------
function renderSchema(name, inner) {
  const items = inner.map(l => l.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean);
  if (name === 'pyramide') {
    const n = items.length;
    return `<figure class="schema"><div class="pyramid">${items.map((t, i) =>
      `<div style="width:${100 - i * (55 / Math.max(1, n - 1))}%;opacity:${1 - i * .13}">${i + 1}. ${esc(t)}</div>`).join('')}</div>
      <figcaption>Du plus important (en haut) au moins important (en bas)</figcaption></figure>`;
  }
  if (name === 'odorat' || name === 'flow') {
    return `<figure class="schema"><div class="flow">${items.map(t => `<div>${esc(t)}</div>`).join('')}</div></figure>`;
  }
  if (name === 'semio') {
    return `<figure class="schema" role="img" aria-label="Schéma : le contexte de diffusion et le cadre communicationnel déterminent la construction de l'image, qui produit un point de vue et des effets de réalité et de vérité.">
<svg viewBox="0 0 640 250" width="100%">
  <defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
  <g style="color:var(--sky)" stroke="currentColor" stroke-width="2.5" fill="none" marker-end="url(#ar)">
    <path d="M120 64 V130 H200"/><path d="M520 64 V130 H442"/>
  </g>
  <g style="color:var(--orange)" stroke="currentColor" stroke-width="2.5" fill="none">
    <path d="M320 168 V200"/><path d="M320 200 H200" marker-end="url(#ar)"/><path d="M320 200 H440" marker-end="url(#ar)"/>
  </g>
  <rect x="20" y="10" width="200" height="54" rx="10" fill="var(--sky-soft)" stroke="var(--sky)"/>
  <text x="120" y="33" text-anchor="middle" fill="var(--ink)" font-size="14" font-weight="700">Contexte de diffusion,</text>
  <text x="120" y="52" text-anchor="middle" fill="var(--ink)" font-size="14" font-weight="700">fonction : statut</text>
  <rect x="420" y="10" width="200" height="54" rx="10" fill="var(--sky-soft)" stroke="var(--sky)"/>
  <text x="520" y="33" text-anchor="middle" fill="var(--ink)" font-size="14" font-weight="700">Cadre communicationnel :</text>
  <text x="520" y="52" text-anchor="middle" fill="var(--ink)" font-size="13">objectif, message, interlocuteurs</text>
  <rect x="200" y="96" width="242" height="72" rx="10" fill="var(--surface-2)" stroke="var(--ink-3)"/>
  <text x="321" y="122" text-anchor="middle" fill="var(--ink)" font-size="14" font-weight="800">Construction de l'image</text>
  <text x="321" y="142" text-anchor="middle" fill="var(--ink-2)" font-size="13">composition, prise de vue,</text>
  <text x="321" y="159" text-anchor="middle" fill="var(--ink-2)" font-size="13">cadrage, format</text>
  <rect x="60" y="182" width="140" height="40" rx="10" fill="var(--orange-soft)" stroke="var(--orange)"/>
  <text x="130" y="207" text-anchor="middle" fill="var(--ink)" font-size="14" font-weight="700">Point de vue</text>
  <rect x="440" y="182" width="190" height="40" rx="10" fill="var(--orange-soft)" stroke="var(--orange)"/>
  <text x="535" y="207" text-anchor="middle" fill="var(--ink)" font-size="13" font-weight="700">Effets de réalité, de vérité</text>
</svg><figcaption>Le schéma d'analyse sémiologique vu en TD</figcaption></figure>`;
  }
  if (name === 'temps') {
    const steps = ['Avant-hier', 'Hier', "Aujourd'hui", 'Demain', 'Après-demain'];
    return `<figure class="schema" role="img" aria-label="Schéma : le temps, marqueur générationnel. L'intergénérationnel est une ligne horizontale sur aujourd'hui ; le transgénérationnel est une ligne verticale qui traverse avant-hier, hier, aujourd'hui, demain et après-demain.">
<svg viewBox="0 0 640 330" width="100%">
  <defs><marker id="ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
  <g style="color:var(--orange)"><path d="M70 14 V316" stroke="currentColor" stroke-width="3" marker-start="url(#ar2)" marker-end="url(#ar2)"/></g>
  <text x="48" y="165" transform="rotate(-90 48 165)" text-anchor="middle" fill="var(--orange)" font-size="13" font-weight="800">TRANSGÉNÉRATIONNEL (vertical)</text>
  <g style="color:var(--sky)"><path d="M90 165 H135 M255 165 H610" stroke="currentColor" stroke-width="3" marker-start="url(#ar2)" marker-end="url(#ar2)"/></g>
  <text x="470" y="155" text-anchor="middle" fill="var(--sky)" font-size="13" font-weight="800">INTERGÉNÉRATIONNEL (horizontal, au présent)</text>
  ${steps.map((s, i) => `<g><rect x="135" y="${12 + i * 67}" width="120" height="${i === 2 ? 40 : 34}" rx="17" fill="${i === 2 ? 'var(--pitch)' : 'var(--surface-2)'}" stroke="var(--pitch)" stroke-width="2"/>
  <text x="195" y="${(i === 2 ? 37 : 34) + i * 67}" text-anchor="middle" font-size="13" font-weight="800" fill="${i === 2 ? '#fff' : 'var(--ink)'}">${s}</text></g>`).join('')}
  <rect x="270" y="20" width="300" height="100" rx="12" fill="var(--ball-soft)"/>
  <text x="285" y="48" font-size="14" font-weight="800" fill="var(--ink)">Regards vers hier : NOSTALGIE</text>
  <text x="285" y="70" font-size="13" fill="var(--ink-2)">démarche mémorielle</text>
  <text x="285" y="90" font-size="13" fill="var(--ink-2)">transmission du passé au présent</text>
  <text x="285" y="108" font-size="13" fill="var(--ink-2)">(héritages)</text>
  <rect x="270" y="205" width="300" height="100" rx="12" fill="var(--pitch-soft)"/>
  <text x="285" y="233" font-size="14" font-weight="800" fill="var(--ink)">Regards vers demain : GÉNÉRATIVITÉ</text>
  <text x="285" y="255" font-size="13" fill="var(--ink-2)">démarche d'engagement</text>
  <text x="285" y="275" font-size="13" fill="var(--ink-2)">transmission du présent au futur</text>
  <text x="285" y="293" font-size="13" fill="var(--ink-2)">(projections)</text>
</svg><figcaption>« Le temps, marqueur générationnel et facteur de changement » (d'après le schéma du cours en ligne)</figcaption></figure>`;
  }
  return `<figure class="schema"><div class="flow">${items.map(t => `<div>${esc(t)}</div>`).join('')}</div></figure>`;
}

// ---------- Index de recherche ----------
let index = null;
export async function search(q) {
  const m = await getManifest();
  if (!index) {
    index = [];
    await Promise.all(m.courses.map(async c => {
      const md = await getCourseMd(c.id);
      let sec = { id: '', title: c.title }, text = [];
      const push = () => { if (text.length) index.push({ course: c, sec, text: text.join(' ') }); text = []; };
      for (const line of md.split('\n')) {
        const h = line.match(/^(#{2,3})\s+(.*?)\s*\{#([\w-]+)\}/);
        if (h) { push(); sec = { id: h[3], title: h[2].replace(/[*_]/g, '') }; continue; }
        const clean = line.replace(/^:::\w*\s*/, '').replace(/[*_`>#|]/g, ' ').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').trim();
        if (clean && !/^[-\s:]+$/.test(clean)) text.push(clean);
      }
      push();
    }));
  }
  const terms = norm(q).split(' ').filter(t => t.length > 1);
  if (!terms.length) return [];
  const res = [];
  for (const e of index) {
    const hay = norm(e.sec.title + ' ' + e.text + ' ' + e.course.title + ' ' + e.course.matiere);
    if (!terms.every(t => hay.includes(t))) continue;
    let score = 0;
    const ht = norm(e.sec.title);
    for (const t of terms) { if (ht.includes(t)) score += 5; score += hay.split(t).length - 1; }
    const plain = e.text;
    const pn = norm(plain);
    const pos = Math.max(0, pn.indexOf(terms[0]));
    const snippet = plain.slice(Math.max(0, pos - 70), pos + 160);
    res.push({ ...e, score, snippet });
  }
  return res.sort((a, b) => b.score - a.score).slice(0, 40);
}
