# Theme Grid with the Event Title Implementation Plan (KAN-230)

**Goal:** The host's Theme page keeps today's grid (No theme + the presets, applied on tap) and each card previews the event title in that theme's font and colour, with the theme name under it, as the event-creation theme step already does (T1).

**Architecture:** No new component. `ThemePicker` passes the event title to `ThemePresetRadioGroup` as `previewTitle`, the prop the creation step already uses. The trim-or-undefined rule moves into `lib/eventTheme.ts` (`themePreviewTitle`) so both callers share it. The `default` card size gets the T1 shape; the creation step's `large` size is untouched. No backend change, no wording change.

**Mockups:** `project/T1-mobile.dc.html` and `project/T1-desktop.dc.html` on the "Host Overview redesign" canvas (claude.ai artifact `CDygEzhyHjNzSeVsrSxWXy`).

## Decisions (owner, 2026-11-17)

- **Where:** the Theme page and the draft Overview's theme step (both render `ThemePicker`) show the title.
- **Columns:** 2 on phones, 3 from `sm` (as today), 4 from `lg` (was `xl`). Gap 10px.
- **Card shape:** T1 corners: card 18px, art 12px. Art box 100px tall on phones, 120px from `lg`. The illustration still fills the box (`object-contain`), as today.
- **Rejected:** a big preview above the grid; a preview with a strip.

## Wording

No new or changed strings. Visible change only: the card's first line is the event title (was the theme name); the theme name moves to a small line below it. Both are existing values. The radio's accessible name stays the theme name.

## Tasks

1. `lib/eventTheme.ts`: add `themePreviewTitle(title)` (+ test); use it in `EventThemeStep`.
2. `ThemePicker`: pass `previewTitle={themePreviewTitle(event.title)}` (+ test).
3. `ThemePresetRadioGroup` / `ThemePresetOption` `default` size: T1 columns, gap, corners and art height (+ test for the grid classes).
4. Stories: `components/manage/ThemePresetRadioGroup.stories.tsx` with the Theme page grid (title, no title, selected, saving), phone and desktop widths.
5. Checks: `tsc --noEmit`, `eslint .`, `vitest run`; browser check at 375px and 1280px in English and Greek.
