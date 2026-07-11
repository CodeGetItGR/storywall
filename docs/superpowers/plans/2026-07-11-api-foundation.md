# StoryWall API Foundation (Phase 0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give storywall a real, auth-aware, multi-event-capable data layer — ported from
storywall-fe's already-working API integration — with no screen changes yet. This is Phase 0 of
`docs/superpowers/specs/2026-07-11-api-migration-design.md`; later plans (Phase 1: auth screens,
Phase 2: attendee screens, Phase 3: manage/invitations, Phase 4: orphan-screen quarantine) build
on top of this.

**Architecture:** Port `lib/api/*`, `lib/auth/tokenStore.ts`, `providers/AuthProvider.tsx`,
`providers/EventProvider.tsx` and their supporting hooks (`useAuth`, `useMyEvents`, `useEvent`)
from `C:\Users\User\WebstormProjects\storywall-fe` into storywall verbatim (both repos share the
same `@/*` path alias and compatible Next/React versions). Add a `Providers.tsx` wrapper
(`QueryClientProvider > AuthProvider > EventProvider`, no `AuthGate`/`EventGate`/
`WeddingProvider` yet — those are Phase 1+) and mount it in `app/layout.tsx`. Point
`NEXT_PUBLIC_API_BASE_URL` at the same backend storywall-fe uses.

**Tech Stack:** Next.js 16, React 19, TypeScript, `@tanstack/react-query` v5 (new dependency —
storywall has no data-fetching library today).

**No test runner exists in either repo** (confirmed: no `jest`/`vitest` in either `package.json`,
no `*.test.*` files). This plan verifies each step with `npx tsc --noEmit`, `npm run build`, and
manual dev-server checks against the running backend — the same approach storywall-fe's own
`plan.md` uses — rather than unit tests.

---

### Task 1: Add React Query dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the dependency**

Run: `cd "C:\Users\User\WebstormProjects\storywall" && npm install @tanstack/react-query@^5.101.2 @tanstack/react-query-devtools@^5.101.2`

Expected: `package.json` gains both packages under `"dependencies"`, `package-lock.json` updates,
no errors.

- [ ] **Step 2: Verify install**

Run: `cd "C:\Users\User\WebstormProjects\storywall" && node -e "console.log(require('@tanstack/react-query/package.json').version)"`

Expected: prints a `5.x` version string.

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\User\WebstormProjects\storywall"
git add package.json package-lock.json
git commit -m "chore: add @tanstack/react-query"
```

---

### Task 2: Environment config

**Files:**
- Create: `.env.local`
- Create: `.env.example`
- Modify: `.gitignore` (confirm `.env.local` is already ignored)

- [ ] **Step 1: Check `.gitignore` already excludes `.env.local`**

Run: `cd "C:\Users\User\WebstormProjects\storywall" && grep -n "env.local\|\.env\*" .gitignore`

Expected: at least one line matching `.env.local` or `.env*.local`. If nothing matches, add a
line `.env.local` to `.gitignore` before continuing (never commit real env values).

- [ ] **Step 2: Create `.env.example`**

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

- [ ] **Step 3: Create `.env.local` (same value, not committed)**

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

- [ ] **Step 4: Commit the example only**

```bash
cd "C:\Users\User\WebstormProjects\storywall"
git add .env.example .gitignore
git commit -m "chore: add API base URL env config"
```

---

### Task 3: Port `lib/api/types.ts`

**Files:**
- Create: `lib/api/types.ts` (copied verbatim from storywall-fe — 509 lines of DTO types, no
  adaptation needed since neither repo's types depend on i18n/routing)

- [ ] **Step 1: Copy the file**

Run:
```bash
mkdir -p "C:\Users\User\WebstormProjects\storywall\lib\api"
cp "C:\Users\User\WebstormProjects\storywall-fe\lib\api\types.ts" "C:\Users\User\WebstormProjects\storywall\lib\api\types.ts"
```

Expected: `lib/api/types.ts` exists in storywall, byte-identical to the storywall-fe source.

- [ ] **Step 2: Typecheck**

Run: `cd "C:\Users\User\WebstormProjects\storywall" && npx tsc --noEmit`

Expected: no errors referencing `lib/api/types.ts` (other pre-existing errors, if any, are out of
scope for this task).

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\User\WebstormProjects\storywall"
git add lib/api/types.ts
git commit -m "feat: port API DTO types from storywall-fe"
```

---

### Task 4: Port `lib/api/endpoints.ts`

**Files:**
- Create: `lib/api/endpoints.ts` (copied verbatim — no i18n/routing dependency)

- [ ] **Step 1: Copy the file**

Run: `cp "C:\Users\User\WebstormProjects\storywall-fe\lib\api\endpoints.ts" "C:\Users\User\WebstormProjects\storywall\lib\api\endpoints.ts"`

- [ ] **Step 2: Typecheck**

Run: `cd "C:\Users\User\WebstormProjects\storywall" && npx tsc --noEmit`

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\User\WebstormProjects\storywall"
git add lib/api/endpoints.ts
git commit -m "feat: port API endpoint registry from storywall-fe"
```

---

### Task 5: Port `lib/auth/tokenStore.ts`

**Files:**
- Create: `lib/auth/tokenStore.ts` (copied verbatim — depends only on `PlatformRole` from
  `lib/api/types.ts`, already ported in Task 3)

- [ ] **Step 1: Copy the file**

Run:
```bash
mkdir -p "C:\Users\User\WebstormProjects\storywall\lib\auth"
cp "C:\Users\User\WebstormProjects\storywall-fe\lib\auth\tokenStore.ts" "C:\Users\User\WebstormProjects\storywall\lib\auth\tokenStore.ts"
```

- [ ] **Step 2: Typecheck**

Run: `cd "C:\Users\User\WebstormProjects\storywall" && npx tsc --noEmit`

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\User\WebstormProjects\storywall"
git add lib/auth/tokenStore.ts
git commit -m "feat: port auth token store from storywall-fe"
```

---

### Task 6: Port `lib/api/client.ts`

**Files:**
- Create: `lib/api/client.ts` (copied verbatim — depends on `endpoints.ts`, `types.ts`,
  `tokenStore.ts`, all ported above)

- [ ] **Step 1: Copy the file**

Run: `cp "C:\Users\User\WebstormProjects\storywall-fe\lib\api\client.ts" "C:\Users\User\WebstormProjects\storywall\lib\api\client.ts"`

- [ ] **Step 2: Typecheck**

Run: `cd "C:\Users\User\WebstormProjects\storywall" && npx tsc --noEmit`

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\User\WebstormProjects\storywall"
git add lib/api/client.ts
git commit -m "feat: port API client from storywall-fe"
```

---

### Task 7: Port `lib/api/errors.ts` and `lib/api/pagination.ts`

**Files:**
- Create: `lib/api/errors.ts` (copied verbatim — depends on `client.ts`'s `ApiError`)
- Create: `lib/api/pagination.ts` (copied verbatim — no internal deps)

- [ ] **Step 1: Copy both files**

Run:
```bash
cp "C:\Users\User\WebstormProjects\storywall-fe\lib\api\errors.ts" "C:\Users\User\WebstormProjects\storywall\lib\api\errors.ts"
cp "C:\Users\User\WebstormProjects\storywall-fe\lib\api\pagination.ts" "C:\Users\User\WebstormProjects\storywall\lib\api\pagination.ts"
```

- [ ] **Step 2: Typecheck**

Run: `cd "C:\Users\User\WebstormProjects\storywall" && npx tsc --noEmit`

Expected: no new errors. `lib/api/*` is now fully ported and internally consistent.

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\User\WebstormProjects\storywall"
git add lib/api/errors.ts lib/api/pagination.ts
git commit -m "feat: port API error mapping and list-pagination adapter"
```

---

### Task 8: Port `providers/AuthProvider.tsx` and `hooks/useAuth.ts`

**Files:**
- Create: `providers/AuthProvider.tsx` (copied verbatim — depends only on `lib/api/*` and
  `lib/auth/tokenStore.ts`, no i18n/locale dependency)
- Create: `hooks/useAuth.ts` (copied verbatim — one-line re-export)

- [ ] **Step 1: Copy both files**

Run:
```bash
mkdir -p "C:\Users\User\WebstormProjects\storywall\providers"
mkdir -p "C:\Users\User\WebstormProjects\storywall\hooks"
cp "C:\Users\User\WebstormProjects\storywall-fe\providers\AuthProvider.tsx" "C:\Users\User\WebstormProjects\storywall\providers\AuthProvider.tsx"
cp "C:\Users\User\WebstormProjects\storywall-fe\hooks\useAuth.ts" "C:\Users\User\WebstormProjects\storywall\hooks\useAuth.ts"
```

- [ ] **Step 2: Typecheck**

Run: `cd "C:\Users\User\WebstormProjects\storywall" && npx tsc --noEmit`

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\User\WebstormProjects\storywall"
git add providers/AuthProvider.tsx hooks/useAuth.ts
git commit -m "feat: port AuthProvider (register/login/guest-login/refresh)"
```

---

### Task 9: Port `hooks/useMyEvents.ts` and `hooks/useEvent.ts`

**Files:**
- Create: `hooks/useMyEvents.ts` (copied verbatim — `GET /api/me/events`)
- Create: `hooks/useEvent.ts` (copied verbatim — `GET/POST/PATCH /api/events`)

- [ ] **Step 1: Copy both files**

Run:
```bash
cp "C:\Users\User\WebstormProjects\storywall-fe\hooks\useMyEvents.ts" "C:\Users\User\WebstormProjects\storywall\hooks\useMyEvents.ts"
cp "C:\Users\User\WebstormProjects\storywall-fe\hooks\useEvent.ts" "C:\Users\User\WebstormProjects\storywall\hooks\useEvent.ts"
```

- [ ] **Step 2: Typecheck**

Run: `cd "C:\Users\User\WebstormProjects\storywall" && npx tsc --noEmit`

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\User\WebstormProjects\storywall"
git add hooks/useMyEvents.ts hooks/useEvent.ts
git commit -m "feat: port useMyEvents and useEvent hooks"
```

---

### Task 10: Port `providers/EventProvider.tsx`

**Files:**
- Create: `providers/EventProvider.tsx` (copied verbatim — depends on `useAuth`, `useMyEvents`,
  `useEvent`, all ported above; no i18n/locale dependency, so it needs no adaptation)

- [ ] **Step 1: Copy the file**

Run: `cp "C:\Users\User\WebstormProjects\storywall-fe\providers\EventProvider.tsx" "C:\Users\User\WebstormProjects\storywall\providers\EventProvider.tsx"`

- [ ] **Step 2: Typecheck**

Run: `cd "C:\Users\User\WebstormProjects\storywall" && npx tsc --noEmit`

Expected: no new errors. `useActiveEvent()`, `useActiveMember()`, `useMyMemberships()`,
`useEventContextLoading()`, `useEventSwitcher()` are now all available for later phases (event
switcher UI itself is out of scope per the spec — these exports just need to exist and compile).

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\User\WebstormProjects\storywall"
git add providers/EventProvider.tsx
git commit -m "feat: port EventProvider (multi-event context, auto-active-event)"
```

---

### Task 11: Create the `Providers` wrapper

**Files:**
- Create: `providers/Providers.tsx`

Unlike storywall-fe's `app/[locale]/providers.tsx`, this wrapper does **not** include
`AuthGate`, `EventGate`, or `WeddingProvider` — those don't exist in storywall yet and route
protection is Phase 1 scope per the spec. This task only needs `QueryClientProvider`,
`AuthProvider`, and `EventProvider` so the rest of the app can start calling `useAuth()` /
`useActiveEvent()` without crashing.

- [ ] **Step 1: Write `providers/Providers.tsx`**

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import { AuthProvider } from "@/providers/AuthProvider";
import { EventProvider } from "@/providers/EventProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              // 4xx responses (bad auth, validation, not-found, etc.) won't
              // succeed on retry — only retry transient/server errors.
              if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
              return failureCount < 2;
            },
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <EventProvider>{children}</EventProvider>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd "C:\Users\User\WebstormProjects\storywall" && npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\User\WebstormProjects\storywall"
git add providers/Providers.tsx
git commit -m "feat: add Providers wrapper (QueryClient, Auth, Event)"
```

---

### Task 12: Wire `Providers` into the root layout

**Files:**
- Modify: `app/layout.tsx`

`app/layout.tsx` currently renders `children` directly with no providers at all (see current
content below). This step wraps it with the new `Providers` component.

Current content of `app/layout.tsx`:
```tsx
import { Geist } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'StoryWall — Emma & James · Oct 18, 2025',
  description: 'The wedding social wall for Emma Chen & James Rivera. Share memories, RSVP, explore the venue, and celebrate together.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#fffaf3',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.className} bg-background`}>
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
```

- [ ] **Step 1: Add the `Providers` import and wrap `children`**

Use the Edit tool on `app/layout.tsx`:

Old string:
```tsx
import { Geist } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'
```

New string:
```tsx
import { Geist } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Providers } from '@/providers/Providers'
import './globals.css'
```

Old string:
```tsx
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
```

New string:
```tsx
      <body className="antialiased">
        <Providers>{children}</Providers>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
```

- [ ] **Step 2: Typecheck**

Run: `cd "C:\Users\User\WebstormProjects\storywall" && npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Build**

Run: `cd "C:\Users\User\WebstormProjects\storywall" && npm run build`

Expected: build succeeds. `Providers` is a client component (`"use client"`), mounted inside the
server-rendered `RootLayout`, so this should build cleanly under Next.js 16's App Router rules —
if the build fails with a server/client boundary error, re-check
`node_modules/next/dist/docs/` for the current App Router client-component rules before
adjusting (per `AGENTS.md`'s "this is NOT the Next.js you know" warning also present in
storywall-fe).

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\User\WebstormProjects\storywall"
git add app/layout.tsx
git commit -m "feat: wire Providers into root layout"
```

---

### Task 13: Manual verification against the running backend

**Files:** none (verification only)

- [ ] **Step 1: Start the backend**

Confirm the backend used by storywall-fe is running at `http://localhost:8080` (same backend, per
the spec's "Backend target" decision). If storywall-fe has a documented way to start it, use that;
otherwise confirm with the user it's already running.

- [ ] **Step 2: Add storywall's dev port to the backend's CORS allowlist**

storywall-fe's `plan.md` flags that `CORS_ALLOWED_ORIGINS` defaults to `localhost:3000` and
`:5173`. storywall's dev server also defaults to port 3000 (`next dev`) — if storywall-fe is
*also* running on 3000 locally, run storywall on a different port and confirm that port is on the
backend's CORS allowlist:

Run: `cd "C:\Users\User\WebstormProjects\storywall" && npx next dev -p 3002`

- [ ] **Step 3: Open the app and confirm no console errors**

Use the browser preview tool to open `http://localhost:3002`. Confirm:
- The page renders (feed screen, still on mock data — expected, no screens were touched).
- No uncaught exceptions in the console about `useAuth`/`useActiveEvent`/missing providers.
- No CORS errors in the console (if there are, revisit Step 2).

- [ ] **Step 4: Confirm the auth bootstrap request fires**

With the browser preview's network inspector, confirm on page load there is **no** request to
`/api/auth/refresh` or `/api/auth/guest-login` yet — `AuthProvider`'s bootstrap effect only calls
those when a refresh token or invite token is already in `sessionStorage`, and on a fresh browser
profile neither exists yet. This is expected: it confirms the provider mounted and ran its
bootstrap effect without crashing, rather than confirming a live network call. Set
`isBootstrapping` to `false` (visible via React DevTools component state on `AuthProvider`, or by
temporarily logging `useAuth().isBootstrapping` in a scratch component) to confirm the bootstrap
effect completed.

- [ ] **Step 5: Report status to the user**

Summarize: providers mounted, no regressions to existing screens, ready for Phase 1 (auth
screens) to actually exercise `login`/`register`/`guestLogin`.
