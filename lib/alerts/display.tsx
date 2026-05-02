import type { AlertLevel, AlertType } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CalendarX,
  FileWarning,
  Plane,
  PoundSterling,
  UserX,
} from "lucide-react";

/** Full Badge `className` for table level column (orange for HIGH vs amber MEDIUM). */
export function alertLevelTableBadgeClass(level: AlertLevel): string {
  switch (level) {
    case "CRITICAL":
      return "border-transparent bg-red-600 text-white";
    case "HIGH":
      return "border-transparent bg-orange-600 text-white";
    case "MEDIUM":
      return "border-transparent bg-amber-600 text-white";
    case "LOW":
      return "border-transparent bg-emerald-600 text-white";
    default:
      return "border-transparent bg-slate-600 text-white";
  }
}

/** Extra Tailwind for summary cards / badges (HIGH uses orange vs amber MEDIUM). */
export function alertLevelRingClass(level: AlertLevel): string {
  switch (level) {
    case "CRITICAL":
      return "ring-2 ring-red-500/50 shadow-md shadow-red-500/15";
    case "HIGH":
      return "ring-2 ring-orange-500/50 shadow-md shadow-orange-400/15";
    case "MEDIUM":
      return "ring-2 ring-amber-400/45 shadow-md shadow-amber-400/12";
    case "LOW":
      return "ring-2 ring-emerald-500/35 shadow-sm shadow-emerald-500/10";
    default:
      return "";
  }
}

export function alertLevelSummarySurfaceClass(level: AlertLevel): string {
  switch (level) {
    case "CRITICAL":
      return "border-red-200 bg-gradient-to-br from-red-50 to-white";
    case "HIGH":
      return "border-orange-200 bg-gradient-to-br from-orange-50 to-white";
    case "MEDIUM":
      return "border-amber-200 bg-gradient-to-br from-amber-50 to-white";
    case "LOW":
      return "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white";
    default:
      return "border-slate-200 bg-white";
  }
}

export function alertLevelIconWrapClass(level: AlertLevel): string {
  switch (level) {
    case "CRITICAL":
      return "bg-red-100 text-red-700";
    case "HIGH":
      return "bg-orange-100 text-orange-700";
    case "MEDIUM":
      return "bg-amber-100 text-amber-800";
    case "LOW":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export function alertTypeIcon(alertType: AlertType): LucideIcon {
  switch (alertType) {
    case "DEADLINE_APPROACHING":
      return CalendarClock;
    case "DEADLINE_OVERDUE":
      return CalendarX;
    case "MISSING_DOCUMENT":
      return FileWarning;
    case "SALARY_MISMATCH":
      return PoundSterling;
    case "VISA_EXPIRING":
      return Plane;
    case "ROLE_CODE_MISMATCH":
      return AlertTriangle;
    case "UNEXPLAINED_ABSENCE":
      return UserX;
    case "ORG_CHANGE_PENDING":
      return Building2;
    default:
      return AlertTriangle;
  }
}

export function alertTypeIconTintClass(level: AlertLevel): string {
  switch (level) {
    case "CRITICAL":
      return "text-red-600 bg-red-50 border-red-200";
    case "HIGH":
      return "text-orange-600 bg-orange-50 border-orange-200";
    case "MEDIUM":
      return "text-amber-700 bg-amber-50 border-amber-200";
    default:
      return "text-emerald-700 bg-emerald-50 border-emerald-200";
  }
}
