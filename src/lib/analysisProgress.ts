export const STEP_INTERVAL_MS = 1200;

export function createStepAnimator(
  totalSteps: number,
  onStep: (stepIdx: number, progress: number) => void
): () => void {
  let stepIdx = 0;
  const interval = setInterval(() => {
    stepIdx++;
    if (stepIdx < totalSteps - 1) {
      onStep(stepIdx, Math.round((stepIdx / (totalSteps - 1)) * 85));
    }
  }, STEP_INTERVAL_MS);
  return () => clearInterval(interval);
}

export function estimateSecondsRemaining(
  processingStepIndex: number,
  totalSteps: number,
  intervalMs = STEP_INTERVAL_MS
): number | null {
  const remainingSteps = totalSteps - 1 - processingStepIndex;
  if (remainingSteps <= 0) return null;
  return Math.max(1, Math.ceil((remainingSteps * intervalMs) / 1000));
}

export function formatSecondsRemaining(seconds: number, isBn: boolean): string {
  if (isBn) return `আনুমানিক ${seconds} সেকেন্ড বাকি`;
  return `~${seconds}s remaining`;
}
