import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export type Role = "owner" | "admin" | "user";

// chatId: null=global (owner/admin), "private"=private chats, or group ID
export const permissions = sqliteTable("permissions", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	userId: text("user_id").notNull(),
	userName: text("user_name").default(""),
	role: text("role", { enum: ["owner", "admin", "user"] }).notNull(),
	chatId: text("chat_id"),
	grantedBy: text("granted_by").notNull(),
	createdAt: integer("created_at")
		.notNull()
		.default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
	userChatUnique: uniqueIndex("user_chat_unique").on(table.userId, table.chatId),
}));

export const ledgerEntries = sqliteTable("ledger_entries", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	chatId: text("chat_id").notNull(),
	userId: text("user_id").notNull(),
	userName: text("user_name").notNull().default(""),
	amount: real("amount").notNull(),
	currency: text("currency").notNull(),
	category: text("category").notNull().default("其他"),
	note: text("note").default(""),
	convertedAmount: real("converted_amount").notNull(),
	baseCurrency: text("base_currency").notNull().default("CNY"),
	createdAt: integer("created_at")
		.notNull()
		.default(sql`(strftime('%s', 'now'))`),
	updatedAt: integer("updated_at")
		.notNull()
		.default(sql`(strftime('%s', 'now'))`),
});

export const exchangeRates = sqliteTable("exchange_rates", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	fromCurrency: text("from_currency").notNull(),
	toCurrency: text("to_currency").notNull(),
	rate: real("rate").notNull(),
	updatedAt: integer("updated_at")
		.notNull()
		.default(sql`(strftime('%s', 'now'))`),
});

export const chatSettings = sqliteTable("chat_settings", {
	chatId: text("chat_id").primaryKey(),
	baseCurrency: text("base_currency").notNull().default("CNY"),
	updatedAt: integer("updated_at")
		.notNull()
		.default(sql`(strftime('%s', 'now'))`),
});

export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type NewLedgerEntry = typeof ledgerEntries.$inferInsert;
export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type ChatSetting = typeof chatSettings.$inferSelect;
export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;
