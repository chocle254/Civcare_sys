# CivTech Care System — Backend

## Stack
- **FastAPI** — Python web framework
- **SQLAlchemy** — ORM (you already know this 😄)
- **Supabase PostgreSQL** — Database
- **Gemini Flash** — AI model (free tier)
- **Africa's Talking** — USSD + SMS
- **M-Pesa Daraja + Airtel Money** — Payments
- **Railway** — Deployment

---

## Setup

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Create your .env file
```bash
cp .env.example .env
```
Then fill in your actual keys.

### 3. Supabase Database URL
Go to Supabase → Settings → Database → Connection string (SQLAlchemy format):
```
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

### 4. Gemini API Key
Go to https://aistudio.google.com → Get API Key (free)
```
GEMINI_API_KEY=your-key-here
```

### 5. Run locally
```bash
uvicorn main:app --reload --port 8000
```

### 6. API Docs
Visit http://localhost:8000/docs

---

## Deploy to Railway
1. Push backend folder to GitHub
2. New project on Railway → Deploy from GitHub
3. Add all .env variables in Railway dashboard
4. Railway auto-detects FastAPI and deploys

---

## File Structure
```
main.py                  ← Entry point — start here
app/
  config.py              ← All environment variables
  database.py            ← Supabase connection
  models/                ← Database tables
  agents/                ← AI agents (orchestrator, triage, medscan, records)
  services/              ← External APIs (Gemini, M-Pesa, Airtel, AT)
  routers/               ← All API endpoints
  websocket/             ← Live queue updates
```
