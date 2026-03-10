import { useState, useEffect, useCallback } from "react";
import { api } from "./api.js";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const G = {
  font: "'Playfair Display', Georgia, serif",
  mono: "'DM Sans', system-ui, sans-serif",
  cream: "#faf6f0",
  sand: "#f0e8d8",
  caramel: "#c8873a",
  dark: "#2c1810",
  muted: "#8b7355",
  border: "#e8dcc8",
  white: "#ffffff",
  red: "#d63031",
  green: "#00b894",
};

const PRODUCT_CATEGORIES = ["vegetables","fruit","dressing","dairy","poultry","fish","nuts","liquids","meat"];
const RECIPE_CATEGORIES  = ["cold drinks","hot drinks","alcohol","starters","main courses","side dishes","desserts","soups","snacks","appetizers"];
const UNITS     = ["grams","litres","kilograms","sachets","packages","bags","cartons","pcs"];
const CURRENCIES = ["AMD","RUR","USD","EUR"];

const STATUS_CONFIG = {
  New:        { color: "#22c55e", bg: "#f0fdf4", next: "Accept",               canDecline: true },
  Accepted:   { color: "#eab308", bg: "#fefce8", next: "Start Preparing",      canDecline: true },
  Preparing:  { color: "#f97316", bg: "#fff7ed", next: "Mark as Done",         canDecline: true },
  Done:       { color: "#22c55e", bg: "#f0fdf4", next: "Dispatch",             canDecline: true },
  Dispatched: { color: "#15803d", bg: "#dcfce7", next: "Confirm as Delivered", canDecline: true },
  Declined:   { color: "#ef4444", bg: "#fef2f2", next: null,                   canDecline: false },
  Delivered:  { color: "#0d9488", bg: "#f0fdfa", next: null,                   canDecline: false },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: ${G.mono}; background: ${G.cream}; color: ${G.dark}; min-height: 100vh; }
  input, select, textarea, button { font-family: ${G.mono}; }
  ::placeholder { color: ${G.muted}; opacity: 0.7; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: ${G.sand}; }
  ::-webkit-scrollbar-thumb { background: ${G.caramel}; border-radius: 3px; }
  @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes slideIn { from { opacity:0; transform:translateX(16px); } to { opacity:1; transform:translateX(0); } }
  @keyframes toastIn { from { opacity:0; transform:translateY(20px) scale(0.96); } to { opacity:1; transform:translateY(0) scale(1); } }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

// ─── TOAST ────────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = (msg, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 5000);
  };
  const remove = (id) => setToasts(p => p.filter(t => t.id !== id));
  return { toasts, toast: add, remove };
}

function Toast({ toasts, remove }) {
  return (
    <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999, display:"flex", flexDirection:"column", gap:10 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: G.dark, color: G.white, padding:"12px 18px", borderRadius:10,
          fontSize:14, maxWidth:320, display:"flex", alignItems:"center", gap:12,
          animation:"toastIn 0.3s ease", boxShadow:"0 8px 24px rgba(44,24,16,0.25)",
          borderLeft:`3px solid ${t.type === "error" ? G.red : G.caramel}`
        }}>
          <span style={{flex:1}}>{t.msg}</span>
          <button onClick={() => remove(t.id)} style={{ background:"none", border:"none", color:G.muted, cursor:"pointer", fontSize:18, lineHeight:1 }}>×</button>
        </div>
      ))}
    </div>
  );
}

// ─── DIALOG ───────────────────────────────────────────────────────────────────
function Dialog({ open, title, children, onConfirm, onCancel, confirmLabel = "Yes", danger = true }) {
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(44,24,16,0.45)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:G.white, borderRadius:16, padding:32, maxWidth:440, width:"90%", animation:"fadeIn 0.2s ease", boxShadow:"0 20px 60px rgba(44,24,16,0.2)" }}>
        <h3 style={{ fontFamily:G.font, fontSize:20, marginBottom:16 }}>{title}</h3>
        <div style={{ color:G.muted, lineHeight:1.6, marginBottom:24, fontSize:15 }}>{children}</div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
          <Btn variant={danger ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────
function Btn({ children, onClick, variant = "primary", disabled, size = "md", style: s, loading }) {
  const base = { border:"none", borderRadius:8, cursor: disabled||loading ? "not-allowed" : "pointer", fontFamily:G.mono, fontWeight:600, transition:"all 0.15s", opacity: disabled||loading ? 0.6 : 1, fontSize: size==="sm" ? 13 : size==="lg" ? 16 : 14, padding: size==="sm" ? "6px 14px" : size==="lg" ? "14px 28px" : "9px 20px" };
  const variants = { primary: { background:G.caramel, color:G.white }, secondary: { background:G.sand, color:G.dark, border:`1px solid ${G.border}` }, ghost: { background:"transparent", color:G.muted, border:`1px solid ${G.border}` }, danger: { background:G.red, color:G.white }, success: { background:G.green, color:G.white } };
  return <button onClick={disabled||loading ? undefined : onClick} style={{ ...base, ...variants[variant], ...s }}>{loading ? "…" : children}</button>;
}

function Input({ label, type="text", value, onChange, placeholder, required, hint, error, style: s, disabled }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      {label && <label style={{ fontSize:13, fontWeight:600, color:G.dark }}>{label}{required && <span style={{color:G.caramel}}> *</span>}</label>}
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
        style={{ padding:"10px 14px", borderRadius:8, border:`1px solid ${error ? G.red : G.border}`, background: disabled ? G.sand : G.white, fontSize:14, color:G.dark, outline:"none", width:"100%", ...s }}
        onFocus={e=>e.target.style.borderColor=G.caramel} onBlur={e=>e.target.style.borderColor=error?G.red:G.border}
      />
      {hint && <span style={{ fontSize:12, color:G.muted }}>{hint}</span>}
      {error && <span style={{ fontSize:12, color:G.red }}>{error}</span>}
    </div>
  );
}

function Select({ label, value, onChange, options, placeholder, required, style: s }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      {label && <label style={{ fontSize:13, fontWeight:600, color:G.dark }}>{label}{required && <span style={{color:G.caramel}}> *</span>}</label>}
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{ padding:"10px 14px", borderRadius:8, border:`1px solid ${G.border}`, background:G.white, fontSize:14, color:value?G.dark:G.muted, outline:"none", cursor:"pointer", width:"100%", ...s }}
        onFocus={e=>e.target.style.borderColor=G.caramel} onBlur={e=>e.target.style.borderColor=G.border}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => typeof o === "string" ? <option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Badge({ children, color, bg }) {
  return <span style={{ background:bg||G.sand, color:color||G.caramel, padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:600 }}>{children}</span>;
}

function Spinner() {
  return <div style={{ width:32, height:32, border:`3px solid ${G.border}`, borderTopColor:G.caramel, borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"40px auto" }} />;
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
function Nav({ user, page, setPage, logout }) {
  const isM = user?.is_manufacturer;
  const links = isM
    ? [{ key:"orders-manuf", label:"Orders" },{ key:"products", label:"Products" },{ key:"recipes", label:"Recipes" },{ key:"menus", label:"Menus" }]
    : [{ key:"restaurants", label:"Restaurants" },{ key:"orders-cust", label:"My Orders" }];
  return (
    <nav style={{ background:G.white, borderBottom:`1px solid ${G.border}`, padding:"0 32px", display:"flex", alignItems:"center", height:60, position:"sticky", top:0, zIndex:100, boxShadow:"0 1px 12px rgba(44,24,16,0.06)" }}>
      <button onClick={()=>setPage(isM?"orders-manuf":"restaurants")} style={{ fontFamily:G.font, fontSize:22, fontWeight:700, color:G.caramel, background:"none", border:"none", cursor:"pointer", marginRight:32, fontStyle:"italic" }}>Pun&Cotta</button>
      <div style={{ display:"flex", gap:4, flex:1 }}>
        {links.map(l => (
          <button key={l.key} onClick={()=>setPage(l.key)} style={{ background:page===l.key?G.sand:"none", border:"none", padding:"6px 14px", borderRadius:8, fontFamily:G.mono, fontSize:14, fontWeight:page===l.key?600:400, color:page===l.key?G.caramel:G.muted, cursor:"pointer", transition:"all 0.15s" }}>{l.label}</button>
        ))}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <span style={{ fontSize:13, color:G.muted }}>{user?.first_name} {user?.last_name}</span>
        <Btn variant="ghost" size="sm" onClick={logout}>Log out</Btn>
      </div>
    </nav>
  );
}

function Page({ children, title, actions }) {
  return (
    <div style={{ maxWidth:1100, margin:"0 auto", padding:"36px 24px", animation:"fadeIn 0.3s ease" }}>
      {(title||actions) && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28 }}>
          {title && <h1 style={{ fontFamily:G.font, fontSize:28, fontWeight:700 }}>{title}</h1>}
          {actions && <div style={{ display:"flex", gap:10 }}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// ─── AUTH LAYOUT ──────────────────────────────────────────────────────────────
function AuthLayout({ children }) {
  return (
    <div style={{ minHeight:"100vh", background:G.cream, display:"flex", alignItems:"center", justifyContent:"center", padding:24, backgroundImage:`radial-gradient(circle at 20% 20%, rgba(200,135,58,0.08) 0%, transparent 60%)` }}>
      <div style={{ width:"100%", maxWidth:480 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <h1 style={{ fontFamily:G.font, fontSize:40, color:G.caramel, fontStyle:"italic", marginBottom:4 }}>Pun&Cotta</h1>
          <p style={{ color:G.muted, fontSize:14 }}>Artisan pastry delivery</p>
        </div>
        <div style={{ background:G.white, borderRadius:20, padding:36, boxShadow:"0 4px 40px rgba(44,24,16,0.1)", border:`1px solid ${G.border}`, animation:"fadeIn 0.4s ease" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginPage({ onLogin, setPage }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr(""); setLoading(true);
    try {
      const { token, user } = await api.login(email, pw);
      localStorage.setItem("token", token);
      onLogin(user);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <AuthLayout>
      <h2 style={{ fontFamily:G.font, fontSize:22, marginBottom:24 }}>Welcome back</h2>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required />
        <Input label="Password" type="password" value={pw} onChange={setPw} placeholder="••••••••" required error={err}
          onKeyDown={e=>e.key==="Enter"&&submit()} />
        <Btn size="lg" onClick={submit} loading={loading}>Log in</Btn>
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          <button onClick={()=>setPage("forgot")} style={{ background:"none", border:"none", color:G.caramel, cursor:"pointer", fontSize:13 }}>Forgot password?</button>
          <button onClick={()=>setPage("signup")} style={{ background:"none", border:"none", color:G.muted, cursor:"pointer", fontSize:13 }}>Create account →</button>
        </div>
        <div style={{ marginTop:8, padding:12, background:G.sand, borderRadius:8, fontSize:12, color:G.muted, lineHeight:1.7 }}>
          <b>Demo accounts:</b><br/>
          Customer: sophie@example.com / pass123<br/>
          Manufacturer: arman@puncotta.com / pass123
        </div>
      </div>
    </AuthLayout>
  );
}

// ─── SIGNUP ───────────────────────────────────────────────────────────────────
function SignupPage({ setPage, toast }) {
  const [form, setForm] = useState({ first_name:"", last_name:"", email:"", phone:"", street_address:"", city:"", zip:"", password:"", is_manufacturer:false, business_name:"" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(p=>({...p,[k]:v}));

  const submit = async () => {
    const e = {};
    if (!form.first_name) e.first_name = "Required";
    if (!form.last_name)  e.last_name  = "Required";
    if (!form.email)      e.email      = "Required";
    if (!form.password || form.password.trim().length < 6) e.password = "Min 6 characters";
    if (form.is_manufacturer && !form.business_name) e.business_name = "Required for manufacturers";
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      await api.register(form);
      toast("Account created! Check your email to confirm. (Dev: email logged to server console)");
      setPage("login");
    } catch (err) {
      if (err.message.includes("already exists")) setErrors({ email: err.message });
      else toast(err.message, "error");
    } finally { setLoading(false); }
  };

  return (
    <AuthLayout>
      <h2 style={{ fontFamily:G.font, fontSize:22, marginBottom:24 }}>Create your account</h2>
      <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:13 }}>
          <Input label="First name" value={form.first_name} onChange={v=>set("first_name",v)} required error={errors.first_name} />
          <Input label="Last name"  value={form.last_name}  onChange={v=>set("last_name",v)}  required error={errors.last_name} />
        </div>
        <Input label="Email" type="email" value={form.email} onChange={v=>set("email",v)} required error={errors.email} />
        <Input label="Phone" value={form.phone} onChange={v=>set("phone",v)} placeholder="+374 91 …" />
        <Input label="Street address" value={form.street_address} onChange={v=>set("street_address",v)} />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:13 }}>
          <Input label="City" value={form.city} onChange={v=>set("city",v)} />
          <Input label="ZIP"  value={form.zip}  onChange={v=>set("zip",v)} />
        </div>
        <Input label="Password" type="password" value={form.password} onChange={v=>set("password",v)} required error={errors.password} hint="Min 6 characters" />
        <div style={{ padding:"14px 16px", background:G.sand, borderRadius:10, border:`1px solid ${G.border}` }}>
          <p style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>I am a…</p>
          <div style={{ display:"flex", gap:10 }}>
            {[{label:"Customer",val:false},{label:"Manufacturer",val:true}].map(opt=>(
              <button key={opt.label} onClick={()=>set("is_manufacturer",opt.val)} style={{ flex:1, padding:"10px 0", borderRadius:8, border:"none", cursor:"pointer", fontFamily:G.mono, fontWeight:600, fontSize:14, transition:"all 0.2s", background:form.is_manufacturer===opt.val?G.caramel:G.white, color:form.is_manufacturer===opt.val?G.white:G.muted }}>{opt.label}</button>
            ))}
          </div>
        </div>
        {form.is_manufacturer && <Input label="Business name" value={form.business_name} onChange={v=>set("business_name",v)} required error={errors.business_name} />}
        <Btn size="lg" onClick={submit} loading={loading} style={{marginTop:4}}>Create account</Btn>
        <button onClick={()=>setPage("login")} style={{ background:"none", border:"none", color:G.muted, cursor:"pointer", fontSize:13, textAlign:"center" }}>Already have an account? Log in →</button>
      </div>
    </AuthLayout>
  );
}

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────
function ForgotPage({ setPage, toast }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true);
    try { await api.forgot(email); toast("Recovery link sent! Check your inbox (or server console in dev)."); setPage("login"); }
    catch (e) { toast(e.message, "error"); }
    finally { setLoading(false); }
  };
  return (
    <AuthLayout>
      <h2 style={{ fontFamily:G.font, fontSize:22, marginBottom:8 }}>Reset password</h2>
      <p style={{ color:G.muted, fontSize:14, marginBottom:24, lineHeight:1.6 }}>Enter your email and we'll send you a recovery link valid for 1 hour.</p>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
        <Btn size="lg" onClick={submit} loading={loading}>Send recovery link</Btn>
        <button onClick={()=>setPage("login")} style={{ background:"none", border:"none", color:G.muted, cursor:"pointer", fontSize:13, textAlign:"center" }}>← Back to login</button>
      </div>
    </AuthLayout>
  );
}

// ─── DATA TABLE ───────────────────────────────────────────────────────────────
function DataTable({ columns, rows, selected, onSelect, onSelectAll, sortKey, sortDir, onSort }) {
  const allSel = rows.length > 0 && rows.every(r=>selected.includes(r._id));
  return (
    <div style={{ background:G.white, borderRadius:14, border:`1px solid ${G.border}`, overflow:"hidden" }}>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead>
          <tr style={{ background:G.sand, borderBottom:`1px solid ${G.border}` }}>
            <th style={{ padding:"12px 16px", width:44 }}>
              <input type="checkbox" checked={allSel} onChange={()=>onSelectAll(allSel?[]:rows.map(r=>r._id))} style={{ cursor:"pointer", accentColor:G.caramel }} />
            </th>
            {columns.map(c=>(
              <th key={c.key} onClick={()=>c.sortable!==false&&onSort&&onSort(c.key)}
                style={{ padding:"12px 16px", textAlign:"left", fontSize:12, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", color:G.muted, cursor:c.sortable!==false?"pointer":"default", userSelect:"none", whiteSpace:"nowrap" }}>
                {c.label}{c.sortable!==false&&sortKey===c.key&&<span style={{marginLeft:4}}>{sortDir==="asc"?"↑":"↓"}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length===0 ? (
            <tr><td colSpan={columns.length+1} style={{ padding:40, textAlign:"center", color:G.muted, fontSize:14 }}>No items yet.</td></tr>
          ) : rows.map((r,i)=>(
            <tr key={r._id} style={{ borderBottom:i<rows.length-1?`1px solid ${G.border}`:"none", background:selected.includes(r._id)?"#fef9f4":"transparent", transition:"background 0.1s" }}>
              <td style={{ padding:"12px 16px" }}><input type="checkbox" checked={selected.includes(r._id)} onChange={()=>onSelect(r._id)} style={{ cursor:"pointer", accentColor:G.caramel }} /></td>
              {columns.map(c=>(
                <td key={c.key} style={{ padding:"12px 16px", fontSize:14, verticalAlign:"middle" }}>
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── PRODUCTS PAGE ────────────────────────────────────────────────────────────
function ProductsPage({ toast }) {
  const [products, setProducts] = useState([]);
  const [lookups, setLookups] = useState({ units:[], categories:[] });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [showForm, setShowForm] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({ name:"", unid:"", caid:"" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, lu] = await Promise.all([api.getProducts(), api.getProductLookups()]);
      setProducts(prods); setLookups(lu);
    } catch(e) { toast(e.message, "error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); }, []);

  const sorted = [...products].sort((a,b)=>{
    const v = String(a[sortKey]||"") < String(b[sortKey]||"") ? -1 : String(a[sortKey]||"") > String(b[sortKey]||"") ? 1 : 0;
    return sortDir==="asc"?v:-v;
  });

  const toggleSort = k => { if(sortKey===k) setSortDir(d=>d==="asc"?"desc":"asc"); else{setSortKey(k);setSortDir("asc");} };
  const toggleSel  = id => setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const p = await api.createProduct({ name:form.name, unid:form.unid||null, caid:form.caid||null });
      setProducts(prev=>[...prev, p]);
      toast(`"${p.name}" saved`);
      setForm({ name:"", unid:"", caid:"" }); setShowForm(false);
    } catch(e) { toast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const doDelete = async () => {
    const names = selected.map(id=>products.find(p=>p.pid===id)?.name).filter(Boolean).join(", ");
    try {
      await api.deleteProducts(selected);
      setProducts(prev=>prev.filter(p=>!selected.includes(p.pid)));
      toast(`${names} deleted`); setSelected([]); setDialog(null);
    } catch(e) { toast(e.message,"error"); }
  };

  const cols = [
    { key:"pid", label:"ID",       sortable:true,  render:r=><span style={{color:G.muted,fontSize:13}}>#{r._id}</span> },
    { key:"name", label:"Name",    sortable:true },
    { key:"category", label:"Category", sortable:true, render:r=>r.category?<Badge>{r.category}</Badge>:<span style={{color:G.muted}}>—</span> },
    { key:"units", label:"Units",  sortable:false,  render:r=>r.units||<span style={{color:G.muted}}>—</span> },
  ];
  const rows = sorted.map(p=>({...p, _id:p.pid}));

  return (
    <Page title="Products" actions={
      <>{selected.length>0&&<Btn variant="danger" size="sm" onClick={()=>setDialog("del")}>Delete ({selected.length})</Btn>}<Btn size="sm" onClick={()=>setShowForm(s=>!s)}>+ New product</Btn></>
    }>
      {showForm && (
        <div style={{ background:G.white, border:`1px solid ${G.border}`, borderRadius:14, padding:24, marginBottom:20, animation:"fadeIn 0.2s ease" }}>
          <h3 style={{ fontFamily:G.font, fontSize:17, marginBottom:16 }}>New Product</h3>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:14 }}>
            <Input label="Name" value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} required />
            <Select label="Units" value={form.unid} onChange={v=>setForm(p=>({...p,unid:v}))}
              options={lookups.units.map(u=>({value:String(u.unid),label:u.name}))} placeholder="Select units" />
            <Select label="Category" value={form.caid} onChange={v=>setForm(p=>({...p,caid:v}))}
              options={lookups.categories.map(c=>({value:String(c.caid),label:c.name}))} placeholder="Select category" />
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <Btn size="sm" onClick={save} loading={saving}>Save</Btn>
            <Btn variant="ghost" size="sm" onClick={()=>setShowForm(false)}>Cancel</Btn>
          </div>
        </div>
      )}
      {loading ? <Spinner /> : (
        <DataTable columns={cols} rows={rows} selected={selected}
          onSelect={toggleSel} onSelectAll={setSelected}
          sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
      )}
      <Dialog open={dialog==="del"} title="Delete products?" onConfirm={doDelete} onCancel={()=>setDialog(null)}>
        Are you sure you wish to delete <b>{selected.map(id=>products.find(p=>p.pid===id)?.name).filter(Boolean).join(", ")}</b>?
      </Dialog>
    </Page>
  );
}

// ─── RECIPES PAGE ─────────────────────────────────────────────────────────────
function RecipesPage({ toast }) {
  const [recipes, setRecipes] = useState([]);
  const [lookups, setLookups] = useState({ units:[], categories:[] });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [showForm, setShowForm] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({ name:"", description:"", unid:"", caid:"", price:"", currency:"AMD", available:true });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async()=>{
    setLoading(true);
    try { const [r,l]=await Promise.all([api.getRecipes(),api.getRecipeLookups()]); setRecipes(r); setLookups(l); }
    catch(e){ toast(e.message,"error"); } finally{ setLoading(false); }
  },[]);
  useEffect(()=>{ load(); },[]);

  const sorted = [...recipes].sort((a,b)=>{ const v=String(a[sortKey]||"")<String(b[sortKey]||"")?-1:String(a[sortKey]||"")>String(b[sortKey]||"")?1:0; return sortDir==="asc"?v:-v; });
  const toggleSort = k=>{ if(sortKey===k) setSortDir(d=>d==="asc"?"desc":"asc"); else{setSortKey(k);setSortDir("asc");} };
  const toggleSel  = id=>setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);

  const toggleAvail = async (r) => {
    try {
      const updated = await api.patchRecipe(r.rid, { available: !r.available });
      setRecipes(prev=>prev.map(x=>x.rid===r.rid?{...x,available:updated.available}:x));
    } catch(e){ toast(e.message,"error"); }
  };

  const save = async()=>{
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const r = await api.createRecipe({ name:form.name, description:form.description, unid:form.unid||null, caid:form.caid||null, price:Number(form.price)||0, currency:form.currency, available:form.available });
      setRecipes(prev=>[...prev,r]);
      toast(`"${r.name}" saved`);
      setForm({ name:"", description:"", unid:"", caid:"", price:"", currency:"AMD", available:true });
      setShowForm(false);
    } catch(e){ toast(e.message,"error"); } finally{ setSaving(false); }
  };

  const doDelete = async()=>{
    const names=selected.map(id=>recipes.find(r=>r.rid===id)?.name).filter(Boolean).join(", ");
    try { await api.deleteRecipes(selected); setRecipes(prev=>prev.filter(r=>!selected.includes(r.rid))); toast(`${names} deleted`); setSelected([]); setDialog(null); }
    catch(e){ toast(e.message,"error"); }
  };

  const cols = [
    { key:"rid",  label:"ID",   sortable:true,  render:r=><span style={{color:G.muted,fontSize:13}}>#{r._id}</span> },
    { key:"name", label:"Name", sortable:true },
    { key:"description", label:"Description", sortable:true, render:r=>r.description||<span style={{color:G.muted}}>—</span> },
    { key:"units", label:"Units", sortable:false, render:r=>r.units||"—" },
    { key:"available", label:"Available", sortable:false, render:r=>(
      <input type="checkbox" checked={r.available} onChange={()=>toggleAvail(r)} style={{ cursor:"pointer", accentColor:G.caramel, width:16, height:16 }} />
    )},
    { key:"price", label:"Price", sortable:false, render:r=><span style={{fontWeight:600}}>{r.price} {r.currency}</span> },
    { key:"category", label:"Category", sortable:true, render:r=>r.category?<Badge>{r.category}</Badge>:<span style={{color:G.muted}}>—</span> },
  ];
  const rows = sorted.map(r=>({...r,_id:r.rid}));

  return (
    <Page title="Recipes" actions={
      <>{selected.length>0&&<Btn variant="danger" size="sm" onClick={()=>setDialog("del")}>Delete ({selected.length})</Btn>}<Btn size="sm" onClick={()=>setShowForm(s=>!s)}>+ New recipe</Btn></>
    }>
      {showForm&&(
        <div style={{ background:G.white, border:`1px solid ${G.border}`, borderRadius:14, padding:24, marginBottom:20, animation:"fadeIn 0.2s ease" }}>
          <h3 style={{ fontFamily:G.font, fontSize:17, marginBottom:16 }}>New Recipe</h3>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            <Input label="Name" value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} required />
            <Input label="Description" value={form.description} onChange={v=>setForm(p=>({...p,description:v}))} />
            <Select label="Units" value={form.unid} onChange={v=>setForm(p=>({...p,unid:v}))} options={lookups.units.map(u=>({value:String(u.unid),label:u.name}))} placeholder="Select units" />
            <Select label="Category" value={form.caid} onChange={v=>setForm(p=>({...p,caid:v}))} options={lookups.categories.map(c=>({value:String(c.caid),label:c.name}))} placeholder="Select category" />
            <Input label="Price" type="number" value={form.price} onChange={v=>setForm(p=>({...p,price:v}))} placeholder="0" />
            <Select label="Currency" value={form.currency} onChange={v=>setForm(p=>({...p,currency:v}))} options={CURRENCIES} />
          </div>
          <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:14, marginBottom:14, cursor:"pointer" }}>
            <input type="checkbox" checked={form.available} onChange={e=>setForm(p=>({...p,available:e.target.checked}))} style={{accentColor:G.caramel}} />
            Available (can be added to a menu)
          </label>
          <div style={{ display:"flex", gap:10 }}>
            <Btn size="sm" onClick={save} loading={saving}>Save</Btn>
            <Btn variant="ghost" size="sm" onClick={()=>setShowForm(false)}>Cancel</Btn>
          </div>
        </div>
      )}
      {loading?<Spinner/>:<DataTable columns={cols} rows={rows} selected={selected} onSelect={toggleSel} onSelectAll={setSelected} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />}
      <Dialog open={dialog==="del"} title="Delete recipes?" onConfirm={doDelete} onCancel={()=>setDialog(null)}>
        Are you sure you wish to delete <b>{selected.map(id=>recipes.find(r=>r.rid===id)?.name).filter(Boolean).join(", ")}</b>?
      </Dialog>
    </Page>
  );
}

// ─── MENUS PAGE ───────────────────────────────────────────────────────────────
function MenusPage({ toast }) {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMid, setViewMid] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [availRecipes, setAvailRecipes] = useState([]);
  const [sidebarCat, setSidebarCat] = useState("");
  const [form, setForm] = useState({ name:"", available:true, delivery_fee:"", recipe_ids:[] });
  const [dialog, setDialog] = useState(null);
  const [toRemove, setToRemove] = useState([]);
  const [editTitle, setEditTitle] = useState(false);
  const [titleVal, setTitleVal] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async()=>{
    setLoading(true);
    try { const[m,r]=await Promise.all([api.getMenus(),api.getAvailableRecipes()]); setMenus(m); setAvailRecipes(r); }
    catch(e){ toast(e.message,"error"); } finally{ setLoading(false); }
  },[]);
  useEffect(()=>{ load(); },[]);

  const saveNew = async()=>{
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const m = await api.createMenu({ name:form.name, available:form.available, delivery_fee:Number(form.delivery_fee)||0, recipe_ids:form.recipe_ids });
      setMenus(prev=>[...prev,m]); toast(`"${m.name}" saved`);
      setShowNew(false); setForm({ name:"", available:true, delivery_fee:"", recipe_ids:[] });
    } catch(e){ toast(e.message,"error"); } finally{ setSaving(false); }
  };

  const patchMenu = async(mid, data)=>{
    try { const updated=await api.patchMenu(mid,data); setMenus(prev=>prev.map(m=>m.mid===mid?updated:m)); }
    catch(e){ toast(e.message,"error"); }
  };

  const removeRecipes = async()=>{
    const menu = menus.find(m=>m.mid===viewMid);
    try {
      const updated = await api.removeMenuRecipes(viewMid, toRemove);
      setMenus(prev=>prev.map(m=>m.mid===viewMid?updated:m));
      toast(`Removed from menu`); setToRemove([]); setDialog(null);
    } catch(e){ toast(e.message,"error"); }
  };

  const sidebarCats = [...new Set(availRecipes.map(r=>r.category))].filter(Boolean);
  const sidebarRecs = availRecipes.filter(r=>!sidebarCat||r.category===sidebarCat);

  // MENU DETAIL VIEW
  if (viewMid) {
    const menu = menus.find(m=>m.mid===viewMid);
    if (!menu) { setViewMid(null); return null; }
    const grouped = {};
    (menu.recipes||[]).forEach(r=>{ if(!grouped[r.category])grouped[r.category]=[]; grouped[r.category].push(r); });

    return (
      <Page actions={<Btn variant="ghost" size="sm" onClick={()=>setViewMid(null)}>← All menus</Btn>}>
        <div style={{ marginBottom:20 }}>
          {editTitle ? (
            <input autoFocus value={titleVal} onChange={e=>setTitleVal(e.target.value)}
              onBlur={()=>{ patchMenu(menu.mid,{name:titleVal}); setEditTitle(false); }}
              onKeyDown={e=>e.key==="Enter"&&e.target.blur()}
              style={{ fontFamily:G.font, fontSize:28, fontWeight:700, background:"none", border:"none", borderBottom:`2px solid ${G.caramel}`, outline:"none", width:"100%" }}
            />
          ) : (
            <h1 onClick={()=>{ setTitleVal(menu.name); setEditTitle(true); }} title="Click to rename"
              style={{ fontFamily:G.font, fontSize:28, fontWeight:700, cursor:"text", display:"inline-block", borderBottom:"2px solid transparent", transition:"border-color 0.2s" }}
              onMouseEnter={e=>e.target.style.borderColor=G.caramel}
              onMouseLeave={e=>e.target.style.borderColor="transparent"}
            >{menu.name}</h1>
          )}
          <div style={{ display:"flex", alignItems:"center", gap:16, marginTop:12 }}>
            <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:14 }}>
              <input type="checkbox" checked={menu.available} onChange={()=>patchMenu(menu.mid,{available:!menu.available})} style={{accentColor:G.caramel}} />
              Available to customers
            </label>
            {toRemove.length>0&&<Btn variant="danger" size="sm" onClick={()=>setDialog("remove")}>Remove selected ({toRemove.length})</Btn>}
          </div>
        </div>
        <div style={{ background:G.white, borderRadius:14, border:`1px solid ${G.border}`, overflow:"hidden" }}>
          {Object.entries(grouped).map(([cat,recs])=>(
            <div key={cat}>
              <div style={{ padding:"10px 20px", background:G.sand, borderBottom:`1px solid ${G.border}`, fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", color:G.muted, display:"flex", alignItems:"center", gap:10 }}>
                <input type="checkbox" checked={recs.every(r=>toRemove.includes(r.rid))}
                  onChange={()=>{ const all=recs.every(r=>toRemove.includes(r.rid)); setToRemove(p=>all?p.filter(x=>!recs.find(r=>r.rid===x)):[...p,...recs.map(r=>r.rid).filter(x=>!p.includes(x))]); }}
                  style={{accentColor:G.caramel}}
                />
                {cat}
              </div>
              {recs.map(r=>(
                <div key={r.rid} style={{ padding:"12px 20px", display:"flex", alignItems:"center", gap:12, borderBottom:`1px solid ${G.border}` }}>
                  <input type="checkbox" checked={toRemove.includes(r.rid)} onChange={()=>setToRemove(p=>p.includes(r.rid)?p.filter(x=>x!==r.rid):[...p,r.rid])} style={{accentColor:G.caramel}} />
                  <span style={{flex:1,fontSize:14}}>{r.name}</span>
                  <span style={{fontWeight:600,color:G.caramel,fontSize:14}}>{r.price} {r.currency}</span>
                </div>
              ))}
            </div>
          ))}
          {(!menu.recipes||menu.recipes.length===0)&&<div style={{padding:40,textAlign:"center",color:G.muted}}>No recipes yet.</div>}
        </div>
        <Dialog open={dialog==="remove"} title="Remove from menu?" onConfirm={removeRecipes} onCancel={()=>setDialog(null)}>
          Are you sure you wish to remove the selected recipes? You may add them back later.
        </Dialog>
      </Page>
    );
  }

  return (
    <Page title="Menus" actions={<Btn size="sm" onClick={()=>setShowNew(s=>!s)}>+ New menu</Btn>}>
      {showNew&&(
        <div style={{ background:G.white, border:`1px solid ${G.border}`, borderRadius:14, padding:24, marginBottom:20, animation:"fadeIn 0.2s ease" }}>
          <h3 style={{ fontFamily:G.font, fontSize:17, marginBottom:16 }}>New Menu</h3>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:14, marginBottom:14, alignItems:"end" }}>
            <Input label="Name" value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} required />
            <Input label="Delivery fee (AMD)" type="number" value={form.delivery_fee} onChange={v=>setForm(p=>({...p,delivery_fee:v}))} placeholder="0" />
            <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:14, paddingBottom:10, cursor:"pointer", whiteSpace:"nowrap" }}>
              <input type="checkbox" checked={form.available} onChange={e=>setForm(p=>({...p,available:e.target.checked}))} style={{accentColor:G.caramel}} />
              Available
            </label>
          </div>
          <div style={{ marginBottom:14 }}>
            <p style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>Recipes ({form.recipe_ids.length} selected)</p>
            {form.recipe_ids.length>0&&(
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
                {form.recipe_ids.map(rid=>{ const r=availRecipes.find(x=>x.rid===rid); return r ? (
                  <span key={rid} style={{ background:G.sand, padding:"4px 10px", borderRadius:20, fontSize:13, display:"flex", alignItems:"center", gap:6 }}>
                    {r.name}
                    <button onClick={()=>setForm(p=>({...p,recipe_ids:p.recipe_ids.filter(x=>x!==rid)}))} style={{background:"none",border:"none",cursor:"pointer",color:G.muted,fontSize:16,lineHeight:1}}>×</button>
                  </span>
                ) : null; })}
              </div>
            )}
            <Btn variant="secondary" size="sm" onClick={()=>setShowSidebar(true)}>+ Add recipes</Btn>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <Btn size="sm" onClick={saveNew} loading={saving}>Save</Btn>
            <Btn variant="ghost" size="sm" onClick={()=>setShowNew(false)}>Cancel</Btn>
          </div>
        </div>
      )}

      {showSidebar&&(
        <div style={{ position:"fixed", inset:0, zIndex:200 }} onClick={()=>setShowSidebar(false)}>
          <div onClick={e=>e.stopPropagation()} style={{ position:"fixed", right:0, top:0, bottom:0, width:340, background:G.white, boxShadow:"-8px 0 40px rgba(44,24,16,0.12)", padding:24, display:"flex", flexDirection:"column", animation:"slideIn 0.25s ease" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h3 style={{ fontFamily:G.font, fontSize:18 }}>Recipes</h3>
              <button onClick={()=>setShowSidebar(false)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:G.muted}}>×</button>
            </div>
            <Select label="Category" value={sidebarCat} onChange={setSidebarCat} options={sidebarCats} placeholder="All categories" />
            <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:6, marginTop:16 }}>
              {sidebarRecs.map(r=>(
                <label key={r.rid} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:8, cursor:"pointer", background:form.recipe_ids.includes(r.rid)?"#fef9f4":"transparent", border:`1px solid ${form.recipe_ids.includes(r.rid)?G.caramel:"transparent"}` }}>
                  <input type="checkbox" checked={form.recipe_ids.includes(r.rid)}
                    onChange={()=>setForm(p=>({ ...p, recipe_ids: p.recipe_ids.includes(r.rid)?p.recipe_ids.filter(x=>x!==r.rid):[...p.recipe_ids,r.rid] }))}
                    style={{accentColor:G.caramel}} />
                  <span style={{flex:1,fontSize:14}}>{r.name}</span>
                  <span style={{fontSize:12,color:G.muted}}>{r.price} {r.currency}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading?<Spinner/>:(
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:16 }}>
          {menus.map(m=>(
            <div key={m.mid} onClick={()=>setViewMid(m.mid)} style={{ background:G.white, borderRadius:14, border:`1px solid ${G.border}`, padding:20, cursor:"pointer", transition:"all 0.2s" }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=G.caramel;e.currentTarget.style.boxShadow="0 4px 20px rgba(200,135,58,0.15)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=G.border;e.currentTarget.style.boxShadow="none";}}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <h3 style={{ fontFamily:G.font, fontSize:17 }}>{m.name}</h3>
                <Badge color={m.available?G.green:G.muted} bg={m.available?"#f0fdf4":G.sand}>{m.available?"Live":"Draft"}</Badge>
              </div>
              <p style={{ fontSize:13, color:G.muted }}>{(m.recipes||[]).length} recipe{(m.recipes||[]).length!==1?"s":""} · Delivery {m.delivery_fee} AMD</p>
            </div>
          ))}
          {menus.length===0&&<p style={{color:G.muted,fontSize:14}}>No menus yet. Create your first one!</p>}
        </div>
      )}
    </Page>
  );
}

// ─── ORDERS (MANUFACTURER) ────────────────────────────────────────────────────
function OrdersManufPage({ toast }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [pending, setPending] = useState(null);

  const load = useCallback(async()=>{
    setLoading(true);
    try { setOrders(await api.getOrders()); }
    catch(e){ toast(e.message,"error"); } finally{ setLoading(false); }
  },[]);
  useEffect(()=>{ load(); },[]);

  const statuses = Object.keys(STATUS_CONFIG);
  const filtered = filter.length ? orders.filter(o=>filter.includes(o.status)) : orders;

  const advance = async(oid)=>{
    try { const updated=await api.advanceOrder(oid); setOrders(prev=>prev.map(o=>o.oid===oid?updated:o)); toast(`Order #${oid} updated`); }
    catch(e){ toast(e.message,"error"); }
  };
  const decline = async()=>{
    try { const updated=await api.declineOrder(pending); setOrders(prev=>prev.map(o=>o.oid===pending?updated:o)); toast(`Order #${pending} declined`); setDialog(null); }
    catch(e){ toast(e.message,"error"); }
  };

  const toggleFilter = s=>setFilter(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s]);

  return (
    <Page title="Orders" actions={
      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        {statuses.map(s=>(
          <button key={s} onClick={()=>toggleFilter(s)} style={{ padding:"5px 12px", borderRadius:20, border:`1px solid ${filter.includes(s)?STATUS_CONFIG[s].color:G.border}`, background:filter.includes(s)?STATUS_CONFIG[s].bg:G.white, color:filter.includes(s)?STATUS_CONFIG[s].color:G.muted, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:G.mono, transition:"all 0.15s" }}>{s}</button>
        ))}
        {filter.length>0&&<button onClick={()=>setFilter([])} style={{ padding:"5px 12px", borderRadius:20, border:`1px solid ${G.border}`, background:"none", color:G.muted, fontSize:12, cursor:"pointer", fontFamily:G.mono }}>Clear</button>}
      </div>
    }>
      {loading?<Spinner/>:(
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))", gap:14 }}>
          {(filter.length?filter:statuses).map(status=>{
            const cfg=STATUS_CONFIG[status];
            const col=filtered.filter(o=>o.status===status);
            return (
              <div key={status} style={{ background:G.white, borderRadius:14, border:`1px solid ${G.border}`, overflow:"hidden" }}>
                <div style={{ padding:"10px 14px", background:cfg.bg, borderBottom:`2px solid ${cfg.color}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:13, fontWeight:700, color:cfg.color, letterSpacing:"0.04em" }}>{status.toUpperCase()}</span>
                  <span style={{ fontSize:12, color:cfg.color, background:G.white, padding:"2px 8px", borderRadius:20, fontWeight:700 }}>{col.length}</span>
                </div>
                <div style={{ padding:10, display:"flex", flexDirection:"column", gap:8, minHeight:80 }}>
                  {col.map(o=>(
                    <div key={o.oid} style={{ padding:12, borderRadius:10, border:`1px solid ${G.border}`, background:G.cream, fontSize:13 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <span style={{ fontWeight:700 }}>#{o.oid}</span>
                        <span style={{ color:G.muted, fontSize:11 }}>{new Date(o.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
                      </div>
                      <p style={{ color:G.muted, fontSize:12, marginBottom:6 }}>{o.customer?.first_name} {o.customer?.last_name}</p>
                      <div style={{ marginBottom:8 }}>
                        {(o.items||[]).map((it,i)=><div key={i} style={{fontSize:12}}>{it.qty}× {it.name}</div>)}
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderTop:`1px solid ${G.border}`, paddingTop:8 }}>
                        <span style={{ fontWeight:700, color:G.caramel }}>{(o.items||[]).reduce((s,it)=>s+it.qty*it.price,0)} AMD</span>
                        <span style={{ fontSize:11, color:G.muted }}>{o.pickup?"Pickup":"Delivery"}</span>
                      </div>
                      {cfg.next&&(
                        <div style={{ display:"flex", gap:6, marginTop:8 }}>
                          <Btn size="sm" onClick={()=>advance(o.oid)} style={{flex:1,fontSize:11,padding:"5px 0"}}>{cfg.next}</Btn>
                          {cfg.canDecline&&<Btn variant="danger" size="sm" onClick={()=>{setPending(o.oid);setDialog("decline");}} style={{fontSize:11,padding:"5px 10px"}}>✕</Btn>}
                        </div>
                      )}
                    </div>
                  ))}
                  {col.length===0&&<div style={{padding:16,textAlign:"center",color:G.muted,fontSize:12}}>Empty</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Dialog open={dialog==="decline"} title="Decline order?" onConfirm={decline} onCancel={()=>setDialog(null)}>
        Are you sure you want to decline order #{pending}?
      </Dialog>
    </Page>
  );
}

// ─── RESTAURANTS (CUSTOMER) ───────────────────────────────────────────────────
function RestaurantsPage({ setPage, setActiveMenu }) {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    api.getMenus().then(m=>{ setMenus(m.filter(x=>x.available&&(x.recipes||[]).length>0)); setLoading(false); }).catch(()=>setLoading(false));
  },[]);

  return (
    <Page title="Restaurants">
      {loading?<Spinner/>:menus.length===0?(
        <div style={{ textAlign:"center", padding:80, color:G.muted }}>
          <p style={{ fontFamily:G.font, fontSize:24, marginBottom:8 }}>No restaurants open right now</p>
          <p>Check back soon!</p>
        </div>
      ):(
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap:20 }}>
          {menus.map(m=>(
            <div key={m.mid} onClick={()=>{ setActiveMenu(m); setPage("order"); }} style={{ background:G.white, borderRadius:16, border:`1px solid ${G.border}`, overflow:"hidden", cursor:"pointer", transition:"all 0.2s" }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 32px rgba(200,135,58,0.15)";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}>
              <div style={{ height:120, background:`linear-gradient(135deg, ${G.caramel}22 0%, ${G.caramel}44 100%)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:52 }}>🍮</span>
              </div>
              <div style={{ padding:20 }}>
                <h3 style={{ fontFamily:G.font, fontSize:20, marginBottom:4 }}>Pun&Cotta Bakery</h3>
                <p style={{ fontSize:13, color:G.muted, marginBottom:12 }}>{m.name} · {(m.recipes||[]).length} items</p>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:12, color:G.muted }}>Delivery: {m.delivery_fee} AMD</span>
                  <Badge>Open</Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}

// ─── ORDER PAGE (CUSTOMER) ────────────────────────────────────────────────────
function OrderPage({ menu, user, setPage, toast }) {
  const [qty, setQty] = useState({});
  const [delivery, setDelivery] = useState(null);
  const [address, setAddress] = useState({ street:user?.street_address||"", city:user?.city||"", zip:user?.zip||"" });
  const [submitting, setSubmitting] = useState(false);

  if (!menu) { setPage("restaurants"); return null; }

  const grouped = {};
  (menu.recipes||[]).forEach(r=>{ if(!grouped[r.category])grouped[r.category]=[]; grouped[r.category].push(r); });

  const changeQty = (rid,delta)=>setQty(p=>({...p,[rid]:Math.max(0,Math.min(20,(p[rid]||0)+delta))}));
  const items = (menu.recipes||[]).filter(r=>(qty[r.rid]||0)>0).map(r=>({ rid:r.rid, name:r.name, qty:qty[r.rid], price:r.price }));
  const itemTotal = items.reduce((s,it)=>s+it.qty*it.price, 0);
  const deliveryFee = delivery==="delivery"?menu.delivery_fee:0;
  const total = itemTotal + deliveryFee;

  const submit = async()=>{
    if (itemTotal===0) { toast("Please add items to your order","error"); return; }
    if (!delivery) { toast("Please select pickup or delivery","error"); return; }
    setSubmitting(true);
    try {
      const order = await api.placeOrder({
        mid: menu.mid, pickup: delivery==="pickup", items,
        delivery_address: delivery==="delivery" ? `${address.street}, ${address.city} ${address.zip}` : null
      });
      toast(`Order #${order.oid} placed! Check your email for confirmation.`);
      setPage("orders-cust");
    } catch(e){ toast(e.message,"error"); } finally{ setSubmitting(false); }
  };

  return (
    <Page title={menu.name} actions={<Btn variant="ghost" size="sm" onClick={()=>setPage("restaurants")}>← Restaurants</Btn>}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:24, alignItems:"start" }}>
        <div>
          {Object.entries(grouped).map(([cat,recs])=>(
            <div key={cat} style={{ marginBottom:24 }}>
              <h3 style={{ fontSize:11, fontWeight:700, color:G.muted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>{cat}</h3>
              <div style={{ background:G.white, borderRadius:14, border:`1px solid ${G.border}`, overflow:"hidden" }}>
                {recs.map((r,i)=>(
                  <div key={r.rid} style={{ padding:"14px 18px", display:"flex", alignItems:"center", gap:12, borderBottom:i<recs.length-1?`1px solid ${G.border}`:"none" }}>
                    <div style={{ flex:1 }}>
                      <p style={{ fontWeight:600, fontSize:14 }}>{r.name}</p>
                      <p style={{ fontSize:13, color:G.caramel, fontWeight:600 }}>{r.price} {r.currency}</p>
                    </div>
                    {(qty[r.rid]||0)>0&&<span style={{ fontSize:13, color:G.muted, fontWeight:600, minWidth:70, textAlign:"right" }}>{(qty[r.rid]||0)*r.price} AMD</span>}
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <button onClick={()=>changeQty(r.rid,-1)} style={{ width:28, height:28, borderRadius:6, border:`1px solid ${G.border}`, background:G.white, cursor:"pointer", fontSize:16, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                      <span style={{ minWidth:20, textAlign:"center", fontWeight:700, fontSize:14 }}>{qty[r.rid]||0}</span>
                      <button onClick={()=>changeQty(r.rid,1)} style={{ width:28, height:28, borderRadius:6, border:"none", background:G.caramel, cursor:"pointer", fontSize:16, fontWeight:700, color:G.white, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ background:G.white, borderRadius:16, border:`1px solid ${G.border}`, padding:22, position:"sticky", top:80 }}>
          <h3 style={{ fontFamily:G.font, fontSize:18, marginBottom:16 }}>Your order</h3>
          {items.length===0?<p style={{ color:G.muted, fontSize:13, marginBottom:16 }}>Add items from the menu.</p>:(
            <div style={{ marginBottom:16 }}>
              {items.map((it,i)=>(
                <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:6 }}>
                  <span>{it.qty}× {it.name}</span>
                  <span style={{ fontWeight:600 }}>{it.qty*it.price}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ borderTop:`1px solid ${G.border}`, paddingTop:14, marginBottom:14 }}>
            <p style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>Fulfillment</p>
            {[{val:"pickup",label:"Pickup (free)"},{val:"delivery",label:`Delivery (+${menu.delivery_fee} AMD)`}].map(opt=>(
              <label key={opt.val} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, cursor:"pointer", fontSize:13 }}>
                <input type="radio" name="delivery" value={opt.val} checked={delivery===opt.val} onChange={()=>setDelivery(opt.val)} style={{accentColor:G.caramel}} />
                {opt.label}
              </label>
            ))}
          </div>
          {delivery==="delivery"&&(
            <div style={{ marginBottom:14, display:"flex", flexDirection:"column", gap:8 }}>
              <Input label="Street" value={address.street} onChange={v=>setAddress(p=>({...p,street:v}))} />
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <Input label="City" value={address.city} onChange={v=>setAddress(p=>({...p,city:v}))} />
                <Input label="ZIP"  value={address.zip}  onChange={v=>setAddress(p=>({...p,zip:v}))} />
              </div>
            </div>
          )}
          <div style={{ borderTop:`1px solid ${G.border}`, paddingTop:12, marginBottom:14 }}>
            {deliveryFee>0&&<div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:G.muted, marginBottom:6 }}><span>Delivery fee</span><span>{deliveryFee} AMD</span></div>}
            <div style={{ display:"flex", justifyContent:"space-between", fontWeight:700, fontSize:16 }}>
              <span>Total</span><span style={{color:G.caramel}}>{total} AMD</span>
            </div>
          </div>
          <Btn onClick={submit} loading={submitting} style={{width:"100%"}}>Place order</Btn>
        </div>
      </div>
    </Page>
  );
}

// ─── ORDERS (CUSTOMER) ────────────────────────────────────────────────────────
function OrdersCustPage({ toast }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null);
  const [pending, setPending] = useState(null);

  const load = useCallback(async()=>{
    setLoading(true);
    try { setOrders(await api.getOrders()); }
    catch(e){ toast(e.message,"error"); } finally{ setLoading(false); }
  },[]);
  useEffect(()=>{ load(); },[]);

  const cancel = async()=>{
    try { const u=await api.cancelOrder(pending); setOrders(p=>p.map(o=>o.oid===pending?u:o)); toast(`Order #${pending} cancelled`); setDialog(null); }
    catch(e){ toast(e.message,"error"); }
  };
  const confirmDel = async(oid)=>{
    try { const u=await api.confirmDelivery(oid); setOrders(p=>p.map(o=>o.oid===oid?u:o)); toast("Order confirmed as delivered!"); }
    catch(e){ toast(e.message,"error"); }
  };

  return (
    <Page title="My Orders">
      {loading?<Spinner/>:orders.length===0?(
        <div style={{ textAlign:"center", padding:80, color:G.muted }}><p style={{ fontFamily:G.font, fontSize:22 }}>No orders yet</p></div>
      ):(
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {orders.map(o=>{
            const cfg=STATUS_CONFIG[o.status]||STATUS_CONFIG.New;
            const total=(o.items||[]).reduce((s,it)=>s+it.qty*it.price,0);
            return (
              <div key={o.oid} style={{ background:G.white, borderRadius:14, border:`1px solid ${G.border}`, padding:20 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                  <div>
                    <span style={{ fontWeight:700, fontSize:15 }}>Order #{o.oid}</span>
                    <span style={{ marginLeft:10, fontSize:12, color:G.muted }}>{new Date(o.created_at).toLocaleString()}</span>
                  </div>
                  <span style={{ padding:"4px 12px", borderRadius:20, fontSize:12, fontWeight:700, background:cfg.bg, color:cfg.color }}>{o.status}</span>
                </div>
                <div style={{ marginBottom:12 }}>
                  {(o.items||[]).map((it,i)=><div key={i} style={{fontSize:13,color:G.muted,marginBottom:2}}>{it.qty}× {it.name} — {it.qty*it.price} AMD</div>)}
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontWeight:700, color:G.caramel }}>{total} AMD · {o.pickup?"Pickup":"Delivery"}</span>
                  <div style={{ display:"flex", gap:8 }}>
                    {!["Declined","Delivered"].includes(o.status)&&<Btn variant="ghost" size="sm" onClick={()=>{setPending(o.oid);setDialog("cancel");}}>Cancel</Btn>}
                    {["Done","Dispatched"].includes(o.status)&&<Btn variant="success" size="sm" onClick={()=>confirmDel(o.oid)}>I got my order ✓</Btn>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Dialog open={dialog==="cancel"} title="Cancel order?" onConfirm={cancel} onCancel={()=>setDialog(null)}>
        Are you sure you want to cancel order #{pending}?
      </Dialog>
    </Page>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(()=>{
    try { const t=localStorage.getItem("token"); if(!t) return null; const p=JSON.parse(atob(t.split(".")[1])); return p.exp*1000>Date.now()?p:null; } catch{ return null; }
  });
  const [page, setPage] = useState(()=>user?(user.is_manufacturer?"orders-manuf":"restaurants"):"login");
  const [activeMenu, setActiveMenu] = useState(null);
  const { toasts, toast, remove } = useToast();

  const logout = ()=>{ localStorage.removeItem("token"); setUser(null); setPage("login"); };
  const onLogin = (u)=>{ setUser(u); setPage(u.is_manufacturer?"orders-manuf":"restaurants"); };

  return (
    <>
      <style>{css}</style>
      <Toast toasts={toasts} remove={remove} />
      {!user ? (
        <>
          {page==="login"  && <LoginPage  onLogin={onLogin} setPage={setPage} />}
          {page==="signup" && <SignupPage setPage={setPage} toast={toast} />}
          {page==="forgot" && <ForgotPage setPage={setPage} toast={toast} />}
          {!["login","signup","forgot"].includes(page) && <LoginPage onLogin={onLogin} setPage={setPage} />}
        </>
      ) : (
        <>
          <Nav user={user} page={page} setPage={setPage} logout={logout} />
          {page==="products"     && <ProductsPage toast={toast} />}
          {page==="recipes"      && <RecipesPage  toast={toast} />}
          {page==="menus"        && <MenusPage    toast={toast} />}
          {page==="orders-manuf" && <OrdersManufPage toast={toast} />}
          {page==="restaurants"  && <RestaurantsPage setPage={setPage} setActiveMenu={setActiveMenu} />}
          {page==="order"        && <OrderPage menu={activeMenu} user={user} setPage={setPage} toast={toast} />}
          {page==="orders-cust"  && <OrdersCustPage toast={toast} />}
        </>
      )}
    </>
  );
}
