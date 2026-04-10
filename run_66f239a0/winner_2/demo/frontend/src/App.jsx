import React, { useState, useCallback } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Scanner from './pages/Scanner'
import Leaderboard from './pages/Leaderboard'
import Report from './pages/Report'

function Nav({ toasts, onDismissToast }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isActive = (path) => location.pathname === path || (path === '/' && location.pathname === '/')

  return (
    <nav className="nav">
      <div className="nav-logo">
        🔍 Vuln<span>Lens</span>
      </div>
      <div className="nav-tabs">
        <button
          className={`nav-tab ${isActive('/') ? 'active' : ''}`}
          onClick={() => navigate('/')}
        >
          Scanner
        </button>
        <button
          className={`nav-tab ${isActive('/trends') ? 'active' : ''}`}
          onClick={() => navigate('/trends')}
        >
          Vulnerability Trends
        </button>
      </div>

      {/* Toast container */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <span className="toast-icon">{t.icon || '✅'}</span>
            <span className="toast-message">{t.message}</span>
            {t.action && (
              <button className="toast-action" onClick={t.action.onClick}>
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </nav>
  )
}

export default function App() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((toast) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { ...toast, id }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  return (
    <div className="app-layout">
      <Nav toasts={toasts} />
      <Routes>
        <Route path="/" element={<Scanner addToast={addToast} />} />
        <Route path="/trends" element={<Leaderboard />} />
        <Route path="/report/:reportId" element={<Report addToast={addToast} />} />
      </Routes>
    </div>
  )
}
