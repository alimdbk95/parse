'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Beaker,
  GitBranch,
  Grid3X3,
  Settings2,
  Play,
  Pause,
  CheckCircle,
  Clock,
  BarChart3,
  Target,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';

type ExperimentType = 'ab_test' | 'full_factorial' | 'parameter_matrix' | 'custom';
type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed';

interface Experiment {
  id: string;
  name: string;
  description?: string;
  hypothesis?: string;
  type: ExperimentType;
  status: ExperimentStatus;
  confidenceLevel: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string; avatar?: string };
  _count: { factors: number; variations: number; runs: number; results: number; metrics: number };
}

const EXPERIMENT_TYPES = [
  {
    type: 'ab_test' as ExperimentType,
    label: 'A/B Test',
    description: 'Compare two or more variations',
    icon: GitBranch,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  {
    type: 'full_factorial' as ExperimentType,
    label: 'Full Factorial',
    description: 'Test all factor combinations (2^k)',
    icon: Grid3X3,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
  {
    type: 'parameter_matrix' as ExperimentType,
    label: 'Parameter Matrix',
    description: 'Define parameter ranges',
    icon: Settings2,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
  },
  {
    type: 'custom' as ExperimentType,
    label: 'Custom',
    description: 'Design your own experiment',
    icon: Beaker,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
  },
];

const STATUS_CONFIG: Record<ExperimentStatus, { label: string; icon: any; color: string; bgColor: string }> = {
  draft: { label: 'Draft', icon: Clock, color: 'text-gray-400', bgColor: 'bg-gray-500/10' },
  running: { label: 'Running', icon: Play, color: 'text-green-400', bgColor: 'bg-green-500/10' },
  paused: { label: 'Paused', icon: Pause, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
  completed: { label: 'Completed', icon: CheckCircle, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
};

export default function ExperimentsPage() {
  const router = useRouter();
  const { currentWorkspace } = useStore();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterType, setFilterType] = useState<ExperimentType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ExperimentStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Create form state
  const [newExperiment, setNewExperiment] = useState({
    name: '',
    description: '',
    hypothesis: '',
    type: 'ab_test' as ExperimentType,
    confidenceLevel: 0.95,
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchExperiments();
  }, [currentWorkspace?.id, filterType, filterStatus]);

  const fetchExperiments = async () => {
    try {
      setLoading(true);
      const { experiments } = await api.getExperiments({
        workspaceId: currentWorkspace?.id,
        ...(filterType !== 'all' && { type: filterType }),
        ...(filterStatus !== 'all' && { status: filterStatus }),
      });
      setExperiments(experiments);
    } catch (error) {
      console.error('Failed to fetch experiments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newExperiment.name.trim()) return;

    try {
      setCreating(true);
      const { experiment } = await api.createExperiment({
        ...newExperiment,
        workspaceId: currentWorkspace?.id,
      });
      setShowCreateModal(false);
      setNewExperiment({
        name: '',
        description: '',
        hypothesis: '',
        type: 'ab_test',
        confidenceLevel: 0.95,
      });
      router.push(`/dashboard/experiments/${experiment.id}`);
    } catch (error) {
      console.error('Failed to create experiment:', error);
    } finally {
      setCreating(false);
    }
  };

  const getTypeConfig = (type: ExperimentType) => {
    return EXPERIMENT_TYPES.find((t) => t.type === type) || EXPERIMENT_TYPES[3];
  };

  const filteredExperiments = experiments.filter((exp) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        exp.name.toLowerCase().includes(query) ||
        exp.description?.toLowerCase().includes(query) ||
        exp.hypothesis?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const stats = {
    total: experiments.length,
    running: experiments.filter((e) => e.status === 'running').length,
    completed: experiments.filter((e) => e.status === 'completed').length,
    draft: experiments.filter((e) => e.status === 'draft').length,
  };

  return (
    <div className="h-full overflow-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <Beaker className="h-7 w-7 text-primary" />
              Design of Experiments
            </h1>
            <p className="text-foreground-secondary mt-1">
              Create and manage scientific experiments with statistical analysis
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Experiment
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Beaker className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-foreground-tertiary">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Play className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.running}</p>
                <p className="text-xs text-foreground-tertiary">Running</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <CheckCircle className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-foreground-tertiary">Completed</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-500/10">
                <Clock className="h-5 w-5 text-gray-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.draft}</p>
                <p className="text-xs text-foreground-tertiary">Drafts</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search experiments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-foreground-tertiary" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ExperimentType | 'all')}
            className="bg-background-secondary border border-border rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Types</option>
            {EXPERIMENT_TYPES.map((t) => (
              <option key={t.type} value={t.type}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ExperimentStatus | 'all')}
            className="bg-background-secondary border border-border rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
              <option key={status} value={status}>
                {config.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Experiments Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filteredExperiments.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Beaker className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No experiments yet</h3>
          <p className="text-foreground-tertiary mb-4">
            Create your first experiment to start testing hypotheses
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Experiment
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExperiments.map((experiment) => {
            const typeConfig = getTypeConfig(experiment.type);
            const statusConfig = STATUS_CONFIG[experiment.status];
            const TypeIcon = typeConfig.icon;
            const StatusIcon = statusConfig.icon;

            return (
              <Card
                key={experiment.id}
                className="cursor-pointer transition-all hover:border-primary/50"
                onClick={() => router.push(`/dashboard/experiments/${experiment.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={cn('p-2 rounded-lg', typeConfig.bgColor)}>
                      <TypeIcon className={cn('h-5 w-5', typeConfig.color)} />
                    </div>
                    <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded-full text-xs', statusConfig.bgColor)}>
                      <StatusIcon className={cn('h-3 w-3', statusConfig.color)} />
                      <span className={statusConfig.color}>{statusConfig.label}</span>
                    </div>
                  </div>
                  <CardTitle className="text-lg mt-3">{experiment.name}</CardTitle>
                  {experiment.description && (
                    <p className="text-sm text-foreground-tertiary line-clamp-2">
                      {experiment.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  {experiment.hypothesis && (
                    <p className="text-xs text-foreground-secondary mb-3 line-clamp-2 italic">
                      "{experiment.hypothesis}"
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-foreground-tertiary">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />
                        {experiment._count.variations} vars
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        {experiment._count.metrics} metrics
                      </span>
                      <span className="flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" />
                        {experiment._count.results} results
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-foreground-tertiary">
                    <span>{typeConfig.label}</span>
                    <span>{new Date(experiment.updatedAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Experiment"
        description="Set up a new scientific experiment"
        size="lg"
      >
        <div className="space-y-6">
          {/* Experiment Type */}
          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-3">
              Experiment Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {EXPERIMENT_TYPES.map((typeOpt) => {
                const Icon = typeOpt.icon;
                return (
                  <button
                    key={typeOpt.type}
                    onClick={() => setNewExperiment({ ...newExperiment, type: typeOpt.type })}
                    className={cn(
                      'p-4 rounded-lg border text-left transition-all',
                      newExperiment.type === typeOpt.type
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-border/80 bg-background-secondary'
                    )}
                  >
                    <div className={cn('p-2 rounded-lg w-fit mb-2', typeOpt.bgColor)}>
                      <Icon className={cn('h-5 w-5', typeOpt.color)} />
                    </div>
                    <h4 className="font-medium text-foreground">{typeOpt.label}</h4>
                    <p className="text-xs text-foreground-tertiary mt-1">{typeOpt.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-2">
              Experiment Name *
            </label>
            <Input
              placeholder="e.g., Landing Page A/B Test"
              value={newExperiment.name}
              onChange={(e) => setNewExperiment({ ...newExperiment, name: e.target.value })}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-2">
              Description
            </label>
            <textarea
              placeholder="Describe the purpose of this experiment..."
              value={newExperiment.description}
              onChange={(e) => setNewExperiment({ ...newExperiment, description: e.target.value })}
              className="w-full px-3 py-2 bg-background-secondary border border-border rounded-lg text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              rows={2}
            />
          </div>

          {/* Hypothesis */}
          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-2">
              Hypothesis
            </label>
            <textarea
              placeholder="H0: There is no significant difference between variations..."
              value={newExperiment.hypothesis}
              onChange={(e) => setNewExperiment({ ...newExperiment, hypothesis: e.target.value })}
              className="w-full px-3 py-2 bg-background-secondary border border-border rounded-lg text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              rows={2}
            />
          </div>

          {/* Confidence Level */}
          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-2">
              Confidence Level
            </label>
            <select
              value={newExperiment.confidenceLevel}
              onChange={(e) =>
                setNewExperiment({ ...newExperiment, confidenceLevel: parseFloat(e.target.value) })
              }
              className="w-full px-3 py-2 bg-background-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value={0.9}>90%</option>
              <option value={0.95}>95% (Recommended)</option>
              <option value={0.99}>99%</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating || !newExperiment.name.trim()}>
              {creating ? 'Creating...' : 'Create Experiment'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
