import { describe, it, expect } from "vitest";
import { isAllowedUploadMimeType } from "@/lib/documents/upload-mime-allowlist";

describe("isAllowedUploadMimeType", () => {
  it("PDF ve resim türlerini kabul eder", () => {
    expect(isAllowedUploadMimeType("application/pdf")).toBe(true);
    expect(isAllowedUploadMimeType("image/jpeg")).toBe(true);
    expect(isAllowedUploadMimeType("image/png")).toBe(true);
    expect(isAllowedUploadMimeType("image/webp")).toBe(true);
  });

  it("Word dosyalarını (.doc ve .docx) kabul eder", () => {
    expect(isAllowedUploadMimeType("application/msword")).toBe(true);
    expect(
      isAllowedUploadMimeType(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      )
    ).toBe(true);
  });

  it("Excel dosyalarını (.xls ve .xlsx) kabul eder", () => {
    expect(isAllowedUploadMimeType("application/vnd.ms-excel")).toBe(true);
    expect(
      isAllowedUploadMimeType(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      )
    ).toBe(true);
  });

  it("desteklenmeyen türleri reddeder", () => {
    expect(isAllowedUploadMimeType("application/x-msdownload")).toBe(false);
    expect(isAllowedUploadMimeType("application/octet-stream")).toBe(false);
    expect(isAllowedUploadMimeType("text/html")).toBe(false);
  });
});
