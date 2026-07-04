/**
 * SWACANA — Token Estimation Utility
 *
 * Simple token counter: ~4 characters per token (multilingual).
 * Used for chunking text before embedding.
 */
export function estimateTokenCount(text) {
    if (!text)
        return 0;
    return Math.ceil(text.length / 4);
}
//# sourceMappingURL=chunking.js.map