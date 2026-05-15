from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text('ALTER TABLE doctors ADD COLUMN IF NOT EXISTS national_id VARCHAR UNIQUE;'))
    conn.commit()

print("National ID column added to doctors table!")
