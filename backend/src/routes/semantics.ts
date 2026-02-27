import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { analyzeDocumentSemantics, getDocumentInsights } from '../services/semanticService.js';
import { semanticSearch, findSimilarDocuments, searchWithinDocument } from '../services/searchService.js';

const router = Router();

// Get semantic insights for a document
router.get('/documents/:documentId', authenticate, async (req: AuthRequest, res) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.documentId },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const insights = await getDocumentInsights(req.params.documentId);

    res.json({ insights, documentName: document.name });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

// Analyze document (trigger semantic analysis)
router.post('/documents/:documentId/analyze', authenticate, async (req: AuthRequest, res) => {
  try {
    const { analysisId } = req.body;

    const document = await prisma.document.findUnique({
      where: { id: req.params.documentId },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!document.content) {
      return res.status(400).json({ error: 'Document has no extractable content' });
    }

    const result = await analyzeDocumentSemantics(
      req.params.documentId,
      document.content,
      analysisId
    );

    if (!result) {
      return res.status(500).json({ error: 'Analysis failed' });
    }

    res.json({ insights: result, documentName: document.name });
  } catch (error) {
    console.error('Analyze document error:', error);
    res.status(500).json({ error: 'Failed to analyze document' });
  }
});

// Get insights for an analysis (aggregated from all documents)
router.get('/analyses/:analysisId', authenticate, async (req: AuthRequest, res) => {
  try {
    const analysis = await prisma.analysis.findUnique({
      where: { id: req.params.analysisId },
      include: {
        documents: {
          include: {
            document: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    // Get insights for all documents in the analysis
    const documentIds = analysis.documents.map((d) => d.documentId);

    const insights = await prisma.semanticInsight.findMany({
      where: {
        documentId: { in: documentIds },
      },
      orderBy: { confidence: 'desc' },
    });

    // Group by type and document
    const grouped = {
      themes: insights.filter((i) => i.type === 'theme'),
      entities: insights.filter((i) => i.type === 'entity'),
      keyphrases: insights.filter((i) => i.type === 'keyphrase'),
      sentiments: insights.filter((i) => i.type === 'sentiment'),
      summaries: insights.filter((i) => i.type === 'summary'),
    };

    // Aggregate common themes across documents
    const themeMap = new Map<string, { count: number; avgConfidence: number; contexts: string[] }>();
    grouped.themes.forEach((t) => {
      const existing = themeMap.get(t.label) || { count: 0, avgConfidence: 0, contexts: [] };
      existing.count += 1;
      existing.avgConfidence =
        (existing.avgConfidence * (existing.count - 1) + (t.confidence || 0)) / existing.count;
      if (t.context) existing.contexts.push(t.context);
      themeMap.set(t.label, existing);
    });

    const aggregatedThemes = Array.from(themeMap.entries())
      .map(([label, data]) => ({
        label,
        count: data.count,
        confidence: data.avgConfidence,
        contexts: data.contexts,
      }))
      .sort((a, b) => b.count - a.count || b.confidence - a.confidence);

    res.json({
      insights: grouped,
      aggregated: {
        themes: aggregatedThemes,
        documentCount: documentIds.length,
      },
      documents: analysis.documents.map((d) => d.document),
    });
  } catch (error) {
    console.error('Get analysis insights error:', error);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

// Get dashboard data (aggregated insights across workspace)
router.get('/dashboard', authenticate, async (req: AuthRequest, res) => {
  try {
    const { workspaceId } = req.query;

    // Get all documents in workspace (or all user's documents if no workspace)
    const documents = await prisma.document.findMany({
      where: workspaceId
        ? { workspaceId: workspaceId as string }
        : { uploadedById: req.user!.id },
      select: { id: true, name: true, createdAt: true },
    });

    const documentIds = documents.map((d) => d.id);

    if (documentIds.length === 0) {
      return res.json({
        sentiments: { positive: 0, negative: 0, neutral: 0, mixed: 0 },
        themes: [],
        entities: [],
        keyphrases: [],
        timeline: [],
        totalDocuments: 0,
        analyzedDocuments: 0,
      });
    }

    // Get all insights for these documents
    const insights = await prisma.semanticInsight.findMany({
      where: { documentId: { in: documentIds } },
      include: {
        document: { select: { id: true, name: true, createdAt: true } },
      },
    });

    // Aggregate sentiments
    const sentimentCounts = { positive: 0, negative: 0, neutral: 0, mixed: 0 };
    const sentimentInsights = insights.filter((i) => i.type === 'sentiment');
    sentimentInsights.forEach((s) => {
      const label = s.label.toLowerCase() as keyof typeof sentimentCounts;
      if (label in sentimentCounts) {
        sentimentCounts[label]++;
      }
    });

    // Aggregate themes
    const themeMap = new Map<string, { count: number; avgConfidence: number }>();
    insights
      .filter((i) => i.type === 'theme')
      .forEach((t) => {
        const existing = themeMap.get(t.label) || { count: 0, avgConfidence: 0 };
        existing.avgConfidence =
          (existing.avgConfidence * existing.count + (t.confidence || 0)) / (existing.count + 1);
        existing.count += 1;
        themeMap.set(t.label, existing);
      });

    const themes = Array.from(themeMap.entries())
      .map(([label, data]) => ({ label, count: data.count, confidence: data.avgConfidence }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Aggregate entities by type
    const entityTypeMap = new Map<string, { count: number; entities: Set<string> }>();
    insights
      .filter((i) => i.type === 'entity')
      .forEach((e) => {
        const entityType = e.value || 'other';
        const existing = entityTypeMap.get(entityType) || { count: 0, entities: new Set() };
        existing.count += 1;
        existing.entities.add(e.label);
        entityTypeMap.set(entityType, existing);
      });

    const entities = Array.from(entityTypeMap.entries())
      .map(([type, data]) => ({
        type,
        count: data.count,
        unique: data.entities.size,
        examples: Array.from(data.entities).slice(0, 5),
      }))
      .sort((a, b) => b.count - a.count);

    // Aggregate keyphrases
    const keyphraseMap = new Map<string, number>();
    insights
      .filter((i) => i.type === 'keyphrase')
      .forEach((k) => {
        const freq = parseInt(k.value || '1', 10) || 1;
        keyphraseMap.set(k.label, (keyphraseMap.get(k.label) || 0) + freq);
      });

    const keyphrases = Array.from(keyphraseMap.entries())
      .map(([label, frequency]) => ({ label, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 30);

    // Build timeline (group by date)
    const analyzedDocIds = new Set(insights.map((i) => i.documentId));
    const timelineMap = new Map<string, { date: string; analyzed: number; sentiments: typeof sentimentCounts }>();

    documents.forEach((doc) => {
      const dateStr = doc.createdAt.toISOString().split('T')[0];
      const existing = timelineMap.get(dateStr) || {
        date: dateStr,
        analyzed: 0,
        sentiments: { positive: 0, negative: 0, neutral: 0, mixed: 0 },
      };

      if (analyzedDocIds.has(doc.id)) {
        existing.analyzed += 1;
        // Find sentiment for this doc
        const docSentiment = sentimentInsights.find((s) => s.documentId === doc.id);
        if (docSentiment) {
          const label = docSentiment.label.toLowerCase() as keyof typeof sentimentCounts;
          if (label in existing.sentiments) {
            existing.sentiments[label]++;
          }
        }
      }

      timelineMap.set(dateStr, existing);
    });

    const timeline = Array.from(timelineMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    res.json({
      sentiments: sentimentCounts,
      themes,
      entities,
      keyphrases,
      timeline,
      totalDocuments: documents.length,
      analyzedDocuments: analyzedDocIds.size,
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Analyze all documents in an analysis
router.post('/analyses/:analysisId/analyze', authenticate, async (req: AuthRequest, res) => {
  try {
    const analysis = await prisma.analysis.findUnique({
      where: { id: req.params.analysisId },
      include: {
        documents: {
          include: {
            document: true,
          },
        },
      },
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    const results = [];
    for (const { document } of analysis.documents) {
      if (document.content) {
        const result = await analyzeDocumentSemantics(
          document.id,
          document.content,
          req.params.analysisId
        );
        results.push({ documentId: document.id, documentName: document.name, result });
      }
    }

    res.json({ results, documentsAnalyzed: results.length });
  } catch (error) {
    console.error('Analyze all documents error:', error);
    res.status(500).json({ error: 'Failed to analyze documents' });
  }
});

// Semantic search endpoint
router.get('/search', authenticate, async (req: AuthRequest, res) => {
  try {
    const { q, workspaceId, limit, includeUnanalyzed } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const results = await semanticSearch(q, {
      workspaceId: workspaceId as string | undefined,
      userId: req.user!.id,
      limit: limit ? parseInt(limit as string, 10) : 20,
      includeUnanalyzed: includeUnanalyzed === 'true',
    });

    res.json(results);
  } catch (error) {
    console.error('Semantic search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Find similar documents
router.get('/documents/:documentId/similar', authenticate, async (req: AuthRequest, res) => {
  try {
    const { workspaceId, limit } = req.query;

    const results = await findSimilarDocuments(req.params.documentId, {
      workspaceId: workspaceId as string | undefined,
      userId: req.user!.id,
      limit: limit ? parseInt(limit as string, 10) : 5,
    });

    res.json({ similar: results });
  } catch (error) {
    console.error('Find similar error:', error);
    res.status(500).json({ error: 'Failed to find similar documents' });
  }
});

// Search within a specific document
router.get('/documents/:documentId/search', authenticate, async (req: AuthRequest, res) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const document = await prisma.document.findUnique({
      where: { id: req.params.documentId },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const results = await searchWithinDocument(req.params.documentId, q);

    res.json({ ...results, documentName: document.name });
  } catch (error) {
    console.error('Search within document error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
