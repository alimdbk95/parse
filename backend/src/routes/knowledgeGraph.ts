import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import * as graphService from '../services/knowledgeGraphService.js';

const router = Router();

// Get all knowledge graphs
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { workspaceId, analysisId } = req.query;

    const graphs = await graphService.getKnowledgeGraphs({
      workspaceId: workspaceId as string,
      analysisId: analysisId as string,
      userId: req.user!.id,
    });

    res.json({ graphs });
  } catch (error) {
    console.error('Get graphs error:', error);
    res.status(500).json({ error: 'Failed to get knowledge graphs' });
  }
});

// Get a specific graph
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const graph = await graphService.getKnowledgeGraph(req.params.id);

    if (!graph) {
      return res.status(404).json({ error: 'Graph not found' });
    }

    res.json({ graph });
  } catch (error) {
    console.error('Get graph error:', error);
    res.status(500).json({ error: 'Failed to get knowledge graph' });
  }
});

// Create a new knowledge graph
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, description, workspaceId, analysisId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const graph = await graphService.createKnowledgeGraph(name, req.user!.id, {
      description,
      workspaceId,
      analysisId,
    });

    res.status(201).json({ graph });
  } catch (error) {
    console.error('Create graph error:', error);
    res.status(500).json({ error: 'Failed to create knowledge graph' });
  }
});

// Build graph from document
router.post('/from-document/:documentId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { documentId } = req.params;
    const { name } = req.body;

    const graph = await graphService.buildGraphFromDocument(
      documentId,
      req.user!.id,
      name
    );

    res.status(201).json({ graph });
  } catch (error: any) {
    console.error('Build graph error:', error);
    res.status(500).json({ error: error.message || 'Failed to build knowledge graph' });
  }
});

// Extract entities from text
router.post('/extract', authenticate, async (req: AuthRequest, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const extracted = await graphService.extractEntitiesFromText(text);

    res.json(extracted);
  } catch (error) {
    console.error('Extract entities error:', error);
    res.status(500).json({ error: 'Failed to extract entities' });
  }
});

// Add a node to a graph
router.post('/:id/nodes', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { label, type, x, y, color, properties } = req.body;

    if (!label || !type) {
      return res.status(400).json({ error: 'Label and type are required' });
    }

    const node = await graphService.addNode(id, {
      label,
      type,
      x,
      y,
      color,
      properties,
    });

    res.status(201).json({ node });
  } catch (error) {
    console.error('Add node error:', error);
    res.status(500).json({ error: 'Failed to add node' });
  }
});

// Update a node
router.patch('/nodes/:nodeId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { nodeId } = req.params;
    const { label, type, color, size, properties } = req.body;

    const node = await graphService.updateNode(nodeId, {
      label,
      type,
      color,
      size,
      properties,
    });

    res.json({ node });
  } catch (error) {
    console.error('Update node error:', error);
    res.status(500).json({ error: 'Failed to update node' });
  }
});

// Update node position
router.patch('/nodes/:nodeId/position', authenticate, async (req: AuthRequest, res) => {
  try {
    const { nodeId } = req.params;
    const { x, y } = req.body;

    if (typeof x !== 'number' || typeof y !== 'number') {
      return res.status(400).json({ error: 'x and y coordinates are required' });
    }

    const node = await graphService.updateNodePosition(nodeId, x, y);

    res.json({ node });
  } catch (error) {
    console.error('Update node position error:', error);
    res.status(500).json({ error: 'Failed to update node position' });
  }
});

// Delete a node
router.delete('/nodes/:nodeId', authenticate, async (req: AuthRequest, res) => {
  try {
    await graphService.deleteNode(req.params.nodeId);
    res.json({ message: 'Node deleted' });
  } catch (error) {
    console.error('Delete node error:', error);
    res.status(500).json({ error: 'Failed to delete node' });
  }
});

// Add an edge
router.post('/:id/edges', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { sourceId, targetId, label, weight } = req.body;

    if (!sourceId || !targetId || !label) {
      return res.status(400).json({ error: 'sourceId, targetId, and label are required' });
    }

    const edge = await graphService.addEdge(id, sourceId, targetId, label, weight);

    res.status(201).json({ edge });
  } catch (error) {
    console.error('Add edge error:', error);
    res.status(500).json({ error: 'Failed to add edge' });
  }
});

// Delete an edge
router.delete('/edges/:edgeId', authenticate, async (req: AuthRequest, res) => {
  try {
    await graphService.deleteEdge(req.params.edgeId);
    res.json({ message: 'Edge deleted' });
  } catch (error) {
    console.error('Delete edge error:', error);
    res.status(500).json({ error: 'Failed to delete edge' });
  }
});

// Merge multiple graphs
router.post('/merge', authenticate, async (req: AuthRequest, res) => {
  try {
    const { graphIds, name } = req.body;

    if (!graphIds || !Array.isArray(graphIds) || graphIds.length < 2) {
      return res.status(400).json({ error: 'At least 2 graph IDs are required' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const merged = await graphService.mergeGraphs(graphIds, name, req.user!.id);

    res.status(201).json({ graph: merged });
  } catch (error) {
    console.error('Merge graphs error:', error);
    res.status(500).json({ error: 'Failed to merge graphs' });
  }
});

// Delete a graph
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    await graphService.deleteKnowledgeGraph(req.params.id);
    res.json({ message: 'Graph deleted' });
  } catch (error) {
    console.error('Delete graph error:', error);
    res.status(500).json({ error: 'Failed to delete graph' });
  }
});

export default router;
