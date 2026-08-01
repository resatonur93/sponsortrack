import type { z } from "zod";
import { workerCreateSchema } from "@/lib/schemas";

export type WorkerFormValues = z.infer<typeof workerCreateSchema>;

export const WORKER_FORM_STEP_KEYS = [
  [
    "firstName",
    "lastName",
    "email",
    "phone",
    "nationality",
    "dateOfBirth",
    "passportNumber",
    "brpNumber",
    "currentAddress",
  ],
  [
    "visaType",
    "cosReference",
    "cosAssignDate",
    "cosExpiryDate",
    "visaStartDate",
    "visaExpiryDate",
  ],
  [
    "jobTitle",
    "occupationCode",
    "jobDescription",
    "salary",
    "workLocation",
    "employmentStatus",
    "isOffshoreWorker",
    "vesselName",
  ],
] as const satisfies readonly (readonly (keyof WorkerFormValues)[])[];

export type WorkerFormStepNumber = 0 | 1 | 2 | 3;
