/**
 * OnThisDay — app.js
 * Fetches historical events from the free Wikipedia "On This Day" API
 * and renders them in a categorised, styled feed.
 *
 * API docs: https://en.wikipedia.org/api/rest_v1/#/Feed/onThisDay
 * No API key required. Free forever.
 */

/* ── Config ─────────────────────────────────────────────── */
const WIKI_API = "https://en.wikipedia.org/api/rest_v1/feed/onthisday";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

/* ── Category detection ─────────────────────────────────── */
const CATEGORY_RULES = [
  { cat: "conflict",    label: "Conflict",    keywords: ["war","battle","attack","invasion","bomb","fought","troops","military","siege","revolution","coup","assassination","killed","civil war","genocide","massacre","nuclear","missile"] },
  { cat: "science",     label: "Science",     keywords: ["discover","launch","spacecraft","orbit","telescope","gene","dna","theory","experiment","scientist","biology","physics","chemistry","vaccine","medical","astronaut","mission","probe","satellite","rover","genome"] },
  { cat: "exploration", label: "Exploration", keywords: ["expedition","explorer","voyage","sailed","summit","mount everest","pole","continent","discovered","landed","ocean","crossed"] },
  { cat: "politics",    label: "Politics",    keywords: ["president","prime minister","parliament","election","treaty","constitution","independence","republic","united nations","senate","congress","law","legislation","founded","established","government","colony","empire","king","queen","signed","ratif"] },
  { cat: "culture",     label: "Culture",     keywords: ["film","movie","album","music","novel","book","published","artist","painting","theatre","award","olympic","games","premiere","broadcast","television","radio","studio","record","concert","academy award","grammy"] },
  { cat: "sports",      label: "Sports",      keywords: ["champion","championship","tournament","league","cup","world cup","olympic","race","marathon","match","final","grand prix","gold medal","record","scored","won the","defeated"] },
  { cat: "disaster",    label: "Disaster",    keywords: ["earthquake","tsunami","hurricane","flood","eruption","volcano","fire","shipwreck","crash","disaster","famine","drought","explosion","storm","cyclone"] },
];

function categorise(text) {
  const lower = text.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(k => lower.includes(k))) {
      return { cat: rule.cat, label: rule.label };
    }
  }
  return { cat: "other", label: "History" };
}

/* ── Date helpers ───────────────────────────────────────── */
function getTodayParts() {
  const now = new Date();
  return {
    month: now.getMonth() + 1,           // 1-12
    day:   now.getDate(),                 // 1-31
    mm:    String(now.getMonth() + 1).padStart(2, "0"),
    dd:    String(now.getDate()).padStart(2, "0"),
    monthName: MONTHS[now.getMonth()],
    dayName:   DAYS[now.getDay()],
  };
}

/* ── DOM helpers ────────────────────────────────────────── */
const $  = id => document.getElementById(id);
const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") node.className = v;
    else if (k === "html")  node.innerHTML = v;
    else if (k === "href")  { node.href = v; }
    else node.setAttribute(k, v);
  });
  children.forEach(c => c && node.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
  return node;
};

/* ── Card builder ───────────────────────────────────────── */
function buildCard(event, featured = false) {
  const { year, pages = [], text = "" } = event;
  const summary = text || (pages[0]?.extract ?? "");
  const wikiTitle = pages[0]?.title;
  const wikiLink  = wikiTitle
    ? `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitle)}`
    : null;

  // Truncate description
  const desc = summary.length > 160
    ? summary.slice(0, summary.lastIndexOf(" ", 160)) + "…"
    : summary;

  const { cat, label } = categorise(text + " " + summary);

  const card = el("article", { class: `event-card cat-${cat}${featured ? " featured fade-in" : " fade-in"}` });

  card.appendChild(el("p", { class: "card-year" }, String(year)));
  card.appendChild(el("h2", { class: "card-headline" }, text));

  if (featured && desc) {
    card.appendChild(el("p", { class: "card-desc" }, desc));
  }

  const bottom = el("div", { class: "card-bottom", style: "display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;" });
  bottom.appendChild(el("span", { class: "card-tag" }, label));

  if (wikiLink) {
    const link = el("a", { class: "card-wiki-link", href: wikiLink, target: "_blank", rel: "noopener" });
    link.innerHTML = `Read more <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 10L10 2M10 2H5M10 2V7"/></svg>`;
    bottom.appendChild(link);
  }

  card.appendChild(bottom);
  return card;
}

/* ── Pill builder ───────────────────────────────────────── */
function buildPill(event) {
  const pill = el("div", { class: "fact-pill fade-in" });
  pill.appendChild(el("span", { class: "pill-year" }, String(event.year)));
  const snippet = event.text.length > 70
    ? event.text.slice(0, event.text.lastIndexOf(" ", 70)) + "…"
    : event.text;
  pill.appendChild(document.createTextNode(snippet));
  return pill;
}

/* ── Birth card builder ─────────────────────────────────── */
function buildBirthCard(birth) {
  const { year, pages = [], text = "" } = birth;
  const page = pages[0];
  const name  = page?.title ?? text.split(",")[0].trim();
  const role  = page?.description ?? text.split(",").slice(1).join(",").trim();
  
  // ADDED: .filter(Boolean) to prevent crashes if there are extra spaces in the name string
  const initials = name.split(" ").filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase();
  
  const wikiLink = page?.title
    ? `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`
    : null;

  const card = el("div", { class: "birth-card fade-in" });
  const avatar = el("div", { class: "birth-avatar" }, initials);
  card.appendChild(avatar);

  const info = el("div");
  const nameEl = wikiLink
    ? Object.assign(el("a", { href: wikiLink, target: "_blank", rel: "noopener",
        style: "color:inherit;text-decoration:none;" }), { textContent: name })
    : el("span", {}, name);
  const nameWrap = el("div", { class: "birth-name" });
  nameWrap.appendChild(nameEl);
  info.appendChild(nameWrap);
  info.appendChild(el("div", { class: "birth-year" }, String(year)));
  if (role) info.appendChild(el("div", { class: "birth-desc" }, role.slice(0, 60)));
  card.appendChild(info);
  return card;
}

/* ── Render all sections ────────────────────────────────── */
function render(data, date) {
  const { events = [], births = [], deaths = [] } = data;

  /* Sort events by absolute year so oldest come last in pills */
  const sorted = [...events].sort((a, b) => b.year - a.year);

  /* Featured: two most "significant" (heuristic: longer text = more notable) */
  const byLength  = [...sorted].sort((a, b) => (b.text?.length ?? 0) - (a.text?.length ?? 0));
  const featured  = byLength.slice(0, 2);
  const regular   = byLength.slice(2, 11);   // next 9 as grid cards
  const pills     = sorted.slice(0, 6).filter(e => !featured.includes(e) && !regular.includes(e));

  /* Hero */
  $("hero-dayname").textContent = date.dayName;
  $("hero-month").textContent   = date.monthName;
  $("hero-day").textContent     = String(date.day);
  $("hero-meta").textContent    = `${events.length} events · ${births.length} notable births`;

  /* Featured row */
  const fr = $("featured-row");
  fr.innerHTML = "";
  featured.forEach(e => fr.appendChild(buildCard(e, true)));

  /* Events grid */
  const eg = $("events-grid");
  eg.innerHTML = "";
  regular.forEach(e => eg.appendChild(buildCard(e, false)));

  /* Pills */
  const pw = $("pills-wrap");
  pw.innerHTML = "";
  pills.forEach(e => pw.appendChild(buildPill(e)));

  /* If no pills, hide that section */
  if (!pills.length) {
    pw.closest(".births-section") && pw.closest(".births-section").remove();
    pw.previousElementSibling?.remove();
    pw.remove();
  }

  /* Births */
  const bg = $("births-grid");
  bg.innerHTML = "";
  births.slice(0, 12).forEach(b => bg.appendChild(buildBirthCard(b)));

  /* Fade out skeleton */
  const skeleton = $("skeleton-overlay");
  skeleton.classList.add("hidden");
  setTimeout(() => skeleton.remove(), 500);
}

/* ── Error state ────────────────────────────────────────── */
function showError(message) {
  const skeleton = $("skeleton-overlay");
  if (skeleton) { skeleton.classList.add("hidden"); setTimeout(() => skeleton.remove(), 500); }

  const main = document.querySelector("main");
  main.innerHTML = `
    <div class="error-state">
      <h2>Something went wrong</h2>
      <p>${message}</p>
      <p style="margin-top:1rem;font-size:13px;color:var(--ink-ghost)">
        Try refreshing, or check your internet connection.
      </p>
    </div>`;
}

/* ── Main fetch ─────────────────────────────────────────── */
async function init() {
  const date = getTodayParts();

  // Set date in hero immediately (looks snappy)
  $("hero-dayname").textContent = date.dayName;
  $("hero-month").textContent   = date.monthName;
  $("hero-day").textContent     = String(date.day);

  // CHANGED: From /events/ to /all/ so Wikipedia returns events, births, AND deaths
  const url = `${WIKI_API}/all/${date.mm}/${date.dd}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" }
    });

    if (!res.ok) throw new Error(`Wikipedia API returned ${res.status}`);

    const data = await res.json();
    render(data, date);

  } catch (err) {
    console.error("Failed to load events:", err);
    showError("Could not load today's events from Wikipedia.");
  }
}
/* ── Theme Toggle Logic ─────────────────────────────────── */
const themeToggle = $('theme-toggle');
const moonIcon = $('moon-icon');
const sunIcon = $('sun-icon');

const savedTheme = localStorage.getItem('theme');
const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
  document.documentElement.setAttribute('data-theme', 'dark');
  moonIcon.style.display = 'none';
  sunIcon.style.display = 'block';
}

themeToggle.addEventListener('click', () => {
  if (document.documentElement.getAttribute('data-theme') === 'dark') {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('theme', 'light');
    moonIcon.style.display = 'block';
    sunIcon.style.display = 'none';
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
    moonIcon.style.display = 'none';
    sunIcon.style.display = 'block';
  }
});

document.addEventListener("DOMContentLoaded", init);
