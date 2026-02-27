import { prisma } from '../index.js';

export type ChangeType =
  | 'created'
  | 'message_added'
  | 'message_edited'
  | 'message_deleted'
  | 'chart_added'
  | 'chart_updated'
  | 'chart_deleted'
  | 'document_added'
  | 'document_removed'
  | 'title_changed'
  | 'description_changed'
  | 'restored';

interface AnalysisSnapshot {
  title: string;
  description: string | null;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    metadata: string | null;
    createdAt: string;
  }>;
  documents: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  charts: Array<{
    id: string;
    title: string;
    type: string;
    data: string;
    config: string;
  }>;
}

/**
 * Create a snapshot of the current analysis state
 */
async function createSnapshot(analysisId: string): Promise<AnalysisSnapshot> {
  const analysis = await prisma.analysis.findUnique({
    where: { id: analysisId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          role: true,
          content: true,
          metadata: true,
          createdAt: true,
        },
      },
      documents: {
        include: {
          document: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      },
      charts: {
        select: {
          id: true,
          title: true,
          type: true,
          data: true,
          config: true,
        },
      },
    },
  });

  if (!analysis) {
    throw new Error('Analysis not found');
  }

  return {
    title: analysis.title,
    description: analysis.description,
    messages: analysis.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      metadata: m.metadata,
      createdAt: m.createdAt.toISOString(),
    })),
    documents: analysis.documents.map((d) => ({
      id: d.document.id,
      name: d.document.name,
      type: d.document.type,
    })),
    charts: analysis.charts.map((c) => ({
      id: c.id,
      title: c.title,
      type: c.type,
      data: c.data,
      config: c.config,
    })),
  };
}

/**
 * Get the next version number for an analysis
 */
async function getNextVersionNumber(analysisId: string): Promise<number> {
  const lastVersion = await prisma.analysisVersion.findFirst({
    where: { analysisId },
    orderBy: { version: 'desc' },
    select: { version: true },
  });

  return (lastVersion?.version || 0) + 1;
}

/**
 * Generate a human-readable change summary
 */
function generateChangeSummary(changeType: ChangeType, details?: string): string {
  const summaries: Record<ChangeType, string> = {
    created: 'Analysis created',
    message_added: 'New message added',
    message_edited: 'Message edited',
    message_deleted: 'Message deleted',
    chart_added: 'Chart created',
    chart_updated: 'Chart updated',
    chart_deleted: 'Chart deleted',
    document_added: 'Document added to analysis',
    document_removed: 'Document removed from analysis',
    title_changed: 'Title updated',
    description_changed: 'Description updated',
    restored: 'Restored from previous version',
  };

  let summary = summaries[changeType] || 'Changes made';
  if (details) {
    summary += `: ${details}`;
  }

  return summary;
}

/**
 * Create a new version entry for an analysis
 */
export async function createVersion(
  analysisId: string,
  userId: string,
  changeType: ChangeType,
  details?: string
): Promise<void> {
  try {
    const snapshot = await createSnapshot(analysisId);
    const version = await getNextVersionNumber(analysisId);
    const changeSummary = generateChangeSummary(changeType, details);

    await prisma.analysisVersion.create({
      data: {
        analysisId,
        createdById: userId,
        version,
        title: snapshot.title,
        description: snapshot.description,
        snapshot: JSON.stringify(snapshot),
        changeType,
        changeSummary,
      },
    });
  } catch (error) {
    console.error('Failed to create version:', error);
    // Don't throw - version creation should not block the main operation
  }
}

/**
 * Get version history for an analysis
 */
export async function getVersionHistory(
  analysisId: string,
  options?: { limit?: number; offset?: number }
) {
  const { limit = 50, offset = 0 } = options || {};

  const [versions, total] = await Promise.all([
    prisma.analysisVersion.findMany({
      where: { analysisId },
      orderBy: { version: 'desc' },
      take: limit,
      skip: offset,
      include: {
        createdBy: {
          select: { id: true, name: true, avatar: true },
        },
      },
    }),
    prisma.analysisVersion.count({ where: { analysisId } }),
  ]);

  return {
    versions: versions.map((v) => ({
      id: v.id,
      version: v.version,
      title: v.title,
      changeType: v.changeType,
      changeSummary: v.changeSummary,
      createdAt: v.createdAt,
      createdBy: v.createdBy,
    })),
    total,
    hasMore: offset + versions.length < total,
  };
}

/**
 * Get a specific version with full snapshot
 */
export async function getVersion(versionId: string) {
  const version = await prisma.analysisVersion.findUnique({
    where: { id: versionId },
    include: {
      createdBy: {
        select: { id: true, name: true, avatar: true },
      },
    },
  });

  if (!version) {
    throw new Error('Version not found');
  }

  return {
    ...version,
    snapshot: JSON.parse(version.snapshot) as AnalysisSnapshot,
  };
}

/**
 * Compare two versions
 */
export async function compareVersions(versionId1: string, versionId2: string) {
  const [v1, v2] = await Promise.all([getVersion(versionId1), getVersion(versionId2)]);

  const changes: Array<{
    type: 'added' | 'removed' | 'modified';
    category: 'message' | 'document' | 'chart' | 'metadata';
    description: string;
    before?: any;
    after?: any;
  }> = [];

  // Compare messages
  const v1MessageIds = new Set(v1.snapshot.messages.map((m) => m.id));
  const v2MessageIds = new Set(v2.snapshot.messages.map((m) => m.id));

  for (const msg of v2.snapshot.messages) {
    if (!v1MessageIds.has(msg.id)) {
      changes.push({
        type: 'added',
        category: 'message',
        description: `Message added: "${msg.content.slice(0, 50)}..."`,
        after: msg,
      });
    }
  }

  for (const msg of v1.snapshot.messages) {
    if (!v2MessageIds.has(msg.id)) {
      changes.push({
        type: 'removed',
        category: 'message',
        description: `Message removed: "${msg.content.slice(0, 50)}..."`,
        before: msg,
      });
    } else {
      const v2Msg = v2.snapshot.messages.find((m) => m.id === msg.id);
      if (v2Msg && v2Msg.content !== msg.content) {
        changes.push({
          type: 'modified',
          category: 'message',
          description: 'Message content changed',
          before: msg,
          after: v2Msg,
        });
      }
    }
  }

  // Compare documents
  const v1DocIds = new Set(v1.snapshot.documents.map((d) => d.id));
  const v2DocIds = new Set(v2.snapshot.documents.map((d) => d.id));

  for (const doc of v2.snapshot.documents) {
    if (!v1DocIds.has(doc.id)) {
      changes.push({
        type: 'added',
        category: 'document',
        description: `Document added: ${doc.name}`,
        after: doc,
      });
    }
  }

  for (const doc of v1.snapshot.documents) {
    if (!v2DocIds.has(doc.id)) {
      changes.push({
        type: 'removed',
        category: 'document',
        description: `Document removed: ${doc.name}`,
        before: doc,
      });
    }
  }

  // Compare charts
  const v1ChartIds = new Set(v1.snapshot.charts.map((c) => c.id));
  const v2ChartIds = new Set(v2.snapshot.charts.map((c) => c.id));

  for (const chart of v2.snapshot.charts) {
    if (!v1ChartIds.has(chart.id)) {
      changes.push({
        type: 'added',
        category: 'chart',
        description: `Chart added: ${chart.title}`,
        after: chart,
      });
    }
  }

  for (const chart of v1.snapshot.charts) {
    if (!v2ChartIds.has(chart.id)) {
      changes.push({
        type: 'removed',
        category: 'chart',
        description: `Chart removed: ${chart.title}`,
        before: chart,
      });
    }
  }

  // Compare metadata
  if (v1.snapshot.title !== v2.snapshot.title) {
    changes.push({
      type: 'modified',
      category: 'metadata',
      description: 'Title changed',
      before: v1.snapshot.title,
      after: v2.snapshot.title,
    });
  }

  if (v1.snapshot.description !== v2.snapshot.description) {
    changes.push({
      type: 'modified',
      category: 'metadata',
      description: 'Description changed',
      before: v1.snapshot.description,
      after: v2.snapshot.description,
    });
  }

  return {
    version1: {
      id: v1.id,
      version: v1.version,
      createdAt: v1.createdAt,
      createdBy: v1.createdBy,
    },
    version2: {
      id: v2.id,
      version: v2.version,
      createdAt: v2.createdAt,
      createdBy: v2.createdBy,
    },
    changes,
    summary: {
      added: changes.filter((c) => c.type === 'added').length,
      removed: changes.filter((c) => c.type === 'removed').length,
      modified: changes.filter((c) => c.type === 'modified').length,
    },
  };
}

/**
 * Restore an analysis to a previous version
 */
export async function restoreVersion(
  analysisId: string,
  versionId: string,
  userId: string
): Promise<void> {
  const version = await getVersion(versionId);

  if (version.analysisId !== analysisId) {
    throw new Error('Version does not belong to this analysis');
  }

  const snapshot = version.snapshot;

  // Create a new version before restoring (to preserve current state)
  await createVersion(analysisId, userId, 'restored', `Restored to version ${version.version}`);

  // Update analysis metadata
  await prisma.analysis.update({
    where: { id: analysisId },
    data: {
      title: snapshot.title,
      description: snapshot.description,
    },
  });

  // Note: We don't restore messages/charts/documents as that could cause data loss
  // and complex conflicts. Instead, the snapshot serves as a reference.
  // Users can manually copy content from the version comparison view.
}

/**
 * Get version statistics for an analysis
 */
export async function getVersionStats(analysisId: string) {
  const versions = await prisma.analysisVersion.findMany({
    where: { analysisId },
    select: {
      changeType: true,
      createdAt: true,
    },
  });

  const byChangeType: Record<string, number> = {};
  const byDate: Record<string, number> = {};

  for (const v of versions) {
    byChangeType[v.changeType] = (byChangeType[v.changeType] || 0) + 1;

    const dateKey = v.createdAt.toISOString().split('T')[0];
    byDate[dateKey] = (byDate[dateKey] || 0) + 1;
  }

  return {
    totalVersions: versions.length,
    byChangeType,
    byDate,
    firstVersion: versions.length > 0 ? versions[versions.length - 1].createdAt : null,
    latestVersion: versions.length > 0 ? versions[0].createdAt : null,
  };
}
