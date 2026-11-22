CREATE TABLE IF NOT EXISTS jamco_content (
  slug text PRIMARY KEY, kind text NOT NULL CHECK (kind IN ('story','photo','video','event','listing','package','category')),
  state text NOT NULL CHECK (state IN ('draft','review','published','archived')),
  live_at timestamptz NOT NULL DEFAULT now(), data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jamco_live ON jamco_content(state, live_at DESC);
CREATE TABLE IF NOT EXISTS jamco_staff (
  email text PRIMARY KEY, password text NOT NULL, role text NOT NULL CHECK (role IN ('owner','editor','reporter','advertising','viewer')),
  active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS jamco_sessions (
  digest text PRIMARY KEY, email text NOT NULL REFERENCES jamco_staff(email) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS jamco_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor text NOT NULL, action text NOT NULL,
  subject text NOT NULL, happened_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS jamco_requests (
  reference text PRIMARY KEY, kind text NOT NULL CHECK (kind IN ('tip','campaign','subscription')),
  email text NOT NULL, status text NOT NULL DEFAULT 'received' CHECK(status IN ('received','reviewing','approved','declined','closed')),
  data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS jamco_subscription_email ON jamco_requests(email) WHERE kind='subscription';
CREATE TABLE IF NOT EXISTS jamco_uploads (
  id uuid PRIMARY KEY, mime text NOT NULL, data bytea NOT NULL, public boolean NOT NULL DEFAULT false, owner text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS jamco_rates (
  key text NOT NULL, bucket bigint NOT NULL, hits integer NOT NULL DEFAULT 1, PRIMARY KEY (key, bucket)
);
CREATE TABLE IF NOT EXISTS jamco_reads (
  slug text NOT NULL REFERENCES jamco_content(slug) ON DELETE CASCADE, day date NOT NULL, reads bigint NOT NULL DEFAULT 1,
  PRIMARY KEY (slug, day)
);
CREATE TABLE IF NOT EXISTS jamco_push (
  endpoint text PRIMARY KEY, subscription jsonb NOT NULL, categories text[] NOT NULL
);
