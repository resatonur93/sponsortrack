import { describe, it, expect } from "vitest";
import { getReportDeadlineForEvent, usesCalendarDaysOnly } from "@/lib/deadline-rules";

const monday = new Date("2024-01-08T00:00:00Z"); // Pazartesi
const friday = new Date("2024-01-05T00:00:00Z"); // Cuma
const wednesday = new Date("2024-01-03T00:00:00Z"); // Çarşamba

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

describe("getReportDeadlineForEvent", () => {
  describe("NO_SHOW → 28 takvim günü", () => {
    it("pazartesiden 28 takvim günü ilerisini döndürür", () => {
      expect(isoDate(getReportDeadlineForEvent("NO_SHOW", monday))).toBe("2024-02-05");
    });

    it("cuma dahil hafta sonu sayar", () => {
      const result = getReportDeadlineForEvent("NO_SHOW", friday);
      expect(isoDate(result)).toBe("2024-02-02");
    });
  });

  describe("UNAUTHORISED_ABSENCE → 10 iş günü", () => {
    it("pazartesiden 10 iş günü ilerisini döndürür (2 hafta = Pazartesi)", () => {
      // 8 Oca Pazartesi + 10 iş günü = 22 Oca Pazartesi
      expect(isoDate(getReportDeadlineForEvent("UNAUTHORISED_ABSENCE", monday))).toBe("2024-01-22");
    });

    it("cumadan 10 iş günü ilerisi", () => {
      // 5 Oca Cuma + 10 iş günü = 19 Oca Cuma
      expect(isoDate(getReportDeadlineForEvent("UNAUTHORISED_ABSENCE", friday))).toBe("2024-01-19");
    });
  });

  describe("ORGANISATION_CHANGE → 20 iş günü", () => {
    it("pazartesiden 20 iş günü ilerisi hesaplanır", () => {
      // 8 Oca Pazartesi + 20 iş günü = 5 Şub Pazartesi
      expect(isoDate(getReportDeadlineForEvent("ORGANISATION_CHANGE", monday))).toBe("2024-02-05");
    });
  });

  describe("KEY_PERSONNEL_CHANGE → 20 iş günü", () => {
    it("ORGANISATION_CHANGE ile aynı iş günü kuralını uygular", () => {
      expect(
        getReportDeadlineForEvent("KEY_PERSONNEL_CHANGE", monday).getTime()
      ).toBe(
        getReportDeadlineForEvent("ORGANISATION_CHANGE", monday).getTime()
      );
    });
  });

  describe("SALARY_REDUCTION → 10 iş günü", () => {
    it("çarşambadan 10 iş günü", () => {
      // 3 Oca Çar + 10 iş = 17 Oca Çar
      expect(isoDate(getReportDeadlineForEvent("SALARY_REDUCTION", wednesday))).toBe("2024-01-17");
    });
  });

  describe("varsayılan → 10 iş günü", () => {
    it("bilinmeyen tip için 10 iş günü uygular", () => {
      // TypeScript'i atlayarak test ediyoruz
      const deadline = getReportDeadlineForEvent(
        "VISA_EXPIRING_7_DAYS" as never,
        monday
      );
      expect(isoDate(deadline)).toBe("2024-01-22");
    });
  });
});

describe("usesCalendarDaysOnly", () => {
  it("NO_SHOW için true döndürür", () => {
    expect(usesCalendarDaysOnly("NO_SHOW")).toBe(true);
  });

  it("diğer tipler için false döndürür", () => {
    expect(usesCalendarDaysOnly("UNAUTHORISED_ABSENCE")).toBe(false);
    expect(usesCalendarDaysOnly("SALARY_REDUCTION")).toBe(false);
    expect(usesCalendarDaysOnly("ORGANISATION_CHANGE")).toBe(false);
  });
});
