CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  recovery_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member','admin')),
  disabled INTEGER NOT NULL DEFAULT 0 CHECK (disabled IN (0,1)),
  created_at TEXT NOT NULL
);
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  csrf_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX sessions_account ON sessions(account_id);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES accounts(id),
  title TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '丑角',
  event_date TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  sources_json TEXT NOT NULL DEFAULT '[]',
  tags_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','approved','rejected')),
  version INTEGER NOT NULL DEFAULT 1,
  review_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  submitted_at TEXT,
  reviewed_at TEXT,
  reviewer_id TEXT REFERENCES accounts(id)
);
CREATE INDEX submissions_owner ON submissions(author_id, updated_at DESC);
CREATE INDEX submissions_queue ON submissions(status, submitted_at);
CREATE TABLE published_articles (
  id TEXT PRIMARY KEY REFERENCES submissions(id),
  author_id TEXT NOT NULL REFERENCES accounts(id),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  event_date TEXT NOT NULL,
  summary TEXT NOT NULL,
  body TEXT NOT NULL,
  sources_json TEXT NOT NULL,
  tags_json TEXT NOT NULL,
  version INTEGER NOT NULL,
  published_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX published_order ON published_articles(published_at DESC);
CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions(id),
  actor_id TEXT NOT NULL REFERENCES accounts(id),
  action TEXT NOT NULL CHECK (action IN ('approve','reject','unpublish')),
  version INTEGER NOT NULL,
  note TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX reviews_submission ON reviews(submission_id, created_at);
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, hits INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX rate_limits_expiry ON rate_limits(expires_at);
CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
