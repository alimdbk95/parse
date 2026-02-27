import { prisma } from '../index.js';
import Anthropic from '@anthropic-ai/sdk';

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic | null {
  if (!anthropicClient && process.env.ANTHROPIC_API_KEY) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

interface Entity {
  id: string;
  label: string;
  type: 'person' | 'organization' | 'location' | 'concept' | 'event' | 'document';
  properties?: Record<string, any>;
}

interface Relationship {
  sourceId: string;
  targetId: string;
  label: string;
  weight?: number;
}

interface ExtractedGraph {
  entities: Entity[];
  relationships: Relationship[];
}

// Extract entities and relationships from text using AI
export async function extractEntitiesFromText(
  text: string,
  documentId?: string
): Promise<ExtractedGraph> {
  const client = getAnthropicClient();

  if (!client) {
    // Mock extraction when no API key
    return mockExtractEntities(text);
  }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `Analyze the following text and extract entities and their relationships. Return a JSON object with:
- entities: array of {id: unique_string, label: name, type: person|organization|location|concept|event|document, properties: {description?, role?, dates?}}
- relationships: array of {sourceId, targetId, label: relationship_type, weight: 0-1 importance}

Focus on:
1. People and their roles/affiliations
2. Organizations and their connections
3. Locations mentioned
4. Key concepts and topics
5. Events and their participants
6. Relationships between all entities

Text to analyze:
${text.slice(0, 8000)}

Return ONLY valid JSON, no explanation.`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
    return { entities: [], relationships: [] };
  } catch (error) {
    console.error('Failed to extract entities:', error);
    return mockExtractEntities(text);
  }
}

// Mock entity extraction for demo/testing
function mockExtractEntities(text: string): ExtractedGraph {
  const entities: Entity[] = [];
  const relationships: Relationship[] = [];

  // Simple pattern matching for demo
  const personPatterns = /(?:Mr\.|Mrs\.|Dr\.|Ms\.)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g;
  const orgPatterns = /(?:Inc\.|Corp\.|LLC|Company|Organization|University|Institute)/gi;
  const locationPatterns = /(?:in|at|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g;

  let match;
  const seenLabels = new Set<string>();

  // Extract potential persons
  while ((match = personPatterns.exec(text)) !== null) {
    const label = match[1];
    if (!seenLabels.has(label.toLowerCase())) {
      seenLabels.add(label.toLowerCase());
      entities.push({
        id: `person_${entities.length}`,
        label,
        type: 'person',
      });
    }
  }

  // Add some mock entities if none found
  if (entities.length === 0) {
    entities.push(
      { id: 'entity_1', label: 'Main Topic', type: 'concept' },
      { id: 'entity_2', label: 'Key Finding', type: 'concept' },
      { id: 'entity_3', label: 'Data Source', type: 'document' }
    );

    relationships.push(
      { sourceId: 'entity_1', targetId: 'entity_2', label: 'contains', weight: 0.8 },
      { sourceId: 'entity_2', targetId: 'entity_3', label: 'derived_from', weight: 0.6 }
    );
  }

  return { entities, relationships };
}

// Create a new knowledge graph
export async function createKnowledgeGraph(
  name: string,
  userId: string,
  options: {
    description?: string;
    workspaceId?: string;
    analysisId?: string;
  } = {}
) {
  return prisma.knowledgeGraph.create({
    data: {
      name,
      description: options.description,
      createdById: userId,
      workspaceId: options.workspaceId,
      analysisId: options.analysisId,
    },
    include: {
      nodes: true,
      edges: true,
    },
  });
}

// Add nodes to a graph
export async function addNodesToGraph(
  graphId: string,
  entities: Entity[],
  sourceDocId?: string
) {
  const nodeIdMap = new Map<string, string>();

  const nodes = await Promise.all(
    entities.map(async (entity) => {
      const node = await prisma.graphNode.create({
        data: {
          label: entity.label,
          type: entity.type,
          properties: entity.properties ? JSON.stringify(entity.properties) : null,
          sourceDocId,
          graphId,
        },
      });
      nodeIdMap.set(entity.id, node.id);
      return node;
    })
  );

  return { nodes, nodeIdMap };
}

// Add edges to a graph
export async function addEdgesToGraph(
  graphId: string,
  relationships: Relationship[],
  nodeIdMap: Map<string, string>
) {
  const edges = await Promise.all(
    relationships
      .filter((rel) => nodeIdMap.has(rel.sourceId) && nodeIdMap.has(rel.targetId))
      .map((rel) =>
        prisma.graphEdge.create({
          data: {
            label: rel.label,
            weight: rel.weight || 1,
            graphId,
            sourceId: nodeIdMap.get(rel.sourceId)!,
            targetId: nodeIdMap.get(rel.targetId)!,
          },
        })
      )
  );

  return edges;
}

// Build a knowledge graph from document content
export async function buildGraphFromDocument(
  documentId: string,
  userId: string,
  graphName?: string
) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!document || !document.content) {
    throw new Error('Document not found or has no content');
  }

  // Extract entities
  const extracted = await extractEntitiesFromText(document.content, documentId);

  // Create graph
  const graph = await createKnowledgeGraph(
    graphName || `Graph: ${document.name}`,
    userId,
    { workspaceId: document.workspaceId || undefined }
  );

  // Add nodes and edges
  const { nodeIdMap } = await addNodesToGraph(graph.id, extracted.entities, documentId);
  await addEdgesToGraph(graph.id, extracted.relationships, nodeIdMap);

  // Return complete graph
  return getKnowledgeGraph(graph.id);
}

// Get a knowledge graph with all nodes and edges
export async function getKnowledgeGraph(graphId: string) {
  return prisma.knowledgeGraph.findUnique({
    where: { id: graphId },
    include: {
      nodes: {
        include: {
          outgoingEdges: {
            include: { target: true },
          },
          incomingEdges: {
            include: { source: true },
          },
        },
      },
      edges: {
        include: {
          source: true,
          target: true,
        },
      },
      createdBy: {
        select: { id: true, name: true },
      },
    },
  });
}

// Get all graphs for a workspace or analysis
export async function getKnowledgeGraphs(options: {
  workspaceId?: string;
  analysisId?: string;
  userId?: string;
}) {
  return prisma.knowledgeGraph.findMany({
    where: {
      OR: [
        options.workspaceId ? { workspaceId: options.workspaceId } : {},
        options.analysisId ? { analysisId: options.analysisId } : {},
        options.userId ? { createdById: options.userId } : {},
      ].filter((o) => Object.keys(o).length > 0),
    },
    include: {
      _count: {
        select: { nodes: true, edges: true },
      },
      createdBy: {
        select: { id: true, name: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

// Update node position (for interactive layout)
export async function updateNodePosition(
  nodeId: string,
  x: number,
  y: number
) {
  return prisma.graphNode.update({
    where: { id: nodeId },
    data: { x, y },
  });
}

// Update node properties
export async function updateNode(
  nodeId: string,
  data: {
    label?: string;
    type?: string;
    color?: string;
    size?: number;
    properties?: Record<string, any>;
  }
) {
  return prisma.graphNode.update({
    where: { id: nodeId },
    data: {
      ...data,
      properties: data.properties ? JSON.stringify(data.properties) : undefined,
    },
  });
}

// Add a new node manually
export async function addNode(
  graphId: string,
  data: {
    label: string;
    type: string;
    x?: number;
    y?: number;
    color?: string;
    properties?: Record<string, any>;
  }
) {
  return prisma.graphNode.create({
    data: {
      ...data,
      graphId,
      properties: data.properties ? JSON.stringify(data.properties) : null,
    },
  });
}

// Add a new edge manually
export async function addEdge(
  graphId: string,
  sourceId: string,
  targetId: string,
  label: string,
  weight: number = 1
) {
  return prisma.graphEdge.create({
    data: {
      graphId,
      sourceId,
      targetId,
      label,
      weight,
    },
    include: {
      source: true,
      target: true,
    },
  });
}

// Delete a node (and its edges)
export async function deleteNode(nodeId: string) {
  return prisma.graphNode.delete({
    where: { id: nodeId },
  });
}

// Delete an edge
export async function deleteEdge(edgeId: string) {
  return prisma.graphEdge.delete({
    where: { id: edgeId },
  });
}

// Delete a graph
export async function deleteKnowledgeGraph(graphId: string) {
  return prisma.knowledgeGraph.delete({
    where: { id: graphId },
  });
}

// Merge multiple graphs
export async function mergeGraphs(
  graphIds: string[],
  newName: string,
  userId: string
) {
  // Get all graphs
  const graphs = await Promise.all(
    graphIds.map((id) => getKnowledgeGraph(id))
  );

  // Create new graph
  const merged = await createKnowledgeGraph(newName, userId);

  // Collect all nodes and map old IDs to new IDs
  const nodeIdMap = new Map<string, string>();

  for (const graph of graphs) {
    if (!graph) continue;

    for (const node of graph.nodes) {
      const newNode = await prisma.graphNode.create({
        data: {
          label: node.label,
          type: node.type,
          properties: node.properties,
          color: node.color,
          size: node.size,
          sourceDocId: node.sourceDocId,
          graphId: merged.id,
        },
      });
      nodeIdMap.set(node.id, newNode.id);
    }
  }

  // Add all edges
  for (const graph of graphs) {
    if (!graph) continue;

    for (const edge of graph.edges) {
      const newSourceId = nodeIdMap.get(edge.sourceId);
      const newTargetId = nodeIdMap.get(edge.targetId);

      if (newSourceId && newTargetId) {
        await prisma.graphEdge.create({
          data: {
            label: edge.label,
            weight: edge.weight,
            properties: edge.properties,
            color: edge.color,
            graphId: merged.id,
            sourceId: newSourceId,
            targetId: newTargetId,
          },
        });
      }
    }
  }

  return getKnowledgeGraph(merged.id);
}
