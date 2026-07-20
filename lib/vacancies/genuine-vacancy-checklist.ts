/** Fixed genuine-vacancy questionnaire; answers stored as `{[id]: boolean}` on Vacancy.genuineVacancyChecklist. */
export const GENUINE_VACANCY_QUESTIONS = [
  "genuineNeed",
  "dutiesMatchSoc",
  "salaryMarketRate",
  "notCreatedForVisa",
  "noUnspentRedundancy",
] as const;

export type GenuineVacancyQuestionId = (typeof GENUINE_VACANCY_QUESTIONS)[number];
