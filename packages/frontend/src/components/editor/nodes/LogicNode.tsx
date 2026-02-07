import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';

export const LogicNode = memo(({ data, selected }: NodeProps) => {
  const status = (data.status as string) || 'idle';
  const statusColors: Record<string, string> = {
    idle: 'border-amber-500/30 bg-card',
    running: 'border-amber-400 bg-amber-500/5 shadow-amber-400/25 shadow-lg',
    completed: 'border-amber-500 bg-amber-500/5',
    failed: 'border-red-500 bg-red-500/5',
  };

  return (
    <div
      className={cn(
        'px-4 py-3 rounded-xl border-2 min-w-[200px] transition-all duration-200',
        statusColors[status] || statusColors.idle,
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        status === 'running' && 'animate-pulse'
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-background"
      />
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
          <GitBranch className="w-4 h-4 text-amber-500" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-500">Logic</div>
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
      <div className="flex justify-between mt-1 px-2">
        <span className="text-[9px] text-green-500 font-medium">True</span>
        <span className="text-[9px] text-red-400 font-medium">False</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-background !left-[30%]"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="!w-3 !h-3 !bg-red-400 !border-2 !border-background !left-[70%]"
      />
    </div>
  );
});

LogicNode.displayName = 'LogicNode';
