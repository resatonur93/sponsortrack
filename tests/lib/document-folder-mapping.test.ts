import { describe, it, expect } from "vitest";
import { folderForDocumentTypes } from "@/lib/documents/document-folder-mapping";

describe("folderForDocumentTypes", () => {
  it("tek kabul edilen türü doğru klasöre eşler", () => {
    expect(folderForDocumentTypes(["COS"])).toBe("COS_APPLICATION");
    expect(folderForDocumentTypes(["EMPLOYMENT_CONTRACT"])).toBe("EMPLOYMENT_CONTRACT");
  });

  it("birden fazla kabul edilen tür varsa ilk eşleşeni döner (RTW slotu)", () => {
    expect(folderForDocumentTypes(["SHARE_CODE", "RIGHT_TO_WORK"])).toBe("RIGHT_TO_WORK");
  });

  it("pasaport/eVisa/vize/BRP hepsi kimlik-göç klasörüne düşer", () => {
    expect(folderForDocumentTypes(["PASSPORT", "EVISA", "VISA", "BRP"])).toBe(
      "IDENTITY_IMMIGRATION"
    );
  });

  it("özel bir klasörü olmayan türler için OTHER'a düşer", () => {
    expect(folderForDocumentTypes(["ATAS_CERTIFICATE"])).toBe("OTHER");
    expect(folderForDocumentTypes(["VESSEL_ASSIGNMENT_LETTER"])).toBe("OTHER");
    expect(folderForDocumentTypes(["NMC_REGISTRATION"])).toBe("OTHER");
  });
});
