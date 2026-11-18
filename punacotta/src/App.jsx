import { useState, useEffect, useCallback, useRef, useMemo, createContext, useContext } from "react";
import React from "react";
import { createPortal } from "react-dom";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { api } from "./api.js";
import "./tanelu-logo.css";
import { parseVoiceSale } from "./voiceSale.js";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input as CInput } from "@/components/ui/input";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardPanel, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Radio, RadioGroup } from "@/components/ui/radio-group";
import { Alert, AlertTitle, AlertDescription, AlertAction } from "@/components/ui/alert";
import { Badge as CBadge } from "@/components/ui/badge";
import { Select as CSelect, SelectTrigger, SelectValue, SelectPopup, SelectItem } from "@/components/ui/select";
import { Kbd } from "@/components/ui/kbd";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog as CDialog, DialogPopup, DialogHeader, DialogTitle, DialogDescription, DialogPanel, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverTrigger, PopoverPopup } from "@/components/ui/popover";
import { Sheet, SheetPopup, SheetHeader, SheetTitle, SheetPanel } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CopyIcon, ImageIcon, ImageUpIcon, Trash2Icon, CheckIcon, MicIcon, SquareIcon, Undo2Icon, LayoutGridIcon, ListIcon, ListFilterIcon, PencilIcon, ArrowDownIcon, ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon, ChevronsUpDownIcon, MinusIcon, PlusIcon, UploadIcon, WorkflowIcon, CookingPotIcon, PowerIcon, PowerOffIcon, PlayIcon, PauseIcon, SkipForwardIcon, TimerIcon, RepeatIcon, CalendarDaysIcon, TagsIcon, UsersIcon, MailIcon } from "lucide-react";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import { Menu, MenuTrigger, MenuPopup, MenuItem, MenuSeparator, MenuRadioGroup, MenuRadioItem, MenuCheckboxItem } from "@/components/ui/menu";
import { AlertDialog, AlertDialogPopup, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { ZoomInIcon, CakeSliceIcon, ShoppingBasketIcon, PackageCheckIcon, RefreshCwIcon, PlugIcon, Loader2Icon, MapPinIcon, ShieldAlertIcon, HandIcon, TableIcon, FileDownIcon, SparklesIcon, SendIcon, BanIcon, MenuIcon, ReceiptTextIcon, PackageIcon, BookOpenIcon, TruckIcon, ChartColumnIcon, ArrowLeftIcon, ChefHatIcon, MailCheckIcon, PartyPopperIcon, StoreIcon, TriangleAlertIcon, BellIcon, ChevronDownIcon, CircleAlertIcon, CircleCheckIcon, CircleUserIcon, ClockIcon, GlobeIcon, InfoIcon, Link2Icon, LogOutIcon, MonitorIcon, MoonIcon, SearchIcon, SettingsIcon, SunIcon, XIcon } from "lucide-react";

const BoardOfArrivals = React.lazy(() => import('./screens/BoardOfArrivals.jsx'));
const Marketplace = React.lazy(() => import('./screens/Marketplace.jsx'));

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const G = {
  font: "'Playfair Display', Georgia, serif",
  mono: "'DM Sans', system-ui, sans-serif",
  cream: "#faf6f0", sand: "#f0e8d8", caramel: "#c8873a",
  dark: "#2c1810", muted: "#8b7355", border: "#e8dcc8",
  white: "#ffffff", red: "#d63031", green: "#00b894",
};

// ─── THEME ────────────────────────────────────────────────────────────────────
// G is mutated in place when the theme changes; App re-renders so every style picks it up.
const THEME_LIGHT = { cream:"#faf6f0", sand:"#f0e8d8", caramel:"#c8873a", dark:"#2c1810", muted:"#8b7355", border:"#e8dcc8", white:"#ffffff", red:"#d63031", green:"#00b894" };
const THEME_DARK  = { cream:"#17120e", sand:"#261e16", caramel:"#dd9a4c", dark:"#f1e8da", muted:"#a99a82", border:"#3b2f23", white:"#1f1812", red:"#ff6b6b", green:"#2ed3a8" };
function getThemePref() {
  try { const v = localStorage.getItem('theme'); return ['light','dark','system'].includes(v) ? v : 'light'; } catch { return 'light'; }
}
function resolveTheme(pref) {
  if (pref === 'dark') return 'dark';
  if (pref === 'system') { try { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch { return 'light'; } }
  return 'light';
}
function applyTheme(pref) {
  const mode = resolveTheme(pref);
  Object.assign(G, mode === 'dark' ? THEME_DARK : THEME_LIGHT);
  try { document.documentElement.style.colorScheme = mode; document.documentElement.style.background = G.cream; document.documentElement.classList.toggle('dark', mode === 'dark'); } catch {}
}
applyTheme(getThemePref());

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

export const RU = {
  // Nav tabs
  "Orders":"Заказы","Products":"Продукты","Items":"Блюда","Menus":"Меню",
  "Procurement":"Снабжение","Suppliers":"Поставщики",
  "Restaurants":"Рестораны","My Orders":"Мои заказы",
  // Buttons
  "+ Order":"+ Заказ","+ Product":"+ Продукт","+ Item":"+ Блюдо",
  "+ Menu":"+ Меню","+ New supplier":"+ Поставщик",
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
  "Expiry (hours)":"Срок хранения (часов)","Expiry":"Срок хранения","Profit & Loss":"Доходы и расходы","Expenses":"Расходы","Products delivery":"Доставка продуктов","Products wastage":"Списание продуктов","Items wastage":"Списание блюд","Profit":"Прибыль","Loss":"Убыток","Deficit":"Дефицит","Other":"Прочее","Collapse all":"Свернуть всё","Table view":"Таблица","Chart view":"Диаграмма","Click a revenue category to drill down into items.":"Нажмите на категорию дохода, чтобы увидеть блюда.","Street address":"Улица, район, дом",
  "City":"Город","ZIP":"Почтовый индекс","Email":"Электронная почта","Phone":"Телефон",
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
  "Create account":"Зарегистрироваться","Welcome back":"И снова здравствуйте","Restore":"Восстановить","Enter your email and we'll send a recovery link valid for 1 hour.":"Введите email, и мы отправим ссылку для восстановления, действующую 1 час.","Please, check your email to find a welcome message. If you haven't received any, please check your spam folder. If nonetheless the message didn't make it to your email, repeat registration making sure you entered a correct email.":"Проверьте почту — мы отправили приветственное письмо. Если его нет, загляните в папку «Спам». Если письмо так и не пришло, зарегистрируйтесь ещё раз, проверив правильность email.","No active processes. Processes will appear here when started by your restaurant.":"Нет активных процессов. Процессы появятся здесь, когда ваш ресторан их запустит.","Log in to your Tanelu account.":"Войдите в свой аккаунт Tanelu.","New to Tanelu?":"Впервые в Tanelu?","Create account →":"Создать аккаунт →","Security area":"Зона безопасности","Delete restaurant":"Удалить ресторан",
  "password":"пароль","Reset password":"Сбросить пароль",
  "Send recovery link":"Отправить ссылку","Back to login":"Обратно к авторизации",
  "Password":"Пароль",
  "I am a…":"Я …","Manufacturer":"Производитель","Customer":"Покупатель",
  "Already have an account? Log in →":"Уже есть учётная запись? Войти →",
  "Already have an account?":"Уже есть учётная запись?",
  "Log in →":"Войти →",
  "Min 6 characters":"мин. 6 знаков","Required":"Обязательное поле",
  "Business name":"Название организации",
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
  "Production":"Производство","Click a revenue category or Profit to drill down.":"Нажмите на категорию дохода или на прибыль, чтобы увидеть детали.","Board of Arrivals":"Табло прибытия","Offline sales":"Офлайн-продажи","Online sales":"Онлайн-продажи","Profit by channel":"Прибыль по каналам","Run":"Партия","No equipment":"Без оборудования","Produced, not reserved":"Произведено, не зарезервировано","Reserved on the Board of Arrivals":"Зарезервировано на табло","Unfulfilled":"Не выполнено","No batches in production.":"Нет партий в производстве.","Production capacity chart":"Диаграмма загрузки оборудования","not reserved":"не зарезервировано","unfulfilled":"не выполнен","units":"ед.","reserved":"резерв","Order":"Заказ","cancelled":"отменён","Start":"Запустите","again for":"ещё раз на","could not be produced":"не удалось произвести","Re-produce":"Произвести заново","Contact customer & cancel":"Связаться с клиентом и отменить","Cancel order":"Отменить заказ","Please let the customer know first:":"Сначала сообщите клиенту:","Back":"Назад",
  "Packaging":"Упаковка","+ Package":"+ Упаковка","Max. capacity":"Макс. вместимость","Type to search items…":"Введите название блюда…","Max. capacity must be greater than 0":"Макс. вместимость должна быть больше 0","Edit Package":"Редактировать упаковку","New Package":"Новая упаковка","Delete package?":"Удалить упаковку?","Remove":"Убрать","Packaging adjusted":"Упаковка скорректирована","used beyond the automatic write-off — recorded in Profit & Loss":"использовано сверх автоматического списания — учтено в отчёте о доходах и расходах","Deleted":"Удалено","Select a supplier":"Выберите поставщика","Supplier…":"Поставщик…","Price":"Цена","Link":"Привязать","Confirm":"Подтвердить","Cancel wastage":"Отменить списание","The following packaging will be wasted, and stock levels shall be changed accordingly. The action is irreversible. Are you sure you wish to proceed?":"Следующая упаковка будет списана, остатки изменятся. Действие необратимо. Продолжить?","Supplier linked":"Поставщик привязан","Wastage applied":"Списание выполнено","Confirm wastage":"Подтверждение списания","Add supplier":"Добавить поставщика","Items":"Блюда","Name required":"Укажите название",
  "Quick Sale":"Быстрая продажа","Online":"Онлайн","Offline":"Офлайн","Inventory":"Склад","Search items…":"Поиск позиций…","No items found":"Позиции не найдены","in stock":"в наличии","no stock":"нет в наличии","Current sale":"Текущая продажа","Tap items to add them.":"Нажимайте на позиции, чтобы добавить.","Sold":"Продано","Sold earlier":"Продано ранее","Clear":"Очистить","Recent sales":"Последние продажи","Undo":"Отменить","Sale undone":"Продажа отменена","Sell":"Продажа","Closing count":"Закрытие смены","Enter what is left of each item. Anything missing is recorded as sold; mark units as wasted if they were thrown away. Items you leave as they are stay unchanged.":"Введите остаток каждой позиции. Недостающее записывается как проданное; отметьте единицы, которые были списаны. Позиции без изменений остаются как есть.","No items with stock on hand.":"Нет позиций в наличии.","Expected":"Ожидается","sold":"продано","of which wasted":"из них списано","more than expected — stock will be raised":"больше ожидаемого — остаток будет увеличен","Add another item…":"Добавить другую позицию…","No differences yet.":"Расхождений пока нет.","Wasted":"Списано","Surplus added to stock":"Излишек добавлен в остаток","Count saved: no differences":"Подсчёт сохранён: расхождений нет","Save count":"Сохранить подсчёт","Voice input is not supported in this browser. Try Chrome or Safari.":"Голосовой ввод не поддерживается в этом браузере. Попробуйте Chrome или Safari.","Microphone access is blocked. Allow it in the browser settings.":"Доступ к микрофону заблокирован. Разрешите его в настройках браузера.","Voice error":"Ошибка голоса","Nothing was heard":"Ничего не услышано","Voice language":"Язык голоса","Stop":"Стоп","Speak a sale":"Продиктовать продажу","Listening…":"Слушаю…","I heard":"Я услышал","No items recognised. Try again or tap the items.":"Позиции не распознаны. Повторите или выберите нажатием.","Not recognised":"Не распознано","Confirm sale":"Подтвердить продажу","Add to ticket":"Добавить в чек","Discard":"Отмена","Speak again":"Повторить",
  "Reports":"Отчёты","Week":"Неделя","Month":"Месяц","Year":"Год",
  "Revenue":"Выручка","ABC Analysis":"ABC-анализ","Association Rules":"Правила ассоциации","Display available items only":"Показывать только доступные позиции",
  "No data yet.":"Данных пока нет.",
  "New Item":"Новое блюдо","Edit Item":"Редактировать блюдо",
  "Delete items?":"Удалить блюда?",
  "Are you sure you wish to delete":"Вы уверены, что хотите удалить",
  "+ Add product":"+ Добавить продукт","Remove":"Убрать",
  "No terms yet.":"Условий пока нет.",
  "New Supplier":"Новый поставщик","Edit Supplier":"Редактировать поставщика",
  // v12-v13 additions
  "Accept invitation":"Принять приглашение",
  "Accept order?":"Принять заказ?",
  "Add":"Добавить",
  "Add at least one product":"Добавьте хотя бы один продукт",
  "All skills":"Все навыки",
  "Allowed domains":"Разрешённые домены",
  "API key":"API-ключ",
  "API key rotated":"Новый API-ключ сформирован",
  "Apply":"Применить",
  "Availability hours saved":"Рабочие часы сохранены",
  "Check your inbox":"Проверьте входящую почту",
  "Cloned from previous week":"Рабочий график скопирован из предыдущей недели",
  "Copied!":"Скопировано",
  "Create account & join":"Зарегистрироваться",
  "Delete this equipment?":"Удалить оборудование?",
  "Delete this order? This cannot be undone.":"Удалить заказ? Восстановить его будет невозможно.",
  "Delete this process?":"Удалить этот процесс?",
  "Deleted":"Удалено",
  "Delivery address":"Адрес доставки",
  "Discard order?":"Сбросить заказ?",
  "Edit Product":"Изменить продукт",
  "Edit role":"Изменить роль",
  "Email confirmed!":"Адрес электронной почты подтверждён",
  "Embed snippets":"Код встраиваемого меню",
  "Embedded Menu":"Внешнее меню",
  "Embedded menu":"Внешнее меню",
  "Equipment":"Оборудование",
  "Executions":"Прогоны процессов",
  "Expiry saved":"Дата истечения сохранена",
  "First and last name required":"Не хватает имени и фамилии",
  "Forecast":"Прогноз",
  "Forecast updated":"Прогноз обновлён",
  "Hours cleared":"Время возвращено к исходным значениям",
  "Invalid or expired invite":"Приглашение недействительно или срок его действия истёк",
  "Link":"Привязать",
  "Link expired or invalid":"Ссылка недействительна или срок её действия истёк",
  "Menu":"Меню",
  "My Processes":"Мои процессы",
  "My Roster":"Мой график",
  "Name required":"Не хватает названия",
  "New Menu":"Новое меню",
  "New Product":"Новый продукт",
  "New Supplier Order":"Новый заказ поставщику",
  "No existing account found for this email — a new employee record will be created.":"Учётная запись с таким адресом электронной почты не найдена — будет добавлена новая.",
  "Order confirmed as delivered!":"Доставка заказа подтверждена клиентом",
  "Order deleted":"Заказ удалён",
  "Order saved":"Заказ сохранён",
  "Order settings":"Параметры заказа",
  "Orders created from forecast":"Заказы на основе прогноза сформированы",
  "Password must be at least 6 characters":"Пароль должен быть как минимум шестизначным",
  "Password updated":"Пароль обновлён",
  "Passwords do not match":"Значения паролей в двух полях не совпадают",
  "Please enter a delivery address":"Укажите адрес доставки",
  "Please enter your name":"Укажите своё имя",
  "Please select pickup or delivery":"Вы не указали, заберёте ли вы заказ самостоятельно или вам нужна доставка.",
  "Price per unit":"Цена за единицу",
  "Processes":"Процессы",
  "Removed from menu":"Блюдо исключено из меню",
  "Role name:":"Название роли:",
  "Roles & Skills":"Роли и способности",
  "Roster not published yet":"Рабочий график ещё не опубликован",
  "Rotate":"Обновить",
  "Rotate the API key? Your existing embed snippets will stop working until updated.":"Обновить API-ключ? Пока вы не обновите значение ключа на внешнем сайте, заказать с него ничего будет невозможно.",
  "Sales":"Продажи",
  "Saved":"Сохранено",
  "saved":"сохранено",
  "Schedule saved":"График обновлён",
  "Select a supplier":"Поставщик",
  "Set new password":"Новый пароль",
  "Set password":"Установить пароль",
  "Slots saved":"Рабочие интервалы сохранены",
  "Staff":"Сотрудники",
  "Stock":"На склад",
  "Supplier linked":"Поставщик привязан",
  "Supplier unlinked":"Связь с поставщиком разорвана",
  "Test connectivity":"Проверить связь",
  "You're all set!":"Готово!",
  "Your skills saved":"Ваши навыки сохранены",
  // v15 app translations
  "Roster":"Расписание",
  "Your skills":"Собственные навыки",
  "First name":"Имя",
  "Last name":"Фамилия",
  "Role(s)":"Роли",
  "Skill(s)":"Навыки",
  "Edit":"Изменить",
  "Roles & Skills":"Роли и навыки",
  "Employee":"Сотрудник",
  "Process":"Процесс",
  "Dashed = parallel successor":"Одновременно выполняемая следующая задача",
  "Items (capacity)":"Производительность",
  "Item":"Блюдо",
  "Finish-to-Start (FS)":"Сначала завершится А, потом начнётся Б.",
  "Start-to-Start (SS)":"А и Б начнутся одновременно",
  "Finish-to-Finish (FF)":"А и Б закончатся одновременно",
  "Start-to-Finish (SF)":"Как только начнётся Б, завершится А",
  "Add processes / skills":"Добавьте процессы / навыки",
  "Skill / Step":"Навык / шаг",
  "Duration":"Продолжительность",
  "Dep. type":"Связь",
  "Depends on":"Связано с",
  "Total":"Итого",
  "Run":"Выполнить",
  "Select what you are producing in this run and set the quantity. Items from your equipment are pre-populated.":"Укажите, что будет на выходе процесса и количество. Здесь уже подставлены те блюда, которые может производить оборудование в данном процессе.",
  "Add item":"Добавить блюдо",
  "Start process":"Выполнить",
  "Cancel":"Отменить",
  "in progress":"выполняется",
  "on hold":"на паузе",
  "completed":"выполнено",
  "cancelled":"отменено",
  "Name / Model":"Название / модель",
  "Status":"Статус",
  "Items":"Блюда",
  "If a unit with this name already exists, a sequence number will be appended automatically.":"Если оборудование с таким названием уже существует, то новое будет добавлено с порядковым номером.",
  "Disable":"Выключить",
  "Enable":"Включить",
  "Wastage":"Списание",
  "Confirm wastage":"Подтвердить списание",
  "Confirm":"Подтвердить",
  "Min. inventory":"Мин. остаток на складе",
  "Add Employee":"Добавить сотрудника",
  "Delete Employee":"Удалить сотрудника",
  // Board of Arrivals translations
  "Your selection":"Вы выбрали",
  "Add items using the + buttons.":"Добавляйте блюда кнопкой +",
  "Item name":"Наименование",
  "Search items…":"Искомое блюдо (например, \"пельмени\")",
  "All restaurants":"Любые организации",
  "Refresh":"Обновить",
  "Sold by":"Поставляется",
  "Display only ready items":"Показывать только готовые блюда",
  "Unit price":"Цена",
  "ETA pickup":"Можно забирать в",
  "ETA delivery":"Будет передано курьеру в",
  "Qty":"Кол-во",
  "Units":"ед. изм",
  "Cost":"Стоимость",
  "Place order":"Оформить заказ",
  "Board of Arrivals":"Готовые блюда",
  "Distance within":"В пределах, км",
  "Marketplace":"Маркетплейс",
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
const CUTOFF_HOURS = Array.from({length:48},(_,i)=>`${String(Math.floor(i/2)).padStart(2,"0")}:${i%2===0?"00":"30"}`);
const DELIVERY_DAYS = [0,1,2,3,4,5,6,7,10,14,21,30];

// Unit submultiple config — read-only, not editable by Restaurant
const UNIT_META = {
  kilograms: { abbr:"kg", sub:"grams",       sub_abbr:"g",  conv:1000 },
  litres:    { abbr:"l",  sub:"millilitres",  sub_abbr:"ml", conv:1000 },
  pounds:    { abbr:"lb", sub:"ounces",       sub_abbr:"oz", conv:16   },
};
// Returns abbreviated unit string for a unit name
export function unitAbbr(name) { return UNIT_META[name]?.abbr || name || ""; }
export function subAbbr(name)  { return UNIT_META[name]?.sub_abbr || ""; }
export function conv(name)     { return UNIT_META[name]?.conv || 1; }
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

const makeCss = () => `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
  /* In the 'base' cascade layer so the Tailwind utilities used by the coss ui screens can override it */
  @layer base {
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: ${G.mono}; background: ${G.cream}; color: ${G.dark}; min-height: 100vh; }
    input, select, textarea, button { font-family: ${G.mono}; }
    ::placeholder { color: ${G.muted}; opacity: 0.7; }
  }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: ${G.sand}; }
  ::-webkit-scrollbar-thumb { background: ${G.caramel}; border-radius: 3px; }
  @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideIn { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }
  @keyframes toastIn { from{opacity:0;transform:translateY(20px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(200,60,50,0.45)} 50%{box-shadow:0 0 0 10px rgba(200,60,50,0)} }
  @keyframes spin { to{transform:rotate(360deg)} }
  @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
  .recipe-thumb:hover .zoom-icon { opacity:1 !important; }
  .recipe-link:hover { text-decoration:underline; }
  .drop-zone { border:2px dashed ${G.border}; border-radius:10px; padding:24px; text-align:center; cursor:pointer; transition:all 0.2s; }
  .drop-zone:hover, .drop-zone.drag-over { border-color:${G.caramel}; background:${G.sand}; }
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
    <div className="fixed right-4 bottom-4 z-[9999] flex flex-col gap-2 sm:right-6 sm:bottom-6" aria-live="polite">
      {toasts.map(t=>{
        const Icon = t.type==="error" ? CircleAlertIcon : t.type==="success" ? CircleCheckIcon : InfoIcon;
        return (
          <div key={t.id} role={t.type==="error"?"alert":"status"} data-slot="toast"
            className="flex w-[min(360px,calc(100vw-2rem))] items-start gap-3 rounded-xl border bg-popover p-3.5 text-popover-foreground text-sm shadow-lg/10"
            style={{ animation:"toastIn 0.3s ease" }}>
            <Icon className={`mt-px size-4.5 ${t.type==="error"?"text-destructive-foreground":"text-brand"}`} aria-hidden="true"/>
            <span className="flex-1 leading-snug">{t.msg}</span>
            <button type="button" data-slot="toast-close" onClick={()=>remove(t.id)} aria-label="Dismiss"
              className="-m-1 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"><XIcon className="size-4"/></button>
          </div>
        );
      })}
    </div>
  );
}

// ─── DIALOG ───────────────────────────────────────────────────────────────────
function Dialog({ open, title, children, onConfirm, onCancel, confirmLabel="Yes", danger=true }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
  return (
    <AlertDialog open={!!open} onOpenChange={o=>{ if(!o) onCancel?.(); }}>
      <AlertDialogPopup className="max-h-[90vh]">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading text-xl">{title}</AlertDialogTitle>
          <AlertDialogDescription render={<div/>} className="max-h-[60vh] overflow-y-auto">{children}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="ghost" onClick={onCancel}>{tl("Cancel")}</Button>
          <Button variant={danger?"destructive":"default"} onClick={onConfirm}>{confirmLabel}</Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}

// ─── LIGHTBOX ─────────────────────────────────────────────────────────────────
function Lightbox({ src, description, onClose }) {
  useEffect(()=>{
    if (!src) return;
    const h = e => { if (e.key==="Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", h, true);
    return ()=>window.removeEventListener("keydown", h, true);
  },[src]);
  if (!src) return null;
  // Above coss dialogs and sheets (z 2300–2500), since a photo can be opened from inside one
  return (
    <div data-slot="lightbox" onClick={onClose} role="dialog" aria-modal="true" aria-label="Photo"
      className="fixed inset-0 z-[2600] flex flex-col items-center justify-center bg-black/85 p-6">
      <div onClick={e=>e.stopPropagation()} className="flex max-h-[90vh] max-w-[90vw] flex-col gap-3">
        <img src={src} alt="" className="max-h-[75vh] max-w-full rounded-lg object-contain"/>
        {description&&<p className="text-center text-sm text-white/80">{description}</p>}
        <Button variant="outline" onClick={onClose} className="self-center border-white/30 bg-transparent text-white hover:bg-white/10 dark:bg-transparent"><XIcon/>Close</Button>
      </div>
    </div>
  );
}

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────
// Step durations are whole numbers (the API returns NUMERIC as e.g. "30.00")
const intDur = v => (v === null || v === undefined || v === "") ? v : Math.round(Number(v)) || 0;

// Shared controls, rendered with coss ui (https://coss.com/ui). Same props as before, so every screen keeps working.
const BTN_VARIANT = { primary:"default", secondary:"outline", ghost:"ghost", danger:"destructive", success:"default" };
function Btn({ children, onClick, variant="primary", disabled, size="md", style:s, loading, title }) {
  return (
    <Button title={title} onClick={onClick} disabled={disabled} loading={loading} style={s}
      variant={BTN_VARIANT[variant]||"default"} size={size==="sm"?"sm":size==="lg"?"lg":"default"}
      className={variant==="success" ? "border-success bg-success text-white shadow-success/24 hover:bg-success/90" : undefined}>
      {children}
    </Button>
  );
}

function Input({ label, type="text", value, onChange, placeholder, required, hint, error, style:s, disabled, onBlur }) {
  return (
    <Field invalid={!!error} className="w-full gap-1.5">
      {label&&<FieldLabel>{label}{required&&<span className="text-brand">*</span>}</FieldLabel>}
      <CInput type={type} value={value??""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
        aria-invalid={error?true:undefined} onBlur={onBlur} style={s} size="lg"/>
      {hint&&!error&&<FieldDescription>{hint}</FieldDescription>}
      {error&&<p className="text-destructive-foreground text-xs">{error}</p>}
    </Field>
  );
}

function Select({ label, value, onChange, options, placeholder, required, style:s }) {
  const cap = o => o.charAt(0).toUpperCase()+o.slice(1);
  const items = [
    ...(placeholder ? [{ label:placeholder, value:"" }] : []),
    ...options.map(o => typeof o==="string" ? { label:cap(o), value:o } : { label:o.label, value:String(o.value) }),
  ];
  const cur = value===null||value===undefined ? "" : String(value);
  return (
    <Field className="w-full gap-1.5">
      {label&&<FieldLabel>{label}{required&&<span className="text-brand">*</span>}</FieldLabel>}
      <CSelect items={items} value={cur} onValueChange={v=>onChange(v??"")}>
        <SelectTrigger size="lg" style={s} className={cur===""?"text-muted-foreground":undefined}><SelectValue/></SelectTrigger>
        <SelectPopup>{items.map(it=><SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>)}</SelectPopup>
      </CSelect>
    </Field>
  );
}

function Badge({ children, color, bg }) {
  return <CBadge variant="outline" className="border-transparent bg-accent text-accent-foreground" style={(color||bg)?{ color, background:bg }:undefined}>{children}</CBadge>;
}

function Spinner() {
  return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", padding:"40px 0" }}>
      <svg width="48" height="72" viewBox="0 0 48 72" fill="none" xmlns="http://www.w3.org/2000/svg">
        <style>{`
          @keyframes tanelu-wink {
            0%,35%,100% { transform: scaleY(1); }
            45%          { transform: scaleY(0.07); }
            58%          { transform: scaleY(1.12); }
            70%          { transform: scaleY(1); }
          }
        `}</style>
        {/* Rectangle — top part of tanelu logo */}
        <rect x="2" y="2" width="44" height="26" rx="6" fill={G.caramel} />
        {/* Circle — bottom part, winks */}
        <g style={{ transformOrigin:"24px 56px", animation:"tanelu-wink 0.5s ease-in-out infinite" }}>
          <circle cx="24" cy="56" r="14" fill={G.caramel} />
        </g>
      </svg>
    </div>
  );
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
      <p className="mb-2 text-muted-foreground text-sm">Square crop auto-applied — drag to adjust:</p>
      <ReactCrop crop={crop} onChange={c=>setCrop(c)} onComplete={c=>setCompletedCrop(c)} aspect={1}>
        <img ref={imgRef} src={src} style={{ maxWidth:"100%", maxHeight:280 }} alt="crop" onLoad={onImgLoad} />
      </ReactCrop>
      <div className="mt-2.5 flex items-center gap-2">
        <Btn variant="secondary" size="sm" onClick={()=>{setSrc(null);setCrop(undefined);setCompletedCrop(null);onImageReady(null);}}>Clear</Btn>
        <span className="text-muted-foreground text-xs">Crop will be applied on save</span>
      </div>
    </div>
  );

  if (existingThumb||existingUrl) return (
    <div className="flex items-start gap-3">
      <img src={existingThumb||existingUrl} alt="" className="size-14 rounded-lg border object-cover" />
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-sm">Current image</p>
        <div className="flex gap-1">
          <Button variant="ghost" size="xs" className="-ms-2 text-brand" onClick={()=>fileRef.current?.click()}><ImageUpIcon/>Replace</Button>
          <Button variant="ghost" size="xs" className="text-destructive-foreground" onClick={onRemove}><Trash2Icon/>{tl("Remove")}</Button>
        </div>
      </div>
      <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png" style={{display:"none"}} onChange={e=>loadFile(e.target.files[0])} />
    </div>
  );

  return (
    <div role="button" tabIndex={0} aria-label="Upload image"
      className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed p-6 text-center transition-colors hover:border-brand/60 hover:bg-accent/40 ${dragging?"border-brand bg-accent/40":"border-border"}`}
      onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)}
      onDrop={onDrop} onClick={()=>fileRef.current?.click()} onKeyDown={e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); fileRef.current?.click(); } }}>
      <ImageUpIcon className="mb-1 size-6 text-muted-foreground"/>
      <p className="text-muted-foreground text-sm">Drop image here or <span className="font-semibold text-brand">Browse</span></p>
      <p className="text-muted-foreground text-xs">(3MB max · JPG, JPEG, PNG)</p>
      <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png" style={{display:"none"}} onChange={e=>loadFile(e.target.files[0])} />
    </div>
  );
}

// ─── RECIPE FORM (shared New + Edit) ─────────────────────────────────────────
// Marketplace categories: one global tree; an item can sit in several leaf categories
function MarketCategoryPicker({ tree=[], value=[], onChange }) {
  const sel = new Set((value||[]).map(Number));
  const toggle = id => { const s = new Set(sel); s.has(id) ? s.delete(id) : s.add(id); onChange([...s]); };
  const leaves = tree.flatMap(t => t.children?.length ? t.children.map(c=>({ ...c, group:t.name })) : [{ ...t, group:null }]);
  const chosen = leaves.filter(l => sel.has(l.mcid));
  return (
    <div data-slot="market-category-picker" className="flex flex-wrap items-center gap-1.5">
      {chosen.map(l=>(
        <span key={l.mcid} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted py-0.5 ps-2.5 pe-1 text-xs">
          {l.group?<span className="text-muted-foreground">{l.group} ›</span>:null}{l.name}
          <button type="button" aria-label={`Remove ${l.group?l.group+" › ":""}${l.name}`} onClick={()=>toggle(l.mcid)}
            className="inline-flex size-4.5 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"><XIcon className="size-3"/></button>
        </span>
      ))}
      <Popover>
        <PopoverTrigger className={buttonVariants({ variant:"outline", size:"xs", className:"border-dashed" })}>
          <PlusIcon/>{chosen.length?"Edit":"Choose categories"}
        </PopoverTrigger>
        <PopoverPopup align="start" className="w-[min(420px,calc(100vw-24px))]">
          <div className="-m-1 grid max-h-80 grid-cols-2 gap-x-4 gap-y-3 overflow-y-auto p-1">
            {tree.map(t=>(
              <div key={t.mcid} className="flex flex-col gap-1.5">
                {t.children?.length ? (<>
                  <span className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">{t.name}</span>
                  {t.children.map(c=>(
                    <Label key={c.mcid} className="cursor-pointer font-normal">
                      <Checkbox checked={sel.has(c.mcid)} onCheckedChange={()=>toggle(c.mcid)}/>{c.name}
                    </Label>
                  ))}
                </>) : (
                  <Label className="cursor-pointer font-semibold">
                    <Checkbox checked={sel.has(t.mcid)} onCheckedChange={()=>toggle(t.mcid)}/>{t.name}
                  </Label>
                )}
              </div>
            ))}
          </div>
        </PopoverPopup>
      </Popover>
    </div>
  );
}

function RecipeForm({
 initial, lookups, onSave, onCancel, saving }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
  const [form, setForm] = useState({
    name:"", description:"", unid:"", caid:"", price:"", currency:"AMD",
    available:true, deliverable:true, image_url:null, image_thumb_url:null, cloudinary_id:null,
    allow_submultiples:false, moq:"", procid:null, expiry_hours:"",
    ...initial,
    market_category_ids: initial?.market_category_ids || [],
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
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <h4 className="font-heading font-semibold text-base">{tl("Contents")}</h4>
        <Button variant="ghost" size="sm" className="text-brand" onClick={()=>setSlide("general")}>{tl("← General")}</Button>
      </div>

      {contents.length===0 && (
        <p className="text-muted-foreground text-sm">{tl("No products added yet.")}</p>
      )}

      {contents.map((c,i)=>(
        <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-muted px-3 py-2.5">
          {/* Product selector */}
          <div className="min-w-40 flex-[2]">
            <CSelect items={allProducts.map(p=>({label:p.label,value:String(p.pid)}))} value={c.pid?String(c.pid):null} onValueChange={v=>setContentPid(i,v||"")}>
              <SelectTrigger aria-label="Product"><SelectValue placeholder="Select product…"/></SelectTrigger>
              <SelectPopup>{allProducts.map(p=><SelectItem key={p.pid} value={String(p.pid)}>{p.label}</SelectItem>)}</SelectPopup>
            </CSelect>
          </div>
          {/* Qty */}
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="outline" size="icon-xs" aria-label="Less" onClick={()=>setContentQty(i,-1)}><MinusIcon/></Button>
            <CInput size="sm" type="number" value={c.qty} min={0} max={1000} step="any" aria-label="Quantity"
              onChange={e=>setContentQtyDirect(i,e.target.value)}
              onBlur={e=>setContents(p=>p.map((x,j)=>j===i?{...x,qty:Math.max(0,Math.min(1000,parseFloat(e.target.value)||0))}:x))}
              className="w-16 [&_input]:text-center"/>
            <Button variant="outline" size="icon-xs" aria-label="More" onClick={()=>setContentQty(i,1)}><PlusIcon/></Button>
          </div>
          {/* Remove */}
          <Button variant="ghost" size="sm" className="text-destructive-foreground" onClick={()=>removeContent(i)}>{tl("Remove")}</Button>
        </div>
      ))}

      <Button variant="outline" size="sm" className="self-start border-dashed text-brand" onClick={addContent}><PlusIcon/>Add product</Button>

      <div className="mt-1 flex gap-2.5">
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

  const prepTime = (() => {
    const proc = (lookups.processes||[]).find(p=>String(p.procid)===String(form.procid));
    const mins = (proc?.skills||[]).reduce((s,sk)=>{
      const d=Number(sk.duration)||0;
      if(sk.duration_unit==="hours") return s+d*60;
      if(sk.duration_unit==="seconds") return s+d/60;
      return s+d;
    },0);
    if(!mins) return "—";
    const h=Math.floor(mins/60),m=Math.round(mins%60);
    return h?`${h}h ${m}min`:`${m}min`;
  })();
  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Input label={tl("Name")} value={form.name} onChange={v=>set("name",v)} required />
        <Input label={tl("Description")} value={form.description||""} onChange={v=>set("description",v)} />
        <Select label={tl("Units")} value={String(form.unid||"")} onChange={v=>set("unid",v)} options={lookups.units.map(u=>({value:String(u.unid),label:u.name}))} placeholder="Select units" />
        <Select label={tl("Category")} value={String(form.caid||"")} onChange={v=>set("caid",v)} options={lookups.categories.map(c=>({value:String(c.caid),label:c.name}))} placeholder="Select category" />
        <Input label={priceLabel} type="number" value={String(form.price||"")} onChange={v=>set("price",v)} placeholder="0" />
        <Select label={tl("Currency")} value={form.currency||"AMD"} onChange={v=>set("currency",v)} options={CURRENCIES} />
      </div>

      {/* Submultiples */}
      {hasSub(unitName) && (
        <div className="flex flex-col gap-2.5 rounded-lg bg-muted p-3.5">
          <Label className="cursor-pointer font-semibold">
            <Checkbox checked={!!form.allow_submultiples} onCheckedChange={v=>set("allow_submultiples",!!v)} />
            Allow submultiples ({UNIT_META[unitName].sub_abbr})
          </Label>
          {form.allow_submultiples && (
            <div className="flex flex-wrap items-end gap-2.5">
              <div className="w-40"><Input label={`MOQ (${UNIT_META[unitName].sub_abbr})`} type="number" value={String(form.moq||"")}
                onChange={v=>set("moq",v)} placeholder={`e.g. 250`} /></div>
              <div className="pb-1 text-muted-foreground text-xs leading-relaxed">
                Customer will add in {UNIT_META[unitName].sub_abbr} increments.<br/>
                1 {unitName} = {UNIT_META[unitName].conv} {UNIT_META[unitName].sub}.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Process selector — below price, above image */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Select label="Production process" value={String(form.procid||"")} onChange={v=>set("procid",v||null)}
          options={(lookups.processes||[]).map(p=>({value:String(p.procid),label:p.name}))} placeholder="No process" />
        {form.procid&&<Input label="Prep. time" value={prepTime} onChange={()=>{}} disabled />}
        <FieldBlock label="Expiry"><ShelfLifeInput value={form.expiry_hours} onChange={v=>set("expiry_hours",v)} /></FieldBlock>
      </div>

      <FieldBlock label="Marketplace categories" hint="Where this item appears on tanelu.com/market. An item can be in several categories.">
        <MarketCategoryPicker tree={lookups.market_categories||[]} value={form.market_category_ids} onChange={v=>set("market_category_ids",v)}/>
      </FieldBlock>

      <FieldBlock label={tl("Image")}>
        <ImageUploader
          existingUrl={form.image_url} existingThumb={form.image_thumb_url}
          onImageReady={blob=>{ setImageBlob(blob); if(blob) setRemoveImage(false); }}
          onRemove={()=>{ setRemoveImage(true); set("image_url",null); set("image_thumb_url",null); }}
        />
      </FieldBlock>

      <div className="flex flex-col gap-2">
        <Label className="cursor-pointer font-normal"><Checkbox checked={form.available!==false} onCheckedChange={v=>set("available",!!v)} />Available (can be added to a menu)</Label>
        <Label className="cursor-pointer font-normal"><Checkbox checked={form.deliverable!==false} onCheckedChange={v=>set("deliverable",!!v)} />Deliverable (uncheck for pickup-only items)</Label>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <Btn size="sm" onClick={()=>onSave(form, imageBlob, removeImage, contents)} loading={saving}>{tl("Save")}</Btn>
        <Btn variant="ghost" size="sm" onClick={onCancel}>{tl("Cancel")}</Btn>
        <Btn variant="secondary" size="sm" onClick={()=>setSlide("contents")} style={{ marginLeft:"auto" }}>{tl("Contents →")}</Btn>
      </div>
    </div>
  );
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
// ─── COMMAND PALETTE ──────────────────────────────────────────────────────────
// Vocabulary: {nouns, verbs} with synonyms → actions
const CP_NOUNS = [
  { terms:['item','items','recipe','recipes','dish','dishes'],                    key:'items' },
  { terms:['procurement','supply','provisioning','purchasing','supplies','purchase'], key:'procurement' },
  { terms:['report','reports','analytics','analysis'],                            key:'reports' },
  { terms:['staff','employee','employees','team','users','user','member','members'], key:'staff' },
  { terms:['product','products','ingredient','ingredients','component','components','content','contents'], key:'products' },
  { terms:['roster','schedule','rota','shifts','timetable','availability','slot','slots'], key:'roster' },
  { terms:['skill','skills','action','actions'],                                  key:'skills' },
  { terms:['menu','menus'],                                                       key:'menus' },
  { terms:['embedded','embed','website','external'],                              key:'embed' },
  { terms:['order','orders'],                                                     key:'orders' },
  { terms:['process','processes','workflow','workflows','operation','operations','procedure','procedures'], key:'processes' },
  { terms:['supplier','suppliers'],                                               key:'suppliers' },
  { terms:['equipment','machine','machines','oven','ovens'],                      key:'equipment' },
  { terms:['forecast','prediction','predict'],                                    key:'forecast' },
];

const CP_VERBS = [
  { terms:['new','add','create','make'],      key:'create' },
  { terms:['delete','remove'],               key:'delete' },
  { terms:['edit','update','modify','change','fill','complete','slot'], key:'edit' },
  { terms:['run','execute','start'],         key:'run' },
  { terms:['submit','place'],               key:'submit' },
  { terms:['view','open','go','show','find','search','where'], key:'view' },
];

// All possible actions: {id, label, noun, verb, page, action, icon}
const CP_ACTIONS = [
  // Navigation
  { id:'nav-orders',       label:'Orders',             noun:'orders',       verb:'view',   page:'orders-manuf', icon:'📋', mfOnly:true },
  { id:'nav-products',     label:'Products',           noun:'products',     verb:'view',   page:'products',     icon:'🧪', mfOnly:true },
  { id:'nav-items',        label:'Items',              noun:'items',        verb:'view',   page:'items',        icon:'🍮', mfOnly:true },
  { id:'nav-menus',        label:'Menus',              noun:'menus',        verb:'view',   page:'menus',        icon:'📖', mfOnly:true },
  { id:'nav-procurement',  label:'Procurement',        noun:'procurement',  verb:'view',   page:'procurement',  icon:'📦', mfOnly:true },
  { id:'nav-suppliers',    label:'Suppliers',          noun:'suppliers',    verb:'view',   page:'suppliers',    icon:'🏭', mfOnly:true },
  { id:'nav-reports',      label:'Reports',            noun:'reports',      verb:'view',   page:'reports',      icon:'📊', mfOnly:true },
  { id:'nav-staff',        label:'Staff',              noun:'staff',        verb:'view',   page:'staff',        icon:'👥', mfOnly:true },
  { id:'nav-processes',    label:'Processes',          noun:'processes',    verb:'view',   page:'processes',    icon:'⚙️',  mfOnly:true },
  { id:'nav-equipment',    label:'Equipment',          noun:'equipment',    verb:'view',   page:'equipment',    icon:'🔧', mfOnly:true },
  { id:'nav-roster',       label:'Roster',             noun:'roster',       verb:'view',   page:'staff',        action:'roster', icon:'📅', mfOnly:true },
  { id:'nav-skills',       label:'Skills & Roles',     noun:'skills',       verb:'view',   page:'staff',        action:'roles',  icon:'🎯', mfOnly:true },
  { id:'nav-schedule',     label:'Schedule (hours)',   noun:'roster',       verb:'view',   page:'schedule',     icon:'🕐', mfOnly:true },
  { id:'nav-embed',        label:'Embedded Menu',      noun:'embed',        verb:'view',   page:'embed',        icon:'🔗', mfOnly:true },
  { id:'nav-roster-emp',   label:'My Roster',          noun:'roster',       verb:'view',   page:'roster-emp',   icon:'📅', empOnly:true },
  { id:'nav-proc-emp',     label:'My Processes',       noun:'processes',    verb:'view',   page:'processes-emp',icon:'⚙️',  empOnly:true },
  // Create actions
  { id:'new-employee',     label:'New Employee',       noun:'staff',        verb:'create', page:'staff',        action:'new-employee', icon:'➕', mfOnly:true },
  { id:'new-item',         label:'New Item',           noun:'items',        verb:'create', page:'items',        action:'new',          icon:'➕', mfOnly:true },
  { id:'new-menu',         label:'New Menu',           noun:'menus',        verb:'create', page:'menus',        action:'new',          icon:'➕', mfOnly:true },
  { id:'new-order',        label:'New Order',          noun:'orders',       verb:'create', page:'procurement',  action:'new',          icon:'➕', mfOnly:true },
  { id:'new-process',      label:'New Process',        noun:'processes',    verb:'create', page:'processes',    action:'new',          icon:'➕', mfOnly:true },
  { id:'new-product',      label:'New Product',        noun:'products',     verb:'create', page:'products',     action:'new',          icon:'➕', mfOnly:true },
  { id:'new-skill',        label:'New Skill',          noun:'skills',       verb:'create', page:'staff',        action:'new-skill',    icon:'➕', mfOnly:true },
  { id:'run-process',      label:'Run a Process',      noun:'processes',    verb:'run',    page:'processes',    action:'run',          icon:'▶️',  mfOnly:true },
  { id:'edit-roster',      label:'Edit Roster',        noun:'roster',       verb:'edit',   page:'staff',        action:'roster',       icon:'✏️',  mfOnly:true },
  { id:'submit-order',     label:'Submit an Order',    noun:'procurement',  verb:'submit', page:'procurement',  icon:'📤', mfOnly:true },
  { id:'forecast',         label:'Forecast Products',  noun:'forecast',     verb:'view',   page:'products',     icon:'🔮', mfOnly:true },
  // Delete
  { id:'del-employee',     label:'Delete Employee',    noun:'staff',        verb:'delete', page:'staff',        icon:'🗑️',  mfOnly:true },
  { id:'del-product',      label:'Delete Product',     noun:'products',     verb:'delete', page:'products',     icon:'🗑️',  mfOnly:true },
  { id:'del-item',         label:'Delete Item',        noun:'items',        verb:'delete', page:'items',        icon:'🗑️',  mfOnly:true },
];

const CP_DEFAULTS = [
  'new-employee','new-item','new-menu','new-order','new-process','new-product','new-skill','run-process'
];

const RECENT_KEY = 'cp_recent';
function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY)||'[]'); } catch{ return []; }
}
function pushRecent(id) {
  const prev = getRecent().filter(x=>x!==id);
  localStorage.setItem(RECENT_KEY, JSON.stringify([id,...prev].slice(0,5)));
}

function fuzzyMatch(term, query) {
  // Return true if query is a prefix of or contained in term
  return term.includes(query) || term.startsWith(query);
}

function scoreAction(action, nounMatches, verbMatches, query) {
  const nounHit = nounMatches.has(action.noun);
  const verbHit = verbMatches.has(action.verb);
  // Both noun and verb matched → highest priority
  if (nounHit && verbHit) return 3;
  // Noun matched → high priority
  if (nounHit) return 2;
  // Verb matched → medium priority
  if (verbHit) return 1;
  // Direct label match
  if (action.label.toLowerCase().includes(query)) return 2;
  return 0;
}

function CommandPalette({ user, setPage, onClose }) {
  const [query,   setQuery]   = useState('');
  const [focused, setFocused] = useState(0);
  const inputRef = useRef(null);
  const isM  = user?.is_manufacturer;
  const isEmp = !!user?.employer_uid;

  // Shift+Space global shortcut
  useEffect(()=>{
    const handler = e => {
      if (e.shiftKey && e.code==='Space') { e.preventDefault(); setTimeout(()=>inputRef.current?.focus(), 50); }
      if (e.key==='Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return ()=>window.removeEventListener('keydown', handler);
  },[onClose]);

  // Filter actions by user role
  const roleActions = CP_ACTIONS.filter(a=> {
    if (a.mfOnly && !isM) return false;
    if (a.empOnly && !isEmp) return false;
    return true;
  });

  // Compute results
  const results = useMemo(()=>{
    const q = query.trim().toLowerCase();
    if (!q) {
      // Default: recent + defaults
      const recent = getRecent();
      const recentActions = recent.map(id=>roleActions.find(a=>a.id===id)).filter(Boolean);
      const defaults = CP_DEFAULTS.map(id=>roleActions.find(a=>a.id===id)).filter(Boolean);
      const seen = new Set(recentActions.map(a=>a.id));
      const rest = defaults.filter(a=>!seen.has(a.id));
      return [
        ...recentActions.map(a=>({...a,_group:'Recent'})),
        ...rest.map(a=>({...a,_group:'Suggestions'})),
      ];
    }

    // Tokenise and match nouns/verbs
    const tokens = q.split(/\s+/).filter(t=>t.length>1);
    const nounMatches = new Set();
    const verbMatches = new Set();

    for (const token of tokens) {
      for (const n of CP_NOUNS) {
        if (n.terms.some(t=>fuzzyMatch(t, token))) nounMatches.add(n.key);
      }
      for (const v of CP_VERBS) {
        if (v.terms.some(t=>fuzzyMatch(t, token))) verbMatches.add(v.key);
      }
    }

    // Score and filter
    const scored = roleActions
      .map(a=>({ ...a, _score: scoreAction(a, nounMatches, verbMatches, q) }))
      .filter(a=>a._score>0)
      .sort((a,b)=>b._score-a._score);

    return scored.map(a=>({...a,_group:''}));
  }, [query, user]);

  useEffect(()=>setFocused(0),[results]);

  const execute = (action) => {
    pushRecent(action.id);
    onClose();
    setQuery('');
    setPage(action.page);
    if (action.action) {
      setTimeout(()=>{
        window.dispatchEvent(new CustomEvent('cp-action', { detail: action.action }));
      }, 80);
    }
  };

  const handleKey = e => {
    if (e.key==='ArrowDown'){ e.preventDefault(); setFocused(f=>Math.min(f+1,results.length-1)); }
    if (e.key==='ArrowUp'){   e.preventDefault(); setFocused(f=>Math.max(f-1,0)); }
    if (e.key==='Enter' && results[focused]) execute(results[focused]);
    if (e.key==='Escape') onClose();
  };

  if (typeof onClose !== 'function') return null;

  // Group label tracking
  let lastGroup = null;

  return (
    <div data-slot="command-palette" className="fixed inset-0 z-[2300] flex flex-col items-center px-3 pt-[12vh]"
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/32 backdrop-blur-sm" onClick={onClose}/>
      {/* Panel */}
      <div role="dialog" aria-modal="true" aria-label="Search" className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-lg/5" style={{ animation:'fadeIn 0.15s ease' }}>
        {/* Input */}
        <div className="flex items-center gap-2.5 border-border border-b px-4 py-3">
          <SearchIcon className="size-5 shrink-0 text-muted-foreground"/>
          <input
            ref={inputRef}
            data-slot="command-input"
            value={query}
            onChange={e=>setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search or type a command…"
            aria-label="Search or type a command"
            autoFocus
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"/>
          {query&&<Button variant="ghost" size="icon-xs" aria-label="Clear" className="text-muted-foreground" onClick={()=>setQuery('')}><XIcon/></Button>}
          <Kbd>Esc</Kbd>
        </div>
        {/* Results */}
        <div className="max-h-[min(420px,60vh)] overflow-y-auto p-1.5" role="listbox">
          {results.length===0&&query?(
            <div className="px-4 py-6 text-center text-muted-foreground text-sm">No results for “{query}”</div>
          ):results.map((a,i)=>{
            const showGroup = a._group && a._group!==lastGroup;
            lastGroup = a._group||lastGroup;
            return (
              <div key={a.id}>
                {showGroup&&(
                  <div className="px-3 pt-2 pb-1 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">{a._group}</div>
                )}
                <button type="button" role="option" aria-selected={i===focused} data-slot="command-item"
                  onClick={()=>execute(a)}
                  onMouseEnter={()=>setFocused(i)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start text-sm ${i===focused?"bg-accent text-accent-foreground":""}`}>
                  <span className="w-6 shrink-0 text-center text-base">{a.icon}</span>
                  <span className="flex-1">{a.label}</span>
                  <span className="shrink-0 text-muted-foreground text-xs">
                    {a.page?.replace('-',' ').replace('manuf','').replace('cust','').replace('emp','').trim()}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
        {/* Footer hint */}
        <div className="flex gap-4 border-border border-t px-4 py-2 text-muted-foreground text-xs max-sm:hidden">
          <span className="flex items-center gap-1.5"><Kbd>↑↓</Kbd> navigate</span>
          <span className="flex items-center gap-1.5"><Kbd>Enter</Kbd> open</span>
          <span className="flex items-center gap-1.5"><Kbd>Esc</Kbd> close</span>
        </div>
      </div>
    </div>
  );
}

// Search bar trigger in Nav (collapsed version)
function NavSearchBar({ onClick }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} aria-label="Search (Shift+Space)" title="Search (⇧Space)" className="text-muted-foreground max-2xl:w-8 max-2xl:px-0">
      <SearchIcon/>
      <span className="font-normal max-2xl:hidden">Search</span>
      <Kbd className="ms-1 max-2xl:hidden">⇧Space</Kbd>
    </Button>
  );
}


// ─── NOTIFICATION BELL ────────────────────────────────────────────────────────
function stepDurationMinutes(step) {
  const d = step.duration || 0;
  const u = step.duration_unit || 'minutes';
  if (u === 'hours') return d * 60;
  if (u === 'seconds') return d / 60;
  return d; // minutes default
}

function useNotifications(user) {
  // notifs: Map<psrid, { psrid, prid, process_name, step_name, dueAt, type, seenAt }>
  // type: 'now' | 'overdue' | 'upcoming'
  const [notifs, setNotifs] = useState(new Map());
  const [period, setPeriodState] = useState('day');
  const stoppedPrids = useRef(new Set());
  const isRestaurantUser = !!(user && (user.is_manufacturer || user.employer_uid));

  // Stock notifications (shortage / wastage) are computed on the server and tracked per user
  const loadStock = useCallback(async () => {
    if (!isRestaurantUser) return;
    try {
      const res = await api.getStockNotifications();
      setPeriodState(res.period || 'day');
      setNotifs(prev => {
        const next = new Map();
        for (const [k, v] of prev) if (v.type !== 'stock') next.set(k, v);
        for (const n of res.items || []) {
          next.set(`s${n.nid}`, {
            psrid: `s${n.nid}`, nid: n.nid, type: 'stock', kind: n.kind, text: n.text,
            addedAt: new Date(n.created_at).getTime(),
            seenAt: n.seen_at ? new Date(n.seen_at).getTime() : null,
          });
        }
        return next;
      });
    } catch {}
  }, [isRestaurantUser]);

  const setPeriod = useCallback(async p => {
    setPeriodState(p);
    try { await api.setNotifPeriod(p); } catch {}
    loadStock();
  }, [loadStock]);

  useEffect(() => {
    if (!isRestaurantUser) return;
    loadStock();
    const iv = setInterval(loadStock, 60000);
    return () => clearInterval(iv);
  }, [isRestaurantUser, loadStock]);

  const compute = useCallback(async () => {
    if (!user) return;
    let runs;
    try { runs = await api.getProcessRunsWithSteps(); } catch { return; }

    const now = Date.now();
    setNotifs(prev => {
      const next = new Map(prev);

      // Wipe notifications for stopped/completed runs
      for (const run of runs) {
        if (run.status === 'stopped' || run.status === 'completed') {
          for (const [psrid, n] of next) {
            if (n.prid === run.prid) next.delete(psrid);
          }
        }
      }

      const activeRuns = runs.filter(r => r.status === 'running' || r.status === 'paused');
      for (const run of activeRuns) {
        if (!run.steps || !Array.isArray(run.steps)) continue;
        const steps = [...run.steps].sort((a, b) => a.seq - b.seq);
        const runStart = run.started_at ? new Date(run.started_at).getTime() : now;

        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          const prevStep = i > 0 ? steps[i - 1] : null;

          if (step.status !== 'pending') continue;

          // Due time = run start + sum of all preceding step durations
          let dueSumMs = 0;
          for (let j = 0; j < i; j++) {
            dueSumMs += stepDurationMinutes(steps[j]) * 60000;
          }
          const dueAt = runStart + dueSumMs;
          const diffMs = dueAt - now;

          // Early warning timing
          const precedingDurMin = prevStep ? stepDurationMinutes(prevStep) : 999;
          let earlyWarnMs;
          if (precedingDurMin <= 1) earlyWarnMs = 0;
          else if (precedingDurMin <= 5) earlyWarnMs = 60000;
          else earlyWarnMs = 5 * 60000;

          const psrid = step.psrid;
          const existing = next.get(psrid);

          let type;
          if (diffMs < 0) {
            type = 'overdue'; // was due in the past
          } else if (diffMs === 0 || diffMs < 30000) {
            type = 'now';
          } else if (diffMs <= earlyWarnMs) {
            type = 'upcoming';
          } else {
            // Not yet time to notify — but don't delete if already notified
            continue;
          }

          next.set(psrid, {
            psrid,
            prid: run.prid,
            process_name: run.process_name,
            step_name: step.step_name || step.name || `Step ${step.seq}`,
            dueAt,
            type,
            seenAt: existing?.seenAt || null,
            addedAt: existing?.addedAt || now,
          });
        }
      }
      return next;
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    compute();
    const interval = setInterval(compute, 30000);
    return () => clearInterval(interval);
  }, [user, compute]);

  const dismiss = useCallback(psrid => {
    if (typeof psrid === 'string' && psrid.startsWith('s')) {
      api.dismissStockNotifs([Number(psrid.slice(1))]).catch(() => {});
    }
    setNotifs(prev => { const next = new Map(prev); next.delete(psrid); return next; });
  }, []);

  const markSeen = useCallback(() => {
    setNotifs(prev => {
      const next = new Map(prev);
      const now2 = Date.now();
      const unseenStock = [];
      for (const [k, v] of next) {
        if (v.type === 'stock' && !v.seenAt) unseenStock.push(v.nid);
        next.set(k, { ...v, seenAt: v.seenAt || now2 });
      }
      if (unseenStock.length) api.markStockSeen(unseenStock).catch(() => {});
      return next;
    });
  }, []);

  const unseenCount = useMemo(() => {
    let n = 0;
    for (const v of notifs.values()) if (!v.seenAt) n++;
    return n;
  }, [notifs]);

  return { notifs, dismiss, markSeen, unseenCount, refresh: () => { compute(); loadStock(); }, period, setPeriod, showPeriod: isRestaurantUser };
}

function fmtNotifTime(dueAt, type) {
  const now = Date.now();
  if (type === 'now') return null; // text says "now"
  if (type === 'upcoming') {
    const diffMs = dueAt - now;
    const diffMin = Math.ceil(diffMs / 60000);
    if (diffMin < 60) return `${diffMin}m`;
    const h = Math.floor(diffMin / 60), m = diffMin % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  if (type === 'overdue') {
    const diffMs = now - dueAt;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `${diffMin}m`;
    const h = Math.floor(diffMin / 60), m = diffMin % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  return null;
}

function fmtNotifTs(addedAt) {
  if (!addedAt) return '';
  const d = new Date(addedAt);
  const now = new Date();
  const hm = d.toTimeString().slice(0,5);
  const today = now.toDateString();
  const yest = new Date(now - 86400000).toDateString();
  if (d.toDateString() === today) return `${hm} Today`;
  if (d.toDateString() === yest) return `${hm} Yesterday`;
  return `${hm} ${d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`;
}

function NotificationBell({ notifs, unseenCount, markSeen, dismiss, refresh, period, setPeriod, showPeriod }) {
  const [open, setOpen] = useState(false);
  const items = [...notifs.values()].sort((a, b) => b.addedAt - a.addedAt);
  const badge = unseenCount > 9 ? '9+' : unseenCount > 0 ? String(unseenCount) : null;

  const handlePlay = async (n) => {
    try {
      await api.startStep(n.prid, n.psrid);
      dismiss(n.psrid);
      refresh();
    } catch(e) {
      // silent — step might already be started
    }
  };

  return (
    <Popover open={open} onOpenChange={o=>{ if (o) markSeen(); setOpen(o); }}>
      <PopoverTrigger className={buttonVariants({ variant:"outline", size:"icon-sm", className:"relative me-1" })}
        aria-label={badge?`Notifications (${badge} new)`:"Notifications"}>
        <BellIcon/>
        {badge&&(
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-card bg-destructive px-0.5 font-bold text-[10px] text-white leading-none">
            {badge}
          </span>
        )}
      </PopoverTrigger>
      <PopoverPopup align="end" sideOffset={8} className="w-[min(360px,calc(100vw-24px))]">
        <div data-slot="notif-panel" className="-mx-4 -my-4 flex max-h-[min(480px,70vh)] flex-col">
          <div className="flex items-center justify-between border-border border-b px-4 py-2.5">
            <span className="font-semibold text-sm">Notifications</span>
            {items.length>0&&<Button variant="ghost" size="xs" className="text-muted-foreground" onClick={()=>{ items.forEach(n=>dismiss(n.psrid)); }}>Clear all</Button>}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {items.length===0
              ? <div className="flex flex-col items-center gap-2 px-4 py-8 text-muted-foreground text-sm"><BellIcon className="size-5 opacity-60"/>No notifications</div>
              : items.map(n => {
                  const timeStr = fmtNotifTime(n.dueAt, n.type);
                  let text;
                  if (n.type==='stock') text = n.text;
                  else if (n.type==='now') text = `${n.process_name} | ${n.step_name} is due to start now`;
                  else if (n.type==='overdue') text = `${n.process_name} | ${n.step_name} was due to start ${timeStr} ago`;
                  else text = `${n.process_name} | ${n.step_name} due to start in ${timeStr}`;
                  return (
                    <div key={n.psrid} data-slot="notif-item" className={`flex items-start gap-2.5 border-border border-b px-3.5 py-2.5 last:border-b-0 ${n.seenAt?"":"bg-accent/40"}`}>
                      {(n.type==='now'||n.type==='overdue')
                        ? <Button size="icon-xs" aria-label="Start step" title="Start step" className="mt-0.5" onClick={()=>handlePlay(n)}><PlayIcon/></Button>
                        : <span className="flex size-6 shrink-0 items-center justify-center text-muted-foreground">{n.type==='stock'?<PackageIcon className="size-4"/>:<ClockIcon className="size-4"/>}</span>}
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm leading-snug ${n.type==='overdue'?"text-destructive-foreground":""}`}>{String(text).split(/\*\*(.+?)\*\*/g).map((t,i)=>i%2?<strong key={i}>{t}</strong>:t)}</div>
                        <div className="mt-0.5 text-muted-foreground text-xs">{fmtNotifTs(n.addedAt)}</div>
                      </div>
                      <Button variant="ghost" size="icon-xs" aria-label="Dismiss" className="text-muted-foreground" onClick={()=>dismiss(n.psrid)}><XIcon/></Button>
                    </div>
                  );
                })}
          </div>
          {showPeriod&&(
            <div className="flex items-center gap-3 border-border border-t px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">Period</span>
              <SegmentedControl size="sm">
                {[['day','Day'],['week','Week'],['month','Month']].map(([v,l])=>(
                  <SegmentedControlItem key={v} data-checked={period===v?"":undefined} aria-pressed={period===v} onClick={()=>setPeriod(v)} className="px-2.5">{l}</SegmentedControlItem>
                ))}
              </SegmentedControl>
            </div>
          )}
        </div>
      </PopoverPopup>
    </Popover>
  );
}

function Nav({ user, page, setPage, logout, lang, setLang, notifProps, themePref, setThemePref }) {
  const isM = user?.is_manufacturer;
  const [cpOpen,     setCpOpen]     = useState(false);
  const [menuOpen,   setMenuOpen]   = useState(false);

  useEffect(()=>{
    const handler = e => {
      if (e.shiftKey && e.code==='Space') { e.preventDefault(); setCpOpen(true); }
    };
    window.addEventListener('keydown', handler);
    return ()=>window.removeEventListener('keydown', handler);
  },[]);
  const tl = k => lang==='ru' ? (RU[k]||k) : k;
  const links = isM
    ? [{key:"orders-manuf",label:tl("Orders")},{key:"inventory",label:tl("Inventory")},{key:"menus",label:tl("Menus")},{key:"procurement",label:tl("Procurement")},{key:"suppliers",label:tl("Suppliers")},{key:"reports",label:tl("Reports")},{key:"staff",label:tl("Staff")},{key:"processes",label:tl("Processes")},{key:"equipment",label:tl("Equipment")}]
    : user?.employer_uid ? [{key:"restaurants",label:tl("Restaurants")},{key:"market",label:tl("Marketplace")},{key:"orders-cust",label:tl("My Orders")},{key:"roster-emp",label:tl("My Roster")},{key:"processes-emp",label:tl("Processes")}]
    : [{key:"restaurants",label:tl("Restaurants")},{key:"market",label:tl("Marketplace")},{key:"orders-cust",label:tl("My Orders")}];
  const navigate = key => { if (key==="market") { window.location.assign("/market"); return; } setPage(key); setMenuOpen(false); };
  // Below this width the page links move into the hamburger sheet (the owner has 9 links, staff 2–4)
  // Russian labels are longer, so the owner's links collapse one breakpoint later
  const collapse = isM ? (lang==='ru' ? "2xl" : "xl") : "md";
  const COLLAPSE = { md:["md:hidden","hidden md:flex"], xl:["xl:hidden","hidden xl:flex"], "2xl":["2xl:hidden","hidden 2xl:flex"] }[collapse];
  const NAV_ICONS = { "orders-manuf":ReceiptTextIcon, inventory:PackageIcon, menus:BookOpenIcon, procurement:TruckIcon, suppliers:StoreIcon,
    reports:ChartColumnIcon, staff:UsersIcon, processes:WorkflowIcon, equipment:CookingPotIcon, restaurants:StoreIcon,
    "orders-cust":ReceiptTextIcon, "roster-emp":CalendarDaysIcon, "processes-emp":WorkflowIcon, market:ShoppingBasketIcon };
  const navActive = k => page===k || (k==="inventory" && (page==="products"||page==="items")) || (k==="orders-manuf" && page==="quick-sale");
  return (
    <>
    <nav className="sticky top-0 z-[300] flex h-14 items-center gap-1 border-b border-border bg-card/90 px-3 backdrop-blur supports-[backdrop-filter]:bg-card/75 sm:px-5">
      {/* Hamburger (narrow screens) */}
      <Button variant="ghost" size="icon-sm" aria-label="Open menu" aria-expanded={menuOpen} onClick={()=>setMenuOpen(true)}
        className={`-ms-1 me-1 shrink-0 ${COLLAPSE[0]}`}>
        <MenuIcon/>
      </Button>
      {/* Brand logo / name */}
      {user?.logo_url
        ? <img src={user.logo_url} alt={user.business_name||'logo'}
            onClick={()=>navigate(isM?"orders-manuf":"restaurants")}
            className="me-4 h-9 max-w-[140px] shrink-0 cursor-pointer object-contain"/>
        : <button type="button" data-slot="nav-brand" onClick={()=>navigate(isM?"orders-manuf":"restaurants")}
            className="me-3 max-w-[160px] shrink-0 truncate font-bold font-heading text-brand italic"
            style={{ fontSize:isM&&user?.business_name?15:20 }}>
            {isM && user?.business_name ? user.business_name : 'Pun&Cotta'}
          </button>}
      <div className={`min-w-0 flex-1 gap-0.5 overflow-x-auto [scrollbar-width:none] ${COLLAPSE[1]}`}>
        {links.map(l=>(
          <Button key={l.key} variant="ghost" size="sm" onClick={()=>navigate(l.key)} aria-current={navActive(l.key)?"page":undefined}
            className={`px-2 ${navActive(l.key) ? "bg-accent font-semibold text-accent-foreground" : "font-normal text-muted-foreground"}`}>
            {l.label}
          </Button>
        ))}
      </div>
      <div className={`flex-1 ${COLLAPSE[0]}`} aria-hidden/>
      <div className="flex shrink-0 items-center gap-1.5">
        {/* Notification bell */}
        {notifProps&&<NotificationBell {...notifProps}/>}
        {/* Search */}
        <NavSearchBar onClick={()=>setCpOpen(true)}/>
        {/* Language toggle */}
        <Button variant="ghost" size="sm" className="max-sm:px-1.5" onClick={()=>{ const nl=lang==='en'?'ru':'en'; _currentLang=nl; setLang(nl); }} aria-label="Language">
          <GlobeIcon className="max-sm:hidden"/>{lang==='en'?'RU':'EN'}
        </Button>
        {/* Theme switch */}
        <Menu>
          <MenuTrigger className={buttonVariants({ variant:"ghost", size:"icon-sm" })} aria-label="Theme" title="Theme">
            {themePref==='dark'?<MoonIcon/>:themePref==='light'?<SunIcon/>:<MonitorIcon/>}
          </MenuTrigger>
          <MenuPopup align="end" className="min-w-44">
            <MenuRadioGroup value={themePref} onValueChange={v=>setThemePref(v)}>
              <MenuRadioItem value="light"><span className="flex items-center gap-2"><SunIcon className="size-4 opacity-80"/>Light</span></MenuRadioItem>
              <MenuRadioItem value="dark"><span className="flex items-center gap-2"><MoonIcon className="size-4 opacity-80"/>Dark</span></MenuRadioItem>
              <MenuRadioItem value="system"><span className="flex items-center gap-2"><MonitorIcon className="size-4 opacity-80"/>System Default</span></MenuRadioItem>
            </MenuRadioGroup>
          </MenuPopup>
        </Menu>
        {/* User menu */}
        <Menu>
          <MenuTrigger className={buttonVariants({ variant:"outline", size:"sm", className:"max-w-[230px] max-sm:w-8 max-sm:px-0" })}>
            <CircleUserIcon/>
            <span className="truncate max-sm:sr-only">{user?.first_name||user?.email}{user?.restaurant?.name?` (${user.restaurant.name})`:""}</span>
            <ChevronDownIcon className="opacity-60 max-sm:hidden"/>
          </MenuTrigger>
          <MenuPopup align="end" className="min-w-48">
            {isM&&(<>
              <MenuItem onClick={()=>navigate("general")}><SettingsIcon/>General</MenuItem>
              <MenuItem onClick={()=>navigate("schedule")}><ClockIcon/>{tl("🕐 Schedule").replace(/^🕐\s*/,"")}</MenuItem>
              <MenuItem onClick={()=>navigate("embed")}><Link2Icon/>Embedded Menu</MenuItem>
              <MenuSeparator/>
            </>)}
            <MenuItem variant="destructive" onClick={()=>logout()}><LogOutIcon/>{tl("↩ Log out").replace(/^↩\s*/,"")}</MenuItem>
          </MenuPopup>
        </Menu>
      </div>
    </nav>
    <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
      <SheetPopup side="left" showCloseButton={false} className="w-[min(300px,85vw)]">
        <SheetHeader className="flex-row items-center justify-between gap-3 border-border border-b py-4">
          <SheetTitle className="truncate font-heading text-brand text-lg italic">{isM && user?.business_name ? user.business_name : 'Pun&Cotta'}</SheetTitle>
          <Button variant="ghost" size="icon-sm" aria-label="Close menu" onClick={()=>setMenuOpen(false)}><XIcon/></Button>
        </SheetHeader>
        <SheetPanel className="flex flex-col gap-1 py-3">
          <nav aria-label="Pages" className="flex flex-col gap-0.5">
            {links.map(l=>{ const Icon = NAV_ICONS[l.key]||ChevronRightIcon; const on = navActive(l.key); return (
              <button type="button" key={l.key} data-slot="nav-sheet-link" onClick={()=>navigate(l.key)} aria-current={on?"page":undefined}
                className={`flex h-10 items-center gap-3 rounded-lg px-3 text-start text-[15px] ${on?"bg-accent font-semibold text-accent-foreground":"text-foreground hover:bg-muted"}`}>
                <Icon className={`size-4.5 ${on?"":"text-muted-foreground"}`}/>{l.label}
              </button>
            ); })}
          </nav>
          {isM&&(<>
            <div className="my-2 border-border border-t"/>
            {[["general",SettingsIcon,"General"],["schedule",ClockIcon,tl("🕐 Schedule").replace(/^🕐\s*/,"")],["embed",Link2Icon,"Embedded Menu"]].map(([k,Icon,label])=>(
              <button type="button" key={k} data-slot="nav-sheet-link" onClick={()=>navigate(k)} aria-current={page===k?"page":undefined}
                className={`flex h-10 items-center gap-3 rounded-lg px-3 text-start text-[15px] ${page===k?"bg-accent font-semibold text-accent-foreground":"text-foreground hover:bg-muted"}`}>
                <Icon className={`size-4.5 ${page===k?"":"text-muted-foreground"}`}/>{label}
              </button>
            ))}
          </>)}
        </SheetPanel>
        <div className="border-border border-t px-6 py-4 text-muted-foreground text-xs">
          {user?.first_name||user?.email}{user?.restaurant?.name?` · ${user.restaurant.name}`:""}
        </div>
      </SheetPopup>
    </Sheet>
    {cpOpen&&<CommandPalette user={user} setPage={key=>{ setPage(key); setCpOpen(false); }} onClose={()=>setCpOpen(false)}/>}
    </>
  );
}

function Page({ children, title, actions }) {
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 sm:py-9" style={{ animation:"fadeIn 0.3s ease" }}>
      {(title||actions)&&(
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
          {title&&<h1 className="font-heading font-bold text-3xl text-foreground tracking-tight">{title}</h1>}
          {actions&&<div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// ─── SHELF LIFE (stored in hours, entered as hours / days / weeks) ─────────────
const SHELF_UNITS = [["hours",1],["days",24],["weeks",168]];
function fmtShelfLife(h) {
  const n = Number(h);
  if (!n) return "";
  const w = Math.floor(n / 168), d = Math.floor((n % 168) / 24), hh = Math.round((n % 24) * 100) / 100;
  const parts = [w && `${w} w`, d && `${d} d`, hh && `${hh} h`].filter(Boolean);
  return parts.join(" ") || `${n} h`;
}
function ShelfLifeInput({ value, onChange, compact }) {
  const init = () => {
    const n = Number(value);
    if (!n) return { amt: "", unit: "days" };
    if (n % 168 === 0) return { amt: String(n / 168), unit: "weeks" };
    if (n % 24 === 0) return { amt: String(n / 24), unit: "days" };
    return { amt: String(n), unit: "hours" };
  };
  const [st, setSt] = useState(init);
  const emit = (amt, unit) => {
    setSt({ amt, unit });
    const mult = SHELF_UNITS.find(u => u[0] === unit)[1];
    onChange(amt === "" || isNaN(Number(amt)) ? "" : String(Math.round(Number(amt) * mult * 100) / 100));
  };
  const units = SHELF_UNITS.map(([u])=>({label:u,value:u}));
  return (
    <div className="flex items-center gap-1">
      <CInput type="number" min="0" step="any" value={st.amt} placeholder="0" onChange={e => emit(e.target.value, st.unit)} aria-label="Shelf life"
        size={compact?"sm":"lg"} className={compact?"w-16":"flex-1"}/>
      <CSelect items={units} value={st.unit} onValueChange={v => emit(st.amt, v||"days")}>
        <SelectTrigger size={compact?"sm":"lg"} className="w-auto min-w-24" aria-label="Unit"><SelectValue/></SelectTrigger>
        <SelectPopup>{units.map(u=><SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectPopup>
      </CSelect>
    </div>
  );
}

// ─── AUTH PAGES ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin, setPage, setLang }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  const [gone, setGone] = useState(null);   // deleted restaurant: { restaurant_name, days_left } -> shows the "Restore" slide
  const restore = async() => {
    setErr(""); setLoading(true);
    try {
      const {token,user} = await api.restoreRestaurant(email,pw);
      localStorage.setItem("token",token); onLogin(user);
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  };
  const submit = async() => {
    setErr(""); setLoading(true);
    try {
      const {token,user} = await api.login(email,pw);
      localStorage.setItem("token",token); onLogin(user);
    } catch(e) {
      if (e.message === 'restaurant_deleted' && e.data?.can_restore) {
        setGone(e.data);
      } else if (e.message === 'restaurant_deleted') {
        setErr(`${e.data?.restaurant_name||'The restaurant'} has been deleted. Please contact its administrator.`);
      } else if (e.message === 'unverified_recent') {
        setErr("Please verify your email. A message has been sent earlier for you to confirm registration.");
      } else if (e.message === 'unverified_expired') {
        setErr("Your verification link has expired. Please register again.");
      } else {
        setErr(e.message);
      }
    } finally { setLoading(false); }
  };
  const slide = (on) => ({ width:"50%", visibility:on?"visible":"hidden", transition:"visibility 0s linear "+(on?"0s":"0.45s") });
  return (
    <CossAuthShell>
      <Card className="overflow-hidden">
        <div className="flex w-[200%] transition-transform duration-[450ms] ease-[cubic-bezier(.4,0,.2,1)]" style={{ transform:gone?"translateX(-50%)":"translateX(0)" }}>
          {/* Slide 1 — log in */}
          <form style={slide(!gone)} aria-hidden={!!gone} onSubmit={e=>{ e.preventDefault(); submit(); }} noValidate>
            <CardHeader>
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>{tl("Log in to your Tanelu account.")}</CardDescription>
            </CardHeader>
            <CardPanel className="flex flex-col gap-4 pt-0">
              <Field>
                <FieldLabel>{tl("Email")}</FieldLabel>
                <CInput type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" size="lg" required tabIndex={gone?-1:undefined} />
              </Field>
              <Field>
                <div className="flex w-full items-center justify-between">
                  <FieldLabel>{tl("Password")}</FieldLabel>
                  <button type="button" onClick={()=>setPage("forgot")} tabIndex={gone?-1:undefined}
                    className="text-brand text-sm hover:underline underline-offset-4">Forgot password?</button>
                </div>
                <CInput type="password" autoComplete="current-password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" size="lg" required aria-invalid={!!err&&!gone||undefined} tabIndex={gone?-1:undefined} />
              </Field>
              {err&&!gone&&(
                <Alert variant="error"><AlertDescription>{err}</AlertDescription></Alert>
              )}
              <Button type="submit" size="lg" loading={loading} className="w-full" tabIndex={gone?-1:undefined}>Log in</Button>
            </CardPanel>
            <CardFooter className="justify-center gap-1 border-t pt-4 text-muted-foreground text-sm">
              {tl("New to Tanelu?")}
              <button type="button" onClick={()=>setPage("signup")} tabIndex={gone?-1:undefined}
                className="font-medium text-foreground hover:underline underline-offset-4">{tl("Create account →")}</button>
            </CardFooter>
          </form>
          {/* Slide 2 — restore a deleted restaurant */}
          <div style={slide(!!gone)} aria-hidden={!gone}>
            <CardHeader>
              <CardTitle className="text-2xl">{tl("Restore")}</CardTitle>
              <CardDescription>{gone?.restaurant_name}</CardDescription>
            </CardHeader>
            <CardPanel className="flex flex-col gap-4 pt-0">
              <Alert variant="warning">
                <AlertDescription>
                  <p><b>{gone?.restaurant_name}</b> will be deleted in {gone?.days_left} {gone?.days_left===1?"day":"days"}. If you wish to resume operation, click Restore button. Otherwise click "Log in →" to login with a different account.</p>
                </AlertDescription>
              </Alert>
              {err&&gone&&(<Alert variant="error"><AlertDescription>{err}</AlertDescription></Alert>)}
              <Button size="lg" loading={loading} className="w-full" onClick={restore} tabIndex={gone?undefined:-1}>{tl("Restore")}</Button>
              <Button variant="ghost" className="w-full" tabIndex={gone?undefined:-1}
                onClick={()=>{ setGone(null); setPw(""); setErr(""); }}>{tl("Log in →")}</Button>
            </CardPanel>
          </div>
        </div>
      </Card>
      <p className="mt-4 text-center text-muted-foreground text-xs leading-relaxed">
        <span className="font-semibold">Demo:</span> sophie@example.com / password · arman@puncotta.com / password
      </p>
    </CossAuthShell>
  );
}

// Auth screen frame for the coss ui screens (login): cream background, animated logo, centred card
function CossAuthShell({ children, wide }) {
  return (
    <div className="coss flex min-h-screen items-center justify-center p-4 sm:p-6"
      style={{ backgroundImage:"radial-gradient(circle at 20% 20%, rgba(200,135,58,0.10) 0%, transparent 60%), radial-gradient(circle at 85% 90%, rgba(61,11,69,0.06) 0%, transparent 55%)" }}>
      <div className={`w-full ${wide?"max-w-[480px]":"max-w-[420px]"}`} style={{ animation:"fadeIn 0.4s ease" }}>
        <div className="mx-auto mb-6 size-24">
          <svg className="tn-logo" viewBox="190 200 700 700" role="img" aria-label="Tanelu">
            <g className="tn-board"><circle cx="540" cy="673" r="208"/><rect className="tn-bar" x="288.75" y="224.75" width="502.5" height="232.5"/></g>
            <g className="tn-wink" style={{ opacity:0 }}><ellipse className="tn-eye" cx="541.25" cy="671.25" rx="206.25" ry="210"/><rect className="tn-brow" x="292.5" y="225" width="502.5" height="232.5"/></g>
          </svg>
        </div>
        {children}
      </div>
    </div>
  );
}

// Auth form card: title, optional description / header action, body, optional footer.
// With onSubmit the body is a <form>, so Enter submits.
function AuthCard({ title, description, action, children, footer, onSubmit, wide }) {
  const Body = onSubmit ? "form" : "div";
  return (
    <CossAuthShell wide={wide}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{title}</CardTitle>
          {description&&<CardDescription>{description}</CardDescription>}
          {action&&<CardAction>{action}</CardAction>}
        </CardHeader>
        <Body className="flex flex-col gap-4 px-6 pb-6" {...(onSubmit?{ noValidate:true, onSubmit:e=>{ e.preventDefault(); onSubmit(); } }:{})}>
          {children}
        </Body>
        {footer&&<CardFooter className="justify-center gap-1 border-t pt-4 text-muted-foreground text-sm">{footer}</CardFooter>}
      </Card>
    </CossAuthShell>
  );
}

// Result / status card (sent, done, expired…): icon, title, message, action
const AUTH_TONES = { brand:"bg-accent text-brand", success:"bg-success/12 text-success-foreground", error:"bg-destructive/10 text-destructive-foreground" };
function AuthStatus({ icon:Icon, tone="brand", title, children, action, loading }) {
  return (
    <CossAuthShell>
      <Card>
        <CardPanel className="flex flex-col items-center gap-3 py-10 text-center">
          {loading ? <Spinner/> : Icon && (
            <span className={`mb-1 flex size-12 items-center justify-center rounded-full ${AUTH_TONES[tone]}`}><Icon className="size-6"/></span>
          )}
          {title&&<h2 className="font-heading font-semibold text-2xl">{title}</h2>}
          {children&&<div className="max-w-sm text-muted-foreground text-sm leading-relaxed">{children}</div>}
          {action&&<div className="mt-3">{action}</div>}
        </CardPanel>
      </Card>
    </CossAuthShell>
  );
}

const linkBtn = "font-medium text-foreground underline-offset-4 hover:underline";

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
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try { await api.register(form); setRegistered(true); }
    catch(err){ if(err.message.includes("already exists")) setErrors({email:err.message}); else toast(err.message,"error"); }
    finally { setLoading(false); }
  };
  if (registered) return (
    <AuthStatus icon={MailCheckIcon} title={tl("Check your inbox")}
      action={<Button variant="outline" onClick={()=>setPage("login")}><ArrowLeftIcon/>{tl("Back to login")}</Button>}>
      {tl("Please, check your email to find a welcome message. If you haven't received any, please check your spam folder. If nonetheless the message didn't make it to your email, repeat registration making sure you entered a correct email.")}
    </AuthStatus>
  );
  return (
    <AuthCard wide title={tl("Create your account")} onSubmit={submit}
      action={<Button variant="ghost" size="sm" onClick={()=>{ const nl=lang==='en'?'ru':'en'; _currentLang=nl; setLang(nl); }} aria-label="Language"><GlobeIcon/>{lang==='en'?'RU':'EN'}</Button>}
      footer={<>{tl("Already have an account?")}<button type="button" className={linkBtn} onClick={()=>setPage("login")}>{tl("Log in →")}</button></>}>
      <div className="flex flex-col gap-2">
        <span className="font-medium text-sm">{tl("I am a…")}</span>
        <RadioGroup value={form.is_manufacturer?"m":"c"} onValueChange={v=>set("is_manufacturer",v==="m")} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[["c",tl("Customer"),StoreIcon],["m",tl("Manufacturer"),ChefHatIcon]].map(([v,l,Ic])=>(
            <Label key={v} className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border p-2.5 has-data-checked:border-primary/48 has-data-checked:bg-accent/50 sm:gap-2.5 sm:p-3">
              <Radio value={v}/><Ic className="size-4 shrink-0 text-muted-foreground"/><span className="truncate">{l}</span>
            </Label>
          ))}
        </RadioGroup>
      </div>
      {form.is_manufacturer&&<Input label={tl("Business name")} value={form.business_name} onChange={v=>set("business_name",v)} required error={errors.business_name} />}
      <div className="grid grid-cols-2 gap-3">
        <Input label={tl("First name")} value={form.first_name} onChange={v=>set("first_name",v)} required error={errors.first_name} />
        <Input label={tl("Last name")}  value={form.last_name}  onChange={v=>set("last_name",v)}  required error={errors.last_name} />
      </div>
      <Input label={tl("Email")} type="email" value={form.email} onChange={v=>set("email",v)} required error={errors.email} />
      <Input label={tl("Password")} type="password" value={form.password} onChange={v=>set("password",v)} required error={errors.password} hint={tl("Min 6 characters")} />
      <Input label={tl("Phone")} value={form.phone} onChange={v=>set("phone",v)} placeholder="+374 91 …" />
      <Input label={tl("Street address")} value={form.street_address} onChange={v=>set("street_address",v)} />
      <div className="grid grid-cols-2 gap-3">
        <Input label={tl("City")} value={form.city} onChange={v=>set("city",v)} />
        <Input label={tl("ZIP")}  value={form.zip}  onChange={v=>set("zip",v)} />
      </div>
      <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">{tl("Create account")}</Button>
    </AuthCard>
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
    <AuthStatus icon={MailCheckIcon} title={tl("Check your inbox")}
      action={<Button variant="outline" onClick={()=>setPage("login")}><ArrowLeftIcon/>{tl("Back to login")}</Button>}>
      If <b className="text-foreground">{email}</b> is registered, a password reset link has been sent. It's valid for 1 hour.
      Check your spam folder if you don't see it.
    </AuthStatus>
  );
  return (
    <AuthCard title={tl("Reset password")} description={tl("Enter your email and we'll send a recovery link valid for 1 hour.")} onSubmit={submit}
      footer={<button type="button" className={`${linkBtn} inline-flex items-center gap-1`} onClick={()=>setPage("login")}><ArrowLeftIcon className="size-3.5"/>{tl("Back to login")}</button>}>
      <Input label={tl("Email")} type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
      <Button type="submit" size="lg" loading={loading} className="w-full">{tl("Send recovery link")}</Button>
    </AuthCard>
  );
}

// ─── DATA TABLE ───────────────────────────────────────────────────────────────
function DataTable({ columns, rows, selected, onSelect, onSelectAll, sortKey, sortDir, onSort }) {
  const allSel = rows.length>0 && rows.every(r=>selected.includes(r._id));
  const someSel = !allSel && rows.some(r=>selected.includes(r._id));
  return (
    <TableShell>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-11 ps-4">
              <Checkbox aria-label="Select all" checked={allSel} indeterminate={someSel} onCheckedChange={()=>onSelectAll(allSel?[]:rows.map(r=>r._id))}/>
            </TableHead>
            {columns.map(c=>(
              <SortHead key={c.key} label={c.label} sortable={c.sortable!==false&&!!onSort} active={sortKey===c.key} dir={sortDir} onClick={()=>onSort&&onSort(c.key)}/>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length===0?(
            <TableRow className="hover:bg-transparent"><TableCell colSpan={columns.length+1} className="py-10 text-center text-muted-foreground">No items yet.</TableCell></TableRow>
          ):rows.map(r=>(
            <TableRow key={r._id} data-state={selected.includes(r._id)?"selected":undefined}>
              <TableCell className="ps-4"><Checkbox aria-label="Select row" checked={selected.includes(r._id)} onCheckedChange={()=>onSelect(r._id)}/></TableCell>
              {columns.map(c=>(
                <TableCell key={c.key} className={CELL}>{c.render?c.render(r):r[c.key]}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableShell>
  );
}

// ── Shared coss building blocks for the app screens ──────────────────────────
const CELL = "px-4 py-3 whitespace-normal leading-snug text-sm";
function TableShell({ children, className="" }) {
  return <div className={`overflow-x-auto rounded-2xl border border-border bg-card shadow-xs/5 [&_thead_tr]:bg-muted ${className}`}>{children}</div>;
}
function SortHead({ label, sortable=true, active, dir, onClick, className="" }) {
  const cls = `h-11 px-4 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider ${className}`;
  if (!sortable) return <TableHead className={cls}>{label}</TableHead>;
  return (
    <TableHead className={cls} aria-sort={active?(dir==="asc"?"ascending":"descending"):undefined}>
      <button type="button" data-slot="sort-button" onClick={onClick} className="-mx-1 inline-flex items-center gap-1 rounded-sm px-1 uppercase hover:text-foreground">
        {label}{active ? (dir==="asc"?<ArrowUpIcon className="size-3"/>:<ArrowDownIcon className="size-3"/>) : <ChevronsUpDownIcon className="size-3 opacity-40"/>}
      </button>
    </TableHead>
  );
}
// Rows-per-page + first/prev/next/last
function TablePager({ total, page, pageCount, pageSize, sizes=[10,25,50,100], onPage, onPageSize, label }) {
  const last = Math.max(0, pageCount-1);
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-muted-foreground text-sm">
      <div className="flex items-center gap-2">
        <span>Rows per page:</span>
        <SegmentedControl size="sm">
          {sizes.map(n=><SegmentedControlItem key={n} data-checked={pageSize===n?"":undefined} onClick={()=>onPageSize(n)} className="px-2.5">{n}</SegmentedControlItem>)}
        </SegmentedControl>
      </div>
      <div className="flex items-center gap-1">
        <span className="me-2">{label ?? `${total} · page ${pageCount?page+1:0}/${pageCount}`}</span>
        <Button variant="outline" size="icon-sm" aria-label="First page" disabled={page===0} onClick={()=>onPage(0)}><ChevronsLeftIcon/></Button>
        <Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={page===0} onClick={()=>onPage(Math.max(0,page-1))}><ChevronLeftIcon/></Button>
        <Button variant="outline" size="icon-sm" aria-label="Next page" disabled={page>=last} onClick={()=>onPage(Math.min(last,page+1))}><ChevronRightIcon/></Button>
        <Button variant="outline" size="icon-sm" aria-label="Last page" disabled={page>=last} onClick={()=>onPage(last)}><ChevronsRightIcon/></Button>
      </div>
    </div>
  );
}
function SearchField({ value, onChange, onClear, placeholder="Search…", className="w-44" }) {
  return (
    <div className={`relative ${className}`}>
      <SearchIcon className="-translate-y-1/2 pointer-events-none absolute start-2.5 top-1/2 z-10 size-4 text-muted-foreground"/>
      <CInput value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="[&_input]:ps-8 [&_input]:pe-7"/>
      {value&&<button type="button" data-slot="search-clear" aria-label="Clear search" onClick={onClear||(()=>onChange(""))}
        className="-translate-y-1/2 absolute end-1.5 top-1/2 z-10 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"><XIcon className="size-3.5"/></button>}
    </div>
  );
}
function DateField({ value, onChange, min, max, label, className="w-auto", size }) {
  return <CInput type="date" value={value} min={min} max={max} size={size} onChange={e=>onChange(e.target.value)} aria-label={label} className={`${className} [&_input]:[color-scheme:light] dark:[&_input]:[color-scheme:dark]`}/>;
}
// −  n  +  stepper used in order pickers and carts
function QtyStepper({ value, onDec, onInc, decDisabled, incDisabled, label="item", display }) {
  return (
    <div className="inline-flex items-center gap-1">
      <Button variant="outline" size="icon-xs" aria-label={`Remove one ${label}`} disabled={decDisabled??value<=0} onClick={onDec}><MinusIcon/></Button>
      <span className="min-w-7 text-center font-semibold tabular-nums text-sm">{display??value}</span>
      <Button variant="outline" size="icon-xs" aria-label={`Add one ${label}`} disabled={incDisabled} onClick={onInc}><PlusIcon/></Button>
    </div>
  );
}
// Pop-up form: coss Dialog with title, scrollable body and footer
// ── Unsaved-changes guard ─────────────────────────────────────────────────────
// A page with unsaved work registers { dirty(), save() }; App asks before navigating away,
// and the browser asks before the tab is closed or reloaded.
let _leaveGuard = null;
function useLeaveGuard(dirty, save) {
  const ref = useRef({ dirty, save });
  ref.current = { dirty, save };
  useEffect(()=>{
    const g = { dirty: ()=>!!ref.current.dirty, save: ()=>ref.current.save() };
    _leaveGuard = g;
    return ()=>{ if (_leaveGuard === g) _leaveGuard = null; };
  },[]);
  useEffect(()=>{
    if (!dirty) return;
    const h = e => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return ()=>window.removeEventListener("beforeunload", h);
  },[dirty]);
}
// "Save it or lose it?" — used when leaving an unsaved draft
function UnsavedDialog({ open, title="Save your changes?", description, saveLabel="Save draft", saving, onSave, onDiscard, onCancel }) {
  if (!open) return null;
  return (
    <Modal onClose={onCancel} title={title} className="max-w-md"
      description={description||"You have unsaved changes. Save them before leaving, or they will be lost."}
      footer={<>
        <Btn variant="ghost" onClick={onCancel}>Keep editing</Btn>
        <div className="flex gap-2">
          <Btn variant="secondary" onClick={onDiscard} style={{ color:"var(--destructive-foreground)" }}><Trash2Icon/>Discard</Btn>
          <Btn onClick={onSave} loading={saving}><CheckIcon/>{saveLabel}</Btn>
        </div>
      </>}/>
  );
}

function Modal({ open=true, onClose, title, description, children, footer, className="max-w-lg", headerAction }) {
  return (
    <CDialog open={open} onOpenChange={o=>{ if(!o) onClose?.(); }}>
      <DialogPopup showCloseButton={false} className={className}>
        <DialogHeader className="pe-12">
          <DialogTitle className="font-heading text-xl">{title}</DialogTitle>
          {description&&<DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="absolute end-2 top-2 flex items-center gap-1">
          {headerAction}
          <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}><XIcon/></Button>
        </div>
        {children&&<DialogPanel>{children}</DialogPanel>}
        {footer&&<DialogFooter className="items-center sm:justify-between">{footer}</DialogFooter>}
      </DialogPopup>
    </CDialog>
  );
}
function FieldBlock({ label, required, children, hint }) {
  return (
    <div className="flex flex-col gap-2">
      {label&&<span className="font-medium text-sm">{label}{required&&<span className="ms-0.5 text-brand">*</span>}</span>}
      {children}
      {hint&&<span className="text-muted-foreground text-xs">{hint}</span>}
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
  const [showNewSupplierInline, setShowNewSupplierInline] = useState(false);
  const [newSupplierForm, setNewSupplierForm] = useState({name:"",email:"",phone:"",street_address:"",city:"",zip:""});
  const [savingNewSupplier, setSavingNewSupplier] = useState(false);
  const [stock, setStock]           = useState({}); // pid → qty
  const [wastageMode, setWastageMode] = useState(false);
  const [wastageDeltas, setWastageDeltas] = useState({}); // pid → negative delta
  const [wastageConfirm, setWastageConfirm] = useState(false);
  const [applyingWastage, setApplyingWastage] = useState(false);
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

  const saveNewSupplierInline = async () => {
    if (!newSupplierForm.name.trim()) { toast("Name required","error"); return; }
    setSavingNewSupplier(true);
    try {
      const s = await api.createSupplier(newSupplierForm);
      setSuppliers(p=>[...p,s]);
      setLinkSid(String(s.sid));
      setShowNewSupplierInline(false);
      setNewSupplierForm({name:"",email:"",phone:"",street_address:"",city:"",zip:""});
      toast(`"${s.name}" created`);
    } catch(e){ toast(e.message,"error"); } finally{ setSavingNewSupplier(false); }
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
    {key:"pid",      label:tl("ID"),         sortable:true,  render:r=><span className="text-muted-foreground text-xs tabular-nums">#{r._id}</span>},
    {key:"name",     label:tl("Name"),        sortable:true,  render:r=>(
      <button type="button" data-slot="link" onClick={()=>openEdit(r)} className="text-left underline decoration-dotted underline-offset-4 hover:text-brand">{r.name}</button>
    )},
    {key:"sku",      label:tl("SKU"),         sortable:true,  render:r=>r.sku||<span className="text-muted-foreground">—</span>},
    {key:"category", label:tl("Category"),    sortable:true,  render:r=>r.category?<Badge>{r.category}</Badge>:<span className="text-muted-foreground">—</span>},
    {key:"expiry",   label:tl("Expiry"), sortable:false, render:r=>(
      editPid===r.pid ? (
        <div className="flex items-center gap-1">
          <ShelfLifeInput key={r.pid} compact value={editExpiry} onChange={setEditExpiry} />
          <Button size="icon-xs" aria-label="Save expiry" onClick={()=>saveExpiry(r.pid)}><CheckIcon/></Button>
          <Button size="icon-xs" variant="ghost" aria-label="Cancel" onClick={()=>setEditPid(null)}><XIcon/></Button>
        </div>
      ) : (
        <Button variant="ghost" size="xs" className={r.expiry_hours?"":"text-brand"} onClick={()=>{setEditPid(r.pid);setEditExpiry(r.expiry_hours||"");}}>
          {r.expiry_hours?fmtShelfLife(r.expiry_hours):<><PlusIcon/>Set</>}
        </Button>
      )
    )},
    {key:"suppliers", label:tl("Suppliers"), sortable:false, render:r=>{
      const links = procLinks.filter(l=>l.pid===r.pid);
      return (
        <div className="flex min-w-44 flex-col gap-1">
          {links.map(l=>(
            <div key={l.psid} className="flex items-center gap-1.5 text-xs">
              <span className="flex-1">{l.supplier_name}</span>
              {l.price&&<span className="font-semibold text-brand tabular-nums">{l.price} {l.currency}</span>}
              <Button variant="ghost" size="icon-xs" aria-label={`Unlink ${l.supplier_name}`} onClick={()=>unlinkSupplier(l.sid,l.psid)}><XIcon/></Button>
            </div>
          ))}
          {linkPid===r.pid ? (
            <div className="mt-1 flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-1">
                <CSelect items={[...suppliers.map(sp=>({label:sp.name,value:String(sp.sid)})),{label:"+ New supplier…",value:"__new__"}]} value={linkSid||null}
                  onValueChange={v=>{ if(v==="__new__"){ setShowNewSupplierInline(true); } else { setLinkSid(v||""); setShowNewSupplierInline(false); } }}>
                  <SelectTrigger size="sm" className="w-36"><SelectValue placeholder="Supplier…"/></SelectTrigger>
                  <SelectPopup>{suppliers.map(sp=><SelectItem key={sp.sid} value={String(sp.sid)}>{sp.name}</SelectItem>)}<SelectItem value="__new__">+ New supplier…</SelectItem></SelectPopup>
                </CSelect>
                <CInput size="sm" type="number" value={linkPrice} onChange={e=>setLinkPrice(e.target.value)} placeholder="Price" aria-label="Price" className="w-20"/>
                <CSelect items={["AMD","USD","EUR","RUR"].map(c=>({label:c,value:c}))} value={linkCurrency} onValueChange={v=>setLinkCurrency(v||"AMD")}>
                  <SelectTrigger size="sm" className="w-20" aria-label="Currency"><SelectValue/></SelectTrigger>
                  <SelectPopup>{["AMD","USD","EUR","RUR"].map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectPopup>
                </CSelect>
                <Button size="sm" onClick={linkSupplier}>Link</Button>
                <Button variant="ghost" size="icon-sm" aria-label="Cancel" onClick={()=>{setLinkPid(null);setShowNewSupplierInline(false);}}><XIcon/></Button>
              </div>
              {showNewSupplierInline&&(
                <div className="flex flex-col gap-2 rounded-lg bg-muted p-3">
                  <p className="font-semibold text-xs">New Supplier</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <CInput size="sm" placeholder="Name *" aria-label="Name" value={newSupplierForm.name} onChange={e=>setNewSupplierForm(p=>({...p,name:e.target.value}))} className="col-span-2"/>
                    <CInput size="sm" placeholder="Email" aria-label="Email" value={newSupplierForm.email} onChange={e=>setNewSupplierForm(p=>({...p,email:e.target.value}))}/>
                    <CInput size="sm" placeholder="Phone" aria-label="Phone" value={newSupplierForm.phone} onChange={e=>setNewSupplierForm(p=>({...p,phone:e.target.value}))}/>
                    <CInput size="sm" placeholder="Street address" aria-label="Street address" value={newSupplierForm.street_address} onChange={e=>setNewSupplierForm(p=>({...p,street_address:e.target.value}))}/>
                    <CInput size="sm" placeholder="City" aria-label="City" value={newSupplierForm.city} onChange={e=>setNewSupplierForm(p=>({...p,city:e.target.value}))}/>
                  </div>
                  <div className="flex gap-1.5">
                    <Btn size="sm" onClick={saveNewSupplierInline} loading={savingNewSupplier}>Save supplier</Btn>
                    <Btn size="sm" variant="ghost" onClick={()=>setShowNewSupplierInline(false)}>Cancel</Btn>
                  </div>
                </div>
              )}
            </div>
          ):(
            <Button variant="ghost" size="xs" className="-ms-2 self-start text-brand" onClick={()=>{setLinkPid(r.pid);setLinkSid("");setLinkPrice("");}}>
              <PlusIcon/>Add supplier
            </Button>
          )}
        </div>
      );
    }},
    {key:"stock", label:tl("Stock"), sortable:false, render:r=>{
      const qty = stock[r.pid] ?? 0;
      const delta = wastageDeltas[r.pid] ?? 0;
      const displayed = qty + delta;
      const bumpW = d => setWastageDeltas(p=>{
        const cur = p[r.pid]??0;
        const next = d>0 ? Math.min(0, cur + 1) : Math.max(-qty, cur - 1); // stays between −stock and 0
        return next===0 ? Object.fromEntries(Object.entries(p).filter(([k])=>k!==String(r.pid))) : {...p,[r.pid]:next};
      });
      if (wastageMode) return (
        <div className="flex items-center gap-1.5">
          <QtyStepper value={displayed} label={r.name} display={<span className={displayed<qty?"text-destructive-foreground":""}>{displayed}</span>}
            onDec={()=>bumpW(-1)} decDisabled={displayed<=0} onInc={()=>bumpW(1)} incDisabled={delta===0}/>
          {delta<0&&<span className="text-[11px] text-destructive-foreground tabular-nums">{delta}</span>}
        </div>
      );
      return qty!=null ? <span className={`font-semibold tabular-nums ${qty>0?"":"text-destructive-foreground"}`}>{qty}</span> : <span className="text-muted-foreground">—</span>;
    }},
    {key:"forecast", label:(()=>{
      const fc = Object.values(forecast)[0];
      const start = fc?.period_start ? new Date(fc.period_start) : null;
      const end   = fc?.period_end   ? new Date(fc.period_end)   : null;
      const fmt = d => d ? `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()} 08:00 AM` : "—";
      return (
        <span title={start&&end?`from ${fmt(start)} to ${fmt(end)}`:""} className="cursor-help underline decoration-dotted underline-offset-4">
          {tl("Forecast")}
        </span>
      );
    })(), sortable:false, render:r=>{
      const fc = forecast[r.pid];
      return <Sparkline series={fc?.series||[]} tg={fc?.tg??0} />;
    }},
    {key:"units",    label:tl("Units"),       sortable:false, render:r=>r.units||<span className="text-muted-foreground">—</span>},
  ];

  return (
    <Page title={tl("Products")} actions={<div className="flex flex-wrap gap-2">
      {selected.length>0&&!wastageMode&&<Btn variant="danger" size="sm" onClick={openDeleteDialog}>{tl("Delete")} ({selected.length})</Btn>}
      {wastageMode && Object.keys(wastageDeltas).length>0 && (
        <Btn size="sm" onClick={()=>setWastageConfirm(true)}>Confirm</Btn>
      )}
      {wastageMode
        ? <Btn variant="secondary" size="sm" onClick={()=>{ setWastageMode(false); setWastageDeltas({}); }}>Cancel wastage</Btn>
        : <Btn variant="secondary" size="sm" onClick={()=>setWastageMode(true)}>Wastage</Btn>
      }
      <Btn variant="secondary" size="sm" onClick={refreshForecast} loading={refreshingForecast}>↻ Forecast</Btn>
      {!wastageMode&&<Btn size="sm" onClick={()=>setShowForm(s=>!s)}>{tl("+ Product")}</Btn>}
    </div>}>
      {showForm&&(
        <Card className="mb-5" style={{ animation:"fadeIn 0.2s ease" }}>
          <CardHeader><CardTitle>New Product</CardTitle></CardHeader>
          <CardPanel className="pt-0">
            <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              <Input label={tl("Name")} value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} required />
              <Input label={tl("SKU")} value={form.sku} onChange={v=>setForm(p=>({...p,sku:v}))} placeholder="Optional" />
              <Select label={tl("Units")} value={form.unid} onChange={v=>setForm(p=>({...p,unid:v}))} options={lookups.units.map(u=>({value:String(u.unid),label:u.name}))} placeholder="Select units" />
              <Select label={tl("Category")} value={form.caid} onChange={v=>setForm(p=>({...p,caid:v}))} options={lookups.categories.map(c=>({value:String(c.caid),label:c.name}))} placeholder="Select category" />
            </div>
            <div className="flex gap-2.5">
              <Btn size="sm" onClick={save} loading={saving}>{tl("Save")}</Btn>
              <Btn variant="ghost" size="sm" onClick={()=>setShowForm(false)}>{tl("Cancel")}</Btn>
            </div>
          </CardPanel>
        </Card>
      )}
      {loading?<Spinner/>:<DataTable columns={cols} rows={sorted.map(p=>({...p,_id:p.pid}))} selected={selected} onSelect={toggleSel} onSelectAll={setSelected} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />}
      {editProduct&&(
        <Modal title="Edit Product" onClose={()=>setEditProduct(null)}
          footer={<><span/><div className="flex gap-2"><Btn variant="ghost" size="sm" onClick={()=>setEditProduct(null)}>{tl("Cancel")}</Btn><Btn size="sm" onClick={saveEdit} loading={saving}>{tl("Save")}</Btn></div></>}>
          <div className="flex flex-col gap-3.5">
            <Input label={tl("Name")} value={editForm.name||""} onChange={v=>setEditForm(p=>({...p,name:v}))} required />
            <Input label={tl("SKU")} value={editForm.sku||""} onChange={v=>setEditForm(p=>({...p,sku:v}))} placeholder="Optional" />
            <Select label={tl("Units")} value={editForm.unid||""} onChange={v=>setEditForm(p=>({...p,unid:v}))} options={lookups.units.map(u=>({value:String(u.unid),label:u.name}))} placeholder="Select units" />
            <Select label={tl("Category")} value={editForm.caid||""} onChange={v=>setEditForm(p=>({...p,caid:v}))} options={lookups.categories.map(c=>({value:String(c.caid),label:c.name}))} placeholder="Select category" />
          </div>
        </Modal>
      )}
      {wastageConfirm&&(
        <Modal title="Confirm wastage" onClose={()=>setWastageConfirm(false)}
          description="The following products will be wasted, and stock levels shall be changed accordingly. The action is irreversible. Are you sure you wish to proceed?"
          footer={<><span/><div className="flex gap-2">
            <Btn variant="ghost" size="sm" onClick={()=>setWastageConfirm(false)}>Cancel</Btn>
            <Btn size="sm" loading={applyingWastage} onClick={async()=>{
              setApplyingWastage(true);
              try {
                const changes = Object.entries(wastageDeltas)
                  .filter(([,d])=>d<0)
                  .map(([pid,delta])=>({pid:Number(pid),delta}));
                const updated = await api.applyWastage({changes});
                const newStock = {};
                (updated||[]).forEach(s=>{ newStock[s.pid]=Number(s.qty); });
                setStock(newStock);
                setWastageMode(false);
                setWastageDeltas({});
                setWastageConfirm(false);
                toast("Wastage applied");
              } catch(e){ toast(e.message,"error"); }
              finally{ setApplyingWastage(false); }
            }}>OK</Btn></div></>}>
          <div className="rounded-lg bg-muted px-4 py-2">
            {Object.entries(wastageDeltas).filter(([,d])=>d<0).map(([pid,delta])=>{
              const prod = products.find(p=>String(p.pid)===pid);
              return (
                <div key={pid} className="flex justify-between border-b py-1.5 text-sm last:border-b-0">
                  <span className="font-semibold">{prod?.name||pid}</span>
                  <span className="font-semibold text-destructive-foreground tabular-nums">{delta} {prod?.units||''}</span>
                </div>
              );
            })}
          </div>
        </Modal>
      )}
      {dialog==="del"&&(
        <Modal title={tl("Delete product?")} onClose={()=>{setDialog(null);setUsageMap({});}}
          footer={<><span/><div className="flex gap-2">
            <Btn variant="ghost" onClick={()=>{setDialog(null);setUsageMap({});}}>{tl("Cancel")}</Btn>
            <Btn variant="danger" onClick={()=>doDelete(affectedItems.length>0)}>{tl("Yes")}</Btn></div></>}>
          {affectedItems.length===0 ? (
            <p className="text-muted-foreground leading-relaxed">
              {tl("Are you sure you wish to delete")} <b className="text-foreground">{selectedNames.join(", ")}</b>? {tl("This action may not be undone.")}
            </p>
          ) : (
            <p className="text-muted-foreground leading-relaxed">
              <b className="text-foreground">{selectedNames.join(", ")}</b> {tl("is included in the following items:")}{" "}
              <b className="text-foreground">{affectedItems.map(r=>r.name).join(", ")}</b>.{" "}
              {tl("Unless these items are deleted, the product may not be deleted either. Do you wish to remove the above items along with the product?")}{" "}
              {tl("This action may not be undone.")}
            </p>
          )}
        </Modal>
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
  // Wastage + stock
  const [recipeStock,   setRecipeStock]   = useState({}); // rid → qty
  const [wastageMode,   setWastageMode]   = useState(false);
  const [wastageDeltas, setWastageDeltas] = useState({}); // rid → negative delta
  const [editMinRid, setEditMinRid] = useState(null);
  const [editMinVal, setEditMinVal] = useState("");
  const saveMinInv = async (rid) => {
    const n = Math.max(0, Number(editMinVal) || 0);
    try {
      await api.setMinInventory({rid, min_inventory:n});
      setRecipes(p=>p.map(x=>x.rid===rid?{...x,min_inventory:n}:x));
      setEditMinRid(null); toast("Minimum saved");
    } catch(e){ toast(e.message,"error"); }
  };
  const [wastageConfirm,setWastageConfirm]= useState(false);
  const [applyingWastage,setApplyingWastage]= useState(false);

  const BLANK = { name:"", description:"", unid:"", caid:"", price:"", currency:"AMD", available:true, deliverable:true, image_url:null, image_thumb_url:null };

  const load = useCallback(async()=>{ setLoading(true); try{
    const[r,l,p,s]=await Promise.all([api.getRecipes(),api.getRecipeLookups(),api.getProcesses(),api.getRecipeStock().catch(()=>[])]);
    setRecipes(r); setLookups({...l,processes:p||[]});
    const sm={}; (s||[]).forEach(x=>{ sm[x.rid]=Number(x.qty); }); setRecipeStock(sm);
  } catch(e){toast(e.message,"error");} finally{setLoading(false);} },[]);
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

      const payload = { name:form.name, description:form.description||null, unid:form.unid||null, caid:form.caid||null, price:Number(form.price)||0, currency:form.currency||"AMD", available:form.available!==false, deliverable:form.deliverable!==false, image_url, image_thumb_url, cloudinary_id, allow_submultiples:!!form.allow_submultiples, moq:form.moq?Number(form.moq):null, expiry_hours:form.expiry_hours===""||form.expiry_hours==null?null:Number(form.expiry_hours), procid:form.procid||null, contents:(contents||[]).filter(c=>c.pid), market_category_ids:form.market_category_ids||[] };

      if (existingRid) {
        const updated = await api.updateRecipe(existingRid, payload);
        setRecipes(prev=>prev.map(r=>r.rid===existingRid?{...r,...updated}:r));
        toast(`"${updated.name}" saved`); setEditRecipe(null);
      } else {
        const r = await api.createRecipe(payload);
        setRecipes(prev=>[...prev,r]); toast(`"${r.name}" saved`); setShowNew(false);
      }
    } catch(e){toast(e.message,"error");} finally{setSaving(false);}
  };

  const [delUsage, setDelUsage] = useState([]);
  const askDelete = async () => {
    try { setDelUsage(await api.getRecipeUsage(selected)); } catch(e){ setDelUsage([]); }
    setDialog("del");
  };
  const doDelete=async()=>{ const names=selected.map(id=>recipes.find(r=>r.rid===id)?.name).filter(Boolean).join(", "); try{ await api.deleteRecipes(selected); setRecipes(prev=>prev.filter(r=>!selected.includes(r.rid))); toast(`${names} deleted`); setSelected([]); setDialog(null); } catch(e){toast(e.message,"error");} };

  const ImgCell = ({r}) => {
    const src = r.image_url||r.image_thumb_url;
    if (!src) return <span className="text-muted-foreground text-xs">—</span>;
    return (
      <button type="button" data-slot="thumb" onClick={()=>setLightbox({src:r.image_url||r.image_thumb_url, description:r.description})}
        className="block overflow-hidden rounded-md border hover:ring-2 hover:ring-ring" title="View image" aria-label={`View image of ${r.name}`}>
        <img src={r.image_thumb_url||r.image_url} alt="" className="size-8 object-cover"/>
      </button>
    );
  };

  const cols = [
    {key:"rid",label:tl("ID"),sortable:true,render:r=><span className="text-muted-foreground text-xs tabular-nums">#{r._id}</span>},
    {key:"img",label:<ImageIcon className="size-3.5" aria-label="Image"/>,sortable:false,render:r=>ImgCell({r})},
    {key:"name",label:tl("Name"),sortable:true,render:r=>(
      <button type="button" data-slot="link" onClick={()=>setEditRecipe(r)} className="text-left underline-offset-4 hover:text-brand hover:underline">{r.name}</button>
    )},
    {key:"description",label:tl("Description"),sortable:true,render:r=>r.description||<span className="text-muted-foreground">—</span>},
    {key:"stock",label:tl("Stock"),sortable:false,render:r=>{
      const qty   = recipeStock[r.rid] ?? 0;
      const min   = parseFloat(r.min_inventory ?? 0);
      const delta = wastageDeltas[r.rid] ?? 0;
      const shown = qty + delta;
      const atMin = Number(min) > 0 && shown <= Number(min);
      const bumpW = d => setWastageDeltas(p=>{
        const cur=p[r.rid]??0; const next = d>0 ? Math.min(0,cur+1) : Math.max(-qty,cur-1);
        return next===0?Object.fromEntries(Object.entries(p).filter(([k])=>k!==String(r.rid))):{...p,[r.rid]:next};
      });
      if (wastageMode) return (
        <div className="flex items-center gap-1.5">
          <QtyStepper value={shown} label={r.name} display={<span className={shown<qty||atMin?"text-destructive-foreground":""}>{shown}</span>}
            onDec={()=>bumpW(-1)} decDisabled={shown<=0} onInc={()=>bumpW(1)} incDisabled={delta===0}/>
          {delta<0&&<span className="text-[11px] text-destructive-foreground tabular-nums">{delta}</span>}
        </div>
      );
      return (
        <span className={`font-semibold tabular-nums ${atMin?"text-destructive-foreground":qty>0?"":"text-muted-foreground"}`}>
          {qty!=null?qty:"—"}
        </span>
      );
    }},
    {key:"min_inv",label:tl("Min. inventory"),sortable:false,render:r=>(
      editMinRid===r.rid ? (
        <div className="flex items-center gap-1">
          <CInput size="sm" type="number" min="0" value={editMinVal} onChange={e=>setEditMinVal(e.target.value)} aria-label="Minimum inventory" className="w-16"/>
          <Button size="icon-xs" aria-label="Save minimum" onClick={()=>saveMinInv(r.rid)}><CheckIcon/></Button>
          <Button size="icon-xs" variant="ghost" aria-label="Cancel" onClick={()=>setEditMinRid(null)}><XIcon/></Button>
        </div>
      ) : (
        <Button variant="ghost" size="xs" className="tabular-nums" aria-label={`Edit minimum for ${r.name}`} onClick={()=>{setEditMinRid(r.rid);setEditMinVal(String(parseFloat(r.min_inventory??0)));}}>
          {parseFloat(r.min_inventory??0)}
        </Button>
      )
    )},
    {key:"units",label:tl("Units"),sortable:false,render:r=>r.units||"—"},
    {key:"available",label:tl("Avail."),sortable:false,render:r=>r.available?<CheckIcon className="size-4 text-success-foreground" aria-label="Yes"/>:<XIcon className="size-4 text-destructive-foreground" aria-label="No"/>},
    {key:"deliverable",label:tl("Deliv."),sortable:false,render:r=>r.deliverable!==false?<CheckIcon className="size-4 text-success-foreground" aria-label="Yes"/>:<XIcon className="size-4 text-destructive-foreground" aria-label="No"/>},
    {key:"price",label:tl("Price"),sortable:false,render:r=><span className="whitespace-nowrap font-semibold tabular-nums">{r.price} {r.currency}</span>},
    {key:"category",label:tl("Category"),sortable:true,render:r=>r.category?<Badge>{r.category}</Badge>:<span className="text-muted-foreground">—</span>},
    {key:"market",label:"Marketplace",sortable:false,render:r=>{
      const ids=(r.market_category_ids||[]).map(Number);
      const names=(lookups.market_categories||[]).flatMap(t=>t.children?.length?t.children.map(c=>({...c,full:`${t.name} › ${c.name}`})):[{...t,full:t.name}]).filter(c=>ids.includes(c.mcid));
      return names.length
        ? <span className="text-xs">{names.map(n=>n.full).join(", ")}</span>
        : <CBadge variant="warning" size="sm" title="Not shown in the marketplace until a category is chosen">No category</CBadge>;
    }},
  ];

  return (
    <Page title={tl("Items")} actions={
      <div className="flex flex-wrap gap-2">
        {selected.length>0&&!wastageMode&&<Btn variant="danger" size="sm" onClick={askDelete}>{tl("Delete")} ({selected.length})</Btn>}
        {wastageMode&&Object.keys(wastageDeltas).length>0&&(
          <Btn size="sm" onClick={()=>setWastageConfirm(true)}>Confirm</Btn>
        )}
        {wastageMode
          ? <Btn variant="secondary" size="sm" onClick={()=>{setWastageMode(false);setWastageDeltas({});}}>Cancel wastage</Btn>
          : <Btn variant="secondary" size="sm" onClick={()=>setWastageMode(true)}>Wastage</Btn>
        }
        {!wastageMode&&<Btn size="sm" onClick={()=>setShowNew(s=>!s)}>{tl("+ Item")}</Btn>}
      </div>
    }>
      {showNew&&(
        <Card className="mb-5" style={{ animation:"fadeIn 0.2s ease" }}>
          <CardHeader><CardTitle>New Item</CardTitle></CardHeader>
          <CardPanel className="pt-0">
            <RecipeForm initial={BLANK} lookups={lookups} saving={saving} onSave={(f,b,r,c)=>handleSave(f,b,r,c,null)} onCancel={()=>setShowNew(false)} />
          </CardPanel>
        </Card>
      )}
      {loading?<Spinner/>:<DataTable columns={cols} rows={sorted.map(r=>({...r,_id:r.rid}))} selected={selected} onSelect={toggleSel} onSelectAll={setSelected} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />}

      {/* EDIT MODAL */}
      {editRecipe&&(
        <Modal title="Edit Item" onClose={()=>setEditRecipe(null)} className="max-w-2xl">
          <RecipeForm initial={editRecipe} lookups={lookups} saving={saving} onSave={(f,b,r,c)=>handleSave(f,b,r,c,editRecipe.rid)} onCancel={()=>setEditRecipe(null)} />
        </Modal>
      )}

      <Dialog open={dialog==="del"} title="Delete recipes?" onConfirm={doDelete} onCancel={()=>setDialog(null)}>
        Are you sure you wish to delete <b>{selected.map(id=>recipes.find(r=>r.rid===id)?.name).filter(Boolean).join(", ")}</b>?
        {delUsage.length>0&&(()=>{
          const procRows=delUsage.filter(u=>u.process_name), menuRows=delUsage.filter(u=>u.menu_name);
          const rids=[...new Set(delUsage.map(u=>u.rid))];
          const lines=(rows,key,label)=>rids.map(rid=>{
            const names=[...new Set(rows.filter(u=>u.rid===rid).map(u=>u[key]))];
            return names.length?<div key={label+rid}><b>{recipes.find(r=>r.rid===rid)?.name}</b> is {label} {names.join(", ")}.</div>:null;
          });
          return (
            <Alert variant="warning" className="mt-3"><TriangleAlertIcon/><AlertDescription>
              {lines(procRows,"process_name","used in")}
              {lines(menuRows,"menu_name","on the menu")}
              <div className="mt-1.5">Deleting will also remove {rids.length>1?"these items":"this item"} from {[procRows.length&&`the process${new Set(procRows.map(u=>u.process_name)).size>1?"es":""}`,menuRows.length&&`the menu${new Set(menuRows.map(u=>u.menu_name)).size>1?"s":""}`].filter(Boolean).join(" and ")} listed above.</div>
            </AlertDescription></Alert>
          );
        })()}
      </Dialog>
      <Lightbox src={lightbox?.src} description={lightbox?.description} onClose={()=>setLightbox(null)} />

      {wastageConfirm&&(
        <Modal title="Confirm wastage" onClose={()=>setWastageConfirm(false)}
          description="The following items will be wasted, and stock levels shall be changed accordingly. The action is irreversible. Are you sure you wish to proceed?"
          footer={<><span/><div className="flex gap-2">
            <Btn variant="ghost" size="sm" onClick={()=>setWastageConfirm(false)}>Cancel</Btn>
            <Btn size="sm" loading={applyingWastage} onClick={async()=>{
              setApplyingWastage(true);
              try {
                const changes = Object.entries(wastageDeltas)
                  .filter(([,d])=>d<0)
                  .map(([rid,delta])=>({rid:Number(rid),delta}));
                const updated = await api.applyItemWastage({changes});
                const sm={}; (updated||[]).forEach(x=>{ sm[x.rid]=Number(x.qty); });
                setRecipeStock(sm);
                setWastageMode(false); setWastageDeltas({});
                setWastageConfirm(false);
                toast("Wastage applied");
              } catch(e){ toast(e.message,"error"); }
              finally{ setApplyingWastage(false); }
            }}>OK</Btn></div></>}>
          <div className="rounded-lg bg-muted px-4 py-2">
            {Object.entries(wastageDeltas).filter(([,d])=>d<0).map(([rid,delta])=>{
              const item = recipes.find(r=>String(r.rid)===rid);
              return (
                <div key={rid} className="flex justify-between border-b py-1.5 text-sm last:border-b-0">
                  <span className="font-semibold">{item?.name||rid}</span>
                  <span className="font-semibold text-destructive-foreground tabular-nums">{delta} {item?.units||''}</span>
                </div>
              );
            })}
          </div>
        </Modal>
      )}
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
    <Card className="mt-8 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <h3 className="font-heading font-semibold text-lg">Weekly Schedule</h3>
        <div className="flex flex-wrap gap-2.5">
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
        <div className="p-5 text-muted-foreground text-sm">
          No menus have availability hours set yet. Open a menu and set its hours to see them here.
        </div>
      )}
    </Card>
  );
}

// Side panel listing items to add to a menu (category filter + checkboxes)
function MenuItemsSheet({ open, onClose, cats, cat, setCat, recs, isChecked, onToggle }) {
  return (
    <Sheet open={open} onOpenChange={o=>{ if(!o) onClose(); }}>
      <SheetPopup side="right" showCloseButton={false} className="w-[min(360px,100vw)]">
        <SheetHeader className="flex-row items-center justify-between">
          <SheetTitle className="font-heading text-lg">Items</SheetTitle>
          <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}><XIcon/></Button>
        </SheetHeader>
        <SheetPanel className="flex flex-col gap-4">
          <Select label="Category" value={cat} onChange={setCat} options={cats} placeholder="All categories" />
          <div className="flex flex-col gap-1.5">
            {recs.map(r=>{
              const on = isChecked(r);
              return (
                <Label key={r.rid} className={`cursor-pointer rounded-lg border px-3 py-2.5 font-normal ${on?"border-brand/50 bg-accent/50":"border-transparent hover:bg-accent/30"}`}>
                  <Checkbox checked={on} onCheckedChange={()=>onToggle(r)}/>
                  <span className="flex-1 text-sm">{r.name}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">{r.price} {r.currency}</span>
                </Label>
              );
            })}
          </div>
        </SheetPanel>
      </SheetPopup>
    </Sheet>
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


  if (viewMid) {
    const menu=menus.find(m=>m.mid===viewMid);
    if (!menu){setViewMid(null);return null;}
    const grouped={};
    (menu.recipes||[]).forEach(r=>{if(!grouped[r.category])grouped[r.category]=[];grouped[r.category].push(r);});
    const toggleInMenu = async r => {
      const inMenu = (menus.find(m=>m.mid===viewMid)?.recipes||[]).some(x=>x.rid===r.rid);
      try {
        const u = inMenu ? await api.removeMenuRecipes(viewMid, [r.rid]) : await api.addMenuRecipes(viewMid, [r.rid]);
        setMenus(prev=>prev.map(m=>m.mid===viewMid?u:m));
      } catch(e){ toast(e.message,"error"); }
    };
    return (
      <Page actions={
        <div className="flex flex-wrap gap-2">
          <Btn variant="ghost" size="sm" onClick={()=>setViewMid(null)}><ArrowLeftIcon/>All menus</Btn>
          <Btn variant="secondary" size="sm" onClick={async()=>{
            try {
              const copy = await api.duplicateMenu(viewMid);
              setMenus(prev=>[...prev,copy]);
              toast(`"${copy.name}" created`);
              setViewMid(copy.mid);
            } catch(e){ toast(e.message,"error"); }
          }}><CopyIcon/>Duplicate</Btn>
          <Btn variant="secondary" size="sm" onClick={()=>setShowSidebar(true)}><PlusIcon/>Add items</Btn>
          <Btn variant="danger" size="sm" onClick={()=>setDialog("delete-menu")}><Trash2Icon/>Delete</Btn>
        </div>
      }>
        <div className="mb-5">
          {editTitle?(
            <input autoFocus data-slot="title-input" value={titleVal} onChange={e=>setTitleVal(e.target.value)} onBlur={()=>{patchMenu(menu.mid,{name:titleVal});setEditTitle(false);}} onKeyDown={e=>e.key==="Enter"&&e.target.blur()}
              aria-label="Menu name" className="w-full border-b-2 border-brand bg-transparent font-bold font-heading text-3xl outline-none" />
          ):(
            <h1 onClick={()=>{setTitleVal(menu.name);setEditTitle(true);}} title="Click to rename"
              className="inline-flex cursor-text items-center gap-2 border-b-2 border-transparent font-bold font-heading text-3xl transition-colors hover:border-brand">
              {menu.name}<PencilIcon className="size-4 text-muted-foreground"/>
            </h1>
          )}

          {/* Availability row */}
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <Label className="cursor-pointer font-normal">
              <Checkbox checked={menu.available} onCheckedChange={()=>patchMenu(menu.mid,{available:!menu.available})} />
              Available to customers
            </Label>
            {toRemove.length>0&&<Btn variant="danger" size="sm" onClick={()=>setDialog("remove")}>Remove selected ({toRemove.length})</Btn>}
          </div>

          {/* Availability hours */}
          <Card className="mt-5">
            <CardPanel className="flex flex-col gap-3.5">
              <p className="font-semibold text-sm">Availability Hours</p>
              <ToggleGroup multiple value={hoursDays} onValueChange={v=>setHoursDays(v)} className="flex flex-wrap gap-1.5" aria-label="Days">
                {DAYS.map((d,i)=>(
                  <ToggleGroupItem key={d} value={d} size="sm" aria-label={tl(DAY_LABELS[i])}
                    className="rounded-full border border-input px-3 data-pressed:border-primary data-pressed:bg-primary data-pressed:text-primary-foreground">{tl(DAY_LABELS[i])}</ToggleGroupItem>
                ))}
              </ToggleGroup>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-muted-foreground text-sm">From</span>
                <CInput type="time" value={hoursFrom} onChange={e=>setHoursFrom(e.target.value)} aria-label="From" className="w-auto"/>
                <span className="text-muted-foreground text-sm">Until</span>
                <CInput type="time" value={hoursUntil} onChange={e=>setHoursUntil(e.target.value)} aria-label="Until" className="w-auto"/>
                <Btn size="sm" onClick={applyHours} loading={applyingHours}>Apply</Btn>
                {menu.hours_from&&(
                  <Btn size="sm" variant="ghost" onClick={async()=>{
                    await patchMenu(menu.mid,{hours_from:null,hours_until:null,hours_days:[]});
                    setHoursFrom("09:00"); setHoursUntil("21:00"); setHoursDays([]); setHoursWarning("");
                    toast("Hours cleared");
                  }}>Clear hours</Btn>
                )}
              </div>
              {hoursWarning&&(
                <Alert variant="warning"><TriangleAlertIcon/>
                  <AlertDescription>{hoursWarning}</AlertDescription>
                  <AlertAction><Button variant="ghost" size="icon-xs" aria-label="Dismiss" onClick={()=>setHoursWarning("")}><XIcon/></Button></AlertAction>
                </Alert>
              )}
              {menu.hours_from&&(
                <p className="text-muted-foreground text-xs">
                  Currently active: <b className="text-foreground">{menu.hours_days?.map(d=>d.charAt(0).toUpperCase()+d.slice(1)).join(", ")}</b> · {menu.hours_from} – {menu.hours_until}
                </p>
              )}
            </CardPanel>
          </Card>
        </div>

        {/* Recipe list */}
        <Card className="overflow-hidden">
          {Object.entries(grouped).map(([cat,recs])=>(
            <div key={cat}>
              <Label className="flex w-full cursor-pointer gap-2.5 border-b bg-muted px-5 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                <Checkbox checked={recs.every(r=>toRemove.includes(r.rid))} onCheckedChange={()=>{const all=recs.every(r=>toRemove.includes(r.rid));setToRemove(p=>all?p.filter(x=>!recs.find(r=>r.rid===x)):[...p,...recs.map(r=>r.rid).filter(x=>!p.includes(x))]);}} />
                {cat}
              </Label>
              {recs.map(r=>(
                <Label key={r.rid} className="flex w-full cursor-pointer gap-3 border-b px-5 py-3 font-normal last:border-b-0 hover:bg-accent/30">
                  <Checkbox checked={toRemove.includes(r.rid)} onCheckedChange={()=>setToRemove(p=>p.includes(r.rid)?p.filter(x=>x!==r.rid):[...p,r.rid])} />
                  <span className="flex-1 text-sm">{r.name}{r.deliverable===false&&<em className="ms-1.5 text-muted-foreground text-xs">(pickup only)</em>}</span>
                  <span className="font-semibold text-brand text-sm tabular-nums">{r.price} {r.currency}</span>
                </Label>
              ))}
            </div>
          ))}
          {(!menu.recipes||menu.recipes.length===0)&&<div className="p-10 text-center text-muted-foreground">No recipes yet.</div>}
        </Card>
        <Dialog open={dialog==="remove"} title="Remove from menu?" onConfirm={removeRecipes} onCancel={()=>setDialog(null)}>
          Are you sure you wish to remove the selected items? You may add them back later.
        </Dialog>
        <Dialog open={dialog==="delete-menu"} title={`Delete "${menu.name}"?`} onConfirm={async()=>{
          try {
            const res = await api.deleteMenu(viewMid);
            setMenus(prev=>prev.filter(m=>m.mid!==viewMid));
            toast(res?.archived?`"${menu.name}" archived — past orders keep their history`:`"${menu.name}" deleted`);
            setDialog(null); setViewMid(null);
          } catch(e){ toast(e.message,"error"); setDialog(null); }
        }} onCancel={()=>setDialog(null)}>
          This will remove the menu and all items from it, and it cannot be undone. If customers have already ordered from it, the menu is archived instead: it disappears from your list and from customers, while past orders and reports are kept as they are.
        </Dialog>
        <MenuItemsSheet open={showSidebar} onClose={()=>setShowSidebar(false)} cats={sidebarCats} cat={sidebarCat} setCat={setSidebarCat} recs={sidebarRecs}
          isChecked={r=>(menus.find(m=>m.mid===viewMid)?.recipes||[]).some(x=>x.rid===r.rid)} onToggle={toggleInMenu}/>
      </Page>
    );
  }

  return (
    <Page title={tl("Menus")} actions={<Btn size="sm" onClick={()=>setShowNew(s=>!s)}>{tl("+ Menu")}</Btn>}>
      {showNew&&(
        <Card className="mb-5" style={{ animation:"fadeIn 0.2s ease" }}>
          <CardHeader><CardTitle>New Menu</CardTitle></CardHeader>
          <CardPanel className="flex flex-col gap-3.5 pt-0">
            <div className="grid grid-cols-1 items-end gap-3.5 sm:grid-cols-[1fr_1fr_auto]">
              <Input label="Name" value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} required />
              <Input label="Delivery fee (AMD)" type="number" value={form.delivery_fee} onChange={v=>setForm(p=>({...p,delivery_fee:v}))} placeholder="0" />
              <Label className="h-10 cursor-pointer whitespace-nowrap font-normal">
                <Checkbox checked={form.available} onCheckedChange={v=>setForm(p=>({...p,available:!!v}))} />Available
              </Label>
            </div>
            <FieldBlock label={`Recipes (${form.recipe_ids.length} selected)`}>
              {form.recipe_ids.length>0&&(
                <div className="flex flex-wrap gap-1.5">
                  {form.recipe_ids.map(rid=>{const r=availRecipes.find(x=>x.rid===rid);return r?(
                    <span key={rid} className="inline-flex items-center gap-1 rounded-full bg-accent py-0.5 ps-2.5 pe-1 text-accent-foreground text-sm">{r.name}
                      <button type="button" data-slot="chip-remove" aria-label={`Remove ${r.name}`} onClick={()=>setForm(p=>({...p,recipe_ids:p.recipe_ids.filter(x=>x!==rid)}))} className="rounded-full p-0.5 hover:bg-background/60"><XIcon className="size-3.5"/></button>
                    </span>):null;})}
                </div>
              )}
              <Btn variant="secondary" size="sm" onClick={()=>setShowSidebar(true)} style={{ alignSelf:"flex-start" }}><PlusIcon/>Add items</Btn>
            </FieldBlock>
            <div className="flex gap-2.5">
              <Btn size="sm" onClick={saveNew} loading={saving}>{tl("Save")}</Btn>
              <Btn variant="ghost" size="sm" onClick={()=>setShowNew(false)}>{tl("Cancel")}</Btn>
            </div>
          </CardPanel>
        </Card>
      )}
      <MenuItemsSheet open={showSidebar} onClose={()=>setShowSidebar(false)} cats={sidebarCats} cat={sidebarCat} setCat={setSidebarCat} recs={sidebarRecs}
        isChecked={r=>form.recipe_ids.includes(r.rid)}
        onToggle={r=>setForm(p=>({...p,recipe_ids:p.recipe_ids.includes(r.rid)?p.recipe_ids.filter(x=>x!==r.rid):[...p.recipe_ids,r.rid]}))}/>
      {loading?<Spinner/>:(
        <div className="grid gap-4" style={{ gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))" }}>
          {menus.map(m=>(
            <Card key={m.mid} role="button" tabIndex={0} onClick={()=>setViewMid(m.mid)} onKeyDown={e=>{ if(e.key==="Enter") setViewMid(m.mid); }}
              className="cursor-pointer transition-[border-color,box-shadow] hover:border-brand/60 hover:shadow-md/10 focus-visible:outline-2 focus-visible:outline-ring">
              <CardPanel className="p-5">
                <div className="mb-2.5 flex items-start justify-between gap-2">
                  <h3 className="font-heading font-semibold text-lg">{m.name}</h3>
                  <CBadge variant={m.available?"success":"secondary"}>{m.available?"Live":"Draft"}</CBadge>
                </div>
                <p className="text-muted-foreground text-sm">{(m.recipes||[]).length} recipe{(m.recipes||[]).length!==1?"s":""} · Delivery {m.delivery_fee} AMD</p>
              </CardPanel>
            </Card>
          ))}
          {menus.length===0&&<p className="text-muted-foreground text-sm">No menus yet.</p>}
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
function fuzzySearch(hay, needle) {
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
    pickup === null ||  // Stock — no customer/address needed
    pickup === true  ||  // Pickup
    (!pickup && addrMode==="customer" && customerAddr) ||
    (!pickup && addrMode==="other")
  );

  const submit = async (addressOverride) => {
    if (!mid || !items.length) return;
    setSaving(true);
    try {
      const addr = addressOverride ?? deliveryAddress;
      const fulfillmentType = pickup === null ? 'stock' : pickup ? 'pickup' : 'delivery';
      const payload = {
        mid: Number(mid), pickup: pickup ?? true, fulfillment: fulfillmentType, items,
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

  const totalLabel = <span className="font-bold text-base text-brand tabular-nums">{total > 0 ? `${total} AMD` : "—"}</span>;

  // ── STEP 2: Other address ──────────────────────────────────────────────────
  if (step === 2) {
    const addr = [otherStreet, otherCity, otherZip, otherPhone].filter(Boolean).join(", ");
    return (
      <Modal title="Delivery address" onClose={onClose}
        headerAction={<Button variant="ghost" size="sm" onClick={()=>setStep(1)}><ArrowLeftIcon/>Back</Button>}
        footer={<>{totalLabel}<Btn onClick={()=>submit(addr)} loading={saving} disabled={!otherStreet}>{tl("Place order")}</Btn></>}>
        <div className="flex flex-col gap-3.5">
          <Input label="Street" value={otherStreet} onChange={setOtherStreet} placeholder="Street address" />
          <div className="grid grid-cols-2 gap-3.5">
            <Input label="City" value={otherCity} onChange={setOtherCity} />
            <Input label="ZIP" value={otherZip} onChange={setOtherZip} />
          </div>
          <Input label="Phone" value={otherPhone} onChange={setOtherPhone} placeholder="+374 91 …" />
          <FieldBlock label="Delivery comments" hint={`${deliveryComments.length}/100`}>
            <Textarea value={deliveryComments} onChange={e=>setDeliveryComments(e.target.value.slice(0,100))}
              placeholder="Instructions, floor, buzzer code…" rows={3} maxLength={100}/>
          </FieldBlock>
        </div>
      </Modal>
    );
  }

  // ── STEP 1: Main ──────────────────────────────────────────────────────────
  const fulfilOpts = [{val:"pickup",label:tl("Pickup (free)")},{val:"delivery",label:`${tl("Delivery")} (+${selectedMenu?.delivery_fee||0} AMD)`},{val:"stock",label:tl("Stock")}];
  const pickupKey = pickup===null ? "stock" : pickup ? "pickup" : "delivery";
  return (
    <Modal title="New order" onClose={onClose} className="max-w-2xl"
      footer={<>{totalLabel}
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={onClose}>{tl("Cancel")}</Btn>
          {!pickup && addrMode==="other" ? (
            <Btn onClick={()=>setStep(2)} disabled={!items.length||!mid}>{tl("Next →")}</Btn>
          ) : (
            <Btn onClick={()=>submit()} loading={saving} disabled={!canPlaceMain}>{tl("Place order")}</Btn>
          )}
        </div></>}>
      <div className="flex flex-col gap-5">
        {/* 1. Fulfillment — at top */}
        <FieldBlock label={tl("Fulfillment")}>
          <RadioGroup value={pickupKey} onValueChange={v=>{ setPickup(v==="stock"?null:v==="pickup"); setAddrMode("customer"); }} className="flex flex-row flex-wrap gap-x-5 gap-y-2">
            {fulfilOpts.map(opt=>(<Label key={opt.val} className="cursor-pointer font-normal"><Radio value={opt.val}/>{opt.label}</Label>))}
          </RadioGroup>
        </FieldBlock>

        {/* 2. Customer — hidden for Stock orders */}
        {pickup !== null && (
          <FieldBlock label="Customer" required={!pickup && addrMode==="customer"}>
            {customer ? (
              <div className="flex items-center gap-2.5 rounded-lg bg-muted px-3.5 py-2.5">
                <CircleUserIcon className="size-4 text-muted-foreground"/>
                <span className="flex-1 text-sm">{customer.first_name} {customer.last_name}</span>
                <Button variant="ghost" size="xs" className="text-destructive-foreground" onClick={()=>{setCustomer(null);setCustomerQ("");}}>{tl("Remove")}</Button>
              </div>
            ) : (
              <div className="relative">
                <CInput size="lg" value={customerQ} onChange={e=>setCustomerQ(e.target.value)}
                  placeholder={pickup ? "Name, email or phone (optional)" : "Search existing customer"} aria-label="Customer"/>
                {results.length>0&&(
                  <div className="absolute inset-x-0 top-[calc(100%+4px)] z-10 overflow-hidden rounded-lg border bg-popover shadow-lg/10">
                    {results.map(r=>(
                      <button key={r.uid} type="button" data-slot="customer-option" onClick={()=>{setCustomer(r);setCustomerQ(`${r.first_name} ${r.last_name}`);setResults([]);}}
                        className="flex w-full gap-2.5 px-3.5 py-2.5 text-left text-sm hover:bg-accent">
                        <span className="flex-1">{r.first_name} {r.last_name}</span>
                        <span className="text-muted-foreground text-xs">{r.email}</span>
                      </button>
                    ))}
                    <div className="border-t px-3.5 py-2 text-muted-foreground text-xs">Not listed? Will be saved as walk-in.</div>
                  </div>
                )}
                {customerQ.length>=2&&results.length===0&&!customer&&(
                  <p className="mt-1 text-muted-foreground text-xs">No matches — will be saved as walk-in "{customerQ}"</p>
                )}
              </div>
            )}
          </FieldBlock>
        )}

        {/* 3. Delivery address — only when Delivery selected */}
        {pickup === false && (
          <FieldBlock label="Delivery address" required>
            <RadioGroup value={addrMode} onValueChange={setAddrMode} className="gap-2.5">
              <Label className="cursor-pointer items-start font-normal">
                <Radio value="customer" className="mt-0.5"/>
                <span>
                  <span className="font-medium text-sm">Customer's address</span>
                  {customer && customerAddr
                    ? <span className="mt-0.5 block text-muted-foreground text-sm">{customerAddr}</span>
                    : <span className="mt-0.5 block text-muted-foreground text-xs italic">Select a registered customer to autofill</span>}
                </span>
              </Label>
              <Label className="cursor-pointer font-medium"><Radio value="other"/>Other address</Label>
            </RadioGroup>
          </FieldBlock>
        )}

        {/* 4. Menu */}
        <Select label={tl("Menu")} value={mid} onChange={selectMenu}
          options={menus.map(m=>({value:String(m.mid),label:m.name+(m.available?"":" (draft)")}))}
          placeholder="Select a menu" required />

        {/* 5. Recipe picker */}
        {selectedMenu && (
          <FieldBlock label="Items">
            {Object.entries(grouped).map(([cat,recs])=>(
              <div key={cat} className="mb-2">
                <p className="mb-1 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">{cat}</p>
                {recs.map(r=>(
                  <div key={r.rid} className="flex items-center gap-2.5 border-b py-2 last:border-b-0">
                    <span className="flex-1 text-sm">{r.name}{r.deliverable===false&&<span className="ms-1.5 text-muted-foreground text-xs">(pick-up only)</span>}</span>
                    <span className="min-w-[70px] text-right font-semibold text-brand text-sm tabular-nums">{r.price} {r.currency}</span>
                    <QtyStepper value={qty[r.rid]||0} label={r.name} incDisabled={(qty[r.rid]||0)>=20}
                      onDec={()=>changeQty(r.rid,-1)} onInc={()=>changeQty(r.rid,1)}/>
                  </div>
                ))}
              </div>
            ))}
          </FieldBlock>
        )}
      </div>
    </Modal>
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
    <Modal title={`Order #${order.oid}`} onClose={onClose} className="max-w-2xl"
      description={order.customer ? <>{order.customer.first_name} {order.customer.last_name}{order.customer.email&&<> · {order.customer.email}</>}</> : undefined}
      footer={<>
        <span className="font-bold font-heading text-brand text-lg tabular-nums">{total.toFixed(2)} AMD</span>
        <div className="flex gap-2"><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={save} loading={saving}>Save</Btn></div>
      </>}>
      <TableShell>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {["Item",tl("Qty"),"Price / unit","Total"].map((h,i)=><SortHead key={h} label={h} sortable={false} className={i===3?"text-right":""}/>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it,i)=>(
              <TableRow key={it.oiid}>
                <TableCell className={CELL}>{it.name}</TableCell>
                <TableCell className={CELL}>
                  <CInput type="number" value={it.qty} min={0} step="any" aria-label={`Quantity of ${it.name}`}
                    onChange={e=>updateItem(i,"qty",e.target.value)} className="w-24 [&_input]:text-right"/>
                </TableCell>
                <TableCell className={`${CELL} text-muted-foreground tabular-nums`}>{it.price} {it.currency||"AMD"}</TableCell>
                <TableCell className={`${CELL} text-right font-semibold text-brand tabular-nums`}>
                  {((parseFloat(it.qty)||0)*(parseFloat(it.price)||0)).toFixed(2)} {it.currency||"AMD"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableShell>
    </Modal>
  );
}

// ─── QUICK SALE (walk-in sales in one step) ──────────────────────────────────
// ─── CLOSING COUNT (inventory) ───────────────────────────────────────────────
// One counted line (item or package) on the Closing count screen
function CountRow({ tl, name, expected, value, changed, onDec, onInc, onChange, children }) {
  return (
    <div className={`border-b px-4 py-3 last:border-b-0 ${changed?"bg-accent/40":""}`}>
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="min-w-0 flex-[1_1_160px]">
          <div className="font-heading font-semibold text-base">{name}</div>
          <div className="text-muted-foreground text-xs tabular-nums">{tl("Expected")}: {expected}</div>
        </div>
        <Button variant="outline" size="icon-lg" aria-label={`Count one less ${name}`} onClick={onDec}><MinusIcon/></Button>
        <CInput type="number" inputMode="decimal" min="0" step="any" value={value} onChange={e=>onChange(e.target.value)} onFocus={e=>e.target.select()}
          aria-label={`Counted ${name}`} className={`w-24 [&_input]:h-10 [&_input]:text-center [&_input]:font-bold [&_input]:text-lg ${changed?"border-brand":""}`}/>
        <Button variant="outline" size="icon-lg" aria-label={`Count one more ${name}`} onClick={onInc}><PlusIcon/></Button>
      </div>
      {children}
    </div>
  );
}

function ClosingCountPage({ toast }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
  const [items, setItems]   = useState([]);
  const [packs, setPacks]   = useState([]);            // packaging with stock
  const [pCounted, setPCounted] = useState({});        // pid -> counted packages (string, as typed)
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [earlier, setEarlier] = useState(false);
  const [soldAt, setSoldAt] = useState("");
  const [counted, setCounted] = useState({});          // rid -> counted quantity (string, as typed)
  const [wasteQ, setWasteQ]   = useState({});          // rid -> units of the shortfall that were wasted
  const [extraRids, setExtraRids] = useState([]);      // items without stock that were added to the count
  const fmtN = v => String(Number(Number(v).toFixed(2)));
  const currency = items[0]?.currency || "AMD";
  const load = useCallback(async () => {
    try { const d = await api.getQuickSale(); setItems(d.items||[]); setPacks(d.packages||[]); }
    catch(e){ toast(e.message,"error"); }
    finally { setLoading(false); }
  }, []);
  useEffect(()=>{ load(); },[]);

  const countItems = items.filter(i => i.stock > 0 || extraRids.includes(i.rid));
  const cVal = i => counted[i.rid] === undefined || counted[i.rid] === "" ? i.stock : Number(counted[i.rid]);
  const cDiff = i => Math.round((i.stock - cVal(i)) * 1000) / 1000;          // > 0 missing, < 0 surplus
  const cWaste = i => Math.min(Math.max(0, Number(wasteQ[i.rid]) || 0), Math.max(0, cDiff(i)));
  const cSummary = countItems.reduce((a, i) => {
    const d = cDiff(i);
    if (d > 0) { const w = cWaste(i); a.sold += d - w; a.revenue += (d - w) * Number(i.price); a.wasted += w; }
    else if (d < 0) a.surplus += -d;
    return a;
  }, { sold: 0, revenue: 0, wasted: 0, surplus: 0 });
  const pVal = p => pCounted[p.pid] === undefined || pCounted[p.pid] === "" ? p.stock : Number(pCounted[p.pid]);
  const pDiff = p => Math.round((p.stock - pVal(p)) * 1000) / 1000;           // > 0 used up, < 0 surplus
  const countPacks = packs.filter(p => p.stock > 0);
  const cChanged = countItems.some(i => cDiff(i) !== 0) || countPacks.some(p => pDiff(p) !== 0);
  const setCount = (i, v) => setCounted(c => ({ ...c, [i.rid]: v }));
  const stepCount = (i, d) => setCount(i, String(Math.max(0, Math.round((cVal(i) + d) * 1000) / 1000)));
  const saveCount = async () => {
    setSaving(true);
    try {
      const res = await api.postClosingCount({
        counts: countItems.filter(i => cDiff(i) !== 0).map(i => ({ rid: i.rid, counted: cVal(i), wasted: cWaste(i) })),
        package_counts: countPacks.filter(p => pDiff(p) !== 0).map(p => ({ pid: p.pid, counted: pVal(p) })),
        sold_at: earlier && soldAt ? new Date(soldAt).toISOString() : undefined,
      });
      const parts = [];
      if (res.sale) parts.push(`${tl("Sold")}: ${res.sale.items.map(l=>`${l.qty} × ${l.name}`).join(", ")} — ${Number(res.sale.total).toLocaleString()} ${currency}`);
      if (res.wasted.length) parts.push(`${tl("Wasted")}: ${res.wasted.map(w=>`${fmtN(w.qty)} × ${w.name}`).join(", ")}`);
      if (res.surplus.length) parts.push(`${tl("Surplus added to stock")}: ${res.surplus.map(w=>`${fmtN(w.qty)} × ${w.name}`).join(", ")}`);
      if ((res.packs||[]).length) parts.push(`${tl("Packaging adjusted")}: ${res.packs.map(w=>`${w.diff>0?"−":"+"}${fmtN(Math.abs(w.diff))} × ${w.name}`).join(", ")}`);
      toast(parts.join(" · ") || tl("Count saved: no differences"));
      setCounted({}); setPCounted({}); setWasteQ({}); setExtraRids([]); setEarlier(false); setSoldAt("");
      await load();
    } catch(e){ toast(e.message,"error"); }
    finally { setSaving(false); }
  };

  const nowLocal = new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
  return (
    <Page title={tl("Closing count")}>
      {loading ? <Spinner/> : (
        <div className="flex max-w-[760px] flex-col gap-4">
          <p className="text-muted-foreground text-sm leading-relaxed">{tl("Enter what is left of each item. Anything missing is recorded as sold; mark units as wasted if they were thrown away. Items you leave as they are stay unchanged.")}</p>
          <Card className="overflow-hidden">
            {countItems.length===0 && <div className="p-8 text-center text-muted-foreground">{tl("No items with stock on hand.")}</div>}
            {countItems.map(i=>{
              const d = cDiff(i), w = cWaste(i);
              return (
                <CountRow tl={tl} key={i.rid} name={i.name} expected={fmtN(i.stock)} changed={d!==0}
                  value={counted[i.rid]===undefined?String(i.stock):counted[i.rid]} onChange={v=>setCount(i,v)}
                  onDec={()=>stepCount(i,-1)} onInc={()=>stepCount(i,1)}>
                  {d>0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-2.5 text-sm">
                      <span>{fmtN(d-w)} {tl("sold")} · {(Math.max(0,d-w)*Number(i.price)).toLocaleString()} {i.currency}</span>
                      <span className="text-muted-foreground">·</span>
                      <label className="flex items-center gap-1.5 text-muted-foreground">{tl("of which wasted")}
                        <CInput type="number" inputMode="decimal" min="0" max={d} step="any" size="sm" value={wasteQ[i.rid]===undefined?"":wasteQ[i.rid]} placeholder="0"
                          onChange={e=>setWasteQ(m=>({...m,[i.rid]:e.target.value}))} className="w-16 [&_input]:text-center"/>
                      </label>
                    </div>
                  )}
                  {d<0 && <div className="mt-2 text-sm text-success-foreground">＋{fmtN(-d)} {tl("more than expected — stock will be raised")}</div>}
                </CountRow>
              );
            })}
            {items.some(i=>i.stock<=0 && !extraRids.includes(i.rid)) && (
              <div className="p-3">
                <CSelect items={items.filter(i=>i.stock<=0 && !extraRids.includes(i.rid)).map(i=>({label:i.name,value:String(i.rid)}))} value={null}
                  onValueChange={v=>{ if(v) setExtraRids(r=>[...r,Number(v)]); }}>
                  <SelectTrigger className="w-auto min-w-56 text-muted-foreground"><span className="flex items-center gap-2"><PlusIcon className="size-4"/>{tl("Add another item…")}</span></SelectTrigger>
                  <SelectPopup>{items.filter(i=>i.stock<=0 && !extraRids.includes(i.rid)).map(i=><SelectItem key={i.rid} value={String(i.rid)}>{i.name}</SelectItem>)}</SelectPopup>
                </CSelect>
              </div>
            )}
          </Card>
          {countPacks.length>0 && (
            <Card className="overflow-hidden">
              <div className="bg-muted px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">{tl("Packaging")}</div>
              {countPacks.map(p=>{
                const d = pDiff(p);
                return (
                  <CountRow tl={tl} key={p.pid} name={p.name} expected={fmtN(p.stock)} changed={d!==0}
                    value={pCounted[p.pid]===undefined?String(p.stock):pCounted[p.pid]} onChange={v=>setPCounted(c=>({...c,[p.pid]:v}))}
                    onDec={()=>setPCounted(c=>({...c,[p.pid]:String(Math.max(0,pVal(p)-1))}))} onInc={()=>setPCounted(c=>({...c,[p.pid]:String(pVal(p)+1)}))}>
                    {d>0 && <div className="mt-2 text-sm">{fmtN(d)} {tl("used beyond the automatic write-off — recorded in Profit & Loss")}</div>}
                    {d<0 && <div className="mt-2 text-sm text-success-foreground">＋{fmtN(-d)} {tl("more than expected — stock will be raised")}</div>}
                  </CountRow>
                );
              })}
            </Card>
          )}
          <Card>
            <CardPanel className="flex flex-col gap-3">
              <div className="text-sm leading-relaxed">
                {!cChanged ? <span className="text-muted-foreground">{tl("No differences yet.")}</span> : (<>
                  {cSummary.sold>0 && <div>{tl("Sold")}: <b>{fmtN(cSummary.sold)}</b> · <b className="text-brand">{cSummary.revenue.toLocaleString()} {currency}</b></div>}
                  {cSummary.wasted>0 && <div>{tl("Wasted")}: <b>{fmtN(cSummary.wasted)}</b></div>}
                  {cSummary.surplus>0 && <div>{tl("Surplus added to stock")}: <b>{fmtN(cSummary.surplus)}</b></div>}
                </>)}
              </div>
              <Label className="cursor-pointer font-normal text-muted-foreground"><Checkbox checked={earlier} onCheckedChange={v=>setEarlier(!!v)}/>{tl("Sold earlier")}</Label>
              {earlier && <CInput type="datetime-local" value={soldAt} max={nowLocal} onChange={e=>setSoldAt(e.target.value)} aria-label={tl("Sold earlier")} className="w-auto self-start"/>}
              <Button size="xl" className="w-full" loading={saving} disabled={!cChanged||(earlier&&!soldAt)} onClick={saveCount}>{tl("Save count")}</Button>
            </CardPanel>
          </Card>
        </div>
      )}
    </Page>
  );
}

function QuickSalePage({ toast }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
  const [items, setItems]   = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart]     = useState({});          // rid -> qty
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [earlier, setEarlier] = useState(false);
  const [soldAt, setSoldAt] = useState("");
  const fmtN = v => String(Number(Number(v).toFixed(2)));

  // ── Voice input (browser speech recognition, push-to-talk) ──
  const SR = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  const vLang = lang==="ru" ? "ru-RU" : "en-US";           // speech language follows the app language
  const [listening, setListening] = useState(false);
  const [heard, setHeard]   = useState("");          // live / final transcript
  const [voice, setVoice]   = useState(null);        // { text, lines, missed } awaiting confirmation
  const recRef = useRef(null);
  const stopListening = () => { try { recRef.current?.stop(); } catch {} };
  const startListening = () => {
    if (!SR) { toast(tl("Voice input is not supported in this browser. Try Chrome or Safari."),"error"); return; }
    if (listening) { stopListening(); return; }
    const rec = new SR();
    rec.lang = vLang; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
    let finalText = "";
    rec.onresult = e => {
      let txt = "";
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript + " ";
      finalText = txt.trim(); setHeard(finalText);
    };
    rec.onerror = e => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") toast(tl("Microphone access is blocked. Allow it in the browser settings."),"error");
      else if (e.error !== "no-speech" && e.error !== "aborted") toast(`${tl("Voice error")}: ${e.error}`,"error");
    };
    rec.onend = () => {
      setListening(false); recRef.current = null;
      if (finalText) setVoice({ text: finalText, ...parseVoiceSale(finalText, items) });
      else toast(`${tl("Nothing was heard")} (${vLang==="ru-RU"?"RU":"EN"})`,"error");
      setHeard("");
    };
    recRef.current = rec; setHeard(""); setVoice(null); setListening(true);
    try { rec.start(); } catch { setListening(false); }
  };
  useEffect(()=>()=>{ try { recRef.current?.abort(); } catch {} },[]);
  const voiceBump = (rid, d) => setVoice(v => {
    const lines = v.lines.map(l => l.rid===rid ? { ...l, qty: l.qty + d } : l).filter(l => l.qty > 0);
    return { ...v, lines };
  });
  const voiceToCart = () => {
    setCart(c => { const n = { ...c }; voice.lines.forEach(l => { n[l.rid] = (n[l.rid]||0) + l.qty; }); return n; });
    setVoice(null);
  };
  const voiceSellNow = async () => {
    if (!voice?.lines.length) return;
    setSaving(true);
    try {
      const vl = voice.lines.map(l => ({ ...items.find(i=>i.rid===l.rid), qty: l.qty }));
      await api.postQuickSale({ items: voice.lines });
      toast(`${tl("Sold")}: ${vl.map(l=>`${l.qty} × ${l.name}`).join(", ")} — ${vl.reduce((s,l)=>s+l.qty*Number(l.price),0).toLocaleString()} ${vl[0]?.currency||"AMD"}`);
      setVoice(null); await load();
    } catch(e){ toast(e.message,"error"); }
    finally { setSaving(false); }
  };

  const load = useCallback(async () => {
    try { const d = await api.getQuickSale(); setItems(d.items||[]); setRecent(d.recent||[]); }
    catch(e){ toast(e.message,"error"); }
    finally { setLoading(false); }
  }, []);
  useEffect(()=>{ load(); },[]);

  const bump = (rid, d) => setCart(c => {
    const q = Math.max(0, (c[rid]||0) + d);
    const n = { ...c }; if (q) n[rid] = q; else delete n[rid];
    return n;
  });
  const lines = items.filter(i => cart[i.rid]).map(i => ({ ...i, qty: cart[i.rid] }));
  const total = lines.reduce((s,l)=>s+l.qty*Number(l.price),0);
  const currency = lines[0]?.currency || items[0]?.currency || "AMD";
  const shown = items.filter(i => !filter.trim() || i.name.toLowerCase().includes(filter.trim().toLowerCase()));

  const sell = async () => {
    if (!lines.length) return;
    setSaving(true);
    try {
      await api.postQuickSale({ items: lines.map(l=>({rid:l.rid, qty:l.qty})), sold_at: earlier && soldAt ? new Date(soldAt).toISOString() : undefined });
      toast(`${tl("Sold")}: ${lines.map(l=>`${l.qty} × ${l.name}`).join(", ")} — ${total.toLocaleString()} ${currency}`);
      setCart({}); setEarlier(false); setSoldAt("");
      await load();
    } catch(e){ toast(e.message,"error"); }
    finally { setSaving(false); }
  };
  const undo = async oid => {
    try { await api.undoQuickSale(oid); toast(tl("Sale undone")); await load(); }
    catch(e){ toast(e.message,"error"); }
  };

  const nowLocal = new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
  return (
    <Page title={tl("Quick Sale")}>
      {loading ? <Spinner/> : (
        <div className="flex flex-wrap items-start gap-5">
          {/* Tiles */}
          <div className="min-w-0 flex-[1_1_420px]">
            <div className="mb-3.5 flex items-stretch gap-2">
              <SearchField value={filter} onChange={setFilter} placeholder={tl("Search items…")} className="flex-1"/>
              <Button size="icon" variant={listening?"destructive":"default"} onClick={startListening}
                aria-label={listening?tl("Stop"):tl("Speak a sale")} title={listening?tl("Stop"):tl("Speak a sale")}
                style={{ animation:listening?"pulse 1.2s ease-in-out infinite":"none" }}>
                {listening?<SquareIcon/>:<MicIcon/>}
              </Button>
            </div>
            {(listening||voice)&&(
              <Card className={`mb-3.5 ${listening?"border-destructive/48":"border-brand/48"}`}>
                <CardPanel className="p-4">
                  {listening ? (
                    <div>
                      <div className="mb-1 font-bold text-destructive-foreground text-xs">● {tl("Listening…")}</div>
                      <div className="min-h-[22px] text-base">{heard || <span className="text-muted-foreground italic">{vLang==="ru-RU"?"«Продал три булочки и два чизкейка»":"“Sold three buns and two cheesecakes”"}</span>}</div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-muted-foreground text-xs">{tl("I heard")}</div>
                      <div className="mb-2.5 text-[15px] italic">“{voice.text}”</div>
                      {voice.lines.length===0 && <p className="mb-2 text-destructive-foreground text-sm">{tl("No items recognised. Try again or tap the items.")}</p>}
                      {voice.lines.map(l=>{
                        const it = items.find(i=>i.rid===l.rid);
                        return (
                          <div key={l.rid} className="flex items-center gap-2 py-1">
                            <span className="flex-1 font-semibold text-[15px]">{it?.name}</span>
                            <QtyStepper value={l.qty} label={it?.name} onDec={()=>voiceBump(l.rid,-1)} onInc={()=>voiceBump(l.rid,1)}/>
                            <span className="min-w-[84px] text-right text-brand text-sm tabular-nums">{(l.qty*Number(it?.price||0)).toLocaleString()} {it?.currency}</span>
                          </div>
                        );
                      })}
                      {voice.missed.length>0 && <p className="mt-2 text-destructive-foreground text-xs">{tl("Not recognised")}: {voice.missed.join(", ")}</p>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Btn loading={saving} disabled={!voice.lines.length} onClick={voiceSellNow}>{tl("Confirm sale")} · {voice.lines.reduce((s,l)=>s+l.qty*Number(items.find(i=>i.rid===l.rid)?.price||0),0).toLocaleString()} {currency}</Btn>
                        <Btn variant="secondary" disabled={!voice.lines.length} onClick={voiceToCart}>{tl("Add to ticket")}</Btn>
                        <Btn variant="ghost" onClick={()=>setVoice(null)}>{tl("Discard")}</Btn>
                        <Btn variant="ghost" onClick={startListening}>{tl("Speak again")}</Btn>
                      </div>
                    </div>
                  )}
                </CardPanel>
              </Card>
            )}
            {shown.length===0 && <div className="p-10 text-center text-muted-foreground">{tl("No items found")}</div>}
            <div className="grid gap-3" style={{ gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))" }}>
              {shown.map(i=>{
                const q = cart[i.rid]||0;
                return (
                  <div key={i.rid} role="button" tabIndex={0} aria-label={`Add ${i.name}`} onClick={()=>bump(i.rid,1)}
                    onKeyDown={e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); bump(i.rid,1); } }}
                    className={`relative flex min-h-24 cursor-pointer select-none flex-col justify-between rounded-xl border-2 p-3 shadow-xs/5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring ${q?"border-brand bg-accent/60":"border-border bg-card hover:border-brand/40"}`}
                    style={{ WebkitTapHighlightColor:"transparent" }}>
                    <div className={`font-heading font-semibold text-base leading-tight ${q?"pe-9":""}`}>{i.name}</div>
                    <div className="mt-2 flex items-end justify-between gap-1">
                      <span className="font-semibold text-brand text-sm tabular-nums">{Number(i.price).toLocaleString()} {i.currency}</span>
                      <span className={`text-[11px] ${i.stock>0?"text-muted-foreground":"text-destructive-foreground"}`}>{i.stock>0?`${fmtN(i.stock)} ${tl("in stock")}`:tl("no stock")}</span>
                    </div>
                    {q>0 && <span className="absolute end-2 top-2 flex size-7 items-center justify-center rounded-full bg-brand font-bold text-brand-foreground text-sm tabular-nums">{q}</span>}
                    {q>0 && <Button variant="outline" size="icon-xs" aria-label={`Remove one ${i.name}`} className="absolute end-2 top-10 rounded-full"
                      onClick={e=>{e.stopPropagation();bump(i.rid,-1);}}><MinusIcon/></Button>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ticket */}
          <div className="flex max-w-full flex-[0_0_320px] flex-col gap-4 lg:sticky lg:top-[76px]">
            <Card>
              <CardHeader><CardTitle className="text-lg">{tl("Current sale")}</CardTitle></CardHeader>
              <CardPanel className="pt-0">
                {lines.length===0 ? <p className="text-muted-foreground text-sm italic">{tl("Tap items to add them.")}</p> : (
                  <>
                    {lines.map(l=>(
                      <div key={l.rid} className="flex items-center gap-2 border-b py-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold text-sm">{l.name}</div>
                          <div className="text-muted-foreground text-xs tabular-nums">{(l.qty*Number(l.price)).toLocaleString()} {l.currency}</div>
                        </div>
                        <QtyStepper value={l.qty} label={l.name} onDec={()=>bump(l.rid,-1)} onInc={()=>bump(l.rid,1)}/>
                      </div>
                    ))}
                    <div className="flex justify-between pt-3 pb-1 font-bold text-lg">
                      <span>{tl("Total")}</span><span className="text-brand tabular-nums">{total.toLocaleString()} {currency}</span>
                    </div>
                  </>
                )}
                <Label className="mt-3 mb-1.5 cursor-pointer font-normal text-muted-foreground"><Checkbox checked={earlier} onCheckedChange={v=>setEarlier(!!v)}/>{tl("Sold earlier")}</Label>
                {earlier && <CInput type="datetime-local" value={soldAt} max={nowLocal} onChange={e=>setSoldAt(e.target.value)} aria-label={tl("Sold earlier")} className="mb-2"/>}
                <Button size="xl" className="mt-1.5 w-full" loading={saving} disabled={!lines.length||(earlier&&!soldAt)} onClick={sell}>{tl("Sold")}</Button>
                {lines.length>0 && <Button variant="ghost" size="sm" className="mt-2 w-full text-muted-foreground" onClick={()=>setCart({})}>{tl("Clear")}</Button>}
              </CardPanel>
            </Card>

            {recent.length>0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">{tl("Recent sales")}</CardTitle></CardHeader>
                <CardPanel className="pt-0">
                  {recent.map(o=>{
                    const undone = o.status==="Declined";
                    return (
                      <div key={o.oid} className={`flex items-center gap-2 border-b py-2 last:border-b-0 ${undone?"opacity-45":""}`}>
                        <div className="min-w-0 flex-1">
                          <div className={`text-[13px] ${undone?"line-through":""}`}>{(o.items||[]).map(it=>`${it.qty} × ${it.name}`).join(", ")}</div>
                          <div className="text-[11px] text-muted-foreground tabular-nums">{new Date(o.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hour12:false})} · {Number(o.total).toLocaleString()} {currency}</div>
                        </div>
                        {!undone && <Button variant="outline" size="xs" className="text-destructive-foreground" onClick={()=>undo(o.oid)}><Undo2Icon/>{tl("Undo")}</Button>}
                      </div>
                    );
                  })}
                </CardPanel>
              </Card>
            )}
          </div>
        </div>
      )}
    </Page>
  );
}

// ─── PACKAGING ────────────────────────────────────────────────────────────────
// Default "Max. capacity" of an item in a package, by the item's unit
const defaultPkgCap = unit => String(unit||"").toLowerCase() === "grams" ? 100 : 1;

function MiniSpark({ series=[], tg=0 }) {
  if (!series.length) return <span style={{color:G.muted,fontSize:12}}>—</span>;
  const W=80, H=28, pad=2;
  const min = Math.min(...series), max = Math.max(...series), range = max - min || 1;
  const pts = series.map((v,i)=>`${pad + (i/(series.length-1||1))*(W-pad*2)},${H - pad - ((v-min)/range)*(H-pad*2)}`).join(" ");
  const color = tg >= 0 ? G.green : G.red;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
      <span style={{fontSize:11,fontWeight:700,color}}>{tg>0?"+":""}{Math.round(tg)}</span>
      <svg width={W} height={H} style={{overflow:"visible"}}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

// Searchable list of items not yet in the package (alphabetical, filtered while typing)
function PackageItemPicker({ recipes, chosen, onPick, tl }) {
  const [q, setQ] = useState(""); const [open, setOpen] = useState(false);
  const avail = recipes.filter(r=>!chosen.includes(r.rid) && r.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a,b)=>a.name.localeCompare(b.name));
  const pick = r => { onPick(r); setQ(""); setOpen(false); };
  return (
    <div className="relative">
      <CInput size="lg" value={q} onChange={e=>{setQ(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),150)}
        onKeyDown={e=>{ if(e.key==="Escape") setOpen(false); if(e.key==="Enter"&&avail.length){ e.preventDefault(); pick(avail[0]); } }}
        placeholder={tl("Type to search items…")} aria-label={tl("Type to search items…")}/>
      {open&&avail.length>0&&(
        <div className="absolute inset-x-0 top-[calc(100%+4px)] z-[500] max-h-60 overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg/10">
          {avail.map(r=>(
            <button key={r.rid} type="button" data-slot="picker-option" onMouseDown={()=>pick(r)}
              className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-accent">
              {r.name}{r.units&&<span className="text-muted-foreground"> · {r.units}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PackagingPage({ toast, onBack }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
  const [packages, setPackages] = useState([]); const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState([]); const [sortKey, setSortKey] = useState("name"); const [sortDir, setSortDir] = useState("asc");
  const [form, setForm] = useState(null);                 // null | { pid?, name, sku, rows:[{rid,name,unit,max_cap}] }
  const [procLinks, setProcLinks] = useState([]); const [suppliers, setSuppliers] = useState([]);
  const [linkPid, setLinkPid] = useState(null); const [linkSid, setLinkSid] = useState(""); const [linkPrice, setLinkPrice] = useState(""); const [linkCurrency, setLinkCurrency] = useState("AMD");
  const [stock, setStock] = useState({}); const [forecast, setForecast] = useState({}); const [refreshingForecast, setRefreshingForecast] = useState(false);
  const [wastageMode, setWastageMode] = useState(false); const [wastageDeltas, setWastageDeltas] = useState({});
  const [wastageConfirm, setWastageConfirm] = useState(false); const [applyingWastage, setApplyingWastage] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const load = useCallback(async()=>{ setLoading(true); try{
    const [pk, rc, proc, sups, stk, fc] = await Promise.all([
      api.getPackages(), api.getRecipes(), api.getProcurement(), api.getSuppliers(), api.getStock(), api.getPackageForecast().catch(()=>({})),
    ]);
    setPackages(pk||[]); setRecipes(rc||[]); setProcLinks(proc.links||[]); setSuppliers(sups||[]); setForecast(fc||{});
    const m = {}; (stk||[]).forEach(s=>{ m[s.pid]=(m[s.pid]||0)+Number(s.qty); }); setStock(m);
  } catch(e){ toast(e.message,"error"); } finally{ setLoading(false); } },[]);
  useEffect(()=>{ load(); },[]);

  const sorted = [...packages].sort((a,b)=>{ const x=String(a[sortKey]||""), y=String(b[sortKey]||""); const v=x<y?-1:x>y?1:0; return sortDir==="asc"?v:-v; });
  const toggleSort = k => { if(sortKey===k) setSortDir(d=>d==="asc"?"desc":"asc"); else { setSortKey(k); setSortDir("asc"); } };
  const toggleSel = id => setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);

  const openNew = () => setForm({ name:"", sku:"", rows:[] });
  const openEdit = p => setForm({ pid:p.pid, name:p.name, sku:p.sku||"", rows:(p.items||[]).map(i=>({ rid:i.rid, name:i.name, unit:i.unit, max_cap:String(Number(i.max_cap)) })) });
  const addRow = r => setForm(f=>({ ...f, rows:[...f.rows, { rid:r.rid, name:r.name, unit:r.units, max_cap:String(defaultPkgCap(r.units)) }] }));
  const removeRow = rid => setForm(f=>({ ...f, rows:f.rows.filter(r=>r.rid!==rid) }));
  const setCap = (rid, v) => setForm(f=>({ ...f, rows:f.rows.map(r=>r.rid===rid?{...r,max_cap:v}:r) }));
  const badCap = r => !(Number(r.max_cap) > 0);

  const save = async () => {
    if (!form.name.trim()) { toast(tl("Name required"),"error"); return; }
    if (form.rows.some(badCap)) { toast(tl("Max. capacity must be greater than 0"),"error"); return; }
    setSaving(true);
    try {
      const data = { name:form.name, sku:form.sku||null, items:form.rows.map(r=>({ rid:r.rid, max_cap:Number(r.max_cap) })) };
      const p = form.pid ? await api.updatePackage(form.pid, data) : await api.createPackage(data);
      setPackages(prev=>form.pid ? prev.map(x=>x.pid===p.pid?p:x) : [...prev,p]);
      toast(`"${p.name}" ${tl("saved")}`); setForm(null);
    } catch(e){ toast(e.message,"error"); } finally{ setSaving(false); }
  };

  const doDelete = async () => {
    try { await api.deletePackages(selected); setPackages(prev=>prev.filter(p=>!selected.includes(p.pid))); setSelected([]); setConfirmDel(false); toast(tl("Deleted")); }
    catch(e){ toast(e.message,"error"); }
  };
  const linkSupplier = async () => {
    if (!linkSid) { toast(tl("Select a supplier"),"error"); return; }
    try { await api.linkSupplierProduct(linkSid, { pid:linkPid, price:linkPrice?Number(linkPrice):null, currency:linkCurrency });
      await load(); setLinkPid(null); setLinkSid(""); setLinkPrice(""); toast(tl("Supplier linked")); }
    catch(e){ toast(e.message,"error"); }
  };
  const unlinkSupplier = async (sid, psid) => { try { await api.unlinkSupplierProduct(sid, psid); await load(); } catch(e){ toast(e.message,"error"); } };
  const refreshForecast = async () => {
    setRefreshingForecast(true);
    try { setForecast(await api.getPackageForecast() || {}); toast(tl("Forecast updated")); }
    catch(e){ toast(e.message,"error"); } finally{ setRefreshingForecast(false); }
  };

  const CURS = ["AMD","USD","EUR","RUR"];
  const cols = [
    {key:"name", label:tl("Name"), sortable:true, render:r=>(
      <button type="button" data-slot="link" onClick={()=>openEdit(r)} className="text-left underline decoration-dotted underline-offset-4 hover:text-brand">{r.name}</button>
    )},
    {key:"sku", label:tl("SKU"), sortable:true, render:r=>r.sku||<span className="text-muted-foreground">—</span>},
    {key:"items", label:tl("Items"), sortable:false, render:r=>(r.items||[]).length
      ? <div className="flex flex-col gap-0.5 text-xs">{r.items.map(i=><span key={i.rid}>{i.name} <span className="text-muted-foreground">≤ {Number(i.max_cap)} {i.unit||""}</span></span>)}</div>
      : <span className="text-muted-foreground">—</span>},
    {key:"suppliers", label:tl("Suppliers"), sortable:false, render:r=>{
      const links = procLinks.filter(l=>l.pid===r.pid);
      return (
        <div className="flex min-w-44 flex-col gap-1">
          {links.map(l=>(
            <div key={l.psid} className="flex items-center gap-1.5 text-xs">
              <span className="flex-1">{l.supplier_name}</span>
              {l.price&&<span className="font-semibold text-brand tabular-nums">{l.price} {l.currency}</span>}
              <Button variant="ghost" size="icon-xs" aria-label={`Unlink ${l.supplier_name}`} onClick={()=>unlinkSupplier(l.sid,l.psid)}><XIcon/></Button>
            </div>
          ))}
          {linkPid===r.pid ? (
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <CSelect items={suppliers.map(sp=>({label:sp.name,value:String(sp.sid)}))} value={linkSid||null} onValueChange={v=>setLinkSid(v||"")}>
                <SelectTrigger size="sm" className="w-36"><SelectValue placeholder={tl("Supplier…")}/></SelectTrigger>
                <SelectPopup>{suppliers.map(sp=><SelectItem key={sp.sid} value={String(sp.sid)}>{sp.name}</SelectItem>)}</SelectPopup>
              </CSelect>
              <CInput size="sm" type="number" value={linkPrice} onChange={e=>setLinkPrice(e.target.value)} placeholder={tl("Price")} aria-label={tl("Price")} className="w-20"/>
              <CSelect items={CURS.map(c=>({label:c,value:c}))} value={linkCurrency} onValueChange={v=>setLinkCurrency(v||"AMD")}>
                <SelectTrigger size="sm" className="w-20" aria-label="Currency"><SelectValue/></SelectTrigger>
                <SelectPopup>{CURS.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectPopup>
              </CSelect>
              <Button size="sm" onClick={linkSupplier}>{tl("Link")}</Button>
              <Button variant="ghost" size="icon-sm" aria-label="Cancel" onClick={()=>setLinkPid(null)}><XIcon/></Button>
            </div>
          ) : (
            <Button variant="ghost" size="xs" className="-ms-2 self-start text-brand" onClick={()=>{setLinkPid(r.pid);setLinkSid("");setLinkPrice("");}}><PlusIcon/>{tl("Add supplier")}</Button>
          )}
        </div>
      );
    }},
    {key:"stock", label:tl("Stock"), sortable:false, render:r=>{
      const qty = stock[r.pid] ?? 0, delta = wastageDeltas[r.pid] ?? 0, displayed = qty + delta;
      const step = d => setWastageDeltas(p=>{
        const next = d>0 ? Math.min(0,(p[r.pid]??0)+1) : Math.max(-qty,(p[r.pid]??0)-1);
        return next===0 ? Object.fromEntries(Object.entries(p).filter(([k])=>k!==String(r.pid))) : {...p,[r.pid]:next};
      });
      if (wastageMode) return (
        <div className="flex items-center gap-1.5">
          <QtyStepper value={displayed} label={r.name} display={<span className={displayed<qty?"text-destructive-foreground":""}>{displayed}</span>}
            onDec={()=>step(-1)} decDisabled={displayed<=0} onInc={()=>step(1)} incDisabled={delta===0}/>
          {delta<0&&<span className="text-[11px] text-destructive-foreground tabular-nums">{delta}</span>}
        </div>
      );
      return <span className={`font-semibold tabular-nums ${qty>0?"":"text-destructive-foreground"}`}>{Number(qty.toFixed(2))}</span>;
    }},
    {key:"forecast", label:tl("Forecast"), sortable:false, render:r=><MiniSpark series={forecast[r.pid]?.series||[]} tg={forecast[r.pid]?.tg??0}/>},
  ];

  const chosen = form ? form.rows.map(r=>r.rid) : [];
  const delNames = selected.map(id=>packages.find(p=>p.pid===id)?.name).filter(Boolean).join(", ");
  return (
    <Page title={tl("Packaging")} actions={<div className="flex flex-wrap gap-2">
      <Btn variant="secondary" size="sm" onClick={onBack}><ArrowLeftIcon/>{tl("Products")}</Btn>
      {selected.length>0&&!wastageMode&&<Btn variant="danger" size="sm" onClick={()=>setConfirmDel(true)}>{tl("Delete")} ({selected.length})</Btn>}
      {wastageMode && Object.keys(wastageDeltas).length>0 && <Btn size="sm" onClick={()=>setWastageConfirm(true)}>{tl("Confirm")}</Btn>}
      {wastageMode
        ? <Btn variant="secondary" size="sm" onClick={()=>{ setWastageMode(false); setWastageDeltas({}); }}>{tl("Cancel wastage")}</Btn>
        : <Btn variant="secondary" size="sm" onClick={()=>setWastageMode(true)}>{tl("Wastage")}</Btn>}
      <Btn variant="secondary" size="sm" onClick={refreshForecast} loading={refreshingForecast}>↻ {tl("Forecast")}</Btn>
      {!wastageMode&&<Btn size="sm" onClick={openNew}>{tl("+ Package")}</Btn>}
    </div>}>
      {form&&(
        <Card className="mb-5" style={{ animation:"fadeIn 0.2s ease" }}>
          <CardHeader><CardTitle>{form.pid?tl("Edit Package"):tl("New Package")}</CardTitle></CardHeader>
          <CardPanel className="flex flex-col gap-3.5 pt-0">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Input label={tl("Name")} value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} required/>
              <Input label={tl("SKU")} value={form.sku} onChange={v=>setForm(f=>({...f,sku:v}))} placeholder="Optional"/>
            </div>
            <FieldBlock label={tl("Items")}>
              <PackageItemPicker recipes={recipes} chosen={chosen} onPick={addRow} tl={tl}/>
            </FieldBlock>
            {form.rows.length>0&&(
              <div className="overflow-hidden rounded-xl border">
                <div className="grid grid-cols-[1fr_180px_32px] gap-2.5 bg-muted px-3 py-2 font-semibold text-muted-foreground text-xs">
                  <span>{tl("Name")}</span><span>{tl("Max. capacity")}</span><span/>
                </div>
                {form.rows.map(r=>(
                  <div key={r.rid} className="grid grid-cols-[1fr_180px_32px] items-center gap-2.5 border-t px-3 py-2">
                    <span className="text-sm">{r.name}</span>
                    <span className="flex items-center gap-1.5">
                      <CInput size="sm" type="number" min="0" step="any" value={r.max_cap} onChange={e=>setCap(r.rid,e.target.value)}
                        aria-label={`Max. capacity of ${r.name}`} aria-invalid={badCap(r)||undefined} className="w-20"/>
                      <span className="text-muted-foreground text-xs">{r.unit||""}</span>
                    </span>
                    <Button variant="ghost" size="icon-xs" aria-label={`${tl("Remove")} ${r.name}`} onClick={()=>removeRow(r.rid)}><XIcon/></Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2.5">
              <Btn size="sm" onClick={save} loading={saving}>{tl("Save")}</Btn>
              <Btn variant="ghost" size="sm" onClick={()=>setForm(null)}>{tl("Cancel")}</Btn>
            </div>
          </CardPanel>
        </Card>
      )}
      {loading?<Spinner/>:<DataTable columns={cols} rows={sorted.map(p=>({...p,_id:p.pid}))} selected={selected} onSelect={toggleSel} onSelectAll={setSelected} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}/>}
      <Dialog open={confirmDel} title={tl("Delete package?")} confirmLabel={tl("Yes")} onConfirm={doDelete} onCancel={()=>setConfirmDel(false)}>
        {tl("Are you sure you wish to delete")} <b className="text-foreground">{delNames}</b>? {tl("This action may not be undone.")}
      </Dialog>
      {wastageConfirm&&(
        <Modal title={tl("Confirm wastage")} onClose={()=>setWastageConfirm(false)}
          description={tl("The following packaging will be wasted, and stock levels shall be changed accordingly. The action is irreversible. Are you sure you wish to proceed?")}
          footer={<><span/><div className="flex gap-2">
            <Btn variant="ghost" size="sm" onClick={()=>setWastageConfirm(false)}>{tl("Cancel")}</Btn>
            <Btn size="sm" loading={applyingWastage} onClick={async()=>{
              setApplyingWastage(true);
              try {
                const upd = await api.applyWastage({changes:Object.entries(wastageDeltas).filter(([,d])=>d<0).map(([pid,delta])=>({pid:Number(pid),delta}))});
                const m = {}; (upd||[]).forEach(s=>{ m[s.pid]=Number(s.qty); }); setStock(m);
                setWastageMode(false); setWastageDeltas({}); setWastageConfirm(false); toast(tl("Wastage applied"));
              } catch(e){ toast(e.message,"error"); } finally{ setApplyingWastage(false); }
            }}>OK</Btn></div></>}>
          <div className="rounded-lg bg-muted px-4 py-2">
            {Object.entries(wastageDeltas).filter(([,d])=>d<0).map(([pid,delta])=>(
              <div key={pid} className="flex justify-between border-b py-1.5 text-sm last:border-b-0">
                <span className="font-semibold">{packages.find(p=>String(p.pid)===pid)?.name||pid}</span>
                <span className="font-semibold text-destructive-foreground tabular-nums">{delta}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </Page>
  );
}

// Segmented toggle used by the Orders and Inventory hubs
function SegToggle({ options, value, onChange }) {
  return (
    <SegmentedControl role="tablist" className="max-w-full justify-start overflow-x-auto [scrollbar-width:none]">
      {options.map(([k,l])=>(
        <SegmentedControlItem key={k} role="tab" aria-selected={value===k} data-checked={value===k?"":undefined}
          onClick={()=>onChange(k)} className="px-4">{l}</SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}

// Orders = Online (customer / Board of Arrivals orders) | Offline (walk-in Quick Sale)
function OrdersHub({ toast }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
  const [view, setView] = useState("online");
  return (
    <>
      <div style={{maxWidth:1100,margin:"0 auto",padding:"24px 24px 0"}}>
        <SegToggle options={[["online",tl("Online")],["offline",tl("Offline")]]} value={view} onChange={setView}/>
      </div>
      {view==="online" ? <OrdersManufPage toast={toast}/> : <QuickSalePage toast={toast}/>}
    </>
  );
}

// Inventory = Products | Items | Packaging | Closing count
function InventoryHub({ toast, initial }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
  const [view, setView] = useState(initial || "products");
  useEffect(()=>{ if (initial) setView(initial); },[initial]);
  return (
    <>
      <div style={{maxWidth:1100,margin:"0 auto",padding:"24px 24px 0"}}>
        <SegToggle options={[["products",tl("Products")],["items",tl("Items")],["packaging",tl("Packaging")],["count",tl("Closing count")]]} value={view} onChange={setView}/>
      </div>
      {view==="products" && <ProductsPage toast={toast}/>}
      {view==="items"    && <RecipesPage toast={toast}/>}
      {view==="packaging"&& <PackagingPage toast={toast} onBack={()=>setView("products")}/>}
      {view==="count"    && <ClosingCountPage toast={toast}/>}
    </>
  );
}

// ─── PRODUCTION CHART (Marimekko-style) ───────────────────────────────────────
// X = equipment units, each holding one bar per running batch (process); Y = equipment capacity used.
// A bar is cut into sections: units reserved through the Board of Arrivals (hatched, labelled with the
// order), units still free (plain) and, for a batch that ended short, the unfulfilled part (red).
function ProductionChart({ toast }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
  const [data, setData] = useState(null);
  const [tip, setTip] = useState(null);                       // { x, y, text }
  const [confirm, setConfirm] = useState(null);               // unfulfilled order awaiting "cancel" confirmation
  const [busy, setBusy] = useState(false);
  const load = useCallback(async()=>{ try { setData(await api.getProduction()); } catch(e){ /* chart is optional */ } },[]);
  useEffect(()=>{ load(); const t = setInterval(load, 60000); return ()=>clearInterval(t); },[]);
  if (!data) return null;

  const fmtN = v => String(parseFloat(Number(v).toFixed(2)));
  const unitLabel = u => !u ? "" : (String(u).toLowerCase()==="pcs" ? "pcs." : u);
  const PLOT_H = 230, BAR_W = 112, GAP = 16, GROUP_GAP = 34, LEFT = 44, TOP = 34, BOTTOM = 58;

  // Build groups: equipment unit (or "no equipment") → one bar per batch
  const groups = new Map();
  for (const run of data.runs) {
    const byKey = new Map();
    for (const it of run.items) {
      const key = it.eid || "none";
      byKey.set(key, [...(byKey.get(key)||[]), it]);
    }
    for (const [key, its] of byKey) {
      if (!groups.has(key)) groups.set(key, { key, name: key==="none" ? tl("No equipment") : its[0].equipment, bars: [] });
      groups.get(key).bars.push({ run, items: its });
    }
  }
  const list = [...groups.values()].sort((a,b)=> a.key==="none" ? 1 : b.key==="none" ? -1 : a.name.localeCompare(b.name));

  // Sections of one item, bottom to top, in units
  const sections = it => {
    const secs = [];
    const reservedTotal = it.reservations.reduce((s,r)=>s+r.qty,0);
    for (const r of it.reservations) if (r.qty - r.short > 1e-9) secs.push({ kind:"reserved", units:r.qty - r.short, oid:r.oid, customer:r.customer, it });
    for (const r of it.reservations) if (r.short > 1e-9) secs.push({ kind:"short", units:r.short, oid:r.oid, customer:r.customer, it });
    const free = it.made === null ? it.declared - reservedTotal : it.made - (reservedTotal - it.reservations.reduce((s,r)=>s+r.short,0));
    if (free > 1e-9) secs.push({ kind:"free", units:free, it });
    return secs;
  };

  let x = LEFT;
  const layout = list.map(g => {
    const gx = x;
    const bars = g.bars.map(b => {
      const secs = b.items.flatMap(sections);
      const noEq = g.key === "none";
      // fraction of the equipment's capacity used: units / (units that fit)
      const used = noEq ? null : b.items.reduce((s,it)=>{ const u = sections(it).reduce((a,c)=>a+c.units,0); return s + u / it.volume; }, 0);
      const totalUnits = secs.reduce((s,c)=>s+c.units,0) || 1;
      const barH = noEq ? PLOT_H : Math.min(1, used) * PLOT_H;
      let y = TOP + PLOT_H;
      const placed = secs.map(c => {
        const h = noEq ? c.units / totalUnits * barH : (c.units / c.it.volume) / used * barH;
        y -= h; return { ...c, y, h };
      });
      const bx = x; x += BAR_W + GAP;
      return { ...b, bx, barH, used, placed, noEq };
    });
    x += GROUP_GAP - GAP;
    return { ...g, gx, gw: x - gx - GROUP_GAP + GAP - GAP, bars };
  });
  const W = Math.max(520, x + 10), H = TOP + PLOT_H + BOTTOM;
  const clip = (s, n) => s.length > n ? s.slice(0, n-1) + "…" : s;

  const decide = async (u, action) => {
    setBusy(true);
    try {
      await api.resolveShortfall(u.resid, action);
      toast(action==="cancel" ? `${tl("Order")} #${u.oid} ${tl("cancelled")}` : `${tl("Start")} “${u.process_name}” ${tl("again for")} ${fmtN(u.shortfall)} × ${u.item_name}`);
      setConfirm(null); await load();
    } catch(e){ toast(e.message,"error"); } finally { setBusy(false); }
  };

  const legend = (fill, label, hatch) => (
    <span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,color:G.muted}}>
      <svg width="18" height="12"><rect width="18" height="12" rx="2" fill={fill}/>{hatch&&<rect width="18" height="12" rx="2" fill="url(#pcHatch)"/>}</svg>{label}
    </span>
  );
  const FREE = `${G.caramel}33`;

  return (
    <div style={{marginTop:28}}>
      <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:10}}>
        <h3 style={{fontFamily:G.font,fontSize:18,color:G.dark,margin:0}}>{tl("Production")}</h3>
        <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
          {legend(FREE, tl("Produced, not reserved"))}
          {legend(G.caramel, tl("Reserved on the Board of Arrivals"), true)}
          {legend(G.red, tl("Unfulfilled"))}
        </div>
      </div>
      <div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:14,padding:"14px 10px",overflowX:"auto",position:"relative"}}>
        {list.length===0 ? (
          <div style={{padding:"26px 10px",textAlign:"center",color:G.muted,fontSize:14}}>{tl("No batches in production.")}</div>
        ) : (
          <svg width={W} height={H} style={{display:"block",fontFamily:G.mono}} role="img" aria-label={tl("Production capacity chart")}
               onMouseLeave={()=>setTip(null)}>
            <defs>
              <pattern id="pcHatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="7" height="7" fill={G.caramel}/><rect width="3" height="7" fill={G.white} opacity="0.28"/>
              </pattern>
              <pattern id="pcRed" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
                <rect width="7" height="7" fill={G.red}/><rect width="3" height="7" fill={G.white} opacity="0.22"/>
              </pattern>
            </defs>
            {[0,25,50,75,100].map(t=>{ const y = TOP + PLOT_H - t/100*PLOT_H; return (
              <g key={t}><line x1={LEFT} x2={W-6} y1={y} y2={y} stroke={G.border} strokeWidth="1" strokeDasharray={t?"3,4":"0"}/>
                <text x={LEFT-8} y={y+4} textAnchor="end" fontSize="11" fill={G.muted}>{t}%</text></g>
            );})}
            {layout.map(g=>(
              <g key={g.key}>
                {g.bars.map(b=>{
                  const reservedUnits = b.placed.filter(c=>c.kind==="reserved").reduce((s,c)=>s+c.units,0);
                  const madeUnits = b.items.reduce((s,it)=>s+(it.made===null?it.declared:it.made),0);
                  const top = TOP + PLOT_H - b.barH;
                  const pct = b.noEq ? "n/a" : `${Math.round(b.used*100)}%`;
                  return (
                    <g key={b.run.prid}>
                      {b.placed.map((c,ci)=>{
                        const fill = c.kind==="free" ? FREE : c.kind==="reserved" ? "url(#pcHatch)" : "url(#pcRed)";
                        const label = c.kind==="free" ? null : [`#${c.oid}`, `${c.it.name} x ${fmtN(c.units)} ${unitLabel(c.it.unit)}`];
                        const text = c.kind==="free"
                          ? `${c.it.name}: ${fmtN(c.units)} ${unitLabel(c.it.unit)} ${tl("not reserved")}`
                          : `#${c.oid}${c.customer?` · ${c.customer}`:""}: ${c.it.name} x ${fmtN(c.units)} ${unitLabel(c.it.unit)}${c.kind==="short"?` — ${tl("unfulfilled")}`:""}`;
                        return (
                          <g key={ci} onMouseMove={e=>{ const r = e.currentTarget.ownerSVGElement.getBoundingClientRect(); setTip({ x:e.clientX-r.left, y:e.clientY-r.top, text }); }}>
                            <rect x={b.bx} y={c.y+1} width={BAR_W} height={Math.max(0,c.h-2)} rx="3" fill={fill}/>
                            {label && c.h >= 34 && (
                              <g>
                                <rect x={b.bx+BAR_W/2-46} y={c.y+c.h/2-17} width="92" height="34" rx="4" fill={G.white} opacity="0.88"/>
                                <text x={b.bx+BAR_W/2} y={c.y+c.h/2-3} textAnchor="middle" fontSize="12" fontWeight="700" fill={G.dark}>{label[0]}</text>
                                <text x={b.bx+BAR_W/2} y={c.y+c.h/2+12} textAnchor="middle" fontSize="10.5" fill={G.dark}>{clip(label[1], 17)}</text>
                              </g>
                            )}
                          </g>
                        );
                      })}
                      <text x={b.bx+BAR_W/2} y={top-8} textAnchor="middle" fontSize="13" fontWeight="700" fill={G.dark}>{pct}</text>
                      <text x={b.bx+BAR_W/2} y={TOP+PLOT_H+16} textAnchor="middle" fontSize="11.5" fontWeight="600" fill={G.dark}>{clip(b.run.process_name, 16)}</text>
                      <text x={b.bx+BAR_W/2} y={TOP+PLOT_H+30} textAnchor="middle" fontSize="10.5" fill={G.muted}>{`${fmtN(madeUnits)} ${tl("units")} · ${fmtN(reservedUnits)} ${tl("reserved")}`}</text>
                    </g>
                  );
                })}
                <text x={g.bars[0].bx} y={TOP+PLOT_H+50} fontSize="11" fontWeight="700" fill={G.caramel}>{clip(g.name, 24)}</text>
              </g>
            ))}
          </svg>
        )}
        {tip && <div style={{position:"absolute",left:Math.min(tip.x+14, W-200),top:tip.y+22,background:G.dark,color:G.white,fontSize:12,padding:"5px 9px",borderRadius:6,pointerEvents:"none",maxWidth:300,fontFamily:G.mono,zIndex:5}}>{tip.text}</div>}
      </div>

      {data.unfulfilled.length>0 && (
        <div style={{marginTop:14,display:"flex",flexDirection:"column",gap:10}}>
          {data.unfulfilled.map(u=>(
            <div key={u.resid} style={{background:G.white,border:`1px solid ${G.red}`,borderRadius:12,padding:"12px 16px",display:"flex",gap:14,alignItems:"center",flexWrap:"wrap"}}>
              <div style={{flex:"1 1 280px",minWidth:0}}>
                <div style={{fontSize:14,fontWeight:700,color:G.dark}}>😰 {tl("Order")} #{u.oid} {tl("unfulfilled")}</div>
                <div style={{fontSize:13,color:G.muted,marginTop:3,lineHeight:1.5}}>
                  {fmtN(u.shortfall)} × {u.item_name} {tl("could not be produced")} ({u.process_name}). {u.guest_name}{u.guest_email?` · ${u.guest_email}`:""}{u.guest_phone?` · ${u.guest_phone}`:""}
                </div>
              </div>
              <Btn size="sm" variant="secondary" disabled={busy} onClick={()=>decide(u,"reproduce")}>{tl("Re-produce")}</Btn>
              <Btn size="sm" variant="danger" disabled={busy} onClick={()=>setConfirm(u)}>{tl("Contact customer & cancel")}</Btn>
            </div>
          ))}
        </div>
      )}
      {confirm && (
        <div style={{position:"fixed",inset:0,background:"rgba(44,24,16,0.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:G.white,borderRadius:16,padding:32,maxWidth:480,width:"90%",boxShadow:"0 20px 60px rgba(44,24,16,0.2)"}}>
            <h3 style={{fontFamily:G.font,fontSize:20,marginBottom:12}}>{tl("Cancel order")} #{confirm.oid}?</h3>
            <p style={{color:G.muted,lineHeight:1.6,marginBottom:14,fontSize:15}}>{tl("Please let the customer know first:")}</p>
            <div style={{background:G.sand,borderRadius:10,padding:"12px 16px",marginBottom:20,fontSize:14,color:G.dark,lineHeight:1.7}}>
              <b>{confirm.guest_name}</b>{confirm.guest_phone&&<div>{confirm.guest_phone}</div>}{confirm.guest_email&&<div>{confirm.guest_email}</div>}
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <Btn variant="ghost" onClick={()=>setConfirm(null)}>{tl("Back")}</Btn>
              <Btn variant="danger" loading={busy} onClick={()=>decide(confirm,"cancel")}>{tl("Cancel order")}</Btn>
            </div>
          </div>
        </div>
      )}
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
    return fuzzySearch(hay, q);
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

  // Search debounce ref — 2 second delay as per spec
  const searchRef = useRef(null);
  const [searchInput, setSearchInput] = useState("");
  useEffect(()=>{
    clearTimeout(searchRef.current);
    searchRef.current = setTimeout(()=>{ setSearch(searchInput); setPage(0); }, 2000);
    return ()=>clearTimeout(searchRef.current);
  },[searchInput]);

  // Kanban/Table toggle
  const switchView = k => { setView(k); if (k==="kanban") { setDateFrom(todayStr()); setDateTo(todayStr()); } setPage(0); };
  const ViewToggle = () => (
    <SegmentedControl aria-label="View">
      <SegmentedControlItem data-checked={view==="kanban"?"":undefined} onClick={()=>switchView("kanban")} aria-label="Board" title="Board" className="px-2"><LayoutGridIcon className="size-4"/></SegmentedControlItem>
      <SegmentedControlItem data-checked={view==="table"?"":undefined} onClick={()=>switchView("table")} aria-label="List" title="List" className="px-2"><ListIcon className="size-4"/></SegmentedControlItem>
    </SegmentedControl>
  );

  const StatusDropdown = () => (
    <Menu>
      <MenuTrigger className={buttonVariants({ variant:"outline", size:"sm" })}>
        <ListFilterIcon/>{tl("Status")}{!allSelected ? ` (${filter.length}/${statuses.length})` : ""}
      </MenuTrigger>
      <MenuPopup align="end" className="min-w-48">
        <MenuItem closeOnClick={false} onClick={()=>{ setFilter(allSelected ? [] : [...statuses]); setPage(0); }} className="font-medium text-muted-foreground">
          {allSelected ? "Deselect all" : "Select all"}
        </MenuItem>
        <MenuSeparator/>
        {statuses.map(st=>(
          <MenuCheckboxItem key={st} checked={filter.includes(st)} closeOnClick={false} onCheckedChange={()=>{ toggleStatus(st); setPage(0); }}>
            {tl(st)}
          </MenuCheckboxItem>
        ))}
      </MenuPopup>
    </Menu>
  );

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <Btn size="sm" onClick={()=>setShowNewOrder(true)}>{tl("+ Order")}</Btn>
      <SearchField value={searchInput} onChange={setSearchInput} onClear={()=>{setSearchInput("");setSearch("");setPage(0);}} placeholder={tl("Search")+"…"}/>
      <span className="text-muted-foreground text-xs">{tl("From")}</span>
      <DateField label={tl("From")} value={dateFrom} max={dateTo} onChange={v=>{setDateFrom(v);setPage(0);}} />
      <span className="text-muted-foreground text-xs">{tl("To")}</span>
      <DateField label={tl("To")} value={dateTo} min={dateFrom} onChange={v=>{setDateTo(v);setPage(0);}} />
      {ViewToggle()}
      {StatusDropdown()}
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
        <div className="grid gap-3.5" style={{ gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))" }}>
          {KANBAN_ORDER.filter(status=>filter.includes(status)).map(status=>{
            const cfg=STATUS_CONFIG[status]; const col=searched.filter(o=>o.status===status);
            return (
              <Card key={status} className="overflow-hidden">
                <div className="flex items-center justify-between px-3.5 py-2.5" style={{ background:`${cfg.color}1a`, borderBottom:`2px solid ${cfg.color}` }}>
                  <span className="font-bold text-[13px] tracking-wide" style={{ color:cfg.color }}>{tl(status.toUpperCase())}</span>
                  <span className="rounded-full bg-card px-2 py-0.5 font-bold text-xs tabular-nums" style={{ color:cfg.color }}>{col.length}</span>
                </div>
                <div className="flex min-h-20 flex-col gap-2 p-2.5">
                  {col.map(o=>(
                    <div key={o.oid} className="rounded-xl border bg-background p-3 text-[13px]">
                      <div className="mb-1 flex justify-between">
                        <span className="font-bold">#{o.oid}{o.prid?` | ${tl("Run")} ${o.prid}`:""}</span>
                        <span className="text-[11px] text-muted-foreground tabular-nums">{new Date(o.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
                      </div>
                      <p className="mb-1.5 text-muted-foreground text-xs">{o.customer?.first_name} {o.customer?.last_name}</p>
                      <div className="mb-2">{(o.items||[]).map((it,i)=><div key={i} className="text-xs">{it.qty}× {it.name}</div>)}</div>
                      <div className="flex items-center justify-between gap-2 border-t pt-2">
                        <span className="font-bold text-brand tabular-nums">{(o.items||[]).reduce((s,it)=>s+it.qty*it.price,0)} AMD</span>
                        <span className="text-right text-[11px] text-muted-foreground">{o.is_boa?"Board of Arrivals · "+(o.fulfillment==='delivery'?tl("Delivery"):tl("Pickup (free)")):o.fulfillment==='stock'?tl("Stock"):(o.source==='market'?tl("Marketplace")+" · ":"")+(o.pickup?tl("Pickup (free)"):tl("Delivery"))}</span>
                      </div>
                      {(cfg.next && !(o.status==="Done" && o.allNonDeliverable))&&(
                        <div className="mt-2 flex gap-1">
                          <Button size="xs" className="flex-1" onClick={()=>advance(o.oid)}>{tl(cfg.next)}</Button>
                          {o.status==="Accepted"&&(
                            <Button size="icon-xs" variant="outline" aria-label={`Edit order ${o.oid}`} onClick={()=>setEditOrder(o)}><PencilIcon/></Button>
                          )}
                          {cfg.canDecline&&<Button size="icon-xs" variant="destructive" aria-label={`Decline order ${o.oid}`} onClick={()=>{setPending(o.oid);setDialog("decline");}}><XIcon/></Button>}
                        </div>
                      )}
                    </div>
                  ))}
                  {col.length===0&&<div className="p-4 text-center text-muted-foreground text-xs">{tl("Empty")}</div>}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        // ── TABLE ─────────────────────────────────────────────────────────────
        <>
          <TableShell>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {TABLE_COLS.map(c=><SortHead key={c.key} label={tl(c.label)} active={sortKey===c.key} dir={sortDir} onClick={()=>toggleSort(c.key)}/>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.length===0?(
                  <TableRow className="hover:bg-transparent"><TableCell colSpan={TABLE_COLS.length} className="py-10 text-center text-muted-foreground">{tl("No orders found.")}</TableCell></TableRow>
                ):paged.map(o=>{
                  const cfg=STATUS_CONFIG[o.status]||STATUS_CONFIG.New;
                  const d=new Date(o.created_at);
                  const dateStr=`${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`;
                  return (
                    <TableRow key={o.oid}>
                      <TableCell className={`${CELL} font-bold`}>#{o.oid}</TableCell>
                      <TableCell className={`${CELL} text-muted-foreground tabular-nums`}>{dateStr}</TableCell>
                      <TableCell className={CELL}>{o.customer?.first_name}</TableCell>
                      <TableCell className={CELL}>{o.customer?.last_name}</TableCell>
                      <TableCell className={CELL}>
                        <span className="rounded-full px-2.5 py-0.5 font-bold text-xs" style={{background:`${cfg.color}1f`,color:cfg.color}}>{tl(o.status)}</span>
                      </TableCell>
                      <TableCell className={`${CELL} font-bold text-brand tabular-nums`}>{o.total} AMD</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableShell>
          <TablePager total={sorted.length} page={page} pageCount={totalPages} pageSize={pageSize}
            onPage={setPage} onPageSize={n=>{setPageSize(n);setPage(0);}}
            label={`${sorted.length} order${sorted.length!==1?"s":""} · page ${totalPages?page+1:0}/${totalPages}`}/>
        </>
      )}
      <ProductionChart toast={toast}/>
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
        <Empty className="rounded-2xl border border-border border-dashed bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon"><StoreIcon/></EmptyMedia>
            <EmptyTitle>{tl("No restaurants open right now")}</EmptyTitle>
            <EmptyDescription>{tl("Check back soon!")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ):(
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-5">
          {menus.map(m=>(
            <button type="button" key={m.mid} data-slot="restaurant-card" onClick={()=>{setActiveMenu(m);setPage("order");}}
              className="group overflow-hidden rounded-2xl border border-border bg-card text-start shadow-xs/5 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg/5 focus-visible:outline-2 focus-visible:outline-ring">
              <div className="flex h-28 items-center justify-center bg-linear-to-br from-brand/12 to-brand/28">
                <ChefHatIcon className="size-12 text-accent-foreground opacity-80 transition-transform group-hover:scale-105"/>
              </div>
              <div className="flex flex-col gap-1 p-5">
                <h3 className="font-heading font-semibold text-xl">Pun&Cotta Bakery</h3>
                <p className="text-muted-foreground text-sm">{m.name} · {(m.recipes||[]).length} items</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground text-xs"><TruckIcon className="size-3.5"/>Delivery: {m.delivery_fee} AMD</span>
                  <CBadge variant="success">Open</CBadge>
                </div>
              </div>
            </button>
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
  const moqStr = r => `min. ${Number(r.moq) % 1 === 0 ? Number(r.moq) : Number(r.moq).toFixed(1)} ${subAbbr(r.units||"")}`;
  const recOf = rid => (menu.recipes||[]).find(x=>x.rid===rid);
  const stepper = (r, size="sm") => (
    <div className="flex items-center gap-1.5">
      <Button variant="outline" size={size==="lg"?"icon":"icon-sm"} aria-label={`Fewer ${r.name}`} disabled={!(qty[r.rid]||0)} onClick={()=>changeQty(r,-1)}><MinusIcon/></Button>
      <span className={`text-center font-semibold tabular-nums ${size==="lg"?"text-base":"text-sm"}`} style={{ minWidth:r.allow_submultiples?(size==="lg"?64:52):(size==="lg"?28:20) }}>{displayQty(r,qty[r.rid]||0)}</span>
      <Button size={size==="lg"?"icon":"icon-sm"} aria-label={`More ${r.name}`} onClick={()=>changeQty(r,1)}><PlusIcon/></Button>
    </div>
  );

  return (
    <Page title={menu.name} actions={<Btn variant="ghost" size="sm" onClick={()=>setPage("restaurants")}><ArrowLeftIcon/>Restaurants</Btn>}>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          {Object.entries(grouped).map(([cat,recs])=>(
            <section key={cat} className="flex flex-col gap-2.5">
              <h3 className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">{cat}</h3>
              <div className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-xs/5">
                {recs.map(r=>(
                  <div key={r.rid} data-slot="menu-item" className="flex items-center gap-3 px-4 py-3.5">
                    {/* Thumbnail */}
                    {(r.image_thumb_url||r.image_url)?(
                      <button type="button" data-slot="item-thumb" aria-label={`View photo of ${r.name}`}
                        className="group relative shrink-0 overflow-hidden rounded-lg" style={{ width:THUMB, height:THUMB }}
                        onClick={()=>setLightbox({src:r.image_url||r.image_thumb_url,description:r.description})}>
                        <img src={r.image_thumb_url||r.image_url} alt="" className="size-full object-cover"/>
                        <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white opacity-0 transition-opacity group-hover:opacity-100"><ZoomInIcon className="size-4"/></span>
                      </button>
                    ):(
                      <div className="flex shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground" style={{ width:THUMB, height:THUMB }}><CakeSliceIcon className="size-5"/></div>
                    )}
                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <button type="button" data-slot="row-link" onClick={()=>setViewItem(r)} className="text-start font-semibold text-sm hover:underline">{r.name}</button>
                      <p className="font-semibold text-accent-foreground text-sm tabular-nums">{displayPrice(r)}</p>
                      {r.allow_submultiples && r.moq && <p className="text-muted-foreground text-xs">{moqStr(r)}</p>}
                    </div>
                    {(qty[r.rid]||0)>0&&<span className="min-w-16 text-end font-semibold text-muted-foreground text-sm tabular-nums max-sm:hidden">{lineTotal(r,qty[r.rid]||0)} AMD</span>}
                    {stepper(r)}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* CART */}
        <Card className="lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-lg"><ShoppingBasketIcon className="size-5 text-muted-foreground"/>{tl("Your order")}</CardTitle>
          </CardHeader>
          <CardPanel className="flex flex-col gap-4">
            {cartItems.length===0?(
              <p className="text-muted-foreground text-sm">{tl("Add items from the menu.")}</p>
            ):(
              <div className="flex flex-col gap-2">
                {cartItems.map((it,i)=>{ const r=recOf(it.rid); return (
                  <div key={i} data-slot="cart-line" className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{it.name}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon-xs" aria-label={`Fewer ${it.name}`} onClick={()=>changeQty(r,-1)}><MinusIcon/></Button>
                      <span className="min-w-5 text-center font-semibold tabular-nums">{it.qty}</span>
                      <Button variant="outline" size="icon-xs" aria-label={`More ${it.name}`} onClick={()=>changeQty(r,1)}><PlusIcon/></Button>
                    </div>
                    <span className="min-w-14 text-end font-semibold tabular-nums">{it.qty*it.price}</span>
                  </div>
                ); })}
              </div>
            )}

            <div className="flex flex-col gap-2.5 border-border border-t pt-4">
              <span className="font-medium text-sm">Fulfillment</span>
              {hasUndeliverable?(
                <Alert variant="warning">
                  <TriangleAlertIcon/>
                  <AlertTitle>Pickup only</AlertTitle>
                  <AlertDescription>Your order includes items available for pickup only. Delivery for this order may not be fulfilled.</AlertDescription>
                </Alert>
              ):(
                <RadioGroup value={delivery||""} onValueChange={v=>setDelivery(v)} className="gap-2">
                  {[{val:"pickup",label:"Pickup (free)",Icon:StoreIcon},{val:"delivery",label:`${tl("Delivery")} (+${menu.delivery_fee} AMD)`,Icon:TruckIcon}].map(({val,label,Icon})=>(
                    <Label key={val} className="cursor-pointer gap-2.5 rounded-lg border border-border px-3 py-2.5 font-normal has-data-checked:border-brand/60 has-data-checked:bg-accent/50">
                      <Radio value={val}/><Icon className="size-4 text-muted-foreground"/>{label}
                    </Label>
                  ))}
                </RadioGroup>
              )}
            </div>

            {delivery==="delivery"&&!hasUndeliverable&&(
              <RadioGroup value={String(selectedAddr)} onValueChange={v=>setSelectedAddr(Number(v))} className="gap-2">
                {savedAddresses.map((addr,i)=>(
                  <Label key={i} className="cursor-pointer items-start gap-2.5 rounded-lg border border-border px-3 py-2.5 font-normal has-data-checked:border-brand/60 has-data-checked:bg-accent/50">
                    <Radio value={String(i)} className="mt-0.5"/>
                    <span className="flex flex-col gap-0.5">
                      {addr.label&&<span className="font-semibold text-muted-foreground text-xs">{addr.label}</span>}
                      <span className="text-sm leading-snug">{addr.display}</span>
                    </span>
                  </Label>
                ))}
                <Label className="cursor-pointer gap-2.5 px-3 py-1 font-normal">
                  <Radio value="-1"/>Other address
                </Label>
                {selectedAddr===-1&&(
                  <div className="flex flex-col gap-2.5 ps-3">
                    <Input label="Street" value={otherStreet} onChange={onOtherFieldChange(setOtherStreet)} />
                    <div className="grid grid-cols-2 gap-2.5">
                      <Input label="City" value={otherCity} onChange={onOtherFieldChange(setOtherCity)} />
                      <Input label="ZIP"  value={otherZip}  onChange={onOtherFieldChange(setOtherZip)} />
                    </div>
                  </div>
                )}
              </RadioGroup>
            )}

            <div className="flex flex-col gap-1.5 border-border border-t pt-3">
              {deliveryFee>0&&<div className="flex justify-between text-muted-foreground text-sm"><span>{tl("Delivery fee")}</span><span className="tabular-nums">{deliveryFee} AMD</span></div>}
              <div className="flex justify-between font-bold text-base"><span>{tl("Total")}</span><span className="text-accent-foreground tabular-nums">{total} AMD</span></div>
            </div>

            <Btn onClick={submit} loading={submitting} disabled={itemTotal===0} title={itemTotal===0?"Please add items to your order":undefined} style={{width:"100%"}}>Place order</Btn>
          </CardPanel>
        </Card>
      </div>
      <Lightbox src={lightbox?.src} description={lightbox?.description} onClose={()=>setLightbox(null)} />

      {/* Item detail sheet */}
      <Sheet open={!!viewItem} onOpenChange={o=>{ if(!o) setViewItem(null); }}>
        <SheetPopup side="bottom" showCloseButton={false} className="mx-auto max-w-xl rounded-t-3xl">
          {viewItem&&(<>
            {(viewItem.image_url||viewItem.image_thumb_url)&&(
              <button type="button" data-slot="item-hero" aria-label="View full photo" className="block h-52 w-full overflow-hidden rounded-t-3xl"
                onClick={()=>setLightbox({src:viewItem.image_url||viewItem.image_thumb_url})}>
                <img src={viewItem.image_url||viewItem.image_thumb_url} alt={viewItem.name} className="size-full object-cover"/>
              </button>
            )}
            <SheetHeader className="flex-row items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <SheetTitle className="font-heading text-2xl">{viewItem.name}</SheetTitle>
                <p className="font-bold text-accent-foreground text-lg tabular-nums">{displayPrice(viewItem)}</p>
              </div>
              <Button variant="ghost" size="icon" aria-label="Close" onClick={()=>setViewItem(null)}><XIcon/></Button>
            </SheetHeader>
            <SheetPanel className="flex flex-col gap-4 pt-0">
              {viewItem.description&&<p className="text-muted-foreground text-sm leading-relaxed">{viewItem.description}</p>}
              {viewItem.allow_submultiples && viewItem.moq && <p className="text-muted-foreground text-sm">{moqStr(viewItem)}</p>}
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-border p-1.5">{stepper(viewItem,"lg")}</div>
                <Btn onClick={()=>{ if((qty[viewItem.rid]||0)===0) changeQty(viewItem,1); setViewItem(null); }} style={{ flex:1 }}>
                  {(qty[viewItem.rid]||0)>0 ? `In basket · ${lineTotal(viewItem,qty[viewItem.rid]||0)} AMD` : "Add to basket"}
                </Btn>
              </div>
            </SheetPanel>
          </>)}
        </SheetPopup>
      </Sheet>
    </Page>
  );
}

// ─── ORDERS (CUSTOMER) ────────────────────────────────────────────────────────
function OrdersCustPage({
 toast, setPage }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
  const [orders, setOrders] = useState([]); const [loading, setLoading] = useState(true); const [dialog, setDialog] = useState(null); const [pending, setPending] = useState(null);
  const load=useCallback(async()=>{setLoading(true);try{setOrders(await api.getOrders());}catch(e){toast(e.message,"error");}finally{setLoading(false);}},[]); useEffect(()=>{load();},[]);
  const cancel=async()=>{try{const u=await api.cancelOrder(pending);setOrders(p=>p.map(o=>o.oid===pending?u:o));toast(`Order #${pending} cancelled`);setDialog(null);}catch(e){toast(e.message,"error");}};
  const confirmDel=async oid=>{try{const u=await api.confirmDelivery(oid);setOrders(p=>p.map(o=>o.oid===oid?u:o));toast("Order confirmed as delivered!");}catch(e){toast(e.message,"error");}};
  return (
    <Page title={tl("My Orders")}>
      {loading?<Spinner/>:orders.length===0?(
        <Empty className="rounded-2xl border border-border border-dashed bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon"><ReceiptTextIcon/></EmptyMedia>
            <EmptyTitle>{tl("No orders yet")}</EmptyTitle>
          </EmptyHeader>
          <EmptyContent><Btn size="sm" onClick={()=>setPage?.("restaurants")}><StoreIcon/>{tl("Restaurants")}</Btn></EmptyContent>
        </Empty>
      ):(
        <div className="mx-auto flex max-w-3xl flex-col gap-3.5">
          {orders.map(o=>{
            const cfg=STATUS_CONFIG[o.status]||STATUS_CONFIG.New;
            const total=(o.items||[]).reduce((s,it)=>s+it.qty*it.price,0);
            return (
              <Card key={o.oid} data-slot="cust-order">
                <CardPanel className="flex flex-col gap-3 pt-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <span className="font-semibold">Order #{o.oid}</span>
                      <span className="text-muted-foreground text-xs">{new Date(o.created_at).toLocaleString()}</span>
                      {o.is_boa&&<CBadge variant="secondary">{o.seller_name?`Board of Arrivals · ${o.seller_name}`:"Board of Arrivals"}</CBadge>}
                      {o.source==='market'&&<CBadge variant="secondary">{o.seller_name?`${tl("Marketplace")} · ${o.seller_name}`:tl("Marketplace")}</CBadge>}
                    </div>
                    <CBadge variant="outline" className="border-transparent font-semibold" style={{ color:cfg.color, background:`${cfg.color}1f` }}>{tl(o.status)}</CBadge>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {(o.items||[]).map((it,i)=>(
                      <div key={i} className="flex justify-between text-muted-foreground text-sm">
                        <span>{it.name} × {it.qty}</span><span className="tabular-nums">{it.qty*it.price} AMD</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-border border-t pt-3">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-accent-foreground tabular-nums">
                      {o.pickup?<StoreIcon className="size-4"/>:<TruckIcon className="size-4"/>}{total} AMD · {o.pickup?tl("Pickup (free)"):tl("Delivery")}
                    </span>
                    <div className="flex gap-2">
                      {!["Declined","Delivered"].includes(o.status)&&<Btn variant="ghost" size="sm" onClick={()=>{setPending(o.oid);setDialog("cancel");}}>{tl("Cancel")}</Btn>}
                      {["Done","Dispatched"].includes(o.status)&&<Btn variant="success" size="sm" onClick={()=>confirmDel(o.oid)}><PackageCheckIcon/>{tl("I got my order ✓").replace(/\s*✓$/,"")}</Btn>}
                    </div>
                  </div>
                </CardPanel>
              </Card>
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

// ─── GENERAL / PROFILE PAGE ───────────────────────────────────────────────────
// Address search backed by OpenStreetMap Nominatim (shared by General and Schedule)
function AddressSearch({ query, onQuery, onPick, lat, lng, lang }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);
  const change = v => {
    onQuery(v);
    clearTimeout(timer.current);
    if (v.length < 3) { setResults([]); return; }
    timer.current = setTimeout(async()=>{
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(v)}&format=json&limit=6&addressdetails=1`,
          { headers:{ 'Accept-Language': lang==='ru'?'ru':'en' } }
        );
        setResults(await res.json()||[]);
      } catch{}
      finally{ setLoading(false); }
    }, 400);
  };
  return (
    <div className="relative">
      <MapPinIcon className="-translate-y-1/2 pointer-events-none absolute start-3 top-1/2 z-10 size-4 text-muted-foreground"/>
      <CInput size="lg" value={query} onChange={e=>change(e.target.value)} placeholder="Start typing your address…" aria-label="Address"
        onBlur={()=>setTimeout(()=>setResults([]),150)} className={`[&_input]:ps-9 ${lat&&lng?"[&_input]:pe-36":"[&_input]:pe-9"}`}/>
      <span className="-translate-y-1/2 pointer-events-none absolute end-3 top-1/2 z-10 text-xs">
        {loading ? <Loader2Icon className="animate-spin size-4 text-muted-foreground"/>
          : lat&&lng&&!results.length ? <span className="inline-flex items-center gap-1 text-success-foreground tabular-nums"><CheckIcon className="size-3.5"/>{Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}</span>
          : null}
      </span>
      {results.length>0&&(
        <div data-slot="address-results" role="listbox" className="absolute inset-x-0 top-[calc(100%+4px)] z-[600] max-h-64 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg/5">
          {results.map((r,i)=>(
            <button type="button" key={i} role="option" data-slot="address-option"
              onMouseDown={()=>{ onPick({ display:r.display_name, lat:Number(r.lat), lng:Number(r.lon) }); setResults([]); }}
              className="block w-full rounded-sm px-2.5 py-2 text-start text-sm hover:bg-accent hover:text-accent-foreground">
              {r.display_name}
            </button>
          ))}
          <p className="px-2.5 py-1 text-end text-[10px] text-muted-foreground">© OpenStreetMap contributors</p>
        </div>
      )}
    </div>
  );
}

function GeneralPage({ user, setUser, toast }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;

  const [form, setForm]     = useState({
    first_name:'', last_name:'', email:'', phone:'', business_name:'',
    street_address:'', city:'', zip:'',
    logo_url:null, logo_cloudinary_id:null,
    lat:null, lng:null, address_display:'',
  });
  const [addrQuery,   setAddrQuery]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [uploading,setUploading]= useState(false);
  const [delName, setDelName] = useState('');
  const [deleting, setDeleting] = useState(false);

  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const deleteRestaurant = async () => {
    setDeleting(true);
    try {
      await api.deleteRestaurant(delName);
      toast('Restaurant marked as deleted');
      setTimeout(()=>{ localStorage.removeItem('token'); window.location.reload(); }, 1200);
    } catch(e){ toast(e.message,'error'); setDeleting(false); }
  };

  useEffect(()=>{
    api.getProfile().then(p=>{
      setForm(f=>({...f,...p}));
      if (p.address_display) setAddrQuery(p.address_display);
    }).catch(()=>{}).finally(()=>setLoading(false));
  },[]);

  const uploadLogo = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg','image/jpg','image/png','image/webp'].includes(file.type)) {
      toast('Only JPG, PNG, WEBP allowed', 'error'); return;
    }
    if (file.size > 3*1024*1024) { toast('File exceeds 3MB', 'error'); return; }
    setUploading(true);
    try {
      // Read as data URI and upload via backend (same pattern as recipe images)
      const dataUri = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = () => rej(new Error('Read failed'));
        r.readAsDataURL(file);
      });
      const result = await api.uploadLogo({ data_uri: dataUri });
      set('logo_url', result.logo_url);
      set('logo_cloudinary_id', result.logo_cloudinary_id);
      setUser(u => ({ ...u, logo_url: result.logo_url }));
      toast(tl('Saved'));
    } catch(e){ toast(e.message||'Upload failed','error'); }
    finally{ setUploading(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.updateProfile(form);
      setUser(u=>({...u, ...updated}));
      toast(tl('Saved'));
    } catch(e){ toast(e.message,'error'); }
    finally{ setSaving(false); }
  };

  if (loading) return <Page title="General"><Spinner/></Page>;

  const sec = (title, description, children, extra="") => (
    <Card className={`mb-4 ${extra}`}>
      <CardHeader>
        <CardTitle className="font-heading text-lg">{title}</CardTitle>
        {description&&<CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardPanel className="flex flex-col gap-4">{children}</CardPanel>
    </Card>
  );

  return (
    <Page title="General" actions={<Btn onClick={save} loading={saving}><CheckIcon/>Save</Btn>}>
      <div className="mx-auto max-w-3xl">
      {sec("Branding", null, <>
        <div className="flex flex-wrap items-center gap-5">
          {/* Logo preview */}
          <div className="flex h-12 w-30 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
            {form.logo_url
              ? <img src={form.logo_url} alt="logo" className="size-full object-contain"/>
              : <span className="truncate px-2 font-bold font-heading text-brand text-lg italic">{form.business_name||'Logo'}</span>}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div>
              <p className="font-medium text-sm">Restaurant logo</p>
              <p className="text-muted-foreground text-xs">Appears in the nav bar instead of the app name. Recommended: 240×96px, transparent background.</p>
            </div>
            <div className="flex gap-2">
              <label className={buttonVariants({ variant:"outline", size:"sm", className:"cursor-pointer" })} data-slot="logo-upload">
                {uploading ? <Loader2Icon className="animate-spin size-4"/> : <ImageUpIcon/>}Upload
                <input type="file" accept="image/*" onChange={uploadLogo} className="sr-only"/>
              </label>
              {form.logo_url&&<Button variant="ghost" size="sm" className="text-destructive-foreground" onClick={()=>{set('logo_url',null);set('logo_cloudinary_id',null);}}><Trash2Icon/>Remove</Button>}
            </div>
          </div>
        </div>
        <Input label={tl("Business name")} value={form.business_name||''} onChange={v=>set('business_name',v)}
          hint="Shown to customers in menus and Board of Arrivals."/>
      </>)}

      {sec("Contact", null, <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label={tl("First name")} value={form.first_name||''} onChange={v=>set('first_name',v)}/>
          <Input label={tl("Last name")}  value={form.last_name||''}  onChange={v=>set('last_name',v)}/>
        </div>
        <Input label={tl("Email")} value={form.email||''} type="email" disabled hint="Email cannot be changed here."/>
        <Label className="cursor-pointer font-normal">
          <Checkbox checked={!!form.notify_email} onCheckedChange={v=>set('notify_email',!!v)}/>
          Also use it for notifications
        </Label>
        <Input label={tl("Phone")} value={form.phone||''} onChange={v=>set('phone',v)} placeholder="+374 91 …"/>
      </>)}

      {sec("Restaurant address", "Used to show your restaurant's distance from customers on the Board of Arrivals.", <>
        <AddressSearch query={addrQuery} lang={lang} lat={form.lat} lng={form.lng}
          onQuery={v=>{ setAddrQuery(v); set('address_display', v); }}
          onPick={a=>{ setAddrQuery(a.display); set('address_display',a.display); set('lat',a.lat); set('lng',a.lng); }}/>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label={tl("City")} value={form.city||''} onChange={v=>set('city',v)}/>
          <Input label={tl("ZIP")}  value={form.zip||''}  onChange={v=>set('zip',v)}/>
        </div>
        <Input label={tl("Street address")} value={form.street_address||''} onChange={v=>set('street_address',v)}/>
      </>)}

      {/* Security area — only for the restaurant's administrator */}
      {form.restaurant?.can_delete&&(
        <Card className="mb-4 border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-destructive-foreground text-lg"><ShieldAlertIcon className="size-5"/>{tl("Security area")}</CardTitle>
          </CardHeader>
          <CardPanel className="flex flex-col gap-4">
            <Input label={tl("Restaurant name")} value={delName} onChange={setDelName}
              hint={`The account will be marked as deleted and will be completely deleted in 7 days. Type in the name of your organization - "${form.restaurant.name}"`}/>
            <div>
              <Btn variant="danger" onClick={deleteRestaurant} loading={deleting}
                disabled={delName.trim()!==form.restaurant.name.trim()}><Trash2Icon/>{tl("Delete restaurant")}</Btn>
            </div>
          </CardPanel>
        </Card>
      )}
      </div>
    </Page>
  );
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
  const [lat,     setLat]     = useState(null);
  const [lng,     setLng]     = useState(null);
  const [addressDisplay, setAddressDisplay] = useState('');
  const [addrQuery,      setAddrQuery]      = useState('');

  useEffect(()=>{
    api.getSchedule().then(s=>{
      if (s?.schedule) { setSchedule(s.schedule); setStoreSchedule(s.schedule); }
      if (s?.timezone) setTimezone(s.timezone);
      if (s?.latest_order_before) setLatestOrder(s.latest_order_before);
      if (s?.lat) setLat(Number(s.lat));
      if (s?.lng) setLng(Number(s.lng));
      if (s?.address_display) { setAddressDisplay(s.address_display); setAddrQuery(s.address_display); }
    }).catch(()=>{}).finally(()=>setLoading(false));
  },[]);

  const save = async () => {
    setSaving(true);
    try {
      await api.saveSchedule({ schedule, timezone, latest_order_before: latestOrder, lat, lng, address_display: addressDisplay });
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
    <Page title={tl("Schedule")} actions={<Btn onClick={save} loading={saving}><CheckIcon/>{tl("Save schedule")}</Btn>}>
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Restaurant address</CardTitle>
          <CardDescription>Used to show your restaurant's distance from customers on the Board of Arrivals.</CardDescription>
        </CardHeader>
        <CardPanel>
          <AddressSearch query={addrQuery} lang={lang} lat={lat} lng={lng}
            onQuery={setAddrQuery}
            onPick={a=>{ setAddrQuery(a.display); setAddressDisplay(a.display); setLat(a.lat); setLng(a.lng); }}/>
        </CardPanel>
      </Card>

      <Card>
        <CardPanel className="grid grid-cols-1 items-end gap-5 pt-6 sm:grid-cols-2">
          <Select label="Time zone" value={timezone} onChange={setTimezone}
            options={TIMEZONES.map(tz=>({value:tz,label:tz.replace("_"," ")}))} />
          <Field className="gap-1.5">
            <FieldLabel>Latest order no later than</FieldLabel>
            <div className="flex flex-wrap items-center gap-2.5">
              <CInput type="time" size="lg" value={latestOrder} min="00:00" max={globalMax} aria-label="Latest order"
                onChange={e=>setLatestOrder(e.target.value)} className="w-32 [&_input]:[color-scheme:light] dark:[&_input]:[color-scheme:dark]"/>
              <span className="font-medium text-sm">{tl("before closing")}</span>
              <span className="text-muted-foreground text-xs">(max {globalMax})</span>
            </div>
          </Field>
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Opening hours</CardTitle>
        </CardHeader>
        <CardPanel className="flex flex-col divide-y divide-border pt-0">
          {DAYS.map((day,di)=>{
            const periods = schedule[day]||[];
            const isOff = periods.length===0;
            return (
              <div key={day} data-slot="schedule-day" className="flex flex-wrap items-start gap-x-6 gap-y-2 py-3.5">
                <div className="flex basis-full items-center gap-2.5 pt-1.5 sm:min-w-36 sm:basis-auto">
                  <Label className="cursor-pointer">
                    <Checkbox checked={!isOff} onCheckedChange={v=>{ if(v) addPeriod(day); else setSchedule(p=>({...p,[day]:[]})); }}/>
                    <span className={`font-semibold ${isOff?"text-muted-foreground":""}`}>{tl(DAY_LABELS[di])}</span>
                  </Label>
                  {isOff&&<span className="text-muted-foreground text-xs italic">Closed</span>}
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  {periods.map((per,i)=>(
                    <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 sm:flex">
                      <CInput type="time" value={per.start} aria-label={`${DAY_LABELS[di]} opens`} onChange={e=>updatePeriod(day,i,"start",e.target.value)}
                        className="w-full sm:w-32 [&_input]:[color-scheme:light] dark:[&_input]:[color-scheme:dark]"/>
                      <span className="text-muted-foreground">–</span>
                      <CInput type="time" value={per.end} aria-label={`${DAY_LABELS[di]} closes`} onChange={e=>updatePeriod(day,i,"end",e.target.value)}
                        className="w-full sm:w-32 [&_input]:[color-scheme:light] dark:[&_input]:[color-scheme:dark]"/>
                      <Button variant="ghost" size="icon-sm" aria-label={tl("Remove")} title={tl("Remove")}
                        className="text-muted-foreground hover:text-destructive-foreground" onClick={()=>removePeriod(day,i)}><XIcon/></Button>
                    </div>
                  ))}
                  {!isOff&&(
                    <div><Button variant="outline" size="xs" className="border-dashed" onClick={()=>addPeriod(day)}><PlusIcon/>{tl("Add period").replace(/^\+\s*/,"")}</Button></div>
                  )}
                </div>
              </div>
            );
          })}
        </CardPanel>
      </Card>
      </div>
    </Page>
  );
}

// ─── PROCUREMENT PAGE ─────────────────────────────────────────────────────────
// Number input with − / + buttons (free typing allowed)
function NumStepper({ value, onChange, onStep, label="Quantity", className="" }) {
  return (
    <div data-slot="num-stepper" className={`inline-flex items-center gap-1 ${className}`}>
      <Button variant="outline" size="icon-xs" aria-label={`Decrease ${label.toLowerCase()}`} onClick={()=>onStep(-1)}><MinusIcon/></Button>
      <CInput type="number" size="sm" min={0} step="any" aria-label={label} value={value??""} onChange={e=>onChange(e.target.value)}
        className="w-16 [&_input]:text-center"/>
      <Button variant="outline" size="icon-xs" aria-label={`Increase ${label.toLowerCase()}`} onClick={()=>onStep(1)}><PlusIcon/></Button>
    </div>
  );
}

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
  const [sortKey, setSortKey]     = useState("created_at");   // newest orders first
  const [sortDir, setSortDir]     = useState("desc");
  const [page, setPage]           = useState(0);
  const [pageSize, setPageSize]   = useState(25);
  const [saving, setSaving]       = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [acceptDialog, setAcceptDialog]   = useState(false);
  const [cancelView, setCancelView]       = useState(false);   // dialog slid to the cancel notice
  const [acceptComments, setAcceptComments] = useState("");
  const [acceptItems, setAcceptItems]     = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
      setProducts([...(proc.products||[]), ...(proc.packages||[])]); setProcLinks(proc.links||[]);
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
  const rowQtyChange = (i,delta) => setNewRows(r=>r.map((x,j)=>j===i?{...x,qty:Math.max(0,Math.min(9999,Math.round(((parseFloat(x.qty)||0)+delta)*1000)/1000))}:x));

  const calcTotals = (rows) => {
    const subtotal = rows.reduce((s,r)=>s+(parseFloat(r.qty)||0)*(parseFloat(r.unit_price)||0),0);
    const delivery = parseFloat(newFee)||0;
    const vat = (subtotal+delivery)*0.2;
    return { subtotal, delivery, vat, total: subtotal+delivery+vat };
  };

  // Returns true when the order was stored (as a draft at least)
  const saveOrder = async (submit=false) => {
    if (!newSid) { toast("Select a supplier","error"); return false; }
    if (!newRows.length) { toast("Add at least one product","error"); return false; }
    if (newRows.some(r=>!r.pid)) { toast("Select a product in every row","error"); return false; }
    setSaving(true);
    let order = null;
    try {
      const items = newRows.map(r=>({ pid:Number(r.pid), qty_ordered:parseFloat(r.qty)||1, unit_price:parseFloat(r.unit_price)||0, currency:r.currency||newCurrency }));
      order = await api.createSupplierOrder({ sid:Number(newSid), items, delivery_term:newTerm||null, delivery_fee:parseFloat(newFee)||0, currency:newCurrency });
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
      return true;
    } catch(e){
      if (order) {
        // Saved, but submitting failed: keep it as a draft the user can submit later
        toast(`Order #${order.order_id} was saved as a draft, but could not be submitted: ${e.message}`,"error");
        setOrders(o=>[order,...o]); setShowNew(false); resetNewForm();
        return true;
      }
      toast(e.message,"error"); return false;
    } finally{ setSaving(false); }
  };
  const newDirty = showNew && !!(newSid || newRows.length || newTerm || (newFee && newFee!=="0"));

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

  const [acceptOrig, setAcceptOrig] = useState("");
  const openOrder = async (soid) => {
    try {
      const o = await api.getSupplierOrder(soid);
      const its = o.items.map(it=>({...it, qty_actual: it.qty_actual !== null ? it.qty_actual : it.qty_ordered}));
      setViewOrder(o); setCancelView(false);
      setAcceptItems(its); setAcceptOrig(JSON.stringify(its));
    } catch(e){ toast(e.message,"error"); }
  };
  const draftDirty = viewOrder?.status==="New" && JSON.stringify(acceptItems)!==acceptOrig;
  const saveDraftEdits = async () => {
    if (acceptItems.some(it=>!it.soiid && !it.pid)) { toast("Select a product in every row","error"); return false; }
    setSaving(true);
    try {
      const items = acceptItems.filter(it=>it.soiid||it.pid).map(it=>({soiid:it.soiid,pid:it.pid,qty_ordered:parseFloat(it.qty_actual)||0,unit_price:parseFloat(it.unit_price)||0,currency:it.currency}));
      await api.updateSupplierOrder(viewOrder.soid, { items });
      toast("Order saved"); await load(); setViewOrder(null);
      return true;
    } catch(e){ toast(e.message,"error"); return false; } finally{ setSaving(false); }
  };
  const [leaveDraft, setLeaveDraft] = useState(false);
  // Navigating away (or closing the tab) with an unsaved order asks to save it or lose it
  useLeaveGuard(newDirty || draftDirty, async()=> newDirty ? saveOrder(false) : saveDraftEdits());

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
      // Keep the reconciliation PDF on the row so its "PDF" link shows without a reload
      setOrders(o=>o.map(x=>x.soid===viewOrder.soid?{...x,status:"Accepted",recon_pdf_url:result.recon_pdf_url||x.recon_pdf_url||null}:x));
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
  const PO_BADGE = { New:"bg-secondary text-muted-foreground", Submitted:"bg-warning/16 text-warning-foreground", Cancelled:"bg-destructive/12 text-destructive-foreground",
    Delivered:"bg-info/14 text-info-foreground", Accepted:"bg-success/16 text-success-foreground" };
  const closeView = () => { setViewOrder(null); setCancelView(false); };
  const requestCloseView = () => { if (draftDirty) setLeaveDraft(true); else closeView(); };
  const productItems = list => list.map(p=>({ label:`${p.name}${p.sku?` (${p.sku})`:""}`, value:String(p.pid) }));
  const setAcc = (i, patch) => setAcceptItems(a=>a.map((x,j)=>j===i?{...x,...patch}:x));
  const H = "h-10 px-3 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider whitespace-nowrap";
  const fmtPlaced = iso => { const d = new Date(iso);
    return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; };
  const pdfBtn = (onClick, label) => (
    <Button variant="ghost" size="xs" className="text-accent-foreground" onClick={onClick} aria-label={label}><FileDownIcon/>PDF</Button>
  );
  const isNewOrder = viewOrder?.status==="New";

  return (
    <Page title={tl("Procurement")} actions={<>
      <Btn variant="secondary" size="sm" loading={saving&&!showNew&&!viewOrder} onClick={async()=>{
        setSaving(true);
        try{ await api.createDraftOrders(); await load(); toast("Orders created from forecast"); }
        catch(e){ toast(e.message,"error"); }
        finally{ setSaving(false); }
      }}><SparklesIcon/>From forecast</Btn>
      <Btn size="sm" onClick={()=>{ if (showNew && newDirty) setConfirmCancel(true); else setShowNew(s=>!s); }}><PlusIcon/>{tl("+ Order").replace(/^\+\s*/,"")}</Btn>
    </>}>

      {/* ── NEW ORDER FORM ─────────────────────────────────────────────── */}
      {showNew&&(
        <Card className="mb-6" style={{ animation:"fadeIn 0.2s ease" }}>
          <CardHeader>
            <CardTitle className="font-heading text-lg">New supplier order</CardTitle>
            <CardAction><Button variant="ghost" size="icon-sm" aria-label="Close" onClick={()=>newDirty?setConfirmCancel(true):setShowNew(false)}><XIcon/></Button></CardAction>
          </CardHeader>
          <CardPanel className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Select label="Supplier" required value={String(newSid)} onChange={v=>{ setNewSid(v); setNewTerm(""); setNewRows([]); }}
                placeholder="Select supplier…" options={suppliers.map(s=>({ label:s.name, value:s.sid }))}/>
              <Select label="Delivery term" value={newTerm} onChange={setNewTerm} placeholder={newSid?"Select term…":"Select a supplier first"}
                options={availTerms.map(t=>({ label:`${t.name} (cut-off ${t.cutoff})`, value:t.name }))}/>
              <Field className="gap-1.5">
                <FieldLabel>Delivery fee</FieldLabel>
                <CInput size="lg" type="number" min="0" value={newFee} placeholder="0"
                  onKeyDown={e=>{ if(e.key==="-"||e.key==="−") e.preventDefault(); }}
                  onChange={e=>{ const v=e.target.value; if(v===''||parseFloat(v)>=0) setNewFee(v); }}
                  onBlur={e=>{ if(parseFloat(e.target.value)<0||e.target.value==='') setNewFee('0'); }}/>
              </Field>
              <Select label="Currency" value={newCurrency} onChange={setNewCurrency} options={["AMD","USD","EUR","RUR"].map(c=>({label:c,value:c}))}/>
            </div>

            {/* Product rows */}
            <div className="overflow-x-auto rounded-xl border border-border [&_thead_tr]:bg-muted">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={H}>Product</TableHead>
                    <TableHead className={H}>{tl("Qty")}</TableHead>
                    <TableHead className={H}>Unit price</TableHead>
                    <TableHead className={`${H} text-end`}>Total</TableHead>
                    <TableHead className="w-10"/>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {newRows.map((r,i)=>{
                    const tot = (parseFloat(r.qty)||0)*(parseFloat(r.unit_price)||0);
                    return (
                      <TableRow key={i} data-slot="po-row">
                        <TableCell className="min-w-52 px-3 py-2">
                          <MiniSelect aria-label="Product" value={String(r.pid)} className="w-full"
                            items={[{label:"Select product…",value:""}, ...productItems(availProducts)]}
                            onChange={v=>{
                              const link=procLinks.find(l=>String(l.pid)===v&&String(l.sid)===String(newSid));
                              setNewRows(rs=>rs.map((x,j)=>j===i?{...x, pid:v, ...(link?{unit_price:link.price||0, currency:link.currency||newCurrency}:{})}:x));
                            }}/>
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <NumStepper label="Quantity" value={r.qty} onChange={v=>updateRow(i,"qty",v)} onStep={d=>rowQtyChange(i,d)}/>
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <CInput type="number" size="sm" min={0} aria-label="Unit price" value={r.unit_price} className="w-24" onChange={e=>updateRow(i,"unit_price",e.target.value)}/>
                        </TableCell>
                        <TableCell className="px-3 py-2 text-end font-semibold text-accent-foreground tabular-nums">{tot.toFixed(2)}</TableCell>
                        <TableCell className="px-2 py-2">
                          <Button variant="ghost" size="icon-xs" aria-label="Remove product" className="text-muted-foreground hover:text-destructive-foreground" onClick={()=>removeRow(i)}><XIcon/></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="px-3 py-2">
                      <Button variant="outline" size="sm" className="border-dashed" onClick={addRow} disabled={!newSid||!availProducts.length}><PlusIcon/>Add product</Button>
                      {!newSid
                        ? <span className="ms-3 text-muted-foreground text-xs">Select a supplier to see their products.</span>
                        : !availProducts.length && <span className="ms-3 text-muted-foreground text-xs">No products are linked to this supplier yet — link them on Inventory → Products.</span>}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Totals */}
            <dl className="ms-auto grid w-full max-w-64 grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
              {[["Subtotal",totals.subtotal],["Delivery",totals.delivery],["VAT (20%)",totals.vat],["Total",totals.total]].map(([l,v])=>(
                <React.Fragment key={l}>
                  <dt className={l==="Total"?"border-border border-t pt-1.5 font-semibold":"text-muted-foreground"}>{l}</dt>
                  <dd className={`text-end tabular-nums ${l==="Total"?"border-border border-t pt-1.5 font-bold text-accent-foreground":""}`}>{v.toFixed(2)} {newCurrency}</dd>
                </React.Fragment>
              ))}
            </dl>
          </CardPanel>
          <CardFooter className="justify-end gap-2 border-border border-t pt-4">
            <Btn variant="ghost" onClick={()=>newDirty?setConfirmCancel(true):setShowNew(false)}>Cancel</Btn>
            <Btn variant="secondary" onClick={()=>saveOrder(false)} loading={saving}>Save draft</Btn>
            <Btn onClick={()=>saveOrder(true)} loading={saving}><SendIcon/>Submit</Btn>
          </CardFooter>
        </Card>
      )}

      {/* ── ORDERS TABLE ───────────────────────────────────────────────── */}
      {loading?<Spinner/>: sorted.length===0 && !showNew ? (
        <Empty className="rounded-2xl border border-border border-dashed bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon"><TruckIcon/></EmptyMedia>
            <EmptyTitle>No supplier orders yet</EmptyTitle>
            <EmptyDescription>Create one by hand, or let Tanelu draft orders from your forecast.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : sorted.length>0 && (
        <>
          <TableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  {[["order_id","ID"],["created_at","Placed on"],["status","Status"],["etd","ETD"],["supplier_name","Supplier"]].map(([k,h])=>(
                    <SortHead key={k} label={h} active={sortKey===k} dir={sortDir} onClick={()=>toggleSort(k)} className={k==="etd"?"max-md:hidden":k==="created_at"?"max-sm:hidden":""}/>
                  ))}
                  <TableHead className={`${H} px-4`}>PO</TableHead>
                  <TableHead className={`${H} px-4`}>Reconciliation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map(o=>(
                  <TableRow key={o.soid}>
                    <TableCell className={`${CELL} font-mono font-semibold`}>
                      {["New","Submitted"].includes(o.status)
                        ? <button type="button" data-slot="row-link" onClick={()=>openOrder(o.soid)} className="text-accent-foreground underline decoration-dotted underline-offset-3 hover:decoration-solid">{o.order_id}</button>
                        : o.order_id}
                    </TableCell>
                    <TableCell className={`${CELL} text-muted-foreground tabular-nums max-sm:hidden`}>{fmtPlaced(o.created_at)}</TableCell>
                    <TableCell className={CELL}><CBadge variant="outline" className={`border-transparent font-semibold ${PO_BADGE[o.status]||PO_BADGE.New}`}>{o.status}</CBadge></TableCell>
                    <TableCell className={`${CELL} text-muted-foreground tabular-nums max-md:hidden`}>{o.etd ? new Date(o.etd).toLocaleDateString("en-GB") : "—"}</TableCell>
                    <TableCell className={CELL}>{o.supplier_name}</TableCell>
                    <TableCell className="px-4 py-2">
                      {o.po_pdf_url&&o.status!=="New"
                        ? pdfBtn(async()=>{ const r=await api.getSupplierOrderPDF(o.soid); downloadPDF(r.pdf,o.order_id,"purchase_order"); }, `Purchase order ${o.order_id} PDF`)
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      {o.recon_pdf_url&&o.status==="Accepted"
                        ? pdfBtn(async()=>{ const r=await api.getSupplierOrderPDF(o.soid,"recon"); downloadPDF(r.pdf,o.order_id,"reconciliation"); }, `Reconciliation ${o.order_id} PDF`)
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableShell>
          <TablePager total={sorted.length} page={page} pageCount={totalPages} pageSize={pageSize} sizes={[10,25,50]}
            label={`${sorted.length} orders · page ${totalPages?page+1:0}/${totalPages}`}
            onPage={setPage} onPageSize={n=>{ setPageSize(n); setPage(0); }}/>
        </>
      )}

      {/* ── VIEW / ACCEPT ORDER DIALOG ──────────────────────────────────── */}
      {viewOrder&&(
        <Modal onClose={requestCloseView} className="max-w-3xl"
          title={`${isNewOrder?"Edit order":"Accept order"} #${viewOrder.order_id}`}
          description={viewOrder.supplier_name}
          footer={<>
            <div>
              {viewOrder.status==="Submitted" && <Btn variant="ghost" style={{ color:"var(--destructive-foreground)" }} onClick={()=>setCancelView(true)}><BanIcon/>Cancel order</Btn>}
              {isNewOrder && <Btn variant="ghost" style={{ color:"var(--destructive-foreground)" }} onClick={()=>setConfirmDelete(true)}><Trash2Icon/>Delete</Btn>}
            </div>
            <div className="flex gap-2">
              <Btn variant="ghost" onClick={requestCloseView}>Close</Btn>
              {isNewOrder ? (<>
                <Btn variant="secondary" loading={saving} onClick={saveDraftEdits}>Save</Btn>
                <Btn loading={saving} onClick={async()=>{
                  if (draftDirty && !(await saveDraftEdits())) return;
                  setSaving(true);
                  try {
                    const submitted = await api.submitSupplierOrder(viewOrder.soid);
                    toast(`Order #${submitted.order_id} submitted`);
                    downloadPDF(submitted.po_pdf_url, submitted.order_id, "purchase_order");
                    await load(); setViewOrder(null);
                  } catch(e){ toast(e.message,"error"); } finally{ setSaving(false); }
                }}><SendIcon/>Submit</Btn>
              </>) : viewOrder.status==="Submitted" ? (
                <Btn onClick={()=>setAcceptDialog(true)}><CheckIcon/>Accept order</Btn>
              ) : null}
            </div>
          </>}>
          <div className="-mx-1 overflow-x-auto rounded-xl border border-border [&_thead_tr]:bg-muted">
            <Table>
              <TableHeader>
                <TableRow>
                  {(isNewOrder
                    ? ["Product","SKU",tl("Qty"),"Unit price","Total",""]
                    : ["Product","SKU","Ordered","Actual","Unit price","Total (ord / act)",""]
                  ).map((h,k)=><TableHead key={k} className={H}>{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {acceptItems.map((it,i)=>{
                  const qty = isNewOrder ? (parseFloat(it.qty_actual)??parseFloat(it.qty_ordered)) : parseFloat(it.qty_actual);
                  const totOrd = (parseFloat(it.qty_ordered)||0)*(parseFloat(it.unit_price)||0);
                  const totAct = (qty||0)*(parseFloat(it.unit_price)||0);
                  const hasDiscrepancy = !isNewOrder && parseFloat(it.qty_actual) !== parseFloat(it.qty_ordered);
                  const isAdded = !it.soiid;
                  const productCell = isAdded
                    ? <MiniSelect aria-label="Product" value={String(it.pid)} className="w-full min-w-44"
                        items={[{label:"Select product…",value:""}, ...productItems(products)]}
                        onChange={v=>{ const p=products.find(x=>String(x.pid)===v); setAcc(i,{pid:v,product_name:p?.name||"",sku:p?.sku||""}); }}/>
                    : <span className="font-medium">{it.product_name}</span>;
                  const qtyCell = <NumStepper label="Quantity" value={it.qty_actual??it.qty_ordered}
                    onChange={v=>setAcc(i,{qty_actual:v})}
                    onStep={d=>setAcc(i,{qty_actual:Math.max(0,(parseFloat(it.qty_actual)||0)+d)})}/>;
                  const priceInput = <CInput type="number" size="sm" min={0} step="any" aria-label="Unit price" value={it.unit_price} className="w-24"
                    onChange={e=>setAcc(i,{unit_price:e.target.value})}/>;
                  const removeBtn = isAdded && <Button variant="ghost" size="icon-xs" aria-label="Remove product" className="text-muted-foreground hover:text-destructive-foreground" onClick={()=>setAcceptItems(a=>a.filter((_,j)=>j!==i))}><XIcon/></Button>;
                  return isNewOrder ? (
                    <TableRow key={it.soiid||`new-${i}`}>
                      <TableCell className="px-3 py-2">{productCell}</TableCell>
                      <TableCell className="px-3 py-2 text-muted-foreground text-xs">{it.sku||"—"}</TableCell>
                      <TableCell className="px-3 py-2">{qtyCell}</TableCell>
                      <TableCell className="px-3 py-2">{priceInput}</TableCell>
                      <TableCell className="px-3 py-2 font-semibold text-accent-foreground tabular-nums">{totAct.toFixed(2)}</TableCell>
                      <TableCell className="px-2 py-2">{removeBtn}</TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={it.soiid||`new-${i}`} className={hasDiscrepancy?"bg-destructive/8 hover:bg-destructive/12":""}>
                      <TableCell className="px-3 py-2">{productCell}{hasDiscrepancy&&<span className="sr-only"> (discrepancy)</span>}</TableCell>
                      <TableCell className="px-3 py-2 text-muted-foreground text-xs">{isAdded?"—":it.sku||"—"}</TableCell>
                      <TableCell className="px-3 py-2 text-muted-foreground tabular-nums">{isAdded?"—":it.qty_ordered}</TableCell>
                      <TableCell className="px-3 py-2">{qtyCell}</TableCell>
                      <TableCell className="px-3 py-2 text-sm tabular-nums">{isAdded ? priceInput : `${it.unit_price} ${it.currency}`}</TableCell>
                      <TableCell className={`px-3 py-2 font-semibold tabular-nums ${hasDiscrepancy?"text-destructive-foreground":"text-accent-foreground"}`}>
                        {isAdded ? `— / ${((parseFloat(it.qty_actual)||0)*(parseFloat(it.unit_price)||0)).toFixed(2)}` : `${totOrd.toFixed(2)} / ${totAct.toFixed(2)}`}
                      </TableCell>
                      <TableCell className="px-2 py-2">{removeBtn}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="px-3 py-2">
                    <Button variant="outline" size="sm" className="border-dashed"
                      onClick={()=>setAcceptItems(a=>[...a,{pid:"",product_name:"",sku:"",qty_ordered:0,qty_actual:1,unit_price:0,currency:viewOrder?.currency||"AMD",soiid:null}])}>
                      <PlusIcon/>Add product
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          {!isNewOrder&&acceptItems.some(it=>it.soiid&&parseFloat(it.qty_actual)!==parseFloat(it.qty_ordered))&&(
            <p className="mt-3 flex items-center gap-1.5 text-destructive-foreground text-xs"><TriangleAlertIcon className="size-3.5"/>Highlighted rows differ from what was ordered — a reconciliation report will be created.</p>
          )}
        </Modal>
      )}

      {/* Cancel a submitted order */}
      <Dialog open={!!viewOrder && cancelView} title={`Cancel order #${viewOrder?.order_id||""}?`} confirmLabel="Cancel anyway"
        onCancel={()=>setCancelView(false)}
        onConfirm={async()=>{
          setSaving(true);
          try {
            const u = await api.cancelSupplierOrder(viewOrder.soid);
            setOrders(prev=>prev.map(o=>o.soid===viewOrder.soid?{...o,...u}:o));
            toast(`Order #${viewOrder.order_id} cancelled`);
            closeView();
            await load();
          } catch(e){ toast(e.message,"error"); } finally{ setSaving(false); }
        }}>
        Order #{viewOrder?.order_id} will be terminated. Tanelu will not revoke the order with the supplier. Please, be sure to communicate your decision to {viewOrder?.supplier_name}, if you already placed this order.
      </Dialog>

      {/* Delete a draft order */}
      <Dialog open={!!viewOrder && confirmDelete} title={`Delete order #${viewOrder?.order_id||""}?`} confirmLabel="Delete"
        onCancel={()=>setConfirmDelete(false)}
        onConfirm={async()=>{
          setConfirmDelete(false); setSaving(true);
          try {
            await api.deleteSupplierOrder(viewOrder.soid);
            setOrders(prev=>prev.filter(o=>o.soid!==viewOrder.soid));
            toast("Order deleted"); setViewOrder(null);
          } catch(e){ toast(e.message,"error"); } finally{ setSaving(false); }
        }}>
        This cannot be undone.
      </Dialog>

      {/* Accept confirm dialog */}
      {acceptDialog&&(
        <Modal onClose={()=>setAcceptDialog(false)} title="Accept order?" className="max-w-md"
          description="The order will become accepted and no changes will be available from this point. Please, double-check the contents and add comments before you proceed. In case of discrepancies, a reconciliation report will be created."
          footer={<>
            <span className="text-muted-foreground text-xs tabular-nums">{acceptComments.length}/1000</span>
            <div className="flex gap-2">
              <Btn variant="ghost" onClick={()=>setAcceptDialog(false)}>Cancel</Btn>
              <Btn onClick={doAccept} loading={saving}><CheckIcon/>Accept</Btn>
            </div>
          </>}>
          <Textarea value={acceptComments} onChange={e=>setAcceptComments(e.target.value.slice(0,1000))}
            placeholder="Comments (optional, up to 1000 characters)" aria-label="Comments" rows={4}/>
        </Modal>
      )}

      {/* Leaving the new-order form: save it as a draft or lose it */}
      <UnsavedDialog open={confirmCancel} title="Save this order?" saving={saving}
        description="The order hasn't been saved yet. Save it as a draft to finish later, or discard it."
        onCancel={()=>setConfirmCancel(false)}
        onDiscard={()=>{ setShowNew(false); resetNewForm(); setConfirmCancel(false); }}
        onSave={async()=>{ if (await saveOrder(false)) setConfirmCancel(false); }}/>
      {/* Closing a draft with unsaved edits */}
      <UnsavedDialog open={leaveDraft} title="Save changes to this order?" saveLabel="Save" saving={saving}
        onCancel={()=>setLeaveDraft(false)}
        onDiscard={()=>{ setLeaveDraft(false); closeView(); }}
        onSave={async()=>{ if (await saveDraftEdits()) setLeaveDraft(false); }}/>
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

  const H = "h-10 px-3 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider whitespace-nowrap";
  const actions = (
    <div className="flex justify-end gap-2 border-border border-t pt-4">
      <Btn variant="ghost" onClick={onCancel}>{tl("Cancel")}</Btn>
      <Btn onClick={()=>onSave(buildPayload())} loading={saving}>{tl("Save")}</Btn>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <SegToggle value={slide} onChange={setSlide} options={[["general",tl("General")],["schedule","Schedule"]]}/>

      {slide==="schedule" ? (
        <div className="flex flex-col gap-4">
          <Select label="Timezone" value={timezone} onChange={setTimezone} options={TIMEZONES.map(z=>({label:z,value:z}))} />
          <div className="flex flex-col gap-2">
            <span className="font-medium text-sm">Delivery terms</span>
            <div className="overflow-x-auto rounded-xl border border-border [&_thead_tr]:bg-muted">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={H}>Term</TableHead>
                    <TableHead className={H}>Cut-off</TableHead>
                    <TableHead className={`${H} text-center`}>Before (days)</TableHead>
                    <TableHead className={`${H} text-center`}>After (days)</TableHead>
                    <TableHead className="w-10"/>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTerms.map((t,i)=>(
                    <TableRow key={i}>
                      <TableCell className="px-3 py-2.5 font-medium">{t.name}</TableCell>
                      <TableCell className="px-3 py-2.5 text-muted-foreground tabular-nums">{t.cutoff}</TableCell>
                      <TableCell className="px-3 py-2.5 text-center tabular-nums">{t.days_before}</TableCell>
                      <TableCell className="px-3 py-2.5 text-center text-muted-foreground tabular-nums">{t.days_after ?? t.days_before+1}</TableCell>
                      <TableCell className="px-2 py-2">
                        <Button variant="ghost" size="icon-xs" aria-label={`Remove ${t.name}`} className="text-muted-foreground hover:text-destructive-foreground" onClick={()=>removeTerm(terms.indexOf(t))}><XIcon/></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {sortedTerms.length===0&&<TableRow className="hover:bg-transparent"><TableCell colSpan={5} className="py-6 text-center text-muted-foreground text-sm">{tl("No terms yet.")}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
            {showNewTerm ? (
              <div className="grid grid-cols-1 items-end gap-3 rounded-xl border border-border bg-muted p-3 sm:grid-cols-[1fr_8rem_8rem_auto]">
                <Input label="Term name" value={newTerm.name} onChange={v=>setNewTerm(p=>({...p,name:v}))} placeholder="e.g. Next day"/>
                <Select label="Cut-off" value={newTerm.cutoff} onChange={v=>setNewTerm(p=>({...p,cutoff:v}))} options={CUTOFF_HOURS.map(h=>({label:h,value:h}))}/>
                <Select label="Before (days)" value={String(newTerm.days_before)} onChange={v=>setNewTerm(p=>({...p,days_before:Number(v)}))} options={DELIVERY_DAYS.map(d=>({label:String(d),value:d}))}/>
                <div className="flex gap-1.5">
                  <Btn variant="ghost" onClick={()=>setShowNewTerm(false)}>{tl("Cancel")}</Btn>
                  <Btn onClick={addTerm} disabled={!newTerm.name.trim()}>Add</Btn>
                </div>
              </div>
            ) : (
              <div><Button variant="outline" size="sm" className="border-dashed" onClick={()=>setShowNewTerm(true)}><PlusIcon/>New term</Button></div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Name" value={form.name} onChange={v=>set("name",v)} required />
          <Input label={tl("Contact title")} value={form.contact_title||""} onChange={v=>set("contact_title",v)} placeholder="e.g. Sales Manager" />
          <Input label={tl("Contact first name")} value={form.contact_fname||""} onChange={v=>set("contact_fname",v)} />
          <Input label={tl("Contact last name")} value={form.contact_lname||""} onChange={v=>set("contact_lname",v)} />
          <Input label="Email" type="email" value={form.email||""} onChange={v=>set("email",v)} required />
          <Input label="Phone" value={form.phone||""} onChange={v=>set("phone",v)} required />
          <Input label="Street address" value={form.street_address||""} onChange={v=>set("street_address",v)} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="City" value={form.city||""} onChange={v=>set("city",v)} />
            <Input label="ZIP" value={form.zip||""} onChange={v=>set("zip",v)} />
          </div>
        </div>
      )}
      {actions}
    </div>
  );
}

// ─── REPORTS PAGE ─────────────────────────────────────────────────────────────
// Report building blocks (coss)
function ReportCard({ title, description, actions, children, className="" }) {
  return (
    <Card className={`mb-5 ${className}`}>
      <div data-slot="report-card-header" className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-6 pt-6">
        <div className="flex min-w-0 max-w-2xl flex-col gap-1">
          <CardTitle className="font-heading text-lg">{title}</CardTitle>
          {description&&<CardDescription className="leading-relaxed">{description}</CardDescription>}
        </div>
        {actions&&<div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <CardPanel>{children}</CardPanel>
    </Card>
  );
}
function StatTile({ label, value, sub, tone }) {
  const toneCls = { brand:"text-accent-foreground", success:"text-success-foreground", destructive:"text-destructive-foreground" }[tone]||"";
  return (
    <div data-slot="stat-tile" className="min-w-36 flex-1 basis-36 rounded-xl border border-border bg-muted px-4 py-3">
      <p className="mb-1 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`font-heading font-semibold text-2xl tabular-nums ${toneCls}`}>{value}</p>
      {sub&&<p className="mt-0.5 text-muted-foreground text-xs leading-snug">{sub}</p>}
    </div>
  );
}
function OptionSeg({ value, onChange, options, label }) {
  return (
    <SegmentedControl aria-label={label}>
      {options.map(([k,l])=>(
        <SegmentedControlItem key={k} data-checked={value===k?"":undefined} aria-pressed={value===k} onClick={()=>onChange(k)} className="px-3">{l}</SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}
const ReportEmpty = ({ children }) => <div className="px-3 py-12 text-center text-muted-foreground text-sm leading-relaxed">{children}</div>;
const ChartTip = ({ x, y, children, className="" }) => (
  <div data-slot="chart-tip" className={`pointer-events-none absolute z-20 min-w-32 rounded-lg border border-border bg-popover px-3 py-2 text-popover-foreground text-xs leading-relaxed shadow-lg/5 ${className}`} style={{ left:x, top:y }}>{children}</div>
);

// ─── BOARD OF ARRIVALS IMPACT (Reports) ───────────────────────────────────────
// Does pre-selling through the Board of Arrivals complement the stock model?
// Series colours were run through the dataviz palette validator (light surface, 2 series).
const BOA_C   = "#b4691f";   // Board of Arrivals
const STOCK_C = "#1f6fc0";   // stock model

const fmtHours = h => h==null ? "—" : h<1 ? `${Math.round(h*60)} min` : `${h.toFixed(1)} h`;
const fmtK = v => v>=1000 ? `${(Math.round(v/100)/10).toString()}k` : String(Math.round(v));
const niceMax = v => { if(!(v>0)) return 1; const p=10**Math.floor(Math.log10(v)); const f=v/p; return (f<=1?1:f<=2?2:f<=5?5:10)*p; };
const pctStr = v => v==null ? "—" : `${Math.round(v*100)}%`;
const ymdLocal = x => `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`;
const mondayOf = x => { const m=new Date(x); m.setHours(0,0,0,0); m.setDate(m.getDate()-((m.getDay()+6)%7)); return m; };
// Bar with 4px rounded data-end, square at the baseline
const barPath = (x,y,w,h,r,roundTop) => {
  if (h<=0) return "";
  const rr = roundTop ? Math.min(r,h,w/2) : 0;
  return `M${x},${y+h} V${y+rr} ${rr?`Q${x},${y} ${x+rr},${y}`:`L${x},${y}`} H${x+w-rr} ${rr?`Q${x+w},${y} ${x+w},${y+rr}`:`L${x+w},${y}`} V${y+h} Z`;
};

const BoaTile = ({label,value,sub}) => <StatTile label={label} value={value} sub={sub}/>;
const BoaLegend = ({items}) => (
  <div className="mb-2 flex flex-wrap gap-x-3.5 gap-y-1 text-xs">
    {items.map((it,i)=>(
      <span key={i} className="inline-flex items-center gap-1.5">
        <span className="inline-block size-3 rounded-[3px]" style={{ background:it.color }}/>{it.label}
      </span>
    ))}
  </div>
);
const BoaTable = ({cols,rows}) => (
  <div className="overflow-x-auto rounded-xl border border-border [&_thead_tr]:bg-muted">
    <Table>
      <TableHeader><TableRow>{cols.map(c=><TableHead key={c} className="h-9 px-3 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">{c}</TableHead>)}</TableRow></TableHeader>
      <TableBody>{rows.map((row,i)=><TableRow key={i}>{row.map((v,k)=><TableCell key={k} className="px-3 py-2 text-xs tabular-nums">{v}</TableCell>)}</TableRow>)}</TableBody>
    </Table>
  </div>
);

function BoaImpactSection({ toast }) {
  const [days, setDays]       = useState(182);
  const [d, setD]             = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView]       = useState("chart");
  const [tip, setTip]         = useState(null);
  const [busy, setBusy]       = useState(null);
  const [wasteIn, setWasteIn] = useState({});
  const [showLog, setShowLog] = useState(false);

  const load = useCallback(async(n)=>{
    setLoading(true);
    try { setD(await api.getBoaImpact(n)); }
    catch(e){ toast(e.message,"error"); }
    finally{ setLoading(false); }
  },[]);
  useEffect(()=>{ load(182); },[]);
  const changeDays = n => { setDays(n); load(n); };

  // ── tooltip plumbing: one tooltip, positioned inside the chart card under the pointer ──
  const place = (cx,cy,el,title,rows) => {
    const card = el.closest("[data-chartbox]"); if(!card) return;
    const box = card.getBoundingClientRect();
    setTip({card:card.dataset.chartbox, x:Math.min(cx-box.left+12, box.width-180), y:Math.max(cy-box.top-8,0), title, rows});
  };
  const tipProps = (title,rows) => ({
    tabIndex:0, style:{outline:"none"},
    onPointerMove: e=>place(e.clientX,e.clientY,e.currentTarget,title,rows),
    onFocus: e=>{ const b=e.currentTarget.getBoundingClientRect(); place(b.left+b.width/2,b.top,e.currentTarget,title,rows); },
    onPointerLeave: ()=>setTip(null), onBlur: ()=>setTip(null),
  });
  const Tip = ({id}) => (tip&&tip.card===id) ? (
    <ChartTip x={tip.x} y={tip.y}>
      <div className="mb-0.5 text-muted-foreground">{tip.title}</div>
      {tip.rows.map((row,i)=>(
        <div key={i} className="flex items-center gap-2">
          {row.color&&<span className="inline-block h-0.5 w-2.5 flex-none" style={{ background:row.color }}/>}
          <b className="tabular-nums">{row.value}</b><span className="text-muted-foreground">{row.label}</span>
        </div>
      ))}
    </ChartTip>
  ) : null;

  const card = (id,title,sub,body) => (
    <div data-chartbox={id} className="relative min-w-0 flex-[1_1_420px] rounded-xl border border-border p-4">
      <h4 className="mb-0.5 font-heading font-semibold">{title}</h4>
      <p className="mb-2.5 text-muted-foreground text-xs leading-relaxed">{sub}</p>
      {body}
      <Tip id={id}/>
    </div>
  );
  const empty = msg => <ReportEmpty>{msg}</ReportEmpty>;

  // ── derived data ────────────────────────────────────────────────────────────
  const fr = d?.freshness, boa = fr?.boa, stk = fr?.stock;
  const lead = d?.lead, fun = d?.funnel, buy = d?.buyers;
  const logged = (d?.batches||[]).filter(b=>b.wasted_qty!=null && b.run_qty>0).map(b=>({...b, waste:b.wasted_qty/b.run_qty}));
  const avgOf = a => a.length ? a.reduce((s,b)=>s+b.waste,0)/a.length : null;
  const hi = logged.filter(b=>b.pre_share>=0.3), lo = logged.filter(b=>b.pre_share<0.3);
  const unlogged = (d?.batches||[]).filter(b=>b.wasted_qty==null).slice(0,20);

  const weeks = useMemo(()=>{
    if(!d) return [];
    const map = {};
    d.weekly.stock.forEach(w=>{ map[w.wk]={...(map[w.wk]||{}),wk:w.wk,stock:w.revenue,stockN:w.orders}; });
    d.weekly.boa.forEach(w=>{ map[w.wk]={...(map[w.wk]||{}),wk:w.wk,boa:w.revenue,boaN:w.orders}; });
    const start = new Date(); start.setDate(start.getDate()-d.days);
    for (let m=mondayOf(start), end=mondayOf(new Date()); m<=end; m.setDate(m.getDate()+7)) {
      const k = ymdLocal(m); if(!map[k]) map[k]={wk:k};
    }
    return Object.values(map).sort((a,b)=>a.wk<b.wk?-1:1).map(w=>({stock:0,stockN:0,boa:0,boaN:0,...w}));
  },[d]);

  // ── chart 1: age at handover ───────────────────────────────────────────────
  const renderFresh = () => {
    if(!boa.n && !stk.n) return empty("No handover times logged yet. Use “Log missing data” below to record when customers collect their orders.");
    const W=600,H=230,PL=44,PR=12,PT=14,PB=44,cW=W-PL-PR,cH=H-PT-PB;
    const nb=fr.labels.length, slot=cW/nb;
    const sh=(g,i)=>g.n?g.counts[i]/g.n:0;
    const maxS=Math.max(...fr.labels.map((_,i)=>Math.max(sh(boa,i),sh(stk,i))),0.05);
    const yMax=niceMax(maxS*100)/100;
    const bw=Math.min(24,(slot-10)/2-1);
    const yOf=v=>PT+cH-(v/yMax)*cH;
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block"}} role="img" aria-label="Age of orders at handover, Board of Arrivals versus stock model">
        {[0,0.25,0.5,0.75,1].map(t=>(
          <g key={t}>
            <line x1={PL} y1={PT+cH*(1-t)} x2={PL+cW} y2={PT+cH*(1-t)} stroke={"var(--border)"} strokeWidth={1}/>
            <text x={PL-6} y={PT+cH*(1-t)+4} textAnchor="end" fontSize={10} fill={"var(--muted-foreground)"}>{Math.round(yMax*t*100)}%</text>
          </g>
        ))}
        {fr.labels.map((lab,i)=>{
          const gx=PL+i*slot+(slot-(2*bw+2))/2;
          const rows=[
            ...(boa.n?[{color:BOA_C,value:pctStr(sh(boa,i)),label:`Board of Arrivals · ${boa.counts[i]} of ${boa.n}`}]:[]),
            ...(stk.n?[{color:STOCK_C,value:pctStr(sh(stk,i)),label:`Stock model · ${stk.counts[i]} of ${stk.n}`}]:[]),
          ];
          return (
            <g key={i}>
              {boa.n>0&&<path d={barPath(gx,yOf(sh(boa,i)),bw,PT+cH-yOf(sh(boa,i)),4,true)} fill={BOA_C}/>}
              {stk.n>0&&<path d={barPath(gx+bw+2,yOf(sh(stk,i)),bw,PT+cH-yOf(sh(stk,i)),4,true)} fill={STOCK_C}/>}
              <text x={PL+i*slot+slot/2} y={H-26} textAnchor="middle" fontSize={10} fill={"var(--muted-foreground)"}>{lab}</text>
              <rect x={PL+i*slot} y={PT} width={slot} height={cH} fill="transparent" {...tipProps(`Handed over ${lab} after the batch was ready`,rows)}/>
            </g>
          );
        })}
        <line x1={PL} y1={PT+cH} x2={PL+cW} y2={PT+cH} stroke={"var(--border)"}/>
        <text x={PL+cW/2} y={H-6} textAnchor="middle" fontSize={10} fill={"var(--muted-foreground)"}>Time from batch ready to handover · share of each group’s orders</text>
      </svg>
    );
  };

  // ── chart 2: weekly revenue, stock + BoA stacked ───────────────────────────
  const renderWeekly = () => {
    if(!weeks.some(w=>w.stock||w.boa)) return empty("No sales in this period yet.");
    const W=600,H=240,PL=48,PR=12,PT=16,PB=36,cW=W-PL-PR,cH=H-PT-PB;
    const n=weeks.length, slot=cW/n, bw=Math.min(24,Math.max(3,slot-6));
    const yMax=niceMax(Math.max(...weeks.map(w=>w.stock+w.boa),1));
    const hOf=v=>(v/yMax)*cH, base=PT+cH;
    const firstKey = d.boa_first_at ? ymdLocal(mondayOf(new Date(d.boa_first_at))) : null;
    const fi = firstKey ? weeks.findIndex(w=>w.wk===firstKey) : -1;
    const lblEvery = Math.ceil(n/10);
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block"}} role="img" aria-label="Weekly revenue, stock model and Board of Arrivals stacked">
        {[0,0.25,0.5,0.75,1].map(t=>(
          <g key={t}>
            <line x1={PL} y1={PT+cH*(1-t)} x2={PL+cW} y2={PT+cH*(1-t)} stroke={"var(--border)"} strokeWidth={1}/>
            <text x={PL-6} y={PT+cH*(1-t)+4} textAnchor="end" fontSize={10} fill={"var(--muted-foreground)"}>{fmtK(yMax*t)}</text>
          </g>
        ))}
        {weeks.map((w,i)=>{
          const x=PL+i*slot+(slot-bw)/2;
          const hs=hOf(w.stock), hb=hOf(w.boa);
          const dt=new Date(w.wk+"T00:00:00");
          const rows=[
            {color:STOCK_C,value:`${Math.round(w.stock).toLocaleString()} AMD`,label:`Stock model · ${w.stockN} orders`},
            {color:BOA_C,value:`${Math.round(w.boa).toLocaleString()} AMD`,label:`Board of Arrivals · ${w.boaN} orders`},
            {value:`${Math.round(w.stock+w.boa).toLocaleString()} AMD`,label:"total"},
          ];
          return (
            <g key={w.wk}>
              {hs>0&&<path d={barPath(x,base-hs,bw,hs,4,hb<=0)} fill={STOCK_C}/>}
              {hb>0&&<path d={barPath(x,base-hs-hb-(hs>0?2:0),bw,hb,4,true)} fill={BOA_C}/>}
              {i%lblEvery===0&&<text x={PL+i*slot+slot/2} y={H-18} textAnchor="middle" fontSize={9} fill={"var(--muted-foreground)"}>
                {`${String(dt.getDate()).padStart(2,"0")}/${String(dt.getMonth()+1).padStart(2,"0")}`}</text>}
              <rect x={PL+i*slot} y={PT} width={slot} height={cH} fill="transparent"
                {...tipProps(`Week of ${dt.toLocaleDateString()}`,rows)}/>
            </g>
          );
        })}
        {fi>=0&&<g>
          <line x1={PL+fi*slot} y1={PT} x2={PL+fi*slot} y2={base} stroke={"var(--foreground)"} strokeWidth={1}/>
          <text x={PL+fi*slot+4} y={PT+9} fontSize={10} fill={"var(--foreground)"}>first BoA order</text>
        </g>}
        <line x1={PL} y1={base} x2={PL+cW} y2={base} stroke={"var(--border)"}/>
        <text x={PL+cW/2} y={H-3} textAnchor="middle" fontSize={10} fill={"var(--muted-foreground)"}>Week starting · revenue, AMD</text>
      </svg>
    );
  };

  // ── chart 3: when do reservations arrive? ─────────────────────────────────
  const renderLead = () => {
    if(!lead.n) return empty("No confirmed reservations in this period.");
    const labels=[...lead.labels,"Batch in production"], counts=[...lead.counts,lead.in_production];
    const W=600,H=220,PL=40,PR=12,PT=12,PB=44,cW=W-PL-PR,cH=H-PT-PB;
    const slot=cW/labels.length, bw=Math.min(24,slot-12);
    const yMax=Math.max(1,niceMax(Math.max(...counts)));
    const ticks=[0,0.5,1].map(t=>Math.round(yMax*t));
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block"}} role="img" aria-label="How long before the batch was ready reservations arrived">
        {[...new Set(ticks)].map(v=>(
          <g key={v}>
            <line x1={PL} y1={PT+cH-(v/yMax)*cH} x2={PL+cW} y2={PT+cH-(v/yMax)*cH} stroke={"var(--border)"}/>
            <text x={PL-6} y={PT+cH-(v/yMax)*cH+4} textAnchor="end" fontSize={10} fill={"var(--muted-foreground)"}>{v}</text>
          </g>
        ))}
        {labels.map((lab,i)=>{
          const h=(counts[i]/yMax)*cH;
          return (
            <g key={i}>
              <path d={barPath(PL+i*slot+(slot-bw)/2,PT+cH-h,bw,h,4,true)} fill={BOA_C}/>
              <text x={PL+i*slot+slot/2} y={H-26} textAnchor="middle" fontSize={10} fill={"var(--muted-foreground)"}>{lab.length>10?lab.split(" ").slice(0,2).join(" "):lab}</text>
              <rect x={PL+i*slot} y={PT} width={slot} height={cH} fill="transparent"
                {...tipProps(lab==="After ready"?"Reserved after the batch was ready":lab==="Batch in production"?"Reserved, batch still in production":`Reserved ${lab} before the batch was ready`,
                  [{color:BOA_C,value:String(counts[i]),label:"reservations"}])}/>
            </g>
          );
        })}
        <line x1={PL} y1={PT+cH} x2={PL+cW} y2={PT+cH} stroke={"var(--border)"}/>
        <text x={PL+cW/2} y={H-6} textAnchor="middle" fontSize={10} fill={"var(--muted-foreground)"}>How long before the batch was ready the customer reserved</text>
      </svg>
    );
  };

  // ── chart 4: pre-sold share vs. waste per batch ───────────────────────────
  const renderScatter = () => {
    if(!logged.length) return empty("No batches with logged unsold units yet. Record them under “Log missing data” to see whether pre-selling reduces waste.");
    const W=600,H=250,PL=48,PR=16,PT=14,PB=44,cW=W-PL-PR,cH=H-PT-PB;
    const yMax=niceMax(Math.max(...logged.map(b=>b.waste*100),10));
    const xOf=v=>PL+v*cW, yOf=v=>PT+cH-(v/yMax)*cH;
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block"}} role="img" aria-label="Share of each batch reserved before ready versus unsold share">
        {[0,0.25,0.5,0.75,1].map(t=>(
          <g key={t}>
            <line x1={PL} y1={PT+cH*(1-t)} x2={PL+cW} y2={PT+cH*(1-t)} stroke={"var(--border)"}/>
            <text x={PL-6} y={PT+cH*(1-t)+4} textAnchor="end" fontSize={10} fill={"var(--muted-foreground)"}>{Math.round(yMax*t)}%</text>
            <text x={xOf(t)} y={PT+cH+16} textAnchor="middle" fontSize={10} fill={"var(--muted-foreground)"}>{Math.round(t*100)}%</text>
          </g>
        ))}
        <line x1={xOf(0.3)} y1={PT} x2={xOf(0.3)} y2={PT+cH} stroke={"var(--foreground)"} strokeWidth={1}/>
        <text x={xOf(0.3)+4} y={PT+9} fontSize={10} fill={"var(--foreground)"}>30% pre-sold</text>
        {logged.map((b,i)=>(
          <g key={`${b.prid}-${b.rid}`}>
            <circle cx={xOf(b.pre_share)} cy={yOf(b.waste*100)} r={4} fill={BOA_C} stroke={"var(--card)"} strokeWidth={2}/>
            <circle cx={xOf(b.pre_share)} cy={yOf(b.waste*100)} r={12} fill="transparent"
              {...tipProps(`${b.item} · ${new Date(b.completed_at).toLocaleDateString()}`,[
                {value:pctStr(b.pre_share),label:"reserved before ready"},
                {value:pctStr(b.waste),label:`unsold (${b.wasted_qty} of ${b.run_qty})`},
              ])}/>
          </g>
        ))}
        <line x1={PL} y1={PT+cH} x2={PL+cW} y2={PT+cH} stroke={"var(--border)"}/>
        <text x={PL+cW/2} y={H-6} textAnchor="middle" fontSize={10} fill={"var(--muted-foreground)"}>Share of the batch reserved before it was ready</text>
        <text x={12} y={PT+cH/2} textAnchor="middle" fontSize={10} fill={"var(--muted-foreground)"} transform={`rotate(-90,12,${PT+cH/2})`}>Unsold / wasted</text>
      </svg>
    );
  };

  // ── data entry ──────────────────────────────────────────────────────────────
  const markHanded = async oid => {
    setBusy(`h${oid}`);
    try { await api.logHandover(oid); toast("Handover logged"); await load(days); }
    catch(e){ toast(e.message,"error"); }
    finally{ setBusy(null); }
  };
  const saveWaste = async b => {
    const key=`${b.prid}-${b.rid}`, v=wasteIn[key];
    if(v===undefined||v==="") return;
    setBusy(key);
    try {
      await api.logWaste(b.prid,b.rid,Number(v)); toast("Saved");
      setWasteIn(p=>{ const n={...p}; delete n[key]; return n; });
      await load(days);
    } catch(e){ toast(e.message,"error"); }
    finally{ setBusy(null); }
  };

  const ready = d && fr;
  return (
    <ReportCard title="Board of Arrivals impact"
      description="Does selling a batch while it is still being made complement the stock model? Three checks: freshness at handover, whether BoA adds to stock sales, and waste per batch."
      actions={<>
        <OptionSeg label="Period" value={days} onChange={changeDays} options={[[84,"12 weeks"],[182,"26 weeks"],[364,"1 year"]]}/>
        <OptionSeg label="View" value={view} onChange={setView} options={[["chart","Charts"],["table","Tables"]]}/>
      </>}>
      {!ready ? (loading ? <Spinner/> : empty("Could not load the report.")) : (
        <div className="transition-opacity" style={{opacity:loading?0.55:1}}>
          {/* KPIs */}
          <div className="mb-3 flex flex-wrap gap-3">
            <BoaTile label="Median age at handover · BoA" value={fmtHours(boa.median_h)} sub={`${boa.n} orders with a handover time`}/>
            <BoaTile label="Median age · stock model (est.)" value={fmtHours(stk.median_h)} sub={`${stk.n} order lines · most recent batch`}/>
            <BoaTile label="Reserved before ready" value={lead.n?pctStr(lead.before_ready/lead.n):"—"} sub={`${lead.n} confirmed reservations`}/>
            <BoaTile label="Unsold share · logged batches" value={pctStr(avgOf(logged))} sub={`${logged.length} batches logged`}/>
            <BoaTile label="Waitlisted units" value={Math.round(fun.waitlist_units*10)/10} sub="demand beyond batch capacity"/>
          </div>
          {/* Funnel + buyers */}
          <div className="mb-5 flex flex-wrap gap-3">
            <BoaTile label="Board visits" value={fun.views} sub={fun.views_since?`counted since ${fun.views_since}`:"counting starts with this release"}/>
            <BoaTile label="Reservations" value={fun.reservations} sub={fun.views?`${pctStr(fun.reservations/fun.views)} of visits`:"—"}/>
            <BoaTile label="Handed over" value={fun.handed_over} sub={fun.reservations?`${pctStr(fun.handed_over/fun.reservations)} of reservations`:"—"}/>
            <BoaTile label="New to you" value={buy.new} sub="BoA buyers, no earlier order found"/>
            <BoaTile label="Existing customers" value={buy.stock_customers} sub="had ordered from you before"/>
            <BoaTile label="Repeat BoA buyers" value={buy.repeat_boa} sub="reserved on the board before"/>
          </div>

          {view==="chart" ? (
            <div className="flex flex-wrap gap-4">
              {card("fresh","Freshness at handover","Age of the batch when the customer collects, as a share of each group’s orders. The stock-model age is an estimate: it uses the most recent finished batch of the same item, which is the youngest that stock could be.",
                <>{(boa.n||stk.n)>0&&<BoaLegend items={[{color:BOA_C,label:`Board of Arrivals (n=${boa.n})`},{color:STOCK_C,label:`Stock model, estimated (n=${stk.n})`}]}/>}{renderFresh()}</>)}
              {card("weekly","Complement or substitute?","Weekly revenue split by channel. If BoA complements stock sales, the blue stack holds steady after the first BoA order while the total grows.",
                <><BoaLegend items={[{color:STOCK_C,label:"Stock model"},{color:BOA_C,label:"Board of Arrivals"}]}/>{renderWeekly()}</>)}
              {card("lead","When do reservations arrive?","Confirmed reservations by how long before the batch was ready they were made. Pre-selling only works if most of them land on the left of “After ready”.",
                <><p className="mb-2 text-sm">{lead.n?`${pctStr(lead.before_ready/lead.n)} of ${lead.n} reservations arrived before the batch was ready.`:""}</p>{renderLead()}</>)}
              {card("waste","Pre-selling vs. waste","One dot per finished batch item: the more of it was reserved before it was ready, the less should go unsold.",
                <>
                  {logged.length>0&&<p className="mb-2 text-sm leading-relaxed">
                    ≥30% pre-sold: <b>{pctStr(avgOf(hi))}</b> unsold ({hi.length} batches) · under 30%: <b>{pctStr(avgOf(lo))}</b> ({lo.length}).
                    {logged.length<10&&<span className="text-muted-foreground"> Fewer than 10 batches logged, so treat this as anecdotal.</span>}
                  </p>}
                  {renderScatter()}
                </>)}
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div><h4 className="mb-1.5 font-heading font-semibold">Freshness at handover (orders per age bucket)</h4>
                <BoaTable cols={["Age","Board of Arrivals","Stock model (est.)"]}
                  rows={fr.labels.map((l,i)=>[l,`${boa.counts[i]}${boa.n?` (${pctStr(boa.counts[i]/boa.n)})`:""}`,`${stk.counts[i]}${stk.n?` (${pctStr(stk.counts[i]/stk.n)})`:""}`])}/></div>
              <div><h4 className="mb-1.5 font-heading font-semibold">Weekly revenue (AMD)</h4>
                <BoaTable cols={["Week starting","Stock model","Stock orders","Board of Arrivals","BoA orders","Total"]}
                  rows={weeks.map(w=>[w.wk,Math.round(w.stock).toLocaleString(),w.stockN,Math.round(w.boa).toLocaleString(),w.boaN,Math.round(w.stock+w.boa).toLocaleString()])}/></div>
              <div><h4 className="mb-1.5 font-heading font-semibold">Reservation lead time</h4>
                <BoaTable cols={["Reserved","Reservations"]}
                  rows={[...lead.labels.map((l,i)=>[l,lead.counts[i]]),["Batch in production",lead.in_production]]}/></div>
              <div><h4 className="mb-1.5 font-heading font-semibold">Batches</h4>
                <BoaTable cols={["Item","Finished","Batch qty","Pre-sold","All BoA","Unsold qty","Unsold %"]}
                  rows={d.batches.map(b=>[b.item,new Date(b.completed_at).toLocaleDateString(),b.run_qty,pctStr(b.pre_share),pctStr(b.boa_share),b.wasted_qty==null?"not logged":b.wasted_qty,b.wasted_qty==null||!b.run_qty?"—":pctStr(b.wasted_qty/b.run_qty)])}/></div>
            </div>
          )}

          {/* Data entry */}
          <div className="mt-5 border-border border-t pt-3.5">
            <Button variant="ghost" size="sm" className="-ms-2 h-auto min-h-8 whitespace-normal text-start text-accent-foreground" aria-expanded={showLog} onClick={()=>setShowLog(s=>!s)}>
              <ChevronRightIcon className={`transition-transform ${showLog?"rotate-90":""}`}/>
              Log missing data ({d.pending_handover.length} handovers · {unlogged.length} batches)
            </Button>
            {showLog&&(
              <div className="mt-3.5 flex flex-wrap gap-6">
                <div className="min-w-0 flex-[1_1_360px]">
                  <h4 className="mb-1 font-heading font-semibold text-sm">Ready orders without a handover time</h4>
                  <p className="mb-2 text-muted-foreground text-xs leading-relaxed">Click when the customer collects the order. The time of the click is recorded, which is what the freshness chart measures.</p>
                  {!d.pending_handover.length ? <p className="text-muted-foreground text-sm">Nothing waiting.</p> : (
                    <div className="flex flex-col divide-y divide-border">
                      {d.pending_handover.map(o=>(
                        <div key={o.oid} className="flex items-center justify-between gap-2.5 py-2">
                          <div className="min-w-0 text-sm">
                            <b>#{o.oid}</b> <span className="text-muted-foreground">{o.is_boa?"BoA":"Stock model"} · {o.customer||"Guest"}</span>
                            <div className="truncate text-muted-foreground text-xs">{o.items||"—"}</div>
                          </div>
                          <Btn size="sm" variant="secondary" onClick={()=>markHanded(o.oid)} loading={busy===`h${o.oid}`}><HandIcon/>Handed over</Btn>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-[1_1_360px]">
                  <h4 className="mb-1 font-heading font-semibold text-sm">Finished batches without an unsold count</h4>
                  <p className="mb-2 text-muted-foreground text-xs leading-relaxed">Enter how many units went unsold or were thrown away (0 if none).</p>
                  {!unlogged.length ? <p className="text-muted-foreground text-sm">All finished batches are logged.</p> : (
                    <div className="flex flex-col divide-y divide-border">
                      {unlogged.map(b=>{
                        const key=`${b.prid}-${b.rid}`;
                        return (
                          <div key={key} className="flex items-center justify-between gap-2.5 py-2">
                            <div className="min-w-0 text-sm">
                              <b>{b.item}</b>
                              <div className="text-muted-foreground text-xs">{new Date(b.completed_at).toLocaleDateString()} · batch of {b.run_qty}</div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <CInput type="number" size="sm" min="0" max={b.run_qty} step="any" value={wasteIn[key]??""} placeholder="unsold" aria-label={`Unsold ${b.item}`}
                                onChange={e=>setWasteIn(p=>({...p,[key]:e.target.value}))} className="w-20"/>
                              <Btn size="sm" onClick={()=>saveWaste(b)} loading={busy===key} disabled={(wasteIn[key]??"")===""}>Save</Btn>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </ReportCard>
  );
}

// ─── PROFIT & LOSS (Sankey) ───────────────────────────────────────────────────
// Revenue categories (click to drill down into items) → Revenue → Expenses/Profit → expense types.
// Hand-built SVG layout: no extra dependency, and it rebuilds whenever the period changes.
const PNL_LIGHT = ["#2a78d6","#eb6834","#1baf7a","#eda100","#e87ba4","#008300","#6250d6","#e34948"];
const PNL_DARK  = ["#3987e5","#d95926","#199e70","#c98500","#d55181","#008300","#9085e9","#e66767"];
const isDarkTheme = () => G.white === THEME_DARK.white;

function buildPnl(data, expanded, tl) {
  const pal = isDarkTheme() ? PNL_DARK : PNL_LIGHT;
  const rev = data?.revenue || [];
  const R = rev.reduce((s, r) => s + r.revenue, 0);
  const ex = data?.expenses || {};
  const expTypes = [
    { id: "e-del",  label: tl("Products delivery"), value: Number(ex.delivery || 0), color: pal[0] },
    { id: "e-pw",   label: tl("Products wastage"),  value: Number(ex.product_waste?.total || 0), color: pal[1] },
    { id: "e-iw",   label: tl("Items wastage"),     value: Number(ex.item_waste?.total || 0), color: pal[2] },
    { id: "e-pk",   label: tl("Packaging"),         value: Number(ex.packaging?.total || 0), color: pal[3] },
  ].filter(e => e.value > 0.005);
  const E = expTypes.reduce((s, e) => s + e.value, 0);

  // revenue categories, biggest first; beyond the 8th colour they fold into "Other"
  const cats = new Map();
  for (const r of rev) {
    const c = cats.get(r.caid) || { caid: r.caid, name: r.category, value: 0, items: [] };
    c.value += r.revenue; c.items.push(r); cats.set(r.caid, c);
  }
  let list = [...cats.values()].sort((a, b) => b.value - a.value);
  if (list.length > 8) {
    const rest = list.slice(7);
    list = [...list.slice(0, 7), { caid: "other", name: tl("Other"), value: rest.reduce((s, c) => s + c.value, 0), items: rest.flatMap(c => c.items.map(i => ({ ...i, category: c.name }))), other: true }];
  }
  const nodes = [], links = [];
  const add = n => { nodes.push({ ...n }); return n.id; };
  list.forEach((c, ci) => {
    const color = c.other ? "var(--muted-foreground)" : pal[ci];
    if (expanded.has(c.caid)) {
      c.items.sort((a, b) => b.revenue - a.revenue).forEach((it, ii) => {
        const id = add({ id: `i-${it.rid}`, col: 0, kind: "item", label: it.item, value: it.revenue, color, shade: ii % 2 ? 0.62 : 0.88, caid: c.caid, category: c.name });
        links.push({ s: id, t: "rev", v: it.revenue, color });
      });
    } else {
      const id = add({ id: `c-${c.caid}`, col: 0, kind: "cat", label: c.name, value: c.value, color, shade: 1, caid: c.caid, count: c.items.length });
      links.push({ s: id, t: "rev", v: c.value, color });
    }
  });
  const ink = "var(--muted-foreground)";
  if (R > 0 || E > 0) {
    add({ id: "rev", col: 1, kind: "total", label: tl("Revenue"), value: Math.max(R, 0), color: ink });
    if (E > R) add({ id: "def", col: 1, kind: "total", label: tl("Deficit"), value: E - R, color: ink });
    if (E > 0) add({ id: "exp", col: 2, kind: "total", label: tl("Expenses"), value: E, color: ink });
    if (R > E) add({ id: "pro", col: 2, kind: "total", label: tl("Profit"), value: R - E, color: ink });
    if (E > 0 && R > 0) links.push({ s: "rev", t: "exp", v: Math.min(R, E), color: ink });
    if (E > R) links.push({ s: "def", t: "exp", v: E - R, color: ink });
    if (R > E) links.push({ s: "rev", t: "pro", v: R - E, color: ink });
    expTypes.forEach(e => { add({ id: e.id, col: 3, kind: "exp", label: e.label, value: e.value, color: e.color }); links.push({ s: "exp", t: e.id, v: e.value, color: e.color }); });
    // Profit drill-down: its share by sales channel (negative channels keep a hairline node; tooltip shows the loss)
    const chans = (data?.channels || []).filter(c => Math.abs(c.revenue) > 0.005 || Math.abs(c.profit) > 0.005);
    if (R > E && chans.length) {
      const names = { boa: tl("Board of Arrivals"), offline: tl("Offline sales"), online: tl("Online sales") };
      const posSum = chans.reduce((a, c) => a + Math.max(0, c.profit), 0);
      if (expanded.has("profit") && posSum > 0) chans.forEach((c, i) => {
        const flow = Math.max(0, c.profit) / posSum * (R - E);
        const color = pal[(i + 4) % pal.length];
        add({ id: `ch-${c.key}`, col: 3, kind: "chan", label: names[c.key], value: flow, actual: c.profit, rev: c.revenue, color });
        links.push({ s: "pro", t: `ch-${c.key}`, v: flow, color });
      });
    }
  }
  return { nodes, links, R, E };
}

function layoutPnl(nodes, links, W, H, PL, PR) {
  const NW = 14, GAP = 8, PT = 26, PB = 10, innerW = W - PL - PR, innerH = H - PT - PB;
  const cols = [0, 1, 2, 3].map(c => nodes.filter(n => n.col === c));
  let k = Infinity;
  cols.forEach(col => {
    const tot = col.reduce((s, n) => s + n.value, 0);
    if (tot > 0) k = Math.min(k, (innerH - GAP * Math.max(0, col.length - 1)) / tot);
  });
  if (!isFinite(k)) k = 1;
  const byId = {};
  cols.forEach((col, ci) => {
    let y = PT;
    col.forEach(n => {
      n.x = PL + ci * (innerW - NW) / 3; n.w = NW; n.y = y; n.h = Math.max(2, n.value * k);
      y += n.h + GAP; byId[n.id] = n;
    });
  });
  const outC = {}, inC = {};
  const order = id => nodes.findIndex(n => n.id === id);
  [...links].sort((a, b) => order(a.t) - order(b.t)).forEach(l => {
    const s = byId[l.s], t = byId[l.t]; if (!s || !t) return;
    l.h = Math.max(0.5, l.v * k);
    l.y0 = s.y + (outC[s.id] || 0); outC[s.id] = (outC[s.id] || 0) + l.h;
    l.x0 = s.x + s.w; l.x1 = t.x; l.sn = s; l.tn = t;
  });
  [...links].sort((a, b) => order(a.s) - order(b.s)).forEach(l => {
    if (!l.tn) return;
    l.y1 = l.tn.y + (inC[l.tn.id] || 0); inC[l.tn.id] = (inC[l.tn.id] || 0) + l.h;
  });
  // keep side labels at least 13px apart
  [0, 3].forEach(ci => {
    let last = -Infinity;
    cols[ci].forEach(n => { const want = n.y + n.h / 2; n.ly = Math.max(want, last + 13); last = n.ly; });
  });
  const bottom = Math.max(H, ...nodes.map(n => (n.ly ?? n.y + n.h) + 12));
  return { byId, W, H: bottom, NW };
}

function PnlSection({ toast }) {
  const lang = useLangContext();
  const tl = k => lang === 'ru' ? (RU[k] || k) : k;
  const [period, setPeriod] = useState('week');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(() => new Set());
  const [tip, setTip] = useState(null);
  const [view, setView] = useState('chart');

  const load = useCallback(async p => {
    setLoading(true);
    try { setData(await api.getPnlReport(p)); setExpanded(new Set()); }
    catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load('week'); }, []);
  const changePeriod = p => { setPeriod(p); load(p); };

  const { nodes, links, R, E } = useMemo(() => buildPnl(data, expanded, tl), [data, expanded, lang, G.white]);
  const W = 860, PL = 175, PR = 175;
  const nCol0 = nodes.filter(n => n.col === 0).length;
  const H = Math.max(360, nCol0 * 22 + 40);
  const lay = useMemo(() => layoutPnl(nodes, links, W, H, PL, PR), [nodes, links, H]);
  const fmt = v => Math.round(v).toLocaleString();
  const net = R - E;
  const pct = (v, base) => base > 0 ? `${(v / base * 100).toFixed(1)}%` : '';
  const toggleCat = n => {
    if (n.id === 'pro') { setExpanded(prev => { const nx = new Set(prev); nx.has('profit') ? nx.delete('profit') : nx.add('profit'); return nx; }); setTip(null); return; }
    if (n.kind === 'total' || n.kind === 'exp' || n.kind === 'chan') return;
    setExpanded(prev => { const nx = new Set(prev); nx.has(n.caid) ? nx.delete(n.caid) : nx.add(n.caid); return nx; });
    setTip(null);
  };
  const showTip = (e, lines) => {
    const box = e.currentTarget.ownerSVGElement.parentNode.getBoundingClientRect();
    setTip({ x: e.clientX - box.left, y: e.clientY - box.top, lines });
  };
  const ribbon = l => {
    const xm = (l.x0 + l.x1) / 2;
    return `M${l.x0},${l.y0} C${xm},${l.y0} ${xm},${l.y1} ${l.x1},${l.y1} L${l.x1},${l.y1 + l.h} C${xm},${l.y1 + l.h} ${xm},${l.y0 + l.h} ${l.x0},${l.y0 + l.h} Z`;
  };

  const tile = (label, value, tone) => <StatTile label={label} value={value} tone={tone}/>;
  const ex = data?.expenses;
  const tableRows = [];
  if (data) {
    const byCat = {};
    (data.revenue || []).forEach(r => { (byCat[r.category] = byCat[r.category] || []).push(r); });
    Object.entries(byCat).forEach(([c, items]) => {
      tableRows.push({ kind: 'h', a: `${tl("Revenue")} · ${c}`, v: items.reduce((s, i) => s + i.revenue, 0) });
      items.forEach(i => tableRows.push({ kind: 'r', a: i.item, v: i.revenue }));
    });
    tableRows.push({ kind: 'h', a: tl("Products delivery"), v: Number(ex.delivery || 0) });
    tableRows.push({ kind: 'h', a: tl("Products wastage"), v: Number(ex.product_waste.total) });
    ex.product_waste.rows.forEach(r => tableRows.push({ kind: 'r', a: `${r.name} × ${parseFloat(r.qty.toFixed(2))}`, v: r.cost }));
    tableRows.push({ kind: 'h', a: tl("Items wastage"), v: Number(ex.item_waste.total) });
    ex.item_waste.rows.forEach(r => tableRows.push({ kind: 'r', a: `${r.name} × ${parseFloat(r.qty.toFixed(2))}`, v: r.cost }));
    if (ex.packaging?.rows?.length) {
      tableRows.push({ kind: 'h', a: tl("Packaging"), v: Number(ex.packaging.total) });
      ex.packaging.rows.forEach(r => tableRows.push({ kind: 'r', a: `${r.name} × ${parseFloat(r.qty.toFixed(2))}`, v: r.cost }));
    }
    if ((data.channels || []).length) {
      const names = { boa: tl("Board of Arrivals"), offline: tl("Offline sales"), online: tl("Online sales") };
      tableRows.push({ kind: 'h', a: tl("Profit by channel"), v: R - E });
      data.channels.forEach(c => tableRows.push({ kind: 'r', a: `${names[c.key]} (${tl("Revenue")} ${fmt(c.revenue)})`, v: c.profit }));
    }
  }

  return (
    <ReportCard title={tl("Profit & Loss")}
      actions={<OptionSeg label="Period" value={period} onChange={changePeriod} options={[["week",tl("Week")],["month",tl("Month")],["year",tl("Year")]]}/>}>
      <div className="mb-4 flex flex-wrap gap-3">
        {tile(tl("Revenue"), `${fmt(R)} AMD`, "brand")}
        {tile(tl("Expenses"), `${fmt(E)} AMD`)}
        {tile(net >= 0 ? tl("Profit") : tl("Loss"), `${net < 0 ? "−" : ""}${fmt(Math.abs(net))} AMD`, net >= 0 ? "success" : "destructive")}
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-2.5">
        <span className="text-muted-foreground text-xs">{tl("Click a revenue category or Profit to drill down.")}</span>
        {expanded.size > 0 && <Button variant="outline" size="xs" onClick={() => setExpanded(new Set())}>{tl("Collapse all")}</Button>}
        <Button variant="outline" size="xs" className="ms-auto" onClick={() => setView(v => v === 'chart' ? 'table' : 'chart')}>
          {view === 'chart' ? <><TableIcon/>{tl("Table view")}</> : <><ChartColumnIcon/>{tl("Chart view")}</>}
        </Button>
      </div>
      {loading ? <Spinner /> : !nodes.length ? (
        <ReportEmpty>{tl("No data yet.")}</ReportEmpty>
      ) : view === 'table' ? (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableBody>
              {tableRows.map((r, i) => (
                <TableRow key={i} className={r.kind === 'h' ? "bg-muted font-semibold hover:bg-muted" : ""}>
                  <TableCell className={`py-2 pe-3 ${r.kind === 'h' ? "ps-3" : "ps-7"}`}>{r.a}</TableCell>
                  <TableCell className="px-3 py-2 text-end tabular-nums">{fmt(r.v)} AMD</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div key={period} style={{ position: "relative", animation: "fadeIn 0.3s ease" }}>
          <svg width="100%" viewBox={`0 0 ${lay.W} ${lay.H}`} style={{ display: "block", maxWidth: lay.W, margin: "0 auto" }} role="img"
            aria-label={`${tl("Profit & Loss")}: ${tl("Revenue")} ${fmt(R)}, ${tl("Expenses")} ${fmt(E)}`}>
            {links.filter(l => l.sn && l.tn).map((l, i) => (
              <path key={i} d={ribbon(l)} fill={l.color} opacity={0.32} stroke="none"
                onMouseMove={e => showTip(e, [`${l.sn.label} → ${l.tn.label}`, `${fmt(l.v)} AMD`])} onMouseLeave={() => setTip(null)} />
            ))}
            {nodes.map(n => {
              const canDrill = n.id === 'pro' && (data?.channels || []).length > 0;
              const clickable = n.kind === 'cat' || n.kind === 'item' || canDrill;
              const share = n.kind === 'chan' ? pct(n.actual, net) : n.col === 0 ? pct(n.value, R) : n.col === 3 ? pct(n.value, E) : '';
              const lines = n.kind === 'chan'
                ? [n.label, `${n.actual < 0 ? "−" : ""}${fmt(Math.abs(n.actual))} AMD${share ? ` · ${share}` : ''}`, `${tl("Revenue")}: ${fmt(n.rev)} AMD`]
                : [n.label + (n.category && n.kind === 'item' ? ` · ${n.category}` : ''), `${fmt(n.value)} AMD${share ? ` · ${share}` : ''}`];
              return (
                <g key={n.id} style={{ cursor: clickable ? "pointer" : "default" }}
                  role={clickable ? "button" : undefined} tabIndex={clickable ? 0 : undefined}
                  aria-label={clickable ? `${n.label}: ${fmt(n.value)}` : undefined}
                  onClick={() => clickable && toggleCat(n)}
                  onKeyDown={e => { if (clickable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggleCat(n); } }}
                  onMouseMove={e => showTip(e, lines)} onMouseLeave={() => setTip(null)}>
                  <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={2} fill={n.color} opacity={n.shade ?? 1} stroke={"var(--card)"} strokeWidth={2} paintOrder="stroke" />
                  {n.col === 0 && (
                    <text x={n.x - 8} y={(n.ly ?? n.y + n.h / 2) + 4} textAnchor="end" fontSize={11} fill={"var(--foreground)"}>
                      {n.kind === 'cat' ? "▸ " : "· "}{n.label}<tspan fill={"var(--muted-foreground)"}> {fmtK(n.value)}</tspan>
                    </text>
                  )}
                  {n.col === 3 && (
                    <text x={n.x + n.w + 8} y={(n.ly ?? n.y + n.h / 2) + 4} fontSize={11} fill={"var(--foreground)"}>
                      {n.label}<tspan fill={"var(--muted-foreground)"}> {n.kind === 'chan' ? `${n.actual < 0 ? "−" : ""}${fmtK(Math.abs(n.actual))} · ${pct(n.actual, net)}` : fmtK(n.value)}</tspan>
                    </text>
                  )}
                  {(n.col === 1 || n.col === 2) && (() => {
                    const second = nodes.filter(x => x.col === n.col)[0].id !== n.id;   // 2nd node in a column: label beside it
                    const props = !second ? { x: n.x + n.w / 2, y: n.y - 8, textAnchor: "middle" }
                      : n.col === 1 ? { x: n.x - 8, y: n.y + n.h / 2 + 4, textAnchor: "end" }
                      : { x: n.x + n.w + 8, y: n.y + n.h / 2 + 4, textAnchor: "start" };
                    return (
                      <text {...props} fontSize={11} fontWeight={700} fill={"var(--foreground)"}>
                        {canDrill ? (expanded.has("profit") ? "▾ " : "▸ ") : ""}{n.label}<tspan fill={"var(--muted-foreground)"} fontWeight={400}> {fmtK(n.value)}</tspan>
                      </text>
                    );
                  })()}
                </g>
              );
            })}
          </svg>
          {tip && (
            <ChartTip x={Math.min(tip.x + 12, 520)} y={tip.y + 12}>
              {tip.lines.map((t, i) => <div key={i} className={i === 0 ? "font-semibold" : "text-muted-foreground"}>{t}</div>)}
            </ChartTip>
          )}
        </div>
      )}
    </ReportCard>
  );
}

const ABC_COL = { A:"#00a383", B:"#e0a400", C:"#d63031" };
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
  const abcColor = ABC_COL;

  // ── Sales bar chart ─────────────────────────────────────────────────────
  const W=600,H=220,PL=55,PR=20,PT=20,PB=45,cW=W-PL-PR,cH=H-PT-PB;
  const vals = salesData.map(d=>Number(d.revenue));
  const maxV = Math.max(...vals,1);
  const barW = Math.max(4, cW/Math.max(vals.length,1) - 4);
  const n = vals.length;
  const ptX = i => PL+i*(cW/n)+cW/(n*2);
  const ptY = v => PT+cH*(1-v/maxV);
  const trendPts = vals.map((v,i)=>[ptX(i),ptY(v)]);
  const fmtAMD = v => v>=1000?`${Math.round(v/1000)}k`:String(Math.round(v));

  // ── ABC scatter ─────────────────────────────────────────────────────────
  const SW=600,SH=300,SPL=60,SPR=20,SPT=20,SPB=40,ScW=SW-SPL-SPR,ScH=SH-SPT-SPB;
  const [abcAvailOnly, setAbcAvailOnly] = useState(false);
  const items = (abcAvailOnly ? abcData?.items_available : abcData?.items)||[];
  const maxRev=Math.max(...items.map(i=>i.revenue),1);
  const maxCv=Math.max(...items.map(i=>i.cv),2);
  const z05=SPL+(0.5/maxCv)*ScW, z1=SPL+(1/maxCv)*ScW;
  const xPos=cv=>SPL+(cv/maxCv)*ScW;
  const yPos=rev=>SPT+ScH-(rev/maxRev)*ScH;

  // ── Association rules ────────────────────────────────────────────────────
  const [availOnly, setAvailOnly] = useState(false);
  const rules = (availOnly ? abcData?.rules_available : abcData?.rules)||[];
  const RW=600,RPL=185,RPR=20,RPT=20,RPB=20,RcW=RW-RPL-RPR;

  return (
    <Page title={tl("Reports")}>
      {/* SALES */}
      <ReportCard title={tl("Sales")}
        actions={<OptionSeg label="Period" value={period} onChange={changePeriod} options={[["week",tl("Week")],["month",tl("Month")],["year",tl("Year")]]}/>}>
        <div className="mb-4 flex flex-wrap gap-3">
          <StatTile label={tl("Revenue")} value={`${totalRevenue.toLocaleString()} AMD`} tone="brand"/>
          <StatTile label="Days with sales" value={salesData.length}/>
        </div>
        {loading?<Spinner/>:!vals.length?(
          <ReportEmpty>{tl("No data yet.")}</ReportEmpty>
        ):(
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{maxWidth:W,display:"block",margin:"0 auto"}}>
            {[0,0.25,0.5,0.75,1].map(t=>{
              const y=PT+cH*(1-t);
              return <g key={t}>
                <line x1={PL} y1={y} x2={PL+cW} y2={y} stroke={"var(--border)"} strokeWidth={0.5}/>
                <text x={PL-6} y={y+4} textAnchor="end" fontSize={10} fill={"var(--muted-foreground)"}>{fmtAMD(maxV*t)}</text>
              </g>;
            })}
            {vals.map((v,i)=>{
              const x=PL+i*(cW/n)+cW/(n*2)-barW/2;
              const bh=Math.max(1,(v/maxV)*cH);
              const date=new Date(salesData[i].day);
              const label=`${String(date.getDate()).padStart(2,"0")}/${String(date.getMonth()+1).padStart(2,"0")}`;
              return <g key={i}>
                <rect x={x} y={PT+cH-bh} width={barW} height={bh} fill={"var(--brand)"} opacity={0.8} rx={2}/>
                {i%(Math.ceil(n/8))===0&&<text x={x+barW/2} y={H-8} textAnchor="middle" fontSize={9} fill={"var(--muted-foreground)"}>{label}</text>}
              </g>;
            })}
            {n>1&&<polyline points={trendPts.map(p=>p.join(",")).join(" ")} fill="none" stroke={"var(--foreground)"} strokeWidth={1.5} strokeDasharray="1.5,4" strokeLinecap="round"/>}
            {trendPts.map(([x,y],i)=>{
              const prev=i>0?vals[i-1]:null;
              const pct=prev&&prev>0?Math.round((vals[i]-prev)/prev*100):null;
              return <g key={"t"+i}>
                <circle cx={x} cy={y} r={4} fill={"var(--foreground)"} stroke={"var(--card)"} strokeWidth={2}>
                  <title>{`${String(new Date(salesData[i].day).getDate()).padStart(2,"0")}/${String(new Date(salesData[i].day).getMonth()+1).padStart(2,"0")}: ${vals[i].toLocaleString()} AMD${pct!==null?` (${pct>0?"+":""}${pct}%)`:""}`}</title>
                </circle>
                {n<=14&&pct!==null&&<text x={x} y={Math.max(10,y-9)} textAnchor="middle" fontSize={8} fill={"var(--muted-foreground)"}>{pct>0?"+":""}{pct}%</text>}
              </g>;
            })}
            <line x1={PL} y1={PT} x2={PL} y2={PT+cH} stroke={"var(--border)"} strokeWidth={1}/>
            <line x1={PL} y1={PT+cH} x2={PL+cW} y2={PT+cH} stroke={"var(--border)"} strokeWidth={1}/>
            <text x={PL-44} y={PT+cH/2} textAnchor="middle" fontSize={10} fill={"var(--muted-foreground)"} transform={`rotate(-90,${PL-44},${PT+cH/2})`}>AMD</text>
          </svg>
        )}
      </ReportCard>

      {/* PROFIT & LOSS */}
      <PnlSection toast={toast}/>

      {/* BOARD OF ARRIVALS IMPACT */}
      <BoaImpactSection toast={toast}/>

      {/* ABC/XYZ */}
      <ReportCard title={tl("ABC Analysis")}
        description={<span className="flex flex-wrap items-center gap-2.5">
          {[["A",ABC_COL.A],["B",ABC_COL.B],["C",ABC_COL.C]].map(([cat,col])=>(
            <span key={cat} className="flex items-center gap-1 text-foreground"><span className="inline-block size-2.5 rounded-full" style={{ background:col }}/>{cat}</span>
          ))}
          <span>· X (stable) Y (variable) Z (erratic)</span>
        </span>}>
        <Label className="mb-4 cursor-pointer font-normal">
          <Checkbox checked={abcAvailOnly} onCheckedChange={v=>setAbcAvailOnly(!!v)}/>
          {tl("Display available items only")}
        </Label>
        {loading?<Spinner/>:!items.length?(
          <ReportEmpty>{tl("No data yet.")}</ReportEmpty>
        ):(
          <div className="relative mx-auto w-full" style={{ maxWidth:SW }}>
            <svg width="100%" viewBox={`0 0 ${SW} ${SH}`} style={{display:"block"}}>
              <rect x={SPL} y={SPT} width={z05-SPL} height={ScH} fill={ABC_COL.A} opacity={0.07}/>
              <rect x={z05} y={SPT} width={z1-z05} height={ScH} fill={ABC_COL.B} opacity={0.08}/>
              <rect x={z1}  y={SPT} width={SPL+ScW-z1} height={ScH} fill={ABC_COL.C} opacity={0.07}/>
              <text x={SPL+5} y={SPT+14} fontSize={10} fill={ABC_COL.A} fontWeight="700">X</text>
              <text x={z05+5} y={SPT+14} fontSize={10} fill={ABC_COL.B} fontWeight="700">Y</text>
              <text x={z1+5}  y={SPT+14} fontSize={10} fill={ABC_COL.C} fontWeight="700">Z</text>
              {[0,0.25,0.5,0.75,1].map(t=>{
                const y=SPT+ScH*(1-t);
                return <g key={t}>
                  <line x1={SPL} y1={y} x2={SPL+ScW} y2={y} stroke={"var(--border)"} strokeWidth={0.5}/>
                  <text x={SPL-5} y={y+4} textAnchor="end" fontSize={9} fill={"var(--muted-foreground)"}>{Math.round(maxRev*t/1000)}k</text>
                </g>;
              })}
              <line x1={z05} y1={SPT} x2={z05} y2={SPT+ScH} stroke={"var(--border)"} strokeDasharray="3,3" strokeWidth={1}/>
              <line x1={z1}  y1={SPT} x2={z1}  y2={SPT+ScH} stroke={"var(--border)"} strokeDasharray="3,3" strokeWidth={1}/>
              <line x1={SPL} y1={SPT} x2={SPL} y2={SPT+ScH} stroke={"var(--border)"}/>
              <line x1={SPL} y1={SPT+ScH} x2={SPL+ScW} y2={SPT+ScH} stroke={"var(--border)"}/>
              <text x={SPL+ScW/2} y={SH-5} textAnchor="middle" fontSize={10} fill={"var(--muted-foreground)"}>Coefficient of variation (volatility →)</text>
              <text x={14} y={SPT+ScH/2} textAnchor="middle" fontSize={10} fill={"var(--muted-foreground)"} transform={`rotate(-90,14,${SPT+ScH/2})`}>Revenue →</text>
              {items.map((it,i)=>(
                <circle key={i} cx={xPos(it.cv)} cy={yPos(it.revenue)} r={6}
                  fill={abcColor[it.abc]||"var(--muted-foreground)"} opacity={0.85} style={{cursor:"pointer"}}
                  onMouseEnter={e=>setTooltip({...it,px:xPos(it.cv),py:yPos(it.revenue)})}
                  onMouseLeave={()=>setTooltip(null)}/>
              ))}
            </svg>
            {tooltip&&(
              <ChartTip x={Math.min(tooltip.px+14,SW-170)} y={Math.max(tooltip.py-40,0)} className="max-w-44">
                <b className="mb-0.5 block">{tooltip.name}</b>
                <span className="text-muted-foreground">Revenue: </span>{Math.round(tooltip.revenue).toLocaleString()} AMD<br/>
                <span className="text-muted-foreground">Orders: </span>{tooltip.order_count}<br/>
                <span className="text-muted-foreground">Class: </span>
                <span className="font-bold" style={{color:abcColor[tooltip.abc]}}>{tooltip.abc}</span>
                <span className="font-bold" style={{color:tooltip.xyz==='X'?ABC_COL.A:tooltip.xyz==='Y'?ABC_COL.B:ABC_COL.C}}>{tooltip.xyz}</span>
                <span className="text-muted-foreground"> CV:{tooltip.cv}</span>
              </ChartTip>
            )}
          </div>
        )}
      </ReportCard>

      {/* ASSOCIATION RULES */}
      <ReportCard title={tl("Association Rules")} description="Top 10 item pairs by confidence — bar width = confidence, colour = lift" className="mb-0">
        <Label className="mb-4 cursor-pointer font-normal">
          <Checkbox checked={availOnly} onCheckedChange={v=>setAvailOnly(!!v)}/>
          {tl("Display available items only")}
        </Label>
        {loading?<Spinner/>:!rules.length?(
          <ReportEmpty>{availOnly?"No association rules for items currently in inventory.":"Not enough order data for association rules (need ≥5 orders with multiple items)."}</ReportEmpty>
        ):(
          <svg width="100%" viewBox={`0 0 ${RW} ${RPT+RPB+rules.length*34}`} style={{maxWidth:RW,display:"block",margin:"0 auto"}}>
            {rules.map((r,i)=>{
              const y=RPT+i*34;
              const confW=r.confidence*RcW;
              const liftCol=r.lift>1.5?ABC_COL.A:r.lift>1?ABC_COL.B:ABC_COL.C;
              const label=`${r.antecedent.slice(0,20)} → ${r.consequent.slice(0,16)}`;
              return <g key={i}>
                <text x={RPL-6} y={y+16} textAnchor="end" fontSize={11} fill={"var(--foreground)"}>{label}</text>
                <rect x={RPL} y={y+4} width={RcW} height={20} fill={"var(--muted)"} rx={4}/>
                <rect x={RPL} y={y+4} width={confW} height={20} fill={"var(--brand)"} rx={4} opacity={0.85}/>
                <text x={RPL+confW+6} y={y+18} fontSize={10} fill={"var(--muted-foreground)"}>
                  {`conf ${Math.round(r.confidence*100)}%`}
                </text>
                <text x={RPL+confW+68} y={y+18} fontSize={10} fill={liftCol} fontWeight="700">
                  {`lift ${r.lift.toFixed(1)}×`}
                </text>
              </g>;
            })}
          </svg>
        )}
      </ReportCard>
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
    { key:"sid",   label:"ID",    sortable:true,  render:r=><span className="font-mono text-muted-foreground text-xs">#{r._id}</span> },
    { key:"name",  label:"Name",  sortable:true,  render:r=>(
      <button type="button" data-slot="row-link" onClick={()=>setEditSupplier(r)} className="text-start font-semibold underline decoration-dotted underline-offset-3 hover:decoration-solid">{r.name}</button>
    )},
    { key:"email", label:"Email", sortable:true,  render:r=>r.email||<span className="text-muted-foreground">—</span> },
    { key:"phone", label:"Phone", sortable:false, render:r=>r.phone||<span className="text-muted-foreground">—</span> },
  ];

  return (
    <Page title={tl("Suppliers")} actions={<>
      {selected.length>0&&<Btn variant="danger" size="sm" onClick={()=>setDialog("del")}><Trash2Icon/>Delete ({selected.length})</Btn>}
      <Btn size="sm" onClick={()=>setShowNew(s=>!s)}><PlusIcon/>{tl("+ New supplier").replace(/^\+\s*/,"")}</Btn>
    </>}>
      {showNew&&(
        <Card className="mb-6" style={{ animation:"fadeIn 0.2s ease" }}>
          <CardHeader>
            <CardTitle className="font-heading text-lg">New supplier</CardTitle>
            <CardAction><Button variant="ghost" size="icon-sm" aria-label="Close" onClick={()=>setShowNew(false)}><XIcon/></Button></CardAction>
          </CardHeader>
          <CardPanel><SupplierForm onSave={doSave} onCancel={()=>setShowNew(false)} saving={saving} /></CardPanel>
        </Card>
      )}
      {loading?<Spinner/>: sorted.length===0 && !showNew ? (
        <Empty className="rounded-2xl border border-border border-dashed bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon"><StoreIcon/></EmptyMedia>
            <EmptyTitle>No suppliers yet</EmptyTitle>
            <EmptyDescription>Add the companies you buy from, with their delivery terms, to place purchase orders.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent><Btn size="sm" onClick={()=>setShowNew(true)}><PlusIcon/>New supplier</Btn></EmptyContent>
        </Empty>
      ) : sorted.length>0 && <DataTable columns={cols} rows={sorted.map(s=>({...s,_id:s.sid}))} selected={selected} onSelect={toggleSel} onSelectAll={setSelected} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />}

      {editSupplier&&(
        <Modal onClose={()=>setEditSupplier(null)} title="Edit supplier" description={editSupplier.name} className="max-w-2xl">
          <SupplierForm initial={editSupplier} onSave={doSave} onCancel={()=>setEditSupplier(null)} saving={saving} />
        </Modal>
      )}
      <Dialog open={dialog==="del"} title="Delete suppliers?" onConfirm={doDelete} onCancel={()=>setDialog(null)}>
        Are you sure you wish to delete the selected supplier{selected.length>1?"s":""}? This action may not be undone.
      </Dialog>
    </Page>
  );
}

// ─── BOARD OF ARRIVALS ────────────────────────────────────────────────────────
// ETA timestamps arrive as ISO (UTC); show them in the viewer's local time as HH:MM
export const fmtLocalTime = iso => {
  const d = new Date(iso);
  return isNaN(d) ? (iso || "") : d.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", hour12:false });
};

// ─── INVITE PAGE ─────────────────────────────────────────────────────────────
function InvitePage({ token, setPage, toast, onLogin }) {
  const [info,    setInfo]    = useState(null);   // {email, employer_name, already_registered}
  const [status,  setStatus]  = useState("loading"); // loading | ready | done | error
  const [errMsg,  setErrMsg]  = useState("");
  const [form,    setForm]    = useState({ first_name:"", last_name:"", password:"" });
  const [saving,  setSaving]  = useState(false);

  useEffect(()=>{
    api.getInvite(token)
      .then(data=>{ setInfo(data); setStatus("ready"); })
      .catch(e=>{ setErrMsg(e.message); setStatus("error"); });
  },[token]);

  const submit = async () => {
    if (!info.already_registered) {
      if (!form.first_name.trim()||!form.last_name.trim()) { toast("Please enter your name","error"); return; }
      if (form.password.trim().length<6) { toast("Password must be at least 6 characters","error"); return; }
    }
    setSaving(true);
    try {
      const res = await api.completeInvite(token, {
        first_name: form.first_name.trim(),
        last_name:  form.last_name.trim(),
        password:   form.password.trim(),
      });
      localStorage.setItem("token", res.token);
      setStatus("done");
      setTimeout(()=>{ window.location.hash=""; onLogin(res.user); }, 1200);
    } catch(e){ toast(e.message,"error"); }
    finally{ setSaving(false); }
  };

  if (status==="loading") return <AuthStatus loading/>;

  if (status==="error") return (
    <AuthStatus icon={TriangleAlertIcon} tone="error" title="Invalid or expired invite"
      action={<Button variant="outline" onClick={()=>{ window.location.hash=""; setPage("login"); }}>Go to login</Button>}>
      <p>{errMsg}</p>
      <p className="mt-2">Please ask your restaurant manager to resend the invite.</p>
    </AuthStatus>
  );

  if (status==="done") return (
    <AuthStatus icon={PartyPopperIcon} tone="success" title="You're all set!">Logging you in…</AuthStatus>
  );

  return (
    <AuthCard title={info.already_registered ? "Accept invitation" : "Set up your account"} onSubmit={submit}
      description={<>You've been invited to join <strong className="text-foreground">{info.employer_name}</strong> on Tanelu.</>}
      footer={<>Already have a different account?<button type="button" className={linkBtn} onClick={()=>{ window.location.hash=""; setPage("login"); }}>Log in</button></>}>
      <Input label="Email" value={info.email} onChange={()=>{}} disabled />
      {info.already_registered ? (
        <>
          <Alert variant="success"><CircleCheckIcon/><AlertDescription>You already have a Tanelu account with this email. Click below to link it to {info.employer_name}.</AlertDescription></Alert>
          <Button type="submit" size="lg" loading={saving} className="w-full">Accept invitation</Button>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Input label="First name" value={form.first_name} onChange={v=>setForm(p=>({...p,first_name:v}))} required/>
            <Input label="Last name"  value={form.last_name}  onChange={v=>setForm(p=>({...p,last_name:v}))}  required/>
          </div>
          <Input label="Password" type="password" value={form.password} onChange={v=>setForm(p=>({...p,password:v}))} placeholder="At least 6 characters" required/>
          <Button type="submit" size="lg" loading={saving} className="w-full">Create account & join</Button>
        </>
      )}
    </AuthCard>
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
    <AuthStatus icon={CircleCheckIcon} tone="success" title="Password updated"
      action={<Button onClick={()=>{ window.location.hash=""; setPage("login"); }}>Go to login</Button>}>
      Your password has been changed. You can now log in with your new password.
    </AuthStatus>
  );

  return (
    <AuthCard title="Set new password" description="Enter a new password for your account." onSubmit={submit}
      footer={<button type="button" className={`${linkBtn} inline-flex items-center gap-1`} onClick={()=>{ window.location.hash=""; setPage("login"); }}><ArrowLeftIcon className="size-3.5"/>Back to login</button>}>
      <Input label="New password" type="password" value={pw}  onChange={setPw}  placeholder="••••••••" hint="At least 6 characters" />
      <Input label="Confirm password" type="password" value={pw2} onChange={setPw2} placeholder="••••••••" />
      <Button type="submit" size="lg" loading={loading} className="w-full">Set password</Button>
    </AuthCard>
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

  if (status==="loading") return <AuthStatus loading>Verifying your email…</AuthStatus>;
  if (status==="success") return <AuthStatus icon={PartyPopperIcon} tone="success" title="Email confirmed!">Logging you in…</AuthStatus>;
  return (
    <AuthStatus icon={TriangleAlertIcon} tone="error" title="Link expired or invalid"
      action={<Button onClick={()=>{ window.location.hash=""; setPage("signup"); }}>Register again</Button>}>
      {msg || "This verification link has expired. Please register again."}
    </AuthStatus>
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
const DUR_UNITS = [
  { value:'seconds', label:'sec' },
  { value:'minutes', label:'min' },
  { value:'hours',   label:'h'   },
];
const durAbbr = u => DUR_UNITS.find(d=>d.value===u)?.label || (u||'min');


const isLastStep = (run, step) => !step.recur_every && (run.steps||[]).every(x=>x.psrid===step.psrid || ['completed','skipped'].includes(x.status));

// ─── STOP PROCESS DIALOG ──────────────────────────────────────────────────────
function StopRunDialog({ run, mode="stop", psrid=null, onClose, onStopped, toast }) {
  const [full, setFull] = useState(null);
  const [vals, setVals] = useState({});
  const [busy, setBusy] = useState(false);
  const dec = q => { const m = String(q).match(/\.(\d+)/); return m ? m[1].replace(/0+$/,"").length : 0; };
  const fmt = (q, d) => Number(q).toFixed(d);
  useEffect(()=>{
    api.getProcessRun(run.prid).then(f=>{
      setFull(f);
      setVals(Object.fromEntries((f.items||[]).map(it=>[it.rid, Number(it.qty)])));
    }).catch(e=>{ toast(e.message,"error"); onClose(); });
  },[]);
  const clamp = (it, v) => Math.min(Number(it.qty), Math.max(0, v));
  const bump = (it, d) => setVals(p=>({...p,[it.rid]:clamp(it, Math.round((p[it.rid]+d)*1e6)/1e6)}));
  const reset = () => setVals(Object.fromEntries((full.items||[]).map(it=>[it.rid, Number(it.qty)])));
  const stop = async () => {
    setBusy(true);
    try {
      const accepted = (full.items||[]).map(it=>({rid:it.rid, qty:vals[it.rid]}));
      const updated = mode==="complete" ? await api.completeStep(run.prid, psrid, { accepted }) : await api.stopRun(run.prid, { accepted });
      onStopped(updated);
    } catch(e){ toast(e.message,"error"); } finally{ setBusy(false); }
  };
  return (
    <Modal onClose={onClose} className="max-w-lg"
      title={`${mode==="complete"?"Completing":"Stopping"} ${run.process_name}…`}
      description={mode==="complete"
        ? <>This is the last step of {run.process_name}. Click “Complete” to accept the quantities below:</>
        : <>{run.process_name} will terminate, and you will not be able to resume it. Click “Stop” to accept the quantities below:</>}
      footer={<>
        <Btn variant="ghost" onClick={reset} disabled={!full}><Undo2Icon/>Reset</Btn>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant={mode==="complete"?"primary":"danger"} loading={busy} disabled={!full} onClick={stop}>
            {mode==="complete"?<><CheckIcon/>Complete</>:<><SquareIcon/>Stop</>}
          </Btn>
        </div>
      </>}>
      {!full ? <Spinner/> : (
        <div className="flex flex-col divide-y divide-border">
          {(full.items||[]).map(it=>{
            const d = dec(it.qty); const v = vals[it.rid]; const low = v < Number(it.qty);
            return (
              <div key={it.rid} className="flex items-center gap-3 py-2.5">
                <span className={`min-w-0 flex-1 truncate font-medium text-sm ${low?"text-destructive-foreground":""}`}>{it.name}</span>
                <span className={low?"text-destructive-foreground":""}>
                  <QtyStepper label={it.name} value={v} display={fmt(v??it.qty,d)}
                    onDec={()=>bump(it,-1)} onInc={()=>bump(it,1)} decDisabled={v<=0} incDisabled={v>=Number(it.qty)}/>
                </span>
                <span className="w-10 text-muted-foreground text-xs">{it.units||"pcs"}</span>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

// ─── SKILL COMBO ──────────────────────────────────────────────────────────────
// Coloured pill for a skill/role (colours come from the database).
// Text uses --ink, lifted towards white in dark mode so dark DB colours stay readable.
const SKILL_INK = "text-(--ink) dark:text-[color-mix(in_oklab,var(--ink)_55%,white)]";
function SkillPill({ name, color, onClick, onRemove, size="md" }) {
  const c = color || G.caramel;
  return (
    <span data-slot="skill-pill" className={`inline-flex max-w-full items-center gap-1 rounded-full border font-medium leading-none ${SKILL_INK} ${size==="sm"?"px-2 py-1 text-[11px]":"px-2.5 py-1 text-xs"}`}
      style={{ background:`${c}1c`, borderColor:`${c}4d`, "--ink":c }}>
      {onClick
        ? <button type="button" data-slot="skill-pill-name" onClick={e=>{ e.stopPropagation(); onClick(); }} className="truncate font-semibold underline decoration-dotted underline-offset-2 hover:decoration-solid">{name}</button>
        : <span className="truncate">{name}</span>}
      {onRemove&&(
        <button type="button" data-slot="skill-pill-remove" aria-label={`Remove ${name}`} onClick={e=>{ e.stopPropagation(); onRemove(); }}
          className="-me-1 inline-flex size-4 items-center justify-center rounded-full opacity-70 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10">
          <XIcon className="size-3"/>
        </button>
      )}
    </span>
  );
}

function SkillCombo({ allSkills, selected, excluded=[], onChange, onCreateSkill, onClickPill, pillColor, placeholder="Type to search or add…" }) {
  const [input, setInput] = useState("");
  const [open, setOpen]   = useState(false);
  const [hi, setHi]       = useState(0);
  const [rect, setRect]   = useState(null);
  const ref = useRef(null);
  // The list is portalled (so tables/dialogs can't clip it) and follows the field while open
  useEffect(()=>{
    if (!open) return;
    const upd = () => { const r = ref.current?.getBoundingClientRect(); if (r) setRect({ top:r.top, bottom:r.bottom, left:r.left, width:r.width }); };
    upd();
    window.addEventListener("scroll", upd, true); window.addEventListener("resize", upd);
    return () => { window.removeEventListener("scroll", upd, true); window.removeEventListener("resize", upd); };
  },[open, selected.length]);

  // Filter: not already selected, not in excluded list, matches input
  const available = allSkills.filter(s =>
    !selected.find(x=>(x.skid||x.rid)===s.skid) &&
    !excluded.find(x=>x===s.skid) &&
    s.name.toLowerCase().includes(input.toLowerCase())
  );
  const canCreate = onCreateSkill && input.trim() &&
    !allSkills.find(s=>s.name.toLowerCase()===input.trim().toLowerCase());
  const options = [...(canCreate?[{ _create:true }]:[]), ...available];

  const add    = s => { onChange([...selected, s]); setInput(""); setOpen(false); setHi(0); };
  const remove = id => onChange(selected.filter(s=>(s.skid||s.rid)!==id));
  const pick = async o => {
    if (o._create) { const n = await onCreateSkill(input.trim()); if (n) add(n); }
    else add(o);
  };

  const handleKey = async e => {
    if (e.key==="Backspace" && !input && selected.length) {
      const last = selected[selected.length-1]; remove(last.skid||last.rid);
    }
    if (e.key==="ArrowDown") { e.preventDefault(); setOpen(true); setHi(h=>Math.min(h+1, options.length-1)); }
    if (e.key==="ArrowUp")   { e.preventDefault(); setHi(h=>Math.max(h-1, 0)); }
    if (e.key==="Enter" && (input.trim() || (open && options.length))) {
      e.preventDefault();
      const o = options[Math.min(hi, options.length-1)];
      if (o) await pick(o);
    }
    // Close only the list; keep an enclosing dialog open
    if (e.key==="Escape" && open && options.length) { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation?.(); setOpen(false); }
  };

  const getColor = s => pillColor || s.color || G.caramel;

  return (
    <div className="relative w-full" ref={ref}>
      <div data-slot="skill-combo" onClick={()=>{ setOpen(true); ref.current.querySelector("input")?.focus(); }}
        className="flex min-h-9 w-full cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-2 py-1.5 text-sm shadow-xs/5 transition-shadow focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/24 dark:bg-input/32">
        {selected.map(s=>{
          const id = s.skid||s.rid;
          return <SkillPill key={id} name={s.name} color={getColor(s)} onClick={onClickPill?()=>onClickPill(s):undefined} onRemove={()=>remove(id)}/>;
        })}
        <input data-slot="skill-combo-input" value={input} onChange={e=>{ setInput(e.target.value); setOpen(true); setHi(0); }}
          onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),150)}
          onKeyDown={handleKey}
          placeholder={selected.length?"":placeholder}
          className="h-6 min-w-32 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"/>
      </div>
      {open&&options.length>0&&rect&&createPortal(
        <div data-slot="skill-combo-popup" role="listbox"
          style={{ position:"fixed", top:rect.bottom+4, left:rect.left, width:rect.width, zIndex:2500 }}
          className="max-h-56 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg/5">
          {options.map((o,i)=>(
            <button type="button" key={o._create?"__new":(o.skid||o.rid)} data-slot="skill-combo-item" role="option" aria-selected={i===hi}
              onMouseDown={e=>{ e.preventDefault(); pick(o); }} onMouseEnter={()=>setHi(i)}
              className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-start text-sm ${i===hi?"bg-accent text-accent-foreground":""}`}>
              {o._create
                ? <><PlusIcon className="size-4 text-brand"/><span>Add <span className="font-semibold">“{input.trim()}”</span></span></>
                : <><span className="size-2 shrink-0 rounded-full" style={{ background:o.color||G.caramel }}/>{o.name}</>}
            </button>
          ))}
        </div>, document.body
      )}
    </div>
  );
}

// ─── SKILL EDIT DIALOG ────────────────────────────────────────────────────────
function SkillEditDialog({ skill, allSkills, onSave, onClose }) {
  const [form, setForm] = useState({
    name: skill.name,
    duration: intDur(skill.duration)||"",
    duration_unit: skill.duration_unit||"minutes",
    dep_type: skill.dep_type||"",
    dep_skid: skill.dep_skid ? String(skill.dep_skid) : "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const save = async () => {
    if (!form.name.trim()) { setErr("Name is required"); return; }
    setSaving(true); setErr("");
    try {
      const updated = await api.updateSkill(skill.skid, {
        name: form.name.trim(),
        duration: form.duration ? Number(form.duration) : null,
        duration_unit: form.duration_unit,
        dep_type: form.dep_type||null,
        dep_skid: form.dep_type && form.dep_skid ? Number(form.dep_skid) : null,
      });
      onSave(updated);
    } catch(e){ setErr(e.message); } finally{ setSaving(false); }
  };

  const otherSkills = allSkills.filter(s=>s.skid!==skill.skid);
  const depItems = [{ label:"Select skill…", value:"" }, ...otherSkills.map(s=>({ label:s.name, value:String(s.skid) }))];

  return (
    <Modal onClose={onClose} title="Edit skill" description={skill.name} className="max-w-md"
      footer={<>
        <span className="text-destructive-foreground text-sm">{err}</span>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={save} loading={saving}>Save</Btn>
        </div>
      </>}>
      <div className="flex flex-col gap-4">
        <Input label="Name" value={form.name} onChange={v=>set("name",v)} required />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Duration" type="number" value={String(form.duration)} onChange={v=>set("duration", Math.max(0, parseInt(v,10)||0))} placeholder="e.g. 30" />
          <Select label="Unit" value={form.duration_unit} onChange={v=>set("duration_unit",v)} options={DUR_UNITS}/>
        </div>
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <span className="font-medium text-sm">Dependency</span>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Type" value={form.dep_type} onChange={v=>set("dep_type",v)} options={DEP_TYPES} placeholder="None"/>
            <Field className="w-full gap-1.5">
              <FieldLabel>Depends on</FieldLabel>
              <CSelect items={depItems} value={form.dep_skid} onValueChange={v=>set("dep_skid",v??"")} disabled={!form.dep_type}>
                <SelectTrigger size="lg" className={form.dep_skid===""?"text-muted-foreground":undefined}><SelectValue/></SelectTrigger>
                <SelectPopup>{depItems.map(it=><SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>)}</SelectPopup>
              </CSelect>
            </Field>
          </div>
          {form.dep_type&&<p className="text-muted-foreground text-xs">{DEP_TYPES.find(d=>d.value===form.dep_type)?.label}</p>}
        </div>
      </div>
    </Modal>
  );
}

// ─── ROLE EDIT DIALOG ─────────────────────────────────────────────────────────
function RoleEditDialog({ role, allSkills, onSave, onClose, createSkill }) {
  const [name, setName]       = useState(role.name);
  const [selSkills, setSelSkills] = useState(role.skills||[]);
  const [saving, setSaving]   = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    if (!name.trim()) { setErr("Role name is required"); return; }
    setSaving(true); setErr("");
    try {
      const updated = await api.updateRole(role.rid, { name:name.trim(), skill_ids: selSkills.map(s=>s.skid) });
      onSave(updated);
    } catch(e){ setErr(e.message); } finally{ setSaving(false); }
  };

  return (
    <Modal onClose={onClose} title="Edit role" className="max-w-lg"
      footer={<>
        <span className="text-destructive-foreground text-sm">{err}</span>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={save} loading={saving}>Save</Btn>
        </div>
      </>}>
      <div className="flex flex-col gap-4">
        <Input label="Role name" value={name} onChange={setName} required />
        <FieldBlock label="Skills">
          <SkillCombo allSkills={allSkills} selected={selSkills} onChange={setSelSkills} onCreateSkill={createSkill} pillColor={role.color}/>
        </FieldBlock>
      </div>
    </Modal>
  );
}

// ─── STAFF PAGE ────────────────────────────────────────────────────────────────
// ─── OWNER SKILLS PANEL ───────────────────────────────────────────────────────
// Lets the restaurant owner assign skills to themselves so they can be
// assigned to process steps (otherwise they'd never appear in availability checks)
function OwnerSkillsPanel({ user, skills, createSkill, toast }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
  const [mySkills,  setMySkills]  = useState([]);
  const [saving,    setSaving]    = useState(false);
  const [expanded,  setExpanded]  = useState(false);

  useEffect(()=>{
    api.getSkills().then(all=>{
      // Fetch owner's own employee_skill entries
      fetch('/api/staff/self-skills', {
        headers:{ Authorization:`Bearer ${localStorage.getItem("token")}` }
      }).then(r=>r.json()).then(s=>setMySkills(Array.isArray(s)?s:[])).catch(()=>{});
    }).catch(()=>{});
  },[]);

  const save = async (newSkills) => {
    setSaving(true);
    try {
      await fetch('/api/staff/self-skills', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ skill_ids: newSkills.map(s=>s.skid) })
      });
      setMySkills(newSkills);
      toast("Your skills saved");
    } catch(e){ toast(e.message||"Error","error"); }
    finally{ setSaving(false); }
  };

  return (
    <div className="mb-5 rounded-2xl border border-border bg-muted px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 font-semibold text-sm"><CircleUserIcon className="size-4 text-muted-foreground"/>{tl("Your skills")}</span>
          {!expanded&&(mySkills.length>0
            ? mySkills.map(s=><SkillPill key={s.skid} name={s.name} color={s.color||G.muted} size="sm"/>)
            : <span className="text-muted-foreground text-xs italic">None assigned — add skills to be eligible for process steps</span>)}
        </div>
        <Button variant="ghost" size="sm" onClick={()=>setExpanded(e=>!e)} loading={saving}>
          {expanded?<><CheckIcon/>Done</>:<><PencilIcon/>Edit</>}
        </Button>
      </div>
      {expanded&&(
        <div className="mt-3 flex flex-col gap-1.5">
          <SkillCombo allSkills={skills} selected={mySkills} onChange={s=>save(s)} onCreateSkill={createSkill}/>
          <p className="text-muted-foreground text-xs">These skills make you eligible to be assigned to process steps.</p>
        </div>
      )}
    </div>
  );
}

function StaffPage({ user, toast }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
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
  const [confirmDel, setConfirmDel] = useState(false);
  const [resending, setResending] = useState(null);

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
  const allSel  = employees.length>0 && selected.length===employees.length;
  const someSel = selected.length>0 && !allSel;

  const doDelete = async () => {
    setConfirmDel(false);
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
  const closeForm = () => { setShowNew(false); setEditEmp(null); };

  const saveEmployee = async () => {
    if (!form.first_name.trim()||!form.last_name.trim()) { toast("First and last name required","error"); return; }
    if (!form.email.trim()) { toast("Email is required — the invite is sent there","error"); return; }
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
      closeForm();
    } catch(e){ toast(e.message,"error"); } finally{ setSaving(false); }
  };

  const resend = async e => {
    setResending(e.uid);
    try{ await api.resendInvite(e.uid); toast(`Invite resent to ${e.email}`); }
    catch(err){ toast(err.message,"error"); }
    finally{ setResending(null); }
  };

  // Find role color for a role name
  const roleColor = name => roles.find(r=>r.name===name)?.color || G.caramel;
  // Find skill color
  const skillColor = name => skills.find(s=>s.name===name)?.color || G.muted;

  if (showRoster) return <RosterPage user={user} toast={toast} onBack={()=>setShowRoster(false)} />;
  if (showRoles)  return <RolesPage roles={roles} skills={skills} setRoles={setRoles} setSkills={setSkills} createSkill={createSkill} toast={toast} onBack={()=>setShowRoles(false)} />;

  const H = "h-11 px-4 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider";

  return (
    <Page title={tl("Staff")} actions={<>
      {selected.length>0&&<Btn variant="danger" size="sm" onClick={()=>setConfirmDel(true)}><Trash2Icon/>Delete ({selected.length})</Btn>}
      <Btn variant="secondary" size="sm" onClick={()=>setShowRoster(true)}><CalendarDaysIcon/>Roster</Btn>
      <Btn variant="secondary" size="sm" onClick={()=>setShowRoles(true)}><TagsIcon/>Roles & Skills</Btn>
      <Btn size="sm" onClick={openNew}><PlusIcon/>Employee</Btn>
    </>}>
      {/* Owner self-skills — so the owner can be assigned to process steps */}
      <OwnerSkillsPanel user={user} skills={skills} createSkill={createSkill} toast={toast}/>

      {/* Form */}
      {(showNew||editEmp)&&(
        <Card className="mb-6" style={{ animation:"fadeIn 0.2s ease" }}>
          <CardHeader>
            <CardTitle className="font-heading text-lg">{editEmp?`${editEmp.first_name} ${editEmp.last_name}`:"New employee"}</CardTitle>
            <CardAction><Button variant="ghost" size="icon-sm" aria-label="Close" onClick={closeForm}><XIcon/></Button></CardAction>
          </CardHeader>
          <CardPanel className="flex flex-col gap-5">
            {linkedUser&&(
              <Alert variant="success">
                <CircleCheckIcon/>
                <AlertTitle>Linked to {linkedUser.first_name} {linkedUser.last_name}</AlertTitle>
                <AlertDescription>Personal fields are read-only. Uncheck “Has Tanelu account” to enter a different person.</AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="First name" value={form.first_name} onChange={v=>setForm(p=>({...p,first_name:v}))} required disabled={!!linkedUser}/>
              <Input label="Last name"  value={form.last_name}  onChange={v=>setForm(p=>({...p,last_name:v}))}  required disabled={!!linkedUser}/>
              <Input label="Email" value={form.email} onChange={v=>setForm(p=>({...p,email:v}))} type="email" onBlur={handleEmailBlur} disabled={!!linkedUser} required
                hint={lookingUp?"Looking up…":undefined}/>
              <Input label="Phone" value={form.phone} onChange={v=>setForm(p=>({...p,phone:v}))} disabled={!!linkedUser}/>
              <Input label="Street address" value={form.street_address} onChange={v=>setForm(p=>({...p,street_address:v}))} disabled={!!linkedUser}/>
              <Input label="City" value={form.city} onChange={v=>setForm(p=>({...p,city:v}))} disabled={!!linkedUser}/>
              <Input label="ZIP"  value={form.zip}  onChange={v=>setForm(p=>({...p,zip:v}))}  disabled={!!linkedUser}/>
              <div className="flex items-end pb-2">
                <Label className="cursor-pointer font-normal">
                  <Checkbox checked={!!form.is_employee} onCheckedChange={v=>handleIsEmployeeToggle(!!v)}/>
                  Has Tanelu account
                </Label>
              </div>
            </div>
            <FieldBlock label="Roles">
              <SkillCombo
                allSkills={roles.map(r=>({...r,skid:r.rid}))}
                selected={formRoles.map(r=>({...r,skid:r.rid}))}
                onChange={sel=>handleRolesChange(sel.map(s=>({...s,rid:s.rid||s.skid})))}
                onClickPill={r=>setEditRole(roles.find(x=>x.rid===(r.rid||r.skid)))}
                pillColor={null}
                placeholder="Type to search roles…"
              />
            </FieldBlock>
            <FieldBlock label="Skills" hint={roleSkillIds.length>0?"Skills from assigned roles are shown automatically and excluded from manual selection.":undefined}>
              <SkillCombo
                allSkills={skills}
                selected={formSkills}
                excluded={roleSkillIds}
                onChange={setFormSkills}
                onCreateSkill={createSkill}
                onClickPill={s=>setEditSkill(s)}
              />
            </FieldBlock>
          </CardPanel>
          <CardFooter className="justify-end gap-2 border-t border-border pt-4">
            <Btn variant="ghost" onClick={closeForm}>Cancel</Btn>
            <Btn onClick={saveEmployee} loading={saving}>Save</Btn>
          </CardFooter>
        </Card>
      )}

      {/* Table */}
      {loading?<Spinner/>:employees.length===0?(
        <Empty className="rounded-2xl border border-border border-dashed bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon"><UsersIcon/></EmptyMedia>
            <EmptyTitle>No employees yet</EmptyTitle>
            <EmptyDescription>Add the people who work in your kitchen to assign roles, skills and shifts.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent><Btn size="sm" onClick={openNew}><PlusIcon/>Employee</Btn></EmptyContent>
        </Empty>
      ):(
        <TableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 ps-4"><Checkbox aria-label="Select all" checked={allSel} indeterminate={someSel} onCheckedChange={()=>setSelected(allSel?[]:employees.map(e=>e.uid))}/></TableHead>
                <TableHead className={`${H} w-12 max-sm:hidden`}>#</TableHead>
                <TableHead className={H}>Name</TableHead>
                <TableHead className={H}>Role(s)</TableHead>
                <TableHead className={`${H} max-md:hidden`}>Skill(s)</TableHead>
                <TableHead className={`${H} text-end`}>Account</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map(e=>(
                <TableRow key={e.uid} data-state={selected.includes(e.uid)?"selected":undefined}>
                  <TableCell className="ps-4"><Checkbox aria-label={`Select ${e.first_name}`} checked={selected.includes(e.uid)} onCheckedChange={()=>toggleSel(e.uid)}/></TableCell>
                  <TableCell className={`${CELL} font-mono text-muted-foreground text-xs tabular-nums max-sm:hidden`}>{e.employee_seq}</TableCell>
                  <TableCell className={CELL}>
                    <button type="button" data-slot="row-link" onClick={()=>openEdit(e)} className="text-start font-semibold underline decoration-dotted underline-offset-3 hover:decoration-solid">{`${e.first_name||""} ${e.last_name||""}`.trim()||<span className="font-normal text-muted-foreground italic">No name</span>}</button>
                    {e.email&&<div className="truncate text-muted-foreground text-xs">{e.email}</div>}
                  </TableCell>
                  <TableCell className={CELL}>
                    <div className="flex flex-wrap gap-1">
                      {(e.roles||[]).map(r=><SkillPill key={r} name={r} color={roleColor(r)} onClick={()=>setEditRole(roles.find(x=>x.name===r))}/>)}
                      {!(e.roles||[]).length&&<span className="text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                  <TableCell className={`${CELL} max-md:hidden`}>
                    <div className="flex flex-wrap gap-1">
                      {(e.skills||[]).map(s=><SkillPill key={s} name={s} color={skillColor(s)} onClick={()=>setEditSkill(skills.find(x=>x.name===s))}/>)}
                      {!(e.skills||[]).length&&<span className="text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                  <TableCell className={`${CELL} whitespace-nowrap text-end`}>
                    {e.email && !e.email_verified && (
                      <Button variant="outline" size="xs" loading={resending===e.uid} onClick={()=>resend(e)}><MailIcon/>Resend invite</Button>
                    )}
                    {e.email_verified && <CBadge variant="success"><CheckIcon/>Active</CBadge>}
                    {!e.email && <span className="text-muted-foreground text-xs">No email</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableShell>
      )}

      <Dialog open={confirmDel} title={`Delete ${selected.length} employee(s)?`} onConfirm={doDelete} onCancel={()=>setConfirmDel(false)}>
        This cannot be undone.
      </Dialog>

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
// Shows how many employees have a given skill — fetched lazily
function SkillUsageCount({ skid }) {
  const [count, setCount] = useState(null);
  useEffect(()=>{
    fetch(`/api/skills/${skid}/usage`, {
      headers:{ Authorization:`Bearer ${localStorage.getItem("token")}` }
    }).then(r=>r.json()).then(d=>setCount(d.employee_count??0)).catch(()=>setCount(0));
  },[skid]);
  if (count===null) return <span className="text-muted-foreground text-xs">…</span>;
  return (
    <span className={count>0?"text-sm":"text-muted-foreground text-xs italic"}>
      {count===0?"None":`${count} employee${count!==1?"s":""}`}
    </span>
  );
}

function RolesPage({ roles, skills, setRoles, setSkills, createSkill, toast, onBack }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
  const [selected,   setSelected]   = useState([]);
  const [saving,     setSaving]     = useState(null); // rid being saved
  const [localRoles, setLocalRoles] = useState(roles.map(r=>({...r,_skills:r.skills||[],_name:r.name})));
  const [deleting,   setDeleting]   = useState({}); // skid → true while deleting
  const [newRole,    setNewRole]    = useState(null); // name while the "+ Role" dialog is open
  const [creating,   setCreating]   = useState(false);
  const [dialog,     setDialog]     = useState(null); // {kind:"roles"} | {kind:"skill",skid,name}
  useEffect(()=>setLocalRoles(roles.map(r=>({...r,_skills:r.skills||[],_name:r.name}))),[roles]);

  const toggleSel = rid => setSelected(p=>p.includes(rid)?p.filter(x=>x!==rid):[...p,rid]);
  const allSel  = localRoles.length>0 && selected.length===localRoles.length;
  const someSel = selected.length>0 && !allSel;

  const addRole = async () => {
    const name = newRole?.trim();
    if (!name) return;
    setCreating(true);
    try { const r = await api.createRole({name,skill_ids:[]}); setRoles(p=>[...p,r].sort((a,b)=>a.name.localeCompare(b.name))); setNewRole(null); toast(`"${r.name}" added`); }
    catch(e){ toast(e.message,"error"); }
    finally{ setCreating(false); }
  };

  const deleteSelected = async () => {
    setDialog(null);
    try { await api.deleteRoles(selected); setRoles(p=>p.filter(r=>!selected.includes(r.rid))); setSelected([]); toast("Deleted"); }
    catch(e){ toast(e.message,"error"); }
  };

  const saveRole = async local => {
    setSaving(local.rid);
    try {
      const updated = await api.updateRole(local.rid, { name:local._name, skill_ids:local._skills.map(s=>s.skid) });
      setRoles(p=>p.map(r=>r.rid===updated.rid?updated:r));
      toast(`"${updated.name}" saved`);
    } catch(e){ toast(e.message,"error"); } finally{ setSaving(null); }
  };

  const updateLocal = (rid,patch) => setLocalRoles(p=>p.map(r=>r.rid===rid?{...r,...patch}:r));
  const isDirty = r => r._name!==r.name || r._skills.map(s=>s.skid).join()!==(r.skills||[]).map(s=>s.skid).join();

  const deleteSkill = async (skid, name) => {
    setDialog(null);
    setDeleting(p=>({...p,[skid]:true}));
    try {
      await api.deleteSkills([skid]);
      setSkills(p=>p.filter(s=>s.skid!==skid));
      // Remove from local roles too
      setLocalRoles(p=>p.map(r=>({...r,_skills:r._skills.filter(s=>s.skid!==skid)})));
      toast(`"${name}" deleted`);
    } catch(e){
      // Parse blocked error
      if (e.message?.includes('in use') || e.status===409) {
        toast(e.message||`"${name}" is in use and cannot be deleted`, "error");
      } else {
        toast(e.message,"error");
      }
    } finally{ setDeleting(p=>({...p,[skid]:false})); }
  };

  // Build usage map: which roles use each skill
  const skillRoles = {};
  roles.forEach(r=>(r.skills||[]).forEach(s=>{ (skillRoles[s.skid]=skillRoles[s.skid]||[]).push({ name:r.name, color:r.color }); }));

  const H = "h-11 px-4 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider";

  return (
    <Page title={tl("Roles & Skills")} actions={<>
      <Btn variant="ghost" size="sm" onClick={onBack}><ArrowLeftIcon/>Staff</Btn>
      {selected.length>0&&<Btn variant="danger" size="sm" onClick={()=>setDialog({kind:"roles"})}><Trash2Icon/>Delete ({selected.length})</Btn>}
      <Btn size="sm" onClick={()=>setNewRole("")}><PlusIcon/>Role</Btn>
    </>}>
      {/* Roles table */}
      <TableShell className="mb-8">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 ps-4"><Checkbox aria-label="Select all" checked={allSel} indeterminate={someSel} onCheckedChange={()=>setSelected(allSel?[]:localRoles.map(r=>r.rid))}/></TableHead>
              <TableHead className={`${H} w-[30%]`}>Role</TableHead>
              <TableHead className={H}>Skills</TableHead>
              <TableHead className="w-24"/>
            </TableRow>
          </TableHeader>
          <TableBody>
            {localRoles.length===0?(
              <TableRow><TableCell colSpan={4} className="py-12 text-center text-muted-foreground">No roles yet. Click “+ Role”.</TableCell></TableRow>
            ):localRoles.map(r=>(
              <TableRow key={r.rid} className="align-top" data-state={selected.includes(r.rid)?"selected":undefined}>
                <TableCell className="ps-4 pt-4"><Checkbox aria-label={`Select ${r.name}`} checked={selected.includes(r.rid)} onCheckedChange={()=>toggleSel(r.rid)}/></TableCell>
                <TableCell className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background:r.color }}/>
                    <CInput aria-label="Role name" value={r._name} onChange={e=>updateLocal(r.rid,{_name:e.target.value})}
                      onBlur={()=>r._name!==r.name&&saveRole(r)}
                      className="font-semibold"/>
                  </div>
                </TableCell>
                <TableCell className="min-w-64 whitespace-normal px-4 py-3">
                  <SkillCombo allSkills={skills} selected={r._skills} onChange={sel=>updateLocal(r.rid,{_skills:sel})} onCreateSkill={createSkill} pillColor={r.color}/>
                </TableCell>
                <TableCell className="px-4 py-3 text-end">
                  <Btn size="sm" variant={isDirty(r)?"primary":"secondary"} onClick={()=>saveRole(r)} loading={saving===r.rid}>Save</Btn>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableShell>

      {/* Skills list with delete */}
      <h2 className="mb-3 font-heading font-semibold text-xl">{tl("All skills")}</h2>
      {skills.length===0?(
        <Empty className="rounded-2xl border border-border border-dashed bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon"><TagsIcon/></EmptyMedia>
            <EmptyTitle>No skills yet</EmptyTitle>
            <EmptyDescription>Add them via the Skills column in the Roles table above.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ):(
        <TableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={H}>Skill</TableHead>
                <TableHead className={H}>Duration</TableHead>
                <TableHead className={`${H} max-sm:hidden`}>Used in roles</TableHead>
                <TableHead className={H}>Used by employees</TableHead>
                <TableHead className="w-16"/>
              </TableRow>
            </TableHeader>
            <TableBody>
              {skills.map(s=>{
                const col      = s.color||G.muted;
                const inRoles  = skillRoles[s.skid]||[];
                const durStr   = s.duration ? `${intDur(s.duration)} ${durAbbr(s.duration_unit)}` : "—";
                return (
                  <TableRow key={s.skid}>
                    <TableCell className={CELL}>
                      <span className={`flex items-center gap-2 font-semibold ${SKILL_INK}`} style={{ "--ink":col }}>
                        <span className="size-2 shrink-0 rounded-full" style={{ background:col }}/>
                        {s.name}
                      </span>
                    </TableCell>
                    <TableCell className={`${CELL} font-mono text-muted-foreground text-xs tabular-nums`}>{durStr}</TableCell>
                    <TableCell className={`${CELL} max-sm:hidden`}>
                      {inRoles.length===0
                        ? <span className="text-muted-foreground text-xs italic">None</span>
                        : <div className="flex flex-wrap gap-1">{inRoles.map(r=><SkillPill key={r.name} name={r.name} color={r.color} size="sm"/>)}</div>}
                    </TableCell>
                    <TableCell className={CELL}><SkillUsageCount skid={s.skid}/></TableCell>
                    <TableCell className="px-4 py-2 text-end">
                      <Button variant="ghost" size="icon-sm" aria-label={`Delete ${s.name}`} title="Delete skill"
                        loading={!!deleting[s.skid]} onClick={()=>setDialog({kind:"skill",skid:s.skid,name:s.name})}
                        className="text-muted-foreground hover:text-destructive-foreground">
                        <Trash2Icon/>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableShell>
      )}

      {newRole!==null&&(
        <Modal onClose={()=>setNewRole(null)} title="New role" className="max-w-sm"
          footer={<><span/><div className="flex gap-2"><Btn variant="ghost" onClick={()=>setNewRole(null)}>Cancel</Btn><Btn onClick={addRole} loading={creating} disabled={!newRole.trim()}>Add role</Btn></div></>}>
          <form onSubmit={e=>{ e.preventDefault(); addRole(); }}>
            <Input label="Role name" value={newRole} onChange={setNewRole} placeholder="e.g. Pastry chef" required/>
          </form>
        </Modal>
      )}
      <Dialog open={dialog?.kind==="roles"} title={`Delete ${selected.length} role(s)?`} onConfirm={deleteSelected} onCancel={()=>setDialog(null)}>
        This cannot be undone.
      </Dialog>
      <Dialog open={dialog?.kind==="skill"} title={`Delete skill “${dialog?.name||""}”?`} onConfirm={()=>deleteSkill(dialog.skid, dialog.name)} onCancel={()=>setDialog(null)}>
        This will also remove it from all roles.
      </Dialog>
    </Page>
  );
}

// ─── RUN / STEP STATUS ────────────────────────────────────────────────────────
const RUN_STATUS = {
  pending:     { label:"Pending",     cls:"bg-secondary text-muted-foreground" },
  in_progress: { label:"In progress", cls:"bg-brand/16 text-accent-foreground" },
  on_hold:     { label:"On hold",     cls:"bg-warning/16 text-warning-foreground" },
  completed:   { label:"Completed",   cls:"bg-success/16 text-success-foreground" },
  skipped:     { label:"Skipped",     cls:"bg-secondary text-muted-foreground line-through" },
  cancelled:   { label:"Cancelled",   cls:"bg-destructive/12 text-destructive-foreground" },
};
function RunStatusBadge({ status, label, className="" }) {
  const s = RUN_STATUS[status] || { label:String(status||"").replace("_"," "), cls:"bg-secondary text-muted-foreground" };
  return <CBadge variant="outline" className={`border-transparent font-semibold ${s.cls} ${className}`}>{label||s.label}</CBadge>;
}

// ─── RUN DETAIL SIDEBAR ───────────────────────────────────────────────────────
function RunDetailSidebar({ run, user, onClose, onRunUpdated, toast }) {
  const [stepAction, setStepAction] = useState(null); // {psrid, action}
  const [skipReason, setSkipReason] = useState("");
  const [showSkipFor, setShowSkipFor] = useState(null); // psrid
  const [completeFor, setCompleteFor] = useState(null);

  if (!run) return null;

  const steps = run.steps || [];
  const STEP_DOT = {
    pending:"bg-muted-foreground/15 text-muted-foreground", in_progress:"bg-brand text-brand-foreground", on_hold:"bg-warning/20 text-warning-foreground",
    completed:"bg-success/20 text-success-foreground", skipped:"bg-secondary text-muted-foreground",
  };

  const fmtElapsed = secs => {
    if (!secs) return "—";
    const h = Math.floor(secs/3600), m = Math.floor((secs%3600)/60), s = secs%60;
    if (h>0) return `${h}h ${m}m`;
    if (m>0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  // Determine which actions a user can take on a step
  const canAct = step => {
    if (run.status === "cancelled" || run.status === "completed") return false;
    if (user?.is_manufacturer) return true; // Restaurant can manage any step
    // Employee: only steps assigned to them
    return step.uid === user?.uid;
  };

  const doStepAction = async (psrid, action, extra) => {
    if (action==="complete") {
      const st = (run.steps||[]).find(x=>x.psrid===psrid);
      if (st && isLastStep(run, st) && !extra?.confirmed) { setCompleteFor(psrid); return; }
    }
    setStepAction({psrid, action});
    try {
      let updated;
      if (action === "start")    updated = await api.startStep(run.prid, psrid);
      if (action === "pause")    updated = await api.pauseStep(run.prid, psrid);
      if (action === "resume")   updated = await api.resumeStep(run.prid, psrid);
      if (action === "complete") updated = await api.completeStep(run.prid, psrid);
      if (action === "skip")     updated = await api.skipStep(run.prid, psrid, extra);
      onRunUpdated(updated);
    } catch(e){ toast(e.message, "error"); } finally { setStepAction(null); }
  };

  const handleSkip = psrid => {
    doStepAction(psrid, "skip", { delay_reason: skipReason||undefined });
    setShowSkipFor(null); setSkipReason("");
  };

  const done = steps.filter(s=>s.status==="completed").length;

  return (
    <Sheet open onOpenChange={o=>{ if(!o) onClose(); }}>
      <SheetPopup side="right" showCloseButton={false} className="w-[min(440px,100vw)]">
        <SheetHeader className="flex-row items-start justify-between gap-3 border-border border-b">
          <div className="flex min-w-0 flex-col gap-2">
            <SheetTitle className="font-heading text-xl">{run.process_name}</SheetTitle>
            <div className="flex flex-wrap items-center gap-2">
              <RunStatusBadge status={run.status}/>
              {run.started_at&&(
                <span className="text-muted-foreground text-xs">
                  Started {new Date(run.started_at).toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                </span>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}><XIcon/></Button>
        </SheetHeader>

        <SheetPanel className="flex flex-col gap-3">
          {completeFor&&<StopRunDialog run={run} mode="complete" psrid={completeFor} toast={toast} onClose={()=>setCompleteFor(null)}
            onStopped={u=>{ setCompleteFor(null); onRunUpdated(u); }}/>}
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">Steps</span>
            <span className="text-muted-foreground text-xs tabular-nums">{done}/{steps.length} done</span>
          </div>
          {steps.length>0&&(
            <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={done} aria-valuemax={steps.length}>
              <div className="h-full rounded-full bg-success transition-all" style={{ width:`${(done/steps.length)*100}%` }}/>
            </div>
          )}
          <ol className="flex list-none flex-col gap-2.5">
            {steps.map((step,i)=>{
              const busy = stepAction?.psrid===step.psrid;
              const actable = canAct(step);
              const isSkipOpen = showSkipFor===step.psrid;
              const open = actable && !["completed","skipped"].includes(step.status);

              return (
                <li key={step.psrid} data-slot="run-step" className={`rounded-xl border border-border bg-card p-3 shadow-xs/5 ${step.status==="skipped"?"opacity-60":""} ${step.status==="in_progress"?"border-brand/50":""}`}>
                  {/* Row 1: seq + skill name + status badge */}
                  <div className="flex items-center gap-2.5">
                    <span className={`flex size-6 shrink-0 items-center justify-center rounded-full font-bold text-[11px] ${STEP_DOT[step.status]||STEP_DOT.pending}`}>
                      {step.status==="completed"?<CheckIcon className="size-3.5"/>:i+1}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-sm">{step.skill_name}</span>
                    <RunStatusBadge status={step.status} label={step.status==="completed"?"Done":undefined}/>
                  </div>

                  {/* Row 2: assignee + duration + elapsed */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 ps-8.5 text-muted-foreground text-xs">
                    {(step.first_name||step.last_name) && (
                      <span className="inline-flex items-center gap-1"><CircleUserIcon className="size-3.5"/>{[step.first_name,step.last_name].filter(Boolean).join(" ")}</span>
                    )}
                    {step.duration && (
                      <span className="inline-flex items-center gap-1"><TimerIcon className="size-3.5"/>{intDur(step.duration)} {step.duration_unit||"min"}</span>
                    )}
                    {step.elapsed_secs>0 && (
                      <span className="font-semibold text-accent-foreground">Active: {fmtElapsed(step.elapsed_secs)}</span>
                    )}
                    {step.recur_every && (
                      <span className="inline-flex items-center gap-1 font-semibold text-accent-foreground">
                        <RepeatIcon className="size-3.5"/>every {step.recur_every} {step.recur_unit||"hours"}
                        {step.recur_index > 0 ? ` · #${step.recur_index + 1}` : ""}
                      </span>
                    )}
                    {step.is_delayed && (
                      <span className="inline-flex items-center gap-1 font-semibold text-destructive-foreground"><TriangleAlertIcon className="size-3.5"/>Delayed</span>
                    )}
                    {step.delay_reason && (
                      <span className="italic">“{step.delay_reason}”</span>
                    )}
                  </div>

                  {/* Action buttons */}
                  {open && !isSkipOpen && (
                    <div className="mt-3 flex flex-wrap gap-1.5 ps-8.5">
                      {step.status==="pending" && (
                        <Btn size="sm" onClick={()=>doStepAction(step.psrid,"start")} loading={busy}><PlayIcon/>Start</Btn>
                      )}
                      {step.status==="in_progress" && (<>
                        <Btn size="sm" variant="secondary" onClick={()=>doStepAction(step.psrid,"pause")} loading={busy}><PauseIcon/>Pause</Btn>
                        <Btn size="sm" onClick={()=>doStepAction(step.psrid,"complete")} loading={busy}><CheckIcon/>Complete</Btn>
                      </>)}
                      {step.status==="on_hold" && (<>
                        <Btn size="sm" variant="secondary" onClick={()=>doStepAction(step.psrid,"resume")} loading={busy}><PlayIcon/>Resume</Btn>
                        <Btn size="sm" onClick={()=>doStepAction(step.psrid,"complete")} loading={busy}><CheckIcon/>Complete</Btn>
                      </>)}
                      <Btn size="sm" variant="ghost" onClick={()=>setShowSkipFor(step.psrid)}><SkipForwardIcon/>Skip</Btn>
                    </div>
                  )}

                  {/* Skip reason form */}
                  {isSkipOpen && (
                    <form className="mt-3 flex flex-col gap-2 ps-8.5" onSubmit={e=>{ e.preventDefault(); handleSkip(step.psrid); }}>
                      <CInput value={skipReason} onChange={e=>setSkipReason(e.target.value)} autoFocus
                        placeholder="Reason for skipping (optional)" aria-label="Reason for skipping"/>
                      <div className="flex gap-1.5">
                        <Button type="submit" size="sm" variant="destructive" loading={busy}><SkipForwardIcon/>Skip step</Button>
                        <Btn size="sm" variant="ghost" onClick={()=>{setShowSkipFor(null);setSkipReason("");}}>Cancel</Btn>
                      </div>
                    </form>
                  )}
                </li>
              );
            })}
          </ol>
        </SheetPanel>
      </SheetPopup>
    </Sheet>
  );
}

// ─── EXECUTIONS CALENDAR ──────────────────────────────────────────────────────
function ExecutionsCalendar({ runs, onAction, onOpenDetail }) {
  if (!runs || !runs.length) return null;

  const RUN_COLS = { in_progress:G.caramel, on_hold:"#eab308", completed:G.green, cancelled:G.red };
  const labelW = 180, W = 920, chartW = W - labelW - 16;
  const barH = 36, gap = 14, rowH = barH + gap;
  const svgH = runs.length * rowH + 40;

  // Anchor = earliest started_at rounded down to the hour (UTC)
  const validRuns = runs.filter(r => r.started_at);
  if (!validRuns.length) return null;
  const anchorMs = validRuns.reduce((min, r) => {
    const t = new Date(r.started_at).getTime();
    return t < min ? t : min;
  }, new Date(validRuns[0].started_at).getTime());
  const anchorHour = Math.floor(anchorMs / 3600000) * 3600000; // round down to hour in UTC

  const minsFromAnchor = iso => {
    if (!iso) return 0;
    return Math.max(0, (new Date(iso).getTime() - anchorHour) / 60000);
  };

  // Auto-size window: find the latest end time across all runs, pad by 30 min, min 60 min
  const latestMins = validRuns.reduce((max, r) => {
    const endMs = r.completed_at ? new Date(r.completed_at).getTime()
      : r.status === "in_progress" ? Date.now()
      : new Date(r.started_at).getTime() + 30 * 60000;
    const m = (endMs - anchorHour) / 60000;
    return m > max ? m : max;
  }, 60);
  const windowMins = Math.ceil((latestMins + 30) / 60) * 60; // round up to whole hour + 30 min buffer
  const tickInterval = windowMins <= 240 ? 30 : windowMins <= 720 ? 60 : 120;

  const minToX = m => Math.max(0, (m / windowMins) * chartW);
  const hm = d => new Date(d).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
  const anchorLabel = hm(anchorHour);

  return (
    <Card className="mb-4">
      <CardPanel className="flex flex-col gap-3 pt-5">
        <p className="text-muted-foreground text-xs">Timeline from {anchorLabel}</p>
        <div className="overflow-x-auto">
          <svg width={W} height={svgH} className="text-foreground">
            {Array.from({length: Math.ceil(windowMins / tickInterval) + 1}, (_,i) => i * tickInterval).map(m=>(
              <g key={m}>
                <line x1={labelW+minToX(m)} y1={0} x2={labelW+minToX(m)} y2={svgH}
                  stroke="var(--border)" strokeWidth={m%60===0?1:0.5}/>
                <text x={labelW+minToX(m)+3} y={12} fontSize={9} fill="var(--muted-foreground)">{hm(anchorHour + m*60000)}</text>
              </g>
            ))}
            {runs.map((run,i)=>{
              if (!run.started_at) return null;
              const y   = 20 + i*rowH;
              const col = RUN_COLS[run.status] || G.muted;
              const startM = minsFromAnchor(run.started_at);
              const endM   = run.completed_at ? minsFromAnchor(run.completed_at)
                : run.status==="in_progress" ? minsFromAnchor(new Date().toISOString())
                : startM + 30;
              const x1 = labelW + minToX(startM);
              const w  = Math.max(6, minToX(endM) - minToX(startM));
              return (
                <g key={run.prid} className={onOpenDetail?"cursor-pointer":""} onClick={()=>onOpenDetail&&onOpenDetail(run)}>
                  <text x={labelW-8} y={y+barH/2} fontSize={12} fontWeight="600" fill="currentColor"
                    textAnchor="end" dominantBaseline="middle">
                    {(run.process_name||"").slice(0,22)}
                  </text>
                  <rect x={x1} y={y} width={w} height={barH}
                    fill={`${col}28`} stroke={col} strokeWidth={1.5}
                    strokeDasharray={run.status==="on_hold"?"6,3":"none"} rx={6}/>
                  {w>55&&<text x={x1+7} y={y+15} fontSize={10} fill="currentColor" fontWeight="600">
                    {RUN_STATUS[run.status]?.label||run.status.replace("_"," ")}
                  </text>}
                  {w>80&&<text x={x1+7} y={y+29} fontSize={9} fill="var(--muted-foreground)">
                    {hm(run.started_at)}{run.completed_at&&` → ${hm(run.completed_at)}`}
                  </text>}
                </g>
              );
            })}
          </svg>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-4">
          {Object.entries(RUN_COLS).map(([s,c])=>(
            <span key={s} className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <span className="inline-block size-3 rounded-[3px] border-[1.5px]" style={{ background:`${c}30`, borderColor:c }}/>
              {RUN_STATUS[s]?.label||s}
            </span>
          ))}
        </div>
        {/* Run rows */}
        <div className="mt-1 flex flex-col divide-y divide-border rounded-xl border border-border">
          {runs.map(run=>(
            <div key={run.prid} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
              <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                <button type="button" data-slot="row-link" onClick={()=>onOpenDetail&&onOpenDetail(run)}
                  className="truncate font-semibold text-sm underline decoration-dotted underline-offset-3 hover:decoration-solid">
                  {run.process_name}
                </button>
                <RunStatusBadge status={run.status}/>
                {run.started_at&&<span className="text-muted-foreground text-xs">
                  {new Date(run.started_at).toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                </span>}
              </div>
              <div className="flex gap-1">
                {run.status==="in_progress"&&<>
                  <Button size="icon-sm" variant="outline" aria-label="Pause" title="Pause" onClick={()=>onAction(run.prid,"pause")}><PauseIcon/></Button>
                  <Button size="icon-sm" variant="destructive-outline" aria-label="Stop" title="Stop" onClick={()=>onAction(run.prid,"stop")}><SquareIcon/></Button>
                </>}
                {run.status==="on_hold"&&<>
                  <Button size="icon-sm" variant="outline" aria-label="Resume" title="Resume" onClick={()=>onAction(run.prid,"resume")}><PlayIcon/></Button>
                  <Button size="icon-sm" variant="destructive-outline" aria-label="Stop" title="Stop" onClick={()=>onAction(run.prid,"stop")}><SquareIcon/></Button>
                </>}
              </div>
            </div>
          ))}
        </div>
      </CardPanel>
    </Card>
  );
}

// ─── SKILL COMBO WITH PROCESSES ───────────────────────────────────────────────
// Variant of SkillCombo that shows processes in bold and doesn't use pills (add-only)
function SkillComboWithProcesses({ allItems, onAdd, onCreateSkill }) {
  const [input, setInput] = useState("");
  const [open, setOpen]   = useState(false);
  const [hiSel, setHi]    = useState(null);
  const [rect, setRect]   = useState(null);
  const ref = useRef(null);

  const filtered = allItems.filter(s=>s.name.toLowerCase().includes(input.toLowerCase()));
  const canCreate = onCreateSkill && input.trim() &&
    !allItems.find(s=>s.name.toLowerCase()===input.trim().toLowerCase() && !s._isProcess && !s._isRole);
  const options = [...(canCreate?[{ _create:true }]:[]), ...filtered];
  // Enter picks the first matching item (as before); "Add skill" only when nothing matches
  const hi = hiSel ?? (canCreate && filtered.length ? 1 : 0);

  useEffect(()=>{
    if (!open) return;
    const upd = () => { const r = ref.current?.getBoundingClientRect(); if (r) setRect({ bottom:r.bottom, left:r.left, width:r.width }); };
    upd();
    window.addEventListener("scroll", upd, true); window.addEventListener("resize", upd);
    return () => { window.removeEventListener("scroll", upd, true); window.removeEventListener("resize", upd); };
  },[open]);

  const select = item => { onAdd(item); setInput(""); setOpen(false); setHi(null); };
  const pick = async o => {
    if (o._create) { const s = await onCreateSkill(input.trim()); if (s) select(s); }
    else select(o);
  };

  return (
    <div className="relative w-full" ref={ref}>
      <CInput value={input} onChange={e=>{ setInput(e.target.value); setOpen(true); setHi(null); }} size="lg"
        onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),150)}
        onKeyDown={e=>{
          if (e.key==="ArrowDown") { e.preventDefault(); setOpen(true); setHi(Math.min(hi+1, options.length-1)); }
          if (e.key==="ArrowUp")   { e.preventDefault(); setHi(Math.max(hi-1, 0)); }
          if (e.key==="Escape" && open && options.length) { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation?.(); setOpen(false); }
          if (e.key==="Enter" && options.length) { e.preventDefault(); const o = options[Math.min(hi, options.length-1)]; if (o) pick(o); }
        }}
        placeholder="Type to search processes or skills…" aria-label="Add a step"/>
      {open&&options.length>0&&rect&&createPortal(
        <div data-slot="skill-combo-popup" role="listbox"
          style={{ position:"fixed", top:rect.bottom+4, left:rect.left, width:rect.width, zIndex:2500 }}
          className="max-h-60 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg/5">
          {options.map((item,i)=>(
            <button type="button" key={item._create?"__new":`${item._isProcess?"p":"s"}${item.skid}`} data-slot="skill-combo-item" role="option" aria-selected={i===hi}
              onMouseDown={e=>{ e.preventDefault(); pick(item); }} onMouseEnter={()=>setHi(i)}
              className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-start text-sm ${i===hi?"bg-accent text-accent-foreground":""}`}>
              {item._create
                ? <><PlusIcon className="size-4 text-brand"/><span>Add skill <span className="font-semibold">“{input.trim()}”</span></span></>
                : <>
                    {item._isProcess&&<CBadge variant="outline" size="sm" className="border-transparent bg-brand/16 font-bold text-[10px] text-accent-foreground uppercase tracking-wide">Process</CBadge>}
                    <span className={item._isProcess?"font-semibold":""}>{item.name}</span>
                  </>}
            </button>
          ))}
        </div>, document.body
      )}
    </div>
  );
}

// ── MiniGantt — per-process Gantt chart embedded in each process card (module level so its view toggle keeps state)
const procToMins = (dur,unit) => {
  if (!dur) return 0;
  if (unit==="seconds") return Number(dur)/60;
  if (unit==="hours")   return Number(dur)*60;
  return Number(dur);
};
function MiniGantt({ proc, forcedView }) {
  const skills = proc.skills || [];
  const [viewSel, setView] = useState(forcedView || null);
  if (!skills.length) return null;

  // Compute max end time in minutes (layout in minutes, then scale to pixels)
  const placed = {}; // psid → { x1Mins, x2Mins }
  let cursor = 0;
  skills.forEach(sk => {
    const durMins = Math.max(1, procToMins(sk.duration, sk.duration_unit) || 30);
    const pred = sk.dep_psid ? placed[sk.dep_psid] : null;
    let x1;
    if (!pred) {
      x1 = cursor;
    } else if (sk.dep_type === "SS") { x1 = pred.x1; }
    else if (sk.dep_type === "FF")   { x1 = pred.x2 - durMins; }
    else if (sk.dep_type === "SF")   { x1 = pred.x1 - durMins; }
    else                              { x1 = pred.x2; } // FS / default
    x1 = Math.max(0, x1);
    placed[sk.psid] = { x1, x2: x1 + durMins, durMins };
    if (!pred) cursor = x1 + durMins;
  });
  const maxMins = Object.values(placed).reduce((m, b) => Math.max(m, b.x2), 0);

  // Auto-choose view: week if > 10h (600min), day otherwise. Allow manual toggle.
  const autoView = maxMins > 600 ? "week" : "day";
  const view = viewSel || autoView;
  // Window: day = nearest hour above maxMins; week = nearest day above maxMins
  const windowMins = view === "week"
    ? Math.max(1440, Math.ceil(maxMins / 1440) * 1440)
    : Math.max(60, Math.ceil(maxMins / 60) * 60);

  const barH = 26, rowGap = 6, trackH = barH + rowGap;
  const labelW = 130, W = 700, chartW = W - labelW - 8;
  const minToX = m => Math.max(0, (m / windowMins) * chartW);
  const svgH = skills.length * trackH + 28;

  // Build pixel-placed blocks
  const blocks = {};
  skills.forEach((sk, idx) => {
    const b = placed[sk.psid];
    if (!b) return;
    blocks[sk.psid] = {
      px1: labelW + minToX(b.x1),
      px2: labelW + minToX(b.x2),
      pw:  Math.max(8, minToX(b.x2) - minToX(b.x1)),
      y:   20 + idx * trackH,
    };
  });

  // Arrows
  const arrows = [];
  skills.forEach(sk => {
    if (!sk.dep_type || !sk.dep_psid) return;
    const src = blocks[sk.dep_psid], tgt = blocks[sk.psid];
    if (!src || !tgt) return;
    const dep = sk.dep_type;
    let ax, ay, bx, by;
    if      (dep==="FS"){ ax=src.px2; ay=src.y+barH/2; bx=tgt.px1; by=tgt.y+barH/2; }
    else if (dep==="SS"){ ax=src.px1; ay=src.y+barH;   bx=tgt.px1; by=tgt.y; }
    else if (dep==="FF"){ ax=src.px2; ay=src.y+barH;   bx=tgt.px2; by=tgt.y; }
    else if (dep==="SF"){ ax=src.px1; ay=src.y+barH;   bx=tgt.px2; by=tgt.y; }
    else                { ax=src.px2; ay=src.y+barH/2; bx=tgt.px1; by=tgt.y+barH/2; }
    let d;
    if (Math.abs(ay-by) < 3) {
      d = `M${ax},${ay} L${bx},${by}`;
    } else if (dep==="FS") {
      const ex = ax + 6;
      d = `M${ax},${ay} L${ex},${ay} L${ex},${by} L${bx},${by}`;
    } else {
      const midY = (ay+by)/2;
      d = `M${ax},${ay} C${ax},${midY} ${bx},${midY} ${bx},${by}`;
    }
    arrows.push({ d, dep });
  });

  // Ticks: day view = hours, week view = days
  const tickUnit = view === "week" ? 1440 : 60;
  const ticks = Array.from({ length: Math.ceil(windowMins / tickUnit) + 1 }, (_, i) => i * tickUnit);
  const fmtTick = m => view === "week"
    ? (m === 0 ? "Start" : `Day ${m/1440 + 1}`)
    : `${String(Math.floor(m/60)).padStart(2,"0")}:00`;
  const majorTick = view === "week" ? 1440 : 120;

  return (
    <div data-slot="mini-gantt" className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs">View</span>
        <SegmentedControl className="h-7 p-0.5">
          {["day","week"].map(v=>(
            <SegmentedControlItem key={v} data-checked={view===v?"":undefined} aria-pressed={view===v} onClick={()=>setView(v)} className="h-6 px-2.5 text-xs">
              {v==="day"?"Day":"Week"}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </div>
      <div className="overflow-x-auto">
        <svg width={W} height={svgH} className="block text-muted-foreground">
          <defs>
            <marker id={`arr-${proc.procid}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <polygon points="0 0, 6 3, 0 6" fill="currentColor"/>
            </marker>
          </defs>
          {/* Day/week shading: alternate columns for week view */}
          {view==="week" && ticks.filter(m=>m>0).map(m => (
            (m/1440)%2===0 && (
              <rect key={m} x={labelW+minToX(m-1440)} y={14} width={minToX(1440)} height={svgH-14} fill="var(--muted)"/>
            )
          ))}
          {/* Grid lines */}
          {ticks.map(m => (
            <g key={m}>
              <line x1={labelW+minToX(m)} y1={14} x2={labelW+minToX(m)} y2={svgH}
                stroke="var(--border)" strokeWidth={m%majorTick===0 ? 1 : 0.4}/>
              {m%majorTick===0 && (
                <text x={labelW+minToX(m)+3} y={10} fontSize={9} fill="currentColor">{fmtTick(m)}</text>
              )}
            </g>
          ))}
          {/* Step rows */}
          {skills.map((sk, idx) => {
            const b = blocks[sk.psid];
            if (!b) return null;
            const color = sk.color || G.muted;
            return (
              <g key={sk.psid}>
                {idx%2===1&&<rect x={labelW} y={b.y} width={chartW} height={barH} fill="var(--muted)"/>}
                <text x={labelW-6} y={b.y+barH/2+1} fontSize={10} fill="currentColor" textAnchor="end" dominantBaseline="middle">
                  {sk.name.slice(0,17)}
                </text>
                <rect x={b.px1} y={b.y+2} width={b.pw} height={barH-4} fill={`${color}30`} stroke={color} strokeWidth={1.5} rx={5}/>
                {b.pw > 32 && (
                  <text x={b.px1+5} y={b.y+barH/2+1} fontSize={9} fill="var(--foreground)" fontWeight="600" dominantBaseline="middle">
                    {intDur(sk.duration)}{durAbbr(sk.duration_unit)}
                  </text>
                )}
              </g>
            );
          })}
          {/* Dependency arrows */}
          {arrows.map((a,i) => (
            <path key={i} d={a.d} fill="none" stroke="currentColor" strokeWidth="1.2"
              markerEnd={`url(#arr-${proc.procid})`} strokeLinejoin="round"/>
          ))}
        </svg>
      </div>
    </div>
  );
}

// Compact coss select for table cells; items = [{label, value}]
function MiniSelect({ value, onChange, items, disabled, className="", ...rest }) {
  const cur = value==null ? "" : String(value);
  return (
    <CSelect items={items} value={cur} onValueChange={v=>onChange(v??"")} disabled={disabled}>
      <SelectTrigger size="sm" className={`min-w-0 ${className}`} {...rest}><SelectValue/></SelectTrigger>
      <SelectPopup>{items.map(it=><SelectItem key={it.value} value={it.value} title={it.title}>{it.label}</SelectItem>)}</SelectPopup>
    </CSelect>
  );
}

// ─── PROCESSES PAGE ────────────────────────────────────────────────────────────
function ProcessesPage({ user, setPage, toast }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
  const [processes, setProcesses] = useState([]);
  const [skills,    setSkills]    = useState([]);
  const [roles,     setRoles]     = useState([]);
  const [recipes,   setRecipes]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editProc,  setEditProc]  = useState(null);
  const [formName,  setFormName]  = useState("");
  const [formSkills,setFormSkills]= useState([]);
  const [saving,    setSaving]    = useState(false);
  const [nameError, setNameError] = useState("");
  const [runs,      setRuns]      = useState([]);
  const [startDialog, setStartDialog] = useState(null);
  // startDialog shape: {proc, step:'items'|'warnings', suggestedItems, selectedItems, warnings}
  const [startSaving, setStartSaving] = useState(false);
  const [execPeriod, setExecPeriod] = useState("week"); // "day" | "week"
  const [execDate,   setExecDate]   = useState(() => new Date().toISOString().slice(0,10));
  const [selectedRun, setSelectedRun] = useState(null); // run with steps for sidebar
  const [startingId, setStartingId] = useState(null);
  const [delProc, setDelProc] = useState(null);

  const load = useCallback(async()=>{
    setLoading(true);
    try {
      const [p,s,r,rec] = await Promise.all([api.getProcesses(), api.getSkills(), api.getRoles(), api.getRecipes()]);
      setProcesses(p||[]); setSkills((s||[]).filter(x=>x.name!=="Administrator")); setRoles(r||[]); setRecipes(rec||[]);
    } catch(e){ toast(e.message,"error"); } finally{ setLoading(false); }
  },[]);
  useEffect(()=>{ load(); },[]);
  useEffect(()=>{
    if (user?.is_manufacturer || user?.employer_uid) {
      api.getProcessRuns().then(setRuns).catch(()=>{});
    }
  },[]);

  const STATUS_COLORS_RUN = { in_progress:G.caramel, on_hold:"#eab308", completed:G.green, cancelled:G.red };

  const handleRunProcess = async (proc) => {
    // Step 1: fetch suggested items and show item selection dialog
    setStartSaving(true);
    try {
      const suggested = await api.getSuggestedItems(proc.procid);
      setStartDialog({ proc, step:'items', suggestedItems:suggested,
        selectedItems: suggested.map(s=>({rid:s.rid, name:s.name, qty:s.volume||1, units:s.units, equipment_name:s.equipment_name})),
        warnings:[] });
    } catch(e){ toast(e.message,"error"); }
    finally{ setStartSaving(false); }
  };

  const handleStartConfirm = async (ignoreAll=false) => {
    const { proc, selectedItems } = startDialog;
    setStartSaving(true);
    try {
      const result = await api.startProcess(proc.procid, {
        confirmed: ignoreAll,
        ignore_hours: ignoreAll,
        run_items: selectedItems.map(s=>({rid:s.rid, qty:Number(s.qty)||1})),
      });
      if (result.requires_confirmation) {
        setStartDialog(d=>({...d, step:'warnings', warnings:result.warnings}));
        return;
      }
      setRuns(p=>[result,...p]);
      toast(`"${proc.name}" started`);
      setStartDialog(null);
    } catch(e){ toast(e.message,"error"); }
    finally{ setStartSaving(false); }
  };

  const [stopRun, setStopRun] = useState(null);
  const handleRunAction = async (prid, action) => {
    if (action==='stop') { setStopRun(runs.find(r=>r.prid===prid)||{prid}); return; }
    try {
      const fns = { pause:api.pauseRun, resume:api.resumeRun, stop:api.stopRun };
      const updated = await fns[action](prid);
      setRuns(p=>p.map(r=>r.prid===updated.prid?updated:r));
      // Keep sidebar in sync
      if (selectedRun?.prid===updated.prid) setSelectedRun(updated);
    } catch(e){ toast(e.message,"error"); }
  };

  const openRunDetail = async run => {
    try {
      const full = await api.getProcessRun(run.prid);
      setSelectedRun(full);
    } catch(e){ toast(e.message,"error"); }
  };

  const handleStepUpdated = updated => {
    setRuns(p=>p.map(r=>r.prid===updated.prid?{...r, ...updated}:r));
    setSelectedRun(updated);
  };


  const createSkill = async name => {
    try { const s=await api.createSkill({name}); setSkills(p=>[...p,s].sort((a,b)=>a.name.localeCompare(b.name))); return s; }
    catch(e){ toast(e.message,"error"); return null; }
  };

  const openNew = () => { setEditProc(null); setFormName(""); setFormSkills([]); setNameError(""); setShowForm(true); };
  const openEdit = proc => {
    setEditProc(proc); setFormName(proc.name);
    setFormSkills((proc.skills||[]).map((sk, _i, arr)=>({
      skid:sk.skid, name:sk.name, color:sk.color,
      duration:intDur(sk.duration), duration_unit:sk.duration_unit||"minutes",
      dep_type:sk.dep_type||"",
      // Resolve dep_psid → dep_seq (1-based position in the list)
      dep_seq: sk.dep_psid ? String(arr.findIndex(s=>s.psid===sk.dep_psid)+1||"") : "",
      recur_every:sk.recur_every||"", recur_unit:sk.recur_unit||"hours", recur_times:sk.recur_times||"",
      _procRef: sk._procRef||null,
    })));
    setNameError(""); setShowForm(true);
  };

  // Expand a role/skill/process into form rows
  const addToForm = item => {
    if (item._isRole) {
      const fullRole = roles.find(r=>r.rid===item.rid);
      const roleSkills = (fullRole?.skills||[]).map(s=>({...s,duration:intDur(s.duration)||null,duration_unit:s.duration_unit||"minutes",dep_type:"",dep_seq:"",recur_every:"",recur_unit:"hours",recur_times:""}));
      setFormSkills(p=>{ const ex=new Set(p.map(x=>x.skid)); return [...p,...roleSkills.filter(s=>!ex.has(s.skid))]; });
    } else if (item._isProcess) {
      // Expand a process into its skills, grouped together
      const fullProc = processes.find(pr=>pr.procid===item.procid);
      const procSkills = (fullProc?.skills||[]).map(s=>({
        skid:s.skid, name:s.name, color:s.color,
        duration:intDur(s.duration), duration_unit:s.duration_unit||"minutes",
        dep_type:s.dep_type||"", dep_seq:"",
        recur_every:s.recur_every||"", recur_unit:s.recur_unit||"hours", recur_times:s.recur_times||"",
        _procRef:fullProc.name,
      }));
      setFormSkills(p=>{
        const ex = new Set(p.map(x=>x.skid));
        return [...p, ...procSkills.filter(s=>!ex.has(s.skid))];
      });
    } else {
      setFormSkills(p=>p.find(x=>x.skid===item.skid)?p:[...p,{...item,duration:intDur(item.duration)||null,duration_unit:item.duration_unit||"minutes",dep_type:"",dep_seq:"",recur_every:"",recur_unit:"hours",recur_times:""}]);
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
        duration:intDur(s.duration)||null, duration_unit:s.duration_unit||"minutes",
        dep_type:s.dep_type||null, dep_seq:s.dep_seq||null,
        recur_every: s.recur_every ? Number(s.recur_every) : null,
        recur_unit: s.recur_unit||"hours",
        recur_times: s.recur_times ? Number(s.recur_times) : null,
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

  const runProc = async proc => { setStartingId(proc.procid); try { await handleRunProcess(proc); } finally { setStartingId(null); } };
  const deleteProcess = async id => {
    setDelProc(null);
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
  const totalMins = formSkills.reduce((s,sk)=>{
    const base = toMins(sk.duration, sk.duration_unit);
    const mult = sk.recur_times ? Number(sk.recur_times) : 1;
    return s + base * mult;
  }, 0);
  const fmtTotalMins = m => {
    const total = Math.round(m);
    const d = Math.floor(total / 1440);
    const h = Math.floor((total % 1440) / 60);
    const min = total % 60;
    const parts = [];
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}hr`);
    if (min || !parts.length) parts.push(`${min}min`);
    return parts.join(' ');
  };

  // Items for combo: processes (bold) + skills only — no roles
  const allItems = [
    ...processes.filter(p=>p.procid!==editProc?.procid).map(p=>({
      skid:`proc-${p.procid}`, procid:p.procid, name:p.name, _isProcess:true,
    })),
    ...skills,
  ];

  const closeForm = () => { setShowForm(false); setEditProc(null); setFormName(""); setFormSkills([]); setNameError(""); };
  const H = "h-10 px-3 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider whitespace-nowrap";
  const shiftExec = dir => {
    const d = new Date(execDate+"T00:00:00");
    d.setDate(d.getDate() + dir * (execPeriod==="week" ? 7 : 1));
    setExecDate(d.toISOString().slice(0,10));
  };
  const sd = startDialog;
  const setSel = fn => setStartDialog(d=>({...d, selectedItems:fn(d.selectedItems)}));

  return (
    <Page title={tl("Processes")} actions={<>
      {user?.employer_uid && !user?.is_manufacturer && (
        <Btn variant="secondary" size="sm" onClick={()=>setPage("processes-emp")}>Executions<ChevronRightIcon/></Btn>
      )}
      <Btn size="sm" onClick={openNew}><PlusIcon/>Process</Btn>
    </>}>
      {showForm&&(
        <Card className="mb-6" style={{ animation:"fadeIn 0.2s ease" }}>
          <CardHeader>
            <CardTitle className="font-heading text-lg">{editProc?"Edit process":"New process"}</CardTitle>
            <CardAction><Button variant="ghost" size="icon-sm" aria-label="Close" onClick={closeForm}><XIcon/></Button></CardAction>
          </CardHeader>
          <CardPanel className="flex flex-col gap-5">
            <Field invalid={!!nameError} className="gap-1.5">
              <FieldLabel>Process name<span className="text-brand">*</span></FieldLabel>
              <CInput size="lg" value={formName} onChange={e=>{ setFormName(e.target.value); setNameError(""); }} autoFocus={!editProc}
                aria-invalid={nameError?true:undefined}
                placeholder={editProc?"Process name…":"New process name…"} className="font-heading font-semibold text-lg"/>
              {nameError&&<p className="text-destructive-foreground text-xs leading-relaxed">{nameError}</p>}
            </Field>

            <FieldBlock label="Add processes / skills" hint="Adding a process copies all of its steps.">
              <SkillComboWithProcesses allItems={allItems} onAdd={addToForm} onCreateSkill={createSkill}/>
            </FieldBlock>

            {formSkills.length>0&&(
              <div className="overflow-x-auto rounded-xl border border-border [&_thead_tr]:bg-muted">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={`${H} w-8`}>#</TableHead>
                      <TableHead className={H}>Skill / Step</TableHead>
                      <TableHead className={H}>Duration</TableHead>
                      <TableHead className={H}>Repeat every</TableHead>
                      <TableHead className={H}>Times</TableHead>
                      <TableHead className={H}>Dep. type</TableHead>
                      <TableHead className={H}>Depends on</TableHead>
                      <TableHead className="w-24"/>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formSkills.map((sk,i)=>{
                      const depItems = [{label:"Select…", value:""}, ...formSkills.map((o,j)=>j===i?null:{ label:`${j+1}. ${o.name}`, value:String(j+1) }).filter(Boolean)];
                      return (
                        <TableRow key={`${sk.skid}-${i}`} data-slot="process-step-row" className="align-top">
                          <TableCell className="px-3 pt-4 font-bold font-mono text-muted-foreground text-xs">{i+1}</TableCell>
                          <TableCell className="min-w-36 whitespace-normal px-3 pt-3.5">
                            <span className={`font-semibold text-sm ${SKILL_INK}`} style={{ "--ink":sk.color||"var(--foreground)" }}>{sk.name}</span>
                            {sk._procRef&&<div className="text-muted-foreground text-xs">from {sk._procRef}</div>}
                          </TableCell>
                          <TableCell className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <CInput type="number" size="sm" aria-label="Duration" value={intDur(sk.duration)||""} placeholder="0" className="w-16"
                                onChange={e=>updateRow(i,"duration", Math.max(0, parseInt(e.target.value,10)||0))}/>
                              <MiniSelect aria-label="Duration unit" value={sk.duration_unit||"minutes"} onChange={v=>updateRow(i,"duration_unit",v)}
                                items={DUR_UNITS.map(u=>({ label:u.label, value:u.value }))} className="w-20"/>
                            </div>
                          </TableCell>
                          <TableCell className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <CInput type="number" size="sm" aria-label="Repeat every" value={sk.recur_every||""} placeholder="—" className="w-14"
                                onChange={e=>updateRow(i,"recur_every",e.target.value?Math.max(1,parseInt(e.target.value)||1):"")}/>
                              <MiniSelect aria-label="Repeat unit" value={sk.recur_unit||"hours"} onChange={v=>updateRow(i,"recur_unit",v)} disabled={!sk.recur_every}
                                items={[{label:"hrs",value:"hours"},{label:"days",value:"days"}]} className="w-20"/>
                            </div>
                          </TableCell>
                          <TableCell className="px-3 py-2.5">
                            <CInput type="number" size="sm" aria-label="Times" value={sk.recur_times||""} placeholder="—" className="w-16" disabled={!sk.recur_every}
                              title="How many times this step recurs (multiplies duration)"
                              onChange={e=>updateRow(i,"recur_times",e.target.value?Math.max(1,Math.round(Number(e.target.value))||1):"")}/>
                          </TableCell>
                          <TableCell className="px-3 py-2.5">
                            <MiniSelect aria-label="Dependency type" value={sk.dep_type||""} onChange={v=>updateRow(i,"dep_type",v)}
                              items={[{label:"—",value:""}, ...DEP_TYPES.map(d=>({ label:d.value, value:d.value, title:d.label }))]} className="w-20"/>
                            {sk.dep_type&&<div className="mt-1 max-w-28 whitespace-normal text-[10px] text-muted-foreground leading-tight">{DEP_TYPES.find(d=>d.value===sk.dep_type)?.label}</div>}
                          </TableCell>
                          <TableCell className="px-3 py-2.5">
                            <MiniSelect aria-label="Depends on" value={String(sk.dep_seq||"")} onChange={v=>updateRow(i,"dep_seq",v)} disabled={!sk.dep_type}
                              items={depItems} className="w-36"/>
                          </TableCell>
                          <TableCell className="px-2 py-2.5">
                            <div className="flex justify-end gap-0.5">
                              <Button variant="ghost" size="icon-xs" aria-label="Move up" disabled={i===0} onClick={()=>moveRow(i,-1)}><ArrowUpIcon/></Button>
                              <Button variant="ghost" size="icon-xs" aria-label="Move down" disabled={i===formSkills.length-1} onClick={()=>moveRow(i,1)}><ArrowDownIcon/></Button>
                              <Button variant="ghost" size="icon-xs" aria-label={`Remove ${sk.name}`} className="text-muted-foreground hover:text-destructive-foreground" onClick={()=>removeRow(i)}><XIcon/></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-muted hover:bg-muted">
                      <TableCell colSpan={2} className="px-3 py-2.5 font-bold text-sm">Total</TableCell>
                      <TableCell colSpan={6} className="px-3 py-2.5 font-bold text-accent-foreground text-sm tabular-nums">{fmtTotalMins(totalMins)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardPanel>
          <CardFooter className="justify-end gap-2 border-border border-t pt-4">
            <Btn variant="ghost" onClick={closeForm}>Cancel</Btn>
            <Btn onClick={saveForm} loading={saving}>{editProc?"Update process":"Save process"}</Btn>
          </CardFooter>
        </Card>
      )}

      {/* Saved processes list */}
      {loading ? <Spinner/> : processes.length===0 && !showForm ? (
        <Empty className="rounded-2xl border border-border border-dashed bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon"><WorkflowIcon/></EmptyMedia>
            <EmptyTitle>No processes yet</EmptyTitle>
            <EmptyDescription>A process is an ordered set of skills — e.g. mix, proof, bake — that your staff run together.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent><Btn size="sm" onClick={openNew}><PlusIcon/>Process</Btn></EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {processes.map(proc=>(
            <Card key={proc.procid} data-slot="process-card" className="gap-0 py-0">
              <CardPanel className="flex flex-col gap-3 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <button type="button" data-slot="row-link" onClick={()=>{ openEdit(proc); window.scrollTo({top:0,behavior:"smooth"}); }}
                    className="min-w-0 text-start font-heading font-semibold text-lg underline decoration-dotted underline-offset-4 hover:decoration-solid">
                    {proc.name}
                  </button>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Btn size="sm" onClick={()=>runProc(proc)} loading={startingId===proc.procid}><PlayIcon/>Run</Btn>
                    <Button variant="ghost" size="icon-sm" aria-label={`Delete ${proc.name}`} title="Delete process"
                      className="text-muted-foreground hover:text-destructive-foreground" onClick={()=>setDelProc(proc)}><Trash2Icon/></Button>
                  </div>
                </div>
                <MiniGantt proc={proc}/>
                <div className="flex flex-wrap gap-1">
                  {(proc.skills||[]).map(sk=>(
                    <SkillPill key={sk.psid} color={sk.color||G.muted}
                      name={<>{sk.name}{sk.duration?` · ${intDur(sk.duration)}${durAbbr(sk.duration_unit)}`:""}{sk.dep_type&&<span className="ms-1 font-bold text-[9px] opacity-75">{sk.dep_type}</span>}</>}/>
                  ))}
                </div>
              </CardPanel>
            </Card>
          ))}
        </div>
      )}

      {/* ── Executions calendar ──────────────────────────────────────────────── */}
      <div className="mt-10">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="font-heading font-semibold text-xl">{tl("Executions")}</h2>
          <div className="ms-auto flex flex-wrap items-center gap-2">
            <div className="flex items-center">
              <Button variant="outline" size="icon-sm" aria-label={execPeriod==="week"?"Previous week":"Previous day"} className="rounded-e-none" onClick={()=>shiftExec(-1)}><ChevronLeftIcon/></Button>
              <DateField value={execDate} onChange={v=>v&&setExecDate(v)} className="w-40 [&_input]:rounded-none" size="sm"/>
              <Button variant="outline" size="icon-sm" aria-label={execPeriod==="week"?"Next week":"Next day"} className="rounded-s-none" onClick={()=>shiftExec(1)}><ChevronRightIcon/></Button>
            </div>
            <SegToggle value={execPeriod} onChange={setExecPeriod} options={[["day","Day"],["week","Week"]]}/>
          </div>
        </div>
        {(()=>{
          const anchor = new Date(execDate+"T00:00:00");
          const periodStart = anchor.getTime();
          const periodEnd   = execPeriod==="week"
            ? periodStart + 7*24*60*60*1000
            : periodStart + 24*60*60*1000;
          const filtered = runs.filter(r=>{
            if (!r.started_at) return false;
            const s = new Date(r.started_at).getTime();
            const e = r.completed_at ? new Date(r.completed_at).getTime() : Date.now();
            return s < periodEnd && e > periodStart;
          });
          if (filtered.length===0) return (
            <Empty className="rounded-2xl border border-border border-dashed py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon"><CalendarDaysIcon/></EmptyMedia>
                <EmptyTitle className="text-base">{runs.length===0 ? "No processes have been started yet" : "No processes in this period"}</EmptyTitle>
                {runs.length===0&&<EmptyDescription>Click Run on any process above to begin.</EmptyDescription>}
              </EmptyHeader>
            </Empty>
          );
          return <ExecutionsCalendar runs={filtered} onAction={handleRunAction} onOpenDetail={openRunDetail}/>;
        })()}
      </div>

      {/* ── Run detail sidebar */}
      {selectedRun&&(
        <RunDetailSidebar
          run={selectedRun}
          user={user}
          onClose={()=>setSelectedRun(null)}
          onRunUpdated={handleStepUpdated}
          toast={toast}
        />
      )}

      {stopRun&&<StopRunDialog run={stopRun} toast={toast} onClose={()=>setStopRun(null)}
        onStopped={u=>{ setRuns(p=>p.map(r=>r.prid===u.prid?u:r)); if(selectedRun?.prid===u.prid) setSelectedRun(u); setStopRun(null); toast("Process stopped"); }}/>}

      <Dialog open={!!delProc} title={`Delete “${delProc?.name||""}”?`} onConfirm={()=>deleteProcess(delProc.procid)} onCancel={()=>setDelProc(null)}>
        This cannot be undone.
      </Dialog>

      {/* ── Start validation dialog ───────────────────────────────────────────── */}
      {sd&&(
        <Modal onClose={()=>setStartDialog(null)} className="max-w-xl"
          title={`Run “${sd.proc.name}”`}
          description={sd.step==='items'
            ? <>Select what you are producing in this run and set the quantity.{sd.suggestedItems.length>0 && " Items from your equipment are pre-populated."}</>
            : "Please review before starting:"}
          footer={sd.step==='items' ? <>
            <span className="text-muted-foreground text-sm">{sd.selectedItems.length} item{sd.selectedItems.length===1?"":"s"}</span>
            <div className="flex gap-2">
              <Btn variant="ghost" onClick={()=>setStartDialog(null)}>Cancel</Btn>
              <Btn loading={startSaving} onClick={()=>handleStartConfirm(false)} disabled={sd.selectedItems.length===0}><PlayIcon/>Start process</Btn>
            </div>
          </> : <>
            <Btn variant="ghost" onClick={()=>setStartDialog(d=>({...d,step:'items'}))}><ArrowLeftIcon/>Back</Btn>
            <div className="flex gap-2">
              <Btn variant="ghost" onClick={()=>setStartDialog(null)}>Cancel</Btn>
              <Btn loading={startSaving} onClick={()=>handleStartConfirm(true)}>Start anyway</Btn>
            </div>
          </>}>
          {sd.step==='items'&&(
            <div className="flex flex-col gap-4">
              {sd.selectedItems.length===0
                ? <p className="text-muted-foreground text-sm italic">No items selected — add from the list below.</p>
                : (
                  <div className="flex flex-col divide-y divide-border rounded-xl border border-border">
                    {sd.selectedItems.map((it,i)=>(
                      <div key={it.rid} data-slot="run-item" className="flex items-center gap-2.5 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-sm">{it.name}</div>
                          {it.equipment_name&&<div className="truncate text-muted-foreground text-xs">{it.equipment_name}</div>}
                        </div>
                        <CInput type="number" size="sm" aria-label={`Quantity of ${it.name}`} value={it.qty} className="w-20 [&_input]:text-end"
                          onChange={e=>setSel(s=>s.map((x,j)=>j===i?{...x,qty:e.target.value}:x))}/>
                        <span className="w-8 text-muted-foreground text-xs">{it.units||"pcs"}</span>
                        <Button variant="ghost" size="icon-xs" aria-label={`Remove ${it.name}`} onClick={()=>setSel(s=>s.filter((_,j)=>j!==i))}><XIcon/></Button>
                      </div>
                    ))}
                  </div>
                )}
              {/* Add more items */}
              <div className="flex flex-col gap-2">
                <span className="font-medium text-sm">Add item</span>
                {(()=>{
                  const q=(sd.addFilter||"").toLowerCase();
                  const pid=sd.proc.procid;
                  const avail=recipes
                    .filter(r=>!sd.selectedItems.find(s=>s.rid===r.rid) && r.name.toLowerCase().includes(q))
                    .sort((x,y)=>(String(y.procid)===String(pid))-(String(x.procid)===String(pid)) || x.name.localeCompare(y.name));
                  return (<>
                    <SearchField value={sd.addFilter||""} onChange={v=>setStartDialog(d=>({...d,addFilter:v}))}
                      onClear={()=>setStartDialog(d=>({...d,addFilter:""}))} placeholder="Filter items…" className="w-full"/>
                    {avail.length===0
                      ? <p className="text-muted-foreground text-xs italic">No more items to add.</p>
                      : <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto">
                          {avail.map(r=>(
                            <Button key={r.rid} variant="outline" size="xs" className="rounded-full"
                              onClick={()=>setSel(s=>[...s,{rid:r.rid,name:r.name,qty:1,units:r.units,equipment_name:null}])}>
                              <PlusIcon/>{r.name}
                            </Button>
                          ))}
                        </div>}
                  </>);
                })()}
              </div>
            </div>
          )}
          {sd.step==='warnings'&&(
            <div className="flex flex-col gap-3">
              {sd.warnings.map((w,i)=>(
                <Alert key={i} variant="warning">
                  <TriangleAlertIcon/>
                  <AlertTitle>{w.type==='exceeds_hours'?'Working hours':w.type==='employee_no_slot'?'No roster slot today':'Employee availability'}</AlertTitle>
                  <AlertDescription>{w.message}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </Modal>
      )}
    </Page>
  );
}

// ─── ROSTER PAGE ──────────────────────────────────────────────────────────────
// Used both by Restaurant (full view, publish/approve) and Employees (own slots)
// ─── ROSTER PAGE ──────────────────────────────────────────────────────────────
function RosterPage({ user, toast, onBack }) {
  const isBoth   = user?.is_manufacturer && !!user?.employer_uid;
  const [viewMode, setViewMode] = useState(user?.is_manufacturer ? 'manager' : 'employee');
  // Manager tools (publish, approve, clone) belong to roster administrators: the owner, plus anyone given the
  // Administrator skill. Everyone else edits only their own slots and sees their colleagues' slots.
  // The server says who is an administrator (roster.is_admin); viewMode picks the screen.

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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getRoster(fmt(weekStart), viewMode);
      setRoster(r);
      if (viewMode === 'manager' && r.is_admin === false) { setViewMode('employee'); return; }   // reloads as employee
      if (viewMode === 'employee') {
        const own = (r.slots||[]).filter(s=>String(s.uid)===String(user.uid));
        setMySlots(own.map((s,i)=>({
          tempId: `s${i}`, rsid:s.rsid,
          slot_date: String(s.slot_date).slice(0,10),
          start_time: s.start_time?.slice(0,5),
          end_time:   s.end_time?.slice(0,5),
          finalized:  s.finalized,
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
  const isPast    = weekEnd < today;
  const isFuture  = weekStart > today;
  const isCurrent = !isPast && !isFuture;
  const status   = roster?.status || 'unpublished';
  const isAdmin  = !!roster?.is_admin;
  const isManuf  = viewMode === 'manager' && isAdmin;

  const rAction = async (fn, ...args) => {
    setSaving(true);
    try { const r = await fn(...args); setRoster(r); toast("Saved"); }
    catch(e){ toast(e.message,"error"); }
    finally{ setSaving(false); }
  };

  const ensureRoster = async () => {
    if (roster?.roid) return roster;
    const r = await api.initRoster({ week_start: fmt(weekStart), as: viewMode });
    setRoster(r); return r;
  };

  // ── Restaurant buttons ──────────────────────────────────────────────────────
  const canClone     = roster?.roid && !isFuture && ['published','approved','unapproved'].includes(status);
  // Clone Past: current week is displayed, no slots posted yet, not already cloned from prev week
  const hasSlots     = (roster?.slots||[]).length > 0;
  const isClonedFrom = !!roster?.cloned_from;
  const canClonePast = isCurrent && !hasSlots && !isClonedFrom;

  const manufButtons = () => {
    if (isPast) return null;
    const btns = [];
    if (['unpublished','unapproved'].includes(status))
      btns.push(<Btn key="pub" size="sm" loading={saving} onClick={async()=>{ const r=await ensureRoster(); rAction(api.publishRoster,r.roid); }}><UploadIcon/>Publish</Btn>);
    if (status==='published')
      btns.push(<Btn key="unpub" size="sm" variant="secondary" loading={saving} onClick={()=>rAction(api.unpublishRoster,roster.roid)}>Unpublish</Btn>);
    if (canClonePast)
      btns.push(<Btn key="clonepast" size="sm" variant="secondary" loading={saving}
        onClick={async()=>{
          setSaving(true);
          try { const r=await api.clonePastRoster(fmt(weekStart), viewMode); setRoster(r); toast("Cloned from previous week"); }
          catch(e){ toast(e.message,"error"); } finally{ setSaving(false); }
        }}><CopyIcon/>Clone past week</Btn>);
    if (canClone)
      btns.push(<Btn key="clone" size="sm" variant="secondary" loading={saving} onClick={()=>rAction(api.cloneRoster,roster.roid)}><CopyIcon/>Clone to next week</Btn>);
    if (['published','unapproved'].includes(status))
      btns.push(<Btn key="app" size="sm" loading={saving} onClick={()=>rAction(api.approveRoster,roster.roid)}><CheckIcon/>Approve</Btn>);
    if (status==='approved') {
      btns.push(<Btn key="unapp" size="sm" variant="secondary" loading={saving} onClick={()=>rAction(api.unapproveRoster,roster.roid)}>Unapprove</Btn>);
    }
    return btns;
  };

  // ── Employee slot helpers ───────────────────────────────────────────────────
  // Staff edit their own slots while the roster is published; an administrator may also do it before publishing
  const canEdit = viewMode === 'employee' && !isPast && (status==='published' || isAdmin);
  const isFinalized = mySlots.some(s=>s.finalized);
  const nextTempId = () => `t${Date.now()}${Math.random()}`;

  const mergeAllSlots = (slots) => {
    // Group by date, sort each day, merge overlapping/adjacent
    const byDay = {};
    slots.forEach(s => { (byDay[s.slot_date] = byDay[s.slot_date]||[]).push(s); });
    const result = [];
    Object.entries(byDay).forEach(([date, daySlots]) => {
      const sorted = [...daySlots].sort((a,b) => timeToMins(a.start_time) - timeToMins(b.start_time));
      const merged = [];
      for (const s of sorted) {
        const last = merged[merged.length-1];
        if (last && timeToMins(s.start_time) <= timeToMins(last.end_time)) {
          if (timeToMins(s.end_time) > timeToMins(last.end_time)) last.end_time = s.end_time;
        } else {
          merged.push({ ...s });
        }
      }
      merged.forEach((s,i) => result.push({ ...s, tempId:`${date}-${i}` }));
    });
    return result;
  };

  const addOrUpdateSlot = (dateStr, startM, endM, tempId=null) => {
    const start_time = minsToHhmm(Math.max(START_H*60, Math.min(startM, END_H*60-SNAP)));
    const end_time   = minsToHhmm(Math.min(END_H*60,  Math.max(endM,   START_H*60+SNAP)));
    if (tempId) {
      setMySlots(p => p.map(s => s.tempId===tempId ? {...s, start_time, end_time} : s));
    } else {
      setMySlots(p => [...p, { tempId:nextTempId(), slot_date:dateStr, start_time, end_time, finalized:false }]);
    }
  };

  const removeSlot = tempId => { setMySlots(p=>p.filter(s=>s.tempId!==tempId)); setTooltip(null); };

  const saveSlots = async () => {
    if (!roster?.roid && !isAdmin) { toast("Roster not published yet","error"); return; }
    setSaving(true);
    try {
      const rost = roster?.roid ? roster : await ensureRoster();
      const merged = mergeAllSlots(mySlots);
      const r = await api.saveRosterSlots(rost.roid, {
        slots: merged.map(s=>({slot_date:s.slot_date,start_time:s.start_time,end_time:s.end_time})),
        finalize: true,
      });
      setRoster(r);
      setEmpEditing(false);
      toast("Slots saved");
      const own = (r.slots||[]).filter(s=>String(s.uid)===String(user.uid));
      setMySlots(own.map((s,i)=>({
        tempId:`s${i}`, rsid:s.rsid,
        slot_date: String(s.slot_date).slice(0,10),
        start_time: s.start_time?.slice(0,5),
        end_time:   s.end_time?.slice(0,5),
        finalized:  s.finalized,
      })));
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
  (roster?.slots||[]).forEach(s=>{
    const d = String(s.slot_date).slice(0,10);
    (slotsByDay[d]=slotsByDay[d]||[]).push({...s, slot_date:d});
  });

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
  const STATUS_BADGE = { approved:"success", published:"info", unapproved:"warning", unpublished:"secondary" };
  const shiftWeek = n => { const d=new Date(weekStart); d.setDate(d.getDate()+7*n); setWeekStart(d); setTooltip(null); };
  const fmtShort = d => d.toLocaleDateString('en-GB',{day:'numeric',month:'short'});
  const statusMsg =
      status==='approved'    ? ["success", CircleCheckIcon, "Roster approved — your schedule is final."]
    : status==='unpublished' && !isAdmin ? ["default", ClockIcon, "Roster not yet published. Check back later."]
    : status==='unpublished' ? ["info", InfoIcon, "Roster not yet published. As an administrator you can add your slots now; staff can add theirs once you publish."]
    : status==='published' && empEditing ? ["warning", PencilIcon, "Drag on any day to add a slot. Drag the bottom edge to extend. Click a slot to edit or remove. Click Save when done."]
    : status==='published' && !isFinalized ? ["info", InfoIcon, "Click \"Edit my slots\" then drag to select your available hours, then Save."]
    : status==='published' ? ["info", ClockIcon, "Slots saved. Click \"Edit\" to make changes before the roster is approved."]
    : null;

  return (
    <Page
      title={`Roster — week of ${weekStart.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}`}
      actions={<>
        {onBack && <Btn size="sm" variant="ghost" onClick={onBack}><ArrowLeftIcon/>Staff</Btn>}
        {isManuf && manufButtons()}
        {!isManuf && canEdit && (
          empEditing
            ? <>
                <Btn size="sm" variant="ghost" onClick={()=>{ setEmpEditing(false); setTooltip(null); load(); }}>Cancel</Btn>
                <Btn size="sm" loading={saving} onClick={saveSlots}><CheckIcon/>Save</Btn>
              </>
            : <Btn size="sm" onClick={()=>setEmpEditing(true)}><PencilIcon/>{isFinalized ? "Edit" : "Edit my slots"}</Btn>
        )}
      </>}>

      {/* Week navigation + status + view switch */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center">
            <Button variant="outline" size="icon-sm" aria-label="Previous week" className="rounded-e-none" onClick={()=>shiftWeek(-1)}><ChevronLeftIcon/></Button>
            <span className="flex h-8 min-w-36 items-center justify-center border-input border-y bg-background px-3 font-medium text-sm tabular-nums sm:h-7 dark:bg-input/32">
              {fmtShort(weekStart)} – {fmtShort(weekEnd)}
            </span>
            <Button variant="outline" size="icon-sm" aria-label="Next week" className="rounded-s-none" onClick={()=>shiftWeek(1)}><ChevronRightIcon/></Button>
          </div>
          {!isCurrent && <Button variant="ghost" size="sm" onClick={()=>{ setWeekStart(toMonday(new Date())); setTooltip(null); }}>This week</Button>}
          <CBadge variant={STATUS_BADGE[status]||"secondary"} size="lg">{status.charAt(0).toUpperCase()+status.slice(1)}</CBadge>
        </div>
        {(isBoth || isAdmin) && (
          <SegToggle value={viewMode} onChange={m=>{ if(m!==viewMode){ setViewMode(m); setEmpEditing(false); setTooltip(null); } }}
            options={[["employee", <span key="e" className="flex items-center gap-1.5"><CircleUserIcon className="size-4"/>My slots</span>],
                      ["manager",  <span key="m" className="flex items-center gap-1.5"><UsersIcon className="size-4"/>Manage roster</span>]]}/>
        )}
      </div>

      {/* Auto-settings (restaurant, non-past) */}
      {isManuf && roster?.roid && !isPast && (
        <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2 rounded-xl border border-border bg-muted px-4 py-3">
          {[['auto_clone','Auto-clone next week'],['auto_approve','Auto-approve at week end']].map(([k,label])=>(
            <Label key={k} className="cursor-pointer font-normal">
              <Checkbox checked={!!roster[k]}
                onCheckedChange={async v=>{ try { const r=await api.patchRoster(roster.roid,{[k]:!!v}); setRoster(r); } catch(e){ toast(e.message,"error"); } }}/>
              {label}
            </Label>
          ))}
        </div>
      )}

      {/* Employee legend (shown always) */}
      {(roster?.employees||[]).length>0 && (
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {roster.employees.map(e=>{
            const me = String(e.uid)===String(user?.uid);
            return (
              <span key={e.uid} className={`flex items-center gap-1.5 text-xs ${SKILL_INK} ${me?"font-bold":""}`} style={{ "--ink":empColors[e.uid]||G.muted }}>
                <span className="size-2.5 shrink-0 rounded-full" style={{ background:empColors[e.uid]||G.muted }}/>
                {e.first_name||"No name"}{e.role_name?` (${e.role_name})`:""}{me?" (you)":""}
              </span>
            );
          })}
        </div>
      )}

      {loading ? <Spinner/> : (
        <div data-slot="roster-calendar" className="select-none overflow-x-auto rounded-2xl border border-border bg-card shadow-xs/5" ref={calRef}>
          <div className="grid min-w-[680px]" style={{ gridTemplateColumns:"48px repeat(7,1fr)", opacity:calOpacity }}>
            {/* Header */}
            <div className="border-border border-b bg-muted"/>
            {weekDays.map(({label,date,dateStr,isToday})=>(
              <div key={dateStr} className={`border-border border-s border-b px-1 py-2 text-center ${isToday?"bg-accent text-accent-foreground":"bg-muted"}`}>
                <div className="font-semibold text-xs">{label}</div>
                <div className={`mx-auto mt-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] tabular-nums ${isToday?"bg-brand font-semibold text-brand-foreground":"text-muted-foreground"}`}>
                  {date.getDate()}/{date.getMonth()+1}
                </div>
              </div>
            ))}

            {/* Time column */}
            <div className="relative" style={{ height:COL_H }}>
              {HOURS.map(h=>(
                <div key={h} className="absolute end-1.5 text-[10px] text-muted-foreground tabular-nums leading-none" style={{ top:minsToPx((h-START_H)*60)+3 }}>
                  {h}:00
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map(({dateStr,isToday})=>{
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
                  className={`relative border-border border-s ${isPast?"bg-muted":isToday?"bg-accent/30":""} ${isEditable?"cursor-crosshair":""}`}
                  style={{ height:COL_H }}
                  onMouseDown={e=>onMouseDown(e,dateStr)}>

                  {/* Hour grid + 30-min sub-lines */}
                  {HOURS.map(h=>(
                    <div key={h} className={`pointer-events-none absolute inset-x-0 border-t ${h===START_H?"border-transparent":h%2===0?"border-border":"border-border/60"}`} style={{ top:minsToPx((h-START_H)*60) }}/>
                  ))}
                  {HOURS.map(h=>(
                    <div key={`${h}h`} className="pointer-events-none absolute inset-x-0 border-border/30 border-t border-dashed" style={{ top:minsToPx((h-START_H)*60+30) }}/>
                  ))}

                  {/* Unpublished overlay */}
                  {isFuture && status==='unpublished' && isManuf && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-muted-foreground opacity-30">
                      <UploadIcon className="size-8"/>
                    </div>
                  )}

                  {/* Drag ghost */}
                  {isEditable && isDragCol && dragGhost && (
                    <div className={`pointer-events-none absolute inset-x-0.5 rounded-md border-2 border-dashed ${SKILL_INK}`}
                      style={{ top:dragGhost.top, height:Math.max(dragGhost.height,4), background:`${myColor}30`, borderColor:myColor, "--ink":myColor }}>
                      <span className="block px-1 py-0.5 font-semibold text-[10px] tabular-nums">
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
                      <div key={s.rsid} title={`${s.first_name} ${s.last_name||""} · ${s.start_time}–${s.end_time}`}
                        className={`pointer-events-none absolute inset-x-0.5 z-[1] overflow-hidden rounded-md border-[1.5px] ${SKILL_INK}`}
                        style={{ top, height:Math.max(h,4), background:`${col}28`, borderColor:col, opacity:isManuf?1:0.55, "--ink":col }}>
                        <span className="px-[3px] py-0.5 font-semibold text-[10px] leading-tight" style={{ writingMode:"vertical-rl" }}>
                          {s.first_name}{s.role_name?` · ${s.role_name}`:""}
                        </span>
                      </div>
                    );
                  })}

                  {/* My own slots — always visible in employee view, interactive when editing */}
                  {viewMode==='employee' && myDaySlots.map(s=>{
                    const t1 = timeToMins(s.start_time);
                    const t2 = timeToMins(s.end_time);
                    const top = minsToPx(t1-START_H*60);
                    const ht  = minsToPx(t2-t1);
                    const isOpen = tooltip?.tempId===s.tempId;
                    // Visual state: editing=full border, finalized=solid, approved=full opacity
                    const bgOpacity   = s.finalized ? (status==='approved'?'55':'38') : '35';
                    return (
                      <div key={s.tempId} data-tempid={s.tempId}
                        className={`absolute inset-x-0.5 z-[2] rounded-md ${empEditing?"border-2":"border-[1.5px]"} ${isEditable?"cursor-pointer":""} ${isOpen?"z-[30] ring-2 ring-ring":""}`}
                        style={{ top, height:Math.max(ht,4), background:`${myColor}${bgOpacity}`, borderColor:myColor,
                          opacity: s.finalized && status!=='approved' ? 0.75 : 1 }}>
                        <div className={`flex items-center gap-1 px-1 py-0.5 font-semibold text-[10px] tabular-nums leading-tight ${SKILL_INK}`} style={{ "--ink":myColor }}>
                          {s.start_time}–{s.end_time}
                          {s.finalized && !isEditable && (status==='approved'
                            ? <CheckIcon className="size-3" aria-label="Approved"/>
                            : <ClockIcon className="size-3 opacity-70" aria-label="Awaiting approval"/>)}
                        </div>
                        {/* Resize handle — only in edit mode */}
                        {isEditable && (
                          <div className="absolute inset-x-0 bottom-0 h-2 cursor-s-resize rounded-b-[4px]"
                            style={{ background:`${myColor}50` }}
                            onMouseDown={e=>{
                              e.stopPropagation(); e.preventDefault();
                              setDrag({mode:'extend',dateStr,startM:t1,currentM:t2,tempId:s.tempId});
                            }}/>
                        )}
                        {/* Click to open tooltip — only in edit mode */}
                        {isEditable && (
                          <div className="absolute inset-x-0 top-0 bottom-2"
                            onClick={e=>{ e.stopPropagation(); setTooltip(isOpen?null:{tempId:s.tempId}); }}/>
                        )}
                        {/* Slot editor */}
                        {isOpen && isEditable && (
                          <div data-slot="slot-editor" onClick={e=>e.stopPropagation()} onMouseDown={e=>e.stopPropagation()}
                            className={`absolute -top-1 z-20 flex w-64 cursor-default flex-col gap-3 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg/5 ${dateStr>=weekDays[5].dateStr?"end-[calc(100%+6px)]":"start-[calc(100%+6px)]"}`}>
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-sm">Edit slot</span>
                              <Button variant="ghost" size="icon-xs" aria-label="Close" onClick={()=>setTooltip(null)}><XIcon/></Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Field className="gap-1">
                                <FieldLabel className="text-muted-foreground text-xs">Start</FieldLabel>
                                <CInput type="time" size="sm" value={s.start_time}
                                  onChange={e=>setMySlots(p=>p.map(x=>x.tempId===s.tempId?{...x,start_time:e.target.value}:x))}/>
                              </Field>
                              <Field className="gap-1">
                                <FieldLabel className="text-muted-foreground text-xs">End</FieldLabel>
                                <CInput type="time" size="sm" value={s.end_time}
                                  onChange={e=>setMySlots(p=>p.map(x=>x.tempId===s.tempId?{...x,end_time:e.target.value}:x))}/>
                              </Field>
                            </div>
                            <Button variant="destructive-outline" size="sm" onClick={()=>removeSlot(s.tempId)}><Trash2Icon/>Remove slot</Button>
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
      {!isManuf && !loading && statusMsg && (()=>{ const [v, Icon, text] = statusMsg; return (
        <Alert variant={v} className="mt-4">
          <Icon/>
          <AlertDescription>{text}</AlertDescription>
        </Alert>
      ); })()}
    </Page>
  );
}

// ─── EMPLOYEE PROCESSES PAGE ──────────────────────────────────────────────────
// Shows processes as cards, sorted chronologically by when the employee's step
// is due. Cards are collapsed if employee has no matching skill, expanded if they do.
function EmployeeProcessesPage({ user, toast, setPage }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
  const [runs,    setRuns]    = useState([]);
  const [skills,  setSkills]  = useState([]); // employee's skills (skids)
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState({});

  const ownerUid = user?.employer_uid;

  useEffect(()=>{
    if (!ownerUid) return;
    // Runs need their steps to tell which ones involve this employee
    api.getProcessRunsWithSteps()
      .then(r=>setRuns((r||[]).map(run=>({...run, steps:(run.steps||[]).map(s=>({...s, skill_name:s.skill_name||s.step_name}))}))))
      .catch(e=>toast(e.message,"error"))
      .finally(()=>setLoading(false));
    // This employee's own skills
    api.getMySkills().then(s=>setSkills(s||[])).catch(()=>{});
  },[]);

  const [stopRunD, setStopRunD] = useState(null);
  const [completeD, setCompleteD] = useState(null);
  const runAction = async (prid, action, psrid=null) => {
    if (action==='stop') { setStopRunD(runs.find(r=>r.prid===prid)||{prid}); return; }
    if (action==='complete-step') {
      const rn = runs.find(r=>r.prid===prid); const st = (rn?.steps||[]).find(x=>x.psrid===psrid);
      if (rn && st && isLastStep(rn, st)) { setCompleteD({run:rn, psrid}); return; }
    }
    setSaving(p=>({...p,[`${prid}-${action}-${psrid}`]:true}));
    try {
      let updated;
      if (action==='pause')    updated = await api.pauseRun(prid);
      else if (action==='resume') updated = await api.resumeRun(prid);
      else if (action==='stop')   updated = await api.stopRun(prid);
      else if (action==='start-step')    updated = await api.startStep(prid, psrid);
      else if (action==='complete-step') updated = await api.completeStep(prid, psrid);
      if (updated) setRuns(p=>p.map(r=>r.prid===updated.prid?updated:r));
    } catch(e){ toast(e.message,"error"); }
    finally{ setSaving(p=>({...p,[`${prid}-${action}-${psrid}`]:false})); }
  };

  const mySkidSet = new Set(skills.map(s=>String(s.skid)));

  // Determine if this employee is involved in a run
  const iInvolved = (run) => (run.steps||[]).some(s=>
    mySkidSet.has(String(s.skid)) || String(s.uid)===String(user?.uid));

  // Sort: in_progress first, then by started_at
  const sorted = [...runs].sort((a,b)=>{
    const order = { in_progress:0, on_hold:1, pending:2, completed:3, cancelled:4 };
    const ao = order[a.status]??5, bo = order[b.status]??5;
    if (ao!==bo) return ao-bo;
    return new Date(a.started_at) - new Date(b.started_at);
  });

  const fmtDur = (d,u) => {
    if (!d) return "—";
    return `${intDur(d)} ${durAbbr(u)}`;
  };

  const timeLeft = (step) => {
    if (step.status!=="in_progress"||!step.started_at) return null;
    const elapsed = (Date.now()-new Date(step.started_at).getTime())/1000;
    const durSecs = step.duration_unit==="hours"?Number(step.duration)*3600
      : step.duration_unit==="seconds"?Number(step.duration)
      : Number(step.duration)*60;
    const left = Math.max(0, durSecs - elapsed);
    if (left<1) return "due";
    const m = Math.floor(left/60), s = Math.floor(left%60);
    return m>0?`${m}m left`:`${s}s left`;
  };

  if (!ownerUid) return (
    <Page title={tl("Processes")}>
      <Empty className="rounded-2xl border border-border border-dashed bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon"><WorkflowIcon/></EmptyMedia>
          <EmptyDescription>
            {user?.is_manufacturer
              ? "Manage and run your processes from the Processes page."
              : "Not associated with a restaurant."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </Page>
  );

  const H = "h-10 px-4 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider";
  const busy = (prid, action, psrid=null) => !!saving[`${prid}-${action}-${psrid}`];

  return (
    <Page title={tl("My Processes")} actions={
      user?.is_manufacturer && (
        <Btn size="sm" variant="ghost" onClick={()=>setPage("processes")}><ArrowLeftIcon/>Process design</Btn>
      )
    }>
      {completeD&&<StopRunDialog run={completeD.run} mode="complete" psrid={completeD.psrid} toast={toast} onClose={()=>setCompleteD(null)}
        onStopped={u=>{ setRuns(p=>p.map(r=>r.prid===u.prid?u:r)); setCompleteD(null); }}/>}
      {stopRunD&&<StopRunDialog run={stopRunD} toast={toast} onClose={()=>setStopRunD(null)}
        onStopped={u=>{ setRuns(p=>p.map(r=>r.prid===u.prid?u:r)); setStopRunD(null); toast("Process stopped"); }}/>}
      {loading ? <Spinner/> : sorted.length===0 ? (
        <Empty className="rounded-2xl border border-border border-dashed bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon"><WorkflowIcon/></EmptyMedia>
            <EmptyDescription>{tl("No active processes. Processes will appear here when started by your restaurant.")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map(run=>{
            const involved = iInvolved(run);
            return (
              <Card key={run.prid} data-slot="emp-run" className={`gap-0 overflow-hidden py-0 ${involved&&run.status==="in_progress"?"border-brand/50":""}`}>
                {/* Card header */}
                <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5 ${involved?"":"bg-muted"}`}>
                  <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                    <span className="font-semibold">{run.process_name}</span>
                    <RunStatusBadge status={run.status}/>
                    {run.started_at&&<span className="text-muted-foreground text-xs">
                      {new Date(run.started_at).toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                    </span>}
                  </div>
                  {/* Run-level controls (for involved runs) */}
                  {involved && (
                    <div className="flex gap-1">
                      {run.status==="in_progress"&&<>
                        <Button size="icon-sm" variant="outline" aria-label="Pause" title="Pause" loading={busy(run.prid,"pause")} onClick={()=>runAction(run.prid,"pause")}><PauseIcon/></Button>
                        <Button size="icon-sm" variant="destructive-outline" aria-label="Stop" title="Stop" onClick={()=>runAction(run.prid,"stop")}><SquareIcon/></Button>
                      </>}
                      {run.status==="on_hold"&&<>
                        <Button size="icon-sm" aria-label="Resume" title="Resume" loading={busy(run.prid,"resume")} onClick={()=>runAction(run.prid,"resume")}><PlayIcon/></Button>
                        <Button size="icon-sm" variant="destructive-outline" aria-label="Stop" title="Stop" onClick={()=>runAction(run.prid,"stop")}><SquareIcon/></Button>
                      </>}
                    </div>
                  )}
                </div>

                {/* Steps table — only shown when employee is involved */}
                {involved ? (
                  <div className="border-border border-t [&_thead_tr]:bg-muted">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className={`${H} w-10`}>#</TableHead>
                          <TableHead className={H}>Step</TableHead>
                          <TableHead className={`${H} max-sm:hidden`}>Assignee</TableHead>
                          <TableHead className={`${H} max-sm:hidden`}>Duration</TableHead>
                          <TableHead className={H}>Status</TableHead>
                          <TableHead className="w-28"/>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(run.steps||[]).map(step=>{
                          const isMe = String(step.uid)===String(user?.uid);
                          const myStep = isMe || mySkidSet.has(String(step.skid));
                          const left = timeLeft(step);
                          return (
                            <TableRow key={step.psrid} data-state={isMe?"selected":undefined}>
                              <TableCell className={`${CELL} font-mono text-muted-foreground text-xs`}>{step.seq}</TableCell>
                              <TableCell className={`${CELL} ${isMe?"font-semibold":""}`}>
                                {step.skill_name}
                                {isMe&&<CBadge variant="outline" size="sm" className="ms-2 border-transparent bg-brand/16 text-accent-foreground">You</CBadge>}
                              </TableCell>
                              <TableCell className={`${CELL} text-muted-foreground max-sm:hidden`}>
                                {step.first_name?`${step.first_name} ${step.last_name||""}`.trim():"—"}
                              </TableCell>
                              <TableCell className={`${CELL} font-mono text-muted-foreground text-xs tabular-nums max-sm:hidden`}>
                                {fmtDur(step.duration, step.duration_unit)}
                              </TableCell>
                              <TableCell className={CELL}>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <RunStatusBadge status={step.status}/>
                                  {left&&<span className="text-muted-foreground text-xs tabular-nums">{left}</span>}
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-2 text-end">
                                {myStep && step.status==="pending" && run.status==="in_progress" && (
                                  <Btn size="sm" loading={busy(run.prid,"start-step",step.psrid)} onClick={()=>runAction(run.prid,"start-step",step.psrid)}><PlayIcon/>Start</Btn>
                                )}
                                {myStep && step.status==="in_progress" && (
                                  <Btn size="sm" loading={busy(run.prid,"complete-step",step.psrid)} onClick={()=>runAction(run.prid,"complete-step",step.psrid)}><CheckIcon/>Done</Btn>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="border-border border-t px-4 py-2.5 text-muted-foreground text-xs italic sm:px-5">
                    No steps requiring your skills in this process.
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </Page>
  );
}


// ─── EQUIPMENT PAGE ───────────────────────────────────────────────────────────
function EquipmentPage({ toast }) {
  const lang = useLangContext();
  const tl = k => lang==='ru'?(RU[k]||k):k;
  const [equipment, setEquipment] = useState([]);
  const [recipes,   setRecipes]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [editItem,  setEditItem]  = useState(null); // null=list, obj=edit, 'new'=new
  const [saving,    setSaving]    = useState(false);
  const [sortBy,    setSortBy]    = useState("name");

  const emptyForm = { name:"", items:[] };
  const [form, setForm] = useState(emptyForm);

  useEffect(()=>{
    Promise.all([api.getEquipment(), api.getRecipes()])
      .then(([e,r])=>{ setEquipment(e||[]); setRecipes(r||[]); })
      .catch(e=>toast(e.message,"error"))
      .finally(()=>setLoading(false));
  },[]);

  const STATUS_LABELS = { idle:"Idle", inactive:"Inactive", in_use:"In use" };

  const sorted = [...equipment].sort((a,b)=>{
    if (sortBy==="status") return a.status.localeCompare(b.status);
    return a.name.localeCompare(b.name);
  });

  const openNew  = () => { setForm(emptyForm); setEditItem("new"); };
  const openEdit = (eq) => {
    setForm({ name:eq.base_name, items:(eq.items||[]).map(it=>({rid:it.rid,volume:it.volume||"",item_name:it.item_name,unit_name:it.unit_name})) });
    setEditItem(eq);
  };

  const save = async () => {
    if (!form.name.trim()) { toast("Name required","error"); return; }
    setSaving(true);
    try {
      const payload = { name:form.name.trim(), items:form.items.filter(it=>it.rid) };
      if (editItem==="new") {
        const created = await api.createEquipment(payload);
        setEquipment(p=>[...p,{...created,item_count:created.items?.length||0}].sort((a,b)=>a.name.localeCompare(b.name)));
        toast(`"${created.name}" added`);
      } else {
        const updated = await api.updateEquipment(editItem.eid, payload);
        setEquipment(p=>p.map(e=>e.eid===updated.eid?{...updated,item_count:updated.items?.length||0}:e));
        toast(`"${updated.name}" saved`);
      }
      setEditItem(null);
    } catch(e){ toast(e.message,"error"); }
    finally{ setSaving(false); }
  };

  const del = async (eid) => {
    setDelEq(null);
    try { await api.deleteEquipment(eid); setEquipment(p=>p.filter(e=>e.eid!==eid)); if (editItem?.eid===eid) setEditItem(null); toast("Deleted"); }
    catch(e){ toast(e.message,"error"); }
  };

  const toggleStatus = async (eq) => {
    const newStatus = eq.status==='idle'?'inactive':'idle';
    try {
      const updated = await api.updateEquipment(eq.eid,{status:newStatus});
      setEquipment(p=>p.map(e=>e.eid===updated.eid?{...e,status:updated.status}:e));
    } catch(e){ toast(e.message,"error"); }
  };

  const addItem = () => setForm(p=>({...p,items:[...p.items,{rid:"",volume:"",item_name:"",unit_name:""}]}));
  const removeItem = i => setForm(p=>({...p,items:p.items.filter((_,j)=>j!==i)}));
  const setItemField = (i,k,v) => setForm(p=>({...p,items:p.items.map((it,j)=>j===i?{...it,[k]:v}:it)}));

  const [delEq, setDelEq] = useState(null);
  const pickItem = (i, rid) => {
    const r = recipes.find(x=>String(x.rid)===String(rid));
    setForm(p=>({...p, items:p.items.map((it,j)=>j===i?{...it, rid, unit_name:r?.units||"", item_name:r?.name||""}:it)}));
  };
  const EQ_BADGE = { idle:"bg-success/16 text-success-foreground", inactive:"bg-secondary text-muted-foreground", in_use:"bg-brand/16 text-accent-foreground" };
  const H = "h-11 px-4 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider";

  if (loading) return <Page title={tl("Equipment")}><Spinner/></Page>;

  return (
    <Page title={tl("Equipment")} actions={<Btn size="sm" onClick={openNew}><PlusIcon/>Equipment</Btn>}>

      {/* New / Edit form */}
      {editItem&&(
        <Card className="mb-6" style={{ animation:"fadeIn 0.2s ease" }}>
          <CardHeader>
            <CardTitle className="font-heading text-lg">{editItem==="new"?"New equipment":editItem.name}</CardTitle>
            <CardAction><Button variant="ghost" size="icon-sm" aria-label="Close" onClick={()=>setEditItem(null)}><XIcon/></Button></CardAction>
          </CardHeader>
          <CardPanel className="flex flex-col gap-5">
            <Input label="Name / Model" value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} required
              hint="If a unit with this name already exists, a sequence number will be appended automatically."/>

            {/* Items (capacity) */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm">Items (capacity)</span>
                <Btn size="sm" variant="secondary" onClick={addItem}><PlusIcon/>Add item</Btn>
              </div>
              {form.items.length===0&&<p className="text-muted-foreground text-sm italic">No items linked yet.</p>}
              {form.items.map((it,i)=>(
                <div key={i} data-slot="equipment-item" className="grid grid-cols-[1fr_7.5rem_auto] items-end gap-2.5">
                  <Select label={i===0?"Item":undefined} value={String(it.rid)} onChange={v=>pickItem(i,v)} placeholder="Select item…"
                    options={recipes.map(r=>({ label:r.name, value:r.rid }))}/>
                  <Field className="gap-1.5">
                    {i===0&&<FieldLabel>Capacity</FieldLabel>}
                    <div className="relative">
                      <CInput type="number" size="lg" value={it.volume} aria-label={`Capacity${it.unit_name?` (${it.unit_name})`:""}`}
                        onChange={e=>setItemField(i,"volume",e.target.value)} placeholder="e.g. 2" className={it.unit_name?"[&_input]:pe-10":""}/>
                      {it.unit_name&&<span className="-translate-y-1/2 pointer-events-none absolute end-3 top-1/2 text-muted-foreground text-xs">{it.unit_name}</span>}
                    </div>
                  </Field>
                  <Button variant="ghost" size="icon" aria-label="Remove item" className="text-muted-foreground hover:text-destructive-foreground" onClick={()=>removeItem(i)}><XIcon/></Button>
                </div>
              ))}
            </div>
          </CardPanel>
          <CardFooter className="justify-between gap-2 border-border border-t pt-4">
            <div>{editItem!=="new"&&<Btn variant="ghost" onClick={()=>setDelEq(editItem)} style={{ color:"var(--destructive-foreground)" }}><Trash2Icon/>Delete</Btn>}</div>
            <div className="flex gap-2">
              <Btn variant="ghost" onClick={()=>setEditItem(null)}>Cancel</Btn>
              <Btn onClick={save} loading={saving}>Save</Btn>
            </div>
          </CardFooter>
        </Card>
      )}

      {/* Equipment table */}
      {sorted.length===0 ? (editItem ? null : 
        <Empty className="rounded-2xl border border-border border-dashed bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon"><CookingPotIcon/></EmptyMedia>
            <EmptyTitle>No equipment yet</EmptyTitle>
            <EmptyDescription>Add ovens, mixers and other units, and how much of each item they hold.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent><Btn size="sm" onClick={openNew}><PlusIcon/>Equipment</Btn></EmptyContent>
        </Empty>
      ) : (
        <TableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={`${H} w-12`}>#</TableHead>
                <SortHead label="Name / Model" active={sortBy==="name"} dir="asc" onClick={()=>setSortBy("name")}/>
                <SortHead label="Status" active={sortBy==="status"} dir="asc" onClick={()=>setSortBy("status")}/>
                <TableHead className={`${H} max-sm:hidden`}>Items</TableHead>
                <TableHead className="w-36"/>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((eq,i)=>(
                <TableRow key={eq.eid}>
                  <TableCell className={`${CELL} font-mono text-muted-foreground text-xs`}>{i+1}</TableCell>
                  <TableCell className={CELL}>
                    <button type="button" data-slot="row-link" onClick={()=>{ openEdit(eq); window.scrollTo({top:0,behavior:"smooth"}); }}
                      className="text-start font-semibold underline decoration-dotted underline-offset-3 hover:decoration-solid">{eq.name}</button>
                  </TableCell>
                  <TableCell className={CELL}>
                    <CBadge variant="outline" className={`border-transparent font-semibold ${EQ_BADGE[eq.status]||EQ_BADGE.inactive}`}>{STATUS_LABELS[eq.status]||eq.status}</CBadge>
                  </TableCell>
                  <TableCell className={`${CELL} text-muted-foreground max-sm:hidden`}>{eq.item_count||0} item{eq.item_count!==1?"s":""}</TableCell>
                  <TableCell className="px-4 py-2">
                    <div className="flex items-center justify-end gap-1">
                      {eq.status!=="in_use"&&(
                        <Button variant="outline" size="xs" onClick={()=>toggleStatus(eq)}>
                          {eq.status==="idle"?<><PowerOffIcon/>Disable</>:<><PowerIcon/>Enable</>}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon-sm" aria-label={`Delete ${eq.name}`} title="Delete"
                        className="text-muted-foreground hover:text-destructive-foreground" onClick={()=>setDelEq(eq)}><Trash2Icon/></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableShell>
      )}

      <Dialog open={!!delEq} title={`Delete “${delEq?.name||""}”?`} onConfirm={()=>del(delEq.eid)} onCancel={()=>setDelEq(null)}>
        This cannot be undone.
      </Dialog>
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
  const [confirmRotate, setConfirmRotate] = useState(false);

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
    setConfirmRotate(false);
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
  const copy = text => { navigator.clipboard.writeText(text); toast("Copied!"); };
  const iframeSnippet = `<iframe\n  src="https://tanelu.com/order"\n  width="100%"\n  height="600"\n  frameborder="0"\n  style="border-radius:12px;border:1px solid #e8dcc8"\n  title="Board of Arrivals"\n></iframe>`;
  const snippets = [
    ["Single item", snippet("puncotta-item", ` rid="ITEM_ID"`)],
    ["Menu (carousel)", snippet("puncotta-menu", ` mid="${menus[0]?.mid||"MENU_ID"}" view="carousel"`)],
    ["Menu (table)", snippet("puncotta-menu", ` mid="${menus[0]?.mid||"MENU_ID"}" view="table"`)],
    ["All active menus", snippet("puncotta-menu", ` view="carousel"`)],
    ["Floating cart", snippet("puncotta-cart", ` float="bottom-right"`)],
    ["Board of Arrivals", iframeSnippet],
  ];
  const sec = (title, description, children) => (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="font-heading text-lg">{title}</CardTitle>
        {description&&<CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardPanel className="flex flex-col gap-4">{children}</CardPanel>
    </Card>
  );

  return (
    <Page title="Embedded Menu">
      <div className="mx-auto max-w-3xl">
      {/* Enable toggle */}
      <Card className="mb-4">
        <CardPanel className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div>
            <h3 className="font-heading font-semibold text-lg">Embedded menu</h3>
            <p className="text-muted-foreground text-sm">Allow your menu to be embedded on external websites</p>
          </div>
          <Label className="cursor-pointer font-normal text-muted-foreground">
            {S.enabled?"Enabled":"Disabled"}
            <Switch checked={!!S.enabled} disabled={saving} onCheckedChange={v=>save({enabled:!!v})} aria-label="Embedded menu"/>
          </Label>
        </CardPanel>
      </Card>

      {S.enabled && (<>
        {sec("Order settings", null, <>
          <Label className="cursor-pointer font-normal">
            <Checkbox checked={!!S.allow_order} onCheckedChange={v=>save({allow_order:!!v})}/>
            Allow ordering through embedded widget
          </Label>
          {S.allow_order && (
            <div className="flex flex-col gap-2">
              <span className="font-medium text-sm">Checkout mode</span>
              <RadioGroup value={S.checkout_mode||""} onValueChange={v=>save({checkout_mode:v})} className="grid gap-2 sm:grid-cols-2">
                {[["inline","Inline (complete order in widget)"],["redirect","Redirect to tanelu.com"]].map(([v,l])=>(
                  <Label key={v} className="cursor-pointer items-start gap-2.5 rounded-xl border border-border p-3 font-normal has-data-checked:border-brand/60 has-data-checked:bg-accent/50">
                    <Radio value={v}/>{l}
                  </Label>
                ))}
              </RadioGroup>
            </div>
          )}
        </>)}

        {sec("Allowed domains", "Leave empty to allow all domains, or add specific domains to restrict access", <>
          <form className="flex gap-2" onSubmit={e=>{ e.preventDefault(); addDomain(); }}>
            <CInput size="lg" value={domainInput} onChange={e=>setDomainInput(e.target.value)} placeholder="e.g. myrestaurant.com" aria-label="Domain" className="flex-1"/>
            <Button type="submit" size="lg" disabled={!domainInput.trim()}><PlusIcon/>Add</Button>
          </form>
          {(S.allowed_domains||[]).length===0 ? (
            <p className="text-muted-foreground text-sm italic">All domains allowed</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(S.allowed_domains||[]).map(d=>(
                <span key={d} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted py-1 ps-3 pe-1.5 text-sm">
                  <GlobeIcon className="size-3.5 text-muted-foreground"/>{d}
                  <button type="button" data-slot="domain-remove" aria-label={`Remove ${d}`} onClick={()=>removeDomain(d)}
                    className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"><XIcon className="size-3.5"/></button>
                </span>
              ))}
            </div>
          )}
        </>)}

        {sec("API key", null, <>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 basis-full break-all rounded-lg sm:basis-0 border border-border bg-muted px-3.5 py-2.5 font-mono text-[13px]">{S.api_key}</code>
            <Btn variant="secondary" size="sm" onClick={()=>copy(S.api_key)}><CopyIcon/>Copy</Btn>
            <Btn variant="ghost" size="sm" onClick={()=>setConfirmRotate(true)}><RefreshCwIcon/>Rotate</Btn>
          </div>
          <p className="text-muted-foreground text-xs">Keep this key secret. Include it as <code className="font-mono">api-key</code> attribute in all embed tags.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Btn variant="secondary" size="sm" onClick={testConnect} loading={testing}><PlugIcon/>Test connectivity</Btn>
            {testResult&&(
              <span className={`inline-flex items-center gap-1 font-medium text-sm ${testResult.ok?"text-success-foreground":"text-destructive-foreground"}`}>
                {testResult.ok?<CheckIcon className="size-4"/>:<XIcon className="size-4"/>}{testResult.msg}
              </span>
            )}
          </div>
        </>)}

        {sec("Embed snippets", null, <>
          {snippets.map(([label, code])=>(
            <div key={label} className="flex flex-col gap-1.5">
              <span className="font-medium text-sm">{label}</span>
              <div className="relative">
                <pre className="m-0 overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-border bg-muted py-3 ps-3.5 pe-20 font-mono text-xs">{code}</pre>
                <Button variant="outline" size="xs" className="absolute end-2 top-2" onClick={()=>copy(code)} aria-label={`Copy ${label} snippet`}><CopyIcon/>Copy</Button>
              </div>
            </div>
          ))}
        </>)}
      </>)}
      </div>

      <Dialog open={confirmRotate} title="Rotate the API key?" confirmLabel="Rotate" onCancel={()=>setConfirmRotate(false)} onConfirm={rotateKey}>
        Your existing embed snippets will stop working until updated.
      </Dialog>
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
    if (h.startsWith("#invite/")) return { type:"invite", token:h.slice(8) };
    if (h === "#order" || h.startsWith("#order") || window.location.pathname === "/order") return { type:"order" };
    if (/^\/market(\/|$)/.test(window.location.pathname)) return { type:"market" };
    if (h === "#signup") return { type:"signup" };
    return null;
  });

  const [page, setPageRaw] = useState(()=>{
    if (window.location.hash === "#signup") return "signup";
    // The Marketplace sends customers to My orders after checkout
    let next = null; try { next = sessionStorage.getItem("tanelu_next_page"); sessionStorage.removeItem("tanelu_next_page"); } catch {}
    if (user && next === "orders-cust" && !user.is_manufacturer) return "orders-cust";
    return user ? (user.is_manufacturer ? "orders-manuf" : "restaurants") : "login";
  });
  // Navigation asks first when the current page has unsaved work (see useLeaveGuard)
  const [leaveTo, setLeaveTo] = useState(null);
  const [leaveSaving, setLeaveSaving] = useState(false);
  const setPage = p => {
    if (_leaveGuard?.dirty()) { setLeaveTo({ page:p }); return; }
    setPageRaw(p);
  };
  const leaveNow = target => { _leaveGuard = null; setLeaveTo(null); if (target.logout) doLogout(); else setPageRaw(target.page); };
  const [activeMenu, setActiveMenu] = useState(null);
  const [storeSchedule, setStoreSchedule] = useState(DEFAULT_STORE);
  const [lang, setLang] = useLang();
  const [themePref, setThemePrefState] = useState(getThemePref);
  const [, bumpTheme] = useState(0);
  const setThemePref = p => {
    try { localStorage.setItem('theme', p); } catch {}
    applyTheme(p); setThemePrefState(p); bumpTheme(n => n + 1);
  };
  useEffect(() => {
    if (themePref !== 'system') return;
    let mq; try { mq = window.matchMedia('(prefers-color-scheme: dark)'); } catch { return; }
    const on = () => { applyTheme('system'); bumpTheme(n => n + 1); };
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, [themePref]);
  _currentLang = lang;
  const {toasts,toast,remove} = useToast();
  const doLogout=()=>{localStorage.removeItem("token");setUser(null);setPageRaw("login");};
  const logout=()=>{ if (_leaveGuard?.dirty()) { setLeaveTo({ logout:true }); return; } doLogout(); };
  const { notifs, dismiss, markSeen, unseenCount, refresh: refreshNotifs, period: notifPeriod, setPeriod: setNotifPeriod, showPeriod } = useNotifications(user);
  const onLogin = u => {
    setUser(u);
    setHashPage(null);
    setPage(u.is_manufacturer?"orders-manuf":"restaurants");
  };
  // Load name, logo and restaurant for the Nav (also after a page reload, when only the token is known)
  useEffect(()=>{
    if (!user?.uid) return;
    api.getProfile().then(p=>setUser(prev=>prev&&prev.uid===user.uid?{...prev,...p}:prev)).catch(()=>{});
  },[user?.uid]);
  // Clear #signup hash from URL after reading it
  useEffect(()=>{
    if (window.location.hash==="#signup") history.replaceState(null,"",window.location.pathname);
  },[]);

  // If a hash token is present, show the appropriate page regardless of auth state
  if (hashPage?.type === "order") return (
    <LangContext.Provider value={lang}>
      <style>{makeCss()}</style>
      <Toast toasts={toasts} remove={remove}/>
      <React.Suspense fallback={<div style={{minHeight:"100vh",background:G.cream}}/>}>
        <BoardOfArrivals toast={toast}/>
      </React.Suspense>
    </LangContext.Provider>
  );
  if (hashPage?.type === "market") return (
    <LangContext.Provider value={lang}>
      <style>{makeCss()}</style>
      <Toast toasts={toasts} remove={remove}/>
      <React.Suspense fallback={<div className="min-h-screen bg-background"/>}>
        <Marketplace toast={toast} user={user} onLogin={u=>setUser(u)}/>
      </React.Suspense>
    </LangContext.Provider>
  );
  if (hashPage?.type === "invite") return (
    <LangContext.Provider value={lang}>
      <style>{makeCss()}</style>
      <Toast toasts={toasts} remove={remove} />
      <InvitePage token={hashPage.token} setPage={p=>{setHashPage(null);setPage(p);}} toast={toast} onLogin={onLogin}/>
    </LangContext.Provider>
  );
  if (hashPage?.type === "reset") return (
    <LangContext.Provider value={lang}>
      <style>{makeCss()}</style>
      <Toast toasts={toasts} remove={remove} />
      <ResetPage token={hashPage.token} setPage={p=>{setHashPage(null);setPage(p);}} toast={toast} onLogin={onLogin}/>
    </LangContext.Provider>
  );
  if (hashPage?.type === "verify") return (
    <LangContext.Provider value={lang}>
      <style>{makeCss()}</style>
      <Toast toasts={toasts} remove={remove} />
      <VerifyPage token={hashPage.token} setPage={p=>{setHashPage(null);setPage(p);}} toast={toast} onLogin={onLogin}/>
    </LangContext.Provider>
  );
  return (
    <LangContext.Provider value={lang}>
      <style>{makeCss()}</style>
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
          <Nav user={user} page={page} setPage={setPage} logout={logout} lang={lang} setLang={setLang} notifProps={{ notifs, dismiss, markSeen, unseenCount, refresh: refreshNotifs, period: notifPeriod, setPeriod: setNotifPeriod, showPeriod }} themePref={themePref} setThemePref={setThemePref}/>
          {/* Floating "Yours, tanelu" balloon */}
          <div style={{position:"fixed",bottom:20,right:20,zIndex:500,
            background:G.white,border:`1px solid ${G.border}`,borderRadius:24,
            padding:"8px 14px",boxShadow:"0 4px 20px rgba(44,24,16,0.12)",
            display:"flex",alignItems:"center",gap:5,
            pointerEvents:"none",userSelect:"none"}}>
            <span style={{fontFamily:G.mono,fontSize:12,color:G.muted}}>Yours,</span>
            <span style={{display:"inline-flex",alignItems:"center",gap:0}}>
              <svg width="10" height="14" viewBox="0 0 12 16" fill="none" style={{display:"block",marginBottom:1}}>
                <rect x="0.5" y="0.5" width="11" height="4" fill={G.caramel}/>
                <circle cx="6" cy="11" r="4" fill={G.caramel}/>
              </svg>
              <span style={{fontFamily:"Georgia, serif",fontSize:15,fontWeight:600,
                color:G.caramel,letterSpacing:"-0.3px",lineHeight:1}}>tanelu</span>
            </span>
          </div>
          {(page==="inventory"||page==="products"||page==="items") &&<InventoryHub toast={toast} initial={page==="items"?"items":page==="products"?"products":undefined}/>}
          {page==="recipes"      &&<RecipesPage  toast={toast}/>}
          {page==="menus"        &&<MenusPage    toast={toast} storeSchedule={storeSchedule} setStoreSchedule={setStoreSchedule}/>}
          {page==="procurement"  &&<ProcurementPage toast={toast}/>}
          {page==="suppliers"    &&<SuppliersPage toast={toast}/>}
          {page==="reports"      &&<ReportsPage   toast={toast}/>}
          {page==="staff"        &&<StaffPage      user={user} toast={toast}/>}
          {page==="processes"    &&<ProcessesPage  user={user} setPage={setPage} toast={toast}/>}
          {page==="processes-emp" &&<EmployeeProcessesPage user={user} setPage={setPage} toast={toast}/>}
          {page==="equipment"    &&<EquipmentPage  toast={toast}/>}
          {page==="roster-emp"   &&<RosterPage            user={user} toast={toast}/>}
          {page==="embed"        &&<EmbedMenuPage toast={toast}/>}
          {(page==="orders-manuf"||page==="quick-sale") &&<OrdersHub toast={toast}/>}
          {page==="restaurants"  &&<RestaurantsPage setPage={setPage} setActiveMenu={setActiveMenu}/>}
          {page==="order"        &&<OrderPage menu={activeMenu} user={user} setPage={setPage} toast={toast}/>}
          {page==="orders-cust"  &&<OrdersCustPage toast={toast} setPage={setPage}/>}
          {page==="general"      &&<GeneralPage    user={user} setUser={setUser} toast={toast}/>}
          {page==="schedule"     &&<SchedulePage toast={toast} storeSchedule={storeSchedule} setStoreSchedule={setStoreSchedule}/>}
          <UnsavedDialog open={!!leaveTo} saving={leaveSaving}
            onCancel={()=>setLeaveTo(null)}
            onDiscard={()=>leaveNow(leaveTo)}
            onSave={async()=>{
              setLeaveSaving(true);
              try { if (await _leaveGuard?.save()) leaveNow(leaveTo); else setLeaveTo(null); }
              finally { setLeaveSaving(false); }
            }}/>
        </>
      )}
    </LangContext.Provider>
  );
}
