/** UK-centric sponsor common visa route labels — stored as arbitrary string in Worker.visaType */

export const VISA_TYPE_OPTIONS = [
  { value: "Skilled Worker", labelKey: "workerForm.visa.skilledWorker" },
  {
    value: "Global Business Mobility — Senior/Specialist",
    labelKey: "workerForm.visa.gbmSenior",
  },
  {
    value: "Global Business Mobility — Graduate Trainee",
    labelKey: "workerForm.visa.gbmGraduate",
  },
  {
    value: "Global Talent",
    labelKey: "workerForm.visa.globalTalent",
  },
  {
    value: "Scale-up Worker",
    labelKey: "workerForm.visa.scaleUp",
  },
  {
    value: "Healthcare / Care Worker",
    labelKey: "workerForm.visa.healthCare",
  },
  {
    value: "Temporary Work — Religious worker",
    labelKey: "workerForm.visa.religious",
  },
  { value: "Other", labelKey: "workerForm.visa.other" },
] as const;

export const COMMON_JOB_TITLES = [
  "Software Engineer",
  "Senior Software Engineer",
  "Mechanical Engineer",
  "Finance Manager",
  "Business Analyst",
  "Project Manager",
  "Healthcare Assistant",
  "Registered Nurse — Adult",
  "CHEF",
  "Restaurant Manager",
  "Quantity Surveyor",
  "Architect",
  "Electrician",
] as const;

/** Sample SOC codes (shortlist); user can enter any code via manual field */
export const SOC_CODE_OPTIONS = [
  "2434",
  "2136",
  "2134",
  "2121",
  "2425",
  "2122",
  "2135",
  "2251",
  "3113",
  "3411",
  "7112",
  "7113",
  "7114",
  "7115",
] as const;

export const WORK_LOCATION_OPTIONS = [
  "London, UK",
  "Manchester, UK",
  "Glasgow, UK",
  "Edinburgh, UK",
  "Rotterdam — vessel supply",
  "Aberdeen — offshore marine",
  "Remote UK",
  "Client site UK",
] as const;

export const PHONE_PREFIXES = [
  { value: "+44", labelKey: "workerForm.phone.uk" },
  { value: "+90", labelKey: "workerForm.phone.tr" },
  { value: "+1", labelKey: "workerForm.phone.us" },
  { value: "+49", labelKey: "workerForm.phone.de" },
  { value: "+33", labelKey: "workerForm.phone.fr" },
  { value: "", labelKey: "workerForm.phone.raw" },
] as const;

export type NationalityPreset = "UK" | "TR" | "OTHER";

export const NATIONALITY_PRESET_META: Record<
  Exclude<NationalityPreset, "OTHER">,
  string
> = {
  UK: "UK",
  TR: "Turkey",
};
