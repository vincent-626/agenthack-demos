interface RawMetrics {
  outdatedDeps: number;
  totalDeps: number;
  openDebtIssues: number;
  totalCommitsLast90: number;
  avgPrMergeTimeHours: number;
  repoAgeDays: number;
  totalCommits: number;
}

interface ScoreResult {
  debtScore: number;
  estimatedAnnualCostUsd: number;
  deliveryRisk: 'low' | 'medium' | 'high' | 'critical';
  incidentsAvoidedPerQuarter: number;
}

export function calculateDebtScore(metrics: RawMetrics): ScoreResult {
  // Weighted scoring: outdated deps 25%, issue backlog 25%, churn 25%, PR time 20%, age 5%

  // Outdated deps score (0-100): >50% = 100, 0% = 0
  const depRatio = metrics.totalDeps > 0 ? metrics.outdatedDeps / metrics.totalDeps : 0;
  const depScore = Math.min(100, depRatio * 200);

  // Issue backlog density (issues per 100 commits in last 90 days)
  const issueDensity = metrics.totalCommitsLast90 > 0
    ? (metrics.openDebtIssues / metrics.totalCommitsLast90) * 100
    : metrics.openDebtIssues * 10;
  const issueScore = Math.min(100, issueDensity);

  // Code churn score: very low commits = high score
  // Elite benchmark: 60+ commits/90 days; < 5 = very bad
  const churnScore = Math.max(0, Math.min(100, 100 - (metrics.totalCommitsLast90 / 60) * 60));

  // PR cycle time score: 36h benchmark (1.5 days); >240h (10 days) = 100
  const prBenchmark = 36; // hours
  const prScore = Math.min(100, Math.max(0, ((metrics.avgPrMergeTimeHours - prBenchmark) / (240 - prBenchmark)) * 100));

  // Repo age score: older with lower activity = higher debt
  const ageYears = metrics.repoAgeDays / 365;
  const commitsPerYear = metrics.repoAgeDays > 0 ? (metrics.totalCommits / ageYears) : 0;
  const ageScore = Math.min(100, Math.max(0, ageYears * 5 + (commitsPerYear < 100 ? 20 : 0)));

  const debtScore = Math.round(
    depScore * 0.25 +
    issueScore * 0.25 +
    churnScore * 0.25 +
    prScore * 0.20 +
    ageScore * 0.05
  );

  // Business metrics from score
  // $150k/yr avg dev salary × team_size_estimate × 0.42 × debtScore/100
  const teamSizeEstimate = Math.max(2, Math.round(metrics.totalCommitsLast90 / 10));
  const estimatedAnnualCostUsd = Math.round(150000 * teamSizeEstimate * 0.42 * (debtScore / 100));

  const deliveryRisk: 'low' | 'medium' | 'high' | 'critical' =
    debtScore >= 75 ? 'critical' :
    debtScore >= 50 ? 'high' :
    debtScore >= 30 ? 'medium' : 'low';

  // Incidents avoided lookup based on DORA research
  const incidentsAvoidedPerQuarter =
    debtScore >= 75 ? 8 :
    debtScore >= 50 ? 3 :
    debtScore >= 30 ? 1 : 0;

  return { debtScore, estimatedAnnualCostUsd, deliveryRisk, incidentsAvoidedPerQuarter };
}
