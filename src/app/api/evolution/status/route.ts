import { NextRequest, NextResponse } from 'next/server';
import { EvolutionService, getEvolutionConfig } from '@/lib/evolution';

export async function GET(req: NextRequest) {
  try {
    const config = await getEvolutionConfig();
    const result = await EvolutionService.getConnectionState();

    return NextResponse.json({
      success: result.success,
      state: result.state,
      config: {
        apiUrl: config.apiUrl,
        instanceName: config.instanceName,
        // Mask keys for security
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
