// AI Plantoetser — router.js
// Hash-based single page routing

const routes = {};

export function registerRoute(hash, renderFn) {
  routes[hash] = renderFn;
}

export function navigate(hash) {
  window.location.hash = hash.startsWith('#') ? hash : '#' + hash;
}

export function currentRoute() {
  return window.location.hash || '#dashboard';
}

export function initRouter(containerEl, onNavigate) {
  async function handleRoute() {
    const hash = window.location.hash || '#dashboard';
    const route = hash.slice(1); // verwijder '#'
    const renderFn = routes[route] ?? routes['dashboard'];

    if (!renderFn) return;

    // Update nav actieve staat
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.route === route);
    });

    // Update sidebar perceel weergave
    if (typeof onNavigate === 'function') onNavigate(route);

    // Render view
    containerEl.innerHTML = '';
    const viewEl = document.createElement('div');
    viewEl.className = 'view';
    containerEl.appendChild(viewEl);

    await renderFn(viewEl);
  }

  window.addEventListener('hashchange', handleRoute);
  handleRoute(); // initieel
}
