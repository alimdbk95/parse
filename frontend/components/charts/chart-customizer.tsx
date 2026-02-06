'use client';

import { useState } from 'react';
import {
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  Circle,
  Palette,
  Type,
  Grid3X3,
  Eye,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dropdown } from '@/components/ui/dropdown';
import { cn } from '@/lib/utils';

const chartTypes = [
  { value: 'bar', label: 'Bar Chart', icon: <BarChart3 className="h-4 w-4" /> },
  { value: 'line', label: 'Line Chart', icon: <LineChart className="h-4 w-4" /> },
  { value: 'pie', label: 'Pie Chart', icon: <PieChart className="h-4 w-4" /> },
  { value: 'area', label: 'Area Chart', icon: <TrendingUp className="h-4 w-4" /> },
  { value: 'scatter', label: 'Scatter Plot', icon: <Circle className="h-4 w-4" /> },
];

const colorPalettes = [
  {
    id: 'default',
    name: 'Default',
    colors: ['#f97066', '#47d4c1', '#3b82f6', '#a3e635', '#f472b6'],
  },
  {
    id: 'ocean',
    name: 'Ocean',
    colors: ['#0ea5e9', '#06b6d4', '#14b8a6', '#22c55e', '#84cc16'],
  },
  {
    id: 'sunset',
    name: 'Sunset',
    colors: ['#f97316', '#f59e0b', '#eab308', '#ef4444', '#ec4899'],
  },
  {
    id: 'forest',
    name: 'Forest',
    colors: ['#22c55e', '#16a34a', '#15803d', '#14532d', '#84cc16'],
  },
  {
    id: 'royal',
    name: 'Royal',
    colors: ['#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'],
  },
];

const backgrounds = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'transparent', label: 'Transparent' },
];

interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'area' | 'scatter';
  colors: string[];
  background: 'light' | 'dark' | 'transparent';
  showLegend: boolean;
  showGrid: boolean;
  title: string;
}

interface ChartCustomizerProps {
  config: ChartConfig;
  onChange: (config: Partial<ChartConfig>) => void;
  onExport?: () => void;
}

export function ChartCustomizer({ config, onChange, onExport }: ChartCustomizerProps) {
  const selectedPalette = colorPalettes.find(
    (p) => JSON.stringify(p.colors) === JSON.stringify(config.colors)
  ) || colorPalettes[0];

  return (
    <div className="space-y-6 p-4 border-l border-border bg-background-secondary w-72">
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Chart Type
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {chartTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => onChange({ type: type.value as ChartConfig['type'] })}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                config.type === type.value
                  ? 'bg-primary/20 text-primary border border-primary/50'
                  : 'bg-background-tertiary text-foreground-secondary hover:bg-border'
              )}
            >
              {type.icon}
              <span className="text-xs">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Color Palette
        </h3>
        <div className="space-y-2">
          {colorPalettes.map((palette) => (
            <button
              key={palette.id}
              onClick={() => onChange({ colors: palette.colors })}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors',
                selectedPalette.id === palette.id
                  ? 'bg-primary/20 border border-primary/50'
                  : 'bg-background-tertiary hover:bg-border'
              )}
            >
              <div className="flex gap-1">
                {palette.colors.slice(0, 5).map((color, i) => (
                  <div
                    key={i}
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span className="text-sm">{palette.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Type className="h-4 w-4" />
          Background
        </h3>
        <div className="flex gap-2">
          {backgrounds.map((bg) => (
            <button
              key={bg.value}
              onClick={() => onChange({ background: bg.value as ChartConfig['background'] })}
              className={cn(
                'flex-1 rounded-lg px-3 py-2 text-sm transition-colors',
                config.background === bg.value
                  ? 'bg-primary/20 text-primary border border-primary/50'
                  : 'bg-background-tertiary text-foreground-secondary hover:bg-border'
              )}
            >
              {bg.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Display Options
        </h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm text-foreground-secondary">Show Legend</span>
            <button
              onClick={() => onChange({ showLegend: !config.showLegend })}
              className={cn(
                'relative h-6 w-11 rounded-full transition-colors',
                config.showLegend ? 'bg-primary' : 'bg-background-tertiary'
              )}
            >
              <span
                className={cn(
                  'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                  config.showLegend && 'translate-x-5'
                )}
              />
            </button>
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm text-foreground-secondary">Show Grid</span>
            <button
              onClick={() => onChange({ showGrid: !config.showGrid })}
              className={cn(
                'relative h-6 w-11 rounded-full transition-colors',
                config.showGrid ? 'bg-primary' : 'bg-background-tertiary'
              )}
            >
              <span
                className={cn(
                  'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                  config.showGrid && 'translate-x-5'
                )}
              />
            </button>
          </label>
        </div>
      </div>

      {onExport && (
        <Button onClick={onExport} className="w-full">
          <Download className="h-4 w-4 mr-2" />
          Export Chart
        </Button>
      )}
    </div>
  );
}
