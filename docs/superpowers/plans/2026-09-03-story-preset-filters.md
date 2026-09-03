# Story preset filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add swipeable Instagram-Stories-style preset filters (images only) to the story composer's full-screen preview, with the filter baked into the uploaded file at submit time and no backend changes.

**Architecture:** A pure data/canvas module (`lib/story/storyFilters.ts`) defines the preset table and a `bakeStoryFilter` helper; a thin hook (`hooks/useStoryFilterCarousel.ts`) wraps the already-installed `embla-carousel-react` to drive the swipe/index/name-pill state; `useStoryComposerController` gains a per-item `filterId` and bakes it into the file at submit; `StoryComposerModal` renders one Embla slide per preset (same image, different CSS filter) for the active photo only. This repo has no test runner yet, so the first task adds Vitest + React Testing Library, then the pure module and the hook are built test-first.

**Tech Stack:** Next.js App Router, React 19, TypeScript, `embla-carousel-react` (already a dependency), `next-intl`, Vitest + `@testing-library/react` (new).

---

## Task 1: Add Vitest test infrastructure

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `lib/sanity.test.ts` (temporary smoke test, deleted in this same task)

- [ ] **Step 1: Install dependencies**

Run:
```bash
npm install -D vitest @vitejs/plugin-react vite-tsconfig-paths jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
    plugins: [tsconfigPaths(), react()],
    test: {
        environment: 'jsdom',
        setupFiles: ['./vitest.setup.ts'],
        globals: false,
    },
});
```

- [ ] **Step 3: Create `vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Add the `test` script to `package.json`**

In the `"scripts"` block, add (keep every existing script as-is):

```json
"test": "vitest run",
```

- [ ] **Step 5: Write a temporary smoke test**

`lib/sanity.test.ts`:
```ts
import { describe, expect, it } from 'vitest';

describe('vitest setup', () => {
    it('runs', () => {
        expect(1 + 1).toBe(2);
    });
});
```

- [ ] **Step 6: Run it to confirm the harness works**

Run: `npm test`
Expected: `1 passed` (the "vitest setup > runs" test), exit code 0.

- [ ] **Step 7: Delete the smoke test and commit the infra**

```bash
rm lib/sanity.test.ts
git add package.json package-lock.json vitest.config.ts vitest.setup.ts
git commit -m "$(cat <<'EOF'
Add Vitest test infrastructure

The repo had no test runner. Story preset filters needs unit tests for
a pure canvas helper and a small hook, so set up Vitest + RTL first.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Story filter preset data module

**Files:**
- Create: `lib/story/storyFilters.ts`
- Test: `lib/story/storyFilters.test.ts`

- [ ] **Step 1: Write the failing test**

`lib/story/storyFilters.test.ts`:
```ts
import { describe, expect, it } from 'vitest';

import { STORY_FILTER_PRESETS } from '@/lib/story/storyFilters';

describe('STORY_FILTER_PRESETS', () => {
    it('starts with the original (no-op) preset', () => {
        expect(STORY_FILTER_PRESETS[0]).toEqual({ id: 'original', cssFilter: '' });
    });

    it('has exactly 9 presets with unique ids', () => {
        expect(STORY_FILTER_PRESETS).toHaveLength(9);
        const ids = STORY_FILTER_PRESETS.map((preset) => preset.id);
        expect(new Set(ids).size).toBe(9);
    });

    it('gives every non-original preset a non-empty cssFilter', () => {
        for (const preset of STORY_FILTER_PRESETS.slice(1)) {
            expect(preset.cssFilter.length).toBeGreaterThan(0);
        }
    });

    it('gives vintage both a grain and a vignette overlay', () => {
        const vintage = STORY_FILTER_PRESETS.find((preset) => preset.id === 'vintage');
        expect(vintage?.overlays).toEqual([
            { type: 'grain', opacity: 0.12 },
            { type: 'vignette', opacity: 0.15 },
        ]);
    });

    it('gives noir a vignette overlay and fade a wash overlay', () => {
        const noir = STORY_FILTER_PRESETS.find((preset) => preset.id === 'noir');
        const fade = STORY_FILTER_PRESETS.find((preset) => preset.id === 'fade');
        expect(noir?.overlays).toEqual([{ type: 'vignette', opacity: 0.15 }]);
        expect(fade?.overlays).toEqual([{ type: 'wash', opacity: 0.08 }]);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- storyFilters`
Expected: FAIL — `Cannot find module '@/lib/story/storyFilters'` (module doesn't exist yet).

- [ ] **Step 3: Write the preset table**

`lib/story/storyFilters.ts`:
```ts
export interface StoryFilterOverlay {
    type: 'grain' | 'vignette' | 'wash';
    opacity: number;
}

export interface StoryFilterPreset {
    id: string;
    cssFilter: string;
    overlays?: StoryFilterOverlay[];
}

export const STORY_FILTER_PRESETS: StoryFilterPreset[] = [
    { id: 'original', cssFilter: '' },
    { id: 'warm', cssFilter: 'brightness(1.05) saturate(1.15) sepia(0.08) contrast(1.05)' },
    { id: 'goldenHour', cssFilter: 'sepia(0.25) saturate(1.2) brightness(1.05)' },
    { id: 'cool', cssFilter: 'saturate(1.1) brightness(0.98) contrast(1.05) hue-rotate(180deg) saturate(1.05)' },
    { id: 'vivid', cssFilter: 'saturate(1.4) contrast(1.15)' },
    { id: 'fade', cssFilter: 'contrast(0.85) brightness(1.1) saturate(0.9)', overlays: [{ type: 'wash', opacity: 0.08 }] },
    { id: 'mono', cssFilter: 'grayscale(1) contrast(1.1)' },
    { id: 'noir', cssFilter: 'grayscale(1) contrast(1.3) brightness(0.9)', overlays: [{ type: 'vignette', opacity: 0.15 }] },
    {
        id: 'vintage',
        cssFilter: 'sepia(0.15) contrast(0.95) saturate(0.85)',
        overlays: [
            { type: 'grain', opacity: 0.12 },
            { type: 'vignette', opacity: 0.15 },
        ],
    },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- storyFilters`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/story/storyFilters.ts lib/story/storyFilters.test.ts
git commit -m "$(cat <<'EOF'
Add story filter preset data table

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `bakeStoryFilter` canvas helper

**Files:**
- Modify: `lib/story/storyFilters.ts`
- Modify: `lib/story/storyFilters.test.ts`

This bakes a preset into a `File` by drawing it to a canvas. jsdom has no real canvas
renderer, so the test mocks `HTMLCanvasElement.prototype.getContext` and
`HTMLCanvasElement.prototype.toBlob`, and mocks the global `createImageBitmap`, to verify
the function calls the canvas API correctly rather than checking real pixels.

- [ ] **Step 1: Write the failing test**

Append to `lib/story/storyFilters.test.ts`:
```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bakeStoryFilter, STORY_FILTER_PRESETS } from '@/lib/story/storyFilters';

describe('bakeStoryFilter', () => {
    const originalCreateImageBitmap = globalThis.createImageBitmap;
    let getContextSpy: ReturnType<typeof vi.spyOn>;
    let toBlobSpy: ReturnType<typeof vi.spyOn>;
    let fakeCtx: { filter: string; drawImage: ReturnType<typeof vi.fn>; fillRect: ReturnType<typeof vi.fn>; createRadialGradient: ReturnType<typeof vi.fn>; fillStyle: string; globalAlpha: number };

    beforeEach(() => {
        globalThis.createImageBitmap = vi.fn().mockResolvedValue({ width: 100, height: 200, close: vi.fn() });
        fakeCtx = {
            filter: '',
            fillStyle: '',
            globalAlpha: 1,
            drawImage: vi.fn(),
            fillRect: vi.fn(),
            createRadialGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
        };
        getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeCtx as unknown as CanvasRenderingContext2D);
        toBlobSpy = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
            callback(new Blob(['fake'], { type: 'image/jpeg' }));
        });
    });

    afterEach(() => {
        globalThis.createImageBitmap = originalCreateImageBitmap;
        getContextSpy.mockRestore();
        toBlobSpy.mockRestore();
    });

    it('returns the original file untouched for the "original" preset', async () => {
        const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
        const original = STORY_FILTER_PRESETS[0];
        const result = await bakeStoryFilter(file, original);
        expect(result).toBe(file);
        expect(getContextSpy).not.toHaveBeenCalled();
    });

    it('draws the image with the preset cssFilter set on the context', async () => {
        const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
        const warm = STORY_FILTER_PRESETS.find((preset) => preset.id === 'warm')!;
        await bakeStoryFilter(file, warm);
        expect(fakeCtx.filter).toBe(warm.cssFilter);
        expect(fakeCtx.drawImage).toHaveBeenCalledTimes(1);
    });

    it('returns a new File with the original name and type', async () => {
        const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
        const vivid = STORY_FILTER_PRESETS.find((preset) => preset.id === 'vivid')!;
        const result = await bakeStoryFilter(file, vivid);
        expect(result).not.toBe(file);
        expect(result.name).toBe('photo.jpg');
        expect(result.type).toBe('image/jpeg');
    });

    it('draws an extra fillRect per overlay for a preset with overlays', async () => {
        const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
        const noir = STORY_FILTER_PRESETS.find((preset) => preset.id === 'noir')!;
        await bakeStoryFilter(file, noir);
        expect(fakeCtx.fillRect).toHaveBeenCalledTimes(1);
    });

    it('falls back to the original file if getContext returns null', async () => {
        getContextSpy.mockReturnValue(null);
        const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
        const vivid = STORY_FILTER_PRESETS.find((preset) => preset.id === 'vivid')!;
        const result = await bakeStoryFilter(file, vivid);
        expect(result).toBe(file);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- storyFilters`
Expected: FAIL — `bakeStoryFilter is not exported` / `is not a function`.

- [ ] **Step 3: Implement `bakeStoryFilter`**

Append to `lib/story/storyFilters.ts`:
```ts
function drawOverlay(ctx: CanvasRenderingContext2D, width: number, height: number, overlay: StoryFilterOverlay) {
    ctx.filter = 'none';
    ctx.globalAlpha = overlay.opacity;
    if (overlay.type === 'wash') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
    } else if (overlay.type === 'vignette') {
        const gradient = ctx.createRadialGradient(width / 2, height / 2, height / 3, width / 2, height / 2, height / 1.1);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    } else {
        // grain: a coarse, seeded-random dot pattern stands in for a noise texture without a static asset.
        ctx.fillStyle = '#808080';
        for (let x = 0; x < width; x += 3) {
            for (let y = 0; y < height; y += 3) {
                if (Math.random() > 0.5) ctx.fillRect(x, y, 1, 1);
            }
        }
    }
    ctx.globalAlpha = 1;
}

export async function bakeStoryFilter(file: File, preset: StoryFilterPreset): Promise<File> {
    if (preset.id === 'original') return file;

    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.filter = preset.cssFilter;
    ctx.drawImage(bitmap, 0, 0);
    for (const overlay of preset.overlays ?? []) {
        drawOverlay(ctx, canvas.width, canvas.height, overlay);
    }

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type));
    if (!blob) return file;
    return new File([blob], file.name, { type: file.type });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- storyFilters`
Expected: PASS, 9 tests total (4 from Task 2 + 5 here).

- [ ] **Step 5: Commit**

```bash
git add lib/story/storyFilters.ts lib/story/storyFilters.test.ts
git commit -m "$(cat <<'EOF'
Add bakeStoryFilter canvas helper

Flattens a preset's CSS filter and overlays into a plain image File,
so the backend receives a normal upload with no knowledge of filters.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `useStoryFilterCarousel` hook

**Files:**
- Create: `hooks/useStoryFilterCarousel.ts`
- Test: `hooks/useStoryFilterCarousel.test.ts`

This wraps `useEmblaCarousel` (already used the same way in
`components/feed/post/PostMediaCarousel.tsx`) to drive the preset index and a
name-pill-visibility timer. The test mocks `embla-carousel-react` directly so it can fire
a fake `select` event without needing real drag/layout behavior from jsdom.

- [ ] **Step 1: Write the failing test**

`hooks/useStoryFilterCarousel.test.ts`:
```ts
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('embla-carousel-react', () => {
    const listeners = new Map<string, () => void>();
    const api = {
        selectedScrollSnap: vi.fn().mockReturnValue(0),
        on: vi.fn((event: string, handler: () => void) => listeners.set(event, handler)),
        off: vi.fn((event: string) => listeners.delete(event)),
        scrollTo: vi.fn(),
        __emitSelect: (index: number) => {
            api.selectedScrollSnap.mockReturnValue(index);
            listeners.get('select')?.();
        },
    };
    return { default: () => [vi.fn(), api], __mockApi: api };
});

import { useStoryFilterCarousel } from '@/hooks/useStoryFilterCarousel';

describe('useStoryFilterCarousel', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('starts at index 0 with no visible name', () => {
        const { result } = renderHook(() => useStoryFilterCarousel(['original', 'warm', 'noir']));
        expect(result.current.currentIndex).toBe(0);
        expect(result.current.visibleName).toBeNull();
    });

    it('updates currentIndex and visibleName when Embla selects a new slide', async () => {
        const { __mockApi } = await import('embla-carousel-react') as unknown as { __mockApi: { __emitSelect: (i: number) => void } };
        const { result } = renderHook(() => useStoryFilterCarousel(['original', 'warm', 'noir']));

        act(() => __mockApi.__emitSelect(1));

        expect(result.current.currentIndex).toBe(1);
        expect(result.current.visibleName).toBe('warm');
    });

    it('clears visibleName about 1s after the last selection', async () => {
        const { __mockApi } = await import('embla-carousel-react') as unknown as { __mockApi: { __emitSelect: (i: number) => void } };
        const { result } = renderHook(() => useStoryFilterCarousel(['original', 'warm', 'noir']));

        act(() => __mockApi.__emitSelect(2));
        expect(result.current.visibleName).toBe('noir');

        act(() => vi.advanceTimersByTime(1000));
        expect(result.current.visibleName).toBeNull();
    });

    it('scrollTo delegates to the underlying Embla API with jump=true', async () => {
        const { __mockApi } = await import('embla-carousel-react') as unknown as { __mockApi: { scrollTo: ReturnType<typeof vi.fn> } };
        const { result } = renderHook(() => useStoryFilterCarousel(['original', 'warm', 'noir']));

        act(() => result.current.scrollTo(2));

        expect(__mockApi.scrollTo).toHaveBeenCalledWith(2, true);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useStoryFilterCarousel`
Expected: FAIL — `Cannot find module '@/hooks/useStoryFilterCarousel'`.

- [ ] **Step 3: Implement the hook**

`hooks/useStoryFilterCarousel.ts`:
```ts
'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { useEffect, useRef, useState } from 'react';

export interface StoryFilterCarousel {
    emblaRef: ReturnType<typeof useEmblaCarousel>[0];
    currentIndex: number;
    visibleName: string | null;
    scrollTo: (index: number) => void;
}

const NAME_PILL_DURATION_MS = 1000;

/** Drives the swipeable preset carousel in the story composer preview: which preset is
 * active, and the transient name pill shown for a second after each swipe. */
export function useStoryFilterCarousel(presetIds: string[]): StoryFilterCarousel {
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
    const [currentIndex, setCurrentIndex] = useState(0);
    const [visibleName, setVisibleName] = useState<string | null>(null);
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!emblaApi) return;

        function handleSelect() {
            const index = emblaApi!.selectedScrollSnap();
            setCurrentIndex(index);
            setVisibleName(presetIds[index] ?? null);
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = setTimeout(() => setVisibleName(null), NAME_PILL_DURATION_MS);
        }

        emblaApi.on('select', handleSelect);
        return () => {
            emblaApi.off('select', handleSelect);
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- presetIds is stable for a given composer session; resubscribing on identity churn would tear down Embla listeners unnecessarily.
    }, [emblaApi]);

    function scrollTo(index: number) {
        emblaApi?.scrollTo(index, true);
    }

    return { emblaRef, currentIndex, visibleName, scrollTo };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- useStoryFilterCarousel`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add hooks/useStoryFilterCarousel.ts hooks/useStoryFilterCarousel.test.ts
git commit -m "$(cat <<'EOF'
Add useStoryFilterCarousel hook

Wraps the existing embla-carousel-react dependency (already used in
PostMediaCarousel) to drive the preset swipe index and name-pill timer.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Wire `filterId` into `useStoryComposerController`

**Files:**
- Modify: `hooks/useStoryComposerController.ts`

No test file — this hook has no existing test coverage or harness for its React Query /
provider dependencies, and adding that harness is out of scope for this feature (see the
design spec's Testing section, which scopes automated coverage to the two pure/isolated
units above). This task is verified manually in Task 7.

- [ ] **Step 1: Add `filterId` to `PendingStory` and import the filter helpers**

In `hooks/useStoryComposerController.ts`, update the imports and interface:

```ts
import { bakeStoryFilter, STORY_FILTER_PRESETS } from '@/lib/story/storyFilters';
```//  add alongside the existing imports near the top of the file

```ts
export interface PendingStory {
    key: string;
    file: File;
    previewUrl: string;
    remoteUrl?: string;
    caption: string;
    filterId: string;
    status: PendingStoryStatus;
    mediaId?: string;
    error?: string;
}
```

- [ ] **Step 2: Default new items to the "original" filter**

In `addFiles`, update the `next` mapping (around line 209-215):

```ts
const next = accepted.map((file) => ({
    key: `${file.name}-${file.size}-${Date.now()}-${crypto.randomUUID()}`,
    file,
    previewUrl: URL.createObjectURL(file),
    caption: '',
    filterId: 'original',
    status: 'ready' as const,
}));
```

- [ ] **Step 3: Add a `setFilter` action, mirroring `updateActive`/`updateCaption`**

Add this function near `updateActive` (around line 290):

```ts
function setFilter(key: string, filterId: string) {
    if (isBusy) return;
    setItems((current) => current.map((item) => (item.key === key ? { ...item, filterId } : item)));
}
```

- [ ] **Step 4: Bake the filter into each image before upload, inside `submit`**

In `submit`, right before the `working` array is first built (replacing the existing
assignment around line 301-306):

```ts
let working: PendingStory[] = await Promise.all(
    items.map(async (item) => {
        if (item.mediaId || item.filterId === 'original' || item.file.type.startsWith('video/')) {
            return { ...item, status: item.mediaId ? item.status : ('uploading' as const), error: undefined };
        }
        const preset = STORY_FILTER_PRESETS.find((candidate) => candidate.id === item.filterId);
        const bakedFile = preset ? await bakeStoryFilter(item.file, preset) : item.file;
        return { ...item, file: bakedFile, status: 'uploading' as const, error: undefined };
    })
);
setItems(working);
```

- [ ] **Step 5: Expose `setFilter` and the preset ids from the hook's return value**

Add to the `StoryComposerController` interface (near `updateCaption`):

```ts
setFilter: (key: string, filterId: string) => void;
filterPresetIds: string[];
```

Add to the returned object at the bottom of `useStoryComposerController` (near
`updateCaption`):

```ts
setFilter,
filterPresetIds: STORY_FILTER_PRESETS.map((preset) => preset.id),
```

- [ ] **Step 6: Type-check**

Run: `npm run type:check`
Expected: no errors. (`StoryComposerModal` doesn't consume `setFilter` yet — that's Task 6 — so this only verifies the controller itself compiles.)

- [ ] **Step 7: Commit**

```bash
git add hooks/useStoryComposerController.ts
git commit -m "$(cat <<'EOF'
Bake per-item story filters into uploads at submit time

Each PendingStory now carries its own filterId, defaulting to
"original". Non-original image items get run through bakeStoryFilter
right before the existing upload flow, so the backend still only ever
sees a plain image file. Video items are left untouched.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Render the filter carousel in `StoryComposerModal`

**Files:**
- Modify: `components/composer/StoryComposerModal.tsx`
- Modify: `messages/en.json`
- Modify: `messages/el.json`

- [ ] **Step 1: Add filter label translations**

In `messages/en.json`, inside the `"StoryComposer"` object, add a nested `"filters"` key
(after `"videoTooLong"`, before the closing `}` of `StoryComposer`):

```json
"filters": {
    "original": "Original",
    "warm": "Warm",
    "goldenHour": "Golden Hour",
    "cool": "Cool",
    "vivid": "Vivid",
    "fade": "Fade",
    "mono": "Mono",
    "noir": "Noir",
    "vintage": "Vintage"
}
```

Remember to add a trailing comma after `"videoTooLong": "..."` since `"filters"` now
follows it.

In `messages/el.json`, inside the same `"StoryComposer"` object, add:

```json
"filters": {
    "original": "Αρχικό",
    "warm": "Ζεστό",
    "goldenHour": "Χρυσή Ώρα",
    "cool": "Δροσερό",
    "vivid": "Έντονο",
    "fade": "Ξεθωριασμένο",
    "mono": "Μονόχρωμο",
    "noir": "Νουάρ",
    "vintage": "Vintage"
}
```

Same trailing-comma note applies.

- [ ] **Step 2: Import the new pieces in `StoryComposerModal.tsx`**

Add to the imports at the top of `components/composer/StoryComposerModal.tsx`:

```ts
import { useStoryFilterCarousel } from '@/hooks/useStoryFilterCarousel';
import { STORY_FILTER_PRESETS } from '@/lib/story/storyFilters';
```

- [ ] **Step 3: Pull `setFilter`/`filterPresetIds` from the controller and set up the carousel**

In the destructuring of `controller` near the top of the component, add `filterPresetIds`
and `setFilter`. Then, after the existing `const showCamera = ...` line, add:

```ts
const isActiveImage = Boolean(activeItem) && !activeItem!.file.type.startsWith('video/');
const { emblaRef, currentIndex, visibleName, scrollTo } = useStoryFilterCarousel(filterPresetIds);

function handleFilterSelect(index: number) {
    if (!activeItem) return;
    const preset = STORY_FILTER_PRESETS[index];
    if (preset) setFilter(activeItem.key, preset.id);
}
```

- [ ] **Step 4: Sync the carousel's swiped index back into controller state, and vice versa**

Two directions need syncing: (a) swiping should update the active item's stored
`filterId`, and (b) switching to a *different* queued item (via the thumbnail rail) should
snap the carousel to that item's own already-stored filter, not leave it wherever the last
swipe left it. Add both effects right after the hook call from Step 3:

```ts
useEffect(() => {
    handleFilterSelect(currentIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to swipes (currentIndex), not to activeItem identity changing for other reasons.
}, [currentIndex]);

useEffect(() => {
    if (!activeItem) return;
    const index = STORY_FILTER_PRESETS.findIndex((preset) => preset.id === activeItem.filterId);
    if (index >= 0) scrollTo(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-sync when the active item itself changes (switching photos), not on every filterId write this same effect's sibling causes.
}, [activeItem?.key]);
```

Add `useEffect` to the existing `react` import at the top of the file (currently `import {
type ChangeEvent, type MouseEvent, useState } from 'react';` — change to `import { type
ChangeEvent, type MouseEvent, useEffect, useState } from 'react';`).

- [ ] **Step 5: Replace the plain image with the filter carousel for image items**

Replace the existing image-rendering branch (the `<Image src={activeItem.previewUrl} ...
/>` block, currently around line 104-113 — this is already the "not a video" branch of the
surrounding ternary, so no extra video/image check is needed here) with:

```tsx
) : (
    <div className="h-full w-full overflow-hidden" ref={emblaRef}>
        <div className="flex h-full">
            {STORY_FILTER_PRESETS.map((preset) => (
                <div key={preset.id} className="relative h-full w-full shrink-0 grow-0 basis-full">
                    <Image
                        src={activeItem.previewUrl}
                        alt={t('previewAlt')}
                        fill
                        className="object-contain"
                        style={{ filter: preset.cssFilter }}
                        sizes="100vw"
                        unoptimized
                    />
                    {(preset.overlays ?? []).map((overlay, overlayIndex) => (
                        <div
                            key={overlayIndex}
                            className="pointer-events-none absolute inset-0"
                            style={
                                overlay.type === 'wash'
                                    ? { backgroundColor: 'white', opacity: overlay.opacity }
                                    : overlay.type === 'vignette'
                                      ? { boxShadow: `inset 0 0 12vh rgba(0,0,0,${overlay.opacity + 0.5})` }
                                      : { backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '3px 3px', opacity: overlay.opacity }
                            }
                        />
                    ))}
                </div>
            ))}
        </div>
    </div>
)
```

This replaces the entire non-video branch, so the full conditional now reads: video →
filter carousel (image). The `isActiveImage` variable from Step 3 is not used here — it
exists solely to gate the name pill in Step 6, which lives outside this ternary.

- [ ] **Step 6: Add the transient filter-name pill**

Immediately after the closing `</div>` of the media block (right before the existing
`{/* Preview toolbar */}` comment), add:

```tsx
{/* Filter name pill */}
{isActiveImage && visibleName && (
    <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/60 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-md">
        {t(`filters.${visibleName}`)}
    </div>
)}
```

- [ ] **Step 7: Type-check and lint**

Run:
```bash
npm run type:check
npm run lint
```
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add components/composer/StoryComposerModal.tsx messages/en.json messages/el.json
git commit -m "$(cat <<'EOF'
Add swipeable preset filter carousel to story composer preview

Swiping over the active photo cycles through the 9 presets via Embla,
each rendered as a CSS filter + procedural overlay on the same image.
A name pill fades in for ~1s after each swipe.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Manual verification

No files changed — this is a browser walkthrough, per this project's convention of
visually confirming UI changes before calling them done.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Open the story composer and add a photo**

Navigate to an event, open the story composer, and pick or capture a single photo.

- [ ] **Step 3: Swipe through all 9 presets**

Swipe left across the photo repeatedly. Confirm:
- The image visibly changes look for each preset.
- The name pill appears centered, shows the correct localized label, and fades out after
  about a second.
- Swiping past the last preset (Vintage) does nothing further (no wraparound).
- Swiping back past Original does nothing further.
- The "Cool" preset doesn't badly tint skin tones green (the risk called out in the FE
  guide) — if it does, adjust `hue-rotate`/`saturate` values in `storyFilters.ts` before
  moving on.

- [ ] **Step 4: Verify per-photo filter persistence**

Add a second photo (batch of 2). Set a different filter on each via swiping, switch
between them using the thumbnail rail, and confirm each photo keeps showing its own
chosen filter.

- [ ] **Step 5: Verify video items are unaffected**

Add a video. Confirm no swipe carousel or filter UI appears for it — the preview behaves
exactly as before this feature.

- [ ] **Step 6: Post and verify the round-trip**

Post the batch. Confirm the request succeeds, and open the posted stories in the normal
viewer to confirm the filtered photo shows the baked-in look (since the backend now just
sees a plain filtered image).

- [ ] **Step 7: Run the full check suite**

Run:
```bash
npm run check
npm run type:check
npm test
```
Expected: all pass.

- [ ] **Step 8: Report back**

Summarize the manual walkthrough results (including the "Cool" skin-tone check) to the
user before considering this feature done.
