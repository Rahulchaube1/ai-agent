import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Key,
  Database,
  Mail,
  Cloud,
  Globe,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Credential {
  id: string;
  name: string;
  type: string;
  createdAt: string;
}

const typeIcons: Record<string, typeof Key> = {
  'API Key': Key,
  Database: Database,
  Email: Mail,
  'Cloud Service': Cloud,
  'HTTP Basic': Globe,
};

const typeColors: Record<string, string> = {
  'API Key': 'text-amber-400 bg-amber-500/10',
  Database: 'text-blue-400 bg-blue-500/10',
  Email: 'text-pink-400 bg-pink-500/10',
  'Cloud Service': 'text-cyan-400 bg-cyan-500/10',
  'HTTP Basic': 'text-green-400 bg-green-500/10',
};

const mockCredentials: Credential[] = [
  { id: '1', name: 'OpenAI API Key', type: 'API Key', createdAt: 'Jan 10, 2025' },
  { id: '2', name: 'PostgreSQL Production', type: 'Database', createdAt: 'Jan 8, 2025' },
  { id: '3', name: 'SendGrid SMTP', type: 'Email', createdAt: 'Jan 5, 2025' },
  { id: '4', name: 'AWS S3 Access', type: 'Cloud Service', createdAt: 'Dec 28, 2024' },
  { id: '5', name: 'Stripe Secret Key', type: 'API Key', createdAt: 'Dec 20, 2024' },
  { id: '6', name: 'GitHub API Token', type: 'HTTP Basic', createdAt: 'Dec 15, 2024' },
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

export default function CredentialsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showValue, setShowValue] = useState(false);
  const [newCred, setNewCred] = useState({
    name: '',
    type: '',
    value: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setDialogOpen(false);
      setNewCred({ name: '', type: '', value: '' });
    }, 1000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Credentials</h1>
          <p className="text-muted-foreground mt-1">
            Securely manage your API keys, tokens, and connection credentials
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25"
        >
          <Plus className="w-4 h-4" /> Add Credential
        </Button>
      </div>

      {/* Credentials Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
      >
        {mockCredentials.map((cred) => {
          const Icon = typeIcons[cred.type] || Key;
          const colorClass = typeColors[cred.type] || 'text-gray-400 bg-gray-500/10';
          return (
            <motion.div key={cred.id} variants={itemVariants}>
              <Card className="group border-border/50 bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">
                          {cred.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {cred.type}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Pencil className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-400">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Created {cred.createdAt}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                        <span>{'*'.repeat(16)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Add Credential Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Credential</DialogTitle>
            <DialogDescription>
              Securely store a new credential for use in your workflows.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cred-name">Name</Label>
              <Input
                id="cred-name"
                placeholder="e.g., My API Key"
                value={newCred.name}
                onChange={(e) =>
                  setNewCred({ ...newCred, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cred-type">Type</Label>
              <Select
                value={newCred.type}
                onValueChange={(v) => setNewCred({ ...newCred, type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select credential type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="API Key">API Key</SelectItem>
                  <SelectItem value="Database">Database</SelectItem>
                  <SelectItem value="Email">Email (SMTP)</SelectItem>
                  <SelectItem value="Cloud Service">Cloud Service</SelectItem>
                  <SelectItem value="HTTP Basic">HTTP Basic Auth</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cred-value">Value</Label>
              <div className="relative">
                <Input
                  id="cred-value"
                  type={showValue ? 'text' : 'password'}
                  placeholder="Enter credential value"
                  value={newCred.value}
                  onChange={(e) =>
                    setNewCred({ ...newCred, value: e.target.value })
                  }
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full w-10"
                  onClick={() => setShowValue(!showValue)}
                >
                  {showValue ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!newCred.name || !newCred.type || !newCred.value || saving}
              className="gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving...' : 'Save Credential'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
