import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../index.js';

// Lazy-initialized Anthropic client
let anthropic: Anthropic | null = null;
let initialized = false;

function getAnthropicClient(): Anthropic | null {
  if (initialized) return anthropic;
  initialized = true;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey && apiKey.length > 0) {
    try {
      anthropic = new Anthropic({ apiKey });
      console.log('Highlight Service: Anthropic client initialized successfully');
    } catch (err) {
      console.error('Highlight Service: Failed to initialize Anthropic client:', err);
    }
  } else {
    console.log('Highlight Service: No ANTHROPIC_API_KEY found, using mock highlights');
  }

  return anthropic;
}

async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      const status = error?.status || error?.statusCode;
      if (status === 529 || status === 429) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.log(`Highlight API overloaded (${status}), retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

export interface HighlightInput {
  type: 'fact' | 'statistic' | 'claim' | 'definition' | 'quote' | 'conclusion';
  text: string;
  startOffset: number;
  endOffset: number;
  importance: 'critical' | 'high' | 'medium' | 'low';
  category?: string;
  explanation?: string;
  confidence?: number;
}

interface ExtractedHighlights {
  highlights: HighlightInput[];
  summary: string;
}

/**
 * Extract smart highlights from document content using AI
 */
export async function extractHighlights(
  documentId: string,
  content: string,
  userId?: string
): Promise<ExtractedHighlights> {
  const client = getAnthropicClient();

  if (!client) {
    console.log('Anthropic API not configured, using mock highlights');
    return generateMockHighlights(content);
  }

  try {
    // Limit content size for API
    const truncatedContent = content.slice(0, 20000);

    const response = await callWithRetry(() =>
      client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: `Analyze this document and identify the most important pieces of information that a researcher should pay attention to. For each highlight, provide:

1. type: One of "fact", "statistic", "claim", "definition", "quote", "conclusion"
2. text: The exact text to highlight (must be a substring of the document)
3. importance: "critical" (must-know), "high" (very important), "medium" (useful), "low" (nice to know)
4. category: Optional category like "financial", "technical", "legal", "scientific", etc.
5. explanation: Brief explanation (1 sentence) of why this is important

Return a JSON object with:
- highlights: Array of highlights (aim for 10-20 key highlights)
- summary: One paragraph summary of the document's main points

Document:
${truncatedContent}

Respond only with valid JSON:
{
  "highlights": [
    {
      "type": "statistic",
      "text": "exact text from document",
      "importance": "high",
      "category": "financial",
      "explanation": "Why this matters"
    }
  ],
  "summary": "Document summary..."
}`,
          },
        ],
      })
    );

    const textContent = response.content[0];
    if (textContent.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const parsed = JSON.parse(textContent.text) as ExtractedHighlights;

    // Calculate offsets for each highlight
    const highlightsWithOffsets: HighlightInput[] = [];

    for (const h of parsed.highlights) {
      const startOffset = content.indexOf(h.text);
      if (startOffset !== -1) {
        highlightsWithOffsets.push({
          type: h.type,
          text: h.text,
          startOffset,
          endOffset: startOffset + h.text.length,
          importance: h.importance,
          category: h.category,
          explanation: h.explanation,
          confidence: 0.85, // Default confidence for AI-generated
        });
      }
    }

    // Store highlights in database
    await storeHighlights(documentId, highlightsWithOffsets, userId);

    return {
      highlights: highlightsWithOffsets,
      summary: parsed.summary,
    };
  } catch (error) {
    console.error('Highlight extraction error:', error);
    // Fall back to mock highlights
    const mockResult = generateMockHighlights(content);
    await storeHighlights(documentId, mockResult.highlights, userId);
    return mockResult;
  }
}

/**
 * Generate mock highlights for testing without API
 */
function generateMockHighlights(content: string): ExtractedHighlights {
  const highlights: HighlightInput[] = [];

  // Find sentences with numbers (likely statistics)
  const numberPattern = /[^.]*\d+[%$€£]?[^.]*\./g;
  const numberMatches = content.match(numberPattern) || [];

  for (const match of numberMatches.slice(0, 5)) {
    const startOffset = content.indexOf(match);
    if (startOffset !== -1) {
      highlights.push({
        type: 'statistic',
        text: match.trim(),
        startOffset,
        endOffset: startOffset + match.length,
        importance: 'high',
        category: 'data',
        explanation: 'Contains numerical data that may be significant',
        confidence: 0.7,
      });
    }
  }

  // Find sentences that look like conclusions
  const conclusionPatterns = [
    /therefore[^.]*\./gi,
    /in conclusion[^.]*\./gi,
    /as a result[^.]*\./gi,
    /this shows[^.]*\./gi,
    /we found[^.]*\./gi,
  ];

  for (const pattern of conclusionPatterns) {
    const matches = content.match(pattern) || [];
    for (const match of matches.slice(0, 2)) {
      const startOffset = content.indexOf(match);
      if (startOffset !== -1 && !highlights.some(h => h.startOffset === startOffset)) {
        highlights.push({
          type: 'conclusion',
          text: match.trim(),
          startOffset,
          endOffset: startOffset + match.length,
          importance: 'critical',
          explanation: 'This appears to be a key conclusion or finding',
          confidence: 0.65,
        });
      }
    }
  }

  // Find definitions (sentences with "is defined as", "refers to", etc.)
  const definitionPatterns = [
    /[^.]*is defined as[^.]*\./gi,
    /[^.]*refers to[^.]*\./gi,
    /[^.]*means that[^.]*\./gi,
  ];

  for (const pattern of definitionPatterns) {
    const matches = content.match(pattern) || [];
    for (const match of matches.slice(0, 2)) {
      const startOffset = content.indexOf(match);
      if (startOffset !== -1 && !highlights.some(h => h.startOffset === startOffset)) {
        highlights.push({
          type: 'definition',
          text: match.trim(),
          startOffset,
          endOffset: startOffset + match.length,
          importance: 'medium',
          explanation: 'Defines an important term or concept',
          confidence: 0.6,
        });
      }
    }
  }

  // Sort by offset
  highlights.sort((a, b) => a.startOffset - b.startOffset);

  return {
    highlights,
    summary: `This document contains ${content.split(/\s+/).length} words. ${highlights.length} key highlights were identified, including statistics, conclusions, and definitions.`,
  };
}

/**
 * Store highlights in database
 */
async function storeHighlights(
  documentId: string,
  highlights: HighlightInput[],
  userId?: string
): Promise<void> {
  // Delete existing AI-generated highlights (keep user-added ones)
  await prisma.documentHighlight.deleteMany({
    where: {
      documentId,
      isUserAdded: false,
    },
  });

  // Create new highlights
  if (highlights.length > 0) {
    await prisma.documentHighlight.createMany({
      data: highlights.map(h => ({
        documentId,
        type: h.type,
        text: h.text,
        startOffset: h.startOffset,
        endOffset: h.endOffset,
        importance: h.importance,
        category: h.category,
        explanation: h.explanation,
        confidence: h.confidence,
        isUserAdded: false,
        createdById: userId,
      })),
    });
  }
}

/**
 * Get all highlights for a document
 */
export async function getDocumentHighlights(documentId: string) {
  const highlights = await prisma.documentHighlight.findMany({
    where: { documentId },
    orderBy: { startOffset: 'asc' },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
    },
  });

  return highlights;
}

/**
 * Add a user-created highlight
 */
export async function addUserHighlight(
  documentId: string,
  userId: string,
  data: {
    text: string;
    startOffset: number;
    endOffset: number;
    type?: string;
    importance?: string;
    category?: string;
    explanation?: string;
  }
) {
  const highlight = await prisma.documentHighlight.create({
    data: {
      documentId,
      createdById: userId,
      text: data.text,
      startOffset: data.startOffset,
      endOffset: data.endOffset,
      type: data.type || 'fact',
      importance: data.importance || 'medium',
      category: data.category,
      explanation: data.explanation,
      isUserAdded: true,
    },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
    },
  });

  return highlight;
}

/**
 * Update a highlight
 */
export async function updateHighlight(
  highlightId: string,
  userId: string,
  data: {
    type?: string;
    importance?: string;
    category?: string;
    explanation?: string;
  }
) {
  // Check ownership for user-added highlights
  const existing = await prisma.documentHighlight.findUnique({
    where: { id: highlightId },
  });

  if (!existing) {
    throw new Error('Highlight not found');
  }

  // Only allow editing user-added highlights by their creator
  if (existing.isUserAdded && existing.createdById !== userId) {
    throw new Error('Not authorized to edit this highlight');
  }

  const highlight = await prisma.documentHighlight.update({
    where: { id: highlightId },
    data: {
      type: data.type,
      importance: data.importance,
      category: data.category,
      explanation: data.explanation,
    },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
    },
  });

  return highlight;
}

/**
 * Delete a highlight
 */
export async function deleteHighlight(highlightId: string, userId: string) {
  const existing = await prisma.documentHighlight.findUnique({
    where: { id: highlightId },
  });

  if (!existing) {
    throw new Error('Highlight not found');
  }

  // Only allow deleting user-added highlights by their creator
  if (existing.isUserAdded && existing.createdById !== userId) {
    throw new Error('Not authorized to delete this highlight');
  }

  await prisma.documentHighlight.delete({
    where: { id: highlightId },
  });
}

/**
 * Get highlight statistics for a document
 */
export async function getHighlightStats(documentId: string) {
  const highlights = await prisma.documentHighlight.findMany({
    where: { documentId },
  });

  const byType: Record<string, number> = {};
  const byImportance: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  for (const h of highlights) {
    byType[h.type] = (byType[h.type] || 0) + 1;
    byImportance[h.importance] = (byImportance[h.importance] || 0) + 1;
    if (h.category) {
      byCategory[h.category] = (byCategory[h.category] || 0) + 1;
    }
  }

  return {
    total: highlights.length,
    aiGenerated: highlights.filter(h => !h.isUserAdded).length,
    userAdded: highlights.filter(h => h.isUserAdded).length,
    byType,
    byImportance,
    byCategory,
  };
}
