import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../index.js';

// Lazy-initialized Anthropic client (reuse from semanticService pattern)
let anthropic: Anthropic | null = null;
let initialized = false;

function getAnthropicClient(): Anthropic | null {
  if (initialized) return anthropic;
  initialized = true;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey && apiKey.length > 0) {
    try {
      anthropic = new Anthropic({ apiKey });
      console.log('Search Service: Anthropic client initialized successfully');
    } catch (err) {
      console.error('Search Service: Failed to initialize Anthropic client:', err);
    }
  } else {
    console.log('Search Service: No ANTHROPIC_API_KEY found, using keyword search only');
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
        console.log(`Search API overloaded (${status}), retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

interface SearchResult {
  id: string;
  type: 'document' | 'insight';
  documentId: string;
  documentName: string;
  title: string;
  snippet: string;
  relevanceScore: number;
  matchType: 'semantic' | 'keyword' | 'theme' | 'entity' | 'keyphrase';
  metadata?: {
    themes?: string[];
    entities?: string[];
    sentiment?: string;
  };
}

interface SearchQuery {
  original: string;
  expanded: string[];
  intent: 'factual' | 'exploratory' | 'comparative' | 'temporal';
  entities: string[];
  themes: string[];
}

/**
 * Expand the user's search query using AI to understand intent and related concepts
 */
async function expandQuery(query: string): Promise<SearchQuery> {
  const client = getAnthropicClient();

  if (!client) {
    // Fallback: basic keyword extraction
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    return {
      original: query,
      expanded: words,
      intent: 'exploratory',
      entities: [],
      themes: words,
    };
  }

  try {
    const response = await callWithRetry(() =>
      client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `Analyze this search query for a document research system. Extract:
1. expanded: Array of related terms, synonyms, and concepts (5-10 terms)
2. intent: One of "factual" (specific info), "exploratory" (broad topic), "comparative" (comparing things), "temporal" (time-based)
3. entities: Specific names, places, organizations mentioned
4. themes: Abstract topics or concepts

Query: "${query}"

Respond only with valid JSON:
{
  "expanded": ["term1", "term2", ...],
  "intent": "exploratory",
  "entities": [],
  "themes": ["theme1", ...]
}`,
          },
        ],
      })
    );

    const textContent = response.content[0];
    if (textContent.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const parsed = JSON.parse(textContent.text);
    return {
      original: query,
      expanded: parsed.expanded || [],
      intent: parsed.intent || 'exploratory',
      entities: parsed.entities || [],
      themes: parsed.themes || [],
    };
  } catch (error) {
    console.error('Query expansion error:', error);
    // Fallback
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    return {
      original: query,
      expanded: words,
      intent: 'exploratory',
      entities: [],
      themes: words,
    };
  }
}

/**
 * Score how well a document matches the search query
 */
function calculateRelevance(
  query: SearchQuery,
  content: string,
  insights: any[],
  documentName: string
): { score: number; matchedTerms: string[]; matchType: SearchResult['matchType'] } {
  const contentLower = content.toLowerCase();
  const nameLower = documentName.toLowerCase();
  const queryLower = query.original.toLowerCase();

  let score = 0;
  const matchedTerms: string[] = [];
  let matchType: SearchResult['matchType'] = 'keyword';

  // Exact query match in content (highest weight)
  if (contentLower.includes(queryLower)) {
    score += 50;
    matchedTerms.push(query.original);
    matchType = 'keyword';
  }

  // Query match in document name
  if (nameLower.includes(queryLower)) {
    score += 30;
  }

  // Expanded terms matching
  for (const term of query.expanded) {
    const termLower = term.toLowerCase();
    if (contentLower.includes(termLower)) {
      score += 10;
      if (!matchedTerms.includes(term)) {
        matchedTerms.push(term);
      }
    }
    if (nameLower.includes(termLower)) {
      score += 5;
    }
  }

  // Theme matching from insights
  const themes = insights.filter(i => i.type === 'theme');
  for (const theme of themes) {
    const themeLower = theme.label.toLowerCase();

    // Direct query-theme match
    if (themeLower.includes(queryLower) || queryLower.includes(themeLower)) {
      score += 40;
      matchedTerms.push(theme.label);
      matchType = 'theme';
    }

    // Expanded terms matching themes
    for (const term of query.expanded) {
      if (themeLower.includes(term.toLowerCase()) || term.toLowerCase().includes(themeLower)) {
        score += 20;
        if (!matchedTerms.includes(theme.label)) {
          matchedTerms.push(theme.label);
          matchType = 'theme';
        }
      }
    }

    // Query themes matching document themes
    for (const queryTheme of query.themes) {
      if (themeLower.includes(queryTheme.toLowerCase()) || queryTheme.toLowerCase().includes(themeLower)) {
        score += 25;
        if (!matchedTerms.includes(theme.label)) {
          matchedTerms.push(theme.label);
          matchType = 'semantic';
        }
      }
    }
  }

  // Entity matching from insights
  const entities = insights.filter(i => i.type === 'entity');
  for (const entity of entities) {
    const entityLower = entity.label.toLowerCase();

    if (queryLower.includes(entityLower) || entityLower.includes(queryLower)) {
      score += 35;
      matchedTerms.push(entity.label);
      matchType = 'entity';
    }

    for (const queryEntity of query.entities) {
      if (entityLower.includes(queryEntity.toLowerCase()) || queryEntity.toLowerCase().includes(entityLower)) {
        score += 30;
        if (!matchedTerms.includes(entity.label)) {
          matchedTerms.push(entity.label);
          matchType = 'entity';
        }
      }
    }
  }

  // Keyphrase matching
  const keyphrases = insights.filter(i => i.type === 'keyphrase');
  for (const phrase of keyphrases) {
    const phraseLower = phrase.label.toLowerCase();

    if (queryLower.includes(phraseLower) || phraseLower.includes(queryLower)) {
      score += 25;
      matchedTerms.push(phrase.label);
      matchType = 'keyphrase';
    }

    for (const term of query.expanded) {
      if (phraseLower.includes(term.toLowerCase())) {
        score += 10;
      }
    }
  }

  return { score, matchedTerms, matchType };
}

/**
 * Extract a relevant snippet from the content around the matched terms
 */
function extractSnippet(content: string, matchedTerms: string[], maxLength: number = 200): string {
  if (!content || content.length === 0) {
    return 'No content available';
  }

  const contentLower = content.toLowerCase();

  // Find the first occurrence of any matched term
  let bestIndex = -1;
  for (const term of matchedTerms) {
    const index = contentLower.indexOf(term.toLowerCase());
    if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
      bestIndex = index;
    }
  }

  if (bestIndex === -1) {
    // No match found, return start of content
    return content.slice(0, maxLength) + (content.length > maxLength ? '...' : '');
  }

  // Extract context around the match
  const start = Math.max(0, bestIndex - 50);
  const end = Math.min(content.length, bestIndex + maxLength - 50);

  let snippet = content.slice(start, end);

  // Add ellipsis if needed
  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';

  return snippet;
}

/**
 * Main semantic search function
 */
export async function semanticSearch(
  query: string,
  options: {
    workspaceId?: string;
    userId?: string;
    limit?: number;
    includeUnanalyzed?: boolean;
  }
): Promise<{
  results: SearchResult[];
  query: SearchQuery;
  totalMatches: number;
}> {
  const { workspaceId, userId, limit = 20, includeUnanalyzed = true } = options;

  // Expand the query using AI
  const expandedQuery = await expandQuery(query);

  // Get all documents the user has access to
  const documents = await prisma.document.findMany({
    where: workspaceId
      ? { workspaceId }
      : userId
      ? { uploadedById: userId }
      : {},
    include: {
      semanticInsights: true,
    },
  });

  const results: SearchResult[] = [];

  for (const doc of documents) {
    const content = doc.content || '';
    const insights = doc.semanticInsights || [];

    // Skip unanalyzed documents if not requested
    if (!includeUnanalyzed && insights.length === 0) {
      continue;
    }

    const { score, matchedTerms, matchType } = calculateRelevance(
      expandedQuery,
      content,
      insights,
      doc.name
    );

    // Only include if there's some relevance
    if (score > 0) {
      const snippet = extractSnippet(content, matchedTerms);

      // Get metadata from insights
      const themes = insights
        .filter(i => i.type === 'theme')
        .slice(0, 3)
        .map(i => i.label);
      const entities = insights
        .filter(i => i.type === 'entity')
        .slice(0, 3)
        .map(i => i.label);
      const sentiment = insights.find(i => i.type === 'sentiment')?.label;

      results.push({
        id: `doc-${doc.id}`,
        type: 'document',
        documentId: doc.id,
        documentName: doc.name,
        title: doc.name,
        snippet,
        relevanceScore: score,
        matchType,
        metadata: {
          themes,
          entities,
          sentiment,
        },
      });
    }
  }

  // Sort by relevance score
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Apply limit
  const limitedResults = results.slice(0, limit);

  return {
    results: limitedResults,
    query: expandedQuery,
    totalMatches: results.length,
  };
}

/**
 * Search for documents similar to a given document
 */
export async function findSimilarDocuments(
  documentId: string,
  options: {
    workspaceId?: string;
    userId?: string;
    limit?: number;
  }
): Promise<SearchResult[]> {
  const { workspaceId, userId, limit = 5 } = options;

  // Get the source document's insights
  const sourceDoc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { semanticInsights: true },
  });

  if (!sourceDoc) {
    throw new Error('Document not found');
  }

  // Build a query from the document's themes and entities
  const themes = sourceDoc.semanticInsights
    .filter(i => i.type === 'theme')
    .map(i => i.label);
  const entities = sourceDoc.semanticInsights
    .filter(i => i.type === 'entity')
    .map(i => i.label);

  const queryString = [...themes, ...entities].join(' ');

  if (!queryString) {
    return [];
  }

  const { results } = await semanticSearch(queryString, {
    workspaceId,
    userId,
    limit: limit + 1, // Get one extra to exclude the source doc
    includeUnanalyzed: false,
  });

  // Filter out the source document
  return results.filter(r => r.documentId !== documentId).slice(0, limit);
}

/**
 * Search within a specific document
 */
export async function searchWithinDocument(
  documentId: string,
  query: string
): Promise<{
  matches: Array<{
    type: 'content' | 'theme' | 'entity' | 'keyphrase';
    text: string;
    context?: string;
    position?: number;
  }>;
}> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { semanticInsights: true },
  });

  if (!document) {
    throw new Error('Document not found');
  }

  const matches: Array<{
    type: 'content' | 'theme' | 'entity' | 'keyphrase';
    text: string;
    context?: string;
    position?: number;
  }> = [];

  const queryLower = query.toLowerCase();
  const content = document.content || '';
  const contentLower = content.toLowerCase();

  // Find content matches
  let searchIndex = 0;
  while (searchIndex < contentLower.length) {
    const matchIndex = contentLower.indexOf(queryLower, searchIndex);
    if (matchIndex === -1) break;

    const contextStart = Math.max(0, matchIndex - 50);
    const contextEnd = Math.min(content.length, matchIndex + query.length + 50);

    matches.push({
      type: 'content',
      text: content.slice(matchIndex, matchIndex + query.length),
      context: content.slice(contextStart, contextEnd),
      position: matchIndex,
    });

    searchIndex = matchIndex + 1;
  }

  // Find insight matches
  for (const insight of document.semanticInsights) {
    if (insight.label.toLowerCase().includes(queryLower)) {
      matches.push({
        type: insight.type as 'theme' | 'entity' | 'keyphrase',
        text: insight.label,
        context: insight.context || insight.value || undefined,
      });
    }
  }

  return { matches };
}
