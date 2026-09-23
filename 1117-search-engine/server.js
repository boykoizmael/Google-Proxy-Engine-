import express from "express";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");

app.use(express.static(publicDir));

app.get("/api/search", async (req, res) => {
  const q = String(req.query.q || "").trim();

  if (!q) {
    return res.status(400).json({ error: "Missing search query." });
  }

  const key = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CX;

  if (!key || !cx) {
    return res.status(503).json({
      error: "Google Programmable Search is not configured."
    });
  }

  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", key);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", q);
  url.searchParams.set("num", "10");

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Search provider returned an error."
      });
    }

    res.json({
      items: (data.items || []).map((item) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet || ""
      }))
    });
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: "Could not reach the search provider." });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`1117 Search running at http://localhost:${port}`);
});
