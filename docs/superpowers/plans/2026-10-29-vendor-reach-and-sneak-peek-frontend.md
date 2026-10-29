# Vendor reach report and sneak peek — frontend implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give photographers and videographers a Sneak peek section on their vendor page to share up to 20 Pro items once per event, show it pinned in the feed with a "Sneak peek" label, record one view per guest of vendor work, and show every vendor a Reach section (short, or full for partners), plus reach totals in the partner portal.

**Architecture:** Pure rules live in `lib/sneakPeek.ts` (section state, picking), `lib/vendorReach.ts` (which tiles) and `lib/contentViews.ts` (the view queue). Data hooks: `hooks/useSneakPeek.ts` (mutations), `hooks/useVendorReach.ts` (query + exported keys for the prefetch), `hooks/useContentViews.ts` (one queue per tab, flushed every 10 s and on hide) and `hooks/useVendorPostViewTracking.ts` (50% for 1 s). The vendor page gets `SneakPeekSection` and `ReachSection`, each driven by its own section hook. The feed reuses `PostCard`: a sneak peek is a post with a label, like an announcement.

**Tech Stack:** Next.js App Router, React Query (server prefetch + `HydrationBoundary`), next-intl (`messages/en.json`, `messages/el.json`), Tailwind, Vitest + Testing Library.

**Spec:** [2026-10-29-vendor-reach-and-sneak-peek-design.md](../specs/2026-10-29-vendor-reach-and-sneak-peek-design.md). Backend plan: [2026-10-29-vendor-reach-and-sneak-peek-backend.md](2026-10-29-vendor-reach-and-sneak-peek-backend.md). Tasks 1–11 build and test against mocks; Task 12's visual check needs the backend branch running locally.

---

## Where and how

- Repository: `C:\Users\User\WebstormProjects\storywall`. Work in a worktree cut from the latest `staging` on branch `feat/vendor-reach-and-sneak-peek`. The PR goes into `staging`.
- `node_modules`: link the worktree's to the main checkout's with a junction when the lockfiles match (`fc package-lock.json ..\..\..\package-lock.json` reports no differences, then `cmd /c mklink /J node_modules ..\..\..\node_modules` from the worktree root).
- Checks: `npx vitest run <path>` for one file, `npm test` for all, `npm run lint`, `npx tsc --noEmit`.
- Visual checks: never `preview_start {name}` (it breaks the shared `.next`). Run `npm run dev` from the worktree on port 3000 in a terminal and open `preview_start {url: "http://localhost:3000/"}`. The local Spring backend only allows CORS from :3000. Signed-in screens need the user's local test login: ask for it.
- Commit after every task. Messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not push or open a PR until the user says so.
- Repo `CLAUDE.md` rules that bite here: hooks own logic, components stay declarative; a JSX comment above every visual section; every visible string and every alt text localized in en and el (Greek: συντελεστής for vendor, συνεργάτης for partner, «Πρώτη ματιά» for sneak peek); `React.SubmitEvent` for form submits; one home per fact; edit flows in a sheet; destructive actions behind `ConfirmActionModal`; mobile-first for vendor and guest screens; server prefetch for route-derivable data.

## Numbers that come from the backend

Error numbers are the backend plan's; if the backend took other numbers, use those: `SNEAK_PEEK_MEDIA_INVALID` 3112, `SNEAK_PEEK_NOT_OPEN` 5187, `SNEAK_PEEK_USED` 5188.

## Decisions this plan settles

1. **No `SneakPeekCard`.** `PostCard` already shows up to four thumbnails with "+N", the vendor chip, reactions, comments and the full-screen viewer (with the Pro credit). A sneak peek is a `PostCard` with a `SneakPeekLabel` and the same tint as an announcement. The spec's `components/feed/post/SneakPeekCard.tsx` becomes `components/feed/post/SneakPeekLabel.tsx`.
2. **No `SneakPeekDeleteModal`.** The delete confirmation is the shared `ConfirmActionModal`, mounted in `VendorMeScreen` next to the services one.
3. **Section states** (`lib/sneakPeek.ts`): `hidden` (type without the sneak peek, the posts or gallery module unreadable, or tools closed and nothing posted), `notOpen` (before the event's start), `noItems` (no ready Pro item of their own), `ready`, `posted` (thumbnails, Edit, Delete, a link to the feed), `postedClosed` (access ended: only the link), `used` (deleted earlier; one line). The top-of-page access line already explains closed tools, so the section adds nothing for that.
4. **The edit sheet starts from `me.sneakPeek`** (ids and caption; the backend plan's `SneakPeekSummaryDto` carries the caption for this). It sends only what changed: `mediaIds` when the picks changed, `content` when the caption changed (an empty caption sends `""`, which clears it).
5. **Picking order is tap order.** Tapping a picked item removes it; a 21st tap does nothing and the counter shows "20 of 20".
6. **The Pro items to pick from** are the vendor's own ready Pro items from the same paged Pro query the Pro album uses (`useEventMedia(eventId, 'PRO')`, filtered by uploader), so the prefetched first page serves both. "Show more" loads the next page.
7. **Views are recorded only where the server would count them**: Pro items not uploaded by the caller, and posts whose author has a `vendorType`, never by a host. The server checks again; the client check only saves requests.
8. **One view queue per tab** (`hooks/useContentViews.ts`, module state). It drops ids already queued or sent in this tab, flushes every 10 s, and flushes with `keepalive` when the page hides. A failed flush is dropped, never retried and never shown.
9. **Reach tiles** show exactly the numbers the backend sent; `partnerCardTaps` is hidden at 0. Order: guests, Pro viewers, Pro views, post viewers, reactions, comments, list taps, partner card taps. Non-partners get the two tiles and one line "Partners see the full report.", with "Become a partner" while `showPartnerPrompt` is true (the spec's rule; the bottom `PartnerPromptCard` stays as it is).
10. **`vendorReachKeys.me(eventId)` is `['events', eventId, 'vendors', 'reach']`**, not under `vendorKeys.me`, so a vendor patch that invalidates `me` does not refetch the reach.
11. **Portal rows** show date, type, guests and views in a compact table, like the totals table above it. No titles, no links (user decision 2026-10-29, KAN-28).

## File structure

New:

| File | Responsibility |
| --- | --- |
| `lib/sneakPeek.ts` (+ `.test.ts`) | Section state, own candidates, pick toggling, patch diff |
| `lib/vendorReach.ts` (+ `.test.ts`) | Which reach tiles, number formatting |
| `lib/contentViews.ts` (+ `.test.ts`) | The view queue (dedupe, batches of 50), countable rules |
| `hooks/useSneakPeek.ts` (+ `.test.tsx`) | Create, update, delete; refresh `me` and the feed |
| `hooks/useVendorReach.ts` (+ `.test.tsx`) | `vendorReachKeys`, the reach query |
| `hooks/useContentViews.ts` (+ `.test.tsx`) | The tab's queue and timers; `useRecordProMediaView` |
| `hooks/useVendorPostViewTracking.ts` (+ `.test.tsx`) | 50% on screen for 1 s |
| `hooks/useSneakPeekSection.ts` | The vendor page's Sneak peek section |
| `hooks/useSneakPeekSheet.ts` | The sheet's picks and caption |
| `hooks/useReachSection.ts` | The vendor page's Reach section |
| `components/vendors/me/SneakPeekSection.tsx` (+ `.test.tsx`) | Section states |
| `components/vendors/me/SneakPeekSheet.tsx` (+ `.test.tsx`) | Pick 1–20 items, caption, share or save |
| `components/vendors/me/ReachSection.tsx` (+ `.test.tsx`) | Tiles and the partner line |
| `components/feed/post/SneakPeekLabel.tsx` | "Sneak peek" label on the card |
| `components/partners/PartnerReachSection.tsx` (+ `.test.tsx`) | Portal reach tiles and rows |

Changed: `lib/api/types.ts`, `lib/api/endpoints.ts`, `lib/api/errors.ts`, `lib/api/errorMessageKeys.ts`, `lib/vendors.ts`, `lib/notifications.ts`, `components/feed/post/postUtils.ts`, `components/feed/PostCard.tsx`, `components/feed/post/PostMediaViewer.tsx`, `components/gallery/GalleryViewer.tsx`, `components/vendors/me/VendorMeScreen.tsx`, `components/partners/PartnerPortalBoundary.tsx`, the vendor-me `page.tsx` (+ `page.test.tsx`), `messages/en.json`, `messages/el.json`.

---

### Task 1: Types, endpoints, error codes, capability, notification route

**Files:**
- Modify: `lib/api/types.ts`, `lib/api/endpoints.ts`, `lib/api/errors.ts`, `lib/api/errorMessageKeys.ts`, `lib/vendors.ts`, `lib/notifications.ts`, `messages/en.json`, `messages/el.json`
- Test: `lib/notifications.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `lib/notifications.test.ts` (create it if missing, with the imports below):

```ts
import { describe, expect, it } from 'vitest';

import type { NotificationResponseDto } from '@/lib/api/types';
import { notificationCtaRoute } from '@/lib/notifications';

describe('EVENT_POST', () => {
    it('opens the post over the feed', () => {
        const notification = {
            id: 'n1',
            recipientMemberId: 'm1',
            type: 'SNEAK_PEEK_POSTED',
            ctaTarget: 'EVENT_POST',
            ctaParams: { eventId: 'e1', postId: 'p1' },
        } as NotificationResponseDto;
        expect(notificationCtaRoute(notification)).toBe('/events/e1/feed?post=p1');
    });
});
```

If `lib/notifications.test.ts` already exists, only add the `describe` block and any missing import.

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run lib/notifications.test.ts`
Expected: FAIL (TypeScript: `'EVENT_POST'` not assignable; or `null` returned).

- [ ] **Step 3: Add the types**

`lib/api/types.ts`:

Replace the `PostType` line and its comment:

```ts
// Post.type is enforced server-side against this exact set (DB CHECK constraint
// + matching DTO validation) — not a free-string convention like the others.
// SNEAK_PEEK is made only through the vendor's sneak-peek endpoint, never POST /api/posts.
export type PostType = 'TEXT' | 'MEDIA' | 'ANNOUNCEMENT' | 'PLAYLIST' | 'SNEAK_PEEK';
```

Replace the `NotificationCtaTarget` union:

```ts
export type NotificationCtaTarget =
    | 'EVENT_PLAN_SETTINGS'
    | 'EVENT_GALLERY'
    | 'EVENT_GUESTS'
    | 'EVENT_COVERAGE_EXTEND'
    | 'EVENT_WISHBOOK'
    | 'EVENT_VENDORS'
    | 'EVENT_VENDOR_PAGE'
    // One post over the feed, { eventId, postId } (sneak peek, 2026-10-29).
    | 'EVENT_POST';
```

Replace the `VendorCapability` line:

```ts
export type VendorCapability = 'PRO_ALBUM' | 'SCHEDULE_EDIT' | 'ANNOUNCE' | 'RSVP_REPORT' | 'QR_READ' | 'SONG_REQUESTS' | 'PRINT_PICKS' | 'SNEAK_PEEK';
```

In `VendorMeDto`, after `approvedPartner: boolean;`:

```ts
    // Null for types without the sneak peek (spec 2026-10-29).
    sneakPeek: SneakPeekSummaryDto | null;
```

After `VendorMeDto`:

```ts
// One sneak peek per vendor per event. `used` stays true after a delete (postId and content null, mediaIds empty).
export interface SneakPeekSummaryDto {
    postId: string | null;
    mediaIds: string[];
    content: string | null;
    used: boolean;
}

// POST …/vendors/me/sneak-peek: 1–20 of the vendor's own ready Pro items, in display order.
export interface SneakPeekRequestDto {
    mediaIds: string[];
    content?: string | null;
}

// PATCH …/vendors/me/sneak-peek: an absent field is unchanged; content "" clears the caption.
export interface SneakPeekPatchDto {
    mediaIds?: string[];
    content?: string;
}

// GET …/vendors/me/reach. Every vendor gets guests and listTaps; the optional fields come only for partners,
// and the Pro ones only for types with a Pro album. partnerCardTaps is 0 when their card never ran here.
export interface VendorReachDto {
    guests: number;
    listTaps: number;
    proViewers?: number;
    proViews?: number;
    postViewers?: number;
    reactions?: number;
    comments?: number;
    partnerCardTaps?: number;
    partner: boolean;
}

// POST /api/events/{eventId}/views. Each list at most 50. Always 204 for members.
export interface ContentViewsRequestDto {
    mediaIds: string[];
    postIds: string[];
}
```

Replace `PartnerPortalResponseDto` and add the reach types after it:

```ts
export interface PartnerPortalResponseDto {
    name: string;
    eventsReferred: number;
    totals: PartnerPortalTotalDto[];
    // Null when the partner has no tiered schedule (2026-10-08).
    tierProgress: PartnerTierProgressDto | null;
    // Every tap on the partner's feed cards, across all events (2026-10-08).
    brandingClicks: number;
    // Across every event where the partner's account was a vendor (2026-10-29). Never null.
    reach: PartnerPortalReachDto;
}
// No titles or ids: the portal opens with the link alone (KAN-28).
export interface PartnerPortalReachEventDto {
    startAt: string;
    vendorType: PartnerRole;
    guests: number;
    // Pro item views plus post views.
    views: number;
}
export interface PartnerPortalReachDto {
    events: number;
    guests: number;
    proViews: number;
    postViewers: number;
    listTaps: number;
    // The 10 most recent, newest first.
    recent: PartnerPortalReachEventDto[];
}
```

- [ ] **Step 4: Endpoints, errors, capability, route**

`lib/api/endpoints.ts`, after `vendorPrintsIncluded`:

```ts
        vendorSneakPeek: (eventId: string) => `/api/events/${eventId}/vendors/me/sneak-peek`,
        vendorReach: (eventId: string) => `/api/events/${eventId}/vendors/me/reach`,
        contentViews: (eventId: string) => `/api/events/${eventId}/views`,
```

`lib/api/errors.ts`, in `ERROR_CODES`, after `QR_CARD_ARTWORK_SIZE_INVALID: 3111,` and after `PUSH_NOT_ENABLED: 5186,` respectively:

```ts
    SNEAK_PEEK_MEDIA_INVALID: 3112,
```

```ts
    SNEAK_PEEK_NOT_OPEN: 5187,
    SNEAK_PEEK_USED: 5188,
```

`lib/api/errorMessageKeys.ts`, after `[ERROR_CODES.PUSH_NOT_ENABLED]: 'pushNotEnabled',`:

```ts
    [ERROR_CODES.SNEAK_PEEK_MEDIA_INVALID]: 'sneakPeekMediaInvalid',
    [ERROR_CODES.SNEAK_PEEK_NOT_OPEN]: 'sneakPeekNotOpen',
    [ERROR_CODES.SNEAK_PEEK_USED]: 'sneakPeekUsed',
```

`lib/vendors.ts`, in `CAPABILITY_TYPES`, after `PRINT_PICKS`:

```ts
    SNEAK_PEEK: ['PHOTOGRAPHER', 'VIDEOGRAPHER'],
```

`lib/notifications.ts`, in `CTA_ROUTES`, after `EVENT_VENDOR_PAGE`:

```ts
    EVENT_POST: (p) => routes.events.feed(p.eventId, { post: p.postId }),
```

`messages/en.json`, in `ApiErrors`:

```json
"sneakPeekMediaInvalid": "Pick from your own Pro photos and videos.",
"sneakPeekNotOpen": "You can share a sneak peek once the event starts.",
"sneakPeekUsed": "You already shared your sneak peek for this event."
```

`messages/el.json`, in `ApiErrors`:

```json
"sneakPeekMediaInvalid": "Επιλέξτε από τις δικές σας Pro φωτογραφίες και βίντεο.",
"sneakPeekNotOpen": "Μπορείτε να μοιραστείτε μια πρώτη ματιά μόλις ξεκινήσει η εκδήλωση.",
"sneakPeekUsed": "Έχετε ήδη μοιραστεί την πρώτη ματιά για αυτή την εκδήλωση."
```

If `errorMessageKeys` has a test asserting every `ERROR_CODES` entry has a message key (look for it next to the file), it now passes with the three entries above.

- [ ] **Step 5: Fix the `VendorMeDto` fixtures**

Run: `npx tsc --noEmit`
Expected: errors only in test fixtures and mocks that build a full `VendorMeDto` (missing `sneakPeek`). Add `sneakPeek: null` to each. Fixtures built with `as VendorMeDto` or `Partial<…>` need no change. The `PartnerPortalResponseDto` fixtures in `components/partners` tests (if any) get `reach: { events: 0, guests: 0, proViews: 0, postViewers: 0, listTaps: 0, recent: [] }`.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run lib/notifications.test.ts lib/api lib/vendors.test.ts` and `npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add lib messages components app hooks
git commit -m "feat(vendors): sneak peek and reach types, endpoints, errors, post route

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The rules — `lib/sneakPeek.ts` and `lib/vendorReach.ts`

**Files:**
- Create: `lib/sneakPeek.ts`, `lib/sneakPeek.test.ts`, `lib/vendorReach.ts`, `lib/vendorReach.test.ts`

- [ ] **Step 1: Write the failing tests**

`lib/sneakPeek.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import type { MediaResponseDto, VendorMeDto } from '@/lib/api/types';
import { SNEAK_PEEK_MAX_ITEMS, sneakPeekCandidates, sneakPeekPatch, sneakPeekState, toggleSneakPeekPick } from '@/lib/sneakPeek';

const START = '2026-11-01T16:00:00Z';
const AFTER = new Date('2026-11-01T18:00:00Z');
const BEFORE = new Date('2026-11-01T12:00:00Z');

function me(overrides: Partial<VendorMeDto> = {}): VendorMeDto {
    return {
        vendorId: 'v1',
        vendorType: 'PHOTOGRAPHER',
        capabilities: ['PRO_ALBUM', 'SNEAK_PEEK'],
        accessEndsAt: '2026-12-01T00:00:00Z',
        accessOpen: true,
        profileComplete: true,
        showPartnerPrompt: false,
        proStorageBytes: 0,
        proUsedBytes: 0,
        optedOut: false,
        hiddenByHost: false,
        toolsOff: null,
        approvedPartner: false,
        sneakPeek: { postId: null, mediaIds: [], content: null, used: false },
        ...overrides,
    };
}

const closed = { accessOpen: false, capabilities: [], toolsOff: 'ACCESS_ENDED' as const };
const posted = { postId: 'p1', mediaIds: ['m1'], content: 'Hi', used: true };
const deleted = { postId: null, mediaIds: [], content: null, used: true };

describe('sneakPeekState', () => {
    it('is hidden without the sneak peek', () => {
        expect(sneakPeekState(null, START, true, AFTER)).toBe('hidden');
        expect(sneakPeekState(me({ sneakPeek: null }), START, true, AFTER)).toBe('hidden');
    });

    it('waits for the event to start', () => {
        expect(sneakPeekState(me(), START, true, BEFORE)).toBe('notOpen');
    });

    it('needs an own Pro item, then is ready', () => {
        expect(sneakPeekState(me(), START, false, AFTER)).toBe('noItems');
        expect(sneakPeekState(me(), START, true, AFTER)).toBe('ready');
    });

    it('shows a posted one, editable while the tools are open', () => {
        expect(sneakPeekState(me({ sneakPeek: posted }), START, true, AFTER)).toBe('posted');
        expect(sneakPeekState(me({ ...closed, sneakPeek: posted }), START, true, AFTER)).toBe('postedClosed');
    });

    it('says it was used, and hides once the tools close', () => {
        expect(sneakPeekState(me({ sneakPeek: deleted }), START, true, AFTER)).toBe('used');
        expect(sneakPeekState(me({ ...closed, sneakPeek: deleted }), START, true, AFTER)).toBe('hidden');
        expect(sneakPeekState(me(closed), START, true, AFTER)).toBe('hidden');
    });
});

describe('sneakPeekCandidates', () => {
    const item = (id: string, overrides: Partial<MediaResponseDto>) => ({ id, uploaderMemberId: 'me', status: 'READY', collection: 'PRO', ...overrides }) as MediaResponseDto;

    it("keeps the caller's own ready Pro items", () => {
        const items = [item('a', {}), item('b', { uploaderMemberId: 'other' }), item('c', { status: 'PROCESSING' }), item('d', { collection: 'GUEST' })];
        expect(sneakPeekCandidates(items, 'me').map((m) => m.id)).toEqual(['a']);
        expect(sneakPeekCandidates(items, null)).toEqual([]);
    });
});

describe('toggleSneakPeekPick', () => {
    it('adds in tap order, removes on a second tap, stops at the limit', () => {
        expect(toggleSneakPeekPick(['a'], 'b')).toEqual(['a', 'b']);
        expect(toggleSneakPeekPick(['a', 'b'], 'a')).toEqual(['b']);
        const full = Array.from({ length: SNEAK_PEEK_MAX_ITEMS }, (_, i) => `m${i}`);
        expect(toggleSneakPeekPick(full, 'extra')).toEqual(full);
    });
});

describe('sneakPeekPatch', () => {
    it('sends only what changed', () => {
        const initial = { mediaIds: ['a', 'b'], content: 'Hi' };
        expect(sneakPeekPatch(initial, { mediaIds: ['a', 'b'], content: 'Hi' })).toBeNull();
        expect(sneakPeekPatch(initial, { mediaIds: ['b', 'a'], content: 'Hi' })).toEqual({ mediaIds: ['b', 'a'] });
        expect(sneakPeekPatch(initial, { mediaIds: ['a', 'b'], content: '  ' })).toEqual({ content: '' });
        expect(sneakPeekPatch({ mediaIds: ['a'], content: null }, { mediaIds: ['a'], content: 'New' })).toEqual({ content: 'New' });
    });
});
```

`lib/vendorReach.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { formatReachCount, reachTiles } from '@/lib/vendorReach';

describe('reachTiles', () => {
    it('shows a non-partner guests and list taps', () => {
        expect(reachTiles({ guests: 120, listTaps: 8, partner: false })).toEqual([
            { key: 'guests', value: 120 },
            { key: 'listTaps', value: 8 },
        ]);
    });

    it('shows a partner everything sent, in order, without zero card taps', () => {
        const tiles = reachTiles({
            guests: 120,
            listTaps: 8,
            proViewers: 64,
            proViews: 410,
            postViewers: 90,
            reactions: 33,
            comments: 5,
            partnerCardTaps: 0,
            partner: true,
        });
        expect(tiles.map((tile) => tile.key)).toEqual(['guests', 'proViewers', 'proViews', 'postViewers', 'reactions', 'comments', 'listTaps']);
    });

    it('keeps card taps above zero', () => {
        expect(reachTiles({ guests: 1, listTaps: 0, postViewers: 0, reactions: 0, comments: 0, partnerCardTaps: 3, partner: true }).at(-1)).toEqual({
            key: 'partnerCardTaps',
            value: 3,
        });
    });
});

describe('formatReachCount', () => {
    it('groups thousands in the locale', () => {
        expect(formatReachCount('en', 1234)).toBe('1,234');
        expect(formatReachCount('el', 1234)).toBe('1.234');
    });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run lib/sneakPeek.test.ts lib/vendorReach.test.ts`
Expected: FAIL (modules not found).

- [ ] **Step 3: Write `lib/sneakPeek.ts`**

```ts
import type { MediaResponseDto, SneakPeekPatchDto, VendorMeDto } from '@/lib/api/types';
import { hasVendorCapability } from '@/lib/vendors';

// The backend's limit for a sneak peek (the normal post limit is 10).
export const SNEAK_PEEK_MAX_ITEMS = 20;

export type SneakPeekState = 'hidden' | 'notOpen' | 'noItems' | 'ready' | 'posted' | 'postedClosed' | 'used';

// What the vendor page's Sneak peek section shows. Closed tools are explained by the page's access line,
// so the section adds nothing for them unless there is a post to link to.
export function sneakPeekState(me: VendorMeDto | null, eventStartAt: string | null | undefined, hasOwnItems: boolean, now: Date = new Date()): SneakPeekState {
    const summary = me?.sneakPeek;
    if (!me || !summary) return 'hidden';
    const open = hasVendorCapability(me, 'SNEAK_PEEK');
    if (summary.postId) return open ? 'posted' : 'postedClosed';
    if (!open) return 'hidden';
    if (summary.used) return 'used';
    if (eventStartAt && now < new Date(eventStartAt)) return 'notOpen';
    return hasOwnItems ? 'ready' : 'noItems';
}

// The caller's own ready Pro items: the only ones the backend accepts.
export function sneakPeekCandidates(items: readonly MediaResponseDto[], memberId: string | null | undefined): MediaResponseDto[] {
    if (!memberId) return [];
    return items.filter((item) => item.uploaderMemberId === memberId && item.status === 'READY' && item.collection === 'PRO');
}

// Tap order is display order. A second tap removes; past the limit a tap does nothing.
export function toggleSneakPeekPick(picked: readonly string[], id: string): string[] {
    if (picked.includes(id)) return picked.filter((pick) => pick !== id);
    return picked.length >= SNEAK_PEEK_MAX_ITEMS ? [...picked] : [...picked, id];
}

type SneakPeekDraft = { mediaIds: readonly string[]; content: string | null };

// The PATCH body for an edit: only the changed fields, null when nothing changed. A blank caption clears it.
export function sneakPeekPatch(initial: SneakPeekDraft, next: SneakPeekDraft): SneakPeekPatchDto | null {
    const patch: SneakPeekPatchDto = {};
    const sameItems = initial.mediaIds.length === next.mediaIds.length && initial.mediaIds.every((id, i) => id === next.mediaIds[i]);
    if (!sameItems) patch.mediaIds = [...next.mediaIds];
    const before = (initial.content ?? '').trim();
    const after = (next.content ?? '').trim();
    if (before !== after) patch.content = after;
    return Object.keys(patch).length > 0 ? patch : null;
}
```

- [ ] **Step 4: Write `lib/vendorReach.ts`**

```ts
import type { VendorReachDto } from '@/lib/api/types';

export type ReachTileKey = 'guests' | 'proViewers' | 'proViews' | 'postViewers' | 'reactions' | 'comments' | 'listTaps' | 'partnerCardTaps';

export interface ReachTile {
    key: ReachTileKey;
    value: number;
}

const TILE_ORDER: readonly ReachTileKey[] = ['guests', 'proViewers', 'proViews', 'postViewers', 'reactions', 'comments', 'listTaps', 'partnerCardTaps'];

// The tiles a vendor sees: exactly the numbers the backend sent. Partner card taps hide at 0
// (their card never ran in this event, or nobody tapped it).
export function reachTiles(reach: VendorReachDto): ReachTile[] {
    return TILE_ORDER.flatMap((key) => {
        const value = reach[key];
        if (typeof value !== 'number') return [];
        if (key === 'partnerCardTaps' && value === 0) return [];
        return [{ key, value }];
    });
}

export function formatReachCount(locale: string, value: number): string {
    return new Intl.NumberFormat(locale).format(value);
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run lib/sneakPeek.test.ts lib/vendorReach.test.ts`
Expected: PASS. If `formatReachCount('el', 1234)` prints `1234`, the Node ICU data lacks Greek grouping for four digits: change that assertion to `formatReachCount('el', 12345)` → `'12.345'`.

- [ ] **Step 6: Commit**

```bash
git add lib/sneakPeek.ts lib/sneakPeek.test.ts lib/vendorReach.ts lib/vendorReach.test.ts
git commit -m "feat(vendors): sneak peek and reach rules

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `hooks/useSneakPeek.ts`

**Files:**
- Create: `hooks/useSneakPeek.ts`, `hooks/useSneakPeek.test.tsx`

- [ ] **Step 1: Write the failing test**

`hooks/useSneakPeek.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { vendorKeys } from '@/hooks/useVendors';
import type { PostResponseDto, VendorMeDto } from '@/lib/api/types';
import { postKeys } from '@/lib/postQueries';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() }));
vi.mock('@/lib/api/client', async (original) => ({ ...(await original<typeof import('@/lib/api/client')>()), api }));

import { useCreateSneakPeek, useDeleteSneakPeek, useUpdateSneakPeek } from '@/hooks/useSneakPeek';

const ME = { vendorId: 'v1', sneakPeek: { postId: null, mediaIds: [], content: null, used: false } } as unknown as VendorMeDto;
const POST = { id: 'p1', eventId: 'e1', type: 'SNEAK_PEEK', content: 'Hi', media: [{ id: 'm2' }, { id: 'm1' }] } as unknown as PostResponseDto;

function setup() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    queryClient.setQueryData(vendorKeys.me('e1'), ME);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    return { queryClient, invalidate, wrapper };
}

describe('useSneakPeek', () => {
    beforeEach(() => vi.clearAllMocks());

    it('posts the sneak peek and marks it used', async () => {
        api.post.mockResolvedValue(POST);
        const { queryClient, invalidate, wrapper } = setup();
        const { result } = renderHook(() => useCreateSneakPeek('e1'), { wrapper });

        await act(() => result.current.mutateAsync({ mediaIds: ['m2', 'm1'], content: 'Hi' }));

        expect(api.post).toHaveBeenCalledWith('/api/events/e1/vendors/me/sneak-peek', { mediaIds: ['m2', 'm1'], content: 'Hi' });
        expect(queryClient.getQueryData<VendorMeDto>(vendorKeys.me('e1'))?.sneakPeek).toEqual({
            postId: 'p1',
            mediaIds: ['m2', 'm1'],
            content: 'Hi',
            used: true,
        });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: postKeys.list('e1') });
    });

    it('patches only what it is given', async () => {
        api.patch.mockResolvedValue({ ...POST, content: null });
        const { queryClient, wrapper } = setup();
        const { result } = renderHook(() => useUpdateSneakPeek('e1'), { wrapper });

        await act(() => result.current.mutateAsync({ content: '' }));

        expect(api.patch).toHaveBeenCalledWith('/api/events/e1/vendors/me/sneak-peek', { content: '' });
        expect(queryClient.getQueryData<VendorMeDto>(vendorKeys.me('e1'))?.sneakPeek?.content).toBeNull();
    });

    it('deletes it and keeps it used', async () => {
        api.del.mockResolvedValue(undefined);
        const { queryClient, wrapper } = setup();
        const { result } = renderHook(() => useDeleteSneakPeek('e1'), { wrapper });

        await act(() => result.current.mutateAsync());

        expect(api.del).toHaveBeenCalledWith('/api/events/e1/vendors/me/sneak-peek');
        expect(queryClient.getQueryData<VendorMeDto>(vendorKeys.me('e1'))?.sneakPeek).toEqual({ postId: null, mediaIds: [], content: null, used: true });
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run hooks/useSneakPeek.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the hook**

`hooks/useSneakPeek.ts`:

```ts
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { vendorKeys } from '@/hooks/useVendors';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { PostResponseDto, SneakPeekPatchDto, SneakPeekRequestDto, SneakPeekSummaryDto, VendorMeDto } from '@/lib/api/types';
import { postKeys } from '@/lib/postQueries';

// After any change: the vendor page reads `me.sneakPeek` at once, the feed refetches for the pinned post.
function useSneakPeekRefresh(eventId: string) {
    const queryClient = useQueryClient();
    return useCallback(
        (post: PostResponseDto | null) => {
            const summary: SneakPeekSummaryDto = post
                ? { postId: post.id, mediaIds: post.media.map((item) => item.id), content: post.content, used: true }
                : { postId: null, mediaIds: [], content: null, used: true };
            queryClient.setQueryData<VendorMeDto | null>(vendorKeys.me(eventId), (me) => (me?.sneakPeek ? { ...me, sneakPeek: summary } : me));
            return queryClient.invalidateQueries({ queryKey: postKeys.list(eventId) });
        },
        [eventId, queryClient],
    );
}

export function useCreateSneakPeek(eventId: string) {
    const refresh = useSneakPeekRefresh(eventId);
    return useMutation({
        mutationFn: (body: SneakPeekRequestDto) => api.post<PostResponseDto>(endpoints.events.vendorSneakPeek(eventId), body),
        onSuccess: (post) => refresh(post),
    });
}

export function useUpdateSneakPeek(eventId: string) {
    const refresh = useSneakPeekRefresh(eventId);
    return useMutation({
        mutationFn: (patch: SneakPeekPatchDto) => api.patch<PostResponseDto>(endpoints.events.vendorSneakPeek(eventId), patch),
        onSuccess: (post) => refresh(post),
    });
}

export function useDeleteSneakPeek(eventId: string) {
    const refresh = useSneakPeekRefresh(eventId);
    return useMutation({
        mutationFn: () => api.del<void>(endpoints.events.vendorSneakPeek(eventId)),
        onSuccess: () => refresh(null),
    });
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run hooks/useSneakPeek.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add hooks/useSneakPeek.ts hooks/useSneakPeek.test.tsx
git commit -m "feat(vendors): sneak peek mutations

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `hooks/useVendorReach.ts` and the vendor page prefetch

**Files:**
- Create: `hooks/useVendorReach.ts`, `hooks/useVendorReach.test.tsx`
- Modify: `app/(main)/(app)/(event)/events/[eventId]/tools/vendors/me/page.tsx`, its `page.test.tsx`

- [ ] **Step 1: Write the failing hook test**

`hooks/useVendorReach.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api/client', async (original) => ({ ...(await original<typeof import('@/lib/api/client')>()), api }));

import { useVendorReach, vendorReachKeys } from '@/hooks/useVendorReach';

function setup() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    return { queryClient, wrapper };
}

describe('useVendorReach', () => {
    beforeEach(() => vi.clearAllMocks());

    it('reads the reach of the caller', async () => {
        api.get.mockResolvedValue({ guests: 3, listTaps: 1, partner: false });
        const { wrapper } = setup();
        const { result } = renderHook(() => useVendorReach('e1', true), { wrapper });
        await waitFor(() => expect(result.current.data).toEqual({ guests: 3, listTaps: 1, partner: false }));
        expect(api.get).toHaveBeenCalledWith('/api/events/e1/vendors/me/reach');
    });

    it('waits until the caller is known to be a vendor', () => {
        const { wrapper } = setup();
        renderHook(() => useVendorReach('e1', false), { wrapper });
        expect(api.get).not.toHaveBeenCalled();
    });

    it('uses warm data under the exported key', () => {
        const { queryClient, wrapper } = setup();
        queryClient.setQueryData(vendorReachKeys.me('e1'), { guests: 9, listTaps: 0, partner: false });
        const { result } = renderHook(() => useVendorReach('e1', true), { wrapper });
        expect(result.current.data?.guests).toBe(9);
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run hooks/useVendorReach.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the hook**

`hooks/useVendorReach.ts`:

```ts
'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { VendorReachDto } from '@/lib/api/types';

// Not under vendorKeys.me: a vendor patch invalidates `me` and must not refetch the reach.
export const vendorReachKeys = {
    me: (eventId: string) => ['events', eventId, 'vendors', 'reach'] as const,
};

// The caller's reach in the event. `enabled` once vendors/me says they are a vendor; read once per visit, no polling.
export function useVendorReach(eventId: string, enabled: boolean) {
    return useQuery({
        queryKey: vendorReachKeys.me(eventId),
        queryFn: () => api.get<VendorReachDto>(endpoints.events.vendorReach(eventId)),
        enabled,
    });
}
```

- [ ] **Step 4: Write the failing prefetch test**

In `app/(main)/(app)/(event)/events/[eventId]/tools/vendors/me/page.test.tsx`, add to the `describe`:

```tsx
    it("seeds every vendor's reach, and nothing for a non-vendor", async () => {
        answer({ ...PHOTOGRAPHER, vendorType: 'MUSIC', capabilities: ['SONG_REQUESTS'] });
        serverGet.mockImplementation(async (path: string) => (path.endsWith('/vendors/me/reach') ? { guests: 4, listTaps: 1, partner: false } : null));
        const element = await visit();
        expect(serverGet).toHaveBeenCalledWith('/api/events/e1/vendors/me/reach', 'tok');
        expect(seededKeys(element)).toEqual(expect.arrayContaining([['events', 'e1', 'vendors', 'reach']]));

        serverGet.mockClear();
        answer(null);
        await visit();
        expect(serverGet).not.toHaveBeenCalledWith('/api/events/e1/vendors/me/reach', 'tok');
    });

    it('keeps the page when the reach read fails', async () => {
        answer(PHOTOGRAPHER);
        serverGet.mockImplementation(async (path: string) => {
            if (path.endsWith('/vendors/me/reach')) throw new Error('down');
            return { content: [], page: { number: 0, totalPages: 0, totalElements: 0, size: 30 } };
        });
        const element = await visit();
        expect(seededKeys(element)).toEqual(expect.arrayContaining([['events', 'e1', 'vendors', 'me'], ['me', 'vendor-profile']]));
    });
```

Run: `npx vitest run "app/(main)/(app)/(event)/events/[eventId]/tools/vendors/me/page.test.tsx"`
Expected: the two new tests FAIL.

- [ ] **Step 5: Prefetch the reach**

In `page.tsx`:

- Import `vendorReachKeys` from `@/hooks/useVendorReach` and add `VendorReachDto` to the type import.
- Change the comment above `Page` to end with: "Every vendor's reach is seeded too, the same gate as `useReachSection` (a vendor row)."
- Add a sixth entry to the `Promise.all` and its destructuring:

```tsx
                const [profile, proFirstPage, printContext, hostList, services, reach] = await Promise.all([
                    // …the five existing entries unchanged…
                    // Every vendor has a reach report; a failed read must not drop the rest.
                    serverGet<VendorReachDto>(endpoints.events.vendorReach(eventId), context.accessToken).catch(() => null),
                ]);
```

- After `if (services) …`:

```tsx
                if (reach) queryClient.setQueryData(vendorReachKeys.me(eventId), reach);
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run hooks/useVendorReach.test.tsx "app/(main)/(app)/(event)/events/[eventId]/tools/vendors/me/page.test.tsx"`
Expected: PASS (all old prefetch tests too).

- [ ] **Step 7: Commit**

```bash
git add hooks/useVendorReach.ts hooks/useVendorReach.test.tsx "app/(main)/(app)/(event)/events/[eventId]/tools/vendors/me"
git commit -m "feat(vendors): reach query, prefetched on the vendor page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The view queue — `lib/contentViews.ts` and `hooks/useContentViews.ts`

**Files:**
- Create: `lib/contentViews.ts`, `lib/contentViews.test.ts`, `hooks/useContentViews.ts`, `hooks/useContentViews.test.tsx`

- [ ] **Step 1: Write the failing tests**

`lib/contentViews.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

import type { MediaResponseDto, PostResponseDto } from '@/lib/api/types';
import { CONTENT_VIEWS_BATCH_MAX, createContentViewQueue, isCountableProMedia, isVendorPost } from '@/lib/contentViews';

describe('createContentViewQueue', () => {
    it('sends each id once per tab, grouped by event', () => {
        const send = vi.fn().mockResolvedValue(undefined);
        const queue = createContentViewQueue(send);
        expect(queue.add('e1', 'media', 'm1')).toBe(true);
        expect(queue.add('e1', 'media', 'm1')).toBe(false);
        queue.add('e1', 'post', 'p1');
        queue.add('e2', 'media', 'm9');

        queue.flush();
        expect(send).toHaveBeenCalledWith('e1', { mediaIds: ['m1'], postIds: ['p1'] }, false);
        expect(send).toHaveBeenCalledWith('e2', { mediaIds: ['m9'], postIds: [] }, false);

        send.mockClear();
        queue.add('e1', 'media', 'm1');
        queue.flush();
        expect(send).not.toHaveBeenCalled();
    });

    it('splits into batches of 50 and passes keepalive', () => {
        const send = vi.fn().mockResolvedValue(undefined);
        const queue = createContentViewQueue(send);
        for (let i = 0; i < CONTENT_VIEWS_BATCH_MAX + 1; i++) queue.add('e1', 'media', `m${i}`);
        queue.flush(true);
        expect(send).toHaveBeenCalledTimes(2);
        expect(send.mock.calls[0][1].mediaIds).toHaveLength(50);
        expect(send.mock.calls[1][1].mediaIds).toEqual(['m50']);
        expect(send.mock.calls[0][2]).toBe(true);
    });

    it('drops a failed batch silently', async () => {
        const send = vi.fn().mockRejectedValue(new Error('429'));
        const queue = createContentViewQueue(send);
        queue.add('e1', 'post', 'p1');
        expect(() => queue.flush()).not.toThrow();
        await Promise.resolve();
        send.mockClear();
        queue.flush();
        expect(send).not.toHaveBeenCalled();
    });
});

describe('countable', () => {
    it('counts Pro items of others and vendor posts', () => {
        expect(isCountableProMedia({ collection: 'PRO', uploaderMemberId: 'v' } as MediaResponseDto, 'g')).toBe(true);
        expect(isCountableProMedia({ collection: 'PRO', uploaderMemberId: 'g' } as MediaResponseDto, 'g')).toBe(false);
        expect(isCountableProMedia({ collection: 'GUEST', uploaderMemberId: 'v' } as MediaResponseDto, 'g')).toBe(false);
        expect(isVendorPost({ author: { vendorType: 'PHOTOGRAPHER' } } as PostResponseDto)).toBe(true);
        expect(isVendorPost({ author: { vendorType: null } } as PostResponseDto)).toBe(false);
        expect(isVendorPost({ author: null } as PostResponseDto)).toBe(false);
    });
});
```

`hooks/useContentViews.test.tsx`:

```tsx
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/lib/api/client', async (original) => ({ ...(await original<typeof import('@/lib/api/client')>()), api }));
const provider = vi.hoisted(() => ({ member: { id: 'g1' } as { id: string } | null, isHost: false, event: { id: 'e1' } }));
vi.mock('@/providers/EventProvider', () => ({
    useActiveMember: () => provider.member,
    useIsHost: () => provider.isHost,
    useActiveEvent: () => provider.event,
}));

// The queue is module state: a fresh module per test.
async function load() {
    vi.resetModules();
    return import('@/hooks/useContentViews');
}

function hide() {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
}

describe('useContentViews', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        api.post.mockReset().mockResolvedValue(undefined);
        provider.member = { id: 'g1' };
        provider.isHost = false;
    });
    afterEach(() => {
        vi.useRealTimers();
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    });

    it('flushes every 10 seconds', async () => {
        const { useContentViews } = await load();
        const { result } = renderHook(() => useContentViews());
        result.current('e1', 'post', 'p1');
        expect(api.post).not.toHaveBeenCalled();
        vi.advanceTimersByTime(10_000);
        expect(api.post).toHaveBeenCalledWith('/api/events/e1/views', { mediaIds: [], postIds: ['p1'] }, { keepalive: false });
    });

    it('flushes with keepalive when the page hides', async () => {
        const { useContentViews } = await load();
        const { result } = renderHook(() => useContentViews());
        result.current('e1', 'media', 'm1');
        hide();
        expect(api.post).toHaveBeenCalledWith('/api/events/e1/views', { mediaIds: ['m1'], postIds: [] }, { keepalive: true });
    });

    it('records a shown Pro item of someone else, never for a host', async () => {
        const { useRecordProMediaView } = await load();
        const pro = { id: 'm1', collection: 'PRO', uploaderMemberId: 'v1' } as never;
        renderHook(() => useRecordProMediaView(pro));
        vi.advanceTimersByTime(10_000);
        expect(api.post).toHaveBeenCalledWith('/api/events/e1/views', { mediaIds: ['m1'], postIds: [] }, { keepalive: false });

        api.post.mockClear();
        provider.isHost = true;
        const fresh = await load();
        renderHook(() => fresh.useRecordProMediaView(pro));
        vi.advanceTimersByTime(10_000);
        expect(api.post).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run lib/contentViews.test.ts hooks/useContentViews.test.tsx`
Expected: FAIL (modules not found).

- [ ] **Step 3: Write `lib/contentViews.ts`**

```ts
import type { ContentViewsRequestDto, MediaResponseDto, PostResponseDto } from '@/lib/api/types';

export const CONTENT_VIEWS_FLUSH_MS = 10_000;
// The backend's per-list limit.
export const CONTENT_VIEWS_BATCH_MAX = 50;

export type ContentViewKind = 'media' | 'post';
export type SendContentViews = (eventId: string, body: ContentViewsRequestDto, keepalive: boolean) => Promise<unknown>;

// A Pro item someone else uploaded: the only media a view counts on.
export function isCountableProMedia(media: Pick<MediaResponseDto, 'collection' | 'uploaderMemberId'>, memberId: string | null | undefined): boolean {
    return media.collection === 'PRO' && media.uploaderMemberId !== memberId;
}

// A post written by a vendor of the event (the backend sets author.vendorType only for them).
export function isVendorPost(post: Pick<PostResponseDto, 'author'>): boolean {
    return Boolean(post.author?.vendorType);
}

// Views waiting to be sent, per event. An id is queued once per tab: the server keeps one row per member
// anyway, so sending it again would only cost a request. A failed send is dropped, never retried.
export function createContentViewQueue(send: SendContentViews) {
    const seen = new Set<string>();
    const pending = new Map<string, ContentViewsRequestDto>();

    function add(eventId: string, kind: ContentViewKind, id: string): boolean {
        const key = `${eventId}:${kind}:${id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        const batch = pending.get(eventId) ?? { mediaIds: [], postIds: [] };
        (kind === 'media' ? batch.mediaIds : batch.postIds).push(id);
        pending.set(eventId, batch);
        return true;
    }

    function flush(keepalive = false) {
        const batches = [...pending.entries()];
        pending.clear();
        for (const [eventId, batch] of batches) {
            const rounds = Math.ceil(Math.max(batch.mediaIds.length, batch.postIds.length) / CONTENT_VIEWS_BATCH_MAX);
            for (let round = 0; round < rounds; round++) {
                const part = (ids: string[]) => ids.slice(round * CONTENT_VIEWS_BATCH_MAX, (round + 1) * CONTENT_VIEWS_BATCH_MAX);
                send(eventId, { mediaIds: part(batch.mediaIds), postIds: part(batch.postIds) }, keepalive).catch(() => undefined);
            }
        }
    }

    return { add, flush };
}
```

- [ ] **Step 4: Write `hooks/useContentViews.ts`**

```ts
'use client';

import { useCallback, useEffect } from 'react';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { MediaResponseDto } from '@/lib/api/types';
import { CONTENT_VIEWS_FLUSH_MS, type ContentViewKind, createContentViewQueue, isCountableProMedia } from '@/lib/contentViews';
import { useActiveEvent, useActiveMember, useIsHost } from '@/providers/EventProvider';

// One queue for the tab: the feed, the gallery viewer and the post viewer share it.
const queue = createContentViewQueue((eventId, body, keepalive) => api.post<void>(endpoints.events.contentViews(eventId), body, { keepalive }));
let flushing = false;

// Started by the first view, then kept for the tab's life: an empty flush sends nothing.
function startFlushing() {
    if (flushing || typeof window === 'undefined') return;
    flushing = true;
    window.setInterval(() => queue.flush(), CONTENT_VIEWS_FLUSH_MS);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') queue.flush(true);
    });
}

// Records that the caller saw something. Counting only: never throws, never shows an error.
export function useContentViews() {
    return useCallback((eventId: string, kind: ContentViewKind, id: string) => {
        if (queue.add(eventId, kind, id)) startFlushing();
    }, []);
}

// Records a Pro item shown in a viewer, unless the caller is a host or uploaded it.
export function useRecordProMediaView(media: MediaResponseDto | null | undefined) {
    const record = useContentViews();
    const activeEvent = useActiveEvent();
    const activeMember = useActiveMember();
    const isHost = useIsHost();
    const eventId = activeEvent?.id ?? null;
    const mediaId = media && activeMember && !isHost && isCountableProMedia(media, activeMember.id) ? media.id : null;

    useEffect(() => {
        if (eventId && mediaId) record(eventId, 'media', mediaId);
    }, [eventId, mediaId, record]);
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run lib/contentViews.test.ts hooks/useContentViews.test.tsx`
Expected: PASS. If the visibility test fails because an earlier test's listener flushed first, check `vi.resetModules()` runs in `load()` before each import.

- [ ] **Step 6: Commit**

```bash
git add lib/contentViews.ts lib/contentViews.test.ts hooks/useContentViews.ts hooks/useContentViews.test.tsx
git commit -m "feat(media): batched view recorder for vendor work

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Record views in the feed and the viewers

**Files:**
- Create: `hooks/useVendorPostViewTracking.ts`, `hooks/useVendorPostViewTracking.test.tsx`
- Modify: `components/feed/PostCard.tsx`, `components/feed/post/PostMediaViewer.tsx`, `components/gallery/GalleryViewer.tsx`

- [ ] **Step 1: Write the failing test**

`hooks/useVendorPostViewTracking.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PostResponseDto } from '@/lib/api/types';

const record = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useContentViews', () => ({ useContentViews: () => record }));
const provider = vi.hoisted(() => ({ member: { id: 'g1' } as { id: string } | null, isHost: false }));
vi.mock('@/providers/EventProvider', () => ({ useActiveMember: () => provider.member, useIsHost: () => provider.isHost }));

import { useVendorPostViewTracking } from '@/hooks/useVendorPostViewTracking';

type Callback = (entries: Array<Partial<IntersectionObserverEntry>>) => void;
let fire: Callback = () => undefined;
const disconnect = vi.fn();

class FakeObserver {
    constructor(callback: Callback) {
        fire = callback;
    }
    observe() {}
    disconnect = disconnect;
}

function Card({ post }: { post: PostResponseDto }) {
    const ref = useVendorPostViewTracking<HTMLElement>(post);
    return <article ref={ref} />;
}

const VENDOR_POST = { id: 'p1', eventId: 'e1', authorMemberId: 'v1', author: { vendorType: 'PHOTOGRAPHER' } } as unknown as PostResponseDto;

describe('useVendorPostViewTracking', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        record.mockReset();
        disconnect.mockReset();
        provider.member = { id: 'g1' };
        provider.isHost = false;
        vi.stubGlobal('IntersectionObserver', FakeObserver);
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('records a vendor post half on screen for a second', () => {
        render(<Card post={VENDOR_POST} />);
        fire([{ isIntersecting: true, intersectionRatio: 0.6 }]);
        vi.advanceTimersByTime(999);
        expect(record).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(record).toHaveBeenCalledWith('e1', 'post', 'p1');
    });

    it('does not record a post scrolled past too fast', () => {
        render(<Card post={VENDOR_POST} />);
        fire([{ isIntersecting: true, intersectionRatio: 0.6 }]);
        vi.advanceTimersByTime(500);
        fire([{ isIntersecting: false, intersectionRatio: 0.1 }]);
        vi.advanceTimersByTime(1000);
        expect(record).not.toHaveBeenCalled();
    });

    it('skips guest posts, the vendor themself and hosts', () => {
        const observe = vi.fn();
        vi.stubGlobal('IntersectionObserver', class { observe = observe; disconnect = disconnect; });
        render(<Card post={{ ...VENDOR_POST, author: { vendorType: null } } as unknown as PostResponseDto} />);
        provider.member = { id: 'v1' };
        render(<Card post={VENDOR_POST} />);
        provider.member = { id: 'g1' };
        provider.isHost = true;
        render(<Card post={VENDOR_POST} />);
        expect(observe).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run hooks/useVendorPostViewTracking.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the hook**

`hooks/useVendorPostViewTracking.ts`:

```ts
'use client';

import { useEffect, useRef } from 'react';

import { useContentViews } from '@/hooks/useContentViews';
import type { PostResponseDto } from '@/lib/api/types';
import { isVendorPost } from '@/lib/contentViews';
import { useActiveMember, useIsHost } from '@/providers/EventProvider';

// The spec's "seen": at least half the card on screen for at least a second.
export const POST_VIEW_RATIO = 0.5;
export const POST_VIEW_DWELL_MS = 1000;

// Attach the returned ref to a feed card. Records one view of a vendor's post, once, for guests and other vendors.
export function useVendorPostViewTracking<T extends Element>(post: PostResponseDto) {
    const ref = useRef<T | null>(null);
    const record = useContentViews();
    const activeMember = useActiveMember();
    const isHost = useIsHost();
    const tracked = isVendorPost(post) && !isHost && Boolean(activeMember) && post.authorMemberId !== activeMember?.id;

    useEffect(() => {
        const element = ref.current;
        if (!tracked || !element || typeof IntersectionObserver === 'undefined') return;
        let timer: number | null = null;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && entry.intersectionRatio >= POST_VIEW_RATIO) {
                    timer ??= window.setTimeout(() => {
                        record(post.eventId, 'post', post.id);
                        observer.disconnect();
                    }, POST_VIEW_DWELL_MS);
                } else if (timer !== null) {
                    window.clearTimeout(timer);
                    timer = null;
                }
            },
            { threshold: [POST_VIEW_RATIO] },
        );
        observer.observe(element);
        return () => {
            observer.disconnect();
            if (timer !== null) window.clearTimeout(timer);
        };
    }, [post.eventId, post.id, record, tracked]);

    return ref;
}
```

- [ ] **Step 4: Wire it in**

`components/feed/PostCard.tsx`: import `useVendorPostViewTracking` from `@/hooks/useVendorPostViewTracking`; after `const isAnnouncement = isAnnouncementPost(post);` add

```tsx
    const viewRef = useVendorPostViewTracking<HTMLElement>(post);
```

and give the root element the ref: `<article ref={viewRef} className={cn(…)}>`.

`components/feed/post/PostMediaViewer.tsx`: import `useRecordProMediaView` from `@/hooks/useContentViews`; after the `currentIndex` state add

```tsx
    // A Pro item on screen counts as one view for its vendor (sneak peek, 2026-10-29).
    useRecordProMediaView(media[currentIndex]);
```

`components/gallery/GalleryViewer.tsx`: import `useRecordProMediaView`; first line inside the component after `const t = …`:

```tsx
    // A Pro item on screen counts as one view for its vendor (2026-10-29).
    useRecordProMediaView(media);
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run hooks/useVendorPostViewTracking.test.tsx components/feed components/gallery`
Expected: PASS. Existing `PostCard`, `PostMediaViewer` and `GalleryViewer` tests that render without an `EventProvider` mock now call `useActiveEvent`/`useActiveMember`/`useIsHost` through the new hooks: those tests already mock `@/providers/EventProvider` for `PostCard`; where a test's mock lacks one of the three, add it (`useActiveEvent: () => null`, `useIsHost: () => false`).

- [ ] **Step 6: Commit**

```bash
git add hooks/useVendorPostViewTracking.ts hooks/useVendorPostViewTracking.test.tsx components/feed components/gallery
git commit -m "feat(media): record views of vendor posts and Pro items

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The sneak peek in the feed, and the notification copy

**Files:**
- Create: `components/feed/post/SneakPeekLabel.tsx`
- Modify: `components/feed/post/postUtils.ts`, `components/feed/PostCard.tsx`, `messages/en.json`, `messages/el.json`
- Test: `components/feed/PostCard.test.tsx` (or the closest existing PostCard test), `components/notifications/NotificationRow.test.tsx`

- [ ] **Step 1: Write the failing tests**

In the existing PostCard test file (find it: `components/feed/PostCard*.test.tsx`), reusing its render helper and post fixture:

```tsx
    it('labels a sneak peek', () => {
        renderCard({ ...post, type: 'SNEAK_PEEK', isPinned: true });
        expect(screen.getByText('Sneak peek')).toBeInTheDocument();
    });
```

If no PostCard test exists, create `components/feed/post/SneakPeekLabel.test.tsx` instead:

```tsx
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import { SneakPeekLabel } from '@/components/feed/post/SneakPeekLabel';
import { isSneakPeekPost } from '@/components/feed/post/postUtils';
import type { PostResponseDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

describe('SneakPeekLabel', () => {
    it('names the post', () => {
        render(
            <NextIntlClientProvider locale="en" messages={messages}>
                <SneakPeekLabel />
            </NextIntlClientProvider>,
        );
        expect(screen.getByText('Sneak peek')).toBeInTheDocument();
        expect(isSneakPeekPost({ type: 'SNEAK_PEEK' } as PostResponseDto)).toBe(true);
    });
});
```

In `components/notifications/NotificationRow.test.tsx`, following its existing cases:

```tsx
    it('falls back to the sneak peek copy', () => {
        renderRow({ type: 'SNEAK_PEEK_POSTED', title: null, body: null, payload: { businessName: 'Studio X', vendorType: 'PHOTOGRAPHER' } });
        expect(screen.getByText('Studio X shared a sneak peek')).toBeInTheDocument();
        expect(screen.getByText('See the first moments from the event.')).toBeInTheDocument();
    });

    it('falls back to the reach summary copy', () => {
        renderRow({ type: 'VENDOR_REACH_SUMMARY', title: null, body: null, payload: {} });
        expect(screen.getByText('Your reach report is ready')).toBeInTheDocument();
    });
```

Use the file's own helper name and notification fixture in place of `renderRow`.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run components/feed components/notifications/NotificationRow.test.tsx`
Expected: the new tests FAIL.

- [ ] **Step 3: Write the label and the type guard**

`components/feed/post/postUtils.ts`, after `isAnnouncementPost`:

```ts
// A photographer's or videographer's pinned first look (spec 2026-10-29).
export function isSneakPeekPost(post: PostResponseDto) {
    return post.type === 'SNEAK_PEEK';
}
```

`components/feed/post/SneakPeekLabel.tsx`:

```tsx
import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function SneakPeekLabel() {
    const t = useTranslations('PostCard');

    // Same treatment as the announcement label: coral on the icon only.
    return (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
            <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.8} aria-hidden="true" />
            <span>{t('sneakPeek')}</span>
        </p>
    );
}
```

- [ ] **Step 4: Show it in `PostCard`**

In `components/feed/PostCard.tsx`:

- Import `SneakPeekLabel` and `isSneakPeekPost`.
- After `const isAnnouncement = isAnnouncementPost(post);`:

```tsx
    const isSneakPeek = isSneakPeekPost(post);
    // Both kinds get the tint and a label row above the header.
    const isLabelled = isAnnouncement || isSneakPeek;
```

- In the `article` class list, `isAnnouncement && 'bg-linear-to-b from-primary/12 to-primary/5'` becomes `isLabelled && 'bg-linear-to-b from-primary/12 to-primary/5'`.
- Replace the announcement label block with:

```tsx
            {/* Label */}
            {isLabelled && <div className="px-4 pt-4">{isSneakPeek ? <SneakPeekLabel /> : <AnnouncementLabel />}</div>}
```

- In the header class, `isAnnouncement ? 'pt-3' : 'pt-4'` becomes `isLabelled ? 'pt-3' : 'pt-4'`. The post text keeps `isAnnouncement` for its larger type: a sneak peek caption reads like a normal post.

- [ ] **Step 5: Add the copy**

`messages/en.json`: `PostCard.sneakPeek`: `"Sneak peek"`. In `NotificationsPage.types`:

```json
"SNEAK_PEEK_POSTED": { "title": "{business} shared a sneak peek", "body": "See the first moments from the event." },
"VENDOR_REACH_SUMMARY": { "title": "Your reach report is ready", "body": "See how many guests saw your work." }
```

`messages/el.json`: `PostCard.sneakPeek`: `"Πρώτη ματιά"`. In `NotificationsPage.types`:

```json
"SNEAK_PEEK_POSTED": { "title": "Ο/Η {business} μοιράστηκε μια πρώτη ματιά", "body": "Δείτε τις πρώτες στιγμές της εκδήλωσης." },
"VENDOR_REACH_SUMMARY": { "title": "Η αναφορά απήχησης είναι έτοιμη", "body": "Δείτε πόσοι καλεσμένοι είδαν τη δουλειά σας." }
```

If `NotificationsPage.types` entries in the file are objects with `title`/`body` keys on separate lines, keep that layout.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run components/feed components/notifications`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/feed components/notifications messages
git commit -m "feat(feed): label the sneak peek; notification copy

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: The Sneak peek sheet

**Files:**
- Create: `hooks/useSneakPeekSheet.ts`, `components/vendors/me/SneakPeekSheet.tsx`, `components/vendors/me/SneakPeekSheet.test.tsx`
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Add the copy**

`messages/en.json`, a new `Vendors.sneakPeek` object:

```json
"sneakPeek": {
    "title": "Sneak peek",
    "notOpen": "You can share it once the event starts.",
    "noItems": "Add photos or videos to your Pro album first.",
    "ready": "Share up to 20 photos and videos with all guests. One per event.",
    "choose": "Choose photos",
    "used": "You already shared your sneak peek for this event.",
    "seeInFeed": "See it in the feed",
    "edit": "Edit",
    "delete": "Delete",
    "thumbAlt": "Sneak peek photo {index}",
    "sheetTitle": "Sneak peek",
    "picked": "{count} of 20 chosen",
    "pickAlt": "Your Pro photo {index}",
    "pick": "Choose photo {index}",
    "unpick": "Remove photo {index}",
    "more": "Show more",
    "captionLabel": "Caption (optional)",
    "share": "Share",
    "save": "Save",
    "cancel": "Cancel",
    "deleteTitle": "Delete the sneak peek?",
    "deleteBody": "Guests will no longer see it. You can't share another one for this event.",
    "deleteConfirm": "Delete",
    "deleteCancel": "Keep it"
}
```

`messages/el.json`, `Vendors.sneakPeek`:

```json
"sneakPeek": {
    "title": "Πρώτη ματιά",
    "notOpen": "Μπορείτε να τη μοιραστείτε μόλις ξεκινήσει η εκδήλωση.",
    "noItems": "Προσθέστε πρώτα φωτογραφίες ή βίντεο στο Pro άλμπουμ σας.",
    "ready": "Μοιραστείτε έως 20 φωτογραφίες και βίντεο με όλους τους καλεσμένους. Μία φορά ανά εκδήλωση.",
    "choose": "Επιλογή φωτογραφιών",
    "used": "Έχετε ήδη μοιραστεί την πρώτη ματιά για αυτή την εκδήλωση.",
    "seeInFeed": "Δείτε τη στη ροή",
    "edit": "Επεξεργασία",
    "delete": "Διαγραφή",
    "thumbAlt": "Φωτογραφία πρώτης ματιάς {index}",
    "sheetTitle": "Πρώτη ματιά",
    "picked": "{count} από 20",
    "pickAlt": "Η Pro φωτογραφία σας {index}",
    "pick": "Επιλογή φωτογραφίας {index}",
    "unpick": "Αφαίρεση φωτογραφίας {index}",
    "more": "Περισσότερα",
    "captionLabel": "Λεζάντα (προαιρετικά)",
    "share": "Κοινοποίηση",
    "save": "Αποθήκευση",
    "cancel": "Ακύρωση",
    "deleteTitle": "Διαγραφή της πρώτης ματιάς;",
    "deleteBody": "Οι καλεσμένοι δεν θα τη βλέπουν πια. Δεν μπορείτε να μοιραστείτε άλλη για αυτή την εκδήλωση.",
    "deleteConfirm": "Διαγραφή",
    "deleteCancel": "Διατήρηση"
}
```

Match the Pro album's name to the existing `Vendors.me.proTitle` in each language (if Greek says «Επαγγελματικό άλμπουμ», use that in `noItems` and `pickAlt`).

- [ ] **Step 2: Write the failing component test**

`components/vendors/me/SneakPeekSheet.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SneakPeekSheet } from '@/components/vendors/me/SneakPeekSheet';
import type { MediaResponseDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

// The caption limit comes from the app config; its fallback is enough here.
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: undefined }) }));

const items = Array.from({ length: 21 }, (_, i) => ({ id: `m${i}`, mediaUrl: `https://cdn.test/m${i}.jpg`, thumbnailUrl: null, mediaType: 'IMAGE', status: 'READY' }) as unknown as MediaResponseDto);

function renderSheet(overrides: Partial<Parameters<typeof SneakPeekSheet>[0]> = {}) {
    const props = {
        open: true,
        mode: 'new' as const,
        items: items.slice(0, 3),
        initialPicked: [],
        initialCaption: null,
        hasMore: false,
        isSaving: false,
        error: null,
        onLoadMoreAction: vi.fn(),
        onSubmitAction: vi.fn(),
        onCloseAction: vi.fn(),
        ...overrides,
    };
    render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <SneakPeekSheet {...props} />
        </NextIntlClientProvider>,
    );
    return props;
}

describe('SneakPeekSheet', () => {
    afterEach(cleanup);

    it('shares the picks in tap order with the caption', () => {
        const props = renderSheet();
        expect(screen.getByRole('button', { name: 'Share' })).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: 'Choose photo 3' }));
        fireEvent.click(screen.getByRole('button', { name: 'Choose photo 1' }));
        expect(screen.getByText('2 of 20 chosen')).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Caption (optional)'), { target: { value: 'First look' } });
        fireEvent.click(screen.getByRole('button', { name: 'Share' }));
        expect(props.onSubmitAction).toHaveBeenCalledWith({ mediaIds: ['m2', 'm0'], content: 'First look' });
    });

    it('stops at 20', () => {
        renderSheet({ items, initialPicked: items.slice(0, 20).map((item) => item.id) });
        expect(screen.getByText('20 of 20 chosen')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Choose photo 21' }));
        expect(screen.getByText('20 of 20 chosen')).toBeInTheDocument();
    });

    it('edits: starts from the post, saves only the change', () => {
        const props = renderSheet({ mode: 'edit', initialPicked: ['m0', 'm1'], initialCaption: 'Hi' });
        expect(screen.getByLabelText('Caption (optional)')).toHaveValue('Hi');
        fireEvent.click(screen.getByRole('button', { name: 'Remove photo 2' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(props.onSubmitAction).toHaveBeenCalledWith({ mediaIds: ['m0'] });
    });

    it('shows the error and loads more', () => {
        const props = renderSheet({ error: 'Pick from your own Pro photos and videos.', hasMore: true });
        expect(screen.getByRole('alert')).toHaveTextContent('Pick from your own Pro photos and videos.');
        fireEvent.click(screen.getByRole('button', { name: 'Show more' }));
        expect(props.onLoadMoreAction).toHaveBeenCalled();
    });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run components/vendors/me/SneakPeekSheet.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 4: Write the sheet hook**

`hooks/useSneakPeekSheet.ts`:

```ts
'use client';

import { type ChangeEvent, useCallback, useState } from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import type { SneakPeekPatchDto, SneakPeekRequestDto } from '@/lib/api/types';
import { sneakPeekPatch, toggleSneakPeekPick } from '@/lib/sneakPeek';

export type SneakPeekSubmit = SneakPeekRequestDto | SneakPeekPatchDto;

// The sheet's picks and caption. New: sends every pick and the caption. Edit: only what changed;
// an edit with no change just closes.
export function useSneakPeekSheet({
    mode,
    initialPicked,
    initialCaption,
    onSubmit,
    onClose,
}: {
    mode: 'new' | 'edit';
    initialPicked: readonly string[];
    initialCaption: string | null;
    onSubmit: (body: SneakPeekSubmit) => void;
    onClose: () => void;
}) {
    const { data: appConfig } = useAppConfig();
    const [picked, setPicked] = useState<string[]>(() => [...initialPicked]);
    const [caption, setCaption] = useState(initialCaption ?? '');

    const toggle = useCallback((id: string) => setPicked((current) => toggleSneakPeekPick(current, id)), []);
    const handleCaption = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => setCaption(event.target.value), []);

    const handleSubmit = useCallback(
        (event: React.SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (picked.length === 0) return;
            if (mode === 'new') {
                const content = caption.trim();
                onSubmit(content ? { mediaIds: picked, content } : { mediaIds: picked });
                return;
            }
            const patch = sneakPeekPatch({ mediaIds: initialPicked, content: initialCaption }, { mediaIds: picked, content: caption });
            if (patch) onSubmit(patch);
            else onClose();
        },
        [caption, initialCaption, initialPicked, mode, onClose, onSubmit, picked],
    );

    return {
        picked,
        pickIndex: (id: string) => picked.indexOf(id),
        toggle,
        caption,
        handleCaption,
        // The normal post caption limit, with EditPostModal's fallback.
        maxLength: appConfig?.contentLimits.postContentMaxLength ?? 500,
        canSubmit: picked.length > 0,
        handleSubmit,
    };
}
```

- [ ] **Step 5: Write the sheet**

`components/vendors/me/SneakPeekSheet.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { MediaThumbnail } from '@/components/common/MediaThumbnail';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { type SneakPeekSubmit, useSneakPeekSheet } from '@/hooks/useSneakPeekSheet';
import type { MediaResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

// Pick 1–20 of the vendor's own Pro items and an optional caption. Mount it keyed on the mode so each
// opening starts from the saved sneak peek.
export function SneakPeekSheet({
    open,
    mode,
    items,
    initialPicked,
    initialCaption,
    hasMore,
    isSaving,
    error,
    onLoadMoreAction,
    onSubmitAction,
    onCloseAction,
}: {
    open: boolean;
    mode: 'new' | 'edit';
    items: MediaResponseDto[];
    initialPicked: readonly string[];
    initialCaption: string | null;
    hasMore: boolean;
    isSaving: boolean;
    error: string | null;
    onLoadMoreAction: () => void;
    onSubmitAction: (body: SneakPeekSubmit) => void;
    onCloseAction: () => void;
}) {
    const t = useTranslations('Vendors.sneakPeek');
    const sheet = useSneakPeekSheet({ mode, initialPicked, initialCaption, onSubmit: onSubmitAction, onClose: onCloseAction });
    const captionId = useId();

    return (
        <Modal open={open} onClose={onCloseAction} variant="sheet" size="md" ariaLabel={t('sheetTitle')} closeLabel={t('cancel')}>
            <Modal.Body className="px-5 pt-5 pb-6">
                <form onSubmit={sheet.handleSubmit} className="flex flex-col gap-4">
                    {/* Header */}
                    <div className="flex items-baseline justify-between gap-3 pr-8">
                        <h2 className="text-base font-bold text-ink">{t('sheetTitle')}</h2>
                        <p className="text-sm text-ink-muted tabular-nums">{t('picked', { count: sheet.picked.length })}</p>
                    </div>

                    {/* Items */}
                    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {items.map((item, i) => {
                            const order = sheet.pickIndex(item.id);
                            const isPicked = order >= 0;
                            return (
                                <li key={item.id}>
                                    <button
                                        type="button"
                                        onClick={() => sheet.toggle(item.id)}
                                        aria-pressed={isPicked}
                                        aria-label={t(isPicked ? 'unpick' : 'pick', { index: i + 1 })}
                                        className={cn('relative block aspect-square w-full overflow-hidden rounded-lg', isPicked && 'ring-2 ring-primary ring-offset-2')}
                                    >
                                        <MediaThumbnail
                                            src={item.mediaUrl}
                                            mediaType={item.mediaType}
                                            status={item.status}
                                            thumbnailUrl={item.thumbnailUrl}
                                            alt={t('pickAlt', { index: i + 1 })}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 640px) 33vw, 160px"
                                        />
                                        {isPicked && (
                                            <span className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground tabular-nums">
                                                {order + 1}
                                            </span>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    {hasMore && (
                        <Button type="button" variant="outline" size="lg" onClick={onLoadMoreAction}>
                            {t('more')}
                        </Button>
                    )}

                    {/* Caption */}
                    <label htmlFor={captionId} className="flex flex-col gap-1 text-sm text-ink">
                        {t('captionLabel')}
                        <textarea
                            id={captionId}
                            value={sheet.caption}
                            onChange={sheet.handleCaption}
                            maxLength={sheet.maxLength}
                            rows={3}
                            className="rounded-lg border border-border bg-background px-3 py-2"
                        />
                    </label>
                    {error && (
                        <p role="alert" className="text-sm text-rose-600">
                            {error}
                        </p>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" size="lg" onClick={onCloseAction}>
                            {t('cancel')}
                        </Button>
                        <Button type="submit" size="lg" disabled={!sheet.canSubmit || isSaving}>
                            {t(mode === 'new' ? 'share' : 'save')}
                        </Button>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    );
}
```

`MediaThumbnail` takes the item's fields one by one, as `PrintListReadRow` passes them. `Modal size="md"` is what `BecomePartnerSheet` uses.

- [ ] **Step 6: Run the test**

Run: `npx vitest run components/vendors/me/SneakPeekSheet.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add hooks/useSneakPeekSheet.ts components/vendors/me/SneakPeekSheet.tsx components/vendors/me/SneakPeekSheet.test.tsx messages
git commit -m "feat(vendors): sneak peek sheet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: The Sneak peek section on the vendor page

**Files:**
- Create: `hooks/useSneakPeekSection.ts`, `components/vendors/me/SneakPeekSection.tsx`, `components/vendors/me/SneakPeekSection.test.tsx`
- Modify: `components/vendors/me/VendorMeScreen.tsx`, `components/vendors/me/VendorMeScreen.test.tsx`

- [ ] **Step 1: Write the failing component test**

`components/vendors/me/SneakPeekSection.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SneakPeekSection } from '@/components/vendors/me/SneakPeekSection';
import type { MediaResponseDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const thumbs = [{ id: 'm1', mediaUrl: 'https://cdn.test/m1.jpg', thumbnailUrl: null, mediaType: 'IMAGE', status: 'READY' }] as unknown as MediaResponseDto[];

function renderSection(overrides: Partial<Parameters<typeof SneakPeekSection>[0]> = {}) {
    const props = {
        state: 'ready' as const,
        thumbnails: [],
        feedHref: '/events/e1/feed?post=p1',
        onChooseAction: vi.fn(),
        onEditAction: vi.fn(),
        onDeleteAction: vi.fn(),
        ...overrides,
    };
    render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <SneakPeekSection {...props} />
        </NextIntlClientProvider>,
    );
    return props;
}

describe('SneakPeekSection', () => {
    afterEach(cleanup);

    it('waits for the start', () => {
        renderSection({ state: 'notOpen' });
        expect(screen.getByText('You can share it once the event starts.')).toBeInTheDocument();
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('asks for Pro items first', () => {
        renderSection({ state: 'noItems' });
        expect(screen.getByText('Add photos or videos to your Pro album first.')).toBeInTheDocument();
    });

    it('opens the sheet when ready', () => {
        const props = renderSection();
        fireEvent.click(screen.getByRole('button', { name: 'Choose photos' }));
        expect(props.onChooseAction).toHaveBeenCalled();
    });

    it('shows a posted one with edit, delete and the feed link', () => {
        const props = renderSection({ state: 'posted', thumbnails: thumbs });
        expect(screen.getByAltText('Sneak peek photo 1')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'See it in the feed' })).toHaveAttribute('href', '/events/e1/feed?post=p1');
        fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
        expect(props.onEditAction).toHaveBeenCalled();
        expect(props.onDeleteAction).toHaveBeenCalled();
    });

    it('after access ends keeps only the link', () => {
        renderSection({ state: 'postedClosed', thumbnails: thumbs });
        expect(screen.getByRole('link', { name: 'See it in the feed' })).toBeInTheDocument();
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('says it was used', () => {
        renderSection({ state: 'used' });
        expect(screen.getByText('You already shared your sneak peek for this event.')).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run components/vendors/me/SneakPeekSection.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the section**

`components/vendors/me/SneakPeekSection.tsx`:

```tsx
'use client';

import { Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { MediaThumbnail } from '@/components/common/MediaThumbnail';
import { Button, buttonVariants } from '@/components/ui/button';
import type { MediaResponseDto } from '@/lib/api/types';
import type { SneakPeekState } from '@/lib/sneakPeek';

// Never rendered for 'hidden'; the screen checks `visible` first.
export function SneakPeekSection({
    state,
    thumbnails,
    feedHref,
    onChooseAction,
    onEditAction,
    onDeleteAction,
}: {
    state: Exclude<SneakPeekState, 'hidden'>;
    thumbnails: MediaResponseDto[];
    feedHref: string | null;
    onChooseAction: () => void;
    onEditAction: () => void;
    onDeleteAction: () => void;
}) {
    const t = useTranslations('Vendors.sneakPeek');
    const posted = state === 'posted' || state === 'postedClosed';

    return (
        <section aria-labelledby="vendor-sneak-peek-title" className="flex flex-col gap-3">
            {/* Title */}
            <h3 id="vendor-sneak-peek-title" className="text-sm font-semibold text-ink">
                {t('title')}
            </h3>

            {/* Status */}
            {state === 'notOpen' && <p className="text-sm text-ink-muted">{t('notOpen')}</p>}
            {state === 'noItems' && <p className="text-sm text-ink-muted">{t('noItems')}</p>}
            {state === 'used' && <p className="text-sm text-ink-muted">{t('used')}</p>}
            {state === 'ready' && (
                <div className="flex flex-col items-start gap-3">
                    <p className="text-sm text-ink-muted">{t('ready')}</p>
                    <Button type="button" size="lg" onClick={onChooseAction}>
                        {t('choose')}
                    </Button>
                </div>
            )}

            {/* Posted */}
            {posted && (
                <>
                    {thumbnails.length > 0 && (
                        <ul className="grid grid-cols-4 gap-2">
                            {thumbnails.map((item, i) => (
                                <li key={item.id} className="relative aspect-square overflow-hidden rounded-lg">
                                    <MediaThumbnail
                                        src={item.mediaUrl}
                                        mediaType={item.mediaType}
                                        status={item.status}
                                        thumbnailUrl={item.thumbnailUrl}
                                        alt={t('thumbAlt', { index: i + 1 })}
                                        fill
                                        className="object-cover"
                                        sizes="25vw"
                                    />
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                        {feedHref && (
                            <Link href={feedHref} className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                                {t('seeInFeed')}
                            </Link>
                        )}
                        {state === 'posted' && (
                            <>
                                <Button type="button" variant="ghost" size="lg" onClick={onEditAction}>
                                    <Pencil aria-hidden="true" />
                                    {t('edit')}
                                </Button>
                                <Button type="button" variant="ghost" size="lg" onClick={onDeleteAction}>
                                    <Trash2 aria-hidden="true" />
                                    {t('delete')}
                                </Button>
                            </>
                        )}
                    </div>
                </>
            )}
        </section>
    );
}
```

The feed link is a `Link` styled with `buttonVariants`, as `VendorListRow` does.

- [ ] **Step 4: Write the section hook**

`hooks/useSneakPeekSection.ts`:

```ts
'use client';

import { useCallback, useMemo, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useEventMedia } from '@/hooks/useMedia';
import { useModuleReadable } from '@/hooks/useModuleReadable';
import { type SneakPeekSubmit } from '@/hooks/useSneakPeekSheet';
import { useCreateSneakPeek, useDeleteSneakPeek, useUpdateSneakPeek } from '@/hooks/useSneakPeek';
import type { SneakPeekRequestDto, VendorMeDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';
import { sneakPeekCandidates, sneakPeekState } from '@/lib/sneakPeek';
import { useActiveEvent, useActiveMember } from '@/providers/EventProvider';

// The vendor page's Sneak peek section: its state, the sheet and the delete confirmation.
// `hasProAlbum` is the page's own gate (type, vendors and gallery modules); the sneak peek also needs posts.
export function useSneakPeekSection(eventId: string, me: VendorMeDto | null, hasProAlbum: boolean) {
    const toErrorMessage = useApiErrorMessage();
    const activeEvent = useActiveEvent();
    const activeMember = useActiveMember();
    const postsReadable = useModuleReadable(eventId, 'posts');
    const applies = Boolean(me?.sneakPeek) && hasProAlbum && postsReadable;
    // The same query as the Pro album section: one cache, prefetched with the page.
    const pro = useEventMedia(applies ? eventId : null, 'PRO');
    const create = useCreateSneakPeek(eventId);
    const update = useUpdateSneakPeek(eventId);
    const remove = useDeleteSneakPeek(eventId);
    const [sheet, setSheet] = useState<'new' | 'edit' | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const candidates = useMemo(() => sneakPeekCandidates(pro.data?.pages.flatMap((page) => page.content) ?? [], activeMember?.id), [activeMember?.id, pro.data?.pages]);
    const state = applies ? sneakPeekState(me, activeEvent?.startAt, candidates.length > 0 || Boolean(pro.hasNextPage)) : 'hidden';
    const summary = me?.sneakPeek ?? null;
    const thumbnails = useMemo(
        () => (summary?.mediaIds ?? []).map((id) => candidates.find((item) => item.id === id)).filter((item) => item !== undefined).slice(0, 4),
        [candidates, summary?.mediaIds],
    );

    const openNew = useCallback(() => {
        setError(null);
        setSheet('new');
    }, []);
    const openEdit = useCallback(() => {
        setError(null);
        setSheet('edit');
    }, []);
    const closeSheet = useCallback(() => setSheet(null), []);

    const submit = useCallback(
        async (body: SneakPeekSubmit) => {
            setError(null);
            try {
                if (sheet === 'new') await create.mutateAsync(body as SneakPeekRequestDto);
                else await update.mutateAsync(body);
                setSheet(null);
            } catch (submitError) {
                setError(toErrorMessage(submitError));
            }
        },
        [create, sheet, toErrorMessage, update],
    );

    const requestDelete = useCallback(() => setConfirmDelete(true), []);
    const cancelDelete = useCallback(() => setConfirmDelete(false), []);
    const confirmRemove = useCallback(async () => {
        try {
            await remove.mutateAsync();
        } finally {
            setConfirmDelete(false);
        }
    }, [remove]);

    const { fetchNextPage } = pro;
    const loadMore = useCallback(() => {
        void fetchNextPage();
    }, [fetchNextPage]);

    return {
        visible: state !== 'hidden',
        state,
        thumbnails,
        feedHref: summary?.postId ? routes.events.feed(eventId, { post: summary.postId }) : null,
        candidates,
        hasMore: Boolean(pro.hasNextPage),
        loadMore,
        sheet,
        initialPicked: sheet === 'edit' ? (summary?.mediaIds ?? []) : [],
        initialCaption: sheet === 'edit' ? (summary?.content ?? null) : null,
        openNew,
        openEdit,
        closeSheet,
        submit,
        isSaving: create.isPending || update.isPending,
        error,
        confirmDelete,
        requestDelete,
        cancelDelete,
        confirmRemove,
        isDeleting: remove.isPending,
    };
}
```

A failed delete closes the modal and the section stays as it was; the generic post delete and this endpoint never fail for a valid vendor in the window, so no error line is added for it.

- [ ] **Step 5: Wire it into `VendorMeScreen`**

In `components/vendors/me/VendorMeScreen.tsx`:

- Import `SneakPeekSection`, `SneakPeekSheet`, `useSneakPeekSection`, and `useTranslations('Vendors.sneakPeek')` as `tSneakPeek`.
- After `const services = …`:

```tsx
    const sneakPeek = useSneakPeekSection(eventId, me, page.hasProAlbum);
```

- `hasEventWork` gains `|| sneakPeek.visible`.
- In the event group, between `{/* Tools */}` and `{/* Print order */}`:

```tsx
                            {/* Sneak peek */}
                            {sneakPeek.visible && sneakPeek.state !== 'hidden' && (
                                <SneakPeekSection
                                    state={sneakPeek.state}
                                    thumbnails={sneakPeek.thumbnails}
                                    feedHref={sneakPeek.feedHref}
                                    onChooseAction={sneakPeek.openNew}
                                    onEditAction={sneakPeek.openEdit}
                                    onDeleteAction={sneakPeek.requestDelete}
                                />
                            )}
```

- After `{/* Service sheet */}`'s block:

```tsx
            {/* Sneak peek sheet */}
            {sneakPeek.sheet && (
                <SneakPeekSheet
                    key={sneakPeek.sheet}
                    open
                    mode={sneakPeek.sheet}
                    items={sneakPeek.candidates}
                    initialPicked={sneakPeek.initialPicked}
                    initialCaption={sneakPeek.initialCaption}
                    hasMore={sneakPeek.hasMore}
                    isSaving={sneakPeek.isSaving}
                    error={sneakPeek.error}
                    onLoadMoreAction={sneakPeek.loadMore}
                    onSubmitAction={sneakPeek.submit}
                    onCloseAction={sneakPeek.closeSheet}
                />
            )}

            {/* Sneak peek delete confirmation */}
            <ConfirmActionModal
                open={sneakPeek.confirmDelete}
                onCloseAction={sneakPeek.cancelDelete}
                onConfirmAction={sneakPeek.confirmRemove}
                title={tSneakPeek('deleteTitle')}
                body={tSneakPeek('deleteBody')}
                confirmLabel={tSneakPeek('deleteConfirm')}
                cancelLabel={tSneakPeek('deleteCancel')}
                isConfirming={sneakPeek.isDeleting}
            />
```

In `VendorMeScreen.test.tsx`, mock `@/hooks/useSneakPeekSection` the way the file mocks `useVendorPrintsSection` (a `visible: false` default), and add one case: with `{ visible: true, state: 'ready', … }` the screen shows "Sneak peek" and "Choose photos".

- [ ] **Step 6: Run the tests**

Run: `npx vitest run components/vendors/me`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add hooks/useSneakPeekSection.ts components/vendors/me
git commit -m "feat(vendors): sneak peek section on the vendor page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: The Reach section on the vendor page

**Files:**
- Create: `hooks/useReachSection.ts`, `components/vendors/me/ReachSection.tsx`, `components/vendors/me/ReachSection.test.tsx`
- Modify: `components/vendors/me/VendorMeScreen.tsx`, `components/vendors/me/VendorMeScreen.test.tsx`, `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Add the copy**

`messages/en.json`, `Vendors.reach`:

```json
"reach": {
    "title": "Reach",
    "tiles": {
        "guests": "Guests",
        "proViewers": "Saw your Pro work",
        "proViews": "Pro views",
        "postViewers": "Saw your posts",
        "reactions": "Reactions",
        "comments": "Comments",
        "listTaps": "Opened your details",
        "partnerCardTaps": "Partner card taps"
    },
    "partnerLine": "Partners see the full report.",
    "partnerAction": "Become a partner",
    "loadFailed": "Couldn't load your reach."
}
```

`messages/el.json`, `Vendors.reach`:

```json
"reach": {
    "title": "Απήχηση",
    "tiles": {
        "guests": "Καλεσμένοι",
        "proViewers": "Είδαν τη δουλειά σας",
        "proViews": "Προβολές Pro",
        "postViewers": "Είδαν τις αναρτήσεις σας",
        "reactions": "Αντιδράσεις",
        "comments": "Σχόλια",
        "listTaps": "Άνοιξαν τα στοιχεία σας",
        "partnerCardTaps": "Πατήματα στην κάρτα συνεργάτη"
    },
    "partnerLine": "Οι συνεργάτες βλέπουν την πλήρη αναφορά.",
    "partnerAction": "Γίνετε συνεργάτης",
    "loadFailed": "Δεν ήταν δυνατή η φόρτωση της απήχησης."
}
```

- [ ] **Step 2: Write the failing component test**

`components/vendors/me/ReachSection.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReachSection } from '@/components/vendors/me/ReachSection';
import messages from '@/messages/en.json';

function renderSection(overrides: Partial<Parameters<typeof ReachSection>[0]> = {}) {
    const props = {
        tiles: [
            { key: 'guests' as const, value: 1234 },
            { key: 'listTaps' as const, value: 8 },
        ],
        partner: false,
        showPartnerAction: false,
        isLoading: false,
        loadFailed: false,
        onBecomePartnerAction: vi.fn(),
        ...overrides,
    };
    render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <ReachSection {...props} />
        </NextIntlClientProvider>,
    );
    return props;
}

describe('ReachSection', () => {
    afterEach(cleanup);

    it('shows a non-partner two tiles and the partner line', () => {
        renderSection();
        expect(screen.getByText('Guests')).toBeInTheDocument();
        expect(screen.getByText('1,234')).toBeInTheDocument();
        expect(screen.getByText('Opened your details')).toBeInTheDocument();
        expect(screen.getByText('Partners see the full report.')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Become a partner' })).toBeNull();
    });

    it('offers to become a partner while the prompt is on', () => {
        const props = renderSection({ showPartnerAction: true });
        fireEvent.click(screen.getByRole('button', { name: 'Become a partner' }));
        expect(props.onBecomePartnerAction).toHaveBeenCalled();
    });

    it('shows a partner every tile and no line', () => {
        renderSection({
            partner: true,
            tiles: [
                { key: 'guests', value: 120 },
                { key: 'proViewers', value: 64 },
                { key: 'reactions', value: 33 },
            ],
        });
        expect(screen.getByText('Saw your Pro work')).toBeInTheDocument();
        expect(screen.queryByText('Partners see the full report.')).toBeNull();
    });

    it('says when it failed', () => {
        renderSection({ loadFailed: true, tiles: [] });
        expect(screen.getByText("Couldn't load your reach.")).toBeInTheDocument();
    });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run components/vendors/me/ReachSection.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 4: Write the section**

`components/vendors/me/ReachSection.tsx`:

```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { formatReachCount, type ReachTile } from '@/lib/vendorReach';

// The vendor's reach in this event. Every number has one tile and is not restated anywhere else on the page.
export function ReachSection({
    tiles,
    partner,
    showPartnerAction,
    isLoading,
    loadFailed,
    onBecomePartnerAction,
}: {
    tiles: ReachTile[];
    partner: boolean;
    showPartnerAction: boolean;
    isLoading: boolean;
    loadFailed: boolean;
    onBecomePartnerAction: () => void;
}) {
    const t = useTranslations('Vendors.reach');
    const locale = useLocale();

    return (
        <section aria-labelledby="vendor-reach-title" aria-busy={isLoading || undefined} className="flex flex-col gap-3">
            {/* Title */}
            <h3 id="vendor-reach-title" className="text-sm font-semibold text-ink">
                {t('title')}
            </h3>

            {/* Tiles */}
            {loadFailed ? (
                <p className="text-sm text-ink-muted">{t('loadFailed')}</p>
            ) : isLoading ? (
                <div className="grid grid-cols-2 gap-2">
                    <div className="h-16 animate-pulse rounded-xl bg-surface-muted" />
                    <div className="h-16 animate-pulse rounded-xl bg-surface-muted" />
                </div>
            ) : (
                <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {tiles.map((tile) => (
                        <div key={tile.key} className="rounded-xl bg-surface-muted px-3 py-2.5">
                            <dt className="text-xs text-ink-muted">{t(`tiles.${tile.key}`)}</dt>
                            <dd className="mt-0.5 text-lg font-bold text-ink tabular-nums">{formatReachCount(locale, tile.value)}</dd>
                        </div>
                    ))}
                </dl>
            )}

            {/* Partner */}
            {!partner && !loadFailed && !isLoading && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="text-sm text-ink-muted">{t('partnerLine')}</p>
                    {showPartnerAction && (
                        <Button type="button" variant="link" size="sm" className="px-0" onClick={onBecomePartnerAction}>
                            {t('partnerAction')}
                        </Button>
                    )}
                </div>
            )}
        </section>
    );
}
```

If `Button` has no `link` variant, use `variant="ghost"`.

- [ ] **Step 5: Write the section hook**

`hooks/useReachSection.ts`:

```ts
'use client';

import { useMemo } from 'react';

import { useBecomePartner } from '@/hooks/useBecomePartner';
import { useVendorReach } from '@/hooks/useVendorReach';
import type { VendorMeDto } from '@/lib/api/types';
import { reachTiles } from '@/lib/vendorReach';

// The vendor page's Reach section: every vendor row has one, before and after access ends.
export function useReachSection(eventId: string, me: VendorMeDto | null) {
    const reach = useVendorReach(eventId, me !== null);
    const partnerSheet = useBecomePartner();
    const tiles = useMemo(() => (reach.data ? reachTiles(reach.data) : []), [reach.data]);

    return {
        visible: me !== null,
        tiles,
        partner: reach.data?.partner ?? false,
        showPartnerAction: me?.showPartnerPrompt ?? false,
        isLoading: reach.isLoading,
        loadFailed: reach.isError,
        partnerSheet,
    };
}
```

- [ ] **Step 6: Wire it into `VendorMeScreen`**

- Import `ReachSection`, `useReachSection`, and `BecomePartnerSheet` from `@/components/vendors/BecomePartnerSheet`.
- After the `sneakPeek` line: `const reach = useReachSection(eventId, me);`
- `hasEventWork` gains `|| reach.visible`.
- In the event group, after `{/* Pro album */}`'s block:

```tsx
                            {/* Reach */}
                            {reach.visible && (
                                <ReachSection
                                    tiles={reach.tiles}
                                    partner={reach.partner}
                                    showPartnerAction={reach.showPartnerAction}
                                    isLoading={reach.isLoading}
                                    loadFailed={reach.loadFailed}
                                    onBecomePartnerAction={reach.partnerSheet.openSheet}
                                />
                            )}
```

- After the sneak peek delete confirmation:

```tsx
            {/* Partner sheet, from the Reach section */}
            <BecomePartnerSheet
                open={reach.partnerSheet.sheetOpen}
                defaults={reach.partnerSheet.defaults}
                search={reach.partnerSheet.search}
                onCloseAction={reach.partnerSheet.closeSheet}
            />
```

In `VendorMeScreen.test.tsx`, mock `@/hooks/useReachSection` (default `{ visible: false, … }`, `partnerSheet` with `sheetOpen: false` and no-op functions) and add a case where it shows "Reach" with a "Guests" tile.

- [ ] **Step 7: Run the tests**

Run: `npx vitest run components/vendors/me hooks/useVendorReach.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add hooks/useReachSection.ts components/vendors/me messages
git commit -m "feat(vendors): reach section on the vendor page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Reach in the partner portal

**Files:**
- Create: `components/partners/PartnerReachSection.tsx`, `components/partners/PartnerReachSection.test.tsx`
- Modify: `components/partners/PartnerPortalBoundary.tsx`, `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Add the copy**

`messages/en.json`, `PartnerPortalPage.reach`:

```json
"reach": {
    "title": "Reach",
    "events": "Events",
    "guests": "Guests",
    "proViews": "Pro views",
    "postViewers": "Saw your posts",
    "listTaps": "Opened your details",
    "recentTitle": "Recent events",
    "date": "Date",
    "type": "Type",
    "views": "Views",
    "empty": "No events as a vendor yet."
}
```

`messages/el.json`, `PartnerPortalPage.reach`:

```json
"reach": {
    "title": "Απήχηση",
    "events": "Εκδηλώσεις",
    "guests": "Καλεσμένοι",
    "proViews": "Προβολές Pro",
    "postViewers": "Είδαν τις αναρτήσεις σας",
    "listTaps": "Άνοιξαν τα στοιχεία σας",
    "recentTitle": "Πρόσφατες εκδηλώσεις",
    "date": "Ημερομηνία",
    "type": "Τύπος",
    "views": "Προβολές",
    "empty": "Δεν υπάρχουν ακόμη εκδηλώσεις ως συντελεστής."
}
```

- [ ] **Step 2: Write the failing test**

`components/partners/PartnerReachSection.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { PartnerReachSection } from '@/components/partners/PartnerReachSection';
import type { PartnerPortalReachDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const REACH: PartnerPortalReachDto = {
    events: 2,
    guests: 240,
    proViews: 812,
    postViewers: 150,
    listTaps: 19,
    recent: [{ startAt: '2026-10-10T16:00:00Z', vendorType: 'PHOTOGRAPHER', guests: 120, views: 400 }],
};

function renderSection(reach: PartnerPortalReachDto) {
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
            <PartnerReachSection reach={reach} />
        </NextIntlClientProvider>,
    );
}

describe('PartnerReachSection', () => {
    afterEach(cleanup);

    it('shows the totals and the recent events without titles', () => {
        renderSection(REACH);
        expect(screen.getByText('812')).toBeInTheDocument();
        expect(screen.getByText('Recent events')).toBeInTheDocument();
        expect(screen.getByText('400')).toBeInTheDocument();
        expect(screen.getAllByRole('row')).toHaveLength(2);
    });

    it('says when they were never a vendor', () => {
        renderSection({ events: 0, guests: 0, proViews: 0, postViewers: 0, listTaps: 0, recent: [] });
        expect(screen.getByText('No events as a vendor yet.')).toBeInTheDocument();
        expect(screen.queryByRole('table')).toBeNull();
    });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run components/partners/PartnerReachSection.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 4: Write the section**

`components/partners/PartnerReachSection.tsx`:

```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';

import type { PartnerPortalReachDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';
import { formatReachCount } from '@/lib/vendorReach';

const TOTALS = ['events', 'guests', 'proViews', 'postViewers', 'listTaps'] as const;

// The partner's reach across their events as a vendor. Rows carry a date and a type, never an event's name (KAN-28).
export function PartnerReachSection({ reach }: { reach: PartnerPortalReachDto }) {
    const t = useTranslations('PartnerPortalPage.reach');
    const tVendors = useTranslations('Vendors');
    const locale = useLocale();

    return (
        <section aria-labelledby="partner-reach-title" className="pt-10">
            {/* Title */}
            <h2 id="partner-reach-title" className="text-base font-bold text-ink">
                {t('title')}
            </h2>

            {reach.events === 0 ? (
                <p className="mt-4 rounded-lg bg-surface-muted/55 p-4 text-sm text-ink-muted">{t('empty')}</p>
            ) : (
                <>
                    {/* Totals */}
                    <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                        {TOTALS.map((key) => (
                            <div key={key} className="rounded-lg bg-surface-muted/55 p-4">
                                <dt className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{t(key)}</dt>
                                <dd className="mt-2 text-2xl font-bold text-ink tabular-nums">{formatReachCount(locale, reach[key])}</dd>
                            </div>
                        ))}
                    </dl>

                    {/* Recent events */}
                    <h3 className="mt-6 text-sm font-semibold text-ink">{t('recentTitle')}</h3>
                    <div className="mt-3 overflow-x-auto rounded-lg bg-card shadow-sm ring-1 ring-border">
                        <table className="w-full min-w-[480px] text-left text-sm">
                            <thead className="bg-surface-muted/70 text-xs font-semibold tracking-wide text-ink-muted uppercase">
                                <tr>
                                    <th scope="col" className="px-4 py-3">
                                        {t('date')}
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        {t('type')}
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-right">
                                        {t('guests')}
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-right">
                                        {t('views')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {reach.recent.map((row, i) => (
                                    <tr key={`${row.startAt}-${i}`}>
                                        <td className="px-4 py-3 text-ink">{formatDate(locale, row.startAt, { dateStyle: 'medium' })}</td>
                                        <td className="px-4 py-3 text-ink">{tVendors(`types.${row.vendorType}`)}</td>
                                        <td className="px-4 py-3 text-right text-ink tabular-nums">{formatReachCount(locale, row.guests)}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-ink tabular-nums">{formatReachCount(locale, row.views)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </section>
    );
}
```

`Vendors.types.*` holds the type names the vendor list uses; if the key path differs, use the one `VendorRow` reads.

- [ ] **Step 5: Show it in the portal**

In `PartnerPortalBoundary.tsx`, import `PartnerReachSection` and add after the `{/* Totals */}` section, inside the same container:

```tsx
                {/* Reach */}
                <PartnerReachSection reach={portal.data.reach} />
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run components/partners`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/partners messages
git commit -m "feat(partners): reach totals and recent events in the portal

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Copy review, full checks, visual check

**Files:**
- Modify: `messages/en.json`, `messages/el.json` (only if the copy review changes words)

- [ ] **Step 1: Review the copy**

Run the `design:ux-copy` skill on every string this plan added (`Vendors.sneakPeek`, `Vendors.reach`, `PostCard.sneakPeek`, `NotificationsPage.types.SNEAK_PEEK_POSTED`/`VENDOR_REACH_SUMMARY`, `PartnerPortalPage.reach`, the three `ApiErrors`) and the backend's `notification.sneak_peek.*` and `notification.vendor.reach.*`. Keep keys and placeholders; change words only. Greek keeps συντελεστής, συνεργάτης, διοργανωτής and «Πρώτη ματιά». Show the user the final en and el wording before committing it (spec "Legal": copy reviewed before release). If a backend string changes, note it for the backend branch.

- [ ] **Step 2: Run every check**

```bash
npm run lint
npx tsc --noEmit
npm test
```

Expected: all clean. The messages parity test (en and el have the same keys) covers the new objects.

- [ ] **Step 3: Check it on screen**

With the backend branch's `bootRun` on `:8080` and `npm run dev` on `:3000` in a terminal, open `preview_start {url: "http://localhost:3000/"}` and sign in with the user's local test login (ask for it). At 375 px wide (vendor and guest screens are mobile-first), then at desktop width:

1. As a photographer in an event that has started, with Pro items: the vendor page shows Sneak peek "ready" and Reach. Share three items with a caption. The section shows the thumbnails, Edit, Delete and the link.
2. Open the feed: the post is pinned, labelled "Sneak peek", tinted like an announcement; the thumbnails open the viewer with the Pro credit.
3. As a guest: the notification is in the list with the business name; tapping it opens the post over the feed. Scroll past the post slowly, open one Pro item, wait 10 s; as the photographer the Reach numbers (partner account) went up after a reload.
4. As the host: unpin and delete the post from the feed. The photographer's section now says it was used.
5. The partner portal link of a partner whose email matches the photographer: the Reach section shows totals and a row with date, type, guests and views, and no event title.

Look for overlap, cramped tiles and section separation at both widths. Fix what is off, then rerun Step 2.

- [ ] **Step 4: SEO check**

No new routes. `docs/seo-guidelines.md` has no rule for the vendor page, the feed or the partner portal (all private and `noindex`). Confirm the portal page's metadata did not change. No blockers.

- [ ] **Step 5: Commit and hand back**

```bash
git add -A
git commit -m "chore(vendors): sneak peek and reach copy review

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Skip the commit if Step 1 changed nothing. Do not push. Tell the user the branch is ready, what was checked on screen, and ask whether to push and open the PR into `staging` (after the backend PR merges, since the feed and vendor page call the new endpoints).
