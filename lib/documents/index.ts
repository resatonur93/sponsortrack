/**
 * Document model helpers, vault ↔ compliance sync, and document-scoped notification closure.
 */
export * from "./document-email-labels";
export * from "./document-expiry-status";
export * from "./document-folder-mapping";
export * from "./document-metadata";
export {
  closeStaleDocumentExpiringNotifications,
  DOCUMENT_EXPIRY_NOTIFICATION_CLOSURE_REASON,
  isClosedForExpiredDocument,
} from "./document-expiring-notification-closure";
export {
  softUnlinkComplianceDocumentForVault,
  syncVaultToDocument,
} from "./sync-vault-to-document";
