// ═══════════════════════════════════════════════
// category.js — Product Category Page Logic
// URL: category.html?type=COOLING&name=Cooling+Fans
// ═══════════════════════════════════════════════

(function () {
  'use strict';

  const D = window.MOCKINGJAY_DATA || { categories: [], products: [] };

  function getParams() {
    const p = new URLSearchParams(window.location.search);
    return {
      type: p.get('type') || '',
      name: p.get('name') || 'All Products'
    };
  }

  function getProducts(type) {
    if (!type || type === 'ALL') return D.products;
    return D.products.filter(p => p.type === type);
  }

  function renderBreadcrumb(name) {
    const el = document.querySelector('#breadcrumb-current');
    if (el) el.textContent = name;
  }

  function renderPageTitle(name, count) {
    const titleEl = document.querySelector('#page-title');
    const subEl   = document.querySelector('#page-sub');
    const countEl = document.querySelector('#products-count');

    if (titleEl) titleEl.textContent = name;
    if (subEl) {
      const cat = D.categories.find(c => c.name === name);
      subEl.textContent = cat ? cat.description : `Browse our ${name} collection. Factory direct pricing, OEM/ODM available.`;
    }
    if (countEl) countEl.textContent = `${count} product${count !== 1 ? 's' : ''}`;
  }

  function renderFilters(currentType) {
    const container = document.querySelector('#filter-tags');
    if (!container) return;

    const all = { name: 'All Products', type: 'ALL' };
    const filters = [all, ...D.categories];

    container.innerHTML = filters.map(f => {
      const active = (f.type === currentType) || (f.type === 'ALL' && !currentType) ? 'active' : '';
      return `<button class="filter-tag ${active}" data-type="${f.type}">${f.name}</button>`;
    }).join('');

    container.querySelectorAll('.filter-tag').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        const name = filters.find(f => f.type === type)?.name || 'All Products';
        const url = type === 'ALL'
          ? 'category.html'
          : `category.html?type=${encodeURIComponent(type)}&name=${encodeURIComponent(name)}`;
        window.location.href = url;
      });
    });
  }

  function updateSEO(name, type) {
    document.title = `${name} | Mockingjay Tech`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = `Browse ${name} from Mockingjay Tech — factory direct portable fans with OEM/ODM customization available. Wholesale pricing for bulk orders.`;
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = window.location.href;
  }

  function init() {
    const { type, name } = getParams();
    const products = getProducts(type);

    renderBreadcrumb(name);
    renderPageTitle(name, products.length);
    renderFilters(type);
    updateSEO(name, type);

    const grid = document.querySelector('#products-grid');
    if (grid && window.MJ_Cards) {
      window.MJ_Cards.renderAll(grid, products);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
