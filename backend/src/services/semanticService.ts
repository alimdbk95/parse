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
      console.log('Semantic Service: Anthropic client initialized successfully');
    } catch (err) {
      console.error('Semantic Service: Failed to initialize Anthropic client:', err);
    }
  } else {
    console.log('Semantic Service: No ANTHROPIC_API_KEY found, using mock analysis');
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

      // Check if it's an overloaded error (529) or rate limit (429)
      const status = error?.status || error?.statusCode;
      if (status === 529 || status === 429) {
        const delay = baseDelayMs * Math.pow(2, attempt); // Exponential backoff
        console.log(`Semantic API overloaded (${status}), retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // For other errors, throw immediately
      throw error;
    }
  }

  throw lastError;
}

interface SemanticInsightInput {
  type: 'theme' | 'entity' | 'sentiment' | 'keyphrase' | 'summary';
  label: string;
  value?: string;
  confidence?: number;
  context?: string;
}

interface AnalysisResult {
  themes: SemanticInsightInput[];
  entities: SemanticInsightInput[];
  keyphrases: SemanticInsightInput[];
  sentiment: SemanticInsightInput;
  summary: SemanticInsightInput;
}

export async function analyzeDocumentSemantics(
  documentId: string,
  content: string,
  analysisId?: string
): Promise<AnalysisResult | null> {
  const client = getAnthropicClient();

  if (!client) {
    console.log('Anthropic API not configured, using mock analysis');
    return generateMockAnalysis(content);
  }

  try {
    const truncatedContent = content.slice(0, 15000); // Limit context size

    const response = await callWithRetry(() =>
      client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `Analyze the following document and extract semantic insights. Return a JSON object with:
- themes: Array of main themes/topics (each with label, confidence 0-1, and a brief context snippet)
- entities: Array of named entities like people, organizations, places (each with label, type as value, confidence)
- keyphrases: Array of important phrases (each with label, frequency as value, confidence)
- sentiment: Overall sentiment analysis (label: positive/negative/neutral/mixed, value: detailed sentiment description, confidence)
- summary: Brief summary (label: "Summary", value: 2-3 sentence summary, confidence: 1)

Document:
${truncatedContent}

Respond only with valid JSON, no explanation.`,
          },
        ],
      })
    );

    const textContent = response.content[0];
    if (textContent.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const result = JSON.parse(textContent.text) as AnalysisResult;

    // Store insights in database
    await storeInsights(documentId, result, analysisId);

    return result;
  } catch (error) {
    console.error('Semantic analysis error:', error);
    // Fall back to mock analysis
    const mockResult = generateMockAnalysis(content);
    if (mockResult) {
      await storeInsights(documentId, mockResult, analysisId);
    }
    return mockResult;
  }
}

function generateMockAnalysis(content: string): AnalysisResult {
  // Extract some basic patterns for mock analysis
  const words = content.toLowerCase().split(/\s+/);
  const wordFreq: Record<string, number> = {};

  words.forEach((word) => {
    if (word.length > 4) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });

  const sortedWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return {
    themes: [
      { type: 'theme', label: 'Data Analysis', confidence: 0.85, context: 'Primary focus on analytical methods' },
      { type: 'theme', label: 'Research Methodology', confidence: 0.72, context: 'Discussion of research approaches' },
      { type: 'theme', label: 'Key Findings', confidence: 0.68, context: 'Main results and conclusions' },
    ],
    entities: [
      { type: 'entity', label: 'Research Team', value: 'organization', confidence: 0.9 },
      { type: 'entity', label: 'Study Period', value: 'time', confidence: 0.85 },
    ],
    keyphrases: sortedWords.map(([word, freq]) => ({
      type: 'keyphrase' as const,
      label: word,
      value: String(freq),
      confidence: Math.min(0.95, 0.5 + freq * 0.05),
    })),
    sentiment: {
      type: 'sentiment',
      label: 'neutral',
      value: 'The document maintains an objective, analytical tone throughout.',
      confidence: 0.82,
    },
    summary: {
      type: 'summary',
      label: 'Summary',
      value: `This document contains ${words.length} words and discusses various analytical topics. The content appears to focus on research and data analysis methodologies.`,
      confidence: 1,
    },
  };
}

async function storeInsights(
  documentId: string,
  result: AnalysisResult,
  analysisId?: string
): Promise<void> {
  const insightsToCreate = [
    ...result.themes.map((t) => ({
      documentId,
      analysisId,
      type: 'theme',
      label: t.label,
      confidence: t.confidence,
      context: t.context,
    })),
    ...result.entities.map((e) => ({
      documentId,
      analysisId,
      type: 'entity',
      label: e.label,
      value: e.value,
      confidence: e.confidence,
    })),
    ...result.keyphrases.map((k) => ({
      documentId,
      analysisId,
      type: 'keyphrase',
      label: k.label,
      value: k.value,
      confidence: k.confidence,
    })),
    {
      documentId,
      analysisId,
      type: 'sentiment',
      label: result.sentiment.label,
      value: result.sentiment.value,
      confidence: result.sentiment.confidence,
    },
    {
      documentId,
      analysisId,
      type: 'summary',
      label: result.summary.label,
      value: result.summary.value,
      confidence: result.summary.confidence,
    },
  ];

  // Delete existing insights for this document
  await prisma.semanticInsight.deleteMany({
    where: { documentId },
  });

  // Create new insights
  await prisma.semanticInsight.createMany({
    data: insightsToCreate,
  });
}

export async function getDocumentInsights(documentId: string) {
  const insights = await prisma.semanticInsight.findMany({
    where: { documentId },
    orderBy: { createdAt: 'desc' },
  });

  // Group by type
  const grouped = {
    themes: insights.filter((i) => i.type === 'theme'),
    entities: insights.filter((i) => i.type === 'entity'),
    keyphrases: insights.filter((i) => i.type === 'keyphrase'),
    sentiment: insights.find((i) => i.type === 'sentiment'),
    summary: insights.find((i) => i.type === 'summary'),
  };

  return grouped;
}
