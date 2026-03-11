export const START_TEXT = (isGroup: boolean) =>
	`🧾 *Tedger 记账机器人*\n\n` +
	(isGroup ? "已进入群组记账模式，所有成员可共同记账。\n\n" : "") +
	`📝 记账: \`/add [+|-]金额 [货币] [分类] [备注]\`\n` +
	`📋 记录: \`/list [条数]\`\n` +
	`📊 统计: \`/stats [today|week|month|all]\`\n` +
	`🗑 删除: \`/del ID\`\n` +
	`💱 汇率: \`/rate [FROM/TO] [汇率]\`\n` +
	`💰 货币: \`/currency [代码]\``;

export const HELP_TEXT =
	`🧾 *Tedger 使用帮助*\n\n` +
	`*记账:*\n` +
	`• \`/add 100\` — 支出 100（默认货币）\n` +
	`• \`/add +5000 工资\` — 收入 5000\n` +
	`• \`/add -50 USD 餐饮 午饭\` — 支出 50美元\n` +
	`• \`/add +200 CNY 退款\` — 收入 200人民币\n\n` +
	`*自动识别（私聊）:*\n` +
	`• \`午饭50块\` — 自动记支出\n` +
	`• \`收到工资5000\` — 自动记收入\n\n` +
	`*汇率:*\n` +
	`• \`/rate\` — 查看所有汇率\n` +
	`• \`/rate USD/CNY 7.25\` — 设置汇率\n` +
	`• \`/rate USD/CNY\` — 查看特定汇率\n\n` +
	`*统计:*\n` +
	`• \`/stats\` — 本月 • \`/stats today\` — 今日\n` +
	`• \`/stats week\` — 本周 • \`/stats all\` — 全部\n\n` +
	`*其他:*\n` +
	`• \`/currency CNY\` — 设置默认货币\n` +
	`• \`/del 42\` — 删除 #42 记录`;
