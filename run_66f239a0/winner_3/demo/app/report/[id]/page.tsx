import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { seedDemoData } from '@/lib/seed';
import { ReportData } from '@/lib/types';
import ReportClient from './ReportClient';

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  seedDemoData();

  const db = getDb();
  const scan = db.prepare('SELECT * FROM scans WHERE id = ?').get(id) as ReportData['scan'] | null;

  if (!scan) notFound();

  const signals = db.prepare(
    'SELECT * FROM debt_signals WHERE scan_id = ? ORDER BY sort_order ASC'
  ).all(id) as ReportData['signals'];

  const remediations = db.prepare(
    'SELECT * FROM remediation_items WHERE scan_id = ? ORDER BY priority ASC'
  ).all(id) as ReportData['remediations'];

  const data: ReportData = { scan, signals, remediations };

  return <ReportClient data={data} />;
}
