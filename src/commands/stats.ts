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

		const expenseCats = categories.filter((c) => c.total < 0);
		const incomeCats = categories.filter((c) => c.total > 0);
		const expenseTotal = expenseCats.reduce((s, c) => s + c.total, 0);
		const incomeTotal = incomeCats.reduce((s, c) => s + c.total, 0);
		const expenseCount = expenseCats.reduce((s, c) => s + c.count, 0);
		const incomeCount = incomeCats.reduce((s, c) => s + c.count, 0);
		const net = expenseTotal + incomeTotal;

		let msg = `📊 *${label}统计* (${baseCurrency})\n\n`;
		if (expenseCats.length > 0) {
			msg += `📉 支出: *${fmt(expenseTotal, baseCurrency)}* (${expenseCount} 笔)\n`;
		}
		if (incomeCats.length > 0) {
			msg += `📈 收入: *${fmt(incomeTotal, baseCurrency)}* (${incomeCount} 笔)\n`;
		}
		msg += `💰 净额: *${fmt(net, baseCurrency)}*\n`;

		if (expenseCats.length > 0) {
			const absTotal = Math.abs(expenseTotal);
			msg += `\n📁 *支出分类:*\n`;
			for (const c of expenseCats) {
				const pct = ((Math.abs(c.total) / absTotal) * 100).toFixed(0);
				msg += `  ${c.category}: ${fmt(c.total, baseCurrency)} (${c.count}笔, ${pct}%)\n`;
			}
		}

		if (incomeCats.length > 0) {
			msg += `\n📁 *收入分类:*\n`;
			for (const c of incomeCats) {
				const pct = ((c.total / incomeTotal) * 100).toFixed(0);
				msg += `  ${c.category}: ${fmt(c.total, baseCurrency)} (${c.count}笔, ${pct}%)\n`;
			}
		}

		if (p.isGroup && users.length > 0) {
			msg += `\n👥 *成员:*\n`;
			for (const u of users) {
				msg += `  ${u.userName}: ${fmt(u.total, baseCurrency)} (${u.count}笔)\n`;
			}
		}

		return msg;
	});
