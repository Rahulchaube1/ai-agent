import React, { useState } from 'react';
import type { Node } from '@xyflow/react';
import { X, Trash2, PlayCircle, Settings, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface NodeConfigPanelProps {
  node: Node;
  onClose: () => void;
  onUpdateConfig: (config: Record<string, unknown>) => void;
}

const nodeTypeConfigs: Record<string, Array<{ key: string; label: string; type: string; placeholder?: string }>> = {
  'http-request': [
    { key: 'url', label: 'URL', type: 'text', placeholder: 'https://api.example.com/data' },
    { key: 'method', label: 'Method', type: 'select', placeholder: 'GET' },
    { key: 'headers', label: 'Headers (JSON)', type: 'textarea', placeholder: '{"Content-Type": "application/json"}' },
    { key: 'body', label: 'Body', type: 'textarea', placeholder: '{}' },
  ],
  'webhook': [
    { key: 'path', label: 'Webhook Path', type: 'text', placeholder: '/my-webhook' },
    { key: 'method', label: 'HTTP Method', type: 'select', placeholder: 'POST' },
  ],
  'schedule': [
    { key: 'cron', label: 'Cron Expression', type: 'text', placeholder: '0 */5 * * * *' },
    { key: 'timezone', label: 'Timezone', type: 'text', placeholder: 'UTC' },
  ],
  'if-else': [
    { key: 'field', label: 'Field', type: 'text', placeholder: '{{previousNode.value}}' },
    { key: 'operator', label: 'Operator', type: 'select', placeholder: 'equals' },
    { key: 'value', label: 'Value', type: 'text', placeholder: 'expected value' },
  ],
  'send-email': [
    { key: 'to', label: 'To', type: 'text', placeholder: 'user@example.com' },
    { key: 'subject', label: 'Subject', type: 'text', placeholder: 'Email subject' },
    { key: 'body', label: 'Body', type: 'textarea', placeholder: 'Email body...' },
  ],
  'delay': [
    { key: 'duration', label: 'Duration (ms)', type: 'number', placeholder: '1000' },
  ],
  'llm-chat': [
    { key: 'model', label: 'Model', type: 'text', placeholder: 'claude-sonnet-4-5-20250929' },
    { key: 'systemPrompt', label: 'System Prompt', type: 'textarea', placeholder: 'You are a helpful assistant...' },
    { key: 'userPrompt', label: 'User Prompt', type: 'textarea', placeholder: '{{input.message}}' },
    { key: 'temperature', label: 'Temperature', type: 'number', placeholder: '0.7' },
  ],
  'javascript': [
    { key: 'code', label: 'Code', type: 'textarea', placeholder: '// Write your code here\nreturn { result: input.data };' },
  ],
  'filter': [
    { key: 'field', label: 'Field', type: 'text', placeholder: 'items' },
    { key: 'condition', label: 'Condition', type: 'text', placeholder: 'item.active === true' },
  ],
  'set-variable': [
    { key: 'name', label: 'Variable Name', type: 'text', placeholder: 'myVar' },
    { key: 'value', label: 'Value', type: 'text', placeholder: '{{previousNode.output}}' },
  ],
};

export function NodeConfigPanel({ node, onClose, onUpdateConfig }: NodeConfigPanelProps) {
  const config = (node.data.config as Record<string, unknown>) || {};
  const nodeType = (node.data.nodeType as string) || node.type || '';
  const fields = nodeTypeConfigs[nodeType] || [];
  const [continueOnError, setContinueOnError] = useState(false);
  const [retryCount, setRetryCount] = useState('0');

  const updateField = (key: string, value: string) => {
    onUpdateConfig({ ...config, [key]: value });
  };

  const categoryColor: Record<string, string> = {
    trigger: 'text-green-500 bg-green-500/10',
    action: 'text-indigo-500 bg-indigo-500/10',
    logic: 'text-amber-500 bg-amber-500/10',
    code: 'text-cyan-500 bg-cyan-500/10',
    ai: 'text-purple-500 bg-purple-500/10',
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded', categoryColor[node.type || ''] || 'text-muted-foreground bg-muted')}>
            {node.type}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <Input
          value={(node.data.label as string) || ''}
          className="text-base font-semibold h-9 bg-transparent border-none p-0 focus-visible:ring-0"
          readOnly
        />
        <p className="text-xs text-muted-foreground mt-0.5">ID: {node.id}</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="configure" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-3 grid grid-cols-3 h-9">
          <TabsTrigger value="configure" className="text-xs gap-1.5">
            <Settings className="w-3.5 h-3.5" /> Config
          </TabsTrigger>
          <TabsTrigger value="input" className="text-xs gap-1.5">
            <ArrowDownToLine className="w-3.5 h-3.5" /> Input
          </TabsTrigger>
          <TabsTrigger value="output" className="text-xs gap-1.5">
            <ArrowUpFromLine className="w-3.5 h-3.5" /> Output
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configure" className="flex-1 overflow-y-auto p-4 space-y-4 mt-0">
          {fields.length > 0 ? (
            fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-xs font-medium">{field.label}</Label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={(config[field.key] as string) || ''}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono"
                    rows={4}
                  />
                ) : (
                  <Input
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={(config[field.key] as string) || ''}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="h-9 text-xs"
                  />
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No configuration needed for this node.
            </p>
          )}

          <Separator />

          {/* Error Handling */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Error Handling</h4>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Continue on Error</Label>
              <Switch checked={continueOnError} onCheckedChange={setContinueOnError} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Retry Count</Label>
              <Input
                type="number"
                value={retryCount}
                onChange={(e) => setRetryCount(e.target.value)}
                min={0}
                max={5}
                className="h-9 text-xs w-24"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="input" className="flex-1 overflow-y-auto p-4 mt-0">
          <div className="text-center py-12">
            <ArrowDownToLine className="w-8 h-8 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Input data will appear here after execution.</p>
          </div>
        </TabsContent>

        <TabsContent value="output" className="flex-1 overflow-y-auto p-4 mt-0">
          <div className="text-center py-12">
            <ArrowUpFromLine className="w-8 h-8 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Output data will appear here after execution.</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="p-4 border-t border-border flex items-center gap-2">
        <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs">
          <PlayCircle className="w-3.5 h-3.5" /> Test Node
        </Button>
        <Button variant="destructive" size="sm" className="gap-1.5 text-xs">
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </Button>
      </div>
    </div>
  );
}
