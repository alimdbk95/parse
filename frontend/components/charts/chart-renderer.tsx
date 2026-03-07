'use client';

import { useState, useEffect, useRef } from 'react';
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
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);

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

  // Fetch annotations when chart has an ID and annotations are enabled
  useEffect(() => {
    if (enableAnnotations && chartId) {
      fetchAnnotations();
    }
  }, [enableAnnotations, chartId]);

  // Initialize Highcharts
  useEffect(() => {
    if (!isClient || !chartContainerRef.current) return;
    if (!type || !data || !Array.isArray(data) || data.length === 0) {
      setChartError('No data available');
      return;
    }

    let Highcharts: any;
    try {
      Highcharts = require('highcharts');
    } catch (e) {
      setChartError('Failed to load chart library');
      return;
    }

    const firstItem = data[0];
    if (!firstItem || typeof firstItem !== 'object') {
      setChartError('Invalid data format');
      return;
    }

    const keys = Object.keys(firstItem);
    if (keys.length === 0) {
      setChartError('No data available');
      return;
    }

    const xKey = keys.find((k) => typeof firstItem[k] === 'string') || keys[0];
    const yKeys = keys.filter((k) => typeof firstItem[k] === 'number');

    // Theme colors based on background
    const bgColor = background === 'light' ? '#ffffff' : background === 'dark' ? '#18181b' : 'transparent';
    const textColor = background === 'light' ? '#18181b' : '#a1a1aa';
    const gridColor = background === 'light' ? '#e4e4e7' : '#27272a';

    const chartData = isEditMode && editableData.length > 0 ? editableData : data;
    const categories = chartData.map((item: any) => String(item[xKey]));

    // Build series based on chart type
    let series: any[] = [];

    switch (type) {
      case 'bar':
        series = yKeys.map((key, index) => ({
          type: 'column',
          name: key,
          data: chartData.map((item: any) => item[key]),
          color: colors[index % colors.length],
        }));
        break;

      case 'line':
        series = yKeys.map((key, index) => ({
          type: 'line',
          name: key,
          data: chartData.map((item: any) => item[key]),
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
          type: 'area',
          name: key,
          data: chartData.map((item: any) => item[key]),
          color: colors[index % colors.length],
          fillOpacity: 0.3,
        }));
        break;

      case 'pie':
        const valueKey = yKeys[0] || 'value';
        series = [{
          type: 'pie',
          name: valueKey,
          data: chartData.map((item: any, index: number) => ({
            name: String(item[xKey]),
            y: item[valueKey],
            color: colors[index % colors.length],
          })),
        }];
        break;

      case 'scatter':
        if (yKeys.length >= 2) {
          series = [{
            type: 'scatter',
            name: 'Data',
            data: chartData.map((item: any, index: number) => ({
              x: item[yKeys[0]],
              y: item[yKeys[1]],
              color: colors[index % colors.length],
            })),
          }];
        }
        break;
    }

    try {
      // Destroy existing chart
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }

      // Create new chart
      chartInstanceRef.current = Highcharts.chart(chartContainerRef.current, {
        chart: {
          backgroundColor: bgColor,
          style: {
            fontFamily: 'Inter, system-ui, sans-serif',
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
        },
        tooltip: {
          backgroundColor: background === 'light' ? '#ffffff' : '#27272a',
          borderColor: gridColor,
          borderRadius: 8,
          style: {
            color: background === 'light' ? '#18181b' : '#ffffff',
          },
        },
        xAxis: type !== 'scatter' ? {
          categories: categories,
          labels: {
            style: {
              color: textColor,
              fontSize: '12px',
            },
          },
          lineColor: gridColor,
          tickColor: gridColor,
          gridLineColor: showGrid ? gridColor : 'transparent',
        } : {
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
        },
        yAxis: type !== 'scatter' ? {
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
        } : {
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
        },
        plotOptions: {
          series: {
            animation: {
              duration: 500,
            },
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
        series: series,
      });

      setChartError(null);
    } catch (error) {
      console.error('Chart creation error:', error);
      setChartError('Failed to render chart');
    }

    // Cleanup
    return () => {
      if (chartInstanceRef.current) {
        try {
          chartInstanceRef.current.destroy();
        } catch (e) {
          // Ignore cleanup errors
        }
        chartInstanceRef.current = null;
      }
    };
  }, [isClient, type, data, editableData, isEditMode, colors, showLegend, showGrid, background]);

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

  // Edit mode handlers
  const handleCellChange = (rowIndex: number, key: string, value: string) => {
    const firstItem = data[0];
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

  // Show loading or error state
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

        {/* Edit mode indicator */}
        {isEditMode && (
          <div className="px-2 py-1 rounded-md bg-primary/20 text-xs text-primary font-medium">
            Editing
          </div>
        )}
      </div>

      <div ref={chartContainerRef} style={{ height, width: '100%' }} />

      {/* Editable Data Table */}
      {renderDataTable()}
    </div>
  );
}
