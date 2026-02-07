import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ActionNode = memo(({ data, selected }: NodeProps) => {
  const status = (data.status as string) || 'idle';
  const statusColors: Record<string, string> = {
    idle: 'border-indigo-500/30 bg-card',
    running: 'border-indigo-400 bg-indigo-500/5 shadow-indigo-400/25 shadow-lg',
    completed: 'border-indigo-500 bg-indigo-500/5',
    failed: 'border-red-500 bg-red-500/5',
  };

  return (
    <div
      className={cn(
        'px-4 py-3 rounded-xl border-2 min-w-[180px] transition-all duration-200',
        statusColors[status] || statusColors.idle,
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        status === 'running' && 'animate-pulse'
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-background"
      />
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
          <Globe className="w-4 h-4 text-indigo-500" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500">Action</div>
          <div className="text-sm font-semibold text-foreground truncate">{data.label as string}</div>
        </div>
      </div>
      {status !== 'idle' && (
        <div className="mt-2 flex items-center gap-1.5">
          <div
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              status === 'running' && 'bg-blue-400 animate-pulse',
              status === 'completed' && 'bg-green-500',
              status === 'failed' && 'bg-red-500'
            )}
          />
          <span className="text-[10px] text-muted-foreground capitalize">{status}</span>
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-background"
      />
    </div>
  );
});

ActionNode.displayName = 'ActionNode';
