# LocaleFlow Project Instructions

## Tech Stack
- **Monorepo**: pnpm workspaces + Turborepo
- **API**: Fastify 5, Prisma 7, PostgreSQL
- **Web**: Next.js 16 (App Router), React 19, shadcn/ui, TailwindCSS v4
- **Auth**: JWT (24h) + API Keys
- **Testing**: Vitest (unit/integration), Playwright (E2E)
- **Forms**: react-hook-form + zod + shadcn Form components

## Package Management
- Always use `pnpm` (not npm/yarn)
- Use `pnpm add <package>` without version pinning
- Use official CLI tools:
  - `npx shadcn@latest add <component>` for shadcn components
  - `npx prisma migrate dev` for database migrations

## Prisma 7 (Breaking Changes)
- NO `url` in `datasource` block - use `prisma.config.ts` instead
- Use adapter-based client: `@prisma/adapter-pg` with `pg.Pool`
- Docs: https://www.prisma.io/docs

## Documentation
- `docs/prd/PRD.md` - Product requirements
- `docs/design/DESIGN.md` - Technical design, API specs
- `docs/adr/` - Architecture Decision Records
- `docs/TODO-API-FEATURES.md` - UI features needing API implementation

---

## Design System (Premium Styling)

### Colors (globals.css)
- **Primary**: Soft purple `#7C6EE6` (light) / `#9D8DF1` (dark)
- **Background**: Lavender-tinted `#E8E6EF` (light) / Near black `#0D0D0D` (dark)
- **Cards/Islands**: Pure white with subtle inner glow shadows
- **Semantic**: Success green, Warning amber, Destructive coral

### Sizing Standards
- **Form inputs**: `h-11` (44px), `rounded-xl`, `bg-card`, `border-border`
- **Buttons**: `h-11` default, `h-9` small, `h-12` large, `rounded-xl`
- **Icons in buttons**: `size-[18px]` default
- **Select/Textarea**: Match input styling

### Visual Effects
- **Islands**: `.island` class with inner glow shadow
- **Animations**: `animate-fade-in-up` with stagger classes (`stagger-1` to `stagger-6`)
- **Easing**: `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)`
- **Card hover**: `.card-hover` for elevation on hover

---

## Form Patterns

### Always Use shadcn Form Components
```tsx
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const form = useForm<FormData>({
  resolver: zodResolver(schema),
  mode: 'onTouched', // Show errors after field is blurred
  defaultValues: { ... },
});

<Form {...form}>
  <FormField
    control={form.control}
    name="fieldName"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Label</FormLabel>
        <FormControl>
          <Input {...field} />
        </FormControl>
        <FormDescription>Helper text</FormDescription>
        <FormMessage /> {/* Auto-shows errors with icon */}
      </FormItem>
    )}
  />
</Form>
```

### Validation Mode
- Use `mode: 'onTouched'` - errors show only after field is blurred
- `FormMessage` automatically includes AlertCircle icon

---

## Frontend Development

### Required Skill
When implementing UI components, ALWAYS use `Skill(frontend-design)` for premium aesthetics.

### Key Component Files
- `components/ui/button.tsx` - h-11 default, rounded-xl
- `components/ui/input.tsx` - h-11, rounded-xl, bg-card
- `components/ui/select.tsx` - h-11, rounded-xl, full-width
- `components/ui/form.tsx` - Form validation with icons
- `components/ui/textarea.tsx` - rounded-xl, min-h-[120px]

### Page Structure
- Use `.island` class for card containers
- Add `animate-fade-in-up` with `stagger-N` for entrance animations
- Consistent spacing with `space-y-6` between sections

---

## Current Placeholder Data
These UI elements use fake data and need API implementation:
- Dashboard: completion rate (87%), activity feed
- Projects: progress bars, key counts
- See `docs/TODO-API-FEATURES.md` for full list
