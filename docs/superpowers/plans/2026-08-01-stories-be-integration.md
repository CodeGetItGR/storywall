# Stories Backend Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Stories feature (tray, avatars, full-screen viewer) off `lib/mock-data.ts` onto the real backend, applying the FE integration guide's new optional `expiresAt` and story-views endpoints, per `docs/superpowers/specs/2026-08-01-stories-be-integration-design.md`.

**Architecture:** A new pure grouping helper (`lib/stories.ts`) turns a flat `StoryResponseDto[]` into per-author queues. `StoriesRow`, `StoryAvatar`, and `app/(app)/story/[id]/page.tsx` are rewritten to consume `hooks/useStories.ts` (already updated with `useStory`, `useMarkStoryViewed`, `useStoryViews`) instead of mock data, mirroring the existing posts migration pattern (`ComposerCard` → `useCreatePost`, `PostModal` → `usePost`/`useComments`).

**Tech Stack:** Next.js App Router, React 19, `@tanstack/react-query`, `next-intl`, `@base-ui/react` (`Modal` primitive), Tailwind, `lucide-react`.

**Note on testing:** this repo has no test framework installed (no jest/vitest in `package.json`) and no existing tests for `components/feed/*`. Per the spec's Testing section, verification in this plan uses `npx tsc --noEmit`, `npm run lint`, and manual browser walkthroughs — consistent with how the rest of the feed migration (posts/comments/reactions) was verified.

---

## Already done (precedes this plan, committed in `0ab4a56`)

- `lib/api/types.ts`: `StoryRequestDto.expiresAt` optional; `StoryResponseDto.viewedByCurrentUser: boolean` added; new `StoryViewResponseDto`.
- `lib/api/endpoints.ts`: `stories.views(id)`.
- `hooks/useStories.ts`: `useMarkStoryViewed`, `useStoryViews` (403 → `[]`) added alongside the existing `useEventStories`/`useCreateStory`/`useDeleteStory`.

This plan starts from that state.

---

### Task 1: Add `useStory` (single-story fetch) to `hooks/useStories.ts`

**Files:**
- Modify: `hooks/useStories.ts`

- [ ] **Step 1: Add a `detail` query key and the `useStory` hook**

Current top of the file (from the prior session) looks like this:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { normalizeList } from "@/lib/api/pagination";
import type { StoryRequestDto, StoryResponseDto, StoryViewResponseDto } from "@/lib/api/types";

export const storyKeys = {
  list: (eventId: string) => ["events", eventId, "stories"] as const,
  views: (storyId: string) => ["stories", storyId, "views"] as const,
};
```

Add a `detail` key alongside `list`/`views`:

```ts
export const storyKeys = {
  list: (eventId: string) => ["events", eventId, "stories"] as const,
  detail: (id: string) => ["stories", id] as const,
  views: (storyId: string) => ["stories", storyId, "views"] as const,
};
```

Then add a new hook directly below `useEventStories` (which currently sits right under the
`storyKeys` block):

```ts
// GET /api/stories/{id} — event member.
export function useStory(id: string | null) {
  return useQuery({
    queryKey: storyKeys.detail(id ?? ""),
    queryFn: () => api.get<StoryResponseDto>(endpoints.stories.byId(id!)),
    enabled: Boolean(id),
  });
}
```

- [ ] **Step 2: Invalidate the detail cache on delete and mark-viewed**

`useDeleteStory` and `useMarkStoryViewed` currently only touch the list/no cache. Update both so
the single-story cache (used by the viewer page) stays consistent:

```ts
// DELETE /api/stories/{id} — author or HOST.
export function useDeleteStory(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.del<void>(endpoints.stories.byId(id)),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: storyKeys.list(eventId) });
      queryClient.removeQueries({ queryKey: storyKeys.detail(id) });
    },
  });
}

// POST /api/stories/{id}/views — event member. Idempotent: safe to call on
// every open, not just the first — the server resolves the caller's member
// from the JWT and returns the same view record on repeat calls.
//
// This hook doesn't know which eventId the story belongs to, so it can't
// build storyKeys.list(eventId) directly — instead it patches every cached
// event-stories list that happens to contain this story id.
export function useMarkStoryViewed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (storyId: string) => api.post<StoryViewResponseDto>(endpoints.stories.views(storyId)),
    onSuccess: (_data, storyId) => {
      queryClient.setQueryData<StoryResponseDto>(storyKeys.detail(storyId), (old) =>
        old ? { ...old, viewedByCurrentUser: true } : old,
      );
      queryClient.setQueriesData<StoryResponseDto[]>({ queryKey: ["events"], exact: false }, (old) =>
        old?.map((story) => (story.id === storyId ? { ...story, viewedByCurrentUser: true } : story)),
      );
    },
  });
}
```

`setQueriesData` with a partial `["events"]` key matches every `storyKeys.list(eventId)` entry
(`["events", eventId, "stories"]`) without needing to know which event this story belongs to.

- [ ] **Step 3: Verify types compile**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors mentioning `hooks/useStories.ts`.

- [ ] **Step 4: Commit**

```bash
git add hooks/useStories.ts
git commit -m "feat: add useStory hook and viewed-state cache patching"
```

---

### Task 2: Story-grouping helper

**Files:**
- Create: `lib/stories.ts`

- [ ] **Step 1: Write the helper**

```ts
import type { StoryResponseDto } from "@/lib/api/types";

export interface StoryGroup {
  authorMemberId: string;
  // Sorted oldest -> newest within the author's queue.
  stories: StoryResponseDto[];
  allSeen: boolean;
  latestCreatedAt: string;
}

interface GroupStoriesOptions {
  now?: Date;
  // The tray hides expired stories; the viewer keeps showing whatever it was
  // already asked to open, since expiry is documented as not
  // server-enforced removal.
  filterExpired?: boolean;
}

// Turns a flat event story list into per-author queues, ordered with
// authors who have at least one unseen story first, then by most recent
// story. Stories with no authorMemberId are dropped — there's no avatar to
// group them under.
export function groupStoriesByAuthor(
  stories: StoryResponseDto[],
  { now = new Date(), filterExpired = true }: GroupStoriesOptions = {},
): StoryGroup[] {
  const eligible = filterExpired ? stories.filter((s) => new Date(s.expiresAt) >= now) : stories;

  const byAuthor = new Map<string, StoryResponseDto[]>();
  for (const story of eligible) {
    if (!story.authorMemberId) continue;
    const list = byAuthor.get(story.authorMemberId) ?? [];
    list.push(story);
    byAuthor.set(story.authorMemberId, list);
  }

  const groups: StoryGroup[] = Array.from(byAuthor.entries()).map(([authorMemberId, groupStories]) => {
    const sorted = [...groupStories].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    return {
      authorMemberId,
      stories: sorted,
      allSeen: sorted.every((s) => s.viewedByCurrentUser),
      latestCreatedAt: sorted[sorted.length - 1].createdAt,
    };
  });

  groups.sort((a, b) => {
    if (a.allSeen !== b.allSeen) return a.allSeen ? 1 : -1;
    return new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime();
  });

  return groups;
}
```

- [ ] **Step 2: Verify types compile**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors mentioning `lib/stories.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/stories.ts
git commit -m "feat: add groupStoriesByAuthor helper"
```

---

### Task 3: Rewrite `StoryAvatar` for real data

**Files:**
- Modify: `components/feed/StoryAvatar.tsx` (currently 54 lines, full rewrite)

- [ ] **Step 1: Replace the file contents**

```tsx
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { cn, initialsFromName, avatarColorFromId } from '@/lib/utils'
import type { EventMemberResponseDto } from '@/lib/api/types'
import type { StoryGroup } from '@/lib/stories'
import Avatar from '@/components/ui/avatar'

interface StoryAvatarProps {
  group: StoryGroup
  member: EventMemberResponseDto
  isCurrentUser?: boolean
}

export function StoryAvatar({ group, member, isCurrentUser }: StoryAvatarProps) {
  const t = useTranslations('StoryAvatar')
  const firstStoryId = group.stories[0].id

  return (
    <Link
      href={`/story/${firstStoryId}`}
      className="flex flex-col items-center gap-2 shrink-0 group"
      aria-label={isCurrentUser ? t('yourStory') : t('userStory', { name: member.displayName })}
    >
      <div
        className={cn(
          'w-15.5 h-15.5 rounded-full p-0.75 flex items-center justify-center',
          group.allSeen ? 'bg-border' : 'bg-gradient-brand',
        )}
        aria-hidden="true"
      >
        <div className="w-full h-full rounded-full p-0.5 bg-background flex items-center justify-center">
          <Avatar
            initials={initialsFromName(member.displayName)}
            color={avatarColorFromId(member.id)}
            size="xl"
            alt={member.displayName}
            className="w-full h-full"
          />
        </div>
      </div>

      <span className="text-[11px] text-ink-muted font-medium text-center leading-tight max-w-14 truncate">
        {isCurrentUser ? t('yourStory') : member.displayName.split(' ')[0]}
      </span>
    </Link>
  )
}
```

This drops the old `isCurrentUser`-vs-"add story" branching from `StoryAvatar` entirely — the
"no story yet, show the add banner" empty state moves into `StoriesRow` (Task 4), since it has no
`StoryGroup` to render here.

- [ ] **Step 2: Verify types compile**

Run:
```bash
npx tsc --noEmit
```
Expected: errors in `components/feed/StoriesRow.tsx` (not yet updated — expected until Task 4) but
none in `StoryAvatar.tsx` itself.

- [ ] **Step 3: Commit**

```bash
git add components/feed/StoryAvatar.tsx
git commit -m "refactor: StoryAvatar renders a real StoryGroup instead of mock Story"
```

---

### Task 4: Rewrite `StoriesRow` for real data + story creation

**Files:**
- Modify: `components/feed/StoriesRow.tsx` (currently 46 lines, full rewrite)

- [ ] **Step 1: Replace the file contents**

```tsx
'use client'

import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useActiveMember } from '@/providers/EventProvider'
import { useCreateStory, useEventMembers, useEventStories, useUploadMedia } from '@/hooks'
import { groupStoriesByAuthor } from '@/lib/stories'
import { StoryAvatar } from './StoryAvatar'

interface StoriesRowProps {
  eventId: string
}

export function StoriesRow({ eventId }: StoriesRowProps) {
  const t = useTranslations('StoriesRow')
  const tAvatar = useTranslations('StoryAvatar')
  const router = useRouter()
  const activeMember = useActiveMember()
  const { data: stories = [] } = useEventStories(eventId)
  const { data: members = [] } = useEventMembers(eventId)
  const uploadMedia = useUploadMedia()
  const createStory = useCreateStory()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const isBusy = uploadMedia.isPending || createStory.isPending

  const groups = useMemo(() => groupStoriesByAuthor(stories), [stories])
  const membersById = useMemo(() => new Map(members.map(m => [m.id, m])), [members])

  const ownGroup = activeMember ? groups.find(g => g.authorMemberId === activeMember.id) : undefined
  const otherGroups = groups.filter(g => g.authorMemberId !== activeMember?.id)

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !activeMember) return

    setUploadError(null)
    try {
      const media = await uploadMedia.mutateAsync({
        eventId,
        file,
        mediaType: 'IMAGE',
        uploaderMemberId: activeMember.id,
      })
      const story = await createStory.mutateAsync({
        eventId,
        authorMemberId: activeMember.id,
        mediaId: media.id,
      })
      router.push(`/story/${story.id}`)
    } catch {
      setUploadError(t('uploadFailed'))
    }
  }

  return (
    <section
      aria-label={t('ariaLabel')}
      className="flex items-start gap-4 overflow-x-auto no-scrollbar px-4 py-4"
    >
      {/* Current user slot */}
      {ownGroup && activeMember ? (
        <StoryAvatar group={ownGroup} member={activeMember} isCurrentUser />
      ) : (
        <div className="flex flex-col items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={!activeMember || isBusy}
            aria-label={tAvatar('addYourStory')}
            className="relative w-15.5 h-15.5 flex items-center justify-center disabled:opacity-60"
          >
            <Image
              src="/assets/StoryAvatar.svg"
              alt=""
              className="w-full h-full object-cover rounded-xl"
              width={150}
              height={150}
            />
          </button>
          <span className="text-[11px] text-ink-muted font-medium text-center leading-tight max-w-14 truncate">
            {tAvatar('yourStory')}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFileChange}
            aria-label={tAvatar('addYourStory')}
            tabIndex={-1}
          />
        </div>
      )}

      {uploadError && (
        <p role="alert" className="text-xs text-destructive shrink-0 self-center max-w-32">
          {uploadError}
        </p>
      )}

      {/* Divider */}
      <div className="w-px h-14 bg-border self-center shrink-0" aria-hidden="true" />

      {/* Other stories */}
      {otherGroups.map(group => {
        const member = membersById.get(group.authorMemberId)
        if (!member) return null
        return <StoryAvatar key={group.authorMemberId} group={group} member={member} />
      })}
    </section>
  )
}
```

- [ ] **Step 2: Verify types compile**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors in `StoriesRow.tsx` or `StoryAvatar.tsx`. An error will remain in
`app/(app)/feed/[eventId]/page.tsx` (`<StoriesRow/>` missing the now-required `eventId` prop) —
expected until Task 5.

- [ ] **Step 3: Commit**

```bash
git add components/feed/StoriesRow.tsx
git commit -m "refactor: StoriesRow renders real event stories and uploads new ones"
```

---

### Task 5: Pass `eventId` into `StoriesRow` from `FeedPage`

**Files:**
- Modify: `app/(app)/feed/[eventId]/page.tsx:87`

- [ ] **Step 1: Update the call site**

Change:
```tsx
            moduleFlags.stories && <section className="top-0 z-20 bg-background/90 backdrop-blur-sm border-b border-border">
                <StoriesRow/>
            </section>
```
to:
```tsx
            moduleFlags.stories && <section className="top-0 z-20 bg-background/90 backdrop-blur-sm border-b border-border">
                <StoriesRow eventId={eventId}/>
            </section>
```

- [ ] **Step 2: Verify types compile**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors mentioning `StoriesRow` anywhere in the project.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/feed/[eventId]/page.tsx"
git commit -m "fix: pass eventId into StoriesRow"
```

---

### Task 6: Rewrite the story viewer page

**Files:**
- Modify: `app/(app)/story/[id]/page.tsx` (currently 176 lines, full rewrite)

- [ ] **Step 1: Replace the file contents**

```tsx
'use client'

import React, { use, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight, Eye, MoreVertical, Music, X } from 'lucide-react'
import {
  useDeleteStory,
  useEventMembers,
  useEventStories,
  useMarkStoryViewed,
  useMediaItem,
  useStory,
  useStoryViews,
} from '@/hooks'
import { useActiveMember, useIsHost } from '@/providers/EventProvider'
import { groupStoriesByAuthor } from '@/lib/stories'
import { Modal } from '@/components/ui/modal'
import Avatar from '@/components/ui/avatar'
import { ApiError } from '@/lib/api/client'
import { avatarColorFromId, initialsFromName } from '@/lib/utils'

export default function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations('StoryPage')
  const locale = useLocale()
  const { id } = use(params)
  const router = useRouter()
  const activeMember = useActiveMember()
  const isHost = useIsHost()

  const { data: story, error: storyError } = useStory(id)
  const eventId = story?.eventId ?? null
  const { data: media } = useMediaItem(story?.mediaId ?? null)
  const { data: allStories = [] } = useEventStories(eventId)
  const { data: members = [] } = useEventMembers(eventId)
  const markViewed = useMarkStoryViewed()
  const deleteStory = useDeleteStory(eventId ?? '')

  const [progress, setProgress] = useState(0)
  const [showViewers, setShowViewers] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const groups = useMemo(() => groupStoriesByAuthor(allStories, { filterExpired: false }), [allStories])
  const groupIndex = groups.findIndex(g => g.stories.some(s => s.id === id))
  const group = groupIndex >= 0 ? groups[groupIndex] : null
  const storyIndex = group ? group.stories.findIndex(s => s.id === id) : -1

  const membersById = useMemo(() => new Map(members.map(m => [m.id, m])), [members])
  const author = story?.authorMemberId ? membersById.get(story.authorMemberId) : undefined
  const canManage = Boolean(story && activeMember && (activeMember.id === story.authorMemberId || isHost))

  const { data: viewers = [], isFetching: viewersLoading } = useStoryViews(showViewers ? id : null)

  // Mark viewed once per opened story. Idempotent server-side, so no
  // client-side "already sent" guard is needed.
  useEffect(() => {
    markViewed.mutate(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Auto-advance progress bar. Deliberately keyed on `id` alone (not
  // `group`/`groupIndex`, which are recomputed whenever useEventStories
  // background-refetches) so a refetch mid-story doesn't reset progress.
  useEffect(() => {
    setProgress(0)
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval)
          goNext()
          return 100
        }
        return p + 2
      })
    }, 100)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (storyError instanceof ApiError && storyError.status === 404) {
    router.replace('/feed')
    return null
  }

  if (!story || !group || storyIndex < 0) return null

  function goNext() {
    if (!group) return
    if (storyIndex < group.stories.length - 1) {
      router.replace(`/story/${group.stories[storyIndex + 1].id}`)
      return
    }
    const nextGroup = groups[groupIndex + 1]
    if (nextGroup) {
      router.replace(`/story/${nextGroup.stories[0].id}`)
    } else {
      router.replace('/feed')
    }
  }

  function goPrev() {
    if (!group) return
    if (storyIndex > 0) {
      router.replace(`/story/${group.stories[storyIndex - 1].id}`)
      return
    }
    const prevGroup = groups[groupIndex - 1]
    if (prevGroup) {
      router.replace(`/story/${prevGroup.stories[prevGroup.stories.length - 1].id}`)
    }
  }

  async function handleDelete() {
    setShowMenu(false)
    await deleteStory.mutateAsync(id)
    goNext()
  }

  const timeStr = new Date(story.createdAt).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
  const authorName = author?.displayName ?? t('unknownAuthor')

  return (
    <div className="fixed inset-0 bg-ink z-50 flex flex-col items-center justify-center">
      <div className="relative w-full max-w-sm h-full max-h-dvh bg-black overflow-hidden">
        {/* Progress bars */}
        <div className="absolute top-3 left-3 right-3 z-30 flex gap-1">
          {group.stories.map((s, i) => (
            <div key={s.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{ width: i < storyIndex ? '100%' : i === storyIndex ? `${progress}%` : '0%' }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-6 left-0 right-0 z-20 flex items-center justify-between px-4 pt-2">
          <div className="flex items-center gap-2.5">
            <Avatar
              initials={initialsFromName(authorName)}
              color={avatarColorFromId(story.authorMemberId ?? story.id)}
              size="sm"
              alt={authorName}
              className="border-2 border-white/60"
            />
            <div>
              <p className="text-white text-sm font-semibold leading-tight">{authorName}</p>
              <p className="text-white/60 text-xs leading-tight">{timeStr}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <button
                onClick={() => setShowMenu(v => !v)}
                aria-label={t('moreOptions')}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => router.back()}
              aria-label={t('closeStory')}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {canManage && showMenu && (
          <div className="absolute top-16 right-4 z-30 bg-background rounded-xl shadow-lg overflow-hidden">
            <button
              onClick={handleDelete}
              disabled={deleteStory.isPending}
              className="px-4 py-2.5 text-sm text-destructive hover:bg-surface-muted transition-colors whitespace-nowrap disabled:opacity-50"
            >
              {t('deleteStory')}
            </button>
          </div>
        )}

        {/* Image */}
        {media && (
          <Image
            src={media.mediaUrl}
            alt={t('userStory', { name: authorName })}
            fill
            className="object-cover"
            sizes="400px"
            priority
          />
        )}

        {/* Tap zones */}
        <button onClick={goPrev} className="absolute left-0 top-0 w-1/3 h-full z-10" aria-label={t('previousStory')} />
        <button onClick={goNext} className="absolute right-0 top-0 w-1/3 h-full z-10" aria-label={t('nextStory')} />

        {/* Nav arrows — desktop hint */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 z-20 hidden sm:flex">
          <button onClick={goPrev} aria-label={t('previous')} className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white hover:bg-black/50 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 hidden sm:flex">
          <button onClick={goNext} aria-label={t('next')} className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white hover:bg-black/50 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Caption / song / viewed-by bar */}
        {(story.caption || story.songUrl || canManage) && (
          <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-12 bg-gradient-to-t from-black/70 to-transparent flex flex-col gap-2">
            {story.caption && <p className="text-white text-sm">{story.caption}</p>}
            {story.songUrl && (
              <a
                href={story.songUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-white/80 text-xs w-fit"
              >
                <Music className="w-3.5 h-3.5" />
                {t('listenToSong')}
              </a>
            )}
            {canManage && (
              <button
                type="button"
                onClick={() => setShowViewers(true)}
                className="inline-flex items-center gap-1.5 text-white/80 text-xs w-fit"
              >
                <Eye className="w-3.5 h-3.5" />
                {t('viewedBy')}
              </button>
            )}
          </div>
        )}
      </div>

      <Modal open={showViewers} onClose={() => setShowViewers(false)} size="sm" closeLabel={t('close')}>
        <div className="px-4 py-4">
          <h2 className="text-sm font-bold text-ink mb-3">
            {viewersLoading ? t('loadingViewers') : t('viewedByCount', { count: viewers.length })}
          </h2>
          {!viewersLoading && viewers.length === 0 && <p className="text-sm text-ink-muted">{t('noViewers')}</p>}
          <div className="flex flex-col gap-3">
            {viewers.map(v => {
              const m = membersById.get(v.memberId)
              const name = m?.displayName ?? t('unknownAuthor')
              return (
                <div key={v.id} className="flex items-center gap-3">
                  <Avatar initials={initialsFromName(name)} color={avatarColorFromId(v.memberId)} size="sm" alt={name} />
                  <span className="text-sm text-ink">{name}</span>
                </div>
              )
            })}
          </div>
        </div>
      </Modal>
    </div>
  )
}
```

- [ ] **Step 2: Verify `useMediaItem` is exported**

`hooks/useMedia.ts` already exports `useMediaItem` (confirmed during design) and `hooks/index.ts`
re-exports it via `export * from "./useMedia"`, so no hook-layer changes are needed for this step.

- [ ] **Step 3: Verify types compile**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors mentioning `app/(app)/story/[id]/page.tsx`. Errors will remain about missing
i18n keys only if your editor lints JSON against usage — `next-intl` doesn't type-check message
keys by default, so this step should be clean; Task 7 fills in the actual keys.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/story/[id]/page.tsx"
git commit -m "refactor: story viewer reads real API data, adds seen-by and delete"
```

---

### Task 7: Update translations

**Files:**
- Modify: `messages/en.json:13-20,258-269`
- Modify: `messages/el.json:13-20,258-269`

- [ ] **Step 1: Update `messages/en.json`**

Replace:
```json
  "StoriesRow": {
    "ariaLabel": "Stories"
  },
```
with:
```json
  "StoriesRow": {
    "ariaLabel": "Stories",
    "uploadFailed": "Couldn't upload your story. Please try again."
  },
```

Replace the `StoryPage` block:
```json
  "StoryPage": {
    "closeStory": "Close story",
    "userStory": "{name}'s story",
    "story": "Story",
    "previousStory": "Previous story",
    "nextStory": "Next story",
    "previous": "Previous",
    "next": "Next",
    "replyPlaceholder": "Reply to story...",
    "reactWithHeart": "React with heart",
    "sendReply": "Send reply"
  },
```
with:
```json
  "StoryPage": {
    "closeStory": "Close story",
    "userStory": "{name}'s story",
    "story": "Story",
    "previousStory": "Previous story",
    "nextStory": "Next story",
    "previous": "Previous",
    "next": "Next",
    "moreOptions": "More options",
    "deleteStory": "Delete story",
    "listenToSong": "Listen to song",
    "viewedBy": "Viewed by",
    "viewedByCount": "Viewed by {count}",
    "loadingViewers": "Loading…",
    "noViewers": "No views yet",
    "unknownAuthor": "Someone",
    "close": "Close"
  },
```

`StoryAvatar` (`addYourStory`/`userStory`/`yourStory`) is unchanged — Task 3/4 reuse those keys as-is.

- [ ] **Step 2: Update `messages/el.json`**

Replace:
```json
  "StoriesRow": {
    "ariaLabel": "Ιστορίες"
  },
```
with:
```json
  "StoriesRow": {
    "ariaLabel": "Ιστορίες",
    "uploadFailed": "Δεν ήταν δυνατή η μεταφόρτωση της ιστορίας σας. Δοκιμάστε ξανά."
  },
```

Replace the `StoryPage` block:
```json
  "StoryPage": {
    "closeStory": "Κλείσιμο ιστορίας",
    "userStory": "Ιστορία του/της {name}",
    "story": "Ιστορία",
    "previousStory": "Προηγούμενη ιστορία",
    "nextStory": "Επόμενη ιστορία",
    "previous": "Προηγούμενο",
    "next": "Επόμενο",
    "replyPlaceholder": "Απάντηση στην ιστορία...",
    "reactWithHeart": "Αντίδραση με καρδιά",
    "sendReply": "Αποστολή απάντησης"
  },
```
with:
```json
  "StoryPage": {
    "closeStory": "Κλείσιμο ιστορίας",
    "userStory": "Ιστορία του/της {name}",
    "story": "Ιστορία",
    "previousStory": "Προηγούμενη ιστορία",
    "nextStory": "Επόμενη ιστορία",
    "previous": "Προηγούμενο",
    "next": "Επόμενο",
    "moreOptions": "Περισσότερες επιλογές",
    "deleteStory": "Διαγραφή ιστορίας",
    "listenToSong": "Ακούστε το τραγούδι",
    "viewedBy": "Είδαν",
    "viewedByCount": "Είδαν {count}",
    "loadingViewers": "Φόρτωση…",
    "noViewers": "Δεν υπάρχουν προβολές ακόμα",
    "unknownAuthor": "Κάποιος/α",
    "close": "Κλείσιμο"
  },
```

- [ ] **Step 3: Validate JSON syntax**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); JSON.parse(require('fs').readFileSync('messages/el.json','utf8')); console.log('ok')"
```
Expected: `ok`

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/el.json
git commit -m "i18n: add story viewer/seen-by/delete strings, drop unused reply/react strings"
```

---

### Task 8: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Lint**

Run:
```bash
npm run lint
```
Expected: no errors in any file touched by this plan (`hooks/useStories.ts`, `lib/stories.ts`,
`components/feed/StoryAvatar.tsx`, `components/feed/StoriesRow.tsx`,
`app/(app)/feed/[eventId]/page.tsx`, `app/(app)/story/[id]/page.tsx`).

- [ ] **Step 2: Type check**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors anywhere in the project.

- [ ] **Step 3: Manual browser walkthrough**

Start the dev server (`npm run dev`) against a backend with `NEXT_PUBLIC_API_BASE_URL` pointed at
a real environment that has the `stories` module enabled for at least one event, then in-browser:

1. Open a feed with the stories module on. Confirm the tray renders real member avatars (not
   mock names like "Emma"/"James"), grouped one avatar per author.
2. Tap "Your story" with no existing story → file picker opens → pick an image → confirm it
   uploads, a story is created, and you land on `/story/{id}` showing that image.
3. Reload the feed → confirm your own avatar now shows a story ring (not the add-banner) and
   "Your story" label, and the ring is gray (seen) since you just viewed it.
4. As a different member (or a second browser profile), open another author's story from the
   tray → confirm the ring for that author changes from gradient (unseen) to gray (seen) after
   closing the viewer and returning to the feed.
5. In the viewer, confirm: prev/next tap zones and arrow buttons work within an author's multiple
   stories (if you created more than one) and roll over to the next/previous author's group at the
   ends; caption text renders if the story has one; a `songUrl` renders as a "Listen to song" link
   that opens in a new tab.
6. As the story's author (or a HOST), confirm the "Viewed by" pill appears and opens a sheet
   listing viewer names; as a different non-host, non-author member, confirm the pill does not
   appear at all.
7. As the author or a HOST, use the "…" menu to delete a story → confirm the viewer advances (or
   closes if it was the only story) and the deleted story no longer appears in the tray.
8. Confirm there is no reply input or heart-react button anywhere in the story viewer.

- [ ] **Step 4: No commit needed for this task** (verification only — if any step fails, fix the
relevant file from Tasks 1–7 and re-run the specific verification step that caught it, then
commit the fix separately with a `fix:` message.)

---

## Self-review notes (for the plan author, not a task)

- Spec coverage: optional `expiresAt` ✅ (done pre-plan), `viewedByCurrentUser` ✅ (done pre-plan),
  `useStoryViews`/`useMarkStoryViewed` ✅ (done pre-plan), grouping ✅ Task 2, tray real data ✅
  Task 4, avatar real data ✅ Task 3, creation flow ✅ Task 4, viewer real data ✅ Task 6, reply/heart
  removal ✅ Task 6, seen-by + delete ✅ Task 6, i18n ✅ Task 7.
- Type consistency checked: `StoryGroup` (Task 2) fields (`authorMemberId`, `stories`, `allSeen`,
  `latestCreatedAt`) match every usage in Tasks 3/4/6. `useStory`/`useMediaItem`/`useEventMembers`/
  `useEventStories`/`useMarkStoryViewed`/`useStoryViews`/`useDeleteStory` signatures match their
  definitions in `hooks/useStories.ts`, `hooks/useMedia.ts`, `hooks/useEventMembers.ts`.
