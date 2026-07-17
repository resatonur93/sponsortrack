import { describe, it, expect } from "vitest";
import { startOfDay, addDays, daysBetween } from "@/lib/dates";

describe("startOfDay", () => {
  it("midnight UTC için saatleri sıfırlar", () => {
    const d = new Date("2024-03-15T14:30:00Z");
    const result = startOfDay(d);
    expect(result.toISOString()).toBe("2024-03-15T00:00:00.000Z");
  });

  it("orijinal date'i mutate etmez", () => {
    const d = new Date("2024-03-15T14:30:00Z");
    startOfDay(d);
    expect(d.toISOString()).toBe("2024-03-15T14:30:00.000Z");
  });

  it("zaten midnight olan date'i değiştirmez", () => {
    const d = new Date("2024-03-15T00:00:00.000Z");
    expect(startOfDay(d).toISOString()).toBe("2024-03-15T00:00:00.000Z");
  });
});

describe("addDays", () => {
  it("pozitif gün ekler", () => {
    const d = new Date("2024-01-01T00:00:00Z");
    expect(addDays(d, 30).toISOString()).toBe("2024-01-31T00:00:00.000Z");
  });

  it("negatif gün çıkarır", () => {
    const d = new Date("2024-02-01T00:00:00Z");
    expect(addDays(d, -7).toISOString()).toBe("2024-01-25T00:00:00.000Z");
  });

  it("ay sınırını doğru geçer", () => {
    const d = new Date("2024-01-31T00:00:00Z");
    expect(addDays(d, 1).toISOString()).toBe("2024-02-01T00:00:00.000Z");
  });

  it("yıl sınırını doğru geçer", () => {
    const d = new Date("2024-12-31T00:00:00Z");
    expect(addDays(d, 1).toISOString()).toBe("2025-01-01T00:00:00.000Z");
  });

  it("0 gün date'i değiştirmez", () => {
    const d = new Date("2024-06-15T00:00:00Z");
    expect(addDays(d, 0).getTime()).toBe(d.getTime());
  });
});

describe("daysBetween", () => {
  it("iki farklı gün arasındaki farkı döndürür", () => {
    const a = new Date("2024-01-01T00:00:00Z");
    const b = new Date("2024-01-08T00:00:00Z");
    expect(daysBetween(a, b)).toBe(7);
  });

  it("b < a ise negatif değer döndürür", () => {
    const a = new Date("2024-01-10T00:00:00Z");
    const b = new Date("2024-01-01T00:00:00Z");
    expect(daysBetween(a, b)).toBe(-9);
  });

  it("aynı günü 0 olarak döndürür", () => {
    const d = new Date("2024-03-15T10:00:00Z");
    expect(daysBetween(d, d)).toBe(0);
  });

  it("saat farkını görmezden gelir", () => {
    const a = new Date("2024-03-15T23:59:59Z");
    const b = new Date("2024-03-15T00:00:01Z");
    expect(daysBetween(a, b)).toBe(0);
  });
});
