import { Effect } from "effect";
import { LedgerService } from "../services/ledger";
import { fmt, fmtDate } from "../helpers";

interface ListParams {
	chatId: string;
	limit: number;
	isGroup: boolean;
}

export const list = (p: ListParams) =>
	Effect.gen(function* () {
		const ledger = yield* LedgerService;
		const entries = yield* ledger.list(p.chatId, p.limit);

		if (entries.length === 0) return "📋 暂无记录";

		const lines = entries.map((e) => {
			const icon = e.amount >= 0 ? "📈" : "📉";
			let line = `${icon} #${e.id} ${fmt(e.amount, e.currency)}`;
			if (e.currency !== e.baseCurrency) {
				line += ` ≈${fmt(e.convertedAmount, e.baseCurrency)}`;
			}
			line += ` [${e.category}]`;
			if (e.note) line += ` ${e.note}`;
			if (p.isGroup) line += ` — ${e.userName}`;
			line += ` (${fmtDate(e.createdAt)})`;
			return line;
		});

		return `📋 *最近 ${entries.length} 条记录:*\n\n${lines.join("\n")}`;
	});
