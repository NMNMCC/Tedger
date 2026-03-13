import { Effect } from "effect";
import { DatabaseError } from "./services/errors";
import { RateNotFoundError } from "./services/exchange";

export type AppError = DatabaseError | RateNotFoundError;

export const handleErrors = <A, R>(
	effect: Effect.Effect<A, AppError, R>,
): Effect.Effect<string, never, R> =>
	Effect.gen(function* () {
		const result = yield* Effect.either(effect);
		if (result._tag === "Right") {
			const value = result.right;
			return typeof value === "string" ? value : String(value);
		}

		const error = result.left;
		switch (error._tag) {
			case "DatabaseError":
				yield* Effect.logError(`Database error in ${error.operation}`, error.cause);
				return `❌ 数据库操作失败: ${error.operation}`;
			case "RateNotFoundError":
				yield* Effect.logWarning(`Rate not found: ${error.from}/${error.to}`);
				return `❌ 未找到 ${error.from}/${error.to} 汇率\n请先设置: \`/rate ${error.from}/${error.to} <汇率>\``;
		}
	});