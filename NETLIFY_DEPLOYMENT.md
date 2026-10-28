# CitySaathi — Netlify Deployment Guide

CitySaathi is configured for zero-friction full-stack deployment on Netlify using Netlify Functions, edge static delivery, and automatic SQLite database initialization.

---

## Deployment Methods

### Method 1: Deploy via GitHub (Recommended)

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Configure Netlify deployment"
   git push origin main
   ```

2. **Import into Netlify:**
   - Log in to [app.netlify.com](https://app.netlify.com/).
   - Click **Add new site** → **Import an existing project**.
   - Choose **GitHub** and select your repository.
   - Netlify will automatically detect settings from `netlify.toml`:
     - **Build command:** `npm run build`
     - **Publish directory:** `.`
     - **Functions directory:** `netlify/functions`
   - Click **Deploy Site**.

3. **Configure Environment Variables:**
   - Go to **Site configuration → Environment variables** in your Netlify site dashboard.
   - Add the variables listed below.
   - Trigger a redeploy (**Deploys** → **Trigger deploy** → **Deploy site**).

---

### Method 2: Deploy via Netlify CLI

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login and Deploy:**
   ```bash
   netlify login
   netlify init
   netlify deploy --build --prod
   ```

---

## Environment Variables Configuration

In Netlify Dashboard (**Site configuration → Environment variables**), configure:

| Key | Suggested Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production mode |
| `JWT_SECRET` | `citysaathi_secure_jwt_prod_key_2026` | 32+ character key for auth tokens |
| `GEMINI_API_KEY` | *(Your Gemini API Key)* | *(Optional)* From Google AI Studio for AI complaint drafting |
| `GEMINI_MODEL` | `gemini-flash-lite-latest` | Fast low-latency Gemini model |
| `DATABASE_URL` | *(Leave blank or use PostgreSQL)* | By default, uses bundled pre-seeded SQLite in `/tmp/dev.db` |

---

## Architecture on Netlify

- **Frontend:** `index.html`, `script.js`, `style.css`, and `assets/` are distributed across Netlify's high-speed global CDN edge nodes.
- **REST API:** Handled by Netlify Serverless Function (`netlify/functions/api.js`), wrapping Express with `serverless-http`.
- **Pre-Seeded Database:** On function startup, the pre-seeded `prisma/dev.db` (containing all 17 sample complaints, 5 departments, and authority accounts) is copied into `/tmp/dev.db`, allowing read/write operations on Netlify's serverless containers.
- **AI Engine:** Automatically falls back to the embedded JavaScript ML classifier and duplicate detection radar (`citysaathi-local-js-detector`), requiring no external servers.
