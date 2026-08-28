import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { executeWhatsAppSync } from '@/lib/sync';

export async function POST(req: NextRequest) {
  try {
    const authCheck = await requireAuth(req);
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const result = await executeWhatsAppSync();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Contacts Sync API Error]:', error);
    return NextResponse.json(
      { error: 'Senkronizasyon hatası: ' + error.message },
      { status: 500 }
    );
  }
}
