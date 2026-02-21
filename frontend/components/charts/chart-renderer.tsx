'use client';

import { useState, useCallback, useEffect } from 'react';
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
import { ZoomIn, ZoomOut, RotateCcw, Pencil, X, Check, Plus, Trash2 } from 'lucide-react';

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
  onDataChange?: (newData: any[]) => void;
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
  enableEdit = true,
  onDataChange,
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

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableData, setEditableData] = useState<any[]>([]);
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);

  // Initialize editable data when entering edit mode
  useEffect(() => {
    if (isEditMode && data) {
      setEditableData(JSON.parse(JSON.stringify(data)));
    }
  }, [isEditMode, data]);

  if (!data || !Array.isArray(data) || data.length === 0 || !data[0]) {
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
  if (!firstItem || typeof firstItem !== 'object') {
    return (
      <div
        className="flex items-center justify-center text-foreground-tertiary"
        style={{ height }}
      >
        Invalid data format
      </div>
    );
  }

  const keys = Object.keys(firstItem);
  if (keys.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-foreground-tertiary"
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  const xKey = keys.find((k) => typeof firstItem[k] === 'string') || keys[0];
  const yKeys = keys.filter((k) => typeof firstItem[k] === 'number');

  const bgColor = background === 'light' ? '#ffffff' : background === 'dark' ? '#18181b' : 'transparent';
  const textColor = background === 'light' ? '#18181b' : '#a1a1aa';
  const gridColor = background === 'light' ? '#e4e4e7' : '#27272a';

  // Use editable data in edit mode, zoomed data if zoomed, otherwise original data
  // Make sure we fall back to original data if editableData is empty
  const chartData = isEditMode && editableData.length > 0 ? editableData : (zoomedData || data);

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

  // Edit mode handlers
  const handleCellChange = (rowIndex: number, key: string, value: string) => {
    setEditableData(prev => {
      if (!prev || !prev[rowIndex]) return prev;
      const newData = [...prev];
      const isNumeric = firstItem && typeof firstItem[key] === 'number';
      newData[rowIndex] = {
        ...newData[rowIndex],
        [key]: isNumeric ? (parseFloat(value) || 0) : value,
      };
      return newData;
    });
  };

  const handleAddRow = () => {
    const newRow: any = {};
    const firstItem = editableData[0] || data[0];
    if (firstItem) {
      Object.keys(firstItem).forEach(key => {
        newRow[key] = typeof firstItem[key] === 'number' ? 0 : '';
      });
    }
    setEditableData(prev => [...prev, newRow]);
  };

  const handleDeleteRow = (rowIndex: number) => {
    setEditableData(prev => prev.filter((_, i) => i !== rowIndex));
  };

  const handleApplyChanges = () => {
    if (onDataChange) {
      onDataChange(editableData);
    }
    setIsEditMode(false);
    // Reset zoom when data changes
    setZoomedData(null);
    setZoomState({
      left: 'dataMin',
      right: 'dataMax',
      refAreaLeft: '',
      refAreaRight: '',
      isZooming: false,
    });
  };

  const handleCancelEdit = () => {
    setEditableData([]);
    setIsEditMode(false);
    setEditingCell(null);
  };

  // Render editable data table
  const renderDataTable = () => {
    if (!isEditMode || !editableData || editableData.length === 0 || !editableData[0]) return null;

    const keys = Object.keys(editableData[0]);
    if (keys.length === 0) return null;

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
                {keys.map((key) => (
                  <th
                    key={key}
                    className="px-3 py-2 text-left text-xs font-medium text-foreground-secondary uppercase tracking-wider border-b border-border"
                  >
                    {key}
                  </th>
                ))}
                <th className="px-3 py-2 text-left text-xs font-medium text-foreground-secondary uppercase tracking-wider border-b border-border w-10">

                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {editableData.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-background-secondary/50">
                  {keys.map((key) => {
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
                              } else if (e.key === 'Tab') {
                                e.preventDefault();
                                const currentKeyIndex = keys.indexOf(key);
                                const nextKey = keys[currentKeyIndex + 1];
                                const prevKey = keys[currentKeyIndex - 1];
                                if (e.shiftKey && prevKey) {
                                  setEditingCell({ row: rowIndex, col: prevKey });
                                } else if (!e.shiftKey && nextKey) {
                                  setEditingCell({ row: rowIndex, col: nextKey });
                                } else if (!e.shiftKey && rowIndex < editableData.length - 1) {
                                  setEditingCell({ row: rowIndex + 1, col: keys[0] });
                                }
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

        {/* Zoom controls */}
        {enableZoom && type !== 'pie' && !isEditMode && (
          <>
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
          </>
        )}

        {/* Edit mode indicator */}
        {isEditMode && (
          <div className="px-2 py-1 rounded-md bg-primary/20 text-xs text-primary font-medium">
            Editing
          </div>
        )}
      </div>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {chart}
        </ResponsiveContainer>
      </div>

      {/* Zoom instructions */}
      {enableZoom && type !== 'pie' && !isZoomed && !isEditMode && (
        <p className="text-center text-xs text-foreground-tertiary mt-1 opacity-60">
          Click and drag on the chart to zoom in
        </p>
      )}

      {/* Editable Data Table */}
      {renderDataTable()}
    </div>
  );
}
