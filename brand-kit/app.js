/* =========================================================
   OSINACHI · BRAND KIT
   - starfield generation
   - scroll-driven nav active state
   - tweaks (palette / type / motif)
   - palette-aware swatch rendering
   ========================================================= */

const body = document.body;

/* ---------- STAR FIELD ---------- */
(function stars() {
  const host = document.getElementById('stars');
  if (!host) return;
  const count = window.matchMedia('(max-width: 900px)').matches ? 60 : 120;
  const frag = document.createDocumentFragment();
  // deterministic pseudo-random so stars don't jump around every reload
  let seed = 7;
  const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.className = 's';
    const r = rand();
    if (r > 0.95) s.classList.add('xl');
    else if (r > 0.8) s.classList.add('big');
    s.style.left = (rand() * 100).toFixed(2) + '%';
    s.style.top = (rand() * 100).toFixed(2) + '%';
    frag.appendChild(s);
  }
  host.appendChild(frag);
})();

/* ---------- COLOR SWATCH RENDERING ---------- */
const PALETTES = {
  daylight: [
    { n: 'Paper',      c: '#F6F2EB', ink: '#141230', role: '--bg' },
    { n: 'Linen',      c: '#ECE6DB', ink: '#141230', role: '--bg-2' },
    { n: 'Rule',       c: '#CFC6B5', ink: '#141230', role: '--rule' },
    { n: 'Midnight',   c: '#141230', ink: '#F6F2EB', role: '--ink' },
    { n: 'Deep Gold',  c: '#7A5A10', ink: '#F6F2EB', role: '--accent' },
    { n: 'Lilac',      c: '#5A4CC0', ink: '#F6F2EB', role: '--accent-2' },
  ],
  midnight: [
    { n: 'Void',       c: '#0E0A28', ink: '#E8E2FF', role: '--bg' },
    { n: 'Dusk',       c: '#15103A', ink: '#E8E2FF', role: '--bg-2' },
    { n: 'Rule',       c: '#2A2252', ink: '#E8E2FF', role: '--rule' },
    { n: 'Moonstone',  c: '#E8E2FF', ink: '#0E0A28', role: '--ink' },
    { n: 'Gold',       c: '#E8C96A', ink: '#0E0A28', role: '--accent' },
    { n: 'Lilac',      c: '#B9A3FF', ink: '#0E0A28', role: '--accent-2' },
  ],
  terracotta: [
    { n: 'Umber',      c: '#1A0F0A', ink: '#F5E9DC', role: '--bg' },
    { n: 'Clay',       c: '#2A1A12', ink: '#F5E9DC', role: '--bg-2' },
    { n: 'Rule',       c: '#3A2418', ink: '#F5E9DC', role: '--rule' },
    { n: 'Bone',       c: '#F5E9DC', ink: '#1A0F0A', role: '--ink' },
    { n: 'Terracotta', c: '#E27A4F', ink: '#1A0F0A', role: '--accent' },
    { n: 'Sand',       c: '#F3C77A', ink: '#1A0F0A', role: '--accent-2' },
  ],
  pine: [
    { n: 'Forest',     c: '#0A1512', ink: '#E4EEE6', role: '--bg' },
    { n: 'Moss',       c: '#0F2420', ink: '#E4EEE6', role: '--bg-2' },
    { n: 'Rule',       c: '#1C3A30', ink: '#E4EEE6', role: '--rule' },
    { n: 'Paper',      c: '#E4EEE6', ink: '#0A1512', role: '--ink' },
    { n: 'Chartreuse', c: '#E8D37A', ink: '#0A1512', role: '--accent' },
    { n: 'Mint',       c: '#7DC9A7', ink: '#0A1512', role: '--accent-2' },
  ],
  bone: [
    { n: 'Bone',       c: '#EDE6D8', ink: '#1A1510', role: '--bg' },
    { n: 'Linen',      c: '#E3DAC7', ink: '#1A1510', role: '--bg-2' },
    { n: 'Rule',       c: '#C7BCA4', ink: '#1A1510', role: '--rule' },
    { n: 'Ink',        c: '#1A1510', ink: '#EDE6D8', role: '--ink' },
    { n: 'Vermillion', c: '#B23A1D', ink: '#EDE6D8', role: '--accent' },
    { n: 'Steel',      c: '#2E4A6B', ink: '#EDE6D8', role: '--accent-2' },
  ],
};

function renderSwatches(key) {
  // Legacy single-host (kept in case other pages use it)
  const host = document.getElementById('swatches');
  if (host) {
    const pal = PALETTES[key] || PALETTES.daylight;
    host.innerHTML = pal.map(s => `
      <div class="swatch" style="--_c:${s.c}; --_ink:${s.ink}; background:${s.c}; color:${s.ink}">
        <div><div class="label">${s.role}</div></div>
        <div><div class="name">${s.n}</div><div class="hex">${s.c.toUpperCase()}</div></div>
      </div>
    `).join('');
  }
  // Render both palettes statically wherever #swatches-<key> exists
  for (const pk of Object.keys(PALETTES)) {
    const el = document.getElementById('swatches-' + pk);
    if (!el) continue;
    el.innerHTML = PALETTES[pk].map(s => `
      <div class="swatch" style="--_c:${s.c}; --_ink:${s.ink}; background:${s.c}; color:${s.ink}">
        <div><div class="label">${s.role}</div></div>
        <div><div class="name">${s.n}</div><div class="hex">${s.c.toUpperCase()}</div></div>
      </div>
    `).join('');
  }
}

/* ---------- TYPE NAMES ---------- */
const TYPE_LABELS = {
  instrument: { display: 'Newsreader',         mono: 'Fira Code' },
  bodoni:     { display: 'Cormorant Garamond', mono: 'JetBrains Mono' },
  dmserif:    { display: 'Fraunces',           mono: 'Fira Code' },
};
function applyTypeLabels(key) {
  const labels = TYPE_LABELS[key] || TYPE_LABELS.instrument;
  const d = document.getElementById('type-display-name');
  const m = document.getElementById('type-mono-name');
  if (d) d.textContent = labels.display;
  if (m) m.textContent = labels.mono;
}

/* ---------- APPLY TWEAKS ---------- */
function applyTweaks(t) {
  if (t.palette)      body.dataset.palette = t.palette;
  if (t.typePairing)  body.dataset.type    = t.typePairing;
  if (t.motifDensity) body.dataset.motif   = t.motifDensity;
  renderSwatches(body.dataset.palette);
  applyTypeLabels(body.dataset.type);
  // mark active buttons
  document.querySelectorAll('#tweaks .tw-opt, #tweaks .tw-swatch').forEach(btn => {
    const group = btn.closest('.tw-opts').dataset.group;
    const key = group === 'palette' ? body.dataset.palette : group === 'type' ? body.dataset.type : body.dataset.motif;
    btn.classList.toggle('active', btn.dataset.value === key);
  });
}

/* initialize from TWEAKS block (overridden by saved user preference) */
const state = Object.assign({}, TWEAKS);
try {
  const saved = localStorage.getItem('palette');
  if (saved === 'daylight' || saved === 'midnight') state.palette = saved;
} catch {}
applyTweaks(state);

/* ---------- THEME TOGGLE (sun ⇄ moon) ---------- */
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const next = body.dataset.palette === 'daylight' ? 'midnight' : 'daylight';
    state.palette = next;
    applyTweaks(state);
    try { localStorage.setItem('palette', next); } catch {}
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { palette: next } }, '*');
  });
}

/* ---------- WORK-CARD DISCLOSURE (mobile) ---------- */
document.querySelectorAll('.wc-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const card = btn.closest('.work-card');
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    if (card) card.classList.toggle('is-expanded', !expanded);
  });
});

/* ---------- MOBILE MENU (takeover) ---------- */
const menuTrigger = document.getElementById('menu-trigger');
const mobileMenu  = document.getElementById('mobile-menu');
if (menuTrigger && mobileMenu) {
  const isOpen    = () => document.body.classList.contains('menu-open');
  const openMenu  = () => {
    document.body.classList.add('menu-open');
    menuTrigger.setAttribute('aria-expanded', 'true');
    mobileMenu.setAttribute('aria-hidden', 'false');
  };
  const closeMenu = () => {
    document.body.classList.remove('menu-open');
    menuTrigger.setAttribute('aria-expanded', 'false');
    mobileMenu.setAttribute('aria-hidden', 'true');
  };
  menuTrigger.addEventListener('click', () => isOpen() ? closeMenu() : openMenu());
  mobileMenu.addEventListener('click', (e) => {
    if (e.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) { closeMenu(); menuTrigger.focus(); }
  });
}

/* ---------- TWEAK BUTTONS ---------- */
document.querySelectorAll('#tweaks .tw-opts').forEach(group => {
  group.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-value]');
    if (!btn) return;
    const g = group.dataset.group;
    const v = btn.dataset.value;
    if (g === 'palette') state.palette = v;
    else if (g === 'type') state.typePairing = v;
    else if (g === 'motif') state.motifDensity = v;
    applyTweaks(state);
    // persist — only send keys that exist on state
    const edits = {};
    for (const k of ['palette','typePairing','motifDensity']) if (state[k]) edits[k] = state[k];
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits }, '*');
  });
});

/* ---------- EDIT MODE (TWEAKS) ---------- */
window.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type === '__activate_edit_mode') {
    document.getElementById('tweaks').classList.add('open');
  } else if (d.type === '__deactivate_edit_mode') {
    document.getElementById('tweaks').classList.remove('open');
  }
});
window.parent.postMessage({ type: '__edit_mode_available' }, '*');

/* ---------- NAV ACTIVE STATE ---------- */
const navLinks = document.querySelectorAll('.nav-list a');
const navCur = document.getElementById('nav-cur');
const sections = Array.from(document.querySelectorAll('.page'));

const io = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (en.isIntersecting) {
      const id = en.target.id;
      navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + id));
      const match = document.querySelector('.nav-list a.is-active');
      if (match && navCur) {
        navCur.textContent = match.dataset.page;
      }
    }
  });
}, { threshold: 0.45 });

sections.forEach(s => io.observe(s));

/* ---------- SMOOTH ANCHOR NAV (nav + foot links) ---------- */
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href').slice(1);
  const el = document.getElementById(id);
  if (el) {
    e.preventDefault();
    /* scrollIntoView honours html { scroll-padding-top } so the section
       lands below the fixed nav on both desktop and mobile */
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});
