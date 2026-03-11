import { Bot } from "grammy";
import { Effect, Layer } from "effect";
import { drizzle } from "drizzle-orm/d1";
import { LedgerService, makeLedgerService } from "./services/ledger";
import {
	ExchangeService,
	RateNotFoundError,
	makeExchangeService,
} from "./services/exchange";
import {
	parseAddCommand,
	parseRateCommand,
	fmt,
	fmtDate,
	periodSince,
	periodLabel,
} from "./helpers";

export function createBot(env: Env) {
	const bot = new Bot(env.BOT_TOKEN);
	const db = drizzle(env.DB);

	bot.api.setMyCommands([
		{ command: "add", description: "记账 - /add 金额 [货币] [分类] [备注]" },
		{ command: "list", description: "查看最近记录" },
		{ command: "stats", description: "统计 - /stats [today|week|month|all]" },
		{ command: "del", description: "删除记录 - /del ID" },
		{ command: "rate", description: "汇率管理 - /rate [FROM/TO] [汇率]" },
		{ command: "currency", description: "设置默认货币" },
		{ command: "help", description: "使用帮助" },
	]);

	const MainLayer = Layer.mergeAll(
		Layer.succeed(LedgerService, makeLedgerService(db)),
		Layer.succeed(ExchangeService, makeExchangeService(db)),
	);

	const run = <A, E>(
		effect: Effect.Effect<A, E, LedgerService | ExchangeService>,
	) => Effect.runPromise(Effect.provide(effect, MainLayer));

	// ── /start ──────────────────────────────────────────────
	bot.command("start", async (ctx) => {
		const isGroup = ctx.chat.type !== "private";
		await ctx.reply(
			`🧾 *Tedger 记账机器人*\n\n` +
				(isGroup ? "已进入群组记账模式，所有成员可共同记账。\n\n" : "") +
				`📝 记账: \`/add 金额 [货币] [分类] [备注]\`\n` +
				`📋 记录: \`/list [条数]\`\n` +
				`📊 统计: \`/stats [today|week|month|all]\`\n` +
				`🗑 删除: \`/del ID\`\n` +
				`💱 汇率: \`/rate [FROM/TO] [汇率]\`\n` +
				`💰 货币: \`/currency [代码]\``,
			{ parse_mode: "Markdown" },
		);
	});

	// ── /help ───────────────────────────────────────────────
	bot.command("help", async (ctx) => {
		await ctx.reply(
			`🧾 *Tedger 使用帮助*\n\n` +
				`*记账:*\n` +
				`• \`/add 100\` — 100（默认货币/分类）\n` +
				`• \`/add 50 USD 餐饮 午饭\` — 50美元 餐饮\n` +
				`• \`/add 200 交通 打车\` — 200 交通\n\n` +
				`*汇率:*\n` +
				`• \`/rate\` — 查看所有汇率\n` +
				`• \`/rate USD/CNY 7.25\` — 设置汇率\n` +
				`• \`/rate USD/CNY\` — 查看特定汇率\n\n` +
				`*统计:*\n` +
				`• \`/stats\` — 本月 • \`/stats today\` — 今日\n` +
				`• \`/stats week\` — 本周 • \`/stats all\` — 全部\n\n` +
				`*其他:*\n` +
				`• \`/currency CNY\` — 设置默认货币\n` +
				`• \`/del 42\` — 删除 #42 记录`,
			{ parse_mode: "Markdown" },
		);
	});

	// ── /add ────────────────────────────────────────────────
	bot.command("add", async (ctx) => {
		const text = ctx.match;
		if (!text) {
			return ctx.reply("用法: `/add 金额 [货币] [分类] [备注]`", {
				parse_mode: "Markdown",
			});
		}

		const parsed = parseAddCommand(text);
		if (!parsed) {
			return ctx.reply("❌ 无法解析，金额必须为正数。");
		}

		try {
			const result = await run(
				Effect.gen(function* () {
					const ledger = yield* LedgerService;
					const exchange = yield* ExchangeService;
					const baseCurrency = yield* ledger.getBaseCurrency(
						String(ctx.chat.id),
					);
					const currency = parsed.currency ?? baseCurrency;
					const convertedAmount = yield* exchange.convert(
						parsed.amount,
						currency,
						baseCurrency,
					);
					const entry = yield* ledger.add({
						chatId: String(ctx.chat.id),
						userId: String(ctx.from!.id),
						userName: ctx.from!.first_name ?? "Unknown",
						amount: parsed.amount,
						currency,
						category: parsed.category,
						note: parsed.note,
						convertedAmount,
						baseCurrency,
					});
					return { ok: true as const, entry };
				}).pipe(
					Effect.catchTag("RateNotFoundError", (e) =>
						Effect.succeed({
							ok: false as const,
							from: e.from,
							to: e.to,
						}),
					),
				),
			);

			if (!result.ok) {
				return ctx.reply(
					`❌ 未找到 ${result.from}/${result.to} 汇率\n请先设置: \`/rate ${result.from}/${result.to} <汇率>\``,
					{ parse_mode: "Markdown" },
				);
			}

			const { entry } = result;
			let msg = `✅ #${entry.id}`;
			msg += ` ${fmt(entry.amount, entry.currency)}`;
			if (entry.currency !== entry.baseCurrency) {
				msg += ` ≈ ${fmt(entry.convertedAmount, entry.baseCurrency)}`;
			}
			msg += ` [${entry.category}]`;
			if (entry.note) msg += ` ${entry.note}`;
			return ctx.reply(msg);
		} catch (e: unknown) {
			console.error("add error:", e);
			return ctx.reply("❌ 记账失败，请稍后重试。");
		}
	});

	// ── /list ───────────────────────────────────────────────
	bot.command("list", async (ctx) => {
		const limit = Math.min(parseInt(ctx.match || "10") || 10, 50);
		const isGroup = ctx.chat.type !== "private";

		try {
			const entries = await run(
				Effect.gen(function* () {
					const ledger = yield* LedgerService;
					return yield* ledger.list(String(ctx.chat.id), limit);
				}),
			);

			if (entries.length === 0) {
				return ctx.reply("📋 暂无记录");
			}

			const lines = entries.map((e) => {
				let line = `#${e.id} ${fmt(e.amount, e.currency)}`;
				if (e.currency !== e.baseCurrency) {
					line += ` ≈${fmt(e.convertedAmount, e.baseCurrency)}`;
				}
				line += ` [${e.category}]`;
				if (e.note) line += ` ${e.note}`;
				if (isGroup) line += ` — ${e.userName}`;
				line += ` (${fmtDate(e.createdAt)})`;
				return line;
			});

			return ctx.reply(`📋 *最近 ${entries.length} 条记录:*\n\n${lines.join("\n")}`, {
				parse_mode: "Markdown",
			});
		} catch (e) {
			console.error("list error:", e);
			return ctx.reply("❌ 查询失败");
		}
	});

	// ── /stats ──────────────────────────────────────────────
	bot.command("stats", async (ctx) => {
		const period = ctx.match?.trim() || "month";
		const since = periodSince(period);
		const label = periodLabel(period);
		const isGroup = ctx.chat.type !== "private";

		try {
			const { categories, users, baseCurrency } = await run(
				Effect.gen(function* () {
					const ledger = yield* LedgerService;
					const chatId = String(ctx.chat.id);
					const bc = yield* ledger.getBaseCurrency(chatId);
					const cats = yield* ledger.statsByCategory(chatId, since);
					const us = isGroup
						? yield* ledger.statsByUser(chatId, since)
						: [];
					return { categories: cats, users: us, baseCurrency: bc };
				}),
			);

			if (categories.length === 0) {
				return ctx.reply(`📊 ${label}暂无记录`);
			}

			const total = categories.reduce((s, c) => s + c.total, 0);
			const totalCount = categories.reduce((s, c) => s + c.count, 0);

			let msg = `📊 *${label}统计* (${baseCurrency})\n\n`;
			msg += `💰 总计: *${fmt(total, baseCurrency)}* (${totalCount} 笔)\n\n`;
			msg += `📁 *分类:*\n`;
			for (const c of categories) {
				const pct = ((c.total / total) * 100).toFixed(0);
				msg += `  ${c.category}: ${fmt(c.total, baseCurrency)} (${c.count}笔, ${pct}%)\n`;
			}

			if (isGroup && users.length > 0) {
				msg += `\n👥 *成员:*\n`;
				for (const u of users) {
					msg += `  ${u.userName}: ${fmt(u.total, baseCurrency)} (${u.count}笔)\n`;
				}
			}

			return ctx.reply(msg, { parse_mode: "Markdown" });
		} catch (e) {
			console.error("stats error:", e);
			return ctx.reply("❌ 统计失败");
		}
	});

	// ── /del ────────────────────────────────────────────────
	bot.command("del", async (ctx) => {
		const id = parseInt(ctx.match || "");
		if (isNaN(id)) {
			return ctx.reply("用法: `/del ID`", { parse_mode: "Markdown" });
		}

		try {
			const ok = await run(
				Effect.gen(function* () {
					const ledger = yield* LedgerService;
					return yield* ledger.remove(
						id,
						String(ctx.chat.id),
						String(ctx.from!.id),
					);
				}),
			);

			return ctx.reply(ok ? `🗑 已删除 #${id}` : `❌ 未找到 #${id}（仅可删除自己的记录）`);
		} catch (e) {
			console.error("del error:", e);
			return ctx.reply("❌ 删除失败");
		}
	});

	// ── /rate ───────────────────────────────────────────────
	bot.command("rate", async (ctx) => {
		const text = ctx.match?.trim();

		// No args → list all rates
		if (!text) {
			try {
				const rates = await run(
					Effect.gen(function* () {
						const exchange = yield* ExchangeService;
						return yield* exchange.listRates();
					}),
				);
				if (rates.length === 0) {
					return ctx.reply("💱 暂无汇率\n设置: `/rate USD/CNY 7.25`", {
						parse_mode: "Markdown",
					});
				}
				const lines = rates.map((r) => `${r.from}/${r.to} = ${r.rate}`);
				return ctx.reply(`💱 *汇率列表:*\n${lines.join("\n")}`, {
					parse_mode: "Markdown",
				});
			} catch (e) {
				console.error("rate list error:", e);
				return ctx.reply("❌ 查询失败");
			}
		}

		const parsed = parseRateCommand(text);
		if (!parsed) {
			return ctx.reply("用法: `/rate FROM/TO [汇率]`\n例: `/rate USD/CNY 7.25`", {
				parse_mode: "Markdown",
			});
		}

		// Query specific rate
		if (parsed.rate === undefined) {
			try {
				const rate = await run(
					Effect.gen(function* () {
						const exchange = yield* ExchangeService;
						return yield* exchange.getRate(parsed.from, parsed.to);
					}),
				);
				return ctx.reply(
					rate !== null
						? `💱 ${parsed.from}/${parsed.to} = ${rate}`
						: `❌ 未设置 ${parsed.from}/${parsed.to} 汇率`,
				);
			} catch (e) {
				console.error("rate get error:", e);
				return ctx.reply("❌ 查询失败");
			}
		}

		// Set rate
		try {
			await run(
				Effect.gen(function* () {
					const exchange = yield* ExchangeService;
					yield* exchange.setRate(parsed.from, parsed.to, parsed.rate!);
				}),
			);
			return ctx.reply(`✅ 已设置 ${parsed.from}/${parsed.to} = ${parsed.rate}`);
		} catch (e) {
			console.error("rate set error:", e);
			return ctx.reply("❌ 设置失败");
		}
	});

	// ── /currency ───────────────────────────────────────────
	bot.command("currency", async (ctx) => {
		const code = ctx.match?.trim().toUpperCase();

		try {
			if (!code) {
				const cur = await run(
					Effect.gen(function* () {
						const ledger = yield* LedgerService;
						return yield* ledger.getBaseCurrency(String(ctx.chat.id));
					}),
				);
				return ctx.reply(`💰 当前默认货币: *${cur}*`, {
					parse_mode: "Markdown",
				});
			}

			await run(
				Effect.gen(function* () {
					const ledger = yield* LedgerService;
					yield* ledger.setBaseCurrency(String(ctx.chat.id), code);
				}),
			);
			return ctx.reply(`✅ 默认货币已设置为 *${code}*`, {
				parse_mode: "Markdown",
			});
		} catch (e) {
			console.error("currency error:", e);
			return ctx.reply("❌ 操作失败");
		}
	});

	return bot;
}
