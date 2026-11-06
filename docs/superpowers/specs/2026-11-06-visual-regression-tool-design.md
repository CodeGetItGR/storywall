# Visual regression tool (Chromatic replacement)

Date: 2026-11-06. Epic: KAN-151. Tasks: KAN-152 to KAN-156. Later idea: KAN-150 (daily WebKit run).

## Goal

Catch unintended visual changes on every PR without paying for Chromatic. At our volume Chromatic would cost about €180 a month. PR #64's last build used 1,136 Chromatic snapshots, and we merge 5–16 PRs a day.

This tool costs €0 a month, because Actions (standard runners) and GitHub Pages are free on a public repo.

## Starting point

- `staging` has no Storybook, no stories and no `.github` folder.
- PR #64 (`claude/storybook-stories-batch2`) has Storybook 10, shared fixtures and mocks, and 287 stories across 81 components in `components/ui`, `common`, `layout` and `feed`.
- That branch is 504 commits behind `staging`. A trial merge conflicts only in `components/layout/RootDocument.tsx`, `package.json` and `package-lock.json`. Every component with a story still exists on `staging`.
- Its last Chromatic build reported 4 story errors.
- `staging` has no branch protection, so nothing can block a merge today.
- 39 of the last 40 PRs merged into `staging` touched UI-related paths, so skipping runs by path would save almost nothing. The tool runs on every PR.

## Decisions

| Topic | Decision |
|---|---|
| Source of screens | Bring back PR #64, without Chromatic |
| Launch coverage | The 287 existing stories. Other folders come through follow-up tickets, and new stories are picked up automatically |
| Capture matrix | Chromium, English and Greek, 375px and 1280px, about 1,136 captures per run |
| WebKit | Not in this version (KAN-150) |
| Compared against | The commit the PR branched from |
| Visual changes | Block the merge until approved |
| Approval | One checkbox in the PR comment, for the whole PR |
| Approver | Only `GiorgosTs19`. Claude never ticks the box |
| New and removed stories | Need approval, the same as changed stories |
| Stories that fail to render | Must be fixed. They can't be approved |
| Components with no story | Warning in the comment, never blocks |
| Reports | Public, in a new repo, `CodeGetItGR/storywall-visual-reports`, on GitHub Pages |
| PR comment images | Up to 6 previews and a link to the full report |
| Hosted Storybook | Not in this version |
| Chromatic leftovers | Removed after blocking is on (KAN-156) |
| `PostModal.cancel` text | Approved by the owner: "Cancel" in English, "Ακύρωση" in Greek |

### Options rejected

- **Baseline images committed to git:** at our merge rate every accepted change edits binary files, so PRs conflict and the repo keeps growing.
- **Argos:** reported as free to 5,000 screenshots a month, then $100 a month. Our volume would pass the free amount in about 5 runs.
- **Lost Pixel:** reportedly being shut down.
- **Private hosting on Vercel:** the repo and its PR comments are already public, so a sign-in would hide very little. GitHub also loads comment images without signing in, so previews wouldn't load from a protected site. Reports are static files and can move later if the repo ever goes private.

## How a run works

1. A PR opens or gets a push. The check `visual-regression` goes to pending on the head commit.
2. The capture job builds Storybook from the PR and captures every story.
3. It finds the commit the PR branched from (`git merge-base`) and restores that commit's captures from the Actions cache. If they aren't there, it builds that commit and captures it on the spot.
4. It compares the two sets and writes a results folder.
5. The publish job uploads the report, updates the PR comment and sets the check.

Comparing against the branch point means a PR only shows its own changes, even after `staging` has moved on. It also means there's no baseline to maintain: approving stores nothing, and merged code becomes the next baseline by itself.

## Code layout

| File | Purpose |
|---|---|
| `scripts/visual/run.ts` | Command-line entry for `npm run visual`: build, capture, compare, write results |
| `scripts/visual/config.ts`, `types.ts` | Settings and shared types |
| `scripts/visual/stories.ts` | Reads Storybook's `index.json`, applies tags, makes the capture list |
| `scripts/visual/capture.ts`, `pool.ts` | Playwright capture, wait rules and the concurrency limit |
| `scripts/visual/server.ts` | Small static server for `storybook-static` |
| `scripts/visual/compare.ts`, `images.ts` | Compares two captures, and makes diff images and previews |
| `scripts/visual/report.ts` | Sorts captures into states and writes the report data |
| `scripts/visual/fingerprint.ts` | Hash of the set of changes, used for approvals |
| `scripts/visual/missingStories.ts` | Finds components added by the PR with no story |
| `scripts/visual/publish.mjs` | Pushes the report, updates the comment, sets the check |
| `scripts/visual/approve.mjs` | Handles ticking and unticking the box |
| `scripts/visual/cleanup.mjs` | Deletes a report when its PR closes |
| `scripts/visual/publish/` | Helpers for those three: manifest validation, comment, rules, GitHub client, reports repo |
| `scripts/visual/report/` | Static report page template |

It reuses what the repo already has: `playwright-core` 1.55.0, `sharp`, and `comparePixels` from `lib/invitation/parity.ts`. `.mjs` files use Node built-ins only, because the publish job installs no dependencies.

`npm run visual -- --base origin/staging` runs the same comparison locally. Windows renders differently from CI, so a local run only compares against itself, and CI decides.

## Capture

**Story list:** every `type: "story"` entry in `storybook-static/index.json`. No per-story configuration is needed. Three tags change the default:

- `visual-skip`: not captured.
- `visual-desktop-only`: captured at 1280px only.
- `visual-mobile-only`: captured at 375px only.

**Capture id:** `<storyId>--<en|el>--<mobile|desktop>`.

**Environment**

- Runs in the container `mcr.microsoft.com/playwright:v1.55.0-noble`. Its tag must match the `playwright-core` version.
- Viewports are 375×812 and 1280×800, at device scale 1.
- `reducedMotion: 'reduce'`, `colorScheme: 'light'`, `timezoneId: 'Europe/Athens'`, browser locale `en-US` or `el-GR`.
- The clock is already frozen by `.storybook/preview.tsx`.
- Each capture gets a fresh browser context, so nothing in `localStorage` leaks between stories.
- Hosts other than the local server and `fonts.gstatic.com` don't resolve, enforced with Chromium's `--host-resolver-rules`, so no story can depend on the network. `fonts.gstatic.com` stays reachable because Storybook's `next/font` support loads Google fonts from it at run time.
- 4 pages run in parallel. Phase 3 adjusts this.

**URL:** `/iframe.html?id=<storyId>&viewMode=story&globals=locale:<en|el>`.

**Wait rules, in order**

1. Storybook emits `storyRendered`, which comes after the play function finishes. The capture fails if Storybook emits `storyThrewException`, `storyErrored`, `storyMissing`, `playFunctionThrewException` or `unhandledErrorsWhilePlaying` instead, or after 30 seconds. These names were checked against Storybook 10.6.2's source.
2. Lazy images are switched to eager, then fonts have loaded and every `img` on the page has finished loading.
3. Two identical frames in a row, 250ms apart, with up to 10 attempts. The tool never waits for network idle, because 6 stories use mocks that never answer on purpose.

**Screenshot:** a full-page PNG with `animations: 'disabled'` and `caret: 'hide'`. It's taken of the page rather than the story root, so modals and menus in portals are included.

## Comparison

- Images are decoded with `sharp` and compared with `comparePixels`. If sizes differ, the capture counts as changed.
- A pixel differs when any channel is off by more than **2**. The function's default of 16 would miss subtle color changes, so the value is passed explicitly.
- A capture counts as changed when more than **10** pixels differ. Phase 3 confirms both numbers.
- A capture that differs is taken again, up to 2 more times. It counts as changed only if every attempt differs. Retakes stop after 50 captures, because that many differences means a real change, and retaking all of them would overrun the job.

| State | Meaning | Check |
|---|---|---|
| Unchanged | Same as the branch point | No effect |
| Changed | Differs from the branch point | Red until approved |
| New | Only in the PR | Red until approved |
| Removed | Only in the branch point | Red until approved |
| Failed | Error, timeout or never stopped changing | Red, can't be approved |

A failed story is fixed, or tagged `visual-skip` if it can't be made stable.

## Approval

**Fingerprint:** a SHA-256 over the sorted lines `captureId|state|beforeHash|afterHash`, for every capture that isn't unchanged. Hashes are taken from decoded pixels rather than PNG bytes.

**Hidden state:** the comment stores `<!-- visual-regression {"headSha":"…","fingerprint":"…","approvedBy":null,"reportUrl":"…","changes":3} -->`.

**Ticking the box**

- The `issue_comment` `edited` event runs `approve.mjs`.
- It acts only when the comment was written by the bot, has the marker, belongs to a PR, and the person who ticked is listed in the repo variable `VISUAL_APPROVERS` (value: `GiorgosTs19`).
- It also ignores the tick if `headSha` is no longer the PR's head, since a newer run is on its way.
- Tick: check goes green with "Approved by GiorgosTs19". Untick: check goes red.
- A tick from anyone not on the list is ignored, and the box is unticked again.
- The tick covers the whole PR. Approving one story at a time is not in this version.

**A new push**

- Same fingerprint as an approved comment: the approval stays and the check goes green.
- Different fingerprint: the box is cleared and the check goes red.
- Merging `staging` into a PR keeps the approval unless another PR changed the same captures.

**Rules for Claude** go in `CLAUDE.md`, because the check can't tell Claude from the owner (they share a GitHub login):

> Never tick the visual check's approve box. Only the owner approves. Never merge with `--admin` to get past the check. When the check is red, send the owner the report link and wait.

## PR comment

There's one comment per PR, edited in place. It's developer-facing and in English only.

- **Top line:** counts of changed, new, removed and failed, and the total captures.
- **Link:** the full report.
- **Previews:** up to 6 side-by-side before and after images, 600px wide, with real alt text. One per story, ordered by most changed first, then new, then removed.
- **Approve box:** left out while any story has failed.
- **Warning:** components added by the PR with no sibling `.stories.tsx`. Test files and story files don't count.

If nothing changed and there's no warning, no comment is posted. An existing comment is replaced with "No visual changes".

## Report page

A single static page with no framework: `pr-<number>/<short-sha>/index.html`, `manifest.json` and `img/`.

- Grouped by story, with filters for state, width and language.
- Each capture shows before, after and a diff highlighting what changed. New shows only after. Removed shows only before.
- Failed stories show the error message.
- Images load lazily and are WebP at quality 80. Only captures that aren't unchanged are uploaded.
- Every image has real alt text, such as "PostCard, Greek, mobile, before".
- Pages carry `noindex`, and the site has a `robots.txt` blocking all crawlers.
- Text from the results (story names, errors) is escaped, because PR code produced it.

Desktop-first, usable on a phone. Approving happens in the PR, not on this page.

## Workflows

All four live in `.github/workflows/`.

| File | Trigger | Does |
|---|---|---|
| `visual-check.yml` | `pull_request`: opened, synchronize, reopened. Not into `main`, not from forks | Capture, compare, publish |
| `visual-baseline.yml` | `push` to `staging` | Captures the commit and saves it to the cache |
| `visual-approve.yml` | `issue_comment`: edited | Runs `approve.mjs` |
| `visual-cleanup.yml` | `pull_request`: closed | Deletes the PR's report |

`visual-check.yml` has these jobs:

| Job | Permissions and secrets | Runs |
|---|---|---|
| `start` | `statuses: write` | Sets the check to pending |
| `capture` | `contents: read`, no secrets | `npm ci`, Storybook build, capture and compare. Uploads the results as an artifact kept 1 day |
| `publish` | `statuses: write`, `pull-requests: write`, the deploy key | `publish.mjs`, with no `npm ci` and no Storybook build. Treats the artifact as data and validates file names |
| `finish` (`if: failure()`) | `statuses: write` | Sets the check to error, linking to the run |

New pushes cancel an older run for the same PR. The capture job has a 30-minute timeout, with a target of 15 minutes for the whole run. If phase 3 measures more, captures are split across parallel jobs by a stable hash of the story id.

**Baseline cache key:** `visual-base-<sha>-<toolHash>-pw<version>`, where `toolHash` covers `capture.ts`, `stories.ts` and `config.ts`, and `<version>` is the Playwright version. If the tool changes, captures are retaken with the new settings. A cache miss only makes a run slower, so eviction is safe.

If the branch point has no `.storybook/main.ts`, every story counts as new. That only happens while the tool is being introduced.

**Security:** the repo is public, so the job that runs PR dependencies and builds has no write access and no secrets, which limits a malicious package. Fork PRs don't run at all. This doesn't protect against someone with push access editing a workflow in their own PR, which is already true of any workflow.

## Report repo

`CodeGetItGR/storywall-visual-reports`, public.

- **Files:** on `main`, the `site/` folder holds `pr-<number>/<short-sha>/` folders and `robots.txt`, and only that folder is deployed. Only the latest report per PR is kept.
- **Deploy:** a workflow in that repo deploys to Pages on every push. A newer deploy cancels an older one, which is safe because the newest contains everything. Using a workflow also avoids GitHub's soft limit of 10 Pages builds an hour.
- **Publishing:** pushes retry up to 5 times on a conflict. `publish.mjs` then waits up to 5 minutes for `manifest.json` to go live before updating the comment, so links and images work when it appears.
- **Access:** one deploy key with write access, stored as `VISUAL_REPORTS_DEPLOY_KEY` in `storywall`. It doesn't expire. Setup is done with `gh`, and no local copy of the private key is kept.
- **Size:** closing a PR deletes its report and squashes the repo's history to one commit. If the files pass 800 MB, the oldest reports are deleted first (GitHub Pages' limit is 1 GB).

A separate repo keeps report images out of every `git fetch` across the `storywall` worktrees.

## Changes to Storybook from PR #64

- **Remove:** `.github/workflows/chromatic.yml`, `chromatic`, `@chromatic-com/storybook`, the `chromatic` script, and the addon in `.storybook/main.ts`.
- **Replace:** `parameters.chromatic` in `.storybook/preview.tsx`, `disableSnapshot`, and the `desktopOnly` and `mobileOnly` helpers in `.storybook/modes.ts`, used across 10 story files, become the three tags above.
- **Keep:** fixtures, handlers, `withAppContext`, the frozen clock, MSW, the a11y addon, `rootFonts.ts`, and the `PostModal.cancel` text fix.
- **Rewrite:** `docs/storybook.md`, for the new tool and tags.
- **Add to `.gitignore`:** `storybook-static/` and `visual-output/`.

No route, landing copy or metadata changes, so there's no SEO blocker. The only user-facing change is the approved `PostModal.cancel` fix.

## Failure handling

| Situation | What happens |
|---|---|
| Story throws, times out or never stabilizes | Marked failed, shown in the report with the reason, can't be approved |
| Flaky capture | Retaken up to 2 times before it counts |
| Capture or build job crashes | Check goes to error with a link to the run. Re-running the job retries |
| Report upload or Pages deploy fails | Check goes to error. Nothing is approved by accident |
| Pages slow to go live | Comment is still posted after 5 minutes, with a note that images may take a moment |
| No captures for the branch point | Built on the spot, which makes the run slower |
| The check never reports at all | The merge stays blocked. The owner can bypass as repo admin in an emergency |
| Very large change, such as a new font | The comment stays short, the report holds all changes, and old reports are deleted if the size limit is reached |

## Testing

**Unit tests (`vitest`):** tags and capture list, sorting into states, size mismatches, fingerprint, comment rendering and escaping, approver and stale-commit rules, and detection of components with no story.

**On real test PRs, closed without merging.** Tests 6 and 7 need the approve box, which only works once the tool is on `main`, so they run at the start of phase 5. The rest run in phase 4:

1. No visual change: check green, no comment.
2. Change a shared color: changed stories listed, previews shown, check red.
3. Add a story: listed as new, check red until ticked.
4. Remove a story: listed as removed, check red until ticked.
5. Break a story: listed as failed, no box.
6. Tick: green. Untick: red.
7. Push with identical visuals: approval stays. Push with different visuals: box cleared.
8. Merge a moved-on `staging` into the PR: still only the PR's own changes.
9. Delete the baseline from the cache: captures rebuilt on the spot, same result.
10. Close the PR: report removed.

The approver allowlist and fork skip can't be tested end to end with one account, so unit tests and reading the workflow condition cover them.

## Rollout

| Phase | Ticket | Work | Done when |
|---|---|---|---|
| 1 | KAN-152 | Bring back Storybook, without Chromatic, on a new branch from the latest `staging` | Build, `tsc`, `eslint` and `vitest` pass |
| 2 | KAN-153 | Capture and compare tool, then fix the stories it finds failing, including the 4 errors from PR #64's last build | A local run compares two commits correctly, and every story captures with no failures |
| 3 | KAN-154 | Stability test: a temporary workflow on a draft PR captures the same commit 3 times | Zero differences and the same fingerprint across runs, with run time recorded |
| 4 | KAN-155 | Workflows, report repo, report page, comment, `CLAUDE.md` rules | Test PRs 1–5 and 8–10 behave as listed above. Report-only, nothing blocks |
| 5 | KAN-156 | Rule on `staging` requiring `visual-regression`, with a repo admin bypass for emergencies, then remove Chromatic leftovers | The tool is on `main`, tests 6 and 7 pass, 10 PRs in a row had no false alarms, and an unapproved PR can't merge |

**Dependency on a release:** GitHub only runs `issue_comment` workflows from the default branch, which is `main`. The box does nothing until phase 4 reaches `main` through a normal release, so phase 5 can't start before then. Reports work as soon as phase 4 reaches `staging`.

## Risks

| Risk | How it's handled |
|---|---|
| Captures aren't stable between runs | Phase 3 proves it before any reporting is built |
| Fingerprint changes with invisible noise, losing approvals | Phase 3 checks it. If it does, hash slightly rounded pixel values instead |
| Runs take too long | Measured in phase 3, split across parallel jobs if needed |
| Storybook 10 has problems with Next 16.4.5 after 504 commits | Found in phase 1, before other work starts |
| Ticking a box on a bot's comment doesn't fire the event | Tested at the start of phase 5, on `main`, before blocking is on |
| Reports show unreleased screens publicly | Accepted. The code is already public, reports use fake data, and they're deleted when the PR closes |

## Not in this version

WebKit (KAN-150), a hosted Storybook, private hosting, approving stories one at a time, capturing real pages, stories for other folders, and AI notes on changes.
