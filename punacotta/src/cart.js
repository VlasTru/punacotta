// One basket for the Board of Arrivals, the Marketplace and Online Order.
// A line is an item (rid) and a number of steps — one piece, or one MOQ of an item sold in sub-units —
// summed whichever page it was added from. `mid` is set when the item was picked from a restaurant
// menu: the part that isn't in stock or in a running batch is then made to order.
// Kept in localStorage (per browser) and synced across tabs; the server decides the split at checkout.
import { useSyncExternalStore } from "react";
import { api } from "./api.js";

const KEY = "tanelu_cart_v2";
const OLD_MARKET_KEY = "market_cart_v1";

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    if (v && typeof v === "object" && v.lines) return v;
    // Phase 1 Marketplace basket → carry it over once
    const old = JSON.parse(localStorage.getItem(OLD_MARKET_KEY) || "null");
    if (old && typeof old === "object") {
      const lines = {};
      Object.values(old).forEach(l => { if (l?.item?.rid && l.steps > 0) lines[l.item.rid] = { rid: l.item.rid, steps: l.steps, mid: null, item: snapFromMarket(l.item) }; });
      localStorage.removeItem(OLD_MARKET_KEY);
      return { lines };
    }
  } catch {}
  return { lines: {} };
}

let state = { ...read(), quote: null, quoteKey: "" };
const listeners = new Set();
const emit = () => listeners.forEach(f => f());
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify({ lines: state.lines })); } catch {} };
const set = patch => { state = { ...state, ...patch }; emit(); };

if (typeof window !== "undefined") {
  window.addEventListener("storage", e => {
    if (e.key !== KEY) return;
    set({ lines: read().lines });
  });
}

// ── item snapshots: what the basket shows before the server quote comes back ──
export function snapFromMarket(it) {
  return { rid: it.rid, name: it.name, price: Number(it.price), currency: it.currency || "AMD", units: it.units || "pcs",
    allow_submultiples: !!it.allow_submultiples, moq: it.moq ? Number(it.moq) : null, deliverable: it.deliverable !== false,
    seller_uid: it.restaurant?.uid ?? it.seller_uid, seller_name: it.restaurant?.name ?? it.seller_name, image: it.image_thumb_url || it.image_url || it.image || null };
}
export function snapFromArrival(a) {
  return { rid: a.rid, name: a.item_name, price: Number(a.price), currency: a.currency || "AMD", units: a.units || "pcs",
    allow_submultiples: !!a.allow_submultiples, moq: a.moq ? Number(a.moq) : null, deliverable: a.deliverable !== false,
    seller_uid: a.owner_uid, seller_name: a.sold_by, image: null };
}
export function snapFromMenu(r, menu) {
  return { rid: r.rid, name: r.name, price: Number(r.price), currency: r.currency || "AMD", units: r.units || "pcs",
    allow_submultiples: !!r.allow_submultiples, moq: r.moq ? Number(r.moq) : null, deliverable: r.deliverable !== false,
    seller_uid: menu.owner_uid, seller_name: menu.business_name || menu.owner_name || menu.restaurant_name || menu.name,
    image: r.image_thumb_url || r.image_url || null };
}

export const cart = {
  get: () => state,
  subscribe: f => { listeners.add(f); return () => listeners.delete(f); },
  steps: rid => state.lines[rid]?.steps || 0,
  // Largest number of steps the server said can be ordered (null until a quote has come back)
  max: rid => { const l = state.quote?.lines?.find(x => x.rid === Number(rid)); return l ? l.max_steps : null; },
  setSteps(item, steps, { mid = null } = {}) {
    const n = Math.max(0, Math.min(9999, Math.round(steps)));
    const lines = { ...state.lines };
    if (!n) delete lines[item.rid];
    else {
      const cur = lines[item.rid];
      lines[item.rid] = { rid: item.rid, steps: n, mid: mid || cur?.mid || null, item: { ...(cur?.item || {}), ...item } };
    }
    set({ lines }); persist();
  },
  remove(rid) { const lines = { ...state.lines }; delete lines[rid]; set({ lines }); persist(); },
  clear() { set({ lines: {}, quote: null, quoteKey: "" }); persist(); },
  // Ask the server how the basket would be split (stock → batches → made to order)
  async refreshQuote() {
    const items = Object.values(state.lines).map(l => ({ rid: l.rid, steps: l.steps, mid: l.mid || undefined }));
    const key = JSON.stringify(items);
    if (!items.length) { set({ quote: null, quoteKey: "" }); return null; }
    const q = await api.quoteCheckout({ items });
    if (JSON.stringify(Object.values(state.lines).map(l => ({ rid: l.rid, steps: l.steps, mid: l.mid || undefined }))) === key) set({ quote: q, quoteKey: key });
    return q;
  },
};

export function useCart() {
  return useSyncExternalStore(cart.subscribe, cart.get, cart.get);
}

// Steps of an item: one step = one unit, or one MOQ (in sub-units) for items sold that way
export const UNIT_CONV = { kilograms: 1000, litres: 1000, pounds: 16 };
export const stepUnits = it => (it?.allow_submultiples && Number(it.moq) > 0) ? Number(it.moq) / (UNIT_CONV[it.units] || 1) : 1;
