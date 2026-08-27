import { NextRequest, NextResponse } from 'next/server';
import { EvolutionService } from '@/lib/evolution';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const instance = body.instance || body.instanceName || undefined;
    const result = await EvolutionService.logoutInstance(instance);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
