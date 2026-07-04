/**
 * SWACANA — Vector Storage & Cosine Similarity Tests
 *
 * Tests for vector operations: cosine similarity, serialization.
 */
import { describe, it, expect } from 'vitest';
import { cosineSimilarity } from './vector.js';
// ─── Float32Array to Buffer and back (same as vector.ts) ───────────────────
function float32ArrayToBuffer(vector) {
    const arr = new Float32Array(vector);
    return Buffer.from(arr.buffer);
}
function bufferToFloat32Array(buffer) {
    const arr = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
    return Array.from(arr);
}
// ─── Cosine Similarity Tests ───────────────────────────────────────────────
describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
        const a = [0.1, 0.2, 0.3, 0.4];
        const b = [0.1, 0.2, 0.3, 0.4];
        expect(cosineSimilarity(a, b)).toBeCloseTo(1.0, 5);
    });
    it('should return 0 for orthogonal vectors', () => {
        const a = [1, 0];
        const b = [0, 1];
        expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
    });
    it('should return negative for oppositely directed vectors', () => {
        const a = [1, 0];
        const b = [-1, 0];
        expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 5);
    });
    it('should return a value between 0 and 1 for similar vectors', () => {
        const a = [1, 2, 3, 4, 5];
        const b = [1.1, 2.1, 3.1, 4.1, 5.1];
        const sim = cosineSimilarity(a, b);
        expect(sim).toBeGreaterThan(0.99);
        expect(sim).toBeLessThan(1.001);
    });
    it('should return 0 for empty/null-like inputs', () => {
        const a = [];
        const b = [];
        expect(cosineSimilarity(a, b)).toBe(0);
    });
    it('should handle vectors with different magnitudes', () => {
        const a = [1, 0, 0];
        const b = [100, 0, 0];
        expect(cosineSimilarity(a, b)).toBeCloseTo(1.0, 5); // Same direction
    });
    it('should return 0 for vectors of different lengths', () => {
        const a = [1, 2, 3];
        const b = [1, 2, 3, 4];
        expect(cosineSimilarity(a, b)).toBe(0);
    });
    it('should return meaningful similarity for partially overlapping vectors', () => {
        const a = [1, 1, 1, 0, 0];
        const b = [1, 1, 0, 0, 1];
        const sim = cosineSimilarity(a, b);
        expect(sim).toBeGreaterThan(0);
        expect(sim).toBeLessThan(1);
        expect(sim).toBeCloseTo(2 / Math.sqrt(3 * 3), 3); // dot=2, |a|=√3, |b|=√3
    });
});
// ─── Vector Serialization Tests ────────────────────────────────────────────
describe('Vector Serialization (Float32Array ↔ Buffer)', () => {
    it('should serialize and deserialize correctly', () => {
        const original = [0.1, 0.2, 0.3, 0.4, 0.5];
        const buffer = float32ArrayToBuffer(original);
        const restored = bufferToFloat32Array(buffer);
        expect(restored.length).toBe(original.length);
        for (let i = 0; i < original.length; i++) {
            // Float32 has ~7 decimal digits of precision; allow for IEEE 754 rounding
            expect(Math.abs(restored[i] - original[i])).toBeLessThan(1e-6);
        }
    });
    it('should handle empty vectors', () => {
        const original = [];
        const buffer = float32ArrayToBuffer(original);
        const restored = bufferToFloat32Array(buffer);
        expect(restored.length).toBe(0);
    });
    it('should handle negative values', () => {
        const original = [-0.5, -1.0, 0.5, 1.0];
        const buffer = float32ArrayToBuffer(original);
        const restored = bufferToFloat32Array(buffer);
        expect(Math.abs(restored[0] - (-0.5))).toBeLessThan(1e-6);
        expect(Math.abs(restored[1] - (-1.0))).toBeLessThan(1e-6);
        expect(Math.abs(restored[2] - 0.5)).toBeLessThan(1e-6);
        expect(Math.abs(restored[3] - 1.0)).toBeLessThan(1e-6);
    });
    it('should handle large vectors (384-dim)', () => {
        const original = Array.from({ length: 384 }, (_, i) => Math.sin(i * 0.1));
        const buffer = float32ArrayToBuffer(original);
        const restored = bufferToFloat32Array(buffer);
        expect(restored.length).toBe(384);
        for (let i = 0; i < 10; i++) {
            expect(restored[i]).toBeCloseTo(original[i], 5);
        }
    });
    it('should preserve cosine similarity after round-trip', () => {
        const original = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
        const buffer = float32ArrayToBuffer(original);
        const restored = bufferToFloat32Array(buffer);
        const sim = cosineSimilarity(original, restored);
        // Float32 has ~7 decimal digits of precision
        expect(sim).toBeCloseTo(1.0, 5);
    });
});
//# sourceMappingURL=vector.test.js.map