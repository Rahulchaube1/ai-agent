import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Ban,
  Eye,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Execution {
  id: string;
  workflowName: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  mode: 'manual' | 'webhook' | 'schedule';
  startedAt: string;
  duration: string;
}

const mockExecutions: Execution[] = [
  {
    id: 'exec_001',
    workflowName: 'Email Notification Pipeline',
    status: 'completed',
    mode: 'webhook',
    startedAt: '2025-01-15 14:32:10',
    duration: '2.4s',
  },
  {
    id: 'exec_002',
    workflowName: 'Data Sync - CRM',
    status: 'completed',
    mode: 'schedule',
    startedAt: '2025-01-15 14:30:00',
    duration: '8.1s',
  },
  {
    id: 'exec_003',
    workflowName: 'AI Content Generator',
    status: 'running',
    mode: 'manual',
    startedAt: '2025-01-15 14:28:45',
    duration: '45s',
  },
  {
    id: 'exec_004',
    workflowName: 'Webhook Handler',
    status: 'failed',
    mode: 'webhook',
    startedAt: '2025-01-15 14:25:12',
    duration: '0.3s',
  },
  {
    id: 'exec_005',
    workflowName: 'Invoice Processing',
    status: 'completed',
    mode: 'schedule',
    startedAt: '2025-01-15 14:20:00',
    duration: '15.2s',
  },
  {
    id: 'exec_006',
    workflowName: 'Slack Alert System',
    status: 'cancelled',
    mode: 'manual',
    startedAt: '2025-01-15 14:15:33',
    duration: '3.1s',
  },
  {
    id: 'exec_007',
    workflowName: 'Social Media Scheduler',
    status: 'completed',
    mode: 'schedule',
    startedAt: '2025-01-15 14:00:00',
    duration: '4.7s',
  },
  {
    id: 'exec_008',
    workflowName: 'Email Notification Pipeline',
    status: 'failed',
    mode: 'webhook',
    startedAt: '2025-01-15 13:55:21',
    duration: '0.8s',
  },
];

const statusConfig: Record<
  string,
  { icon: typeof CheckCircle2; color: string; bgColor: string; label: string }
> = {
  running: {
    icon: Loader2,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    label: 'Running',
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-green-400',
    bgColor: 'bg-green-500/15 text-green-400 border-green-500/30',
    label: 'Completed',
  },
  failed: {
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/15 text-red-400 border-red-500/30',
    label: 'Failed',
  },
  cancelled: {
    icon: Ban,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
    label: 'Cancelled',
  },
};

const modeConfig: Record<string, string> = {
  manual: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  webhook: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  schedule: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
};

export default function ExecutionsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 5;

  const filtered = mockExecutions.filter((exec) => {
    const matchesSearch = exec.workflowName
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || exec.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Executions</h1>
        <p className="text-muted-foreground mt-1">
          Monitor and review workflow execution history
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by workflow name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 h-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">
                  Workflow
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">
                  Mode
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">
                  Started At
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">
                  Duration
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground px-6 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((exec) => {
                const config = statusConfig[exec.status];
                const StatusIcon = config.icon;
                return (
                  <tr
                    key={exec.id}
                    className="border-b border-border/50 hover:bg-accent/30 transition-colors"
                  >
                    <td className="px-6 py-3.5">
                      <Badge
                        variant="outline"
                        className={`gap-1.5 ${config.bgColor}`}
                      >
                        <StatusIcon
                          className={`w-3 h-3 ${
                            exec.status === 'running' ? 'animate-spin' : ''
                          }`}
                        />
                        {config.label}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-sm font-medium text-foreground">
                        {exec.workflowName}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge
                        variant="outline"
                        className={`capitalize ${modeConfig[exec.mode]}`}
                      >
                        {exec.mode}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {exec.startedAt}
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-sm text-muted-foreground">
                        {exec.duration}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border/50 bg-muted/20">
          <span className="text-xs text-muted-foreground">
            Showing {(currentPage - 1) * perPage + 1} to{' '}
            {Math.min(currentPage * perPage, filtered.length)} of {filtered.length} results
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? 'default' : 'outline'}
                size="icon"
                className="h-7 w-7 text-xs"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
