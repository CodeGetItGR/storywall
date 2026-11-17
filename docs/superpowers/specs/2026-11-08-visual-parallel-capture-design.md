# KAN-166: capture in parallel jobs

Piece 1 of the visual check speed-up (epic KAN-151). Approved by the owner on 2026-11-08: 6 shares, the baseline workflow split the same way, and no extra caching in this piece (reusing unchanged stories' shots is piece 3, KAN-168).

## Where the time goes today

Run 42470893076 (KAN-158, base cached, nothing changed), 15.5 min in all:

| Step | Time |
| --- | --- |
| Container, checkout, setup-node, `npm ci`, page check | 1.1 min |
| Storybook build | 0.4 min |
| Capture 1890 shots, 4 at a time | 13.4 min |
| Compare (nothing changed) | 0 min |
| Publish | 0.2 min |

Other runs: 17.4, 18.2, 20.7, 23.6 min. Run 42466259866 (KAN-165) took 28.6 min: it started at 09:13, the `staging` baseline for its base finished at 09:17, so it built the base itself and captured everything twice. Runs 42464030878 and 42410558125 hit the 30 min limit the same way, because of the base bug below.

## The base bug

`git merge-base "origin/$BASE_REF" HEAD` runs against `staging` as fetched when the job starts. If the PR merged in the meantime, `staging` contains the PR, so the merge-base is the PR's own head, which has no saved captures.

Fix: `git merge-base "$EVENT_BASE_SHA" HEAD`, with `EVENT_BASE_SHA` from `github.event.pull_request.base.sha`. That is `staging`'s tip when the push happened, so a merge that lands later can't move it.

## New jobs in `visual-check.yml`

```
start ─ build ─┬─ shard 1 ─┐
               ├─ shard 2  │
               ├─ ...      ├─ compare ─ publish
               └─ shard 6 ─┘
finish: runs if anything failed or was cancelled, as today
```

- **build** (Playwright container, `contents: read`, no secrets): checkout, `npm ci`, report page check (from #280), work out the base commit, look up the base cache without downloading it, build Storybook. If the base isn't cached, also build the base commit's Storybook, as `loadOrBuildBase` does today. Uploads the build(s) as an artifact and passes on the base commit and cache key.
- **shard 1–6** (same container, `contents: read`, no secrets): `npm ci`, download the build, capture every 6th shot of the sorted list, starting at its own index. Same `captureAll`, same 4 pages at a time, same settings. If the base isn't cached, also capture the same share of the base build. Uploads its PNGs and a `records-<n>.json`.
- **compare** (same container, `contents: read`, no secrets): checkout, `npm ci`, download the head build and every shard's shots. Takes the base from the cache, or from the shards when they captured it (and then saves it to the cache, as today). Checks that every shot in the story list has exactly one record before comparing, and fails if one is missing or doubled. Then runs today's `buildReport`, retakes included, against the head build. Uploads `visual-report` exactly as today.
- **publish**: unchanged. Installs nothing, builds nothing, runs the base commit's scripts.

Every cache read and write stays inside the Playwright container. A cache saved outside it can get a different cache version and never be found.

## Same shots as today

- `capture.ts`, `stories.ts` and `config.ts` don't change, so the cache key and the saved base captures stay valid.
- One Storybook build for all shards, so every shot comes from the same files.
- The split is by position in the sorted list (shot 1 to shard 1, shot 2 to shard 2, ...). The four shots of a story land on different shards, which spreads slow stories evenly. The old spec suggested a hash of the story id; position gives exactly equal shares.

## `visual-baseline.yml`

Same split for each `staging` push: build, 6 shards, then one job that joins the shots and saves the cache. A baseline would take about 5 min instead of 17 to 35, so far fewer PRs start before their base is saved.

## Code

- `run.ts` keeps the local commands (`--base`, `--capture-only`).
- New CI steps: build, capture a share, join shots, compare. Their logic goes in small files under `scripts/visual/`; the split and the join check are pure functions with unit tests.
- `workflows.test.ts` gains checks: base from the event, never `origin/$BASE_REF`; every job that runs PR code has `contents: read` and no secrets; publish still builds nothing and uses base scripts; all cache steps use the same key and the same container.

## Expected time

| Step | Time |
| --- | --- |
| start + build | 1.8 min |
| shards (13.4 / 6 + setup) | 3.5 min |
| compare (no change / with changes) | 1.5 / 3 min |
| publish | 0.3–1 min |
| **Total** | **7–9.5 min** |

With a missed base cache: about 12 min instead of 28+.

## Risks

- The org is on the free plan: 20 jobs at a time across the org. One PR run uses up to 6 at once. Two PRs plus a baseline would be 18; more would queue.
- Retakes run in the compare job, on another runner than the first shot. Base and head already come from different runners today, so this is no new risk.

## Measuring

- Before: the runs above.
- After: this PR's own runs (a PR runs its own workflow file), at least 3 with the base cached, plus 1 with the base missing (a throwaway commit that changes the cache key, reverted after).
- The baseline workflow can only run on `staging`, so its time comes from the first push after merge.
