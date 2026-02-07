import React, { useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  BackgroundVariant,
  NodeTypes,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Save,
  Plus,
  Workflow,
  ArrowLeft,
  MoreHorizontal,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { TriggerNode } from '@/components/editor/nodes/TriggerNode';
import { ActionNode } from '@/components/editor/nodes/ActionNode';
import { LogicNode } from '@/components/editor/nodes/LogicNode';
import { CodeNodeComponent } from '@/components/editor/nodes/CodeNodeComponent';
import { AINodeComponent } from '@/components/editor/nodes/AINodeComponent';
import { NodesPanel } from '@/components/editor/NodesPanel';
import { NodeConfigPanel } from '@/components/editor/NodeConfigPanel';

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  logic: LogicNode,
  code: CodeNodeComponent,
  ai: AINodeComponent,
};

function EditorInner() {
  const navigate = useNavigate();
  const reactFlow = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [nodesPanelOpen, setNodesPanelOpen] = useState(false);
  const [configPanelOpen, setConfigPanelOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [workflowName, setWorkflowName] = useState('Untitled Workflow');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: '#6366f1', strokeWidth: 2 },
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setConfigPanelOpen(true);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setConfigPanelOpen(false);
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData(
        'application/flowforge-node-type',
      );
      const label = event.dataTransfer.getData(
        'application/flowforge-node-label',
      );
      const category = event.dataTransfer.getData(
        'application/flowforge-node-category',
      );
      if (!type || !wrapperRef.current) return;
      const bounds = wrapperRef.current.getBoundingClientRect();
      const position = reactFlow.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
      const newNode: Node = {
        id: `${type}_${Date.now()}`,
        type: category || 'action',
        position,
        data: {
          label: label || type,
          nodeType: type,
          config: {},
          status: 'idle',
        },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [reactFlow, setNodes],
  );

  const handleExecute = useCallback(() => {
    setIsExecuting(true);
    // Simulate execution - in real app would call API
    nodes.forEach((node, i) => {
      setTimeout(() => {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id
              ? { ...n, data: { ...n.data, status: 'running' } }
              : n,
          ),
        );
        setTimeout(() => {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === node.id
                ? { ...n, data: { ...n.data, status: 'completed' } }
                : n,
            ),
          );
          if (i === nodes.length - 1) setIsExecuting(false);
        }, 800);
      }, i * 1000);
    });
  }, [nodes, setNodes]);

  return (
    <div className="h-screen w-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/workflows')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-border" />
          <Input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="w-64 h-8 bg-transparent border-none text-sm font-medium focus-visible:ring-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNodesPanelOpen(!nodesPanelOpen)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" /> Add Node
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Save className="w-4 h-4" /> Save
          </Button>
          <Button
            size="sm"
            onClick={handleExecute}
            disabled={isExecuting || nodes.length === 0}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            {isExecuting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isExecuting ? 'Running...' : 'Execute'}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex relative overflow-hidden">
        {/* Nodes Panel */}
        <AnimatePresence>
          {nodesPanelOpen && (
            <motion.div
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-80 border-r border-border bg-card z-10 absolute left-0 top-0 bottom-0 shadow-xl"
            >
              <NodesPanel onClose={() => setNodesPanelOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Canvas */}
        <div ref={wrapperRef} className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: '#6366f1', strokeWidth: 2 },
            }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={16}
              size={1}
              color="hsl(var(--muted-foreground) / 0.15)"
            />
            <Controls className="bg-card border border-border rounded-lg shadow-lg [&>button]:bg-card [&>button]:border-border [&>button]:text-foreground [&>button:hover]:bg-accent" />
            <MiniMap
              className="bg-card border border-border rounded-lg shadow-lg"
              maskColor="hsl(var(--background) / 0.7)"
              nodeColor={(n) => {
                if (n.type === 'trigger') return '#22c55e';
                if (n.type === 'logic') return '#f59e0b';
                if (n.type === 'ai') return '#8b5cf6';
                if (n.type === 'code') return '#06b6d4';
                return '#6366f1';
              }}
            />
            {nodes.length === 0 && (
              <Panel position="top-center">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-32 text-center"
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Workflow className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Start Building Your Workflow
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Drag nodes from the panel or click &quot;Add Node&quot; to
                    begin
                  </p>
                  <Button
                    onClick={() => setNodesPanelOpen(true)}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add First Node
                  </Button>
                </motion.div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* Config Panel */}
        <AnimatePresence>
          {configPanelOpen && selectedNode && (
            <motion.div
              initial={{ x: 384, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 384, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-96 border-l border-border bg-card z-10 absolute right-0 top-0 bottom-0 shadow-xl overflow-y-auto"
            >
              <NodeConfigPanel
                node={selectedNode}
                onClose={() => {
                  setConfigPanelOpen(false);
                  setSelectedNode(null);
                }}
                onUpdateConfig={(config) => {
                  setNodes((nds) =>
                    nds.map((n) =>
                      n.id === selectedNode.id
                        ? { ...n, data: { ...n.data, config } }
                        : n,
                    ),
                  );
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function WorkflowEditorPage() {
  return (
    <ReactFlowProvider>
      <EditorInner />
    </ReactFlowProvider>
  );
}
