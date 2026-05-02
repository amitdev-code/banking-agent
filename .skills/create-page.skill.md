# Skill: Create Next.js Page

Use this checklist when adding a new page to `apps/web`.

## File Structure

```
app/<route>/
├── page.tsx        (required — server component by default)
├── layout.tsx      (optional — if route needs its own layout)
├── loading.tsx     (required for any page with async data fetching)
└── error.tsx       (required for pages that may fail)
```

## Page Template (Server Component)

```tsx
// app/<route>/page.tsx
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Page Title | Banking CRM',
  description: 'Brief description',
};

export default async function SomePage() {
  const cookieStore = await cookies();
  // Forward session cookie for authenticated server-side fetch
  const cookieHeader = cookieStore.toString();

  const response = await fetch(`${process.env.API_URL}/some-endpoint`, {
    headers: { Cookie: cookieHeader, 'X-Tenant-Slug': process.env.TENANT_SLUG ?? '' },
    cache: 'no-store',
  });

  if (response.status === 401) redirect('/login');
  if (response.status === 403) return <AccessDenied />;

  const data = await response.json();
  return <SomePageContent data={data} />;
}
```

## loading.tsx Template

```tsx
// app/<route>/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}
```

## Rules

- Default to **server components** — add `'use client'` only to the specific child that needs it
- Always export `metadata` from page files
- Always provide `loading.tsx` for pages with async fetching
- Handle 401 → redirect to `/login`, handle 403 → render `<AccessDenied>` in-page (not redirect)
- Never fetch data in a client component if a server component can do it
- Pass server-fetched data as props down to client components

## Protected Routes

All routes except `/(auth)/login` are protected. The `SessionGuard` on the API handles 401. In Next.js:

```tsx
// middleware.ts (root)
// Route protection is handled by checking API responses, not Next.js middleware
// This avoids duplicating auth logic
```
