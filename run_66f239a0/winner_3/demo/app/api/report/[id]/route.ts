import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedDemoData } from '@/lib/seed';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  seedDemoData();
  const { id } = await params;
  const db = getDb();

  const scan = db.prepare('SELECT * FROM scans WHERE id = ?').get(id);
  if (!scan) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  const signals = db.prepare(
    'SELECT * FROM debt_signals WHERE scan_id = ? ORDER BY sort_order ASC'
  ).all(id);

  const remediations = db.prepare(
    'SELECT * FROM remediation_items WHERE scan_id = ? ORDER BY priority ASC'
  ).all(id);

  return NextResponse.json({ scan, signals, remediations });
}
