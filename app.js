const $ = (id) => document.getElementById(id);

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
  frameNotice: $("frameNotice"),
  browserBack: $("browserBack"),
  browserForward: $("browserForward"),
  browserReload: $("browserReload")
};

const API_BASE = String(window.1117_API_BASE || "").replace(/\/+$/, "");

let navHistory = [];
let navIndex = -1;

function show(name) {
  el.home.classList.toggle("hidden", name !== "home");
  el.results.classList.toggle("hidden", name !== "results");
  el.browser.classList.toggle("hidden", name !== "browser");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[ch]));
}

function normalizeUrl(value) {
  let text = value.trim();
  if (!text) return null;
  if (!/^https?:\/\//i.test(text)) text = "https://" + text;

  try {
    return new URL(text).href;
  } catch {
    return null;
  }
}

function looksLikeUrl(text) {
  return /^https?:\/\//i.test(text.trim()) ||
         /^([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i.test(text.trim());
}

function setMode(mode) {
  el.mode.value = mode;
  el.resultsMode.value = mode;
}

function openWebsite(value, addHistory = true) {
  const url = normalizeUrl(value);

  if (!url) {
    alert("Please enter a valid website address.");
    return;
  }

  if (addHistory) {
    navHistory = navHistory.slice(0, navIndex + 1);
    navHistory.push(url);
    navIndex++;
  }

  el.urlInput.value = url;
  el.frameNotice.classList.add("hidden");
  el.frame.src = url;
  show("browser");

  try {
    document.title = "1117 · " + new URL(url).hostname;
  } catch {}
}

function moveBrowserHistory(amount) {
  const next = navIndex + amount;
  if (next < 0 || next >= navHistory.length) return;
  navIndex = next;
  openWebsite(navHistory[navIndex], false);
}

async function handleQuery(raw, mode) {
  const q = raw.trim();
  if (!q) return;

  if (mode === "website" || looksLikeUrl(q)) {
    openWebsite(q);
    return;
  }

  if (mode === "calculator") {
    renderCalculator(q);
    return;
  }

  if (
    mode === "weather" ||
    /^weather\b/i.test(q) ||
    /^what(?:'|’)s today's weather\b/i.test(q)
  ) {
    await renderWeather(q);
    return;
  }

  if (/^(hi|hello|hey)\b/i.test(q)) {
    el.resultsList.innerHTML = `
      <div class="info-card">
        <h2>Hello from 1117 👋</h2>
        <p>Use 1117 to search the web, open a URL, check weather, or calculate something.</p>
      </div>`;
    el.status.textContent = "1117";
    show("results");
    return;
  }

  await searchWeb(q);
}

async function searchWeb(query) {
  el.status.textContent = "Searching…";
  el.resultsList.innerHTML = "";
  show("results");

  try {
    const endpoint = API_BASE
      ? `${API_BASE}/api/search?q=${encodeURIComponent(query)}`
      : `/api/search?q=${encodeURIComponent(query)}`;

    const response = await fetch(endpoint);
    const data = await response.json();

    if (!response.ok) throw new Error(data.error || "Search failed.");

    const items = Array.isArray(data.items) ? data.items : [];
    el.status.textContent = items.length
      ? `${items.length} result${items.length === 1 ? "" : "s"}`
      : "No results";

    if (!items.length) {
      el.resultsList.innerHTML = `
        <div class="result-card">
          <h2>No results found</h2>
          <p>Try another search.</p>
        </div>`;
      return;
    }

    items.forEach(item => {
      const card = document.createElement("article");
      card.className = "result-card";

      const title = document.createElement("h2");
      const button = document.createElement("button");
      button.className = "result-link-button";
      button.textContent = item.title || item.link;
      button.addEventListener("click", () => openWebsite(item.link));
      title.appendChild(button);

      const url = document.createElement("div");
      url.className = "result-url";
      url.textContent = item.link;

      const snippet = document.createElement("div");
      snippet.className = "result-snippet";
      snippet.textContent = item.snippet || "";

      card.append(title, url, snippet);
      el.resultsList.appendChild(card);
    });
  } catch (error) {
    el.status.textContent = "Search unavailable";
    const extra = API_BASE
      ? "Check your Google API settings on Railway."
      : "On GitHub Pages, set your Railway URL in config.js.";

    el.resultsList.innerHTML = `
      <div class="result-card">
        <h2>1117 search backend is not connected</h2>
        <p>${escapeHtml(error.message)}</p>
        <p>${extra}</p>
      </div>`;
  }
}

function renderCalculator(input) {
  const expr = input.replace(/^calc(?:ulate)?\s*/i, "").trim();

  if (!/^[0-9+\-*/%().\s^]+$/.test(expr)) {
    el.status.textContent = "Calculator";
    el.resultsList.innerHTML = `
      <div class="info-card">
        <h2>Calculator</h2>
        <p>Use numbers with +, -, *, /, %, parentheses, and ^.</p>
      </div>`;
    show("results");
    return;
  }

  try {
    const safe = expr.replace(/\^/g, "**");
    const value = Function(`"use strict"; return (${safe})`)();

    if (!Number.isFinite(value)) throw new Error("Invalid result");

    el.status.textContent = "Calculator";
    el.resultsList.innerHTML = `
      <div class="info-card">
        <h2>${escapeHtml(expr)}</h2>
        <div class="big-number">${escapeHtml(value)}</div>
      </div>`;
    show("results");
  } catch {
    el.status.textContent = "Calculator";
    el.resultsList.innerHTML = `
      <div class="info-card">
        <h2>Could not calculate that</h2>
        <p>Try something like <b>25 * 4 + 7</b>.</p>
      </div>`;
    show("results");
  }
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
    const geo = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=en&format=json`
    ).then(r => r.json());

    if (!geo.results?.length) throw new Error(`Could not find "${place}".`);

    const loc = geo.results[0];

    const weather = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph`
    ).then(r => r.json());

    const c = weather.current;

    el.status.textContent = "Weather";
    el.resultsList.innerHTML = `
      <div class="info-card">
        <h2>${escapeHtml(loc.name)}, ${escapeHtml(loc.country || "")}</h2>
        <div class="big-number">${Math.round(c.temperature_2m)}°F</div>
        <p><b>${escapeHtml(weatherDescription(c.weather_code))}</b></p>
        <p>Feels like ${Math.round(c.apparent_temperature)}°F · Wind ${Math.round(c.wind_speed_10m)} mph</p>
      </div>`;
  } catch (error) {
    el.status.textContent = "Weather error";
    el.resultsList.innerHTML = `
      <div class="result-card">
        <h2>Could not get weather</h2>
        <p>${escapeHtml(error.message)}</p>
      </div>`;
  }
}

function weatherDescription(code) {
  const descriptions = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Light rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Light snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Rain showers",
    81: "Rain showers",
    82: "Heavy rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Thunderstorm with hail"
  };
  return descriptions[code] || "Current conditions";
}

el.searchForm.addEventListener("submit", e => {
  e.preventDefault();
  handleQuery(el.query.value, el.mode.value);
});

el.resultsForm.addEventListener("submit", e => {
  e.preventDefault();
  handleQuery(el.resultsQuery.value, el.resultsMode.value);
});

el.backHome.addEventListener("click", () => {
  show("home");
  document.title = "1117 Search";
});

el.urlForm.addEventListener("submit", e => {
  e.preventDefault();
  openWebsite(el.urlInput.value);
});

el.browserBack.addEventListener("click", () => moveBrowserHistory(-1));
el.browserForward.addEventListener("click", () => moveBrowserHistory(1));
el.browserReload.addEventListener("click", () => {
  try {
    el.frame.contentWindow.location.reload();
  } catch {
    el.frame.src = el.frame.src;
  }
});

el.frame.addEventListener("load", () => {
  el.frameNotice.textContent =
    "This website is being displayed inside 1117. Some sites block iframe embedding, so those sites may refuse to load here.";
  el.frameNotice.classList.remove("hidden");
});

el.menuButton.addEventListener("click", () => {
  const nowHidden = el.menu.classList.toggle("hidden");
  el.menuButton.setAttribute("aria-expanded", String(!nowHidden));
});

document.querySelectorAll("[data-mode]").forEach(button => {
  button.addEventListener("click", () => {
    const mode = button.dataset.mode;
    el.menu.classList.add("hidden");

    if (mode === "home") {
      show("home");
      return;
    }

    setMode(mode);
    el.query.focus();
  });
});

document.querySelectorAll("[data-fill]").forEach(button => {
  button.addEventListener("click", () => {
    const value = button.dataset.fill;
    el.query.value = value;

    if (value.startsWith("weather")) setMode("weather");
    else if (value.startsWith("http")) setMode("website");
    else if (/^[0-9]/.test(value)) setMode("calculator");
    else setMode("search");

    handleQuery(value, el.mode.value);
  });
});

document.addEventListener("keydown", e => {
  if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
    e.preventDefault();
    el.query.focus();
  }
});
