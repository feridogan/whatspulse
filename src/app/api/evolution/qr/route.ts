import { NextRequest, NextResponse } from 'next/server';
import { EvolutionService } from '@/lib/evolution';
import { requireAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authCheck = await requireAdmin(req);
    if (authCheck.error) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const { searchParams } = new URL(req.url);
    const instance = searchParams.get('instance') || undefined;
    const forceRefresh = searchParams.get('refresh') === 'true';
    const result = await EvolutionService.createInstance(instance, forceRefresh);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCheck = await requireAdmin(req);
    if (authCheck.error) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const body = await req.json().catch(() => ({}));
    const instance = body.instanceName || body.instance || undefined;
    const forceRefresh = body.refresh === true || body.forceRefresh === true;
    const result = await EvolutionService.createInstance(instance, forceRefresh);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
