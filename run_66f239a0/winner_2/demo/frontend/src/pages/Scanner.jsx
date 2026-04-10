import React, { useState, useCallback, useRef } from 'react'
import CodeEditor from '../components/CodeEditor'
import FindingCard from '../components/FindingCard'
import ScanHistory from '../components/ScanHistory'
import { submitScan, buildReportUrl, getScanCount, incrementScanCount } from '../api'

const LANGUAGES = ['python', 'javascript', 'typescript', 'java', 'php', 'go']

const PLACEHOLDER = `# Paste AI-generated code here to scan for vulnerabilities
# Example (Python with SQL injection):

from flask import Flask, request
import sqlite3

app = Flask(__name__)

@app.route('/user')
def get_user():
    user_id = request.args.get('id')
    conn = sqlite3.connect('db.sqlite')
    cursor = conn.cursor()
    # Vulnerable: f-string in SQL query
    query = f"SELECT * FROM users WHERE id = {user_id}"
    cursor.execute(query)
    return str(cursor.fetchone())
`

const STATUS_STEPS = [
  'Running deterministic checks...',
  'Running adversarial AI review...',
  'Merging and ranking results...',
]

function SeveritySummary({ summary }) {
  if (!summary) return null
  const total = Object.values(summary).reduce((a, b) => a + b, 0)
  if (total === 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        color: 'var(--low)', fontWeight: 600, fontSize: 13,
      }}>
        ✅ No vulnerabilities detected
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) =>
        summary[s] > 0 ? (
          <span key={s} className={`badge badge-${s}`} style={{ fontSize: 12, padding: '3px 10px' }}>
            {summary[s]} {s}
          </span>
        ) : null
      )}
    </div>
  )
}

export default function Scanner({ addToast }) {
  const [code, setCode] = useState(PLACEHOLDER)
  const [language, setLanguage] = useState('python')
  const [scanning, setScanning] = useState(false)
  const [statusStep, setStatusStep] = useState(0)
  const [results, setResults] = useState(null)
  const [highlightLines, setHighlightLines] = useState([])
  const [historyKey, setHistoryKey] = useState(0)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [reportId, setReportId] = useState(null)

  const handleScan = useCallback(async () => {
    if (!code.trim() || scanning) return
    setScanning(true)
    setResults(null)
    setHighlightLines([])
    setStatusStep(0)

    // Simulate status steps
    const t1 = setTimeout(() => setStatusStep(1), 1200)
    const t2 = setTimeout(() => setStatusStep(2), 3500)

    try {
      const data = await submitScan(code, language)
      clearTimeout(t1)
      clearTimeout(t2)

      setResults(data)
      setReportId(data.report_id)

      // Highlight all vulnerable lines
      const allLines = data.findings.flatMap((f) => f.line_numbers || [])
      setHighlightLines([...new Set(allLines)])

      // Show toast
      const url = buildReportUrl(data.report_id)
      addToast({
        icon: '📋',
        message: 'Report saved — copy shareable link',
        action: {
          label: 'Copy Link',
          onClick: () => {
            navigator.clipboard.writeText(url)
            addToast({ icon: '✅', message: 'Link copied to clipboard!' })
          },
        },
      })

      // Refresh scan history
      setHistoryKey((k) => k + 1)

      // Check upgrade prompt
      const newCount = incrementScanCount()
      if (newCount === 5) {
        setShowUpgrade(true)
      }
    } catch (err) {
      clearTimeout(t1)
      clearTimeout(t2)
      addToast({ icon: '❌', message: 'Scan failed — is the backend running?' })
    } finally {
      setScanning(false)
      setStatusStep(0)
    }
  }, [code, language, scanning, addToast])

  const handleCopyReport = () => {
    if (!results) return
    const lines = [
      `# VulnLens Security Report`,
      `**Language:** ${language}`,
      `**Total Findings:** ${results.findings.length}`,
      '',
      ...['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) =>
        results.severity_summary[s] > 0
          ? `- **${s}:** ${results.severity_summary[s]}`
          : ''
      ).filter(Boolean),
      '',
      '---',
      '',
      ...results.findings.map((f, i) => [
        `### ${i + 1}. ${f.vulnerability_type}`,
        `**Severity:** ${f.severity} | **OWASP:** ${f.owasp_category}`,
        `**Lines:** ${(f.line_numbers || []).join(', ') || 'N/A'}`,
        '',
        f.description,
        '',
        '**Fix:**',
        '```',
        f.fix,
        '```',
        '',
      ].join('\n')),
      `---`,
      `Report URL: ${buildReportUrl(results.report_id)}`,
    ].join('\n')

    navigator.clipboard.writeText(lines)
    addToast({ icon: '📋', message: 'Report copied as Markdown!' })
  }

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
      {/* Left: Code Editor */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        flex: '1 1 55%', borderRight: '1px solid var(--border)', overflow: 'hidden',
      }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)', flexShrink: 0,
        }}>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{
              background: 'var(--bg-hover)', color: 'var(--text-primary)',
              border: '1px solid var(--border-light)', borderRadius: 4,
              padding: '5px 10px', fontSize: 13, cursor: 'pointer',
              fontFamily: 'var(--font)',
            }}
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
            ))}
          </select>

          <button
            onClick={handleScan}
            disabled={scanning || !code.trim()}
            style={{
              background: scanning ? 'var(--bg-hover)' : 'var(--accent)',
              color: 'white',
              borderRadius: 6,
              padding: '6px 18px',
              fontWeight: 700,
              fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {scanning ? (
              <>
                <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                Scanning...
              </>
            ) : (
              '🔍 Scan for Vulnerabilities'
            )}
          </button>

          {scanning && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {STATUS_STEPS[statusStep]}
            </span>
          )}

          {results && !scanning && (
            <button
              onClick={handleCopyReport}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-light)',
                color: 'var(--text-secondary)',
                borderRadius: 4,
                padding: '5px 12px',
                fontSize: 12,
                marginLeft: 'auto',
              }}
            >
              📋 Copy Report as Markdown
            </button>
          )}
        </div>

        {/* Editor */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <CodeEditor
            code={code}
            onChange={setCode}
            language={language}
            highlightLines={highlightLines}
          />
        </div>
      </div>

      {/* Right: Results + Sidebar */}
      <div style={{ display: 'flex', flex: '1 1 45%', overflow: 'hidden', minWidth: 0 }}>
        {/* Results Panel */}
        <div style={{
          flex: 1, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          borderRight: '1px solid var(--border)',
        }}>
          {/* Results header */}
          <div style={{
            padding: '10px 14px', background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border)', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>Findings</span>
            {results && <SeveritySummary summary={results.severity_summary} />}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
            {!results && !scanning && (
              <div style={{
                height: '100%', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)', textAlign: 'center', gap: 12,
              }}>
                <div style={{ fontSize: 40 }}>🛡️</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Vulnerabilities will appear here
                </div>
                <div style={{ fontSize: 12, maxWidth: 260, lineHeight: 1.6 }}>
                  Paste AI-generated code in the editor and click{' '}
                  <strong>Scan for Vulnerabilities</strong>
                </div>
              </div>
            )}

            {scanning && (
              <div style={{
                height: '100%', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 16,
                color: 'var(--text-muted)',
              }}>
                <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {STATUS_STEPS[statusStep]}
                </div>
                <div style={{ fontSize: 11 }}>Two-pass analysis in progress...</div>
              </div>
            )}

            {results && !scanning && (
              <>
                {!results.ai_pass_available && (
                  <div style={{
                    background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)',
                    borderRadius: 6, padding: '8px 12px', marginBottom: 12,
                    fontSize: 12, color: '#eab308',
                  }}>
                    ⚠️ AI review unavailable (no ANTHROPIC_API_KEY) — showing deterministic results only
                  </div>
                )}

                {showUpgrade && (
                  <div className="upgrade-banner">
                    <span>🚀</span>
                    <div className="upgrade-banner-text">
                      <div className="upgrade-banner-title">You've used 5/5 free saved reports</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Upgrade to Pro for unlimited history and team workspaces
                      </div>
                    </div>
                    <button className="upgrade-btn">Upgrade</button>
                    <button className="upgrade-dismiss" onClick={() => setShowUpgrade(false)}>×</button>
                  </div>
                )}

                {results.findings.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--low)' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>No vulnerabilities detected!</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                      This code passed both deterministic and AI security checks.
                    </div>
                  </div>
                ) : (
                  results.findings.map((finding) => (
                    <FindingCard
                      key={finding.id}
                      finding={finding}
                      onHighlight={(lines) => setHighlightLines(lines || [])}
                    />
                  ))
                )}
              </>
            )}
          </div>
        </div>

        {/* Sidebar: Recent Scans */}
        <div style={{
          width: 220, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          borderLeft: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
        }}>
          <div style={{
            padding: '10px 12px', borderBottom: '1px solid var(--border)',
            fontWeight: 600, fontSize: 12, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: 0.5,
          }}>
            Recent Scans
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
            <ScanHistory refreshKey={historyKey} />
          </div>
        </div>
      </div>
    </div>
  )
}
