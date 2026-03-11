import { Effect } from "effect";
import { ExchangeService } from "../services/exchange";

export const listRates = () =>
	Effect.gen(function* () {
		const exchange = yield* ExchangeService;
		const rates = yield* exchange.listRates();
		if (rates.length === 0) {
			return "💱 暂无汇率\n设置: `/rate USD/CNY 7.25`";
		}
		const lines = rates.map((r) => `${r.from}/${r.to} = ${r.rate}`);
		return `💱 *汇率列表:*\n${lines.join("\n")}`;
	});

export const getRate = (from: string, to: string) =>
	Effect.gen(function* () {
		const exchange = yield* ExchangeService;
		const rate = yield* exchange.getRate(from, to);
		return rate !== null
			? `💱 ${from}/${to} = ${rate}`
			: `❌ 未设置 ${from}/${to} 汇率`;
	});

export const setRate = (from: string, to: string, rate: number) =>
	Effect.gen(function* () {
		const exchange = yield* ExchangeService;
		yield* exchange.setRate(from, to, rate);
		return `✅ 已设置 ${from}/${to} = ${rate}`;
	});
