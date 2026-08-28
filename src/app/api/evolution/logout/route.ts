import { NextRequest, NextResponse } from 'next/server';
import { EvolutionService } from '@/lib/evolution';
import { requireAdmin } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authCheck = await requireAdmin(req);
    if (authCheck.error) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const body = await req.json().catch(() => ({}));
    const instance = body.instance || body.instanceName || undefined;
    const result = await EvolutionService.logoutInstance(instance);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
