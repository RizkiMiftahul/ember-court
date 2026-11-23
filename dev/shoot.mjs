import { spawn, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const shotsDir = resolve(root, 'screenshots');
const chromePath = '/home/hatch/workspace/makefun/fps/tools/browsers/chrome-headless-shell/linux-157.0.8103.78/chrome-headless-shell-linux64/chrome-headless-shell';
const serverPort = 8765;
const debugPort = 9223;
const maxBytes = 256 * 1024;
const server = spawn(process.execPath, [resolve(root, 'serve.ts'), '--port', String(serverPort)], { cwd: root, stdio: 'ignore' });
const profile = await mkdtemp(resolve(tmpdir(), 'ember-court-chrome-'));
const chrome = spawn(chromePath, ['--headless', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function waitFor(url, attempts = 60) {
  for (let i = 0; i < attempts; i++) {
    try { const response = await fetch(url); if (response.ok) return response; } catch {}
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

const pngNames = ['01-title', '02-table', '03-win', '04-loss'];
const shots = ['title', 'table', 'win', 'loss'];
let ws;
try {
  await waitFor(`http://127.0.0.1:${serverPort}/`);
  await waitFor(`http://127.0.0.1:${debugPort}/json`);
  const created = await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: 'PUT' });
  if (!created.ok) throw new Error(`Could not open Chrome tab: ${created.status}`);
  const target = await created.json();
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  let nextId = 0;
  const pending = new Map();
  const runtimeErrors = [];
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  });
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, message => message.error ? reject(new Error(message.error.message)) : resolve(message));
    ws.send(JSON.stringify({ id, method, params }));
  });
  await call('Page.enable');
  await call('Runtime.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await mkdir(shotsDir, { recursive: true });
  for (let i = 0; i < shots.length; i++) {
    const url = `http://127.0.0.1:${serverPort}/?shot=${shots[i]}`;
    await call('Page.navigate', { url });
    await sleep(shots[i] === 'win' || shots[i] === 'loss' ? 1000 : 450);
    const captured = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(resolve(shotsDir, `${pngNames[i]}.png`), Buffer.from(captured.result.data, 'base64'));
    const title = await call('Runtime.evaluate', { expression: 'document.querySelector("h1")?.textContent', returnByValue: true });
    if (title.result.result.value !== 'Ember Court') throw new Error(`Unexpected content in ${shots[i]} state`);
  }
  if (runtimeErrors.length) throw new Error(`Browser runtime errors: ${runtimeErrors.join('; ')}`);
} finally {
  ws?.close();
  chrome.kill('SIGTERM');
  server.kill('SIGTERM');
  await sleep(200);
  await rm(profile, { recursive: true, force: true });
}

const python = spawnSync('python3', ['-c', `
from pathlib import Path
from PIL import Image
import sys
folder = Path(sys.argv[1])
limit = int(sys.argv[2])
for png in sorted(folder.glob('*.png')):
    if png.stat().st_size > limit:
        with Image.open(png) as image:
            image.convert('RGB').save(png.with_suffix('.jpg'), 'JPEG', quality=80, optimize=True)
        png.unlink()
files = sorted(p for p in folder.iterdir() if p.is_file())
if len(files) != 4:
    raise SystemExit(f'Expected exactly 4 screenshots, found {len(files)}')
for path in files:
    with Image.open(path) as image:
        width, height = image.size
    size = path.stat().st_size
    if size > limit or max(width, height) > 1280 or min(width, height) < 480:
        raise SystemExit(f'Invalid screenshot: {path.name} {size} bytes {width}x{height}')
    print(f'{path.name}: {size} bytes, {width}x{height}')
`, shotsDir, String(maxBytes)], { encoding: 'utf8' });
if (python.status !== 0) throw new Error(python.stderr || python.stdout);
process.stdout.write(python.stdout);
