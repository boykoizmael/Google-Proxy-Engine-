# 1117 Search Engine

This is a custom search-engine-style website called **1117**.

## Included

- 1117-branded search homepage
- Web search result page
- Search dropdown/menu
- URL input
- In-page website viewer using an iframe
- Weather command using Open-Meteo
- Calculator command
- Simple "hi" response
- No built-in query history/database

## Important browser limitation

A normal webpage cannot force every external website to be embedded. A destination can send browser security headers such as `X-Frame-Options` or `Content-Security-Policy` that prevent framing. The 1117 viewer respects the browser's normal security model.

This project does **not** implement a proxy that rewrites third-party pages or hides their destination from the browser/network.

## Web search setup

The server uses Google's Custom Search JSON API / Programmable Search configuration.

Create `.env` from `.env.example` and set:

- `GOOGLE_API_KEY`
- `GOOGLE_CX`

Google's API documentation describes `key` as the API key and `cx` as the custom search engine ID used for requests.

## Run locally

Requires Node.js 18+.

```bash
npm install
npm start
```

Then open:

http://localhost:3000

## Hosting

Because the search API key must stay server-side, this project needs a host that can run Node.js (for example a Node-capable hosting service).

A static-only host such as a basic file CDN can host the `public` frontend, but `/api/search` will not work unless you provide a separate backend URL and change the frontend accordingly.

## Weather

Weather lookup uses Open-Meteo's geocoding and forecast APIs. The project requests city coordinates and current weather data directly from the browser.
