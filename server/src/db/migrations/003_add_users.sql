CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(100)  NOT NULL,
  email        VARCHAR(255)  UNIQUE NOT NULL,
  phone        VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  role         VARCHAR(20)   NOT NULL DEFAULT 'user',
  theme        VARCHAR(10)   NOT NULL DEFAULT 'dark',
  is_active    BOOLEAN       NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ   DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   DEFAULT NOW()
);
