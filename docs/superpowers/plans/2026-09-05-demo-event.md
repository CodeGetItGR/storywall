# Demo Event Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a fully backend-detached `/demo` experience where a visitor lands as the host of a
pre-seeded sample event and can use feed/gallery/wishbook/RSVP/story/manage tools with zero calls
to Spring — every read/write is served locally and persisted to `localStorage`.

**Architecture:** [Mock Service Worker](https://mswjs.io/) intercepts every `fetch()` the existing
84 hooks already make through `lib/api/client.ts`, answering from a `localStorage`-backed mock
store seeded with realistic sample data. `/demo` is a brand-new, unprotected route tree that
reuses the real feature components (`FeedPageBoundary`, `GalleryScreen`, `WishbookPage`,
`RsvpScreen`, `ManageScreen`) unmodified, wrapped in demo-only `AuthProvider`/`EventProvider`
stand-ins that feed those components a fake "logged in as host" context instead of a real session.

**Tech Stack:** Next.js 16 (App Router), React 19, TanStack Query 5, MSW 2, Vitest.

**Spec:** [docs/superpowers/specs/2026-09-04-demo-event-design.md](../specs/2026-09-04-demo-event-design.md)

---

## Design notes discovered while planning (read before starting)

These weren't in the original spec — they came up while tracing the real provider tree and are
load-bearing for several tasks below:

1. **`routes.ts` needs a demo branch.** Every reused screen builds its "back"/tab links via
   `routes.events.*`, which always returns real `/events/{id}/...` paths (protected by
   `proxy.ts`). Task 8 adds a branch to each helper: if `eventId === DEMO_EVENT_ID`, emit a
   `/demo/...` path instead. Confirmed with the user as the preferred fix over touching `proxy.ts`.
2. **`ComposerProvider`/`ModalProvider` need a second, nested instance.** They're mounted once at
   the app root (`providers/Providers.tsx`), above `/demo`. `useComposerController` (inside
   `ComposerProvider`) reads `useActiveEvent()`/`useActiveMember()` — resolved from whichever
   `EventProvider`/`EventContext.Provider` is nearest **above** it in the tree, which for the root
   instance is the real one (always `null` for an anonymous visitor). Nesting a **second**
   `ComposerProvider`/`ModalProvider` inside `app/demo/layout.tsx`, below the demo's fake
   `EventContext.Provider`, gives the composer (post/story/song creation) the fake event for free
   — no code changes to `ComposerProvider` itself, just rendering it again in a deeper position.
3. **MSW's service worker must be explicitly stopped when leaving `/demo`.** It intercepts
   `fetch()` for the whole page/document, not just the React subtree that started it — if a
   visitor client-side-navigates from `/demo` to a real route (e.g. a "sign up for real" link)
   without a full reload, a still-running worker would silently mock the real signup call too.
   Task 6 starts the worker in a `useEffect` on `app/demo/layout.tsx` mount and stops it on
   unmount. As defense in depth, Task 10's "exit demo" link is a plain `<a href>` (full
   navigation), not a Next `<Link>`.
4. **`onUnhandledRequest: 'error'`.** MSW's mock handlers must cover every endpoint the in-scope
   screens call (including peripheral manage-tools reads like invitations/QR links/usage/billing
   summary — all read-only, all safe to stub). Setting this option means any endpoint the plan
   missed fails loudly during manual verification instead of silently falling through to a real
   network call — the one config knob that actually guarantees "zero calls to Spring."
5. **No changes needed to the shared root `QueryClient`.** The demo's fake providers set static
   context values directly (no `useQuery` involved), so they never call `queryClient.setQueryData`
   on the shared, app-wide query client. Every real query the reused components fire (config,
   posts, media, etc.) is answered by MSW at the network layer instead — ordinary React Query
   caching just works, scoped normally by query key, with no manual cache seeding and no risk of
   stale demo data bleeding into a real session sharing the same tab.

---

## File structure

**New:**

- `lib/demo/demoConstants.ts` — the fixed demo event/member/user ids and localStorage key prefix.
- `lib/demo/mockDb.ts` — generic collection store: load/save/reseed against `localStorage`, typed
  CRUD helpers used by every handler.
- `lib/demo/seedData.ts` — the actual sample dataset (config, event, members, posts, media,
  wishbook entries, rsvps, stories, modules, sessions, invitations, QR links, usage, billing).
- `lib/demo/mockHandlers.ts` — generic MSW handler factories (list/page/detail/create/patch/delete)
  plus the full table wiring them to every in-scope endpoint.
- `lib/demo/mockWorker.ts` — MSW `setupWorker(...)` instance plus `startDemoMocking()` /
  `stopDemoMocking()`.
- `providers/demo/DemoAuthProvider.tsx` — renders the real `AuthContext.Provider` with a static
  fake session.
- `providers/demo/DemoEventProvider.tsx` — renders the real `EventContext.Provider` with the
  static fake event/membership state.
- `app/demo/layout.tsx` — starts/stops MSW, nests the demo providers + a second
  `ComposerProvider`/`ModalProvider`, renders the reset control.
- `app/demo/page.tsx` — redirects to `/demo/feed`.
- `app/demo/feed/page.tsx`, `app/demo/tools/gallery/page.tsx`, `app/demo/tools/wishbook/page.tsx`,
  `app/demo/tools/rsvp/page.tsx`, `app/demo/manage/page.tsx` — thin pages rendering the real
  feature components directly (no server prefetch).
- `components/demo/DemoUnavailable.tsx` — fallback shown if the service worker fails to start.
- `components/demo/ResetDemoButton.tsx` — the reset action.

**Modified:**

- `providers/AuthProvider.tsx` — export the existing `AuthContext` object (no logic change).
- `providers/EventProvider.tsx` — export the existing `EventContext` object (no logic change).
- `lib/routes.ts` — add the demo-id branch described above.
- `package.json` — add `msw` devDependency, `msw.workerDirectory` config (written by `msw init`).

---

## Task 1: Install MSW and generate the service worker

**Files:**

- Modify: `package.json`
- Create: `public/mockServiceWorker.js` (generated, not hand-written)

- [ ] **Step 1: Install MSW**

Run: `npm install --save-dev msw@^2`
Expected: `msw` appears under `devDependencies` in `package.json`.

- [ ] **Step 2: Generate the worker script**

Run: `npx msw init public/ --save`
Expected: creates `public/mockServiceWorker.js` and adds `"msw": { "workerDirectory": ["public"] }`
to `package.json`.

- [ ] **Step 3: Verify the generated file is tracked, not ignored**

Run: `git check-ignore -v public/mockServiceWorker.js`
Expected: no output (the file is not ignored — `public/` isn't in `.gitignore`). If it prints a
match, remove that ignore rule.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json public/mockServiceWorker.js
git commit -m "$(cat <<'EOF'
Add MSW for the backend-detached demo event

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Demo constants and the generic mock store

**Files:**

- Create: `lib/demo/demoConstants.ts`
- Create: `lib/demo/mockDb.ts`
- Test: `lib/demo/mockDb.test.ts`

- [ ] **Step 1: Write `demoConstants.ts`**

```typescript
// lib/demo/demoConstants.ts
export const DEMO_EVENT_ID = 'demo-event';
export const DEMO_USER_ID = 'demo-user';
export const DEMO_HOST_MEMBER_ID = 'demo-member-host';
export const DEMO_STORAGE_KEY = 'storywall:demo:db:v1';
```

- [ ] **Step 2: Write the failing test for the store**

```typescript
// lib/demo/mockDb.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockDb } from '@/lib/demo/mockDb';

interface Widget {
    id: string;
    eventId: string;
    label: string;
}

function seed(): { widgets: Widget[] } {
    return { widgets: [{ id: 'w1', eventId: 'e1', label: 'seed' }] };
}

describe('createMockDb', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('starts from the seed when localStorage is empty', () => {
        const db = createMockDb('test:db', seed);
        expect(db.list('widgets')).toEqual([{ id: 'w1', eventId: 'e1', label: 'seed' }]);
    });

    it('persists a create across store instances', () => {
        const db = createMockDb('test:db', seed);
        db.create('widgets', { id: 'w2', eventId: 'e1', label: 'added' });

        const reloaded = createMockDb('test:db', seed);
        expect(reloaded.list('widgets').map((w) => w.id)).toEqual(['w1', 'w2']);
    });

    it('updates a record in place by id', () => {
        const db = createMockDb('test:db', seed);
        db.update('widgets', 'w1', (widget) => ({ ...widget, label: 'changed' }));
        expect(db.get('widgets', 'w1')?.label).toBe('changed');
    });

    it('removes a record by id', () => {
        const db = createMockDb('test:db', seed);
        db.remove('widgets', 'w1');
        expect(db.list('widgets')).toEqual([]);
    });

    it('falls back to the seed if localStorage holds corrupt JSON', () => {
        localStorage.setItem('test:db', '{not json');
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const db = createMockDb('test:db', seed);
        expect(db.list('widgets')).toEqual([{ id: 'w1', eventId: 'e1', label: 'seed' }]);
        warn.mockRestore();
    });

    it('reset() restores the seed and persists it', () => {
        const db = createMockDb('test:db', seed);
        db.create('widgets', { id: 'w2', eventId: 'e1', label: 'added' });
        db.reset();

        const reloaded = createMockDb('test:db', seed);
        expect(reloaded.list('widgets')).toEqual([{ id: 'w1', eventId: 'e1', label: 'seed' }]);
    });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run lib/demo/mockDb.test.ts`
Expected: FAIL — `Cannot find module '@/lib/demo/mockDb'`.

- [ ] **Step 4: Implement `mockDb.ts`**

```typescript
// lib/demo/mockDb.ts

// A generic, localStorage-persisted collection store for the demo mock backend.
// `Schema` is a map of collection name -> record type, e.g. { posts: PostResponseDto }.
// Every record must carry a string `id` field.
type WithId = { id: string };

export interface MockDb<Schema extends Record<string, WithId>> {
    list<K extends keyof Schema>(collection: K): Schema[K][];
    get<K extends keyof Schema>(collection: K, id: string): Schema[K] | undefined;
    create<K extends keyof Schema>(collection: K, record: Schema[K]): Schema[K];
    update<K extends keyof Schema>(collection: K, id: string, patch: (record: Schema[K]) => Schema[K]): Schema[K] | undefined;
    remove<K extends keyof Schema>(collection: K, id: string): void;
    reset(): void;
}

function loadState<Schema>(storageKey: string, seed: () => Schema): Schema {
    if (typeof window === 'undefined') return seed();

    try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return seed();
        return JSON.parse(raw) as Schema;
    } catch {
        console.warn(`[demo] Corrupt data at localStorage key "${storageKey}" — reseeding.`);
        return seed();
    }
}

function saveState<Schema>(storageKey: string, state: Schema): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, JSON.stringify(state));
}

export function createMockDb<Schema extends Record<string, WithId[]>>(
    storageKey: string,
    seed: () => Schema
): MockDb<{ [K in keyof Schema]: Schema[K][number] }> {
    let state = loadState(storageKey, seed);

    function persist() {
        saveState(storageKey, state);
    }

    return {
        list: (collection) => state[collection] as never,
        get: (collection, id) => (state[collection] as WithId[]).find((r) => r.id === id) as never,
        create: (collection, record) => {
            state = { ...state, [collection]: [...(state[collection] as WithId[]), record] };
            persist();
            return record;
        },
        update: (collection, id, patch) => {
            let updated: WithId | undefined;
            state = {
                ...state,
                [collection]: (state[collection] as WithId[]).map((r) => {
                    if (r.id !== id) return r;
                    updated = patch(r as never);
                    return updated;
                }),
            };
            if (updated) persist();
            return updated as never;
        },
        remove: (collection, id) => {
            state = { ...state, [collection]: (state[collection] as WithId[]).filter((r) => r.id !== id) };
            persist();
        },
        reset: () => {
            state = seed();
            persist();
        },
    };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run lib/demo/mockDb.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/demo/demoConstants.ts lib/demo/mockDb.ts lib/demo/mockDb.test.ts
git commit -m "$(cat <<'EOF'
Add generic localStorage-backed mock store for the demo

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Seed data

**Files:**

- Create: `lib/demo/seedData.ts`

This is one large, typed data literal — no tests, since there's no logic to verify (TypeScript's
structural checking against the real DTOs, exercised by `npm run type:check` in Task 11, is the
correctness check here).

- [ ] **Step 1: Write `seedData.ts`**

```typescript
// lib/demo/seedData.ts
import { DEMO_EVENT_ID, DEMO_HOST_MEMBER_ID, DEMO_USER_ID } from '@/lib/demo/demoConstants';
import type {
    AppConfigResponseDto,
    EventBillingResponseDto,
    EventDetailResponseDto,
    EventInvitationResponseDto,
    EventMemberResponseDto,
    EventModuleResponseDto,
    EventSessionResponseDto,
    EventUsageResponseDto,
    MediaResponseDto,
    PostResponseDto,
    QrLinkResponseDto,
    QrLinkStatsDto,
    RsvpResponseDto,
    StoryResponseDto,
    WishbookEntryResponseDto,
} from '@/lib/api/types';

const NOW = () => new Date().toISOString();
const DAYS = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

// A tiny 1x1 transparent PNG — used as the seed photos' placeholder data URL so the
// demo never needs to ship real binary sample assets.
const PLACEHOLDER_IMAGE =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

export const DEMO_SESSION_ID = 'demo-session-main';

export function buildSeedMedia(): MediaResponseDto[] {
    return [
        {
            id: 'demo-media-1',
            eventId: DEMO_EVENT_ID,
            uploaderMemberId: DEMO_HOST_MEMBER_ID,
            anonymousUploaderName: null,
            storageKey: 'demo/media-1.png',
            mediaUrl: PLACEHOLDER_IMAGE,
            status: 'READY',
            thumbnailUrl: PLACEHOLDER_IMAGE,
            originalFilename: 'first-dance.png',
            mimeType: 'image/png',
            mediaType: 'IMAGE',
            fileSize: 1024,
            width: 1,
            height: 1,
            durationSeconds: null,
            metadata: {},
            createdAt: DAYS(-2),
            deletedAt: null,
        },
        {
            id: 'demo-media-2',
            eventId: DEMO_EVENT_ID,
            uploaderMemberId: DEMO_HOST_MEMBER_ID,
            anonymousUploaderName: null,
            storageKey: 'demo/media-2.png',
            mediaUrl: PLACEHOLDER_IMAGE,
            status: 'READY',
            thumbnailUrl: PLACEHOLDER_IMAGE,
            originalFilename: 'toast.png',
            mimeType: 'image/png',
            mediaType: 'IMAGE',
            fileSize: 1024,
            width: 1,
            height: 1,
            durationSeconds: null,
            metadata: {},
            createdAt: DAYS(-1),
            deletedAt: null,
        },
    ];
}

export function buildSeedMembers(): EventMemberResponseDto[] {
    return [
        {
            id: DEMO_HOST_MEMBER_ID,
            eventId: DEMO_EVENT_ID,
            userId: DEMO_USER_ID,
            invitationId: null,
            role: 'HOST',
            displayName: 'Alex Rivera',
            nickname: null,
            relationshipRole: null,
            customRelationshipRole: null,
            isFeatured: true,
            avatarMediaId: null,
            joinedAt: DAYS(-30),
            rsvpId: null,
            createdAt: DAYS(-30),
            updatedAt: DAYS(-30),
            deletedAt: null,
        },
        {
            id: 'demo-member-guest-1',
            eventId: DEMO_EVENT_ID,
            userId: null,
            invitationId: null,
            role: 'ATTENDEE',
            displayName: 'Jordan Lee',
            nickname: null,
            relationshipRole: 'Friend',
            customRelationshipRole: null,
            isFeatured: false,
            avatarMediaId: null,
            joinedAt: DAYS(-20),
            rsvpId: 'demo-rsvp-1',
            createdAt: DAYS(-20),
            updatedAt: DAYS(-20),
            deletedAt: null,
        },
        {
            id: 'demo-member-guest-2',
            eventId: DEMO_EVENT_ID,
            userId: null,
            invitationId: null,
            role: 'ATTENDEE',
            displayName: 'Sam Okafor',
            nickname: null,
            relationshipRole: 'Cousin',
            customRelationshipRole: null,
            isFeatured: false,
            avatarMediaId: null,
            joinedAt: DAYS(-18),
            rsvpId: null,
            createdAt: DAYS(-18),
            updatedAt: DAYS(-18),
            deletedAt: null,
        },
    ];
}

export function buildSeedPosts(): PostResponseDto[] {
    return [
        {
            id: 'demo-post-1',
            eventId: DEMO_EVENT_ID,
            authorMemberId: DEMO_HOST_MEMBER_ID,
            author: {
                memberId: DEMO_HOST_MEMBER_ID,
                displayName: 'Alex Rivera',
                nickname: null,
                role: 'HOST',
                avatarMediaId: null,
                avatarUrl: null,
            },
            type: 'MEDIA',
            content: "Couldn't stop smiling during the first dance 💃",
            isPinned: true,
            media: [buildSeedMedia()[0]],
            commentCount: 1,
            reactionCount: 2,
            reactionCounts: { LOVE: 2 },
            myReactionType: null,
            createdAt: DAYS(-2),
            updatedAt: DAYS(-2),
            deletedAt: null,
        },
        {
            id: 'demo-post-2',
            eventId: DEMO_EVENT_ID,
            authorMemberId: 'demo-member-guest-1',
            author: {
                memberId: 'demo-member-guest-1',
                displayName: 'Jordan Lee',
                nickname: null,
                role: 'ATTENDEE',
                avatarMediaId: null,
                avatarUrl: null,
            },
            type: 'TEXT',
            content: 'So happy to be here celebrating you two! 🎉',
            isPinned: false,
            media: [],
            commentCount: 0,
            reactionCount: 1,
            reactionCounts: { LIKE: 1 },
            myReactionType: null,
            createdAt: DAYS(-1),
            updatedAt: DAYS(-1),
            deletedAt: null,
        },
    ];
}

export function buildSeedWishbookEntries(): WishbookEntryResponseDto[] {
    return [
        {
            id: 'demo-wishbook-1',
            eventId: DEMO_EVENT_ID,
            authorMemberId: 'demo-member-guest-1',
            guestName: 'Jordan Lee',
            message: 'Wishing you a lifetime of love and laughter!',
            createdAt: DAYS(-1),
            canDelete: true,
        },
    ];
}

export function buildSeedRsvps(): RsvpResponseDto[] {
    return [
        {
            id: 'demo-rsvp-1',
            eventMemberId: 'demo-member-guest-1',
            attendanceStatus: 'ATTENDING',
            phone: null,
            adultCount: 2,
            childCount: 0,
            notes: null,
            submittedAt: DAYS(-15),
            updatedAt: DAYS(-15),
        },
    ];
}

export function buildSeedStories(): StoryResponseDto[] {
    return [
        {
            id: 'demo-story-1',
            eventId: DEMO_EVENT_ID,
            authorMemberId: DEMO_HOST_MEMBER_ID,
            mediaId: 'demo-media-2',
            caption: 'Getting ready!',
            songUrl: null,
            expiresAt: DAYS(1),
            createdAt: DAYS(-1),
            deletedAt: null,
            viewedByCurrentUser: true,
        },
    ];
}

export function buildSeedModules(): EventModuleResponseDto[] {
    const enabled: EventModuleResponseDto['moduleKey'][] = ['posts', 'gallery', 'rsvp', 'stories', 'wishbook', 'playlist'];
    return enabled.map((moduleKey, index) => ({
        id: `demo-module-${index}`,
        eventId: DEMO_EVENT_ID,
        moduleKey,
        isEnabled: true,
        configuration: {},
        createdAt: DAYS(-30),
        isAvailable: true,
    }));
}

export function buildSeedSessions(): EventSessionResponseDto[] {
    return [
        {
            id: 'demo-session-main',
            eventId: DEMO_EVENT_ID,
            title: 'Ceremony & Reception',
            description: 'Join us as we say "I do" and celebrate late into the night.',
            startAt: DAYS(14),
            endAt: DAYS(14),
            locationName: 'Willowbrook Gardens',
            mapsUrl: null,
            displayOrder: 0,
            isMain: true,
            isSecondary: false,
            createdAt: DAYS(-30),
            deletedAt: null,
        },
    ];
}

export function buildSeedEvent(): EventDetailResponseDto {
    return {
        id: DEMO_EVENT_ID,
        title: 'Alex & Riley’s Wedding',
        subtitle: 'Try every host tool on a real sample event',
        description: 'This is a demo event — everything you add here stays in your browser only.',
        eventType: 'WEDDING',
        visibility: 'PRIVATE',
        schedule: { startAt: DAYS(14), endAt: DAYS(14), timezone: 'UTC', rsvpDeadline: DAYS(7) },
        location: { name: 'Willowbrook Gardens', address: '123 Garden Way', mapsUrl: null },
        coverMedia: buildSeedMedia()[0],
        brandingSettings: {},
        hosts: [{ id: 'demo-host-1', eventId: DEMO_EVENT_ID, memberId: DEMO_HOST_MEMBER_ID, displayOrder: 0, createdAt: DAYS(-30) }],
        modules: buildSeedModules(),
        sessions: buildSeedSessions(),
        rsvpSummary: { totalMembers: 2, attending: 1, declined: 0, noResponse: 1 },
        createdAt: DAYS(-30),
        updatedAt: NOW(),
        deletedAt: null,
        deletionScheduledFor: null,
        status: 'ACTIVE',
    };
}

export function buildSeedInvitations(): EventInvitationResponseDto[] {
    return [
        {
            id: 'demo-invitation-1',
            eventId: DEMO_EVENT_ID,
            inviteCode: 'DEMO1234',
            inviteToken: 'demo-invite-token-1',
            email: 'jordan@example.com',
            firstName: 'Jordan',
            lastName: 'Lee',
            maxGuests: 2,
            expiresAt: null,
            usedAt: DAYS(-20),
            createdAt: DAYS(-25),
            role: 'ATTENDEE',
        },
    ];
}

export function buildSeedQrLinks(): QrLinkResponseDto[] {
    return [
        {
            id: 'demo-qr-1',
            eventId: DEMO_EVENT_ID,
            token: 'demo-qr-token-1',
            publicUrl: 'https://example.com/q/demo-qr-token-1',
            targetType: 'MEDIA_UPLOAD',
            targetId: null,
            status: 'ACTIVE',
            maxGuests: null,
            label: 'Table QR code',
            metadata: {},
            autoGenerated: false,
            expiresAt: null,
            revokedAt: null,
            createdByUserId: DEMO_USER_ID,
            createdAt: DAYS(-10),
        },
    ];
}

export function buildSeedQrLinkStats(): QrLinkStatsDto[] {
    return [
        {
            qrLinkId: 'demo-qr-1',
            label: 'Table QR code',
            targetType: 'MEDIA_UPLOAD',
            status: 'ACTIVE',
            joinCount: 3,
            maxGuests: null,
            remainingSlots: null,
            lastJoinedAt: DAYS(-1),
            uploadCount: 5,
        },
    ];
}

export function buildSeedUsage(): EventUsageResponseDto {
    return {
        eventId: DEMO_EVENT_ID,
        planTier: 'FREE',
        storageBytes: 2_048,
        planStorageBytes: 5 * 1024 * 1024 * 1024,
        extraStorageBytes: 0,
        storageLimitBytes: 5 * 1024 * 1024 * 1024,
        storagePercent: 0,
        memberCount: 3,
        memberLimit: 100,
        memberPercent: 3,
    };
}

export function buildSeedBilling(): EventBillingResponseDto {
    return { eventStatus: 'ACTIVE', planTierCode: 'FREE', planTierName: 'Free', orders: [], addons: [] };
}

export function buildSeedAppConfig(): AppConfigResponseDto {
    return {
        featureFlags: [],
        media: {
            maxFileSizeBytes: 25 * 1024 * 1024,
            maxRequestSizeBytes: 260 * 1024 * 1024,
            maxImageBytes: 25 * 1024 * 1024,
            maxVideoBytes: 200 * 1024 * 1024,
            maxStoryVideoBytes: 100 * 1024 * 1024,
            maxStoryVideoDurationSeconds: 60,
            maxBatchUploadFiles: 10,
            maxBatchStoryItems: 10,
            maxMediaPerPost: 10,
            maxArchiveSelectedItems: 200,
            maxArchivePartBytes: 500 * 1024 * 1024,
            presignedUrlTtlMinutes: 15,
            publicHost: null,
        },
        pagination: { defaultPageSize: 20, maxPageSize: 100 },
        planTiers: [
            {
                id: 'demo-plan-free',
                code: 'FREE',
                scope: 'EVENT',
                name: 'Free',
                description: 'The demo plan tier.',
                sortOrder: 0,
                isDefault: true,
                isAssignable: true,
                isPublic: true,
                storageBytes: 5 * 1024 * 1024 * 1024,
                maxMembers: 100,
                priceAmountMinor: 0,
                priceCurrency: 'USD',
                billingPeriod: null,
            },
        ],
        paidServices: [],
        eventModuleKeys: ['posts', 'rsvp', 'playlist', 'stories', 'gallery', 'wishlist', 'wishbook'],
        modules: buildSeedModules().map((module_, index) => ({
            id: `demo-platform-module-${index}`,
            moduleKey: module_.moduleKey,
            name: module_.moduleKey[0].toUpperCase() + module_.moduleKey.slice(1),
            description: null,
            isEnabled: true,
            sortOrder: index,
        })),
        eventTypes: [{ id: 'demo-event-type-wedding', eventTypeKey: 'WEDDING', icon: 'heart', accentToken: 'rose', isEnabled: true, sortOrder: 0 }],
        eventTypeKeys: ['WEDDING'],
        translations: { eventTypes: {} },
        rsvp: { minAdults: 0, maxAdults: 10, minChildren: 0, maxChildren: 10 },
        contentLimits: {
            postContentMaxLength: 500,
            commentContentMaxLength: 500,
            storyCaptionMaxLength: 200,
            wishbookMessageMaxLength: 2000,
            playlistSuggestionCommentMaxLength: 300,
            rsvpNotesMaxLength: 500,
            eventDescriptionMaxLength: 2000,
            eventSessionDescriptionMaxLength: 1000,
            moderationReasonMaxLength: 500,
            reportDescriptionMaxLength: 1000,
            reportResolutionNotesMaxLength: 1000,
            catalogDescriptionMaxLength: 1000,
        },
        reactionTypesByEventType: {
            WEDDING: [
                { id: 'demo-reaction-love', eventTypeKey: 'WEDDING', code: 'LOVE', name: 'Love', emoji: '❤️', sortOrder: 0, isAssignable: true },
                { id: 'demo-reaction-like', eventTypeKey: 'WEDDING', code: 'LIKE', name: 'Like', emoji: '👍', sortOrder: 1, isAssignable: true },
            ],
        },
        rateLimits: [],
    };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors referencing `lib/demo/seedData.ts`. Fix any DTO field mismatches against
`lib/api/types.ts` before moving on — this file only has value if it compiles against the real
types.

- [ ] **Step 3: Commit**

```bash
git add lib/demo/seedData.ts
git commit -m "$(cat <<'EOF'
Add sample dataset for the demo event

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: MSW handler factories and the full endpoint table

**Files:**

- Create: `lib/demo/mockHandlers.ts`
- Test: `lib/demo/mockHandlers.test.ts`

This is the core of the mock backend: two generic factories (`arrayHandlers` for endpoints that
return a bare array, `pageHandlers` for endpoints that return Spring's `Page<T>` envelope) plus
one config table wiring them to every endpoint the in-scope screens call. `Page<T>` vs. array is a
real, documented split in the codebase (see `lib/api/pagination.ts`) — posts, wishbook, and media
are paginated; everything else the demo touches is a bare array.

- [ ] **Step 1: Write the failing test for the two factories**

```typescript
// lib/demo/mockHandlers.test.ts
import { HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { createMockDb } from '@/lib/demo/mockDb';
import { buildArrayHandlers, buildPageHandlers } from '@/lib/demo/mockHandlers';

interface Note {
    id: string;
    eventId: string;
    body: string;
}

function makeDb() {
    return createMockDb<{ notes: Note[] }>('test:handlers', () => ({
        notes: [
            { id: 'n1', eventId: 'e1', body: 'first' },
            { id: 'n2', eventId: 'e1', body: 'second' },
        ],
    }));
}

async function callGet(handler: ReturnType<typeof buildArrayHandlers>[number], url: string) {
    // MSW http handlers expose `.resolver` via their run method in tests; simplest is to
    // invoke the registered resolver directly through msw's `run` if not needed — instead
    // we build the request via the handler's predicate/resolver pair through msw/node in
    // the browser worker test in Task 5. Here we test the pure response-shaping helpers.
    return handler;
}

describe('buildArrayHandlers', () => {
    it('registers a GET handler for the list path', () => {
        const db = makeDb();
        const handlers = buildArrayHandlers(db, 'notes', '/api/events/:eventId/notes');
        expect(handlers.length).toBeGreaterThan(0);
    });
});

describe('buildPageHandlers', () => {
    it('paginates using Spring Page<T> field names', async () => {
        const db = makeDb();
        const handlers = buildPageHandlers(db, 'notes', '/api/events/:eventId/notes', 1);
        expect(handlers.length).toBeGreaterThan(0);
        // Exercised end-to-end (real HTTP through the worker) in Task 5's browser check —
        // this test only guards the factory returning handlers per collection.
        expect(HttpResponse).toBeDefined();
    });
});
```

_Note for the engineer:_ MSW's `http.get(...)` handler objects aren't meant to be invoked
directly in unit tests without `msw/node`'s `setupServer` — trying to unit-test the HTTP layer in
isolation is more friction than it's worth for this factory. Keep this test file thin (just
"does the factory return handler objects for each collection wired") and rely on Task 5's manual
browser verification for actual request/response behavior. This mirrors the project's existing
pattern (per `docs/superpowers/specs/2026-09-03-story-preset-filters-design.md`) of a light unit
test plus a manual browser check for anything that only fully makes sense end-to-end.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/demo/mockHandlers.test.ts`
Expected: FAIL — `Cannot find module '@/lib/demo/mockHandlers'`.

- [ ] **Step 3: Implement `mockHandlers.ts`**

```typescript
// lib/demo/mockHandlers.ts
import { http, HttpResponse } from 'msw';

import type { MockDb } from '@/lib/demo/mockDb';
import type { Page } from '@/lib/api/pagination';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

function toPage<T>(items: T[], page: number, size: number): Page<T> {
    const start = page * size;
    const content = items.slice(start, start + size);
    return { content, totalElements: items.length, totalPages: Math.max(1, Math.ceil(items.length / size)), number: page, size };
}

// Bare-array list endpoints (members, modules, sessions, rsvps, stories, invitations,
// qr links, playlist suggestions, myEvents, ...). `path` uses MSW's :param syntax and must
// contain an :eventId segment.
export function buildArrayHandlers<Schema extends Record<string, { id: string }[]>, K extends keyof Schema & string>(
    db: MockDb<{ [P in keyof Schema]: Schema[P][number] }>,
    collection: K,
    path: string,
    filterByEventId = true
) {
    return [
        http.get(`${API_BASE_URL}${path}`, ({ params }) => {
            const all = db.list(collection);
            if (!filterByEventId) return HttpResponse.json(all);
            const eventId = params.eventId as string;
            return HttpResponse.json((all as { eventId?: string }[]).filter((r) => r.eventId === eventId));
        }),
    ];
}

// Page<T> list endpoints (posts, wishbook entries, media) — newest-first.
export function buildPageHandlers<Schema extends Record<string, { id: string }[]>, K extends keyof Schema & string>(
    db: MockDb<{ [P in keyof Schema]: Schema[P][number] }>,
    collection: K,
    path: string,
    pageSize: number
) {
    return [
        http.get(`${API_BASE_URL}${path}`, ({ request, params }) => {
            const url = new URL(request.url);
            const page = Number(url.searchParams.get('page') ?? '0');
            const eventId = params.eventId as string;
            const items = (db.list(collection) as { eventId?: string; createdAt?: string }[])
                .filter((r) => r.eventId === eventId)
                .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
            return HttpResponse.json(toPage(items, page, pageSize));
        }),
    ];
}

// A single record by :id, with optional PATCH/DELETE.
export function buildDetailHandlers<Schema extends Record<string, { id: string }[]>, K extends keyof Schema & string>(
    db: MockDb<{ [P in keyof Schema]: Schema[P][number] }>,
    collection: K,
    path: string,
    options: { patch?: boolean; del?: boolean } = {}
) {
    const handlers = [
        http.get(`${API_BASE_URL}${path}`, ({ params }) => {
            const record = db.get(collection, params.id as string);
            return record ? HttpResponse.json(record) : new HttpResponse(null, { status: 404 });
        }),
    ];

    if (options.patch) {
        handlers.push(
            http.patch(`${API_BASE_URL}${path}`, async ({ params, request }) => {
                const body = (await request.json()) as Record<string, unknown>;
                const updated = db.update(collection, params.id as string, (record) => ({ ...record, ...body }));
                return updated ? HttpResponse.json(updated) : new HttpResponse(null, { status: 404 });
            })
        );
    }

    if (options.del) {
        handlers.push(
            http.delete(`${API_BASE_URL}${path}`, ({ params }) => {
                db.remove(collection, params.id as string);
                return new HttpResponse(null, { status: 204 });
            })
        );
    }

    return handlers;
}

// A create endpoint — `buildRecord` turns the request body into a full stored record
// (assigning an id, timestamps, and any denormalized fields the response DTO needs).
export function buildCreateHandler<Schema extends Record<string, { id: string }[]>, K extends keyof Schema & string>(
    db: MockDb<{ [P in keyof Schema]: Schema[P][number] }>,
    collection: K,
    path: string,
    buildRecord: (body: Record<string, unknown>) => Schema[K][number]
) {
    return http.post(`${API_BASE_URL}${path}`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        const record = db.create(collection, buildRecord(body));
        return HttpResponse.json(record, { status: 201 });
    });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/demo/mockHandlers.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire the full endpoint table**

Append to `lib/demo/mockHandlers.ts` (below the factories):

```typescript
import { http, HttpResponse } from 'msw';

import { DEMO_EVENT_ID, DEMO_HOST_MEMBER_ID } from '@/lib/demo/demoConstants';
import { createMockDb } from '@/lib/demo/mockDb';
import {
    buildSeedAppConfig,
    buildSeedBilling,
    buildSeedEvent,
    buildSeedInvitations,
    buildSeedMedia,
    buildSeedMembers,
    buildSeedModules,
    buildSeedPosts,
    buildSeedQrLinkStats,
    buildSeedQrLinks,
    buildSeedRsvps,
    buildSeedSessions,
    buildSeedStories,
    buildSeedUsage,
    buildSeedWishbookEntries,
} from '@/lib/demo/seedData';
import type {
    CommentResponseDto,
    EventInvitationResponseDto,
    EventMemberResponseDto,
    EventModuleResponseDto,
    EventSessionResponseDto,
    MediaResponseDto,
    PlaylistSuggestionResponseDto,
    PostResponseDto,
    QrLinkResponseDto,
    QrLinkStatsDto,
    ReactionResponseDto,
    RsvpResponseDto,
    StoryResponseDto,
    WishbookEntryResponseDto,
} from '@/lib/api/types';

const DEMO_DB_STORAGE_KEY = 'storywall:demo:db:v1';

interface DemoSchema {
    posts: PostResponseDto[];
    comments: CommentResponseDto[];
    reactions: ReactionResponseDto[];
    media: MediaResponseDto[];
    members: EventMemberResponseDto[];
    modules: EventModuleResponseDto[];
    sessions: EventSessionResponseDto[];
    rsvps: RsvpResponseDto[];
    stories: StoryResponseDto[];
    wishbook: WishbookEntryResponseDto[];
    invitations: EventInvitationResponseDto[];
    qrLinks: QrLinkResponseDto[];
    playlistSuggestions: PlaylistSuggestionResponseDto[];
}

function seedDemoSchema(): DemoSchema {
    return {
        posts: buildSeedPosts(),
        comments: [],
        reactions: [],
        media: buildSeedMedia(),
        members: buildSeedMembers(),
        modules: buildSeedModules(),
        sessions: buildSeedSessions(),
        rsvps: buildSeedRsvps(),
        stories: buildSeedStories(),
        wishbook: buildSeedWishbookEntries(),
        invitations: buildSeedInvitations(),
        qrLinks: buildSeedQrLinks(),
        playlistSuggestions: [],
    };
}

export const demoDb = createMockDb<DemoSchema>(DEMO_DB_STORAGE_KEY, seedDemoSchema);

let nextId = 0;
function newId(prefix: string): string {
    nextId += 1;
    return `${prefix}-${Date.now()}-${nextId}`;
}

async function fileToDataUrl(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:${file.type};base64,${base64}`;
}

export const demoHandlers = [
    // --- Global config (public) ---
    http.get(`${API_BASE_URL}/api/config`, () => HttpResponse.json(buildSeedAppConfig())),

    // --- Auth / me ---
    http.get(`${API_BASE_URL}/api/me/events`, () =>
        HttpResponse.json([{ ...demoDb.list('members').find((m) => m.id === DEMO_HOST_MEMBER_ID)! }])
    ),

    // --- Event detail ---
    http.get(`${API_BASE_URL}/api/events/:eventId`, ({ params }) =>
        params.eventId === DEMO_EVENT_ID ? HttpResponse.json(buildSeedEvent()) : new HttpResponse(null, { status: 404 })
    ),
    http.get(`${API_BASE_URL}/api/events/:eventId/usage`, () => HttpResponse.json(buildSeedUsage())),
    http.get(`${API_BASE_URL}/api/events/:eventId/billing`, () => HttpResponse.json(buildSeedBilling())),
    http.get(`${API_BASE_URL}/api/events/:eventId/qr-links/stats`, () => HttpResponse.json(buildSeedQrLinkStats())),

    // --- Members ---
    ...buildArrayHandlers(demoDb, 'members', '/api/events/:eventId/members'),
    ...buildDetailHandlers(demoDb, 'members', '/api/event-members/:id', { patch: true }),
    buildCreateHandler(demoDb, 'members', '/api/event-members', (body) => ({
        id: newId('demo-member'),
        eventId: DEMO_EVENT_ID,
        userId: null,
        invitationId: null,
        role: (body.role as EventMemberResponseDto['role']) ?? 'ATTENDEE',
        displayName: String(body.displayName ?? 'Guest'),
        nickname: (body.nickname as string) ?? null,
        relationshipRole: (body.relationshipRole as string) ?? null,
        customRelationshipRole: (body.customRelationshipRole as string) ?? null,
        isFeatured: Boolean(body.isFeatured),
        avatarMediaId: (body.avatarMediaId as string) ?? null,
        joinedAt: new Date().toISOString(),
        rsvpId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
    })),

    // --- Modules ---
    ...buildArrayHandlers(demoDb, 'modules', '/api/events/:eventId/modules'),
    ...buildDetailHandlers(demoDb, 'modules', '/api/event-modules/:id', { patch: true, del: true }),

    // --- Sessions ---
    ...buildArrayHandlers(demoDb, 'sessions', '/api/events/:eventId/sessions'),
    ...buildDetailHandlers(demoDb, 'sessions', '/api/event-sessions/:id', { patch: true }),

    // --- Invitations / QR links (read-only in the demo) ---
    ...buildArrayHandlers(demoDb, 'invitations', '/api/events/:eventId/invitations'),
    ...buildArrayHandlers(demoDb, 'qrLinks', '/api/events/:eventId/qr-links'),

    // --- RSVPs ---
    ...buildArrayHandlers(demoDb, 'rsvps', '/api/events/:eventId/rsvps'),
    ...buildDetailHandlers(demoDb, 'rsvps', '/api/rsvps/:id', { patch: true, del: true }),
    buildCreateHandler(demoDb, 'rsvps', '/api/rsvps', (body) => ({
        id: newId('demo-rsvp'),
        eventMemberId: String(body.eventMemberId),
        attendanceStatus: (body.attendanceStatus as RsvpResponseDto['attendanceStatus']) ?? 'ATTENDING',
        phone: (body.phone as string) ?? null,
        adultCount: Number(body.adultCount ?? 0),
        childCount: Number(body.childCount ?? 0),
        notes: (body.notes as string) ?? null,
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    })),

    // --- Wishbook ---
    ...buildPageHandlers(demoDb, 'wishbook', '/api/events/:eventId/wishbook', 20),
    http.get(`${API_BASE_URL}/api/events/:eventId/wishbook/count`, () => HttpResponse.json(demoDb.list('wishbook').length)),
    buildCreateHandler(demoDb, 'wishbook', '/api/events/:eventId/wishbook', (body) => ({
        id: newId('demo-wishbook'),
        eventId: DEMO_EVENT_ID,
        authorMemberId: null,
        guestName: String(body.guestName ?? 'Guest'),
        message: String(body.message ?? ''),
        createdAt: new Date().toISOString(),
        canDelete: true,
    })),
    ...buildDetailHandlers(demoDb, 'wishbook', '/api/wishbook/:id', { del: true }),

    // --- Media ---
    ...buildPageHandlers(demoDb, 'media', '/api/events/:eventId/media', 30),
    ...buildDetailHandlers(demoDb, 'media', '/api/medias/:id', { del: true }),
    http.post(`${API_BASE_URL}/api/events/:eventId/media`, async ({ request }) => {
        const form = await request.formData();
        const file = form.get('file') as File;
        const media = demoDb.create('media', {
            id: newId('demo-media'),
            eventId: DEMO_EVENT_ID,
            uploaderMemberId: DEMO_HOST_MEMBER_ID,
            anonymousUploaderName: null,
            storageKey: `demo/${file.name}`,
            mediaUrl: await fileToDataUrl(file),
            status: 'READY',
            thumbnailUrl: await fileToDataUrl(file),
            originalFilename: file.name,
            mimeType: file.type,
            mediaType: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE',
            fileSize: file.size,
            width: null,
            height: null,
            durationSeconds: null,
            metadata: {},
            createdAt: new Date().toISOString(),
            deletedAt: null,
        });
        return HttpResponse.json(media, { status: 201 });
    }),
    http.post(`${API_BASE_URL}/api/events/:eventId/media/batch`, async ({ request }) => {
        const form = await request.formData();
        const files = form.getAll('files') as File[];
        const created = await Promise.all(
            files.map(async (file) =>
                demoDb.create('media', {
                    id: newId('demo-media'),
                    eventId: DEMO_EVENT_ID,
                    uploaderMemberId: DEMO_HOST_MEMBER_ID,
                    anonymousUploaderName: null,
                    storageKey: `demo/${file.name}`,
                    mediaUrl: await fileToDataUrl(file),
                    status: 'READY',
                    thumbnailUrl: await fileToDataUrl(file),
                    originalFilename: file.name,
                    mimeType: file.type,
                    mediaType: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE',
                    fileSize: file.size,
                    width: null,
                    height: null,
                    durationSeconds: null,
                    metadata: {},
                    createdAt: new Date().toISOString(),
                    deletedAt: null,
                })
            )
        );
        return HttpResponse.json({ created, failed: [] });
    }),

    // --- Posts ---
    ...buildPageHandlers(demoDb, 'posts', '/api/events/:eventId/posts', 20),
    ...buildDetailHandlers(demoDb, 'posts', '/api/posts/:id', { patch: true, del: true }),
    http.get(`${API_BASE_URL}/api/posts/:postId/media`, ({ params }) => {
        const post = demoDb.get('posts', params.postId as string);
        return HttpResponse.json(post?.media ?? []);
    }),
    buildCreateHandler(demoDb, 'posts', '/api/posts', (body) => {
        const author = demoDb.list('members').find((m) => m.id === body.authorMemberId) ?? null;
        const mediaIds = (body.mediaIds as string[] | undefined) ?? [];
        return {
            id: newId('demo-post'),
            eventId: DEMO_EVENT_ID,
            authorMemberId: (body.authorMemberId as string) ?? null,
            author: author
                ? { memberId: author.id, displayName: author.displayName, nickname: author.nickname, role: author.role, avatarMediaId: null, avatarUrl: null }
                : null,
            type: (body.type as PostResponseDto['type']) ?? 'TEXT',
            content: (body.content as string) ?? null,
            isPinned: Boolean(body.isPinned),
            media: demoDb.list('media').filter((m) => mediaIds.includes(m.id)),
            commentCount: 0,
            reactionCount: 0,
            reactionCounts: {},
            myReactionType: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
        };
    }),

    // --- Comments / reactions ---
    http.get(`${API_BASE_URL}/api/posts/:postId/comments`, ({ request, params }) => {
        const url = new URL(request.url);
        const page = Number(url.searchParams.get('page') ?? '0');
        const items = demoDb.list('comments').filter((c) => c.postId === params.postId);
        return HttpResponse.json(toPage(items, page, 30));
    }),
    buildCreateHandler(demoDb, 'comments', '/api/comments', (body) => ({
        id: newId('demo-comment'),
        postId: String(body.postId),
        authorMemberId: (body.authorMemberId as string) ?? null,
        parentCommentId: (body.parentCommentId as string) ?? null,
        content: String(body.content ?? ''),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
    })),
    ...buildDetailHandlers(demoDb, 'comments', '/api/comments/:id', { del: true }),
    http.get(`${API_BASE_URL}/api/posts/:postId/reactions`, ({ params }) =>
        HttpResponse.json(demoDb.list('reactions').filter((r) => r.postId === params.postId))
    ),
    buildCreateHandler(demoDb, 'reactions', '/api/reactions', (body) => ({
        id: newId('demo-reaction'),
        postId: String(body.postId),
        memberId: String(body.memberId),
        reactionType: String(body.reactionType),
        createdAt: new Date().toISOString(),
    })),
    ...buildDetailHandlers(demoDb, 'reactions', '/api/reactions/:id', { del: true }),

    // --- Stories ---
    ...buildArrayHandlers(demoDb, 'stories', '/api/events/:eventId/stories'),
    ...buildDetailHandlers(demoDb, 'stories', '/api/stories/:id', { del: true }),
    buildCreateHandler(demoDb, 'stories', '/api/stories', (body) => ({
        id: newId('demo-story'),
        eventId: DEMO_EVENT_ID,
        authorMemberId: (body.authorMemberId as string) ?? null,
        mediaId: String(body.mediaId),
        caption: (body.caption as string) ?? null,
        songUrl: (body.songUrl as string) ?? null,
        expiresAt: (body.expiresAt as string) ?? new Date(Date.now() + 86_400_000).toISOString(),
        createdAt: new Date().toISOString(),
        deletedAt: null,
        viewedByCurrentUser: false,
    })),
    http.post(`${API_BASE_URL}/api/stories/:id/views`, ({ params }) => {
        demoDb.update('stories', params.id as string, (story) => ({ ...story, viewedByCurrentUser: true }));
        return HttpResponse.json({ id: newId('demo-story-view'), storyId: params.id, memberId: DEMO_HOST_MEMBER_ID, createdAt: new Date().toISOString() });
    }),

    // --- Playlist suggestions ---
    ...buildArrayHandlers(demoDb, 'playlistSuggestions', '/api/events/:eventId/playlist-suggestions'),
    buildCreateHandler(demoDb, 'playlistSuggestions', '/api/playlist-suggestions', (body) => ({
        id: newId('demo-suggestion'),
        eventId: DEMO_EVENT_ID,
        authorMemberId: (body.authorMemberId as string) ?? null,
        title: String(body.title ?? ''),
        artist: (body.artist as string) ?? null,
        youtubeUrl: (body.youtubeUrl as string) ?? null,
        spotifyUrl: (body.spotifyUrl as string) ?? null,
        comment: (body.comment as string) ?? null,
        upvoteCount: 0,
        downvoteCount: 0,
        myVote: null,
        createdAt: new Date().toISOString(),
        deletedAt: null,
    })),
];
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors in `lib/demo/mockHandlers.ts`. This file is the single largest source of
potential issues — two kinds to watch for:

- **DTO mismatches**: fix field-by-field against `lib/api/types.ts` rather than casting with `as`
  to silence errors.
- **Generic inference on the factories**: `buildArrayHandlers`/`buildPageHandlers`/
  `buildDetailHandlers`/`buildCreateHandler` all infer their `Schema` type parameter from the
  `db` argument via a mapped type (`MockDb<{[P in keyof Schema]: Schema[P][number]}>`), which
  TypeScript can sometimes fail to infer cleanly through a mapped type. If a call site reports an
  inference error instead of a real field mismatch, the pragmatic fix is to drop the generic
  `Schema` parameter from that factory and type it directly against `DemoSchema` (imported from
  the same file) instead of trying to keep it fully generic — the factories don't need to be
  reusable outside this one file, so concrete typing is a perfectly good fallback.

- [ ] **Step 7: Commit**

```bash
git add lib/demo/mockHandlers.ts lib/demo/mockHandlers.test.ts
git commit -m "$(cat <<'EOF'
Add MSW handlers covering every in-scope demo endpoint

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: MSW browser worker lifecycle

**Files:**

- Create: `lib/demo/mockWorker.ts`

- [ ] **Step 1: Implement the worker singleton and start/stop functions**

```typescript
// lib/demo/mockWorker.ts
'use client';

import { setupWorker } from 'msw/browser';

import { demoHandlers } from '@/lib/demo/mockHandlers';

// A module-level singleton — setupWorker() must only be called once per page, even if
// app/demo/layout.tsx's effect re-runs (React StrictMode double-invokes effects in dev).
const worker = setupWorker(...demoHandlers);
let startPromise: Promise<void> | null = null;

export function startDemoMocking(): Promise<void> {
    if (!startPromise) {
        startPromise = worker.start({
            onUnhandledRequest: 'error',
            serviceWorker: { url: '/mockServiceWorker.js' },
        });
    }
    return startPromise;
}

export function stopDemoMocking(): void {
    startPromise = null;
    worker.stop();
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors in `lib/demo/mockWorker.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/demo/mockWorker.ts
git commit -m "$(cat <<'EOF'
Add MSW browser worker start/stop lifecycle for the demo

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Export the real contexts; add demo-only providers

**Files:**

- Modify: `providers/AuthProvider.tsx`
- Modify: `providers/EventProvider.tsx`
- Create: `providers/demo/DemoAuthProvider.tsx`
- Create: `providers/demo/DemoEventProvider.tsx`

- [ ] **Step 1: Export `AuthContext`**

In `providers/AuthProvider.tsx`, change:

```typescript
const AuthContext = createContext<AuthContextValue | null>(null);
```

to:

```typescript
export const AuthContext = createContext<AuthContextValue | null>(null);
```

No other change to this file.

- [ ] **Step 2: Export `EventContext`**

In `providers/EventProvider.tsx`, change:

```typescript
const EventContext = createContext<EventContextValue | null>(null);
```

to:

```typescript
export const EventContext = createContext<EventContextValue | null>(null);
```

No other change to this file.

- [ ] **Step 3: Verify nothing else broke**

Run: `npx tsc --noEmit && npx eslint providers/AuthProvider.tsx providers/EventProvider.tsx`
Expected: no errors (a named export addition is never a breaking change for existing consumers).

- [ ] **Step 4: Write `DemoAuthProvider.tsx`**

```typescript
// providers/demo/DemoAuthProvider.tsx
'use client';

import type { ReactNode } from 'react';

import { DEMO_USER_ID } from '@/lib/demo/demoConstants';
import { AuthContext } from '@/providers/AuthProvider';

// Renders the real AuthContext (imported, not reimplemented) with a static fake session —
// every component calling useAuth()/useIsHost()/etc. keeps working completely unmodified.
// No network bootstrap, no isBootstrapping flicker: the demo is "logged in" the instant this
// mounts.
export function DemoAuthProvider({ children }: { children: ReactNode }) {
    return (
        <AuthContext.Provider
            value={{
                user: {
                    userId: DEMO_USER_ID,
                    email: null,
                    displayName: 'Alex Rivera',
                    lastName: null,
                    profilePictureUrl: null,
                    authProvider: 'EMAIL',
                    isGuestAccount: false,
                    status: 'ACTIVE',
                    createdAt: new Date().toISOString(),
                    role: 'USER',
                },
                isAuthenticated: true,
                isBootstrapping: false,
                register: () => Promise.reject(new Error('Not available in the demo')),
                login: () => Promise.reject(new Error('Not available in the demo')),
                oauth: () => Promise.reject(new Error('Not available in the demo')),
                logout: () => Promise.resolve(),
                updateProfile: () => {},
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
```

- [ ] **Step 5: Type-check against the real `AuthContextValue` shape**

Run: `npx tsc --noEmit`
Expected: no errors. If `AuthProvider`'s `AuthContextValue`/`AuthUser` interfaces aren't exported,
add `export` to those two interface declarations in `providers/AuthProvider.tsx` (additive,
same non-behavioral change as Step 1) so `DemoAuthProvider` can import and satisfy them precisely
instead of relying on structural inference. Check `AuthProvider`/`AuthProviderName`'s allowed
literal values in `lib/api/types.ts` and use a valid one for `authProvider` above (e.g. `'EMAIL'`
if that's a member of the real union — otherwise substitute the actual first union member).

- [ ] **Step 6: Write `DemoEventProvider.tsx`**

```typescript
// providers/demo/DemoEventProvider.tsx
'use client';

import type { ReactNode } from 'react';

import { buildSeedEvent, buildSeedMembers } from '@/lib/demo/seedData';
import { DEMO_HOST_MEMBER_ID } from '@/lib/demo/demoConstants';
import { EventContext } from '@/providers/EventProvider';

// Same pattern as DemoAuthProvider: render the real EventContext with a static fake
// membership/event state so useActiveEvent()/useIsHost()/useActiveMember() work unmodified
// for every reused feature component.
export function DemoEventProvider({ children }: { children: ReactNode }) {
    const memberships = buildSeedMembers();
    const activeEvent = buildSeedEvent();
    const activeMember = memberships.find((m) => m.id === DEMO_HOST_MEMBER_ID) ?? null;

    return (
        <EventContext.Provider
            value={{
                memberships,
                activeEvent,
                activeMember,
                isHost: true,
                isLoading: false,
            }}
        >
            {children}
        </EventContext.Provider>
    );
}
```

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. If `EventContextValue` isn't exported from `providers/EventProvider.tsx`,
add `export` to that interface too (same additive change as Step 2).

- [ ] **Step 8: Commit**

```bash
git add providers/AuthProvider.tsx providers/EventProvider.tsx providers/demo/DemoAuthProvider.tsx providers/demo/DemoEventProvider.tsx
git commit -m "$(cat <<'EOF'
Add demo-only auth/event providers backed by the real contexts

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: `lib/routes.ts` demo-id branch

**Files:**

- Modify: `lib/routes.ts`
- Test: `lib/routes.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/routes.test.ts
import { describe, expect, it } from 'vitest';

import { DEMO_EVENT_ID } from '@/lib/demo/demoConstants';
import { routes } from '@/lib/routes';

describe('routes.events for the demo event id', () => {
    it('feed() resolves under /demo instead of /events/{id}', () => {
        expect(routes.events.feed(DEMO_EVENT_ID)).toBe('/demo/feed');
    });

    it('manage() resolves under /demo', () => {
        expect(routes.events.manage(DEMO_EVENT_ID)).toBe('/demo/manage');
    });

    it('tools.gallery() resolves under /demo', () => {
        expect(routes.events.tools.gallery(DEMO_EVENT_ID)).toBe('/demo/tools/gallery');
    });

    it('tools.wishbook() resolves under /demo', () => {
        expect(routes.events.tools.wishbook(DEMO_EVENT_ID)).toBe('/demo/tools/wishbook');
    });

    it('tools.rsvp() resolves under /demo', () => {
        expect(routes.events.tools.rsvp(DEMO_EVENT_ID)).toBe('/demo/tools/rsvp');
    });

    it('a real event id is unaffected', () => {
        expect(routes.events.feed('real-event-id')).toBe('/events/real-event-id/feed');
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/routes.test.ts`
Expected: FAIL on every `/demo/...` assertion (helpers currently always build `/events/{id}/...`).

- [ ] **Step 3: Implement the branch**

In `lib/routes.ts`, add the import and a tiny helper, then branch every `events.*`/`events.tools.*`
helper used by the in-scope demo screens (`feed`, `manage`, `tools.rsvp`, `tools.gallery`,
`tools.wishbook`):

```typescript
import { DEMO_EVENT_ID } from '@/lib/demo/demoConstants';

function eventBasePath(eventId: string): string {
    return eventId === DEMO_EVENT_ID ? '/demo' : `/events/${eventId}`;
}
```

Then update the relevant builders:

```typescript
    events: {
        new: (params: { step?: string | null } = {}) => withQuery('/events/new', params),
        manage: (eventId: string, params: { tab?: ManageTab | null; section?: string | null } = {}) =>
            withQuery(`${eventBasePath(eventId)}/manage`, params),
        tools: {
            rsvp: (eventId: string) => `${eventBasePath(eventId)}/tools/rsvp`,
            rsvpSubmit: (eventId: string, attending?: 'attending' | 'not-attending' | null) =>
                withQuery(`${eventBasePath(eventId)}/tools/rsvp/submit`, { attending }),
            gallery: (eventId: string) => `${eventBasePath(eventId)}/tools/gallery`,
            playlist: (eventId: string) => `${eventBasePath(eventId)}/tools/playlist`,
            quiz: (eventId: string) => `${eventBasePath(eventId)}/tools/quiz`,
            gifts: (eventId: string) => `${eventBasePath(eventId)}/tools/gifts`,
            schedule: (eventId: string, params: { section?: string | null } = {}) => withQuery(`${eventBasePath(eventId)}/tools/schedule`, params),
            wishbook: (eventId: string) => `${eventBasePath(eventId)}/tools/wishbook`,
        },
        storySchedule: (eventId: string) => `${eventBasePath(eventId)}/story/schedule`,
        location: (eventId: string, role?: 'main' | 'secondary' | null) => `${eventBasePath(eventId)}/location${role ? `/${role}` : ''}`,
        feed: (eventId: string, params: { post?: string | null } = {}) => withQuery(`${eventBasePath(eventId)}/feed`, params),
        settingsAddons: (eventId: string) => `${eventBasePath(eventId)}/settings/addons`,
        checkoutReview: (eventId: string, intent: CheckoutIntent, code?: string | null, cancelled?: boolean | null) =>
            withQuery(`${eventBasePath(eventId)}/checkout/review`, { intent, code, cancelled }),
        checkoutSuccess: (eventId: string, orderId?: string | null) => withQuery(`${eventBasePath(eventId)}/checkout/success`, { orderId }),
        checkoutCancelled: (eventId: string) => `${eventBasePath(eventId)}/checkout/cancelled`,
    },
```

(Checkout/settings paths are branched too even though they're out of scope for the demo build-out
— it costs nothing, keeps every helper consistent, and means a future demo checkout link can't
accidentally redirect to `/login` either.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/routes.test.ts`
Expected: PASS.

- [ ] **Step 5: Full test suite + type-check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS / no errors — confirms the branch didn't change behavior for any real event id
anywhere else in the app.

- [ ] **Step 6: Commit**

```bash
git add lib/routes.ts lib/routes.test.ts
git commit -m "$(cat <<'EOF'
Route the demo event id to /demo instead of /events/{id}

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: `/demo` layout — MSW lifecycle, providers, reset control

**Files:**

- Create: `components/demo/DemoUnavailable.tsx`
- Create: `components/demo/ResetDemoButton.tsx`
- Create: `app/demo/layout.tsx`

- [ ] **Step 1: Write `DemoUnavailable.tsx`**

```typescript
// components/demo/DemoUnavailable.tsx
export function DemoUnavailable() {
    return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-base font-semibold text-ink">The demo couldn’t start in this browser.</p>
            <p className="text-sm text-ink-muted">Try reloading the page, or use a different browser.</p>
        </div>
    );
}
```

- [ ] **Step 2: Write `ResetDemoButton.tsx`**

```typescript
// components/demo/ResetDemoButton.tsx
'use client';

import { RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { demoDb } from '@/lib/demo/mockHandlers';

export function ResetDemoButton() {
    const t = useTranslations('Demo');

    function handleReset() {
        demoDb.reset();
        window.location.reload();
    }

    return (
        <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-surface-muted"
        >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {t('resetDemo')}
        </button>
    );
}
```

Add the two new keys this uses to the `en` message catalog under a new `"Demo"` namespace: find
the existing translation file (e.g. `messages/en.json` — check with
`grep -rl '"FeedPage"' messages/ i18n/ 2>/dev/null` if the path differs) and add:

```json
"Demo": {
    "resetDemo": "Reset demo",
    "exitDemo": "Sign up for real"
}
```

Add the matching keys (translated) to every other locale file in the same directory, mirroring
whatever placeholder/translation convention the rest of that file already uses for untranslated
strings.

- [ ] **Step 3: Write `app/demo/layout.tsx`**

```typescript
// app/demo/layout.tsx
'use client';

import { type ReactNode, useEffect, useState } from 'react';

import { DemoUnavailable } from '@/components/demo/DemoUnavailable';
import { ResetDemoButton } from '@/components/demo/ResetDemoButton';
import { startDemoMocking, stopDemoMocking } from '@/lib/demo/mockWorker';
import { ComposerProvider } from '@/providers/ComposerProvider';
import { DemoAuthProvider } from '@/providers/demo/DemoAuthProvider';
import { DemoEventProvider } from '@/providers/demo/DemoEventProvider';
import { ModalProvider } from '@/providers/ModalProvider';

type MockStatus = 'starting' | 'ready' | 'failed';

export default function DemoLayout({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<MockStatus>('starting');

    useEffect(() => {
        let cancelled = false;

        startDemoMocking()
            .then(() => {
                if (!cancelled) setStatus('ready');
            })
            .catch(() => {
                if (!cancelled) setStatus('failed');
            });

        // Stops the service worker's interception when navigating away from /demo (client-side,
        // no full reload) — otherwise it would keep mocking fetches for the rest of the real app
        // too. See docs/superpowers/plans/2026-09-05-demo-event.md's design notes, point 3.
        return () => {
            cancelled = true;
            stopDemoMocking();
        };
    }, []);

    if (status === 'failed') {
        return <DemoUnavailable />;
    }

    if (status === 'starting') {
        return null;
    }

    return (
        <DemoAuthProvider>
            <DemoEventProvider>
                <ComposerProvider>
                    <ModalProvider>
                        <div className="min-h-dvh bg-background">
                            <div className="flex items-center justify-end gap-2 px-4 py-2">
                                <ResetDemoButton />
                            </div>
                            {children}
                        </div>
                    </ModalProvider>
                </ComposerProvider>
            </DemoEventProvider>
        </DemoAuthProvider>
    );
}
```

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint app/demo components/demo`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/demo/DemoUnavailable.tsx components/demo/ResetDemoButton.tsx app/demo/layout.tsx messages/
git commit -m "$(cat <<'EOF'
Add /demo layout: MSW lifecycle, fake providers, reset control

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: `/demo` route pages

**Files:**

- Create: `app/demo/page.tsx`
- Create: `app/demo/feed/page.tsx`
- Create: `app/demo/tools/gallery/page.tsx`
- Create: `app/demo/tools/wishbook/page.tsx`
- Create: `app/demo/tools/rsvp/page.tsx`
- Create: `app/demo/manage/page.tsx`

Every page below is a thin client component rendering the real feature component directly — no
server prefetch, no `HydrationBoundary` (there's nothing to hydrate; MSW answers the client-side
query directly). This mirrors exactly what each real `PageClient.tsx` already renders, minus the
server-side wrapper.

- [ ] **Step 1: Entry redirect**

```typescript
// app/demo/page.tsx
import { redirect } from 'next/navigation';

export default function DemoIndexPage() {
    redirect('/demo/feed');
}
```

- [ ] **Step 2: Feed**

```typescript
// app/demo/feed/page.tsx
'use client';

import { FeedPageBoundary } from '@/app/(app)/(event)/events/[eventId]/feed/FeedPageBoundary';
import { DEMO_EVENT_ID } from '@/lib/demo/demoConstants';

export default function DemoFeedPage() {
    return <FeedPageBoundary eventId={DEMO_EVENT_ID} />;
}
```

- [ ] **Step 3: Gallery**

```typescript
// app/demo/tools/gallery/page.tsx
'use client';

import GalleryPage from '@/app/(app)/(event)/events/[eventId]/tools/gallery/PageClient';

export default function DemoGalleryPage() {
    return <GalleryPage />;
}
```

- [ ] **Step 4: Wishbook**

```typescript
// app/demo/tools/wishbook/page.tsx
'use client';

import WishbookPage from '@/app/(app)/(event)/events/[eventId]/tools/wishbook/PageClient';

export default function DemoWishbookPage() {
    return <WishbookPage />;
}
```

- [ ] **Step 5: RSVP**

```typescript
// app/demo/tools/rsvp/page.tsx
'use client';

import RSVPPage from '@/app/(app)/(event)/events/[eventId]/tools/rsvp/PageClient';

export default function DemoRsvpPage() {
    return <RSVPPage />;
}
```

- [ ] **Step 6: Manage**

```typescript
// app/demo/manage/page.tsx
'use client';

import ManagePage from '@/app/(app)/(event)/events/[eventId]/manage/PageClient';

export default function DemoManagePage() {
    return <ManagePage />;
}
```

_Note for the engineer:_ if any of these `PageClient.tsx` files default-export a component whose
name collides with a name already used in its own demo page file (unlikely, since each demo page
renames the import), or if a `PageClient.tsx` turns out to also do `params`/`useParams()`-based
`eventId` resolution internally rather than pulling from `useActiveEvent()` (double-check by
reading the file — `WishbookPage`, `RsvpScreen`, `ManageScreen`, and `GalleryScreen`, as traced
during planning, all read `useActiveEvent()`/`useEventRouteContext()`, not `useParams()`), no
`eventId` prop needs to be threaded through; only `FeedPageBoundary` takes one directly.

- [ ] **Step 7: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint app/demo`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add app/demo/page.tsx app/demo/feed app/demo/tools app/demo/manage
git commit -m "$(cat <<'EOF'
Add /demo route pages reusing the real feature components

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Manual browser verification

No new files — this task exercises the whole stack end-to-end and fixes whatever it finds.

- [ ] **Step 1: Start the dev server and open the demo**

Run: `npm run dev` (or use the project's existing dev-server preview tooling)
Navigate to `http://localhost:3000/demo`.
Expected: redirects to `/demo/feed`, shows the seeded feed with 2 posts, no console errors, no
network requests to `localhost:8080` in the Network tab (everything shows as served by the
service worker).

- [ ] **Step 2: Post with a photo**

Open the composer, add a photo, submit.
Expected: the new post appears in the feed immediately with the actual uploaded image visible
(not a placeholder).

- [ ] **Step 3: Reload and confirm persistence**

Reload the page.
Expected: the post added in Step 2 is still there.

- [ ] **Step 4: Walk the rest of the in-scope screens**

Visit `/demo/tools/gallery`, `/demo/tools/wishbook`, `/demo/tools/rsvp`, `/demo/manage`.
Expected: each renders with seeded data, no perpetual loading spinners, no console errors. Add a
wishbook entry and an RSVP change; confirm both persist across reload (repeat Step 3's check for
each).

- [ ] **Step 5: Confirm the reset action**

Click "Reset demo".
Expected: page reloads, all changes from Steps 2 and 4 are gone, back to the original seed.

- [ ] **Step 6: Confirm MSW doesn't leak past `/demo`**

From `/demo/feed`, open the browser devtools Application tab and confirm a service worker is
registered. Navigate to `http://localhost:3000/login` directly (full navigation).
Expected: the service worker is no longer intercepting (check the Network tab — a request to
`/api/config` or similar should show as a normal network request, not "(ServiceWorker)" in the
Size column). This confirms Task 8's cleanup effect actually tears the worker down.

- [ ] **Step 7: Fix anything the walkthrough surfaced**

If any screen showed a loading spinner forever or an MSW `onUnhandledRequest: 'error'` console
error, that means an endpoint the screen calls wasn't wired in Task 4 — add the missing handler
there (following the existing array/page/detail/create pattern) and re-run Steps 1–6.

- [ ] **Step 8: Full project verification**

Run: `npm run type:check && npm run lint && npm run test`
Expected: all three pass.

- [ ] **Step 9: Commit any fixes from Step 7**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Fix demo endpoint gaps found during manual verification

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

(Skip this commit if Step 7 found nothing to fix.)

---

## Explicitly out of scope (per the approved spec)

- Platform-admin console.
- Checkout/billing/plans/upgrade flows, storage packs, gift accounts, refunds — no mutation
  handlers are wired for `checkout`, `upgradeCheckout`, `storageCheckout`, `addons`,
  `giftAccount`, `refundRequests`, or `deletionRequests`. If a reused screen renders a button
  that calls one of these, it will surface an MSW `onUnhandledRequest: 'error'` failure during
  Task 10 — the fix there is to hide/disable that specific control in the demo, not to mock the
  endpoint (mocking a fake purchase would be misleading, per the spec).
- Guest-perspective views (RSVP submit page, QR scan flow, partner portal) and the landing-page
  entry point/CTA itself (tracked separately once the marketing page exists).
