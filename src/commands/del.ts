import { Effect } from "effect";
import { LedgerService } from "../services/ledger";

interface DelParams {
	id: number;
	chatId: string;
	userId: string;
}

export const del = (p: DelParams) =>
	Effect.gen(function* () {
		const ledger = yield* LedgerService;
		const ok = yield* ledger.remove(p.id, p.chatId, p.userId);
		return ok
			? `🗑 已删除 #${p.id}`
			: `❌ 未找到 #${p.id}（仅可删除自己的记录）`;
	});
