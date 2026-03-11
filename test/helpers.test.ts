import { describe, it, expect } from "vitest";
import { parseAddCommand, parseRateCommand, fmt, fmtDate, periodSince, periodLabel } from "../src/helpers";

describe("parseAddCommand", () => {
	it("parses amount only (default expense)", () => {
		expect(parseAddCommand("100")).toEqual({
			amount: -100,
			currency: null,
			category: "其他",
			note: "",
		});
	});

	it("parses explicit + as income", () => {
		expect(parseAddCommand("+100")).toEqual({
			amount: 100,
			currency: null,
			category: "其他",
			note: "",
		});
	});

	it("parses explicit - as expense", () => {
		expect(parseAddCommand("-5")).toEqual({
			amount: -5,
			currency: null,
			category: "其他",
			note: "",
		});
	});

	it("parses amount + currency (expense)", () => {
		expect(parseAddCommand("50 USD")).toEqual({
			amount: -50,
			currency: "USD",
			category: "其他",
			note: "",
		});
	});

	it("parses income with currency + category", () => {
		expect(parseAddCommand("+5000 CNY 工资 12月")).toEqual({
			amount: 5000,
			currency: "CNY",
			category: "工资",
			note: "12月",
		});
	});

	it("parses amount + category (no currency)", () => {
		expect(parseAddCommand("200 交通")).toEqual({
			amount: -200,
			currency: null,
			category: "交通",
			note: "",
		});
	});

	it("parses full: amount + currency + category + note", () => {
		expect(parseAddCommand("50 USD 餐饮 午饭")).toEqual({
			amount: -50,
			currency: "USD",
			category: "餐饮",
			note: "午饭",
		});
	});

	it("handles multi-word note", () => {
		expect(parseAddCommand("100 CNY 交通 打车去机场 很贵")).toEqual({
			amount: -100,
			currency: "CNY",
			category: "交通",
			note: "打车去机场 很贵",
		});
	});

	it("case-insensitive currency", () => {
		expect(parseAddCommand("30 eur 购物")?.currency).toBe("EUR");
	});

	it("returns null for zero and invalid", () => {
		expect(parseAddCommand("0")).toBeNull();
		expect(parseAddCommand("+0")).toBeNull();
		expect(parseAddCommand("abc")).toBeNull();
	});

	it("returns null for empty string", () => {
		expect(parseAddCommand("")).toBeNull();
	});
});

describe("parseRateCommand", () => {
	it("parses pair with rate", () => {
		expect(parseRateCommand("USD/CNY 7.25")).toEqual({
			from: "USD",
			to: "CNY",
			rate: 7.25,
		});
	});

	it("parses pair without rate (query)", () => {
		expect(parseRateCommand("USD/CNY")).toEqual({
			from: "USD",
			to: "CNY",
		});
	});

	it("returns null for invalid format", () => {
		expect(parseRateCommand("USDCNY")).toBeNull();
		expect(parseRateCommand("")).toBeNull();
	});

	it("returns null for invalid rate", () => {
		expect(parseRateCommand("USD/CNY abc")).toBeNull();
		expect(parseRateCommand("USD/CNY -1")).toBeNull();
	});
});

describe("fmt", () => {
	it("formats positive amount with + prefix", () => {
		expect(fmt(100, "CNY")).toBe("+100.00 CNY");
	});
	it("formats negative amount", () => {
		expect(fmt(-50, "USD")).toBe("-50.00 USD");
	});
	it("formats zero without prefix", () => {
		expect(fmt(0, "CNY")).toBe("0.00 CNY");
	});
});

describe("fmtDate", () => {
	it("formats unix timestamp", () => {
		// 2024-01-15 10:30 UTC → depends on timezone, just check format
		const result = fmtDate(1705311000);
		expect(result).toMatch(/^\d{2}-\d{2} \d{2}:\d{2}$/);
	});
});

describe("periodSince", () => {
	it("returns 0 for 'all'", () => {
		expect(periodSince("all")).toBe(0);
	});

	it("returns recent timestamp for 'today'", () => {
		const now = Math.floor(Date.now() / 1000);
		const since = periodSince("today");
		expect(now - since).toBeCloseTo(86400, -2);
	});
});

describe("periodLabel", () => {
	it("returns Chinese labels", () => {
		expect(periodLabel("today")).toBe("今日");
		expect(periodLabel("week")).toBe("本周");
		expect(periodLabel("month")).toBe("本月");
		expect(periodLabel("all")).toBe("全部");
	});
});
