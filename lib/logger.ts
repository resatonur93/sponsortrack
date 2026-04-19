type LogPayload = Record<string, unknown>;

export const logger = {
  info(message: string, payload?: LogPayload): void {
    if (payload) {
      console.info(`[sponsortrack] ${message}`, payload);
    } else {
      console.info(`[sponsortrack] ${message}`);
    }
  },
  error(message: string, error: unknown, payload?: LogPayload): void {
    const err =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { error };
    console.error(`[sponsortrack] ${message}`, { ...err, ...payload });
  },
  warn(message: string, payload?: LogPayload): void {
    console.warn(`[sponsortrack] ${message}`, payload ?? "");
  },
};
