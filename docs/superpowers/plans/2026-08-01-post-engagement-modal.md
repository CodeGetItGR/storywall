# Post Engagement + Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire post reactions and comments to the real backend, and replace the mock-data `/post/[id]` page with a deep-linkable modal opened from the feed.

**Architecture:** A shared `usePostLike` hook optimistically patches the cached `PostResponseDto` (in both the feed's infinite-query cache and the single-post cache) on like/unlike, falling back to a one-time reactor-list lookup only when a stale session needs a reaction id it doesn't have. `PostCard`'s comment affordance and a new `PostModal` component read/write the post's `?post=<id>` URL param on the feed page; `/post/[id]` becomes a thin resolver that redirects into that same modal so there's one implementation, not two.

**Tech Stack:** Next.js App Router, TanStack Query v5, next-intl.

**Note on verification:** This repo has no test framework installed (no jest/vitest/RTL, confirmed via `package.json` and a repo-wide search — zero `*.test.*`/`*.spec.*` files outside `node_modules`). Introducing one is out of scope for this change. Each task below verifies with `npx tsc --noEmit` (the project's actual gate — `npm run lint` needs local eslint setup this sandbox doesn't have) plus a final manual browser pass, matching how the prior feed-migration work in this codebase was verified.

**Note on a spec deviation:** the design spec described comment-count syncing as an optimistic cache patch, "the same way `usePostLike` patches reaction fields." Task 7 instead uses `invalidateQueries` (on the single-post cache and, via a predicate match, whichever event's feed list is mounted). This is simpler — commenting doesn't need the same instant, every-tap responsiveness liking does — and it sidesteps threading `eventId` through `CommentRequestDto` just for cache-patch purposes. It also matches the invalidate-on-mutate pattern every other mutation in this codebase already uses (`useCreatePost`, `useCreateEvent`, etc.) — `usePostLike`'s manual patch is the exception, justified there by needing zero-latency feedback on every like tap.

---

## File Structure

- Modify `lib/api/types.ts` — add `likedByCurrentUser` to `PostResponseDto`.
- Modify `hooks/usePosts.ts` — add `patchPostInCaches` helper (optimistic cache patch used by likes).
- Modify `hooks/useReactions.ts` — extract `fetchPostReactions` so it can be called imperatively outside the `usePostReactions` hook.
- Create `hooks/usePostLike.ts` — the shared like/unlike hook.
- Modify `hooks/index.ts` — export the new hook.
- Modify `hooks/useComments.ts` — after posting a comment, refresh the cached `commentCount` on the post.
- Modify `components/feed/PostCard.tsx` — wire the heart button to `usePostLike`; comment button opens the modal via URL instead of navigating.
- Modify `messages/en.json`, `messages/el.json` — replace the unused `PostPage` namespace with `PostModal`.
- Create `components/feed/PostModal.tsx` — the modal itself.
- Modify `components/feed/index.ts` — export `PostModal`.
- Modify `app/(app)/feed/[eventId]/page.tsx` — render `PostModal` when `?post=` is present.
- Modify `app/(app)/post/[id]/page.tsx` — replace the mock-data page with a redirect resolver.

---

### Task 1: Add `likedByCurrentUser` to `PostResponseDto`

**Files:**
- Modify: `lib/api/types.ts:490-506`

- [ ] **Step 1: Add the field**

In `lib/api/types.ts`, the `PostResponseDto` interface currently reads:

```ts
export interface PostResponseDto {
  id: string;
  eventId: string;
  authorMemberId: string | null;
  author: PostAuthorDto | null;
  type: PostType;
  content: string | null;
  isPinned: boolean;
  // Already ordered by displayOrder and URL-resolved — render as-is.
  media: MediaResponseDto[];
  commentCount: number;
  reactionCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
```

Change it to:

```ts
export interface PostResponseDto {
  id: string;
  eventId: string;
  authorMemberId: string | null;
  author: PostAuthorDto | null;
  type: PostType;
  content: string | null;
  isPinned: boolean;
  // Already ordered by displayOrder and URL-resolved — render as-is.
  media: MediaResponseDto[];
  commentCount: number;
  reactionCount: number;
  // True if the requesting member has any reaction on the post. Always
  // false immediately after POST /api/posts (a fresh post can't have
  // reactions yet) and false for a caller who isn't a member of the
  // post's event — both resolved server-side.
  likedByCurrentUser: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: A new error in `app/(app)/post/[id]/page.tsx` — its `toPostResponseDto` adapter builds a `PostResponseDto` object literal and TypeScript will flag it as missing the new required `likedByCurrentUser` property. That's expected; this file is fully rewritten in Task 12. Confirm there are no errors anywhere else.

- [ ] **Step 3: Commit**

```bash
git add lib/api/types.ts
git commit -m "feat: add likedByCurrentUser to PostResponseDto"
```

---

### Task 2: Add `patchPostInCaches` helper

**Files:**
- Modify: `hooks/usePosts.ts:1-11`

- [ ] **Step 1: Add the helper**

In `hooks/usePosts.ts`, change the top imports from:

```ts
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { normalizeList, type Page } from "@/lib/api/pagination";
import type { MediaResponseDto, PostRequestDto, PostResponseDto } from "@/lib/api/types";

export const postKeys = {
  list: (eventId: string) => ["events", eventId, "posts"] as const,
  detail: (id: string) => ["posts", id] as const,
  media: (postId: string) => ["posts", postId, "media"] as const,
};
```

to:

```ts
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData, type QueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { normalizeList, type Page } from "@/lib/api/pagination";
import type { MediaResponseDto, PostRequestDto, PostResponseDto } from "@/lib/api/types";

export const postKeys = {
  list: (eventId: string) => ["events", eventId, "posts"] as const,
  detail: (id: string) => ["posts", id] as const,
  media: (postId: string) => ["posts", postId, "media"] as const,
};

// Applies a partial update to a post wherever it's currently cached — the
// single-post query and, if a page of it is loaded, the event's feed list.
// Used for optimistic updates (likes) where waiting on a refetch would feel
// laggy; other mutations in this file just invalidate instead.
export function patchPostInCaches(
  queryClient: QueryClient,
  eventId: string,
  postId: string,
  patch: Partial<PostResponseDto>,
) {
  queryClient.setQueryData<PostResponseDto>(postKeys.detail(postId), (old) =>
    old ? { ...old, ...patch } : old,
  );

  queryClient.setQueryData<InfiniteData<Page<PostResponseDto>>>(postKeys.list(eventId), (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        content: page.content.map((post) => (post.id === postId ? { ...post, ...patch } : post)),
      })),
    };
  });
}
```

Leave the rest of the file (`useEventPosts`, `usePost`, `usePostMedia`, `useCreatePost`, `useDeletePost`) unchanged.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: Same single error as after Task 1 (in `app/(app)/post/[id]/page.tsx`, fixed in Task 12) — no new errors introduced by this file.

- [ ] **Step 3: Commit**

```bash
git add hooks/usePosts.ts
git commit -m "feat: add patchPostInCaches helper for optimistic post updates"
```

---

### Task 3: Extract `fetchPostReactions`

**Files:**
- Modify: `hooks/useReactions.ts:1-21`

- [ ] **Step 1: Extract the fetcher**

Change:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { normalizeList } from "@/lib/api/pagination";
import type { ReactionRequestDto, ReactionResponseDto } from "@/lib/api/types";

export const reactionKeys = {
  list: (postId: string) => ["posts", postId, "reactions"] as const,
};

// GET /api/posts/{postId}/reactions — event member (checked in the service).
export function usePostReactions(postId: string | null) {
  return useQuery({
    queryKey: reactionKeys.list(postId ?? ""),
    queryFn: async () => {
      const res = await api.get<ReactionResponseDto[]>(endpoints.posts.reactions(postId!));
      return normalizeList(res).items;
    },
    enabled: Boolean(postId),
  });
}
```

to:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { normalizeList } from "@/lib/api/pagination";
import type { ReactionRequestDto, ReactionResponseDto } from "@/lib/api/types";

export const reactionKeys = {
  list: (postId: string) => ["posts", postId, "reactions"] as const,
};

export async function fetchPostReactions(postId: string): Promise<ReactionResponseDto[]> {
  const res = await api.get<ReactionResponseDto[]>(endpoints.posts.reactions(postId));
  return normalizeList(res).items;
}

// GET /api/posts/{postId}/reactions — event member (checked in the service).
export function usePostReactions(postId: string | null) {
  return useQuery({
    queryKey: reactionKeys.list(postId ?? ""),
    queryFn: () => fetchPostReactions(postId!),
    enabled: Boolean(postId),
  });
}
```

Leave `useCreateReaction` and `useDeleteReaction` (the rest of the file) unchanged.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: Same single pre-existing error as before this task (in `app/(app)/post/[id]/page.tsx`) — no new ones.

- [ ] **Step 3: Commit**

```bash
git add hooks/useReactions.ts
git commit -m "refactor: extract fetchPostReactions for imperative use"
```

---

### Task 4: Create `usePostLike`

**Files:**
- Create: `hooks/usePostLike.ts`

- [ ] **Step 1: Write the hook**

```ts
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useActiveMember } from "@/providers/EventProvider";
import { useCreateReaction, useDeleteReaction, reactionKeys, fetchPostReactions } from "@/hooks/useReactions";
import { patchPostInCaches } from "@/hooks/usePosts";
import type { PostResponseDto } from "@/lib/api/types";

// Reaction ids created this session, so unliking right after liking never
// needs to re-fetch the reactor list to find what to delete. Keyed by
// postId — module-level so it survives PostCard/PostModal remounts within
// the session; resets on a full page reload, which the fallback below
// covers (a one-time reactor-list lookup).
const knownReactionIds = new Map<string, string>();

export function usePostLike(post: PostResponseDto) {
  const queryClient = useQueryClient();
  const activeMember = useActiveMember();
  const createReaction = useCreateReaction();
  const deleteReaction = useDeleteReaction(post.id);
  const [isToggling, setIsToggling] = useState(false);

  async function toggle() {
    if (!activeMember || isToggling) return;

    const wasLiked = post.likedByCurrentUser;
    const previousCount = post.reactionCount;

    setIsToggling(true);
    patchPostInCaches(queryClient, post.eventId, post.id, {
      likedByCurrentUser: !wasLiked,
      reactionCount: previousCount + (wasLiked ? -1 : 1),
    });

    try {
      if (!wasLiked) {
        const reaction = await createReaction.mutateAsync({
          postId: post.id,
          memberId: activeMember.id,
          reactionType: "LIKE",
        });
        knownReactionIds.set(post.id, reaction.id);
      } else {
        let reactionId = knownReactionIds.get(post.id);
        if (!reactionId) {
          const reactions = await queryClient.fetchQuery({
            queryKey: reactionKeys.list(post.id),
            queryFn: () => fetchPostReactions(post.id),
          });
          reactionId = reactions.find((r) => r.memberId === activeMember.id)?.id;
        }
        if (reactionId) {
          await deleteReaction.mutateAsync(reactionId);
        }
        knownReactionIds.delete(post.id);
      }
    } catch {
      patchPostInCaches(queryClient, post.eventId, post.id, {
        likedByCurrentUser: wasLiked,
        reactionCount: previousCount,
      });
    } finally {
      setIsToggling(false);
    }
  }

  return { liked: post.likedByCurrentUser, count: post.reactionCount, toggle, isPending: isToggling };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: Same single pre-existing error as before (in `app/(app)/post/[id]/page.tsx`) — no new ones from this file.

- [ ] **Step 3: Commit**

```bash
git add hooks/usePostLike.ts
git commit -m "feat: add usePostLike hook with optimistic like/unlike"
```

---

### Task 5: Export `usePostLike` from the hooks barrel

**Files:**
- Modify: `hooks/index.ts:1-19`

- [ ] **Step 1: Add the export**

Add a line after the `usePosts` export:

```ts
export * from "./usePosts";
export * from "./usePostLike";
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: Same single pre-existing error as before (in `app/(app)/post/[id]/page.tsx`).

- [ ] **Step 3: Commit**

```bash
git add hooks/index.ts
git commit -m "chore: export usePostLike from hooks barrel"
```

---

### Task 6: Wire `PostCard`'s heart button to `usePostLike`

**Files:**
- Modify: `components/feed/PostCard.tsx`

- [ ] **Step 1: Replace the local liked/count state**

Change the imports at the top of `components/feed/PostCard.tsx` from:

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, MessageCircle, MoreHorizontal, Pin } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn, initialsFromName, avatarColorFromId } from '@/lib/utils'
import type { PostResponseDto } from '@/lib/api/types'
import Avatar from '@/components/ui/avatar'
```

to:

```tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Heart, MessageCircle, MoreHorizontal, Pin } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn, initialsFromName, avatarColorFromId } from '@/lib/utils'
import { usePostLike } from '@/hooks'
import type { PostResponseDto } from '@/lib/api/types'
import Avatar from '@/components/ui/avatar'
```

Then replace the component body's opening (from the `export function PostCard` line through the `handleLike` function) — currently:

```tsx
export function PostCard({ post, showCommentLink = true }: PostCardProps) {
  const t = useTranslations('PostCard')
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(post.reactionCount)

  const authorName = post.author?.displayName ?? t('unknownAuthor')
  const authorSubtitle = post.author?.nickname ?? post.author?.role
  const timeAgo = timeAgoParts(post.createdAt)
  const media = post.media

  function handleLike() {
    if (liked) {
      setLiked(false)
      setLikeCount(c => c - 1)
    } else {
      setLiked(true)
      setLikeCount(c => c + 1)
    }
  }
```

with:

```tsx
export function PostCard({ post, showCommentLink = true }: PostCardProps) {
  const t = useTranslations('PostCard')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { liked, count: likeCount, toggle: handleLike, isPending: isLikePending } = usePostLike(post)

  const authorName = post.author?.displayName ?? t('unknownAuthor')
  const authorSubtitle = post.author?.nickname ?? post.author?.role
  const timeAgo = timeAgoParts(post.createdAt)
  const media = post.media

  function openPost() {
    const params = new URLSearchParams(searchParams.toString())
    params.set('post', post.id)
    router.push(`${pathname}?${params.toString()}`)
  }
```

- [ ] **Step 2: Disable the heart button while a toggle is in flight**

In the Like button, change:

```tsx
          <button
            onClick={handleLike}
            aria-label={liked ? t('unlikePost') : t('likePost')}
            aria-pressed={liked}
```

to:

```tsx
          <button
            onClick={handleLike}
            disabled={isLikePending}
            aria-label={liked ? t('unlikePost') : t('likePost')}
            aria-pressed={liked}
```

- [ ] **Step 3: Point the comment button at `openPost` instead of a Link**

Change:

```tsx
          {/* Comment */}
          {showCommentLink ? (
            <Link
              href={`/post/${post.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-ink-muted hover:bg-surface-muted transition-colors"
              aria-label={t('comments', { count: post.commentCount })}
            >
              <MessageCircle className="w-4 h-4" strokeWidth={1.8} />
              <span className="tabular-nums">{post.commentCount}</span>
            </Link>
          ) : (
```

to:

```tsx
          {/* Comment */}
          {showCommentLink ? (
            <button
              type="button"
              onClick={openPost}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-ink-muted hover:bg-surface-muted transition-colors"
              aria-label={t('comments', { count: post.commentCount })}
            >
              <MessageCircle className="w-4 h-4" strokeWidth={1.8} />
              <span className="tabular-nums">{post.commentCount}</span>
            </button>
          ) : (
```

The `Link` import stays (still used for the author's `/profile` link).

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: Remaining errors should now only be about the `/post/[id]` page's mock-data adapter missing `likedByCurrentUser` (that page is rewritten in Task 12, not touched here) — confirm no errors remain inside `PostCard.tsx` itself.

- [ ] **Step 5: Commit**

```bash
git add components/feed/PostCard.tsx
git commit -m "feat: wire PostCard like button and comment button to real data"
```

---

### Task 7: Sync `commentCount` after posting a comment

**Files:**
- Modify: `hooks/useComments.ts:1-33`

- [ ] **Step 1: Update `useCreateComment`**

Change:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { normalizeList } from "@/lib/api/pagination";
import type { CommentRequestDto, CommentResponseDto } from "@/lib/api/types";

export const commentKeys = {
  list: (postId: string) => ["posts", postId, "comments"] as const,
};

// GET /api/posts/{postId}/comments — event member (checked in the service).
export function usePostComments(postId: string | null) {
  return useQuery({
    queryKey: commentKeys.list(postId ?? ""),
    queryFn: async () => {
      const res = await api.get<CommentResponseDto[]>(endpoints.posts.comments(postId!));
      return normalizeList(res).items;
    },
    enabled: Boolean(postId),
  });
}

// POST /api/comments — event member. `parentCommentId` supports threaded replies.
export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CommentRequestDto) => api.post<CommentResponseDto>(endpoints.comments.create, input),
    onSuccess: (comment) => {
      queryClient.invalidateQueries({ queryKey: commentKeys.list(comment.postId) });
    },
  });
}
```

to:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { normalizeList } from "@/lib/api/pagination";
import { postKeys } from "@/hooks/usePosts";
import type { CommentRequestDto, CommentResponseDto } from "@/lib/api/types";

export const commentKeys = {
  list: (postId: string) => ["posts", postId, "comments"] as const,
};

// GET /api/posts/{postId}/comments — event member (checked in the service).
export function usePostComments(postId: string | null) {
  return useQuery({
    queryKey: commentKeys.list(postId ?? ""),
    queryFn: async () => {
      const res = await api.get<CommentResponseDto[]>(endpoints.posts.comments(postId!));
      return normalizeList(res).items;
    },
    enabled: Boolean(postId),
  });
}

// POST /api/comments — event member. `parentCommentId` supports threaded replies.
export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CommentRequestDto) => api.post<CommentResponseDto>(endpoints.comments.create, input),
    onSuccess: (comment) => {
      queryClient.invalidateQueries({ queryKey: commentKeys.list(comment.postId) });
      // Refresh the post's cached commentCount too. We don't have the
      // post's eventId here (CommentRequestDto doesn't carry it), so
      // rather than threading it through just for a cache patch, refetch:
      // the single-post cache directly, and any event's feed list that's
      // currently mounted (matched by key shape since eventId is unknown).
      queryClient.invalidateQueries({ queryKey: postKeys.detail(comment.postId) });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "events" && query.queryKey[2] === "posts",
      });
    },
  });
}
```

Leave `useDeleteComment` (the rest of the file) unchanged.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: Same set of errors as after Task 6 (only the not-yet-rewritten `/post/[id]` page) — no new ones.

- [ ] **Step 3: Commit**

```bash
git add hooks/useComments.ts
git commit -m "feat: refresh cached commentCount after posting a comment"
```

---

### Task 8: Add `PostModal` translations

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/el.json`

- [ ] **Step 1: Replace `PostPage` with `PostModal` in `messages/en.json`**

Find:

```json
  "PostPage": {
    "goBack": "Go back",
    "title": "Post",
    "noCommentsYet": "No comments yet",
    "commentCount": "{count, plural, one {# Comment} other {# Comments}}",
    "justNow": "just now",
    "timeAgo": {
      "minutes": "{count}m",
      "hours": "{count}h",
      "days": "{count}d"
    },
    "unlikeComment": "Unlike comment",
    "likeComment": "Like comment",
    "commentPlaceholder": "Add a comment...",
    "commentTextAriaLabel": "Comment text",
    "postComment": "Post comment"
  },
```

Replace with:

```json
  "PostModal": {
    "title": "Post",
    "close": "Close",
    "loading": "Loading post…",
    "notFoundTitle": "Post not found",
    "notFoundDescription": "This post may have been removed.",
    "noCommentsYet": "No comments yet",
    "commentCount": "{count, plural, one {# Comment} other {# Comments}}",
    "unknownAuthor": "Unknown",
    "justNow": "just now",
    "timeAgo": {
      "minutes": "{count}m",
      "hours": "{count}h",
      "days": "{count}d"
    },
    "commentPlaceholder": "Add a comment...",
    "commentTextAriaLabel": "Comment text",
    "postComment": "Post comment"
  },
```

- [ ] **Step 2: Same replacement in `messages/el.json`**

Find:

```json
  "PostPage": {
    "goBack": "Επιστροφή",
```

(and read the rest of that block in the file) and replace the whole `PostPage` object with:

```json
  "PostModal": {
    "title": "Ανάρτηση",
    "close": "Κλείσιμο",
    "loading": "Φόρτωση ανάρτησης…",
    "notFoundTitle": "Η ανάρτηση δεν βρέθηκε",
    "notFoundDescription": "Αυτή η ανάρτηση μπορεί να έχει αφαιρεθεί.",
    "noCommentsYet": "Δεν υπάρχουν σχόλια ακόμα",
    "commentCount": "{count, plural, one {# σχόλιο} other {# σχόλια}}",
    "unknownAuthor": "Άγνωστος",
    "justNow": "μόλις τώρα",
    "timeAgo": {
      "minutes": "{count}λ",
      "hours": "{count}ώ",
      "days": "{count}η"
    },
    "commentPlaceholder": "Προσθέστε ένα σχόλιο...",
    "commentTextAriaLabel": "Κείμενο σχολίου",
    "postComment": "Δημοσίευση σχολίου"
  },
```

(Read `messages/el.json`'s current `PostPage` block first to match its exact surrounding formatting before replacing — same structural position as `en.json`.)

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: Same errors as after Task 7 — JSON changes don't affect this, just confirming nothing else broke.

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/el.json
git commit -m "feat: add PostModal translations, remove unused PostPage"
```

---

### Task 9: Create `PostModal`

**Files:**
- Create: `components/feed/PostModal.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Send, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { usePost, usePostComments, useCreateComment, useEventMembers } from '@/hooks'
import { useActiveMember } from '@/providers/EventProvider'
import { PostCard } from '@/components/feed/PostCard'
import Avatar from '@/components/ui/avatar'
import { ApiError } from '@/lib/api/client'
import { initialsFromName, avatarColorFromId } from '@/lib/utils'

interface PostModalProps {
  postId: string
  onClose: () => void
}

function timeAgoParts(dateStr: string): { unit: 'now' | 'minutes' | 'hours' | 'days'; value: number } {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return { unit: 'now', value: 0 }
  if (diff < 3600) return { unit: 'minutes', value: Math.floor(diff / 60) }
  if (diff < 86400) return { unit: 'hours', value: Math.floor(diff / 3600) }
  return { unit: 'days', value: Math.floor(diff / 86400) }
}

export function PostModal({ postId, onClose }: PostModalProps) {
  const t = useTranslations('PostModal')
  const activeMember = useActiveMember()
  const { data: post, error, isPending } = usePost(postId)
  const { data: comments = [] } = usePostComments(postId)
  const { data: members = [] } = useEventMembers(post?.eventId ?? null)
  const createComment = useCreateComment()
  const [commentText, setCommentText] = useState('')

  const membersById = useMemo(() => new Map(members.map(m => [m.id, m])), [members])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!commentText.trim() || !post || !activeMember) return
    createComment.mutate({
      postId: post.id,
      authorMemberId: activeMember.id,
      content: commentText.trim(),
    })
    setCommentText('')
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border flex items-center justify-between px-4 py-3">
          <h2 className="text-base font-bold text-ink">{t('title')}</h2>
          <button
            onClick={onClose}
            aria-label={t('close')}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-muted text-ink-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isPending && <p className="text-center text-sm text-ink-muted py-16">{t('loading')}</p>}

        {error instanceof ApiError && error.status === 404 && (
          <div className="flex flex-col items-center justify-center text-center px-6 py-16">
            <p className="text-base font-semibold text-ink mb-1">{t('notFoundTitle')}</p>
            <p className="text-sm text-ink-muted">{t('notFoundDescription')}</p>
          </div>
        )}

        {post && (
          <>
            <div className="px-4 pt-4">
              <PostCard post={post} showCommentLink={false} />
            </div>

            <div className="px-4 pt-5 pb-4">
              <h3 className="text-sm font-bold text-ink mb-4">
                {comments.length === 0 ? t('noCommentsYet') : t('commentCount', { count: comments.length })}
              </h3>

              <div className="flex flex-col gap-4">
                {comments.map(comment => {
                  const author = comment.authorMemberId ? membersById.get(comment.authorMemberId) : undefined
                  const name = author?.displayName ?? t('unknownAuthor')
                  const timeAgo = timeAgoParts(comment.createdAt)

                  return (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar
                        initials={initialsFromName(name)}
                        color={avatarColorFromId(comment.authorMemberId ?? comment.id)}
                        size="sm"
                        alt={name}
                        className="shrink-0 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="bg-surface-muted rounded-2xl rounded-tl-sm px-4 py-3">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-sm font-semibold text-ink leading-tight">{name}</span>
                            <span className="text-xs text-ink-faint">
                              {timeAgo.unit === 'now' ? t('justNow') : t(`timeAgo.${timeAgo.unit}`, { count: timeAgo.value })}
                            </span>
                          </div>
                          <p className="text-sm text-ink leading-relaxed">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 flex items-center gap-3"
            >
              <input
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder={t('commentPlaceholder')}
                aria-label={t('commentTextAriaLabel')}
                className="flex-1 bg-surface-muted rounded-full px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 transition"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || createComment.isPending}
                aria-label={t('postComment')}
                className="text-primary disabled:text-ink-faint transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No new errors from this file. Same pre-existing error in the not-yet-rewritten `/post/[id]` page.

- [ ] **Step 3: Commit**

```bash
git add components/feed/PostModal.tsx
git commit -m "feat: add PostModal component"
```

---

### Task 10: Export `PostModal`

**Files:**
- Modify: `components/feed/index.ts`

- [ ] **Step 1: Add the export**

```ts
export * from './StoriesRow'
export * from './PostCard'
export * from './PostModal'
export * from './ComposerCard'
export * from './StoryAvatar'
export * from './Header'
export * from './Banner'
export * from './EventInfo'
export * from './RsvpPrompt'
export * from './EventNotFound'
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: Same as after Task 9.

- [ ] **Step 3: Commit**

```bash
git add components/feed/index.ts
git commit -m "chore: export PostModal from feed barrel"
```

---

### Task 11: Render `PostModal` from the feed page

**Files:**
- Modify: `app/(app)/feed/[eventId]/page.tsx`

- [ ] **Step 1: Read `?post=` and add a close handler**

Change the imports:

```tsx
import {use, useEffect, useMemo, useRef} from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {StoriesRow, PostCard, Header, Banner, EventInfo, EventNotFound, RsvpPrompt, ComposerCard} from '@/components/feed'
```

to:

```tsx
import {use, useEffect, useMemo, useRef} from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {StoriesRow, PostCard, PostModal, Header, Banner, EventInfo, EventNotFound, RsvpPrompt, ComposerCard} from '@/components/feed'
```

Then, right after `const searchParams = useSearchParams()`, add the pathname hook and derive the open post id + close handler. Change:

```tsx
    const { eventId } = use(params)
    const t = useTranslations('FeedPage')
    const router = useRouter()
    const searchParams = useSearchParams()
    const shouldCompose = searchParams.get('compose') === '1'
    const composerRef = useRef<HTMLDivElement>(null)
    const loadMoreRef = useRef<HTMLDivElement>(null)
```

to:

```tsx
    const { eventId } = use(params)
    const t = useTranslations('FeedPage')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const shouldCompose = searchParams.get('compose') === '1'
    const openPostId = searchParams.get('post')
    const composerRef = useRef<HTMLDivElement>(null)
    const loadMoreRef = useRef<HTMLDivElement>(null)

    function closeModal() {
        router.push(pathname)
    }
```

- [ ] **Step 2: Render the modal**

At the end of the returned JSX, change:

```tsx
        </section>
    </div>
    )
}
```

to:

```tsx
        </section>
        {openPostId && <PostModal postId={openPostId} onClose={closeModal} />}
    </div>
    )
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: Same as after Task 10.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/feed/[eventId]/page.tsx"
git commit -m "feat: open PostModal from the feed via ?post= param"
```

---

### Task 12: Replace `/post/[id]` with a redirect resolver

**Files:**
- Modify: `app/(app)/post/[id]/page.tsx` (full rewrite)

- [ ] **Step 1: Replace the entire file**

The current file is fully mock-data-driven (imports from `@/lib/mock-data`, a local `toPostResponseDto` adapter, its own comment list/composer UI). Replace its entire contents with:

```tsx
'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { usePost } from '@/hooks'
import { EventNotFound } from '@/components/feed'
import { ApiError } from '@/lib/api/client'

export default function PostRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const t = useTranslations('PostModal')
  const { data: post, error } = usePost(id)

  useEffect(() => {
    if (post) router.replace(`/feed/${post.eventId}?post=${post.id}`)
  }, [post, router])

  if (error instanceof ApiError && error.status === 404) {
    return <EventNotFound />
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center text-sm text-ink-muted">
      {t('loading')}
    </div>
  )
}
```

This removes the standalone mock post-detail page (mock comments, mock users, the local `toPostResponseDto` adapter) entirely — the feed's `PostModal` is now the only post-detail UI.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: **No errors anywhere in the project.** This was the last file referencing the old mock-data adapter.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/post/[id]/page.tsx"
git commit -m "refactor: replace mock post-detail page with a redirect into PostModal"
```

---

### Task 13: Manual verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server and open the feed**

Use the project's preview tooling to start the dev server (`.claude/launch.json` config, or `npm run dev` if driving it directly) and navigate to a logged-in event's feed (`/feed/[eventId]`).

- [ ] **Step 2: Verify likes**

Click the heart on a post that isn't yet liked. Confirm: it fills in and the count increments immediately (no visible delay/flicker), and check the network tab for a `POST /api/reactions` request. Click it again to unlike; confirm the count decrements and a `DELETE /api/reactions/{id}` request fires. Refresh the page and confirm the liked state and count persisted (i.e. it matches what the server now reports).

- [ ] **Step 3: Verify the modal opens and is deep-linkable**

Click a post's comment count in the feed. Confirm a modal opens over the feed, the URL gains `?post=<id>`, and the post's content/media match the feed card. Copy that URL, open it in a fresh tab (or reload), and confirm the modal reopens on load. Close the modal via the X button, via the Escape key, via clicking the backdrop, and via the browser back button — confirm all four remove `?post=` and close it.

- [ ] **Step 4: Verify `/post/[id]` redirects**

Navigate directly to `/post/[id]` for a real post id. Confirm it briefly shows a loading state, then lands on `/feed/{eventId}?post={id}` with the modal open. Try a nonexistent id and confirm the not-found state renders instead of an infinite loading state or a crash.

- [ ] **Step 5: Verify comments**

In the modal, type a comment and submit. Confirm it appears in the list immediately, the input clears, and the feed card's comment count (visible after closing the modal) reflects the new total. Confirm there's no per-comment like button.

- [ ] **Step 6: Check console/network for errors**

Use `read_console_messages` and `read_network_requests` (or the browser's own devtools) across the above steps and confirm no unexpected errors or failed requests.

- [ ] **Step 7: Report results**

Summarize what was verified and any issues found. Fix and re-verify before considering this plan complete.
