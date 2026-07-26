import { describe, it, expect } from "vitest";
import { getGreetingKey } from "@/lib/greeting";

describe("getGreetingKey", () => {
  it("gece yarısı ve öğleden önce morning döner", () => {
    expect(getGreetingKey(0)).toBe("morning");
    expect(getGreetingKey(11)).toBe("morning");
  });

  it("öğlen ile akşamüstü arası afternoon döner", () => {
    expect(getGreetingKey(12)).toBe("afternoon");
    expect(getGreetingKey(17)).toBe("afternoon");
  });

  it("akşam ve sonrası evening döner", () => {
    expect(getGreetingKey(18)).toBe("evening");
    expect(getGreetingKey(23)).toBe("evening");
  });
});
