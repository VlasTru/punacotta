import { useState, useEffect, useCallback, useRef } from "react";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { api } from "./api.js";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const G = {
  font: "'Playfair Display', Georgia, serif",
  mono: "'DM Sans', system-ui, sans-serif",
  cream: "#faf6f0", sand: "#f0e8d8", caramel: "#c8873a",
  dark: "#2c1810", muted: "#8b7355", border: "#e8dcc8",
  white: "#ffffff", red: "#d63031", green: "#00b894",
};

const CURRENCIES = ["AMD","RUR","USD","EUR"];

const STATUS_CONFIG = {
  New:        { color:"#22c55e", bg:"#f0fdf4", next:"Accept",               canDecline:true },
  Accepted:   { color:"#eab308", bg:"#fefce8", next:"Start Preparing",      canDecline:true },
  Preparing:  { color:"#f97316", bg:"#fff7ed", next:"Mark as Done",         canDecline:true },
  Done:       { color:"#22c55e", bg:"#f0fdf4", next:"Dispatch",             canDecline:true },
  Dispatched: { color:"#15803d", bg:"#dcfce7", next:"Confirm as Delivered", canDecline:true },
  Declined:   { color:"#ef4444", bg:"#fef2f2", next:null,                   canDecline:false },
  Delivered:  { color:"#0d9488", bg:"#f0fdfa", next:null,                   canDecline:false },
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
  @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideIn { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }
  @keyframes toastIn { from{opacity:0;transform:translateY(20px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes spin { to{transform:rotate(360deg)} }
  .recipe-thumb:hover .zoom-icon { opacity:1 !important; }
  .recipe-link:hover { text-decoration:underline; }
  .drop-zone { border:2px dashed ${G.border}; border-radius:10px; padding:24px; text-align:center; cursor:pointer; transition:all 0.2s; }
  .drop-zone:hover, .drop-zone.drag-over { border-color:${G.caramel}; background:#fef9f4; }
`;

// ─── TOAST ────────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = (msg, type="info") => {
    const id = Date.now() + Math.random();
    setToasts(p=>[...p,{id,msg,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)), 5000);
  };
  const remove = id => setToasts(p=>p.filter(t=>t.id!==id));
  return { toasts, toast:add, remove };
}

function Toast({ toasts, remove }) {
  return (
    <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999, display:"flex", flexDirection:"column", gap:10 }}>
      {toasts.map(t=>(
        <div key={t.id} style={{ background:G.dark, color:G.white, padding:"12px 18px", borderRadius:10, fontSize:14, maxWidth:320, display:"flex", alignItems:"center", gap:12, animation:"toastIn 0.3s ease", boxShadow:"0 8px 24px rgba(44,24,16,0.25)", borderLeft:`3px solid ${t.type==="error"?G.red:G.caramel}` }}>
          <span style={{flex:1}}>{t.msg}</span>
          <button onClick={()=>remove(t.id)} style={{ background:"none", border:"none", color:G.muted, cursor:"pointer", fontSize:18, lineHeight:1 }}>×</button>
        </div>
      ))}
    </div>
  );
}

// ─── DIALOG ───────────────────────────────────────────────────────────────────
function Dialog({ open, title, children, onConfirm, onCancel, confirmLabel="Yes", danger=true }) {
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(44,24,16,0.45)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:G.white, borderRadius:16, padding:32, maxWidth:440, width:"90%", animation:"fadeIn 0.2s ease", boxShadow:"0 20px 60px rgba(44,24,16,0.2)" }}>
        <h3 style={{ fontFamily:G.font, fontSize:20, marginBottom:16 }}>{title}</h3>
        <div style={{ color:G.muted, lineHeight:1.6, marginBottom:24, fontSize:15 }}>{children}</div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
          <Btn variant={danger?"danger":"primary"} onClick={onConfirm}>{confirmLabel}</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── LIGHTBOX ─────────────────────────────────────────────────────────────────
function Lightbox({ src, description, onClose }) {
  if (!src) return null;
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:2000, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div onClick={e=>e.stopPropagation()} style={{ maxWidth:"90vw", maxHeight:"90vh", display:"flex", flexDirection:"column", gap:12 }}>
        <img src={src} alt="" style={{ maxWidth:"100%", maxHeight:"75vh", objectFit:"contain", borderRadius:8 }} />
        {description&&<p style={{ color:"rgba(255,255,255,0.8)", fontSize:14, textAlign:"center" }}>{description}</p>}
        <button onClick={onClose} style={{ background:"none", border:"1px solid rgba(255,255,255,0.3)", color:"white", padding:"8px 20px", borderRadius:8, cursor:"pointer", fontFamily:G.mono, alignSelf:"center" }}>Close</button>
      </div>
    </div>
  );
}

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────
function Btn({ children, onClick, variant="primary", disabled, size="md", style:s, loading, title }) {
  const base = { border:"none", borderRadius:8, cursor:disabled||loading?"not-allowed":"pointer", fontFamily:G.mono, fontWeight:600, transition:"all 0.15s", opacity:disabled||loading?0.6:1, fontSize:size==="sm"?13:size==="lg"?16:14, padding:size==="sm"?"6px 14px":size==="lg"?"14px 28px":"9px 20px" };
  const variants = { primary:{background:G.caramel,color:G.white}, secondary:{background:G.sand,color:G.dark,border:`1px solid ${G.border}`}, ghost:{background:"transparent",color:G.muted,border:`1px solid ${G.border}`}, danger:{background:G.red,color:G.white}, success:{background:G.green,color:G.white} };
  return <button title={title} onClick={disabled||loading?undefined:onClick} style={{...base,...variants[variant],...s}}>{loading?"…":children}</button>;
}

function Input({ label, type="text", value, onChange, placeholder, required, hint, error, style:s, disabled }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      {label&&<label style={{ fontSize:13, fontWeight:600, color:G.dark }}>{label}{required&&<span style={{color:G.caramel}}> *</span>}</label>}
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
        style={{ padding:"10px 14px", borderRadius:8, border:`1px solid ${error?G.red:G.border}`, background:disabled?G.sand:G.white, fontSize:14, color:G.dark, outline:"none", width:"100%", ...s }}
        onFocus={e=>e.target.style.borderColor=G.caramel} onBlur={e=>e.target.style.borderColor=error?G.red:G.border}
      />
      {hint&&<span style={{ fontSize:12, color:G.muted }}>{hint}</span>}
      {error&&<span style={{ fontSize:12, color:G.red }}>{error}</span>}
    </div>
  );
}

function Select({ label, value, onChange, options, placeholder, required, style:s }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      {label&&<label style={{ fontSize:13, fontWeight:600, color:G.dark }}>{label}{required&&<span style={{color:G.caramel}}> *</span>}</label>}
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{ padding:"10px 14px", borderRadius:8, border:`1px solid ${G.border}`, background:G.white, fontSize:14, color:value?G.dark:G.muted, outline:"none", cursor:"pointer", width:"100%", ...s }}
        onFocus={e=>e.target.style.borderColor=G.caramel} onBlur={e=>e.target.style.borderColor=G.border}
      >
        {placeholder&&<option value="">{placeholder}</option>}
        {options.map(o=>typeof o==="string"?<option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>:<option key={o.value} value={o.value}>{o.label}</option>)}
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

// ─── IMAGE UPLOADER + CROP ────────────────────────────────────────────────────
function ImageUploader({ existingUrl, existingThumb, onImageReady, onRemove }) {
  const [src, setSrc] = useState(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const [dragging, setDragging] = useState(false);
  const imgRef = useRef(null);
  const fileRef = useRef(null);

  const loadFile = file => {
    if (!file) return;
    if (!["image/jpeg","image/jpg","image/png"].includes(file.type)) { alert("Only JPG, JPEG and PNG allowed."); return; }
    if (file.size > 3*1024*1024) { alert("File exceeds 3MB limit."); return; }
    const reader = new FileReader();
    reader.onload = e => setSrc(e.target.result);
    reader.readAsDataURL(file);
  };

  const onDrop = e => { e.preventDefault(); setDragging(false); loadFile(e.dataTransfer.files[0]); };

  const buildBlob = useCallback(() => {
    if (!imgRef.current || !completedCrop || completedCrop.width===0) { onImageReady(null); return; }
    const canvas = document.createElement("canvas");
    const img = imgRef.current;
    const sx = img.naturalWidth / img.width;
    const sy = img.naturalHeight / img.height;
    canvas.width  = completedCrop.width  * sx;
    canvas.height = completedCrop.height * sy;
    canvas.getContext("2d").drawImage(img, completedCrop.x*sx, completedCrop.y*sy, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => onImageReady(blob), "image/jpeg", 0.92);
  }, [completedCrop]);

  useEffect(() => { buildBlob(); }, [completedCrop]);

  if (src) return (
    <div>
      <p style={{ fontSize:13, color:G.muted, marginBottom:8 }}>Select the area to crop:</p>
      <ReactCrop crop={crop} onChange={c=>setCrop(c)} onComplete={c=>setCompletedCrop(c)}>
        <img ref={imgRef} src={src} style={{ maxWidth:"100%", maxHeight:280 }} alt="crop" />
      </ReactCrop>
      <div style={{ display:"flex", gap:8, marginTop:10, alignItems:"center" }}>
        <Btn variant="secondary" size="sm" onClick={()=>{setSrc(null);setCrop(undefined);setCompletedCrop(null);onImageReady(null);}}>Clear</Btn>
        <span style={{ fontSize:12, color:G.muted }}>Crop will be applied on save</span>
      </div>
    </div>
  );

  if (existingThumb||existingUrl) return (
    <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
      <img src={existingThumb||existingUrl} alt="" style={{ width:56, height:56, objectFit:"cover", borderRadius:8, border:`1px solid ${G.border}` }} />
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        <p style={{ fontSize:13, fontWeight:600 }}>Current image</p>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={()=>fileRef.current?.click()} style={{ background:"none", border:"none", color:G.caramel, cursor:"pointer", fontSize:13, padding:0, fontFamily:G.mono }}>Replace</button>
          <span style={{ color:G.border }}>·</span>
          <button onClick={onRemove} style={{ background:"none", border:"none", color:G.red, cursor:"pointer", fontSize:13, padding:0, fontFamily:G.mono }}>Remove</button>
        </div>
      </div>
      <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png" style={{display:"none"}} onChange={e=>loadFile(e.target.files[0])} />
    </div>
  );

  return (
    <div className={`drop-zone${dragging?" drag-over":""}`}
      onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)}
      onDrop={onDrop} onClick={()=>fileRef.current?.click()}>
      <p style={{ fontSize:13, color:G.muted, marginBottom:4 }}>Drop image here or <span style={{color:G.caramel,fontWeight:600}}>Browse</span></p>
      <p style={{ fontSize:11, color:G.muted }}>(3MB max · JPG, JPEG, PNG)</p>
      <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png" style={{display:"none"}} onChange={e=>loadFile(e.target.files[0])} />
    </div>
  );
}

// ─── RECIPE FORM (shared New + Edit) ─────────────────────────────────────────
function RecipeForm({ initial, lookups, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    name:"", description:"", unid:"", caid:"", price:"", currency:"AMD",
    available:true, deliverable:true, image_url:null, image_thumb_url:null,
    ...initial
  });
  const [imageBlob, setImageBlob] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <Input label="Name" value={form.name} onChange={v=>set("name",v)} required />
        <Input label="Description" value={form.description||""} onChange={v=>set("description",v)} />
        <Select label="Units" value={String(form.unid||"")} onChange={v=>set("unid",v)} options={lookups.units.map(u=>({value:String(u.unid),label:u.name}))} placeholder="Select units" />
        <Select label="Category" value={String(form.caid||"")} onChange={v=>set("caid",v)} options={lookups.categories.map(c=>({value:String(c.caid),label:c.name}))} placeholder="Select category" />
        <Input label="Price" type="number" value={String(form.price||"")} onChange={v=>set("price",v)} placeholder="0" />
        <Select label="Currency" value={form.currency||"AMD"} onChange={v=>set("currency",v)} options={CURRENCIES} />
      </div>

      <div>
        <label style={{ fontSize:13, fontWeight:600, color:G.dark, display:"block", marginBottom:8 }}>Image</label>
        <ImageUploader
          existingUrl={form.image_url} existingThumb={form.image_thumb_url}
          onImageReady={blob=>{ setImageBlob(blob); if(blob) setRemoveImage(false); }}
          onRemove={()=>{ setRemoveImage(true); set("image_url",null); set("image_thumb_url",null); }}
        />
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:14, cursor:"pointer" }}>
          <input type="checkbox" checked={form.available!==false} onChange={e=>set("available",e.target.checked)} style={{accentColor:G.caramel}} />
          Available (can be added to a menu)
        </label>
        <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:14, cursor:"pointer" }}>
          <input type="checkbox" checked={form.deliverable!==false} onChange={e=>set("deliverable",e.target.checked)} style={{accentColor:G.caramel}} />
          Deliverable (uncheck for pickup-only items)
        </label>
      </div>

      <div style={{ display:"flex", gap:10 }}>
        <Btn size="sm" onClick={()=>onSave(form, imageBlob, removeImage)} loading={saving}>Save</Btn>
        <Btn variant="ghost" size="sm" onClick={onCancel}>Cancel</Btn>
      </div>
    </div>
  );
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
function Nav({ user, page, setPage, logout }) {
  const isM = user?.is_manufacturer;
  const [dropOpen, setDropOpen] = useState(false);
  const links = isM
    ? [{key:"orders-manuf",label:"Orders"},{key:"products",label:"Products"},{key:"recipes",label:"Recipes"},{key:"menus",label:"Menus"}]
    : [{key:"restaurants",label:"Restaurants"},{key:"orders-cust",label:"My Orders"}];

  const navigate = key => { setPage(key); setDropOpen(false); };

  return (
    <nav style={{ background:G.white, borderBottom:`1px solid ${G.border}`, padding:"0 32px", display:"flex", alignItems:"center", height:60, position:"sticky", top:0, zIndex:100, boxShadow:"0 1px 12px rgba(44,24,16,0.06)" }}>
      <button onClick={()=>navigate(isM?"orders-manuf":"restaurants")} style={{ fontFamily:G.font, fontSize:22, fontWeight:700, color:G.caramel, background:"none", border:"none", cursor:"pointer", marginRight:32, fontStyle:"italic" }}>Pun&Cotta</button>
      <div style={{ display:"flex", gap:4, flex:1 }}>
        {links.map(l=>(
          <button key={l.key} onClick={()=>navigate(l.key)} style={{ background:page===l.key?G.sand:"none", border:"none", padding:"6px 14px", borderRadius:8, fontFamily:G.mono, fontSize:14, fontWeight:page===l.key?600:400, color:page===l.key?G.caramel:G.muted, cursor:"pointer", transition:"all 0.15s" }}>{l.label}</button>
        ))}
      </div>
      <div style={{ position:"relative" }}>
        <button onClick={()=>setDropOpen(p=>!p)} style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", fontFamily:G.mono, fontSize:13, color:G.muted, padding:"6px 10px", borderRadius:8 }}>
          {user?.first_name} {user?.last_name}
          <span style={{ fontSize:10, opacity:0.6 }}>▾</span>
        </button>
        {dropOpen&&(
          <>
            <div onClick={()=>setDropOpen(false)} style={{ position:"fixed", inset:0, zIndex:149 }} />
            <div style={{ position:"absolute", right:0, top:"calc(100% + 6px)", background:G.white, border:`1px solid ${G.border}`, borderRadius:10, boxShadow:"0 8px 24px rgba(44,24,16,0.12)", minWidth:160, zIndex:150, overflow:"hidden", animation:"fadeIn 0.15s ease" }}>
              {isM&&(
                <button onClick={()=>navigate("schedule")} style={{ width:"100%", textAlign:"left", padding:"10px 16px", background:"none", border:"none", cursor:"pointer", fontFamily:G.mono, fontSize:14, color:G.dark }}
                  onMouseEnter={e=>e.currentTarget.style.background=G.sand} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                  🕐 Schedule
                </button>
              )}
              <div style={{ height:1, background:G.border }} />
              <button onClick={()=>{logout();setDropOpen(false);}} style={{ width:"100%", textAlign:"left", padding:"10px 16px", background:"none", border:"none", cursor:"pointer", fontFamily:G.mono, fontSize:14, color:G.red }}
                onMouseEnter={e=>e.currentTarget.style.background=G.sand} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                Log out
              </button>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}

function Page({ children, title, actions }) {
  return (
    <div style={{ maxWidth:1100, margin:"0 auto", padding:"36px 24px", animation:"fadeIn 0.3s ease" }}>
      {(title||actions)&&(
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28 }}>
          {title&&<h1 style={{ fontFamily:G.font, fontSize:28, fontWeight:700 }}>{title}</h1>}
          {actions&&<div style={{ display:"flex", gap:10 }}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// ─── AUTH PAGES ───────────────────────────────────────────────────────────────
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

function LoginPage({ onLogin, setPage }) {
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  const submit = async() => { setErr(""); setLoading(true); try { const {token,user}=await api.login(email,pw); localStorage.setItem("token",token); onLogin(user); } catch(e){setErr(e.message);} finally{setLoading(false);} };
  return (
    <AuthLayout>
      <h2 style={{ fontFamily:G.font, fontSize:22, marginBottom:24 }}>Welcome back</h2>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required />
        <Input label="Password" type="password" value={pw} onChange={setPw} placeholder="••••••••" required error={err} />
        <Btn size="lg" onClick={submit} loading={loading}>Log in</Btn>
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          <button onClick={()=>setPage("forgot")} style={{ background:"none", border:"none", color:G.caramel, cursor:"pointer", fontSize:13 }}>Forgot password?</button>
          <button onClick={()=>setPage("signup")} style={{ background:"none", border:"none", color:G.muted, cursor:"pointer", fontSize:13 }}>Create account →</button>
        </div>
        <div style={{ marginTop:8, padding:12, background:G.sand, borderRadius:8, fontSize:12, color:G.muted, lineHeight:1.7 }}>
          <b>Demo:</b> sophie@example.com / password &nbsp;|&nbsp; arman@puncotta.com / password
        </div>
      </div>
    </AuthLayout>
  );
}

function SignupPage({ setPage, toast }) {
  const [form, setForm] = useState({ first_name:"", last_name:"", email:"", phone:"", street_address:"", city:"", zip:"", password:"", is_manufacturer:false, business_name:"" });
  const [errors, setErrors] = useState({}); const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const submit = async() => {
    const e = {};
    if (!form.first_name) e.first_name="Required"; if (!form.last_name) e.last_name="Required"; if (!form.email) e.email="Required";
    if (!form.password||form.password.trim().length<6) e.password="Min 6 characters";
    if (form.is_manufacturer&&!form.business_name) e.business_name="Required for manufacturers";
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try { await api.register(form); toast("Account created! Check your email."); setPage("login"); }
    catch(err){ if(err.message.includes("already exists")) setErrors({email:err.message}); else toast(err.message,"error"); }
    finally { setLoading(false); }
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
        {form.is_manufacturer&&<Input label="Business name" value={form.business_name} onChange={v=>set("business_name",v)} required error={errors.business_name} />}
        <Btn size="lg" onClick={submit} loading={loading} style={{marginTop:4}}>Create account</Btn>
        <button onClick={()=>setPage("login")} style={{ background:"none", border:"none", color:G.muted, cursor:"pointer", fontSize:13, textAlign:"center" }}>Already have an account? Log in →</button>
      </div>
    </AuthLayout>
  );
}

function ForgotPage({ setPage, toast }) {
  const [email, setEmail] = useState(""); const [loading, setLoading] = useState(false);
  const submit = async() => { setLoading(true); try { await api.forgot(email); toast("Recovery link sent!"); setPage("login"); } catch(e){toast(e.message,"error");} finally{setLoading(false);} };
  return (
    <AuthLayout>
      <h2 style={{ fontFamily:G.font, fontSize:22, marginBottom:8 }}>Reset password</h2>
      <p style={{ color:G.muted, fontSize:14, marginBottom:24, lineHeight:1.6 }}>Enter your email and we'll send a recovery link valid for 1 hour.</p>
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
  const allSel = rows.length>0 && rows.every(r=>selected.includes(r._id));
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
          {rows.length===0?(
            <tr><td colSpan={columns.length+1} style={{ padding:40, textAlign:"center", color:G.muted, fontSize:14 }}>No items yet.</td></tr>
          ):rows.map((r,i)=>(
            <tr key={r._id} style={{ borderBottom:i<rows.length-1?`1px solid ${G.border}`:"none", background:selected.includes(r._id)?"#fef9f4":"transparent", transition:"background 0.1s" }}>
              <td style={{ padding:"12px 16px" }}><input type="checkbox" checked={selected.includes(r._id)} onChange={()=>onSelect(r._id)} style={{ cursor:"pointer", accentColor:G.caramel }} /></td>
              {columns.map(c=>(
                <td key={c.key} style={{ padding:"12px 16px", fontSize:14, verticalAlign:"middle" }}>
                  {c.render?c.render(r):r[c.key]}
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
  const [products, setProducts] = useState([]); const [lookups, setLookups] = useState({units:[],categories:[]}); const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]); const [sortKey, setSortKey] = useState("name"); const [sortDir, setSortDir] = useState("asc");
  const [showForm, setShowForm] = useState(false); const [dialog, setDialog] = useState(null); const [form, setForm] = useState({name:"",unid:"",caid:""}); const [saving, setSaving] = useState(false);
  const load = useCallback(async()=>{ setLoading(true); try{ const[p,l]=await Promise.all([api.getProducts(),api.getProductLookups()]); setProducts(p); setLookups(l); } catch(e){toast(e.message,"error");} finally{setLoading(false);} },[]);
  useEffect(()=>{load();},[]);
  const sorted=[...products].sort((a,b)=>{ const v=String(a[sortKey]||"")<String(b[sortKey]||"")?-1:String(a[sortKey]||"")>String(b[sortKey]||"")?1:0; return sortDir==="asc"?v:-v; });
  const toggleSort=k=>{if(sortKey===k)setSortDir(d=>d==="asc"?"desc":"asc");else{setSortKey(k);setSortDir("asc");}};
  const toggleSel=id=>setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const save=async()=>{ if(!form.name.trim())return; setSaving(true); try{ const p=await api.createProduct({name:form.name,unid:form.unid||null,caid:form.caid||null}); setProducts(prev=>[...prev,p]); toast(`"${p.name}" saved`); setForm({name:"",unid:"",caid:""}); setShowForm(false); } catch(e){toast(e.message,"error");} finally{setSaving(false);} };
  const doDelete=async()=>{ const names=selected.map(id=>products.find(p=>p.pid===id)?.name).filter(Boolean).join(", "); try{ await api.deleteProducts(selected); setProducts(prev=>prev.filter(p=>!selected.includes(p.pid))); toast(`${names} deleted`); setSelected([]); setDialog(null); } catch(e){toast(e.message,"error");} };
  const cols=[ {key:"pid",label:"ID",sortable:true,render:r=><span style={{color:G.muted,fontSize:13}}>#{r._id}</span>}, {key:"name",label:"Name",sortable:true}, {key:"category",label:"Category",sortable:true,render:r=>r.category?<Badge>{r.category}</Badge>:<span style={{color:G.muted}}>—</span>}, {key:"units",label:"Units",sortable:false,render:r=>r.units||<span style={{color:G.muted}}>—</span>} ];
  return (
    <Page title="Products" actions={<>{selected.length>0&&<Btn variant="danger" size="sm" onClick={()=>setDialog("del")}>Delete ({selected.length})</Btn>}<Btn size="sm" onClick={()=>setShowForm(s=>!s)}>+ New product</Btn></>}>
      {showForm&&(
        <div style={{ background:G.white, border:`1px solid ${G.border}`, borderRadius:14, padding:24, marginBottom:20, animation:"fadeIn 0.2s ease" }}>
          <h3 style={{ fontFamily:G.font, fontSize:17, marginBottom:16 }}>New Product</h3>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:14 }}>
            <Input label="Name" value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} required />
            <Select label="Units" value={form.unid} onChange={v=>setForm(p=>({...p,unid:v}))} options={lookups.units.map(u=>({value:String(u.unid),label:u.name}))} placeholder="Select units" />
            <Select label="Category" value={form.caid} onChange={v=>setForm(p=>({...p,caid:v}))} options={lookups.categories.map(c=>({value:String(c.caid),label:c.name}))} placeholder="Select category" />
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <Btn size="sm" onClick={save} loading={saving}>Save</Btn>
            <Btn variant="ghost" size="sm" onClick={()=>setShowForm(false)}>Cancel</Btn>
          </div>
        </div>
      )}
      {loading?<Spinner/>:<DataTable columns={cols} rows={sorted.map(p=>({...p,_id:p.pid}))} selected={selected} onSelect={toggleSel} onSelectAll={setSelected} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />}
      <Dialog open={dialog==="del"} title="Delete products?" onConfirm={doDelete} onCancel={()=>setDialog(null)}>
        Are you sure you wish to delete <b>{selected.map(id=>products.find(p=>p.pid===id)?.name).filter(Boolean).join(", ")}</b>?
      </Dialog>
    </Page>
  );
}

// ─── RECIPES PAGE ─────────────────────────────────────────────────────────────
function RecipesPage({ toast }) {
  const [recipes, setRecipes] = useState([]); const [lookups, setLookups] = useState({units:[],categories:[]}); const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]); const [sortKey, setSortKey] = useState("name"); const [sortDir, setSortDir] = useState("asc");
  const [showNew, setShowNew] = useState(false); const [editRecipe, setEditRecipe] = useState(null);
  const [dialog, setDialog] = useState(null); const [saving, setSaving] = useState(false); const [lightbox, setLightbox] = useState(null);

  const BLANK = { name:"", description:"", unid:"", caid:"", price:"", currency:"AMD", available:true, deliverable:true, image_url:null, image_thumb_url:null };

  const load = useCallback(async()=>{ setLoading(true); try{ const[r,l]=await Promise.all([api.getRecipes(),api.getRecipeLookups()]); setRecipes(r); setLookups(l); } catch(e){toast(e.message,"error");} finally{setLoading(false);} },[]);
  useEffect(()=>{load();},[]);

  const sorted=[...recipes].sort((a,b)=>{ const v=String(a[sortKey]||"")<String(b[sortKey]||"")?-1:String(a[sortKey]||"")>String(b[sortKey]||"")?1:0; return sortDir==="asc"?v:-v; });
  const toggleSort=k=>{if(sortKey===k)setSortDir(d=>d==="asc"?"desc":"asc");else{setSortKey(k);setSortDir("asc");}};
  const toggleSel=id=>setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);

  const handleSave = async(form, imageBlob, removeImage, existingRid) => {
    if (!form.name?.trim()) return;
    setSaving(true);
    try {
      let image_url = form.image_url || null;
      let image_thumb_url = form.image_thumb_url || null;

      if (imageBlob) {
        const fd = new FormData();
        fd.append("image", imageBlob, "recipe.jpg");
        if (existingRid) fd.append("rid", String(existingRid));
        const res = await api.uploadImage(fd);
        image_url = res.url; image_thumb_url = res.thumb_url;
      } else if (removeImage && existingRid) {
        await api.removeImage(existingRid);
        image_url = null; image_thumb_url = null;
      }

      const payload = { name:form.name, description:form.description||null, unid:form.unid||null, caid:form.caid||null, price:Number(form.price)||0, currency:form.currency||"AMD", available:form.available!==false, deliverable:form.deliverable!==false, image_url, image_thumb_url };

      if (existingRid) {
        const updated = await api.updateRecipe(existingRid, payload);
        setRecipes(prev=>prev.map(r=>r.rid===existingRid?updated:r));
        toast(`"${updated.name}" saved`); setEditRecipe(null);
      } else {
        const r = await api.createRecipe(payload);
        setRecipes(prev=>[...prev,r]); toast(`"${r.name}" saved`); setShowNew(false);
      }
    } catch(e){toast(e.message,"error");} finally{setSaving(false);}
  };

  const doDelete=async()=>{ const names=selected.map(id=>recipes.find(r=>r.rid===id)?.name).filter(Boolean).join(", "); try{ await api.deleteRecipes(selected); setRecipes(prev=>prev.filter(r=>!selected.includes(r.rid))); toast(`${names} deleted`); setSelected([]); setDialog(null); } catch(e){toast(e.message,"error");} };

  const Thumb = ({r}) => {
    const src = r.image_thumb_url||r.image_url;
    if (!src) return <span style={{color:G.muted,fontSize:12}}>—</span>;
    return (
      <div className="recipe-thumb" style={{ position:"relative", width:40, height:40, cursor:"pointer", borderRadius:6, overflow:"hidden" }} onClick={()=>setLightbox({src:r.image_url||r.image_thumb_url,description:r.description})}>
        <img src={src} alt="" style={{ width:40, height:40, objectFit:"cover" }} />
        <div className="zoom-icon" style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.35)", display:"flex", alignItems:"center", justifyContent:"center", opacity:0, transition:"opacity 0.2s" }}>
          <span style={{fontSize:14}}>🔍</span>
        </div>
      </div>
    );
  };

  const cols = [
    {key:"rid",label:"ID",sortable:true,render:r=><span style={{color:G.muted,fontSize:13}}>#{r._id}</span>},
    {key:"img",label:"Image",sortable:false,render:r=><Thumb r={r}/>},
    {key:"name",label:"Name",sortable:true,render:r=>(
      <button className="recipe-link" onClick={()=>setEditRecipe(r)} style={{ background:"none", border:"none", cursor:"pointer", fontFamily:G.mono, fontSize:14, color:G.dark, padding:0, textAlign:"left" }}>{r.name}</button>
    )},
    {key:"description",label:"Description",sortable:true,render:r=>r.description||<span style={{color:G.muted}}>—</span>},
    {key:"units",label:"Units",sortable:false,render:r=>r.units||"—"},
    {key:"available",label:"Avail.",sortable:false,render:r=><span>{r.available?"✅":"❌"}</span>},
    {key:"deliverable",label:"Deliv.",sortable:false,render:r=><span>{r.deliverable!==false?"✅":"❌"}</span>},
    {key:"price",label:"Price",sortable:false,render:r=><span style={{fontWeight:600}}>{r.price} {r.currency}</span>},
    {key:"category",label:"Category",sortable:true,render:r=>r.category?<Badge>{r.category}</Badge>:<span style={{color:G.muted}}>—</span>},
  ];

  return (
    <Page title="Recipes" actions={<>{selected.length>0&&<Btn variant="danger" size="sm" onClick={()=>setDialog("del")}>Delete ({selected.length})</Btn>}<Btn size="sm" onClick={()=>setShowNew(s=>!s)}>+ New recipe</Btn></>}>
      {showNew&&(
        <div style={{ background:G.white, border:`1px solid ${G.border}`, borderRadius:14, padding:24, marginBottom:20, animation:"fadeIn 0.2s ease" }}>
          <h3 style={{ fontFamily:G.font, fontSize:17, marginBottom:16 }}>New Recipe</h3>
          <RecipeForm initial={BLANK} lookups={lookups} saving={saving} onSave={(f,b,r)=>handleSave(f,b,r,null)} onCancel={()=>setShowNew(false)} />
        </div>
      )}
      {loading?<Spinner/>:<DataTable columns={cols} rows={sorted.map(r=>({...r,_id:r.rid}))} selected={selected} onSelect={toggleSel} onSelectAll={setSelected} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />}

      {/* EDIT MODAL */}
      {editRecipe&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(44,24,16,0.45)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:G.white, borderRadius:16, padding:32, maxWidth:640, width:"100%", maxHeight:"90vh", overflowY:"auto", animation:"fadeIn 0.2s ease", boxShadow:"0 20px 60px rgba(44,24,16,0.2)" }}>
            <h3 style={{ fontFamily:G.font, fontSize:20, marginBottom:20 }}>Edit Recipe</h3>
            <RecipeForm initial={editRecipe} lookups={lookups} saving={saving} onSave={(f,b,r)=>handleSave(f,b,r,editRecipe.rid)} onCancel={()=>setEditRecipe(null)} />
          </div>
        </div>
      )}

      <Dialog open={dialog==="del"} title="Delete recipes?" onConfirm={doDelete} onCancel={()=>setDialog(null)}>
        Are you sure you wish to delete <b>{selected.map(id=>recipes.find(r=>r.rid===id)?.name).filter(Boolean).join(", ")}</b>?
      </Dialog>
      <Lightbox src={lightbox?.src} description={lightbox?.description} onClose={()=>setLightbox(null)} />
    </Page>
  );
}

// ─── MENU CALENDAR ────────────────────────────────────────────────────────────
const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
const DAY_LABELS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

// Default store hours — replaced by Working Hours feature when built
const DEFAULT_STORE = {
  monday:    [{start:"09:00",end:"21:00"}],
  tuesday:   [{start:"09:00",end:"21:00"}],
  wednesday: [{start:"09:00",end:"21:00"}],
  thursday:  [{start:"09:00",end:"21:00"}],
  friday:    [{start:"09:00",end:"21:00"}],
  saturday:  [{start:"10:00",end:"18:00"}],
  sunday:    [],
};

const MENU_COLORS = [
  {bg:"#dbeafe",border:"#3b82f6",text:"#1d4ed8"},
  {bg:"#dcfce7",border:"#22c55e",text:"#15803d"},
  {bg:"#fef9c3",border:"#eab308",text:"#854d0e"},
  {bg:"#fce7f3",border:"#ec4899",text:"#9d174d"},
  {bg:"#ede9fe",border:"#8b5cf6",text:"#5b21b6"},
  {bg:"#ffedd5",border:"#f97316",text:"#9a3412"},
];

function timeToMins(t) {
  if (!t) return 0;
  const [h,m] = t.split(":").map(Number);
  return h*60+(m||0);
}

function MenuCalendar({ menus, storeSchedule=DEFAULT_STORE }) {
  const START_H = 7, END_H = 23, TOTAL = (END_H-START_H)*60;
  const colW = 110, rowH = 48, labelW = 52;

  const menusWithHours = menus.filter(m=>m.hours_from&&m.hours_until&&m.hours_days?.length);

  return (
    <div style={{ background:G.white, borderRadius:14, border:`1px solid ${G.border}`, overflow:"hidden", marginTop:32 }}>
      <div style={{ padding:"16px 20px", borderBottom:`1px solid ${G.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <h3 style={{ fontFamily:G.font, fontSize:17 }}>Weekly Schedule</h3>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {menusWithHours.map((m,i)=>{
            const c=MENU_COLORS[i%MENU_COLORS.length];
            return <span key={m.mid} style={{ fontSize:12, padding:"3px 10px", borderRadius:20, background:c.bg, color:c.text, border:`1px solid ${c.border}`, fontWeight:600 }}>{m.name}</span>;
          })}
        </div>
      </div>
      <div style={{ overflowX:"auto" }}>
        <div style={{ minWidth: labelW + colW*7, position:"relative" }}>
          {/* Header row */}
          <div style={{ display:"flex", borderBottom:`1px solid ${G.border}` }}>
            <div style={{ width:labelW, flexShrink:0 }} />
            {DAYS.map((d,i)=>(
              <div key={d} style={{ width:colW, flexShrink:0, padding:"8px 0", textAlign:"center", fontSize:12, fontWeight:700, color:G.muted, letterSpacing:"0.04em", borderLeft:`1px solid ${G.border}` }}>
                {DAY_LABELS[i]}
              </div>
            ))}
          </div>

          {/* Grid body */}
          <div style={{ position:"relative" }}>
            {/* Hour grid lines + labels */}
            {Array.from({length:END_H-START_H+1},(_,i)=>i).map(i=>{
              const pct=(i*60/TOTAL)*100;
              return (
                <div key={i} style={{ position:"absolute", top:`${pct}%`, left:0, right:0, display:"flex", pointerEvents:"none" }}>
                  <div style={{ width:labelW, flexShrink:0, textAlign:"right", paddingRight:8, fontSize:10, color:G.muted, transform:"translateY(-50%)" }}>{String(START_H+i).padStart(2,"0")}:00</div>
                  <div style={{ flex:1, borderTop:`1px solid ${G.border}`, opacity:0.5 }} />
                </div>
              );
            })}

            {/* Day columns */}
            <div style={{ display:"flex", height: (END_H-START_H)*rowH }}>
              <div style={{ width:labelW, flexShrink:0 }} />
              {DAYS.map((day,di)=>{
                const storePeriods = storeSchedule[day]||[];
                return (
                  <div key={day} style={{ width:colW, flexShrink:0, position:"relative", borderLeft:`1px solid ${G.border}` }}>
                    {/* Outside-store-hours hatching */}
                    {storePeriods.length===0?(
                      <div style={{ position:"absolute", inset:0, background:"repeating-linear-gradient(45deg,rgba(0,0,0,0.04),rgba(0,0,0,0.04) 4px,transparent 4px,transparent 10px)" }} />
                    ):(()=>{
                      const open=timeToMins(storePeriods[0].start)-START_H*60;
                      const close=timeToMins(storePeriods[storePeriods.length-1].end)-START_H*60;
                      const pOpen=(open/TOTAL)*100, pClose=(close/TOTAL)*100;
                      return <>
                        <div style={{ position:"absolute", top:0, left:0, right:0, height:`${Math.max(0,pOpen)}%`, background:"repeating-linear-gradient(45deg,rgba(0,0,0,0.04),rgba(0,0,0,0.04) 4px,transparent 4px,transparent 10px)" }} />
                        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:`${Math.max(0,100-pClose)}%`, background:"repeating-linear-gradient(45deg,rgba(0,0,0,0.04),rgba(0,0,0,0.04) 4px,transparent 4px,transparent 10px)" }} />
                      </>;
                    })()}

                    {/* Menu availability blocks */}
                    {menusWithHours.map((m,mi)=>{
                      if (!m.hours_days?.includes(day)) return null;
                      const c=MENU_COLORS[mi%MENU_COLORS.length];
                      const fromMins=timeToMins(m.hours_from)-START_H*60;
                      const toMins=timeToMins(m.hours_until)-START_H*60;
                      const top=(Math.max(0,fromMins)/TOTAL)*100;
                      const height=((toMins-fromMins)/TOTAL)*100;
                      return (
                        <div key={m.mid} style={{
                          position:"absolute", left:3, right:3,
                          top:`${top}%`, height:`${height}%`,
                          background:c.bg, border:`1px solid ${c.border}`,
                          borderRadius:4, padding:"2px 4px", overflow:"hidden",
                          fontSize:10, color:c.text, fontWeight:600, lineHeight:1.3,
                        }}>
                          {m.name}<br/>{m.hours_from}–{m.hours_until}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {menusWithHours.length===0&&(
        <div style={{ padding:"20px 20px 20px 20px", fontSize:13, color:G.muted }}>
          No menus have availability hours set yet. Open a menu and set its hours to see them here.
        </div>
      )}
    </div>
  );
}

// ─── MENUS PAGE ───────────────────────────────────────────────────────────────
function MenusPage({ toast, storeSchedule, setStoreSchedule }) {
  const [menus, setMenus] = useState([]); const [loading, setLoading] = useState(true); const [viewMid, setViewMid] = useState(null);
  const [showNew, setShowNew] = useState(false); const [showSidebar, setShowSidebar] = useState(false); const [availRecipes, setAvailRecipes] = useState([]);
  const [sidebarCat, setSidebarCat] = useState(""); const [form, setForm] = useState({name:"",available:true,delivery_fee:"",recipe_ids:[]});
  const [dialog, setDialog] = useState(null); const [toRemove, setToRemove] = useState([]); const [editTitle, setEditTitle] = useState(false); const [titleVal, setTitleVal] = useState(""); const [saving, setSaving] = useState(false);

  // Availability hours state for detail view
  const [hoursFrom, setHoursFrom] = useState("09:00");
  const [hoursUntil, setHoursUntil] = useState("21:00");
  const [hoursDays, setHoursDays] = useState([]);
  const [hoursWarning, setHoursWarning] = useState("");
  const [applyingHours, setApplyingHours] = useState(false);

  const load=useCallback(async()=>{ setLoading(true); try{
    const[m,r,s]=await Promise.all([api.getMenus(),api.getAvailableRecipes(),api.getSchedule().catch(()=>null)]);
    setMenus(m); setAvailRecipes(r);
    if (s?.schedule) setStoreSchedule(s.schedule);
  } catch(e){toast(e.message,"error");} finally{setLoading(false);} },[]);  useEffect(()=>{load();},[]);

  // Sync hours state when opening a menu
  useEffect(()=>{
    if (viewMid) {
      const m=menus.find(x=>x.mid===viewMid);
      if (m) {
        setHoursFrom(m.hours_from||"09:00");
        setHoursUntil(m.hours_until||"21:00");
        setHoursDays(m.hours_days||[]);
        setHoursWarning("");
      }
    }
  },[viewMid]);

  const saveNew=async()=>{ if(!form.name.trim())return; setSaving(true); try{ const m=await api.createMenu({name:form.name,available:form.available,delivery_fee:Number(form.delivery_fee)||0,recipe_ids:form.recipe_ids}); setMenus(prev=>[...prev,m]); toast(`"${m.name}" saved`); setShowNew(false); setForm({name:"",available:true,delivery_fee:"",recipe_ids:[]}); } catch(e){toast(e.message,"error");} finally{setSaving(false);} };
  const patchMenu=async(mid,data)=>{ try{ const u=await api.patchMenu(mid,data); setMenus(prev=>prev.map(m=>m.mid===mid?u:m)); return u; } catch(e){toast(e.message,"error");} };
  const removeRecipes=async()=>{ try{ const u=await api.removeMenuRecipes(viewMid,toRemove); setMenus(prev=>prev.map(m=>m.mid===viewMid?u:m)); toast("Removed from menu"); setToRemove([]); setDialog(null); } catch(e){toast(e.message,"error");} };

  const applyHours = async () => {
    if (!hoursDays.length) { setHoursWarning("Select at least one day."); return; }
    setApplyingHours(true);
    setHoursWarning("");

    // Validate against live store hours
    const store = storeSchedule;
    const fromMins = timeToMins(hoursFrom);
    const toMins   = timeToMins(hoursUntil);
    const badDays  = [];

    for (const day of hoursDays) {
      const periods = store[day]||[];
      if (periods.length === 0) { badDays.push(day); continue; }
      const storeOpen  = timeToMins(periods[0].start);
      const storeClose = timeToMins(periods[periods.length-1].end);
      if (fromMins < storeOpen || toMins > storeClose) badDays.push(day);
    }

    if (badDays.length) {
      const names = badDays.map(d=>d.charAt(0).toUpperCase()+d.slice(1)).join(", ");
      setHoursWarning(`Menu is available outside store hours on ${names}. Review menu hours and store hours. Make changes to resolve collision, if necessary.`);
      setTimeout(()=>setHoursWarning(""), 5000);
    }

    try {
      await patchMenu(viewMid, { hours_from:hoursFrom, hours_until:hoursUntil, hours_days:hoursDays });
      toast("Availability hours saved");
    } catch(e) { toast(e.message,"error"); }
    finally { setApplyingHours(false); }
  };

  const sidebarCats=[...new Set(availRecipes.map(r=>r.category))].filter(Boolean);
  const sidebarRecs=availRecipes.filter(r=>!sidebarCat||r.category===sidebarCat);

  const toggleDay = day => setHoursDays(p=>p.includes(day)?p.filter(d=>d!==day):[...p,day]);

  if (viewMid) {
    const menu=menus.find(m=>m.mid===viewMid);
    if (!menu){setViewMid(null);return null;}
    const grouped={};
    (menu.recipes||[]).forEach(r=>{if(!grouped[r.category])grouped[r.category]=[];grouped[r.category].push(r);});
    return (
      <Page actions={
        <div style={{display:"flex",gap:10}}>
          <Btn variant="secondary" size="sm" onClick={async()=>{
            try {
              const copy = await api.duplicateMenu(viewMid);
              setMenus(prev=>[...prev,copy]);
              const baseName = menu.name.replace(/\s*\(\d+\)$/,"");
              toast(`"${copy.name}" created`);
              setViewMid(copy.mid);
            } catch(e){ toast(e.message,"error"); }
          }}>Duplicate</Btn>
          <Btn variant="ghost" size="sm" onClick={()=>setViewMid(null)}>← All menus</Btn>
        </div>
      }>
        <div style={{ marginBottom:20 }}>
          {editTitle?(
            <input autoFocus value={titleVal} onChange={e=>setTitleVal(e.target.value)} onBlur={()=>{patchMenu(menu.mid,{name:titleVal});setEditTitle(false);}} onKeyDown={e=>e.key==="Enter"&&e.target.blur()}
              style={{ fontFamily:G.font, fontSize:28, fontWeight:700, background:"none", border:"none", borderBottom:`2px solid ${G.caramel}`, outline:"none", width:"100%" }} />
          ):(
            <h1 onClick={()=>{setTitleVal(menu.name);setEditTitle(true);}} title="Click to rename"
              style={{ fontFamily:G.font, fontSize:28, fontWeight:700, cursor:"text", display:"inline-block", borderBottom:"2px solid transparent", transition:"border-color 0.2s" }}
              onMouseEnter={e=>e.target.style.borderColor=G.caramel} onMouseLeave={e=>e.target.style.borderColor="transparent"}>{menu.name}</h1>
          )}

          {/* Availability row */}
          <div style={{ display:"flex", alignItems:"center", gap:16, marginTop:12, flexWrap:"wrap" }}>
            <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:14 }}>
              <input type="checkbox" checked={menu.available} onChange={()=>patchMenu(menu.mid,{available:!menu.available})} style={{accentColor:G.caramel}} />
              Available to customers
            </label>
            {toRemove.length>0&&<Btn variant="danger" size="sm" onClick={()=>setDialog("remove")}>Remove selected ({toRemove.length})</Btn>}
          </div>

          {/* Availability hours */}
          <div style={{ marginTop:20, background:G.sand, borderRadius:12, padding:20 }}>
            <p style={{ fontSize:13, fontWeight:700, color:G.dark, marginBottom:14, letterSpacing:"0.02em" }}>Availability Hours</p>

            {/* Day toggles */}
            <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
              {DAYS.map((d,i)=>(
                <button key={d} onClick={()=>toggleDay(d)} style={{
                  padding:"5px 12px", borderRadius:20, border:"none", cursor:"pointer", fontSize:12, fontWeight:700,
                  background:hoursDays.includes(d)?G.caramel:G.white, color:hoursDays.includes(d)?G.white:G.muted,
                  transition:"all 0.15s"
                }}>{DAY_LABELS[i]}</button>
              ))}
            </div>

            {/* Time range */}
            <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <label style={{ fontSize:13, color:G.muted, fontWeight:600 }}>From</label>
                <input type="time" value={hoursFrom} onChange={e=>setHoursFrom(e.target.value)}
                  style={{ padding:"7px 10px", borderRadius:8, border:`1px solid ${G.border}`, background:G.white, fontSize:13, fontFamily:G.mono, outline:"none" }} />
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <label style={{ fontSize:13, color:G.muted, fontWeight:600 }}>Until</label>
                <input type="time" value={hoursUntil} onChange={e=>setHoursUntil(e.target.value)}
                  style={{ padding:"7px 10px", borderRadius:8, border:`1px solid ${G.border}`, background:G.white, fontSize:13, fontFamily:G.mono, outline:"none" }} />
              </div>
              <Btn size="sm" onClick={applyHours} loading={applyingHours}>Apply</Btn>
              {menu.hours_from&&(
                <Btn size="sm" variant="ghost" onClick={async()=>{
                  await patchMenu(menu.mid,{hours_from:null,hours_until:null,hours_days:[]});
                  setHoursFrom("09:00"); setHoursUntil("21:00"); setHoursDays([]); setHoursWarning("");
                  toast("Hours cleared");
                }}>Clear hours</Btn>
              )}
            </div>

            {/* Warning */}
            {hoursWarning&&(
              <div style={{ marginTop:12, padding:"10px 14px", background:"#fefce8", border:"1px solid #eab308", borderLeft:"3px solid #eab308", borderRadius:8, fontSize:13, color:"#854d0e", display:"flex", alignItems:"flex-start", gap:8, animation:"fadeIn 0.2s ease" }}>
                <span>⚠️</span>
                <span style={{flex:1}}>{hoursWarning}</span>
                <button onClick={()=>setHoursWarning("")} style={{background:"none",border:"none",cursor:"pointer",color:G.muted,fontSize:16,lineHeight:1,flexShrink:0}}>×</button>
              </div>
            )}

            {menu.hours_from&&(
              <p style={{ fontSize:12, color:G.muted, marginTop:10 }}>
                Currently active: <b>{menu.hours_days?.map(d=>d.charAt(0).toUpperCase()+d.slice(1)).join(", ")}</b> · {menu.hours_from} – {menu.hours_until}
              </p>
            )}
          </div>
        </div>

        {/* Recipe list */}
        <div style={{ background:G.white, borderRadius:14, border:`1px solid ${G.border}`, overflow:"hidden" }}>
          {Object.entries(grouped).map(([cat,recs])=>(
            <div key={cat}>
              <div style={{ padding:"10px 20px", background:G.sand, borderBottom:`1px solid ${G.border}`, fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", color:G.muted, display:"flex", alignItems:"center", gap:10 }}>
                <input type="checkbox" checked={recs.every(r=>toRemove.includes(r.rid))} onChange={()=>{const all=recs.every(r=>toRemove.includes(r.rid));setToRemove(p=>all?p.filter(x=>!recs.find(r=>r.rid===x)):[...p,...recs.map(r=>r.rid).filter(x=>!p.includes(x))]);}} style={{accentColor:G.caramel}} />
                {cat}
              </div>
              {recs.map(r=>(
                <div key={r.rid} style={{ padding:"12px 20px", display:"flex", alignItems:"center", gap:12, borderBottom:`1px solid ${G.border}` }}>
                  <input type="checkbox" checked={toRemove.includes(r.rid)} onChange={()=>setToRemove(p=>p.includes(r.rid)?p.filter(x=>x!==r.rid):[...p,r.rid])} style={{accentColor:G.caramel}} />
                  <span style={{flex:1,fontSize:14}}>{r.name}{r.deliverable===false&&<em style={{marginLeft:6,fontSize:12,color:G.muted}}>(pickup only)</em>}</span>
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
                {form.recipe_ids.map(rid=>{const r=availRecipes.find(x=>x.rid===rid);return r?(<span key={rid} style={{ background:G.sand, padding:"4px 10px", borderRadius:20, fontSize:13, display:"flex", alignItems:"center", gap:6 }}>{r.name}<button onClick={()=>setForm(p=>({...p,recipe_ids:p.recipe_ids.filter(x=>x!==rid)}))} style={{background:"none",border:"none",cursor:"pointer",color:G.muted,fontSize:16,lineHeight:1}}>×</button></span>):null;})}
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
                  <input type="checkbox" checked={form.recipe_ids.includes(r.rid)} onChange={()=>setForm(p=>({...p,recipe_ids:p.recipe_ids.includes(r.rid)?p.recipe_ids.filter(x=>x!==r.rid):[...p.recipe_ids,r.rid]}))} style={{accentColor:G.caramel}} />
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
          {menus.length===0&&<p style={{color:G.muted,fontSize:14}}>No menus yet.</p>}
        </div>
      )}
      {!loading&&<MenuCalendar menus={menus} storeSchedule={storeSchedule} />}
    </Page>
  );
}

// ─── ORDERS (MANUFACTURER) ────────────────────────────────────────────────────
function todayStr() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`;
}
function parseLocalDate(str) {
  // DD-MM-YYYY → Date
  const [dd,mm,yyyy] = str.split("-").map(Number);
  if (!dd||!mm||!yyyy) return null;
  return new Date(yyyy, mm-1, dd);
}
function fuzzyMatch(hay, needle) {
  // 1-char fuzzy: for each position in hay, check if needle fits with ≤1 substitution/deletion
  if (!needle) return true;
  hay = hay.toLowerCase(); needle = needle.toLowerCase();
  if (hay.includes(needle)) return true;
  // allow 1 char difference via sliding window
  for (let i = 0; i <= hay.length - needle.length + 1; i++) {
    let mismatches = 0;
    for (let j = 0; j < needle.length && j + i < hay.length; j++) {
      if (hay[i+j] !== needle[j]) mismatches++;
      if (mismatches > 1) break;
    }
    if (mismatches <= 1) return true;
  }
  return false;
}

// ─── NEW ORDER MODAL ──────────────────────────────────────────────────────────
function NewOrderModal({ onClose, onCreated, toast }) {
  const [menus, setMenus]         = useState([]);
  const [mid, setMid]             = useState("");
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [qty, setQty]             = useState({});
  const [pickup, setPickup]       = useState(true);
  const [delivery, setDelivery]   = useState("");
  const [customerQ, setCustomerQ] = useState("");
  const [results, setResults]     = useState([]);
  const [customer, setCustomer]   = useState(null); // {uid, first_name, last_name} or null for walk-in
  const [saving, setSaving]       = useState(false);
  const searchRef                 = useRef(null);

  // Load menus on open
  useEffect(()=>{
    api.getMenus().then(m=>{ setMenus(m); if(m.length===1){setMid(String(m[0].mid));setSelectedMenu(m[0]);} }).catch(()=>{});
  },[]);

  // Customer search with debounce
  useEffect(()=>{
    if (customerQ.length < 2) { setResults([]); return; }
    const t = setTimeout(async()=>{
      try { const r=await api.searchCustomers(customerQ); setResults(r); } catch{}
    }, 300);
    return ()=>clearTimeout(t);
  },[customerQ]);

  const selectMenu = id => {
    const m = menus.find(x=>String(x.mid)===id);
    setMid(id); setSelectedMenu(m||null); setQty({});
  };

  const changeQty = (rid, delta) =>
    setQty(p=>({ ...p, [rid]: Math.max(0, Math.min(20, (p[rid]||0)+delta)) }));

  const items = (selectedMenu?.recipes||[])
    .filter(r=>(qty[r.rid]||0)>0)
    .map(r=>({ rid:r.rid, name:r.name, qty:qty[r.rid], price:r.price }));

  const total = items.reduce((s,it)=>s+it.qty*it.price, 0)
    + (!pickup && selectedMenu ? selectedMenu.delivery_fee : 0);

  const submit = async () => {
    if (!mid) { toast("Select a menu","error"); return; }
    if (!items.length) { toast("Add at least one item","error"); return; }
    setSaving(true);
    try {
      const payload = {
        mid: Number(mid),
        pickup,
        items,
        delivery_address: !pickup ? delivery : null,
        ...(customer?.uid ? { customer_uid: customer.uid } : { walkin_name: customerQ||"Walk-in" }),
      };
      const order = await api.placeOrder(payload);
      toast(`Order #${order.oid} created`);
      onCreated(order);
      onClose();
    } catch(e){ toast(e.message,"error"); }
    finally { setSaving(false); }
  };

  // Group recipes by category for display
  const grouped = {};
  (selectedMenu?.recipes||[]).forEach(r=>{
    if(!grouped[r.category])grouped[r.category]=[];
    grouped[r.category].push(r);
  });

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(44,24,16,0.45)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:G.white, borderRadius:16, width:"100%", maxWidth:680, maxHeight:"92vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(44,24,16,0.2)", animation:"fadeIn 0.2s ease" }}>

        {/* Header */}
        <div style={{ padding:"20px 24px", borderBottom:`1px solid ${G.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h3 style={{ fontFamily:G.font, fontSize:20 }}>New order</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:G.muted, lineHeight:1 }}>×</button>
        </div>

        {/* Body — scrollable */}
        <div style={{ flex:1, overflowY:"auto", padding:24, display:"flex", flexDirection:"column", gap:20 }}>

          {/* Customer */}
          <div>
            <label style={{ fontSize:13, fontWeight:600, color:G.dark, display:"block", marginBottom:6 }}>Customer</label>
            {customer ? (
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:G.sand, borderRadius:8 }}>
                <span style={{ flex:1, fontSize:14 }}>👤 {customer.first_name} {customer.last_name}</span>
                <button onClick={()=>{setCustomer(null);setCustomerQ("");}} style={{ background:"none", border:"none", color:G.red, cursor:"pointer", fontSize:13, fontFamily:G.mono }}>Remove</button>
              </div>
            ) : (
              <div style={{ position:"relative" }}>
                <input ref={searchRef} value={customerQ} onChange={e=>setCustomerQ(e.target.value)}
                  placeholder="Search by name, email, phone — or type a walk-in name"
                  style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:`1px solid ${G.border}`, fontSize:14, fontFamily:G.mono, outline:"none" }}
                  onFocus={e=>e.target.style.borderColor=G.caramel} onBlur={e=>e.target.style.borderColor=G.border}
                />
                {results.length>0 && (
                  <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:G.white, border:`1px solid ${G.border}`, borderRadius:10, boxShadow:"0 8px 24px rgba(44,24,16,0.12)", zIndex:10, overflow:"hidden" }}>
                    {results.map(r=>(
                      <button key={r.uid} onClick={()=>{ setCustomer(r); setCustomerQ(`${r.first_name} ${r.last_name}`); setResults([]); }}
                        style={{ width:"100%", textAlign:"left", padding:"10px 14px", background:"none", border:"none", cursor:"pointer", fontFamily:G.mono, fontSize:14, display:"flex", gap:10 }}
                        onMouseEnter={e=>e.currentTarget.style.background=G.sand}
                        onMouseLeave={e=>e.currentTarget.style.background="none"}>
                        <span style={{flex:1}}>{r.first_name} {r.last_name}</span>
                        <span style={{color:G.muted,fontSize:12}}>{r.email}</span>
                      </button>
                    ))}
                    <div style={{ padding:"8px 14px", fontSize:12, color:G.muted, borderTop:`1px solid ${G.border}` }}>
                      Not listed? The typed name will be used as a walk-in.
                    </div>
                  </div>
                )}
                {customerQ.length>0&&results.length===0&&customerQ.length>=2&&(
                  <p style={{ fontSize:12, color:G.muted, marginTop:4 }}>No matching accounts — will be saved as walk-in "{customerQ||"Walk-in"}"</p>
                )}
              </div>
            )}
          </div>

          {/* Menu selector */}
          <Select label="Menu" value={mid} onChange={selectMenu}
            options={menus.map(m=>({value:String(m.mid),label:m.name+(m.available?"":" (draft)")}))}
            placeholder="Select a menu" required />

          {/* Recipe picker */}
          {selectedMenu && (
            <div>
              <label style={{ fontSize:13, fontWeight:600, color:G.dark, display:"block", marginBottom:10 }}>Items</label>
              {Object.entries(grouped).map(([cat,recs])=>(
                <div key={cat} style={{ marginBottom:12 }}>
                  <p style={{ fontSize:11, fontWeight:700, color:G.muted, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>{cat}</p>
                  {recs.map(r=>(
                    <div key={r.rid} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:`1px solid ${G.border}` }}>
                      <span style={{ flex:1, fontSize:14 }}>{r.name}</span>
                      <span style={{ fontSize:13, color:G.caramel, fontWeight:600, minWidth:70, textAlign:"right" }}>{r.price} {r.currency}</span>
                      <button onClick={()=>changeQty(r.rid,-1)} style={{ width:26, height:26, borderRadius:6, border:`1px solid ${G.border}`, background:G.white, cursor:"pointer", fontSize:15, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                      <span style={{ minWidth:18, textAlign:"center", fontWeight:700, fontSize:14 }}>{qty[r.rid]||0}</span>
                      <button onClick={()=>changeQty(r.rid,1)} style={{ width:26, height:26, borderRadius:6, border:"none", background:G.caramel, cursor:"pointer", fontSize:15, fontWeight:700, color:G.white, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Fulfillment */}
          {selectedMenu && (
            <div>
              <label style={{ fontSize:13, fontWeight:600, color:G.dark, display:"block", marginBottom:8 }}>Fulfillment</label>
              <div style={{ display:"flex", gap:10 }}>
                {[{val:true,label:"Pickup (free)"},{val:false,label:`Delivery (+${selectedMenu.delivery_fee} AMD)`}].map(opt=>(
                  <label key={String(opt.val)} style={{ display:"flex", alignItems:"center", gap:7, cursor:"pointer", fontSize:14 }}>
                    <input type="radio" name="mo_pickup" checked={pickup===opt.val} onChange={()=>setPickup(opt.val)} style={{accentColor:G.caramel}} />
                    {opt.label}
                  </label>
                ))}
              </div>
              {!pickup && (
                <Input label="Delivery address" value={delivery} onChange={setDelivery}
                  placeholder="Street, city, ZIP" style={{marginTop:10}} />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"16px 24px", borderTop:`1px solid ${G.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontWeight:700, fontSize:16, color:G.caramel }}>{total > 0 ? `${total} AMD` : "—"}</span>
          <div style={{ display:"flex", gap:10 }}>
            <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn onClick={submit} loading={saving} disabled={!items.length||!mid}>Place order</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrdersManufPage({ toast }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null);
  const [pending, setPending] = useState(null);
  const [view, setView] = useState("kanban");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(todayStr());
  const [dateTo, setDateTo]     = useState(todayStr());
  const [sortKey, setSortKey]   = useState("oid");
  const [sortDir, setSortDir]   = useState("desc");
  const [page, setPage]         = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [showNewOrder, setShowNewOrder] = useState(false);

  const load = useCallback(async()=>{
    setLoading(true);
    try { setOrders(await api.getOrders()); }
    catch(e){ toast(e.message,"error"); }
    finally { setLoading(false); }
  },[]);
  useEffect(()=>{ load(); },[]);

  const statuses = Object.keys(STATUS_CONFIG);
  const advance  = async oid => { try{ const u=await api.advanceOrder(oid); setOrders(p=>p.map(o=>o.oid===oid?u:o)); toast(`Order #${oid} updated`); } catch(e){ toast(e.message,"error"); } };
  const decline  = async ()  => { try{ const u=await api.declineOrder(pending); setOrders(p=>p.map(o=>o.oid===pending?u:o)); toast(`Order #${pending} declined`); setDialog(null); } catch(e){ toast(e.message,"error"); } };
  const toggleSort   = k => { if(sortKey===k) setSortDir(d=>d==="asc"?"desc":"asc"); else { setSortKey(k); setSortDir("desc"); } };

  // filter = statuses that ARE shown (all by default)
  const [filter, setFilter] = useState(statuses);
  const [statusOpen, setStatusOpen] = useState(false);
  const toggleStatus = s => setFilter(p => p.includes(s) ? p.filter(x=>x!==s) : [...p, s]);
  const allSelected = filter.length === statuses.length;

  // Filter by date range
  const fromDate = parseLocalDate(dateFrom);
  const toDate   = parseLocalDate(dateTo);

  const dateFiltered = orders.filter(o=>{
    const d = new Date(o.created_at);
    if (fromDate && d < fromDate) return false;
    if (toDate) { const end=new Date(toDate); end.setDate(end.getDate()+1); if (d >= end) return false; }
    return true;
  });

  // Status filter — filter contains the statuses to SHOW
  const statusFiltered = dateFiltered.filter(o=>filter.includes(o.status));

  // Search (≥3 chars, fuzzy)
  const q = search.trim();
  const searched = q.length >= 3 ? statusFiltered.filter(o=>{
    const hay = [
      o.oid?.toString(),
      o.customer?.first_name,
      o.customer?.last_name,
      `${o.customer?.first_name} ${o.customer?.last_name}`,
      o.status,
      ...(o.items||[]).map(it=>it.name),
    ].filter(Boolean).join(" ");
    return fuzzyMatch(hay, q);
  }) : statusFiltered;

  // ── TABLE VIEW ──────────────────────────────────────────────────────────────
  const TABLE_COLS = [
    { key:"oid",        label:"#" },
    { key:"created_at", label:"Date placed" },
    { key:"first_name", label:"First name" },
    { key:"last_name",  label:"Last name" },
    { key:"status",     label:"Status" },
    { key:"total",      label:"Total" },
  ];

  const tableRows = searched.map(o=>({
    ...o,
    first_name: o.customer?.first_name||"",
    last_name:  o.customer?.last_name||"",
    total: (o.items||[]).reduce((s,it)=>s+it.qty*it.price,0),
  }));

  const sorted = [...tableRows].sort((a,b)=>{
    let av = a[sortKey], bv = b[sortKey];
    if (sortKey==="created_at") { av=new Date(av); bv=new Date(bv); }
    else if (sortKey==="oid"||sortKey==="total") { av=Number(av); bv=Number(bv); }
    else { av=String(av||"").toLowerCase(); bv=String(bv||"").toLowerCase(); }
    const v = av<bv?-1:av>bv?1:0;
    return sortDir==="asc"?v:-v;
  });

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page*pageSize, (page+1)*pageSize);

  // ── TOOLBAR ─────────────────────────────────────────────────────────────────
  const DateInput = ({value, onChange}) => (
    <input value={value} onChange={e=>onChange(e.target.value)} placeholder="DD-MM-YYYY"
      style={{ padding:"6px 10px", borderRadius:8, border:`1px solid ${G.border}`, fontSize:13, fontFamily:G.mono, width:110, outline:"none" }}
      onFocus={e=>e.target.style.borderColor=G.caramel} onBlur={e=>e.target.style.borderColor=G.border} />
  );

  // Search input with × clear
  const SearchBox = () => (
    <div style={{ position:"relative", display:"inline-flex", alignItems:"center" }}>
      <input value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}} placeholder="Search…"
        style={{ padding:"6px 28px 6px 10px", borderRadius:8, border:`1px solid ${G.border}`, fontSize:13, fontFamily:G.mono, width:160, outline:"none" }}
        onFocus={e=>e.target.style.borderColor=G.caramel} onBlur={e=>e.target.style.borderColor=G.border} />
      {search&&<button onClick={()=>{setSearch("");setPage(0);}} style={{ position:"absolute", right:6, background:"none", border:"none", cursor:"pointer", color:G.muted, fontSize:14, lineHeight:1, padding:0 }}>×</button>}
    </div>
  );

  // Kanban/Table toggle
  const ViewToggle = () => (
    <div style={{ display:"flex", borderRadius:8, border:`1px solid ${G.border}`, overflow:"hidden" }}>
      {[{k:"kanban",icon:"⊞"},{k:"table",icon:"☰"}].map(({k,icon})=>(
        <button key={k} onClick={()=>{
          setView(k);
          if (k==="kanban") { setDateFrom(todayStr()); setDateTo(todayStr()); }
          setPage(0);
        }} title={k} style={{
          padding:"5px 11px", border:"none", cursor:"pointer", fontFamily:G.mono, fontSize:15,
          background:view===k?G.caramel:G.white, color:view===k?G.white:G.muted, transition:"all 0.15s"
        }}>{icon}</button>
      ))}
    </div>
  );

  const StatusDropdown = () => (
    <div style={{ position:"relative" }}>
      <button onClick={()=>setStatusOpen(p=>!p)} style={{
        display:"flex", alignItems:"center", gap:6, padding:"6px 12px",
        borderRadius:8, border:`1px solid ${G.border}`, background:G.white,
        fontFamily:G.mono, fontSize:13, cursor:"pointer", color:G.dark, whiteSpace:"nowrap"
      }}>
        Status{!allSelected ? ` (${filter.length}/${statuses.length})` : ""}
        <span style={{ fontSize:10, color:G.muted }}>▾</span>
      </button>
      {statusOpen && (
        <>
          <div onClick={()=>setStatusOpen(false)} style={{ position:"fixed", inset:0, zIndex:149 }} />
          <div style={{
            position:"absolute", top:"calc(100% + 6px)", right:0, background:G.white,
            border:`1px solid ${G.border}`, borderRadius:10, boxShadow:"0 8px 24px rgba(44,24,16,0.12)",
            zIndex:150, minWidth:180, overflow:"hidden", animation:"fadeIn 0.15s ease"
          }}>
            {/* Select all / none */}
            <button onClick={()=>{ setFilter(allSelected ? [] : [...statuses]); setPage(0); }}
              style={{ width:"100%", textAlign:"left", padding:"9px 14px", background:"none", border:"none", borderBottom:`1px solid ${G.border}`, cursor:"pointer", fontFamily:G.mono, fontSize:12, fontWeight:700, color:G.muted }}
              onMouseEnter={e=>e.currentTarget.style.background=G.sand}
              onMouseLeave={e=>e.currentTarget.style.background="none"}>
              {allSelected ? "Deselect all" : "Select all"}
            </button>
            {statuses.map(s=>{
              const cfg = STATUS_CONFIG[s];
              const checked = filter.includes(s);
              return (
                <label key={s} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 14px", cursor:"pointer" }}
                  onMouseEnter={e=>e.currentTarget.style.background=G.sand}
                  onMouseLeave={e=>e.currentTarget.style.background="none"}>
                  <input type="checkbox" checked={checked}
                    onChange={()=>{ toggleStatus(s); setPage(0); }}
                    style={{ accentColor:cfg.color, width:14, height:14 }} />
                  <span style={{ fontSize:13, color:checked?cfg.color:G.muted, fontWeight:checked?600:400 }}>{s}</span>
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  const toolbar = (
    <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"nowrap" }}>
      <Btn size="sm" onClick={()=>setShowNewOrder(true)}>+ New order</Btn>
      <SearchBox />
      <span style={{ fontSize:12, color:G.muted }}>From</span>
      <DateInput value={dateFrom} onChange={v=>{setDateFrom(v);setPage(0);}} />
      <span style={{ fontSize:12, color:G.muted }}>To</span>
      <DateInput value={dateTo}   onChange={v=>{setDateTo(v);setPage(0);}} />
      <ViewToggle />
      <StatusDropdown />
    </div>
  );

  return (
    <Page title="Orders" actions={toolbar}>
      {showNewOrder&&(
        <NewOrderModal
          toast={toast}
          onClose={()=>setShowNewOrder(false)}
          onCreated={order=>setOrders(prev=>[order,...prev])}
        />
      )}
      {loading ? <Spinner/> : view==="kanban" ? (
        // ── KANBAN ────────────────────────────────────────────────────────────
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))", gap:14 }}>
          {filter.map(status=>{
            const cfg=STATUS_CONFIG[status]; const col=searched.filter(o=>o.status===status);
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
                      <div style={{ marginBottom:8 }}>{(o.items||[]).map((it,i)=><div key={i} style={{fontSize:12}}>{it.qty}× {it.name}</div>)}</div>
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
      ) : (
        // ── TABLE ─────────────────────────────────────────────────────────────
        <>
          <div style={{ background:G.white, borderRadius:14, border:`1px solid ${G.border}`, overflow:"hidden", marginBottom:14 }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:G.sand, borderBottom:`1px solid ${G.border}` }}>
                  {TABLE_COLS.map(c=>(
                    <th key={c.key} onClick={()=>toggleSort(c.key)} style={{
                      padding:"11px 16px", textAlign:"left", fontSize:12, fontWeight:700,
                      letterSpacing:"0.05em", textTransform:"uppercase", color:G.muted,
                      cursor:"pointer", userSelect:"none", whiteSpace:"nowrap"
                    }}>
                      {c.label}{sortKey===c.key&&<span style={{marginLeft:4}}>{sortDir==="asc"?"↑":"↓"}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.length===0?(
                  <tr><td colSpan={TABLE_COLS.length} style={{padding:40,textAlign:"center",color:G.muted}}>No orders found.</td></tr>
                ):paged.map((o,i)=>{
                  const cfg=STATUS_CONFIG[o.status]||STATUS_CONFIG.New;
                  const d=new Date(o.created_at);
                  const dateStr=`${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`;
                  return (
                    <tr key={o.oid} style={{ borderBottom:i<paged.length-1?`1px solid ${G.border}`:"none", transition:"background 0.1s" }}
                      onMouseEnter={e=>e.currentTarget.style.background="#fef9f4"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{padding:"11px 16px",fontSize:14,fontWeight:700}}>#{o.oid}</td>
                      <td style={{padding:"11px 16px",fontSize:13,color:G.muted}}>{dateStr}</td>
                      <td style={{padding:"11px 16px",fontSize:14}}>{o.customer?.first_name}</td>
                      <td style={{padding:"11px 16px",fontSize:14}}>{o.customer?.last_name}</td>
                      <td style={{padding:"11px 16px"}}>
                        <span style={{padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:700,background:cfg.bg,color:cfg.color}}>{o.status}</span>
                      </td>
                      <td style={{padding:"11px 16px",fontSize:14,fontWeight:700,color:G.caramel}}>{o.total} AMD</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:13, color:G.muted }}>Rows per page:</span>
              {[10,25,50,100].map(n=>(
                <button key={n} onClick={()=>{setPageSize(n);setPage(0);}} style={{
                  padding:"4px 10px", borderRadius:6, border:`1px solid ${pageSize===n?G.caramel:G.border}`,
                  background:pageSize===n?G.caramel:G.white, color:pageSize===n?G.white:G.muted,
                  fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:G.mono
                }}>{n}</button>
              ))}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:13, color:G.muted }}>{sorted.length} order{sorted.length!==1?"s":""} · page {totalPages?page+1:0}/{totalPages}</span>
              <button onClick={()=>setPage(0)} disabled={page===0} style={{ padding:"4px 8px", borderRadius:6, border:`1px solid ${G.border}`, background:G.white, cursor:page===0?"not-allowed":"pointer", fontSize:13, opacity:page===0?0.4:1 }}>«</button>
              <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0} style={{ padding:"4px 8px", borderRadius:6, border:`1px solid ${G.border}`, background:G.white, cursor:page===0?"not-allowed":"pointer", fontSize:13, opacity:page===0?0.4:1 }}>‹</button>
              <button onClick={()=>setPage(p=>Math.min(totalPages-1,p+1))} disabled={page>=totalPages-1} style={{ padding:"4px 8px", borderRadius:6, border:`1px solid ${G.border}`, background:G.white, cursor:page>=totalPages-1?"not-allowed":"pointer", fontSize:13, opacity:page>=totalPages-1?0.4:1 }}>›</button>
              <button onClick={()=>setPage(totalPages-1)} disabled={page>=totalPages-1} style={{ padding:"4px 8px", borderRadius:6, border:`1px solid ${G.border}`, background:G.white, cursor:page>=totalPages-1?"not-allowed":"pointer", fontSize:13, opacity:page>=totalPages-1?0.4:1 }}>»</button>
            </div>
          </div>
        </>
      )}
      <Dialog open={dialog==="decline"} title="Decline order?" onConfirm={decline} onCancel={()=>setDialog(null)}>Are you sure you want to decline order #{pending}?</Dialog>
    </Page>
  );
}

// ─── RESTAURANTS ──────────────────────────────────────────────────────────────
function RestaurantsPage({ setPage, setActiveMenu }) {
  const [menus, setMenus] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(()=>{api.getMenus().then(m=>{setMenus(m.filter(x=>x.available&&(x.recipes||[]).length>0));setLoading(false);}).catch(()=>setLoading(false));},[]);
  return (
    <Page title="Restaurants">
      {loading?<Spinner/>:menus.length===0?(
        <div style={{ textAlign:"center", padding:80, color:G.muted }}><p style={{ fontFamily:G.font, fontSize:24, marginBottom:8 }}>No restaurants open right now</p><p>Check back soon!</p></div>
      ):(
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap:20 }}>
          {menus.map(m=>(
            <div key={m.mid} onClick={()=>{setActiveMenu(m);setPage("order");}} style={{ background:G.white, borderRadius:16, border:`1px solid ${G.border}`, overflow:"hidden", cursor:"pointer", transition:"all 0.2s" }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 32px rgba(200,135,58,0.15)";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}>
              <div style={{ height:120, background:`linear-gradient(135deg, ${G.caramel}22 0%, ${G.caramel}44 100%)`, display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{fontSize:52}}>🍮</span></div>
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

// ─── ORDER PAGE ───────────────────────────────────────────────────────────────
function OrderPage({ menu, user, setPage, toast }) {
  const [qty, setQty] = useState({}); const [delivery, setDelivery] = useState(null);
  const [address, setAddress] = useState({street:user?.street_address||"",city:user?.city||"",zip:user?.zip||""});
  const [submitting, setSubmitting] = useState(false); const [lightbox, setLightbox] = useState(null);

  if (!menu) { setPage("restaurants"); return null; }

  const grouped={};
  (menu.recipes||[]).forEach(r=>{if(!grouped[r.category])grouped[r.category]=[];grouped[r.category].push(r);});

  const changeQty=(rid,delta)=>setQty(p=>({...p,[rid]:Math.max(0,Math.min(20,(p[rid]||0)+delta))}));

  const cartItems=(menu.recipes||[]).filter(r=>(qty[r.rid]||0)>0).map(r=>({rid:r.rid,name:r.name,qty:qty[r.rid],price:r.price,deliverable:r.deliverable!==false}));
  const hasUndeliverable=cartItems.some(it=>!it.deliverable);
  const itemTotal=cartItems.reduce((s,it)=>s+it.qty*it.price,0);
  const deliveryFee=delivery==="delivery"?menu.delivery_fee:0;
  const total=itemTotal+deliveryFee;

  useEffect(()=>{if(hasUndeliverable&&delivery==="delivery")setDelivery("pickup");},[hasUndeliverable]);

  const submit=async()=>{
    if(!delivery){toast("Please select pickup or delivery","error");return;}
    setSubmitting(true);
    try{
      const order=await api.placeOrder({mid:menu.mid,pickup:delivery==="pickup",items:cartItems,delivery_address:delivery==="delivery"?`${address.street}, ${address.city} ${address.zip}`:null});
      toast(`Order #${order.oid} placed!`); setPage("orders-cust");
    }catch(e){toast(e.message,"error");}finally{setSubmitting(false);}
  };

  const THUMB=42;

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
                    {/* Thumbnail */}
                    {(r.image_thumb_url||r.image_url)?(
                      <div className="recipe-thumb" style={{ position:"relative", width:THUMB, height:THUMB, flexShrink:0, borderRadius:8, overflow:"hidden", cursor:"pointer" }}
                        onClick={()=>setLightbox({src:r.image_url||r.image_thumb_url,description:r.description})}>
                        <img src={r.image_thumb_url||r.image_url} alt={r.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                        <div className="zoom-icon" style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.3)", display:"flex", alignItems:"center", justifyContent:"center", opacity:0, transition:"opacity 0.2s" }}><span style={{fontSize:14}}>🔍</span></div>
                      </div>
                    ):(
                      <div style={{ width:THUMB, height:THUMB, flexShrink:0, borderRadius:8, background:G.sand, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🍮</div>
                    )}
                    {/* Info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontWeight:600, fontSize:14, display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                        <span style={{ cursor:(r.image_url||r.image_thumb_url)?"pointer":"default" }} onClick={()=>(r.image_url||r.image_thumb_url)&&setLightbox({src:r.image_url||r.image_thumb_url,description:r.description})}>{r.name}</span>
                        {r.deliverable===false&&<em style={{ fontSize:11, fontWeight:400, color:G.muted }}>(in store pickup only)</em>}
                      </p>
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

        {/* CART */}
        <div style={{ background:G.white, borderRadius:16, border:`1px solid ${G.border}`, padding:22, position:"sticky", top:80 }}>
          <h3 style={{ fontFamily:G.font, fontSize:18, marginBottom:16 }}>Your order</h3>
          {cartItems.length===0?(
            <p style={{ color:G.muted, fontSize:13, marginBottom:16 }}>Add items from the menu.</p>
          ):(
            <div style={{ marginBottom:16 }}>
              {cartItems.map((it,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, marginBottom:8 }}>
                  <span style={{ flex:1 }}>{it.name}{it.deliverable===false&&<span style={{marginLeft:4}}>📦</span>}</span>
                  <div style={{ display:"flex", alignItems:"center", gap:3 }}>
                    <button onClick={()=>changeQty(it.rid,-1)} style={{ width:20, height:20, borderRadius:4, border:`1px solid ${G.border}`, background:G.white, cursor:"pointer", fontSize:12, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                    <span style={{ minWidth:16, textAlign:"center", fontWeight:700 }}>{it.qty}</span>
                    <button onClick={()=>changeQty(it.rid,1)} style={{ width:20, height:20, borderRadius:4, border:"none", background:G.caramel, cursor:"pointer", fontSize:12, fontWeight:700, color:G.white, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                  </div>
                  <span style={{ fontWeight:600, minWidth:54, textAlign:"right" }}>{it.qty*it.price}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ borderTop:`1px solid ${G.border}`, paddingTop:14, marginBottom:14 }}>
            <p style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>Fulfillment</p>
            {hasUndeliverable?(
              <div style={{ padding:"10px 12px", background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:8, fontSize:12, color:"#92400e" }}>
                <strong>Pickup only</strong><br/>Your order includes items available for pickup only. Delivery for this order may not be fulfilled.
              </div>
            ):[{val:"pickup",label:"Pickup (free)"},{val:"delivery",label:`Delivery (+${menu.delivery_fee} AMD)`}].map(opt=>(
              <label key={opt.val} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, cursor:"pointer", fontSize:13 }}>
                <input type="radio" name="delivery" value={opt.val} checked={delivery===opt.val} onChange={()=>setDelivery(opt.val)} style={{accentColor:G.caramel}} />
                {opt.label}
              </label>
            ))}
          </div>

          {delivery==="delivery"&&!hasUndeliverable&&(
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
            <div style={{ display:"flex", justifyContent:"space-between", fontWeight:700, fontSize:16 }}><span>Total</span><span style={{color:G.caramel}}>{total} AMD</span></div>
          </div>

          <Btn onClick={submit} loading={submitting} disabled={itemTotal===0} title={itemTotal===0?"Please add items to your order":undefined} style={{width:"100%"}}>Place order</Btn>
        </div>
      </div>
      <Lightbox src={lightbox?.src} description={lightbox?.description} onClose={()=>setLightbox(null)} />
    </Page>
  );
}

// ─── ORDERS (CUSTOMER) ────────────────────────────────────────────────────────
function OrdersCustPage({ toast }) {
  const [orders, setOrders] = useState([]); const [loading, setLoading] = useState(true); const [dialog, setDialog] = useState(null); const [pending, setPending] = useState(null);
  const load=useCallback(async()=>{setLoading(true);try{setOrders(await api.getOrders());}catch(e){toast(e.message,"error");}finally{setLoading(false);}},[]); useEffect(()=>{load();},[]);
  const cancel=async()=>{try{const u=await api.cancelOrder(pending);setOrders(p=>p.map(o=>o.oid===pending?u:o));toast(`Order #${pending} cancelled`);setDialog(null);}catch(e){toast(e.message,"error");}};
  const confirmDel=async oid=>{try{const u=await api.confirmDelivery(oid);setOrders(p=>p.map(o=>o.oid===oid?u:o));toast("Order confirmed as delivered!");}catch(e){toast(e.message,"error");}};
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
                  <div><span style={{ fontWeight:700, fontSize:15 }}>Order #{o.oid}</span><span style={{ marginLeft:10, fontSize:12, color:G.muted }}>{new Date(o.created_at).toLocaleString()}</span></div>
                  <span style={{ padding:"4px 12px", borderRadius:20, fontSize:12, fontWeight:700, background:cfg.bg, color:cfg.color }}>{o.status}</span>
                </div>
                <div style={{ marginBottom:12 }}>
                  {(o.items||[]).map((it,i)=>(
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:G.muted, marginBottom:2 }}>
                      <span>{it.name}</span><span>{it.qty}</span><span>{it.qty*it.price} AMD</span>
                    </div>
                  ))}
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
      <Dialog open={dialog==="cancel"} title="Cancel order?" onConfirm={cancel} onCancel={()=>setDialog(null)}>Are you sure you want to cancel order #{pending}?</Dialog>
    </Page>
  );
}

// ─── SCHEDULE PAGE ────────────────────────────────────────────────────────────
const TIMEZONES = [
  "Africa/Cairo","Africa/Lagos","Africa/Nairobi","America/Anchorage","America/Bogota",
  "America/Chicago","America/Denver","America/Los_Angeles","America/Mexico_City",
  "America/New_York","America/Sao_Paulo","America/Toronto","Asia/Bangkok","Asia/Dubai",
  "Asia/Hong_Kong","Asia/Jakarta","Asia/Karachi","Asia/Kolkata","Asia/Seoul",
  "Asia/Shanghai","Asia/Singapore","Asia/Taipei","Asia/Tehran","Asia/Tokyo",
  "Asia/Yerevan","Australia/Melbourne","Australia/Sydney","Europe/Amsterdam",
  "Europe/Athens","Europe/Berlin","Europe/Brussels","Europe/Budapest","Europe/Dublin",
  "Europe/Istanbul","Europe/Lisbon","Europe/London","Europe/Madrid","Europe/Moscow",
  "Europe/Oslo","Europe/Paris","Europe/Prague","Europe/Rome","Europe/Stockholm",
  "Europe/Vienna","Europe/Warsaw","Europe/Zurich","Pacific/Auckland","Pacific/Honolulu",
  "UTC",
];

const BLANK_SCHEDULE = {
  monday:[{start:"09:00",end:"21:00"}], tuesday:[{start:"09:00",end:"21:00"}],
  wednesday:[{start:"09:00",end:"21:00"}], thursday:[{start:"09:00",end:"21:00"}],
  friday:[{start:"09:00",end:"21:00"}], saturday:[{start:"10:00",end:"18:00"}],
  sunday:[],
};

function periodDiff(start, end) {
  const s=timeToMins(start), e=timeToMins(end);
  if (e<=s) return "00:00";
  const diff=e-s;
  return `${String(Math.floor(diff/60)).padStart(2,"0")}:${String(diff%60).padStart(2,"0")}`;
}

function maxLatestOrder(periods) {
  if (!periods||!periods.length) return "00:00";
  const last = periods[periods.length-1];
  return periodDiff(last.start, last.end);
}

function SchedulePage({ toast, storeSchedule, setStoreSchedule }) {
  const [schedule, setSchedule] = useState(storeSchedule);
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  );
  const [latestOrder, setLatestOrder] = useState("01:00");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(()=>{
    api.getSchedule().then(s=>{
      if (s?.schedule) { setSchedule(s.schedule); setStoreSchedule(s.schedule); }
      if (s?.timezone) setTimezone(s.timezone);
      if (s?.latest_order_before) setLatestOrder(s.latest_order_before);
    }).catch(()=>{}).finally(()=>setLoading(false));
  },[]);

  const save = async () => {
    setSaving(true);
    try {
      await api.saveSchedule({ schedule, timezone, latest_order_before: latestOrder });
      setStoreSchedule(schedule);

      // Check all menus with hours against the new store schedule
      const menus = await api.getMenus().catch(()=>[]);
      const collidingMenus = [];
      for (const menu of menus) {
        if (!menu.hours_from || !menu.hours_until || !menu.hours_days?.length) continue;
        const fromMins = timeToMins(menu.hours_from);
        const toMins   = timeToMins(menu.hours_until);
        const badDays  = [];
        for (const day of menu.hours_days) {
          const periods = schedule[day]||[];
          if (periods.length === 0) { badDays.push(day); continue; }
          const storeOpen  = timeToMins(periods[0].start);
          const storeClose = timeToMins(periods[periods.length-1].end);
          if (fromMins < storeOpen || toMins > storeClose) badDays.push(day);
        }
        if (badDays.length) collidingMenus.push({ name: menu.name, days: badDays });
      }

      if (collidingMenus.length) {
        const detail = collidingMenus.map(m =>
          `"${m.name}" on ${m.days.map(d=>d.charAt(0).toUpperCase()+d.slice(1)).join(", ")}`
        ).join("; ");
        toast(`Schedule saved. Collision detected: ${detail}. Review menu hours and store hours. Make changes to resolve collision, if necessary.`, "error");
      } else {
        toast("Schedule saved");
      }
    } catch(e){ toast(e.message,"error"); }
    finally { setSaving(false); }
  };

  const addPeriod = day => setSchedule(p=>({...p,[day]:[...p[day],{start:"09:00",end:"17:00"}]}));
  const removePeriod = (day,i) => setSchedule(p=>({...p,[day]:p[day].filter((_,j)=>j!==i)}));
  const updatePeriod = (day,i,field,val) => setSchedule(p=>({...p,[day]:p[day].map((per,j)=>j===i?{...per,[field]:val}:per)}));

  if (loading) return <Page title="Schedule"><Spinner/></Page>;

  const allMaxes = DAYS.map(d=>maxLatestOrder(schedule[d])).filter(v=>v!=="00:00");
  const globalMax = allMaxes.length ? allMaxes.reduce((a,b)=>timeToMins(a)<timeToMins(b)?a:b) : "12:00";

  return (
    <Page title="Schedule" actions={<Btn onClick={save} loading={saving}>Save schedule</Btn>}>
      <div style={{ background:G.white, borderRadius:14, border:`1px solid ${G.border}`, padding:24, marginBottom:16 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, alignItems:"end" }}>
          <Select label="Time zone" value={timezone} onChange={setTimezone}
            options={TIMEZONES.map(tz=>({value:tz,label:tz.replace("_"," ")}))} />
          <div>
            <label style={{ fontSize:13, fontWeight:600, color:G.dark, display:"block", marginBottom:6 }}>Latest order no later than</label>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <input type="time" value={latestOrder} min="00:00" max={globalMax}
                onChange={e=>setLatestOrder(e.target.value)}
                style={{ padding:"9px 12px", borderRadius:8, border:`1px solid ${G.border}`, fontSize:14, fontFamily:G.mono, outline:"none" }} />
              <span style={{ fontSize:13, color:G.dark, fontWeight:600 }}>before closing</span>
              <span style={{ fontSize:12, color:G.muted }}>(max {globalMax})</span>
            </div>
          </div>
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {DAYS.map((day,di)=>{
          const periods = schedule[day]||[];
          const isOff = periods.length===0;
          return (
            <div key={day} style={{ background:G.white, borderRadius:12, border:`1px solid ${G.border}`, padding:"16px 20px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:120 }}>
                  <label style={{ display:"flex", alignItems:"center", gap:7, cursor:"pointer" }}>
                    <input type="checkbox" checked={!isOff}
                      onChange={e=>{ if(e.target.checked) addPeriod(day); else setSchedule(p=>({...p,[day]:[]})); }}
                      style={{accentColor:G.caramel, width:16, height:16}} />
                    <span style={{ fontWeight:700, fontSize:14, color:isOff?G.muted:G.dark }}>{DAY_LABELS[di]}</span>
                  </label>
                  {isOff&&<span style={{ fontSize:12, color:G.muted, fontStyle:"italic" }}>Closed</span>}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8, flex:1 }}>
                  {periods.map((per,i)=>(
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                      <input type="time" value={per.start} onChange={e=>updatePeriod(day,i,"start",e.target.value)}
                        style={{ padding:"7px 10px", borderRadius:8, border:`1px solid ${G.border}`, fontSize:13, fontFamily:G.mono, outline:"none" }} />
                      <span style={{ color:G.muted, fontSize:13 }}>–</span>
                      <input type="time" value={per.end} onChange={e=>updatePeriod(day,i,"end",e.target.value)}
                        style={{ padding:"7px 10px", borderRadius:8, border:`1px solid ${G.border}`, fontSize:13, fontFamily:G.mono, outline:"none" }} />
                      <button onClick={()=>removePeriod(day,i)} style={{ background:"none", border:"none", color:G.red, cursor:"pointer", fontSize:13, fontFamily:G.mono, padding:"0 4px" }}>Remove</button>
                    </div>
                  ))}
                  {!isOff&&(
                    <button onClick={()=>addPeriod(day)} style={{ background:"none", border:`1px dashed ${G.border}`, color:G.caramel, cursor:"pointer", fontSize:12, fontFamily:G.mono, padding:"5px 12px", borderRadius:8, alignSelf:"flex-start", fontWeight:600 }}>
                      + Add period
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Page>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(()=>{
    try{ const t=localStorage.getItem("token"); if(!t)return null; const p=JSON.parse(atob(t.split(".")[1])); return p.exp*1000>Date.now()?p:null; }catch{return null;}
  });
  const [page, setPage] = useState(()=>user?(user.is_manufacturer?"orders-manuf":"restaurants"):"login");
  const [activeMenu, setActiveMenu] = useState(null);
  const [storeSchedule, setStoreSchedule] = useState(DEFAULT_STORE);
  const {toasts,toast,remove} = useToast();
  const logout=()=>{localStorage.removeItem("token");setUser(null);setPage("login");};
  const onLogin=u=>{setUser(u);setPage(u.is_manufacturer?"orders-manuf":"restaurants");};
  return (
    <>
      <style>{css}</style>
      <Toast toasts={toasts} remove={remove} />
      {!user?(
        <>
          {page==="login"  &&<LoginPage  onLogin={onLogin} setPage={setPage}/>}
          {page==="signup" &&<SignupPage setPage={setPage} toast={toast}/>}
          {page==="forgot" &&<ForgotPage setPage={setPage} toast={toast}/>}
          {!["login","signup","forgot"].includes(page)&&<LoginPage onLogin={onLogin} setPage={setPage}/>}
        </>
      ):(
        <>
          <Nav user={user} page={page} setPage={setPage} logout={logout}/>
          {page==="products"     &&<ProductsPage toast={toast}/>}
          {page==="recipes"      &&<RecipesPage  toast={toast}/>}
          {page==="menus"        &&<MenusPage    toast={toast} storeSchedule={storeSchedule} setStoreSchedule={setStoreSchedule}/>}
          {page==="orders-manuf" &&<OrdersManufPage toast={toast}/>}
          {page==="restaurants"  &&<RestaurantsPage setPage={setPage} setActiveMenu={setActiveMenu}/>}
          {page==="order"        &&<OrderPage menu={activeMenu} user={user} setPage={setPage} toast={toast}/>}
          {page==="orders-cust"  &&<OrdersCustPage toast={toast}/>}
          {page==="schedule"     &&<SchedulePage toast={toast} storeSchedule={storeSchedule} setStoreSchedule={setStoreSchedule}/>}
        </>
      )}
    </>
  );
}
