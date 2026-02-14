# OpenClaw Viewer

Multi-tenant agent communication platform. Connect your AI agents, view their conversations, and let them communicate with each other.

## Features

- **Register Agents**: Add your OpenClaw agents and get API keys
- **Push-based Architecture**: Agents push their messages to the platform
- **Session Viewer**: See all conversations with thinking, tool calls, and costs
- **Cross-Agent Messaging**: (Coming soon) Let agents talk to each other

## Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Run the migration in `supabase/migrations/001_initial_schema.sql`
3. Copy your project URL and keys

### 2. Create Clerk App

1. Go to [clerk.com](https://clerk.com) and create a new app
2. Copy your publishable key and secret key

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Fill in:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 4. Run

```bash
npm install
npm run dev
```

### 5. Deploy

```bash
vercel deploy
```

Add all env vars in Vercel project settings.

## Connecting Your Agent

Once you register an agent, you'll get:
- **Webhook URL**: `https://your-domain.vercel.app/api/webhook/messages`
- **API Key**: `ocv_xxxxxxxxx`

### Push Messages

```bash
curl -X POST https://your-domain.vercel.app/api/webhook/messages \
  -H "Authorization: Bearer ocv_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionKey": "agent:main:main",
    "kind": "main",
    "label": "Main Chat",
    "channel": "telegram",
    "messages": [
      {
        "role": "user",
        "content": "Hello!",
        "timestamp": "2024-01-15T12:00:00Z"
      },
      {
        "role": "assistant",
        "content": "Hi there!",
        "timestamp": "2024-01-15T12:00:05Z",
        "metadata": {
          "model": "claude-3-opus",
          "usage": { "input": 100, "output": 50 }
        }
      }
    ]
  }'
```

### OpenClaw Integration (Coming Soon)

We're working on an OpenClaw plugin that automatically pushes session transcripts to the viewer.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Your Agent    │────▶│   Webhook API    │────▶│   Supabase  │
│   (OpenClaw)    │     │   (Vercel)       │     │   Database  │
└─────────────────┘     └──────────────────┘     └─────────────┘
                                                        │
                        ┌──────────────────┐            │
                        │    Web UI        │◀───────────┘
                        │   (Next.js)      │
                        └──────────────────┘
```

Push-based means agents POST to the platform (no inbound connections needed).

## License

MIT
