/**
 * TR+EN SMTP flows for document and compliance (visa / RTW / sponsorship) anchors.
 */
export * from "./document-expiry-email-notify";
export * from "./notification-expiry-email";
export {
  DOCUMENT_EXPIRY_REMINDER_KINDS,
  expiryReminderKindMatchesCalendar,
} from "./expiry-reminder-calendar";
export {
  dedupeTrimmedEmails,
  listAuthorisingOfficerEmails,
  resolveComplianceReminderRecipients,
  resolveDocumentExpiryRecipients,
} from "./ao-recipients";
