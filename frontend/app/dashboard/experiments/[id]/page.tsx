'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Beaker,
  Play,
  Pause,
  CheckCircle,
  Clock,
  Plus,
  Trash2,
  Edit2,
  GitBranch,
  Target,
  BarChart3,
  Settings2,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Tabs } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

interface Factor {
  id: string;
  name: string;
  type: string;
  unit?: string;
  description?: string;
  levels?: string;
  levelValues: Array<{ id: string; value: string; label?: string; isControl: boolean }>;
}

interface Variation {
  id: string;
  name: string;
  description?: string;
  isControl: boolean;
  factorValues: string;
  trafficWeight?: number;
}

interface Metric {
  id: string;
  name: string;
  type: string;
  unit?: string;
  isPrimary: boolean;
  higherIsBetter: boolean;
  baselineValue?: number;
  targetValue?: number;
}

interface Run {
  id: string;
  runNumber: number;
  status: string;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
  variation: { id: string; name: string };
}

interface Result {
  id: string;
  value: number;
  sampleSize: number;
  standardError?: number;
  measuredAt: string;
  variation: { id: string; name: string };
  metric: { id: string; name: string; unit?: string };
}

interface Experiment {
  id: string;
  name: string;
  description?: string;
  hypothesis?: string;
  type: string;
  status: string;
  confidenceLevel: number;
  startedAt?: string;
  completedAt?: string;
  conclusion?: string;
  resultSummary?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string; avatar?: string };
  factors: Factor[];
  variations: Variation[];
  metrics: Metric[];
  runs: Run[];
  results: Result[];
}

interface Statistics {
  descriptive: Record<string, Record<string, any>>;
  hypothesisTests: Record<string, any>;
  powerAnalysis?: any;
  totalResults: number;
  variationCount: number;
  metricCount: number;
}

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
  draft: { label: 'Draft', icon: Clock, color: 'text-gray-400', bgColor: 'bg-gray-500/10' },
  running: { label: 'Running', icon: Play, color: 'text-green-400', bgColor: 'bg-green-500/10' },
  paused: { label: 'Paused', icon: Pause, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
  completed: { label: 'Completed', icon: CheckCircle, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
};

export default function ExperimentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const experimentId = params.id as string;

  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Modal states
  const [showAddFactor, setShowAddFactor] = useState(false);
  const [showAddVariation, setShowAddVariation] = useState(false);
  const [showAddMetric, setShowAddMetric] = useState(false);
  const [showAddResult, setShowAddResult] = useState(false);
  const [showConclusion, setShowConclusion] = useState(false);

  // Form states
  const [newFactor, setNewFactor] = useState({ name: '', type: 'categorical', unit: '', levels: ['Low', 'High'] });
  const [newVariation, setNewVariation] = useState({ name: '', description: '', isControl: false });
  const [newMetric, setNewMetric] = useState({ name: '', type: 'numeric', unit: '', isPrimary: false, higherIsBetter: true });
  const [newResult, setNewResult] = useState({ variationId: '', metricId: '', value: 0, sampleSize: 1 });
  const [conclusion, setConclusion] = useState('');

  useEffect(() => {
    fetchExperiment();
  }, [experimentId]);

  const fetchExperiment = async () => {
    try {
      setLoading(true);
      const { experiment } = await api.getExperiment(experimentId);
      setExperiment(experiment);
      setConclusion(experiment.conclusion || '');

      // Fetch statistics if there are results
      if (experiment.results.length > 0) {
        const stats = await api.getExperimentStatistics(experimentId);
        setStatistics(stats);
      }
    } catch (error) {
      console.error('Failed to fetch experiment:', error);
      router.push('/dashboard/experiments');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExperiment = async () => {
    try {
      await api.startExperiment(experimentId);
      fetchExperiment();
    } catch (error: any) {
      alert(error.message || 'Failed to start experiment');
    }
  };

  const handlePauseExperiment = async () => {
    try {
      await api.pauseExperiment(experimentId);
      fetchExperiment();
    } catch (error) {
      console.error('Failed to pause experiment:', error);
    }
  };

  const handleCompleteExperiment = async () => {
    try {
      await api.completeExperiment(experimentId, conclusion);
      setShowConclusion(false);
      fetchExperiment();
    } catch (error) {
      console.error('Failed to complete experiment:', error);
    }
  };

  const handleAddFactor = async () => {
    try {
      await api.addExperimentFactor(experimentId, {
        name: newFactor.name,
        type: newFactor.type,
        unit: newFactor.unit || undefined,
        levels: newFactor.levels.filter((l) => l.trim()),
      });
      setShowAddFactor(false);
      setNewFactor({ name: '', type: 'categorical', unit: '', levels: ['Low', 'High'] });
      fetchExperiment();
    } catch (error) {
      console.error('Failed to add factor:', error);
    }
  };

  const handleDeleteFactor = async (factorId: string) => {
    if (!confirm('Delete this factor?')) return;
    try {
      await api.deleteExperimentFactor(experimentId, factorId);
      fetchExperiment();
    } catch (error) {
      console.error('Failed to delete factor:', error);
    }
  };

  const handleAddVariation = async () => {
    try {
      await api.addExperimentVariation(experimentId, newVariation);
      setShowAddVariation(false);
      setNewVariation({ name: '', description: '', isControl: false });
      fetchExperiment();
    } catch (error) {
      console.error('Failed to add variation:', error);
    }
  };

  const handleGenerateVariations = async () => {
    try {
      await api.generateExperimentVariations(experimentId);
      fetchExperiment();
    } catch (error: any) {
      alert(error.message || 'Failed to generate variations');
    }
  };

  const handleDeleteVariation = async (variationId: string) => {
    if (!confirm('Delete this variation?')) return;
    try {
      await api.deleteExperimentVariation(experimentId, variationId);
      fetchExperiment();
    } catch (error) {
      console.error('Failed to delete variation:', error);
    }
  };

  const handleAddMetric = async () => {
    try {
      await api.addExperimentMetric(experimentId, newMetric);
      setShowAddMetric(false);
      setNewMetric({ name: '', type: 'numeric', unit: '', isPrimary: false, higherIsBetter: true });
      fetchExperiment();
    } catch (error) {
      console.error('Failed to add metric:', error);
    }
  };

  const handleDeleteMetric = async (metricId: string) => {
    if (!confirm('Delete this metric?')) return;
    try {
      await api.deleteExperimentMetric(experimentId, metricId);
      fetchExperiment();
    } catch (error) {
      console.error('Failed to delete metric:', error);
    }
  };

  const handleAddResult = async () => {
    try {
      await api.recordExperimentResult(experimentId, newResult);
      setShowAddResult(false);
      setNewResult({ variationId: '', metricId: '', value: 0, sampleSize: 1 });
      fetchExperiment();
    } catch (error) {
      console.error('Failed to add result:', error);
    }
  };

  if (loading || !experiment) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[experiment.status] || STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;
  const canEdit = experiment.status === 'draft';
  const isRunning = experiment.status === 'running';

  // Workflow steps
  const workflowSteps = [
    { id: 'hypothesis', label: 'Hypothesis', done: !!experiment.hypothesis },
    { id: 'factors', label: 'Factors', done: experiment.factors.length > 0 },
    { id: 'variations', label: 'Variations', done: experiment.variations.length >= 2 },
    { id: 'metrics', label: 'Metrics', done: experiment.metrics.length > 0 },
    { id: 'running', label: 'Running', done: experiment.status === 'running' || experiment.status === 'completed' },
    { id: 'results', label: 'Results', done: experiment.results.length > 0 },
    { id: 'conclusion', label: 'Conclusion', done: experiment.status === 'completed' },
  ];

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="border-b border-border bg-background sticky top-0 z-10">
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.push('/dashboard/experiments')}
              className="p-2 rounded-lg hover:bg-background-tertiary transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-foreground">{experiment.name}</h1>
                <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded-full text-xs', statusConfig.bgColor)}>
                  <StatusIcon className={cn('h-3 w-3', statusConfig.color)} />
                  <span className={statusConfig.color}>{statusConfig.label}</span>
                </div>
              </div>
              {experiment.description && (
                <p className="text-sm text-foreground-tertiary mt-1">{experiment.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {canEdit && experiment.variations.length >= 2 && experiment.metrics.length >= 1 && (
                <Button onClick={handleStartExperiment}>
                  <Play className="mr-2 h-4 w-4" />
                  Start Experiment
                </Button>
              )}
              {isRunning && (
                <>
                  <Button variant="outline" onClick={handlePauseExperiment}>
                    <Pause className="mr-2 h-4 w-4" />
                    Pause
                  </Button>
                  <Button onClick={() => setShowConclusion(true)}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Complete
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Workflow Timeline */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {workflowSteps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs whitespace-nowrap',
                    step.done ? 'bg-green-500/10 text-green-400' : 'bg-background-tertiary text-foreground-tertiary'
                  )}
                >
                  {step.done ? <Check className="h-3 w-3" /> : <span className="h-3 w-3 rounded-full border border-current" />}
                  {step.label}
                </div>
                {index < workflowSteps.length - 1 && (
                  <div className={cn('w-4 h-0.5 mx-1', step.done ? 'bg-green-500/50' : 'bg-border')} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6">
          <Tabs
            tabs={[
              { id: 'overview', label: 'Overview' },
              { id: 'factors', label: `Factors (${experiment.factors.length})` },
              { id: 'variations', label: `Variations (${experiment.variations.length})` },
              { id: 'metrics', label: `Metrics (${experiment.metrics.length})` },
              { id: 'results', label: `Results (${experiment.results.length})` },
              { id: 'statistics', label: 'Statistics' },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Hypothesis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Hypothesis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {experiment.hypothesis ? (
                  <p className="text-foreground-secondary italic">"{experiment.hypothesis}"</p>
                ) : (
                  <p className="text-foreground-tertiary">No hypothesis defined yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-primary">{experiment.factors.length}</p>
                  <p className="text-sm text-foreground-tertiary">Factors</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-purple-400">{experiment.variations.length}</p>
                  <p className="text-sm text-foreground-tertiary">Variations</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-green-400">{experiment.metrics.length}</p>
                  <p className="text-sm text-foreground-tertiary">Metrics</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-blue-400">{experiment.results.length}</p>
                  <p className="text-sm text-foreground-tertiary">Results</p>
                </CardContent>
              </Card>
            </div>

            {/* Configuration Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-foreground-tertiary">Type</span>
                  <span className="font-medium capitalize">{experiment.type.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-tertiary">Confidence Level</span>
                  <span className="font-medium">{(experiment.confidenceLevel * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-tertiary">Created</span>
                  <span className="font-medium">{new Date(experiment.createdAt).toLocaleDateString()}</span>
                </div>
                {experiment.startedAt && (
                  <div className="flex justify-between">
                    <span className="text-foreground-tertiary">Started</span>
                    <span className="font-medium">{new Date(experiment.startedAt).toLocaleDateString()}</span>
                  </div>
                )}
                {experiment.completedAt && (
                  <div className="flex justify-between">
                    <span className="text-foreground-tertiary">Completed</span>
                    <span className="font-medium">{new Date(experiment.completedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Conclusion (if completed) */}
            {experiment.status === 'completed' && experiment.conclusion && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    Conclusion
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground-secondary">{experiment.conclusion}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Factors Tab */}
        {activeTab === 'factors' && (
          <div className="space-y-4">
            {canEdit && (
              <div className="flex justify-end">
                <Button onClick={() => setShowAddFactor(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Factor
                </Button>
              </div>
            )}

            {experiment.factors.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Settings2 className="h-12 w-12 mx-auto text-foreground-tertiary mb-4" />
                  <h3 className="text-lg font-medium mb-2">No factors defined</h3>
                  <p className="text-foreground-tertiary mb-4">
                    Add factors (independent variables) to test in your experiment
                  </p>
                  {canEdit && (
                    <Button onClick={() => setShowAddFactor(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Factor
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {experiment.factors.map((factor) => {
                  const levels = factor.levelValues.length > 0
                    ? factor.levelValues.map((l) => l.value)
                    : JSON.parse(factor.levels || '[]');

                  return (
                    <Card key={factor.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-foreground flex items-center gap-2">
                              {factor.name}
                              {factor.unit && (
                                <span className="text-xs text-foreground-tertiary">({factor.unit})</span>
                              )}
                            </h4>
                            {factor.description && (
                              <p className="text-sm text-foreground-tertiary mt-1">{factor.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-3">
                              <span className="text-xs text-foreground-tertiary">Levels:</span>
                              {levels.map((level: string, i: number) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded"
                                >
                                  {level}
                                </span>
                              ))}
                            </div>
                          </div>
                          {canEdit && (
                            <button
                              onClick={() => handleDeleteFactor(factor.id)}
                              className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Variations Tab */}
        {activeTab === 'variations' && (
          <div className="space-y-4">
            {canEdit && (
              <div className="flex justify-end gap-2">
                {experiment.factors.length > 0 && (
                  <Button variant="outline" onClick={handleGenerateVariations}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate All Combinations
                  </Button>
                )}
                <Button onClick={() => setShowAddVariation(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Variation
                </Button>
              </div>
            )}

            {experiment.variations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <GitBranch className="h-12 w-12 mx-auto text-foreground-tertiary mb-4" />
                  <h3 className="text-lg font-medium mb-2">No variations defined</h3>
                  <p className="text-foreground-tertiary mb-4">
                    Add at least 2 variations to compare in your experiment
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {experiment.variations.map((variation) => (
                  <Card
                    key={variation.id}
                    className={cn(variation.isControl && 'border-green-500/50')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-foreground flex items-center gap-2">
                            {variation.name}
                            {variation.isControl && (
                              <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded">
                                Control
                              </span>
                            )}
                          </h4>
                          {variation.description && (
                            <p className="text-sm text-foreground-tertiary mt-1">{variation.description}</p>
                          )}
                          {variation.trafficWeight && (
                            <p className="text-xs text-foreground-tertiary mt-2">
                              Traffic: {variation.trafficWeight}%
                            </p>
                          )}
                        </div>
                        {canEdit && (
                          <button
                            onClick={() => handleDeleteVariation(variation.id)}
                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Metrics Tab */}
        {activeTab === 'metrics' && (
          <div className="space-y-4">
            {canEdit && (
              <div className="flex justify-end">
                <Button onClick={() => setShowAddMetric(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Metric
                </Button>
              </div>
            )}

            {experiment.metrics.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Target className="h-12 w-12 mx-auto text-foreground-tertiary mb-4" />
                  <h3 className="text-lg font-medium mb-2">No metrics defined</h3>
                  <p className="text-foreground-tertiary mb-4">
                    Add metrics (dependent variables) to measure in your experiment
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {experiment.metrics.map((metric) => (
                  <Card
                    key={metric.id}
                    className={cn(metric.isPrimary && 'border-primary/50')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-foreground flex items-center gap-2">
                            {metric.name}
                            {metric.unit && (
                              <span className="text-xs text-foreground-tertiary">({metric.unit})</span>
                            )}
                            {metric.isPrimary && (
                              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded">
                                Primary
                              </span>
                            )}
                          </h4>
                          <div className="flex items-center gap-4 mt-2 text-xs text-foreground-tertiary">
                            <span>Type: {metric.type}</span>
                            <span className="flex items-center gap-1">
                              {metric.higherIsBetter ? (
                                <><TrendingUp className="h-3 w-3 text-green-400" /> Higher is better</>
                              ) : (
                                <><TrendingDown className="h-3 w-3 text-red-400" /> Lower is better</>
                              )}
                            </span>
                          </div>
                        </div>
                        {canEdit && (
                          <button
                            onClick={() => handleDeleteMetric(metric.id)}
                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div className="space-y-4">
            {(isRunning || experiment.status === 'paused') && (
              <div className="flex justify-end">
                <Button onClick={() => setShowAddResult(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Record Result
                </Button>
              </div>
            )}

            {experiment.results.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BarChart3 className="h-12 w-12 mx-auto text-foreground-tertiary mb-4" />
                  <h3 className="text-lg font-medium mb-2">No results recorded</h3>
                  <p className="text-foreground-tertiary mb-4">
                    {isRunning
                      ? 'Start recording results for your experiment'
                      : 'Start the experiment to begin recording results'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left text-xs font-medium text-foreground-tertiary">Variation</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-foreground-tertiary">Metric</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-foreground-tertiary">Value</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-foreground-tertiary">Sample Size</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-foreground-tertiary">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {experiment.results.map((result) => (
                        <tr key={result.id} className="border-b border-border/50">
                          <td className="px-4 py-3 text-sm">{result.variation.name}</td>
                          <td className="px-4 py-3 text-sm">
                            {result.metric.name}
                            {result.metric.unit && <span className="text-foreground-tertiary"> ({result.metric.unit})</span>}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-mono">{result.value.toFixed(4)}</td>
                          <td className="px-4 py-3 text-sm text-right">{result.sampleSize}</td>
                          <td className="px-4 py-3 text-sm text-right text-foreground-tertiary">
                            {new Date(result.measuredAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'statistics' && (
          <div className="space-y-6">
            {!statistics || experiment.results.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BarChart3 className="h-12 w-12 mx-auto text-foreground-tertiary mb-4" />
                  <h3 className="text-lg font-medium mb-2">No statistics available</h3>
                  <p className="text-foreground-tertiary">
                    Record results to see statistical analysis
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Hypothesis Tests */}
                {Object.entries(statistics.hypothesisTests).map(([metricId, test]) => {
                  const metric = experiment.metrics.find((m) => m.id === metricId);
                  return (
                    <Card key={metricId}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          {test.significant ? (
                            <CheckCircle className="h-5 w-5 text-green-400" />
                          ) : (
                            <X className="h-5 w-5 text-red-400" />
                          )}
                          {metric?.name || 'Unknown Metric'}
                          <span
                            className={cn(
                              'ml-2 px-2 py-0.5 rounded text-xs',
                              test.significant ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                            )}
                          >
                            {test.significant ? 'Significant' : 'Not Significant'}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-foreground-tertiary">Test Type</p>
                            <p className="font-medium">{test.testType}</p>
                          </div>
                          <div>
                            <p className="text-xs text-foreground-tertiary">p-value</p>
                            <p className={cn('font-mono font-medium', test.pValue < 0.05 ? 'text-green-400' : 'text-red-400')}>
                              {test.pValue < 0.001 ? '< 0.001' : test.pValue.toFixed(4)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-foreground-tertiary">Effect Size</p>
                            <p className="font-medium">
                              {test.effectSize?.toFixed(3) || 'N/A'}
                              <span className="text-xs text-foreground-tertiary ml-1">
                                ({test.effectSizeInterpretation})
                              </span>
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-foreground-tertiary">Confidence</p>
                            <p className="font-medium">{(test.confidenceLevel * 100).toFixed(0)}%</p>
                          </div>
                        </div>
                        <div className="p-3 bg-background-tertiary rounded-lg">
                          <p className="text-sm text-foreground-secondary">{test.interpretation}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Power Analysis */}
                {statistics.powerAnalysis && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Power Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-foreground-tertiary">Achieved Power</p>
                          <p className="font-medium">{(statistics.powerAnalysis.achievedPower * 100).toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-foreground-tertiary">Required Sample Size</p>
                          <p className="font-medium">{statistics.powerAnalysis.requiredSampleSize}</p>
                        </div>
                        <div>
                          <p className="text-xs text-foreground-tertiary">Effect Size</p>
                          <p className="font-medium">{statistics.powerAnalysis.effectSize.toFixed(3)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-foreground-tertiary">Alpha</p>
                          <p className="font-medium">{statistics.powerAnalysis.alpha.toFixed(2)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Descriptive Statistics */}
                <Card>
                  <CardHeader>
                    <CardTitle>Descriptive Statistics by Variation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="px-4 py-2 text-left text-xs font-medium text-foreground-tertiary">Variation</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-foreground-tertiary">Metric</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-foreground-tertiary">Mean</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-foreground-tertiary">Std Dev</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-foreground-tertiary">n</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-foreground-tertiary">95% CI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(statistics.descriptive).map(([varId, metrics]) => {
                            const variation = experiment.variations.find((v) => v.id === varId);
                            return Object.entries(metrics).map(([metId, stats], idx) => {
                              const metric = experiment.metrics.find((m) => m.id === metId);
                              return (
                                <tr key={`${varId}-${metId}`} className="border-b border-border/50">
                                  {idx === 0 && (
                                    <td
                                      className="px-4 py-2 text-sm font-medium"
                                      rowSpan={Object.keys(metrics).length}
                                    >
                                      {variation?.name || varId}
                                    </td>
                                  )}
                                  <td className="px-4 py-2 text-sm">{metric?.name || metId}</td>
                                  <td className="px-4 py-2 text-sm text-right font-mono">{stats.mean.toFixed(4)}</td>
                                  <td className="px-4 py-2 text-sm text-right font-mono">{stats.standardDeviation.toFixed(4)}</td>
                                  <td className="px-4 py-2 text-sm text-right">{stats.sampleSize}</td>
                                  <td className="px-4 py-2 text-sm text-right font-mono text-foreground-tertiary">
                                    [{stats.confidenceInterval.lower.toFixed(3)}, {stats.confidenceInterval.upper.toFixed(3)}]
                                  </td>
                                </tr>
                              );
                            });
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}
      </div>

      {/* Add Factor Modal */}
      <Modal
        isOpen={showAddFactor}
        onClose={() => setShowAddFactor(false)}
        title="Add Factor"
        description="Define an independent variable for your experiment"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-2">Name *</label>
            <Input
              placeholder="e.g., Temperature, Concentration"
              value={newFactor.name}
              onChange={(e) => setNewFactor({ ...newFactor, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-2">Unit</label>
            <Input
              placeholder="e.g., °C, mol/L"
              value={newFactor.unit}
              onChange={(e) => setNewFactor({ ...newFactor, unit: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-2">Levels (comma-separated)</label>
            <Input
              placeholder="e.g., Low, High"
              value={newFactor.levels.join(', ')}
              onChange={(e) => setNewFactor({ ...newFactor, levels: e.target.value.split(',').map((l) => l.trim()) })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowAddFactor(false)}>Cancel</Button>
            <Button onClick={handleAddFactor} disabled={!newFactor.name.trim()}>Add Factor</Button>
          </div>
        </div>
      </Modal>

      {/* Add Variation Modal */}
      <Modal
        isOpen={showAddVariation}
        onClose={() => setShowAddVariation(false)}
        title="Add Variation"
        description="Define a treatment condition"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-2">Name *</label>
            <Input
              placeholder="e.g., Control, Treatment A"
              value={newVariation.name}
              onChange={(e) => setNewVariation({ ...newVariation, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-2">Description</label>
            <Input
              placeholder="Describe this variation..."
              value={newVariation.description}
              onChange={(e) => setNewVariation({ ...newVariation, description: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={newVariation.isControl}
              onChange={(e) => setNewVariation({ ...newVariation, isControl: e.target.checked })}
              className="rounded border-border"
            />
            <span className="text-sm">This is the control group</span>
          </label>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowAddVariation(false)}>Cancel</Button>
            <Button onClick={handleAddVariation} disabled={!newVariation.name.trim()}>Add Variation</Button>
          </div>
        </div>
      </Modal>

      {/* Add Metric Modal */}
      <Modal
        isOpen={showAddMetric}
        onClose={() => setShowAddMetric(false)}
        title="Add Metric"
        description="Define a dependent variable to measure"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-2">Name *</label>
            <Input
              placeholder="e.g., Conversion Rate, Yield"
              value={newMetric.name}
              onChange={(e) => setNewMetric({ ...newMetric, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-2">Unit</label>
            <Input
              placeholder="e.g., %, mg/L"
              value={newMetric.unit}
              onChange={(e) => setNewMetric({ ...newMetric, unit: e.target.value })}
            />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newMetric.isPrimary}
                onChange={(e) => setNewMetric({ ...newMetric, isPrimary: e.target.checked })}
                className="rounded border-border"
              />
              <span className="text-sm">Primary metric</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newMetric.higherIsBetter}
                onChange={(e) => setNewMetric({ ...newMetric, higherIsBetter: e.target.checked })}
                className="rounded border-border"
              />
              <span className="text-sm">Higher is better</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowAddMetric(false)}>Cancel</Button>
            <Button onClick={handleAddMetric} disabled={!newMetric.name.trim()}>Add Metric</Button>
          </div>
        </div>
      </Modal>

      {/* Add Result Modal */}
      <Modal
        isOpen={showAddResult}
        onClose={() => setShowAddResult(false)}
        title="Record Result"
        description="Add a measurement to your experiment"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-2">Variation *</label>
            <select
              value={newResult.variationId}
              onChange={(e) => setNewResult({ ...newResult, variationId: e.target.value })}
              className="w-full px-3 py-2 bg-background-secondary border border-border rounded-lg"
            >
              <option value="">Select variation...</option>
              {experiment.variations.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-2">Metric *</label>
            <select
              value={newResult.metricId}
              onChange={(e) => setNewResult({ ...newResult, metricId: e.target.value })}
              className="w-full px-3 py-2 bg-background-secondary border border-border rounded-lg"
            >
              <option value="">Select metric...</option>
              {experiment.metrics.map((m) => (
                <option key={m.id} value={m.id}>{m.name} {m.unit && `(${m.unit})`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-2">Value *</label>
            <Input
              type="number"
              step="any"
              value={newResult.value}
              onChange={(e) => setNewResult({ ...newResult, value: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-2">Sample Size</label>
            <Input
              type="number"
              min="1"
              value={newResult.sampleSize}
              onChange={(e) => setNewResult({ ...newResult, sampleSize: parseInt(e.target.value) || 1 })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowAddResult(false)}>Cancel</Button>
            <Button
              onClick={handleAddResult}
              disabled={!newResult.variationId || !newResult.metricId}
            >
              Record Result
            </Button>
          </div>
        </div>
      </Modal>

      {/* Complete Experiment Modal */}
      <Modal
        isOpen={showConclusion}
        onClose={() => setShowConclusion(false)}
        title="Complete Experiment"
        description="Write your conclusion and finalize the experiment"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-2">Conclusion</label>
            <textarea
              placeholder="Based on the results, we conclude that..."
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
              className="w-full px-3 py-2 bg-background-secondary border border-border rounded-lg text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              rows={4}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowConclusion(false)}>Cancel</Button>
            <Button onClick={handleCompleteExperiment}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Complete Experiment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
