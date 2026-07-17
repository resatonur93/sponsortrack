import { describe, it, expect } from "vitest";
import {
  visaIdempotencyKey,
  documentExpiryIdempotencyKey,
  visaNotificationsToCreate,
  dateWindowNotificationsToCreate,
  VISA_WINDOWS,
  RTW_RECHECK_WINDOWS,
  SPONSORSHIP_END_WINDOWS,
} from "@/lib/notification-rules";

describe("visaIdempotencyKey", () => {
  it("deterministik ve benzersiz key üretir", () => {
    const key = visaIdempotencyKey("worker-1", "VISA_EXPIRING_30_DAYS", "2024-12-01");
    expect(key).toBe("worker:worker-1:VISA_EXPIRING_30_DAYS:2024-12-01");
  });

  it("farklı worker için farklı key üretir", () => {
    const k1 = visaIdempotencyKey("w1", "VISA_EXPIRING_30_DAYS", "2024-12-01");
    const k2 = visaIdempotencyKey("w2", "VISA_EXPIRING_30_DAYS", "2024-12-01");
    expect(k1).not.toBe(k2);
  });
});

describe("documentExpiryIdempotencyKey", () => {
  it("doc: prefix ile key üretir", () => {
    const key = documentExpiryIdempotencyKey("w1", "doc-1", "2024-11-30");
    expect(key).toBe("doc:w1:doc-1:DOCUMENT_EXPIRING:2024-11-30");
  });
});

describe("visaNotificationsToCreate", () => {
  const visaExpiry = new Date("2024-12-01T00:00:00Z");

  it("VISA_WINDOWS sayısı kadar notification üretir", () => {
    const rows = visaNotificationsToCreate("w1", "t1", visaExpiry);
    expect(rows).toHaveLength(VISA_WINDOWS.length);
  });

  it("60 günlük pencerenin due date'i vize bitişinden 60 gün önce", () => {
    const rows = visaNotificationsToCreate("w1", "t1", visaExpiry);
    const row60 = rows.find((r) => r.eventType === "VISA_EXPIRING_60_DAYS");
    expect(row60).toBeDefined();
    const dueDate = new Date(row60!.dueDate as Date);
    const expectedDate = new Date("2024-10-02T00:00:00Z"); // 1 Ara - 60 gün
    expect(dueDate.toISOString().slice(0, 10)).toBe(
      expectedDate.toISOString().slice(0, 10)
    );
  });

  it("her notification için benzersiz idempotencyKey üretir", () => {
    const rows = visaNotificationsToCreate("w1", "t1", visaExpiry);
    const keys = rows.map((r) => r.idempotencyKey);
    const unique = new Set(keys);
    expect(unique.size).toBe(rows.length);
  });

  it("workerLabel verilince metadata worker adını içerir", () => {
    const rows = visaNotificationsToCreate("w1", "t1", visaExpiry, {
      firstName: "Ali",
      lastName: "Yılmaz",
      cosReference: "COS123",
    });
    expect(rows[0].smsDraft).toContain("Ali Yılmaz");
  });

  it("tüm notificationlar PENDING status ile oluşturulur", () => {
    const rows = visaNotificationsToCreate("w1", "t1", visaExpiry);
    expect(rows.every((r) => r.status === "PENDING")).toBe(true);
  });
});

describe("dateWindowNotificationsToCreate", () => {
  const targetDate = new Date("2024-12-01T00:00:00Z");
  const baseInput = {
    workerId: "w1",
    tenantId: "t1",
    targetDate,
    windows: RTW_RECHECK_WINDOWS,
    idKey: "rtw:check-1",
    metadataKey: "rtwNextCheckDueAt",
  };

  it("RTW pencerelerinin sayısı kadar notification üretir", () => {
    const rows = dateWindowNotificationsToCreate(baseInput);
    expect(rows).toHaveLength(RTW_RECHECK_WINDOWS.length);
  });

  it("sponsorship windows için de çalışır", () => {
    const rows = dateWindowNotificationsToCreate({
      ...baseInput,
      windows: SPONSORSHIP_END_WINDOWS,
      idKey: "sponsorship-end",
      metadataKey: "sponsorshipEndDate",
    });
    expect(rows).toHaveLength(SPONSORSHIP_END_WINDOWS.length);
    expect(rows[0].eventType).toMatch(/SPONSORSHIP_ENDING/);
  });

  it("idKey değeri idempotencyKey içinde yer alır", () => {
    const rows = dateWindowNotificationsToCreate(baseInput);
    expect(rows[0].idempotencyKey as string).toContain("rtw:check-1");
  });
});
