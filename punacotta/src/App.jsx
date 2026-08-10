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
  "Accept":"Принять","Start":"Начать","Mark as Done":"Выполнено",
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
  "🕐 Schedule":"🕐 График","↩ Log out":"↩ Выход",
  "No orders yet":"Заказов пока нет","I got my order ✓":"Получил(а) заказ ✓",
  "Cancel order?":"Отменить заказ?",
  "Are you sure you want to cancel order":"Вы уверены, что хотите отменить заказ",
  "No restaurants open right now":"Сейчас нет открытых ресторанов",
  "Check back soon!":"Загляните позже!",
  "Reports":"Отчёты","Week":"Неделя","Month":"Месяц","Year":"Год",
  "Revenue":"Выручка","ABC Analysis":"ABC-анализ","Association Rules":"Правила ассоциации",
  "No data yet.":"Данных пока нет.",
  "New Item":"Новое блюдо","Edit Item":"Редактировать блюдо",
  "Delete items?":"Удалить блюда?",
  "Are you sure you wish to delete":"Вы уверены, что хотите удалить",
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

// Unit submultiple config — read-only, not editable by Restaurant
const UNIT_META = {
  kilograms: { abbr:"kg", sub:"grams",       sub_abbr:"g",  conv:1000 },
  litres:    { abbr:"l",  sub:"millilitres",  sub_abbr:"ml", conv:1000 },
  pounds:    { abbr:"lb", sub:"ounces",       sub_abbr:"oz", conv:16   },
};
// Returns abbreviated unit string for a unit name
function unitAbbr(name) { return UNIT_META[name]?.abbr || name || ""; }
function subAbbr(name)  { return UNIT_META[name]?.sub_abbr || ""; }
function conv(name)     { return UNIT_META[name]?.conv || 1; }
function hasSub(name)   { return !!UNIT_META[name]; }

const STATUS_CONFIG = {
  New:        { color:"#22c55e", bg:"#f0fdf4", next:"Accept",               canDecline:true },
  Accepted:   { color:"#eab308", bg:"#fefce8", next:"Start",           canDecline:true },
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
  @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
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

function Input({ label, type="text", value, onChange, placeholder, required, hint, error, style:s, disabled, onBlur }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      {label&&<label style={{ fontSize:13, fontWeight:600, color:G.dark }}>{label}{required&&<span style={{color:G.caramel}}> *</span>}</label>}
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
        style={{ padding:"10px 14px", borderRadius:8, border:`1px solid ${error?G.red:G.border}`, background:disabled?G.sand:G.white, fontSize:14, color:G.dark, outline:"none", width:"100%", ...s }}
        onFocus={e=>e.target.style.borderColor=G.caramel}
        onBlur={e=>{ e.target.style.borderColor=error?G.red:G.border; onBlur&&onBlur(e); }}
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
    reader.onload = e => { setSrc(e.target.result); setCrop(undefined); setCompletedCrop(null); };
    reader.readAsDataURL(file);
  };

  const onDrop = e => { e.preventDefault(); setDragging(false); loadFile(e.dataTransfer.files[0]); };

  // When image loads, auto-apply a centered square marquee
  const onImgLoad = (e) => {
    const img = e.currentTarget;
    const { width, height } = img;
    const size = Math.min(width, height);        // square side = lesser dimension
    const x = (width  - size) / 2;              // centre horizontally
    const y = (height - size) / 2;              // centre vertically
    const initialCrop = { unit:"px", x, y, width:size, height:size };
    setCrop(initialCrop);
    setCompletedCrop(initialCrop);
  };

  const buildBlob = useCallback(() => {
    if (!imgRef.current || !completedCrop || completedCrop.width === 0) return;
    const img = imgRef.current;
    const sx = img.naturalWidth  / img.width;
    const sy = img.naturalHeight / img.height;
    const canvas = document.createElement("canvas");
    canvas.width  = completedCrop.width  * sx;
    canvas.height = completedCrop.height * sy;
    canvas.getContext("2d").drawImage(
      img,
      completedCrop.x * sx, completedCrop.y * sy,
      canvas.width, canvas.height,
      0, 0, canvas.width, canvas.height
    );
    canvas.toBlob(blob => onImageReady(blob), "image/jpeg", 0.92);
  }, [completedCrop]);

  useEffect(() => { buildBlob(); }, [completedCrop]);

  if (src) return (
    <div>
      <p style={{ fontSize:13, color:G.muted, marginBottom:8 }}>Square crop auto-applied — drag to adjust:</p>
      <ReactCrop crop={crop} onChange={c=>setCrop(c)} onComplete={c=>setCompletedCrop(c)} aspect={1}>
        <img ref={imgRef} src={src} style={{ maxWidth:"100%", maxHeight:280 }} alt="crop" onLoad={onImgLoad} />
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
    available:true, deliverable:true, image_url:null, image_thumb_url:null, cloudinary_id:null,
    allow_submultiples:false, moq:"",
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
    setContents(p=>p.map((c,j)=>j===i?{...c,qty:Math.max(0,Math.min(1000, Math.round(((parseFloat(c.qty)||0)+delta)*1000)/1000))}:c));
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
  const selectedUnit = lookups.units?.find(u=>String(u.unid)===String(form.unid));
  const unitName = selectedUnit?.name || "";
  const unitAbbrStr = unitAbbr(unitName);
  const priceLabel = form.allow_submultiples && unitAbbrStr
    ? `${tl("Price per unit")} (${unitAbbrStr})`
    : tl("Price");

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <Input label={tl("Name")} value={form.name} onChange={v=>set("name",v)} required />
        <Input label={tl("Description")} value={form.description||""} onChange={v=>set("description",v)} />
        <Select label={tl("Units")} value={String(form.unid||"")} onChange={v=>set("unid",v)} options={lookups.units.map(u=>({value:String(u.unid),label:u.name}))} placeholder="Select units" />
        <Select label={tl("Category")} value={String(form.caid||"")} onChange={v=>set("caid",v)} options={lookups.categories.map(c=>({value:String(c.caid),label:c.name}))} placeholder="Select category" />
        <Input label={priceLabel} type="number" value={String(form.price||"")} onChange={v=>set("price",v)} placeholder="0" />
        <Select label={tl("Currency")} value={form.currency||"AMD"} onChange={v=>set("currency",v)} options={CURRENCIES} />
      </div>

      {/* Submultiples */}
      {hasSub(unitName) && (
        <div style={{ background:G.sand, borderRadius:10, padding:14, display:"flex", flexDirection:"column", gap:10 }}>
          <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:14, cursor:"pointer", fontWeight:600 }}>
            <input type="checkbox" checked={!!form.allow_submultiples} onChange={e=>set("allow_submultiples",e.target.checked)} style={{accentColor:G.caramel}} />
            Allow submultiples ({UNIT_META[unitName].sub_abbr})
          </label>
          {form.allow_submultiples && (
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <Input label={`MOQ (${UNIT_META[unitName].sub_abbr})`} type="number" value={String(form.moq||"")}
                onChange={v=>set("moq",v)} placeholder={`e.g. 250`} />
              <div style={{ fontSize:12, color:G.muted, paddingTop:20, lineHeight:1.5 }}>
                Customer will add in {UNIT_META[unitName].sub_abbr} increments.<br/>
                1 {unitName} = {UNIT_META[unitName].conv} {UNIT_META[unitName].sub}.
              </div>
            </div>
          )}
        </div>
      )}

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
    ? [{key:"orders-manuf",label:tl("Orders")},{key:"products",label:tl("Products")},{key:"items",label:tl("Items")},{key:"menus",label:tl("Menus")},{key:"procurement",label:tl("Procurement")},{key:"suppliers",label:tl("Suppliers")},{key:"reports",label:tl("Reports")},{key:"staff",label:"Staff"},{key:"processes",label:"Processes"}]
    : user?.employer_uid ? [{key:"restaurants",label:tl("Restaurants")},{key:"orders-cust",label:tl("My Orders")},{key:"roster-emp",label:"My Roster"}]
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
                <button onClick={()=>navigate("embed")} style={{ width:"100%", textAlign:"left", padding:"11px 16px", background:"none", border:"none", cursor:"pointer", fontFamily:G.mono, fontSize:14, color:G.dark, display:"block" }}
                  onMouseEnter={e=>e.currentTarget.style.background=G.sand} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                  🔗 Embedded Menu
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
  const submit = async() => {
    setErr(""); setLoading(true);
    try {
      const {token,user} = await api.login(email,pw);
      localStorage.setItem("token",token); onLogin(user);
    } catch(e) {
      if (e.message === 'unverified_recent') {
        setErr("Please verify your email. A message has been sent earlier for you to confirm registration.");
      } else if (e.message === 'unverified_expired') {
        setErr("Your verification link has expired. Please register again.");
      } else {
        setErr(e.message);
      }
    } finally { setLoading(false); }
  };
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
  const [registered, setRegistered] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const submit = async() => {
    const e = {};
    if (!form.first_name) e.first_name="Required"; if (!form.last_name) e.last_name="Required"; if (!form.email) e.email="Required";
    if (!form.password||form.password.trim().length<6) e.password="Min 6 characters";
    if (form.is_manufacturer&&!form.business_name) e.business_name="Required for manufacturers";
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try { await api.register(form); setRegistered(true); }
    catch(err){ if(err.message.includes("already exists")) setErrors({email:err.message}); else toast(err.message,"error"); }
    finally { setLoading(false); }
  };
  if (registered) return (
    <AuthLayout>
      <div style={{ textAlign:"center", padding:"24px 0" }}>
        <div style={{ fontSize:40, marginBottom:16 }}>📬</div>
        <h2 style={{ fontFamily:G.font, fontSize:22, marginBottom:16 }}>Check your inbox</h2>
        <p style={{ color:G.muted, lineHeight:1.7, fontSize:14, marginBottom:24 }}>
          Please, check your email to find a welcome message. If you haven't received any, please check your spam folder.
          If nonetheless the message didn't make it to your email, repeat registration making sure you entered a correct email.
        </p>
        <Btn variant="ghost" onClick={()=>setPage("login")}>Back to login</Btn>
      </div>
    </AuthLayout>
  );
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
  const [email, setEmail] = useState(""); const [loading, setLoading] = useState(false); const [sent, setSent] = useState(false);
  const submit = async() => {
    if (!email.trim()) return;
    setLoading(true);
    try { await api.forgot(email); setSent(true); }
    catch(e){ toast(e.message,"error"); }
    finally{ setLoading(false); }
  };
  if (sent) return (
    <AuthLayout>
      <div style={{ textAlign:"center", padding:"24px 0" }}>
        <div style={{ fontSize:40, marginBottom:16 }}>📬</div>
        <h2 style={{ fontFamily:G.font, fontSize:22, marginBottom:12 }}>Check your inbox</h2>
        <p style={{ color:G.muted, fontSize:14, lineHeight:1.7, marginBottom:24 }}>
          If <b>{email}</b> is registered, a password reset link has been sent. It's valid for 1 hour.<br/>
          Check your spam folder if you don't see it.
        </p>
        <Btn variant="ghost" onClick={()=>setPage("login")}>← Back to login</Btn>
      </div>
    </AuthLayout>
  );
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
  // Procurement data merged in
  const [procLinks, setProcLinks] = useState([]); // [{pid,supplier_name,price,currency,psid,sid}]
  const [suppliers, setSuppliers] = useState([]);
  const [editPid, setEditPid] = useState(null);
  const [editExpiry, setEditExpiry] = useState("");
  const [linkPid, setLinkPid] = useState(null);
  const [linkSid, setLinkSid] = useState(""); const [linkPrice, setLinkPrice] = useState(""); const [linkCurrency, setLinkCurrency] = useState("AMD");
  const [stock, setStock]       = useState({}); // pid → qty
  const [forecast, setForecast] = useState({}); // pid → {tg, series, period_start, period_end}
  const [refreshingForecast, setRefreshingForecast] = useState(false);

  const load = useCallback(async()=>{ setLoading(true); try{
    const[p,l,proc,sups,stk,fc]=await Promise.all([
      api.getProducts(),api.getProductLookups(),api.getProcurement(),api.getSuppliers(),
      api.getStock(),api.getForecast().catch(()=>({})),
    ]);
    setProducts(p); setLookups(l); setProcLinks(proc.links||[]); setSuppliers(sups);
    // Merge expiry_hours from procurement into products
    setProducts(p.map(prod=>{ const pd=proc.products?.find(x=>x.pid===prod.pid); return pd?{...prod,expiry_hours:pd.expiry_hours}:prod; }));
    const stockMap = {}; (stk||[]).forEach(s=>{ stockMap[s.pid]=(stockMap[s.pid]||0)+Number(s.qty); }); setStock(stockMap);
    setForecast(fc||{});
  } catch(e){toast(e.message,"error");} finally{setLoading(false);} },[]);
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

  const saveExpiry = async (pid) => {
    try {
      await api.patchProductExpiry(pid, { expiry_hours: editExpiry ? Number(editExpiry) : null });
      setProducts(prev=>prev.map(p=>p.pid===pid?{...p,expiry_hours:editExpiry?Number(editExpiry):null}:p));
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

  const refreshForecast = async () => {
    setRefreshingForecast(true);
    try {
      const fc = await api.runForecast();
      setForecast(fc||{});
      toast("Forecast updated");
    } catch(e){ toast(e.message,"error"); } finally{ setRefreshingForecast(false); }
  };

  // Mini SVG sparkline for forecast TG series
  const Sparkline = ({ series=[], tg=0 }) => {
    if (!series.length) return <span style={{color:G.muted,fontSize:12}}>—</span>;
    const W=80, H=28, pad=2;
    const min = Math.min(...series), max = Math.max(...series);
    const range = max - min || 1;
    const pts = series.map((v,i)=>{
      const x = pad + (i/(series.length-1||1))*(W-pad*2);
      const y = H - pad - ((v-min)/range)*(H-pad*2);
      return `${x},${y}`;
    }).join(" ");
    const color = tg >= 0 ? G.green : G.red;
    return (
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
        <span style={{fontSize:11,fontWeight:700,color}}>{tg>0?"+":""}{Math.round(tg)}</span>
        <svg width={W} height={H} style={{overflow:"visible"}}>
          <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
          <line x1={pad} y1={H/2} x2={W-pad} y2={H/2} stroke={G.border} strokeWidth="0.5" strokeDasharray="2,2"/>
        </svg>
      </div>
    );
  };

  const cols = [
    {key:"pid",      label:tl("ID"),         sortable:true,  render:r=><span style={{color:G.muted,fontSize:13}}>#{r._id}</span>},
    {key:"name",     label:tl("Name"),        sortable:true,  render:r=>(
      <button onClick={()=>openEdit(r)} style={{background:"none",border:"none",cursor:"pointer",fontFamily:G.mono,fontSize:14,color:G.dark,padding:0,textAlign:"left",textDecoration:"underline dotted",textUnderlineOffset:3}}>{r.name}</button>
    )},
    {key:"sku",      label:tl("SKU"),         sortable:true,  render:r=>r.sku||<span style={{color:G.muted}}>—</span>},
    {key:"category", label:tl("Category"),    sortable:true,  render:r=>r.category?<Badge>{r.category}</Badge>:<span style={{color:G.muted}}>—</span>},
    {key:"expiry",   label:tl("Expiry (hours)"), sortable:false, render:r=>(
      editPid===r.pid ? (
        <div style={{ display:"flex", gap:4, alignItems:"center" }}>
          <input type="number" value={editExpiry} onChange={e=>setEditExpiry(e.target.value)} placeholder="h"
            style={{ width:60, padding:"3px 6px", borderRadius:6, border:`1px solid ${G.border}`, fontSize:12, fontFamily:G.mono, outline:"none" }} />
          <Btn size="sm" onClick={()=>saveExpiry(r.pid)}>✓</Btn>
          <button onClick={()=>setEditPid(null)} style={{background:"none",border:"none",cursor:"pointer",color:G.muted,fontSize:14}}>×</button>
        </div>
      ) : (
        <button onClick={()=>{setEditPid(r.pid);setEditExpiry(r.expiry_hours||"");}}
          style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:r.expiry_hours?G.dark:G.caramel,fontFamily:G.mono}}>
          {r.expiry_hours?`${r.expiry_hours}h`:"+ Set"}
        </button>
      )
    )},
    {key:"suppliers", label:tl("Suppliers"), sortable:false, render:r=>{
      const links = procLinks.filter(l=>l.pid===r.pid);
      return (
        <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
          {links.map(l=>(
            <div key={l.psid} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12 }}>
              <span style={{flex:1}}>{l.supplier_name}</span>
              {l.price&&<span style={{color:G.caramel,fontWeight:600}}>{l.price} {l.currency}</span>}
              <button onClick={()=>unlinkSupplier(l.sid,l.psid)} style={{background:"none",border:"none",color:G.muted,cursor:"pointer",fontSize:12,lineHeight:1}}>×</button>
            </div>
          ))}
          {linkPid===r.pid ? (
            <div style={{ display:"flex", gap:4, alignItems:"center", flexWrap:"wrap", marginTop:2 }}>
              <select value={linkSid} onChange={e=>setLinkSid(e.target.value)} style={{padding:"3px 6px",borderRadius:6,border:`1px solid ${G.border}`,fontSize:12,fontFamily:G.mono,outline:"none"}}>
                <option value="">Supplier…</option>
                {suppliers.map(s=><option key={s.sid} value={s.sid}>{s.name}</option>)}
              </select>
              <input type="number" value={linkPrice} onChange={e=>setLinkPrice(e.target.value)} placeholder="Price" style={{width:60,padding:"3px 6px",borderRadius:6,border:`1px solid ${G.border}`,fontSize:12,fontFamily:G.mono,outline:"none"}} />
              <select value={linkCurrency} onChange={e=>setLinkCurrency(e.target.value)} style={{padding:"3px 6px",borderRadius:6,border:`1px solid ${G.border}`,fontSize:12,fontFamily:G.mono,outline:"none"}}>
                {["AMD","USD","EUR","RUR"].map(c=><option key={c}>{c}</option>)}
              </select>
              <Btn size="sm" onClick={linkSupplier}>Link</Btn>
              <button onClick={()=>setLinkPid(null)} style={{background:"none",border:"none",cursor:"pointer",color:G.muted,fontSize:14}}>×</button>
            </div>
          ):(
            <button onClick={()=>{setLinkPid(r.pid);setLinkSid("");setLinkPrice("");}}
              style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:G.caramel,fontFamily:G.mono,fontWeight:600,textAlign:"left"}}>
              + Add supplier
            </button>
          )}
        </div>
      );
    }},
    {key:"stock",    label:tl("Stock"),       sortable:false, render:r=>{
      const qty = stock[r.pid];
      return qty!=null ? <span style={{fontWeight:600,color:qty>0?G.dark:G.red}}>{qty}</span> : <span style={{color:G.muted}}>—</span>;
    }},
    {key:"forecast", label:(()=>{
      const fc = Object.values(forecast)[0];
      const start = fc?.period_start ? new Date(fc.period_start) : null;
      const end   = fc?.period_end   ? new Date(fc.period_end)   : null;
      const fmt = d => d ? `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()} 08:00 AM` : "—";
      return (
        <span title={start&&end?`from ${fmt(start)} to ${fmt(end)}`:""} style={{textDecoration:"underline dotted",textUnderlineOffset:3,cursor:"help"}}>
          {tl("Forecast")}
        </span>
      );
    })(), sortable:false, render:r=>{
      const fc = forecast[r.pid];
      return <Sparkline series={fc?.series||[]} tg={fc?.tg??0} />;
    }},
    {key:"units",    label:tl("Units"),       sortable:false, render:r=>r.units||<span style={{color:G.muted}}>—</span>},
  ];

  return (
    <Page title={tl("Products")} actions={<div style={{display:"flex",gap:8}}>
      {selected.length>0&&<Btn variant="danger" size="sm" onClick={openDeleteDialog}>{tl("Delete")} ({selected.length})</Btn>}
      <Btn variant="secondary" size="sm" onClick={refreshForecast} loading={refreshingForecast}>↻ Forecast</Btn>
      <Btn size="sm" onClick={()=>setShowForm(s=>!s)}>{tl("+ New product")}</Btn>
    </div>}>
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
      let cloudinary_id = form.cloudinary_id || null;

      if (imageBlob) {
        const fd = new FormData();
        fd.append("image", imageBlob, "recipe.jpg");
        if (existingRid) fd.append("rid", String(existingRid));
        const res = await api.uploadImage(fd);
        image_url = res.url;
        image_thumb_url = res.thumb_url;
        cloudinary_id = res.cloudinary_id;
      } else if (removeImage && existingRid) {
        await api.removeImage(existingRid);
        image_url = null; image_thumb_url = null; cloudinary_id = null;
      }

      const payload = { name:form.name, description:form.description||null, unid:form.unid||null, caid:form.caid||null, price:Number(form.price)||0, currency:form.currency||"AMD", available:form.available!==false, deliverable:form.deliverable!==false, image_url, image_thumb_url, cloudinary_id, allow_submultiples:!!form.allow_submultiples, moq:form.moq?Number(form.moq):null, contents:(contents||[]).filter(c=>c.pid) };

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
          <Btn variant="secondary" size="sm" onClick={()=>setShowSidebar(true)}>+ Add items</Btn>
          <Btn variant="danger" size="sm" onClick={()=>setDialog("delete-menu")}>Delete</Btn>
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
          Are you sure you wish to remove the selected items? You may add them back later.
        </Dialog>
        <Dialog open={dialog==="delete-menu"} title={`Delete "${menu.name}"?`} onConfirm={async()=>{
          try {
            await api.deleteMenu(viewMid);
            setMenus(prev=>prev.filter(m=>m.mid!==viewMid));
            toast(`"${menu.name}" deleted`);
            setDialog(null); setViewMid(null);
          } catch(e){ toast(e.message,"error"); setDialog(null); }
        }} onCancel={()=>setDialog(null)}>
          This will permanently delete the menu and remove all items from it. Orders are not affected. This cannot be undone.
        </Dialog>
      {showSidebar&&(
        <div style={{ position:"fixed", inset:0, zIndex:200 }} onClick={()=>setShowSidebar(false)}>
          <div onClick={e=>e.stopPropagation()} style={{ position:"fixed", right:0, top:0, bottom:0, width:340, background:G.white, boxShadow:"-8px 0 40px rgba(44,24,16,0.12)", padding:24, display:"flex", flexDirection:"column", animation:"slideIn 0.25s ease" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h3 style={{ fontFamily:G.font, fontSize:18 }}>Items</h3>
              <button onClick={()=>setShowSidebar(false)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:G.muted}}>×</button>
            </div>
            <Select label="Category" value={sidebarCat} onChange={setSidebarCat} options={sidebarCats} placeholder="All categories" />
            <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:6, marginTop:16 }}>
              {sidebarRecs.map(r=>{
                const inMenu = (menus.find(m=>m.mid===viewMid)?.recipes||[]).some(x=>x.rid===r.rid);
                const toggle = async () => {
                  try {
                    const u = inMenu
                      ? await api.removeMenuRecipes(viewMid, [r.rid])
                      : await api.addMenuRecipes(viewMid, [r.rid]);
                    setMenus(prev=>prev.map(m=>m.mid===viewMid?u:m));
                  } catch(e){ toast(e.message,"error"); }
                };
                return (
                  <label key={r.rid} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:8, cursor:"pointer", background:inMenu?"#fef9f4":"transparent", border:`1px solid ${inMenu?G.caramel:"transparent"}` }}>
                    <input type="checkbox" checked={inMenu} onChange={toggle} style={{accentColor:G.caramel}} />
                    <span style={{flex:1,fontSize:14}}>{r.name}</span>
                    <span style={{fontSize:12,color:G.muted}}>{r.price} {r.currency}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}
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
            <Btn variant="secondary" size="sm" onClick={()=>setShowSidebar(true)}>+ Add items</Btn>
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
              <h3 style={{ fontFamily:G.font, fontSize:18 }}>Items</h3>
              <button onClick={()=>setShowSidebar(false)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:G.muted}}>×</button>
            </div>
            <Select label="Category" value={sidebarCat} onChange={setSidebarCat} options={sidebarCats} placeholder="All categories" />
            <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:6, marginTop:16 }}>
              {sidebarRecs.map(r=>(
                <label key={r.rid} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:8, cursor:"pointer", background:form.recipe_ids.includes(r.rid)?"#fef9f4":"transparent", border:`1px solid ${form.recipe_ids.includes(r.rid)?G.caramel:"transparent"}` }}>
                  <input type="checkbox" checked={form.recipe_ids.includes(r.rid)}
                    onChange={()=>setForm(p=>({...p,recipe_ids:p.recipe_ids.includes(r.rid)?p.recipe_ids.filter(x=>x!==r.rid):[...p.recipe_ids,r.rid]}))}
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
                      <span style={{ flex:1, fontSize:14 }}>{r.name}{r.deliverable===false&&<span style={{ fontSize:12, color:G.muted, marginLeft:6 }}>(pick-up only)</span>}</span>
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

// ─── EDIT ORDER MODAL (Restaurant adjusts quantities for Accepted order) ────────
function EditOrderModal({ order, toast, onClose, onSaved }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
  const [items, setItems] = useState(
    (order.items||[]).map(it=>({ ...it, qty: it.qty, price: it.price }))
  );
  const [saving, setSaving] = useState(false);

  const updateItem = (i, field, val) =>
    setItems(p=>p.map((x,j)=>j===i?{...x,[field]:val}:x));

  const total = items.reduce((s,it)=>{
    const qty = parseFloat(it.qty)||0;
    const price = parseFloat(it.price)||0;
    return s + qty * price;
  }, 0);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.updateOrderItems(order.oid,
        items.map(it=>({ oiid:it.oiid, qty:parseFloat(it.qty)||0 }))
      );
      toast(`Order #${order.oid} updated`);
      onSaved(updated);
    } catch(e) { toast(e.message,"error"); } finally { setSaving(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(44,24,16,0.45)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:G.white, borderRadius:16, width:"100%", maxWidth:640, maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(44,24,16,0.2)", animation:"fadeIn 0.2s ease" }}>
        <div style={{ padding:"20px 24px", borderBottom:`1px solid ${G.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h3 style={{ fontFamily:G.font, fontSize:18 }}>Order #{order.oid}</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:G.muted }}>×</button>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:24 }}>
          {order.customer&&(
            <p style={{ fontSize:13, color:G.muted, marginBottom:16 }}>
              {order.customer.first_name} {order.customer.last_name}
              {order.customer.email&&<> · {order.customer.email}</>}
            </p>
          )}
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:G.sand, borderBottom:`1px solid ${G.border}` }}>
                {["Item","Qty","Price / unit","Total"].map(h=>(
                  <th key={h} style={{ padding:"8px 12px", textAlign:"left", fontSize:11, fontWeight:700, textTransform:"uppercase", color:G.muted, letterSpacing:"0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it,i)=>(
                <tr key={it.oiid} style={{ borderBottom:`1px solid ${G.border}` }}>
                  <td style={{ padding:"10px 12px", fontSize:14 }}>{it.name}</td>
                  <td style={{ padding:"10px 12px" }}>
                    <input type="number" value={it.qty} min={0} step="any"
                      onChange={e=>updateItem(i,"qty",e.target.value)}
                      style={{ width:80, padding:"5px 8px", borderRadius:6, border:`1px solid ${G.border}`, fontSize:13, fontFamily:G.mono, outline:"none", textAlign:"right" }}/>
                  </td>
                  <td style={{ padding:"10px 12px", fontSize:13, color:G.muted }}>
                    {it.price} {it.currency||"AMD"}
                  </td>
                  <td style={{ padding:"10px 12px", fontSize:13, fontWeight:600, color:G.caramel, textAlign:"right" }}>
                    {((parseFloat(it.qty)||0)*(parseFloat(it.price)||0)).toFixed(2)} {it.currency||"AMD"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding:"14px 24px", borderTop:`1px solid ${G.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontFamily:G.font, fontSize:18, fontWeight:700, color:G.caramel }}>{total.toFixed(2)} AMD</span>
          <div style={{ display:"flex", gap:10 }}>
            <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn onClick={save} loading={saving}>Save</Btn>
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
  const [editOrder, setEditOrder] = useState(null); // order being edited by restaurant

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

  // Search debounce ref — 2 second delay as per spec
  const searchRef = useRef(null);
  const [searchInput, setSearchInput] = useState("");
  useEffect(()=>{
    clearTimeout(searchRef.current);
    searchRef.current = setTimeout(()=>{ setSearch(searchInput); setPage(0); }, 2000);
    return ()=>clearTimeout(searchRef.current);
  },[searchInput]);

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
      <div style={{ position:"relative", display:"inline-flex", alignItems:"center" }}>
        <input value={searchInput} onChange={e=>setSearchInput(e.target.value)} placeholder={tl("Search")+"…"}
          style={{ padding:"6px 28px 6px 10px", borderRadius:8, border:`1px solid ${G.border}`, fontSize:13, fontFamily:G.mono, width:160, outline:"none" }}
          onFocus={e=>e.target.style.borderColor=G.caramel} onBlur={e=>e.target.style.borderColor=G.border} />
        {searchInput&&<button onClick={()=>{setSearchInput("");setSearch("");setPage(0);}} style={{ position:"absolute", right:6, background:"none", border:"none", cursor:"pointer", color:G.muted, fontSize:14, lineHeight:1, padding:0 }}>×</button>}
      </div>
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
      {editOrder&&(
        <EditOrderModal
          order={editOrder}
          toast={toast}
          onClose={()=>setEditOrder(null)}
          onSaved={updated=>{ setOrders(prev=>prev.map(o=>o.oid===updated.oid?updated:o)); setEditOrder(null); }}
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
                        <div style={{ display:"flex", gap:4, marginTop:8 }}>
                          <Btn size="sm" onClick={()=>advance(o.oid)} style={{flex:1,fontSize:11,padding:"5px 0"}}>{tl(cfg.next)}</Btn>
                          {o.status==="Accepted"&&(
                            <Btn size="sm" variant="secondary" onClick={()=>setEditOrder(o)} style={{fontSize:11,padding:"5px 10px"}}>✎</Btn>
                          )}
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
  const [selectedAddr, setSelectedAddr] = useState(0);
  const [otherStreet, setOtherStreet] = useState("");
  const [otherCity, setOtherCity]     = useState("");
  const [otherZip, setOtherZip]       = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [lightbox, setLightbox]       = useState(null);
  const [viewItem, setViewItem]       = useState(null); // item detail dialog

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

  // MOQ-aware qty change: if allow_submultiples, each step = moq (in subunits)
  // qty stored as number of MOQ steps, effective qty = steps * moq subunits
  const changeQty=(r, delta)=>setQty(p=>{
    const step = r.allow_submultiples && r.moq ? 1 : 1;
    const current = p[r.rid]||0;
    const next = Math.max(0, Math.min(r.allow_submultiples?9999:20, current+delta*step));
    return {...p,[r.rid]:next};
  });

  // Display qty in appropriate units
  const displayQty = (r, steps) => {
    if (!r.allow_submultiples || !r.moq) return steps;
    const subQty = steps * Number(r.moq);
    const unitName = r.units||"";
    const c = conv(unitName);
    if (subQty >= c) return `${(subQty/c).toFixed(subQty%c===0?0:2)} ${unitAbbr(unitName)}`;
    return `${subQty} ${subAbbr(unitName)}`;
  };

  // Price display: per unit with abbr if allow_submultiples, else plain
  const displayPrice = (r) => {
    const unitName = r.units||"";
    if (r.allow_submultiples && unitAbbr(unitName)) return `${r.price} ${r.currency} / ${unitAbbr(unitName)}`;
    return `${r.price} ${r.currency}`;
  };

  // Line total: price * (steps * moq / conv) when submultiples, else price * steps
  const lineTotal = (r, steps) => {
    if (!steps) return 0;
    if (r.allow_submultiples && r.moq) {
      const subQty = steps * Number(r.moq);
      const fullUnits = subQty / conv(r.units||"");
      return Math.round(r.price * fullUnits * 100) / 100;
    }
    return r.price * steps;
  };

  const cartItems=(menu.recipes||[]).filter(r=>(qty[r.rid]||0)>0).map(r=>({
    rid:r.rid, name:r.name, qty:qty[r.rid],
    price: r.allow_submultiples && r.moq
      ? Math.round(r.price * (Number(r.moq) / conv(r.units||"")) * 100) / 100  // price per MOQ step
      : r.price,
    deliverable:r.deliverable!==false,
  }));
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
                        <button onClick={()=>setViewItem(r)} style={{background:"none",border:"none",cursor:"pointer",fontWeight:600,fontSize:14,color:G.dark,padding:0,textAlign:"left"}}>{r.name}</button>
                      </p>
                      <p style={{ fontSize:13, color:G.caramel, fontWeight:600 }}>{displayPrice(r)}</p>
                      {r.allow_submultiples && r.moq && (
                        <p style={{ fontSize:11, color:G.muted }}>min. {Number(r.moq) % 1 === 0 ? Number(r.moq) : Number(r.moq).toFixed(1)} {subAbbr(r.units||"")}</p>
                      )}
                    </div>
                    {(qty[r.rid]||0)>0&&<span style={{ fontSize:13, color:G.muted, fontWeight:600, minWidth:70, textAlign:"right" }}>{lineTotal(r,qty[r.rid]||0)} AMD</span>}
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <button onClick={()=>changeQty(r,-1)} style={{ width:28, height:28, borderRadius:6, border:`1px solid ${G.border}`, background:G.white, cursor:"pointer", fontSize:16, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                      <span style={{ minWidth:r.allow_submultiples?52:20, textAlign:"center", fontWeight:700, fontSize:13 }}>{displayQty(r,qty[r.rid]||0)}</span>
                      <button onClick={()=>changeQty(r,1)} style={{ width:28, height:28, borderRadius:6, border:"none", background:G.caramel, cursor:"pointer", fontSize:16, fontWeight:700, color:G.white, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
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
                  <span style={{ flex:1 }}>{it.name}</span>
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

      {/* Item detail dialog */}
      {viewItem&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(44,24,16,0.5)", zIndex:1000, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
          onClick={e=>{ if(e.target===e.currentTarget) setViewItem(null); }}>
          <div style={{ background:G.white, borderRadius:"20px 20px 0 0", width:"100%", maxWidth:540, maxHeight:"85vh", overflow:"auto", boxShadow:"0 -8px 40px rgba(44,24,16,0.18)" }}>
            {(viewItem.image_url||viewItem.image_thumb_url)&&(
              <div style={{ width:"100%", height:200, overflow:"hidden", borderRadius:"20px 20px 0 0" }}>
                <img src={viewItem.image_url||viewItem.image_thumb_url} alt={viewItem.name}
                  style={{ width:"100%", height:"100%", objectFit:"cover", cursor:"pointer" }}
                  onClick={()=>setLightbox({src:viewItem.image_url||viewItem.image_thumb_url})} />
              </div>
            )}
            <div style={{ padding:24 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                <h2 style={{ fontFamily:G.font, fontSize:22 }}>{viewItem.name}</h2>
                <button onClick={()=>setViewItem(null)} style={{ background:"none", border:"none", fontSize:24, cursor:"pointer", color:G.muted, lineHeight:1, marginLeft:12 }}>×</button>
              </div>
              <p style={{ fontSize:18, fontWeight:700, color:G.caramel, marginBottom:12 }}>{displayPrice(viewItem)}</p>
              {viewItem.description&&<p style={{ fontSize:14, color:G.muted, lineHeight:1.6, marginBottom:16 }}>{viewItem.description}</p>}
              {viewItem.allow_submultiples && viewItem.moq && (
                <p style={{ fontSize:13, color:G.muted, marginBottom:16 }}>min. {Number(viewItem.moq) % 1 === 0 ? Number(viewItem.moq) : Number(viewItem.moq).toFixed(1)} {subAbbr(viewItem.units||"")}</p>
              )}
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, border:`1px solid ${G.border}`, borderRadius:10, padding:"6px 10px" }}>
                  <button onClick={()=>changeQty(viewItem,-1)} style={{ width:32, height:32, borderRadius:7, border:`1px solid ${G.border}`, background:G.white, cursor:"pointer", fontSize:18, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                  <span style={{ minWidth:viewItem.allow_submultiples?64:28, textAlign:"center", fontWeight:700, fontSize:15 }}>{displayQty(viewItem,qty[viewItem.rid]||0)}</span>
                  <button onClick={()=>changeQty(viewItem,1)} style={{ width:32, height:32, borderRadius:7, border:"none", background:G.caramel, cursor:"pointer", fontSize:18, fontWeight:700, color:G.white, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                </div>
                <Btn onClick={()=>{ if((qty[viewItem.rid]||0)===0) changeQty(viewItem,1); setViewItem(null); }} style={{ flex:1 }}>
                  {(qty[viewItem.rid]||0)>0 ? `In basket · ${lineTotal(viewItem,qty[viewItem.rid]||0)} AMD` : "Add to basket"}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}
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
    <Page title={tl("Schedule")} actions={<Btn onClick={save} loading={saving}>{tl("Save schedule")}</Btn>}>
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
  const [orders, setOrders]       = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts]   = useState([]);
  const [procLinks, setProcLinks] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showNew, setShowNew]     = useState(false);
  const [viewOrder, setViewOrder] = useState(null);  // order being viewed/accepted
  const [sortKey, setSortKey]     = useState("order_id");
  const [sortDir, setSortDir]     = useState("asc");
  const [page, setPage]           = useState(0);
  const [pageSize, setPageSize]   = useState(25);
  const [saving, setSaving]       = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [acceptDialog, setAcceptDialog]   = useState(false);
  const [acceptComments, setAcceptComments] = useState("");
  const [acceptItems, setAcceptItems]     = useState([]);

  // New order form state
  const [newSid, setNewSid]         = useState("");
  const [newTerm, setNewTerm]       = useState("");
  const [newFee, setNewFee]         = useState("");
  const [newCurrency, setNewCurrency] = useState("AMD");
  const [newRows, setNewRows]       = useState([]); // [{pid,qty,unit_price,currency}]

  const load = useCallback(async()=>{
    setLoading(true);
    try {
      const [o, s, proc] = await Promise.all([
        api.getSupplierOrders(),
        api.getSuppliers(),
        api.getProcurement(),
      ]);
      setOrders(o||[]); setSuppliers(s||[]);
      setProducts(proc.products||[]); setProcLinks(proc.links||[]);
    } catch(e){ toast(e.message,"error"); }
    finally{ setLoading(false); }
  },[]);
  useEffect(()=>{ load(); },[]);

  // Products filtered by selected supplier
  const availProducts = newSid
    ? products.filter(p => procLinks.some(l=>l.pid===p.pid && String(l.sid)===String(newSid)))
    : products;

  const addRow = () => {
    const pid = availProducts[0]?.pid||"";
    const link = procLinks.find(l=>String(l.pid)===String(pid) && String(l.sid)===String(newSid));
    setNewRows(r=>[...r,{pid,qty:1,unit_price:link?.price||0,currency:link?.currency||newCurrency}]);
  };
  const removeRow = i => setNewRows(r=>r.filter((_,j)=>j!==i));
  const updateRow = (i,k,v) => setNewRows(r=>r.map((x,j)=>j===i?{...x,[k]:v}:x));
  const rowQtyChange = (i,delta) => setNewRows(r=>r.map((x,j)=>j===i?{...x,qty:Math.max(0,Math.min(9999,Math.round((parseFloat(x.qty)||0+delta)*1000)/1000))}:x));

  const calcTotals = (rows) => {
    const subtotal = rows.reduce((s,r)=>s+(parseFloat(r.qty)||0)*(parseFloat(r.unit_price)||0),0);
    const delivery = parseFloat(newFee)||0;
    const vat = (subtotal+delivery)*0.2;
    return { subtotal, delivery, vat, total: subtotal+delivery+vat };
  };

  const saveOrder = async (submit=false) => {
    if (!newSid) { toast("Select a supplier","error"); return; }
    if (!newRows.length) { toast("Add at least one product","error"); return; }
    setSaving(true);
    try {
      const items = newRows.map(r=>({ pid:Number(r.pid), qty_ordered:parseFloat(r.qty)||1, unit_price:parseFloat(r.unit_price)||0, currency:r.currency||newCurrency }));
      const order = await api.createSupplierOrder({ sid:Number(newSid), items, delivery_term:newTerm||null, delivery_fee:parseFloat(newFee)||0, currency:newCurrency });
      if (submit) {
        const submitted = await api.submitSupplierOrder(order.soid);
        toast(`Order #${submitted.order_id} submitted`);
        // Trigger PDF download
        downloadPDF(submitted.po_pdf_url, submitted.order_id, "purchase_order");
        setOrders(o=>[submitted,...o]);
      } else {
        toast(`Order #${order.order_id} saved`);
        setOrders(o=>[order,...o]);
      }
      setShowNew(false); resetNewForm();
    } catch(e){ toast(e.message,"error"); } finally{ setSaving(false); }
  };

  const resetNewForm = () => { setNewSid(""); setNewTerm(""); setNewFee(""); setNewRows([]); };

  const downloadPDF = (b64, orderId, type) => {
    if (!b64) return;
    const bytes = Uint8Array.from(atob(b64), c=>c.charCodeAt(0));
    const blob = new Blob([bytes], {type:"application/pdf"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const now = new Date();
    const ts = `${String(now.getDate()).padStart(2,"0")}-${String(now.getMonth()+1).padStart(2,"0")}-${now.getFullYear()}_${String(now.getHours()).padStart(2,"0")}_${String(now.getMinutes()).padStart(2,"0")}_${String(now.getSeconds()).padStart(2,"0")}`;
    a.href = url; a.download = `${ts}_${type}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  const openOrder = async (soid) => {
    try {
      const o = await api.getSupplierOrder(soid);
      setViewOrder(o);
      setAcceptItems(o.items.map(it=>({...it, qty_actual: it.qty_actual !== null ? it.qty_actual : it.qty_ordered})));
    } catch(e){ toast(e.message,"error"); }
  };

  const doAccept = async () => {
    if (!viewOrder) return;
    setSaving(true);
    try {
      const result = await api.acceptSupplierOrder(viewOrder.soid, {
        items_actual: acceptItems.filter(it=>it.soiid).map(it=>({soiid:it.soiid, qty_actual:parseFloat(it.qty_actual)||0})),
        items_added:  acceptItems.filter(it=>!it.soiid && it.pid).map(it=>({pid:Number(it.pid), qty_actual:parseFloat(it.qty_actual)||0, unit_price:parseFloat(it.unit_price)||0, currency:it.currency})),
        comments: acceptComments,
      });
      toast(`Order #${viewOrder.order_id} accepted`);
      if (result.has_discrepancy && result.recon_pdf_url) {
        downloadPDF(result.recon_pdf_url, viewOrder.order_id, "reconciliation");
      }
      setOrders(o=>o.map(x=>x.soid===viewOrder.soid?{...x,status:"Accepted"}:x));
      setViewOrder(null); setAcceptDialog(false); setAcceptComments("");
    } catch(e){ toast(e.message,"error"); } finally{ setSaving(false); }
  };

  const terms = viewOrder ? (suppliers.find(s=>s.sid===viewOrder.sid)?.schedule?.delivery||[]) : [];
  const selectedSupplier = suppliers.find(s=>String(s.sid)===String(newSid));
  const availTerms = selectedSupplier?.schedule?.delivery || [];

  const sorted = [...orders].sort((a,b)=>{
    let av=a[sortKey]||"", bv=b[sortKey]||"";
    const v = String(av)<String(bv)?-1:String(av)>String(bv)?1:0;
    return sortDir==="asc"?v:-v;
  });
  const totalPages = Math.ceil(sorted.length/pageSize);
  const paged = sorted.slice(page*pageSize,(page+1)*pageSize);
  const toggleSort = k => { if(sortKey===k)setSortDir(d=>d==="asc"?"desc":"asc"); else{setSortKey(k);setSortDir("asc");} };

  const totals = calcTotals(newRows);
  const STATUS_COLORS = { New:G.muted, Submitted:"#eab308", Cancelled:G.red, Delivered:"#3b82f6", Accepted:G.green };

  return (
    <Page title={tl("Procurement")} actions={
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <Btn variant="secondary" size="sm" loading={saving} onClick={async()=>{
          setSaving(true);
          try{ await api.createDraftOrders(); await load(); toast("Orders created from forecast"); }
          catch(e){ toast(e.message,"error"); }
          finally{ setSaving(false); }
        }}>From forecast</Btn>
        <Btn size="sm" onClick={()=>setShowNew(s=>!s)}>+ New Order</Btn>
      </div>
    }>

      {/* ── NEW ORDER FORM ─────────────────────────────────────────────── */}
      {showNew&&(
        <div style={{ background:G.white, border:`1px solid ${G.border}`, borderRadius:14, padding:24, marginBottom:24, animation:"fadeIn 0.2s ease" }}>
          <h3 style={{ fontFamily:G.font, fontSize:17, marginBottom:16 }}>New Supplier Order</h3>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:14, marginBottom:16 }}>
            <div>
              <label style={{fontSize:13,fontWeight:600,color:G.dark,display:"block",marginBottom:5}}>Supplier *</label>
              <select value={newSid} onChange={e=>{setNewSid(e.target.value);setNewTerm("");setNewRows([]);}}
                style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${G.border}`,fontSize:14,fontFamily:G.mono,outline:"none"}}>
                <option value="">Select supplier…</option>
                {suppliers.map(s=><option key={s.sid} value={s.sid}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:13,fontWeight:600,color:G.dark,display:"block",marginBottom:5}}>Delivery term</label>
              <select value={newTerm} onChange={e=>setNewTerm(e.target.value)}
                style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${G.border}`,fontSize:14,fontFamily:G.mono,outline:"none"}}>
                <option value="">Select term…</option>
                {availTerms.map(t=><option key={t.name} value={t.name}>{t.name} (cut-off {t.cutoff})</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:13,fontWeight:600,color:G.dark,display:"block",marginBottom:5}}>Delivery fee</label>
              <input
                type="number" min="0" value={newFee} placeholder="0"
                onKeyDown={e=>{ if(e.key==="-"||e.key==="−") e.preventDefault(); }}
                onChange={e=>{ const v=e.target.value; if(v===''||parseFloat(v)>=0) setNewFee(v); }}
                onBlur={e=>{ if(parseFloat(e.target.value)<0||e.target.value==='') setNewFee('0'); }}
                style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${G.border}`,fontSize:14,fontFamily:G.mono,outline:"none"}}
              />
            </div>
            <div>
              <label style={{fontSize:13,fontWeight:600,color:G.dark,display:"block",marginBottom:5}}>Currency</label>
              <select value={newCurrency} onChange={e=>setNewCurrency(e.target.value)}
                style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${G.border}`,fontSize:14,fontFamily:G.mono,outline:"none"}}>
                {["AMD","USD","EUR","RUR"].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Product rows */}
          <div style={{ background:G.sand, borderRadius:10, padding:14, marginBottom:14 }}>
            <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr auto", gap:8, marginBottom:8 }}>
              {["Product","Qty","Unit Price","Total",""].map(h=><span key={h} style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</span>)}
            </div>
            {newRows.map((r,i)=>{
              const tot = (parseFloat(r.qty)||0)*(parseFloat(r.unit_price)||0);
              return (
                <div key={i} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr auto", gap:8, marginBottom:6, alignItems:"center" }}>
                  <select value={r.pid} onChange={e=>{
                    const link=procLinks.find(l=>String(l.pid)===e.target.value&&String(l.sid)===String(newSid));
                    updateRow(i,"pid",e.target.value);
                    if(link){updateRow(i,"unit_price",link.price||0);updateRow(i,"currency",link.currency||newCurrency);}
                  }} style={{padding:"6px 8px",borderRadius:6,border:`1px solid ${G.border}`,fontSize:13,fontFamily:G.mono,outline:"none"}}>
                    <option value="">Select product…</option>
                    {availProducts.map(p=><option key={p.pid} value={p.pid}>{p.name}{p.sku?` (${p.sku})`:""}</option>)}
                  </select>
                  <div style={{display:"flex",alignItems:"center",gap:3}}>
                    <button onClick={()=>rowQtyChange(i,-1)} style={{width:22,height:22,borderRadius:5,border:`1px solid ${G.border}`,background:G.white,cursor:"pointer",fontWeight:700,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                    <input type="number" value={r.qty} step="any" min={0} onChange={e=>updateRow(i,"qty",e.target.value)}
                      style={{width:60,padding:"4px 6px",borderRadius:6,border:`1px solid ${G.border}`,fontSize:13,textAlign:"center",fontFamily:G.mono,outline:"none"}} />
                    <button onClick={()=>rowQtyChange(i,1)} style={{width:22,height:22,borderRadius:5,border:"none",background:G.caramel,cursor:"pointer",fontWeight:700,fontSize:13,color:G.white,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                  </div>
                  <input type="number" value={r.unit_price} min={0} onChange={e=>updateRow(i,"unit_price",e.target.value)}
                    style={{padding:"6px 8px",borderRadius:6,border:`1px solid ${G.border}`,fontSize:13,fontFamily:G.mono,outline:"none"}} />
                  <span style={{fontSize:13,fontWeight:600,color:G.caramel}}>{tot.toFixed(2)}</span>
                  <button onClick={()=>removeRow(i)} style={{background:"none",border:"none",color:G.red,cursor:"pointer",fontSize:16,lineHeight:1}}>×</button>
                </div>
              );
            })}
            <button onClick={addRow} style={{background:"none",border:`1px dashed ${G.border}`,color:G.caramel,cursor:"pointer",fontSize:13,fontFamily:G.mono,padding:"6px 14px",borderRadius:8,fontWeight:600,marginTop:4}}>
              + Add product
            </button>
          </div>

          {/* Totals */}
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
            <div style={{ minWidth:240, display:"flex", flexDirection:"column", gap:4 }}>
              {[["Subtotal",totals.subtotal],["Delivery",totals.delivery],["VAT (20%)",totals.vat],["Total",totals.total]].map(([l,v])=>(
                <div key={l} style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                  <span style={{color:G.muted}}>{l}</span>
                  <span style={{fontWeight:l==="Total"?700:400,color:l==="Total"?G.caramel:G.dark}}>{v.toFixed(2)} {newCurrency}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:"flex", gap:10 }}>
            <Btn onClick={()=>saveOrder(true)} loading={saving}>Submit</Btn>
            <Btn variant="secondary" onClick={()=>saveOrder(false)} loading={saving}>Save</Btn>
            <Btn variant="ghost" onClick={()=>{ setConfirmCancel(true); }}>Cancel</Btn>
          </div>
        </div>
      )}

      {/* ── ORDERS TABLE ───────────────────────────────────────────────── */}
      {loading?<Spinner/>:(
        <>
          <div style={{ background:G.white, borderRadius:14, border:`1px solid ${G.border}`, overflow:"hidden", marginBottom:14 }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:G.sand, borderBottom:`1px solid ${G.border}` }}>
                  {[["order_id","ID"],["created_at","Placed on"],["status","Status"],["etd","ETD"],["supplier_name","Supplier"],["total","Total"],["po","PO"],["recon","Reconciliation"]].map(([k,h])=>(
                    <th key={k} onClick={k!=="po"&&k!=="recon"?()=>toggleSort(k):undefined}
                      style={{ padding:"11px 14px", textAlign:"left", fontSize:11, fontWeight:700, letterSpacing:"0.05em", textTransform:"uppercase", color:G.muted, cursor:k!=="po"&&k!=="recon"?"pointer":"default", userSelect:"none", whiteSpace:"nowrap" }}>
                      {h}{sortKey===k&&<span style={{marginLeft:3}}>{sortDir==="asc"?"↑":"↓"}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.length===0?(
                  <tr><td colSpan={8} style={{padding:40,textAlign:"center",color:G.muted}}>No supplier orders yet.</td></tr>
                ):paged.map((o,i)=>{
                  const d = new Date(o.created_at);
                  const dateStr = `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
                  const etdStr = o.etd ? new Date(o.etd).toLocaleDateString("en-GB") : "—";
                  return (
                    <tr key={o.soid} style={{ borderBottom:i<paged.length-1?`1px solid ${G.border}`:"none" }}>
                      <td style={{padding:"10px 14px"}}>
                        {["New","Submitted"].includes(o.status) ? (
                          <button onClick={()=>openOrder(o.soid)} style={{background:"none",border:"none",cursor:"pointer",fontFamily:G.mono,fontSize:14,color:G.caramel,fontWeight:700,textDecoration:"underline",padding:0}}>{o.order_id}</button>
                        ) : <span style={{fontWeight:700,fontSize:14}}>{o.order_id}</span>}
                      </td>
                      <td style={{padding:"10px 14px",fontSize:13,color:G.muted}}>{dateStr}</td>
                      <td style={{padding:"10px 14px"}}><span style={{fontSize:12,fontWeight:700,color:STATUS_COLORS[o.status]||G.muted}}>{o.status}</span></td>
                      <td style={{padding:"10px 14px",fontSize:13,color:G.muted}}>{etdStr}</td>
                      <td style={{padding:"10px 14px",fontSize:14}}>{o.supplier_name}</td>
                      <td style={{padding:"10px 14px",fontSize:14,fontWeight:600,color:G.caramel}}>—</td>
                      <td style={{padding:"10px 14px"}}>
                        {o.po_pdf_url&&o.status!=="New"?(
                          <button onClick={async()=>{ const r=await api.getSupplierOrderPDF(o.soid); downloadPDF(r.pdf,o.order_id,"purchase_order"); }}
                            style={{background:"none",border:"none",cursor:"pointer",color:G.caramel,fontFamily:G.mono,fontSize:12,fontWeight:600}}>PDF</button>
                        ):<span style={{color:G.muted,fontSize:12}}>—</span>}
                      </td>
                      <td style={{padding:"10px 14px"}}>
                        {o.recon_pdf_url&&o.status==="Accepted"?(
                          <button onClick={async()=>{ const r=await api.getSupplierOrderPDF(o.soid,"recon"); downloadPDF(r.pdf,o.order_id,"reconciliation"); }}
                            style={{background:"none",border:"none",cursor:"pointer",color:G.caramel,fontFamily:G.mono,fontSize:12,fontWeight:600}}>PDF</button>
                        ):<span style={{color:G.muted,fontSize:12}}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{fontSize:13,color:G.muted}}>Rows:</span>
              {[10,25,50].map(n=>(
                <button key={n} onClick={()=>{setPageSize(n);setPage(0);}} style={{padding:"3px 9px",borderRadius:6,border:`1px solid ${pageSize===n?G.caramel:G.border}`,background:pageSize===n?G.caramel:G.white,color:pageSize===n?G.white:G.muted,fontSize:12,cursor:"pointer",fontFamily:G.mono}}>{n}</button>
              ))}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{fontSize:13,color:G.muted}}>{sorted.length} orders · page {totalPages?page+1:0}/{totalPages}</span>
              {[["«",0],["‹",page-1],["›",page+1],["»",totalPages-1]].map(([lbl,target])=>(
                <button key={lbl} onClick={()=>setPage(Math.max(0,Math.min(totalPages-1,target)))} disabled={target<0||target>=totalPages}
                  style={{padding:"3px 8px",borderRadius:6,border:`1px solid ${G.border}`,background:G.white,cursor:"pointer",fontSize:13,opacity:(target<0||target>=totalPages)?0.4:1}}>{lbl}</button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── VIEW / ACCEPT ORDER DIALOG ──────────────────────────────────── */}
      {viewOrder&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(44,24,16,0.45)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:G.white, borderRadius:16, width:"100%", maxWidth:760, maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(44,24,16,0.2)", animation:"fadeIn 0.2s ease" }}>
            <div style={{ padding:"20px 24px", borderBottom:`1px solid ${G.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <h3 style={{fontFamily:G.font,fontSize:18}}>
                {viewOrder.status==="New"?"Edit order":"Accept order"} #{viewOrder.order_id} — {viewOrder.supplier_name}
              </h3>
              <button onClick={()=>setViewOrder(null)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:G.muted,lineHeight:1}}>×</button>
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:24 }}>
              <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:16 }}>
                <thead>
                  <tr style={{ background:G.sand, borderBottom:`1px solid ${G.border}` }}>
                    {(viewOrder.status==="New"
                      ? ["Product","SKU","Qty","Unit Price","Total",""]
                      : ["Product","SKU","Qty (ordered)","Qty (actual)","Unit Price","Total (ord/act)",""]
                    ).map(h=>(
                      <th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:11,fontWeight:700,textTransform:"uppercase",color:G.muted,letterSpacing:"0.04em"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {acceptItems.map((it,i)=>{
                    const qty = viewOrder.status==="New" ? parseFloat(it.qty_actual)??parseFloat(it.qty_ordered) : parseFloat(it.qty_actual);
                    const totOrd = (parseFloat(it.qty_ordered)||0)*(parseFloat(it.unit_price)||0);
                    const totAct = (qty||0)*(parseFloat(it.unit_price)||0);
                    const hasDiscrepancy = viewOrder.status!=="New" && parseFloat(it.qty_actual) !== parseFloat(it.qty_ordered);
                    const isAdded = !it.soiid;
                    if (viewOrder.status==="New") return (
                      <tr key={it.soiid||`new-${i}`} style={{ borderBottom:`1px solid ${G.border}` }}>
                        <td style={{padding:"9px 12px",fontSize:14}}>
                          {isAdded ? (
                            <select value={it.pid} onChange={e=>{
                              const p=products.find(x=>String(x.pid)===e.target.value);
                              setAcceptItems(a=>a.map((x,j)=>j===i?{...x,pid:e.target.value,product_name:p?.name||"",sku:p?.sku||""}:x));
                            }} style={{padding:"4px 8px",borderRadius:6,border:`1px solid ${G.border}`,fontSize:13,fontFamily:G.mono,outline:"none"}}>
                              <option value="">Select product…</option>
                              {products.map(p=><option key={p.pid} value={p.pid}>{p.name}{p.sku?` (${p.sku})`:""}</option>)}
                            </select>
                          ) : it.product_name}
                        </td>
                        <td style={{padding:"9px 12px",fontSize:13,color:G.muted}}>{it.sku||"—"}</td>
                        <td style={{padding:"9px 12px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:4}}>
                            <button onClick={()=>setAcceptItems(a=>a.map((x,j)=>j===i?{...x,qty_actual:Math.max(0,(parseFloat(x.qty_actual)||0)-1)}:x))} style={{width:22,height:22,borderRadius:5,border:`1px solid ${G.border}`,background:G.white,cursor:"pointer",fontWeight:700,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                            <input type="number" value={it.qty_actual??it.qty_ordered} step="any" min={0}
                              onChange={e=>setAcceptItems(a=>a.map((x,j)=>j===i?{...x,qty_actual:e.target.value}:x))}
                              style={{width:70,padding:"4px 6px",borderRadius:6,border:`1px solid ${G.border}`,fontSize:13,textAlign:"center",fontFamily:G.mono,outline:"none"}}/>
                            <button onClick={()=>setAcceptItems(a=>a.map((x,j)=>j===i?{...x,qty_actual:(parseFloat(x.qty_actual)||0)+1}:x))} style={{width:22,height:22,borderRadius:5,border:"none",background:G.caramel,cursor:"pointer",fontWeight:700,fontSize:13,color:G.white,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                          </div>
                        </td>
                        <td style={{padding:"9px 12px"}}>
                          <input type="number" value={it.unit_price} min={0} step="any"
                            onChange={e=>setAcceptItems(a=>a.map((x,j)=>j===i?{...x,unit_price:e.target.value}:x))}
                            style={{width:80,padding:"4px 6px",borderRadius:6,border:`1px solid ${G.border}`,fontSize:13,fontFamily:G.mono,outline:"none"}}/>
                        </td>
                        <td style={{padding:"9px 12px",fontSize:13,color:G.caramel,fontWeight:600}}>{totAct.toFixed(2)}</td>
                        <td style={{padding:"9px 12px"}}>
                          {isAdded&&<button onClick={()=>setAcceptItems(a=>a.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:G.red,cursor:"pointer",fontSize:16,lineHeight:1}}>×</button>}
                        </td>
                      </tr>
                    );
                    return (
                      <tr key={it.soiid||`new-${i}`} style={{ background:hasDiscrepancy?"#FFCAB9":"transparent", borderBottom:`1px solid ${G.border}` }}>
                        <td style={{padding:"9px 12px",fontSize:14}}>
                          {isAdded ? (
                            <select value={it.pid} onChange={e=>{
                              const p=products.find(x=>String(x.pid)===e.target.value);
                              setAcceptItems(a=>a.map((x,j)=>j===i?{...x,pid:e.target.value,product_name:p?.name||"",sku:p?.sku||""}:x));
                            }} style={{padding:"4px 8px",borderRadius:6,border:`1px solid ${G.border}`,fontSize:13,fontFamily:G.mono,outline:"none"}}>
                              <option value="">Select product…</option>
                              {products.map(p=><option key={p.pid} value={p.pid}>{p.name}{p.sku?` (${p.sku})`:""}</option>)}
                            </select>
                          ) : it.product_name}
                        </td>
                        <td style={{padding:"9px 12px",fontSize:13,color:G.muted}}>{isAdded?"—":it.sku||"—"}</td>
                        <td style={{padding:"9px 12px",fontSize:14,color:G.muted}}>{isAdded?"—":it.qty_ordered}</td>
                        <td style={{padding:"9px 12px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:4}}>
                            <button onClick={()=>setAcceptItems(a=>a.map((x,j)=>j===i?{...x,qty_actual:Math.max(0,(parseFloat(x.qty_actual)||0)-1)}:x))} style={{width:22,height:22,borderRadius:5,border:`1px solid ${G.border}`,background:G.white,cursor:"pointer",fontWeight:700,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                            <input type="number" value={it.qty_actual} step="any" min={0}
                              onChange={e=>setAcceptItems(a=>a.map((x,j)=>j===i?{...x,qty_actual:e.target.value}:x))}
                              style={{width:70,padding:"4px 6px",borderRadius:6,border:`1px solid ${G.border}`,fontSize:13,textAlign:"center",fontFamily:G.mono,outline:"none"}} />
                            <button onClick={()=>setAcceptItems(a=>a.map((x,j)=>j===i?{...x,qty_actual:(parseFloat(x.qty_actual)||0)+1}:x))} style={{width:22,height:22,borderRadius:5,border:"none",background:G.caramel,cursor:"pointer",fontWeight:700,fontSize:13,color:G.white,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                          </div>
                        </td>
                        <td style={{padding:"9px 12px",fontSize:13}}>
                          {isAdded ? (
                            <input type="number" value={it.unit_price} min={0} step="any" onChange={e=>setAcceptItems(a=>a.map((x,j)=>j===i?{...x,unit_price:e.target.value}:x))}
                              style={{width:80,padding:"4px 6px",borderRadius:6,border:`1px solid ${G.border}`,fontSize:13,fontFamily:G.mono,outline:"none"}} />
                          ) : `${it.unit_price} ${it.currency}`}
                        </td>
                        <td style={{padding:"9px 12px",fontSize:13,color:G.caramel,fontWeight:600}}>
                          {isAdded ? `— / ${((parseFloat(it.qty_actual)||0)*(parseFloat(it.unit_price)||0)).toFixed(2)}`
                            : `${totOrd.toFixed(2)} / ${totAct.toFixed(2)}`}
                        </td>
                        <td style={{padding:"9px 12px"}}>
                          {isAdded && <button onClick={()=>setAcceptItems(a=>a.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:G.red,cursor:"pointer",fontSize:16,lineHeight:1}}>×</button>}
                        </td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td colSpan={7} style={{padding:"8px 12px"}}>
                      <button onClick={()=>setAcceptItems(a=>[...a,{pid:"",product_name:"",sku:"",qty_ordered:0,qty_actual:1,unit_price:0,currency:viewOrder?.currency||"AMD",soiid:null}])}
                        style={{background:"none",border:`1px dashed ${G.border}`,color:G.caramel,cursor:"pointer",fontSize:12,fontFamily:G.mono,padding:"5px 12px",borderRadius:7,fontWeight:600}}>
                        + Add product
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style={{ padding:"16px 24px", borderTop:`1px solid ${G.border}`, display:"flex", gap:10, justifyContent:"space-between", alignItems:"center" }}>
              <div>
                {viewOrder?.status==="New" && (
                  <Btn variant="danger" loading={saving} onClick={async()=>{
                    if(!window.confirm("Delete this order? This cannot be undone.")) return;
                    setSaving(true);
                    try {
                      await api.deleteSupplierOrder(viewOrder.soid);
                      setOrders(prev=>prev.filter(o=>o.soid!==viewOrder.soid));
                      toast("Order deleted"); setViewOrder(null);
                    } catch(e){ toast(e.message,"error"); } finally{ setSaving(false); }
                  }}>Delete</Btn>
                )}
              </div>
              <div style={{display:"flex",gap:10}}>
                <Btn variant="ghost" onClick={()=>setViewOrder(null)}>Close</Btn>
                {viewOrder?.status==="New" ? (<>
                  <Btn variant="secondary" loading={saving} onClick={async()=>{
                    setSaving(true);
                    try {
                      const items = acceptItems.filter(it=>it.soiid).map(it=>({soiid:it.soiid,pid:it.pid,qty_ordered:parseFloat(it.qty_actual)||0,unit_price:parseFloat(it.unit_price)||0,currency:it.currency}));
                      await api.updateSupplierOrder(viewOrder.soid, { items });
                      toast("Order saved"); await load(); setViewOrder(null);
                    } catch(e){ toast(e.message,"error"); } finally{ setSaving(false); }
                  }}>Save</Btn>
                  <Btn loading={saving} onClick={async()=>{
                    setSaving(true);
                    try {
                      const submitted = await api.submitSupplierOrder(viewOrder.soid);
                      toast(`Order #${submitted.order_id} submitted`);
                      downloadPDF(submitted.po_pdf_url, submitted.order_id, "purchase_order");
                      await load(); setViewOrder(null);
                    } catch(e){ toast(e.message,"error"); } finally{ setSaving(false); }
                  }}>Submit</Btn>
                </>) : viewOrder?.status==="Submitted" ? (
                  <Btn onClick={()=>setAcceptDialog(true)}>Accept order</Btn>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accept confirm dialog */}
      {acceptDialog&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(44,24,16,0.45)", zIndex:1100, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:G.white, borderRadius:16, padding:32, maxWidth:480, width:"90%", boxShadow:"0 20px 60px rgba(44,24,16,0.2)" }}>
            <h3 style={{fontFamily:G.font,fontSize:20,marginBottom:12}}>Accept order?</h3>
            <p style={{color:G.muted,fontSize:14,lineHeight:1.6,marginBottom:16}}>The order will become accepted and no changes will be available from this point. Please, double-check the contents and add comments before you proceed. In case of discrepancies, a reconciliation report will be created.</p>
            <textarea value={acceptComments} onChange={e=>setAcceptComments(e.target.value.slice(0,1000))}
              placeholder="Comments (optional, up to 1000 characters)"
              rows={4} style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1px solid ${G.border}`,fontSize:14,fontFamily:G.mono,outline:"none",resize:"vertical",marginBottom:6}} />
            <span style={{fontSize:11,color:G.muted}}>{acceptComments.length}/1000</span>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:14}}>
              <Btn variant="ghost" onClick={()=>setAcceptDialog(false)}>Cancel</Btn>
              <Btn onClick={doAccept} loading={saving}>Yes</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Cancel new order confirm dialog */}
      {confirmCancel&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(44,24,16,0.45)", zIndex:1100, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:G.white, borderRadius:16, padding:32, maxWidth:420, width:"90%", boxShadow:"0 20px 60px rgba(44,24,16,0.2)" }}>
            <h3 style={{fontFamily:G.font,fontSize:20,marginBottom:12}}>Discard order?</h3>
            <p style={{color:G.muted,fontSize:14,marginBottom:20}}>The changes to the order will not be saved. Are you sure?</p>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <Btn variant="ghost" onClick={()=>setConfirmCancel(false)}>Cancel</Btn>
              <Btn variant="danger" onClick={()=>{ setShowNew(false); resetNewForm(); setConfirmCancel(false); }}>Yes</Btn>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
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

// ─── REPORTS PAGE ─────────────────────────────────────────────────────────────
function ReportsPage({ toast }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
  const [period, setPeriod]   = useState('week');
  const [salesData, setSales] = useState([]);
  const [abcData, setAbc]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);

  const load = useCallback(async(p) => {
    const per = p||period;
    setLoading(true);
    try {
      const [sales, abc] = await Promise.all([api.getSalesReport(per), api.getAbcReport()]);
      setSales(sales||[]); setAbc(abc||null);
    } catch(e){ toast(e.message,"error"); }
    finally{ setLoading(false); }
  },[]);
  useEffect(()=>{ load('week'); },[]);

  const changePeriod = p => { setPeriod(p); load(p); };
  const totalRevenue = salesData.reduce((s,d)=>s+Number(d.revenue),0);
  const abcColor = { A:"#00b894", B:"#fdcb6e", C:"#d63031" };

  // ── Sales bar chart ─────────────────────────────────────────────────────
  const W=600,H=220,PL=55,PR=20,PT=20,PB=45,cW=W-PL-PR,cH=H-PT-PB;
  const vals = salesData.map(d=>Number(d.revenue));
  const maxV = Math.max(...vals,1);
  const barW = Math.max(4, cW/Math.max(vals.length,1) - 4);
  const n = vals.length;
  const xMean=(n-1)/2, yMean=n?vals.reduce((a,b)=>a+b,0)/n:0;
  const num=vals.reduce((s,v,i)=>s+(i-xMean)*(v-yMean),0);
  const den=vals.reduce((s,_,i)=>s+(i-xMean)**2,0);
  const slope=den?num/den:0, intercept=yMean-slope*xMean;
  const trendY0=PT+cH*(1-Math.max(0,intercept)/maxV);
  const trendY1=PT+cH*(1-Math.max(0,intercept+slope*(n-1))/maxV);
  const fmtAMD = v => v>=1000?`${Math.round(v/1000)}k`:String(Math.round(v));

  // ── ABC scatter ─────────────────────────────────────────────────────────
  const SW=600,SH=300,SPL=60,SPR=20,SPT=20,SPB=40,ScW=SW-SPL-SPR,ScH=SH-SPT-SPB;
  const items = abcData?.items||[];
  const maxRev=Math.max(...items.map(i=>i.revenue),1);
  const maxCv=Math.max(...items.map(i=>i.cv),2);
  const z05=SPL+(0.5/maxCv)*ScW, z1=SPL+(1/maxCv)*ScW;
  const xPos=cv=>SPL+(cv/maxCv)*ScW;
  const yPos=rev=>SPT+ScH-(rev/maxRev)*ScH;

  // ── Association rules ────────────────────────────────────────────────────
  const rules = abcData?.rules||[];
  const RW=600,RPL=185,RPR=20,RPT=20,RPB=20,RcW=RW-RPL-RPR;

  return (
    <Page title={tl("Reports")}>
      {/* SALES */}
      <div style={{ background:G.white, border:`1px solid ${G.border}`, borderRadius:14, padding:24, marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <h3 style={{ fontFamily:G.font, fontSize:17 }}>{tl("Sales")}</h3>
          <div style={{ display:"flex", borderRadius:8, border:`1px solid ${G.border}`, overflow:"hidden" }}>
            {[["week","Week"],["month","Month"],["year","Year"]].map(([k,l])=>(
              <button key={k} onClick={()=>changePeriod(k)} style={{
                padding:"6px 16px",border:"none",cursor:"pointer",fontSize:13,fontFamily:G.mono,
                background:period===k?G.caramel:G.white,color:period===k?G.white:G.muted,transition:"all 0.15s"
              }}>{tl(l)}</button>
            ))}
          </div>
        </div>
        <div style={{ display:"flex", gap:16, marginBottom:16 }}>
          <div style={{ background:G.sand, borderRadius:10, padding:"12px 20px" }}>
            <p style={{ fontSize:11, color:G.muted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4 }}>{tl("Revenue")}</p>
            <p style={{ fontFamily:G.font, fontSize:22, fontWeight:700, color:G.caramel }}>{totalRevenue.toLocaleString()} AMD</p>
          </div>
          <div style={{ background:G.sand, borderRadius:10, padding:"12px 20px" }}>
            <p style={{ fontSize:11, color:G.muted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4 }}>Days with sales</p>
            <p style={{ fontFamily:G.font, fontSize:22, fontWeight:700, color:G.dark }}>{salesData.length}</p>
          </div>
        </div>
        {loading?<Spinner/>:!vals.length?(
          <div style={{padding:60,textAlign:"center",color:G.muted}}>{tl("No data yet.")}</div>
        ):(
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{maxWidth:W,display:"block",margin:"0 auto"}}>
            {[0,0.25,0.5,0.75,1].map(t=>{
              const y=PT+cH*(1-t);
              return <g key={t}>
                <line x1={PL} y1={y} x2={PL+cW} y2={y} stroke={G.border} strokeWidth={0.5}/>
                <text x={PL-6} y={y+4} textAnchor="end" fontSize={10} fill={G.muted}>{fmtAMD(maxV*t)}</text>
              </g>;
            })}
            {vals.map((v,i)=>{
              const x=PL+i*(cW/n)+cW/(n*2)-barW/2;
              const bh=Math.max(1,(v/maxV)*cH);
              const date=new Date(salesData[i].day);
              const label=`${String(date.getDate()).padStart(2,"0")}/${String(date.getMonth()+1).padStart(2,"0")}`;
              return <g key={i}>
                <rect x={x} y={PT+cH-bh} width={barW} height={bh} fill={G.caramel} opacity={0.8} rx={2}/>
                {i%(Math.ceil(n/8))===0&&<text x={x+barW/2} y={H-8} textAnchor="middle" fontSize={9} fill={G.muted}>{label}</text>}
              </g>;
            })}
            {n>1&&<line x1={PL} y1={Math.min(H-PB,Math.max(PT,trendY0))} x2={PL+cW} y2={Math.min(H-PB,Math.max(PT,trendY1))} stroke={G.red} strokeWidth={1.5} strokeDasharray="4,3"/>}
            <line x1={PL} y1={PT} x2={PL} y2={PT+cH} stroke={G.border} strokeWidth={1}/>
            <line x1={PL} y1={PT+cH} x2={PL+cW} y2={PT+cH} stroke={G.border} strokeWidth={1}/>
            <text x={PL-44} y={PT+cH/2} textAnchor="middle" fontSize={10} fill={G.muted} transform={`rotate(-90,${PL-44},${PT+cH/2})`}>AMD</text>
          </svg>
        )}
      </div>

      {/* ABC/XYZ */}
      <div style={{ background:G.white, border:`1px solid ${G.border}`, borderRadius:14, padding:24, marginBottom:20, position:"relative" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
          <h3 style={{ fontFamily:G.font, fontSize:17 }}>{tl("ABC Analysis")}</h3>
          <div style={{ display:"flex", gap:10 }}>
            {[["A","#00b894"],["B","#fdcb6e"],["C","#d63031"]].map(([cat,col])=>(
              <span key={cat} style={{ fontSize:12, display:"flex", alignItems:"center", gap:4 }}>
                <span style={{ width:10, height:10, borderRadius:"50%", background:col, display:"inline-block" }}/>
                {cat}
              </span>
            ))}
            <span style={{ fontSize:12, color:G.muted }}>· X(stable) Y(variable) Z(erratic)</span>
          </div>
        </div>
        {loading?<Spinner/>:!items.length?(
          <div style={{padding:60,textAlign:"center",color:G.muted}}>{tl("No data yet.")}</div>
        ):(
          <div style={{position:"relative",display:"inline-block",width:"100%",maxWidth:SW}}>
            <svg width="100%" viewBox={`0 0 ${SW} ${SH}`} style={{display:"block"}}>
              <rect x={SPL} y={SPT} width={z05-SPL} height={ScH} fill="#f0fdf4" opacity={0.4}/>
              <rect x={z05} y={SPT} width={z1-z05} height={ScH} fill="#fefce8" opacity={0.4}/>
              <rect x={z1}  y={SPT} width={SPL+ScW-z1} height={ScH} fill="#fef2f2" opacity={0.4}/>
              <text x={SPL+5} y={SPT+14} fontSize={10} fill="#00b894" fontWeight="700">X</text>
              <text x={z05+5} y={SPT+14} fontSize={10} fill="#fdcb6e" fontWeight="700">Y</text>
              <text x={z1+5}  y={SPT+14} fontSize={10} fill="#d63031" fontWeight="700">Z</text>
              {[0,0.25,0.5,0.75,1].map(t=>{
                const y=SPT+ScH*(1-t);
                return <g key={t}>
                  <line x1={SPL} y1={y} x2={SPL+ScW} y2={y} stroke={G.border} strokeWidth={0.5}/>
                  <text x={SPL-5} y={y+4} textAnchor="end" fontSize={9} fill={G.muted}>{Math.round(maxRev*t/1000)}k</text>
                </g>;
              })}
              <line x1={z05} y1={SPT} x2={z05} y2={SPT+ScH} stroke={G.border} strokeDasharray="3,3" strokeWidth={1}/>
              <line x1={z1}  y1={SPT} x2={z1}  y2={SPT+ScH} stroke={G.border} strokeDasharray="3,3" strokeWidth={1}/>
              <line x1={SPL} y1={SPT} x2={SPL} y2={SPT+ScH} stroke={G.border}/>
              <line x1={SPL} y1={SPT+ScH} x2={SPL+ScW} y2={SPT+ScH} stroke={G.border}/>
              <text x={SPL+ScW/2} y={SH-5} textAnchor="middle" fontSize={10} fill={G.muted}>Coefficient of variation (volatility →)</text>
              <text x={14} y={SPT+ScH/2} textAnchor="middle" fontSize={10} fill={G.muted} transform={`rotate(-90,14,${SPT+ScH/2})`}>Revenue →</text>
              {items.map((it,i)=>(
                <circle key={i} cx={xPos(it.cv)} cy={yPos(it.revenue)} r={6}
                  fill={abcColor[it.abc]||G.muted} opacity={0.85} style={{cursor:"pointer"}}
                  onMouseEnter={e=>setTooltip({...it,px:xPos(it.cv),py:yPos(it.revenue)})}
                  onMouseLeave={()=>setTooltip(null)}/>
              ))}
            </svg>
            {tooltip&&(
              <div style={{position:"absolute",left:Math.min(tooltip.px+14,SW-170),top:Math.max(tooltip.py-40,0),
                background:G.white,border:`1px solid ${G.border}`,borderRadius:8,padding:"8px 12px",fontSize:12,
                boxShadow:"0 4px 14px rgba(0,0,0,0.12)",pointerEvents:"none",maxWidth:170,zIndex:10,lineHeight:1.6}}>
                <b style={{color:G.dark,display:"block",marginBottom:2}}>{tooltip.name}</b>
                <span style={{color:G.muted}}>Revenue: </span>{Math.round(tooltip.revenue).toLocaleString()} AMD<br/>
                <span style={{color:G.muted}}>Orders: </span>{tooltip.order_count}<br/>
                <span style={{color:G.muted}}>Class: </span>
                <span style={{fontWeight:700,color:abcColor[tooltip.abc]}}>{tooltip.abc}</span>
                <span style={{fontWeight:700,color:tooltip.xyz==='X'?"#00b894":tooltip.xyz==='Y'?"#fdcb6e":"#d63031"}}>{tooltip.xyz}</span>
                <span style={{color:G.muted}}> CV:{tooltip.cv}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ASSOCIATION RULES */}
      <div style={{ background:G.white, border:`1px solid ${G.border}`, borderRadius:14, padding:24 }}>
        <h3 style={{ fontFamily:G.font, fontSize:17, marginBottom:4 }}>{tl("Association Rules")}</h3>
        <p style={{ fontSize:13, color:G.muted, marginBottom:16 }}>Top 10 item pairs by confidence — bar width = confidence, colour = lift</p>
        {loading?<Spinner/>:!rules.length?(
          <div style={{padding:40,textAlign:"center",color:G.muted,fontSize:13}}>Not enough order data for association rules (need ≥5 orders with multiple items).</div>
        ):(
          <svg width="100%" viewBox={`0 0 ${RW} ${RPT+RPB+rules.length*34}`} style={{maxWidth:RW,display:"block",margin:"0 auto"}}>
            {rules.map((r,i)=>{
              const y=RPT+i*34;
              const confW=r.confidence*RcW;
              const liftCol=r.lift>1.5?"#00b894":r.lift>1?"#fdcb6e":"#d63031";
              const label=`${r.antecedent.slice(0,20)} → ${r.consequent.slice(0,16)}`;
              return <g key={i}>
                <text x={RPL-6} y={y+16} textAnchor="end" fontSize={11} fill={G.dark}>{label}</text>
                <rect x={RPL} y={y+4} width={RcW} height={20} fill={G.sand} rx={4}/>
                <rect x={RPL} y={y+4} width={confW} height={20} fill={G.caramel} rx={4} opacity={0.85}/>
                <text x={RPL+confW+6} y={y+18} fontSize={10} fill={G.muted}>
                  {`conf ${Math.round(r.confidence*100)}%`}
                </text>
                <text x={RPL+confW+68} y={y+18} fontSize={10} fill={liftCol} fontWeight="700">
                  {`lift ${r.lift.toFixed(1)}×`}
                </text>
              </g>;
            })}
          </svg>
        )}
      </div>
    </Page>
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

// ─── RESET PASSWORD PAGE ──────────────────────────────────────────────────────
function ResetPage({ token, setPage, toast, onLogin }) {
  const [pw, setPw]           = useState("");
  const [pw2, setPw2]         = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);

  const submit = async () => {
    if (pw.trim().length < 6) { toast("Password must be at least 6 characters", "error"); return; }
    if (pw !== pw2) { toast("Passwords do not match", "error"); return; }
    setLoading(true);
    try {
      await api.reset(token, pw.trim());
      setDone(true);
    } catch(e) { toast(e.message, "error"); }
    finally { setLoading(false); }
  };

  if (done) return (
    <AuthLayout>
      <div style={{ textAlign:"center", padding:"24px 0" }}>
        <div style={{ fontSize:40, marginBottom:16 }}>✅</div>
        <h2 style={{ fontFamily:G.font, fontSize:22, marginBottom:12 }}>Password updated</h2>
        <p style={{ color:G.muted, marginBottom:24, lineHeight:1.6 }}>Your password has been changed. You can now log in with your new password.</p>
        <Btn onClick={()=>{ window.location.hash=""; setPage("login"); }}>Go to login</Btn>
      </div>
    </AuthLayout>
  );

  return (
    <AuthLayout>
      <h2 style={{ fontFamily:G.font, fontSize:22, marginBottom:8 }}>Set new password</h2>
      <p style={{ color:G.muted, fontSize:14, marginBottom:24, lineHeight:1.6 }}>Enter a new password for your account.</p>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        <Input label="New password" type="password" value={pw}  onChange={setPw}  placeholder="••••••••" />
        <Input label="Confirm password" type="password" value={pw2} onChange={setPw2} placeholder="••••••••" />
        <Btn size="lg" onClick={submit} loading={loading}>Set password</Btn>
        <button onClick={()=>{ window.location.hash=""; setPage("login"); }}
          style={{ background:"none", border:"none", color:G.muted, cursor:"pointer", fontSize:13, textAlign:"center" }}>
          ← Back to login
        </button>
      </div>
    </AuthLayout>
  );
}

// ─── VERIFY PAGE ──────────────────────────────────────────────────────────────
function VerifyPage({ token, setPage, toast, onLogin }) {
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [msg, setMsg]       = useState("");

  useEffect(()=>{
    api.verify(token)
      .then(({ token: jwt, user }) => {
        localStorage.setItem("token", jwt);
        setStatus("success");
        setTimeout(()=>{ window.location.hash=""; onLogin(user); }, 1500);
      })
      .catch(e => { setStatus("error"); setMsg(e.message); });
  }, [token]);

  return (
    <AuthLayout>
      <div style={{ textAlign:"center", padding:"32px 0" }}>
        {status==="loading" && <><Spinner/><p style={{color:G.muted,marginTop:16}}>Verifying your email…</p></>}
        {status==="success" && <>
          <div style={{ fontSize:44, marginBottom:12 }}>🎉</div>
          <h2 style={{ fontFamily:G.font, fontSize:22, marginBottom:8 }}>Email confirmed!</h2>
          <p style={{ color:G.muted }}>Logging you in…</p>
        </>}
        {status==="error" && <>
          <div style={{ fontSize:44, marginBottom:12 }}>⚠️</div>
          <h2 style={{ fontFamily:G.font, fontSize:22, marginBottom:12 }}>Link expired or invalid</h2>
          <p style={{ color:G.muted, marginBottom:24 }}>{msg || "This verification link has expired. Please register again."}</p>
          <Btn onClick={()=>{ window.location.hash=""; setPage("signup"); }}>Register again</Btn>
        </>}
      </div>
    </AuthLayout>
  );
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const ROLE_PALETTE = ['#7c3aed','#0891b2','#059669','#dc2626','#d97706','#db2777','#2563eb','#65a30d'];
const DEP_TYPES = [
  { value:'FS', label:'Finish-to-Start (FS)' },
  { value:'SS', label:'Start-to-Start (SS)' },
  { value:'FF', label:'Finish-to-Finish (FF)' },
  { value:'SF', label:'Start-to-Finish (SF)' },
];
const DUR_UNITS = ['seconds','minutes','hours'];

// ─── SKILL COMBO ──────────────────────────────────────────────────────────────
function SkillCombo({ allSkills, selected, excluded=[], onChange, onCreateSkill, onClickPill, pillColor }) {
  const [input, setInput] = useState("");
  const [open, setOpen]   = useState(false);
  const ref = useRef(null);

  // Filter: not already selected, not in excluded list, matches input
  const available = allSkills.filter(s =>
    !selected.find(x=>(x.skid||x.rid)===s.skid) &&
    !excluded.find(x=>x===s.skid) &&
    s.name.toLowerCase().includes(input.toLowerCase())
  );
  const canCreate = onCreateSkill && input.trim() &&
    !allSkills.find(s=>s.name.toLowerCase()===input.trim().toLowerCase());

  const add    = s => { onChange([...selected, s]); setInput(""); setOpen(false); };
  const remove = id => onChange(selected.filter(s=>(s.skid||s.rid)!==id));

  const handleKey = async e => {
    if (e.key==="Backspace" && !input && selected.length) {
      const last = selected[selected.length-1]; remove(last.skid||last.rid);
    }
    if (e.key==="Enter" && input.trim()) {
      e.preventDefault();
      if (canCreate) { const n=await onCreateSkill(input.trim()); if(n) add(n); }
      else if (available.length) add(available[0]);
    }
    if (e.key==="Escape") setOpen(false);
  };

  const getColor = s => pillColor || s.color || G.caramel;

  return (
    <div style={{ position:"relative" }} ref={ref}>
      <div onClick={()=>{ setOpen(true); ref.current.querySelector("input")?.focus(); }}
        style={{ display:"flex", flexWrap:"wrap", gap:6, padding:"8px 10px", borderRadius:8, border:`1px solid ${G.border}`, minHeight:40, cursor:"text", background:G.white }}>
        {selected.map(s=>{
          const id = s.skid||s.rid;
          const col = getColor(s);
          return (
            <span key={id} style={{ display:"flex", alignItems:"center", gap:4, background:`${col}18`, border:`1px solid ${col}40`, borderRadius:20, padding:"3px 10px", fontSize:12, fontWeight:500, color:col }}>
              {onClickPill ? (
                <button onClick={e=>{ e.stopPropagation(); onClickPill(s); }}
                  style={{ background:"none", border:"none", cursor:"pointer", color:col, fontSize:12, fontWeight:600, padding:0, textDecoration:"underline dotted" }}>
                  {s.name}
                </button>
              ) : s.name}
              <button onClick={e=>{ e.stopPropagation(); remove(id); }} style={{ background:"none", border:"none", cursor:"pointer", color:col, fontSize:13, lineHeight:1, padding:0, opacity:0.7 }}>×</button>
            </span>
          );
        })}
        <input value={input} onChange={e=>{ setInput(e.target.value); setOpen(true); }}
          onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),150)}
          onKeyDown={handleKey}
          placeholder={selected.length?"":"Type to search or add…"}
          style={{ border:"none", outline:"none", fontSize:13, fontFamily:G.mono, minWidth:140, flex:1, background:"transparent" }}/>
      </div>
      {open&&(available.length>0||canCreate)&&(
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:G.white, border:`1px solid ${G.border}`, borderRadius:8, boxShadow:"0 4px 16px rgba(44,24,16,0.12)", zIndex:500, maxHeight:220, overflowY:"auto" }}>
          {canCreate&&(
            <button onMouseDown={async()=>{ if(onCreateSkill){const s=await onCreateSkill(input.trim()); if(s)add(s);} }}
              style={{ width:"100%", textAlign:"left", padding:"9px 14px", background:"none", border:"none", cursor:"pointer", fontSize:13, fontFamily:G.mono, color:G.caramel, fontWeight:600, borderBottom:`1px solid ${G.border}` }}>
              + Add "{input.trim()}"
            </button>
          )}
          {available.map(s=>(
            <button key={s.skid||s.rid} onMouseDown={()=>add(s)}
              style={{ width:"100%", textAlign:"left", padding:"9px 14px", background:"none", border:"none", cursor:"pointer", fontSize:13, fontFamily:G.mono, color:G.dark, display:"block" }}
              onMouseEnter={e=>e.currentTarget.style.background=G.sand}
              onMouseLeave={e=>e.currentTarget.style.background="none"}>
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SKILL EDIT DIALOG ────────────────────────────────────────────────────────
function SkillEditDialog({ skill, allSkills, onSave, onClose }) {
  const [form, setForm] = useState({
    name: skill.name,
    duration: skill.duration||"",
    duration_unit: skill.duration_unit||"minutes",
    dep_type: skill.dep_type||"",
    dep_skid: skill.dep_skid||"",
  });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.updateSkill(skill.skid, {
        name: form.name.trim(),
        duration: form.duration ? Number(form.duration) : null,
        duration_unit: form.duration_unit,
        dep_type: form.dep_type||null,
        dep_skid: form.dep_skid ? Number(form.dep_skid) : null,
      });
      onSave(updated);
    } catch(e){ alert(e.message); } finally{ setSaving(false); }
  };

  const otherSkills = allSkills.filter(s=>s.skid!==skill.skid);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(44,24,16,0.45)", zIndex:1100, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:G.white, borderRadius:16, padding:28, maxWidth:440, width:"90%", boxShadow:"0 20px 60px rgba(44,24,16,0.2)", animation:"fadeIn 0.2s ease" }}>
        <h3 style={{ fontFamily:G.font, fontSize:18, marginBottom:18 }}>Edit skill: {skill.name}</h3>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <Input label="Name" value={form.name} onChange={v=>set("name",v)} required />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Input label="Duration" type="number" value={String(form.duration)} onChange={v=>set("duration",v)} placeholder="e.g. 30" />
            <div>
              <label style={{fontSize:13,fontWeight:600,color:G.dark,display:"block",marginBottom:5}}>Unit</label>
              <select value={form.duration_unit} onChange={e=>set("duration_unit",e.target.value)}
                style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${G.border}`,fontSize:14,fontFamily:G.mono,outline:"none"}}>
                {DUR_UNITS.map(u=><option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div style={{ borderTop:`1px solid ${G.border}`, paddingTop:12 }}>
            <p style={{fontSize:13,fontWeight:600,color:G.dark,marginBottom:8}}>Dependency</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div>
                <label style={{fontSize:12,color:G.muted,display:"block",marginBottom:4}}>Type</label>
                <select value={form.dep_type} onChange={e=>set("dep_type",e.target.value)}
                  style={{width:"100%",padding:"8px 10px",borderRadius:8,border:`1px solid ${G.border}`,fontSize:13,fontFamily:G.mono,outline:"none"}}>
                  <option value="">None</option>
                  {DEP_TYPES.map(d=><option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:12,color:G.muted,display:"block",marginBottom:4}}>Depends on</label>
                <select value={form.dep_skid} onChange={e=>set("dep_skid",e.target.value)}
                  disabled={!form.dep_type}
                  style={{width:"100%",padding:"8px 10px",borderRadius:8,border:`1px solid ${G.border}`,fontSize:13,fontFamily:G.mono,outline:"none",background:!form.dep_type?G.sand:G.white}}>
                  <option value="">Select skill…</option>
                  {otherSkills.map(s=><option key={s.skid} value={s.skid}>{s.name}</option>)}
                </select>
              </div>
            </div>
            {form.dep_type&&(
              <p style={{fontSize:11,color:G.muted,marginTop:6}}>{DEP_TYPES.find(d=>d.value===form.dep_type)?.label}</p>
            )}
          </div>
        </div>
        <div style={{display:"flex",gap:10,marginTop:20}}>
          <Btn size="sm" onClick={save} loading={saving}>Save</Btn>
          <Btn variant="ghost" size="sm" onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── ROLE EDIT DIALOG ─────────────────────────────────────────────────────────
function RoleEditDialog({ role, allSkills, onSave, onClose, createSkill }) {
  const [name, setName]       = useState(role.name);
  const [selSkills, setSelSkills] = useState(role.skills||[]);
  const [saving, setSaving]   = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.updateRole(role.rid, { name:name.trim(), skill_ids: selSkills.map(s=>s.skid) });
      onSave(updated);
    } catch(e){ alert(e.message); } finally{ setSaving(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(44,24,16,0.45)", zIndex:1100, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:G.white, borderRadius:16, padding:28, maxWidth:480, width:"90%", boxShadow:"0 20px 60px rgba(44,24,16,0.2)", animation:"fadeIn 0.2s ease" }}>
        <h3 style={{ fontFamily:G.font, fontSize:18, marginBottom:18 }}>Edit role</h3>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <Input label="Role name" value={name} onChange={setName} required />
          <div>
            <label style={{fontSize:13,fontWeight:600,color:G.dark,display:"block",marginBottom:6}}>Skills</label>
            <SkillCombo allSkills={allSkills} selected={selSkills} onChange={setSelSkills} onCreateSkill={createSkill} pillColor={role.color}/>
          </div>
        </div>
        <div style={{display:"flex",gap:10,marginTop:20}}>
          <Btn size="sm" onClick={save} loading={saving}>Save</Btn>
          <Btn variant="ghost" size="sm" onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── STAFF PAGE ────────────────────────────────────────────────────────────────
function StaffPage({ user, toast }) {
  const [employees, setEmployees] = useState([]);
  const [roles,     setRoles]     = useState([]);
  const [skills,    setSkills]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState([]);
  const [editEmp,   setEditEmp]   = useState(null);
  const [showNew,   setShowNew]   = useState(false);
  const [showRoles, setShowRoles] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [editSkill, setEditSkill] = useState(null);
  const [editRole,  setEditRole]  = useState(null);

  const load = useCallback(async()=>{
    setLoading(true);
    try {
      const [e,r,s] = await Promise.all([api.getStaff(), api.getRoles(), api.getSkills()]);
      setEmployees(e||[]); setRoles(r||[]); setSkills(s||[]);
    } catch(e){ toast(e.message,"error"); }
    finally{ setLoading(false); }
  },[]);
  useEffect(()=>{ load(); },[]);

  const toggleSel = uid => setSelected(p=>p.includes(uid)?p.filter(x=>x!==uid):[...p,uid]);

  const doDelete = async () => {
    if (!window.confirm(`Delete ${selected.length} employee(s)?`)) return;
    try { await api.deleteEmployees(selected); setEmployees(p=>p.filter(e=>!selected.includes(e.uid))); setSelected([]); toast("Deleted"); }
    catch(e){ toast(e.message,"error"); }
  };

  const createSkill = async name => {
    try { const s = await api.createSkill({name}); setSkills(p=>[...p,s].sort((a,b)=>a.name.localeCompare(b.name))); return s; }
    catch(e){ toast(e.message,"error"); return null; }
  };

  // Employee form state
  const emptyForm = {first_name:"",last_name:"",email:"",phone:"",street_address:"",city:"",zip:"",is_employee:false};
  const [form, setForm]       = useState(emptyForm);
  const [formRoles,  setFormRoles]  = useState([]);
  const [formSkills, setFormSkills] = useState([]);
  const [linkedUser, setLinkedUser] = useState(null);
  const [lookingUp,  setLookingUp]  = useState(false);

  // Skills that come from selected roles (excluded from manual Skills combo)
  const roleSkillIds = formRoles.flatMap(r => {
    const fullRole = roles.find(x=>x.rid===r.rid);
    return (fullRole?.skills||[]).map(s=>s.skid);
  });
  // Auto-merge role skills into formSkills when roles change
  const handleRolesChange = newRoles => {
    setFormRoles(newRoles);
    const addedRids = newRoles.map(r=>r.rid);
    const removedRids = formRoles.filter(r=>!addedRids.includes(r.rid)).map(r=>r.rid);
    const toAdd = newRoles.flatMap(r => {
      const fullRole = roles.find(x=>x.rid===r.rid);
      return (fullRole?.skills||[]).filter(s=>!formSkills.find(x=>x.skid===s.skid));
    });
    const remainingRoleSkillIds = newRoles.flatMap(r=>(roles.find(x=>x.rid===r.rid)?.skills||[]).map(s=>s.skid));
    const removedRoleSkillIds = removedRids.flatMap(rid=>(roles.find(x=>x.rid===rid)?.skills||[]).map(s=>s.skid))
      .filter(skid=>!remainingRoleSkillIds.includes(skid));
    setFormSkills(p => [...p.filter(s=>!removedRoleSkillIds.includes(s.skid)), ...toAdd]);
  };

  // Fetch and link an existing Tanelu user by email
  const linkByEmail = async (email) => {
    if (!email?.trim()) return null;
    setLookingUp(true);
    try {
      const found = await api.lookupUserByEmail(email.trim());
      if (found) {
        setLinkedUser(found);
        setForm(p=>({...p,
          first_name:   found.first_name,
          last_name:    found.last_name,
          email:        found.email,
          phone:        found.phone||"",
          street_address: found.street_address||"",
          city:         found.city||"",
          zip:          found.zip||"",
          is_employee:  true,
        }));
        return found;
      }
      return null;
    } catch(e){ return null; }
    finally{ setLookingUp(false); }
  };

  const handleIsEmployeeToggle = async checked => {
    if (!checked) {
      // Uncheck — clear link, re-enable fields
      setLinkedUser(null);
      setForm(p=>({...p, is_employee:false}));
      return;
    }
    // Check — attempt lookup immediately if email is filled
    setForm(p=>({...p, is_employee:true}));
    const found = await linkByEmail(form.email);
    if (!found && form.email.trim()) {
      toast("No existing account found for this email — a new employee record will be created.", "info");
    }
  };

  const handleEmailBlur = async () => {
    // On email blur: if checkbox is already checked and not yet linked, look up
    if (!form.is_employee || !form.email.trim() || linkedUser) return;
    await linkByEmail(form.email);
  };

  const openEdit = emp => {
    setEditEmp(emp); setLinkedUser(null);
    setForm({first_name:emp.first_name,last_name:emp.last_name,email:emp.email||"",phone:emp.phone||"",street_address:emp.street_address||"",city:emp.city||"",zip:emp.zip||"",is_employee:emp.is_employee||false});
    setFormRoles(roles.filter(r=>emp.roles?.includes(r.name)));
    setFormSkills(skills.filter(s=>emp.skills?.includes(s.name)));
    setShowNew(false);
  };

  const openNew = () => {
    setEditEmp(null); setLinkedUser(null); setForm(emptyForm); setFormRoles([]); setFormSkills([]); setShowNew(true);
  };

  const saveEmployee = async () => {
    if (!form.first_name.trim()||!form.last_name.trim()) { toast("First and last name required","error"); return; }
    setSaving(true);
    try {
      const payload = { ...form, role_ids: formRoles.map(r=>r.rid), skill_ids: formSkills.map(s=>s.skid) };
      if (editEmp) {
        const u = await api.updateEmployee(editEmp.uid, payload);
        setEmployees(p=>p.map(e=>e.uid===u.uid?{...e,first_name:u.first_name,last_name:u.last_name,email:u.email,roles:u.roles?.map(r=>r.name)||[],skills:u.skills?.map(s=>s.name)||[]}:e));
        toast(`${u.first_name} ${u.last_name} saved`);
      } else {
        const c = await api.createEmployee(payload);
        setEmployees(p=>[...p,{...c,roles:c.roles?.map(r=>r.name)||[],skills:c.skills?.map(s=>s.name)||[]}].sort((a,b)=>a.first_name.localeCompare(b.first_name)));
        toast(`${c.first_name} ${c.last_name} added`);
      }
      setEditEmp(null); setShowNew(false);
    } catch(e){ toast(e.message,"error"); } finally{ setSaving(false); }
  };

  // Find role color for a role name
  const roleColor = name => roles.find(r=>r.name===name)?.color || G.caramel;
  // Find skill color
  const skillColor = name => skills.find(s=>s.name===name)?.color || G.muted;

  if (showRoster) return <RosterPage user={user} toast={toast} onBack={()=>setShowRoster(false)} />;
  if (showRoles)  return <RolesPage roles={roles} skills={skills} setRoles={setRoles} setSkills={setSkills} createSkill={createSkill} toast={toast} onBack={()=>setShowRoles(false)} />;

  return (
    <Page title="Staff" actions={
      <div style={{display:"flex",gap:10}}>
        {selected.length>0&&<Btn variant="danger" size="sm" onClick={doDelete}>Delete ({selected.length})</Btn>}
        <Btn variant="secondary" size="sm" onClick={()=>setShowRoster(true)}>Roster →</Btn>
        <Btn variant="secondary" size="sm" onClick={()=>setShowRoles(true)}>Roles & Skills →</Btn>
        <Btn size="sm" onClick={openNew}>+ Employee</Btn>
      </div>
    }>
      {/* Form */}
      {(showNew||editEmp)&&(
        <div style={{ background:G.white, border:`1px solid ${G.border}`, borderRadius:14, padding:24, marginBottom:20, animation:"fadeIn 0.2s ease" }}>
          <h3 style={{ fontFamily:G.font, fontSize:17, marginBottom:16 }}>{editEmp?`${editEmp.first_name} ${editEmp.last_name}`:"New employee"}</h3>
          {linkedUser&&(
            <div style={{ background:"#f0fdf4", border:"1px solid #86efac", borderRadius:8, padding:"10px 14px", marginBottom:14, fontSize:13, color:"#166534", display:"flex", alignItems:"center", gap:8 }}>
              <span>✓</span>
              <span>Linked to <strong>{linkedUser.first_name} {linkedUser.last_name}</strong> — personal fields are read-only. Uncheck "Has Tanelu account" to enter a different person.</span>
            </div>
          )}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            <Input label="First name" value={form.first_name} onChange={v=>setForm(p=>({...p,first_name:v}))} required disabled={!!linkedUser}/>
            <Input label="Last name"  value={form.last_name}  onChange={v=>setForm(p=>({...p,last_name:v}))}  required disabled={!!linkedUser}/>
            <div>
              <Input label="Email" value={form.email} onChange={v=>setForm(p=>({...p,email:v}))} type="email" onBlur={handleEmailBlur} disabled={!!linkedUser}/>
              {lookingUp&&<span style={{fontSize:11,color:G.muted}}>Looking up…</span>}
            </div>
            <Input label="Phone" value={form.phone} onChange={v=>setForm(p=>({...p,phone:v}))} disabled={!!linkedUser}/>
            <Input label="Street address" value={form.street_address} onChange={v=>setForm(p=>({...p,street_address:v}))} disabled={!!linkedUser}/>
            <Input label="City" value={form.city} onChange={v=>setForm(p=>({...p,city:v}))} disabled={!!linkedUser}/>
            <Input label="ZIP"  value={form.zip}  onChange={v=>setForm(p=>({...p,zip:v}))}  disabled={!!linkedUser}/>
            <div style={{display:"flex",alignItems:"center",gap:10,paddingTop:28}}>
              <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:14}}>
                <input type="checkbox" checked={!!form.is_employee} onChange={e=>handleIsEmployeeToggle(e.target.checked)} style={{accentColor:G.caramel}}/>
                Has Tanelu account
              </label>
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{fontSize:13,fontWeight:600,color:G.dark,display:"block",marginBottom:6}}>Roles</label>
            <SkillCombo
              allSkills={roles.map(r=>({...r,skid:r.rid}))}
              selected={formRoles.map(r=>({...r,skid:r.rid}))}
              onChange={sel=>handleRolesChange(sel.map(s=>({...s,rid:s.rid||s.skid})))}
              onClickPill={r=>setEditRole(roles.find(x=>x.rid===(r.rid||r.skid)))}
              pillColor={null}
            />
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{fontSize:13,fontWeight:600,color:G.dark,display:"block",marginBottom:6}}>Skills</label>
            <SkillCombo
              allSkills={skills}
              selected={formSkills}
              excluded={roleSkillIds}
              onChange={setFormSkills}
              onCreateSkill={createSkill}
              onClickPill={s=>setEditSkill(s)}
            />
            {roleSkillIds.length>0&&<p style={{fontSize:11,color:G.muted,marginTop:4}}>Skills from assigned roles are shown automatically and excluded from manual selection.</p>}
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <Btn size="sm" onClick={saveEmployee} loading={saving}>Save</Btn>
            <Btn variant="ghost" size="sm" onClick={()=>{ setShowNew(false); setEditEmp(null); }}>Cancel</Btn>
          </div>
        </div>
      )}

      {/* Table */}
      {loading?<Spinner/>:(
        <div style={{ background:G.white, border:`1px solid ${G.border}`, borderRadius:14, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:G.sand, borderBottom:`1px solid ${G.border}` }}>
                <th style={{ width:40, padding:"10px 14px" }}></th>
                {["#","First name","Last name","Role(s)","Skill(s)"].map(h=>(
                  <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:G.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.length===0?(
                <tr><td colSpan={6} style={{padding:40,textAlign:"center",color:G.muted}}>No employees yet.</td></tr>
              ):employees.map((e,i)=>(
                <tr key={e.uid} style={{ borderBottom:i<employees.length-1?`1px solid ${G.border}`:"none", background:selected.includes(e.uid)?`${G.caramel}08`:"transparent" }}>
                  <td style={{padding:"10px 14px"}}><input type="checkbox" checked={selected.includes(e.uid)} onChange={()=>toggleSel(e.uid)} style={{accentColor:G.caramel}}/></td>
                  <td style={{padding:"10px 14px",fontSize:13,color:G.muted,fontFamily:G.mono}}>{e.employee_seq}</td>
                  <td style={{padding:"10px 14px"}}>
                    <button onClick={()=>openEdit(e)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:G.dark,fontWeight:600,padding:0,textDecoration:"underline dotted",textUnderlineOffset:3}}>{e.first_name}</button>
                  </td>
                  <td style={{padding:"10px 14px",fontSize:14}}>{e.last_name}</td>
                  <td style={{padding:"10px 14px"}}>
                    {(e.roles||[]).map(r=>{const c=roleColor(r);return(
                      <span key={r} onClick={()=>setEditRole(roles.find(x=>x.name===r))} style={{display:"inline-flex",alignItems:"center",gap:4,background:`${c}18`,border:`1px solid ${c}40`,borderRadius:20,padding:"2px 10px",fontSize:12,fontWeight:500,color:c,marginRight:4,marginBottom:2,cursor:"pointer"}}>{r}</span>
                    );})}
                  </td>
                  <td style={{padding:"10px 14px"}}>
                    {(e.skills||[]).map(s=>{const c=skillColor(s);return(
                      <span key={s} onClick={()=>setEditSkill(skills.find(x=>x.name===s))} style={{display:"inline-flex",alignItems:"center",gap:4,background:`${c}18`,border:`1px solid ${c}40`,borderRadius:20,padding:"2px 10px",fontSize:12,fontWeight:500,color:c,marginRight:4,marginBottom:2,cursor:"pointer"}}>{s}</span>
                    );})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editSkill&&<SkillEditDialog skill={editSkill} allSkills={skills}
        onSave={s=>{ setSkills(p=>p.map(x=>x.skid===s.skid?s:x)); setEditSkill(null); toast(`"${s.name}" saved`); }}
        onClose={()=>setEditSkill(null)} />}
      {editRole&&<RoleEditDialog role={editRole} allSkills={skills} createSkill={createSkill}
        onSave={r=>{ setRoles(p=>p.map(x=>x.rid===r.rid?r:x)); setEditRole(null); toast(`"${r.name}" saved`); }}
        onClose={()=>setEditRole(null)} />}
    </Page>
  );
}

// ─── ROLES PAGE ────────────────────────────────────────────────────────────────
function RolesPage({ roles, skills, setRoles, setSkills, createSkill, toast, onBack }) {
  const [selected,   setSelected]   = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [localRoles, setLocalRoles] = useState(roles.map(r=>({...r,_skills:r.skills||[],_name:r.name})));
  useEffect(()=>setLocalRoles(roles.map(r=>({...r,_skills:r.skills||[],_name:r.name}))),[roles]);

  const toggleSel = rid => setSelected(p=>p.includes(rid)?p.filter(x=>x!==rid):[...p,rid]);

  const addRole = async () => {
    const name = window.prompt("Role name:");
    if (!name?.trim()) return;
    try { const r = await api.createRole({name:name.trim(),skill_ids:[]}); setRoles(p=>[...p,r].sort((a,b)=>a.name.localeCompare(b.name))); }
    catch(e){ toast(e.message,"error"); }
  };

  const deleteSelected = async () => {
    if (!window.confirm(`Delete ${selected.length} role(s)?`)) return;
    try { await api.deleteRoles(selected); setRoles(p=>p.filter(r=>!selected.includes(r.rid))); setSelected([]); toast("Deleted"); }
    catch(e){ toast(e.message,"error"); }
  };

  const saveRole = async local => {
    setSaving(true);
    try {
      const updated = await api.updateRole(local.rid, { name:local._name, skill_ids:local._skills.map(s=>s.skid) });
      setRoles(p=>p.map(r=>r.rid===updated.rid?updated:r));
      toast(`"${updated.name}" saved`);
    } catch(e){ toast(e.message,"error"); } finally{ setSaving(false); }
  };

  const updateLocal = (rid,patch) => setLocalRoles(p=>p.map(r=>r.rid===rid?{...r,...patch}:r));

  return (
    <Page title="Roles & Skills" actions={
      <div style={{display:"flex",gap:10}}>
        {selected.length>0&&<Btn variant="danger" size="sm" onClick={deleteSelected}>Delete ({selected.length})</Btn>}
        <Btn variant="secondary" size="sm" onClick={addRole}>+ Role</Btn>
        <Btn variant="ghost" size="sm" onClick={onBack}>← Staff</Btn>
      </div>
    }>
      <div style={{ background:G.white, border:`1px solid ${G.border}`, borderRadius:14, overflow:"visible" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:G.sand, borderBottom:`1px solid ${G.border}` }}>
              <th style={{ width:40, padding:"10px 14px" }}></th>
              <th style={{ padding:"10px 14px", textAlign:"left", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:G.muted, width:"30%" }}>Role</th>
              <th style={{ padding:"10px 14px", textAlign:"left", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:G.muted }}>Skills</th>
              <th style={{ width:80 }}></th>
            </tr>
          </thead>
          <tbody>
            {localRoles.length===0?(
              <tr><td colSpan={4} style={{padding:40,textAlign:"center",color:G.muted}}>No roles yet. Click "+ Role".</td></tr>
            ):localRoles.map((r,i)=>(
              <tr key={r.rid} style={{ borderBottom:i<localRoles.length-1?`1px solid ${G.border}`:"none", verticalAlign:"top" }}>
                <td style={{padding:"12px 14px"}}><input type="checkbox" checked={selected.includes(r.rid)} onChange={()=>toggleSel(r.rid)} style={{accentColor:G.caramel}}/></td>
                <td style={{padding:"12px 14px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:r.color,flexShrink:0}}/>
                    <input value={r._name} onChange={e=>updateLocal(r.rid,{_name:e.target.value})}
                      onBlur={()=>r._name!==r.name&&saveRole(r)}
                      style={{border:"none",outline:"none",fontSize:14,fontFamily:G.mono,fontWeight:600,color:r.color,width:"100%",background:"transparent",borderBottom:`1px dashed ${G.border}`,paddingBottom:3}}/>
                  </div>
                </td>
                <td style={{padding:"12px 14px"}}>
                  <SkillCombo allSkills={skills} selected={r._skills} onChange={sel=>updateLocal(r.rid,{_skills:sel})} onCreateSkill={createSkill} pillColor={r.color}/>
                </td>
                <td style={{padding:"12px 14px"}}>
                  <Btn size="sm" onClick={()=>saveRole(r)} loading={saving}>Save</Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  );
}

// ─── PROCESSES PAGE (v12) ──────────────────────────────────────────────────────
function ProcessesPage({ toast }) {
  const [processes, setProcesses] = useState([]);
  const [skills,    setSkills]    = useState([]);
  const [roles,     setRoles]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editProc,  setEditProc]  = useState(null);
  const [formName,  setFormName]  = useState("");
  const [formSkills,setFormSkills]= useState([]);
  const [saving,    setSaving]    = useState(false);
  const [nameError, setNameError] = useState("");

  const load = useCallback(async()=>{
    setLoading(true);
    try {
      const [p,s,r] = await Promise.all([api.getProcesses(), api.getSkills(), api.getRoles()]);
      setProcesses(p||[]); setSkills(s||[]); setRoles(r||[]);
    } catch(e){ toast(e.message,"error"); } finally{ setLoading(false); }
  },[]);
  useEffect(()=>{ load(); },[]);

  const createSkill = async name => {
    try { const s=await api.createSkill({name}); setSkills(p=>[...p,s].sort((a,b)=>a.name.localeCompare(b.name))); return s; }
    catch(e){ toast(e.message,"error"); return null; }
  };

  const openNew = () => { setEditProc(null); setFormName(""); setFormSkills([]); setNameError(""); setShowForm(true); };
  const openEdit = proc => {
    setEditProc(proc); setFormName(proc.name);
    setFormSkills((proc.skills||[]).map(sk=>({
      skid:sk.skid, name:sk.name, color:sk.color,
      duration:sk.duration, duration_unit:sk.duration_unit||"minutes",
      dep_type:sk.dep_type||"", dep_seq:"",
      _procRef: sk._procRef||null, // if this row came from an expanded process
    })));
    setNameError(""); setShowForm(true);
  };

  // Expand a role/skill/process into form rows
  const addToForm = item => {
    if (item._isRole) {
      const fullRole = roles.find(r=>r.rid===item.rid);
      const roleSkills = (fullRole?.skills||[]).map(s=>({...s,duration:s.duration||null,duration_unit:s.duration_unit||"minutes",dep_type:"",dep_seq:""}));
      setFormSkills(p=>{ const ex=new Set(p.map(x=>x.skid)); return [...p,...roleSkills.filter(s=>!ex.has(s.skid))]; });
    } else if (item._isProcess) {
      // Expand a process into its skills, grouped together
      const fullProc = processes.find(pr=>pr.procid===item.procid);
      const procSkills = (fullProc?.skills||[]).map(s=>({
        skid:s.skid, name:s.name, color:s.color,
        duration:s.duration, duration_unit:s.duration_unit||"minutes",
        dep_type:s.dep_type||"", dep_seq:"",
        _procRef:fullProc.name,
      }));
      setFormSkills(p=>{
        const ex = new Set(p.map(x=>x.skid));
        return [...p, ...procSkills.filter(s=>!ex.has(s.skid))];
      });
    } else {
      setFormSkills(p=>p.find(x=>x.skid===item.skid)?p:[...p,{...item,duration:item.duration||null,duration_unit:item.duration_unit||"minutes",dep_type:"",dep_seq:""}]);
    }
  };

  const saveForm = async () => {
    const name = formName.trim();
    if (!name) { setNameError("Process name is required."); return; }
    const dupe = processes.find(p=>p.name.toLowerCase()===name.toLowerCase() && p.procid!==editProc?.procid);
    if (dupe) {
      setNameError("A process with the similar name already exists. Modify the name of the process that you are editing or cancel and edit the existing process.");
      return;
    }
    setNameError(""); setSaving(true);
    try {
      const skillPayload = formSkills.map((s,i)=>({
        skid:s.skid, seq:i+1,
        duration:s.duration||null, duration_unit:s.duration_unit||"minutes",
        dep_type:s.dep_type||null, dep_seq:s.dep_seq||null,
      }));
      if (editProc) {
        const updated = await api.updateProcess(editProc.procid, { name, skills: skillPayload });
        setProcesses(p=>p.map(x=>x.procid===updated.procid?updated:x).sort((a,b)=>a.name.localeCompare(b.name)));
        toast(`"${updated.name}" updated`);
      } else {
        const p = await api.createProcess({ name });
        const updated = await api.updateProcess(p.procid, { skills: skillPayload });
        setProcesses(prev=>[...prev,updated].sort((a,b)=>a.name.localeCompare(b.name)));
        toast(`"${updated.name}" created`);
      }
      setShowForm(false); setEditProc(null); setFormName(""); setFormSkills([]);
    } catch(e){ toast(e.message,"error"); } finally{ setSaving(false); }
  };

  const deleteProcess = async id => {
    if (!window.confirm("Delete this process?")) return;
    try { await api.deleteProcess(id); setProcesses(p=>p.filter(x=>x.procid!==id)); toast("Deleted"); }
    catch(e){ toast(e.message,"error"); }
  };

  const updateRow = (i,k,v) => setFormSkills(p=>p.map((s,j)=>j===i?{...s,[k]:v}:s));
  const moveRow = (i,dir) => {
    if ((dir<0&&i===0)||(dir>0&&i===formSkills.length-1)) return;
    const arr=[...formSkills]; [arr[i],arr[i+dir]]=[arr[i+dir],arr[i]]; setFormSkills(arr);
  };
  const removeRow = i => setFormSkills(p=>p.filter((_,j)=>j!==i));

  const toMins = (dur,unit) => {
    if (!dur) return 0;
    if (unit==="seconds") return Number(dur)/60;
    if (unit==="hours")   return Number(dur)*60;
    return Number(dur);
  };
  const totalMins = formSkills.reduce((s,sk)=>s+toMins(sk.duration,sk.duration_unit),0);

  // ── PERT Chart with multi-track layout ─────────────────────────────────────
  // Layout rules:
  //   FS → successor on SAME track, placed after predecessor (sequential)
  //   SS → successor on NEW sub-track, x-aligned with predecessor's LEFT edge
  //   FF → successor on NEW sub-track, x-aligned so its RIGHT edge matches predecessor's RIGHT edge
  //   SF → successor on NEW sub-track, x-aligned so its RIGHT edge matches predecessor's LEFT edge

  const PertChart = () => {
    const barH=38, subGap=6, procGap=22;
    const labelW=185, W=940, chartW=W-labelW-16;
    const dayMins=600;
    const minToX = m => Math.max(0,(m/dayMins)*chartW);

    if (!processes.length) return (
      <div style={{padding:60,textAlign:"center",color:G.muted,fontFamily:G.mono,fontSize:14}}>
        No processes yet. Click "+ Process" to create one.
      </div>
    );

    // ── Layout engine ─────────────────────────────────────────────────────────
    // For each process, assign each skill to a (track, x1, x2).
    // Track 0 = main row. SS/FF/SF successors get a new track.
    const processLayouts = processes.map(proc => {
      const skills = proc.skills || [];
      // psid → { track, x1, x2, w }
      const placed = {};
      // track → current right edge (for FS chaining)
      const trackCursor = { 0: labelW };
      let maxTrack = 0;

      skills.forEach(sk => {
        const w = Math.max(12, minToX(toMins(sk.duration, sk.duration_unit)));
        const dep = sk.dep_type;
        const predPsid = sk.dep_psid;

        if (!dep || dep === "FS" || !predPsid || !placed[predPsid]) {
          // FS or no dep: place on track 0, after current cursor
          const x1 = trackCursor[0] || labelW;
          placed[sk.psid] = { track:0, x1, x2:x1+w, w };
          trackCursor[0] = x1+w;
        } else {
          const pred = placed[predPsid];
          // Assign a new track
          const track = maxTrack + 1;
          maxTrack = track;
          trackCursor[track] = trackCursor[track] || labelW;
          let x1;
          if (dep === "SS") x1 = pred.x1;           // align left edges
          if (dep === "FF") x1 = pred.x2 - w;       // align right edges
          if (dep === "SF") x1 = pred.x1 - w;       // successor ends where pred starts
          // Ensure x1 doesn't go left of labelW
          x1 = Math.max(labelW, x1);
          placed[sk.psid] = { track, x1, x2:x1+w, w };
          trackCursor[track] = Math.max(trackCursor[track]||0, x1+w);
        }
      });

      return { proc, skills, placed, maxTrack };
    });

    // ── Assign y positions ────────────────────────────────────────────────────
    // Each process occupies (maxTrack+1) sub-rows
    let curY = 30;
    const processY = {}; // procid → base y
    const trackH = barH + subGap;
    processLayouts.forEach(({ proc, maxTrack }) => {
      processY[proc.procid] = curY;
      curY += (maxTrack + 1) * trackH + procGap;
    });
    const svgH = curY + 40;

    // ── Build blockMap for arrow drawing ─────────────────────────────────────
    const blockMap = {};
    processLayouts.forEach(({ proc, placed }) => {
      const baseY = processY[proc.procid];
      Object.entries(placed).forEach(([psid, b]) => {
        blockMap[psid] = {
          x1: b.x1, x2: b.x2, w: b.w,
          y: baseY + b.track * trackH,
          barH,
        };
      });
    });

    // ── Build arrows ──────────────────────────────────────────────────────────
    const arrows = [];
    processes.forEach(proc => {
      (proc.skills||[]).forEach(sk => {
        if (!sk.dep_type || !sk.dep_psid) return;
        const src = blockMap[sk.dep_psid];
        const tgt = blockMap[sk.psid];
        if (!src || !tgt) return;
        const dep = sk.dep_type;

        // Anchor points based on dep type
        let x1,y1,x2,y2;
        if (dep==="FS"){ x1=src.x2; y1=src.y+barH/2; x2=tgt.x1; y2=tgt.y+barH/2; }
        else if (dep==="SS"){ x1=src.x1; y1=src.y+barH; x2=tgt.x1; y2=tgt.y; }
        else if (dep==="FF"){ x1=src.x2; y1=src.y+barH; x2=tgt.x2; y2=tgt.y; }
        else if (dep==="SF"){ x1=src.x1; y1=src.y+barH; x2=tgt.x2; y2=tgt.y; }
        else { x1=src.x2; y1=src.y+barH/2; x2=tgt.x1; y2=tgt.y+barH/2; }

        // For FS same row: horizontal. For others: vertical drop
        let d;
        if (dep==="FS") {
          d = `M${x1},${y1} L${x2},${y2}`;
        } else {
          // Short vertical line from bottom of pred to top of succ, with small bends
          const midY = (y1+y2)/2;
          d = `M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`;
        }
        arrows.push({ d, dep, lx:(x1+x2)/2+8, ly:(y1+y2)/2 });
      });
    });

    const hours = Array.from({length:11},(_,i)=>i*60);

    return (
      <div style={{ overflowX:"auto", marginBottom:24, background:G.white, border:`1px solid ${G.border}`, borderRadius:14, padding:16 }}>
        <svg width={W} height={svgH} style={{display:"block"}}>
          <defs>
            <marker id="arr-tip" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <polygon points="0 0, 7 3.5, 0 7" fill="#666"/>
            </marker>
          </defs>

          {/* Hour grid */}
          {hours.map(m=>(
            <g key={m}>
              <line x1={labelW+minToX(m)} y1={18} x2={labelW+minToX(m)} y2={svgH-40} stroke={G.border} strokeWidth={0.8}/>
              <text x={labelW+minToX(m)+3} y={13} fontSize={9} fill={G.muted}>{`${8+m/60}:00`}</text>
            </g>
          ))}

          {/* Process bars */}
          {processLayouts.map(({ proc, placed }) => {
            const baseY = processY[proc.procid];
            return (
              <g key={proc.procid}>
                {/* Process label — vertically centred across all its tracks */}
                <text x={labelW-8} y={baseY + barH/2 + 4}
                  fontSize={12} fontWeight="700" fill={G.dark} textAnchor="end" dominantBaseline="middle"
                  style={{cursor:"pointer"}} onClick={()=>openEdit(proc)}>
                  {proc.name.slice(0,22)}
                </text>
                {/* Skill blocks */}
                {(proc.skills||[]).map(sk => {
                  const b = placed[sk.psid];
                  if (!b) return null;
                  const bx = b.x1, by = baseY + b.track*trackH;
                  const color = sk.color || G.muted;
                  const dashed = sk.dep_type && sk.dep_type !== "FS";
                  return (
                    <g key={sk.psid}>
                      <rect x={bx} y={by} width={b.w} height={barH}
                        fill={`${color}22`} stroke={color} strokeWidth={1.5}
                        strokeDasharray={dashed?"6,3":"none"} rx={5}/>
                      {b.w>24&&<text x={bx+5} y={by+15} fontSize={10} fill={color} fontWeight="600">{sk.name.slice(0,Math.floor(b.w/6.5))}</text>}
                      {b.w>36&&sk.duration&&<text x={bx+5} y={by+30} fontSize={8.5} fill={G.muted}>{sk.duration}{(sk.duration_unit||"m")[0]}</text>}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Dependency arrows */}
          {arrows.map((a,i)=>(
            <g key={i}>
              <path d={a.d} fill="none" stroke="#666" strokeWidth="1.5"
                strokeDasharray={a.dep==="FS"?"none":"none"}
                markerEnd="url(#arr-tip)" strokeLinejoin="round"/>
              <text x={a.lx} y={a.ly+4} fontSize={8} fill="#666" textAnchor="start" fontWeight="700"
                style={{paintOrder:"stroke",stroke:G.white,strokeWidth:3}}>
                {a.dep}
              </text>
            </g>
          ))}
        </svg>

        {/* Legend — bottom */}
        <div style={{display:"flex",gap:20,flexWrap:"wrap",paddingTop:12,borderTop:`1px solid ${G.border}`,marginTop:4,fontSize:11,color:G.muted}}>
          {DEP_TYPES.map(dt=>(
            <span key={dt.value} style={{display:"flex",alignItems:"center",gap:6}}>
              <svg width="50" height="26">
                {/* predecessor */}
                <rect x="0" y="2" width="20" height="12" fill={`${G.caramel}25`} stroke={G.caramel} strokeWidth="1.5" rx="2"/>
                {/* successor */}
                {dt.value==="FS" && <rect x="24" y="2" width="20" height="12" fill={`${G.dark}15`} stroke={G.dark} strokeWidth="1.5" rx="2"/>}
                {dt.value==="SS" && <rect x="0"  y="14" width="20" height="12" fill={`${G.dark}15`} stroke={G.dark} strokeWidth="1.5" rx="2" strokeDasharray="4,2"/>}
                {dt.value==="FF" && <rect x="4"  y="14" width="20" height="12" fill={`${G.dark}15`} stroke={G.dark} strokeWidth="1.5" rx="2" strokeDasharray="4,2"/>}
                {dt.value==="SF" && <rect x="-4" y="14" width="16" height="12" fill={`${G.dark}15`} stroke={G.dark} strokeWidth="1.5" rx="2" strokeDasharray="4,2"/>}
                {/* Arrow */}
                {dt.value==="FS" && <line x1="20" y1="8" x2="24" y2="8" stroke="#666" strokeWidth="1.2" markerEnd="url(#arr-tip)"/>}
                {dt.value!=="FS" && <path d="M10,14 L10,18 L10,22" stroke="#666" strokeWidth="1.2" fill="none" markerEnd="url(#arr-tip)"/>}
              </svg>
              <span><b>{dt.value}</b> {dt.label.replace(/ \(.*\)/,"")}</span>
            </span>
          ))}
          <span style={{display:"flex",alignItems:"center",gap:6}}>
            <svg width="30" height="14"><rect x="1" y="1" width="28" height="12" fill="transparent" stroke={G.muted} strokeWidth="1.5" strokeDasharray="4,2" rx="2"/></svg>
            Dashed = parallel successor
          </span>
        </div>
      </div>
    );
  };

  // Items for combo: processes (bold) + skills only — no roles
  const allItems = [
    ...processes.filter(p=>p.procid!==editProc?.procid).map(p=>({
      skid:`proc-${p.procid}`, procid:p.procid, name:p.name, _isProcess:true,
    })),
    ...skills,
  ];

  return (
    <Page title="Processes" actions={<Btn size="sm" onClick={openNew}>+ Process</Btn>}>
      <PertChart/>

      {showForm&&(
        <div style={{ background:G.white, border:`1px solid ${G.border}`, borderRadius:14, padding:24, marginBottom:20, animation:"fadeIn 0.2s ease" }}>
          <div style={{marginBottom:18}}>
            <input value={formName} onChange={e=>{ setFormName(e.target.value); setNameError(""); }}
              placeholder={editProc?"Process name…":"New process name…"}
              style={{ border:"none", borderBottom:`2px solid ${nameError?G.red:G.caramel}`, outline:"none", fontSize:20, fontFamily:G.font, fontWeight:700, color:G.dark, width:"100%", paddingBottom:6, background:"transparent" }}/>
            {nameError&&<p style={{fontSize:12,color:G.red,marginTop:6,lineHeight:1.5}}>{nameError}</p>}
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{fontSize:13,fontWeight:600,color:G.dark,display:"block",marginBottom:6}}>Add processes / skills</label>
            {/* Custom combo showing processes in bold */}
            <SkillComboWithProcesses allItems={allItems} onAdd={addToForm} onCreateSkill={createSkill}/>
          </div>

          {formSkills.length>0&&(
            <div style={{ border:`1px solid ${G.border}`, borderRadius:10, overflow:"hidden", marginBottom:16 }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:G.sand }}>
                    {["#","Skill / Step","Duration","Dep. type","Depends on",""].map(h=>(
                      <th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:11,fontWeight:700,textTransform:"uppercase",color:G.muted,whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {formSkills.map((sk,i)=>(
                    <tr key={`${sk.skid}-${i}`} style={{ borderTop:`1px solid ${G.border}` }}>
                      <td style={{padding:"8px 12px",fontSize:13,color:G.muted,fontFamily:G.mono,fontWeight:700}}>{i+1}</td>
                      <td style={{padding:"8px 12px"}}>
                        <span style={{fontSize:13,fontWeight:600,color:sk.color||G.dark}}>{sk.name}</span>
                        {sk._procRef&&<span style={{fontSize:10,color:G.muted,marginLeft:6}}>from {sk._procRef}</span>}
                      </td>
                      <td style={{padding:"8px 12px"}}>
                        <div style={{display:"flex",gap:5,alignItems:"center"}}>
                          <input type="number" value={sk.duration||""} onChange={e=>updateRow(i,"duration",e.target.value)} placeholder="0"
                            style={{width:52,padding:"5px 7px",borderRadius:6,border:`1px solid ${G.border}`,fontSize:13,fontFamily:G.mono,outline:"none"}}/>
                          <select value={sk.duration_unit||"minutes"} onChange={e=>updateRow(i,"duration_unit",e.target.value)}
                            style={{padding:"5px 7px",borderRadius:6,border:`1px solid ${G.border}`,fontSize:12,fontFamily:G.mono,outline:"none"}}>
                            {DUR_UNITS.map(u=><option key={u}>{u}</option>)}
                          </select>
                        </div>
                      </td>
                      <td style={{padding:"8px 12px"}}>
                        <select value={sk.dep_type||""} onChange={e=>updateRow(i,"dep_type",e.target.value)}
                          style={{padding:"5px 7px",borderRadius:6,border:`1px solid ${G.border}`,fontSize:12,fontFamily:G.mono,outline:"none"}}>
                          <option value="">—</option>
                          {DEP_TYPES.map(d=><option key={d.value} value={d.value} title={d.label}>{d.value}</option>)}
                        </select>
                        {sk.dep_type&&<div style={{fontSize:9,color:G.muted,marginTop:2,maxWidth:90}}>{DEP_TYPES.find(d=>d.value===sk.dep_type)?.label}</div>}
                      </td>
                      <td style={{padding:"8px 12px"}}>
                        <select value={sk.dep_seq||""} onChange={e=>updateRow(i,"dep_seq",e.target.value)}
                          disabled={!sk.dep_type}
                          style={{padding:"5px 7px",borderRadius:6,border:`1px solid ${G.border}`,fontSize:12,fontFamily:G.mono,outline:"none",background:!sk.dep_type?G.sand:G.white,minWidth:100}}>
                          <option value="">Select…</option>
                          {formSkills.filter((_,j)=>j!==i).map(other=>{
                            const idx=formSkills.indexOf(other);
                            return <option key={`${other.skid}-${idx}`} value={idx+1}>{idx+1}. {other.name}</option>;
                          })}
                        </select>
                      </td>
                      <td style={{padding:"8px 12px"}}>
                        <div style={{display:"flex",gap:3}}>
                          <button onClick={()=>moveRow(i,-1)} disabled={i===0} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:G.muted,opacity:i===0?0.3:1,padding:"2px 3px"}}>↑</button>
                          <button onClick={()=>moveRow(i,1)} disabled={i===formSkills.length-1} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:G.muted,opacity:i===formSkills.length-1?0.3:1,padding:"2px 3px"}}>↓</button>
                          <button onClick={()=>removeRow(i)} style={{background:"none",border:"none",cursor:"pointer",color:G.red,fontSize:16,padding:"2px 3px"}}>×</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ borderTop:`2px solid ${G.border}`, background:G.sand }}>
                    <td colSpan={2} style={{padding:"8px 12px",fontSize:13,fontWeight:700}}>Total</td>
                    <td style={{padding:"8px 12px",fontSize:13,fontWeight:700,color:G.caramel}}>{totalMins.toFixed(1)} min</td>
                    <td colSpan={3}/>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div style={{display:"flex",gap:10}}>
            <Btn onClick={saveForm} loading={saving}>{editProc?"Update process":"Save process"}</Btn>
            <Btn variant="ghost" onClick={()=>{ setShowForm(false); setEditProc(null); setFormName(""); setFormSkills([]); setNameError(""); }}>Cancel</Btn>
          </div>
        </div>
      )}

      {/* Saved processes list */}
      {processes.map(proc=>(
        <div key={proc.procid} style={{ background:G.white, border:`1px solid ${G.border}`, borderRadius:12, padding:"14px 18px", marginBottom:10, display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div style={{flex:1,minWidth:0}}>
            <button onClick={()=>{ openEdit(proc); window.scrollTo({top:0,behavior:"smooth"}); }}
              style={{background:"none",border:"none",cursor:"pointer",fontWeight:700,fontSize:15,color:G.caramel,padding:0,textDecoration:"underline dotted",textUnderlineOffset:3,marginBottom:6,display:"block",textAlign:"left"}}>
              {proc.name}
            </button>
            <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
              {(proc.skills||[]).map(sk=>(
                <span key={sk.psid} style={{ fontSize:12, padding:"2px 10px", borderRadius:20, background:`${sk.color||G.muted}18`, color:sk.color||G.muted, border:`1px solid ${sk.color||G.muted}40`, display:"flex", alignItems:"center", gap:4 }}>
                  {sk.name}{sk.duration?` · ${sk.duration}${(sk.duration_unit||"m")[0]}`:""}
                  {sk.dep_type&&<span style={{fontSize:9,opacity:0.75,fontWeight:700}}>{sk.dep_type}</span>}
                </span>
              ))}
            </div>
          </div>
          <button onClick={()=>deleteProcess(proc.procid)} style={{background:"none",border:"none",cursor:"pointer",color:G.muted,fontSize:18,padding:"4px 8px",flexShrink:0}}>×</button>
        </div>
      ))}
    </Page>
  );
}

// ─── SKILL COMBO WITH PROCESSES ───────────────────────────────────────────────
// Variant of SkillCombo that shows processes in bold and doesn't use pills (add-only)
function SkillComboWithProcesses({ allItems, onAdd, onCreateSkill }) {
  const [input, setInput] = useState("");
  const [open, setOpen]   = useState(false);

  const filtered = allItems.filter(s=>s.name.toLowerCase().includes(input.toLowerCase()));
  const canCreate = onCreateSkill && input.trim() &&
    !allItems.find(s=>s.name.toLowerCase()===input.trim().toLowerCase() && !s._isProcess && !s._isRole);

  const select = item => { onAdd(item); setInput(""); setOpen(false); };

  return (
    <div style={{position:"relative"}}>
      <input value={input} onChange={e=>{ setInput(e.target.value); setOpen(true); }}
        onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),150)}
        onKeyDown={e=>{ if(e.key==="Escape") setOpen(false); if(e.key==="Enter"&&filtered.length) select(filtered[0]); }}
        placeholder="Type to search processes or skills…"
        style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${G.border}`,fontSize:14,fontFamily:G.mono,outline:"none"}}/>
      {open&&(filtered.length>0||canCreate)&&(
        <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:G.white,border:`1px solid ${G.border}`,borderRadius:8,boxShadow:"0 4px 16px rgba(44,24,16,0.12)",zIndex:500,maxHeight:240,overflowY:"auto"}}>
          {canCreate&&(
            <button onMouseDown={async()=>{ const s=await onCreateSkill(input.trim()); if(s) select(s); }}
              style={{width:"100%",textAlign:"left",padding:"9px 14px",background:"none",border:"none",cursor:"pointer",fontSize:13,fontFamily:G.mono,color:G.caramel,fontWeight:600,borderBottom:`1px solid ${G.border}`}}>
              + Add skill "{input.trim()}"
            </button>
          )}
          {filtered.map(item=>(
            <button key={item.skid} onMouseDown={()=>select(item)}
              style={{width:"100%",textAlign:"left",padding:"9px 14px",background:"none",border:"none",cursor:"pointer",fontSize:13,fontFamily:G.mono,color:G.dark,display:"flex",alignItems:"center",gap:8}}
              onMouseEnter={e=>e.currentTarget.style.background=G.sand}
              onMouseLeave={e=>e.currentTarget.style.background="none"}>
              {item._isProcess&&<span style={{fontSize:10,background:`${G.caramel}20`,color:G.caramel,borderRadius:4,padding:"1px 6px",fontWeight:700,flexShrink:0}}>PROCESS</span>}
              <span style={{fontWeight:item._isProcess?700:400}}>{item.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


// ─── ROSTER PAGE ──────────────────────────────────────────────────────────────
// Used both by Restaurant (full view, publish/approve) and Employees (own slots)
// ─── ROSTER PAGE ──────────────────────────────────────────────────────────────
function RosterPage({ user, toast, onBack }) {
  const isBoth   = user?.is_manufacturer && !!user?.employer_uid;
  const [viewMode, setViewMode] = useState(isBoth ? 'manager' : user?.is_manufacturer ? 'manager' : 'employee');
  const isManuf  = viewMode === 'manager';
  // A user who is both manufacturer AND employee can switch between views

  const toMonday = d => {
    const dt = new Date(d); dt.setHours(0,0,0,0);
    const day = dt.getDay();
    dt.setDate(dt.getDate() + (day===0 ? -6 : 1-day));
    return dt;
  };
  const fmt = d => d.toISOString().split('T')[0];
  const hhmm = (h, m=0) => `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  const minsToHhmm = mins => hhmm(Math.floor(mins/60), mins%60);

  const [weekStart, setWeekStart] = useState(()=>toMonday(new Date()));
  const [roster, setRoster]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [saving,  setSaving]      = useState(false);
  const [empEditing, setEmpEditing] = useState(false);

  // My slots (employee editing). Keyed list of {tempId, slot_date, start_time, end_time}
  const [mySlots, setMySlots] = useState([]);

  // Tooltip state: which slot is being edited inline
  const [tooltip, setTooltip] = useState(null); // {tempId, x, y}

  // Drag state for creating/extending a slot
  // {mode:'create'|'extend', dateStr, startMins, currentMins, tempId?}
  const [drag, setDrag] = useState(null);

  const calRef = useRef(null);

  const START_H = 7, END_H = 23;
  const HOURS = Array.from({length:END_H-START_H}, (_,i)=>START_H+i);
  const COL_H = 720; // px — 48px per hour
  const PX_PER_MIN = COL_H / ((END_H-START_H)*60);
  const SNAP = 15; // snap to 15-min intervals

  const minsToPx = m => m * PX_PER_MIN;
  const pxToMins = px => px / PX_PER_MIN;
  const snapMins = m => Math.round(m/SNAP)*SNAP;
  const startMins = () => START_H*60;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getRoster(fmt(weekStart));
      setRoster(r);
      if (viewMode === 'employee') {
        const own = (r.slots||[]).filter(s=>String(s.uid)===String(user.uid));
        setMySlots(own.map((s,i)=>({
          tempId: `s${i}`, rsid:s.rsid,
          slot_date:s.slot_date,
          start_time:s.start_time?.slice(0,5),
          end_time:s.end_time?.slice(0,5),
          finalized:s.finalized,
        })));
        const finalized = own.some(s=>s.finalized);
        if (r.status==='published' && !finalized) setEmpEditing(true);
        else setEmpEditing(false);
      } else {
        setEmpEditing(false);
      }
    } catch(e){ toast(e.message,"error"); }
    finally{ setLoading(false); }
  }, [weekStart, viewMode]);
  useEffect(()=>{ load(); },[load]);

  const today = new Date(); today.setHours(0,0,0,0);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate()+6);
  const isPast   = weekEnd < today;
  const isFuture = weekStart > today;
  const status   = roster?.status || 'unpublished';

  const rAction = async (fn, ...args) => {
    setSaving(true);
    try { const r = await fn(...args); setRoster(r); toast("Saved"); }
    catch(e){ toast(e.message,"error"); }
    finally{ setSaving(false); }
  };

  const ensureRoster = async () => {
    if (roster?.roid) return roster;
    const r = await api.initRoster({ week_start: fmt(weekStart) });
    setRoster(r); return r;
  };

  // ── Restaurant buttons ──────────────────────────────────────────────────────
  const canClone = roster?.roid && !isFuture && ['published','approved','unapproved'].includes(status);

  const manufButtons = () => {
    if (isPast) return null;
    const btns = [];
    if (['unpublished','unapproved'].includes(status))
      btns.push(<Btn key="pub" size="sm" loading={saving} onClick={async()=>{ const r=await ensureRoster(); rAction(api.publishRoster,r.roid); }}>Publish</Btn>);
    if (status==='published')
      btns.push(<Btn key="unpub" size="sm" variant="secondary" loading={saving} onClick={()=>rAction(api.unpublishRoster,roster.roid)}>Unpublish</Btn>);
    if (canClone)
      btns.push(<Btn key="clone" size="sm" variant="secondary" loading={saving} onClick={()=>rAction(api.cloneRoster,roster.roid)}>Clone →</Btn>);
    if (['published','unapproved'].includes(status))
      btns.push(<Btn key="app" size="sm" loading={saving} onClick={()=>rAction(api.approveRoster,roster.roid)}>Approve</Btn>);
    if (status==='approved') {
      btns.push(<Btn key="unapp" size="sm" variant="secondary" loading={saving} onClick={()=>rAction(api.unapproveRoster,roster.roid)}>Unapprove</Btn>);
      if (canClone) btns.push(<Btn key="clone2" size="sm" variant="secondary" loading={saving} onClick={()=>rAction(api.cloneRoster,roster.roid)}>Clone →</Btn>);
    }
    return btns;
  };

  // ── Employee slot helpers ───────────────────────────────────────────────────
  const canEdit = viewMode === 'employee' && status==='published' && !isPast;
  const isFinalized = mySlots.some(s=>s.finalized);
  const nextTempId = () => `t${Date.now()}${Math.random()}`;

  const overlaps = (dateStr, startM, endM, excludeId=null) =>
    mySlots.some(s=>s.slot_date===dateStr && s.tempId!==excludeId &&
      timeToMins(s.start_time)<endM && timeToMins(s.end_time)>startM);

  const addOrUpdateSlot = (dateStr, startM, endM, tempId=null) => {
    const start_time = minsToHhmm(Math.max(startMins(), Math.min(startM, END_H*60-SNAP)));
    const end_time   = minsToHhmm(Math.min(END_H*60, Math.max(endM, startMins()+SNAP)));
    if (overlaps(dateStr, timeToMins(start_time), timeToMins(end_time), tempId)) return;
    if (tempId) {
      setMySlots(p=>p.map(s=>s.tempId===tempId?{...s,start_time,end_time}:s));
    } else {
      setMySlots(p=>[...p,{tempId:nextTempId(),slot_date:dateStr,start_time,end_time,finalized:false}]);
    }
  };

  const removeSlot = tempId => { setMySlots(p=>p.filter(s=>s.tempId!==tempId)); setTooltip(null); };

  const saveSlots = async (finalize=false) => {
    if (!roster?.roid) { toast("Roster not published yet","error"); return; }
    setSaving(true);
    try {
      const r = await api.saveRosterSlots(roster.roid, {
        slots: mySlots.map(s=>({slot_date:s.slot_date,start_time:s.start_time,end_time:s.end_time})),
        finalize,
      });
      setRoster(r);
      toast(finalize?"Roster finalized!":"Slots saved");
      if (finalize) setEmpEditing(false);
      // Re-sync mySlots with server response
      const own = (r.slots||[]).filter(s=>String(s.uid)===String(user.uid));
      setMySlots(own.map((s,i)=>({tempId:`s${i}`,rsid:s.rsid,slot_date:s.slot_date,start_time:s.start_time?.slice(0,5),end_time:s.end_time?.slice(0,5),finalized:s.finalized})));
    } catch(e){ toast(e.message,"error"); }
    finally{ setSaving(false); }
  };

  // ── Drag handlers ───────────────────────────────────────────────────────────
  const getColDateStr = target => target.closest('[data-datestr]')?.dataset.datestr;

  const onMouseDown = (e, dateStr) => {
    if (!canEdit || !empEditing) return;
    if (e.button!==0) return;
    // Check if clicking on an existing slot handle
    const slotEl = e.target.closest('[data-tempid]');
    if (slotEl) return; // handled by slot's own mousedown
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const py = e.clientY - rect.top;
    const rawMins = START_H*60 + pxToMins(py);
    const startM = snapMins(rawMins);
    setDrag({mode:'create', dateStr, startM, currentM: startM+60});
    setTooltip(null);
  };

  const onMouseMove = useCallback(e => {
    if (!drag) return;
    // Find which column we're in
    const dayEls = calRef.current?.querySelectorAll('[data-datestr]');
    if (!dayEls) return;
    let targetEl = null;
    for (const el of dayEls) {
      const r = el.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right) { targetEl = el; break; }
    }
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    const py = Math.max(0, e.clientY - rect.top);
    const rawMins = START_H*60 + pxToMins(py);
    const curM = snapMins(rawMins);
    setDrag(d => d ? {...d, currentM: Math.max(d.startM+SNAP, curM)} : null);
  }, [drag]);

  const onMouseUp = useCallback(e => {
    if (!drag) return;
    const {mode, dateStr, startM, currentM, tempId} = drag;
    const endM = Math.max(startM+SNAP, currentM);
    addOrUpdateSlot(dateStr, startM, endM, mode==='extend'?tempId:null);
    setDrag(null);
  }, [drag, mySlots]);

  useEffect(()=>{
    if (drag) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      return ()=>{
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
    }
  }, [drag, onMouseMove, onMouseUp]);

  // ── Calendar data ────────────────────────────────────────────────────────────
  const weekDays = DAY_LABELS.map((label,i)=>{
    const d = new Date(weekStart); d.setDate(d.getDate()+i);
    return { label, date:d, dateStr:fmt(d), isToday:fmt(d)===fmt(today) };
  });

  const slotsByDay = {};
  (roster?.slots||[]).forEach(s=>{ (slotsByDay[s.slot_date]=slotsByDay[s.slot_date]||[]).push(s); });

  const empColors = {};
  (roster?.employees||[]).forEach((e,i)=>{ empColors[e.uid]=ROLE_PALETTE[i%ROLE_PALETTE.length]; });
  // For employee: own colour is their own entry; for restaurant their employee list
  const myColor = empColors[user?.uid] || G.caramel;

  const calOpacity = isPast ? 0.5 : (isFuture && status==='unpublished') ? 0.65 : 1;

  // Drag ghost dimensions (for create)
  const dragGhost = drag?.mode==='create' ? {
    top: minsToPx(drag.startM - START_H*60),
    height: minsToPx(Math.max(drag.currentM - drag.startM, SNAP)),
  } : null;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Page
      title={`Roster — week of ${weekStart.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}`}
      actions={
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          {isBoth && (
            <Btn size="sm" variant="secondary" onClick={()=>{
              setViewMode(m=>m==='manager'?'employee':'manager');
              setEmpEditing(false);
            }}>
              {viewMode==='manager' ? '👤 My slots' : '📋 Manage roster'}
            </Btn>
          )}
          {isManuf && manufButtons()}
          {!isManuf && canEdit && !isFinalized && (
            empEditing ? <>
              <Btn size="sm" loading={saving} onClick={()=>saveSlots(false)}>Save</Btn>
              <Btn size="sm" loading={saving} onClick={()=>saveSlots(true)}>Finalize</Btn>
              <Btn size="sm" variant="ghost" onClick={()=>{ setEmpEditing(false); load(); }}>Cancel</Btn>
            </> : <Btn size="sm" onClick={()=>setEmpEditing(true)}>Edit my slots</Btn>
          )}
          {!isManuf && isFinalized && !loading &&
            <Btn size="sm" variant="secondary" onClick={()=>{ setMySlots(p=>p.map(s=>({...s,finalized:false}))); setEmpEditing(true); }}>Edit</Btn>}
          {onBack && <Btn size="sm" variant="ghost" onClick={onBack}>← Staff</Btn>}
        </div>
      }>

      {/* Week navigation + status */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,flexWrap:"wrap"}}>
        <button onClick={()=>{ const d=new Date(weekStart); d.setDate(d.getDate()-7); setWeekStart(d); }}
          style={{background:"none",border:`1px solid ${G.border}`,borderRadius:7,cursor:"pointer",padding:"5px 14px",fontSize:14}}>←</button>
        <span style={{fontSize:14,fontWeight:600,color:G.dark,minWidth:150,textAlign:"center"}}>
          {weekStart.toLocaleDateString('en-GB',{day:'numeric',month:'short'})} – {weekEnd.toLocaleDateString('en-GB',{day:'numeric',month:'short'})}
        </span>
        <button onClick={()=>{ const d=new Date(weekStart); d.setDate(d.getDate()+7); setWeekStart(d); }}
          style={{background:"none",border:`1px solid ${G.border}`,borderRadius:7,cursor:"pointer",padding:"5px 14px",fontSize:14}}>→</button>
        <span style={{fontSize:12,padding:"3px 12px",borderRadius:20,fontWeight:600,
          background:status==='approved'?`${G.green}20`:status==='published'?`${G.caramel}20`:status==='unapproved'?'#fef3c7':'#f3f4f6',
          color:status==='approved'?G.green:status==='published'?G.caramel:status==='unapproved'?'#92400e':G.muted}}>
          {status.charAt(0).toUpperCase()+status.slice(1)}
        </span>
      </div>

      {/* Auto-settings (restaurant, non-past) */}
      {isManuf && roster?.roid && !isPast && (
        <div style={{background:G.sand,borderRadius:10,padding:"10px 16px",marginBottom:14,display:"flex",gap:20,flexWrap:"wrap"}}>
          {[['auto_clone','Auto-clone next week'],['auto_approve','Auto-approve at week end']].map(([k,label])=>(
            <label key={k} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer"}}>
              <input type="checkbox" checked={!!roster[k]} style={{accentColor:G.caramel}}
                onChange={async e=>{ const r=await api.patchRoster(roster.roid,{[k]:e.target.checked}); setRoster(r); }}/>
              {label}
            </label>
          ))}
        </div>
      )}

      {/* Employee legend (shown always) */}
      {(roster?.employees||[]).length>0 && (
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>
          {roster.employees.map(e=>(
            <span key={e.uid} style={{display:"flex",alignItems:"center",gap:5,fontSize:12,
              color:empColors[e.uid]||G.muted, fontWeight:String(e.uid)===String(user?.uid)?700:400}}>
              <span style={{width:10,height:10,borderRadius:"50%",background:empColors[e.uid]||G.muted,display:"inline-block",flexShrink:0}}/>
              {e.first_name}{e.role_name?` (${e.role_name})`:""}
              {String(e.uid)===String(user?.uid)?" (you)":""}
            </span>
          ))}
        </div>
      )}

      {loading ? <Spinner/> : (
        <div style={{overflowX:"auto",userSelect:"none"}} ref={calRef}>
          <div style={{display:"grid",gridTemplateColumns:`44px repeat(7,1fr)`,minWidth:680,opacity:calOpacity}}>
            {/* Header */}
            <div/>
            {weekDays.map(({label,date,dateStr,isToday})=>(
              <div key={dateStr} style={{padding:"8px 4px",textAlign:"center",fontWeight:600,fontSize:12,
                color:isToday?G.caramel:G.dark,background:isToday?`${G.caramel}12`:G.sand,
                borderRight:`1px solid ${G.border}`,borderBottom:`1px solid ${G.border}`,borderTop:`1px solid ${G.border}`}}>
                {label}<br/><span style={{fontSize:11,fontWeight:400,color:G.muted}}>{date.getDate()}/{date.getMonth()+1}</span>
              </div>
            ))}

            {/* Time column */}
            <div style={{position:"relative",height:COL_H,borderRight:`1px solid ${G.border}`}}>
              {HOURS.map(h=>(
                <div key={h} style={{position:"absolute",top:minsToPx((h-START_H)*60)-1,right:4,fontSize:9,color:G.muted,lineHeight:1}}>
                  {h}:00
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map(({dateStr,date})=>{
              const allDaySlots = slotsByDay[dateStr]||[];
              const myDaySlots  = mySlots.filter(s=>s.slot_date===dateStr);
              const otherSlots  = !isManuf
                ? allDaySlots.filter(s=>String(s.uid)!==String(user.uid))
                : allDaySlots;
              const isEditable  = canEdit && empEditing;
              const isDragCol   = drag?.dateStr===dateStr;

              return (
                <div key={dateStr}
                  data-datestr={dateStr}
                  style={{position:"relative",height:COL_H,
                    borderRight:`1px solid ${G.border}`,borderBottom:`1px solid ${G.border}`,
                    background:isPast?`${G.sand}60`:G.white,
                    cursor:isEditable?"crosshair":"default"}}
                  onMouseDown={e=>onMouseDown(e,dateStr)}>

                  {/* Hour grid */}
                  {HOURS.map(h=>(
                    <div key={h} style={{position:"absolute",top:minsToPx((h-START_H)*60),left:0,right:0,
                      borderTop:`1px solid ${h%2===0?G.border:"#f5f0ea"}`,pointerEvents:"none"}}/>
                  ))}

                  {/* 30-min sub-lines */}
                  {HOURS.map(h=>(
                    <div key={`${h}h`} style={{position:"absolute",top:minsToPx((h-START_H)*60+30),left:0,right:0,
                      borderTop:`1px dashed #f0ebe3`,pointerEvents:"none"}}/>
                  ))}

                  {/* Unpublished overlay */}
                  {isFuture && status==='unpublished' && isManuf && (
                    <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",opacity:0.3}}>
                      <span className="material-symbols-outlined" style={{fontSize:36,color:G.muted}}>publish</span>
                    </div>
                  )}

                  {/* Drag ghost */}
                  {isEditable && isDragCol && dragGhost && (
                    <div style={{position:"absolute",left:2,right:2,
                      top:dragGhost.top,height:Math.max(dragGhost.height,4),
                      background:`${myColor}30`,border:`2px dashed ${myColor}`,borderRadius:5,pointerEvents:"none"}}>
                      <span style={{fontSize:9,color:myColor,padding:"2px 4px",display:"block"}}>
                        {minsToHhmm(drag.startM)}–{minsToHhmm(Math.max(drag.currentM,drag.startM+SNAP))}
                      </span>
                    </div>
                  )}

                  {/* Other employees' slots (read-only) */}
                  {(isManuf ? allDaySlots : otherSlots).map(s=>{
                    const col = empColors[s.uid]||G.caramel;
                    const t1 = timeToMins(s.start_time?.slice?.(0,5)||s.start_time);
                    const t2 = timeToMins(s.end_time?.slice?.(0,5)||s.end_time);
                    const top = minsToPx(t1-START_H*60);
                    const h   = minsToPx(t2-t1);
                    return (
                      <div key={s.rsid} style={{position:"absolute",left:2,right:2,top,height:Math.max(h,4),
                        background:`${col}28`,border:`1.5px solid ${col}`,borderRadius:5,overflow:"hidden",pointerEvents:"none"}}>
                        <span style={{fontSize:9,fontWeight:600,color:col,writingMode:"vertical-rl",lineHeight:1.2,padding:"2px 3px"}}>
                          {s.first_name}{s.role_name?` · ${s.role_name}`:""}
                        </span>
                      </div>
                    );
                  })}

                  {/* My own slots (editable) */}
                  {!isManuf && myDaySlots.map(s=>{
                    const t1 = timeToMins(s.start_time);
                    const t2 = timeToMins(s.end_time);
                    const top = minsToPx(t1-START_H*60);
                    const ht  = minsToPx(t2-t1);
                    const isOpen = tooltip?.tempId===s.tempId;
                    return (
                      <div key={s.tempId} data-tempid={s.tempId}
                        style={{position:"absolute",left:2,right:2,top,height:Math.max(ht,4),
                          background:`${myColor}35`,border:`2px solid ${myColor}`,borderRadius:5,
                          cursor:isEditable?"pointer":"default",zIndex:2}}>
                        {/* Slot label */}
                        <div style={{fontSize:10,color:myColor,fontWeight:600,padding:"2px 4px",lineHeight:1.3}}>
                          {s.start_time}–{s.end_time}
                        </div>
                        {/* Drag handle to extend */}
                        {isEditable && (
                          <div
                            style={{position:"absolute",bottom:0,left:0,right:0,height:8,cursor:"s-resize",
                              background:`${myColor}50`,borderRadius:"0 0 4px 4px"}}
                            onMouseDown={e=>{
                              e.stopPropagation(); e.preventDefault();
                              setDrag({mode:'extend',dateStr,startM:t1,currentM:t2,tempId:s.tempId});
                            }}/>
                        )}
                        {/* Click to open tooltip */}
                        {isEditable && (
                          <div style={{position:"absolute",inset:0,bottom:8}}
                            onClick={e=>{ e.stopPropagation(); setTooltip(isOpen?null:{tempId:s.tempId}); }}/>
                        )}
                        {/* Tooltip */}
                        {isOpen && isEditable && (
                          <div onClick={e=>e.stopPropagation()}
                            style={{position:"absolute",top:-4,left:"calc(100% + 6px)",zIndex:20,
                              background:G.white,border:`1px solid ${G.border}`,borderRadius:10,
                              padding:"12px 14px",boxShadow:"0 4px 20px rgba(44,24,16,0.15)",
                              minWidth:180,fontSize:13}}>
                            <p style={{fontWeight:600,color:G.dark,marginBottom:10}}>Edit slot</p>
                            <div style={{display:"flex",flexDirection:"column",gap:8}}>
                              <label style={{fontSize:12,color:G.muted}}>Start
                                <input type="time" value={s.start_time}
                                  onChange={e=>setMySlots(p=>p.map(x=>x.tempId===s.tempId?{...x,start_time:e.target.value}:x))}
                                  style={{display:"block",width:"100%",padding:"5px 8px",borderRadius:6,border:`1px solid ${G.border}`,fontSize:13,fontFamily:G.mono,outline:"none",marginTop:2}}/>
                              </label>
                              <label style={{fontSize:12,color:G.muted}}>End
                                <input type="time" value={s.end_time}
                                  onChange={e=>setMySlots(p=>p.map(x=>x.tempId===s.tempId?{...x,end_time:e.target.value}:x))}
                                  style={{display:"block",width:"100%",padding:"5px 8px",borderRadius:6,border:`1px solid ${G.border}`,fontSize:13,fontFamily:G.mono,outline:"none",marginTop:2}}/>
                              </label>
                              <button onClick={()=>removeSlot(s.tempId)}
                                style={{background:G.red,border:"none",borderRadius:6,color:G.white,cursor:"pointer",padding:"5px 10px",fontSize:12,fontWeight:600,marginTop:2}}>
                                Remove slot
                              </button>
                            </div>
                            <button onClick={()=>setTooltip(null)}
                              style={{position:"absolute",top:6,right:8,background:"none",border:"none",cursor:"pointer",fontSize:16,color:G.muted,lineHeight:1}}>×</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Status messages */}
      {!isManuf && !loading && (
        <p style={{fontSize:13,color:
          status==='approved'?G.green:
          status==='published'&&empEditing?"#854d0e":G.muted,
          marginTop:12,textAlign:"center",fontWeight:status==='approved'?600:400}}>
          {status==='approved'   && "✓ Roster approved — your schedule is final."}
          {status==='unpublished'&& "Roster not yet published. Check back later."}
          {status==='published'  && empEditing  && "Drag on any day column to add a slot. Drag the bottom edge to extend it. Click a slot to edit times or remove."}
          {status==='published'  && !empEditing && !isFinalized && "Click \"Edit my slots\" to post your availability."}
          {status==='published'  && isFinalized && !empEditing && "Slots finalized. Click \"Edit\" to make changes before approval."}
        </p>
      )}
    </Page>
  );
}


// ─── EMBED MENU PAGE ──────────────────────────────────────────────────────────
function EmbedMenuPage({ toast }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
  const [settings, setSettings] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [testing, setTesting]   = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [domainInput, setDomainInput] = useState("");
  const [menus, setMenus] = useState([]);

  useEffect(()=>{
    Promise.all([api.getEmbedSettings(), api.getMenus()])
      .then(([s,m])=>{ setSettings(s); setMenus(m||[]); })
      .catch(e=>toast(e.message,"error"))
      .finally(()=>setLoading(false));
  },[]);

  const save = async (patch) => {
    setSaving(true);
    try { const s = await api.updateEmbedSettings(patch); setSettings(s); toast("Saved"); }
    catch(e){ toast(e.message,"error"); } finally{ setSaving(false); }
  };

  const rotateKey = async () => {
    if (!window.confirm("Rotate the API key? Your existing embed snippets will stop working until updated.")) return;
    try { const s = await api.rotateEmbedKey(); setSettings(s); toast("API key rotated"); }
    catch(e){ toast(e.message,"error"); }
  };

  const testConnect = async () => {
    setTesting(true); setTestResult(null);
    try { const r = await api.testEmbedConnect(); setTestResult({ ok:true, msg:`Connected — ${r.endpoint}` }); }
    catch(e){ setTestResult({ ok:false, msg:e.message }); } finally{ setTesting(false); }
  };

  const addDomain = () => {
    const d = domainInput.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!d) return;
    const current = settings.allowed_domains || [];
    if (!current.includes(d)) save({ allowed_domains: [...current, d] });
    setDomainInput("");
  };
  const removeDomain = (d) => save({ allowed_domains: (settings.allowed_domains||[]).filter(x=>x!==d) });

  const BASE = typeof window !== "undefined" ? window.location.origin : "https://punacotta.netlify.app";
  const snippet = (type, params="") =>
    `<script src="${BASE}/embed.js"></script>\n<${type} api-key="${settings?.api_key||"YOUR_KEY"}"${params}></${type}>`;

  if (loading) return <Page title="Embedded Menu"><Spinner/></Page>;

  const S = settings || {};

  return (
    <Page title="Embedded Menu">
      {/* Enable toggle */}
      <div style={{ background:G.white, border:`1px solid ${G.border}`, borderRadius:14, padding:24, marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <h3 style={{ fontFamily:G.font, fontSize:17, marginBottom:4 }}>Embedded menu</h3>
            <p style={{ fontSize:13, color:G.muted }}>Allow your menu to be embedded on external websites</p>
          </div>
          <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
            <span style={{ fontSize:13, color:G.muted }}>{S.enabled?"Enabled":"Disabled"}</span>
            <div onClick={()=>save({enabled:!S.enabled})} style={{ width:44, height:24, borderRadius:12, background:S.enabled?G.caramel:G.border, cursor:"pointer", position:"relative", transition:"background 0.2s" }}>
              <div style={{ position:"absolute", top:2, left:S.enabled?22:2, width:20, height:20, borderRadius:10, background:G.white, transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }}/>
            </div>
          </label>
        </div>
      </div>

      {S.enabled && (<>
        {/* Order settings */}
        <div style={{ background:G.white, border:`1px solid ${G.border}`, borderRadius:14, padding:24, marginBottom:20 }}>
          <h3 style={{ fontFamily:G.font, fontSize:17, marginBottom:16 }}>Order settings</h3>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", fontSize:14 }}>
              <input type="checkbox" checked={!!S.allow_order} onChange={e=>save({allow_order:e.target.checked})} style={{accentColor:G.caramel,width:16,height:16}}/>
              Allow ordering through embedded widget
            </label>
            {S.allow_order && (
              <div>
                <p style={{ fontSize:13, color:G.muted, marginBottom:10 }}>Checkout mode</p>
                <div style={{ display:"flex", gap:10 }}>
                  {[["inline","Inline (complete order in widget)"],["redirect","Redirect to tanelu.com"]].map(([v,l])=>(
                    <label key={v} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13,
                      padding:"10px 16px", borderRadius:8, border:`1px solid ${S.checkout_mode===v?G.caramel:G.border}`,
                      background:S.checkout_mode===v?"#fef9f4":G.white }}>
                      <input type="radio" checked={S.checkout_mode===v} onChange={()=>save({checkout_mode:v})} style={{accentColor:G.caramel}}/>
                      {l}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Domain allowlist */}
        <div style={{ background:G.white, border:`1px solid ${G.border}`, borderRadius:14, padding:24, marginBottom:20 }}>
          <h3 style={{ fontFamily:G.font, fontSize:17, marginBottom:4 }}>Allowed domains</h3>
          <p style={{ fontSize:13, color:G.muted, marginBottom:16 }}>Leave empty to allow all domains, or add specific domains to restrict access</p>
          <div style={{ display:"flex", gap:10, marginBottom:12 }}>
            <input value={domainInput} onChange={e=>setDomainInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&addDomain()}
              placeholder="e.g. myrestaurant.com"
              style={{ flex:1, padding:"9px 12px", borderRadius:8, border:`1px solid ${G.border}`, fontSize:14, fontFamily:G.mono, outline:"none" }}/>
            <Btn size="sm" onClick={addDomain}>Add</Btn>
          </div>
          {(S.allowed_domains||[]).length===0 ? (
            <p style={{ fontSize:13, color:G.muted, fontStyle:"italic" }}>All domains allowed</p>
          ) : (
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {(S.allowed_domains||[]).map(d=>(
                <span key={d} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", background:G.sand, borderRadius:20, fontSize:13, fontFamily:G.mono }}>
                  {d}
                  <button onClick={()=>removeDomain(d)} style={{ background:"none", border:"none", cursor:"pointer", color:G.muted, fontSize:14, lineHeight:1, padding:0 }}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* API Key */}
        <div style={{ background:G.white, border:`1px solid ${G.border}`, borderRadius:14, padding:24, marginBottom:20 }}>
          <h3 style={{ fontFamily:G.font, fontSize:17, marginBottom:16 }}>API key</h3>
          <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:10 }}>
            <code style={{ flex:1, padding:"10px 14px", background:G.sand, borderRadius:8, fontSize:13, fontFamily:G.mono, wordBreak:"break-all" }}>{S.api_key}</code>
            <Btn variant="secondary" size="sm" onClick={()=>{ navigator.clipboard.writeText(S.api_key); toast("Copied!"); }}>Copy</Btn>
            <Btn variant="ghost" size="sm" onClick={rotateKey}>Rotate</Btn>
          </div>
          <p style={{ fontSize:12, color:G.muted }}>Keep this key secret. Include it as <code>api-key</code> attribute in all embed tags.</p>
          {/* Connectivity test */}
          <div style={{ marginTop:16, display:"flex", alignItems:"center", gap:12 }}>
            <Btn variant="secondary" size="sm" onClick={testConnect} loading={testing}>Test connectivity</Btn>
            {testResult&&(
              <span style={{ fontSize:13, color:testResult.ok?G.green:G.red, fontWeight:600 }}>
                {testResult.ok?"✓":"✗"} {testResult.msg}
              </span>
            )}
          </div>
        </div>

        {/* Embed snippets */}
        <div style={{ background:G.white, border:`1px solid ${G.border}`, borderRadius:14, padding:24 }}>
          <h3 style={{ fontFamily:G.font, fontSize:17, marginBottom:16 }}>Embed snippets</h3>
          {[
            ["Single item", "puncotta-item", ` rid="ITEM_ID"`],
            ["Menu (carousel)", "puncotta-menu", ` mid="${menus[0]?.mid||"MENU_ID"}" view="carousel"`],
            ["Menu (table)", "puncotta-menu", ` mid="${menus[0]?.mid||"MENU_ID"}" view="table"`],
            ["All active menus", "puncotta-menu", ` view="carousel"`],
            ["Floating cart", "puncotta-cart", ` float="bottom-right"`],
          ].map(([label, tag, params])=>(
            <div key={label} style={{ marginBottom:20 }}>
              <p style={{ fontSize:13, fontWeight:600, color:G.dark, marginBottom:8 }}>{label}</p>
              <div style={{ position:"relative" }}>
                <pre style={{ background:G.sand, borderRadius:8, padding:"12px 14px", fontSize:12, fontFamily:G.mono, overflowX:"auto", margin:0, whiteSpace:"pre-wrap", wordBreak:"break-all", color:G.dark }}>{snippet(tag,params)}</pre>
                <button onClick={()=>{ navigator.clipboard.writeText(snippet(tag,params)); toast("Copied!"); }}
                  style={{ position:"absolute", top:8, right:8, background:G.white, border:`1px solid ${G.border}`, borderRadius:6, cursor:"pointer", fontSize:11, fontFamily:G.mono, padding:"3px 8px", color:G.muted }}>
                  Copy
                </button>
              </div>
            </div>
          ))}
        </div>
      </>)}
    </Page>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(()=>{
    try{ const t=localStorage.getItem("token"); if(!t)return null; const p=JSON.parse(atob(t.split(".")[1])); return p.exp*1000>Date.now()?p:null; }catch{return null;}
  });

  // Parse hash-based tokens on load: #reset/TOKEN or #verify/TOKEN
  const [hashPage, setHashPage] = useState(()=>{
    const h = window.location.hash;
    if (h.startsWith("#reset/"))  return { type:"reset",  token:h.slice(7) };
    if (h.startsWith("#verify/")) return { type:"verify", token:h.slice(8) };
    return null;
  });

  const [page, setPage] = useState(()=>user?(user.is_manufacturer?"orders-manuf":"restaurants"):"login");
  const [activeMenu, setActiveMenu] = useState(null);
  const [storeSchedule, setStoreSchedule] = useState(DEFAULT_STORE);
  const [lang, setLang] = useLang();
  _currentLang = lang;
  const {toasts,toast,remove} = useToast();
  const logout=()=>{localStorage.removeItem("token");setUser(null);setPage("login");};
  const onLogin=u=>{setUser(u);setHashPage(null);setPage(u.is_manufacturer?"orders-manuf":"restaurants");};

  // If a hash token is present, show the appropriate page regardless of auth state
  if (hashPage?.type === "reset") return (
    <LangContext.Provider value={lang}>
      <style>{css}</style>
      <Toast toasts={toasts} remove={remove} />
      <ResetPage token={hashPage.token} setPage={p=>{setHashPage(null);setPage(p);}} toast={toast} onLogin={onLogin}/>
    </LangContext.Provider>
  );
  if (hashPage?.type === "verify") return (
    <LangContext.Provider value={lang}>
      <style>{css}</style>
      <Toast toasts={toasts} remove={remove} />
      <VerifyPage token={hashPage.token} setPage={p=>{setHashPage(null);setPage(p);}} toast={toast} onLogin={onLogin}/>
    </LangContext.Provider>
  );
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
          {page==="reports"      &&<ReportsPage   toast={toast}/>}
          {page==="staff"        &&<StaffPage      user={user} toast={toast}/>}
          {page==="processes"    &&<ProcessesPage  toast={toast}/>}
          {page==="roster-emp"   &&<RosterPage     user={user} toast={toast}/>}
          {page==="embed"        &&<EmbedMenuPage toast={toast}/>}
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
