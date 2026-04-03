// AI Plantoetser — app.js
// Bootstrap, app state, keyboard shortcuts, theme, sidebar

import { initRouter, registerRoute, navigate } from './router.js';
import { renderDashboard }   from './views/dashboard.js';
import { renderZoeken }      from './views/zoeken.js';
import { renderPlanregels }  from './views/planregels.js';
import { renderMaatvoeringen } from './views/maatvoeringen.js';
import { renderActiviteiten } from './views/activiteiten.js';
import { renderVereisten }   from './views/vereisten.js';
import { renderAdvies }      from './views/advies.js';
import { db, getRecentPercelen } from './db/database.js';

// ── App state ────────────────────────────────────────────────
let _activePerceelId = null;

export function setActivePerceel(id) {
  _activePerceelId = id;
  updateSidebarPerceel();
}

export async function getActivePerceel() {
  if (!_activePerceelId) return null;
  return db.get('percelen', _activePerceelId);
}

// ── Theme ────────────────────────────────────────────────────
let _theme = null; // null = system

function initTheme() {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  _theme = null;
  applyTheme(prefersDark ? 'dark' : 'light');
}

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  updateThemeIcon(t);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  _theme = current === 'dark' ? 'light' : 'dark';
  applyTheme(_theme);
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.setAttribute('aria-label', theme === 'dark' ? 'Schakel naar licht thema' : 'Schakel naar donker thema');
  btn.innerHTML = theme === 'dark'
    ? `<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"/>
      </svg>`
    : `<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
      </svg>`;
}

// ── Sidebar ──────────────────────────────────────────────────
function initSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  const hamburger = document.getElementById('hamburger');

  if (!sidebar || !overlay || !hamburger) return;

  hamburger.addEventListener('click', () => {
    const open = sidebar.classList.toggle('open');
    overlay.classList.toggle('visible', open);
    hamburger.setAttribute('aria-expanded', open);
  });

  overlay.addEventListener('click', closeSidebar);

  // Sluit sidebar bij navigatie op mobiel
  sidebar.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 900) closeSidebar();
    });
  });

  // ── Swipe-gestures (iPad) ──────────────────────────────
  let touchStartX = 0;
  let touchStartY = 0;

  document.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx > 0 && touchStartX < 40 && !sidebar.classList.contains('open')) {
        sidebar.classList.add('open');
        overlay.classList.add('visible');
      } else if (dx < 0 && sidebar.classList.contains('open')) {
        closeSidebar();
      }
    }
  }, { passive: true });

  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
    hamburger.setAttribute('aria-expanded', 'false');
  }
}

async function updateSidebarPerceel() {
  const perceel = await getActivePerceel();
  const infoEl  = document.getElementById('sidebar-perceel-info');
  if (!infoEl) return;

  if (!perceel) {
    infoEl.style.display = 'none';
    return;
  }
  infoEl.style.display = 'block';
  infoEl.innerHTML = `
    <div class="sidebar__perceel">
      <div class="sidebar__perceel-label">Huidig perceel</div>
      <div class="sidebar__perceel-address">${perceel.straatnaam ?? ''} ${perceel.huisnummer ?? ''}</div>
      <div class="sidebar__perceel-sub">${perceel.woonplaats ?? ''} · ${perceel.postcode ?? ''}</div>
    </div>
  `;
}

// ── Keyboard shortcuts ────────────────────────────────────────
function initKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    // Cmd/Ctrl + K → zoekfocus
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      const searchInput = document.querySelector('.search-input');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      } else {
        navigate('#zoeken');
      }
    }

    // Cmd/Ctrl + D → dashboard
    if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
      e.preventDefault();
      navigate('#dashboard');
    }

    // Cmd/Ctrl + P → PDF export
    if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
      const route = window.location.hash.slice(1);
      if (route === 'advies') {
        e.preventDefault();
        document.getElementById('btn-pdf')?.click();
      }
      // Anders: browser print mag gewoon
    }

    // Escape → sluit modals, dropdowns, sidebar
    if (e.key === 'Escape') {
      document.querySelectorAll('.suggestions.open').forEach(el => {
        el.classList.remove('open');
        el.innerHTML = '';
      });
      const sidebar = document.getElementById('sidebar');
      if (sidebar?.classList.contains('open')) {
        sidebar.classList.remove('open');
        document.getElementById('sidebar-overlay')?.classList.remove('visible');
      }
    }
  });
}

// ── Offline banner ───────────────────────────────────────────
function initOfflineBanner() {
  const banner = document.getElementById('offline-banner');
  if (!banner) return;

  const update = () => {
    banner.classList.toggle('visible', !navigator.onLine);
  };
  window.addEventListener('online',  update);
  window.addEventListener('offline', update);
  update();
}

// ── Service Worker registratie ───────────────────────────────
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('./service-worker.js');
    console.log('[SW] Registered:', reg.scope);
  } catch (e) {
    console.warn('[SW] Registration failed:', e);
  }
}

// ── PWA icon generatie via canvas ────────────────────────────
function generateIcons() {
  for (const size of [192, 512]) {
    const canvas = document.createElement('canvas');
    canvas.width  = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Achtergrond
    ctx.fillStyle = '#01696f';
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, size * 0.2);
    ctx.fill();

    // Logo: kaartspeld + vinkje
    const s = size / 32;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(16 * s, 10 * s, 8 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 1.75 * s;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';

    // Vinkje
    ctx.beginPath();
    ctx.moveTo(12.5 * s, 10 * s);
    ctx.lineTo(15 * s, 12.5 * s);
    ctx.lineTo(19.5 * s, 8 * s);
    ctx.stroke();

    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('link');
      link.rel  = 'apple-touch-icon';
      link.href = url;
      if (!document.querySelector(`link[sizes="${size}x${size}"]`)) {
        document.head.appendChild(link);
      }
    }, 'image/png');
  }
}

// ── Init ─────────────────────────────────────────────────────
async function init() {
  // Theme
  initTheme();

  // Theme toggle knop
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

  // Sidebar
  initSidebar();

  // Keyboard
  initKeyboardShortcuts();

  // Offline banner
  initOfflineBanner();

  // Service Worker
  registerServiceWorker();

  // Genereer canvas-icons
  generateIcons();

  // Routes
  registerRoute('dashboard',    renderDashboard);
  registerRoute('zoeken',       renderZoeken);
  registerRoute('planregels',   renderPlanregels);
  registerRoute('maatvoeringen', renderMaatvoeringen);
  registerRoute('activiteiten', renderActiviteiten);
  registerRoute('vereisten',    renderVereisten);
  registerRoute('advies',       renderAdvies);

  // Router starten
  const mainContent = document.getElementById('main-content');
  initRouter(mainContent, async (route) => {
    await updateSidebarPerceel();
  });

  // Initieel actief perceel ophalen (meest recente)
  try {
    const recente = await getRecentPercelen(1);
    if (recente.length) _activePerceelId = recente[0].id;
  } catch (_) {}
}

// Maak navigate globaal beschikbaar voor inline onclick handlers
window.navigate = navigate;

// Start
document.addEventListener('DOMContentLoaded', init);
