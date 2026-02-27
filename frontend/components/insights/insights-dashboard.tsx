'use client';

import { useState, useEffect, useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import {
  Brain,
  TrendingUp,
  Tag,
  Users,
  MessageSquare,
  FileText,
  RefreshCw,
  Building,
  MapPin,
  Calendar,
  User,
  Briefcase,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface DashboardData {
  sentiments: { positive: number; negative: number; neutral: number; mixed: number };
  themes: Array<{ label: string; count: number; confidence: number }>;
  entities: Array<{ type: string; count: number; unique: number; examples: string[] }>;
  keyphrases: Array<{ label: string; frequency: number }>;
  timeline: Array<{
    date: string;
    analyzed: number;
    sentiments: { positive: number; negative: number; neutral: number; mixed: number };
  }>;
  totalDocuments: number;
  analyzedDocuments: number;
}

interface InsightsDashboardProps {
  workspaceId?: string;
}

const SENTIMENT_COLORS = {
  positive: '#22c55e',
  negative: '#ef4444',
  neutral: '#6b7280',
  mixed: '#f59e0b',
};

const ENTITY_ICONS: Record<string, any> = {
  person: User,
  organization: Building,
  location: MapPin,
  date: Calendar,
  time: Calendar,
  company: Briefcase,
  other: Tag,
};

export function InsightsDashboard({ workspaceId }: InsightsDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getInsightsDashboard(workspaceId);
      setData(result);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [workspaceId]);

  const sentimentChartOptions = useMemo(() => {
    if (!data) return null;

    const total = Object.values(data.sentiments).reduce((a, b) => a + b, 0);
    if (total === 0) return null;

    return {
      chart: {
        type: 'pie',
        backgroundColor: 'transparent',
        height: 200,
      },
      title: { text: '' },
      credits: { enabled: false },
      plotOptions: {
        pie: {
          innerSize: '60%',
          dataLabels: {
            enabled: false,
          },
          showInLegend: true,
        },
      },
      legend: {
        align: 'right',
        verticalAlign: 'middle',
        layout: 'vertical',
        itemStyle: { color: '#9ca3af', fontSize: '12px' },
        itemHoverStyle: { color: '#fff' },
      },
      series: [
        {
          name: 'Documents',
          data: [
            { name: 'Positive', y: data.sentiments.positive, color: SENTIMENT_COLORS.positive },
            { name: 'Negative', y: data.sentiments.negative, color: SENTIMENT_COLORS.negative },
            { name: 'Neutral', y: data.sentiments.neutral, color: SENTIMENT_COLORS.neutral },
            { name: 'Mixed', y: data.sentiments.mixed, color: SENTIMENT_COLORS.mixed },
          ].filter((d) => d.y > 0),
        },
      ],
    };
  }, [data]);

  const themesChartOptions = useMemo(() => {
    if (!data || data.themes.length === 0) return null;

    return {
      chart: {
        type: 'bar',
        backgroundColor: 'transparent',
        height: 250,
      },
      title: { text: '' },
      credits: { enabled: false },
      xAxis: {
        categories: data.themes.slice(0, 8).map((t) => t.label),
        labels: {
          style: { color: '#9ca3af', fontSize: '11px' },
        },
        lineColor: '#374151',
      },
      yAxis: {
        title: { text: '' },
        labels: { style: { color: '#9ca3af' } },
        gridLineColor: '#374151',
      },
      legend: { enabled: false },
      plotOptions: {
        bar: {
          borderRadius: 4,
          dataLabels: {
            enabled: true,
            style: { color: '#9ca3af', fontSize: '10px', textOutline: 'none' },
          },
        },
      },
      series: [
        {
          name: 'Occurrences',
          data: data.themes.slice(0, 8).map((t) => ({
            y: t.count,
            color: `rgba(99, 102, 241, ${0.4 + t.confidence * 0.6})`,
          })),
        },
      ],
    };
  }, [data]);

  const timelineChartOptions = useMemo(() => {
    if (!data || data.timeline.length === 0) return null;

    return {
      chart: {
        type: 'area',
        backgroundColor: 'transparent',
        height: 180,
      },
      title: { text: '' },
      credits: { enabled: false },
      xAxis: {
        categories: data.timeline.map((t) =>
          new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        ),
        labels: { style: { color: '#9ca3af', fontSize: '10px' } },
        lineColor: '#374151',
      },
      yAxis: {
        title: { text: '' },
        labels: { style: { color: '#9ca3af' } },
        gridLineColor: '#374151',
      },
      legend: {
        itemStyle: { color: '#9ca3af', fontSize: '11px' },
        itemHoverStyle: { color: '#fff' },
      },
      plotOptions: {
        area: {
          stacking: 'normal',
          marker: { enabled: false },
          fillOpacity: 0.5,
        },
      },
      series: [
        {
          name: 'Positive',
          data: data.timeline.map((t) => t.sentiments.positive),
          color: SENTIMENT_COLORS.positive,
        },
        {
          name: 'Neutral',
          data: data.timeline.map((t) => t.sentiments.neutral),
          color: SENTIMENT_COLORS.neutral,
        },
        {
          name: 'Negative',
          data: data.timeline.map((t) => t.sentiments.negative),
          color: SENTIMENT_COLORS.negative,
        },
      ],
    };
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-foreground-secondary mb-4">{error}</p>
        <Button onClick={fetchDashboard} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const hasData = data.analyzedDocuments > 0;

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.totalDocuments}</p>
                <p className="text-xs text-foreground-tertiary">Total Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Brain className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.analyzedDocuments}</p>
                <p className="text-xs text-foreground-tertiary">Analyzed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Tag className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.themes.length}</p>
                <p className="text-xs text-foreground-tertiary">Themes Found</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {data.entities.reduce((sum, e) => sum + e.unique, 0)}
                </p>
                <p className="text-xs text-foreground-tertiary">Entities</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!hasData ? (
        <Card className="p-8 text-center">
          <Brain className="h-12 w-12 mx-auto text-foreground-tertiary mb-4" />
          <h3 className="text-lg font-medium mb-2">No Analyzed Documents Yet</h3>
          <p className="text-sm text-foreground-secondary max-w-md mx-auto">
            Select a document from the Details tab and click "Analyze" to start
            extracting semantic insights. Your dashboard will populate as you analyze more documents.
          </p>
        </Card>
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Sentiment Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  Sentiment Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sentimentChartOptions ? (
                  <HighchartsReact highcharts={Highcharts} options={sentimentChartOptions} />
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-foreground-tertiary text-sm">
                    No sentiment data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Themes */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="h-4 w-4 text-green-500" />
                  Top Themes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {themesChartOptions ? (
                  <HighchartsReact highcharts={Highcharts} options={themesChartOptions} />
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-foreground-tertiary text-sm">
                    No themes extracted yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Entities & Keyphrases Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Entity Breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-500" />
                  Entity Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.entities.length > 0 ? (
                  <div className="space-y-3">
                    {data.entities.map((entity) => {
                      const IconComponent = ENTITY_ICONS[entity.type.toLowerCase()] || ENTITY_ICONS.other;
                      return (
                        <div
                          key={entity.type}
                          className="flex items-center gap-3 p-3 rounded-lg bg-background-tertiary/50"
                        >
                          <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <IconComponent className="h-4 w-4 text-amber-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium capitalize">{entity.type}</span>
                              <span className="text-sm text-foreground-tertiary">
                                {entity.unique} unique
                              </span>
                            </div>
                            <p className="text-xs text-foreground-tertiary truncate">
                              {entity.examples.join(', ')}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-foreground-tertiary text-sm">
                    No entities extracted yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Keyphrase Cloud */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-cyan-500" />
                  Key Phrases
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.keyphrases.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {data.keyphrases.map((phrase, index) => {
                      const maxFreq = Math.max(...data.keyphrases.map((p) => p.frequency));
                      const size = 0.75 + (phrase.frequency / maxFreq) * 0.5;
                      const opacity = 0.5 + (phrase.frequency / maxFreq) * 0.5;

                      return (
                        <span
                          key={phrase.label}
                          className="px-2 py-1 rounded bg-cyan-500/10 text-cyan-400 transition-all hover:bg-cyan-500/20 cursor-default"
                          style={{
                            fontSize: `${size}rem`,
                            opacity,
                          }}
                          title={`Frequency: ${phrase.frequency}`}
                        >
                          {phrase.label}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-foreground-tertiary text-sm">
                    No keyphrases extracted yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Timeline */}
          {data.timeline.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  Sentiment Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                {timelineChartOptions && (
                  <HighchartsReact highcharts={Highcharts} options={timelineChartOptions} />
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
