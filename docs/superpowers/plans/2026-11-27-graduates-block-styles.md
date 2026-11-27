# Graduates block styles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hosts pick one of five looks for the feed's Graduates block (Plain, Cap, Stickers, Polaroids, Cover), each drawn in the theme's colours, with its own stories that use graduation photos.

**Architecture:** The block's data gets an optional `style` enum. `GraduatesSection` keeps the title and the grid and hands each graduate to one small component per style. Decorations are separate SVG components that take their alt text from the invitation's labels. Pure helpers (which style, which stickers where, how small a cover name gets) live in `lib/invitation/graduatesStyles.ts`. CSS goes in `invitation.css` next to the family rules. The backend schema gets the same enum in a guestwall-be PR, which merges before #444.

**Tech Stack:** Next.js 16, React 19, TypeScript, zod, Immer recipes, next-intl, vitest + Testing Library, Storybook (`@storybook/nextjs-vite`), sharp (photo conversion), guestwall-be (Spring, Gradle).

**Spec:** [2026-11-27-graduates-block-styles-design.md](../specs/2026-11-27-graduates-block-styles-design.md)

**Branch:** `claude/kan-302-graduates-block` (PR #444, worktree `.claude/worktrees/graduation-event-type-76222d`). Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and start with `KAN-302:`.

**Rules for whoever runs this plan:**
- Copy changes are already approved; the exact wording is in this plan. Change no other text.
- `next dev` adds a block to `AGENTS.md`. Revert it and stage files by name.
- Push only once, in Task 14, after the backend PR is open.

---

## File map

| File | Change |
| --- | --- |
| `lib/invitation/sections.ts` | `GRADUATES_STYLES`, `GraduatesStyle`, `style` on graduates data |
| `lib/invitation/newSection.ts` | new block starts with `style: 'cap'` |
| `lib/invitation/samples.ts` | sample graduates: style `cap`, graduation photo ids |
| `lib/invitation/sectionSettingsEdits.ts` | `setGraduatesStyle` |
| `lib/invitation/labels.ts` | 7 decoration labels, el + en |
| `lib/invitation/graduatesStyles.ts` (new) | `graduatesStyleOf`, `showsGraduatePhoto`, sticker arrangements, `coverNameScale` |
| `lib/invitation/graduatesStyles.test.ts` (new) | tests for the above |
| `messages/en.json`, `messages/el.json` | `graduatesStyle`, `graduatesStyles.*` under `InvitationEditor.sectionSettings` |
| `hooks/useGraduatesSettings.ts` | `styles`, `style`, `setStyle` |
| `components/saveMyDate/editor/settings/GraduatesSettings.tsx` | the Style row |
| `components/saveMyDate/invitation/sections/family/FamilyPhoto.tsx` | optional `className` |
| `components/saveMyDate/invitation/sections/family/GraduatesSection.tsx` | title + grid + switch by style |
| `components/saveMyDate/invitation/sections/family/graduates/GraduateName.tsx` (new) | name, degree, university texts |
| `.../graduates/PlainGraduate.tsx`, `CapGraduate.tsx`, `StickerGraduate.tsx`, `PolaroidGraduate.tsx`, `CoverGraduate.tsx` (new) | one graduate in each style |
| `.../graduates/PlacedStickers.tsx` (new) | stickers in fixed corners, around a photo or the title |
| `.../graduates/decorations/GraduationCap.tsx`, `Sticker.tsx`, `PolaroidTape.tsx` (new) | the drawings |
| `.../graduates/GraduatesStyles.test.tsx` (new) | render tests for every style |
| `components/saveMyDate/invitation/invitation.css` | the graduates style rules |
| `.storybook/assets/graduation/grad-1.webp` … `grad-7.webp` (new) | story photos |
| `.storybook/invitation.tsx` | media ids `m-grad-1..7`, `SectionStory` takes `canvasTools`, `storyGraduates` |
| `.../family/GraduatesSection.stories.tsx` | becomes the Plain stories |
| `.../graduates/CapGraduates.stories.tsx`, `StickerGraduates.stories.tsx`, `PolaroidGraduates.stories.tsx`, `CoverGraduates.stories.tsx` (new) | per-style stories |
| guestwall-be `src/main/resources/invitation/*.json`, `src/test/resources/invitation/*.json` | regenerated schema and samples |

---

### Task 1: The `style` field

**Files:**
- Modify: `lib/invitation/sections.ts` (next to `DATE_DISPLAY_STYLES` ~line 94; graduates data ~line 315)
- Modify: `lib/invitation/newSection.ts` (~line 215)
- Test: `lib/invitation/graduatesSection.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `lib/invitation/graduatesSection.test.ts` (it already imports `createSection`-style helpers; add the imports you need):

```ts
import { createSection } from '@/lib/invitation/newSection';
import { sectionSchema } from '@/lib/invitation/sections';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';

describe('graduates style', () => {
    const base = SAMPLE_SECTIONS.graduates;

    it('keeps one of the five styles and refuses others', () => {
        for (const style of ['plain', 'cap', 'stickers', 'polaroids', 'cover']) {
            expect(sectionSchema.safeParse({ ...base, data: { ...base.data, style } }).success).toBe(true);
        }
        expect(sectionSchema.safeParse({ ...base, data: { ...base.data, style: 'gold' } }).success).toBe(false);
    });

    it('reads a block saved before styles existed', () => {
        const data = { title: base.data.title, graduates: base.data.graduates };
        expect(sectionSchema.safeParse({ ...base, data }).success).toBe(true);
    });

    it('starts a new block with the cap', () => {
        let n = 0;
        const made = createSection('graduates', 'GRADUATION', () => `id-${++n}`);
        expect(made.type === 'graduates' && made.data.style).toBe('cap');
    });
});
```

Check `createSection`'s real signature in `lib/invitation/newSection.ts` before running; `newSection.test.ts:110` calls it as `createSection(type, eventType, counter())`.

- [ ] **Step 2: Run the tests and see them fail**

Run: `npx vitest run lib/invitation/graduatesSection.test.ts`
Expected: FAIL. Today `.strict()` refuses any `style` key, so the first test fails on `plain`; the cap test gets `undefined`.

- [ ] **Step 3: Add the enum and the field**

In `lib/invitation/sections.ts`, after `DATE_DISPLAY_STYLES`:

```ts
// The Graduates block's looks (KAN-302). A block saved before styles existed has none and draws as plain.
export const GRADUATES_STYLES = ['plain', 'cap', 'stickers', 'polaroids', 'cover'] as const;
export type GraduatesStyle = (typeof GRADUATES_STYLES)[number];
```

Change the graduates data schema:

```ts
graduates: z.object({ title: text, style: z.enum(GRADUATES_STYLES).optional(), graduates: z.array(graduateSchema).max(10) }).strict(),
```

In `lib/invitation/newSection.ts`:

```ts
graduates: (newId) => ({
    name: 'Απόφοιτοι',
    data: { title: 'Οι απόφοιτοί μας', style: 'cap', graduates: [{ id: newId(), name: '', degree: '', university: '' }] },
}),
```

- [ ] **Step 4: Run the tests and see them pass**

Run: `npx vitest run lib/invitation/graduatesSection.test.ts lib/invitation/newSection.test.ts lib/invitation/sections.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/invitation/sections.ts lib/invitation/newSection.ts lib/invitation/graduatesSection.test.ts
git commit -m "KAN-302: the Graduates block keeps a style, new blocks start with the cap"
```

---

### Task 2: Style helpers

**Files:**
- Create: `lib/invitation/graduatesStyles.ts`
- Test: `lib/invitation/graduatesStyles.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';

import {
    coverNameScale,
    graduatesStyleOf,
    showsGraduatePhoto,
    STICKER_ARRANGEMENTS,
    stickerArrangement,
    TITLE_STICKERS,
} from '@/lib/invitation/graduatesStyles';
import type { RenderContext } from '@/lib/invitation/render';

const ctx = (media: (id: string) => string | undefined, camera = false) =>
    ({ media, canvasTools: camera ? { photo: () => null } : undefined }) as unknown as RenderContext;

describe('graduatesStyleOf', () => {
    it('draws a block without a style as plain', () => {
        expect(graduatesStyleOf({})).toBe('plain');
        expect(graduatesStyleOf({ style: 'cover' })).toBe('cover');
    });
});

describe('showsGraduatePhoto', () => {
    it('shows the photo shape when there is a photo or the host can add one', () => {
        const photo = { source: 'media' as const, mediaId: 'm-1' };
        expect(showsGraduatePhoto(photo, ctx(() => '/a.png'))).toBe(true);
        expect(showsGraduatePhoto(undefined, ctx(() => undefined))).toBe(false);
        expect(showsGraduatePhoto(undefined, ctx(() => undefined, true))).toBe(true);
    });
});

describe('stickers', () => {
    it('cycles the arrangements by position', () => {
        expect(stickerArrangement(0)).toBe(STICKER_ARRANGEMENTS[0]);
        expect(stickerArrangement(STICKER_ARRANGEMENTS.length)).toBe(STICKER_ARRANGEMENTS[0]);
        expect(stickerArrangement(1)).toBe(STICKER_ARRANGEMENTS[1]);
    });

    it('never puts two stickers in one corner', () => {
        for (const arrangement of [...STICKER_ARRANGEMENTS, TITLE_STICKERS]) {
            const spots = arrangement.map((sticker) => sticker.spot);
            expect(new Set(spots).size).toBe(spots.length);
        }
    });
});

describe('coverNameScale', () => {
    it('keeps short names full size and shrinks long ones, down to a floor', () => {
        expect(coverNameScale('Μαρία')).toBe(1);
        expect(coverNameScale('Αλεξάνδρα-Παναγιώτα')).toBeLessThan(1);
        expect(coverNameScale('Αλεξάνδρα-Παναγιώτα Παπαδημητροπούλου')).toBe(0.6);
    });
});
```

`resolveImage` reads the photo through `ctx.media`; check its body in `lib/invitation/render.ts` and add whatever else it reads to the fake `ctx`.

- [ ] **Step 2: Run and see it fail**

Run: `npx vitest run lib/invitation/graduatesStyles.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Write the helpers**

```ts
import type { ImageRef } from '@/lib/invitation/primitives';
import { type RenderContext, resolveImage } from '@/lib/invitation/render';
import type { GraduatesStyle } from '@/lib/invitation/sections';

// The Graduates block's looks (KAN-302): which one a block draws, and the fixed parts of each.

export function graduatesStyleOf(data: { style?: GraduatesStyle }): GraduatesStyle {
    return data.style ?? 'plain';
}

// Guests see a photo only when there is one; a host editing the feed also sees the empty
// shape, to add one.
export function showsGraduatePhoto(photo: ImageRef | undefined, ctx: RenderContext): boolean {
    return Boolean(resolveImage(photo, ctx) || ctx.canvasTools?.photo);
}

// The sticker kinds match the invitation labels that name them.
export type StickerKind = 'diploma' | 'books' | 'champagne' | 'star' | 'confetti';
export type StickerSpot = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type StickerPlacement = { kind: StickerKind; spot: StickerSpot; tilt: number };

// Around each photo, by the graduate's place in the list. Hosts can't move them.
export const STICKER_ARRANGEMENTS: readonly (readonly StickerPlacement[])[] = [
    [
        { kind: 'diploma', spot: 'top-right', tilt: 12 },
        { kind: 'star', spot: 'bottom-left', tilt: 18 },
    ],
    [
        { kind: 'books', spot: 'top-right', tilt: -8 },
        { kind: 'champagne', spot: 'bottom-left', tilt: -14 },
    ],
    [
        { kind: 'books', spot: 'top-left', tilt: 8 },
        { kind: 'star', spot: 'top-right', tilt: -10 },
        { kind: 'confetti', spot: 'bottom-right', tilt: 0 },
    ],
];

// Around the block's title.
export const TITLE_STICKERS: readonly StickerPlacement[] = [
    { kind: 'star', spot: 'top-left', tilt: -12 },
    { kind: 'confetti', spot: 'top-right', tilt: 0 },
];

export function stickerArrangement(index: number): readonly StickerPlacement[] {
    return STICKER_ARRANGEMENTS[index % STICKER_ARRANGEMENTS.length];
}

// A cover name shrinks to fit the card before it wraps: full size up to 12 letters, never
// below 60%.
const FULL_SIZE_LETTERS = 12;
const SMALLEST_NAME = 0.6;

export function coverNameScale(name: string): number {
    const letters = name.trim().length;
    if (letters <= FULL_SIZE_LETTERS) return 1;
    return Math.max(SMALLEST_NAME, Math.round((FULL_SIZE_LETTERS / letters) * 100) / 100);
}
```

- [ ] **Step 4: Run and see it pass**

Run: `npx vitest run lib/invitation/graduatesStyles.test.ts`
Expected: PASS. If `'Αλεξάνδρα-Παναγιώτα'` (19 letters → 0.63) is off, the test only asks for `< 1`.

- [ ] **Step 5: Commit**

```bash
git add lib/invitation/graduatesStyles.ts lib/invitation/graduatesStyles.test.ts
git commit -m "KAN-302: helpers for the Graduates styles"
```

---

### Task 3: Decoration labels

**Files:**
- Modify: `lib/invitation/labels.ts` (type ~line 29, el ~line 94, en ~line 141)

- [ ] **Step 1: Add the labels** (owner approved, 2026-11-27)

In the `InvitationLabels` type, after `photoAlt: string;`:

```ts
    // The Graduates block's drawings (KAN-302).
    graduationCap: string;
    diploma: string;
    books: string;
    champagne: string;
    star: string;
    confetti: string;
    tape: string;
```

In `el`, after `photoAlt`:

```ts
        graduationCap: 'Καπέλο αποφοίτησης',
        diploma: 'Δίπλωμα',
        books: 'Βιβλία',
        champagne: 'Σαμπάνια',
        star: 'Αστέρι',
        confetti: 'Κομφετί',
        tape: 'Ταινία',
```

In `en`, after `photoAlt`:

```ts
        graduationCap: 'Graduation cap',
        diploma: 'Diploma',
        books: 'Books',
        champagne: 'Champagne',
        star: 'Star',
        confetti: 'Confetti',
        tape: 'Tape',
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0. A missing key in one language fails here.

- [ ] **Step 3: Commit**

```bash
git add lib/invitation/labels.ts
git commit -m "KAN-302: alt text for the Graduates drawings, in both invitation languages"
```

---

### Task 4: The drawings

**Files:**
- Create: `components/saveMyDate/invitation/sections/family/graduates/decorations/GraduationCap.tsx`
- Create: `components/saveMyDate/invitation/sections/family/graduates/decorations/Sticker.tsx`
- Create: `components/saveMyDate/invitation/sections/family/graduates/decorations/PolaroidTape.tsx`
- Test: `components/saveMyDate/invitation/sections/family/graduates/decorations/decorations.test.tsx`

Colours come from CSS variables that Task 7 defines on `.graduates-block`: `--primary` and `--site-text` (theme), and `--grad-accent`, `--grad-rose`, `--grad-soft`, `--grad-deep` (mixes of the primary colour). SVG presentation attributes don't read CSS variables, so fills that use them go through `style`.

- [ ] **Step 1: Write the failing test**

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { GraduationCap } from '@/components/saveMyDate/invitation/sections/family/graduates/decorations/GraduationCap';
import { PolaroidTape } from '@/components/saveMyDate/invitation/sections/family/graduates/decorations/PolaroidTape';
import { Sticker } from '@/components/saveMyDate/invitation/sections/family/graduates/decorations/Sticker';
import { INVITATION_LABELS } from '@/lib/invitation/labels';

afterEach(cleanup);

const labels = INVITATION_LABELS.el;

describe('graduates drawings', () => {
    it('names every drawing in the invitation language', () => {
        render(
            <>
                <GraduationCap labels={labels} />
                <PolaroidTape labels={labels} />
                {(['diploma', 'books', 'champagne', 'star', 'confetti'] as const).map((kind) => (
                    <Sticker key={kind} kind={kind} labels={labels} />
                ))}
            </>,
        );
        for (const name of ['Καπέλο αποφοίτησης', 'Ταινία', 'Δίπλωμα', 'Βιβλία', 'Σαμπάνια', 'Αστέρι', 'Κομφετί']) {
            expect(screen.getByRole('img', { name })).toBeTruthy();
        }
    });
});
```

- [ ] **Step 2: Run and see it fail**

Run: `npx vitest run components/saveMyDate/invitation/sections/family/graduates/decorations`
Expected: FAIL, modules not found.

- [ ] **Step 3: Write `GraduationCap.tsx`**

```tsx
import type { InvitationLabels } from '@/lib/invitation/labels';

const INK = { fill: 'var(--site-text)' };
const TASSEL = { fill: 'var(--primary)' };

// A mortarboard with a hanging tassel: the board in the theme's text colour, the tassel in its
// primary colour.
export function GraduationCap({ labels, className = '' }: { labels: InvitationLabels; className?: string }) {
    return (
        <svg viewBox="0 0 120 92" role="img" aria-label={labels.graduationCap} className={['grad-cap', className].filter(Boolean).join(' ')}>
            <path d="M30 40 v24 c0 12 60 12 60 0 v-24 z" style={INK} />
            <path d="M30 52 c0 9 60 9 60 0" fill="none" stroke="#fff" strokeOpacity={0.12} strokeWidth={3} />
            <polygon points="60,6 116,30 60,54 4,30" style={INK} />
            <polygon points="60,6 116,30 60,30" fill="#fff" fillOpacity={0.1} />
            <polygon points="60,54 116,30 116,33 60,57 4,33 4,30" fill="#000" fillOpacity={0.3} />
            <circle cx="60" cy="30" r="3.4" style={TASSEL} />
            <path d="M60 30 C80 34 92 36 100 40 L100 70" fill="none" strokeWidth={2.6} style={{ stroke: 'var(--primary)' }} />
            <path d="M96 70 h8 l2 16 h-12 z" style={TASSEL} />
        </svg>
    );
}
```

- [ ] **Step 4: Write `Sticker.tsx`**

```tsx
import type { ReactNode } from 'react';

import type { InvitationLabels } from '@/lib/invitation/labels';
import type { StickerKind } from '@/lib/invitation/graduatesStyles';

const fill = (color: string) => ({ fill: color });
// The white die-cut edge under every sticker.
const EDGE = { stroke: '#fff', strokeLinejoin: 'round' as const, paintOrder: 'stroke' as const };

const DRAWINGS: Record<StickerKind, { viewBox: string; body: ReactNode }> = {
    diploma: {
        viewBox: '0 0 120 70',
        body: (
            <>
                <g {...EDGE} strokeWidth={9}>
                    <rect x="16" y="16" width="92" height="34" rx="17" fill="#fbf6ea" />
                    <ellipse cx="18" cy="33" rx="9" ry="17" fill="#efe4cc" />
                </g>
                <ellipse cx="18" cy="33" rx="4" ry="9" fill="#d8c9a6" />
                <path d="M30 26h66M30 33h56M30 40h62" stroke="#e2d6bb" strokeWidth={2} />
                <rect x="58" y="14" width="13" height="38" style={fill('var(--primary)')} />
                <path d="M64 52 l-9 15 6-2 3 5 M65 52 l9 15-6-2-3 5" style={fill('var(--primary)')} />
            </>
        ),
    },
    books: {
        viewBox: '0 0 110 80',
        body: (
            <>
                <g {...EDGE} strokeWidth={8}>
                    <rect x="8" y="52" width="94" height="20" rx="3" style={fill('var(--primary)')} />
                    <rect x="16" y="32" width="80" height="20" rx="3" style={fill('var(--grad-rose)')} />
                    <rect x="10" y="12" width="84" height="20" rx="3" fill="#f2e3c2" />
                </g>
                <path d="M20 58h70M26 38h58M20 18h62" stroke="rgba(255,255,255,.55)" strokeWidth={2} />
            </>
        ),
    },
    champagne: {
        viewBox: '0 0 70 110',
        body: (
            <>
                <g {...EDGE} strokeWidth={8}>
                    <path
                        d="M26 44 c-8 8 -10 18 -10 30 v28 c0 4 3 6 6 6 h26 c3 0 6-2 6-6 v-28 c0-12-2-22-10-30 v-18 h-18 z"
                        style={fill('var(--grad-deep)')}
                    />
                </g>
                <rect x="26" y="20" width="18" height="10" style={fill('var(--grad-accent)')} />
                <rect x="16" y="66" width="38" height="24" rx="2" fill="#f6efe0" />
                <path d="M24 74h22M27 81h16" strokeWidth={2.4} style={{ stroke: 'var(--primary)' }} />
                <circle cx="44" cy="10" r="5" style={fill('var(--grad-accent)')} />
                <circle cx="56" cy="16" r="3.2" style={fill('var(--grad-soft)')} />
                <circle cx="30" cy="6" r="3" style={fill('var(--grad-rose)')} />
                <circle cx="60" cy="4" r="2.4" style={fill('var(--grad-accent)')} />
            </>
        ),
    },
    star: {
        viewBox: '0 0 40 40',
        body: (
            <path
                d="M20 3 l5 11 12 1.4-9 8 2.6 12L20 29.5 9.4 35.4 12 23.4l-9-8L15 14z"
                {...EDGE}
                strokeWidth={5}
                style={fill('var(--grad-accent)')}
            />
        ),
    },
    confetti: {
        viewBox: '0 0 60 40',
        body: (
            <>
                <rect x="4" y="8" width="8" height="4" rx="1" transform="rotate(-20 8 10)" style={fill('var(--grad-soft)')} />
                <rect x="24" y="2" width="8" height="4" rx="1" transform="rotate(25 28 4)" style={fill('var(--grad-accent)')} />
                <circle cx="46" cy="12" r="3" style={fill('var(--grad-rose)')} />
                <rect x="14" y="26" width="8" height="4" rx="1" transform="rotate(40 18 28)" style={fill('var(--grad-rose)')} />
                <circle cx="38" cy="30" r="2.6" style={fill('var(--primary)')} />
                <rect x="48" y="28" width="7" height="3.6" rx="1" transform="rotate(-35 51 30)" style={fill('var(--grad-soft)')} />
            </>
        ),
    },
};

type StickerProps = { kind: StickerKind; labels: InvitationLabels; className?: string; tilt?: number };

// A die-cut sticker: white outline, soft shadow, colours mixed with the theme's primary colour.
export function Sticker({ kind, labels, className = '', tilt = 0 }: StickerProps) {
    const { viewBox, body } = DRAWINGS[kind];
    return (
        <svg
            viewBox={viewBox}
            role="img"
            aria-label={labels[kind]}
            className={['grad-sticker', `grad-sticker-${kind}`, className].filter(Boolean).join(' ')}
            style={{ rotate: `${tilt}deg` }}
        >
            {body}
        </svg>
    );
}
```

- [ ] **Step 5: Write `PolaroidTape.tsx`**

```tsx
import type { InvitationLabels } from '@/lib/invitation/labels';

// The strip of tape holding a polaroid, in a see-through tint of the theme's primary colour.
export function PolaroidTape({ labels }: { labels: InvitationLabels }) {
    return (
        <svg viewBox="0 0 92 26" role="img" aria-label={labels.tape} className="grad-tape">
            <rect width="92" height="26" style={{ fill: 'color-mix(in srgb, var(--primary) 35%, rgb(255 255 255 / 0.55))' }} />
        </svg>
    );
}
```

- [ ] **Step 6: Run and see it pass**

Run: `npx vitest run components/saveMyDate/invitation/sections/family/graduates/decorations`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/saveMyDate/invitation/sections/family/graduates/decorations
git commit -m "KAN-302: the cap, sticker and tape drawings, in the theme's colours"
```

---

### Task 5: Split the block by style, Plain first

This task changes no pixels: a block without a style draws exactly as today.

**Files:**
- Modify: `components/saveMyDate/invitation/sections/family/FamilyPhoto.tsx`
- Create: `.../family/graduates/GraduateName.tsx`, `.../family/graduates/PlainGraduate.tsx`
- Modify: `.../family/GraduatesSection.tsx`
- Test: existing `.../family/GraduatesSection.test.tsx` (must stay green unchanged)

- [ ] **Step 1: Let `FamilyPhoto` take a class**

```tsx
type FamilyPhotoProps = {
    photo: ImageRef | undefined;
    // Whose photo it is, as written on the invitation.
    name: string;
    // Where the photo is kept, for the editor's camera.
    sectionId: string;
    path: string;
    ctx: RenderContext;
    // Extra classes for a style's own photo shape (the Graduates styles).
    className?: string;
};

export function FamilyPhoto({ photo, name, sectionId, path, ctx, className = '' }: FamilyPhotoProps) {
    // ...unchanged down to the shape:
    const shape = (
        <div className={['family-photo', className].filter(Boolean).join(' ')}>
```

- [ ] **Step 2: Write `GraduateName.tsx`**

The shared texts. `joined` puts degree and university on one line with " · " (Polaroids); each stays its own editable field.

```tsx
import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import { showsText } from '@/lib/invitation/listContent';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

export type GraduatesBlock = Extract<InvitationSection, { type: 'graduates' }>;
export type Graduate = GraduatesBlock['data']['graduates'][number];

export type GraduateProps = {
    section: GraduatesBlock;
    graduate: Graduate;
    // The graduate's place in the list, from 0.
    index: number;
    contrast: TextContrast;
    ctx: RenderContext;
};

// A graduate's name.
export function GraduateNameText({ section, graduate, contrast, ctx, className }: GraduateProps & { className?: string }) {
    if (!showsText(graduate.name, ctx)) return null;
    return (
        <SectionText
            section={section}
            path={`graduates.${graduate.id}.name`}
            value={graduate.name}
            tag="h2"
            className={className}
            contrast={contrast}
            ctx={ctx}
        />
    );
}

// A graduate's degree and university: one line each, or one line together.
export function GraduateDetails({ section, graduate, contrast, ctx, joined = false }: GraduateProps & { joined?: boolean }) {
    const path = `graduates.${graduate.id}`;
    const degree = showsText(graduate.degree, ctx);
    const university = showsText(graduate.university, ctx);
    const tag = joined ? 'span' : 'small';
    const className = joined ? undefined : 'family-graduate-detail';
    const lines = (
        <>
            {degree && (
                <SectionText section={section} path={`${path}.degree`} value={graduate.degree} tag={tag} className={className} contrast={contrast} ctx={ctx} />
            )}
            {joined && degree && university && <span aria-hidden="true"> · </span>}
            {university && (
                <SectionText section={section} path={`${path}.university`} value={graduate.university} tag={tag} className={className} contrast={contrast} ctx={ctx} />
            )}
        </>
    );
    if (!joined) return lines;
    return degree || university ? <p className="grad-joined-detail">{lines}</p> : null;
}
```

Check `SectionText`'s `tag` type (`FieldTag` in `lib/invitation/sectionCss.ts`) accepts `'span'`. If it doesn't, add `'span'` to `FieldTag` and run `npx tsc --noEmit`.

- [ ] **Step 3: Write `PlainGraduate.tsx`**

```tsx
import { FamilyPhoto } from '@/components/saveMyDate/invitation/sections/family/FamilyPhoto';
import { GraduateDetails, GraduateNameText, type GraduateProps } from '@/components/saveMyDate/invitation/sections/family/graduates/GraduateName';

// Today's look: the photo, then name, degree and university.
export function PlainGraduate(props: GraduateProps) {
    const { section, graduate, ctx } = props;
    return (
        <div className="family-godparent">
            {/* Photo */}
            <FamilyPhoto photo={graduate.photo} name={graduate.name} sectionId={section.id} path={`graduates.${graduate.id}.photo`} ctx={ctx} />
            {/* Name */}
            <GraduateNameText {...props} />
            {/* Degree and university */}
            <GraduateDetails {...props} />
        </div>
    );
}
```

- [ ] **Step 4: Rewrite `GraduatesSection.tsx` around a switch**

```tsx
import type { ComponentType } from 'react';

import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import type { GraduateProps } from '@/components/saveMyDate/invitation/sections/family/graduates/GraduateName';
import { PlainGraduate } from '@/components/saveMyDate/invitation/sections/family/graduates/PlainGraduate';
import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import { graduatesStyleOf } from '@/lib/invitation/graduatesStyles';
import { graduateHasContent, visibleItems } from '@/lib/invitation/listContent';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import type { GraduatesStyle, InvitationSection } from '@/lib/invitation/sections';

type GraduatesSectionProps = {
    section: Extract<InvitationSection, { type: 'graduates' }>;
    contrast: TextContrast;
    ctx: RenderContext;
};

// One graduate in each of the block's looks.
const GRADUATE_BY_STYLE: Record<GraduatesStyle, ComponentType<GraduateProps>> = {
    plain: PlainGraduate,
    cap: PlainGraduate,
    stickers: PlainGraduate,
    polaroids: PlainGraduate,
    cover: PlainGraduate,
};

// The graduates (KAN-302): the people grid of the godparents and sponsors, in the look the host picked.
export function GraduatesSection({ section, contrast, ctx }: GraduatesSectionProps) {
    const style = graduatesStyleOf(section.data);
    const GraduateItem = GRADUATE_BY_STYLE[style];

    return (
        <div className="section-inner">
            <div className={`family-block family-godparents graduates-block graduates-${style}`}>
                {/* Title */}
                <div className="grad-title">
                    <SectionText section={section} path="title" value={section.data.title} tag="h3" className="family-title" contrast={contrast} ctx={ctx} />
                </div>
                {/* Graduates */}
                <div className="family-godparents-list">
                    {visibleItems(section.data.graduates, graduateHasContent, ctx).map((graduate, index) => (
                        <GraduateItem key={graduate.id} section={section} graduate={graduate} index={index} contrast={contrast} ctx={ctx} />
                    ))}
                </div>
            </div>
            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}
```

Tasks 7 to 10 swap each entry for its own component. The `.grad-title` wrapper has no CSS until Task 8, so Plain looks the same.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run components/saveMyDate/invitation lib/invitation`
Expected: PASS, with `GraduatesSection.test.tsx` unchanged.

- [ ] **Step 6: Commit**

```bash
git add components/saveMyDate/invitation/sections/family
git commit -m "KAN-302: the Graduates block draws each graduate through its style"
```

---

### Task 6: The Style picker

**Files:**
- Modify: `lib/invitation/sectionSettingsEdits.ts`
- Modify: `messages/en.json`, `messages/el.json` (`InvitationEditor.sectionSettings`, next to `dateLayout`)
- Modify: `hooks/useGraduatesSettings.ts`, `components/saveMyDate/editor/settings/GraduatesSettings.tsx`
- Test: `lib/invitation/sectionSettings.test.ts`

- [ ] **Step 1: Write the failing test**

Next to the `setDateLayout` test in `lib/invitation/sectionSettings.test.ts` (it uses the file's own `documentWith`, `run` and `sectionOf`), and add `setGraduatesStyle` to the import from `sectionSettingsEdits`:

```ts
it('sets the Graduates style', () => {
    const doc = documentWith(SAMPLE_SECTIONS.graduates);
    const id = SAMPLE_SECTIONS.graduates.id;
    expect(sectionOf(run(doc, setGraduatesStyle(id, 'polaroids')), 'graduates').data.style).toBe('polaroids');
});
```

- [ ] **Step 2: Run and see it fail**

Run: `npx vitest run lib/invitation/sectionSettings.test.ts`
Expected: FAIL, `setGraduatesStyle` is not exported.

- [ ] **Step 3: Add the edit**

In `lib/invitation/sectionSettingsEdits.ts`, add `type GraduatesStyle` to the `sections` import, then:

```ts
export function setGraduatesStyle(id: string, style: GraduatesStyle): DocumentRecipe {
    return editSectionData(id, 'graduates', (data) => {
        data.style = style;
    });
}
```

- [ ] **Step 4: Run and see it pass**

Run: `npx vitest run lib/invitation/sectionSettings.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the copy** (owner approved, 2026-11-27)

In `messages/en.json` under `InvitationEditor.sectionSettings`, after the `dateLayouts` object:

```json
"graduatesStyle": "Style",
"graduatesStyles": {
    "plain": "Plain",
    "cap": "Cap",
    "stickers": "Stickers",
    "polaroids": "Polaroids",
    "cover": "Cover"
},
```

In `messages/el.json`, same place:

```json
"graduatesStyle": "Στιλ",
"graduatesStyles": {
    "plain": "Απλό",
    "cap": "Καπέλο",
    "stickers": "Αυτοκόλλητα",
    "polaroids": "Πολαρόιντ",
    "cover": "Εξώφυλλο"
},
```

Check that both files still parse: `node -e "require('./messages/en.json');require('./messages/el.json')"`.

- [ ] **Step 6: Expose the style from the hook**

`hooks/useGraduatesSettings.ts`:

```ts
'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import { useListSettings } from '@/hooks/useListSettings';
import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';
import { graduatesStyleOf } from '@/lib/invitation/graduatesStyles';
import type { ListItem } from '@/lib/invitation/listEdits';
import { GRADUATES_STYLES, type GraduatesStyle } from '@/lib/invitation/sections';
import { setGraduatesStyle } from '@/lib/invitation/sectionSettingsEdits';

// The graduates of a Graduates block: its style, rows by name, and the fields of the one open. Their
// photos stay on the block itself, as the godparents' do.
export function useGraduatesSettings(scope: SettingsScope<SectionOf<'graduates'>>) {
    const t = useTranslations('InvitationEditor');
    const { section, edit } = scope;
    const labelOf = useCallback((graduate: ListItem<'graduates'>) => graduate.name.trim() || t('sectionSettings.untitled'), [t]);
    const list = useListSettings(scope, 'graduates', labelOf);
    const styles = useMemo(() => GRADUATES_STYLES.map((value) => ({ value, label: t(`sectionSettings.graduatesStyles.${value}`) })), [t]);
    const setStyle = useCallback((style: GraduatesStyle) => edit(setGraduatesStyle(section.id, style)), [edit, section.id]);

    return {
        list,
        title: t('sectionNames.graduates'),
        addLabel: t('sectionSettings.addGraduate'),
        styleLabel: t('sectionSettings.graduatesStyle'),
        styles,
        style: graduatesStyleOf(section.data),
        setStyle,
        setName: list.fieldSaver('name'),
        setDegree: list.fieldSaver('degree'),
        setUniversity: list.fieldSaver('university'),
    };
}
```

- [ ] **Step 7: Draw the row**

`components/saveMyDate/editor/settings/GraduatesSettings.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { SettingsChoices } from '@/components/saveMyDate/editor/settings/SettingsChoices';
import { SettingsGroup } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { SettingsList } from '@/components/saveMyDate/editor/settings/SettingsList';
import { SettingsTextField } from '@/components/saveMyDate/editor/settings/SettingsTextField';
import { useGraduatesSettings } from '@/hooks/useGraduatesSettings';
import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';

// The graduates: the block's style, rows, and one graduate's name, degree and university at a time.
export function GraduatesSettings({ scope }: { scope: SettingsScope<SectionOf<'graduates'>> }) {
    const t = useTranslations('InvitationEditor.sectionSettings');
    const { list, title, addLabel, styleLabel, styles, style, setStyle, setName, setDegree, setUniversity } = useGraduatesSettings(scope);

    return (
        <>
            {/* Style */}
            <SettingsGroup>
                <SettingsChoices label={styleLabel} choices={styles} value={style} onChange={setStyle} columns={3} />
            </SettingsGroup>
            {/* Graduates */}
            <SettingsList title={title} addLabel={addLabel} list={list}>
                {list.item && (
                    <>
                        {/* Name */}
                        <SettingsTextField label={t('name')} value={list.item.name} onSave={setName} />
                        {/* Degree */}
                        <SettingsTextField label={t('degree')} value={list.item.degree} onSave={setDegree} />
                        {/* University */}
                        <SettingsTextField label={t('university')} value={list.item.university} onSave={setUniversity} />
                    </>
                )}
            </SettingsList>
        </>
    );
}
```

Look at how `SectionSettingsGroups.tsx` lays out a section that has both a group and a list (search for another `SettingsList` caller with a `SettingsGroup` before it). If the sheet already wraps the result in a group, drop the extra `SettingsGroup`.

- [ ] **Step 8: Type-check, lint, test**

Run: `npx tsc --noEmit && npx eslint hooks/useGraduatesSettings.ts components/saveMyDate/editor/settings/GraduatesSettings.tsx lib/invitation/sectionSettingsEdits.ts && npx vitest run lib/invitation components/saveMyDate/editor`
Expected: all clean.

- [ ] **Step 9: Commit**

```bash
git add lib/invitation/sectionSettingsEdits.ts lib/invitation/sectionSettings.test.ts messages/en.json messages/el.json hooks/useGraduatesSettings.ts components/saveMyDate/editor/settings/GraduatesSettings.tsx
git commit -m "KAN-302: hosts pick the Graduates block's style in its sheet"
```

---

### Task 7: Cap

**Files:**
- Create: `.../family/graduates/CapGraduate.tsx`
- Modify: `.../family/GraduatesSection.tsx` (`cap: CapGraduate`)
- Modify: `components/saveMyDate/invitation/invitation.css` (after the "Family: people with photos" rules)
- Test: `.../family/graduates/GraduatesStyles.test.tsx` (new)

- [ ] **Step 1: Write the failing test**

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import type { InvitationDocument } from '@/lib/invitation/document';
import { SAMPLE_DOCUMENT, SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
import type { GraduatesStyle, InvitationSection } from '@/lib/invitation/sections';

vi.mock('embla-carousel-react', () => ({
    default: () => [vi.fn(), { scrollPrev: vi.fn(), scrollNext: vi.fn(), on: vi.fn(), off: vi.fn(), selectedScrollSnap: () => 0 }],
}));
// next/font only works in a Next build.
vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const media = (id: string) => `/files/${id}.png`;
const WITH_PHOTO = { id: 'g1', name: 'Μαρία', degree: 'Πτυχίο Νομικής', university: 'ΑΠΘ', photo: { source: 'media' as const, mediaId: 'm-g1' } };
const NO_PHOTO = { id: 'g2', name: 'Νίκος', degree: 'Πτυχίο Πληροφορικής', university: 'ΕΚΠΑ' };

function renderStyle(style: GraduatesStyle, graduates = [WITH_PHOTO, NO_PHOTO], host = false) {
    const section = { ...SAMPLE_SECTIONS.graduates, data: { title: 'Οι απόφοιτοί μας', style, graduates } } as InvitationSection;
    const document: InvitationDocument = { ...SAMPLE_DOCUMENT, sections: [section] };
    const canvasTools = host ? { photo: () => null } : undefined;
    return render(<InvitationRenderer document={document} theme={SAMPLE_THEME} media={media} canvasTools={canvasTools} />);
}

afterEach(cleanup);

describe('Graduates styles', () => {
    it('cap: puts a cap on each photo, none on a graduate without one', () => {
        renderStyle('cap');
        expect(screen.getAllByRole('img', { name: 'Καπέλο αποφοίτησης' })).toHaveLength(1);
        expect(screen.getByText('ΕΚΠΑ')).toBeTruthy();
    });

    it('cap: shows the empty photo with its cap to a host', () => {
        renderStyle('cap', [NO_PHOTO], true);
        expect(screen.getByRole('img', { name: 'Καπέλο αποφοίτησης' })).toBeTruthy();
    });
});
```

`SAMPLE_DOCUMENT`'s hidden date sets the labels to Greek; if a test finds English names, read `invitationLanguage` in `lib/invitation/labels.ts`.

- [ ] **Step 2: Run and see it fail**

Run: `npx vitest run components/saveMyDate/invitation/sections/family/graduates/GraduatesStyles.test.tsx`
Expected: FAIL, no cap.

- [ ] **Step 3: Write `CapGraduate.tsx`**

```tsx
import { FamilyPhoto } from '@/components/saveMyDate/invitation/sections/family/FamilyPhoto';
import { GraduationCap } from '@/components/saveMyDate/invitation/sections/family/graduates/decorations/GraduationCap';
import { GraduateDetails, GraduateNameText, type GraduateProps } from '@/components/saveMyDate/invitation/sections/family/graduates/GraduateName';
import { showsGraduatePhoto } from '@/lib/invitation/graduatesStyles';

// Plain, with a cap tilted on the photo's top corner. CSS puts it left on odd graduates and right
// on even ones.
export function CapGraduate(props: GraduateProps) {
    const { section, graduate, ctx } = props;
    return (
        <div className="family-godparent">
            {/* Photo and cap */}
            {showsGraduatePhoto(graduate.photo, ctx) && (
                <div className="grad-cap-photo">
                    <GraduationCap labels={ctx.labels} />
                    <FamilyPhoto photo={graduate.photo} name={graduate.name} sectionId={section.id} path={`graduates.${graduate.id}.photo`} ctx={ctx} />
                </div>
            )}
            {/* Name */}
            <GraduateNameText {...props} />
            {/* Degree and university */}
            <GraduateDetails {...props} />
        </div>
    );
}
```

Set `cap: CapGraduate` in `GRADUATE_BY_STYLE`.

- [ ] **Step 4: Add the shared and the Cap CSS**

Append after the "Family: people with photos" block in `invitation.css` (before `/* Family: people without photos */`):

```css
/* Graduates styles (KAN-302): colours mixed from the theme's primary colour, never gold. */
.smd-invitation .graduates-block {
    --grad-accent: color-mix(in srgb, var(--primary) 35%, #f4c95d);
    --grad-rose: color-mix(in srgb, var(--primary) 40%, #e98a8a);
    --grad-soft: color-mix(in srgb, var(--primary) 40%, #ffffff);
    --grad-deep: color-mix(in srgb, var(--primary) 50%, #1f3b2c);
}
.smd-invitation .graduates-block .family-photo img { object-position: 50% 25%; }
.smd-invitation .grad-title { position: relative; }

/* Graduates: cap */
.smd-invitation .graduates-cap .family-title { margin-bottom: 48px; }
.smd-invitation .graduates-cap .family-godparents-list { row-gap: 64px; }
.smd-invitation .grad-cap-photo { position: relative; }
.smd-invitation .grad-cap {
    position: absolute;
    z-index: 2;
    top: -44px;
    left: -14px;
    width: 118px;
    height: 92px;
    transform: rotate(-13deg);
    filter: drop-shadow(0 4px 5px rgb(0 0 0 / 0.22));
    pointer-events: none;
}
.smd-invitation .graduates-cap .family-godparent:nth-child(even) .grad-cap { left: auto; right: -14px; transform: rotate(12deg); }
```

On two columns the even graduate is the right column, so the caps point outwards.

- [ ] **Step 5: Run and see it pass**

Run: `npx vitest run components/saveMyDate/invitation/sections/family`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/saveMyDate/invitation/sections/family components/saveMyDate/invitation/invitation.css
git commit -m "KAN-302: the Cap style puts a graduation cap on each photo"
```

---

### Task 8: Stickers

**Files:**
- Create: `.../family/graduates/StickerGraduate.tsx`, `.../family/graduates/PlacedStickers.tsx`
- Modify: `.../family/GraduatesSection.tsx`, `invitation.css`
- Test: `.../family/graduates/GraduatesStyles.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it('stickers: decorates the title and each photo, by position', () => {
    renderStyle('stickers', [WITH_PHOTO, { ...WITH_PHOTO, id: 'g3', name: 'Ελένη' }]);
    // Title: a star and confetti. First graduate: diploma and star. Second: books and champagne.
    expect(screen.getAllByRole('img', { name: 'Αστέρι' })).toHaveLength(2);
    expect(screen.getAllByRole('img', { name: 'Κομφετί' })).toHaveLength(1);
    expect(screen.getByRole('img', { name: 'Δίπλωμα' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Βιβλία' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Σαμπάνια' })).toBeTruthy();
});

it('stickers: a graduate without a photo gets none', () => {
    renderStyle('stickers', [NO_PHOTO]);
    expect(screen.queryByRole('img', { name: 'Δίπλωμα' })).toBeNull();
});
```

- [ ] **Step 2: Run and see it fail**

Run: `npx vitest run components/saveMyDate/invitation/sections/family/graduates/GraduatesStyles.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write `PlacedStickers.tsx`**

```tsx
import { Sticker } from '@/components/saveMyDate/invitation/sections/family/graduates/decorations/Sticker';
import type { StickerPlacement } from '@/lib/invitation/graduatesStyles';
import type { InvitationLabels } from '@/lib/invitation/labels';

// Stickers in fixed corners around a photo or the title.
export function PlacedStickers({ stickers, labels }: { stickers: readonly StickerPlacement[]; labels: InvitationLabels }) {
    return (
        <>
            {stickers.map((sticker) => (
                <Sticker key={`${sticker.kind}-${sticker.spot}`} kind={sticker.kind} labels={labels} tilt={sticker.tilt} className={`is-${sticker.spot}`} />
            ))}
        </>
    );
}
```

- [ ] **Step 4: Write `StickerGraduate.tsx`**

```tsx
import { FamilyPhoto } from '@/components/saveMyDate/invitation/sections/family/FamilyPhoto';
import { GraduateDetails, GraduateNameText, type GraduateProps } from '@/components/saveMyDate/invitation/sections/family/graduates/GraduateName';
import { PlacedStickers } from '@/components/saveMyDate/invitation/sections/family/graduates/PlacedStickers';
import { showsGraduatePhoto, stickerArrangement } from '@/lib/invitation/graduatesStyles';

// Plain, with die-cut stickers around the photo, arranged by the graduate's place in the list.
export function StickerGraduate(props: GraduateProps) {
    const { section, graduate, index, ctx } = props;
    return (
        <div className="family-godparent">
            {/* Photo and stickers */}
            {showsGraduatePhoto(graduate.photo, ctx) && (
                <div className="grad-sticker-photo">
                    <FamilyPhoto photo={graduate.photo} name={graduate.name} sectionId={section.id} path={`graduates.${graduate.id}.photo`} ctx={ctx} />
                    <PlacedStickers stickers={stickerArrangement(index)} labels={ctx.labels} />
                </div>
            )}
            {/* Name */}
            <GraduateNameText {...props} />
            {/* Degree and university */}
            <GraduateDetails {...props} />
        </div>
    );
}
```

- [ ] **Step 5: Put the title stickers in `GraduatesSection.tsx`**

Import `PlacedStickers` and `TITLE_STICKERS`, set `stickers: StickerGraduate`, and change the title wrapper:

```tsx
{/* Title */}
<div className="grad-title">
    <SectionText section={section} path="title" value={section.data.title} tag="h3" className="family-title" contrast={contrast} ctx={ctx} />
    {style === 'stickers' && <PlacedStickers stickers={TITLE_STICKERS} labels={ctx.labels} />}
</div>
```

- [ ] **Step 6: Add the CSS**

```css
/* Graduates: stickers */
.smd-invitation .graduates-stickers .family-godparents-list { row-gap: 48px; }
.smd-invitation .grad-sticker-photo { position: relative; }
.smd-invitation .grad-sticker { position: absolute; z-index: 3; filter: drop-shadow(0 3px 4px rgb(0 0 0 / 0.2)); pointer-events: none; }
.smd-invitation .grad-sticker-diploma { width: 120px; height: 70px; }
.smd-invitation .grad-sticker-books { width: 96px; height: 70px; }
.smd-invitation .grad-sticker-champagne { width: 62px; height: 98px; }
.smd-invitation .grad-sticker-star { width: 34px; height: 34px; }
.smd-invitation .grad-sticker-confetti { width: 60px; height: 40px; }
.smd-invitation .grad-sticker-photo .grad-sticker.is-top-left { top: -24px; left: -14px; }
.smd-invitation .grad-sticker-photo .grad-sticker.is-top-right { top: -24px; right: -14px; }
.smd-invitation .grad-sticker-photo .grad-sticker.is-bottom-left { bottom: -6px; left: -14px; }
.smd-invitation .grad-sticker-photo .grad-sticker.is-bottom-right { bottom: -6px; right: -12px; }
/* Around the title, the stickers sit beside it, not over it. */
.smd-invitation .grad-title .grad-sticker.is-top-left { top: -18px; left: 8%; }
.smd-invitation .grad-title .grad-sticker.is-top-right { top: -10px; right: 6%; }
.smd-invitation .graduates-stickers .family-title { margin-bottom: 36px; }
```

- [ ] **Step 7: Run and see it pass**

Run: `npx vitest run components/saveMyDate/invitation/sections/family`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add components/saveMyDate/invitation/sections/family components/saveMyDate/invitation/invitation.css
git commit -m "KAN-302: the Stickers style adds die-cut stickers around the photos and title"
```

---

### Task 9: Polaroids

**Files:**
- Create: `.../family/graduates/PolaroidGraduate.tsx`
- Modify: `.../family/GraduatesSection.tsx`, `invitation.css`
- Test: `.../family/graduates/GraduatesStyles.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it('polaroids: the name in the polaroid, degree and university on one line under it', () => {
    renderStyle('polaroids');
    const polaroid = document.querySelector('.grad-polaroid');
    expect(polaroid?.textContent).toContain('Μαρία');
    expect(screen.getByRole('img', { name: 'Ταινία' })).toBeTruthy();
    expect(document.querySelectorAll('.grad-joined-detail')[0]?.textContent).toBe('Πτυχίο Νομικής · ΑΠΘ');
});

it('polaroids: no polaroid for a guest when there is no photo', () => {
    renderStyle('polaroids', [NO_PHOTO]);
    expect(document.querySelector('.grad-polaroid')).toBeNull();
    expect(screen.getByText('Νίκος')).toBeTruthy();
});

it('polaroids: an empty polaroid for a host', () => {
    renderStyle('polaroids', [NO_PHOTO], true);
    expect(document.querySelector('.grad-polaroid')).toBeTruthy();
});
```

- [ ] **Step 2: Run and see it fail**

Run: `npx vitest run components/saveMyDate/invitation/sections/family/graduates/GraduatesStyles.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write `PolaroidGraduate.tsx`**

The name sits on white paper, so it takes the theme's text colour (`'base'`) even on a dark section.

```tsx
import { FamilyPhoto } from '@/components/saveMyDate/invitation/sections/family/FamilyPhoto';
import { PolaroidTape } from '@/components/saveMyDate/invitation/sections/family/graduates/decorations/PolaroidTape';
import { GraduateDetails, GraduateNameText, type GraduateProps } from '@/components/saveMyDate/invitation/sections/family/graduates/GraduateName';
import { showsGraduatePhoto } from '@/lib/invitation/graduatesStyles';

// A taped polaroid with the name in its margin; degree and university under it on one line.
// Without a photo, guests see the plain texts.
export function PolaroidGraduate(props: GraduateProps) {
    const { section, graduate, ctx } = props;
    if (!showsGraduatePhoto(graduate.photo, ctx)) {
        return (
            <div className="family-godparent">
                {/* Name */}
                <GraduateNameText {...props} />
                {/* Degree and university */}
                <GraduateDetails {...props} joined />
            </div>
        );
    }
    return (
        <div className="family-godparent">
            {/* Polaroid */}
            <div className="grad-polaroid">
                <PolaroidTape labels={ctx.labels} />
                <FamilyPhoto photo={graduate.photo} name={graduate.name} sectionId={section.id} path={`graduates.${graduate.id}.photo`} ctx={ctx} />
                <GraduateNameText {...props} contrast="base" />
            </div>
            {/* Degree and university */}
            <GraduateDetails {...props} joined />
        </div>
    );
}
```

Set `polaroids: PolaroidGraduate`.

- [ ] **Step 4: Add the CSS**

```css
/* Graduates: polaroids */
.smd-invitation .graduates-polaroids .family-godparents-list { row-gap: 40px; }
.smd-invitation .grad-polaroid {
    position: relative;
    width: min(100%, 300px);
    margin: 14px auto 14px;
    padding: 12px 12px 16px;
    background: #fff;
    box-shadow: 0 2px 4px rgb(0 0 0 / 0.08), 0 12px 24px rgb(20 30 50 / 0.12);
    transform: rotate(-2.5deg);
}
.smd-invitation .graduates-polaroids .family-godparent:nth-child(even) .grad-polaroid { transform: rotate(2deg); }
.smd-invitation .grad-polaroid .family-photo { max-width: none; aspect-ratio: 1; border-radius: 0; clip-path: none; margin: 0; }
.smd-invitation .grad-polaroid h2 { margin: 12px 0 0; font-size: 28px; overflow-wrap: anywhere; }
.smd-invitation .grad-tape { position: absolute; z-index: 2; top: -12px; left: 50%; width: 92px; height: 26px; transform: translateX(-50%) rotate(-3deg); }
.smd-invitation .graduates-polaroids .family-godparent:nth-child(even) .grad-tape { transform: translateX(-50%) rotate(4deg); }
.smd-invitation .grad-joined-detail { margin: 0; }
```

- [ ] **Step 5: Run and see it pass**

Run: `npx vitest run components/saveMyDate/invitation/sections/family`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/saveMyDate/invitation/sections/family components/saveMyDate/invitation/invitation.css
git commit -m "KAN-302: the Polaroids style draws each graduate as a taped polaroid"
```

---

### Task 10: Cover

**Files:**
- Create: `.../family/graduates/CoverGraduate.tsx`
- Modify: `.../family/GraduatesSection.tsx`, `invitation.css`
- Test: `.../family/graduates/GraduatesStyles.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it('cover: university at the top, name and degree at the bottom, over the photo', () => {
    renderStyle('cover');
    const cover = document.querySelector('.grad-cover');
    expect(cover?.querySelector('.grad-cover-top')?.textContent).toBe('ΑΠΘ');
    expect(cover?.querySelector('.grad-cover-bottom')?.textContent).toContain('Μαρία');
    expect(cover?.querySelector('.grad-cover-bottom')?.textContent).toContain('Πτυχίο Νομικής');
});

it('cover: shrinks a long name', () => {
    renderStyle('cover', [{ ...WITH_PHOTO, name: 'Αλεξάνδρα-Παναγιώτα Παπαδημητροπούλου' }]);
    const cover = document.querySelector<HTMLElement>('.grad-cover');
    expect(cover?.style.getPropertyValue('--grad-name-scale')).toBe('0.6');
});

it('cover: no cover for a guest when there is no photo', () => {
    renderStyle('cover', [NO_PHOTO]);
    expect(document.querySelector('.grad-cover')).toBeNull();
    expect(screen.getByText('ΕΚΠΑ')).toBeTruthy();
});
```

- [ ] **Step 2: Run and see it fail**

Run: `npx vitest run components/saveMyDate/invitation/sections/family/graduates/GraduatesStyles.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write `CoverGraduate.tsx`**

Texts over the photo are white (`'light'`).

```tsx
import type { CSSProperties } from 'react';

import { FamilyPhoto } from '@/components/saveMyDate/invitation/sections/family/FamilyPhoto';
import { GraduateNameText, type GraduateProps } from '@/components/saveMyDate/invitation/sections/family/graduates/GraduateName';
import { PlainGraduate } from '@/components/saveMyDate/invitation/sections/family/graduates/PlainGraduate';
import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import { coverNameScale, showsGraduatePhoto } from '@/lib/invitation/graduatesStyles';
import { showsText } from '@/lib/invitation/listContent';

// A minimal magazine cover: the photo fills the card, a thin white frame inside its edge, the
// university at the top and the name and degree at the bottom. Without a photo, guests see the
// plain texts.
export function CoverGraduate(props: GraduateProps) {
    const { section, graduate, ctx } = props;
    if (!showsGraduatePhoto(graduate.photo, ctx)) return <PlainGraduate {...props} />;

    const path = `graduates.${graduate.id}`;
    const scale = { '--grad-name-scale': String(coverNameScale(graduate.name)) } as CSSProperties;
    return (
        <div className="family-godparent">
            <div className="grad-cover" style={scale}>
                {/* Photo */}
                <div className="grad-cover-photo">
                    <FamilyPhoto photo={graduate.photo} name={graduate.name} sectionId={section.id} path={`${path}.photo`} ctx={ctx} />
                </div>
                <span className="grad-cover-frame" aria-hidden="true" />
                {/* University */}
                {showsText(graduate.university, ctx) && (
                    <SectionText section={section} path={`${path}.university`} value={graduate.university} tag="small" className="grad-cover-top" contrast="light" ctx={ctx} />
                )}
                {/* Name and degree */}
                <div className="grad-cover-bottom">
                    <GraduateNameText {...props} contrast="light" />
                    {showsText(graduate.degree, ctx) && (
                        <SectionText section={section} path={`${path}.degree`} value={graduate.degree} tag="small" className="grad-cover-degree" contrast="light" ctx={ctx} />
                    )}
                </div>
            </div>
        </div>
    );
}
```

Set `cover: CoverGraduate`.

- [ ] **Step 4: Add the CSS**

```css
/* Graduates: cover */
.smd-invitation .graduates-cover .family-godparents-list { row-gap: 28px; }
.smd-invitation .grad-cover { position: relative; width: min(100%, 340px); aspect-ratio: 4 / 5; margin: 0 auto; overflow: hidden; border-radius: 4px; color: #fff; }
.smd-invitation .grad-cover-photo { position: absolute; inset: 0; }
.smd-invitation .grad-cover-photo > * { height: 100%; }
.smd-invitation .grad-cover-photo .family-photo {
    max-width: none;
    height: 100%;
    aspect-ratio: auto;
    margin: 0;
    border-radius: 0;
    clip-path: none;
    /* A host's empty cover: dark enough for the white texts. */
    background: color-mix(in srgb, var(--primary) 45%, #1d2230);
}
.smd-invitation .grad-cover::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background: linear-gradient(to bottom, rgb(0 0 0 / 0.25), transparent 22%, transparent 70%, rgb(0 0 0 / 0.4));
}
.smd-invitation .grad-cover-frame { position: absolute; inset: 10px; z-index: 1; border: 1px solid rgb(255 255 255 / 0.85); pointer-events: none; }
.smd-invitation .grad-cover .grad-cover-top {
    position: absolute;
    z-index: 2;
    top: 22px;
    left: 24px;
    right: 24px;
    font-size: 13px;
    letter-spacing: 0.32em;
    text-transform: uppercase;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
.smd-invitation .grad-cover-bottom { position: absolute; z-index: 2; left: 20px; right: 20px; bottom: 20px; }
.smd-invitation .grad-cover-bottom h2 { margin: 0; font-size: calc(34px * var(--grad-name-scale, 1)); line-height: 1.1; overflow-wrap: anywhere; }
.smd-invitation .grad-cover .grad-cover-degree { display: block; margin-top: 4px; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; }
```

The editor's photo tools wrap the photo shape; `.grad-cover-photo > *` gives that wrapper the full height. Check it in Task 12's host story.

- [ ] **Step 5: Run and see it pass**

Run: `npx vitest run components/saveMyDate/invitation/sections/family`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/saveMyDate/invitation/sections/family components/saveMyDate/invitation/invitation.css
git commit -m "KAN-302: the Cover style draws each graduate as a minimal magazine cover"
```

---

### Task 11: Graduation photos for stories and the sample

**Files:**
- Create: `.storybook/assets/graduation/grad-1.webp` … `grad-7.webp`
- Modify: `.storybook/invitation.tsx`
- Modify: `lib/invitation/samples.ts`

The sources are in the scratchpad: `C:\Users\User\AppData\Local\Temp\claude\e81180142f31da1e\498f10af-7d3d-43f1-9eee-c76792fd1b4e\scratchpad\grad-photos\p1.png` … `p7.png` (p1 woman with flowers by columns, p2 man with his degree by the sea, p3 woman with her degree on campus, p4 man with his parents, p5 close portrait of a woman, p6 close portrait of a man, p7 three friends). If the scratchpad is gone, the originals are in the Figma file "Graduation sample photos".

- [ ] **Step 1: Convert to webp**

Write `scratchpad/convert-grad.mjs` (outside the repo), then run it from the repo root so it finds `sharp`:

```js
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [from, to] = process.argv.slice(2);
mkdirSync(to, { recursive: true });
for (let n = 1; n <= 7; n++) {
    await sharp(join(from, `p${n}.png`)).resize({ width: 900, withoutEnlargement: true }).webp({ quality: 72 }).toFile(join(to, `grad-${n}.webp`));
}
```

Run: `node <scratchpad>/convert-grad.mjs "<scratchpad>/grad-photos" .storybook/assets/graduation && ls -l .storybook/assets/graduation`
Expected: seven files, each well under 150 KB.

- [ ] **Step 2: Give them media ids**

In `.storybook/invitation.tsx`:

```ts
// Graduation photos of fictional Greek graduates (Figma AI, 2026-11-27), so graduation stories
// never fall back to the wedding picture.
const GRADUATION_PHOTOS = Object.fromEntries(
    [1, 2, 3, 4, 5, 6, 7].map((n) => [`m-grad-${n}`, `/storybook-assets/graduation/grad-${n}.webp`]),
);

const STORY_ART: Record<string, string> = { 'm-wave': `data:image/svg+xml,${encodeURIComponent(WAVE)}`, ...GRADUATION_PHOTOS };
```

And a shared helper for every Graduates stories file:

```ts
const GRADUATE_NAMES = ['Μαρία', 'Νίκος', 'Ελένη', 'Γιώργος', 'Άννα', 'Κώστας'];
const DEGREES = ['Πτυχίο Νομικής', 'Πτυχίο Πληροφορικής', 'Πτυχίο Ιατρικής', 'Πτυχίο Οικονομικών', 'Πτυχίο Αρχιτεκτονικής', 'Πτυχίο Φυσικής'];

// Graduates for the Graduates stories, each with a graduation photo of their own.
export function storyGraduates(count: number, withPhotos = true) {
    return GRADUATE_NAMES.slice(0, count).map((name, index) => ({
        id: `graduate-${index}`,
        name,
        degree: DEGREES[index],
        university: 'ΑΠΘ',
        ...(withPhotos ? { photo: { source: 'media' as const, mediaId: `m-grad-${index + 1}` } } : {}),
    }));
}

export const LONG_UNIVERSITY = 'Εθνικό και Καποδιστριακό Πανεπιστήμιο Αθηνών';
```

- [ ] **Step 3: Let `SectionStory` take the host's tools**

```tsx
type SectionStoryProps = {
    // ...existing props
    // The editor's tools, for a story of what a host sees.
    canvasTools?: CanvasTools;
};

export function SectionStory({ section, before, theme = STORY_THEME, sendRsvp, joinUrl, canvasTools }: SectionStoryProps) {
    // ...
    return <InvitationRenderer document={storyDocument([...lead, section])} theme={theme} media={storyInvitationMedia} sendRsvp={sendRsvp} joinUrl={joinUrl} canvasTools={canvasTools} />;
}

// What a host sees in the editor: an empty photo shape where a photo can go.
export const HOST_TOOLS: CanvasTools = { photo: () => null };
```

Import `CanvasTools` from `@/lib/invitation/canvasTools`.

- [ ] **Step 4: Use them in the sample**

In `lib/invitation/samples.ts`:

```ts
// Late in the list, so fewer sample sections change their alternating background.
graduates: section('graduates', {
    title: 'Οι απόφοιτοί μας',
    style: 'cap',
    graduates: [
        { id: 'g1', name: 'Μαρία', degree: 'Πτυχίο Νομικής', university: 'ΑΠΘ', photo: photo('m-grad-1') },
        { id: 'g2', name: 'Νίκος', degree: 'Πτυχίο Πληροφορικής', university: 'ΑΠΘ', photo: photo('m-grad-2') },
    ],
}),
```

`lib/saveMyDatePreview.ts` doesn't know these ids, so the staging preview page shows the two graduates as text. That is fine: it no longer shows the wedding picture there either. Leave `m-g1` in place for the other family stories.

- [ ] **Step 5: Run everything that reads the sample**

Run: `npx tsc --noEmit && npx vitest run lib components/saveMyDate`
Expected: PASS. If `GraduatesSection.test.tsx`'s alt test breaks, it builds its own graduates, so look for a test that reads `SAMPLE_SECTIONS.graduates.data.graduates` directly.

- [ ] **Step 6: Commit**

```bash
git add .storybook/assets/graduation .storybook/invitation.tsx lib/invitation/samples.ts
git commit -m "KAN-302: graduation photos for the Graduates stories and sample"
```

---

### Task 12: Stories for every style

**Files:**
- Modify: `components/saveMyDate/invitation/sections/family/GraduatesSection.stories.tsx` (becomes Plain)
- Create: `.../family/graduates/CapGraduates.stories.tsx`, `StickerGraduates.stories.tsx`, `PolaroidGraduates.stories.tsx`, `CoverGraduates.stories.tsx`

Read `docs/storybook.md` before writing them. Put any `visual-*` tag on each story itself, never through a spread.

- [ ] **Step 1: Write the Cap stories**

`CapGraduates.stories.tsx`. The other three are the same file with the title, `style` and long-text story swapped as noted below.

```tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { HOST_TOOLS, LONG_NAME, LONG_UNIVERSITY, onDark, SectionStory, storyGraduates, storySection } from '@/.storybook/invitation';

const noStyles = { textStyles: {} };
const graduates = (list: ReturnType<typeof storyGraduates>) => storySection('graduates', { style: 'cap', graduates: list }, noStyles);

const meta = {
    title: 'SaveMyDate/Family/Graduates/Cap',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section: graduates(storyGraduates(2)) },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TwoGraduates: Story = {};

export const OneGraduate: Story = { args: { section: graduates(storyGraduates(1)) } };

export const SixGraduates: Story = { args: { section: graduates(storyGraduates(6)) } };

export const LongTexts: Story = {
    args: { section: graduates(storyGraduates(2).map((graduate) => ({ ...graduate, name: LONG_NAME, university: LONG_UNIVERSITY }))) },
};

// A guest sees a graduate without a photo as text only.
export const WithoutPhotoGuest: Story = {
    args: { section: graduates([storyGraduates(1)[0], storyGraduates(2, false)[1]]) },
};

// A host sees the empty photo where one can go.
export const WithoutPhotoHost: Story = {
    args: { section: graduates([storyGraduates(1)[0], storyGraduates(2, false)[1]]), canvasTools: HOST_TOOLS },
};

export const OnDarkBackground: Story = { args: { section: onDark(graduates(storyGraduates(2))) } };
```

For the others: title `SaveMyDate/Family/Graduates/Stickers` with `style: 'stickers'`, `.../Polaroids` with `'polaroids'`, `.../Cover` with `'cover'`. Keep every story name the same.

- [ ] **Step 2: Turn the old file into Plain**

In `GraduatesSection.stories.tsx`: drop its local `storyGraduates` and `NAMES` and import `storyGraduates` and `LONG_UNIVERSITY` from `@/.storybook/invitation`. Change the title to `SaveMyDate/Family/Graduates/Plain`, set `style: 'plain'` on every section, and add the same `LongTexts`, `WithoutPhotoGuest`, `WithoutPhotoHost` and `OnDarkBackground` stories as above. Keep its existing story names where they match.

- [ ] **Step 3: Build and look**

Run Storybook on a free port: `npx storybook dev -p 6107 --ci --no-open` (in the background). Open each Graduates story at 375px and 1280px in the browser pane (`preview_start {url: "http://localhost:6107/"}`, never `preview_start {name}`). Check:
- Cap: caps don't cover the title or the text above; they zig-zag.
- Stickers: nothing covers a face or the name.
- Polaroids: tape on top, tilts alternate, the joined line wraps neatly.
- Cover: the white text reads on both photos; the long university stops at two lines; the long name is smaller.
- Host stories: the empty shapes show, and the Cover's empty card is dark with white text.
- Dark background: the cap and texts stay visible.
- `InvitationRenderer` "Every Section" shows the Cap style with two graduation photos.

Fix the CSS until each one looks like the approved render in `scratchpad/renders/` (`a2.png`, `e.png`, `f.png`, `magazine-takes.png` take 3). Stop Storybook when done, and check no `sh` loop is left on the port.

- [ ] **Step 4: Commit**

```bash
git add components/saveMyDate/invitation/sections/family .storybook
git commit -m "KAN-302: stories for each Graduates style, with graduation photos"
```

---

### Task 13: Backend schema (guestwall-be)

**Files (guestwall-be):**
- Modify: `src/main/resources/invitation/*.json` (regenerated)
- Modify: `src/test/resources/invitation/sample-document.json`, `sample-design.json` (regenerated)

- [ ] **Step 1: Make a worktree from staging**

```bash
cd C:/Users/User/IdeaProjects/event_social_media
git fetch origin
git worktree add C:/Users/User/IdeaProjects/esm-kan302-styles -b claude/kan-302-graduates-styles origin/staging
```

- [ ] **Step 2: Regenerate the schema from the frontend**

From the storywall worktree:

```bash
npx jiti scripts/save-my-date/export-json-schema.ts C:/Users/User/IdeaProjects/esm-kan302-styles/src/main/resources/invitation C:/Users/User/IdeaProjects/esm-kan302-styles/src/test/resources/invitation
cd C:/Users/User/IdeaProjects/esm-kan302-styles && git diff --stat
```

Expected: the diff adds the `style` enum to the graduates data and the sample's `style: "cap"` and photo ids. Anything else in the diff means staging's schema drifted from this branch; stop and check what before going on.

- [ ] **Step 3: Run the backend tests**

```bash
cd C:/Users/User/IdeaProjects/esm-kan302-styles
grep -rl "invitation-document.schema.json\|sample-document.json" src/test | head
./gradlew test --tests "<the test classes found above>"
```

Expected: PASS.

- [ ] **Step 4: Commit, push and open the PR into staging**

```bash
git add src/main/resources/invitation src/test/resources/invitation
git commit -m "KAN-302: the Graduates block keeps a style"
git push -u origin claude/kan-302-graduates-styles
gh pr create --base staging --title "KAN-302: Graduates block style in the invitation schema" --body "<summary; say it must merge before storywall #444; end with the Claude Code line>"
```

Name only KAN-302 in the body.

---

### Task 14: Checks and push #444

- [ ] **Step 1: Full checks**

```bash
npx tsc --noEmit
npx eslint .
npx vitest run
```

Expected: tsc exit 0, eslint 0 errors (the 2 known warnings), vitest all passing. Fix anything new before going on.

- [ ] **Step 2: Check the feed editor in the app**

Run the local check stack (see memory `isolated-local-check-stack`) and on a GRADUATION event's feed, in Invitation mode: add a Graduates block (it starts as Cap), switch through all five styles in its sheet, add a photo to one graduate, and leave one without. Check at 375px and 1280px, signed in as host and signed out as guest. Revert `AGENTS.md` if `next dev` touched it.

- [ ] **Step 3: Push**

```bash
git status --short   # only intended files
git push
```

- [ ] **Step 4: Update #444's description**

Add the five styles, the backend PR link and its merge order (backend first) to the PR body. Then wait for the `visual-regression` check. New and changed stories are expected; send the owner the report link and wait for their approval. Never tick the approve box.

- [ ] **Step 5: Update memory**

Update `graduation-event-type-status.md`: five styles built on #444, backend PR number, waiting on the owner's visual approval.
