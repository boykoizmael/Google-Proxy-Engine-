# 1117 Search Engine — Fixed Deployment Version

This version fixes the layout/deployment problem from the previous project.

## Repository layout

Put these files in the **root of the GitHub repository**:

```text
index.html
app.js
style.css
config.js
server.js
package.json
.env.example
.gitignore
README.md
```

Do NOT put `index.html` inside a `public` folder.

## Railway

Railway runs the Node/Express server.

1. Connect this GitHub repository to Railway.
2. Railway should detect Node automatically.
3. Add these environment variables:
   - `GOOGLE_API_KEY`
   - `GOOGLE_CX`
4. Deploy.
5. Open the generated Railway domain.

The package has a `start` script of `node server.js`.

## GitHub Pages

GitHub Pages can serve the frontend because `index.html`, `app.js`, `style.css`, and `config.js` are at the repository root.

For web search to work from GitHub Pages:

1. Deploy the project to Railway first.
2. Copy the Railway public URL.
3. Open `config.js`.
4. Change:

```js
window.1117_API_BASE = "";
```

to:

```js
window.1117_API_BASE = "https://YOUR-RAILWAY-DOMAIN.up.railway.app";
```

5. Commit and push.

The GitHub Pages frontend will then send `/api/search` requests to Railway.

## Website viewer limitation

The viewer uses an iframe. A website can block iframe embedding with security headers, so a normal webpage cannot guarantee that literally every external website can be rendered inside 1117.

This project does not rewrite third-party traffic or conceal the destination from the browser/network.

## Weather and calculator

Weather uses Open-Meteo directly from the browser. Calculator runs locally in the page.
