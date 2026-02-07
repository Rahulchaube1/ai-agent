import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Workflow,
  Zap,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowUpRight,
  Download,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth.store';

const statsCards = [
  {
    title: 'Total Workflows',
    value: '24',
    icon: Workflow,
    trend: '+3',
    trendUp: true,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
  },
  {
    title: 'Active Workflows',
    value: '18',
    icon: Zap,
    trend: '+2',
    trendUp: true,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
  },
  {
    title: 'Total Executions',
    value: '12,847',
    icon: BarChart3,
    trend: '+847',
    trendUp: true,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  {
    title: 'Success Rate',
    value: '98.7%',
    icon: TrendingUp,
    trend: '+0.3%',
    trendUp: true,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
];

const recentExecutions = [
  {
    id: '1',
    workflow: 'Email Notification Pipeline',
    status: 'completed',
    duration: '2.4s',
    time: '2 min ago',
  },
  {
    id: '2',
    workflow: 'Data Sync - CRM',
    status: 'completed',
    duration: '8.1s',
    time: '5 min ago',
  },
  {
    id: '3',
    workflow: 'AI Content Generator',
    status: 'running',
    duration: '12s',
    time: '7 min ago',
  },
  {
    id: '4',
    workflow: 'Webhook Handler',
    status: 'failed',
    duration: '0.3s',
    time: '15 min ago',
  },
  {
    id: '5',
    workflow: 'Slack Alert System',
    status: 'completed',
    duration: '1.8s',
    time: '22 min ago',
  },
];

const activityData = [65, 85, 45, 78, 92, 88, 72, 95, 68, 82, 91, 77];

const statusConfig: Record<
  string,
  { icon: typeof CheckCircle2; color: string; label: string }
> = {
  completed: { icon: CheckCircle2, color: 'text-green-400', label: 'Completed' },
  running: { icon: Loader2, color: 'text-blue-400', label: 'Running' },
  failed: { icon: XCircle, color: 'text-red-400', label: 'Failed' },
  pending: { icon: Clock, color: 'text-yellow-400', label: 'Pending' },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Welcome Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {user?.firstName || 'User'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s what&apos;s happening with your workflows today.
          </p>
        </div>
        <Button
          onClick={() => navigate('/workflows')}
          className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25"
        >
          <Plus className="w-4 h-4" /> New Workflow
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <motion.div key={stat.title} variants={itemVariants}>
            <Card className="border-border/50 bg-card hover:bg-card/80 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div
                    className={`flex items-center gap-1 text-xs font-medium ${
                      stat.trendUp ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {stat.trendUp ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {stat.trend}
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">{stat.title}</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Executions */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Recent Executions</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/executions')}
                  className="gap-1 text-xs text-muted-foreground"
                >
                  View all <ArrowUpRight className="w-3 h-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="divide-y divide-border">
                {recentExecutions.map((exec) => {
                  const config = statusConfig[exec.status];
                  const StatusIcon = config.icon;
                  return (
                    <div
                      key={exec.id}
                      className="flex items-center justify-between px-6 py-3 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <StatusIcon
                          className={`w-4 h-4 ${config.color} ${
                            exec.status === 'running' ? 'animate-spin' : ''
                          }`}
                        />
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {exec.workflow}
                          </div>
                          <div className="text-xs text-muted-foreground">{exec.time}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{exec.duration}</span>
                        <Badge
                          variant={exec.status === 'failed' ? 'destructive' : 'secondary'}
                          className="text-[10px] px-2 py-0"
                        >
                          {config.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity Chart + Quick Actions */}
        <motion.div variants={itemVariants} className="space-y-4">
          {/* Activity Chart */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1.5 h-24">
                {activityData.map((value, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${value}%` }}
                    transition={{ delay: i * 0.05, duration: 0.5, ease: 'easeOut' }}
                    className="flex-1 rounded-sm bg-gradient-to-t from-indigo-500/60 to-indigo-400/30 hover:from-indigo-500/80 hover:to-indigo-400/50 transition-colors cursor-pointer"
                  />
                ))}
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[10px] text-muted-foreground">12h ago</span>
                <span className="text-[10px] text-muted-foreground">Now</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-10"
                onClick={() => navigate('/workflows')}
              >
                <Plus className="w-4 h-4 text-indigo-400" />
                Create Workflow
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-10"
              >
                <Download className="w-4 h-4 text-green-400" />
                Import Workflow
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-10"
              >
                <BookOpen className="w-4 h-4 text-blue-400" />
                View Documentation
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
