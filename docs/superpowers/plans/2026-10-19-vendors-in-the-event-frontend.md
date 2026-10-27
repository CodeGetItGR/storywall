# Vendors in the event — frontend implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the StoryWall screens for vendors in the event: Manage → Vendors for hosts, the vendor list for guests, each vendor type's tools, the vendor badge, the vendor profile, "Become a partner", the Pro album with its storage meter, the checkout and invite lines, the `VENDOR_JOINED` notification and the admin pieces.

**Architecture:** One hook module (`hooks/useVendors.ts`) owns every vendor query key and call; screens are thin shells over focused hooks, as `CLAUDE.md` asks. Vendor tool access is one question, `useHasVendorCapability(eventId, capability)`, answered from `GET /api/events/{eventId}/vendors/me`. Shared host screens (schedule, QR links, RSVP report) open to vendors through a new `EventRouteGate` prop instead of new copies of those screens. New pages prefetch on the server and hydrate, with keys exported from the hooks.

**Tech Stack:** Next.js App Router, React 19, TanStack Query v5, next-intl (`messages/en.json`, `messages/el.json`), Tailwind, Vitest + Testing Library, `qrcode.react`.

**Spec:** [2026-10-19-vendors-in-the-event-design.md](../specs/2026-10-19-vendors-in-the-event-design.md). Backend plan: [2026-10-19-vendors-in-the-event-backend.md](2026-10-19-vendors-in-the-event-backend.md). Start this plan only after the backend branch is merged into `staging`: every hook here calls an endpoint from it.

---

## Where and how

- Repository: this one (`storywall`). Work in a worktree cut from the latest `staging`:
  ```bash
  git fetch origin
  git worktree add .claude/worktrees/vendors-fe -b feat/vendors-fe origin/staging
  cd .claude/worktrees/vendors-fe
  ```
  If the lockfile matches the main checkout, link `node_modules` with a junction instead of installing (see the memory note on worktree `node_modules`).
- Run one test file: `npx vitest run hooks/useVendors.test.tsx`. Run all: `npm test`. Types: `npm run type:check`. Lint: `npm run lint`.
- Commit after every task. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not push or open the PR until the user says so. The PR goes into `staging`.
- `CLAUDE.md` rules apply throughout: thin pages, logic in hooks and `lib/`, a JSX comment above every visual section, every visible string localized in en and el, plain short copy, confirmation modals for resets and removals, server prefetch for route-derivable data, `React.SubmitEvent` for submit handlers.
- Visual checks need a signed-in browser on `:3000` against the local Spring backend (see the memory notes on the browser pane and local CORS). Use `preview_start {url: "http://localhost:3000/"}` only; never `preview_start {name}` in this repo.

## Numbers to re-check before you start

The backend plan uses migration `V176` and the error codes below. If the backend took other numbers, use those here.

| Code | Number | HTTP | Message key |
| --- | --- | --- | --- |
| `VENDOR_CAPABILITY_MISSING` | 4032 | 403 | `vendorCapabilityMissing` |
| `VENDOR_ACCESS_ENDED` | 4033 | 403 | `vendorAccessEnded` |
| `VENDOR_LIMIT_REACHED` | 5177 | 409 | `vendorLimitReached` |
| `VENDOR_IS_HOST` | 5178 | 409 | `vendorIsHost` |
| `ALREADY_A_VENDOR` | 5179 | 409 | `alreadyAVendor` |
| `PARTNER_APPLICATION_PENDING` | 5180 | 409 | `partnerApplicationPending` |

Before Task 2, open the merged backend DTOs (`VendorLinkDto`, `VendorRowDto`, `VendorMeDto`, `VendorProfileDto`, `MediaResponseDto.proCredit`, `EventUsageResponseDto`, `PartnerBrandingNoticeDto`, `PlaylistSuggestionLeaderboardDto`, `AuthorDto`) and check the field names against Task 2. The backend plan allowed `VendorLinkDto.createdAt` to be dropped; if it was, drop it here too.

## Decisions this plan settles

Confirmed with the user on 2026-10-19: items 1, 2, 3 and 4.

1. **Announcements:** there is no composer today, so this plan builds a small one at `/events/[eventId]/tools/announcement` for hosts and planners. It is a message box only: posts have no title field, so the "title + message" in the question became message only. It creates an `ANNOUNCEMENT` post (`isPinned: false`) and returns to the feed. Hosts reach it from the host menu, planners from the tools menu and their vendor page. Announcement posts get no special look in the feed in this phase.
2. **Vendor page:** `/events/[eventId]/tools/vendors/me`, with a "Your vendor page" entry in the tools menu for vendors. `/events/[eventId]/tools/vendors` stays the vendor list for every member.
3. **Pro tab:** follows the gallery rule. Hosts always see the gallery; guests only when it is open to them. The Pro tab shows inside the gallery whenever the event has Pro items. Photographers manage their own Pro items on their vendor page, so a closed gallery never locks them out of their work.
4. **DJ live list:** a new page at `/events/[eventId]/tools/playlist/live`, for hosts and `MUSIC` vendors, linked from the playlist screen and the tools menu. Rows keep the server's rank; played rows are dimmed with a check, so marking a song never reorders the list.
5. **Manage → Vendors** is its own page at `/events/[eventId]/manage/vendors` (the `VENDOR_JOINED` notification links there), reached from the host menu, like the QR links page. It is not a section of the Manage tab list.
6. **Tool access** reads `GET …/vendors/me`. A tool is open when `accessOpen` is true and `capabilities` contains it (the backend returns the type's capabilities even after the window closes). A 404 means "not a vendor".
7. **Menu entries:** every vendor gets "Your vendor page". Planners also get "Announcement", "RSVP report" and "Share links"; `MUSIC` vendors get "Live requests". Photographers and videographers do their Pro work on their vendor page. After the access window only "Your vendor page" stays. Schedule is already in every member's menu; planners can edit inside it.
8. **Shared host screens** open to vendors through `EventRouteGate`'s new `allowVendorCapability` prop. Inside, host-only calls (QR stats, usage, upgrade options, the PDF export) are skipped for vendors, and edit controls stay hidden.
9. **Planner RSVP report:** the existing report page, opened with `?from=vendor` so Close returns to the vendor page. The download button is hidden for vendors (the PDF export stays host-only). The backend nulls `phone`.
10. **First-join profile sheet:** opens on the event feed for a vendor whose `profileComplete` is false. It can be closed, and opens again on the next visit until filled in. A vendor without a profile is not listed for guests (the backend filters them out).
11. **Vendor badge:** a chip with the vendor type, in place of the member-role chip, on posts, comments and replies by vendors (`AuthorDto.vendorType`, backend Task 15b). It shows whatever the list visibility.
12. **Pro media list key:** `mediaKeys.proList(eventId)` = `['events', eventId, 'media', 'PRO']`, under the existing gallery key, so every existing `mediaKeys.list` invalidation also refreshes the Pro list. The guest list keeps today's key and URL, so the gallery prefetch is unchanged.
13. **Pro meter:** its own small component, not a `UsagePanel` row: going over the Pro allowance is normal (it spills into event storage), so it must not turn red. It shows in two places, as the spec says: next to event storage on the host's right panel, and on the photographer's vendor page above the Pro upload. Admin gets no Pro meter: the spec asks only for the read-only vendor list there, and the backend adds no Pro fields to the admin usage DTO.
14. **Become a partner** reuses `useForBusinessApplication`, which gains an optional `search` so the sheet sends `utm_source=storywall-vendor&utm_medium=<TYPE>` without touching the address bar. Nothing personal goes in a URL.
15. **Admin:** the plan grid gets number fields for `maxVendors`, `accessDaysAfterEvent` and `proStorageBytes`; `allowedTypes` stays in the existing Advanced JSON field. The admin event detail gets a read-only vendors card (type, business name, joined date).
16. **SEO:** every new route is under `/events/[eventId]/…`, already private and noindex. No blockers.
17. **Existing guest on a vendor link:** the invite page normally sends a signed-in member straight to the feed. On a vendor link it skips that and shows Join, because joining is what makes the guest the vendor (backend promotes the membership).

## File structure

New:

| File | Responsibility |
| --- | --- |
| `lib/vendors.ts` | Type order, capability check, invite URL, apply search, Pro storage arithmetic, link validation |
| `hooks/useVendors.ts` | Query keys and every `/vendors` call |
| `hooks/useVendorProfile.ts` | Vendor profile query, save, logo, prompt dismissal |
| `hooks/useVendorProfileForm.ts` | Profile sheet form state and validation |
| `hooks/useManageVendors.ts` | Manage → Vendors page state (sheet, confirmations) |
| `hooks/useVendorMePage.ts` | Vendor page data and actions |
| `hooks/useProAlbum.ts` | Pro list, Pro upload, own-item deletion |
| `hooks/usePlaylistLive.ts` | Live list data and the played toggle |
| `hooks/useAnnouncementComposer.ts` | Composer state and submit |
| `hooks/useBecomePartner.ts` | Partner sheet prefill and submit |
| `hooks/useVendorProfilePrompt.ts` | When the first-join sheet opens |
| `hooks/useGalleryAlbum.ts` | The gallery's Guests / Pro tab in `?album=` |
| `hooks/useCanEditSchedule.ts` | Hosts and planners edit the schedule |
| `components/vendors/VendorLogo.tsx`, `VendorsSkeletons.tsx`, `ProCreditLine.tsx` | Logo, loading rows, the Pro credit line |
| `components/vendors/manage/*` | `ManageVendorsScreen`, `VendorLinkRow`, `VendorLinkQrModal`, `VendorRow`, `VendorSheet` |
| `components/vendors/list/*` | `VendorListScreen`, `VendorListRow` |
| `components/vendors/me/*` | `VendorMeScreen`, `VendorToolLinks`, `ProAlbumSection`, `VendorListingSection`, `PartnerPromptCard` |
| `components/vendors/VendorProfileSheet.tsx`, `VendorProfilePrompt.tsx`, `BecomePartnerSheet.tsx`, `ProStorageMeter.tsx` | Sheets and the meter |
| `components/playlist/live/*` | `PlaylistLiveScreen`, `PlaylistLiveRow` |
| `components/announcement/AnnouncementScreen.tsx` | Composer |
| `components/profile/ProfileVendorSection.tsx` | Profile page section |
| `components/admin/events/EventVendorsSection.tsx` | Admin read-only card |
| Routes: `manage/vendors`, `tools/vendors`, `tools/vendors/me`, `tools/playlist/live`, `tools/announcement` | `page.tsx` (prefetch), `PageClient.tsx` (gate), `loading.tsx` each |

Modified: `lib/api/types.ts`, `lib/api/endpoints.ts`, `lib/api/errors.ts`, `lib/api/errorMessageKeys.ts`, `lib/routes.ts`, `lib/notifications.ts`, `lib/rsvpReport.ts`, `lib/planModuleConfig.ts`, `lib/forBusinessApplication.ts`, `hooks/useForBusinessApplication.ts`, `hooks/useMedia.ts`, `hooks/useGalleryScreen.ts`, `hooks/useToolsMenuItems.ts`, `hooks/usePlaylist.ts`, `hooks/useRsvpReportPage.ts`, `hooks/useAdminEvents.ts` (`useAdminEventVendors`), `components/routing/EventRouteGate.tsx`, `components/memberRoles/AuthorRoleChip.tsx`, `components/gallery/GalleryScreen.tsx`, `components/gallery/GalleryViewer.tsx`, `components/schedule/ScheduleScreen.tsx`, `components/manage/invitations/InvitationsQrScreen.tsx`, `components/manage/rsvp/RsvpReportScreen.tsx`, `components/manage/rsvp/RsvpReportActions.tsx`, `components/playlist/PlaylistContent.tsx`, `components/playlist/PlaylistScreen.tsx`, `components/checkout/PartnerBrandingNotice.tsx`, `components/notifications/NotificationRow.tsx`, `components/layout/right-context-panel/HostContextSections.tsx`, `components/admin/events/EventDetail.tsx`, `components/profile/ProfileContent.tsx`, `app/(main)/invite/[token]/InviteOnboardingBoundary.tsx`, `app/(main)/(app)/(event)/events/[eventId]/feed/FeedPageContent.tsx`, the gallery, QR and RSVP report `PageClient.tsx` files, `tools/gallery/(root)/page.tsx`, `messages/en.json`, `messages/el.json`.

Paths below shorten `app/(main)/(app)/(event)/events/[eventId]` to `EVENT/`.

---

### Task 1: Worktree and baseline

**Files:** none.

- [ ] **Step 1: Create the worktree** with the commands in "Where and how".

- [ ] **Step 2: Confirm the backend is in `staging`**

Run: `git log origin/staging --oneline -5` in the Spring repo (`C:\Users\User\IdeaProjects\event_social_media`) and check that the vendors PR is merged. If it is not, stop and tell the user: every hook here needs those endpoints.

- [ ] **Step 3: Baseline**

Run: `npm run type:check && npm run lint && npm test`
Expected: all clean. Write down the test count; it must only grow.

---

### Task 2: API types, endpoints and error codes

**Files:**
- Modify: `lib/api/types.ts`, `lib/api/endpoints.ts`, `lib/api/errors.ts`, `lib/api/errorMessageKeys.ts`, `messages/en.json`, `messages/el.json`
- Test: `lib/api/vendorEndpoints.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import { endpoints } from '@/lib/api/endpoints';
import { ERROR_CODES } from '@/lib/api/errors';
import { getApiErrorMessageKey } from '@/lib/api/errorMessageKeys';

describe('vendor endpoints', () => {
    it('builds every vendor path', () => {
        expect(endpoints.events.vendors('e1')).toBe('/api/events/e1/vendors');
        expect(endpoints.events.vendorLinks('e1')).toBe('/api/events/e1/vendors/links');
        expect(endpoints.events.vendorLinkReset('e1', 'PHOTOGRAPHER')).toBe('/api/events/e1/vendors/links/PHOTOGRAPHER/reset');
        expect(endpoints.events.vendorMe('e1')).toBe('/api/events/e1/vendors/me');
        expect(endpoints.events.vendorById('e1', 'v1')).toBe('/api/events/e1/vendors/v1');
        expect(endpoints.events.vendorClicks('e1', 'v1')).toBe('/api/events/e1/vendors/v1/clicks');
        expect(endpoints.events.playlistSuggestionPlayed('e1', 's1')).toBe('/api/events/e1/playlist-suggestions/s1/played');
        expect(endpoints.me.vendorProfile).toBe('/api/me/vendor-profile');
        expect(endpoints.me.vendorProfileLogo).toBe('/api/me/vendor-profile/logo');
        expect(endpoints.me.vendorProfileDismissPartnerPrompt).toBe('/api/me/vendor-profile/dismiss-partner-prompt');
        expect(endpoints.admin.events.vendors('e1')).toBe('/api/admin/events/e1/vendors');
    });

    it('maps every vendor error code to a message key', () => {
        expect(getApiErrorMessageKey(ERROR_CODES.VENDOR_CAPABILITY_MISSING)).toBe('vendorCapabilityMissing');
        expect(getApiErrorMessageKey(ERROR_CODES.VENDOR_ACCESS_ENDED)).toBe('vendorAccessEnded');
        expect(getApiErrorMessageKey(ERROR_CODES.VENDOR_LIMIT_REACHED)).toBe('vendorLimitReached');
        expect(getApiErrorMessageKey(ERROR_CODES.VENDOR_IS_HOST)).toBe('vendorIsHost');
        expect(getApiErrorMessageKey(ERROR_CODES.ALREADY_A_VENDOR)).toBe('alreadyAVendor');
        expect(getApiErrorMessageKey(ERROR_CODES.PARTNER_APPLICATION_PENDING)).toBe('partnerApplicationPending');
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run lib/api/vendorEndpoints.test.ts`
Expected: FAIL, `endpoints.events.vendors is not a function`.

- [ ] **Step 3: Add the types**

`lib/api/types.ts`:

In `EVENT_MODULE_KEYS`, add `'vendors',` after `'he_or_she',`.

Change `MediaUploadContext` to:
```ts
export type MediaUploadContext = 'GALLERY' | 'STORY' | 'POST' | 'COVER' | 'PRO';
```

In `AuthorDto`, after `customRole`:
```ts
    // Set while the author is a vendor of this event (vendors spec 2026-10-19); null otherwise.
    vendorType?: PartnerRole | null;
```

In `MediaResponseDto`, after `deletedAt`:
```ts
    // GUEST unless a vendor uploaded it to the Pro album. Rows from before the vendors release have no field.
    collection?: MediaCollection;
    // The vendor credit on a Pro item ("Photo: Studio X"); null on guest items.
    proCredit?: ProCreditDto | null;
```

In `EventUsageResponseDto`, after `memberPercent`:
```ts
    // The Pro album allowance from the vendors module, and the bytes Pro items use. 0 without the module.
    proStorageBytes?: number;
    proUsedBytes?: number;
```

In `EventInvitationPreviewDto`, after `gift`:
```ts
    // A vendor link's type ("You're invited as the photographer."); null on every other link.
    vendorType?: PartnerRole | null;
```

In `PartnerBrandingNoticeDto`, after `noticeVersion`:
```ts
    // True when the plan has the vendors module and the partner has a vendor type: we'll email them a vendor link.
    vendorOffer?: boolean;
```

In `PlaylistSuggestionLeaderboardDto`:
```ts
export interface PlaylistSuggestionLeaderboardDto extends Omit<PlaylistSuggestionResponseDto, 'myVote'> {
    rank: number;
    // When the host or DJ marked it played; null while unplayed.
    playedAt?: string | null;
}
```

Change `NotificationCtaTarget` to:
```ts
export type NotificationCtaTarget = 'EVENT_PLAN_SETTINGS' | 'EVENT_GALLERY' | 'EVENT_GUESTS' | 'EVENT_COVERAGE_EXTEND' | 'EVENT_WISHBOOK' | 'EVENT_VENDORS';
```

After `PartnerBrandingNoticeDto`, add the vendor types:
```ts
// --- Vendors in the event (vendors spec 2026-10-19) ---

export type VendorCapability = 'PRO_ALBUM' | 'SCHEDULE_EDIT' | 'ANNOUNCE' | 'RSVP_REPORT' | 'QR_READ' | 'SONG_REQUESTS';
export type MediaCollection = 'GUEST' | 'PRO';

// GET /api/events/{eventId}/vendors/links — host only. Build the URL with routes.inviteToken.
export interface VendorLinkDto {
    vendorType: PartnerRole;
    inviteToken: string;
    createdAt: string | null;
}

// GET /api/events/{eventId}/vendors — any member. The two flags come only for hosts and for the vendor's own row.
export interface VendorRowDto {
    id: string;
    memberId: string;
    vendorType: PartnerRole;
    // Null for a host's view of a vendor who hasn't filled in their profile yet.
    businessName: string | null;
    link: string | null;
    logoUrl: string | null;
    joinedAt: string;
    hiddenByHost?: boolean;
    optedOut?: boolean;
}

// GET /api/events/{eventId}/vendors/me — 404 when the caller is not a vendor of the event.
export interface VendorMeDto {
    vendorId: string;
    vendorType: PartnerRole;
    // The type's tools. Still listed after the access window: check accessOpen too.
    capabilities: VendorCapability[];
    accessEndsAt: string | null;
    accessOpen: boolean;
    profileComplete: boolean;
    showPartnerPrompt: boolean;
    // Set only for types with the Pro album.
    proStorageBytes: number | null;
    proUsedBytes: number | null;
    // The caller's own list flags (their row is not in the guest list while hidden).
    optedOut: boolean;
    hiddenByHost: boolean;
}

// PATCH /api/events/{eventId}/vendors/{vendorId}: a host sends hiddenByHost, the vendor sends optedOut. Exactly one.
export interface VendorPatchDto {
    hiddenByHost?: boolean;
    optedOut?: boolean;
}

// GET/PUT /api/me/vendor-profile — GET is 404 until the first save.
export interface VendorProfileDto {
    businessName: string;
    vendorType: PartnerRole;
    link: string;
    logoUrl: string | null;
    partnerPromptDismissed: boolean;
}

export interface VendorProfileRequestDto {
    businessName: string;
    vendorType: PartnerRole;
    link: string;
}

export interface ProCreditDto {
    businessName: string | null;
    vendorType: PartnerRole;
}
```

- [ ] **Step 4: Add the endpoints**

`lib/api/endpoints.ts`, in `me` after `deletionRequests`:
```ts
        vendorProfile: '/api/me/vendor-profile',
        vendorProfileLogo: '/api/me/vendor-profile/logo',
        vendorProfileDismissPartnerPrompt: '/api/me/vendor-profile/dismiss-partner-prompt',
```

In `events`, after `playlistSuggestionsLeaderboard`:
```ts
        playlistSuggestionPlayed: (eventId: string, id: string) => `/api/events/${eventId}/playlist-suggestions/${id}/played`,
        // Vendors in the event (vendors spec 2026-10-19).
        vendors: (eventId: string) => `/api/events/${eventId}/vendors`,
        vendorLinks: (eventId: string) => `/api/events/${eventId}/vendors/links`,
        vendorLinkReset: (eventId: string, vendorType: string) => `/api/events/${eventId}/vendors/links/${encodeURIComponent(vendorType)}/reset`,
        vendorMe: (eventId: string) => `/api/events/${eventId}/vendors/me`,
        vendorById: (eventId: string, vendorId: string) => `/api/events/${eventId}/vendors/${vendorId}`,
        vendorClicks: (eventId: string, vendorId: string) => `/api/events/${eventId}/vendors/${vendorId}/clicks`,
```

In `admin.events`, after `partnerBranding`:
```ts
            vendors: (eventId: string) => `/api/admin/events/${eventId}/vendors`,
```

- [ ] **Step 5: Add the error codes and keys**

`lib/api/errors.ts`, in `ERROR_CODES` after `SESSION_NOT_YOURS: 4031,`:
```ts
    VENDOR_CAPABILITY_MISSING: 4032,
    VENDOR_ACCESS_ENDED: 4033,
    VENDOR_LIMIT_REACHED: 5177,
    VENDOR_IS_HOST: 5178,
    ALREADY_A_VENDOR: 5179,
    PARTNER_APPLICATION_PENDING: 5180,
```

`lib/api/errorMessageKeys.ts`: add to the `ApiErrorMessageKey` union after `| 'sessionNotYours'`:
```ts
    | 'vendorCapabilityMissing'
    | 'vendorAccessEnded'
    | 'vendorLimitReached'
    | 'vendorIsHost'
    | 'alreadyAVendor'
    | 'partnerApplicationPending'
```
and to `API_ERROR_MESSAGE_KEYS` after the `SESSION_NOT_YOURS` entry:
```ts
    [ERROR_CODES.VENDOR_CAPABILITY_MISSING]: 'vendorCapabilityMissing',
    [ERROR_CODES.VENDOR_ACCESS_ENDED]: 'vendorAccessEnded',
    [ERROR_CODES.VENDOR_LIMIT_REACHED]: 'vendorLimitReached',
    [ERROR_CODES.VENDOR_IS_HOST]: 'vendorIsHost',
    [ERROR_CODES.ALREADY_A_VENDOR]: 'alreadyAVendor',
    [ERROR_CODES.PARTNER_APPLICATION_PENDING]: 'partnerApplicationPending',
```

`messages/en.json`, in `ApiErrors`:
```json
"vendorCapabilityMissing": "This tool isn't part of your role.",
"vendorAccessEnded": "Your tools for this event have stopped.",
"vendorLimitReached": "This event has all the vendors it can take.",
"vendorIsHost": "You host this event, so you can't join it as a vendor.",
"alreadyAVendor": "You're already a vendor in this event.",
"partnerApplicationPending": "We already have your application. We'll reply by email."
```

`messages/el.json`, in `ApiErrors`:
```json
"vendorCapabilityMissing": "Αυτό το εργαλείο δεν ανήκει στον ρόλο σας.",
"vendorAccessEnded": "Τα εργαλεία σας για αυτή την εκδήλωση έχουν σταματήσει.",
"vendorLimitReached": "Η εκδήλωση έχει ήδη όσους επαγγελματίες χωράει.",
"vendorIsHost": "Είστε διοργανωτής αυτής της εκδήλωσης, οπότε δεν μπορείτε να μπείτε ως επαγγελματίας.",
"alreadyAVendor": "Είστε ήδη επαγγελματίας σε αυτή την εκδήλωση.",
"partnerApplicationPending": "Έχουμε ήδη την αίτησή σας. Θα σας απαντήσουμε με email."
```

- [ ] **Step 6: Run the test, types and the message parity test**

Run: `npx vitest run lib/api/vendorEndpoints.test.ts i18n/appMessages.test.ts && npm run type:check`
Expected: PASS, no type errors. A type error in a test fixture that builds one of the extended DTOs means the field was made required by mistake; every added field above is optional.

- [ ] **Step 7: Commit**

```bash
git add lib/api messages
git commit -m "feat(vendors): API types, endpoints and error codes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Routes, the notification link and `lib/vendors.ts`

**Files:**
- Create: `lib/vendors.ts`
- Modify: `lib/routes.ts`, `lib/notifications.ts`, `lib/rsvpReport.ts`
- Test: `lib/vendors.test.ts`, `lib/notifications.test.ts` (add a case), `lib/rsvpReport.test.ts` (add a case; create the file if it does not exist)

- [ ] **Step 1: Write the failing tests**

`lib/vendors.test.ts`:
```ts
import { describe, expect, it } from 'vitest';

import type { VendorMeDto } from '@/lib/api/types';
import { SITE_URL } from '@/lib/seo';
import {
    hasVendorCapability,
    isValidVendorLink,
    listedVendors,
    proStorageState,
    VENDOR_TYPES,
    vendorApplySearch,
    vendorInviteUrl,
} from '@/lib/vendors';

function me(overrides: Partial<VendorMeDto> = {}): VendorMeDto {
    return {
        vendorId: 'v1',
        vendorType: 'PLANNER',
        capabilities: ['ANNOUNCE', 'QR_READ', 'RSVP_REPORT', 'SCHEDULE_EDIT'],
        accessEndsAt: '2027-07-12T00:00:00Z',
        accessOpen: true,
        profileComplete: true,
        showPartnerPrompt: false,
        proStorageBytes: null,
        proUsedBytes: null,
        optedOut: false,
        hiddenByHost: false,
        ...overrides,
    };
}

describe('VENDOR_TYPES', () => {
    it('lists the eight partner roles once each', () => {
        expect(VENDOR_TYPES).toEqual(['PLANNER', 'VENUE', 'PHOTOGRAPHER', 'VIDEOGRAPHER', 'DECORATION', 'CATERING', 'MUSIC', 'OTHER']);
    });
});

describe('hasVendorCapability', () => {
    it('is true for a listed capability while access is open', () => {
        expect(hasVendorCapability(me(), 'ANNOUNCE')).toBe(true);
    });

    it('is false for a capability the type lacks', () => {
        expect(hasVendorCapability(me(), 'PRO_ALBUM')).toBe(false);
    });

    it('is false once access has closed', () => {
        expect(hasVendorCapability(me({ accessOpen: false }), 'ANNOUNCE')).toBe(false);
    });

    it('is false for someone who is not a vendor', () => {
        expect(hasVendorCapability(null, 'ANNOUNCE')).toBe(false);
        expect(hasVendorCapability(undefined, 'ANNOUNCE')).toBe(false);
    });
});

describe('vendorInviteUrl', () => {
    it('is the site URL plus the invite path', () => {
        expect(vendorInviteUrl('tok')).toBe(`${SITE_URL}/invite/tok`);
    });
});

describe('vendorApplySearch', () => {
    it('carries the source and the type, nothing personal', () => {
        expect(vendorApplySearch('PHOTOGRAPHER')).toBe('?utm_source=storywall-vendor&utm_medium=PHOTOGRAPHER');
    });
});

describe('isValidVendorLink', () => {
    it('accepts an https URL or an @handle', () => {
        expect(isValidVendorLink('https://studio.gr')).toBe(true);
        expect(isValidVendorLink('@studio.x')).toBe(true);
    });

    it('refuses http, bare words and long handles', () => {
        expect(isValidVendorLink('http://studio.gr')).toBe(false);
        expect(isValidVendorLink('studio')).toBe(false);
        expect(isValidVendorLink(`@${'a'.repeat(61)}`)).toBe(false);
        expect(isValidVendorLink('https://studio.gr/a b')).toBe(false);
    });
});

describe('listedVendors', () => {
    it('drops hidden, opted-out and profile-less rows', () => {
        const base = { memberId: 'm', vendorType: 'MUSIC' as const, link: '@x', logoUrl: null, joinedAt: '2026-10-01T00:00:00Z' };
        const rows = [
            { ...base, id: 'a', businessName: 'A' },
            { ...base, id: 'b', businessName: 'B', hiddenByHost: true },
            { ...base, id: 'c', businessName: 'C', optedOut: true },
            { ...base, id: 'd', businessName: null },
        ];
        expect(listedVendors(rows).map((row) => row.id)).toEqual(['a']);
    });
});

describe('proStorageState', () => {
    const GB = 1024 ** 3;

    it('is below the allowance', () => {
        expect(proStorageState(1 * GB, 5 * GB)).toEqual({ state: 'below', percent: 20, overflowBytes: 0 });
    });

    it('is exactly at the allowance', () => {
        expect(proStorageState(5 * GB, 5 * GB)).toEqual({ state: 'at', percent: 100, overflowBytes: 0 });
    });

    it('is over the allowance and reports the overflow', () => {
        expect(proStorageState(6 * GB, 5 * GB)).toEqual({ state: 'over', percent: 100, overflowBytes: 1 * GB });
    });

    it('treats a zero allowance as all overflow', () => {
        expect(proStorageState(2 * GB, 0)).toEqual({ state: 'over', percent: 100, overflowBytes: 2 * GB });
        expect(proStorageState(0, 0)).toEqual({ state: 'at', percent: 100, overflowBytes: 0 });
    });
});
```

Add to `lib/notifications.test.ts` (inside its existing `describe` for `notificationCtaRoute`; reuse the file's notification builder, or build the object inline as below):
```ts
    it('sends VENDOR_JOINED to Manage → Vendors', () => {
        const notification = {
            id: 'n1',
            recipientMemberId: 'm1',
            type: 'VENDOR_JOINED',
            ctaTarget: 'EVENT_VENDORS',
            ctaParams: { eventId: 'e1' },
            referenceType: null,
            referenceId: null,
            payload: {},
            readAt: null,
            createdAt: '2026-10-19T10:00:00Z',
            deletedAt: null,
        } as const;
        expect(notificationCtaRoute(notification)).toBe('/events/e1/manage/vendors');
    });
```

Add to `lib/rsvpReport.test.ts`:
```ts
import { describe, expect, it } from 'vitest';

import { resolveRsvpReportCloseHref } from '@/lib/rsvpReport';

describe('resolveRsvpReportCloseHref', () => {
    it('returns a vendor to their vendor page', () => {
        expect(resolveRsvpReportCloseHref('e1', 'vendor')).toBe('/events/e1/tools/vendors/me');
    });

    it('keeps the existing origins', () => {
        expect(resolveRsvpReportCloseHref('e1', 'tools')).toBe('/events/e1/tools/rsvp?section=reports');
        expect(resolveRsvpReportCloseHref('e1', null)).toBe('/events/e1/manage?tab=rsvp&section=reports');
    });
});
```
(If `lib/rsvpReport.test.ts` already exists, add only the `vendor` case to it.)

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run lib/vendors.test.ts lib/notifications.test.ts lib/rsvpReport.test.ts`
Expected: FAIL, `Cannot find module '@/lib/vendors'`.

- [ ] **Step 3: Add the routes**

`lib/routes.ts`, in `routes.events` after `invitationsQr`:
```ts
        // The host's vendor links and joined vendors (vendors spec 2026-10-19); VENDOR_JOINED links here.
        manageVendors: (eventId: string) => `${eventBasePath(eventId)}/manage/vendors`,
```
Change `rsvpReport` so it accepts the vendor origin:
```ts
        rsvpReport: (eventId: string, reportType: RsvpReportType, from?: 'tools' | 'vendor') =>
            withQuery(`${eventBasePath(eventId)}/manage/rsvp/reports/${reportType}`, { from }),
```
In `routes.events.tools`, after `wishbook`:
```ts
            vendors: (eventId: string) => `${eventBasePath(eventId)}/tools/vendors`,
            vendorMe: (eventId: string) => `${eventBasePath(eventId)}/tools/vendors/me`,
            playlistLive: (eventId: string) => `${eventBasePath(eventId)}/tools/playlist/live`,
            announcement: (eventId: string) => `${eventBasePath(eventId)}/tools/announcement`,
```

`lib/notifications.ts`, in `CTA_ROUTES`:
```ts
    EVENT_VENDORS: (p) => routes.events.manageVendors(p.eventId),
```

`lib/rsvpReport.ts`:
```ts
export type RsvpReportOrigin = 'manage' | 'tools' | 'vendor';

// Where a report page's Close (useRsvpReportPage) sends the host, based on the
// `from` search param the report link carried (see routes.events.rsvpReport).
// An allowlist: anything but the known origins falls back to Manage.
export function resolveRsvpReportCloseHref(eventId: string, from: string | null): string {
    if (from === 'tools') return routes.events.tools.rsvp(eventId, { section: 'reports' });
    if (from === 'vendor') return routes.events.tools.vendorMe(eventId);
    return routes.events.manage(eventId, { tab: 'rsvp', section: 'reports' });
}
```

- [ ] **Step 4: Write `lib/vendors.ts`**

```ts
import type { PartnerRole, VendorCapability, VendorMeDto, VendorRowDto } from '@/lib/api/types';
import { APPLICATION_ROLES } from '@/lib/forBusinessApplication';
import { routes } from '@/lib/routes';
import { absoluteUrl } from '@/lib/seo';

// One order everywhere vendor types are listed: the partner application's.
export const VENDOR_TYPES: readonly PartnerRole[] = APPLICATION_ROLES;

// The partner application's link rule, shared with the vendor profile (backend LINK_PATTERN).
const VENDOR_LINK_PATTERN = /^(https:\/\/\S{1,492}|@[A-Za-z0-9._]{1,60})$/;

export const VENDOR_BUSINESS_NAME_MAX = 80;
export const VENDOR_LINK_MAX = 500;

// A tool is open while the backend lists it for the type and the access window is open.
export function hasVendorCapability(me: VendorMeDto | null | undefined, capability: VendorCapability): boolean {
    return Boolean(me?.accessOpen && me.capabilities.includes(capability));
}

// Built from the site URL, not window.location, so server and client render the same link.
export function vendorInviteUrl(inviteToken: string): string {
    return absoluteUrl(routes.inviteToken(inviteToken));
}

// The "Become a partner" sheet's attribution, read by readUtm like the landing page's.
export function vendorApplySearch(vendorType: PartnerRole): string {
    return `?utm_source=storywall-vendor&utm_medium=${vendorType}`;
}

export function isValidVendorLink(value: string): boolean {
    return VENDOR_LINK_PATTERN.test(value.trim());
}

// What guests see: a filled-in profile that neither the host nor the vendor hid.
// A host's list also carries hidden rows, so every guest-facing count goes through this.
export function listedVendors(rows: readonly VendorRowDto[]): VendorRowDto[] {
    return rows.filter((row) => row.businessName !== null && !row.hiddenByHost && !row.optedOut);
}

export type ProStorageState = { state: 'below' | 'at' | 'over'; percent: number; overflowBytes: number };

// The Pro allowance spills into event storage once full, so "over" is normal, not an error.
export function proStorageState(usedBytes: number, allowanceBytes: number): ProStorageState {
    const overflowBytes = Math.max(0, usedBytes - allowanceBytes);
    if (overflowBytes > 0) return { state: 'over', percent: 100, overflowBytes };
    if (allowanceBytes === 0 || usedBytes === allowanceBytes) return { state: 'at', percent: 100, overflowBytes: 0 };
    return { state: 'below', percent: Math.round((usedBytes / allowanceBytes) * 100), overflowBytes: 0 };
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run lib/vendors.test.ts lib/notifications.test.ts lib/rsvpReport.test.ts && npm run type:check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib
git commit -m "feat(vendors): routes, notification link and vendor helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `hooks/useVendors.ts`

**Files:**
- Create: `hooks/useVendors.ts`
- Test: `hooks/useVendors.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import {
    useEventVendors,
    useHasVendorCapability,
    useMyVendorRole,
    usePatchVendor,
    useRecordVendorClick,
    useRemoveVendor,
    useResetVendorLink,
    useVendorLinks,
    vendorKeys,
} from '@/hooks/useVendors';

const apiGet = vi.fn();
const apiPost = vi.fn();
const apiPatch = vi.fn();
const apiDel = vi.fn();
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: {
        get: (...a: unknown[]) => apiGet(...a),
        post: (...a: unknown[]) => apiPost(...a),
        patch: (...a: unknown[]) => apiPatch(...a),
        del: (...a: unknown[]) => apiDel(...a),
    },
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
const readable = vi.hoisted(() => ({ vendors: true }));
vi.mock('@/hooks/useModuleReadable', () => ({ useModuleReadable: () => readable.vendors }));

function newClient() {
    return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function wrapperFor(client: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
}

const ME = {
    vendorId: 'v1',
    vendorType: 'MUSIC',
    capabilities: ['SONG_REQUESTS'],
    accessEndsAt: null,
    accessOpen: true,
    profileComplete: true,
    showPartnerPrompt: false,
    proStorageBytes: null,
    proUsedBytes: null,
    optedOut: false,
    hiddenByHost: false,
};

beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    apiPatch.mockReset();
    apiDel.mockReset();
    readable.vendors = true;
});

describe('vendorKeys', () => {
    it('nests every vendor key under the event', () => {
        expect(vendorKeys.links('e1')).toEqual(['events', 'e1', 'vendors', 'links']);
        expect(vendorKeys.list('e1')).toEqual(['events', 'e1', 'vendors', 'list']);
        expect(vendorKeys.me('e1')).toEqual(['events', 'e1', 'vendors', 'me']);
    });
});

describe('useMyVendorRole', () => {
    it('returns the role', async () => {
        apiGet.mockResolvedValue(ME);
        const { result } = renderHook(() => useMyVendorRole('e1'), { wrapper: wrapperFor(newClient()) });
        await waitFor(() => expect(result.current.data).toEqual(ME));
        expect(apiGet).toHaveBeenCalledWith('/api/events/e1/vendors/me');
    });

    it('reads a 404 as "not a vendor"', async () => {
        apiGet.mockRejectedValue(new ApiError(404, {}));
        const { result } = renderHook(() => useMyVendorRole('e1'), { wrapper: wrapperFor(newClient()) });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
    });

    it('surfaces other errors', async () => {
        apiGet.mockRejectedValue(new ApiError(500, {}));
        const { result } = renderHook(() => useMyVendorRole('e1'), { wrapper: wrapperFor(newClient()) });
        await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('does not ask without the module or an event', () => {
        readable.vendors = false;
        renderHook(() => useMyVendorRole('e1'), { wrapper: wrapperFor(newClient()) });
        renderHook(() => useMyVendorRole(null), { wrapper: wrapperFor(newClient()) });
        expect(apiGet).not.toHaveBeenCalled();
    });
});

describe('useHasVendorCapability', () => {
    it('is true for the DJ and song requests', async () => {
        apiGet.mockResolvedValue(ME);
        const { result } = renderHook(() => useHasVendorCapability('e1', 'SONG_REQUESTS'), { wrapper: wrapperFor(newClient()) });
        await waitFor(() => expect(result.current.allowed).toBe(true));
        expect(result.current.isLoading).toBe(false);
    });

    it('is false for a tool the type lacks', async () => {
        apiGet.mockResolvedValue(ME);
        const { result } = renderHook(() => useHasVendorCapability('e1', 'ANNOUNCE'), { wrapper: wrapperFor(newClient()) });
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.allowed).toBe(false);
    });

    it('is loading until the role arrives', () => {
        apiGet.mockReturnValue(new Promise(() => {}));
        const { result } = renderHook(() => useHasVendorCapability('e1', 'SONG_REQUESTS'), { wrapper: wrapperFor(newClient()) });
        expect(result.current).toEqual({ allowed: false, isLoading: true });
    });
});

describe('useVendorLinks and useEventVendors', () => {
    it('loads the links only when enabled', async () => {
        apiGet.mockResolvedValue([{ vendorType: 'PHOTOGRAPHER', inviteToken: 't1', createdAt: null }]);
        const { result, rerender } = renderHook(({ enabled }) => useVendorLinks('e1', enabled), {
            wrapper: wrapperFor(newClient()),
            initialProps: { enabled: false },
        });
        expect(apiGet).not.toHaveBeenCalled();
        rerender({ enabled: true });
        await waitFor(() => expect(result.current.data).toHaveLength(1));
        expect(apiGet).toHaveBeenCalledWith('/api/events/e1/vendors/links');
    });

    it('loads the vendor list', async () => {
        apiGet.mockResolvedValue([]);
        const { result } = renderHook(() => useEventVendors('e1'), { wrapper: wrapperFor(newClient()) });
        await waitFor(() => expect(result.current.data).toEqual([]));
        expect(apiGet).toHaveBeenCalledWith('/api/events/e1/vendors');
    });
});

describe('mutations', () => {
    it('reset refreshes the links', async () => {
        apiPost.mockResolvedValue({ vendorType: 'DJ', inviteToken: 't2', createdAt: null });
        const client = newClient();
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useResetVendorLink('e1'), { wrapper: wrapperFor(client) });
        await act(() => result.current.mutateAsync('MUSIC'));
        expect(apiPost).toHaveBeenCalledWith('/api/events/e1/vendors/links/MUSIC/reset');
        expect(invalidate).toHaveBeenCalledWith({ queryKey: vendorKeys.links('e1') });
    });

    it('patch and remove refresh the list and my role', async () => {
        apiPatch.mockResolvedValue({});
        apiDel.mockResolvedValue(undefined);
        const client = newClient();
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        const patch = renderHook(() => usePatchVendor('e1'), { wrapper: wrapperFor(client) });
        await act(() => patch.result.current.mutateAsync({ vendorId: 'v1', patch: { hiddenByHost: true } }));
        expect(apiPatch).toHaveBeenCalledWith('/api/events/e1/vendors/v1', { hiddenByHost: true });
        const remove = renderHook(() => useRemoveVendor('e1'), { wrapper: wrapperFor(client) });
        await act(() => remove.result.current.mutateAsync('v1'));
        expect(apiDel).toHaveBeenCalledWith('/api/events/e1/vendors/v1');
        expect(invalidate).toHaveBeenCalledWith({ queryKey: vendorKeys.list('e1') });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: vendorKeys.me('e1') });
    });

    it('a click is fire-and-forget', async () => {
        apiPost.mockRejectedValue(new Error('offline'));
        const { result } = renderHook(() => useRecordVendorClick('e1'), { wrapper: wrapperFor(newClient()) });
        expect(() => result.current('v1')).not.toThrow();
        await waitFor(() => expect(apiPost).toHaveBeenCalledWith('/api/events/e1/vendors/v1/clicks'));
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run hooks/useVendors.test.tsx`
Expected: FAIL, `Cannot find module '@/hooks/useVendors'`.

- [ ] **Step 3: Write the hook module**

`hooks/useVendors.ts`:
```ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useModuleReadable } from '@/hooks/useModuleReadable';
import { api, ApiError } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { PartnerRole, VendorCapability, VendorLinkDto, VendorMeDto, VendorPatchDto, VendorRowDto } from '@/lib/api/types';
import { hasVendorCapability } from '@/lib/vendors';

export const vendorKeys = {
    all: (eventId: string) => ['events', eventId, 'vendors'] as const,
    links: (eventId: string) => ['events', eventId, 'vendors', 'links'] as const,
    list: (eventId: string) => ['events', eventId, 'vendors', 'list'] as const,
    me: (eventId: string) => ['events', eventId, 'vendors', 'me'] as const,
};

// GET …/vendors/me. Null when the caller is not a vendor of the event (404).
export async function fetchMyVendorRole(eventId: string): Promise<VendorMeDto | null> {
    try {
        return await api.get<VendorMeDto>(endpoints.events.vendorMe(eventId));
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
    }
}

export function useMyVendorRole(eventId: string | null) {
    const { isAuthenticated } = useAuth();
    const vendorsReadable = useModuleReadable(eventId, 'vendors');

    return useQuery({
        queryKey: vendorKeys.me(eventId ?? ''),
        queryFn: () => fetchMyVendorRole(eventId!),
        enabled: Boolean(eventId) && isAuthenticated && vendorsReadable,
    });
}

// Whether the caller may use one vendor tool. Hosts are checked by the caller, not here.
export function useHasVendorCapability(eventId: string | null, capability: VendorCapability) {
    const role = useMyVendorRole(eventId);
    return { allowed: hasVendorCapability(role.data, capability), isLoading: role.isLoading };
}

// Host only.
export function useVendorLinks(eventId: string | null, enabled: boolean) {
    const { isAuthenticated } = useAuth();
    const vendorsReadable = useModuleReadable(eventId, 'vendors');

    return useQuery({
        queryKey: vendorKeys.links(eventId ?? ''),
        queryFn: () => api.get<VendorLinkDto[]>(endpoints.events.vendorLinks(eventId!)),
        enabled: Boolean(eventId) && enabled && isAuthenticated && vendorsReadable,
    });
}

// Any member: listed vendors; a host also gets hidden rows with their flags.
export function useEventVendors(eventId: string | null) {
    const { isAuthenticated } = useAuth();
    const vendorsReadable = useModuleReadable(eventId, 'vendors');

    return useQuery({
        queryKey: vendorKeys.list(eventId ?? ''),
        queryFn: () => api.get<VendorRowDto[]>(endpoints.events.vendors(eventId!)),
        enabled: Boolean(eventId) && isAuthenticated && vendorsReadable,
    });
}

export function useResetVendorLink(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (vendorType: PartnerRole) => api.post<VendorLinkDto>(endpoints.events.vendorLinkReset(eventId, vendorType)),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: vendorKeys.links(eventId) }),
    });
}

export function usePatchVendor(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ vendorId, patch }: { vendorId: string; patch: VendorPatchDto }) =>
            api.patch<VendorRowDto>(endpoints.events.vendorById(eventId, vendorId), patch),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vendorKeys.list(eventId) });
            queryClient.invalidateQueries({ queryKey: vendorKeys.me(eventId) });
        },
    });
}

export function useRemoveVendor(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (vendorId: string) => api.del<void>(endpoints.events.vendorById(eventId, vendorId)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vendorKeys.list(eventId) });
            queryClient.invalidateQueries({ queryKey: vendorKeys.me(eventId) });
            // The membership goes too.
            queryClient.invalidateQueries({ queryKey: ['events', eventId, 'members'] });
        },
    });
}

// Counting only: a failed click must never block the link from opening.
export function useRecordVendorClick(eventId: string) {
    return useCallback(
        (vendorId: string) => {
            api.post<void>(endpoints.events.vendorClicks(eventId, vendorId)).catch(() => undefined);
        },
        [eventId],
    );
}
```

Check `eventMemberKeys.list` in `hooks/useEventMembers.ts`: if it is not `['events', eventId, 'members']`, import `eventMemberKeys` and use `eventMemberKeys.list(eventId)` instead of the literal.

- [ ] **Step 4: Run the test**

Run: `npx vitest run hooks/useVendors.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add hooks/useVendors.ts hooks/useVendors.test.tsx
git commit -m "feat(vendors): vendor query hooks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Vendor profile hooks

**Files:**
- Create: `hooks/useVendorProfile.ts`, `hooks/useVendorProfileForm.ts`
- Test: `hooks/useVendorProfile.test.tsx`, `hooks/useVendorProfileForm.test.tsx`

- [ ] **Step 1: Write the failing tests**

`hooks/useVendorProfile.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDismissPartnerPrompt, useSaveVendorProfile, useVendorProfile, vendorProfileKeys } from '@/hooks/useVendorProfile';
import { ApiError } from '@/lib/api/client';

const apiGet = vi.fn();
const apiPut = vi.fn();
const apiPost = vi.fn();
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: {
        get: (...a: unknown[]) => apiGet(...a),
        put: (...a: unknown[]) => apiPut(...a),
        post: (...a: unknown[]) => apiPost(...a),
    },
}));
const auth = vi.hoisted(() => ({ user: { role: 'USER' } as { role: string } | null }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: auth.user, isAuthenticated: Boolean(auth.user) }) }));

function newClient() {
    return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}
function wrapperFor(client: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
}

const PROFILE = { businessName: 'Studio X', vendorType: 'PHOTOGRAPHER', link: '@studio.x', logoUrl: null, partnerPromptDismissed: false };

beforeEach(() => {
    apiGet.mockReset();
    apiPut.mockReset();
    apiPost.mockReset();
    auth.user = { role: 'USER' };
});

describe('useVendorProfile', () => {
    it('loads the profile', async () => {
        apiGet.mockResolvedValue(PROFILE);
        const { result } = renderHook(() => useVendorProfile(), { wrapper: wrapperFor(newClient()) });
        await waitFor(() => expect(result.current.data).toEqual(PROFILE));
        expect(apiGet).toHaveBeenCalledWith('/api/me/vendor-profile');
    });

    it('reads 404 as no profile yet', async () => {
        apiGet.mockRejectedValue(new ApiError(404, {}));
        const { result } = renderHook(() => useVendorProfile(), { wrapper: wrapperFor(newClient()) });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
    });

    it('does not ask for guest accounts', () => {
        auth.user = { role: 'GUEST' };
        renderHook(() => useVendorProfile(), { wrapper: wrapperFor(newClient()) });
        expect(apiGet).not.toHaveBeenCalled();
    });
});

describe('useSaveVendorProfile', () => {
    it('stores the saved profile and refreshes every event vendor key', async () => {
        apiPut.mockResolvedValue(PROFILE);
        const client = newClient();
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useSaveVendorProfile(), { wrapper: wrapperFor(client) });
        await act(() => result.current.mutateAsync({ businessName: 'Studio X', vendorType: 'PHOTOGRAPHER', link: '@studio.x' }));
        expect(client.getQueryData(vendorProfileKeys.mine)).toEqual(PROFILE);
        expect(invalidate).toHaveBeenCalledWith({ predicate: expect.any(Function) });
    });
});

describe('useDismissPartnerPrompt', () => {
    it('posts the dismissal', async () => {
        apiPost.mockResolvedValue(undefined);
        const { result } = renderHook(() => useDismissPartnerPrompt(), { wrapper: wrapperFor(newClient()) });
        await act(() => result.current.mutateAsync());
        expect(apiPost).toHaveBeenCalledWith('/api/me/vendor-profile/dismiss-partner-prompt');
    });
});
```

`hooks/useVendorProfileForm.test.tsx`:
```tsx
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useVendorProfileForm } from '@/hooks/useVendorProfileForm';

const save = vi.fn();
const uploadLogo = vi.fn();
vi.mock('@/hooks/useVendorProfile', () => ({
    useSaveVendorProfile: () => ({ mutateAsync: save, isPending: false }),
    useUploadVendorLogo: () => ({ mutateAsync: uploadLogo, isPending: false }),
    useDeleteVendorLogo: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'failed' }));

function submitEvent() {
    return { preventDefault: vi.fn() } as unknown as React.SubmitEvent<HTMLFormElement>;
}

describe('useVendorProfileForm', () => {
    it('starts from the profile, or the event type when there is none', () => {
        const { result } = renderHook(() => useVendorProfileForm({ profile: null, defaultType: 'MUSIC', onSaved: vi.fn() }));
        expect(result.current.values).toEqual({ businessName: '', vendorType: 'MUSIC', link: '' });
    });

    it('requires a business name and a valid link', async () => {
        const { result } = renderHook(() => useVendorProfileForm({ profile: null, defaultType: 'MUSIC', onSaved: vi.fn() }));
        act(() => result.current.setField('link', 'studio'));
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(result.current.fieldErrors).toEqual({ businessName: 'errors.businessNameRequired', link: 'errors.linkInvalid' });
        expect(save).not.toHaveBeenCalled();
    });

    it('saves trimmed values, then the logo, then calls onSaved', async () => {
        save.mockResolvedValue({});
        uploadLogo.mockResolvedValue({});
        const onSaved = vi.fn();
        const { result } = renderHook(() => useVendorProfileForm({ profile: null, defaultType: 'MUSIC', onSaved }));
        const logo = new File(['x'], 'logo.png', { type: 'image/png' });
        act(() => {
            result.current.setField('businessName', '  DJ Nik  ');
            result.current.setField('link', '@djnik');
            result.current.setLogo(logo);
        });
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(save).toHaveBeenCalledWith({ businessName: 'DJ Nik', vendorType: 'MUSIC', link: '@djnik' });
        expect(uploadLogo).toHaveBeenCalledWith(logo);
        expect(onSaved).toHaveBeenCalled();
    });

    it('shows the server error and keeps the sheet open', async () => {
        save.mockRejectedValue(new Error('500'));
        const onSaved = vi.fn();
        const { result } = renderHook(() => useVendorProfileForm({ profile: null, defaultType: 'MUSIC', onSaved }));
        act(() => {
            result.current.setField('businessName', 'DJ Nik');
            result.current.setField('link', '@djnik');
        });
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(result.current.error).toBe('failed');
        expect(onSaved).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run hooks/useVendorProfile.test.tsx hooks/useVendorProfileForm.test.tsx`
Expected: FAIL, modules not found.

- [ ] **Step 3: Write `hooks/useVendorProfile.ts`**

```ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { api, ApiError } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { VendorProfileDto, VendorProfileRequestDto } from '@/lib/api/types';

export const vendorProfileKeys = { mine: ['me', 'vendor-profile'] as const };

async function fetchVendorProfile(): Promise<VendorProfileDto | null> {
    try {
        return await api.get<VendorProfileDto>(endpoints.me.vendorProfile);
    } catch (error) {
        // 404 until the first save.
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
    }
}

// Every event's vendor list and "me" carry the profile, so a change refreshes them all.
function isEventVendorKey(queryKey: readonly unknown[]): boolean {
    return queryKey[0] === 'events' && queryKey[2] === 'vendors';
}

// Guest accounts can't be vendors (they have no /api/me profile), so they never ask.
export function useVendorProfile(enabled = true) {
    const { user } = useAuth();
    const canHaveProfile = user?.role === 'USER' || user?.role === 'ADMIN';

    return useQuery({
        queryKey: vendorProfileKeys.mine,
        queryFn: fetchVendorProfile,
        enabled: enabled && canHaveProfile,
    });
}

function useProfileMutation<TInput>(mutationFn: (input: TInput) => Promise<VendorProfileDto>) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn,
        onSuccess: (profile) => {
            queryClient.setQueryData(vendorProfileKeys.mine, profile);
            queryClient.invalidateQueries({ predicate: (query) => isEventVendorKey(query.queryKey) });
        },
    });
}

export function useSaveVendorProfile() {
    return useProfileMutation((input: VendorProfileRequestDto) => api.put<VendorProfileDto>(endpoints.me.vendorProfile, input));
}

export function useUploadVendorLogo() {
    return useProfileMutation((file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.postForm<VendorProfileDto>(endpoints.me.vendorProfileLogo, formData);
    });
}

export function useDeleteVendorLogo() {
    return useProfileMutation((_: void) => api.del<VendorProfileDto>(endpoints.me.vendorProfileLogo));
}

export function useDismissPartnerPrompt() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => api.post<void>(endpoints.me.vendorProfileDismissPartnerPrompt),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vendorProfileKeys.mine });
            queryClient.invalidateQueries({ predicate: (query) => isEventVendorKey(query.queryKey) });
        },
    });
}
```

- [ ] **Step 4: Write `hooks/useVendorProfileForm.ts`**

```ts
'use client';

import { useTranslations } from 'next-intl';
import type { SubmitEvent } from 'react';
import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useDeleteVendorLogo, useSaveVendorProfile, useUploadVendorLogo } from '@/hooks/useVendorProfile';
import type { PartnerRole, VendorProfileDto, VendorProfileRequestDto } from '@/lib/api/types';
import { isValidVendorLink } from '@/lib/vendors';

type Field = keyof VendorProfileRequestDto;
type FieldErrors = Partial<Record<Field, string>>;

function initialValues(profile: VendorProfileDto | null, defaultType: PartnerRole): VendorProfileRequestDto {
    return {
        businessName: profile?.businessName ?? '',
        vendorType: profile?.vendorType ?? defaultType,
        link: profile?.link ?? '',
    };
}

// The vendor profile sheet: first join (no profile yet) and the profile page's edit.
export function useVendorProfileForm({
    profile,
    defaultType,
    onSaved,
}: {
    profile: VendorProfileDto | null;
    defaultType: PartnerRole;
    onSaved: () => void;
}) {
    const t = useTranslations('Vendors.profile');
    const toErrorMessage = useApiErrorMessage();
    const save = useSaveVendorProfile();
    const uploadLogo = useUploadVendorLogo();
    const deleteLogo = useDeleteVendorLogo();
    const [values, setValues] = useState(() => initialValues(profile, defaultType));
    const [logo, setLogo] = useState<File | null>(null);
    const [removeLogo, setRemoveLogo] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [error, setError] = useState<string | null>(null);

    const setField = useCallback((field: Field, value: string) => {
        setValues((current) => ({ ...current, [field]: value }));
    }, []);

    const handleSubmit = useCallback(
        async (event: SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            const request: VendorProfileRequestDto = {
                businessName: values.businessName.trim(),
                vendorType: values.vendorType,
                link: values.link.trim(),
            };
            const errors: FieldErrors = {};
            if (!request.businessName) errors.businessName = t('errors.businessNameRequired');
            if (!isValidVendorLink(request.link)) errors.link = t('errors.linkInvalid');
            setFieldErrors(errors);
            setError(null);
            if (Object.keys(errors).length > 0) return;

            try {
                await save.mutateAsync(request);
                if (logo) await uploadLogo.mutateAsync(logo);
                else if (removeLogo) await deleteLogo.mutateAsync();
                onSaved();
            } catch (submitError) {
                setError(toErrorMessage(submitError));
            }
        },
        [deleteLogo, logo, onSaved, removeLogo, save, t, toErrorMessage, uploadLogo, values],
    );

    return {
        values,
        setField,
        logo,
        setLogo,
        removeLogo,
        setRemoveLogo,
        fieldErrors,
        error,
        isSaving: save.isPending || uploadLogo.isPending || deleteLogo.isPending,
        handleSubmit,
    };
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run hooks/useVendorProfile.test.tsx hooks/useVendorProfileForm.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add hooks/useVendorProfile.ts hooks/useVendorProfileForm.ts hooks/useVendorProfile.test.tsx hooks/useVendorProfileForm.test.tsx
git commit -m "feat(vendors): vendor profile hooks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: All vendor copy in en and el

Every later task reads these keys, so they land first and in one place. The message parity test (`i18n/appMessages.test.ts`) checks both files.

**Files:**
- Modify: `messages/en.json`, `messages/el.json`
- Test: `i18n/appMessages.test.ts` (existing)

- [ ] **Step 1: Add the `Vendors` namespace**

`messages/en.json`, a new top-level key:
```json
"Vendors": {
    "types": {
        "PLANNER": "Planner",
        "VENUE": "Venue",
        "PHOTOGRAPHER": "Photographer",
        "VIDEOGRAPHER": "Videographer",
        "DECORATION": "Decoration",
        "CATERING": "Catering",
        "MUSIC": "Music",
        "OTHER": "Vendor"
    },
    "manage": {
        "title": "Vendors",
        "back": "Back",
        "unavailable": "Vendors aren't part of this event's plan.",
        "linksTitle": "Invite links",
        "linksEmpty": "Links appear once the event is live.",
        "copy": "Copy link",
        "copied": "Copied",
        "share": "Share",
        "qr": "QR code",
        "reset": "Reset link",
        "resetTitle": "Reset the {type} link?",
        "resetBody": "The old link stops working. Vendors who joined stay.",
        "resetConfirm": "Reset link",
        "resetCancel": "Keep link",
        "joinedTitle": "Joined",
        "joinedEmpty": "No vendors yet.",
        "noProfile": "No details yet",
        "hidden": "Hidden",
        "sheetJoined": "Joined {date}",
        "hide": "Hide from list",
        "show": "Show in list",
        "optedOut": "They chose not to appear in the list.",
        "remove": "Remove",
        "removeTitle": "Remove {name}?",
        "removeBody": "They leave the event and lose their tools.",
        "removeConfirm": "Remove",
        "removeCancel": "Cancel",
        "close": "Close",
        "qrTitle": "{type} link"
    },
    "list": {
        "title": "Vendors",
        "back": "Back",
        "empty": "No vendors yet.",
        "hidden": "Hidden",
        "open": "Open {name}"
    },
    "me": {
        "title": "Your vendor page",
        "back": "Back",
        "notVendor": "You're not a vendor in this event.",
        "accessUntil": "Your tools work until {date}.",
        "accessEnded": "Your tools for this event have stopped.",
        "toolsTitle": "Your tools",
        "tools": {
            "schedule": "Schedule",
            "announcement": "Announcement",
            "rsvpReport": "RSVP report",
            "qr": "Share links",
            "liveRequests": "Live requests"
        },
        "proTitle": "Pro album",
        "proChoose": "Choose photos or videos",
        "proUpload": "Upload {count, plural, one {# file} other {# files}}",
        "proUploaded": "Uploaded.",
        "proEmpty": "Nothing uploaded yet.",
        "proDelete": "Delete",
        "proDeleteTitle": "Delete this item?",
        "proDeleteBody": "It's removed from the Pro album.",
        "proDeleteConfirm": "Delete",
        "proDeleteCancel": "Keep",
        "listingTitle": "Vendor list",
        "listingSwitch": "Show me in the vendor list",
        "listingHiddenByHost": "The host hid you from the list.",
        "profileTitle": "Your details",
        "profileEdit": "Edit"
    },
    "meter": {
        "label": "Pro album",
        "value": "{used} / {total}",
        "over": "{over} more uses event storage."
    },
    "profile": {
        "title": "Your business",
        "body": "Guests see this in the vendor list.",
        "businessName": "Business name",
        "type": "What you do",
        "link": "Website or Instagram",
        "linkHint": "https://… or @handle",
        "logo": "Logo (optional)",
        "logoRemove": "Remove logo",
        "save": "Save",
        "later": "Later",
        "errors": {
            "businessNameRequired": "Enter your business name.",
            "linkInvalid": "Enter an https link or an @handle."
        },
        "sectionTitle": "Vendor details",
        "edit": "Edit"
    },
    "partner": {
        "promptTitle": "Become a StoryWall partner",
        "promptBody": "Get a discount code for your clients and appear on their events.",
        "promptApply": "Apply",
        "promptDismiss": "Don't show again",
        "sheetTitle": "Apply to partner"
    },
    "invite": {
        "PLANNER": "You're invited as the planner.",
        "VENUE": "You're invited as the venue.",
        "PHOTOGRAPHER": "You're invited as the photographer.",
        "VIDEOGRAPHER": "You're invited as the videographer.",
        "DECORATION": "You're invited as the decorator.",
        "CATERING": "You're invited as the caterer.",
        "MUSIC": "You're invited as the DJ or band.",
        "OTHER": "You're invited as a vendor."
    },
    "credit": {
        "photo": "Photo: {name}",
        "video": "Video: {name}"
    },
    "gallery": {
        "guests": "Guests",
        "pro": "Pro"
    },
    "live": {
        "title": "Live requests",
        "back": "Back",
        "empty": "No requests yet.",
        "played": "Played",
        "markPlayed": "Mark {title} played",
        "markUnplayed": "Mark {title} not played",
        "votes": "{count, plural, one {# vote} other {# votes}}",
        "open": "Live list"
    },
    "announcement": {
        "title": "Announcement",
        "back": "Back",
        "label": "Message",
        "send": "Post",
        "empty": "Write a message first."
    },
    "admin": {
        "title": "Vendors",
        "empty": "No vendors.",
        "joined": "Joined {date}"
    }
}
```

`messages/el.json`, the same key with:
```json
"Vendors": {
    "types": {
        "PLANNER": "Διοργάνωση",
        "VENUE": "Χώρος εκδήλωσης",
        "PHOTOGRAPHER": "Φωτογράφος",
        "VIDEOGRAPHER": "Βιντεογράφος",
        "DECORATION": "Διακόσμηση",
        "CATERING": "Catering",
        "MUSIC": "Μουσική",
        "OTHER": "Επαγγελματίας"
    },
    "manage": {
        "title": "Επαγγελματίες",
        "back": "Πίσω",
        "unavailable": "Οι επαγγελματίες δεν περιλαμβάνονται στο πακέτο της εκδήλωσης.",
        "linksTitle": "Σύνδεσμοι πρόσκλησης",
        "linksEmpty": "Οι σύνδεσμοι εμφανίζονται μόλις ενεργοποιηθεί η εκδήλωση.",
        "copy": "Αντιγραφή συνδέσμου",
        "copied": "Αντιγράφηκε",
        "share": "Κοινοποίηση",
        "qr": "Κωδικός QR",
        "reset": "Νέος σύνδεσμος",
        "resetTitle": "Νέος σύνδεσμος για {type};",
        "resetBody": "Ο παλιός σύνδεσμος σταματά να λειτουργεί. Όσοι μπήκαν ήδη παραμένουν.",
        "resetConfirm": "Νέος σύνδεσμος",
        "resetCancel": "Διατήρηση",
        "joinedTitle": "Μπήκαν",
        "joinedEmpty": "Δεν υπάρχουν ακόμη επαγγελματίες.",
        "noProfile": "Χωρίς στοιχεία ακόμη",
        "hidden": "Κρυφός",
        "sheetJoined": "Μπήκε {date}",
        "hide": "Απόκρυψη από τη λίστα",
        "show": "Εμφάνιση στη λίστα",
        "optedOut": "Επέλεξε να μην εμφανίζεται στη λίστα.",
        "remove": "Αφαίρεση",
        "removeTitle": "Αφαίρεση του/της {name};",
        "removeBody": "Φεύγει από την εκδήλωση και χάνει τα εργαλεία του/της.",
        "removeConfirm": "Αφαίρεση",
        "removeCancel": "Ακύρωση",
        "close": "Κλείσιμο",
        "qrTitle": "Σύνδεσμος για {type}"
    },
    "list": {
        "title": "Επαγγελματίες",
        "back": "Πίσω",
        "empty": "Δεν υπάρχουν ακόμη επαγγελματίες.",
        "hidden": "Κρυφός",
        "open": "Άνοιγμα {name}"
    },
    "me": {
        "title": "Η σελίδα σας ως επαγγελματίας",
        "back": "Πίσω",
        "notVendor": "Δεν είστε επαγγελματίας σε αυτή την εκδήλωση.",
        "accessUntil": "Τα εργαλεία σας λειτουργούν έως {date}.",
        "accessEnded": "Τα εργαλεία σας για αυτή την εκδήλωση έχουν σταματήσει.",
        "toolsTitle": "Τα εργαλεία σας",
        "tools": {
            "schedule": "Πρόγραμμα",
            "announcement": "Ανακοίνωση",
            "rsvpReport": "Αναφορά RSVP",
            "qr": "Σύνδεσμοι κοινοποίησης",
            "liveRequests": "Ζωντανά αιτήματα"
        },
        "proTitle": "Pro άλμπουμ",
        "proChoose": "Επιλογή φωτογραφιών ή βίντεο",
        "proUpload": "Ανέβασμα {count, plural, one {# αρχείου} other {# αρχείων}}",
        "proUploaded": "Ανέβηκαν.",
        "proEmpty": "Δεν έχετε ανεβάσει τίποτα ακόμη.",
        "proDelete": "Διαγραφή",
        "proDeleteTitle": "Διαγραφή αυτού του αρχείου;",
        "proDeleteBody": "Αφαιρείται από το Pro άλμπουμ.",
        "proDeleteConfirm": "Διαγραφή",
        "proDeleteCancel": "Διατήρηση",
        "listingTitle": "Λίστα επαγγελματιών",
        "listingSwitch": "Εμφάνιση στη λίστα επαγγελματιών",
        "listingHiddenByHost": "Ο διοργανωτής σας έκρυψε από τη λίστα.",
        "profileTitle": "Τα στοιχεία σας",
        "profileEdit": "Επεξεργασία"
    },
    "meter": {
        "label": "Pro άλμπουμ",
        "value": "{used} / {total}",
        "over": "{over} επιπλέον μετρούν στον χώρο της εκδήλωσης."
    },
    "profile": {
        "title": "Η επιχείρησή σας",
        "body": "Οι καλεσμένοι το βλέπουν στη λίστα επαγγελματιών.",
        "businessName": "Όνομα επιχείρησης",
        "type": "Τι κάνετε",
        "link": "Ιστότοπος ή Instagram",
        "linkHint": "https://… ή @όνομα",
        "logo": "Λογότυπο (προαιρετικό)",
        "logoRemove": "Αφαίρεση λογότυπου",
        "save": "Αποθήκευση",
        "later": "Αργότερα",
        "errors": {
            "businessNameRequired": "Γράψτε το όνομα της επιχείρησής σας.",
            "linkInvalid": "Γράψτε έναν σύνδεσμο https ή ένα @όνομα."
        },
        "sectionTitle": "Στοιχεία επαγγελματία",
        "edit": "Επεξεργασία"
    },
    "partner": {
        "promptTitle": "Γίνετε συνεργάτης του StoryWall",
        "promptBody": "Πάρτε κωδικό έκπτωσης για τους πελάτες σας και εμφανιστείτε στις εκδηλώσεις τους.",
        "promptApply": "Αίτηση",
        "promptDismiss": "Να μην εμφανιστεί ξανά",
        "sheetTitle": "Αίτηση συνεργασίας"
    },
    "invite": {
        "PLANNER": "Σας προσκαλούν ως υπεύθυνο διοργάνωσης.",
        "VENUE": "Σας προσκαλούν ως χώρο της εκδήλωσης.",
        "PHOTOGRAPHER": "Σας προσκαλούν ως φωτογράφο.",
        "VIDEOGRAPHER": "Σας προσκαλούν ως βιντεογράφο.",
        "DECORATION": "Σας προσκαλούν για τη διακόσμηση.",
        "CATERING": "Σας προσκαλούν για το catering.",
        "MUSIC": "Σας προσκαλούν για τη μουσική.",
        "OTHER": "Σας προσκαλούν ως επαγγελματία."
    },
    "credit": {
        "photo": "Φωτογραφία: {name}",
        "video": "Βίντεο: {name}"
    },
    "gallery": {
        "guests": "Καλεσμένοι",
        "pro": "Pro"
    },
    "live": {
        "title": "Ζωντανά αιτήματα",
        "back": "Πίσω",
        "empty": "Δεν υπάρχουν ακόμη αιτήματα.",
        "played": "Έπαιξε",
        "markPlayed": "Σήμανση: το {title} έπαιξε",
        "markUnplayed": "Σήμανση: το {title} δεν έπαιξε",
        "votes": "{count, plural, one {# ψήφος} other {# ψήφοι}}",
        "open": "Ζωντανή λίστα"
    },
    "announcement": {
        "title": "Ανακοίνωση",
        "back": "Πίσω",
        "label": "Μήνυμα",
        "send": "Δημοσίευση",
        "empty": "Γράψτε πρώτα ένα μήνυμα."
    },
    "admin": {
        "title": "Επαγγελματίες",
        "empty": "Κανένας επαγγελματίας.",
        "joined": "Μπήκε {date}"
    }
}
```

- [ ] **Step 2: Add the keys that live in existing namespaces**

en, `ToolsMenu.items` (add next to the existing items):
```json
"vendors": { "label": "Vendors", "description": "Who's working at the event." },
"vendorMe": { "label": "Your vendor page", "description": "Your tools and how guests see you." },
"announcement": { "label": "Announcement", "description": "Post a message for everyone." },
"rsvpReport": { "label": "RSVP report", "description": "Who's coming." },
"vendorQr": { "label": "Share links", "description": "Print the event's QR codes." },
"liveRequests": { "label": "Live requests", "description": "Songs guests asked for." }
```
el, `ToolsMenu.items`:
```json
"vendors": { "label": "Επαγγελματίες", "description": "Ποιοι δουλεύουν στην εκδήλωση." },
"vendorMe": { "label": "Η σελίδα σας ως επαγγελματίας", "description": "Τα εργαλεία σας και πώς σας βλέπουν οι καλεσμένοι." },
"announcement": { "label": "Ανακοίνωση", "description": "Δημοσιεύστε ένα μήνυμα για όλους." },
"rsvpReport": { "label": "Αναφορά RSVP", "description": "Ποιοι έρχονται." },
"vendorQr": { "label": "Σύνδεσμοι κοινοποίησης", "description": "Εκτυπώστε τους κωδικούς QR της εκδήλωσης." },
"liveRequests": { "label": "Ζωντανά αιτήματα", "description": "Τραγούδια που ζήτησαν οι καλεσμένοι." }
```

en, `MobileTabBar.hostMenu`:
```json
"vendors": { "label": "Vendors", "description": "Invite links and who joined." },
"announcement": { "label": "Announcement", "description": "Post a message for everyone." }
```
el, `MobileTabBar.hostMenu`:
```json
"vendors": { "label": "Επαγγελματίες", "description": "Σύνδεσμοι πρόσκλησης και ποιοι μπήκαν." },
"announcement": { "label": "Ανακοίνωση", "description": "Δημοσιεύστε ένα μήνυμα για όλους." }
```

en, `CheckoutReviewPage.partnerBranding.vendorOffer`: `"We'll send {partner} a link to join your event as a vendor."`
el, `CheckoutReviewPage.partnerBranding.vendorOffer`: `"Θα στείλουμε στον συνεργάτη {partner} σύνδεσμο για να μπει στην εκδήλωσή σας ως επαγγελματίας."`

en, `NotificationsPage.types.VENDOR_JOINED`: `{ "title": "{business} joined as {type}", "body": "They can now use their tools in your event." }`
el, `NotificationsPage.types.VENDOR_JOINED`: `{ "title": "Ο/Η {business} μπήκε ως {type}", "body": "Μπορεί πλέον να χρησιμοποιεί τα εργαλεία του/της στην εκδήλωσή σας." }`

en, `AdminPage.plans.grid.cell.fields`: `"maxVendors": "Vendors"`, `"accessDaysAfterEvent": "Tool days after the event"`, `"proStorageBytes": "Pro storage (bytes)"`
el, `AdminPage.plans.grid.cell.fields`: `"maxVendors": "Επαγγελματίες"`, `"accessDaysAfterEvent": "Ημέρες εργαλείων μετά την εκδήλωση"`, `"proStorageBytes": "Pro χώρος (bytes)"`

Find `ToolsMenu`, `MobileTabBar.hostMenu`, `AdminPage.plans.grid.cell.fields` and `NotificationsPage.types` with `grep -n` first and add inside them; do not create a second copy of a namespace.

- [ ] **Step 3: Run the parity test and a JSON check**

Run: `node -e "require('./messages/en.json'); require('./messages/el.json')" && npx vitest run i18n/appMessages.test.ts`
Expected: no output from node, test PASS.

- [ ] **Step 4: Commit**

```bash
git add messages
git commit -m "feat(vendors): vendor copy in English and Greek

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: `EventRouteGate` opens shared screens to a vendor capability

**Files:**
- Modify: `components/routing/EventRouteGate.tsx`
- Test: `components/routing/EventRouteGate.vendor.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EventRouteGate } from '@/components/routing/EventRouteGate';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
const ctx = vi.hoisted(() => ({ isHost: false }));
vi.mock('@/providers/EventProvider', () => ({
    useActiveEvent: () => ({ id: 'e1' }),
    useIsHost: () => ctx.isHost,
    useEventContextLoading: () => false,
}));
const capability = vi.hoisted(() => ({ allowed: false, isLoading: false }));
const askedFor = vi.hoisted(() => ({ eventId: undefined as string | null | undefined }));
vi.mock('@/hooks/useVendors', () => ({
    useHasVendorCapability: (eventId: string | null) => {
        askedFor.eventId = eventId;
        return capability;
    },
}));

beforeEach(() => {
    replace.mockReset();
    ctx.isHost = false;
    capability.allowed = false;
    capability.isLoading = false;
    askedFor.eventId = undefined;
});
afterEach(cleanup);

function gate() {
    return render(
        <EventRouteGate requireHost allowVendorCapability="QR_READ" fallback={<p>loading</p>}>
            <p>screen</p>
        </EventRouteGate>,
    );
}

describe('EventRouteGate with allowVendorCapability', () => {
    it('lets a host in without asking about vendors', () => {
        ctx.isHost = true;
        gate();
        expect(screen.getByText('screen')).toBeTruthy();
        expect(askedFor.eventId).toBeNull();
    });

    it('lets a vendor with the capability in', () => {
        capability.allowed = true;
        gate();
        expect(screen.getByText('screen')).toBeTruthy();
        expect(replace).not.toHaveBeenCalled();
    });

    it('waits for the vendor role', () => {
        capability.isLoading = true;
        gate();
        expect(screen.getByText('loading')).toBeTruthy();
        expect(replace).not.toHaveBeenCalled();
    });

    it('sends everyone else to the feed', () => {
        gate();
        expect(screen.getByText('loading')).toBeTruthy();
        expect(replace).toHaveBeenCalledWith('/events/e1/feed');
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run components/routing/EventRouteGate.vendor.test.tsx`
Expected: FAIL (the vendor is redirected; the prop is unknown to TypeScript).

- [ ] **Step 3: Implement the prop**

`components/routing/EventRouteGate.tsx`:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { createContext, type ReactNode, useContext, useEffect } from 'react';

import { LoadingState } from '@/components/ui/LoadingState';
import { useAuth } from '@/hooks/useAuth';
import { useHasVendorCapability } from '@/hooks/useVendors';
import type { EventDetailResponseDto, VendorCapability } from '@/lib/api/types';
import { routes } from '@/lib/routes';
import { useActiveEvent, useEventContextLoading, useIsHost } from '@/providers/EventProvider';

type EventRouteContextValue = {
    activeEvent: EventDetailResponseDto;
    eventId: string;
    isHost: boolean;
};

const EventRouteContext = createContext<EventRouteContextValue | null>(null);

type EventRouteGateProps = {
    children: ReactNode;
    missingEventRedirectTo?: string;
    requireHost?: boolean;
    // With requireHost: a vendor whose type has this tool (and whose access window is open) gets in too.
    allowVendorCapability?: VendorCapability;
    guestRedirectTo?: string;
    // The page's own skeleton, shown while the event context resolves.
    fallback?: ReactNode;
};

export function EventRouteGate({
    children,
    missingEventRedirectTo,
    requireHost = false,
    allowVendorCapability,
    guestRedirectTo,
    fallback,
}: EventRouteGateProps) {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const activeEvent = useActiveEvent();
    const isHost = useIsHost();
    const isContextLoading = useEventContextLoading();
    const eventId = activeEvent?.id ?? null;
    const resolvedMissingEventRedirectTo = missingEventRedirectTo ?? (isAuthenticated ? routes.home : routes.login);
    // Only a non-host on a vendor-open screen asks for the vendor role.
    const asksVendor = requireHost && Boolean(allowVendorCapability) && !isHost;
    const vendor = useHasVendorCapability(asksVendor ? eventId : null, allowVendorCapability ?? 'QR_READ');
    const vendorPending = asksVendor && vendor.isLoading;
    const blocked = requireHost && !isHost && !(asksVendor && vendor.allowed);

    useEffect(() => {
        if (isContextLoading || vendorPending) return;

        if (!eventId) {
            router.replace(resolvedMissingEventRedirectTo);
            return;
        }

        if (blocked) {
            router.replace(guestRedirectTo ?? routes.events.feed(eventId));
        }
    }, [blocked, eventId, guestRedirectTo, isContextLoading, resolvedMissingEventRedirectTo, router, vendorPending]);

    if (isContextLoading || !activeEvent || vendorPending || blocked) {
        return fallback ?? <EventRouteSpinner />;
    }

    const value = { activeEvent, eventId: activeEvent.id, isHost };
    return <EventRouteContext.Provider value={value}>{children}</EventRouteContext.Provider>;
}
```
Keep `useEventRouteContext` and `EventRouteSpinner` below it unchanged.

`useMyVendorRole(null)` is disabled, so a TanStack query with `enabled: false` reports `isLoading: false`; hosts and pages without the prop never wait.

- [ ] **Step 4: Run the new test and every existing gate user's tests**

Run: `npx vitest run components/routing "app/(main)/(app)/(event)"`
Expected: PASS. Existing page tests that mock `EventRouteGate`'s imports may now need `vi.mock('@/hooks/useVendors', () => ({ useHasVendorCapability: () => ({ allowed: false, isLoading: false }) }))`; add it where a test fails on a missing QueryClient.

- [ ] **Step 5: Commit**

```bash
git add components/routing app
git commit -m "feat(vendors): let a vendor capability through EventRouteGate

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Tools menu and host menu entries

**Files:**
- Modify: `hooks/useToolsMenuItems.ts`
- Test: `hooks/useToolsMenuItems.test.tsx` (extend)

- [ ] **Step 1: Write the failing tests**

In `hooks/useToolsMenuItems.test.tsx`, add the vendor mocks next to the existing ones:
```tsx
const vendor = vi.hoisted(() => ({ me: null as Record<string, unknown> | null, list: [] as unknown[] }));
vi.mock('@/hooks/useVendors', () => ({
    useMyVendorRole: () => ({ data: vendor.me }),
    useEventVendors: () => ({ data: vendor.list }),
}));
```
reset them in `beforeEach` (`vendor.me = null; vendor.list = [];`), and add a helper and cases:
```tsx
function vendorEvent() {
    const base = event();
    return { ...base, modules: [...(base.modules as object[]), { moduleKey: 'vendors', isEnabled: true, isAvailable: true, configuration: {} }] };
}

function role(type: string, capabilities: string[], accessOpen = true) {
    return { vendorId: 'v1', vendorType: type, capabilities, accessEndsAt: null, accessOpen, profileComplete: true, showPartnerPrompt: false, proStorageBytes: null, proUsedBytes: null, optedOut: false, hiddenByHost: false };
}

describe('vendor tools in the menu', () => {
    beforeEach(() => {
        mocks.isHost = false;
        mocks.activeEvent = vendorEvent();
    });

    it('gives a planner their page, announcement, RSVP report and share links', () => {
        vendor.me = role('PLANNER', ['ANNOUNCE', 'QR_READ', 'RSVP_REPORT', 'SCHEDULE_EDIT']);
        const keys = renderHook(() => useToolsMenuItems()).result.current.map((item) => item.key);
        expect(keys).toEqual(expect.arrayContaining(['vendorMe', 'announcement', 'rsvpReport', 'vendorQr']));
        expect(keys).not.toContain('liveRequests');
    });

    it('gives a DJ their page and live requests only', () => {
        vendor.me = role('MUSIC', ['SONG_REQUESTS']);
        const keys = renderHook(() => useToolsMenuItems()).result.current.map((item) => item.key);
        expect(keys).toEqual(expect.arrayContaining(['vendorMe', 'liveRequests']));
        expect(keys).not.toContain('announcement');
        expect(keys).not.toContain('vendorQr');
    });

    it('gives a photographer and a venue only their page', () => {
        for (const me of [role('PHOTOGRAPHER', ['PRO_ALBUM']), role('VENUE', [])]) {
            vendor.me = me;
            const keys = renderHook(() => useToolsMenuItems()).result.current.map((item) => item.key);
            expect(keys).toContain('vendorMe');
            expect(keys.filter((key) => ['announcement', 'rsvpReport', 'vendorQr', 'liveRequests'].includes(key))).toEqual([]);
        }
    });

    it('keeps only the vendor page after the access window', () => {
        vendor.me = role('PLANNER', ['ANNOUNCE', 'QR_READ', 'RSVP_REPORT', 'SCHEDULE_EDIT'], false);
        const keys = renderHook(() => useToolsMenuItems()).result.current.map((item) => item.key);
        expect(keys).toContain('vendorMe');
        expect(keys).not.toContain('announcement');
    });

    it('shows a guest no vendor tools', () => {
        const keys = renderHook(() => useToolsMenuItems()).result.current.map((item) => item.key);
        expect(keys).not.toContain('vendorMe');
    });

    it('shows the vendor list once one vendor is listed', () => {
        expect(renderHook(() => useToolsMenuItems()).result.current.map((item) => item.key)).not.toContain('vendors');
        vendor.list = [{ id: 'v1', businessName: 'Studio X', hiddenByHost: true }];
        expect(renderHook(() => useToolsMenuItems()).result.current.map((item) => item.key)).not.toContain('vendors');
        vendor.list = [{ id: 'v1', businessName: 'Studio X' }];
        expect(renderHook(() => useToolsMenuItems()).result.current.map((item) => item.key)).toContain('vendors');
    });

    it('shows nothing vendor-related without the module', () => {
        mocks.activeEvent = event();
        vendor.me = role('MUSIC', ['SONG_REQUESTS']);
        vendor.list = [{ id: 'v1', businessName: 'Studio X' }];
        const keys = renderHook(() => useToolsMenuItems()).result.current.map((item) => item.key);
        expect(keys).not.toContain('vendors');
        expect(keys).not.toContain('vendorMe');
    });
});

describe('vendor entries in the host menu', () => {
    beforeEach(() => {
        mocks.isHost = true;
    });

    it('adds Vendors and Announcement for a live event with the module', () => {
        mocks.activeEvent = vendorEvent();
        const keys = renderHook(() => useHostMenuItems()).result.current.map((item) => item.key);
        expect(keys).toEqual(expect.arrayContaining(['vendors', 'announcement']));
    });

    it('has no Vendors entry without the module, and neither entry on a draft', () => {
        mocks.activeEvent = event();
        expect(renderHook(() => useHostMenuItems()).result.current.map((item) => item.key)).not.toContain('vendors');
        mocks.activeEvent = { ...vendorEvent(), status: 'DRAFT' };
        const draftKeys = renderHook(() => useHostMenuItems()).result.current.map((item) => item.key);
        expect(draftKeys).not.toContain('vendors');
        expect(draftKeys).not.toContain('announcement');
    });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run hooks/useToolsMenuItems.test.tsx`
Expected: FAIL on the new cases.

- [ ] **Step 3: Implement**

`hooks/useToolsMenuItems.ts`:

Add to the `lucide-react` import: `BriefcaseBusiness`, `Megaphone`, `ListMusic`, `ClipboardList`, `Store`. Add:
```ts
import { useEventVendors, useMyVendorRole } from '@/hooks/useVendors';
import { hasVendorCapability, listedVendors } from '@/lib/vendors';
```

In `useToolsMenuItems`, after `const giftAccount = …`:
```ts
    const routeEventId = useRouteEventId();
    const vendorRole = useMyVendorRole(routeEventId);
    const vendorList = useEventVendors(routeEventId);
```
and change the existing `useGiftAccount(useRouteEventId())` to `useGiftAccount(routeEventId)` (declare `routeEventId` above it).

After `const isDeleted = …`:
```ts
    const vendorsOn = availableModules.has('vendors');
    const me = vendorsOn ? (vendorRole.data ?? null) : null;
    const hasVendorsListed = vendorsOn && listedVendors(vendorList.data ?? []).length > 0;
```

Append to `toolDefinitions`:
```ts
        // Vendors in the event (vendors spec 2026-10-19). Copy comes from ToolsMenu.items.
        { key: 'vendors', href: routes.events.tools.vendors(activeEvent.id), icon: Store },
        { key: 'vendorMe', href: routes.events.tools.vendorMe(activeEvent.id), icon: BriefcaseBusiness },
        { key: 'announcement', href: routes.events.tools.announcement(activeEvent.id), icon: Megaphone },
        { key: 'rsvpReport', href: routes.events.rsvpReport(activeEvent.id, 'FULL_LIST', 'vendor'), icon: ClipboardList },
        { key: 'vendorQr', href: routes.events.invitationsQr(activeEvent.id), icon: QrCode },
        { key: 'liveRequests', href: routes.events.tools.playlistLive(activeEvent.id), icon: ListMusic },
```

Add filters before the `isDeleted` filter:
```ts
        .filter((tool) => tool.key !== 'vendors' || hasVendorsListed)
        .filter((tool) => tool.key !== 'vendorMe' || me !== null)
        .filter((tool) => tool.key !== 'announcement' || hasVendorCapability(me, 'ANNOUNCE'))
        .filter((tool) => tool.key !== 'rsvpReport' || hasVendorCapability(me, 'RSVP_REPORT'))
        .filter((tool) => tool.key !== 'vendorQr' || hasVendorCapability(me, 'QR_READ'))
        .filter((tool) => tool.key !== 'liveRequests' || hasVendorCapability(me, 'SONG_REQUESTS'))
```
A host is never a vendor (`VENDOR_IS_HOST`), so hosts never see the four vendor tools here; they reach announcement through the host menu and the others through Manage.

In `useHostMenuItems`, add `Megaphone` and `Store` uses, read `readableModuleKeys`:
```ts
    const vendorsOn = readableModuleKeys(activeEvent).has('vendors');
```
and add to `hostAdminDefinitions` after `invitationsQr`:
```ts
        { key: 'vendors', href: routes.events.manageVendors(activeEvent.id), icon: Store, hidden: isDeleted || isDraft || !vendorsOn },
        { key: 'announcement', href: routes.events.tools.announcement(activeEvent.id), icon: Megaphone, hidden: isDeleted || isDraft },
```

`hooks/useRightContextPanel.ts` filters the host items it shows as actions (`galleryQr`, `invitationsQr`); leave `vendors` and `announcement` in.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run hooks/useToolsMenuItems.test.tsx components/layout`
Expected: PASS. Layout tests that render the menus may need the same `@/hooks/useVendors` mock.

- [ ] **Step 5: Commit**

```bash
git add hooks/useToolsMenuItems.ts hooks/useToolsMenuItems.test.tsx components/layout
git commit -m "feat(vendors): vendor tools in the tools and host menus

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Manage → Vendors page

The host's page: one row per vendor type link (copy, share, QR, reset), then the vendors who joined. Tapping a vendor opens a sheet with hide/show and remove. Reset and remove each ask first.

**Files:**
- Modify: `lib/vendors.ts`, `lib/vendors.test.ts`
- Create: `hooks/useManageVendors.ts`, `hooks/useManageVendors.test.tsx`
- Create: `components/vendors/VendorLogo.tsx`, `components/vendors/VendorsSkeletons.tsx`
- Create: `components/vendors/manage/ManageVendorsScreen.tsx`, `VendorLinkRow.tsx`, `VendorLinkQrModal.tsx`, `VendorRow.tsx`, `VendorSheet.tsx`, `ManageVendorsScreen.test.tsx`
- Create: `EVENT/manage/vendors/page.tsx`, `PageClient.tsx`, `loading.tsx`, `page.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `lib/vendors.test.ts`:
```ts
import { sortByVendorType } from '@/lib/vendors';

describe('sortByVendorType', () => {
    it('orders rows like VENDOR_TYPES and leaves the input as it was', () => {
        const rows = [{ vendorType: 'MUSIC' as const }, { vendorType: 'PLANNER' as const }, { vendorType: 'PHOTOGRAPHER' as const }];
        expect(sortByVendorType(rows).map((row) => row.vendorType)).toEqual(['PLANNER', 'PHOTOGRAPHER', 'MUSIC']);
        expect(rows[0].vendorType).toBe('MUSIC');
    });
});
```

`hooks/useManageVendors.test.tsx`:
```tsx
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useManageVendors } from '@/hooks/useManageVendors';

const reset = vi.fn();
const patch = vi.fn();
const remove = vi.fn();
const data = vi.hoisted(() => ({ links: [] as unknown[], vendors: [] as unknown[] }));
vi.mock('@/hooks/useVendors', () => ({
    useVendorLinks: () => ({ data: data.links, isLoading: false }),
    useEventVendors: () => ({ data: data.vendors, isLoading: false }),
    useResetVendorLink: () => ({ mutateAsync: reset, isPending: false }),
    usePatchVendor: () => ({ mutateAsync: patch, isPending: false }),
    useRemoveVendor: () => ({ mutateAsync: remove, isPending: false }),
}));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'failed' }));

const DJ = { id: 'v2', memberId: 'm2', vendorType: 'MUSIC', businessName: 'DJ Nik', link: '@djnik', logoUrl: null, joinedAt: '2026-10-01T10:00:00Z', hiddenByHost: false, optedOut: false };

beforeEach(() => {
    reset.mockReset();
    patch.mockReset();
    remove.mockReset();
    data.links = [
        { vendorType: 'MUSIC', inviteToken: 't-music', createdAt: null },
        { vendorType: 'PLANNER', inviteToken: 't-planner', createdAt: null },
    ];
    data.vendors = [DJ];
});

describe('useManageVendors', () => {
    it('orders the links by type', () => {
        const { result } = renderHook(() => useManageVendors('e1'));
        expect(result.current.links.map((link) => link.vendorType)).toEqual(['PLANNER', 'MUSIC']);
    });

    it('resets a link only after the confirmation', async () => {
        reset.mockResolvedValue({});
        const { result } = renderHook(() => useManageVendors('e1'));
        act(() => result.current.requestReset('MUSIC'));
        expect(result.current.resetType).toBe('MUSIC');
        expect(reset).not.toHaveBeenCalled();
        await act(() => result.current.confirmReset());
        expect(reset).toHaveBeenCalledWith('MUSIC');
        expect(result.current.resetType).toBeNull();
    });

    it('cancelling a reset sends nothing', () => {
        const { result } = renderHook(() => useManageVendors('e1'));
        act(() => result.current.requestReset('MUSIC'));
        act(() => result.current.cancelReset());
        expect(result.current.resetType).toBeNull();
        expect(reset).not.toHaveBeenCalled();
    });

    it('a failed reset shows the error', async () => {
        reset.mockRejectedValue(new Error('500'));
        const { result } = renderHook(() => useManageVendors('e1'));
        act(() => result.current.requestReset('MUSIC'));
        await act(() => result.current.confirmReset());
        expect(result.current.error).toBe('failed');
        expect(result.current.resetType).toBeNull();
    });

    it('hides and shows the open vendor', async () => {
        patch.mockResolvedValue({});
        const { result } = renderHook(() => useManageVendors('e1'));
        act(() => result.current.openVendor('v2'));
        expect(result.current.selectedVendor).toEqual(DJ);
        await act(() => result.current.toggleHidden());
        expect(patch).toHaveBeenCalledWith({ vendorId: 'v2', patch: { hiddenByHost: true } });
    });

    it('removes the open vendor after the confirmation and closes the sheet', async () => {
        remove.mockResolvedValue(undefined);
        const { result } = renderHook(() => useManageVendors('e1'));
        act(() => result.current.openVendor('v2'));
        act(() => result.current.requestRemove());
        expect(result.current.removeOpen).toBe(true);
        await act(() => result.current.confirmRemove());
        expect(remove).toHaveBeenCalledWith('v2');
        expect(result.current.removeOpen).toBe(false);
        expect(result.current.selectedVendor).toBeNull();
    });

    it('shows the server error and keeps the sheet open when removing fails', async () => {
        remove.mockRejectedValue(new Error('500'));
        const { result } = renderHook(() => useManageVendors('e1'));
        act(() => result.current.openVendor('v2'));
        act(() => result.current.requestRemove());
        await act(() => result.current.confirmRemove());
        expect(result.current.error).toBe('failed');
        expect(result.current.selectedVendor).toEqual(DJ);
    });

    it('opens the QR for one link', () => {
        const { result } = renderHook(() => useManageVendors('e1'));
        act(() => result.current.openQr('PLANNER'));
        expect(result.current.qrLink?.inviteToken).toBe('t-planner');
        act(() => result.current.closeQr());
        expect(result.current.qrLink).toBeNull();
    });
});
```

`components/vendors/manage/ManageVendorsScreen.test.tsx`:
```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ManageVendorsScreen } from '@/components/vendors/manage/ManageVendorsScreen';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
    useLocale: () => 'en',
}));
vi.mock('@/components/routing/EventRouteGate', () => ({ useEventRouteContext: () => ({ eventId: 'e1', activeEvent: { id: 'e1' }, isHost: true }) }));
const readable = vi.hoisted(() => ({ value: true }));
vi.mock('@/hooks/useModuleReadable', () => ({ useModuleReadable: () => readable.value }));
vi.mock('@/hooks/useCopyText', () => ({ useCopyText: () => ({ copied: false, copy: vi.fn() }) }));
vi.mock('@/hooks/useNativeShare', () => ({ useNativeShare: () => ({ canShare: false, share: vi.fn() }) }));
vi.mock('@/hooks/useShareLink', () => ({ useShareLink: (url: string) => url }));
const page = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock('@/hooks/useManageVendors', () => ({ useManageVendors: () => page.value }));

function state(overrides: Record<string, unknown> = {}) {
    return {
        links: [{ vendorType: 'PHOTOGRAPHER', inviteToken: 't1', createdAt: null }],
        vendors: [],
        isLoading: false,
        selectedVendor: null,
        resetType: null,
        removeOpen: false,
        qrLink: null,
        error: null,
        isResetting: false,
        isPatching: false,
        isRemoving: false,
        requestReset: vi.fn(),
        cancelReset: vi.fn(),
        confirmReset: vi.fn(),
        openVendor: vi.fn(),
        closeVendor: vi.fn(),
        toggleHidden: vi.fn(),
        requestRemove: vi.fn(),
        cancelRemove: vi.fn(),
        confirmRemove: vi.fn(),
        openQr: vi.fn(),
        closeQr: vi.fn(),
        ...overrides,
    };
}

beforeEach(() => {
    readable.value = true;
    page.value = state();
});
afterEach(cleanup);

describe('ManageVendorsScreen', () => {
    it('lists one link row per type and the empty joined list', () => {
        render(<ManageVendorsScreen />);
        expect(screen.getByText('types.PHOTOGRAPHER')).toBeTruthy();
        expect(screen.getByText('manage.joinedEmpty')).toBeTruthy();
    });

    it('asks before resetting', () => {
        render(<ManageVendorsScreen />);
        fireEvent.click(screen.getByRole('button', { name: 'manage.reset' }));
        expect(page.value.requestReset).toHaveBeenCalledWith('PHOTOGRAPHER');
    });

    it('shows a joined vendor, with "Hidden" when hidden, and opens the sheet', () => {
        page.value = state({
            vendors: [{ id: 'v1', memberId: 'm1', vendorType: 'PHOTOGRAPHER', businessName: 'Studio X', link: '@studio.x', logoUrl: null, joinedAt: '2026-10-01T10:00:00Z', hiddenByHost: true, optedOut: false }],
        });
        render(<ManageVendorsScreen />);
        expect(screen.getByText('Studio X')).toBeTruthy();
        expect(screen.getByText('manage.hidden')).toBeTruthy();
        fireEvent.click(screen.getByText('Studio X'));
        expect(page.value.openVendor).toHaveBeenCalledWith('v1');
    });

    it('names a vendor without a profile plainly', () => {
        page.value = state({
            vendors: [{ id: 'v1', memberId: 'm1', vendorType: 'MUSIC', businessName: null, link: null, logoUrl: null, joinedAt: '2026-10-01T10:00:00Z', hiddenByHost: false, optedOut: false }],
        });
        render(<ManageVendorsScreen />);
        expect(screen.getByText('manage.noProfile')).toBeTruthy();
    });

    it('shows the module notice without the module', () => {
        readable.value = false;
        render(<ManageVendorsScreen />);
        expect(screen.getByText('manage.unavailable')).toBeTruthy();
        expect(screen.queryByText('manage.linksTitle')).toBeNull();
    });
});
```

`EVENT/manage/vendors/page.test.tsx`. Open an existing prefetch page test first (for example `EVENT/manage/rsvp/reports/[reportType]/page.test.tsx`) and copy its mocking style for `serverGet`, the context resolvers and how it reads the seeded cache. The cases are fixed:
```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';

const serverGet = vi.fn();
vi.mock('@/lib/api/serverFetch', () => ({ serverGet: (...a: unknown[]) => serverGet(...a) }));
const ctx = vi.hoisted(() => ({ context: null as null | { accessToken: string; isHost: boolean }, event: null as unknown }));
vi.mock('@/lib/auth/serverEventContext', () => ({
    resolveServerEventContext: async () => ctx.context,
    resolveServerEventDetail: async () => ctx.event,
}));
vi.mock('./PageClient', () => ({ default: () => null }));

import Page from './page';

const VENDOR_EVENT = { id: 'e1', status: 'ACTIVE', modules: [{ moduleKey: 'vendors', isEnabled: true, isAvailable: true, configuration: {} }] };

beforeEach(() => {
    serverGet.mockReset();
    ctx.context = { accessToken: 'tok', isHost: true };
    ctx.event = VENDOR_EVENT;
});

describe('Manage → Vendors prefetch', () => {
    it('fetches the links and the list for a host', async () => {
        serverGet.mockResolvedValue([]);
        await Page({ params: Promise.resolve({ eventId: 'e1' }) });
        expect(serverGet).toHaveBeenCalledWith('/api/events/e1/vendors/links', 'tok');
        expect(serverGet).toHaveBeenCalledWith('/api/events/e1/vendors', 'tok');
        // Also assert the dehydrated state holds vendorKeys.links('e1') and vendorKeys.list('e1'), the way the reference test reads it.
    });

    it('fetches nothing for a guest, without the module, or on an in-app navigation', async () => {
        ctx.context = { accessToken: 'tok', isHost: false };
        await Page({ params: Promise.resolve({ eventId: 'e1' }) });
        ctx.context = { accessToken: 'tok', isHost: true };
        ctx.event = { ...VENDOR_EVENT, modules: [] };
        await Page({ params: Promise.resolve({ eventId: 'e1' }) });
        ctx.context = null;
        await Page({ params: Promise.resolve({ eventId: 'e1' }) });
        expect(serverGet).not.toHaveBeenCalled();
    });

    it('still renders when Spring fails', async () => {
        serverGet.mockRejectedValue(new Error('down'));
        await expect(Page({ params: Promise.resolve({ eventId: 'e1' }) })).resolves.toBeTruthy();
    });
});
```
Replace the comment in the first case with the reference test's own assertion on the dehydrated cache (both keys present, from `vendorKeys` in `@/hooks/useVendors`).

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run lib/vendors.test.ts hooks/useManageVendors.test.tsx components/vendors "app/(main)/(app)/(event)/events/[eventId]/manage/vendors"`
Expected: FAIL, modules not found.

- [ ] **Step 3: Add `sortByVendorType`**

`lib/vendors.ts`:
```ts
// A copy of the rows in VENDOR_TYPES order.
export function sortByVendorType<T extends { vendorType: PartnerRole }>(rows: readonly T[]): T[] {
    return [...rows].sort((a, b) => VENDOR_TYPES.indexOf(a.vendorType) - VENDOR_TYPES.indexOf(b.vendorType));
}
```

- [ ] **Step 4: Write `hooks/useManageVendors.ts`**

```ts
'use client';

import { useCallback, useMemo, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useEventVendors, usePatchVendor, useRemoveVendor, useResetVendorLink, useVendorLinks } from '@/hooks/useVendors';
import type { PartnerRole } from '@/lib/api/types';
import { sortByVendorType } from '@/lib/vendors';

// Manage → Vendors: the links, the joined vendors, the open sheet and the two confirmations.
export function useManageVendors(eventId: string) {
    const toErrorMessage = useApiErrorMessage();
    const linksQuery = useVendorLinks(eventId, true);
    const vendorsQuery = useEventVendors(eventId);
    const resetLink = useResetVendorLink(eventId);
    const patchVendor = usePatchVendor(eventId);
    const removeVendor = useRemoveVendor(eventId);
    const [resetType, setResetType] = useState<PartnerRole | null>(null);
    const [qrType, setQrType] = useState<PartnerRole | null>(null);
    const [openVendorId, setOpenVendorId] = useState<string | null>(null);
    const [removeOpen, setRemoveOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const links = useMemo(() => sortByVendorType(linksQuery.data ?? []), [linksQuery.data]);
    const vendors = useMemo(() => vendorsQuery.data ?? [], [vendorsQuery.data]);
    const selectedVendor = vendors.find((vendor) => vendor.id === openVendorId) ?? null;
    const qrLink = links.find((link) => link.vendorType === qrType) ?? null;

    const requestReset = useCallback((type: PartnerRole) => {
        setError(null);
        setResetType(type);
    }, []);
    const cancelReset = useCallback(() => setResetType(null), []);
    const confirmReset = useCallback(async () => {
        if (!resetType) return;
        try {
            await resetLink.mutateAsync(resetType);
        } catch (resetError) {
            setError(toErrorMessage(resetError));
        } finally {
            setResetType(null);
        }
    }, [resetLink, resetType, toErrorMessage]);

    const openVendor = useCallback((vendorId: string) => {
        setError(null);
        setOpenVendorId(vendorId);
    }, []);
    const closeVendor = useCallback(() => {
        setOpenVendorId(null);
        setRemoveOpen(false);
    }, []);

    const toggleHidden = useCallback(async () => {
        if (!selectedVendor) return;
        setError(null);
        try {
            await patchVendor.mutateAsync({ vendorId: selectedVendor.id, patch: { hiddenByHost: !selectedVendor.hiddenByHost } });
        } catch (patchError) {
            setError(toErrorMessage(patchError));
        }
    }, [patchVendor, selectedVendor, toErrorMessage]);

    const requestRemove = useCallback(() => setRemoveOpen(true), []);
    const cancelRemove = useCallback(() => setRemoveOpen(false), []);
    const confirmRemove = useCallback(async () => {
        if (!selectedVendor) return;
        setError(null);
        try {
            await removeVendor.mutateAsync(selectedVendor.id);
            setOpenVendorId(null);
        } catch (removeError) {
            setError(toErrorMessage(removeError));
        } finally {
            setRemoveOpen(false);
        }
    }, [removeVendor, selectedVendor, toErrorMessage]);

    const openQr = useCallback((type: PartnerRole) => setQrType(type), []);
    const closeQr = useCallback(() => setQrType(null), []);

    return {
        links,
        vendors,
        isLoading: linksQuery.isLoading || vendorsQuery.isLoading,
        selectedVendor,
        resetType,
        removeOpen,
        qrLink,
        error,
        isResetting: resetLink.isPending,
        isPatching: patchVendor.isPending,
        isRemoving: removeVendor.isPending,
        requestReset,
        cancelReset,
        confirmReset,
        openVendor,
        closeVendor,
        toggleHidden,
        requestRemove,
        cancelRemove,
        confirmRemove,
        openQr,
        closeQr,
    };
}
```

- [ ] **Step 5: Write the small shared pieces**

`components/vendors/VendorLogo.tsx`:
```tsx
import { Store } from 'lucide-react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { cn } from '@/lib/utils';

// The vendor's logo, or a plain icon tile when there is none.
export function VendorLogo({ logoUrl, name, className }: { logoUrl: string | null; name: string; className?: string }) {
    return (
        <span className={cn('relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-muted', className)}>
            {logoUrl ? (
                <ProtectedImage src={logoUrl} alt={name} fill sizes="48px" className="object-contain" />
            ) : (
                <Store className="size-5 text-ink-muted" aria-hidden="true" />
            )}
        </span>
    );
}
```

`components/vendors/VendorsSkeletons.tsx`:
```tsx
import { Skeleton } from '@/components/ui/skeleton';

// Rows only; each page keeps its own header.
export function VendorRowsSkeleton({ rows = 3 }: { rows?: number }) {
    return (
        <div className="flex flex-col gap-3" aria-hidden="true">
            {Array.from({ length: rows }, (_, index) => (
                <div key={index} className="flex items-center gap-3 py-2">
                    <Skeleton className="size-10 rounded-xl" />
                    <div className="flex flex-1 flex-col gap-1.5">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-1/4" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function VendorsPageSkeleton() {
    return (
        <div className="mx-auto max-w-2xl px-4 pb-8 pt-6">
            <Skeleton className="mx-auto mb-6 h-7 w-40" />
            <VendorRowsSkeleton rows={4} />
        </div>
    );
}
```

- [ ] **Step 6: Write the rows, the QR modal and the sheet**

`components/vendors/manage/VendorLinkRow.tsx`:
```tsx
'use client';

import { Copy, QrCode, RotateCcw, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { useCopyText } from '@/hooks/useCopyText';
import { useNativeShare } from '@/hooks/useNativeShare';
import { useShareLink } from '@/hooks/useShareLink';
import type { VendorLinkDto } from '@/lib/api/types';
import { vendorInviteUrl } from '@/lib/vendors';

export function VendorLinkRow({ link, onQrAction, onResetAction }: { link: VendorLinkDto; onQrAction: () => void; onResetAction: () => void }) {
    const t = useTranslations('Vendors');
    const typeLabel = t(`types.${link.vendorType}`);
    // Copied and shared links carry the host's language, like the event's share links.
    const shareUrl = useShareLink(vendorInviteUrl(link.inviteToken));
    const { copied, copy } = useCopyText(shareUrl);
    const { canShare, share } = useNativeShare(shareUrl, typeLabel);

    return (
        <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Type */}
            <p className="text-sm font-semibold text-ink">{typeLabel}</p>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-1.5">
                <Button type="button" variant="outline" size="lg" onClick={copy}>
                    <Copy aria-hidden="true" />
                    {copied ? t('manage.copied') : t('manage.copy')}
                </Button>
                {canShare && (
                    <Button type="button" variant="outline" size="lg" onClick={share}>
                        <Share2 aria-hidden="true" />
                        {t('manage.share')}
                    </Button>
                )}
                <Button type="button" variant="ghost" size="icon-lg" onClick={onQrAction} aria-label={t('manage.qr')}>
                    <QrCode aria-hidden="true" />
                </Button>
                <Button type="button" variant="ghost" size="icon-lg" onClick={onResetAction} aria-label={t('manage.reset')}>
                    <RotateCcw aria-hidden="true" />
                </Button>
            </div>
        </li>
    );
}
```

`components/vendors/manage/VendorLinkQrModal.tsx`:
```tsx
'use client';

import { useTranslations } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';

import { Modal } from '@/components/ui/modal';
import type { VendorLinkDto } from '@/lib/api/types';
import { vendorInviteUrl } from '@/lib/vendors';

// The printed code stays language-neutral, like the event's QR links.
export function VendorLinkQrModal({ link, onCloseAction }: { link: VendorLinkDto | null; onCloseAction: () => void }) {
    const t = useTranslations('Vendors');

    return (
        <Modal open={link !== null} onClose={onCloseAction} size="sm" closeLabel={t('manage.close')}>
            {link && (
                <Modal.Body>
                    {/* Title */}
                    <h2 className="mb-4 text-center text-base font-bold text-ink">{t('manage.qrTitle', { type: t(`types.${link.vendorType}`) })}</h2>

                    {/* Code */}
                    <div className="mx-auto w-fit rounded-2xl bg-white p-4">
                        <QRCodeSVG value={vendorInviteUrl(link.inviteToken)} size={220} marginSize={0} />
                    </div>
                </Modal.Body>
            )}
        </Modal>
    );
}
```
Check `QRCodeSVG`'s props in `QrCodeCard.tsx` (`marginSize` or `includeMargin`, by the installed `qrcode.react` version) and use the same.

`components/vendors/manage/VendorRow.tsx`:
```tsx
'use client';

import { useTranslations } from 'next-intl';

import { VendorLogo } from '@/components/vendors/VendorLogo';
import type { VendorRowDto } from '@/lib/api/types';

export function VendorRow({ vendor, onOpenAction }: { vendor: VendorRowDto; onOpenAction: () => void }) {
    const t = useTranslations('Vendors');
    const name = vendor.businessName ?? t('manage.noProfile');
    const isHidden = Boolean(vendor.hiddenByHost || vendor.optedOut);

    return (
        <li>
            <button type="button" onClick={onOpenAction} className="flex w-full items-center gap-3 py-3 text-left focus-ring">
                <VendorLogo logoUrl={vendor.logoUrl} name={name} />
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{name}</span>
                    <span className="block text-xs text-ink-muted">{t(`types.${vendor.vendorType}`)}</span>
                </span>
                {isHidden && <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold text-ink-muted">{t('manage.hidden')}</span>}
            </button>
        </li>
    );
}
```

`components/vendors/manage/VendorSheet.tsx`:
```tsx
'use client';

import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { VendorLogo } from '@/components/vendors/VendorLogo';
import type { VendorRowDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

export function VendorSheet({
    vendor,
    error,
    isPatching,
    onCloseAction,
    onToggleHiddenAction,
    onRemoveAction,
}: {
    vendor: VendorRowDto | null;
    error: string | null;
    isPatching: boolean;
    onCloseAction: () => void;
    onToggleHiddenAction: () => void;
    onRemoveAction: () => void;
}) {
    const t = useTranslations('Vendors');
    const locale = useLocale();
    const name = vendor?.businessName ?? t('manage.noProfile');

    return (
        <Modal open={vendor !== null} onClose={onCloseAction} variant="sheet" size="sm" closeLabel={t('manage.close')}>
            {vendor && (
                <Modal.Body>
                    {/* Vendor */}
                    <div className="flex items-center gap-3">
                        <VendorLogo logoUrl={vendor.logoUrl} name={name} className="size-12" />
                        <div className="min-w-0">
                            <h2 className="truncate text-base font-bold text-ink">{name}</h2>
                            <p className="text-sm text-ink-muted">{t(`types.${vendor.vendorType}`)}</p>
                            <p className="text-xs text-ink-muted">{t('manage.sheetJoined', { date: formatDate(locale, vendor.joinedAt, { dateStyle: 'medium' }) })}</p>
                        </div>
                    </div>

                    {/* Listing */}
                    <div className="mt-5 flex flex-col gap-2">
                        {vendor.optedOut && <p className="text-sm text-ink-muted">{t('manage.optedOut')}</p>}
                        <Button type="button" variant="outline" size="lg" onClick={onToggleHiddenAction} disabled={isPatching}>
                            {vendor.hiddenByHost ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                            {vendor.hiddenByHost ? t('manage.show') : t('manage.hide')}
                        </Button>
                    </div>

                    {error && (
                        <p role="alert" className="mt-3 text-sm text-rose-600">
                            {error}
                        </p>
                    )}

                    {/* Danger */}
                    <div className="mt-6">
                        <Button type="button" variant="destructive" size="lg" onClick={onRemoveAction} className="w-full">
                            <Trash2 aria-hidden="true" />
                            {t('manage.remove')}
                        </Button>
                    </div>
                </Modal.Body>
            )}
        </Modal>
    );
}
```

- [ ] **Step 7: Write the screen**

`components/vendors/manage/ManageVendorsScreen.tsx`:
```tsx
'use client';

import { Store } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { VendorLinkQrModal } from '@/components/vendors/manage/VendorLinkQrModal';
import { VendorLinkRow } from '@/components/vendors/manage/VendorLinkRow';
import { VendorRow } from '@/components/vendors/manage/VendorRow';
import { VendorSheet } from '@/components/vendors/manage/VendorSheet';
import { VendorRowsSkeleton } from '@/components/vendors/VendorsSkeletons';
import { useManageVendors } from '@/hooks/useManageVendors';
import { useModuleReadable } from '@/hooks/useModuleReadable';
import { routes } from '@/lib/routes';

export function ManageVendorsScreen() {
    const t = useTranslations('Vendors');
    const { eventId } = useEventRouteContext();
    const vendorsOn = useModuleReadable(eventId, 'vendors');
    const page = useManageVendors(eventId);
    const selectedName = page.selectedVendor?.businessName ?? t('manage.noProfile');

    return (
        <ModulePageShell maxWidth="2xl" title={t('manage.title')} icon={Store} backLabel={t('manage.back')} backHref={routes.events.feed(eventId)}>
            {!vendorsOn ? (
                <p className="rounded-2xl bg-surface-muted px-4 py-3 text-sm text-ink-muted">{t('manage.unavailable')}</p>
            ) : page.isLoading ? (
                <VendorRowsSkeleton rows={4} />
            ) : (
                <>
                    {page.error && !page.selectedVendor && (
                        <p role="alert" className="mb-4 text-sm text-rose-600">
                            {page.error}
                        </p>
                    )}

                    {/* Links */}
                    <section aria-labelledby="vendor-links-title">
                        <h2 id="vendor-links-title" className="text-sm font-semibold text-ink">
                            {t('manage.linksTitle')}
                        </h2>
                        {page.links.length === 0 ? (
                            <p className="mt-2 text-sm text-ink-muted">{t('manage.linksEmpty')}</p>
                        ) : (
                            <ul className="divide-y divide-border">
                                {page.links.map((link) => (
                                    <VendorLinkRow
                                        key={link.vendorType}
                                        link={link}
                                        onQrAction={() => page.openQr(link.vendorType)}
                                        onResetAction={() => page.requestReset(link.vendorType)}
                                    />
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* Joined */}
                    <section aria-labelledby="vendor-joined-title" className="mt-8">
                        <h2 id="vendor-joined-title" className="text-sm font-semibold text-ink">
                            {t('manage.joinedTitle')}
                        </h2>
                        {page.vendors.length === 0 ? (
                            <p className="mt-2 text-sm text-ink-muted">{t('manage.joinedEmpty')}</p>
                        ) : (
                            <ul className="divide-y divide-border">
                                {page.vendors.map((vendor) => (
                                    <VendorRow key={vendor.id} vendor={vendor} onOpenAction={() => page.openVendor(vendor.id)} />
                                ))}
                            </ul>
                        )}
                    </section>
                </>
            )}

            {/* QR */}
            <VendorLinkQrModal link={page.qrLink} onCloseAction={page.closeQr} />

            {/* Vendor sheet */}
            <VendorSheet
                vendor={page.selectedVendor}
                error={page.error}
                isPatching={page.isPatching}
                onCloseAction={page.closeVendor}
                onToggleHiddenAction={page.toggleHidden}
                onRemoveAction={page.requestRemove}
            />

            {/* Reset confirmation */}
            <ConfirmActionModal
                open={page.resetType !== null}
                title={page.resetType ? t('manage.resetTitle', { type: t(`types.${page.resetType}`) }) : ''}
                body={t('manage.resetBody')}
                confirmLabel={t('manage.resetConfirm')}
                cancelLabel={t('manage.resetCancel')}
                onCloseAction={page.cancelReset}
                onConfirmAction={page.confirmReset}
                isConfirming={page.isResetting}
            />

            {/* Remove confirmation */}
            <ConfirmActionModal
                open={page.removeOpen}
                title={t('manage.removeTitle', { name: selectedName })}
                body={t('manage.removeBody')}
                confirmLabel={t('manage.removeConfirm')}
                cancelLabel={t('manage.removeCancel')}
                onCloseAction={page.cancelRemove}
                onConfirmAction={page.confirmRemove}
                isConfirming={page.isRemoving}
            />
        </ModulePageShell>
    );
}
```

- [ ] **Step 8: Write the route**

`EVENT/manage/vendors/PageClient.tsx`:
```tsx
'use client';

import { EventRouteGate } from '@/components/routing/EventRouteGate';
import { ManageVendorsScreen } from '@/components/vendors/manage/ManageVendorsScreen';
import { VendorsPageSkeleton } from '@/components/vendors/VendorsSkeletons';

export default function ManageVendorsPage() {
    return (
        <EventRouteGate requireHost fallback={<VendorsPageSkeleton />}>
            <ManageVendorsScreen />
        </EventRouteGate>
    );
}
```

`EVENT/manage/vendors/loading.tsx`:
```tsx
import { VendorsPageSkeleton } from '@/components/vendors/VendorsSkeletons';

// Shown the moment a link here is clicked, while the server renders the page.
export default function Loading() {
    return <VendorsPageSkeleton />;
}
```

`EVENT/manage/vendors/page.tsx`:
```tsx
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { vendorKeys } from '@/hooks/useVendors';
import { endpoints } from '@/lib/api/endpoints';
import { serverGet } from '@/lib/api/serverFetch';
import type { VendorLinkDto, VendorRowDto } from '@/lib/api/types';
import { resolveServerEventContext, resolveServerEventDetail } from '@/lib/auth/serverEventContext';
import { readableModuleKeys } from '@/lib/eventLifecycle';
import { makeQueryClient } from '@/lib/queryClient';

import ManageVendorsPage from './PageClient';

type PageProps = { params: Promise<{ eventId: string }> };

// Prefetches the vendor links and the joined vendors (host only, vendors module on)
// so ManageVendorsScreen finds them cached.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const queryClient = makeQueryClient();
    const [context, event] = await Promise.all([resolveServerEventContext(eventId), resolveServerEventDetail(eventId)]);

    if (context?.isHost && readableModuleKeys(event).has('vendors')) {
        try {
            const [links, vendors] = await Promise.all([
                serverGet<VendorLinkDto[]>(endpoints.events.vendorLinks(eventId), context.accessToken),
                serverGet<VendorRowDto[]>(endpoints.events.vendors(eventId), context.accessToken),
            ]);
            queryClient.setQueryData(vendorKeys.links(eventId), links);
            queryClient.setQueryData(vendorKeys.list(eventId), vendors);
        } catch {
            // Best-effort — useVendorLinks/useEventVendors fetch normally on the client if this fails.
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <ManageVendorsPage />
        </HydrationBoundary>
    );
}
```
`readableModuleKeys(null)` returns an empty set (the gallery page relies on the same).

- [ ] **Step 9: Run the tests, types and lint**

Run: `npx vitest run lib/vendors.test.ts hooks/useManageVendors.test.tsx components/vendors "app/(main)/(app)/(event)/events/[eventId]/manage/vendors" && npm run type:check && npm run lint`
Expected: PASS, clean.

- [ ] **Step 10: Commit**

```bash
git add lib/vendors.ts lib/vendors.test.ts hooks/useManageVendors.ts hooks/useManageVendors.test.tsx components/vendors "app/(main)/(app)/(event)/events/[eventId]/manage/vendors"
git commit -m "feat(vendors): Manage → Vendors page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: The vendor list for guests

The backend returns only listed vendors to guests. A host's list also carries hidden rows; this page shows only rows with neither flag set, so a host opening it sees what guests see.

**Files:**
- Modify: `lib/vendors.ts`, `lib/vendors.test.ts`
- Create: `components/vendors/list/VendorListScreen.tsx`, `VendorListRow.tsx`, `VendorListScreen.test.tsx`
- Create: `EVENT/tools/vendors/page.tsx`, `PageClient.tsx`, `loading.tsx`, `page.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `lib/vendors.test.ts`:
```ts
import { vendorLinkHref } from '@/lib/vendors';

describe('vendorLinkHref', () => {
    it('opens https links as they are and handles on Instagram', () => {
        expect(vendorLinkHref('https://studio.gr')).toBe('https://studio.gr');
        expect(vendorLinkHref('@studio.x')).toBe('https://instagram.com/studio.x');
    });

    it('opens nothing for anything else', () => {
        expect(vendorLinkHref('javascript:alert(1)')).toBeNull();
        expect(vendorLinkHref(null)).toBeNull();
    });
});
```

`components/vendors/list/VendorListScreen.test.tsx`:
```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VendorListScreen } from '@/components/vendors/list/VendorListScreen';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key) }));
vi.mock('@/components/routing/EventRouteGate', () => ({ useEventRouteContext: () => ({ eventId: 'e1', activeEvent: { id: 'e1' }, isHost: false }) }));
const list = vi.hoisted(() => ({ data: [] as unknown[], isLoading: false }));
const recordClick = vi.fn();
vi.mock('@/hooks/useVendors', () => ({
    useEventVendors: () => list,
    useRecordVendorClick: () => recordClick,
}));

beforeEach(() => {
    recordClick.mockReset();
    list.isLoading = false;
    list.data = [{ id: 'v1', memberId: 'm1', vendorType: 'PHOTOGRAPHER', businessName: 'Studio X', link: '@studio.x', logoUrl: null, joinedAt: '2026-10-01T00:00:00Z' }];
});
afterEach(cleanup);

describe('VendorListScreen', () => {
    it('shows name, type and an outgoing link that records a click', () => {
        render(<VendorListScreen />);
        const link = screen.getByRole('link', { name: 'list.open:{"name":"Studio X"}' });
        expect(link.getAttribute('href')).toBe('https://instagram.com/studio.x');
        expect(link.getAttribute('target')).toBe('_blank');
        expect(link.getAttribute('rel')).toContain('noopener');
        expect(screen.getByText('types.PHOTOGRAPHER')).toBeTruthy();
        fireEvent.click(link);
        expect(recordClick).toHaveBeenCalledWith('v1');
    });

    it('hides rows the host hid', () => {
        list.data = [{ id: 'v1', memberId: 'm1', vendorType: 'PHOTOGRAPHER', businessName: 'Studio X', link: '@studio.x', logoUrl: null, joinedAt: '2026-10-01T00:00:00Z', hiddenByHost: true }];
        render(<VendorListScreen />);
        expect(screen.queryByText('Studio X')).toBeNull();
        expect(screen.getByText('list.empty')).toBeTruthy();
    });

    it('shows the empty line', () => {
        list.data = [];
        render(<VendorListScreen />);
        expect(screen.getByText('list.empty')).toBeTruthy();
    });
});
```

`EVENT/tools/vendors/page.test.tsx`: the same mocks, `VENDOR_EVENT` and `beforeEach` as Task 9's page test, with these cases:
```tsx
describe('vendor list prefetch', () => {
    it('fetches the list for any member when the module is on', async () => {
        ctx.context = { accessToken: 'tok', isHost: false };
        serverGet.mockResolvedValue([]);
        await Page({ params: Promise.resolve({ eventId: 'e1' }) });
        expect(serverGet).toHaveBeenCalledWith('/api/events/e1/vendors', 'tok');
        // Assert the dehydrated state holds vendorKeys.list('e1'), as in Task 9.
    });

    it('fetches nothing without the module or a full page load', async () => {
        ctx.event = { ...VENDOR_EVENT, modules: [] };
        await Page({ params: Promise.resolve({ eventId: 'e1' }) });
        ctx.event = VENDOR_EVENT;
        ctx.context = null;
        await Page({ params: Promise.resolve({ eventId: 'e1' }) });
        expect(serverGet).not.toHaveBeenCalled();
    });

    it('still renders when Spring fails', async () => {
        serverGet.mockRejectedValue(new Error('down'));
        await expect(Page({ params: Promise.resolve({ eventId: 'e1' }) })).resolves.toBeTruthy();
    });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run lib/vendors.test.ts components/vendors/list "app/(main)/(app)/(event)/events/[eventId]/tools/vendors"`
Expected: FAIL.

- [ ] **Step 3: Add the link helper**

`lib/vendors.ts`:
```ts
// The outgoing link for a stored profile link: https as is, an @handle on Instagram.
export function vendorLinkHref(link: string | null): string | null {
    if (!link || !isValidVendorLink(link)) return null;
    return link.startsWith('@') ? `https://instagram.com/${link.slice(1)}` : link;
}
```

- [ ] **Step 4: Write the row and the screen**

`components/vendors/list/VendorListRow.tsx`:
```tsx
'use client';

import { ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { VendorLogo } from '@/components/vendors/VendorLogo';
import type { VendorRowDto } from '@/lib/api/types';
import { vendorLinkHref } from '@/lib/vendors';

export function VendorListRow({ vendor, onOpenAction }: { vendor: VendorRowDto; onOpenAction: () => void }) {
    const t = useTranslations('Vendors');
    const name = vendor.businessName ?? '';
    const href = vendorLinkHref(vendor.link);
    const body = (
        <>
            <VendorLogo logoUrl={vendor.logoUrl} name={name} />
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{name}</span>
                <span className="block text-xs text-ink-muted">{t(`types.${vendor.vendorType}`)}</span>
            </span>
            {href && <ExternalLink className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />}
        </>
    );

    return (
        <li>
            {href ? (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    onClick={onOpenAction}
                    aria-label={t('list.open', { name })}
                    className="flex items-center gap-3 py-3 focus-ring"
                >
                    {body}
                </a>
            ) : (
                <div className="flex items-center gap-3 py-3">{body}</div>
            )}
        </li>
    );
}
```

`components/vendors/list/VendorListScreen.tsx`:
```tsx
'use client';

import { Store } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { VendorListRow } from '@/components/vendors/list/VendorListRow';
import { VendorRowsSkeleton } from '@/components/vendors/VendorsSkeletons';
import { useEventVendors, useRecordVendorClick } from '@/hooks/useVendors';
import { routes } from '@/lib/routes';
import { listedVendors, sortByVendorType } from '@/lib/vendors';

export function VendorListScreen() {
    const t = useTranslations('Vendors');
    const { eventId } = useEventRouteContext();
    const { data = [], isLoading } = useEventVendors(eventId);
    const recordClick = useRecordVendorClick(eventId);
    // At most maxVendors rows, so no memo.
    const vendors = sortByVendorType(listedVendors(data));

    return (
        <ModulePageShell maxWidth="2xl" title={t('list.title')} icon={Store} backLabel={t('list.back')} backHref={routes.events.feed(eventId)}>
            {/* List */}
            {isLoading ? (
                <VendorRowsSkeleton />
            ) : vendors.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('list.empty')}</p>
            ) : (
                <ul className="divide-y divide-border">
                    {vendors.map((vendor) => (
                        <VendorListRow key={vendor.id} vendor={vendor} onOpenAction={() => recordClick(vendor.id)} />
                    ))}
                </ul>
            )}
        </ModulePageShell>
    );
}
```

- [ ] **Step 5: Write the route**

`EVENT/tools/vendors/PageClient.tsx`:
```tsx
'use client';

import { EventRouteGate } from '@/components/routing/EventRouteGate';
import { VendorListScreen } from '@/components/vendors/list/VendorListScreen';
import { VendorsPageSkeleton } from '@/components/vendors/VendorsSkeletons';

export default function VendorListPage() {
    return (
        <EventRouteGate fallback={<VendorsPageSkeleton />}>
            <VendorListScreen />
        </EventRouteGate>
    );
}
```

`EVENT/tools/vendors/loading.tsx`:
```tsx
import { VendorsPageSkeleton } from '@/components/vendors/VendorsSkeletons';

// Shown the moment a link here is clicked, while the server renders the page.
export default function Loading() {
    return <VendorsPageSkeleton />;
}
```

`EVENT/tools/vendors/page.tsx`:
```tsx
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { vendorKeys } from '@/hooks/useVendors';
import { endpoints } from '@/lib/api/endpoints';
import { serverGet } from '@/lib/api/serverFetch';
import type { VendorRowDto } from '@/lib/api/types';
import { resolveServerEventContext, resolveServerEventDetail } from '@/lib/auth/serverEventContext';
import { readableModuleKeys } from '@/lib/eventLifecycle';
import { makeQueryClient } from '@/lib/queryClient';

import VendorListPage from './PageClient';

type PageProps = { params: Promise<{ eventId: string }> };

// Prefetches the listed vendors for any member while the vendors module is on.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const queryClient = makeQueryClient();
    const [context, event] = await Promise.all([resolveServerEventContext(eventId), resolveServerEventDetail(eventId)]);

    if (context && readableModuleKeys(event).has('vendors')) {
        try {
            const vendors = await serverGet<VendorRowDto[]>(endpoints.events.vendors(eventId), context.accessToken);
            queryClient.setQueryData(vendorKeys.list(eventId), vendors);
        } catch {
            // Best-effort — useEventVendors fetches normally on the client if this fails.
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <VendorListPage />
        </HydrationBoundary>
    );
}
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run lib/vendors.test.ts components/vendors "app/(main)/(app)/(event)/events/[eventId]/tools/vendors" && npm run type:check`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/vendors.ts lib/vendors.test.ts components/vendors "app/(main)/(app)/(event)/events/[eventId]/tools/vendors"
git commit -m "feat(vendors): vendor list for guests

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Vendor badge on posts, comments and replies

`AuthorRoleChip` is already on every author line (posts, comments, replies, stories). It shows the vendor type when `author.vendorType` is set, in place of the member-role chip, so no call site changes.

**Files:**
- Modify: `components/memberRoles/AuthorRoleChip.tsx`
- Test: `components/memberRoles/AuthorRoleChip.test.tsx` (create, or extend if it exists)

- [ ] **Step 1: Write the failing test**

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthorRoleChip } from '@/components/memberRoles/AuthorRoleChip';
import type { AuthorDto } from '@/lib/api/types';

vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (key: string) => `${ns}.${key}` }));
vi.mock('@/hooks/useAuthorRole', () => ({
    useAuthorRole: (author: AuthorDto | null) => ({ label: author?.roleKey ? 'Bride' : null, isMine: false }),
}));

function author(overrides: Partial<AuthorDto> = {}): AuthorDto {
    return { memberId: 'm1', displayName: 'Nik', nickname: null, role: 'ATTENDEE', avatarUrl: null, roleKey: null, customRole: null, ...overrides } as AuthorDto;
}

afterEach(cleanup);

describe('AuthorRoleChip', () => {
    it('shows the vendor type for a vendor', () => {
        render(<AuthorRoleChip author={author({ vendorType: 'PHOTOGRAPHER' })} />);
        expect(screen.getByText('Vendors.types.PHOTOGRAPHER')).toBeTruthy();
    });

    it('prefers the vendor type over a member role', () => {
        render(<AuthorRoleChip author={author({ vendorType: 'MUSIC', roleKey: 'BRIDE' })} />);
        expect(screen.getByText('Vendors.types.MUSIC')).toBeTruthy();
        expect(screen.queryByText('Bride')).toBeNull();
    });

    it('keeps the member role for everyone else', () => {
        render(<AuthorRoleChip author={author({ roleKey: 'BRIDE' })} />);
        expect(screen.getByText('Bride')).toBeTruthy();
    });

    it('renders nothing without either', () => {
        const { container } = render(<AuthorRoleChip author={author({ vendorType: null })} />);
        expect(container.textContent).toBe('');
    });
});
```
Match the builder to `AuthorDto`'s fields in `lib/api/types.ts`.

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run components/memberRoles/AuthorRoleChip.test.tsx`
Expected: FAIL on the vendor cases.

- [ ] **Step 3: Implement**

`components/memberRoles/AuthorRoleChip.tsx`:
```tsx
// A vendor's chip names their type (vendors spec 2026-10-19); everyone else's is their member role.
// The viewer's own member-role chip opens the role sheet; every other chip is plain text.
export function AuthorRoleChip({
    author,
    tone = 'default',
    interactive = true,
}: {
    author: AuthorDto | null | undefined;
    tone?: 'default' | 'onDark' | 'onMuted';
    interactive?: boolean;
}) {
    const t = useTranslations('MemberRoles');
    const tVendors = useTranslations('Vendors.types');
    const { label, isMine } = useAuthorRole(author);

    if (author?.vendorType) return <RoleChip label={tVendors(author.vendorType)} tone={tone} />;
    if (!label) return null;

    return <RoleChip label={label} tone={tone} onClick={interactive && isMine ? requestMyRoleSheet : undefined} ariaLabel={isMine ? t('editMyRole') : undefined} />;
}
```

- [ ] **Step 4: Run the chip test and every test that renders an author line**

Run: `grep -rl AuthorRoleChip components app --include=*.tsx` to list the users (PostCard, CommentThreadItem, ReplyItem, StoryModal), then `npx vitest run components/memberRoles` plus each listed file's folder.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/memberRoles
git commit -m "feat(vendors): vendor badge on posts and comments

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Vendor profile sheet on first join, and on the profile page

**Files:**
- Create: `hooks/useVendorProfilePrompt.ts`, `components/vendors/VendorProfileSheet.tsx`, `components/vendors/VendorProfilePrompt.tsx`, `components/profile/ProfileVendorSection.tsx`
- Modify: `app/(main)/(app)/(event)/events/[eventId]/feed/FeedPageContent.tsx`, `components/profile/ProfileContent.tsx`
- Test: `hooks/useVendorProfilePrompt.test.tsx`, `components/vendors/VendorProfileSheet.test.tsx`, `components/profile/ProfileVendorSection.test.tsx`

- [ ] **Step 1: Write the failing tests**

`hooks/useVendorProfilePrompt.test.tsx`:
```tsx
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useVendorProfilePrompt } from '@/hooks/useVendorProfilePrompt';

const role = vi.hoisted(() => ({ data: null as null | { vendorType: string; profileComplete: boolean } }));
vi.mock('@/hooks/useVendors', () => ({ useMyVendorRole: () => ({ data: role.data }) }));
vi.mock('@/hooks/useVendorProfile', () => ({ useVendorProfile: () => ({ data: null }) }));

beforeEach(() => {
    role.data = null;
});

describe('useVendorProfilePrompt', () => {
    it('opens for a vendor without a profile, on their type', () => {
        role.data = { vendorType: 'MUSIC', profileComplete: false };
        const { result } = renderHook(() => useVendorProfilePrompt('e1'));
        expect(result.current.open).toBe(true);
        expect(result.current.defaultType).toBe('MUSIC');
    });

    it('stays closed for a vendor with a profile and for everyone else', () => {
        role.data = { vendorType: 'MUSIC', profileComplete: true };
        expect(renderHook(() => useVendorProfilePrompt('e1')).result.current.open).toBe(false);
        role.data = null;
        expect(renderHook(() => useVendorProfilePrompt('e1')).result.current.open).toBe(false);
    });

    it('"Later" closes it for this visit only', () => {
        role.data = { vendorType: 'MUSIC', profileComplete: false };
        const { result } = renderHook(() => useVendorProfilePrompt('e1'));
        act(() => result.current.close());
        expect(result.current.open).toBe(false);
        expect(renderHook(() => useVendorProfilePrompt('e1')).result.current.open).toBe(true);
    });
});
```

`components/vendors/VendorProfileSheet.test.tsx`:
```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VendorProfileSheet } from '@/components/vendors/VendorProfileSheet';

vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (key: string) => `${ns}.${key}` }));
const form = vi.hoisted(() => ({
    value: {
        values: { businessName: '', vendorType: 'MUSIC', link: '' },
        setField: vi.fn(),
        logo: null,
        setLogo: vi.fn(),
        removeLogo: false,
        setRemoveLogo: vi.fn(),
        fieldErrors: { businessName: 'required' } as Record<string, string>,
        error: null as string | null,
        isSaving: false,
        handleSubmit: vi.fn((event: { preventDefault: () => void }) => event.preventDefault()),
    },
}));
vi.mock('@/hooks/useVendorProfileForm', () => ({ useVendorProfileForm: () => form.value }));

afterEach(cleanup);

describe('VendorProfileSheet', () => {
    it('shows the fields, the field error, and every type', () => {
        render(<VendorProfileSheet open profile={null} defaultType="MUSIC" onCloseAction={vi.fn()} />);
        expect(screen.getByLabelText('Vendors.profile.businessName')).toBeTruthy();
        expect(screen.getByLabelText('Vendors.profile.link')).toBeTruthy();
        expect(screen.getByText('required')).toBeTruthy();
        expect(screen.getAllByRole('option')).toHaveLength(8);
    });

    it('submits through the form hook and offers "Later"', () => {
        const onClose = vi.fn();
        render(<VendorProfileSheet open profile={null} defaultType="MUSIC" onCloseAction={onClose} />);
        fireEvent.click(screen.getByRole('button', { name: 'Vendors.profile.save' }));
        expect(form.value.handleSubmit).toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Vendors.profile.later' }));
        expect(onClose).toHaveBeenCalled();
    });
});
```

`components/profile/ProfileVendorSection.test.tsx`:
```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProfileVendorSection } from '@/components/profile/ProfileVendorSection';

vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (key: string) => `${ns}.${key}` }));
vi.mock('@/components/vendors/VendorProfileSheet', () => ({ VendorProfileSheet: () => null }));
const profile = vi.hoisted(() => ({ data: null as unknown }));
vi.mock('@/hooks/useVendorProfile', () => ({ useVendorProfile: () => ({ data: profile.data, isLoading: false }) }));

afterEach(cleanup);

describe('ProfileVendorSection', () => {
    it('is hidden for people who never joined as a vendor', () => {
        profile.data = null;
        const { container } = render(<ProfileVendorSection />);
        expect(container.textContent).toBe('');
    });

    it('shows the business, type and link with an edit action', () => {
        profile.data = { businessName: 'Studio X', vendorType: 'PHOTOGRAPHER', link: '@studio.x', logoUrl: null, partnerPromptDismissed: false };
        render(<ProfileVendorSection />);
        expect(screen.getByText('Studio X')).toBeTruthy();
        expect(screen.getByText('Vendors.types.PHOTOGRAPHER')).toBeTruthy();
        expect(screen.getByText('@studio.x')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Vendors.profile.edit' })).toBeTruthy();
    });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run hooks/useVendorProfilePrompt.test.tsx components/vendors/VendorProfileSheet.test.tsx components/profile/ProfileVendorSection.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write `hooks/useVendorProfilePrompt.ts`**

```ts
'use client';

import { useCallback, useState } from 'react';

import { useVendorProfile } from '@/hooks/useVendorProfile';
import { useMyVendorRole } from '@/hooks/useVendors';

// The first-join sheet: open while the caller is a vendor here without a profile.
// "Later" closes it until the next visit; guests don't see the vendor until it is filled in.
export function useVendorProfilePrompt(eventId: string) {
    const role = useMyVendorRole(eventId);
    const needsProfile = role.data ? !role.data.profileComplete : false;
    const profile = useVendorProfile(needsProfile);
    const [dismissed, setDismissed] = useState(false);

    const close = useCallback(() => setDismissed(true), []);

    return {
        open: needsProfile && !dismissed,
        profile: profile.data ?? null,
        defaultType: role.data?.vendorType ?? 'OTHER',
        close,
    };
}
```

- [ ] **Step 4: Write the sheet**

`components/vendors/VendorProfileSheet.tsx`:
```tsx
'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { Modal } from '@/components/ui/modal';
import { useVendorProfileForm } from '@/hooks/useVendorProfileForm';
import type { PartnerRole, VendorProfileDto } from '@/lib/api/types';
import { VENDOR_BUSINESS_NAME_MAX, VENDOR_LINK_MAX, VENDOR_TYPES } from '@/lib/vendors';

const INPUT_CLASS = 'h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-ink focus-ring';

// Mounted only while open, so useVendorProfileForm always starts from the latest profile.
export function VendorProfileSheet({
    open,
    profile,
    defaultType,
    onCloseAction,
}: {
    open: boolean;
    profile: VendorProfileDto | null;
    defaultType: PartnerRole;
    onCloseAction: () => void;
}) {
    const t = useTranslations('Vendors.profile');
    const tTypes = useTranslations('Vendors.types');
    const form = useVendorProfileForm({ profile, defaultType, onSaved: onCloseAction });

    return (
        <Modal open={open} onClose={onCloseAction} variant="sheet" size="sm" closeDisabled={form.isSaving} ariaLabel={t('title')}>
            <Modal.Body>
                {/* Header */}
                <h2 className="text-lg font-bold text-ink">{t('title')}</h2>
                <p className="mt-1 text-sm text-ink-muted">{t('body')}</p>

                <form onSubmit={form.handleSubmit} noValidate className="mt-5 flex flex-col gap-4">
                    {/* Business name */}
                    <div>
                        <FormFieldLabel htmlFor="vendor-business-name">{t('businessName')}</FormFieldLabel>
                        <input
                            id="vendor-business-name"
                            className={INPUT_CLASS}
                            value={form.values.businessName}
                            maxLength={VENDOR_BUSINESS_NAME_MAX}
                            onChange={(event) => form.setField('businessName', event.target.value)}
                            aria-invalid={Boolean(form.fieldErrors.businessName)}
                            autoComplete="organization"
                        />
                        {form.fieldErrors.businessName && <p className="mt-1 text-xs text-rose-600">{form.fieldErrors.businessName}</p>}
                    </div>

                    {/* Type */}
                    <div>
                        <FormFieldLabel htmlFor="vendor-type">{t('type')}</FormFieldLabel>
                        <select id="vendor-type" className={INPUT_CLASS} value={form.values.vendorType} onChange={(event) => form.setField('vendorType', event.target.value)}>
                            {VENDOR_TYPES.map((type) => (
                                <option key={type} value={type}>
                                    {tTypes(type)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Link */}
                    <div>
                        <FormFieldLabel htmlFor="vendor-link">{t('link')}</FormFieldLabel>
                        <input
                            id="vendor-link"
                            className={INPUT_CLASS}
                            value={form.values.link}
                            maxLength={VENDOR_LINK_MAX}
                            placeholder={t('linkHint')}
                            onChange={(event) => form.setField('link', event.target.value)}
                            aria-invalid={Boolean(form.fieldErrors.link)}
                            inputMode="url"
                        />
                        {form.fieldErrors.link && <p className="mt-1 text-xs text-rose-600">{form.fieldErrors.link}</p>}
                    </div>

                    {/* Logo */}
                    <div>
                        <FormFieldLabel htmlFor="vendor-logo">{t('logo')}</FormFieldLabel>
                        <input
                            id="vendor-logo"
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="text-sm text-ink-muted"
                            onChange={(event) => form.setLogo(event.target.files?.[0] ?? null)}
                        />
                        {profile?.logoUrl && !form.logo && (
                            <label className="mt-2 flex items-center gap-2 text-sm text-ink">
                                <input type="checkbox" checked={form.removeLogo} onChange={(event) => form.setRemoveLogo(event.target.checked)} />
                                {t('logoRemove')}
                            </label>
                        )}
                    </div>

                    {form.error && (
                        <p role="alert" className="text-sm text-rose-600">
                            {form.error}
                        </p>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-2 sm:flex-row-reverse">
                        <Button type="submit" size="lg" disabled={form.isSaving} className="sm:flex-1">
                            {t('save')}
                        </Button>
                        <Button type="button" variant="ghost" size="lg" onClick={onCloseAction} disabled={form.isSaving} className="sm:flex-1">
                            {t('later')}
                        </Button>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    );
}
```
Check `FormFieldLabel`'s props and the backend's logo rules (the partner branding logo validation the backend reuses); set `accept` to the same image types.

`setField('vendorType', …)` passes a string; `useVendorProfileForm.setField` takes `string`, and the select only offers `VENDOR_TYPES`, so the stored value is always a `PartnerRole`. Cast it in the hook's request (`vendorType: values.vendorType as PartnerRole`) if TypeScript asks.

- [ ] **Step 5: Mount the prompt on the feed**

`components/vendors/VendorProfilePrompt.tsx`:
```tsx
'use client';

import { VendorProfileSheet } from '@/components/vendors/VendorProfileSheet';
import { useVendorProfilePrompt } from '@/hooks/useVendorProfilePrompt';

// The first-join sheet on the event feed.
export function VendorProfilePrompt({ eventId }: { eventId: string }) {
    const prompt = useVendorProfilePrompt(eventId);
    if (!prompt.open) return null;
    return <VendorProfileSheet open profile={prompt.profile} defaultType={prompt.defaultType} onCloseAction={prompt.close} />;
}
```

`FeedPageContent.tsx`, after the partner card prompt:
```tsx
            {/* Vendor profile prompt */}
            {!isHost && <VendorProfilePrompt eventId={eventId} />}
```
with `import { VendorProfilePrompt } from '@/components/vendors/VendorProfilePrompt';`. Hosts are never vendors, so they never ask.

- [ ] **Step 6: Add the profile page section**

`components/profile/ProfileVendorSection.tsx`:
```tsx
'use client';

import { Pencil, Store } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { VendorLogo } from '@/components/vendors/VendorLogo';
import { VendorProfileSheet } from '@/components/vendors/VendorProfileSheet';
import { useVendorProfile } from '@/hooks/useVendorProfile';

// Only for people who have joined an event as a vendor; edits show on every event's vendor list.
export function ProfileVendorSection() {
    const t = useTranslations('Vendors.profile');
    const tTypes = useTranslations('Vendors.types');
    const { data: profile } = useVendorProfile();
    const [editing, setEditing] = useState(false);

    if (!profile) return null;

    return (
        <section className="rounded-[1.5rem] bg-card p-4 shadow-[0_18px_48px_rgba(35,28,22,0.08)] sm:p-5">
            {/* Vendor header */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-primary" aria-hidden="true" />
                    <h2 className="text-base font-semibold text-ink">{t('sectionTitle')}</h2>
                </div>
                <Button type="button" variant="outline" onClick={() => setEditing(true)} className="gap-2 rounded-full px-3">
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    {t('edit')}
                </Button>
            </div>

            {/* Details */}
            <div className="mt-3 flex items-center gap-3">
                <VendorLogo logoUrl={profile.logoUrl} name={profile.businessName} />
                <div className="min-w-0 text-sm">
                    <p className="truncate font-semibold text-ink">{profile.businessName}</p>
                    <p className="text-ink-muted">{tTypes(profile.vendorType)}</p>
                    <p className="truncate text-ink-muted">{profile.link}</p>
                </div>
            </div>

            {editing && <VendorProfileSheet open profile={profile} defaultType={profile.vendorType} onCloseAction={() => setEditing(false)} />}
        </section>
    );
}
```
`editing` is plain open/close wiring, so it stays in the component.

`ProfileContent.tsx`, after the business details section:
```tsx
                {/* Vendor details */}
                <ProfileVendorSection />
```
with the import.

- [ ] **Step 7: Run the tests**

Run: `npx vitest run hooks/useVendorProfilePrompt.test.tsx components/vendors components/profile "app/(main)/(app)/(event)/events/[eventId]/feed" && npm run type:check`
Expected: PASS. A feed or profile test that renders the whole page and fails on a missing QueryClient needs `vi.mock('@/components/vendors/VendorProfilePrompt', () => ({ VendorProfilePrompt: () => null }))` or the same for `ProfileVendorSection`.

- [ ] **Step 8: Commit**

```bash
git add hooks/useVendorProfilePrompt.ts hooks/useVendorProfilePrompt.test.tsx components/vendors components/profile "app/(main)/(app)/(event)/events/[eventId]/feed"
git commit -m "feat(vendors): vendor profile sheet on first join and on the profile page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Become a partner

A card on the vendor page (Task 16) while `showPartnerPrompt` is true. "Apply" opens a sheet with the partner form, filled in from the vendor profile and the account. "Don't show again" stores the dismissal.

**Files:**
- Modify: `hooks/useForBusinessApplication.ts`, `components/forBusiness/ForBusinessApplyForm.tsx`
- Create: `hooks/useBecomePartner.ts`, `components/vendors/BecomePartnerSheet.tsx`, `components/vendors/me/PartnerPromptCard.tsx`
- Test: `hooks/useForBusinessApplication.test.tsx` (extend or create), `hooks/useBecomePartner.test.tsx`, `components/vendors/me/PartnerPromptCard.test.tsx`

- [ ] **Step 1: Read the apply form**

Open `components/forBusiness/ForBusinessApplyForm.tsx` and note how it calls `useForBusinessApplication()` and which inputs it renders (`name`, `businessName`, `role`, `email`, `link`, `countryCode`, `phone`, the `website` honeypot, `consent`). The sheet reuses this form, so it needs two optional props: `defaults` (starting values) and `search` (the attribution).

- [ ] **Step 2: Write the failing tests**

Add to `hooks/useForBusinessApplication.test.tsx` (create it with these mocks if it does not exist):
```tsx
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useForBusinessApplication } from '@/hooks/useForBusinessApplication';

const publicPost = vi.fn();
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { publicPost: (...a: unknown[]) => publicPost(...a) },
}));
vi.mock('next-intl', () => ({ useLocale: () => 'el' }));

function submitEventWith(fields: Record<string, string>) {
    const form = document.createElement('form');
    for (const [name, value] of Object.entries(fields)) {
        const input = document.createElement('input');
        input.name = name;
        input.value = value;
        form.appendChild(input);
    }
    return { preventDefault: vi.fn(), currentTarget: form } as unknown as React.SubmitEvent<HTMLFormElement>;
}

const FIELDS = { name: 'Nik', businessName: 'DJ Nik', role: 'MUSIC', email: 'nik@example.com', link: '@djnik', countryCode: 'GR', consent: 'on' };

beforeEach(() => {
    publicPost.mockReset();
    publicPost.mockResolvedValue({});
});

describe('useForBusinessApplication search', () => {
    it('sends the given attribution instead of the address bar', async () => {
        window.history.replaceState(null, '', '/el/for-business?utm_source=google');
        const { result } = renderHook(() => useForBusinessApplication({ search: '?utm_source=storywall-vendor&utm_medium=MUSIC' }));
        await act(() => result.current.handleSubmit(submitEventWith(FIELDS)));
        expect(publicPost).toHaveBeenCalledWith('/api/public/partner-applications', expect.objectContaining({ utmSource: 'storywall-vendor', utmMedium: 'MUSIC' }));
    });

    it('still reads the address bar by default', async () => {
        window.history.replaceState(null, '', '/el/for-business?utm_source=google');
        const { result } = renderHook(() => useForBusinessApplication());
        await act(() => result.current.handleSubmit(submitEventWith(FIELDS)));
        expect(publicPost).toHaveBeenCalledWith('/api/public/partner-applications', expect.objectContaining({ utmSource: 'google' }));
    });

    it('names an existing application (409) and the rate limit (429) from the vendor sheet', async () => {
        const { result } = renderHook(() => useForBusinessApplication({ search: '?utm_source=storywall-vendor&utm_medium=MUSIC' }));
        publicPost.mockRejectedValueOnce(new ApiError(409, null));
        await act(() => result.current.handleSubmit(submitEventWith(FIELDS)));
        expect(result.current.error).toBe('exists');
        publicPost.mockRejectedValueOnce(new ApiError(429, null));
        await act(() => result.current.handleSubmit(submitEventWith(FIELDS)));
        expect(result.current.error).toBe('rateLimited');
        expect(result.current.isSent).toBe(false);
    });
});
```
with `import { ApiError } from '@/lib/api/client';` (the client mock keeps the real module, so `ApiError` is the real class).
Match the request field names to `applicationRequestFromFormData` (`utmSource`/`utmMedium`), and the endpoint to `endpoints.partnerProgram.applications`.

`hooks/useBecomePartner.test.tsx`:
```tsx
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBecomePartner } from '@/hooks/useBecomePartner';

const dismiss = vi.fn();
vi.mock('@/hooks/useVendorProfile', () => ({
    useVendorProfile: () => ({ data: { businessName: 'DJ Nik', vendorType: 'MUSIC', link: '@djnik', logoUrl: null, partnerPromptDismissed: false } }),
    useDismissPartnerPrompt: () => ({ mutateAsync: dismiss, isPending: false }),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { email: 'nik@example.com', firstName: 'Nik', lastName: 'Papas' } }) }));

beforeEach(() => dismiss.mockReset());

describe('useBecomePartner', () => {
    it('fills the form from the profile and the account', () => {
        const { result } = renderHook(() => useBecomePartner());
        expect(result.current.defaults).toEqual({ name: 'Nik Papas', businessName: 'DJ Nik', role: 'MUSIC', email: 'nik@example.com', link: '@djnik' });
        expect(result.current.search).toBe('?utm_source=storywall-vendor&utm_medium=MUSIC');
    });

    it('opens and closes the sheet', () => {
        const { result } = renderHook(() => useBecomePartner());
        act(() => result.current.openSheet());
        expect(result.current.sheetOpen).toBe(true);
        act(() => result.current.closeSheet());
        expect(result.current.sheetOpen).toBe(false);
    });

    it('stores the dismissal and survives a failure', async () => {
        dismiss.mockRejectedValueOnce(new Error('500'));
        const { result } = renderHook(() => useBecomePartner());
        await act(() => result.current.dismiss());
        expect(dismiss).toHaveBeenCalledTimes(1);
    });
});
```

`components/vendors/me/PartnerPromptCard.test.tsx`:
```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PartnerPromptCard } from '@/components/vendors/me/PartnerPromptCard';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/components/vendors/BecomePartnerSheet', () => ({ BecomePartnerSheet: ({ open }: { open: boolean }) => (open ? <p>sheet</p> : null) }));
const partner = vi.hoisted(() => ({
    value: { defaults: {}, search: '?x', sheetOpen: false, openSheet: vi.fn(), closeSheet: vi.fn(), dismiss: vi.fn(), isDismissing: false },
}));
vi.mock('@/hooks/useBecomePartner', () => ({ useBecomePartner: () => partner.value }));

afterEach(cleanup);

describe('PartnerPromptCard', () => {
    it('applies and dismisses', () => {
        render(<PartnerPromptCard />);
        fireEvent.click(screen.getByRole('button', { name: 'partner.promptApply' }));
        expect(partner.value.openSheet).toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'partner.promptDismiss' }));
        expect(partner.value.dismiss).toHaveBeenCalled();
    });
});
```

- [ ] **Step 3: Run them to make sure they fail**

Run: `npx vitest run hooks/useForBusinessApplication.test.tsx hooks/useBecomePartner.test.tsx components/vendors/me/PartnerPromptCard.test.tsx`
Expected: FAIL.

- [ ] **Step 4: Let the apply hook take a search**

`hooks/useForBusinessApplication.ts`:
```ts
// The partner apply form. UTM params are read at submit time from the address
// bar, so the page needs no useSearchParams (and no client-render bailout).
// The vendor "Become a partner" sheet passes its own `search` instead.
export function useForBusinessApplication({ search }: { search?: string } = {}) {
```
and in `handleSubmit`:
```ts
                const body = applicationRequestFromFormData(new FormData(event.currentTarget), { locale, search: search ?? window.location.search });
```
with `search` added to the `useCallback` dependencies.

- [ ] **Step 5: Let the form take defaults and a search**

`components/forBusiness/ForBusinessApplyForm.tsx`:
```tsx
export type ApplyFormDefaults = Partial<Record<'name' | 'businessName' | 'role' | 'email' | 'link', string>>;

export function ForBusinessApplyForm({ defaults, search }: { defaults?: ApplyFormDefaults; search?: string } = {}) {
    const application = useForBusinessApplication({ search });
```
On the five matching inputs (the role one is a `<select>`), add `defaultValue={defaults?.<field>}`. With no props the landing page renders exactly as before. If the component already takes props, add these two to them.

- [ ] **Step 6: Write the hook, the sheet and the card**

`hooks/useBecomePartner.ts`:
```ts
'use client';

import { useCallback, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useDismissPartnerPrompt, useVendorProfile } from '@/hooks/useVendorProfile';
import { vendorApplySearch } from '@/lib/vendors';

// The vendor page's partner prompt: the sheet's starting values, its attribution and the dismissal.
export function useBecomePartner() {
    const { user } = useAuth();
    const { data: profile } = useVendorProfile();
    const dismissPrompt = useDismissPartnerPrompt();
    const [sheetOpen, setSheetOpen] = useState(false);
    const vendorType = profile?.vendorType ?? 'OTHER';

    const defaults = {
        name: [user?.firstName, user?.lastName].filter(Boolean).join(' '),
        businessName: profile?.businessName ?? '',
        role: vendorType,
        email: user?.email ?? '',
        link: profile?.link ?? '',
    };

    const openSheet = useCallback(() => setSheetOpen(true), []);
    const closeSheet = useCallback(() => setSheetOpen(false), []);
    const dismiss = useCallback(async () => {
        try {
            await dismissPrompt.mutateAsync();
        } catch {
            // The card stays; the next tap tries again.
        }
    }, [dismissPrompt]);

    return { defaults, search: vendorApplySearch(vendorType), sheetOpen, openSheet, closeSheet, dismiss, isDismissing: dismissPrompt.isPending };
}
```

`components/vendors/BecomePartnerSheet.tsx`:
```tsx
'use client';

import { useTranslations } from 'next-intl';

import { type ApplyFormDefaults, ForBusinessApplyForm } from '@/components/forBusiness/ForBusinessApplyForm';
import { Modal } from '@/components/ui/modal';

export function BecomePartnerSheet({
    open,
    defaults,
    search,
    onCloseAction,
}: {
    open: boolean;
    defaults: ApplyFormDefaults;
    search: string;
    onCloseAction: () => void;
}) {
    const t = useTranslations('Vendors.partner');

    return (
        <Modal open={open} onClose={onCloseAction} variant="sheet" size="md" ariaLabel={t('sheetTitle')}>
            <Modal.Body>
                {/* Header */}
                <h2 className="mb-4 text-lg font-bold text-ink">{t('sheetTitle')}</h2>

                {/* Form */}
                <ForBusinessApplyForm defaults={defaults} search={search} />
            </Modal.Body>
        </Modal>
    );
}
```
The apply form already shows its sent state, the "already applied" line for a 409 (through `toApplicationError`) and the rate-limit line. If its sent state points to something only the landing page has (an anchor, a section), stop and ask the user before changing that copy.

`components/vendors/me/PartnerPromptCard.tsx`:
```tsx
'use client';

import { Handshake } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { BecomePartnerSheet } from '@/components/vendors/BecomePartnerSheet';
import { useBecomePartner } from '@/hooks/useBecomePartner';

// The card disappears on its own after a dismissal: useDismissPartnerPrompt refreshes vendors/me.
export function PartnerPromptCard() {
    const t = useTranslations('Vendors');
    const partner = useBecomePartner();

    return (
        <section className="rounded-2xl bg-surface-muted p-4">
            {/* Prompt */}
            <div className="flex items-start gap-3">
                <Handshake className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                    <h2 className="text-sm font-semibold text-ink">{t('partner.promptTitle')}</h2>
                    <p className="mt-1 text-sm text-ink-muted">{t('partner.promptBody')}</p>
                </div>
            </div>

            {/* Actions */}
            <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="lg" onClick={partner.openSheet}>
                    {t('partner.promptApply')}
                </Button>
                <Button type="button" variant="ghost" size="lg" onClick={partner.dismiss} disabled={partner.isDismissing}>
                    {t('partner.promptDismiss')}
                </Button>
            </div>

            <BecomePartnerSheet open={partner.sheetOpen} defaults={partner.defaults} search={partner.search} onCloseAction={partner.closeSheet} />
        </section>
    );
}
```

- [ ] **Step 7: Run the tests, including the landing page's**

Run: `npx vitest run hooks/useForBusinessApplication.test.tsx hooks/useBecomePartner.test.tsx components/vendors components/forBusiness lib/forBusinessApplication.test.ts && npm run type:check`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add hooks/useForBusinessApplication.ts hooks/useForBusinessApplication.test.tsx hooks/useBecomePartner.ts hooks/useBecomePartner.test.tsx components/forBusiness components/vendors
git commit -m "feat(vendors): become a partner prompt and sheet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Pro storage meter on the host panel

**Files:**
- Modify: `lib/vendors.ts`, `lib/vendors.test.ts`, `components/layout/right-context-panel/HostContextSections.tsx`
- Create: `components/vendors/ProStorageMeter.tsx`, `components/vendors/ProStorageMeter.test.tsx`, `components/layout/right-context-panel/HostContextSections.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `lib/vendors.test.ts`:
```ts
import { hasProAllowance } from '@/lib/vendors';

describe('hasProAllowance', () => {
    it('is true only when the usage carries a Pro allowance', () => {
        expect(hasProAllowance({ proStorageBytes: 5 } as never)).toBe(true);
        expect(hasProAllowance({ proStorageBytes: 0 } as never)).toBe(false);
        expect(hasProAllowance({} as never)).toBe(false);
        expect(hasProAllowance(null)).toBe(false);
    });
});
```

`components/vendors/ProStorageMeter.test.tsx`:
```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProStorageMeter } from '@/components/vendors/ProStorageMeter';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key) }));
vi.mock('@/lib/format', () => ({ formatBytes: (bytes: number) => `${bytes}B` }));

afterEach(cleanup);

describe('ProStorageMeter', () => {
    it('shows used / total below the allowance, with no overflow line', () => {
        render(<ProStorageMeter usedBytes={20} allowanceBytes={100} />);
        expect(screen.getByText('value:{"used":"20B","total":"100B"}')).toBeTruthy();
        expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('20');
        expect(screen.queryByText(/^over:/)).toBeNull();
    });

    it('is full with no overflow line at the allowance', () => {
        render(<ProStorageMeter usedBytes={100} allowanceBytes={100} />);
        expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('100');
        expect(screen.queryByText(/^over:/)).toBeNull();
    });

    it('names the overflow that counts as event storage', () => {
        render(<ProStorageMeter usedBytes={130} allowanceBytes={100} />);
        expect(screen.getByText('over:{"over":"30B"}')).toBeTruthy();
    });
});
```

`components/layout/right-context-panel/HostContextSections.test.tsx`:
```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HostContextSections } from '@/components/layout/right-context-panel/HostContextSections';
import type { UseRightContextPanelResult } from '@/hooks/useRightContextPanel';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/components/layout/right-context-panel/MediaSummarySection', () => ({ MediaSummarySection: () => null }));
vi.mock('@/components/layout/right-context-panel/QrLinksSection', () => ({ QrLinksSection: () => null }));
vi.mock('@/components/layout/right-context-panel/RsvpSummarySection', () => ({ RsvpSummarySection: () => null }));
vi.mock('@/components/layout/right-context-panel/WishbookSummarySection', () => ({ WishbookSummarySection: () => null }));
vi.mock('@/components/plan/UsagePanel', () => ({ UsagePanel: () => <p>usage</p> }));
vi.mock('@/components/vendors/ProStorageMeter', () => ({ ProStorageMeter: ({ usedBytes }: { usedBytes: number }) => <p>pro {usedBytes}</p> }));

function panel(usage: Record<string, unknown>) {
    return {
        activeEvent: { id: 'e1' },
        eventUsage: { planTier: 'PLUS', storageBytes: 0, storageLimitBytes: null, storagePercent: 0, memberCount: 0, memberLimit: null, memberPercent: 0, ...usage },
        currentPlan: undefined,
        nextUpgradeOption: undefined,
        includedModuleKeys: [],
        actionItems: [],
        showRsvpSummary: false,
        showMediaSummary: false,
        showGalleryQr: false,
        showInvitationsQr: false,
        showWishbookSummary: false,
    } as unknown as UseRightContextPanelResult;
}

afterEach(cleanup);

describe('HostContextSections Pro meter', () => {
    it('shows the Pro meter next to event storage when the plan has a Pro allowance', () => {
        render(<HostContextSections panel={panel({ proStorageBytes: 100, proUsedBytes: 40 })} />);
        expect(screen.getByText('usage')).toBeTruthy();
        expect(screen.getByText('pro 40')).toBeTruthy();
    });

    it('shows no Pro meter without one', () => {
        render(<HostContextSections panel={panel({ proStorageBytes: 0, proUsedBytes: 0 })} />);
        expect(screen.queryByText(/^pro /)).toBeNull();
    });
});
```
If the panel renders `actionItems` through a component that needs more fields, add them to `panel()`; keep the two cases.

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run lib/vendors.test.ts components/vendors/ProStorageMeter.test.tsx components/layout/right-context-panel/HostContextSections.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Add `hasProAllowance`**

`lib/vendors.ts` (add `EventUsageResponseDto` to the type import):
```ts
// The vendors module gives this plan a Pro album allowance (0 or absent without the module).
export function hasProAllowance(usage: Pick<EventUsageResponseDto, 'proStorageBytes'> | null | undefined): boolean {
    return (usage?.proStorageBytes ?? 0) > 0;
}
```

- [ ] **Step 4: Write the meter**

`components/vendors/ProStorageMeter.tsx`:
```tsx
'use client';

import { useTranslations } from 'next-intl';

import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/utils';
import { proStorageState } from '@/lib/vendors';

// The Pro album allowance. Going over is normal (the rest counts as event storage), so the bar never turns red.
export function ProStorageMeter({ usedBytes, allowanceBytes, className }: { usedBytes: number; allowanceBytes: number; className?: string }) {
    const t = useTranslations('Vendors.meter');
    const { state, percent, overflowBytes } = proStorageState(usedBytes, allowanceBytes);

    return (
        <div className={cn('flex flex-col gap-1.5', className)}>
            {/* Figures */}
            <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-semibold text-ink">{t('label')}</span>
                <span className="text-ink-muted">{t('value', { used: formatBytes(usedBytes), total: formatBytes(allowanceBytes) })}</span>
            </div>

            {/* Bar */}
            <div
                role="meter"
                aria-label={t('label')}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                className="h-1.5 overflow-hidden rounded-full bg-surface-muted"
            >
                <div className="h-full rounded-full bg-ink" style={{ width: `${percent}%` }} />
            </div>

            {state === 'over' && <p className="text-xs text-ink-muted">{t('over', { over: formatBytes(overflowBytes) })}</p>}
        </div>
    );
}
```

- [ ] **Step 5: Show it on the host panel**

`HostContextSections.tsx`, directly after the `UsagePanel` block (inside `{/* Plan usage */}`):
```tsx
            {/* Pro storage */}
            {eventUsage && hasProAllowance(eventUsage) && (
                <ProStorageMeter usedBytes={eventUsage.proUsedBytes ?? 0} allowanceBytes={eventUsage.proStorageBytes ?? 0} className="px-1" />
            )}
```
with the imports for `ProStorageMeter` and `hasProAllowance`. The event storage row in `UsagePanel` already shows the event pool (guest bytes plus the Pro overflow), so the two figures never repeat each other.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run lib/vendors.test.ts components/vendors components/layout && npm run type:check`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/vendors.ts lib/vendors.test.ts components/vendors/ProStorageMeter.tsx components/vendors/ProStorageMeter.test.tsx components/layout/right-context-panel
git commit -m "feat(vendors): Pro storage meter on the host panel

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Pro album in the gallery

The gallery gets "Guests" and "Pro" tabs when the event has Pro items. The tab lives in `?album=pro`, changed with a plain history write. The Pro tab has no upload, selection or archive actions: vendors upload from their vendor page, and picks and full downloads are phase 2 (spec, "Pro album"). The viewer shows the vendor credit.

**Files:**
- Modify: `hooks/useMedia.ts`, `hooks/useGalleryScreen.ts`, `components/gallery/GalleryScreen.tsx`, `components/gallery/GalleryViewer.tsx`, `EVENT/tools/gallery/(root)/page.tsx`
- Create: `hooks/useGalleryAlbum.ts`, `components/vendors/ProCreditLine.tsx`
- Test: `hooks/useMedia.test.tsx` (create), `hooks/useGalleryAlbum.test.tsx`, `hooks/useGalleryScreen.test.tsx` (extend), `components/vendors/ProCreditLine.test.tsx`, `EVENT/tools/gallery/(root)/page.test.tsx` (extend or create)

- [ ] **Step 1: Write the failing tests**

`hooks/useMedia.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mediaKeys, useEventMedia } from '@/hooks/useMedia';

const apiGet = vi.fn();
vi.mock('@/lib/api/client', () => ({ api: { get: (...a: unknown[]) => apiGet(...a) } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
const readable = vi.hoisted(() => ({ keys: new Set(['gallery', 'vendors']) }));
vi.mock('@/hooks/useModuleReadable', () => ({ useModuleReadable: (_: string, key: string) => readable.keys.has(key) }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: undefined }), usePresignedUrlRefreshMs: () => false }));

const PAGE = { content: [], page: { number: 0, totalPages: 1, totalElements: 0, size: 30 } };

function wrapper({ children }: { children: React.ReactNode }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    apiGet.mockReset();
    apiGet.mockResolvedValue(PAGE);
    readable.keys = new Set(['gallery', 'vendors']);
});

describe('mediaKeys', () => {
    it('keeps the Pro list under the gallery key so every gallery refresh reaches it', () => {
        expect(mediaKeys.proList('e1').slice(0, 3)).toEqual(mediaKeys.list('e1'));
    });
});

describe('useEventMedia', () => {
    it('keeps the guest URL as it was', async () => {
        renderHook(() => useEventMedia('e1'), { wrapper });
        await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/api/events/e1/media?page=0&size=30'));
    });

    it('asks for the Pro collection', async () => {
        renderHook(() => useEventMedia('e1', 'PRO'), { wrapper });
        await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/api/events/e1/media?page=0&size=30&collection=PRO'));
    });

    it('never asks for Pro without the vendors module', () => {
        readable.keys = new Set(['gallery']);
        renderHook(() => useEventMedia('e1', 'PRO'), { wrapper });
        expect(apiGet).not.toHaveBeenCalled();
    });
});
```
Match the `Page` shape to `lib/api/pagination.ts` and the `useAppConfig` mock to what `useMedia.ts` imports.

`hooks/useGalleryAlbum.test.tsx`:
```tsx
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useGalleryAlbum } from '@/hooks/useGalleryAlbum';

const nav = vi.hoisted(() => ({ search: '' }));
vi.mock('next/navigation', () => ({
    usePathname: () => '/events/e1/tools/gallery',
    useSearchParams: () => new URLSearchParams(nav.search),
}));

beforeEach(() => {
    nav.search = '';
    vi.spyOn(window.history, 'replaceState');
});

describe('useGalleryAlbum', () => {
    it('reads the album from ?album=', () => {
        expect(renderHook(() => useGalleryAlbum()).result.current.album).toBe('GUEST');
        nav.search = 'album=pro';
        expect(renderHook(() => useGalleryAlbum()).result.current.album).toBe('PRO');
        nav.search = 'album=nonsense';
        expect(renderHook(() => useGalleryAlbum()).result.current.album).toBe('GUEST');
    });

    it('writes the album with a history replace and keeps other params', () => {
        nav.search = 'media=m1';
        const { result } = renderHook(() => useGalleryAlbum());
        act(() => result.current.setAlbum('PRO'));
        expect(window.history.replaceState).toHaveBeenLastCalledWith(expect.anything(), '', '/events/e1/tools/gallery?media=m1&album=pro');
        nav.search = 'media=m1&album=pro';
        const second = renderHook(() => useGalleryAlbum());
        act(() => second.result.current.setAlbum('GUEST'));
        expect(window.history.replaceState).toHaveBeenLastCalledWith(expect.anything(), '', '/events/e1/tools/gallery?media=m1');
    });
});
```

Extend `hooks/useGalleryScreen.test.tsx`. Change its `useMedia` mock so `useEventMedia` answers per collection:
```tsx
vi.mock('@/hooks/useMedia', () => ({
    useEventMedia: (_eventId: string, collection = 'GUEST') => ({
        data: {
            pages: [
                {
                    content: collection === 'PRO' ? mocks.proMedia : mocks.media,
                    page: { number: 0, totalPages: 1, totalElements: collection === 'PRO' ? mocks.proMedia.length : mocks.media.length, size: 30 },
                },
            ],
        },
        isLoading: false,
        fetchNextPage: vi.fn(),
        hasNextPage: mocks.hasNextPage,
        isFetchingNextPage: false,
    }),
    useOriginalMedia: () => ({}),
    useDeleteMedia: () => ({ mutateAsync: mocks.deleteMedia, isPending: false }),
    useUploadMediaBatch: () => ({}),
}));
vi.mock('@/hooks/useGalleryAlbum', () => ({ useGalleryAlbum: () => ({ album: mocks.album, setAlbum: mocks.setAlbum }) }));
```
add `proMedia: [] as MediaResponseDto[], album: 'GUEST' as 'GUEST' | 'PRO', setAlbum: vi.fn(),` to `mocks`, reset them in `afterEach`, and add:
```tsx
describe('useGalleryScreen Pro album', () => {
    it('has no tabs while the event has no Pro items', () => {
        const { result } = renderHook(() => useGalleryScreen());
        expect(result.current.showAlbumTabs).toBe(false);
        expect(result.current.album).toBe('GUEST');
    });

    it('shows the tabs and the Pro items on the Pro tab, without upload or selection', () => {
        mocks.isHost = true;
        mocks.activeEvent = { status: 'ACTIVE', deletedAt: null };
        mocks.activeMember = { id: 'host' };
        mocks.proMedia = [{ ...photo('https://cdn/pro.jpg'), id: 'pro-1' }];
        mocks.album = 'PRO';
        const { result } = renderHook(() => useGalleryScreen());
        expect(result.current.showAlbumTabs).toBe(true);
        expect(result.current.album).toBe('PRO');
        expect(result.current.media.map((item) => item.id)).toEqual(['pro-1']);
        expect(result.current.showUpload).toBe(false);
        expect(result.current.showArchiveDownload).toBe(false);
    });

    it('falls back to the guest album when ?album=pro has nothing to show', () => {
        mocks.album = 'PRO';
        const { result } = renderHook(() => useGalleryScreen());
        expect(result.current.album).toBe('GUEST');
    });
});
```

`components/vendors/ProCreditLine.test.tsx`:
```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProCreditLine } from '@/components/vendors/ProCreditLine';

vi.mock('next-intl', () => ({
    useTranslations: (ns: string) => (key: string, values?: Record<string, unknown>) => (values ? `${ns}.${key}:${JSON.stringify(values)}` : `${ns}.${key}`),
}));

afterEach(cleanup);

describe('ProCreditLine', () => {
    it('credits the business on a photo and on a video', () => {
        render(<ProCreditLine credit={{ businessName: 'Studio X', vendorType: 'PHOTOGRAPHER' }} mediaType="IMAGE" />);
        expect(screen.getByText('Vendors.credit.photo:{"name":"Studio X"}')).toBeTruthy();
        cleanup();
        render(<ProCreditLine credit={{ businessName: 'Reel Co', vendorType: 'VIDEOGRAPHER' }} mediaType="VIDEO" />);
        expect(screen.getByText('Vendors.credit.video:{"name":"Reel Co"}')).toBeTruthy();
    });

    it('falls back to the type without a business name, and to nothing without a credit', () => {
        render(<ProCreditLine credit={{ businessName: null, vendorType: 'PHOTOGRAPHER' }} mediaType="IMAGE" />);
        expect(screen.getByText('Vendors.credit.photo:{"name":"Vendors.types.PHOTOGRAPHER"}')).toBeTruthy();
        cleanup();
        const { container } = render(<ProCreditLine credit={null} mediaType="IMAGE" />);
        expect(container.textContent).toBe('');
    });
});
```

Gallery prefetch test (`EVENT/tools/gallery/(root)/page.test.tsx`; create it with Task 9's mocking style if it does not exist):
```tsx
describe('gallery prefetch with Pro', () => {
    it('also fetches the Pro first page when the vendors module is on', async () => {
        ctx.context = { accessToken: 'tok', isHost: true };
        ctx.event = { id: 'e1', status: 'ACTIVE', modules: [gallery, vendors] };
        serverGet.mockResolvedValue({ content: [], page: { number: 0, totalPages: 0, totalElements: 0, size: 30 } });
        await Page({ params: Promise.resolve({ eventId: 'e1' }) });
        expect(serverGet).toHaveBeenCalledWith('/api/events/e1/media?page=0&size=30', 'tok');
        expect(serverGet).toHaveBeenCalledWith('/api/events/e1/media?page=0&size=30&collection=PRO', 'tok');
    });

    it('fetches only the guest page without the vendors module', async () => {
        ctx.context = { accessToken: 'tok', isHost: true };
        ctx.event = { id: 'e1', status: 'ACTIVE', modules: [gallery] };
        serverGet.mockResolvedValue({ content: [], page: { number: 0, totalPages: 0, totalElements: 0, size: 30 } });
        await Page({ params: Promise.resolve({ eventId: 'e1' }) });
        expect(serverGet).toHaveBeenCalledTimes(1);
    });
});
```
with `const gallery = { moduleKey: 'gallery', isEnabled: true, isAvailable: true, configuration: {} }` and `const vendors = { …same, moduleKey: 'vendors' }`.

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run hooks/useMedia.test.tsx hooks/useGalleryAlbum.test.tsx hooks/useGalleryScreen.test.tsx components/vendors/ProCreditLine.test.tsx "app/(main)/(app)/(event)/events/[eventId]/tools/gallery"`
Expected: FAIL.

- [ ] **Step 3: Teach `useEventMedia` the collection**

`hooks/useMedia.ts`:
```ts
export const mediaKeys = {
    list: (eventId: string) => ['events', eventId, 'media'] as const,
    // Under list(), so every gallery invalidation (uploads, deletes) refreshes the Pro album too.
    proList: (eventId: string) => ['events', eventId, 'media', 'PRO'] as const,
    detail: (id: string) => ['medias', id] as const,
};

export const MEDIA_PAGE_SIZE = 30;

export function mediaListKey(eventId: string, collection: MediaCollection) {
    return collection === 'PRO' ? mediaKeys.proList(eventId) : mediaKeys.list(eventId);
}

// The guest URL stays exactly as before the Pro album, so its cache and prefetch are unchanged.
export function mediaListPath(eventId: string, collection: MediaCollection, page: number): string {
    const path = `${endpoints.events.media(eventId)}?page=${page}&size=${MEDIA_PAGE_SIZE}`;
    return collection === 'PRO' ? `${path}&collection=PRO` : path;
}

// GET /api/events/{eventId}/media — any event member. Paginated, newest first.
// Refetched once per signing window so the presigned URLs it holds never expire.
// The Pro album (vendors spec 2026-10-19) is asked for only while the vendors module is on.
export function useEventMedia(eventId: string | null, collection: MediaCollection = 'GUEST') {
    const { isAuthenticated } = useAuth();
    const galleryReadable = useModuleReadable(eventId, 'gallery');
    const vendorsReadable = useModuleReadable(eventId, 'vendors');
    const refetchInterval = usePresignedUrlRefreshMs();
    const collectionReadable = collection === 'GUEST' || vendorsReadable;

    return useInfiniteQuery({
        queryKey: mediaListKey(eventId ?? '', collection),
        queryFn: ({ pageParam }) => api.get<Page<MediaResponseDto>>(mediaListPath(eventId!, collection, pageParam)),
        initialPageParam: 0,
        getNextPageParam: (lastPage) => (lastPage.page.number + 1 < lastPage.page.totalPages ? lastPage.page.number + 1 : undefined),
        enabled: Boolean(eventId) && isAuthenticated && galleryReadable && collectionReadable,
        staleTime: LIVE_CONTENT_STALE_TIME,
        refetchInterval,
    });
}
```
Add `MediaCollection` to the type import. Uploads take `context: 'PRO'` already (Task 2 widened `MediaUploadContext`) and invalidate `mediaKeys.list`, which reaches the Pro key.

If the backend made the Pro album readable without the gallery module (check the backend's `MediaController` list gate), drop `galleryReadable` from the Pro case only. Otherwise leave it: a Pro album needs the gallery.

- [ ] **Step 4: Write `hooks/useGalleryAlbum.ts`**

```ts
'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import type { MediaCollection } from '@/lib/api/types';

// The gallery tab lives in ?album=pro. Written with a plain history replace (like
// useRsvpSubTab) so a tab click never re-runs the server page.
export function useGalleryAlbum() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const album: MediaCollection = searchParams.get('album') === 'pro' ? 'PRO' : 'GUEST';

    const setAlbum = useCallback(
        (next: MediaCollection) => {
            const params = new URLSearchParams(searchParams.toString());
            if (next === 'PRO') params.set('album', 'pro');
            else params.delete('album');
            const query = params.toString();
            window.history.replaceState(window.history.state, '', query ? `${pathname}?${query}` : pathname);
        },
        [pathname, searchParams],
    );

    return { album, setAlbum };
}
```
If the open-media viewer keeps its own state in `history.state` (see `useOverlayHistory`), use `replacePageUrl` from `lib/overlayHistory.ts` instead of the raw call so its markers are handled the same way; the test asserts only the URL.

- [ ] **Step 5: Use the album in `useGalleryScreen`**

In `hooks/useGalleryScreen.ts`, replace the single `useEventMedia(eventId)` line with:
```ts
    const { album: requestedAlbum, setAlbum } = useGalleryAlbum();
    const guestMedia = useEventMedia(eventId);
    const proMedia = useEventMedia(eventId, 'PRO');
    // The tabs appear only once the event has Pro items; ?album=pro on an event without any shows the guest album.
    const showAlbumTabs = (proMedia.data?.pages[0]?.page.totalElements ?? 0) > 0;
    const album = showAlbumTabs ? requestedAlbum : 'GUEST';
    const activeMedia = album === 'PRO' ? proMedia : guestMedia;
    const { data: mediaPages, isLoading: isLoadingMedia, fetchNextPage, hasNextPage, isFetchingNextPage } = activeMedia;
```
Change:
```ts
    const showUpload = isHost && !isDeleted && album === 'GUEST';
```
Add `&& album === 'GUEST'` to `showArchiveDownload` and `showMemberArchive` too, so selection and archives stay on the guest album.

Add a handler that also leaves selection mode and closes an open item when the tab changes:
```ts
    const selectAlbum = useCallback(
        (next: MediaCollection) => {
            if (next === album) return;
            gallerySelection.exitSelectionMode();
            setSelectedMediaId(null);
            setAlbum(next);
        },
        [album, gallerySelection, setAlbum],
    );
```
`useGallerySelection` already returns `exitSelectionMode` (the selection download uses it). The hook test runs the real `useGallerySelection`, so no mock is needed.

Return `album`, `showAlbumTabs` and `selectAlbum` from the hook. Import `useGalleryAlbum` and the `MediaCollection` type.

- [ ] **Step 6: Write the credit line and show it in the viewer**

`components/vendors/ProCreditLine.tsx`:
```tsx
'use client';

import { useTranslations } from 'next-intl';

import type { MediaTypeConvention, ProCreditDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

// "Photo: Studio X" on a Pro item.
export function ProCreditLine({ credit, mediaType, className }: { credit: ProCreditDto | null | undefined; mediaType: MediaTypeConvention; className?: string }) {
    const t = useTranslations('Vendors.credit');
    const tTypes = useTranslations('Vendors.types');
    if (!credit) return null;

    const name = credit.businessName ?? tTypes(credit.vendorType);
    return <p className={cn('text-sm', className)}>{mediaType === 'VIDEO' ? t('video', { name }) : t('photo', { name })}</p>;
}
```

`GalleryViewer.tsx`, directly before `{/* Viewer actions */}`:
```tsx
                {/* Credit */}
                <ProCreditLine credit={media.proCredit} mediaType={media.mediaType} className="text-white/85" />
```
with the import.

- [ ] **Step 7: Add the tabs to `GalleryScreen`**

Read `album`, `showAlbumTabs` and `selectAlbum` from `useGalleryScreen()`, and directly above `{/* Gallery */}`:
```tsx
            {/* Album tabs */}
            {showAlbumTabs && (
                <SubTabs
                    tabs={[
                        { key: 'GUEST', label: tVendors('gallery.guests') },
                        { key: 'PRO', label: tVendors('gallery.pro') },
                    ]}
                    active={album}
                    onSelectAction={selectAlbum}
                />
            )}
```
with `const tVendors = useTranslations('Vendors');` and the `SubTabs` import. Check `SubTabs`' props in `components/ui/SubTabs.tsx` (`icon` may be required; if so pass `Users` and `Camera` from `lucide-react`) and add a bottom margin through its `className` prop or a wrapping `<div className="mb-4">` so the tabs sit apart from the grid.

- [ ] **Step 8: Prefetch the Pro first page**

`EVENT/tools/gallery/(root)/page.tsx`, inside the existing `try`:
```ts
            const withPro = readableModuleKeys(event).has('vendors');
            const [firstPage, proFirstPage] = await Promise.all([
                serverGet<Page<MediaResponseDto>>(mediaListPath(eventId, 'GUEST', 0), context.accessToken),
                withPro ? serverGet<Page<MediaResponseDto>>(mediaListPath(eventId, 'PRO', 0), context.accessToken) : Promise.resolve(null),
            ]);
            queryClient.setQueryData(mediaKeys.list(eventId), { pages: [firstPage], pageParams: [0] });
            if (proFirstPage) queryClient.setQueryData(mediaKeys.proList(eventId), { pages: [proFirstPage], pageParams: [0] });
```
replacing the single fetch, and import `mediaListPath` (drop `MEDIA_PAGE_SIZE` if no longer used). Update the comment above the function: it now also prefetches the Pro album's first page when the vendors module is on.

- [ ] **Step 9: Run the tests and every gallery test**

Run: `npx vitest run hooks/useMedia.test.tsx hooks/useGalleryAlbum.test.tsx hooks/useGalleryScreen.test.tsx components/vendors components/gallery "app/(main)/(app)/(event)/events/[eventId]/tools/gallery" && npm run type:check && npm run lint`
Expected: PASS, clean.

- [ ] **Step 10: Commit**

```bash
git add hooks/useMedia.ts hooks/useMedia.test.tsx hooks/useGalleryAlbum.ts hooks/useGalleryAlbum.test.tsx hooks/useGalleryScreen.ts hooks/useGalleryScreen.test.tsx components/gallery components/vendors/ProCreditLine.tsx components/vendors/ProCreditLine.test.tsx "app/(main)/(app)/(event)/events/[eventId]/tools/gallery"
git commit -m "feat(vendors): Pro album tab in the gallery

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: The vendor page

`/events/[eventId]/tools/vendors/me`: the access line, the vendor's tool links, the Pro album (photographers and videographers), the list switch, their details and the partner prompt.

**Files:**
- Modify: `lib/vendors.ts`, `lib/vendors.test.ts`
- Create: `hooks/useVendorMePage.ts`, `hooks/useProAlbum.ts` and their tests
- Create: `components/vendors/me/VendorMeScreen.tsx`, `VendorToolLinks.tsx`, `ProAlbumSection.tsx`, `VendorListingSection.tsx`, `VendorMeScreen.test.tsx`, `ProAlbumSection.test.tsx`
- Create: `EVENT/tools/vendors/me/page.tsx`, `PageClient.tsx`, `loading.tsx`, `page.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `lib/vendors.test.ts`:
```ts
import { vendorToolLinks } from '@/lib/vendors';

describe('vendorToolLinks', () => {
    it('lists a planner’s four tools in a fixed order', () => {
        expect(vendorToolLinks('e1', me()).map((tool) => tool.key)).toEqual(['schedule', 'announcement', 'rsvpReport', 'qr']);
        expect(vendorToolLinks('e1', me()).find((tool) => tool.key === 'rsvpReport')?.href).toBe('/events/e1/manage/rsvp/reports/FULL_LIST?from=vendor');
    });

    it('gives the DJ the live list and a photographer nothing (their tool is on the page)', () => {
        expect(vendorToolLinks('e1', me({ vendorType: 'MUSIC', capabilities: ['SONG_REQUESTS'] })).map((tool) => tool.key)).toEqual(['liveRequests']);
        expect(vendorToolLinks('e1', me({ vendorType: 'PHOTOGRAPHER', capabilities: ['PRO_ALBUM'] }))).toEqual([]);
    });

    it('lists nothing once access has closed', () => {
        expect(vendorToolLinks('e1', me({ accessOpen: false }))).toEqual([]);
    });
});
```
(`me()` is the builder at the top of the file from Task 3.)

`hooks/useVendorMePage.test.tsx`:
```tsx
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useVendorMePage } from '@/hooks/useVendorMePage';

const patch = vi.fn();
const role = vi.hoisted(() => ({ data: null as Record<string, unknown> | null, isLoading: false }));
vi.mock('@/hooks/useVendors', () => ({
    useMyVendorRole: () => role,
    usePatchVendor: () => ({ mutateAsync: patch, isPending: false }),
}));
vi.mock('@/hooks/useVendorProfile', () => ({ useVendorProfile: () => ({ data: { businessName: 'DJ Nik', vendorType: 'MUSIC', link: '@djnik', logoUrl: null, partnerPromptDismissed: false } }) }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'failed' }));

const DJ = { vendorId: 'v1', vendorType: 'MUSIC', capabilities: ['SONG_REQUESTS'], accessEndsAt: '2027-07-12T00:00:00Z', accessOpen: true, profileComplete: true, showPartnerPrompt: true, proStorageBytes: null, proUsedBytes: null, optedOut: false, hiddenByHost: false };

beforeEach(() => {
    patch.mockReset();
    role.data = DJ;
    role.isLoading = false;
});

describe('useVendorMePage', () => {
    it('exposes the role, the tools and the list state', () => {
        const { result } = renderHook(() => useVendorMePage('e1'));
        expect(result.current.me).toEqual(DJ);
        expect(result.current.tools.map((tool) => tool.key)).toEqual(['liveRequests']);
        expect(result.current.hasProAlbum).toBe(false);
        expect(result.current.canUploadPro).toBe(false);
        expect(result.current.listed).toBe(true);
        expect(result.current.showPartnerPrompt).toBe(true);
    });

    it('opts out and back in', async () => {
        patch.mockResolvedValue({});
        const { result } = renderHook(() => useVendorMePage('e1'));
        await act(() => result.current.toggleListed());
        expect(patch).toHaveBeenCalledWith({ vendorId: 'v1', patch: { optedOut: true } });
        role.data = { ...DJ, optedOut: true };
        const again = renderHook(() => useVendorMePage('e1'));
        await act(() => again.result.current.toggleListed());
        expect(patch).toHaveBeenLastCalledWith({ vendorId: 'v1', patch: { optedOut: false } });
    });

    it('shows the error when the switch fails', async () => {
        patch.mockRejectedValue(new Error('500'));
        const { result } = renderHook(() => useVendorMePage('e1'));
        await act(() => result.current.toggleListed());
        expect(result.current.error).toBe('failed');
    });

    it('has no tools or prompt for someone who is not a vendor', () => {
        role.data = null;
        const { result } = renderHook(() => useVendorMePage('e1'));
        expect(result.current.me).toBeNull();
        expect(result.current.tools).toEqual([]);
        expect(result.current.showPartnerPrompt).toBe(false);
    });
});
```

`hooks/useProAlbum.test.tsx`:
```tsx
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useProAlbum } from '@/hooks/useProAlbum';

const upload = vi.fn();
const del = vi.fn();
const invalidate = vi.fn();
const items = vi.hoisted(() => ({ value: [] as unknown[] }));
vi.mock('@tanstack/react-query', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@tanstack/react-query')>()),
    useQueryClient: () => ({ invalidateQueries: invalidate }),
}));
vi.mock('@/hooks/useMedia', () => ({
    useEventMedia: () => ({ data: { pages: [{ content: items.value }] }, isLoading: false, hasNextPage: false, fetchNextPage: vi.fn(), isFetchingNextPage: false }),
    useUploadMediaBatch: () => ({ mutateAsync: upload, isPending: false }),
    useDeleteMedia: () => ({ mutateAsync: del, isPending: false }),
}));
vi.mock('@/providers/EventProvider', () => ({ useActiveMember: () => ({ id: 'me' }) }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key) }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'failed' }));

beforeEach(() => {
    upload.mockReset();
    del.mockReset();
    invalidate.mockReset();
    items.value = [
        { id: 'mine', uploaderMemberId: 'me' },
        { id: 'theirs', uploaderMemberId: 'other' },
    ];
});

describe('useProAlbum', () => {
    it('lists only the vendor’s own Pro items', () => {
        const { result } = renderHook(() => useProAlbum('e1'));
        expect(result.current.items.map((item) => item.id)).toEqual(['mine']);
    });

    it('uploads the chosen files to the Pro album and refreshes the meter', async () => {
        upload.mockResolvedValue({ created: [{ id: 'new' }], failed: [] });
        const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
        const { result } = renderHook(() => useProAlbum('e1'));
        act(() => result.current.chooseFiles([file]));
        await act(() => result.current.upload());
        expect(upload).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'e1', files: [file], context: 'PRO' }));
        expect(result.current.notice).toBe('me.proUploaded');
        expect(result.current.selectedFiles).toEqual([]);
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['events', 'e1', 'vendors', 'me'] });
    });

    it('names files that did not upload', async () => {
        upload.mockResolvedValue({ created: [], failed: [{ filename: 'a.jpg' }, { filename: 'b.jpg' }] });
        const { result } = renderHook(() => useProAlbum('e1'));
        act(() => result.current.chooseFiles([new File(['x'], 'a.jpg'), new File(['x'], 'b.jpg')]));
        await act(() => result.current.upload());
        expect(result.current.notice).toBe('me.proUploadFailed:{"count":2}');
    });

    it('shows the server error when the upload fails', async () => {
        upload.mockRejectedValue(new Error('413'));
        const { result } = renderHook(() => useProAlbum('e1'));
        act(() => result.current.chooseFiles([new File(['x'], 'a.jpg')]));
        await act(() => result.current.upload());
        expect(result.current.notice).toBe('failed');
    });

    it('deletes an own item after the confirmation', async () => {
        del.mockResolvedValue(undefined);
        const { result } = renderHook(() => useProAlbum('e1'));
        act(() => result.current.requestDelete('mine'));
        expect(result.current.deleteTargetId).toBe('mine');
        await act(() => result.current.confirmDelete());
        expect(del).toHaveBeenCalledWith('mine');
        expect(result.current.deleteTargetId).toBeNull();
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['events', 'e1', 'vendors', 'me'] });
    });
});
```
Match `MediaBatchFailedItemDto`'s fields in `lib/api/types.ts` for the `failed` rows.

`components/vendors/me/VendorMeScreen.test.tsx`:
```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VendorMeScreen } from '@/components/vendors/me/VendorMeScreen';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
    useLocale: () => 'en',
}));
vi.mock('@/lib/datetime', () => ({ formatDate: () => '12 July 2027' }));
vi.mock('@/components/routing/EventRouteGate', () => ({ useEventRouteContext: () => ({ eventId: 'e1', activeEvent: { id: 'e1' }, isHost: false }) }));
vi.mock('@/components/vendors/me/ProAlbumSection', () => ({ ProAlbumSection: () => <p>pro album</p> }));
vi.mock('@/components/vendors/me/PartnerPromptCard', () => ({ PartnerPromptCard: () => <p>partner prompt</p> }));
vi.mock('@/components/vendors/VendorProfileSheet', () => ({ VendorProfileSheet: () => null }));
const page = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock('@/hooks/useVendorMePage', () => ({ useVendorMePage: () => page.value }));

function state(overrides: Record<string, unknown> = {}) {
    return {
        me: { vendorId: 'v1', vendorType: 'PLANNER', accessOpen: true, accessEndsAt: '2027-07-12T00:00:00Z', proStorageBytes: null, proUsedBytes: null },
        isLoading: false,
        profile: { businessName: 'Plans & Co', vendorType: 'PLANNER', link: '@plans', logoUrl: null, partnerPromptDismissed: false },
        tools: [{ key: 'schedule', href: '/events/e1/tools/schedule' }],
        hasProAlbum: false,
        canUploadPro: true,
        listed: true,
        hiddenByHost: false,
        showPartnerPrompt: false,
        toggleListed: vi.fn(),
        isTogglingListed: false,
        error: null,
        profileOpen: false,
        openProfile: vi.fn(),
        closeProfile: vi.fn(),
        ...overrides,
    };
}

beforeEach(() => {
    page.value = state();
});
afterEach(cleanup);

describe('VendorMeScreen', () => {
    it('shows the access date, the tools, the switch and the details', () => {
        render(<VendorMeScreen />);
        expect(screen.getByText('me.accessUntil:{"date":"12 July 2027"}')).toBeTruthy();
        expect(screen.getByRole('link', { name: 'me.tools.schedule' }).getAttribute('href')).toBe('/events/e1/tools/schedule');
        expect(screen.getByRole('switch', { name: /me.listingSwitch/ }).getAttribute('aria-checked')).toBe('true');
        expect(screen.getByText('Plans & Co')).toBeTruthy();
        expect(screen.queryByText('pro album')).toBeNull();
        expect(screen.queryByText('partner prompt')).toBeNull();
    });

    it('shows the Pro album and the partner prompt when they apply', () => {
        page.value = state({ hasProAlbum: true, showPartnerPrompt: true });
        render(<VendorMeScreen />);
        expect(screen.getByText('pro album')).toBeTruthy();
        expect(screen.getByText('partner prompt')).toBeTruthy();
    });

    it('says when the tools have stopped', () => {
        page.value = state({ me: { vendorId: 'v1', vendorType: 'PLANNER', accessOpen: false, accessEndsAt: '2026-01-01T00:00:00Z' }, tools: [] });
        render(<VendorMeScreen />);
        expect(screen.getByText('me.accessEnded')).toBeTruthy();
        expect(screen.queryByText('me.toolsTitle')).toBeNull();
    });

    it('tells the host when the host hid them', () => {
        page.value = state({ hiddenByHost: true });
        render(<VendorMeScreen />);
        expect(screen.getByText('me.listingHiddenByHost')).toBeTruthy();
    });

    it('says plainly when the caller is not a vendor', () => {
        page.value = state({ me: null, profile: null, tools: [] });
        render(<VendorMeScreen />);
        expect(screen.getByText('me.notVendor')).toBeTruthy();
    });
});
```

`components/vendors/me/ProAlbumSection.test.tsx`:
```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProAlbumSection } from '@/components/vendors/me/ProAlbumSection';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key) }));
vi.mock('@/components/vendors/ProStorageMeter', () => ({ ProStorageMeter: () => <p>meter</p> }));
vi.mock('@/components/common/ProtectedImage', () => ({ ProtectedImage: ({ alt }: { alt: string }) => <span>{alt}</span> }));
const album = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock('@/hooks/useProAlbum', () => ({ useProAlbum: () => album.value }));

beforeEach(() => {
    album.value = {
        items: [{ id: 'mine', mediaType: 'IMAGE', thumbnailUrl: 'https://cdn/t.jpg', mediaUrl: 'https://cdn/m.jpg', originalFilename: 'a.jpg', status: 'READY' }],
        isLoading: false,
        hasNextPage: false,
        fetchNextPage: vi.fn(),
        selectedFiles: [],
        notice: null,
        isUploading: false,
        deleteTargetId: null,
        isDeleting: false,
        chooseFiles: vi.fn(),
        upload: vi.fn(),
        requestDelete: vi.fn(),
        cancelDelete: vi.fn(),
        confirmDelete: vi.fn(),
    };
});
afterEach(cleanup);

describe('ProAlbumSection', () => {
    it('shows the meter, the own items and asks before deleting', () => {
        render(<ProAlbumSection eventId="e1" usedBytes={10} allowanceBytes={100} canUpload />);
        expect(screen.getByText('meter')).toBeTruthy();
        expect(screen.getByText('a.jpg')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'me.proDelete' }));
        expect(album.value.requestDelete).toHaveBeenCalledWith('mine');
    });

    it('offers the upload button once files are chosen', () => {
        album.value = { ...album.value, selectedFiles: [new File(['x'], 'a.jpg')] };
        render(<ProAlbumSection eventId="e1" usedBytes={10} allowanceBytes={100} canUpload />);
        fireEvent.click(screen.getByRole('button', { name: 'me.proUpload:{"count":1}' }));
        expect(album.value.upload).toHaveBeenCalled();
    });

    it('hides the upload once access has closed, and shows the empty line', () => {
        album.value = { ...album.value, items: [] };
        render(<ProAlbumSection eventId="e1" usedBytes={0} allowanceBytes={100} canUpload={false} />);
        expect(screen.queryByText('me.proChoose')).toBeNull();
        expect(screen.getByText('me.proEmpty')).toBeTruthy();
    });
});
```

`EVENT/tools/vendors/me/page.test.tsx`: Task 9's page-test mocks, with `serverGetOrNull` mocked next to `serverGet`:
```tsx
const serverGetOrNull = vi.fn();
vi.mock('@/lib/api/serverFetch', () => ({
    serverGet: (...a: unknown[]) => serverGet(...a),
    serverGetOrNull: (...a: unknown[]) => serverGetOrNull(...a),
}));

describe('vendor page prefetch', () => {
    it('fetches the role, the profile and, for a photographer, the Pro first page', async () => {
        ctx.context = { accessToken: 'tok', isHost: false };
        serverGetOrNull.mockImplementation(async (path: string) =>
            path.endsWith('/vendors/me')
                ? { vendorId: 'v1', vendorType: 'PHOTOGRAPHER', capabilities: ['PRO_ALBUM'], accessOpen: true }
                : { businessName: 'Studio X', vendorType: 'PHOTOGRAPHER', link: '@studio.x', logoUrl: null, partnerPromptDismissed: false },
        );
        serverGet.mockResolvedValue({ content: [], page: { number: 0, totalPages: 0, totalElements: 0, size: 30 } });
        await Page({ params: Promise.resolve({ eventId: 'e1' }) });
        expect(serverGetOrNull).toHaveBeenCalledWith('/api/events/e1/vendors/me', 'tok');
        expect(serverGetOrNull).toHaveBeenCalledWith('/api/me/vendor-profile', 'tok');
        expect(serverGet).toHaveBeenCalledWith('/api/events/e1/media?page=0&size=30&collection=PRO', 'tok');
    });

    it('stops after the role for someone who is not a vendor', async () => {
        ctx.context = { accessToken: 'tok', isHost: false };
        serverGetOrNull.mockResolvedValue(null);
        await Page({ params: Promise.resolve({ eventId: 'e1' }) });
        expect(serverGetOrNull).toHaveBeenCalledTimes(1);
        expect(serverGet).not.toHaveBeenCalled();
    });

    it('fetches nothing for a host, without the module, or on an in-app navigation', async () => {
        ctx.context = { accessToken: 'tok', isHost: true };
        await Page({ params: Promise.resolve({ eventId: 'e1' }) });
        ctx.context = { accessToken: 'tok', isHost: false };
        ctx.event = { ...VENDOR_EVENT, modules: [] };
        await Page({ params: Promise.resolve({ eventId: 'e1' }) });
        ctx.event = VENDOR_EVENT;
        ctx.context = null;
        await Page({ params: Promise.resolve({ eventId: 'e1' }) });
        expect(serverGetOrNull).not.toHaveBeenCalled();
    });

    it('still renders when Spring fails', async () => {
        ctx.context = { accessToken: 'tok', isHost: false };
        serverGetOrNull.mockRejectedValue(new Error('down'));
        await expect(Page({ params: Promise.resolve({ eventId: 'e1' }) })).resolves.toBeTruthy();
    });
});
```
`VENDOR_EVENT` here also needs the gallery module (`{ moduleKey: 'gallery', … }`) for the Pro prefetch.

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run lib/vendors.test.ts hooks/useVendorMePage.test.tsx hooks/useProAlbum.test.tsx components/vendors/me "app/(main)/(app)/(event)/events/[eventId]/tools/vendors/me"`
Expected: FAIL.

- [ ] **Step 3: Add `vendorToolLinks`**

`lib/vendors.ts`:
```ts
export type VendorToolKey = 'schedule' | 'announcement' | 'rsvpReport' | 'qr' | 'liveRequests';

// The vendor page's tool links, in this order. The Pro album is on the page itself, so it has no link.
const VENDOR_TOOLS: { key: VendorToolKey; capability: VendorCapability; href: (eventId: string) => string }[] = [
    { key: 'schedule', capability: 'SCHEDULE_EDIT', href: (eventId) => routes.events.tools.schedule(eventId) },
    { key: 'announcement', capability: 'ANNOUNCE', href: (eventId) => routes.events.tools.announcement(eventId) },
    { key: 'rsvpReport', capability: 'RSVP_REPORT', href: (eventId) => routes.events.rsvpReport(eventId, 'FULL_LIST', 'vendor') },
    { key: 'qr', capability: 'QR_READ', href: (eventId) => routes.events.invitationsQr(eventId) },
    { key: 'liveRequests', capability: 'SONG_REQUESTS', href: (eventId) => routes.events.tools.playlistLive(eventId) },
];

export function vendorToolLinks(eventId: string, me: VendorMeDto): { key: VendorToolKey; href: string }[] {
    return VENDOR_TOOLS.filter((tool) => hasVendorCapability(me, tool.capability)).map((tool) => ({ key: tool.key, href: tool.href(eventId) }));
}
```

- [ ] **Step 4: Write the two hooks**

`hooks/useVendorMePage.ts`:
```ts
'use client';

import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useVendorProfile } from '@/hooks/useVendorProfile';
import { useMyVendorRole, usePatchVendor } from '@/hooks/useVendors';
import { hasVendorCapability, vendorToolLinks } from '@/lib/vendors';

// The vendor page: role, tools, the list switch and the details sheet.
export function useVendorMePage(eventId: string) {
    const toErrorMessage = useApiErrorMessage();
    const role = useMyVendorRole(eventId);
    const me = role.data ?? null;
    const profile = useVendorProfile(me !== null);
    const patchVendor = usePatchVendor(eventId);
    const [profileOpen, setProfileOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleListed = useCallback(async () => {
        if (!me) return;
        setError(null);
        try {
            await patchVendor.mutateAsync({ vendorId: me.vendorId, patch: { optedOut: !me.optedOut } });
        } catch (patchError) {
            setError(toErrorMessage(patchError));
        }
    }, [me, patchVendor, toErrorMessage]);

    const openProfile = useCallback(() => setProfileOpen(true), []);
    const closeProfile = useCallback(() => setProfileOpen(false), []);

    return {
        me,
        isLoading: role.isLoading,
        profile: profile.data ?? null,
        tools: me ? vendorToolLinks(eventId, me) : [],
        hasProAlbum: me ? me.capabilities.includes('PRO_ALBUM') : false,
        canUploadPro: hasVendorCapability(me, 'PRO_ALBUM'),
        listed: me ? !me.optedOut : false,
        hiddenByHost: me?.hiddenByHost ?? false,
        showPartnerPrompt: me?.showPartnerPrompt ?? false,
        toggleListed,
        isTogglingListed: patchVendor.isPending,
        error,
        profileOpen,
        openProfile,
        closeProfile,
    };
}
```
`hasProAlbum` keeps the section (and the vendor's past uploads) visible after the access window; `canUploadPro` closes the upload.

`hooks/useProAlbum.ts`:
```ts
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useDeleteMedia, useEventMedia, useUploadMediaBatch } from '@/hooks/useMedia';
import { vendorKeys } from '@/hooks/useVendors';
import { useActiveMember } from '@/providers/EventProvider';

// The vendor's own Pro items: upload, list and delete. Every change refreshes vendors/me for the meter.
export function useProAlbum(eventId: string) {
    const t = useTranslations('Vendors');
    const toErrorMessage = useApiErrorMessage();
    const queryClient = useQueryClient();
    const activeMember = useActiveMember();
    const media = useEventMedia(eventId, 'PRO');
    const uploadBatch = useUploadMediaBatch();
    const deleteMedia = useDeleteMedia(eventId);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [notice, setNotice] = useState<string | null>(null);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    const items = useMemo(
        () => (media.data?.pages.flatMap((page) => page.content) ?? []).filter((item) => item.uploaderMemberId === activeMember?.id),
        [activeMember?.id, media.data?.pages],
    );

    const refreshMeter = useCallback(() => queryClient.invalidateQueries({ queryKey: vendorKeys.me(eventId) }), [eventId, queryClient]);

    const chooseFiles = useCallback((files: File[]) => {
        setNotice(null);
        setSelectedFiles(files);
    }, []);

    const upload = useCallback(async () => {
        if (selectedFiles.length === 0) return;
        setNotice(null);
        try {
            const result = await uploadBatch.mutateAsync({ eventId, files: selectedFiles, context: 'PRO' });
            setNotice(result.failed.length === 0 ? t('me.proUploaded') : t('me.proUploadFailed', { count: result.failed.length }));
            setSelectedFiles([]);
            void refreshMeter();
        } catch (uploadError) {
            setNotice(toErrorMessage(uploadError));
        }
    }, [eventId, refreshMeter, selectedFiles, t, toErrorMessage, uploadBatch]);

    const requestDelete = useCallback((mediaId: string) => setDeleteTargetId(mediaId), []);
    const cancelDelete = useCallback(() => setDeleteTargetId(null), []);
    const confirmDelete = useCallback(async () => {
        if (!deleteTargetId) return;
        try {
            await deleteMedia.mutateAsync(deleteTargetId);
            void refreshMeter();
        } catch (deleteError) {
            setNotice(toErrorMessage(deleteError));
        } finally {
            setDeleteTargetId(null);
        }
    }, [deleteMedia, deleteTargetId, refreshMeter, toErrorMessage]);

    return {
        items,
        isLoading: media.isLoading,
        hasNextPage: media.hasNextPage,
        fetchNextPage: media.fetchNextPage,
        selectedFiles,
        notice,
        isUploading: uploadBatch.isPending,
        deleteTargetId,
        isDeleting: deleteMedia.isPending,
        chooseFiles,
        upload,
        requestDelete,
        cancelDelete,
        confirmDelete,
    };
}
```
Add these keys to the `Vendors.me` copy from Task 6 (en, then el):
```json
"proUploadFailed": "{count, plural, one {# file didn't upload.} other {# files didn't upload.}}",
"proMore": "Show more"
```
```json
"proUploadFailed": "{count, plural, one {# αρχείο δεν ανέβηκε.} other {# αρχεία δεν ανέβηκαν.}}",
"proMore": "Περισσότερα"
```

- [ ] **Step 5: Write the sections**

`components/vendors/me/VendorToolLinks.tsx`:
```tsx
'use client';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AppLink } from '@/components/ui/AppLink';
import type { VendorToolKey } from '@/lib/vendors';

export function VendorToolLinks({ tools }: { tools: { key: VendorToolKey; href: string }[] }) {
    const t = useTranslations('Vendors.me');

    return (
        <section aria-labelledby="vendor-tools-title">
            <h2 id="vendor-tools-title" className="text-sm font-semibold text-ink">
                {t('toolsTitle')}
            </h2>
            <ul className="mt-1 divide-y divide-border">
                {tools.map((tool) => (
                    <li key={tool.key}>
                        <AppLink href={tool.href} className="flex min-h-12 items-center justify-between gap-3 py-3 text-sm font-semibold text-ink focus-ring">
                            {t(`tools.${tool.key}`)}
                            <ChevronRight className="size-4 text-ink-muted" aria-hidden="true" />
                        </AppLink>
                    </li>
                ))}
            </ul>
        </section>
    );
}
```

`components/vendors/me/VendorListingSection.tsx`:
```tsx
'use client';

import { useTranslations } from 'next-intl';

import { CookieSwitchRow } from '@/components/consent/CookieSwitchRow';

// The vendor's own opt-out. CookieSwitchRow is the app's one labelled switch row; it is not cookie-specific.
export function VendorListingSection({
    listed,
    hiddenByHost,
    disabled,
    error,
    onToggleAction,
}: {
    listed: boolean;
    hiddenByHost: boolean;
    disabled: boolean;
    error: string | null;
    onToggleAction: () => void;
}) {
    const t = useTranslations('Vendors.me');

    return (
        <section aria-labelledby="vendor-listing-title">
            <h2 id="vendor-listing-title" className="text-sm font-semibold text-ink">
                {t('listingTitle')}
            </h2>
            <CookieSwitchRow
                label={t('listingSwitch')}
                description={hiddenByHost ? t('listingHiddenByHost') : ''}
                checked={listed}
                disabled={disabled}
                onCheckedChange={onToggleAction}
            />
            {error && (
                <p role="alert" className="text-sm text-rose-600">
                    {error}
                </p>
            )}
        </section>
    );
}
```
The switch's accessible name includes its description, so the test matches it with a regular expression.

`components/vendors/me/ProAlbumSection.tsx`:
```tsx
'use client';

import { ImagePlus, Trash2, Video } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { Button } from '@/components/ui/button';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { ProStorageMeter } from '@/components/vendors/ProStorageMeter';
import { useProAlbum } from '@/hooks/useProAlbum';

export function ProAlbumSection({
    eventId,
    usedBytes,
    allowanceBytes,
    canUpload,
}: {
    eventId: string;
    usedBytes: number;
    allowanceBytes: number;
    canUpload: boolean;
}) {
    const t = useTranslations('Vendors.me');
    const album = useProAlbum(eventId);

    return (
        <section aria-labelledby="vendor-pro-title" className="flex flex-col gap-4">
            <h2 id="vendor-pro-title" className="text-sm font-semibold text-ink">
                {t('proTitle')}
            </h2>

            {/* Meter */}
            <ProStorageMeter usedBytes={usedBytes} allowanceBytes={allowanceBytes} />

            {/* Upload */}
            {canUpload && (
                <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-ink focus-within:ring-2">
                        <ImagePlus className="size-4" aria-hidden="true" />
                        {t('proChoose')}
                        <input
                            type="file"
                            multiple
                            accept="image/*,video/*"
                            className="sr-only"
                            onChange={(event) => album.chooseFiles(Array.from(event.target.files ?? []))}
                        />
                    </label>
                    {album.selectedFiles.length > 0 && (
                        <Button type="button" size="lg" onClick={album.upload} disabled={album.isUploading}>
                            {t('proUpload', { count: album.selectedFiles.length })}
                        </Button>
                    )}
                </div>
            )}
            {album.notice && (
                <p role="status" className="text-sm text-ink-muted">
                    {album.notice}
                </p>
            )}

            {/* Items */}
            {!album.isLoading && album.items.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('proEmpty')}</p>
            ) : (
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {album.items.map((item) => (
                        <li key={item.id} className="relative aspect-square overflow-hidden rounded-xl bg-surface-muted">
                            {item.thumbnailUrl ?? item.mediaUrl ? (
                                <ProtectedImage src={(item.thumbnailUrl ?? item.mediaUrl)!} alt={item.originalFilename} fill sizes="120px" className="object-cover" />
                            ) : (
                                <Video className="absolute inset-0 m-auto size-6 text-ink-muted" aria-hidden="true" />
                            )}
                            <Button
                                type="button"
                                variant="secondary"
                                size="icon-sm"
                                onClick={() => album.requestDelete(item.id)}
                                aria-label={t('proDelete')}
                                className="absolute right-1 top-1"
                            >
                                <Trash2 aria-hidden="true" />
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
            {album.hasNextPage && (
                <Button type="button" variant="outline" size="lg" onClick={() => album.fetchNextPage()}>
                    {t('proMore')}
                </Button>
            )}

            {/* Delete confirmation */}
            <ConfirmActionModal
                open={album.deleteTargetId !== null}
                title={t('proDeleteTitle')}
                body={t('proDeleteBody')}
                confirmLabel={t('proDeleteConfirm')}
                cancelLabel={t('proDeleteCancel')}
                onCloseAction={album.cancelDelete}
                onConfirmAction={album.confirmDelete}
                isConfirming={album.isDeleting}
            />
        </section>
    );
}
```
The page lists the vendor's own items from the event's Pro pages; "Show more" loads the next page of the event's Pro album, so a page can add no own items when other vendors uploaded in between. That is acceptable for an album capped by a few GB; say so in the PR description.

- [ ] **Step 6: Write the screen**

`components/vendors/me/VendorMeScreen.tsx`:
```tsx
'use client';

import { BriefcaseBusiness, Pencil } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { Button } from '@/components/ui/button';
import { PartnerPromptCard } from '@/components/vendors/me/PartnerPromptCard';
import { ProAlbumSection } from '@/components/vendors/me/ProAlbumSection';
import { VendorListingSection } from '@/components/vendors/me/VendorListingSection';
import { VendorToolLinks } from '@/components/vendors/me/VendorToolLinks';
import { VendorLogo } from '@/components/vendors/VendorLogo';
import { VendorProfileSheet } from '@/components/vendors/VendorProfileSheet';
import { VendorRowsSkeleton } from '@/components/vendors/VendorsSkeletons';
import { useVendorMePage } from '@/hooks/useVendorMePage';
import { formatDate } from '@/lib/datetime';
import { routes } from '@/lib/routes';

export function VendorMeScreen() {
    const t = useTranslations('Vendors');
    const locale = useLocale();
    const { eventId } = useEventRouteContext();
    const page = useVendorMePage(eventId);
    const { me, profile } = page;

    return (
        <ModulePageShell maxWidth="2xl" title={t('me.title')} icon={BriefcaseBusiness} backLabel={t('me.back')} backHref={routes.events.feed(eventId)}>
            {page.isLoading ? (
                <VendorRowsSkeleton />
            ) : !me ? (
                <p className="text-sm text-ink-muted">{t('me.notVendor')}</p>
            ) : (
                <div className="flex flex-col gap-8">
                    {/* Access */}
                    <p className="text-sm text-ink-muted">
                        {me.accessOpen
                            ? me.accessEndsAt && t('me.accessUntil', { date: formatDate(locale, me.accessEndsAt, { dateStyle: 'long' }) })
                            : t('me.accessEnded')}
                    </p>

                    {/* Tools */}
                    {page.tools.length > 0 && <VendorToolLinks tools={page.tools} />}

                    {/* Pro album */}
                    {page.hasProAlbum && (
                        <ProAlbumSection
                            eventId={eventId}
                            usedBytes={me.proUsedBytes ?? 0}
                            allowanceBytes={me.proStorageBytes ?? 0}
                            canUpload={page.canUploadPro}
                        />
                    )}

                    {/* Listing */}
                    <VendorListingSection
                        listed={page.listed}
                        hiddenByHost={page.hiddenByHost}
                        disabled={page.isTogglingListed}
                        error={page.error}
                        onToggleAction={page.toggleListed}
                    />

                    {/* Details */}
                    {profile && (
                        <section aria-labelledby="vendor-details-title">
                            <div className="flex items-center justify-between gap-3">
                                <h2 id="vendor-details-title" className="text-sm font-semibold text-ink">
                                    {t('me.profileTitle')}
                                </h2>
                                <Button type="button" variant="outline" size="lg" onClick={page.openProfile}>
                                    <Pencil aria-hidden="true" />
                                    {t('me.profileEdit')}
                                </Button>
                            </div>
                            <div className="mt-3 flex items-center gap-3">
                                <VendorLogo logoUrl={profile.logoUrl} name={profile.businessName} />
                                <div className="min-w-0 text-sm">
                                    <p className="truncate font-semibold text-ink">{profile.businessName}</p>
                                    <p className="truncate text-ink-muted">{profile.link}</p>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Partner */}
                    {page.showPartnerPrompt && <PartnerPromptCard />}
                </div>
            )}

            {page.profileOpen && me && <VendorProfileSheet open profile={profile} defaultType={me.vendorType} onCloseAction={page.closeProfile} />}
        </ModulePageShell>
    );
}
```
A vendor whose access is open but who has no `accessEndsAt` (no event end date) sees no access line; the `{me.accessOpen ? … : …}` expression renders nothing in that case.

- [ ] **Step 7: Write the route**

`EVENT/tools/vendors/me/PageClient.tsx`:
```tsx
'use client';

import { EventRouteGate } from '@/components/routing/EventRouteGate';
import { VendorMeScreen } from '@/components/vendors/me/VendorMeScreen';
import { VendorsPageSkeleton } from '@/components/vendors/VendorsSkeletons';

export default function VendorMePage() {
    return (
        <EventRouteGate fallback={<VendorsPageSkeleton />}>
            <VendorMeScreen />
        </EventRouteGate>
    );
}
```

`EVENT/tools/vendors/me/loading.tsx`: the same as Task 9's.

`EVENT/tools/vendors/me/page.tsx`:
```tsx
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { mediaKeys, mediaListPath } from '@/hooks/useMedia';
import { vendorProfileKeys } from '@/hooks/useVendorProfile';
import { vendorKeys } from '@/hooks/useVendors';
import { endpoints } from '@/lib/api/endpoints';
import type { Page as ApiPage } from '@/lib/api/pagination';
import { serverGet, serverGetOrNull } from '@/lib/api/serverFetch';
import type { MediaResponseDto, VendorMeDto, VendorProfileDto } from '@/lib/api/types';
import { resolveServerEventContext, resolveServerEventDetail } from '@/lib/auth/serverEventContext';
import { readableModuleKeys } from '@/lib/eventLifecycle';
import { makeQueryClient } from '@/lib/queryClient';

import VendorMePage from './PageClient';

type PageProps = { params: Promise<{ eventId: string }> };

// Prefetches the caller's vendor role, their profile and, for Pro album types, the
// Pro first page. Hosts are never vendors, so they get nothing.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const queryClient = makeQueryClient();
    const [context, event] = await Promise.all([resolveServerEventContext(eventId), resolveServerEventDetail(eventId)]);
    const modules = readableModuleKeys(event);

    if (context && !context.isHost && modules.has('vendors')) {
        try {
            const me = await serverGetOrNull<VendorMeDto>(endpoints.events.vendorMe(eventId), context.accessToken);
            queryClient.setQueryData(vendorKeys.me(eventId), me);
            if (me) {
                const withPro = me.capabilities.includes('PRO_ALBUM') && modules.has('gallery');
                const [profile, proFirstPage] = await Promise.all([
                    serverGetOrNull<VendorProfileDto>(endpoints.me.vendorProfile, context.accessToken),
                    withPro ? serverGet<ApiPage<MediaResponseDto>>(mediaListPath(eventId, 'PRO', 0), context.accessToken) : Promise.resolve(null),
                ]);
                queryClient.setQueryData(vendorProfileKeys.mine, profile);
                if (proFirstPage) queryClient.setQueryData(mediaKeys.proList(eventId), { pages: [proFirstPage], pageParams: [0] });
            }
        } catch {
            // Best-effort — the hooks fetch normally on the client if this fails.
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <VendorMePage />
        </HydrationBoundary>
    );
}
```
`serverGetOrNull` returns null on a 404, which is what `fetchMyVendorRole` and `fetchVendorProfile` return for the same answer, so the seeded `null` matches the client exactly.

- [ ] **Step 8: Run the tests**

Run: `npx vitest run lib/vendors.test.ts hooks/useVendorMePage.test.tsx hooks/useProAlbum.test.tsx components/vendors "app/(main)/(app)/(event)/events/[eventId]/tools/vendors" i18n/appMessages.test.ts && npm run type:check && npm run lint`
Expected: PASS, clean.

- [ ] **Step 9: Commit**

```bash
git add lib/vendors.ts lib/vendors.test.ts hooks/useVendorMePage.ts hooks/useVendorMePage.test.tsx hooks/useProAlbum.ts hooks/useProAlbum.test.tsx components/vendors messages "app/(main)/(app)/(event)/events/[eventId]/tools/vendors/me"
git commit -m "feat(vendors): the vendor page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Planner tools: schedule, share links, RSVP report, announcement

**Files:**
- Create: `hooks/useCanEditSchedule.ts`, `hooks/useAnnouncementComposer.ts`, `components/announcement/AnnouncementScreen.tsx`, `EVENT/tools/announcement/{page,PageClient,loading}.tsx`
- Modify: `components/schedule/ScheduleScreen.tsx`, `components/manage/invitations/InvitationsQrScreen.tsx`, `EVENT/manage/qr/PageClient.tsx`, `hooks/useRsvpReportPage.ts`, `components/manage/rsvp/RsvpReportActions.tsx`, `components/manage/rsvp/RsvpReportScreen.tsx`, `EVENT/manage/rsvp/reports/[reportType]/PageClient.tsx`
- Test: `hooks/useCanEditSchedule.test.tsx`, `hooks/useAnnouncementComposer.test.tsx`, `components/announcement/AnnouncementScreen.test.tsx`, `components/manage/invitations/InvitationsQrScreen.test.tsx`, `hooks/useRsvpReportPage.test.tsx` (extend), `components/manage/rsvp/RsvpReportActions.test.tsx`, the QR and report `PageClient.test.tsx` files (extend or create)

- [ ] **Step 1: Write the failing tests**

`hooks/useCanEditSchedule.test.tsx`:
```tsx
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useCanEditSchedule } from '@/hooks/useCanEditSchedule';

const vendor = vi.hoisted(() => ({ allowed: false, askedFor: undefined as string | null | undefined }));
vi.mock('@/hooks/useVendors', () => ({
    useHasVendorCapability: (eventId: string | null) => {
        vendor.askedFor = eventId;
        return { allowed: vendor.allowed, isLoading: false };
    },
}));

describe('useCanEditSchedule', () => {
    it('lets a host edit without asking about vendors', () => {
        expect(renderHook(() => useCanEditSchedule('e1', true)).result.current).toBe(true);
        expect(vendor.askedFor).toBeNull();
    });

    it('lets a planner with open access edit', () => {
        vendor.allowed = true;
        expect(renderHook(() => useCanEditSchedule('e1', false)).result.current).toBe(true);
        expect(vendor.askedFor).toBe('e1');
    });

    it('keeps everyone else read-only', () => {
        vendor.allowed = false;
        expect(renderHook(() => useCanEditSchedule('e1', false)).result.current).toBe(false);
    });
});
```

`hooks/useAnnouncementComposer.test.tsx`:
```tsx
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAnnouncementComposer } from '@/hooks/useAnnouncementComposer';

const push = vi.fn();
const create = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/usePosts', () => ({ useCreatePost: () => ({ mutateAsync: create, isPending: false }) }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: { contentLimits: { postContentMaxLength: 20 } } }) }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'failed' }));

function submitEvent() {
    return { preventDefault: vi.fn() } as unknown as React.SubmitEvent<HTMLFormElement>;
}

beforeEach(() => {
    push.mockReset();
    create.mockReset();
});

describe('useAnnouncementComposer', () => {
    it('reads the limit from the app config', () => {
        expect(renderHook(() => useAnnouncementComposer('e1')).result.current.maxLength).toBe(20);
    });

    it('refuses an empty message', async () => {
        const { result } = renderHook(() => useAnnouncementComposer('e1'));
        act(() => result.current.setContent('   '));
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(result.current.error).toBe('announcement.empty');
        expect(create).not.toHaveBeenCalled();
    });

    it('posts an unpinned announcement and goes to the feed', async () => {
        create.mockResolvedValue({ id: 'p1', eventId: 'e1' });
        const { result } = renderHook(() => useAnnouncementComposer('e1'));
        act(() => result.current.setContent('  Dinner at 9  '));
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(create).toHaveBeenCalledWith({ eventId: 'e1', type: 'ANNOUNCEMENT', content: 'Dinner at 9', isPinned: false });
        expect(push).toHaveBeenCalledWith('/events/e1/feed');
    });

    it('shows the server error and keeps the message', async () => {
        create.mockRejectedValue(new Error('403'));
        const { result } = renderHook(() => useAnnouncementComposer('e1'));
        act(() => result.current.setContent('Dinner at 9'));
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(result.current.error).toBe('failed');
        expect(result.current.content).toBe('Dinner at 9');
        expect(push).not.toHaveBeenCalled();
    });
});
```

`components/announcement/AnnouncementScreen.test.tsx`:
```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AnnouncementScreen } from '@/components/announcement/AnnouncementScreen';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/components/routing/EventRouteGate', () => ({ useEventRouteContext: () => ({ eventId: 'e1', activeEvent: { id: 'e1' }, isHost: true }) }));
const composer = vi.hoisted(() => ({
    value: { content: '', setContent: vi.fn(), maxLength: 500, error: 'boom' as string | null, isPosting: false, handleSubmit: vi.fn((event: { preventDefault: () => void }) => event.preventDefault()) },
}));
vi.mock('@/hooks/useAnnouncementComposer', () => ({ useAnnouncementComposer: () => composer.value }));

afterEach(cleanup);

describe('AnnouncementScreen', () => {
    it('has one labelled message box, the error and the post button', () => {
        render(<AnnouncementScreen />);
        const box = screen.getByLabelText('announcement.label');
        expect(box.getAttribute('maxLength')).toBe('500');
        fireEvent.change(box, { target: { value: 'Hi' } });
        expect(composer.value.setContent).toHaveBeenCalledWith('Hi');
        expect(screen.getByText('boom')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'announcement.send' }));
        expect(composer.value.handleSubmit).toHaveBeenCalled();
    });
});
```

`components/manage/invitations/InvitationsQrScreen.test.tsx`:
```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InvitationsQrScreen } from '@/components/manage/invitations/InvitationsQrScreen';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
const ctx = vi.hoisted(() => ({ isHost: false }));
vi.mock('@/components/routing/EventRouteGate', () => ({
    useEventRouteContext: () => ({ eventId: 'e1', activeEvent: { id: 'e1', status: 'ACTIVE' }, isHost: ctx.isHost }),
}));
const calls = vi.hoisted(() => ({ stats: [] as unknown[], usage: [] as unknown[], upgrades: [] as unknown[] }));
vi.mock('@/hooks/useQrLinks', () => ({
    useEventQrLinks: () => ({ data: [{ id: 'q1', targetType: 'EVENT_JOIN', label: 'Table', labelKey: null, publicUrl: 'https://x/q1' }], isLoading: false }),
    useEventQrLinkStats: (eventId: string | null) => {
        calls.stats.push(eventId);
        return { data: [], isLoading: false };
    },
}));
vi.mock('@/hooks/useUsage', () => ({
    useEventUsage: (eventId: string | null) => {
        calls.usage.push(eventId);
        return { data: null, isLoading: false };
    },
}));
vi.mock('@/hooks/useBilling', () => ({
    useUpgradeOptions: (_: string | null, enabled: boolean) => {
        calls.upgrades.push(enabled);
        return { data: [], isLoading: false };
    },
}));
vi.mock('@/hooks/useIsPrimaryHost', () => ({ useIsPrimaryHost: () => ctx.isHost }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: { planTiers: [] } }) }));
const rows = vi.hoisted(() => ({ canWrite: [] as boolean[] }));
vi.mock('@/components/manage/invitations/QrLinkRow', () => ({
    QrLinkRow: ({ canWrite }: { canWrite: boolean }) => {
        rows.canWrite.push(canWrite);
        return <p>row</p>;
    },
}));
vi.mock('@/components/manage/invitations/ShareLanguageNote', () => ({ ShareLanguageNote: () => null }));

beforeEach(() => {
    calls.stats = [];
    calls.usage = [];
    calls.upgrades = [];
    rows.canWrite = [];
});
afterEach(cleanup);

describe('InvitationsQrScreen for a planner', () => {
    it('shows the links read-only and skips every host-only call', () => {
        ctx.isHost = false;
        render(<InvitationsQrScreen />);
        expect(screen.getByText('row')).toBeTruthy();
        expect(rows.canWrite).toEqual([false]);
        expect(calls.stats.every((id) => id === null)).toBe(true);
        expect(calls.usage.every((id) => id === null)).toBe(true);
        expect(calls.upgrades.every((enabled) => enabled === false)).toBe(true);
        expect(screen.queryByText('qr.readOnly')).toBeNull();
    });

    it('keeps the host screen as it was', () => {
        ctx.isHost = true;
        render(<InvitationsQrScreen />);
        expect(rows.canWrite).toEqual([true]);
        expect(calls.stats).toContain('e1');
        expect(calls.usage).toContain('e1');
    });
});
```
Match the `QrLinkResponseDto` fixture to its type, and the module paths to the screen's imports.

Add to `hooks/useRsvpReportPage.test.tsx` (change its `EventRouteGate` mock to read `isHost` from a hoisted value):
```tsx
    it('lets only hosts download the PDF', () => {
        route.isHost = true;
        expect(renderHook(() => useRsvpReportPage('FULL_LIST')).result.current.canDownload).toBe(true);
        route.isHost = false;
        expect(renderHook(() => useRsvpReportPage('FULL_LIST')).result.current.canDownload).toBe(false);
    });

    it('closes back to the vendor page for ?from=vendor', () => {
        fromParam = 'vendor';
        renderHook(() => useRsvpReportPage('FULL_LIST')).result.current.onClose();
        expect(mocks.push).toHaveBeenCalledWith('/events/e1/tools/vendors/me');
    });
```
with `const route = vi.hoisted(() => ({ isHost: true }));` and the mock returning `{ eventId: 'e1', isHost: route.isHost }`.

`components/manage/rsvp/RsvpReportActions.test.tsx`:
```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RsvpReportActions } from '@/components/manage/rsvp/RsvpReportActions';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

afterEach(cleanup);

describe('RsvpReportActions', () => {
    it('shows print, download and close for a host', () => {
        render(<RsvpReportActions canDownload isDownloading={false} onPrint={vi.fn()} onDownload={vi.fn()} onClose={vi.fn()} />);
        expect(screen.getByRole('button', { name: 'downloadPdf' })).toBeTruthy();
    });

    it('has no download for a planner', () => {
        render(<RsvpReportActions canDownload={false} isDownloading={false} onPrint={vi.fn()} onDownload={vi.fn()} onClose={vi.fn()} />);
        expect(screen.queryByRole('button', { name: 'downloadPdf' })).toBeNull();
        expect(screen.getByRole('button', { name: 'print' })).toBeTruthy();
    });
});
```

The QR and RSVP report `PageClient.test.tsx`: assert the gate gets the vendor capability. The report one exists; add to it (and create the QR one the same way):
```tsx
vi.mock('@/components/routing/EventRouteGate', () => ({
    EventRouteGate: ({ allowVendorCapability, requireHost, children }: { allowVendorCapability?: string; requireHost?: boolean; children: React.ReactNode }) => (
        <div data-capability={allowVendorCapability} data-host={String(requireHost)}>
            {children}
        </div>
    ),
}));

it('opens to planners with the RSVP report capability', () => {
    const { container } = render(<RsvpReportPage />);
    expect(container.firstElementChild?.getAttribute('data-capability')).toBe('RSVP_REPORT');
    expect(container.firstElementChild?.getAttribute('data-host')).toBe('true');
});
```
(`QR_READ` for the QR page.) If the existing report test already mocks `EventRouteGate` differently, add the attribute check to its mock instead.

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run hooks/useCanEditSchedule.test.tsx hooks/useAnnouncementComposer.test.tsx components/announcement components/manage/invitations/InvitationsQrScreen.test.tsx hooks/useRsvpReportPage.test.tsx components/manage/rsvp "app/(main)/(app)/(event)/events/[eventId]/manage"`
Expected: FAIL.

- [ ] **Step 3: Schedule editing for planners**

`hooks/useCanEditSchedule.ts`:
```ts
'use client';

import { useHasVendorCapability } from '@/hooks/useVendors';

// Hosts, and planners while their access is open (vendors spec 2026-10-19), edit the schedule.
export function useCanEditSchedule(eventId: string, isHost: boolean): boolean {
    const planner = useHasVendorCapability(isHost ? null : eventId, 'SCHEDULE_EDIT');
    return isHost || planner.allowed;
}
```

`components/schedule/ScheduleScreen.tsx`:
- After `const { activeEvent, eventId, isHost } = useEventRouteContext();` add `const canEdit = useCanEditSchedule(eventId, isHost);`.
- `const canManageSchedule = canEdit && canWrite && scheduleEnabled;`
- `useScheduleSessionLimit(eventId, canManageSchedule && isHost, sessions.length)` — the limit reads the host-only usage endpoint; for a planner the backend's own 409 still applies.
- The `viewMode` initial state, the notice, the view toggle (`{isHost && (` above the two view buttons), the edit table condition (`activeEvent && isHost && viewMode === 'edit'`) and `ScheduleEmptyState isHost={…}`: use `canEdit` in place of `isHost` in each.

The `viewMode` initial state runs before the vendor role arrives on a client-only load. Add one effect-free fix: compute the initial mode from `searchParams.has('section')` alone and gate the edit table on `canEdit` (it already is after the change), so a planner who opens `?section=` sees the edit view as soon as `canEdit` turns true:
```ts
    const [viewMode, setViewMode] = useState<'public' | 'edit'>(() => (searchParams.has('section') ? 'edit' : 'public'));
```
Guests never get `?section=` links, and for them `canEdit` is false, so the edit table never shows.

Add a test to a new `components/schedule/ScheduleScreen.test.tsx`:
```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ScheduleScreen } from '@/components/schedule/ScheduleScreen';

const can = vi.hoisted(() => ({ edit: false }));
vi.mock('@/hooks/useCanEditSchedule', () => ({ useCanEditSchedule: () => can.edit }));
// Mock everything else ScheduleScreen imports the way its siblings' tests do: next-intl, next/navigation (useSearchParams),
// EventRouteGate's context ({ isHost: false, activeEvent: { id: 'e1', status: 'ACTIVE' }, eventId: 'e1' }),
// the schedule data hooks (two sessions), useScheduleSessionLimit, and the child components as small stubs:
vi.mock('@/components/schedule/ScheduleEditSessionsTable', () => ({ ScheduleEditSessionsTable: () => <p>edit table</p> }));
vi.mock('@/app/(main)/(app)/(event)/events/[eventId]/tools/schedule/components/ScheduleSessionsList', () => ({ ScheduleSessionsList: () => <p>public list</p> }));

afterEach(cleanup);

describe('ScheduleScreen for a planner', () => {
    it('shows the view toggle and the edit table', () => {
        can.edit = true;
        render(<ScheduleScreen />);
        expect(screen.getByRole('button', { name: 'views.edit' })).toBeTruthy();
    });

    it('keeps guests on the public list without a toggle', () => {
        can.edit = false;
        render(<ScheduleScreen />);
        expect(screen.queryByRole('button', { name: 'views.edit' })).toBeNull();
        expect(screen.getByText('public list')).toBeTruthy();
    });
});
```
Open `ScheduleScreen.tsx`'s import list and add one `vi.mock` per hook and child it uses before running this test; the two cases stay as written.

- [ ] **Step 4: Share links read-only for planners**

`components/manage/invitations/InvitationsQrScreen.tsx`:
```tsx
    const { activeEvent, eventId, isHost } = useEventRouteContext();
    // A planner (QR_READ) sees the links only: stats, usage, upgrades and edits stay with hosts.
    const hostEventId = isHost ? eventId : null;
    const { data: qrLinks = [], isLoading: qrLinksLoading } = useEventQrLinks(eventId);
    const { data: qrLinkStats = [], isLoading: statsLoading } = useEventQrLinkStats(hostEventId);
    const { data: eventUsage = null, isLoading: usageLoading } = useEventUsage(hostEventId);
    const isPrimaryHost = useIsPrimaryHost();
    const { data: upgradeOptions = [], isLoading: upgradesLoading } = useUpgradeOptions(eventId, isHost && isPrimaryHost);
```
```tsx
    const isWritable = isEventWritable(activeEvent?.status);
    const canWrite = isHost && isWritable;
```
and the read-only notice becomes `{isHost && !isWritable && (…)}`. A disabled TanStack query reports `isLoading: false`, so the loading flag needs no change.

`EVENT/manage/qr/PageClient.tsx`:
```tsx
        <EventRouteGate requireHost allowVendorCapability="QR_READ" fallback={<InvitationsQrPageSkeleton />}>
```

Check `useEventQrLinks`' backend endpoint accepts planners (backend plan: "Planners can read the QR link list only"); `QrLinkRow` with `canWrite={false}` shows no edit actions; open it and confirm it renders no stats line when `stats` is undefined.

- [ ] **Step 5: RSVP report for planners**

`hooks/useRsvpReportPage.ts`: read `isHost` from `useEventRouteContext()` and return `canDownload: isHost` (the PDF export stays host-only).

`components/manage/rsvp/RsvpReportActions.tsx`: add a `canDownload: boolean` prop and wrap the download button in `{canDownload && (…)}`.

`components/manage/rsvp/RsvpReportScreen.tsx`: pass `canDownload={page.canDownload}`.

`EVENT/manage/rsvp/reports/[reportType]/PageClient.tsx`:
```tsx
        <EventRouteGate requireHost allowVendorCapability="RSVP_REPORT" fallback={<RsvpReportScreenSkeleton />}>
```
The report page's `page.tsx` prefetch stays host-only; a planner's report loads on the client. The backend nulls `phone` for planners; check `RsvpReportScreen`'s table renders an empty cell for a null phone (it must not print "null").

- [ ] **Step 6: The announcement composer**

`hooks/useAnnouncementComposer.ts`:
```ts
'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { SubmitEvent } from 'react';
import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useCreatePost } from '@/hooks/usePosts';
import { routes } from '@/lib/routes';

// One message, posted as an ANNOUNCEMENT post (posts have no title), then back to the feed.
export function useAnnouncementComposer(eventId: string) {
    const t = useTranslations('Vendors');
    const router = useRouter();
    const toErrorMessage = useApiErrorMessage();
    const { data: appConfig } = useAppConfig();
    const createPost = useCreatePost();
    const [content, setContent] = useState('');
    const [error, setError] = useState<string | null>(null);
    const maxLength = appConfig?.contentLimits.postContentMaxLength ?? 500;

    const handleSubmit = useCallback(
        async (event: SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            const message = content.trim();
            if (!message) {
                setError(t('announcement.empty'));
                return;
            }
            setError(null);
            try {
                await createPost.mutateAsync({ eventId, type: 'ANNOUNCEMENT', content: message, isPinned: false });
                router.push(routes.events.feed(eventId));
            } catch (postError) {
                setError(toErrorMessage(postError));
            }
        },
        [content, createPost, eventId, router, t, toErrorMessage],
    );

    return { content, setContent, maxLength, error, isPosting: createPost.isPending, handleSubmit };
}
```
Check the `useAppConfig` field path against `hooks/useComposerController.ts` (it reads `appConfig?.contentLimits.postContentMaxLength`).

`components/announcement/AnnouncementScreen.tsx`:
```tsx
'use client';

import { Megaphone } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { Button } from '@/components/ui/button';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useAnnouncementComposer } from '@/hooks/useAnnouncementComposer';
import { routes } from '@/lib/routes';

export function AnnouncementScreen() {
    const t = useTranslations('Vendors.announcement');
    const { eventId } = useEventRouteContext();
    const composer = useAnnouncementComposer(eventId);

    return (
        <ModulePageShell maxWidth="xl" title={t('title')} icon={Megaphone} backLabel={t('back')} backHref={routes.events.feed(eventId)}>
            <form onSubmit={composer.handleSubmit} noValidate className="flex flex-col gap-4">
                {/* Message */}
                <div>
                    <FormFieldLabel htmlFor="announcement-content">{t('label')}</FormFieldLabel>
                    <textarea
                        id="announcement-content"
                        value={composer.content}
                        maxLength={composer.maxLength}
                        rows={5}
                        onChange={(event) => composer.setContent(event.target.value)}
                        className="w-full rounded-xl border border-border bg-background p-3 text-sm text-ink focus-ring"
                    />
                    {composer.error && (
                        <p role="alert" className="mt-1 text-sm text-rose-600">
                            {composer.error}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <Button type="submit" size="lg" disabled={composer.isPosting} className="self-end">
                    {t('send')}
                </Button>
            </form>
        </ModulePageShell>
    );
}
```

`EVENT/tools/announcement/PageClient.tsx`:
```tsx
'use client';

import { AnnouncementScreen } from '@/components/announcement/AnnouncementScreen';
import { EventRouteGate } from '@/components/routing/EventRouteGate';
import { VendorsPageSkeleton } from '@/components/vendors/VendorsSkeletons';

export default function AnnouncementPage() {
    return (
        <EventRouteGate requireHost allowVendorCapability="ANNOUNCE" fallback={<VendorsPageSkeleton />}>
            <AnnouncementScreen />
        </EventRouteGate>
    );
}
```

`EVENT/tools/announcement/page.tsx` (no Spring data to prefetch: the composer starts empty):
```tsx
import AnnouncementPage from './PageClient';

export default function Page() {
    return <AnnouncementPage />;
}
```

`EVENT/tools/announcement/loading.tsx`: the same as Task 9's.

- [ ] **Step 7: Run the tests and every schedule, QR and RSVP test**

Run: `npx vitest run hooks components/schedule components/manage components/announcement "app/(main)/(app)/(event)/events/[eventId]/manage" "app/(main)/(app)/(event)/events/[eventId]/tools" && npm run type:check && npm run lint`
Expected: PASS, clean.

- [ ] **Step 8: Commit**

```bash
git add hooks components/schedule components/manage components/announcement "app/(main)/(app)/(event)/events/[eventId]"
git commit -m "feat(vendors): planner tools and the announcement composer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: DJ live list

`/events/[eventId]/tools/playlist/live`, for hosts and `MUSIC` vendors with open access. It shows the leaderboard in rank order and polls it. A played row is dimmed with a check and stays in place.

**Files:**
- Modify: `hooks/usePlaylist.ts`, `components/playlist/PlaylistContent.tsx`, `components/playlist/PlaylistScreen.tsx`
- Create: `hooks/usePlaylistLive.ts`, `components/playlist/live/PlaylistLiveScreen.tsx`, `components/playlist/live/PlaylistLiveRow.tsx`, `EVENT/tools/playlist/live/{page,PageClient,loading}.tsx`
- Test: `hooks/usePlaylistLive.test.tsx`, `components/playlist/live/PlaylistLiveScreen.test.tsx`, `components/playlist/PlaylistContent.test.tsx` (extend or create), `EVENT/tools/playlist/live/page.test.tsx`

- [ ] **Step 1: Write the failing tests**

`hooks/usePlaylistLive.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePlaylistLive } from '@/hooks/usePlaylistLive';

const patch = vi.fn();
const invalidate = vi.fn();
const leaderboard = vi.hoisted(() => ({ calls: [] as unknown[][], data: [] as unknown[] }));
vi.mock('@/lib/api/client', () => ({ api: { patch: (...a: unknown[]) => patch(...a) } }));
vi.mock('@tanstack/react-query', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@tanstack/react-query')>()),
    useQueryClient: () => ({ invalidateQueries: invalidate }),
}));
vi.mock('@/hooks/usePlaylist', () => ({
    playlistKeys: { leaderboard: (eventId: string) => ['events', eventId, 'playlist-suggestions', 'leaderboard'] },
    usePlaylistLeaderboard: (...args: unknown[]) => {
        leaderboard.calls.push(args);
        return { data: leaderboard.data, isLoading: false, isError: false };
    },
}));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'failed' }));

// useMutation needs a provider; invalidations go to the mocked useQueryClient above.
function TestWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    patch.mockReset();
    invalidate.mockReset();
    leaderboard.calls = [];
    leaderboard.data = [
        { id: 's1', title: 'One', rank: 1, playedAt: null },
        { id: 's2', title: 'Two', rank: 2, playedAt: '2027-07-12T21:00:00Z' },
    ];
});

describe('usePlaylistLive', () => {
    it('polls the leaderboard and keeps the server order', () => {
        const { result } = renderHook(() => usePlaylistLive('e1'), { wrapper: TestWrapper });
        expect(leaderboard.calls[0]).toEqual(['e1', true, { refetchInterval: 15_000 }]);
        expect(result.current.rows.map((row) => row.id)).toEqual(['s1', 's2']);
    });

    it('marks a song played and not played, then refreshes the list', async () => {
        patch.mockResolvedValue({});
        const { result } = renderHook(() => usePlaylistLive('e1'), { wrapper: TestWrapper });
        await act(() => result.current.togglePlayed(leaderboard.data[0] as never));
        expect(patch).toHaveBeenCalledWith('/api/events/e1/playlist-suggestions/s1/played', { played: true });
        await act(() => result.current.togglePlayed(leaderboard.data[1] as never));
        expect(patch).toHaveBeenLastCalledWith('/api/events/e1/playlist-suggestions/s2/played', { played: false });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['events', 'e1', 'playlist-suggestions', 'leaderboard'] });
    });

    it('shows the error when the mark fails', async () => {
        patch.mockRejectedValue(new Error('403'));
        const { result } = renderHook(() => usePlaylistLive('e1'), { wrapper: TestWrapper });
        await act(() => result.current.togglePlayed(leaderboard.data[0] as never));
        expect(result.current.error).toBe('failed');
    });
});
```
`components/playlist/live/PlaylistLiveScreen.test.tsx`:
```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PlaylistLiveScreen } from '@/components/playlist/live/PlaylistLiveScreen';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key) }));
vi.mock('@/components/routing/EventRouteGate', () => ({ useEventRouteContext: () => ({ eventId: 'e1', activeEvent: { id: 'e1' }, isHost: false }) }));
const live = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock('@/hooks/usePlaylistLive', () => ({ usePlaylistLive: () => live.value }));

beforeEach(() => {
    live.value = {
        rows: [
            { id: 's1', title: 'One', artist: 'A', rank: 1, upvoteCount: 3, downvoteCount: 0, playedAt: null },
            { id: 's2', title: 'Two', artist: null, rank: 2, upvoteCount: 1, downvoteCount: 0, playedAt: '2027-07-12T21:00:00Z' },
        ],
        isLoading: false,
        error: null,
        pendingId: null,
        togglePlayed: vi.fn(),
    };
});
afterEach(cleanup);

describe('PlaylistLiveScreen', () => {
    it('lists songs by rank and marks one played', () => {
        render(<PlaylistLiveScreen />);
        const rows = screen.getAllByRole('listitem');
        expect(rows[0].textContent).toContain('One');
        expect(rows[1].textContent).toContain('Two');
        expect(rows[1].textContent).toContain('live.played');
        fireEvent.click(screen.getByRole('button', { name: 'live.markPlayed:{"title":"One"}' }));
        expect(live.value.togglePlayed).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));
        expect(screen.getByRole('button', { name: 'live.markUnplayed:{"title":"Two"}' }).getAttribute('aria-pressed')).toBe('true');
    });

    it('shows the empty line', () => {
        live.value = { ...live.value, rows: [] };
        render(<PlaylistLiveScreen />);
        expect(screen.getByText('live.empty')).toBeTruthy();
    });
});
```

`components/playlist/PlaylistContent.test.tsx` (create if missing; mock `next-intl`, `@/hooks/useModuleCopy` → `{ name: 'Playlist' }`, and `PlaylistItemRow` as a stub):
```tsx
describe('PlaylistContent live list link', () => {
    it('links hosts and DJs to the live list', () => {
        render(<PlaylistContent {...BASE} showLiveLink />);
        expect(screen.getByRole('link', { name: 'Vendors.live.open' }).getAttribute('href')).toBe('/events/e1/tools/playlist/live');
    });

    it('has no link for guests', () => {
        render(<PlaylistContent {...BASE} showLiveLink={false} />);
        expect(screen.queryByRole('link', { name: 'Vendors.live.open' })).toBeNull();
    });
});
```
with `const BASE = { canSuggest: true, eventId: 'e1', isEventWritable: true, onSuggest: vi.fn(), suggestions: [], suggestionsLoading: false };` and a `useTranslations` mock that returns `${ns}.${key}`.

`EVENT/tools/playlist/live/page.test.tsx` (Task 9's mocks, plus `serverGetOrNull` as in Task 16):
```tsx
describe('live list prefetch', () => {
    it('fetches the leaderboard for a host', async () => {
        ctx.context = { accessToken: 'tok', isHost: true };
        serverGet.mockResolvedValue([]);
        await Page({ params: Promise.resolve({ eventId: 'e1' }) });
        expect(serverGet).toHaveBeenCalledWith('/api/events/e1/playlist-suggestions/leaderboard', 'tok');
        expect(serverGetOrNull).not.toHaveBeenCalled();
    });

    it('fetches the role, then the leaderboard, for a DJ', async () => {
        ctx.context = { accessToken: 'tok', isHost: false };
        serverGetOrNull.mockResolvedValue({ vendorId: 'v1', vendorType: 'MUSIC', capabilities: ['SONG_REQUESTS'], accessOpen: true });
        serverGet.mockResolvedValue([]);
        await Page({ params: Promise.resolve({ eventId: 'e1' }) });
        expect(serverGetOrNull).toHaveBeenCalledWith('/api/events/e1/vendors/me', 'tok');
        expect(serverGet).toHaveBeenCalledWith('/api/events/e1/playlist-suggestions/leaderboard', 'tok');
    });

    it('stops after the role for a guest or a vendor without the tool', async () => {
        ctx.context = { accessToken: 'tok', isHost: false };
        serverGetOrNull.mockResolvedValue({ vendorId: 'v1', vendorType: 'PLANNER', capabilities: ['SCHEDULE_EDIT'], accessOpen: true });
        await Page({ params: Promise.resolve({ eventId: 'e1' }) });
        serverGetOrNull.mockResolvedValue(null);
        await Page({ params: Promise.resolve({ eventId: 'e1' }) });
        expect(serverGet).not.toHaveBeenCalled();
    });

    it('fetches nothing without the playlist module, and still renders when Spring fails', async () => {
        ctx.context = { accessToken: 'tok', isHost: true };
        ctx.event = { ...VENDOR_EVENT, modules: VENDOR_EVENT.modules.filter((m) => m.moduleKey !== 'playlist') };
        await Page({ params: Promise.resolve({ eventId: 'e1' }) });
        expect(serverGet).not.toHaveBeenCalled();
        ctx.event = VENDOR_EVENT;
        serverGet.mockRejectedValue(new Error('down'));
        await expect(Page({ params: Promise.resolve({ eventId: 'e1' }) })).resolves.toBeTruthy();
    });
});
```
`VENDOR_EVENT` here carries the `playlist` and `vendors` modules.

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run hooks/usePlaylistLive.test.tsx components/playlist "app/(main)/(app)/(event)/events/[eventId]/tools/playlist"`
Expected: FAIL.

- [ ] **Step 3: Let the leaderboard poll**

`hooks/usePlaylist.ts`, `usePlaylistLeaderboard`:
```ts
export function usePlaylistLeaderboard(eventId: string | null, enabled = true, options: { refetchInterval?: number } = {}) {
    // …unchanged body…
        staleTime: LIVE_CONTENT_STALE_TIME,
        refetchInterval: options.refetchInterval,
    });
}
```
Existing callers pass two arguments and keep `refetchInterval: undefined` (no polling), as today.

- [ ] **Step 4: Write `hooks/usePlaylistLive.ts`**

```ts
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { playlistKeys, usePlaylistLeaderboard } from '@/hooks/usePlaylist';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { PlaylistSuggestionLeaderboardDto } from '@/lib/api/types';

// Guests keep voting during the party, so the DJ's list refreshes on its own.
export const PLAYLIST_LIVE_REFRESH_MS = 15_000;

// The DJ's live list: the leaderboard in rank order and the played mark.
export function usePlaylistLive(eventId: string) {
    const toErrorMessage = useApiErrorMessage();
    const queryClient = useQueryClient();
    const leaderboard = usePlaylistLeaderboard(eventId, true, { refetchInterval: PLAYLIST_LIVE_REFRESH_MS });
    const [error, setError] = useState<string | null>(null);

    const markPlayed = useMutation({
        mutationFn: ({ id, played }: { id: string; played: boolean }) =>
            api.patch<PlaylistSuggestionLeaderboardDto>(endpoints.events.playlistSuggestionPlayed(eventId, id), { played }),
        onSettled: () => queryClient.invalidateQueries({ queryKey: playlistKeys.leaderboard(eventId) }),
    });

    const togglePlayed = useCallback(
        async (row: PlaylistSuggestionLeaderboardDto) => {
            setError(null);
            try {
                await markPlayed.mutateAsync({ id: row.id, played: !row.playedAt });
            } catch (markError) {
                setError(toErrorMessage(markError));
            }
        },
        [markPlayed, toErrorMessage],
    );

    return {
        rows: leaderboard.data ?? [],
        isLoading: leaderboard.isLoading,
        error,
        pendingId: markPlayed.isPending ? (markPlayed.variables?.id ?? null) : null,
        togglePlayed,
    };
}
```
Check `api.patch`'s signature in `lib/api/client.ts` (path, body); the test asserts exactly those two arguments.

- [ ] **Step 5: Write the row and the screen**

`components/playlist/live/PlaylistLiveRow.tsx`:
```tsx
'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { PlaylistSuggestionLeaderboardDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function PlaylistLiveRow({
    row,
    isPending,
    onToggleAction,
}: {
    row: PlaylistSuggestionLeaderboardDto;
    isPending: boolean;
    onToggleAction: (row: PlaylistSuggestionLeaderboardDto) => void;
}) {
    const t = useTranslations('Vendors.live');
    const played = Boolean(row.playedAt);

    return (
        <li className={cn('flex min-h-14 items-center gap-3 py-2', played && 'opacity-50')}>
            {/* Rank */}
            <span className="w-6 shrink-0 text-right text-sm font-bold text-ink-muted tabular-nums">{row.rank}</span>

            {/* Song */}
            <div className="min-w-0 flex-1">
                <p className={cn('truncate text-sm font-semibold text-ink', played && 'line-through')}>{row.title}</p>
                <p className="truncate text-xs text-ink-muted">
                    {[row.artist, t('votes', { count: row.upvoteCount - row.downvoteCount })].filter(Boolean).join(' · ')}
                </p>
            </div>

            {/* Played */}
            {played && <span className="sr-only">{t('played')}</span>}
            <button
                type="button"
                aria-pressed={played}
                aria-label={played ? t('markUnplayed', { title: row.title }) : t('markPlayed', { title: row.title })}
                disabled={isPending}
                onClick={() => onToggleAction(row)}
                className={cn(
                    'flex size-11 shrink-0 items-center justify-center rounded-full border focus-ring disabled:opacity-50',
                    played ? 'border-ink bg-ink text-white' : 'border-border text-ink-muted',
                )}
            >
                <Check className="size-5" aria-hidden="true" />
            </button>
        </li>
    );
}
```
The `played` word is screen-reader text plus the dimmed, struck-through title; the test reads it through `textContent`.

`components/playlist/live/PlaylistLiveScreen.tsx`:
```tsx
'use client';

import { ListMusic } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PlaylistLiveRow } from '@/components/playlist/live/PlaylistLiveRow';
import { PlaylistListSkeleton } from '@/components/playlist/PlaylistSkeletons';
import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { usePlaylistLive } from '@/hooks/usePlaylistLive';
import { routes } from '@/lib/routes';

export function PlaylistLiveScreen() {
    const t = useTranslations('Vendors.live');
    const { eventId } = useEventRouteContext();
    const live = usePlaylistLive(eventId);

    return (
        <ModulePageShell maxWidth="2xl" title={t('title')} icon={ListMusic} backLabel={t('back')} backHref={routes.events.tools.playlist(eventId)}>
            {/* Error */}
            {live.error && (
                <p role="alert" className="mb-4 text-sm text-rose-600">
                    {live.error}
                </p>
            )}

            {/* Songs */}
            {live.isLoading ? (
                <PlaylistListSkeleton />
            ) : live.rows.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('empty')}</p>
            ) : (
                <ol className="divide-y divide-border">
                    {live.rows.map((row) => (
                        <PlaylistLiveRow key={row.id} row={row} isPending={live.pendingId === row.id} onToggleAction={live.togglePlayed} />
                    ))}
                </ol>
            )}
        </ModulePageShell>
    );
}
```
Check the playlist route helper's name in `lib/routes.ts` (`routes.events.tools.playlist`); use the existing one.

- [ ] **Step 6: Link from the playlist screen**

`PlaylistContent.tsx`: add `showLiveLink?: boolean` (default `false`) to the props. Wrap the `action` slot so the link sits before the Suggest button:
```tsx
            action={
                showLiveLink || suggestions.length > 0 ? (
                    <div className="flex items-center gap-2">
                        {/* Live list */}
                        {showLiveLink && (
                            <AppLink
                                href={routes.events.tools.playlistLive(eventId)}
                                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-semibold text-ink focus-ring"
                            >
                                <ListMusic className="h-4 w-4" aria-hidden="true" />
                                {tVendors('live.open')}
                            </AppLink>
                        )}
                        {suggestions.length > 0 && (
                            /* the existing Suggest button, unchanged */
                        )}
                    </div>
                ) : undefined
            }
```
with `const tVendors = useTranslations('Vendors');` and imports for `AppLink` and `ListMusic`. Move the existing button JSX into the `{suggestions.length > 0 && (…)}` slot as it is.

`PlaylistScreen.tsx`:
```tsx
    const { activeEvent, eventId, isHost } = useEventRouteContext();
    const dj = useHasVendorCapability(isHost ? null : eventId, 'SONG_REQUESTS');
```
and pass `showLiveLink={isHost || dj.allowed}` to `PlaylistContent`.

- [ ] **Step 7: Write the route**

`EVENT/tools/playlist/live/PageClient.tsx`:
```tsx
'use client';

import { PlaylistLiveScreen } from '@/components/playlist/live/PlaylistLiveScreen';
import { PlaylistPageSkeleton } from '@/components/playlist/PlaylistSkeletons';
import { EventRouteGate } from '@/components/routing/EventRouteGate';

export default function PlaylistLivePage() {
    return (
        <EventRouteGate requireHost allowVendorCapability="SONG_REQUESTS" fallback={<PlaylistPageSkeleton />}>
            <PlaylistLiveScreen />
        </EventRouteGate>
    );
}
```

`EVENT/tools/playlist/live/loading.tsx`:
```tsx
import { PlaylistPageSkeleton } from '@/components/playlist/PlaylistSkeletons';

// Shown the moment a link here is clicked, while the server renders the page.
export default function Loading() {
    return <PlaylistPageSkeleton />;
}
```

`EVENT/tools/playlist/live/page.tsx`:
```tsx
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { playlistKeys } from '@/hooks/usePlaylist';
import { vendorKeys } from '@/hooks/useVendors';
import { endpoints } from '@/lib/api/endpoints';
import { serverGet, serverGetOrNull } from '@/lib/api/serverFetch';
import type { PlaylistSuggestionLeaderboardDto, VendorMeDto } from '@/lib/api/types';
import { resolveServerEventContext, resolveServerEventDetail } from '@/lib/auth/serverEventContext';
import { readableModuleKeys } from '@/lib/eventLifecycle';
import { makeQueryClient } from '@/lib/queryClient';
import { hasVendorCapability } from '@/lib/vendors';

import PlaylistLivePage from './PageClient';

type PageProps = { params: Promise<{ eventId: string }> };

// Prefetches the leaderboard for hosts, and for a DJ after their vendor role
// (which the route gate needs too). Anyone else gets only the role.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const queryClient = makeQueryClient();
    const [context, event] = await Promise.all([resolveServerEventContext(eventId), resolveServerEventDetail(eventId)]);
    const modules = readableModuleKeys(event);

    if (context && modules.has('playlist')) {
        try {
            let allowed = context.isHost;
            if (!context.isHost && modules.has('vendors')) {
                const me = await serverGetOrNull<VendorMeDto>(endpoints.events.vendorMe(eventId), context.accessToken);
                queryClient.setQueryData(vendorKeys.me(eventId), me);
                allowed = hasVendorCapability(me, 'SONG_REQUESTS');
            }
            if (allowed) {
                const rows = await serverGet<PlaylistSuggestionLeaderboardDto[]>(endpoints.events.playlistSuggestionsLeaderboard(eventId), context.accessToken);
                queryClient.setQueryData(playlistKeys.leaderboard(eventId), rows);
            }
        } catch {
            // Best-effort — the hooks fetch normally on the client if this fails.
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <PlaylistLivePage />
        </HydrationBoundary>
    );
}
```
`usePlaylistLeaderboard` returns the array as is (no `normalizeList`); if it normalizes, seed the same shape.

- [ ] **Step 8: Run the tests**

Run: `npx vitest run hooks/usePlaylistLive.test.tsx hooks/usePlaylist components/playlist "app/(main)/(app)/(event)/events/[eventId]/tools/playlist" && npm run type:check && npm run lint`
Expected: PASS, clean.

- [ ] **Step 9: Commit**

```bash
git add hooks/usePlaylist.ts hooks/usePlaylistLive.ts hooks/usePlaylistLive.test.tsx components/playlist "app/(main)/(app)/(event)/events/[eventId]/tools/playlist"
git commit -m "feat(vendors): live song list for the DJ

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: Invite, checkout and notification lines

Three small pieces: the vendor line on the invite page, the vendor offer line at checkout, and the `VENDOR_JOINED` notification fallback copy.

The invite page also needs one behaviour change. Today a signed-in member who opens any invite link is sent straight to the feed (`useInviteMemberRedirect`). On a vendor link that would stop an existing guest from becoming the vendor (Decision 17 below, spec "Joining"), so the redirect is skipped and the Join button shows.

**Files:**
- Modify: `app/(main)/invite/[token]/InviteOnboardingBoundary.tsx`, `components/checkout/PartnerBrandingNotice.tsx`, `components/notifications/NotificationRow.tsx`
- Test: `app/(main)/invite/[token]/InviteOnboardingBoundary.test.tsx` (extend), `components/checkout/PartnerBrandingNotice.test.tsx` (create), `components/notifications/NotificationRow.test.tsx` (extend)

- [ ] **Step 1: Write the failing tests**

In `InviteOnboardingBoundary.test.tsx`, make the preview a hoisted value:
```tsx
const mocks = vi.hoisted(() => ({
    replace: vi.fn(),
    accept: vi.fn(),
    myEvents: { data: [] as { eventId: string }[] | undefined, isLoading: false },
    preview: { inviteToken: 'tok', eventId: 'event-1', eventTitle: 'Party', expired: false, alreadyUsed: false, gift: null, vendorType: null as string | null },
}));
```
point the `useEventInvitationPreview` mock at `data: mocks.preview`, reset `mocks.preview.vendorType = null` in `beforeEach`, and change the `next-intl` mock to `useTranslations: (ns?: string) => (key: string) => (ns === 'Vendors.invite' ? `vendor:${key}` : key)`. Add:
```tsx
describe('InviteOnboardingBoundary on a vendor link', () => {
    beforeEach(() => {
        mocks.replace.mockReset();
        mocks.accept.mockReset();
        mocks.myEvents = { data: [], isLoading: false };
        mocks.preview.vendorType = 'PHOTOGRAPHER';
    });
    afterEach(cleanup);

    it('says which vendor the link is for', () => {
        render(<InviteOnboardingBoundary token="tok" />);
        expect(screen.getByText('vendor:PHOTOGRAPHER')).toBeInTheDocument();
    });

    it('lets an existing guest join as the vendor instead of sending them to the feed', async () => {
        mocks.myEvents = { data: [{ eventId: 'event-1' }], isLoading: false };
        mocks.accept.mockResolvedValue({ eventId: 'event-1' });
        render(<InviteOnboardingBoundary token="tok" />);
        expect(mocks.replace).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: /join/ }));
        await waitFor(() => expect(mocks.accept).toHaveBeenCalledWith('tok'));
        expect(mocks.replace).toHaveBeenCalledWith('/events/event-1/feed');
    });
});
```
The existing "opens the feed straight away for an existing member" case keeps passing because its preview has `vendorType: null`.

`components/checkout/PartnerBrandingNotice.test.tsx`:
```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PartnerBrandingNotice } from '@/components/checkout/PartnerBrandingNotice';
import type { PartnerBrandingNoticeDto } from '@/lib/api/types';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key) }));

const NOTICE = { displayName: 'Studio X', noticeVersion: 1 } as PartnerBrandingNoticeDto;

afterEach(cleanup);

describe('PartnerBrandingNotice', () => {
    it('adds the vendor line when the plan sends the partner a vendor link', () => {
        render(<PartnerBrandingNotice notice={{ ...NOTICE, vendorOffer: true }} accepted onChangeAction={vi.fn()} />);
        expect(screen.getByText('vendorOffer:{"partner":"Studio X"}')).toBeTruthy();
    });

    it('has no vendor line otherwise', () => {
        render(<PartnerBrandingNotice notice={NOTICE} accepted onChangeAction={vi.fn()} />);
        expect(screen.queryByText(/^vendorOffer/)).toBeNull();
    });
});
```
Fill `NOTICE` with every required field of `PartnerBrandingNoticeDto`.

Add to `components/notifications/NotificationRow.test.tsx` (use its notification builder and `next-intl` mock; if the mock does not show values, change it to `(key, values) => values ? `${key}:${JSON.stringify(values)}` : key` with a `has: () => true` property):
```tsx
    it('fills the VENDOR_JOINED fallback with the business and the type', () => {
        render(
            <NotificationRow
                notification={notification({
                    type: 'VENDOR_JOINED',
                    title: null,
                    body: null,
                    payload: { businessName: 'Studio X', vendorType: 'PHOTOGRAPHER' },
                })}
            />,
        );
        expect(screen.getByText('types.VENDOR_JOINED.title:{"business":"Studio X","type":"types.PHOTOGRAPHER","over":"","dueDate":""}')).toBeTruthy();
    });
```
The `types.PHOTOGRAPHER` value comes from the `Vendors` namespace; if the file's mock ignores the namespace the key reads the same. Adjust the expected string to the mock's format, keeping the two values.

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run "app/(main)/invite" components/checkout components/notifications`
Expected: FAIL.

- [ ] **Step 3: The invite line and the redirect**

`InviteOnboardingBoundary.tsx`:
```tsx
    const tVendors = useTranslations('Vendors.invite');
```
```tsx
    // A vendor link promotes an existing guest, so a member who opens one stays to press Join (vendors spec 2026-10-19).
    const isOpeningMemberFeed = useInviteMemberRedirect(preview?.vendorType ? null : preview?.eventId);
```
and directly after the `{/* Gift */}` block:
```tsx
                            {/* Vendor */}
                            {activePreview.vendorType && <p className="text-sm font-semibold text-ink">{tVendors(activePreview.vendorType)}</p>}
```
The accept's 409 duplicate-membership branch stays: the backend promotes on a vendor link instead of answering 409, so the branch only runs for ordinary links.

- [ ] **Step 4: The checkout line**

`PartnerBrandingNotice.tsx`, directly after the body paragraph:
```tsx
            {notice.vendorOffer && <p className="mt-1 text-sm leading-relaxed text-ink-muted">{t('vendorOffer', { partner })}</p>}
```

- [ ] **Step 5: The notification fallback**

`NotificationRow.tsx`:
```tsx
    const tVendors = useTranslations('Vendors');
```
```tsx
    const vendorType = payloadString(notification, 'vendorType');
    // Copy values every fallback can use; a key that doesn't need one ignores it.
    const copyValues = {
        business: payloadString(notification, 'businessName') ?? '',
        type: vendorType && tVendors.has(`types.${vendorType}`) ? tVendors(`types.${vendorType}`) : '',
        over: payloadString(notification, 'overFormatted') ?? '',
        dueDate: payloadString(notification, 'dueDate') ?? '',
    };
    const title = notification.title ?? (t.has(titleKey) ? t(titleKey, copyValues) : t('generic.title'));
    const body = notification.body ?? (t.has(bodyKey) ? t(bodyKey, copyValues) : null);
```
replacing the current `title`/`body` lines. The backend sends a localized title and body, so this copy shows only when they are missing.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run "app/(main)/invite" components/checkout components/notifications && npm run type:check && npm run lint`
Expected: PASS, clean.

- [ ] **Step 7: Commit**

```bash
git add "app/(main)/invite/[token]" components/checkout/PartnerBrandingNotice.tsx components/checkout/PartnerBrandingNotice.test.tsx components/notifications
git commit -m "feat(vendors): vendor lines on the invite, checkout and notifications

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 20: Admin

**Files:**
- Modify: `lib/planModuleConfig.ts`, `lib/planModuleConfig.test.ts`, `components/admin/events/EventDetail.tsx`, `hooks/useAdminEvents.ts`
- Create: `components/admin/events/EventVendorsSection.tsx`, `components/admin/events/EventVendorsSection.test.tsx`, `hooks/useAdminEventVendors.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `lib/planModuleConfig.test.ts`:
```ts
describe('vendors config fields', () => {
    it('gives the plan grid number fields for the vendors module', () => {
        expect(knownConfigFields('vendors')).toEqual([
            { key: 'maxVendors', type: 'number', min: 0 },
            { key: 'accessDaysAfterEvent', type: 'number', min: 0 },
            { key: 'proStorageBytes', type: 'number', min: 0 },
        ]);
    });

    it('leaves allowedTypes in the Advanced JSON', () => {
        const { known, unknown } = splitConfig('vendors', { maxVendors: 5, allowedTypes: ['PLANNER'] });
        expect(known).toEqual({ maxVendors: 5 });
        expect(unknown).toEqual({ allowedTypes: ['PLANNER'] });
    });
});
```
(import `knownConfigFields` and `splitConfig` if the file does not yet.)

`hooks/useAdminEventVendors.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useAdminEventVendors } from '@/hooks/useAdminEvents';

const apiGet = vi.fn().mockResolvedValue([]);
vi.mock('@/lib/api/client', () => ({ api: { get: (...a: unknown[]) => apiGet(...a) } }));

function wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;
}

describe('useAdminEventVendors', () => {
    it('reads the admin vendor list', async () => {
        renderHook(() => useAdminEventVendors('e1'), { wrapper });
        await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/api/admin/events/e1/vendors'));
    });

    it('asks nothing without an event', () => {
        apiGet.mockClear();
        renderHook(() => useAdminEventVendors(null), { wrapper });
        expect(apiGet).not.toHaveBeenCalled();
    });
});
```

`components/admin/events/EventVendorsSection.test.tsx`:
```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EventVendorsSection } from '@/components/admin/events/EventVendorsSection';

vi.mock('next-intl', () => ({
    useTranslations: (ns: string) => (key: string, values?: Record<string, unknown>) => (values ? `${ns}.${key}:${JSON.stringify(values)}` : `${ns}.${key}`),
    useLocale: () => 'en',
}));
vi.mock('@/lib/datetime', () => ({ formatDate: () => '1 Jul 2027' }));
const query = vi.hoisted(() => ({ value: { data: [] as unknown[], isLoading: false } }));
vi.mock('@/hooks/useAdminEvents', () => ({ useAdminEventVendors: () => query.value }));

afterEach(cleanup);

describe('EventVendorsSection', () => {
    it('lists type, business name and joined date', () => {
        query.value = {
            data: [{ id: 'v1', memberId: 'm1', vendorType: 'PHOTOGRAPHER', businessName: 'Studio X', link: null, logoUrl: null, joinedAt: '2027-07-01T10:00:00Z', hiddenByHost: false, optedOut: false }],
            isLoading: false,
        };
        render(<EventVendorsSection eventId="e1" />);
        expect(screen.getByText('Vendors.types.PHOTOGRAPHER')).toBeTruthy();
        expect(screen.getByText('Studio X')).toBeTruthy();
        expect(screen.getByText('Vendors.admin.joined:{"date":"1 Jul 2027"}')).toBeTruthy();
    });

    it('shows the empty line', () => {
        query.value = { data: [], isLoading: false };
        render(<EventVendorsSection eventId="e1" />);
        expect(screen.getByText('Vendors.admin.empty')).toBeTruthy();
    });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run lib/planModuleConfig.test.ts hooks/useAdminEventVendors.test.tsx components/admin/events/EventVendorsSection.test.tsx`
Expected: FAIL.

- [ ] **Step 3: The plan grid fields**

`lib/planModuleConfig.ts`, in `KNOWN_CONFIG_FIELDS`:
```ts
    vendors: [
        { key: 'maxVendors', type: 'number', min: 0 },
        { key: 'accessDaysAfterEvent', type: 'number', min: 0 },
        { key: 'proStorageBytes', type: 'number', min: 0 },
    ],
```
The labels exist from Task 6 (`AdminPage.plans.grid.cell.fields`). If `ModuleKey` is a closed union without `'vendors'`, Task 2 added it; check before running.

- [ ] **Step 4: The hook**

`hooks/useAdminEvents.ts`:
```ts
export const adminEventKeys = {
    // …existing keys…
    vendors: (eventId: string) => ['admin', 'events', 'detail', eventId, 'vendors'] as const,
};
```
```ts
// GET /api/admin/events/{eventId}/vendors — admins only, read-only.
export function useAdminEventVendors(eventId: string | null) {
    return useQuery({
        queryKey: adminEventKeys.vendors(eventId ?? ''),
        queryFn: () => api.get<VendorRowDto[]>(endpoints.admin.events.vendors(eventId!)),
        enabled: Boolean(eventId),
        ...NO_RETENTION,
    });
}
```
The key sits under `detail(eventId)`, so any existing invalidation of the event detail refreshes it too. Import `VendorRowDto`.

- [ ] **Step 5: The card**

`components/admin/events/EventVendorsSection.tsx`:
```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';

import { OrderCard } from '@/components/admin/orders/OrderCard';
import { useAdminEventVendors } from '@/hooks/useAdminEvents';
import { formatDate } from '@/lib/datetime';

// The event's vendors, read-only: type, business name and joined date.
export function EventVendorsSection({ eventId }: { eventId: string }) {
    const t = useTranslations('Vendors');
    const locale = useLocale();
    const { data: vendors = [], isLoading } = useAdminEventVendors(eventId);

    return (
        <OrderCard title={t('admin.title')}>
            {isLoading ? null : vendors.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('admin.empty')}</p>
            ) : (
                <ul className="space-y-3">
                    {vendors.map((vendor) => (
                        <li key={vendor.id} className="flex items-baseline justify-between gap-3 text-sm">
                            {/* Vendor */}
                            <div className="min-w-0">
                                <p className="truncate font-semibold text-ink">{vendor.businessName ?? t(`types.${vendor.vendorType}`)}</p>
                                {vendor.businessName && <p className="text-xs text-ink-muted">{t(`types.${vendor.vendorType}`)}</p>}
                            </div>

                            {/* Joined */}
                            {vendor.joinedAt && (
                                <span className="shrink-0 font-mono text-xs text-ink-muted">
                                    {t('admin.joined', { date: formatDate(locale, vendor.joinedAt, { dateStyle: 'medium' }) })}
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </OrderCard>
    );
}
```
Adjust the first test's expectations if needed: with a business name, the type shows as the second line, so both `getByText` calls hold.

- [ ] **Step 6: Put it in the event detail**

`EventDetail.tsx`, directly after `<EventHostsSection hosts={event.hosts} />`:
```tsx
                    {event.modules.some((module) => module.moduleKey === 'vendors') && <EventVendorsSection eventId={event.id} />}
```
Check `AdminEventDetailDto`'s module field name (`modules` with `moduleKey`, as `EventModulesSection` reads it) and use that. The card shows only on events whose plan has the vendors module, so other events get no extra request.

- [ ] **Step 7: Run the tests**

Run: `npx vitest run lib/planModuleConfig.test.ts hooks/useAdminEventVendors.test.tsx components/admin && npm run type:check && npm run lint`
Expected: PASS, clean.

- [ ] **Step 8: Commit**

```bash
git add lib/planModuleConfig.ts lib/planModuleConfig.test.ts hooks/useAdminEvents.ts hooks/useAdminEventVendors.test.tsx components/admin/events
git commit -m "feat(vendors): admin plan fields and the event's vendor card

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 21: Full check

- [ ] **Step 1: Every check**

Run: `npm run lint && npm run type:check && npx vitest run`
Expected: all clean and passing. Fix anything that fails before going on; do not skip a failing test.

- [ ] **Step 2: Visual checks, signed in, on :3000**

Run the backend from the backend plan's branch and this branch's dev server on `:3000` (local backend CORS allows only `:3000`). Open it with `preview_start {url: "http://localhost:3000/"}` only. The browser pane starts signed out: ask the user for the local test login and sign in yourself. Turn the vendors module on for one test event's plan from the admin plan grid (Task 20).

Check each screen at 375 px first, then desktop:
1. Manage → Vendors: the 8 links, copy, QR, reset confirmation; a joined vendor row and its sheet (hide, remove confirmation).
2. Open a vendor link signed out, join, and see the profile prompt on the feed; save the profile.
3. Open a vendor link as an existing guest: the Join button shows, and after joining the guest is the vendor.
4. The guest list: hidden and opted-out vendors are absent, an @handle opens Instagram.
5. The vendor badge on a vendor's post and comment.
6. A planner: the vendor page, schedule edit, announcement post, RSVP report without download and without phones, read-only share links.
7. A photographer: Pro upload, the meter over the allowance (neutral, with the overflow line), the gallery "Pro" tab, the credit line in the viewer.
8. A DJ: the live list, mark played and unplayed, the link on the playlist screen.
9. The host right panel's Pro meter.
10. The checkout vendor line with a partner code, the `VENDOR_JOINED` notification, and the admin vendor card.

Also, from the spec's manual checks:
11. Open each host-only screen by URL as a guest and as each vendor type: refused, except the ones opened to that type.
12. Move the event's end date into the past (beyond `accessDaysAfterEvent`): the tools menu keeps only "Your vendor page", and the vendor page says the tools have stopped.
13. A venue vendor: joins, fills the profile, has no tools besides the vendor page.
14. iPhone: the vendor join and Pro upload flow in the WebKit setup.

Look for overlap, cramped text and broken section separation.

- [ ] **Step 3: SEO check**

Check every new route against `docs/seo-guidelines.md`: `/events/[eventId]/manage/vendors`, `/tools/vendors`, `/tools/vendors/me`, `/tools/announcement`, `/tools/playlist/live`. They sit under `/events/`, which is in `PRIVATE_PATHS` and noindex. Expected: no blockers. List any rule a route breaks as a **BLOCKER** in the report and the PR description.

- [ ] **Step 4: Report**

Tell the user what passed, what was checked visually, and anything left. Remind them that the terms and privacy notice lines (spec, "Legal") are not part of this plan and need review before release. Do not open the pull request until they ask; it goes into `staging`.
