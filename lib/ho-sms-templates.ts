import type { EventType } from "@prisma/client";

export type WorkerSmsSlice = {
  firstName: string;
  lastName: string;
  cosReference: string;
  cosAssignDate: Date;
  salary: number;
  workLocation: string;
};

export type SalaryHistorySlice = {
  oldSalary: number;
  newSalary: number;
  effectiveDate: Date;
};

export type HoSmsOverrides = {
  oldSalary?: number;
  newSalary?: number;
  oldWorkLocation?: string;
  newWorkLocation?: string;
};

function fmtGBP(n: number): string {
  return `£${n.toLocaleString("en-GB")}`;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function workerName(w: WorkerSmsSlice): string {
  return `${w.firstName} ${w.lastName}`.trim();
}

/**
 * Home Office SMS-style wording for sponsor reporting (draft; review before submit).
 */
export function buildHoSmsReportText(
  eventType: EventType,
  eventDate: Date,
  reportDeadline: Date,
  worker: WorkerSmsSlice,
  opts?: {
    salaryHistory?: SalaryHistorySlice | null;
    overrides?: HoSmsOverrides;
  }
): string {
  const name = workerName(worker);
  const ref = worker.cosReference;
  const ev = fmtDate(eventDate);
  const dl = fmtDate(reportDeadline);
  const cosDate = fmtDate(worker.cosAssignDate);

  const o = opts?.overrides;
  const hist = opts?.salaryHistory;

  const oldSal = o?.oldSalary ?? hist?.oldSalary ?? null;
  const newSal = o?.newSalary ?? hist?.newSalary ?? worker.salary;

  const oldLoc = o?.oldWorkLocation ?? "[previous location — confirm]";
  const newLoc = o?.newWorkLocation ?? worker.workLocation;

  switch (eventType) {
    case "NO_SHOW_28_DAYS":
      return `Worker ${name} assigned CoS ${ref} on ${cosDate} did not commence employment by ${dl}.`;
    case "SALARY_REDUCTION": {
      const from =
        oldSal != null ? fmtGBP(oldSal) : "[previous salary — confirm]";
      const to = fmtGBP(newSal);
      return `Worker ${name} CoS ${ref} salary reduced from ${from} to ${to} effective ${ev}.`;
    }
    case "WORK_LOCATION_CHANGE":
      return `Worker ${name} CoS ${ref} normal work location changed from ${oldLoc} to ${newLoc}.`;
    case "UNAUTHORISED_ABSENCE_10_DAYS":
      return `Worker ${name} CoS ${ref} unauthorised absence reached the 10 UK working-day reporting threshold from ${ev}. SMS reporting deadline ${dl}.`;
    case "REDUCED_PAY_ABSENCE":
      return `Worker ${name} CoS ${ref} reduced or unpaid pay absence from ${ev}. SMS reporting deadline ${dl}.`;
    case "ROLE_CHANGE":
      return `Worker ${name} CoS ${ref} change of role or duties effective ${ev}. SMS deadline ${dl}.`;
    case "PROMOTION_SAME_CODE":
      return `Worker ${name} CoS ${ref} promoted within the same SOC code effective ${ev}. SMS deadline ${dl}.`;
    case "SPONSORSHIP_ENDED":
      return `Worker ${name} CoS ${ref} sponsorship / employment ended effective ${ev}. SMS deadline ${dl}.`;
    case "OFFSHORE_ARRIVAL":
      return `Worker ${name} CoS ${ref} commenced offshore assignment from ${ev}. SMS deadline ${dl}.`;
    case "OFFSHORE_DEPARTURE":
      return `Worker ${name} CoS ${ref} ended offshore assignment / returned onshore from ${ev}. SMS deadline ${dl}.`;
    case "ADDRESS_CHANGE":
      return `Worker ${name} CoS ${ref} residential address changed effective ${ev}. SMS deadline ${dl}.`;
    case "PHONE_CHANGE":
      return `Worker ${name} CoS ${ref} contact telephone number changed effective ${ev}. SMS deadline ${dl}.`;
    case "EMAIL_CHANGE":
      return `Worker ${name} CoS ${ref} contact email address changed effective ${ev}. SMS deadline ${dl}.`;
    default:
      return `Worker ${name} CoS ${ref} reportable change (${eventType}) from ${ev}. SMS deadline ${dl}.`;
  }
}
