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
