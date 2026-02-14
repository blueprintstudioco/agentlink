import { NextRequest, NextResponse } from 'next/server';

interface GatewayConfig {
  name: string;
  url: string;
  token: string;
}

function getGateways(): GatewayConfig[] {
  const gateways: GatewayConfig[] = [];

  // Parse gateway configs from env
  for (let i = 0; i < 10; i++) {
    const name = process.env[`GATEWAY_${i}_NAME`];
    const url = process.env[`GATEWAY_${i}_URL`];
    const token = process.env[`GATEWAY_${i}_TOKEN`];

    if (name && url && token) {
      gateways.push({ name, url, token });
    }
  }

  // Also support simple format
  if (process.env.BUBO_URL && process.env.BUBO_TOKEN) {
    gateways.push({
      name: 'Bubo',
      url: process.env.BUBO_URL,
      token: process.env.BUBO_TOKEN,
    });
  }
  if (process.env.PIP_URL && process.env.PIP_TOKEN) {
    gateways.push({
      name: 'Pip',
      url: process.env.PIP_URL,
      token: process.env.PIP_TOKEN,
    });
  }

  return gateways;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gatewayName = searchParams.get('gateway');
  const sessionKey = searchParams.get('key');

  if (!gatewayName || !sessionKey) {
    return NextResponse.json({ error: 'Missing gateway or key parameter' }, { status: 400 });
  }

  const gateways = getGateways();
  const gateway = gateways.find(g => g.name === gatewayName);

  if (!gateway) {
    return NextResponse.json({ error: `Gateway "${gatewayName}" not found` }, { status: 404 });
  }

  try {
    const response = await fetch(`${gateway.url}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${gateway.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tool: 'sessions_history',
        args: {
          sessionKey,
          limit: 200,
          includeTools: false,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({ messages: data.messages || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
