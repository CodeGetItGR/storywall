# Customizable Feed, Part 4: Edit Mode (KAN-245) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A host or co-host taps **Edit** on the feed's cover and changes the feed's layout in place: hide blocks, reorder and delete Save my date blocks, add new ones, type their text, and change block styles. Nothing is stored until **Save**.

**Architecture:** Edit mode is a separate, lazily loaded top of the feed (`FeedEditTop`). It draws the same `FeedTopFrame` as the read-only feed and wraps every block in tools. It edits a copy of the saved layout in the old Save my date editor's zustand store (`createInvitationEditorStore`). Save sends one `PUT /api/events/{id}/feed-layout` with the revision that edit mode opened on. Pure layout rules live in `lib/feedEditing.ts`. Session, actions and sheet state live in small hooks. The components only draw.

**Tech Stack:** Next.js App Router, React 19, TanStack Query v5, zustand vanilla + immer (old editor store), dnd-kit, next-intl, vitest + Testing Library, Storybook.

**Spec:** [docs/superpowers/specs/2026-11-21-customizable-feed-design.md](../specs/2026-11-21-customizable-feed-design.md) (on `claude/kan-242-customizable-feed`). The decisions below, approved by the owner on 2026-11-22, override the spec's "saves right away".

**Branch:** `claude/kan-245-feed-edit-mode`, stacked on `claude/kan-244-feed-layout` (tip `0dab0bac`). Worktree: `.claude/worktrees/kan-245-feed-edit-mode`. Put `KAN-245` in every commit message.

---

## Approved behaviour (do not change without asking the owner)

- **Who:** only hosts and co-hosts (`isHost` from the feed page, `activeMember.role === 'HOST'`). It also needs the `FEED_EDITOR_LAUNCHED` flag (`useFeedEditorEnabled()`), a writable event (`isEventWritable(event.status)`) and a loaded layout query (never edit the default stand-in while the saved one is loading).
- **Entry:** an **Edit** pill in the cover's top corner.
- **While editing:** the cover shows **Cancel** and **Save** pills instead. Changes wait for Save.
- **Save:**
  - Sends `{ revision, themeSlug, document }` and shows "Saving…".
  - On success, it leaves edit mode. With no changes, Save just leaves.
- **Stale save (409 `5208`):** the old editor's conflict dialog. Reload fetches the layout again and leaves edit mode.
- **Any other save failure:** stay in edit mode and show `FeedEditor.saveFailed` under the pills.
- **Leaving with unsaved changes asks first,** with the old editor's leave dialog. This covers:
  - Cancel;
  - phone Back;
  - in-app link taps;
  - the browser's own reload/close prompt (`beforeunload`).

  With no changes, nothing asks.
- **No undo or redo.**
- **Blocks:**
  - The four feed blocks (`feedCover`, `feedDetails`, `feedDescription`, `feedRsvp`) can only be hidden. The cover can't be hidden.
  - Save my date blocks can be hidden, moved and deleted. Delete asks first, with the old delete dialog.
  - Only middle blocks (the description and Save my date blocks) get drag and up/down. Cover, details and RSVP stay in place.
- **Add:**
  - An **Add section** row closes the middle. It offers `addableSectionTypes(document, eventType, 'host')` ∩ `PAID_FEED_SECTION_TYPES` and appends the new block at the end of the middle.
  - Without the `save_my_date` module the row shows a lock and "Needs Save my date". For a host who can buy, a tap opens Billing, asking first if there are unsaved changes. A co-host who can't buy sees the lock line only.
- **Text:** Save my date text is typed in place with the old editor's inline text toolbar (`InlineTextEditing`). Feed block content is inert while editing.
- **Pencil (settings):**
  - A Save my date block opens its settings sheet (`SectionSettingsPanel`) without the `gallery` and `follow` groups. There are no feed photo uploads yet; the uploader rejects.
  - A feed block opens a sheet with its event rows, which use the Settings page's labels and editors and save the event at once:
    - cover → cover photo and title;
    - details → date and location;
    - description → description;
    - RSVP → none.
  - The sheet also holds the block's style groups (background), when the theme offers any.
  - A block with nothing to set has no pencil.
  - Mobile gets a bottom sheet; desktop (≥ `lg`, 64rem) gets a panel fixed at the right.
- **In edit mode:**
  - The middle is always open (no Invitation row).
  - Every block is listed, hidden ones dimmed with the "Hidden" badge, after the event too.
  - RSVP and an empty description still draw, as a placeholder with the block's name.

## Approved wording

New keys (en / el):

| Key | en | el |
| --- | --- | --- |
| `FeedEditor.edit` | Edit | Επεξεργασία |
| `FeedEditor.saveFailed` | Couldn't save your changes. Please try again. | Δεν ήταν δυνατή η αποθήκευση των αλλαγών. Δοκιμάστε ξανά. |
| `InvitationEditor.sectionNames.feedCover` | Cover | Εξώφυλλο |
| `InvitationEditor.sectionNames.feedDetails` | Details | Λεπτομέρειες |
| `InvitationEditor.sectionNames.feedDescription` | Description | Περιγραφή |
| `InvitationEditor.sectionNames.feedRsvp` | RSVP | RSVP |

Reused exactly as they are, with no edits:
- `InvitationEditor`: `cancel`, `save`, `saving`, `leaveTitle`, `leaveBody`, `leave`, `stay`, `conflictTitle`, `conflictBody`, `conflictReload`;
- all of `InvitationEditor.sections.*` and `InvitationEditor.sectionSettings.*`;
- `ManagePage.settings.theme.locked`;
- the Settings page labels from `useSettingsPreview`.

Do not add or change any other user-facing text. If a step seems to need new wording, stop and ask the owner.

---

## File map

| File | Responsibility |
| --- | --- |
| `messages/en.json`, `messages/el.json` | The six new keys |
| `lib/feedEditing.ts` (+ test) | Pure edit rules: the edit frame, which block may hide/move/delete, moves and reorder among middle blocks, append, addable types, event parts per block, settings group filter |
| `lib/leaveGuard.ts` (+ test) | `inAppHref(click, location)`: the same-origin page a link click would open, or null |
| `hooks/useInAppLeaveGuard.ts` (+ test) | Document capture-phase click guard that hands in-app link taps to a callback |
| `components/saveMyDate/editor/sections/SectionMenu.tsx` (+ test) | `onDelete` becomes optional: no Delete item without it |
| `hooks/useFeedLayout.ts` | Adds `isLoaded` |
| `hooks/useFeedTop.ts` (+ test) | Optional `editing` document: draws it with the edit frame, never folds |
| `components/feed/layout/FeedLookTop.tsx` | Exports `feedLookParts(view)` so edit mode can reuse it |
| `components/feed/layout/FeedTopFrame.tsx` | `afterMiddle` slot for the Add section row |
| `hooks/useFeedEditMode.ts` (+ test) | Whether the Edit pill shows, and whether edit mode is on |
| `hooks/useFeedEditSession.ts` (+ test) | One edit session: store, dirty, save, conflict, failure, leave dialog, leave guards |
| `hooks/useFeedBlockActions.ts` (+ test) | Hide, move, reorder, delete confirm, add, lock → Billing |
| `hooks/useFeedBlockHandlers.ts` | Stable per-block callbacks for the tools |
| `hooks/useFeedBlockSheet.ts` (+ test) | Which block's pencil sheet is open, its groups, event parts and settings scope |
| `components/feed/edit/FeedEditPill.tsx` | The Edit pill |
| `components/feed/edit/FeedEditPills.tsx` | Cancel + Save pills and the save error line |
| `components/feed/edit/FeedBlockPlaceholder.tsx` | An empty block's name while editing |
| `components/feed/edit/FeedBlockTools.tsx` | Eye, pencil, drag, menu on one block |
| `components/feed/edit/FeedEditBlock.tsx` | One block in edit mode: sortable frame, dimming, Hidden badge, tools, corner slot |
| `components/feed/edit/FeedAddSectionRow.tsx` | Add section row or its lock |
| `components/feed/edit/FeedBlockSheet.tsx` | The pencil's sheet (mobile) or side panel (desktop) |
| `components/feed/edit/FeedEditTop.tsx` | Edit mode's top of the feed: composes all of the above |
| `components/feed/edit/LazyFeedEditTop.tsx` | `next/dynamic` wrapper, so the plain feed never loads edit code |
| `components/feed/layout/FeedCoverBlock.tsx` | `corner` slot for the Edit pill |
| `app/(main)/(app)/(event)/events/[eventId]/feed/FeedPageContent.tsx` (+ test) | Switches between `FeedTop` and `LazyFeedEditTop` |
| `components/feed/edit/*.stories.tsx` | Visual stories |

---

### Task 0: Worktree setup

**Files:** none

- [ ] **Step 1: Link node_modules to the main checkout**

The lockfile is unchanged from the main checkout, so use a junction (see memory "Worktree node_modules junction").

```powershell
cd C:\Users\User\WebstormProjects\storywall\.claude\worktrees\kan-245-feed-edit-mode
New-Item -ItemType Junction -Path node_modules -Target C:\Users\User\WebstormProjects\storywall\node_modules
```

- [ ] **Step 2: Confirm the tree is clean and on the right branch**

Run: `git status --short; git log --oneline -1`
Expected: no changes; the plan commit on top of `0dab0bac`.

---

### Task 1: Wording

**Files:**
- Modify: `messages/en.json` (`FeedLayout` block near line 6669; `InvitationEditor.sectionNames` near line 10568)
- Modify: `messages/el.json` (same blocks)

- [ ] **Step 1: Add the `FeedEditor` namespace right after `FeedLayout` in `messages/en.json`**

```json
    "FeedLayout": {
        "invitation": "Invitation"
    },
    "FeedEditor": {
        "edit": "Edit",
        "saveFailed": "Couldn't save your changes. Please try again."
    },
```

- [ ] **Step 2: Add the same in `messages/el.json`**

```json
    "FeedLayout": {
        "invitation": "Πρόσκληση"
    },
    "FeedEditor": {
        "edit": "Επεξεργασία",
        "saveFailed": "Δεν ήταν δυνατή η αποθήκευση των αλλαγών. Δοκιμάστε ξανά."
    },
```

- [ ] **Step 3: Add the four block names at the end of `InvitationEditor.sectionNames` in both files**

en:
```json
            "feedCover": "Cover",
            "feedDetails": "Details",
            "feedDescription": "Description",
            "feedRsvp": "RSVP"
```
el:
```json
            "feedCover": "Εξώφυλλο",
            "feedDetails": "Λεπτομέρειες",
            "feedDescription": "Περιγραφή",
            "feedRsvp": "RSVP"
```
(Add a comma after the entry that used to be last.)

- [ ] **Step 4: Check both files parse and hold the keys**

Run:
```bash
node -e "for (const l of ['en','el']) { const m = require('./messages/' + l + '.json'); const n = m.InvitationEditor.sectionNames; console.log(l, m.FeedEditor.edit, '|', m.FeedEditor.saveFailed, '|', n.feedCover, n.feedDetails, n.feedDescription, n.feedRsvp); }"
```
Expected: both lines print with the approved text.

- [ ] **Step 5: Run the message tests**

Run: `npx vitest run messages`
Expected: PASS, or "No test files found". That is fine too: the en/el parity check also runs in the full suite in Task 13.

- [ ] **Step 6: Commit**

```bash
git add messages/en.json messages/el.json
git commit -m "KAN-245: wording for feed edit mode"
```

---

### Task 2: Edit rules (`lib/feedEditing.ts`)

**Files:**
- Create: `lib/feedEditing.ts`
- Test: `lib/feedEditing.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { produce } from 'immer';
import { describe, expect, it } from 'vitest';

import {
    addableFeedSectionTypes,
    appendFeedSection,
    canDeleteFeedBlock,
    canHideFeedBlock,
    canMoveFeedBlock,
    deleteFeedBlock,
    feedBlockControls,
    feedBlockParts,
    feedEditFrame,
    feedSettingsGroups,
    isMiddleBlock,
    moveFeedBlock,
    noFeedUploads,
    reorderFeedBlocks,
    setFeedBlockVisible,
} from '@/lib/feedEditing';
import { defaultFeedLayout } from '@/lib/feedLayout';
import type { InvitationDocument } from '@/lib/invitation/document';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';

const dressCode = { ...(SAMPLE_SECTIONS.dressCode as InvitationSection), id: 'dress' };
const faq = { ...(SAMPLE_SECTIONS.faq as InvitationSection), id: 'faq' };

// cover, details, description, rsvp, then the Save my date blocks the host added.
function layout(...extra: InvitationSection[]): InvitationDocument {
    const base = defaultFeedLayout();
    return { ...base, sections: [...base.sections, ...extra] };
}

const ids = (document: InvitationDocument) => document.sections.map((section) => section.id);

describe('feedEditFrame', () => {
    it('lists every block, hidden ones too', () => {
        const hidden = produce(layout(dressCode), (draft) => {
            draft.sections[1].visible = false;
            draft.sections[4].visible = false;
        });
        const frame = feedEditFrame(hidden);
        expect(frame.cover.type).toBe('feedCover');
        expect(frame.details?.type).toBe('feedDetails');
        expect(frame.middle.map((section) => section.id)).toEqual(['feed-feedDescription', 'dress']);
        expect(frame.rsvp?.type).toBe('feedRsvp');
    });
});

describe('which block may do what', () => {
    const [cover, details, description, rsvp] = defaultFeedLayout().sections;

    it('hides every block but the cover', () => {
        expect(canHideFeedBlock(cover)).toBe(false);
        expect([details, description, rsvp, dressCode].every(canHideFeedBlock)).toBe(true);
    });

    it('deletes only Save my date blocks', () => {
        expect([cover, details, description, rsvp].some(canDeleteFeedBlock)).toBe(false);
        expect(canDeleteFeedBlock(dressCode)).toBe(true);
    });

    it('moves only middle blocks, and only among themselves', () => {
        const sections = layout(dressCode).sections;
        expect(isMiddleBlock(description)).toBe(true);
        expect(isMiddleBlock(rsvp)).toBe(false);
        expect(canMoveFeedBlock(sections, 'feed-feedDescription', -1)).toBe(false);
        expect(canMoveFeedBlock(sections, 'feed-feedDescription', 1)).toBe(true);
        expect(canMoveFeedBlock(sections, 'dress', 1)).toBe(false);
        expect(canMoveFeedBlock(sections, 'feed-feedRsvp', -1)).toBe(false);
    });

    it('sums it up per block', () => {
        const sections = layout(dressCode).sections;
        expect(feedBlockControls(sections, cover)).toEqual({ canHide: false, canDelete: false, movable: false, canMoveUp: false, canMoveDown: false });
        expect(feedBlockControls(sections, dressCode)).toEqual({ canHide: true, canDelete: true, movable: true, canMoveUp: true, canMoveDown: false });
    });
});

describe('edits', () => {
    it('moves a middle block past its middle neighbour and leaves the frame in place', () => {
        const next = produce(layout(dressCode, faq), moveFeedBlock('faq', -1));
        expect(ids(next)).toEqual(['feed-feedCover', 'feed-feedDetails', 'feed-feedDescription', 'feed-feedRsvp', 'faq', 'dress']);
    });

    it('drags among middle blocks only', () => {
        const next = produce(layout(dressCode, faq), reorderFeedBlocks('faq', 'feed-feedDescription'));
        expect(next.sections.filter(isMiddleBlock).map((section) => section.id)).toEqual(['faq', 'feed-feedDescription', 'dress']);
        expect(next.sections[0].id).toBe('feed-feedCover');
        expect(next.sections[1].id).toBe('feed-feedDetails');
    });

    it('ignores a drop on a block outside the middle', () => {
        const start = layout(dressCode);
        expect(produce(start, reorderFeedBlocks('dress', 'feed-feedRsvp'))).toBe(start);
    });

    it('never hides the cover', () => {
        const start = layout();
        expect(produce(start, setFeedBlockVisible('feed-feedCover', false))).toBe(start);
        expect(produce(start, setFeedBlockVisible('feed-feedRsvp', false)).sections[3].visible).toBe(false);
    });

    it('never deletes a feed block', () => {
        const start = layout(dressCode);
        expect(produce(start, deleteFeedBlock('feed-feedDescription'))).toBe(start);
        expect(ids(produce(start, deleteFeedBlock('dress')))).not.toContain('dress');
    });

    it('appends after the last middle block', () => {
        const start = produce(layout(dressCode), (draft) => {
            // RSVP last, as a saved layout can order it.
            const [rsvp] = draft.sections.splice(3, 1);
            draft.sections.push(rsvp);
        });
        const next = produce(start, appendFeedSection(faq));
        expect(ids(next)).toEqual(['feed-feedCover', 'feed-feedDetails', 'feed-feedDescription', 'dress', 'faq', 'feed-feedRsvp']);
    });
});

describe('what the add row offers', () => {
    it('offers only Save my date blocks a feed may hold', () => {
        const types = addableFeedSectionTypes(layout(), 'WEDDING');
        expect(types.length).toBeGreaterThan(0);
        expect(types).toContain('dressCode');
        expect(types).not.toContain('date');
        expect(types).not.toContain('rsvp');
    });
});

describe('the pencil sheet', () => {
    it('maps each feed block to its event parts, among those the event has', () => {
        expect(feedBlockParts('feedCover', ['cover', 'title', 'date', 'location', 'description'])).toEqual(['cover', 'title']);
        expect(feedBlockParts('feedDetails', ['cover', 'title', 'description'])).toEqual([]);
        expect(feedBlockParts('feedDetails', ['cover', 'title', 'date', 'location', 'description'])).toEqual(['date', 'location']);
        expect(feedBlockParts('feedDescription', ['description'])).toEqual(['description']);
        expect(feedBlockParts('feedRsvp', ['cover', 'title', 'date', 'location', 'description'])).toEqual([]);
        expect(feedBlockParts('dressCode', ['cover'])).toEqual([]);
    });

    it('leaves out photo uploads and following the event', () => {
        expect(feedSettingsGroups(['follow', 'gallery', 'background', 'dressCode'])).toEqual(['background', 'dressCode']);
    });

    it('refuses uploads', async () => {
        await expect(noFeedUploads(new Blob())).rejects.toThrow();
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run lib/feedEditing.test.ts`
Expected: FAIL, "Failed to resolve import '@/lib/feedEditing'".

- [ ] **Step 3: Write the implementation**

```ts
import type { Draft } from 'immer';

import { type FeedFrame, feedFrame, PAID_FEED_SECTION_TYPES } from '@/lib/feedLayout';
import { type InvitationDocument, MAX_SECTIONS } from '@/lib/invitation/document';
import type { ImageUploader } from '@/lib/invitation/editorUploads';
import type { NewSectionType } from '@/lib/invitation/newSection';
import { deleteSection, type MoveDirection, setSectionVisible } from '@/lib/invitation/sectionActions';
import { addableSectionTypes } from '@/lib/invitation/sectionRules';
import { type InvitationSection, isFeedSectionType, type SectionType } from '@/lib/invitation/sections';
import type { SettingsGroup } from '@/lib/invitation/sectionSettings';
import type { SettingsPart } from '@/lib/settingsPreview';

// Edit mode on the feed (KAN-245). The four feed blocks keep their places and can only be hidden
// (the cover not even that); the host orders, hides and deletes the middle's Save my date blocks.
// Every edit is an Immer recipe for the old editor's store.

type DocumentDraft = Draft<InvitationDocument>;
type Block = Pick<InvitationSection, 'id' | 'type' | 'locked'>;

// The description and every Save my date block: what the host orders.
export function isMiddleBlock(section: Pick<InvitationSection, 'type'>): boolean {
    return section.type === 'feedDescription' || !isFeedSectionType(section.type);
}

// Edit mode lists every block, hidden ones too, and the middle is never dropped after the event.
export function feedEditFrame(layout: InvitationDocument): FeedFrame {
    const find = (type: SectionType) => layout.sections.find((section) => section.type === type) ?? null;
    return {
        cover: feedFrame(layout, { ended: false }).cover,
        details: find('feedDetails'),
        middle: layout.sections.filter(isMiddleBlock),
        rsvp: find('feedRsvp'),
    };
}

export function canHideFeedBlock(section: Block): boolean {
    return section.type !== 'feedCover' && !section.locked;
}

export function canDeleteFeedBlock(section: Block): boolean {
    return !isFeedSectionType(section.type) && !section.locked;
}

function middleIds(sections: readonly Block[]): string[] {
    return sections.filter(isMiddleBlock).map((section) => section.id);
}

export function canMoveFeedBlock(sections: readonly Block[], id: string, direction: MoveDirection): boolean {
    const order = middleIds(sections);
    const index = order.indexOf(id);
    return index !== -1 && order[index + direction] !== undefined;
}

export type FeedBlockControls = { canHide: boolean; canDelete: boolean; movable: boolean; canMoveUp: boolean; canMoveDown: boolean };

export function feedBlockControls(sections: readonly Block[], section: Block): FeedBlockControls {
    const movable = isMiddleBlock(section);
    return {
        canHide: canHideFeedBlock(section),
        canDelete: canDeleteFeedBlock(section),
        movable,
        canMoveUp: movable && canMoveFeedBlock(sections, section.id, -1),
        canMoveDown: movable && canMoveFeedBlock(sections, section.id, 1),
    };
}

// The dragged middle block takes the place of the one it was dropped on. The frame's blocks stay
// where they are, so only the middle's own slots are rewritten.
export function reorderFeedBlocks(activeId: string, overId: string) {
    return (draft: DocumentDraft) => {
        const slots = draft.sections.flatMap((section, index) => (isMiddleBlock(section) ? [index] : []));
        const middle = slots.map((slot) => draft.sections[slot]);
        const from = middle.findIndex((section) => section.id === activeId);
        const to = middle.findIndex((section) => section.id === overId);
        if (from === -1 || to === -1 || from === to) return;
        const [moved] = middle.splice(from, 1);
        middle.splice(to, 0, moved);
        slots.forEach((slot, place) => {
            draft.sections[slot] = middle[place];
        });
    };
}

export function moveFeedBlock(id: string, direction: MoveDirection) {
    return (draft: DocumentDraft) => {
        const order = middleIds(draft.sections);
        const index = order.indexOf(id);
        const target = index === -1 ? undefined : order[index + direction];
        if (target !== undefined) reorderFeedBlocks(id, target)(draft);
    };
}

export function setFeedBlockVisible(id: string, visible: boolean) {
    return (draft: DocumentDraft) => {
        const section = draft.sections.find((item) => item.id === id);
        if (section && canHideFeedBlock(section)) setSectionVisible(id, visible)(draft);
    };
}

export function deleteFeedBlock(id: string) {
    return (draft: DocumentDraft) => {
        const section = draft.sections.find((item) => item.id === id);
        if (section && canDeleteFeedBlock(section)) deleteSection(id)(draft);
    };
}

// A new block goes to the end of the middle.
export function appendFeedSection(section: InvitationSection) {
    return (draft: DocumentDraft) => {
        if (draft.sections.length >= MAX_SECTIONS) return;
        const lastMiddle = draft.sections.map(isMiddleBlock).lastIndexOf(true);
        const rsvp = draft.sections.findIndex((item) => item.type === 'feedRsvp');
        const index = lastMiddle !== -1 ? lastMiddle + 1 : rsvp !== -1 ? rsvp : draft.sections.length;
        draft.sections.splice(index, 0, section as Draft<InvitationSection>);
    };
}

const FEED_TYPES: readonly SectionType[] = PAID_FEED_SECTION_TYPES;

export function addableFeedSectionTypes(document: InvitationDocument, eventType: string): NewSectionType[] {
    if (document.sections.length >= MAX_SECTIONS) return [];
    return addableSectionTypes(document, eventType, 'host').filter((type) => FEED_TYPES.includes(type));
}

// The event's own fields each feed block shows, edited on the event as the Settings page does.
const FEED_BLOCK_PARTS: Partial<Record<SectionType, SettingsPart[]>> = {
    feedCover: ['cover', 'title'],
    feedDetails: ['date', 'location'],
    feedDescription: ['description'],
};

export function feedBlockParts(type: SectionType, available: readonly SettingsPart[]): SettingsPart[] {
    return (FEED_BLOCK_PARTS[type] ?? []).filter((part) => available.includes(part));
}

// The feed takes no new photos yet, and a feed block never follows the event like an invitation cover.
const LEFT_OUT: readonly SettingsGroup[] = ['gallery', 'follow'];

export function feedSettingsGroups(groups: readonly SettingsGroup[]): SettingsGroup[] {
    return groups.filter((group) => !LEFT_OUT.includes(group));
}

export const noFeedUploads: ImageUploader = () => Promise.reject(new Error('The feed takes no photo uploads yet.'));
```

- [ ] **Step 4: Run the test to make sure it passes**

Run: `npx vitest run lib/feedEditing.test.ts`
Expected: PASS.

If `addableFeedSectionTypes` comes back empty for `WEDDING`, read `lib/invitation/sectionRules.ts` (`EVENT_TYPE_SECTIONS`) and pick an event type whose list holds `dressCode`. Do not change the rules.

- [ ] **Step 5: Commit**

```bash
git add lib/feedEditing.ts lib/feedEditing.test.ts
git commit -m "KAN-245: feed edit rules"
```

---

### Task 3: The section menu without Delete

**Files:**
- Modify: `components/saveMyDate/editor/sections/SectionMenu.tsx`
- Test: `components/saveMyDate/editor/sections/SectionMenu.test.tsx` (create if it doesn't exist; if it does, add the case)

- [ ] **Step 1: Write the failing test**

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SectionMenu } from '@/components/saveMyDate/editor/sections/SectionMenu';
import en from '@/messages/en.json';

afterEach(cleanup);

function renderMenu(onDelete?: () => void) {
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <SectionMenu canMoveUp canMoveDown onMoveUp={vi.fn()} onMoveDown={vi.fn()} onDelete={onDelete} />
        </NextIntlClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: en.InvitationEditor.sections.options }));
}

describe('SectionMenu', () => {
    it('offers Delete when it is given', async () => {
        renderMenu(vi.fn());
        expect(await screen.findByRole('menuitem', { name: en.InvitationEditor.sections.delete })).toBeTruthy();
    });

    it('leaves Delete out for a block that only hides', async () => {
        renderMenu();
        await screen.findByRole('menuitem', { name: en.InvitationEditor.sections.moveUp });
        expect(screen.queryByRole('menuitem', { name: en.InvitationEditor.sections.delete })).toBeNull();
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run components/saveMyDate/editor/sections/SectionMenu.test.tsx`
Expected: the second case FAILs, because Delete is always drawn.

If the menu doesn't open on `click` in jsdom, copy how the old editor's tests open it (`grep -rln "options" components/saveMyDate/editor --include=*.test.tsx`).

- [ ] **Step 3: Make `onDelete` optional**

In `SectionMenu.tsx`:

```tsx
type SectionMenuProps = {
    canMoveUp: boolean;
    canMoveDown: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
    // Left out for a block that can't be deleted (the feed's own blocks).
    onDelete?: () => void;
};
```

and wrap the Delete item:

```tsx
                        {/* Delete */}
                        {onDelete && (
                            <SectionMenuItem tone="danger" onClick={onDelete} icon={<Trash2 aria-hidden="true" />}>
                                {t('delete')}
                            </SectionMenuItem>
                        )}
```

- [ ] **Step 4: Run the tests to make sure they pass**

Run: `npx vitest run components/saveMyDate/editor/sections`
Expected: PASS, including the old editor's section tests.

- [ ] **Step 5: Commit**

```bash
git add components/saveMyDate/editor/sections/SectionMenu.tsx components/saveMyDate/editor/sections/SectionMenu.test.tsx
git commit -m "KAN-245: section menu can leave out Delete"
```

---

### Task 4: In-app leave guard

**Files:**
- Create: `lib/leaveGuard.ts`, `hooks/useInAppLeaveGuard.ts`
- Test: `lib/leaveGuard.test.ts`, `hooks/useInAppLeaveGuard.test.tsx`

- [ ] **Step 1: Write the failing tests**

`lib/leaveGuard.test.ts`:
```ts
import { afterEach, describe, expect, it } from 'vitest';

import { inAppHref } from '@/lib/leaveGuard';

const here = { origin: 'https://app.example', pathname: '/events/e-1/feed', search: '' };

function linkClick(href: string, init: Partial<MouseEventInit> = {}, attributes: Record<string, string> = {}) {
    const anchor = document.createElement('a');
    anchor.href = href;
    for (const [name, value] of Object.entries(attributes)) anchor.setAttribute(name, value);
    const child = document.createElement('span');
    anchor.append(child);
    document.body.append(anchor);
    const event = new MouseEvent('click', { bubbles: true, button: 0, ...init });
    Object.defineProperty(event, 'target', { value: child });
    return event;
}

afterEach(() => {
    document.body.innerHTML = '';
});

describe('inAppHref', () => {
    it('returns the page an in-app link opens', () => {
        expect(inAppHref(linkClick('https://app.example/events/e-1/manage?tab=billing'), here)).toBe('/events/e-1/manage?tab=billing');
    });

    it('lets other sites, new tabs, downloads and modified clicks through', () => {
        expect(inAppHref(linkClick('https://other.example/'), here)).toBeNull();
        expect(inAppHref(linkClick('https://app.example/x', {}, { target: '_blank' }), here)).toBeNull();
        expect(inAppHref(linkClick('https://app.example/x', {}, { download: '' }), here)).toBeNull();
        expect(inAppHref(linkClick('https://app.example/x', { ctrlKey: true }), here)).toBeNull();
        expect(inAppHref(linkClick('https://app.example/x', { button: 1 }), here)).toBeNull();
    });

    it('lets a jump within the same page through', () => {
        expect(inAppHref(linkClick('https://app.example/events/e-1/feed#posts'), here)).toBeNull();
    });

    it('ignores a click that is not on a link', () => {
        const event = new MouseEvent('click', { bubbles: true, button: 0 });
        Object.defineProperty(event, 'target', { value: document.body });
        expect(inAppHref(event, here)).toBeNull();
    });
});
```

`hooks/useInAppLeaveGuard.test.tsx`:
```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useInAppLeaveGuard } from '@/hooks/useInAppLeaveGuard';

afterEach(cleanup);

function Page({ active, onLeave }: { active: boolean; onLeave: (href: string) => void }) {
    useInAppLeaveGuard(active, onLeave);
    return <a href="/events/e-1/manage">Manage</a>;
}

describe('useInAppLeaveGuard', () => {
    it('stops an in-app link and hands its page over', () => {
        const onLeave = vi.fn();
        render(<Page active onLeave={onLeave} />);
        // fireEvent returns false when the default was prevented.
        expect(fireEvent.click(screen.getByText('Manage'))).toBe(false);
        expect(onLeave).toHaveBeenCalledWith('/events/e-1/manage');
    });

    it('does nothing while off', () => {
        const onLeave = vi.fn();
        render(<Page active={false} onLeave={onLeave} />);
        fireEvent.click(screen.getByText('Manage'));
        expect(onLeave).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run lib/leaveGuard.test.ts hooks/useInAppLeaveGuard.test.tsx`
Expected: FAIL, modules not found.

- [ ] **Step 3: Write `lib/leaveGuard.ts`**

```ts
type Click = Pick<MouseEvent, 'button' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'defaultPrevented' | 'target'>;
type Here = Pick<Location, 'origin' | 'pathname' | 'search'>;

// The page of this app a link click would open, or null when the click leaves the app, opens
// a new tab, downloads, stays on this page or isn't a plain click on a link.
export function inAppHref(event: Click, location: Here): string | null {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
    if (!(event.target instanceof Element)) return null;
    const anchor = event.target.closest('a[href]');
    if (!(anchor instanceof HTMLAnchorElement)) return null;
    if ((anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return null;
    const url = new URL(anchor.href, location.origin);
    if (url.origin !== location.origin) return null;
    if (url.pathname === location.pathname && url.search === location.search) return null;
    return `${url.pathname}${url.search}${url.hash}`;
}
```

- [ ] **Step 4: Write `hooks/useInAppLeaveGuard.ts`**

```ts
'use client';

import { useEffect, useRef } from 'react';

import { inAppHref } from '@/lib/leaveGuard';

// While active, a tap on a link to another page of the app doesn't navigate. The page goes to
// onLeave instead, which can ask first. The listener runs in the capture phase on the document,
// so it runs before next/link's own handler.
export function useInAppLeaveGuard(active: boolean, onLeave: (href: string) => void) {
    const onLeaveRef = useRef(onLeave);

    useEffect(() => {
        onLeaveRef.current = onLeave;
    }, [onLeave]);

    useEffect(() => {
        if (!active) return;
        const onClick = (event: MouseEvent) => {
            const href = inAppHref(event, window.location);
            if (href === null) return;
            event.preventDefault();
            event.stopPropagation();
            onLeaveRef.current(href);
        };
        document.addEventListener('click', onClick, true);
        return () => document.removeEventListener('click', onClick, true);
    }, [active]);
}
```

- [ ] **Step 5: Run the tests to make sure they pass**

Run: `npx vitest run lib/leaveGuard.test.ts hooks/useInAppLeaveGuard.test.tsx`
Expected: PASS. `/events/e-1/manage` resolves against jsdom's own location, so the hook test needs no origin setup.

- [ ] **Step 6: Commit**

```bash
git add lib/leaveGuard.ts lib/leaveGuard.test.ts hooks/useInAppLeaveGuard.ts hooks/useInAppLeaveGuard.test.tsx
git commit -m "KAN-245: guard in-app links while there are unsaved changes"
```

---

### Task 5: The feed top draws an edited document

**Files:**
- Modify: `hooks/useFeedLayout.ts`
- Modify: `hooks/useFeedTop.ts`
- Modify: `components/feed/layout/FeedLookTop.tsx`
- Modify: `components/feed/layout/FeedTopFrame.tsx`
- Test: `hooks/useFeedTop.test.tsx` (create; if one exists, add these cases)

- [ ] **Step 1: Write the failing test**

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { produce } from 'immer';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useFeedTop } from '@/hooks/useFeedTop';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { defaultFeedLayout, feedLayoutKeys } from '@/lib/feedLayout';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';
import { FeedEditorFlagProvider } from '@/providers/FeedEditorFlagProvider';

vi.mock('next-intl', () => ({ useLocale: () => 'en' }));
vi.mock('@/hooks/useAdminInvitationThemes', () => ({ useInvitationFonts: () => ({ data: [] }) }));

// An event that has ended: the read-only feed keeps only the cover and details.
const event = { id: 'e-1', theme: null, description: null, schedule: { endAt: '2020-01-01T00:00:00Z' } } as unknown as EventDetailResponseDto;

function wrapper({ children }: { children: ReactNode }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    client.setQueryData(feedLayoutKeys.detail('e-1'), null);
    return (
        <QueryClientProvider client={client}>
            <FeedEditorFlagProvider enabled>{children}</FeedEditorFlagProvider>
        </QueryClientProvider>
    );
}

describe('useFeedTop while editing', () => {
    const dressCode = { ...(SAMPLE_SECTIONS.dressCode as InvitationSection), id: 'dress' };
    const base = defaultFeedLayout();
    const editing = produce({ ...base, sections: [...base.sections, dressCode] }, (draft) => {
        draft.sections[2].visible = false;
    });

    it('draws the edited document with every block, never folded, even after the event', () => {
        const { result } = renderHook(() => useFeedTop(event, editing), { wrapper });
        expect(result.current.frame.middle.map((section) => section.id)).toEqual(['feed-feedDescription', 'dress']);
        expect(result.current.frame.rsvp?.type).toBe('feedRsvp');
        expect(result.current.folds).toBe(false);
        expect(result.current.look).toBe(true);
        expect(result.current.sections).toBe(editing.sections);
    });

    it('keeps the read-only rules without it', () => {
        const { result } = renderHook(() => useFeedTop(event), { wrapper });
        expect(result.current.frame.middle).toEqual([]);
        expect(result.current.frame.rsvp).toBeNull();
    });
});
```

If `isEventEnded` reads a field other than `schedule.endAt`, give the event what it reads (`lib/eventLifecycle.ts`).

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run hooks/useFeedTop.test.tsx`
Expected: the first case FAILs, because the second argument is ignored.

- [ ] **Step 3: `useFeedLayout` reports when the saved layout is in**

In `hooks/useFeedLayout.ts`, change the return:

```ts
    // isLoaded: the saved layout (or its 404) is in. Edit mode waits for it, so it never edits the stand-in.
    return { ...view, isLoading: enabled && query.isLoading, isLoaded: enabled && query.isSuccess };
```

- [ ] **Step 4: `useFeedTop` takes an edited document**

Replace `hooks/useFeedTop.ts` from the `useFeedTop` comment down:

```ts
// Everything the top of the feed draws, from the saved layout or the default one. While editing,
// it draws the document being edited: every block, hidden ones too, never folded.
export function useFeedTop(event: EventDetailResponseDto, editing?: InvitationDocument): FeedTopView {
    const enabled = useFeedEditorEnabled();
    const locale = useLocale();
    const layout = useFeedLayout(event, { enabled });
    const document = editing ?? layout.document;
    const look = usesInvitationLook(document);
    // The font files list is public (the published invitation reads it too).
    const fonts = useInvitationFonts(enabled && look);
    const fold = useInvitationFold();
    const ended = isEventEnded(event);

    const ctx = useMemo(
        () => ({ ...buildRenderContext(document, layout.theme, layout.media), labels: INVITATION_LABELS[locale === 'en' ? 'en' : 'el'] }),
        [document, layout.theme, layout.media, locale],
    );

    const frame = useMemo(() => {
        if (editing) return feedEditFrame(editing);
        const split = feedFrame(document, { ended });
        const draws = (section: InvitationSection) =>
            section.type === 'feedDescription' ? Boolean(event.description) : !isEmptyForGuests(section, ctx);
        return { ...split, middle: split.middle.filter(draws) };
    }, [editing, document, ended, event.description, ctx]);

    const folds = !editing && foldsMiddle(frame.middle.length);

    return {
        look,
        lang: locale,
        fontFaces: look ? uploadedFontFaceCss(fonts.data ?? [], [document, layout.theme]) : '',
        ctx,
        themeId: document.themeId,
        sections: document.sections,
        frame,
        folds,
        open: fold.open,
        toggle: fold.toggle,
        drawsMiddle: frame.middle.length > 0 && (!folds || fold.open),
    };
}
```

Add the imports `import { feedEditFrame } from '@/lib/feedEditing';` and `import type { InvitationDocument } from '@/lib/invitation/document';`.

- [ ] **Step 5: Export the look's parts from `FeedLookTop.tsx`**

Replace the `FeedLookTop` function with:

```tsx
// How the invitation look draws each piece of the frame. Edit mode wraps these in its tools.
export function feedLookParts(view: FeedTopView): FeedTopParts {
    const { ctx, sections, themeId } = view;
    const native = (content: ReactNode) => <FeedNative>{content}</FeedNative>;
    return {
        block: (section: Section, content: ReactNode) =>
            shellsFeedBlock(themeId, section) ? (
                <FeedBlockShell key={section.id} section={section} index={sections.indexOf(section)} ctx={ctx}>
                    {native(content)}
                </FeedBlockShell>
            ) : (
                <Fragment key={section.id}>{native(content)}</Fragment>
            ),
        native,
        invitation: (section: Section) => <InvitationSection key={section.id} section={section} index={sections.indexOf(section)} ctx={ctx} />,
    };
}

// The top of the feed in the invitation look: theme fonts, colours and effects, with Save my date
// blocks. FeedTop loads it only for a layout that uses the look, so the plain feed skips its styles.
export function FeedLookTop(props: FeedTopProps) {
    return (
        <FeedLook ctx={props.view.ctx} lang={props.view.lang} fontFaces={props.view.fontFaces}>
            <FeedTopFrame {...props} parts={feedLookParts(props.view)} />
        </FeedLook>
    );
}
```

Import `type FeedTopView` from `@/hooks/useFeedTop`.

- [ ] **Step 6: `FeedTopFrame` takes an `afterMiddle` slot**

In `components/feed/layout/FeedTopFrame.tsx`, add to `FeedTopProps`:

```ts
    // Edit mode's Add section row, after the middle blocks.
    afterMiddle?: ReactNode;
```

Destructure `afterMiddle` in `FeedTopFrame`'s signature and draw it right after the middle:

```tsx
            {view.folds && view.open && <div id={MIDDLE_ID}>{middle}</div>}
            {!view.folds && middle}
            {afterMiddle}
```

The read-only feed never passes it.

- [ ] **Step 7: Run the tests**

Run: `npx vitest run hooks/useFeedTop.test.tsx hooks/useFeedLayout "app/(main)/(app)/(event)/events/[eventId]/feed" components/feed/layout`
Expected: PASS. The feed's existing layout tests still pass, because the read-only path is unchanged.

- [ ] **Step 8: Commit**

```bash
git add hooks/useFeedLayout.ts hooks/useFeedTop.ts hooks/useFeedTop.test.tsx components/feed/layout/FeedLookTop.tsx components/feed/layout/FeedTopFrame.tsx
git commit -m "KAN-245: the feed top can draw the layout being edited"
```

---

### Task 6: Edit mode on and off (`useFeedEditMode`)

**Files:**
- Create: `hooks/useFeedEditMode.ts`
- Test: `hooks/useFeedEditMode.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useFeedEditMode } from '@/hooks/useFeedEditMode';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { feedLayoutKeys } from '@/lib/feedLayout';
import { FeedEditorFlagProvider } from '@/providers/FeedEditorFlagProvider';

// A layout that never arrives, for "until the layout is in".
vi.mock('@/lib/api/client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/api/client')>();
    return { ...actual, api: { ...actual.api, get: () => new Promise(() => undefined) } };
});

const active = { id: 'e-1', theme: null, status: 'ACTIVE' } as unknown as EventDetailResponseDto;

function wrap({ flag = true, loaded = true }: { flag?: boolean; loaded?: boolean } = {}) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    if (loaded) client.setQueryData(feedLayoutKeys.detail('e-1'), null);
    return function Wrapper({ children }: { children: ReactNode }) {
        return (
            <QueryClientProvider client={client}>
                <FeedEditorFlagProvider enabled={flag}>{children}</FeedEditorFlagProvider>
            </QueryClientProvider>
        );
    };
}

describe('useFeedEditMode', () => {
    it('lets a host start and finish editing', () => {
        const { result } = renderHook(() => useFeedEditMode(active, true), { wrapper: wrap() });
        expect(result.current.canEdit).toBe(true);
        act(() => result.current.start());
        expect(result.current.editing).toBe(true);
        act(() => result.current.finish());
        expect(result.current.editing).toBe(false);
    });

    it('is off for a guest, with the flag off, on a read-only event and until the layout is in', () => {
        expect(renderHook(() => useFeedEditMode(active, false), { wrapper: wrap() }).result.current.canEdit).toBe(false);
        expect(renderHook(() => useFeedEditMode(active, true), { wrapper: wrap({ flag: false }) }).result.current.canEdit).toBe(false);
        const readOnly = { ...active, status: 'ENDED' } as unknown as EventDetailResponseDto;
        expect(renderHook(() => useFeedEditMode(readOnly, true), { wrapper: wrap() }).result.current.canEdit).toBe(false);
        expect(renderHook(() => useFeedEditMode(active, true), { wrapper: wrap({ loaded: false }) }).result.current.canEdit).toBe(false);
    });
});
```

Before running, check which statuses `isEventWritable` refuses (`lib/eventLifecycle.ts:4`). If `ENDED` isn't one of them, use one that is.

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run hooks/useFeedEditMode.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Write the hook**

```ts
'use client';

import { useCallback, useState } from 'react';

import { useFeedLayout } from '@/hooks/useFeedLayout';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { isEventWritable } from '@/lib/eventLifecycle';
import { useFeedEditorEnabled } from '@/providers/FeedEditorFlagProvider';

// Whether the cover shows the Edit pill, and whether edit mode is on. Hosts and co-hosts only,
// on a writable event, once the saved layout is in.
export function useFeedEditMode(event: Pick<EventDetailResponseDto, 'id' | 'theme' | 'status'>, isHost: boolean) {
    const enabled = useFeedEditorEnabled();
    const layout = useFeedLayout(event, { enabled });
    const canEdit = enabled && isHost && isEventWritable(event.status) && layout.isLoaded;
    const [editing, setEditing] = useState(false);
    const start = useCallback(() => setEditing(true), []);
    const finish = useCallback(() => setEditing(false), []);

    return { canEdit, editing: canEdit && editing, start, finish };
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run hooks/useFeedEditMode.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add hooks/useFeedEditMode.ts hooks/useFeedEditMode.test.tsx
git commit -m "KAN-245: who can turn on feed edit mode"
```

---

### Task 7: One edit session (`useFeedEditSession`)

**Files:**
- Create: `hooks/useFeedEditSession.ts`
- Test: `hooks/useFeedEditSession.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFeedEditSession } from '@/hooks/useFeedEditSession';
import { ApiError } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { EventDetailResponseDto, FeedLayoutDto } from '@/lib/api/types';
import { setFeedBlockVisible } from '@/lib/feedEditing';
import { defaultFeedLayout, feedLayoutKeys } from '@/lib/feedLayout';

const mocks = vi.hoisted(() => ({ put: vi.fn(), push: vi.fn() }));

vi.mock('@/lib/api/client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/api/client')>();
    return { ...actual, api: { ...actual.api, put: mocks.put } };
});
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/hooks/useOverlayHistory', () => ({ useOverlayHistory: () => ({ requestClose: () => undefined }) }));

const event = { id: 'e-1', theme: null } as unknown as EventDetailResponseDto;
const saved: FeedLayoutDto = { themeSlug: null, revision: 3, document: defaultFeedLayout(), design: null, imageUrls: {}, updatedAt: '2026-11-22T10:00:00Z' };

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
    client.setQueryData(feedLayoutKeys.detail('e-1'), saved);
    mocks.put.mockReset();
    mocks.push.mockReset();
});

function hideRsvp(session: ReturnType<typeof useFeedEditSession>) {
    act(() => session.store.getState().edit(setFeedBlockVisible('feed-feedRsvp', false)));
}

describe('useFeedEditSession', () => {
    it('is clean until something changes', () => {
        const { result } = renderHook(() => useFeedEditSession(event, vi.fn()), { wrapper });
        expect(result.current.dirty).toBe(false);
        hideRsvp(result.current);
        expect(result.current.dirty).toBe(true);
    });

    it('leaves at once on Cancel with nothing changed', () => {
        const onDone = vi.fn();
        const { result } = renderHook(() => useFeedEditSession(event, onDone), { wrapper });
        act(() => result.current.cancel());
        expect(onDone).toHaveBeenCalledOnce();
    });

    it('asks before Cancel drops changes, and stays on Stay', () => {
        const onDone = vi.fn();
        const { result } = renderHook(() => useFeedEditSession(event, onDone), { wrapper });
        hideRsvp(result.current);
        act(() => result.current.cancel());
        expect(result.current.leaving).toBe(true);
        expect(onDone).not.toHaveBeenCalled();
        act(() => result.current.stay());
        expect(result.current.leaving).toBe(false);
        act(() => result.current.cancel());
        act(() => result.current.leave());
        expect(onDone).toHaveBeenCalledOnce();
    });

    it('asks before following a link away, then goes there', () => {
        const onDone = vi.fn();
        const { result } = renderHook(() => useFeedEditSession(event, onDone), { wrapper });
        hideRsvp(result.current);
        act(() => result.current.leaveTo('/events/e-1/manage?tab=billing'));
        expect(mocks.push).not.toHaveBeenCalled();
        act(() => result.current.leave());
        expect(onDone).toHaveBeenCalledOnce();
        expect(mocks.push).toHaveBeenCalledWith('/events/e-1/manage?tab=billing');
    });

    it('saves with the revision it opened on, then leaves', async () => {
        mocks.put.mockResolvedValue({ revision: 4, updatedAt: '2026-11-22T10:05:00Z' });
        const onDone = vi.fn();
        const { result } = renderHook(() => useFeedEditSession(event, onDone), { wrapper });
        hideRsvp(result.current);
        await act(() => result.current.save());
        expect(mocks.put).toHaveBeenCalledWith(endpoints.events.feedLayout('e-1'), {
            revision: 3,
            themeSlug: null,
            document: result.current.store.getState().document,
        });
        expect(onDone).toHaveBeenCalledOnce();
    });

    it('just leaves on Save with nothing changed', async () => {
        const onDone = vi.fn();
        const { result } = renderHook(() => useFeedEditSession(event, onDone), { wrapper });
        await act(() => result.current.save());
        expect(mocks.put).not.toHaveBeenCalled();
        expect(onDone).toHaveBeenCalledOnce();
    });

    it('opens the conflict dialog on a stale revision, and reload leaves', async () => {
        mocks.put.mockRejectedValue(new ApiError(409, { errorCode: 5208 }));
        const onDone = vi.fn();
        const { result } = renderHook(() => useFeedEditSession(event, onDone), { wrapper });
        hideRsvp(result.current);
        await act(() => result.current.save());
        expect(result.current.conflict).toBe(true);
        expect(onDone).not.toHaveBeenCalled();
        const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue();
        await act(() => result.current.reload());
        expect(invalidate).toHaveBeenCalledWith({ queryKey: feedLayoutKeys.detail('e-1') });
        expect(onDone).toHaveBeenCalledOnce();
    });

    it('stays and says so on any other failure', async () => {
        mocks.put.mockRejectedValue(new ApiError(500, { errorCode: 5004 }));
        const onDone = vi.fn();
        const { result } = renderHook(() => useFeedEditSession(event, onDone), { wrapper });
        hideRsvp(result.current);
        await act(() => result.current.save());
        await waitFor(() => expect(result.current.failed).toBe(true));
        expect(onDone).not.toHaveBeenCalled();
    });
});
```

`new ApiError(409, { errorCode: 5208 })` matches its use in `hooks/useThemePicker.test.tsx`.

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run hooks/useFeedEditSession.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Write the hook**

```ts
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { useFeedLayout } from '@/hooks/useFeedLayout';
import { useFeedLayoutSave } from '@/hooks/useFeedLayoutSave';
import { useInAppLeaveGuard } from '@/hooks/useInAppLeaveGuard';
import { useInvitationEditorStore } from '@/hooks/useInvitationEditorStore';
import { useOverlayHistory } from '@/hooks/useOverlayHistory';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { feedLayoutKeys } from '@/lib/feedLayout';
import { isStaleRevision, sameDocument } from '@/lib/invitation/drafts';

// One visit to edit mode: a copy of the saved layout to change, stored only on Save. Leaving with
// changes (Cancel, phone Back, an in-app link, closing the tab) asks first.
export function useFeedEditSession(event: Pick<EventDetailResponseDto, 'id' | 'theme'>, onDone: () => void) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const layout = useFeedLayout(event, { enabled: true });
    // What edit mode opened on. A refetch meanwhile changes neither the revision Save names nor what Cancel goes back to.
    const [opened] = useState(layout);
    const { store, document } = useInvitationEditorStore(opened.document, opened.themeSlug ?? '');
    const dirty = !sameDocument(opened.document, document);
    const { mutateAsync, isPending: saving } = useFeedLayoutSave(event.id);

    // What a yes in the leave dialog does; null while the dialog is closed.
    const [onLeave, setOnLeave] = useState<(() => void) | null>(null);
    const [failed, setFailed] = useState(false);
    const [conflict, setConflict] = useState(false);
    const [reloading, setReloading] = useState(false);

    const leaveOr = useCallback(
        (then: () => void) => {
            if (dirty) setOnLeave(() => then);
            else then();
        },
        [dirty],
    );
    const cancel = useCallback(() => leaveOr(onDone), [leaveOr, onDone]);
    const leaveTo = useCallback(
        (href: string) =>
            leaveOr(() => {
                onDone();
                router.push(href);
            }),
        [leaveOr, onDone, router],
    );
    const leave = useCallback(() => {
        const then = onLeave;
        setOnLeave(null);
        then?.();
    }, [onLeave]);
    const stay = useCallback(() => setOnLeave(null), []);

    // Phone Back works like Cancel. While a dialog is open, Back belongs to the dialog.
    useOverlayHistory(onLeave === null && !conflict, cancel);
    useInAppLeaveGuard(dirty && onLeave === null && !conflict, leaveTo);
    useUnsavedChangesWarning(dirty);

    const save = useCallback(async () => {
        if (!dirty) {
            onDone();
            return;
        }
        setFailed(false);
        try {
            await mutateAsync({ revision: opened.revision, themeSlug: opened.themeSlug, document: store.getState().document });
            onDone();
        } catch (error) {
            if (isStaleRevision(error)) setConflict(true);
            else setFailed(true);
        }
    }, [dirty, mutateAsync, onDone, opened, store]);

    // Someone saved the layout elsewhere: fetch theirs and leave edit mode on it.
    const reload = useCallback(async () => {
        setReloading(true);
        try {
            await queryClient.invalidateQueries({ queryKey: feedLayoutKeys.detail(event.id) });
        } finally {
            setReloading(false);
            setConflict(false);
            onDone();
        }
    }, [event.id, onDone, queryClient]);

    return {
        store,
        document,
        theme: opened.theme,
        media: opened.media,
        dirty,
        saving,
        failed,
        conflict,
        reloading,
        leaving: onLeave !== null,
        save,
        cancel,
        leaveTo,
        leave,
        stay,
        reload,
    };
}

export type FeedEditSession = ReturnType<typeof useFeedEditSession>;
```

`useFeedLayoutSave`'s `onSuccess` returns the `invalidateQueries` promise, so `mutateAsync` resolves only after the layout has been fetched again. The read-only feed then shows the saved layout as soon as edit mode closes.

- [ ] **Step 4: Run the test**

Run: `npx vitest run hooks/useFeedEditSession.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add hooks/useFeedEditSession.ts hooks/useFeedEditSession.test.tsx
git commit -m "KAN-245: feed edit session with save, conflict and leave guards"
```

---

### Task 8: Block actions (`useFeedBlockActions`, `useFeedBlockHandlers`)

**Files:**
- Create: `hooks/useFeedBlockActions.ts`, `hooks/useFeedBlockHandlers.ts`
- Test: `hooks/useFeedBlockActions.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { act, renderHook } from '@testing-library/react';
import { useStore } from 'zustand';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFeedBlockActions } from '@/hooks/useFeedBlockActions';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { defaultFeedLayout } from '@/lib/feedLayout';
import { createInvitationEditorStore } from '@/lib/invitation/editorStore';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';

const upgrade = vi.hoisted(() => ({ href: '/events/e-1/manage?tab=billing' as string | null }));
vi.mock('@/hooks/usePlanUpgradeHref', () => ({ usePlanUpgradeHref: () => upgrade.href }));

const dressCode = { ...(SAMPLE_SECTIONS.dressCode as InvitationSection), id: 'dress' };

function eventWith(saveMyDate: boolean) {
    return {
        id: 'e-1',
        eventType: 'WEDDING',
        modules: saveMyDate ? [{ moduleKey: 'save_my_date', isAvailable: true, isEnabled: true }] : [],
    } as unknown as EventDetailResponseDto;
}

function setup(saveMyDate = true) {
    const base = defaultFeedLayout();
    const store = createInvitationEditorStore({ ...base, sections: [...base.sections, dressCode] });
    const leaveTo = vi.fn();
    const hook = renderHook(() => {
        const document = useStore(store, (state) => state.document);
        return useFeedBlockActions(store, document, eventWith(saveMyDate), leaveTo);
    });
    return { store, leaveTo, ...hook };
}

const middle = (sections: InvitationSection[]) => sections.filter((section) => section.id === 'dress' || section.type === 'feedDescription');

beforeEach(() => {
    upgrade.href = '/events/e-1/manage?tab=billing';
});

describe('useFeedBlockActions', () => {
    it('hides and shows a block', () => {
        const { store, result } = setup();
        act(() => result.current.toggleVisible('feed-feedRsvp'));
        expect(store.getState().document.sections[3].visible).toBe(false);
        act(() => result.current.toggleVisible('feed-feedRsvp'));
        expect(store.getState().document.sections[3].visible).toBe(true);
    });

    it('moves a middle block', () => {
        const { store, result } = setup();
        act(() => result.current.move('dress', -1));
        expect(middle(store.getState().document.sections).map((section) => section.id)).toEqual(['dress', 'feed-feedDescription']);
    });

    it('asks before deleting, and never for a feed block', () => {
        const { result } = setup();
        act(() => result.current.askDelete('feed-feedDescription'));
        expect(result.current.remove.isOpen).toBe(false);
        act(() => result.current.askDelete('dress'));
        expect(result.current.remove.isOpen).toBe(true);
    });

    it('opens the add list and appends what was picked', () => {
        const { store, result } = setup();
        act(() => result.current.openAdd());
        expect(result.current.adding).toBe(true);
        const type = result.current.addable[0];
        const before = store.getState().document.sections.length;
        act(() => result.current.add(type));
        expect(result.current.adding).toBe(false);
        expect(store.getState().document.sections).toHaveLength(before + 1);
        expect(store.getState().document.sections.some((section) => section.type === type)).toBe(true);
    });

    it('sends a host without Save my date to Billing', () => {
        const { leaveTo, result } = setup(false);
        expect(result.current.locked).toBe(true);
        act(() => result.current.openAdd());
        expect(result.current.adding).toBe(false);
        expect(leaveTo).toHaveBeenCalledWith('/events/e-1/manage?tab=billing');
    });

    it('does nothing for a co-host who cannot buy', () => {
        upgrade.href = null;
        const { leaveTo, result } = setup(false);
        expect(result.current.canBuy).toBe(false);
        act(() => result.current.openAdd());
        expect(leaveTo).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run hooks/useFeedBlockActions.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Write `hooks/useFeedBlockActions.ts`**

```ts
'use client';

import { useCallback, useMemo, useState } from 'react';

import { useDeleteSectionConfirm } from '@/hooks/useDeleteSectionConfirm';
import { usePlanUpgradeHref } from '@/hooks/usePlanUpgradeHref';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import {
    addableFeedSectionTypes,
    appendFeedSection,
    canDeleteFeedBlock,
    moveFeedBlock,
    reorderFeedBlocks,
    setFeedBlockVisible,
} from '@/lib/feedEditing';
import type { InvitationDocument } from '@/lib/invitation/document';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import { createSection, type NewSectionType } from '@/lib/invitation/newSection';
import type { MoveDirection, SectionEdit } from '@/lib/invitation/sectionActions';

// What the tools on the feed's blocks do, and the Add section row. Without Save my date, a host who
// can buy it goes to Billing (asking first when there are changes); a co-host can't add.
export function useFeedBlockActions(
    store: InvitationEditorStore,
    document: InvitationDocument,
    event: Pick<EventDetailResponseDto, 'id' | 'eventType' | 'modules'>,
    leaveTo: (href: string) => void,
) {
    const edit = useCallback<SectionEdit>((recipe) => store.getState().edit(recipe), [store]);
    const remove = useDeleteSectionConfirm(edit, document);
    const billingHref = usePlanUpgradeHref(event.id);
    const locked = !isModuleAvailable(event.modules, 'save_my_date');
    const addable = useMemo(() => addableFeedSectionTypes(document, event.eventType), [document, event.eventType]);
    const [adding, setAdding] = useState(false);

    const find = useCallback((id: string) => document.sections.find((section) => section.id === id) ?? null, [document]);
    const toggleVisible = useCallback(
        (id: string) => {
            const section = find(id);
            if (section) edit(setFeedBlockVisible(id, !section.visible));
        },
        [edit, find],
    );
    const move = useCallback((id: string, direction: MoveDirection) => edit(moveFeedBlock(id, direction)), [edit]);
    const reorder = useCallback((activeId: string, overId: string) => edit(reorderFeedBlocks(activeId, overId)), [edit]);
    const { ask } = remove;
    const askDelete = useCallback(
        (id: string) => {
            const section = find(id);
            if (section && canDeleteFeedBlock(section)) ask(id);
        },
        [ask, find],
    );
    const openAdd = useCallback(() => {
        if (!locked) setAdding(true);
        else if (billingHref) leaveTo(billingHref);
    }, [billingHref, leaveTo, locked]);
    const closeAdd = useCallback(() => setAdding(false), []);
    const add = useCallback(
        (type: NewSectionType) => {
            edit(appendFeedSection(createSection(type, event.eventType)));
            setAdding(false);
        },
        [edit, event.eventType],
    );

    return { toggleVisible, move, reorder, askDelete, remove, addable, adding, openAdd, closeAdd, add, locked, canBuy: billingHref !== null };
}

export type FeedBlockActions = ReturnType<typeof useFeedBlockActions>;
```

- [ ] **Step 4: Write `hooks/useFeedBlockHandlers.ts`**

```ts
'use client';

import { useMemo } from 'react';

import type { MoveDirection } from '@/lib/invitation/sectionActions';

export type FeedBlockToolActions = {
    onToggleVisible: (id: string) => void;
    onMove: (id: string, direction: MoveDirection) => void;
    onDelete: (id: string) => void;
    onOpenSettings: (id: string) => void;
};

// One block's tool callbacks, bound to its id, so the tools get stable handlers.
export function useFeedBlockHandlers(id: string, actions: FeedBlockToolActions) {
    const { onToggleVisible, onMove, onDelete, onOpenSettings } = actions;
    return useMemo(
        () => ({
            toggleVisible: () => onToggleVisible(id),
            moveUp: () => onMove(id, -1),
            moveDown: () => onMove(id, 1),
            remove: () => onDelete(id),
            openSettings: () => onOpenSettings(id),
        }),
        [id, onDelete, onMove, onOpenSettings, onToggleVisible],
    );
}
```

- [ ] **Step 5: Run the test**

Run: `npx vitest run hooks/useFeedBlockActions.test.tsx`
Expected: PASS. If `result.current.addable` is empty for `WEDDING`, use the event type you picked in Task 2.

- [ ] **Step 6: Commit**

```bash
git add hooks/useFeedBlockActions.ts hooks/useFeedBlockActions.test.tsx hooks/useFeedBlockHandlers.ts
git commit -m "KAN-245: feed block actions"
```

---

### Task 9: The pencil sheet's state (`useFeedBlockSheet`)

**Files:**
- Create: `hooks/useFeedBlockSheet.ts`
- Test: `hooks/useFeedBlockSheet.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useFeedBlockSheet } from '@/hooks/useFeedBlockSheet';
import { defaultFeedLayout, wallThemeDesign } from '@/lib/feedLayout';
import { createInvitationEditorStore } from '@/lib/invitation/editorStore';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';
import type { SettingsPart } from '@/lib/settingsPreview';

const dressCode = { ...(SAMPLE_SECTIONS.dressCode as InvitationSection), id: 'dress' };
const theme = wallThemeDesign(null);
const media = () => undefined;
const allParts: SettingsPart[] = ['cover', 'title', 'date', 'location', 'description'];

function setup() {
    const base = defaultFeedLayout();
    const store = createInvitationEditorStore({ ...base, sections: [...base.sections, dressCode] });
    return renderHook(() => useFeedBlockSheet(store, store.getState().document, theme, media, [], allParts));
}

describe('useFeedBlockSheet', () => {
    it("opens a feed block's event parts", () => {
        const { result } = setup();
        act(() => result.current.openFor('feed-feedCover'));
        expect(result.current.section?.id).toBe('feed-feedCover');
        expect(result.current.parts).toEqual(['cover', 'title']);
    });

    it("opens a Save my date block's own groups, with no photo uploads", () => {
        const { result } = setup();
        act(() => result.current.openFor('dress'));
        expect(result.current.groups).toContain('dressCode');
        expect(result.current.groups).not.toContain('gallery');
        expect(result.current.scope?.mode).toBe('host');
        expect(result.current.parts).toEqual([]);
    });

    it('gives a block a pencil only when it has something to set', () => {
        const { result } = setup();
        const rsvp = defaultFeedLayout().sections[3];
        expect(result.current.hasSettings(rsvp)).toBe(result.current.groupsOf(rsvp).length > 0);
    });

    it('closes', () => {
        const { result } = setup();
        act(() => result.current.openFor('dress'));
        act(() => result.current.close());
        expect(result.current.section).toBeNull();
    });
});
```

If `wallThemeDesign` isn't exported from `lib/feedLayout.ts` under that name, use whatever `useFeedLayout` uses to build `theme` for a layout without a Save my date theme.

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run hooks/useFeedBlockSheet.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Write the hook**

```ts
'use client';

import { useCallback, useMemo, useState } from 'react';

import type { SettingsEdit } from '@/hooks/useSectionSettings';
import type { SettingsScope } from '@/hooks/useSectionSettingsPanel';
import { feedBlockParts, feedSettingsGroups, noFeedUploads } from '@/lib/feedEditing';
import type { InvitationDocument } from '@/lib/invitation/document';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import type { MediaResolver } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';
import { settingMergeKey, settingsGroups } from '@/lib/invitation/sectionSettings';
import { fontOptions } from '@/lib/invitation/textEditing';
import type { ThemeDesign } from '@/lib/invitation/theme';
import type { InvitationFontDto } from '@/lib/invitation/uploadedFonts';
import type { SettingsPart } from '@/lib/settingsPreview';

const ignoreUpload = () => undefined;

// The block whose pencil is open: its event parts (saved on the event at once) and its style
// groups (saved with the layout). It closes by itself when the block goes away or has nothing to set.
export function useFeedBlockSheet(
    store: InvitationEditorStore,
    document: InvitationDocument,
    theme: ThemeDesign,
    media: MediaResolver,
    uploadedFonts: InvitationFontDto[] | undefined,
    eventParts: SettingsPart[],
) {
    const [openId, setOpenId] = useState<string | null>(null);
    const groupsOf = useCallback((section: InvitationSection) => feedSettingsGroups(settingsGroups(section, 'host', theme)), [theme]);
    const partsOf = useCallback((section: InvitationSection) => feedBlockParts(section.type, eventParts), [eventParts]);
    const hasSettings = useCallback((section: InvitationSection) => groupsOf(section).length > 0 || partsOf(section).length > 0, [groupsOf, partsOf]);

    const found = useMemo(() => document.sections.find((section) => section.id === openId) ?? null, [document.sections, openId]);
    const section = found && hasSettings(found) ? found : null;
    const groups = useMemo(() => (section ? groupsOf(section) : []), [groupsOf, section]);
    const parts = useMemo(() => (section ? partsOf(section) : []), [partsOf, section]);
    const fonts = useMemo(() => fontOptions(document, theme, uploadedFonts), [document, theme, uploadedFonts]);

    const edit = useCallback<SettingsEdit>(
        (recipe, field) => {
            if (openId) store.getState().edit(recipe, field ? settingMergeKey(openId, field) : undefined);
        },
        [openId, store],
    );

    const scope = useMemo<SettingsScope | null>(
        () =>
            section
                ? {
                      section,
                      edit,
                      mode: 'host',
                      isAdmin: false,
                      theme,
                      media,
                      fonts,
                      uploadImage: noFeedUploads,
                      addUploaded: ignoreUpload,
                      event: null,
                      eventSamples: null,
                      eventFieldLinks: null,
                  }
                : null,
        [edit, fonts, media, section, theme],
    );

    const openFor = useCallback((id: string) => setOpenId(id), []);
    const close = useCallback(() => setOpenId(null), []);

    return { section, groups, parts, scope, hasSettings, groupsOf, openFor, close };
}

export type FeedBlockSheetState = ReturnType<typeof useFeedBlockSheet>;
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run hooks/useFeedBlockSheet.test.tsx`
Expected: PASS. `TYPE_GROUPS` in `lib/invitation/sectionSettings.ts` gives `dressCode: ['dressCode']`. If a sample's type differs, assert the group that type really has.

- [ ] **Step 5: Commit**

```bash
git add hooks/useFeedBlockSheet.ts hooks/useFeedBlockSheet.test.tsx
git commit -m "KAN-245: feed block settings sheet state"
```

---

### Task 10: Edit mode components

All of these are declarative render shells; behaviour stays in the hooks above. Mark each visual section with a JSX comment. Every icon is `aria-hidden` next to visible text or an `aria-label`, so no image needs alt text.

**Files:**
- Create: `components/feed/edit/FeedEditPill.tsx`, `FeedEditPills.tsx`, `FeedBlockPlaceholder.tsx`, `FeedBlockTools.tsx`, `FeedEditBlock.tsx`, `FeedAddSectionRow.tsx`, `FeedBlockSheet.tsx`, `FeedEditTop.tsx`, `LazyFeedEditTop.tsx`
- Modify: `components/feed/layout/FeedCoverBlock.tsx`

- [ ] **Step 1: `FeedEditPill.tsx`**

```tsx
'use client';

import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';

// The cover's Edit pill: hosts and co-hosts only.
export function FeedEditPill({ onClick }: { onClick: () => void }) {
    const t = useTranslations('FeedEditor');

    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-background/92 px-3.5 text-sm font-semibold text-ink shadow-[0_8px_22px_rgba(36,31,26,0.18)] transition-transform hover:-translate-y-0.5"
        >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            {t('edit')}
        </button>
    );
}
```

- [ ] **Step 2: `FeedEditPills.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';

type FeedEditPillsProps = { saving: boolean; failed: boolean; onCancel: () => void; onSave: () => void };

// Cancel and Save on the cover while editing, with the save error under them.
export function FeedEditPills({ saving, failed, onCancel, onSave }: FeedEditPillsProps) {
    const t = useTranslations('InvitationEditor');
    const tFeed = useTranslations('FeedEditor');

    return (
        <div className="flex flex-col items-end gap-2">
            {/* Actions */}
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={saving}
                    className="h-9 rounded-full bg-background/92 px-3.5 text-sm font-semibold text-ink shadow-[0_8px_22px_rgba(36,31,26,0.18)] disabled:opacity-60"
                >
                    {t('cancel')}
                </button>
                <button
                    type="button"
                    onClick={onSave}
                    disabled={saving}
                    aria-busy={saving}
                    className="h-9 rounded-full bg-primary px-3.5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(36,31,26,0.18)] disabled:opacity-80"
                >
                    {saving ? t('saving') : t('save')}
                </button>
            </div>

            {/* Save error */}
            {failed && (
                <p role="alert" className="max-w-64 rounded-xl bg-background/95 px-3 py-2 text-right text-sm text-destructive shadow-[0_8px_22px_rgba(36,31,26,0.18)]">
                    {tFeed('saveFailed')}
                </p>
            )}
        </div>
    );
}
```

`text-destructive` is already used under `components/manage`. If `bg-primary` with `text-white` doesn't match the app's primary buttons, copy the classes of the Settings page's own Save button.

- [ ] **Step 3: `FeedBlockPlaceholder.tsx`**

```tsx
// A block with nothing to show yet (no description, no RSVP to ask for), drawn by its name while editing.
export function FeedBlockPlaceholder({ name }: { name: string }) {
    return <p className="px-4 pt-16 pb-6 text-center text-sm text-ink-muted">{name}</p>;
}
```

- [ ] **Step 4: `FeedBlockTools.tsx`**

```tsx
'use client';

import { Eye, EyeOff, GripVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SectionMenu } from '@/components/saveMyDate/editor/sections/SectionMenu';
import { SectionSettingsButton } from '@/components/saveMyDate/editor/sections/SectionSettingsButton';
import { SectionToolButton } from '@/components/saveMyDate/editor/sections/SectionToolButton';
import { type FeedBlockToolActions, useFeedBlockHandlers } from '@/hooks/useFeedBlockHandlers';
import type { SectionDragHandle } from '@/hooks/useSectionSortable';
import type { FeedBlockControls } from '@/lib/feedEditing';
import type { InvitationSection } from '@/lib/invitation/sections';

type FeedBlockToolsProps = {
    section: InvitationSection;
    controls: FeedBlockControls;
    hasSettings: boolean;
    drag: SectionDragHandle;
    actions: FeedBlockToolActions;
};

// One block's tools: eye and pencil on the left, drag and menu on the right (middle blocks only).
// The cover's right corner holds Cancel and Save instead.
export function FeedBlockTools({ section, controls, hasSettings, drag, actions }: FeedBlockToolsProps) {
    const t = useTranslations('InvitationEditor.sections');
    const on = useFeedBlockHandlers(section.id, actions);

    return (
        <div className="pointer-events-none absolute inset-x-2.5 top-3 z-40 flex items-start justify-between transition-none">
            {/* Visibility and settings */}
            <div className="pointer-events-auto flex gap-2">
                {controls.canHide && (
                    <SectionToolButton label={section.visible ? t('hide') : t('show')} isOff={!section.visible} onClick={on.toggleVisible}>
                        {section.visible ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                    </SectionToolButton>
                )}
                {hasSettings && <SectionSettingsButton onClick={on.openSettings} />}
            </div>

            {/* Move and menu */}
            {controls.movable && (
                <div className="pointer-events-auto flex gap-2">
                    <SectionToolButton
                        ref={drag.activator}
                        label={t('drag')}
                        className="cursor-grab touch-none active:cursor-grabbing"
                        {...drag.attributes}
                        {...drag.listeners}
                    >
                        <GripVertical aria-hidden="true" />
                    </SectionToolButton>
                    <SectionMenu
                        canMoveUp={controls.canMoveUp}
                        canMoveDown={controls.canMoveDown}
                        onMoveUp={on.moveUp}
                        onMoveDown={on.moveDown}
                        onDelete={controls.canDelete ? on.remove : undefined}
                    />
                </div>
            )}
        </div>
    );
}
```

Check the exact prop names of `SectionToolButton`, `SectionSettingsButton` and the drag handle type in `SectionToolbar.tsx` / `hooks/useSectionSortable.ts`, and the `InvitationEditor.sections` keys for hide/show/drag in `messages/en.json`. Use the ones the old editor's toolbar already uses; never add a key.

- [ ] **Step 5: `FeedEditBlock.tsx`**

```tsx
'use client';

import '@/components/saveMyDate/editor/editor.css';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { FeedBlockTools } from '@/components/feed/edit/FeedBlockTools';
import type { FeedBlockToolActions } from '@/hooks/useFeedBlockHandlers';
import { useSectionSortable } from '@/hooks/useSectionSortable';
import type { FeedBlockControls } from '@/lib/feedEditing';
import type { InvitationSection } from '@/lib/invitation/sections';
import { cn } from '@/lib/utils';

type FeedEditBlockProps = {
    section: InvitationSection;
    name: string;
    controls: FeedBlockControls;
    hasSettings: boolean;
    actions: FeedBlockToolActions;
    // The cover's top corner: Cancel and Save.
    corner?: ReactNode;
    children: ReactNode;
};

// One block of the feed while editing: dimmed with a badge when hidden, with its tools on top.
// Only middle blocks drag; the rest pass locked to the sortable, so they stay put.
export function FeedEditBlock({ section, name, controls, hasSettings, actions, corner, children }: FeedEditBlockProps) {
    const t = useTranslations('InvitationEditor.sections');
    const { setNodeRef, style, isDragging, drag } = useSectionSortable(section.id, name, !controls.movable);

    return (
        <div
            ref={setNodeRef}
            style={style}
            data-editor-section={section.id}
            role="group"
            aria-label={name}
            tabIndex={-1}
            className={cn(
                'smd-editor relative outline-offset-[-2px] focus-within:outline-2 focus-within:outline-(--smd-editor-accent) hover:outline-2 hover:outline-(--smd-editor-accent)',
                isDragging && 'z-50 shadow-[0_10px_28px_rgba(0,0,0,0.35)]',
            )}
        >
            {/* Block */}
            <div className={cn('min-h-14', !section.visible && 'opacity-[0.48]')}>{children}</div>

            {/* Hidden from guests */}
            {!section.visible && (
                <span className="pointer-events-none absolute top-14 left-2.5 z-30 rounded-full border border-black/10 bg-white/95 px-2.5 py-1 text-[11px] text-[#555]">
                    {t('hidden')}
                </span>
            )}

            {/* Tools */}
            <FeedBlockTools section={section} controls={controls} hasSettings={hasSettings} drag={drag} actions={actions} />

            {/* Save and cancel */}
            {corner && <div className="absolute top-3 right-3 z-50">{corner}</div>}
        </div>
    );
}
```

`.smd-editor` only defines the editor's colour variables (`components/saveMyDate/editor/editor.css:2-16`). The browser check in Task 13 confirms it changes nothing else on the feed.

- [ ] **Step 6: `FeedAddSectionRow.tsx`**

```tsx
'use client';

import { Lock, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

type FeedAddSectionRowProps = { locked: boolean; canBuy: boolean; onAdd: () => void };

// The end of the middle: add a Save my date block, or the lock when the event has no Save my date.
export function FeedAddSectionRow({ locked, canBuy, onAdd }: FeedAddSectionRowProps) {
    const t = useTranslations('InvitationEditor.sections');
    const tTheme = useTranslations('ManagePage.settings.theme');

    // A co-host can't buy Save my date: only the lock shows.
    if (locked && !canBuy) {
        return (
            <p className="flex items-center justify-center gap-2 px-4 py-4 text-sm text-ink-muted">
                <Lock className="h-4 w-4" aria-hidden="true" />
                {tTheme('locked')}
            </p>
        );
    }

    return (
        <div className="px-4 py-3">
            {/* Add section */}
            <button
                type="button"
                onClick={onAdd}
                className="flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-border py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
                <span className="flex items-center gap-2">
                    {locked ? <Lock className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                    {t('add')}
                </span>
                {locked && <span className="text-xs font-normal text-ink-muted">{tTheme('locked')}</span>}
            </button>
        </div>
    );
}
```

- [ ] **Step 7: `FeedBlockSheet.tsx`**

```tsx
'use client';

import '@/components/saveMyDate/editor/editor.css';

import { ChevronRight } from 'lucide-react';
import { useCallback } from 'react';

import { SectionSettingsDone, SectionSettingsPanel } from '@/components/saveMyDate/editor/settings/SectionSettingsPanel';
import { SectionSettingsSheet } from '@/components/saveMyDate/editor/settings/SectionSettingsSheet';
import type { SettingsScope } from '@/hooks/useSectionSettingsPanel';
import type { SettingsGroup } from '@/lib/invitation/sectionSettings';
import type { SettingsPart } from '@/lib/settingsPreview';

type FeedBlockSheetProps = {
    title: string;
    open: boolean;
    scope: SettingsScope | null;
    groups: SettingsGroup[];
    parts: SettingsPart[];
    partLabels: Record<SettingsPart, string>;
    isDesktop: boolean;
    onOpenPart: (part: SettingsPart) => void;
    onClose: () => void;
};

// The pencil's sheet: the event fields the block shows, then its style. A panel at the right on
// desktop, a sheet over the lower screen on phones; the feed above stays live either way.
export function FeedBlockSheet({ title, open, scope, groups, parts, partLabels, isDesktop, onOpenPart, onClose }: FeedBlockSheetProps) {
    const body = (
        <div className="flex flex-col gap-5">
            {/* Event details */}
            {parts.length > 0 && (
                <div className="flex flex-col gap-1.5">
                    {parts.map((part) => (
                        <FeedBlockPartRow key={part} part={part} label={partLabels[part]} onOpen={onOpenPart} />
                    ))}
                </div>
            )}

            {/* Style */}
            {scope && groups.length > 0 && <SectionSettingsPanel scope={scope} groups={groups} />}
        </div>
    );

    if (!isDesktop) {
        return (
            <SectionSettingsSheet open={open} title={title} onClose={onClose}>
                {body}
            </SectionSettingsSheet>
        );
    }

    if (!open) return null;
    return (
        <aside
            aria-label={title}
            className="smd-editor fixed top-24 right-4 z-40 flex max-h-[calc(100svh-7rem)] w-72 flex-col gap-3 overflow-y-auto rounded-[15px] border border-(--smd-editor-panel-line) bg-(--smd-editor-panel) p-3 text-[12.5px] text-(--smd-editor-text) shadow-[0_12px_30px_rgba(0,0,0,0.25)]"
        >
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <h2 className="truncate text-[14px] font-bold text-white">{title}</h2>
                <SectionSettingsDone onClick={onClose} />
            </div>

            {body}
        </aside>
    );
}

type FeedBlockPartRowProps = { part: SettingsPart; label: string; onOpen: (part: SettingsPart) => void };

// One event field, opened in the Settings page's own editor.
function FeedBlockPartRow({ part, label, onOpen }: FeedBlockPartRowProps) {
    const open = useCallback(() => onOpen(part), [onOpen, part]);

    return (
        <button
            type="button"
            onClick={open}
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg bg-(--smd-editor-control) px-3 text-left text-[13px] text-(--smd-editor-text) transition-colors hover:bg-white/10"
        >
            {label}
            <ChevronRight className="h-4 w-4 text-(--smd-editor-muted)" aria-hidden="true" />
        </button>
    );
}
```

Copy the CSS variable names from `editor.css:2-16`. If one used here doesn't exist, use the closest one the old editor's settings panel uses; don't add new ones.

- [ ] **Step 8: `FeedEditTop.tsx`**

```tsx
'use client';

import { closestCenter, DndContext } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { FeedAddSectionRow } from '@/components/feed/edit/FeedAddSectionRow';
import { FeedBlockPlaceholder } from '@/components/feed/edit/FeedBlockPlaceholder';
import { FeedBlockSheet } from '@/components/feed/edit/FeedBlockSheet';
import { FeedEditBlock } from '@/components/feed/edit/FeedEditBlock';
import { FeedEditPills } from '@/components/feed/edit/FeedEditPills';
import { FeedLook } from '@/components/feed/layout/FeedLook';
import { feedLookParts } from '@/components/feed/layout/FeedLookTop';
import { FeedTopFrame, type FeedTopParts, type FeedTopProps, PLAIN_PARTS } from '@/components/feed/layout/FeedTopFrame';
import { SettingsPartEditor } from '@/components/manage/settings/SettingsPartEditor';
import { EditorConflictDialog } from '@/components/saveMyDate/editor/EditorConflictDialog';
import { EditorLeaveDialog } from '@/components/saveMyDate/editor/EditorLeaveDialog';
import { AddSectionSheet } from '@/components/saveMyDate/editor/sections/AddSectionSheet';
import { DeleteSectionDialog } from '@/components/saveMyDate/editor/sections/DeleteSectionDialog';
import { InlineTextEditing } from '@/components/saveMyDate/editor/text/InlineTextEditing';
import { useInvitationFonts } from '@/hooks/useAdminInvitationThemes';
import { useFeedBlockActions } from '@/hooks/useFeedBlockActions';
import type { FeedBlockToolActions } from '@/hooks/useFeedBlockHandlers';
import { useFeedBlockSheet } from '@/hooks/useFeedBlockSheet';
import { useFeedEditSession } from '@/hooks/useFeedEditSession';
import { useFeedTop } from '@/hooks/useFeedTop';
import { useSectionDrag } from '@/hooks/useSectionDrag';
import { useSettingsPreview } from '@/hooks/useSettingsPreview';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { feedBlockControls } from '@/lib/feedEditing';
import type { NewSectionType } from '@/lib/invitation/newSection';
import type { FeedSectionType, InvitationSection, SectionType } from '@/lib/invitation/sections';

const MODIFIERS = [restrictToVerticalAxis];

type FeedEditTopProps = Omit<FeedTopProps, 'view'> & { event: EventDetailResponseDto; onDone: () => void };

// SectionType also holds the footer, which a feed never has.
type FeedNameKey = `sectionNames.${NewSectionType | FeedSectionType}`;
const nameKey = (type: SectionType) => `sectionNames.${type}` as FeedNameKey;

// The top of the feed in edit mode: the same frame as the feed, every block with its tools,
// Save my date text typed in place, and the Add section row closing the middle.
export function FeedEditTop({ event, onDone, cover, details, stories, description, rsvp }: FeedEditTopProps) {
    const t = useTranslations('InvitationEditor');
    const session = useFeedEditSession(event, onDone);
    const view = useFeedTop(event, session.document);
    const fonts = useInvitationFonts(true);
    const actions = useFeedBlockActions(session.store, session.document, event, session.leaveTo);
    const preview = useSettingsPreview(event, true, true);
    const sheet = useFeedBlockSheet(session.store, session.document, session.theme, session.media, fonts.data, preview.parts);
    const middleIds = view.frame.middle.map((section) => section.id);
    const drag = useSectionDrag(middleIds.length, actions.reorder);

    const tools: FeedBlockToolActions = {
        onToggleVisible: actions.toggleVisible,
        onMove: actions.move,
        onDelete: actions.askDelete,
        onOpenSettings: sheet.openFor,
    };
    const pills = <FeedEditPills saving={session.saving} failed={session.failed} onCancel={session.cancel} onSave={session.save} />;

    const wrap = (section: InvitationSection, node: ReactNode) => (
        <FeedEditBlock
            key={section.id}
            section={section}
            name={t(nameKey(section.type))}
            controls={feedBlockControls(session.document.sections, section)}
            hasSettings={sheet.hasSettings(section)}
            actions={tools}
            corner={section.type === 'feedCover' ? pills : undefined}
        >
            {node}
        </FeedEditBlock>
    );
    const base = view.look ? feedLookParts(view) : PLAIN_PARTS;
    const parts: FeedTopParts = {
        // The feed's own blocks are set on the event, not typed here: their content takes no taps.
        block: (section, content) => wrap(section, base.block(section, <div inert>{content}</div>)),
        native: base.native,
        invitation: (section) => wrap(section, base.invitation(section)),
    };

    const frame = (
        <FeedTopFrame
            view={view}
            parts={parts}
            cover={cover}
            details={details}
            stories={stories}
            description={description || <FeedBlockPlaceholder name={t('sectionNames.feedDescription')} />}
            rsvp={rsvp ?? <FeedBlockPlaceholder name={t('sectionNames.feedRsvp')} />}
            afterMiddle={<FeedAddSectionRow locked={actions.locked} canBuy={actions.canBuy} onAdd={actions.openAdd} />}
        />
    );

    return (
        <InlineTextEditing store={session.store} document={session.document} theme={session.theme} uploadedFonts={fonts.data}>
            {/* Blocks */}
            <DndContext sensors={drag.sensors} collisionDetection={closestCenter} modifiers={MODIFIERS} accessibility={drag.accessibility} onDragEnd={drag.onDragEnd}>
                <SortableContext items={middleIds} strategy={verticalListSortingStrategy}>
                    {view.look ? (
                        <FeedLook ctx={view.ctx} lang={view.lang} fontFaces={view.fontFaces}>
                            {frame}
                        </FeedLook>
                    ) : (
                        frame
                    )}
                </SortableContext>
            </DndContext>

            {/* Block settings */}
            <FeedBlockSheet
                title={sheet.section ? t(nameKey(sheet.section.type)) : ''}
                open={sheet.section !== null}
                scope={sheet.scope}
                groups={sheet.groups}
                parts={sheet.parts}
                partLabels={preview.labels}
                isDesktop={preview.isDesktop}
                onOpenPart={preview.openEditor}
                onClose={sheet.close}
            />
            <SettingsPartEditor
                event={event}
                part={preview.openPart}
                label={preview.openPart ? preview.labels[preview.openPart] : ''}
                isDesktop={false}
                canUploadCover={preview.canUploadCover}
                onCloseAction={preview.closeEditor}
            />

            {/* Add section */}
            <AddSectionSheet open={actions.adding} types={actions.addable} onAdd={actions.add} onClose={actions.closeAdd} />

            {/* Delete */}
            <DeleteSectionDialog
                open={actions.remove.isOpen}
                sectionName={actions.remove.sectionType ? t(nameKey(actions.remove.sectionType)) : ''}
                onDelete={actions.remove.confirm}
                onCancel={actions.remove.cancel}
                finalFocus={actions.remove.finalFocus}
            />

            {/* Leave with changes */}
            <EditorLeaveDialog open={session.leaving} onLeave={session.leave} onStay={session.stay} />

            {/* Saved elsewhere */}
            <EditorConflictDialog open={session.conflict} isReloading={session.reloading} onReload={session.reload} />
        </InlineTextEditing>
    );
}
```

`SettingsPartEditor` always opens as its own sheet here (`isDesktop={false}`): the feed has no column beside a preview for its desktop panel. Its forms save the event at once, as on the Settings page.

- [ ] **Step 9: `LazyFeedEditTop.tsx`**

```tsx
'use client';

import dynamic from 'next/dynamic';

// Edit mode's code loads only when a host taps Edit.
export const LazyFeedEditTop = dynamic(() => import('@/components/feed/edit/FeedEditTop').then((module) => module.FeedEditTop));
```

- [ ] **Step 10: `FeedCoverBlock` gets a corner slot**

Change the props type and signature, make the section `relative`, and draw the corner after the banner. Leave the rest of the file as it is:

```tsx
type FeedCoverBlockProps = {
    event: EventDetailResponseDto;
    isHost: boolean;
    wishlist: boolean;
    // The top corner: the Edit pill for hosts.
    corner?: ReactNode;
};

// The feed's cover + title block (feedCover): the banner with the session and gift buttons.
export function FeedCoverBlock({ event, isHost, wishlist, corner }: FeedCoverBlockProps) {
    const t = useTranslations('FeedPage');
    const cover = useFeedCoverBlock(event, wishlist);

    return (
        <section className="relative mt-3">
            <Banner
                {/* …props exactly as today… */}
            />

            {/* Edit */}
            {corner && <div className="absolute top-3 right-3 z-20">{corner}</div>}
        </section>
    );
}
```

Import `type ReactNode` from `react`.

- [ ] **Step 11: Type check**

Run: `npx tsc --noEmit`
Expected: no errors. If the typings reject `inert` as a bare attribute, write `inert={true}`.

- [ ] **Step 12: Commit**

```bash
git add components/feed/edit components/feed/layout/FeedCoverBlock.tsx
git commit -m "KAN-245: feed edit mode components"
```

---

### Task 11: Wire edit mode into the feed

**Files:**
- Modify: `app/(main)/(app)/(event)/events/[eventId]/feed/FeedPageContent.tsx`

- [ ] **Step 1: Switch the top**

Import `FeedEditPill` (`@/components/feed/edit/FeedEditPill`), `LazyFeedEditTop` (`@/components/feed/edit/LazyFeedEditTop`) and `useFeedEditMode` (`@/hooks/useFeedEditMode`). Under `const top = useFeedTop(event);` add:

```tsx
    const editMode = useFeedEditMode(event, isHost);
    const topParts = {
        cover: (
            <FeedCoverBlock
                event={event}
                isHost={isHost}
                wishlist={moduleFlags.wishlist}
                corner={editMode.canEdit && !editMode.editing ? <FeedEditPill onClick={editMode.start} /> : undefined}
            />
        ),
        details: <FeedDetailsBlock event={event} />,
        stories: moduleFlags.stories && (
            <section id="stories" className={cn('top-0 bg-event/90 backdrop-blur-sm')}>
                <StoriesRow eventId={eventId} onOpenStoryAction={openStoryModal} />
            </section>
        ),
        description: event.description && (
            <EventDescription eventId={event.id} description={event.description} keepShown={top.folds || editMode.editing} />
        ),
        rsvp: shouldShowRSVP ? <FeedRsvpBlock eventId={eventId} deadline={event.schedule.rsvpDeadline ?? null} /> : null,
    };
```

Copy each element's props from the current `<FeedTop … />` call rather than from this snippet, if they differ. Replace the `<FeedTop … />` element with:

```tsx
            {/* Invitation blocks, stories and RSVP */}
            {editMode.editing ? <LazyFeedEditTop event={event} onDone={editMode.finish} {...topParts} /> : <FeedTop view={top} {...topParts} />}
```

Leave the rest of the file as it is.

- [ ] **Step 2: Run the feed tests**

Run: `npx vitest run "app/(main)/(app)/(event)/events/[eventId]/feed"`
Expected: PASS. Nothing changes for members, or with the flag off.

- [ ] **Step 3: Commit**

```bash
git add "app/(main)/(app)/(event)/events/[eventId]/feed/FeedPageContent.tsx"
git commit -m "KAN-245: hosts can open edit mode on the feed"
```

---

### Task 12: Integration test through the feed page

**Files:**
- Modify: `app/(main)/(app)/(event)/events/[eventId]/feed/FeedPageContent.test.tsx`

The file mocks `next-intl` so every label is the key the component passes to `t` (`t('hide')` on `InvitationEditor.sections` shows `hide`). It also stubs the banner.

- [ ] **Step 1: Extend the harness**

Add to the mocks at the top:

```ts
const api = vi.hoisted(() => ({ put: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/api/client')>();
    return { ...actual, api: { ...actual.api, put: api.put } };
});
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
    usePathname: () => '/events/e-1/feed',
    useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/hooks/usePlanUpgradeHref', () => ({ usePlanUpgradeHref: () => '/events/e-1/manage?tab=billing' }));
```

If `next/navigation` is already mocked in the file, extend that mock instead of adding a second one.

Change `FeedOptions` and `renderFeed`:

```ts
type FeedOptions = {
    description?: string | null;
    endAt?: string | null;
    layout?: FeedLayoutDto | null;
    flag?: boolean;
    isHost?: boolean;
    modules?: { moduleKey: string; isAvailable: boolean; isEnabled: boolean }[];
};
```

In `renderFeed`:
- destructure `isHost = false, modules = []`;
- add `status: 'ACTIVE', eventType: 'WEDDING', hosts: [], modules` to the event;
- put `isHost` in the provider value.

Add `waitFor` and `within` to the `@testing-library/react` import.

- [ ] **Step 2: Write the cases**

```tsx
describe('FeedPageContent edit mode', { timeout: 15_000 }, () => {
    afterEach(() => api.put.mockReset());

    it('shows Edit to a host only', async () => {
        renderFeed(null, { flag: true, layout: savedLayout(), isHost: true });
        expect(await screen.findByRole('button', { name: 'edit' })).toBeTruthy();
        cleanup();
        renderFeed(null, { flag: true, layout: savedLayout(), isHost: false });
        expect(screen.queryByRole('button', { name: 'edit' })).toBeNull();
    });

    it('lists every block while editing, and Cancel leaves at once with no changes', async () => {
        renderFeed(null, { flag: true, layout: savedLayout(dressCode), isHost: true });
        fireEvent.click(await screen.findByRole('button', { name: 'edit' }));
        expect(await screen.findByRole('group', { name: 'sectionNames.feedCover' }, LAZY_LOOK)).toBeTruthy();
        expect(screen.getByRole('group', { name: 'sectionNames.feedRsvp' })).toBeTruthy();
        expect(screen.getByRole('group', { name: `sectionNames.${dressCode.type}` })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'cancel' }));
        expect(await screen.findByRole('button', { name: 'edit' })).toBeTruthy();
    });

    it('gives the cover no eye', async () => {
        renderFeed(null, { flag: true, layout: savedLayout(), isHost: true });
        fireEvent.click(await screen.findByRole('button', { name: 'edit' }));
        const cover = await screen.findByRole('group', { name: 'sectionNames.feedCover' }, LAZY_LOOK);
        expect(within(cover).queryByRole('button', { name: 'hide' })).toBeNull();
    });

    it('hides a block and saves the layout with its revision', async () => {
        api.put.mockResolvedValue({ revision: 2, updatedAt: '2026-11-22T10:00:00Z' });
        renderFeed(null, { flag: true, layout: savedLayout(), isHost: true });
        fireEvent.click(await screen.findByRole('button', { name: 'edit' }));
        const rsvp = await screen.findByRole('group', { name: 'sectionNames.feedRsvp' }, LAZY_LOOK);
        fireEvent.click(within(rsvp).getByRole('button', { name: 'hide' }));
        expect(within(rsvp).getByText('hidden')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'save' }));
        await waitFor(() => expect(api.put).toHaveBeenCalledOnce());
        const [, body] = api.put.mock.calls[0];
        expect(body.revision).toBe(1);
        expect(body.document.sections.find((section: InvitationSection) => section.type === 'feedRsvp').visible).toBe(false);
    });

    it('asks before Cancel drops changes', async () => {
        renderFeed(null, { flag: true, layout: savedLayout(), isHost: true });
        fireEvent.click(await screen.findByRole('button', { name: 'edit' }));
        const rsvp = await screen.findByRole('group', { name: 'sectionNames.feedRsvp' }, LAZY_LOOK);
        fireEvent.click(within(rsvp).getByRole('button', { name: 'hide' }));
        fireEvent.click(screen.getByRole('button', { name: 'cancel' }));
        expect(await screen.findByText('leaveTitle')).toBeTruthy();
    });

    it('locks Add section without Save my date', async () => {
        renderFeed(null, { flag: true, layout: savedLayout(), isHost: true });
        fireEvent.click(await screen.findByRole('button', { name: 'edit' }));
        expect((await screen.findAllByText('locked', {}, LAZY_LOOK)).length).toBeGreaterThan(0);
    });
});
```

If a stubbed child gets in the way (the `EventDescription` stub, or the `RsvpPrompt` stub drawing a test id), keep the stubs and change only the query. The assertions themselves stay as written.

- [ ] **Step 3: Run it**

Run: `npx vitest run "app/(main)/(app)/(event)/events/[eventId]/feed"`
Expected: PASS. Keep `LAZY_LOOK` on the first `findBy` after tapping Edit, because the edit code loads lazily.

- [ ] **Step 4: Commit**

```bash
git add "app/(main)/(app)/(event)/events/[eventId]/feed/FeedPageContent.test.tsx"
git commit -m "KAN-245: feed edit mode integration tests"
```

---

### Task 13: Stories, checks and a browser check

**Files:**
- Create: `components/feed/edit/FeedEditPills.stories.tsx`, `components/feed/edit/FeedAddSectionRow.stories.tsx`, `components/feed/edit/FeedEditBlock.stories.tsx`

- [ ] **Step 1: Write the stories**

Copy the Storybook import path, title prefix and decorators from `components/feed/layout/FeedTop.stories.tsx`. The code below assumes `@storybook/nextjs-vite` and `storybook/test`; change the imports to match that file if they differ.

`FeedEditPills.stories.tsx`:
```tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { FeedEditPills } from '@/components/feed/edit/FeedEditPills';

const meta = {
    title: 'Feed/Edit/FeedEditPills',
    component: FeedEditPills,
    args: { saving: false, failed: false, onCancel: fn(), onSave: fn() },
} satisfies Meta<typeof FeedEditPills>;
export default meta;

type Story = StoryObj<typeof meta>;
export const Idle: Story = {};
export const Saving: Story = { args: { saving: true } };
export const Failed: Story = { args: { failed: true } };
```

`FeedAddSectionRow.stories.tsx`:
```tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { FeedAddSectionRow } from '@/components/feed/edit/FeedAddSectionRow';

const meta = {
    title: 'Feed/Edit/FeedAddSectionRow',
    component: FeedAddSectionRow,
    args: { locked: false, canBuy: true, onAdd: fn() },
} satisfies Meta<typeof FeedAddSectionRow>;
export default meta;

type Story = StoryObj<typeof meta>;
export const Open: Story = {};
export const Locked: Story = { args: { locked: true } };
export const LockedForCoHost: Story = { args: { locked: true, canBuy: false } };
```

`FeedEditBlock.stories.tsx`:
```tsx
import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { FeedEditBlock } from '@/components/feed/edit/FeedEditBlock';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';

const section = { ...(SAMPLE_SECTIONS.dressCode as InvitationSection), id: 'dress' };

const meta = {
    title: 'Feed/Edit/FeedEditBlock',
    component: FeedEditBlock,
    decorators: [
        (Story) => (
            <DndContext>
                <SortableContext items={['dress']}>
                    <Story />
                </SortableContext>
            </DndContext>
        ),
    ],
    args: {
        section,
        // Story data standing in for the translated block name.
        name: 'Dress code',
        controls: { canHide: true, canDelete: true, movable: true, canMoveUp: true, canMoveDown: false },
        hasSettings: true,
        actions: { onToggleVisible: fn(), onMove: fn(), onDelete: fn(), onOpenSettings: fn() },
        children: <div className="h-40 bg-[#f4efe9]" />,
    },
} satisfies Meta<typeof FeedEditBlock>;
export default meta;

type Story = StoryObj<typeof meta>;
export const Visible: Story = {};
export const Hidden: Story = { args: { section: { ...section, visible: false } } };
```

- [ ] **Step 2: Run every check**

Run, one at a time:
```bash
npx tsc --noEmit
npx eslint .
npx vitest run
npx next build --webpack
```
Expected:
- tsc: clean.
- eslint: 0 errors. Fix any warnings the new files add.
- vitest: all green. If a file fails, run it alone before calling it a flake (see memory "Release PRs 2026-11-15" for the known save-my-date timeouts).
- build: clean. Turbopack can't build from a worktree with a junctioned `node_modules`, hence `--webpack`.

Then run Storybook as `docs/storybook.md` says, so the new stories render.

- [ ] **Step 3: Browser check, signed in, at 375px and 1280px**

Run it against the local stack:
- the KAN-243 backend branch on :8090;
- the throwaway Postgres on :5544;
- this worktree's dev server on :3000.

Stop the KAN-244 dev server first: only one app can hold :3000 (see memory "Local backend CORS is :3000 only"). Open the pane only with `preview_start {url: "http://localhost:3000/"}`, never by name. Ask the owner for the local test login, and never write the password in chat.

Record pass or fail for each case:

| Case | Expected |
| --- | --- |
| a. Host opens the feed | The Edit pill sits on the cover's top corner and covers none of the banner's own buttons |
| b. Member view | No Edit pill |
| c. Tap Edit | Cancel and Save on the cover. Every block has its tools. The middle is open. RSVP and an empty description show by name. |
| d. Hide RSVP, then Save | "Saving…", then edit mode closes and the RSVP is gone for members |
| e. Hide a block, then Cancel | The leave dialog. Stay keeps the change; Leave drops it. |
| f. Phone Back with a change | The leave dialog |
| g. Tap the bottom nav with a change | The leave dialog; Leave goes there |
| h. Reload with a change | The browser's own leave prompt |
| i. Add section with Save my date | The add list offers only Save my date blocks. The new block appears at the end of the middle. |
| j. Drag and up/down on middle blocks | They move among themselves. Cover, details and RSVP stay put. |
| k. Delete a Save my date block | The delete dialog, then the block is gone |
| l. Type in a Save my date block's text | The text toolbar shows, and the change saves with Save |
| m. Pencil on cover, details and description | The event rows open the Settings page's editors and save the event at once |
| n. Pencil on a Save my date block | Its settings, with no photo upload group. A sheet at 375px, a right panel at 1280px. |
| o. Without Save my date | Add section shows the lock and "Needs Save my date". A tap asks first if there are changes, then opens Billing. |
| p. Save after someone else saved (bump the revision in the database) | The conflict dialog; Reload shows their layout |
| q. Layout at both widths | No sideways overflow, and `.smd-editor` changes nothing outside the tools |

After the check, run `git checkout -- AGENTS.md` if the dev server changed it (see memory "next dev edits AGENTS.md").

- [ ] **Step 4: Commit**

```bash
git add components/feed/edit/FeedEditPills.stories.tsx components/feed/edit/FeedAddSectionRow.stories.tsx components/feed/edit/FeedEditBlock.stories.tsx
git commit -m "KAN-245: feed edit mode stories"
```

---

## Not in this plan

- Photo uploads into feed blocks (gallery photos, backgrounds from the host's own photos). This needs a follow-up ticket.
- The guest view (`/q/{token}` signed out): KAN-246.
- Opening the KAN-243, KAN-244 and KAN-245 pull requests: only when the owner says so.
