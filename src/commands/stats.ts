import { Effect } from "effect";
import { LedgerService } from "../services/ledger";
import { fmt, periodSince, periodLabel } from "../helpers";

interface StatsParams {
	chatId: string;
	period: string;
	isGroup: boolean;
}

export const stats = (p: StatsParams) =>
	Effect.gen(function* () {
		const ledger = yield* LedgerService;
		const since = periodSince(p.period);
		const label = periodLabel(p.period);
		const baseCurrency = yield* ledger.getBaseCurrency(p.chatId);
		const categories = yield* ledger.statsByCategory(p.chatId, since);
		const users = p.isGroup
			? yield* ledger.statsByUser(p.chatId, since)
			: [];

		if (categories.length === 0) return `📊 ${label}暂无记录`;

		const total = categories.reduce((s, c) => s + c.total, 0);
		const totalCount = categories.reduce((s, c) => s + c.count, 0);

		let msg = `📊 *${label}统计* (${baseCurrency})\n\n`;
		msg += `💰 总计: *${fmt(total, baseCurrency)}* (${totalCount} 笔)\n\n`;
		msg += `📁 *分类:*\n`;
		for (const c of categories) {
			const pct = ((c.total / total) * 100).toFixed(0);
			msg += `  ${c.category}: ${fmt(c.total, baseCurrency)} (${c.count}笔, ${pct}%)\n`;
		}

		if (p.isGroup && users.length > 0) {
			msg += `\n👥 *成员:*\n`;
			for (const u of users) {
				msg += `  ${u.userName}: ${fmt(u.total, baseCurrency)} (${u.count}笔)\n`;
			}
		}

		return msg;
	});
