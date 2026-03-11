import { Effect } from "effect";
import { LedgerService } from "../services/ledger";

export const getCurrency = (chatId: string) =>
	Effect.gen(function* () {
		const ledger = yield* LedgerService;
		const cur = yield* ledger.getBaseCurrency(chatId);
		return `💰 当前默认货币: *${cur}*`;
	});

export const setCurrency = (chatId: string, code: string) =>
	Effect.gen(function* () {
		const ledger = yield* LedgerService;
		yield* ledger.setBaseCurrency(chatId, code);
		return `✅ 默认货币已设置为 *${code}*`;
	});
