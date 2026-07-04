#!/usr/bin/env node

/**
 * SWACANA — Personal AI Desk
 *
 * CLI entry point. Defines all commands and handles routing.
 *
 * Usage:
 *   swacana init              → Setup & download AI model
 *   swacana watch <dir>       → Watch directory for changes
 *   swacana scan <dir>        → Scan & index files
 *   swacana agent [mode]      → Run AI agent
 *   swacana notes             → List notes
 *   swacana browser           → Capture browser
 *   swacana stats             → Show statistics
 *   swacana dashboard         → Start web app dashboard
 *   swacana version           → Show version
 *
 * 100% local, gratis, tanpa API key.
 */

import { program } from 'commander';
import { initCommand } from './commands/init.js';
import { watchCommand } from './commands/watch.js';
import { scanCommand } from './commands/scan.js';
import { agentCommand } from './commands/agent.js';
import { notes, memories, files, browserData, getStats, getDb, closeDb } from './storage/db.js';
import { dashboardCommand } from './commands/dashboard.js';
import { checkChrome, getActiveTabContent, captureUrl } from './browser/index.js';
import { quickGenerate } from './ai/engine.js';
import { BROWSER_SUMMARIZER_PROMPT } from './ai/prompts.js';
import { readFileSync } from 'node:fs';

// ─── Version ───────────────────────────────────────────────────────────────

let pkgVersion = '1.0.0';
try {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));
  pkgVersion = pkg.version;
} catch { /* fallback */ }

// ─── Program info ─────────────────────────────────────────────────────────

program.name('swacana').version(pkgVersion);

// ─── Banner ────────────────────────────────────────────────────────────────

const BANNER = `
╭──────────────────────────────────────╮
│  🌟 SWACANA — Personal AI Desk       │
│  100% Lokal · Gratis · No API Key    │
│  v${pkgVersion.padEnd(13)}           │
╰──────────────────────────────────────╯
`;

// ─── Init ──────────────────────────────────────────────────────────────────

program
  .command('init')
  .description('Inisialisasi SWACANA (buat folder, download model AI)')
  .option('--skip-model', 'Skip download AI model')
  .option('--verbose', 'Tampilkan log detail')
  .action(async (options) => {
    console.log(BANNER);
    await getDb();
    const ok = await initCommand({ skipModel: options.skipModel, verbose: options.verbose });
    process.exit(ok ? 0 : 1);
  });

// ─── Watch ─────────────────────────────────────────────────────────────────

program
  .command('watch')
  .description('Pantau folder untuk perubahan file (auto-learn)')
  .argument('<directories...>', 'Folder yang akan dipantau')
  .option('--no-agent', 'Jangan jalankan AI agent (hanya pantau)')
  .option('--interval <ms>', 'Interval debounce (ms)', parseInt)
  .action(async (directories: string[], options) => {
    await watchCommand(directories, options);
  });

// ─── Scan ──────────────────────────────────────────────────────────────────

program
  .command('scan')
  .description('Scan & index semua file di folder')
  .argument('<directories...>', 'Folder/file yang akan di-scan')
  .option('--no-embed', 'Jangan generate embeddings')
  .option('--max-files <n>', 'Batas jumlah file', parseInt)
  .action(async (directories: string[], options) => {
    console.log(BANNER);
    await getDb();
    await scanCommand(directories, options);
  });

// ─── Agent ─────────────────────────────────────────────────────────────────

program
  .command('agent')
  .description('Jalankan AI agent (once | daemon | chat)')
  .argument('[mode]', 'Mode: once (default), daemon, atau chat')
  .action(async (mode?: string) => {
    console.log(BANNER);
    await getDb();
    await agentCommand(mode || 'once');
  });

// ─── Notes ─────────────────────────────────────────────────────────────────

program
  .command('notes')
  .description('Lihat daftar catatan')
  .option('--search <q>', 'Cari catatan')
  .option('--limit <n>', 'Batas jumlah', parseInt)
  .option('--export', 'Export ke file markdown')
  .action(async (options) => {
    await getDb();
    let allNotes = options.search
      ? notes.search(options.search)
      : notes.getAll();

    if (options.limit) {
      allNotes = allNotes.slice(0, options.limit);
    }

    if (allNotes.length === 0) {
      console.log('\n📝  Belum ada catatan.');
      console.log('   Gunakan "swacana scan ./folder" untuk mulai.');
      return;
    }

    if (options.export) {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      const exportDir = path.join(
        process.env.HOME || process.env.USERPROFILE || '~',
        '.swacana', 'notes',
      );
      for (const note of allNotes) {
        const filename = `${note.created_at.slice(0, 10)}-${note.title.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 30)}.md`;
        const content = `# ${note.title}\n\n${note.content}\n\n---\n*Created: ${note.created_at}*\n*Source: ${note.source_type}*\n`;
        await fs.writeFile(path.join(exportDir, filename), content, 'utf-8');
      }
      console.log(`\n✅  ${allNotes.length} catatan di-export ke ${exportDir}`);
      return;
    }

    console.log(`\n📝  ${allNotes.length} catatan:\n`);
    for (const note of allNotes) {
      const icon = note.source_type === 'file' ? '📄' : note.source_type === 'browser' ? '🌐' : note.source_type === 'auto' ? '🤖' : '📝';
      const date = new Date(note.created_at).toLocaleDateString('id-ID');
      const preview = note.content.slice(0, 80).replace(/\n/g, ' ');
      console.log(`   ${icon} ${note.title}`);
      console.log(`      ${date} | ${preview}...`);
      console.log();
    }
  });

// ─── Browser ───────────────────────────────────────────────────────────────

program
  .command('browser')
  .description('Capture & simpan data dari browser (Chrome)')
  .option('--url <url>', 'URL spesifik untuk di-capture')
  .option('--list', 'Lihat history browser capture')
  .action(async (options) => {
    console.log(BANNER);
    await getDb();
    // ... (browser handler logic - unchanged)
    if (options.list) {
      const data = browserData.getAll();
      if (data.length === 0) { console.log('\n🌐  Belum ada data browser.'); return; }
      console.log(`\n🌐  ${data.length} browser capture:\n`);
      for (const d of data.slice(0, 20)) {
        const date = new Date(d.captured_at).toLocaleDateString('id-ID');
        console.log(`   📄 ${d.title}\n      ${d.url}\n      ${date}${d.summary ? ` | ${d.summary.slice(0, 60)}` : ''}\n`);
      }
      return;
    }
    if (options.url) {
      console.log('\n🌐  Mengcapture URL...\n');
      const page = await captureUrl(options.url);
      if (!page) { console.log('\n❌  Gagal capture URL.'); return; }
      let summary = '';
      if (page.content) try { summary = await quickGenerate(page.content.slice(0, 3000), BROWSER_SUMMARIZER_PROMPT); } catch {}
      browserData.create(page.title, page.url, page.content.slice(0, 10000), summary);
      notes.create(`🌐 ${page.title.slice(0, 50)}`, page.content.slice(0, 2000), 'browser');
      console.log(`\n${summary ? `💡  ${summary.slice(0, 200)}` : '✅  Disimpan'}`);
      return;
    }
    console.log('\n🔍  Mencari Chrome...');
    const chrome = await checkChrome();
    if (!chrome.available) {
      console.log('   ⚠️  Chrome tidak ditemukan.');
      console.log('   🛠️  Pastikan Chrome dijalankan dengan: chrome --remote-debugging-port=9222');
      console.log('   Atau gunakan: swacana browser --url https://...');
      return;
    }
    console.log(`   ✅ Chrome ditemukan`);
    const page = await getActiveTabContent();
    if (!page) {
      console.log('   ⚠️  Tidak bisa connect ke Chrome.');
      console.log('   🛠️  Pastikan Chrome dijalankan dengan: chrome --remote-debugging-port=9222');
      console.log('   Atau alternatif: swacana browser --url https://...');
      return;
    }
    let summary = '';
    if (page.content) try { summary = await quickGenerate(page.content.slice(0, 3000), BROWSER_SUMMARIZER_PROMPT); } catch {}
    browserData.create(page.title, page.url, page.content.slice(0, 10000), summary);
    if (summary) {
      notes.create(`🌐 ${page.title.slice(0, 50)}`, `**URL:** ${page.url}\n\n**Ringkasan:** ${summary}\n\n---\n\n${page.content.slice(0, 2000)}`, 'browser');
      console.log(`\n💡  ${summary.slice(0, 200)}`);
    } else {
      notes.create(`🌐 ${page.title.slice(0, 50)}`, `**URL:** ${page.url}\n\n${page.content.slice(0, 2000)}`, 'browser');
      console.log(`\n✅  Disimpan sebagai catatan`);
    }
  });

// ─── Stats ─────────────────────────────────────────────────────────────────

program
  .command('stats')
  .description('Tampilkan statistik database')
  .action(async () => {
    await getDb();
    const stats = getStats();
    console.log(BANNER);
    console.log(`📊  Statistik:\n`);
    console.log(`   📝  Catatan:      ${stats.notes}`);
    console.log(`   📁  File:         ${stats.files}`);
    console.log(`   🧩  Chunk:        ${stats.chunks}`);
    console.log(`   💡  Insight:      ${stats.memories}`);
    console.log(`   🌐  Browser:      ${stats.browserData}\n`);
    console.log(`   📂  Lokasi data: ~/.swacana/\n`);
  });

// ─── Dashboard ─────────────────────────────────────────────────────────────

program
  .command('dashboard')
  .description('Mulai web app dashboard (http://localhost:3000)')
  .option('--port <n>', 'Port untuk web server', parseInt)
  .option('--no-open', 'Jangan buka browser otomatis')
  .option('--collab', 'Jalankan collaboration server juga')
  .action(async (options) => {
    await dashboardCommand({
      port: options.port,
      noOpen: options.noOpen,
      collab: options.collab,
    });
  });

// ─── Single SIGINT handler ─────────────────────────────────────────────────
// Cleans up child processes (dashboard), closes DB, then exits.

process.on('SIGINT', async () => {
  console.log();
  try {
    const { stopDashboard } = await import('./commands/dashboard.js');
    stopDashboard();
  } catch { /* dashboard not running, ignore */ }
  closeDb();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDb();
  process.exit(0);
});

process.on('exit', () => {
  closeDb();
});

// ─── Run ───────────────────────────────────────────────────────────────────

program.parse(process.argv);

// Show help if no command
if (process.argv.length <= 2) {
  console.log(BANNER);
  console.log('\n💡  Gunakan salah satu perintah:\n');
  console.log('   swacana init              → Setup pertama');
  console.log('   swacana watch <folder>    → Pantau folder');
  console.log('   swacana scan <folder>     → Index file');
  console.log('   swacana agent             → AI agent');
  console.log('   swacana agent chat        → Chat interaktif');
  console.log('   swacana browser           → Capture Chrome');
  console.log('   swacana dashboard         → Web app (localhost:3000)');
  console.log('   swacana notes             → Lihat catatan');
  console.log('   swacana stats             → Statistik');
  console.log();
  console.log('   swacana --help            → Info lengkap');
  console.log();
}
