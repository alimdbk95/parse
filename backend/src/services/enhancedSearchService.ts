import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Simple in-memory cache with TTL
interface CacheEntry {
  results: SearchResult[];
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface SearchResult {
  id: string;
  type: 'analysis' | 'document' | 'repository' | 'experiment' | 'chart' | 'template';
  title: string;
  subtitle?: string;
  icon: string;
  url: string;
  updatedAt?: string;
  score: number;
  matchType: 'exact' | 'partial' | 'fuzzy' | 'content';
  highlights?: string[];
}

export interface SearchOptions {
  types?: string[];
  limit?: number;
  offset?: number;
  dateFrom?: Date;
  dateTo?: Date;
  workspaceId?: string;
  includeContent?: boolean;
}

export interface SearchAnalytics {
  totalSearches: number;
  averageResultCount: number;
  topQueries: { query: string; count: number }[];
  clickThroughRate: number;
  averageSearchDuration: number;
  searchesByDay: { date: string; count: number }[];
  noResultsQueries: { query: string; count: number }[];
}

// Tokenize and normalize search query
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

// Calculate relevance score
function calculateScore(
  query: string,
  title: string,
  content?: string | null,
  description?: string | null
): { score: number; matchType: 'exact' | 'partial' | 'fuzzy' | 'content' } {
  const normalizedQuery = query.toLowerCase().trim();
  const normalizedTitle = title.toLowerCase();
  const normalizedContent = content?.toLowerCase() || '';
  const normalizedDescription = description?.toLowerCase() || '';

  // Exact title match
  if (normalizedTitle === normalizedQuery) {
    return { score: 100, matchType: 'exact' };
  }

  // Title starts with query
  if (normalizedTitle.startsWith(normalizedQuery)) {
    return { score: 90, matchType: 'exact' };
  }

  // Title contains query
  if (normalizedTitle.includes(normalizedQuery)) {
    return { score: 80, matchType: 'partial' };
  }

  // Word-level matching
  const queryTokens = tokenize(normalizedQuery);
  const titleTokens = tokenize(normalizedTitle);
  const matchedTokens = queryTokens.filter((qt) =>
    titleTokens.some((tt) => tt.includes(qt) || qt.includes(tt))
  );

  if (matchedTokens.length === queryTokens.length) {
    return { score: 70, matchType: 'partial' };
  }

  if (matchedTokens.length > 0) {
    const matchRatio = matchedTokens.length / queryTokens.length;
    return { score: 50 + matchRatio * 20, matchType: 'fuzzy' };
  }

  // Content/description match
  if (normalizedContent.includes(normalizedQuery) || normalizedDescription.includes(normalizedQuery)) {
    return { score: 40, matchType: 'content' };
  }

  // Fuzzy content matching
  const contentMatches = queryTokens.filter(
    (qt) => normalizedContent.includes(qt) || normalizedDescription.includes(qt)
  );
  if (contentMatches.length > 0) {
    const matchRatio = contentMatches.length / queryTokens.length;
    return { score: 20 + matchRatio * 20, matchType: 'content' };
  }

  return { score: 0, matchType: 'fuzzy' };
}

// Extract highlights from content
function extractHighlights(query: string, content: string, maxHighlights = 3): string[] {
  if (!content) return [];

  const normalizedQuery = query.toLowerCase();
  const tokens = tokenize(normalizedQuery);
  const highlights: string[] = [];
  const sentences = content.split(/[.!?]+/);

  for (const sentence of sentences) {
    if (highlights.length >= maxHighlights) break;

    const normalizedSentence = sentence.toLowerCase();
    const hasMatch = tokens.some((t) => normalizedSentence.includes(t));

    if (hasMatch) {
      const trimmed = sentence.trim();
      if (trimmed.length > 10 && trimmed.length < 200) {
        highlights.push(trimmed);
      } else if (trimmed.length >= 200) {
        highlights.push(trimmed.slice(0, 197) + '...');
      }
    }
  }

  return highlights;
}

// Generate cache key
function getCacheKey(userId: string, query: string, options: SearchOptions): string {
  return `${userId}:${query}:${JSON.stringify(options)}`;
}

// Main search function
export async function enhancedSearch(
  userId: string,
  query: string,
  options: SearchOptions = {}
): Promise<{ results: SearchResult[]; totalCount: number; fromCache: boolean; duration: number }> {
  const startTime = Date.now();
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery || normalizedQuery.length < 2) {
    return { results: [], totalCount: 0, fromCache: false, duration: 0 };
  }

  // Check cache
  const cacheKey = getCacheKey(userId, normalizedQuery, options);
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    const duration = Date.now() - startTime;
    // Track analytics for cached results too
    await trackSearch(userId, query, cached.results.length, duration, options.workspaceId);
    return { results: cached.results, totalCount: cached.results.length, fromCache: true, duration };
  }

  const { types, limit = 20, offset = 0, dateFrom, dateTo, workspaceId, includeContent = true } = options;

  // Get user's workspace IDs for access control
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    select: { workspaceId: true },
  });
  const workspaceIds = workspaceId
    ? [workspaceId]
    : memberships.map((m) => m.workspaceId);

  const allResults: SearchResult[] = [];

  // Search analyses
  if (!types || types.includes('analysis')) {
    const analyses = await prisma.analysis.findMany({
      where: {
        OR: [{ createdById: userId }, { workspaceId: { in: workspaceIds } }],
        ...(dateFrom && { createdAt: { gte: dateFrom } }),
        ...(dateTo && { createdAt: { lte: dateTo } }),
      },
      include: {
        messages: includeContent ? { take: 3, orderBy: { createdAt: 'desc' } } : false,
      },
      orderBy: { updatedAt: 'desc' },
    });

    for (const analysis of analyses) {
      const messageContent = includeContent
        ? (analysis.messages || []).map((m) => m.content).join(' ')
        : '';
      const { score, matchType } = calculateScore(normalizedQuery, analysis.title, messageContent, analysis.description);

      if (score > 0) {
        allResults.push({
          id: analysis.id,
          type: 'analysis',
          title: analysis.title,
          subtitle: analysis.description || (analysis.messages?.[0]?.content?.slice(0, 60) + '...') || 'No messages',
          icon: 'message-square',
          url: `/dashboard/chat/${analysis.id}`,
          updatedAt: analysis.updatedAt.toISOString(),
          score,
          matchType,
          highlights: includeContent ? extractHighlights(normalizedQuery, messageContent) : [],
        });
      }
    }
  }

  // Search documents
  if (!types || types.includes('document')) {
    const documents = await prisma.document.findMany({
      where: {
        OR: [{ uploadedById: userId }, { workspaceId: { in: workspaceIds } }],
        ...(dateFrom && { createdAt: { gte: dateFrom } }),
        ...(dateTo && { createdAt: { lte: dateTo } }),
      },
      orderBy: { updatedAt: 'desc' },
    });

    for (const doc of documents) {
      const { score, matchType } = calculateScore(normalizedQuery, doc.name, includeContent ? doc.content : null);

      if (score > 0) {
        allResults.push({
          id: doc.id,
          type: 'document',
          title: doc.name,
          subtitle: `${doc.type.toUpperCase()} - ${(doc.size / 1024).toFixed(1)} KB`,
          icon: 'file-text',
          url: `/dashboard/documents/${doc.id}`,
          updatedAt: doc.updatedAt.toISOString(),
          score,
          matchType,
          highlights: includeContent && doc.content ? extractHighlights(normalizedQuery, doc.content) : [],
        });
      }
    }
  }

  // Search repositories
  if (!types || types.includes('repository')) {
    const repositories = await prisma.repository.findMany({
      where: {
        ownerId: userId,
        ...(dateFrom && { createdAt: { gte: dateFrom } }),
        ...(dateTo && { createdAt: { lte: dateTo } }),
      },
      orderBy: { updatedAt: 'desc' },
    });

    for (const repo of repositories) {
      const { score, matchType } = calculateScore(normalizedQuery, repo.name, null, repo.description);

      if (score > 0) {
        allResults.push({
          id: repo.id,
          type: 'repository',
          title: repo.name,
          subtitle: repo.description || 'Repository',
          icon: 'folder',
          url: `/dashboard/repositories/${repo.id}`,
          updatedAt: repo.updatedAt.toISOString(),
          score,
          matchType,
        });
      }
    }
  }

  // Search experiments
  if (!types || types.includes('experiment')) {
    const experiments = await prisma.experiment.findMany({
      where: {
        createdById: userId,
        ...(dateFrom && { createdAt: { gte: dateFrom } }),
        ...(dateTo && { createdAt: { lte: dateTo } }),
      },
      orderBy: { updatedAt: 'desc' },
    });

    for (const exp of experiments) {
      const { score, matchType } = calculateScore(normalizedQuery, exp.name, exp.hypothesis, exp.description);

      if (score > 0) {
        allResults.push({
          id: exp.id,
          type: 'experiment',
          title: exp.name,
          subtitle: `${exp.type.replace('_', ' ')} - ${exp.status}`,
          icon: 'flask-conical',
          url: `/dashboard/experiments/${exp.id}`,
          updatedAt: exp.updatedAt.toISOString(),
          score,
          matchType,
          highlights: exp.hypothesis ? extractHighlights(normalizedQuery, exp.hypothesis) : [],
        });
      }
    }
  }

  // Search charts
  if (!types || types.includes('chart')) {
    const charts = await prisma.chart.findMany({
      where: {
        OR: [{ createdById: userId }, { workspaceId: { in: workspaceIds } }],
        ...(dateFrom && { createdAt: { gte: dateFrom } }),
        ...(dateTo && { createdAt: { lte: dateTo } }),
      },
      orderBy: { updatedAt: 'desc' },
    });

    for (const chart of charts) {
      const { score, matchType } = calculateScore(normalizedQuery, chart.title);

      if (score > 0) {
        allResults.push({
          id: chart.id,
          type: 'chart',
          title: chart.title,
          subtitle: `${chart.type} chart`,
          icon: 'bar-chart-3',
          url: chart.analysisId ? `/dashboard/chat/${chart.analysisId}?chart=${chart.id}` : `/dashboard/charts/${chart.id}`,
          updatedAt: chart.updatedAt.toISOString(),
          score,
          matchType,
        });
      }
    }
  }

  // Search templates
  if (!types || types.includes('template')) {
    const templates = await prisma.template.findMany({
      where: {
        OR: [{ createdById: userId }, { workspaceId: { in: workspaceIds } }, { isPublic: true }],
        ...(dateFrom && { createdAt: { gte: dateFrom } }),
        ...(dateTo && { createdAt: { lte: dateTo } }),
      },
      orderBy: { updatedAt: 'desc' },
    });

    for (const template of templates) {
      const { score, matchType } = calculateScore(normalizedQuery, template.name, null, template.description);

      if (score > 0) {
        allResults.push({
          id: template.id,
          type: 'template',
          title: template.name,
          subtitle: template.description || 'Template',
          icon: 'layout',
          url: `/dashboard/templates/${template.id}`,
          updatedAt: template.updatedAt.toISOString(),
          score,
          matchType,
        });
      }
    }
  }

  // Sort by score (descending), then by date
  allResults.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (!a.updatedAt || !b.updatedAt) return 0;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  // Apply pagination
  const paginatedResults = allResults.slice(offset, offset + limit);

  // Cache results
  searchCache.set(cacheKey, { results: paginatedResults, timestamp: Date.now() });

  const duration = Date.now() - startTime;

  // Track analytics
  await trackSearch(userId, query, allResults.length, duration, workspaceId);

  return {
    results: paginatedResults,
    totalCount: allResults.length,
    fromCache: false,
    duration,
  };
}

// Track search query for analytics
async function trackSearch(
  userId: string,
  query: string,
  resultCount: number,
  duration: number,
  workspaceId?: string
): Promise<void> {
  try {
    await prisma.searchQuery.create({
      data: {
        query,
        normalizedQuery: query.toLowerCase().trim(),
        resultCount,
        searchDuration: duration,
        userId,
        workspaceId,
      },
    });
  } catch (error) {
    console.error('Failed to track search:', error);
  }
}

// Record click on search result
export async function recordSearchClick(
  searchQueryId: string,
  resultId: string,
  resultType: string
): Promise<void> {
  try {
    await prisma.searchQuery.update({
      where: { id: searchQueryId },
      data: {
        clickedResult: resultId,
        clickedType: resultType,
      },
    });
  } catch (error) {
    console.error('Failed to record search click:', error);
  }
}

// Get search analytics
export async function getSearchAnalytics(
  userId: string,
  days = 30
): Promise<SearchAnalytics> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const searches = await prisma.searchQuery.findMany({
    where: {
      userId,
      createdAt: { gte: startDate },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalSearches = searches.length;

  // Average result count
  const averageResultCount =
    totalSearches > 0
      ? searches.reduce((sum, s) => sum + s.resultCount, 0) / totalSearches
      : 0;

  // Click-through rate
  const clickedSearches = searches.filter((s) => s.clickedResult).length;
  const clickThroughRate = totalSearches > 0 ? (clickedSearches / totalSearches) * 100 : 0;

  // Average search duration
  const validDurations = searches.filter((s) => s.searchDuration !== null);
  const averageSearchDuration =
    validDurations.length > 0
      ? validDurations.reduce((sum, s) => sum + (s.searchDuration || 0), 0) / validDurations.length
      : 0;

  // Top queries
  const queryCount = new Map<string, number>();
  for (const search of searches) {
    const count = queryCount.get(search.normalizedQuery) || 0;
    queryCount.set(search.normalizedQuery, count + 1);
  }
  const topQueries = Array.from(queryCount.entries())
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // No results queries
  const noResultsMap = new Map<string, number>();
  for (const search of searches) {
    if (search.resultCount === 0) {
      const count = noResultsMap.get(search.normalizedQuery) || 0;
      noResultsMap.set(search.normalizedQuery, count + 1);
    }
  }
  const noResultsQueries = Array.from(noResultsMap.entries())
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Searches by day
  const dayCount = new Map<string, number>();
  for (const search of searches) {
    const date = search.createdAt.toISOString().split('T')[0];
    const count = dayCount.get(date) || 0;
    dayCount.set(date, count + 1);
  }
  const searchesByDay = Array.from(dayCount.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalSearches,
    averageResultCount: Math.round(averageResultCount * 10) / 10,
    topQueries,
    clickThroughRate: Math.round(clickThroughRate * 10) / 10,
    averageSearchDuration: Math.round(averageSearchDuration),
    searchesByDay,
    noResultsQueries,
  };
}

// Clear search cache (for when data changes)
export function invalidateSearchCache(userId?: string): void {
  if (userId) {
    for (const key of searchCache.keys()) {
      if (key.startsWith(userId + ':')) {
        searchCache.delete(key);
      }
    }
  } else {
    searchCache.clear();
  }
}

// Get search suggestions based on history
export async function getSearchSuggestions(
  userId: string,
  query: string,
  limit = 5
): Promise<string[]> {
  if (query.length < 2) return [];

  const normalizedQuery = query.toLowerCase().trim();

  // Get recent similar queries
  const recentQueries = await prisma.searchQuery.findMany({
    where: {
      userId,
      normalizedQuery: { startsWith: normalizedQuery },
      resultCount: { gt: 0 },
    },
    distinct: ['normalizedQuery'],
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return recentQueries.map((q) => q.query);
}
