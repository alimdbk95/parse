import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import {
  enhancedSearch,
  recordSearchClick,
  getSearchAnalytics,
  getSearchSuggestions,
  SearchOptions,
} from '../services/enhancedSearchService.js';

const router = express.Router();

// Enhanced global search
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { q, types, limit, offset, dateFrom, dateTo, workspaceId, includeContent } = req.query;
    const query = (q as string) || '';

    if (!query || query.length < 2) {
      return res.json({ results: [], totalCount: 0, fromCache: false, duration: 0 });
    }

    const userId = req.user!.id;

    const options: SearchOptions = {
      types: types ? (types as string).split(',') : undefined,
      limit: limit ? parseInt(limit as string, 10) : 20,
      offset: offset ? parseInt(offset as string, 10) : 0,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      workspaceId: workspaceId as string | undefined,
      includeContent: includeContent !== 'false',
    };

    const result = await enhancedSearch(userId, query, options);

    res.json(result);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Record search result click
router.post('/click', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { searchQueryId, resultId, resultType } = req.body;

    if (!searchQueryId || !resultId || !resultType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await recordSearchClick(searchQueryId, resultId, resultType);

    res.json({ success: true });
  } catch (error) {
    console.error('Record click error:', error);
    res.status(500).json({ error: 'Failed to record click' });
  }
});

// Get search suggestions (autocomplete)
router.get('/suggestions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { q, limit } = req.query;
    const query = (q as string) || '';
    const userId = req.user!.id;

    const suggestions = await getSearchSuggestions(
      userId,
      query,
      limit ? parseInt(limit as string, 10) : 5
    );

    res.json({ suggestions });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// Get search analytics
router.get('/analytics', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { days } = req.query;
    const userId = req.user!.id;

    const analytics = await getSearchAnalytics(
      userId,
      days ? parseInt(days as string, 10) : 30
    );

    res.json({ analytics });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

export default router;
