import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TrackEventOptions {
  eventType: string;
  eventData?: Record<string, any>;
  userId?: string;
  workspaceId?: string;
  analysisId?: string;
  documentId?: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  path?: string;
  duration?: number;
}

export const analyticsService = {
  /**
   * Track a usage event
   */
  async trackEvent(options: TrackEventOptions): Promise<void> {
    try {
      await prisma.usageEvent.create({
        data: {
          eventType: options.eventType,
          eventData: options.eventData ? JSON.stringify(options.eventData) : null,
          userId: options.userId,
          workspaceId: options.workspaceId,
          analysisId: options.analysisId,
          documentId: options.documentId,
          sessionId: options.sessionId,
          userAgent: options.userAgent,
          ipAddress: options.ipAddress,
          referrer: options.referrer,
          path: options.path,
          duration: options.duration,
        },
      });
    } catch (error) {
      // Don't let analytics errors break the app
      console.error('Failed to track event:', error);
    }
  },

  /**
   * Get usage statistics for a date range
   */
  async getUsageStats(options: {
    startDate: Date;
    endDate: Date;
    workspaceId?: string;
    groupBy?: 'day' | 'week' | 'month';
  }) {
    const { startDate, endDate, workspaceId } = options;

    // Get event counts by type
    const eventCounts = await prisma.usageEvent.groupBy({
      by: ['eventType'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(workspaceId ? { workspaceId } : {}),
      },
      _count: true,
    });

    // Get unique users
    const uniqueUsers = await prisma.usageEvent.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        userId: { not: null },
        ...(workspaceId ? { workspaceId } : {}),
      },
      distinct: ['userId'],
      select: { userId: true },
    });

    // Get daily active users
    const dailyActiveUsers = await prisma.$queryRaw<{ date: Date; count: bigint }[]>`
      SELECT DATE(createdAt) as date, COUNT(DISTINCT userId) as count
      FROM "UsageEvent"
      WHERE createdAt >= ${startDate} AND createdAt <= ${endDate}
      ${workspaceId ? `AND workspaceId = ${workspaceId}` : ''}
      AND userId IS NOT NULL
      GROUP BY DATE(createdAt)
      ORDER BY date
    `;

    // Get top pages
    const topPages = await prisma.usageEvent.groupBy({
      by: ['path'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        eventType: 'page_view',
        path: { not: null },
        ...(workspaceId ? { workspaceId } : {}),
      },
      _count: true,
      orderBy: {
        _count: {
          path: 'desc',
        },
      },
      take: 10,
    });

    return {
      eventCounts: eventCounts.map((e) => ({
        eventType: e.eventType,
        count: e._count,
      })),
      uniqueUsers: uniqueUsers.length,
      dailyActiveUsers: dailyActiveUsers.map((d) => ({
        date: d.date,
        count: Number(d.count),
      })),
      topPages: topPages.map((p) => ({
        path: p.path,
        count: p._count,
      })),
    };
  },

  /**
   * Get overview metrics
   */
  async getOverviewMetrics(workspaceId?: string) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const whereClause = workspaceId ? { workspaceId } : {};

    // Total counts
    const [totalAnalyses, totalDocuments, totalCharts, totalUsers] = await Promise.all([
      prisma.analysis.count({ where: whereClause }),
      prisma.document.count({ where: whereClause }),
      prisma.chart.count({ where: whereClause }),
      workspaceId
        ? prisma.workspaceMember.count({ where: { workspaceId } })
        : prisma.user.count(),
    ]);

    // This month counts
    const [monthlyAnalyses, monthlyDocuments, monthlyMessages] = await Promise.all([
      prisma.analysis.count({
        where: {
          ...whereClause,
          createdAt: { gte: thisMonthStart },
        },
      }),
      prisma.document.count({
        where: {
          ...whereClause,
          createdAt: { gte: thisMonthStart },
        },
      }),
      prisma.message.count({
        where: {
          ...(workspaceId ? { analysis: { workspaceId } } : {}),
          createdAt: { gte: thisMonthStart },
        },
      }),
    ]);

    // Last month counts for comparison
    const [lastMonthAnalyses, lastMonthDocuments] = await Promise.all([
      prisma.analysis.count({
        where: {
          ...whereClause,
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
      }),
      prisma.document.count({
        where: {
          ...whereClause,
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
      }),
    ]);

    // Today's active users
    const todayActiveUsers = await prisma.usageEvent.findMany({
      where: {
        createdAt: { gte: today },
        userId: { not: null },
        ...(workspaceId ? { workspaceId } : {}),
      },
      distinct: ['userId'],
      select: { userId: true },
    });

    // Recent activity timeline
    const recentEvents = await prisma.usageEvent.findMany({
      where: {
        createdAt: { gte: thisWeekStart },
        eventType: {
          in: ['analysis_created', 'document_uploaded', 'chart_generated', 'message_sent'],
        },
        ...(workspaceId ? { workspaceId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        eventType: true,
        eventData: true,
        userId: true,
        createdAt: true,
      },
    });

    return {
      totals: {
        analyses: totalAnalyses,
        documents: totalDocuments,
        charts: totalCharts,
        users: totalUsers,
      },
      thisMonth: {
        analyses: monthlyAnalyses,
        documents: monthlyDocuments,
        messages: monthlyMessages,
        analysesChange: lastMonthAnalyses > 0
          ? Math.round(((monthlyAnalyses - lastMonthAnalyses) / lastMonthAnalyses) * 100)
          : 100,
        documentsChange: lastMonthDocuments > 0
          ? Math.round(((monthlyDocuments - lastMonthDocuments) / lastMonthDocuments) * 100)
          : 100,
      },
      todayActiveUsers: todayActiveUsers.length,
      recentActivity: recentEvents.map((e) => ({
        type: e.eventType,
        data: e.eventData ? JSON.parse(e.eventData) : null,
        userId: e.userId,
        timestamp: e.createdAt,
      })),
    };
  },
};
