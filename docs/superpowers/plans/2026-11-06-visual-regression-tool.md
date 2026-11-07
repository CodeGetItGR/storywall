# Visual Regression Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Chromatic with a small tool in this repo that captures every Storybook story on each PR, compares against the commit the PR branched from, and blocks the merge until the owner approves any visual change.

**Architecture:** A TypeScript command (`scripts/visual/run.ts`) builds Storybook, captures it with `playwright-core` and writes a static report. Dependency-free `.mjs` scripts publish that report to a separate public repo on GitHub Pages, keep one PR comment up to date, and set a commit status named `visual-regression`. Approval is a checkbox in that comment, handled by an `issue_comment` workflow.

**Tech Stack:** Storybook 10 (`@storybook/nextjs-vite`), `playwright-core` 1.55.0, `sharp`, Vitest, GitHub Actions, GitHub Pages.

**Spec:** [docs/superpowers/specs/2026-11-06-visual-regression-tool-design.md](../specs/2026-11-06-visual-regression-tool-design.md)

---

## How this plan is organised

There are five parts, one per Jira ticket. Each part is its own branch from the latest `staging` and its own PR into `staging`, with the ticket key in the branch name, PR title and every commit.

| Part | Ticket | Branch |
|---|---|---|
| 0 | KAN-151 | `claude/kan-151-visual-regression-tool` (spec and this plan) |
| 1 | KAN-152 | `claude/kan-152-storybook-without-chromatic` |
| 2 | KAN-153 | `claude/kan-153-visual-tool` |
| 3 | KAN-154 | `claude/kan-154-visual-stability` |
| 4 | KAN-155 | `claude/kan-155-visual-reports` |
| 5 | KAN-156 | Repo settings, plus a small branch if anything needs fixing |

Every commit message ends with the attribution trailer for the session. Stage files by name, and never use `--no-verify`. Run `npx eslint --fix <files>` on new code before each commit, so Prettier's formatting and the import order are applied.

Before each PR, run all of these and fix anything they report:

```bash
npx tsc --noEmit
npx eslint .
npx vitest run
```

## File map

| File | Part | Responsibility |
|---|---|---|
| `.storybook/*` | 1 | Storybook setup from PR #64, without Chromatic |
| `scripts/visual/config.ts` | 2 | Widths, languages, tags, thresholds |
| `scripts/visual/types.ts` | 2 | Shared types |
| `scripts/visual/stories.ts` | 2 | Turns Storybook's `index.json` into a capture list |
| `scripts/visual/pool.ts` | 2 | Runs async work with a concurrency limit |
| `scripts/visual/server.ts` | 2 | Static server for a Storybook build |
| `scripts/visual/images.ts` | 2 | Decode, hash, pad, diff, WebP, preview |
| `scripts/visual/compare.ts` | 2 | Compares two PNGs against the thresholds |
| `scripts/visual/fingerprint.ts` | 2 | Hash of the set of changes |
| `scripts/visual/missingStories.ts` | 2 | Finds new components with no story |
| `scripts/visual/capture.ts` | 2 | Playwright capture and wait rules |
| `scripts/visual/report.ts` | 2 | Sorts captures into states, writes `manifest.json` and images |
| `scripts/visual/report/index.html` | 2 | Static report page |
| `scripts/visual/run.ts` | 2 | Command-line entry |
| `scripts/visual/publish/manifest.mjs` | 4 | Validates the manifest |
| `scripts/visual/publish/comment.mjs` | 4 | Renders and parses the PR comment |
| `scripts/visual/publish/decisions.mjs` | 4 | Status, approval and tick rules |
| `scripts/visual/publish/github.mjs` | 4 | Small GitHub REST client |
| `scripts/visual/publish/reportsRepo.mjs` | 4 | Pushes to the reports repo with retries |
| `scripts/visual/publish.mjs` | 4 | Entry: publish a report |
| `scripts/visual/approve.mjs` | 4 | Entry: handle a tick |
| `scripts/visual/cleanup.mjs` | 4 | Entry: delete a closed PR's report |
| `.github/workflows/visual-*.yml` | 4 | The four workflows |

---

# Part 0: Land the spec and this plan (KAN-151)

### Task 0.1: Open the docs PR

**Files:** `docs/superpowers/specs/2026-11-06-visual-regression-tool-design.md`, `docs/superpowers/plans/2026-11-06-visual-regression-tool.md`

- [ ] **Step 1: Check the branch is on the latest staging**

```bash
git fetch origin staging
git rev-list --left-right --count origin/staging...HEAD
```

Expected: the first number is `0`. If not, merge `origin/staging` into the branch.

- [ ] **Step 2: Push and open the PR**

```bash
git push -u origin claude/kan-151-visual-regression-tool
gh pr create --base staging --title "KAN-151: visual regression tool design and plan" --body "Design and implementation plan for replacing Chromatic. Docs only."
```

---

# Part 1: Bring Storybook back, without Chromatic (KAN-152)

Done when `npm run build-storybook`, `tsc`, `eslint` and `vitest` all pass. Story errors are fixed in Part 2, because the capture tool is what finds them.

### Task 1.1: Merge PR #64's branch onto the latest staging

**Files:**
- Modify: `components/layout/RootDocument.tsx`, `package.json`, `package-lock.json` (conflicts)

- [ ] **Step 1: Create the branch and merge**

```bash
git fetch origin staging claude/storybook-stories-batch2
git switch -c claude/kan-152-storybook-without-chromatic origin/staging
git merge --no-commit origin/claude/storybook-stories-batch2
```

Expected: conflicts in exactly `components/layout/RootDocument.tsx`, `package.json` and `package-lock.json`. If other files conflict, stop and look at why before continuing.

- [ ] **Step 2: Resolve `RootDocument.tsx`**

Keep the branch's import of `rootFontClassName` and remove the `next/font/google` import and the three font constants. Keep staging's class list. The `<html>` line must be exactly:

```tsx
<html lang={locale} className={`${rootFontClassName} h-dvh scroll-pt-[var(--site-notice-h,0px)] bg-background`}>
```

- [ ] **Step 3: Resolve `package.json`**

Take staging's version of every conflicting line, then make sure the scripts include these two, and nothing about Chromatic:

```json
"storybook": "storybook dev -p 6006",
"build-storybook": "storybook build",
```

Keep these from the branch in `devDependencies`: `@storybook/addon-a11y`, `@storybook/nextjs-vite`, `msw-storybook-addon`, `storybook`, `vite`. Remove `chromatic` and `@chromatic-com/storybook`.

- [ ] **Step 4: Regenerate the lockfile**

```bash
git checkout origin/staging -- package-lock.json
npm install
```

Expected: finishes without peer dependency errors. If Storybook refuses Next 16.4.5, stop and report it to the owner, because the spec lists this as a risk.

- [ ] **Step 5: Confirm the approved text fix came through**

```bash
git diff origin/staging -- messages/en.json messages/el.json
```

Expected: exactly one added line per file under `PostModal`: `"cancel": "Cancel"` in English and `"cancel": "Ακύρωση"` in Greek. The owner approved this wording. Any other text change must be removed, and shown to the owner before it comes back.

- [ ] **Step 6: Commit the merge**

```bash
git add components/layout/RootDocument.tsx package.json package-lock.json
git commit -m "KAN-152: bring in Storybook from PR #64"
```

### Task 1.2: Remove Chromatic from Storybook's setup

**Files:**
- Delete: `.github/workflows/chromatic.yml`, `.storybook/modes.ts`
- Modify: `.storybook/main.ts`, `.storybook/preview.tsx`

- [ ] **Step 1: Delete the workflow and the modes helper**

```bash
git rm .github/workflows/chromatic.yml .storybook/modes.ts
```

- [ ] **Step 2: Remove the addon**

In `.storybook/main.ts`, change the `addons` line to:

```ts
addons: ['@storybook/addon-a11y', 'msw-storybook-addon'],
```

- [ ] **Step 3: Remove the Chromatic parameter**

In `.storybook/preview.tsx`, delete these lines from `parameters`:

```tsx
// Every story is snapshotted at both breakpoints: host and guest screens are mobile-first.
chromatic: {
    modes: {
        mobile: { viewport: 'mobile' },
        desktop: { viewport: 'desktop' },
    },
},
```

- [ ] **Step 4: Check for leftovers**

```bash
git grep -n -i chromatic -- . ':!docs/superpowers' ':!package-lock.json'
```

Expected: matches only in `components/**/*.stories.tsx` (fixed in Task 1.3) and `docs/storybook.md` (fixed in Task 1.4).

- [ ] **Step 5: Commit**

```bash
git add .storybook/main.ts .storybook/preview.tsx
git commit -m "KAN-152: remove Chromatic from the Storybook setup"
```

### Task 1.3: Replace Chromatic settings in stories with tags

**Files:** the 10 story files below. Tags are static strings that Storybook copies into `index.json`, so the tool can read them without loading a story.

- [ ] **Step 1: `components/feed/Banner.stories.tsx`**

```tsx
export const WithGlow: Story = {
    args: { glowVisible: true },
    tags: ['visual-skip'],
};
```

- [ ] **Step 2: `components/feed/Countdown.stories.tsx`**

Replace the `parameters` line in `JustStarted` with:

```tsx
tags: ['visual-skip'],
```

- [ ] **Step 3: `components/ui/modal.stories.tsx`**

```tsx
export const Interactive: Story = {
    render: () => <ToggleModal />,
    // Closed at rest, so there is nothing new to capture.
    tags: ['visual-skip'],
};
```

- [ ] **Step 4: `components/feed/QuickAccessBar.stories.tsx`**

Delete the `desktopOnly` import. In `meta`, replace `parameters: { ...desktopOnly },` with:

```tsx
tags: ['visual-desktop-only'],
```

- [ ] **Step 5: `components/layout/DesktopNavRail.stories.tsx` and `components/layout/RightContextPanel.stories.tsx`**

In both, delete the `desktopOnly` import, delete the `...desktopOnly,` line from `parameters`, and add this to `meta`, directly above `parameters`:

```tsx
tags: ['visual-desktop-only'],
```

- [ ] **Step 6: `components/layout/MobileTabBar.stories.tsx`**

Delete the `mobileOnly` import, delete the `...mobileOnly,` line from `parameters`, and add this to `meta`, directly above `parameters`:

```tsx
tags: ['visual-mobile-only'],
```

- [ ] **Step 7: `components/layout/mobile-tab-bar/ComposerFab.stories.tsx` and `components/layout/mobile-tab-bar/ContextMenuTab.stories.tsx`**

In both, delete the `mobileOnly` import and replace the `parameters` line with:

```tsx
parameters: { layout: 'fullscreen' },
tags: ['visual-mobile-only'],
```

- [ ] **Step 8: `components/layout/mobile-tab-bar/ContextNavSlot.stories.tsx`**

Delete the `mobileOnly` import and replace `parameters: mobileOnly,` with:

```tsx
tags: ['visual-mobile-only'],
```

- [ ] **Step 9: Commit**

```bash
git add components/feed/Banner.stories.tsx components/feed/Countdown.stories.tsx components/ui/modal.stories.tsx components/feed/QuickAccessBar.stories.tsx components/layout/DesktopNavRail.stories.tsx components/layout/RightContextPanel.stories.tsx components/layout/MobileTabBar.stories.tsx components/layout/mobile-tab-bar/ComposerFab.stories.tsx components/layout/mobile-tab-bar/ContextMenuTab.stories.tsx components/layout/mobile-tab-bar/ContextNavSlot.stories.tsx
git commit -m "KAN-152: mark stories with visual tags instead of Chromatic settings"
```

### Task 1.4: Update the Storybook docs

**Files:** Modify: `docs/storybook.md`

- [ ] **Step 1: Replace the top of the file**

Replace everything above `## Writing stories` with:

```markdown
# Storybook

- `npm run storybook` starts Storybook on http://localhost:6006.
- `npm run build-storybook` builds it into `storybook-static/`.
```

- [ ] **Step 2: Replace the two paragraphs that describe snapshots**

Replace the paragraphs starting "Chromatic snapshots every story" and "For a component that only shows at one size" with:

```markdown
The visual check captures every story at mobile (375px) and desktop (1280px), in English and Greek. Three tags change that. They must be plain arrays on the story or on `meta`, because Storybook reads them without running the file:

- `tags: ['visual-skip']`: not captured. Use it for stories that look the same as another story at rest, or that can't be made stable.
- `tags: ['visual-desktop-only']`: captured at 1280px only.
- `tags: ['visual-mobile-only']`: captured at 375px only.

For a component that only shows at one size (the desktop rail, the mobile tab bar), also set `globals: { viewport: { value: 'desktop' } }` (or `'mobile'`) so the Storybook canvas opens at that size.
```

- [ ] **Step 3: Check and commit**

```bash
git grep -n -i chromatic -- . ':!docs/superpowers' ':!package-lock.json'
```

Expected: no output.

```bash
git add docs/storybook.md
git commit -m "KAN-152: update the Storybook docs"
```

### Task 1.5: Verify and open the PR

- [ ] **Step 1: Build Storybook**

```bash
npm run build-storybook
```

Expected: exits 0 and writes `storybook-static/index.json`. 504 commits landed since this branch last built, so a failure here means a story or `.storybook/` file is out of date. Fix the story or the helper, not the component. If a fix would change a component or any text, stop and ask the owner.

- [ ] **Step 2: Confirm the tags reached the index**

```bash
node -e "const e=Object.values(require('./storybook-static/index.json').entries);console.log(e.length,e.filter(x=>x.tags.includes('visual-skip')).map(x=>x.id),e.filter(x=>x.tags.includes('visual-mobile-only')).length,e.filter(x=>x.tags.includes('visual-desktop-only')).length)"
```

Expected: about 287 stories, three `visual-skip` ids, and non-zero counts for both width tags.

- [ ] **Step 3: Run the checks**

```bash
npx tsc --noEmit
npx eslint .
npx vitest run
```

Expected: all clean. Fix type errors in stories the same way as Step 1.

- [ ] **Step 4: Push and open the PR**

```bash
git push -u origin claude/kan-152-storybook-without-chromatic
gh pr create --base staging --title "KAN-152: bring Storybook back, without Chromatic" --body "Replaces PR #64. Storybook 10 and 287 stories, with Chromatic removed. Includes the owner-approved PostModal.cancel text fix (Cancel / Ακύρωση). No visual check yet."
```

---

# Part 2: Capture and compare tool (KAN-153)

Done when a local run compares two commits correctly and every story captures with no failures.

### Task 2.1: Config, types and scaffolding

**Files:**
- Create: `scripts/visual/config.ts`, `scripts/visual/types.ts`
- Modify: `package.json`, `.gitignore`, `eslint.config.mjs`, `vitest.config.ts`

- [ ] **Step 1: Create the branch**

```bash
git fetch origin staging
git switch -c claude/kan-153-visual-tool origin/staging
```

- [ ] **Step 2: Create `scripts/visual/config.ts`**

```ts
export const LOCALES = ['en', 'el'] as const;
export type CaptureLocale = (typeof LOCALES)[number];

export const BROWSER_LOCALES: Record<CaptureLocale, string> = { en: 'en-US', el: 'el-GR' };

export const WIDTHS = [
    { name: 'mobile', width: 375, height: 812 },
    { name: 'desktop', width: 1280, height: 800 },
] as const;
export type WidthName = (typeof WIDTHS)[number]['name'];

export const TAG_SKIP = 'visual-skip';
export const TAG_DESKTOP_ONLY = 'visual-desktop-only';
export const TAG_MOBILE_ONLY = 'visual-mobile-only';

// A pixel differs when a channel is further apart than this. comparePixels'
// default of 16 would miss subtle colour changes.
export const CHANNEL_TOLERANCE = 2;
// A capture counts as changed when more pixels than this differ.
export const PIXEL_BUDGET = 10;
// A capture that differs is taken again this many times before it counts.
export const RETAKES = 2;
// Retakes stop after this many captures. That many differences means a real change,
// and retaking every capture would overrun the job.
export const MAX_RETAKEN_CAPTURES = 50;

export const CONCURRENCY = 4;
export const RENDER_TIMEOUT_MS = 30_000;
export const STABLE_FRAME_ATTEMPTS = 10;
export const STABLE_FRAME_DELAY_MS = 250;

// Fonts come from Google at run time in Storybook, so that host stays reachable.
export const HOST_RESOLVER_RULES = 'MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost, EXCLUDE fonts.gstatic.com';
```

- [ ] **Step 3: Create `scripts/visual/types.ts`**

```ts
import type { CaptureLocale, WidthName } from './config';

export type CaptureTarget = { id: string; storyId: string; title: string; name: string; locale: CaptureLocale; width: WidthName };

export type CaptureRecord = CaptureTarget & { status: 'ok' | 'failed'; hash: string | null; error: string | null };

export type CaptureState = 'changed' | 'new' | 'removed' | 'failed';

export type ReportEntry = CaptureTarget & {
    state: CaptureState;
    beforeHash: string | null;
    afterHash: string | null;
    percent: number;
    error: string | null;
    images: { before?: string; after?: string; diff?: string; preview?: string };
};

export type Manifest = {
    headSha: string;
    baseSha: string;
    totalCaptures: number;
    counts: Record<CaptureState, number>;
    fingerprint: string;
    entries: ReportEntry[];
    missingStories: string[];
};
```

- [ ] **Step 4: Add the script to `package.json`**

```json
"visual": "jiti scripts/visual/run.ts",
```

- [ ] **Step 5: Ignore the output folder**

Add to `.gitignore`:

```
# Visual check
visual-output/
```

Add `'visual-output/**',` to `globalIgnores` in `eslint.config.mjs`.

In `vitest.config.ts`, change the `exclude` line to:

```ts
exclude: [...configDefaults.exclude, '.claude/**', 'visual-output/**'],
```

- [ ] **Step 6: Commit**

```bash
git add scripts/visual/config.ts scripts/visual/types.ts package.json .gitignore eslint.config.mjs vitest.config.ts
git commit -m "KAN-153: visual tool config and types"
```

### Task 2.2: Capture list from Storybook's index

**Files:**
- Create: `scripts/visual/stories.ts`
- Test: `scripts/visual/stories.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { buildCaptureList, captureId, type StoryIndex } from './stories';

const story = (id: string, tags: string[] = []) => ({ id, title: 'UI/Button', name: 'Default', type: 'story', tags });

const index = (...entries: ReturnType<typeof story>[]): StoryIndex => ({
    v: 5,
    entries: Object.fromEntries(entries.map((entry) => [entry.id, entry])),
});

describe('buildCaptureList', () => {
    it('captures a story in both languages at both widths', () => {
        const ids = buildCaptureList(index(story('ui-button--default'))).map((target) => target.id);
        expect(ids).toEqual([
            'ui-button--default--el--desktop',
            'ui-button--default--el--mobile',
            'ui-button--default--en--desktop',
            'ui-button--default--en--mobile',
        ]);
    });

    it('skips stories tagged visual-skip', () => {
        expect(buildCaptureList(index(story('a--b', ['visual-skip'])))).toEqual([]);
    });

    it('limits width-tagged stories to that width', () => {
        const desktop = buildCaptureList(index(story('a--b', ['visual-desktop-only'])));
        const mobile = buildCaptureList(index(story('a--c', ['visual-mobile-only'])));
        expect(desktop.map((target) => target.width)).toEqual(['desktop', 'desktop']);
        expect(mobile.map((target) => target.width)).toEqual(['mobile', 'mobile']);
    });

    it('ignores docs entries', () => {
        const docs = { ...story('a--docs'), type: 'docs' };
        expect(buildCaptureList(index(docs))).toEqual([]);
    });

    it('keeps the story details on each target', () => {
        const [target] = buildCaptureList(index(story('a--b')));
        expect(target).toMatchObject({ storyId: 'a--b', title: 'UI/Button', name: 'Default', locale: 'el', width: 'desktop' });
        expect(target.id).toBe(captureId('a--b', 'el', 'desktop'));
    });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npx vitest run scripts/visual/stories.test.ts
```

Expected: FAIL, cannot find `./stories`.

- [ ] **Step 3: Write `scripts/visual/stories.ts`**

```ts
import { type CaptureLocale, LOCALES, TAG_DESKTOP_ONLY, TAG_MOBILE_ONLY, TAG_SKIP, type WidthName, WIDTHS } from './config';
import type { CaptureTarget } from './types';

type IndexEntry = { id: string; title: string; name: string; type: string; tags?: string[] };
export type StoryIndex = { v: number; entries: Record<string, IndexEntry> };

export const captureId = (storyId: string, locale: CaptureLocale, width: WidthName) => `${storyId}--${locale}--${width}`;

function widthsFor(tags: string[]): WidthName[] {
    if (tags.includes(TAG_DESKTOP_ONLY)) return ['desktop'];
    if (tags.includes(TAG_MOBILE_ONLY)) return ['mobile'];
    return WIDTHS.map((width) => width.name);
}

// Sorted, so runs capture in the same order and logs can be compared.
export function buildCaptureList(index: StoryIndex): CaptureTarget[] {
    const targets: CaptureTarget[] = [];
    for (const entry of Object.values(index.entries)) {
        const tags = entry.tags ?? [];
        if (entry.type !== 'story' || tags.includes(TAG_SKIP)) continue;
        for (const locale of LOCALES) {
            for (const width of widthsFor(tags)) {
                targets.push({ id: captureId(entry.id, locale, width), storyId: entry.id, title: entry.title, name: entry.name, locale, width });
            }
        }
    }
    return targets.sort((a, b) => a.id.localeCompare(b.id));
}
```

- [ ] **Step 4: Run the test**

```bash
npx vitest run scripts/visual/stories.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/visual/stories.ts scripts/visual/stories.test.ts
git commit -m "KAN-153: build the capture list from Storybook's index"
```

### Task 2.3: Concurrency pool

**Files:**
- Create: `scripts/visual/pool.ts`
- Test: `scripts/visual/pool.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { runPool } from './pool';

describe('runPool', () => {
    it('keeps results in input order', async () => {
        const result = await runPool([30, 10, 20], 2, async (delay) => {
            await new Promise((done) => setTimeout(done, delay));
            return delay * 2;
        });
        expect(result).toEqual([60, 20, 40]);
    });

    it('never runs more than the limit at once', async () => {
        let running = 0;
        let peak = 0;
        await runPool([1, 2, 3, 4, 5, 6], 2, async () => {
            running += 1;
            peak = Math.max(peak, running);
            await new Promise((done) => setTimeout(done, 5));
            running -= 1;
        });
        expect(peak).toBe(2);
    });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npx vitest run scripts/visual/pool.test.ts
```

Expected: FAIL, cannot find `./pool`.

- [ ] **Step 3: Write `scripts/visual/pool.ts`**

```ts
export async function runPool<Item, Result>(items: Item[], limit: number, work: (item: Item) => Promise<Result>): Promise<Result[]> {
    const results = new Array<Result>(items.length);
    let next = 0;
    async function worker() {
        while (next < items.length) {
            const index = next;
            next += 1;
            results[index] = await work(items[index]);
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return results;
}
```

- [ ] **Step 4: Run the test**

```bash
npx vitest run scripts/visual/pool.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/visual/pool.ts scripts/visual/pool.test.ts
git commit -m "KAN-153: add a concurrency pool"
```

### Task 2.4: Static server

**Files:**
- Create: `scripts/visual/server.ts`
- Test: `scripts/visual/server.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { serveStatic } from './server';

describe('serveStatic', () => {
    let parent: string;
    let root: string;
    let server: Awaited<ReturnType<typeof serveStatic>>;

    beforeEach(async () => {
        parent = mkdtempSync(join(tmpdir(), 'visual-server-'));
        root = join(parent, 'site');
        mkdirSync(root);
        writeFileSync(join(root, 'mockServiceWorker.js'), 'self.x = 1;');
        writeFileSync(join(parent, 'secret.txt'), 'secret');
        server = await serveStatic(root);
    });

    afterEach(async () => {
        await server.close();
        rmSync(parent, { recursive: true, force: true });
    });

    it('serves a file with its content type', async () => {
        const response = await fetch(`${server.origin}/mockServiceWorker.js`);
        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toContain('javascript');
        expect(await response.text()).toBe('self.x = 1;');
    });

    it('answers 404 for a missing file', async () => {
        expect((await fetch(`${server.origin}/nope.js`)).status).toBe(404);
    });

    // An encoded slash survives URL parsing, so this reaches the server as a path outside the root.
    it('does not serve files outside the root', async () => {
        const response = await fetch(`${server.origin}/..%2fsecret.txt`);
        expect(response.status).toBe(404);
    });

    it('answers 404 for a malformed path', async () => {
        expect((await fetch(`${server.origin}/%E0%A4%A`)).status).toBe(404);
    });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npx vitest run scripts/visual/server.test.ts
```

Expected: FAIL, cannot find `./server`.

- [ ] **Step 3: Write `scripts/visual/server.ts`**

```ts
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, resolve, sep } from 'node:path';

const CONTENT_TYPES: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
};

function resolveInside(root: string, url: string): string | null {
    try {
        const file = resolve(join(root, decodeURIComponent(new URL(url, 'http://local').pathname)));
        return file.startsWith(root + sep) ? file : null;
    } catch {
        return null;
    }
}

export async function serveStatic(root: string): Promise<{ origin: string; close: () => Promise<void> }> {
    const absoluteRoot = resolve(root);
    const server = createServer((request, response) => {
        const file = resolveInside(absoluteRoot, request.url ?? '/');
        if (!file || !existsSync(file) || !statSync(file).isFile()) {
            response.writeHead(404);
            response.end();
            return;
        }
        response.writeHead(200, { 'content-type': CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream' });
        response.end(readFileSync(file));
    });
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    const { port } = server.address() as AddressInfo;
    return {
        origin: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => server.close(() => done())),
    };
}
```

- [ ] **Step 4: Run the test**

```bash
npx vitest run scripts/visual/server.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/visual/server.ts scripts/visual/server.test.ts
git commit -m "KAN-153: add a static server for Storybook builds"
```

### Task 2.5: Image helpers and comparison

**Files:**
- Create: `scripts/visual/images.ts`, `scripts/visual/compare.ts`
- Test: `scripts/visual/compare.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment node
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { comparePngs, isChanged } from './compare';
import { decodePng, hashRaw } from './images';

const solid = (r: number, g: number, b: number, width = 20, height = 20) =>
    sharp({ create: { width, height, channels: 4, background: { r, g, b, alpha: 1 } } })
        .png()
        .toBuffer();

async function withDots(count: number) {
    const dot = await solid(0, 0, 0, 1, 1);
    return sharp(await solid(255, 255, 255))
        .composite(Array.from({ length: count }, (_, index) => ({ input: dot, left: index, top: 0 })))
        .png()
        .toBuffer();
}

describe('comparePngs', () => {
    it('treats identical images as unchanged', async () => {
        expect(isChanged(await comparePngs(await solid(10, 10, 10), await solid(10, 10, 10)))).toBe(false);
    });

    it('catches a subtle colour change the old default tolerance would miss', async () => {
        expect(isChanged(await comparePngs(await solid(244, 244, 245), await solid(250, 250, 250)))).toBe(true);
    });

    it('ignores a change within the channel tolerance', async () => {
        expect(isChanged(await comparePngs(await solid(100, 100, 100), await solid(102, 102, 102)))).toBe(false);
    });

    it('allows up to the pixel budget', async () => {
        const white = await solid(255, 255, 255);
        expect(isChanged(await comparePngs(white, await withDots(10)))).toBe(false);
        expect(isChanged(await comparePngs(white, await withDots(11)))).toBe(true);
    });

    it('counts a size change as changed, even when the pixels match', async () => {
        const diff = await comparePngs(await solid(0, 0, 0, 20, 20), await solid(0, 0, 0, 20, 21));
        expect(diff.sizeChanged).toBe(true);
        expect(isChanged(diff)).toBe(true);
    });
});

describe('hashRaw', () => {
    it('is the same for the same pixels and differs for other pixels', async () => {
        const first = hashRaw(await decodePng(await solid(1, 2, 3)));
        expect(hashRaw(await decodePng(await solid(1, 2, 3)))).toBe(first);
        expect(hashRaw(await decodePng(await solid(1, 2, 4)))).not.toBe(first);
    });

    it('differs for the same pixels in another shape', async () => {
        const wide = hashRaw(await decodePng(await solid(1, 2, 3, 40, 10)));
        const tall = hashRaw(await decodePng(await solid(1, 2, 3, 10, 40)));
        expect(wide).not.toBe(tall);
    });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npx vitest run scripts/visual/compare.test.ts
```

Expected: FAIL, cannot find `./compare`.

- [ ] **Step 3: Write `scripts/visual/images.ts`**

```ts
import { createHash } from 'node:crypto';

import sharp from 'sharp';

export type Raw = { data: Uint8Array; width: number; height: number };

const WEBP_MAX_SIDE = 16000;
const PREVIEW_PART_WIDTH = 294;
const PREVIEW_PART_MAX_HEIGHT = 600;
const PREVIEW_GAP = 12;

const fromRaw = ({ data, width, height }: Raw) => sharp(Buffer.from(data), { raw: { width, height, channels: 4 } });

export async function decodePng(png: Buffer): Promise<Raw> {
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
}

// Hashes decoded pixels, so a different PNG encoding of the same image hashes the same.
export function hashRaw({ data, width, height }: Raw): string {
    return createHash('sha256').update(`${width}x${height}:`).update(data).digest('hex');
}

export async function padRaw(raw: Raw, width: number, height: number): Promise<Raw> {
    if (raw.width === width && raw.height === height) return raw;
    const { data } = await fromRaw(raw)
        .extend({ right: width - raw.width, bottom: height - raw.height, background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .raw()
        .toBuffer({ resolveWithObject: true });
    return { data, width, height };
}

// Differing pixels in red over a faded copy of the image.
export function diffImage(base: Raw, mask: Uint8Array): Raw {
    const data = new Uint8Array(base.data.length);
    for (let i = 0; i < mask.length; i += 1) {
        const p = i * 4;
        if (mask[i]) {
            data[p] = 255;
            data[p + 1] = 0;
            data[p + 2] = 0;
        } else {
            data[p] = 255 - (255 - base.data[p]) * 0.25;
            data[p + 1] = 255 - (255 - base.data[p + 1]) * 0.25;
            data[p + 2] = 255 - (255 - base.data[p + 2]) * 0.25;
        }
        data[p + 3] = 255;
    }
    return { data, width: base.width, height: base.height };
}

export function rawToWebp(raw: Raw): Promise<Buffer> {
    return fromRaw(raw).resize({ width: WEBP_MAX_SIDE, height: WEBP_MAX_SIDE, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
}

// One or two images side by side, 600px wide, for the PR comment.
export async function makePreview(parts: Raw[]): Promise<Buffer> {
    const images = await Promise.all(
        parts.map((part) =>
            fromRaw(part)
                .resize({ width: PREVIEW_PART_WIDTH, height: PREVIEW_PART_MAX_HEIGHT, fit: 'inside', withoutEnlargement: true })
                .png()
                .toBuffer({ resolveWithObject: true }),
        ),
    );
    const height = Math.max(...images.map((image) => image.info.height));
    return sharp({ create: { width: PREVIEW_PART_WIDTH * 2 + PREVIEW_GAP, height, channels: 4, background: '#e5e5e5' } })
        .composite(images.map((image, index) => ({ input: image.data, left: index * (PREVIEW_PART_WIDTH + PREVIEW_GAP), top: 0 })))
        .webp({ quality: 80 })
        .toBuffer();
}
```

- [ ] **Step 4: Write `scripts/visual/compare.ts`**

```ts
import { comparePixels } from '../../lib/invitation/parity';
import { CHANNEL_TOLERANCE, PIXEL_BUDGET } from './config';
import { decodePng, padRaw, type Raw } from './images';

export type ImageDiff = { before: Raw; after: Raw; mask: Uint8Array; differing: number; percent: number; sizeChanged: boolean };

export async function comparePngs(beforePng: Buffer, afterPng: Buffer): Promise<ImageDiff> {
    const [rawBefore, rawAfter] = await Promise.all([decodePng(beforePng), decodePng(afterPng)]);
    const width = Math.max(rawBefore.width, rawAfter.width);
    const height = Math.max(rawBefore.height, rawAfter.height);
    const [before, after] = await Promise.all([padRaw(rawBefore, width, height), padRaw(rawAfter, width, height)]);
    const { mask, differing, percent } = comparePixels(before.data, after.data, width, height, CHANNEL_TOLERANCE);
    return { before, after, mask, differing, percent, sizeChanged: rawBefore.width !== rawAfter.width || rawBefore.height !== rawAfter.height };
}

export const isChanged = (diff: ImageDiff) => diff.sizeChanged || diff.differing > PIXEL_BUDGET;
```

- [ ] **Step 5: Run the test**

```bash
npx vitest run scripts/visual/compare.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/visual/images.ts scripts/visual/compare.ts scripts/visual/compare.test.ts
git commit -m "KAN-153: compare captures against the visual thresholds"
```

### Task 2.6: Fingerprint and missing stories

**Files:**
- Create: `scripts/visual/fingerprint.ts`, `scripts/visual/missingStories.ts`
- Test: `scripts/visual/fingerprint.test.ts`, `scripts/visual/missingStories.test.ts`

- [ ] **Step 1: Write `scripts/visual/fingerprint.test.ts`**

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { fingerprint } from './fingerprint';

const entry = { id: 'a', state: 'changed' as const, beforeHash: 'b1', afterHash: 'h1' };

describe('fingerprint', () => {
    it('ignores the order of entries', () => {
        const other = { ...entry, id: 'b' };
        expect(fingerprint([entry, other])).toBe(fingerprint([other, entry]));
    });

    it('changes when an image changes', () => {
        expect(fingerprint([entry])).not.toBe(fingerprint([{ ...entry, afterHash: 'h2' }]));
        expect(fingerprint([entry])).not.toBe(fingerprint([{ ...entry, beforeHash: 'b2' }]));
    });

    it('changes when the state changes', () => {
        expect(fingerprint([entry])).not.toBe(fingerprint([{ ...entry, state: 'new' }]));
    });
});
```

- [ ] **Step 2: Write `scripts/visual/missingStories.test.ts`**

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { findMissingStories } from './missingStories';

describe('findMissingStories', () => {
    const existing = new Set(['components/feed/Card.stories.tsx']);
    const exists = (path: string) => existing.has(path);

    it('lists a new component with no story', () => {
        expect(findMissingStories(['components/feed/Other.tsx'], exists)).toEqual(['components/feed/Other.tsx']);
    });

    it('skips a component with a story', () => {
        expect(findMissingStories(['components/feed/Card.tsx'], exists)).toEqual([]);
    });

    it('skips tests, stories, non-components and other folders', () => {
        expect(
            findMissingStories(['components/feed/Other.test.tsx', 'components/feed/Other.stories.tsx', 'components/feed/util.ts', 'app/page.tsx'], exists),
        ).toEqual([]);
    });
});
```

- [ ] **Step 3: Run them and watch them fail**

```bash
npx vitest run scripts/visual/fingerprint.test.ts scripts/visual/missingStories.test.ts
```

Expected: FAIL, modules not found.

- [ ] **Step 4: Write `scripts/visual/fingerprint.ts`**

```ts
import { createHash } from 'node:crypto';

import type { ReportEntry } from './types';

// Identifies a PR's set of visual changes, so an approval can outlive a push that changes nothing visually.
export function fingerprint(entries: Pick<ReportEntry, 'id' | 'state' | 'beforeHash' | 'afterHash'>[]): string {
    const lines = entries.map((entry) => `${entry.id}|${entry.state}|${entry.beforeHash ?? ''}|${entry.afterHash ?? ''}`).sort();
    return createHash('sha256').update(lines.join('\n')).digest('hex');
}
```

- [ ] **Step 5: Write `scripts/visual/missingStories.ts`**

```ts
export function findMissingStories(added: string[], exists: (path: string) => boolean): string[] {
    return added.filter(
        (file) =>
            file.startsWith('components/') &&
            file.endsWith('.tsx') &&
            !file.endsWith('.test.tsx') &&
            !file.endsWith('.stories.tsx') &&
            !exists(file.replace(/\.tsx$/, '.stories.tsx')),
    );
}
```

- [ ] **Step 6: Run the tests**

```bash
npx vitest run scripts/visual/fingerprint.test.ts scripts/visual/missingStories.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add scripts/visual/fingerprint.ts scripts/visual/fingerprint.test.ts scripts/visual/missingStories.ts scripts/visual/missingStories.test.ts
git commit -m "KAN-153: add the change fingerprint and missing story check"
```

### Task 2.7: Sort captures into states and write the report data

**Files:**
- Create: `scripts/visual/report.ts`
- Test: `scripts/visual/report.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment node
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MAX_RETAKEN_CAPTURES, RETAKES } from './config';
import { decodePng, hashRaw } from './images';
import { buildReport } from './report';
import type { CaptureRecord, CaptureTarget, Manifest } from './types';

const solid = (gray: number) =>
    sharp({ create: { width: 20, height: 20, channels: 4, background: { r: gray, g: gray, b: gray, alpha: 1 } } })
        .png()
        .toBuffer();

const target = (id: string): CaptureTarget => ({ id, storyId: id, title: 'UI/Button', name: id, locale: 'en', width: 'mobile' });

describe('buildReport', () => {
    let root: string;
    let baseDir: string;
    let headDir: string;
    let reportDir: string;

    beforeEach(() => {
        root = mkdtempSync(join(tmpdir(), 'visual-report-'));
        baseDir = join(root, 'base');
        headDir = join(root, 'head');
        reportDir = join(root, 'report');
        mkdirSync(baseDir);
        mkdirSync(headDir);
    });

    afterEach(() => rmSync(root, { recursive: true, force: true }));

    async function record(dir: string, id: string, gray: number): Promise<CaptureRecord> {
        const png = await solid(gray);
        writeFileSync(join(dir, `${id}.png`), png);
        return { ...target(id), status: 'ok', hash: hashRaw(await decodePng(png)), error: null };
    }

    const noRetake = () => Promise.reject(new Error('no retake expected'));

    const run = (baseRecords: CaptureRecord[], headRecords: CaptureRecord[], retake: (t: CaptureTarget) => Promise<CaptureRecord> = noRetake) =>
        buildReport({ baseDir, headDir, reportDir, baseRecords, headRecords, baseSha: 'b', headSha: 'h', missingStories: ['components/x/Y.tsx'], retake });

    it('leaves unchanged captures out of the report', async () => {
        const manifest = await run([await record(baseDir, 'a', 10)], [await record(headDir, 'a', 10)]);
        expect(manifest.entries).toEqual([]);
        expect(manifest.counts).toEqual({ changed: 0, new: 0, removed: 0, failed: 0 });
        expect(manifest.totalCaptures).toBe(1);
    });

    it('reports a changed capture with before, after, diff and preview images', async () => {
        const headRecord = await record(headDir, 'a', 200);
        const retake = vi.fn(async () => headRecord);
        const manifest = await run([await record(baseDir, 'a', 10)], [headRecord], retake);
        const [entry] = manifest.entries;
        expect(entry.state).toBe('changed');
        expect(entry.percent).toBe(100);
        expect(retake).toHaveBeenCalledTimes(2);
        for (const image of [entry.images.before, entry.images.after, entry.images.diff, entry.images.preview]) {
            expect(image).toMatch(/^img\/[0-9a-f]{16}-(before|after|diff|preview)\.webp$/);
            expect(existsSync(join(reportDir, image as string))).toBe(true);
        }
    });

    it('drops a difference that a retake clears', async () => {
        const baseRecord = await record(baseDir, 'a', 10);
        const flaky = await record(headDir, 'a', 200);
        const retake = vi.fn(async () => record(headDir, 'a', 10));
        const manifest = await run([baseRecord], [flaky], retake);
        expect(manifest.entries).toEqual([]);
        expect(retake).toHaveBeenCalledTimes(1);
    });

    it('stops retaking after the limit and still reports every change', async () => {
        const ids = Array.from({ length: MAX_RETAKEN_CAPTURES + 2 }, (_, index) => `story-${index}`);
        const baseRecords = await Promise.all(ids.map((id) => record(baseDir, id, 10)));
        const headRecords = await Promise.all(ids.map((id) => record(headDir, id, 200)));
        const retake = vi.fn(async (t: CaptureTarget) => headRecords.find((item) => item.id === t.id) as CaptureRecord);
        const manifest = await run(baseRecords, headRecords, retake);
        expect(manifest.counts.changed).toBe(ids.length);
        expect(retake).toHaveBeenCalledTimes(MAX_RETAKEN_CAPTURES * RETAKES);
    });

    it('reports new, removed and failed captures', async () => {
        const failed: CaptureRecord = { ...target('c'), status: 'failed', hash: null, error: 'Boom' };
        const manifest = await run([await record(baseDir, 'b', 10), await record(baseDir, 'c', 10)], [await record(headDir, 'a', 10), failed]);
        const states = Object.fromEntries(manifest.entries.map((entry) => [entry.id, entry.state]));
        expect(states).toEqual({ a: 'new', b: 'removed', c: 'failed' });
        expect(manifest.counts).toEqual({ changed: 0, new: 1, removed: 1, failed: 1 });
        const failedEntry = manifest.entries.find((entry) => entry.id === 'c');
        expect(failedEntry?.error).toBe('Boom');
        expect(failedEntry?.images).toEqual({});
    });

    it('treats a story that failed on the base as new', async () => {
        const baseFailed: CaptureRecord = { ...target('a'), status: 'failed', hash: null, error: 'Boom' };
        const manifest = await run([baseFailed], [await record(headDir, 'a', 10)]);
        expect(manifest.entries[0].state).toBe('new');
    });

    it('writes manifest.json with the fingerprint and missing stories', async () => {
        const manifest = await run([], [await record(headDir, 'a', 10)]);
        const written = JSON.parse(readFileSync(join(reportDir, 'manifest.json'), 'utf8')) as Manifest;
        expect(written.fingerprint).toBe(manifest.fingerprint);
        expect(written.fingerprint).toMatch(/^[0-9a-f]{64}$/);
        expect(written.missingStories).toEqual(['components/x/Y.tsx']);
    });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npx vitest run scripts/visual/report.test.ts
```

Expected: FAIL, cannot find `./report`.

- [ ] **Step 3: Write `scripts/visual/report.ts`**

```ts
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { comparePngs, type ImageDiff, isChanged } from './compare';
import { CONCURRENCY, MAX_RETAKEN_CAPTURES, RETAKES } from './config';
import { fingerprint } from './fingerprint';
import { decodePng, diffImage, makePreview, rawToWebp } from './images';
import { runPool } from './pool';
import type { CaptureRecord, CaptureState, CaptureTarget, Manifest, ReportEntry } from './types';

type ImageKind = keyof ReportEntry['images'];

type BuildReportInput = {
    baseDir: string;
    headDir: string;
    reportDir: string;
    baseRecords: CaptureRecord[];
    headRecords: CaptureRecord[];
    baseSha: string;
    headSha: string;
    missingStories: string[];
    retake: (target: CaptureTarget) => Promise<CaptureRecord>;
};

const pngPath = (dir: string, id: string) => join(dir, `${id}.png`);

const targetOf = ({ id, storyId, title, name, locale, width }: CaptureTarget): CaptureTarget => ({ id, storyId, title, name, locale, width });

export async function buildReport(input: BuildReportInput): Promise<Manifest> {
    const { baseDir, headDir, reportDir, baseRecords, headRecords, baseSha, headSha, missingStories, retake } = input;
    mkdirSync(join(reportDir, 'img'), { recursive: true });
    let retakesLeft = MAX_RETAKEN_CAPTURES;

    function writeImage(id: string, kind: ImageKind, webp: Buffer): string {
        const name = `${createHash('sha1').update(id).digest('hex').slice(0, 16)}-${kind}.webp`;
        writeFileSync(join(reportDir, 'img', name), webp);
        return `img/${name}`;
    }

    // A capture that differs is retaken, and counts as changed only if every attempt differs.
    async function compareWithRetakes(base: CaptureRecord, head: CaptureRecord): Promise<{ record: CaptureRecord; diff: ImageDiff } | null> {
        const before = readFileSync(pngPath(baseDir, base.id));
        let record = head;
        let diff = await comparePngs(before, readFileSync(pngPath(headDir, head.id)));
        if (!isChanged(diff)) return null;
        const attempts = retakesLeft > 0 ? RETAKES : 0;
        retakesLeft -= 1;
        for (let attempt = 0; attempt < attempts && isChanged(diff); attempt += 1) {
            const retaken = await retake(targetOf(head));
            if (retaken.status !== 'ok') continue;
            record = retaken;
            diff = await comparePngs(before, readFileSync(pngPath(headDir, head.id)));
        }
        return isChanged(diff) ? { record, diff } : null;
    }

    async function changedEntry(base: CaptureRecord, record: CaptureRecord, diff: ImageDiff): Promise<ReportEntry> {
        const diffRaw = diffImage(diff.before, diff.mask);
        return {
            ...targetOf(record),
            state: 'changed',
            beforeHash: base.hash,
            afterHash: record.hash,
            percent: diff.percent,
            error: null,
            images: {
                before: writeImage(record.id, 'before', await rawToWebp(diff.before)),
                after: writeImage(record.id, 'after', await rawToWebp(diff.after)),
                diff: writeImage(record.id, 'diff', await rawToWebp(diffRaw)),
                preview: writeImage(record.id, 'preview', await makePreview([diff.before, diff.after])),
            },
        };
    }

    async function singleImageEntry(record: CaptureRecord, state: 'new' | 'removed', dir: string): Promise<ReportEntry> {
        const raw = await decodePng(readFileSync(pngPath(dir, record.id)));
        const kind = state === 'new' ? 'after' : 'before';
        return {
            ...targetOf(record),
            state,
            beforeHash: state === 'removed' ? record.hash : null,
            afterHash: state === 'new' ? record.hash : null,
            percent: 100,
            error: null,
            images: {
                [kind]: writeImage(record.id, kind, await rawToWebp(raw)),
                preview: writeImage(record.id, 'preview', await makePreview([raw])),
            },
        };
    }

    const baseById = new Map(baseRecords.map((record) => [record.id, record]));
    const headById = new Map(headRecords.map((record) => [record.id, record]));
    const ids = [...new Set([...baseById.keys(), ...headById.keys()])].sort();

    async function entryFor(id: string): Promise<ReportEntry | null> {
        const base = baseById.get(id);
        const head = headById.get(id);
        if (!head) return base?.status === 'ok' ? singleImageEntry(base, 'removed', baseDir) : null;
        if (head.status === 'failed') {
            return { ...targetOf(head), state: 'failed', beforeHash: base?.hash ?? null, afterHash: null, percent: 0, error: head.error, images: {} };
        }
        if (!base || base.status === 'failed') return singleImageEntry(head, 'new', headDir);
        if (base.hash === head.hash) return null;
        const result = await compareWithRetakes(base, head);
        return result ? changedEntry(base, result.record, result.diff) : null;
    }

    const entries = (await runPool(ids, CONCURRENCY, entryFor)).filter((entry) => entry !== null);

    const counts: Record<CaptureState, number> = { changed: 0, new: 0, removed: 0, failed: 0 };
    for (const entry of entries) counts[entry.state] += 1;

    const manifest: Manifest = { headSha, baseSha, totalCaptures: headRecords.length, counts, fingerprint: fingerprint(entries), entries, missingStories };
    writeFileSync(join(reportDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    return manifest;
}
```

- [ ] **Step 4: Run the test**

```bash
npx vitest run scripts/visual/report.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/visual/report.ts scripts/visual/report.test.ts
git commit -m "KAN-153: sort captures into states and write the report data"
```

### Task 2.8: Report page

**Files:** Create: `scripts/visual/report/index.html`

This page is built with DOM APIs only, so nothing from the manifest can inject HTML. Every image gets real alt text. It's a developer tool in English only, so the app's translation rules don't apply.

- [ ] **Step 1: Write the page**

```html
<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        <title>Visual check report</title>
        <style>
            :root {
                color-scheme: light;
                --ink: #1e293b;
                --muted: #64748b;
                --line: #e2e8f0;
                --surface: #f8fafc;
            }
            body {
                margin: 0;
                padding: 16px;
                color: var(--ink);
                background: #fff;
                font: 14px/1.5 system-ui, sans-serif;
            }
            h1 {
                margin: 0;
                font-size: 20px;
            }
            h2 {
                margin: 32px 0 8px;
                font-size: 16px;
            }
            h3 {
                margin: 16px 0 8px;
                color: var(--muted);
                font-size: 13px;
                font-weight: 500;
            }
            #summary {
                margin: 4px 0 16px;
                color: var(--muted);
            }
            .filters {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
            }
            .images {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                align-items: flex-start;
            }
            figure {
                margin: 0;
                max-width: 100%;
            }
            figcaption {
                margin-bottom: 4px;
                color: var(--muted);
                font-size: 12px;
            }
            img {
                display: block;
                max-width: min(100%, 640px);
                height: auto;
                background: var(--surface);
                outline: 1px solid var(--line);
            }
            pre {
                padding: 12px;
                overflow-x: auto;
                background: var(--surface);
            }
        </style>
    </head>
    <body>
        <!-- Header -->
        <header>
            <h1>Visual check</h1>
            <p id="summary">Loading...</p>
            <div class="filters">
                <label>
                    State
                    <select id="state">
                        <option value="">All</option>
                        <option value="failed">Failed</option>
                        <option value="changed">Changed</option>
                        <option value="new">New</option>
                        <option value="removed">Removed</option>
                    </select>
                </label>
                <label>
                    Width
                    <select id="width">
                        <option value="">All</option>
                        <option value="mobile">Mobile</option>
                        <option value="desktop">Desktop</option>
                    </select>
                </label>
                <label>
                    Language
                    <select id="locale">
                        <option value="">All</option>
                        <option value="en">English</option>
                        <option value="el">Greek</option>
                    </select>
                </label>
            </div>
        </header>

        <!-- Results -->
        <main id="results"></main>

        <script>
            const LANGUAGES = { en: 'English', el: 'Greek' };
            const results = document.getElementById('results');
            const filters = ['state', 'width', 'locale'].map((id) => document.getElementById(id));

            const element = (tag, text) => {
                const node = document.createElement(tag);
                if (text !== undefined) node.textContent = text;
                return node;
            };

            function figure(entry, label, src) {
                const box = element('figure');
                box.append(element('figcaption', label));
                const image = element('img');
                image.src = src;
                image.loading = 'lazy';
                image.alt = `${entry.title}, ${entry.name}, ${LANGUAGES[entry.locale]}, ${entry.width}, ${label.toLowerCase()}`;
                box.append(image);
                return box;
            }

            function renderEntry(entry) {
                const fragment = document.createDocumentFragment();
                const percent = entry.state === 'changed' ? `, ${entry.percent.toFixed(2)}% of pixels` : '';
                fragment.append(element('h3', `${LANGUAGES[entry.locale]}, ${entry.width}: ${entry.state}${percent}`));
                if (entry.error) fragment.append(element('pre', entry.error));
                const images = element('div');
                images.className = 'images';
                if (entry.images.before) images.append(figure(entry, 'Before', entry.images.before));
                if (entry.images.after) images.append(figure(entry, 'After', entry.images.after));
                if (entry.images.diff) images.append(figure(entry, 'Diff', entry.images.diff));
                fragment.append(images);
                return fragment;
            }

            function render(manifest) {
                const [state, width, locale] = filters.map((filter) => filter.value);
                const shown = manifest.entries.filter(
                    (entry) => (!state || entry.state === state) && (!width || entry.width === width) && (!locale || entry.locale === locale),
                );
                results.replaceChildren();
                let group = null;
                for (const entry of shown) {
                    const heading = `${entry.title} / ${entry.name}`;
                    if (heading !== group) {
                        results.append(element('h2', heading));
                        group = heading;
                    }
                    results.append(renderEntry(entry));
                }
                if (shown.length === 0) results.append(element('p', 'Nothing matches these filters.'));
            }

            fetch('manifest.json')
                .then((response) => response.json())
                .then((manifest) => {
                    const { changed, removed, failed } = manifest.counts;
                    document.getElementById('summary').textContent =
                        `${changed} changed, ${manifest.counts.new} new, ${removed} removed, ${failed} failed, of ${manifest.totalCaptures} captures.`;
                    filters.forEach((filter) => filter.addEventListener('change', () => render(manifest)));
                    render(manifest);
                })
                .catch(() => {
                    document.getElementById('summary').textContent = 'Could not load this report. It may have been deleted when the PR closed.';
                });
        </script>
    </body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add scripts/visual/report/index.html
git commit -m "KAN-153: add the static report page"
```

### Task 2.9: Playwright capture

**Files:** Create: `scripts/visual/capture.ts`

This needs a real browser and Storybook, so Task 2.10's first run tests it rather than a unit test. The event names below were checked against Storybook 10.6.2's source.

- [ ] **Step 1: Write `scripts/visual/capture.ts`**

```ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { type Browser, chromium, type Page } from 'playwright-core';

import { BROWSER_LOCALES, CONCURRENCY, HOST_RESOLVER_RULES, RENDER_TIMEOUT_MS, STABLE_FRAME_ATTEMPTS, STABLE_FRAME_DELAY_MS, WIDTHS } from './config';
import { decodePng, hashRaw } from './images';
import { runPool } from './pool';
import type { CaptureRecord, CaptureTarget } from './types';

type StoryStatus = { state: 'pending' | 'rendered' | 'failed'; error: string | null };
type StoryChannel = { on: (event: string, listener: (payload?: { message?: string; title?: string } | { message?: string }[]) => void) => void };

declare global {
    interface Window {
        __visualStatus: StoryStatus;
        __STORYBOOK_ADDONS_CHANNEL__?: StoryChannel;
    }
}

// Runs before Storybook starts. It records the story's outcome from Storybook's own events.
function watchStory() {
    const status: StoryStatus = { state: 'pending', error: null };
    window.__visualStatus = status;
    const fail = (message: string) => {
        status.state = 'failed';
        status.error = status.error ?? message;
    };
    const attach = () => {
        const channel = window.__STORYBOOK_ADDONS_CHANNEL__;
        if (!channel) {
            setTimeout(attach, 5);
            return;
        }
        channel.on('storyRendered', () => {
            if (status.state === 'pending') status.state = 'rendered';
        });
        channel.on('storyMissing', () => fail('Story not found'));
        for (const event of ['storyThrewException', 'storyErrored', 'playFunctionThrewException', 'unhandledErrorsWhilePlaying']) {
            channel.on(event, (payload) => {
                const first = Array.isArray(payload) ? payload[0] : payload;
                fail(`${event}: ${first?.message ?? ''}`);
            });
        }
    };
    attach();
}

export const launchBrowser = () => chromium.launch({ args: [`--host-resolver-rules=${HOST_RESOLVER_RULES}`] });

const takeFrame = (page: Page) => page.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide', scale: 'css' });

// Two identical frames in a row. Never waits for network idle: some stories mock a request that never answers.
async function stableFrame(page: Page): Promise<Buffer | null> {
    let previous = await takeFrame(page);
    for (let attempt = 0; attempt < STABLE_FRAME_ATTEMPTS; attempt += 1) {
        await page.waitForTimeout(STABLE_FRAME_DELAY_MS);
        const current = await takeFrame(page);
        if (current.equals(previous)) return current;
        previous = current;
    }
    return null;
}

async function shoot(browser: Browser, origin: string, target: CaptureTarget): Promise<{ png: Buffer } | { error: string }> {
    const size = WIDTHS.find((width) => width.name === target.width);
    if (!size) return { error: `Unknown width ${target.width}` };
    // A fresh context per capture, so nothing in localStorage leaks between stories.
    const context = await browser.newContext({
        viewport: { width: size.width, height: size.height },
        deviceScaleFactor: 1,
        reducedMotion: 'reduce',
        colorScheme: 'light',
        timezoneId: 'Europe/Athens',
        locale: BROWSER_LOCALES[target.locale],
    });
    try {
        const page = await context.newPage();
        page.setDefaultTimeout(RENDER_TIMEOUT_MS);
        await page.addInitScript(watchStory);
        await page.goto(`${origin}/iframe.html?id=${encodeURIComponent(target.storyId)}&viewMode=story&globals=locale:${target.locale}`);
        await page.waitForFunction(() => window.__visualStatus.state !== 'pending');
        const status = await page.evaluate(() => window.__visualStatus);
        if (status.state === 'failed') return { error: status.error ?? 'Story failed' };
        // next/image lazy-loads by default, which would leave holes in a full-page capture.
        await page.evaluate(() => {
            document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((image) => {
                image.loading = 'eager';
            });
        });
        await page.waitForFunction(() => document.fonts.status === 'loaded' && [...document.images].every((image) => image.complete));
        const png = await stableFrame(page);
        return png ? { png } : { error: 'Never stopped changing' };
    } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
    } finally {
        await context.close();
    }
}

// A failure is tried once more, because a timeout on a busy runner isn't a broken story.
export async function captureTarget(browser: Browser, origin: string, target: CaptureTarget, outDir: string): Promise<CaptureRecord> {
    let result = await shoot(browser, origin, target);
    if ('error' in result) result = await shoot(browser, origin, target);
    if ('error' in result) return { ...target, status: 'failed', hash: null, error: result.error };
    writeFileSync(join(outDir, `${target.id}.png`), result.png);
    return { ...target, status: 'ok', hash: hashRaw(await decodePng(result.png)), error: null };
}

export async function captureAll(browser: Browser, origin: string, targets: CaptureTarget[], outDir: string): Promise<CaptureRecord[]> {
    mkdirSync(outDir, { recursive: true });
    let done = 0;
    return runPool(targets, CONCURRENCY, async (target) => {
        const record = await captureTarget(browser, origin, target, outDir);
        done += 1;
        if (done % 100 === 0 || done === targets.length) process.stdout.write(`Captured ${done}/${targets.length}\n`);
        return record;
    });
}
```

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit
git add scripts/visual/capture.ts
git commit -m "KAN-153: capture stories with Playwright"
```

### Task 2.10: Command-line entry and first real run

**Files:** Create: `scripts/visual/run.ts`

- [ ] **Step 1: Write `scripts/visual/run.ts`**

```ts
// Captures Storybook and compares it with another commit.
//
//   npm run visual -- --base origin/staging           compare HEAD with where it branched
//   npm run visual -- --base origin/staging --serve   and open the report on a local server
//   npm run visual -- --capture-only                  save HEAD as visual-output/base
//
// Windows renders differently from CI, so a local run only compares with itself.

import { execFileSync, execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import type { Browser } from 'playwright-core';

import { captureAll, captureTarget, launchBrowser } from './capture';
import { findMissingStories } from './missingStories';
import { buildReport } from './report';
import { serveStatic } from './server';
import { buildCaptureList, type StoryIndex } from './stories';
import type { CaptureRecord } from './types';

const OUT = 'visual-output';
const BASE_DIR = join(OUT, 'base');
const HEAD_DIR = join(OUT, 'head');
const REPORT_DIR = join(OUT, 'report');
const STORYBOOK_DIR = 'storybook-static';

const { values: args } = parseArgs({
    options: {
        base: { type: 'string' },
        'capture-only': { type: 'boolean', default: false },
        serve: { type: 'boolean', default: false },
    },
});

const print = (line: string) => process.stdout.write(`${line}\n`);

const git = (...gitArgs: string[]) => execFileSync('git', gitArgs, { encoding: 'utf8' }).trim();

function buildStorybook(cwd: string, outDir: string) {
    execSync(`npx storybook build --quiet -o "${outDir}"`, { cwd, stdio: 'inherit', env: { ...process.env, STORYBOOK_DISABLE_TELEMETRY: '1' } });
}

function targetsFrom(storybookDir: string) {
    return buildCaptureList(JSON.parse(readFileSync(join(storybookDir, 'index.json'), 'utf8')) as StoryIndex);
}

function saveRecords(dir: string, records: CaptureRecord[], sha: string) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'captures.json'), JSON.stringify(records));
    writeFileSync(join(dir, 'sha.txt'), sha);
}

async function captureBuild(browser: Browser, storybookDir: string, outDir: string): Promise<CaptureRecord[]> {
    const server = await serveStatic(storybookDir);
    try {
        return await captureAll(browser, server.origin, targetsFrom(storybookDir), outDir);
    } finally {
        await server.close();
    }
}

// Reuses saved captures when they belong to this commit. Otherwise builds that commit in a
// temporary worktree. A commit from before Storybook existed has no captures, so all stories count as new.
async function loadOrBuildBase(browser: Browser, baseSha: string): Promise<CaptureRecord[]> {
    const shaFile = join(BASE_DIR, 'sha.txt');
    if (existsSync(shaFile) && readFileSync(shaFile, 'utf8').trim() === baseSha) {
        print(`Using saved captures for ${baseSha}`);
        return JSON.parse(readFileSync(join(BASE_DIR, 'captures.json'), 'utf8')) as CaptureRecord[];
    }
    print(`Building captures for ${baseSha}`);
    rmSync(BASE_DIR, { recursive: true, force: true });
    mkdirSync(BASE_DIR, { recursive: true });
    const source = resolve(OUT, 'base-src');
    rmSync(source, { recursive: true, force: true });
    git('worktree', 'prune');
    git('worktree', 'add', '--detach', source, baseSha);
    let records: CaptureRecord[] = [];
    try {
        if (existsSync(join(source, '.storybook', 'main.ts'))) {
            execSync('npm ci', { cwd: source, stdio: 'inherit' });
            const storybookDir = join(source, STORYBOOK_DIR);
            buildStorybook(source, storybookDir);
            records = await captureBuild(browser, storybookDir, BASE_DIR);
        }
    } finally {
        git('worktree', 'remove', '--force', source);
    }
    saveRecords(BASE_DIR, records, baseSha);
    return records;
}

async function captureOnly() {
    rmSync(BASE_DIR, { recursive: true, force: true });
    buildStorybook('.', STORYBOOK_DIR);
    const browser = await launchBrowser();
    try {
        saveRecords(BASE_DIR, await captureBuild(browser, STORYBOOK_DIR, BASE_DIR), git('rev-parse', 'HEAD'));
    } finally {
        await browser.close();
    }
}

async function compareWithBase(baseRef: string) {
    const headSha = git('rev-parse', 'HEAD');
    const baseSha = git('merge-base', baseRef, 'HEAD');
    rmSync(HEAD_DIR, { recursive: true, force: true });
    rmSync(REPORT_DIR, { recursive: true, force: true });
    buildStorybook('.', STORYBOOK_DIR);

    const browser = await launchBrowser();
    const server = await serveStatic(STORYBOOK_DIR);
    try {
        const headRecords = await captureAll(browser, server.origin, targetsFrom(STORYBOOK_DIR), HEAD_DIR);
        const baseRecords = await loadOrBuildBase(browser, baseSha);
        const added = git('diff', '--diff-filter=A', '--name-only', baseSha, 'HEAD').split('\n').filter(Boolean);
        const manifest = await buildReport({
            baseDir: BASE_DIR,
            headDir: HEAD_DIR,
            reportDir: REPORT_DIR,
            baseRecords,
            headRecords,
            baseSha,
            headSha,
            missingStories: findMissingStories(added, existsSync),
            retake: (target) => captureTarget(browser, server.origin, target, HEAD_DIR),
        });
        copyFileSync(join('scripts', 'visual', 'report', 'index.html'), join(REPORT_DIR, 'index.html'));
        const { changed, removed, failed } = manifest.counts;
        print(`${changed} changed, ${manifest.counts.new} new, ${removed} removed, ${failed} failed, of ${manifest.totalCaptures} captures.`);
        for (const entry of manifest.entries.filter((item) => item.state === 'failed')) print(`FAILED ${entry.id}: ${entry.error}`);
    } finally {
        await server.close();
        await browser.close();
    }

    if (args.serve) {
        const reportServer = await serveStatic(REPORT_DIR);
        print(`Report: ${reportServer.origin}/index.html (Ctrl+C to stop)`);
    }
}

async function main() {
    if (args['capture-only']) return captureOnly();
    if (!args.base) throw new Error('Pass --base <ref> or --capture-only');
    return compareWithBase(args.base);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
```

- [ ] **Step 2: Install a browser locally, once**

```bash
npx playwright-core install chromium
```

- [ ] **Step 3: First real run**

This is the first PR with the tool, and `origin/staging` already has Storybook from Part 1.

```bash
npm run visual -- --base origin/staging
```

Expected: the run finishes and prints a summary line. Since nothing visual changed on this branch, expect `0 changed`. Any `FAILED` lines are the broken stories to fix in Task 2.11. If stories print `Never stopped changing`, note them for Task 3.2.

- [ ] **Step 4: Confirm fonts and language**

Open `visual-output/head/ui-button--default--en--mobile.png`. Expected: "Save changes" is in Geist, not a browser fallback font. If it falls back, `fonts.gstatic.com` is being blocked or `document.fonts.status` is settling too early, and that must be fixed before continuing.

Then confirm the language switch reaches the stories:

```bash
node -e "const r=require('./visual-output/base/captures.json');const m=new Map(r.map(x=>[x.id,x.hash]));const en=r.filter(x=>x.locale==='en');console.log(en.filter(x=>m.get(x.id.replace('--en--','--el--'))!==x.hash).length,'of',en.length,'English captures differ from Greek')"
```

Expected: most of them differ. If almost none do, `globals=locale:el` isn't being applied. Open one Greek capture of a story with app text to confirm it shows Greek.

- [ ] **Step 5: Confirm a real change is detected**

In `app/globals.css`, temporarily change `--ink: #241f1a;` under `:root` to `--ink: #7c3aed;`, then run:

```bash
npm run visual -- --base origin/staging --serve
```

Expected: many stories listed as changed, and the printed report link shows before, after and diff for each. Stop the server, then undo the CSS change:

```bash
git checkout app/globals.css
```

- [ ] **Step 6: Commit**

```bash
git add scripts/visual/run.ts
git commit -m "KAN-153: add the visual command"
```

### Task 2.11: Fix failing stories and finish the part

PR #64's last Chromatic build reported 4 story errors, and more stories may have gone stale since.

- [ ] **Step 1: List the failures**

```bash
npm run visual -- --base origin/staging
```

Read each `FAILED` line.

- [ ] **Step 2: Fix each failing story**

A missing mock belongs in the story's `beforeEach`, a missing provider in `decorators: [withAppContext]`, and stale props in `args`. Change only the story. If a story shows a real bug in a component, tell the owner rather than fixing it here. If a fix would change any text, ask first. Tag a story `visual-skip` only if it can't be fixed, and say why in a comment above it.

- [ ] **Step 3: Rerun until clean**

Expected: `0 failed`.

- [ ] **Step 4: Run all checks, commit, and open the PR**

```bash
npx tsc --noEmit
npx eslint .
npx vitest run
```

Expected: all clean.

Stage each story file you changed by name, then:

```bash
git commit -m "KAN-153: fix stories that failed to render"
git push -u origin claude/kan-153-visual-tool
gh pr create --base staging --title "KAN-153: visual capture and compare tool" --body "Adds npm run visual. Captures every story in Chromium, English and Greek, at 375px and 1280px, and compares against the commit the branch started from. Nothing runs in CI yet."
```

---

# Part 3: Prove captures are stable (KAN-154)

This is the project's biggest risk, so it comes before any reporting work.

### Task 3.1: Temporary stability workflow

**Files:**
- Create (temporary): `.github/workflows/visual-stability.yml`, `scripts/visual/stability.mjs`

- [ ] **Step 1: Create the branch**

```bash
git fetch origin staging
git switch -c claude/kan-154-visual-stability origin/staging
```

- [ ] **Step 2: Write `.github/workflows/visual-stability.yml`**

```yaml
name: Visual stability test (temporary)

on:
    pull_request:
        branches: [staging]

permissions:
    contents: read

jobs:
    capture:
        strategy:
            fail-fast: false
            matrix:
                run: [1, 2, 3]
        runs-on: ubuntu-latest
        timeout-minutes: 45
        container: mcr.microsoft.com/playwright:v1.55.0-noble
        steps:
            - uses: actions/checkout@v7
              with:
                  ref: ${{ github.event.pull_request.head.sha }}
            - uses: actions/setup-node@v7
              with:
                  node-version: 22
                  cache: npm
            - run: git config --global --add safe.directory "$GITHUB_WORKSPACE"
            - run: npm ci
            - run: npm run visual -- --capture-only
            - uses: actions/upload-artifact@v7
              if: always()
              with:
                  name: captures-${{ matrix.run }}
                  path: visual-output/base
                  retention-days: 3

    compare:
        needs: capture
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v7
              with:
                  ref: ${{ github.event.pull_request.head.sha }}
            - uses: actions/download-artifact@v8
              with:
                  pattern: captures-*
                  path: runs
            - run: node scripts/visual/stability.mjs runs/captures-1 runs/captures-2 runs/captures-3
```

- [ ] **Step 3: Write `scripts/visual/stability.mjs`**

```js
// Temporary: compares captures of the same commit from several runs. Deleted after KAN-154.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const runs = process.argv.slice(2).map((dir) => JSON.parse(readFileSync(join(dir, 'captures.json'), 'utf8')));
const [first, ...others] = runs;
const byId = others.map((records) => new Map(records.map((record) => [record.id, record])));

const failed = runs.flat().filter((record) => record.status === 'failed');
const mismatched = first.filter((record) => byId.some((other) => other.get(record.id)?.hash !== record.hash)).map((record) => record.id);

const print = (line) => process.stdout.write(`${line}\n`);

print(`Captures per run: ${runs.map((records) => records.length).join(', ')}`);
print(`Failed: ${failed.length}`);
for (const record of failed) print(`  ${record.id}: ${record.error}`);
print(`Differ between runs: ${mismatched.length}`);
for (const id of mismatched) print(`  ${id}`);

process.exit(failed.length > 0 || mismatched.length > 0 ? 1 : 0);
```

- [ ] **Step 4: Open a draft PR to trigger it**

```bash
git add .github/workflows/visual-stability.yml scripts/visual/stability.mjs
git commit -m "KAN-154: temporary stability test"
git push -u origin claude/kan-154-visual-stability
gh pr create --draft --base staging --title "KAN-154: visual stability test (draft, not for merging as is)" --body "Captures the same commit 3 times and compares them."
```

### Task 3.2: Fix instability and measure

- [ ] **Step 1: Read the result**

```bash
gh run list --workflow visual-stability.yml --limit 1
gh run view <run-id> --log | grep -E "Captures per run|Failed:|Differ between runs|--(en|el)--"
```

Each run lands on a different runner, so this also tests different hardware.

- [ ] **Step 2: Fix each story that differs**

Download the artifacts (`gh run download <run-id> --dir runs`) and compare the images for that id. Common causes and fixes:

| Cause | Fix |
|---|---|
| A value not covered by the frozen clock | Use a fixed value in the story's `args` or fixtures |
| `Math.random` or generated ids shown on screen | Fix the value in the story's `args` or mock |
| An animation not stopped by reduced motion | Tag the story `visual-skip` with a comment saying why, or render its settled state |
| An image without a fixed size shifting the layout | Set a size in the story's wrapper |

Change only stories and fixtures, not components. If the cause is in a component, tell the owner.

- [ ] **Step 3: Rerun until clean**

Push the fixes. Expected: `Differ between runs: 0` and `Failed: 0` on 3 consecutive workflow runs, using `gh run rerun <run-id>` where no code changed.

- [ ] **Step 4: Check the thresholds still make sense**

If `Differ between runs` is 0 by hash, the thresholds of 2 and 10 in `scripts/visual/config.ts` stay as they are. If hashes keep differing on a story by a few pixels with no visible change, approvals would be lost to noise. The spec's answer is to hash slightly rounded pixel values instead. Show the owner the evidence before making that change.

- [ ] **Step 5: Record the run time**

```bash
gh run view <run-id> --json jobs --jq '.jobs[] | "\(.name) \(.startedAt) \(.completedAt)"'
```

Add a comment on KAN-154 with the capture job's time and the size of one `visual-output/base` artifact.

- [ ] **Step 6: Decide what to do if it's slow**

If capture takes over 15 minutes, first raise `CONCURRENCY` in `scripts/visual/config.ts` to 6 and rerun Step 3, since instability under load would show up there. If it's still over, stop and show the owner the numbers, with two options: accept the longer time, or split across parallel jobs as a follow-up task.

- [ ] **Step 7: Remove the temporary files and land the fixes**

```bash
git rm .github/workflows/visual-stability.yml scripts/visual/stability.mjs
git commit -m "KAN-154: remove the temporary stability test"
git push
gh pr ready
gh pr edit --title "KAN-154: make visual captures stable"
gh pr edit --body "Fixes the stories that differed between runs. Stable across 3 runs. Run time is recorded on KAN-154."
```

If no story needed fixing, close the PR instead of merging, and record that on KAN-154.

---

# Part 4: Report-only rollout on PRs (KAN-155)

Nothing blocks a merge in this part. Once it's on `staging`, reports work, and the approve box starts working after it reaches `main` in a release.

A review after these tasks were built changed the publish, approve and cleanup code. The code in the repo and the spec are correct where they differ from the listings below.

### Task 4.1: Manifest validation

**Files:**
- Create: `scripts/visual/publish/manifest.mjs`
- Test: `scripts/visual/publish/manifest.test.mjs`

The publish job treats the capture job's output as data, because that job ran the PR's dependencies.

- [ ] **Step 1: Create the branch**

```bash
git fetch origin staging
git switch -c claude/kan-155-visual-reports origin/staging
```

- [ ] **Step 2: Write the failing test**

```js
// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { validateManifest } from './manifest.mjs';

const valid = () => ({
    headSha: 'a'.repeat(40),
    baseSha: 'b'.repeat(40),
    totalCaptures: 2,
    counts: { changed: 1, new: 0, removed: 0, failed: 0 },
    fingerprint: 'c'.repeat(64),
    missingStories: [],
    entries: [
        {
            id: 'x',
            storyId: 'x',
            title: 'T',
            name: 'N',
            locale: 'en',
            width: 'mobile',
            state: 'changed',
            percent: 1,
            error: null,
            images: { after: `img/${'d'.repeat(16)}-after.webp` },
        },
    ],
});

describe('validateManifest', () => {
    it('accepts a valid manifest', () => {
        expect(validateManifest(valid()).fingerprint).toBe('c'.repeat(64));
    });

    it('rejects an image path outside img/', () => {
        const manifest = valid();
        manifest.entries[0].images.after = '../../evil.webp';
        expect(() => validateManifest(manifest)).toThrow(/image path/);
    });

    it('rejects a non-hex fingerprint', () => {
        expect(() => validateManifest({ ...valid(), fingerprint: 'nope' })).toThrow(/fingerprint/);
    });

    it('rejects an unknown state', () => {
        const manifest = valid();
        manifest.entries[0].state = 'weird';
        expect(() => validateManifest(manifest)).toThrow(/state/);
    });

    it('rejects a missing entries list', () => {
        expect(() => validateManifest({ ...valid(), entries: undefined })).toThrow(/entries/);
    });
});
```

- [ ] **Step 3: Run it and watch it fail**

```bash
npx vitest run scripts/visual/publish/manifest.test.mjs
```

Expected: FAIL, cannot find `./manifest.mjs`.

- [ ] **Step 4: Write `scripts/visual/publish/manifest.mjs`**

```js
const STATES = new Set(['changed', 'new', 'removed', 'failed']);
const IMAGE_PATH = /^img\/[0-9a-f]{16}-(before|after|diff|preview)\.webp$/;

// The manifest was written by the job that ran the PR's dependencies, so nothing in it is trusted.
export function validateManifest(manifest) {
    if (!/^[0-9a-f]{64}$/.test(manifest?.fingerprint ?? '')) throw new Error('Manifest has an invalid fingerprint');
    if (!Array.isArray(manifest.entries)) throw new Error('Manifest has no entries list');
    if (!Array.isArray(manifest.missingStories)) throw new Error('Manifest has no missingStories list');
    if (!Number.isInteger(manifest.totalCaptures)) throw new Error('Manifest has no totalCaptures');
    for (const state of STATES) {
        if (!Number.isInteger(manifest.counts?.[state])) throw new Error(`Manifest has no count for ${state}`);
    }
    for (const entry of manifest.entries) {
        if (!STATES.has(entry.state)) throw new Error(`Manifest entry has an unknown state: ${entry.state}`);
        for (const path of Object.values(entry.images ?? {})) {
            if (!IMAGE_PATH.test(path)) throw new Error(`Manifest entry has an invalid image path: ${path}`);
        }
    }
    return manifest;
}
```

- [ ] **Step 5: Run the test**

```bash
npx vitest run scripts/visual/publish/manifest.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/visual/publish/manifest.mjs scripts/visual/publish/manifest.test.mjs
git commit -m "KAN-155: validate the report manifest"
```

### Task 4.2: PR comment

**Files:**
- Create: `scripts/visual/publish/comment.mjs`
- Test: `scripts/visual/publish/comment.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { hasBox, isTicked, parseState, renderComment, selectPreviews, setBox, setState } from './comment.mjs';

const entry = (id, state, percent = 1, storyId = id) => ({
    id,
    storyId,
    title: 'UI/Button',
    name: id,
    locale: 'el',
    width: 'mobile',
    state,
    percent,
    images: { preview: `img/${id}-preview.webp` },
});

const manifest = (entries, extra = {}) => ({
    totalCaptures: 1136,
    counts: {
        changed: entries.filter((item) => item.state === 'changed').length,
        new: entries.filter((item) => item.state === 'new').length,
        removed: entries.filter((item) => item.state === 'removed').length,
        failed: entries.filter((item) => item.state === 'failed').length,
    },
    entries,
    missingStories: [],
    ...extra,
});

const state = { headSha: 'abc', fingerprint: 'f', approvedBy: null, reportUrl: 'https://r.test/pr-1/abc/', changes: 1 };

describe('selectPreviews', () => {
    it('orders by most changed, then new, then removed, with one per story, up to 6', () => {
        const picked = selectPreviews([
            entry('small', 'changed', 1),
            entry('big', 'changed', 9),
            entry('big-el', 'changed', 8, 'big'),
            entry('removed', 'removed'),
            entry('new', 'new'),
            entry('c', 'changed', 5),
            entry('d', 'changed', 4),
            entry('e', 'changed', 3),
            entry('f', 'changed', 2),
        ]);
        expect(picked.map((item) => item.id)).toEqual(['big', 'c', 'd', 'e', 'f', 'small']);
    });

    it('skips failed entries', () => {
        expect(selectPreviews([{ ...entry('x', 'failed'), images: {} }])).toEqual([]);
    });
});

describe('renderComment', () => {
    it('shows counts, the report link, previews and an unticked box', () => {
        const body = renderComment({ manifest: manifest([entry('a', 'changed')]), state });
        expect(body).toContain('1 changed, 0 new, 0 removed, 0 failed, of 1,136 captures.');
        expect(body).toContain('[Open the full report](https://r.test/pr-1/abc/)');
        expect(body).toContain('![UI/Button, a, Greek, mobile, before and after](https://r.test/pr-1/abc/img/a-preview.webp)');
        expect(isTicked(body)).toBe(false);
        expect(hasBox(body)).toBe(true);
    });

    it('ticks the box when already approved', () => {
        const body = renderComment({ manifest: manifest([entry('a', 'changed')]), state: { ...state, approvedBy: 'owner' } });
        expect(isTicked(body)).toBe(true);
        expect(body).toContain('Approved by owner.');
    });

    it('leaves the box out while a story has failed', () => {
        const failed = { ...entry('a', 'failed'), images: {}, error: 'Boom' };
        expect(hasBox(renderComment({ manifest: manifest([failed]), state }))).toBe(false);
    });

    it('says when nothing changed', () => {
        const body = renderComment({ manifest: manifest([]), state: { ...state, reportUrl: null } });
        expect(body).toContain('No visual changes.');
        expect(hasBox(body)).toBe(false);
    });

    it('lists components with no story', () => {
        const body = renderComment({ manifest: manifest([], { missingStories: ['components/a/B.tsx'] }), state: { ...state, reportUrl: null } });
        expect(body).toContain('`components/a/B.tsx`');
    });

    it('escapes markdown in story names', () => {
        const nasty = { ...entry('a', 'changed'), name: '](http://evil) <img>' };
        const body = renderComment({ manifest: manifest([nasty]), state });
        expect(body).not.toContain('](http://evil)');
        expect(body).not.toContain('<img>');
    });

    it('notes when the report is still deploying', () => {
        const body = renderComment({ manifest: manifest([entry('a', 'changed')]), state, deploying: true });
        expect(body).toContain('Images may take a moment to appear.');
    });
});

describe('state and box helpers', () => {
    const body = renderComment({ manifest: manifest([entry('a', 'changed')]), state });

    it('reads back the state', () => {
        expect(parseState(body)).toEqual(state);
    });

    it('returns null for a comment with no state', () => {
        expect(parseState('hello')).toBeNull();
    });

    it('rewrites the state without touching the rest', () => {
        const updated = setState(body, { ...state, approvedBy: 'owner' });
        expect(parseState(updated).approvedBy).toBe('owner');
        expect(updated).toContain('[Open the full report]');
    });

    it('ticks and unticks the box', () => {
        expect(isTicked(setBox(body, true))).toBe(true);
        expect(isTicked(setBox(setBox(body, true), false))).toBe(false);
    });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npx vitest run scripts/visual/publish/comment.test.mjs
```

Expected: FAIL, cannot find `./comment.mjs`.

- [ ] **Step 3: Write `scripts/visual/publish/comment.mjs`**

```js
export const MARKER = '<!-- visual-regression ';

const STATE_PATTERN = /<!-- visual-regression (\{.*?\}) -->/;
const BOX_TEXT = 'Approve these visual changes';
const BOX_PATTERN = /^- \[( |x|X)\] Approve these visual changes$/m;
const LANGUAGES = { en: 'English', el: 'Greek' };
const STATE_RANK = { changed: 0, new: 1, removed: 2 };
const MAX_PREVIEWS = 6;

const escapeMarkdown = (text) => String(text).replace(/[\\`*_{}[\]()<>#|!~]/g, '\\$&');

const renderState = (state) => `${MARKER}${JSON.stringify(state)} -->`;

export function parseState(body) {
    const match = STATE_PATTERN.exec(body ?? '');
    return match ? JSON.parse(match[1]) : null;
}

export const setState = (body, state) => body.replace(STATE_PATTERN, () => renderState(state));

export const hasBox = (body) => BOX_PATTERN.test(body);

export const isTicked = (body) => {
    const match = BOX_PATTERN.exec(body);
    return Boolean(match) && match[1] !== ' ';
};

export const setBox = (body, ticked) => body.replace(BOX_PATTERN, `- [${ticked ? 'x' : ' '}] ${BOX_TEXT}`);

export function selectPreviews(entries) {
    const sorted = entries
        .filter((entry) => entry.images?.preview && entry.state in STATE_RANK)
        .sort((a, b) => STATE_RANK[a.state] - STATE_RANK[b.state] || b.percent - a.percent || a.id.localeCompare(b.id));
    const seen = new Set();
    const picked = [];
    for (const entry of sorted) {
        if (seen.has(entry.storyId)) continue;
        seen.add(entry.storyId);
        picked.push(entry);
        if (picked.length === MAX_PREVIEWS) break;
    }
    return picked;
}

const previewAlt = (entry) => escapeMarkdown(`${entry.title}, ${entry.name}, ${LANGUAGES[entry.locale]}, ${entry.width}, before and after`);

export function renderComment({ manifest, state, deploying = false }) {
    const { changed, removed, failed } = manifest.counts;
    const lines = [renderState(state), '### Visual check', ''];

    if (manifest.entries.length === 0) {
        lines.push('No visual changes.');
    } else {
        lines.push(`${changed} changed, ${manifest.counts.new} new, ${removed} removed, ${failed} failed, of ${manifest.totalCaptures.toLocaleString('en-US')} captures.`);
        lines.push('', `[Open the full report](${state.reportUrl})`);
        if (deploying) lines.push('', 'Images may take a moment to appear.');
        const previews = selectPreviews(manifest.entries);
        if (previews.length > 0) lines.push('', ...previews.map((entry) => `![${previewAlt(entry)}](${state.reportUrl}${entry.images.preview})`));
        if (failed > 0) {
            lines.push('', 'Fix the stories that failed before these changes can be approved.');
        } else {
            lines.push('', `- [${state.approvedBy ? 'x' : ' '}] ${BOX_TEXT}`);
            if (state.approvedBy) lines.push('', `Approved by ${escapeMarkdown(state.approvedBy)}.`);
        }
    }

    if (manifest.missingStories.length > 0) {
        lines.push('', '**Components with no story**', ...manifest.missingStories.map((file) => `- \`${String(file).replaceAll('`', '')}\``));
    }
    return lines.join('\n');
}
```

- [ ] **Step 4: Run the test**

```bash
npx vitest run scripts/visual/publish/comment.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/visual/publish/comment.mjs scripts/visual/publish/comment.test.mjs
git commit -m "KAN-155: render and parse the PR comment"
```

### Task 4.3: Status and approval rules

**Files:**
- Create: `scripts/visual/publish/decisions.mjs`
- Test: `scripts/visual/publish/decisions.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { renderComment, setBox } from './comment.mjs';
import { carryApproval, changesStatus, decideTick, statusFor } from './decisions.mjs';

const counts = (changes, failed = 0) => ({ counts: { changed: changes, new: 0, removed: 0, failed } });

describe('statusFor', () => {
    it('is green with no changes', () => {
        expect(statusFor(counts(0), null)).toEqual({ state: 'success', description: 'No visual changes' });
    });

    it('is red until approved', () => {
        expect(statusFor(counts(3), null)).toEqual({ state: 'failure', description: '3 visual changes need approval' });
    });

    it('is green once approved', () => {
        expect(statusFor(counts(3), 'owner')).toEqual({ state: 'success', description: 'Approved by owner' });
    });

    it('stays red with a failed story, even if approved', () => {
        expect(statusFor(counts(3, 1), 'owner')).toEqual({ state: 'failure', description: '1 capture failed to render' });
    });

    it('counts new and removed as changes', () => {
        expect(statusFor({ counts: { changed: 1, new: 2, removed: 3, failed: 0 } }, null).description).toBe('6 visual changes need approval');
    });
});

describe('changesStatus', () => {
    it('describes pending changes', () => {
        expect(changesStatus(2)).toEqual({ state: 'failure', description: '2 visual changes need approval' });
        expect(changesStatus(1)).toEqual({ state: 'failure', description: '1 visual change needs approval' });
    });
});

describe('carryApproval', () => {
    it('keeps an approval when the fingerprint matches', () => {
        expect(carryApproval({ approvedBy: 'owner', fingerprint: 'f' }, 'f')).toBe('owner');
    });

    it('drops it when the fingerprint differs', () => {
        expect(carryApproval({ approvedBy: 'owner', fingerprint: 'f' }, 'g')).toBeNull();
    });

    it('returns null with nothing to carry', () => {
        expect(carryApproval(null, 'f')).toBeNull();
        expect(carryApproval({ approvedBy: null, fingerprint: 'f' }, 'f')).toBeNull();
    });
});

describe('decideTick', () => {
    const manifest = {
        totalCaptures: 1,
        counts: { changed: 1, new: 0, removed: 0, failed: 0 },
        entries: [{ id: 'a', storyId: 'a', title: 'T', name: 'N', locale: 'en', width: 'mobile', state: 'changed', percent: 1, images: {} }],
        missingStories: [],
    };
    const state = { headSha: 'abc', fingerprint: 'f', approvedBy: null, reportUrl: 'https://r.test/', changes: 1 };
    const unticked = renderComment({ manifest, state });
    const ticked = setBox(unticked, true);
    const approvedAndUnticked = renderComment({ manifest, state: { ...state, approvedBy: 'owner' } }).replace('[x]', '[ ]');
    const base = { sender: 'owner', approvers: ['owner'], headSha: 'abc' };

    it('approves a tick from an approver', () => {
        expect(decideTick({ ...base, body: ticked }).action).toBe('approve');
    });

    it('rejects a tick from anyone else', () => {
        expect(decideTick({ ...base, body: ticked, sender: 'stranger' }).action).toBe('reject');
    });

    it('ignores a tick for an old commit', () => {
        expect(decideTick({ ...base, body: ticked, headSha: 'newer' }).action).toBe('ignore');
    });

    it('revokes when an approver unticks an approved box', () => {
        expect(decideTick({ ...base, body: approvedAndUnticked }).action).toBe('revoke');
    });

    it('rejects an untick from anyone else', () => {
        expect(decideTick({ ...base, body: approvedAndUnticked, sender: 'stranger' }).action).toBe('reject');
    });

    it('ignores an unrelated edit', () => {
        expect(decideTick({ ...base, body: unticked }).action).toBe('ignore');
        expect(decideTick({ ...base, body: 'no marker' }).action).toBe('ignore');
    });

    it('ignores a comment with no box', () => {
        const noChanges = renderComment({ manifest: { ...manifest, entries: [] }, state });
        expect(decideTick({ ...base, body: noChanges }).action).toBe('ignore');
    });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npx vitest run scripts/visual/publish/decisions.test.mjs
```

Expected: FAIL, cannot find `./decisions.mjs`.

- [ ] **Step 3: Write `scripts/visual/publish/decisions.mjs`**

```js
import { hasBox, isTicked, parseState } from './comment.mjs';

export const changeCount = ({ counts }) => counts.changed + counts.new + counts.removed;

export const changesStatus = (count) => ({
    state: 'failure',
    description: count === 1 ? '1 visual change needs approval' : `${count} visual changes need approval`,
});

export function statusFor(manifest, approvedBy) {
    const { failed } = manifest.counts;
    if (failed > 0) return { state: 'failure', description: failed === 1 ? '1 capture failed to render' : `${failed} captures failed to render` };
    const count = changeCount(manifest);
    if (count === 0) return { state: 'success', description: 'No visual changes' };
    return approvedBy ? { state: 'success', description: `Approved by ${approvedBy}` } : changesStatus(count);
}

// A new push with identical visual changes keeps its approval.
export function carryApproval(previousState, fingerprint) {
    return previousState?.approvedBy && previousState.fingerprint === fingerprint ? previousState.approvedBy : null;
}

export function decideTick({ body, sender, approvers, headSha }) {
    const state = parseState(body);
    if (!state || !hasBox(body) || state.headSha !== headSha) return { action: 'ignore', state };
    const ticked = isTicked(body);
    if (ticked === Boolean(state.approvedBy)) return { action: 'ignore', state };
    if (!approvers.includes(sender)) return { action: 'reject', state };
    return { action: ticked ? 'approve' : 'revoke', state };
}
```

- [ ] **Step 4: Run the test**

```bash
npx vitest run scripts/visual/publish/decisions.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/visual/publish/decisions.mjs scripts/visual/publish/decisions.test.mjs
git commit -m "KAN-155: add status and approval rules"
```

### Task 4.4: GitHub client and reports repo

**Files:**
- Create: `scripts/visual/publish/github.mjs`, `scripts/visual/publish/reportsRepo.mjs`
- Test: `scripts/visual/publish/reportsRepo.test.mjs`

- [ ] **Step 1: Write the failing test for pruning**

The pruning rule is the only pure logic here. Git and HTTP are tested on real PRs in Task 4.9.

```js
// @vitest-environment node
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { pruneReports } from './reportsRepo.mjs';

describe('pruneReports', () => {
    let site;

    beforeEach(() => {
        site = mkdtempSync(join(tmpdir(), 'visual-prune-'));
    });

    afterEach(() => rmSync(site, { recursive: true, force: true }));

    function addReport(pr, createdAt, bytes) {
        const dir = join(site, `pr-${pr}`, 'abc');
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ createdAt }));
        writeFileSync(join(dir, 'data.bin'), Buffer.alloc(bytes));
    }

    it('deletes the oldest reports until under the limit, never the current PR', () => {
        addReport(1, '2026-01-01T00:00:00Z', 1000);
        addReport(2, '2026-01-02T00:00:00Z', 1000);
        addReport(3, '2026-01-03T00:00:00Z', 1000);
        pruneReports(site, 3, 2500);
        expect(existsSync(join(site, 'pr-1'))).toBe(false);
        expect(existsSync(join(site, 'pr-2'))).toBe(true);
        expect(existsSync(join(site, 'pr-3'))).toBe(true);
    });

    it('keeps the current PR even when it is the oldest', () => {
        addReport(1, '2026-01-01T00:00:00Z', 1000);
        addReport(2, '2026-01-02T00:00:00Z', 1000);
        pruneReports(site, 1, 1500);
        expect(existsSync(join(site, 'pr-1'))).toBe(true);
        expect(existsSync(join(site, 'pr-2'))).toBe(false);
    });

    it('does nothing under the limit', () => {
        addReport(1, '2026-01-01T00:00:00Z', 1000);
        pruneReports(site, 2, 5000);
        expect(existsSync(join(site, 'pr-1'))).toBe(true);
    });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npx vitest run scripts/visual/publish/reportsRepo.test.mjs
```

Expected: FAIL, cannot find `./reportsRepo.mjs`.

- [ ] **Step 3: Write `scripts/visual/publish/reportsRepo.mjs`**

```js
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PUSH_ATTEMPTS = 5;
const BOT_NAME = 'storywall-visual-check';
const BOT_EMAIL = 'storywall-visual-check@users.noreply.github.com';

export const PAGES_SIZE_LIMIT = 800 * 1024 * 1024;
export const SITE_DIR = 'site';

function folderSize(dir) {
    let total = 0;
    for (const item of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, item.name);
        total += item.isDirectory() ? folderSize(path) : statSync(path).size;
    }
    return total;
}

function reportCreatedAt(prDir) {
    for (const report of readdirSync(prDir)) {
        const manifest = join(prDir, report, 'manifest.json');
        if (existsSync(manifest)) return JSON.parse(readFileSync(manifest, 'utf8')).createdAt ?? '';
    }
    return '';
}

// GitHub Pages sites are limited to 1 GB. Deletes the oldest reports first, never the one being published.
export function pruneReports(site, keepPr, limit = PAGES_SIZE_LIMIT) {
    let size = folderSize(site);
    if (size <= limit) return;
    const others = readdirSync(site, { withFileTypes: true })
        .filter((item) => item.isDirectory() && item.name.startsWith('pr-') && item.name !== `pr-${keepPr}`)
        .map((item) => ({ path: join(site, item.name), createdAt: reportCreatedAt(join(site, item.name)) }))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (const report of others) {
        if (size <= limit) return;
        size -= folderSize(report.path);
        rmSync(report.path, { recursive: true, force: true });
    }
}

// Clones the reports repo, applies `change` to its site folder and pushes. On a conflict it starts
// again from a fresh clone. With `squash`, history is replaced by one commit so the repo stops growing.
export async function updateReports({ repo, deployKey, message, squash = false }, change) {
    const workspace = mkdtempSync(join(tmpdir(), 'visual-reports-'));
    const keyFile = join(workspace, 'deploy-key');
    writeFileSync(keyFile, deployKey.endsWith('\n') ? deployKey : `${deployKey}\n`);
    chmodSync(keyFile, 0o600);
    const env = { ...process.env, GIT_SSH_COMMAND: `ssh -i "${keyFile}" -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new` };
    const clone = join(workspace, 'repo');
    const git = (...args) => execFileSync('git', args, { cwd: clone, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();

    try {
        for (let attempt = 1; attempt <= PUSH_ATTEMPTS; attempt += 1) {
            rmSync(clone, { recursive: true, force: true });
            execFileSync('git', ['clone', '--depth', '1', '--branch', 'main', `git@github.com:${repo}.git`, clone], { env, stdio: 'inherit' });
            await change(join(clone, SITE_DIR));
            git('add', '-A');
            if (git('status', '--porcelain') === '') return;
            const tip = git('rev-parse', 'HEAD');
            if (squash) git('checkout', '--orphan', 'squashed');
            git('-c', `user.name=${BOT_NAME}`, '-c', `user.email=${BOT_EMAIL}`, 'commit', '-m', message);
            try {
                if (squash) {
                    git('branch', '-M', 'main');
                    git('push', `--force-with-lease=main:${tip}`, 'origin', 'main');
                } else {
                    git('push', 'origin', 'main');
                }
                return;
            } catch (error) {
                if (attempt === PUSH_ATTEMPTS) throw error;
                await new Promise((done) => setTimeout(done, attempt * 2000));
            }
        }
    } finally {
        rmSync(workspace, { recursive: true, force: true });
    }
}

export async function waitUntilLive(url, timeoutMs = 300_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const response = await fetch(url, { cache: 'no-store' }).catch(() => null);
        if (response?.ok) return true;
        await new Promise((done) => setTimeout(done, 10_000));
    }
    return false;
}
```

- [ ] **Step 4: Write `scripts/visual/publish/github.mjs`**

```js
import { MARKER } from './comment.mjs';

export const STATUS_CONTEXT = 'visual-regression';

const BOT_LOGIN = 'github-actions[bot]';

export function createGitHub({ token, repo }) {
    async function request(path, { method = 'GET', body } = {}) {
        const response = await fetch(`https://api.github.com${path}`, {
            method,
            headers: {
                authorization: `Bearer ${token}`,
                accept: 'application/vnd.github+json',
                'x-github-api-version': '2022-11-28',
                ...(body ? { 'content-type': 'application/json' } : {}),
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) throw new Error(`GitHub ${method} ${path} failed: ${response.status} ${await response.text()}`);
        return response.status === 204 ? null : response.json();
    }

    return {
        getPull: (number) => request(`/repos/${repo}/pulls/${number}`),

        async findComment(number) {
            for (let page = 1; ; page += 1) {
                const comments = await request(`/repos/${repo}/issues/${number}/comments?per_page=100&page=${page}`);
                const match = comments.find((comment) => comment.user?.login === BOT_LOGIN && comment.body?.includes(MARKER));
                if (match) return match;
                if (comments.length < 100) return null;
            }
        },

        createComment: (number, body) => request(`/repos/${repo}/issues/${number}/comments`, { method: 'POST', body: { body } }),

        updateComment: (id, body) => request(`/repos/${repo}/issues/comments/${id}`, { method: 'PATCH', body: { body } }),

        setStatus: (sha, { state, description }, targetUrl) =>
            request(`/repos/${repo}/statuses/${sha}`, {
                method: 'POST',
                body: { state, context: STATUS_CONTEXT, description: description.slice(0, 140), target_url: targetUrl },
            }),
    };
}
```

- [ ] **Step 5: Run the test**

```bash
npx vitest run scripts/visual/publish/reportsRepo.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/visual/publish/github.mjs scripts/visual/publish/reportsRepo.mjs scripts/visual/publish/reportsRepo.test.mjs
git commit -m "KAN-155: add the GitHub client and reports repo helpers"
```

### Task 4.5: Entry scripts

**Files:** Create: `scripts/visual/publish.mjs`, `scripts/visual/approve.mjs`, `scripts/visual/cleanup.mjs`

- [ ] **Step 1: Write `scripts/visual/publish.mjs`**

```js
// Publishes a report and updates the PR. Runs with no dependencies installed, and
// treats REPORT_DIR as data, because the job that wrote it ran the PR's dependencies.
//
// Env: GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER, HEAD_SHA, REPORT_DIR, RUN_URL,
//      REPORTS_REPO, PAGES_BASE_URL, VISUAL_REPORTS_DEPLOY_KEY

import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import { parseState, renderComment } from './publish/comment.mjs';
import { carryApproval, changeCount, statusFor } from './publish/decisions.mjs';
import { createGitHub } from './publish/github.mjs';
import { validateManifest } from './publish/manifest.mjs';
import { pruneReports, updateReports, waitUntilLive } from './publish/reportsRepo.mjs';

const { GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER, HEAD_SHA, REPORT_DIR, RUN_URL, REPORTS_REPO, PAGES_BASE_URL, VISUAL_REPORTS_DEPLOY_KEY } = process.env;

const shortSha = HEAD_SHA.slice(0, 7);
const github = createGitHub({ token: GITHUB_TOKEN, repo: GITHUB_REPOSITORY });
const manifest = validateManifest(JSON.parse(readFileSync(join(REPORT_DIR, 'manifest.json'), 'utf8')));
const reportsOptions = { repo: REPORTS_REPO, deployKey: VISUAL_REPORTS_DEPLOY_KEY };

const existing = await github.findComment(PR_NUMBER);
const previous = existing ? parseState(existing.body) : null;

async function publishReport() {
    const imagePaths = manifest.entries.flatMap((entry) => Object.values(entry.images));
    await updateReports({ ...reportsOptions, message: `PR ${PR_NUMBER} at ${shortSha}` }, (site) => {
        const prDir = join(site, `pr-${PR_NUMBER}`);
        const reportDir = join(prDir, shortSha);
        rmSync(prDir, { recursive: true, force: true });
        mkdirSync(join(reportDir, 'img'), { recursive: true });
        for (const path of imagePaths) copyFileSync(join(REPORT_DIR, path), join(reportDir, 'img', basename(path)));
        writeFileSync(join(reportDir, 'manifest.json'), JSON.stringify({ ...manifest, createdAt: new Date().toISOString() }));
        // The page comes from this checkout, not from the artifact.
        copyFileSync(new URL('./report/index.html', import.meta.url), join(reportDir, 'index.html'));
        pruneReports(site, PR_NUMBER);
    });
    const reportUrl = `${PAGES_BASE_URL}/pr-${PR_NUMBER}/${shortSha}/`;
    const live = await waitUntilLive(`${reportUrl}manifest.json`);
    return { reportUrl, deploying: !live };
}

let reportUrl = null;
let deploying = false;
if (manifest.entries.length > 0) {
    ({ reportUrl, deploying } = await publishReport());
} else if (previous?.reportUrl) {
    await updateReports({ ...reportsOptions, message: `Remove report for PR ${PR_NUMBER}` }, (site) => {
        rmSync(join(site, `pr-${PR_NUMBER}`), { recursive: true, force: true });
    });
}

const approvedBy = manifest.counts.failed === 0 ? carryApproval(previous, manifest.fingerprint) : null;
const state = { headSha: HEAD_SHA, fingerprint: manifest.fingerprint, approvedBy, reportUrl, changes: changeCount(manifest) };
const body = renderComment({ manifest, state, deploying });

if (existing) {
    await github.updateComment(existing.id, body);
} else if (manifest.entries.length > 0 || manifest.missingStories.length > 0) {
    await github.createComment(PR_NUMBER, body);
}

await github.setStatus(HEAD_SHA, statusFor(manifest, approvedBy), reportUrl ?? RUN_URL);
```

- [ ] **Step 2: Write `scripts/visual/approve.mjs`**

```js
// Handles a tick on the visual check's approve box. Always runs from main, because
// GitHub runs issue_comment workflows from the default branch.
//
// Env: GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_EVENT_PATH, VISUAL_APPROVERS

import { readFileSync } from 'node:fs';

import { setBox, setState } from './publish/comment.mjs';
import { changesStatus, decideTick } from './publish/decisions.mjs';
import { createGitHub } from './publish/github.mjs';

// The workflow only runs this for comments written by github-actions[bot], so a comment
// someone else posts with the same marker can't change the check.
const { GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_EVENT_PATH, VISUAL_APPROVERS } = process.env;

const event = JSON.parse(readFileSync(GITHUB_EVENT_PATH, 'utf8'));
const github = createGitHub({ token: GITHUB_TOKEN, repo: GITHUB_REPOSITORY });
const pull = await github.getPull(event.issue.number);
const approvers = (VISUAL_APPROVERS ?? '').split(',').map((login) => login.trim()).filter(Boolean);
const sender = event.sender.login;
const body = event.comment.body;

const { action, state } = decideTick({ body, sender, approvers, headSha: pull.head.sha });
process.stdout.write(`${sender}: ${action}\n`);

if (action === 'approve') {
    await github.setStatus(state.headSha, { state: 'success', description: `Approved by ${sender}` }, state.reportUrl);
    await github.updateComment(event.comment.id, `${setState(body, { ...state, approvedBy: sender })}\n\nApproved by ${sender}.`);
} else if (action === 'revoke') {
    await github.setStatus(state.headSha, changesStatus(state.changes), state.reportUrl);
    await github.updateComment(event.comment.id, setState(body, { ...state, approvedBy: null }).replace(/\n\nApproved by .*\.$/m, ''));
} else if (action === 'reject') {
    await github.updateComment(event.comment.id, setBox(body, Boolean(state.approvedBy)));
}
```

- [ ] **Step 3: Write `scripts/visual/cleanup.mjs`**

```js
// Deletes a closed PR's report and squashes the reports repo's history so it stops growing.
//
// Env: PR_NUMBER, REPORTS_REPO, VISUAL_REPORTS_DEPLOY_KEY

import { rmSync } from 'node:fs';
import { join } from 'node:path';

import { updateReports } from './publish/reportsRepo.mjs';

const { PR_NUMBER, REPORTS_REPO, VISUAL_REPORTS_DEPLOY_KEY } = process.env;

await updateReports({ repo: REPORTS_REPO, deployKey: VISUAL_REPORTS_DEPLOY_KEY, message: `Remove report for PR ${PR_NUMBER}`, squash: true }, (site) => {
    rmSync(join(site, `pr-${PR_NUMBER}`), { recursive: true, force: true });
});
```

- [ ] **Step 4: Check syntax and lint**

```bash
node --check scripts/visual/publish.mjs
node --check scripts/visual/approve.mjs
node --check scripts/visual/cleanup.mjs
npx eslint scripts/visual
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add scripts/visual/publish.mjs scripts/visual/approve.mjs scripts/visual/cleanup.mjs
git commit -m "KAN-155: add the publish, approve and cleanup scripts"
```

### Task 4.6: Workflows

**Files:**
- Create: `.github/workflows/visual-check.yml`, `.github/workflows/visual-baseline.yml`, `.github/workflows/visual-approve.yml`, `.github/workflows/visual-cleanup.yml`
- Test: `scripts/visual/workflows.test.ts`

- [ ] **Step 1: Write the failing test**

The container's browser must match `playwright-core`, and the tag is repeated in workflows, so a test keeps them in step.

```ts
// @vitest-environment node
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const version = (JSON.parse(readFileSync('package.json', 'utf8')) as { devDependencies: Record<string, string> }).devDependencies['playwright-core'];

describe.each(['visual-check', 'visual-baseline'])('%s workflow', (name) => {
    const workflow = readFileSync(`.github/workflows/${name}.yml`, 'utf8');

    it('uses the container matching playwright-core', () => {
        expect(workflow).toContain(`mcr.microsoft.com/playwright:v${version}-noble`);
    });

    it('uses the same Playwright version in the cache key', () => {
        expect(workflow).toContain(`-pw${version}`);
    });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npx vitest run scripts/visual/workflows.test.ts
```

Expected: FAIL, the workflow files don't exist.

- [ ] **Step 3: Write `.github/workflows/visual-check.yml`**

```yaml
name: Visual check

# Forks never run this: they have no secrets, and it would run untrusted code.
on:
    pull_request:
        types: [opened, synchronize, reopened]
        branches-ignore: [main]

concurrency:
    group: visual-check-${{ github.event.pull_request.number }}
    cancel-in-progress: true

permissions: {}

env:
    HEAD_SHA: ${{ github.event.pull_request.head.sha }}
    RUN_URL: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}

jobs:
    start:
        if: github.event.pull_request.head.repo.full_name == github.repository
        runs-on: ubuntu-latest
        timeout-minutes: 5
        permissions:
            statuses: write
        steps:
            - run: gh api "repos/$GITHUB_REPOSITORY/statuses/$HEAD_SHA" -f state=pending -f context=visual-regression -f description="Capturing stories" -f target_url="$RUN_URL"
              env:
                  GH_TOKEN: ${{ github.token }}

    # Runs the PR's dependencies and build, so it has no write access and no secrets.
    capture:
        needs: start
        runs-on: ubuntu-latest
        timeout-minutes: 30
        container: mcr.microsoft.com/playwright:v1.55.0-noble
        permissions:
            contents: read
        steps:
            - uses: actions/checkout@v7
              with:
                  ref: ${{ github.event.pull_request.head.sha }}
                  fetch-depth: 0

            - uses: actions/setup-node@v7
              with:
                  node-version: 22
                  cache: npm

            - run: git config --global --add safe.directory "$GITHUB_WORKSPACE"

            - run: npm ci

            - id: base
              run: echo "sha=$(git merge-base "origin/$BASE_REF" HEAD)" >> "$GITHUB_OUTPUT"
              env:
                  BASE_REF: ${{ github.event.pull_request.base.ref }}

            - id: restore
              uses: actions/cache/restore@v6
              with:
                  path: visual-output/base
                  key: visual-base-${{ steps.base.outputs.sha }}-${{ hashFiles('scripts/visual/capture.ts', 'scripts/visual/stories.ts', 'scripts/visual/config.ts') }}-pw1.55.0

            - run: npm run visual -- --base "$BASE_SHA"
              env:
                  BASE_SHA: ${{ steps.base.outputs.sha }}

            - if: steps.restore.outputs.cache-hit != 'true'
              uses: actions/cache/save@v6
              with:
                  path: visual-output/base
                  key: ${{ steps.restore.outputs.cache-primary-key }}

            - uses: actions/upload-artifact@v7
              with:
                  name: visual-report
                  path: visual-output/report
                  retention-days: 1

    # Installs nothing and builds nothing. Only this job holds the deploy key.
    publish:
        needs: capture
        runs-on: ubuntu-latest
        timeout-minutes: 15
        permissions:
            contents: read
            statuses: write
            pull-requests: write
        steps:
            - uses: actions/checkout@v7
              with:
                  ref: ${{ github.event.pull_request.head.sha }}
                  sparse-checkout: scripts/visual

            - uses: actions/setup-node@v7
              with:
                  node-version: 22

            - uses: actions/download-artifact@v8
              with:
                  name: visual-report
                  path: report-data

            - run: node scripts/visual/publish.mjs
              env:
                  GITHUB_TOKEN: ${{ github.token }}
                  PR_NUMBER: ${{ github.event.pull_request.number }}
                  REPORT_DIR: report-data
                  REPORTS_REPO: CodeGetItGR/storywall-visual-reports
                  PAGES_BASE_URL: https://codegetitgr.github.io/storywall-visual-reports
                  VISUAL_REPORTS_DEPLOY_KEY: ${{ secrets.VISUAL_REPORTS_DEPLOY_KEY }}

    finish:
        needs: [start, capture, publish]
        if: failure()
        runs-on: ubuntu-latest
        timeout-minutes: 5
        permissions:
            statuses: write
        steps:
            - run: gh api "repos/$GITHUB_REPOSITORY/statuses/$HEAD_SHA" -f state=error -f context=visual-regression -f description="The visual check could not finish" -f target_url="$RUN_URL"
              env:
                  GH_TOKEN: ${{ github.token }}
```

- [ ] **Step 4: Write `.github/workflows/visual-baseline.yml`**

```yaml
name: Visual baseline

# Saves captures for each staging commit, so PRs branching from it don't have to build them.
on:
    push:
        branches: [staging]

concurrency:
    group: visual-baseline
    cancel-in-progress: false

permissions:
    contents: read

jobs:
    capture:
        runs-on: ubuntu-latest
        timeout-minutes: 30
        container: mcr.microsoft.com/playwright:v1.55.0-noble
        steps:
            - uses: actions/checkout@v7

            - id: lookup
              uses: actions/cache/restore@v6
              with:
                  path: visual-output/base
                  key: visual-base-${{ github.sha }}-${{ hashFiles('scripts/visual/capture.ts', 'scripts/visual/stories.ts', 'scripts/visual/config.ts') }}-pw1.55.0
                  lookup-only: true

            - if: steps.lookup.outputs.cache-hit != 'true'
              uses: actions/setup-node@v7
              with:
                  node-version: 22
                  cache: npm

            - if: steps.lookup.outputs.cache-hit != 'true'
              run: git config --global --add safe.directory "$GITHUB_WORKSPACE"

            - if: steps.lookup.outputs.cache-hit != 'true'
              run: npm ci

            - if: steps.lookup.outputs.cache-hit != 'true'
              run: npm run visual -- --capture-only

            - if: steps.lookup.outputs.cache-hit != 'true'
              uses: actions/cache/save@v6
              with:
                  path: visual-output/base
                  key: ${{ steps.lookup.outputs.cache-primary-key }}
```

- [ ] **Step 5: Write `.github/workflows/visual-approve.yml`**

```yaml
name: Visual approve

# GitHub runs this from main, so it starts working once it reaches main in a release.
on:
    issue_comment:
        types: [edited]

permissions: {}

jobs:
    approve:
        if: github.event.issue.pull_request && github.event.comment.user.login == 'github-actions[bot]' && github.event.sender.type != 'Bot' && contains(github.event.comment.body, '<!-- visual-regression ')
        runs-on: ubuntu-latest
        timeout-minutes: 5
        permissions:
            contents: read
            statuses: write
            pull-requests: write
        steps:
            - uses: actions/checkout@v7
              with:
                  sparse-checkout: scripts/visual

            - uses: actions/setup-node@v7
              with:
                  node-version: 22

            - run: node scripts/visual/approve.mjs
              env:
                  GITHUB_TOKEN: ${{ github.token }}
                  VISUAL_APPROVERS: ${{ vars.VISUAL_APPROVERS }}
```

- [ ] **Step 6: Write `.github/workflows/visual-cleanup.yml`**

```yaml
name: Visual cleanup

on:
    pull_request:
        types: [closed]
        branches-ignore: [main]

concurrency:
    group: visual-cleanup
    cancel-in-progress: false

permissions:
    contents: read

jobs:
    cleanup:
        if: github.event.pull_request.head.repo.full_name == github.repository
        runs-on: ubuntu-latest
        timeout-minutes: 10
        steps:
            - uses: actions/checkout@v7
              with:
                  ref: ${{ github.event.pull_request.head.sha }}
                  sparse-checkout: scripts/visual

            - uses: actions/setup-node@v7
              with:
                  node-version: 22

            - run: node scripts/visual/cleanup.mjs
              env:
                  PR_NUMBER: ${{ github.event.pull_request.number }}
                  REPORTS_REPO: CodeGetItGR/storywall-visual-reports
                  VISUAL_REPORTS_DEPLOY_KEY: ${{ secrets.VISUAL_REPORTS_DEPLOY_KEY }}
```

- [ ] **Step 7: Run the test**

```bash
npx vitest run scripts/visual/workflows.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add .github/workflows/visual-check.yml .github/workflows/visual-baseline.yml .github/workflows/visual-approve.yml .github/workflows/visual-cleanup.yml scripts/visual/workflows.test.ts
git commit -m "KAN-155: add the visual check workflows"
```

### Task 4.7: Create the reports repo

The owner approved creating this repo as part of the plan. Do this before pushing the workflows, or the first run's publish job fails.

**Files in the new repo:** `.github/workflows/deploy.yml`, `site/robots.txt`, `README.md`

- [ ] **Step 1: Create the repo and clone it into the scratchpad**

```bash
gh repo create CodeGetItGR/storywall-visual-reports --public --description "Visual check reports for storywall PRs. Generated, fake data only."
gh repo clone CodeGetItGR/storywall-visual-reports "$SCRATCHPAD/reports"
```

`$SCRATCHPAD` is this session's scratchpad directory.

- [ ] **Step 2: Add `site/robots.txt`**

```
User-agent: *
Disallow: /
```

- [ ] **Step 3: Add `README.md`**

```markdown
# storywall visual reports

Generated reports from the visual check on storywall PRs. Don't edit by hand: the check rewrites this repo and deletes reports when a PR closes.
```

- [ ] **Step 4: Add `.github/workflows/deploy.yml`**

```yaml
name: Deploy reports

on:
    workflow_dispatch:
    push:
        branches: [main]

# A newer deploy replaces an older one, which is safe because it contains everything.
concurrency:
    group: pages
    cancel-in-progress: true

permissions:
    contents: read
    pages: write
    id-token: write

jobs:
    deploy:
        runs-on: ubuntu-latest
        timeout-minutes: 15
        environment:
            name: github-pages
            url: ${{ steps.deployment.outputs.page_url }}
        steps:
            - uses: actions/checkout@v7
            - uses: actions/configure-pages@v6
            - uses: actions/upload-pages-artifact@v5
              with:
                  path: site
            - id: deployment
              uses: actions/deploy-pages@v5
```

- [ ] **Step 5: Push and turn on Pages**

```bash
cd "$SCRATCHPAD/reports"
git add .github/workflows/deploy.yml site/robots.txt README.md
git commit -m "Set up the reports site"
git branch -M main
git push -u origin main
gh api repos/CodeGetItGR/storywall-visual-reports/pages -X POST -f build_type=workflow
gh workflow run deploy.yml --repo CodeGetItGR/storywall-visual-reports --ref main
```

The run started by the push may fail because Pages wasn't on yet. The one started by `gh workflow run` is the one that counts.

Expected, after a minute: `https://codegetitgr.github.io/storywall-visual-reports/robots.txt` returns the file.

```bash
curl -s https://codegetitgr.github.io/storywall-visual-reports/robots.txt
```

- [ ] **Step 6: Create the deploy key, then delete the local copy**

Don't print the private key.

```bash
ssh-keygen -t ed25519 -N "" -C "storywall visual check" -f "$SCRATCHPAD/visual-deploy-key"
gh repo deploy-key add "$SCRATCHPAD/visual-deploy-key.pub" --repo CodeGetItGR/storywall-visual-reports --allow-write --title "storywall visual check"
gh secret set VISUAL_REPORTS_DEPLOY_KEY --repo CodeGetItGR/storywall < "$SCRATCHPAD/visual-deploy-key"
rm "$SCRATCHPAD/visual-deploy-key" "$SCRATCHPAD/visual-deploy-key.pub"
```

- [ ] **Step 7: Set the approver list**

```bash
gh variable set VISUAL_APPROVERS --repo CodeGetItGR/storywall --body "GiorgosTs19"
```

### Task 4.8: Docs and rules for Claude

**Files:** Modify: `docs/storybook.md`, `CLAUDE.md`

- [ ] **Step 1: Add to the end of `docs/storybook.md`**

```markdown
## Visual check

Every PR, except PRs into `main` and from forks, gets a check named `visual-regression`. It captures every story and compares it with the commit the PR branched from.

- Nothing changed: the check is green.
- A story changed, is new or was removed: the check is red, and one comment on the PR has the counts, previews, a link to the full report and an approve box. Ticking the box turns the check green. A new push with identical visuals keeps the approval, and any other change clears it.
- A story failed to render: fix the story, or tag it `visual-skip` if it can't be made stable. This can't be approved.

Reports are public and are deleted when the PR closes.

To compare locally, run `npm run visual -- --base origin/staging --serve`. Run `npx playwright-core install chromium` once first. Windows renders differently from CI, so a local run only compares with itself, and CI decides.

The code is in `scripts/visual/`, and the design is in `docs/superpowers/specs/2026-11-06-visual-regression-tool-design.md`.
```

- [ ] **Step 2: Add this section to `CLAUDE.md`, directly after `## Jira tickets`**

```markdown
## Visual check

- Every PR gets a `visual-regression` check. See [docs/storybook.md](docs/storybook.md).
- Never tick the visual check's approve box. Only the owner approves.
- Never merge with `--admin` to get past the check.
- When the check is red, send the owner the report link and wait.
```

- [ ] **Step 3: Commit**

```bash
git add docs/storybook.md CLAUDE.md
git commit -m "KAN-155: document the visual check"
```

### Task 4.9: Open the PR and run the report tests

- [ ] **Step 1: Run the checks and open the PR**

```bash
npx tsc --noEmit
npx eslint .
npx vitest run
git push -u origin claude/kan-155-visual-reports
gh pr create --base staging --title "KAN-155: visual reports on PRs (report only)" --body "Adds the visual check workflows, the report page and the PR comment. Nothing blocks a merge yet. The approve box starts working once this reaches main in a release."
```

- [ ] **Step 2: Confirm the PR's own run works**

```bash
gh pr checks --watch
```

Expected: the `capture` job passes and `visual-regression` shows an error from the `publish` job. That job runs its scripts from the PR's base commit, and `staging` doesn't have them until this PR merges. It only happens on this PR, and nothing blocks yet. Say so in the PR, then merge it into `staging` once the other checks pass, following the normal rules. The publish path is tested for real in Step 4.

- [ ] **Step 3: Confirm a baseline was saved after the merge**

```bash
gh run list --workflow visual-baseline.yml --limit 1
gh cache list --key visual-base- --limit 3
```

Expected: the run succeeded, and the cache list shows the merge commit's SHA.

- [ ] **Step 4: Run these test PRs**

Create each from the latest `staging`, as a draft titled `KAN-155: test, do not merge`. Close each one without merging when it's done. Record pass or fail for each on KAN-155.

| # | Change | Expected |
|---|---|---|
| 1 | Add a blank line to `docs/storybook.md` | Green, no comment |
| 2 | Change `--ink` under `:root` in `app/globals.css` to `#7c3aed` | Changed stories listed, up to 6 previews load, the report link works, check red |
| 3 | Add a story to `components/ui/button.stories.tsx` | Listed as new, check red |
| 4 | Delete a story from that file | Listed as removed, check red |
| 5 | Make a story throw in its `render` | Listed as failed with the error, no approve box, check red |
| 8 | Test PR 2, then merge a newer `staging` into it | Still only that PR's own changes |
| 9 | Delete the baseline for test PR 2's branch point (`gh cache delete <key>`) and rerun | Captures rebuilt, same result, slower |
| 10 | Close test PR 2 | Its folder is gone from the reports repo |

Once test 1 has passed, push a new file to it, `components/ui/NoStoryYet.tsx`, with `export const NoStoryYet = () => null;`. Expected: a comment listing it under **Components with no story**, and the check stays green.

Tests 6 and 7 need the approve box, so they run in Part 5.

---

# Part 5: Turn on blocking and clean up (KAN-156)

Start only when both are true:

- Part 4 has reached `main` through a normal release.
- 10 real PRs in a row have run with no false alarms. A false alarm is a capture reported as changed when nothing in the PR should have changed it. Fix any cause on `staging` and restart the count.

### Task 5.1: Test the approve box

- [ ] **Step 1: Open a test PR**

From the latest `staging`, change `--ink` under `:root` in `app/globals.css` to `#7c3aed`. Open it as a draft titled `KAN-156: test, do not merge`.

- [ ] **Step 2: Ask the owner to run test 6**

Claude must not tick the box. Ask the owner to:

1. Tick the box. Expected: within about a minute, the check is green with `Approved by GiorgosTs19`, and the comment says so.
2. Untick it. Expected: the check goes red again.
3. Tick it again.

If ticking doesn't start the `Visual approve` workflow, check `gh run list --workflow visual-approve.yml`. This is the spec's listed risk that a tick on a bot's comment doesn't fire the event. Don't continue until it works.

- [ ] **Step 3: Run test 7**

Push a change that doesn't affect any story, such as a comment in a script. Expected: the box stays ticked and the check goes green. Then push another visual change, setting `--ink` to `#0f766e`. Expected: the box is cleared and the check goes red.

- [ ] **Step 4: Close the test PR without merging**

### Task 5.2: Require the check on staging

Confirm with the owner right before this step, because it changes how every PR merges.

- [ ] **Step 0: Close two gaps that only matter once the check blocks**

1. **A PR moved to another base branch keeps its old result.** Add a workflow on `pull_request` `edited` with `if: github.event.changes.base`, which sets `visual-regression` to failure on the head commit with a note to push again. Don't add `edited` to `visual-check.yml`: it cancels running checks, so a title edit would cancel a run.
2. **Anyone with write access can post a status with this name.** In the rule below, pin the check to GitHub Actions by adding `integration_id` next to `context` in `required_status_checks`. Look up the current ID first, for example from `gh api repos/CodeGetItGR/storywall/commits/<sha>/check-runs --jq '.check_runs[].app | "\(.id) \(.slug)"'`, and confirm that a status posted by a workflow satisfies the pinned rule on a test PR.

- [ ] **Step 1: Add the rule**

```bash
gh api repos/CodeGetItGR/storywall/rulesets -X POST --input - <<'EOF'
{
    "name": "Visual check on staging",
    "target": "branch",
    "enforcement": "active",
    "conditions": { "ref_name": { "include": ["refs/heads/staging"], "exclude": [] } },
    "bypass_actors": [{ "actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "always" }],
    "rules": [
        {
            "type": "required_status_checks",
            "parameters": {
                "strict_required_status_checks_policy": false,
                "required_status_checks": [{ "context": "visual-regression" }]
            }
        }
    ]
}
EOF
```

`actor_id: 5` is the repository admin role, which gives the owner the emergency bypass.

- [ ] **Step 2: Confirm it blocks**

Open a draft test PR with a visual change, mark it ready, and run:

```bash
gh pr view <number> --json mergeStateStatus --jq .mergeStateStatus
```

Expected: `BLOCKED`. Ask the owner to tick the box. Expected: no longer `BLOCKED` on this check. Close the PR without merging.

### Task 5.3: Remove Chromatic leftovers

- [ ] **Step 1: Close PR #64 and delete the leftovers**

The owner approved this as part of the plan, for after blocking is on.

```bash
gh pr close 64 --repo CodeGetItGR/storywall --comment "Replaced by the in-house visual check (KAN-151)."
gh secret delete CHROMATIC_PROJECT_TOKEN --repo CodeGetItGR/storywall
gh label delete chromatic --repo CodeGetItGR/storywall --yes
```

- [ ] **Step 2: Ask the owner to close the Chromatic account or project**

Claude doesn't do this.

- [ ] **Step 3: Update Jira**

Tickets move to Done only after the release containing them is merged into `main` and the After deploying checks pass, per `CLAUDE.md`. Add the rule's ID and the test results to KAN-156.
