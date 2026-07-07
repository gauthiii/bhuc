# BHUC — Behavioral Health Urgent Care AI Platform

An AI platform for a Behavioral Health Urgent Care facility, built on **ServiceNow AI Control Tower + AI Agent Studio (GRC)** with a **React + Vite** frontend and a **FastAPI** backend. Native ServiceNow AI agents handle crisis escalation, risk screening, clinical documentation, consent/data-protection, prior-auth, and scheduling; governance is native AICT/AIRC. AWS Cognito provides patient/clinician authentication.

> The React app is designed to be embedded as a full-screen **iframe** inside a ServiceNow Service Portal page (the "iframe-as-portal" pattern). See `plan.md` §2.9.

## Repository layout

```
bhuc_app/
├── frontend/          React + Vite + TypeScript + Tailwind (Patient & Clinician portals)
├── server/            FastAPI backend (AWS Cognito auth broker; ServiceNow A2A/REST later)
├── plan.md            Full solution design & implementation runbook (verified against the instance)
├── action.md          Actionable task tracker
├── tables.md          ServiceNow u_bhuc_* data-model spec
└── README.md          This file
```

Secrets live in `.env` files that are **git-ignored**. Copy the provided `*.env.example` templates and fill in your own values.

## Prerequisites

- **Node.js** 20+ and npm
- **Python** 3.11+ (3.14 works; see `server/requirements.txt`)
- A **Firebase** account (for deployment) — Firebase CLI: `npm i -g firebase-tools`

## Run the frontend

```bash
cd frontend
cp .env.example .env.local        # fill in Cognito values if you enable real auth
npm install
npm run dev                        # http://localhost:5173
```

- `VITE_USE_MOCK=true` (default) renders every screen from in-memory fixtures — **no backend required**, and a "demo login" is available on the sign-in screens.
- Set `VITE_USE_MOCK=false` to call the backend at `http://localhost:8000` (dev proxy forwards `/api`).

Production build: `npm run build` → outputs to `frontend/dist/`.

## Run the backend (local, port 8000)

The backend currently hosts the **AWS Cognito** auth router (`/api/aws/*`). It runs locally on **http://localhost:8000**.

```bash
cd server
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env               # fill in Cognito + AWS + (optional) ServiceNow values
uvicorn app.main:app --reload --port 8000
```

Health check: `curl http://localhost:8000/api/health`.

> **Never commit `.env` or `server/.env`.** They are git-ignored. Only the `*.env.example` templates are committed.

## Deployment

**Frontend → Firebase Hosting.** BHUC deploys to a **separate Hosting site in the same Firebase project as careatlas** (`task--mission`), so it gets its **own URL**, independent of careatlas.

- **Firebase project:** `task--mission`
- **Hosting site:** `bhuc-ai`
- **Deployed URL:** **https://bhuc-ai.web.app** (and `https://bhuc-ai.firebaseapp.com`)

Deploy steps (run from `frontend/`):

```bash
cd frontend
firebase login
# One-time: create the new hosting site in the task--mission project
firebase hosting:sites:create bhuc-ai
npm run build
firebase deploy --only hosting:bhuc-ai
```

**Backend → Render.** The FastAPI backend deploys to **Render** via the committed **`render.yaml`** Blueprint (auto-deploys on every push to `main`).

- **Service:** `bhuc-backend` (Free plan) → **https://bhuc-backend.onrender.com**
- **Root dir:** `server/` · **Start:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT` · **Health:** `/api/health`
- Secrets (Cognito, AWS, ServiceNow) are set in the Render dashboard (declared `sync: false` in `render.yaml`, never committed).

One-time connect: Render dashboard → **New → Blueprint** → connect `gauthiii/bhuc` → fill the prompted secret values → **Apply**. After that, every push to `main` redeploys automatically.

> Local dev still runs the backend on `http://localhost:8000` (see above). To make the deployed frontend call the Render backend, set the frontend's API base to `https://bhuc-backend.onrender.com` and rebuild.

## Environment variables

| File | Purpose | Committed? |
|---|---|---|
| `frontend/.env.example` | Frontend template (mock flag, API base, Cognito pool) | ✅ template only |
| `server/.env.example` | Backend template (Cognito, AWS, ServiceNow) | ✅ template only |
| `frontend/.env.local`, `.env`, `server/.env` | Your real values | ❌ git-ignored |

## More detail

See **`plan.md`** for the full architecture, the six-agent design, the ServiceNow build runbooks (§8), and the as-built agent procedures (§4.6).
