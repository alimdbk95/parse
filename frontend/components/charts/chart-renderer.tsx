'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Pencil, X, Check, Plus, Trash2, RotateCcw, MessageSquare, Send } from 'lucide-react';
import { api } from '@/lib/api';

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

interface Annotation {
  id: string;
  content: string;
  dataIndex: number;
  dataKey?: string;
  color?: string;
  createdBy?: { id: string; name: string; avatar?: string };
  createdAt?: string;
}

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
  const chartRef = useRef<HighchartsReact.RefObject>(null);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableData, setEditableData] = useState<any[]>([]);
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  // Annotations state
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [addingAnnotation, setAddingAnnotation] = useState<{ dataIndex: number; dataKey?: string } | null>(null);
  const [newAnnotationText, setNewAnnotationText] = useState('');
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);

  // Initialize editable data when entering edit mode
  useEffect(() => {
    if (isEditMode && data) {
      setEditableData(JSON.parse(JSON.stringify(data)));
    }
  }, [isEditMode, data]);

  // Fetch annotations when chart has an ID and annotations are enabled
  useEffect(() => {
    if (enableAnnotations && chartId) {
      fetchAnnotations();
    }
  }, [enableAnnotations, chartId]);

  const fetchAnnotations = async () => {
    if (!chartId) return;
    try {
      const { annotations: fetchedAnnotations } = await api.getChartAnnotations(chartId);
      setAnnotations(fetchedAnnotations);
    } catch (error) {
      console.error('Failed to fetch annotations:', error);
    }
  };

  const handleAddAnnotation = async () => {
    if (!chartId || !addingAnnotation || !newAnnotationText.trim()) return;

    try {
      const { annotation } = await api.createChartAnnotation(chartId, {
        content: newAnnotationText,
        dataIndex: addingAnnotation.dataIndex,
        dataKey: addingAnnotation.dataKey,
      });
      setAnnotations([...annotations, annotation]);
      setAddingAnnotation(null);
      setNewAnnotationText('');
    } catch (error) {
      console.error('Failed to add annotation:', error);
    }
  };

  const handleDeleteAnnotation = async (annotationId: string) => {
    try {
      await api.deleteChartAnnotation(annotationId);
      setAnnotations(annotations.filter((a) => a.id !== annotationId));
      setSelectedAnnotation(null);
    } catch (error) {
      console.error('Failed to delete annotation:', error);
    }
  };

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
          point: {
            events: {
              click: function (this: Highcharts.Point) {
                if (enableAnnotations && showAnnotations && chartId) {
                  setAddingAnnotation({
                    dataIndex: this.index,
                    dataKey: this.series?.name,
                  });
                }
              },
            },
          },
          cursor: enableAnnotations && showAnnotations ? 'pointer' : 'default',
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
        {/* Annotations button */}
        {enableAnnotations && chartId && !isEditMode && (
          <button
            onClick={() => setShowAnnotations(!showAnnotations)}
            className={`p-1.5 rounded-md transition-colors ${
              showAnnotations
                ? 'bg-primary text-white'
                : 'bg-background-tertiary/80 hover:bg-background-tertiary text-foreground-secondary hover:text-foreground'
            }`}
            title={showAnnotations ? 'Hide annotations' : 'Show annotations'}
          >
            <MessageSquare className="h-4 w-4" />
            {annotations.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 text-[10px] flex items-center justify-center bg-primary text-white rounded-full">
                {annotations.length}
              </span>
            )}
          </button>
        )}

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

      {/* Annotations Panel */}
      {enableAnnotations && showAnnotations && chartId && (
        <div className="mt-3 border border-border rounded-lg overflow-hidden">
          <div className="bg-background-secondary px-3 py-2 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium text-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Annotations
            </span>
            <span className="text-xs text-foreground-tertiary">
              Click on data points to add
            </span>
          </div>

          {/* Add annotation form */}
          {addingAnnotation && (
            <div className="p-3 border-b border-border bg-background-tertiary/50">
              <p className="text-xs text-foreground-secondary mb-2">
                Adding annotation for data point {addingAnnotation.dataIndex + 1}
                {addingAnnotation.dataKey && ` (${addingAnnotation.dataKey})`}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAnnotationText}
                  onChange={(e) => setNewAnnotationText(e.target.value)}
                  placeholder="Enter your annotation..."
                  className="flex-1 px-3 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddAnnotation();
                    if (e.key === 'Escape') {
                      setAddingAnnotation(null);
                      setNewAnnotationText('');
                    }
                  }}
                />
                <button
                  onClick={handleAddAnnotation}
                  disabled={!newAnnotationText.trim()}
                  className="p-1.5 rounded bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setAddingAnnotation(null);
                    setNewAnnotationText('');
                  }}
                  className="p-1.5 rounded bg-background-tertiary text-foreground-secondary hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Annotations list */}
          <div className="max-h-48 overflow-y-auto">
            {annotations.length === 0 ? (
              <div className="p-4 text-center text-sm text-foreground-tertiary">
                No annotations yet. Click on a data point to add one.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {annotations.map((annotation) => (
                  <div
                    key={annotation.id}
                    className={`p-3 hover:bg-background-tertiary/50 cursor-pointer ${
                      selectedAnnotation === annotation.id ? 'bg-background-tertiary/50' : ''
                    }`}
                    onClick={() =>
                      setSelectedAnnotation(
                        selectedAnnotation === annotation.id ? null : annotation.id
                      )
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{annotation.content}</p>
                        <p className="text-xs text-foreground-tertiary mt-1">
                          Point {annotation.dataIndex + 1}
                          {annotation.dataKey && ` • ${annotation.dataKey}`}
                          {annotation.createdBy && ` • by ${annotation.createdBy.name}`}
                        </p>
                      </div>
                      {selectedAnnotation === annotation.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAnnotation(annotation.id);
                          }}
                          className="p-1 rounded text-foreground-tertiary hover:text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
