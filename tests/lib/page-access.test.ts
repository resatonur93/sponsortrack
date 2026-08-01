import { describe, it, expect } from "vitest";
import {
  parsePageAccessOverrides,
  canAccessPage,
  resolveNavKeyForPath,
} from "@/lib/authorization/page-access";

describe("parsePageAccessOverrides", () => {
  it("null/undefined için boş obje döner", () => {
    expect(parsePageAccessOverrides(null)).toEqual({});
    expect(parsePageAccessOverrides(undefined)).toEqual({});
  });

  it("geçerli anahtar/boolean çiftlerini korur", () => {
    const result = parsePageAccessOverrides({ workers: false, alerts: true });
    expect(result).toEqual({ workers: false, alerts: true });
  });

  it("bilinmeyen anahtarları eler", () => {
    const result = parsePageAccessOverrides({ notARealPage: false, workers: false });
    expect(result).toEqual({ workers: false });
  });

  it("boolean olmayan değerleri eler", () => {
    const result = parsePageAccessOverrides({ workers: "false", alerts: 0 });
    expect(result).toEqual({});
  });

  it("dizi veya string gibi obje-olmayan değerler için boş obje döner", () => {
    expect(parsePageAccessOverrides("workers")).toEqual({});
    expect(parsePageAccessOverrides(42)).toEqual({});
  });
});

describe("canAccessPage", () => {
  it("override yoksa varsayılan olarak erişilebilir", () => {
    expect(canAccessPage({}, "workers")).toBe(true);
  });

  it("açıkça false ise erişimi kapatır", () => {
    expect(canAccessPage({ workers: false }, "workers")).toBe(false);
  });

  it("açıkça true ise erişilebilir kalır", () => {
    expect(canAccessPage({ workers: true }, "workers")).toBe(true);
  });
});

describe("resolveNavKeyForPath", () => {
  it("tam eşleşen path için doğru anahtarı döner", () => {
    expect(resolveNavKeyForPath("/workers")).toBe("workers");
  });

  it("alt path için de eşleşir", () => {
    expect(resolveNavKeyForPath("/workers/abc123")).toBe("workers");
    expect(resolveNavKeyForPath("/compliance/audit")).toBe("compliance");
  });

  it("eşleşmeyen path için null döner", () => {
    expect(resolveNavKeyForPath("/settings/users")).toBeNull();
  });

  it("benzer isimli ama farklı path'leri karıştırmaz (prefix sınırı)", () => {
    expect(resolveNavKeyForPath("/workersomething")).toBeNull();
  });
});
