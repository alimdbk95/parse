import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { analyzeDocumentSemantics, getDocumentInsights } from '../services/semanticService.js';

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

export default router;
