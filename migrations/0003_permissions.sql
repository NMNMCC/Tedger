-- Add permissions table for user authorization
-- Run: wrangler d1 execute tedger --local --file ./migrations/0003_permissions.sql

CREATE TABLE IF NOT EXISTS permissions (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id TEXT NOT NULL,
	user_name TEXT DEFAULT '',
	role TEXT NOT NULL CHECK(role IN ('owner', 'admin', 'user')),
	chat_id TEXT,
	granted_by TEXT NOT NULL,
	created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_chat ON permissions(user_id, chat_id);
CREATE INDEX IF NOT EXISTS idx_permissions_role ON permissions(role);