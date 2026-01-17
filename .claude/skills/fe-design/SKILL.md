---
name: fe-design
description: Enforce a precise, minimal design system inspired by Linear, Notion, and Stripe. Use this skill when building dashboards, admin interfaces, or any UI that needs Jony Ive-level precision - clean, modern, minimalist with taste. Every pixel matters.
---

# Lingx Frontend Design

Premium, crafted UI for developers and translation managers. Every interface should look designed by a team that obsesses over 1-pixel differences.

**Philosophy:** Restraint, precision, intentionality. "Expensive" is conveyed through what you DON'T add.

---

## Design Direction (FIXED)

Lingx blends **Warmth & Approachability** with **Utility & Function**:

| Aspect          | Decision                                     | Rationale                                              |
| --------------- | -------------------------------------------- | ------------------------------------------------------ |
| **Personality** | Warm-utility hybrid                          | Developers want density; managers want approachability |
| **Foundation**  | Lavender-tinted backgrounds                  | Distinctive, memorable, not generic gray               |
| **Accent**      | Soft purple `primary`                        | Creativity, distinctiveness                            |
| **Layout**      | Islands/bento on tinted bg                   | Floating cards create depth                            |
| **Navigation**  | Persistent sidebar                           | Multi-section app with many destinations               |
| **Typography**  | Geist (geometric sans)                       | Modern, clean, developer-focused                       |
| **Depth**       | Subtle shadows (light) / color shifts (dark) | Soft lift without complexity                           |

**DO NOT** reconsider these decisions. Apply them.

---

## Color Tokens (USE THESE)

### Primary Palette

| Token                   | Light                   | Dark                     | Usage                 |
| ----------------------- | ----------------------- | ------------------------ | --------------------- |
| `bg-background`         | `#E8E6EF` lavender-tint | `#0D0D0D` near-black     | Page background       |
| `bg-card`               | `#FFFFFF`               | `#1A1A1A`                | Islands, cards        |
| `text-foreground`       | `#242424`               | `#FFFFFF`                | Primary text          |
| `text-muted-foreground` | `#6B6B6B`               | `#A0A0A0`                | Secondary text        |
| `primary`               | `#7C6EE6`               | `#9D8DF1`                | Buttons, links, focus |
| `border`                | `rgba(0,0,0,0.06)`      | `rgba(255,255,255,0.06)` | Card borders          |

### Semantic Colors (Translation States)

| Status   | Color               | Background       | Usage                |
| -------- | ------------------- | ---------------- | -------------------- |
| Missing  | `destructive` coral | `destructive/10` | No translation       |
| Draft    | `warning` amber     | `warning/10`     | Needs review         |
| Reviewed | `info` blue         | `info/10`        | Ready, not published |
| Complete | `success` green     | `success/10`     | Published            |

### Usage Rules

- **Gray builds structure.** Color only for: status, action, error, success
- **One accent.** Purple is primary. Coral (`--accent-warm`) only for secondary CTAs
- **Semantic only.** No decorative color. Every color must communicate meaning

---

## Spacing (4px Grid)

All spacing uses 4px increments. Use Tailwind scale:

| Size | Pixels | Tailwind       | Usage                    |
| ---- | ------ | -------------- | ------------------------ |
| xs   | 4px    | `p-1`, `gap-1` | Icon gaps, micro spacing |
| sm   | 8px    | `p-2`, `gap-2` | Within components        |
| md   | 12px   | `p-3`, `gap-3` | Between related elements |
| base | 16px   | `p-4`, `gap-4` | Section padding          |
| lg   | 24px   | `p-6`, `gap-6` | Between sections         |
| xl   | 32px   | `p-8`, `gap-8` | Major separation         |

**Symmetrical padding required.** `p-4` or `px-4 py-3` (when horizontal needs room). Never `pt-6 pb-2 px-4`.

---

## Component Standards

### Sizing (MANDATORY)

| Element          | Height | Radius | Class             |
| ---------------- | ------ | ------ | ----------------- |
| Buttons          | 44px   | 12px   | `h-11 rounded-xl` |
| Inputs           | 44px   | 12px   | `h-11 rounded-xl` |
| Small buttons    | 36px   | 12px   | `h-9 rounded-xl`  |
| Large buttons    | 48px   | 12px   | `h-12 rounded-xl` |
| Icons in buttons | 18px   | -      | `size-4.5`        |
| Cards/Islands    | -      | 12px   | `rounded-xl`      |
| Modals           | -      | 16px   | `rounded-2xl`     |
| Badges/Pills     | -      | 9999px | `rounded-full`    |

### Islands (Card Containers)

```tsx
// Always use .island class for card containers
<div className="island space-y-4 p-6">{/* content */}</div>
```

The `.island` class provides:

- `bg-card` background
- `rounded-xl` border radius
- Subtle inner-glow shadow (light mode)
- `border border-border` (dark mode)

### Forms (ALWAYS use shadcn Form)

```tsx
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

<Form {...form}>
  <FormField
    control={form.control}
    name="fieldName"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Label</FormLabel>
        <FormControl>
          <Input {...field} /> {/* h-11 rounded-xl built-in */}
        </FormControl>
        <FormMessage /> {/* Auto error icon */}
      </FormItem>
    )}
  />
</Form>;
```

Use `mode: 'onTouched'` in useForm for errors after blur.

---

## Typography

### Font Stack

- **UI text:** Geist (via `font-sans`)
- **Data/code:** Geist Mono (via `font-mono`)

### Hierarchy

| Element         | Size               | Weight          | Tracking          |
| --------------- | ------------------ | --------------- | ----------------- |
| Page title      | `text-2xl` (32px)  | `font-semibold` | `-tracking-tight` |
| Section heading | `text-xl` (24px)   | `font-semibold` | `-tracking-tight` |
| Card title      | `text-lg` (18px)   | `font-medium`   | -                 |
| Body            | `text-base` (16px) | `font-normal`   | -                 |
| Secondary       | `text-sm` (14px)   | `font-normal`   | -                 |
| Label/caption   | `text-xs` (12px)   | `font-medium`   | -                 |
| Stats/numbers   | `text-4xl` (40px)  | `font-semibold` | `tabular-nums`    |

### Data Display

- Translation keys: `font-mono text-sm`
- IDs, codes, timestamps: `font-mono tabular-nums`
- Numbers in tables: `tabular-nums` for alignment

---

## Animation

### Entry Animations

```tsx
// Staggered fade-in for page content
<div className="animate-fade-in-up stagger-1">First element</div>
<div className="animate-fade-in-up stagger-2">Second element</div>
<div className="animate-fade-in-up stagger-3">Third element</div>
// ... up to stagger-6
```

### Transitions

| Type                   | Duration | Easing            |
| ---------------------- | -------- | ----------------- |
| Micro (hover, focus)   | 150ms    | `ease-out`        |
| Standard               | 200ms    | `ease-out`        |
| Large (modals, panels) | 250ms    | `--ease-out-expo` |

### Rules

- **No spring/bounce** in enterprise UI
- **No gradients** for decoration
- Subtle `.card-hover` for elevation on hover

---

## Icons

Use **lucide-react** (included via shadcn).

```tsx
import { Plus, Settings, ChevronRight } from 'lucide-react';

<Button>
  <Plus className="size-4.5" />
  Add Key
</Button>;
```

**Rules:**

- Icons clarify, not decorate. If removing loses no meaning, remove it.
- Standalone icons get subtle background containers
- Default size in buttons: `size-4.5` (18px)

---

## Tailwind v4 Syntax

**CRITICAL:** Lingx uses Tailwind v4. Avoid v3 syntax errors:

| v3 (OLD)                    | v4 (USE THIS)         |
| --------------------------- | --------------------- |
| `bg-gradient-to-r`          | `bg-linear-to-r`      |
| `shadow-black/[0.03]`       | `shadow-black/3`      |
| `bg-opacity-50`             | `bg-black/50`         |
| `w-[200px]`                 | `w-50` (prefer scale) |
| `w-[800px] h-[800px]`       | `size-200`            |
| separate w/h for same value | `size-{n}` combined   |

**Spacing scale:** value × 4px (e.g., `w-50` = 200px, `size-200` = 800px)

---

## Layout Patterns

### Page Structure

```tsx
<div className="space-y-6">
  {/* Page header */}
  <div className="flex items-center justify-between">
    <h1 className="text-2xl font-semibold -tracking-tight">Page Title</h1>
    <Button>
      <Plus className="size-4.5" />
      Action
    </Button>
  </div>

  {/* Stats row */}
  <div className="grid grid-cols-4 gap-4">
    <StatCard />
    <StatCard />
    <StatCard />
    <StatCard />
  </div>

  {/* Main content island */}
  <div className="island p-6">{/* content */}</div>
</div>
```

### Stat Card

```tsx
<div className="island animate-fade-in-up stagger-1 p-6">
  <div className="flex items-center justify-between">
    <span className="text-muted-foreground text-sm">Label</span>
    <ArrowUpRight className="text-muted-foreground size-4" />
  </div>
  <div className="mt-2 text-4xl font-semibold tabular-nums">42,847</div>
  <div className="text-success mt-1 flex items-center gap-1 text-sm">
    <TrendingUp className="size-3.5" />
    <span>12% vs last week</span>
  </div>
</div>
```

### Empty States

Don't leave empty space. Options:

1. **Helpful guidance** - "Get started by..." with action button
2. **Illustration** - Minimal, on-brand empty state graphic
3. **Condensed layout** - Reduce columns, adjust grid
4. **Related content** - Activity feed, tips, documentation links

---

## Anti-Patterns (NEVER DO)

### Banned

- ❌ Dramatic shadows (`shadow-2xl`, `shadow-[0_25px_50px...]`)
- ❌ Large radius on small elements (`rounded-2xl` on buttons)
- ❌ Asymmetric padding without reason
- ❌ Pure white cards on colored backgrounds (use `bg-card`)
- ❌ Thick borders (2px+) for decoration
- ❌ Excessive spacing (margins > 48px between sections)
- ❌ Spring/bouncy animations
- ❌ Gradients for decoration
- ❌ Multiple accent colors
- ❌ Native form elements (`<select>`, `<input type="date">`)
- ❌ Color-coding everything (use gray, reserve color for meaning)

### Always Question

- "Does this element feel crafted or default?"
- "Am I adding this for visual fill or function?"
- "Is every color earning its place?"
- "Are all elements on the 4px grid?"

---

## Quick Reference

```tsx
// Standard island
<div className="island p-6 space-y-4 animate-fade-in-up">

// Button with icon
<Button className="h-11"><Plus className="size-4.5" />Label</Button>

// Input
<Input className="h-11 rounded-xl bg-card" />

// Muted text
<span className="text-sm text-muted-foreground">Secondary info</span>

// Translation key
<code className="font-mono text-sm">namespace.key</code>

// Status badge
<Badge variant="success">Complete</Badge>

// Stats number
<span className="text-4xl font-semibold tabular-nums">1,234</span>

// Section spacing
<div className="space-y-6">

// Grid of cards
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
```

---

## Developer Patterns

For developer-facing features, leverage familiar patterns:

| Pattern         | Usage                                |
| --------------- | ------------------------------------ |
| Diff view       | Translation history, merge conflicts |
| Tree view       | Namespace hierarchy                  |
| Command palette | Quick search (⌘K)                    |
| Monospace       | Keys, code, API responses            |
| Breadcrumbs     | Nested navigation                    |

Balance familiarity with design system aesthetics.

---

## The Standard

Every interface should feel **crafted**, not generated. Premium is conveyed through:

- **Restraint** — What you don't add matters more
- **Precision** — Every pixel on the grid
- **Intentionality** — Every element earns its place
- **Consistency** — Same patterns, same treatment, everywhere

The goal: intricate minimalism with warmth. Same quality bar as Linear, Stripe, Notion.
