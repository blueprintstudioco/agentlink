#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const WEBHOOK_URL = 'https://openclaw-viewer.vercel.app/api/webhook/messages';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

function findOpenClawConfig() {
  // Check common locations
  const locations = [
    path.join(process.env.HOME || '', '.openclaw', 'openclaw.json'),
    path.join(process.env.USERPROFILE || '', '.openclaw', 'openclaw.json'),
    path.join(process.cwd(), 'openclaw.json'),
  ];
  
  for (const loc of locations) {
    if (fs.existsSync(loc)) {
      return loc;
    }
  }
  return null;
}

function findSessionsDir() {
  const configPath = findOpenClawConfig();
  if (!configPath) return null;
  
  const configDir = path.dirname(configPath);
  const sessionsDir = path.join(configDir, 'agents', 'main', 'sessions');
  if (fs.existsSync(sessionsDir)) {
    return sessionsDir;
  }
  return null;
}

async function main() {
  console.log('\n🔗 AgentLink Connect\n');
  console.log('This will set up your OpenClaw agent to sync with AgentLink.\n');
  
  // Find OpenClaw
  const configPath = findOpenClawConfig();
  if (!configPath) {
    console.log('❌ Could not find OpenClaw config.');
    console.log('   Make sure OpenClaw is installed and configured.\n');
    process.exit(1);
  }
  console.log(`✓ Found OpenClaw config: ${configPath}\n`);
  
  const sessionsDir = findSessionsDir();
  if (!sessionsDir) {
    console.log('❌ Could not find sessions directory.\n');
    process.exit(1);
  }
  console.log(`✓ Found sessions: ${sessionsDir}\n`);
  
  // Get API key
  const apiKey = await ask('Enter your AgentLink API key: ');
  if (!apiKey || !apiKey.startsWith('ocv_')) {
    console.log('❌ Invalid API key. It should start with "ocv_"\n');
    process.exit(1);
  }
  
  // Create sync script
  const configDir = path.dirname(configPath);
  const syncScriptPath = path.join(configDir, 'agentlink-sync.js');
  
  const syncScript = `#!/usr/bin/env node
// AgentLink Sync - Pushes session transcripts to AgentLink
const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = '${apiKey}';
const WEBHOOK_URL = '${WEBHOOK_URL}';
const SESSIONS_DIR = '${sessionsDir}';
const STATE_FILE = path.join('${configDir}', 'agentlink-state.json');

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { syncedSessions: {}, lastSync: null };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function parseJSONL(content) {
  const lines = content.trim().split('\\n').filter(Boolean);
  const messages = [];
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry.role && (entry.content || entry.content !== undefined)) {
        messages.push({
          role: entry.role,
          content: typeof entry.content === 'string' ? entry.content : null,
          contentJson: typeof entry.content !== 'string' ? entry.content : null,
          metadata: entry.usage ? { usage: entry.usage, model: entry.model } : null,
          timestamp: entry.timestamp || new Date().toISOString()
        });
      }
    } catch {}
  }
  return messages;
}

function postMessages(sessionKey, messages) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      sessionKey,
      kind: sessionKey.includes(':cron:') ? 'cron' : 'main',
      messages
    });
    
    const url = new URL(WEBHOOK_URL);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) resolve(JSON.parse(body));
        else reject(new Error(\`HTTP \${res.statusCode}: \${body}\`));
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function sync() {
  const state = loadState();
  const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.jsonl'));
  
  let synced = 0;
  for (const file of files) {
    const filePath = path.join(SESSIONS_DIR, file);
    const stats = fs.statSync(filePath);
    const lastModified = stats.mtimeMs;
    
    // Skip if not modified since last sync
    if (state.syncedSessions[file] === lastModified) continue;
    
    const content = fs.readFileSync(filePath, 'utf8');
    const messages = parseJSONL(content);
    if (messages.length === 0) continue;
    
    // Extract session key from filename or use filename
    const sessionKey = file.replace('.jsonl', '');
    
    try {
      await postMessages(sessionKey, messages);
      state.syncedSessions[file] = lastModified;
      synced++;
      console.log(\`✓ Synced \${file} (\${messages.length} messages)\`);
    } catch (err) {
      console.error(\`✗ Failed \${file}: \${err.message}\`);
    }
  }
  
  state.lastSync = new Date().toISOString();
  saveState(state);
  
  if (synced > 0) {
    console.log(\`\\nSynced \${synced} session(s) to AgentLink\`);
  }
}

sync().catch(console.error);
`;

  fs.writeFileSync(syncScriptPath, syncScript);
  fs.chmodSync(syncScriptPath, '755');
  console.log(`\n✓ Created sync script: ${syncScriptPath}\n`);
  
  // Test the connection
  console.log('Testing connection...');
  try {
    execSync(`node "${syncScriptPath}"`, { stdio: 'inherit' });
  } catch (err) {
    console.log('⚠ Sync test had issues, but setup is complete.\n');
  }
  
  console.log('\n✅ Setup complete!\n');
  console.log('To sync manually, run:');
  console.log(`  node "${syncScriptPath}"\n`);
  console.log('To sync automatically, add a cron job or run it periodically.\n');
  
  rl.close();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
