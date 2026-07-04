/**
 * SWACANA — AI Inference Engine
 *
 * Uses Transformers.js ( @xenova/transformers ) for 100% local LLM inference.
 * Zero API keys, zero cloud calls, zero cost.
 *
 * Also supports Ollama as optional fallback for better quality.
 *
 * Architecture:
 * 1. Try Ollama (if installed & running on localhost:11434)
 * 2. Fallback to Transformers.js (always available, no setup needed)
 */
export interface LLMConfig {
    /** Model to use for Transformers.js */
    localModelId?: string;
    /** Maximum tokens to generate */
    maxTokens?: number;
    /** Temperature for generation */
    temperature?: number;
}
export interface LoadProgress {
    text: string;
    progress: number;
}
export declare function isOllamaAvailable(): Promise<boolean>;
export declare function resetOllamaCheck(): void;
export declare function generate(prompt: string, systemPrompt?: string, config?: Partial<LLMConfig>, onProgress?: (p: LoadProgress) => void): Promise<string>;
export declare function quickGenerate(prompt: string, systemPrompt: string): Promise<string>;
export declare function loadModel(onProgress?: (p: LoadProgress) => void): Promise<void>;
export declare function isModelReady(): boolean;
export declare function getModelStatus(): {
    ready: boolean;
    loading: boolean;
    usingOllama: boolean;
};
//# sourceMappingURL=engine.d.ts.map