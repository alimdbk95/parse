import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import {
  extractHighlights,
  getDocumentHighlights,
  addUserHighlight,
  updateHighlight,
  deleteHighlight,
  getHighlightStats,
} from '../services/highlightService.js';

const router = Router();

// Get highlights for a document
router.get('/documents/:documentId', authenticate, async (req: AuthRequest, res) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.documentId },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const highlights = await getDocumentHighlights(req.params.documentId);
    const stats = await getHighlightStats(req.params.documentId);

    res.json({ highlights, stats, documentName: document.name });
  } catch (error) {
    console.error('Get highlights error:', error);
    res.status(500).json({ error: 'Failed to fetch highlights' });
  }
});

// Extract highlights from a document (trigger AI analysis)
router.post('/documents/:documentId/extract', authenticate, async (req: AuthRequest, res) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.documentId },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!document.content) {
      return res.status(400).json({ error: 'Document has no extractable content' });
    }

    const result = await extractHighlights(
      req.params.documentId,
      document.content,
      req.user!.id
    );

    res.json({
      highlights: result.highlights,
      summary: result.summary,
      documentName: document.name,
    });
  } catch (error) {
    console.error('Extract highlights error:', error);
    res.status(500).json({ error: 'Failed to extract highlights' });
  }
});

// Add a user highlight
router.post('/documents/:documentId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { text, startOffset, endOffset, type, importance, category, explanation } = req.body;

    if (!text || startOffset === undefined || endOffset === undefined) {
      return res.status(400).json({ error: 'text, startOffset, and endOffset are required' });
    }

    const document = await prisma.document.findUnique({
      where: { id: req.params.documentId },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const highlight = await addUserHighlight(req.params.documentId, req.user!.id, {
      text,
      startOffset,
      endOffset,
      type,
      importance,
      category,
      explanation,
    });

    res.json({ highlight });
  } catch (error) {
    console.error('Add highlight error:', error);
    res.status(500).json({ error: 'Failed to add highlight' });
  }
});

// Update a highlight
router.patch('/:highlightId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { type, importance, category, explanation } = req.body;

    const highlight = await updateHighlight(req.params.highlightId, req.user!.id, {
      type,
      importance,
      category,
      explanation,
    });

    res.json({ highlight });
  } catch (error: any) {
    console.error('Update highlight error:', error);
    if (error.message === 'Highlight not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'Not authorized to edit this highlight') {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update highlight' });
  }
});

// Delete a highlight
router.delete('/:highlightId', authenticate, async (req: AuthRequest, res) => {
  try {
    await deleteHighlight(req.params.highlightId, req.user!.id);
    res.json({ message: 'Highlight deleted' });
  } catch (error: any) {
    console.error('Delete highlight error:', error);
    if (error.message === 'Highlight not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'Not authorized to delete this highlight') {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete highlight' });
  }
});

// Get highlight stats for a document
router.get('/documents/:documentId/stats', authenticate, async (req: AuthRequest, res) => {
  try {
    const stats = await getHighlightStats(req.params.documentId);
    res.json(stats);
  } catch (error) {
    console.error('Get highlight stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
