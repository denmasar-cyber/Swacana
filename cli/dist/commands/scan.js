/**
 * SWACANA — Scan Command
 *
 * Scans directories and indexes all text files for AI learning.
 * - Recursively finds all text files
 * - Generates summaries with AI
 * - Creates embeddings for RAG
 * - Extracts insights
 *
 * Usage: swacana scan <directory> [directories...]
 */
import path from 'node:path';
import fs from 'node:fs';
import { scanFiles } from '../fs/scanner.js';
import { initializeAgent } from '../agent/index.js';
import { embedText, splitIntoChunks } from '../ai/embedding.js';
import { quickGenerate } from '../ai/engine.js';
import { SUMMARIZER_PROMPT } from '../ai/prompts.js';
import { files, chunks, notes, getDb } from '../storage/db.js';
import { storeEmbedding } from '../storage/vector.js';
// ─── Progress Bar ──────────────────────────────────────────────────────────
function renderProgress(current, total, label) {
    const width = 30;
    const pct = total > 0 ? current / total : 0;
    const filled = Math.floor(pct * width);
    const bar = '█'.repeat(filled) + '▒'.repeat(width - filled);
    process.stdout.write(`\r   ${bar} ${Math.round(pct * 100)}% — ${label}`);
}
// ─── Scan Command ──────────────────────────────────────────────────────────
export async function scanCommand(directories, options = {}) {
    // Validate directories
    const validDirs = [];
    for (const dir of directories) {
        const resolved = path.resolve(dir);
        try {
            const stat = fs.statSync(resolved);
            if (stat.isDirectory()) {
                validDirs.push(resolved);
            }
            else if (stat.isFile()) {
                validDirs.push(resolved);
            }
        }
        catch {
            console.log(`   ⚠️  Tidak ditemukan: ${dir}`);
        }
    }
    if (validDirs.length === 0) {
        console.log('\n❌  Tidak ada path valid untuk di-scan.');
        console.log('   Usage: swacana scan ./folder-anda');
        return;
    }
    console.log('\n🔍  SWACANA Scanner\n');
    // Phase 1: Scan files
    console.log('📁  Fase 1: Memindai file...\n');
    const fileResults = [];
    for (const dir of validDirs) {
        const results = await scanFiles({
            directories: [dir],
            maxFileSize: 10 * 1024 * 1024, // 10MB
            onProgress: (p) => {
                const msg = p.status === 'scanning' ? `Memindai ${p.filePath}...` :
                    p.status === 'reading' ? `Membaca ${path.basename(p.filePath)}...` :
                        p.status === 'error' ? `⚠️ ${p.message}` : '';
                if (msg)
                    process.stdout.write(`\r   ${msg}`);
            },
        });
        fileResults.push(...results);
    }
    const textFileCount = fileResults.length;
    console.log(`\n   ✅ ${textFileCount} file teks ditemukan`);
    console.log(`   📊 Total: ${(fileResults.reduce((s, r) => s + r.sizeBytes, 0) / 1024 / 1024).toFixed(1)}MB`);
    if (textFileCount === 0) {
        console.log('\n💡  Tidak ada file teks yang ditemukan.');
        console.log('   Pastikan folder berisi file seperti .ts, .md, .txt, .js, dll.');
        return;
    }
    // Limit files
    const filesToProcess = options.maxFiles
        ? fileResults.slice(0, options.maxFiles)
        : fileResults;
    if (filesToProcess.length < textFileCount) {
        console.log(`   📌 Memproses ${filesToProcess.length} file pertama (maxFiles=${options.maxFiles})`);
    }
    // Initialize database
    await getDb();
    // Phase 2: Initialize AI
    console.log('\n🧠  Fase 2: Memuat AI...');
    await initializeAgent((msg, pct) => {
        process.stdout.write(`\r   ${Math.round(pct * 100)}% — ${msg}`);
    });
    console.log('\n   ✅ AI siap');
    // Phase 3: Process files
    console.log(`\n📝  Fase 3: Memproses ${filesToProcess.length} file...\n`);
    let successCount = 0;
    let chunkCount = 0;
    for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];
        renderProgress(i + 1, filesToProcess.length, `${path.basename(file.filePath)}`);
        try {
            // Read file content
            const content = await fs.promises.readFile(file.filePath, 'utf-8');
            if (!content || content.length < 20)
                continue;
            // Store in database
            const fileId = files.upsert(file.filePath, file.filename, file.extension, file.sizeBytes, (await fs.promises.stat(file.filePath)).mtime.toISOString(), file.contentHash || '');
            // Generate summary
            let summary = '';
            try {
                summary = await quickGenerate(content.slice(0, 2000), SUMMARIZER_PROMPT);
            }
            catch { /* summary optional */ }
            if (fileId)
                files.markIndexed(fileId, summary);
            // Chunk and embed
            const chunkResults = splitIntoChunks(content);
            const chunkIds = [];
            for (const chunk of chunkResults) {
                const chunkId = chunks.create(fileId, null, chunk.text, chunk.tokenCount);
                chunkIds.push(chunkId);
            }
            // Generate embeddings
            if (!options.noEmbed) {
                for (let j = 0; j < chunkResults.length; j++) {
                    try {
                        const vector = await embedText(chunkResults[j].text);
                        storeEmbedding(chunkIds[j], null, vector);
                    }
                    catch { /* embedding optional */ }
                }
            }
            chunkCount += chunkResults.length;
            successCount++;
        }
        catch (err) {
            // Skip files that fail to process
            continue;
        }
    }
    console.log();
    // Summary
    console.log(`\n📊  Hasil scan:\n`);
    console.log(`   ✅ ${successCount} file berhasil diproses`);
    console.log(`   📦 ${chunkCount} chunk dibuat`);
    console.log(`   🧠 Embedding: ${options.noEmbed ? 'Tidak' : 'Ya'}`);
    // Create summary note
    const summaryText = [
        `## 📊 Hasil Scan - ${new Date().toLocaleDateString('id-ID')}`,
        '',
        `**Folder:** ${validDirs.join(', ')}`,
        `**File ditemukan:** ${textFileCount}`,
        `**File diproses:** ${successCount}`,
        `**Chunk dibuat:** ${chunkCount}`,
        '',
        `### File yang diproses:`,
        ...filesToProcess.slice(0, 20).map((f) => `- ${f.filename}`),
        filesToProcess.length > 20 ? `- ...dan ${filesToProcess.length - 20} file lainnya` : '',
    ].filter(Boolean).join('\n');
    notes.create('📊 Hasil Scan', summaryText, 'auto');
    console.log(`\n💡  Gunakan 'swacana agent' untuk menganalisis hasil scan.`);
}
//# sourceMappingURL=scan.js.map