// Board of Arrivals (/order) — public ordering page, built with coss ui (https://coss.com/ui).
// Loaded lazily from App.jsx so the Base UI select/combobox code only ships to visitors of this page.
import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../api.js";
import { RU, conv, subAbbr, unitAbbr, fmtLocalTime } from "../App.jsx";
import { Button } from "@/components/ui/button";
import { Input as CInput } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Card, CardHeader, CardTitle, CardPanel } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge as CBadge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Radio, RadioGroup } from "@/components/ui/radio-group";
import { Select as CSelect, SelectTrigger, SelectValue, SelectPopup, SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Spinner as CSpinner } from "@/components/ui/spinner";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { Combobox, ComboboxChips, ComboboxChip, ComboboxChipsInput, ComboboxValue, ComboboxPopup, ComboboxList, ComboboxItem, ComboboxEmpty } from "@/components/ui/combobox";
import { ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, ChevronsUpDownIcon, GlobeIcon, MapPinIcon, MinusIcon, PackageOpenIcon, PlusIcon, RefreshCwIcon, ShoppingBasketIcon, TriangleAlertIcon } from "lucide-react";

export default function BoardOfArrivals({ toast }) {
  const [arrivals, setArrivals] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [cart,     setCart]     = useState({}); // rid+prid key → {rid,prid,qty,owner_uid,item}
  const [checkout, setCheckout] = useState(false);
  const [guest,    setGuest]    = useState({ name:'', email:'', phone:'+374 ' });
  const lookupGuest = async (email) => {
    const em = (email||'').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return;
    try {
      const f = await api.lookupGuestByEmail(em);
      if (!f) return;
      setGuest(g => g.email.trim()!==em ? g : {
        ...g,
        name:  g.name.trim()  ? g.name  : (f.name||''),
      });
    } catch(e){ /* lookup is best-effort */ }
  };
  const [fulfillment, setFulfillment] = useState('pickup');
  const [deliveryAddr, setDeliveryAddr] = useState('');
  const [placing,  setPlacing]  = useState(false);
  const [orderResult, setOrderResult] = useState(null); // null | {results}
  const [sortKey,  setSortKey]  = useState('item_name');
  const [sortDir,  setSortDir]  = useState('asc');
  const [page,     setPage]     = useState(1);
  const [filterItems,   setFilterItems]   = useState([]);
  const [filterSellers, setFilterSellers] = useState([]);
  const [readyOnly,     setReadyOnly]     = useState(false);
  const [distanceKm,    setDistanceKm]    = useState(null); // null = all
  const [userLat,       setUserLat]       = useState(null);
  const [userLng,       setUserLng]       = useState(null);
  const [geoStatus,     setGeoStatus]     = useState('idle'); // idle|loading|granted|denied

  // Language support for Board of Arrivals — reads from localStorage
  const [boaLang, setBoaLang] = useState(()=>localStorage.getItem('lang')||'en');
  const BOA_RU = RU; // reuse same dictionary
  const boaTl = k => boaLang==='ru' ? (BOA_RU[k]||k) : k;

  const PER_PAGE = 20;

  const RECENT_KEY = 'boa_recent_items';
  const getRecent = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY)||'[]'); } catch{ return []; } };
  const pushRecent = name => {
    const prev = getRecent().filter(x=>x!==name);
    localStorage.setItem(RECENT_KEY, JSON.stringify([name,...prev].slice(0,10)));
  };

  const load = useCallback(async()=>{
    setLoading(true);
    try {
      const rows = await api.getArrivals();
      setArrivals(rows);
      return rows;
    }
    catch(e){ toast(e.message,"error"); }
    finally{ setLoading(false); }
  },[]);

  useEffect(()=>{
    // Count the visit once (not the 60 s refresh) for the BoA funnel in Reports
    load().then(rows=>{
      const uids=[...new Set((rows||[]).map(r=>r.owner_uid).filter(Boolean))];
      if(uids.length) api.recordArrivalsView(uids).catch(()=>{});
    });
    const t=setInterval(load,60000);
    return()=>clearInterval(t);
  },[]);

  // Request geolocation on mount
  useEffect(()=>{
    if (!navigator.geolocation) { setGeoStatus('denied'); return; }
    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      pos=>{ setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); setGeoStatus('granted'); },
      ()=>setGeoStatus('denied'),
      { timeout:8000 }
    );
  },[]);

  // Haversine distance in km
  const haversine = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2-lat1)*Math.PI/180;
    const dLng = (lng2-lng1)*Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  // Sellers within distance
  const nearbySellerSet = useMemo(()=>{
    if (!distanceKm || !userLat || !userLng) return null; // null = no filter
    const set = new Set();
    arrivals.forEach(a=>{
      if (a.owner_lat && a.owner_lng) {
        const d = haversine(userLat, userLng, a.owner_lat, a.owner_lng);
        if (d <= distanceKm) set.add(a.sold_by);
      }
    });
    return set;
  },[arrivals, distanceKm, userLat, userLng]);

  // Unique filter options — restricted by distance if active
  const allItemNames  = [...new Set(arrivals
    .filter(a=>!nearbySellerSet || nearbySellerSet.has(a.sold_by))
    .map(a=>a.item_name))].sort();
  const allSellers    = [...new Set(arrivals
    .filter(a=>!nearbySellerSet || nearbySellerSet.has(a.sold_by))
    .map(a=>a.sold_by))].sort();

  // Apply filters
  let filtered = arrivals.filter(a=>{
    if ((a.remaining_qty ?? a.run_qty ?? 0) <= 0) return false; // hide sold-out items
    if (nearbySellerSet && !nearbySellerSet.has(a.sold_by)) return false;
    if (filterItems.length   && !filterItems.includes(a.item_name)) return false;
    if (filterSellers.length && !filterSellers.includes(a.sold_by)) return false;
    if (readyOnly && a.run_status!=='completed') return false;
    return true;
  });

  // Sort
  filtered = [...filtered].sort((a,b)=>{
    let va = a[sortKey]??'', vb = b[sortKey]??'';
    if (typeof va==='number') return sortDir==='asc'?va-vb:vb-va;
    return sortDir==='asc'?String(va).localeCompare(String(vb)):String(vb).localeCompare(String(va));
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length/PER_PAGE));
  const pageRows   = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const toggleSort = key => {
    if (sortKey===key) setSortDir(d=>d==='asc'?'desc':'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const cartKey = (a) => `${a.prid}-${a.rid}`;

  // Items sold in sub-unit steps (e.g. 250 g of an item counted in kg): one click = one MOQ step.
  const stepOf = a => (a.allow_submultiples && Number(a.moq)>0) ? Number(a.moq)/conv(a.units) : 1;
  const rnd = n => Math.round(n*1000)/1000;
  const maxOf = a => { const st=stepOf(a); const m=a.remaining_qty ?? a.run_qty ?? 999; return rnd(Math.floor(m/st+1e-9)*st); };
  const fmtQ = (a,q) => stepOf(a)<1 ? `${rnd(q*conv(a.units))} ${subAbbr(a.units)}` : `${rnd(q)}`;
  const setQty = (arrival, delta) => setCart(p=>{
    const key = cartKey(arrival);
    const cur = p[key]?.qty || 0;
    const max = maxOf(arrival);
    const next = rnd(Math.max(0, Math.min(max, cur + delta*stepOf(arrival))));
    if (next === 0) {
      const { [key]: _, ...rest } = p;
      return rest;
    }
    return { ...p, [key]: { rid:arrival.rid, prid:arrival.prid, qty:next, owner_uid:arrival.owner_uid, item:arrival } };
  });

  // Freshness colour: white→amber→red over 60 minutes
  const freshnessColor = f => {
    if (f<=0) return 'transparent';
    const r = Math.round(255);
    const g = Math.round(255*(1-f));
    const b = Math.round(255*(1-f));
    return `rgba(${r},${g},${b},${Math.min(0.35, f*0.5)})`;
  };

  const cartEntries = Object.values(cart);
  const cartTotal = cartEntries.reduce((sum, entry) => sum + (entry.item?.price||0) * entry.qty, 0);  // price is per unit, qty in units
  const cartCurrency = cartEntries[0]?.item?.currency || 'AMD';

  const recentItems = getRecent();

  const SortHead = ({label, k, className=""}) => (
    <TableHead className={className} aria-sort={sortKey===k?(sortDir==='asc'?'ascending':'descending'):undefined}>
      <button type="button" onClick={()=>toggleSort(k)}
        className="-mx-1 inline-flex items-center gap-1 rounded-sm px-1 font-medium text-muted-foreground uppercase tracking-wide text-[11px] hover:text-foreground">
        {label}
        {sortKey===k ? (sortDir==='asc'?<ArrowUpIcon className="size-3"/>:<ArrowDownIcon className="size-3"/>) : <ChevronsUpDownIcon className="size-3 opacity-40"/>}
      </button>
    </TableHead>
  );
  const PlainHead = ({label, className=""}) => (
    <TableHead className={`font-medium text-[11px] text-muted-foreground uppercase tracking-wide ${className}`}>{label}</TableHead>
  );
  const Stepper = ({a, qty, size="xs"}) => {
    const atMax = qty >= maxOf(a) - 1e-9;
    return (
      <div className="inline-flex items-center gap-1">
        <Button variant="outline" size={size==="xs"?"icon-xs":"icon-sm"} aria-label={`Remove one ${a.item_name}`} disabled={qty===0} onClick={()=>setQty(a,-1)}><MinusIcon/></Button>
        <span className="min-w-12 text-center font-semibold tabular-nums text-sm">{qty>0||stepOf(a)>=1?fmtQ(a,qty):`0 ${subAbbr(a.units)}`}</span>
        <Button variant="outline" size={size==="xs"?"icon-xs":"icon-sm"} aria-label={`Add one ${a.item_name}`} disabled={atMax} onClick={()=>setQty(a,1)}><PlusIcon/></Button>
      </div>
    );
  };
  const placeOrder = async()=>{
    if (!guest.name.trim()||!guest.email.trim()) { toast("Name and email required","error"); return; }
    setPlacing(true);
    try {
      const items = cartEntries.map(e=>({
        prid:e.prid, rid:e.rid, qty:e.qty, owner_uid:e.item.owner_uid,
        ...(stepOf(e.item)<1 ? {steps:Math.round(e.qty/stepOf(e.item))} : {})
      }));
      const result = await api.placeArrivalOrder({
        items, guest_name:guest.name, guest_email:guest.email,
        guest_phone:guest.phone, fulfillment,
        delivery_address:fulfillment==='delivery'?deliveryAddr:null
      });
      setOrderResult(result);
      toast("Order placed!");
    } catch(e){ toast(e.message,"error"); }
    finally{ setPlacing(false); }
  };
  const distanceItems = [{label:boaTl("All"), value:"all"}, ...[1,5,10,20,30,40,50].map(d=>({label:`${d} km`, value:String(d)}))];
  const labelCls = "font-medium text-[11px] text-muted-foreground uppercase tracking-wide";

  return (
    <div className="coss min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-card/85 backdrop-blur supports-[backdrop-filter]:bg-card/70">
        <div className="mx-auto flex h-14 max-w-[1300px] items-center gap-3 px-4 sm:px-6">
          <span className="flex items-center gap-1.5" aria-label="tanelu">
            <svg width="10" height="14" viewBox="0 0 12 16" fill="none" className="mb-px" aria-hidden="true">
              <rect x="0.5" y="0.5" width="11" height="4" fill="var(--brand)"/>
              <circle cx="6" cy="11" r="4" fill="var(--brand)"/>
            </svg>
            <span className="font-semibold text-brand text-xl leading-none tracking-tight" style={{fontFamily:"Georgia, serif"}}>tanelu</span>
          </span>
          <Separator orientation="vertical" className="h-5"/>
          <h1 className="truncate text-muted-foreground text-sm">{boaTl("Board of Arrivals")}</h1>
          <div className="ms-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load}><RefreshCwIcon/><span className="max-sm:hidden">{boaTl("Refresh")}</span></Button>
            <Button variant="ghost" size="sm" onClick={()=>{ const nl=boaLang==='en'?'ru':'en'; setBoaLang(nl); localStorage.setItem('lang',nl); }}>
              <GlobeIcon/>{boaLang==='en'?'RU':'EN'}
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1300px] gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main */}
        <main className="flex min-w-0 flex-col gap-4">
          {/* Filters */}
          <Card>
            <CardPanel className="grid items-end gap-4 p-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_auto_auto]">
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className={labelCls}>{boaTl("Item name")}</span>
                <Combobox items={allItemNames} multiple value={filterItems}
                  onValueChange={v=>{ const next=v||[]; next.filter(n=>!filterItems.includes(n)).forEach(pushRecent); setFilterItems(next); setPage(1); }}>
                  <ComboboxChips>
                    <ComboboxValue>
                      {(value)=>(<>
                        {value?.map(n=>(<ComboboxChip key={n} aria-label={n}>{n}</ComboboxChip>))}
                        <ComboboxChipsInput aria-label={boaTl("Item name")} placeholder={value?.length?undefined:boaTl("Search items…")}/>
                      </>)}
                    </ComboboxValue>
                  </ComboboxChips>
                  <ComboboxPopup>
                    <ComboboxEmpty>{boaTl("No items found.")}</ComboboxEmpty>
                    <ComboboxList>
                      {(n)=>(
                        <ComboboxItem key={n} value={n}>
                          <span className="flex w-full items-center justify-between gap-2">{n}{recentItems.includes(n)&&<span className="text-muted-foreground text-xs">{boaTl("recent")}</span>}</span>
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxPopup>
                </Combobox>
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className={labelCls}>{boaTl("Sold by")}</span>
                <Combobox items={allSellers} multiple value={filterSellers} onValueChange={v=>{ setFilterSellers(v||[]); setPage(1); }}>
                  <ComboboxChips>
                    <ComboboxValue>
                      {(value)=>(<>
                        {value?.map(n=>(<ComboboxChip key={n} aria-label={n}>{n}</ComboboxChip>))}
                        <ComboboxChipsInput aria-label={boaTl("Sold by")} placeholder={value?.length?undefined:boaTl("All restaurants")}/>
                      </>)}
                    </ComboboxValue>
                  </ComboboxChips>
                  <ComboboxPopup>
                    <ComboboxEmpty>{boaTl("No restaurants found.")}</ComboboxEmpty>
                    <ComboboxList>{(n)=>(<ComboboxItem key={n} value={n}>{n}</ComboboxItem>)}</ComboboxList>
                  </ComboboxPopup>
                </Combobox>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className={`${labelCls} flex items-center gap-1.5`}>
                  {boaTl("Distance within")}
                  {geoStatus==='loading'&&<CSpinner className="size-3"/>}
                  {geoStatus==='granted'&&<MapPinIcon className="size-3 text-success-foreground" aria-label="Location found"/>}
                  {geoStatus==='denied'&&<span className="normal-case tracking-normal text-destructive-foreground">· {boaTl("Location denied")}</span>}
                </span>
                <CSelect items={distanceItems} value={distanceKm?String(distanceKm):"all"} disabled={geoStatus==='denied'}
                  onValueChange={v=>{ setDistanceKm(v&&v!=="all"?Number(v):null); setPage(1); }}>
                  <SelectTrigger className="min-w-32" aria-label={boaTl("Distance within")}><SelectValue/></SelectTrigger>
                  <SelectPopup>{distanceItems.map(d=>(<SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>))}</SelectPopup>
                </CSelect>
              </div>
              <Label className="h-9 cursor-pointer whitespace-nowrap sm:h-8">
                <Checkbox checked={readyOnly} onCheckedChange={v=>{ setReadyOnly(!!v); setPage(1); }}/>
                {boaTl("Display only ready items")}
              </Label>
            </CardPanel>
          </Card>

          {loading ? (
            <div className="flex justify-center py-16"><CSpinner className="size-6 text-muted-foreground"/></div>
          ) : pageRows.length===0 ? (
            <Card>
              <CardPanel className="flex flex-col items-center gap-2 py-14 text-center">
                <PackageOpenIcon className="size-8 text-muted-foreground/60"/>
                <p className="text-muted-foreground text-sm">{boaTl("No items currently in production or recently completed.")}</p>
              </CardPanel>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <SortHead label={boaTl("Item name")} k="item_name" className="ps-4"/>
                    <SortHead label={boaTl("Sold by")} k="sold_by"/>
                    <SortHead label={boaTl("Unit price")} k="price"/>
                    <SortHead label={boaTl("ETA pickup")} k="eta_pickup"/>
                    <SortHead label={boaTl("ETA delivery")} k="eta_delivery"/>
                    <PlainHead label={boaTl("Qty")}/>
                    <SortHead label={boaTl("Units")} k="units"/>
                    <PlainHead label={boaTl("Cost")} className="pe-4 text-right"/>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map(a=>{
                    const qty = cart[cartKey(a)]?.qty || 0;
                    const remaining = a.remaining_qty ?? a.run_qty ?? 0;
                    const isReady = a.run_status==='completed';
                    return (
                      <TableRow key={`${a.rid}-${a.prid}`} style={{background:freshnessColor(a.freshness)||undefined, transition:"background 0.5s"}}>
                        <TableCell className="ps-4">
                          <div className="font-semibold text-foreground">{a.item_name}</div>
                          {remaining < (a.run_qty||0) && <div className="text-warning-foreground text-xs">{fmtQ(a,remaining)} {boaTl("left")}</div>}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{a.sold_by}</TableCell>
                        <TableCell className="tabular-nums whitespace-nowrap">{a.price} {a.currency}</TableCell>
                        <TableCell className="tabular-nums whitespace-nowrap">
                          {isReady
                            ? <CBadge variant="success"><CheckIcon/>{boaTl("Ready")}</CBadge>
                            : <span className={a.mins_left<15?"font-medium text-destructive-foreground":""}>{fmtLocalTime(a.eta_pickup)}</span>}
                        </TableCell>
                        <TableCell className="tabular-nums whitespace-nowrap text-muted-foreground">{fmtLocalTime(a.eta_delivery)}</TableCell>
                        <TableCell>
                          <Stepper a={a} qty={qty}/>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{unitAbbr(a.units)}</TableCell>
                        <TableCell className={`pe-4 text-right tabular-nums whitespace-nowrap ${qty>0?"font-semibold text-brand":"text-muted-foreground"}`}>
                          {qty>0 ? `${(a.price*qty).toLocaleString()} ${a.currency}` : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}

          {!loading && totalPages>1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <Button variant="ghost" size="sm" disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))}><ChevronLeftIcon/><span className="max-sm:hidden">{boaTl("Previous")}</span></Button>
                </PaginationItem>
                {Array.from({length:totalPages},(_,i)=>i+1).map(p=>(
                  <PaginationItem key={p}>
                    <Button variant={page===p?"outline":"ghost"} size="icon-sm" aria-current={page===p?"page":undefined} onClick={()=>setPage(p)}>{p}</Button>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <Button variant="ghost" size="sm" disabled={page===totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}><span className="max-sm:hidden">{boaTl("Next")}</span><ChevronRightIcon/></Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </main>

        {/* Cart */}
        <aside>
          <Card className="xl:sticky xl:top-20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingBasketIcon className="size-4.5 text-brand"/>{boaTl("Your selection")}
                {cartEntries.length>0&&!orderResult&&<CBadge variant="secondary" className="ms-auto">{cartEntries.length}</CBadge>}
              </CardTitle>
            </CardHeader>
            <CardPanel className="pt-0">
              {cartEntries.length===0 ? (
                <p className="text-muted-foreground text-sm">{boaTl("Add items using the + buttons.")}</p>
              ) : orderResult ? (
                <div className="flex flex-col gap-3">
                  <Alert variant="success"><CheckIcon/><AlertTitle>{boaTl("Order placed!")}</AlertTitle></Alert>
                  {orderResult.results.map((r,i)=>{
                    const item = arrivals.find(x=>x.rid===r.rid&&x.prid===r.prid);
                    return (
                      <div key={i} className="rounded-lg border bg-muted p-3">
                        <p className="mb-1 font-semibold text-sm">{item?.item_name}</p>
                        {r.qty_confirmed>0&&<p className="text-success-foreground text-xs">✓ {r.qty_confirmed} {boaTl("confirmed")} (#{r.oid})</p>}
                        {r.qty_waiting>0&&<p className="text-warning-foreground text-xs">⏳ {r.qty_waiting} {boaTl("on waitlist — next run")}</p>}
                      </div>
                    );
                  })}
                  <Button variant="outline" className="w-full" onClick={()=>{ setCart({}); setOrderResult(null); setCheckout(false); }}>{boaTl("New order")}</Button>
                </div>
              ) : !checkout ? (
                <div className="flex flex-col">
                  {cartEntries.map(entry=>{
                    const a = entry.item;
                    return (
                      <div key={`${entry.prid}-${entry.rid}`} className="flex items-center justify-between gap-3 border-b py-3 first:pt-0">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-sm">{a.item_name}</p>
                          <p className="text-muted-foreground text-xs">{fmtQ(a,entry.qty)} × {a.price} {a.currency}/{unitAbbr(a.units)}</p>
                          {entry.qty >= maxOf(a)-1e-9 && <p className="text-warning-foreground text-xs">{boaTl("Max available")}</p>}
                        </div>
                        <Stepper a={a} qty={entry.qty}/>
                      </div>
                    );
                  })}
                  <div className="flex items-baseline justify-between pt-3 pb-4 font-semibold">
                    <span className="text-sm">{boaTl("Total")}</span>
                    <span className="text-brand tabular-nums">{cartTotal.toLocaleString()} {cartCurrency}</span>
                  </div>
                  <Button className="w-full" onClick={()=>setCheckout(true)}>{boaTl("Checkout")}<ArrowRightIcon/></Button>
                </div>
              ) : (
                <form className="flex flex-col gap-4" onSubmit={e=>{ e.preventDefault(); placeOrder(); }} noValidate>
                  <Field>
                    <FieldLabel>Email <span className="text-destructive-foreground">*</span></FieldLabel>
                    <CInput type="email" autoComplete="email" placeholder="your@email.com" value={guest.email}
                      onChange={e=>setGuest(g=>({...g,email:e.target.value}))} onBlur={e=>lookupGuest(e.target.value)}/>
                  </Field>
                  <Field>
                    <FieldLabel>{boaTl("Name")} <span className="text-destructive-foreground">*</span></FieldLabel>
                    <CInput autoComplete="name" placeholder={boaTl("Your name")} value={guest.name} onChange={e=>setGuest(g=>({...g,name:e.target.value}))}/>
                  </Field>
                  <Field>
                    <FieldLabel>{boaTl("Phone")}</FieldLabel>
                    <CInput type="tel" autoComplete="tel" placeholder="+374 91 …" value={guest.phone} onChange={e=>setGuest(g=>({...g,phone:e.target.value}))}/>
                  </Field>
                  <div className="flex flex-col gap-2">
                    <span className="font-medium text-sm">{boaTl("Fulfillment")}</span>
                    <RadioGroup value={fulfillment} onValueChange={setFulfillment} className="flex flex-row gap-5">
                      <Label className="cursor-pointer"><Radio value="pickup"/>{boaTl("Pickup")}</Label>
                      <Label className="cursor-pointer"><Radio value="delivery"/>{boaTl("Delivery")}</Label>
                    </RadioGroup>
                    {fulfillment==='delivery'&&(
                      <CInput aria-label={boaTl("Delivery address")} placeholder={boaTl("Delivery address…")} value={deliveryAddr} onChange={e=>setDeliveryAddr(e.target.value)}/>
                    )}
                  </div>
                  {cartEntries.some(e=>e.qty > (e.item?.remaining_qty||999)) && (
                    <Alert variant="warning">
                      <TriangleAlertIcon/>
                      <AlertTitle>{boaTl("Limited availability")}</AlertTitle>
                      <AlertDescription>{boaTl("Some items have less stock than requested. Your order will be split: available qty confirmed now, the rest placed on a waitlist for the next run.")}</AlertDescription>
                    </Alert>
                  )}
                  <Separator/>
                  <div className="flex items-baseline justify-between font-semibold">
                    <span className="text-sm">{boaTl("Total")}</span>
                    <span className="text-brand tabular-nums">{cartTotal.toLocaleString()} {cartCurrency}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" aria-label={boaTl("Back")} onClick={()=>setCheckout(false)}><ArrowLeftIcon/></Button>
                    <Button type="submit" className="flex-1" loading={placing}>{boaTl("Place order")}</Button>
                  </div>
                </form>
              )}
            </CardPanel>
          </Card>
        </aside>
      </div>
    </div>
  );
}
