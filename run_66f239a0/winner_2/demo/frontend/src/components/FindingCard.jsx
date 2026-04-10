import React, { useState } from 'react'

const SEVERITY_ICON = {
  CRITICAL: '🔴',
  HIGH: '🟠',
  MEDIUM: '🟡',
  LOW: '🟢',
}

export default function FindingCard({ finding, index, onHighlight }) {
  const [showFix, setShowFix] = useState(false)

  const handleClick = () => {
    if (onHighlight) onHighlight(finding.line_numbers)
  }

  return (
    <div
      style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        marginBottom: 10,
        overflow: 'hidden',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-light)'
        if (onHighlight) onHighlight(finding.line_numbers)
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          cursor: onHighlight ? 'pointer' : 'default',
        }}
        onClick={handleClick}
      >
        <span style={{ fontSize: 16, marginTop: 1 }}>{SEVERITY_ICON[finding.severity] || '⚪'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{finding.vulnerability_type}</span>
            <span className={`badge badge-${finding.severity}`}>{finding.severity}</span>
            {finding.source === 'ai' && (
              <span style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 4,
                background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.4)',
                fontWeight: 600,
              }}>AI</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {finding.owasp_category}
            {finding.line_numbers?.length > 0 && (
              <span style={{ marginLeft: 8, color: 'var(--accent)' }}>
                Line{finding.line_numbers.length > 1 ? 's' : ''} {finding.line_numbers.join(', ')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '0 14px 12px', borderTop: '1px solid var(--border)' }}>
        <p style={{ margin: '10px 0 8px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {finding.description}
        </p>

        {/* Code snippet */}
        {finding.code_snippet && (
          <div className="code-block" style={{ fontSize: 11, marginBottom: 8 }}>
            {finding.code_snippet}
          </div>
        )}

        {/* Fix toggle */}
        <button
          onClick={() => setShowFix(!showFix)}
          style={{
            background: showFix ? 'rgba(34,197,94,0.1)' : 'var(--bg-hover)',
            color: showFix ? 'var(--low)' : 'var(--text-secondary)',
            border: `1px solid ${showFix ? 'var(--low)' : 'var(--border-light)'}`,
            borderRadius: 4,
            padding: '4px 12px',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {showFix ? '▲ Hide Fix' : '▼ Show Fix'}
        </button>

        {showFix && finding.fix && (
          <div style={{ marginTop: 8 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: 'var(--low)',
              marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              ✅ Recommended Fix
            </div>
            <div className="code-block" style={{ fontSize: 11, color: '#aff3af' }}>
              {finding.fix}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
