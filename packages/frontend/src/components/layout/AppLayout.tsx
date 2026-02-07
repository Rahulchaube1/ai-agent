import React, { useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Workflow,
  Play,
  Key,
  Settings,
  Search,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/workflows', label: 'Workflows', icon: Workflow },
  { path: '/executions', label: 'Executions', icon: Play },
  { path: '/credentials', label: 'Credentials', icon: Key },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const commandItems = [
  { label: 'Go to Dashboard', path: '/', group: 'Pages' },
  { label: 'Go to Workflows', path: '/workflows', group: 'Pages' },
  { label: 'Go to Executions', path: '/executions', group: 'Pages' },
  { label: 'Go to Credentials', path: '/credentials', group: 'Pages' },
  { label: 'Go to Settings', path: '/settings', group: 'Pages' },
  { label: 'Create New Workflow', path: '/workflows?new=1', group: 'Actions' },
  { label: 'Toggle Theme', path: '__toggle_theme__', group: 'Actions' },
];

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarOpen, toggleSidebar, theme, setTheme, commandPaletteOpen, toggleCommandPalette } =
    useUIStore();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, toggleCommandPalette]);

  const handleCommandSelect = (path: string) => {
    if (path === '__toggle_theme__') {
      setTheme(theme === 'dark' ? 'light' : 'dark');
    } else {
      navigate(path);
    }
    toggleCommandPalette();
  };

  const breadcrumbSegments = location.pathname
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1));

  const userInitials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
    : 'U';

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Sidebar */}
      <AnimatePresence initial={false}>
        <motion.aside
          initial={false}
          animate={{ width: sidebarOpen ? 256 : 72 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="h-full border-r border-border bg-card flex flex-col shrink-0 overflow-hidden"
        >
          {/* Brand */}
          <div className="h-14 flex items-center gap-3 px-4 border-b border-border shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
              <Workflow className="w-4 h-4 text-white" />
            </div>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="text-base font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent whitespace-nowrap"
                >
                  FlowForge
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Nav */}
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`
                }
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            ))}
          </nav>

          {/* User Section */}
          <div className="border-t border-border p-3 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-accent transition-colors">
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className="text-xs bg-primary/20 text-primary">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="flex-1 text-left overflow-hidden"
                      >
                        <div className="text-sm font-medium text-foreground truncate">
                          {user?.firstName} {user?.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {user?.email}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="text-red-400"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.aside>
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="h-8 w-8"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeft className="w-4 h-4" />
              )}
            </Button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-muted-foreground">Home</span>
              {breadcrumbSegments.map((segment, i) => (
                <React.Fragment key={i}>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                  <span
                    className={
                      i === breadcrumbSegments.length - 1
                        ? 'text-foreground font-medium'
                        : 'text-muted-foreground'
                    }
                  >
                    {segment}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search trigger */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleCommandPalette}
              className="gap-2 text-muted-foreground h-8 w-64 justify-start"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="text-xs">Search...</span>
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">Cmd</span>K
              </kbd>
            </Button>

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-8 w-8"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>

            {/* User avatar */}
            <Avatar className="w-8 h-8 cursor-pointer">
              <AvatarFallback className="text-xs bg-primary/20 text-primary">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Command Palette */}
      <CommandDialog
        open={commandPaletteOpen}
        onOpenChange={toggleCommandPalette}
      >
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Pages">
            {commandItems
              .filter((item) => item.group === 'Pages')
              .map((item) => (
                <CommandItem
                  key={item.path}
                  onSelect={() => handleCommandSelect(item.path)}
                >
                  {item.label}
                </CommandItem>
              ))}
          </CommandGroup>
          <CommandGroup heading="Actions">
            {commandItems
              .filter((item) => item.group === 'Actions')
              .map((item) => (
                <CommandItem
                  key={item.label}
                  onSelect={() => handleCommandSelect(item.path)}
                >
                  {item.label}
                </CommandItem>
              ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
