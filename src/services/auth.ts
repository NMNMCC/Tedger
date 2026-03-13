import { Effect, Context } from "effect";
import { type DrizzleD1Database } from "drizzle-orm/d1";
import { eq, and, or, isNull } from "drizzle-orm";
import { permissions, type Role, type Permission } from "../db/schema";
import { dbEffect, DatabaseError } from "./errors";

export interface AuthCheckInput {
	userId: string;
	chatId: string;
	isGroup: boolean;
}

export class AuthService extends Context.Tag("AuthService")<
	AuthService,
	{
		readonly checkPermission: (
			input: AuthCheckInput,
		) => Effect.Effect<boolean, DatabaseError>;
		readonly getRole: (
			userId: string,
			chatId: string | null,
		) => Effect.Effect<Role | null, DatabaseError>;
		readonly grantPermission: (input: {
			userId: string;
			userName: string;
			role: Role;
			chatId: string | null;
			grantedBy: string;
		}) => Effect.Effect<Permission, DatabaseError>;
		readonly revokePermission: (
			userId: string,
			chatId: string | null,
		) => Effect.Effect<boolean, DatabaseError>;
		readonly listPermissions: (
			chatId?: string | null,
		) => Effect.Effect<Permission[], DatabaseError>;
		readonly isOwner: (userId: string) => Effect.Effect<boolean>;
		readonly isAdmin: (userId: string) => Effect.Effect<boolean, DatabaseError>;
	}
>() {}

export const makeAuthService = (db: DrizzleD1Database, ownerId: string) =>
	AuthService.of({
		checkPermission: ({ userId, chatId, isGroup }) =>
			Effect.gen(function* () {
				if (userId === ownerId) return true;

				const globalPerm = yield* dbEffect("auth.checkPermission.global", () =>
					db
						.select()
						.from(permissions)
						.where(
							and(
								eq(permissions.userId, userId),
								isNull(permissions.chatId),
							),
						)
						.then((rows) => rows[0]),
				);

				if (globalPerm?.role === "owner" || globalPerm?.role === "admin") {
					return true;
				}

				if (!isGroup) {
					const privatePerm = yield* dbEffect(
						"auth.checkPermission.private",
						() =>
							db
								.select()
								.from(permissions)
								.where(
									and(
										eq(permissions.userId, userId),
										eq(permissions.chatId, "private"),
									),
								)
								.then((rows) => rows[0]),
					);
					return privatePerm?.role === "user" || globalPerm?.role === "user";
				}

				const groupPerm = yield* dbEffect("auth.checkPermission.group", () =>
					db
						.select()
						.from(permissions)
						.where(
							and(
								eq(permissions.userId, userId),
								eq(permissions.chatId, chatId),
							),
						)
						.then((rows) => rows[0]),
				);

				return groupPerm?.role === "user" || globalPerm?.role === "user";
			}),

		getRole: (userId, chatId) =>
			dbEffect("auth.getRole", () => {
				const conditions = chatId
					? and(
							eq(permissions.userId, userId),
							or(
								eq(permissions.chatId, chatId),
								isNull(permissions.chatId),
							),
						)
					: and(
							eq(permissions.userId, userId),
							isNull(permissions.chatId),
						);

				return db
					.select()
					.from(permissions)
					.where(conditions)
					.then((rows) => {
						if (rows.length === 0) return null;
						const ownerRow = rows.find((r) => r.role === "owner");
						const adminRow = rows.find((r) => r.role === "admin");
						if (ownerRow) return "owner";
						if (adminRow) return "admin";
						return "user";
					});
			}),

		grantPermission: ({ userId, userName, role, chatId, grantedBy }) =>
			dbEffect("auth.grantPermission", () =>
				db
					.insert(permissions)
					.values({
						userId,
						userName,
						role,
						chatId,
						grantedBy,
					})
					.onConflictDoUpdate({
						target: [permissions.userId, permissions.chatId],
						set: { role, userName, grantedBy },
					})
					.returning()
					.then((rows) => rows[0]!),
			),

		revokePermission: (userId, chatId) =>
			dbEffect("auth.revokePermission", () => {
				const condition = chatId
					? and(
							eq(permissions.userId, userId),
							eq(permissions.chatId, chatId),
						)
					: and(
							eq(permissions.userId, userId),
							isNull(permissions.chatId),
						);

				return db
					.delete(permissions)
					.where(condition)
					.returning()
					.then((rows) => rows.length > 0);
			}),

		listPermissions: (chatId) =>
			dbEffect("auth.listPermissions", () => {
				const condition = chatId
					? eq(permissions.chatId, chatId)
					: isNull(permissions.chatId);

				return db
					.select()
					.from(permissions)
					.where(condition)
					.orderBy(permissions.createdAt);
			}),

		isOwner: (userId) => Effect.succeed(userId === ownerId),

		isAdmin: (userId) =>
			Effect.gen(function* () {
				if (userId === ownerId) return true;

				const perm = yield* dbEffect("auth.isAdmin", () =>
					db
						.select()
						.from(permissions)
						.where(
							and(
								eq(permissions.userId, userId),
								isNull(permissions.chatId),
							),
						)
						.then((rows) => rows[0]),
				);

				return perm?.role === "admin";
			}),
	});