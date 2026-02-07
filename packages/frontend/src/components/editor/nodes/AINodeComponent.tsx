import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

export const AINodeComponent = memo(({ data, selected }: NodeProps) => {
  const status = (data.status as string) || 'idle';
  const statusColors: Record<string, string> = {
    idle: 'border-purple-500/30 bg-card',
    running: 'border-purple-400 bg-purple-500/5 shadow-purple-400/25 shadow-lg',
    completed: 'border-purple-500 bg-purple-500/5',
    failed: 'border-red-500 bg-red-500/5',
  };

  return (
    <div
      className={cn(
        'px-4 py-3 rounded-xl border-2 min-w-[180px] transition-all duration-200 relative overflow-hidden',
        statusColors[status] || statusColors.idle,
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        status === 'running' && 'animate-pulse'
      )}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/5 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />

      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-background"
      />
      <div className="flex items-center gap-2.5 relative">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-violet-500/20 flex items-center justify-center shrink-0">
          <Brain className="w-4 h-4 text-purple-500" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-purple-500">AI</div>
          <div className="text-sm font-semibold text-foreground truncate">{data.label as string}</div>
        </div>
      </div>
      {status !== 'idle' && (
        <div className="mt-2 flex items-center gap-1.5 relative">
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
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-background"
      />
    </div>
  );
});

AINodeComponent.displayName = 'AINodeComponent';
