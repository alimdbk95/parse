'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Pencil, X, Check, Plus, Trash2 } from 'lucide-react';
import dynamic from 'next/dynamic';

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
  enableEdit?: boolean;
  enableAnnotations?: boolean;
  chartId?: string;
  onDataChange?: (newData: any[]) => void;
}

// Simple SVG-based chart component that doesn't depend on external libraries
function SimpleChart({
  type,
  data,
  height = 300,
  colors = defaultColors,
  background = 'dark',
}: {
  type: string;
  data: any[];
  height: number;
  colors: string[];
  background: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: height });

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setDimensions({
            width: entry.contentRect.width || 400,
            height: height,
          });
        }
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [height]);

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div
        ref={containerRef}
        className="flex items-center justify-center text-foreground-tertiary"
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  const bgColor = background === 'light' ? '#ffffff' : background === 'dark' ? '#18181b' : 'transparent';
  const textColor = background === 'light' ? '#18181b' : '#a1a1aa';
  const gridColor = background === 'light' ? '#e4e4e7' : '#27272a';

  // Get data keys
  const firstItem = data[0];
  const keys = Object.keys(firstItem);
  const nameKey = keys.find((k) => typeof firstItem[k] === 'string') || keys[0];
  const valueKey = keys.find((k) => typeof firstItem[k] === 'number') || 'value';

  // Get all numeric keys for multi-series
  const numericKeys = keys.filter((k) => typeof firstItem[k] === 'number');
  const maxValue = Math.max(
    ...data.flatMap((item) => numericKeys.map((k) => Number(item[k]) || 0))
  );

  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = dimensions.width - padding.left - padding.right;
  const chartHeight = dimensions.height - padding.top - padding.bottom;

  const renderBarChart = () => {
    const barWidth = chartWidth / data.length * 0.7;
    const gap = chartWidth / data.length * 0.3;
    const seriesCount = numericKeys.length || 1;
    const singleBarWidth = barWidth / seriesCount;

    return (
      <g>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={padding.top + chartHeight * (1 - ratio)}
              x2={padding.left + chartWidth}
              y2={padding.top + chartHeight * (1 - ratio)}
              stroke={gridColor}
              strokeWidth={1}
            />
            <text
              x={padding.left - 8}
              y={padding.top + chartHeight * (1 - ratio) + 4}
              fill={textColor}
              fontSize={10}
              textAnchor="end"
            >
              {Math.round(maxValue * ratio)}
            </text>
          </g>
        ))}

        {/* Bars */}
        {data.map((item, i) => {
          const x = padding.left + i * (barWidth + gap) + gap / 2;

          return (
            <g key={i}>
              {numericKeys.length > 0 ? (
                numericKeys.map((key, j) => {
                  const value = Number(item[key]) || 0;
                  const barHeight = (value / maxValue) * chartHeight;

                  return (
                    <rect
                      key={j}
                      x={x + j * singleBarWidth}
                      y={padding.top + chartHeight - barHeight}
                      width={singleBarWidth - 2}
                      height={barHeight}
                      fill={colors[j % colors.length]}
                      rx={3}
                    />
                  );
                })
              ) : (
                <rect
                  x={x}
                  y={padding.top + chartHeight - (Number(item[valueKey] || 0) / maxValue) * chartHeight}
                  width={barWidth}
                  height={(Number(item[valueKey] || 0) / maxValue) * chartHeight}
                  fill={colors[i % colors.length]}
                  rx={3}
                />
              )}

              {/* X-axis label */}
              <text
                x={x + barWidth / 2}
                y={dimensions.height - 8}
                fill={textColor}
                fontSize={10}
                textAnchor="middle"
              >
                {String(item[nameKey] || '').slice(0, 10)}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  const renderLineChart = () => {
    const pointGap = chartWidth / (data.length - 1 || 1);

    return (
      <g>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={padding.top + chartHeight * (1 - ratio)}
              x2={padding.left + chartWidth}
              y2={padding.top + chartHeight * (1 - ratio)}
              stroke={gridColor}
              strokeWidth={1}
            />
            <text
              x={padding.left - 8}
              y={padding.top + chartHeight * (1 - ratio) + 4}
              fill={textColor}
              fontSize={10}
              textAnchor="end"
            >
              {Math.round(maxValue * ratio)}
            </text>
          </g>
        ))}

        {/* Lines for each series */}
        {(numericKeys.length > 0 ? numericKeys : [valueKey]).map((key, seriesIndex) => {
          const points = data.map((item, i) => ({
            x: padding.left + i * pointGap,
            y: padding.top + chartHeight - (Number(item[key] || 0) / maxValue) * chartHeight,
          }));

          const pathD = points
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
            .join(' ');

          return (
            <g key={seriesIndex}>
              <path
                d={pathD}
                fill="none"
                stroke={colors[seriesIndex % colors.length]}
                strokeWidth={2}
              />
              {points.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={4}
                  fill={colors[seriesIndex % colors.length]}
                />
              ))}
            </g>
          );
        })}

        {/* X-axis labels */}
        {data.map((item, i) => (
          <text
            key={i}
            x={padding.left + i * pointGap}
            y={dimensions.height - 8}
            fill={textColor}
            fontSize={10}
            textAnchor="middle"
          >
            {String(item[nameKey] || '').slice(0, 8)}
          </text>
        ))}
      </g>
    );
  };

  const renderAreaChart = () => {
    const pointGap = chartWidth / (data.length - 1 || 1);

    return (
      <g>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={padding.top + chartHeight * (1 - ratio)}
              x2={padding.left + chartWidth}
              y2={padding.top + chartHeight * (1 - ratio)}
              stroke={gridColor}
              strokeWidth={1}
            />
            <text
              x={padding.left - 8}
              y={padding.top + chartHeight * (1 - ratio) + 4}
              fill={textColor}
              fontSize={10}
              textAnchor="end"
            >
              {Math.round(maxValue * ratio)}
            </text>
          </g>
        ))}

        {/* Area for each series */}
        {(numericKeys.length > 0 ? numericKeys : [valueKey]).map((key, seriesIndex) => {
          const points = data.map((item, i) => ({
            x: padding.left + i * pointGap,
            y: padding.top + chartHeight - (Number(item[key] || 0) / maxValue) * chartHeight,
          }));

          const areaPathD =
            `M ${points[0].x} ${padding.top + chartHeight} ` +
            points.map((p) => `L ${p.x} ${p.y}`).join(' ') +
            ` L ${points[points.length - 1].x} ${padding.top + chartHeight} Z`;

          return (
            <g key={seriesIndex}>
              <path
                d={areaPathD}
                fill={colors[seriesIndex % colors.length]}
                fillOpacity={0.3}
              />
              <path
                d={points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                fill="none"
                stroke={colors[seriesIndex % colors.length]}
                strokeWidth={2}
              />
            </g>
          );
        })}

        {/* X-axis labels */}
        {data.map((item, i) => (
          <text
            key={i}
            x={padding.left + i * pointGap}
            y={dimensions.height - 8}
            fill={textColor}
            fontSize={10}
            textAnchor="middle"
          >
            {String(item[nameKey] || '').slice(0, 8)}
          </text>
        ))}
      </g>
    );
  };

  const renderPieChart = () => {
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const radius = Math.min(chartWidth, chartHeight) / 2 - 20;
    const innerRadius = radius * 0.6;

    const total = data.reduce((sum, item) => sum + (Number(item[valueKey]) || 0), 0);
    let currentAngle = -Math.PI / 2;

    return (
      <g>
        {data.map((item, i) => {
          const value = Number(item[valueKey]) || 0;
          const angle = (value / total) * 2 * Math.PI;
          const startAngle = currentAngle;
          const endAngle = currentAngle + angle;
          currentAngle = endAngle;

          const x1 = centerX + radius * Math.cos(startAngle);
          const y1 = centerY + radius * Math.sin(startAngle);
          const x2 = centerX + radius * Math.cos(endAngle);
          const y2 = centerY + radius * Math.sin(endAngle);
          const x1Inner = centerX + innerRadius * Math.cos(startAngle);
          const y1Inner = centerY + innerRadius * Math.sin(startAngle);
          const x2Inner = centerX + innerRadius * Math.cos(endAngle);
          const y2Inner = centerY + innerRadius * Math.sin(endAngle);

          const largeArcFlag = angle > Math.PI ? 1 : 0;

          const pathD = `
            M ${x1} ${y1}
            A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
            L ${x2Inner} ${y2Inner}
            A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1Inner} ${y1Inner}
            Z
          `;

          // Label position
          const midAngle = (startAngle + endAngle) / 2;
          const labelRadius = radius + 20;
          const labelX = centerX + labelRadius * Math.cos(midAngle);
          const labelY = centerY + labelRadius * Math.sin(midAngle);
          const percentage = ((value / total) * 100).toFixed(0);

          return (
            <g key={i}>
              <path d={pathD} fill={colors[i % colors.length]} />
              {angle > 0.2 && (
                <text
                  x={labelX}
                  y={labelY}
                  fill={textColor}
                  fontSize={11}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {String(item[nameKey] || '').slice(0, 8)} ({percentage}%)
                </text>
              )}
            </g>
          );
        })}
      </g>
    );
  };

  const renderScatterChart = () => {
    if (numericKeys.length < 2) {
      return (
        <text x={dimensions.width / 2} y={dimensions.height / 2} fill={textColor} textAnchor="middle">
          Scatter plots require at least 2 numeric columns
        </text>
      );
    }

    const xKey = numericKeys[0];
    const yKey = numericKeys[1];
    const maxX = Math.max(...data.map((item) => Number(item[xKey]) || 0));
    const maxY = Math.max(...data.map((item) => Number(item[yKey]) || 0));

    return (
      <g>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={padding.top + chartHeight * (1 - ratio)}
              x2={padding.left + chartWidth}
              y2={padding.top + chartHeight * (1 - ratio)}
              stroke={gridColor}
              strokeWidth={1}
            />
            <text
              x={padding.left - 8}
              y={padding.top + chartHeight * (1 - ratio) + 4}
              fill={textColor}
              fontSize={10}
              textAnchor="end"
            >
              {Math.round(maxY * ratio)}
            </text>
          </g>
        ))}

        {/* Points */}
        {data.map((item, i) => {
          const x = padding.left + ((Number(item[xKey]) || 0) / maxX) * chartWidth;
          const y = padding.top + chartHeight - ((Number(item[yKey]) || 0) / maxY) * chartHeight;

          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={6}
              fill={colors[i % colors.length]}
              fillOpacity={0.7}
            />
          );
        })}

        {/* X-axis labels */}
        {[0, 0.5, 1].map((ratio, i) => (
          <text
            key={i}
            x={padding.left + chartWidth * ratio}
            y={dimensions.height - 8}
            fill={textColor}
            fontSize={10}
            textAnchor="middle"
          >
            {Math.round(maxX * ratio)}
          </text>
        ))}
      </g>
    );
  };

  return (
    <div ref={containerRef} style={{ width: '100%', height, backgroundColor: bgColor }}>
      <svg width={dimensions.width} height={dimensions.height}>
        {type === 'bar' && renderBarChart()}
        {type === 'line' && renderLineChart()}
        {type === 'area' && renderAreaChart()}
        {type === 'pie' && renderPieChart()}
        {type === 'scatter' && renderScatterChart()}
      </svg>
    </div>
  );
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
  enableEdit = true,
  enableAnnotations = false,
  chartId,
  onDataChange,
}: ChartRendererProps) {
  const [isClient, setIsClient] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableData, setEditableData] = useState<any[]>([]);
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);

  // Set client flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize editable data when entering edit mode
  useEffect(() => {
    if (isEditMode && data) {
      setEditableData(JSON.parse(JSON.stringify(data)));
    }
  }, [isEditMode, data]);

  // Validate data
  useEffect(() => {
    if (!type) {
      setChartError('No chart type specified');
      return;
    }
    if (!data || !Array.isArray(data) || data.length === 0) {
      setChartError('No data available');
      return;
    }
    setChartError(null);
  }, [type, data]);

  // Edit mode handlers
  const handleCellChange = (rowIndex: number, key: string, value: string) => {
    const firstItem = data[0];
    setEditableData((prev) => {
      if (!prev || !prev[rowIndex]) return prev;
      const newData = [...prev];
      const isNumeric = firstItem && typeof firstItem[key] === 'number';
      newData[rowIndex] = {
        ...newData[rowIndex],
        [key]: isNumeric ? parseFloat(value) || 0 : value,
      };
      return newData;
    });
  };

  const handleAddRow = () => {
    const newRow: any = {};
    const firstDataItem = editableData[0] || data[0];
    if (firstDataItem) {
      Object.keys(firstDataItem).forEach((key) => {
        newRow[key] = typeof firstDataItem[key] === 'number' ? 0 : '';
      });
    }
    setEditableData((prev) => [...prev, newRow]);
  };

  const handleDeleteRow = (rowIndex: number) => {
    setEditableData((prev) => prev.filter((_, i) => i !== rowIndex));
  };

  const handleApplyChanges = () => {
    if (onDataChange) {
      onDataChange(editableData);
    }
    setIsEditMode(false);
  };

  const handleCancelEdit = () => {
    setEditableData([]);
    setIsEditMode(false);
    setEditingCell(null);
  };

  // Show loading state
  if (!isClient) {
    return (
      <div
        className="flex items-center justify-center text-foreground-tertiary animate-pulse"
        style={{ height }}
      >
        Loading chart...
      </div>
    );
  }

  // Show error state
  if (chartError) {
    return (
      <div
        className="flex items-center justify-center text-foreground-tertiary"
        style={{ height }}
      >
        {chartError}
      </div>
    );
  }

  // Render editable data table
  const renderDataTable = () => {
    if (!isEditMode || !editableData || editableData.length === 0 || !editableData[0]) return null;

    const tableKeys = Object.keys(editableData[0]);
    if (tableKeys.length === 0) return null;
    const firstItem = data[0];

    return (
      <div className="mt-4 border border-border rounded-lg overflow-hidden">
        <div className="bg-background-secondary px-3 py-2 border-b border-border flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Edit Chart Data</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddRow}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add Row
            </button>
          </div>
        </div>
        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-background-tertiary sticky top-0">
              <tr>
                {tableKeys.map((key) => (
                  <th
                    key={key}
                    className="px-3 py-2 text-left text-xs font-medium text-foreground-secondary uppercase tracking-wider border-b border-border"
                  >
                    {key}
                  </th>
                ))}
                <th className="px-3 py-2 text-left text-xs font-medium text-foreground-secondary uppercase tracking-wider border-b border-border w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {editableData.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-background-secondary/50">
                  {tableKeys.map((key) => {
                    const isEditing = editingCell?.row === rowIndex && editingCell?.col === key;
                    const isNumeric = firstItem && typeof firstItem[key] === 'number';

                    return (
                      <td key={key} className="px-3 py-2">
                        {isEditing ? (
                          <input
                            type={isNumeric ? 'number' : 'text'}
                            value={row[key]}
                            onChange={(e) => handleCellChange(rowIndex, key, e.target.value)}
                            onBlur={() => setEditingCell(null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setEditingCell(null);
                              }
                            }}
                            autoFocus
                            className="w-full px-2 py-1 bg-background border border-primary rounded text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            step={isNumeric ? 'any' : undefined}
                          />
                        ) : (
                          <div
                            onClick={() => setEditingCell({ row: rowIndex, col: key })}
                            className="px-2 py-1 cursor-pointer hover:bg-background-tertiary rounded transition-colors min-h-[28px] flex items-center"
                          >
                            {row[key]}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleDeleteRow(rowIndex)}
                      className="p-1 text-foreground-tertiary hover:text-red-400 transition-colors"
                      title="Delete row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-background-secondary px-3 py-2 border-t border-border flex items-center justify-end gap-2">
          <button
            onClick={handleCancelEdit}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-background-tertiary text-foreground-secondary hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button
            onClick={handleApplyChanges}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            <Check className="h-4 w-4" />
            Apply Changes
          </button>
        </div>
      </div>
    );
  };

  const bgColor = background === 'light' ? '#ffffff' : background === 'dark' ? '#18181b' : 'transparent';
  const chartData = isEditMode && editableData.length > 0 ? editableData : data;

  return (
    <div data-chart-container style={{ backgroundColor: bgColor }} className="rounded-lg p-2 relative">
      {/* Chart Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
        {/* Edit button */}
        {enableEdit && !isEditMode && (
          <button
            onClick={() => setIsEditMode(true)}
            className="p-1.5 rounded-md bg-background-tertiary/80 hover:bg-background-tertiary text-foreground-secondary hover:text-foreground transition-colors"
            title="Edit chart data"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}

        {/* Edit mode indicator */}
        {isEditMode && (
          <div className="px-2 py-1 rounded-md bg-primary/20 text-xs text-primary font-medium">Editing</div>
        )}
      </div>

      <SimpleChart
        type={type}
        data={chartData}
        height={height}
        colors={colors}
        background={background}
      />

      {/* Editable Data Table */}
      {renderDataTable()}
    </div>
  );
}
