/**
 * Patient next-steps generation helpers.
 * Prompt rules: prompts/patientNextSteps.ts (via BASE_MEDICAL_PROMPT).
 * TypeScript refinement: no AI, no scanner/API changes.
 */

export {
  refineNextSteps,
  NEXT_STEPS_DISCLAIMER_EN,
  NEXT_STEPS_DISCLAIMER_BN,
  type RefineNextStepsInput,
  type NextStepsFinding,
  type RefinedNextSteps,
  type NextStepFindingStatus,
} from "./refineNextSteps";
