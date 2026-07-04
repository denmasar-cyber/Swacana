/**
 * SWACANA — Self-Driven Agent Loop
 *
 * The core intelligence: watches, learns, and acts automatically.
 *
 * Agent Loop:
 * 1. SENSE — detect new data (file changes, browser, clipboard)
 * 2. THINK — analyze, summarize, extract insights
 * 3. ACT — create notes, update plans, suggest tasks
 * 4. STORE — save to SQLite + vector DB
 * 5. SLEEP — wait for next trigger
 *
 * 100% local, no cloud calls, no API keys.
 */
import { promises as fs } from 'node:fs';
import { quickGenerate, loadModel, isModelReady, } from '../ai/engine.js';
import { embedText, initEmbeddingEngine, splitIntoChunks } from '../ai/embedding.js';
import { SUMMARIZER_PROMPT, INSIGHT_EXTRACTOR_PROMPT, NOTE_CREATOR_PROMPT, PLAN_GENERATOR_PROMPT, MEMORY_CONSOLE_PROMPT, } from '../ai/prompts.js';
import { notes, files, chunks, memories, getDb } from '../storage/db.js';
import { storeEmbedding } from '../storage/vector.js';
import { readTextFile } from '../fs/watcher.js';
// ─── Initialization ────────────────────────────────────────────────────────
export async function initializeAgent(onProgress) {
    // Ensure database is initialized
    await getDb();
    onProgress?.('Memuat AI model...', 0.1);
    await loadModel((p) => onProgress?.(p.text, p.progress));
    onProgress?.('Memuat embedding model...', 0.7);
    await initEmbeddingEngine((p) => {
        onProgress?.(p.message || 'Memuat embedding...', p.total > 0 ? p.current / p.total : 0);
    });
    onProgress?.('✅ Agent siap!', 1);
}
// ─── SENSE: Process File Change ────────────────────────────────────────────
export async function processFileChange(event) {
    const insights = [];
    if (event.type === 'unlink')
        return insights;
    try {
        // Read file content
        const content = await readTextFile(event.filePath);
        if (!content || content.trim().length < 50)
            return insights;
        // Store file in database
        const stat = await fs.stat(event.filePath);
        const fileId = files.upsert(event.filePath, event.filename, event.extension, stat.size, stat.mtime.toISOString(), '');
        // Generate summary using AI
        const summary = await quickGenerate(`Ringkas file ini:\n${content.slice(0, 2000)}`, SUMMARIZER_PROMPT);
        if (fileId)
            files.markIndexed(fileId, summary);
        // Split into chunks and embed
        const chunkResults = splitIntoChunks(content);
        const chunkIds = chunks.bulkCreate(chunkResults.map((c) => ({
            fileId,
            noteId: null,
            text: c.text,
            tokenCount: c.tokenCount,
        })));
        // Generate embeddings for each chunk
        for (let i = 0; i < chunkResults.length; i++) {
            const vector = await embedText(chunkResults[i].text);
            storeEmbedding(chunkIds[i], null, vector);
        }
        // Extract insight
        const insight = await quickGenerate(`File: ${event.filename}\nContent: ${content.slice(0, 1000)}`, INSIGHT_EXTRACTOR_PROMPT);
        if (insight.trim()) {
            const memoryId = memories.create('insight', insight, event.filePath || undefined);
            insights.push({
                type: 'insight',
                content: insight,
                context: event.filePath || undefined,
            });
        }
        // Create auto-note if content is substantial
        if (content.length > 500) {
            try {
                const noteContent = await quickGenerate(`Buat catatan dari file ini:\n${summary}\n\nSource: ${event.filePath}`, NOTE_CREATOR_PROMPT);
                if (noteContent.trim()) {
                    const title = event.filename.replace(/\.[^/.]+$/, '');
                    notes.create(`📄 ${title}`, `Auto-generated from: ${event.filePath}\n\n${noteContent}`, 'file');
                }
            }
            catch { /* Note creation is optional */ }
        }
    }
    catch (err) {
        console.warn(`[Agent] Gagal proses ${event.filePath}:`, err.message);
    }
    return insights;
}
// ─── THINK: Memory Consolidation ───────────────────────────────────────────
export async function consolidateMemories() {
    const unactioned = memories.getUnactioned();
    if (unactioned.length === 0)
        return null;
    const recentMemories = unactioned
        .slice(-5)
        .map((m) => `[${m.type}] ${m.content}`)
        .join('\n');
    try {
        const result = await quickGenerate(recentMemories, MEMORY_CONSOLE_PROMPT);
        // Mark as actioned
        for (const m of unactioned) {
            memories.markActioned(m.id);
        }
        return result;
    }
    catch {
        return null;
    }
}
// ─── THINK: Analyze Text ───────────────────────────────────────────────────
export async function analyzeText(text, context) {
    const insights = [];
    // Generate summary
    try {
        const summary = await quickGenerate(text.slice(0, 3000), SUMMARIZER_PROMPT);
        if (summary.trim()) {
            insights.push({ type: 'insight', content: summary, context });
        }
    }
    catch { /* ignore */ }
    // Generate plan if it looks like a task list
    if (text.length > 200) {
        try {
            const plan = await quickGenerate(text.slice(0, 2000), PLAN_GENERATOR_PROMPT);
            if (plan.trim().includes('STEPS:')) {
                insights.push({ type: 'plan', content: plan, context });
            }
        }
        catch { /* ignore */ }
    }
    // Store all insights
    for (const insight of insights) {
        memories.create(insight.type, insight.content, insight.context);
    }
    return insights;
}
// ─── ACT: Create Note from Insight ────────────────────────────────────────
export function createNoteFromInsight(insight) {
    try {
        const title = insight.type === 'plan'
            ? `📋 ${insight.content.split('\n')[0]?.replace('GOAL: ', '') || 'Rencana'}`
            : insight.type === 'task'
                ? `✅ ${insight.content.slice(0, 60)}`
                : `💡 ${insight.content.slice(0, 60)}`;
        const noteId = notes.create(title.slice(0, 80), `**Source:** ${insight.context || 'Auto-generated'}\n\n${insight.content}`, 'auto');
        return noteId;
    }
    catch {
        return null;
    }
}
// ─── ACT: Run Agent Once ──────────────────────────────────────────────────
export async function runAgentOnce(config) {
    if (!isModelReady()) {
        config.onLog?.('⏳ Memuat AI model...');
        await initializeAgent(config.onProgress);
    }
    const allInsights = [];
    // 1. Consolidate memories
    config.onLog?.('🧠 Mengkonsolidasi memori...');
    const consolidation = await consolidateMemories();
    if (consolidation) {
        allInsights.push({ type: 'insight', content: consolidation });
        config.onLog?.(`📊 ${consolidation.slice(0, 100)}...`);
    }
    // 2. Check for unprocessed files
    const unprocessed = files.getAll().filter((f) => !f.indexed_at);
    if (unprocessed.length > 0) {
        config.onLog?.(`📁 Memproses ${unprocessed.length} file...`);
        for (const f of unprocessed.slice(0, 5)) {
            const content = await readTextFile(f.path);
            if (content) {
                const summary = await quickGenerate(content.slice(0, 2000), SUMMARIZER_PROMPT);
                files.markIndexed(f.id, summary);
                allInsights.push({ type: 'insight', content: summary, context: f.path });
            }
        }
    }
    // 3. Generate consolidated note
    if (allInsights.length > 0) {
        const combined = allInsights.map((i) => i.content).join('\n\n');
        notes.create(`📝 Ringkasan AI - ${new Date().toLocaleDateString('id-ID')}`, combined, 'auto');
        config.onLog?.(`📝 Catatan otomatis dibuat (${allInsights.length} insight)`);
    }
    return allInsights;
}
//# sourceMappingURL=index.js.map