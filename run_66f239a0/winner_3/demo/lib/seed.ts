import { getDb } from './db';

export function seedDemoData() {
  const db = getDb();

  const existingDemo = db.prepare('SELECT id FROM scans WHERE is_demo = 1 LIMIT 1').get();
  if (existingDemo) return;

  const insertScan = db.prepare(`
    INSERT OR REPLACE INTO scans (
      id, repo_url, repo_owner, repo_name, scanned_at, status, is_demo,
      debt_score, estimated_annual_cost_usd, delivery_risk, incidents_avoided_per_quarter,
      repo_age_days, total_commits, commits_last_90_days, open_debt_issues,
      avg_pr_merge_time_hours, outdated_dependencies, total_dependencies, raw_github_data
    ) VALUES (?, ?, ?, ?, ?, 'complete', 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSignal = db.prepare(`
    INSERT OR REPLACE INTO debt_signals (
      id, scan_id, signal_type, title, business_implication, severity, raw_value, benchmark_value, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertRemediation = db.prepare(`
    INSERT OR REPLACE INTO remediation_items (
      id, scan_id, priority, action_title, action_detail,
      estimated_engineer_days, projected_annual_savings_usd, score_improvement_pts, effort_level
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();

  // Demo 1: Startup Accumulation
  insertScan.run(
    'demo-startup', 'https://github.com/acme-corp/saas-platform', 'acme-corp', 'saas-platform',
    now, 71, 340000, 'high', 3, 1095, 2847, 12, 14, 196.0, 23, 67, '{}'
  );

  [
    ['sig-s1', 'demo-startup', 'outdated_dep', '23 of 67 npm packages are outdated', 'Each outdated dependency is a potential security incident — IBM reports the average breach costs $4.45M. Running outdated packages puts customer data at risk and triggers compliance failures.', 'high', 23, 5, 1],
    ['sig-s2', 'demo-startup', 'stale_issue', '14 open issues labeled tech-debt or bug older than 30 days', 'CAST Research estimates the global cost of technical debt at $2.41T. Each unresolved bug issue represents hidden rework cost estimated at 15× the original fix cost.', 'high', 14, 2, 2],
    ['sig-s3', 'demo-startup', 'slow_pr', 'Average PR merge time is 8.2 days — 5.5× the DORA elite benchmark', 'DORA Research identifies PR cycle time as the #1 predictor of software delivery performance. At 8.2 days vs. the 1.5-day benchmark, your team ships features 5× slower than high-performing peers.', 'medium', 196, 36, 3],
    ['sig-s4', 'demo-startup', 'commit_decay', 'Commit velocity dropped 73% over last 90 days (12 commits vs. prior quarter average of 44)', 'Declining commit velocity correlates with developer friction from technical debt. McKinsey research shows teams spending 30%+ time on debt lose velocity exponentially — compounding delays.', 'medium', 12, 44, 4],
    ['sig-s5', 'demo-startup', 'churn_rate', 'Repository is 3 years old with growing complexity signals', 'CAST Software analysis of 1,500+ apps shows debt accumulates at 15% annually without active remediation. At 3 years, architectural decisions made at founding are now constraints on every new feature.', 'low', 1095, 730, 5],
  ].forEach(args => insertSignal.run(...args));

  [
    ['rem-s1', 'demo-startup', 1, 'Update 23 outdated npm dependencies', 'Run npm update for safe minor bumps; use npm-check-upgrades for major version planning. Prioritize packages with known CVEs first.', 2.0, 18400, 12, 'quick-win'],
    ['rem-s2', 'demo-startup', 2, 'Resolve 14 stale tech-debt issues', 'Dedicate one sprint to triage: close won\'t-fix, assign owners for bugs, convert to proper epics. Schedule a 2-day debt sprint each quarter.', 8.0, 95000, 22, 'medium'],
    ['rem-s3', 'demo-startup', 3, 'Implement PR review SLA policy (target: 24-hour first review)', 'Adopt a PR size limit (max 400 lines), assign rotating review duty, and add a Slack bot reminder after 24 hours. Track cycle time in your sprint retrospectives.', 3.0, 180000, 28, 'medium'],
  ].forEach(args => insertRemediation.run(...args));

  // Demo 2: Enterprise Legacy
  insertScan.run(
    'demo-enterprise', 'https://github.com/bigcorp/legacy-monolith', 'bigcorp', 'legacy-monolith',
    now, 89, 1240000, 'critical', 8, 3285, 14203, 4, 61, 312.0, 87, 210, '{}'
  );

  [
    ['sig-e1', 'demo-enterprise', 'outdated_dep', '87 of 210 dependencies critically outdated (41%) — including Java 8 (EOL 2030 but security patches ended 2022)', 'Running end-of-life Java runtime means zero security patches for known CVEs. Each critical vulnerability unpatched costs an average of $4.45M per breach (IBM Cost of Data Breach 2024). With 87 outdated packages, you carry compounding exposure.', 'critical', 87, 10, 1],
    ['sig-e2', 'demo-enterprise', 'stale_issue', '61 open debt-tagged issues — 23 older than 6 months, 8 older than 1 year', 'CAST Research: unresolved technical debt items accumulate interest at 15% annually. 61 open issues represent a $620,000+ liability in deferred rework at industry-average developer cost rates.', 'critical', 61, 5, 2],
    ['sig-e3', 'demo-enterprise', 'slow_pr', 'PR merge time averages 13 days (312 hours) — 8.7× the DORA elite benchmark of 1.5 days', 'At 13-day cycle time, your team deploys features 9× slower than DORA Elite performers. Forrester estimates this delivery gap costs $400K+ annually in delayed time-to-market for a 20-person eng team.', 'critical', 312, 36, 3],
    ['sig-e4', 'demo-enterprise', 'commit_decay', 'Only 4 commits in last 90 days on a 9-year-old codebase — severe development friction', 'A 9-year monolith with near-zero commit velocity signals developer fear of the codebase. Each code change carries high regression risk, creating a negative feedback loop that slows delivery to near-zero.', 'high', 4, 60, 4],
    ['sig-e5', 'demo-enterprise', 'bug_density', 'Repository age (9 years) with architectural debt signals — estimated 2,400+ code smells based on CAST benchmarks', 'McKinsey Tech Debt Score research: systems older than 7 years with low commit velocity have 3× higher incident rates. CAST estimates $2.41T in global tech debt — your system contributes disproportionately at this age.', 'high', 9, 3, 5],
  ].forEach(args => insertSignal.run(...args));

  [
    ['rem-e1', 'demo-enterprise', 1, 'Emergency dependency security audit and critical CVE patching', 'Engage a security firm for a 1-week dependency audit. Patch all Critical/High CVEs immediately. Establish a monthly dependency review cadence with automated Dependabot alerts.', 10.0, 55000, 8, 'quick-win'],
    ['rem-e2', 'demo-enterprise', 2, 'Strangler Fig modernization: extract 3 highest-churn bounded contexts into services', 'Identify the 3 modules changed most frequently (hotspots). Extract them as independent services over 2 quarters. This reduces blast radius of changes and unblocks parallel development.', 60.0, 340000, 35, 'large'],
    ['rem-e3', 'demo-enterprise', 3, 'Implement automated testing gate: raise coverage from ~12% to 60% on core paths', 'Block all PRs that reduce test coverage. Assign 2 engineers to write tests for the top 20 highest-risk functions. Introduce contract testing between major modules. Target: 60% coverage in 6 months.', 45.0, 600000, 38, 'large'],
  ].forEach(args => insertRemediation.run(...args));

  // Demo 3: Healthy Modern Stack
  insertScan.run(
    'demo-healthy', 'https://github.com/modern-team/clean-app', 'modern-team', 'clean-app',
    now, 22, 48000, 'low', 0, 548, 1203, 89, 2, 18.0, 3, 45, '{}'
  );

  [
    ['sig-h1', 'demo-healthy', 'outdated_dep', '3 of 45 dependencies have minor version updates available', 'Minor version updates typically include performance improvements and non-breaking bug fixes. Low urgency, but scheduling a quarterly update pass keeps the dependency graph clean and reduces future upgrade friction.', 'low', 3, 0, 1],
    ['sig-h2', 'demo-healthy', 'stale_issue', '2 open issues labeled tech-debt — both less than 14 days old', 'Freshly-filed debt issues indicate a healthy team culture of documenting technical decisions. The low count and recency suggest debt is being actively managed rather than accumulated.', 'low', 2, 5, 2],
    ['sig-h3', 'demo-healthy', 'slow_pr', 'Average PR merge time: 18 hours — within DORA High performer range (< 24 hours)', 'Your 18-hour PR cycle time puts you in the top 25% of engineering teams globally (DORA 2024). This correlates with 1.5× faster feature delivery and 4× lower change failure rate vs. industry median.', 'medium', 18, 36, 3],
    ['sig-h4', 'demo-healthy', 'commit_decay', '89 commits in last 90 days — consistent, healthy development velocity', 'Consistent commit velocity indicates low developer friction and healthy team momentum. DORA research links steady commit patterns to elite deployment frequency and organizational performance.', 'low', 89, 60, 4],
    ['sig-h5', 'demo-healthy', 'churn_rate', 'Repository age 18 months — early stage, architecture still adaptable', 'At 18 months, your codebase is past the initial experimentation phase but before the accumulated-decisions trap. This is the ideal window to establish architectural fitness functions that prevent future debt accumulation.', 'low', 548, 365, 5],
  ].forEach(args => insertSignal.run(...args));

  [
    ['rem-h1', 'demo-healthy', 1, 'Update 3 minor-version dependencies in next sprint', 'Run npm update to apply safe minor version bumps. Takes under 30 minutes. Keep the habit of reviewing Dependabot PRs weekly to maintain this healthy baseline.', 0.5, 4000, 3, 'quick-win'],
    ['rem-h2', 'demo-healthy', 2, 'Establish Architecture Decision Records (ADRs) for key design choices', 'Document the 5 most important architectural decisions made so far using the ADR template (adr.github.io). This prevents future debt from re-litigating settled decisions and onboards new engineers faster.', 2.0, 12000, 8, 'quick-win'],
    ['rem-h3', 'demo-healthy', 3, 'Set up automated dependency update PRs via Dependabot or Renovate', 'Configure Renovate (renovatebot.com) for automated weekly dependency PRs with semantic grouping. Prevents the 3 current minor updates from becoming 30+ outdated packages in 12 months.', 1.0, 28000, 10, 'quick-win'],
  ].forEach(args => insertRemediation.run(...args));
}
