/**
 * Memory Decay & Forgetting Curve Calculator
 * Calculates current retention percentage based on Ebbinghaus Forgetting Curve formula.
 */
export function calculateMemoryRetention(initialPercentage, lastPracticedDate) {
  if (initialPercentage == null || !lastPracticedDate) {
    return {
      decayedPercentage: 0,
      initialPercentage: 0,
      daysElapsed: 999,
      retentionFactor: 0,
      statusKey: 'new',
      statusLabel: 'New Set (Not Practiced Yet)',
      statusColor: '#2563eb',
      statusBg: '#eff6ff',
      recommendationText: 'Start your first practice session to build memory!',
      needsReviewToday: true,
      priority: 1,
    };
  }

  const now = new Date();
  const lastDate = new Date(lastPracticedDate);
  const diffMs = Math.max(0, now - lastDate);
  const daysElapsed = diffMs / (1000 * 60 * 60 * 24);

  // Ebbinghaus exponential decay formula: Retention = exp(-0.07 * daysElapsed)
  // Clamped between 20% (baseline long term memory) and 100%
  const retentionFactor = Math.max(0.20, Math.exp(-0.07 * daysElapsed));
  const decayedPercentage = Math.round(initialPercentage * retentionFactor);
  const daysRounded = Math.floor(daysElapsed);

  if (decayedPercentage < 50 || daysElapsed >= 4) {
    return {
      decayedPercentage,
      initialPercentage,
      daysElapsed: daysRounded,
      retentionFactor,
      statusKey: 'urgent',
      statusLabel: daysRounded === 0 ? '⚡ Review Needed Today' : `⚡ Needs Urgent Review (${daysRounded}d ago)`,
      statusColor: '#dc2626',
      statusBg: '#fef2f2',
      recommendationText: 'Memory is fading fast! Review today to restore 100% mastery.',
      needsReviewToday: true,
      priority: 1,
    };
  }

  if (decayedPercentage < 75 || daysElapsed >= 2) {
    return {
      decayedPercentage,
      initialPercentage,
      daysElapsed: daysRounded,
      retentionFactor,
      statusKey: 'warning',
      statusLabel: `⏳ Memory Fading (${decayedPercentage}%)`,
      statusColor: '#d97706',
      statusBg: '#fffbe3',
      recommendationText: 'Ideal time for a refresher session before you forget.',
      needsReviewToday: true,
      priority: 2,
    };
  }

  return {
    decayedPercentage,
    initialPercentage,
    daysElapsed: daysRounded,
    retentionFactor,
    statusKey: 'good',
    statusLabel: `🔥 Strong Memory (${decayedPercentage}%)`,
    statusColor: '#16a34a',
    statusBg: '#f0fdf4',
    recommendationText: 'Memory is strong! No urgent review needed today.',
    needsReviewToday: false,
    priority: 3,
  };
}
