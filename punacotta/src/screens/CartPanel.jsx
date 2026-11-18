// The basket and checkout shared by the Board of Arrivals, the Marketplace and Online Order.
// Lines come from the shared store (src/cart.js); the server splits each one first-in-first-out
// between stock, running batches and (for menu items) made to order, one order per part.
import { useState, useEffect, useMemo } from "react";
import { api } from "../api.js";
import { cart, useCart, stepUnits } from "../cart.js";
import { subAbbr, unitAbbr, fmtLocalTime } from "../App.jsx";
import { Button } from "@/components/ui/button";
import { Input as CInput } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge as CBadge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Radio, RadioGroup } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Dialog as CDialog, DialogPopup, DialogHeader, DialogTitle, DialogDescription, DialogPanel, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, ClockIcon, ChefHatIcon, InfoIcon, LogInIcon, MinusIcon, PackageCheckIcon,
  PlusIcon, ReceiptTextIcon, ShoppingBasketIcon, StoreIcon, TrashIcon, TriangleAlertIcon, TruckIcon } from "lucide-react";

const rnd = n => Math.round(n * 1000) / 1000;
const money = (n, cur = "AMD") => `${(Math.round(n * 100) / 100).toLocaleString()} ${cur}`;
const unitLabel = u => unitAbbr(u) || "pcs";
// "3 pcs", "1.5 kg", or "750 g" for items sold in sub-unit steps
export const fmtSteps = (it, steps) => {
  const st = stepUnits(it);
  return st < 1 ? `${rnd(steps * Number(it.moq))} ${subAbbr(it.units)}` : `${rnd(steps * st)} ${unitLabel(it.units)}`;
};

export function LoginDialog({ open, onOpenChange, tl, onLogin, reason }) {
  const [f, setF] = useState({ email: "", password: "", error: "", busy: false });
  const submit = async e => {
    e?.preventDefault();
    setF(x => ({ ...x, busy: true, error: "" }));
    try {
      const { token, user } = await api.login(f.email.trim(), f.password);
      localStorage.setItem("token", token);
      onLogin?.(user);
      onOpenChange(false);
      setF({ email: "", password: "", error: "", busy: false });
    } catch (err) { setF(x => ({ ...x, busy: false, error: err.message })); }
  };
  return (
    <CDialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-sm">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>{tl("Log in")}</DialogTitle>
            <DialogDescription>{reason || tl("Log in to place your order")}</DialogDescription>
          </DialogHeader>
          <DialogPanel className="flex flex-col gap-4">
            {f.error && <Alert variant="error"><AlertDescription>{f.error}</AlertDescription></Alert>}
            <Field>
              <FieldLabel>{tl("Email")}</FieldLabel>
              <CInput type="email" autoComplete="email" value={f.email} onChange={e => setF(x => ({ ...x, email: e.target.value }))}/>
            </Field>
            <Field>
              <FieldLabel>{tl("Password")}</FieldLabel>
              <CInput type="password" autoComplete="current-password" value={f.password} onChange={e => setF(x => ({ ...x, password: e.target.value }))}/>
            </Field>
            <p className="text-muted-foreground text-xs">{tl("No account yet?")} <a className="font-medium text-brand underline-offset-2 hover:underline" href="/#signup">{tl("Sign up")}</a></p>
          </DialogPanel>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>{tl("Back")}</Button>
            <Button type="submit" loading={f.busy} disabled={!f.email.trim() || !f.password}>{tl("Log in")}</Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </CDialog>
  );
}

// Where each part of a line comes from, e.g. "4 now · 2 at 14:30 · 1 made to order"
function PartsLine({ line, item, tl }) {
  if (!line?.parts?.length) return null;
  return (
    <span className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
      {line.parts.map((p, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {p.kind === "stock" ? <PackageCheckIcon className="size-3 text-success-foreground"/> : p.kind === "batch" ? <ClockIcon className="size-3 text-info-foreground"/> : <ChefHatIcon className="size-3"/>}
          {fmtSteps(item, p.steps)} {p.kind === "stock" ? tl("in stock") : p.kind === "batch" ? `${tl("ready ~")}${fmtLocalTime(p.eta)}` : tl("made to order")}
        </span>
      ))}
    </span>
  );
}

export default function CartPanel({ user, tl, toast, onLogin, onMyOrders, onOpenItem, emptyHint }) {
  const { lines: lineMap, quote } = useCart();
  const lines = Object.values(lineMap);
  const [step, setStep] = useState("cart");        // cart | details
  const [placed, setPlaced] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [fulfillment, setFulfillment] = useState("pickup");
  const [saved, setSaved] = useState([]);
  const [addrSel, setAddrSel] = useState("-1");
  const [address, setAddress] = useState("");
  const [comments, setComments] = useState("");
  const [guest, setGuest] = useState(() => { try { return JSON.parse(localStorage.getItem("tanelu_guest") || "null") || { name: "", email: "", phone: "+374 " }; } catch { return { name: "", email: "", phone: "+374 " }; } });
  const [loginOpen, setLoginOpen] = useState(false);
  const [badRid, setBadRid] = useState(null);

  // Ask the server how the basket splits whenever it changes (debounced), and once a minute
  const key = JSON.stringify(lines.map(l => [l.rid, l.steps, l.mid]));
  useEffect(() => {
    if (!lines.length) { cart.refreshQuote().catch(() => {}); return; }
    const t = setTimeout(() => cart.refreshQuote().catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [key]);
  useEffect(() => { const t = setInterval(() => { if (Object.keys(cart.get().lines).length) cart.refreshQuote().catch(() => {}); }, 60000); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (!user) { setSaved([]); return; }
    api.getSavedAddresses().then(a => { setSaved(a || []); if (a?.length) setAddrSel("0"); }).catch(() => setSaved([]));
  }, [user?.uid]);

  const qLine = rid => quote?.lines?.find(l => l.rid === rid);
  const groups = useMemo(() => {
    const m = new Map();
    lines.forEach(l => {
      const k = l.item?.seller_uid ?? qLine(l.rid)?.seller_uid ?? "?";
      if (!m.has(k)) m.set(k, { name: l.item?.seller_name || qLine(l.rid)?.seller_name || "", lines: [] });
      m.get(k).lines.push(l);
    });
    return [...m.values()];
  }, [lineMap, quote]);
  const lineTotal = l => l.steps * stepUnits(l.item) * Number(l.item.price || 0);
  const currency = lines[0]?.item?.currency || "AMD";
  const itemsTotal = lines.reduce((s, l) => s + lineTotal(l), 0);
  const menuFees = fulfillment === "delivery" ? (quote?.orders || []).filter(o => o.delivery_fee > 0) : [];
  const total = itemsTotal + menuFees.reduce((s, o) => s + o.delivery_fee, 0);
  const pickupOnly = lines.some(l => l.item?.deliverable === false);
  const hasMenuLines = lines.some(l => l.mid);
  const separate = (quote?.orders?.length || 0) > 1;
  const short = (quote?.lines || []).filter(l => !l.ok && lineMap[l.rid]);
  useEffect(() => { if (pickupOnly && fulfillment === "delivery") setFulfillment("pickup"); }, [pickupOnly]);
  useEffect(() => { if (!lines.length && step !== "cart") setStep("cart"); }, [lines.length]);

  const bump = (l, d) => {
    const max = l.mid ? 9999 : (qLine(l.rid)?.max_steps ?? Infinity);
    cart.setSteps(l.item, Math.min(max, l.steps + d), { mid: l.mid });
  };
  const resolvedAddress = () => fulfillment !== "delivery" ? null
    : (user && addrSel !== "-1" && saved[Number(addrSel)] ? saved[Number(addrSel)].display : address.trim());

  const place = async () => {
    if (fulfillment === "delivery" && !resolvedAddress()) { toast(tl("Please enter a delivery address"), "error"); return; }
    if (!user && (!guest.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email.trim()))) { toast(tl("Name and email required"), "error"); return; }
    setPlacing(true); setBadRid(null);
    try {
      if (!user) { try { localStorage.setItem("tanelu_guest", JSON.stringify(guest)); } catch {} }
      const res = await api.checkout({
        items: lines.map(l => ({ rid: l.rid, steps: l.steps, mid: l.mid || undefined })),
        fulfillment, delivery_address: resolvedAddress(), delivery_comments: comments.trim() || null,
        guest: user ? undefined : { name: guest.name.trim(), email: guest.email.trim(), phone: guest.phone.trim() },
      });
      setPlaced({ orders: res.orders || [], currency });
      cart.clear(); setStep("cart"); setComments("");
    } catch (e) {
      toast(e.message, "error");
      if (e.data?.rid) { setBadRid(e.data.rid); setStep("cart"); }
      cart.refreshQuote().catch(() => {});
    } finally { setPlacing(false); }
  };

  const loginDialog = <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} tl={tl} onLogin={onLogin}/>;

  if (placed) {
    return (
      <div className="flex flex-col gap-3">
        <Alert variant="success"><CheckIcon/>
          <AlertTitle>{placed.orders.length > 1 ? `${placed.orders.length} ${tl("orders placed")}` : tl("Order placed!")}</AlertTitle>
          <AlertDescription>{user ? tl("Track them in My orders.") : tl("We sent the details to your email.")}</AlertDescription>
        </Alert>
        {placed.orders.map(o => (
          <div key={o.oid} data-slot="placed-order" className="flex flex-col gap-1 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate"><b>#{o.oid}</b> · {o.seller_name || o.menu_name}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{money((o.items || []).reduce((s, i) => s + i.qty * i.price, 0) + (o.delivery_fee || 0), placed.currency)}</span>
            </div>
            <span className="text-muted-foreground text-xs">
              {o.kind === "batch" ? <><ClockIcon className="me-1 inline size-3"/>{tl("From a batch, ready ~")}{fmtLocalTime(o.eta)}</> : o.menu_name ? `${tl("Menu")}: ${o.menu_name}` : tl("From stock")}
              {" · "}{(o.items || []).map(i => i.name).join(", ")}
            </span>
          </div>
        ))}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setPlaced(null)}>{tl("New order")}</Button>
          {user && onMyOrders && <Button className="flex-1" onClick={onMyOrders}><ReceiptTextIcon/>{tl("My orders")}</Button>}
        </div>
      </div>
    );
  }

  if (!lines.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <ShoppingBasketIcon className="size-8 text-muted-foreground/50"/>
        <p className="font-medium text-sm">{tl("Your basket is empty.")}</p>
        {emptyHint && <p className="text-muted-foreground text-xs">{emptyHint}</p>}
      </div>
    );
  }

  const summary = (
    <div className="flex flex-col gap-1 text-sm">
      {menuFees.map(o => (
        <div key={o.key} className="flex justify-between gap-2 text-muted-foreground">
          <span className="truncate">{tl("Delivery fee")} · {o.menu_name}</span><span className="tabular-nums">{money(o.delivery_fee, currency)}</span>
        </div>
      ))}
      <div className="flex items-baseline justify-between font-semibold">
        <span>{tl("Total")}</span><span className="text-brand tabular-nums">{money(total, currency)}</span>
      </div>
    </div>
  );

  if (step === "cart") return (
    <div className="flex flex-col">
      {separate && (
        <Alert variant="info" className="mb-3"><InfoIcon/><AlertDescription>{tl("Some items may be delivered individually as separate orders.")}</AlertDescription></Alert>
      )}
      {groups.map(g => (
        <div key={g.name} className="flex flex-col">
          <p className="flex items-center gap-1.5 pt-1 pb-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wide"><StoreIcon className="size-3.5"/>{g.name}</p>
          {g.lines.map(l => {
            const it = l.item, q = qLine(l.rid), max = l.mid ? 9999 : q?.max_steps;
            const isShort = q && !q.ok, bad = badRid === l.rid;
            return (
              <div key={l.rid} data-slot="cart-line" className={`flex flex-col gap-1 border-b py-2.5 last:border-b-0 ${bad || isShort ? "-mx-2 rounded-md bg-destructive/8 px-2" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  {(() => {
                    const body = <>
                      <p className="truncate font-semibold text-sm">{it.name}</p>
                      <p className="text-muted-foreground text-xs tabular-nums">{money(lineTotal(l), it.currency)}{l.mid ? <span> · {tl("menu")}</span> : null}</p>
                    </>;
                    return onOpenItem
                      ? <button type="button" className="min-w-0 rounded-sm border-0 bg-transparent p-0 text-start hover:[&>p:first-child]:underline" onClick={() => onOpenItem(l.rid)}>{body}</button>
                      : <div className="min-w-0">{body}</div>;
                  })()}
                  <div className="inline-flex shrink-0 items-center gap-1">
                    <Button variant="outline" size="icon-xs" aria-label={`Remove one ${it.name}`} onClick={() => bump(l, -1)}><MinusIcon/></Button>
                    <span className="min-w-14 text-center font-semibold text-sm tabular-nums">{fmtSteps(it, l.steps)}</span>
                    <Button variant="outline" size="icon-xs" aria-label={`Add one ${it.name}`} disabled={max != null && l.steps >= max} onClick={() => bump(l, 1)}><PlusIcon/></Button>
                  </div>
                </div>
                <PartsLine line={q} item={it} tl={tl}/>
                {isShort && (
                  <span className="flex items-center justify-between gap-2 text-destructive-foreground text-xs">
                    <span className="flex items-center gap-1"><TriangleAlertIcon className="size-3.5"/>{q.max_steps ? tl("Only {n} available").replace("{n}", fmtSteps(it, q.max_steps)) : tl("Sold out")}</span>
                    <Button variant="ghost" size="xs" onClick={() => q.max_steps ? cart.setSteps(it, q.max_steps, { mid: l.mid }) : cart.remove(l.rid)}>{q.max_steps ? tl("Use") + " " + fmtSteps(it, q.max_steps) : tl("Remove")}</Button>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}
      <div className="pt-3 pb-4">{summary}</div>
      <div className="flex gap-2">
        <Button variant="ghost" size="icon" aria-label={tl("Clear")} title={tl("Clear")} onClick={() => cart.clear()}><TrashIcon/></Button>
        <Button className="flex-1" disabled={short.length > 0} onClick={() => setStep("details")}>{tl("Checkout")}<ArrowRightIcon/></Button>
      </div>
      {loginDialog}
    </div>
  );

  // details
  const needsLogin = !user && hasMenuLines;
  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={e => { e.preventDefault(); place(); }}>
      {needsLogin ? (
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">{tl("Your basket has items from a restaurant menu. Please log in to order them.")}</p>
          <Button onClick={() => setLoginOpen(true)}><LogInIcon/>{tl("Log in")}</Button>
          <p className="text-center text-muted-foreground text-xs">{tl("No account yet?")} <a className="font-medium text-brand underline-offset-2 hover:underline" href="/#signup">{tl("Sign up")}</a></p>
          <Button variant="ghost" onClick={() => setStep("cart")}><ArrowLeftIcon/>{tl("Back")}</Button>
          {loginDialog}
        </div>
      ) : (<>
        {!user && (
          <div className="flex flex-col gap-3">
            <p className="text-muted-foreground text-xs">
              {tl("Have an account?")} <button type="button" className="font-medium text-brand underline-offset-2 hover:underline" onClick={() => setLoginOpen(true)}>{tl("Log in")}</button>
            </p>
            <Field>
              <FieldLabel>{tl("Name")} <span className="text-destructive-foreground">*</span></FieldLabel>
              <CInput autoComplete="name" value={guest.name} onChange={e => setGuest(g => ({ ...g, name: e.target.value }))}/>
            </Field>
            <Field>
              <FieldLabel>{tl("Email")} <span className="text-destructive-foreground">*</span></FieldLabel>
              <CInput type="email" autoComplete="email" value={guest.email} onChange={e => setGuest(g => ({ ...g, email: e.target.value }))}
                onBlur={e => { const em = e.target.value.trim(); if (!guest.name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em))
                  api.lookupGuestByEmail(em).then(f => { if (f?.name) setGuest(g => g.name.trim() ? g : { ...g, name: f.name }); }).catch(() => {}); }}/>
            </Field>
            <Field>
              <FieldLabel>{tl("Phone")}</FieldLabel>
              <CInput type="tel" autoComplete="tel" value={guest.phone} onChange={e => setGuest(g => ({ ...g, phone: e.target.value }))}/>
            </Field>
            <Separator/>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <RadioGroup value={fulfillment} onValueChange={setFulfillment} className="flex flex-row gap-5">
            <Label className="cursor-pointer"><Radio value="pickup"/><StoreIcon className="size-4 text-muted-foreground"/>{tl("Pickup")}</Label>
            <Label className={pickupOnly ? "cursor-not-allowed opacity-60" : "cursor-pointer"}><Radio value="delivery" disabled={pickupOnly}/><TruckIcon className="size-4 text-muted-foreground"/>{tl("Delivery")}</Label>
          </RadioGroup>
          {pickupOnly && <p className="text-muted-foreground text-xs">{tl("Some items can only be picked up.")}</p>}
        </div>
        {fulfillment === "delivery" && (user && saved.length ? (
          <RadioGroup value={addrSel} onValueChange={setAddrSel} className="gap-2">
            {saved.map((a, i) => (
              <Label key={i} className="cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 font-normal has-data-checked:border-brand/60 has-data-checked:bg-accent/50">
                <Radio value={String(i)} className="mt-0.5"/>
                <span className="flex flex-col gap-0.5">
                  {a.label && <span className="font-semibold text-muted-foreground text-xs">{a.label}</span>}
                  <span className="text-sm leading-snug">{a.display}</span>
                </span>
              </Label>
            ))}
            <Label className="cursor-pointer gap-2.5 px-3 py-1 font-normal"><Radio value="-1"/>{tl("Other address")}</Label>
            {addrSel === "-1" && <CInput aria-label={tl("Delivery address")} autoComplete="street-address" value={address} onChange={e => setAddress(e.target.value)}/>}
          </RadioGroup>
        ) : (
          <Field>
            <FieldLabel>{tl("Delivery address")} <span className="text-destructive-foreground">*</span></FieldLabel>
            <CInput autoComplete="street-address" value={address} onChange={e => setAddress(e.target.value)}/>
          </Field>
        ))}
        <Field>
          <FieldLabel>{tl("Comments for the restaurant")}</FieldLabel>
          <Textarea rows={2} value={comments} onChange={e => setComments(e.target.value)}/>
        </Field>
        <Separator/>
        {separate && <p className="flex items-start gap-1.5 text-muted-foreground text-xs"><InfoIcon className="mt-px size-3.5 shrink-0"/>{tl("Some items may be delivered individually as separate orders.")}</p>}
        <div className="flex flex-col gap-1 text-sm">
          {groups.map(g => (
            <div key={g.name} className="flex justify-between gap-2 text-muted-foreground">
              <span className="truncate">{g.name}</span>
              <span className="tabular-nums">{money(g.lines.reduce((s, l) => s + lineTotal(l), 0), currency)}</span>
            </div>
          ))}
        </div>
        {summary}
        <div className="flex gap-2">
          <Button variant="outline" size="icon" aria-label={tl("Back")} onClick={() => setStep("cart")}><ArrowLeftIcon/></Button>
          <Button type="submit" className="flex-1" loading={placing}>{tl("Place order")}</Button>
        </div>
        {loginDialog}
      </>)}
    </form>
  );
}
