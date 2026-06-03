// ═══════════════════════════════════════════════
// product.js — Product Detail Page Logic
// URL: product.html?sku=JF168
// ═══════════════════════════════════════════════

(function () {
  'use strict';

  const D = window.MOCKINGJAY_DATA || { categories: [], products: [], company: {} };

  const FAN_SVG = `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="40" cy="34" r="28" fill="rgba(34,211,238,0.06)" stroke="rgba(34,211,238,0.2)" stroke-width="1.5"/>
    <path d="M40 34 C39 28 37 14 43 8 C47 3 55 6 55 16 C55 26 43 32 40 34Z" fill="rgba(34,211,238,0.35)"/>
    <path d="M40 34 C46 33 58 34 62 41 C65 47 61 53 54 52 C47 51 41 42 40 34Z" fill="rgba(34,211,238,0.35)"/>
    <path d="M40 34 C35 39 22 44 16 38 C10 31 13 22 20 21 C27 20 36 27 40 34Z" fill="rgba(34,211,238,0.35)"/>
    <circle cx="40" cy="34" r="8" fill="rgba(34,211,238,0.4)"/>
    <circle cx="40" cy="34" r="4" fill="white" fill-opacity="0.6"/>
    <rect x="37" y="56" width="6" height="18" rx="3" fill="rgba(34,211,238,0.25)"/>
  </svg>`;

  function isVideo(p) {
    return /\.(mp4|webm|mov|m4v)$/i.test(p || '');
  }

  function getProduct(sku) {
    return D.products.find(p => p.sku === sku) || null;
  }

  function mediaPlaceholder(text) {
    return `<div class="media-placeholder">${FAN_SVG}<span>${text || 'No image available'}</span></div>`;
  }

  /* ─── Gallery ─────────────────────────────── */
  function initGallery(product) {
    const mainEl   = document.querySelector('#product-main-media');
    const thumbsEl = document.querySelector('#product-thumbs');
    if (!mainEl) return;

    const allMedia = [];
    if (product.video) allMedia.push({ type: 'video', src: product.video });
    (product.images || []).forEach(img => allMedia.push({ type: 'image', src: img }));

    if (!allMedia.length) { mainEl.innerHTML = mediaPlaceholder(); return; }

    let active = 0;
    const failed = new Set();

    function showMedia(idx) {
      active = idx;
      const m = allMedia[idx];
      if (m.type === 'video') {
        mainEl.innerHTML = `<div class="gallery-video-wrap"><video src="${m.src}" controls autoplay muted loop></video></div>`;
      } else {
        const img = new Image();
        img.alt = product.name || '';
        img.onload = () => {
          mainEl.innerHTML = '';
          mainEl.appendChild(img);
        };
        img.onerror = () => {
          failed.add(m.src);
          const next = allMedia.findIndex((item, i) => i !== idx && item.type === 'image' && !failed.has(item.src));
          if (next >= 0) showMedia(next);
          else mainEl.innerHTML = mediaPlaceholder();
        };
        img.src = m.src;
      }
      thumbsEl?.querySelectorAll('.product-thumb').forEach((t, i) => {
        const item = allMedia[i];
        t.classList.toggle('active', i === idx);
        t.classList.toggle('is-missing', item && failed.has(item.src));
      });
    }

    if (thumbsEl && allMedia.length > 1) {
      thumbsEl.innerHTML = allMedia.map((m, i) => {
        if (m.type === 'video') {
          return `<div class="product-thumb ${i === 0 ? 'active' : ''}" data-idx="${i}" title="Video Demo">▶</div>`;
        }
        return `<div class="product-thumb ${i === 0 ? 'active' : ''}" data-idx="${i}">
          <img src="${m.src}" alt="" loading="lazy" onerror="this.closest('.product-thumb').classList.add('is-missing')">
        </div>`;
      }).join('');

      thumbsEl.querySelectorAll('.product-thumb').forEach(t => {
        t.addEventListener('click', () => showMedia(parseInt(t.dataset.idx, 10)));
      });
    }

    showMedia(0);
  }

  /* ─── Color Switcher ──────────────────────── */
  function initColorSwitcher(product) {
    if (!product.colors || !product.colors.length) return;

    const section  = document.querySelector('#product-color-section');
    const dotsEl   = document.querySelector('#product-color-dots');
    const nameEl   = document.querySelector('#selected-color-name');
    const mainEl   = document.querySelector('#product-main-media');
    if (!dotsEl) return;

    if (section) section.style.display = 'block';

    dotsEl.innerHTML = product.colors.map((c, i) => `
      <div class="product-color-dot ${i === 0 ? 'active' : ''}"
           style="background:${c.hex}"
           data-color-id="${c.id}"
           data-color-name="${c.label}"
           data-color-img="${c.image || ''}"
           title="${c.label}"></div>
    `).join('');

    if (nameEl && product.colors[0]) nameEl.textContent = product.colors[0].label;

    dotsEl.querySelectorAll('.product-color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        dotsEl.querySelectorAll('.product-color-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        if (nameEl) nameEl.textContent = dot.dataset.colorName || '';
        const img = dot.dataset.colorImg;
        if (img && mainEl) {
          const colorImg = new Image();
          colorImg.alt = product.name || '';
          colorImg.onload = () => {
            mainEl.innerHTML = '';
            mainEl.appendChild(colorImg);
          };
          colorImg.onerror = () => {
            const fallback = (product.images || []).find(src => src && src !== img && !isVideo(src));
            if (fallback) {
              colorImg.src = fallback;
              return;
            }
            mainEl.innerHTML = mediaPlaceholder();
          };
          colorImg.src = img;
          // sync thumbs active
          document.querySelectorAll('.product-thumb').forEach(t => {
            const tImg = t.querySelector('img');
            t.classList.toggle('active', tImg && tImg.src.includes(img));
          });
        }
      });
    });
  }

  /* ─── Tabs ────────────────────────────────── */
  function initTabs() {
    const btns   = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.tab-panel');

    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
        panels.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        const target = document.querySelector(`#tab-${btn.dataset.tab}`);
        if (target) target.classList.add('active');
      });
    });
  }

  /* ─── Render Full Product ─────────────────── */
  function renderProduct(product) {
    const det = product.detail || {};
    const stockMap = {
      in:   { label: 'In Stock',    cls: 'green' },
      low:  { label: 'Low Stock',   cls: 'yellow' },
      back: { label: 'Backordered', cls: 'gray' },
    };
    const sb = stockMap[product.stock] || stockMap.in;

    // Basic info
    set('#product-cat',   product.cat || '');
    set('#product-name',  product.name);
    set('#product-sku',   product.sku);
    set('#product-price', product.price || 'Contact for Quote');
    set('#product-trade', product.trade || '');

    // Stock badge
    const stockEl = document.querySelector('#product-stock');
    if (stockEl) {
      stockEl.textContent = sb.label;
      stockEl.className = `product-stock ${sb.cls}`;
    }

    // Tags
    const tagsEl = document.querySelector('#product-tags-row');
    if (tagsEl) {
      tagsEl.innerHTML = (product.tags || []).map(t =>
        `<span class="product-tag">${t}</span>`
      ).join('');
    }

    // Inquiry buttons
    const inquiryHref = `contact.html?product=${encodeURIComponent(product.sku)}&name=${encodeURIComponent(product.name)}`;
    const btnInquiry = document.querySelector('#btn-inquiry');
    if (btnInquiry) btnInquiry.href = inquiryHref;
    const btnStrip = document.querySelector('#btn-inquiry-strip');
    if (btnStrip) btnStrip.href = inquiryHref;
    set('#inquiry-product-name', product.name);

    // ── Tab: Specs ──
    const specsEl = document.querySelector('#specs-table');
    if (specsEl) {
      const specs = det.specs || {};
      const entries = Object.entries(specs);
      if (entries.length) {
        specsEl.innerHTML = entries.map(([k, v]) => `
          <div class="spec-row">
            <div class="spec-key">${k}</div>
            <div class="spec-val">${v}</div>
          </div>`).join('');
      } else {
        specsEl.innerHTML = `<div class="specs-empty">Detailed specifications available on request. Contact us for a spec sheet.</div>`;
      }
    }

    // ── Tab: Features ──
    const featEl = document.querySelector('#features-list');
    if (featEl) {
      const features = det.features || det.keyFeatures || [];
      if (features.length) {
        featEl.innerHTML = features.map(f => `
          <div class="feature-item">
            <div class="feature-check">✓</div>
            <div class="feature-text">${f}</div>
          </div>`).join('');
      } else {
        featEl.innerHTML = `<p style="color:rgba(255,255,255,0.45)">Feature details available on request.</p>`;
      }
    }

    // ── Tab: Applications ──
    const appEl = document.querySelector('#applications-grid');
    if (appEl) {
      const apps = det.applications || [];
      const icons = {
        'Outdoor Commute':'🌤️', 'Office Desk':'💼', 'Travel':'✈️',
        'Camping':'⛺', 'Bedroom':'🌙', 'Wholesale Gifts':'🎁',
        'E-commerce':'🛒', 'Sports':'🏃', 'Picnic':'🧺',
        'Construction Site':'🏗️', 'Healthcare':'🏥', 'Events':'🎪'
      };
      if (apps.length) {
        appEl.innerHTML = apps.map(a => {
          const icon = Object.entries(icons).find(([k]) => a.toLowerCase().includes(k.toLowerCase()))?.[1] || '✨';
          return `<div class="application-item"><div class="application-icon">${icon}</div><span>${a}</span></div>`;
        }).join('');
      } else {
        appEl.innerHTML = `<p style="color:rgba(255,255,255,0.45)">Applications info available on request.</p>`;
      }
    }

    // ── Tab: Customization ──
    const customEl = document.querySelector('#customization-list');
    if (customEl) {
      const opts = det.customization || det.customizationOptions || [];
      if (opts.length) {
        customEl.innerHTML = opts.map(o => `<div class="custom-item">${o}</div>`).join('');
      } else {
        customEl.innerHTML = `
          <div class="custom-item">Custom color (Pantone matching)</div>
          <div class="custom-item">Private label packaging</div>
          <div class="custom-item">Logo printing on product body</div>
          <div class="custom-item">OEM firmware speed customization</div>
          <div class="custom-item">Custom retail box design</div>`;
      }
    }

    // ── Tab: Package ──
    const pkgEl = document.querySelector('#package-info');
    if (pkgEl) {
      const pkg = det.package || det.packaging || '';
      const moq  = det.moq || '500 pcs';
      const lead = det.leadtime || det.lead || '15–20 business days';
      const lines = pkg ? pkg.split('\n').filter(Boolean) : [];
      pkgEl.innerHTML = `
        ${lines.map(line => `<div class="package-item">${line}</div>`).join('')}
        ${moq  ? `<div class="package-item">MOQ: ${moq}</div>` : ''}
        ${lead ? `<div class="package-item">Lead Time: ${lead}</div>` : ''}
        <div class="package-item">FOB Shenzhen · Sea / Air freight available</div>
        <div class="package-item">Certificate: CE · Battery: UN 38.3</div>`;
    }
  }

  /* ─── Related Products ────────────────────── */
  function renderRelated(product) {
    const grid = document.querySelector('#related-grid');
    if (!grid) return;
    const det = product.detail || {};
    const relatedSkus = det.related || [];
    const related = D.products.filter(p =>
      p.sku !== product.sku && (relatedSkus.includes(p.sku) || p.type === product.type)
    ).slice(0, 3);
    if (related.length && window.MJ_Cards) {
      window.MJ_Cards.renderAll(grid, related);
    } else {
      grid.closest('.related-section')?.style.setProperty('display', 'none');
    }
  }

  /* ─── SEO ─────────────────────────────────── */
  function updateSEO(product) {
    const det = product.detail || {};
    document.title = `${product.name} (${product.sku}) | Mockingjay Tech`;
    setMeta('description', det.description
      ? det.description.slice(0, 160)
      : `${product.name} — factory direct portable fan, CE certified, OEM/ODM available. Contact Mockingjay Tech for wholesale pricing.`);
    setMeta('og:title', document.title);

    const schema = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      sku: product.sku,
      description: (det.description || '').slice(0, 300),
      brand: { "@type": "Brand", name: "Mockingjay Tech" },
      manufacturer: { "@type": "Organization", name: "Mockingjay Tech Shenzhen Co., Ltd." },
      offers: {
        "@type": "Offer",
        availability: product.stock === 'in' ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        priceCurrency: "USD",
        seller: { "@type": "Organization", name: "Mockingjay Tech" }
      }
    };
    if (product.images && product.images[0]) {
      schema.image = product.images[0];
      setMeta('og:image', product.images[0]);
    }

    let el = document.querySelector('#product-schema');
    if (!el) {
      el = document.createElement('script');
      el.id = 'product-schema';
      el.type = 'application/ld+json';
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(schema, null, 2);
  }

  /* ─── 404 ─────────────────────────────────── */
  function showNotFound(sku) {
    const target = document.querySelector('#product-detail-grid') || document.querySelector('main');
    if (target) {
      target.innerHTML = `
        <div style="text-align:center;padding:100px 20px;grid-column:1/-1">
          <div style="font-size:48px;margin-bottom:20px">😕</div>
          <h2 style="font-family:var(--font-d);font-size:1.75rem;color:white;margin-bottom:12px">Product Not Found</h2>
          <p style="color:rgba(255,255,255,0.5);margin-bottom:28px">SKU "${sku}" doesn't exist in our catalog.</p>
          <a href="category.html" style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#22D3EE,#3B82F6);color:#060D1A;padding:12px 24px;border-radius:8px;font-weight:700;text-decoration:none">Browse All Products</a>
        </div>`;
    }
    document.title = 'Product Not Found | Mockingjay Tech';
  }

  /* ─── Helpers ─────────────────────────────── */
  function set(sel, val) {
    const el = document.querySelector(sel);
    if (el && val !== undefined) el.textContent = val;
  }
  function setMeta(name, content) {
    let el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(name.includes(':') ? 'property' : 'name', name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  /* ─── Init ────────────────────────────────── */
  function init() {
    const params  = new URLSearchParams(window.location.search);
    const sku     = params.get('sku');
    if (!sku) { showNotFound('—'); return; }
    const product = getProduct(sku);
    if (!product) { showNotFound(sku); return; }

    // Breadcrumb
    const bCat = document.querySelector('#breadcrumb-cat');
    if (bCat) {
      bCat.textContent = product.cat || 'Products';
      bCat.href = `category.html?type=${product.type}&name=${encodeURIComponent(product.cat || 'Products')}`;
    }
    set('#breadcrumb-product', product.name);

    renderProduct(product);
    initGallery(product);
    initColorSwitcher(product);
    initTabs();
    renderRelated(product);
    updateSEO(product);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
