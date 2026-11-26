# Graduation frontend, part 1 — the type, its schedule and the then & now prompt

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The app knows the GRADUATION type: its create-event entry, its schedule rows (Ceremony, Dinner and a Party suggestion), and a then & now photo prompt on a new Graduation event's feed.

**Architecture:** GRADUATION joins the `EventTypeConvention` union and the per-type tables that already describe WEDDING, BAPTISM and REUNION. The schedule screen's rows move into one `lib/sessionManagement.ts` function that also returns suggestion rows. The default feed layout (drawn while a host has saved none) takes an optional prompt text, which a small hook supplies for GRADUATION.

**Tech Stack:** Next.js App Router, React, TypeScript, next-intl, TanStack Query, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-26-graduation-event-type-design.md` §4.3, §6, §8. Jira: KAN-301 (type, schedule), KAN-303 (prompt). Parts 2 (Graduates block, KAN-302) and 3 (photo frame, KAN-304) build on this branch.

**Backend:** `claude/kan-300-graduation-backend` in guestwall-be. This part needs none of it to build or test; on staging it needs the backend's GRADUATION type (V237) to create an event.

**Copy:** every string below is approved in the spec (§4.3, §6, §9). Add no other text.

---

## File map

| File | Change | Responsibility |
|---|---|---|
| `lib/api/types.ts` | Modify | `GRADUATION` in `EventTypeConvention` |
| `lib/createEventCatalog.ts` | Modify | GRADUATION entry and fallback photo |
| `lib/createEventFeatures.ts` | Modify | GRADUATION feature order |
| `lib/occasions/occasions.ts` | Modify | GRADUATION occasion entry (not ready) |
| `lib/graduationEventType.test.ts` | Create | the type's catalog entries |
| `lib/sessionManagement.ts` | Modify | GRADUATION rows, the suggestion, `scheduleEditRows` |
| `lib/sessionManagement.test.ts` | Create | rows per type |
| `components/schedule/ScheduleEditSessionRow.tsx` | Modify | titles from the type, empty-row text per row |
| `components/schedule/ScheduleEditSessionRow.test.tsx` | Modify | GRADUATION rows |
| `components/schedule/ScheduleEditSessionsTable.tsx` | Modify | uses `scheduleEditRows` |
| `components/schedule/ScheduleScreen.tsx` | Modify | a suggestion opens the editor with its title |
| `components/schedule/ScheduleScreen.test.tsx` | Modify | suggestion prefill |
| `app/(main)/(app)/(event)/events/[eventId]/tools/schedule/components/ScheduleEditorSheet.tsx` | Modify | `prefillTitle` |
| `app/(main)/(app)/(event)/events/[eventId]/tools/schedule/components/ScheduleEditorForm.tsx` | Modify | `prefillTitle` |
| `lib/feedLayout.ts` | Modify | `defaultFeedLayout(promptText?)`, `readFeedLayout(..., promptText?)` |
| `lib/feedLayout.test.ts` | Modify | the prompt in the default layout |
| `hooks/useFeedStarterPrompt.ts` | Create | the prompt text for an event type |
| `hooks/useFeedStarterPrompt.test.tsx` | Create | GRADUATION gets it, others don't |
| `hooks/useFeedLayout.ts`, `hooks/useFeedThemeSwitch.ts`, `hooks/useFeedEditMode.ts` | Modify | pass the prompt |
| `messages/en.json`, `messages/el.json` | Modify | approved copy |

---

### Task 0: Branch

- [ ] **Step 1: Bring the branch up to date and give it the ticket key**

```bash
git fetch origin staging -q
git merge --no-edit origin/staging
git branch -m claude/kan-301-graduation-frontend
```

Expected: a clean merge (the branch holds only docs). The spec and the three plans ship in this branch's PR.

- [ ] **Step 2: Check the baseline**

Run: `npx tsc --noEmit` and `npx vitest run lib/feedLayout.test.ts components/schedule`
Expected: both clean. If not, stop and report: the failures are not this plan's.

---

### Task 1: GRADUATION in the type tables (KAN-301)

**Files:**
- Create: `lib/graduationEventType.test.ts`
- Modify: `lib/api/types.ts:20`, `lib/createEventCatalog.ts`, `lib/createEventFeatures.ts`, `lib/occasions/occasions.ts`
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Write the failing test**

Create `lib/graduationEventType.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { createEventTypePhoto, getCreateEventCatalogEntry, getInitialSessionTitleKey } from '@/lib/createEventCatalog';
import { featurePriority } from '@/lib/createEventFeatures';
import { OCCASIONS } from '@/lib/occasions/occasions';
import en from '@/messages/en.json';
import el from '@/messages/el.json';

// Spec 2026-11-26-graduation-event-type-design.md §4.3, §8.
describe('the GRADUATION type', () => {
    it('has a ceremony first and a dinner second, with its own form labels', () => {
        const entry = getCreateEventCatalogEntry('GRADUATION');
        expect(entry).toEqual({
            startAtLabelKey: 'fieldLabels.GRADUATION.startAt',
            initialSessionTitleKey: 'initialSessions.GRADUATION.title',
            secondarySessionTitleKey: 'secondarySessions.GRADUATION.title',
        });
        expect(getInitialSessionTitleKey('GRADUATION')).toBe('initialSessions.GRADUATION.title');
        expect(en.CreateEventPage.initialSessions.GRADUATION.title).toBe('Ceremony');
        expect(el.CreateEventPage.initialSessions.GRADUATION.title).toBe('Ορκωμοσία');
        expect(en.CreateEventPage.secondarySessions.GRADUATION.title).toBe('Dinner');
        expect(el.CreateEventPage.secondarySessions.GRADUATION.title).toBe('Δείπνο');
        expect(en.CreateEventPage.fieldLabels.GRADUATION).toEqual({
            title: 'Event name',
            startAt: 'Ceremony date',
            locationName: 'Ceremony location',
        });
        expect(el.CreateEventPage.fieldLabels.GRADUATION).toEqual({
            title: 'Όνομα εκδήλωσης',
            startAt: 'Ημερομηνία ορκωμοσίας',
            locationName: 'Τοποθεσία ορκωμοσίας',
        });
    });

    it("uses REUNION's photo until an admin uploads one", () => {
        expect(createEventTypePhoto('GRADUATION', null)).toBe('/landing/friends-and-family-celebrating-at-sunset.webp');
        expect(createEventTypePhoto('GRADUATION', 'https://cdn.test/g.webp')).toBe('https://cdn.test/g.webp');
    });

    it('shows its features in the approved order', () => {
        expect(featurePriority('GRADUATION')).toEqual(['gallery', 'wishbook', 'rsvp', 'stories', 'co_hosts', 'schedule', 'posts']);
    });

    it('has an occasion entry that is not ready', () => {
        expect(OCCASIONS.find((occasion) => occasion.eventType === 'GRADUATION')).toEqual({
            eventType: 'GRADUATION',
            slugs: { en: 'graduations', el: 'apofoitisi' },
            ready: false,
            launched: false,
        });
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run lib/graduationEventType.test.ts`
Expected: FAIL — `getCreateEventCatalogEntry('GRADUATION')` is undefined (and `tsc` would reject `'GRADUATION'`).

- [ ] **Step 3: The union**

In `lib/api/types.ts`, replace line 20:

```ts
export type EventTypeConvention = 'WEDDING' | 'BAPTISM' | 'SOCIAL_EVENT' | 'BIRTHDAY' | 'PRIVATE_PARTY' | 'GENDER_REVEAL' | 'BABY_SHOWER' | 'REUNION';
```

with

```ts
export type EventTypeConvention =
    | 'WEDDING'
    | 'BAPTISM'
    | 'SOCIAL_EVENT'
    | 'BIRTHDAY'
    | 'PRIVATE_PARTY'
    | 'GENDER_REVEAL'
    | 'BABY_SHOWER'
    | 'REUNION'
    | 'GRADUATION';
```

- [ ] **Step 4: The create-event catalog**

In `lib/createEventCatalog.ts`, after the `BAPTISM: { ... },` entry inside `CREATE_EVENT_CATALOG`, add:

```ts
    // A graduation's ceremony, then a dinner (spec 2026-11-26-graduation-event-type-design.md §4.3).
    // No backgroundImageSrc: the old create flow's photo; the wizard uses CREATE_EVENT_TYPE_PHOTOS.
    GRADUATION: {
        startAtLabelKey: 'fieldLabels.GRADUATION.startAt',
        initialSessionTitleKey: 'initialSessions.GRADUATION.title',
        secondarySessionTitleKey: 'secondarySessions.GRADUATION.title',
    },
```

In `CREATE_EVENT_TYPE_PHOTOS`, after the `REUNION` line, add:

```ts
    // Until an admin uploads a graduation photo in the event type drawer.
    GRADUATION: '/landing/friends-and-family-celebrating-at-sunset.webp',
```

- [ ] **Step 5: The feature order**

In `lib/createEventFeatures.ts`, in `PRIORITY`, after the `REUNION: [...]` line, add:

```ts
    GRADUATION: ['gallery', 'wishbook', 'rsvp', 'stories', 'co_hosts', 'schedule', 'posts'],
```

- [ ] **Step 6: The occasion entry**

In `lib/occasions/occasions.ts`, after the `REUNION` line in `OCCASIONS`, add:

```ts
    { eventType: 'GRADUATION', slugs: { en: 'graduations', el: 'apofoitisi' }, ready: false, launched: false },
```

`ready: false` keeps the page, sitemap and links off until the occasion page has its own copy and SEO review (spec §12).

- [ ] **Step 7: The copy**

The message files hold some duplicate keys, so never rewrite them with `JSON.parse`/`JSON.stringify`: insert the lines as text. Every anchor below is unique in its file.

`messages/en.json` — after

```json
            "PRIVATE_PARTY": {
                "title": "Party name",
                "startAt": "Party date"
            }
```

(inside `CreateEventPage.fieldLabels`) change the closing `}` to `},` and add:

```json
            "GRADUATION": {
                "title": "Event name",
                "startAt": "Ceremony date",
                "locationName": "Ceremony location"
            }
```

After

```json
            "REUNION": {
                "title": "Reunion"
            }
```

change the closing `}` to `},` and add:

```json
            "GRADUATION": {
                "title": "Ceremony"
            }
```

In `"secondarySessions"`, replace

```json
            "BAPTISM": {
                "title": "Venue"
            }
        },
```

with

```json
            "BAPTISM": {
                "title": "Venue"
            },
            "GRADUATION": {
                "title": "Dinner"
            }
        },
        "suggestedSessions": {
            "GRADUATION": {
                "title": "Party"
            }
        },
```

`messages/el.json`, the same three places:

```json
            "GRADUATION": {
                "title": "Όνομα εκδήλωσης",
                "startAt": "Ημερομηνία ορκωμοσίας",
                "locationName": "Τοποθεσία ορκωμοσίας"
            }
```

after `"PRIVATE_PARTY": { "title": "Όνομα πάρτι", "startAt": "Ημερομηνία πάρτι" }` (with its `}` → `},`);

```json
            "GRADUATION": {
                "title": "Ορκωμοσία"
            }
```

after `"REUNION": { "title": "Συνάντηση" }` (with its `}` → `},`); and replace

```json
            "BAPTISM": {
                "title": "Χώρος δεξίωσης"
            }
        },
```

with

```json
            "BAPTISM": {
                "title": "Χώρος δεξίωσης"
            },
            "GRADUATION": {
                "title": "Δείπνο"
            }
        },
        "suggestedSessions": {
            "GRADUATION": {
                "title": "Πάρτι"
            }
        },
```

Then run `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));JSON.parse(require('fs').readFileSync('messages/el.json','utf8'))"` — no output means both still parse.

- [ ] **Step 8: Run the tests and the type check**

Run: `npx vitest run lib/graduationEventType.test.ts lib/createEventCatalog.test.ts lib/createEventFeatures.test.ts lib/occasions lib/seo.test.ts lib/forBusinessOccasions.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: clean. A `Record<EventTypeConvention, …>` without GRADUATION is an error here; the only full one is `CREATE_EVENT_TYPE_PHOTOS` (done). Every other per-type table is `Partial`, and GRADUATION falls back to its defaults on purpose: the wizard's button says "your event" (`TYPE_CONTINUE_KEY`), the main session's map icon is the celebration one (`sessionLocations`).

- [ ] **Step 9: Commit**

```bash
git add lib/api/types.ts lib/createEventCatalog.ts lib/createEventFeatures.ts lib/occasions/occasions.ts lib/graduationEventType.test.ts messages/en.json messages/el.json
git commit -m "KAN-301: the GRADUATION type in the create-event tables

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The schedule rows (KAN-301)

**Files:**
- Create: `lib/sessionManagement.test.ts`
- Modify: `lib/sessionManagement.ts`
- Modify: `components/schedule/ScheduleEditSessionRow.tsx`, `components/schedule/ScheduleEditSessionRow.test.tsx`
- Modify: `components/schedule/ScheduleEditSessionsTable.tsx`
- Modify: `messages/en.json`, `messages/el.json`

The rows' titles now come from the same `CreateEventPage` keys the sessions are created with (`defaultTitleKey`), not from `SchedulePage.host.sessionManagement.ceremony/venue.title`. For WEDDING and BAPTISM both give the same words in both languages ("Ceremony"/"Τελετή", "Venue"/"Χώρος δεξίωσης"), so nothing changes on screen for them. `titleKey` stays: `components/manage/ManagedSessionSection.tsx` still reads it.

- [ ] **Step 1: Write the failing tests**

Create `lib/sessionManagement.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import type { EventSessionResponseDto } from '@/lib/api/types';
import { getManagedSessionDefinitions, getScheduleSuggestions, scheduleEditRows } from '@/lib/sessionManagement';

const session = (id: string, flags: Partial<Pick<EventSessionResponseDto, 'isMain' | 'isSecondary'>> = {}) =>
    ({ id, isMain: false, isSecondary: false, ...flags }) as EventSessionResponseDto;

const roles = (rows: ReturnType<typeof scheduleEditRows>) => rows.map((row) => row.definition?.role ?? row.session?.id);

describe('scheduleEditRows', () => {
    it('gives a graduation Ceremony and Dinner slots titled with its own words, and says "Not added yet"', () => {
        const [main, secondary] = getManagedSessionDefinitions('GRADUATION');
        expect(main).toMatchObject({ role: 'main', defaultTitleKey: 'initialSessions.GRADUATION.title', missingKey: 'notAdded' });
        expect(secondary).toMatchObject({ role: 'secondary', defaultTitleKey: 'secondarySessions.GRADUATION.title', missingKey: 'notAdded' });
    });

    it('suggests a party while a graduation has nothing but its ceremony and dinner', () => {
        expect(roles(scheduleEditRows('GRADUATION', [session('c', { isMain: true })]))).toEqual(['main', 'secondary', 'suggestion']);
        expect(roles(scheduleEditRows('GRADUATION', [session('c', { isMain: true }), session('d', { isSecondary: true })]))).toEqual([
            'main',
            'secondary',
            'suggestion',
        ]);
        const [party] = getScheduleSuggestions('GRADUATION');
        expect(party).toMatchObject({ role: 'suggestion', sectionId: 'party-session', defaultTitleKey: 'suggestedSessions.GRADUATION.title', missingKey: 'notAdded' });
    });

    it('drops the suggestion once a graduation has any other item', () => {
        expect(roles(scheduleEditRows('GRADUATION', [session('c', { isMain: true }), session('p')]))).toEqual(['main', 'secondary', 'p']);
    });

    it('leaves weddings, baptisms and other types as they were', () => {
        expect(roles(scheduleEditRows('WEDDING', [session('c', { isMain: true }), session('x')]))).toEqual(['main', 'secondary', 'x']);
        expect(getManagedSessionDefinitions('WEDDING').map((definition) => definition.missingKey)).toEqual(['mainMissing', 'missing']);
        expect(getManagedSessionDefinitions('BAPTISM').map((definition) => definition.missingKey)).toEqual(['mainMissing', 'missing']);
        expect(getScheduleSuggestions('WEDDING')).toEqual([]);
        expect(roles(scheduleEditRows('BIRTHDAY', [session('b', { isMain: true })]))).toEqual(['b']);
    });
});
```

In `components/schedule/ScheduleEditSessionRow.test.tsx`, add the import

```ts
import { getScheduleSuggestions } from '@/lib/sessionManagement';
```

next to the existing `getManagedSessionDefinitions` import (merge them into one import line), and append at the end of the file:

```tsx
describe('ScheduleEditSessionRow for a graduation', () => {
    const [ceremony, dinner] = getManagedSessionDefinitions('GRADUATION');
    const [party] = getScheduleSuggestions('GRADUATION');

    it('titles the empty rows Ceremony, Dinner and Party and says they are not added yet', () => {
        for (const [definition, title] of [
            [ceremony, 'Ceremony'],
            [dinner, 'Dinner'],
            [party, 'Party'],
        ] as const) {
            renderRow({ definition, eventType: 'GRADUATION' });
            expect(screen.getByText(title)).toBeTruthy();
            expect(screen.getByText('Not added yet.')).toBeTruthy();
            cleanup();
        }
    });

    it('creates from the Party suggestion', () => {
        const handlers = renderRow({ definition: party, eventType: 'GRADUATION' });
        fireEvent.click(screen.getByRole('button', { name: 'Add Party' }));
        expect(handlers.onCreateManagedSession).toHaveBeenCalledWith(party);
    });

    it("keeps a wedding's wording", () => {
        renderRow({ definition: secondaryDefinition });
        expect(screen.getByText('Venue')).toBeTruthy();
        expect(screen.getByText('No venue session has been added yet.')).toBeTruthy();
    });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run lib/sessionManagement.test.ts components/schedule/ScheduleEditSessionRow.test.tsx`
Expected: FAIL — `getScheduleSuggestions` and `scheduleEditRows` are not exported; GRADUATION has no definitions.

- [ ] **Step 3: The definitions and rows**

Replace the whole of `lib/sessionManagement.ts` with:

```ts
import type { EventSessionResponseDto, EventTypeConvention } from '@/lib/api/types';

export type ManagedSessionRole = 'main' | 'secondary';
export type ManagedSessionSectionId = 'ceremony-session' | 'venue-session';
// The schedule screen's line under an empty row (SchedulePage.host.sessionManagement).
export type ScheduleRowMissingKey = 'mainMissing' | 'missing' | 'notAdded';

export interface ManagedSessionDefinition {
    role: ManagedSessionRole;
    sectionId: ManagedSessionSectionId;
    // ManagedSessionSection's title and description (SchedulePage.host.sessionManagement).
    titleKey: 'ceremony' | 'venue';
    // The row's title and the created session's title (CreateEventPage).
    defaultTitleKey: string;
    missingKey: ScheduleRowMissingKey;
    canCreate: boolean;
    matches: (session: EventSessionResponseDto) => boolean;
}

// A row the schedule screen suggests (spec 2026-11-26-graduation-event-type-design.md §4.3): tapping
// it opens the editor with the title filled in, and the saved item is an ordinary session.
export interface SuggestedSessionDefinition {
    role: 'suggestion';
    sectionId: 'party-session';
    defaultTitleKey: string;
    missingKey: ScheduleRowMissingKey;
    canCreate: true;
}

export type ScheduleRowDefinition = ManagedSessionDefinition | SuggestedSessionDefinition;

export type ScheduleEditRow = { definition: ScheduleRowDefinition | null; session: EventSessionResponseDto | null };

const MAIN_SESSION: ManagedSessionDefinition = {
    role: 'main',
    sectionId: 'ceremony-session',
    titleKey: 'ceremony',
    defaultTitleKey: 'initialSessions.WEDDING.title',
    missingKey: 'mainMissing',
    // Only restores a missing one: the backend refuses a second (5123) and never deletes it (5122).
    canCreate: true,
    matches: (session) => session.isMain,
};

const SECONDARY_SESSION: ManagedSessionDefinition = {
    role: 'secondary',
    sectionId: 'venue-session',
    titleKey: 'venue',
    defaultTitleKey: 'secondarySessions.WEDDING.title',
    missingKey: 'missing',
    canCreate: true,
    matches: (session) => session.isSecondary,
};

const SESSION_MANAGEMENT_BY_EVENT_TYPE: Partial<Record<EventTypeConvention, ManagedSessionDefinition[]>> = {
    WEDDING: [MAIN_SESSION, SECONDARY_SESSION],
    BAPTISM: [
        { ...MAIN_SESSION, defaultTitleKey: 'initialSessions.BAPTISM.title' },
        { ...SECONDARY_SESSION, defaultTitleKey: 'secondarySessions.BAPTISM.title' },
    ],
    GRADUATION: [
        { ...MAIN_SESSION, defaultTitleKey: 'initialSessions.GRADUATION.title', missingKey: 'notAdded' },
        { ...SECONDARY_SESSION, defaultTitleKey: 'secondarySessions.GRADUATION.title', missingKey: 'notAdded' },
    ],
};

const SUGGESTIONS_BY_EVENT_TYPE: Partial<Record<EventTypeConvention, SuggestedSessionDefinition[]>> = {
    GRADUATION: [
        { role: 'suggestion', sectionId: 'party-session', defaultTitleKey: 'suggestedSessions.GRADUATION.title', missingKey: 'notAdded', canCreate: true },
    ],
};

export function getManagedSessionDefinitions(eventType: EventTypeConvention): ManagedSessionDefinition[] {
    return SESSION_MANAGEMENT_BY_EVENT_TYPE[eventType] ?? [];
}

export function getScheduleSuggestions(eventType: EventTypeConvention): SuggestedSessionDefinition[] {
    return SUGGESTIONS_BY_EVENT_TYPE[eventType] ?? [];
}

// The schedule screen's edit rows: the type's slots, filled or not; its suggestions while the event has
// nothing but those slots, so a host who arranged something else never sees one; then every other item.
export function scheduleEditRows(eventType: EventTypeConvention, sessions: EventSessionResponseDto[]): ScheduleEditRow[] {
    const managed = getManagedSessionDefinitions(eventType).map((definition) => ({
        definition,
        session: sessions.find(definition.matches) ?? null,
    }));
    const managedIds = new Set(managed.map((row) => row.session?.id).filter(Boolean));
    const others = sessions.filter((session) => !managedIds.has(session.id));
    const suggestions = others.length === 0 ? getScheduleSuggestions(eventType).map((definition) => ({ definition, session: null })) : [];
    return [...managed, ...suggestions, ...others.map((session) => ({ definition: null, session }))];
}
```

- [ ] **Step 4: The row**

In `components/schedule/ScheduleEditSessionRow.tsx`:

Replace the import

```ts
import type { ManagedSessionDefinition } from '@/lib/sessionManagement';
```

with

```ts
import type { ScheduleRowDefinition } from '@/lib/sessionManagement';
```

In the props interface replace `definition: ManagedSessionDefinition | null;` with `definition: ScheduleRowDefinition | null;` and `onCreateManagedSession: (definition: ManagedSessionDefinition) => void;` with `onCreateManagedSession: (definition: ScheduleRowDefinition) => void;`.

Replace

```ts
    const t = useTranslations('SchedulePage.host.sessionManagement');
```

with

```ts
    const t = useTranslations('SchedulePage.host.sessionManagement');
    const tCreateEvent = useTranslations('CreateEventPage');
```

Replace

```ts
    const title = session?.title ?? (definition ? t(`${definition.titleKey}.title`) : t('untitled'));
```

with

```ts
    const definitionTitle = definition ? tCreateEvent(definition.defaultTitleKey) : null;
    const title = session?.title ?? definitionTitle ?? t('untitled');
```

Replace

```tsx
                        {!session && <p className="mt-0.5 text-xs text-ink-muted">{definition?.role === 'main' ? t('mainMissing') : t('missing')}</p>}
```

with

```tsx
                        {!session && definition && <p className="mt-0.5 text-xs text-ink-muted">{t(definition.missingKey)}</p>}
```

Replace

```tsx
                            aria-label={definition ? t('addNamed', { title: t(`${definition.titleKey}.title`) }) : t('addItem')}
```

with

```tsx
                            aria-label={definitionTitle ? t('addNamed', { title: definitionTitle }) : t('addItem')}
```

The icon logic is unchanged: the suggestion has neither the main nor the secondary role, so it shows the calendar icon like any other item.

- [ ] **Step 5: The table**

In `components/schedule/ScheduleEditSessionsTable.tsx`:

Replace

```ts
import { getManagedSessionDefinitions, type ManagedSessionDefinition } from '@/lib/sessionManagement';
```

with

```ts
import { type ScheduleRowDefinition, scheduleEditRows } from '@/lib/sessionManagement';
```

Replace `onCreateManagedSession: (definition: ManagedSessionDefinition) => void;` with `onCreateManagedSession: (definition: ScheduleRowDefinition) => void;`.

Replace

```ts
    const definitions = getManagedSessionDefinitions(event.eventType);
    const managedRows = definitions.map((definition) => ({
        definition,
        session: sessions.find(definition.matches) ?? null,
    }));
    const managedSessionIds = new Set(managedRows.map((row) => row.session?.id).filter(Boolean));
    const otherSessions = sessions.filter((session) => !managedSessionIds.has(session.id));
```

with

```ts
    const rows = scheduleEditRows(event.eventType, sessions);
```

and replace

```tsx
                {[...managedRows, ...otherSessions.map((session) => ({ definition: null, session }))].map((row) => (
```

with

```tsx
                {rows.map((row) => (
```

- [ ] **Step 6: The copy**

`messages/en.json`, inside `SchedulePage.host.sessionManagement` (the second `"mainMissing"` in the file, at about line 2348), replace

```json
                "mainMissing": "No ceremony session yet. Add it to show it here.",
```

with

```json
                "mainMissing": "No ceremony session yet. Add it to show it here.",
                "notAdded": "Not added yet.",
```

`messages/el.json`, the same place (about line 2477):

```json
                "mainMissing": "Δεν υπάρχει ακόμη ενότητα τελετής. Προσθέστε τη για να εμφανιστεί εδώ.",
                "notAdded": "Δεν έχει προστεθεί ακόμη.",
```

Check the right `mainMissing` with `grep -n '"mainMissing"' messages/en.json` — the one indented 16 spaces is `sessionManagement`'s.

- [ ] **Step 7: Run the tests**

Run: `npx vitest run lib/sessionManagement.test.ts components/schedule`
Expected: PASS, including the existing wedding row tests.

- [ ] **Step 8: Commit**

```bash
git add lib/sessionManagement.ts lib/sessionManagement.test.ts components/schedule/ScheduleEditSessionRow.tsx components/schedule/ScheduleEditSessionRow.test.tsx components/schedule/ScheduleEditSessionsTable.tsx messages/en.json messages/el.json
git commit -m "KAN-301: graduation schedule rows, Ceremony, Dinner and a Party suggestion

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: A suggestion opens the editor with its title (KAN-301)

**Files:**
- Modify: `components/schedule/ScheduleScreen.tsx`, `components/schedule/ScheduleScreen.test.tsx`
- Modify: `app/(main)/(app)/(event)/events/[eventId]/tools/schedule/components/ScheduleEditorSheet.tsx`
- Modify: `app/(main)/(app)/(event)/events/[eventId]/tools/schedule/components/ScheduleEditorForm.tsx`

- [ ] **Step 1: Write the failing test**

In `components/schedule/ScheduleScreen.test.tsx`:

Replace the first import line with

```ts
import { act, cleanup, render, screen } from '@testing-library/react';
```

and add after the `ScheduleScreen` import:

```ts
import { getScheduleSuggestions, type ScheduleRowDefinition } from '@/lib/sessionManagement';
```

After the `const can = vi.hoisted(...)` line add:

```ts
const captured = vi.hoisted(() => ({
    onCreateManagedSession: null as null | ((definition: ScheduleRowDefinition) => void),
    sheets: [] as { open: boolean; prefillTitle?: string; secondaryPrefillTitle?: string }[],
}));
```

Replace

```ts
vi.mock('@/components/schedule/ScheduleEditSessionsTable', () => ({ ScheduleEditSessionsTable: () => <p>edit table</p> }));
```

with

```tsx
vi.mock('@/components/schedule/ScheduleEditSessionsTable', () => ({
    ScheduleEditSessionsTable: (props: { onCreateManagedSession: (definition: ScheduleRowDefinition) => void }) => {
        captured.onCreateManagedSession = props.onCreateManagedSession;
        return <p>edit table</p>;
    },
}));
```

Replace

```ts
vi.mock('@/app/(main)/(app)/(event)/events/[eventId]/tools/schedule/components/ScheduleEditorSheet', () => ({ ScheduleEditorSheet: () => null }));
```

with

```tsx
vi.mock('@/app/(main)/(app)/(event)/events/[eventId]/tools/schedule/components/ScheduleEditorSheet', () => ({
    ScheduleEditorSheet: (props: { open: boolean; prefillTitle?: string; secondaryPrefillTitle?: string }) => {
        captured.sheets.push(props);
        return null;
    },
}));
```

In `afterEach`, add `captured.sheets = [];`.

Inside `describe('ScheduleScreen for a planner', ...)`, add:

```tsx
    it("opens the editor with a suggestion's title, as an ordinary item", () => {
        can.edit = true;
        render(<ScheduleScreen />);
        const [party] = getScheduleSuggestions('GRADUATION');
        act(() => captured.onCreateManagedSession?.(party));
        // next-intl is mocked to hand back the key.
        expect(captured.sheets.at(-1)).toMatchObject({ open: true, prefillTitle: 'suggestedSessions.GRADUATION.title', secondaryPrefillTitle: undefined });
    });
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run components/schedule/ScheduleScreen.test.tsx`
Expected: FAIL — the sheet gets no `prefillTitle`.

- [ ] **Step 3: The form and the sheet take a plain prefill**

In `ScheduleEditorForm.tsx`, in the props interface after `secondaryPrefillTitle?: string;`, add:

```ts
    // A suggested item's title (lib/sessionManagement getScheduleSuggestions); saved as an ordinary item.
    prefillTitle?: string;
```

Add `prefillTitle,` to the destructured props after `secondaryPrefillTitle,`, and replace

```ts
    const initialTitle = editingSession?.title ?? secondaryPrefillTitle ?? '';
```

with

```ts
    const initialTitle = editingSession?.title ?? secondaryPrefillTitle ?? prefillTitle ?? '';
```

In `ScheduleEditorSheet.tsx`, add `prefillTitle?: string;` after `secondaryPrefillTitle?: string;` in the props interface and `prefillTitle,` to the destructuring; replace

```ts
    const sheetKey = `${editingSession?.id ?? 'new'}-${defaultStartAt}-${secondaryPrefillTitle ?? ''}`;
```

with

```ts
    const sheetKey = `${editingSession?.id ?? 'new'}-${defaultStartAt}-${secondaryPrefillTitle ?? ''}-${prefillTitle ?? ''}`;
```

and add `prefillTitle={prefillTitle}` after `secondaryPrefillTitle={secondaryPrefillTitle}` on `<ScheduleEditorForm>`.

- [ ] **Step 4: The screen**

In `components/schedule/ScheduleScreen.tsx`:

Replace `import type { ManagedSessionDefinition } from '@/lib/sessionManagement';` with `import type { ManagedSessionDefinition, ScheduleRowDefinition } from '@/lib/sessionManagement';`.

After `const [creatingSecondary, setCreatingSecondary] = useState(false);` add:

```ts
    const [prefillTitle, setPrefillTitle] = useState<string | undefined>(undefined);
```

In `openCreateEditor`, `beginEditSession` and `closeEditor`, add `setPrefillTitle(undefined);` beside each `setCreatingSecondary(false);`.

Replace

```ts
    function openCreateManagedEditor(definition: ManagedSessionDefinition) {
        if (!canAddSession || !definition.canCreate) return;
        if (definition.role === 'main') {
            void restoreMainSession(definition);
            return;
        }
        const secondarySessionTitleKey = activeEvent ? getCreateEventCatalogEntry(activeEvent.eventType)?.secondarySessionTitleKey : undefined;
        setDeleteError(null);
        setEditingSessionId(null);
        setCreatingSecondary(Boolean(secondarySessionTitleKey && definition.role === 'secondary'));
        setEditorOpen(true);
    }
```

with

```ts
    function openCreateManagedEditor(definition: ScheduleRowDefinition) {
        if (!canAddSession || !definition.canCreate) return;
        if (definition.role === 'main') {
            void restoreMainSession(definition);
            return;
        }
        const secondarySessionTitleKey = activeEvent ? getCreateEventCatalogEntry(activeEvent.eventType)?.secondarySessionTitleKey : undefined;
        setDeleteError(null);
        setEditingSessionId(null);
        setCreatingSecondary(Boolean(secondarySessionTitleKey && definition.role === 'secondary'));
        // A suggestion is an ordinary item with its title filled in.
        setPrefillTitle(definition.role === 'suggestion' ? tCreateEvent(definition.defaultTitleKey) : undefined);
        setEditorOpen(true);
    }
```

(`restoreMainSession` keeps its `ManagedSessionDefinition` parameter; inside the `role === 'main'` branch TypeScript narrows `definition` to it.)

On `<ScheduleEditorSheet>`, after `secondaryPrefillTitle={creatingSecondary ? secondarySessionTitle : undefined}` add:

```tsx
                    prefillTitle={prefillTitle}
```

- [ ] **Step 5: Run the tests and the type check**

Run: `npx vitest run components/schedule "app/(main)/(app)/(event)/events/[eventId]/manage/SettingsTab.test.tsx" "app/(main)/(app)/(event)/events/[eventId]/tools/schedule"`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add components/schedule/ScheduleScreen.tsx components/schedule/ScheduleScreen.test.tsx "app/(main)/(app)/(event)/events/[eventId]/tools/schedule/components/ScheduleEditorSheet.tsx" "app/(main)/(app)/(event)/events/[eventId]/tools/schedule/components/ScheduleEditorForm.tsx"
git commit -m "KAN-301: the Party suggestion opens the item editor with its title filled in

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The then & now prompt (KAN-303)

**Files:**
- Modify: `lib/feedLayout.ts`, `lib/feedLayout.test.ts`
- Create: `hooks/useFeedStarterPrompt.ts`, `hooks/useFeedStarterPrompt.test.tsx`
- Modify: `hooks/useFeedLayout.ts`, `hooks/useFeedThemeSwitch.ts`, `hooks/useFeedEditMode.ts`
- Modify: `messages/en.json`, `messages/el.json`

A new event has no saved layout, so the feed draws `defaultFeedLayout()` in the browser. For GRADUATION that layout also holds a shown `feedPrompt` block with the approved text, in the viewer's app language. The first time the host saves the feed, the prompt is saved with the rest, in the host's language at that moment, and from then on the host edits or hides it like any prompt. The text comes from the messages, so `lib/` takes it as an argument instead of an event type.

- [ ] **Step 1: Write the failing tests**

In `lib/feedLayout.test.ts`, append:

```ts
describe('the starter prompt (KAN-303)', () => {
    const prompt = (layout: ReturnType<typeof defaultFeedLayout>) => layout.sections.find((section) => section.type === 'feedPrompt');

    it('adds a shown prompt with the text after the four feed blocks, only when given one', () => {
        expect(prompt(defaultFeedLayout())).toBeUndefined();
        const layout = defaultFeedLayout('Then & now: post an old photo with the graduate');
        expect(layout.sections.map((section) => section.type)).toEqual(['feedCover', 'feedDetails', 'feedDescription', 'feedRsvp', 'feedPrompt']);
        expect(prompt(layout)).toMatchObject({ id: 'feed-feedPrompt', visible: true, data: { text: 'Then & now: post an old photo with the graduate' } });
        expect(invitationDocumentSchema.safeParse(layout).success).toBe(true);
    });

    it('draws the prompt in Feed mode', () => {
        expect(feedFrame(defaultFeedLayout('Then & now'), { ended: false }).feed.map((section) => section.type)).toEqual(['feedPrompt']);
    });

    it('is the stand-in for an event with no saved layout, never over a saved one', () => {
        expect(prompt(readFeedLayout(null, null, 'Then & now').document)).toBeDefined();
        const saved: FeedLayoutDto = { themeSlug: null, revision: 3, document: defaultFeedLayout(), design: null, imageUrls: {}, updatedAt: '' };
        expect(prompt(readFeedLayout(saved, null, 'Then & now').document)).toBeUndefined();
    });
});
```

Create `hooks/useFeedStarterPrompt.test.tsx`:

```tsx
import { renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { useFeedStarterPrompt } from '@/hooks/useFeedStarterPrompt';
import el from '@/messages/el.json';
import en from '@/messages/en.json';

const wrap =
    (locale: 'en' | 'el') =>
    ({ children }: { children: ReactNode }) => (
        <NextIntlClientProvider locale={locale} messages={locale === 'en' ? en : el}>
            {children}
        </NextIntlClientProvider>
    );

describe('useFeedStarterPrompt', () => {
    it("gives a graduation the then & now prompt in the viewer's language", () => {
        expect(renderHook(() => useFeedStarterPrompt('GRADUATION'), { wrapper: wrap('en') }).result.current).toBe(
            'Then & now: post an old photo with the graduate',
        );
        expect(renderHook(() => useFeedStarterPrompt('GRADUATION'), { wrapper: wrap('el') }).result.current).toBe(
            'Τότε και τώρα: μια παλιά σας φωτογραφία μαζί',
        );
    });

    it('gives other types none', () => {
        expect(renderHook(() => useFeedStarterPrompt('WEDDING'), { wrapper: wrap('en') }).result.current).toBeUndefined();
        expect(renderHook(() => useFeedStarterPrompt(undefined), { wrapper: wrap('en') }).result.current).toBeUndefined();
    });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run lib/feedLayout.test.ts hooks/useFeedStarterPrompt.test.tsx`
Expected: FAIL — `defaultFeedLayout` ignores its argument; the hook file does not exist.

- [ ] **Step 3: The layout takes a prompt**

In `lib/feedLayout.ts`:

Add `FEED_PROMPT_MAX_LENGTH,` to the import from `@/lib/invitation/sections` (keep the names sorted as they are).

Replace

```ts
// What an event with no saved layout draws: today's feed. Each block draws only when it has
// something to show (a description, an RSVP to ask for).
export function defaultFeedLayout(): InvitationDocument {
    return { schemaVersion: INVITATION_SCHEMA_VERSION, themeId: WALL_THEME_ID, overrides: {}, sections: FEED_SECTION_TYPES.map(newFeedBlock) };
}
```

with

```ts
// What an event with no saved layout draws: today's feed. Each block draws only when it has
// something to show (a description, an RSVP to ask for). promptText: the photo prompt a new event of
// some types starts with (hooks/useFeedStarterPrompt), shown in Feed mode until the host changes it.
export function defaultFeedLayout(promptText?: string): InvitationDocument {
    const sections = FEED_SECTION_TYPES.map(newFeedBlock);
    if (promptText) sections.push(starterPrompt(promptText));
    return { schemaVersion: INVITATION_SCHEMA_VERSION, themeId: WALL_THEME_ID, overrides: {}, sections };
}

// Built here rather than with lib/feedSections' createFeedModeSection, which imports this file.
function starterPrompt(text: string): InvitationSection {
    return {
        id: 'feed-feedPrompt',
        type: 'feedPrompt',
        name: 'feedPrompt',
        visible: true,
        locked: false,
        data: { text: text.slice(0, FEED_PROMPT_MAX_LENGTH) },
        textStyles: {},
        elements: [],
        style: PLAIN_FEED_STYLE,
    } as InvitationSection;
}
```

Replace the `readFeedLayout` signature and its two `defaultFeedLayout()` calls:

```ts
export function readFeedLayout(dto: FeedLayoutDto | null, wallTheme: EventThemeDto | null): FeedLayoutView {
```

with

```ts
// promptText: see defaultFeedLayout; it only shows while nothing is saved.
export function readFeedLayout(dto: FeedLayoutDto | null, wallTheme: EventThemeDto | null, promptText?: string): FeedLayoutView {
```

and, inside it, both `document: defaultFeedLayout(),` with `document: defaultFeedLayout(promptText),`.

`planFeedThemeSwitch` keeps calling `defaultFeedLayout()` with no prompt: it only takes the four feed blocks from it; the host's prompt reaches the switched layout through `current`.

- [ ] **Step 4: The hook**

Create `hooks/useFeedStarterPrompt.ts`:

```ts
'use client';

import { useTranslations } from 'next-intl';

import type { EventTypeConvention } from '@/lib/api/types';

// The types whose new feed starts with a photo prompt (spec 2026-11-26-graduation-event-type-design.md §6).
const STARTER_PROMPT_TYPES: ReadonlySet<EventTypeConvention> = new Set(['GRADUATION']);

// The prompt a new feed of this type starts with, in the viewer's language; undefined for other types.
export function useFeedStarterPrompt(eventType: EventTypeConvention | undefined): string | undefined {
    const t = useTranslations('FeedSections.prompt');
    return eventType && STARTER_PROMPT_TYPES.has(eventType) ? t('thenAndNow') : undefined;
}
```

- [ ] **Step 5: The copy**

`messages/en.json` — replace

```json
            "question": "What should guests photograph?",
            "placeholder": "Show us your best dance move"
        },
```

with

```json
            "question": "What should guests photograph?",
            "placeholder": "Show us your best dance move",
            "thenAndNow": "Then & now: post an old photo with the graduate"
        },
```

`messages/el.json` — replace

```json
            "question": "Τι να φωτογραφίσουν οι καλεσμένοι;",
            "placeholder": "Δείξτε μας την καλύτερη χορευτική σας κίνηση"
        },
```

with

```json
            "question": "Τι να φωτογραφίσουν οι καλεσμένοι;",
            "placeholder": "Δείξτε μας την καλύτερη χορευτική σας κίνηση",
            "thenAndNow": "Τότε και τώρα: μια παλιά σας φωτογραφία μαζί"
        },
```

- [ ] **Step 6: The feed hooks pass it**

`hooks/useFeedLayout.ts`: add the import `import { useFeedStarterPrompt } from '@/hooks/useFeedStarterPrompt';` and `import type { EventTypeConvention } from '@/lib/api/types';` (merge into the existing `@/lib/api/types` import). Replace

```ts
export function useFeedLayout(event: Pick<EventDetailResponseDto, 'id' | 'theme'>, { enabled }: { enabled: boolean }) {
```

with

```ts
export function useFeedLayout(
    event: Pick<EventDetailResponseDto, 'id' | 'theme'> & { eventType?: EventTypeConvention },
    { enabled }: { enabled: boolean },
) {
```

and

```ts
    const view = useMemo(() => readFeedLayout(saved, event.theme), [saved, event.theme]);
```

with

```ts
    const promptText = useFeedStarterPrompt(event.eventType);
    const view = useMemo(() => readFeedLayout(saved, event.theme, promptText), [saved, event.theme, promptText]);
```

`hooks/useFeedThemeSwitch.ts`: add `import { useFeedStarterPrompt } from '@/hooks/useFeedStarterPrompt';`; at the top of the hook body add `const promptText = useFeedStarterPrompt(event.eventType);`; replace

```ts
        return readFeedLayout(dto, event.theme);
    }, [event.id, event.theme, queryClient]);
```

with

```ts
        return readFeedLayout(dto, event.theme, promptText);
    }, [event.id, event.theme, promptText, queryClient]);
```

`hooks/useFeedEditMode.ts`: in its signature replace `Pick<EventDetailResponseDto, 'id' | 'theme' | 'status' | 'modules'>` with `Pick<EventDetailResponseDto, 'id' | 'theme' | 'status' | 'modules' | 'eventType'>`, so the edit mode reads the same stand-in the feed draws.

`useFeedEditSession`, `useFeedTop` and `useThemeGrid` already pass an event with `eventType`; `lib/feedModuleBlocks.ts` keeps `readFeedLayout(dto, null)`: the prompt is not a module block.

- [ ] **Step 7: Run the tests and the type check**

Run: `npx vitest run lib/feedLayout.test.ts hooks/useFeedStarterPrompt.test.tsx hooks/useFeedLayout.test.tsx hooks/useFeedThemeSwitch.test.tsx hooks/useFeedEditSession.test.tsx hooks/useFeedTop.test.tsx lib/feedThemes.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: clean. A caller of `useFeedEditMode` whose event lacks `eventType` is an error here; pass the event it already has (they are `EventDetailResponseDto`s).

- [ ] **Step 8: Commit**

```bash
git add lib/feedLayout.ts lib/feedLayout.test.ts hooks/useFeedStarterPrompt.ts hooks/useFeedStarterPrompt.test.tsx hooks/useFeedLayout.ts hooks/useFeedThemeSwitch.ts hooks/useFeedEditMode.ts messages/en.json messages/el.json
git commit -m "KAN-303: a new graduation feed starts with the then & now photo prompt

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Full check and the screens

- [ ] **Step 1: Every check**

Run: `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`
Expected: all clean. If `vitest run` shows the known save-my-date timeouts, re-run those files alone; they must pass there.

- [ ] **Step 2: Look at it**

The dev server shares `.next` with the main checkout: open it only with `preview_start {url: "http://localhost:3000/"}`, never by name. Signed-in screens need the local test login (ask the owner) and the backend branch running locally with GRADUATION enabled in admin and a plan duplicated from BIRTHDAY.

On a mobile width (375 px), then desktop:

1. Create event: the Graduation card shows with the sunset photo; the details step labels read Event name, Ceremony date, Ceremony location (Greek: Όνομα εκδήλωσης, Ημερομηνία ορκωμοσίας, Τοποθεσία ορκωμοσίας).
2. Schedule → Edit: rows Ceremony (filled), Dinner and Party, each empty one saying "Not added yet."; + on Party opens the editor titled Party; save it; the Party suggestion row is gone and the saved Party is an ordinary row.
3. A wedding's schedule shows Ceremony and Venue with the old wording.
4. The new graduation's feed shows the then & now prompt under the stories; edit it as host, save, reload: the edited text stays.

- [ ] **Step 3: Push and open the PR into staging**

```bash
git push -u origin claude/kan-301-graduation-frontend
gh pr create --base staging --title "KAN-301: Graduation event type, schedule rows and then & now prompt" --body-file <file>
```

The body: what changes (type tables, schedule rows and suggestion, starter prompt), that it needs guestwall-be `claude/kan-300-graduation-backend` deployed first and the type enabled in admin to try it on staging, the spec and plan docs it carries, the ticket key KAN-301 only (naming KAN-303 in the body would move it too; its commits carry its key), and ends with:

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```
