``# Lingx Design System

> **Status:** Draft v1
> **Created:** 2024-12-29
> **Last Updated:** 2024-12-29

## Design Philosophy

Lingx is built **by developers, for developers** and translation managers. The UI should be:

- **Modern & Clean** - Professional without being corporate
- **UX-First** - Core functionality accessible in minimal clicks
- **Always Visible** - No hidden actions behind hover states or dot menus
- **Responsive** - Works seamlessly on all screen sizes
- **Themeable** - Light, dark, and customizable themes

---

## Visual Direction

### Inspiration Sources

The design combines elements from multiple references:

1. **Mhattrix Dashboard** - Clean islands layout, soft lavender/coral palette, generous whitespace
2. **Dark Mode Reference** - Bento-box islands on dark background, vibrant green accents, depth through color
3. **Taskapp** - Gradient sidebar option, floating panels, soft shadows

### Core Concepts

- **Islands/Bento Layout** - Content grouped in floating cards on a tinted background
- **Sidebar Navigation** - Persistent sidebar (not top nav)
- **Depth through Color** - Light mode uses shadows, dark mode uses shade differences
- **Single Accent System** - Primary accent + warm accent for actions

---

## Typography

### Font Family

```css
--font-sans: 'Geist', system-ui, -apple-system, sans-serif;
--font-mono: 'Geist Mono', 'JetBrains Mono', 'Fira Code', monospace;
```

**Geist** - Modern, developer-focused font by Vercel. Clean and precise without being cold.

**Geist Mono** - Used for translation keys, code snippets, API examples.

### Font Scale

```css
--font-size-xs:    0.75rem;   /* 12px - labels, captions */
--font-size-sm:    0.875rem;  /* 14px - body small, secondary */
--font-size-base:  1rem;      /* 16px - body */
--font-size-lg:    1.125rem;  /* 18px - body large */
--font-size-xl:    1.5rem;    /* 24px - section headings */
--font-size-2xl:   2rem;      /* 32px - page titles */
--font-size-stat:  2.5rem;    /* 40px - big numbers/stats */
```

### Font Weights

```css
--font-weight-normal:   400;
--font-weight-medium:   500;
--font-weight-semibold: 600;
--font-weight-bold:     700;
```

---

## Color System

### Light Mode

```css
/* Backgrounds */
--bg-base:        #E8E6EF;        /* soft gray with lavender tint */
--bg-gradient:    linear-gradient(135deg, #E2E0F0 0%, #F0E8E8 100%);
--bg-subtle:      #F5F4F8;        /* slightly lighter than base */

/* Islands/Cards */
--island:         #FFFFFF;
--island-hover:   #FAFAFA;
--island-shadow:  0 2px 8px rgba(0, 0, 0, 0.04);
--island-border:  rgba(0, 0, 0, 0.06);

/* Text */
--text-primary:   #242424;
--text-secondary: #6B6B6B;
--text-muted:     #9A9A9A;
--text-inverse:   #FFFFFF;

/* Accents */
--accent-primary:       #7C6EE6;  /* soft purple - primary actions */
--accent-primary-hover: #6B5DD4;
--accent-warm:          #E8916F;  /* soft coral - secondary actions */
--accent-warm-hover:    #D9805E;

/* Semantic */
--color-success:        #5BB98B;
--color-success-bg:     #E8F5EE;
--color-warning:        #E5A84B;
--color-warning-bg:     #FDF6E8;
--color-error:          #E07070;
--color-error-bg:       #FDECEC;
--color-info:           #5B9FE0;
--color-info-bg:        #EBF4FD;
```

### Dark Mode

```css
/* Backgrounds */
--bg-base:        #0D0D0D;        /* near black */
--bg-gradient:    none;           /* no gradient in dark mode */
--bg-subtle:      #141414;

/* Islands/Cards */
--island:         #1A1A1A;        /* dark gray */
--island-hover:   #222222;
--island-shadow:  none;           /* depth from color only */
--island-border:  rgba(255, 255, 255, 0.06);

/* Text */
--text-primary:   #FFFFFF;
--text-secondary: #A0A0A0;
--text-muted:     #606060;
--text-inverse:   #0D0D0D;

/* Accents - slightly more saturated for dark bg */
--accent-primary:       #9D8DF1;
--accent-primary-hover: #B0A2F5;
--accent-warm:          #F0A07A;
--accent-warm-hover:    #F5B08E;

/* Semantic - more vibrant on dark */
--color-success:        #4ADE80;
--color-success-bg:     #1A2E1F;
--color-warning:        #FBBF24;
--color-warning-bg:     #2E2510;
--color-error:          #F87171;
--color-error-bg:       #2E1A1A;
--color-info:           #60A5FA;
--color-info-bg:        #1A2536;
```

### Status Colors (Translation States)

| Status | Light Mode | Dark Mode | Usage |
|--------|------------|-----------|-------|
| Missing | `#E07070` coral | `#F87171` | Key has no translation |
| Draft | `#E5A84B` amber | `#FBBF24` | Translation needs review |
| Reviewed | `#5B9FE0` blue | `#60A5FA` | Reviewed, not published |
| Complete | `#5BB98B` green | `#4ADE80` | Published/ready |

---

## Spacing

```css
--space-xs:   4px;
--space-sm:   8px;
--space-md:   16px;
--space-lg:   24px;
--space-xl:   32px;
--space-2xl:  48px;
--space-3xl:  64px;
```

---

## Border Radius

```css
--radius-sm:    6px;     /* buttons, inputs, small elements */
--radius-md:    12px;    /* cards, islands, panels */
--radius-lg:    16px;    /* large panels, modals */
--radius-xl:    24px;    /* hero cards */
--radius-full:  9999px;  /* pills, badges, avatars */
```

---

## Shadows

### Light Mode

```css
--shadow-sm:   0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-md:   0 2px 8px rgba(0, 0, 0, 0.04);
--shadow-lg:   0 4px 16px rgba(0, 0, 0, 0.06);
--shadow-xl:   0 8px 32px rgba(0, 0, 0, 0.08);
```

### Dark Mode

No shadows - depth achieved through background color differences.

---

## Layout

### Structure

```
┌────────────────────────────────────────────────────────────────┐
│  Background (--bg-base or --bg-gradient)                       │
│                                                                │
│  ┌──────────┐  ┌────────────────────────────────────────────┐  │
│  │          │  │  Content Area                              │  │
│  │          │  │                                            │  │
│  │ Sidebar  │  │  ┌─────────────┐  ┌─────────────────────┐  │  │
│  │ (Island) │  │  │   Island    │  │       Island        │  │  │
│  │          │  │  └─────────────┘  └─────────────────────┘  │  │
│  │          │  │                                            │  │
│  │          │  │  ┌────────────────────────────────────────┐│  │
│  │          │  │  │            Main Island                 ││  │
│  │          │  │  └────────────────────────────────────────┘│  │
│  └──────────┘  └────────────────────────────────────────────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Sidebar Width

```css
--sidebar-width:           256px;   /* expanded */
--sidebar-width-collapsed: 64px;    /* icons only */
```

### Content Area

```css
--content-max-width:  1400px;  /* max width for readability */
--content-padding:    var(--space-xl);
```

---

## Components

### Sidebar

- White/dark island floating on background
- Logo at top
- Navigation items with icons
- Active state: subtle background fill + left accent border
- Badge counts for items with notifications
- User profile at bottom
- Collapsible on mobile

### Islands/Cards

- Rounded corners (`--radius-md`)
- Subtle shadow in light mode
- Background color difference in dark mode
- Consistent padding (`--space-lg`)
- Optional expand arrow (↗) for detail views

### Stat Cards

```
┌─────────────────────────────┐
│  Label              ↗      │
│  42,847                    │
│  ↑ 12% vs last week        │
└─────────────────────────────┘
```

- Large number treatment
- Small label above
- Change indicator with color (green up, red down)

### Status Badges

```css
/* Pill style */
.badge {
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}

/* Filled variant - for status */
.badge-missing  { background: var(--color-error-bg);   color: var(--color-error);   }
.badge-draft    { background: var(--color-warning-bg); color: var(--color-warning); }
.badge-reviewed { background: var(--color-info-bg);    color: var(--color-info);    }
.badge-complete { background: var(--color-success-bg); color: var(--color-success); }
```

### Buttons

```css
/* Primary - accent filled */
.btn-primary {
  background: var(--accent-primary);
  color: var(--text-inverse);
  border-radius: var(--radius-sm);
  padding: var(--space-sm) var(--space-md);
}

/* Secondary - outline */
.btn-secondary {
  background: transparent;
  border: 1px solid var(--island-border);
  color: var(--text-primary);
}

/* Ghost - minimal */
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
}
.btn-ghost:hover {
  background: var(--island-hover);
}
```

### Translation Row

```
┌────────────────────────────────────────────────────────────────┐
│ ☐  user.welcome.title    │ EN: Welcome  │ DE: Willkommen  │ → │
└────────────────────────────────────────────────────────────────┘
```

- Checkbox always visible
- Key in monospace font
- Language previews inline
- Action accessible without hover

---

## Theme System

### Implementation

```css
:root {
  /* Light mode by default */
  --bg-base: #E8E6EF;
  /* ... all light mode variables */
}

[data-theme="dark"] {
  --bg-base: #0D0D0D;
  /* ... all dark mode variables */
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    /* Apply dark mode if no explicit theme set */
  }
}
```

### Theme Options

1. **Light** - Soft lavender-gray gradient background
2. **Dark** - Near-black with dark gray islands
3. **System** - Follow OS preference

Future consideration: Custom accent color picker

---

## Responsive Breakpoints

```css
--breakpoint-sm:  640px;   /* Mobile landscape */
--breakpoint-md:  768px;   /* Tablet */
--breakpoint-lg:  1024px;  /* Desktop */
--breakpoint-xl:  1280px;  /* Large desktop */
--breakpoint-2xl: 1536px;  /* Extra large */
```

### Mobile Adaptations

- Sidebar collapses to bottom navigation or hamburger menu
- Islands stack vertically
- Touch-friendly tap targets (min 44px)
- Reduced padding

---

## UX Principles

1. **No Hidden Actions** - All interactive elements visible without hover
2. **Minimal Clicks** - Core tasks achievable in 1-2 clicks
3. **Visible Status** - Translation states always shown via badges
4. **Keyboard Accessible** - Full keyboard navigation support
5. **Fast Feedback** - Immediate visual response to actions
6. **Consistent Patterns** - Same components behave the same everywhere

---

## Developer-Familiar Patterns

Lingx is built for developers. Where appropriate, leverage familiar UI patterns from common developer tools to reduce cognitive load:

| Pattern | Source | Use In Lingx |
|---------|--------|-------------------|
| **Diff View** | GitHub, GitLab | Activity changes, merge conflicts, translation history |
| **Tree View** | VS Code, file explorers | Namespace/key hierarchy, project structure |
| **Command Palette** | VS Code, Raycast | Quick search, keyboard shortcuts (⌘K) |
| **Toast Notifications** | Modern dev tools | Action confirmations, errors |
| **Breadcrumbs** | IDEs, file systems | Navigation path in nested views |
| **Monospace Code** | All dev tools | Translation keys, API responses, code snippets |
| **Keyboard Shortcuts** | All dev tools | Power user efficiency |

### When to Use Developer Patterns

- **Do use** when the pattern genuinely improves UX for our audience
- **Do use** for technical data display (diffs, code, logs, JSON)
- **Don't force** patterns where a simpler UI would work better
- **Balance** developer familiarity with design system aesthetics

### Example: GitHub-Style Diff

```
┌─────────────────────────────────────┐
│ auth.login                       EN │  ← Header with key + language
├─────────────────────────────────────┤
│ − Log in                            │  ← Red bg, old value
│ + Sign in                           │  ← Green bg, new value
└─────────────────────────────────────┘
```

---

## Future Considerations

- [ ] Custom accent color picker per user/project
- [ ] Gradient sidebar theme option (from Ref 1)
- [ ] High contrast mode for accessibility
- [ ] Compact density option for power users
- [ ] Font alternatives (keep system flexible)

---

## References

Design inspiration collected during planning:

1. **Taskapp** (Dribbble) - Gradient sidebar, floating panels, soft shadows
2. **InsightHub** (Dribbble) - Clean blue accent, stat cards, airy layout
3. **Dark Dashboard** (Dribbble) - Bento-box islands, green accent, dark mode done right
4. **Prody** (Dribbble) - Breadcrumbs, inline action bars (structure only)
5. **Mhattrix** (Dribbble) - Lavender/coral palette, Urbanist font, islands layout - **Primary inspiration**
