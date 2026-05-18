# Deploy: Vercel (frontend) + Render (API)

## Prerequisites

1. **MongoDB Atlas** cluster with a connection string (`MONGODB_URI`).
   - In Atlas → Network Access, allow access from anywhere (`0.0.0.0/0`) so Render can connect, or add [Render outbound IPs](https://render.com/docs/static-outbound-ip-addresses) on a paid plan.
2. **SMTP** (recommended in production) so OTP emails are sent instead of only logged on the server.

---

## 1. Backend on Render

1. Push this repo to GitHub.
2. [Render Dashboard](https://dashboard.render.com/) → **New** → **Blueprint** → connect the repo (uses `render.yaml`),  
   **or** **New** → **Web Service** → connect repo and set:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`
3. Set environment variables (Blueprint marks some as “set manually”):

   | Variable | Example / notes |
   |----------|-----------------|
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | Atlas connection string |
   | `JWT_SECRET` | Long random string (Render can auto-generate) |
   | `CLIENT_ORIGIN` | Must match the browser URL exactly, e.g. `https://quizz-lear-8k3t.vercel.app` — or use `*.vercel.app` to allow all Vercel preview/production hosts |
   | `SMTP_*` | Your mail provider (required for real OTP delivery) |
   | `ADMIN_EMAIL` | `admin@lear.com` (for seeding) |

4. Deploy and copy the service URL, e.g. `https://quizz-lear-api.onrender.com`.

5. **Seed admin (once):** Render → your service → **Shell**:

   ```bash
   npm run seed
   ```

---

## 2. Frontend on Vercel

1. [Vercel](https://vercel.com/) → **Add New Project** → import the same GitHub repo.
2. **Root Directory:** set to `client` (Settings → General → Root Directory).  
   `client/vercel.json` handles the Vite build and SPA routing — do **not** use a repo-root `vercel.json` with `--prefix client` (that breaks when Root Directory is already `client`).
3. **Environment variables** (Project → Settings → Environment Variables):

   | Name | Value |
   |------|--------|
   | `VITE_API_URL` | Render API URL, e.g. `https://quizz-lear-api.onrender.com` (no trailing slash) |

   Apply to **Production** (and **Preview** if you use branch previews).

4. **Redeploy** after setting `VITE_API_URL` (Vite bakes it in at build time).

5. In **Render**, set `CLIENT_ORIGIN` to your live Vercel URL (and any preview URLs), then redeploy the API if you change it.

---

## 3. Verify

- API: `https://YOUR-RENDER-URL.onrender.com/api/health` → `{"ok":true}`
- App: open the Vercel URL, log in with a `@lear.com` email and OTP.

---

## Local development

```bash
# Terminal 1
cd server && npm install && npm run dev

# Terminal 2
cd client && npm install && npm run dev
```

Copy `server/.env.example` → `server/.env` and `client/.env.example` → `client/.env`.  
Local client can leave `VITE_API_URL` empty to use the Vite proxy to `http://localhost:5000`.
