CREATE TABLE IF NOT EXISTS auth_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    used_at TIMESTAMP,
    expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '15 minutes'
);