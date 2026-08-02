# Post Modal Portal Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract a generic, portal-based `Modal` UI primitive backed by a `ModalProvider`, move `PostModal`'s `?post=` URL logic into a reusable `usePostModal` hook, and fix `PostModal`'s layout so it never overflows the viewport on X or Y at any screen size.

**Architecture:** `components/ui/modal.tsx` wraps `@base-ui/react`'s `Dialog` primitive (already used by `components/ui/button.tsx`'s underlying library) — `Dialog.Root` + `Dialog.Portal` + `Dialog.Backdrop` + `Dialog.Popup` give us portal rendering into `document.body`, Escape-to-close, backdrop-click-to-close, focus trapping, and body scroll lock for free, instead of hand-rolling them. `Modal` adds a `size` prop (mapped to `max-w-*`) and a fixed `max-h-[90dvh] overflow-hidden` shell so content can never push it past the viewport, plus a `Modal.Body` sub-component that's the designated `overflow-y-auto` region. `ModalProvider`/`useModal()` follow the existing `EventProvider` context pattern and stay content-agnostic (single `isOpen`/`openModal`/`closeModal`, no owned content) since `PostModal` keeps the URL as its source of truth via the new `usePostModal()` hook — which just extracts `FeedPage`'s existing `?post=` push/strip logic verbatim so `PostCard` can reuse it too instead of hand-rolling the same `router.push`.

**Tech Stack:** Next.js App Router, `@base-ui/react` (Dialog), TanStack Query v5, next-intl, Tailwind.

**Note on verification:** This repo has no test framework installed (no jest/vitest/RTL — confirmed via `package.json` and a repo-wide search for `*.test.*`/`*.spec.*`). Introducing one is out of scope for this change, consistent with [2026-08-01-post-engagement-modal.md](2026-08-01-post-engagement-modal.md). Each task verifies with `npx tsc --noEmit`, plus a final manual browser pass across breakpoints (mobile, tablet, desktop, wide desktop) checking specifically for X/Y overflow, per the design spec's stated bug.

---

## File Structure

- Create `components/ui/modal.tsx` — the generic `Modal` primitive (`Modal`, `Modal.Body`) wrapping Base UI's `Dialog`.
- Create `providers/ModalProvider.tsx` — generic `ModalProvider` + `useModal()`.
- Modify `providers/Providers.tsx` — wire `ModalProvider` into the provider tree.
- Create `hooks/usePostModal.ts` — URL-driven (`?post=`) open/close/state for the post modal.
- Modify `hooks/index.ts` — export `usePostModal`.
- Modify `components/feed/PostModal.tsx` — drop `postId`/`onClose` props in favor of `usePostModal()`; wrap content in `<Modal>`; move comments into `<Modal.Body>`; fix media panel overflow.
- Modify `components/feed/PostCard.tsx` — replace its hand-rolled `openPost` URL logic with `usePostModal().open(post.id)`.
- Modify `app/(app)/feed/[eventId]/page.tsx` — replace `openPostId`/`closeModal` URL logic with `usePostModal()`; render `<PostModal />` unconditionally.

---

### Task 1: Create the `ModalProvider`

**Files:**

- Create: `providers/ModalProvider.tsx`

- [ ] **Step 1: Write the provider**

```tsx
'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface ModalContextValue {
    isOpen: boolean;
    openModal: () => void;
    closeModal: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);

    const value: ModalContextValue = {
        isOpen,
        openModal: () => setIsOpen(true),
        closeModal: () => setIsOpen(false),
    };

    return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
}

export function useModal(): ModalContextValue {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors (file isn't wired in yet, but is self-contained and valid).

- [ ] **Step 3: Commit**

```bash
git add providers/ModalProvider.tsx
git commit -m "feat: add generic ModalProvider and useModal hook"
```

---

### Task 2: Wire `ModalProvider` into the provider tree

**Files:**

- Modify: `providers/Providers.tsx`

- [ ] **Step 1: Add the import and wrap the tree**

Change:

```tsx
import { ApiError } from '@/lib/api/client';
import { AuthProvider } from '@/providers/AuthProvider';
import { EventProvider } from '@/providers/EventProvider';
```

to:

```tsx
import { ApiError } from '@/lib/api/client';
import { AuthProvider } from '@/providers/AuthProvider';
import { EventProvider } from '@/providers/EventProvider';
import { ModalProvider } from '@/providers/ModalProvider';
```

Change:

```tsx
<QueryClientProvider client={queryClient}>
    <AuthProvider>
        <EventProvider>{children}</EventProvider>
    </AuthProvider>
    <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

to:

```tsx
<QueryClientProvider client={queryClient}>
    <AuthProvider>
        <EventProvider>
            <ModalProvider>{children}</ModalProvider>
        </EventProvider>
    </AuthProvider>
    <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add providers/Providers.tsx
git commit -m "feat: wire ModalProvider into the provider tree"
```

---

### Task 3: Create the `Modal` primitive

**Files:**

- Create: `components/ui/modal.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';

import type { ReactNode } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const sizeMap = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-4xl',
} as const;

type ModalSize = keyof typeof sizeMap;

interface ModalProps {
    open: boolean;
    onClose: () => void;
    size?: ModalSize;
    closeLabel?: string;
    className?: string;
    children: ReactNode;
}

export function Modal({ open, onClose, size = 'md', closeLabel = 'Close', className, children }: ModalProps) {
    return (
        <Dialog.Root
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) onClose();
            }}
        >
            <Dialog.Portal>
                <Dialog.Backdrop className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm" />
                <Dialog.Popup
                    className={cn(
                        'fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
                        'w-[calc(100vw-2rem)] max-h-[90dvh] overflow-hidden',
                        'bg-background rounded-2xl flex flex-col outline-none',
                        sizeMap[size],
                        className
                    )}
                >
                    <Dialog.Close
                        aria-label={closeLabel}
                        className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-muted text-ink-muted transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </Dialog.Close>
                    {children}
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

function ModalBody({ className, children }: { className?: string; children: ReactNode }) {
    return <div className={cn('flex-1 min-h-0 overflow-y-auto', className)}>{children}</div>;
}

Modal.Body = ModalBody;
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/modal.tsx
git commit -m "feat: add generic portal-based Modal primitive"
```

---

### Task 4: Create `usePostModal`

**Files:**

- Create: `hooks/usePostModal.ts`

- [ ] **Step 1: Write the hook**

This replicates `FeedPage`'s current `openPostId`/`closeModal` URL logic (reading `?post=`, pushing it to open, stripping it to close while preserving other params) so any component can reuse it instead of hand-rolling the same `router.push`/`URLSearchParams` dance.

```ts
'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export function usePostModal() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const postId = searchParams.get('post');

    function open(id: string) {
        const params = new URLSearchParams(searchParams.toString());
        params.set('post', id);
        router.push(`${pathname}?${params.toString()}`);
    }

    function close() {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('post');
        const query = params.toString();
        router.push(query ? `${pathname}?${query}` : pathname);
    }

    return { postId, isOpen: postId !== null, open, close };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add hooks/usePostModal.ts
git commit -m "feat: add usePostModal hook for ?post= URL state"
```

---

### Task 5: Export `usePostModal` from the hooks barrel

**Files:**

- Modify: `hooks/index.ts`

- [ ] **Step 1: Add the export**

Change:

```ts
export * from './usePosts';
export * from './usePostLike';
```

to:

```ts
export * from './usePosts';
export * from './usePostLike';
export * from './usePostModal';
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add hooks/index.ts
git commit -m "chore: export usePostModal from hooks barrel"
```

---

### Task 6: Refactor `PostModal` to use `Modal` + `usePostModal`

**Files:**

- Modify: `components/feed/PostModal.tsx` (full rewrite)

- [ ] **Step 1: Replace the entire file**

Current behavior (data fetching, comment list, comment composer) is preserved; only the shell (portal/backdrop/Escape/sizing) and the props/state source change — `postId`/`onClose` come from `usePostModal()` instead of being passed in, and the comment list moves into `<Modal.Body>` so it scrolls internally instead of growing the shell. The media panel gets `min-w-0 min-h-0` so it can't force the grid past the shell's bounds.

Replace the entire contents of `components/feed/PostModal.tsx` with:

```tsx
'use client';

import React, { useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePost, usePostComments, useCreateComment, useEventMembers, usePostModal } from '@/hooks';
import { useActiveMember } from '@/providers/EventProvider';
import { Modal } from '@/components/ui/modal';
import Avatar from '@/components/ui/avatar';
import { ApiError } from '@/lib/api/client';
import { initialsFromName, avatarColorFromId, timeAgoParts, cn } from '@/lib/utils';
import Image from 'next/image';

export function PostModal() {
    const t = useTranslations('PostModal');
    const tCard = useTranslations('PostCard');
    const { postId, isOpen, close } = usePostModal();
    const activeMember = useActiveMember();
    const { data: post, error, isPending } = usePost(postId);
    const { data: comments = [] } = usePostComments(postId);
    const { data: members = [] } = useEventMembers(post?.eventId ?? null);
    const createComment = useCreateComment(post?.eventId ?? '');
    const [commentText, setCommentText] = useState('');
    const [commentError, setCommentError] = useState<string | null>(null);

    const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!commentText.trim() || !post || !activeMember) return;

        setCommentError(null);

        try {
            await createComment.mutateAsync({
                postId: post.id,
                authorMemberId: activeMember.id,
                content: commentText.trim(),
            });
        } catch {
            setCommentError(t('commentFailed'));
            return;
        }

        setCommentText('');
    }

    return (
        <Modal open={isOpen} onClose={close} size="lg" closeLabel={t('close')} className="min-h-[70vh]">
            <div className="top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border flex items-center justify-between px-4 py-3 w-full shrink-0">
                <h2 className="text-base font-bold text-ink">{t('title')}</h2>
            </div>

            {isPending && <p className="text-center text-sm text-ink-muted py-16">{t('loading')}</p>}

            {error instanceof ApiError && error.status === 404 && (
                <div className="flex flex-col items-center justify-center text-center px-6 py-16">
                    <p className="text-base font-semibold text-ink mb-1">{t('notFoundTitle')}</p>
                    <p className="text-sm text-ink-muted">{t('notFoundDescription')}</p>
                </div>
            )}

            {post && (
                <section className="w-full grid grid-cols-1 lg:grid-cols-5 flex-1 min-h-0 p-6 overflow-hidden">
                    <section className="w-full min-w-0 min-h-0 lg:col-span-3 bg-black rounded-2xl shadow-xl hidden lg:block">
                        <Image
                            src={post.media[0].mediaUrl}
                            alt={tCard('photoBy', { name: post.author?.displayName ?? '' })}
                            className="w-full h-full object-center object-scale-down"
                            width={150}
                            height={150}
                        />
                    </section>
                    <section className="lg:px-4 pt-4 lg:col-span-2 min-h-0 flex flex-col justify-between">
                        <Modal.Body
                            className={cn('lg:px-4 pt-5 pb-4', {
                                'flex items-center justify-center': comments.length === 0,
                            })}
                        >
                            <h3 className="text-sm font-bold text-ink mb-4">
                                {comments.length === 0 ? t('noCommentsYet') : t('commentCount', { count: comments.length })}
                            </h3>

                            <div className="flex flex-col gap-4">
                                {comments.map((comment) => {
                                    const author = comment.authorMemberId ? membersById.get(comment.authorMemberId) : undefined;
                                    const name = author?.displayName ?? t('unknownAuthor');
                                    const timeAgo = timeAgoParts(comment.createdAt);

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
                                                            {timeAgo.unit === 'now'
                                                                ? t('justNow')
                                                                : t(`timeAgo.${timeAgo.unit}`, {
                                                                      count: timeAgo.value,
                                                                  })}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-ink leading-relaxed">{comment.content}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Modal.Body>

                        <form
                            onSubmit={handleSubmit}
                            className="bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 flex flex-col items-center gap-3 shrink-0"
                        >
                            {commentError && <p className="text-xs text-destructive px-4">{commentError}</p>}
                            <section className="flex gap-3 w-full">
                                <input
                                    type="text"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    placeholder={t('commentPlaceholder')}
                                    aria-label={t('commentTextAriaLabel')}
                                    className="relative flex-1 bg-surface-muted rounded-full px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 transition"
                                />
                                <button
                                    type="submit"
                                    disabled={!commentText.trim() || createComment.isPending || !activeMember}
                                    aria-label={t('postComment')}
                                    className="text-primary disabled:text-ink-faint transition-colors"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </section>
                        </form>
                    </section>
                </section>
            )}
        </Modal>
    );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: New errors at every call site that still passes `postId`/`onClose` props to `<PostModal />` (`app/(app)/feed/[eventId]/page.tsx`). That's expected — fixed in Task 8. Confirm there are no errors inside `PostModal.tsx` itself.

- [ ] **Step 3: Commit**

```bash
git add components/feed/PostModal.tsx
git commit -m "refactor: PostModal uses Modal primitive and usePostModal hook"
```

---

### Task 7: Point `PostCard`'s comment button at `usePostModal`

**Files:**

- Modify: `components/feed/PostCard.tsx`

- [ ] **Step 1: Replace the hand-rolled URL logic with the hook**

Change the imports from:

```tsx
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Heart, MessageCircle, MoreHorizontal, Pin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn, initialsFromName, avatarColorFromId, timeAgoParts } from '@/lib/utils';
import { usePostLike } from '@/hooks';
import type { PostResponseDto } from '@/lib/api/types';
import Avatar from '@/components/ui/avatar';
import { useMemo } from 'react';
```

to:

```tsx
import Link from 'next/link';
import Image from 'next/image';
import { Heart, MessageCircle, MoreHorizontal, Pin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn, initialsFromName, avatarColorFromId, timeAgoParts } from '@/lib/utils';
import { usePostLike, usePostModal } from '@/hooks';
import type { PostResponseDto } from '@/lib/api/types';
import Avatar from '@/components/ui/avatar';
import { useMemo } from 'react';
```

Change:

```tsx
export function PostCard({ post, showCommentLink = true }: PostCardProps) {
  const t = useTranslations('PostCard')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { liked, count: likeCount, toggle: handleLike, isPending: isLikePending } = usePostLike(post)

  const authorName = post.author?.displayName ?? t('unknownAuthor')
  const authorSubtitle = post.author?.nickname ?? post.author?.role
  const timeAgo = useMemo(()=>timeAgoParts(post.createdAt),[post.createdAt])
  const media = post.media

  function openPost() {
    const params = new URLSearchParams(searchParams.toString())
    params.set('post', post.id)
    router.push(`${pathname}?${params.toString()}`)
  }
```

to:

```tsx
export function PostCard({ post, showCommentLink = true }: PostCardProps) {
  const t = useTranslations('PostCard')
  const { open: openPostModal } = usePostModal()
  const { liked, count: likeCount, toggle: handleLike, isPending: isLikePending } = usePostLike(post)

  const authorName = post.author?.displayName ?? t('unknownAuthor')
  const authorSubtitle = post.author?.nickname ?? post.author?.role
  const timeAgo = useMemo(()=>timeAgoParts(post.createdAt),[post.createdAt])
  const media = post.media

  function openPost() {
    openPostModal(post.id)
  }
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: Same single set of errors as after Task 6 (only `app/(app)/feed/[eventId]/page.tsx`'s stale `<PostModal postId onClose>` call) — no new ones from this file.

- [ ] **Step 3: Commit**

```bash
git add components/feed/PostCard.tsx
git commit -m "refactor: PostCard opens the post modal via usePostModal"
```

---

### Task 8: Simplify `FeedPage` to use `usePostModal`

**Files:**

- Modify: `app/(app)/feed/[eventId]/page.tsx`

- [ ] **Step 1: Remove the local URL logic and render `PostModal` unconditionally**

Leave the import block at the top of the file exactly as-is — `useRouter`, `usePathname`, and `useSearchParams` are all still needed for the `?compose=1` handling elsewhere in this file, and `PostModal` no longer needs any props imported for it (it manages its own state internally now).

Change:

```tsx
const { eventId } = use(params);
const t = useTranslations('FeedPage');
const router = useRouter();
const pathname = usePathname();
const searchParams = useSearchParams();
const shouldCompose = searchParams.get('compose') === '1';
const openPostId = searchParams.get('post');
const composerRef = useRef<HTMLDivElement>(null);
const loadMoreRef = useRef<HTMLDivElement>(null);

function closeModal() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('post');
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
}
```

to:

```tsx
const { eventId } = use(params);
const t = useTranslations('FeedPage');
const router = useRouter();
const pathname = usePathname();
const searchParams = useSearchParams();
const shouldCompose = searchParams.get('compose') === '1';
const composerRef = useRef<HTMLDivElement>(null);
const loadMoreRef = useRef<HTMLDivElement>(null);
```

Then, at the end of the returned JSX, change:

```tsx
        {/* Deliberately outside moduleFlags.posts — a shared post link should
            still open even if the posts module is toggled off for this event. */}
        {openPostId && <PostModal postId={openPostId} onClose={closeModal} />}
    </div>
    )
}
```

to:

```tsx
        {/* Deliberately outside moduleFlags.posts — a shared post link should
            still open even if the posts module is toggled off for this event.
            PostModal reads its own open state from the `?post=` param via
            usePostModal(). */}
        <PostModal />
    </div>
    )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors anywhere in the project.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/feed/[eventId]/page.tsx"
git commit -m "refactor: FeedPage renders PostModal unconditionally via usePostModal"
```

---

### Task 9: Manual verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server and open the feed**

Use the project's preview tooling to start the dev server and navigate to a logged-in event's feed (`/feed/[eventId]`).

- [ ] **Step 2: Verify the modal renders through a portal**

Open a post's modal (click a comment count). Using devtools/`read_page`, confirm the modal's DOM node is a direct child of `<body>` (Base UI's `Dialog.Portal` default), not nested inside the feed's component tree.

- [ ] **Step 3: Verify no viewport overflow at any breakpoint**

With the modal open, resize the viewport through mobile (375px), tablet (768px), desktop (1280px), and a wide desktop (1920px) width. At each size, confirm:

- The modal shell never causes horizontal (`X`) scrolling of the page.
- The modal shell never exceeds the viewport height — it's capped and internal regions (comment list) scroll instead.
- On a post with many comments, the comment list scrolls internally (`Modal.Body`) while the header and comment composer stay fixed in place.

- [ ] **Step 4: Verify open/close behavior**

Confirm the modal opens via the feed's comment button and via a direct `/post/[id]` link, and closes via: the X button, the `Escape` key, clicking the backdrop, and the browser back button. Confirm `?post=` is added/removed from the URL correctly each time, and that closing lands on the plain feed URL (or preserves other query params like `?compose=1` if both were present).

- [ ] **Step 5: Verify comment posting still works**

Post a comment in the modal; confirm it appears in the list and the input clears.

- [ ] **Step 6: Check console/network for errors**

Use `read_console_messages` and `read_network_requests` across the above steps and confirm no unexpected errors or failed requests.

- [ ] **Step 7: Report results**

Summarize what was verified and any issues found. Fix and re-verify before considering this plan complete.
