# Visual check report page

Date: 2026-11-07. Ticket: KAN-158, under epic KAN-151. Later work: KAN-159.

Replaces the "Report page" section of [the tool's design](2026-11-06-visual-regression-tool-design.md).

## Goal

Today's report is one long page with three dropdowns. On a large change it shows every capture in one scroll, and nothing helps you decide what to look at next. Replace it with a review tool: find what changed, judge it one item at a time, and know what's left.

The approved mockup, with a real report of 626 differing captures: https://claude.ai/artifact/SVaUG3NAA1Fz7wYBj3FaQ9 (private to the owner). This spec describes that page, and the mockup is the reference for layout and look.

## Decisions

| Topic | Decision |
|---|---|
| Review flow | A sidebar list and one story at a time, with next, previous and arrow keys |
| Grouping | By area and then story, or by same change |
| Same change | Identical changed areas, or one color shift with no pixels outside it |
| Tech | React, built into one committed file |
| Look | The admin console's slate palette, light and dark |
| First version | Review marks saved in the browser. Approving stays in the PR |
| Later | Approve and comment from the report (KAN-159). They need a sign-in service |
| Language | English only, like the PR comment. The page is for developers |

## The page

### Layout

- **Sidebar:** the PR link and short commit, review progress, filters for failed, changed, new and removed, story search (every word typed has to appear in the story's title or name), the list mode, and "Hide reviewed".
- **Main pane:** one screen at a time, with a bar along the bottom.
- **Under 880px:** the sidebar becomes a drawer opened from a "Stories" button. Desktop comes first, and a phone is good enough to review on.

### Lists

- **By area** (the default): area, then component, then story. Each story shows a state dot, its largest percent changed and a tick when reviewed. Areas and components collapse.
- **Same change:** groups first, largest first, then stories "On their own". This mode only appears when the report has at least one group.

Search and the state filters apply to both. The list follows the item opened, from a click, a link or the back button: a group opens Same change, and a story whose captures are all in groups opens By area, since Same change doesn't list it.

### Screens

- **Overview**, shown first: failed stories at the top, a table of counts per area, same-change groups, the 8 biggest changes as thumbnails, and components with no story. A thumbnail opens its story on the capture it shows.
- **Story:** tabs for the four captures (EN Mobile, EN Desktop, EL Mobile, EL Desktop), each with its percent, state, or "no change". The chosen tab carries over to the next story.
- **Group:** the capture with the biggest change, then thumbnails of every capture in the group. The first 60 show, then "Show all N". Clicking a thumbnail shows that capture. Color groups show the before and after colors.

### Comparing

Side by side, a slider, or the diff image, at fit or 100%. New stories show only the after image, and removed stories only the before. A failed capture shows the error and can't be marked. The story's other captures still can. Scrolling one side at 100% scrolls the other too.

### Reviewing

- "Looks right" marks the item and moves to the next one. On a group it reads "Looks right for all N" and marks every capture in the group. On a reviewed item it becomes "Undo reviewed".
- The Overview's bar shows "Start review", or "Continue review" once something is marked. It goes to the first item not yet reviewed, in the list mode currently selected. When the filters hide everything left to review, neither button shows.
- With everything reviewed, the bar shows "Approve in the PR", a link to the PR. If any story failed, it shows "Fix the failed stories first" instead.
- Marks approve nothing, and the PR's box is still the only approval.

**Marks survive a push.** They're stored in `localStorage` per PR, as capture id → `beforeHash|afterHash`. A capture counts as reviewed only while both hashes match, so a new push keeps the marks on captures it didn't change and clears the rest. The key is the PR's address, so two repos using the tool never share marks. A failed capture never counts as reviewed, even if its hashes match a mark. When storage is full, the marks of other PRs are cleared, the ones saved longest ago first, until the new marks fit. If storage is unavailable, marks last until the page closes. With the same report open in two tabs, each tab takes in the marks the other saves, so neither saves over the other.

### Keyboard

`←` `→` previous and next, `R` looks right, `C` next language or width, `1` `2` `3` side by side, slider, diff, `Z` fit or 100%, `G` list mode, `/` find a story, `?` shortcuts, `Esc` close. Letters are matched by key position (`event.code`), so they also work on a Greek keyboard. Holding a key repeats only `←` and `→`. Every other shortcut acts once per press, so holding `R` can't mark items unseen. A shortcut does nothing where its control is turned off, and while the shortcuts dialog is open only `?` and `Esc` work. On an item the filters hide, next goes to the first item in the list and previous does nothing, for the keys and the bar's buttons alike.

### Links

Every story and group has its own address (`#<storyId>`, `#group-<key>`), and the browser's back button works. An address that matches nothing opens the Overview.

## Finding the same change

A new file, `scripts/visual/sameChange.ts`, runs while the report is built. It only applies to changed captures, not new, removed or failed ones.

**Why a color rule.** Measured on a test report where one text color changed, with a layout fix and new, removed and failed stories added (626 entries, 614 changed, 164 stories changed):

| Rule | Items to look at | Largest group |
|---|---|---|
| Stories, no grouping | 167 | n/a |
| Identical before and after | 488 | 6 |
| Identical changed areas | 289 | 24 |
| Exact plus color shift | 14 (9 groups, 5 stories) | 586 |

One color looks different in every story because it sits behind different text, so exact matching barely helps on the change where grouping matters most.

**Color shift.** For a capture of unchanged size:

1. Over its changed pixels (the existing comparison mask), count each before and after color pair.
2. If every changed pixel had one color before but not one color after, or the other way round, the change is content added to a plain background or removed from one, and the capture has no color shift. A flat block that changed color, one color on both sides, still counts. Known limits: a new flat line with no soft edges still counts, and so does new text when even one changed pixel on the plain side had another color.
3. The direction is the most common pair whose colors are at least 48 apart. Ties go to the lower pair value, so results don't depend on order. A capture with more than 65,536 such pairs has no color shift: one color change has far fewer, and stopping there keeps photo-like changes fast.
4. A pixel fits when its alpha didn't change, it moves forward along that direction, and no channel strays more than 16 from the line. These are measured values: anti-aliased edges fit, and other changes don't. Moving forward is what keeps moved text out: its old place and its new place move in opposite directions.
5. The capture has a color shift only if **every** changed pixel fits. On the test report 586 of 610 same-size captures had exactly 0 pixels outside, and the next lowest had 20.
6. Captures join a group when their directions agree (cosine at least 0.995). The group's two swatches are the pair most often on top among its captures.

**Identical changed areas.** Captures left over after step 6, or in color groups of one, are compared this way:

1. Changed pixels less than 16px apart join into one area, wherever they sit. A 16px grid only speeds this up: pixels in one cell are always that close, so only neighboring cells are compared. The gap is measured between the boxes around each cell's changed pixels, so a diagonal neighbor can now and then join a little early, and that copy then isn't matched.
2. Each area is hashed from its size and its before and after pixels. Its position isn't included, so a change that moved still matches.
3. Captures with the same list of hashes form a group, duplicates included.

**Never grouped:** captures whose size changed. A group needs at least 2 captures.

**What grouping doesn't touch.** It affects navigation only. The fingerprint, the check, the counts and the approval stay as they are. A wrong group costs a look, not an approval, because a person still sees the group's captures. "No pixels outside" exists to keep real changes out of a color group: all 8 ComposerCard captures with the real layout change stayed out on the test report.

Results are stable: captures are processed in id order, and group keys are `color-1`, `same-1` and so on, largest first.

## Data

```ts
type ChangeGroup = { key: string; kind: 'color' | 'exact'; from?: string; to?: string };
// ReportEntry gains: changeKey: string | null
// Manifest gains: groups: ChangeGroup[]
```

Group labels are worked out by the page: "Color change", or the component and story names, with the language and width added when two groups would otherwise read the same. A group across several components names each story with its component instead, and puts the language and width first when it needs them. Names follow the order of the area list, and languages and widths follow the capture order.

`publish.mjs` adds `pull: { number, url }` to the published manifest from its own environment, after the manifest's own fields, so a manifest can't set it. On a local run it's missing, and the page hides the PR link and the approve link.

## Build and safety

The rule stays: **the publish job installs nothing and builds nothing, and the page comes from the base commit.**

- The source is in `scripts/visual/report/src/`. `npm run visual:page` builds it with Vite, already in the repo, into one file with its script and styles inside: `scripts/visual/report/dist/index.html`. That file is committed. There are no new dependencies.
- `publish.mjs` copies that file from its base checkout, exactly as it does the page today, and `run.ts` copies it for local runs.
- It's about 200 KB, once per report, and loads nothing from other hosts.

**Keeping the committed file honest.** A person can't read a minified bundle, so the capture job rebuilds it on every PR and fails if the result differs:

```yaml
- run: |
      npm run visual:page
      if [ -n "$(git status --porcelain -- scripts/visual/report/dist/index.html)" ]; then
          echo "::error::The report page is out of date. Run npm run visual:page and commit the result."
          exit 1
      fi
```

It uses `git status` rather than `git diff`, so a deleted file is caught too. The check then shows an error with a link to the run. The build normalizes line endings so Windows and Linux produce the same file. `.gitattributes` marks the file as generated, so GitHub collapses it in PR diffs. As with any workflow, someone with write access could remove this step, and the tool's design already treats people with write access as trusted.

**The manifest is still untrusted.**

- `validateManifest` also checks each entry's `id`, `storyId`, `title`, `name`, `locale`, `width`, `percent`, `error`, `changeKey`, `beforeHash` and `afterHash` (64 lowercase hex characters, or null) and `images` (an object with only `before`, `after`, `diff` and `preview`). A story id needs `--` and can't hold whitespace, `%` or `#`, because it becomes a page address. A capture id has to be `<storyId>--<locale>--<width>` and can't repeat. It also checks each group's key (never repeated), kind and colors (`#rrggbb` only), and `headSha` and `baseSha` (40 lowercase hex characters).
- The page renders results as React text. `dangerouslySetInnerHTML` isn't used, and a test renders hostile story names and errors.
- Image paths and colors are the only manifest values used as URLs or styles, and both are validated.

**Mixed versions are normal.** A PR's base commit can be newer than its branch point, so the new page can receive a manifest with no `groups` or `changeKey`. The validator accepts that, and the page shows no Same change mode. The old page ignores the new fields.

## Code layout

| Path | Purpose |
|---|---|
| `scripts/visual/sameChange.ts` | Finds groups, from each changed capture's pixels |
| `scripts/visual/report/index.html` | Template for the build, with the title and `noindex` |
| `scripts/visual/report/vite.config.ts` | The build, with a small local plugin that inlines the script and styles |
| `scripts/visual/report/dist/index.html` | The built page. Committed, and never edited by hand |
| `src/main.tsx`, `App.tsx`, `styles.css`, `copy.ts` | Entry, composition, the admin tokens and every string on the page |
| `src/lib/` | Plain functions: building the model, review order, labels, addresses, reading and writing marks |
| `src/hooks/` | `useManifest`, `useReviewMarks`, `useRoute`, `useReportView`, `useKeyboardShortcuts` |
| `src/components/sidebar/` | Header, filters, area tree, same-change list, rows |
| `src/components/screens/` | Overview, story, group, bottom bar |
| `src/components/compare/` | Side by side, slider, single image, failed notice, tabs and controls |

The page follows the repo's rules: thin components, logic in hooks and `lib/`, named handlers, JSX comments at section boundaries and real alt text. Types come from `scripts/visual/types.ts`, so the tool and the page can't drift apart.

Other changes:

- `tsconfig.json` adds `scripts/**/*.tsx`.
- `eslint.config.mjs` turns off `@next/next/no-img-element` for the report source, which isn't a Next page.
- `package.json` adds `visual:page`.
- `.gitattributes` is new, with one line marking the built file as generated and keeping its line endings exact.
- `app/globals.css` tells Tailwind to skip `scripts/visual/report`, so the app's CSS isn't built from the page's bundle.
- `.github/workflows/visual-check.yml` adds the rebuild check to the capture job.
- `docs/storybook.md` gets the rebuild step.
- The older design's "Report page" section points here.

## Room to grow

KAN-159 adds approve and comment. A static page on GitHub Pages can't sign anyone in, so that work adds a small service that applies the same rules as `approve.mjs`. This version leaves two natural places for it, and builds nothing for them:

- The bottom bar's action, which already switches on state.
- Capture ids, which already identify what a comment would attach to.

## Failure handling

| Situation | What happens |
|---|---|
| `manifest.json` missing or unreadable | The existing message: "Could not load this report. It may have been deleted when the PR closed." |
| Filters match nothing | "Nothing matches these filters." |
| Storage unavailable | Marks last until the page closes |
| Storage full | Other PRs' marks are cleared, the ones saved longest ago first, until the new marks fit |
| A report with no differences (local run only) | The Overview with nothing to review, and no crash |
| A failed capture | It can't be marked and doesn't count toward progress. A story whose captures all failed has no "Looks right", and any failed capture blocks "Approve in the PR" |
| The filters hide everything left to review | The Overview shows no "Start review" or "Continue review" |
| Page source changed without rebuilding | The check shows an error and the run explains the fix |

## Testing

**Unit tests (`vitest`)**

- `sameChange`: a color shift groups; one stray pixel inside a shift keeps that capture out; text added to or removed from a blank background, a moved text line and a photo-wide change have no color shift, and a flat block that changed color has one; a size change never groups; identical areas group, including when moved; areas join by distance wherever they sit on the grid; groups of one don't exist; results don't depend on input order.
- `report`: entries carry `changeKey`, the manifest carries `groups`, and the fingerprint is the same with and without grouping.
- `validateManifest`: accepts a manifest shaped like the report's, and one with no groups; rejects bad colors, keys, repeated keys, kinds, locales, widths, commit ids, image lists, story ids, capture ids and hashes, and repeated capture ids; its languages and widths match `config.ts`.
- `marks`: a failed capture never counts as reviewed; the key holds the PR's address; when storage is full, the marks saved longest ago are cleared first, and nothing else in storage is touched.
- `publish`: the page path points at `dist/index.html`, and `pull` can't be set by the manifest.
- `workflows`: the capture job has the rebuild check.
- The built file: it exists, has `noindex`, and has no external script or stylesheet.

**Page tests (Testing Library, on a fixture manifest)**

- Hostile names and errors render as text.
- Start, Looks right and Undo update progress and move on.
- A story whose captures all failed has no Looks right, a story with one failed capture keeps it, and either blocks the approve link.
- With the filters hiding everything left to review, the Overview offers no Start or Continue.
- Marks saved in another tab show up without a reload.
- Same change appears only with groups, and marking a group marks all of it.
- Marks survive a new commit when hashes match and clear when they don't.
- Addresses open the right screen.
- Shortcuts work with `event.code` on a Greek layout, only the arrows repeat while held, nothing but `?` and `Esc` acts behind the shortcuts dialog, and `Z` does nothing where zoom is turned off.
- A story listed only in groups opens the By area list, and a Biggest changes thumbnail opens the capture it shows.
- Search and filters narrow the list and the review order.

**On real data, before merging:** run `buildReport` over the saved test captures (626 entries), confirm the groups match the numbers above within a small margin, record how long grouping takes, and go through the page in a browser at desktop and phone widths, light and dark.

**After merging to `staging`:** a real PR's report uses the new page and links back to its PR. Windows and Linux builds match, which the first CI run proves.

## Wording

The page's wording, for consent under the repo's text rule.

**Kept from today's page:** "Visual check", the tab title "Visual check report", "Loading...", "Failed", "Changed", "New", "Removed", "Before", "After", "Diff", "Nothing matches these filters.", "Could not load this report. It may have been deleted when the PR closed.", and the alt text pattern "PostCard, Default, Greek, mobile, before".

**Replaced:**

| Today | New |
|---|---|
| "12 changed, 0 new, 0 removed, 0 failed, of 1078 captures." | "12 of 1078 captures differ" ("1 of 1078 captures differs" for one), with the counts on the sidebar filters |
| "English, mobile: changed, 3.67% of pixels" | A tab: "EN Mobile 3.67%" |

**Removed:** the dropdowns "State", "Width" and "Language", their "All" options, and the "Mobile", "Desktop", "English" and "Greek" options.

**New**

| Where | Text |
|---|---|
| Sidebar | "PR #N", "N of M captures reviewed" ("0 of 1 capture reviewed" for one), "Find a story", "By area", "Same change", "Hide reviewed", "Overview", "On their own", "Stories", "Reviewed" |
| Story | "EN Mobile", "EN Desktop", "EL Mobile", "EL Desktop", "no change", "Side by side", "Slider", "Fit", "100%" |
| Failed story | "This story failed", "No error message.", "Fix it before these changes can be approved." |
| Group | "Color change", "<component>: <names> and N more", "<component> / <name>, <component> / <name> and N more", "<language and width>: <component> / <name>, ... and N more", "N captures, M stories", "Showing <story>, EN Mobile", "Every capture with this change", "Show all N" |
| Overview | "Area", "Reviewed", "N captures", "Biggest changes", "Components with no story" |
| Bottom bar | "← Previous", "Next →", "N of M", "N to review", "Start review", "Continue review", "Looks right", "Looks right for all N", "Undo reviewed", "Approve in the PR", "Fix the failed stories first" |
| Shortcuts | "Keyboard shortcuts", "Previous or next", "Looks right, then next", "Next language or width", "Side by side, slider, diff", "Fit or 100%", "By area or same change", "Close" |
| Screen readers only | "Filter by state", "Organize the list", "Compare", "Zoom", "Language and width", "Move the divider between before and after" |

## Risks

| Risk | How it's handled |
|---|---|
| Windows and Linux build different files | Line endings are normalized and the first CI run proves it. If they still differ, the check names the fix, and the file can be built on Linux |
| A dependency bump changes the bundle, so a React or Vite PR fails the check | Accepted. It's rare, and the error says what to run |
| The committed file adds to the repo's size | About 200 KB per page change, before compression, and the page rarely changes |
| Grouping slows a big run | Measured on the real report before merging. It only runs on changed captures, so most PRs barely notice |
| A real change hides inside a color group | No pixel may fall outside the shift, and a test covers it. A change along the exact same color direction could still join, and approving still needs a person to look |

## Not in this version

- Approving or commenting from the report (KAN-159).
- Comparing between pushes.
- Per-capture approval.
- Links from the PR comment to one capture.
- A theme switch. The page follows the system.
