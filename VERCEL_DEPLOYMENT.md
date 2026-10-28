# CitySaathi — Vercel Deployment Guide

Deploying CitySaathi to Vercel is streamlined with pre-configured serverless handlers, database automation, and static edge routing.

---

## Quick Deploy Steps

### Method 1: Deploy via GitHub (Recommended)

1. **Extract this zip file** to a local folder.
2. **Push to a GitHub repository:**
   ```bash
   git init
   git add .
   git commit -m "Initial CitySaathi commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/citysaathi.git
   git push -u origin main
   ```
3. **Import to Vercel:**
   - Go to [vercel.com/new](https://vercel.com/new).
   - Sign in with GitHub and select your `citysaathi` repository.
   - Framework Preset: **Other** (leave root directory as `./`).
   - Add the Environment Variables (see below).
   - Click **Deploy**.

---

### Method 2: Deploy via Vercel CLI

1. **Install Vercel CLI globally:**
   ```bash
   npm install -g vercel
   ```
2. **Deploy directly from the extracted directory:**
   ```bash
   vercel
   ```
   Follow the prompts (accept default settings). To deploy to production:
   ```bash
   vercel --prod
   ```

---

## Environment Variables Configuration

Set these in the **Vercel Project Settings → Environment Variables**:

| Variable | Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Production mode |
| `JWT_SECRET` | `citysaathi_secure_jwt_prod_key_2026` | 32+ char secret for JWT authentication |
| `GEMINI_API_KEY` | `Your_Google_AI_Studio_Key` | *(Optional)* For Gemini AI complaint auto-drafting |
| `GEMINI_MODEL` | `gemini-flash-lite-latest` | Recommended fast, low-latency model |
| `DATABASE_URL` | *(Leave empty or provide PostgreSQL)* | Defaults to pre-seeded SQLite database in `/tmp/dev.db` |

---

## How It Works on Vercel

1. **Serverless API (`api/index.js`):**
   Vercel routes all `/api/*` and `/uploads/*` requests through the serverless Express handler.
2. **Zero-Setup SQLite Persistence:**
   On serverless cold-start, `api/index.js` automatically copies the bundled `prisma/dev.db` (containing all 17 initial complaints, BBMP departments, and users) to the writable `/tmp` filesystem.
3. **Edge Static CDN:**
   The frontend (`index.html`, `script.js`, `style.css`, and `assets/`) is served directly by Vercel's global Edge Network for sub-50ms load times.
4. **Resilient AI Fallback:**
   Duplicate detection and explainable priority scoring run seamlessly via the embedded JavaScript ML classifier and spatial radar, requiring no external background servers.
