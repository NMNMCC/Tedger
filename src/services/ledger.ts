import { Effect, Context } from "effect";
import { type DrizzleD1Database } from "drizzle-orm/d1";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { ledgerEntries, chatSettings } from "../db/schema";
import { dbEffect, DatabaseError } from "./errors";

export interface AddEntryInput {
	chatId: string;
	userId: string;
	userName: string;
	amount: number;
	currency: string;
	category: string;
	note: string;
	convertedAmount: number;
	baseCurrency: string;
}

export interface CategoryStats {
	category: string;
	total: number;
	count: number;
}

export interface UserStats {
	userId: string;
	userName: string;
	total: number;
	count: number;
}

export class LedgerService extends Context.Tag("LedgerService")<
	LedgerService,
	{
		readonly add: (
			input: AddEntryInput,
		) => Effect.Effect<typeof ledgerEntries.$inferSelect, DatabaseError>;
		readonly list: (
			chatId: string,
			limit: number,
		) => Effect.Effect<(typeof ledgerEntries.$inferSelect)[], DatabaseError>;
		readonly remove: (
			id: number,
			chatId: string,
			userId: string,
		) => Effect.Effect<boolean, DatabaseError>;
		readonly statsByCategory: (
			chatId: string,
			since: number,
		) => Effect.Effect<CategoryStats[], DatabaseError>;
		readonly statsByUser: (
			chatId: string,
			since: number,
		) => Effect.Effect<UserStats[], DatabaseError>;
		readonly getBaseCurrency: (
			chatId: string,
		) => Effect.Effect<string, DatabaseError>;
		readonly setBaseCurrency: (
			chatId: string,
			currency: string,
		) => Effect.Effect<void, DatabaseError>;
	}
>() {}

export const makeLedgerService = (db: DrizzleD1Database) =>
	LedgerService.of({
		add: (input) =>
			dbEffect("ledger.add", () =>
				db
					.insert(ledgerEntries)
					.values(input)
					.returning()
					.then((rows) => rows[0]!),
			),

		list: (chatId, limit) =>
			dbEffect("ledger.list", () =>
				db
					.select()
					.from(ledgerEntries)
					.where(eq(ledgerEntries.chatId, chatId))
					.orderBy(desc(ledgerEntries.createdAt))
					.limit(limit),
			),

		remove: (id, chatId, userId) =>
			dbEffect("ledger.remove", () =>
				db
					.delete(ledgerEntries)
					.where(
						and(
							eq(ledgerEntries.id, id),
							eq(ledgerEntries.chatId, chatId),
							eq(ledgerEntries.userId, userId),
						),
					)
					.returning()
					.then((rows) => rows.length > 0),
			),

		statsByCategory: (chatId, since) =>
			dbEffect("ledger.statsByCategory", () =>
				db
					.select({
						category: ledgerEntries.category,
						total: sql<number>`sum(${ledgerEntries.convertedAmount})`,
						count: sql<number>`count(*)`,
					})
					.from(ledgerEntries)
					.where(
						and(
							eq(ledgerEntries.chatId, chatId),
							gte(ledgerEntries.createdAt, since),
						),
					)
					.groupBy(ledgerEntries.category),
			),

		statsByUser: (chatId, since) =>
			dbEffect("ledger.statsByUser", () =>
				db
					.select({
						userId: ledgerEntries.userId,
						userName: ledgerEntries.userName,
						total: sql<number>`sum(${ledgerEntries.convertedAmount})`,
						count: sql<number>`count(*)`,
					})
					.from(ledgerEntries)
					.where(
						and(
							eq(ledgerEntries.chatId, chatId),
							gte(ledgerEntries.createdAt, since),
						),
					)
					.groupBy(ledgerEntries.userId),
			),

		getBaseCurrency: (chatId) =>
			dbEffect("ledger.getBaseCurrency", () =>
				db
					.select()
					.from(chatSettings)
					.where(eq(chatSettings.chatId, chatId))
					.then((rows) => rows[0]?.baseCurrency ?? "CNY"),
			),

		setBaseCurrency: (chatId, currency) =>
			dbEffect("ledger.setBaseCurrency", () =>
				db
					.insert(chatSettings)
					.values({ chatId, baseCurrency: currency })
					.onConflictDoUpdate({
						target: chatSettings.chatId,
						set: { baseCurrency: currency },
					})
					.then(() => undefined as void),
			),
	});