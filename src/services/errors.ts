import { Data, Effect } from "effect";

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
	readonly cause: unknown;
	readonly operation: string;
}> {}

export const dbEffect = <A>(operation: string, f: () => Promise<A>) =>
	Effect.tryPromise({
		try: f,
		catch: (cause) => new DatabaseError({ cause, operation }),
	});