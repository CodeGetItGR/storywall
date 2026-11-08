# Visual Check Report Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the visual check's long report page with a review tool: a sidebar of stories, one item at a time, same-change groups, and review marks saved in the browser.

**Architecture:** A React page in `scripts/visual/report/src/` is built by Vite into one committed file, `scripts/visual/report/dist/index.html`. The publish job copies that file from the base commit, exactly as it copies today's page, and installs nothing. The capture job rebuilds it on every PR and fails if it differs. `scripts/visual/sameChange.ts` finds same-change groups while the report is built, and adds them to `manifest.json`.

**Tech Stack:** React 19, TypeScript, Vite 7 with `@vitejs/plugin-react`, Vitest 5 with Testing Library and jsdom. No new dependencies.

**Spec:** [docs/superpowers/specs/2026-11-07-visual-report-page-design.md](../specs/2026-11-07-visual-report-page-design.md). Ticket: KAN-158.

---

## Rules for every task

- Work in the worktree on branch `claude/kan-158-report-page`. It starts from `origin/staging` and holds the spec.
- Every commit message starts with `KAN-158:` and ends with a blank line and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Stage files by name. Never use `--no-verify`.
- Page wording comes only from `src/copy.ts`, and it is already approved. Don't add, reword or remove a string. If a task seems to need new text, stop and ask.
- ESLint bans inline arrows and `.bind` in JSX props, including on DOM elements, and also arrows assigned to a `const` in the same component. Use `function handleClick() {}` declarations.
- Every image has real alt text. `dangerouslySetInnerHTML` is never used, because story names and errors come from PR code.
- Keep components as render shells. Logic goes in `src/lib/` or `src/hooks/`.
- Add a short JSX comment above each visual section boundary.
- Before each commit, run `npx prettier --write` on the files you touched, then `npx eslint` on them. Prettier skips `dist` by itself.
- Git Bash on this machine: prefix `MSYS_NO_PATHCONV=1` for `gh api` paths.

## Differences from the mockup, on purpose

The mockup is the reference for layout and look. These differ, and a reviewer shouldn't flag them:

- A reviewed item keeps "Undo reviewed" next to "Approve in the PR". In the mockup the last item couldn't be undone.
- The Overview has no "PR #N" crumb, because the sidebar already shows it and the repo's rule is one home per fact.
- Tabs show the capitalized state words ("New"), the approved wording, not the mockup's lower case.
- A backdrop sits behind the phone drawer, because a phone has no Esc key.
- The area table's "Reviewed" total leaves out failed captures, which can't be marked.
- "Nothing matches these filters." stays hidden on a report with no differences.
- Marks are stored per PR with hashes, as the spec says, not per commit.
- Zoom stays on for new and removed stories while the compare mode is Slider, because they show one image.

## File structure

| Path | Purpose |
|---|---|
| `scripts/visual/sameChange.ts` (+ test) | Signature of one changed capture, and grouping signatures |
| `scripts/visual/types.ts` | Adds `ChangeGroup`, `ReportEntry.changeKey`, `Manifest.groups` |
| `scripts/visual/report.ts` (+ test) | Calls `sameChange` and writes the result |
| `scripts/visual/publish/manifest.mjs` (+ test) | Stricter validation, and `publishedManifest` |
| `scripts/visual/publish.mjs`, `run.ts` | Copy the built page, add `pull` |
| `scripts/visual/report/index.html` | Vite template (replaces today's page) |
| `scripts/visual/report/vite.config.ts` | The build and the inlining plugin |
| `scripts/visual/report/dist/index.html` | The built page, committed |
| `scripts/visual/report/page.test.ts` | Checks the built file and the paths to it |
| `report/src/main.tsx`, `App.tsx`, `styles.css`, `copy.ts` | Entry, load states, tokens and layout, all strings |
| `report/src/testing/fixture.ts` | Test data |
| `report/src/lib/captures.ts` | The languages and widths, in the order the page shows them |
| `report/src/lib/labels.ts` | Text built from data: percent, capture names, alt text, group names |
| `report/src/lib/model.ts` | Manifest to stories and groups |
| `report/src/lib/marks.ts` | Reading, writing and checking review marks |
| `report/src/lib/reviewOrder.ts` | Filters, review queue, what the bottom bar offers |
| `report/src/lib/addresses.ts` | Item to address and back |
| `report/src/lib/viewState.ts` | The page's view state, and pure changes to it |
| `report/src/lib/shortcuts.ts` | Key event to shortcut |
| `report/src/lib/overview.ts` | Numbers for the Overview |
| `report/src/hooks/` | `useManifest`, `useReviewMarks`, `useRoute`, `useReportView`, `useKeyboardShortcuts`, `usePreloadNext`, `useScrollToCurrentRow`, `useSyncedScroll` |
| `report/src/components/ReportApp.tsx`, `Segment.tsx`, `Swatches.tsx` | Composition and shared pieces |
| `report/src/components/compare/` | Images, slider, failed notice, tabs, controls |
| `report/src/components/sidebar/` | Header, filters, area tree, same-change list, rows |
| `report/src/components/screens/` | Overview, story, group, bottom bar, top bar, shortcuts |
| `.gitattributes`, `tsconfig.json`, `eslint.config.mjs`, `package.json`, `app/globals.css` | Build and tooling |
| `.github/workflows/visual-check.yml`, `scripts/visual/workflows.test.ts` | The rebuild check |
| `docs/storybook.md`, `docs/superpowers/specs/2026-11-06-visual-regression-tool-design.md` | Docs |

`report/` above means `scripts/visual/report/`.

---

## Task 1: Find the same change

**Files:**
- Modify: `scripts/visual/types.ts`
- Create: `scripts/visual/sameChange.ts`
- Test: `scripts/visual/sameChange.test.ts`

- [ ] **Step 1: Add the `ChangeGroup` type**

In `scripts/visual/types.ts`, add at the end:

```ts
export type ChangeGroup = { key: string; kind: 'color' | 'exact'; from?: string; to?: string };
```

- [ ] **Step 2: Write the failing test**

Create `scripts/visual/sameChange.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { comparePixels } from '../../lib/invitation/parity';
import { CHANNEL_TOLERANCE } from './config';
import type { Raw } from './images';
import { type ChangeSignature, changeSignature, groupChanges } from './sameChange';

type Color = [number, number, number, number?];
type Spot = { x: number; y: number; color: Color };

const SIZE = 64;
const WHITE: [number, number, number] = [255, 255, 255];
const halfway = ([r, g, b]: Color): Color => [(r + WHITE[0]) >> 1, (g + WHITE[1]) >> 1, (b + WHITE[2]) >> 1];
const INK: Color = [0x24, 0x1f, 0x1a];
const PURPLE: Color = [0x7c, 0x3a, 0xed];

function raw(spots: Spot[]): Raw {
    const data = new Uint8Array(SIZE * SIZE * 4).fill(255);
    for (const { x, y, color } of spots) data.set([color[0], color[1], color[2], color[3] ?? 255], (y * SIZE + x) * 4);
    return { data, width: SIZE, height: SIZE };
}

function diffOf(beforeSpots: Spot[], afterSpots: Spot[]) {
    const before = raw(beforeSpots);
    const after = raw(afterSpots);
    const { mask } = comparePixels(before.data, after.data, SIZE, SIZE, CHANNEL_TOLERANCE);
    return { before, after, mask, sizeChanged: false };
}

// A line of text in one color, with its anti-aliased edge below it, as a color token change leaves it.
function textLine(x: number, y: number, length: number, color: Color): Spot[] {
    const solid = Array.from({ length }, (_, index) => ({ x: x + index, y, color }));
    const edge = Array.from({ length }, (_, index) => ({ x: x + index, y: y + 1, color: halfway(color) }));
    return [...solid, ...edge];
}

const recolor = (x: number, y: number, length: number, extra: Spot[] = []) =>
    diffOf(textLine(x, y, length, INK), [...textLine(x, y, length, PURPLE), ...extra]);

// Two colors moving in different directions, so it can't be a color shift.
const patch = (x: number, y: number) =>
    diffOf(
        [],
        [
            { x, y, color: [255, 0, 0] },
            { x: x + 1, y, color: [0, 0, 255] },
        ],
    );

// The same text line with its anti-aliased edge above it, so the edge is read first.
const edgeAbove = (color: Color): Spot[] => textLine(2, 2, 10, color).map((spot) => ({ ...spot, y: spot.y === 2 ? 3 : 2 }));

function block(color: Color): Spot[] {
    return Array.from({ length: 32 }, (_, index) => ({ x: 2 + (index % 8), y: 2 + Math.floor(index / 8), color }));
}

// Two marks with `gap` unchanged pixels between them.
const twoMarks = (x: number, gap: number) =>
    diffOf(
        [],
        [
            { x, y: 2, color: [255, 0, 0] },
            { x: x + gap + 1, y: 2, color: [0, 0, 255] },
        ],
    );

const signatureOf = (diff: Parameters<typeof changeSignature>[0]) => changeSignature(diff) as ChangeSignature;

describe('changeSignature', () => {
    it('finds a color shift', () => {
        expect(signatureOf(recolor(2, 2, 10)).shift).not.toBeNull();
    });

    it('finds no shift when one pixel falls outside it', () => {
        const stray: Spot = { x: 60, y: 60, color: [0, 255, 0] };
        expect(signatureOf(recolor(2, 2, 10, [stray])).shift).toBeNull();
    });

    it('finds no shift when a pixel changes its alpha', () => {
        const faded: Spot = { x: 2, y: 2, color: [PURPLE[0], PURPLE[1], PURPLE[2], 128] };
        expect(signatureOf(recolor(2, 2, 10, [faded])).shift).toBeNull();
    });

    it('finds no shift when no color moves far enough', () => {
        const small = diffOf(textLine(2, 2, 4, [100, 100, 100]), textLine(2, 2, 4, [110, 110, 110]));
        expect(signatureOf(small).shift).toBeNull();
    });

    it('finds no shift when a text line moved', () => {
        expect(signatureOf(diffOf(textLine(2, 2, 10, INK), textLine(6, 2, 10, INK))).shift).toBeNull();
    });

    it('finds no shift when text appears on a blank background', () => {
        expect(signatureOf(diffOf([], textLine(2, 2, 20, INK))).shift).toBeNull();
    });

    it('finds no shift when text is removed from a blank background', () => {
        expect(signatureOf(diffOf(textLine(2, 2, 20, INK), [])).shift).toBeNull();
    });

    it('finds a shift when a flat block changes color', () => {
        expect(signatureOf(diffOf(block(INK), block(PURPLE))).shift).not.toBeNull();
    });

    it('finds no shift when too many colors change', () => {
        // A brightness change on a photo: every pixel moves the same way, but it isn't one color change.
        const width = 300;
        const height = 300;
        const before = new Uint8Array(width * height * 4);
        const after = new Uint8Array(width * height * 4);
        for (let index = 0; index < width * height; index += 1) {
            const color = [60 + (index % 196), 60 + (Math.floor(index / 196) % 196), 60 + Math.floor(index / 196 ** 2)];
            before.set([...color, 255], index * 4);
            after.set([...color.map((value) => value - 60), 255], index * 4);
        }
        const { mask } = comparePixels(before, after, width, height, CHANNEL_TOLERANCE);
        const capture = { before: { data: before, width, height }, after: { data: after, width, height }, mask, sizeChanged: false };
        expect(signatureOf(capture).shift).toBeNull();
    });

    it('has no signature when the size changed', () => {
        expect(changeSignature({ ...recolor(2, 2, 10), sizeChanged: true })).toBeNull();
    });

    it('hashes an area without its position', () => {
        expect(signatureOf(patch(2, 2)).areas).toEqual(signatureOf(patch(40, 30)).areas);
    });

    it('keeps areas that are far apart separate', () => {
        const spots: Spot[] = [
            { x: 2, y: 2, color: [255, 0, 0] },
            { x: 50, y: 50, color: [0, 0, 255] },
        ];
        expect(signatureOf(diffOf([], spots)).areas).toHaveLength(2);
    });

    it('merges changes in touching grid cells into one area', () => {
        const spots: Spot[] = [
            { x: 15, y: 2, color: [255, 0, 0] },
            { x: 16, y: 2, color: [0, 0, 255] },
        ];
        expect(signatureOf(diffOf([], spots)).areas).toHaveLength(1);
    });

    it('joins diagonal neighbors into one area', () => {
        const spots: Spot[] = [
            { x: 15, y: 15, color: [255, 0, 0] },
            { x: 16, y: 16, color: [0, 0, 255] },
        ];
        expect(signatureOf(diffOf([], spots)).areas).toHaveLength(1);
    });

    it('joins changes less than 16px apart', () => {
        expect(signatureOf(twoMarks(2, 15)).areas).toHaveLength(1);
        expect(signatureOf(twoMarks(2, 16)).areas).toHaveLength(2);
    });

    it('joins changes the same way wherever they sit on the grid', () => {
        expect(signatureOf(twoMarks(0, 19)).areas).toEqual(signatureOf(twoMarks(12, 19)).areas);
    });
});

describe('groupChanges', () => {
    const signed = (id: string, diff: Parameters<typeof changeSignature>[0]) => ({ id, signature: signatureOf(diff) });
    const shift = { direction: [1, 0, 0] as [number, number, number], pair: 0xffffff };

    it('groups captures with one color shift, however different they look', () => {
        const { groups, keys } = groupChanges([signed('a', recolor(2, 2, 10)), signed('b', recolor(5, 30, 20))]);
        expect(groups).toEqual([{ key: 'color-1', kind: 'color', from: '#241f1a', to: '#7c3aed' }]);
        expect(keys.get('a')).toBe('color-1');
        expect(keys.get('b')).toBe('color-1');
    });

    it('keeps a capture with a stray pixel out of the color group', () => {
        const stray: Spot = { x: 60, y: 60, color: [0, 255, 0] };
        const { keys } = groupChanges([signed('a', recolor(2, 2, 10)), signed('b', recolor(5, 30, 20)), signed('c', recolor(9, 9, 6, [stray]))]);
        expect(keys.get('c')).toBeUndefined();
        expect(keys.get('a')).toBe('color-1');
    });

    it('groups identical areas, even when they moved', () => {
        const { groups, keys } = groupChanges([signed('a', patch(2, 2)), signed('b', patch(40, 30))]);
        expect(groups).toEqual([{ key: 'same-1', kind: 'exact' }]);
        expect(keys.get('a')).toBe('same-1');
    });

    it('has no groups of one', () => {
        const { groups, keys } = groupChanges([signed('a', recolor(2, 2, 10)), signed('b', patch(2, 2))]);
        expect(groups).toEqual([]);
        expect(keys.size).toBe(0);
    });

    it('counts an area each time it appears', () => {
        const { groups } = groupChanges([
            { id: 'a', signature: { shift: null, areas: ['x', 'x'] } },
            { id: 'b', signature: { shift: null, areas: ['x'] } },
        ]);
        expect(groups).toEqual([]);
    });

    it('compares a color group of one by its areas', () => {
        const { keys } = groupChanges([
            { id: 'a', signature: { shift, areas: ['x'] } },
            { id: 'b', signature: { shift: null, areas: ['x'] } },
        ]);
        expect(keys.get('a')).toBe('same-1');
        expect(keys.get('b')).toBe('same-1');
    });

    it('numbers groups largest first', () => {
        const { groups, keys } = groupChanges([
            { id: 'a', signature: { shift: null, areas: ['small'] } },
            { id: 'b', signature: { shift: null, areas: ['small'] } },
            { id: 'c', signature: { shift: null, areas: ['big'] } },
            { id: 'd', signature: { shift: null, areas: ['big'] } },
            { id: 'e', signature: { shift: null, areas: ['big'] } },
        ]);
        expect(groups.map((group) => group.key)).toEqual(['same-1', 'same-2']);
        expect(keys.get('c')).toBe('same-1');
        expect(keys.get('a')).toBe('same-2');
    });

    it('gives the same result in any order', () => {
        const items = [signed('a', recolor(2, 2, 10)), signed('b', recolor(5, 30, 20)), signed('c', patch(2, 2)), signed('d', patch(40, 30))];
        const forward = groupChanges(items);
        const backward = groupChanges([...items].reverse());
        expect(backward.groups).toEqual(forward.groups);
        expect([...backward.keys].sort()).toEqual([...forward.keys].sort());
    });

    it('breaks a tie by the lower color, wherever it sits', () => {
        const edgeFirst = () => diffOf(edgeAbove(INK), edgeAbove(PURPLE));
        const { groups } = groupChanges([signed('a', edgeFirst()), signed('b', edgeFirst())]);
        expect(groups).toEqual([{ key: 'color-1', kind: 'color', from: '#241f1a', to: '#7c3aed' }]);
    });

    it('numbers groups of the same size the same way in any order', () => {
        const items = [
            { id: 'a', signature: { shift: null, areas: ['p'] } },
            { id: 'b', signature: { shift: null, areas: ['q'] } },
            { id: 'c', signature: { shift: null, areas: ['q'] } },
            { id: 'd', signature: { shift: null, areas: ['p'] } },
        ];
        for (const order of [items, [...items].reverse()]) {
            const { keys } = groupChanges(order);
            expect(keys.get('a')).toBe('same-1');
            expect(keys.get('b')).toBe('same-2');
        }
    });
});
```

- [ ] **Step 3: Run it and see it fail**

Run: `npx vitest run scripts/visual/sameChange.test.ts`
Expected: FAIL, it can't find `./sameChange`.

- [ ] **Step 4: Write the implementation**

Create `scripts/visual/sameChange.ts`:

```ts
import { createHash } from 'node:crypto';

import type { ImageDiff } from './compare';
import type { ChangeGroup } from './types';

// Measured on a report with 614 changed captures. See the design: docs/superpowers/specs/2026-11-07-visual-report-page-design.md
const MIN_PAIR_DISTANCE = 48;
const MAX_RESIDUAL = 16;
const SAME_DIRECTION = 0.995;
const CELL = 16;

// One color change has at most a few thousand strong pairs. Photo-like changes have far more, and stop here.
const MAX_STRONG_PAIRS = 65_536;

// A before and after color, as one number: before * PAIR_BASE + after.
const PAIR_BASE = 2 ** 24;

type Vector = [number, number, number];
type Box = { x0: number; y0: number; x1: number; y1: number };
type ChangedCapture = Pick<ImageDiff, 'before' | 'after' | 'mask' | 'sizeChanged'>;

export type ColorShift = { direction: Vector; pair: number };
export type ChangeSignature = { shift: ColorShift | null; areas: string[] };
export type SignedCapture = { id: string; signature: ChangeSignature };

const rgbAt = (data: Uint8Array, offset: number) => (data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2];
const channels = (rgb: number): Vector => [(rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255];
const hex = (rgb: number) => `#${rgb.toString(16).padStart(6, '0')}`;
const beforeOf = (pair: number) => Math.floor(pair / PAIR_BASE);
const afterOf = (pair: number) => pair % PAIR_BASE;
const dot = (a: Vector, b: Vector) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function deltaOf(pair: number): Vector {
    const from = channels(beforeOf(pair));
    const to = channels(afterOf(pair));
    return [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
}

function isStrong(pair: number): boolean {
    const delta = deltaOf(pair);
    return dot(delta, delta) >= MIN_PAIR_DISTANCE ** 2;
}

// Ties go to the lower pair value, so results don't depend on order.
function mostCommon(counts: Map<number, number>): number | null {
    let top: number | null = null;
    let topCount = 0;
    for (const [pair, count] of counts) {
        if (count > topCount || (count === topCount && top !== null && pair < top)) {
            top = pair;
            topCount = count;
        }
    }
    return top;
}

function fits(pair: number, direction: Vector): boolean {
    const delta = deltaOf(pair);
    const along = dot(delta, direction);
    if (along < 0) return false;
    return delta.every((value, channel) => Math.abs(value - along * direction[channel]) <= MAX_RESIDUAL);
}

// Counts the strong pairs over the changed pixels. Null means the capture can't be one color change.
function strongPairs({ before, after, mask }: ChangedCapture): Map<number, number> | null {
    const counts = new Map<number, number>();
    let firstBefore = -1;
    let firstAfter = -1;
    let beforeVaries = false;
    let afterVaries = false;
    let lastPair = -1;
    let lastStrong = false;
    for (let index = 0; index < mask.length; index += 1) {
        if (!mask[index]) continue;
        const offset = index * 4;
        if (before.data[offset + 3] !== after.data[offset + 3]) return null;
        const from = rgbAt(before.data, offset);
        const to = rgbAt(after.data, offset);
        if (firstBefore < 0) {
            firstBefore = from;
            firstAfter = to;
        }
        if (from !== firstBefore) beforeVaries = true;
        if (to !== firstAfter) afterVaries = true;
        const pair = from * PAIR_BASE + to;
        if (pair !== lastPair) {
            lastPair = pair;
            lastStrong = isStrong(pair);
        }
        if (!lastStrong) continue;
        counts.set(pair, (counts.get(pair) ?? 0) + 1);
        if (counts.size > MAX_STRONG_PAIRS) return null;
    }
    // One side in a single color is content added to a plain background, or removed from one.
    if (beforeVaries !== afterVaries) return null;
    return counts;
}

function everyPixelFits({ before, after, mask }: ChangedCapture, direction: Vector): boolean {
    let lastPair = -1;
    for (let index = 0; index < mask.length; index += 1) {
        if (!mask[index]) continue;
        const offset = index * 4;
        const pair = rgbAt(before.data, offset) * PAIR_BASE + rgbAt(after.data, offset);
        if (pair === lastPair) continue;
        lastPair = pair;
        if (!fits(pair, direction)) return false;
    }
    return true;
}

function colorShift(capture: ChangedCapture): ColorShift | null {
    const counts = strongPairs(capture);
    const top = counts ? mostCommon(counts) : null;
    if (top === null) return null;
    const delta = deltaOf(top);
    const length = Math.hypot(...delta);
    const direction: Vector = [delta[0] / length, delta[1] / length, delta[2] / length];
    return everyPixelFits(capture, direction) ? { direction, pair: top } : null;
}

function cellBoxes({ before, mask }: ChangedCapture): { boxes: Map<number, Box>; columns: number; rows: number } {
    const { width, height } = before;
    const columns = Math.ceil(width / CELL);
    const rows = Math.ceil(height / CELL);
    const boxes = new Map<number, Box>();
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            if (!mask[y * width + x]) continue;
            const cell = Math.floor(y / CELL) * columns + Math.floor(x / CELL);
            const box = boxes.get(cell);
            if (box) {
                box.x0 = Math.min(box.x0, x);
                box.y0 = Math.min(box.y0, y);
                box.x1 = Math.max(box.x1, x);
                box.y1 = Math.max(box.y1, y);
            } else {
                boxes.set(cell, { x0: x, y0: y, x1: x, y1: y });
            }
        }
    }
    return { boxes, columns, rows };
}

function hashArea({ before, after }: ChangedCapture, box: Box): string {
    const hash = createHash('sha1');
    const areaWidth = box.x1 - box.x0 + 1;
    hash.update(`${areaWidth}x${box.y1 - box.y0 + 1}:`);
    for (const { data, width } of [before, after]) {
        for (let y = box.y0; y <= box.y1; y += 1) {
            const start = (y * width + box.x0) * 4;
            hash.update(data.subarray(start, start + areaWidth * 4));
        }
    }
    return hash.digest('hex');
}

// Unchanged pixels between two boxes, on the axis where they're furthest apart.
function gapBetween(a: Box, b: Box): number {
    const gapX = Math.max(0, b.x0 - a.x1 - 1, a.x0 - b.x1 - 1);
    const gapY = Math.max(0, b.y0 - a.y1 - 1, a.y0 - b.y1 - 1);
    return Math.max(gapX, gapY);
}

// Changed pixels less than CELL apart join into one area wherever they sit, so the letters of one word become one area.
// Pixels in one grid cell are always that close and pixels two cells apart never are, so only neighboring cells are compared.
// The gap is measured between the boxes around each cell's changed pixels, so a diagonal neighbor can now and then join early.
function changedAreas(capture: ChangedCapture): string[] {
    const { boxes, columns, rows } = cellBoxes(capture);
    const seen = new Set<number>();
    const hashes: string[] = [];
    for (const start of boxes.keys()) {
        if (seen.has(start)) continue;
        seen.add(start);
        const stack = [start];
        const area = { ...(boxes.get(start) as Box) };
        while (stack.length > 0) {
            const cell = stack.pop() as number;
            const box = boxes.get(cell) as Box;
            area.x0 = Math.min(area.x0, box.x0);
            area.y0 = Math.min(area.y0, box.y0);
            area.x1 = Math.max(area.x1, box.x1);
            area.y1 = Math.max(area.y1, box.y1);
            const row = Math.floor(cell / columns);
            const column = cell % columns;
            for (let dy = -1; dy <= 1; dy += 1) {
                for (let dx = -1; dx <= 1; dx += 1) {
                    const nextRow = row + dy;
                    const nextColumn = column + dx;
                    if (nextRow < 0 || nextColumn < 0 || nextRow >= rows || nextColumn >= columns) continue;
                    const next = nextRow * columns + nextColumn;
                    const nextBox = boxes.get(next);
                    if (nextBox && !seen.has(next) && gapBetween(box, nextBox) < CELL) {
                        seen.add(next);
                        stack.push(next);
                    }
                }
            }
        }
        hashes.push(hashArea(capture, area));
    }
    return hashes.sort();
}

// What grouping needs from a capture's pixels, so the pixels can be released before the rest are read.
export function changeSignature(capture: ChangedCapture): ChangeSignature | null {
    if (capture.sizeChanged) return null;
    return { shift: colorShift(capture), areas: changedAreas(capture) };
}

const byId = (a: SignedCapture, b: SignedCapture) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const largestFirst = (a: SignedCapture[], b: SignedCapture[]) => b.length - a.length || byId(a[0], b[0]);

function colorGroups(captures: SignedCapture[]): SignedCapture[][] {
    const found: { direction: Vector; members: SignedCapture[] }[] = [];
    for (const capture of captures) {
        const shift = capture.signature.shift;
        if (!shift) continue;
        const home = found.find((group) => dot(group.direction, shift.direction) >= SAME_DIRECTION);
        if (home) home.members.push(capture);
        else found.push({ direction: shift.direction, members: [capture] });
    }
    return found
        .map((group) => group.members)
        .filter((members) => members.length >= 2)
        .sort(largestFirst);
}

function exactGroups(captures: SignedCapture[]): SignedCapture[][] {
    const found = new Map<string, SignedCapture[]>();
    for (const capture of captures) {
        if (capture.signature.areas.length === 0) continue;
        const key = capture.signature.areas.join('+');
        const members = found.get(key);
        if (members) members.push(capture);
        else found.set(key, [capture]);
    }
    return [...found.values()].filter((members) => members.length >= 2).sort(largestFirst);
}

function topPair(members: SignedCapture[]): number {
    const counts = new Map<number, number>();
    for (const { signature } of members) {
        const pair = (signature.shift as ColorShift).pair;
        counts.set(pair, (counts.get(pair) ?? 0) + 1);
    }
    return mostCommon(counts) as number;
}

export function groupChanges(captures: SignedCapture[]): { groups: ChangeGroup[]; keys: Map<string, string> } {
    const ordered = [...captures].sort(byId);
    const groups: ChangeGroup[] = [];
    const keys = new Map<string, string>();
    colorGroups(ordered).forEach((members, index) => {
        const key = `color-${index + 1}`;
        const pair = topPair(members);
        groups.push({ key, kind: 'color', from: hex(beforeOf(pair)), to: hex(afterOf(pair)) });
        for (const { id } of members) keys.set(id, key);
    });
    exactGroups(ordered.filter(({ id }) => !keys.has(id))).forEach((members, index) => {
        const key = `same-${index + 1}`;
        groups.push({ key, kind: 'exact' });
        for (const { id } of members) keys.set(id, key);
    });
    return { groups, keys };
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run scripts/visual/sameChange.test.ts`
Expected: PASS, all tests.

- [ ] **Step 6: Commit**

```bash
git add scripts/visual/types.ts scripts/visual/sameChange.ts scripts/visual/sameChange.test.ts
git commit -m "KAN-158: find captures with the same change"
```

---

## Task 2: Write groups into the report

**Files:**
- Modify: `scripts/visual/types.ts`
- Modify: `scripts/visual/report.ts`
- Test: `scripts/visual/report.test.ts`

- [ ] **Step 1: Write the failing test**

In `scripts/visual/report.test.ts`, add `import { fingerprint } from './fingerprint';` to the imports (keep them sorted), and add these tests inside `describe('buildReport', ...)`, before its closing `});`:

```ts
    it('groups captures with the same change', async () => {
        // d gets darker, so its change matches no other capture.
        const heads = [
            await record(headDir, 'a', 200),
            await record(headDir, 'b', 200),
            await record(headDir, 'c', 10),
            await record(headDir, 'd', 10),
        ];
        const retake = vi.fn(async (t: CaptureTarget) => heads.find((item) => item.id === t.id) as CaptureRecord);
        const bases = [await record(baseDir, 'a', 10), await record(baseDir, 'b', 10), await record(baseDir, 'd', 200)];
        const manifest = await run(bases, heads, retake);
        expect(manifest.groups).toEqual([{ key: 'color-1', kind: 'color', from: '#0a0a0a', to: '#c8c8c8' }]);
        const keys = Object.fromEntries(manifest.entries.map((entry) => [entry.id, entry.changeKey]));
        expect(keys).toEqual({ a: 'color-1', b: 'color-1', c: null, d: null });
    });

    it('writes the groups to manifest.json', async () => {
        const heads = [await record(headDir, 'a', 200), await record(headDir, 'b', 200)];
        const retake = vi.fn(async (t: CaptureTarget) => heads.find((item) => item.id === t.id) as CaptureRecord);
        await run([await record(baseDir, 'a', 10), await record(baseDir, 'b', 10)], heads, retake);
        const written = JSON.parse(readFileSync(join(reportDir, 'manifest.json'), 'utf8')) as Manifest;
        expect(written.groups).toHaveLength(1);
        expect(written.entries[0].changeKey).toBe('color-1');
    });

    it('keeps the fingerprint independent of grouping', async () => {
        const heads = [await record(headDir, 'a', 200), await record(headDir, 'b', 200)];
        const retake = vi.fn(async (t: CaptureTarget) => heads.find((item) => item.id === t.id) as CaptureRecord);
        const manifest = await run([await record(baseDir, 'a', 10), await record(baseDir, 'b', 10)], heads, retake);
        expect(manifest.entries.map((entry) => entry.changeKey)).toEqual(['color-1', 'color-1']);
        const ungrouped = manifest.entries.map((entry) => ({ ...entry, changeKey: null }));
        expect(manifest.fingerprint).toBe(fingerprint(ungrouped));
    });
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run scripts/visual/report.test.ts`
Expected: FAIL, `manifest.groups` is undefined.

- [ ] **Step 3: Change the types**

In `scripts/visual/types.ts`, add `changeKey: string | null;` to `ReportEntry` after `error: string | null;`, and add `groups: ChangeGroup[];` to `Manifest` after `entries: ReportEntry[];`.

- [ ] **Step 4: Wire it into `report.ts`**

Add the import, sorted with the others:

```ts
import { changeSignature, groupChanges, type SignedCapture } from './sameChange';
```

Add `const signatures: SignedCapture[] = [];` right after `let retakesLeft = MAX_RETAKEN_CAPTURES;`.

Add `changeKey: null,` after `error: record.error,` in `failedEntry`, and after `error: null,` in `changedEntry` and `singleImageEntry`.

At the start of `changedEntry`, before `const diffRaw`, add:

```ts
        const signature = changeSignature(diff);
        if (signature) signatures.push({ id: record.id, signature });
```

Replace the line `const entries = (await runPool(ids, CONCURRENCY, entryFor)).filter((entry) => entry !== null);` with:

```ts
    const found = (await runPool(ids, CONCURRENCY, entryFor)).filter((entry) => entry !== null);
    const { groups, keys } = groupChanges(signatures);
    const entries = found.map((entry) => ({ ...entry, changeKey: keys.get(entry.id) ?? null }));
```

Add `groups,` to the manifest literal after `entries,`.

- [ ] **Step 5: Run the tests and the type check**

Run: `npx vitest run scripts/visual/report.test.ts` and then `npx tsc --noEmit`
Expected: tests PASS. `tsc` has no errors.

- [ ] **Step 6: Commit**

```bash
git add scripts/visual/types.ts scripts/visual/report.ts scripts/visual/report.test.ts
git commit -m "KAN-158: write same-change groups into the report"
```

---

## Task 3: Validate the new fields, and add the PR link

**Files:**
- Modify: `scripts/visual/publish/manifest.mjs`
- Test: `scripts/visual/publish/manifest.test.mjs`

- [ ] **Step 1: Write the failing tests**

In `manifest.test.mjs`, change the import to `import { publishedManifest, validateManifest } from './manifest.mjs';`, and add inside `describe('validateManifest', ...)`:

```js
    const withGroups = (groups, changeKey = groups[0]?.key) => {
        const manifest = valid();
        manifest.groups = groups;
        manifest.entries[0].changeKey = changeKey;
        return manifest;
    };

    it('accepts a manifest with no groups', () => {
        expect(validateManifest(valid()).entries).toHaveLength(1);
    });

    it('accepts a color group and an exact group', () => {
        const groups = [{ key: 'color-1', kind: 'color', from: '#241f1a', to: '#7c3aed' }, { key: 'same-1', kind: 'exact' }];
        expect(validateManifest(withGroups(groups)).groups).toHaveLength(2);
    });

    it.each([
        ['key', { key: '../evil', kind: 'exact' }, /key/],
        ['kind', { key: 'same-1', kind: 'weird' }, /kind/],
        ['color', { key: 'color-1', kind: 'color', from: 'url(https://evil)', to: '#7c3aed' }, /color/],
        ['uppercase color', { key: 'color-1', kind: 'color', from: '#AAAAAA', to: '#7c3aed' }, /color/],
    ])('rejects a group with a bad %s', (_name, group, message) => {
        expect(() => validateManifest(withGroups([group]))).toThrow(message);
    });

    it('rejects groups that are not a list', () => {
        expect(() => validateManifest({ ...valid(), groups: 'nope' })).toThrow(/groups/);
    });

    it('rejects a changeKey with no group', () => {
        expect(() => validateManifest(withGroups([{ key: 'same-1', kind: 'exact' }], 'same-2'))).toThrow(/changeKey/);
    });

    it.each([
        ['id', 7, /invalid id/],
        ['storyId', '', /storyId/],
        ['title', null, /title/],
        ['name', undefined, /name/],
        ['locale', 'fr', /locale/],
        ['width', 'tablet', /width/],
        ['percent', 'a lot', /percent/],
        ['percent', 101, /percent/],
        ['error', 5, /error/],
    ])('rejects an entry with a bad %s (%s)', (field, value, message) => {
        const manifest = valid();
        manifest.entries[0][field] = value;
        expect(() => validateManifest(manifest)).toThrow(message);
    });
```

And add at the end of the file:

```js
describe('publishedManifest', () => {
    const options = { repo: 'CodeGetItGR/storywall', prNumber: '263', createdAt: '2026-11-07T00:00:00.000Z' };

    it('adds the PR link', () => {
        expect(publishedManifest(valid(), options).pull).toEqual({ number: 263, url: 'https://github.com/CodeGetItGR/storywall/pull/263' });
    });

    it("doesn't let the manifest choose where the link goes", () => {
        const hostile = { ...valid(), pull: { number: 1, url: 'https://evil.example' } };
        expect(publishedManifest(hostile, options).pull.url).toBe('https://github.com/CodeGetItGR/storywall/pull/263');
    });

    it('keeps the manifest and adds the time', () => {
        const published = publishedManifest(valid(), options);
        expect(published.fingerprint).toBe('c'.repeat(64));
        expect(published.createdAt).toBe('2026-11-07T00:00:00.000Z');
    });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run scripts/visual/publish/manifest.test.mjs`
Expected: FAIL, `publishedManifest` isn't exported.

- [ ] **Step 3: Write the implementation**

Replace all of `scripts/visual/publish/manifest.mjs` with:

```js
const STATES = new Set(['changed', 'new', 'removed', 'failed']);
// The same as config.ts, which this job can't import. A test keeps them equal. The publish job runs the base branch's copy,
// so a new language or width has to be merged before a PR can capture it.
export const LOCALES = new Set(['en', 'el']);
export const WIDTHS = new Set(['mobile', 'desktop']);
const GROUP_KINDS = new Set(['color', 'exact']);
const TEXT_FIELDS = ['id', 'storyId', 'title', 'name'];
const IMAGE_PATH = /^img\/[0-9a-f]{16}-(before|after|diff|preview)\.webp$/;
const COMPONENT_PATH = /^components\/[\w./-]+\.tsx$/;
const GROUP_KEY = /^(color|same)-\d+$/;
const COLOR = /^#[0-9a-f]{6}$/;
const SHA = /^[0-9a-f]{40}$/;
const IMAGE_KINDS = new Set(['before', 'after', 'diff', 'preview']);
const MAX_MISSING_STORIES = 200;

// A report from before same-change grouping has no groups, and that's fine.
function validateGroups(groups) {
    if (groups === undefined) return new Set();
    if (!Array.isArray(groups)) throw new Error('Manifest has an invalid groups list');
    const keys = new Set();
    for (const group of groups) {
        if (typeof group?.key !== 'string' || !GROUP_KEY.test(group.key)) throw new Error(`Manifest group has an invalid key: ${group?.key}`);
        if (keys.has(group.key)) throw new Error(`Manifest has a repeated group key: ${group.key}`);
        if (!GROUP_KINDS.has(group.kind)) throw new Error(`Manifest group has an unknown kind: ${group.kind}`);
        for (const color of [group.from, group.to]) {
            if (color !== undefined && (typeof color !== 'string' || !COLOR.test(color)))
                throw new Error(`Manifest group has an invalid color: ${color}`);
        }
        keys.add(group.key);
    }
    return keys;
}

function validateEntry(entry, groupKeys) {
    for (const field of TEXT_FIELDS) {
        if (typeof entry[field] !== 'string' || entry[field] === '') throw new Error(`Manifest entry has an invalid ${field}`);
    }
    if (!STATES.has(entry.state)) throw new Error(`Manifest entry has an unknown state: ${entry.state}`);
    if (!LOCALES.has(entry.locale)) throw new Error(`Manifest entry has an unknown locale: ${entry.locale}`);
    if (!WIDTHS.has(entry.width)) throw new Error(`Manifest entry has an unknown width: ${entry.width}`);
    if (typeof entry.percent !== 'number' || !(entry.percent >= 0 && entry.percent <= 100)) throw new Error('Manifest entry has an invalid percent');
    if (entry.error !== null && typeof entry.error !== 'string') throw new Error('Manifest entry has an invalid error');
    if (entry.changeKey !== undefined && entry.changeKey !== null && !groupKeys.has(entry.changeKey)) {
        throw new Error(`Manifest entry has an unknown changeKey: ${entry.changeKey}`);
    }
    const images = entry.images;
    if (images === null || typeof images !== 'object' || Array.isArray(images)) throw new Error('Manifest entry has an invalid images list');
    for (const [kind, path] of Object.entries(images)) {
        if (!IMAGE_KINDS.has(kind)) throw new Error(`Manifest entry has an unknown image kind: ${kind}`);
        if (typeof path !== 'string' || !IMAGE_PATH.test(path)) throw new Error(`Manifest entry has an invalid image path: ${path}`);
    }
}

// The manifest was written by the job that ran the PR's dependencies, so nothing in it is trusted.
export function validateManifest(manifest) {
    if (!/^[0-9a-f]{64}$/.test(manifest?.fingerprint ?? '')) throw new Error('Manifest has an invalid fingerprint');
    for (const field of ['headSha', 'baseSha']) {
        if (typeof manifest[field] !== 'string' || !SHA.test(manifest[field])) throw new Error(`Manifest has an invalid ${field}`);
    }
    if (!Array.isArray(manifest.entries)) throw new Error('Manifest has no entries list');
    if (!Array.isArray(manifest.missingStories)) throw new Error('Manifest has no missingStories list');
    if (manifest.missingStories.length > MAX_MISSING_STORIES) throw new Error('Manifest lists too many components with no story');
    for (const file of manifest.missingStories) {
        if (typeof file !== 'string' || !COMPONENT_PATH.test(file)) throw new Error(`Manifest has an invalid component path: ${file}`);
    }
    if (!Number.isInteger(manifest.totalCaptures) || manifest.totalCaptures < 0) throw new Error('Manifest has no totalCaptures');
    const groupKeys = validateGroups(manifest.groups);
    for (const entry of manifest.entries) validateEntry(entry, groupKeys);
    for (const state of STATES) {
        const actual = manifest.entries.filter((entry) => entry.state === state).length;
        if (manifest.counts?.[state] !== actual) throw new Error(`Manifest count for ${state} doesn't match its entries`);
    }
    return manifest;
}

// The PR link comes last, so a manifest can't choose where it goes.
export function publishedManifest(manifest, { repo, prNumber, createdAt }) {
    return { ...manifest, createdAt, pull: { number: Number(prNumber), url: `https://github.com/${repo}/pull/${prNumber}` } };
}
```

After review, the tests also cover: a `valid()` manifest shaped like `buildReport`'s output (`groups: []`, `changeKey: null`, hashes) and a legacy one without groups; a `changeKey` with no groups; a repeated group key; a bad `to` color; a negative percent; a failed entry with its error; bad `headSha`/`baseSha`; `images` that are an array, null, missing or a number; an unknown image kind; `LOCALES` and `WIDTHS` matching `config.ts`; and a manifest that brings its own `createdAt`.

- [ ] **Step 4: Run all publish tests**

Run: `npx vitest run scripts/visual/publish`
Expected: PASS. If a test in another file builds a manifest that the stricter validator now rejects, add the missing field to that test's data. Don't loosen the validator.

- [ ] **Step 5: Commit**

```bash
git add scripts/visual/publish/manifest.mjs scripts/visual/publish/manifest.test.mjs
git commit -m "KAN-158: validate every manifest value the new page shows"
```

---

## Task 4: Page text and model

**Files:**
- Create: `scripts/visual/report/src/copy.ts`
- Create: `scripts/visual/report/src/testing/fixture.ts`
- Create: `scripts/visual/report/src/lib/captures.ts`
- Create: `scripts/visual/report/src/lib/labels.ts`
- Create: `scripts/visual/report/src/lib/model.ts`
- Test: `scripts/visual/report/src/copy.test.ts`, `scripts/visual/report/src/lib/captures.test.ts`, `scripts/visual/report/src/lib/labels.test.ts`, `scripts/visual/report/src/lib/model.test.ts`

- [ ] **Step 1: Write `copy.ts`**

This is the approved wording. Copy it exactly.

```ts
import type { CaptureLocale, WidthName } from '../../config';
import type { CaptureState } from '../../types';

const count = (value: number, one: string, many: string) => `${value} ${value === 1 ? one : many}`;

const firstNames = (names: string[]) => `${names.slice(0, 2).join(', ')}${names.length > 2 ? ` and ${names.length - 2} more` : ''}`;

// Every string on the page. The page is for developers, so it's in English only, like the PR comment.
export const copy = {
    title: 'Visual check',
    loading: 'Loading...',
    loadFailed: 'Could not load this report. It may have been deleted when the PR closed.',
    nothingMatches: 'Nothing matches these filters.',

    states: { failed: 'Failed', changed: 'Changed', new: 'New', removed: 'Removed' } satisfies Record<CaptureState, string>,
    languages: { en: 'English', el: 'Greek' } satisfies Record<CaptureLocale, string>,
    widths: { mobile: 'Mobile', desktop: 'Desktop' } satisfies Record<WidthName, string>,

    // Sidebar
    pull: (number: number) => `PR #${number}`,
    position: (at: number, total: number) => `${at} of ${total}`,
    capturesReviewed: (total: number) => (total === 1 ? 'capture reviewed' : 'captures reviewed'),
    findStory: 'Find a story',
    filterByState: 'Filter by state',
    organizeList: 'Organize the list',
    byArea: 'By area',
    sameChange: 'Same change',
    hideReviewed: 'Hide reviewed',
    overview: 'Overview',
    onTheirOwn: 'On their own',
    stories: 'Stories',
    reviewed: 'Reviewed',

    // Story
    noChange: 'no change',
    compare: 'Compare',
    sideBySide: 'Side by side',
    slider: 'Slider',
    diff: 'Diff',
    before: 'Before',
    after: 'After',
    zoom: 'Zoom',
    fit: 'Fit',
    fullSize: '100%',
    languageAndWidth: 'Language and width',
    moveDivider: 'Move the divider between before and after',

    // Failed story
    storyFailed: 'This story failed',
    noErrorMessage: 'No error message.',
    fixBeforeApproval: 'Fix it before these changes can be approved.',

    // Group
    colorChange: 'Color change',
    sameChangeName: (component: string, names: string[], where?: string) => `${component}${where ? `, ${where}` : ''}: ${firstNames(names)}`,
    sameChangeStories: (names: string[], where?: string) => `${where ? `${where}: ` : ''}${firstNames(names)}`,
    captures: (value: number) => count(value, 'capture', 'captures'),
    groupSize: (captures: number, stories: number) => `${count(captures, 'capture', 'captures')}, ${count(stories, 'story', 'stories')}`,
    showing: (story: string, capture: string) => `Showing ${story}, ${capture}`,
    everyCapture: 'Every capture with this change',
    showAll: (value: number) => `Show all ${value}`,

    // Overview
    differ: (differing: number, total: number) => `${differing} of ${total} captures ${differing === 1 ? 'differs' : 'differ'}`,
    area: 'Area',
    biggestChanges: 'Biggest changes',
    missingStories: 'Components with no story',

    // Bottom bar
    previous: '← Previous',
    next: 'Next →',
    toReview: (value: number) => `${value} to review`,
    startReview: 'Start review',
    continueReview: 'Continue review',
    looksRight: 'Looks right',
    looksRightForAll: (value: number) => `Looks right for all ${value}`,
    undoReviewed: 'Undo reviewed',
    approve: 'Approve in the PR',
    fixFailedFirst: 'Fix the failed stories first',

    // Shortcuts
    shortcuts: 'Keyboard shortcuts',
    previousOrNext: 'Previous or next',
    looksRightThenNext: 'Looks right, then next',
    nextCapture: 'Next language or width',
    compareKeys: 'Side by side, slider, diff',
    zoomKeys: 'Fit or 100%',
    modeKeys: 'By area or same change',
    close: 'Close',
};
```

- [ ] **Step 2: Write the test data**

Create `scripts/visual/report/src/testing/fixture.ts`:

```ts
import type { ChangeGroup, ReportEntry } from '../../../types';
import type { ReportManifest } from '../lib/model';

export function testEntry(id: string, overrides: Partial<ReportEntry> = {}): ReportEntry {
    return {
        id,
        storyId: 'feed-postcard--default',
        title: 'Feed/PostCard',
        name: 'Default',
        locale: 'en',
        width: 'mobile',
        state: 'changed',
        beforeHash: `before-${id}`,
        afterHash: `after-${id}`,
        percent: 3.67,
        error: null,
        changeKey: null,
        images: { before: `img/${id}-before.webp`, after: `img/${id}-after.webp`, diff: `img/${id}-diff.webp` },
        ...overrides,
    };
}

export function testManifest(entries: ReportEntry[], extra: Partial<ReportManifest> = {}): ReportManifest {
    const counts = { changed: 0, new: 0, removed: 0, failed: 0 };
    for (const entry of entries) counts[entry.state] += 1;
    return {
        headSha: 'a'.repeat(40),
        baseSha: 'b'.repeat(40),
        totalCaptures: 1078,
        counts,
        fingerprint: 'c'.repeat(64),
        entries,
        groups: [],
        missingStories: [],
        pull: { number: 263, url: 'https://github.com/CodeGetItGR/storywall/pull/263' },
        ...extra,
    };
}

// Review order by area: Composer, PostCard, Badge, Button.
export const sampleEntries: ReportEntry[] = [
    testEntry('feed-composer--default--en--mobile', { storyId: 'feed-composer--default', title: 'Feed/Composer', percent: 2 }),
    testEntry('feed-postcard--default--en--mobile'),
    testEntry('feed-postcard--default--en--desktop', { width: 'desktop', percent: 1.2 }),
    testEntry('ui-badge--old--en--mobile', {
        storyId: 'ui-badge--old',
        title: 'UI/Badge',
        name: 'Old',
        state: 'removed',
        percent: 100,
        afterHash: null,
        images: { before: 'img/old-before.webp' },
    }),
    testEntry('ui-button--primary--en--mobile', {
        storyId: 'ui-button--primary',
        title: 'UI/Button',
        name: 'Primary',
        state: 'new',
        percent: 100,
        beforeHash: null,
        images: { after: 'img/primary-after.webp' },
    }),
];

export const failedEntry = testEntry('ui-card--broken--en--mobile', {
    storyId: 'ui-card--broken',
    title: 'UI/Card',
    name: 'Broken',
    state: 'failed',
    percent: 0,
    afterHash: null,
    error: 'Boom',
    images: {},
});

export const colorGroup: ChangeGroup = { key: 'color-1', kind: 'color', from: '#241f1a', to: '#7c3aed' };

// The first three captures share one color change.
export const groupedEntries: ReportEntry[] = sampleEntries.map((entry, index) => (index < 3 ? { ...entry, changeKey: colorGroup.key } : entry));
```

- [ ] **Step 3: Write the failing tests**

Create `scripts/visual/report/src/copy.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { copy } from './copy';

describe('copy', () => {
    it('counts one capture in the singular', () => {
        expect(copy.capturesReviewed(1)).toBe('capture reviewed');
        expect(copy.capturesReviewed(5)).toBe('captures reviewed');
        expect(copy.differ(1, 1078)).toBe('1 of 1078 captures differs');
        expect(copy.differ(5, 1078)).toBe('5 of 1078 captures differ');
    });
});
```

Create `scripts/visual/report/src/lib/captures.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { testEntry } from '../testing/fixture';
import { CAPTURE_ORDER, capturesInOrder } from './captures';

describe('captures', () => {
    it('takes each language, then each width', () => {
        expect(CAPTURE_ORDER).toEqual([
            { locale: 'en', width: 'mobile' },
            { locale: 'en', width: 'desktop' },
            { locale: 'el', width: 'mobile' },
            { locale: 'el', width: 'desktop' },
        ]);
    });

    it('orders captures by language, then width', () => {
        const entries = [testEntry('el', { locale: 'el' }), testEntry('desktop', { width: 'desktop' }), testEntry('mobile')];
        expect(capturesInOrder(entries).map((entry) => entry.id)).toEqual(['mobile', 'desktop', 'el']);
    });
});
```

Create `scripts/visual/report/src/lib/labels.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { testEntry } from '../testing/fixture';
import { altText, captureLabel, componentOf, entryValue, groupLabels, percentText, shortName } from './labels';

describe('labels', () => {
    it('shows percent with two decimals', () => {
        expect(percentText(3.666)).toBe('3.67%');
        expect(percentText(0.001)).toBe('<0.01%');
    });

    it('names a capture', () => {
        expect(captureLabel({ locale: 'el', width: 'desktop' })).toBe('EL Desktop');
    });

    it('shows percent for a change and the state otherwise', () => {
        expect(entryValue(testEntry('a'))).toBe('3.67%');
        expect(entryValue(testEntry('a', { state: 'new' }))).toBe('New');
    });

    it('shortens a story to its component and name', () => {
        expect(shortName(testEntry('a'))).toBe('PostCard / Default');
    });

    it('takes the component from the last part of the title', () => {
        expect(componentOf('Feed/PostCard/')).toBe('PostCard');
        expect(componentOf('Solo')).toBe('Solo');
    });

    it('keeps the alt text pattern', () => {
        expect(altText(testEntry('a', { locale: 'el' }), 'before')).toBe('Feed/PostCard, Default, Greek, mobile, before');
    });
});

describe('groupLabels', () => {
    const entries = (names: string[], overrides = {}) => names.map((name) => testEntry(name, { name, title: 'Feed/ComposerCard', ...overrides }));

    it('names a color group', () => {
        expect(groupLabels([{ key: 'color-1', kind: 'color', entries: entries(['A', 'B']) }]).get('color-1')).toBe('Color change');
    });

    it('names an exact group from its component and stories', () => {
        expect(groupLabels([{ key: 'same-1', kind: 'exact', entries: entries(['A', 'B']) }]).get('same-1')).toBe('ComposerCard: A, B');
    });

    it('says how many more stories there are', () => {
        expect(groupLabels([{ key: 'same-1', kind: 'exact', entries: entries(['A', 'B', 'C', 'D']) }]).get('same-1')).toBe(
            'ComposerCard: A, B and 2 more',
        );
    });

    it('adds the language and width when two groups read the same', () => {
        const labels = groupLabels([
            { key: 'same-1', kind: 'exact', entries: entries(['A', 'B'], { locale: 'en', width: 'desktop' }) },
            { key: 'same-2', kind: 'exact', entries: entries(['A', 'B'], { locale: 'el', width: 'mobile' }) },
        ]);
        expect(labels.get('same-1')).toBe('ComposerCard, EN Desktop: A, B');
        expect(labels.get('same-2')).toBe('ComposerCard, EL Mobile: A, B');
    });

    const acrossComponents = (overrides = {}) => [
        testEntry('a', overrides),
        testEntry('b', { storyId: 'feed-composer--default', title: 'Feed/Composer', ...overrides }),
        testEntry('c', { storyId: 'ui-button--primary', title: 'UI/Button', name: 'Primary', ...overrides }),
    ];

    it('names each story when a group covers more than one component', () => {
        expect(groupLabels([{ key: 'same-1', kind: 'exact', entries: acrossComponents() }]).get('same-1')).toBe(
            'PostCard / Default, Composer / Default and 1 more',
        );
    });

    it('puts the language and width first when two such groups read the same', () => {
        const labels = groupLabels([
            { key: 'same-1', kind: 'exact', entries: acrossComponents({ locale: 'en', width: 'mobile' }) },
            { key: 'same-2', kind: 'exact', entries: acrossComponents({ locale: 'el', width: 'desktop' }) },
        ]);
        expect(labels.get('same-1')).toBe('EN Mobile: PostCard / Default, Composer / Default and 1 more');
        expect(labels.get('same-2')).toBe('EL Desktop: PostCard / Default, Composer / Default and 1 more');
    });

    it('lists the languages and widths in capture order', () => {
        const mixed = [
            testEntry('a-el', { name: 'A', title: 'Feed/ComposerCard', locale: 'el', width: 'mobile' }),
            testEntry('a-en', { name: 'A', title: 'Feed/ComposerCard', locale: 'en', width: 'desktop' }),
        ];
        const labels = groupLabels([
            { key: 'same-1', kind: 'exact', entries: mixed },
            { key: 'same-2', kind: 'exact', entries: entries(['A']) },
        ]);
        expect(labels.get('same-1')).toBe('ComposerCard, EN Desktop, EL Mobile: A');
    });
});
```

Create `scripts/visual/report/src/lib/model.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { colorGroup, groupedEntries, sampleEntries, testEntry, testManifest } from '../testing/fixture';
import { areaTree, buildModel, largestPercent, storyCapture, worstState } from './model';

describe('buildModel', () => {
    it('makes stories from entries, sorted by area, component and name', () => {
        const model = buildModel(testManifest(sampleEntries));
        expect(model.stories.map((story) => story.id)).toEqual([
            'feed-composer--default',
            'feed-postcard--default',
            'ui-badge--old',
            'ui-button--primary',
        ]);
        expect(model.storyById.get('feed-postcard--default')?.entries).toHaveLength(2);
    });

    it('splits a title into area and component', () => {
        const model = buildModel(testManifest([testEntry('a', { title: 'Feed/Post/Card' }), testEntry('b', { storyId: 'b', title: 'Solo' })]));
        expect(model.storyById.get('feed-postcard--default')).toMatchObject({ area: 'Feed', component: 'Post / Card' });
        expect(model.storyById.get('b')).toMatchObject({ area: 'Solo', component: 'Solo' });
    });

    it('attaches entries to groups, biggest change first', () => {
        const model = buildModel(testManifest(groupedEntries, { groups: [colorGroup] }));
        const group = model.groupByKey.get('color-1');
        expect(group?.entries.map((entry) => entry.percent)).toEqual([3.67, 2, 1.2]);
        expect(group?.label).toBe('Color change');
    });

    it('accepts a manifest from before grouping', () => {
        const entries = sampleEntries.map((entry) => {
            const old: Partial<typeof entry> = { ...entry };
            delete old.changeKey;
            return old as typeof entry;
        });
        const model = buildModel(testManifest(entries, { groups: undefined }));
        expect(model.groups).toEqual([]);
        expect(model.manifest.entries.map((entry) => entry.changeKey)).toEqual(entries.map(() => null));
        expect(model.stories.flatMap((story) => story.entries).every((entry) => entry.changeKey === null)).toBe(true);
    });

    it('drops a group with fewer than two captures', () => {
        const model = buildModel(testManifest([testEntry('a', { changeKey: 'color-1' })], { groups: [colorGroup] }));
        expect(model.groups).toEqual([]);
    });

    it('puts the largest group first', () => {
        const entries = [
            testEntry('a', { changeKey: 'same-1' }),
            testEntry('b', { changeKey: 'same-1' }),
            testEntry('c', { changeKey: 'same-2' }),
            testEntry('d', { changeKey: 'same-2' }),
            testEntry('e', { changeKey: 'same-2' }),
        ];
        const groups = [
            { key: 'same-1', kind: 'exact' as const },
            { key: 'same-2', kind: 'exact' as const },
        ];
        expect(buildModel(testManifest(entries, { groups })).groups.map((group) => group.key)).toEqual(['same-2', 'same-1']);
    });

    it("names a group's stories in area order, whatever their percents", () => {
        const entries = [
            testEntry('zeta', { storyId: 'feed-composercard--zeta', title: 'Feed/ComposerCard', name: 'Zeta', percent: 9, changeKey: 'same-1' }),
            testEntry('alpha', { storyId: 'feed-composercard--alpha', title: 'Feed/ComposerCard', name: 'Alpha', percent: 1, changeKey: 'same-1' }),
        ];
        const group = buildModel(testManifest(entries, { groups: [{ key: 'same-1', kind: 'exact' }] })).groups[0];
        expect(group.label).toBe('ComposerCard: Alpha, Zeta');
        expect(group.entries.map((entry) => entry.id)).toEqual(['zeta', 'alpha']);
    });

    it('breaks a tie in percent by id', () => {
        const entries = ['b', 'a', 'B'].map((id) => testEntry(id, { changeKey: 'color-1', percent: 2 }));
        const group = buildModel(testManifest(entries, { groups: [colorGroup] })).groupByKey.get('color-1');
        expect(group?.entries.map((entry) => entry.id)).toEqual(['B', 'a', 'b']);
    });
});

describe('stories', () => {
    const postCard = buildModel(testManifest(sampleEntries)).storyById.get('feed-postcard--default');

    it('shows the worst state', () => {
        expect(worstState([testEntry('a', { state: 'new' }), testEntry('b', { state: 'failed' })])).toBe('failed');
    });

    it('keeps the chosen capture, or falls back to the first', () => {
        expect(storyCapture(postCard!, { locale: 'en', width: 'desktop' }).width).toBe('desktop');
        expect(storyCapture(postCard!, { locale: 'el', width: 'desktop' }).width).toBe('mobile');
    });

    it('finds the largest percent among changes only', () => {
        expect(largestPercent(postCard!)).toBe(3.67);
        expect(largestPercent({ ...postCard!, entries: [testEntry('a', { state: 'new', percent: 100 })] })).toBeNull();
    });

    it('builds the area tree', () => {
        const tree = areaTree(buildModel(testManifest(sampleEntries)).stories);
        expect(tree.map((branch) => [branch.area, branch.count])).toEqual([
            ['Feed', 2],
            ['UI', 2],
        ]);
        expect(tree[0].components.map((branch) => branch.key)).toEqual(['Feed/Composer', 'Feed/PostCard']);
    });
});
```

- [ ] **Step 4: Run them and see them fail**

Run: `npx vitest run scripts/visual/report/src`
Expected: FAIL, it can't find `./captures`, `./labels` and `./model`.

- [ ] **Step 5: Write `lib/captures.ts`**

The languages and widths come from `config.ts`, in their own file so `labels.ts` and `model.ts` can both use them without importing each other.

```ts
import { type CaptureLocale, LOCALES, type WidthName, WIDTHS } from '../../../config';
import type { ReportEntry } from '../../../types';

export type CaptureChoice = { locale: CaptureLocale; width: WidthName };

// Each language, then each width in it.
export const CAPTURE_ORDER: CaptureChoice[] = LOCALES.flatMap((locale) => WIDTHS.map(({ name }) => ({ locale, width: name })));

export const capturesInOrder = (entries: ReportEntry[]) =>
    CAPTURE_ORDER.flatMap(({ locale, width }) => entries.filter((entry) => entry.locale === locale && entry.width === width));
```

- [ ] **Step 6: Write `lib/labels.ts`**

```ts
import type { ReportEntry } from '../../../types';
import { copy } from '../copy';
import { capturesInOrder } from './captures';

type Capture = Pick<ReportEntry, 'locale' | 'width'>;
// Entries come in story order, so the names in a label do too.
type LabelledGroup = { key: string; kind: 'color' | 'exact'; entries: ReportEntry[] };

const unique = (values: string[]) => [...new Set(values)];

export const percentText = (percent: number) => (percent < 0.01 ? '<0.01%' : `${percent.toFixed(2)}%`);

export const captureLabel = ({ locale, width }: Capture) => `${locale.toUpperCase()} ${copy.widths[width]}`;

export const entryValue = ({ state, percent }: Pick<ReportEntry, 'state' | 'percent'>) =>
    state === 'changed' ? percentText(percent) : copy.states[state];

export const componentOf = (title: string) => title.split('/').filter(Boolean).pop() ?? title;

export const shortName = ({ title, name }: Pick<ReportEntry, 'title' | 'name'>) => `${componentOf(title)} / ${name}`;

export const altText = (entry: Pick<ReportEntry, 'title' | 'name' | 'locale' | 'width'>, what: string) =>
    `${entry.title}, ${entry.name}, ${copy.languages[entry.locale]}, ${entry.width}, ${what}`;

// A group across several components names each story with its component.
function exactName(entries: ReportEntry[], where?: string): string {
    const components = unique(entries.map((entry) => componentOf(entry.title)));
    if (components.length > 1) return copy.sameChangeStories(unique(entries.map(shortName)), where);
    return copy.sameChangeName(components[0], unique(entries.map((entry) => entry.name)), where);
}

// Two groups can cover the same stories in different languages or widths, so those say which is which.
export function groupLabels(groups: LabelledGroup[]): Map<string, string> {
    const plain = groups.map((group) => (group.kind === 'color' ? copy.colorChange : exactName(group.entries)));
    return new Map(
        groups.map((group, index): [string, string] => {
            const repeated = plain.filter((label) => label === plain[index]).length > 1;
            if (group.kind === 'color' || !repeated) return [group.key, plain[index]];
            const where = unique(capturesInOrder(group.entries).map(captureLabel)).join(', ');
            return [group.key, exactName(group.entries, where)];
        }),
    );
}
```

- [ ] **Step 7: Write `lib/model.ts`**

```ts
import type { CaptureState, ChangeGroup, Manifest, ReportEntry } from '../../../types';
import { type CaptureChoice, capturesInOrder } from './captures';
import { groupLabels } from './labels';

// A report from before same-change grouping has no groups, and a local run has no PR.
export type ReportManifest = Omit<Manifest, 'groups'> & { groups?: ChangeGroup[]; pull?: { number: number; url: string } };

export type Story = { id: string; area: string; component: string; name: string; entries: ReportEntry[] };
export type Group = ChangeGroup & { label: string; entries: ReportEntry[] };
export type ComponentBranch = { key: string; component: string; stories: Story[] };
export type AreaBranch = { area: string; count: number; components: ComponentBranch[] };

export type ReportModel = {
    manifest: ReportManifest;
    stories: Story[];
    storyById: ReadonlyMap<string, Story>;
    groups: Group[];
    groupByKey: ReadonlyMap<string, Group>;
};

export const STATES: CaptureState[] = ['failed', 'changed', 'new', 'removed'];

// One fixed language, so the order is the same on every machine.
const collator = new Intl.Collator('en');
const byTree = (a: Story, b: Story) =>
    collator.compare(a.area, b.area) || collator.compare(a.component, b.component) || collator.compare(a.name, b.name);

// The biggest change comes first, so the first capture shown is the easiest one to judge.
const biggestFirst = (a: ReportEntry, b: ReportEntry) => b.percent - a.percent || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function buildStories(entries: ReportEntry[]): Map<string, Story> {
    const stories = new Map<string, Story>();
    for (const entry of entries) {
        const story = stories.get(entry.storyId);
        if (story) {
            story.entries.push(entry);
        } else {
            const [area, ...rest] = entry.title.split('/');
            stories.set(entry.storyId, { id: entry.storyId, area, component: rest.join(' / ') || area, name: entry.name, entries: [entry] });
        }
    }
    return stories;
}

function buildGroups({ groups = [], entries }: ReportManifest, stories: Story[]): Group[] {
    const filled = groups
        .map((group) => ({ ...group, entries: entries.filter((entry) => entry.changeKey === group.key) }))
        .filter((group) => group.entries.length > 1)
        .sort((a, b) => b.entries.length - a.entries.length);
    // Labels name stories in the order the area list shows them, so a label doesn't change with the percents.
    const position = new Map(stories.map((story, index) => [story.id, index]));
    const inStoryOrder = (a: ReportEntry, b: ReportEntry) => (position.get(a.storyId) as number) - (position.get(b.storyId) as number);
    const labels = groupLabels(filled.map((group) => ({ ...group, entries: [...group.entries].sort(inStoryOrder) })));
    return filled.map((group) => ({ ...group, entries: [...group.entries].sort(biggestFirst), label: labels.get(group.key) ?? '' }));
}

export function buildModel(loaded: ReportManifest): ReportModel {
    // A report from before same-change grouping has no changeKey on its entries.
    const manifest = { ...loaded, entries: loaded.entries.map((entry) => ({ ...entry, changeKey: entry.changeKey ?? null })) };
    const storyById = buildStories(manifest.entries);
    const stories = [...storyById.values()].sort(byTree);
    const groups = buildGroups(manifest, stories);
    return { manifest, stories, storyById, groups, groupByKey: new Map(groups.map((group) => [group.key, group])) };
}

export const worstState = (entries: ReportEntry[]): CaptureState =>
    STATES.find((state) => entries.some((entry) => entry.state === state)) ?? 'changed';

export const storyCapture = (story: Story, { locale, width }: CaptureChoice) =>
    story.entries.find((entry) => entry.locale === locale && entry.width === width) ?? capturesInOrder(story.entries)[0];

export function largestPercent(story: Story): number | null {
    const changed = story.entries.filter((entry) => entry.state === 'changed');
    return changed.length > 0 ? Math.max(...changed.map((entry) => entry.percent)) : null;
}

export function areaTree(stories: Story[]): AreaBranch[] {
    const areas = new Map<string, Map<string, Story[]>>();
    for (const story of stories) {
        const components = areas.get(story.area) ?? new Map<string, Story[]>();
        components.set(story.component, [...(components.get(story.component) ?? []), story]);
        areas.set(story.area, components);
    }
    return [...areas].map(([area, components]) => ({
        area,
        count: [...components.values()].reduce((sum, list) => sum + list.length, 0),
        components: [...components].map(([component, list]) => ({ key: `${area}/${component}`, component, stories: list })),
    }));
}
```

- [ ] **Step 8: Run the tests**

Run: `npx vitest run scripts/visual/report/src`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add scripts/visual/report/src/copy.ts scripts/visual/report/src/copy.test.ts scripts/visual/report/src/testing/fixture.ts scripts/visual/report/src/lib/captures.ts scripts/visual/report/src/lib/captures.test.ts scripts/visual/report/src/lib/labels.ts scripts/visual/report/src/lib/labels.test.ts scripts/visual/report/src/lib/model.ts scripts/visual/report/src/lib/model.test.ts
git commit -m "KAN-158: add the report page's text and model"
```

---

## Task 5: Marks, review order and addresses

**Files:**
- Create: `scripts/visual/report/src/lib/marks.ts`, `reviewOrder.ts`, `addresses.ts`
- Test: `marks.test.ts`, `reviewOrder.test.ts`, `addresses.test.ts` in the same folder

- [ ] **Step 1: Write the failing tests**

Create `scripts/visual/report/src/lib/marks.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { testEntry } from '../testing/fixture';
import { isMarked, marksKey, readMarks, withMarks, withoutMarks, writeMarks } from './marks';

const entry = testEntry('a');

describe('marks', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => vi.restoreAllMocks());

    it('marks and unmarks', () => {
        const marked = withMarks(new Map(), [entry]);
        expect(isMarked(marked, entry)).toBe(true);
        expect(isMarked(withoutMarks(marked, [entry]), entry)).toBe(false);
    });

    it('survives a new commit when both hashes match', () => {
        expect(isMarked(withMarks(new Map(), [entry]), testEntry('a'))).toBe(true);
    });

    it('clears when a hash changes', () => {
        const marked = withMarks(new Map(), [entry]);
        expect(isMarked(marked, { ...entry, afterHash: 'new' })).toBe(false);
        expect(isMarked(marked, { ...entry, beforeHash: 'new' })).toBe(false);
    });

    it('keeps marks in storage, per PR', () => {
        const key = marksKey({ pull: { number: 263, url: 'x' } });
        expect(key).not.toBe(marksKey({ pull: { number: 264, url: 'x' } }));
        writeMarks(key, withMarks(new Map(), [entry]));
        expect(isMarked(readMarks(key), entry)).toBe(true);
    });

    it('has a key for a local run', () => {
        expect(marksKey({})).toBe('visual-report-marks-local');
    });

    it('ignores broken storage', () => {
        localStorage.setItem('k', 'not json');
        expect(readMarks('k').size).toBe(0);
        localStorage.setItem('k', '{"a":"b"}');
        expect(readMarks('k').size).toBe(0);
        localStorage.setItem('k', '[["a","b"],["c",1],"d"]');
        expect([...readMarks('k')]).toEqual([['a', 'b']]);
    });

    it('treats a hostile id as plain data', () => {
        const hostile = testEntry('__proto__');
        const key = 'k';
        writeMarks(key, withMarks(new Map(), [hostile]));
        expect(isMarked(readMarks(key), hostile)).toBe(true);
    });

    it('keeps working when storage is unavailable', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        expect(readMarks('k').size).toBe(0);
        expect(() => writeMarks('k', new Map())).not.toThrow();
    });
});
```

Create `scripts/visual/report/src/lib/reviewOrder.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { colorGroup, failedEntry, groupedEntries, sampleEntries, testManifest } from '../testing/fixture';
import { withMarks } from './marks';
import { buildModel } from './model';
import { allReviewed, barActions, currentIndex, entryMatches, type Filters, firstOpenItem, type Item, OVERVIEW, reviewable, reviewProgress, reviewQueue, sameItem } from './reviewOrder';

const none: Filters = { states: new Set(), search: '', hideReviewed: false };
const noMarks = new Map<string, string>();
const story = (id: string): Item => ({ kind: 'story', id });

describe('reviewQueue', () => {
    const model = buildModel(testManifest(sampleEntries));
    const grouped = buildModel(testManifest(groupedEntries, { groups: [colorGroup] }));

    it('lists stories by area', () => {
        expect(reviewQueue(model, 'area', none, noMarks).map((item) => item.kind === 'story' && item.id)).toEqual([
            'feed-composer--default',
            'feed-postcard--default',
            'ui-badge--old',
            'ui-button--primary',
        ]);
    });

    it('lists groups first, then stories on their own', () => {
        expect(reviewQueue(grouped, 'change', none, noMarks)).toEqual([{ kind: 'group', key: 'color-1' }, story('ui-badge--old'), story('ui-button--primary')]);
    });

    it('narrows by state', () => {
        const queue = reviewQueue(model, 'area', { ...none, states: new Set(['new']) }, noMarks);
        expect(queue).toEqual([story('ui-button--primary')]);
    });

    it('narrows by search, in any case, across title and name', () => {
        expect(reviewQueue(model, 'area', { ...none, search: ' BUTTON ' }, noMarks)).toEqual([story('ui-button--primary')]);
        expect(reviewQueue(model, 'area', { ...none, search: 'old' }, noMarks)).toEqual([story('ui-badge--old')]);
    });

    it('hides reviewed captures', () => {
        const marks = withMarks(noMarks, [sampleEntries[0]]);
        const queue = reviewQueue(model, 'area', { ...none, hideReviewed: true }, marks);
        expect(queue).not.toContainEqual(story('feed-composer--default'));
    });

    it('hides a group when no capture in it matches', () => {
        expect(reviewQueue(grouped, 'change', { ...none, states: new Set(['new']) }, noMarks)).toEqual([story('ui-button--primary')]);
    });
});

describe('entryMatches', () => {
    it('matches everything with no filters', () => {
        expect(entryMatches(sampleEntries[0], none, noMarks)).toBe(true);
    });
});

describe('reviewing', () => {
    const entries = [...sampleEntries, failedEntry];
    const model = buildModel(testManifest(entries));

    it('never counts a failed capture', () => {
        expect(reviewable(entries)).not.toContain(failedEntry);
        expect(reviewProgress(model, noMarks)).toEqual({ done: 0, total: 5 });
    });

    it('has nothing reviewed in a failed-only story', () => {
        expect(allReviewed([failedEntry], noMarks)).toBe(false);
    });

    it('finds the first item not yet reviewed', () => {
        const queue = reviewQueue(model, 'area', none, noMarks);
        expect(firstOpenItem(model, queue, noMarks)).toEqual(story('feed-composer--default'));
        expect(firstOpenItem(model, queue, withMarks(noMarks, [sampleEntries[0]]))).toEqual(story('feed-postcard--default'));
    });

    it('finds items', () => {
        expect(sameItem(story('a'), story('a'))).toBe(true);
        expect(sameItem(story('a'), story('b'))).toBe(false);
        expect(sameItem(OVERVIEW, OVERVIEW)).toBe(true);
        expect(currentIndex([story('a'), story('b')], story('b'))).toBe(1);
        expect(currentIndex([story('a')], OVERVIEW)).toBe(-1);
    });
});

describe('barActions', () => {
    const clean = buildModel(testManifest(sampleEntries));
    const queue = reviewQueue(clean, 'area', none, noMarks);
    const everything = withMarks(noMarks, sampleEntries);

    it('offers Start review on the Overview', () => {
        const actions = barActions(clean, OVERVIEW, queue, noMarks);
        expect(actions.start).toEqual({ item: story('feed-composer--default'), started: false });
        expect(actions.mark).toBeNull();
    });

    it('offers Continue review once something is marked', () => {
        const actions = barActions(clean, OVERVIEW, queue, withMarks(noMarks, [sampleEntries[0]]));
        expect(actions.start?.started).toBe(true);
    });

    it('offers Looks right, then Undo', () => {
        const item = story('feed-composer--default');
        expect(barActions(clean, item, queue, noMarks).mark).toBe('looks-right');
        expect(barActions(clean, item, queue, withMarks(noMarks, [sampleEntries[0]])).mark).toBe('undo');
    });

    it('offers the approve link when everything is reviewed', () => {
        expect(barActions(clean, OVERVIEW, queue, everything)).toMatchObject({ approve: 'link', start: null });
        expect(barActions(clean, story('ui-badge--old'), queue, everything)).toMatchObject({ approve: 'link', mark: 'undo' });
    });

    it('blocks approval while a story failed', () => {
        const model = buildModel(testManifest([...sampleEntries, failedEntry]));
        expect(barActions(model, OVERVIEW, queue, everything).approve).toBe('blocked');
        expect(barActions(model, story('ui-card--broken'), queue, everything).mark).toBeNull();
    });

    it('hides the approve link on a local run', () => {
        const local = buildModel(testManifest(sampleEntries, { pull: undefined }));
        expect(barActions(local, OVERVIEW, queue, everything).approve).toBeNull();
    });

    it('offers nothing on an empty report', () => {
        const empty = buildModel(testManifest([]));
        expect(barActions(empty, OVERVIEW, [], noMarks)).toEqual({ start: null, mark: null, approve: null });
    });
});
```

Create `scripts/visual/report/src/lib/addresses.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { colorGroup, groupedEntries, testManifest } from '../testing/fixture';
import { hashOf, itemFromHash } from './addresses';
import { buildModel } from './model';
import { OVERVIEW } from './reviewOrder';

const model = buildModel(testManifest(groupedEntries, { groups: [colorGroup] }));

describe('addresses', () => {
    it('gives every item an address', () => {
        expect(hashOf({ kind: 'story', id: 'a' })).toBe('a');
        expect(hashOf({ kind: 'group', key: 'color-1' })).toBe('group-color-1');
        expect(hashOf(OVERVIEW)).toBe('overview');
    });

    it('opens a story', () => {
        expect(itemFromHash('#ui-badge--old', model)).toEqual({ kind: 'story', id: 'ui-badge--old' });
    });

    it('opens a group', () => {
        expect(itemFromHash('#group-color-1', model)).toEqual({ kind: 'group', key: 'color-1' });
    });

    it('opens the Overview for anything else', () => {
        expect(itemFromHash('', model)).toEqual(OVERVIEW);
        expect(itemFromHash('#overview', model)).toEqual(OVERVIEW);
        expect(itemFromHash('#nope', model)).toEqual(OVERVIEW);
        expect(itemFromHash('#group-nope', model)).toEqual(OVERVIEW);
        expect(itemFromHash('#%E0%A4%A', model)).toEqual(OVERVIEW);
    });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run scripts/visual/report/src/lib`
Expected: FAIL, it can't find `./marks`, `./reviewOrder` and `./addresses`.

- [ ] **Step 3: Write `lib/marks.ts`**

```ts
import type { ReportEntry } from '../../../types';
import type { ReportManifest } from './model';

// Capture id to its beforeHash|afterHash. A capture counts as reviewed only while both hashes match,
// so a new push keeps the marks on captures it didn't change and clears the rest.
export type Marks = ReadonlyMap<string, string>;

type Markable = Pick<ReportEntry, 'id' | 'beforeHash' | 'afterHash'>;

const markValue = ({ beforeHash, afterHash }: Markable) => `${beforeHash}|${afterHash}`;

export const isMarked = (marks: Marks, entry: Markable) => marks.get(entry.id) === markValue(entry);

export function withMarks(marks: Marks, entries: Markable[]): Marks {
    const next = new Map(marks);
    for (const entry of entries) next.set(entry.id, markValue(entry));
    return next;
}

export function withoutMarks(marks: Marks, entries: Markable[]): Marks {
    const next = new Map(marks);
    for (const entry of entries) next.delete(entry.id);
    return next;
}

// One key per PR, because every report on the site shares this browser's storage.
export const marksKey = ({ pull }: Pick<ReportManifest, 'pull'>) => `visual-report-marks-${pull?.number ?? 'local'}`;

const isPair = (value: unknown): value is [string, string] =>
    Array.isArray(value) && value.length === 2 && typeof value[0] === 'string' && typeof value[1] === 'string';

export function readMarks(key: string): Marks {
    try {
        const stored: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
        return new Map(Array.isArray(stored) ? stored.filter(isPair) : []);
    } catch {
        return new Map();
    }
}

export function writeMarks(key: string, marks: Marks) {
    try {
        localStorage.setItem(key, JSON.stringify([...marks]));
    } catch {
        // The marks last until the page closes.
    }
}
```

- [ ] **Step 4: Write `lib/reviewOrder.ts`**

```ts
import type { CaptureState, ReportEntry } from '../../../types';
import { isMarked, type Marks } from './marks';
import type { ReportModel, Story } from './model';

export type ListMode = 'area' | 'change';
export type Item = { kind: 'overview' } | { kind: 'story'; id: string } | { kind: 'group'; key: string };
export type Filters = { states: ReadonlySet<CaptureState>; search: string; hideReviewed: boolean };

export type BarActions = {
    start: { item: Item; started: boolean } | null;
    mark: 'looks-right' | 'undo' | null;
    approve: 'link' | 'blocked' | null;
};

export const OVERVIEW: Item = { kind: 'overview' };

const storyItem = (story: Story): Item => ({ kind: 'story', id: story.id });

export function entryMatches(entry: ReportEntry, filters: Filters, marks: Marks): boolean {
    if (filters.states.size > 0 && !filters.states.has(entry.state)) return false;
    if (filters.hideReviewed && isMarked(marks, entry)) return false;
    const query = filters.search.trim().toLowerCase();
    return !query || `${entry.title} ${entry.name}`.toLowerCase().includes(query);
}

export const shownStories = (model: ReportModel, filters: Filters, marks: Marks) =>
    model.stories.filter((story) => story.entries.some((entry) => entryMatches(entry, filters, marks)));

export const shownGroups = (model: ReportModel, filters: Filters, marks: Marks) =>
    model.groups.filter((group) => group.entries.some((entry) => entryMatches(entry, filters, marks)));

export const storiesOnTheirOwn = (model: ReportModel, filters: Filters, marks: Marks) =>
    model.stories.filter((story) => story.entries.some((entry) => entryMatches(entry, filters, marks) && !model.groupByKey.has(entry.changeKey ?? '')));

// What next and previous walk through, in the order the list shows it.
export function reviewQueue(model: ReportModel, mode: ListMode, filters: Filters, marks: Marks): Item[] {
    if (mode === 'area') return shownStories(model, filters, marks).map(storyItem);
    const groups = shownGroups(model, filters, marks).map((group): Item => ({ kind: 'group', key: group.key }));
    return [...groups, ...storiesOnTheirOwn(model, filters, marks).map(storyItem)];
}

export function sameItem(a: Item, b: Item): boolean {
    if (a.kind === 'story' && b.kind === 'story') return a.id === b.id;
    if (a.kind === 'group' && b.kind === 'group') return a.key === b.key;
    return a.kind === b.kind;
}

export const currentIndex = (queue: Item[], item: Item) => queue.findIndex((candidate) => sameItem(candidate, item));

export function itemEntries(model: ReportModel, item: Item): ReportEntry[] {
    if (item.kind === 'story') return model.storyById.get(item.id)?.entries ?? [];
    if (item.kind === 'group') return model.groupByKey.get(item.key)?.entries ?? [];
    return [];
}

// A failed capture has nothing to look at, so it can't be marked. It has to be fixed.
export const reviewable = (entries: ReportEntry[]) => entries.filter((entry) => entry.state !== 'failed');

export function allReviewed(entries: ReportEntry[], marks: Marks): boolean {
    const list = reviewable(entries);
    return list.length > 0 && list.every((entry) => isMarked(marks, entry));
}

export function reviewProgress({ manifest }: ReportModel, marks: Marks) {
    const list = reviewable(manifest.entries);
    return { done: list.filter((entry) => isMarked(marks, entry)).length, total: list.length };
}

export function firstOpenItem(model: ReportModel, queue: Item[], marks: Marks): Item | null {
    const open = queue.find((item) => {
        const entries = itemEntries(model, item);
        return reviewable(entries).length > 0 && !allReviewed(entries, marks);
    });
    return open ?? queue[0] ?? null;
}

function approveAction({ manifest }: ReportModel, marks: Marks): BarActions['approve'] {
    const list = reviewable(manifest.entries);
    if (manifest.entries.length === 0 || !list.every((entry) => isMarked(marks, entry))) return null;
    if (list.length < manifest.entries.length) return 'blocked';
    return manifest.pull ? 'link' : null;
}

// What the bottom bar offers. Approving from the page (KAN-159) would change this.
export function barActions(model: ReportModel, item: Item, queue: Item[], marks: Marks): BarActions {
    const approve = approveAction(model, marks);
    if (item.kind === 'overview') {
        const first = approve === null ? firstOpenItem(model, queue, marks) : null;
        const { done } = reviewProgress(model, marks);
        return { start: first && { item: first, started: done > 0 }, mark: null, approve };
    }
    const entries = reviewable(itemEntries(model, item));
    if (entries.length === 0) return { start: null, mark: null, approve };
    return { start: null, mark: allReviewed(entries, marks) ? 'undo' : 'looks-right', approve };
}
```

Note: when everything is reviewed on a local run, `approve` is `null`, so the Overview offers "Continue review" to the first item. That's harmless and keeps the logic simple.

- [ ] **Step 5: Write `lib/addresses.ts`**

```ts
import type { ReportModel } from './model';
import { type Item, OVERVIEW } from './reviewOrder';

const GROUP_PREFIX = 'group-';

export function hashOf(item: Item): string {
    if (item.kind === 'story') return item.id;
    if (item.kind === 'group') return `${GROUP_PREFIX}${item.key}`;
    return 'overview';
}

function decoded(hash: string): string {
    const name = hash.replace(/^#/, '');
    try {
        return decodeURIComponent(name);
    } catch {
        return name;
    }
}

// An address that matches nothing opens the Overview.
export function itemFromHash(hash: string, model: ReportModel): Item {
    const name = decoded(hash);
    if (model.storyById.has(name)) return { kind: 'story', id: name };
    const key = name.startsWith(GROUP_PREFIX) ? name.slice(GROUP_PREFIX.length) : '';
    if (model.groupByKey.has(key)) return { kind: 'group', key };
    return OVERVIEW;
}

export function goToItem(item: Item) {
    window.location.hash = hashOf(item);
}
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run scripts/visual/report/src/lib`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add scripts/visual/report/src/lib/marks.ts scripts/visual/report/src/lib/marks.test.ts scripts/visual/report/src/lib/reviewOrder.ts scripts/visual/report/src/lib/reviewOrder.test.ts scripts/visual/report/src/lib/addresses.ts scripts/visual/report/src/lib/addresses.test.ts
git commit -m "KAN-158: add review marks, review order and addresses"
```

---

## Task 6: View state, shortcuts and Overview numbers

**Files:**
- Create: `scripts/visual/report/src/lib/viewState.ts`, `shortcuts.ts`, `overview.ts`
- Test: `viewState.test.ts`, `shortcuts.test.ts`, `overview.test.ts` in the same folder

- [ ] **Step 1: Write the failing tests**

Create `scripts/visual/report/src/lib/viewState.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { colorGroup, groupedEntries, sampleEntries, testEntry, testManifest } from '../testing/fixture';
import { buildModel } from './model';
import { type Item, OVERVIEW } from './reviewOrder';
import { currentEntry, initialView, nextCapture, revealItem, stepTarget, toggled } from './viewState';

const model = buildModel(testManifest(groupedEntries, { groups: [colorGroup] }));
const story = (id: string): Item => ({ kind: 'story', id });

describe('revealItem', () => {
    it('opens the rows around a story', () => {
        const view = revealItem(initialView(model, OVERVIEW), model, story('feed-postcard--default'));
        expect(view.expanded.has('Feed')).toBe(true);
        expect(view.expanded.has('Feed/PostCard')).toBe(true);
    });

    it('switches to the list that holds a group', () => {
        expect(revealItem(initialView(model, OVERVIEW), model, { kind: 'group', key: 'color-1' }).mode).toBe('change');
    });

    it('closes the drawer and remembers the item', () => {
        const item = story('ui-badge--old');
        const view = revealItem({ ...initialView(model, OVERVIEW), drawerOpen: true }, model, item);
        expect(view.drawerOpen).toBe(false);
        expect(view.revealed).toBe(item);
    });
});

describe('initialView', () => {
    it('starts by area with the first capture chosen', () => {
        expect(initialView(model, OVERVIEW)).toMatchObject({ mode: 'area', compare: 'side', zoom: 'fit', slider: 50, capture: { locale: 'en', width: 'mobile' } });
    });

    it('reveals a story opened from a link', () => {
        expect(initialView(model, story('ui-badge--old')).expanded.has('UI')).toBe(true);
    });
});

describe('toggled', () => {
    it('adds and removes without changing the original', () => {
        const start = new Set(['a']);
        expect([...toggled(start, 'b')]).toEqual(['a', 'b']);
        expect([...toggled(start, 'a')]).toEqual([]);
        expect([...start]).toEqual(['a']);
    });
});

describe('nextCapture', () => {
    const postCard = buildModel(testManifest(sampleEntries)).storyById.get('feed-postcard--default')!;

    it('moves to the next capture and wraps', () => {
        expect(nextCapture(postCard, { locale: 'en', width: 'mobile' })).toEqual({ locale: 'en', width: 'desktop' });
        expect(nextCapture(postCard, { locale: 'en', width: 'desktop' })).toEqual({ locale: 'en', width: 'mobile' });
    });
});

describe('stepTarget', () => {
    const queue = [story('a'), story('b')];

    it('moves within the queue', () => {
        expect(stepTarget(queue, 0, 1)).toEqual(story('b'));
        expect(stepTarget(queue, 1, -1)).toEqual(story('a'));
    });

    it('stops at the ends', () => {
        expect(stepTarget(queue, 1, 1)).toBeNull();
        expect(stepTarget(queue, 0, -1)).toBeNull();
    });

    it('enters the queue from outside it', () => {
        expect(stepTarget(queue, -1, 1)).toEqual(story('a'));
        expect(stepTarget(queue, -1, -1)).toEqual(story('b'));
    });

    it('has nowhere to go in an empty queue', () => {
        expect(stepTarget([], -1, 1)).toBeNull();
    });
});

describe('currentEntry', () => {
    const view = initialView(model, OVERVIEW);

    it('has none on the Overview', () => {
        expect(currentEntry(model, OVERVIEW, view)).toBeNull();
    });

    it('uses the chosen capture on a story', () => {
        const chosen = { ...view, capture: { locale: 'en' as const, width: 'desktop' as const } };
        expect(currentEntry(model, story('feed-postcard--default'), chosen)?.width).toBe('desktop');
    });

    it('starts a group on its biggest change', () => {
        expect(currentEntry(model, { kind: 'group', key: 'color-1' }, view)?.percent).toBe(3.67);
    });

    it('shows the capture picked in a group', () => {
        const id = testEntry('feed-composer--default--en--mobile').id;
        const picked = { ...view, groupEntry: new Map([['color-1', id]]) };
        expect(currentEntry(model, { kind: 'group', key: 'color-1' }, picked)?.id).toBe(id);
    });
});
```

Create `scripts/visual/report/src/lib/shortcuts.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { shortcutFor } from './shortcuts';

describe('shortcutFor', () => {
    it.each([
        [{ code: 'ArrowRight', key: 'ArrowRight' }, 'next'],
        [{ code: 'ArrowLeft', key: 'ArrowLeft' }, 'previous'],
        [{ code: 'KeyR', key: 'r' }, 'mark'],
        [{ code: 'KeyC', key: 'c' }, 'capture'],
        [{ code: 'Digit1', key: '1' }, 'side'],
        [{ code: 'Digit2', key: '2' }, 'slider'],
        [{ code: 'Digit3', key: '3' }, 'diff'],
        [{ code: 'KeyZ', key: 'z' }, 'zoom'],
        [{ code: 'KeyG', key: 'g' }, 'mode'],
        [{ code: 'Slash', key: '/' }, 'find'],
        [{ code: 'Slash', key: '?' }, 'help'],
    ])('maps %o', (event, shortcut) => {
        expect(shortcutFor(event)).toBe(shortcut);
    });

    it('matches letters by position on a Greek keyboard', () => {
        expect(shortcutFor({ code: 'KeyR', key: 'ρ' })).toBe('mark');
        expect(shortcutFor({ code: 'KeyC', key: 'ψ' })).toBe('capture');
        expect(shortcutFor({ code: 'KeyZ', key: 'ζ' })).toBe('zoom');
        expect(shortcutFor({ code: 'KeyG', key: 'γ' })).toBe('mode');
    });

    it('ignores other keys', () => {
        expect(shortcutFor({ code: 'KeyQ', key: 'q' })).toBeNull();
        expect(shortcutFor({ code: 'Enter', key: 'Enter' })).toBeNull();
    });
});
```

Create `scripts/visual/report/src/lib/overview.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { failedEntry, sampleEntries, testManifest } from '../testing/fixture';
import { withMarks } from './marks';
import { buildModel } from './model';
import { areaRows, biggestChanges, failedStories } from './overview';

const model = buildModel(testManifest([...sampleEntries, failedEntry]));

describe('overview', () => {
    it('counts each area', () => {
        const [feed, ui] = areaRows(model, withMarks(new Map(), [sampleEntries[0]]));
        expect(feed).toMatchObject({ area: 'Feed', firstStory: 'feed-composer--default', reviewed: 1, total: 3 });
        expect(feed.counts).toEqual({ failed: 0, changed: 3, new: 0, removed: 0 });
        expect(ui).toMatchObject({ area: 'UI', reviewed: 0, total: 2 });
        expect(ui.counts).toEqual({ failed: 1, changed: 0, new: 1, removed: 1 });
    });

    it('lists failed stories', () => {
        expect(failedStories(model).map((story) => story.id)).toEqual(['ui-card--broken']);
    });

    it('lists the biggest changes, one per story, largest first', () => {
        const big = biggestChanges(model);
        expect(big.map(({ story, entry }) => [story.id, entry.percent])).toEqual([
            ['feed-postcard--default', 3.67],
            ['feed-composer--default', 2],
        ]);
    });

    it('stops at the limit', () => {
        expect(biggestChanges(model, 1)).toHaveLength(1);
    });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run scripts/visual/report/src/lib`
Expected: FAIL, it can't find `./viewState`, `./shortcuts` and `./overview`.

- [ ] **Step 3: Write `lib/viewState.ts`**

```ts
import type { CaptureState, ReportEntry } from '../../../types';
import { type CaptureChoice, capturesInOrder } from './captures';
import { type ReportModel, type Story, storyCapture } from './model';
import type { Item, ListMode } from './reviewOrder';

export type CompareMode = 'side' | 'slider' | 'diff';
export type ZoomMode = 'fit' | 'full';

export type ViewState = {
    revealed: Item;
    mode: ListMode;
    states: ReadonlySet<CaptureState>;
    search: string;
    hideReviewed: boolean;
    compare: CompareMode;
    zoom: ZoomMode;
    slider: number;
    capture: CaptureChoice;
    groupEntry: ReadonlyMap<string, string>;
    allThumbs: ReadonlySet<string>;
    expanded: ReadonlySet<string>;
    helpOpen: boolean;
    drawerOpen: boolean;
};

export function toggled<T>(set: ReadonlySet<T>, value: T): ReadonlySet<T> {
    const next = new Set(set);
    if (!next.delete(value)) next.add(value);
    return next;
}

// The list follows the item, whether it came from a click, a link or the back button.
export function revealItem(view: ViewState, model: ReportModel, item: Item): ViewState {
    const next = { ...view, revealed: item, drawerOpen: false };
    if (item.kind === 'group') return { ...next, mode: 'change' };
    const story = item.kind === 'story' ? model.storyById.get(item.id) : undefined;
    if (!story) return next;
    return { ...next, expanded: new Set([...view.expanded, story.area, `${story.area}/${story.component}`]) };
}

export function initialView(model: ReportModel, item: Item): ViewState {
    const start: ViewState = {
        revealed: item,
        mode: 'area',
        states: new Set(),
        search: '',
        hideReviewed: false,
        compare: 'side',
        zoom: 'fit',
        slider: 50,
        capture: { locale: 'en', width: 'mobile' },
        groupEntry: new Map(),
        allThumbs: new Set(),
        expanded: new Set(),
        helpOpen: false,
        drawerOpen: false,
    };
    return revealItem(start, model, item);
}

export function currentEntry(model: ReportModel, item: Item, { capture, groupEntry }: Pick<ViewState, 'capture' | 'groupEntry'>): ReportEntry | null {
    if (item.kind === 'story') {
        const story = model.storyById.get(item.id);
        return story ? storyCapture(story, capture) : null;
    }
    if (item.kind === 'group') {
        const entries = model.groupByKey.get(item.key)?.entries ?? [];
        return entries.find((entry) => entry.id === groupEntry.get(item.key)) ?? entries[0] ?? null;
    }
    return null;
}

export function nextCapture(story: Story, choice: CaptureChoice): CaptureChoice {
    const list = capturesInOrder(story.entries);
    const { locale, width } = list[(list.indexOf(storyCapture(story, choice)) + 1) % list.length];
    return { locale, width };
}

export function stepTarget(queue: Item[], index: number, delta: 1 | -1): Item | null {
    const target = index === -1 ? (delta > 0 ? 0 : queue.length - 1) : index + delta;
    return queue[target] ?? null;
}
```

- [ ] **Step 4: Write `lib/shortcuts.ts`**

```ts
export type Shortcut = 'next' | 'previous' | 'mark' | 'capture' | 'side' | 'slider' | 'diff' | 'zoom' | 'mode' | 'find' | 'help';

const KEYS = new Map<string, Shortcut>([
    ['ArrowRight', 'next'],
    ['ArrowLeft', 'previous'],
    ['r', 'mark'],
    ['c', 'capture'],
    ['1', 'side'],
    ['2', 'slider'],
    ['3', 'diff'],
    ['z', 'zoom'],
    ['g', 'mode'],
    ['/', 'find'],
    ['?', 'help'],
]);

// Letters go by key position, so the shortcuts also work on a Greek keyboard.
export function shortcutFor({ code, key }: Pick<KeyboardEvent, 'code' | 'key'>): Shortcut | null {
    const name = /^Key[A-Z]$/.test(code) ? code.slice(3).toLowerCase() : key;
    return KEYS.get(name) ?? null;
}
```

- [ ] **Step 5: Write `lib/overview.ts`**

```ts
import type { CaptureState, ReportEntry } from '../../../types';
import { capturesInOrder } from './captures';
import { isMarked, type Marks } from './marks';
import { type ReportModel, STATES, type Story } from './model';
import { reviewable } from './reviewOrder';

const BIGGEST_LIMIT = 8;

export type AreaRow = { area: string; firstStory: string; counts: Record<CaptureState, number>; reviewed: number; total: number };
export type BigChange = { story: Story; entry: ReportEntry };

function stateCounts(entries: ReportEntry[]): Record<CaptureState, number> {
    const counts = Object.fromEntries(STATES.map((state) => [state, 0])) as Record<CaptureState, number>;
    for (const entry of entries) counts[entry.state] += 1;
    return counts;
}

export function areaRows(model: ReportModel, marks: Marks): AreaRow[] {
    return [...new Set(model.stories.map((story) => story.area))].map((area) => {
        const stories = model.stories.filter((story) => story.area === area);
        const entries = stories.flatMap((story) => story.entries);
        const list = reviewable(entries);
        return {
            area,
            firstStory: stories[0].id,
            counts: stateCounts(entries),
            reviewed: list.filter((entry) => isMarked(marks, entry)).length,
            total: list.length,
        };
    });
}

export const failedStories = (model: ReportModel) => model.stories.filter((story) => story.entries.some((entry) => entry.state === 'failed'));

export function biggestChanges(model: ReportModel, limit = BIGGEST_LIMIT): BigChange[] {
    return model.stories
        .flatMap((story) => {
            const changed = capturesInOrder(story.entries).filter((entry) => entry.state === 'changed');
            if (changed.length === 0) return [];
            return [{ story, entry: changed.reduce((big, entry) => (entry.percent > big.percent ? entry : big)) }];
        })
        .sort((a, b) => b.entry.percent - a.entry.percent)
        .slice(0, limit);
}
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run scripts/visual/report/src/lib`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add scripts/visual/report/src/lib/viewState.ts scripts/visual/report/src/lib/viewState.test.ts scripts/visual/report/src/lib/shortcuts.ts scripts/visual/report/src/lib/shortcuts.test.ts scripts/visual/report/src/lib/overview.ts scripts/visual/report/src/lib/overview.test.ts
git commit -m "KAN-158: add view state, shortcuts and Overview numbers"
```

---

## Task 7: Hooks

These are tested through the page in Task 10. Here they only need to type check.

**Files:**
- Create in `scripts/visual/report/src/hooks/`: `useManifest.ts`, `useReviewMarks.ts`, `useRoute.ts`, `useReportView.ts`, `useKeyboardShortcuts.ts`, `usePreloadNext.ts`, `useScrollToCurrentRow.ts`, `useSyncedScroll.ts`

- [ ] **Step 1: Write `useManifest.ts`**

```ts
import { useEffect, useState } from 'react';

import { buildModel, type ReportManifest, type ReportModel } from '../lib/model';

type ManifestState = { status: 'loading' } | { status: 'failed' } | { status: 'ready'; model: ReportModel };

export function useManifest(): ManifestState {
    const [state, setState] = useState<ManifestState>({ status: 'loading' });

    useEffect(() => {
        let cancelled = false;
        fetch('manifest.json')
            .then((response) => {
                if (!response.ok) throw new Error(`Manifest returned ${response.status}`);
                return response.json() as Promise<ReportManifest>;
            })
            .then((manifest) => {
                if (!cancelled) setState({ status: 'ready', model: buildModel(manifest) });
            })
            .catch(() => {
                if (!cancelled) setState({ status: 'failed' });
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return state;
}
```

- [ ] **Step 2: Write `useReviewMarks.ts`**

```ts
import { useState } from 'react';

import type { ReportEntry } from '../../../types';
import { type Marks, marksKey, readMarks, withMarks, withoutMarks, writeMarks } from '../lib/marks';
import type { ReportModel } from '../lib/model';

export type Review = { marks: Marks; mark: (entries: ReportEntry[]) => void; unmark: (entries: ReportEntry[]) => void };

export function useReviewMarks(model: ReportModel): Review {
    const key = marksKey(model.manifest);
    const [marks, setMarks] = useState<Marks>(() => readMarks(key));

    function save(next: Marks) {
        setMarks(next);
        writeMarks(key, next);
    }

    return {
        marks,
        mark: (entries) => save(withMarks(marks, entries)),
        unmark: (entries) => save(withoutMarks(marks, entries)),
    };
}
```

- [ ] **Step 3: Write `useRoute.ts`**

```ts
import { useMemo, useSyncExternalStore } from 'react';

import { goToItem, itemFromHash } from '../lib/addresses';
import type { ReportModel } from '../lib/model';
import type { Item } from '../lib/reviewOrder';

export type Route = { item: Item; go: (item: Item) => void };

function subscribe(onChange: () => void) {
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
}

const readHash = () => window.location.hash;

// The address holds the current item, so links and the back button just work.
export function useRoute(model: ReportModel): Route {
    const hash = useSyncExternalStore(subscribe, readHash);
    const item = useMemo(() => itemFromHash(hash, model), [hash, model]);
    return { item, go: goToItem };
}
```

- [ ] **Step 4: Write `useReportView.ts`**

```ts
import { useState } from 'react';

import type { CaptureState } from '../../../types';
import type { CaptureChoice } from '../lib/captures';
import type { ReportModel } from '../lib/model';
import { allReviewed, currentIndex, type Item, itemEntries, type ListMode, reviewable, reviewQueue } from '../lib/reviewOrder';
import { type CompareMode, currentEntry, initialView, nextCapture, revealItem, stepTarget, toggled, type ViewState, type ZoomMode } from '../lib/viewState';
import type { Review } from './useReviewMarks';
import type { Route } from './useRoute';

export type ReportView = ReturnType<typeof useReportView>;

export function useReportView(model: ReportModel, route: Route, { marks, mark, unmark }: Review) {
    const { item } = route;
    const [stored, setView] = useState(() => initialView(model, item));

    // A link or the back button can change the item, so the list catches up here.
    const view = stored.revealed === item ? stored : revealItem(stored, model, item);
    if (view !== stored) setView(view);

    const filters = { states: view.states, search: view.search, hideReviewed: view.hideReviewed };
    const queue = reviewQueue(model, view.mode, filters, marks);
    const index = currentIndex(queue, item);
    const entry = currentEntry(model, item, view);

    function patch(change: Partial<ViewState>) {
        setView((previous) => ({ ...previous, ...change }));
    }

    function go(target: Item) {
        patch({ drawerOpen: false });
        route.go(target);
    }

    function goInAreaList(target: Item) {
        patch({ mode: 'area' });
        go(target);
    }

    function step(delta: 1 | -1) {
        const target = stepTarget(queue, index, delta);
        if (target) go(target);
    }

    function markCurrent() {
        const entries = reviewable(itemEntries(model, item));
        if (entries.length === 0) return;
        if (allReviewed(entries, marks)) {
            unmark(entries);
            return;
        }
        // Worked out before marking, because Hide reviewed can take this item out of the list.
        const target = stepTarget(queue, index, 1);
        mark(entries);
        if (target) go(target);
    }

    function cycleCapture() {
        const story = item.kind === 'story' ? model.storyById.get(item.id) : undefined;
        if (story) patch({ capture: nextCapture(story, view.capture) });
    }

    return {
        ...view,
        item,
        filters,
        queue,
        index,
        entry,
        hasGroups: model.groups.length > 0,
        isRowOpen: (key: string) => view.expanded.has(key) || view.search.trim() !== '',

        go,
        goInAreaList,
        goNext: () => step(1),
        goPrevious: () => step(-1),
        markCurrent,
        cycleCapture,

        setMode: (mode: ListMode) => patch({ mode }),
        toggleMode: () => patch({ mode: view.mode === 'area' ? 'change' : 'area' }),
        toggleState: (state: CaptureState) => patch({ states: toggled(view.states, state) }),
        setSearch: (search: string) => patch({ search }),
        setHideReviewed: (hideReviewed: boolean) => patch({ hideReviewed }),
        toggleRow: (key: string) => patch({ expanded: toggled(view.expanded, key) }),

        setCompare: (compare: CompareMode) => patch({ compare }),
        setZoom: (zoom: ZoomMode) => patch({ zoom }),
        toggleZoom: () => patch({ zoom: view.zoom === 'fit' ? 'full' : 'fit' }),
        setSlider: (slider: number) => patch({ slider }),
        pickCapture: (capture: CaptureChoice) => patch({ capture }),
        pickGroupCapture: (key: string, id: string) => patch({ groupEntry: new Map(view.groupEntry).set(key, id) }),
        showAllThumbs: (key: string) => patch({ allThumbs: new Set(view.allThumbs).add(key) }),

        openHelp: () => patch({ helpOpen: true }),
        closeHelp: () => patch({ helpOpen: false }),
        toggleHelp: () => patch({ helpOpen: !view.helpOpen }),
        openDrawer: () => patch({ drawerOpen: true }),
        closeDrawer: () => patch({ drawerOpen: false }),
        closeOverlays: () => patch({ helpOpen: false, drawerOpen: false }),
    };
}
```

- [ ] **Step 5: Write `useKeyboardShortcuts.ts`**

```ts
import { useEffect } from 'react';

import { type Shortcut, shortcutFor } from '../lib/shortcuts';
import type { ReportView } from './useReportView';

export const SEARCH_INPUT_ID = 'story-search';

function run(shortcut: Shortcut, view: ReportView) {
    const canCompare = view.entry?.state === 'changed';
    switch (shortcut) {
        case 'next':
            return view.goNext();
        case 'previous':
            return view.goPrevious();
        case 'mark':
            return view.markCurrent();
        case 'capture':
            return view.cycleCapture();
        case 'side':
        case 'slider':
        case 'diff':
            return canCompare ? view.setCompare(shortcut) : undefined;
        case 'zoom':
            return view.toggleZoom();
        case 'mode':
            return view.hasGroups ? view.toggleMode() : undefined;
        case 'find':
            return document.getElementById(SEARCH_INPUT_ID)?.focus();
        case 'help':
            return view.toggleHelp();
    }
}

export function useKeyboardShortcuts(view: ReportView) {
    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            const input = event.target instanceof HTMLInputElement ? event.target : null;
            const typing = input?.type === 'text';
            if (event.key === 'Escape') {
                view.closeOverlays();
                if (typing) input?.blur();
                return;
            }
            if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
            const shortcut = shortcutFor(event);
            if (!shortcut) return;
            // Arrow keys move the slider while it has focus.
            if (input?.type === 'range' && (shortcut === 'next' || shortcut === 'previous')) return;
            event.preventDefault();
            run(shortcut, view);
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    });
}
```

- [ ] **Step 6: Write the three small hooks**

`usePreloadNext.ts`:

```ts
import { useEffect } from 'react';

import type { ReportModel } from '../lib/model';
import { currentEntry } from '../lib/viewState';
import type { ReportView } from './useReportView';

// Loads the next item's images early, so moving through a review doesn't wait on them.
export function usePreloadNext(model: ReportModel, view: ReportView) {
    const next = view.queue[view.index + 1];
    const entry = next ? currentEntry(model, next, view) : null;
    const before = entry?.images.before;
    const after = entry?.images.after;

    useEffect(() => {
        for (const src of [before, after]) {
            if (src) new Image().src = src;
        }
    }, [before, after]);
}
```

`useScrollToCurrentRow.ts`:

```ts
import { useEffect, useRef } from 'react';

import type { Item, ListMode } from '../lib/reviewOrder';

export function useScrollToCurrentRow(item: Item, mode: ListMode) {
    const treeRef = useRef<HTMLElement>(null);

    useEffect(() => {
        treeRef.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
    }, [item, mode]);

    return treeRef;
}
```

`useSyncedScroll.ts`:

```ts
import { useRef } from 'react';

// At 100%, scrolling one image across scrolls the other too.
export function useSyncedScroll() {
    const firstRef = useRef<HTMLDivElement>(null);
    const secondRef = useRef<HTMLDivElement>(null);

    function handleFirstScroll() {
        if (firstRef.current && secondRef.current) secondRef.current.scrollLeft = firstRef.current.scrollLeft;
    }

    function handleSecondScroll() {
        if (firstRef.current && secondRef.current) firstRef.current.scrollLeft = secondRef.current.scrollLeft;
    }

    return { firstRef, secondRef, handleFirstScroll, handleSecondScroll };
}
```

- [ ] **Step 7: Add `.tsx` to the type check, and turn off the Next image rule**

In `tsconfig.json`, add `"scripts/**/*.tsx",` after `"scripts/**/*.ts",`.

In `eslint.config.mjs`, add this block right before the `prettierConfig` comment:

```js
    /*
     * The visual check's report page is a static page built by Vite, not a Next page.
     */
    {
        files: ['scripts/visual/report/src/**/*.tsx'],
        rules: { '@next/next/no-img-element': 'off' },
    },

```

- [ ] **Step 8: Check types and lint**

Run: `npx tsc --noEmit` and then `npx eslint scripts/visual/report/src`
Expected: no errors. If `react-hooks` complains about the `setView` call during render in `useReportView`, that is React's documented way of adjusting state from a changed input, so read the rule's message before changing it. If the rule genuinely rejects it, stop and report what it says.

- [ ] **Step 9: Commit**

```bash
git add scripts/visual/report/src/hooks tsconfig.json eslint.config.mjs
git commit -m "KAN-158: add the report page's hooks"
```

---

## Task 8: Compare components

**Files:**
- Create: `scripts/visual/report/src/components/Segment.tsx`
- Create in `scripts/visual/report/src/components/compare/`: `CaptureFigure.tsx`, `SingleImage.tsx`, `SideBySide.tsx`, `SliderView.tsx`, `FailedNotice.tsx`, `CompareView.tsx`, `CaptureTabs.tsx`, `ViewControls.tsx`
- Test: `scripts/visual/report/src/components/compare/CompareView.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { testEntry } from '../../testing/fixture';
import { CompareView } from './CompareView';

const entry = testEntry('a', { locale: 'el' });

function show(props: Partial<Parameters<typeof CompareView>[0]> = {}) {
    render(<CompareView entry={entry} compare="side" slider={50} onSlider={vi.fn()} {...props} />);
}

describe('CompareView', () => {
    afterEach(cleanup);

    it('shows before and after side by side, with real alt text', () => {
        show();
        expect(screen.getByRole('img', { name: 'Feed/PostCard, Default, Greek, mobile, before' })).toHaveAttribute('src', entry.images.before);
        expect(screen.getByRole('img', { name: 'Feed/PostCard, Default, Greek, mobile, after' })).toHaveAttribute('src', entry.images.after);
    });

    it('shows only the diff', () => {
        show({ compare: 'diff' });
        expect(screen.getAllByRole('img')).toHaveLength(1);
        expect(screen.getByRole('img', { name: /diff$/ })).toHaveAttribute('src', entry.images.diff);
    });

    it('moves the slider', () => {
        const onSlider = vi.fn();
        show({ compare: 'slider', onSlider });
        fireEvent.change(screen.getByRole('slider', { name: 'Move the divider between before and after' }), { target: { value: '20' } });
        expect(onSlider).toHaveBeenCalledWith(20);
    });

    it('shows only after for a new story', () => {
        show({ entry: testEntry('a', { state: 'new', images: { after: 'img/a.webp' } }), compare: 'slider' });
        expect(screen.getAllByRole('img')).toHaveLength(1);
        expect(screen.getByRole('img', { name: /after$/ })).toBeInTheDocument();
    });

    it('shows only before for a removed story', () => {
        show({ entry: testEntry('a', { state: 'removed', images: { before: 'img/a.webp' } }) });
        expect(screen.getAllByRole('img')).toHaveLength(1);
        expect(screen.getByRole('img', { name: /before$/ })).toBeInTheDocument();
    });

    it('shows the error of a failed story as text', () => {
        const error = '<img src=x onerror=alert(1)>';
        show({ entry: testEntry('a', { state: 'failed', error, images: {} }) });
        expect(screen.getByText('This story failed')).toBeInTheDocument();
        expect(screen.getByText(error)).toBeInTheDocument();
        expect(screen.getByText('Fix it before these changes can be approved.')).toBeInTheDocument();
        expect(document.querySelector('img')).toBeNull();
    });

    it('says when a failed story has no error message', () => {
        show({ entry: testEntry('a', { state: 'failed', error: null, images: {} }) });
        expect(screen.getByText('No error message.')).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run scripts/visual/report/src/components/compare`
Expected: FAIL, it can't find `./CompareView`.

- [ ] **Step 3: Write the components**

`components/Segment.tsx`:

```tsx
type SegmentOption<T extends string> = { value: T; label: string };

type SegmentButtonProps<T extends string> = { option: SegmentOption<T>; selected: boolean; disabled?: boolean; onPick: (value: T) => void };

function SegmentButton<T extends string>({ option, selected, disabled, onPick }: SegmentButtonProps<T>) {
    function handleClick() {
        onPick(option.value);
    }
    return (
        <button type="button" disabled={disabled} aria-pressed={selected} onClick={handleClick}>
            {option.label}
        </button>
    );
}

type SegmentProps<T extends string> = { label: string; options: SegmentOption<T>[]; value: T; disabled?: boolean; onPick: (value: T) => void };

export function Segment<T extends string>({ label, options, value, disabled, onPick }: SegmentProps<T>) {
    return (
        <div className="seg" role="group" aria-label={label}>
            {options.map((option) => (
                <SegmentButton key={option.value} option={option} selected={option.value === value} disabled={disabled} onPick={onPick} />
            ))}
        </div>
    );
}
```

`compare/CaptureFigure.tsx`:

```tsx
import type { Ref, UIEventHandler } from 'react';

import type { ReportEntry } from '../../../../types';
import { copy } from '../../copy';
import { altText } from '../../lib/labels';

export type ImageKind = 'before' | 'after' | 'diff';

const LABELS: Record<ImageKind, string> = { before: copy.before, after: copy.after, diff: copy.diff };

type CaptureFigureProps = { entry: ReportEntry; kind: ImageKind; frameRef?: Ref<HTMLDivElement>; onFrameScroll?: UIEventHandler<HTMLDivElement> };

export function CaptureFigure({ entry, kind, frameRef, onFrameScroll }: CaptureFigureProps) {
    const src = entry.images[kind];
    return (
        <figure className="fig">
            <figcaption>{LABELS[kind]}</figcaption>
            <div className="frame" ref={frameRef} onScroll={onFrameScroll}>
                {/* A new key removes the old image at once, so it never shows under the wrong caption. */}
                <img key={src} src={src} alt={altText(entry, LABELS[kind].toLowerCase())} decoding="async" />
            </div>
        </figure>
    );
}
```

`compare/SingleImage.tsx`:

```tsx
import type { ReportEntry } from '../../../../types';
import { CaptureFigure, type ImageKind } from './CaptureFigure';

export function SingleImage({ entry, kind }: { entry: ReportEntry; kind: ImageKind }) {
    return (
        <div className="compare single">
            <CaptureFigure entry={entry} kind={kind} />
        </div>
    );
}
```

`compare/SideBySide.tsx`:

```tsx
import type { ReportEntry } from '../../../../types';
import { useSyncedScroll } from '../../hooks/useSyncedScroll';
import { CaptureFigure } from './CaptureFigure';

export function SideBySide({ entry }: { entry: ReportEntry }) {
    const { firstRef, secondRef, handleFirstScroll, handleSecondScroll } = useSyncedScroll();
    return (
        <div className="compare">
            <CaptureFigure entry={entry} kind="before" frameRef={firstRef} onFrameScroll={handleFirstScroll} />
            <CaptureFigure entry={entry} kind="after" frameRef={secondRef} onFrameScroll={handleSecondScroll} />
        </div>
    );
}
```

`compare/SliderView.tsx`:

```tsx
import type { ChangeEvent, CSSProperties } from 'react';

import type { ReportEntry } from '../../../../types';
import { copy } from '../../copy';
import { altText } from '../../lib/labels';

type SliderViewProps = { entry: ReportEntry; position: number; onMove: (position: number) => void };

export function SliderView({ entry, position, onMove }: SliderViewProps) {
    function handleChange(event: ChangeEvent<HTMLInputElement>) {
        onMove(Number(event.target.value));
    }
    return (
        <div className="slider-wrap">
            <div className="slider" style={{ '--pos': `${position}%` } as CSSProperties}>
                {/* Images */}
                <img key={entry.images.after} src={entry.images.after} alt={altText(entry, copy.after.toLowerCase())} decoding="async" />
                <img key={entry.images.before} className="upper" src={entry.images.before} alt={altText(entry, copy.before.toLowerCase())} decoding="async" />

                {/* Divider */}
                <span className="slider-tag slider-tag-before">{copy.before}</span>
                <span className="slider-tag slider-tag-after">{copy.after}</span>
                <span className="line" />
                <input type="range" min={0} max={100} value={position} aria-label={copy.moveDivider} onChange={handleChange} />
            </div>
        </div>
    );
}
```

`compare/FailedNotice.tsx`:

```tsx
import { copy } from '../../copy';

export function FailedNotice({ error }: { error: string | null }) {
    return (
        <div className="error">
            <b>{copy.storyFailed}</b>
            <pre>{error ?? copy.noErrorMessage}</pre>
            <span>{copy.fixBeforeApproval}</span>
        </div>
    );
}
```

`compare/CompareView.tsx`:

```tsx
import type { ReportEntry } from '../../../../types';
import type { CompareMode } from '../../lib/viewState';
import { FailedNotice } from './FailedNotice';
import { SideBySide } from './SideBySide';
import { SingleImage } from './SingleImage';
import { SliderView } from './SliderView';

type CompareViewProps = { entry: ReportEntry; compare: CompareMode; slider: number; onSlider: (position: number) => void };

export function CompareView({ entry, compare, slider, onSlider }: CompareViewProps) {
    if (entry.state === 'failed') return <FailedNotice error={entry.error} />;
    if (entry.state === 'new') return <SingleImage entry={entry} kind="after" />;
    if (entry.state === 'removed') return <SingleImage entry={entry} kind="before" />;
    if (compare === 'slider') return <SliderView entry={entry} position={slider} onMove={onSlider} />;
    if (compare === 'diff') return <SingleImage entry={entry} kind="diff" />;
    return <SideBySide entry={entry} />;
}
```

`compare/CaptureTabs.tsx`:

```tsx
import type { ReportEntry } from '../../../../types';
import { copy } from '../../copy';
import { CAPTURE_ORDER, type CaptureChoice } from '../../lib/captures';
import { captureLabel, entryValue } from '../../lib/labels';
import type { Story } from '../../lib/model';

type CaptureTabProps = { choice: CaptureChoice; story: Story; current: ReportEntry; onPick: (choice: CaptureChoice) => void };

function CaptureTab({ choice, story, current, onPick }: CaptureTabProps) {
    const match = story.entries.find((entry) => entry.locale === choice.locale && entry.width === choice.width);
    function handleClick() {
        onPick(choice);
    }
    return (
        <button type="button" className="tab" disabled={!match} aria-pressed={match === current} onClick={handleClick}>
            {captureLabel(choice)}
            <span className="value">{match ? entryValue(match) : copy.noChange}</span>
        </button>
    );
}

type CaptureTabsProps = { story: Story; current: ReportEntry; onPick: (choice: CaptureChoice) => void };

export function CaptureTabs({ story, current, onPick }: CaptureTabsProps) {
    return (
        <div className="tabs" role="group" aria-label={copy.languageAndWidth}>
            {CAPTURE_ORDER.map((choice) => (
                <CaptureTab key={captureLabel(choice)} choice={choice} story={story} current={current} onPick={onPick} />
            ))}
        </div>
    );
}
```

`compare/ViewControls.tsx`:

```tsx
import type { ReportEntry } from '../../../../types';
import { copy } from '../../copy';
import type { CompareMode, ZoomMode } from '../../lib/viewState';
import { Segment } from '../Segment';

const COMPARE_OPTIONS: { value: CompareMode; label: string }[] = [
    { value: 'side', label: copy.sideBySide },
    { value: 'slider', label: copy.slider },
    { value: 'diff', label: copy.diff },
];

const ZOOM_OPTIONS: { value: ZoomMode; label: string }[] = [
    { value: 'fit', label: copy.fit },
    { value: 'full', label: copy.fullSize },
];

type ViewControlsProps = {
    entry: ReportEntry;
    compare: CompareMode;
    zoom: ZoomMode;
    onCompare: (mode: CompareMode) => void;
    onZoom: (mode: ZoomMode) => void;
};

export function ViewControls({ entry, compare, zoom, onCompare, onZoom }: ViewControlsProps) {
    const canCompare = entry.state === 'changed';
    const canZoom = entry.state !== 'failed' && !(canCompare && compare === 'slider');
    return (
        <>
            <Segment label={copy.compare} options={COMPARE_OPTIONS} value={compare} disabled={!canCompare} onPick={onCompare} />
            <Segment label={copy.zoom} options={ZOOM_OPTIONS} value={zoom} disabled={!canZoom} onPick={onZoom} />
        </>
    );
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run scripts/visual/report/src/components/compare`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/visual/report/src/components
git commit -m "KAN-158: add the report page's compare views"
```

---

## Task 9: Sidebar

**Files:**
- Create: `scripts/visual/report/src/components/Swatches.tsx`
- Create in `scripts/visual/report/src/components/sidebar/`: `Sidebar.tsx`, `SidebarHeader.tsx`, `SidebarFilters.tsx`, `TreeRows.tsx`, `AreaTree.tsx`, `SameChangeList.tsx`

Tested through the page in Task 10.

- [ ] **Step 1: Write the components**

`components/Swatches.tsx`:

```tsx
import type { CSSProperties } from 'react';

type SwatchesProps = { from?: string; to?: string };

// Colors are checked as #rrggbb before a report is published.
export function Swatches({ from, to }: SwatchesProps) {
    if (!from || !to) return null;
    const fromStyle: CSSProperties = { background: from };
    const toStyle: CSSProperties = { background: to };
    return (
        <span className="swatches">
            <span className="swatch" style={fromStyle} />→<span className="swatch" style={toStyle} />
        </span>
    );
}
```

`sidebar/SidebarHeader.tsx`:

```tsx
import { copy } from '../../copy';
import type { Marks } from '../../lib/marks';
import type { ReportModel } from '../../lib/model';
import { reviewProgress } from '../../lib/reviewOrder';

type SidebarHeaderProps = { model: ReportModel; marks: Marks };

export function SidebarHeader({ model, marks }: SidebarHeaderProps) {
    const { pull, headSha } = model.manifest;
    const { done, total } = reviewProgress(model, marks);
    return (
        <>
            {/* Identity */}
            <div className="brand">
                <b>{copy.title}</b>
                {pull && (
                    <a className="mono" href={pull.url} target="_blank" rel="noreferrer">
                        {copy.pull(pull.number)}
                    </a>
                )}
                <span className="mono">{headSha.slice(0, 7)}</span>
            </div>

            {/* Progress */}
            <div className="progress">
                <span>
                    <span className="mono">{copy.position(done, total)}</span> {copy.capturesReviewed(total)}
                </span>
                <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
                </div>
            </div>
        </>
    );
}
```

`sidebar/SidebarFilters.tsx`:

```tsx
import type { ChangeEvent } from 'react';

import type { CaptureState } from '../../../../types';
import { copy } from '../../copy';
import { SEARCH_INPUT_ID } from '../../hooks/useKeyboardShortcuts';
import type { ReportView } from '../../hooks/useReportView';
import { type ReportModel, STATES } from '../../lib/model';
import type { ListMode } from '../../lib/reviewOrder';
import { Segment } from '../Segment';

const MODE_OPTIONS: { value: ListMode; label: string }[] = [
    { value: 'area', label: copy.byArea },
    { value: 'change', label: copy.sameChange },
];

type StateChipProps = { state: CaptureState; count: number; pressed: boolean; onToggle: (state: CaptureState) => void };

function StateChip({ state, count, pressed, onToggle }: StateChipProps) {
    function handleClick() {
        onToggle(state);
    }
    return (
        <button type="button" className={`chip s-${state}`} disabled={count === 0} aria-pressed={pressed} onClick={handleClick}>
            <span className="dot" />
            {copy.states[state]}
            <b>{count}</b>
        </button>
    );
}

type SidebarFiltersProps = { model: ReportModel; view: ReportView };

export function SidebarFilters({ model, view }: SidebarFiltersProps) {
    function handleSearch(event: ChangeEvent<HTMLInputElement>) {
        view.setSearch(event.target.value);
    }
    function handleHideReviewed(event: ChangeEvent<HTMLInputElement>) {
        view.setHideReviewed(event.target.checked);
    }
    return (
        <>
            {/* State filters */}
            <div className="chips" role="group" aria-label={copy.filterByState}>
                {STATES.map((state) => (
                    <StateChip key={state} state={state} count={model.manifest.counts[state]} pressed={view.states.has(state)} onToggle={view.toggleState} />
                ))}
            </div>

            {/* Search */}
            <label className="search">
                <input
                    id={SEARCH_INPUT_ID}
                    type="text"
                    placeholder={copy.findStory}
                    aria-label={copy.findStory}
                    autoComplete="off"
                    value={view.search}
                    onChange={handleSearch}
                />
                <kbd className="keys">/</kbd>
            </label>

            {/* List tools */}
            <div className="side-tools">
                {view.hasGroups && <Segment label={copy.organizeList} options={MODE_OPTIONS} value={view.mode} onPick={view.setMode} />}
                <label className="check">
                    <input type="checkbox" checked={view.hideReviewed} onChange={handleHideReviewed} />
                    {copy.hideReviewed}
                </label>
            </div>
        </>
    );
}
```

`sidebar/TreeRows.tsx`:

```tsx
import { copy } from '../../copy';
import type { ReportView } from '../../hooks/useReportView';
import { percentText } from '../../lib/labels';
import type { Marks } from '../../lib/marks';
import { type Group, largestPercent, type Story, worstState } from '../../lib/model';
import { allReviewed, type Item, OVERVIEW, sameItem } from '../../lib/reviewOrder';
import { Swatches } from '../Swatches';

const currentFlag = (view: ReportView, item: Item) => (sameItem(view.item, item) ? 'true' : undefined);

function Tick({ done }: { done: boolean }) {
    return (
        <span className="tick" aria-label={done ? copy.reviewed : undefined}>
            {done ? '✓' : ''}
        </span>
    );
}

export function OverviewRow({ view }: { view: ReportView }) {
    function handleClick() {
        view.go(OVERVIEW);
    }
    return (
        <button type="button" className="row row-area row-overview" aria-current={currentFlag(view, OVERVIEW)} onClick={handleClick}>
            <span className="name">{copy.overview}</span>
        </button>
    );
}

type StoryRowProps = { story: Story; label: string; nested: boolean; view: ReportView; marks: Marks };

export function StoryRow({ story, label, nested, view, marks }: StoryRowProps) {
    const item: Item = { kind: 'story', id: story.id };
    const done = allReviewed(story.entries, marks);
    const percent = largestPercent(story);
    function handleClick() {
        view.go(item);
    }
    return (
        <button
            type="button"
            className={`row${nested ? ' row-story' : ''}${done ? ' is-done' : ''}`}
            aria-current={currentFlag(view, item)}
            onClick={handleClick}
        >
            <span className={`dot s-${worstState(story.entries)}`} />
            <span className="name" title={label}>
                {label}
            </span>
            {percent !== null && <span className="value">{percentText(percent)}</span>}
            <Tick done={done} />
        </button>
    );
}

type ToggleRowProps = { rowKey: string; label: string; count: number; className: string; view: ReportView };

export function ToggleRow({ rowKey, label, count, className, view }: ToggleRowProps) {
    function handleClick() {
        view.toggleRow(rowKey);
    }
    return (
        <button type="button" className={`row ${className}`} aria-expanded={view.isRowOpen(rowKey)} onClick={handleClick}>
            <span className="caret">›</span>
            <span className="name">{label}</span>
            <span className="value">{count}</span>
        </button>
    );
}

type GroupRowProps = { group: Group; view: ReportView; marks: Marks };

export function GroupRow({ group, view, marks }: GroupRowProps) {
    const item: Item = { kind: 'group', key: group.key };
    const done = allReviewed(group.entries, marks);
    function handleClick() {
        view.go(item);
    }
    return (
        <button type="button" className={`row${done ? ' is-done' : ''}`} aria-current={currentFlag(view, item)} onClick={handleClick}>
            <Swatches from={group.from} to={group.to} />
            <span className="name" title={group.label}>
                {group.label}
            </span>
            <span className="value">{group.entries.length}</span>
            <Tick done={done} />
        </button>
    );
}
```

`sidebar/AreaTree.tsx`:

```tsx
import type { ReportView } from '../../hooks/useReportView';
import type { Marks } from '../../lib/marks';
import { areaTree, type ReportModel } from '../../lib/model';
import { shownStories } from '../../lib/reviewOrder';
import { StoryRow, ToggleRow } from './TreeRows';

type AreaTreeProps = { model: ReportModel; view: ReportView; marks: Marks };

export function AreaTree({ model, view, marks }: AreaTreeProps) {
    const branches = areaTree(shownStories(model, view.filters, marks));
    return (
        <>
            {branches.map((branch) => (
                <div key={branch.area}>
                    {/* Area */}
                    <ToggleRow rowKey={branch.area} label={branch.area} count={branch.count} className="row-area" view={view} />
                    {view.isRowOpen(branch.area) &&
                        branch.components.map((component) => (
                            <div key={component.key}>
                                {/* Component */}
                                <ToggleRow rowKey={component.key} label={component.component} count={component.stories.length} className="row-component" view={view} />
                                {/* Stories */}
                                {view.isRowOpen(component.key) &&
                                    component.stories.map((story) => <StoryRow key={story.id} story={story} label={story.name} nested view={view} marks={marks} />)}
                            </div>
                        ))}
                </div>
            ))}
        </>
    );
}
```

`sidebar/SameChangeList.tsx`:

```tsx
import { copy } from '../../copy';
import type { ReportView } from '../../hooks/useReportView';
import type { Marks } from '../../lib/marks';
import type { ReportModel } from '../../lib/model';
import { shownGroups, storiesOnTheirOwn } from '../../lib/reviewOrder';
import { GroupRow, StoryRow } from './TreeRows';

type SameChangeListProps = { model: ReportModel; view: ReportView; marks: Marks };

export function SameChangeList({ model, view, marks }: SameChangeListProps) {
    const groups = shownGroups(model, view.filters, marks);
    const alone = storiesOnTheirOwn(model, view.filters, marks);
    return (
        <>
            {/* Groups */}
            {groups.length > 0 && <div className="tree-title">{copy.sameChange}</div>}
            {groups.map((group) => (
                <GroupRow key={group.key} group={group} view={view} marks={marks} />
            ))}

            {/* Stories with no group */}
            {alone.length > 0 && <div className="tree-title">{copy.onTheirOwn}</div>}
            {alone.map((story) => (
                <StoryRow key={story.id} story={story} label={`${story.component} / ${story.name}`} nested={false} view={view} marks={marks} />
            ))}
        </>
    );
}
```

`sidebar/Sidebar.tsx`:

```tsx
import { copy } from '../../copy';
import type { ReportView } from '../../hooks/useReportView';
import { useScrollToCurrentRow } from '../../hooks/useScrollToCurrentRow';
import type { Marks } from '../../lib/marks';
import type { ReportModel } from '../../lib/model';
import { AreaTree } from './AreaTree';
import { SameChangeList } from './SameChangeList';
import { SidebarFilters } from './SidebarFilters';
import { SidebarHeader } from './SidebarHeader';
import { OverviewRow } from './TreeRows';

type SidebarProps = { model: ReportModel; view: ReportView; marks: Marks };

export function Sidebar({ model, view, marks }: SidebarProps) {
    const treeRef = useScrollToCurrentRow(view.item, view.mode);
    return (
        <aside className={view.drawerOpen ? 'side open' : 'side'}>
            {/* Identity, progress and filters */}
            <div className="side-head">
                <SidebarHeader model={model} marks={marks} />
                <SidebarFilters model={model} view={view} />
            </div>

            {/* Story list */}
            <nav className="tree" aria-label={copy.stories} ref={treeRef}>
                <OverviewRow view={view} />
                {view.mode === 'area' ? <AreaTree model={model} view={view} marks={marks} /> : <SameChangeList model={model} view={view} marks={marks} />}
                {/* A report with no differences has nothing to filter, so it stays quiet. */}
                {view.queue.length === 0 && model.manifest.entries.length > 0 && <div className="tree-empty">{copy.nothingMatches}</div>}
            </nav>
        </aside>
    );
}
```

- [ ] **Step 2: Check types and lint**

Run: `npx tsc --noEmit` and then `npx eslint scripts/visual/report/src`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add scripts/visual/report/src/components
git commit -m "KAN-158: add the report page's sidebar"
```

---

## Task 10: Screens and the page

**Files:**
- Create in `scripts/visual/report/src/components/screens/`: `CaptureThumb.tsx`, `StoryScreen.tsx`, `GroupScreen.tsx`, `OverviewScreen.tsx`, `OverviewSections.tsx`, `BottomBar.tsx`, `TopBar.tsx`, `ShortcutsHelp.tsx`
- Create: `scripts/visual/report/src/components/ReportApp.tsx`
- Create: `scripts/visual/report/src/App.tsx`
- Test: `scripts/visual/report/src/App.test.tsx`

- [ ] **Step 1: Write the failing page tests**

Create `scripts/visual/report/src/App.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';
import type { ReportManifest } from './lib/model';
import { colorGroup, failedEntry, groupedEntries, sampleEntries, testEntry, testManifest } from './testing/fixture';

async function openReport(manifest: ReportManifest) {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => manifest })));
    render(<App />);
    await screen.findByRole('navigation', { name: 'Stories' });
}

const button = (name: string | RegExp) => screen.getByRole('button', { name });
const list = () => within(screen.getByRole('navigation', { name: 'Stories' }));
const progress = () => screen.getByText(/captures reviewed/);

describe('report page', () => {
    beforeEach(() => {
        window.location.hash = '';
        localStorage.clear();
        Element.prototype.scrollIntoView = vi.fn();
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    describe('loading', () => {
        it('shows a message while it loads', () => {
            vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)));
            render(<App />);
            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });

        it('explains a report that is gone', async () => {
            vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));
            render(<App />);
            expect(await screen.findByText('Could not load this report. It may have been deleted when the PR closed.')).toBeInTheDocument();
        });

        it('explains a report it cannot read', async () => {
            vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })));
            render(<App />);
            expect(await screen.findByText('Could not load this report. It may have been deleted when the PR closed.')).toBeInTheDocument();
        });
    });

    describe('hostile data', () => {
        it('renders names and errors as text', async () => {
            const name = '<img src=x onerror=alert(1)>';
            const error = '<script>alert(1)</script>';
            window.location.hash = '#hostile';
            await openReport(testManifest([testEntry('a', { storyId: 'hostile', name, state: 'failed', error, images: {} })]));
            expect(screen.getByRole('heading', { name })).toBeInTheDocument();
            expect(screen.getByText(error)).toBeInTheDocument();
            expect(document.querySelector('img[src="x"]')).toBeNull();
            expect(document.querySelector('main script')).toBeNull();
        });
    });

    describe('overview', () => {
        it('shows the totals and the counts per area', async () => {
            await openReport(testManifest(sampleEntries));
            expect(screen.getByRole('heading', { name: '5 of 1078 captures differ' })).toBeInTheDocument();
            const rows = within(screen.getByRole('table')).getAllByRole('row');
            expect(rows.map((row) => row.textContent)).toEqual(['AreaFailedChangedNewRemovedReviewed', 'Feed03000/3', 'UI00110/2']);
        });

        it('shows failed stories and components with no story', async () => {
            await openReport(testManifest([...sampleEntries, failedEntry], { missingStories: ['components/ui/NoStory.tsx'] }));
            expect(screen.getByRole('heading', { name: 'Failed' })).toBeInTheDocument();
            expect(screen.getByRole('heading', { name: 'Components with no story' })).toBeInTheDocument();
            expect(screen.getByText('components/ui/NoStory.tsx')).toBeInTheDocument();
        });

        it('opens the first story of an area from its row', async () => {
            await openReport(testManifest(sampleEntries));
            fireEvent.click(button('UI'));
            expect(await screen.findByText('UI / Badge')).toBeInTheDocument();
        });

        it('survives a report with no differences', async () => {
            await openReport(testManifest([]));
            expect(screen.getByRole('heading', { name: '0 of 1078 captures differ' })).toBeInTheDocument();
            expect(screen.getByText('0 to review')).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: 'Start review' })).not.toBeInTheDocument();
            expect(screen.queryByText('Nothing matches these filters.')).not.toBeInTheDocument();
        });
    });

    describe('reviewing', () => {
        it('moves through the review, and undoes a mark', async () => {
            await openReport(testManifest(sampleEntries));
            expect(progress()).toHaveTextContent('0 of 5 captures reviewed');

            fireEvent.click(button('Start review'));
            expect(await screen.findByText('Feed / Composer')).toBeInTheDocument();
            expect(screen.getByText('1 of 4')).toBeInTheDocument();

            fireEvent.click(button('Looks right'));
            expect(await screen.findByText('Feed / PostCard')).toBeInTheDocument();
            expect(progress()).toHaveTextContent('1 of 5 captures reviewed');

            fireEvent.click(button('← Previous'));
            expect(await screen.findByText('Feed / Composer')).toBeInTheDocument();

            fireEvent.click(button('Undo reviewed'));
            expect(progress()).toHaveTextContent('0 of 5 captures reviewed');
            expect(button('Looks right')).toBeInTheDocument();
        });

        it('continues from the first item not yet reviewed', async () => {
            localStorage.setItem('visual-report-marks-263', JSON.stringify([[sampleEntries[0].id, `${sampleEntries[0].beforeHash}|${sampleEntries[0].afterHash}`]]));
            await openReport(testManifest(sampleEntries));
            fireEvent.click(button('Continue review'));
            expect(await screen.findByText('Feed / PostCard')).toBeInTheDocument();
        });

        it('links to the PR once everything is reviewed', async () => {
            const marks = sampleEntries.map((entry) => [entry.id, `${entry.beforeHash}|${entry.afterHash}`]);
            localStorage.setItem('visual-report-marks-263', JSON.stringify(marks));
            await openReport(testManifest(sampleEntries));
            expect(screen.getByRole('link', { name: 'Approve in the PR' })).toHaveAttribute('href', 'https://github.com/CodeGetItGR/storywall/pull/263');
        });

        it('has no PR links on a local run', async () => {
            const marks = sampleEntries.map((entry) => [entry.id, `${entry.beforeHash}|${entry.afterHash}`]);
            localStorage.setItem('visual-report-marks-local', JSON.stringify(marks));
            await openReport(testManifest(sampleEntries, { pull: undefined }));
            expect(screen.queryByRole('link')).not.toBeInTheDocument();
        });

        it('keeps marks through a new commit when hashes match, and clears them when not', async () => {
            const kept = sampleEntries[0];
            const stale = sampleEntries[1];
            localStorage.setItem(
                'visual-report-marks-263',
                JSON.stringify([
                    [kept.id, `${kept.beforeHash}|${kept.afterHash}`],
                    [stale.id, `${stale.beforeHash}|an-older-hash`],
                ]),
            );
            await openReport(testManifest(sampleEntries));
            expect(progress()).toHaveTextContent('1 of 5 captures reviewed');
        });
    });

    describe('failed stories', () => {
        it('has no Looks right, and blocks the approve link', async () => {
            const marks = sampleEntries.map((entry) => [entry.id, `${entry.beforeHash}|${entry.afterHash}`]);
            localStorage.setItem('visual-report-marks-263', JSON.stringify(marks));
            window.location.hash = '#ui-card--broken';
            await openReport(testManifest([...sampleEntries, failedEntry]));
            expect(screen.getByText('This story failed')).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: 'Looks right' })).not.toBeInTheDocument();
            expect(screen.getByText('Fix the failed stories first')).toBeInTheDocument();
            expect(screen.queryByRole('link', { name: 'Approve in the PR' })).not.toBeInTheDocument();
        });
    });

    describe('story screen', () => {
        it('shows one tab per capture, and keeps the chosen tab on the next story', async () => {
            window.location.hash = '#feed-postcard--default';
            await openReport(testManifest(sampleEntries));
            expect(button(/EN Mobile/)).toHaveTextContent('EN Mobile3.67%');
            expect(button(/EL Mobile/)).toHaveTextContent('EL Mobileno change');
            expect(button(/EL Mobile/)).toBeDisabled();
            fireEvent.click(button(/EN Desktop/));
            expect(button(/EN Desktop/)).toHaveAttribute('aria-pressed', 'true');
            expect(screen.getByRole('img', { name: /desktop, before$/ })).toBeInTheDocument();

            fireEvent.click(button('Next →'));
            expect(await screen.findByText('UI / Badge')).toBeInTheDocument();
            fireEvent.click(button('← Previous'));
            expect(await screen.findByText('Feed / PostCard')).toBeInTheDocument();
            expect(button(/EN Desktop/)).toHaveAttribute('aria-pressed', 'true');
        });

        it('switches between side by side, slider and diff', async () => {
            window.location.hash = '#feed-postcard--default';
            await openReport(testManifest(sampleEntries));
            fireEvent.click(button('Slider'));
            expect(screen.getByRole('slider')).toBeInTheDocument();
            fireEvent.click(button('Diff'));
            expect(screen.getByRole('img', { name: /diff$/ })).toBeInTheDocument();
        });

        it('disables comparing on a new story', async () => {
            window.location.hash = '#ui-button--primary';
            await openReport(testManifest(sampleEntries));
            expect(button('Slider')).toBeDisabled();
            expect(button('Fit')).toBeEnabled();
        });
    });

    describe('same change', () => {
        const grouped = () => testManifest(groupedEntries, { groups: [colorGroup] });

        it('appears only when the report has groups', async () => {
            await openReport(testManifest(sampleEntries));
            expect(screen.queryByRole('button', { name: 'Same change' })).not.toBeInTheDocument();
        });

        it('is absent for a report from before grouping', async () => {
            const entries = sampleEntries.map((entry) => {
                const old: Partial<typeof entry> = { ...entry };
                delete old.changeKey;
                return old as typeof entry;
            });
            await openReport(testManifest(entries, { groups: undefined }));
            expect(screen.queryByRole('button', { name: 'Same change' })).not.toBeInTheDocument();
        });

        it('marks every capture in a group, then moves on', async () => {
            await openReport(grouped());
            fireEvent.click(button('Same change'));
            fireEvent.click(list().getByRole('button', { name: /Color change/ }));
            expect(await screen.findByRole('button', { name: 'Looks right for all 3' })).toBeInTheDocument();
            expect(screen.getByText('3 captures, 2 stories')).toBeInTheDocument();
            fireEvent.click(button('Looks right for all 3'));
            expect(progress()).toHaveTextContent('3 of 5 captures reviewed');
            expect(await screen.findByText('UI / Badge')).toBeInTheDocument();
        });

        it('shows the capture picked from the thumbnails', async () => {
            window.location.hash = '#group-color-1';
            await openReport(grouped());
            expect(screen.getByText('Showing PostCard / Default, EN Mobile')).toBeInTheDocument();
            fireEvent.click(button(/PostCard \/ Default.*EN Desktop/));
            expect(screen.getByText('Showing PostCard / Default, EN Desktop')).toBeInTheDocument();
        });

        it('shows the first 60 thumbnails, then all of them', async () => {
            const entries = Array.from({ length: 62 }, (_, index) => testEntry(`capture-${index}`, { storyId: `story-${index}`, changeKey: 'same-1' }));
            window.location.hash = '#group-same-1';
            await openReport(testManifest(entries, { groups: [{ key: 'same-1', kind: 'exact' }] }));
            expect(document.querySelectorAll('.thumb')).toHaveLength(60);
            fireEvent.click(button('Show all 62'));
            expect(document.querySelectorAll('.thumb')).toHaveLength(62);
        });
    });

    describe('addresses', () => {
        it('opens a story from its address', async () => {
            window.location.hash = '#ui-badge--old';
            await openReport(testManifest(sampleEntries));
            expect(screen.getByText('UI / Badge')).toBeInTheDocument();
        });

        it('opens a group from its address, in the list that holds it', async () => {
            window.location.hash = '#group-color-1';
            await openReport(testManifest(groupedEntries, { groups: [colorGroup] }));
            expect(screen.getByRole('button', { name: 'Same change' })).toHaveAttribute('aria-pressed', 'true');
            expect(screen.getByRole('heading', { name: 'Color change' })).toBeInTheDocument();
        });

        it('opens the Overview for an address that matches nothing', async () => {
            window.location.hash = '#nothing-here';
            await openReport(testManifest(sampleEntries));
            expect(screen.getByRole('heading', { name: '5 of 1078 captures differ' })).toBeInTheDocument();
        });

        it('follows the back button', async () => {
            await openReport(testManifest(sampleEntries));
            window.location.hash = '#ui-badge--old';
            expect(await screen.findByText('UI / Badge')).toBeInTheDocument();
            window.location.hash = '';
            expect(await screen.findByRole('heading', { name: '5 of 1078 captures differ' })).toBeInTheDocument();
        });
    });

    describe('shortcuts', () => {
        it('work by key position on a Greek keyboard', async () => {
            window.location.hash = '#feed-postcard--default';
            await openReport(testManifest(sampleEntries));
            fireEvent.keyDown(document, { code: 'KeyC', key: 'ψ' });
            expect(button(/EN Desktop/)).toHaveAttribute('aria-pressed', 'true');
            fireEvent.keyDown(document, { code: 'KeyR', key: 'ρ' });
            expect(progress()).toHaveTextContent('2 of 5 captures reviewed');
            expect(await screen.findByText('UI / Badge')).toBeInTheDocument();
        });

        it('switch the compare view and zoom', async () => {
            window.location.hash = '#feed-postcard--default';
            await openReport(testManifest(sampleEntries));
            fireEvent.keyDown(document, { code: 'Digit2', key: '2' });
            expect(screen.getByRole('slider')).toBeInTheDocument();
            fireEvent.keyDown(document, { code: 'Digit1', key: '1' });
            fireEvent.keyDown(document, { code: 'KeyZ', key: 'z' });
            expect(button('100%')).toHaveAttribute('aria-pressed', 'true');
        });

        it('stay out of the way while typing', async () => {
            window.location.hash = '#feed-postcard--default';
            await openReport(testManifest(sampleEntries));
            fireEvent.keyDown(screen.getByRole('textbox', { name: 'Find a story' }), { code: 'KeyR', key: 'r' });
            expect(progress()).toHaveTextContent('0 of 5 captures reviewed');
        });

        it('move focus to search', async () => {
            await openReport(testManifest(sampleEntries));
            fireEvent.keyDown(document, { code: 'Slash', key: '/' });
            expect(screen.getByRole('textbox', { name: 'Find a story' })).toHaveFocus();
        });

        it('open and close the help', async () => {
            await openReport(testManifest(sampleEntries));
            fireEvent.keyDown(document, { code: 'Slash', key: '?' });
            expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument();
            fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        it('switch list mode only when there are groups', async () => {
            await openReport(testManifest(sampleEntries));
            fireEvent.keyDown(document, { code: 'KeyG', key: 'g' });
            expect(list().getByRole('button', { name: /Feed/ })).toBeInTheDocument();
        });
    });

    describe('filters', () => {
        it('narrow the list and the review order by search', async () => {
            await openReport(testManifest(sampleEntries));
            expect(screen.getByText('4 to review')).toBeInTheDocument();
            fireEvent.change(screen.getByRole('textbox', { name: 'Find a story' }), { target: { value: 'Button' } });
            expect(screen.getByText('1 to review')).toBeInTheDocument();
            fireEvent.click(list().getByRole('button', { name: /Primary/ }));
            expect(await screen.findByText('UI / Button')).toBeInTheDocument();
        });

        it('narrow by state', async () => {
            await openReport(testManifest(sampleEntries));
            fireEvent.click(button(/^New/));
            expect(screen.getByText('1 to review')).toBeInTheDocument();
        });

        it('hide reviewed captures', async () => {
            localStorage.setItem('visual-report-marks-263', JSON.stringify([[sampleEntries[0].id, `${sampleEntries[0].beforeHash}|${sampleEntries[0].afterHash}`]]));
            await openReport(testManifest(sampleEntries));
            fireEvent.click(screen.getByRole('checkbox', { name: 'Hide reviewed' }));
            expect(screen.getByText('3 to review')).toBeInTheDocument();
        });

        it('say when nothing matches', async () => {
            await openReport(testManifest(sampleEntries));
            fireEvent.change(screen.getByRole('textbox', { name: 'Find a story' }), { target: { value: 'nothing like this' } });
            expect(screen.getByText('Nothing matches these filters.')).toBeInTheDocument();
        });
    });

    describe('phone drawer', () => {
        it('opens, and closes on a row or the backdrop', async () => {
            await openReport(testManifest(sampleEntries));
            fireEvent.click(button('Stories'));
            expect(document.querySelector('.side')).toHaveClass('open');
            fireEvent.click(document.querySelector('.scrim') as Element);
            expect(document.querySelector('.side')).not.toHaveClass('open');
            fireEvent.click(button('Stories'));
            fireEvent.click(list().getByRole('button', { name: 'Overview' }));
            expect(document.querySelector('.side')).not.toHaveClass('open');
        });
    });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run scripts/visual/report/src/App.test.tsx`
Expected: FAIL, it can't find `./App`.

- [ ] **Step 3: Write the screens**

`screens/CaptureThumb.tsx`:

```tsx
import type { ReportEntry } from '../../../../types';
import { copy } from '../../copy';
import { altText } from '../../lib/labels';

type CaptureThumbProps = { entry: ReportEntry; title: string; value: string; current?: boolean; onPick: (entry: ReportEntry) => void };

export function CaptureThumb({ entry, title, value, current, onPick }: CaptureThumbProps) {
    function handleClick() {
        onPick(entry);
    }
    return (
        <button type="button" className="thumb" aria-current={current ? 'true' : undefined} onClick={handleClick}>
            {/* Thumbnails only show changed captures, which always have an after image. */}
            <img className="thumb-image" src={entry.images.after} alt={altText(entry, copy.after.toLowerCase())} loading="lazy" decoding="async" />
            <span>{title}</span>
            <span className="value">{value}</span>
        </button>
    );
}
```

`screens/StoryScreen.tsx`:

```tsx
import type { ReportEntry } from '../../../../types';
import { copy } from '../../copy';
import type { ReportView } from '../../hooks/useReportView';
import { type Story, worstState } from '../../lib/model';
import { CaptureTabs } from '../compare/CaptureTabs';
import { CompareView } from '../compare/CompareView';
import { ViewControls } from '../compare/ViewControls';

type StoryScreenProps = { story: Story; entry: ReportEntry; view: ReportView };

export function StoryScreen({ story, entry, view }: StoryScreenProps) {
    const state = worstState(story.entries);
    return (
        <>
            {/* Header */}
            <header className="head">
                <div className="title-line">
                    <div>
                        <div className="crumb">
                            {story.area} / {story.component}
                        </div>
                        <h1>{story.name}</h1>
                    </div>
                    <span className={`pill s-${state}`}>
                        <span className="dot" />
                        {copy.states[state]}
                    </span>
                </div>
                <div className="controls">
                    <CaptureTabs story={story} current={entry} onPick={view.pickCapture} />
                    <span className="spacer" />
                    <ViewControls entry={entry} compare={view.compare} zoom={view.zoom} onCompare={view.setCompare} onZoom={view.setZoom} />
                </div>
            </header>

            {/* Images */}
            <div className={`stage zoom-${view.zoom}`}>
                <CompareView entry={entry} compare={view.compare} slider={view.slider} onSlider={view.setSlider} />
            </div>
        </>
    );
}
```

`screens/GroupScreen.tsx`:

```tsx
import { useRef } from 'react';

import type { ReportEntry } from '../../../../types';
import { copy } from '../../copy';
import type { ReportView } from '../../hooks/useReportView';
import { captureLabel, shortName } from '../../lib/labels';
import type { Group } from '../../lib/model';
import { CompareView } from '../compare/CompareView';
import { ViewControls } from '../compare/ViewControls';
import { Swatches } from '../Swatches';
import { CaptureThumb } from './CaptureThumb';

const THUMB_PAGE = 60;

type GroupScreenProps = { group: Group; entry: ReportEntry; view: ReportView };

export function GroupScreen({ group, entry, view }: GroupScreenProps) {
    const stageRef = useRef<HTMLDivElement>(null);
    const showAll = view.allThumbs.has(group.key);
    const shown = showAll ? group.entries : group.entries.slice(0, THUMB_PAGE);
    const storyCount = new Set(group.entries.map((item) => item.storyId)).size;

    function handlePick(item: ReportEntry) {
        view.pickGroupCapture(group.key, item.id);
        if (stageRef.current) stageRef.current.scrollTop = 0;
    }
    function handleShowAll() {
        view.showAllThumbs(group.key);
    }

    return (
        <>
            {/* Header */}
            <header className="head">
                <div className="title-line">
                    <div>
                        <div className="crumb">{copy.sameChange}</div>
                        <h1>{group.label}</h1>
                    </div>
                    <Swatches from={group.from} to={group.to} />
                    <span className="position">{copy.groupSize(group.entries.length, storyCount)}</span>
                </div>
                <div className="controls">
                    <span className="crumb">{copy.showing(shortName(entry), captureLabel(entry))}</span>
                    <span className="spacer" />
                    <ViewControls entry={entry} compare={view.compare} zoom={view.zoom} onCompare={view.setCompare} onZoom={view.setZoom} />
                </div>
            </header>

            <div className={`stage zoom-${view.zoom}`} ref={stageRef}>
                {/* The capture being looked at */}
                <div className="section">
                    <CompareView entry={entry} compare={view.compare} slider={view.slider} onSlider={view.setSlider} />
                </div>

                {/* Every capture in the group */}
                <div className="section">
                    <h2>{copy.everyCapture}</h2>
                    <div className="thumbs">
                        {shown.map((item) => (
                            <CaptureThumb key={item.id} entry={item} title={shortName(item)} value={captureLabel(item)} current={item === entry} onPick={handlePick} />
                        ))}
                    </div>
                    {!showAll && group.entries.length > THUMB_PAGE && (
                        <div>
                            <button type="button" className="btn" onClick={handleShowAll}>
                                {copy.showAll(group.entries.length)}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
```

`screens/OverviewSections.tsx`:

```tsx
import type { ReportEntry } from '../../../../types';
import { copy } from '../../copy';
import type { ReportView } from '../../hooks/useReportView';
import { percentText, shortName } from '../../lib/labels';
import type { Marks } from '../../lib/marks';
import { type Group, type ReportModel, STATES, type Story } from '../../lib/model';
import { type AreaRow, areaRows, biggestChanges, failedStories } from '../../lib/overview';
import { Swatches } from '../Swatches';
import { CaptureThumb } from './CaptureThumb';

const GROUPS_SHOWN = 6;

type SectionProps = { model: ReportModel; view: ReportView };

function FailedRow({ story, view }: { story: Story; view: ReportView }) {
    const failed = story.entries.filter((entry) => entry.state === 'failed').length;
    function handleClick() {
        view.go({ kind: 'story', id: story.id });
    }
    return (
        <button type="button" className="row group-row" onClick={handleClick}>
            <span className="dot s-failed" />
            <span className="name">
                {story.component} / {story.name}
            </span>
            <span className="value">{copy.captures(failed)}</span>
        </button>
    );
}

export function FailedSection({ model, view }: SectionProps) {
    const stories = failedStories(model);
    if (stories.length === 0) return null;
    return (
        <section className="section">
            <h2>{copy.states.failed}</h2>
            <div className="plain-list">
                {stories.map((story) => (
                    <FailedRow key={story.id} story={story} view={view} />
                ))}
            </div>
        </section>
    );
}

function AreaTableRow({ row, view }: { row: AreaRow; view: ReportView }) {
    function handleClick() {
        view.goInAreaList({ kind: 'story', id: row.firstStory });
    }
    return (
        <tr onClick={handleClick}>
            <td>
                <button type="button" className="link-button">
                    {row.area}
                </button>
            </td>
            {STATES.map((state) => (
                <td key={state}>
                    <span className={row.counts[state] === 0 ? 'zero' : undefined}>{row.counts[state]}</span>
                </td>
            ))}
            <td>
                {row.reviewed}/{row.total}
            </td>
        </tr>
    );
}

export function AreaSection({ model, view, marks }: SectionProps & { marks: Marks }) {
    const rows = areaRows(model, marks);
    if (rows.length === 0) return null;
    return (
        <section className="section">
            <h2>{copy.byArea}</h2>
            <div className="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th scope="col">{copy.area}</th>
                            {STATES.map((state) => (
                                <th key={state} scope="col">
                                    {copy.states[state]}
                                </th>
                            ))}
                            <th scope="col">{copy.reviewed}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <AreaTableRow key={row.area} row={row} view={view} />
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function SameChangeRow({ group, view }: { group: Group; view: ReportView }) {
    function handleClick() {
        view.go({ kind: 'group', key: group.key });
    }
    return (
        <button type="button" className="row group-row" onClick={handleClick}>
            <Swatches from={group.from} to={group.to} />
            <span className="name">{group.label}</span>
            <span className="value">{copy.captures(group.entries.length)}</span>
        </button>
    );
}

export function SameChangeSection({ model, view }: SectionProps) {
    if (model.groups.length === 0) return null;
    return (
        <section className="section">
            <h2>{copy.sameChange}</h2>
            <div className="plain-list">
                {model.groups.slice(0, GROUPS_SHOWN).map((group) => (
                    <SameChangeRow key={group.key} group={group} view={view} />
                ))}
            </div>
        </section>
    );
}

export function BiggestSection({ model, view }: SectionProps) {
    const big = biggestChanges(model);
    if (big.length === 0) return null;
    function handlePick(entry: ReportEntry) {
        view.go({ kind: 'story', id: entry.storyId });
    }
    return (
        <section className="section">
            <h2>{copy.biggestChanges}</h2>
            <div className="thumbs">
                {big.map(({ story, entry }) => (
                    <CaptureThumb key={story.id} entry={entry} title={shortName(entry)} value={percentText(entry.percent)} onPick={handlePick} />
                ))}
            </div>
        </section>
    );
}

export function MissingSection({ model }: { model: ReportModel }) {
    const { missingStories } = model.manifest;
    if (missingStories.length === 0) return null;
    return (
        <section className="section">
            <h2>{copy.missingStories}</h2>
            <ul className="plain-list">
                {missingStories.map((path) => (
                    <li key={path}>{path}</li>
                ))}
            </ul>
        </section>
    );
}
```

`screens/OverviewScreen.tsx`:

```tsx
import { copy } from '../../copy';
import type { ReportView } from '../../hooks/useReportView';
import type { Marks } from '../../lib/marks';
import type { ReportModel } from '../../lib/model';
import { AreaSection, BiggestSection, FailedSection, MissingSection, SameChangeSection } from './OverviewSections';

type OverviewScreenProps = { model: ReportModel; view: ReportView; marks: Marks };

export function OverviewScreen({ model, view, marks }: OverviewScreenProps) {
    const { entries, totalCaptures } = model.manifest;
    return (
        <>
            {/* Header */}
            <header className="head">
                <h1>{copy.differ(entries.length, totalCaptures)}</h1>
            </header>

            <div className="stage">
                <div className="overview">
                    {/* Failed */}
                    <FailedSection model={model} view={view} />
                    {/* Areas */}
                    <AreaSection model={model} view={view} marks={marks} />
                    {/* Same change */}
                    <SameChangeSection model={model} view={view} />
                    {/* Biggest changes */}
                    <BiggestSection model={model} view={view} />
                    {/* Components with no story */}
                    <MissingSection model={model} />
                </div>
            </div>
        </>
    );
}
```

`screens/BottomBar.tsx`:

```tsx
import { copy } from '../../copy';
import type { ReportView } from '../../hooks/useReportView';
import type { Marks } from '../../lib/marks';
import type { ReportModel } from '../../lib/model';
import { barActions, itemEntries, reviewable } from '../../lib/reviewOrder';

type BottomBarProps = { model: ReportModel; view: ReportView; marks: Marks };

export function BottomBar({ model, view, marks }: BottomBarProps) {
    const { item, queue, index } = view;
    const onOverview = item.kind === 'overview';
    const actions = barActions(model, item, queue, marks);
    const markCount = reviewable(itemEntries(model, item)).length;
    const looksRight = item.kind === 'group' ? copy.looksRightForAll(markCount) : copy.looksRight;

    function handleStart() {
        if (actions.start) view.go(actions.start.item);
    }

    return (
        <footer className="bar">
            {/* Position */}
            {!onOverview && (
                <button type="button" className="btn" disabled={index <= 0} onClick={view.goPrevious}>
                    {copy.previous}
                </button>
            )}
            <span className="position">{index === -1 ? copy.toReview(queue.length) : copy.position(index + 1, queue.length)}</span>
            {!onOverview && (
                <button type="button" className="btn" disabled={queue.length === 0 || index === queue.length - 1} onClick={view.goNext}>
                    {copy.next}
                </button>
            )}
            <span className="spacer" />

            {/* Review actions */}
            {actions.start && (
                <button type="button" className="btn btn-primary" onClick={handleStart}>
                    {actions.start.started ? copy.continueReview : copy.startReview}
                </button>
            )}
            {actions.mark === 'looks-right' && (
                <button type="button" className="btn btn-primary" onClick={view.markCurrent}>
                    {looksRight}
                </button>
            )}
            {actions.mark === 'undo' && (
                <button type="button" className="btn" onClick={view.markCurrent}>
                    {copy.undoReviewed}
                </button>
            )}
            {actions.approve === 'link' && (
                <a className="btn btn-primary" href={model.manifest.pull?.url} target="_blank" rel="noreferrer">
                    {copy.approve}
                </a>
            )}
            {actions.approve === 'blocked' && <span className="position">{copy.fixFailedFirst}</span>}

            {/* Help */}
            <button type="button" className="btn help-button" aria-label={copy.shortcuts} onClick={view.openHelp}>
                ?
            </button>
        </footer>
    );
}
```

`screens/TopBar.tsx`:

```tsx
import { copy } from '../../copy';

// Only shows on a phone, where the sidebar is a drawer.
export function TopBar({ onOpenDrawer }: { onOpenDrawer: () => void }) {
    return (
        <div className="top">
            <button type="button" className="btn" onClick={onOpenDrawer}>
                {copy.stories}
            </button>
            <b>{copy.title}</b>
        </div>
    );
}
```

`screens/ShortcutsHelp.tsx`:

```tsx
import { Fragment } from 'react';

import { copy } from '../../copy';

const SHORTCUTS: { keys: string[]; text: string }[] = [
    { keys: ['←', '→'], text: copy.previousOrNext },
    { keys: ['R'], text: copy.looksRightThenNext },
    { keys: ['C'], text: copy.nextCapture },
    { keys: ['1', '2', '3'], text: copy.compareKeys },
    { keys: ['Z'], text: copy.zoomKeys },
    { keys: ['G'], text: copy.modeKeys },
    { keys: ['/'], text: copy.findStory },
];

export function ShortcutsHelp({ onClose }: { onClose: () => void }) {
    return (
        <>
            <div className="scrim" onClick={onClose} />
            <div className="help" role="dialog" aria-label={copy.shortcuts}>
                <h2>{copy.shortcuts}</h2>
                <dl>
                    {SHORTCUTS.map(({ keys, text }) => (
                        <Fragment key={text}>
                            <dt>
                                {keys.map((key) => (
                                    <kbd key={key}>{key}</kbd>
                                ))}
                            </dt>
                            <dd>{text}</dd>
                        </Fragment>
                    ))}
                </dl>
                <button type="button" className="btn" onClick={onClose}>
                    {copy.close}
                </button>
            </div>
        </>
    );
}
```

- [ ] **Step 4: Write `components/ReportApp.tsx` and `App.tsx`**

`components/ReportApp.tsx`:

```tsx
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { usePreloadNext } from '../hooks/usePreloadNext';
import { type ReportView, useReportView } from '../hooks/useReportView';
import { useReviewMarks } from '../hooks/useReviewMarks';
import { useRoute } from '../hooks/useRoute';
import type { Marks } from '../lib/marks';
import type { ReportModel } from '../lib/model';
import { BottomBar } from './screens/BottomBar';
import { GroupScreen } from './screens/GroupScreen';
import { OverviewScreen } from './screens/OverviewScreen';
import { ShortcutsHelp } from './screens/ShortcutsHelp';
import { StoryScreen } from './screens/StoryScreen';
import { TopBar } from './screens/TopBar';
import { Sidebar } from './sidebar/Sidebar';

type CurrentScreenProps = { model: ReportModel; view: ReportView; marks: Marks };

// Each item gets its own key, so moving to the next one starts its images at the top.
function CurrentScreen({ model, view, marks }: CurrentScreenProps) {
    const { item, entry } = view;
    if (item.kind === 'story' && entry) {
        const story = model.storyById.get(item.id);
        if (story) return <StoryScreen key={story.id} story={story} entry={entry} view={view} />;
    }
    if (item.kind === 'group' && entry) {
        const group = model.groupByKey.get(item.key);
        if (group) return <GroupScreen key={group.key} group={group} entry={entry} view={view} />;
    }
    return <OverviewScreen model={model} view={view} marks={marks} />;
}

export function ReportApp({ model }: { model: ReportModel }) {
    const review = useReviewMarks(model);
    const route = useRoute(model);
    const view = useReportView(model, route, review);
    useKeyboardShortcuts(view);
    usePreloadNext(model, view);

    return (
        <div className="app">
            {/* Story list */}
            <Sidebar model={model} view={view} marks={review.marks} />

            {/* Backdrop behind the phone drawer */}
            {view.drawerOpen && <div className="scrim" onClick={view.closeDrawer} />}

            {/* One item at a time */}
            <main className="main">
                <TopBar onOpenDrawer={view.openDrawer} />
                <CurrentScreen model={model} view={view} marks={review.marks} />
                <BottomBar model={model} view={view} marks={review.marks} />
            </main>

            {/* Keyboard shortcuts */}
            {view.helpOpen && <ShortcutsHelp onClose={view.closeHelp} />}
        </div>
    );
}
```

`App.tsx`:

```tsx
import { ReportApp } from './components/ReportApp';
import { copy } from './copy';
import { useManifest } from './hooks/useManifest';

export function App() {
    const report = useManifest();
    if (report.status === 'ready') return <ReportApp model={report.model} />;
    return (
        <main className="status">
            <h1>{copy.title}</h1>
            <p>{report.status === 'loading' ? copy.loading : copy.loadFailed}</p>
        </main>
    );
}
```

- [ ] **Step 5: Run the page tests**

Run: `npx vitest run scripts/visual/report/src`
Expected: PASS. Fix the code, not the test, unless a test's own expectation is wrong against the spec. Report any test you changed.

- [ ] **Step 6: Check types and lint**

Run: `npx tsc --noEmit` and then `npx eslint scripts/visual/report/src`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add scripts/visual/report/src/components scripts/visual/report/src/App.tsx scripts/visual/report/src/App.test.tsx
git commit -m "KAN-158: add the report page's screens"
```

---

## Task 11: Build it, and use it

**Files:**
- Create: `scripts/visual/report/src/main.tsx`, `scripts/visual/report/src/styles.css`, `scripts/visual/report/vite.config.ts`, `.gitattributes`, `scripts/visual/report/page.test.ts`, `scripts/visual/report/dist/index.html` (built)
- Modify: `scripts/visual/report/index.html` (becomes the template), `package.json`, `app/globals.css`, `scripts/visual/publish.mjs`, `scripts/visual/run.ts`, `.github/workflows/visual-check.yml`, `scripts/visual/workflows.test.ts`, `docs/storybook.md`, `docs/superpowers/specs/2026-11-06-visual-regression-tool-design.md`

- [ ] **Step 1: Write the failing tests**

Create `scripts/visual/report/page.test.ts`:

```ts
// @vitest-environment node
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('built report page', () => {
    const page = read('scripts/visual/report/dist/index.html');

    it('asks crawlers to stay away', () => {
        expect(page).toContain('<meta name="robots" content="noindex, nofollow"');
    });

    it('has its script and styles inside', () => {
        expect(page).toContain('<script type="module">');
        expect(page).toContain('<style>');
    });

    it('loads no script or stylesheet from elsewhere', () => {
        expect(page).not.toMatch(/<script[^>]*\ssrc=/);
        expect(page).not.toMatch(/<link[^>]*stylesheet/);
    });

    it('uses one kind of line ending, so every machine builds the same file', () => {
        expect(page).not.toContain('\r');
    });
});

describe('report page paths', () => {
    it('publishes the built page', () => {
        expect(read('scripts/visual/publish.mjs')).toContain("new URL('./report/dist/index.html', import.meta.url)");
    });

    it('uses the built page for local runs', () => {
        expect(read('scripts/visual/run.ts')).toContain("join('scripts', 'visual', 'report', 'dist', 'index.html')");
    });

    it('adds the PR link when publishing', () => {
        expect(read('scripts/visual/publish.mjs')).toContain('publishedManifest(manifest, { repo: GITHUB_REPOSITORY, prNumber: PR_NUMBER');
    });
});
```

In `scripts/visual/workflows.test.ts`, inside `describe('visual-check workflow', ...)`, add:

```ts
    it('fails when the committed report page is out of date', () => {
        const check = readFileSync('.github/workflows/visual-check.yml', 'utf8');
        const capture = check.slice(check.indexOf('    capture:'), check.indexOf('    publish:'));
        expect(capture).toContain('npm run visual:page');
        expect(capture).toContain('git status --porcelain -- scripts/visual/report/dist/index.html');
        expect(capture.indexOf('npm ci')).toBeLessThan(capture.indexOf('npm run visual:page'));
    });

    it('never builds in the job that holds the deploy key', () => {
        const check = readFileSync('.github/workflows/visual-check.yml', 'utf8');
        const publish = check.slice(check.indexOf('    publish:'), check.indexOf('    finish:'));
        expect(publish).not.toContain('npm ');
    });
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run scripts/visual/report/page.test.ts scripts/visual/workflows.test.ts`
Expected: FAIL, the built page doesn't exist and the workflow has no rebuild step.

- [ ] **Step 3: Write `styles.css` from the mockup**

The mockup was approved, so its CSS is copied rather than rewritten. It lives at `C:\Users\User\AppData\Local\Temp\claude\70ab987e8384f8dd\f4c3042a-3b12-4322-9aea-3d106840dbe2\scratchpad\report-sample\mockup\index.html`. If that file is gone, read the published mockup: `https://claude.ai/artifact/SVaUG3NAA1Fz7wYBj3FaQ9`.

Run this from the worktree. It keeps lines 5–57 (tokens and dark mode), 84–135 (base) and 149–871 (layout), leaving out the mockup-only `data-theme` block, `.root` and `.note`:

```bash
node -e "
const { readFileSync, writeFileSync } = require('node:fs');
const mockup = 'C:/Users/User/AppData/Local/Temp/claude/70ab987e8384f8dd/f4c3042a-3b12-4322-9aea-3d106840dbe2/scratchpad/report-sample/mockup/index.html';
const lines = readFileSync(mockup, 'utf8').split(/\r?\n/);
const kept = [...lines.slice(4, 57), '', ...lines.slice(83, 135), '', '/* Shell */', ...lines.slice(148, 871)];
const css = kept.map((line) => line.replace(/^ {4}/, '')).join('\n').replace(\":root:not([data-theme='light'])\", ':root');
writeFileSync('scripts/visual/report/src/styles.css', css + '\n');
"
```

Then check the result:
- Its first line is `:root {`, and its last line is the `}` that closes the phone `@media` block.
- `grep -c "data-theme" scripts/visual/report/src/styles.css` prints `0`.
- `grep -c "\.note\|\.root" scripts/visual/report/src/styles.css` prints `0`.

Then append this to the end of `styles.css`:

```css

/* Page shell */
#root,
.app {
    height: 100%;
}

/* Loading and error */
.status {
    display: grid;
    gap: 8px;
    padding: 24px;
    color: var(--ink-muted);
}
.status h1 {
    color: var(--ink);
}

/* Small pieces */
.row-overview {
    margin-top: 0;
}
.slider-tag-before {
    left: 8px;
}
.slider-tag-after {
    right: 8px;
}
.link-button {
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    color: inherit;
    text-align: left;
}
```

- [ ] **Step 4: Write `main.tsx`, the template and the build**

`scripts/visual/report/src/main.tsx`:

```tsx
import './styles.css';

import { createRoot } from 'react-dom/client';

import { App } from './App';

createRoot(document.getElementById('root') as HTMLElement).render(<App />);
```

Replace all of `scripts/visual/report/index.html` with:

```html
<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        <title>Visual check report</title>
    </head>
    <body>
        <div id="root"></div>
        <script type="module" src="./src/main.tsx"></script>
    </body>
</html>
```

`scripts/visual/report/vite.config.ts`:

```ts
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Text an inline script can't contain, or the browser would stop reading it as a script.
const safeInScript = (code: string) => code.replace(/<\/script/gi, '<\\/script').replaceAll('<!--', '<\\!--');

// Puts the script and styles inside the page, so a report is one file and loads nothing from elsewhere.
function inlineIntoPage(): Plugin {
    return {
        name: 'inline-into-page',
        enforce: 'post',
        generateBundle(_options, bundle) {
            const page = bundle['index.html'];
            if (page?.type !== 'asset') throw new Error('The build made no index.html');
            let html = String(page.source);
            for (const [name, file] of Object.entries(bundle)) {
                const path = escapeRegExp(name);
                if (file.type === 'chunk') {
                    html = html.replace(new RegExp(`<script[^>]*src="[^"]*${path}"[^>]*></script>`), () => `<script type="module">${safeInScript(file.code)}</script>`);
                    delete bundle[name];
                } else if (name.endsWith('.css')) {
                    html = html.replace(new RegExp(`<link[^>]*href="[^"]*${path}"[^>]*>`), () => `<style>${String(file.source)}</style>`);
                    delete bundle[name];
                }
            }
            // Windows and Linux must build the same bytes.
            page.source = html.replaceAll('\r\n', '\n');
        },
    };
}

export default defineConfig({
    root: fileURLToPath(new URL('.', import.meta.url)),
    base: './',
    // The repo's PostCSS config is Tailwind's, for the app. This page has its own CSS.
    css: { postcss: { plugins: [] } },
    plugins: [react(), inlineIntoPage()],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        cssCodeSplit: false,
        modulePreload: false,
    },
});
```

Create `.gitattributes` at the repo root:

```
scripts/visual/report/dist/index.html linguist-generated=true -text
```

`linguist-generated` collapses the file in PR diffs. `-text` stops Git changing its line endings on Windows, so the rebuild check compares real bytes.

In `package.json`, add this after the `"visual"` script line:

```json
        "visual:page": "vite build --config scripts/visual/report/vite.config.ts",
```

In `app/globals.css`, add this line after the three `@import` lines. Tailwind scans every file in the repo that Git doesn't ignore, and the built page shouldn't add to the app's CSS:

```css
@source not '../scripts/visual/report';
```

- [ ] **Step 5: Build, and check the build repeats**

Run:

```bash
npm run visual:page
sha1sum scripts/visual/report/dist/index.html
npm run visual:page
sha1sum scripts/visual/report/dist/index.html
wc -c scripts/visual/report/dist/index.html
ls scripts/visual/report/dist
```

Expected: both hashes match, the file is about 200–300 KB, and `dist` holds only `index.html`.

- [ ] **Step 6: Point the tool at the built page**

In `scripts/visual/publish.mjs`:
- Change the import to `import { publishedManifest, validateManifest } from './publish/manifest.mjs';`.
- Replace the `writeFileSync(join(reportDir, 'manifest.json'), ...)` line with:

```js
        const published = publishedManifest(manifest, { repo: GITHUB_REPOSITORY, prNumber: PR_NUMBER, createdAt: new Date().toISOString() });
        writeFileSync(join(reportDir, 'manifest.json'), JSON.stringify(published));
```

- Replace the `copyFileSync(new URL('./report/index.html', ...` line with:

```js
        copyFileSync(new URL('./report/dist/index.html', import.meta.url), join(reportDir, 'index.html'));
```

In `scripts/visual/run.ts`, line 134, replace with:

```ts
        copyFileSync(join('scripts', 'visual', 'report', 'dist', 'index.html'), join(REPORT_DIR, 'index.html'));
```

- [ ] **Step 7: Add the rebuild check to the workflow**

In `.github/workflows/visual-check.yml`, in the `capture` job, right after `- run: npm ci`, add:

```yaml

            # The report page is committed as one built file, so make sure it matches its source.
            - run: |
                  npm run visual:page
                  if [ -n "$(git status --porcelain -- scripts/visual/report/dist/index.html)" ]; then
                      echo "::error::The report page is out of date. Run npm run visual:page and commit the result."
                      exit 1
                  fi
```

- [ ] **Step 8: Update the docs**

In `docs/storybook.md`, in the `## Visual check` section, add before the line that starts "The code is in `scripts/visual/`":

```markdown
The report page's source is in `scripts/visual/report/src/`. After changing it, run `npm run visual:page` and commit `scripts/visual/report/dist/index.html`. The check fails if that file is out of date.

```

In `docs/superpowers/specs/2026-11-06-visual-regression-tool-design.md`:
- Change the code-layout row to: `` | `scripts/visual/report/` | Report page: source in `src/`, built file in `dist/` | ``.
- Add this right under `## Report page`:

```markdown
Replaced by [the report page design](2026-11-07-visual-report-page-design.md). This section describes the first version.
```

- [ ] **Step 9: Run the tool's tests**

Run: `npx vitest run scripts/visual`
Expected: PASS, every test in the folder, including `page.test.ts` and `workflows.test.ts`.

- [ ] **Step 10: Check the page opens from a plain folder**

Run:

```bash
mkdir -p visual-output/page-check
cp scripts/visual/report/dist/index.html visual-output/page-check/index.html
node "C:/Users/User/AppData/Local/Temp/claude/70ab987e8384f8dd/f4c3042a-3b12-4322-9aea-3d106840dbe2/scratchpad/stability-tools/serve-report.mjs" visual-output/page-check 4179
```

Run the server in the background. Open `http://127.0.0.1:4179/` with `preview_start {url}`. There's no manifest in that folder, so it must show "Could not load this report. It may have been deleted when the PR closed." with no console errors. That proves the bundle runs and CSS loads. Stop the server, and delete `visual-output/page-check`.

- [ ] **Step 11: Commit**

Run `npm run visual:page` once more right before this, so the built file matches every source change so far.

```bash
git add .gitattributes package.json app/globals.css .github/workflows/visual-check.yml docs/storybook.md docs/superpowers/specs/2026-11-06-visual-regression-tool-design.md scripts/visual/workflows.test.ts scripts/visual/publish.mjs scripts/visual/run.ts scripts/visual/report/index.html scripts/visual/report/vite.config.ts scripts/visual/report/page.test.ts scripts/visual/report/src/main.tsx scripts/visual/report/src/styles.css scripts/visual/report/dist/index.html
git commit -m "KAN-158: build the report page into one committed file"
```

---

## Task 12: Check it on real data

The test report is in `visual-output/` (ignored by Git): 1078 head PNGs, base PNGs with `base/captures.json`, and the earlier `report/manifest.json`. `visual-output/head` has no `captures.json`, so the script rebuilds the head records from the PNGs and the old manifest.

**Files:**
- Create (ignored, deleted at the end): `visual-output/check-real.ts`
- Modify: whatever this check shows is wrong, then rebuild the page

- [ ] **Step 1: Write the script**

Create `visual-output/check-real.ts`:

```ts
import { copyFileSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { comparePngs } from '../scripts/visual/compare';
import { decodePng, hashRaw } from '../scripts/visual/images';
import { buildReport } from '../scripts/visual/report';
import { changeSignature } from '../scripts/visual/sameChange';
import type { CaptureRecord, CaptureTarget, Manifest } from '../scripts/visual/types';

const OUT = 'visual-output';
const NEW_REPORT = join(OUT, 'report-new');

async function main() {
    const baseRecords = JSON.parse(readFileSync(join(OUT, 'base', 'captures.json'), 'utf8')) as CaptureRecord[];
    const old = JSON.parse(readFileSync(join(OUT, 'report', 'manifest.json'), 'utf8')) as Manifest;

    const targets = new Map<string, CaptureTarget>();
    for (const { id, storyId, title, name, locale, width } of [...baseRecords, ...old.entries]) targets.set(id, { id, storyId, title, name, locale, width });

    const failed = old.entries.filter((entry) => entry.state === 'failed');
    const failedIds = new Set(failed.map((entry) => entry.id));
    const headRecords: CaptureRecord[] = failed.map((entry) => ({ ...(targets.get(entry.id) as CaptureTarget), status: 'failed', hash: null, error: entry.error }));
    for (const file of readdirSync(join(OUT, 'head'))) {
        const id = file.replace(/\.png$/, '');
        if (!file.endsWith('.png') || failedIds.has(id)) continue;
        const target = targets.get(id);
        if (!target) throw new Error(`No target for ${id}`);
        headRecords.push({ ...target, status: 'ok', hash: hashRaw(await decodePng(readFileSync(join(OUT, 'head', file)))), error: null });
    }
    const headById = new Map(headRecords.map((record) => [record.id, record]));

    rmSync(NEW_REPORT, { recursive: true, force: true });
    const started = performance.now();
    const manifest = await buildReport({
        baseDir: join(OUT, 'base'),
        headDir: join(OUT, 'head'),
        reportDir: NEW_REPORT,
        baseRecords,
        headRecords,
        baseSha: old.baseSha,
        headSha: old.headSha,
        missingStories: old.missingStories,
        retake: async (target) => headById.get(target.id) as CaptureRecord,
    });
    const buildSeconds = (performance.now() - started) / 1000;

    // Grouping's share of the run.
    let signing = 0;
    const changed = manifest.entries.filter((entry) => entry.state === 'changed');
    for (const entry of changed) {
        const diff = await comparePngs(readFileSync(join(OUT, 'base', `${entry.id}.png`)), readFileSync(join(OUT, 'head', `${entry.id}.png`)));
        const start = performance.now();
        changeSignature(diff);
        signing += performance.now() - start;
    }

    const sizes = manifest.groups.map((group) => [group.key, manifest.entries.filter((entry) => entry.changeKey === group.key).length]);
    const alone = changed.filter((entry) => entry.changeKey === null);
    const composer = manifest.entries.filter((entry) => entry.title === 'Feed/ComposerCard').map((entry) => [entry.id, entry.changeKey]);
    process.stdout.write(
        `${JSON.stringify({ entries: manifest.entries.length, counts: manifest.counts, buildSeconds, signingMs: Math.round(signing), sizes, aloneCaptures: alone.length, aloneStories: new Set(alone.map((entry) => entry.storyId)).size, composer }, null, 2)}\n`,
    );
    if (manifest.fingerprint !== old.fingerprint) process.stdout.write('NOTE: the fingerprint differs from the old report\n');

    // A published report also has the PR link.
    const published = { ...manifest, pull: { number: 263, url: 'https://github.com/CodeGetItGR/storywall/pull/263' } };
    writeFileSync(join(NEW_REPORT, 'manifest.json'), JSON.stringify(published));
    copyFileSync(join('scripts', 'visual', 'report', 'dist', 'index.html'), join(NEW_REPORT, 'index.html'));
    if (!existsSync(join(NEW_REPORT, 'index.html'))) throw new Error('The page was not copied');
}

void main();
```

- [ ] **Step 2: Run it, in the background, because it takes minutes**

Run: `npx jiti visual-output/check-real.ts`

Expected, compared with the spec's measurement of 9 groups and 5 stories, largest 586, over 626 entries with 614 changed:
- `entries` is 626, and `counts` is `{ changed: 614, new: 4, removed: 4, failed: 4 }`.
- The largest group has about 586 captures, within a few.
- About 9 groups. The real rule keeps duplicate hashes, so this can shift slightly.
- All 8 `Feed/ComposerCard` entries have a `changeKey` that isn't the color group.
- The fingerprint note doesn't print.

Record `buildSeconds` and `signingMs` for the PR. If grouping adds more than about a minute, stop and report it, because the spec names this as a risk.

- [ ] **Step 3: Serve the report**

Run in the background:

```bash
node "C:/Users/User/AppData/Local/Temp/claude/70ab987e8384f8dd/f4c3042a-3b12-4322-9aea-3d106840dbe2/scratchpad/stability-tools/serve-report.mjs" visual-output/report-new 4178
```

Open `http://127.0.0.1:4178/` with `preview_start {url}`. Never `preview_start {name}`.

- [ ] **Step 4: Go through the page at desktop width (1360×860), light and dark**

Check each, and look at a screenshot rather than assuming:
- Overview: heading, Failed section, area table, Same change list with swatches, Biggest changes thumbnails, Components with no story.
- Sidebar: PR link, commit, progress, filters with counts, search, list mode, Hide reviewed.
- By area: areas and components collapse, and story rows show dot, percent and tick.
- Same change: groups largest first, then On their own. Labels are readable.
- Story: tabs with percent, "no change" disabled, side by side, slider dragging, diff, fit and 100%, and synced scrolling at 100%.
- Group: largest capture, swatches, thumbnails, picking one, Show all.
- New, removed and failed stories each look right.
- Looks right moves on, Undo reviewed, progress, and Continue review after a reload.
- Keyboard: arrows, R, C, 1, 2, 3, Z, G, /, ?, Esc.
- A story's address opens it, an unknown address opens the Overview, and back works.
- Everything reviewed: the approve link, or "Fix the failed stories first".
- No console errors.

- [ ] **Step 5: Check at phone width (400×800), light and dark**

Stories button, drawer opens and closes on a row and on the backdrop, bottom bar wraps, no horizontal page scroll, and the images fit.

- [ ] **Step 6: Fix what's wrong, and rebuild**

Compare with the approved mockup at `http://127.0.0.1:4177/` for layout and look. For each difference from the spec or mockup: fix it, add a test if it's logic, run `npm run visual:page`, reload and check again. Commit each fix with the built file:

```bash
git add <the files you changed> scripts/visual/report/dist/index.html
git commit -m "KAN-158: <what the fix does>"
```

- [ ] **Step 7: Clean up the check**

Stop both servers, close the browser tabs, reset any emulated size. Delete `visual-output/check-real.ts` and `visual-output/report-new`.

---

## Task 13: Final checks and the PR

- [ ] **Step 1: Run every check**

Run, one at a time:

```bash
npm run visual:page
git status --porcelain -- scripts/visual/report/dist/index.html
npx tsc --noEmit
npx eslint .
npx vitest run
npx next build
```

Expected: `git status` prints nothing. `tsc`, `vitest` and `next build` are clean, and `next build` passing also proves the `@source not` line in `app/globals.css` parses. `eslint` shows only the two warnings that were there before, in `components/manage/ThemePicker.test.tsx` and `components/plan/UsagePanel.tsx`. Check whether `next build` or a dev run changed `AGENTS.md`; if it did, revert that with `git checkout -- AGENTS.md`.

- [ ] **Step 2: Bring the branch up to date with `staging`**

```bash
git fetch origin staging
git merge origin/staging
```

If the merge brings in changes, run `npm run visual:page` and the tests again. A changed React version changes the built file, so commit it if it differs.

- [ ] **Step 3: Push and open the PR**

Write the body to a file in the scratchpad. Name only KAN-158 in it, because naming another ticket moves that ticket to In Review. The body says: what changed, the measurements from Task 12 (groups, largest group, `buildSeconds`, `signingMs`), what was checked by hand at both widths, that the new page only takes effect on PRs whose base commit has it, and the `app/globals.css` line. It ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

```bash
git push -u origin claude/kan-158-report-page
gh pr create --base staging --title "KAN-158: Redesign the visual check report page" --body-file "C:/Users/User/AppData/Local/Temp/claude/70ab987e8384f8dd/f4c3042a-3b12-4322-9aea-3d106840dbe2/scratchpad/kan-158-pr-body.md"
```

- [ ] **Step 4: Bind the PR and read its checks**

Use `get_status` and, if it doesn't report the PR, `bind_pr`. The PR's own capture job runs the new rebuild check on Linux, which proves Windows and Linux build the same file. If it fails with "The report page is out of date", build the page in the Playwright container used by CI, or fix what differs, and push again. Never poll CI.

- [ ] **Step 5: Tell the owner, then wait**

Send the PR link. The visual check should be green, because this PR changes no story. Merging needs the owner's say. After it merges, a real PR's report uses the new page, which is the last check in the spec. KAN-158 is Done only after a release.
