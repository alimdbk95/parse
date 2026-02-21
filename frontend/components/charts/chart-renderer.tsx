'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Pencil, X, Check, Plus, Trash2, RotateCcw } from 'lucide-react';

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
  const chartRef = useRef<HighchartsReact.RefObject>(null);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableData, setEditableData] = useState<any[]>([]);
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

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

  // Theme colors based on background
  const bgColor = background === 'light' ? '#ffffff' : background === 'dark' ? '#18181b' : 'transparent';
  const textColor = background === 'light' ? '#18181b' : '#a1a1aa';
  const gridColor = background === 'light' ? '#e4e4e7' : '#27272a';

  // Use editable data in edit mode, otherwise original data
  const chartData = isEditMode && editableData.length > 0 ? editableData : data;

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
    const firstDataItem = editableData[0] || data[0];
    if (firstDataItem) {
      Object.keys(firstDataItem).forEach(key => {
        newRow[key] = typeof firstDataItem[key] === 'number' ? 0 : '';
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
  };

  const handleCancelEdit = () => {
    setEditableData([]);
    setIsEditMode(false);
    setEditingCell(null);
  };

  const handleResetZoom = () => {
    if (chartRef.current?.chart) {
      chartRef.current.chart.zoomOut();
      setIsZoomed(false);
    }
  };

  // Build Highcharts options based on chart type
  const getChartOptions = (): Highcharts.Options => {
    const categories = chartData.map(item => String(item[xKey]));

    const baseOptions: Highcharts.Options = {
      chart: {
        backgroundColor: bgColor,
        style: {
          fontFamily: 'Inter, system-ui, sans-serif',
        },
        zooming: enableZoom && type !== 'pie' ? {
          type: 'x',
          resetButton: {
            theme: {
              style: {
                display: 'none', // We'll use our own reset button
              },
            },
          },
        } : undefined,
        events: {
          selection: function(event) {
            if (event.resetSelection) {
              setIsZoomed(false);
            } else {
              setIsZoomed(true);
            }
            return true;
          },
        },
      },
      title: {
        text: undefined,
      },
      credits: {
        enabled: false,
      },
      colors: colors,
      legend: {
        enabled: showLegend,
        itemStyle: {
          color: textColor,
          fontWeight: 'normal',
        },
        itemHoverStyle: {
          color: background === 'light' ? '#000000' : '#ffffff',
        },
      },
      tooltip: {
        backgroundColor: background === 'light' ? '#ffffff' : '#27272a',
        borderColor: gridColor,
        borderRadius: 8,
        style: {
          color: background === 'light' ? '#18181b' : '#ffffff',
        },
        shadow: {
          color: 'rgba(0, 0, 0, 0.2)',
          offsetX: 0,
          offsetY: 2,
          width: 8,
        },
      },
      xAxis: {
        categories: type !== 'scatter' ? categories : undefined,
        labels: {
          style: {
            color: textColor,
            fontSize: '12px',
          },
        },
        lineColor: gridColor,
        tickColor: gridColor,
        gridLineColor: showGrid ? gridColor : 'transparent',
      },
      yAxis: {
        title: {
          text: undefined,
        },
        labels: {
          style: {
            color: textColor,
            fontSize: '12px',
          },
        },
        gridLineColor: showGrid ? gridColor : 'transparent',
      },
      plotOptions: {
        series: {
          animation: {
            duration: 500,
          },
        },
        bar: {
          borderRadius: 4,
        },
        column: {
          borderRadius: 4,
        },
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          dataLabels: {
            enabled: true,
            format: '{point.name}: {point.percentage:.0f}%',
            style: {
              color: textColor,
              textOutline: 'none',
            },
          },
          innerSize: '60%',
        },
        area: {
          fillOpacity: 0.3,
        },
      },
    };

    // Build series based on chart type
    let series: Highcharts.SeriesOptionsType[] = [];

    switch (type) {
      case 'bar':
        series = yKeys.map((key, index) => ({
          type: 'column' as const,
          name: key,
          data: chartData.map(item => item[key]),
          color: colors[index % colors.length],
        }));
        break;

      case 'line':
        series = yKeys.map((key, index) => ({
          type: 'line' as const,
          name: key,
          data: chartData.map(item => item[key]),
          color: colors[index % colors.length],
          marker: {
            enabled: true,
            radius: 4,
            fillColor: colors[index % colors.length],
          },
        }));
        break;

      case 'area':
        series = yKeys.map((key, index) => ({
          type: 'area' as const,
          name: key,
          data: chartData.map(item => item[key]),
          color: colors[index % colors.length],
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, Highcharts.color(colors[index % colors.length]).setOpacity(0.4).get('rgba') as string],
              [1, Highcharts.color(colors[index % colors.length]).setOpacity(0.05).get('rgba') as string],
            ],
          },
        }));
        break;

      case 'pie':
        const valueKey = yKeys[0] || 'value';
        series = [{
          type: 'pie' as const,
          name: valueKey,
          data: chartData.map((item, index) => ({
            name: String(item[xKey]),
            y: item[valueKey],
            color: colors[index % colors.length],
          })),
        }];
        break;

      case 'scatter':
        if (yKeys.length >= 2) {
          series = [{
            type: 'scatter' as const,
            name: 'Data',
            data: chartData.map((item, index) => ({
              x: item[yKeys[0]],
              y: item[yKeys[1]],
              color: colors[index % colors.length],
            })),
          }];
          // Override xAxis for scatter
          baseOptions.xAxis = {
            title: {
              text: yKeys[0],
              style: { color: textColor },
            },
            labels: {
              style: {
                color: textColor,
                fontSize: '12px',
              },
            },
            gridLineColor: showGrid ? gridColor : 'transparent',
          };
          baseOptions.yAxis = {
            title: {
              text: yKeys[1],
              style: { color: textColor },
            },
            labels: {
              style: {
                color: textColor,
                fontSize: '12px',
              },
            },
            gridLineColor: showGrid ? gridColor : 'transparent',
          };
        }
        break;
    }

    return {
      ...baseOptions,
      series,
    };
  };

  // Render editable data table
  const renderDataTable = () => {
    if (!isEditMode || !editableData || editableData.length === 0 || !editableData[0]) return null;

    const tableKeys = Object.keys(editableData[0]);
    if (tableKeys.length === 0) return null;

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
                <th className="px-3 py-2 text-left text-xs font-medium text-foreground-secondary uppercase tracking-wider border-b border-border w-10">
                </th>
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
                              } else if (e.key === 'Tab') {
                                e.preventDefault();
                                const currentKeyIndex = tableKeys.indexOf(key);
                                const nextKey = tableKeys[currentKeyIndex + 1];
                                const prevKey = tableKeys[currentKeyIndex - 1];
                                if (e.shiftKey && prevKey) {
                                  setEditingCell({ row: rowIndex, col: prevKey });
                                } else if (!e.shiftKey && nextKey) {
                                  setEditingCell({ row: rowIndex, col: nextKey });
                                } else if (!e.shiftKey && rowIndex < editableData.length - 1) {
                                  setEditingCell({ row: rowIndex + 1, col: tableKeys[0] });
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

  const options = getChartOptions();

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
                onClick={handleResetZoom}
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
        <HighchartsReact
          highcharts={Highcharts}
          options={options}
          ref={chartRef}
          containerProps={{ style: { height: '100%', width: '100%' } }}
        />
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
