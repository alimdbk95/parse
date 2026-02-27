import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import * as tableService from '../services/dataTableService.js';

const router = Router();

// Get all data tables
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { workspaceId, analysisId } = req.query;

    const tables = await tableService.getDataTables({
      workspaceId: workspaceId as string,
      analysisId: analysisId as string,
      userId: req.user!.id,
    });

    res.json({ tables });
  } catch (error) {
    console.error('Get tables error:', error);
    res.status(500).json({ error: 'Failed to get data tables' });
  }
});

// Get a specific table
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const table = await tableService.getDataTable(req.params.id);

    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Calculate formula columns
    const calculatedData = tableService.calculateFormulas(table.columns, table.data);

    res.json({ table: { ...table, calculatedData } });
  } catch (error) {
    console.error('Get table error:', error);
    res.status(500).json({ error: 'Failed to get data table' });
  }
});

// Create a new data table
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, description, columns, data, config, workspaceId, analysisId } = req.body;

    if (!name || !columns) {
      return res.status(400).json({ error: 'Name and columns are required' });
    }

    const table = await tableService.createDataTable(name, req.user!.id, columns, {
      description,
      data,
      config,
      workspaceId,
      analysisId,
    });

    res.status(201).json({ table });
  } catch (error) {
    console.error('Create table error:', error);
    res.status(500).json({ error: 'Failed to create data table' });
  }
});

// Create table from document
router.post('/from-document/:documentId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { documentId } = req.params;
    const { name } = req.body;

    const table = await tableService.extractTableFromDocument(
      documentId,
      req.user!.id,
      name
    );

    res.status(201).json({ table });
  } catch (error: any) {
    console.error('Extract table error:', error);
    res.status(500).json({ error: error.message || 'Failed to extract table from document' });
  }
});

// Update table data
router.patch('/:id/data', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data } = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({ error: 'Data must be an array' });
    }

    await tableService.updateTableData(req.params.id, data);
    const table = await tableService.getDataTable(req.params.id);

    res.json({ table });
  } catch (error) {
    console.error('Update table data error:', error);
    res.status(500).json({ error: 'Failed to update table data' });
  }
});

// Update table columns
router.patch('/:id/columns', authenticate, async (req: AuthRequest, res) => {
  try {
    const { columns } = req.body;

    if (!Array.isArray(columns)) {
      return res.status(400).json({ error: 'Columns must be an array' });
    }

    await tableService.updateTableColumns(req.params.id, columns);
    const table = await tableService.getDataTable(req.params.id);

    res.json({ table });
  } catch (error) {
    console.error('Update table columns error:', error);
    res.status(500).json({ error: 'Failed to update table columns' });
  }
});

// Update table config
router.patch('/:id/config', authenticate, async (req: AuthRequest, res) => {
  try {
    const { config } = req.body;

    await tableService.updateTableConfig(req.params.id, config);
    const table = await tableService.getDataTable(req.params.id);

    res.json({ table });
  } catch (error) {
    console.error('Update table config error:', error);
    res.status(500).json({ error: 'Failed to update table config' });
  }
});

// Update table metadata
router.patch('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, description } = req.body;

    await tableService.updateTableMetadata(req.params.id, { name, description });
    const table = await tableService.getDataTable(req.params.id);

    res.json({ table });
  } catch (error) {
    console.error('Update table error:', error);
    res.status(500).json({ error: 'Failed to update table' });
  }
});

// Add a row
router.post('/:id/rows', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data } = req.body;

    await tableService.addRow(req.params.id, data);
    const table = await tableService.getDataTable(req.params.id);

    res.status(201).json({ table });
  } catch (error) {
    console.error('Add row error:', error);
    res.status(500).json({ error: 'Failed to add row' });
  }
});

// Delete a row
router.delete('/:id/rows/:rowIndex', authenticate, async (req: AuthRequest, res) => {
  try {
    const rowIndex = parseInt(req.params.rowIndex);

    await tableService.deleteRow(req.params.id, rowIndex);
    const table = await tableService.getDataTable(req.params.id);

    res.json({ table });
  } catch (error) {
    console.error('Delete row error:', error);
    res.status(500).json({ error: 'Failed to delete row' });
  }
});

// Add a column
router.post('/:id/columns', authenticate, async (req: AuthRequest, res) => {
  try {
    const { column, position } = req.body;

    if (!column || !column.name || !column.type) {
      return res.status(400).json({ error: 'Column name and type are required' });
    }

    const table = await tableService.addColumn(req.params.id, column, position);

    res.status(201).json({ table });
  } catch (error) {
    console.error('Add column error:', error);
    res.status(500).json({ error: 'Failed to add column' });
  }
});

// Delete a column
router.delete('/:id/columns/:columnIndex', authenticate, async (req: AuthRequest, res) => {
  try {
    const columnIndex = parseInt(req.params.columnIndex);

    const table = await tableService.deleteColumn(req.params.id, columnIndex);

    res.json({ table });
  } catch (error) {
    console.error('Delete column error:', error);
    res.status(500).json({ error: 'Failed to delete column' });
  }
});

// Export table to CSV
router.get('/:id/export/csv', authenticate, async (req: AuthRequest, res) => {
  try {
    const table = await tableService.getDataTable(req.params.id);

    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    const csv = tableService.exportTableToCSV(table.columns, table.data);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${table.name}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Failed to export table' });
  }
});

// Evaluate a formula
router.post('/evaluate', authenticate, async (req: AuthRequest, res) => {
  try {
    const { formula, rowIndex, columns, data } = req.body;

    const result = tableService.evaluateFormula(formula, rowIndex || 0, columns, data);

    res.json({ result });
  } catch (error) {
    console.error('Evaluate formula error:', error);
    res.status(500).json({ error: 'Failed to evaluate formula' });
  }
});

// Delete a table
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    await tableService.deleteDataTable(req.params.id);
    res.json({ message: 'Table deleted' });
  } catch (error) {
    console.error('Delete table error:', error);
    res.status(500).json({ error: 'Failed to delete table' });
  }
});

export default router;
