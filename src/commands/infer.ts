import type { ParsedEntry } from '../helpers';

// ── Currency ────────────────────────────────────────────
const STRONG_CURRENCY: [RegExp, string][] = [
	[/美[元金]|美刀|\bUSD\b/i, 'USD'],
	[/人民币|\bRMB\b|\bCNY\b/i, 'CNY'],
	[/日[元円]|\bJPY\b/i, 'JPY'],
	[/欧元|\bEUR\b/i, 'EUR'],
	[/英镑|\bGBP\b/i, 'GBP'],
	[/港[币元]|\bHKD\b/i, 'HKD'],
	[/台[币元]|\bTWD\b/i, 'TWD'],
	[/韩[元圆]|\bKRW\b/i, 'KRW'],
	[/新加坡[元币]|\bSGD\b/i, 'SGD'],
	[/\bUSDT\b/i, 'USDT'],
];

const WEAK_SUFFIX: Record<string, string> = {
	块: 'CNY',
	元: 'CNY',
	刀: 'USD',
};

// ── Categories ──────────────────────────────────────────
// [keywords[], categoryName] — first match wins
const CATEGORY_RULES: [string[], string][] = [
	[['早餐', '午餐', '晚餐', '早饭', '午饭', '晚饭', '吃饭', '外卖', '火锅', '烧烤', '小吃', '宵夜', '食堂', '饭', '餐', '吃的'], '餐饮'],
	[['打车', '滴滴', '地铁', '公交', '出租', '油费', '加油', '停车', '高铁', '火车', '机票', '飞机', 'uber', 'taxi', '骑车'], '交通'],
	[['淘宝', '京东', '拼多多', '超市', '购物', '商场', '买', '网购'], '购物'],
	[['咖啡', 'coffee', '奶茶', '饮料', '星巴克', '瑞幸', '喝的'], '饮品'],
	[['电影', '游戏', 'KTV', 'ktv', '酒吧', '唱歌', '演出', '门票'], '娱乐'],
	[['房租', '租金', '水电', '物业', '房贷', '租房'], '住房'],
	[['看病', '医院', '药', '挂号', '体检', '医疗'], '医疗'],
	[['书', '课', '学费', '培训', '教育'], '教育'],
	[['话费', '流量', '网费', '宽带', '充值'], '通讯'],
	[['红包', '礼物', '份子', '请客', 'AA'], '社交'],
	[['理发', '快递', '日用', '洗衣'], '日用'],
	// Income categories
	[['工资', '薪水', '薪资', '月薪', '奖金', '年终奖', '补贴', '津贴'], '工资'],
	[['利息', '分红', '股息', '收益', '理财收益'], '理财'],
	[['退款', '退货', '退费', '退钱'], '退款'],
];

// Categories that default to income direction
const INCOME_CATEGORIES = new Set(['工资', '理财', '退款']);

// ── Direction signals ───────────────────────────────────
const EXPENSE_VERBS = /花|买|付|充|租|记[一笔账]?|报销|转|打赏|订/;
const INCOME_VERBS = /收[到了入]|赚[了到]?|到账|入账|回款|中[了奖]/;

// Cleanup patterns for note extraction
const STRIP_CURRENCY = /\bUSD\b|\bCNY\b|\bJPY\b|\bEUR\b|\bGBP\b|\bHKD\b|\bTWD\b|\bKRW\b|\bRMB\b|\bUSDT\b|\bSGD\b/gi;
const STRIP_CN_CURRENCY = /美[元金]|美刀|人民币|日[元円]|欧元|英镑|港[币元]|台[币元]|韩[元圆]|新加坡[元币]/g;
const STRIP_VERBS = /花了?|用了?|付了?|给了?|转了?|充了?|买了?|收到了?|赚了?|到账|入账/g;

// ── Helpers ─────────────────────────────────────────────

function isDateContext(text: string, idx: number, len: number): boolean {
	const after = text[idx + len] ?? '';
	const before = text[idx - 1] ?? '';
	return /[年月日号点时分秒:/-]/.test(after) || /[年月日号]/.test(before);
}

function isQuantityContext(text: string, idx: number, len: number): boolean {
	const after = text[idx + len] ?? '';
	return /[个只条件张把台本杯碗盘份套双对瓶箱袋包盒支根片颗粒人位名种次趟场遍步层栋间排节首篇集]/.test(after);
}

function detectStrongCurrency(text: string): string | null {
	for (const [re, code] of STRONG_CURRENCY) {
		if (re.test(text)) return code;
	}
	return null;
}

function inferCategory(text: string): string {
	const lower = text.toLowerCase();
	for (const [keywords, cat] of CATEGORY_RULES) {
		for (const kw of keywords) {
			if (lower.includes(kw.toLowerCase())) return cat;
		}
	}
	return '其他';
}

// ── Core algorithm ──────────────────────────────────────
//
// 1. Scan for [±]numbers, skipping date/quantity context
// 2. Capture optional weak currency suffix (块/元/刀)
// 3. Detect strong currency signals anywhere in text
// 4. Match category keywords
// 5. Determine direction: explicit sign > income verbs > income category > expense
// 6. Score confidence ≥ 2 to accept
//    +1 number found, +1 currency, +1 category, +1 intent verb, +1 short msg
// 7. Build note from leftover text

export interface InferResult extends ParsedEntry {
	confidence: number;
}

export function inferFromMessage(text: string): InferResult | null {
	if (/^\//.test(text) || text.length > 100) return null;

	// Step 1+2: extract optional sign, number, optional weak suffix
	const re = /([+-]?)(\d+(?:\.\d{1,2})?)\s*([块元刀])?/g;
	let best: {
		absAmount: number;
		raw: string;
		weakCurrency: string | null;
		explicitSign: 1 | -1 | 0;
	} | null = null;

	let m: RegExpExecArray | null;
	while ((m = re.exec(text)) !== null) {
		const signStr = m[1]!;
		const numStr = m[2]!;
		const suffix = m[3];
		const numStart = m.index + signStr.length;
		const numLen = numStr.length;

		if (isDateContext(text, numStart, numLen)) continue;
		if (!suffix && isQuantityContext(text, numStart, numLen)) continue;

		const absVal = parseFloat(numStr);
		if (absVal <= 0) continue;

		if (!best) {
			best = {
				absAmount: absVal,
				raw: m[0],
				weakCurrency: suffix ? (WEAK_SUFFIX[suffix] ?? null) : null,
				explicitSign: signStr === '+' ? 1 : signStr === '-' ? -1 : 0,
			};
		}
	}

	if (!best) return null;

	// Step 3: currency (strong > weak)
	const currency = detectStrongCurrency(text) ?? best.weakCurrency;

	// Step 4: category
	const category = inferCategory(text);

	// Step 5: direction — explicit sign > income verb > income category > expense
	let isIncome = false;
	if (best.explicitSign === 1) isIncome = true;
	else if (best.explicitSign === -1) isIncome = false;
	else if (INCOME_VERBS.test(text)) isIncome = true;
	else if (INCOME_CATEGORIES.has(category)) isIncome = true;

	const sign = isIncome ? 1 : -1;

	// Step 6: confidence
	let confidence = 1;
	if (currency) confidence++;
	if (category !== '其他') confidence++;
	if (EXPENSE_VERBS.test(text) || INCOME_VERBS.test(text)) confidence++;
	if (text.length <= 30) confidence++;

	if (confidence < 2) return null;

	// Step 7: build note
	const note = text
		.replace(best.raw, '')
		.replace(STRIP_CURRENCY, '')
		.replace(STRIP_CN_CURRENCY, '')
		.replace(STRIP_VERBS, '')
		.replace(/\s+/g, ' ')
		.trim();

	return { amount: best.absAmount * sign, currency, category, note, confidence };
}
