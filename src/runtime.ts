import { ManagedRuntime, Layer, Context, Effect } from "effect";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import { LedgerService, makeLedgerService } from "./services/ledger";
import { ExchangeService, makeExchangeService } from "./services/exchange";
import { AuthService, makeAuthService } from "./services/auth";

export class Database extends Context.Tag("Database")<Database, DrizzleD1Database>() {}

export type AppServices = LedgerService | ExchangeService | AuthService | Database;

const LedgerLive = Layer.effect(
	LedgerService,
	Effect.gen(function* () {
		const db = yield* Database;
		return makeLedgerService(db);
	}),
);

const ExchangeLive = Layer.effect(
	ExchangeService,
	Effect.gen(function* () {
		const db = yield* Database;
		return makeExchangeService(db);
	}),
);

const AuthLive = Layer.effect(
	AuthService,
	Effect.gen(function* () {
		const db = yield* Database;
		const ownerId = yield* OwnerId;
		return makeAuthService(db, ownerId);
	}),
);

export class OwnerId extends Context.Tag("OwnerId")<OwnerId, string>() {}

export const makeAppRuntime = (env: Env) => {
	const DatabaseLive = Layer.succeed(Database, drizzle(env.DB));
	const OwnerIdLive = Layer.succeed(OwnerId, env.OWNER_ID);
	
	const MainLayer = Layer.mergeAll(LedgerLive, ExchangeLive, AuthLive).pipe(
		Layer.provide(Layer.mergeAll(DatabaseLive, OwnerIdLive)),
	);
	
	return ManagedRuntime.make(MainLayer);
};

export type AppRuntime = ReturnType<typeof makeAppRuntime>;