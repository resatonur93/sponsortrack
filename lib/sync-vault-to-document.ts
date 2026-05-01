import type {
  DocumentComplianceRecordStatus,
  DocumentType,
  DocumentVault,
  Prisma,
} from "@prisma/client";
import {
  mapDocumentFolderToVaultFolder,
  mapFolderToDocumentType,
} from "@/lib/document-folder-mapping";

/**
 * When a vault file is removed, retire the linked compliance row so the checklist shows a gap
 * and a new upload can create a fresh active row (partial unique on non-deleted rows).
 */
export async function softUnlinkComplianceDocumentForVault(
  tx: Prisma.TransactionClient,
  tenantId: string,
  vaultId: string
): Promise<void> {
  await tx.document.updateMany({
    where: { tenantId, vaultFileId: vaultId, isDeleted: false },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedReason: "VAULT_FILE_REMOVED",
      vaultFileId: null,
      complianceRecordStatus: "UPLOADED",
    },
  });
}

type SyncResult = {
  documentId: string;
  documentType: DocumentType;
  complianceRecordStatus: DocumentComplianceRecordStatus;
};

/**
 * Keeps `Document` (Appendix D / traffic light) in sync with a vault row after create/update.
 * Uses one active row per (tenant, worker, documentType) enforced in the database.
 */
export async function syncVaultToDocument(
  tx: Prisma.TransactionClient,
  tenantId: string,
  workerId: string,
  vault: DocumentVault
): Promise<SyncResult | null> {
  if (vault.isDeleted) {
    return null;
  }

  const documentType = mapFolderToDocumentType(vault.folder);
  if (!documentType) {
    return null;
  }

  const vaultFolder = mapDocumentFolderToVaultFolder(vault.folder);

  const byVault = await tx.document.findFirst({
    where: { tenantId, vaultFileId: vault.id, isDeleted: false },
  });
  const bySlot = await tx.document.findFirst({
    where: { tenantId, workerId, documentType, isDeleted: false },
  });

  const existing = byVault ?? bySlot;

  const fileChanged = existing ? existing.fileHash !== vault.fileHash : true;
  const resetVerification =
    existing && fileChanged && existing.complianceRecordStatus === "VERIFIED";

  const baseFields = {
    workerId,
    tenantId,
    documentType,
    vaultFolder,
    fileName: vault.fileName,
    fileUrl: vault.fileUrl,
    mimeType: vault.mimeType,
    sizeBytes: vault.sizeBytes,
    fileHash: vault.fileHash,
    version: vault.version,
    vaultFileId: vault.id,
    expiryDate: vault.expiryDate,
    retentionUntil: vault.retentionUntil,
    uploadedBy: vault.uploadedBy,
    uploadDate: vault.updatedAt,
    replacesDocumentId: null,
    complianceRecordStatus: resetVerification
      ? ("UPLOADED" as const)
      : ((existing?.complianceRecordStatus ?? "UPLOADED") as DocumentComplianceRecordStatus),
    ...(resetVerification
      ? { verifiedAt: null, verifiedByUserId: null, verificationNote: null }
      : {}),
  };

  if (existing) {
    const updated = await tx.document.update({
      where: { id: existing.id },
      data: baseFields,
    });
    return {
      documentId: updated.id,
      documentType: updated.documentType,
      complianceRecordStatus: updated.complianceRecordStatus,
    };
  }

  const created = await tx.document.create({
    data: {
      ...baseFields,
      uploadDate: vault.createdAt,
    },
  });

  return {
    documentId: created.id,
    documentType: created.documentType,
    complianceRecordStatus: created.complianceRecordStatus,
  };
}
