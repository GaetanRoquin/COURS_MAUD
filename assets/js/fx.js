// =========================================================
// Mascotte, animations (foot + chat) et sons
// Tout est dessiné en SVG/CSS maison : aucun personnage ni logo existant.
// =========================================================
import { store } from './store.js';

const fx = () => document.getElementById('fx');
const reduced = () => !store.settings().anim || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- La mascotte : un chat footballeur ----------
export const OUTFITS = [
  { id: 'bandeau', label: 'Bandeau', icon: '🎽', xp: 100 },
  { id: 'echarpe', label: 'Écharpe', icon: '🧣', xp: 300 },
  { id: 'maillot', label: 'Maillot n°10', icon: '👕', xp: 600 },
  { id: 'gants', label: 'Gants de gardien', icon: '🧤', xp: 1000 },
  { id: 'couronne', label: 'Couronne', icon: '👑', xp: 1600 },
];

export function mascot({ outfit = store.settings().outfit || [], mood = 'happy', ball = true, cls = 'mascot' } = {}) {
  const has = id => outfit.includes(id);
  const eyes = mood === 'happy'
    ? `<path d="M80 80 q6 -8 12 0" stroke="#2b1d12" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M108 80 q6 -8 12 0" stroke="#2b1d12" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
    : mood === 'sad'
      ? `<ellipse class="cat-eye" cx="86" cy="82" rx="4.5" ry="6" fill="#2b1d12"/><ellipse class="cat-eye" cx="114" cy="82" rx="4.5" ry="6" fill="#2b1d12"/><path d="M78 72 l12 4 M122 72 l-12 4" stroke="#2b1d12" stroke-width="2.5" stroke-linecap="round"/>`
      : `<ellipse class="cat-eye" cx="86" cy="80" rx="5" ry="7" fill="#2b1d12"/><ellipse class="cat-eye" cx="114" cy="80" rx="5" ry="7" fill="#2b1d12"/><circle cx="88" cy="77" r="1.8" fill="#fff"/><circle cx="116" cy="77" r="1.8" fill="#fff"/>`;
  const mouth = mood === 'sad'
    ? `<path d="M92 103 q8 -6 16 0" stroke="#2b1d12" stroke-width="2.5" fill="none" stroke-linecap="round"/>`
    : `<path d="M100 96 v4 M100 100 q-5 6 -10 2 M100 100 q5 6 10 2" stroke="#2b1d12" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  return `<svg class="${cls}" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${store.settings().catName || 'La mascotte'}, le chat footballeur">
  <g class="cat-body">
    <path class="cat-tail" d="M140 150 q38 -6 30 -48 q-3 -14 -12 -10 q-6 4 0 14 q8 28 -22 30" fill="#ef9a4a" stroke="#c46f22" stroke-width="2"/>
    <ellipse cx="100" cy="142" rx="47" ry="42" fill="#f4a259" stroke="#c46f22" stroke-width="2"/>
    ${has('maillot') ? `<path d="M58 128 q42 -26 84 0 l-4 40 q-38 16 -76 0 z" fill="#1f8a4c" stroke="#156b3a" stroke-width="2"/><path d="M70 126 l-14 12 l8 10 l10 -8 M130 126 l14 12 l-8 10 l-10 -8" fill="#1f8a4c" stroke="#156b3a" stroke-width="2"/><text x="100" y="158" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="22" fill="#ffc83d">10</text>` : `<ellipse cx="100" cy="150" rx="26" ry="24" fill="#fbe3c4"/>`}
    <ellipse cx="80" cy="180" rx="15" ry="9" fill="${has('gants') ? '#ffc83d' : '#f4a259'}" stroke="${has('gants') ? '#c99a1d' : '#c46f22'}" stroke-width="2"/>
    <ellipse cx="120" cy="180" rx="15" ry="9" fill="${has('gants') ? '#ffc83d' : '#f4a259'}" stroke="${has('gants') ? '#c99a1d' : '#c46f22'}" stroke-width="2"/>
    ${has('echarpe') ? `<path d="M64 112 q36 16 72 0 l0 12 q-36 16 -72 0 z" fill="#ffc83d" stroke="#c99a1d" stroke-width="2"/><path d="M76 116 v12 M92 120 v12 M108 120 v12 M124 116 v12" stroke="#1f8a4c" stroke-width="5"/><path d="M120 122 l6 30 l12 -4 l-8 -28" fill="#ffc83d" stroke="#c99a1d" stroke-width="2"/>` : ''}
    <path d="M66 58 L70 20 L96 46 Z" fill="#f4a259" stroke="#c46f22" stroke-width="2" stroke-linejoin="round"/>
    <path d="M134 58 L130 20 L104 46 Z" fill="#f4a259" stroke="#c46f22" stroke-width="2" stroke-linejoin="round"/>
    <path d="M72 50 L73 30 L88 45 Z M128 50 L127 30 L112 45 Z" fill="#f7b8b0"/>
    <circle cx="100" cy="84" r="40" fill="#f4a259" stroke="#c46f22" stroke-width="2"/>
    <path d="M92 46 q8 8 16 0 M88 52 q12 10 24 0" stroke="#c46f22" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="100" cy="98" rx="20" ry="13" fill="#fbe3c4"/>
    ${eyes}
    <path d="M96 92 h8 l-4 5 z" fill="#e5735f"/>
    ${mouth}
    <path d="M78 94 l-22 -4 M78 99 l-22 2 M122 94 l22 -4 M122 99 l22 2" stroke="#8a5a32" stroke-width="1.6" stroke-linecap="round"/>
    <ellipse cx="76" cy="96" rx="6" ry="3.5" fill="#f7a59a" opacity=".6"/><ellipse cx="124" cy="96" rx="6" ry="3.5" fill="#f7a59a" opacity=".6"/>
    ${has('bandeau') ? `<path d="M61 70 q39 -16 78 0 l-2 9 q-37 -14 -74 0 z" fill="#e5533d" stroke="#a83a28" stroke-width="1.5"/><path d="M138 72 l14 -6 l-2 10 z" fill="#e5533d"/>` : ''}
    ${has('couronne') ? `<path d="M76 46 l6 -22 l10 14 l8 -18 l8 18 l10 -14 l6 22 z" fill="#ffc83d" stroke="#c99a1d" stroke-width="2" stroke-linejoin="round"/><circle cx="100" cy="30" r="3" fill="#e5533d"/>` : ''}
  </g>
  ${ball ? `<g transform="translate(160 176)"><circle r="17" fill="#fff" stroke="#1b2a22" stroke-width="2"/><path d="M0 -7 l6.6 4.8 l-2.5 7.8 h-8.2 l-2.5 -7.8 z" fill="#1b2a22"/><path d="M0 -7 v-10 M6.6 -2.2 l9.5 -3 M4.1 5.6 l6 8 M-4.1 5.6 l-6 8 M-6.6 -2.2 l-9.5 -3" stroke="#1b2a22" stroke-width="1.6"/></g>` : ''}
</svg>`;
}

// ---------- Sons (WebAudio, aucun fichier) ----------
let ctx;
function audio() {
  if (!store.settings().sound) return null;
  try { ctx ||= new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); return ctx; }
  catch (e) { return null; }
}
function tone(freq, start, dur, type = 'sine', vol = .12) {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, a.currentTime + start);
  g.gain.linearRampToValueAtTime(vol, a.currentTime + start + .015);
  g.gain.exponentialRampToValueAtTime(.0001, a.currentTime + start + dur);
  o.connect(g).connect(a.destination); o.start(a.currentTime + start); o.stop(a.currentTime + start + dur + .05);
}
function crowd(dur = .9, vol = .07) {
  const a = audio(); if (!a) return;
  const len = a.sampleRate * dur, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / len);
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = .6; g.gain.value = vol;
  src.buffer = buf; src.connect(f).connect(g).connect(a.destination); src.start();
}
export const sound = {
  goal() { crowd(); tone(660, 0, .12, 'triangle'); tone(880, .1, .18, 'triangle'); tone(1320, .22, .25, 'triangle', .09); },
  miss() { tone(220, 0, .18, 'sine', .1); tone(180, .12, .22, 'sine', .08); },
  whistle() { tone(2300, 0, .12, 'square', .04); tone(2300, .16, .3, 'square', .04); },
  flip() { tone(520, 0, .06, 'triangle', .05); },
  record() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * .09, .3, 'triangle', .09)); crowd(1.4, .08); },
  click() { tone(800, 0, .04, 'square', .02); },
};

// ---------- Confettis ----------
const COLORS = ['#ffc83d', '#1f8a4c', '#e5533d', '#2f6fd6', '#ffffff', '#f4a259'];
export function confetti(n = 60) {
  if (reduced()) return;
  const root = fx();
  for (let i = 0; i < n; i++) {
    const c = document.createElement('i');
    c.className = 'confetto';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = COLORS[i % COLORS.length];
    c.style.animationDuration = (1.4 + Math.random() * 1.6) + 's';
    c.style.animationDelay = (Math.random() * .3) + 's';
    c.style.transform = `rotate(${Math.random() * 360}deg)`;
    root.appendChild(c);
    setTimeout(() => c.remove(), 3500);
  }
}

export function clearFx() { fx().querySelectorAll('.fx-overlay').forEach(e => e.remove()); }
function overlay(html, ms) {
  clearFx();
  const el = document.createElement('div');
  el.className = 'fx-overlay';
  el.innerHTML = html;
  fx().appendChild(el);
  setTimeout(() => el.remove(), ms);
  return el;
}

const GOAL_SVG = (extra = '') => `<svg class="fx-goal" viewBox="0 0 300 200">
  <defs><pattern id="net" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M0 0 L14 14 M14 0 L0 14" stroke="rgba(255,255,255,.7)" stroke-width="1"/></pattern></defs>
  <g class="netg" style="transform-origin:150px 60px">
    <rect x="30" y="20" width="240" height="90" fill="url(#net)" opacity=".9"/>
  </g>
  <path d="M30 112 V20 H270 V112" fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="round"/>
  <ellipse cx="150" cy="190" rx="140" ry="10" fill="rgba(0,0,0,.18)"/>
  ${extra}
</svg>`;

// ---------- But ! ----------
export function goal(label = 'BUT !') {
  sound.goal();
  if (reduced()) { flashText(label); return; }
  const corner = Math.random() < .5 ? -1 : 1;
  const el = overlay(`<div style="position:relative;display:grid;place-items:center">
    ${GOAL_SVG()}
    <svg viewBox="-20 -20 40 40" width="46" height="46" style="position:absolute;bottom:-40px;--tx:${corner * 95}px;--ty:-150px;animation:kick .45s cubic-bezier(.2,.7,.3,1) forwards">
      <circle r="17" fill="#fff" stroke="#1b2a22" stroke-width="2"/><path d="M0 -7 l6.6 4.8 l-2.5 7.8 h-8.2 l-2.5 -7.8 z" fill="#1b2a22"/>
    </svg>
    <div class="fx-text" style="animation-delay:.35s">${label}</div></div>`, 1500);
  setTimeout(() => { const n = el.querySelector('.netg'); if (n) n.style.animation = 'netshake .4s'; }, 420);
  setTimeout(() => confetti(45), 380);
}

// ---------- Arrêt du gardien (erreur) ----------
export function save(label = 'Arrêté !') {
  sound.miss();
  if (reduced()) { flashText(label, true); return; }
  const dir = Math.random() < .5 ? -1 : 1;
  overlay(`<div style="position:relative;display:grid;place-items:center;opacity:.97">
    ${GOAL_SVG()}
    <div style="position:absolute;top:36px;width:110px;--dx:${dir * 60}px;--rot:${dir * 25}deg;animation:keeperdive .35s ease-out .1s forwards">
      ${mascot({ outfit: ['gants'], mood: 'neutral', ball: true, cls: '' })}
    </div>
    <div class="fx-text small" style="top:170px;animation-delay:.25s">${label}</div></div>`, 1200);
}

export function flashText(t, small = false) {
  overlay(`<div class="fx-text ${small ? 'small' : ''}" style="animation:none;opacity:1">${t}</div>`, 700);
}

// ---------- Série ----------
export function streak(n) {
  if (reduced()) { toast(`🔥 Série de ${n} !`); return; }
  sound.whistle();
  const el = document.createElement('div');
  el.style.cssText = 'position:absolute;bottom:12%;left:0;width:110px;animation:roll 1.8s linear forwards';
  el.innerHTML = mascot({ mood: 'happy', ball: false, cls: '' });
  fx().appendChild(el);
  overlay(`<div class="fx-text" style="font-size:clamp(1.8rem,7vw,3rem)">Série de ${n} ! 🔥</div>`, 1300);
  setTimeout(() => el.remove(), 1900);
}

// ---------- Record ----------
export function record(text = 'NOUVEAU RECORD !') {
  sound.record();
  confetti(reduced() ? 0 : 140);
  overlay(`<div style="display:grid;place-items:center;gap:6px">
    <div style="font-size:clamp(4rem,16vw,7rem);animation:bigtext .9s cubic-bezier(.2,1.4,.4,1) both">🏆</div>
    <div class="fx-text" style="position:static;font-size:clamp(1.8rem,7vw,3.2rem);animation-delay:.2s">${text}</div></div>`, 2200);
}

// ---------- Le chat passe la tête (encouragement) ----------
export function peekCat(mood = 'happy') {
  if (reduced()) return;
  const el = document.createElement('div');
  el.className = 'fx-toast-cat';
  el.innerHTML = mascot({ mood, ball: false, cls: '' });
  fx().appendChild(el);
  setTimeout(() => el.remove(), 1700);
}

// ---------- Toast ----------
let toastTimer;
export function toast(msg, ms = 2400) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

export function applyMotionSetting() {
  document.documentElement.classList.toggle('no-anim', !store.settings().anim);
}
