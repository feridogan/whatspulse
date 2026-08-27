import { NextRequest, NextResponse } from 'next/server';
import { EvolutionService, getEvolutionConfig } from '@/lib/evolution';

export async function GET(req: NextRequest) {
  try {
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
