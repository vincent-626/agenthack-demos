export interface Scan {
  id: string;
  repo_url: string;
  repo_owner: string;
  repo_name: string;
  scanned_at: string;
  status: 'pending' | 'complete' | 'error';
  is_demo: boolean;
  debt_score: number;
  estimated_annual_cost_usd: number;
  delivery_risk: 'low' | 'medium' | 'high' | 'critical';
  incidents_avoided_per_quarter: number;
  repo_age_days: number;
  total_commits: number;
  commits_last_90_days: number;
  open_debt_issues: number;
  avg_pr_merge_time_hours: number;
  outdated_dependencies: number;
  total_dependencies: number;
  raw_github_data: string;
}

export interface DebtSignal {
  id: string;
  scan_id: string;
  signal_type: string;
  title: string;
  business_implication: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  raw_value: number;
  benchmark_value: number;
  sort_order: number;
}

export interface RemediationItem {
  id: string;
  scan_id: string;
  priority: number;
  action_title: string;
  action_detail: string;
  estimated_engineer_days: number;
  projected_annual_savings_usd: number;
  score_improvement_pts: number;
  effort_level: 'quick-win' | 'medium' | 'large';
}

export interface ReportData {
  scan: Scan;
  signals: DebtSignal[];
  remediations: RemediationItem[];
}
