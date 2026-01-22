# ADR-021: Enterprise Dashboard and Navigation Experience

**Status:** Accepted
**Date:** January 2026
**Deciders:** Product & Design Team
**Categories:** UI/UX, Frontend, Enterprise

## Context

Claude Context serves enterprise teams who need an efficient, professional interface for managing organizational knowledge. The dashboard experience must:

1. **Efficient navigation** - Quick access to all features
2. **Information density** - Show relevant data without overwhelming
3. **Keyboard-first** - Power users expect keyboard shortcuts
4. **Responsive** - Work on desktop and tablet
5. **Accessible** - WCAG 2.1 AA compliance
6. **Extensible** - Support future features without major refactoring

### Current State Issues

The MVP interface has:
- Tab-based navigation (limited scalability)
- No global search or command palette
- No dashboard overview
- Missing keyboard shortcuts
- No dark mode toggle in UI
- Limited team visibility features

### User Personas

| Persona | Needs |
|---------|-------|
| **Developer** | Quick context search, slice management, MCP setup |
| **Team Lead** | Team activity, slice progress, analytics overview |
| **Admin** | Settings, integrations, audit logs, team management |

## Decision

**We will implement a sidebar-based dashboard with command palette and keyboard navigation.**

### Navigation Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌──────┐  Claude Context             🔍 Search...  ⌘K   🔔 👤 │
│  │ Logo │  Enterprise                                          │
├──┴──────┴──────────────────────────────────────────────────────┤
│  │        │                                                    │
│  │ 🏠 Home│  ┌──────────────────────────────────────────────┐  │
│  │        │  │                                              │  │
│  │ 📑 Slices (3) │  │         Page Content               │  │
│  │        │  │                                              │  │
│  │ 📚 Context│  │         (varies by route)              │  │
│  │        │  │                                              │  │
│  │ 📊 Analytics│  │                                       │  │
│  │        │  │                                              │  │
│  │ ⚡ Integrations│  │                                    │  │
│  │        │  │                                              │  │
│  │ ⚙️ Settings│  │                                        │  │
│  │        │  └──────────────────────────────────────────────┘  │
│  ├────────┤                                                    │
│  │ 🖥️ Claude│                                                  │
│  │ Code   │                                                    │
│  │ npx... │                                                    │
│  ├────────┤                                                    │
│  │ ◀ Collapse│                                                 │
│  └────────┘                                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Page Structure

#### Home Dashboard
- Welcome header with user name
- Quick stats grid (4 metrics)
- Quick action cards (3 primary actions)
- Recent activity feed

#### Slices
- Status filter pills
- Slice list with progress indicators
- Slice detail view (split or full)

#### Context
- Semantic search bar
- Token budget slider
- Node selection with checkboxes
- Compile action button

#### Analytics
- Date range selector
- Real-time metrics card
- Session trends chart
- Rating distribution chart
- Error category breakdown

#### Integrations
- Claude ecosystem section (Chat, Code)
- External services section (GitHub, Notion)
- API key management

#### Settings
- Profile section
- Team members list
- Security options (MFA, SSO)
- Billing (enterprise plans)

### Command Palette (⌘K)

```typescript
interface Command {
  label: string;
  action: () => void;
  icon?: ReactNode;
  shortcut?: string;
  category?: string;
}

const commands: Command[] = [
  // Navigation
  { label: 'Go to Home', action: () => navigate('home'), shortcut: 'g h' },
  { label: 'Go to Slices', action: () => navigate('slices'), shortcut: 'g s' },
  { label: 'Go to Context', action: () => navigate('context'), shortcut: 'g c' },
  { label: 'Go to Analytics', action: () => navigate('analytics'), shortcut: 'g a' },

  // Actions
  { label: 'Create Slice', action: () => createSlice(), shortcut: 'c s' },
  { label: 'Search Context', action: () => focusSearch(), shortcut: '/' },
  { label: 'Toggle Dark Mode', action: () => toggleDarkMode(), shortcut: 't d' },

  // Admin
  { label: 'Team Settings', action: () => navigate('settings'), category: 'Admin' },
  { label: 'View Audit Logs', action: () => navigate('audit'), category: 'Admin' },
];
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` | Open command palette |
| `Esc` | Close modals/palette |
| `g h` | Go to Home |
| `g s` | Go to Slices |
| `g c` | Go to Context |
| `g a` | Go to Analytics |
| `/` | Focus search |
| `c s` | Create slice |
| `t d` | Toggle dark mode |
| `?` | Show shortcuts |

### Responsive Behavior

| Breakpoint | Sidebar | Header |
|------------|---------|--------|
| Desktop (>1024px) | Full width (256px) | Full |
| Tablet (768-1024px) | Collapsed (80px) | Full |
| Mobile (<768px) | Hidden (drawer) | Compact |

### Component Hierarchy

```
<App>
  <QueryClientProvider>
    <div className="flex h-screen">
      <Sidebar>
        <Logo />
        <Navigation items={navItems} />
        <McpPromo />
        <CollapseToggle />
      </Sidebar>

      <main className="flex-1">
        <Header>
          <SearchButton onClick={openCommandPalette} />
          <NotificationBell />
          <DarkModeToggle />
          <UserMenu />
        </Header>

        <PageContent>
          {/* Route-based content */}
        </PageContent>
      </main>

      {commandPaletteOpen && <CommandPalette />}
    </div>
  </QueryClientProvider>
</App>
```

### State Management

```typescript
// App-level state
const [currentView, setCurrentView] = useState<View>('home');
const [sidebarOpen, setSidebarOpen] = useState(true);
const [darkMode, setDarkMode] = useState(false);
const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

// Persist preferences
useEffect(() => {
  localStorage.setItem('darkMode', darkMode);
  localStorage.setItem('sidebarOpen', sidebarOpen);
}, [darkMode, sidebarOpen]);
```

### Dark Mode Implementation

```typescript
// Toggle dark mode class on document
useEffect(() => {
  document.documentElement.classList.toggle('dark', darkMode);
}, [darkMode]);

// Respect system preference initially
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const [darkMode, setDarkMode] = useState(
  localStorage.getItem('darkMode') ?? prefersDark
);
```

### Accessibility Features

1. **Focus management** - Trap focus in modals
2. **ARIA labels** - All interactive elements labeled
3. **Keyboard navigation** - Full keyboard support
4. **Skip links** - Skip to main content
5. **High contrast** - Sufficient color contrast ratios
6. **Screen reader** - Semantic HTML and live regions

```tsx
// Example accessible button
<button
  aria-label="Open command palette"
  aria-keyshortcuts="Meta+K"
  onClick={openCommandPalette}
>
  <Search className="w-4 h-4" aria-hidden="true" />
  <span>Search...</span>
  <kbd aria-hidden="true">⌘K</kbd>
</button>
```

## Consequences

### Positive

- **Professional appearance** - Enterprise-ready dashboard
- **Efficient navigation** - Sidebar + command palette
- **Power user friendly** - Comprehensive keyboard shortcuts
- **Scalable** - Easy to add new navigation items
- **Accessible** - WCAG 2.1 AA compliant
- **Modern UX** - Dark mode, responsive, animated

### Negative

- **Learning curve** - Users must discover shortcuts
- **Complexity** - More code than simple tabs
- **Testing** - More UI states to test

### Mitigations

1. **Onboarding** - Show shortcuts hint on first visit
2. **Component library** - Reusable, tested components
3. **Storybook** - Visual testing for all states

## References

- [Linear App](https://linear.app) - Command palette inspiration
- [Notion](https://notion.so) - Sidebar navigation reference
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Radix UI Primitives](https://www.radix-ui.com/) - Accessible component patterns
