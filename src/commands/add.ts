import { Effect } from "effect";
import { LedgerService } from "../services/ledger";
import { ExchangeService } from "../services/exchange";
import { fmt } from "../helpers";
import type { ParsedEntry } from "../helpers";

interface AddParams extends ParsedEntry {
	chatId: string;
	userId: string;
	userName: string;
}

export const add = (p: AddParams) =>
	Effect.gen(function* () {
		const ledger = yield* LedgerService;
		const exchange = yield* ExchangeService;
		const baseCurrency = yield* ledger.getBaseCurrency(p.chatId);
		const currency = p.currency ?? baseCurrency;
		const convertedAmount = yield* exchange.convert(
			p.amount,
			currency,
			baseCurrency,
		);
		const entry = yield* ledger.add({
			chatId: p.chatId,
			userId: p.userId,
			userName: p.userName,
			amount: p.amount,
			currency,
			category: p.category,
			note: p.note,
			convertedAmount,
			baseCurrency,
		});

		const icon = entry.amount >= 0 ? "📈" : "📉";
		let msg = `${icon} #${entry.id} ${fmt(entry.amount, entry.currency)}`;
		if (entry.currency !== entry.baseCurrency) {
			msg += ` ≈ ${fmt(entry.convertedAmount, entry.baseCurrency)}`;
		}
		msg += ` [${entry.category}]`;
		if (entry.note) msg += ` ${entry.note}`;
		return msg;
	}).pipe(
		Effect.catchTag("RateNotFoundError", (e) =>
			Effect.succeed(
				`❌ 未找到 ${e.from}/${e.to} 汇率\n请先设置: \`/rate ${e.from}/${e.to} <汇率>\``,
			),
		),
	);
