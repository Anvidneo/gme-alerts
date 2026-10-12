CREATE TABLE tenants (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE users (
  id        TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name      TEXT NOT NULL,
  role      TEXT NOT NULL CHECK (role IN ('admin', 'operator', 'viewer'))
);

CREATE TABLE api_tokens (
  token   TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id)
);

CREATE TABLE devices (
  id        TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  vin       TEXT NOT NULL,
  label     TEXT NOT NULL
);

CREATE TABLE alerts (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  device_id       TEXT NOT NULL REFERENCES devices(id),
  type            TEXT NOT NULL,
  severity        TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged')),
  message         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT REFERENCES users(id)
);

CREATE INDEX alerts_tenant_created_idx ON alerts (tenant_id, created_at DESC);
