import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import React from "react";
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

// ─── LOCALIZATION ─────────────────────────────────────────────────────────────
function getLang() {
  try { return document.cookie.split(';').map(c=>c.trim()).find(c=>c.startsWith('lang='))?.split('=')[1] || 'en'; } catch { return 'en'; }
}
function setLangCookie(l) {
  try { document.cookie = `lang=${l};path=/;max-age=${60*60*24*365}`; } catch {}
}
function useLang() {
  const [lang, setLangState] = useState(getLang);
  const setLang = l => { setLangCookie(l); setLangState(l); };
  return [lang, setLang];
}
// Global mutable lang ref so non-hook contexts can read it
let _currentLang = getLang();
function t(en, ru) { return _currentLang === 'ru' ? (ru || en) : en; }

const RU = {
  // Nav tabs
  "Orders":"Заказы","Products":"Продукты","Items":"Блюда","Menus":"Меню",
  "Procurement":"Снабжение","Suppliers":"Поставщики",
  "Restaurants":"Рестораны","My Orders":"Мои заказы",
  // Buttons
  "+ New order":"+ Заказ","+ New product":"+ Продукт","+ New item":"+ Блюдо",
  "+ New menu":"+ Меню","+ New supplier":"+ Поставщик",
  // Status names (badge/table)
  "New":"Новый","Accepted":"Принят","Preparing":"Готовится","Done":"Выполнено",
  "Dispatched":"Передан","Declined":"Отклонён","Delivered":"Доставлен",
  // Status uppercase (kanban column headers)
  "NEW":"НОВЫЕ","ACCEPTED":"ПРИНЯТЫЕ","PREPARING":"ГОТОВЯТСЯ","DONE":"ВЫПОЛНЕНЫ",
  "DISPATCHED":"ПЕРЕДАНЫ","DECLINED":"ОТКЛОНЕНЫ","DELIVERED":"ДОСТАВЛЕНЫ",
  // Status action buttons
  "Accept":"Принять","Start Preparing":"Начать готовить","Mark as Done":"Выполнено",
  "Dispatch":"Передать","Confirm as Delivered":"Подтвердить доставку",
  // Fields and labels
  "Search":"Найти","Empty":"Пока пусто","From":"С","To":"по",
  "Deselect all":"Снять выделение","Select all":"Выбрать все",
  "Status":"Статус","ID":"Код","Name":"Название","Category":"Категория",
  "Units":"Единицы","Description":"Описание","Image":"Картинка",
  "Price":"Цена","Currency":"Валюта","Avail.":"В меню","Deliv.":"Достав.",
  "SKU":"Артикул","Date placed":"Дата","First name":"Имя","Last name":"Фамилия",
  "Total":"Итого","No orders found.":"Заказов не найдено.",
  "Rows per page:":"Записей на стр.:",
  "Available (can be added to a menu)":"Есть (можно предлагать в меню)",
  "Deliverable (uncheck for pickup-only items)":"Доставляется (снимите галочку, если блюдо доступно только в заведении)",
  "Schedule":"График","Time zone":"Часовой пояс","Save":"Сохранить","Cancel":"Отмена",
  "Yes":"Да","No":"Нет","Delete":"Удалить","Edit":"Редактировать",
  "Expiry (hours)":"Срок хранения (часов)","Street address":"Улица, район, дом",
  "City":"Город","ZIP":"Почтовый индекс","Email":"Email","Phone":"Телефон",
  "Contact first name":"Имя представителя","Contact last name":"Фамилия представителя",
  "Contact title":"Должность представителя",
  "Delivery terms":"Условия доставки","Term":"Условие",
  "CUT-OFF":"Последнее время","BEFORE (DAYS)":"До (дней)","AFTER (DAYS)":"После (дней)",
  "General":"Общие параметры","Contents":"Состав","Contents →":"Состав →",
  "← General":"← Общие","Schedule →":"График →",
  "Mon":"Пн","Tue":"Вт","Wed":"Ср","Thu":"Чт","Fri":"Пт","Sat":"Сб","Sun":"Вс",
  "Weekly Schedule":"График меню на неделю",
  "grams":"граммы","kilograms":"килограммы","litres":"литры","pcs":"шт.",
  "bags":"мешки / пакеты","cartons":"коробки / ящики","packages":"упаковки","sachets":"пакетики",
  "cold drinks":"холодные напитки","hot drinks":"горячие напитки","alcohol":"алкоголь",
  "main courses":"основные блюда","side dishes":"гарниры","desserts":"десерты",
  "soups":"супы","appetizers":"закуски",
  "Delivery":"Доставка","Delivery fee":"Стоимость доставки",
  "Pickup (free)":"Самовывоз (бесплатно)","Fulfillment":"Тип получения",
  "Your order":"Ваш заказ","Add items from the menu.":"Добавьте блюда из меню.",
  "Place order":"Оформить заказ","Next →":"Далее →","New order":"Новый заказ",
  "Save schedule":"Сохранить график",
  "Latest order no later than":"Последний заказ может быть принят не позже",
  "before closing":"до закрытия","Add period":"+ Период","Closed":"Закрыто",
  "Log in":"Зайти","Forgot password?":"Пароль подзабылся?",
  "Create account":"Зарегистрироваться","Welcome back":"И снова здравствуйте",
  "password":"пароль","Reset password":"Сбросить пароль",
  "Send recovery link":"Отправить ссылку","Back to login":"Обратно к авторизации",
  "I am a…":"Я…","Manufacturer":"Ресторан / Производитель","Customer":"Покупатель",
  "Already have an account? Log in →":"У вас уже есть учётная запись? Войдите с ней",
  "Min 6 characters":"Не меньше 6 знаков","Required":"Обязательное поле",
  "Create your account":"Создайте себе учётную запись",
  "This action may not be undone.":"Действие необратимо.",
  "No products added yet.":"Пока в составе ничего нет.",
  "is included in the following items:":"входит в состав следующих блюд:",
  "Unless these items are deleted, the product may not be deleted either. Do you wish to remove the above items along with the product?":
    "Если не удалить эти блюда, то и продукт тоже удалить нельзя. Хотите удалить продукт и все блюда, куда он входит?",
  "Delete product?":"Удалить продукт?","Failed to fetch":"Не грузится",
  "No items yet.":"Пока нет.",
  "No products added yet.":"Пока в составе ничего нет.",
  "🕐 Schedule":"🕐 График","↩ Log out":"↩ Выход",
  "No orders yet":"Заказов пока нет","I got my order ✓":"Получил(а) заказ ✓",
  "Cancel order?":"Отменить заказ?",
  "Are you sure you want to cancel order":"Вы уверены, что хотите отменить заказ",
  "No restaurants open right now":"Сейчас нет открытых ресторанов",
  "Check back soon!":"Загляните позже!",
  "New Item":"Новое блюдо","Edit Item":"Редактировать блюдо",
  "Delete items?":"Удалить блюда?",
  "Are you sure you wish to delete":"Вы уверены, что хотите удалить",
  "Save schedule":"Сохранить график",
  "+ Add product":"+ Добавить продукт","Remove":"Убрать",
  "No terms yet.":"Условий пока нет.",
  "New Supplier":"Новый поставщик","Edit Supplier":"Редактировать поставщика",
}

function T({ children }) {
  // Reactive translation — re-renders when lang changes via LangContext
  const lang = useLangContext();
  return <>{lang === 'ru' ? (RU[children] || children) : children}</>;
}

// Simple context so T() re-renders on lang change
const LangContext = createContext('en');
function useLangContext() { return useContext(LangContext); }

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
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(44,24,16,0.45)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:G.white, borderRadius:16, padding:32, maxWidth:440, width:"90%", animation:"fadeIn 0.2s ease", boxShadow:"0 20px 60px rgba(44,24,16,0.2)" }}>
        <h3 style={{ fontFamily:G.font, fontSize:20, marginBottom:16 }}>{title}</h3>
        <div style={{ color:G.muted, lineHeight:1.6, marginBottom:24, fontSize:15 }}>{children}</div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <Btn variant="ghost" onClick={onCancel}>{tl("Cancel")}</Btn>
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
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
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
          <button onClick={onRemove} style={{ background:"none", border:"none", color:G.red, cursor:"pointer", fontSize:13, padding:0, fontFamily:G.mono }}>{tl("Remove")}</button>
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
function RecipeForm({
 initial, lookups, onSave, onCancel, saving }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
  const [form, setForm] = useState({
    name:"", description:"", unid:"", caid:"", price:"", currency:"AMD",
    available:true, deliverable:true, image_url:null, image_thumb_url:null,
    ...initial
  });
  const [imageBlob, setImageBlob] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [slide, setSlide] = useState("general"); // "general" | "contents"
  const [contents, setContents] = useState(
    (initial?.contents||[]).map(c=>({ pid:String(c.pid), label:c.label||"", qty:c.qty??1 }))
  );
  const [allProducts, setAllProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  // Load products for Contents selector
  useEffect(()=>{
    if (slide==="contents" && allProducts.length===0) {
      // Use lookups if available, otherwise fetch
      fetch("/.netlify/functions/api/products", {
        headers:{ Authorization:`Bearer ${localStorage.getItem("token")}` }
      }).then(r=>r.json()).then(rows=>{
        // Fetch units too to build "Name, unit" labels
        fetch("/.netlify/functions/api/products/lookups", {
          headers:{ Authorization:`Bearer ${localStorage.getItem("token")}` }
        }).then(r=>r.json()).then(lu=>{
          const unitMap = Object.fromEntries((lu.units||[]).map(u=>[u.unid, u.name]));
          setAllProducts((rows||[]).map(p=>({
            pid: p.pid,
            label: [p.name, unitMap[p.unid]].filter(Boolean).join(", ")
          })));
        }).catch(()=>{});
      }).catch(()=>{});
    }
  },[slide]);

  const addContent = () => setContents(p=>[...p,{pid:"",label:"",qty:1}]);
  const removeContent = i => setContents(p=>p.filter((_,j)=>j!==i));
  const setContentPid = (i, pid) => {
    const prod = allProducts.find(p=>String(p.pid)===String(pid));
    setContents(p=>p.map((c,j)=>j===i?{...c,pid,label:prod?.label||""}:c));
  };
  const setContentQty = (i, delta) =>
    setContents(p=>p.map((c,j)=>j===i?{...c,qty:Math.max(0,Math.min(1000,Math.round((parseFloat(c.qty)||0)+delta)*1000)/1000)}:c));
  const setContentQtyDirect = (i, val) =>
    setContents(p=>p.map((c,j)=>j===i?{...c,qty:val}:c));

  const filteredProducts = productSearch.trim().length > 0
    ? allProducts.filter(p=>p.label.toLowerCase().includes(productSearch.toLowerCase()))
    : allProducts;

  // ── CONTENTS SLIDE ─────────────────────────────────────────────────────────
  if (slide==="contents") return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
        <h4 style={{ fontFamily:G.font, fontSize:15, color:G.dark }}>{tl("Contents")}</h4>
        <button onClick={()=>setSlide("general")} style={{ background:"none", border:"none", color:G.caramel, cursor:"pointer", fontFamily:G.mono, fontSize:13, fontWeight:600 }}>{tl("← General")}</button>
      </div>

      {contents.length===0 && (
        <p style={{ fontSize:13, color:G.muted }}>{tl("No products added yet.")}</p>
      )}

      {contents.map((c,i)=>(
        <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px", background:G.sand, borderRadius:8 }}>
          {/* Product selector */}
          <div style={{ flex:2, position:"relative" }}>
            <select value={c.pid} onChange={e=>setContentPid(i,e.target.value)}
              style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:`1px solid ${G.border}`, background:G.white, fontSize:13, fontFamily:G.mono, outline:"none" }}>
              <option value="">Select product…</option>
              {allProducts.map(p=><option key={p.pid} value={p.pid}>{p.label}</option>)}
            </select>
          </div>
          {/* Qty */}
          <div style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
            <button onClick={()=>setContentQty(i,-1)} style={{ width:24,height:24,borderRadius:5,border:`1px solid ${G.border}`,background:G.white,cursor:"pointer",fontWeight:700,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center" }}>−</button>
            <input type="number" value={c.qty} min={0} max={1000} step="any"
              onChange={e=>setContentQtyDirect(i,e.target.value)}
              onBlur={e=>setContents(p=>p.map((x,j)=>j===i?{...x,qty:Math.max(0,Math.min(1000,parseFloat(e.target.value)||0))}:x))}
              style={{ width:64,textAlign:"center",padding:"4px 6px",borderRadius:6,border:`1px solid ${G.border}`,fontSize:13,fontFamily:G.mono,outline:"none" }} />
            <button onClick={()=>setContentQty(i,1)} style={{ width:24,height:24,borderRadius:5,border:"none",background:G.caramel,cursor:"pointer",fontWeight:700,fontSize:14,color:G.white,display:"flex",alignItems:"center",justifyContent:"center" }}>+</button>
          </div>
          {/* Remove */}
          <button onClick={()=>removeContent(i)} style={{ background:"none",border:"none",color:G.red,cursor:"pointer",fontSize:13,fontFamily:G.mono,flexShrink:0 }}>{tl("Remove")}</button>
        </div>
      ))}

      <button onClick={addContent} style={{ background:"none",border:`1px dashed ${G.border}`,color:G.caramel,cursor:"pointer",fontSize:13,fontFamily:G.mono,padding:"8px 14px",borderRadius:8,alignSelf:"flex-start",fontWeight:600 }}>
        + Add product
      </button>

      <div style={{ display:"flex", gap:10, marginTop:4 }}>
        <Btn size="sm" onClick={()=>onSave(form, imageBlob, removeImage, contents)} loading={saving}>{tl("Save")}</Btn>
        <Btn variant="ghost" size="sm" onClick={onCancel}>{tl("Cancel")}</Btn>
      </div>
    </div>
  );

  // ── GENERAL SLIDE ──────────────────────────────────────────────────────────
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <Input label={tl("Name")} value={form.name} onChange={v=>set("name",v)} required />
        <Input label={tl("Description")} value={form.description||""} onChange={v=>set("description",v)} />
        <Select label={tl("Units")} value={String(form.unid||"")} onChange={v=>set("unid",v)} options={lookups.units.map(u=>({value:String(u.unid),label:u.name}))} placeholder="Select units" />
        <Select label={tl("Category")} value={String(form.caid||"")} onChange={v=>set("caid",v)} options={lookups.categories.map(c=>({value:String(c.caid),label:c.name}))} placeholder="Select category" />
        <Input label={tl("Price")} type="number" value={String(form.price||"")} onChange={v=>set("price",v)} placeholder="0" />
        <Select label={tl("Currency")} value={form.currency||"AMD"} onChange={v=>set("currency",v)} options={CURRENCIES} />
      </div>

      <div>
        <label style={{ fontSize:13, fontWeight:600, color:G.dark, display:"block", marginBottom:8 }}>{tl("Image")}</label>
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
        <Btn size="sm" onClick={()=>onSave(form, imageBlob, removeImage, contents)} loading={saving}>{tl("Save")}</Btn>
        <Btn variant="ghost" size="sm" onClick={onCancel}>{tl("Cancel")}</Btn>
        <Btn variant="secondary" size="sm" onClick={()=>setSlide("contents")} style={{ marginLeft:"auto" }}>{tl("Contents →")}</Btn>
      </div>
    </div>
  );
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
function Nav({ user, page, setPage, logout, lang, setLang }) {
  const isM = user?.is_manufacturer;
  const [dropOpen, setDropOpen] = useState(false);
  const tl = k => lang==='ru' ? (RU[k]||k) : k;
  const links = isM
    ? [{key:"orders-manuf",label:tl("Orders")},{key:"products",label:tl("Products")},{key:"items",label:tl("Items")},{key:"menus",label:tl("Menus")},{key:"procurement",label:tl("Procurement")},{key:"suppliers",label:tl("Suppliers")}]
    : [{key:"restaurants",label:tl("Restaurants")},{key:"orders-cust",label:tl("My Orders")}];
  const navigate = key => { setPage(key); setDropOpen(false); };
  return (
    <nav style={{ background:G.white, borderBottom:`1px solid ${G.border}`, padding:"0 20px", display:"flex", alignItems:"center", height:60, position:"sticky", top:0, zIndex:300, boxShadow:"0 1px 12px rgba(44,24,16,0.06)" }}>
      <button onClick={()=>navigate(isM?"orders-manuf":"restaurants")} style={{ fontFamily:G.font, fontSize:20, fontWeight:700, color:G.caramel, background:"none", border:"none", cursor:"pointer", marginRight:20, fontStyle:"italic", flexShrink:0 }}>Pun&Cotta</button>
      <div style={{ display:"flex", gap:2, flex:1, minWidth:0, overflow:"hidden" }}>
        {links.map(l=>(
          <button key={l.key} onClick={()=>navigate(l.key)} style={{ background:page===l.key?G.sand:"none", border:"none", padding:"6px 10px", borderRadius:8, fontFamily:G.mono, fontSize:13, fontWeight:page===l.key?600:400, color:page===l.key?G.caramel:G.muted, cursor:"pointer", transition:"all 0.15s", whiteSpace:"nowrap" }}>{l.label}</button>
        ))}
      </div>
      {/* Language toggle */}
      <button onClick={()=>{ const nl=lang==='en'?'ru':'en'; _currentLang=nl; setLang(nl); }}
        style={{ display:"flex", alignItems:"center", gap:3, background:"none", border:`1px solid ${G.border}`, borderRadius:8, cursor:"pointer", fontFamily:G.mono, fontSize:12, color:G.muted, padding:"5px 9px", whiteSpace:"nowrap", marginRight:8, flexShrink:0 }}>
        🌐{lang==='en'?'RU':'EN'}
      </button>
      <div style={{ position:"relative", flexShrink:0 }}>
        <button onClick={()=>setDropOpen(p=>!p)} style={{ display:"flex", alignItems:"center", gap:7, background:G.sand, border:`1px solid ${G.border}`, borderRadius:8, cursor:"pointer", fontFamily:G.mono, fontSize:13, color:G.dark, padding:"7px 12px", whiteSpace:"nowrap", fontWeight:500 }}>
          👤 {user?.first_name} {user?.last_name}
          <span style={{ fontSize:9, color:G.muted }}>▾</span>
        </button>
        {dropOpen&&(
          <>
            <div onClick={()=>setDropOpen(false)} style={{ position:"fixed", inset:0, zIndex:298 }} />
            <div style={{ position:"absolute", right:0, top:"calc(100% + 6px)", background:G.white, border:`1px solid ${G.border}`, borderRadius:10, boxShadow:"0 8px 28px rgba(44,24,16,0.15)", minWidth:176, zIndex:299, overflow:"hidden", animation:"fadeIn 0.15s ease" }}>
              {isM&&(<>
                <button onClick={()=>navigate("schedule")} style={{ width:"100%", textAlign:"left", padding:"11px 16px", background:"none", border:"none", cursor:"pointer", fontFamily:G.mono, fontSize:14, color:G.dark, display:"block" }}
                  onMouseEnter={e=>e.currentTarget.style.background=G.sand} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                  {tl("🕐 Schedule")}
                </button>
                <div style={{ height:1, background:G.border }} />
              </>)}
              <button onClick={()=>{logout();setDropOpen(false);}} style={{ width:"100%", textAlign:"left", padding:"11px 16px", background:"none", border:"none", cursor:"pointer", fontFamily:G.mono, fontSize:14, color:G.red, display:"block" }}
                onMouseEnter={e=>e.currentTarget.style.background=G.sand} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                {tl("↩ Log out")}
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

function LoginPage({ onLogin, setPage, setLang }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  const submit = async() => { setErr(""); setLoading(true); try { const {token,user}=await api.login(email,pw); localStorage.setItem("token",token); onLogin(user); } catch(e){setErr(e.message);} finally{setLoading(false);} };
  return (
    <AuthLayout>
      <h2 style={{ fontFamily:G.font, fontSize:22, marginBottom:24 }}>Welcome back</h2>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        <Input label={tl("Email")} type="email" value={email} onChange={setEmail} placeholder="you@example.com" required />
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

function SignupPage({ setPage, toast, setLang }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
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
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <h2 style={{ fontFamily:G.font, fontSize:22 }}>{lang==='ru'?(RU["Create your account"]||"Create your account"):"Create your account"}</h2>
        <button onClick={()=>{ const nl=lang==='en'?'ru':'en'; _currentLang=nl; setLang(nl); }} style={{ background:"none", border:`1px solid ${G.border}`, borderRadius:8, cursor:"pointer", fontFamily:G.mono, fontSize:12, color:G.muted, padding:"4px 8px" }}>🌐{lang==='en'?'RU':'EN'}</button>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:13 }}>
          <Input label="First name" value={form.first_name} onChange={v=>set("first_name",v)} required error={errors.first_name} />
          <Input label="Last name"  value={form.last_name}  onChange={v=>set("last_name",v)}  required error={errors.last_name} />
        </div>
        <Input label="Email" type="email" value={form.email} onChange={v=>set("email",v)} required error={errors.email} />
        <Input label={tl("Phone")} value={form.phone} onChange={v=>set("phone",v)} placeholder="+374 91 …" />
        <Input label={tl("Street address")} value={form.street_address} onChange={v=>set("street_address",v)} />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:13 }}>
          <Input label={tl("City")} value={form.city} onChange={v=>set("city",v)} />
          <Input label={tl("ZIP")}  value={form.zip}  onChange={v=>set("zip",v)} />
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

function ForgotPage({
 setPage, toast }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
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
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
  const [products, setProducts] = useState([]); const [lookups, setLookups] = useState({units:[],categories:[]}); const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]); const [sortKey, setSortKey] = useState("name"); const [sortDir, setSortDir] = useState("asc");
  const [showForm, setShowForm] = useState(false); const [dialog, setDialog] = useState(null); const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({name:"",sku:"",unid:"",caid:""});
  const [editProduct, setEditProduct] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [usageMap, setUsageMap] = useState({});

  const load = useCallback(async()=>{ setLoading(true); try{ const[p,l]=await Promise.all([api.getProducts(),api.getProductLookups()]); setProducts(p); setLookups(l); } catch(e){toast(e.message,"error");} finally{setLoading(false);} },[]);
  useEffect(()=>{load();},[]);
  const sorted=[...products].sort((a,b)=>{ const v=String(a[sortKey]||"")<String(b[sortKey]||"")?-1:String(a[sortKey]||"")>String(b[sortKey]||"")?1:0; return sortDir==="asc"?v:-v; });
  const toggleSort=k=>{if(sortKey===k)setSortDir(d=>d==="asc"?"desc":"asc");else{setSortKey(k);setSortDir("asc");}};
  const toggleSel=id=>setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const p = await api.createProduct({name:form.name, sku:form.sku||null, unid:form.unid||null, caid:form.caid||null});
      setProducts(prev=>[...prev,p]); toast(`"${p.name}" ${tl("saved")}`);
      setForm({name:"",sku:"",unid:"",caid:""}); setShowForm(false);
    } catch(e){toast(e.message,"error");} finally{setSaving(false);}
  };

  const saveEdit = async () => {
    if (!editForm.name?.trim()) return;
    setSaving(true);
    try {
      const p = await api.updateProduct(editProduct.pid, {name:editForm.name, sku:editForm.sku||null, unid:editForm.unid||null, caid:editForm.caid||null});
      setProducts(prev=>prev.map(x=>x.pid===p.pid?p:x));
      toast(`"${p.name}" ${tl("saved")}`); setEditProduct(null);
    } catch(e){toast(e.message,"error");} finally{setSaving(false);}
  };

  const openEdit = p => { setEditProduct(p); setEditForm({name:p.name, sku:p.sku||"", unid:String(p.unid||""), caid:String(p.caid||"")}); };

  const openDeleteDialog = async () => {
    try { setUsageMap(await api.getProductUsage(selected) || {}); } catch { setUsageMap({}); }
    setDialog("del");
  };

  const doDelete = async (cascade) => {
    const names = selected.map(id=>products.find(p=>p.pid===id)?.name).filter(Boolean).join(", ");
    try {
      await api.deleteProducts(selected, cascade);
      setProducts(prev=>prev.filter(p=>!selected.includes(p.pid)));
      toast(`${names} ${tl("saved")}`); setSelected([]); setDialog(null); setUsageMap({});
    } catch(e){toast(e.message,"error");}
  };

  const affectedItems = [];
  for (const pid of selected) { (usageMap[pid]||[]).forEach(r=>{ if(!affectedItems.find(x=>x.rid===r.rid)) affectedItems.push(r); }); }
  affectedItems.sort((a,b)=>a.name.localeCompare(b.name));
  const selectedNames = selected.map(id=>products.find(p=>p.pid===id)?.name).filter(Boolean);

  const cols = [
    {key:"pid",   label:tl("ID"),       sortable:true,  render:r=><span style={{color:G.muted,fontSize:13}}>#{r._id}</span>},
    {key:"name",  label:tl("Name"),     sortable:true,  render:r=>(
      <button onClick={()=>openEdit(r)} style={{background:"none",border:"none",cursor:"pointer",fontFamily:G.mono,fontSize:14,color:G.dark,padding:0,textAlign:"left",textDecoration:"underline dotted",textUnderlineOffset:3}}>{r.name}</button>
    )},
    {key:"sku",   label:tl("SKU"),      sortable:true,  render:r=>r.sku||<span style={{color:G.muted}}>—</span>},
    {key:"category",label:tl("Category"),sortable:true, render:r=>r.category?<Badge>{r.category}</Badge>:<span style={{color:G.muted}}>—</span>},
    {key:"units", label:tl("Units"),    sortable:false, render:r=>r.units||<span style={{color:G.muted}}>—</span>},
  ];

  return (
    <Page title={tl("Products")} actions={<>{selected.length>0&&<Btn variant="danger" size="sm" onClick={openDeleteDialog}>{tl("Delete")} ({selected.length})</Btn>}<Btn size="sm" onClick={()=>setShowForm(s=>!s)}>{tl("+ New product")}</Btn></>}>
      {showForm&&(
        <div style={{ background:G.white, border:`1px solid ${G.border}`, borderRadius:14, padding:24, marginBottom:20, animation:"fadeIn 0.2s ease" }}>
          <h3 style={{ fontFamily:G.font, fontSize:17, marginBottom:16 }}>New Product</h3>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:14, marginBottom:14 }}>
            <Input label={tl("Name")} value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} required />
            <Input label={tl("SKU")} value={form.sku} onChange={v=>setForm(p=>({...p,sku:v}))} placeholder="Optional" />
            <Select label={tl("Units")} value={form.unid} onChange={v=>setForm(p=>({...p,unid:v}))} options={lookups.units.map(u=>({value:String(u.unid),label:u.name}))} placeholder="Select units" />
            <Select label={tl("Category")} value={form.caid} onChange={v=>setForm(p=>({...p,caid:v}))} options={lookups.categories.map(c=>({value:String(c.caid),label:c.name}))} placeholder="Select category" />
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <Btn size="sm" onClick={save} loading={saving}>{tl("Save")}</Btn>
            <Btn variant="ghost" size="sm" onClick={()=>setShowForm(false)}>{tl("Cancel")}</Btn>
          </div>
        </div>
      )}
      {loading?<Spinner/>:<DataTable columns={cols} rows={sorted.map(p=>({...p,_id:p.pid}))} selected={selected} onSelect={toggleSel} onSelectAll={setSelected} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />}
      {editProduct&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(44,24,16,0.45)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:G.white, borderRadius:16, padding:32, maxWidth:480, width:"90%", animation:"fadeIn 0.2s ease", boxShadow:"0 20px 60px rgba(44,24,16,0.2)" }}>
            <h3 style={{ fontFamily:G.font, fontSize:20, marginBottom:20 }}>Edit Product</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:20 }}>
              <Input label={tl("Name")} value={editForm.name||""} onChange={v=>setEditForm(p=>({...p,name:v}))} required />
              <Input label={tl("SKU")} value={editForm.sku||""} onChange={v=>setEditForm(p=>({...p,sku:v}))} placeholder="Optional" />
              <Select label={tl("Units")} value={editForm.unid||""} onChange={v=>setEditForm(p=>({...p,unid:v}))} options={lookups.units.map(u=>({value:String(u.unid),label:u.name}))} placeholder="Select units" />
              <Select label={tl("Category")} value={editForm.caid||""} onChange={v=>setEditForm(p=>({...p,caid:v}))} options={lookups.categories.map(c=>({value:String(c.caid),label:c.name}))} placeholder="Select category" />
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <Btn size="sm" onClick={saveEdit} loading={saving}>{tl("Save")}</Btn>
              <Btn variant="ghost" size="sm" onClick={()=>setEditProduct(null)}>{tl("Cancel")}</Btn>
            </div>
          </div>
        </div>
      )}
      {dialog==="del"&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(44,24,16,0.45)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:G.white, borderRadius:16, padding:32, maxWidth:480, width:"90%", animation:"fadeIn 0.2s ease", boxShadow:"0 20px 60px rgba(44,24,16,0.2)" }}>
            <h3 style={{ fontFamily:G.font, fontSize:20, marginBottom:16 }}>{tl("Delete product?")}</h3>
            {affectedItems.length===0 ? (
              <p style={{ color:G.muted, lineHeight:1.6, marginBottom:24, fontSize:15 }}>
                {tl("Are you sure you wish to delete")} <b>{selectedNames.join(", ")}</b>? {tl("This action may not be undone.")}
              </p>
            ) : (
              <p style={{ color:G.muted, lineHeight:1.6, marginBottom:24, fontSize:15 }}>
                <b>{selectedNames.join(", ")}</b> {tl("is included in the following items:")}{" "}
                <b>{affectedItems.map(r=>r.name).join(", ")}</b>.{" "}
                {tl("Unless these items are deleted, the product may not be deleted either. Do you wish to remove the above items along with the product?")}{" "}
                {tl("This action may not be undone.")}
              </p>
            )}
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <Btn variant="ghost" onClick={()=>{setDialog(null);setUsageMap({});}}>{tl("Cancel")}</Btn>
              <Btn variant="danger" onClick={()=>doDelete(affectedItems.length>0)}>{tl("Yes")}</Btn>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

// ─── RECIPES PAGE ─────────────────────────────────────────────────────────────
function RecipesPage({
 toast }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
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

  const handleSave = async(form, imageBlob, removeImage, contents, existingRid) => {
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

      const payload = { name:form.name, description:form.description||null, unid:form.unid||null, caid:form.caid||null, price:Number(form.price)||0, currency:form.currency||"AMD", available:form.available!==false, deliverable:form.deliverable!==false, image_url, image_thumb_url, contents:(contents||[]).filter(c=>c.pid) };

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

  const ImgCell = ({r}) => {
    const src = r.image_url||r.image_thumb_url;
    if (!src) return <span style={{color:G.muted,fontSize:12}}>—</span>;
    return (
      <button onClick={()=>setLightbox({src:r.image_url||r.image_thumb_url, description:r.description})}
        style={{ background:"none", border:"none", cursor:"pointer", fontSize:20, padding:0, lineHeight:1 }}
        title="View image">🖼</button>
    );
  };

  const cols = [
    {key:"rid",label:tl("ID"),sortable:true,render:r=><span style={{color:G.muted,fontSize:13}}>#{r._id}</span>},
    {key:"img",label:"🖼",sortable:false,render:r=><ImgCell r={r}/>},
    {key:"name",label:tl("Name"),sortable:true,render:r=>(
      <button className="recipe-link" onClick={()=>setEditRecipe(r)} style={{ background:"none", border:"none", cursor:"pointer", fontFamily:G.mono, fontSize:14, color:G.dark, padding:0, textAlign:"left" }}>{r.name}</button>
    )},
    {key:"description",label:tl("Description"),sortable:true,render:r=>r.description||<span style={{color:G.muted}}>—</span>},
    {key:"units",label:tl("Units"),sortable:false,render:r=>r.units||"—"},
    {key:"available",label:tl("Avail."),sortable:false,render:r=><span>{r.available?"✅":"❌"}</span>},
    {key:"deliverable",label:tl("Deliv."),sortable:false,render:r=><span>{r.deliverable!==false?"✅":"❌"}</span>},
    {key:"price",label:tl("Price"),sortable:false,render:r=><span style={{fontWeight:600}}>{r.price} {r.currency}</span>},
    {key:"category",label:tl("Category"),sortable:true,render:r=>r.category?<Badge>{r.category}</Badge>:<span style={{color:G.muted}}>—</span>},
  ];

  return (
    <Page title={tl("Items")} actions={<>{selected.length>0&&<Btn variant="danger" size="sm" onClick={()=>setDialog("del")}>{tl("Delete")} ({selected.length})</Btn>}<Btn size="sm" onClick={()=>setShowNew(s=>!s)}>{tl("+ New item")}</Btn></>}>
      {showNew&&(
        <div style={{ background:G.white, border:`1px solid ${G.border}`, borderRadius:14, padding:24, marginBottom:20, animation:"fadeIn 0.2s ease" }}>
          <h3 style={{ fontFamily:G.font, fontSize:17, marginBottom:16 }}>New Item</h3>
          <RecipeForm initial={BLANK} lookups={lookups} saving={saving} onSave={(f,b,r,c)=>handleSave(f,b,r,c,null)} onCancel={()=>setShowNew(false)} />
        </div>
      )}
      {loading?<Spinner/>:<DataTable columns={cols} rows={sorted.map(r=>({...r,_id:r.rid}))} selected={selected} onSelect={toggleSel} onSelectAll={setSelected} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />}

      {/* EDIT MODAL */}
      {editRecipe&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(44,24,16,0.45)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:G.white, borderRadius:16, padding:32, maxWidth:640, width:"100%", maxHeight:"90vh", overflowY:"auto", animation:"fadeIn 0.2s ease", boxShadow:"0 20px 60px rgba(44,24,16,0.2)" }}>
            <h3 style={{ fontFamily:G.font, fontSize:20, marginBottom:20 }}>Edit Item</h3>
            <RecipeForm initial={editRecipe} lookups={lookups} saving={saving} onSave={(f,b,r,c)=>handleSave(f,b,r,c,editRecipe.rid)} onCancel={()=>setEditRecipe(null)} />
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
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
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
                {tl(DAY_LABELS[i])}
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
function MenusPage({
 toast, storeSchedule, setStoreSchedule }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
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
                }}>{tl(DAY_LABELS[i])}</button>
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
    <Page title={tl("Menus")} actions={<Btn size="sm" onClick={()=>setShowNew(s=>!s)}>{tl("+ New menu")}</Btn>}>
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
            <Btn size="sm" onClick={saveNew} loading={saving}>{tl("Save")}</Btn>
            <Btn variant="ghost" size="sm" onClick={()=>setShowNew(false)}>{tl("Cancel")}</Btn>
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
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function parseLocalDate(isoStr) {
  // YYYY-MM-DD → Date (local midnight)
  if (!isoStr) return null;
  const [y,m,d] = isoStr.split("-").map(Number);
  if (!y||!m||!d) return null;
  return new Date(y, m-1, d);
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
function NewOrderModal({
 onClose, onCreated, toast }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
  const [menus, setMenus]             = useState([]);
  const [mid, setMid]                 = useState("");
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [qty, setQty]                 = useState({});
  const [pickup, setPickup]           = useState(true);
  const [customer, setCustomer]       = useState(null);
  const [customerQ, setCustomerQ]     = useState("");
  const [results, setResults]         = useState([]);
  const [addrMode, setAddrMode]       = useState("customer"); // "customer" | "other"
  const [step, setStep]               = useState(1); // 1 = main, 2 = other address
  const [otherStreet, setOtherStreet] = useState("");
  const [otherCity, setOtherCity]     = useState("");
  const [otherZip, setOtherZip]       = useState("");
  const [otherPhone, setOtherPhone]   = useState("");
  const [deliveryComments, setDeliveryComments] = useState("");
  const [saving, setSaving]           = useState(false);

  useEffect(()=>{
    api.getMenus().then(m=>{ setMenus(m); if(m.length===1){setMid(String(m[0].mid));setSelectedMenu(m[0]);} }).catch(()=>{});
  },[]);

  useEffect(()=>{
    if (customerQ.length < 2) { setResults([]); return; }
    const t = setTimeout(async()=>{ try{ const r=await api.searchCustomers(customerQ); setResults(r); }catch{} }, 300);
    return ()=>clearTimeout(t);
  },[customerQ]);

  const selectMenu = id => { const m=menus.find(x=>String(x.mid)===id); setMid(id); setSelectedMenu(m||null); setQty({}); };
  const changeQty = (rid, delta) => setQty(p=>({...p,[rid]:Math.max(0,Math.min(20,(p[rid]||0)+delta))}));

  const items = (selectedMenu?.recipes||[]).filter(r=>(qty[r.rid]||0)>0).map(r=>({rid:r.rid,name:r.name,qty:qty[r.rid],price:r.price}));
  const deliveryFee = !pickup && selectedMenu ? selectedMenu.delivery_fee : 0;
  const total = items.reduce((s,it)=>s+it.qty*it.price,0) + deliveryFee;

  // Address to submit
  const customerAddr = customer ? [customer.street_address, customer.city, customer.zip, customer.phone].filter(Boolean).join(", ") : "";
  const otherAddr    = [otherStreet, otherCity, otherZip, otherPhone].filter(Boolean).join(", ");
  const deliveryAddress = !pickup ? (addrMode==="customer" ? customerAddr : otherAddr) : null;

  const canPlaceMain = items.length > 0 && mid && (
    pickup ||
    (!pickup && addrMode==="customer" && customerAddr) ||
    (!pickup && addrMode==="other")
  );

  const submit = async (addressOverride) => {
    if (!mid || !items.length) return;
    setSaving(true);
    try {
      const addr = addressOverride ?? deliveryAddress;
      const payload = {
        mid: Number(mid), pickup, items,
        delivery_address: addr || null,
        ...(customer?.uid ? { customer_uid: customer.uid } : { walkin_name: customerQ||"Walk-in" }),
        delivery_comments: deliveryComments || undefined,
      };
      const order = await api.placeOrder(payload);
      toast(`Order #${order.oid} created`);
      onCreated(order);
      onClose();
    } catch(e){ toast(e.message,"error"); }
    finally { setSaving(false); }
  };

  const grouped = {};
  (selectedMenu?.recipes||[]).forEach(r=>{ if(!grouped[r.category])grouped[r.category]=[]; grouped[r.category].push(r); });

  // ── STEP 2: Other address ──────────────────────────────────────────────────
  if (step === 2) {
    const addr = [otherStreet, otherCity, otherZip, otherPhone].filter(Boolean).join(", ");
    return (
      <div style={{ position:"fixed", inset:0, background:"rgba(44,24,16,0.45)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
        <div style={{ background:G.white, borderRadius:16, width:"100%", maxWidth:480, display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(44,24,16,0.2)", animation:"fadeIn 0.2s ease" }}>
          <div style={{ padding:"20px 24px", borderBottom:`1px solid ${G.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <h3 style={{ fontFamily:G.font, fontSize:20 }}>Delivery address</h3>
            <button onClick={()=>setStep(1)} style={{ background:"none", border:"none", fontSize:13, cursor:"pointer", color:G.muted, fontFamily:G.mono }}>← Back</button>
          </div>
          <div style={{ padding:24, display:"flex", flexDirection:"column", gap:14 }}>
            <Input label="Street" value={otherStreet} onChange={setOtherStreet} placeholder="Street address" />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <Input label="City" value={otherCity} onChange={setOtherCity} />
              <Input label="ZIP" value={otherZip} onChange={setOtherZip} />
            </div>
            <Input label="Phone" value={otherPhone} onChange={setOtherPhone} placeholder="+374 91 …" />
            <div>
              <label style={{ fontSize:13, fontWeight:600, color:G.dark, display:"block", marginBottom:6 }}>Delivery comments</label>
              <textarea value={deliveryComments} onChange={e=>setDeliveryComments(e.target.value.slice(0,100))}
                placeholder="Instructions, floor, buzzer code…" rows={3} maxLength={100}
                style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:`1px solid ${G.border}`, fontSize:14, fontFamily:G.mono, outline:"none", resize:"vertical" }}
                onFocus={e=>e.target.style.borderColor=G.caramel} onBlur={e=>e.target.style.borderColor=G.border}
              />
              <span style={{ fontSize:11, color:G.muted }}>{deliveryComments.length}/100</span>
            </div>
          </div>
          <div style={{ padding:"16px 24px", borderTop:`1px solid ${G.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontWeight:700, fontSize:16, color:G.caramel }}>{total > 0 ? `${total} AMD` : "—"}</span>
            <Btn onClick={()=>submit(addr)} loading={saving} disabled={!otherStreet}>{tl("Place order")}</Btn>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 1: Main ──────────────────────────────────────────────────────────
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(44,24,16,0.45)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:G.white, borderRadius:16, width:"100%", maxWidth:680, maxHeight:"92vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(44,24,16,0.2)", animation:"fadeIn 0.2s ease" }}>
        <div style={{ padding:"20px 24px", borderBottom:`1px solid ${G.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h3 style={{ fontFamily:G.font, fontSize:20 }}>New order</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:G.muted, lineHeight:1 }}>×</button>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:24, display:"flex", flexDirection:"column", gap:20 }}>

          {/* 1. Fulfillment — at top */}
          <div>
            <label style={{ fontSize:13, fontWeight:600, color:G.dark, display:"block", marginBottom:8 }}>{tl("Fulfillment")}</label>
            <div style={{ display:"flex", gap:20 }}>
              {[{val:true,label:"Pickup (free)"},{val:false,label:`Delivery (+${selectedMenu?.delivery_fee||0} AMD)`}].map(opt=>(
                <label key={String(opt.val)} style={{ display:"flex", alignItems:"center", gap:7, cursor:"pointer", fontSize:14 }}>
                  <input type="radio" name="mo_pickup" checked={pickup===opt.val}
                    onChange={()=>{ setPickup(opt.val); setAddrMode("customer"); }}
                    style={{accentColor:G.caramel}} />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* 2. Customer */}
          <div>
            <label style={{ fontSize:13, fontWeight:600, color:G.dark, display:"block", marginBottom:6 }}>
              Customer {!pickup && addrMode==="customer" && <span style={{color:G.caramel}}>*</span>}
            </label>
            {customer ? (
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:G.sand, borderRadius:8 }}>
                <span style={{ flex:1, fontSize:14 }}>👤 {customer.first_name} {customer.last_name}</span>
                <button onClick={()=>{setCustomer(null);setCustomerQ("");}} style={{ background:"none", border:"none", color:G.red, cursor:"pointer", fontSize:13, fontFamily:G.mono }}>{tl("Remove")}</button>
              </div>
            ) : (
              <div style={{ position:"relative" }}>
                <input value={customerQ} onChange={e=>setCustomerQ(e.target.value)}
                  placeholder={pickup ? "Name, email or phone (optional)" : "Search existing customer"}
                  style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:`1px solid ${G.border}`, fontSize:14, fontFamily:G.mono, outline:"none" }}
                  onFocus={e=>e.target.style.borderColor=G.caramel} onBlur={e=>e.target.style.borderColor=G.border}
                />
                {results.length>0&&(
                  <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:G.white, border:`1px solid ${G.border}`, borderRadius:10, boxShadow:"0 8px 24px rgba(44,24,16,0.12)", zIndex:10, overflow:"hidden" }}>
                    {results.map(r=>(
                      <button key={r.uid} onClick={()=>{setCustomer(r);setCustomerQ(`${r.first_name} ${r.last_name}`);setResults([]);}}
                        style={{ width:"100%", textAlign:"left", padding:"10px 14px", background:"none", border:"none", cursor:"pointer", fontFamily:G.mono, fontSize:14, display:"flex", gap:10 }}
                        onMouseEnter={e=>e.currentTarget.style.background=G.sand}
                        onMouseLeave={e=>e.currentTarget.style.background="none"}>
                        <span style={{flex:1}}>{r.first_name} {r.last_name}</span>
                        <span style={{color:G.muted,fontSize:12}}>{r.email}</span>
                      </button>
                    ))}
                    <div style={{ padding:"8px 14px", fontSize:12, color:G.muted, borderTop:`1px solid ${G.border}` }}>Not listed? Will be saved as walk-in.</div>
                  </div>
                )}
                {customerQ.length>=2&&results.length===0&&!customer&&(
                  <p style={{ fontSize:12, color:G.muted, marginTop:4 }}>No matches — will be saved as walk-in "{customerQ}"</p>
                )}
              </div>
            )}
          </div>

          {/* 3. Delivery address (only when delivery selected) */}
          {!pickup && (
            <div>
              <label style={{ fontSize:13, fontWeight:600, color:G.dark, display:"block", marginBottom:8 }}>Delivery address <span style={{color:G.caramel}}>*</span></label>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {/* Customer address radio */}
                <label style={{ display:"flex", alignItems:"flex-start", gap:8, cursor:"pointer" }}>
                  <input type="radio" name="addrMode" checked={addrMode==="customer"} onChange={()=>setAddrMode("customer")} style={{accentColor:G.caramel,marginTop:2}} />
                  <div>
                    <span style={{ fontSize:14, fontWeight:500 }}>Customer's address</span>
                    {customer && customerAddr ? (
                      <p style={{ fontSize:13, color:G.muted, marginTop:2 }}>{customerAddr}</p>
                    ) : (
                      <p style={{ fontSize:12, color:G.muted, fontStyle:"italic", marginTop:2 }}>Select a registered customer to autofill</p>
                    )}
                  </div>
                </label>
                {/* Other address radio */}
                <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
                  <input type="radio" name="addrMode" checked={addrMode==="other"} onChange={()=>setAddrMode("other")} style={{accentColor:G.caramel}} />
                  <span style={{ fontSize:14, fontWeight:500 }}>Other address</span>
                </label>
              </div>
            </div>
          )}

          {/* 4. Menu */}
          <Select label={tl("Menu")} value={mid} onChange={selectMenu}
            options={menus.map(m=>({value:String(m.mid),label:m.name+(m.available?"":" (draft)")}))}
            placeholder="Select a menu" required />

          {/* 5. Recipe picker */}
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
        </div>

        {/* Footer */}
        <div style={{ padding:"16px 24px", borderTop:`1px solid ${G.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontWeight:700, fontSize:16, color:G.caramel }}>{total > 0 ? `${total} AMD` : "—"}</span>
          <div style={{ display:"flex", gap:10 }}>
            <Btn variant="ghost" onClick={onClose}>{tl("Cancel")}</Btn>
            {!pickup && addrMode==="other" ? (
              <Btn onClick={()=>setStep(2)} disabled={!items.length||!mid}>{tl("Next →")}</Btn>
            ) : (
              <Btn onClick={()=>submit()} loading={saving} disabled={!canPlaceMain}>{tl("Place order")}</Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrdersManufPage({
 toast }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
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

  const KANBAN_ORDER = ["New","Accepted","Preparing","Done","Dispatched","Declined","Delivered"];
  const statuses = KANBAN_ORDER;
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
    { key:"created_at", label:tl("Date placed") },
    { key:"first_name", label:tl("First name") },
    { key:"last_name",  label:tl("Last name") },
    { key:"status",     label:tl("Status") },
    { key:"total",      label:tl("Total") },
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
  // Dates stored as YYYY-MM-DD (native date input format), displayed as DD-MM-YYYY
  function isoToDisplay(iso) {
    if (!iso) return "";
    const [y,m,d] = iso.split("-");
    return `${d}-${m}-${y}`;
  }

  const DatePicker = ({value, onChange, min, max}) => (
    <div style={{ position:"relative", display:"inline-flex", alignItems:"center" }}>
      <input type="date" value={value} min={min} max={max}
        onChange={e=>onChange(e.target.value)}
        style={{ padding:"6px 10px", borderRadius:8, border:`1px solid ${G.border}`, fontSize:13, fontFamily:G.mono, outline:"none", colorScheme:"light", cursor:"pointer" }}
        onFocus={e=>e.target.style.borderColor=G.caramel}
        onBlur={e=>e.target.style.borderColor=G.border}
      />
    </div>
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
              const checked = filter.includes(s);
              return (
                <label key={s} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 14px", cursor:"pointer" }}
                  onMouseEnter={e=>e.currentTarget.style.background=G.sand}
                  onMouseLeave={e=>e.currentTarget.style.background="none"}>
                  <input type="checkbox" checked={checked}
                    onChange={()=>{ toggleStatus(s); setPage(0); }}
                    style={{ accentColor:G.caramel, width:14, height:14 }} />
                  <span style={{ fontSize:13, color:G.dark, fontWeight:checked?500:400 }}>{tl(s)}</span>
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
      <Btn size="sm" onClick={()=>setShowNewOrder(true)}>{tl("+ New order")}</Btn>
      <SearchBox />
      <span style={{ fontSize:12, color:G.muted }}>{tl("From")}</span>
      <DatePicker value={dateFrom} max={dateTo} onChange={v=>{setDateFrom(v);setPage(0);}} />
      <span style={{ fontSize:12, color:G.muted }}>{tl("To")}</span>
      <DatePicker value={dateTo} min={dateFrom} onChange={v=>{setDateTo(v);setPage(0);}} />
      <ViewToggle />
      <StatusDropdown />
    </div>
  );

  return (
    <Page title={tl("Orders")} actions={toolbar}>
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
          {KANBAN_ORDER.filter(status=>filter.includes(status)).map(status=>{
            const cfg=STATUS_CONFIG[status]; const col=searched.filter(o=>o.status===status);
            return (
              <div key={status} style={{ background:G.white, borderRadius:14, border:`1px solid ${G.border}`, overflow:"hidden" }}>
                <div style={{ padding:"10px 14px", background:cfg.bg, borderBottom:`2px solid ${cfg.color}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:13, fontWeight:700, color:cfg.color, letterSpacing:"0.04em" }}>{tl(status.toUpperCase())}</span>
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
                        <span style={{ fontSize:11, color:G.muted }}>{o.pickup?tl("Pickup (free)"):tl("Delivery")}</span>
                      </div>
                      {(cfg.next && !(o.status==="Done" && o.allNonDeliverable))&&(
                        <div style={{ display:"flex", gap:6, marginTop:8 }}>
                          <Btn size="sm" onClick={()=>advance(o.oid)} style={{flex:1,fontSize:11,padding:"5px 0"}}>{tl(cfg.next)}</Btn>
                          {cfg.canDecline&&<Btn variant="danger" size="sm" onClick={()=>{setPending(o.oid);setDialog("decline");}} style={{fontSize:11,padding:"5px 10px"}}>✕</Btn>}
                        </div>
                      )}
                    </div>
                  ))}
                  {col.length===0&&<div style={{padding:16,textAlign:"center",color:G.muted,fontSize:12}}>{tl("Empty")}</div>}
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
                      {tl(c.label)}{sortKey===c.key&&<span style={{marginLeft:4}}>{sortDir==="asc"?"↑":"↓"}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.length===0?(
                  <tr><td colSpan={TABLE_COLS.length} style={{padding:40,textAlign:"center",color:G.muted}}>{tl("No orders found.")}</td></tr>
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
                        <span style={{padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:700,background:cfg.bg,color:cfg.color}}>{tl(o.status)}</span>
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
              <span style={{ fontSize:13, color:G.muted }}>{tl("Rows per page:")}</span>
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
function RestaurantsPage({
 setPage, setActiveMenu }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
  const [menus, setMenus] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(()=>{api.getMenus().then(m=>{setMenus(m.filter(x=>x.available&&(x.recipes||[]).length>0));setLoading(false);}).catch(()=>setLoading(false));},[]);
  return (
    <Page title={tl("Restaurants")}>
      {loading?<Spinner/>:menus.length===0?(
        <div style={{ textAlign:"center", padding:80, color:G.muted }}><p style={{ fontFamily:G.font, fontSize:24, marginBottom:8 }}>{tl("No restaurants open right now")}</p><p>{tl("Check back soon!")}</p></div>
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
function OrderPage({
 menu, user, setPage, toast }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
  const [qty, setQty] = useState({}); const [delivery, setDelivery] = useState(null);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddr, setSelectedAddr] = useState(0); // index into savedAddresses, or -1 = "other"
  const [otherStreet, setOtherStreet] = useState("");
  const [otherCity, setOtherCity]     = useState("");
  const [otherZip, setOtherZip]       = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [lightbox, setLightbox]       = useState(null);

  useEffect(()=>{
    api.getSavedAddresses().then(addrs=>{
      setSavedAddresses(addrs||[]);
      setSelectedAddr(addrs?.length>0 ? 0 : -1);
    }).catch(()=>{
      // Fall back to user profile address
      const profileAddr = [user?.street_address, user?.city, user?.zip].filter(Boolean).join(", ");
      if (profileAddr) { setSavedAddresses([{label:"Default", display:profileAddr}]); setSelectedAddr(0); }
      else setSelectedAddr(-1);
    });
  },[]);

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

  // When user edits "other" fields, auto-select the "other" radio
  const onOtherFieldChange = (setter) => (val) => { setter(val); setSelectedAddr(-1); };

  const resolvedAddress = () => {
    if (selectedAddr>=0 && savedAddresses[selectedAddr]) return savedAddresses[selectedAddr].display;
    return [otherStreet, otherCity, otherZip].filter(Boolean).join(", ");
  };

  const submit=async()=>{
    if(!delivery){toast("Please select pickup or delivery","error");return;}
    if(delivery==="delivery" && !resolvedAddress()){toast("Please enter a delivery address","error");return;}
    setSubmitting(true);
    try{
      const order=await api.placeOrder({mid:menu.mid,pickup:delivery==="pickup",items:cartItems,delivery_address:delivery==="delivery"?resolvedAddress():null});
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
          <h3 style={{ fontFamily:G.font, fontSize:18, marginBottom:16 }}>{tl("Your order")}</h3>
          {cartItems.length===0?(
            <p style={{ color:G.muted, fontSize:13, marginBottom:16 }}>{tl("Add items from the menu.")}</p>
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
            ):[{val:"pickup",label:"Pickup (free)"},{val:"delivery",label:`${tl("Delivery")} (+${menu.delivery_fee} AMD)`}].map(opt=>(
              <label key={opt.val} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, cursor:"pointer", fontSize:13 }}>
                <input type="radio" name="delivery" value={opt.val} checked={delivery===opt.val} onChange={()=>setDelivery(opt.val)} style={{accentColor:G.caramel}} />
                {opt.label}
              </label>
            ))}
          </div>

          {delivery==="delivery"&&!hasUndeliverable&&(
            <div style={{ marginBottom:14, display:"flex", flexDirection:"column", gap:8 }}>
              {savedAddresses.map((addr,i)=>(
                <label key={i} style={{ display:"flex", alignItems:"flex-start", gap:8, cursor:"pointer", padding:"10px 12px", borderRadius:8, border:`1px solid ${selectedAddr===i?G.caramel:G.border}`, background:selectedAddr===i?"#fef9f4":G.white }}>
                  <input type="radio" name="addr" checked={selectedAddr===i} onChange={()=>setSelectedAddr(i)} style={{accentColor:G.caramel,marginTop:2,flexShrink:0}} />
                  <div>
                    {addr.label&&<p style={{fontSize:12,fontWeight:700,color:G.muted,marginBottom:2}}>{addr.label}</p>}
                    <p style={{fontSize:13,color:G.dark,lineHeight:1.5}}>{addr.display}</p>
                  </div>
                </label>
              ))}
              {/* Other address option */}
              <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
                <input type="radio" name="addr" checked={selectedAddr===-1} onChange={()=>setSelectedAddr(-1)} style={{accentColor:G.caramel,flexShrink:0}} />
                <span style={{fontSize:13,fontWeight:500}}>Other address</span>
              </label>
              {selectedAddr===-1&&(
                <div style={{ paddingLeft:20, display:"flex", flexDirection:"column", gap:8 }}>
                  <Input label="Street" value={otherStreet} onChange={onOtherFieldChange(setOtherStreet)} />
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    <Input label="City" value={otherCity} onChange={onOtherFieldChange(setOtherCity)} />
                    <Input label="ZIP"  value={otherZip}  onChange={onOtherFieldChange(setOtherZip)} />
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ borderTop:`1px solid ${G.border}`, paddingTop:12, marginBottom:14 }}>
            {deliveryFee>0&&<div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:G.muted, marginBottom:6 }}><span>{tl("Delivery fee")}</span><span>{deliveryFee} AMD</span></div>}
            <div style={{ display:"flex", justifyContent:"space-between", fontWeight:700, fontSize:16 }}><span>{tl("Total")}</span><span style={{color:G.caramel}}>{total} AMD</span></div>
          </div>

          <Btn onClick={submit} loading={submitting} disabled={itemTotal===0} title={itemTotal===0?"Please add items to your order":undefined} style={{width:"100%"}}>Place order</Btn>
        </div>
      </div>
      <Lightbox src={lightbox?.src} description={lightbox?.description} onClose={()=>setLightbox(null)} />
    </Page>
  );
}

// ─── ORDERS (CUSTOMER) ────────────────────────────────────────────────────────
function OrdersCustPage({
 toast }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
  const [orders, setOrders] = useState([]); const [loading, setLoading] = useState(true); const [dialog, setDialog] = useState(null); const [pending, setPending] = useState(null);
  const load=useCallback(async()=>{setLoading(true);try{setOrders(await api.getOrders());}catch(e){toast(e.message,"error");}finally{setLoading(false);}},[]); useEffect(()=>{load();},[]);
  const cancel=async()=>{try{const u=await api.cancelOrder(pending);setOrders(p=>p.map(o=>o.oid===pending?u:o));toast(`Order #${pending} cancelled`);setDialog(null);}catch(e){toast(e.message,"error");}};
  const confirmDel=async oid=>{try{const u=await api.confirmDelivery(oid);setOrders(p=>p.map(o=>o.oid===oid?u:o));toast("Order confirmed as delivered!");}catch(e){toast(e.message,"error");}};
  return (
    <Page title={tl("My Orders")}>
      {loading?<Spinner/>:orders.length===0?(
        <div style={{ textAlign:"center", padding:80, color:G.muted }}><p style={{ fontFamily:G.font, fontSize:22 }}>{tl("No orders yet")}</p></div>
      ):(
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {orders.map(o=>{
            const cfg=STATUS_CONFIG[o.status]||STATUS_CONFIG.New;
            const total=(o.items||[]).reduce((s,it)=>s+it.qty*it.price,0);
            return (
              <div key={o.oid} style={{ background:G.white, borderRadius:14, border:`1px solid ${G.border}`, padding:20 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                  <div><span style={{ fontWeight:700, fontSize:15 }}>Order #{o.oid}</span><span style={{ marginLeft:10, fontSize:12, color:G.muted }}>{new Date(o.created_at).toLocaleString()}</span></div>
                  <span style={{ padding:"4px 12px", borderRadius:20, fontSize:12, fontWeight:700, background:cfg.bg, color:cfg.color }}>{tl(o.status)}</span>
                </div>
                <div style={{ marginBottom:12 }}>
                  {(o.items||[]).map((it,i)=>(
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:G.muted, marginBottom:2 }}>
                      <span>{it.name} x {it.qty}</span><span>{it.qty*it.price} AMD</span>
                    </div>
                  ))}
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontWeight:700, color:G.caramel }}>{total} AMD · {o.pickup?tl("Pickup (free)"):tl("Delivery")}</span>
                  <div style={{ display:"flex", gap:8 }}>
                    {!["Declined","Delivered"].includes(o.status)&&<Btn variant="ghost" size="sm" onClick={()=>{setPending(o.oid);setDialog("cancel");}}>{tl("Cancel")}</Btn>}
                    {["Done","Dispatched"].includes(o.status)&&<Btn variant="success" size="sm" onClick={()=>confirmDel(o.oid)}>{tl("I got my order ✓")}</Btn>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Dialog open={dialog==="cancel"} title="Cancel order?" onConfirm={cancel} onCancel={()=>setDialog(null)}>{tl("Are you sure you want to cancel order")} #{pending}?</Dialog>
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

function SchedulePage({
 toast, storeSchedule, setStoreSchedule }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
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
    <Page title="Schedule" actions={<Btn onClick={save} loading={saving}>{tl("Save schedule")}</Btn>}>
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
              <span style={{ fontSize:13, color:G.dark, fontWeight:600 }}>{tl("before closing")}</span>
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
                    <span style={{ fontWeight:700, fontSize:14, color:isOff?G.muted:G.dark }}>{tl(DAY_LABELS[di])}</span>
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
                      <button onClick={()=>removePeriod(day,i)} style={{ background:"none", border:"none", color:G.red, cursor:"pointer", fontSize:13, fontFamily:G.mono, padding:"0 4px" }}>{tl("Remove")}</button>
                    </div>
                  ))}
                  {!isOff&&(
                    <button onClick={()=>addPeriod(day)} style={{ background:"none", border:`1px dashed ${G.border}`, color:G.caramel, cursor:"pointer", fontSize:12, fontFamily:G.mono, padding:"5px 12px", borderRadius:8, alignSelf:"flex-start", fontWeight:600 }}>
                      {tl("Add period")}
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

// ─── PROCUREMENT PAGE ─────────────────────────────────────────────────────────
function ProcurementPage({
 toast }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
  const [data, setData] = useState({ products:[], links:[] });
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editPid, setEditPid] = useState(null);
  const [editExpiry, setEditExpiry] = useState("");
  const [linkPid, setLinkPid] = useState(null); // product being linked to a supplier
  const [linkSid, setLinkSid] = useState("");
  const [linkPrice, setLinkPrice] = useState("");
  const [linkCurrency, setLinkCurrency] = useState("AMD");

  const load = useCallback(async()=>{
    setLoading(true);
    try {
      const [d, s] = await Promise.all([api.getProcurement(), api.getSuppliers()]);
      setData(d); setSuppliers(s);
    } catch(e){ toast(e.message,"error"); }
    finally{ setLoading(false); }
  },[]);
  useEffect(()=>{ load(); },[]);

  const saveExpiry = async (pid) => {
    try {
      await api.patchProductExpiry(pid, { expiry_hours: editExpiry ? Number(editExpiry) : null });
      setData(d=>({...d, products:d.products.map(p=>p.pid===pid?{...p,expiry_hours:editExpiry?Number(editExpiry):null}:p)}));
      setEditPid(null); toast("Expiry saved");
    } catch(e){ toast(e.message,"error"); }
  };

  const linkSupplier = async () => {
    if (!linkSid) { toast("Select a supplier","error"); return; }
    try {
      await api.linkSupplierProduct(linkSid, { pid:linkPid, price:linkPrice?Number(linkPrice):null, currency:linkCurrency });
      await load(); setLinkPid(null); setLinkSid(""); setLinkPrice(""); toast("Supplier linked");
    } catch(e){ toast(e.message,"error"); }
  };

  const unlinkSupplier = async (sid, psid) => {
    try { await api.unlinkSupplierProduct(sid, psid); await load(); toast("Supplier unlinked"); }
    catch(e){ toast(e.message,"error"); }
  };

  if (loading) return <Page title="Procurement"><Spinner/></Page>;

  return (
    <Page title="Procurement">
      <div style={{ background:G.white, borderRadius:14, border:`1px solid ${G.border}`, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:G.sand, borderBottom:`1px solid ${G.border}` }}>
              {["Product","Category","Units","Expiry (hours)","Suppliers"].map(h=>(
                <th key={h} style={{ padding:"11px 16px", textAlign:"left", fontSize:12, fontWeight:700, letterSpacing:"0.05em", textTransform:"uppercase", color:G.muted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.products.map((p,i)=>{
              const prodLinks = data.links.filter(l=>l.pid===p.pid);
              return (
                <tr key={p.pid} style={{ borderBottom:i<data.products.length-1?`1px solid ${G.border}`:"none", verticalAlign:"top" }}>
                  <td style={{ padding:"12px 16px", fontSize:14, fontWeight:600 }}>{p.name}</td>
                  <td style={{ padding:"12px 16px", fontSize:13 }}>{p.category?<Badge>{p.category}</Badge>:<span style={{color:G.muted}}>—</span>}</td>
                  <td style={{ padding:"12px 16px", fontSize:13, color:G.muted }}>{p.units||"—"}</td>
                  <td style={{ padding:"12px 16px" }}>
                    {editPid===p.pid ? (
                      <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                        <input type="number" value={editExpiry} onChange={e=>setEditExpiry(e.target.value)} placeholder="hours"
                          style={{ width:70, padding:"5px 8px", borderRadius:6, border:`1px solid ${G.border}`, fontSize:13, fontFamily:G.mono, outline:"none" }} />
                        <Btn size="sm" onClick={()=>saveExpiry(p.pid)}>{tl("Save")}</Btn>
                        <Btn size="sm" variant="ghost" onClick={()=>setEditPid(null)}>×</Btn>
                      </div>
                    ):(
                      <button onClick={()=>{setEditPid(p.pid);setEditExpiry(p.expiry_hours||"");}}
                        style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, color:p.expiry_hours?G.dark:G.caramel, fontFamily:G.mono }}>
                        {p.expiry_hours ? `${p.expiry_hours}h` : "+ Set expiry"}
                      </button>
                    )}
                  </td>
                  <td style={{ padding:"12px 16px" }}>
                    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                      {prodLinks.map(l=>(
                        <div key={l.psid} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13 }}>
                          <span style={{ flex:1 }}>{l.supplier_name}</span>
                          {l.price&&<span style={{ color:G.caramel, fontWeight:600 }}>{l.price} {l.currency}</span>}
                          <button onClick={()=>unlinkSupplier(l.sid, l.psid)} style={{ background:"none", border:"none", color:G.muted, cursor:"pointer", fontSize:12, fontFamily:G.mono }}>×</button>
                        </div>
                      ))}
                      {linkPid===p.pid ? (
                        <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap", marginTop:4 }}>
                          <select value={linkSid} onChange={e=>setLinkSid(e.target.value)}
                            style={{ padding:"5px 8px", borderRadius:6, border:`1px solid ${G.border}`, fontSize:13, fontFamily:G.mono, outline:"none" }}>
                            <option value="">Supplier…</option>
                            {suppliers.map(s=><option key={s.sid} value={s.sid}>{s.name}</option>)}
                          </select>
                          <input type="number" value={linkPrice} onChange={e=>setLinkPrice(e.target.value)} placeholder="Price"
                            style={{ width:70, padding:"5px 8px", borderRadius:6, border:`1px solid ${G.border}`, fontSize:13, fontFamily:G.mono, outline:"none" }} />
                          <select value={linkCurrency} onChange={e=>setLinkCurrency(e.target.value)}
                            style={{ padding:"5px 8px", borderRadius:6, border:`1px solid ${G.border}`, fontSize:13, fontFamily:G.mono, outline:"none" }}>
                            {["AMD","USD","EUR","RUR"].map(c=><option key={c} value={c}>{c}</option>)}
                          </select>
                          <Btn size="sm" onClick={linkSupplier}>Link</Btn>
                          <Btn size="sm" variant="ghost" onClick={()=>setLinkPid(null)}>×</Btn>
                        </div>
                      ):(
                        <button onClick={()=>{setLinkPid(p.pid);setLinkSid("");setLinkPrice("");}}
                          style={{ background:"none", border:"none", cursor:"pointer", fontSize:12, color:G.caramel, fontFamily:G.mono, fontWeight:600, textAlign:"left" }}>
                          + Add supplier
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {data.products.length===0&&(
              <tr><td colSpan={5} style={{ padding:40, textAlign:"center", color:G.muted }}>No products yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Page>
  );
}

// ─── SUPPLIERS PAGE ───────────────────────────────────────────────────────────
const CUTOFF_HOURS = Array.from({length:23},(_,i)=>`${String(i+1).padStart(2,"0")}:00`);
const DELIVERY_DAYS = Array.from({length:31},(_,i)=>i);

function SupplierForm({
 initial, onSave, onCancel, saving }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
  const BLANK_SUP = { name:"", contact_fname:"", contact_lname:"", contact_title:"",
                      email:"", phone:"", street_address:"", city:"", zip:"", schedule:null };
  const [form, setForm] = useState({...BLANK_SUP,...(initial||{})});
  const [slide, setSlide] = useState("general");
  const [terms, setTerms] = useState(initial?.schedule?.delivery||[]);
  const [timezone, setTimezone] = useState(initial?.schedule?.timezone||"UTC");
  const [newTerm, setNewTerm] = useState({name:"",cutoff:"12:00",days_before:0});
  const [showNewTerm, setShowNewTerm] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const addTerm = () => {
    if (!newTerm.name.trim()) return;
    const days_after = newTerm.days_before + 1;
    setTerms(p=>[...p,{...newTerm, days_before:Number(newTerm.days_before), days_after}]);
    setNewTerm({name:"",cutoff:"12:00",days_before:0}); setShowNewTerm(false);
  };
  const removeTerm = i => setTerms(p=>p.filter((_,j)=>j!==i));

  const sortedTerms = [...terms].sort((a,b)=>a.days_before-b.days_before);

  const buildPayload = () => ({
    ...form,
    schedule: { timezone, delivery: terms }
  });

  if (slide==="schedule") return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <h4 style={{ fontFamily:G.font, fontSize:15 }}>Schedule</h4>
        <button onClick={()=>setSlide("general")} style={{ background:"none", border:"none", color:G.caramel, cursor:"pointer", fontFamily:G.mono, fontSize:13, fontWeight:600 }}>{tl("← General")}</button>
      </div>
      <Select label="Timezone" value={timezone} onChange={setTimezone} options={TIMEZONES} />

      {/* Delivery terms table */}
      <div>
        <p style={{ fontSize:13, fontWeight:600, marginBottom:8, color:G.dark }}>Delivery terms</p>
        <div style={{ background:G.white, borderRadius:10, border:`1px solid ${G.border}`, overflow:"hidden", marginBottom:10 }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:G.sand }}>
                <th style={{ padding:"9px 12px", textAlign:"left", fontSize:11, fontWeight:700, textTransform:"uppercase", color:G.muted, letterSpacing:"0.05em" }}>Term</th>
                <th style={{ padding:"9px 12px", textAlign:"left", fontSize:11, fontWeight:700, textTransform:"uppercase", color:G.muted }}>Cut-off</th>
                <th style={{ padding:"9px 12px", textAlign:"center", fontSize:11, fontWeight:700, textTransform:"uppercase", color:G.muted }}>Before (days)</th>
                <th style={{ padding:"9px 12px", textAlign:"center", fontSize:11, fontWeight:700, textTransform:"uppercase", color:G.muted }}>After (days)</th>
                <th style={{ width:32 }}></th>
              </tr>
            </thead>
            <tbody>
              {sortedTerms.map((t,i)=>(
                <tr key={i} style={{ borderTop:`1px solid ${G.border}` }}>
                  <td style={{ padding:"9px 12px", fontSize:14 }}>{t.name}</td>
                  <td style={{ padding:"9px 12px", fontSize:14, color:G.muted }}>{t.cutoff}</td>
                  <td style={{ padding:"9px 12px", fontSize:14, textAlign:"center" }}>{t.days_before}</td>
                  <td style={{ padding:"9px 12px", fontSize:14, textAlign:"center", color:G.muted }}>{t.days_after ?? t.days_before+1}</td>
                  <td style={{ padding:"9px 12px" }}>
                    <button onClick={()=>removeTerm(terms.indexOf(t))} style={{ background:"none", border:"none", color:G.red, cursor:"pointer", fontSize:14 }}>×</button>
                  </td>
                </tr>
              ))}
              {sortedTerms.length===0&&<tr><td colSpan={5} style={{ padding:20, textAlign:"center", color:G.muted, fontSize:13 }}>{tl("No terms yet.")}</td></tr>}
            </tbody>
          </table>
        </div>

        {showNewTerm ? (
          <div style={{ display:"flex", gap:8, alignItems:"flex-end", flexWrap:"wrap", padding:"12px", background:G.sand, borderRadius:8 }}>
            <Input label="Term name" value={newTerm.name} onChange={v=>setNewTerm(p=>({...p,name:v}))} style={{width:140}} />
            <div>
              <label style={{ fontSize:13, fontWeight:600, color:G.dark, display:"block", marginBottom:5 }}>Cut-off</label>
              <select value={newTerm.cutoff} onChange={e=>setNewTerm(p=>({...p,cutoff:e.target.value}))}
                style={{ padding:"9px 10px", borderRadius:8, border:`1px solid ${G.border}`, fontSize:13, fontFamily:G.mono, outline:"none" }}>
                {CUTOFF_HOURS.map(h=><option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:600, color:G.dark, display:"block", marginBottom:5 }}>Before (days)</label>
              <select value={newTerm.days_before} onChange={e=>setNewTerm(p=>({...p,days_before:Number(e.target.value)}))}
                style={{ padding:"9px 10px", borderRadius:8, border:`1px solid ${G.border}`, fontSize:13, fontFamily:G.mono, outline:"none" }}>
                {DELIVERY_DAYS.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <Btn size="sm" onClick={addTerm}>Add</Btn>
            <Btn size="sm" variant="ghost" onClick={()=>setShowNewTerm(false)}>{tl("Cancel")}</Btn>
          </div>
        ) : (
          <button onClick={()=>setShowNewTerm(true)} style={{ background:"none", border:`1px dashed ${G.border}`, color:G.caramel, cursor:"pointer", fontSize:13, fontFamily:G.mono, padding:"7px 14px", borderRadius:8, fontWeight:600 }}>
            + New term
          </button>
        )}
      </div>

      <div style={{ display:"flex", gap:10, marginTop:4 }}>
        <Btn size="sm" onClick={()=>onSave(buildPayload())} loading={saving}>{tl("Save")}</Btn>
        <Btn variant="ghost" size="sm" onClick={onCancel}>{tl("Cancel")}</Btn>
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <Input label="Name" value={form.name} onChange={v=>set("name",v)} required />
        <Input label={tl("Contact title")} value={form.contact_title||""} onChange={v=>set("contact_title",v)} placeholder="e.g. Sales Manager" />
        <Input label={tl("Contact first name")} value={form.contact_fname||""} onChange={v=>set("contact_fname",v)} />
        <Input label={tl("Contact last name")} value={form.contact_lname||""} onChange={v=>set("contact_lname",v)} />
        <Input label="Email" type="email" value={form.email||""} onChange={v=>set("email",v)} required />
        <Input label="Phone" value={form.phone||""} onChange={v=>set("phone",v)} required />
        <Input label="Street address" value={form.street_address||""} onChange={v=>set("street_address",v)} required />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <Input label="City" value={form.city||""} onChange={v=>set("city",v)} />
          <Input label="ZIP" value={form.zip||""} onChange={v=>set("zip",v)} />
        </div>
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <Btn size="sm" onClick={()=>onSave(buildPayload())} loading={saving}>{tl("Save")}</Btn>
        <Btn variant="ghost" size="sm" onClick={onCancel}>{tl("Cancel")}</Btn>
        <Btn variant="secondary" size="sm" onClick={()=>setSlide("schedule")} style={{ marginLeft:"auto" }}>{tl("Schedule →")}</Btn>
      </div>
    </div>
  );
}

function SuppliersPage({
 toast }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [selected, setSelected] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const load = useCallback(async()=>{ setLoading(true); try{ setSuppliers(await api.getSuppliers()); } catch(e){ toast(e.message,"error"); } finally{ setLoading(false); } },[]);
  useEffect(()=>{ load(); },[]);

  const sorted = [...suppliers].sort((a,b)=>{ const v=String(a[sortKey]||"")<String(b[sortKey]||"")?-1:1; return sortDir==="asc"?v:-v; });
  const toggleSort = k => { if(sortKey===k) setSortDir(d=>d==="asc"?"desc":"asc"); else{setSortKey(k);setSortDir("asc");} };
  const toggleSel = id => setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);

  const doSave = async (data) => {
    setSaving(true);
    try {
      if (editSupplier) {
        const u = await api.updateSupplier(editSupplier.sid, data);
        setSuppliers(p=>p.map(s=>s.sid===editSupplier.sid?u:s));
        toast(`"${u.name}" saved`); setEditSupplier(null);
      } else {
        const s = await api.createSupplier(data);
        setSuppliers(p=>[...p,s]); toast(`"${s.name}" saved`); setShowNew(false);
      }
    } catch(e){ toast(e.message,"error"); } finally{ setSaving(false); }
  };

  const doDelete = async () => {
    try {
      for (const sid of selected) await api.deleteSupplier(sid);
      setSuppliers(p=>p.filter(s=>!selected.includes(s.sid)));
      toast("Deleted"); setSelected([]); setDialog(null);
    } catch(e){ toast(e.message,"error"); }
  };

  const cols = [
    { key:"sid",   label:"ID",    sortable:true,  render:r=><span style={{color:G.muted,fontSize:13}}>#{r._id}</span> },
    { key:"name",  label:"Name",  sortable:true,  render:r=>(
      <button className="recipe-link" onClick={()=>setEditSupplier(r)} style={{ background:"none", border:"none", cursor:"pointer", fontFamily:G.mono, fontSize:14, color:G.dark, padding:0, textAlign:"left" }}>{r.name}</button>
    )},
    { key:"email", label:"Email", sortable:true,  render:r=>r.email||<span style={{color:G.muted}}>—</span> },
    { key:"phone", label:"Phone", sortable:false, render:r=>r.phone||<span style={{color:G.muted}}>—</span> },
  ];

  return (
    <Page title={tl("Suppliers")} actions={
      <>{selected.length>0&&<Btn variant="danger" size="sm" onClick={()=>setDialog("del")}>Delete ({selected.length})</Btn>}
      <Btn size="sm" onClick={()=>setShowNew(s=>!s)}>{tl("+ New supplier")}</Btn></>
    }>
      {showNew&&(
        <div style={{ background:G.white, border:`1px solid ${G.border}`, borderRadius:14, padding:24, marginBottom:20, animation:"fadeIn 0.2s ease" }}>
          <h3 style={{ fontFamily:G.font, fontSize:17, marginBottom:16 }}>New Supplier</h3>
          <SupplierForm onSave={doSave} onCancel={()=>setShowNew(false)} saving={saving} />
        </div>
      )}
      {loading?<Spinner/>:<DataTable columns={cols} rows={sorted.map(s=>({...s,_id:s.sid}))} selected={selected} onSelect={toggleSel} onSelectAll={setSelected} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />}

      {editSupplier&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(44,24,16,0.45)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:G.white, borderRadius:16, padding:32, maxWidth:640, width:"100%", maxHeight:"90vh", overflowY:"auto", animation:"fadeIn 0.2s ease", boxShadow:"0 20px 60px rgba(44,24,16,0.2)" }}>
            <h3 style={{ fontFamily:G.font, fontSize:20, marginBottom:20 }}>Edit Supplier</h3>
            <SupplierForm initial={editSupplier} onSave={doSave} onCancel={()=>setEditSupplier(null)} saving={saving} />
          </div>
        </div>
      )}
      <Dialog open={dialog==="del"} title="Delete suppliers?" onConfirm={doDelete} onCancel={()=>setDialog(null)}>
        Are you sure you wish to delete the selected supplier{selected.length>1?"s":""}? This action may not be undone.
      </Dialog>
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
  const [lang, setLang] = useLang();
  // Keep module-level _currentLang in sync
  _currentLang = lang;
  const {toasts,toast,remove} = useToast();
  const logout=()=>{localStorage.removeItem("token");setUser(null);setPage("login");};
  const onLogin=u=>{setUser(u);setPage(u.is_manufacturer?"orders-manuf":"restaurants");};
  return (
    <LangContext.Provider value={lang}>
      <style>{css}</style>
      <Toast toasts={toasts} remove={remove} />
      {!user?(
        <>
          {page==="login"  &&<LoginPage  onLogin={onLogin} setPage={setPage} setLang={setLang}/>}
          {page==="signup" &&<SignupPage setPage={setPage} toast={toast} setLang={setLang}/>}
          {page==="forgot" &&<ForgotPage setPage={setPage} toast={toast}/>}
          {!["login","signup","forgot"].includes(page)&&<LoginPage onLogin={onLogin} setPage={setPage} setLang={setLang}/>}
        </>
      ):(
        <>
          <Nav user={user} page={page} setPage={setPage} logout={logout} lang={lang} setLang={setLang}/>
          {page==="products"     &&<ProductsPage toast={toast}/>}
          {page==="items"        &&<RecipesPage  toast={toast}/>}
          {page==="recipes"      &&<RecipesPage  toast={toast}/>}
          {page==="menus"        &&<MenusPage    toast={toast} storeSchedule={storeSchedule} setStoreSchedule={setStoreSchedule}/>}
          {page==="procurement"  &&<ProcurementPage toast={toast}/>}
          {page==="suppliers"    &&<SuppliersPage toast={toast}/>}
          {page==="orders-manuf" &&<OrdersManufPage toast={toast}/>}
          {page==="restaurants"  &&<RestaurantsPage setPage={setPage} setActiveMenu={setActiveMenu}/>}
          {page==="order"        &&<OrderPage menu={activeMenu} user={user} setPage={setPage} toast={toast}/>}
          {page==="orders-cust"  &&<OrdersCustPage toast={toast}/>}
          {page==="schedule"     &&<SchedulePage toast={toast} storeSchedule={storeSchedule} setStoreSchedule={setStoreSchedule}/>}
        </>
      )}
    </LangContext.Provider>
  );
}
