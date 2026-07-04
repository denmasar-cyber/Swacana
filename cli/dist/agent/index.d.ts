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
import { FileChangeEvent } from '../fs/watcher.js';
export type AgentMode = 'daemon' | 'once' | 'chat';
export interface AgentConfig {
    mode: AgentMode;
    onLog?: (message: string) => void;
    onProgress?: (message: string, progress: number) => void;
}
export interface AgentInsight {
    type: 'insight' | 'plan' | 'task' | 'idea';
    content: string;
    context?: string;
}
export declare function initializeAgent(onProgress?: (msg: string, pct: number) => void): Promise<void>;
export declare function processFileChange(event: FileChangeEvent): Promise<AgentInsight[]>;
export declare function consolidateMemories(): Promise<string | null>;
export declare function analyzeText(text: string, context?: string): Promise<AgentInsight[]>;
export declare function createNoteFromInsight(insight: AgentInsight): string | null;
export declare function runAgentOnce(config: AgentConfig): Promise<AgentInsight[]>;
//# sourceMappingURL=index.d.ts.map