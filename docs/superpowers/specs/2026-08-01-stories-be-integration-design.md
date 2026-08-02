# Stories — Full Backend Integration Design

## Context

`TASKS.md` explicitly flags Stories (`components/feed/StoriesRow.tsx`, `StoryAvatar.tsx`,
`app/(app)/story/[id]/page.tsx`) as "not yet migrated off mock data" — deferred scope from the
posts/comments/reactions migration. Separately, a new FE integration guide documents two backend
additions: `StoryRequestDto.expiresAt` is now optional (server defaults to `createdAt + 24h`), and
new story-views endpoints (`POST/GET /api/stories/{id}/views`) exist for marking a story viewed
and listing viewers.

This pass does both: applies the guide's two additions, and fully migrates the Stories UI off
`lib/mock-data.ts` onto the real API, mirroring the pattern already established for posts
(`ComposerCard` → `useCreatePost`, `PostCard`/`PostModal` → `usePosts`/`useReactions`/`useComments`).

Comments and reactions are not supported on stories — confirmed in the guide — so no such UI is
added for stories.

## Decisions locked with the user

- **API layer** (already applied, precedes this doc): `StoryRequestDto.expiresAt` optional;
  `StoryResponseDto` gains a backend-added `viewedByCurrentUser: boolean` field; new
  `StoryViewResponseDto`; `endpoints.stories.views(id)`; hooks `useMarkStoryViewed`,
  `useStoryViews` (catches 403 → `[]`, since only the author/HOST may list viewers).
- **Seen/unseen ring state** is read directly from `StoryResponseDto.viewedByCurrentUser` — no
  client-side tracking needed, since the backend now returns it per-story per-viewer.
- **Grouping:** the tray groups stories by `authorMemberId` (one avatar per author, IG/WhatsApp
  style), not a flat per-story list. Expired stories (`expiresAt < now`) are filtered out
  client-side before grouping, per the guide (expiry isn't server-enforced removal).
- **Viewer ordering:** unseen authors first (an author group is "unseen" if any of its stories has
  `viewedByCurrentUser === false`), then by most recent story `createdAt`.
- **Story creation:** tapping "Your story" opens a file picker directly (no detour through the
  post composer). A picked image uploads via `useUploadMedia`, then `useCreateStory` is called
  with no `expiresAt` (server 24h default), then the viewer opens on the new story.
- **Reply input + heart-react button** in the mock viewer are removed entirely — not backed by
  any endpoint, and the guide is explicit that stories don't support comments/reactions.
- **Viewer data source:** a new `useStory(id)` hook (`GET /api/stories/{id}`) lets
  `/story/[id]` resolve cold (a bare link/refresh) without depending on the tray's query cache.
  The page then loads `useEventStories(eventId)` (from the resolved story) to build the same
  author's queue for prev/next/auto-advance, and `useEventMembers(eventId)` to resolve the
  author's display name/avatar for the header.
- **Seen-by + delete affordances** are both added to the viewer, both gated to
  author-or-HOST:
    - A "viewed by N" pill, shown only when `activeMember.id === story.authorMemberId || isHost`.
      Tapping it lazily fires `useStoryViews(id)` and opens a sheet listing viewer names (resolved
      against `useEventMembers`). The query is not fired at all for non-author/non-host viewers
      (it would just 403).
    - A "…" menu, same gating, offering delete via `useDeleteStory(eventId)`. On success, advance to
      the next story in the author's queue, or close the viewer if it was the last one.
- **Mark-viewed:** `useMarkStoryViewed().mutate(id)` fires on mount of the viewer for each `id`
  (idempotent per the guide — safe to call on every open, not just the first).

## Architecture

### API layer (done)

- `lib/api/types.ts`: `StoryRequestDto.expiresAt?`, `StoryResponseDto.viewedByCurrentUser`,
  `StoryViewResponseDto`.
- `lib/api/endpoints.ts`: `stories.views(id)`.
- `hooks/useStories.ts`: `useEventStories`, `useCreateStory`, `useDeleteStory` (existing, unchanged
  behavior aside from `expiresAt` now being optional on input), `useMarkStoryViewed`,
  `useStoryViews`. Adds `useStory(id)` (`GET /api/stories/{id}`, `storyKeys.detail(id)`).

### New: `lib/stories.ts`

Pure helper module, no React:

```ts
export interface StoryGroup {
    authorMemberId: string;
    stories: StoryResponseDto[]; // sorted oldest → newest within the author
    allSeen: boolean;
    latestCreatedAt: string;
}

export function groupStoriesByAuthor(stories: StoryResponseDto[], now = new Date()): StoryGroup[];
```

Filters `expiresAt < now`, groups by `authorMemberId` (nulls dropped — a story needs an author to
render an avatar), sorts stories within a group by `createdAt` ascending, sorts groups by
`allSeen` ascending then `latestCreatedAt` descending.

### `components/feed/StoriesRow.tsx`

- New prop: `eventId: string`.
- `useActiveMember()` for the current member; `useEventStories(eventId)` for all stories;
  `groupStoriesByAuthor` to build the tray.
- Current-user slot: finds the group matching `activeMember.id` if present (links to its first
  unseen-or-first story), otherwise renders the existing "add" visual wired to a hidden
  `<input type=file>` → `useUploadMedia({ eventId, uploaderMemberId: activeMember.id })` →
  `useCreateStory({ eventId, authorMemberId: activeMember.id, mediaId })` → navigate to
  `/story/{newStoryId}` on success. Mirrors `ComposerCard`'s single-file upload-then-create
  sequencing, simplified to one file (no batch).
- Other groups render via `StoryAvatar`, one per group, in the sorted order above.

### `components/feed/StoryAvatar.tsx`

- Props become `{ group: StoryGroup; member: EventMemberResponseDto; isCurrentUser?: boolean }`
  (drops the mock `Story`/`User` types).
- Ring color: `group.allSeen ? 'bg-border' : 'bg-gradient-brand'` (unchanged visual logic, new
  data source).
- `href`: `/story/${group.stories[0].id}` (first story in the author's queue — the viewer itself
  decides where to resume, see below).
- Label: `member.displayName.split(' ')[0]`.

### `app/(app)/story/[id]/page.tsx`

- `useStory(id)` resolves the story (and its `eventId`); redirect (`router.replace('/feed')`) on a
  404 `ApiError`.
- `useEventStories(story.eventId)` + `groupStoriesByAuthor` to find this story's group; the
  in-group index (not the global list) drives progress bars, auto-advance, and prev/next. Opening
  a group starts at its first _unseen_ story if any, else its first story (`viewedByCurrentUser`
  already reflects prior views, so a re-opened group doesn't restart from the very first slide
  every time).
- On last-story auto-advance / manual next, move to the next _group_ (next author) via the same
  ordering `StoriesRow` used, rather than falling through to `/feed`, unless this was the last
  group — mirrors IG-style continuous playback. (`StoriesRow`'s ordering needs to be
  recomputable from the page too — hoist the ordering into `groupStoriesByAuthor`'s return order
  so both call sites agree without passing state through the route.)
- `useEventMembers(story.eventId)` to resolve the author's `displayName`/avatar for the header.
- `useMarkStoryViewed().mutate(id)` in a `useEffect` keyed on `id`.
- Author/HOST only (`activeMember.id === story.authorMemberId || isHost`): "viewed by N" pill,
  lazy `useStoryViews(id)` on tap, sheet listing resolved member names; "…" menu → `useDeleteStory`
  → advance/close on success.
- Caption renders as an overlay line; `songUrl` (if present) renders as a small "🎵 listen" link
  (`target="_blank"`).
- Reply input and heart button: deleted.

## Data flow

1. `FeedPage` passes `eventId` to `StoriesRow`.
2. `StoriesRow` fetches all event stories once, groups client-side, renders avatars.
3. Tapping an avatar navigates to `/story/{firstStoryIdInGroup}`.
4. The viewer independently re-fetches (`useStory` + `useEventStories`) rather than relying on
   navigation state, so deep links/refreshes work.
5. Viewing marks-viewed (idempotent POST); subsequent tray/queue reads reflect
   `viewedByCurrentUser: true` after query invalidation on that mutation's success
   (`storyKeys.list(eventId)` and `storyKeys.detail(id)` both invalidated).
6. Creation: file → `useUploadMedia` → `useCreateStory` → cache invalidation already handled by
   the existing hook → navigate to the new story.

## Error handling

- `useStory` 404 → redirect to `/feed` (no reliable "go back to the right event" without the id,
  same limitation the current mock page already accepts).
- Upload/create failure in the tray: inline error text near the file input, no retry-queue
  complexity (single file, not a batch) — just re-enable the input and show the message.
- `useStoryViews` 403: already handled at the hook level (returns `[]`); the "viewed by" pill
  simply isn't rendered for non-author/non-host viewers, so this path shouldn't normally fire.
- Delete failure: inline error, viewer stays open.

## Testing

No existing test suite covers `components/feed/*` (checked — none found in the repo). Consistent
with existing project convention, this change is verified by manual/browser testing of the golden
path (create → appear in tray → view → mark-viewed reflected → seen-by → delete) rather than new
test infrastructure.
