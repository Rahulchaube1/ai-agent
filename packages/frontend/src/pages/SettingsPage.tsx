import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sun,
  Moon,
  Copy,
  Trash2,
  Plus,
  Check,
  Mail,
  Shield,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUIStore } from '@/stores/ui.store';

const teamMembers = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@flowforge.io',
    role: 'Owner',
    initials: 'JD',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@flowforge.io',
    role: 'Admin',
    initials: 'JS',
  },
  {
    id: '3',
    name: 'Bob Wilson',
    email: 'bob@flowforge.io',
    role: 'Member',
    initials: 'BW',
  },
  {
    id: '4',
    name: 'Alice Brown',
    email: 'alice@flowforge.io',
    role: 'Member',
    initials: 'AB',
  },
];

const apiKeys = [
  {
    id: '1',
    name: 'Production API Key',
    key: 'ff_prod_****************************a1b2',
    createdAt: 'Jan 10, 2025',
    lastUsed: '2 hours ago',
  },
  {
    id: '2',
    name: 'Development Key',
    key: 'ff_dev_*****************************c3d4',
    createdAt: 'Dec 15, 2024',
    lastUsed: '1 day ago',
  },
];

const roleColors: Record<string, string> = {
  Owner: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Admin: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  Member: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

export default function SettingsPage() {
  const { theme, setTheme } = useUIStore();
  const [orgName, setOrgName] = useState('FlowForge Inc.');
  const [timezone, setTimezone] = useState('utc');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopyKey = (id: string, key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization settings and preferences
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Organization</CardTitle>
              <CardDescription>
                Manage your organization details and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="max-w-md"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="max-w-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="utc">UTC (Coordinated Universal Time)</SelectItem>
                    <SelectItem value="est">EST (Eastern Standard Time)</SelectItem>
                    <SelectItem value="pst">PST (Pacific Standard Time)</SelectItem>
                    <SelectItem value="cet">CET (Central European Time)</SelectItem>
                    <SelectItem value="jst">JST (Japan Standard Time)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Team Members</CardTitle>
                  <CardDescription>
                    Manage who has access to your organization
                  </CardDescription>
                </div>
                <Button size="sm" className="gap-2">
                  <Mail className="w-4 h-4" /> Invite Member
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary">
                          {member.initials}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {member.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {member.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={roleColors[member.role]}
                      >
                        {member.role === 'Owner' && (
                          <Shield className="w-3 h-3 mr-1" />
                        )}
                        {member.role === 'Admin' && (
                          <User className="w-3 h-3 mr-1" />
                        )}
                        {member.role}
                      </Badge>
                      {member.role !== 'Owner' && (
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">API Keys</CardTitle>
                  <CardDescription>
                    Create and manage API keys for programmatic access
                  </CardDescription>
                </div>
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" /> Create New Key
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {apiKeys.map((apiKey) => (
                  <div
                    key={apiKey.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {apiKey.name}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <code className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                          {apiKey.key}
                        </code>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>Created: {apiKey.createdAt}</span>
                        <span>Last used: {apiKey.lastUsed}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleCopyKey(apiKey.id, apiKey.key)}
                      >
                        {copiedKey === apiKey.id ? (
                          <Check className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Theme</CardTitle>
              <CardDescription>
                Choose your preferred color scheme
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 max-w-md">
                {/* Light Theme Card */}
                <button
                  onClick={() => setTheme('light')}
                  className={`relative rounded-xl border-2 p-4 transition-all ${
                    theme === 'light'
                      ? 'border-primary shadow-lg shadow-primary/20'
                      : 'border-border hover:border-border/80'
                  }`}
                >
                  <div className="rounded-lg bg-white border border-gray-200 p-3 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-1.5 w-3/4 rounded bg-gray-200" />
                      <div className="h-1.5 w-1/2 rounded bg-gray-200" />
                      <div className="h-1.5 w-2/3 rounded bg-gray-200" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-foreground">Light</span>
                  </div>
                  {theme === 'light' && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </button>

                {/* Dark Theme Card */}
                <button
                  onClick={() => setTheme('dark')}
                  className={`relative rounded-xl border-2 p-4 transition-all ${
                    theme === 'dark'
                      ? 'border-primary shadow-lg shadow-primary/20'
                      : 'border-border hover:border-border/80'
                  }`}
                >
                  <div className="rounded-lg bg-slate-900 border border-slate-700 p-3 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-1.5 w-3/4 rounded bg-slate-700" />
                      <div className="h-1.5 w-1/2 rounded bg-slate-700" />
                      <div className="h-1.5 w-2/3 rounded bg-slate-700" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-medium text-foreground">Dark</span>
                  </div>
                  {theme === 'dark' && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
