import { NextResponse } from 'next/server';

interface GatewayConfig {
  name: string;
  url: string;
  token: string;
}

async function fetchSessions(gateway: GatewayConfig) {
  try {
    const response = await fetch(`${gateway.url}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${gateway.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tool: 'sessions_list',
        args: {
          limit: 50,
          messageLimit: 1,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      name: gateway.name,
      sessions: data.sessions || [],
    };
  } catch (error) {
    return {
      name: gateway.name,
      sessions: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function GET() {
  const gateways: GatewayConfig[] = [];

  // Parse gateway configs from env
  // Format: GATEWAY_0_NAME=Bubo, GATEWAY_0_URL=http://localhost:18788, GATEWAY_0_TOKEN=xxx
  for (let i = 0; i < 10; i++) {
    const name = process.env[`GATEWAY_${i}_NAME`];
    const url = process.env[`GATEWAY_${i}_URL`];
    const token = process.env[`GATEWAY_${i}_TOKEN`];

    if (name && url && token) {
      gateways.push({ name, url, token });
    }
  }

  // Also support simple format for 2 gateways
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

  if (gateways.length === 0) {
    return NextResponse.json({
      gateways: [{
        name: 'No Gateways Configured',
        sessions: [],
        error: 'Set BUBO_URL, BUBO_TOKEN, PIP_URL, PIP_TOKEN in environment',
      }],
    });
  }

  const results = await Promise.all(gateways.map(fetchSessions));

  return NextResponse.json({ gateways: results });
}
