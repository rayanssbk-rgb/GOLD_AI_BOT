/* FRIMAS theme — vanilla JS, no dependencies.
   Cart drawer (Shopify AJAX Cart API), variant picker, gallery, predictive search,
   collection filters, scroll reveal, header behaviour. */
(() => {
  const T = window.theme || { routes: {}, strings: {} };
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const root = (T.routes.root || '/').replace(/\/?$/, '/');

  /* ------------------------------------------------------------ money */
  function formatMoney(cents, format = T.moneyFormat || '{{amount_with_comma_separator}} €') {
    const n = (Number(cents) || 0) / 100;
    const fmt = (dec, thousands, decimal) => {
      const [i, d] = n.toFixed(dec).split('.');
      return i.replace(/\B(?=(\d{3})+(?!\d))/g, thousands) + (d ? decimal + d : '');
    };
    return format.replace(/\{\{\s*(\w+)\s*\}\}/, (_, key) => {
      switch (key) {
        case 'amount': return fmt(2, ',', '.');
        case 'amount_no_decimals': return fmt(0, ',', '.');
        case 'amount_with_comma_separator': return fmt(2, '.', ',');
        case 'amount_no_decimals_with_comma_separator': return fmt(0, '.', ',');
        case 'amount_with_space_separator': return fmt(2, ' ', ',');
        case 'amount_with_apostrophe_separator': return fmt(2, "'", '.');
        default: return fmt(2, ',', '.');
      }
    });
  }
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const imgSize = (url, w) => (url ? url.replace(/(\.[a-z]+)(\?|$)/i, `_${w}x$1$2`) : '');

  /* ------------------------------------------------------------ overlays (menu, cart, search, filters) */
  let lastFocus = null;
  function open(el) {
    if (!el) return;
    lastFocus = document.activeElement;
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    const f = el.querySelector('input:not([type=hidden]), button, a[href]');
    if (f) setTimeout(() => f.focus({ preventScroll: true }), 60);
  }
  function close(el) {
    if (!el) return;
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
    if (!$('.is-open[aria-hidden="false"]')) document.body.classList.remove('no-scroll');
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $$('.is-open[aria-hidden="false"]').forEach(close);
  });

  // mobile menu
  const nav = $('[data-nav]');
  $$('[data-nav-open]').forEach((b) => b.addEventListener('click', () => { open(nav); b.setAttribute('aria-expanded', 'true'); }));
  $$('[data-nav-close]').forEach((b) => b.addEventListener('click', () => { close(nav); $$('[data-nav-open]').forEach((x) => x.setAttribute('aria-expanded', 'false')); }));

  // header: solid once the page scrolls (over the hero)
  const header = $('[data-header]');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // announcement bar rotation
  const msgs = $$('.announce__msg');
  if (msgs.length > 1) {
    let i = 0;
    setInterval(() => {
      msgs[i].classList.remove('is-active');
      i = (i + 1) % msgs.length;
      msgs[i].classList.add('is-active');
    }, 4500);
  }

  /* ------------------------------------------------------------ toast */
  let toastEl;
  function toast(text) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = text;
    toastEl.classList.add('is-visible');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove('is-visible'), 2200);
  }

  /* ------------------------------------------------------------ cart (AJAX API) */
  const drawer = $('[data-cart-drawer]');
  const api = {
    get: () => fetch(`${root}cart.js`, { headers: { Accept: 'application/json' } }).then((r) => r.json()),
    add: (items) =>
      fetch(`${root}cart/add.js`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ items }) }).then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.description || data.message || T.strings.error);
        return data;
      }),
    change: (key, quantity) =>
      fetch(`${root}cart/change.js`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ id: key, quantity }) }).then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.description || data.message || T.strings.error);
        return data;
      }),
  };

  function renderCart(cart) {
    $$('[data-cart-count]').forEach((el) => {
      el.textContent = cart.item_count;
      el.classList.toggle('is-empty', cart.item_count === 0);
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
    });
    $$('[data-cart-count-label]').forEach((el) => (el.textContent = `(${cart.item_count})`));
    $$('[data-cart-total]').forEach((el) => (el.textContent = formatMoney(cart.total_price)));
    $$('[data-cart-checkout]').forEach((el) => (el.disabled = cart.item_count === 0));

    const ship = $('[data-cart-shipping]');
    const threshold = Number(T.freeShippingThreshold) || 0;
    if (ship) {
      if (threshold > 0 && cart.item_count > 0) {
        const left = threshold - cart.total_price;
        ship.hidden = false;
        ship.innerHTML = left > 0
          ? `Plus que <strong>${formatMoney(left)}</strong> pour la livraison offerte<progress max="${threshold}" value="${cart.total_price}"></progress>`
          : `La livraison est offerte pour cette commande.<progress max="1" value="1"></progress>`;
      } else ship.hidden = true;
    }

    const body = $('[data-cart-items]');
    if (!body) return;
    if (!cart.items.length) {
      body.innerHTML = `<div class="drawer__empty"><p>${esc(T.strings.empty)}</p><a class="btn btn--dark" href="${root}collections/all">Découvrir la collection</a></div>`;
      return;
    }
    body.innerHTML = cart.items
      .map((it) => {
        const variant = it.product_has_only_default_variant ? '' : `<p class="line__variant">${esc(it.variant_title || '')}</p>`;
        const compare = it.original_line_price > it.final_line_price ? `<s>${formatMoney(it.original_line_price)}</s>` : '';
        const img = it.image ? `<img src="${esc(imgSize(it.image, 240))}" alt="${esc(it.product_title)}" loading="lazy" width="84" height="105">` : '';
        return `<div class="line" data-line="${esc(it.key)}">
          <a class="line__img" href="${esc(it.url)}">${img}</a>
          <div>
            <a class="line__title" href="${esc(it.url)}">${esc(it.product_title)}</a>${variant}
            <div style="display:flex;align-items:center">
              <div class="qty">
                <button type="button" data-line-qty="${it.quantity - 1}" aria-label="Diminuer">−</button>
                <input type="number" min="0" value="${it.quantity}" aria-label="Quantité" data-line-input>
                <button type="button" data-line-qty="${it.quantity + 1}" aria-label="Augmenter">+</button>
              </div>
              <button type="button" class="line__remove" data-line-qty="0">Retirer</button>
            </div>
          </div>
          <p class="line__price">${formatMoney(it.final_line_price)}${compare}</p>
        </div>`;
      })
      .join('');
  }

  async function refreshCart() {
    try { renderCart(await api.get()); } catch (e) { /* offline or preview */ }
  }
  function openCart() {
    if (!drawer) return (window.location.href = `${root}cart`);
    refreshCart();
    open(drawer);
  }
  $$('[data-cart-open]').forEach((a) => a.addEventListener('click', (e) => { if (drawer && T.cartPage !== true) { e.preventDefault(); openCart(); } }));
  $$('[data-cart-close]').forEach((b) => b.addEventListener('click', () => close(drawer)));

  async function changeLine(lineEl, qty) {
    lineEl.classList.add('is-loading');
    try { renderCart(await api.change(lineEl.dataset.line, Math.max(0, qty))); }
    catch (e) { toast(e.message); lineEl.classList.remove('is-loading'); }
  }
  if (drawer) {
    drawer.addEventListener('click', (e) => {
      const b = e.target.closest('[data-line-qty]');
      if (b) changeLine(b.closest('[data-line]'), Number(b.dataset.lineQty));
    });
    drawer.addEventListener('change', (e) => {
      if (e.target.matches('[data-line-input]')) changeLine(e.target.closest('[data-line]'), Number(e.target.value));
    });
  }

  async function addToCart(items, button) {
    if (button) { button.disabled = true; button.setAttribute('aria-busy', 'true'); }
    try {
      await api.add(items);
      await refreshCart();
      open(drawer);
    } catch (e) {
      toast(e.message || T.strings.error);
      throw e;
    } finally {
      if (button) { button.disabled = false; button.removeAttribute('aria-busy'); }
    }
  }

  // quick add from product cards (single-variant products only)
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-quick-add]');
    if (!b) return;
    e.preventDefault();
    addToCart([{ id: Number(b.dataset.quickAdd), quantity: 1 }], b).catch(() => {});
  });

  /* ------------------------------------------------------------ product page */
  const productEl = $('[data-product]');
  if (productEl) {
    const jsonEl = $('[data-product-json]', productEl);
    const product = jsonEl ? JSON.parse(jsonEl.textContent) : null;
    const form = $('[data-product-form]', productEl);
    const idInput = $('[data-variant-input]', productEl);
    const addBtn = $('[data-add-button]', productEl);
    const addLabel = $('[data-add-label]', productEl);
    const stockEl = $('[data-stock]', productEl);
    const errEl = $('[data-product-error]', productEl);
    const qtyInput = $('[data-qty-input]', productEl);
    const track = $('[data-gallery-track]', productEl);
    const slides = $$('.product__slide', productEl);
    const thumbs = $$('[data-thumb]', productEl);
    const dots = $$('.product__dots span', productEl);
    const sticky = $('[data-sticky-buy]');

    // gallery: thumbnails + swipe dots
    function goTo(mediaId, smooth = true) {
      const i = slides.findIndex((s) => s.dataset.mediaId === String(mediaId));
      if (i < 0 || !track) return;
      track.scrollTo({ left: slides[i].offsetLeft - track.offsetLeft, behavior: smooth ? 'smooth' : 'auto' });
      setActive(i);
    }
    function setActive(i) {
      thumbs.forEach((t, k) => t.classList.toggle('is-active', k === i));
      dots.forEach((d, k) => d.classList.toggle('is-active', k === i));
    }
    thumbs.forEach((t) => t.addEventListener('click', () => goTo(t.dataset.thumb)));
    if (track && slides.length > 1) {
      track.addEventListener('scroll', () => {
        const i = Math.round(track.scrollLeft / track.clientWidth);
        setActive(Math.max(0, Math.min(slides.length - 1, i)));
      }, { passive: true });
    }

    // quantity
    $('[data-qty-minus]', productEl)?.addEventListener('click', () => (qtyInput.value = Math.max(1, Number(qtyInput.value) - 1)));
    $('[data-qty-plus]', productEl)?.addEventListener('click', () => (qtyInput.value = Number(qtyInput.value) + 1));

    // variants
    const lowStock = 5;
    function selectedOptions() {
      return $$('fieldset.option', productEl).map((fs) => $('input:checked', fs)?.value);
    }
    function findVariant(opts) {
      return product?.variants.find((v) => v.options.every((o, i) => o === opts[i]));
    }
    function markUnavailable() {
      if (!product) return;
      const opts = selectedOptions();
      $$('fieldset.option', productEl).forEach((fs, idx) => {
        $$('label.option__value', fs).forEach((label) => {
          const val = $('input', label).value;
          const test = opts.slice();
          test[idx] = val;
          const v = findVariant(test);
          label.classList.toggle('is-unavailable', !v || !v.available);
        });
      });
    }
    function updateVariant() {
      const opts = selectedOptions();
      $$('fieldset.option', productEl).forEach((fs, i) => { const s = $('[data-option-selected]', fs); if (s) s.textContent = opts[i] || ''; });
      const v = findVariant(opts);
      markUnavailable();
      if (!v) {
        addBtn.disabled = true;
        addLabel.textContent = T.strings.unavailable;
        return;
      }
      idInput.value = v.id;
      addBtn.disabled = !v.available;
      addLabel.textContent = v.available ? T.strings.addToCart : T.strings.soldOut;
      const priceHtml = `<span class="price__current">${formatMoney(v.price)}</span>` + (v.compare_at_price > v.price ? `<s class="price__compare"><span class="visually-hidden">Prix normal</span>${formatMoney(v.compare_at_price)}</s>` : '');
      $$('[data-price]').forEach((p) => { p.innerHTML = priceHtml; p.classList.toggle('price--sale', v.compare_at_price > v.price); });
      if (stockEl) {
        const tracked = v.inventory_management === 'shopify' && typeof v.inventory_quantity === 'number';
        stockEl.textContent = !v.available ? T.strings.soldOut : tracked && v.inventory_quantity > 0 && v.inventory_quantity <= lowStock ? `Plus que ${v.inventory_quantity} en stock` : '';
      }
      if (v.featured_media) goTo(v.featured_media.id);
      const sb = $('[data-sticky-add]'); if (sb) sb.disabled = !v.available;
      const url = new URL(window.location.href);
      url.searchParams.set('variant', v.id);
      window.history.replaceState({}, '', url.toString());
    }
    $$('[data-option-input]', productEl).forEach((i) => i.addEventListener('change', updateVariant));
    markUnavailable();

    // add to cart
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      errEl.hidden = true;
      addToCart([{ id: Number(idInput.value), quantity: Math.max(1, Number(qtyInput?.value) || 1) }], addBtn).catch((err) => {
        errEl.textContent = err.message;
        errEl.hidden = false;
      });
    });

    // sticky add-to-cart bar (mobile), shown when the main button is off screen
    if (sticky && addBtn && 'IntersectionObserver' in window) {
      sticky.hidden = false;
      new IntersectionObserver(([en]) => sticky.classList.toggle('is-visible', !en.isIntersecting && en.boundingClientRect.top < 0)).observe(addBtn);
      $('[data-sticky-add]', sticky)?.addEventListener('click', () => form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true })));
    }
  }

  // related products (Shopify product recommendations, section rendering)
  const related = $('[data-related]');
  if (related && related.dataset.url && !related.children.length) {
    fetch(related.dataset.url).then((r) => r.text()).then((html) => {
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      const inner = tmp.querySelector('[data-related]');
      if (inner && inner.innerHTML.trim()) { related.innerHTML = inner.innerHTML; reveal(related); }
    }).catch(() => {});
  }

  /* ------------------------------------------------------------ predictive search */
  const search = $('[data-search-overlay]');
  const sInput = $('[data-search-input]');
  const sResults = $('[data-search-results]');
  $$('[data-search-open]').forEach((b) => b.addEventListener('click', () => open(search)));
  $$('[data-search-close]').forEach((b) => b.addEventListener('click', () => close(search)));
  let sTimer, sCtrl;
  sInput?.addEventListener('input', () => {
    clearTimeout(sTimer);
    const q = sInput.value.trim();
    if (q.length < 2) { sResults.innerHTML = ''; return; }
    sTimer = setTimeout(async () => {
      sCtrl?.abort();
      sCtrl = new AbortController();
      try {
        const url = `${T.routes.predictiveSearch || root + 'search/suggest'}.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=6&resources[options][unavailable_products]=last`;
        const data = await fetch(url, { signal: sCtrl.signal }).then((r) => r.json());
        const products = data?.resources?.results?.products || [];
        sResults.innerHTML = products.length
          ? products.map((p) => `<a class="suggest" href="${esc(p.url)}">${p.image ? `<img src="${esc(imgSize(p.image, 160))}" alt="" loading="lazy">` : '<span></span>'}<span class="suggest__title">${esc(p.title)}</span><span class="suggest__price">${formatMoney(Math.round(parseFloat(p.price) * 100))}</span></a>`).join('') +
            `<a class="suggest-all" href="${root}search?type=product&q=${encodeURIComponent(q)}">Voir tous les résultats</a>`
          : `<p class="suggest-empty">Aucun produit pour « ${esc(q)} ».</p>`;
      } catch (e) { if (e.name !== 'AbortError') sResults.innerHTML = ''; }
    }, 220);
  });

  /* ------------------------------------------------------------ collection filters */
  const facets = $('[data-facets]');
  if (facets) {
    const fd = $('[data-facets-drawer]', facets);
    let scrim = document.createElement('div');
    scrim.className = 'facets__scrim';
    document.body.appendChild(scrim);
    const openF = () => { fd.classList.add('is-open'); fd.setAttribute('aria-hidden', 'false'); scrim.classList.add('is-open'); document.body.classList.add('no-scroll'); };
    const closeF = () => { fd.classList.remove('is-open'); fd.setAttribute('aria-hidden', 'true'); scrim.classList.remove('is-open'); document.body.classList.remove('no-scroll'); };
    $('[data-facets-open]', facets)?.addEventListener('click', openF);
    $('[data-facets-close]', facets)?.addEventListener('click', closeF);
    scrim.addEventListener('click', closeF);
    $$('[data-facets-autosubmit]', facets).forEach((s) => s.addEventListener('change', () => s.form.submit()));
    // drop empty price inputs so the URL stays clean
    $('[data-facets-form]', facets)?.addEventListener('submit', (e) => {
      $$('input[type=number]', e.target).forEach((i) => { if (i.value === '') i.disabled = true; });
    });
  }

  /* ------------------------------------------------------------ scroll reveal */
  function reveal(scope = document) {
    const items = $$('[data-reveal]:not(.is-visible)', scope);
    if (!('IntersectionObserver' in window) || !document.body.classList.contains('has-animations')) {
      items.forEach((i) => i.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-visible');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    // small stagger for siblings in a row
    items.forEach((el) => {
      const sibs = Array.from(el.parentElement ? el.parentElement.children : []).filter((c) => c.hasAttribute('data-reveal'));
      const k = Math.min(sibs.indexOf(el), 6);
      if (k > 0) el.style.setProperty('--d', `${k * 0.07}s`);
      io.observe(el);
    });
  }
  reveal();
  document.addEventListener('shopify:section:load', (e) => reveal(e.target));

  // cart page: no drawer hijack
  if (document.body.classList.contains('template-cart')) T.cartPage = true;
})();
