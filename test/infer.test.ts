import { describe, it, expect } from "vitest";
import { inferFromMessage } from "../src/commands/infer";

describe("inferFromMessage", () => {
// ── Expense cases (negative amounts) ────────────────
it("午饭50 → -50, 餐饮", () => {
const r = inferFromMessage("午饭50");
expect(r).not.toBeNull();
expect(r!.amount).toBe(-50);
expect(r!.category).toBe("餐饮");
});

it("50 午饭 → -50, 餐饮", () => {
const r = inferFromMessage("50 午饭");
expect(r).not.toBeNull();
expect(r!.amount).toBe(-50);
expect(r!.category).toBe("餐饮");
});

it("打车30块 → -30, CNY, 交通", () => {
const r = inferFromMessage("打车30块");
expect(r).not.toBeNull();
expect(r!.amount).toBe(-30);
expect(r!.currency).toBe("CNY");
expect(r!.category).toBe("交通");
});

it("100刀买书 → -100, USD, 购物", () => {
const r = inferFromMessage("100刀买书");
expect(r).not.toBeNull();
expect(r!.amount).toBe(-100);
expect(r!.currency).toBe("USD");
expect(r!.category).toBe("购物");
});

it("咖啡35 → -35, 饮品", () => {
const r = inferFromMessage("咖啡35");
expect(r).not.toBeNull();
expect(r!.amount).toBe(-35);
expect(r!.category).toBe("饮品");
});

it("50 USD 午餐 → -50, USD, 餐饮", () => {
const r = inferFromMessage("50 USD 午餐");
expect(r).not.toBeNull();
expect(r!.amount).toBe(-50);
expect(r!.currency).toBe("USD");
expect(r!.category).toBe("餐饮");
});

it("房租2000 → -2000, 住房", () => {
const r = inferFromMessage("房租2000");
expect(r).not.toBeNull();
expect(r!.amount).toBe(-2000);
expect(r!.category).toBe("住房");
});

it("花了200打车去机场 → -200, 交通", () => {
const r = inferFromMessage("花了200打车去机场");
expect(r).not.toBeNull();
expect(r!.amount).toBe(-200);
expect(r!.category).toBe("交通");
expect(r!.note).toContain("去机场");
});

it("星巴克 45.5元 → -45.5, CNY, 饮品", () => {
const r = inferFromMessage("星巴克 45.5元");
expect(r).not.toBeNull();
expect(r!.amount).toBe(-45.5);
expect(r!.currency).toBe("CNY");
expect(r!.category).toBe("饮品");
});

it("uber 23.5 usd → -23.5, USD, 交通", () => {
const r = inferFromMessage("uber 23.5 usd");
expect(r).not.toBeNull();
expect(r!.amount).toBe(-23.5);
expect(r!.currency).toBe("USD");
expect(r!.category).toBe("交通");
});

it("充话费100 → -100, 通讯", () => {
const r = inferFromMessage("充话费100");
expect(r).not.toBeNull();
expect(r!.amount).toBe(-100);
expect(r!.category).toBe("通讯");
});

it("买了件衣服花了300块 → -300, CNY, 购物", () => {
const r = inferFromMessage("买了件衣服花了300块");
expect(r).not.toBeNull();
expect(r!.amount).toBe(-300);
expect(r!.currency).toBe("CNY");
expect(r!.category).toBe("购物");
});

it("explicit minus: -50块 → -50, CNY", () => {
const r = inferFromMessage("-50块");
expect(r).not.toBeNull();
expect(r!.amount).toBe(-50);
expect(r!.currency).toBe("CNY");
});

// ── Income cases (positive amounts) ─────────────────
it("工资5000 → +5000, 工资", () => {
const r = inferFromMessage("工资5000");
expect(r).not.toBeNull();
expect(r!.amount).toBe(5000);
expect(r!.category).toBe("工资");
});

it("收到200块 → +200, CNY", () => {
const r = inferFromMessage("收到200块");
expect(r).not.toBeNull();
expect(r!.amount).toBe(200);
expect(r!.currency).toBe("CNY");
});

it("收到工资8000 → +8000, 工资", () => {
const r = inferFromMessage("收到工资8000");
expect(r).not.toBeNull();
expect(r!.amount).toBe(8000);
expect(r!.category).toBe("工资");
});

it("退款50块 → +50, CNY, 退款", () => {
const r = inferFromMessage("退款50块");
expect(r).not.toBeNull();
expect(r!.amount).toBe(50);
expect(r!.currency).toBe("CNY");
expect(r!.category).toBe("退款");
});

it("explicit plus: +100 咖啡 → +100, 饮品", () => {
const r = inferFromMessage("+100 咖啡");
expect(r).not.toBeNull();
expect(r!.amount).toBe(100);
expect(r!.category).toBe("饮品");
});

it("赚了500刀 → +500, USD", () => {
const r = inferFromMessage("赚了500刀");
expect(r).not.toBeNull();
expect(r!.amount).toBe(500);
expect(r!.currency).toBe("USD");
});

// ── Currency priority ───────────────────────────────
it("strong currency overrides weak: 50块 美元 → USD", () => {
const r = inferFromMessage("50块 美元 午饭");
expect(r).not.toBeNull();
expect(r!.currency).toBe("USD");
});

// ── Negative cases (should return null) ─────────────
it("ignores bot commands", () => {
expect(inferFromMessage("/add 100")).toBeNull();
});

it("ignores messages with no numbers", () => {
expect(inferFromMessage("今天天气真好")).toBeNull();
});

it("ignores very long messages (> 100 chars)", () => {
expect(inferFromMessage("a".repeat(101))).toBeNull();
});

it("ignores date-context numbers: 3月15日", () => {
expect(inferFromMessage("3月15日")).toBeNull();
});

it("ignores low-confidence: bare number in long text", () => {
const r = inferFromMessage("我觉得这个方案还是可以的吧你觉得呢大概需要5个人");
expect(r).toBeNull();
});

// ── Confidence scoring ──────────────────────────────
it("higher confidence with more signals", () => {
const r = inferFromMessage("打车30块");
expect(r).not.toBeNull();
expect(r!.confidence).toBeGreaterThanOrEqual(3);
});

it("confidence ≥ 2 required", () => {
const r = inferFromMessage("100");
expect(r).not.toBeNull();
expect(r!.amount).toBe(-100);
expect(r!.confidence).toBeGreaterThanOrEqual(2);
});
});

import { inferAll } from "../src/commands/infer";

describe("inferAll - multi-sentence", () => {
it("parses diary with multiple transactions", () => {
const text =
"早上起床后我先去楼下买了早餐，一共花了28元。" +
"到了公司，领导通知我这个月绩效奖金已经打到卡里了，一共到账3500元，真是开心。" +
"中午和同事一起点外卖，我请客总共支出了185元。";
const results = inferAll(text);
expect(results.length).toBe(3);
expect(results[0]!.amount).toBe(-28);
expect(results[0]!.category).toBe("餐饮");
expect(results[1]!.amount).toBe(3500);
expect(results[1]!.category).toBe("工资");
expect(results[2]!.amount).toBe(-185);
expect(results[2]!.category).toBe("餐饮");
});

it("splits multi-amount sentences by comma", () => {
const text = "睡前看手机发现股票账户分红到账了，一共620元，另外朋友还通过微信转给我上次借他的钱300元。";
const results = inferAll(text);
expect(results.length).toBe(2);
expect(results[0]!.amount).toBe(620);
expect(results[0]!.category).toBe("理财");
expect(results[1]!.amount).toBe(300);
});

it("skips summary sentences (mentions both 收入 and 支出)", () => {
const text = "午饭花了50元。今天收入1000元，支出500元。";
const results = inferAll(text);
expect(results.length).toBe(1);
expect(results[0]!.amount).toBe(-50);
});

it("skips date-only sentences", () => {
const text = "今天是2026年3月12日，天气晴朗。午饭50元。";
const results = inferAll(text);
expect(results.length).toBe(1);
expect(results[0]!.amount).toBe(-50);
});

it("handles water/electricity as 住房", () => {
const text = "去银行转账交了水电费，花了320元。";
const results = inferAll(text);
expect(results.length).toBe(1);
expect(results[0]!.amount).toBe(-320);
expect(results[0]!.category).toBe("住房");
});

it("still works for short single messages", () => {
const results = inferAll("午饭50块");
expect(results.length).toBe(1);
expect(results[0]!.amount).toBe(-50);
});

it("parses the full user diary", () => {
const text =
"今天是2026年3月12日，天气晴朗，心情不错。" +
"早上起床后我先去楼下买了早餐，一共花了28元。" +
"到了公司，领导通知我这个月绩效奖金已经打到卡里了，一共到账3500元，真是开心。" +
"中午和同事一起点外卖，我请客总共支出了185元。" +
"下午上班途中顺便去银行转账交了水电费，花了320元。" +
"晚上回家路上买了些水果和零食，又支出了67元。" +
"睡前看手机发现股票账户分红到账了，一共620元，另外朋友还通过微信转给我上次借他的钱300元。" +
"今天一天下来收入总共4420元，支出600元，感觉生活还挺充实的。";
const results = inferAll(text);
// Should find 7 transactions, skip date intro + summary
expect(results.length).toBeGreaterThanOrEqual(6);

const amounts = results.map((r) => r.amount);
expect(amounts).toContain(-28);    // breakfast
expect(amounts).toContain(3500);   // bonus
expect(amounts).toContain(-185);   // lunch
expect(amounts).toContain(-320);   // utilities
expect(amounts).toContain(-67);    // snacks
expect(amounts).toContain(620);    // dividend
});
});
