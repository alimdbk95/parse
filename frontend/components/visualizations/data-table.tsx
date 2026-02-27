'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Table2,
  Plus,
  Trash2,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Hash,
  Type,
  Calendar,
  ToggleLeft,
  Function,
  List,
  MoreVertical,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Menu, MenuItem, MenuDivider } from '@/components/ui/dropdown';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

interface Column {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'formula' | 'select';
  formula?: string;
  width?: number;
  options?: string[];
}

interface DataTableProps {
  tableId?: string;
  documentId?: string;
  onTableCreated?: (table: any) => void;
}

const COLUMN_TYPES = [
  { type: 'text', label: 'Text', icon: Type },
  { type: 'number', label: 'Number', icon: Hash },
  { type: 'date', label: 'Date', icon: Calendar },
  { type: 'boolean', label: 'Checkbox', icon: ToggleLeft },
  { type: 'formula', label: 'Formula', icon: Function },
  { type: 'select', label: 'Select', icon: List },
];

export function DataTable({ tableId, documentId, onTableCreated }: DataTableProps) {
  const [table, setTable] = useState<{
    id: string;
    name: string;
    columns: Column[];
    data: any[][];
    calculatedData: any[][];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [cellValue, setCellValue] = useState('');
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumn, setNewColumn] = useState<Column>({ name: '', type: 'text' });

  useEffect(() => {
    if (tableId) {
      fetchTable();
    } else if (documentId) {
      createTableFromDocument();
    }
  }, [tableId, documentId]);

  const fetchTable = async () => {
    if (!tableId) return;
    setLoading(true);
    try {
      const { table: fetchedTable } = await api.getDataTable(tableId);
      setTable(fetchedTable);
    } catch (error) {
      console.error('Failed to fetch table:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTableFromDocument = async () => {
    if (!documentId) return;
    setLoading(true);
    try {
      const { table: newTable } = await api.createTableFromDocument(documentId);
      const { table: fullTable } = await api.getDataTable(newTable.id);
      setTable(fullTable);
      onTableCreated?.(fullTable);
    } catch (error) {
      console.error('Failed to create table:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = (row: number, col: number) => {
    if (table?.columns[col].type === 'formula') return; // Can't edit formula cells
    setEditingCell({ row, col });
    setCellValue(String(table?.data[row][col] ?? ''));
  };

  const handleCellBlur = async () => {
    if (!editingCell || !table) return;

    const { row, col } = editingCell;
    const column = table.columns[col];

    let value: any = cellValue;
    if (column.type === 'number') {
      value = parseFloat(cellValue) || 0;
    } else if (column.type === 'boolean') {
      value = cellValue === 'true' || cellValue === '1';
    }

    const newData = table.data.map((r, i) =>
      i === row ? r.map((c, j) => (j === col ? value : c)) : r
    );

    try {
      const { table: updatedTable } = await api.updateTableData(table.id, newData);
      // Refetch to get calculated values
      const { table: fullTable } = await api.getDataTable(table.id);
      setTable(fullTable);
    } catch (error) {
      console.error('Failed to update cell:', error);
    }

    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    } else if (e.key === 'Tab' && editingCell && table) {
      e.preventDefault();
      handleCellBlur();
      const nextCol = editingCell.col + 1;
      if (nextCol < table.columns.length) {
        handleCellClick(editingCell.row, nextCol);
      }
    }
  };

  const handleAddRow = async () => {
    if (!table) return;
    try {
      await api.addTableRow(table.id);
      const { table: fullTable } = await api.getDataTable(table.id);
      setTable(fullTable);
    } catch (error) {
      console.error('Failed to add row:', error);
    }
  };

  const handleDeleteRow = async (rowIndex: number) => {
    if (!table) return;
    try {
      await api.deleteTableRow(table.id, rowIndex);
      const { table: fullTable } = await api.getDataTable(table.id);
      setTable(fullTable);
    } catch (error) {
      console.error('Failed to delete row:', error);
    }
  };

  const handleAddColumn = async () => {
    if (!table || !newColumn.name) return;
    try {
      await api.addTableColumn(table.id, newColumn);
      const { table: fullTable } = await api.getDataTable(table.id);
      setTable(fullTable);
      setShowAddColumn(false);
      setNewColumn({ name: '', type: 'text' });
    } catch (error) {
      console.error('Failed to add column:', error);
    }
  };

  const handleDeleteColumn = async (colIndex: number) => {
    if (!table) return;
    try {
      await api.deleteTableColumn(table.id, colIndex);
      const { table: fullTable } = await api.getDataTable(table.id);
      setTable(fullTable);
    } catch (error) {
      console.error('Failed to delete column:', error);
    }
  };

  const handleSort = (colIndex: number) => {
    if (sortColumn === colIndex) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(colIndex);
      setSortDirection('asc');
    }
  };

  const handleExportCSV = async () => {
    if (!table) return;
    try {
      const blob = await api.exportTableCSV(table.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${table.name}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export CSV:', error);
    }
  };

  const getSortedData = useCallback(() => {
    if (!table || sortColumn === null) return table?.calculatedData || [];

    return [...table.calculatedData].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = typeof aVal === 'number' && typeof bVal === 'number'
        ? aVal - bVal
        : String(aVal).localeCompare(String(bVal));

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [table, sortColumn, sortDirection]);

  const formatCellValue = (value: any, column: Column): string => {
    if (value === null || value === undefined) return '';
    if (column.type === 'boolean') return value ? 'Yes' : 'No';
    if (column.type === 'number' && typeof value === 'number') {
      return value.toLocaleString();
    }
    if (column.type === 'formula' && typeof value === 'string' && value.startsWith('#')) {
      return value; // Error indicator
    }
    return String(value);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  if (!table) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Table2 className="h-12 w-12 text-foreground-tertiary mb-4" />
          <p className="text-foreground-secondary">No table data available</p>
        </CardContent>
      </Card>
    );
  }

  const sortedData = getSortedData();

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Table2 className="h-5 w-5" />
            {table.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleAddRow}>
              <Plus className="h-4 w-4 mr-1" />
              Row
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowAddColumn(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Column
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-0">
        <div className="min-w-max">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-background-secondary">
              <tr>
                <th className="w-10 border-b border-r border-border p-2 text-xs text-foreground-tertiary">
                  #
                </th>
                {table.columns.map((col, colIndex) => (
                  <th
                    key={colIndex}
                    className="border-b border-r border-border p-0 text-left"
                    style={{ width: col.width || 150 }}
                  >
                    <div className="flex items-center justify-between px-3 py-2 group">
                      <button
                        className="flex items-center gap-2 flex-1 text-sm font-medium"
                        onClick={() => handleSort(colIndex)}
                      >
                        {col.name}
                        {sortColumn === colIndex ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50" />
                        )}
                      </button>
                      <Menu
                        trigger={
                          <button className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-background-tertiary">
                            <MoreVertical className="h-3 w-3" />
                          </button>
                        }
                      >
                        <MenuItem onClick={() => handleSort(colIndex)}>
                          Sort {sortDirection === 'asc' ? 'Descending' : 'Ascending'}
                        </MenuItem>
                        <MenuDivider />
                        <MenuItem
                          variant="danger"
                          onClick={() => handleDeleteColumn(colIndex)}
                        >
                          Delete Column
                        </MenuItem>
                      </Menu>
                    </div>
                    <div className="px-3 pb-1 text-[10px] text-foreground-tertiary capitalize">
                      {col.type}
                      {col.formula && `: ${col.formula}`}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row, rowIndex) => (
                <tr key={rowIndex} className="group hover:bg-background-secondary/50">
                  <td className="border-b border-r border-border p-2 text-xs text-foreground-tertiary text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="group-hover:hidden">{rowIndex + 1}</span>
                      <button
                        className="hidden group-hover:block p-0.5 rounded hover:bg-red-500/20"
                        onClick={() => handleDeleteRow(rowIndex)}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </button>
                    </div>
                  </td>
                  {row.map((cell, colIndex) => {
                    const column = table.columns[colIndex];
                    const isEditing =
                      editingCell?.row === rowIndex && editingCell?.col === colIndex;
                    const isFormula = column.type === 'formula';
                    const hasError =
                      typeof cell === 'string' && cell.startsWith('#');

                    return (
                      <td
                        key={colIndex}
                        className={cn(
                          'border-b border-r border-border p-0',
                          isFormula && 'bg-background-tertiary/50',
                          hasError && 'text-red-500'
                        )}
                        onClick={() => handleCellClick(rowIndex, colIndex)}
                      >
                        {isEditing ? (
                          <input
                            type={column.type === 'number' ? 'number' : 'text'}
                            value={cellValue}
                            onChange={(e) => setCellValue(e.target.value)}
                            onBlur={handleCellBlur}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className="w-full px-3 py-2 bg-primary/10 border-none outline-none text-sm"
                          />
                        ) : column.type === 'boolean' ? (
                          <div className="px-3 py-2 flex items-center">
                            <input
                              type="checkbox"
                              checked={!!cell}
                              onChange={(e) => {
                                setCellValue(String(e.target.checked));
                                handleCellClick(rowIndex, colIndex);
                                setTimeout(handleCellBlur, 0);
                              }}
                              className="w-4 h-4"
                            />
                          </div>
                        ) : (
                          <div
                            className={cn(
                              'px-3 py-2 text-sm min-h-[36px] cursor-text',
                              column.type === 'number' && 'text-right'
                            )}
                          >
                            {formatCellValue(cell, column)}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {sortedData.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-foreground-secondary">No data yet</p>
              <Button variant="ghost" size="sm" onClick={handleAddRow} className="mt-2">
                <Plus className="h-4 w-4 mr-1" />
                Add Row
              </Button>
            </div>
          )}
        </div>
      </CardContent>

      {/* Add Column Modal */}
      <Modal
        isOpen={showAddColumn}
        onClose={() => setShowAddColumn(false)}
        title="Add Column"
      >
        <div className="space-y-4">
          <Input
            placeholder="Column name"
            value={newColumn.name}
            onChange={(e) => setNewColumn((prev) => ({ ...prev, name: e.target.value }))}
          />
          <div className="grid grid-cols-3 gap-2">
            {COLUMN_TYPES.map((type) => (
              <button
                key={type.type}
                onClick={() =>
                  setNewColumn((prev) => ({ ...prev, type: type.type as Column['type'] }))
                }
                className={cn(
                  'flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors',
                  newColumn.type === type.type
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <type.icon className="h-5 w-5" />
                <span className="text-xs">{type.label}</span>
              </button>
            ))}
          </div>
          {newColumn.type === 'formula' && (
            <Input
              placeholder="Formula (e.g., =SUM(A:A), =A*B)"
              value={newColumn.formula || ''}
              onChange={(e) =>
                setNewColumn((prev) => ({ ...prev, formula: e.target.value }))
              }
            />
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowAddColumn(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddColumn}>Add Column</Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
