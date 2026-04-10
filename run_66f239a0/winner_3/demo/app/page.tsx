'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GitBranch, TrendingDown, DollarSign, AlertTriangle, ArrowRight, Zap, Shield, BarChart3 } from 'lucide-react';

const SCAN_STEPS = [
  'Fetching repo metadata',
  'Analyzing commit patterns',
  'Scanning open issues',
  'Checking dependencies',
  'Calculating debt score',
];

const DEMO_REPOS = [
  {
    id: 'demo-startup',
    label: 'Startup Accumulation',
    description: '3-year SaaS app',
    score: 71,
    cost: '$340K/yr',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
  },
  {
    id: 'demo-enterprise',
    label: 'Enterprise Legacy',
    description: '9-year Java monolith',
    score: 89,
    cost: '$1.24M/yr',
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
  },
  {
    id: 'demo-healthy',
    label: 'Healthy Modern Stack',
    description: 'Well-maintained repo',
    score: 22,
    cost: '$48K/yr',
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
  },
];

const STATS = [
  { stat: '62%', label: 'of developers cite tech debt as their #1 frustration (Stack Overflow 2024)' },
  { stat: '$2.41T', label: 'global cost of technical debt (CAST Research)' },
  { stat: '42%', label: 'of engineering time lost to tech debt on average (McKinsey)' },
];

export default function HomePage() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    setScanning(true);
    setError('');
    setScanStep(0);
    setProgress(0);

    const stepInterval = setInterval(() => {
      setScanStep(prev => {
        const next = Math.min(prev + 1, SCAN_STEPS.length - 1);
        setProgress(Math.round((next / (SCAN_STEPS.length - 1)) * 90));
        return next;
      });
    }, 6000);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
      });

      clearInterval(stepInterval);

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Scan failed. Please check the repo URL and try again.');
        setScanning(false);
        return;
      }

      const { scanId } = await res.json();
      setProgress(100);
      setTimeout(() => router.push(`/report/${scanId}`), 400);
    } catch {
      clearInterval(stepInterval);
      setError('Network error. Please try again.');
      setScanning(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-blue-600" />
            <span className="font-bold text-xl tracking-tight">DebtLens</span>
          </div>
          <Badge variant="secondary" className="text-xs">Free Beta</Badge>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
          Turn technical debt into budget approval
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
          Your GitHub repo has a debt problem.<br />
          <span className="text-blue-600">Now you can prove it in dollars.</span>
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
          DebtLens scans your repository and generates a one-page executive briefing —
          debt score, estimated annual cost, and a prioritized remediation roadmap that
          survives a 10-minute board meeting.
        </p>

        {/* Scan form */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 max-w-2xl mx-auto">
          <form onSubmit={handleScan} className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={repoUrl}
                  onChange={e => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/your-org/your-repo"
                  className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  disabled={scanning}
                />
              </div>
              <Button
                type="submit"
                disabled={scanning || !repoUrl.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 whitespace-nowrap"
              >
                {scanning ? 'Scanning...' : 'Scan for Debt'}
                {!scanning && <ArrowRight className="ml-1.5 w-4 h-4" />}
              </Button>
            </div>

            {scanning && (
              <div className="space-y-2 text-left">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-slate-500 flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                  {SCAN_STEPS[scanStep]}...
                </p>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </form>
        </div>
      </section>

      {/* Stats strip */}
      <section className="bg-slate-900 text-white py-8 mb-12">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {STATS.map(s => (
            <div key={s.stat}>
              <div className="text-3xl font-bold text-blue-400 mb-1">{s.stat}</div>
              <div className="text-sm text-slate-300">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Demo cards */}
      <section className="max-w-5xl mx-auto px-4 mb-16">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">Try with a demo repo</h2>
        <p className="text-slate-500 text-center mb-8 text-sm">See what a DebtLens report looks like — no GitHub account required.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {DEMO_REPOS.map(demo => (
            <button
              key={demo.id}
              onClick={() => router.push(`/report/${demo.id}`)}
              className={`text-left p-5 rounded-xl border-2 ${demo.bgColor} hover:shadow-md transition-all group cursor-pointer`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="font-semibold text-slate-800 text-sm">{demo.label}</span>
                <span className="text-xs bg-white/80 border rounded px-1.5 py-0.5 text-slate-500">Demo</span>
              </div>
              <div className={`text-3xl font-extrabold ${demo.color} mb-1`}>
                {demo.score}<span className="text-base font-normal text-slate-400">/100</span>
              </div>
              <div className="text-xs text-slate-600 mb-3">{demo.description}</div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">{demo.cost} est. cost</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-4 mb-16">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            { icon: GitBranch, step: '1', title: 'Paste your repo URL', desc: 'No installation required. Just paste a public GitHub repo URL to get started.' },
            { icon: BarChart3, step: '2', title: 'We analyze the debt', desc: 'We scan commits, issues, PRs, and dependencies to calculate a composite Debt Score.' },
            { icon: DollarSign, step: '3', title: 'Get your executive brief', desc: 'Receive a shareable, PDF-ready report your CFO or CPO can read in 10 minutes.' },
          ].map(({ icon: Icon, step, title, desc }) => (
            <div key={step} className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl mb-4">
                <Icon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-xs font-semibold text-blue-600 mb-1">STEP {step}</div>
              <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 border-t border-b py-12 mb-12">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">Why DebtLens?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: DollarSign, title: 'Business-language metrics', desc: 'Dollar cost, delivery risk, incidents avoided — not "code smells" or complexity scores.' },
              { icon: Shield, title: 'Stakeholder-ready PDF', desc: 'One-click PDF export formatted cleanly enough to attach to a budget proposal email.' },
              { icon: Zap, title: 'Scan in under 45 seconds', desc: 'No installation, no OAuth required for public repos. Results in under a minute.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-xl p-5 border">
                <Icon className="w-5 h-5 text-blue-600 mb-3" />
                <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
                <p className="text-sm text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 py-8 text-center text-sm text-slate-400">
        <div className="flex items-center justify-center gap-2 mb-2">
          <TrendingDown className="w-4 h-4 text-blue-500" />
          <span className="font-semibold text-slate-600">DebtLens</span>
        </div>
        <p>Turning technical debt into boardroom conversations.</p>
      </footer>
    </main>
  );
}
