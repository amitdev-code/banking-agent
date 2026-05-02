# UI Rules

## Core Principles

- **Responsive first** — mobile breakpoints defined even if primary target is desktop
- **Light mode only** — no dark mode toggle required
- **Accessibility** — use semantic HTML, proper ARIA labels on interactive elements, keyboard-navigable
- **No layout shift** — always provide skeleton states for async content

## Component Library

- **shadcn/ui** — primary component library. Install via CLI (`pnpm dlx shadcn@latest add ...`). Never hand-edit files inside `components/ui/`.
- **lucide-react** — icons only from this library. No other icon libraries.
- **Framer Motion** — animations for workflow step transitions only. No gratuitous animations elsewhere.
- **recharts** — charts only (score distribution bar chart, score breakdown radar chart)
- **@tanstack/react-virtual** — virtual scrolling for customer card lists >50 items

## Layout

- Dashboard: 3-panel fixed layout — left 320px, middle flex-1, right 420px
- All panels are full-height with independent overflow-y scroll
- Use `gap`, `p-4`, `p-6` spacing from Tailwind — no arbitrary values unless unavoidable
- Cards use `rounded-lg border bg-card shadow-sm` from shadcn conventions

## Loading States

- Every data-fetching component must have a skeleton variant
- Use `<Skeleton>` from shadcn/ui for placeholder content
- Match skeleton shape to actual content shape (card → skeleton card, table → skeleton rows)
- Never show a blank white area while loading

## Empty States

- Every list component must handle the empty case with: icon + heading + subtext
- Empty state copy must be helpful: "No customers qualify yet. Run an analysis to get started."
- Never just render `null` or nothing for an empty list

## Spacing & Typography

- Consistent scale: `text-sm` for labels, `text-base` for body, `text-lg/xl` for headings
- Use `text-muted-foreground` for secondary text, `text-foreground` for primary
- `font-semibold` for card titles, `font-medium` for labels

## Score / Readiness Badges

- **Primed**: `bg-emerald-100 text-emerald-800 border-emerald-200`
- **Engaged**: `bg-blue-100 text-blue-800 border-blue-200`
- **Dormant**: `bg-amber-100 text-amber-800 border-amber-200`
- **At-Risk**: `bg-red-100 text-red-800 border-red-200`
- Always use `variant="outline"` badge from shadcn with custom class overrides

## Forms

- Controlled inputs with `react-hook-form` where forms have validation
- Show validation errors inline below the field
- Disable submit button during loading — show spinner inside button

## WhatsApp Integration

- Two actions per message: copy-to-clipboard + open wa.me deep-link
- Copy button: uses `navigator.clipboard.writeText()`, shows "Copied!" toast for 2s
- Deep-link format: `https://wa.me/${phoneWithCountryCode}?text=${encodeURIComponent(message)}`
- Phone number stored without country code — prepend `+91` for Indian numbers in seed data

## Client Components

- Mark `'use client'` only at the lowest component that requires it
- Never mark a layout or page as client when only a child needs it
- Pass server-fetched data as props to client components — do not re-fetch on client when avoidable
