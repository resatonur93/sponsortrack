import type { EngineRiskSnapshot, WorkerDetailPayload } from "./types";

export async function fetchWorkerDetail(
  workerId: string
): Promise<
  | { ok: false; status: number }
  | { ok: true; data: WorkerDetailPayload }
> {
  const res = await fetch(`/api/workers/${workerId}`, {
    credentials: "include",
  });
  if (!res.ok) return { ok: false, status: res.status };
  const json = (await res.json()) as { data: WorkerDetailPayload };
  return { ok: true, data: json.data };
}

export async function fetchWorkerEngineRisk(
  workerId: string
): Promise<EngineRiskSnapshot | null> {
  const res = await fetch(`/api/workers/${workerId}/risk-score`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { data: EngineRiskSnapshot | null };
  return json.data ?? null;
}
