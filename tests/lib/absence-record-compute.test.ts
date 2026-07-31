import { describe, it, expect } from "vitest";
import { overlapsUnpaidLeave, unpaidLeaveDaysInPeriod } from "@/lib/absence-record-compute";

describe("overlapsUnpaidLeave", () => {
  const period = { start: new Date("2024-03-01"), end: new Date("2024-03-31") };

  it("dönemle tamamen çakışan UNPAID_LEAVE varsa true döner", () => {
    const absences = [
      { type: "UNPAID_LEAVE" as const, startDate: new Date("2024-03-10"), endDate: new Date("2024-03-15") },
    ];
    expect(overlapsUnpaidLeave(period, absences)).toBe(true);
  });

  it("dönemin başını/sonunu kesen çakışmaları da yakalar", () => {
    const startsBeforePeriod = [
      { type: "UNPAID_LEAVE" as const, startDate: new Date("2024-02-25"), endDate: new Date("2024-03-05") },
    ];
    expect(overlapsUnpaidLeave(period, startsBeforePeriod)).toBe(true);

    const endsAfterPeriod = [
      { type: "UNPAID_LEAVE" as const, startDate: new Date("2024-03-25"), endDate: new Date("2024-04-05") },
    ];
    expect(overlapsUnpaidLeave(period, endsAfterPeriod)).toBe(true);
  });

  it("devam eden (endDate null) bir UNPAID_LEAVE için de çakışmayı yakalar", () => {
    const ongoing = [
      { type: "UNPAID_LEAVE" as const, startDate: new Date("2024-03-20"), endDate: null },
    ];
    expect(overlapsUnpaidLeave(period, ongoing)).toBe(true);
  });

  it("çakışmayan bir UNPAID_LEAVE için false döner", () => {
    const absences = [
      { type: "UNPAID_LEAVE" as const, startDate: new Date("2024-05-01"), endDate: new Date("2024-05-10") },
    ];
    expect(overlapsUnpaidLeave(period, absences)).toBe(false);
  });

  it("UNPAID_LEAVE olmayan tipleri yok sayar", () => {
    const absences = [
      { type: "SICK" as const, startDate: new Date("2024-03-10"), endDate: new Date("2024-03-15") },
    ];
    expect(overlapsUnpaidLeave(period, absences)).toBe(false);
  });
});

describe("unpaidLeaveDaysInPeriod", () => {
  const period = { start: new Date("2024-03-01"), end: new Date("2024-03-31") };

  it("tamamen dönem içindeki bir izin için tam gün sayısını döner", () => {
    const absences = [
      { type: "UNPAID_LEAVE" as const, startDate: new Date("2024-03-10"), endDate: new Date("2024-03-15") },
    ];
    expect(unpaidLeaveDaysInPeriod(period, absences)).toBe(5);
  });

  it("dönemi kesen izinleri döneme kırpar", () => {
    const startsBeforePeriod = [
      { type: "UNPAID_LEAVE" as const, startDate: new Date("2024-02-25"), endDate: new Date("2024-03-05") },
    ];
    // sadece 2024-03-01 -> 2024-03-05 kısmı sayılır = 4 gün
    expect(unpaidLeaveDaysInPeriod(period, startsBeforePeriod)).toBe(4);
  });

  it("birden fazla izni toplar", () => {
    const absences = [
      { type: "UNPAID_LEAVE" as const, startDate: new Date("2024-03-05"), endDate: new Date("2024-03-07") },
      { type: "UNPAID_LEAVE" as const, startDate: new Date("2024-03-20"), endDate: new Date("2024-03-22") },
    ];
    expect(unpaidLeaveDaysInPeriod(period, absences)).toBe(4);
  });

  it("çakışmayan izinleri saymaz", () => {
    const absences = [
      { type: "UNPAID_LEAVE" as const, startDate: new Date("2024-05-01"), endDate: new Date("2024-05-10") },
    ];
    expect(unpaidLeaveDaysInPeriod(period, absences)).toBe(0);
  });

  it("UNPAID_LEAVE olmayan tipleri saymaz", () => {
    const absences = [
      { type: "SICK" as const, startDate: new Date("2024-03-10"), endDate: new Date("2024-03-15") },
    ];
    expect(unpaidLeaveDaysInPeriod(period, absences)).toBe(0);
  });
});
