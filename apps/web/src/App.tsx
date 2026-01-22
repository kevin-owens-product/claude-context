/**
 * @prompt-id forge-v4.1:web:app:002
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 * @refined-by claude-integration-redesign
 */

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { clsx } from 'clsx';
import {
  LayoutGrid,
  Layers,
  BarChart3,
  Settings,
  Search,
  Command,
  Bell,
  ChevronRight,
  Sparkles,
  Users,
  Key,
  Shield,
  Moon,
  Sun,
  Menu,
  X,
  Zap,
  BookOpen,
  GitBranch,
  Terminal,
} from 'lucide-react';
import { ContextPanel } from './components/context/ContextPanel';
import { SliceList } from './components/slice/SliceList';
import { SliceDetail } from './components/slice/SliceDetail';
import { AnalyticsDashboard } from './components/feedback/AnalyticsDashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

type View = 'home' | 'slices' | 'context' | 'analytics' | 'integrations' | 'settings';

interface NavItem {
  id: View;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

const navigation: NavItem[] = [
  { id: 'home', label: 'Home', icon: <LayoutGrid className="w-5 h-5" /> },
  { id: 'slices', label: 'Slices', icon: <Layers className="w-5 h-5" />, badge: '3' },
  { id: 'context', label: 'Context', icon: <BookOpen className="w-5 h-5" /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> },
  { id: 'integrations', label: 'Integrations', icon: <Zap className="w-5 h-5" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
];

export function App() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [selectedSliceId, setSelectedSliceId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Demo IDs - in real app these come from auth context
  const workspaceId = 'demo-workspace-id';
  const graphId = 'demo-graph-id';

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Toggle dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className={clsx('min-h-screen transition-colors duration-300', darkMode ? 'dark' : '')}>
        <div className="flex h-screen bg-claude-cream-100 dark:bg-claude-neutral-900">
          {/* Sidebar */}
          <aside
            className={clsx(
              'fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-claude',
              'bg-white dark:bg-claude-neutral-800 border-r border-claude-cream-300 dark:border-claude-neutral-700',
              sidebarOpen ? 'w-64' : 'w-20'
            )}
          >
            {/* Logo */}
            <div className="flex items-center h-16 px-4 border-b border-claude-cream-300 dark:border-claude-neutral-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-claude bg-gradient-to-br from-claude-primary-400 to-claude-primary-600 flex items-center justify-center shadow-claude-primary">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                {sidebarOpen && (
                  <div className="animate-fade-in">
                    <h1 className="font-serif text-lg font-semibold text-claude-neutral-800 dark:text-claude-neutral-100">
                      Claude Context
                    </h1>
                    <p className="text-xs text-claude-neutral-500">Enterprise</p>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-claude">
              {navigation.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    if (item.id === 'slices') setSelectedSliceId(null);
                  }}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-claude-sm',
                    'transition-all duration-150 ease-claude group',
                    currentView === item.id
                      ? 'bg-claude-primary-50 text-claude-primary-600 dark:bg-claude-primary-900/20 dark:text-claude-primary-400'
                      : 'text-claude-neutral-600 dark:text-claude-neutral-400 hover:bg-claude-cream-200 dark:hover:bg-claude-neutral-700'
                  )}
                >
                  <span
                    className={clsx(
                      'transition-colors',
                      currentView === item.id && 'text-claude-primary-500'
                    )}
                  >
                    {item.icon}
                  </span>
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 text-left font-medium">{item.label}</span>
                      {item.badge && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-claude-primary-100 text-claude-primary-700 dark:bg-claude-primary-900/30 dark:text-claude-primary-400">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </button>
              ))}
            </nav>

            {/* Sidebar Footer */}
            <div className="p-3 border-t border-claude-cream-300 dark:border-claude-neutral-700">
              {sidebarOpen && (
                <div className="mb-3 p-3 rounded-claude bg-gradient-to-br from-claude-primary-50 to-claude-cream-200 dark:from-claude-primary-900/20 dark:to-claude-neutral-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Terminal className="w-4 h-4 text-claude-primary-500" />
                    <span className="text-sm font-medium text-claude-neutral-700 dark:text-claude-neutral-200">
                      Claude Code
                    </span>
                  </div>
                  <p className="text-xs text-claude-neutral-500 dark:text-claude-neutral-400 mb-2">
                    Connect via MCP for seamless integration
                  </p>
                  <code className="block text-xs font-mono p-2 rounded bg-white/50 dark:bg-claude-neutral-900/50 text-claude-primary-600">
                    npx @claude-context/mcp
                  </code>
                </div>
              )}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-claude-sm text-claude-neutral-500 hover:bg-claude-cream-200 dark:hover:bg-claude-neutral-700 transition-colors"
              >
                {sidebarOpen ? (
                  <>
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    <span className="text-sm">Collapse</span>
                  </>
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <div
            className={clsx(
              'flex-1 flex flex-col transition-all duration-300',
              sidebarOpen ? 'ml-64' : 'ml-20'
            )}
          >
            {/* Top Header */}
            <header className="sticky top-0 z-40 h-16 flex items-center justify-between px-6 bg-white/80 dark:bg-claude-neutral-800/80 backdrop-blur-xl border-b border-claude-cream-300 dark:border-claude-neutral-700">
              {/* Search */}
              <button
                onClick={() => setCommandPaletteOpen(true)}
                className="flex items-center gap-3 px-4 py-2 rounded-claude bg-claude-cream-100 dark:bg-claude-neutral-700 text-claude-neutral-500 hover:bg-claude-cream-200 dark:hover:bg-claude-neutral-600 transition-colors w-80"
              >
                <Search className="w-4 h-4" />
                <span className="flex-1 text-left text-sm">Search context, slices...</span>
                <kbd className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded bg-white dark:bg-claude-neutral-800 text-xs font-mono text-claude-neutral-400 border border-claude-cream-300 dark:border-claude-neutral-600">
                  <Command className="w-3 h-3" />K
                </kbd>
              </button>

              {/* Right Actions */}
              <div className="flex items-center gap-2">
                {/* Notifications */}
                <button className="relative p-2 rounded-claude-sm text-claude-neutral-500 hover:bg-claude-cream-200 dark:hover:bg-claude-neutral-700 transition-colors">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-claude-primary-500" />
                </button>

                {/* Dark Mode Toggle */}
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 rounded-claude-sm text-claude-neutral-500 hover:bg-claude-cream-200 dark:hover:bg-claude-neutral-700 transition-colors"
                >
                  {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>

                {/* User Menu */}
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-claude-sm hover:bg-claude-cream-200 dark:hover:bg-claude-neutral-700 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-claude-primary-400 to-claude-primary-600 flex items-center justify-center text-white text-sm font-medium">
                    JD
                  </div>
                  <span className="hidden md:block text-sm font-medium text-claude-neutral-700 dark:text-claude-neutral-200">
                    Jane Doe
                  </span>
                </button>
              </div>
            </header>

            {/* Page Content */}
            <main className="flex-1 p-6 overflow-auto scrollbar-claude">
              {currentView === 'home' && (
                <HomePage onNavigate={setCurrentView} />
              )}

              {currentView === 'slices' && (
                <div className="claude-card h-[calc(100vh-10rem)] overflow-hidden">
                  {selectedSliceId ? (
                    <SliceDetail
                      sliceId={selectedSliceId}
                      onBack={() => setSelectedSliceId(null)}
                    />
                  ) : (
                    <SliceList
                      workspaceId={workspaceId}
                      onSelectSlice={setSelectedSliceId}
                      onCreateSlice={() => console.log('Create slice')}
                    />
                  )}
                </div>
              )}

              {currentView === 'context' && (
                <div className="claude-card h-[calc(100vh-10rem)] overflow-hidden">
                  <ContextPanel
                    graphId={graphId}
                    workspaceId={workspaceId}
                    onCompile={(text, ids) => console.log('Compiled:', { text, ids })}
                  />
                </div>
              )}

              {currentView === 'analytics' && (
                <AnalyticsDashboard workspaceId={workspaceId} />
              )}

              {currentView === 'integrations' && <IntegrationsPage />}

              {currentView === 'settings' && <SettingsPage />}
            </main>
          </div>
        </div>

        {/* Command Palette Modal */}
        {commandPaletteOpen && (
          <CommandPalette
            onClose={() => setCommandPaletteOpen(false)}
            onNavigate={(view) => {
              setCurrentView(view);
              setCommandPaletteOpen(false);
            }}
          />
        )}
      </div>
    </QueryClientProvider>
  );
}

// Home Page Component
function HomePage({ onNavigate }: { onNavigate: (view: View) => void }) {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="text-center py-8">
        <h1 className="font-serif text-display-2 text-claude-neutral-800 dark:text-claude-neutral-100 mb-4">
          Welcome to Claude Context
        </h1>
        <p className="text-body-lg text-claude-neutral-500 dark:text-claude-neutral-400 max-w-2xl mx-auto">
          Your organizational knowledge, seamlessly integrated with Claude Chat, Claude Code, and
          CoWork for context-aware AI assistance.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Context Nodes', value: '247', change: '+12 this week' },
          { label: 'Active Slices', value: '8', change: '3 in review' },
          { label: 'AI Sessions', value: '1,432', change: '+89% satisfaction' },
          { label: 'Team Members', value: '24', change: '5 active now' },
        ].map((stat, i) => (
          <div
            key={i}
            className="claude-card p-5 hover:shadow-claude-lg transition-shadow cursor-pointer"
          >
            <p className="text-caption text-claude-neutral-500 dark:text-claude-neutral-400 mb-1">
              {stat.label}
            </p>
            <p className="text-heading-1 font-serif text-claude-neutral-800 dark:text-claude-neutral-100">
              {stat.value}
            </p>
            <p className="text-caption text-claude-success mt-1">{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickActionCard
          icon={<Layers className="w-6 h-6" />}
          title="Create New Slice"
          description="Define a new work unit with clear outcomes and acceptance criteria"
          onClick={() => onNavigate('slices')}
        />
        <QuickActionCard
          icon={<Search className="w-6 h-6" />}
          title="Search Context"
          description="Find relevant context using semantic search across your knowledge base"
          onClick={() => onNavigate('context')}
        />
        <QuickActionCard
          icon={<GitBranch className="w-6 h-6" />}
          title="Connect Claude Code"
          description="Set up MCP integration for context-aware development"
          onClick={() => onNavigate('integrations')}
        />
      </div>

      {/* Recent Activity */}
      <div className="claude-card">
        <div className="px-6 py-4 border-b border-claude-cream-300 dark:border-claude-neutral-700">
          <h2 className="font-serif text-heading-3 text-claude-neutral-800 dark:text-claude-neutral-100">
            Recent Activity
          </h2>
        </div>
        <div className="divide-y divide-claude-cream-200 dark:divide-claude-neutral-700">
          {[
            { action: 'Slice completed', item: 'Implement user authentication', time: '2h ago', user: 'Sarah' },
            { action: 'Context added', item: 'API design patterns v2', time: '4h ago', user: 'Mike' },
            { action: 'Feedback received', item: 'Positive on context compilation', time: '5h ago', user: 'System' },
            { action: 'Slice started', item: 'Add dark mode support', time: '1d ago', user: 'Jane' },
          ].map((activity, i) => (
            <div key={i} className="px-6 py-4 flex items-center gap-4 hover:bg-claude-cream-50 dark:hover:bg-claude-neutral-700/50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-claude-cream-200 dark:bg-claude-neutral-700 flex items-center justify-center">
                <span className="text-sm font-medium text-claude-neutral-600 dark:text-claude-neutral-300">
                  {activity.user[0]}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-body-sm text-claude-neutral-800 dark:text-claude-neutral-200">
                  <span className="font-medium">{activity.action}:</span> {activity.item}
                </p>
                <p className="text-caption text-claude-neutral-500">{activity.time} by {activity.user}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Quick Action Card Component
function QuickActionCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="claude-card p-6 text-left hover:shadow-claude-lg hover:border-claude-primary-300 dark:hover:border-claude-primary-600 transition-all group"
    >
      <div className="w-12 h-12 rounded-claude bg-claude-primary-50 dark:bg-claude-primary-900/20 flex items-center justify-center text-claude-primary-500 mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="font-serif text-heading-3 text-claude-neutral-800 dark:text-claude-neutral-100 mb-2">
        {title}
      </h3>
      <p className="text-body-sm text-claude-neutral-500 dark:text-claude-neutral-400">
        {description}
      </p>
    </button>
  );
}

// Integrations Page
function IntegrationsPage() {
  const integrations: Array<{
    name: string;
    description: string;
    icon: React.ReactNode;
    status: 'connected' | 'available';
    action: string;
  }> = [
    {
      name: 'Claude Chat',
      description: 'Access context directly in Claude.ai conversations',
      icon: <Sparkles className="w-6 h-6" />,
      status: 'connected',
      action: 'Configure',
    },
    {
      name: 'Claude Code',
      description: 'MCP server for IDE integration',
      icon: <Terminal className="w-6 h-6" />,
      status: 'available',
      action: 'Connect',
    },
    {
      name: 'GitHub',
      description: 'Sync context from repositories',
      icon: <GitBranch className="w-6 h-6" />,
      status: 'connected',
      action: 'Manage',
    },
    {
      name: 'Notion',
      description: 'Import documentation and wikis',
      icon: <BookOpen className="w-6 h-6" />,
      status: 'available',
      action: 'Connect',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="font-serif text-heading-1 text-claude-neutral-800 dark:text-claude-neutral-100 mb-2">
          Integrations
        </h1>
        <p className="text-body text-claude-neutral-500 dark:text-claude-neutral-400">
          Connect Claude Context with your tools and workflows
        </p>
      </div>

      {/* Claude Ecosystem */}
      <div className="claude-card p-6">
        <h2 className="font-serif text-heading-3 text-claude-neutral-800 dark:text-claude-neutral-100 mb-4">
          Claude Ecosystem
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.slice(0, 2).map((integration) => (
            <IntegrationCard key={integration.name} {...integration} />
          ))}
        </div>
      </div>

      {/* External Integrations */}
      <div className="claude-card p-6">
        <h2 className="font-serif text-heading-3 text-claude-neutral-800 dark:text-claude-neutral-100 mb-4">
          External Services
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.slice(2).map((integration) => (
            <IntegrationCard key={integration.name} {...integration} />
          ))}
        </div>
      </div>

      {/* API Keys */}
      <div className="claude-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-heading-3 text-claude-neutral-800 dark:text-claude-neutral-100">
            API Keys
          </h2>
          <button className="claude-btn-primary">
            <Key className="w-4 h-4" />
            Create Key
          </button>
        </div>
        <div className="bg-claude-cream-100 dark:bg-claude-neutral-700 rounded-claude p-4 text-center">
          <p className="text-body-sm text-claude-neutral-500 dark:text-claude-neutral-400">
            No API keys created yet. Create one to access the Claude Context API.
          </p>
        </div>
      </div>
    </div>
  );
}

function IntegrationCard({
  name,
  description,
  icon,
  status,
  action,
}: {
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'connected' | 'available';
  action: string;
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-claude border border-claude-cream-300 dark:border-claude-neutral-600 hover:border-claude-primary-300 dark:hover:border-claude-primary-600 transition-colors">
      <div className="w-12 h-12 rounded-claude bg-claude-cream-200 dark:bg-claude-neutral-700 flex items-center justify-center text-claude-neutral-600 dark:text-claude-neutral-300">
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-claude-neutral-800 dark:text-claude-neutral-100">
            {name}
          </h3>
          {status === 'connected' && (
            <span className="claude-badge-success">Connected</span>
          )}
        </div>
        <p className="text-caption text-claude-neutral-500 dark:text-claude-neutral-400">
          {description}
        </p>
      </div>
      <button className={status === 'connected' ? 'claude-btn-ghost' : 'claude-btn-secondary'}>
        {action}
      </button>
    </div>
  );
}

// Settings Page
function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="font-serif text-heading-1 text-claude-neutral-800 dark:text-claude-neutral-100 mb-2">
          Settings
        </h1>
        <p className="text-body text-claude-neutral-500 dark:text-claude-neutral-400">
          Manage your account, team, and security settings
        </p>
      </div>

      {/* Profile Settings */}
      <div className="claude-card p-6">
        <h2 className="font-serif text-heading-3 text-claude-neutral-800 dark:text-claude-neutral-100 mb-4">
          Profile
        </h2>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-claude-primary-400 to-claude-primary-600 flex items-center justify-center text-white text-2xl font-medium">
            JD
          </div>
          <div>
            <h3 className="font-medium text-claude-neutral-800 dark:text-claude-neutral-100">
              Jane Doe
            </h3>
            <p className="text-body-sm text-claude-neutral-500">jane@example.com</p>
            <p className="text-caption text-claude-primary-500">Admin</p>
          </div>
        </div>
      </div>

      {/* Team Settings */}
      <div className="claude-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-heading-3 text-claude-neutral-800 dark:text-claude-neutral-100">
            Team Members
          </h2>
          <button className="claude-btn-primary">
            <Users className="w-4 h-4" />
            Invite Member
          </button>
        </div>
        <div className="space-y-3">
          {[
            { name: 'Jane Doe', email: 'jane@example.com', role: 'Admin' },
            { name: 'John Smith', email: 'john@example.com', role: 'Member' },
            { name: 'Sarah Wilson', email: 'sarah@example.com', role: 'Member' },
          ].map((member) => (
            <div
              key={member.email}
              className="flex items-center justify-between p-3 rounded-claude-sm bg-claude-cream-50 dark:bg-claude-neutral-700"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-claude-cream-300 dark:bg-claude-neutral-600 flex items-center justify-center">
                  <span className="text-sm font-medium text-claude-neutral-600 dark:text-claude-neutral-300">
                    {member.name.split(' ').map((n) => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-claude-neutral-800 dark:text-claude-neutral-100">
                    {member.name}
                  </p>
                  <p className="text-caption text-claude-neutral-500">{member.email}</p>
                </div>
              </div>
              <span className="claude-badge-neutral">{member.role}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Security Settings */}
      <div className="claude-card p-6">
        <h2 className="font-serif text-heading-3 text-claude-neutral-800 dark:text-claude-neutral-100 mb-4">
          Security
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-claude-sm border border-claude-cream-300 dark:border-claude-neutral-600">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-claude-neutral-500" />
              <div>
                <p className="font-medium text-claude-neutral-800 dark:text-claude-neutral-100">
                  Two-Factor Authentication
                </p>
                <p className="text-caption text-claude-neutral-500">
                  Add an extra layer of security
                </p>
              </div>
            </div>
            <button className="claude-btn-secondary">Enable</button>
          </div>
          <div className="flex items-center justify-between p-4 rounded-claude-sm border border-claude-cream-300 dark:border-claude-neutral-600">
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-claude-neutral-500" />
              <div>
                <p className="font-medium text-claude-neutral-800 dark:text-claude-neutral-100">
                  SSO / SAML
                </p>
                <p className="text-caption text-claude-neutral-500">
                  Enterprise single sign-on
                </p>
              </div>
            </div>
            <span className="claude-badge-primary">Enterprise</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Command Palette
function CommandPalette({
  onClose,
  onNavigate,
}: {
  onClose: () => void;
  onNavigate: (view: View) => void;
}) {
  const [query, setQuery] = useState('');

  const commands = [
    { label: 'Go to Home', view: 'home' as View, icon: <LayoutGrid className="w-4 h-4" /> },
    { label: 'Go to Slices', view: 'slices' as View, icon: <Layers className="w-4 h-4" /> },
    { label: 'Go to Context', view: 'context' as View, icon: <BookOpen className="w-4 h-4" /> },
    { label: 'Go to Analytics', view: 'analytics' as View, icon: <BarChart3 className="w-4 h-4" /> },
    { label: 'Go to Integrations', view: 'integrations' as View, icon: <Zap className="w-4 h-4" /> },
    { label: 'Go to Settings', view: 'settings' as View, icon: <Settings className="w-4 h-4" /> },
  ];

  const filtered = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
      <div className="fixed inset-0 bg-claude-neutral-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl mx-4 claude-card overflow-hidden animate-scale-in">
        <div className="flex items-center gap-3 px-4 border-b border-claude-cream-300 dark:border-claude-neutral-700">
          <Search className="w-5 h-5 text-claude-neutral-400" />
          <input
            type="text"
            placeholder="Search commands..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 py-4 bg-transparent outline-none text-claude-neutral-800 dark:text-claude-neutral-100 placeholder-claude-neutral-400"
            autoFocus
          />
          <button onClick={onClose} className="p-1 rounded hover:bg-claude-cream-200 dark:hover:bg-claude-neutral-700">
            <X className="w-5 h-5 text-claude-neutral-500" />
          </button>
        </div>
        <div className="max-h-80 overflow-auto">
          {filtered.map((cmd, i) => (
            <button
              key={i}
              onClick={() => onNavigate(cmd.view)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-claude-cream-100 dark:hover:bg-claude-neutral-700 transition-colors"
            >
              <span className="text-claude-neutral-500">{cmd.icon}</span>
              <span className="text-claude-neutral-800 dark:text-claude-neutral-100">
                {cmd.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
