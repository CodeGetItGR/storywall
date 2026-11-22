# Customizable feed, plan 3: the Theme grid lists both kinds (KAN-244, part 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Behind `FEED_EDITOR_LAUNCHED`, the host's Theme page lists the wall themes and the event type's Save my date themes in one grid. Picking a Save my date theme saves the feed layout on it; picking a wall theme while on one first moves the layout back to the plain look.

**Architecture:** Pure rules live in `lib/feedThemes.ts`: the radio value of a Save my date card, the look each feed block borrows from the theme, the two layout switches (built on the editor's `planThemeSwitch`), and the card title's look. `useInvitationThemeCards` lists the event type's themes with each one's title font and colour. `useFeedThemeSwitch` plans and saves a switch (one retry on a stale revision). `useThemeGrid` composes the wall picker, the cards and the switch into one list of options and one `select`. The page shell is shared: `ThemePickerView` draws the grid for today's `ThemePicker` and for the new `FeedThemePicker`; `ThemeSection` picks one by the flag and the event type. With the flag off the Theme page renders exactly today's `ThemePicker`.

**Tech Stack:** Next.js App Router, TanStack Query v5, next-intl, zod 4 invitation format, vitest + Testing Library, Storybook (`@storybook/nextjs-vite`).

**Spec:** `docs/superpowers/specs/2026-11-21-customizable-feed-design.md` on branch `claude/kan-242-customizable-feed` (with plans 1 and 2), sections Decisions (Themes), Rendering (last bullet), Flags, Errors. **Depends on:** plan 2 (commits `c7b700c4` → `d469ca10` on this branch): `lib/feedLayout.ts`, `useFeedLayout`, `FeedEditorFlagProvider`, `showsFeedEditor()`. The backend PUT (plan 1, KAN-243) must be on backend staging before this PR is checked on staging.

**Branch:** `claude/kan-244-feed-layout` (worktree `.claude/worktrees/kan-244-feed-layout`). The KAN-244 PR into `staging` opens after this plan.

**Decisions (owner, 2026-11-21):**
- On a Save my date theme the feed's own blocks borrow the look of the theme's matching sections: cover ← `top`, details ← `date` (else `countdown`), description ← `invitation`, RSVP ← `rsvp`. A theme without the match gives the block the theme's background and nothing else.
- Each Save my date card shows the event title in that theme's title font and colour. The cards fetch the event type's public themes (about 8); no backend change.
- Without the `save_my_date` module the Save my date cards show with a lock. The main host's tap opens Billing; co-hosts' locked cards can't be picked.
- Back to a wall theme: the feed blocks go back to the plain style; Save my date blocks stay, without the theme's images, frames and transitions, in the event's colours.
- Wording: `ManagePage.settings.theme.locked`, English "Needs Save my date", Greek "Χρειάζεται το Save my date": the lock's hover text and screen-reader description. Approved.

**Decisions made while planning (small, inside the spec):**
- A Save my date card's radio value is `invitation:<slug>`; wall presets keep their ids and "No theme" stays `null`.
- While the layout is on a Save my date theme, no wall card is checked, and the "Current theme" card (a wall preset no longer offered) is left out: it can't be picked anyway.
- A layout on a Save my date theme the catalogue no longer lists shows no checked card.
- Picking a wall card while on a Save my date theme saves the layout first, then the wall theme (skipped when that wall theme is already the event's).
- A theme pick refused as stale (5208) is planned again on the newer layout and saved once more: a pick is one whole change, so redoing it is what the host asked for. Any other refusal shows today's error copy, keeps the previous layout on screen and reads the layout again (spec, Errors).
- The locked tap uses the manage page's own section switch (`navigateToSection('billing')`), not `router.push`.
- The manage page prefetches the layout and the catalogue for the Theme tab. It does not prefetch the 8 theme designs: they are large, and the cards draw without them (the font and colour arrive a moment later).
- The draft Overview's theme step keeps today's wall-only `ThemePicker`.

---

## File map

- Modify `messages/en.json`, `messages/el.json`: `ManagePage.settings.theme.locked`.
- Create `lib/feedThemes.ts` + `lib/feedThemes.test.ts`.
- Modify `lib/api/types.ts`: `FeedLayoutSaveRequestDto`, `FeedLayoutSaveResponseDto`.
- Create `hooks/useFeedLayoutSave.ts`.
- Create `hooks/useInvitationThemeCards.ts` + `hooks/useInvitationThemeCards.test.tsx`.
- Create `hooks/useFeedThemeSwitch.ts` + `hooks/useFeedThemeSwitch.test.tsx`.
- Modify `components/manage/ThemePresetRadioGroup.tsx`, `components/manage/ThemePresetOption.tsx`, `components/manage/ThemePresetRadioGroup.test.tsx`, `components/manage/ThemePresetRadioGroup.stories.tsx`.
- Modify `hooks/useThemePicker.ts` + `hooks/useThemePicker.test.tsx`: `isApplied`.
- Create `hooks/useWallThemeOptions.ts`, `components/manage/ThemePickerView.tsx`. Modify `components/manage/ThemePicker.tsx`.
- Create `hooks/useThemeGrid.ts` + `hooks/useThemeGrid.test.tsx`, `components/manage/InvitationFontFaces.tsx`, `components/manage/FeedThemePicker.tsx`, `components/manage/ThemeSection.tsx`. Modify `components/manage/ManageScreen.tsx`.
- Modify `app/(main)/(app)/(event)/events/[eventId]/manage/(root)/page.tsx`.

---

### Task 1: the lock's wording

**Files:**
- Modify: `messages/en.json`, `messages/el.json`

The wording is approved (see Decisions). Add nothing else.

- [ ] **Step 1: Add the English key**

In `messages/en.json`, inside `ManagePage.settings.theme`, replace

```json
                "saved": "Theme saved"
            },
```

with

```json
                "saved": "Theme saved",
                "locked": "Needs Save my date"
            },
```

- [ ] **Step 2: Add the Greek key**

In `messages/el.json`, replace

```json
                "saved": "Το θέμα αποθηκεύτηκε"
```

with

```json
                "saved": "Το θέμα αποθηκεύτηκε",
                "locked": "Χρειάζεται το Save my date"
```

- [ ] **Step 3: Check both files parse and the keys landed in the right block**

Run: `node -e "for (const l of ['en','el']) { const m = require('./messages/' + l + '.json'); console.log(l, m.ManagePage.settings.theme.locked); }"`
Expected:
```
en Needs Save my date
el Χρειάζεται το Save my date
```

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/el.json
git commit -m "KAN-244: wording for the Save my date lock on theme cards"
```

---

### Task 2: feed theme rules

**Files:**
- Create: `lib/feedThemes.ts`
- Test: `lib/feedThemes.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';

import { defaultFeedLayout, PLAIN_FEED_STYLE, WALL_THEME_ID, wallThemeDesign } from '@/lib/feedLayout';
import {
    FEED_BLOCK_FALLBACK_STYLE,
    invitationThemeChoice,
    planFeedThemeSwitch,
    planFeedWallSwitch,
    readThemeChoice,
    themeCardTitleLook,
} from '@/lib/feedThemes';
import type { InvitationDocument } from '@/lib/invitation/document';
import { createSection, type NewSectionType } from '@/lib/invitation/newSection';
import { SAMPLE_THEME } from '@/lib/invitation/samples';
import { FEED_SECTION_TYPES, type InvitationSection } from '@/lib/invitation/sections';

function styled(type: NewSectionType, color: string): InvitationSection {
    return { ...createSection(type, 'WEDDING'), style: { ...FEED_BLOCK_FALLBACK_STYLE, background: { kind: 'color', color } } } as InvitationSection;
}

function themeDocument(sections: InvitationSection[]): InvitationDocument {
    return { ...defaultFeedLayout(), themeId: 'rose-garden', sections };
}

const target = (sections: InvitationSection[]) => ({ document: themeDocument(sections), theme: SAMPLE_THEME, imageIds: new Set<string>() });
const byType = (document: InvitationDocument, type: string) => document.sections.find((section) => section.type === type)!;

describe('theme choices', () => {
    it('marks a Save my date card apart from wall presets', () => {
        expect(readThemeChoice(invitationThemeChoice('rose-garden'))).toBe('rose-garden');
        expect(readThemeChoice('preset-1')).toBeNull();
        expect(readThemeChoice(null)).toBeNull();
    });
});

describe('planFeedThemeSwitch', () => {
    it("gives each feed block the look of the theme's matching section", () => {
        const next = planFeedThemeSwitch(
            defaultFeedLayout(),
            target([styled('top', '#111111'), styled('date', '#222222'), styled('invitation', '#333333'), styled('rsvp', '#444444')]),
            new Set(),
        );
        expect(next.themeId).toBe('rose-garden');
        expect(byType(next, 'feedCover').style.background).toEqual({ kind: 'color', color: '#111111' });
        expect(byType(next, 'feedDetails').style.background).toEqual({ kind: 'color', color: '#222222' });
        expect(byType(next, 'feedDescription').style.background).toEqual({ kind: 'color', color: '#333333' });
        expect(byType(next, 'feedRsvp').style.background).toEqual({ kind: 'color', color: '#444444' });
    });

    it('takes the countdown for details when the theme has no date', () => {
        const next = planFeedThemeSwitch(defaultFeedLayout(), target([styled('countdown', '#555555')]), new Set());
        expect(byType(next, 'feedDetails').style.background).toEqual({ kind: 'color', color: '#555555' });
    });

    it("gives a block the theme's background when the theme has no match", () => {
        const next = planFeedThemeSwitch(defaultFeedLayout(), target([styled('top', '#111111')]), new Set());
        expect(byType(next, 'feedRsvp').style).toEqual(FEED_BLOCK_FALLBACK_STYLE);
    });

    it('keeps the host order', () => {
        const current = { ...defaultFeedLayout(), sections: [...defaultFeedLayout().sections].reverse() };
        const next = planFeedThemeSwitch(current, target([]), new Set());
        expect(next.sections.map((section) => section.type)).toEqual(['feedRsvp', 'feedDescription', 'feedDetails', 'feedCover']);
    });
});

describe('planFeedWallSwitch', () => {
    it('puts the feed blocks back to the plain style on the wall theme', () => {
        const onTheme = planFeedThemeSwitch(defaultFeedLayout(), target([styled('top', '#111111')]), new Set());
        const next = planFeedWallSwitch(onTheme, wallThemeDesign(null), 'WEDDING', new Set());
        expect(next.themeId).toBe(WALL_THEME_ID);
        for (const type of FEED_SECTION_TYPES) expect(byType(next, type).style).toEqual(PLAIN_FEED_STYLE);
    });

    it("keeps a Save my date block, shown, in a new block's look", () => {
        const dressCode = styled('dressCode', '#666666');
        const current = themeDocument([...defaultFeedLayout().sections, dressCode]);
        const next = planFeedWallSwitch(current, wallThemeDesign(null), 'WEDDING', new Set());
        const kept = byType(next, 'dressCode');
        expect(kept.id).toBe(dressCode.id);
        expect(kept.visible).toBe(true);
        expect(kept.style).toEqual(createSection('dressCode', 'WEDDING').style);
    });
});

describe('themeCardTitleLook', () => {
    it("keeps a wall card's look", () => {
        const look = themeCardTitleLook({ backgroundColor: '#EEF1E4', titleColor: '#4D5A2C', headingFont: null, titleFontFamily: null });
        expect(look.hasTitleColor).toBe(true);
        expect(look.scopeProps).toEqual({});
    });

    it("draws a Save my date card's title in the theme's font and colour", () => {
        const look = themeCardTitleLook({ backgroundColor: null, titleColor: '#9C4A5A', headingFont: null, titleFontFamily: '"Playfair Display", serif' });
        expect(look.scopeProps).toEqual({ 'data-theme-font': '' });
        expect(look.style).toMatchObject({ '--event-heading-font': '"Playfair Display", serif', '--event-title': '#9C4A5A' });
        expect(look.hasTitleColor).toBe(true);
    });

    it('has no colour without a background or a theme font', () => {
        expect(themeCardTitleLook({ backgroundColor: null, titleColor: '#9C4A5A', headingFont: null, titleFontFamily: null }).hasTitleColor).toBe(false);
    });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run lib/feedThemes.test.ts`
Expected: FAIL, `Failed to resolve import "@/lib/feedThemes"`.

- [ ] **Step 3: Write the rules**

```ts
import type { CSSProperties } from 'react';

import type { EventThemeFontDto } from '@/lib/api/types';
import { eventThemeStyle, isHexColor, themeFontScopeProps } from '@/lib/eventTheme';
import { defaultFeedLayout, PLAIN_FEED_STYLE, WALL_THEME_ID } from '@/lib/feedLayout';
import type { InvitationDocument } from '@/lib/invitation/document';
import { createSection, type NewSectionType } from '@/lib/invitation/newSection';
import { type FeedSectionType, type InvitationSection, isFeedSectionType, type SectionType } from '@/lib/invitation/sections';
import type { SectionStyle } from '@/lib/invitation/sectionStyle';
import type { ThemeDesign } from '@/lib/invitation/theme';
import { planThemeSwitch, type ThemeSwitchTarget } from '@/lib/invitation/themeSwitch';

// The Theme page lists wall presets and Save my date themes in one radio group (KAN-244). A Save my
// date card's value carries its slug behind this mark; presets keep their ids, "No theme" is null.
const INVITATION_CHOICE = 'invitation:';

export function invitationThemeChoice(slug: string): string {
    return `${INVITATION_CHOICE}${slug}`;
}

// The Save my date theme a card names, or null for a wall preset or "No theme".
export function readThemeChoice(choice: string | null): string | null {
    return choice?.startsWith(INVITATION_CHOICE) ? choice.slice(INVITATION_CHOICE.length) : null;
}

// On a Save my date theme each feed block borrows the look of the theme's section of the first of
// these kinds it has.
export const FEED_BLOCK_LOOKS: Record<FeedSectionType, readonly SectionType[]> = {
    feedCover: ['top'],
    feedDetails: ['date', 'countdown'],
    feedDescription: ['invitation'],
    feedRsvp: ['rsvp'],
};

// A feed block on a theme with no matching section: the theme's background, nothing else.
export const FEED_BLOCK_FALLBACK_STYLE: SectionStyle = { ...PLAIN_FEED_STYLE, background: { kind: 'theme', slot: 'auto' } };

function borrowedStyle(type: FeedSectionType, themeDocument: InvitationDocument): SectionStyle {
    for (const kind of FEED_BLOCK_LOOKS[type]) {
        const match = themeDocument.sections.find((section) => section.type === kind);
        if (match) return match.style;
    }
    return FEED_BLOCK_FALLBACK_STYLE;
}

function withStyle(section: InvitationSection, style: SectionStyle): InvitationSection {
    return { ...section, style } as InvitationSection;
}

// The layout on a Save my date theme. The theme's own invitation has no feed blocks, so they are
// added to it with their borrowed looks; then the editor's switch restyles every block the host has,
// and hides the Save my date blocks the theme has no kind for.
export function planFeedThemeSwitch(current: InvitationDocument, target: ThemeSwitchTarget, oldThemeImageIds: ReadonlySet<string>): InvitationDocument {
    const feedBlocks = defaultFeedLayout().sections.map((section) => withStyle(section, borrowedStyle(section.type as FeedSectionType, target.document)));
    const document = { ...target.document, sections: [...target.document.sections, ...feedBlocks] };
    return planThemeSwitch(current, { ...target, document }, oldThemeImageIds).document;
}

// The layout back on the event's wall theme: feed blocks in the plain style, Save my date blocks in a
// new block's look, without the old theme's images, frames and transitions.
export function planFeedWallSwitch(current: InvitationDocument, wall: ThemeDesign, eventType: string, oldThemeImageIds: ReadonlySet<string>): InvitationDocument {
    const sections = current.sections.flatMap((section) => {
        if (isFeedSectionType(section.type)) return [withStyle(section, PLAIN_FEED_STYLE)];
        if (section.type === 'footer') return [];
        return [createSection(section.type as NewSectionType, eventType)];
    });
    const template: InvitationDocument = { ...current, themeId: WALL_THEME_ID, overrides: {}, sections };
    return planThemeSwitch(current, { document: template, theme: wall, imageIds: new Set() }, oldThemeImageIds).document;
}

type ThemeCardTitle = {
    backgroundColor: string | null;
    titleColor: string | null;
    headingFont: EventThemeFontDto | null;
    // A Save my date theme's title font, as its design names it.
    titleFontFamily: string | null;
};

// How a theme card draws its title. A wall card: the preset's look, only on a usable background (no
// theme at all otherwise, EventThemeScope's rule). A Save my date card: its theme's title font and colour.
export function themeCardTitleLook({ backgroundColor, titleColor, headingFont, titleFontFamily }: ThemeCardTitle) {
    const themeStyle = eventThemeStyle(backgroundColor, { titleColor, headingFont });
    const colour = titleColor !== null && isHexColor(titleColor) ? titleColor : null;
    if (!titleFontFamily) {
        return { scopeProps: themeFontScopeProps(themeStyle ? headingFont : null), style: themeStyle, hasTitleColor: themeStyle !== undefined && colour !== null };
    }
    const style = { ...themeStyle, '--event-heading-font': titleFontFamily, ...(colour ? { '--event-title': colour } : {}) } as CSSProperties;
    return { scopeProps: { 'data-theme-font': '' as const }, style, hasTitleColor: colour !== null };
}
```

- [ ] **Step 4: Run them to make sure they pass**

Run: `npx vitest run lib/feedThemes.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/feedThemes.ts lib/feedThemes.test.ts
git commit -m "KAN-244: feed theme rules (card choice, borrowed looks, switches, card title)"
```

---

### Task 3: saving the layout

**Files:**
- Modify: `lib/api/types.ts` (after `FeedLayoutDto`)
- Create: `hooks/useFeedLayoutSave.ts`

- [ ] **Step 1: Add the request and answer types**

After the `FeedLayoutDto` interface in `lib/api/types.ts`:

```ts
// PUT /api/events/{id}/feed-layout (KAN-243). revision: the one the host saw, 0 before the first save;
// a newer one answers 409 with 5208. document.themeId must be the theme's own, or 'wall' with themeSlug null.
export interface FeedLayoutSaveRequestDto {
    revision: number;
    themeSlug: string | null;
    document: unknown;
}

export interface FeedLayoutSaveResponseDto {
    revision: number;
    updatedAt: string;
}
```

- [ ] **Step 2: Write the hook**

```ts
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { FeedLayoutSaveRequestDto, FeedLayoutSaveResponseDto } from '@/lib/api/types';
import { feedLayoutKeys } from '@/lib/feedLayout';

// Saves the feed layout. The GET answer carries the theme's design and image URLs, so the layout is
// read again rather than patched; the save settles once it has been.
export function useFeedLayoutSave(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (request: FeedLayoutSaveRequestDto) => api.put<FeedLayoutSaveResponseDto>(endpoints.events.feedLayout(eventId), request),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: feedLayoutKeys.detail(eventId) }),
    });
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/api/types.ts hooks/useFeedLayoutSave.ts
git commit -m "KAN-244: useFeedLayoutSave saves the feed layout"
```

---

### Task 4: the Save my date cards

**Files:**
- Create: `hooks/useInvitationThemeCards.ts`
- Test: `hooks/useInvitationThemeCards.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useInvitationThemeCards } from '@/hooks/useInvitationThemeCards';
import { SAMPLE_THEME } from '@/lib/invitation/samples';

const apiGet = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (original) => ({ ...(await original<typeof import('@/lib/api/client')>()), api: { get: apiGet } }));

const ROSE = { slug: 'rose', name: 'Rose', eventType: 'WEDDING', cardColor: '#FBE6E4', cardThumbUrl: 'https://media.example/rose.webp' };
const DINO = { slug: 'dino', name: 'Dino', eventType: 'BAPTISM', cardColor: null, cardThumbUrl: null };
const ROSE_DESIGN = { ...SAMPLE_THEME, colors: { ...SAMPLE_THEME.colors, primary: '#9C4A5A' }, fonts: { ...SAMPLE_THEME.fonts, title: 'Lumiere' } };
const LUMIERE = { key: 'lumiere', familyName: 'Lumiere', fallback: 'serif', url: 'https://media.example/fonts/lumiere.woff2' };

function wrapper({ children }: { children: ReactNode }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    apiGet.mockReset();
    apiGet.mockImplementation(async (path: string) => {
        if (path === '/api/invitation-themes?eventType=WEDDING') return [ROSE];
        if (path === '/api/invitation-themes?eventType=BAPTISM') return [DINO];
        if (path === '/api/invitation-themes/rose') return { ...ROSE, design: ROSE_DESIGN, document: {}, assetUrls: {} };
        if (path === '/api/invitation-fonts/files') return [LUMIERE];
        throw new Error(`unexpected ${path}`);
    });
});

describe('useInvitationThemeCards', () => {
    it("lists the event type's themes with each one's title font and colour", async () => {
        const { result } = renderHook(() => useInvitationThemeCards('WEDDING', { enabled: true }), { wrapper });
        await waitFor(() => expect(result.current.cards[0]?.titleFontFamily).toBe('Lumiere'));
        expect(result.current.cards).toEqual([
            { slug: 'rose', name: 'Rose', cardColor: '#FBE6E4', illustrationUrl: 'https://media.example/rose.webp', titleFontFamily: 'Lumiere', titleColor: '#9C4A5A' },
        ]);
    });

    it('declares the uploaded fonts the designs use', async () => {
        const { result } = renderHook(() => useInvitationThemeCards('WEDDING', { enabled: true }), { wrapper });
        await waitFor(() => expect(result.current.fontFaces).toContain('font-family:"Lumiere"'));
    });

    it('asks for nothing while off', () => {
        const { result } = renderHook(() => useInvitationThemeCards('WEDDING', { enabled: false }), { wrapper });
        expect(result.current.cards).toEqual([]);
        expect(apiGet).not.toHaveBeenCalled();
    });
});
```

If the font test fails because `uploadedFontFaceCss` drops the font, read `isThemeFontUrl` in `lib/eventTheme.ts` and change `LUMIERE.url` to a URL it accepts (keep the `key`).

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run hooks/useInvitationThemeCards.test.tsx`
Expected: FAIL, `Failed to resolve import "@/hooks/useInvitationThemeCards"`.

- [ ] **Step 3: Write the hook**

```ts
'use client';

import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useInvitationFonts } from '@/hooks/useAdminInvitationThemes';
import { useInvitationThemeCatalogue } from '@/hooks/useInvitationThemeCatalogue';
import { api } from '@/lib/api/client';
import { isHexColor } from '@/lib/eventTheme';
import { themeDesignSchema } from '@/lib/invitation/theme';
import { invitationThemeKeys } from '@/lib/invitation/themeCatalogue';
import { invitationThemeEndpoint, type InvitationThemePublicDto } from '@/lib/invitation/themePreview';
import { uploadedFontFaceCss } from '@/lib/invitation/uploadedFonts';

const THEME_STALE_MS = 5 * 60_000;

export function fetchInvitationTheme(slug: string): Promise<InvitationThemePublicDto> {
    return api.get<InvitationThemePublicDto>(invitationThemeEndpoint(slug));
}

export type InvitationThemeCard = {
    slug: string;
    name: string;
    cardColor: string | null;
    illustrationUrl: string | null;
    // From the theme's design, once it has loaded.
    titleFontFamily: string | null;
    titleColor: string | null;
};

// Stable, so the combined list keeps its identity between renders.
function designsOf(results: UseQueryResult<InvitationThemePublicDto>[]) {
    return results.map((result) => result.data);
}

// The event type's Save my date themes as Theme page cards. Each card shows at once from the catalogue;
// its title font and colour follow when the theme's design loads.
export function useInvitationThemeCards(eventType: string, { enabled }: { enabled: boolean }) {
    const catalogue = useInvitationThemeCatalogue({ enabled });
    const listed = useMemo(
        () => (enabled ? (catalogue.themes ?? []).filter((theme) => theme.eventType === eventType) : []),
        [enabled, catalogue.themes, eventType],
    );
    const themes = useQueries({
        queries: listed.map((theme) => ({
            queryKey: invitationThemeKeys.publicTheme(theme.slug),
            queryFn: () => fetchInvitationTheme(theme.slug),
            staleTime: THEME_STALE_MS,
        })),
        combine: designsOf,
    });
    // The font files list is public (the published invitation reads it too).
    const fonts = useInvitationFonts(listed.length > 0);

    const cards = useMemo<InvitationThemeCard[]>(
        () =>
            listed.map((theme, index) => {
                const design = themeDesignSchema.safeParse(themes[index]?.design);
                const primary = design.success ? design.data.colors.primary : null;
                return {
                    slug: theme.slug,
                    name: theme.name,
                    cardColor: theme.cardColor,
                    illustrationUrl: theme.cardThumbUrl,
                    titleFontFamily: design.success ? design.data.fonts.title : null,
                    titleColor: primary && isHexColor(primary) ? primary : null,
                };
            }),
        [listed, themes],
    );

    const fontFaces = useMemo(() => uploadedFontFaceCss(fonts.data ?? [], themes.map((theme) => theme?.design ?? null)), [fonts.data, themes]);

    return { cards, fontFaces, isLoading: enabled && catalogue.isPending };
}
```

- [ ] **Step 4: Run them to make sure they pass**

Run: `npx vitest run hooks/useInvitationThemeCards.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add hooks/useInvitationThemeCards.ts hooks/useInvitationThemeCards.test.tsx
git commit -m "KAN-244: useInvitationThemeCards lists Save my date themes with their title look"
```

---

### Task 5: switching the layout's theme

**Files:**
- Create: `hooks/useFeedThemeSwitch.ts`
- Test: `hooks/useFeedThemeSwitch.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFeedThemeSwitch } from '@/hooks/useFeedThemeSwitch';
import { ApiError } from '@/lib/api/client';
import type { EventDetailResponseDto, FeedLayoutDto } from '@/lib/api/types';
import { defaultFeedLayout, readFeedLayout, WALL_THEME_ID } from '@/lib/feedLayout';
import { createSection } from '@/lib/invitation/newSection';
import { SAMPLE_THEME } from '@/lib/invitation/samples';

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock('@/lib/api/client', async (original) => ({ ...(await original<typeof import('@/lib/api/client')>()), api }));

const EVENT = { id: 'e1', eventType: 'WEDDING', theme: null } as unknown as EventDetailResponseDto;
const ROSE_DOCUMENT = { ...defaultFeedLayout(), themeId: 'rose-garden', sections: [createSection('top', 'WEDDING')] };
const ROSE = { slug: 'rose', name: 'Rose', eventType: 'WEDDING', design: SAMPLE_THEME, document: ROSE_DOCUMENT, assetUrls: {} };

function savedOnRose(revision: number): FeedLayoutDto {
    return {
        themeSlug: 'rose',
        revision,
        document: { ...ROSE_DOCUMENT, sections: defaultFeedLayout().sections },
        design: SAMPLE_THEME,
        imageUrls: {},
        updatedAt: '2026-11-21T10:00:00Z',
    };
}

function wrapper({ children }: { children: ReactNode }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    api.get.mockReset();
    api.put.mockReset();
    api.get.mockImplementation(async (path: string) => {
        if (path === '/api/invitation-themes/rose') return ROSE;
        if (path === '/api/events/e1/feed-layout') return savedOnRose(4);
        throw new Error(`unexpected ${path}`);
    });
    api.put.mockResolvedValue({ revision: 1, updatedAt: '2026-11-21T10:00:00Z' });
});

describe('useFeedThemeSwitch', () => {
    it("saves the layout on the theme, under the theme's own id", async () => {
        const { result } = renderHook(() => useFeedThemeSwitch(EVENT, readFeedLayout(null, null)), { wrapper });
        await act(() => result.current.switchTo('rose'));
        const [path, body] = api.put.mock.calls[0];
        expect(path).toBe('/api/events/e1/feed-layout');
        expect(body).toMatchObject({ revision: 0, themeSlug: 'rose', document: { themeId: 'rose-garden' } });
        expect(result.current.isSaved).toBe(true);
    });

    it('tries once more on the newer layout when another save got there first', async () => {
        api.put.mockRejectedValueOnce(new ApiError(409, { errorCode: 5208 }));
        const { result } = renderHook(() => useFeedThemeSwitch(EVENT, readFeedLayout(null, null)), { wrapper });
        await act(() => result.current.switchTo('rose'));
        expect(api.put).toHaveBeenCalledTimes(2);
        expect(api.put.mock.calls[1][1]).toMatchObject({ revision: 4, themeSlug: 'rose' });
        expect(result.current.error).toBeNull();
    });

    it('moves the layout back to the wall theme', async () => {
        const { result } = renderHook(() => useFeedThemeSwitch(EVENT, readFeedLayout(savedOnRose(4), null)), { wrapper });
        await act(() => result.current.switchTo(null));
        expect(api.put.mock.calls[0][1]).toMatchObject({ revision: 4, themeSlug: null, document: { themeId: WALL_THEME_ID } });
    });

    it('shows a refusal and reads the layout again', async () => {
        const refusal = new ApiError(400, { errorCode: 5143 });
        api.put.mockRejectedValue(refusal);
        const { result } = renderHook(() => useFeedThemeSwitch(EVENT, readFeedLayout(null, null)), { wrapper });
        let saved = true;
        await act(async () => {
            saved = await result.current.switchTo('rose');
        });
        expect(saved).toBe(false);
        expect(result.current.error).toBe(refusal);
    });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run hooks/useFeedThemeSwitch.test.tsx`
Expected: FAIL, `Failed to resolve import "@/hooks/useFeedThemeSwitch"`.

- [ ] **Step 3: Write the hook**

```ts
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import { fetchFeedLayout } from '@/hooks/useFeedLayout';
import { useFeedLayoutSave } from '@/hooks/useFeedLayoutSave';
import { fetchInvitationTheme } from '@/hooks/useInvitationThemeCards';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { feedLayoutKeys, type FeedLayoutView, readFeedLayout, wallThemeDesign } from '@/lib/feedLayout';
import { planFeedThemeSwitch, planFeedWallSwitch } from '@/lib/feedThemes';
import { isStaleRevision } from '@/lib/invitation/drafts';
import { invitationThemeKeys } from '@/lib/invitation/themeCatalogue';
import { readThemePreview } from '@/lib/invitation/themePreview';
import { themeImageIds } from '@/lib/invitation/themeSwitch';

type LayoutState = Pick<FeedLayoutView, 'document' | 'revision' | 'themeSlug'>;

// Moves the feed layout onto a Save my date theme (a slug) or back to the wall theme (null), and saves
// it. A save another tab made first is read and the switch made again on top of it, once. Any other
// refusal is shown, the previous layout stays and is read again. Resolves to whether it saved.
export function useFeedThemeSwitch(event: Pick<EventDetailResponseDto, 'id' | 'eventType' | 'theme'>, current: LayoutState) {
    const queryClient = useQueryClient();
    const save = useFeedLayoutSave(event.id);
    // Set synchronously: two clicks in one tick both see isSaving false.
    const inFlight = useRef(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [error, setError] = useState<unknown>(null);

    const loadTheme = useCallback(
        (slug: string) => queryClient.fetchQuery({ queryKey: invitationThemeKeys.publicTheme(slug), queryFn: () => fetchInvitationTheme(slug) }),
        [queryClient],
    );

    const plan = useCallback(
        async (layout: LayoutState, slug: string | null) => {
            // The old theme's images must not stay behind; a theme that no longer loads leaves none to strip.
            const oldIds = layout.themeSlug
                ? await loadTheme(layout.themeSlug).then(
                      (theme) => themeImageIds(theme.assetUrls),
                      () => new Set<string>(),
                  )
                : new Set<string>();
            if (slug === null) return planFeedWallSwitch(layout.document, wallThemeDesign(event.theme), event.eventType, oldIds);
            const target = await loadTheme(slug);
            return planFeedThemeSwitch(layout.document, { ...readThemePreview(target), imageIds: themeImageIds(target.assetUrls) }, oldIds);
        },
        [event.eventType, event.theme, loadTheme],
    );

    const freshLayout = useCallback(async (): Promise<LayoutState> => {
        const dto = await queryClient.fetchQuery({ queryKey: feedLayoutKeys.detail(event.id), queryFn: () => fetchFeedLayout(event.id), staleTime: 0 });
        return readFeedLayout(dto, event.theme);
    }, [event.id, event.theme, queryClient]);

    const switchTo = useCallback(
        async (slug: string | null): Promise<boolean> => {
            if (inFlight.current) return false;
            if (slug === current.themeSlug) return true;
            inFlight.current = true;
            setIsSaving(true);
            setIsSaved(false);
            setError(null);
            try {
                let layout: LayoutState = current;
                for (let attempt = 0; ; attempt++) {
                    const document = await plan(layout, slug);
                    try {
                        await save.mutateAsync({ revision: layout.revision, themeSlug: slug, document });
                        break;
                    } catch (saveError) {
                        if (attempt > 0 || !isStaleRevision(saveError)) throw saveError;
                        layout = await freshLayout();
                    }
                }
                setIsSaved(true);
                return true;
            } catch (switchError) {
                setError(switchError);
                void queryClient.invalidateQueries({ queryKey: feedLayoutKeys.detail(event.id) });
                return false;
            } finally {
                inFlight.current = false;
                setIsSaving(false);
            }
        },
        [current, event.id, freshLayout, plan, queryClient, save],
    );

    return { switchTo, isSaving, isSaved, error };
}
```

- [ ] **Step 4: Run them to make sure they pass**

Run: `npx vitest run hooks/useFeedThemeSwitch.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add hooks/useFeedThemeSwitch.ts hooks/useFeedThemeSwitch.test.tsx
git commit -m "KAN-244: useFeedThemeSwitch moves the feed layout between themes"
```

---

### Task 6: theme cards with a theme font and a lock

**Files:**
- Modify: `components/manage/ThemePresetRadioGroup.tsx`, `components/manage/ThemePresetOption.tsx`
- Test: `components/manage/ThemePresetRadioGroup.test.tsx`
- Modify: `components/manage/ThemePresetRadioGroup.stories.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `components/manage/ThemePresetRadioGroup.test.tsx`, reusing its imports and mocks. Make sure it imports `fireEvent`, `render`, `screen` from `@testing-library/react`, `vi` from `vitest` and `type ThemeRadioOption` from `@/components/manage/ThemePresetRadioGroup`.

```tsx
describe('Save my date cards', () => {
    const invitation = (overrides: Partial<ThemeRadioOption> = {}): ThemeRadioOption => ({
        id: 'invitation:rose',
        presetId: 'invitation:rose',
        label: 'Rose',
        backgroundColor: null,
        illustrationUrl: null,
        titleColor: '#9C4A5A',
        headingFont: null,
        titleFontFamily: '"Playfair Display", serif',
        selected: false,
        ...overrides,
    });

    it("draws the title in the theme's font", () => {
        render(<ThemePresetRadioGroup options={[invitation()]} labelledBy="h" disabled={false} onSelectAction={vi.fn()} />);
        const title = screen.getByText('Rose').parentElement!;
        expect(title).toHaveAttribute('data-theme-font', '');
        expect(title.style.getPropertyValue('--event-heading-font')).toBe('"Playfair Display", serif');
    });

    it('says why a locked card needs Save my date', () => {
        render(
            <ThemePresetRadioGroup
                options={[invitation({ locked: true, lockedLabel: 'Needs Save my date' })]}
                labelledBy="h"
                disabled={false}
                onSelectAction={vi.fn()}
            />,
        );
        expect(screen.getByRole('radio', { name: 'Rose' })).toHaveAccessibleDescription('Needs Save my date');
        expect(screen.getByTitle('Needs Save my date')).toBeInTheDocument();
    });

    it("a locked card the host can't buy is not pickable", () => {
        const onSelect = vi.fn();
        render(
            <ThemePresetRadioGroup
                options={[invitation({ presetId: undefined, locked: true, lockedLabel: 'Needs Save my date' })]}
                labelledBy="h"
                disabled={false}
                onSelectAction={onSelect}
            />,
        );
        fireEvent.click(screen.getByRole('radio', { name: 'Rose' }));
        expect(onSelect).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run components/manage/ThemePresetRadioGroup.test.tsx`
Expected: FAIL: the font test finds no `data-theme-font`, the lock test finds no description or title. (The third already passes: an undefined `presetId` is inert today.)

- [ ] **Step 3: Pass the new fields through the radio group**

In `components/manage/ThemePresetRadioGroup.tsx`, add to `ThemeRadioOption` after `headingFont`:

```ts
    // A Save my date theme's title font, as its design names it; the card's title uses it.
    titleFontFamily?: string | null;
    // Needs the save_my_date module; lockedLabel says so.
    locked?: boolean;
    lockedLabel?: string;
```

and in the `<ThemePresetOption ... />` call, after `headingFont={option.headingFont}`:

```tsx
                    titleFontFamily={option.titleFontFamily ?? null}
                    locked={option.locked ?? false}
                    lockedLabel={option.lockedLabel}
```

- [ ] **Step 4: Draw the font and the lock in the card**

In `components/manage/ThemePresetOption.tsx`:

1. Imports: `import { Check, Loader2, Lock } from 'lucide-react';`, `import { useId, useState } from 'react';`; replace `import { eventThemeStyle, isHexColor, themeFontScopeProps } from '@/lib/eventTheme';` with `import { isHexColor } from '@/lib/eventTheme';` and add `import { themeCardTitleLook } from '@/lib/feedThemes';`.
2. Props: destructure `titleFontFamily = null`, `locked = false`, `lockedLabel` after `headingFont`, and add to the type after `headingFont: EventThemeFontDto | null;`:

```ts
    // A Save my date theme's title font; the title uses it instead of headingFont.
    titleFontFamily?: string | null;
    locked?: boolean;
    // The lock's hover text and screen-reader description.
    lockedLabel?: string;
```

3. Replace

```ts
    const themeStyle = eventThemeStyle(backgroundColor, { titleColor, headingFont });
    // The preset's title colour, whenever the theme is usable (themeStyle is set only for a valid background).
    const hasTitleColor = themeStyle !== undefined && titleColor !== null && isHexColor(titleColor);
```

with

```ts
    const title = themeCardTitleLook({ backgroundColor, titleColor, headingFont, titleFontFamily });
    const lockedId = useId();
```

4. On the `<button>`, after `aria-disabled={inert}`, add `aria-describedby={locked ? lockedId : undefined}`.
5. Inside the swatch, right before `{saving && (`:

```tsx
                {/* Lock: the theme needs Save my date */}
                {locked && (
                    <span
                        title={lockedLabel}
                        className="absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-ink"
                    >
                        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                        <span id={lockedId} className="sr-only">
                            {lockedLabel}
                        </span>
                    </span>
                )}
```

6. On the title wrapper, replace

```tsx
                {...themeFontScopeProps(themeStyle ? headingFont : null)}
                style={themeStyle}
```

with

```tsx
                {...title.scopeProps}
                style={title.style}
```

replace `hasTitleColor ? 'text-event-title' : 'text-ink'` with `title.hasTitleColor ? 'text-event-title' : 'text-ink'`, and replace the comment line `{/* An unusable background means no theme at all, font included (EventThemeScope's rule) */}` with `{/* A preset's look needs a usable background (EventThemeScope's rule); a Save my date theme's always shows */}`.

7. The swatch's `style={backgroundColor && isHexColor(backgroundColor) ? { backgroundColor } : undefined}` stays: it is the remaining `isHexColor` use.

- [ ] **Step 5: Run the card and picker tests**

Run: `npx vitest run components/manage/ThemePresetRadioGroup.test.tsx components/manage/ThemePicker.test.tsx`
Expected: PASS, the old tests included.

- [ ] **Step 6: Add stories**

In `components/manage/ThemePresetRadioGroup.stories.tsx`, after `PRESETS`:

```tsx
// Save my date themes as the Theme page lists them after the presets; names come from the server.
const INVITATION_THEMES: ThemeRadioOption[] = [
    { id: 'invitation:rose', label: 'Rose garden', backgroundColor: '#FBE6E4', titleColor: '#9C4A5A', titleFontFamily: 'Georgia, serif' },
    { id: 'invitation:olive', label: 'Olive branch', backgroundColor: '#EEF1E4', titleColor: '#4D5A2C', titleFontFamily: '"Courier New", monospace' },
].map((theme) => ({ ...theme, presetId: theme.id, illustrationUrl: null, headingFont: null, selected: false }));
```

Give the story's `ThemeGrid` component an `extra?: ThemeRadioOption[]` prop and pass `options={[none, ...PRESETS, ...(extra ?? [])]}`. Inside `ThemeGrid`, read the lock wording with `t('locked')` and lock the extras when a new `locked?: boolean` prop is set:

```tsx
    const extras = (extra ?? []).map((option) => (locked ? { ...option, locked: true, lockedLabel: t('locked') } : option));
```

(pass `options={[none, ...PRESETS, ...extras]}` instead). Then add, after the existing stories, using the file's `Story` type (add `type Story = StoryObj<typeof meta>;` only if it is missing):

```tsx
export const WithInvitationThemes: Story = {
    args: { extra: INVITATION_THEMES },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('radio', { name: 'Rose garden' })).toBeInTheDocument();
    },
};

export const LockedInvitationThemes: Story = {
    args: { extra: INVITATION_THEMES, locked: true },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('radio', { name: 'Rose garden' })).toHaveAccessibleDescription(copyFor('ManagePage.settings.theme.locked'));
    },
};
```

Match the `copyFor` call to how the file's existing stories call it (check its signature in `.storybook/copy`).

- [ ] **Step 7: Build Storybook**

Run: `npx storybook build --test --quiet -o C:/Users/User/AppData/Local/Temp/claude/sb-kan244`
Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add components/manage/ThemePresetRadioGroup.tsx components/manage/ThemePresetOption.tsx components/manage/ThemePresetRadioGroup.test.tsx components/manage/ThemePresetRadioGroup.stories.tsx
git commit -m "KAN-244: theme cards draw a Save my date theme's font and a lock"
```

---

### Task 7: one shell for both pickers

**Files:**
- Modify: `hooks/useThemePicker.ts`, `hooks/useThemePicker.test.tsx`
- Create: `hooks/useWallThemeOptions.ts`, `components/manage/ThemePickerView.tsx`
- Modify: `components/manage/ThemePicker.tsx`

Today's behaviour stays exactly as it is; `ThemePicker.test.tsx` must pass unchanged.

- [ ] **Step 1: Write the failing `isApplied` test**

Add to `hooks/useThemePicker.test.tsx`, inside its main `describe`, rendering the hook the way the nearest existing test does (its `eventWith(themeEnabled, presetKey)` helper builds the event; preset `p1` has key `dino-mint`):

```tsx
    it('knows which pick is already on the event', () => {
        const { result } = renderHook(() => useThemePicker(eventWith(true, 'dino-mint'), true));
        expect(result.current.isApplied('p1')).toBe(true);
        expect(result.current.isApplied(null)).toBe(false);
        expect(result.current.isApplied('other')).toBe(false);
    });
```

Run: `npx vitest run hooks/useThemePicker.test.tsx`
Expected: FAIL, `result.current.isApplied is not a function`.

- [ ] **Step 2: Add `isApplied`**

In `hooks/useThemePicker.ts`, before `return {`:

```ts
    const selectedKey = event.theme?.presetKey ?? null;
    // Whether picking this preset (null: "No theme") would change nothing.
    const isApplied = useCallback(
        (presetId: string | null) =>
            presetId === null ? selectedKey === null : presets.data?.find((preset) => preset.id === presetId)?.key === selectedKey,
        [presets.data, selectedKey],
    );
```

In the returned object, replace `selectedKey: event.theme?.presetKey ?? null,` with `selectedKey,` and add `isApplied,` after `select,`.

Run: `npx vitest run hooks/useThemePicker.test.tsx`
Expected: PASS.

- [ ] **Step 3: Move the wall options into a hook**

Create `hooks/useWallThemeOptions.ts`:

```ts
'use client';

import { useTranslations } from 'next-intl';

import type { ThemeRadioOption } from '@/components/manage/ThemePresetRadioGroup';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import type { useThemePicker } from '@/hooks/useThemePicker';

// "No theme", the applied theme when it is no longer offered, and every preset, as theme cards.
// `checkable` is off while the feed is on a Save my date theme: then no wall card is the current one,
// and the no-longer-offered one, which can't be picked again, is left out.
export function useWallThemeOptions(picker: ReturnType<typeof useThemePicker>, { checkable }: { checkable: boolean }): ThemeRadioOption[] {
    const t = useTranslations('ManagePage.settings.theme');
    const localizedText = useLocalizedText();
    const stale = checkable ? picker.staleTheme : null;

    return [
        {
            id: 'none',
            presetId: null,
            label: t('none'),
            backgroundColor: null,
            illustrationUrl: null,
            titleColor: null,
            headingFont: null,
            selected: checkable && picker.selectedKey === null,
        },
        // The applied theme leads when it is no longer offered, so the host can see what is on the event.
        ...(stale
            ? [
                  {
                      id: 'current',
                      presetId: undefined,
                      label: t('current'),
                      backgroundColor: stale.backgroundColor,
                      illustrationUrl: stale.illustrationUrl,
                      titleColor: stale.titleColor,
                      headingFont: stale.headingFont,
                      selected: true,
                  },
              ]
            : []),
        ...picker.presets.map((preset) => ({
            id: preset.id,
            presetId: preset.id,
            label: localizedText(preset.name, preset.key),
            backgroundColor: preset.backgroundColor,
            illustrationUrl: preset.illustrationUrl,
            titleColor: preset.titleColor,
            headingFont: preset.headingFont,
            selected: checkable && picker.selectedKey === preset.key,
        })),
    ];
}
```

- [ ] **Step 4: Move the page shell into a view**

Create `components/manage/ThemePickerView.tsx` with the JSX `ThemePicker` returns today:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { ThemePresetRadioGroup, type ThemeRadioOption } from '@/components/manage/ThemePresetRadioGroup';
import { LoadingState } from '@/components/ui/LoadingState';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';

type ThemePickerViewProps = {
    heading: string;
    // Off in the Theme section, whose section title already names it.
    showHeading: boolean;
    isLoading: boolean;
    loadError: unknown;
    options: ThemeRadioOption[];
    disabled: boolean;
    savingPresetId: string | null | undefined;
    previewTitle: string | undefined;
    isSaving: boolean;
    isSaved: boolean;
    saveError: unknown;
    onSelectAction: (choice: string | null) => void;
};

// The theme grid with its heading, loading and save states. Shared by the wall-only picker and the
// one that also lists Save my date themes.
export function ThemePickerView({
    heading,
    showHeading,
    isLoading,
    loadError,
    options,
    disabled,
    savingPresetId,
    previewTitle,
    isSaving,
    isSaved,
    saveError,
    onSelectAction,
}: ThemePickerViewProps) {
    const t = useTranslations('ManagePage.settings.theme');
    const toErrorMessage = useApiErrorMessage();
    const headingId = useId();
    const status = isSaving ? t('saving') : isSaved ? t('saved') : '';

    return (
        <section className="mb-6">
            {/* Heading */}
            <h2 id={headingId} className={showHeading ? 'text-xs font-semibold tracking-wide text-ink-muted uppercase' : 'sr-only'}>
                {heading}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">{t('hint')}</p>

            {/* Loading / error */}
            {isLoading && <LoadingState label={t('loading')} className="mt-4 justify-start" />}
            {Boolean(loadError) && <p className="mt-4 text-xs text-rose-500">{toErrorMessage(loadError)}</p>}

            {/* Options */}
            {!isLoading && !loadError && (
                <ThemePresetRadioGroup
                    options={options}
                    labelledBy={headingId}
                    disabled={disabled}
                    savingPresetId={savingPresetId}
                    previewTitle={previewTitle}
                    onSelectAction={onSelectAction}
                />
            )}

            {/* Save status, announced politely; a failure is an alert */}
            <p role="status" className="sr-only">
                {status}
            </p>
            {Boolean(saveError) && (
                <p role="alert" className="mt-3 text-xs text-rose-500">
                    {toErrorMessage(saveError)}
                </p>
            )}
        </section>
    );
}
```

If `toErrorMessage` doesn't take `unknown`, type `loadError` and `saveError` as `Parameters<ReturnType<typeof useApiErrorMessage>>[0]`.

- [ ] **Step 5: Make `ThemePicker` compose them**

Replace `components/manage/ThemePicker.tsx` with:

```tsx
'use client';

import { ThemePickerView } from '@/components/manage/ThemePickerView';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import { useThemePicker } from '@/hooks/useThemePicker';
import { useWallThemeOptions } from '@/hooks/useWallThemeOptions';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { themePreviewTitle } from '@/lib/eventTheme';

// The wall themes only: the draft Overview's theme step, and the Theme section while the feed editor
// is off. `showHeading` is off in the Theme section, whose section title already names it.
export function ThemePicker({ event, canWrite, showHeading = true }: { event: EventDetailResponseDto; canWrite: boolean; showHeading?: boolean }) {
    const themeName = useModuleCopy(event.eventType)('theme').name;
    const picker = useThemePicker(event, canWrite);
    const options = useWallThemeOptions(picker, { checkable: true });

    if (!picker.available) return null;

    return (
        <ThemePickerView
            heading={themeName}
            showHeading={showHeading}
            isLoading={picker.isLoading}
            loadError={picker.loadError}
            options={options}
            disabled={picker.disabled}
            savingPresetId={picker.isSaving ? picker.savingPresetId : undefined}
            previewTitle={themePreviewTitle(event.title)}
            isSaving={picker.isSaving}
            isSaved={picker.isSaved}
            saveError={picker.saveError}
            onSelectAction={picker.select}
        />
    );
}
```

- [ ] **Step 6: Run the picker tests unchanged**

Run: `npx vitest run components/manage/ThemePicker.test.tsx "app/(main)/(app)/(event)/events/[eventId]/manage/OverviewTab.themePicker.test.tsx" hooks/useThemePicker.test.tsx`
Expected: PASS, with no edit to `ThemePicker.test.tsx` (its mocked picker has no `staleTheme`; `undefined` counts as none).

- [ ] **Step 7: Commit**

```bash
git add hooks/useThemePicker.ts hooks/useThemePicker.test.tsx hooks/useWallThemeOptions.ts components/manage/ThemePickerView.tsx components/manage/ThemePicker.tsx
git commit -m "KAN-244: theme picker shell and wall options shared by both pickers"
```

---

### Task 8: the grid with both kinds

**Files:**
- Create: `hooks/useThemeGrid.ts`, `components/manage/InvitationFontFaces.tsx`, `components/manage/FeedThemePicker.tsx`, `components/manage/ThemeSection.tsx`
- Modify: `components/manage/ManageScreen.tsx` (line 119 and the import)
- Test: `hooks/useThemeGrid.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useThemeGrid } from '@/hooks/useThemeGrid';
import type { EventDetailResponseDto } from '@/lib/api/types';

const m = vi.hoisted(() => ({
    picker: {} as Record<string, unknown>,
    layout: { document: {}, revision: 3, themeSlug: null as string | null, isLoading: false },
    cards: [] as unknown[],
    switchTo: (async () => true) as (slug: string | null) => Promise<boolean>,
    primaryHost: true,
}));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
vi.mock('@/hooks/useThemePicker', () => ({ useThemePicker: () => m.picker }));
vi.mock('@/hooks/useFeedLayout', () => ({ useFeedLayout: () => m.layout }));
vi.mock('@/hooks/useInvitationThemeCards', () => ({ useInvitationThemeCards: () => ({ cards: m.cards, fontFaces: '', isLoading: false }) }));
vi.mock('@/hooks/useFeedThemeSwitch', () => ({
    useFeedThemeSwitch: () => ({ switchTo: m.switchTo, isSaving: false, isSaved: false, error: null }),
}));
vi.mock('@/hooks/usePlanUpgradeHref', () => ({ usePlanUpgradeHref: () => (m.primaryHost ? '/events/e1/manage?tab=plan' : null) }));

const PRESET = { id: 'p1', key: 'dino-mint', name: { en: 'Dino' }, backgroundColor: '#BFE6E2', illustrationUrl: null, titleColor: null, headingFont: null };
const ROSE = { slug: 'rose', name: 'Rose', cardColor: '#FBE6E4', illustrationUrl: null, titleFontFamily: 'Georgia, serif', titleColor: '#9C4A5A' };

function eventWith(saveMyDate: boolean) {
    return { id: 'e1', eventType: 'WEDDING', modules: [{ moduleKey: 'save_my_date', isAvailable: saveMyDate }] } as unknown as EventDetailResponseDto;
}

beforeEach(() => {
    m.picker = {
        available: true,
        presets: [PRESET],
        isLoading: false,
        loadError: null,
        selectedKey: 'dino-mint',
        staleTheme: null,
        isSaving: false,
        isSaved: false,
        savingPresetId: null,
        saveError: null,
        disabled: false,
        select: vi.fn(),
        isApplied: (presetId: string | null) => presetId === 'p1',
    };
    m.layout = { document: {}, revision: 3, themeSlug: null, isLoading: false };
    m.cards = [ROSE];
    m.switchTo = vi.fn(async () => true);
    m.primaryHost = true;
});

const optionNamed = (options: { label: string }[], label: string) => options.find((option) => option.label === label) as Record<string, unknown>;

describe('useThemeGrid', () => {
    it('lists the wall themes, then the Save my date themes', () => {
        const { result } = renderHook(() => useThemeGrid(eventWith(true), true, vi.fn()));
        expect(result.current.options.map((option) => option.label)).toEqual(['none', 'Dino', 'Rose']);
        expect(optionNamed(result.current.options, 'Dino').selected).toBe(true);
        expect(optionNamed(result.current.options, 'Rose')).toMatchObject({ presetId: 'invitation:rose', titleFontFamily: 'Georgia, serif', locked: false });
    });

    it('checks the Save my date theme the feed is on, and no wall theme', () => {
        m.layout = { ...m.layout, themeSlug: 'rose' };
        const { result } = renderHook(() => useThemeGrid(eventWith(true), true, vi.fn()));
        expect(result.current.options.filter((option) => option.selected).map((option) => option.label)).toEqual(['Rose']);
    });

    it('moves the feed onto a Save my date theme', async () => {
        const { result } = renderHook(() => useThemeGrid(eventWith(true), true, vi.fn()));
        await act(() => result.current.select('invitation:rose'));
        expect(m.switchTo).toHaveBeenCalledWith('rose');
        expect(m.picker.select).not.toHaveBeenCalled();
    });

    it('picks a wall theme as today while the feed is on the wall theme', async () => {
        const { result } = renderHook(() => useThemeGrid(eventWith(true), true, vi.fn()));
        await act(() => result.current.select(null));
        expect(m.picker.select).toHaveBeenCalledWith(null);
        expect(m.switchTo).not.toHaveBeenCalled();
    });

    it('moves the feed back first, then saves a wall theme not yet on the event', async () => {
        m.layout = { ...m.layout, themeSlug: 'rose' };
        const { result } = renderHook(() => useThemeGrid(eventWith(true), true, vi.fn()));
        await act(() => result.current.select(null));
        expect(m.switchTo).toHaveBeenCalledWith(null);
        expect(m.picker.select).toHaveBeenCalledWith(null);
    });

    it("doesn't save a wall theme that is already on the event", async () => {
        m.layout = { ...m.layout, themeSlug: 'rose' };
        const { result } = renderHook(() => useThemeGrid(eventWith(true), true, vi.fn()));
        await act(() => result.current.select('p1'));
        expect(m.switchTo).toHaveBeenCalledWith(null);
        expect(m.picker.select).not.toHaveBeenCalled();
    });

    it('locks Save my date themes without the module, and the main host goes to Billing', async () => {
        const openBilling = vi.fn();
        const { result } = renderHook(() => useThemeGrid(eventWith(false), true, openBilling));
        expect(optionNamed(result.current.options, 'Rose')).toMatchObject({ locked: true, lockedLabel: 'locked', presetId: 'invitation:rose' });
        await act(() => result.current.select('invitation:rose'));
        expect(openBilling).toHaveBeenCalled();
        expect(m.switchTo).not.toHaveBeenCalled();
    });

    it("gives co-hosts a locked card they can't pick", () => {
        m.primaryHost = false;
        const { result } = renderHook(() => useThemeGrid(eventWith(false), true, vi.fn()));
        expect(optionNamed(result.current.options, 'Rose').presetId).toBeUndefined();
    });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run hooks/useThemeGrid.test.tsx`
Expected: FAIL, `Failed to resolve import "@/hooks/useThemeGrid"`.

- [ ] **Step 3: Write the hook**

```ts
'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import type { ThemeRadioOption } from '@/components/manage/ThemePresetRadioGroup';
import { useFeedLayout } from '@/hooks/useFeedLayout';
import { useFeedThemeSwitch } from '@/hooks/useFeedThemeSwitch';
import { useInvitationThemeCards } from '@/hooks/useInvitationThemeCards';
import { usePlanUpgradeHref } from '@/hooks/usePlanUpgradeHref';
import { useThemePicker } from '@/hooks/useThemePicker';
import { useWallThemeOptions } from '@/hooks/useWallThemeOptions';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import { invitationThemeChoice, readThemeChoice } from '@/lib/feedThemes';

// The Theme section with the feed editor on: the wall themes, then the event type's Save my date
// themes, in one grid. A Save my date theme dresses the feed (its layout); a wall theme dresses the
// event's pages, and picking one while the feed is on a Save my date theme moves the feed back first.
export function useThemeGrid(event: EventDetailResponseDto, canWrite: boolean, onOpenBilling: () => void) {
    const t = useTranslations('ManagePage.settings.theme');
    const picker = useThemePicker(event, canWrite);
    const layout = useFeedLayout(event, { enabled: picker.available });
    const onInvitationTheme = layout.themeSlug !== null;
    const wallOptions = useWallThemeOptions(picker, { checkable: !onInvitationTheme });
    const themeCards = useInvitationThemeCards(event.eventType, { enabled: picker.available });
    const feed = useFeedThemeSwitch(event, layout);
    // Only the main host can buy Save my date.
    const canBuy = usePlanUpgradeHref(event.id) !== null;
    const locked = !isModuleAvailable(event.modules, 'save_my_date');
    // The card being saved, across both saves of a move back to a wall theme; undefined when none.
    const [pending, setPending] = useState<string | null | undefined>(undefined);

    const invitationOptions: ThemeRadioOption[] = themeCards.cards.map((card) => ({
        id: invitationThemeChoice(card.slug),
        // A locked card the host can't buy can't be picked.
        presetId: locked && !canBuy ? undefined : invitationThemeChoice(card.slug),
        label: card.name,
        backgroundColor: card.cardColor,
        illustrationUrl: card.illustrationUrl,
        titleColor: card.titleColor,
        headingFont: null,
        titleFontFamily: card.titleFontFamily,
        locked,
        lockedLabel: locked ? t('locked') : undefined,
        selected: layout.themeSlug === card.slug,
    }));

    const { switchTo } = feed;
    const { select: selectWall, isApplied } = picker;
    const select = useCallback(
        async (choice: string | null) => {
            if (!canWrite || pending !== undefined) return;
            const slug = readThemeChoice(choice);
            if (slug !== null && locked) {
                onOpenBilling();
                return;
            }
            if (slug === null && !onInvitationTheme) {
                selectWall(choice);
                return;
            }
            setPending(choice);
            try {
                if (slug !== null) await switchTo(slug);
                else if ((await switchTo(null)) && !isApplied(choice)) selectWall(choice);
            } finally {
                setPending(undefined);
            }
        },
        [canWrite, isApplied, locked, onInvitationTheme, onOpenBilling, pending, selectWall, switchTo],
    );

    return {
        available: picker.available,
        isLoading: picker.isLoading || layout.isLoading,
        loadError: picker.loadError,
        options: [...wallOptions, ...invitationOptions],
        hasInvitationThemes: invitationOptions.length > 0,
        fontFaces: themeCards.fontFaces,
        disabled: picker.disabled || pending !== undefined,
        savingPresetId: pending !== undefined ? pending : picker.isSaving ? picker.savingPresetId : undefined,
        isSaving: pending !== undefined || picker.isSaving,
        isSaved: pending === undefined && (feed.isSaved || picker.isSaved),
        saveError: feed.error ?? picker.saveError,
        select,
    };
}
```

- [ ] **Step 4: Run them to make sure they pass**

Run: `npx vitest run hooks/useThemeGrid.test.tsx`
Expected: PASS, 8 tests.

- [ ] **Step 5: The fonts, loaded only with Save my date cards**

Create `components/manage/InvitationFontFaces.tsx`:

```tsx
import { INVITATION_FONT_CLASSES } from '@/components/saveMyDate/invitation/invitationFonts';

// The Save my date fonts the theme cards' titles use. Importing them declares their faces; the
// uploaded ones come as CSS. FeedThemePicker loads this only once it lists Save my date cards.
export function InvitationFontFaces({ css }: { css: string }) {
    return (
        <>
            <span hidden className={INVITATION_FONT_CLASSES} />
            {/* Uploaded fonts: built only from validated names and urls, so safe to inline */}
            {css && <style>{css}</style>}
        </>
    );
}
```

- [ ] **Step 6: The picker and the section switch**

Create `components/manage/FeedThemePicker.tsx`:

```tsx
'use client';

import dynamic from 'next/dynamic';

import { ThemePickerView } from '@/components/manage/ThemePickerView';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import { useThemeGrid } from '@/hooks/useThemeGrid';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { themePreviewTitle } from '@/lib/eventTheme';

// Loaded only with Save my date cards, so a page without them loads none of their fonts.
const InvitationFontFaces = dynamic(() => import('@/components/manage/InvitationFontFaces').then((module) => module.InvitationFontFaces));

type FeedThemePickerProps = { event: EventDetailResponseDto; canWrite: boolean; onOpenBilling: () => void };

// The Theme section with the feed editor on: wall themes and Save my date themes in one grid.
export function FeedThemePicker({ event, canWrite, onOpenBilling }: FeedThemePickerProps) {
    const themeName = useModuleCopy(event.eventType)('theme').name;
    const grid = useThemeGrid(event, canWrite, onOpenBilling);

    if (!grid.available) return null;

    return (
        <>
            {/* Theme fonts */}
            {grid.hasInvitationThemes && <InvitationFontFaces css={grid.fontFaces} />}

            {/* Themes */}
            <ThemePickerView
                heading={themeName}
                showHeading={false}
                isLoading={grid.isLoading}
                loadError={grid.loadError}
                options={grid.options}
                disabled={grid.disabled}
                savingPresetId={grid.savingPresetId}
                previewTitle={themePreviewTitle(event.title)}
                isSaving={grid.isSaving}
                isSaved={grid.isSaved}
                saveError={grid.saveError}
                onSelectAction={grid.select}
            />
        </>
    );
}
```

If eslint flags the promise-returning `grid.select`, pass `onSelectAction={(choice) => void grid.select(choice)}`.

Create `components/manage/ThemeSection.tsx`:

```tsx
'use client';

import { FeedThemePicker } from '@/components/manage/FeedThemePicker';
import { ThemePicker } from '@/components/manage/ThemePicker';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { isCatalogueEventType } from '@/lib/invitation/themeCatalogue';
import { useFeedEditorEnabled } from '@/providers/FeedEditorFlagProvider';

type ThemeSectionProps = { event: EventDetailResponseDto; canWrite: boolean; onOpenBilling: () => void };

// The manage page's Theme section. With the feed editor on, an event type that has Save my date themes
// lists them too; otherwise it is today's wall-only picker.
export function ThemeSection({ event, canWrite, onOpenBilling }: ThemeSectionProps) {
    const feedEditor = useFeedEditorEnabled();
    if (feedEditor && isCatalogueEventType(event.eventType)) {
        return <FeedThemePicker event={event} canWrite={canWrite} onOpenBilling={onOpenBilling} />;
    }
    return <ThemePicker event={event} canWrite={canWrite} showHeading={false} />;
}
```

- [ ] **Step 7: Use it in ManageScreen**

In `components/manage/ManageScreen.tsx`, replace `import { ThemePicker } from '@/components/manage/ThemePicker';` with `import { ThemeSection } from '@/components/manage/ThemeSection';`, add, right after the `useManageSectionRoute({ ... })` call:

```tsx
    const openBilling = useCallback(() => navigateToSection('billing'), [navigateToSection]);
```

(import `useCallback` from `react`), and replace line 119 with:

```tsx
            {section === 'theme' && <ThemeSection event={activeEvent} canWrite={canEditDetails} onOpenBilling={openBilling} />}
```

- [ ] **Step 8: Run the manage tests**

Run: `npx vitest run hooks/useThemeGrid.test.tsx components/manage "app/(main)/(app)/(event)/events/[eventId]/manage"`
Expected: PASS. A `ManageScreen` test that renders the Theme section without `FeedEditorFlagProvider` gets today's `ThemePicker` (the flag defaults to off).

- [ ] **Step 9: Type-check and lint**

Run: `npx tsc --noEmit` and `npx eslint hooks components/manage lib/feedThemes.ts`
Expected: no errors. Fix import order with `npx eslint --fix <file>`.

- [ ] **Step 10: Commit**

```bash
git add hooks/useThemeGrid.ts hooks/useThemeGrid.test.tsx components/manage/InvitationFontFaces.tsx components/manage/FeedThemePicker.tsx components/manage/ThemeSection.tsx components/manage/ManageScreen.tsx
git commit -m "KAN-244: the Theme section lists wall and Save my date themes behind the flag"
```

---

### Task 9: flag and prefetch on the manage page

**Files:**
- Modify: `app/(main)/(app)/(event)/events/[eventId]/manage/(root)/page.tsx`

- [ ] **Step 1: Imports**

Add:

```ts
import { showsFeedEditor } from '@/lib/feedEditorRelease';
import { feedLayoutKeys } from '@/lib/feedLayout';
import { fetchThemeCatalogue } from '@/lib/invitation/serverThemeCatalogue';
import { invitationThemeKeys, isCatalogueEventType } from '@/lib/invitation/themeCatalogue';
import { FeedEditorFlagProvider } from '@/providers/FeedEditorFlagProvider';
```

and `FeedLayoutDto` to the `@/lib/api/types` import list.

- [ ] **Step 2: Prefetch what the grid asks for**

After `prefetchBilling`, add:

```ts
// The Theme section with the feed editor on (useThemeGrid): the feed layout (404 caches as null: the
// default layout) and the Save my date catalogue. Not the themes' designs: they are large, and the
// cards draw without them. Each seeds on its own.
async function prefetchThemeGrid(eventId: string, accessToken: string) {
    const [layout, catalogue] = await Promise.all([
        serverGetOrNull<FeedLayoutDto>(endpoints.events.feedLayout(eventId), accessToken).catch(() => undefined),
        fetchThemeCatalogue().catch(() => null),
    ]);
    return (queryClient: ReturnType<typeof makeQueryClient>) => {
        if (layout !== undefined) queryClient.setQueryData(feedLayoutKeys.detail(eventId), layout);
        if (catalogue) queryClient.setQueryData(invitationThemeKeys.catalogue(), catalogue);
    };
}
```

In `Page`, after `const queryClient = makeQueryClient();`, add `const feedEditor = showsFeedEditor();`. Inside the `try`, after `const billing = ...`:

```ts
            // Mirrors ThemeSection: the flag, an event type with Save my date themes, and the picker
            // offered on a live event's Theme tab.
            const opensThemeGrid = feedEditor && !isDraft && wantsThemePresets && isCatalogueEventType(event.eventType);
            const themeGrid = opensThemeGrid ? prefetchThemeGrid(eventId, accessToken) : null;
```

and after `if (billing) (await billing)(queryClient);`:

```ts
            if (themeGrid) (await themeGrid)(queryClient);
```

- [ ] **Step 3: Hand the flag to the client**

Replace the returned JSX with:

```tsx
    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <FeedEditorFlagProvider enabled={feedEditor}>
                <ManagePage />
            </FeedEditorFlagProvider>
        </HydrationBoundary>
    );
```

- [ ] **Step 4: Type-check, lint, build**

Run: `npx tsc --noEmit`, `npx eslint "app/(main)/(app)/(event)/events/[eventId]/manage"`, `npx next build`
Expected: all clean. After `next build`, revert any change it made to `AGENTS.md` (`git checkout -- AGENTS.md`) and stage files by name only.

- [ ] **Step 5: Commit**

```bash
git add "app/(main)/(app)/(event)/events/[eventId]/manage/(root)/page.tsx"
git commit -m "KAN-244: manage page hands down the feed editor flag and prefetches the theme grid"
```

---

### Task 10: checks

- [ ] **Step 1: The whole suite**

Run: `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`
Expected: clean. The save-my-date vitest timeouts are a known open issue: re-run only those files with `--testTimeout=20000`. Any other failure blocks.

- [ ] **Step 2: Storybook**

Run: `npx storybook build --test --quiet -o C:/Users/User/AppData/Local/Temp/claude/sb-kan244`
Expected: build succeeds.

- [ ] **Step 3: Browser check, signed in**

Needs the local backend with KAN-243 (feed-layout API) and this worktree's dev server on :3000 (local CORS allows only :3000). Ask the owner for the local test login. Never `preview_start {name}`; open the pane with `preview_start {url: "http://localhost:3000/"}`. On a WEDDING event's `manage?tab=theme`, at 375px and 1280px:

- a. The wall themes show first, then the wedding Save my date themes; each Save my date card's title is in that theme's font (in devtools: the title's computed `font-family`, and `document.fonts.check` for it is true).
- b. On an event with Save my date: pick one. The card spins, then is checked; no wall card is checked. The feed (`/events/<id>/feed`) shows the theme, with cover, details, description and RSVP in the theme's looks.
- c. Pick a wall theme. The feed is back to the plain look; the wall card is checked.
- d. On an event without Save my date: the cards show the lock, hovering shows "Needs Save my date", and a tap opens Billing. Signed in as a co-host, the locked cards can't be picked.
- e. With the flag off (production env), the Theme page is today's.

Record pass or fail for each, and look at the other width for overlap or cramped titles.

- [ ] **Step 4: Report**

List what passed, what failed, and anything not checked. Do not push or open the PR until the owner says so.
