'use client';

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

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

interface ChartRendererProps {
  type: 'bar' | 'line' | 'pie' | 'area' | 'scatter';
  data: any[];
  height?: number;
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  background?: 'light' | 'dark' | 'transparent';
}

export function ChartRenderer({
  type,
  data,
  height = 300,
  colors = defaultColors,
  showLegend = true,
  showGrid = true,
  background = 'dark',
}: ChartRendererProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-foreground-tertiary"
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  const firstItem = data[0];
  const keys = Object.keys(firstItem);
  const xKey = keys.find((k) => typeof firstItem[k] === 'string') || keys[0];
  const yKeys = keys.filter((k) => typeof firstItem[k] === 'number');

  const bgColor = background === 'light' ? '#ffffff' : background === 'dark' ? '#18181b' : 'transparent';
  const textColor = background === 'light' ? '#18181b' : '#a1a1aa';
  const gridColor = background === 'light' ? '#e4e4e7' : '#27272a';

  const commonProps = {
    data,
    margin: { top: 10, right: 30, left: 0, bottom: 0 },
  };

  const tooltipStyle = {
    backgroundColor: background === 'light' ? '#ffffff' : '#27272a',
    border: `1px solid ${gridColor}`,
    borderRadius: '8px',
    color: background === 'light' ? '#18181b' : '#ffffff',
  };

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />}
            <XAxis dataKey={xKey} stroke={textColor} fontSize={12} />
            <YAxis stroke={textColor} fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            {showLegend && <Legend />}
            {yKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[index % colors.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />}
            <XAxis dataKey={xKey} stroke={textColor} fontSize={12} />
            <YAxis stroke={textColor} fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            {showLegend && <Legend />}
            {yKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ fill: colors[index % colors.length], strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />}
            <XAxis dataKey={xKey} stroke={textColor} fontSize={12} />
            <YAxis stroke={textColor} fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            {showLegend && <Legend />}
            {yKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                fill={colors[index % colors.length]}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        );

      case 'pie':
        const pieData = data.map((item, index) => ({
          ...item,
          fill: colors[index % colors.length],
        }));
        const valueKey = yKeys[0] || 'value';

        return (
          <PieChart>
            <Pie
              data={pieData}
              dataKey={valueKey}
              nameKey={xKey}
              cx="50%"
              cy="50%"
              outerRadius={100}
              innerRadius={60}
              paddingAngle={2}
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
              labelLine={false}
            >
              {pieData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            {showLegend && <Legend />}
          </PieChart>
        );

      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />}
            <XAxis dataKey={yKeys[0]} name={yKeys[0]} stroke={textColor} fontSize={12} />
            <YAxis dataKey={yKeys[1]} name={yKeys[1]} stroke={textColor} fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
            {showLegend && <Legend />}
            <Scatter name="Data" data={data} fill={colors[0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Scatter>
          </ScatterChart>
        );

      default:
        return null;
    }
  };

  const chart = renderChart();

  if (!chart) {
    return (
      <div style={{ height }} className="flex items-center justify-center rounded-lg bg-background-tertiary">
        <p className="text-foreground-tertiary">Unsupported chart type</p>
      </div>
    );
  }

  return (
    <div
      data-chart-container
      style={{ height, backgroundColor: bgColor }}
      className="rounded-lg p-2"
    >
      <ResponsiveContainer width="100%" height="100%">
        {chart}
      </ResponsiveContainer>
    </div>
  );
}
