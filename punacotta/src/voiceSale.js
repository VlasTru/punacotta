// Parse a spoken/typed sale such as "sold three buns and two cheesecakes" or
// "продали три булочки и два чизкейка" into [{rid, qty}] against the item list.
// Pure functions (no DOM) so they can be tested in isolation.

const EN_UNITS = { zero:0, one:1, a:1, an:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10,
  eleven:11, twelve:12, thirteen:13, fourteen:14, fifteen:15, sixteen:16, seventeen:17, eighteen:18, nineteen:19,
  couple:2, dozen:12 };
const EN_TENS = { twenty:20, thirty:30, forty:40, fifty:50, sixty:60, seventy:70, eighty:80, ninety:90 };
const RU_UNITS = { ноль:0, один:1, одна:1, одно:1, одну:1, два:2, две:2, три:3, четыре:4, пять:5, шесть:6, семь:7,
  восемь:8, девять:9, десять:10, одиннадцать:11, двенадцать:12, тринадцать:13, четырнадцать:14, пятнадцать:15,
  шестнадцать:16, семнадцать:17, восемнадцать:18, девятнадцать:19, пара:2, дюжина:12, дюжину:12 };
const RU_TENS = { двадцать:20, тридцать:30, сорок:40, пятьдесят:50, шестьдесят:60, семьдесят:70, восемьдесят:80, девяносто:90 };

const CONJ = new Set(["and", "plus", "also", "и", "плюс", "еще", "а"]);
const FILLER = new Set(["sold", "sell", "sale", "i", "we", "ok", "okay", "tanelu", "please", "of", "the", "with", "to", "for",
  "продал", "продала", "продали", "продано", "продажа", "окей", "ок", "танелу", "пожалуйста", "я", "мы", "штук", "штуки", "штука", "шт", "с", "в"]);

const tokenize = text => (String(text||"").toLowerCase().replace(/ё/g, "е").match(/[\p{L}\p{N}]+/gu)) || [];

const stem = w => {
  if (/^\d+$/.test(w)) return w;
  if (/[а-я]/.test(w)) return w.length > 5 ? w.slice(0, 5) : w;
  if (w.length > 3) {
    if (/(ses|xes|ches|shes|zes)$/.test(w)) return w.slice(0, -2);
    if (w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  }
  return w;
};

// Number at tokens[i]: returns { n, len } or null (handles "twenty five", "двадцать пять", digits)
function numberAt(tokens, i) {
  const t = tokens[i];
  if (t === undefined) return null;
  if (/^\d+$/.test(t)) return { n: Number(t), len: 1 };
  if (t in EN_TENS || t in RU_TENS) {
    const tens = EN_TENS[t] ?? RU_TENS[t];
    const nx = tokens[i + 1];
    const u = nx !== undefined ? (EN_UNITS[nx] ?? RU_UNITS[nx]) : undefined;
    if (u !== undefined && u >= 1 && u <= 9) return { n: tens + u, len: 2 };
    return { n: tens, len: 1 };
  }
  const u = EN_UNITS[t] ?? RU_UNITS[t];
  return u !== undefined ? { n: u, len: 1 } : null;
}

function bestItem(phraseTokens, items) {
  const ph = new Set(phraseTokens.map(stem));
  const joined = phraseTokens.map(stem).join("");
  let best = null;
  for (const it of items) {
    const toks = tokenize(it.name).filter(w => !FILLER.has(w) && !CONJ.has(w)).map(stem);
    if (!toks.length) continue;
    let matched = toks.filter(t => ph.has(t)).length;
    if (!matched && toks.join("").length >= 5 && joined.includes(toks.join(""))) matched = toks.length;   // "cheese cake" ~ cheesecake
    if (!matched) continue;
    const score = matched / toks.length;
    if (score < 0.5) continue;
    const cand = { it, score, matched, size: toks.length };
    if (!best || cand.score > best.score || (cand.score === best.score && (cand.matched > best.matched || (cand.matched === best.matched && cand.size > best.size)))) best = cand;
  }
  return best && best.it;
}

export function parseVoiceSale(text, items) {
  const tokens = tokenize(text);
  const found = new Map();           // rid -> qty
  const missed = [];
  const addPhrase = (qty, phrase) => {
    // split the phrase on conjunctions; the first part takes the spoken quantity
    const parts = []; let cur = [];
    for (const w of phrase) { if (CONJ.has(w)) { if (cur.length) parts.push(cur); cur = []; } else cur.push(w); }
    if (cur.length) parts.push(cur);
    parts.forEach((p, idx) => {
      const meaningful = p.filter(w => !FILLER.has(w));
      if (!meaningful.length) return;
      const it = bestItem(meaningful, items);
      if (it) found.set(it.rid, (found.get(it.rid) || 0) + (idx === 0 ? qty : 1));
      else missed.push(meaningful.join(" "));
    });
  };
  let i = 0, qty = 1, phrase = [];
  const flush = () => { if (phrase.length) addPhrase(qty, phrase); phrase = []; qty = 1; };
  while (i < tokens.length) {
    const num = numberAt(tokens, i);
    // "a"/"an" are only quantities directly before an item word, not stray articles
    if (num && !(["a", "an"].includes(tokens[i]) && !tokens[i + 1])) { flush(); qty = num.n || 1; i += num.len; }
    else { phrase.push(tokens[i]); i++; }
  }
  flush();
  return { lines: [...found].map(([rid, q]) => ({ rid, qty: q })), missed };
}
