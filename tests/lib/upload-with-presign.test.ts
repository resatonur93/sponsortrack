import { describe, it, expect } from "vitest";
import { resolveMimeType } from "@/lib/client/upload-with-presign";

function makeFile(name: string, type: string): File {
  return new File(["dummy content"], name, { type });
}

describe("resolveMimeType", () => {
  it("tarayıcının bildirdiği türü kullanır", () => {
    const file = makeFile("cv.pdf", "application/pdf");
    expect(resolveMimeType(file)).toBe("application/pdf");
  });

  it("tür boşsa .docx uzantısından Word MIME türünü çıkarır", () => {
    const file = makeFile("contract.docx", "");
    expect(resolveMimeType(file)).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  });

  it("tür boşsa .doc uzantısından eski Word MIME türünü çıkarır", () => {
    const file = makeFile("old-contract.doc", "");
    expect(resolveMimeType(file)).toBe("application/msword");
  });

  it("tür boşsa .xlsx uzantısından Excel MIME türünü çıkarır", () => {
    const file = makeFile("payroll.xlsx", "");
    expect(resolveMimeType(file)).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  });

  it("tür boşsa .xls uzantısından eski Excel MIME türünü çıkarır", () => {
    const file = makeFile("payroll.xls", "");
    expect(resolveMimeType(file)).toBe("application/vnd.ms-excel");
  });

  it("bilinmeyen uzantı ve boş türde octet-stream'e düşer", () => {
    const file = makeFile("mystery.xyz", "");
    expect(resolveMimeType(file)).toBe("application/octet-stream");
  });
});
