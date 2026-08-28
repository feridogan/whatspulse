import { NextRequest, NextResponse } from 'next/server';
import { EvolutionService, getEvolutionConfig } from '@/lib/evolution';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authCheck = await requireAuth(req);
    if (authCheck.error) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const { searchParams } = new URL(req.url);
    const instance = searchParams.get('instance') || undefined;
    const config = await getEvolutionConfig();
    const targetInstance = instance || config.instanceName;
    const result = await EvolutionService.getConnectionState(targetInstance);

    return NextResponse.json({
      success: result.success,
      state: result.state,
      instance: targetInstance,
      config: {
        apiUrl: config.apiUrl,
        instanceName: targetInstance,
        hasInstanceKey: !!config.instanceKey,
        hasGlobalApiKey: !!config.globalApiKey,
      },
      raw: result.data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, state: 'DISCONNECTED', error: error.message },
      { status: 500 }
    );
  }
}
