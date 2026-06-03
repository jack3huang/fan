// ═══════════════════════════════════════════════
// script.js — Homepage Logic & Interactions
// ═══════════════════════════════════════════════

(function () {
  'use strict';

  const D = window.MOCKINGJAY_DATA || { categories: [], products: [], company: {} };
  const escHTML = (value) => String(value || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const isVideoPath = (path) => /\.(mp4|webm|mov|m4v)$/i.test(path || '');
  const imageCarousel = (images, label, cls) => {
    const list = (images || []).filter(img => img && !isVideoPath(img)).slice(0, 3);
    if (!list.length) return `<div class="${cls || 'media-carousel'} media-carousel-empty">No image</div>`;
    const dots = list.map((_, i) => `<span class="media-carousel-dot" style="--i:${i}"></span>`).join('');
    return `<div class="${cls || 'media-carousel'} media-carousel-${list.length}" style="--count:${list.length}">`
      + `<div class="media-carousel-stage">`
      + list.map((img, i) => `<div class="media-slide" style="--i:${i}"><img src="${escHTML(img)}" alt="${escHTML(label)}" loading="lazy" onerror="window.MJ_refreshCarousel(this)"></div>`).join('')
      + `</div><div class="media-carousel-current"></div><div class="media-carousel-sheen"></div><div class="media-carousel-dots">${dots}</div><div class="media-carousel-count">0${list.length}</div></div>`;
  };
  window.MJ_refreshCarousel = window.MJ_refreshCarousel || function (img) {
    const slide = img && img.closest('.media-slide');
    const carousel = img && img.closest('.media-carousel');
    if (!slide || !carousel) return;
    slide.remove();
    const slides = Array.from(carousel.querySelectorAll('.media-slide'));
    if (!slides.length) {
      carousel.innerHTML = '<div class="media-carousel-empty">No image</div>';
      return;
    }
    carousel.className = carousel.className.replace(/\bmedia-carousel-\d+\b/g, '').trim();
    carousel.classList.add(`media-carousel-${slides.length}`);
    carousel.style.setProperty('--count', slides.length);
    slides.forEach((item, i) => item.style.setProperty('--i', i));
    const dots = carousel.querySelector('.media-carousel-dots');
    if (dots) dots.innerHTML = slides.map((_, i) => `<span class="media-carousel-dot" style="--i:${i}"></span>`).join('');
    const count = carousel.querySelector('.media-carousel-count');
    if (count) count.textContent = `0${slides.length}`;
  };

  /* ─── Navigation ─────────────────────────── */
  function initNav() {
    const nav = document.querySelector('.site-nav');
    const hamburger = document.querySelector('.nav-hamburger');
    const mobileMenu = document.querySelector('.nav-mobile');

    if (nav) {
      window.addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', window.scrollY > 24);
      });
    }

    if (hamburger && mobileMenu) {
      hamburger.addEventListener('click', () => {
        const open = mobileMenu.classList.toggle('open');
        hamburger.setAttribute('aria-expanded', open);
      });
      // Close on link click
      mobileMenu.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => mobileMenu.classList.remove('open'));
      });
    }
  }

  /* ─── Hero Color Switcher ────────────────── */
  function initHeroColors() {
    const dots = document.querySelectorAll('[data-hero-color]');
    const fanBlades = document.querySelector('#fan-blades');
    const fanGlow   = document.querySelector('#fan-glow');
    const fanHub    = document.querySelector('#fan-hub');
    const fanHandle = document.querySelector('#fan-handle');
    const heroImg   = document.querySelector('#hero-product-img');
    const fanSvg    = document.querySelector('.fan-svg');
    const stage     = document.querySelector('#hero-product-stage');

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        dots.forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        const color = dot.dataset.heroColor;
        const image = dot.dataset.heroImage;
        if (heroImg && image) {
          heroImg.style.opacity = '0';
          heroImg.onload = () => {
            heroImg.style.opacity = '1';
            if (fanSvg) fanSvg.classList.add('is-hidden');
            if (stage) stage.classList.add('has-image');
          };
          heroImg.onerror = () => {
            heroImg.style.opacity = '0';
            if (fanSvg) fanSvg.classList.remove('is-hidden');
            if (stage) stage.classList.remove('has-image');
          };
          heroImg.src = image;
        }
        if (stage) stage.style.setProperty('--hero-accent', color);
        if (fanBlades) fanBlades.setAttribute('fill', color);
        if (fanGlow) { fanGlow.style.background = `radial-gradient(circle, ${color}22 0%, transparent 70%)`; }
        if (fanHub) fanHub.setAttribute('fill', color);
        if (fanHandle) fanHandle.setAttribute('fill', color);
        // Update wind lines
        document.querySelectorAll('.fan-wind').forEach(w => w.setAttribute('stroke', color));
      });
    });
  }

  /* ─── Featured Product Color Switcher ───── */
  function initFeaturedColors() {
    const dots = document.querySelectorAll('[data-feat-color]');
    const featImg = document.querySelector('#featured-img');

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        dots.forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        const colorId = dot.dataset.featColor;
        const colorName = dot.dataset.colorName;
        // Update color name display
        const nameEl = document.querySelector('#selected-color-name');
        if (nameEl) nameEl.textContent = colorName || '';
        // Update image if available
        const imgSrc = dot.dataset.colorImg;
        if (featImg && imgSrc) {
          featImg.src = imgSrc;
          featImg.onerror = () => featImg.style.display = 'none';
        }
        // Update gradient hue of the image wrapper
        const wrap = document.querySelector('#featured-img-wrap');
        if (wrap) {
          const hex = dot.style.background;
          wrap.style.boxShadow = `0 24px 60px ${hex}33, 0 8px 30px rgba(0,0,0,0.15)`;
        }
      });
    });
  }

  /* ─── Render Category Cards ──────────────── */
    function renderHomepageHero() {
    const product = D.products.find(p => p.homepageHero) || D.products[0];
    if (!product) return;
    const esc = (value) => String(value || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    const specs = product.detail && product.detail.specs ? product.detail.specs : {};
    const color = (product.colors && product.colors[0] && product.colors[0].hex) || '#22D3EE';
    const title = product.name || product.sku || 'Featured Product';
    const titleParts = title.split(' ');
    const top = titleParts.slice(0, 2).join(' ') || title;
    const rest = titleParts.slice(2).join(' ');
    const eyebrow = document.querySelector('.hero-eyebrow');
    if (eyebrow) eyebrow.innerHTML = `<span class="hero-eyebrow-dot"></span>${esc(product.sku)} / ${esc(product.cat || product.type || 'Featured Product')} / Factory Direct`;
    const h1 = document.querySelector('.hero-h1');
    if (h1) h1.innerHTML = `${esc(top)}${rest ? `<br><span>${esc(rest)}</span>` : ''}`;
    const sub = document.querySelector('.hero-sub');
    if (sub) sub.textContent = (product.detail && (product.detail.shortDesc || product.detail.tagline || product.detail.description)) || D.company.description || '';
    const chips = document.querySelector('.hero-chips');
    if (chips) {
      const chipSource = (product.tags && product.tags.length ? product.tags : Object.entries(specs).slice(0, 4).map(([k, v]) => `${v} ${k}`)).slice(0, 4);
      chips.innerHTML = chipSource.map(tag => `<span class="hero-chip"><span class="hero-chip-icon">+</span>${esc(tag)}</span>`).join('');
    }
    const btns = document.querySelector('.hero-btns');
    if (btns) {
      const sku = encodeURIComponent(product.sku || '');
      const name = encodeURIComponent(product.name || '');
      btns.innerHTML = `
          <a href="product.html?sku=${sku}" class="btn btn-primary btn-lg">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            View ${esc(product.sku || 'Product')}
          </a>
          <a href="contact.html?product=${sku}&name=${name}" class="btn btn-outline btn-lg">Get Wholesale Price</a>`;
    }
    const dots = document.querySelector('.color-selector');
    if (dots && product.colors && product.colors.length) {
      dots.innerHTML = product.colors.map((c, i) => {
        const image = c.image || (product.images || [])[i] || (product.images || [])[0] || '';
        return `<button class="color-dot${i === 0 ? ' active' : ''}" data-hero-color="${esc(c.hex || color)}" data-hero-image="${esc(image)}" style="background:${esc(c.hex || color)}" title="${esc(c.label || c.id || 'Color')}" aria-label="${esc(c.label || c.id || 'Color')}"></button>`;
      }).join('');
    }
    const heroImg = document.querySelector('#hero-product-img');
    const fanSvg = document.querySelector('.fan-svg');
    const stage = document.querySelector('#hero-product-stage');
    const initialImage = (product.colors && product.colors[0] && product.colors[0].image) || (product.images || []).find(img => img && !isVideoPath(img));
    if (stage) stage.style.setProperty('--hero-accent', color);
    if (heroImg && initialImage) {
      heroImg.alt = title;
      heroImg.onload = () => {
        heroImg.style.opacity = '1';
        if (fanSvg) fanSvg.classList.add('is-hidden');
        if (stage) stage.classList.add('has-image');
      };
      heroImg.onerror = () => {
        heroImg.style.opacity = '0';
        if (fanSvg) fanSvg.classList.remove('is-hidden');
        if (stage) stage.classList.remove('has-image');
      };
      heroImg.src = initialImage;
    } else {
      if (fanSvg) fanSvg.classList.remove('is-hidden');
      if (stage) stage.classList.remove('has-image');
    }
    initHeroColors();
    const setFill = (selector, value) => { const el = document.querySelector(selector); if (el) el.setAttribute('fill', value); };
    setFill('#fan-blades', color);
    setFill('#fan-hub', color);
    setFill('#fan-handle', color);
    document.querySelectorAll('.fan-wind').forEach(w => w.setAttribute('stroke', color));
    const statPairs = Object.entries(specs).slice(0, 4);
    const statsGrid = document.querySelector('.stats-grid');
    if (statsGrid && statPairs.length) {
      statsGrid.innerHTML = statPairs.map(([label, value]) => `<div class="stat-item">
        <div class="stat-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></div>
        <div class="stat-num">${esc(value)}</div>
        <div class="stat-label">${esc(label)}</div>
      </div>`).join('');
    }
  }

function renderCategories() {
    const grid = document.querySelector('#categories-grid');
    if (!grid || !D.categories.length) return;

    const categoryImages = (cat) => D.products
      .filter(p => p.type === cat.type || p.cat === cat.name)
      .slice(0, 3)
      .map(p => (p.images || []).find(img => img && !isVideoPath(img)))
      .filter(Boolean);

    grid.innerHTML = D.categories.map(cat => `
      <a class="cat-card" href="category.html?type=${encodeURIComponent(cat.type)}&name=${encodeURIComponent(cat.name)}"
         style="--cat-color:${cat.color};--cat-bg:${cat.color}18">
        <div class="cat-media">${imageCarousel(categoryImages(cat), cat.name, 'media-carousel cat-carousel')}</div>
        <div class="cat-icon">${cat.icon || '📦'}</div>
        <div class="cat-name">${cat.name}</div>
        <div class="cat-count">${cat.count}</div>
        <div class="cat-desc">${cat.description}</div>
        <div class="cat-arrow">Browse Products <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></div>
      </a>`
    ).join('');
  }

  /* ─── Render Featured Products ───────────── */
  function renderFeaturedProducts() {
    const grid = document.querySelector('#featured-products-grid');
    if (!grid) return;
    const tabs = document.querySelector('#featured-products-tabs');
    const count = document.querySelector('#featured-products-count');
    const featuredCategories = D.categories.filter(c => c.featured);
    const featuredTypes = new Set(featuredCategories.map(c => c.type));
    const featured = D.products.filter(p => featuredTypes.has(p.type));
    let active = 'All';
    const esc = (value) => String(value || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    const stockMap = { in: ['in', 'In stock'], low: ['low', 'Low stock'], back: ['back', 'Backorder'] };
    const fanSvg = (product) => {
      const color = (product.colors && product.colors[0] && product.colors[0].hex) || '#22D3EE';
      return `<svg class="featured-product-fallback" viewBox="0 0 240 240" role="img" aria-label="${esc(product.name)}">
        <circle cx="120" cy="104" r="78" fill="${color}14" stroke="${color}" stroke-opacity="0.32" stroke-width="2"/>
        <g class="spinprop" fill="${color}" fill-opacity="0.58"><path d="M120 98 C146 78 184 76 194 94 C202 108 184 123 120 115 Z"/><path d="M128 110 C157 124 174 158 158 171 C145 181 126 160 117 108 Z"/><path d="M112 110 C86 129 48 127 44 108 C40 91 68 88 121 98 Z"/></g>
        <circle cx="120" cy="104" r="20" fill="${color}" fill-opacity="0.78"/><circle cx="120" cy="104" r="7" fill="#fff"/><rect x="109" y="172" width="22" height="48" rx="11" fill="${color}" fill-opacity="0.34"/>
      </svg>`;
    };
    const productImage = (product) => {
      const list = (product.images || []).filter(img => img && !/\.(mp4|webm|mov|m4v)$/i.test(img)).slice(0, 3);
      if (!list.length) return fanSvg(product);
      const dots = list.map((_, i) => `<span class="media-carousel-dot" style="--i:${i}"></span>`).join('');
      return `<div class="media-carousel featured-product-carousel media-carousel-${list.length}" style="--count:${list.length}"><div class="media-carousel-stage">`
        + list.map((img, i) => `<div class="media-slide" style="--i:${i}"><img src="${esc(img)}" alt="${esc(product.name)}" loading="lazy" onerror="window.MJ_refreshCarousel(this)"></div>`).join('')
        + `</div><div class="media-carousel-current"></div><div class="media-carousel-sheen"></div><div class="media-carousel-dots">${dots}</div><div class="media-carousel-count">0${list.length}</div></div>`;
    };
    const card = (product) => {
      const stock = stockMap[product.stock] || stockMap.in;
      const tags = (product.tags || []).slice(0, 4).map(t => `<span>${esc(t)}</span>`).join('');
      const inquiryHref = `contact.html?product=${encodeURIComponent(product.sku)}&name=${encodeURIComponent(product.name)}`;
      return `<article class="featured-product-card" data-sku="${esc(product.sku)}" tabindex="0" role="link" aria-label="View ${esc(product.name)}"><div class="featured-product-media"><div class="featured-product-stock"><span class="featured-product-stock-dot ${stock[0]}"></span>${stock[1]}</div>${productImage(product)}<span class="featured-product-view">View details</span></div><div class="featured-product-body"><div class="featured-product-sku">${esc(product.sku)}</div><div class="featured-product-name">${esc(product.name)}</div><div class="featured-product-tags">${tags}</div></div><div class="featured-product-foot"><div class="featured-product-price"><b>${esc(product.price || 'Contact for Quote')}</b><small>${esc(product.trade || 'Factory direct')} &middot; trade</small></div><a class="featured-product-inquiry" href="${inquiryHref}" aria-label="Inquire about ${esc(product.name)}" title="Add to inquiry" onclick="event.stopPropagation()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></a></div></article>`;
    };
    function currentList() { return active === 'All' ? featured : featured.filter(p => p.type === active); }
    function renderTabs() {
      if (!tabs) return;
      const names = [{ type: 'All', name: 'All' }].concat(featuredCategories.map(c => ({ type: c.type, name: c.name })));
      tabs.innerHTML = names.map(item => `<button class="featured-products-tab${item.type === active ? ' active' : ''}" type="button" data-featured-tab="${esc(item.type)}">${esc(item.name)}</button>`).join('');
      tabs.querySelectorAll('[data-featured-tab]').forEach(btn => { btn.addEventListener('click', () => { active = btn.dataset.featuredTab; renderTabs(); renderList(); }); });
    }
    function renderList() {
      const list = currentList();
      if (count) count.textContent = `${String(list.length).padStart(2, '0')} items`;
      if (!featuredCategories.length) { grid.innerHTML = '<div class="featured-products-empty">No featured categories selected yet.</div>'; return; }
      if (!list.length) { grid.innerHTML = '<div class="featured-products-empty">No products in this featured category yet.</div>'; return; }
      grid.innerHTML = list.map(card).join('');
      grid.querySelectorAll('.featured-product-card').forEach(el => {
        const open = () => { window.location.href = `product.html?sku=${encodeURIComponent(el.dataset.sku)}`; };
        el.addEventListener('click', open);
        el.addEventListener('keydown', e => { if (e.key === 'Enter') open(); });
      });
    }
    renderTabs();
    renderList();
  }

  /* ─── Inquiry Form ───────────────────────── */
  function initInquiryForm() {
    const form = document.querySelector('#inquiry-form');
    if (!form) return;

    // Pre-populate product dropdown
    const productSelect = form.querySelector('[name="product"]');
    if (productSelect) {
      D.products.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.sku;
        opt.textContent = `${p.name} (${p.sku})`;
        productSelect.appendChild(opt);
      });
      // Pre-select from URL param
      const params = new URLSearchParams(window.location.search);
      const pre = params.get('product');
      if (pre) {
        productSelect.value = pre;
      }
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('.form-submit');
      const successEl = form.querySelector('.form-success');
      const errorEl = form.querySelector('.form-error-msg');

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Sending…</span>';

      try {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        // Append metadata
        data._subject = `Inquiry: ${data.product || 'General'} — ${data.company || data.name}`;
        data._replyto = data.email;

        const res = await fetch(form.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(data)
        });

        if (res.ok) {
          form.reset();
          if (successEl) { successEl.style.display = 'block'; }
          showToast('Inquiry sent! We\'ll reply within 24 hours.', 'success');
        } else {
          throw new Error('Server error');
        }
      } catch (err) {
        if (errorEl) { errorEl.style.display = 'block'; }
        showToast('Failed to send. Please email us directly.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Send Inquiry</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
      }
    });
  }

  /* ─── Scroll Animations ──────────────────── */
  function initScrollAnimations() {
    const els = document.querySelectorAll('.fade-up');
    if (!els.length) return;

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.1 });
      els.forEach(el => io.observe(el));
    } else {
      els.forEach(el => el.classList.add('visible'));
    }
  }

  /* ─── Toast ──────────────────────────────── */
  function showToast(msg, type) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className = `toast ${type || ''}`;
    requestAnimationFrame(() => {
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 4000);
    });
  }

  /* ─── Smooth Anchor Scroll ───────────────── */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const target = document.querySelector(a.getAttribute('href'));
        if (target) {
          e.preventDefault();
          const offset = 80;
          window.scrollTo({
            top: target.getBoundingClientRect().top + window.scrollY - offset,
            behavior: 'smooth'
          });
        }
      });
    });
  }

  /* ─── Theme Switcher ─────────────────────────── */
  function initThemeSwitcher() {
    const dots = document.querySelectorAll('.theme-dot');
    if (!dots.length) return;

    const saved = localStorage.getItem('mj_theme') || 'ice';
    applyTheme(saved);

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        applyTheme(dot.dataset.theme);
        localStorage.setItem('mj_theme', dot.dataset.theme);
      });
    });

    function applyTheme(theme) {
      document.documentElement.dataset.theme = theme;
      dots.forEach(d => d.classList.toggle('active', d.dataset.theme === theme));
    }
  }

  /* ─── Init ───────────────────────────────── */
  function init() {
    initNav();
    initThemeSwitcher();
    renderHomepageHero();
    initHeroColors();
    initFeaturedColors();
    renderCategories();
    renderFeaturedProducts();
    initInquiryForm();
    initScrollAnimations();
    initSmoothScroll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose globally
  window.MJ_Script = { showToast };
})();
