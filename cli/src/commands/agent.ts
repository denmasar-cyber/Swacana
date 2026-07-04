/**
 * SWACANA — Agent Command
 *
 * Runs the self-driven AI agent that automatically:
 * - Learns from files and browser data
 * - Generates insights and summaries
 * - Creates notes and plans
 * - Consolidates memories
 *
 * Usage:
 *   swacana agent          → Run once, show results
 *   swacana agent daemon   → Run continuously in background
 *   swacana agent chat     → Interactive chat mode
 */

import { initializeAgent, runAgentOnce } from '../agent/index.js';
import { notes, memories, files, browserData, getStats, getDb } from '../storage/db.js';
import { generate } from '../ai/engine.js';

// ─── Print Header ──────────────────────────────────────────────────────────

function printHeader(role: string) {
  console.log(`
╭──────────────────────────────────────╮
│  🤖 SWACANA — AI Agent (${role.padEnd(8)})    │
╰──────────────────────────────────────╯
`);
}

// ─── Print Stats ───────────────────────────────────────────────────────────

function printStats() {
  const stats = getStats();
  console.log(`\n📊  Status:`);
  console.log(`   📝  ${stats.notes} catatan`);
  console.log(`   📁  ${stats.files} file terindex`);
  console.log(`   🧩  ${stats.chunks} chunk`);
  console.log(`   💡  ${stats.memories} insight`);
  console.log(`   🌐  ${stats.browserData} browser capture`);
}

// ─── Agent Once ────────────────────────────────────────────────────────────

async function agentOnce(): Promise<void> {
  await getDb();
  printHeader('once');
  printStats();

  console.log('\n🧠  Menjalankan agent (1 siklus)...\n');

  const insights = await runAgentOnce({
    mode: 'once',
    onLog: (msg) => console.log(`   ${msg}`),
    onProgress: (msg, pct) => {
      process.stdout.write(`\r   ${Math.round(pct * 100)}% — ${msg}`);
    },
  });

  console.log();

  if (insights.length === 0) {
    console.log('   💡  Tidak ada insight baru.');
    console.log('   Gunakan "swacana scan ./folder" untuk menambahkan data.');
  } else {
    console.log(`\n✅  ${insights.length} insight baru:`);
    for (const insight of insights) {
      const icon = insight.type === 'plan' ? '📋' : insight.type === 'task' ? '✅' : insight.type === 'idea' ? '💡' : '🧠';
      console.log(`   ${icon} ${insight.content.slice(0, 120)}`);
    }
  }

  printStats();
}

// ─── Agent Daemon ──────────────────────────────────────────────────────────

async function agentDaemon(): Promise<void> {
  await getDb();
  printHeader('daemon');

  console.log('\n⏳  Inisialisasi agent...\n');
  await initializeAgent((msg, pct) => {
    process.stdout.write(`\r   ${Math.round(pct * 100)}% — ${msg}`);
  });

  console.log('\n\n✅  Agent siap!');

  let cycleCount = 0;

  async function runCycle() {
    cycleCount++;
    const time = new Date().toLocaleTimeString('id-ID');

    console.log(`\n📡  [${time}] Siklus #${cycleCount}`);

    try {
      const insights = await runAgentOnce({
        mode: 'once',
        onLog: (msg) => console.log(`      ${msg}`),
        onProgress: () => {},
      });

      if (insights.length > 0) {
        console.log(`   ✅ ${insights.length} insight baru`);
      } else {
        console.log(`   💤 Tidak ada data baru`);
      }
    } catch (err) {
      console.log(`   ⚠️  Error: ${(err as Error).message}`);
    }

    // Schedule next cycle (every 5 minutes)
    setTimeout(runCycle, 5 * 60 * 1000);
  }

  // Run first cycle
  await runCycle();

  console.log('\n🔄  Agent berjalan setiap 5 menit. Tekan Ctrl+C untuk berhenti.\n');

  // Handle cleanup
  process.on('SIGINT', () => {
    console.log('\n\n📊  Ringkasan sesi:');
    console.log(`   🔄 ${cycleCount} siklus dijalankan`);
    printStats();
    console.log('\n👋  Sampai jumpa!');
    process.exit(0);
  });

  // Keep alive
  await new Promise(() => {});
}

// ─── Agent Chat ────────────────────────────────────────────────────────────

async function agentChat(): Promise<void> {
  await getDb();
  printHeader('chat');

  console.log('\n⏳  Memuat AI...\n');
  await initializeAgent((msg, pct) => {
    process.stdout.write(`\r   ${Math.round(pct * 100)}% — ${msg}`);
  });

  console.log('\n\n💬  Mode chat interaktif. Ketik "exit" untuk keluar.\n');

  // Get context from recent notes
  const recentNotes = notes.getAll().slice(0, 5);
  let context = '';
  if (recentNotes.length > 0) {
    context = recentNotes
      .map((n) => `[${n.created_at}] ${n.title}: ${n.content.slice(0, 200)}`)
      .join('\n');
  }

  const { createInterface } = await import('node:readline/promises');
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  while (true) {
    const input = await rl.question('\n💬  Anda: ');

    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      break;
    }

    if (input.toLowerCase() === 'stats') {
      printStats();
      continue;
    }

    process.stdout.write('🤖  AI: ');

    try {
      const fullPrompt = context
        ? `Context (recent notes):\n${context}\n\nUser: ${input}`
        : input;

      let response = '';

      await generate(
        fullPrompt,
        'Kamu adalah asisten AI pribadi yang membantu mencatat, merencanakan, dan menganalisis. Jawab dengan singkat dan jelas dalam Bahasa Indonesia.',
        { maxTokens: 256, temperature: 0.7 },
        (p) => {
          process.stdout.write(`\r   ${Math.round(p.progress * 100)}% — ${p.text}`);
        },
      ).then((text) => {
        response = text;
      });

      process.stdout.write('\r                                   \r');

      if (response) {
        console.log(`🤖  ${response}`);

        // Store as note if user asks
        if (input.toLowerCase().includes('catat') || input.toLowerCase().includes('simpan')) {
          const noteId = notes.create('💬 Chat', `**Anda:** ${input}\n\n**AI:** ${response}`, 'auto');
          console.log(`   📝 Disimpan sebagai catatan!`);
        }
      } else {
        console.log('⚠️  AI tidak merespon. Coba lagi atau periksa model.');
      }
    } catch (err) {
      console.log(`\n⚠️  Error: ${(err as Error).message}`);
    }
  }

  rl.close();
  console.log('\n👋  Sampai jumpa!\n');
}

// ─── Agent Command ─────────────────────────────────────────────────────────

export async function agentCommand(
  mode?: string,
): Promise<void> {
  switch (mode) {
    case 'daemon':
      await agentDaemon();
      break;
    case 'chat':
      await agentChat();
      break;
    case 'once':
    default:
      await agentOnce();
      break;
  }
}
