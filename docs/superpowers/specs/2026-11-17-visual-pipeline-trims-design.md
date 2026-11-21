# KAN-237: trim the visual check pipeline

Part of the visual check work (epic KAN-151). The first step of the speed-up order the owner chose on 2026-11-16: this, then KAN-167 (faster shots), then KAN-168 with KAN-238 (affected stories only, each shot stored once). Design approved by the owner on 2026-11-17.

## The problem

A normal run takes 12–14 minutes for about 4,100 captures. About 1 run in 6 takes 17–21 minutes.

Step times from recent green runs:

| Step | Time | Inside it |
|---|---|---|
| build | 2.4–4.1 min | `npm ci` 64 s, Storybook build 53 s |
| slowest capture share | 7–9 min, up to 16 on slow runners | container start 20–48 s, `npm ci` 53 s, capture about 7 min |
| compare | 1.7–3.6 min | container start 21 s, `npm ci` 63 s, compare 70 s |
| publish | 0.5 min | |

- `npm ci` runs 8 times per run: in build, in each of the 6 shares and in compare. Only build needs the whole project installed.
- The compare job waits for the slowest share, then spends about a minute and a half setting up before it compares.
- Shares are dealt round-robin by count. Shares in one run end 2–6 minutes apart, mostly because runners differ in speed, partly because the work isn't split by time.
- The slow runs are runs where the base wasn't in the cache, so the PR captured the base too. Two causes:
    - the PR was pushed right after a `staging` merge, while `visual-baseline.yml` was still capturing that commit;
    - the Actions cache is full (10.4 of 10 GB, 21 base sets of about 480 MB, about one day of `staging`), so older bases get evicted.

Eviction is KAN-238's job. This ticket handles the in-flight case.

## The design

### Jobs after the change

`visual-check.yml`:

1. **start**: unchanged.
2. **build**: `npm ci` and the Storybook build, as today, plus:
    - makes the runtime pack (below);
    - plans the shares (below);
    - looks up the base in the cache, as today, and when it is missing, looks for a `visual-baseline` run for the base commit that is queued or in progress;
    - builds the base Storybook whenever the base isn't saved, as today.
3. **capture ×6**: no checkout and no `npm ci`. Each share:
    1. downloads the head Storybook build, the runtime pack and the share plan;
    2. captures its share of the head stories;
    3. gets the base (below);
    4. compares its share with the base: retakes, base recheck, report images;
    5. uploads its share report.
4. **report** (new): replaces `compare`. Uses the runtime pack. Checks out the head commit for the added-files check, with no `npm ci`.
    1. Downloads the share reports and joins them into one report (below).
    2. If the shares captured the base, joins the base shares and saves them to the cache, as compare does today.
    3. Saves the timings file.
    4. Uploads the report artifact.
5. **publish** and **finish**: unchanged. `finish` lists `report` instead of `compare`.

`visual-baseline.yml` uses the same runtime pack and share plan in its capture and save jobs, so it skips `npm ci` there too and its saved base matches what the PR shares expect.

### Runtime pack

After `npm ci`, the build job:

- bundles `scripts/visual/ci.ts` into one file, `visual-runtime/ci.mjs`, with esbuild, leaving `playwright-core` and `sharp` outside the bundle;
- copies `playwright-core`, `sharp` and everything `sharp` loads at run time (its native `@img/*` package for the runner and its small dependencies) from `node_modules` into `visual-runtime/node_modules`;
- uploads `visual-runtime` as an artifact, about 30 MB.

Jobs run it with `node visual-runtime/ci.mjs <step> ...`, with the same steps and arguments as `npm run visual:ci`. The versions are the lockfile's, because they come from the `npm ci` that build just ran.

- The pack is made from the PR's code, like everything else these jobs run, so it gives the jobs no new access.
- Not chosen: caching `node_modules` (hundreds of MB in a cache that is already full, which would evict more bases) and installing the packages in each job (needs the registry in every job, and pinning by hand).

`npm run visual` and `npm run visual:ci` keep working locally through `jiti`, as today.

### Share plan

- Each capture record gains `ms`: how long the capture took, from opening the page to the stable frame.
- After a run, the report job writes `timings.json` (capture id → ms) from the head records and saves it in the cache as `visual-timings-<run id>`. The baseline save job does the same. It is a few hundred KB.
- The build job restores the newest timings file with the key prefix `visual-timings-`.
- It deals captures to shares slowest first, each to the share with the least planned time so far. A capture with no timing counts as the median.
- It writes the plan to `share-plan.json` (share index → capture ids) and uploads it with the runtime pack. Every share reads the same plan, so the split never differs between shares.
- With no timings file, or one that can't be read, the plan falls back to today's round-robin deal.
- A plan that leaves a capture out, or puts one in two shares, stops the run in the build job. The report job's join still checks that every capture is there exactly once.

### Getting the base in a share

The build job hands the shares one of three base states:

- **saved**: the cache has the base. Each share restores it (about 480 MB, about 9 s) and compares.
- **pending**: the cache doesn't have it, but a `visual-baseline` run for the base commit is queued or in progress. The build job passes that run's id. Each share, after capturing its head stories:
    1. waits for that run to finish, asking the GitHub API every 30 s, for at most 15 minutes from the start of the wait;
    2. tries the cache again;
    3. if the base is there, compares against it;
    4. if not (the run failed, ran out of time or saved under another key), downloads the base Storybook build and captures its share of the base, as today.
- **missing**: no cache and no run in flight. Each share captures its share of the base, as today.

A share compares against either the whole saved base or the base captures it took itself, never a mix. Waiting needs `actions: read` in the build and capture jobs. They get no other new permission.

The base Storybook build is still made in the build job whenever the base isn't saved, so a share that stops waiting never has to build it.

### Compare in each share

- A share runs today's `buildReport` on its own captures: the same retakes, base recheck, thresholds and images.
- **Retake limit:** up to 50 retaken captures per share (owner's choice, 2026-11-17). Today it is 50 for the whole run. A noisy run clears more flakes. The worst case adds a few minutes to a share. A capture past the limit is reported as changed, as today, so the limit never hides a change.
- Retakes and the base recheck now run on the runner that took the head capture, so retakes compare like with like.
- The share writes:
    - its images into its report folder;
    - a share manifest with its entries, its head records and the change signatures it found.
- It doesn't group changes or compute the fingerprint. The report job does both, across all shares.

### Joining the report

The report job:

1. reads every share manifest;
2. checks the head records against the story list, as `joinShares` does today: a missing, doubled or unknown capture stops the run;
3. merges the entries and the images;
4. groups changes that look the same across all shares with `groupChanges`, from every share's signatures;
5. computes the counts and the fingerprint from the merged entries;
6. adds the missing-stories list (added files between base and head, as today);
7. writes one `manifest.json` and the report page, in the shape `publish.mjs` reads today.

A report joined from shares must be the same as one built in a single job from the same captures: the same entries, groups, counts and fingerprint. A test checks this.

### What doesn't change

- The thresholds, the retake count per capture, the base recheck rules and the capture steps.
- The report page, the manifest shape, the approval flow and `publish.mjs`.
- Local runs: `npm run visual` still captures and compares in one process.

The cache key hashes `capture.ts`, which changes (`ms`), so the first run after merging captures the base once.

## Testing

Unit tests:

- **Share plan:** slowest-first dealing, median for unknown captures, the round-robin fallback, and that every capture lands in exactly one share.
- **Joining the report:** the same result as a single-job report for the same captures, change groups that span shares, counts, fingerprint, and the errors for a missing, doubled or unknown capture.
- **Base state:** saved, pending and missing, from the cache result and the baseline run's status.
- **Runtime pack:** the package list it copies covers what `sharp` and `playwright-core` load.
- **Workflows:** `workflows.test.ts` updated for the new jobs, permissions and steps.

On real CI runs:

- At least 3 green runs on unchanged code with zero false alarms, with before and after times for each job.
- One run with the base deliberately missing, to show the fallback captures it.
- One run pushed while a baseline run is in flight, to show the wait.
- One run with a throwaway story change, to show a real change is still reported (then reverted).
- `tsc --noEmit`, `eslint .`, `vitest run` and `next build` clean.

## Expected effect

- About 1 minute less in each share (no `npm ci`).
- About 1.5–2 minutes less from dropping the compare job's setup. The compare work moves into the shares, in parallel.
- Somewhat less spread between shares. Runner speed still varies.
- Most of the 17–21 minute runs after a `staging` merge go away.

A normal run should drop from 12–14 minutes to roughly 9–11.
