import express from "express";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(__dirname));

app.get("/api/search", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  const query = String(req.query.q || "").trim();
  if (!query) {
    return res.status(400).json({ error: "Missing search query." });
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CX;

  if (!apiKey || !cx) {
    return res.status(503).json({
      error: "Missing GOOGLE_API_KEY or GOOGLE_CX on the Railway server."
    });
  }

  const searchUrl = new URL("https://www.googleapis.com/customsearch/v1");
  searchUrl.searchParams.set("key", apiKey);
  searchUrl.searchParams.set("cx", cx);
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("num", "10");

  try {
    const response = await fetch(searchUrl);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Google Search returned an error."
      });
    }

    const items = (data.items || []).map(item => ({
      title: item.title || "",
      link: item.link || "",
      snippet: item.snippet || ""
    }));

    res.json({ items });
  } catch (error) {
    console.error("Search request failed:", error);
    res.status(502).json({
      error: "The search provider could not be reached."
    });
  }
});

/*
  Express 5-safe SPA fallback.
  This does NOT use app.get("*"), which can crash with newer path-to-regexp versions.
*/
app.get(/^(?!\/api\/search).*$/, (req, res) => {
  if (req.method !== "GET") return res.sendStatus(405);
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`1117 Search listening on port ${PORT}`);
});
