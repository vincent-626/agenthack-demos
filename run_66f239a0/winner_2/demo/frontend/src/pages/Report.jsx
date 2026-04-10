import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchReport } from '../api'
import CodeEditor from '../components/CodeEditor'
import FindingCard from '../components/FindingCard'

function SeveritySummary({ summary }) {
  if (!summary) return null
  const total = Object.values(summary).reduce((a, b) => a + b, 0)
  if (total === 0) return <span style={{ color: 'var(--low)', fontWeight: 600 }}>✅ Clean — No vulnerabilities</span>
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

export default function Report({ addToast }) {
  const { reportId } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [highlightLines, setHighlightLines] = useState([])

  useEffect(() => {
    fetchReport(reportId)
      .then((data) => {
        setReport(data)
        const allLines = data.findings.flatMap((f) => f.line_numbers || [])
        setHighlightLines([...new Set(allLines)])
      })
      .catch(() => setError('Report not found.'))
      .finally(() => setLoading(false))
  }, [reportId])

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      </div>
    )
  }

  if (error || !report) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
      }}>
        <div style={{ fontSize: 40 }}>🔍</div>
        <div style={{ fontWeight: 700, fontSize: 18 }}>Report Not Found</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          This report may have expired or the ID is incorrect.
        </div>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'var(--accent)', color: 'white',
            borderRadius: 6, padding: '8px 20px', fontWeight: 600,
          }}
        >
          Scan Your Own Code
        </button>
      </div>
    )
  }

  const handleScanThis = () => {
    navigate('/', { state: { code: report.code, language: report.language } })
  }

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
      {/* Left: Code */}
      <div style={{
        flex: '1 1 55%', display: 'flex', flexDirection: 'column',
        borderRight: '1px solid var(--border)', overflow: 'hidden',
      }}>
        <div style={{
          padding: '10px 14px', background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)', flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{
            fontSize: 11, fontWeight: 700, background: 'var(--bg-hover)',
            padding: '2px 8px', borderRadius: 4, color: 'var(--text-secondary)',
          }}>
            {report.language}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Scanned {new Date(report.created_at + 'Z').toLocaleString()}
          </span>
          <span style={{
            fontSize: 11, background: 'rgba(99,102,241,0.15)', color: '#818cf8',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 4, padding: '2px 8px', fontWeight: 600,
          }}>
            READ-ONLY REPORT
          </span>
          <button
            onClick={handleScanThis}
            style={{
              marginLeft: 'auto',
              background: 'var(--accent)', color: 'white',
              borderRadius: 4, padding: '4px 12px', fontWeight: 600, fontSize: 12,
            }}
          >
            🔍 Scan Your Own Code
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <CodeEditor
            code={report.code}
            language={report.language}
            highlightLines={highlightLines}
            readOnly={true}
          />
        </div>
      </div>

      {/* Right: Findings */}
      <div style={{ flex: '1 1 45%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{
          padding: '10px 14px', background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Security Report</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              ID: {report.report_id}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <SeveritySummary summary={report.severity_summary} />
            <button
              onClick={() => {
                const url = window.location.href
                navigator.clipboard.writeText(url)
                if (addToast) addToast({ icon: '✅', message: 'Report link copied!' })
              }}
              style={{
                background: 'transparent', border: '1px solid var(--border-light)',
                color: 'var(--text-secondary)', borderRadius: 4,
                padding: '3px 10px', fontSize: 11,
              }}
            >
              📋 Copy Link
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
          {report.findings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--low)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <div style={{ fontWeight: 600 }}>No vulnerabilities were detected in this scan.</div>
            </div>
          ) : (
            report.findings.map((finding) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                onHighlight={(lines) => setHighlightLines(lines || [])}
              />
            ))
          )}

          {/* CTA */}
          <div style={{
            marginTop: 20, padding: 16,
            background: 'var(--bg-secondary)', borderRadius: 'var(--radius)',
            border: '1px solid var(--border)', textAlign: 'center',
          }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Scan your own AI-generated code</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              VulnLens catches OWASP Top 10 vulnerabilities in seconds — no login required.
            </div>
            <button
              onClick={handleScanThis}
              style={{
                background: 'var(--accent)', color: 'white',
                borderRadius: 6, padding: '8px 24px', fontWeight: 700, fontSize: 13,
              }}
            >
              🔍 Start Scanning
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
