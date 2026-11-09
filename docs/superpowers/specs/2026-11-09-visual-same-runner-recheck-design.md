# KAN-184: recheck the base on the same runner

Part of the visual check work (epic KAN-151). Approved by the owner on 2026-11-09. It builds on KAN-166 (PR #281, capture in parallel jobs) and is built after that merges.

## The problem

PR #280 changed no story, but its check flagged one: Save my date "Sample Theme / Parents Photo" (en, desktop). About 110 pixels differed, all in the edge smoothing at the photo's rounded corners. The radius and everything inside the photo were the same.

- The base came from the cache, captured on another runner in an earlier run.
- On one machine the story is the same every time: 84 captures out of 84, 20 of them at once.
- So the difference comes from the machine, even with `--disable-skia-runtime-opts` and the other flags in `config.ts`. Which part of the machine is unproven.

Retakes can't clear it: they only retake the head, on the compare runner, and every retake matches the head. The base is still from another runner.

With KAN-166 this gets more likely. Each shot is taken on one of 6 shard runners, the base on 6 others, and retakes on a seventh.

## The fix

When a capture still differs after its head retakes, capture the base version of that story again, on the same runner as the head retakes, and compare again. Both sides then come from one machine, so a machine difference can't show up, and a real change still does.

### Flow

In `compareWithRetakes` (`scripts/visual/report.ts`), for each capture that differs from the saved base: the base captures the compare job got from the cache, or from the shards when they weren't cached.

1. Retake the head, as today: up to `RETAKES` (2) times while it still differs. Cleared if a retake matches.
2. If it still differs, and a base Storybook build is there, capture the base version once, on this runner, from the base build.
    - **The fresh base matches the head:** cleared. Log: `Cleared by a base recheck: <id> (base: <CPU>, here: <CPU>)`. The first CPU is the saved base capture's, the second this runner's.
    - **It still differs:** changed. The before image, the diff and the preview come from the fresh base. `beforeHash` stays the saved base's hash, so the recheck never changes the fingerprint, the approval or the review marks.
    - **The base capture fails or throws:** changed, against the saved base, as today. Log: `Base recheck failed: <id>: <error>`. A failed recheck never hides a change, and never stops the report.
3. **One budget.** The recheck shares `MAX_RETAKEN_CAPTURES` (50) with the retakes. A capture uses one unit for its head retakes and its base recheck together, as a capture uses one unit for its retakes today. Past 50, a capture gets neither, as today.

"Matches" means what it means today: `isChanged` is false for the pair, so small differences under `CHANNEL_TOLERANCE` don't count.

The fresh base goes into its own folder, `visual-output/base-recheck/`. It never touches `visual-output/base/`, so the cache saved after the compare step keeps the base as it was captured.

### The base build

The compare job needs the base Storybook build to capture from. It is about 37 MB.

- It is saved with the base captures, at `visual-output/base/storybook/`, so the existing cache step keeps it.
- The cache key gets a new ending, `-pw1.55.0-sb`, in every cache step. A cache from before this change has no build, and the new key means it is never used. The first run after merging builds the base once: about 12 minutes with KAN-166, instead of 7 to 9.5.
- Where the build comes from:
    - **`visual-baseline.yml`** (each `staging` push): the save job downloads the build into `visual-output/base/storybook/` and joins the shares from there.
    - **`visual-check.yml`, base not cached:** the compare job downloads `visual-base-storybook` into `visual-output/base/storybook/` instead of `visual-output/base-storybook/`, and saves it in the cache with the captures, as today.
    - **`visual-check.yml`, base cached:** the restore brings the build with the captures.
- The compare step serves the base build on a second local server, next to the head build, with the same browser.
- If the build is missing, or its `index.json` is, there is no recheck. The run log says `No base recheck: no base build in <folder>` and the check runs as today.
- Every Storybook build writes its commit into `commit.txt`. The recheck runs only when the base build's `commit.txt` matches the base commit. Otherwise the run log says `No base recheck: the base build is for <commit>, not <base commit>` and the check runs as today. A wrong build in the cache can then never clear a real change. Added on 2026-11-09 after the Task 2 review, with the owner's approval.

### CPU in the log

- `CaptureRecord` gains `machine`: the CPU model from Node's `os.cpus()[0].model`, set for every capture.
- It shows only in the run log: in the two recheck lines above, and in one line each time a CI step starts its browser, `Capturing on <CPU>`.
- The report page and the manifest don't change.
- A record saved before this change has no `machine`, and the log says `unknown`. With the new cache key this happens only with an old local base.
- Adding `machine` changes `capture.ts`, which is hashed into the cache key, so the key changes anyway. The `-sb` ending is there because the cache now holds the build: it keeps an old cache without one from ever being used.

## What doesn't change

- Local runs (`npm run visual`): base and head are already captured on one machine, so `run.ts` passes no recheck.
- The report page, the manifest and its fingerprint, publish, and the approve box.
- The trust model: the base build comes from the base commit, built in a job with `contents: read` and no secrets, like the head build. A PR's cache stays scoped to that PR.
- Capture settings, `CHROMIUM_ARGS`, `CHANNEL_TOLERANCE` and `RETAKES`.

## Code

- `report.ts`: `BuildReportInput` gains an optional `baseRecheck: { dir, retake(target) }`: the folder the fresh base goes into, and how to capture it. `compareWithRetakes` calls it after the head retakes, as above. `changedEntry` takes the saved base record for `beforeHash` and the diff for the images, as today.
- `steps.ts` (from KAN-166): `buildStorybook` writes `commit.txt` into the build. `writeReport` gets an optional base build folder. When the folder has an `index.json` and its `commit.txt` matches the base commit, it serves the build and passes `baseRecheck`, which captures into `visual-output/base-recheck/`. `withStorybook` prints `Capturing on <CPU>` when it starts the browser.
- `ci.ts`: the compare step passes `visual-output/base/storybook` as the base build folder. `run.ts` passes none.
- `capture.ts` and `types.ts`: `machine` on every record.
- The two workflows: the new folder and the new cache key ending, as above.

## Tests

- `report.test.ts`, with fake `retake` and `baseRecheck.retake` that write PNGs:
    - the fresh base matches the head: cleared, and nothing is reported;
    - it still differs: changed, the before image is the fresh base's, and `beforeHash` is the saved base's;
    - the base capture fails, or throws: changed against the saved base;
    - the recheck compares with the latest head retake, not the first head capture;
    - no `baseRecheck`: the same result as today (the existing tests);
    - past the budget: no head retake and no base recheck;
    - a retake that clears the capture: no base recheck.
- `workflows.test.ts`:
    - every cache step in both workflows uses the same key, ending in `-pw1.55.0-sb`, and the path `visual-output/base`;
    - the baseline save job and the check's compare job put the base build in `visual-output/base/storybook`.
- A base build folder without `index.json`, or with another commit in `commit.txt`, gives no recheck and says so in the log. No base build folder at all (local runs) gives no recheck and no log.
- A build's `commit.txt` holds the commit it was built from.

## Checking it live

- On this PR's own runs: at least 3 runs with no change must be green. The new key means `staging` has no saved base for it yet, so the first run captures the base on the shards and saves it, and the others use that cache. Both ways the base comes from other runners than the compare job. The log shows which captures the recheck cleared, and on which CPUs.
- A throwaway commit that changes one story's color, reverted after: it must still be reported as changed, with the before image from the fresh base.
- After merging, the 10-clean-PR count for part 5 (KAN-156) shows whether machine differences are gone.

## Cost

- Each capture that still differs after its retakes gets one more capture, up to 50 per run: at most about 40 seconds on the compare job, and nothing when nothing changed.
- The cache grows by about 37 MB per base commit. The repo's 10 GB cache limit removes the oldest entries first.
