import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Search, ChevronRight, Zap, Clock, Play, Radio,
  Globe, Mail, Database, Timer,
  GitBranch, ArrowRightLeft, GitMerge, Filter, Repeat, Variable,
  FileCode, Braces,
  Brain, Bot, Tags,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NodeItem {
  type: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: string;
}

const nodeCategories: Array<{
  name: string;
  key: string;
  color: string;
  nodes: NodeItem[];
}> = [
  {
    name: 'Triggers',
    key: 'trigger',
    color: 'text-green-500',
    nodes: [
      { type: 'webhook', label: 'Webhook', description: 'Trigger on HTTP request', icon: <Zap className="w-4 h-4" />, category: 'trigger' },
      { type: 'schedule', label: 'Schedule', description: 'Trigger on cron schedule', icon: <Clock className="w-4 h-4" />, category: 'trigger' },
      { type: 'manual', label: 'Manual Trigger', description: 'Trigger manually', icon: <Play className="w-4 h-4" />, category: 'trigger' },
      { type: 'event', label: 'Event Trigger', description: 'Trigger on event', icon: <Radio className="w-4 h-4" />, category: 'trigger' },
    ],
  },
  {
    name: 'Actions',
    key: 'action',
    color: 'text-indigo-500',
    nodes: [
      { type: 'http-request', label: 'HTTP Request', description: 'Make HTTP API calls', icon: <Globe className="w-4 h-4" />, category: 'action' },
      { type: 'send-email', label: 'Send Email', description: 'Send an email via SMTP', icon: <Mail className="w-4 h-4" />, category: 'action' },
      { type: 'database', label: 'Database Query', description: 'Query a database', icon: <Database className="w-4 h-4" />, category: 'action' },
      { type: 'delay', label: 'Delay', description: 'Wait for a duration', icon: <Timer className="w-4 h-4" />, category: 'action' },
    ],
  },
  {
    name: 'Logic',
    key: 'logic',
    color: 'text-amber-500',
    nodes: [
      { type: 'if-else', label: 'If / Else', description: 'Conditional branching', icon: <GitBranch className="w-4 h-4" />, category: 'logic' },
      { type: 'switch', label: 'Switch', description: 'Multi-way branching', icon: <ArrowRightLeft className="w-4 h-4" />, category: 'logic' },
      { type: 'merge', label: 'Merge', description: 'Combine multiple inputs', icon: <GitMerge className="w-4 h-4" />, category: 'logic' },
      { type: 'filter', label: 'Filter', description: 'Filter data by condition', icon: <Filter className="w-4 h-4" />, category: 'logic' },
      { type: 'loop', label: 'Loop', description: 'Iterate over items', icon: <Repeat className="w-4 h-4" />, category: 'logic' },
      { type: 'set-variable', label: 'Set Variable', description: 'Set a workflow variable', icon: <Variable className="w-4 h-4" />, category: 'logic' },
    ],
  },
  {
    name: 'Code',
    key: 'code',
    color: 'text-cyan-500',
    nodes: [
      { type: 'javascript', label: 'JavaScript', description: 'Run custom JavaScript', icon: <FileCode className="w-4 h-4" />, category: 'code' },
      { type: 'function', label: 'Function', description: 'Custom function node', icon: <Braces className="w-4 h-4" />, category: 'code' },
    ],
  },
  {
    name: 'AI',
    key: 'ai',
    color: 'text-purple-500',
    nodes: [
      { type: 'llm-chat', label: 'LLM Chat', description: 'Chat with an AI model', icon: <Brain className="w-4 h-4" />, category: 'ai' },
      { type: 'ai-agent', label: 'AI Agent', description: 'Autonomous AI agent', icon: <Bot className="w-4 h-4" />, category: 'ai' },
      { type: 'classifier', label: 'Classifier', description: 'AI text classification', icon: <Tags className="w-4 h-4" />, category: 'ai' },
    ],
  },
];

interface NodesPanelProps {
  onClose: () => void;
}

export function NodesPanel({ onClose }: NodesPanelProps) {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(nodeCategories.map((c) => c.key))
  );

  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filteredCategories = nodeCategories
    .map((cat) => ({
      ...cat,
      nodes: cat.nodes.filter(
        (n) =>
          n.label.toLowerCase().includes(search.toLowerCase()) ||
          n.description.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((cat) => cat.nodes.length > 0);

  const onDragStart = (event: React.DragEvent, node: NodeItem) => {
    event.dataTransfer.setData('application/flowforge-node-type', node.type);
    event.dataTransfer.setData('application/flowforge-node-label', node.label);
    event.dataTransfer.setData('application/flowforge-node-category', node.category);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-sm">Add Node</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {filteredCategories.map((category) => (
          <div key={category.key} className="mb-2">
            <button
              onClick={() => toggleCategory(category.key)}
              className="w-full flex items-center gap-2 py-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight
                className={cn(
                  'w-3.5 h-3.5 transition-transform',
                  expandedCategories.has(category.key) && 'rotate-90'
                )}
              />
              <span className={category.color}>{category.name}</span>
              <span className="ml-auto text-[10px] text-muted-foreground/60">{category.nodes.length}</span>
            </button>

            <AnimatePresence>
              {expandedCategories.has(category.key) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  {category.nodes.map((node) => (
                    <div
                      key={node.type}
                      draggable
                      onDragStart={(e) => onDragStart(e, node)}
                      className="flex items-center gap-3 p-2.5 rounded-lg cursor-grab active:cursor-grabbing hover:bg-accent/50 transition-colors mb-0.5 group"
                    >
                      <div
                        className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                          category.key === 'trigger' && 'bg-green-500/10 text-green-500',
                          category.key === 'action' && 'bg-indigo-500/10 text-indigo-500',
                          category.key === 'logic' && 'bg-amber-500/10 text-amber-500',
                          category.key === 'code' && 'bg-cyan-500/10 text-cyan-500',
                          category.key === 'ai' && 'bg-purple-500/10 text-purple-500'
                        )}
                      >
                        {node.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">{node.label}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{node.description}</div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
