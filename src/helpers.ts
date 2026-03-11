const CURRENCIES = new Set([
	"CNY",
	"USD",
	"EUR",
	"GBP",
	"JPY",
	"KRW",
	"HKD",
	"TWD",
	"SGD",
	"AUD",
	"CAD",
	"CHF",
	"THB",
	"MYR",
	"RUB",
	"INR",
	"VND",
	"PHP",
	"IDR",
	"BRL",
	"USDT",
]);

export interface ParsedEntry {
	amount: number;
	currency: string | null;
	category: string;
	note: string;
}

/**
 * Parse: [+|-]<amount> [currency] [category] [note...]
 * Default sign is - (expense). Prefix + for income.
 * - "100"            → -100, null, 其他, ""   (expense)
 * - "+100"           →  100, null, 其他, ""   (income)
 * - "-50 USD 餐饮"   → -50,  USD, 餐饮, ""   (expense)
 * - "+5000 工资 12月" →  5000, null, 工资, "12月" (income)
 */
export function parseAddCommand(text: string): ParsedEntry | null {
	const parts = text.trim().split(/\s+/);
	if (parts.length === 0 || !parts[0]) return null;

	const raw = parts[0];
	let sign = -1; // default: expense
	let numStr = raw;
	if (raw.startsWith("+")) {
		sign = 1;
		numStr = raw.slice(1);
	} else if (raw.startsWith("-")) {
		sign = -1;
		numStr = raw.slice(1);
	}

	const absAmount = parseFloat(numStr);
	if (isNaN(absAmount) || absAmount <= 0) return null;

	let currency: string | null = null;
	let category = "其他";
	let noteStart = 1;

	if (parts.length > 1 && parts[1] && CURRENCIES.has(parts[1].toUpperCase())) {
		currency = parts[1].toUpperCase();
		noteStart = 2;
		if (parts.length > 2 && parts[2]) {
			category = parts[2];
			noteStart = 3;
		}
	} else if (parts.length > 1 && parts[1]) {
		category = parts[1];
		noteStart = 2;
	}

	const note = parts.slice(noteStart).join(" ");
	return { amount: absAmount * sign, currency, category, note };
}

export function parseRateCommand(
	text: string,
): { from: string; to: string; rate?: number } | null {
	const parts = text.trim().split(/\s+/);
	if (parts.length === 0 || !parts[0]) return null;

	const pair = parts[0].toUpperCase().split("/");
	if (pair.length !== 2 || !pair[0] || !pair[1]) return null;

	const result: { from: string; to: string; rate?: number } = {
		from: pair[0],
		to: pair[1],
	};

	if (parts.length > 1 && parts[1]) {
		const rate = parseFloat(parts[1]);
		if (isNaN(rate) || rate <= 0) return null;
		result.rate = rate;
	}

	return result;
}

export function fmt(amount: number, currency: string): string {
	const prefix = amount > 0 ? "+" : "";
	return `${prefix}${amount.toFixed(2)} ${currency}`;
}

export function fmtDate(timestamp: number): string {
	const d = new Date(timestamp * 1000);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function periodSince(period: string): number {
	const now = Math.floor(Date.now() / 1000);
	switch (period) {
		case "today":
			return now - 86400;
		case "week":
			return now - 7 * 86400;
		case "month":
			return now - 30 * 86400;
		case "year":
			return now - 365 * 86400;
		default:
			return 0;
	}
}

export function periodLabel(period: string): string {
	switch (period) {
		case "today":
			return "今日";
		case "week":
			return "本周";
		case "month":
			return "本月";
		case "year":
			return "本年";
		default:
			return "全部";
	}
}
