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
    console.error('SYNC HATASI:', error.response?.data || error.message);
    const errorDetail = error.response?.data?.message || error.response?.data || error.message;
    return NextResponse.json(
      { 
        success: false, 
        error: 'SYNC HATASI: ' + (typeof errorDetail === 'object' ? JSON.stringify(errorDetail) : errorDetail) 
      },
      { status: 500 }
    );
  }
}
