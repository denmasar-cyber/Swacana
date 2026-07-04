/**
 * SWACANA — Init Command
 *
 * First-time setup: create directories, download AI model,
 * initialize SQLite database.
 *
 * Usage: swacana init
 */
import path from 'node:path';
import fs from 'node:fs';
import { loadModel } from '../ai/engine.js';
import { initEmbeddingEngine } from '../ai/embedding.js';
import { getDb, getStats } from '../storage/db.js';
// ─── Directories ───────────────────────────────────────────────────────────
const SWACANA_DIR = path.join(process.env.HOME || process.env.USERPROFILE || '~', '.swacana');
const DIRS = {
    base: SWACANA_DIR,
    data: path.join(SWACANA_DIR, 'data'),
    models: path.join(SWACANA_DIR, 'models'),
    logs: path.join(SWACANA_DIR, 'logs'),
    notes: path.join(SWACANA_DIR, 'notes'),
};
function createDirectories(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}
// ─── Print Banner ──────────────────────────────────────────────────────────
function printBanner() {
    console.log(`
╭──────────────────────────────────────╮
│                                      │
│   ███████  ██     ██  █████   █████  │
│  ██       ████   ████ ██  ██ ██     │
│  ██       ██ ██ ██ ██ █████  ██     │
│  ██       ██  ███  ██ ██  ██ ██     │
│   ███████ ██   █   ██ ██  ██  █████  │
│                                      │
│  🌟 SWACANA — Personal AI Desk       │
│  100% Lokal · Gratis · No API Key    │
│                                      │
╰──────────────────────────────────────╯
`);
}
// ─── Print Summary ─────────────────────────────────────────────────────────
function printSummary(success) {
    const stats = getStats();
    console.log(`
╭──────────────────────────────────────╮
│                                      │
│  ✅ SWACANA siap digunakan!          │
│                                      │
│  📁  Folder: ${SWACANA_DIR.padEnd(20)}│
│  🗄️  Database: ${stats.notes} catatan, ${stats.files} file    │
│  🧠  Model AI: ${stats.files > 0 ? 'Terinstall' : 'Siap di-load'}            │
│                                      │
│  🚀  Coba perintah:                  │
│     swacana watch ./folder-anda      │
│     swacana scan ./folder-anda       │
│     swacana agent                    │
│                                      │
╰──────────────────────────────────────╯
`);
}
// ─── Init Command ──────────────────────────────────────────────────────────
export async function initCommand(options = {}) {
    printBanner();
    try {
        // 1. Create directories
        console.log('\n📁  Membuat direktori...');
        for (const [name, dir] of Object.entries(DIRS)) {
            createDirectories(dir);
            console.log(`   ✅ ~/.swacana/${name}/`);
        }
        // 2. Initialize database
        console.log('\n🗄️  Inisialisasi database...');
        await getDb();
        console.log('   ✅ SQLite database siap');
        // 3. Create config
        console.log('\n⚙️  Membuat konfigurasi...');
        const configPath = path.join(DIRS.base, 'config.json');
        if (!fs.existsSync(configPath)) {
            const config = {
                version: '1.0.0',
                created_at: new Date().toISOString(),
                watch_dirs: [],
                auto_scan: true,
                max_file_size_mb: 10,
                language: 'id',
                theme: 'dark',
            };
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        }
        console.log('   ✅ Konfigurasi siap');
        // 4. Download AI model (optional)
        if (!options.skipModel) {
            console.log('\n🧠  Mendownload model AI...');
            console.log('   📥  Model: LaMini-Flan-T5-783M (~1.5GB)');
            console.log('   ⏳  Hanya sekali download. Ini bisa memakan waktu...\n');
            try {
                await loadModel((progress) => {
                    const bar = '█'.repeat(Math.floor(progress.progress * 20)) +
                        '▒'.repeat(20 - Math.floor(progress.progress * 20));
                    process.stdout.write(`\r   ${bar} ${Math.round(progress.progress * 100)}% — ${progress.text}`);
                });
                console.log('\n\n   ✅ Model AI siap!');
            }
            catch (err) {
                console.log(`\n\n   ⚠️  Gagal download model: ${err.message}`);
                console.log('   💡  Model akan di-download otomatis saat pertama kali dipakai.');
            }
            // 5. Download embedding model
            console.log('\n🧠  Memuat model embedding...');
            try {
                await initEmbeddingEngine((p) => {
                    process.stdout.write(`\r   ${p.message || 'Loading...'}`);
                });
                console.log('   ✅ Model embedding siap (all-MiniLM-L6-v2, 90MB)');
            }
            catch (err) {
                console.log(`   ⚠️  ${err.message}`);
            }
        }
        // 6. Print summary
        printSummary(true);
        return true;
    }
    catch (err) {
        console.error('\n❌  Gagal inisialisasi:', err.message);
        return false;
    }
}
//# sourceMappingURL=init.js.map