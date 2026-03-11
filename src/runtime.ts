import { ManagedRuntime, Layer } from "effect";
import { drizzle } from "drizzle-orm/d1";
import { LedgerService, makeLedgerService } from "./services/ledger";
import { ExchangeService, makeExchangeService } from "./services/exchange";

export type AppServices = LedgerService | ExchangeService;

export const makeAppRuntime = (env: Env) => {
	const db = drizzle(env.DB);
	const MainLayer = Layer.mergeAll(
		Layer.succeed(LedgerService, makeLedgerService(db)),
		Layer.succeed(ExchangeService, makeExchangeService(db)),
	);
	return ManagedRuntime.make(MainLayer);
};

export type AppRuntime = ReturnType<typeof makeAppRuntime>;
