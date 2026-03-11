import { describe, it, expect } from "vitest";
import { inferFromMessage } from "../src/commands/infer";

describe("inferFromMessage", () => {
	// ── Positive cases ──────────────────────────────────
	it("午饭50 → 50, null, 餐饮", () => {
		const r = inferFromMessage("午饭50");
		expect(r).not.toBeNull();
		expect(r!.amount).toBe(50);
		expect(r!.category).toBe("餐饮");
	});

	it("50 午饭 → 50, null, 餐饮", () => {
		const r = inferFromMessage("50 午饭");
		expect(r).not.toBeNull();
		expect(r!.amount).toBe(50);
		expect(r!.category).toBe("餐饮");
	});

	it("打车30块 → 30, CNY, 交通", () => {
		const r = inferFromMessage("打车30块");
		expect(r).not.toBeNull();
		expect(r!.amount).toBe(30);
		expect(r!.currency).toBe("CNY");
		expect(r!.category).toBe("交通");
	});

	it("100刀买书 → 100, USD, 购物", () => {
		const r = inferFromMessage("100刀买书");
		expect(r).not.toBeNull();
		expect(r!.amount).toBe(100);
		expect(r!.currency).toBe("USD");
		expect(r!.category).toBe("购物");
	});

	it("咖啡35 → 35, null, 饮品", () => {
		const r = inferFromMessage("咖啡35");
		expect(r).not.toBeNull();
		expect(r!.amount).toBe(35);
		expect(r!.category).toBe("饮品");
	});

	it("50 USD 午餐 → 50, USD, 餐饮", () => {
		const r = inferFromMessage("50 USD 午餐");
		expect(r).not.toBeNull();
		expect(r!.amount).toBe(50);
		expect(r!.currency).toBe("USD");
		expect(r!.category).toBe("餐饮");
	});

	it("房租2000 → 2000, null, 住房", () => {
		const r = inferFromMessage("房租2000");
		expect(r).not.toBeNull();
		expect(r!.amount).toBe(2000);
		expect(r!.category).toBe("住房");
	});

	it("花了200打车去机场 → 200, null, 交通, note contains 去机场", () => {
		const r = inferFromMessage("花了200打车去机场");
		expect(r).not.toBeNull();
		expect(r!.amount).toBe(200);
		expect(r!.category).toBe("交通");
		expect(r!.note).toContain("去机场");
	});

	it("星巴克 45.5元 → 45.5, CNY, 饮品", () => {
		const r = inferFromMessage("星巴克 45.5元");
		expect(r).not.toBeNull();
		expect(r!.amount).toBe(45.5);
		expect(r!.currency).toBe("CNY");
		expect(r!.category).toBe("饮品");
	});

	it("uber 23.5 usd → 23.5, USD, 交通", () => {
		const r = inferFromMessage("uber 23.5 usd");
		expect(r).not.toBeNull();
		expect(r!.amount).toBe(23.5);
		expect(r!.currency).toBe("USD");
		expect(r!.category).toBe("交通");
	});

	it("充话费100 → 100, null, 通讯", () => {
		const r = inferFromMessage("充话费100");
		expect(r).not.toBeNull();
		expect(r!.amount).toBe(100);
		expect(r!.category).toBe("通讯");
	});

	it("买了件衣服花了300块 → 300, CNY, 购物", () => {
		const r = inferFromMessage("买了件衣服花了300块");
		expect(r).not.toBeNull();
		expect(r!.amount).toBe(300);
		expect(r!.currency).toBe("CNY");
		expect(r!.category).toBe("购物");
	});

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
		// just a number with no other signals in a longish message
		const r = inferFromMessage("我觉得这个方案还是可以的吧你觉得呢大概需要5个人");
		expect(r).toBeNull();
	});

	// ── Confidence scoring ──────────────────────────────
	it("higher confidence with more signals", () => {
		const r = inferFromMessage("打车30块");
		expect(r).not.toBeNull();
		// number(1) + currency(1) + category(1) + short(1) = 4
		expect(r!.confidence).toBeGreaterThanOrEqual(3);
	});

	it("confidence ≥ 2 required", () => {
		// "100" alone: number(1) + short(1) = 2, should pass
		const r = inferFromMessage("100");
		expect(r).not.toBeNull();
		expect(r!.confidence).toBeGreaterThanOrEqual(2);
	});
});
