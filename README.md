# 1117 Search — Working Railway Version

This version is designed to run as a Node/Express app on Railway.

## Files

Keep everything in the repository ROOT:

- `index.html`
- `app.js`
- `style.css`
- `config.js`
- `server.js`
- `package.json`
- `.gitignore`

There is no `public` folder.

## Railway

Connect the GitHub repository to Railway.

The start command is already:

```text
npm start
```

No Google API key is required for the included search endpoint.

Railway gives the app a public URL such as:

```text
https://your-project.up.railway.app
```

Open that URL to use the full 1117 application.

## GitHub Pages

GitHub Pages can display the frontend, but it cannot run `server.js`.

After Railway is running, edit `config.js`:

```js
window.1117_API_BASE = "https://your-project.up.railway.app";
```

Then push the change to GitHub Pages.

## What this version does

- Web search through a server-side search endpoint
- Search result pages stay in 1117
- URL entry
- Same-page website viewer
- Back / forward / reload
- Weather
- Calculator
- Menu
- Website links and common assets are routed through the viewer

## Limitations

Websites are different applications, so a generic viewer cannot perfectly reproduce every site. Some sites may depend on DRM, WebSockets, browser extensions, strict authentication, or JavaScript that assumes it is running at its original domain.

The viewer also blocks private/internal IP targets to prevent the server from being used to access local network services.
