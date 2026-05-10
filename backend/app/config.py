from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── DATABASE (Supabase) ──
    DATABASE_URL: str                  # From Supabase → Settings → Database → Connection string (SQLAlchemy)
    SUPABASE_URL: str                  # From Supabase → Settings → API → Project URL
    SUPABASE_ANON_KEY: str             # From Supabase → Settings → API → anon public key
    SUPABASE_SERVICE_ROLE_KEY: str     # From Supabase → Settings → API → service_role key

    # ── AUTH ──
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ── AI (Gemini) ──
    GEMINI_API_KEY: str                # From Google AI Studio → Get API Key (free)
    GEMINI_MODEL: str = "gemini-1.5-flash"   # Fast free model

    # ── MPESA ──
    MPESA_CONSUMER_KEY: str = ""
    MPESA_CONSUMER_SECRET: str = ""
    MPESA_SHORTCODE: str = ""
    MPESA_PASSKEY: str = ""
    MPESA_CALLBACK_URL: str = ""
    MPESA_ENVIRONMENT: str = "sandbox"

    # ── AIRTEL ──
    AIRTEL_CLIENT_ID: str = ""
    AIRTEL_CLIENT_SECRET: str = ""
    AIRTEL_ENVIRONMENT: str = "sandbox"

    # ── AFRICA'S TALKING ──
    AT_USERNAME: str = "sandbox"
    AT_API_KEY: str = ""
    AT_SENDER_ID: str = "CivTech"
    AT_USSD_CODE: str = ""

    # ── APP ──
    APP_NAME: str = "CivTech Care System"
    DEBUG: bool = True
    FRONTEND_URL: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


settings = Settings()
