# CivTech Care System — Frontend

## Stack
- **React 18** — UI framework
- **React Router v6** — Navigation
- **Axios** — API calls
- **Custom CSS** — Clean hospital UI, no heavy libraries

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Create your .env file
```
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000
```
For production replace with your Railway backend URL.

### 3. Run locally
```bash
npm start
```
Opens at http://localhost:3000

### 4. Build for production
```bash
npm run build
```

---

## Deploy to Vercel
1. Push frontend folder to GitHub
2. New project on Vercel → Import from GitHub
3. Add environment variables:
   - REACT_APP_API_URL=https://your-railway-url.up.railway.app
   - REACT_APP_WS_URL=wss://your-railway-url.up.railway.app
4. Vercel auto-detects React and deploys

---

## Patient Flow
```
/ (Register) → /verify (OTP) → /chat (AI conversation)
→ /arrival (hospital confirm) → /medications (reminders)
```

## Consultation Flow
```
/chat → /consultation (pick doctor) → /payment → /rate
```

## Doctor Flow
```
/doctor (login) → /doctor/dashboard (live queue)
→ /doctor/patient/:id (profile) → /doctor/verdict/:id
```
