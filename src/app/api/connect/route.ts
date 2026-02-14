import { NextResponse } from 'next/server';

const SCRIPT = `#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const https = require('https');

const WEBHOOK_URL = 'https://openclaw-viewer.vercel.app/api/webhook/messages';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

function findOpenClawDir() {
  const locations = [
    path.join(process.env.HOME || '', '.openclaw'),
    path.join(process.env.USERPROFILE || '', '.openclaw'),
  ];
  
  for (const loc of locations) {
    if (fs.existsSync(path.join(loc, 'openclaw.json'))) {
      return loc;
    }
  }
  return null;
}

async function main() {
  console.log('\\n🔗 AgentLink Connect\\n');
  
  const openclawDir = findOpenClawDir();
  if (!openclawDir) {
    console.log('❌ OpenClaw not found. Make sure it\\'s installed.\\n');
    process.exit(1);
  }
  console.log('✓ Found OpenClaw: ' + openclawDir + '\\n');
  
  const sessionsDir = path.join(openclawDir, 'agents', 'main', 'sessions');
  if (!fs.existsSync(sessionsDir)) {
    console.log('❌ No sessions found yet. Run OpenClaw first.\\n');
    process.exit(1);
  }
  
  const apiKey = await ask('Paste your AgentLink API key: ');
  if (!apiKey.trim().startsWith('ocv_')) {
    console.log('❌ Invalid key (should start with ocv_)\\n');
    process.exit(1);
  }
  
  // Save config
  const configPath = path.join(openclawDir, 'agentlink.json');
  fs.writeFileSync(configPath, JSON.stringify({
    apiKey: apiKey.trim(),
    webhookUrl: WEBHOOK_URL,
    sessionsDir: sessionsDir
  }, null, 2));
  
  console.log('\\n✓ Saved config: ' + configPath);
  
  // Create sync script
  const syncPath = path.join(openclawDir, 'agentlink-sync.js');
  const syncScript = \`#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'agentlink.json')));
const statePath = path.join(__dirname, 'agentlink-state.json');

let state = {};
try { state = JSON.parse(fs.readFileSync(statePath)); } catch {}

const files = fs.readdirSync(config.sessionsDir).filter(f => f.endsWith('.jsonl'));

async function sync() {
  for (const file of files) {
    const fp = path.join(config.sessionsDir, file);
    const mtime = fs.statSync(fp).mtimeMs;
    if (state[file] === mtime) continue;
    
    const lines = fs.readFileSync(fp, 'utf8').trim().split('\\\\n');
    const messages = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean)
      .filter(m => m.role).map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : null,
        contentJson: typeof m.content !== 'string' ? m.content : undefined,
        timestamp: m.timestamp || new Date().toISOString()
      }));
    
    if (!messages.length) continue;
    
    const data = JSON.stringify({ sessionKey: file.replace('.jsonl',''), messages });
    const url = new URL(config.webhookUrl);
    
    await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: url.hostname, path: url.pathname, method: 'POST',
        headers: { 'Authorization': 'Bearer ' + config.apiKey, 'Content-Type': 'application/json' }
      }, res => {
        let b = ''; res.on('data', c => b += c);
        res.on('end', () => res.statusCode === 200 ? resolve() : reject(b));
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
    
    state[file] = mtime;
    console.log('✓', file);
  }
  fs.writeFileSync(statePath, JSON.stringify(state));
}

sync().then(() => console.log('Sync complete')).catch(console.error);
\`;
  
  fs.writeFileSync(syncPath, syncScript);
  try { fs.chmodSync(syncPath, '755'); } catch {}
  console.log('✓ Created sync script: ' + syncPath);
  
  // Run first sync
  console.log('\\nRunning initial sync...\\n');
  require('child_process').execSync('node "' + syncPath + '"', { stdio: 'inherit' });
  
  console.log('\\n✅ Connected! Run this anytime to sync:');
  console.log('   node ' + syncPath + '\\n');
  
  rl.close();
}

main();
`;

export async function GET() {
  return new NextResponse(SCRIPT, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-cache',
    },
  });
}
