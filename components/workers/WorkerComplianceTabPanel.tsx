"use client";

import type { WorkerDetailPayload } from "@/lib/workers/types";
import { WorkerComplianceChecklist } from "@/components/workers/WorkerComplianceChecklist";
import { WorkerComplianceNotifications } from "@/components/workers/WorkerComplianceNotifications";
import { WorkerRtwSection } from "@/components/workers/WorkerRtwSection";

export function WorkerComplianceTabPanel(props: {
  workerId: string;
  data: WorkerDetailPayload;
  onRefresh: () => void;
}): JSX.Element {
  const { workerId, data, onRefresh } = props;
  return (
    <div className="space-y-6">
      <WorkerComplianceChecklist data={data} />
      <WorkerRtwSection
        workerId={workerId}
        rtwChecks={data.rtwChecks ?? []}
        onDone={onRefresh}
      />
      <WorkerComplianceNotifications
        notifications={data.notifications}
        onRefresh={onRefresh}
      />
    </div>
  );
}
