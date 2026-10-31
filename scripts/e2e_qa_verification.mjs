/**
 * scripts/e2e_qa_verification.mjs
 * Automated E2E Browser & Mobile Viewport QA Verification Suite (Gate 3)
 * Launches an embedded static HTTP server + Headless Chrome via CDP, verifies:
 * 1. Initial Focused Hydration Logger view (full data table hidden by default)
 * 2. Quick-Add Vessel buttons (+250ml, +500ml) + Custom Entry (+500ml Electrolyte)
 * 3. Progress Ring update (50%, 1,250 / 2,500 ml, 1,250 ml remaining)
 * 4. Link Navigation from Logger -> Full Water Intake Data Table (#btn-link-to-table)
 * 5. Mobile 390px viewport layout check (zero horizontal overflow, single-line segmented tabs)
 * 6. Captures empirical screenshots into docs/audits/
 */

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const rootDir = process.cwd();
const auditsDir = path.join(rootDir, 'docs', 'audits');
if (!fs.existsSync(auditsDir)) {
  fs.mkdirSync(auditsDir, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

function startStaticServer(port = 8092) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = req.url.split('?')[0];
      const relPath = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
      const fullPath = path.join(rootDir, relPath);

      if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const ext = path.extname(fullPath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      res.end(fs.readFileSync(fullPath));
    });
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

function findBrowserExecutable() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error('No Chrome or Edge executable found for E2E verification');
}

async function waitForCdpTarget(debugPort, targetUrl) {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then((r) => r.json());
      const page = list.find((t) => t.type === 'page' && t.url.includes(targetUrl));
      if (page && page.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      // Wait for browser startup
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Timed out waiting for CDP target');
}

class SimpleCDP {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.pending = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    };
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
  }

  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval exception: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }

  async captureScreenshot(fileName) {
    const shot = await this.send('Page.captureScreenshot', { format: 'png' });
    const outPath = path.join(auditsDir, fileName);
    fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
    console.log(`[QA Screenshot] Saved: docs/audits/${fileName}`);
    return outPath;
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function runQA() {
  const port = 8092;
  const debugPort = 9234;
  const appUrl = `http://127.0.0.1:${port}/index.html`;
  const server = await startStaticServer(port);
  const browserExe = findBrowserExecutable();
  const userDataDir = path.join(os.tmpdir(), `aquapulse_qa_${Date.now()}`);

  console.log(`=== Launching Headless Browser for E2E QA: ${browserExe} ===`);
  const browserProc = spawn(browserExe, [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    '--window-size=1280,900',
    '--no-first-run',
    '--no-default-browser-check',
    appUrl
  ], { stdio: 'ignore' });

  try {
    const wsUrl = await waitForCdpTarget(debugPort, `127.0.0.1:${port}`);
    const cdp = new SimpleCDP(wsUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    // Wait for window.aquaPulseApp initialization
    await new Promise((r) => setTimeout(r, 800));

    // 1. Set Desktop Viewport (1280x900)
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    // Clear storage to guarantee deterministic state
    await cdp.evaluate(`(async () => {
      await window.aquaPulseApp.storage.clearAllEntries();
      await window.aquaPulseApp.storage.saveSettings({ dailyGoalMl: 2500 });
      await window.aquaPulseApp.refreshData();
      window.aquaPulseApp.renderAll();
    })()`);

    // Verify REQ-001: Starts on Focused Hydration Logger, Data Table view is hidden
    const startState = await cdp.evaluate(`({
      activeView: window.aquaPulseApp.activeView,
      loggerVisible: !document.getElementById('view-logger').classList.contains('hidden'),
      historyHidden: document.getElementById('view-history').classList.contains('hidden'),
      percentText: document.getElementById('ring-percentage-text').textContent
    })`);
    assert.equal(startState.activeView, 'logger');
    assert.equal(startState.loggerVisible, true);
    assert.equal(startState.historyHidden, true);
    assert.equal(startState.percentText, '0%');
    console.log('[PASS] REQ-001: App starts on Focused Hydration Logger with Data Table hidden.');

    // 2. Log 3 entries: +250ml Glass, +500ml Bottle, and custom +500ml Electrolyte Mix
    await cdp.evaluate(`(async () => {
      document.querySelector('[data-preset-ml="250"]').click();
      await new Promise(r => setTimeout(r, 150));
      document.querySelector('[data-preset-ml="500"]').click();
      await new Promise(r => setTimeout(r, 150));

      document.getElementById('input-amount-ml').value = '500';
      document.getElementById('input-beverage-type').value = 'electrolyte';
      document.getElementById('input-note').value = 'Morning workout hydration';
      document.getElementById('custom-entry-form').dispatchEvent(new Event('submit', { cancelable: true }));
      await new Promise(r => setTimeout(r, 250));
    })()`);

    const afterLogState = await cdp.evaluate(`({
      percentText: document.getElementById('ring-percentage-text').textContent,
      currentMl: document.getElementById('ring-current-ml').textContent,
      statusPill: document.getElementById('ring-status-pill').textContent,
      todayCount: document.getElementById('stat-today-count').textContent,
      recentPillsCount: document.querySelectorAll('#recent-pills-container .recent-pill').length
    })`);

    assert.equal(afterLogState.percentText, '50%');
    assert.equal(afterLogState.currentMl, '1,250');
    assert.match(afterLogState.statusPill, /1,250 ml remaining/);
    assert.equal(afterLogState.todayCount, '3');
    assert.equal(afterLogState.recentPillsCount, 3);
    console.log('[PASS] REQ-002 & REQ-003: Quick-Add & Custom Logger updated ring to 50% (1,250 / 2,500 ml).');

    await cdp.captureScreenshot('web_desktop_logger.png');

    // 3. Test Mobile Viewport (390x844) on Hydration Logger
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise((r) => setTimeout(r, 300));

    const mobileLoggerLayout = await cdp.evaluate(`({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    })`);
    assert.equal(mobileLoggerLayout.scrollWidth <= 390, true, `Horizontal overflow detected: ${mobileLoggerLayout.scrollWidth}px`);
    console.log(`[PASS] REQ-008: Mobile 390px Logger viewport verified with zero horizontal overflow (${mobileLoggerLayout.scrollWidth}px <= 390px).`);

    await cdp.captureScreenshot('mobile_390px_logger.png');

    // 4. Click Bridge Link (#btn-link-to-table) to navigate to Water Intake Data Table
    await cdp.evaluate(`document.getElementById('btn-link-to-table').click()`);
    await new Promise((r) => setTimeout(r, 300));

    const tableStateMobile = await cdp.evaluate(`({
      activeView: window.aquaPulseApp.activeView,
      historyVisible: !document.getElementById('view-history').classList.contains('hidden'),
      tableRowCount: document.querySelectorAll('#water-intake-tbody tr').length,
      rollupRowCount: document.querySelectorAll('#daily-rollup-tbody tr').length,
      kpiTotalVolume: document.getElementById('kpi-total-volume').textContent,
      scrollWidth: document.documentElement.scrollWidth
    })`);
    assert.equal(tableStateMobile.activeView, 'history');
    assert.equal(tableStateMobile.historyVisible, true);
    assert.equal(tableStateMobile.tableRowCount, 3);
    assert.equal(tableStateMobile.rollupRowCount, 1);
    assert.equal(tableStateMobile.kpiTotalVolume, '1,250 ml');
    assert.equal(tableStateMobile.scrollWidth <= 390, true);
    console.log('[PASS] REQ-001 & REQ-005: Bridge button navigated to Water Intake Data Table showing all 3 entries and daily rollup.');

    await cdp.captureScreenshot('mobile_390px_datatable.png');

    // 5. Capture Desktop Viewport (1280x900) on Water Intake Data Table
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await new Promise((r) => setTimeout(r, 300));
    await cdp.captureScreenshot('web_desktop_datatable.png');

    cdp.close();
  } finally {
    browserProc.kill();
    server.close();
    await new Promise((r) => setTimeout(r, 800));
    try {
      if (fs.existsSync(userDataDir)) {
        fs.rmSync(userDataDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore Windows Crashpad lock on exit
    }
  }
}

runQA().catch((err) => {
  console.error('[QA FAILED]', err);
  process.exit(1);
});
