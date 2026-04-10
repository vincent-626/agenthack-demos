import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchHistory } from '../api'

const LANG_ICON = {
  python: '🐍',
  javascript: 'JS',
  typescript: 'TS',
  java: '☕',
  php: '🐘',
  go: '🐹',
}

function SeverityDot({ summary }) {
  if (!summary) return null
  const total = Object.values(summary).reduce((a, b) => a + b, 0)
  if (total === 0) return <span style={{ color: 'var(--low)', fontSize: 12 }}>✅ Clean</span>
  const color =
    summary.CRITICAL > 0 ? 'var(--critical)' :
    summary.HIGH > 0 ? 'var(--high)' :
    summary.MEDIUM > 0 ? 'var(--medium)' :
    'var(--low)'
  return (
    <span style={{ color, fontSize: 12, fontWeight: 600 }}>
      {total} finding{total !== 1 ? 's' : ''}
    </span>
  )
}

export default function ScanHistory({ refreshKey }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    fetchHistory()
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [refreshKey])

  if (loading) {
    return (
      <div style={{ padding: '12px 0', color: 'var(--text-muted)', fontSize: 12 }}>
        Loading history...
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div style={{ padding: '12px 0', color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
        No scans yet.<br />Run your first scan above!
      </div>
    )
  }

  return (
    <div>
      {history.map((scan) => (
        <div
          key={scan.scan_id}
          onClick={() => navigate(`/report/${scan.report_id}`)}
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '10px 12px',
            marginBottom: 8,
            cursor: 'pointer',
            transition: 'border-color 0.15s, background 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-light)'
            e.currentTarget.style.background = 'var(--bg-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.background = 'var(--bg-primary)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              fontSize: 11, fontWeight: 700,
              background: 'var(--bg-hover)',
              padding: '1px 6px', borderRadius: 3,
              color: 'var(--text-secondary)',
            }}>
              {LANG_ICON[scan.language] || scan.language}
            </span>
            <SeverityDot summary={scan.severity_summary} />
          </div>
          <div style={{
            fontSize: 11, color: 'var(--text-muted)',
            marginTop: 6, fontFamily: 'var(--font-mono)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {scan.snippet_preview}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
            {new Date(scan.created_at + 'Z').toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  )
}
