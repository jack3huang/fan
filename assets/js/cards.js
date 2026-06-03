// ═══════════════════════════════════════════════
// cards.js — Shared Product Card Generator
// Used by homepage, category page, and search
// ═══════════════════════════════════════════════

window.MJ_Cards = (function () {

  // Fan SVG icon (inline, no external dependency)
  const FAN_SVG = `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="20" r="18" fill="rgba(34,211,238,0.08)" stroke="rgba(34,211,238,0.25)" stroke-width="1.5"/>
    <path d="M24 20 C23 15 21 5 27 1 C31 -2 37 0 37 8 C37 16 27 19 24 20Z" fill="rgba(34,211,238,0.4)"/>
    <path d="M24 20 C29 19 39 20 42 26 C45 30 41 35 35 34 C29 33 25 26 24 20Z" fill="rgba(34,211,238,0.4)"/>
    <path d="M24 20 C20 24 9 28 5 23 C1 18 3 12 10 11 C17 10 22 16 24 20Z" fill="rgba(34,211,238,0.4)"/>
    <circle cx="24" cy="20" r="5" fill="rgba(34,211,238,0.5)"/>
    <circle cx="24" cy="20" r="2.5" fill="white" fill-opacity="0.8"/>
    <rect x="21" y="34" width="6" height="12" rx="3" fill="rgba(34,211,238,0.3)"/>
  </svg>`;

  const VIDEO_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>`;

  function isVideo(path) {
    return /\.(mp4|webm|mov|m4v)$/i.test(path || '');
  }

  function esc(str) {
    return String(str || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

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

  function imageCarousel(images, name) {
    const list = (images || []).filter(img => img && !isVideo(img)).slice(0, 3);
    if (!list.length) {
      return `<div class="product-card-img-placeholder product-card-img-empty">${FAN_SVG}<span>No image</span></div>`;
    }
    const dots = list.map((_, i) => `<span class="media-carousel-dot" style="--i:${i}"></span>`).join('');
    return `<div class="media-carousel media-carousel-${list.length}" style="--count:${list.length}">`
      + `<div class="media-carousel-stage">`
      + list.map((img, i) => `<div class="media-slide" style="--i:${i}"><img src="${esc(img)}" alt="${esc(name)}" loading="lazy" onerror="window.MJ_refreshCarousel(this)"></div>`).join('')
      + `</div><div class="media-carousel-current"></div><div class="media-carousel-sheen"></div><div class="media-carousel-dots">${dots}</div><div class="media-carousel-count">0${list.length}</div></div>`;
  }

  function colorCircles(colors, max) {
    if (!colors || !colors.length) return '';
    const shown = colors.slice(0, max || 5);
    return shown.map(c =>
      `<span class="product-card-color" style="background:${c.hex}" title="${c.label}"></span>`
    ).join('');
  }

  function stockBadge(stock) {
    const map = {
      in:   { label: 'In Stock',   cls: 'green' },
      low:  { label: 'Low Stock',  cls: 'yellow' },
      back: { label: 'Backordered',cls: 'gray' },
    };
    return map[stock] || map['in'];
  }

  /**
   * Render a product card HTML string
   * @param {Object} product - product object from data.js
   * @returns {string} HTML string
   */
  function render(product) {
    const img = product.images && product.images[0];
    const hasVideo = product.video || (img && isVideo(img));

    const sb = stockBadge(product.stock);
    const colors = product.colors || [];

    return `
    <div class="product-card fade-up" data-sku="${product.sku}" onclick="MJ_Cards.openProduct('${product.sku}')">
      <div class="product-card-img">
        ${imageCarousel(product.images, product.name)}
        ${product.homepageHero ? '<span class="product-card-badge">Hero</span>' : ''}
        ${hasVideo ? '<span class="product-card-badge" style="left:auto;right:12px;top:12px;">▶ Video</span>' : ''}
        ${colors.length ? `<div class="product-card-colors">${colorCircles(colors, 4)}</div>` : ''}
      </div>
      <div class="product-card-body">
        <div class="product-card-cat">${product.cat}</div>
        <div class="product-card-name">${product.name}</div>
        <div class="product-card-tags">
          ${(product.tags || []).map(t => `<span class="product-card-tag">${t}</span>`).join('')}
        </div>
        <div class="product-card-price"><strong>${product.price || 'Contact for Quote'}</strong>${product.trade ? ' · ' + product.trade : ''}</div>
        <div class="product-card-action">
          <button class="card-btn" onclick="event.stopPropagation();MJ_Cards.openProduct('${product.sku}')">View Details</button>
          <button class="card-inquiry" onclick="event.stopPropagation();MJ_Cards.openInquiry('${product.sku}', '${product.name}')">Inquire</button>
        </div>
      </div>
    </div>`;
  }

  /**
   * Navigate to product detail page
   */
  function openProduct(sku) {
    window.location.href = `product.html?sku=${encodeURIComponent(sku)}`;
  }

  /**
   * Navigate to contact page with product pre-filled
   */
  function openInquiry(sku, name) {
    window.location.href = `contact.html?product=${encodeURIComponent(sku)}&name=${encodeURIComponent(name)}`;
  }

  /**
   * Render multiple cards into a container
   * @param {HTMLElement|string} container - element or selector
   * @param {Array} products - array of product objects
   */
  function renderAll(container, products) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    if (!products || !products.length) {
      el.innerHTML = `<div class="no-products"><h3>No products found</h3><p>Check back soon for new arrivals.</p></div>`;
      return;
    }
    el.innerHTML = products.map(render).join('');
    // Trigger fade-up animations
    setTimeout(() => {
      el.querySelectorAll('.fade-up').forEach((card, i) => {
        setTimeout(() => card.classList.add('visible'), i * 60);
      });
    }, 50);
  }

  return { render, renderAll, openProduct, openInquiry };
})();
