# Component decomposition audit

Files that mix data-fetching, local state, event handlers, and large inline
JSX in a single component, making them harder to read, test, and extend.
Split candidates are listed per file. None of this is a correctness bug —
it's a maintainability call, so treat priority as roughly top-to-bottom.

`react/jsx-no-bind` is now enabled in [eslint.config.mjs](eslint.config.mjs)
(see below). It originally reported 121 pre-existing violations (inline
arrow functions passed as JSX props) across `app/`, `components/`, `hooks/`,
`lib/`, `providers/`, `i18n/`. The three "high priority" items below are now
split and lint-clean; **63 violations remain**, all in files not yet
touched by this pass.

## Done

- **`components/feed/PostModal.tsx`** — split into `PostCommentsPanel`,
  `PostCommentForm`, `CommentsList`, `PostMediaColumn` (new files under
  `components/feed/post/`). `PostModal.tsx` now only owns the modal shell,
  state, and handlers; no intermediate wrapper component.
- **`app/(app)/tools/rsvp/page.tsx`** — split into `RsvpHeader`,
  `RsvpSubmittedView`, `RsvpForm`, `GuestList` (new files under
  `components/rsvp/`, matching the `components/feed/`, `components/manage/`
  per-feature-folder convention already used elsewhere in the codebase).
- **`app/(app)/story/[id]/page.tsx`** — split into `StoryProgressBar`,
  `StoryHeader`, `StoryCaptionBar`, `StoryViewersModal` (new files under
  `components/story/`).

Each extracted component calls `useTranslations()` itself rather than
receiving the translation function or pre-translated strings as a prop —
next-intl reads from context, so threading `t` through every level was pure
prop-drilling with no purpose. Only genuine data/state/handlers get passed
down now. All three touched trees are 0 `react/jsx-no-bind` violations.

## Medium priority — not yet done

- **`app/(app)/manage/SettingsTab.tsx`** (249 lines). Extract
  `CoverPhotoUploader` (the preview/upload/remove block, ~lines 104–155);
  the rest of the form is fine as one component.
- **`app/(app)/tools/quiz/page.tsx`** (220 lines). Two large inline-rendered
  branches (quiz view vs. results view), each with its own grading/styling
  logic. Extract `QuizResults` and `QuizQuestionCard`.
- **`app/(app)/tools/playlist/page.tsx`** (195 lines). Extract `AddSongForm`
  and `PlaylistItemRow`.
- **`app/invite/[token]/page.tsx`** (180 lines). A `TerminalState` component
  already exists but the "already used" case duplicates its markup inline
  instead of reusing it (~lines 63–78) — fix that duplication, and extract
  `GuestJoinForm`.
- **`app/(app)/tools/seating/page.tsx`** (152 lines). The per-table
  expandable block (guest chips + empty-seat loop) is a clean extraction:
  `TableCard`.
- **`app/(app)/tools/gifts/page.tsx`** (136 lines). Extract `GiftCard` for
  the card-map body (~lines 74–131) — it has non-trivial conditional
  rendering.
- **`app/(app)/tools/wishbook/page.tsx`** (134 lines). Extract
  `WishbookEntryCard` (~lines 97–129) and hoist the inline time-formatting
  IIFE into a helper function.

## Low priority / already reasonable

- **`app/(app)/manage/InvitationsTab.tsx`** (292 lines) — already split into
  `CreateInvitationForm`/`InvitationRow`; `InvitationRow` mixes edit/copy/
  delete state but is self-contained enough to leave alone for now.
- **`components/feed/PostCard.tsx`** (148 lines) — borderline; single- vs.
  multi-media rendering branches could become `PostMediaGrid`, not urgent.
- **`app/(app)/manage/page.tsx`**, **`app/(app)/notifications/page.tsx`** —
  already delegate to subcomponents (`NotifRow`, the manage tabs).
- **`app/(app)/tools/venue/page.tsx`**, **`app/(app)/events/new/page.tsx`**,
  **`app/register/page.tsx`**, **`app/(app)/tools/future-messages/page.tsx`**
  — sizeable but a single form/static view with no real concern-mixing.
  Leave as-is.

## Lint rule added

`react/jsx-no-bind` (from `eslint-plugin-react`, already a transitive dep of
`eslint-config-next` — added directly to `package.json` so it's resolvable
from `eslint.config.mjs`) now errors on inline arrow-function/`.bind()`
*literals* passed as JSX props, anywhere in the tree, including DOM elements
and refs (`allowArrowFunctions: false`, `allowBind: false`). Passing a
regular named function by reference is allowed (`allowFunctions: true`) —
banning that too would flag ordinary callback-prop passthrough (e.g.
`onClose={onClose}`) everywhere, which isn't what was asked for. The fix for
each violation is almost always the same shape: pull the arrow body out into
a `function handleX() { ... }` in the component and pass `handleX` instead.
