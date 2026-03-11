import { Bot } from "grammy";
import type { AppRuntime } from "./runtime";
import { parseAddCommand, parseRateCommand } from "./helpers";
import { START_TEXT, HELP_TEXT } from "./commands/start";
import { add } from "./commands/add";
import { list } from "./commands/list";
import { stats } from "./commands/stats";
import { del } from "./commands/del";
import * as Rate from "./commands/rate";
import * as Currency from "./commands/currency";
import { inferAll } from "./commands/infer";

const MD = { parse_mode: "Markdown" as const };

export function createBot(env: Env, runtime: AppRuntime) {
	const bot = new Bot(env.BOT_TOKEN);

	bot.api.setMyCommands([
		{ command: "add", description: "记账 - /add [+|-]金额 [货币] [分类] [备注]" },
		{ command: "list", description: "查看最近记录" },
		{ command: "stats", description: "统计 - /stats [today|week|month|all]" },
		{ command: "del", description: "删除记录 - /del ID" },
		{ command: "rate", description: "汇率管理 - /rate [FROM/TO] [汇率]" },
		{ command: "currency", description: "设置默认货币" },
		{ command: "help", description: "使用帮助" },
	]);

	bot.command("start", (ctx) =>
		ctx.reply(START_TEXT(ctx.chat.type !== "private"), MD),
	);

	bot.command("help", (ctx) => ctx.reply(HELP_TEXT, MD));

	bot.command("add", async (ctx) => {
		if (!ctx.match)
			return ctx.reply(
				"用法: `/add [+|-]金额 [货币] [分类] [备注]`\n默认为支出，`+` 前缀记收入",
				MD,
			);
		const parsed = parseAddCommand(ctx.match);
		if (!parsed) return ctx.reply("❌ 无法解析，金额必须为正数。");
		const msg = await runtime.runPromise(
			add({
				...parsed,
				chatId: String(ctx.chat.id),
				userId: String(ctx.from!.id),
				userName: ctx.from!.first_name ?? "Unknown",
			}),
		);
		return ctx.reply(msg, MD);
	});

	bot.command("list", async (ctx) => {
		const msg = await runtime.runPromise(
			list({
				chatId: String(ctx.chat.id),
				limit: Math.min(parseInt(ctx.match || "10") || 10, 50),
				isGroup: ctx.chat.type !== "private",
			}),
		);
		return ctx.reply(msg, MD);
	});

	bot.command("stats", async (ctx) => {
		const msg = await runtime.runPromise(
			stats({
				chatId: String(ctx.chat.id),
				period: ctx.match?.trim() || "month",
				isGroup: ctx.chat.type !== "private",
			}),
		);
		return ctx.reply(msg, MD);
	});

	bot.command("del", async (ctx) => {
		const id = parseInt(ctx.match || "");
		if (isNaN(id)) return ctx.reply("用法: `/del ID`", MD);
		const msg = await runtime.runPromise(
			del({ id, chatId: String(ctx.chat.id), userId: String(ctx.from!.id) }),
		);
		return ctx.reply(msg);
	});

	bot.command("rate", async (ctx) => {
		const text = ctx.match?.trim();
		if (!text) {
			return ctx.reply(await runtime.runPromise(Rate.listRates()), MD);
		}
		const parsed = parseRateCommand(text);
		if (!parsed) {
			return ctx.reply("用法: `/rate FROM/TO [汇率]`\n例: `/rate USD/CNY 7.25`", MD);
		}
		const msg =
			parsed.rate === undefined
				? await runtime.runPromise(Rate.getRate(parsed.from, parsed.to))
				: await runtime.runPromise(
						Rate.setRate(parsed.from, parsed.to, parsed.rate),
					);
		return ctx.reply(msg, MD);
	});

	bot.command("currency", async (ctx) => {
		const code = ctx.match?.trim().toUpperCase();
		const msg = code
			? await runtime.runPromise(Currency.setCurrency(String(ctx.chat.id), code))
			: await runtime.runPromise(Currency.getCurrency(String(ctx.chat.id)));
		return ctx.reply(msg, MD);
	});

	// ── Heuristic inference for plain text (private chat only) ──
	bot.on("message:text", async (ctx) => {
		if (ctx.chat.type !== "private") return;

		const results = inferAll(ctx.message.text);
		if (results.length === 0) return;

		const msgs: string[] = [];
		for (const inferred of results) {
			const msg = await runtime.runPromise(
				add({
					...inferred,
					chatId: String(ctx.chat.id),
					userId: String(ctx.from.id),
					userName: ctx.from.first_name ?? "Unknown",
				}),
			);
			msgs.push(msg);
		}

		const header =
			results.length > 1
				? `🤖 识别到 ${results.length} 笔交易:\n\n`
				: "🤖 ";
		return ctx.reply(`${header}${msgs.join("\n")}`, MD);
	});

	return bot;
}
