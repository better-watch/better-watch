#!/usr/bin/env node

/**
 * Simple Trace Server for the Next.js Example
 * 
 * This server receives traces from the Next.js application and displays
 * them in real-time in the terminal. It provides a simple way to see
 * how TraceInject captures function calls and variable values.
 * 
 * Usage:
 *   npm run trace-server
 *   # or
 *   node trace-server.mjs
 */

import { createServer } from 'http';

const PORT = 4444;
const HOST = 'localhost';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
};

// Store recent traces for the dashboard
const recentTraces = [];
const MAX_TRACES = 100;

/**
 * Format a trace for terminal display
 */
function formatTrace(trace) {
  const timestamp = new Date(trace.timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });

  const id = trace.id || 'unknown';
  const idColor = id.includes('entry') ? colors.green : 
                  id.includes('exit') ? colors.cyan : 
                  id.includes('result') ? colors.magenta : colors.yellow;

  let output = `${colors.dim}${timestamp}${colors.reset} `;
  output += `${idColor}${colors.bright}${id}${colors.reset}`;

  if (trace.variables && Object.keys(trace.variables).length > 0) {
    output += `\n         ${colors.dim}└─${colors.reset} `;
    const vars = Object.entries(trace.variables)
      .map(([key, value]) => {
        const formatted = typeof value === 'object' 
          ? JSON.stringify(value, null, 0).slice(0, 80)
          : String(value).slice(0, 80);
        return `${colors.blue}${key}${colors.reset}: ${formatted}`;
      })
      .join(', ');
    output += vars;
  }

  return output;
}

/**
 * Print the header banner
 */
function printBanner() {
  console.log('\n');
  console.log(`${colors.bgMagenta}${colors.bright}                                        ${colors.reset}`);
  console.log(`${colors.bgMagenta}${colors.bright}   🔍 TraceInject Trace Server          ${colors.reset}`);
  console.log(`${colors.bgMagenta}${colors.bright}                                        ${colors.reset}`);
  console.log('\n');
  console.log(`${colors.dim}Server running at ${colors.cyan}http://${HOST}:${PORT}${colors.reset}`);
  console.log(`${colors.dim}Waiting for traces from Next.js app...${colors.reset}`);
  console.log(`${colors.dim}${'─'.repeat(50)}${colors.reset}\n`);
}

/**
 * Handle incoming trace requests
 */
async function handleRequest(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, X-Project-ID');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check endpoint
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', traces: recentTraces.length }));
    return;
  }

  // Dashboard endpoint
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(generateDashboardHTML());
    return;
  }

  // Recent traces API
  if (req.method === 'GET' && req.url === '/api/recent') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ traces: recentTraces.slice(-50) }));
    return;
  }

  // Trace ingestion endpoint
  if (req.method === 'POST' && req.url === '/api/traces') {
    let body = '';
    
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const traces = data.traces || [];

        console.log(`${colors.green}✓${colors.reset} Received ${traces.length} trace(s) from ${colors.cyan}${data.projectId || 'unknown'}${colors.reset}`);

        traces.forEach((trace) => {
          console.log(formatTrace(trace));
          
          // Store for dashboard
          recentTraces.push({
            ...trace,
            receivedAt: Date.now(),
          });
          
          // Keep buffer bounded
          if (recentTraces.length > MAX_TRACES) {
            recentTraces.shift();
          }
        });

        console.log('');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          accepted: traces.length,
          rejected: 0,
          requestId: `req-${Date.now()}`,
        }));
      } catch (error) {
        console.log(`${colors.red}✗${colors.reset} Error parsing trace: ${error.message}`);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: error.message }));
      }
    });
    return;
  }

  // 404 for everything else
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
}

/**
 * Generate a simple HTML dashboard
 */
function generateDashboardHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TraceInject Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      background: #0a0a0f;
      color: #e8e8ed;
      min-height: 100vh;
      padding: 2rem;
    }
    h1 {
      background: linear-gradient(135deg, #00d4ff, #ff00aa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 1rem;
    }
    .stats {
      display: flex;
      gap: 2rem;
      margin-bottom: 2rem;
      padding: 1rem;
      background: rgba(255,255,255,0.05);
      border-radius: 8px;
    }
    .stat { text-align: center; }
    .stat-value { font-size: 2rem; color: #00d4ff; }
    .stat-label { font-size: 0.75rem; color: #9898a8; }
    .traces {
      background: #12121a;
      border-radius: 8px;
      padding: 1rem;
      max-height: 70vh;
      overflow-y: auto;
    }
    .trace {
      padding: 0.5rem;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .trace:last-child { border-bottom: none; }
    .trace-id { color: #c4ff00; }
    .trace-time { color: #9898a8; font-size: 0.8rem; }
    .trace-vars { color: #00d4ff; font-size: 0.85rem; margin-top: 0.25rem; }
    .empty { color: #9898a8; text-align: center; padding: 2rem; }
  </style>
</head>
<body>
  <h1>🔍 TraceInject Dashboard</h1>
  <div class="stats">
    <div class="stat">
      <div class="stat-value" id="trace-count">${recentTraces.length}</div>
      <div class="stat-label">Total Traces</div>
    </div>
  </div>
  <div class="traces" id="traces">
    ${recentTraces.length === 0 
      ? '<div class="empty">No traces yet. Trigger some actions in the Next.js app!</div>'
      : recentTraces.slice(-30).reverse().map(t => `
        <div class="trace">
          <span class="trace-time">${new Date(t.timestamp).toLocaleTimeString()}</span>
          <span class="trace-id">${t.id}</span>
          ${t.variables ? `<div class="trace-vars">${JSON.stringify(t.variables)}</div>` : ''}
        </div>
      `).join('')}
  </div>
  <script>
    // Auto-refresh every 2 seconds
    setInterval(async () => {
      const res = await fetch('/api/recent');
      const data = await res.json();
      document.getElementById('trace-count').textContent = data.traces.length;
      if (data.traces.length > 0) {
        document.getElementById('traces').innerHTML = data.traces.slice(-30).reverse().map(t => \`
          <div class="trace">
            <span class="trace-time">\${new Date(t.timestamp).toLocaleTimeString()}</span>
            <span class="trace-id">\${t.id}</span>
            \${t.variables ? \`<div class="trace-vars">\${JSON.stringify(t.variables)}</div>\` : ''}
          </div>
        \`).join('');
      }
    }, 2000);
  </script>
</body>
</html>`;
}

// Start the server
const server = createServer(handleRequest);

server.listen(PORT, HOST, () => {
  printBanner();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}Shutting down trace server...${colors.reset}`);
  server.close();
  process.exit(0);
});
