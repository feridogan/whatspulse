import { NextRequest, NextResponse } from 'next/server';
import { EvolutionService } from '@/lib/evolution';

export async function GET(req: NextRequest) {
  try {
    const result = await EvolutionService.getQRCode();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
