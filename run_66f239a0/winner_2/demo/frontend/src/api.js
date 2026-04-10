import axios from 'axios'

const BASE = import.meta.env.PROD ? '' : ''

export const api = axios.create({ baseURL: BASE })

export function getUserId() {
  let id = localStorage.getItem('vulnlens_user_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('vulnlens_user_id', id)
  }
  return id
}

export function getScanCount() {
  return parseInt(localStorage.getItem('vulnlens_scan_count') || '0', 10)
}

export function incrementScanCount() {
  const n = getScanCount() + 1
  localStorage.setItem('vulnlens_scan_count', String(n))
  return n
}

export async function submitScan(code, language) {
  const { data } = await api.post('/api/scan', {
    code,
    language,
    user_id: getUserId(),
  })
  return data
}

export async function fetchReport(reportId) {
  const { data } = await api.get(`/api/report/${reportId}`)
  return data
}

export async function fetchHistory() {
  const { data } = await api.get('/api/history', {
    params: { user_id: getUserId() },
  })
  return data
}

export async function fetchLeaderboard() {
  const { data } = await api.get('/api/leaderboard')
  return data
}

export function buildReportUrl(reportId) {
  return `${window.location.origin}/report/${reportId}`
}
