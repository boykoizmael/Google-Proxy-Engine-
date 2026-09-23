import express from "express";
import crypto from "node:crypto";
import dns from "node:dns/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(__dirname));

const sites = new Map();
const MAX_BYTES = 12 * 1024 * 1024;
const TIMEOUT_MS = 15000;

function token() {
  return crypto.randomBytes(9).toString("base64url");
}

function isPrivateIp(address) {
  const family = net.isIP(address);

  if (family === 4) {
    const [a,b,c,d] = address.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a === 0 ||
      (a === 192 && b === 0 && c === 0) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }

  if (family === 6) {
    const x = address.toLowerCase();
    return (
      x === "::1" ||
      x === "::" ||
      x.startsWith("fc") ||
      x.startsWith("fd") ||
      x.startsWith("fe80:")
    );
  }

  return true;
}

async function validateTarget(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS websites are supported.");
  }

  const hostname = url.hostname.toLowerCase();

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("Local addresses are not allowed.");
  }

  if (net.isIP(hostname) && isPrivateIp(hostname)) {
    throw new Error("Private network addresses are not allowed.");
  }

  try {
    const records = await dns.lookup(hostname, { all: true });
    if (!records.length || records.some(r => isPrivateIp(r.address))) {
      throw new Error("This destination is not a public internet address.");
    }
  } catch (err) {
    if (err.message.includes("public internet")) throw err;
    throw new Error("Could not resolve that website.");
  }

  return url.href;
}

function store(url) {
  const id = token();
  sites.set(id, { url, created: Date.now() });

  for (const [key, value] of sites) {
    if (Date.now() - value.created > 30 * 60 * 1000) sites.delete(key);
  }
  return id;
}

function rewriteCss(css, baseUrl) {
  return css.replace(
    /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi,
    (match, quote, value) => {
      const raw = value.trim();
      if (/^(data:|blob:|javascript:|#)/i.test(raw)) return match;
      try {
        const absolute = new URL(raw, baseUrl).href;
        const id = store(absolute);
        return `url("/asset/${id}")`;
      } catch {
        return match;
      }
    }
  );
}

function rewriteHtml(html, baseUrl) {
  // Remove document-level policies that could otherwise block resources after re-hosting.
  html = html.replace(/<meta[^>]+http-equiv=["']?content-security-policy["']?[^>]*>/gi, "");

  html = html.replace(/<base\b[^>]*>/gi, "");

  // Page navigation.
  html = html.replace(
    /(<a\b[^>]*?\bhref\s*=\s*)(["'])([^"']+)\2/gi,
    (m, prefix, quote, value) => {
      if (/^(javascript:|mailto:|tel:|data:|#)/i.test(value)) return m;
      try {
        const absolute = new URL(value, baseUrl).href;
        const id = store(absolute);
        return `${prefix}${quote}/site/${id}${quote}`;
      } catch {
        return m;
      }
    }
  );

  // Form submissions.
  html = html.replace(
    /(<form\b[^>]*?\baction\s*=\s*)(["'])([^"']*)\2/gi,
    (m, prefix, quote, value) => {
      try {
        const absolute = new URL(value || baseUrl, baseUrl).href;
        const id = store(absolute);
        return `${prefix}${quote}/site/${id}${quote}`;
      } catch {
        return m;
      }
    }
  );

  // Images, scripts, stylesheets, icons, frames, etc.
  html = html.replace(
    /(<(?:img|script|iframe|frame|source|video|audio|track|embed|object|link)\b[^>]*?\b(?:src|href|poster|data)\s*=\s*)(["'])([^"']+)\2/gi,
    (m, prefix, quote, value) => {
      if (/^(javascript:|data:|blob:|#)/i.test(value)) return m;
      try {
        const absolute = new URL(value, baseUrl).href;
        const id = store(absolute);
        return `${prefix}${quote}/asset/${id}${quote}`;
      } catch {
        return m;
      }
    }
  );

  // srcset.
  html = html.replace(
    /(\bsrcset\s*=\s*)(["'])([^"']+)\2/gi,
    (m, prefix, quote, value) => {
      const rewritten = value.split(",").map(part => {
        const chunks = part.trim().split(/\s+/);
        if (!chunks[0]) return part;
        try {
          const absolute = new URL(chunks[0], baseUrl).href;
          const id = store(absolute);
          chunks[0] = `/asset/${id}`;
          return chunks.join(" ");
        } catch {
          return part;
        }
      }).join(", ");
      return `${prefix}${quote}${rewritten}${quote}`;
    }
  );

  return html;
}

async function fetchTarget(rawUrl) {
  const url = await validateTarget(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": "1117-Search/1.0 (+website viewer)",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
      }
    });

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const contentLength = Number(response.headers.get("content-length") || 0);

    if (contentLength > MAX_BYTES) {
      throw new Error("The website response is too large for the 1117 viewer.");
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_BYTES) {
      throw new Error("The website response is too large for the 1117 viewer.");
    }

    return {
      url: response.url || url,
      status: response.status,
      contentType,
      buffer
    };
  } finally {
    clearTimeout(timer);
  }
}

app.get("/api/open", async (req, res) => {
  try {
    const target = String(req.query.url || "").trim();
    if (!target) return res.status(400).json({ error: "Missing website URL." });

    const clean = await validateTarget(target);
    const id = store(clean);
    res.json({ path: `/site/${id}` });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not open website." });
  }
});

/*
  Search without requiring a Google API key.
  The server queries DuckDuckGo's HTML search endpoint and extracts public result links.
*/
app.get("/api/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Missing search query." });

  try {
    const endpoint = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
    const response = await fetch(endpoint, {
      headers: { "user-agent": "1117-Search/1.0" }
    });
    if (!response.ok) throw new Error("Search provider returned an error.");

    const html = await response.text();
    const items = [];
    const resultRe = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;

    while ((match = resultRe.exec(html)) && items.length < 12) {
      const linkRaw = match[1];
      let link = linkRaw;
      try {
        const u = new URL(linkRaw, "https://html.duckduckgo.com");
        const uddg = u.searchParams.get("uddg");
        if (uddg) link = decodeURIComponent(uddg);
      } catch {}

      const title = match[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

      const after = html.slice(resultRe.lastIndex, resultRe.lastIndex + 1800);
      const snippetMatch = after.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|div)>/i);
      const snippet = snippetMatch
        ? snippetMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
        : "";

      if (/^https?:\/\//i.test(link)) {
        items.push({ title, link, snippet });
      }
    }

    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(502).json({
      error: "Search could not reach the search provider."
    });
  }
});

async function serveProxy(id, res) {
  const entry = sites.get(id);
  if (!entry) {
    return res.status(404).send("1117 link expired. Open the website again.");
  }

  try {
    const result = await fetchTarget(entry.url);
    const type = result.contentType.toLowerCase();

    res.status(result.status);

    // Do not forward iframe/CSP policies from the original host.
    res.setHeader("cache-control", "no-store");

    if (type.includes("text/html") || type.includes("application/xhtml+xml")) {
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.send(rewriteHtml(result.buffer.toString("utf8"), result.url));
      return;
    }

    if (type.includes("text/css")) {
      res.setHeader("content-type", "text/css; charset=utf-8");
      res.send(rewriteCss(result.buffer.toString("utf8"), result.url));
      return;
    }

    res.setHeader("content-type", result.contentType);
    res.send(result.buffer);
  } catch (err) {
    res.status(502).send(
      `<html><body style="font-family:system-ui;padding:30px">
      <h2>1117 could not load this website</h2>
      <p>${String(err.message || "Unknown error").replace(/[<>&"']/g, "")}</p>
      <p>Some sites require browser features that a generic web viewer cannot reproduce.</p>
      </body></html>`
    );
  }
}

app.get("/site/:id", (req, res) => serveProxy(req.params.id, res));
app.get("/asset/:id", (req, res) => serveProxy(req.params.id, res));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`1117 Search running on port ${PORT}`);
});
