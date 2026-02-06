export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'area' | 'scatter';
  title: string;
  data: any[];
  colors?: string[];
  background?: 'light' | 'dark' | 'transparent';
  fontFamily?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  xAxisKey?: string;
  yAxisKeys?: string[];
}

const defaultColors = [
  '#f97066', // coral
  '#47d4c1', // teal
  '#3b82f6', // blue
  '#a3e635', // lime
  '#f472b6', // pink
  '#fbbf24', // amber
  '#a78bfa', // purple
  '#34d399', // emerald
];

export class ChartService {
  generateChartConfig(
    type: ChartConfig['type'],
    data: any[],
    options: Partial<ChartConfig> = {}
  ): ChartConfig {
    const firstItem = data[0] || {};
    const keys = Object.keys(firstItem);

    // Detect x-axis key (usually the first non-numeric key)
    const xAxisKey = keys.find(k => typeof firstItem[k] === 'string') || keys[0];

    // Detect y-axis keys (numeric values)
    const yAxisKeys = keys.filter(k => typeof firstItem[k] === 'number');

    return {
      type,
      title: options.title || 'Chart',
      data,
      colors: options.colors || defaultColors,
      background: options.background || 'dark',
      fontFamily: options.fontFamily || 'Inter',
      showLegend: options.showLegend !== false,
      showGrid: options.showGrid !== false,
      xAxisKey,
      yAxisKeys,
    };
  }

  applyBranding(
    config: ChartConfig,
    branding: {
      colors?: string[];
      fontFamily?: string;
      background?: 'light' | 'dark' | 'transparent';
    }
  ): ChartConfig {
    return {
      ...config,
      colors: branding.colors || config.colors,
      fontFamily: branding.fontFamily || config.fontFamily,
      background: branding.background || config.background,
    };
  }

  getSampleData(type: ChartConfig['type']): any[] {
    switch (type) {
      case 'bar':
        return [
          { name: 'New York', value: 2800000, category: 'A' },
          { name: 'Paris', value: 2100000, category: 'A' },
          { name: 'Milan', value: 980000, category: 'B' },
          { name: 'Barcelona', value: 750000, category: 'B' },
          { name: 'Tokyo', value: 4200000, category: 'A' },
        ];
      case 'line':
        return [
          { month: 'Jan', value: 4000, previous: 3500 },
          { month: 'Feb', value: 3000, previous: 2800 },
          { month: 'Mar', value: 5000, previous: 4200 },
          { month: 'Apr', value: 4500, previous: 4000 },
          { month: 'May', value: 6000, previous: 5200 },
          { month: 'Jun', value: 5500, previous: 5000 },
        ];
      case 'pie':
        return [
          { name: 'Category A', value: 400 },
          { name: 'Category B', value: 300 },
          { name: 'Category C', value: 200 },
          { name: 'Category D', value: 100 },
        ];
      case 'area':
        return [
          { date: 'Week 1', desktop: 4000, mobile: 2400 },
          { date: 'Week 2', desktop: 3000, mobile: 1398 },
          { date: 'Week 3', desktop: 2000, mobile: 9800 },
          { date: 'Week 4', desktop: 2780, mobile: 3908 },
          { date: 'Week 5', desktop: 1890, mobile: 4800 },
          { date: 'Week 6', desktop: 2390, mobile: 3800 },
        ];
      default:
        return [];
    }
  }

  detectChartType(data: any[]): ChartConfig['type'] {
    if (!data || data.length === 0) return 'bar';

    const firstItem = data[0];
    const keys = Object.keys(firstItem);
    const numericKeys = keys.filter(k => typeof firstItem[k] === 'number');

    // Check for time-based data
    const hasTimeKey = keys.some(k =>
      ['date', 'time', 'month', 'year', 'week', 'day'].includes(k.toLowerCase())
    );

    if (hasTimeKey) {
      return numericKeys.length > 1 ? 'area' : 'line';
    }

    // Check for categorical data with single value
    if (numericKeys.length === 1 && data.length <= 6) {
      return 'pie';
    }

    return 'bar';
  }
}

export const chartService = new ChartService();
