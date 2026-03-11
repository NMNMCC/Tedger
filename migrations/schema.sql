-- Tedger schema
-- Run: wrangler d1 execute tedger --local --file ./migrations/schema.sql

CREATE TABLE IF NOT EXISTS ledger_entries (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	chat_id TEXT NOT NULL,
	user_id TEXT NOT NULL,
	user_name TEXT NOT NULL DEFAULT '',
	amount REAL NOT NULL,
	currency TEXT NOT NULL,
	category TEXT NOT NULL DEFAULT '其他',
	note TEXT DEFAULT '',
	converted_amount REAL NOT NULL,
	base_currency TEXT NOT NULL DEFAULT 'CNY',
	created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
	updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_ledger_chat ON ledger_entries(chat_id);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON ledger_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created ON ledger_entries(created_at);

CREATE TABLE IF NOT EXISTS exchange_rates (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	from_currency TEXT NOT NULL,
	to_currency TEXT NOT NULL,
	rate REAL NOT NULL,
	updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rates_pair ON exchange_rates(from_currency, to_currency);

CREATE TABLE IF NOT EXISTS chat_settings (
	chat_id TEXT PRIMARY KEY,
	base_currency TEXT NOT NULL DEFAULT 'CNY',
	updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
