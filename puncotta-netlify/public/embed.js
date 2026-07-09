/**
 * Pun&Cotta Embedded Menu — Web Components
 * Usage: <script src="https://punacotta.netlify.app/embed.js"></script>
 *
 * Components:
 *   <puncotta-item   api-key="..."  rid="42"  [allow-order] [checkout="inline|redirect"]>
 *   <puncotta-menu   api-key="..."  [mid="5"] [view="carousel|table"] [allow-order] [checkout="..."]>
 *   <puncotta-cart   api-key="..."  [float="bottom-right|bottom-left|top-right|top-left"]>
 */

const API = 'https://punacotta.netlify.app/api/embed';

// ── Shared styles injected into every shadow root ────────────────────────────
const STYLES = `
  :host { font-family: 'DM Sans', system-ui, sans-serif; box-sizing: border-box; }
  *, *::before, *::after { box-sizing: inherit; }
  .pc-card {
    background: #fff; border-radius: 14px; overflow: hidden;
    border: 1px solid #e8dcc8; transition: box-shadow 0.2s;
  }
  .pc-card:hover { box-shadow: 0 4px 20px rgba(44,24,16,0.10); }
  .pc-img { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; }
  .pc-img-placeholder { width: 100%; aspect-ratio: 1; background: #f0e8d8; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; }
  .pc-body { padding: 14px; }
  .pc-name { font-size: 15px; font-weight: 700; color: #2c1810; margin: 0 0 4px; }
  .pc-desc { font-size: 13px; color: #8b7355; margin: 0 0 8px; line-height: 1.5; }
  .pc-price { font-size: 15px; font-weight: 700; color: #c8873a; margin: 0 0 12px; }
  .pc-moq  { font-size: 11px; color: #8b7355; margin: -8px 0 8px; }
  .pc-row  { display: flex; align-items: center; gap: 8px; }
  .pc-btn  {
    cursor: pointer; border: none; border-radius: 8px; font-family: inherit;
    font-size: 13px; font-weight: 600; padding: 8px 16px; transition: opacity 0.15s;
  }
  .pc-btn:hover { opacity: 0.88; }
  .pc-btn-primary  { background: #c8873a; color: #fff; flex: 1; }
  .pc-btn-ghost    { background: #f0e8d8; color: #2c1810; }
  .pc-btn-danger   { background: #d63031; color: #fff; }
  .pc-counter { display: flex; align-items: center; gap: 4px; }
  .pc-counter-btn {
    width: 30px; height: 30px; border-radius: 7px; border: 1px solid #e8dcc8;
    background: #fff; cursor: pointer; font-size: 16px; font-weight: 700;
    display: flex; align-items: center; justify-content: center; transition: background 0.1s;
  }
  .pc-counter-btn.plus { background: #c8873a; color: #fff; border-color: #c8873a; }
  .pc-qty { min-width: 36px; text-align: center; font-weight: 700; font-size: 14px; }
  .pc-badge { background: #f0e8d8; border-radius: 20px; padding: 2px 10px; font-size: 12px; color: #8b7355; }
  .pc-spinner { display: inline-block; width: 28px; height: 28px; border: 3px solid #e8dcc8; border-top-color: #c8873a; border-radius: 50%; animation: pc-spin 0.7s linear infinite; }
  @keyframes pc-spin { to { transform: rotate(360deg); } }
  .pc-error { color: #d63031; font-size: 14px; padding: 12px; }
  /* Carousel */
  .pc-carousel { display: flex; gap: 16px; overflow-x: auto; padding-bottom: 8px; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; }
  .pc-carousel::-webkit-scrollbar { height: 4px; }
  .pc-carousel::-webkit-scrollbar-thumb { background: #e8dcc8; border-radius: 2px; }
  .pc-carousel-item { flex: 0 0 220px; scroll-snap-align: start; }
  /* Table */
  .pc-table { width: 100%; border-collapse: collapse; }
  .pc-table th { text-align: left; padding: 10px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #8b7355; background: #f0e8d8; border-bottom: 1px solid #e8dcc8; }
  .pc-table td { padding: 12px 14px; border-bottom: 1px solid #f0e8d8; font-size: 14px; color: #2c1810; vertical-align: middle; }
  .pc-table tr:last-child td { border-bottom: none; }
  /* Cart */
  .pc-cart { background: #fff; border-radius: 14px; border: 1px solid #e8dcc8; padding: 16px; min-width: 260px; }
  .pc-cart.floating { position: fixed; z-index: 9999; box-shadow: 0 8px 32px rgba(44,24,16,0.18); }
  .pc-cart.bottom-right { bottom: 20px; right: 20px; }
  .pc-cart.bottom-left  { bottom: 20px; left: 20px; }
  .pc-cart.top-right    { top: 80px; right: 20px; }
  .pc-cart.top-left     { top: 80px; left: 20px; }
  .pc-cart-title { font-size: 15px; font-weight: 700; color: #2c1810; margin: 0 0 10px; font-family: Georgia, serif; }
  .pc-cart-item { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; color: #2c1810; }
  .pc-cart-total { font-size: 15px; font-weight: 700; color: #c8873a; margin-top: 10px; padding-top: 10px; border-top: 1px solid #e8dcc8; }
  .pc-cart-empty { font-size: 13px; color: #8b7355; text-align: center; padding: 16px 0; }
  /* Guest form */
  .pc-form { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
  .pc-input { padding: 9px 12px; border-radius: 8px; border: 1px solid #e8dcc8; font-size: 14px; font-family: inherit; outline: none; width: 100%; }
  .pc-input:focus { border-color: #c8873a; }
  .pc-label { font-size: 12px; font-weight: 600; color: #2c1810; margin-bottom: 2px; display: block; }
  /* Dialog overlay */
  .pc-overlay { position: fixed; inset: 0; background: rgba(44,24,16,0.45); z-index: 10000; display: flex; align-items: flex-end; justify-content: center; }
  .pc-sheet { background: #fff; border-radius: 20px 20px 0 0; width: 100%; max-width: 540px; max-height: 90vh; overflow-y: auto; padding: 24px; animation: pc-slide 0.25s ease; }
  @keyframes pc-slide { from { transform: translateY(100%); } to { transform: translateY(0); } }
  .pc-close { background: none; border: none; font-size: 22px; cursor: pointer; color: #8b7355; float: right; line-height: 1; }
`;

// ── Shared cart state (global across all components on same page) ─────────────
const _cart = { items: {}, meta: {}, listeners: new Set() };
function cartGet() { return _cart; }
function cartAdd(recipe, qty=1) {
  const rid = String(recipe.rid);
  if (!_cart.items[rid]) _cart.items[rid] = { recipe, qty: 0 };
  _cart.items[rid].qty = Math.max(0, _cart.items[rid].qty + qty);
  if (_cart.items[rid].qty === 0) delete _cart.items[rid];
  _cart.listeners.forEach(fn => fn());
}
function cartClear() { _cart.items = {}; _cart.listeners.forEach(fn => fn()); }
function cartTotal() {
  return Object.values(_cart.items).reduce((s, {recipe, qty}) => {
    if (recipe.allow_submultiples && recipe.moq) {
      const conv = { kilograms:1000, litres:1000, pounds:16 }[recipe.units] || 1;
      return s + recipe.price * (qty * Number(recipe.moq) / conv);
    }
    return s + recipe.price * qty;
  }, 0);
}
function cartCount() { return Object.values(_cart.items).reduce((s, {qty}) => s + qty, 0); }
function cartOnChange(fn) { _cart.listeners.add(fn); return () => _cart.listeners.delete(fn); }

// ── Unit helpers ──────────────────────────────────────────────────────────────
const UNIT_META = {
  kilograms: { abbr:'kg', subAbbr:'g',  conv:1000 },
  litres:    { abbr:'l',  subAbbr:'ml', conv:1000 },
  pounds:    { abbr:'lb', subAbbr:'oz', conv:16   },
};
function formatQty(recipe, steps) {
  if (!recipe.allow_submultiples || !recipe.moq) return String(steps);
  const sub = steps * Number(recipe.moq);
  const m = UNIT_META[recipe.units];
  if (!m) return String(sub);
  if (sub >= m.conv) return `${+(sub/m.conv).toFixed(3)} ${m.abbr}`;
  return `${sub} ${m.subAbbr}`;
}
function formatPrice(recipe) {
  const m = UNIT_META[recipe.units];
  if (recipe.allow_submultiples && m) return `${recipe.price} ${recipe.currency} / ${m.abbr}`;
  return `${recipe.price} ${recipe.currency}`;
}
function lineTotal(recipe, steps) {
  if (!steps) return 0;
  if (recipe.allow_submultiples && recipe.moq) {
    const m = UNIT_META[recipe.units];
    return Math.round(recipe.price * (steps * Number(recipe.moq) / (m?.conv||1)) * 100) / 100;
  }
  return recipe.price * steps;
}

// ── Shared fetch helper ───────────────────────────────────────────────────────
async function apiFetch(path, opts={}) {
  const res = await fetch(`${API}${path}`, { headers:{'Content-Type':'application/json'}, ...opts });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ── Item card HTML ────────────────────────────────────────────────────────────
function renderItemCard(recipe, allowOrder, onAdd) {
  const div = document.createElement('div');
  div.className = 'pc-card';

  const imgHtml = recipe.image_url
    ? `<img class="pc-img" src="${recipe.image_thumb_url||recipe.image_url}" alt="${recipe.name}">`
    : `<div class="pc-img-placeholder">🍮</div>`;

  const moq = recipe.allow_submultiples && recipe.moq
    ? `<p class="pc-moq">min. ${recipe.moq} ${UNIT_META[recipe.units]?.subAbbr||''}</p>` : '';

  div.innerHTML = `
    ${imgHtml}
    <div class="pc-body">
      <p class="pc-name">${recipe.name}</p>
      ${recipe.description ? `<p class="pc-desc">${recipe.description}</p>` : ''}
      <p class="pc-price">${formatPrice(recipe)}</p>
      ${moq}
      ${allowOrder ? `
        <div class="pc-row">
          <div class="pc-counter">
            <button class="pc-counter-btn minus">−</button>
            <span class="pc-qty">0</span>
            <button class="pc-counter-btn plus">+</button>
          </div>
          <button class="pc-btn pc-btn-primary add-btn">Add to order</button>
        </div>
      ` : ''}
    </div>`;

  if (allowOrder) {
    let steps = 0;
    const qtyEl = div.querySelector('.pc-qty');
    const addBtn = div.querySelector('.add-btn');
    const update = () => {
      qtyEl.textContent = formatQty(recipe, steps);
      addBtn.textContent = steps > 0
        ? `In order · ${lineTotal(recipe, steps)} ${recipe.currency}`
        : 'Add to order';
      addBtn.style.background = steps > 0 ? '#2c1810' : '#c8873a';
    };
    div.querySelector('.pc-counter-btn.minus').onclick = () => { steps = Math.max(0, steps-1); update(); cartAdd(recipe, -1); };
    div.querySelector('.pc-counter-btn.plus').onclick  = () => { steps++; update(); cartAdd(recipe, 1); };
    addBtn.onclick = () => { if (steps === 0) { steps = 1; update(); cartAdd(recipe, 1); } if (onAdd) onAdd(); };
  }
  return div;
}

// ── Base class ────────────────────────────────────────────────────────────────
class PuncottaBase extends HTMLElement {
  constructor() {
    super();
    this._root = this.attachShadow({ mode:'open' });
    this._style = document.createElement('style');
    this._style.textContent = STYLES;
    this._root.appendChild(this._style);
    this._container = document.createElement('div');
    this._root.appendChild(this._container);
    this._apiKey = null;
  }
  connectedCallback() {
    this._apiKey = this.getAttribute('api-key');
    this._render();
  }
  _allowOrder() {
    return this.hasAttribute('allow-order') || this.getAttribute('allow-order') !== 'false';
  }
  _checkoutMode() { return this.getAttribute('checkout') || 'inline'; }
  _loading() { this._container.innerHTML = '<div style="padding:32px;text-align:center"><div class="pc-spinner"></div></div>'; }
  _error(msg) { this._container.innerHTML = `<p class="pc-error">⚠ ${msg}</p>`; }
  _key() { return `?key=${encodeURIComponent(this._apiKey)}`; }
}

// ── <puncotta-item> ───────────────────────────────────────────────────────────
class PuncottaItem extends PuncottaBase {
  async _render() {
    const rid = this.getAttribute('rid');
    if (!rid) { this._error('rid attribute required'); return; }
    this._loading();
    try {
      const { item, settings } = await apiFetch(`/item/${rid}${this._key()}`);
      const allow = settings.allow_order && this._allowOrder();
      this._container.innerHTML = '';
      this._container.appendChild(renderItemCard(item, allow, null));
    } catch(e) { this._error(e.message); }
  }
}

// ── <puncotta-menu> ───────────────────────────────────────────────────────────
class PuncottaMenu extends PuncottaBase {
  async _render() {
    const mid  = this.getAttribute('mid');
    const view = this.getAttribute('view') || 'carousel';
    this._loading();
    try {
      let recipes = [], settings = {};
      if (mid) {
        const r = await apiFetch(`/menu/${mid}${this._key()}`);
        recipes  = r.menu.recipes || [];
        settings = r.settings;
      } else {
        // All available menus
        const r = await apiFetch(`/menu${this._key()}`);
        settings = r.settings;
        // Flatten all recipes from all menus
        for (const m of (r.menus||[])) {
          const mr = await apiFetch(`/menu/${m.mid}${this._key()}`);
          (mr.menu.recipes||[]).forEach(rec => {
            if (!recipes.find(x=>x.rid===rec.rid)) recipes.push(rec);
          });
        }
      }
      const allow = settings.allow_order && this._allowOrder();
      this._container.innerHTML = '';

      if (view === 'table') {
        const wrap = document.createElement('div');
        const table = document.createElement('table');
        table.className = 'pc-table';
        table.innerHTML = `<thead><tr><th>Item</th><th>Price</th>${allow?'<th>Qty</th>':''}</tr></thead>`;
        const tbody = document.createElement('tbody');
        recipes.forEach(r => {
          const tr = document.createElement('tr');
          const moq = r.allow_submultiples && r.moq ? `<br><small style="color:#8b7355">min ${r.moq}${UNIT_META[r.units]?.subAbbr||''}</small>` : '';
          tr.innerHTML = `
            <td><strong>${r.name}</strong>${moq}</td>
            <td style="color:#c8873a;font-weight:700">${formatPrice(r)}</td>
            ${allow ? `<td><div class="pc-counter">
              <button class="pc-counter-btn minus">−</button>
              <span class="pc-qty" style="min-width:44px">0</span>
              <button class="pc-counter-btn plus">+</button>
            </div></td>` : ''}`;
          if (allow) {
            let steps = 0;
            const qtyEl = tr.querySelector('.pc-qty');
            const upd = () => { qtyEl.textContent = formatQty(r, steps); };
            tr.querySelector('.pc-counter-btn.minus').onclick = () => { steps=Math.max(0,steps-1); upd(); cartAdd(r,-1); };
            tr.querySelector('.pc-counter-btn.plus').onclick  = () => { steps++; upd(); cartAdd(r,1); };
          }
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        wrap.appendChild(table);
        this._container.appendChild(wrap);
      } else {
        // Carousel
        const wrap = document.createElement('div');
        wrap.className = 'pc-carousel';
        recipes.forEach(r => {
          const cell = document.createElement('div');
          cell.className = 'pc-carousel-item';
          cell.appendChild(renderItemCard(r, allow, null));
          wrap.appendChild(cell);
        });
        this._container.appendChild(wrap);
      }
    } catch(e) { this._error(e.message); }
  }
}

// ── <puncotta-cart> ───────────────────────────────────────────────────────────
class PuncottaCart extends PuncottaBase {
  connectedCallback() {
    super.connectedCallback();
    this._unsub = cartOnChange(() => this._renderCart());
  }
  disconnectedCallback() { if (this._unsub) this._unsub(); }

  async _render() {
    const float = this.getAttribute('float');
    this._apiKey = this.getAttribute('api-key');
    if (float) {
      this._container.className = `pc-cart floating ${float}`;
    } else {
      this._container.className = 'pc-cart';
    }
    this._renderCart();
  }

  _renderCart() {
    const items = Object.values(cartGet().items);
    const float = this.getAttribute('float');
    const clsName = float ? `pc-cart floating ${float}` : 'pc-cart';
    this._container.className = clsName;

    if (items.length === 0) {
      this._container.innerHTML = `
        <p class="pc-cart-title">🛒 Your order</p>
        <p class="pc-cart-empty">No items yet</p>`;
      return;
    }

    const total = cartTotal();
    const itemsHtml = items.map(({recipe, qty}) =>
      `<div class="pc-cart-item">
        <span>${recipe.name} × ${formatQty(recipe, qty)}</span>
        <span style="font-weight:600">${lineTotal(recipe, qty).toFixed(2)}</span>
      </div>`
    ).join('');

    this._container.innerHTML = `
      <p class="pc-cart-title">🛒 Your order</p>
      ${itemsHtml}
      <div class="pc-cart-total">Total: ${total.toFixed(2)} AMD</div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="pc-btn pc-btn-ghost" id="pc-clear" style="flex:1">Clear</button>
        <button class="pc-btn pc-btn-primary" id="pc-checkout" style="flex:2">Place order</button>
      </div>
      <div id="pc-checkout-form" style="display:none"></div>`;

    this._container.querySelector('#pc-clear').onclick = () => cartClear();
    this._container.querySelector('#pc-checkout').onclick = () => this._openCheckout();
  }

  _openCheckout() {
    const form = this._container.querySelector('#pc-checkout-form');
    form.style.display = 'block';
    form.innerHTML = `
      <div class="pc-form">
        <div><label class="pc-label">Name *</label><input class="pc-input" id="pc-name" placeholder="Your name" required></div>
        <div><label class="pc-label">Email</label><input class="pc-input" id="pc-email" placeholder="you@example.com" type="email"></div>
        <div><label class="pc-label">Phone</label><input class="pc-input" id="pc-phone" placeholder="+374 ..."></div>
        <div>
          <label class="pc-label">Fulfillment</label>
          <div style="display:flex;gap:8px">
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
              <input type="radio" name="pc-fulfill" value="pickup" checked> Pickup
            </label>
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
              <input type="radio" name="pc-fulfill" value="delivery"> Delivery
            </label>
          </div>
        </div>
        <div id="pc-addr" style="display:none;flex-direction:column;gap:8px">
          <input class="pc-input" id="pc-street" placeholder="Street address">
          <input class="pc-input" id="pc-city" placeholder="City">
          <input class="pc-input" id="pc-zip" placeholder="ZIP">
        </div>
        <div id="pc-order-result"></div>
        <button class="pc-btn pc-btn-primary" id="pc-place" style="margin-top:4px">Confirm order</button>
        <button class="pc-btn pc-btn-ghost" id="pc-cancel-form">Cancel</button>
      </div>`;

    form.querySelectorAll('input[name="pc-fulfill"]').forEach(r =>
      r.addEventListener('change', () => {
        form.querySelector('#pc-addr').style.display = r.value === 'delivery' ? 'flex' : 'none';
      })
    );
    form.querySelector('#pc-cancel-form').onclick = () => { form.style.display = 'none'; };
    form.querySelector('#pc-place').onclick = () => this._placeOrder(form);
  }

  async _placeOrder(form) {
    const name  = form.querySelector('#pc-name').value.trim();
    if (!name) { form.querySelector('#pc-order-result').innerHTML = '<p style="color:#d63031;font-size:13px">Name is required</p>'; return; }
    const email = form.querySelector('#pc-email').value.trim();
    const phone = form.querySelector('#pc-phone').value.trim();
    const fulfillment = form.querySelector('input[name="pc-fulfill"]:checked')?.value;
    const pickup = fulfillment === 'pickup';
    const items = Object.values(cartGet().items).map(({recipe,qty}) => ({
      rid: recipe.rid,
      qty,
    }));
    // Find mid from first item (all items should share a menu — simplification)
    const mid = cartGet().meta.mid;
    const resultEl = form.querySelector('#pc-order-result');
    const btn = form.querySelector('#pc-place');
    btn.disabled = true; btn.textContent = 'Placing order…';
    try {
      const r = await apiFetch(`/orders${this._key()}`, {
        method: 'POST',
        body: JSON.stringify({
          mid, items, guest_name: name, guest_email: email, guest_phone: phone, pickup,
          delivery_address: !pickup ? {
            street: form.querySelector('#pc-street').value,
            city:   form.querySelector('#pc-city').value,
            zip:    form.querySelector('#pc-zip').value,
          } : null,
        }),
      });
      resultEl.innerHTML = `<p style="color:#00b894;font-size:14px;font-weight:600">✓ Order #${r.oid} placed! Thank you, ${name}.</p>`;
      cartClear();
      btn.style.display = 'none';
    } catch(e) {
      resultEl.innerHTML = `<p style="color:#d63031;font-size:13px">⚠ ${e.message}</p>`;
      btn.disabled = false; btn.textContent = 'Confirm order';
    }
  }
}

// ── Register all components ───────────────────────────────────────────────────
customElements.define('puncotta-item',  PuncottaItem);
customElements.define('puncotta-menu',  PuncottaMenu);
customElements.define('puncotta-cart',  PuncottaCart);

console.log('🎂 Pun&Cotta embed loaded');
