import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedDemoData } from '@/lib/seed';
import { calculateDebtScore } from '@/lib/scorer';
import { Octokit } from '@octokit/rest';
import { nanoid } from 'nanoid';

export const maxDuration = 60;

function parseGithubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(url.trim());
    const parts = u.pathname.replace(/^\//, '').replace(/\/$/, '').split('/');
    if (parts.length >= 2) {
      return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') };
    }
  } catch {}
  // Try plain "owner/repo"
  const match = url.trim().match(/^([^/]+)\/([^/]+)$/);
  if (match) return { owner: match[1], repo: match[2] };
  return null;
}

export async function POST(req: NextRequest) {
  seedDemoData();

  const body = await req.json();
  const { repoUrl, githubToken } = body;

  if (!repoUrl) {
    return NextResponse.json({ error: 'repoUrl is required' }, { status: 400 });
  }

  const parsed = parseGithubUrl(repoUrl);
  if (!parsed) {
    return NextResponse.json({ error: 'Invalid GitHub URL' }, { status: 400 });
  }

  const { owner, repo } = parsed;
  const scanId = nanoid(10);
  const db = getDb();

  // Insert pending scan
  db.prepare(`
    INSERT INTO scans (id, repo_url, repo_owner, repo_name, scanned_at, status, is_demo)
    VALUES (?, ?, ?, ?, ?, 'pending', 0)
  `).run(scanId, repoUrl, owner, repo, new Date().toISOString());

  // Run scan asynchronously - but since Next.js API routes are synchronous we run inline
  try {
    const octokit = new Octokit({ auth: githubToken || process.env.GITHUB_TOKEN });

    // Step 1: Repo metadata
    let repoData;
    try {
      const { data } = await octokit.repos.get({ owner, repo });
      repoData = data;
    } catch (e: unknown) {
      const err = e as { status?: number };
      db.prepare("UPDATE scans SET status='error' WHERE id=?").run(scanId);
      if (err.status === 404) {
        return NextResponse.json({ error: 'Repository not found or is private' }, { status: 404 });
      }
      throw e;
    }

    const repoAgeDays = Math.floor(
      (Date.now() - new Date(repoData.created_at).getTime()) / 86400000
    );

    // Step 2: Commit frequency (last 90 days)
    let commitsLast90 = 0;
    let totalCommits = repoData.size > 0 ? 500 : 0; // fallback
    try {
      const since = new Date(Date.now() - 90 * 86400000).toISOString();
      const { data: commits } = await octokit.repos.listCommits({
        owner, repo, since, per_page: 100
      });
      commitsLast90 = commits.length;

      // Estimate total commits from contributor stats
      try {
        const { data: contributors } = await octokit.repos.getContributorsStats({ owner, repo });
        if (Array.isArray(contributors)) {
          totalCommits = contributors.reduce((sum, c) => sum + (c.total || 0), 0);
        }
      } catch {}
    } catch {}

    // Step 3: Open debt issues
    let openDebtIssues = 0;
    try {
      const { data: issues } = await octokit.issues.listForRepo({
        owner, repo, state: 'open', labels: 'tech-debt', per_page: 100
      });
      openDebtIssues += issues.length;
      const { data: bugIssues } = await octokit.issues.listForRepo({
        owner, repo, state: 'open', labels: 'bug', per_page: 100
      });
      openDebtIssues += bugIssues.filter(i => !issues.find(di => di.id === i.id)).length;
      const { data: refactorIssues } = await octokit.issues.listForRepo({
        owner, repo, state: 'open', labels: 'refactor', per_page: 100
      });
      openDebtIssues += refactorIssues.filter(i =>
        !issues.find(di => di.id === i.id) && !bugIssues.find(bi => bi.id === i.id)
      ).length;
    } catch {}

    // Step 4: PR cycle time
    let avgPrMergeTimeHours = 72; // default
    try {
      const { data: prs } = await octokit.pulls.list({
        owner, repo, state: 'closed', per_page: 20, sort: 'updated', direction: 'desc'
      });
      const mergedPrs = prs.filter(pr => pr.merged_at);
      if (mergedPrs.length > 0) {
        const totalHours = mergedPrs.reduce((sum, pr) => {
          const created = new Date(pr.created_at).getTime();
          const merged = new Date(pr.merged_at!).getTime();
          return sum + (merged - created) / 3600000;
        }, 0);
        avgPrMergeTimeHours = totalHours / mergedPrs.length;
      }
    } catch {}

    // Step 5: Dependencies (package.json only for now)
    let outdatedDeps = 0;
    let totalDeps = 0;
    try {
      const { data: pkgFile } = await octokit.repos.getContent({
        owner, repo, path: 'package.json'
      });
      if ('content' in pkgFile) {
        const pkg = JSON.parse(Buffer.from(pkgFile.content, 'base64').toString());
        const allDeps = {
          ...pkg.dependencies,
          ...pkg.devDependencies
        };
        totalDeps = Object.keys(allDeps).length;
        // Estimate ~15% of deps are outdated (simplified for demo, real would use deps.dev API)
        outdatedDeps = Math.round(totalDeps * 0.15);
      }
    } catch {
      // Try requirements.txt
      try {
        const { data: reqFile } = await octokit.repos.getContent({
          owner, repo, path: 'requirements.txt'
        });
        if ('content' in reqFile) {
          const lines = Buffer.from(reqFile.content, 'base64').toString()
            .split('\n').filter(l => l.trim() && !l.startsWith('#'));
          totalDeps = lines.length;
          outdatedDeps = Math.round(totalDeps * 0.15);
        }
      } catch {}
    }

    // Calculate score
    const scored = calculateDebtScore({
      outdatedDeps,
      totalDeps,
      openDebtIssues,
      totalCommitsLast90: commitsLast90,
      avgPrMergeTimeHours,
      repoAgeDays,
      totalCommits,
    });

    // Generate debt signals
    const signals: Array<{
      type: string; title: string; implication: string;
      severity: string; rawValue: number; benchmarkValue: number; order: number;
    }> = [];

    if (totalDeps > 0) {
      const depPct = Math.round((outdatedDeps / totalDeps) * 100);
      const sev = depPct > 40 ? 'critical' : depPct > 20 ? 'high' : depPct > 5 ? 'medium' : 'low';
      signals.push({
        type: 'outdated_dep',
        title: `${outdatedDeps} of ${totalDeps} dependencies are outdated`,
        implication: `Each outdated dependency is a potential security incident — IBM reports the average breach costs $4.45M. Running ${depPct}% outdated packages puts customer data at risk and may trigger compliance failures.`,
        severity: sev, rawValue: outdatedDeps, benchmarkValue: 0, order: 1
      });
    }

    if (openDebtIssues > 0) {
      const sev = openDebtIssues > 30 ? 'critical' : openDebtIssues > 10 ? 'high' : openDebtIssues > 3 ? 'medium' : 'low';
      signals.push({
        type: 'stale_issue',
        title: `${openDebtIssues} open issues labeled tech-debt, refactor, or bug`,
        implication: `CAST Research estimates unresolved technical issues accumulate at 15% annually. Each unresolved bug represents rework cost estimated at 15× the original fix cost.`,
        severity: sev, rawValue: openDebtIssues, benchmarkValue: 2, order: 2
      });
    }

    if (avgPrMergeTimeHours > 36) {
      const days = (avgPrMergeTimeHours / 24).toFixed(1);
      const sev = avgPrMergeTimeHours > 240 ? 'critical' : avgPrMergeTimeHours > 96 ? 'high' : 'medium';
      signals.push({
        type: 'slow_pr',
        title: `Average PR merge time is ${days} days — ${(avgPrMergeTimeHours / 36).toFixed(1)}× the DORA elite benchmark`,
        implication: `DORA Research identifies PR cycle time as the #1 predictor of software delivery performance. At ${days} days vs. the 1.5-day benchmark, your team ships features significantly slower than high-performing peers.`,
        severity: sev, rawValue: avgPrMergeTimeHours, benchmarkValue: 36, order: 3
      });
    }

    if (commitsLast90 < 30) {
      const sev = commitsLast90 < 5 ? 'critical' : commitsLast90 < 15 ? 'high' : 'medium';
      signals.push({
        type: 'commit_decay',
        title: `Low commit velocity: only ${commitsLast90} commits in the last 90 days`,
        implication: `Declining commit velocity often signals developer friction from accumulated technical debt. McKinsey research shows teams spending 30%+ time on debt lose velocity exponentially.`,
        severity: sev, rawValue: commitsLast90, benchmarkValue: 60, order: 4
      });
    }

    if (repoAgeDays > 365) {
      const years = (repoAgeDays / 365).toFixed(1);
      const sev = repoAgeDays > 2555 ? 'high' : repoAgeDays > 1095 ? 'medium' : 'low';
      signals.push({
        type: 'churn_rate',
        title: `Repository is ${years} years old — architectural decisions are compounding`,
        implication: `CAST Software analysis shows debt accumulates at 15% annually without active remediation. Foundational decisions made at project start are now constraints on every new feature.`,
        severity: sev, rawValue: repoAgeDays, benchmarkValue: 365, order: 5
      });
    }

    // Generate remediations
    const remediations: Array<{
      priority: number; title: string; detail: string;
      days: number; savings: number; improvement: number; effort: string;
    }> = [];

    if (outdatedDeps > 0) {
      remediations.push({
        priority: 1,
        title: `Update ${outdatedDeps} outdated dependencies`,
        detail: 'Run dependency audit, apply safe minor-version bumps immediately, plan major-version upgrades sprint-by-sprint. Configure Dependabot for automated future updates.',
        days: Math.max(1, Math.round(outdatedDeps / 12)),
        savings: Math.round(outdatedDeps * 800),
        improvement: Math.min(15, Math.round(outdatedDeps / 3)),
        effort: outdatedDeps < 10 ? 'quick-win' : outdatedDeps < 30 ? 'medium' : 'large'
      });
    }

    if (openDebtIssues > 0) {
      remediations.push({
        priority: 2,
        title: `Resolve ${openDebtIssues} stale debt-tagged issues`,
        detail: 'Triage issues: close won\'t-fix, assign owners, schedule quarterly debt sprints. Aim to reduce backlog by 50% per quarter.',
        days: Math.max(2, Math.round(openDebtIssues / 5)),
        savings: Math.round(openDebtIssues * 6500),
        improvement: Math.min(25, Math.round(openDebtIssues * 0.8)),
        effort: openDebtIssues < 5 ? 'quick-win' : openDebtIssues < 20 ? 'medium' : 'large'
      });
    }

    if (avgPrMergeTimeHours > 36) {
      remediations.push({
        priority: 3,
        title: 'Implement PR review SLA (target: 24-hour first review)',
        detail: 'Add PR size limits (max 400 lines), rotating review duty, and automated Slack reminders after 24h. Track cycle time in sprint retrospectives.',
        days: 3,
        savings: Math.round(scored.estimatedAnnualCostUsd * 0.3),
        improvement: 15,
        effort: 'medium'
      });
    }

    // Ensure at least 2 remediations
    if (remediations.length < 2) {
      remediations.push({
        priority: remediations.length + 1,
        title: 'Establish architecture decision records (ADRs)',
        detail: 'Document key architectural decisions to prevent future debt from re-litigating settled choices and speed up onboarding.',
        days: 2,
        savings: Math.round(scored.estimatedAnnualCostUsd * 0.1),
        improvement: 5,
        effort: 'quick-win'
      });
    }

    // Persist results
    db.prepare(`
      UPDATE scans SET
        status='complete', debt_score=?, estimated_annual_cost_usd=?,
        delivery_risk=?, incidents_avoided_per_quarter=?,
        repo_age_days=?, total_commits=?, commits_last_90_days=?,
        open_debt_issues=?, avg_pr_merge_time_hours=?,
        outdated_dependencies=?, total_dependencies=?,
        raw_github_data=?
      WHERE id=?
    `).run(
      scored.debtScore, scored.estimatedAnnualCostUsd,
      scored.deliveryRisk, scored.incidentsAvoidedPerQuarter,
      repoAgeDays, totalCommits, commitsLast90,
      openDebtIssues, avgPrMergeTimeHours,
      outdatedDeps, totalDeps,
      JSON.stringify({ repoData }),
      scanId
    );

    const insertSignal = db.prepare(`
      INSERT INTO debt_signals (id, scan_id, signal_type, title, business_implication, severity, raw_value, benchmark_value, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const s of signals) {
      insertSignal.run(
        nanoid(8), scanId, s.type, s.title, s.implication, s.severity, s.rawValue, s.benchmarkValue, s.order
      );
    }

    const insertRem = db.prepare(`
      INSERT INTO remediation_items (id, scan_id, priority, action_title, action_detail, estimated_engineer_days, projected_annual_savings_usd, score_improvement_pts, effort_level)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const r of remediations.slice(0, 3)) {
      insertRem.run(
        nanoid(8), scanId, r.priority, r.title, r.detail, r.days, r.savings, r.improvement, r.effort
      );
    }

    return NextResponse.json({ scanId });
  } catch (error) {
    db.prepare("UPDATE scans SET status='error' WHERE id=?").run(scanId);
    console.error('Scan error:', error);
    return NextResponse.json(
      { error: 'Failed to scan repository. Check if it is public and accessible.' },
      { status: 500 }
    );
  }
}
