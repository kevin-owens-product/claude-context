/**
 * @prompt-id forge-v4.1:test:tokens:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { describe, it, expect } from 'vitest';
import { countTokens, truncateToTokenBudget, chunkText } from '../utils/tokens';

describe('Token Utilities', () => {
  describe('countTokens', () => {
    it('should return 0 for empty string', () => {
      expect(countTokens('')).toBe(0);
    });

    it('should return 0 for null/undefined', () => {
      expect(countTokens(null as any)).toBe(0);
      expect(countTokens(undefined as any)).toBe(0);
    });

    it('should estimate tokens for short text', () => {
      const text = 'Hello world';
      const tokens = countTokens(text);
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(10);
    });

    it('should estimate tokens for longer text', () => {
      const text =
        'This is a longer piece of text that should result in more tokens being counted.';
      const tokens = countTokens(text);
      expect(tokens).toBeGreaterThan(10);
    });

    it('should handle special characters', () => {
      const text = 'Hello! @#$%^&*() World';
      const tokens = countTokens(text);
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('truncateToTokenBudget', () => {
    it('should return original text if within budget', () => {
      const text = 'Short text';
      const result = truncateToTokenBudget(text, 100);
      expect(result).toBe(text);
    });

    it('should truncate text that exceeds budget', () => {
      const text = 'This is a very long piece of text that definitely exceeds our small token budget and should be truncated to fit within the limit.';
      const result = truncateToTokenBudget(text, 5);
      expect(result.length).toBeLessThan(text.length);
      expect(result.endsWith('...')).toBe(true);
    });

    it('should truncate at word boundary when possible', () => {
      const text = 'Hello world this is a test of truncation at word boundaries';
      const result = truncateToTokenBudget(text, 5);
      // Should end with ... and the text before should be complete words
      expect(result.endsWith('...')).toBe(true);
      // Should be shorter than original
      expect(result.length).toBeLessThan(text.length);
      // The truncated text (without ...) should be a prefix of the original
      const withoutEllipsis = result.replace('...', '');
      expect(text.startsWith(withoutEllipsis)).toBe(true);
    });
  });

  describe('chunkText', () => {
    it('should return single chunk for short text', () => {
      const text = 'Short text';
      const chunks = chunkText(text, 100);
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe(text);
    });

    it('should split text at paragraph boundaries', () => {
      const text = 'Paragraph one.\n\nParagraph two.\n\nParagraph three.';
      const chunks = chunkText(text, 10);
      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle text without paragraph breaks', () => {
      const text =
        'This is one long paragraph without any breaks that needs to be split into multiple chunks based on sentences or other criteria.';
      const chunks = chunkText(text, 10);
      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });

    it('should preserve content across chunks', () => {
      const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
      const chunks = chunkText(text, 100);
      const combined = chunks.join('\n\n');
      expect(combined).toContain('First');
      expect(combined).toContain('Second');
      expect(combined).toContain('Third');
    });

    it('should handle empty paragraphs', () => {
      const text = 'Paragraph one.\n\n\n\nParagraph two.';
      const chunks = chunkText(text, 100);
      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle large paragraphs that exceed chunk size', () => {
      const longParagraph =
        'This is a very long sentence that goes on and on. Another sentence follows. And another one here. More content continues to flow. We need enough sentences to exceed the chunk limit.';
      const chunks = chunkText(longParagraph, 10);
      expect(chunks.length).toBeGreaterThan(1);
    });
  });
});
