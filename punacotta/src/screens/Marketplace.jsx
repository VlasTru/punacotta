// Marketplace (/market) — every restaurant's listed items in one shop: category rows, search,
// item pop-up, basket and checkout. Browsing is public; placing an order needs a Tanelu account.
// Loaded lazily from App.jsx, like the Board of Arrivals.
import { useState, useEffect, useRef, useMemo } from "react";
import { api } from "../api.js";
import { RU, conv, subAbbr, unitAbbr } from "../App.jsx";
import { Button } from "@/components/ui/button";
import { Input as CInput } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Card, CardHeader, CardTitle, CardPanel } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge as CBadge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Radio, RadioGroup } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Spinner as CSpinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog as CDialog, DialogPopup, DialogHeader, DialogTitle, DialogDescription, DialogPanel, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetPopup, SheetHeader, SheetTitle, SheetPanel } from "@/components/ui/sheet";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import {
  ArrowLeftIcon, ArrowRightIcon, CakeSliceIcon, CandyIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, CircleUserIcon,
  CoffeeIcon, GiftIcon, GlobeIcon, HomeIcon, InfoIcon, LayoutGridIcon, LogInIcon, MapPinIcon, MenuIcon, MinusIcon, PlusIcon,
  ReceiptTextIcon, SearchIcon, ShoppingBasketIcon, SparklesIcon, StoreIcon, TrashIcon, UtensilsIcon, WheatIcon, XIcon,
  FlameIcon, CroissantIcon, HexagonIcon,
} from "lucide-react";

const MRU = {
  "Marketplace":"Маркетплейс", "Search the marketplace…":"Поиск по маркетплейсу…", "Popular":"Популярное", "Home":"Главная",
  "See all":"Все", "Your basket":"Ваша корзина", "Your basket is empty.":"Корзина пуста.",
  "Open an item and add it to your basket.":"Откройте товар и добавьте его в корзину.",
  "Add to basket":"В корзину", "In stock":"В наличии", "coming soon":"скоро будет", "available":"доступно",
  "Sold by":"Продавец", "Contents":"Состав", "Frequently bought together":"Часто покупают вместе", "Categories":"Категории",
  "Checkout":"Оформить", "Total":"Итого", "Place order":"Оформить заказ", "Pickup":"Самовывоз", "Delivery":"Доставка",
  "Delivery address":"Адрес доставки", "Comments for the restaurant":"Комментарий для ресторана", "Back":"Назад",
  "Items from different restaurants arrive as separate orders.":"Товары разных ресторанов оформляются отдельными заказами.",
  "Log in to place your order":"Войдите, чтобы оформить заказ", "Log in":"Войти", "Email":"Эл. почта", "Password":"Пароль",
  "No account yet?":"Ещё нет аккаунта?", "Sign up":"Зарегистрироваться", "My orders":"Мои заказы",
  "Order placed!":"Заказ оформлен!", "Track them in My orders.":"Следите за ними в разделе «Мои заказы».", "New order":"Новый заказ",
  "Nothing here yet":"Пока пусто", "No items in this category are on sale right now.":"В этой категории сейчас нет товаров.",
  "Nothing found":"Ничего не найдено", "Try another spelling or a shorter word.":"Попробуйте другое написание или более короткое слово.",
  "Results for":"Результаты для", "Max available":"Больше нет в наличии", "pickup only":"только самовывоз",
  "Some items can only be picked up.":"Некоторые товары доступны только для самовывоза.", "Remove":"Удалить", "Clear":"Очистить",
  "The marketplace is empty for now.":"Маркетплейс пока пуст.", "Restaurants haven't listed any items yet.":"Рестораны ещё не выставили товары.",
  "All":"Все", "Close":"Закрыть", "min":"мин.",
  // category names (the tree is global and stored in English)
  "Meals":"Блюда", "Combo":"Комбо", "Combo meals":"Комбо", "Main dishes":"Основные блюда", "Side dishes":"Гарниры", "Main":"Основные", "Side":"Гарниры", "Sushi":"Суши", "Other":"Другое",
  "Pastry":"Выпечка", "Cakes":"Пирожные", "Bread":"Хлеб", "Cookies":"Печенье",
  "Confectionery":"Кондитерские изделия", "Candies":"Конфеты", "Chocolate":"Шоколад", "Torts":"Торты",
  "Drinks":"Напитки", "Coffee":"Кофе", "Tea":"Чай", "Soft":"Безалкогольные",
  "Cheese":"Сыр", "Honey":"Мёд", "Gift sets":"Подарочные наборы", "Whole foods":"Натуральные продукты",
};
const CAT_ICON = { popular:FlameIcon, meals:UtensilsIcon, pastry:CroissantIcon, confectionery:CandyIcon, drinks:CoffeeIcon,
  cheese:CakeSliceIcon, honey:HexagonIcon, "gift-sets":GiftIcon, "whole-foods":WheatIcon };
const CART_KEY = "market_cart_v1";
const loadCart = () => { try { return JSON.parse(localStorage.getItem(CART_KEY) || "{}") || {}; } catch { return {}; } };
const saveCart = c => { try { localStorage.setItem(CART_KEY, JSON.stringify(c)); } catch {} };

// Items sold in sub-unit steps (250 g of an item priced per kg): one step = moq sub-units
const stepOf = it => (it.allow_submultiples && Number(it.moq) > 0) ? Number(it.moq) / conv(it.units) : 1;
const maxSteps = it => Math.max(0, Math.floor(Number(it.available_qty) / stepOf(it) + 1e-9));
const rnd = n => Math.round(n * 1000) / 1000;
const unitLabel = u => unitAbbr(u) || "pcs";
const fmtMoney = (n, cur) => `${Math.round(n * 100) / 100 === Math.round(n) ? Math.round(n).toLocaleString() : (Math.round(n * 100) / 100).toLocaleString()} ${cur || "AMD"}`;
const fmtSteps = (it, steps) => stepOf(it) < 1 ? `${rnd(steps * Number(it.moq))} ${subAbbr(it.units)}` : `${rnd(steps * stepOf(it))} ${unitLabel(it.units)}`;
const clip = (s, n = 50) => { const t = String(s || "").trim(); return t.length > n ? t.slice(0, n).trimEnd() + "..." : t; };

// URL ⇄ view: /market, /market/<category>[/<sub>], /market?q=<search>
function viewFromUrl() {
  const q = new URLSearchParams(window.location.search).get("q");
  if (q) return { kind: "search", q };
  const slug = window.location.pathname.replace(/^\/market\/?/, "").replace(/\/+$/, "");
  return slug ? { kind: "category", slug } : { kind: "home" };
}
const urlOf = v => v.kind === "search" ? `/market?q=${encodeURIComponent(v.q)}` : v.kind === "category" ? `/market/${v.slug}` : "/market";

function ItemImage({ item, className = "" }) {
  const top = (item?.top_slug) || "";
  const Icon = CAT_ICON[top] || ShoppingBasketIcon;
  const src = item?.image_thumb_url || item?.image_url;
  return src
    ? <img src={src} alt="" loading="lazy" className={`size-full object-cover ${className}`}/>
    : <div className={`flex size-full items-center justify-center bg-gradient-to-br from-brand/25 via-brand/10 to-muted ${className}`}>
        <Icon className="size-10 text-brand/60" aria-hidden/>
      </div>;
}

export default function Marketplace({ toast, user, onLogin }) {
  const [lang, setLangState] = useState(() => { try { return localStorage.getItem("lang") || "en"; } catch { return "en"; } });
  const tl = k => lang === "ru" ? (MRU[k] || RU[k] || k) : k;
  const [tree, setTree] = useState([]);
  const [home, setHome] = useState(null);
  const [view, setView] = useState(viewFromUrl);
  const [list, setList] = useState(null);          // items of the category / search view
  const [listLoading, setListLoading] = useState(false);
  const [query, setQuery] = useState(() => viewFromUrl().q || "");
  const [openRid, setOpenRid] = useState(null);
  const [detail, setDetail] = useState(null);
  const [cart, setCartState] = useState(loadCart); // rid → { steps, item }
  const [cartOpen, setCartOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [fulfillment, setFulfillment] = useState("pickup");
  const [address, setAddress] = useState("");
  const [comments, setComments] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(null);
  const [badRid, setBadRid] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [login, setLogin] = useState({ email: "", password: "", error: "", busy: false });

  const setCart = fn => setCartState(prev => { const next = typeof fn === "function" ? fn(prev) : fn; saveCart(next); return next; });
  const go = (v, { replace = false } = {}) => {
    const url = urlOf(v);
    if (url !== window.location.pathname + window.location.search) (replace ? history.replaceState : history.pushState).call(history, null, "", url);
    setView(v); setNavOpen(false);
    if (v.kind !== "search") setQuery("");
    window.scrollTo({ top: 0 });
  };
  useEffect(() => {
    const on = () => { const v = viewFromUrl(); setView(v); setQuery(v.q || ""); };
    window.addEventListener("popstate", on);
    return () => window.removeEventListener("popstate", on);
  }, []);

  const topOf = useMemo(() => {   // mcid → top-level slug (for placeholder icons)
    const m = new Map();
    tree.forEach(t => { m.set(t.mcid, t.slug); t.children.forEach(c => m.set(c.mcid, t.slug)); });
    return m;
  }, [tree]);
  const withTop = it => it && ({ ...it, top_slug: (it.mcids || []).map(id => topOf.get(id)).find(Boolean) });

  const loadHome = () => api.getMarketHome().then(d => { setTree(d.categories || []); setHome(d.rows || []); }).catch(e => toast(e.message, "error"));
  useEffect(() => { loadHome(); }, []);

  // Category / search views
  useEffect(() => {
    if (view.kind === "home") { setList(null); return; }
    let live = true;
    setListLoading(true);
    const t = setTimeout(() => {
      (view.kind === "search" ? api.searchMarket(view.q) : api.getMarketCategory(view.slug))
        .then(d => { if (live) setList(d); })
        .catch(e => { if (live) { setList({ items: [], error: e.message }); } })
        .finally(() => { if (live) setListLoading(false); });
    }, view.kind === "search" ? 200 : 0);
    return () => { live = false; clearTimeout(t); };
  }, [view.kind, view.q, view.slug]);

  // Search as you type (after 2 characters); clearing the box goes back home
  const onSearch = v => {
    setQuery(v);
    const q = v.trim();
    if (q.length >= 2) go({ kind: "search", q }, { replace: view.kind === "search" });
    else if (!q && view.kind === "search") go({ kind: "home" }, { replace: true });
  };

  // Item pop-up
  useEffect(() => {
    if (!openRid) { setDetail(null); return; }
    let live = true;
    setDetail(null);
    api.getMarketItem(openRid).then(d => { if (live) setDetail(d); })
      .catch(e => { if (live) { toast(e.message, "error"); setOpenRid(null); } });
    return () => { live = false; };
  }, [openRid]);

  // Basket
  const cartLines = Object.values(cart);
  const stepsOf = rid => cart[rid]?.steps || 0;
  const setSteps = (item, steps) => setCart(p => {
    const n = Math.max(0, Math.min(maxSteps(item), steps));
    if (!n) { const { [item.rid]: _, ...rest } = p; return rest; }
    return { ...p, [item.rid]: { steps: n, item: { ...item, also_bought: undefined, contents: undefined } } };
  });
  const lineTotal = l => l.steps * stepOf(l.item) * Number(l.item.price);
  const cartTotal = cartLines.reduce((s, l) => s + lineTotal(l), 0);
  const cartCurrency = cartLines[0]?.item.currency || "AMD";
  const cartCount = cartLines.length;
  const bySeller = useMemo(() => {
    const m = new Map();
    cartLines.forEach(l => { const k = l.item.restaurant?.uid; if (!m.has(k)) m.set(k, { name: l.item.restaurant?.name, lines: [] }); m.get(k).lines.push(l); });
    return [...m.values()];
  }, [cart]);
  const pickupOnly = cartLines.some(l => l.item.deliverable === false);
  useEffect(() => { if (pickupOnly && fulfillment === "delivery") setFulfillment("pickup"); }, [pickupOnly]);

  const placeOrder = async () => {
    if (fulfillment === "delivery" && !address.trim()) { toast(tl("Delivery address") + " ✱", "error"); return; }
    setPlacing(true); setBadRid(null);
    try {
      const res = await api.placeMarketOrder({
        items: cartLines.map(l => ({ rid: l.item.rid, steps: l.steps })),
        fulfillment, delivery_address: fulfillment === "delivery" ? address.trim() : null, delivery_comments: comments.trim() || null,
      });
      setPlaced(res.orders || []);
      setCart({});
      setCheckout(false); setComments("");
      loadHome();
    } catch (e) {
      toast(e.message, "error");
      const rid = e.data?.rid ?? e.rid;
      if (rid) setBadRid(rid);
    } finally { setPlacing(false); }
  };
  const doLogin = async e => {
    e?.preventDefault();
    setLogin(l => ({ ...l, busy: true, error: "" }));
    try {
      const { token, user: u } = await api.login(login.email.trim(), login.password);
      localStorage.setItem("token", token);
      onLogin?.(u);
      setLoginOpen(false);
      setLogin({ email: "", password: "", error: "", busy: false });
    } catch (err) { setLogin(l => ({ ...l, busy: false, error: err.message })); }
  };
  const toMyOrders = () => { try { sessionStorage.setItem("tanelu_next_page", "orders-cust"); } catch {} window.location.assign("/"); };
  const toggleLang = () => { const nl = lang === "en" ? "ru" : "en"; setLangState(nl); try { localStorage.setItem("lang", nl); } catch {} };

  // ── pieces (plain functions returning JSX, so inputs keep focus across renders) ──
  const stepper = (item, size = "sm") => {
    const steps = stepsOf(item.rid), max = maxSteps(item);
    return (
      <div className="inline-flex items-center gap-1">
        <Button variant="outline" size={size === "sm" ? "icon-sm" : "icon-xs"} aria-label={`Remove one ${item.name}`} disabled={!steps} onClick={() => setSteps(item, steps - 1)}><MinusIcon/></Button>
        <span className="min-w-14 text-center font-semibold text-sm tabular-nums">{fmtSteps(item, steps)}</span>
        <Button variant="outline" size={size === "sm" ? "icon-sm" : "icon-xs"} aria-label={`Add one ${item.name}`} disabled={steps >= max} onClick={() => setSteps(item, steps + 1)}><PlusIcon/></Button>
      </div>
    );
  };

  const card = (raw, { fluid = false } = {}) => {
    const it = withTop(raw);
    const inCart = stepsOf(it.rid);
    return (
      <button type="button" key={it.rid} data-slot="market-card" onClick={() => setOpenRid(it.rid)}
        className={`group relative flex aspect-[4/5] shrink-0 flex-col overflow-hidden rounded-xl border bg-card text-start shadow-xs/5 outline-none transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring ${fluid ? "w-full" : ""}`}
        style={fluid ? undefined : { width: "calc((100cqw - (var(--cards) - 1) * 0.75rem) / var(--cards))" }}>
        <div className="absolute inset-0 transition-transform duration-300 group-hover:scale-[1.03]"><ItemImage item={it}/></div>
        {inCart > 0 && <CBadge className="absolute end-2 top-2 shadow-sm"><ShoppingBasketIcon/>{fmtSteps(it, inCart)}</CBadge>}
        <div className="relative mt-auto flex flex-col gap-0.5 border-t bg-card/92 px-3 pt-2 pb-2.5 backdrop-blur-sm">
          <span className="truncate font-semibold text-sm">{it.name}</span>
          <span className="line-clamp-2 min-h-8 text-muted-foreground text-xs leading-4">{clip(it.description) || it.restaurant?.name}</span>
          <span className="mt-0.5 flex items-baseline justify-between gap-2">
            <span className="font-semibold text-brand text-sm tabular-nums">{fmtMoney(it.price, it.currency)}<span className="font-normal text-muted-foreground text-xs"> / {unitLabel(it.units)}</span></span>
          </span>
        </div>
      </button>
    );
  };

  const scrollRow = (key, dir) => {
    const vp = document.querySelector(`[data-row="${key}"] [data-slot="scroll-area-viewport"]`);
    if (vp) vp.scrollBy({ left: dir * vp.clientWidth, behavior: "smooth" });
  };
  const row = r => {
    if (!r.items?.length) return null;
    const Icon = CAT_ICON[r.slug] || LayoutGridIcon;
    return (
      <section key={r.slug} data-row={r.slug} className="flex flex-col gap-2.5" aria-label={tl(r.name)}>
        <div className="flex items-center gap-2">
          <h2 className="flex items-center gap-2 font-heading font-semibold text-lg"><Icon className="size-4.5 text-brand"/>{tl(r.name)}</h2>
          <div className="ms-auto flex items-center gap-1">
            {r.items.length > 2 && <>
              <Button variant="ghost" size="icon-sm" aria-label="Scroll left" className="max-md:hidden" onClick={() => scrollRow(r.slug, -1)}><ChevronLeftIcon/></Button>
              <Button variant="ghost" size="icon-sm" aria-label="Scroll right" className="max-md:hidden" onClick={() => scrollRow(r.slug, 1)}><ChevronRightIcon/></Button>
            </>}
            <Button variant="ghost" size="sm" onClick={() => go({ kind: "category", slug: r.slug })}>{tl("See all")}<ArrowRightIcon/></Button>
          </div>
        </div>
        <ScrollArea scrollFade clampContentMinWidth={false} className="@container [--cards:2.2] sm:[--cards:3.2] lg:[--cards:4] xl:[--cards:5]">
          <div className="flex gap-3 pb-3">{r.items.map(it => card(it))}</div>
        </ScrollArea>
      </section>
    );
  };

  const grid = items => (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{items.map(it => card(it, { fluid: true }))}</div>
  );
  const emptyState = (title, desc, Icon = SearchIcon) => (
    <Empty className="rounded-xl border border-dashed py-14">
      <EmptyHeader>
        <EmptyMedia variant="icon"><Icon/></EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{desc}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );

  const activeSlug = view.kind === "category" ? view.slug : view.kind === "home" ? "" : null;
  const navLink = (slug, label, Icon, depth = 0) => {
    const on = activeSlug === slug;
    return (
      <button type="button" key={slug || "home"} data-slot="market-nav-link" aria-current={on ? "page" : undefined}
        onClick={() => go(slug ? { kind: "category", slug } : { kind: "home" })}
        className={`flex w-full items-center gap-2 rounded-lg text-start ${depth ? "h-8 ps-9 pe-2 text-[13px]" : "h-9 px-2.5 font-medium text-sm"} ${on ? "bg-accent font-semibold text-accent-foreground" : depth ? "text-muted-foreground hover:bg-muted hover:text-foreground" : "text-foreground hover:bg-muted"}`}>
        {Icon && <Icon className={`size-4 shrink-0 ${on ? "" : "text-muted-foreground"}`}/>}
        <span className="truncate">{label}</span>
      </button>
    );
  };
  // Top-level categories are always unfolded (not collapsible), sub-categories listed under them
  const categoryNav = () => (
    <nav aria-label={tl("Categories")} className="flex flex-col gap-0.5">
      {navLink("", tl("Home"), HomeIcon)}
      {navLink("popular", tl("Popular"), FlameIcon)}
      <Separator className="my-2"/>
      {tree.map(t => (
        <div key={t.slug} className="flex flex-col gap-0.5 pb-1">
          {navLink(t.slug, tl(t.name), CAT_ICON[t.slug] || LayoutGridIcon)}
          {t.children.map(c => navLink(c.slug, tl(c.name), null, 1))}
        </div>
      ))}
    </nav>
  );

  const basket = () => (
    <div className="flex flex-col">
      {placed ? (
        <div className="flex flex-col gap-3">
          <Alert variant="success"><CheckIcon/><AlertTitle>{tl("Order placed!")}</AlertTitle><AlertDescription>{tl("Track them in My orders.")}</AlertDescription></Alert>
          {placed.map(o => (
            <div key={o.oid} className="flex items-center justify-between gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
              <span className="min-w-0 truncate"><b>#{o.oid}</b> · {o.seller_name}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{fmtMoney((o.items || []).reduce((s, i) => s + i.qty * i.price, 0), cartCurrency)}</span>
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setPlaced(null)}>{tl("New order")}</Button>
            <Button className="flex-1" onClick={toMyOrders}><ReceiptTextIcon/>{tl("My orders")}</Button>
          </div>
        </div>
      ) : !cartCount ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <ShoppingBasketIcon className="size-8 text-muted-foreground/50"/>
          <p className="font-medium text-sm">{tl("Your basket is empty.")}</p>
          <p className="text-muted-foreground text-xs">{tl("Open an item and add it to your basket.")}</p>
        </div>
      ) : !checkout ? (
        <>
          {bySeller.length > 1 && (
            <Alert variant="info" className="mb-3"><InfoIcon/><AlertDescription>{tl("Items from different restaurants arrive as separate orders.")}</AlertDescription></Alert>
          )}
          {bySeller.map(g => (
            <div key={g.name} className="flex flex-col">
              <p className="flex items-center gap-1.5 pt-1 pb-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wide"><StoreIcon className="size-3.5"/>{g.name}</p>
              {g.lines.map(l => {
                const it = l.item, bad = badRid === it.rid;
                return (
                  <div key={it.rid} className={`flex items-center justify-between gap-2 border-b py-2.5 last:border-b-0 ${bad ? "rounded-md bg-destructive/8 px-2" : ""}`}>
                    <button type="button" className="min-w-0 text-start" onClick={() => setOpenRid(it.rid)}>
                      <p className="truncate font-semibold text-sm">{it.name}</p>
                      <p className="text-muted-foreground text-xs tabular-nums">{fmtMoney(lineTotal(l), it.currency)}</p>
                      {l.steps >= maxSteps(it) && <p className="text-warning-foreground text-xs">{tl("Max available")}</p>}
                    </button>
                    {stepper(it, "xs")}
                  </div>
                );
              })}
            </div>
          ))}
          <div className="flex items-baseline justify-between pt-3 pb-4 font-semibold">
            <span className="text-sm">{tl("Total")}</span>
            <span className="text-brand tabular-nums">{fmtMoney(cartTotal, cartCurrency)}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" aria-label={tl("Clear")} title={tl("Clear")} onClick={() => setCart({})}><TrashIcon/></Button>
            <Button className="flex-1" onClick={() => setCheckout(true)}>{tl("Checkout")}<ArrowRightIcon/></Button>
          </div>
        </>
      ) : !user ? (
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">{tl("Log in to place your order")}</p>
          <Button onClick={() => setLoginOpen(true)}><LogInIcon/>{tl("Log in")}</Button>
          <p className="text-center text-muted-foreground text-xs">{tl("No account yet?")} <a className="font-medium text-brand underline-offset-2 hover:underline" href="/#signup">{tl("Sign up")}</a></p>
          <Button variant="ghost" onClick={() => setCheckout(false)}><ArrowLeftIcon/>{tl("Back")}</Button>
        </div>
      ) : (
        <form className="flex flex-col gap-4" noValidate onSubmit={e => { e.preventDefault(); placeOrder(); }}>
          <div className="flex flex-col gap-2">
            <RadioGroup value={fulfillment} onValueChange={setFulfillment} className="flex flex-row gap-5">
              <Label className="cursor-pointer"><Radio value="pickup"/>{tl("Pickup")}</Label>
              <Label className={pickupOnly ? "cursor-not-allowed opacity-60" : "cursor-pointer"}><Radio value="delivery" disabled={pickupOnly}/>{tl("Delivery")}</Label>
            </RadioGroup>
            {pickupOnly && <p className="text-muted-foreground text-xs">{tl("Some items can only be picked up.")}</p>}
          </div>
          {fulfillment === "delivery" && (
            <Field>
              <FieldLabel>{tl("Delivery address")} <span className="text-destructive-foreground">*</span></FieldLabel>
              <CInput autoComplete="street-address" value={address} onChange={e => setAddress(e.target.value)}/>
            </Field>
          )}
          <Field>
            <FieldLabel>{tl("Comments for the restaurant")}</FieldLabel>
            <Textarea rows={2} value={comments} onChange={e => setComments(e.target.value)}/>
          </Field>
          <Separator/>
          <div className="flex flex-col gap-1 text-sm">
            {bySeller.map(g => (
              <div key={g.name} className="flex justify-between gap-2 text-muted-foreground">
                <span className="truncate">{g.name}</span>
                <span className="tabular-nums">{fmtMoney(g.lines.reduce((s, l) => s + lineTotal(l), 0), cartCurrency)}</span>
              </div>
            ))}
            <div className="mt-1 flex items-baseline justify-between font-semibold">
              <span>{tl("Total")}</span><span className="text-brand tabular-nums">{fmtMoney(cartTotal, cartCurrency)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" aria-label={tl("Back")} onClick={() => setCheckout(false)}><ArrowLeftIcon/></Button>
            <Button type="submit" className="flex-1" loading={placing}>{tl("Place order")}</Button>
          </div>
        </form>
      )}
    </div>
  );

  // ── main column ──
  let main;
  if (view.kind === "home") {
    const rows = (home || []).filter(r => r.items?.length);
    main = !home ? <div className="flex justify-center py-20"><CSpinner className="size-6 text-muted-foreground"/></div>
      : !rows.length ? emptyState(tl("The marketplace is empty for now."), tl("Restaurants haven't listed any items yet."), StoreIcon)
      : <div className="flex flex-col gap-7">{rows.map(row)}</div>;
  } else {
    const title = view.kind === "search" ? <>{tl("Results for")} “{view.q}”</> : tl(list?.name || "");
    const node = view.kind === "category" && tree.find(t => t.slug === view.slug);
    main = (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          {view.kind === "category" && list?.parent && (
            <button type="button" className="inline-flex w-fit items-center gap-1 text-muted-foreground text-xs hover:text-foreground" onClick={() => go({ kind: "category", slug: list.parent.slug })}>
              <ChevronLeftIcon className="size-3.5"/>{tl(list.parent.name)}
            </button>
          )}
          <h1 className="font-heading font-bold text-2xl tracking-tight">{title}</h1>
        </div>
        {node?.children?.length > 0 && (
          <div className="-mx-1 flex flex-wrap gap-1.5 px-1">
            {node.children.map(c => (
              <Button key={c.slug} variant="outline" size="sm" className="rounded-full" onClick={() => go({ kind: "category", slug: c.slug })}>{tl(c.name)}</Button>
            ))}
          </div>
        )}
        {listLoading && !list ? <div className="flex justify-center py-20"><CSpinner className="size-6 text-muted-foreground"/></div>
          : !list?.items?.length ? (view.kind === "search"
              ? emptyState(tl("Nothing found"), tl("Try another spelling or a shorter word."))
              : emptyState(tl("Nothing here yet"), list?.error || tl("No items in this category are on sale right now."), CAT_ICON[view.slug.split("/")[0]] || LayoutGridIcon))
          : <div className={listLoading ? "opacity-60 transition-opacity" : ""}>{grid(list.items)}</div>}
      </div>
    );
  }

  // ── item pop-up ──
  const d = withTop(detail);
  const coming = d ? Number(d.coming_qty) : 0;
  const itemDialog = (
    <CDialog open={!!openRid} onOpenChange={o => { if (!o) setOpenRid(null); }}>
      <DialogPopup showCloseButton={false} className="max-w-2xl">
        <div className="absolute end-2 top-2 z-10"><Button variant="secondary" size="icon" aria-label={tl("Close")} onClick={() => setOpenRid(null)}><XIcon/></Button></div>
        {!d ? <div className="flex min-h-64 items-center justify-center"><CSpinner className="size-6 text-muted-foreground"/></div> : (<>
          <DialogHeader className="flex-col gap-4 sm:flex-row sm:items-start">
            <div className="aspect-[16/10] w-full shrink-0 overflow-hidden rounded-xl border sm:aspect-square sm:w-52"><ItemImage item={d}/></div>
            <div className="flex min-w-0 flex-1 flex-col gap-2 pe-8">
              <DialogTitle className="text-2xl leading-tight">{d.name}</DialogTitle>
              <DialogDescription render={<div/>} className="flex flex-col gap-1.5">
                <span className="flex items-center gap-2 text-foreground">
                  {d.restaurant?.logo_url ? <img src={d.restaurant.logo_url} alt="" className="size-6 rounded-sm object-contain"/> : <StoreIcon className="size-4 text-muted-foreground"/>}
                  <span className="font-medium">{d.restaurant?.name}</span>
                </span>
                {d.restaurant?.address && <span className="flex items-center gap-1.5 text-xs"><MapPinIcon className="size-3.5"/>{d.restaurant.address}</span>}
              </DialogDescription>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-semibold text-brand text-xl tabular-nums">{fmtMoney(d.price, d.currency)}<span className="font-normal text-muted-foreground text-sm"> / {unitLabel(d.units)}</span></span>
                {stepOf(d) < 1 && <span className="text-muted-foreground text-xs">{tl("min")} {d.moq} {subAbbr(d.units)}</span>}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <CBadge variant="success">{tl("In stock")}: {rnd(Number(d.stock_qty))} {unitLabel(d.units)}</CBadge>
                {coming > 0 && <CBadge variant="info"><SparklesIcon/>+{rnd(coming)} {tl("coming soon")}</CBadge>}
                {d.deliverable === false && <CBadge variant="outline">{tl("pickup only")}</CBadge>}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {stepsOf(d.rid) ? stepper(d) : (
                  <Button onClick={() => setSteps(d, 1)} disabled={!maxSteps(d)}><ShoppingBasketIcon/>{tl("Add to basket")}</Button>
                )}
                {stepsOf(d.rid) > 0 && <span className="text-muted-foreground text-sm tabular-nums">= {fmtMoney(stepsOf(d.rid) * stepOf(d) * d.price, d.currency)}</span>}
              </div>
            </div>
          </DialogHeader>
          <DialogPanel className="flex flex-col gap-5">
            {d.description && <p className="whitespace-pre-line text-sm leading-relaxed">{d.description}</p>}
            {d.contents?.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">{tl("Contents")}</h3>
                <p className="text-sm">{d.contents.map(c => c.name).join(", ")}</p>
              </div>
            )}
            {d.categories?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {d.categories.map(c => <CBadge key={c} variant="secondary">{c.split(" › ").map(tl).join(" › ")}</CBadge>)}
              </div>
            )}
            {d.also_bought?.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">{tl("Frequently bought together")}</h3>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {d.also_bought.slice(0, 5).map(raw => { const a = withTop(raw); return (
                    <button type="button" key={a.rid} data-slot="also-bought" onClick={() => setOpenRid(a.rid)}
                      className="group flex flex-col overflow-hidden rounded-lg border bg-card text-start outline-none hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring">
                      <div className="aspect-square overflow-hidden"><ItemImage item={a} className="transition-transform group-hover:scale-105"/></div>
                      <div className="flex flex-col px-2 py-1.5">
                        <span className="truncate font-medium text-xs">{a.name}</span>
                        <span className="text-[11px] text-muted-foreground tabular-nums">{fmtMoney(a.price, a.currency)}</span>
                      </div>
                    </button>
                  ); })}
                </div>
              </div>
            )}
          </DialogPanel>
        </>)}
      </DialogPopup>
    </CDialog>
  );

  const loginDialog = (
    <CDialog open={loginOpen} onOpenChange={setLoginOpen}>
      <DialogPopup className="max-w-sm">
        <form onSubmit={doLogin} noValidate>
          <DialogHeader>
            <DialogTitle>{tl("Log in")}</DialogTitle>
            <DialogDescription>{tl("Log in to place your order")}</DialogDescription>
          </DialogHeader>
          <DialogPanel className="flex flex-col gap-4">
            {login.error && <Alert variant="error"><AlertDescription>{login.error}</AlertDescription></Alert>}
            <Field>
              <FieldLabel>{tl("Email")}</FieldLabel>
              <CInput type="email" autoComplete="email" value={login.email} onChange={e => setLogin(l => ({ ...l, email: e.target.value }))}/>
            </Field>
            <Field>
              <FieldLabel>{tl("Password")}</FieldLabel>
              <CInput type="password" autoComplete="current-password" value={login.password} onChange={e => setLogin(l => ({ ...l, password: e.target.value }))}/>
            </Field>
            <p className="text-muted-foreground text-xs">{tl("No account yet?")} <a className="font-medium text-brand underline-offset-2 hover:underline" href="/#signup">{tl("Sign up")}</a></p>
          </DialogPanel>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLoginOpen(false)}>{tl("Back")}</Button>
            <Button type="submit" loading={login.busy} disabled={!login.email.trim() || !login.password}>{tl("Log in")}</Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </CDialog>
  );

  return (
    <div className="coss min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/85 backdrop-blur supports-[backdrop-filter]:bg-card/70">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-2 px-3 sm:gap-3 sm:px-6">
          <Button variant="ghost" size="icon-sm" className="-ms-1 lg:hidden" aria-label={tl("Categories")} onClick={() => setNavOpen(true)}><MenuIcon/></Button>
          <a href="/market" onClick={e => { e.preventDefault(); go({ kind: "home" }); }} className="flex shrink-0 items-center gap-1.5" aria-label="tanelu marketplace">
            <svg width="10" height="14" viewBox="0 0 12 16" fill="none" className="mb-px" aria-hidden="true">
              <rect x="0.5" y="0.5" width="11" height="4" fill="var(--brand)"/>
              <circle cx="6" cy="11" r="4" fill="var(--brand)"/>
            </svg>
            <span className="font-semibold text-brand text-xl leading-none tracking-tight" style={{ fontFamily: "Georgia, serif" }}>tanelu</span>
            <span className="ms-1 text-muted-foreground text-sm max-md:hidden">{tl("Marketplace")}</span>
          </a>
          <div className="relative mx-auto w-full max-w-xl min-w-0">
            <SearchIcon className="pointer-events-none absolute start-2.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground"/>
            <CInput type="search" aria-label={tl("Search the marketplace…")} placeholder={tl("Search the marketplace…")} value={query}
              className="[&_input]:ps-8" onChange={e => onSearch(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && query.trim()) go({ kind: "search", q: query.trim() }, { replace: view.kind === "search" }); }}/>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="sm" className="max-sm:px-1.5" onClick={toggleLang} aria-label="Language"><GlobeIcon className="max-sm:hidden"/>{lang === "en" ? "RU" : "EN"}</Button>
            {user
              ? <Button variant="ghost" size="sm" onClick={toMyOrders} className="max-md:hidden"><ReceiptTextIcon/>{tl("My orders")}</Button>
              : <Button variant="ghost" size="sm" onClick={() => setLoginOpen(true)} className="max-sm:px-1.5"><CircleUserIcon/><span className="max-sm:hidden">{tl("Log in")}</span></Button>}
            <Button variant="outline" size="sm" className="relative 2xl:hidden" aria-label={tl("Your basket")} onClick={() => setCartOpen(true)}>
              <ShoppingBasketIcon/>
              {cartCount > 0 && <span className="tabular-nums">{cartCount}</span>}
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-6 px-3 py-5 sm:px-6 lg:grid-cols-[210px_minmax(0,1fr)] 2xl:grid-cols-[210px_minmax(0,1fr)_310px]">
        <aside className="max-lg:hidden">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pe-1 [scrollbar-width:thin]">{categoryNav()}</div>
        </aside>
        <main className="min-w-0">{main}</main>
        <aside className="max-2xl:hidden">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingBasketIcon className="size-4.5 text-brand"/>{tl("Your basket")}
                {cartCount > 0 && !placed && <CBadge variant="secondary" className="ms-auto">{cartCount}</CBadge>}
              </CardTitle>
            </CardHeader>
            <CardPanel className="max-h-[calc(100vh-11rem)] overflow-y-auto pt-0">{basket()}</CardPanel>
          </Card>
        </aside>
      </div>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetPopup side="right" showCloseButton={false} className="w-[min(380px,92vw)]">
          <SheetHeader className="flex-row items-center justify-between gap-3 border-b py-4">
            <SheetTitle className="flex items-center gap-2 text-lg"><ShoppingBasketIcon className="size-4.5 text-brand"/>{tl("Your basket")}</SheetTitle>
            <Button variant="ghost" size="icon-sm" aria-label={tl("Close")} onClick={() => setCartOpen(false)}><XIcon/></Button>
          </SheetHeader>
          <SheetPanel className="py-4">{basket()}</SheetPanel>
        </SheetPopup>
      </Sheet>
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetPopup side="left" showCloseButton={false} className="w-[min(290px,85vw)]">
          <SheetHeader className="flex-row items-center justify-between gap-3 border-b py-4">
            <SheetTitle className="text-lg">{tl("Categories")}</SheetTitle>
            <Button variant="ghost" size="icon-sm" aria-label={tl("Close")} onClick={() => setNavOpen(false)}><XIcon/></Button>
          </SheetHeader>
          <SheetPanel className="py-3">{categoryNav()}</SheetPanel>
        </SheetPopup>
      </Sheet>
      {itemDialog}
      {loginDialog}
    </div>
  );
}
