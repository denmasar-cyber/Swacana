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
export declare function dashboardCommand(options?: {
    port?: number;
    noOpen?: boolean;
    collab?: boolean;
}): Promise<void>;
export declare function stopDashboard(): void;
//# sourceMappingURL=dashboard.d.ts.map