/**
 * @prompt-id forge-v4.1:utils:tokens:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

/**
 * Estimates token count for text.
 * Uses a simple heuristic: ~4 characters per token for English text.
 * For production, use tiktoken or a proper tokenizer.
 */
export function countTokens(text: string): number {
  if (!text) return 0;

  // Simple heuristic: ~4 characters per token
  // This is a rough estimate - production should use tiktoken
  const charCount = text.length;
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // Average of character-based and word-based estimates
  const charBasedEstimate = Math.ceil(charCount / 4);
  const wordBasedEstimate = Math.ceil(wordCount * 1.3);

  return Math.ceil((charBasedEstimate + wordBasedEstimate) / 2);
}

/**
 * Truncates text to fit within a token budget.
 */
export function truncateToTokenBudget(text: string, maxTokens: number): string {
  const currentTokens = countTokens(text);

  if (currentTokens <= maxTokens) {
    return text;
  }

  // Estimate characters needed
  const ratio = maxTokens / currentTokens;
  const targetChars = Math.floor(text.length * ratio * 0.95); // 5% buffer

  // Truncate at word boundary
  const truncated = text.substring(0, targetChars);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > targetChars * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Splits text into chunks that fit within a token budget.
 */
export function chunkText(text: string, maxTokensPerChunk: number): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);

  let currentChunk = '';
  let currentTokens = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = countTokens(paragraph);

    if (currentTokens + paragraphTokens <= maxTokensPerChunk) {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      currentTokens += paragraphTokens;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }

      if (paragraphTokens <= maxTokensPerChunk) {
        currentChunk = paragraph;
        currentTokens = paragraphTokens;
      } else {
        // Split large paragraph
        const subChunks = splitLargeParagraph(paragraph, maxTokensPerChunk);
        chunks.push(...subChunks.slice(0, -1));
        currentChunk = subChunks[subChunks.length - 1] || '';
        currentTokens = countTokens(currentChunk);
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function splitLargeParagraph(paragraph: string, maxTokens: number): string[] {
  const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
  const chunks: string[] = [];

  let currentChunk = '';
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = countTokens(sentence);

    if (currentTokens + sentenceTokens <= maxTokens) {
      currentChunk += sentence;
      currentTokens += sentenceTokens;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
      currentTokens = sentenceTokens;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
