import { describe, it, expect } from "vitest";
import {
  computeExpectedForPeriod,
  evaluateSalaryCompliance,
  parseSalaryCsvDate,
} from "@/lib/salary-record-utils";

describe("computeExpectedForPeriod", () => {
  it("tam yıllık maaşın 1 yıl için beklentisi kontrak maaşına eşittir", () => {
    const start = new Date("2024-01-01T00:00:00Z");
    const end = new Date("2024-12-31T00:00:00Z");
    // 365 gün → tam yıl
    const result = computeExpectedForPeriod(36500, start, end);
    expect(result).toBe(36500);
  });

  it("bir aylık periyod için pro-rata hesaplar (31 gün)", () => {
    const start = new Date("2024-01-01T00:00:00Z");
    const end = new Date("2024-01-31T00:00:00Z");
    // 30 gün / 365 * 36500 = ~3000
    const result = computeExpectedForPeriod(36500, start, end);
    expect(result).toBeGreaterThan(2900);
    expect(result).toBeLessThan(3100);
  });

  it("0 günlük periyod için minimum 1 gün kullanır", () => {
    const d = new Date("2024-06-15T00:00:00Z");
    const result = computeExpectedForPeriod(36500, d, d);
    expect(result).toBeGreaterThan(0);
  });
});

describe("evaluateSalaryCompliance", () => {
  const start = new Date("2024-01-01T00:00:00Z");
  const end = new Date("2024-03-31T00:00:00Z"); // ~90 gün

  it("tam ödeme yapıldığında compliant döndürür", () => {
    const expected = computeExpectedForPeriod(36000, start, end);
    const result = evaluateSalaryCompliance(36000, expected, start, end);
    expect(result.isCompliant).toBe(true);
    expect(result.discrepancyReason).toBeNull();
  });

  it("100 GBP tolerans içinde ödeme compliant sayılır", () => {
    const expected = computeExpectedForPeriod(36000, start, end);
    const result = evaluateSalaryCompliance(36000, expected - 99, start, end);
    expect(result.isCompliant).toBe(true);
  });

  it("tolerans aşılırsa non-compliant döndürür", () => {
    const expected = computeExpectedForPeriod(36000, start, end);
    const result = evaluateSalaryCompliance(36000, expected - 500, start, end);
    expect(result.isCompliant).toBe(false);
    expect(result.discrepancyReason).toMatch(/Underpayment/);
  });

  it("expectedForPeriod değerini döndürür", () => {
    const result = evaluateSalaryCompliance(36500, 9000, start, end);
    expect(result.expectedForPeriod).toBeGreaterThan(0);
  });

  it("özel tolerans parametresiyle çalışır", () => {
    const expected = computeExpectedForPeriod(36000, start, end);
    // Varsayılan tolerans 100 — büyük toleransla compliant olmalı
    const result = evaluateSalaryCompliance(36000, expected - 400, start, end, 500);
    expect(result.isCompliant).toBe(true);
  });
});

describe("parseSalaryCsvDate", () => {
  it("ISO formatını parse eder", () => {
    const result = parseSalaryCsvDate("2024-06-15");
    expect(result).not.toBeNull();
    expect(result!.getFullYear()).toBe(2024);
  });

  it("DD/MM/YYYY formatını parse eder", () => {
    const result = parseSalaryCsvDate("15/06/2024");
    expect(result).not.toBeNull();
    expect(result!.getMonth()).toBe(5); // 0-indexed
  });

  it("boş string için null döndürür", () => {
    expect(parseSalaryCsvDate("")).toBeNull();
    expect(parseSalaryCsvDate("   ")).toBeNull();
  });

  it("geçersiz tarih için null döndürür", () => {
    expect(parseSalaryCsvDate("not-a-date")).toBeNull();
  });
});
