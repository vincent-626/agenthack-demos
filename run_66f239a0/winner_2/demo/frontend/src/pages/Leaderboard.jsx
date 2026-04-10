import React, { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { fetchLeaderboard } from '../api'

const SEVERITY_COLOR = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
}

const VULN_SEVERITY = {
  'SQL Injection': 'CRITICAL',
  'Hardcoded Secrets': 'CRITICAL',
  'Code Injection via eval()': 'CRITICAL',
  'Cross-Site Scripting (XSS)': 'HIGH',
  'Path Traversal': 'HIGH',
  'Server-Side Request Forgery (SSRF)': 'HIGH',
  'Weak Cryptography': 'HIGH',
  'XML External Entity (XXE)': 'HIGH',
  'Insecure Randomness': 'MEDIUM',
  'Log Injection': 'MEDIUM',
}

const SHORT_NAMES = {
  'SQL Injection': 'SQL Injection',
  'Hardcoded Secrets': 'Hardcoded Secrets',
  'Cross-Site Scripting (XSS)': 'XSS',
  'Insecure Randomness': 'Insecure Random',
  'Code Injection via eval()': 'eval() Injection',
  'Path Traversal': 'Path Traversal',
  'Server-Side Request Forgery (SSRF)': 'SSRF',
  'Weak Cryptography': 'Weak Crypto',
  'Log Injection': 'Log Injection',
  'XML External Entity (XXE)': 'XXE',
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: 'var(--bg-secondary)', border: '1px solid var(--border-light)',
      borderRadius: 6, padding: '10px 14px', fontSize: 12,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>{d.fullName}</div>
      <div style={{ color: 'var(--text-secondary)' }}>
        <span style={{ color: d.color, fontWeight: 700 }}>{d.count}</span> occurrences
        <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>({d.pct}% of scans)</span>
      </div>
      <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{d.owasp}</div>
    </div>
  )
}

function SnippetDrawer({ vulnType, examples, onClose }) {
  const snippets = examples?.[vulnType] || []
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{vulnType}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Example vulnerable code snippets from scan data
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {snippets.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
            No example snippets available for this vulnerability type.
          </div>
        ) : (
          snippets.map((s, i) => (
            <div key={i} style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
              }}>
                Example {i + 1} — {s.language}
              </div>
              <div className="code-block">{s.code}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function Leaderboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [langFilter, setLangFilter] = useState('all')
  const [selectedVuln, setSelectedVuln] = useState(null)

  useEffect(() => {
    fetchLeaderboard()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Failed to load leaderboard data.
      </div>
    )
  }

  // Build chart data
  const chartData = Object.entries(data.vuln_counts)
    .map(([name, info]) => ({
      fullName: name,
      name: SHORT_NAMES[name] || name,
      count: info.count,
      pct: info.pct,
      owasp: info.owasp,
      severity: info.severity,
      color: SEVERITY_COLOR[info.severity] || '#6366f1',
    }))
    .sort((a, b) => b.count - a.count)

  const LANGUAGES = ['all', 'python', 'javascript', 'typescript', 'java', 'php', 'go']

  // Language filter affects avg findings display
  const avgFindings = langFilter === 'all'
    ? data.avg_findings_per_scan
    : data.lang_avg_findings?.[langFilter] || data.avg_findings_per_scan

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>
          Vulnerability Trends
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
          Most common vulnerabilities detected in AI-generated code across all scans
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Scans', value: data.total_scans.toLocaleString(), icon: '📊' },
          { label: 'Avg Findings / Scan', value: avgFindings.toFixed(1), icon: '🔍' },
          { label: 'Most Vulnerable Language', value: data.most_dangerous_language, icon: '⚠️' },
          { label: 'Top Vulnerability', value: chartData[0]?.name || '—', icon: '🔴' },
        ].map(({ label, value, icon }) => (
          <div key={label} style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '16px 20px', flex: '1 1 180px',
            minWidth: 140,
          }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Language filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {LANGUAGES.map((l) => (
          <button
            key={l}
            onClick={() => setLangFilter(l)}
            style={{
              background: langFilter === l ? 'var(--accent)' : 'var(--bg-secondary)',
              color: langFilter === l ? 'white' : 'var(--text-secondary)',
              border: `1px solid ${langFilter === l ? 'var(--accent)' : 'var(--border-light)'}`,
              borderRadius: 20,
              padding: '4px 14px',
              fontSize: 12,
              fontWeight: langFilter === l ? 700 : 400,
            }}
          >
            {l === 'all' ? 'All Languages' : l.charAt(0).toUpperCase() + l.slice(1)}
          </button>
        ))}
      </div>

      {/* Bar Chart */}
      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: 24,
      }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: 'var(--text-secondary)' }}>
          Top 10 Vulnerability Types by Frequency
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8, fontWeight: 400 }}>
            Click a bar to see example code
          </span>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 20, left: 0, bottom: 60 }}
            onClick={(e) => {
              if (e?.activePayload?.[0]?.payload) {
                setSelectedVuln(e.activePayload[0].payload.fullName)
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              angle={-35}
              textAnchor="end"
              interval={0}
              height={70}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
            />
            <YAxis
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detail table */}
      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
              {['Rank', 'Vulnerability', 'OWASP Category', 'Severity', 'Count', '% of Scans'].map((h) => (
                <th key={h} style={{
                  padding: '10px 16px', textAlign: 'left',
                  fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: 0.5,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chartData.map((row, i) => (
              <tr
                key={row.fullName}
                onClick={() => setSelectedVuln(row.fullName)}
                style={{
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: 13 }}>
                  #{i + 1}
                </td>
                <td style={{ padding: '10px 16px', fontWeight: 600, fontSize: 13 }}>{row.fullName}</td>
                <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{row.owasp}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span className={`badge badge-${row.severity}`}>{row.severity}</span>
                </td>
                <td style={{ padding: '10px 16px', fontWeight: 700 }}>{row.count}</td>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      height: 6, width: `${Math.min(row.pct, 100)}%`, maxWidth: 80,
                      background: row.color, borderRadius: 3, opacity: 0.8,
                    }} />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.pct}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Snippet drawer */}
      {selectedVuln && (
        <SnippetDrawer
          vulnType={selectedVuln}
          examples={data.examples}
          onClose={() => setSelectedVuln(null)}
        />
      )}
    </div>
  )
}
