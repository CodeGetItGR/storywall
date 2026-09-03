# Story preset filters — design

Spec for the frontend-only feature described in
[`docs/integration guides/story-filters-fe-guide.md`](../../integration%20guides/story-filters-fe-guide.md):
Instagram-Stories-style swipeable preset filters on the story composer's preview screen.
**v1 is images only** — video stories skip the filter UI entirely.

## Scope

- 100% client-side. No backend/API/DTO changes.
- Swipe left/right over the active photo in `StoryComposerModal`'s full-screen preview to
  cycle through a fixed set of named presets (Original, Warm, Golden Hour, Cool, Vivid, Fade,
  Mono, Noir, Vintage — see the FE guide for exact `filter` strings and overlays).
- Each preset is a CSS/canvas `filter` string plus an optional procedural overlay (grain,
  vignette, or white wash) — no static texture assets.
- The filter is baked into the uploaded file at submit time; the backend never knows a filter
  was applied.
- Out of scope for v1: video filters, per-`EventTypeKey` preset sets, keeping/editing the
  unfiltered original after posting.

## Architecture

- **`lib/story/storyFilters.ts`** — static preset table (`StoryFilterPreset[]`: `id`,
  `cssFilter`, optional `overlays` list — Vintage needs both grain and vignette, so it's an array, not a
  single overlay). No `label` field, unlike the FE guide's suggested shape —
  per this project's localization rule, the display name comes from a translation key
  (`t('filters.' + id + '.label')` in `StoryComposer`, mirroring the existing
  `t(\`${key}.label\`)` pattern in [`hooks/useToolsMenuItems.ts`](../../../hooks/useToolsMenuItems.ts))
  rather than being hardcoded in the data file. Also exports a pure async helper
  `bakeStoryFilter(file: File, preset: StoryFilterPreset): Promise<File>` that draws the
  source image to an offscreen canvas with `ctx.filter` set to the preset's CSS filter string,
  composites the procedural overlay (radial-gradient vignette / canvas-generated noise grain /
  flat white wash, per preset), and exports a new `File` with the original name and MIME type.
- **`hooks/useStoryFilterSwipe.ts`** — a plain pointer-event hook driving a live crossfade:
  `onPointerMove` tracks drag distance and derives `targetIndex` (the next/previous preset,
  clamped at the ends — no wraparound) and `dragProgress` (0–1, scaled over a fixed drag
  distance). `onPointerUp` commits to the target once dragged past the halfway point, or
  reverts (no index change) if released earlier. Also owns the transient `visibleName` state
  (live target name while dragging, or the committed preset's name for ~1s after a commit),
  and exposes `setIndex` for external resets. `embla-carousel-react` (already a dependency,
  used the same way in
  [`components/feed/post/PostMediaCarousel.tsx`](../../../components/feed/post/PostMediaCarousel.tsx))
  was tried first, but rendering each preset as a sliding Embla "slide" made swiping read as
  switching to a different photo rather than changing this photo's look, since every slide
  showed the same image. A snap-only pointer-event version (filter changes only on release)
  was tried next, but didn't give a clear enough sense of the filter actually changing.
  Settled on a live crossfade instead: the photo stays visually fixed while the target
  preset's opacity tracks drag progress in real time, and only ever renders (at most) two
  `<Image>` copies — the current preset, plus the target being previewed mid-drag.
- **`useStoryComposerController`** — `PendingStory` gains `filterId: string` (default
  `"original"`). New `setFilter(key: string, filterId: string)` action mirrors the existing
  `updateCaption` per-active-item pattern. Inside `submit`, before handing files to
  `uploadBatch`/`uploadSingle`, every non-video item with `filterId !== "original"` is run
  through `bakeStoryFilter` and its `file` is replaced with the result. Video items are
  untouched (the composer doesn't expose filter UI for them).
- **`StoryComposerModal`** — a local `FilterLayer` component renders one preset's `<Image>`
  (`style={{ filter: preset.cssFilter }}`) plus its overlay `<div>`s. The preview area renders
  the current preset's `FilterLayer` always at full opacity, and — only while `targetIndex` is
  non-null — a second `FilterLayer` for the target preset absolutely positioned on top with
  `style={{ opacity: dragProgress }}`, giving the live crossfade. The swipe hook's pointer
  handlers are attached to the wrapping `div`. Renders the transient name pill while
  `visibleName` is set. Video items keep the current plain preview (no swipe, no filter UI).

## Data flow

1. New `PendingStory` items start with `filterId: "original"` (unchanged capture/pick flow).
2. Swiping over the active image calls `setFilter(activeKey, nextPresetId)` — only the active
   item's filter changes, so each queued photo keeps its own independently-selected filter
   when switching between them via the thumbnail rail.
3. Live look is pure CSS (`filter` + overlay divs) — the photo itself never moves; only the
   target layer's opacity tracks drag progress, and the commit (updating `filterId` via
   `setFilter`) only happens once the drag crosses the halfway point and is released. No
   canvas work happens yet.
4. On submit, each item's chosen filter (if not Original) is baked into its `file` via
   `bakeStoryFilter` before the existing upload flow runs. Everything downstream (batch
   upload, story creation, error handling) is unchanged — it only ever sees a plain image file.

## Error handling

- If `bakeStoryFilter` throws (canvas/decode failure), that item falls back to posting its
  original unfiltered `file` rather than blocking the batch — a cosmetic filter failing
  shouldn't prevent posting. No new user-facing error copy for this case.
- A pointer drag that doesn't cross the swipe distance threshold is treated as a tap/no-op,
  not a filter change.
- Existing upload/post error handling (`toErrorMessage`, `error`/`notice` state) is untouched;
  filters are fully resolved into a plain `File` before that code path runs.

## Testing

The repo has no test runner today (no jest/vitest config, no `test` script, no existing
`*.test.ts`/`*.spec.ts` files). This feature introduces Vitest + React Testing Library as the
repo's first test infrastructure, since the units below (a pure canvas helper and a small
hook) are well suited to it and TDD is the project's preferred workflow.

- Set up Vitest (`vitest`, `@vitejs/plugin-react` or `vite-tsconfig-paths` as needed,
  `jsdom` environment) and a `test` script in `package.json`.
- Unit test `storyFilters.ts`: preset table shape, and `bakeStoryFilter` (mocked canvas)
  asserts it sets `ctx.filter` correctly per preset and returns a `File` with the original
  name/type.
- Unit test `useStoryFilterSwipe` in isolation (via `@testing-library/react`'s `renderHook`):
  asserts `targetIndex`/`dragProgress` update live while dragging in both directions, that a
  release past the halfway point commits (`currentIndex` changes) while an earlier release
  reverts, that both ends clamp to no target rather than wrapping, and that the committed
  name pill clears after the timer.
- Manual/browser check of the composer: swipe through all 9 presets on a real photo
  (specifically verify the "Cool" preset's skin-tone tint, called out as a risk in the FE
  guide), confirm the name pill fades correctly, and confirm a posted filtered story
  round-trips through the existing upload flow.
