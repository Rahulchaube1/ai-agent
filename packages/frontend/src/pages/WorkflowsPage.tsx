import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Play,
  Copy,
  Trash2,
  Workflow,
  Clock,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface WorkflowItem {
  id: string;
  name: string;
  description: string;
  active: boolean;
  tags: string[];
  lastRun: string;
  executionCount: number;
}

const mockWorkflows: WorkflowItem[] = [
  {
    id: '1',
    name: 'Email Notification Pipeline',
    description: 'Sends automated email notifications based on webhook triggers from the CRM system.',
    active: true,
    tags: ['email', 'webhook', 'production'],
    lastRun: '2 min ago',
    executionCount: 3452,
  },
  {
    id: '2',
    name: 'Data Sync - CRM to Database',
    description: 'Synchronizes customer data between HubSpot CRM and PostgreSQL database every hour.',
    active: true,
    tags: ['sync', 'database', 'scheduled'],
    lastRun: '15 min ago',
    executionCount: 1890,
  },
  {
    id: '3',
    name: 'AI Content Generator',
    description: 'Generates blog content using GPT-4 and publishes to WordPress via REST API.',
    active: true,
    tags: ['ai', 'content', 'wordpress'],
    lastRun: '1 hour ago',
    executionCount: 245,
  },
  {
    id: '4',
    name: 'Slack Alert System',
    description: 'Monitors server health metrics and sends Slack alerts when thresholds are exceeded.',
    active: false,
    tags: ['monitoring', 'slack', 'alerts'],
    lastRun: '3 days ago',
    executionCount: 5621,
  },
  {
    id: '5',
    name: 'Invoice Processing',
    description: 'Extracts data from PDF invoices using OCR and creates entries in the accounting system.',
    active: true,
    tags: ['finance', 'ocr', 'automation'],
    lastRun: '30 min ago',
    executionCount: 876,
  },
  {
    id: '6',
    name: 'Social Media Scheduler',
    description: 'Schedules and publishes posts across Twitter, LinkedIn, and Instagram simultaneously.',
    active: false,
    tags: ['social', 'marketing', 'scheduled'],
    lastRun: '1 week ago',
    executionCount: 312,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

export default function WorkflowsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filtered = mockWorkflows.filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.description.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && w.active) ||
      (filter === 'inactive' && !w.active);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Workflows</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor your automation workflows
          </p>
        </div>
        <Button className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25">
          <Plus className="w-4 h-4" /> New Workflow
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search workflows..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Workflow Grid */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
            <Workflow className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No workflows found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search ? 'Try a different search term' : 'Create your first workflow to get started'}
          </p>
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Create Workflow
          </Button>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          {filtered.map((workflow) => (
            <motion.div key={workflow.id} variants={itemVariants}>
              <Card
                className="group border-border/50 bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 cursor-pointer"
                onClick={() => navigate(`/workflows/${workflow.id}/edit`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-foreground truncate">
                          {workflow.name}
                        </h3>
                        <Badge
                          variant={workflow.active ? 'default' : 'secondary'}
                          className={`text-[10px] px-1.5 py-0 shrink-0 ${
                            workflow.active
                              ? 'bg-green-500/15 text-green-400 border-green-500/30'
                              : ''
                          }`}
                        >
                          {workflow.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {workflow.description}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/workflows/${workflow.id}/edit`); }}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                          <Play className="w-4 h-4 mr-2" /> Execute
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                          <Copy className="w-4 h-4 mr-2" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => e.stopPropagation()}
                          className="text-red-400"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {workflow.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 text-muted-foreground"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {workflow.lastRun}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <BarChart3 className="w-3 h-3" />
                      {workflow.executionCount.toLocaleString()} runs
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
