const $ = id => document.getElementById(id);

const el = {
  home: $("homeView"),
  results: $("resultsView"),
  browser: $("browserView"),
  menu: $("menu"),
  menuButton: $("menuButton"),
  searchForm: $("searchForm"),
  query: $("queryInput"),
  mode: $("modeSelect"),
  resultsForm: $("resultsSearchForm"),
  resultsQuery: $("resultsQuery"),
  resultsMode: $("resultsMode"),
  status: $("status"),
  resultsList: $("resultsList"),
  backHome: $("backHome"),
  urlForm: $("urlForm"),
  urlInput: $("urlInput"),
  frame: $("siteFrame"),
  notice: $("frameNotice"),
  browserBack: $("browserBack"),
  browserForward: $("browserForward"),
  browserReload: $("browserReload")
};

const API_BASE = String(window["1117_API_BASE"] || "").replace(/\/+$/, "");
let navHistory = [];
let navIndex = -1;

function show(page) {
  el.home.classList.toggle("hidden", page !== "home");
  el.results.classList.toggle("hidden", page !== "results");
  el.browser.classList.toggle("hidden", page !== "browser");
}

function escapeHtml(v) {
  return String(v).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}

function normalizeUrl(value) {
  let v = value.trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) v = "https://" + v;
  try { return new URL(v).href; } catch { return null; }
}

function looksLikeUrl(value) {
  const v = value.trim();
  return /^https?:\/\//i.test(v) || /^([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i.test(v);
}

function setMode(mode) {
  el.mode.value = mode;
  el.resultsMode.value = mode;
}

async function openWebsite(raw, addHistory = true) {
  const url = normalizeUrl(raw);
  if (!url) {
    alert("Enter a valid website URL.");
    return;
  }

  try {
    el.status.textContent = "Opening website…";
    const endpoint = `${API_BASE}/api/open?url=${encodeURIComponent(url)}`;
    const response = await fetch(endpoint);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not open the website.");

    if (addHistory) {
      navHistory = navHistory.slice(0, navIndex + 1);
      navHistory.push(data.path);
      navIndex++;
    }

    el.urlInput.value = url;
    el.notice.classList.add("hidden");
    el.frame.src = API_BASE + data.path;
    show("browser");
    document.title = "1117";
  } catch (err) {
    show("browser");
    el.notice.textContent = err.message;
    el.notice.classList.remove("hidden");
  }
}

function moveHistory(amount) {
  const next = navIndex + amount;
  if (next < 0 || next >= navHistory.length) return;
  navIndex = next;
  el.frame.src = API_BASE + navHistory[navIndex];
}

async function handleQuery(raw, mode) {
  const q = raw.trim();
  if (!q) return;

  if (mode === "website" || looksLikeUrl(q)) {
    await openWebsite(q);
    return;
  }

  if (mode === "calculator") {
    renderCalculator(q);
    return;
  }

  if (mode === "weather" || /^weather\b/i.test(q) || /^what(?:'|’)s today's weather\b/i.test(q)) {
    await renderWeather(q);
    return;
  }

  if (/^(hi|hello|hey)\b/i.test(q)) {
    el.status.textContent = "1117";
    el.resultsList.innerHTML = `
      <div class="card">
        <h2>Hello from 1117 👋</h2>
        <p>Search the web, open a website, check weather, or calculate something.</p>
      </div>`;
    show("results");
    return;
  }

  await searchWeb(q);
}

async function searchWeb(q) {
  el.status.textContent = "Searching…";
  el.resultsList.innerHTML = "";
  show("results");

  try {
    const response = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(q)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Search failed.");

    const items = data.items || [];
    el.status.textContent = items.length ? `${items.length} results` : "No results";

    if (!items.length) {
      el.resultsList.innerHTML = `<div class="result"><h2>No results found</h2><p>Try another search.</p></div>`;
      return;
    }

    for (const item of items) {
      const card = document.createElement("article");
      card.className = "result";

      const h = document.createElement("h2");
      const b = document.createElement("button");
      b.textContent = item.title || item.link;
      b.addEventListener("click", () => openWebsite(item.link));
      h.appendChild(b);

      const url = document.createElement("div");
      url.className = "result-url";
      url.textContent = item.link;

      const snippet = document.createElement("div");
      snippet.className = "result-snippet";
      snippet.textContent = item.snippet || "";

      card.append(h, url, snippet);
      el.resultsList.appendChild(card);
    }
  } catch (err) {
    el.status.textContent = "Search error";
    el.resultsList.innerHTML = `
      <div class="result">
        <h2>1117 backend is not connected</h2>
        <p>${escapeHtml(err.message)}</p>
        <p>Run the project on Railway, or set window["1117_API_BASE"] in config.js to your Railway URL.</p>
      </div>`;
  }
}

function renderCalculator(input) {
  const expr = input.replace(/^calc(?:ulate)?\s*/i, "").trim();
  el.status.textContent = "Calculator";

  if (!/^[0-9+\-*/%().\s^]+$/.test(expr)) {
    el.resultsList.innerHTML = `<div class="card"><h2>Calculator</h2><p>Example: <b>25 * 4 + 7</b></p></div>`;
    show("results");
    return;
  }

  try {
    const value = Function(`"use strict"; return (${expr.replace(/\^/g, "**")})`)();
    if (!Number.isFinite(value)) throw new Error("Invalid result");
    el.resultsList.innerHTML = `<div class="card"><h2>${escapeHtml(expr)}</h2><div class="big">${escapeHtml(value)}</div></div>`;
  } catch {
    el.resultsList.innerHTML = `<div class="card"><h2>Could not calculate that</h2></div>`;
  }
  show("results");
}

async function renderWeather(query) {
  const place = query
    .replace(/^what(?:'|’)s today's weather(?: like)?(?: in)?\s*/i, "")
    .replace(/^weather(?: in)?\s*/i, "")
    .trim() || "Seattle";

  el.status.textContent = "Getting weather…";
  el.resultsList.innerHTML = "";
  show("results");

  try {
    const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=en&format=json`).then(r => r.json());
    if (!geo.results?.length) throw new Error(`Could not find "${place}".`);

    const loc = geo.results[0];
    const weather = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph`
    ).then(r => r.json());

    const c = weather.current;
    el.status.textContent = "Weather";
    el.resultsList.innerHTML = `
      <div class="card">
        <h2>${escapeHtml(loc.name)}, ${escapeHtml(loc.country || "")}</h2>
        <div class="big">${Math.round(c.temperature_2m)}°F</div>
        <p><b>${escapeHtml(weatherDescription(c.weather_code))}</b></p>
        <p>Feels like ${Math.round(c.apparent_temperature)}°F · Wind ${Math.round(c.wind_speed_10m)} mph</p>
      </div>`;
  } catch (err) {
    el.status.textContent = "Weather error";
    el.resultsList.innerHTML = `<div class="result"><h2>Could not get weather</h2><p>${escapeHtml(err.message)}</p></div>`;
  }
}

function weatherDescription(code) {
  const m = {
    0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",
    45:"Fog",48:"Rime fog",51:"Light drizzle",53:"Moderate drizzle",
    55:"Dense drizzle",61:"Light rain",63:"Moderate rain",65:"Heavy rain",
    71:"Light snow",73:"Moderate snow",75:"Heavy snow",
    80:"Rain showers",81:"Rain showers",82:"Heavy rain showers",
    95:"Thunderstorm",96:"Thunderstorm with hail",99:"Thunderstorm with hail"
  };
  return m[code] || "Current conditions";
}

el.searchForm.addEventListener("submit", e => {
  e.preventDefault();
  handleQuery(el.query.value, el.mode.value);
});
el.resultsForm.addEventListener("submit", e => {
  e.preventDefault();
  handleQuery(el.resultsQuery.value, el.resultsMode.value);
});
el.backHome.addEventListener("click", () => show("home"));
el.urlForm.addEventListener("submit", e => {
  e.preventDefault();
  openWebsite(el.urlInput.value);
});
el.browserBack.addEventListener("click", () => moveHistory(-1));
el.browserForward.addEventListener("click", () => moveHistory(1));
el.browserReload.addEventListener("click", () => {
  try { el.frame.contentWindow.location.reload(); }
  catch { el.frame.src = el.frame.src; }
});
el.frame.addEventListener("load", () => {
  el.notice.textContent =
    "Loaded through 1117. Some complex sites may still limit features such as logins, WebSockets, DRM, or browser-specific APIs.";
  el.notice.classList.remove("hidden");
});

el.menuButton.addEventListener("click", () => {
  const hidden = el.menu.classList.toggle("hidden");
  el.menuButton.setAttribute("aria-expanded", String(!hidden));
});

document.querySelectorAll("[data-mode]").forEach(btn => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode;
    el.menu.classList.add("hidden");
    if (mode === "home") {
      show("home");
      return;
    }
    setMode(mode);
    el.query.focus();
  });
});

document.querySelectorAll("[data-fill]").forEach(btn => {
  btn.addEventListener("click", () => {
    const value = btn.dataset.fill;
    el.query.value = value;
    if (value.startsWith("weather")) setMode("weather");
    else if (value.startsWith("http")) setMode("website");
    else if (/^[0-9]/.test(value)) setMode("calculator");
    else setMode("search");
    handleQuery(value, el.mode.value);
  });
});
