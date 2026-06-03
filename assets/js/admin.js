// ═══════════════════════════════════════════════
// admin.js — Admin Panel Logic
// Uses localStorage to persist edits.
// Export data.js to push changes to live site.
// ═══════════════════════════════════════════════

// ── Auth Module ──────────────────────────────────
window.MJ_Auth = (function () {
  'use strict';

  const HASH_KEY    = 'mj_admin_hash';
  const SESSION_KEY = 'mj_admin_auth';
  const IS_LOCAL    = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function isAuthed()    { return IS_LOCAL || sessionStorage.getItem(SESSION_KEY) === '1'; }
  function hasPassword() { return !!localStorage.getItem(HASH_KEY); }
  function grantSession(){ sessionStorage.setItem(SESSION_KEY, '1'); }

  function showOverlay(mode) {
    document.getElementById('auth-overlay').style.display = 'flex';
    document.getElementById('auth-setup').style.display  = mode === 'setup' ? 'block' : 'none';
    document.getElementById('auth-login').style.display  = mode === 'login' ? 'block' : 'none';
    clearError();
    const first = document.getElementById(mode === 'setup' ? 'setup-pass' : 'login-pass');
    if (first) setTimeout(() => first.focus(), 50);
  }

  function hideOverlay() {
    document.getElementById('auth-overlay').style.display = 'none';
  }

  function showError(msg) {
    // There are two #auth-error elements (one per panel) — show the visible one
    document.querySelectorAll('#auth-error').forEach(el => {
      const panel = el.closest('#auth-setup, #auth-login');
      if (panel && panel.style.display !== 'none') {
        el.textContent = msg;
        el.style.display = 'block';
      }
    });
  }

  function clearError() {
    document.querySelectorAll('#auth-error').forEach(el => {
      el.style.display = 'none'; el.textContent = '';
    });
  }

  async function submitSetup() {
    const p1 = document.getElementById('setup-pass').value;
    const p2 = document.getElementById('setup-pass2').value;
    if (p1.length < 6)    { showError('密码至少 6 位。'); return; }
    if (p1 !== p2)         { showError('两次密码不一致。'); return; }
    localStorage.setItem(HASH_KEY, await sha256(p1));
    grantSession();
    hideOverlay();
    MJ_Admin.showToast('密码设置成功，已登录。', 'success');
  }

  async function submitLogin() {
    const p = document.getElementById('login-pass').value;
    if (!p) { showError('请输入密码。'); return; }
    const hash = await sha256(p);
    if (hash !== localStorage.getItem(HASH_KEY)) {
      showError('密码错误，请重试。');
      document.getElementById('login-pass').value = '';
      return;
    }
    grantSession();
    hideOverlay();
  }

  async function changePassword() {
    const p1 = prompt('新密码（至少 6 位）：');
    if (!p1) return;
    if (p1.length < 6) { alert('密码至少 6 位。'); return; }
    const p2 = prompt('再输一次确认：');
    if (p1 !== p2) { alert('两次不一致，未修改。'); return; }
    localStorage.setItem(HASH_KEY, await sha256(p1));
    alert('密码已修改。下次登录生效。');
  }

  // Enter key shortcut
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const overlay = document.getElementById('auth-overlay');
    if (!overlay || overlay.style.display === 'none') return;
    if (document.getElementById('auth-setup').style.display !== 'none') submitSetup();
    else submitLogin();
  });

  function init() {
    if (IS_LOCAL) return; // localhost — skip entirely
    if (!isAuthed()) {
      showOverlay(hasPassword() ? 'login' : 'setup');
    }
  }

  return { init, submitSetup, submitLogin, changePassword };
})();

// ── Admin Module ─────────────────────────────────
window.MJ_Admin = (function () {
  'use strict';

  const STORAGE_KEY = 'mj_admin_data';

  // ── State ────────────────────────────────────
  let state = {
    products: [],
    categories: [],
    company: {}
  };
  let deleteTarget = null; // { type: 'product'|'category', index: number }
  let mediaPickerTarget = null; // { mode: 'product-images'|'color-image', row?: HTMLElement }
  let mediaPickerSelected = new Set();

  // ── Load / Save ──────────────────────────────
  function loadState() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        state.products = parsed.products || [];
        state.categories = parsed.categories || [];
        state.company = parsed.company || {};
        if (normalizeState()) persistState();
        return;
      } catch (e) {}
    }
    // Fall back to data.js
    const D = window.MOCKINGJAY_DATA || { products: [], categories: [], company: {} };
    state.products = JSON.parse(JSON.stringify(D.products || []));
    state.categories = JSON.parse(JSON.stringify(D.categories || []));
    state.company = JSON.parse(JSON.stringify(D.company || {}));
    normalizeState();
    persistState();
  }

  function normalizeState() {
    let changed = false;
    const oldFeaturedTypes = new Set();

    state.products.forEach(p => {
      if (p.featured) {
        oldFeaturedTypes.add(p.type);
        if (!p.homepageHero) p.homepageHero = true;
        delete p.featured;
        changed = true;
      }
      if (typeof p.homepageHero !== 'boolean') {
        p.homepageHero = !!p.homepageHero;
        changed = true;
      }
      if (!Array.isArray(p.images)) {
        p.images = [];
        changed = true;
      }
    });

    let heroFound = false;
    state.products.forEach(p => {
      if (!p.homepageHero) return;
      if (heroFound) {
        p.homepageHero = false;
        changed = true;
      } else {
        heroFound = true;
      }
    });

    state.categories.forEach(c => {
      if (typeof c.featured !== 'boolean') {
        c.featured = oldFeaturedTypes.has(c.type);
        changed = true;
      }
    });

    return changed;
  }

  function persistState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  // ── Navigation ───────────────────────────────
  function goSection(name) {
    document.querySelectorAll('.admin-nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.section === name);
    });
    document.querySelectorAll('.admin-section').forEach(el => {
      el.classList.toggle('active', el.id === `section-${name}`);
    });
    if (name === 'products') renderProductsTable();
    if (name === 'categories') renderCategoriesTable();
    if (name === 'dashboard') renderDashboard();
    if (name === 'media') renderMediaGrid();
    if (name === 'export') refreshPreview();
  }

  function initNav() {
    document.querySelectorAll('.admin-nav-item').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        goSection(btn.dataset.section);
      });
    });
  }

  // ── Dashboard ────────────────────────────────
  function renderDashboard() {
    const statsEl = document.getElementById('dashboard-stats');
    if (statsEl) {
      const featured = state.categories.filter(c => c.featured).length;
      const inStock = state.products.filter(p => p.stock === 'in').length;
      statsEl.innerHTML = `
        <div class="dashboard-stat"><div class="dashboard-stat-num">${state.products.length}</div><div class="dashboard-stat-label">Total Products</div></div>
        <div class="dashboard-stat"><div class="dashboard-stat-num">${state.categories.length}</div><div class="dashboard-stat-label">Categories</div></div>
        <div class="dashboard-stat"><div class="dashboard-stat-num">${featured}</div><div class="dashboard-stat-label">Featured Categories</div></div>
        <div class="dashboard-stat"><div class="dashboard-stat-num">${inStock}</div><div class="dashboard-stat-label">In Stock</div></div>
      `;
    }

    const listEl = document.getElementById('dashboard-product-list');
    if (listEl) {
      listEl.innerHTML = state.products.map((p, i) => `
        <div class="dashboard-product-row">
          <div class="dashboard-product-info">
            <span class="dp-sku">${p.sku}</span>
            <span class="dp-name">${p.name}</span>
          </div>
          <div class="dashboard-product-meta">
            <span class="dp-cat">${p.cat || '—'}</span>
            <span class="dp-stock dp-stock-${p.stock || 'in'}">${stockLabel(p.stock)}</span>
            <button class="admin-btn-sm" onclick="MJ_Admin.goSection('products'); setTimeout(() => MJ_Admin.openProductForm(${i}), 50)">Edit</button>
          </div>
        </div>
      `).join('');
    }
  }

  function stockLabel(s) {
    return { in: 'In Stock', low: 'Low Stock', back: 'Backordered' }[s] || 'In Stock';
  }

  // ── Products Table ───────────────────────────
  function renderProductsTable() {
    const tbody = document.getElementById('products-tbody');
    if (!tbody) return;

    if (!state.products.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-cell">No products yet. Click "+ Add Product" to get started.</td></tr>`;
      return;
    }

    tbody.innerHTML = state.products.map((p, i) => `
      <tr>
        <td><code>${p.sku}</code></td>
        <td>${p.name}</td>
        <td><span class="cat-chip">${p.cat || '—'}</span></td>
        <td>${p.price || '—'}</td>
        <td><span class="stock-chip stock-${p.stock || 'in'}">${stockLabel(p.stock)}</span></td>
        <td>${p.homepageHero ? '<span class="featured-star">Hero</span>' : '<span style="color:var(--text-muted)">-</span>'}</td>
        <td class="table-actions">
          <button class="admin-btn-sm" onclick="MJ_Admin.openProductForm(${i})">Edit</button>
          <button class="admin-btn-sm btn-danger" onclick="MJ_Admin.openDeleteConfirm('product', ${i}, '${esc(p.name)}')">Delete</button>
        </td>
      </tr>
    `).join('');
  }

  // ── Categories Table ─────────────────────────
  function renderCategoriesTable() {
    const tbody = document.getElementById('categories-tbody');
    if (!tbody) return;

    if (!state.categories.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-cell">No categories yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = state.categories.map((c, i) => `
      <tr>
        <td style="font-size:1.5rem">${c.icon || '📦'}</td>
        <td>${c.name}</td>
        <td><code>${c.type}</code></td>
        <td>${c.count || '—'}</td>
        <td><span class="color-swatch" style="background:${c.color || '#22D3EE'}" title="${c.color}"></span></td>
        <td>${c.featured ? '<span class="featured-star">Yes</span>' : '<span style="color:var(--text-muted)">-</span>'}</td>
        <td class="table-actions">
          <button class="admin-btn-sm" onclick="MJ_Admin.openCategoryForm(${i})">Edit</button>
          <button class="admin-btn-sm btn-danger" onclick="MJ_Admin.openDeleteConfirm('category', ${i}, '${esc(c.name)}')">Delete</button>
        </td>
      </tr>
    `).join('');
  }

  // ── Product Form ─────────────────────────────
  function openProductForm(editIndex) {
    populateCategoryDropdowns();
    const modal = document.getElementById('product-modal');
    const titleEl = document.getElementById('product-modal-title');
    const idxInput = document.getElementById('pf-edit-index');

    clearProductForm();

    if (editIndex !== undefined && editIndex !== null && editIndex !== '') {
      const p = state.products[editIndex];
      titleEl.textContent = 'Edit Product';
      idxInput.value = String(editIndex);
      document.getElementById('pf-name').value = p.name || '';
      document.getElementById('pf-sku').value = p.sku || '';
      document.getElementById('pf-cat').value = p.cat || '';
      document.getElementById('pf-type').value = p.type || '';
      document.getElementById('pf-price').value = p.price || '';
      document.getElementById('pf-trade').value = p.trade || '';
      document.getElementById('pf-stock').value = p.stock || 'in';
      document.getElementById('pf-homepage-hero').checked = !!p.homepageHero;
      document.getElementById('pf-tags').value = (p.tags || []).join(', ');
      document.getElementById('pf-images').value = (p.images || []).join('\n');
      document.getElementById('pf-video').value = p.video || '';

      const d = p.detail || {};
      document.getElementById('pf-description').value = d.description || '';
      document.getElementById('pf-specs').value = d.specs ? JSON.stringify(d.specs, null, 2) : '';
      document.getElementById('pf-features').value = (d.features || []).join('\n');
      document.getElementById('pf-applications').value = (d.applications || []).join('\n');
      document.getElementById('pf-customization').value = (d.customization || []).join('\n');
      document.getElementById('pf-moq').value = (d.moq) || '';
      document.getElementById('pf-leadtime').value = (d.leadtime) || '';
      document.getElementById('pf-package').value = d.package || '';

      renderColorRows(p.colors || []);
    } else {
      titleEl.textContent = 'Add Product';
      idxInput.value = '';
      renderColorRows([]);
    }

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeProductForm() {
    document.getElementById('product-modal').classList.remove('open');
    document.body.style.overflow = '';
  }

  function clearProductForm() {
    ['pf-name','pf-sku','pf-price','pf-trade','pf-tags','pf-images','pf-video',
     'pf-description','pf-specs','pf-features','pf-applications','pf-customization',
     'pf-moq','pf-leadtime','pf-package'].forEach(id => {
       const el = document.getElementById(id);
       if (el) el.value = '';
    });
    const stockEl = document.getElementById('pf-stock');
    if (stockEl) stockEl.value = 'in';
    const featEl = document.getElementById('pf-homepage-hero');
    if (featEl) featEl.checked = false;
  }

  function saveProduct() {
    const name = document.getElementById('pf-name').value.trim();
    const sku = document.getElementById('pf-sku').value.trim().toUpperCase();
    if (!name || !sku) { showToast('Name and SKU are required.', 'error'); return; }
    const selectedType = document.getElementById('pf-type').value;
    const selectedCategory = state.categories.find(c => c.type === selectedType);
    if (!selectedCategory) {
      showToast('Please select a valid category before saving this product.', 'error');
      return;
    }

    let specsObj = {};
    const specsRaw = document.getElementById('pf-specs').value.trim();
    if (specsRaw) {
      try { specsObj = JSON.parse(specsRaw); } catch(e) { showToast('Specs JSON is invalid — please fix it.', 'error'); return; }
    }

    const product = {
      cat: selectedCategory.name,
      name,
      sku,
      price: document.getElementById('pf-price').value.trim(),
      trade: document.getElementById('pf-trade').value.trim(),
      stock: document.getElementById('pf-stock').value,
      type: selectedCategory.type,
      homepageHero: document.getElementById('pf-homepage-hero').checked,
      tags: document.getElementById('pf-tags').value.split(',').map(t => t.trim()).filter(Boolean),
      images: document.getElementById('pf-images').value.split('\n').map(s => s.trim()).filter(Boolean),
      video: document.getElementById('pf-video').value.trim() || undefined,
      colors: readColorRows(),
      detail: {
        description: document.getElementById('pf-description').value.trim(),
        specs: specsObj,
        features: document.getElementById('pf-features').value.split('\n').map(s => s.trim()).filter(Boolean),
        applications: document.getElementById('pf-applications').value.split('\n').map(s => s.trim()).filter(Boolean),
        customization: document.getElementById('pf-customization').value.split('\n').map(s => s.trim()).filter(Boolean),
        moq: document.getElementById('pf-moq').value.trim(),
        leadtime: document.getElementById('pf-leadtime').value.trim(),
        package: document.getElementById('pf-package').value.trim()
      }
    };

    const idx = document.getElementById('pf-edit-index').value;
    if (product.homepageHero) {
      state.products.forEach((p, i) => {
        if (idx === '' || i !== parseInt(idx, 10)) p.homepageHero = false;
      });
    }
    if (idx !== '') {
      state.products[parseInt(idx, 10)] = product;
    } else {
      state.products.push(product);
    }

    persistState();
    renderProductsTable();
    closeProductForm();
    showToast(`Product "${name}" saved.`, 'success');
  }

  // ── Color Rows ───────────────────────────────
  function renderColorRows(colors) {
    const list = document.getElementById('pf-colors-list');
    if (!list) return;
    list.innerHTML = colors.map((c, i) => colorRowHTML(i, c)).join('');
  }

  function colorRowHTML(i, c) {
    return `
    <div class="color-row" data-color-index="${i}">
      <div class="color-field color-field-id">
        <span>Color ID</span>
        <input class="form-input color-id" type="text" placeholder="purple" value="${esc(c.id || '')}">
      </div>
      <div class="color-field color-field-hex">
        <span>Hex</span>
        <div class="color-hex-group">
          <input class="form-input color-hex" type="text" placeholder="#A78BFA" value="${esc(c.hex || '')}">
          <input type="color" class="color-picker-input" value="${c.hex || '#ffffff'}" oninput="this.previousElementSibling.value=this.value">
        </div>
      </div>
      <div class="color-field color-field-label">
        <span>Display Name</span>
        <input class="form-input color-label" type="text" placeholder="Purple" value="${esc(c.label || '')}">
      </div>
      <div class="color-field color-field-image">
        <span>Color Image Path</span>
        <div class="color-image-actions">
          <input class="form-input color-img" type="text" placeholder="media/jf168-purple.jpg" value="${esc(c.image || '')}">
          <button type="button" class="admin-btn-sm" onclick="MJ_Admin.openMediaPicker('color-image', this.closest('.color-row'))">Select</button>
        </div>
      </div>
      <button type="button" class="admin-btn-sm btn-danger color-remove" onclick="this.closest('.color-row').remove()">Delete</button>
    </div>`;
  }

  function addColorRow() {
    const list = document.getElementById('pf-colors-list');
    const i = list.querySelectorAll('.color-row').length;
    const div = document.createElement('div');
    div.innerHTML = colorRowHTML(i, {});
    list.appendChild(div.firstElementChild);
  }

  function readColorRows() {
    const rows = document.querySelectorAll('#pf-colors-list .color-row');
    return Array.from(rows).map(row => ({
      id: row.querySelector('.color-id').value.trim(),
      hex: row.querySelector('.color-hex').value.trim(),
      label: row.querySelector('.color-label').value.trim(),
      image: row.querySelector('.color-img').value.trim()
    })).filter(c => c.id || c.hex);
  }

  // ── Category Form ────────────────────────────
  function openCategoryForm(editIndex) {
    const modal = document.getElementById('category-modal');
    const titleEl = document.getElementById('category-modal-title');
    const idxInput = document.getElementById('cf-edit-index');

    ['cf-name','cf-type','cf-code','cf-count','cf-icon','cf-color','cf-description'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    if (editIndex !== undefined && editIndex !== null && editIndex !== '') {
      const c = state.categories[editIndex];
      titleEl.textContent = 'Edit Category';
      idxInput.value = String(editIndex);
      document.getElementById('cf-name').value = c.name || '';
      document.getElementById('cf-type').value = c.type || '';
      document.getElementById('cf-code').value = c.code || '';
      document.getElementById('cf-count').value = c.count || '';
      document.getElementById('cf-icon').value = c.icon || '';
      document.getElementById('cf-color').value = c.color || '#22D3EE';
      document.getElementById('cf-color-picker').value = c.color || '#22D3EE';
      document.getElementById('cf-description').value = c.description || '';
      document.getElementById('cf-featured').checked = !!c.featured;
    } else {
      titleEl.textContent = 'Add Category';
      idxInput.value = '';
      document.getElementById('cf-color').value = '#22D3EE';
      document.getElementById('cf-color-picker').value = '#22D3EE';
      document.getElementById('cf-featured').checked = false;
    }

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCategoryForm() {
    document.getElementById('category-modal').classList.remove('open');
    document.body.style.overflow = '';
  }

  function saveCategory() {
    const name = document.getElementById('cf-name').value.trim();
    const type = document.getElementById('cf-type').value.trim().toUpperCase();
    if (!name || !type) { showToast('Name and Type Code are required.', 'error'); return; }

    const category = {
      name,
      type,
      code: document.getElementById('cf-code').value.trim(),
      count: document.getElementById('cf-count').value.trim(),
      icon: document.getElementById('cf-icon').value.trim(),
      color: document.getElementById('cf-color').value.trim() || '#22D3EE',
      description: document.getElementById('cf-description').value.trim(),
      image: '',
      featured: document.getElementById('cf-featured').checked
    };

    const idx = document.getElementById('cf-edit-index').value;
    if (idx !== '') {
      const oldCategory = state.categories[parseInt(idx, 10)];
      const products = productsUsingCategory(oldCategory);
      if (oldCategory && oldCategory.type !== category.type && products.length) {
        showToast(`Cannot change Type Code while ${products.length} product(s) still use this category. Move or delete them first.`, 'error');
        return;
      }
      products.forEach(p => { p.cat = category.name; p.type = category.type; });
      state.categories[parseInt(idx, 10)] = category;
    } else {
      state.categories.push(category);
    }

    persistState();
    renderCategoriesTable();
    closeCategoryForm();
    showToast(`Category "${name}" saved.`, 'success');
  }

  // ── Dropdowns ────────────────────────────────
  function populateCategoryDropdowns() {
    const catSel = document.getElementById('pf-cat');
    const typeSel = document.getElementById('pf-type');
    if (catSel) {
      catSel.innerHTML = state.categories.map(c => `<option value="${esc(c.name)}" data-type="${esc(c.type)}">${c.name}</option>`).join('');
    }
    if (typeSel) {
      typeSel.innerHTML = state.categories.map(c => `<option value="${esc(c.type)}" data-name="${esc(c.name)}">${c.type} - ${c.name}</option>`).join('');
    }
    if (catSel && typeSel && !catSel.dataset.synced) {
      catSel.addEventListener('change', () => {
        const opt = catSel.options[catSel.selectedIndex];
        if (opt && opt.dataset.type) typeSel.value = opt.dataset.type;
      });
      typeSel.addEventListener('change', () => {
        const cat = state.categories.find(c => c.type === typeSel.value);
        if (cat) catSel.value = cat.name;
      });
      catSel.dataset.synced = '1';
      typeSel.dataset.synced = '1';
    }
  }

  // ── Delete ───────────────────────────────────
  function openDeleteConfirm(type, index, name) {
    if (type === 'category') {
      const category = state.categories[index];
      const products = productsUsingCategory(category);
      if (products.length) {
        const examples = products.slice(0, 4).map(p => p.name || p.sku).join(', ');
        const suffix = products.length > 4 ? ` and ${products.length - 4} more` : '';
        showToast(`Cannot delete "${category.name}". ${products.length} product(s) still use this category: ${examples}${suffix}.`, 'error');
        return;
      }
    }
    deleteTarget = { type, index };
    const msg = document.getElementById('delete-confirm-msg');
    if (msg) msg.textContent = `Delete "${name}"? This cannot be undone.`;
    document.getElementById('delete-modal').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDeleteConfirm() {
    deleteTarget = null;
    document.getElementById('delete-modal').classList.remove('open');
    document.body.style.overflow = '';
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const { type, index } = deleteTarget;
    if (type === 'product') {
      state.products.splice(index, 1);
      persistState();
      renderProductsTable();
      showToast('Product deleted.', 'success');
    } else if (type === 'category') {
      const category = state.categories[index];
      const products = productsUsingCategory(category);
      if (products.length) {
        showToast(`Cannot delete "${category.name}". Delete or move its products first.`, 'error');
        closeDeleteConfirm();
        return;
      }
      state.categories.splice(index, 1);
      persistState();
      renderCategoriesTable();
      showToast('Category deleted.', 'success');
    }
    closeDeleteConfirm();
  }

  // ── Media ────────────────────────────────────
  function productsUsingCategory(category) {
    if (!category) return [];
    return state.products.filter(p => p.type === category.type || p.cat === category.name);
  }

  function referencedPaths() {
    const paths = new Set();
    state.products.forEach(p => {
      (p.images || []).forEach(img => paths.add(img));
      if (p.video) paths.add(p.video);
      (p.colors || []).forEach(c => { if (c.image) paths.add(c.image); });
    });
    return paths;
  }

  function isImagePath(filePath) {
    return /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(filePath || '');
  }

  async function getAvailableMediaFiles() {
    if (IS_LOCAL) {
      const res = await fetch('/api/media');
      if (!res.ok) throw new Error('Unable to load media');
      const data = await res.json();
      return data.files || [];
    }
    return Array.from(referencedPaths()).map(path => ({ path }));
  }

  async function openMediaPicker(mode, row) {
    mediaPickerTarget = { mode, row: row || null };
    mediaPickerSelected = new Set();
    const modal = document.getElementById('media-picker-modal');
    const grid = document.getElementById('media-picker-grid');
    const addBtn = document.getElementById('media-picker-add-btn');
    if (!modal || !grid) return;
    if (addBtn) {
      addBtn.style.display = mode === 'product-images' ? 'inline-flex' : 'none';
      addBtn.disabled = true;
      addBtn.textContent = 'Add Selected';
    }

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    grid.innerHTML = `<div class="media-picker-empty">Loading media...</div>`;

    try {
      const files = (await getAvailableMediaFiles()).filter(file => isImagePath(file.path));
      if (!files.length) {
        grid.innerHTML = `<div class="media-picker-empty">No image files found. Upload images in Media Library first.</div>`;
        return;
      }

      grid.innerHTML = files.map(file => {
        const path = file.path;
        const name = path.replace(/^media\//, '');
        return `
          <button type="button" class="media-picker-item" data-media-path="${esc(path)}">
            <span class="media-picker-thumb">
              <img src="${esc(path)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
              <span class="media-picker-fallback" style="display:none">No preview</span>
            </span>
            <span class="media-picker-name" title="${esc(name)}">${esc(name)}</span>
          </button>`;
      }).join('');

      grid.querySelectorAll('[data-media-path]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (mediaPickerTarget && mediaPickerTarget.mode === 'product-images') {
            toggleMediaSelection(btn.dataset.mediaPath, btn);
          } else {
            chooseMediaPath(btn.dataset.mediaPath);
          }
        });
      });
    } catch {
      grid.innerHTML = `<div class="media-picker-empty">Unable to load media. Make sure the local admin server is running.</div>`;
    }
  }

  function toggleMediaSelection(path, btn) {
    if (!path) return;
    if (mediaPickerSelected.has(path)) {
      mediaPickerSelected.delete(path);
      btn.classList.remove('selected');
    } else {
      mediaPickerSelected.add(path);
      btn.classList.add('selected');
    }
    const addBtn = document.getElementById('media-picker-add-btn');
    if (addBtn) {
      addBtn.disabled = mediaPickerSelected.size === 0;
      addBtn.textContent = mediaPickerSelected.size ? `Add Selected (${mediaPickerSelected.size})` : 'Add Selected';
    }
  }

  function chooseSelectedMedia() {
    if (!mediaPickerTarget || mediaPickerTarget.mode !== 'product-images') return;
    const paths = Array.from(mediaPickerSelected);
    if (!paths.length) return;
    const textarea = document.getElementById('pf-images');
    if (textarea) {
      const current = textarea.value.split('\n').map(s => s.trim()).filter(Boolean);
      paths.forEach(path => { if (!current.includes(path)) current.push(path); });
      textarea.value = current.join('\n');
    }
    closeMediaPicker();
  }

  function chooseMediaPath(path) {
    if (!mediaPickerTarget || !path) return;

    if (mediaPickerTarget.mode === 'product-images') {
      const textarea = document.getElementById('pf-images');
      if (textarea) {
        const paths = textarea.value.split('\n').map(s => s.trim()).filter(Boolean);
        if (!paths.includes(path)) paths.push(path);
        textarea.value = paths.join('\n');
      }
    }

    if (mediaPickerTarget.mode === 'color-image' && mediaPickerTarget.row) {
      const input = mediaPickerTarget.row.querySelector('.color-img');
      if (input) input.value = path;
    }

    closeMediaPicker();
  }

  function closeMediaPicker() {
    mediaPickerTarget = null;
    mediaPickerSelected = new Set();
    const modal = document.getElementById('media-picker-modal');
    if (modal) modal.classList.remove('open');
    const addBtn = document.getElementById('media-picker-add-btn');
    if (addBtn) addBtn.style.display = 'none';
    document.body.style.overflow = document.querySelector('.admin-modal.open') ? 'hidden' : '';
  }

  function fmtSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function fmtDate(ms) {
    return new Date(ms).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', year: '2-digit' });
  }

  function mediaItemHTML(filePath, opts = {}) {
    const { size, mtime, used = true } = opts;
    const isVideo = /\.(mp4|webm|mov|m4v)$/i.test(filePath);
    const name = filePath.replace(/^media\//, '');
    return `
      <div class="media-item ${used ? '' : 'media-item-unused'}" data-path="${filePath}">
        <div class="media-item-thumb">
          ${isVideo
            ? `<div class="media-item-preview media-video">▶</div>`
            : `<img src="${filePath}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
               <div class="media-item-preview" style="display:none;font-size:11px;color:rgba(255,255,255,0.3)">无法预览</div>`}
          ${!used ? '<span class="media-unused-badge">未引用</span>' : ''}
        </div>
        <div class="media-item-info">
          <div class="media-item-name" title="${name}">${name}</div>
          <div class="media-item-meta">
            ${size !== undefined ? `<span>${fmtSize(size)}</span>` : ''}
            ${mtime !== undefined ? `<span>${fmtDate(mtime)}</span>` : ''}
          </div>
        </div>
        <button class="media-delete-btn" onclick="MJ_Admin.deleteMedia('${filePath}')" title="删除">✕</button>
      </div>`;
  }

  async function renderMediaGrid() {
    const grid = document.getElementById('media-grid');
    if (!grid) return;

    const refs = referencedPaths();

    if (IS_LOCAL) {
      grid.innerHTML = `<div class="media-loading">加载中…</div>`;
      try {
        const res  = await fetch('/api/media');
        const data = await res.json();
        const files = data.files || [];

        if (!files.length) {
          grid.innerHTML = `<div class="media-empty"><p>media/ 文件夹为空。上传图片或视频后在这里管理。</p></div>`;
          return;
        }

        // Split into used / unused
        const used   = files.filter(f => refs.has(f.path));
        const unused = files.filter(f => !refs.has(f.path));

        let html = '';
        if (used.length) html += used.map(f => mediaItemHTML(f.path, { size: f.size, mtime: f.mtime, used: true })).join('');
        if (unused.length) {
          html += `<div class="media-section-label">未被引用（可安全删除）</div>`;
          html += unused.map(f => mediaItemHTML(f.path, { size: f.size, mtime: f.mtime, used: false })).join('');
        }

        // Summary bar
        const totalSize = files.reduce((s, f) => s + f.size, 0);
        grid.innerHTML = `
          <div class="media-summary">
            <span>${files.length} 个文件 · 共 ${fmtSize(totalSize)}</span>
            <span>${unused.length > 0 ? `${unused.length} 个未引用` : '无冗余文件 ✓'}</span>
          </div>` + html;
      } catch {
        grid.innerHTML = `<div class="media-empty"><p>无法连接服务器。运行 <code>node admin-server.js</code> 后刷新。</p></div>`;
      }
    } else {
      // Offline: show referenced paths only, no stats
      if (!refs.size) {
        grid.innerHTML = `<div class="media-empty"><p>暂无引用媒体。在产品中填写图片路径后显示。</p></div>`;
        return;
      }
      grid.innerHTML = Array.from(refs).map(p => mediaItemHTML(p, { used: true })).join('');
    }
  }

  async function deleteMedia(filePath) {
    if (!IS_LOCAL) { showToast('删除文件需要运行本地服务器。', 'error'); return; }
    const name = filePath.replace(/^media\//, '');
    if (!confirm(`删除 ${name}？此操作无法撤销。`)) return;
    try {
      const res = await fetch(`/api/media/${encodeURIComponent(name)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast(`已删除 ${name}`, 'success');
      renderMediaGrid();
    } catch {
      showToast('删除失败。', 'error');
    }
  }

  function initMediaUpload() {
    const input    = document.getElementById('media-file-input');
    const dropzone = document.getElementById('media-dropzone');
    if (!input || !dropzone) return;

    async function uploadFiles(files) {
      if (!files.length) return;
      if (!IS_LOCAL) {
        showToast('文件上传需要运行本地服务器（node admin-server.js）。', 'error');
        return;
      }
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append('file', f, f.name));
      try {
        const res = await fetch('/api/media/upload', { method: 'POST', body: fd });
        if (!res.ok) throw new Error();
        const { saved } = await res.json();
        showToast(`✅ 已上传 ${saved.length} 个文件到 /media/`, 'success');
        renderMediaGrid();
      } catch {
        showToast('上传失败，请检查服务器是否运行。', 'error');
      }
    }

    input.addEventListener('change', () => {
      uploadFiles(input.files);
      input.value = '';
    });

    dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
    dropzone.addEventListener('drop', e => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      uploadFiles(e.dataTransfer.files);
    });
  }

  // ── Export ───────────────────────────────────
  const IS_LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  function buildDataJSContent() {
    const data = {
      company: state.company,
      categories: state.categories,
      products: state.products
    };
    const json = JSON.stringify(data, null, 2);
    return `// ═══════════════════════════════════════════════\n// data.js — Mockingjay Tech · Central Data Store\n// Auto-generated by Admin Panel — ${new Date().toISOString().slice(0,10)}\n// ═══════════════════════════════════════════════\n\nwindow.MOCKINGJAY_DATA = ${json};\n`;
  }

  // Directly write data.js on disk (only works when admin-server.js is running)
  async function saveDataJS() {
    const content = buildDataJSContent();
    try {
      const res = await fetch('/api/save-data', {
        method: 'POST',
        headers: { 'Content-Type': 'text/javascript' },
        body: content
      });
      if (!res.ok) throw new Error('Server returned ' + res.status);
      const json = await res.json();
      showToast('✅ data.js 已保存到磁盘！', 'success');
      refreshPreview();
      return true;
    } catch (e) {
      return false;
    }
  }

  // Save to disk if local server is running; otherwise trigger download
  async function downloadDataJS() {
    if (IS_LOCAL) {
      const saved = await saveDataJS();
      if (saved) return;
      // Server not responding — fall through to download
      showToast('本地服务器未响应，改为下载文件。', 'error');
    }
    const content = buildDataJSContent();
    const blob = new Blob([content], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.js';
    a.click();
    URL.revokeObjectURL(url);
    showToast('data.js 已下载，请替换 assets/js/data.js。', 'success');
  }

  function copyDataJS() {
    navigator.clipboard.writeText(buildDataJSContent())
      .then(() => showToast('已复制到剪贴板。', 'success'))
      .catch(() => showToast('复制失败，请使用下载。', 'error'));
  }

  function refreshPreview() {
    const el = document.getElementById('export-preview-code');
    if (el) {
      const full = buildDataJSContent();
      el.textContent = full.slice(0, 3000) + (full.length > 3000 ? '\n… (truncated)' : '');
    }
  }

  // Update export section label based on environment
  function updateExportUI() {
    const btn = document.querySelector('[onclick="MJ_Admin.downloadDataJS()"]');
    if (!btn) return;
    if (IS_LOCAL) {
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> 保存 data.js`;
      btn.title = '直接写入 assets/js/data.js（本地服务器模式）';
    }
  }

  function resetToDefault() {
    if (!confirm('重置所有更改，从 data.js 重新加载？此操作无法撤销。')) return;
    localStorage.removeItem(STORAGE_KEY);
    loadState();
    renderDashboard();
    showToast('已重置为 data.js 默认数据。', 'success');
  }

  // ── Toast ────────────────────────────────────
  function showToast(msg, type) {
    let toast = document.querySelector('.admin-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'admin-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className = `admin-toast ${type || ''}`;
    requestAnimationFrame(() => {
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 4000);
    });
  }

  // ── Helpers ──────────────────────────────────
  function esc(str) {
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ── Init ─────────────────────────────────────
  function init() {
    MJ_Auth.init();
    loadState();
    initNav();
    initMediaUpload();
    updateExportUI();
    renderDashboard();
    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        closeMediaPicker();
        closeProductForm();
        closeCategoryForm();
        closeDeleteConfirm();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    goSection,
    openProductForm, closeProductForm, saveProduct, addColorRow,
    openCategoryForm, closeCategoryForm, saveCategory,
    openMediaPicker, closeMediaPicker, chooseMediaPath, chooseSelectedMedia,
    openDeleteConfirm, closeDeleteConfirm, confirmDelete,
    downloadDataJS, copyDataJS, refreshPreview, resetToDefault,
    deleteMedia, showToast
  };

})();
