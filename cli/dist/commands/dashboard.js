/**
 * SWACANA — Dashboard Command
 *
 * Starts the SWACANA Next.js web app on localhost.
 * The web app provides the full visual dashboard:
 * - AI-powered decision tree canvas
 * - Chat console with local AI
 * - Data explorer (HuggingFace datasets)
 * - Graph/timeline/board views
 * - Collaboration via WebSocket
 *
 * Usage:
 *   swacana dashboard            → Start web app + auto-open browser
 *   swacana dashboard --port 3000
 *   swacana dashboard --no-open  → No browser auto-open
 *   swacana dashboard --collab   → Also start WebSocket collaboration server
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
// ─── Paths ─────────────────────────────────────────────────────────────────
const CLI_DIR = path.dirname(fileURLToPath(import.meta.url));
/**
 * Try to find the SWACANA Next.js web app root directory.
 * Supports multiple installation contexts:
 *   1. Development: cli/ is a subdirectory of the web app project
 *   2. Global npm install: web app must be either bundled or user is in project dir
 *   3. Running from project directory
 */
function findWebAppRoot() {
    // Strategy 1: 3 levels up from dist/commands/ -> project root (local dev)
    //   dist/commands/dashboard.js -> dist/ -> cli/ -> self-plan-hub/
    const devRoot = path.resolve(CLI_DIR, '..', '..', '..');
    if (fs.existsSync(path.join(devRoot, 'app', 'page.tsx'))) {
        return devRoot;
    }
    // Strategy 2: 2 levels up from dist/commands/ -> package root
    //   dist/commands/dashboard.js -> dist/ -> swacana/
    const pkgRoot = path.resolve(CLI_DIR, '..', '..');
    if (fs.existsSync(path.join(pkgRoot, 'app', 'page.tsx'))) {
        return pkgRoot;
    }
    // Strategy 3: Check if CWD is the web app project
    const cwd = process.cwd();
    if (fs.existsSync(path.join(cwd, 'app', 'page.tsx'))) {
        return cwd;
    }
    // Strategy 4: Check parent of CWD (common: user runs from cli/ directory)
    const parentCwd = path.resolve(cwd, '..');
    if (fs.existsSync(path.join(parentCwd, 'app', 'page.tsx'))) {
        return parentCwd;
    }
    return null;
}
let WEB_DIR = findWebAppRoot();
// ─── State (module-level for cleanup) ──────────────────────────────────────
let serverProcess = null;
let collabProcess = null;
// ─── Dashboard Command ─────────────────────────────────────────────────────
export async function dashboardCommand(options = {}) {
    const PORT = options.port || 3000;
    const COLLAB_PORT = parseInt(process.env.WS_PORT || '3001', 10);
    console.log(`
╭──────────────────────────────────────╮
│  🌐 SWACANA — Dashboard              │
│  ═══════════════════════════════════  │
│                                      │
│  📡  http://localhost:${String(PORT).padEnd(5)}              │
│  💬  ws://localhost:${String(COLLAB_PORT).padEnd(4)} (collab)        │
│                                      │
╰──────────────────────────────────────╯
`);
    // 1. Validate web app exists
    if (!WEB_DIR) {
        console.log('\n⚠️  Web app dashboard tidak ditemukan.\n');
        console.log('   🎯 Jalankan perintah ini dari folder proyek SWACANA:');
        console.log('');
        console.log('   cd self-plan-hub');
        console.log('   npm install');
        console.log('   swacana dashboard\n');
        console.log('   📦 Atau install ulang dengan versi terbaru:');
        console.log('   npm install -g swacana@latest');
        console.log('   swacana dashboard\n');
        console.log('   🌐 Atau langsung jalankan dev server manual:');
        console.log('   cd self-plan-hub && npx next dev -p 3000\n');
        return;
    }
    const NEXT_BIN = path.join(WEB_DIR, 'node_modules', '.bin', 'next');
    // 2. Install web dependencies if missing
    if (!fs.existsSync(NEXT_BIN)) {
        console.log('📦  Menginstall dependencies web app...\n');
        await runNpmInstall(WEB_DIR);
        console.log('   ✅ Selesai\n');
    }
    // 3. Start collaboration server (optional)
    if (options.collab) {
        startCollabServer(COLLAB_PORT);
    }
    // 4. Start Next.js dev server
    const nextBinExists = fs.existsSync(NEXT_BIN);
    const nextCmd = nextBinExists ? NEXT_BIN : 'npx';
    const nextArgs = nextBinExists ? ['dev', '-p', String(PORT)] : ['next', 'dev', '-p', String(PORT)];
    console.log(`🚀  Memulai dashboard di http://localhost:${PORT}...\n`);
    serverProcess = spawn(nextCmd, nextArgs, {
        cwd: WEB_DIR,
        env: {
            ...process.env,
            PORT: String(PORT),
            WS_PORT: String(COLLAB_PORT),
            NODE_ENV: process.env.NODE_ENV || 'development',
        },
        stdio: 'inherit',
        shell: true,
    });
    serverProcess.on('error', (err) => {
        console.error(`\n❌  Gagal memulai dashboard: ${err.message}`);
        stopDashboard();
        process.exit(1);
    });
    serverProcess.on('exit', (code) => {
        stopDashboard();
        process.exit(code || 0);
    });
    // 4. Open browser after server starts
    if (!options.noOpen) {
        setTimeout(() => openBrowser(`http://localhost:${PORT}`), 3000);
    }
    console.log(`\n🌐  Buka http://localhost:${PORT} di browser.`);
    console.log('   Tekan Ctrl+C untuk berhenti.\n');
}
// ─── NPM Install ───────────────────────────────────────────────────────────
function runNpmInstall(cwd) {
    return new Promise((resolve, reject) => {
        const proc = spawn('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], {
            cwd,
            stdio: 'inherit',
            shell: true,
        });
        proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`npm install gagal (${code})`)));
        proc.on('error', reject);
    });
}
// ─── Collaboration Server (WebSocket) ──────────────────────────────────────
function startCollabServer(port) {
    if (!WEB_DIR)
        return;
    const wsPath = path.join(WEB_DIR, 'server', 'ws-server.ts');
    if (!fs.existsSync(wsPath)) {
        console.log('   ⚠️  server/ws-server.ts tidak ditemukan.');
        return;
    }
    const proc = spawn('npx', ['tsx', 'server/ws-server.ts'], {
        cwd: WEB_DIR,
        env: { ...process.env, WS_PORT: String(port) },
        stdio: 'pipe',
        shell: true,
    });
    proc.stdout?.on('data', (d) => {
        const m = d.toString().trim();
        if (m)
            console.log(`   [collab] ${m}`);
    });
    proc.stderr?.on('data', (d) => {
        const m = d.toString().trim();
        if (m && !m.includes('ExperimentalWarning'))
            console.log(`   [collab] ${m}`);
    });
    proc.on('error', (err) => console.log(`   ⚠️  Collab error: ${err.message}`));
    collabProcess = proc;
    console.log(`   💬  Collab server: ws://localhost:${port}\n`);
}
// ─── Open Browser ──────────────────────────────────────────────────────────
function openBrowser(url) {
    try {
        const plat = process.platform;
        if (plat === 'win32')
            spawn('cmd', ['/c', 'start', url], { shell: true, detached: true });
        else if (plat === 'darwin')
            spawn('open', [url], { detached: true });
        else
            spawn('xdg-open', [url], { detached: true });
    }
    catch { /* optional */ }
}
// ─── Cleanup (called from index.ts SIGINT handler) ─────────────────────────
export function stopDashboard() {
    if (serverProcess) {
        try {
            serverProcess.kill('SIGTERM');
        }
        catch { }
        serverProcess = null;
    }
    if (collabProcess) {
        try {
            collabProcess.kill('SIGTERM');
        }
        catch { }
        collabProcess = null;
    }
}
//# sourceMappingURL=dashboard.js.map