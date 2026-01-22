# ADR-017: Claude Design System Integration

**Status:** Accepted
**Date:** January 2026
**Deciders:** Product & Engineering Team
**Categories:** UI/UX, Branding, Frontend

## Context

Claude Context is an organizational knowledge platform designed to integrate deeply with the Claude ecosystem (Claude Chat, Claude Code, CoWork). To provide a cohesive user experience and reinforce the product's connection to Anthropic's Claude products, we need a design system that:

1. **Brand alignment** - Matches Claude's warm, human-centered aesthetic
2. **Professional appearance** - Suitable for enterprise deployment
3. **Accessibility** - WCAG 2.1 AA compliance
4. **Dark mode** - Support for user preference and reduced eye strain
5. **Consistency** - Unified component library across all features
6. **Performance** - Minimal CSS footprint with tree-shaking

### Options Considered

#### Option A: Custom Claude-Inspired Design System

Build a custom design system from scratch using Claude's visual language as inspiration.

**Pros:**
- Complete control over aesthetics and components
- Deep integration with Claude's brand identity
- Optimized for our specific use cases
- No external dependencies

**Cons:**
- Significant upfront development effort
- Must maintain and evolve ourselves
- Risk of inconsistency without strict guidelines

#### Option B: Existing Component Library (shadcn/ui, Radix)

Adopt an existing headless component library and theme it to match Claude's aesthetic.

**Pros:**
- Faster initial development
- Battle-tested accessibility
- Regular updates and bug fixes
- Large community support

**Cons:**
- Additional dependency to maintain
- May not perfectly match Claude's aesthetic
- Customization can be complex
- Bundle size considerations

#### Option C: Tailwind CSS with Custom Design Tokens

Use Tailwind CSS with custom design tokens matching Claude's brand, building components as needed.

**Pros:**
- Flexible and lightweight
- Design tokens provide consistency
- Easy to customize and extend
- Already in our stack
- Small bundle size with purging

**Cons:**
- Must build components from scratch
- No pre-built accessibility patterns
- Requires design discipline

## Decision

**We will use Option C: Tailwind CSS with Custom Design Tokens.**

Rationale:
1. **Brand fidelity** - Complete control over Claude's warm aesthetic
2. **Stack alignment** - Tailwind already in use
3. **Performance** - Minimal CSS with PurgeCSS
4. **Flexibility** - Easy to evolve as Claude's brand evolves
5. **Learning curve** - Team already familiar with Tailwind

### Design Token Implementation

#### Color Palette

```javascript
// tailwind.config.js
colors: {
  claude: {
    // Primary - Terracotta (warmth, approachability)
    primary: {
      50: '#fef7f4',
      100: '#fceee8',
      200: '#f9d5c7',
      300: '#f4b8a1',
      400: '#eb8f6a',
      500: '#ae5630', // Main terracotta
      600: '#9a4a29',
      700: '#7d3c21',
      800: '#652f1a',
      900: '#4d2414',
    },
    // Background - Cream (warm, inviting)
    cream: {
      50: '#fefdfb',
      100: '#fdfaf6',
      200: '#faf5ed',
      300: '#f5ede0',
      400: '#efe3d1',
      500: '#e8d9c2',
    },
    // Neutral - Warm Grays
    neutral: {
      50: '#fafaf9',
      // ... full scale
      900: '#1c1917',
    },
  },
}
```

#### Typography

```javascript
fontFamily: {
  serif: ['Tiempos Text', 'Georgia', 'serif'],    // Headings
  sans: ['Inter', 'system-ui', 'sans-serif'],      // UI elements
  mono: ['JetBrains Mono', 'Consolas', 'monospace'], // Code
},
fontSize: {
  'display-1': ['3.5rem', { lineHeight: '1.1' }],
  'display-2': ['2.5rem', { lineHeight: '1.2' }],
  'heading-1': ['2rem', { lineHeight: '1.25' }],
  'heading-2': ['1.5rem', { lineHeight: '1.3' }],
  'heading-3': ['1.25rem', { lineHeight: '1.4' }],
  'body-lg': ['1.125rem', { lineHeight: '1.6' }],
  'body': ['1rem', { lineHeight: '1.6' }],
  'body-sm': ['0.875rem', { lineHeight: '1.5' }],
  'caption': ['0.75rem', { lineHeight: '1.4' }],
},
```

#### Shadows (Multi-layered for depth)

```javascript
boxShadow: {
  'claude-sm': '0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)',
  'claude': '0 2px 4px rgba(0,0,0,0.04), 0 4px 8px rgba(0,0,0,0.06), 0 8px 16px rgba(0,0,0,0.04)',
  'claude-lg': '0 4px 8px rgba(0,0,0,0.04), 0 8px 16px rgba(0,0,0,0.06), 0 16px 32px rgba(0,0,0,0.08)',
  'claude-primary': '0 4px 14px rgba(174, 86, 48, 0.25)',
},
```

#### Component Patterns

```css
/* Card */
.claude-card {
  @apply bg-white rounded-claude border border-claude-cream-400 shadow-claude;
  @apply transition-all duration-200 ease-claude;
}

/* Button */
.claude-btn-primary {
  @apply bg-claude-primary-500 text-white rounded-claude-sm;
  @apply hover:bg-claude-primary-600 shadow-claude-primary;
}

/* Input */
.claude-input {
  @apply bg-white border border-claude-cream-400 rounded-claude-sm;
  @apply focus:border-claude-primary-500 focus:ring-2 focus:ring-claude-primary-500/20;
}
```

#### Dark Mode Strategy

Use CSS custom properties with Tailwind's `dark:` variant:

```css
:root {
  --claude-cream: #fdfaf6;
}
.dark {
  --claude-cream: #1c1917;
}
```

## Consequences

### Positive

- **Brand coherence** - Users experience Claude Context as part of Claude ecosystem
- **Professional appearance** - Enterprise-ready visual design
- **Performance** - Minimal CSS footprint (~15KB gzipped)
- **Maintainability** - Design tokens centralize visual decisions
- **Extensibility** - Easy to add new components following patterns

### Negative

- **Initial effort** - Building component library takes time
- **Documentation** - Must maintain our own component docs
- **Accessibility** - Must implement a11y patterns ourselves

### Mitigations

1. **Component storybook** - Document all components with examples
2. **Accessibility testing** - Integrate axe-core in CI
3. **Design review** - Regular reviews to maintain consistency

## References

- [Claude.ai](https://claude.ai) - Reference implementation
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
