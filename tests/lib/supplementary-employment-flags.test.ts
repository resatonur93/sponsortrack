import { describe, it, expect } from "vitest";
import { computeSupplementaryEmploymentFlags } from "@/lib/supplementary-employment-flags";

describe("computeSupplementaryEmploymentFlags", () => {
  it("saat sınırı ve meslek kodu uyumluysa hiçbir flag üretmez", () => {
    const flags = computeSupplementaryEmploymentFlags({
      hoursPerWeek: 20,
      isSameOccupation: true,
      isShortageOccupation: false,
    });
    expect(flags).toEqual([]);
  });

  it("haftalık 20 saati aşınca hours_breach üretir", () => {
    const flags = computeSupplementaryEmploymentFlags({
      hoursPerWeek: 21,
      isSameOccupation: true,
      isShortageOccupation: false,
    });
    expect(flags).toContain("hours_breach");
  });

  it("farklı meslek kodu ve shortage listesinde değilse occupation_mismatch üretir", () => {
    const flags = computeSupplementaryEmploymentFlags({
      hoursPerWeek: 10,
      isSameOccupation: false,
      isShortageOccupation: false,
    });
    expect(flags).toContain("occupation_mismatch");
  });

  it("farklı meslek kodu ama shortage listesindeyse occupation_mismatch üretmez", () => {
    const flags = computeSupplementaryEmploymentFlags({
      hoursPerWeek: 10,
      isSameOccupation: false,
      isShortageOccupation: true,
    });
    expect(flags).not.toContain("occupation_mismatch");
  });

  it("her iki kural da ihlal edilirse iki flag birden üretir", () => {
    const flags = computeSupplementaryEmploymentFlags({
      hoursPerWeek: 25,
      isSameOccupation: false,
      isShortageOccupation: false,
    });
    expect(flags).toEqual(["hours_breach", "occupation_mismatch"]);
  });
});
