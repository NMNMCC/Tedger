import { ManagedRuntime, Layer } from "effect";
import { drizzle } from "drizzle-orm/d1";
import { LedgerService, makeLedgerService } from "./services/ledger";
import { ExchangeService, makeExchangeService } from "./services/exchange";
import { AuthService, makeAuthService } from "./services/auth";

export type AppServices = LedgerService | ExchangeService | AuthService;

export const makeAppRuntime = (env: Env) => {
	const db = drizzle(env.DB);
	const MainLayer = Layer.mergeAll(
		Layer.succeed(LedgerService, makeLedgerService(db)),
		Layer.succeed(ExchangeService, makeExchangeService(db)),
		Layer.succeed(AuthService, makeAuthService(db, env.OWNER_ID)),
	);
	return ManagedRuntime.make(MainLayer);
};

export type AppRuntime = ReturnType<typeof makeAppRuntime>;
