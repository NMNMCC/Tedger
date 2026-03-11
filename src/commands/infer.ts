import type { ParsedEntry } from '../helpers';

// ── Currency ────────────────────────────────────────────
// Strong signals: matched anywhere in text
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

// Weak signals: only count when directly after a number (e.g. "50块")
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
];

// Verbs that boost confidence ("expense" intent)
const EXPENSE_VERBS = /花|买|付|充|租|记[一笔账]?|报销|转|打赏|订/;

// Cleanup patterns for note extraction
const STRIP_CURRENCY = /\bUSD\b|\bCNY\b|\bJPY\b|\bEUR\b|\bGBP\b|\bHKD\b|\bTWD\b|\bKRW\b|\bRMB\b|\bUSDT\b|\bSGD\b/gi;
const STRIP_CN_CURRENCY = /美[元金]|美刀|人民币|日[元円]|欧元|英镑|港[币元]|台[币元]|韩[元圆]|新加坡[元币]/g;
const STRIP_VERBS = /花了?|用了?|付了?|给了?|转了?|充了?|买了?/g;

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
// 1. Scan for numbers, skipping date-context (3月, 15号…)
// 2. If a weak currency suffix (块/元/刀) follows the number, capture it
// 3. Detect strong currency signals anywhere in text
// 4. Match category keywords
// 5. Score confidence; require ≥ 2 to accept
//    +1  found a positive number
//    +1  currency detected (strong or weak)
//    +1  category != "其他"
//    +1  expense verb present
//    +1  message is short (≤ 30 chars)
// 6. Build note from leftover text

export interface InferResult extends ParsedEntry {
	confidence: number;
}

export function inferFromMessage(text: string): InferResult | null {
	if (/^\//.test(text) || text.length > 100) return null;

	// Step 1+2: extract numbers and optional weak suffix
	const re = /(\d+(?:\.\d{1,2})?)\s*([块元刀])?/g;
	let best: {
		amount: number;
		raw: string;
		weakCurrency: string | null;
	} | null = null;

	let m: RegExpExecArray | null;
	while ((m = re.exec(text)) !== null) {
		if (isDateContext(text, m.index, m[1]!.length)) continue;
		if (!m[2] && isQuantityContext(text, m.index, m[1]!.length)) continue;
		const val = parseFloat(m[1]!);
		if (val <= 0) continue;
		// take the first valid number
		if (!best) {
			best = {
				amount: val,
				raw: m[0],
				weakCurrency: m[2] ? (WEAK_SUFFIX[m[2]] ?? null) : null,
			};
		}
	}

	if (!best) return null;

	// Step 3: currency (strong > weak)
	const currency = detectStrongCurrency(text) ?? best.weakCurrency;

	// Step 4: category
	const category = inferCategory(text);

	// Step 5: confidence
	let confidence = 1;
	if (currency) confidence++;
	if (category !== '其他') confidence++;
	if (EXPENSE_VERBS.test(text)) confidence++;
	if (text.length <= 30) confidence++;

	if (confidence < 2) return null;

	// Step 6: build note
	const note = text
		.replace(best.raw, '')
		.replace(STRIP_CURRENCY, '')
		.replace(STRIP_CN_CURRENCY, '')
		.replace(STRIP_VERBS, '')
		.replace(/\s+/g, ' ')
		.trim();

	return { amount: best.amount, currency, category, note, confidence };
}
