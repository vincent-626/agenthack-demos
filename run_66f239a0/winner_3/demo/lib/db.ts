import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'debtlens.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY,
      repo_url TEXT NOT NULL,
      repo_owner TEXT NOT NULL,
      repo_name TEXT NOT NULL,
      scanned_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      is_demo INTEGER NOT NULL DEFAULT 0,
      debt_score INTEGER,
      estimated_annual_cost_usd INTEGER,
      delivery_risk TEXT,
      incidents_avoided_per_quarter INTEGER,
      repo_age_days INTEGER,
      total_commits INTEGER,
      commits_last_90_days INTEGER,
      open_debt_issues INTEGER,
      avg_pr_merge_time_hours REAL,
      outdated_dependencies INTEGER,
      total_dependencies INTEGER,
      raw_github_data TEXT
    );

    CREATE TABLE IF NOT EXISTS debt_signals (
      id TEXT PRIMARY KEY,
      scan_id TEXT NOT NULL REFERENCES scans(id),
      signal_type TEXT NOT NULL,
      title TEXT NOT NULL,
      business_implication TEXT NOT NULL,
      severity TEXT NOT NULL,
      raw_value REAL,
      benchmark_value REAL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS remediation_items (
      id TEXT PRIMARY KEY,
      scan_id TEXT NOT NULL REFERENCES scans(id),
      priority INTEGER NOT NULL,
      action_title TEXT NOT NULL,
      action_detail TEXT NOT NULL,
      estimated_engineer_days REAL NOT NULL,
      projected_annual_savings_usd INTEGER NOT NULL,
      score_improvement_pts INTEGER NOT NULL,
      effort_level TEXT NOT NULL
    );
  `);
}
