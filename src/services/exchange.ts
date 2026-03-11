import { Effect, Context, Data, pipe } from "effect";
import { type DrizzleD1Database } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import { exchangeRates } from "../db/schema";

const dbEffect = <A>(f: () => Promise<A>) =>
	Effect.tryPromise(f).pipe(Effect.orDie);

export class RateNotFoundError extends Data.TaggedError("RateNotFoundError")<{
	readonly from: string;
	readonly to: string;
}> {}

export interface ExchangeRateInfo {
	from: string;
	to: string;
	rate: number;
}

export class ExchangeService extends Context.Tag("ExchangeService")<
	ExchangeService,
	{
		readonly getRate: (
			from: string,
			to: string,
		) => Effect.Effect<number | null>;
		readonly setRate: (
			from: string,
			to: string,
			rate: number,
		) => Effect.Effect<void>;
		readonly convert: (
			amount: number,
			from: string,
			to: string,
		) => Effect.Effect<number, RateNotFoundError>;
		readonly listRates: () => Effect.Effect<ExchangeRateInfo[]>;
	}
>() {}

export const makeExchangeService = (db: DrizzleD1Database) => {
	const getRate = (from: string, to: string) =>
		dbEffect(() =>
			db
				.select()
				.from(exchangeRates)
				.where(
					and(
						eq(exchangeRates.fromCurrency, from),
						eq(exchangeRates.toCurrency, to),
					),
				)
				.then((rows) => rows[0]?.rate ?? null),
		);

	const setRate = (from: string, to: string, rate: number) =>
		dbEffect(() =>
			db
				.insert(exchangeRates)
				.values({ fromCurrency: from, toCurrency: to, rate })
				.onConflictDoUpdate({
					target: [exchangeRates.fromCurrency, exchangeRates.toCurrency],
					set: { rate },
				})
				.then(() => undefined as void),
		);

	const convert = (amount: number, from: string, to: string) => {
		if (from === to) return Effect.succeed(amount);
		return Effect.gen(function* () {
			const rate = yield* getRate(from, to);
			if (rate !== null) return amount * rate;
			const reverseRate = yield* getRate(to, from);
			if (reverseRate !== null) return amount / reverseRate;
			return yield* new RateNotFoundError({ from, to });
		});
	};

	const listRates = () =>
		dbEffect(() =>
			db
				.select({
					from: exchangeRates.fromCurrency,
					to: exchangeRates.toCurrency,
					rate: exchangeRates.rate,
				})
				.from(exchangeRates),
		);

	return ExchangeService.of({ getRate, setRate, convert, listRates });
};
