import { prisma } from '../index.js';

export interface ColumnDefinition {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'formula' | 'select';
  formula?: string; // For formula columns, e.g., "=SUM(A:A)", "=A*B"
  width?: number;
  options?: string[]; // For select type
  format?: string; // Number format, date format, etc.
}

export interface TableConfig {
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  filters?: Record<string, any>;
  frozenColumns?: number;
  rowHeight?: number;
  showRowNumbers?: boolean;
  alternateRowColors?: boolean;
}

// Create a new data table
export async function createDataTable(
  name: string,
  userId: string,
  columns: ColumnDefinition[],
  options: {
    description?: string;
    workspaceId?: string;
    analysisId?: string;
    documentId?: string;
    data?: any[][];
    config?: TableConfig;
  } = {}
) {
  const initialData = options.data || [[]];

  return prisma.dataTable.create({
    data: {
      name,
      description: options.description,
      columns: JSON.stringify(columns),
      data: JSON.stringify(initialData),
      config: options.config ? JSON.stringify(options.config) : null,
      createdById: userId,
      workspaceId: options.workspaceId,
      analysisId: options.analysisId,
      documentId: options.documentId,
    },
  });
}

// Get a data table
export async function getDataTable(tableId: string) {
  const table = await prisma.dataTable.findUnique({
    where: { id: tableId },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
    },
  });

  if (!table) return null;

  return {
    ...table,
    columns: JSON.parse(table.columns) as ColumnDefinition[],
    data: JSON.parse(table.data) as any[][],
    config: table.config ? JSON.parse(table.config) as TableConfig : null,
  };
}

// Get all tables for a workspace/analysis
export async function getDataTables(options: {
  workspaceId?: string;
  analysisId?: string;
  userId?: string;
}) {
  const tables = await prisma.dataTable.findMany({
    where: {
      OR: [
        options.workspaceId ? { workspaceId: options.workspaceId } : {},
        options.analysisId ? { analysisId: options.analysisId } : {},
        options.userId ? { createdById: options.userId } : {},
      ].filter((o) => Object.keys(o).length > 0),
    },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return tables.map((table) => ({
    ...table,
    columns: JSON.parse(table.columns) as ColumnDefinition[],
    rowCount: (JSON.parse(table.data) as any[][]).length,
  }));
}

// Update table data
export async function updateTableData(tableId: string, data: any[][]) {
  return prisma.dataTable.update({
    where: { id: tableId },
    data: {
      data: JSON.stringify(data),
      updatedAt: new Date(),
    },
  });
}

// Update table columns
export async function updateTableColumns(tableId: string, columns: ColumnDefinition[]) {
  return prisma.dataTable.update({
    where: { id: tableId },
    data: {
      columns: JSON.stringify(columns),
      updatedAt: new Date(),
    },
  });
}

// Update table config
export async function updateTableConfig(tableId: string, config: TableConfig) {
  return prisma.dataTable.update({
    where: { id: tableId },
    data: {
      config: JSON.stringify(config),
      updatedAt: new Date(),
    },
  });
}

// Update table metadata
export async function updateTableMetadata(
  tableId: string,
  data: { name?: string; description?: string }
) {
  return prisma.dataTable.update({
    where: { id: tableId },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}

// Delete a table
export async function deleteDataTable(tableId: string) {
  return prisma.dataTable.delete({
    where: { id: tableId },
  });
}

// Formula evaluation functions
const FORMULA_FUNCTIONS: Record<string, (...args: number[]) => number> = {
  SUM: (...args) => args.reduce((a, b) => a + b, 0),
  AVG: (...args) => args.length ? args.reduce((a, b) => a + b, 0) / args.length : 0,
  MIN: (...args) => Math.min(...args),
  MAX: (...args) => Math.max(...args),
  COUNT: (...args) => args.filter((v) => v !== null && v !== undefined).length,
  ABS: (n) => Math.abs(n),
  ROUND: (n, decimals = 0) => Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals),
  FLOOR: (n) => Math.floor(n),
  CEIL: (n) => Math.ceil(n),
  SQRT: (n) => Math.sqrt(n),
  POW: (base, exp) => Math.pow(base, exp),
};

// Parse and evaluate a formula
export function evaluateFormula(
  formula: string,
  rowIndex: number,
  columns: ColumnDefinition[],
  data: any[][]
): number | string | null {
  if (!formula.startsWith('=')) {
    return formula;
  }

  const expr = formula.slice(1).trim();

  try {
    // Handle function calls like SUM(A:A), AVG(B1:B10)
    const funcMatch = expr.match(/^(\w+)\(([^)]+)\)$/);
    if (funcMatch) {
      const [, funcName, args] = funcMatch;
      const func = FORMULA_FUNCTIONS[funcName.toUpperCase()];

      if (!func) {
        return `#ERR: Unknown function ${funcName}`;
      }

      // Parse arguments - could be ranges like A:A, A1:A10, or values
      const values = parseFormulaArgs(args, rowIndex, columns, data);
      return func(...values);
    }

    // Handle simple cell references and arithmetic
    const evaluated = evaluateArithmetic(expr, rowIndex, columns, data);
    return evaluated;
  } catch (error) {
    return '#ERR';
  }
}

// Parse formula arguments
function parseFormulaArgs(
  args: string,
  rowIndex: number,
  columns: ColumnDefinition[],
  data: any[][]
): number[] {
  const values: number[] = [];
  const parts = args.split(',').map((s) => s.trim());

  for (const part of parts) {
    // Check if it's a range like A:A (whole column) or A1:A10
    const rangeMatch = part.match(/^([A-Z]+)(?::([A-Z]+))?$|^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);

    if (rangeMatch) {
      if (rangeMatch[1] && rangeMatch[2]) {
        // Whole column range like A:A
        const colIdx = columnLetterToIndex(rangeMatch[1]);
        for (const row of data) {
          const val = parseFloat(row[colIdx]);
          if (!isNaN(val)) values.push(val);
        }
      } else if (rangeMatch[1] && !rangeMatch[2]) {
        // Single column, current row
        const colIdx = columnLetterToIndex(rangeMatch[1]);
        const val = parseFloat(data[rowIndex]?.[colIdx]);
        if (!isNaN(val)) values.push(val);
      } else if (rangeMatch[3]) {
        // Cell range like A1:A10
        const startCol = columnLetterToIndex(rangeMatch[3]);
        const startRow = parseInt(rangeMatch[4]) - 1;
        const endCol = columnLetterToIndex(rangeMatch[5]);
        const endRow = parseInt(rangeMatch[6]) - 1;

        for (let r = startRow; r <= endRow; r++) {
          for (let c = startCol; c <= endCol; c++) {
            const val = parseFloat(data[r]?.[c]);
            if (!isNaN(val)) values.push(val);
          }
        }
      }
    } else {
      // Try to parse as a number
      const val = parseFloat(part);
      if (!isNaN(val)) values.push(val);
    }
  }

  return values;
}

// Evaluate arithmetic expressions with cell references
function evaluateArithmetic(
  expr: string,
  rowIndex: number,
  columns: ColumnDefinition[],
  data: any[][]
): number {
  // Replace cell references with values
  let evaluated = expr.replace(/([A-Z]+)(\d+)?/g, (match, col, row) => {
    const colIdx = columnLetterToIndex(col);
    const rowIdx = row ? parseInt(row) - 1 : rowIndex;
    const value = data[rowIdx]?.[colIdx];
    return isNaN(parseFloat(value)) ? '0' : value.toString();
  });

  // Safely evaluate arithmetic (only allow numbers and operators)
  if (!/^[\d\s+\-*/().]+$/.test(evaluated)) {
    throw new Error('Invalid expression');
  }

  // eslint-disable-next-line no-eval
  return eval(evaluated);
}

// Convert column letter to index (A=0, B=1, ... Z=25, AA=26, etc.)
function columnLetterToIndex(letter: string): number {
  let index = 0;
  for (let i = 0; i < letter.length; i++) {
    index = index * 26 + (letter.charCodeAt(i) - 64);
  }
  return index - 1;
}

// Convert column index to letter
export function columnIndexToLetter(index: number): string {
  let letter = '';
  while (index >= 0) {
    letter = String.fromCharCode((index % 26) + 65) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
}

// Calculate all formulas in a table
export function calculateFormulas(
  columns: ColumnDefinition[],
  data: any[][]
): any[][] {
  const result = data.map((row) => [...row]);

  for (let rowIdx = 0; rowIdx < result.length; rowIdx++) {
    for (let colIdx = 0; colIdx < columns.length; colIdx++) {
      const col = columns[colIdx];
      if (col.type === 'formula' && col.formula) {
        result[rowIdx][colIdx] = evaluateFormula(col.formula, rowIdx, columns, data);
      }
    }
  }

  return result;
}

// Extract table from document (CSV, Excel content)
export async function extractTableFromDocument(
  documentId: string,
  userId: string,
  tableName?: string
) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!document) {
    throw new Error('Document not found');
  }

  // Parse content based on type
  let columns: ColumnDefinition[] = [];
  let data: any[][] = [];

  if (document.type === 'csv' && document.content) {
    // Parse CSV
    const lines = document.content.split('\n').filter((l) => l.trim());
    if (lines.length > 0) {
      // First line is headers
      const headers = parseCSVLine(lines[0]);
      columns = headers.map((h) => ({
        name: h,
        type: 'text' as const,
      }));

      // Rest is data
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        // Detect types
        const typedValues = values.map((v, idx) => {
          const num = parseFloat(v);
          if (!isNaN(num)) {
            if (columns[idx].type === 'text') {
              columns[idx].type = 'number';
            }
            return num;
          }
          return v;
        });
        data.push(typedValues);
      }
    }
  } else if (document.metadata) {
    // Try to extract from metadata (for Excel files)
    try {
      const meta = JSON.parse(document.metadata);
      if (meta.sheets && meta.sheets[0]) {
        const sheet = meta.sheets[0];
        if (sheet.headers) {
          columns = sheet.headers.map((h: string) => ({
            name: h,
            type: 'text' as const,
          }));
        }
        if (sheet.data) {
          data = sheet.data;
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  if (columns.length === 0) {
    // Create default columns
    columns = [
      { name: 'Column A', type: 'text' },
      { name: 'Column B', type: 'text' },
      { name: 'Column C', type: 'text' },
    ];
    data = [['', '', '']];
  }

  return createDataTable(
    tableName || `Table: ${document.name}`,
    userId,
    columns,
    {
      workspaceId: document.workspaceId || undefined,
      documentId: document.id,
      data,
    }
  );
}

// Simple CSV line parser
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

// Export table to CSV
export function exportTableToCSV(
  columns: ColumnDefinition[],
  data: any[][]
): string {
  const headers = columns.map((c) => `"${c.name.replace(/"/g, '""')}"`).join(',');
  const rows = data.map((row) =>
    row.map((cell) => {
      if (cell === null || cell === undefined) return '';
      const str = String(cell);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  );

  return [headers, ...rows].join('\n');
}

// Add a row to the table
export async function addRow(tableId: string, rowData?: any[]) {
  const table = await getDataTable(tableId);
  if (!table) throw new Error('Table not found');

  const newRow = rowData || new Array(table.columns.length).fill('');
  const newData = [...table.data, newRow];

  return updateTableData(tableId, newData);
}

// Delete a row from the table
export async function deleteRow(tableId: string, rowIndex: number) {
  const table = await getDataTable(tableId);
  if (!table) throw new Error('Table not found');

  const newData = table.data.filter((_, idx) => idx !== rowIndex);
  return updateTableData(tableId, newData);
}

// Add a column to the table
export async function addColumn(
  tableId: string,
  column: ColumnDefinition,
  position?: number
) {
  const table = await getDataTable(tableId);
  if (!table) throw new Error('Table not found');

  const newColumns = [...table.columns];
  const insertPos = position ?? newColumns.length;
  newColumns.splice(insertPos, 0, column);

  const newData = table.data.map((row) => {
    const newRow = [...row];
    newRow.splice(insertPos, 0, '');
    return newRow;
  });

  await updateTableColumns(tableId, newColumns);
  await updateTableData(tableId, newData);

  return getDataTable(tableId);
}

// Delete a column from the table
export async function deleteColumn(tableId: string, columnIndex: number) {
  const table = await getDataTable(tableId);
  if (!table) throw new Error('Table not found');

  const newColumns = table.columns.filter((_, idx) => idx !== columnIndex);
  const newData = table.data.map((row) =>
    row.filter((_, idx) => idx !== columnIndex)
  );

  await updateTableColumns(tableId, newColumns);
  await updateTableData(tableId, newData);

  return getDataTable(tableId);
}
