const $ = (id) => document.getElementById(id);

const els = {
  homeView: $("homeView"),
  resultsView: $("resultsView"),
  browserView: $("browserView"),
  searchForm: $("searchForm"),
  queryInput: $("queryInput"),
  modeSelect: $("modeSelect"),
  resultsSearchForm: $("resultsSearchForm"),
  resultsQuery: $("resultsQuery"),
  resultsMode: $("resultsMode"),
  resultsList: $("resultsList"),
  resultStatus: $("resultStatus"),
  menu: $("menu"),
  menuButton: $("menuButton"),
  backHome: $("backHome"),
  siteFrame: $("siteFrame"),
  urlForm: $("urlForm"),
  urlInput: $("urlInput"),
  browserBack: $("browserBack"),
  browserForward: $("browserForward"),
  browserReload: $("browserReload"),
  frameNotice: $("frameNotice")
};

let historyStack = [];
let historyIndex = -1;

function show(view) {
  els.homeView.classList.toggle("hidden", view !== "home");
  els.resultsView.classList.toggle("hidden", view !== "results");
  els.browserView.classList.toggle("hidden", view !== "browser");
}

function normalizeUrl(value) {
  let v = value.trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) v = "https://" + v;
  try {
    return new URL(v).href;
  } catch {
    return null;
  }
}

function looksLikeUrl(text) {
  return /^https?:\/\//i.test(text.trim()) || /^([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i.test(text.trim());
}

function setMode(mode) {
  els.modeSelect.value = mode;
  els.resultsMode.value = mode;
}

function openUrl(rawUrl, addHistory = true) {
  const url = normalizeUrl(rawUrl);
  if (!url) {
    alert("That does not look like a valid website URL.");
    return;
  }

  if (addHistory) {
    historyStack = historyStack.slice(0, historyIndex + 1);
    historyStack.push(url);
    historyIndex++;
  }

  els.urlInput.value = url;
  els.frameNotice.classList.add("hidden");
  els.siteFrame.src = url;
  show("browser");
  document.title = `1117 · ${new URL(url).hostname}`;
}

function navigateHistory(delta) {
  const next = historyIndex + delta;
  if (next < 0 || next >= historyStack.length) return;
  historyIndex = next;
  openUrl(historyStack[historyIndex], false);
}

async function runSearch(query, mode) {
  query = query.trim();
  if (!query) return;

  if (mode === "website" || looksLikeUrl(query)) {
    openUrl(query);
    return;
  }

  if (mode === "calculator") {
    renderCalculator(query);
    return;
  }

  if (mode === "weather" || /^what(?:'|’)s today's weather\b/i.test(query) || /^weather\b/i.test(query)) {
    await renderWeather(query);
    return;
  }

  if (/^(hi|hello|hey)\b/i.test(query)) {
    els.resultsList.innerHTML = `
      <div class="greeting-card">
        <h2>Hello from 1117 👋</h2>
        <p>Ask me to search the web, open a URL, check weather, or calculate something.</p>
      </div>`;
    els.resultStatus.textContent = "1117";
    show("results");
    return;
  }

  els.resultStatus.textContent = "Searching…";
  els.resultsList.innerHTML = "";
  show("results");

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Search failed.");

    const items = Array.isArray(data.items) ? data.items : [];
    els.resultStatus.textContent = items.length
      ? `${items.length} result${items.length === 1 ? "" : "s"}`
      : "No results";

    if (!items.length) {
      els.resultsList.innerHTML = `
        <div class="result-card">
          <h3>No results found</h3>
          <p>Try a different search.</p>
        </div>`;
      return;
    }

    for (const item of items) {
      const card = document.createElement("article");
      card.className = "result-card";

      const title = document.createElement("h3");
      const button = document.createElement("button");
      button.textContent = item.title || item.link;
      button.addEventListener("click", () => openUrl(item.link));
      title.appendChild(button);

      const url = document.createElement("div");
      url.className = "result-url";
      url.textContent = item.link;

      const snippet = document.createElement("div");
      snippet.className = "result-snippet";
      snippet.textContent = item.snippet || "";

      card.append(title, url, snippet);
      els.resultsList.appendChild(card);
    }
  } catch (error) {
    els.resultStatus.textContent = "Search error";
    els.resultsList.innerHTML = `
      <div class="result-card">
        <h3>Search is not configured yet</h3>
        <p>${escapeHtml(error.message)}</p>
        <p>Set GOOGLE_API_KEY and GOOGLE_CX in your server environment, then restart 1117.</p>
      </div>`;
  }
}

function renderCalculator(expression) {
  const cleaned = expression.replace(/^calc(?:ulate)?\s*/i, "").trim();

  if (!/^[0-9+\-*/%().\s^]+$/.test(cleaned)) {
    els.resultsList.innerHTML = `
      <div class="calc-card">
        <h2>Calculator</h2>
        <p>Use numbers and +, -, *, /, %, parentheses, and ^.</p>
      </div>`;
    els.resultStatus.textContent = "Calculator";
    show("results");
    return;
  }

  try {
    const safe = cleaned.replace(/\^/g, "**");
    const value = Function(`"use strict"; return (${safe})`)();
    if (!Number.isFinite(value)) throw new Error("Not a finite number.");
    els.resultsList.innerHTML = `
      <div class="calc-card">
        <h2>${escapeHtml(cleaned)}</h2>
        <div class="weather-temp">${escapeHtml(String(value))}</div>
      </div>`;
    els.resultStatus.textContent = "Calculator";
    show("results");
  } catch {
    els.resultsList.innerHTML = `
      <div class="calc-card">
        <h2>Could not calculate that</h2>
        <p>Try something like <b>25 * 4 + 7</b>.</p>
      </div>`;
    els.resultStatus.textContent = "Calculator";
    show("results");
  }
}

async function renderWeather(query) {
  const place = query
    .replace(/^what(?:'|’)s today's weather(?: like)?(?: in)?\s*/i, "")
    .replace(/^weather(?: in)?\s*/i, "")
    .trim() || "Seattle";

  els.resultStatus.textContent = "Getting weather…";
  els.resultsList.innerHTML = "";
  show("results");

  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=en&format=json`
    );
    const geo = await geoRes.json();
    if (!geo.results?.length) throw new Error(`Could not find "${place}".`);

    const loc = geo.results[0];
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph`
    );
    const weather = await weatherRes.json();

    const c = weather.current;
    const desc = weatherDescription(c.weather_code);

    els.resultsList.innerHTML = `
      <div class="weather-card">
        <h2>${escapeHtml(loc.name)}, ${escapeHtml(loc.country || "")}</h2>
        <div class="weather-temp">${Math.round(c.temperature_2m)}°F</div>
        <p><b>${escapeHtml(desc)}</b></p>
        <p>Feels like ${Math.round(c.apparent_temperature)}°F · Wind ${Math.round(c.wind_speed_10m)} mph</p>
        <p>Updated for ${escapeHtml(loc.timezone || "local time")}.</p>
      </div>`;
    els.resultStatus.textContent = "Weather";
  } catch (error) {
    els.resultStatus.textContent = "Weather error";
    els.resultsList.innerHTML = `
      <div class="result-card">
        <h3>Could not get weather</h3>
        <p>${escapeHtml(error.message)}</p>
      </div>`;
  }
}

function weatherDescription(code) {
  const map = {
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
  return map[code] || "Current conditions";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[ch]));
}

els.searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  await runSearch(els.queryInput.value, els.modeSelect.value);
});

els.resultsSearchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  await runSearch(els.resultsQuery.value, els.resultsMode.value);
});

els.backHome.addEventListener("click", () => show("home"));

els.urlForm.addEventListener("submit", (e) => {
  e.preventDefault();
  openUrl(els.urlInput.value);
});

els.browserBack.addEventListener("click", () => navigateHistory(-1));
els.browserForward.addEventListener("click", () => navigateHistory(1));
els.browserReload.addEventListener("click", () => {
  try { els.siteFrame.contentWindow.location.reload(); }
  catch { els.siteFrame.src = els.siteFrame.src; }
});

els.siteFrame.addEventListener("load", () => {
  els.frameNotice.textContent =
    "The page was loaded inside 1117. Some sites can block embedding or restrict parts of their page; that is controlled by the site owner/browser.";
  els.frameNotice.classList.remove("hidden");
});

els.menuButton.addEventListener("click", () => {
  const hidden = els.menu.classList.toggle("hidden");
  els.menuButton.setAttribute("aria-expanded", String(!hidden));
});

document.querySelectorAll("#menu button[data-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    setMode(button.dataset.mode);
    els.queryInput.focus();
    els.menu.classList.add("hidden");
  });
});

document.querySelectorAll(".quick-menu button").forEach((button) => {
  button.addEventListener("click", async () => {
    const fill = button.dataset.fill;
    els.queryInput.value = fill;
    setMode(fill.startsWith("http") ? "website" : fill.startsWith("weather") ? "weather" : fill.includes("+") || /^\d/.test(fill) ? "calculator" : "search");
    await runSearch(fill, els.modeSelect.value);
  });
});

document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
    e.preventDefault();
    els.queryInput.focus();
  }
});

window.addEventListener("message", (event) => {
  // Intentionally no cross-origin DOM access is attempted.
  // Browsers prevent a parent page from freely inspecting other origins.
});
