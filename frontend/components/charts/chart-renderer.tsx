'use client';

import { useState, useCallback } from 'react';
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
  Brush,
  ReferenceArea,
} from 'recharts';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

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
  enableZoom?: boolean;
}

interface ZoomState {
  left: string | number;
  right: string | number;
  refAreaLeft: string;
  refAreaRight: string;
  isZooming: boolean;
}

export function ChartRenderer({
  type,
  data,
  height = 300,
  colors = defaultColors,
  showLegend = true,
  showGrid = true,
  background = 'dark',
  enableZoom = true,
}: ChartRendererProps) {
  // Zoom state
  const [zoomState, setZoomState] = useState<ZoomState>({
    left: 'dataMin',
    right: 'dataMax',
    refAreaLeft: '',
    refAreaRight: '',
    isZooming: false,
  });
  const [zoomedData, setZoomedData] = useState<any[] | null>(null);

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

  // Use zoomed data if available, otherwise use original data
  const chartData = zoomedData || data;

  const commonProps = {
    data: chartData,
    margin: { top: 10, right: 30, left: 0, bottom: 0 },
  };

  const tooltipStyle = {
    backgroundColor: background === 'light' ? '#ffffff' : '#27272a',
    border: `1px solid ${gridColor}`,
    borderRadius: '8px',
    color: background === 'light' ? '#18181b' : '#ffffff',
  };

  // Zoom handlers
  const handleMouseDown = (e: any) => {
    if (!enableZoom || type === 'pie') return;
    if (e && e.activeLabel) {
      setZoomState(prev => ({ ...prev, refAreaLeft: e.activeLabel, isZooming: true }));
    }
  };

  const handleMouseMove = (e: any) => {
    if (!enableZoom || !zoomState.isZooming) return;
    if (e && e.activeLabel) {
      setZoomState(prev => ({ ...prev, refAreaRight: e.activeLabel }));
    }
  };

  const handleMouseUp = () => {
    if (!enableZoom || !zoomState.isZooming) return;

    const { refAreaLeft, refAreaRight } = zoomState;

    if (refAreaLeft === refAreaRight || refAreaRight === '') {
      setZoomState(prev => ({
        ...prev,
        refAreaLeft: '',
        refAreaRight: '',
        isZooming: false,
      }));
      return;
    }

    // Find indices for zoom range
    let leftIndex = data.findIndex(item => item[xKey] === refAreaLeft);
    let rightIndex = data.findIndex(item => item[xKey] === refAreaRight);

    if (leftIndex > rightIndex) {
      [leftIndex, rightIndex] = [rightIndex, leftIndex];
    }

    // Slice data for zoomed view
    const newZoomedData = data.slice(leftIndex, rightIndex + 1);
    setZoomedData(newZoomedData);

    setZoomState({
      left: refAreaLeft,
      right: refAreaRight,
      refAreaLeft: '',
      refAreaRight: '',
      isZooming: false,
    });
  };

  const handleZoomOut = () => {
    setZoomedData(null);
    setZoomState({
      left: 'dataMin',
      right: 'dataMax',
      refAreaLeft: '',
      refAreaRight: '',
      isZooming: false,
    });
  };

  const isZoomed = zoomedData !== null;

  const renderChart = () => {
    // Common zoom props for cartesian charts
    const zoomProps = enableZoom && type !== 'pie' ? {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
    } : {};

    switch (type) {
      case 'bar':
        return (
          <BarChart {...commonProps} {...zoomProps}>
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
            {enableZoom && zoomState.refAreaLeft && zoomState.refAreaRight && (
              <ReferenceArea
                x1={zoomState.refAreaLeft}
                x2={zoomState.refAreaRight}
                strokeOpacity={0.3}
                fill="#3b82f6"
                fillOpacity={0.3}
              />
            )}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart {...commonProps} {...zoomProps}>
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
            {enableZoom && zoomState.refAreaLeft && zoomState.refAreaRight && (
              <ReferenceArea
                x1={zoomState.refAreaLeft}
                x2={zoomState.refAreaRight}
                strokeOpacity={0.3}
                fill="#3b82f6"
                fillOpacity={0.3}
              />
            )}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps} {...zoomProps}>
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
            {enableZoom && zoomState.refAreaLeft && zoomState.refAreaRight && (
              <ReferenceArea
                x1={zoomState.refAreaLeft}
                x2={zoomState.refAreaRight}
                strokeOpacity={0.3}
                fill="#3b82f6"
                fillOpacity={0.3}
              />
            )}
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
          <ScatterChart {...commonProps} {...zoomProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />}
            <XAxis dataKey={yKeys[0]} name={yKeys[0]} stroke={textColor} fontSize={12} />
            <YAxis dataKey={yKeys[1]} name={yKeys[1]} stroke={textColor} fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
            {showLegend && <Legend />}
            <Scatter name="Data" data={chartData} fill={colors[0]}>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Scatter>
            {enableZoom && zoomState.refAreaLeft && zoomState.refAreaRight && (
              <ReferenceArea
                x1={zoomState.refAreaLeft}
                x2={zoomState.refAreaRight}
                strokeOpacity={0.3}
                fill="#3b82f6"
                fillOpacity={0.3}
              />
            )}
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
      style={{ backgroundColor: bgColor }}
      className="rounded-lg p-2 relative"
    >
      {/* Zoom Controls */}
      {enableZoom && type !== 'pie' && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
          {isZoomed && (
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-md bg-background-tertiary/80 hover:bg-background-tertiary text-foreground-secondary hover:text-foreground transition-colors"
              title="Reset zoom"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          <div className="px-2 py-1 rounded-md bg-background-tertiary/80 text-xs text-foreground-tertiary">
            {isZoomed ? 'Zoomed' : 'Drag to zoom'}
          </div>
        </div>
      )}

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {chart}
        </ResponsiveContainer>
      </div>

      {/* Zoom instructions */}
      {enableZoom && type !== 'pie' && !isZoomed && (
        <p className="text-center text-xs text-foreground-tertiary mt-1 opacity-60">
          Click and drag on the chart to zoom in
        </p>
      )}
    </div>
  );
}
