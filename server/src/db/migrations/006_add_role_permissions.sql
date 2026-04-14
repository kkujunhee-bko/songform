CREATE TABLE IF NOT EXISTS role_permissions (
  id         SERIAL PRIMARY KEY,
  role       VARCHAR(20) NOT NULL,
  menu_key   VARCHAR(50) NOT NULL,
  can_read   BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit   BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, menu_key)
);

-- 기본값: 리더는 송폼 전체 권한, 단원/동역은 읽기만
INSERT INTO role_permissions (role, menu_key, can_read, can_create, can_edit, can_delete)
VALUES
  ('leader',   'forms_list',   true,  true,  true,  true),
  ('leader',   'forms_create', true,  true,  true,  true),
  ('leader',   'settings',     true,  false, false, false),
  ('user',     'forms_list',   true,  false, false, false),
  ('user',     'forms_create', false, false, false, false),
  ('user',     'settings',     false, false, false, false),
  ('coworker', 'forms_list',   true,  false, false, false),
  ('coworker', 'forms_create', false, false, false, false),
  ('coworker', 'settings',     false, false, false, false)
ON CONFLICT (role, menu_key) DO NOTHING;
