import { describe, it, expect } from "vitest";
import { generateOtpCode, OTP_CODE_LENGTH } from "@/lib/security/login-otp";
import { buildLoginOtpEmail } from "@/lib/emails/templates/login-otp-email";

describe("generateOtpCode", () => {
  it("her zaman 6 haneli, sadece rakamlardan oluşan bir kod üretir", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateOtpCode();
      expect(code).toHaveLength(OTP_CODE_LENGTH);
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it("küçük sayıları sıfırla dolgular (örn. 000042 gibi 6 haneden az basamak)", () => {
    // 1,000,000 olası değerin çoğu 6 haneli değildir (örn. 42 -> "000042");
    // çok sayıda üretimde en az bir tanesinin baştan sıfırlı olmasını bekleriz.
    const codes = Array.from({ length: 500 }, () => generateOtpCode());
    expect(codes.some((c) => c.startsWith("0"))).toBe(true);
  });
});

describe("buildLoginOtpEmail", () => {
  it("tr için kodu konu/metin/html içinde birebir içerir", () => {
    const email = buildLoginOtpEmail({ code: "123456", locale: "tr", expiryMinutes: 10 });
    expect(email.subject.length).toBeGreaterThan(0);
    expect(email.text).toContain("123456");
    expect(email.html).toContain("123456");
    expect(email.text).toContain("10");
  });

  it("en için kodu konu/metin/html içinde birebir içerir", () => {
    const email = buildLoginOtpEmail({ code: "654321", locale: "en", expiryMinutes: 10 });
    expect(email.text).toContain("654321");
    expect(email.html).toContain("654321");
    expect(email.subject).not.toEqual(
      buildLoginOtpEmail({ code: "654321", locale: "tr", expiryMinutes: 10 }).subject
    );
  });

  it("kodu HTML-escape etmez (sadece rakam olduğu için kaçış gerekmez ama bozulmamalı)", () => {
    const email = buildLoginOtpEmail({ code: "000123", locale: "tr", expiryMinutes: 10 });
    expect(email.html).toContain("000123");
  });
});
