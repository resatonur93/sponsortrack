import { AsyncLocalStorage } from "async_hooks";

export type TenantContext = {
  tenantId: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
};

const storage = new AsyncLocalStorage<TenantContext>();

export function getTenantContext(): TenantContext | undefined {
  return storage.getStore();
}

export function runWithTenantContext<T>(
  ctx: TenantContext,
  fn: () => Promise<T>
): Promise<T> {
  return storage.run(ctx, fn);
}
