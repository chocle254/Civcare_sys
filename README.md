# CivTech Care System
## AI-Powered Healthcare Platform for Africa

One repository. Backend on Railway. Frontend on Vercel.

---

## Repository Structure

```
civtech/
├── backend/        ← FastAPI Python backend → deployed on Railway
├── frontend/       ← React frontend         → deployed on Vercel
├── vercel.json     ← Vercel build config
├── railway.toml    ← Railway build config
└── .gitignore
```

---

## Step 1 — Push to GitHub (from your phone)

1. Go to **github.com** on your phone
2. Create a new repository — name it `civtech-care`
3. Make it **Private**
4. Upload all files from this zip:
   - Tap **Add file → Upload files**
   - Upload everything including the `backend/` and `frontend/` folders
5. Commit directly to main

---

## Step 2 — Set Up Supabase (Database)

1. Go to **supabase.com** → New Project
2. Name it `civtech` → set a strong database password → save it
3. Wait for it to provision (~2 minutes)
4. Go to **Settings → Database → Connection string**
5. Select **SQLAlchemy** format — copy it
6. It looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
7. Also go to **Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

> Tables are created automatically when the backend starts for the first time.

---

## Step 3 — Get Gemini API Key (Free)

1. Go to **aistudio.google.com** on your phone
2. Sign in with Google
3. Tap **Get API Key → Create API Key in new project**
4. Copy the key → save it as `GEMINI_API_KEY`

---

## Step 4 — Deploy Backend on Railway

1. Go to **railway.app** → Login with GitHub
2. **New Project → Deploy from GitHub repo**
3. Select `civtech-care`
4. ⚠️ **Important:** Go to **Settings → Source → Root Directory**
   - Set it to: `backend`
   - This tells Railway to only deploy the backend folder
5. Go to **Variables tab** and add these:

```
DATABASE_URL              = postgresql://postgres:...  (from Supabase)
SUPABASE_URL              = https://xxx.supabase.co
SUPABASE_ANON_KEY         = eyJ...
SUPABASE_SERVICE_ROLE_KEY = eyJ...
GEMINI_API_KEY            = AIza...
GEMINI_MODEL              = gemini-1.5-flash
SECRET_KEY                = any-long-random-string-here
ALGORITHM                 = HS256
ACCESS_TOKEN_EXPIRE_MINUTES = 60
FRONTEND_URL              = *
DEBUG                     = False
AT_USERNAME               = sandbox
AT_API_KEY                = (leave blank for now)
AT_SENDER_ID              = CivTech
AT_USSD_CODE              = (leave blank for now)
MPESA_CONSUMER_KEY        = (leave blank for now)
MPESA_CONSUMER_SECRET     = (leave blank for now)
MPESA_SHORTCODE           = (leave blank for now)
MPESA_PASSKEY             = (leave blank for now)
MPESA_CALLBACK_URL        = (fill in after Railway gives you a URL)
MPESA_ENVIRONMENT         = sandbox
AIRTEL_CLIENT_ID          = (leave blank for now)
AIRTEL_CLIENT_SECRET      = (leave blank for now)
AIRTEL_ENVIRONMENT        = sandbox
```

6. Railway will build and deploy automatically
7. Copy your Railway URL — it looks like:
   `https://civtech-care-production.up.railway.app`
8. Go back to Variables and update:
   ```
   MPESA_CALLBACK_URL = https://civtech-care-production.up.railway.app/payment/mpesa/callback
   ```

> Test it: open `https://your-railway-url.up.railway.app/docs`
> You should see the full API documentation page.

---

## Step 5 — Deploy Frontend on Vercel

1. Go to **vercel.com** → Login with GitHub
2. **New Project → Import** `civtech-care`
3. ⚠️ **Important:** Under **Root Directory**
   - Set it to: `frontend`
   - This tells Vercel to only build the frontend folder
4. Under **Environment Variables** add:

```
REACT_APP_API_URL = https://civtech-care-production.up.railway.app
REACT_APP_WS_URL  = wss://civtech-care-production.up.railway.app
```

5. Click **Deploy**
6. Vercel gives you a URL like:
   `https://civtech-care.vercel.app`

> Go back to Railway Variables and update:
> ```
> FRONTEND_URL = https://civtech-care.vercel.app
> ```
> Then redeploy Railway (Settings → Redeploy)

---

## Step 6 — Test the Full System

Open your Vercel URL on your phone and:

```
Patient side:
✓ Register with your National ID
✓ Verify OTP (check your phone)
✓ Start a conversation with the AI
✓ Describe symptoms and see AI respond
✓ Select a hospital

Doctor side:
✓ Go to /doctor
✓ Login (you will need to manually insert
  a doctor into Supabase Table Editor first)
✓ See live queue
✓ View patient profile
✓ Submit verdict
```

---

## Adding a Test Doctor (Supabase Table Editor)

1. Go to Supabase → **Table Editor → doctors**
2. Insert a row:
```
full_name:      Dr. Test Doctor
email:          doctor@test.com
phone_number:   +254712000000
kmpdb_license:  TEST001
specialisation: General Practitioner
hospital_id:    (insert a hospital first)
password_hash:  (run hash_password("password123") from encryption.py)
is_verified:    true
is_active:      true
status:         available
consultation_fee: 500
```

---

## Running Tests

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

---

## Minimum Keys to Go Live

| Key | Where to get it |
|-----|----------------|
| `DATABASE_URL` | Supabase → Settings → Database |
| `GEMINI_API_KEY` | aistudio.google.com |
| `SECRET_KEY` | Any random string |
| `SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |

Everything else (M-Pesa, Airtel, Africa's Talking) can be blank
until you are ready to test payments and SMS.
