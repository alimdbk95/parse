'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Network,
  User,
  Building2,
  MapPin,
  Lightbulb,
  Calendar,
  FileText,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

interface GraphNode {
  id: string;
  label: string;
  type: string;
  x?: number;
  y?: number;
  color?: string;
  size: number;
  properties?: string;
}

interface GraphEdge {
  id: string;
  label: string;
  weight: number;
  sourceId: string;
  targetId: string;
  source: { id: string; label: string };
  target: { id: string; label: string };
}

interface KnowledgeGraphProps {
  graphId?: string;
  documentId?: string;
  onGraphCreated?: (graph: any) => void;
}

const NODE_TYPES = [
  { type: 'person', label: 'Person', icon: User, color: '#8b5cf6' },
  { type: 'organization', label: 'Organization', icon: Building2, color: '#06b6d4' },
  { type: 'location', label: 'Location', icon: MapPin, color: '#22c55e' },
  { type: 'concept', label: 'Concept', icon: Lightbulb, color: '#f59e0b' },
  { type: 'event', label: 'Event', icon: Calendar, color: '#ef4444' },
  { type: 'document', label: 'Document', icon: FileText, color: '#6366f1' },
];

export function KnowledgeGraph({ graphId, documentId, onGraphCreated }: KnowledgeGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [graph, setGraph] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggingNode, setDraggingNode] = useState<string | null>(null);

  const [showAddNode, setShowAddNode] = useState(false);
  const [newNode, setNewNode] = useState({ label: '', type: 'concept' });
  const [showAddEdge, setShowAddEdge] = useState(false);
  const [newEdge, setNewEdge] = useState({ sourceId: '', targetId: '', label: '' });

  // Fetch graph data
  useEffect(() => {
    if (graphId) {
      fetchGraph();
    } else if (documentId) {
      buildGraphFromDocument();
    }
  }, [graphId, documentId]);

  const fetchGraph = async () => {
    if (!graphId) return;
    setLoading(true);
    try {
      const { graph: fetchedGraph } = await api.getKnowledgeGraph(graphId);
      setGraph({
        nodes: fetchedGraph.nodes,
        edges: fetchedGraph.edges,
      });
      // Apply force-directed layout if no positions
      if (fetchedGraph.nodes.some((n: GraphNode) => n.x === null)) {
        applyForceLayout(fetchedGraph.nodes, fetchedGraph.edges);
      }
    } catch (error) {
      console.error('Failed to fetch graph:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildGraphFromDocument = async () => {
    if (!documentId) return;
    setLoading(true);
    try {
      const { graph: newGraph } = await api.buildGraphFromDocument(documentId);
      setGraph({
        nodes: newGraph.nodes,
        edges: newGraph.edges,
      });
      applyForceLayout(newGraph.nodes, newGraph.edges);
      onGraphCreated?.(newGraph);
    } catch (error) {
      console.error('Failed to build graph:', error);
    } finally {
      setLoading(false);
    }
  };

  // Simple force-directed layout
  const applyForceLayout = (nodes: GraphNode[], edges: GraphEdge[]) => {
    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;

    // Initialize random positions
    const positions = new Map<string, { x: number; y: number }>();
    nodes.forEach((node) => {
      positions.set(node.id, {
        x: node.x ?? Math.random() * width * 0.8 + width * 0.1,
        y: node.y ?? Math.random() * height * 0.8 + height * 0.1,
      });
    });

    // Simple force simulation
    const iterations = 100;
    const k = Math.sqrt((width * height) / nodes.length) * 0.5;

    for (let i = 0; i < iterations; i++) {
      // Repulsive forces between all nodes
      nodes.forEach((node1) => {
        const pos1 = positions.get(node1.id)!;
        nodes.forEach((node2) => {
          if (node1.id === node2.id) return;
          const pos2 = positions.get(node2.id)!;
          const dx = pos1.x - pos2.x;
          const dy = pos1.y - pos2.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (k * k) / dist;
          pos1.x += (dx / dist) * force * 0.1;
          pos1.y += (dy / dist) * force * 0.1;
        });
      });

      // Attractive forces along edges
      edges.forEach((edge) => {
        const sourcePos = positions.get(edge.sourceId);
        const targetPos = positions.get(edge.targetId);
        if (!sourcePos || !targetPos) return;

        const dx = targetPos.x - sourcePos.x;
        const dy = targetPos.y - sourcePos.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist * dist) / k;

        sourcePos.x += (dx / dist) * force * 0.01;
        sourcePos.y += (dy / dist) * force * 0.01;
        targetPos.x -= (dx / dist) * force * 0.01;
        targetPos.y -= (dy / dist) * force * 0.01;
      });

      // Keep nodes within bounds
      positions.forEach((pos) => {
        pos.x = Math.max(50, Math.min(width - 50, pos.x));
        pos.y = Math.max(50, Math.min(height - 50, pos.y));
      });
    }

    // Update nodes with positions
    const updatedNodes = nodes.map((node) => ({
      ...node,
      x: positions.get(node.id)!.x,
      y: positions.get(node.id)!.y,
    }));

    setGraph({ nodes: updatedNodes, edges });
  };

  // Draw graph on canvas
  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !graph) return;

    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    // Draw edges
    graph.edges.forEach((edge) => {
      const sourceNode = graph.nodes.find((n) => n.id === edge.sourceId);
      const targetNode = graph.nodes.find((n) => n.id === edge.targetId);
      if (!sourceNode?.x || !targetNode?.x) return;

      ctx.beginPath();
      ctx.moveTo(sourceNode.x, sourceNode.y!);
      ctx.lineTo(targetNode.x, targetNode.y!);
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)';
      ctx.lineWidth = edge.weight * 2;
      ctx.stroke();

      // Edge label
      const midX = (sourceNode.x + targetNode.x) / 2;
      const midY = (sourceNode.y! + targetNode.y!) / 2;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(edge.label, midX, midY - 5);
    });

    // Draw nodes
    graph.nodes.forEach((node) => {
      if (node.x === undefined || node.y === undefined) return;

      const nodeType = NODE_TYPES.find((t) => t.type === node.type);
      const radius = 20 * (node.size || 1);
      const color = node.color || nodeType?.color || '#8b5cf6';

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = selectedNode?.id === node.id ? color : `${color}cc`;
      ctx.fill();

      // Selection ring
      if (selectedNode?.id === node.id) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Node label
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(node.label, node.x, node.y + radius + 15);
    });

    ctx.restore();
  }, [graph, zoom, offset, selectedNode]);

  useEffect(() => {
    drawGraph();
  }, [drawGraph]);

  // Handle canvas interactions
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !graph) return;

    const x = (e.clientX - rect.left - offset.x) / zoom;
    const y = (e.clientY - rect.top - offset.y) / zoom;

    // Check if clicking on a node
    const clickedNode = graph.nodes.find((node) => {
      if (node.x === undefined || node.y === undefined) return false;
      const dist = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
      return dist < 20 * (node.size || 1);
    });

    if (clickedNode) {
      setSelectedNode(clickedNode);
      setDraggingNode(clickedNode.id);
    } else {
      setSelectedNode(null);
      setIsDragging(true);
    }

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingNode && graph) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (e.clientX - rect.left - offset.x) / zoom;
      const y = (e.clientY - rect.top - offset.y) / zoom;

      setGraph((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          nodes: prev.nodes.map((node) =>
            node.id === draggingNode ? { ...node, x, y } : node
          ),
        };
      });
    } else if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = async () => {
    if (draggingNode && graph) {
      const node = graph.nodes.find((n) => n.id === draggingNode);
      if (node?.x !== undefined && node?.y !== undefined) {
        try {
          await api.updateNodePosition(draggingNode, node.x, node.y);
        } catch (error) {
          console.error('Failed to save node position:', error);
        }
      }
    }
    setIsDragging(false);
    setDraggingNode(null);
  };

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.max(0.25, Math.min(3, prev + delta)));
  };

  const handleAddNode = async () => {
    if (!newNode.label || !graphId) return;
    try {
      const { node } = await api.addGraphNode(graphId, {
        ...newNode,
        x: containerRef.current ? containerRef.current.clientWidth / 2 : 400,
        y: containerRef.current ? containerRef.current.clientHeight / 2 : 300,
      });
      setGraph((prev) => prev ? { ...prev, nodes: [...prev.nodes, node] } : null);
      setShowAddNode(false);
      setNewNode({ label: '', type: 'concept' });
    } catch (error) {
      console.error('Failed to add node:', error);
    }
  };

  const handleAddEdge = async () => {
    if (!newEdge.sourceId || !newEdge.targetId || !newEdge.label || !graphId) return;
    try {
      const { edge } = await api.addGraphEdge(graphId, newEdge);
      setGraph((prev) => prev ? { ...prev, edges: [...prev.edges, edge] } : null);
      setShowAddEdge(false);
      setNewEdge({ sourceId: '', targetId: '', label: '' });
    } catch (error) {
      console.error('Failed to add edge:', error);
    }
  };

  const handleDeleteNode = async () => {
    if (!selectedNode) return;
    try {
      await api.deleteGraphNode(selectedNode.id);
      setGraph((prev) => {
        if (!prev) return null;
        return {
          nodes: prev.nodes.filter((n) => n.id !== selectedNode.id),
          edges: prev.edges.filter(
            (e) => e.sourceId !== selectedNode.id && e.targetId !== selectedNode.id
          ),
        };
      });
      setSelectedNode(null);
    } catch (error) {
      console.error('Failed to delete node:', error);
    }
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

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Knowledge Graph
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon-sm" onClick={() => handleZoom(-0.25)}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs text-foreground-secondary w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="ghost" size="icon-sm" onClick={() => handleZoom(0.25)}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setShowAddNode(true)}>
              <Plus className="h-4 w-4" />
            </Button>
            {selectedNode && (
              <Button variant="ghost" size="icon-sm" onClick={handleDeleteNode}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 relative" ref={containerRef}>
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-background-secondary/90 rounded-lg p-3">
          <p className="text-xs font-medium mb-2">Entity Types</p>
          <div className="grid grid-cols-2 gap-2">
            {NODE_TYPES.map((type) => (
              <div key={type.type} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: type.color }}
                />
                <span className="text-xs">{type.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected node info */}
        {selectedNode && (
          <div className="absolute top-4 right-4 bg-background-secondary/90 rounded-lg p-3 max-w-xs">
            <p className="font-medium">{selectedNode.label}</p>
            <p className="text-xs text-foreground-secondary capitalize">{selectedNode.type}</p>
            {selectedNode.properties && (
              <div className="mt-2 text-xs">
                {Object.entries(JSON.parse(selectedNode.properties)).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-foreground-secondary">{key}:</span> {String(value)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Add Node Modal */}
      <Modal
        isOpen={showAddNode}
        onClose={() => setShowAddNode(false)}
        title="Add Node"
      >
        <div className="space-y-4">
          <Input
            placeholder="Node label"
            value={newNode.label}
            onChange={(e) => setNewNode((prev) => ({ ...prev, label: e.target.value }))}
          />
          <div className="grid grid-cols-3 gap-2">
            {NODE_TYPES.map((type) => (
              <button
                key={type.type}
                onClick={() => setNewNode((prev) => ({ ...prev, type: type.type }))}
                className={cn(
                  'flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors',
                  newNode.type === type.type
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <type.icon className="h-5 w-5" style={{ color: type.color }} />
                <span className="text-xs">{type.label}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowAddNode(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNode}>Add Node</Button>
          </div>
        </div>
      </Modal>

      {/* Add Edge Modal */}
      <Modal
        isOpen={showAddEdge}
        onClose={() => setShowAddEdge(false)}
        title="Add Connection"
      >
        <div className="space-y-4">
          <select
            className="w-full px-3 py-2 rounded-lg bg-background-tertiary border border-border"
            value={newEdge.sourceId}
            onChange={(e) => setNewEdge((prev) => ({ ...prev, sourceId: e.target.value }))}
          >
            <option value="">Select source node</option>
            {graph?.nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.label}
              </option>
            ))}
          </select>
          <Input
            placeholder="Relationship (e.g., 'works at', 'located in')"
            value={newEdge.label}
            onChange={(e) => setNewEdge((prev) => ({ ...prev, label: e.target.value }))}
          />
          <select
            className="w-full px-3 py-2 rounded-lg bg-background-tertiary border border-border"
            value={newEdge.targetId}
            onChange={(e) => setNewEdge((prev) => ({ ...prev, targetId: e.target.value }))}
          >
            <option value="">Select target node</option>
            {graph?.nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.label}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowAddEdge(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddEdge}>Add Connection</Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
