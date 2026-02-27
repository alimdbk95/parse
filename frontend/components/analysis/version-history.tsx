'use client';

import { useState, useEffect } from 'react';
import {
  History,
  Clock,
  MessageSquare,
  FileText,
  BarChart3,
  Edit2,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  GitCompare,
  X,
  Check,
  Plus,
  Minus,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Modal, ConfirmModal } from '@/components/ui/modal';
import { api } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';

interface Version {
  id: string;
  version: number;
  title: string;
  changeType: string;
  changeSummary: string;
  createdAt: string;
  createdBy: { id: string; name: string; avatar?: string };
}

interface VersionHistoryProps {
  analysisId: string;
  isOpen: boolean;
  onClose: () => void;
  onVersionRestored?: () => void;
}

const CHANGE_TYPE_ICONS: Record<string, any> = {
  created: Plus,
  message_added: MessageSquare,
  message_edited: Edit2,
  message_deleted: Minus,
  chart_added: BarChart3,
  chart_updated: BarChart3,
  chart_deleted: Minus,
  document_added: FileText,
  document_removed: Minus,
  title_changed: Edit2,
  description_changed: Edit2,
  restored: RotateCcw,
};

const CHANGE_TYPE_COLORS: Record<string, string> = {
  created: 'text-green-500 bg-green-500/10',
  message_added: 'text-blue-500 bg-blue-500/10',
  message_edited: 'text-amber-500 bg-amber-500/10',
  message_deleted: 'text-red-500 bg-red-500/10',
  chart_added: 'text-purple-500 bg-purple-500/10',
  chart_updated: 'text-purple-500 bg-purple-500/10',
  chart_deleted: 'text-red-500 bg-red-500/10',
  document_added: 'text-cyan-500 bg-cyan-500/10',
  document_removed: 'text-red-500 bg-red-500/10',
  title_changed: 'text-amber-500 bg-amber-500/10',
  description_changed: 'text-amber-500 bg-amber-500/10',
  restored: 'text-green-500 bg-green-500/10',
};

export function VersionHistory({ analysisId, isOpen, onClose, onVersionRestored }: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [versionDetails, setVersionDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [comparison, setComparison] = useState<any>(null);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchVersions();
    }
  }, [isOpen, analysisId]);

  const fetchVersions = async (offset = 0) => {
    try {
      setLoading(true);
      const data = await api.getVersionHistory(analysisId, { limit: 20, offset });
      if (offset === 0) {
        setVersions(data.versions);
      } else {
        setVersions((prev) => [...prev, ...data.versions]);
      }
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Failed to fetch version history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVersionDetails = async (versionId: string) => {
    try {
      setLoadingDetails(true);
      const data = await api.getVersion(versionId);
      setVersionDetails(data.version);
    } catch (error) {
      console.error('Failed to fetch version details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleToggleExpand = async (versionId: string) => {
    if (expandedVersion === versionId) {
      setExpandedVersion(null);
      setVersionDetails(null);
    } else {
      setExpandedVersion(versionId);
      await fetchVersionDetails(versionId);
    }
  };

  const handleToggleSelect = (versionId: string) => {
    setSelectedVersions((prev) => {
      if (prev.includes(versionId)) {
        return prev.filter((id) => id !== versionId);
      }
      if (prev.length >= 2) {
        return [prev[1], versionId];
      }
      return [...prev, versionId];
    });
  };

  const handleCompare = async () => {
    if (selectedVersions.length !== 2) return;

    try {
      setLoadingCompare(true);
      setShowCompare(true);
      const data = await api.compareVersions(selectedVersions[0], selectedVersions[1]);
      setComparison(data);
    } catch (error) {
      console.error('Failed to compare versions:', error);
    } finally {
      setLoadingCompare(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    try {
      setRestoring(true);
      await api.restoreVersion(analysisId, versionId);
      setShowRestoreConfirm(null);
      await fetchVersions();
      onVersionRestored?.();
    } catch (error) {
      console.error('Failed to restore version:', error);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Version History" size="xl">
      <div className="space-y-4">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-foreground-secondary">
            {total} version{total !== 1 ? 's' : ''} recorded
          </p>
          <div className="flex items-center gap-2">
            {selectedVersions.length === 2 && (
              <Button size="sm" onClick={handleCompare}>
                <GitCompare className="h-4 w-4 mr-1" />
                Compare Selected
              </Button>
            )}
            {selectedVersions.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedVersions([])}>
                Clear Selection
              </Button>
            )}
          </div>
        </div>

        {/* Version List */}
        {loading && versions.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-12">
            <History className="h-12 w-12 mx-auto text-foreground-tertiary mb-4" />
            <p className="text-foreground-secondary">No version history available yet</p>
            <p className="text-sm text-foreground-tertiary mt-1">
              Versions are created automatically as you work on your analysis
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {versions.map((version, index) => {
              const Icon = CHANGE_TYPE_ICONS[version.changeType] || Clock;
              const colorClass = CHANGE_TYPE_COLORS[version.changeType] || 'text-foreground-tertiary bg-background-tertiary';
              const isSelected = selectedVersions.includes(version.id);
              const isExpanded = expandedVersion === version.id;

              return (
                <div key={version.id} className="relative">
                  {/* Timeline connector */}
                  {index < versions.length - 1 && (
                    <div className="absolute left-[23px] top-10 bottom-0 w-0.5 bg-border" />
                  )}

                  <Card
                    className={cn(
                      'transition-all',
                      isSelected && 'border-primary',
                      isExpanded && 'border-primary/50'
                    )}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <button
                          onClick={() => handleToggleSelect(version.id)}
                          className={cn(
                            'h-5 w-5 rounded border flex items-center justify-center shrink-0 mt-0.5',
                            isSelected
                              ? 'bg-primary border-primary'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </button>

                        {/* Icon */}
                        <div
                          className={cn(
                            'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                            colorClass
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">v{version.version}</span>
                              <span className="text-foreground-secondary mx-2">•</span>
                              <span className="text-sm text-foreground-secondary">
                                {version.changeSummary}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowRestoreConfirm(version.id)}
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Restore
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleExpand(version.id)}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-xs text-foreground-tertiary">
                            <User className="h-3 w-3" />
                            <span>{version.createdBy.name}</span>
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            <span>{formatDate(version.createdAt)}</span>
                          </div>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-border">
                              {loadingDetails ? (
                                <div className="flex items-center justify-center py-4">
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                </div>
                              ) : versionDetails ? (
                                <div className="space-y-3">
                                  <div>
                                    <h4 className="text-xs font-medium text-foreground-tertiary mb-1">
                                      TITLE
                                    </h4>
                                    <p className="text-sm">{versionDetails.snapshot.title}</p>
                                  </div>

                                  {versionDetails.snapshot.description && (
                                    <div>
                                      <h4 className="text-xs font-medium text-foreground-tertiary mb-1">
                                        DESCRIPTION
                                      </h4>
                                      <p className="text-sm text-foreground-secondary">
                                        {versionDetails.snapshot.description}
                                      </p>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-3 gap-4">
                                    <div>
                                      <h4 className="text-xs font-medium text-foreground-tertiary mb-1">
                                        MESSAGES
                                      </h4>
                                      <p className="text-lg font-bold">
                                        {versionDetails.snapshot.messages.length}
                                      </p>
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-medium text-foreground-tertiary mb-1">
                                        DOCUMENTS
                                      </h4>
                                      <p className="text-lg font-bold">
                                        {versionDetails.snapshot.documents.length}
                                      </p>
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-medium text-foreground-tertiary mb-1">
                                        CHARTS
                                      </h4>
                                      <p className="text-lg font-bold">
                                        {versionDetails.snapshot.charts.length}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}

            {hasMore && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => fetchVersions(versions.length)}
                disabled={loading}
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ChevronDown className="h-4 w-4 mr-2" />
                )}
                Load More
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Compare Modal */}
      <Modal
        isOpen={showCompare}
        onClose={() => {
          setShowCompare(false);
          setComparison(null);
        }}
        title="Compare Versions"
        size="lg"
      >
        {loadingCompare ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : comparison ? (
          <div className="space-y-4">
            {/* Version Headers */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-background-secondary">
                <p className="text-sm font-medium">Version {comparison.version1.version}</p>
                <p className="text-xs text-foreground-tertiary">
                  {formatDate(comparison.version1.createdAt)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-background-secondary">
                <p className="text-sm font-medium">Version {comparison.version2.version}</p>
                <p className="text-xs text-foreground-tertiary">
                  {formatDate(comparison.version2.createdAt)}
                </p>
              </div>
            </div>

            {/* Summary */}
            <div className="flex items-center gap-4 p-3 rounded-lg bg-background-tertiary">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm">{comparison.summary.added} added</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-sm">{comparison.summary.removed} removed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-sm">{comparison.summary.modified} modified</span>
              </div>
            </div>

            {/* Changes */}
            {comparison.changes.length === 0 ? (
              <p className="text-center text-foreground-secondary py-8">
                No differences found between these versions
              </p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {comparison.changes.map((change: any, index: number) => (
                  <div
                    key={index}
                    className={cn(
                      'p-3 rounded-lg border-l-2',
                      change.type === 'added'
                        ? 'bg-green-500/5 border-green-500'
                        : change.type === 'removed'
                        ? 'bg-red-500/5 border-red-500'
                        : 'bg-amber-500/5 border-amber-500'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={cn(
                          'text-xs px-1.5 py-0.5 rounded capitalize',
                          change.type === 'added'
                            ? 'bg-green-500/20 text-green-500'
                            : change.type === 'removed'
                            ? 'bg-red-500/20 text-red-500'
                            : 'bg-amber-500/20 text-amber-500'
                        )}
                      >
                        {change.type}
                      </span>
                      <span className="text-xs text-foreground-tertiary capitalize">
                        {change.category}
                      </span>
                    </div>
                    <p className="text-sm">{change.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* Restore Confirmation */}
      <ConfirmModal
        isOpen={!!showRestoreConfirm}
        onClose={() => setShowRestoreConfirm(null)}
        onConfirm={() => showRestoreConfirm && handleRestore(showRestoreConfirm)}
        title="Restore Version"
        description="This will restore the analysis title and description to this version. Messages and documents will not be affected. A new version will be created to preserve the current state."
        confirmText="Restore"
        loading={restoring}
      />
    </Modal>
  );
}
