/**
 * SWACANA — Watch Command
 *
 * Watches directories for file changes. Automatically:
 * - Indexes new/modified files
 * - Generates AI summaries
 * - Creates notes from insights
 * - Stores embeddings for RAG
 *
 * Usage: swacana watch <directory> [directories...]
 */
import path from 'node:path';
import fs from 'node:fs';
import { FileWatcher } from '../fs/watcher.js';
import { initializeAgent, processFileChange, consolidateMemories } from '../agent/index.js';
import { notes, memories, files, getDb } from '../storage/db.js';
// ─── State ─────────────────────────────────────────────────────────────────
let watcher = null;
let isRunning = false;
let changeCount = 0;
// ─── Print Helpers ─────────────────────────────────────────────────────────
function timestamp() {
    return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}
function logWatch(msg) {
    console.log(`  [${timestamp()}] ${msg}`);
}
// ─── Handle File Change ────────────────────────────────────────────────────
async function handleChange(event) {
    changeCount++;
    const emoji = event.type === 'add' ? '📄' : event.type === 'change' ? '✏️' : '🗑️';
    logWatch(`${emoji} ${event.filename} (${event.type})`);
    if (event.type !== 'unlink') {
        try {
            const insights = await processFileChange(event);
            for (const insight of insights) {
                const icon = insight.type === 'plan' ? '📋' : insight.type === 'task' ? '✅' : '💡';
                logWatch(`${icon} ${insight.content.slice(0, 80)}...`);
            }
            if (insights.length > 0) {
                logWatch(`📝 ${insights.length} insight disimpan`);
            }
        }
        catch (err) {
            logWatch(`⚠️ Gagal proses: ${err.message}`);
        }
    }
}
// ─── Watch Command ─────────────────────────────────────────────────────────
export async function watchCommand(directories, options = {}) {
    if (isRunning) {
        console.log('⚠️  Watcher sudah berjalan.');
        return;
    }
    // Validate directories
    const validDirs = [];
    for (const dir of directories) {
        const resolved = path.resolve(dir);
        try {
            const stat = fs.statSync(resolved);
            if (stat.isDirectory()) {
                validDirs.push(resolved);
            }
            else {
                console.log(`   ⚠️  Bukan direktori: ${dir}`);
            }
        }
        catch {
            console.log(`   ⚠️  Tidak ditemukan: ${dir}`);
        }
    }
    if (validDirs.length === 0) {
        console.log('\n❌  Tidak ada direktori valid untuk di-watch.');
        console.log('   Usage: swacana watch ./folder-anda');
        return;
    }
    // Initialize database
    await getDb();
    // Initialize AI if needed
    if (!options.noAgent) {
        console.log('\n🧠  Memuat AI model...');
        await initializeAgent((msg, pct) => {
            process.stdout.write(`\r   ${Math.round(pct * 100)}% — ${msg}`);
        });
        console.log();
    }
    // Get current stats
    const currentNotes = notes.getAll().length;
    const currentFiles = files.count();
    const currentMemories = memories.count();
    // Start watcher
    console.log(`\n👀  Mengawasi ${validDirs.length} direktori:\n`);
    for (const dir of validDirs) {
        console.log(`   📁 ${dir}`);
    }
    console.log();
    logWatch('Watcher aktif. Tekan Ctrl+C untuk berhenti.\n');
    // Periodic consolidation
    let consolidationInterval = null;
    watcher = new FileWatcher({
        directories: validDirs,
        onChange: handleChange,
        onError: (err) => logWatch(`❌ ${err.message}`),
        onReady: () => {
            logWatch(`Watcher siap! Memantau ${validDirs.length} direktori.`);
            // Start periodic consolidation
            if (!options.noAgent) {
                consolidationInterval = setInterval(async () => {
                    try {
                        const result = await consolidateMemories();
                        if (result) {
                            logWatch(`🧠 Konsolidasi: ${result.slice(0, 80)}...`);
                        }
                    }
                    catch { /* ignore */ }
                }, 60000); // Every 60 seconds
            }
        },
    });
    watcher.start();
    isRunning = true;
    // Handle cleanup on Ctrl+C
    process.on('SIGINT', async () => {
        console.log('\n\n🛑  Menghentikan watcher...');
        if (consolidationInterval)
            clearInterval(consolidationInterval);
        await watcher?.stop();
        const newNotes = notes.getAll().length - currentNotes;
        const newFiles = files.count() - currentFiles;
        const newMemories = memories.count() - currentMemories;
        console.log(`\n📊  Sesi ini:`);
        console.log(`   📄 ${changeCount} perubahan file`);
        console.log(`   📝 ${newNotes} catatan baru`);
        console.log(`   💡 ${newMemories} insight baru`);
        console.log(`   📁 ${newFiles} file di-index`);
        console.log('\n👋  Sampai jumpa!');
        isRunning = false;
        process.exit(0);
    });
    // Keep process alive
    await new Promise(() => { });
}
//# sourceMappingURL=watch.js.map