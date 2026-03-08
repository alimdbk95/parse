import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { analyticsService } from '../services/analyticsService.js';
import { prisma } from '../index.js';

const router = Router();

// Track an event (can be called from frontend)
router.post('/track', async (req, res) => {
  try {
    const {
      eventType,
      eventData,
      sessionId,
      path,
      duration,
    } = req.body;

    // Get user info from token if available
    let userId: string | undefined;
    let workspaceId: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const jwt = await import('jsonwebtoken');
        const token = authHeader.split(' ')[1];
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET!) as { userId: string };
        userId = decoded.userId;
      } catch {
        // Token invalid or expired, continue without userId
      }
    }

    await analyticsService.trackEvent({
      eventType,
      eventData,
      userId,
      workspaceId: req.body.workspaceId,
      analysisId: req.body.analysisId,
      documentId: req.body.documentId,
      sessionId,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.headers['x-forwarded-for'] as string,
      referrer: req.headers.referer,
      path,
      duration,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Track event error:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// Get analytics overview (requires authentication)
router.get('/overview', authenticate, async (req: AuthRequest, res) => {
  try {
    const { workspaceId } = req.query;

    // Verify user has access to workspace if specified
    if (workspaceId && typeof workspaceId === 'string') {
      const member = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId,
          userId: req.user!.id,
          role: { in: ['admin', 'editor'] },
        },
      });

      if (!member) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const metrics = await analyticsService.getOverviewMetrics(
      workspaceId as string | undefined
    );

    res.json(metrics);
  } catch (error) {
    console.error('Get analytics overview error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Get detailed usage stats (requires authentication)
router.get('/usage', authenticate, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, workspaceId, groupBy } = req.query;

    // Parse dates
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Verify user has access to workspace if specified
    if (workspaceId && typeof workspaceId === 'string') {
      const member = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId,
          userId: req.user!.id,
          role: { in: ['admin', 'editor'] },
        },
      });

      if (!member) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const stats = await analyticsService.getUsageStats({
      startDate: start,
      endDate: end,
      workspaceId: workspaceId as string | undefined,
      groupBy: (groupBy as 'day' | 'week' | 'month') || 'day',
    });

    res.json(stats);
  } catch (error) {
    console.error('Get usage stats error:', error);
    res.status(500).json({ error: 'Failed to get usage stats' });
  }
});

// Get feature usage breakdown
router.get('/features', authenticate, async (req: AuthRequest, res) => {
  try {
    const { workspaceId } = req.query;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const featureUsage = await prisma.usageEvent.groupBy({
      by: ['eventType'],
      where: {
        createdAt: { gte: thirtyDaysAgo },
        eventType: {
          in: [
            'analysis_created',
            'document_uploaded',
            'chart_generated',
            'message_sent',
            'comparison_created',
            'template_used',
            'export_pdf',
            'share_analysis',
          ],
        },
        ...(workspaceId && typeof workspaceId === 'string' ? { workspaceId } : {}),
      },
      _count: true,
      orderBy: {
        _count: {
          eventType: 'desc',
        },
      },
    });

    res.json({
      features: featureUsage.map((f) => ({
        feature: f.eventType,
        count: f._count,
      })),
    });
  } catch (error) {
    console.error('Get feature usage error:', error);
    res.status(500).json({ error: 'Failed to get feature usage' });
  }
});

export default router;
