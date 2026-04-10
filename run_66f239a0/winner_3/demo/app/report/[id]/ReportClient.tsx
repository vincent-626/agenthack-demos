'use client';

import { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ReportData, DebtSignal, RemediationItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingDown, Download, Link2, ArrowLeft, DollarSign,
  AlertTriangle, CheckCircle, Clock, Package, GitPullRequest,
  TrendingUp, ExternalLink, ChevronRight
} from 'lucide-react';
import {
  RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from 'recharts';

function formatCurrency(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val}`;
}

function formatHours(h: number): string {
  if (h < 24) return `${h.toFixed(1)} hrs`;
  return `${(h / 24).toFixed(1)} days`;
}

function getScoreColor(score: number): string {
  if (score >= 61) return '#ef4444';
  if (score >= 31) return '#f59e0b';
  return '#22c55e';
}

function getRiskBadge(risk: string) {
  const map: Record<string, { label: string; cls: string }> = {
    low: { label: 'Low Risk', cls: 'bg-green-100 text-green-700 border-green-200' },
    medium: { label: 'Medium Risk', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    high: { label: 'High Risk', cls: 'bg-orange-100 text-orange-700 border-orange-200' },
    critical: { label: 'Critical Risk', cls: 'bg-red-100 text-red-700 border-red-200' },
  };
  return map[risk] || map['medium'];
}

function getSeverityBadge(sev: string) {
  const map: Record<string, string> = {
    low: 'bg-slate-100 text-slate-600',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  };
  return map[sev] || map['medium'];
}

function getEffortBadge(effort: string) {
  const map: Record<string, { label: string; cls: string }> = {
    'quick-win': { label: 'Quick Win', cls: 'bg-green-100 text-green-700' },
    'medium': { label: 'Medium', cls: 'bg-amber-100 text-amber-700' },
    'large': { label: 'Large', cls: 'bg-purple-100 text-purple-700' },
  };
  return map[effort] || { label: effort, cls: 'bg-slate-100 text-slate-600' };
}

function SignalIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    outdated_dep: <Package className="w-4 h-4" />,
    stale_issue: <AlertTriangle className="w-4 h-4" />,
    slow_pr: <GitPullRequest className="w-4 h-4" />,
    commit_decay: <TrendingDown className="w-4 h-4" />,
    churn_rate: <TrendingUp className="w-4 h-4" />,
    bug_density: <AlertTriangle className="w-4 h-4" />,
  };
  return <>{icons[type] || <AlertTriangle className="w-4 h-4" />}</>;
}

interface GaugeProps {
  score: number;
}

function DebtGauge({ score }: GaugeProps) {
  const [displayed, setDisplayed] = useState(0);
  const color = getScoreColor(score);

  useEffect(() => {
    let current = 0;
    const timer = setInterval(() => {
      current += 2;
      if (current >= score) {
        setDisplayed(score);
        clearInterval(timer);
      } else {
        setDisplayed(current);
      }
    }, 20);
    return () => clearInterval(timer);
  }, [score]);

  const gaugeData = [{ value: displayed, fill: color }];

  return (
    <div className="relative w-48 h-48 mx-auto">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="70%"
          outerRadius="100%"
          data={gaugeData}
          startAngle={225}
          endAngle={-45}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar
            background={{ fill: '#f1f5f9' }}
            dataKey="value"
            angleAxisId={0}
            cornerRadius={8}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-extrabold" style={{ color }}>{displayed}</span>
        <span className="text-xs text-slate-400 font-medium">/ 100</span>
        <span className="text-xs font-semibold text-slate-500 mt-0.5">DEBT SCORE</span>
      </div>
    </div>
  );
}

interface CountUpProps {
  target: number;
  formatter?: (v: number) => string;
  duration?: number;
}

function CountUp({ target, formatter = String, duration = 1500 }: CountUpProps) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const steps = 50;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setVal(target);
        clearInterval(timer);
      } else {
        setVal(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target, duration]);
  return <>{formatter(val)}</>;
}

export default function ReportClient({ data }: { data: ReportData }) {
  const { scan, signals, remediations } = data;
  const router = useRouter();
  const reportRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const scoreColor = getScoreColor(scan.debt_score);
  const riskBadge = getRiskBadge(scan.delivery_risk);

  const riskExplanation: Record<string, string> = {
    low: 'Minimal technical debt. Current pace sustainable.',
    medium: 'Debt is accumulating. Remediation recommended within 2 quarters.',
    high: 'Significant debt slowing delivery. Budget remediation now.',
    critical: 'Debt is mission-critical risk. Immediate executive action required.',
  };

  const breakdownData = signals.map(s => ({
    name: s.signal_type.replace(/_/g, ' '),
    value: s.severity === 'critical' ? 4 : s.severity === 'high' ? 3 : s.severity === 'medium' ? 2 : 1,
    color: s.severity === 'critical' ? '#ef4444' : s.severity === 'high' ? '#f97316' : s.severity === 'medium' ? '#f59e0b' : '#94a3b8',
  }));

  async function handleDownload() {
    setDownloading(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');

      if (!reportRef.current) return;

      const canvas = await html2canvas(reportRef.current, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= 297;

      while (heightLeft > 0) {
        position -= 297;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= 297;
      }

      pdf.save(`debtlens-${scan.repo_name}-report.pdf`);
      toast.success('PDF downloaded!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  function handleCopyLink() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Report link copied to clipboard!');
    });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push('/')}
              className="text-slate-400 hover:text-slate-700 shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <TrendingDown className="w-5 h-5 text-blue-600 shrink-0" />
            <span className="font-bold text-slate-900 truncate">
              {scan.repo_owner}/{scan.repo_name}
            </span>
            {scan.is_demo && (
              <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 rounded px-2 py-0.5 shrink-0">
                Demo Data
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1.5">
              <Link2 className="w-3.5 h-3.5" />
              Copy Link
            </Button>
            <Button size="sm" onClick={handleDownload} disabled={downloading} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
              <Download className="w-3.5 h-3.5" />
              {downloading ? 'Generating...' : 'Download PDF'}
            </Button>
          </div>
        </div>
      </header>

      {scan.is_demo && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between">
            <span className="text-sm text-amber-700">
              This is demo data. All figures are illustrative.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/')}
              className="text-amber-700 border-amber-300 hover:bg-amber-100 gap-1 text-xs"
            >
              Scan your own repo <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8" ref={reportRef}>
        {/* Header card */}
        <div className="bg-white rounded-2xl border p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-slate-900">
                  Technical Debt Executive Briefing
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <a
                  href={scan.repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  {scan.repo_url.replace('https://github.com/', 'github.com/')}
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span>·</span>
                <span>{scan.repo_age_days ? `${Math.floor(scan.repo_age_days / 365)}y ${Math.floor((scan.repo_age_days % 365) / 30)}m old` : 'Unknown age'}</span>
                <span>·</span>
                <span>{scan.total_commits?.toLocaleString()} total commits</span>
                <span>·</span>
                <span>Scanned {new Date(scan.scanned_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Debt Score */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-2xl border p-6 flex flex-col items-center">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Debt Score</h2>
            <DebtGauge score={scan.debt_score} />
            <div className="mt-4 text-center">
              <div
                className="inline-block px-3 py-1 rounded-full text-sm font-semibold"
                style={{ background: scoreColor + '20', color: scoreColor }}
              >
                {scan.debt_score >= 61 ? 'High Debt' : scan.debt_score >= 31 ? 'Moderate Debt' : 'Low Debt'}
              </div>
            </div>
          </div>

          {/* Section 2: Business Impact */}
          <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Estimated Cost */}
            <div className="bg-white rounded-2xl border p-5 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-red-600" />
                </div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Est. Annual Cost</span>
              </div>
              <div className="text-2xl font-extrabold text-red-600 mt-auto">
                <CountUp target={scan.estimated_annual_cost_usd} formatter={formatCurrency} />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Based on 42% dev time lost to tech debt (McKinsey)
              </p>
            </div>

            {/* Delivery Risk */}
            <div className="bg-white rounded-2xl border p-5 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Delivery Risk</span>
              </div>
              <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold border mt-auto w-fit ${riskBadge.cls}`}>
                {riskBadge.label}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {riskExplanation[scan.delivery_risk]}
              </p>
            </div>

            {/* Incidents */}
            <div className="bg-white rounded-2xl border p-5 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Incidents/Quarter</span>
              </div>
              <div className="text-2xl font-extrabold text-blue-600 mt-auto">
                <CountUp target={scan.incidents_avoided_per_quarter} />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Estimated additional incidents vs. low-debt baseline (DORA)
              </p>
            </div>
          </div>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { icon: Clock, label: 'Avg PR Merge Time', value: formatHours(scan.avg_pr_merge_time_hours), sub: 'Benchmark: 36 hrs (1.5 days)' },
            { icon: TrendingDown, label: 'Commits (90d)', value: scan.commits_last_90_days?.toString(), sub: 'Benchmark: 60+ for active repo' },
            { icon: Package, label: 'Outdated Deps', value: `${scan.outdated_dependencies}/${scan.total_dependencies}`, sub: 'Dependencies needing updates' },
            { icon: AlertTriangle, label: 'Open Debt Issues', value: scan.open_debt_issues?.toString(), sub: 'Tech-debt, bug, refactor labels' },
          ].map(({ icon: Icon, label, value, sub }) => (
            <div key={label} className="bg-white rounded-xl border p-4">
              <Icon className="w-4 h-4 text-slate-400 mb-2" />
              <div className="text-xs text-slate-500 mb-1">{label}</div>
              <div className="text-xl font-bold text-slate-900">{value}</div>
              <div className="text-xs text-slate-400 mt-1">{sub}</div>
            </div>
          ))}
        </div>

        {/* Section 3: Debt Breakdown */}
        {signals.length > 0 && (
          <div className="bg-white rounded-2xl border p-6 mb-6">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Debt Breakdown</h2>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 space-y-3">
                {signals.map((signal: DebtSignal) => (
                  <div key={signal.id} className="border rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-slate-500">
                        <SignalIcon type={signal.signal_type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-sm text-slate-900">{signal.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getSeverityBadge(signal.severity)}`}>
                            {signal.severity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">{signal.business_implication}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="lg:col-span-2">
                <div className="text-xs text-slate-500 mb-2 font-medium">Severity breakdown</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={breakdownData} layout="vertical" margin={{ left: 0 }}>
                    <XAxis type="number" domain={[0, 4]} tick={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                    <Tooltip
                      formatter={(val) => [
                        ['Low', 'Medium', 'High', 'Critical'][(val as number) - 1] || val,
                        'Severity'
                      ]}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {breakdownData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Remediation Roadmap */}
        {remediations.length > 0 && (
          <div className="bg-white rounded-2xl border p-6 mb-6">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Remediation Roadmap</h2>
            <div className="space-y-4">
              {remediations.map((item: RemediationItem, i: number) => {
                const effort = getEffortBadge(item.effort_level);
                return (
                  <div key={item.id} className="border rounded-xl p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900 text-sm">{item.action_title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${effort.cls}`}>
                            {effort.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-3">{item.action_detail}</p>
                        <div className="flex flex-wrap gap-4 text-xs">
                          <div>
                            <span className="text-slate-400">Engineer-days: </span>
                            <span className="font-semibold text-slate-700">{item.estimated_engineer_days}d</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Annual savings: </span>
                            <span className="font-semibold text-green-600">{formatCurrency(item.projected_annual_savings_usd)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Score improvement: </span>
                            <span className="font-semibold text-blue-600">+{item.score_improvement_pts} pts</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-900 rounded-2xl p-6 text-center text-white">
          <TrendingDown className="w-6 h-6 text-blue-400 mx-auto mb-2" />
          <h3 className="font-bold mb-1">Ready to fix it?</h3>
          <p className="text-sm text-slate-400 mb-4">
            Share this report with your VP of Engineering or CPO to start the conversation.
          </p>
          <div className="flex justify-center gap-3">
            <Button
              onClick={handleCopyLink}
              variant="outline"
              size="sm"
              className="border-slate-600 text-white hover:bg-slate-800 gap-1.5"
            >
              <Link2 className="w-3.5 h-3.5" />
              Copy shareable link
            </Button>
            <Button
              onClick={handleDownload}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
              disabled={downloading}
            >
              <Download className="w-3.5 h-3.5" />
              Download PDF Report
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
