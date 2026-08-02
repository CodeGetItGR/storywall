# Post Media Lightbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clicking a post's media opens `PostModal` full-screen at that item, with a swipeable carousel for multi-media posts; desktop keeps media-left/comments-right, mobile shows fullscreen media with a collapsed overview that expands into a comments sheet (already expanded when entered via the comment icon).

**Architecture:** `usePostModal` grows two more URL params (`media`, `view`) alongside the existing `post`, so the open item and initial mobile view are deep-linkable and back-button friendly. A new `PostMediaCarousel` (thin wrapper over `embla-carousel-react`) renders the swipeable/arrow-navigable media track and reports index changes back into the URL via `router.replace` (no history spam while paging). `Modal` gains a `full` size variant used only when a post has media. `PostModal` branches on `post.media.length`: zero media keeps today's centered layout untouched; one or more media renders the full-screen split, with the comments block (same markup either way) rendered either always-visible (desktop) or inside a slide-up sheet (mobile) toggled by local state seeded from the `view` param.

**Tech Stack:** Next.js App Router, TanStack Query v5, next-intl, `embla-carousel-react` (new dependency).

**Note on verification:** This repo has no test framework installed (no jest/vitest/RTL — confirmed via `package.json` and a repo-wide search for `*.test.*`/`*.spec.*`). Each task verifies with `npx tsc --noEmit`, matching how prior work in this codebase (e.g. `docs/superpowers/plans/2026-08-01-post-engagement-modal.md`) was verified, plus a final manual browser pass (Task 9).

**Note on spec deviations:**
1. The design spec said the mobile collapsed overview shows `PostAuthorAvatar`. That component hardcodes dark (`text-ink`/`text-ink-muted`) text, which is unreadable over a photo. The overview instead renders the author name and caption directly in white — see Task 7.
2. Task 3 adds a `lg:border-l` divider to the desktop comments panel. It wasn't in the spec, but now that the panel spans the full viewport edge-to-edge (rather than sitting in a boxed `max-w-4xl` modal), the panel needs *some* visual separation from the black media pane. One-line addition, easy to drop if unwanted.

---

## File Structure

- Modify `package.json` / `package-lock.json` — add `embla-carousel-react`.
- Modify `hooks/usePostModal.ts` — add `mediaIndex`, `view`, `setMediaIndex`; `open()` takes an options object.
- Modify `components/ui/modal.tsx` — add a `full` size.
- Create `components/feed/post/PostMediaCarousel.tsx` — the carousel.
- Modify `components/feed/post/index.ts` — export it.
- Modify `messages/en.json`, `messages/el.json` — new `PostCard.viewPhoto` and `PostModal.{previousMedia,nextMedia,showComments,hideComments}` keys.
- Modify `components/feed/PostModal.tsx` — full-screen split (desktop) / fullscreen media + comments sheet (mobile).
- Modify `components/feed/PostCard.tsx` — media thumbnails become buttons that open the lightbox at the clicked index; comment button opens with `view: 'comments'`.

---

### Task 1: Add `embla-carousel-react`

**Files:**

- Modify: `package.json`, `package-lock.json` (via install)

- [ ] **Step 1: Install the dependency**

Run: `npm install embla-carousel-react`
Expected: `package.json`'s `dependencies` gains an `embla-carousel-react` entry; `package-lock.json` updates.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS, no errors (nothing imports it yet).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add embla-carousel-react for the post media lightbox"
```

---

### Task 2: Extend `usePostModal` with media index and view state

**Files:**

- Modify: `hooks/usePostModal.ts` (full rewrite — currently 25 lines)

- [ ] **Step 1: Replace the file**

Current content:

```ts
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

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

Replace with:

```ts
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type PostModalView = 'media' | 'comments';

interface OpenPostModalOptions {
    // 0-based index into the post's media array. Omit (or 0) for the
    // default first item — kept out of the URL in that case.
    mediaIndex?: number;
    // Mobile-only: whether the comments sheet starts expanded. Ignored on
    // desktop (comments are always visible there) and ignored entirely
    // when the post has no media.
    view?: PostModalView;
}

export function usePostModal() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const postId = searchParams.get('post');
    const mediaIndex = Number(searchParams.get('media') ?? 0);
    const view: PostModalView = searchParams.get('view') === 'comments' ? 'comments' : 'media';

    function open(id: string, options: OpenPostModalOptions = {}) {
        const params = new URLSearchParams(searchParams.toString());
        params.set('post', id);

        if (options.mediaIndex) {
            params.set('media', String(options.mediaIndex));
        } else {
            params.delete('media');
        }

        if (options.view === 'comments') {
            params.set('view', 'comments');
        } else {
            params.delete('view');
        }

        router.push(`${pathname}?${params.toString()}`);
    }

    // Paging through the carousel updates the URL without adding a history
    // entry per slide (replace, not push) — history is reserved for open/close.
    function setMediaIndex(index: number) {
        const params = new URLSearchParams(searchParams.toString());
        if (index) {
            params.set('media', String(index));
        } else {
            params.delete('media');
        }
        router.replace(`${pathname}?${params.toString()}`);
    }

    function close() {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('post');
        params.delete('media');
        params.delete('view');
        const query = params.toString();
        router.push(query ? `${pathname}?${query}` : pathname);
    }

    return { postId, mediaIndex, view, isOpen: postId !== null, open, setMediaIndex, close };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: A new error in `components/feed/PostCard.tsx` where `openPostModal(post.id)` is called — `open`'s second parameter is optional, so this specific call is still valid; the actual expected error is none here. Confirm output is clean. (If you do see an error, it means a call site passes something incompatible with the new `OpenPostModalOptions` shape — none should yet, since Task 8 is the only place that changes call sites and hasn't run.)

- [ ] **Step 3: Commit**

```bash
git add hooks/usePostModal.ts
git commit -m "feat: track media index and view in usePostModal's URL state"
```

---

### Task 3: Add a `full` size to `Modal`

**Files:**

- Modify: `components/ui/modal.tsx`

- [ ] **Step 1: Update the size type and popup classes**

Current content:

```tsx
'use client';

import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

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

Replace with:

```tsx
'use client';

import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

const sizeMap = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-4xl',
} as const;

type ModalSize = keyof typeof sizeMap | 'full';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    size?: ModalSize;
    closeLabel?: string;
    className?: string;
    children: ReactNode;
}

export function Modal({ open, onClose, size = 'md', closeLabel = 'Close', className, children }: ModalProps) {
    const isFull = size === 'full';

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
                        'fixed z-50 bg-background flex flex-col outline-none',
                        isFull
                            ? 'inset-0 w-screen h-dvh max-h-dvh rounded-none'
                            : cn(
                                  'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
                                  'w-[calc(100vw-2rem)] max-h-[90dvh] overflow-hidden rounded-2xl',
                                  sizeMap[size]
                              ),
                        className
                    )}
                >
                    <Dialog.Close
                        aria-label={closeLabel}
                        className={cn(
                            'absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full transition-colors',
                            isFull ? 'bg-black/40 hover:bg-black/60 text-white' : 'hover:bg-surface-muted text-ink-muted'
                        )}
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

Note: `sizeMap[size]` in the non-full branch is safe — TypeScript narrows `size` to `keyof typeof sizeMap` inside that branch since the `isFull` check (`size === 'full'`) already excluded `'full'` earlier in the ternary, but because `isFull` is a separately-computed boolean (not a type guard TypeScript can see through the ternary), add an explicit cast if `tsc` complains: change `sizeMap[size]` to `sizeMap[size as Exclude<ModalSize, 'full'>]`. Check in Step 2 whether this is actually needed before adding it — don't add speculative casts.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS. If TypeScript reports `sizeMap[size]` can't be indexed with `ModalSize`, apply the cast noted above and re-run.

- [ ] **Step 3: Commit**

```bash
git add components/ui/modal.tsx
git commit -m "feat: add a full-viewport Modal size for the post lightbox"
```

---

### Task 4: Create `PostMediaCarousel`

**Files:**

- Create: `components/feed/post/PostMediaCarousel.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import type { MediaResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface PostMediaCarouselProps {
    media: MediaResponseDto[];
    initialIndex: number;
    onIndexChange: (index: number) => void;
    alt: string;
    className?: string;
}

export function PostMediaCarousel({ media, initialIndex, onIndexChange, alt, className }: PostMediaCarouselProps) {
    const t = useTranslations('PostModal');
    const [emblaRef, emblaApi] = useEmblaCarousel({ startIndex: initialIndex });
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [canScrollPrev, setCanScrollPrev] = useState(false);
    const [canScrollNext, setCanScrollNext] = useState(false);

    useEffect(() => {
        if (!emblaApi) return;

        function handleSelect() {
            const index = emblaApi!.selectedScrollSnap();
            setCurrentIndex(index);
            setCanScrollPrev(emblaApi!.canScrollPrev());
            setCanScrollNext(emblaApi!.canScrollNext());
            onIndexChange(index);
        }

        handleSelect();
        emblaApi.on('select', handleSelect);
        emblaApi.on('reInit', handleSelect);

        return () => {
            emblaApi.off('select', handleSelect);
            emblaApi.off('reInit', handleSelect);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- onIndexChange is stable per PostModal render tree; re-subscribing on every parent render would drop the current select handler's closure over stale state unnecessarily.
    }, [emblaApi]);

    const hasMultiple = media.length > 1;

    return (
        <div className={cn('relative w-full h-full overflow-hidden', className)}>
            <div className="w-full h-full overflow-hidden" ref={emblaRef}>
                <div className="flex h-full">
                    {media.map((item) => (
                        <div key={item.id} className="relative shrink-0 grow-0 basis-full h-full">
                            <Image src={item.mediaUrl} alt={alt} fill className="object-contain" sizes="100vw" />
                        </div>
                    ))}
                </div>
            </div>

            {hasMultiple && (
                <>
                    <button
                        type="button"
                        onClick={() => emblaApi?.scrollPrev()}
                        disabled={!canScrollPrev}
                        aria-label={t('previousMedia')}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 disabled:opacity-30 disabled:hover:bg-black/50 text-white flex items-center justify-center transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => emblaApi?.scrollNext()}
                        disabled={!canScrollNext}
                        aria-label={t('nextMedia')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 disabled:opacity-30 disabled:hover:bg-black/50 text-white flex items-center justify-center transition-colors"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-black/50 text-white text-xs tabular-nums">
                        {currentIndex + 1} / {media.length}
                    </div>
                </>
            )}
        </div>
    );
}
```

`onIndexChange` is deliberately left out of the effect's dependency array (with the inline eslint-disable + comment explaining why) — it's `setMediaIndex` from `usePostModal`, a new function identity on every render of the parent (`usePostModal` isn't memoized), so including it would tear down and resubscribe the Embla listener on every keystroke/render upstream for no benefit.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: A new error — `Cannot find module 'embla-carousel-react'` only if Task 1 wasn't actually run first; otherwise PASS with no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/feed/post/PostMediaCarousel.tsx
git commit -m "feat: add PostMediaCarousel"
```

---

### Task 5: Export `PostMediaCarousel` from the post barrel

**Files:**

- Modify: `components/feed/post/index.ts`

- [ ] **Step 1: Add the export**

Current content:

```ts
export * from './CommentCount';
export * from './PostAuthorAvatar';
export * from './ReactionCount';
```

Replace with:

```ts
export * from './CommentCount';
export * from './PostAuthorAvatar';
export * from './PostMediaCarousel';
export * from './ReactionCount';
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: Same as Task 4, Step 2.

- [ ] **Step 3: Commit**

```bash
git add components/feed/post/index.ts
git commit -m "chore: export PostMediaCarousel from the post barrel"
```

---

### Task 6: Add translations

**Files:**

- Modify: `messages/en.json`
- Modify: `messages/el.json`

- [ ] **Step 1: `messages/en.json` — `PostCard.viewPhoto`**

Find (inside the `PostCard` block):

```json
        "photoBy": "Photo by {name}",
        "unknownAuthor": "Unknown",
        "pinned": "Pinned"
    },
```

Replace with:

```json
        "photoBy": "Photo by {name}",
        "viewPhoto": "View photo by {name}",
        "unknownAuthor": "Unknown",
        "pinned": "Pinned"
    },
```

- [ ] **Step 2: `messages/en.json` — `PostModal` navigation/sheet keys**

Find (inside the `PostModal` block):

```json
        "postComment": "Post comment",
        "commentFailed": "Couldn't post your comment. Please try again."
    },
```

Replace with:

```json
        "postComment": "Post comment",
        "commentFailed": "Couldn't post your comment. Please try again.",
        "previousMedia": "Previous photo",
        "nextMedia": "Next photo",
        "showComments": "Show comments",
        "hideComments": "Hide comments"
    },
```

- [ ] **Step 3: `messages/el.json` — `PostCard.viewPhoto`**

Find (inside the `PostCard` block):

```json
        "photoBy": "Φωτογραφία από {name}",
        "unknownAuthor": "Άγνωστος",
        "pinned": "Καρφιτσωμένη"
    },
```

Replace with:

```json
        "photoBy": "Φωτογραφία από {name}",
        "viewPhoto": "Προβολή φωτογραφίας από {name}",
        "unknownAuthor": "Άγνωστος",
        "pinned": "Καρφιτσωμένη"
    },
```

- [ ] **Step 4: `messages/el.json` — `PostModal` navigation/sheet keys**

Find (inside the `PostModal` block):

```json
        "postComment": "Δημοσίευση σχολίου",
        "commentFailed": "Δεν ήταν δυνατή η δημοσίευση του σχολίου σας. Δοκιμάστε ξανά."
    },
```

Replace with:

```json
        "postComment": "Δημοσίευση σχολίου",
        "commentFailed": "Δεν ήταν δυνατή η δημοσίευση του σχολίου σας. Δοκιμάστε ξανά.",
        "previousMedia": "Προηγούμενη φωτογραφία",
        "nextMedia": "Επόμενη φωτογραφία",
        "showComments": "Εμφάνιση σχολίων",
        "hideComments": "Απόκρυψη σχολίων"
    },
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: Same as Task 5, Step 2 — JSON changes don't affect type-checking.

- [ ] **Step 6: Commit**

```bash
git add messages/en.json messages/el.json
git commit -m "feat: add translations for the post media lightbox"
```

---

### Task 7: Rewrite `PostModal` for the full-screen lightbox

**Files:**

- Modify: `components/feed/PostModal.tsx` (full rewrite)

- [ ] **Step 1: Replace the file**

Replace the entire contents of `components/feed/PostModal.tsx` with:

```tsx
'use client';

import { Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useMemo, useState } from 'react';

import { PostAuthorAvatar, PostMediaCarousel, ReactionCount } from '@/components/feed/post';
import { CommentCount } from '@/components/feed/post/CommentCount';
import Avatar from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import { useCreateComment, useEventMembers, usePost, usePostComments, usePostModal } from '@/hooks';
import { ApiError } from '@/lib/api/client';
import { avatarColorFromId, cn, initialsFromName, timeAgoParts } from '@/lib/utils';
import { useActiveMember } from '@/providers/EventProvider';

export function PostModal() {
    const t = useTranslations('PostModal');
    const tCard = useTranslations('PostCard');
    const { postId, isOpen, close, mediaIndex, view, setMediaIndex } = usePostModal();
    const activeMember = useActiveMember();
    const { data: post, error, isPending } = usePost(postId);
    const { data: comments = [] } = usePostComments(postId);
    const { data: members = [] } = useEventMembers(post?.eventId ?? null);
    const createComment = useCreateComment(post?.eventId ?? '');
    const [commentText, setCommentText] = useState('');
    const [commentError, setCommentError] = useState<string | null>(null);
    // Mobile-only "comments sheet" expanded state. Seeded from the `view`
    // URL param whenever the modal (re)opens or a different post/view is
    // requested; PostModal is a single always-mounted instance (rendered
    // once from the feed page), so this can't just be initial useState.
    const [commentsOpen, setCommentsOpen] = useState(view === 'comments');

    useEffect(() => {
        if (isOpen) setCommentsOpen(view === 'comments');
    }, [postId, isOpen, view]);

    const timeAgo = useMemo(
        () =>
            post
                ? timeAgoParts(post?.createdAt)
                : {
                      unit: 'minutes' as const,
                      value: 0,
                  },
        [post]
    );

    const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
    const hasMedia = (post?.media.length ?? 0) > 0;

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
        <Modal open={isOpen} onClose={close} size={hasMedia ? 'full' : 'lg'} closeLabel={t('close')} className={hasMedia ? undefined : 'min-h-[70vh]'}>
            {!hasMedia && (
                <div className="z-10 bg-background/95 backdrop-blur-sm border-b border-border flex items-center justify-between px-4 py-5 w-full shrink-0">
                    <h2 className="text-base font-bold text-ink">{t('title')}</h2>
                </div>
            )}

            {isPending && <p className="text-center text-sm text-ink-muted py-16">{t('loading')}</p>}

            {error instanceof ApiError && error.status === 404 && (
                <div className="flex flex-col items-center justify-center text-center px-6 py-16">
                    <p className="text-base font-semibold text-ink mb-1">{t('notFoundTitle')}</p>
                    <p className="text-sm text-ink-muted">{t('notFoundDescription')}</p>
                </div>
            )}

            {post &&
                (() => {
                    const commentsPanel = (
                        <>
                            <section className="border-b flex justify-between pb-2 px-3 shrink-0">
                                <PostAuthorAvatar
                                    avatarUrl={post.author?.avatarUrl}
                                    name={post.author?.displayName ?? tCard('unknownAuthor')}
                                    subtitle={post.author?.nickname ?? post.author?.role}
                                    timeAgo={timeAgo}
                                />
                                <div className="flex gap-2">
                                    <ReactionCount count={post.reactionCount} />
                                    <CommentCount count={post.commentCount} />
                                </div>
                            </section>
                            <Modal.Body
                                className={cn('lg:px-4 px-3 pt-5 pb-4', {
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
                                        const commentTimeAgo = timeAgoParts(comment.createdAt);

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
                                                                {commentTimeAgo.unit === 'now'
                                                                    ? t('justNow')
                                                                    : t(`timeAgo.${commentTimeAgo.unit}`, {
                                                                          count: commentTimeAgo.value,
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
                        </>
                    );

                    if (!hasMedia) {
                        return <section className="w-full min-w-0 min-h-0 flex-1 flex flex-col">{commentsPanel}</section>;
                    }

                    const clampedIndex = Math.min(Math.max(mediaIndex, 0), post.media.length - 1);

                    return (
                        <section className="relative w-full flex-1 min-h-0 lg:grid lg:grid-cols-5 overflow-hidden">
                            <div className="relative w-full h-full lg:col-span-3 bg-black">
                                <PostMediaCarousel
                                    media={post.media}
                                    initialIndex={clampedIndex}
                                    onIndexChange={setMediaIndex}
                                    alt={tCard('photoBy', { name: post.author?.displayName ?? tCard('unknownAuthor') })}
                                />

                                <div
                                    className={cn(
                                        'lg:hidden absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pt-12 pb-4 transition-opacity duration-200',
                                        commentsOpen && 'opacity-0 pointer-events-none'
                                    )}
                                >
                                    <button type="button" onClick={() => setCommentsOpen(true)} className="w-full text-left" aria-label={t('showComments')}>
                                        <p className="text-sm font-semibold text-white mb-1">{post.author?.displayName ?? tCard('unknownAuthor')}</p>
                                        {post.content && <p className="text-sm text-white/90 leading-snug line-clamp-2 mb-2">{post.content}</p>}
                                        <div className="flex items-center gap-4">
                                            <ReactionCount count={post.reactionCount} wrapperClassName="text-white/90" />
                                            <CommentCount count={post.commentCount} wrapperClassName="text-white/90" />
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div
                                className={cn(
                                    'lg:col-span-2 lg:static lg:h-auto lg:max-h-none lg:rounded-none lg:translate-y-0 lg:flex lg:flex-col lg:min-h-0 lg:bg-background lg:border-l lg:border-border',
                                    'fixed inset-x-0 bottom-0 z-10 h-[85dvh] max-h-[85dvh] bg-background rounded-t-2xl flex flex-col transition-transform duration-300 ease-out',
                                    commentsOpen ? 'translate-y-0' : 'translate-y-full'
                                )}
                            >
                                <div className="lg:hidden flex items-center justify-center pt-2.5 pb-1.5 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setCommentsOpen(false)}
                                        aria-label={t('hideComments')}
                                        className="w-10 h-1.5 rounded-full bg-border"
                                    />
                                </div>
                                {commentsPanel}
                            </div>
                        </section>
                    );
                })()}
        </Modal>
    );
}
```

Key differences from the previous version: the fixed "Post" header only renders when the post has no media; the header/loading/error blocks are unchanged; everything from `post && (...)` down is new — it branches on `hasMedia` and, when true, renders the media pane + a comments pane that's a normal grid column on `lg:` and a bottom sheet (fixed, translated off-screen when collapsed) below it.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS, no errors in this file. (`PostCard.tsx` will still show a stale-looking call once Task 8 changes it — not yet, so no error expected here.)

- [ ] **Step 3: Commit**

```bash
git add components/feed/PostModal.tsx
git commit -m "feat: full-screen media lightbox with carousel and mobile comments sheet"
```

---

### Task 8: Wire `PostCard` media clicks and the comment button into the lightbox

**Files:**

- Modify: `components/feed/PostCard.tsx:63-94` (media block), `components/feed/PostCard.tsx:113-132` (comment button)

- [ ] **Step 1: Make the single-media block clickable**

Find:

```tsx
            {media.length === 1 && (
                <div className="relative w-full aspect-4/3 bg-surface-muted overflow-hidden">
                    <Image
                        src={media[0].mediaUrl}
                        alt={t('photoBy', { name: authorName })}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 680px"
                    />
                </div>
            )}
```

Replace with:

```tsx
            {media.length === 1 && (
                <button
                    type="button"
                    onClick={() => openPostModal(post.id, { mediaIndex: 0 })}
                    aria-label={t('viewPhoto', { name: authorName })}
                    className="relative block w-full aspect-4/3 bg-surface-muted overflow-hidden"
                >
                    <Image
                        src={media[0].mediaUrl}
                        alt={t('photoBy', { name: authorName })}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 680px"
                    />
                </button>
            )}
```

- [ ] **Step 2: Make each grid thumbnail clickable**

Find:

```tsx
            {media.length > 1 && (
                <div className="grid grid-cols-2 gap-0.5 bg-surface-muted">
                    {media.slice(0, 4).map((item, i) => (
                        <div key={item.id} className="relative aspect-square overflow-hidden">
                            <Image
                                src={item.mediaUrl}
                                alt={t('photoBy', { name: authorName })}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 50vw, 340px"
                            />
                            {i === 3 && media.length > 4 && (
                                <div className="absolute inset-0 bg-ink/50 flex items-center justify-center text-white text-lg font-semibold">
                                    +{media.length - 4}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
```

Replace with:

```tsx
            {media.length > 1 && (
                <div className="grid grid-cols-2 gap-0.5 bg-surface-muted">
                    {media.slice(0, 4).map((item, i) => (
                        <button
                            type="button"
                            key={item.id}
                            onClick={() => openPostModal(post.id, { mediaIndex: i })}
                            aria-label={t('viewPhoto', { name: authorName })}
                            className="relative block aspect-square overflow-hidden"
                        >
                            <Image
                                src={item.mediaUrl}
                                alt={t('photoBy', { name: authorName })}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 50vw, 340px"
                            />
                            {i === 3 && media.length > 4 && (
                                <div className="absolute inset-0 bg-ink/50 flex items-center justify-center text-white text-lg font-semibold">
                                    +{media.length - 4}
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            )}
```

- [ ] **Step 3: Open straight into the expanded comments sheet from the comment button**

Find:

```tsx
    function openPost() {
        openPostModal(post.id);
    }
```

Replace with:

```tsx
    function openPost() {
        openPostModal(post.id, { mediaIndex: 0, view: 'comments' });
    }
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS, no errors anywhere in the project.

- [ ] **Step 5: Commit**

```bash
git add components/feed/PostCard.tsx
git commit -m "feat: open the post lightbox from media clicks and the comment button"
```

---

### Task 9: Manual verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Use the project's preview tooling (`.claude/launch.json` config, or `npm run dev` if driving it directly) and open a logged-in event's feed (`/feed/[eventId]`) at a desktop viewport width.

- [ ] **Step 2: Desktop — single-media post**

Click the photo on a post with exactly one media item. Confirm: the modal opens full-viewport (no visible rounded box/backdrop margin), the photo fills the left ~60%, the author/reaction/comment/comment-list/composer panel fills the right ~40% and is visible immediately (no extra click needed), and the URL is `?post=<id>` (no `media=` param, since index 0 is the default). No carousel arrows or counter should be visible (single item).

- [ ] **Step 3: Desktop — multi-media post**

Click the 2nd or 3rd thumbnail in a multi-media post's grid. Confirm the modal opens with *that* photo showing (not the first), the URL includes `media=<n>` matching the clicked index, and prev/next arrows plus a "n / total" counter are visible. Click through with the arrows and confirm the URL's `media` param updates via `read_network_requests`/URL bar without adding new browser-history entries (back button should return to the feed, not step through each photo).

- [ ] **Step 4: Desktop — text-only post**

Click the comment icon on a post with no media. Confirm the modal is the same centered/boxed layout as before this change (not full-viewport), with the "Post" title header visible.

- [ ] **Step 5: Mobile — media entry vs. comment entry**

Resize to a mobile viewport (`resize_window` with the `mobile` preset). Click a post's photo: confirm the photo fills the entire screen, and a bottom overlay shows the author name, a truncated caption (if any), and reaction/comment counts — no comments list visible yet. Tap that overlay and confirm a sheet slides up from the bottom covering most of the screen with the full comment list and composer; tap the drag-handle area to collapse it back to the overview.

Then, from the feed, tap a post's comment icon instead (any post, with or without media). Confirm it opens with the comments sheet already expanded (skip straight past the collapsed overview) when the post has media; for a text-only post, confirm it opens the same non-fullscreen modal as Step 4.

- [ ] **Step 6: Closing behavior**

On both desktop and mobile, with the lightbox open, verify all four close paths work: the X button (top-right, visible with sufficient contrast over the photo), Escape key, clicking the backdrop (desktop only — full-viewport modal on mobile has no visible backdrop margin, so skip), and the browser back button.

- [ ] **Step 7: Comments still work inside the lightbox**

Post a comment from inside the lightbox (either layout). Confirm it appears in the list, the input clears, and — after closing — the feed card's comment count reflects the new total.

- [ ] **Step 8: Check console/network for errors**

Use `read_console_messages` and `read_network_requests` across the above steps and confirm no unexpected errors, especially around image loading (`next/image` with the carousel) and no React key warnings from the carousel's map.

- [ ] **Step 9: Report results**

Summarize what was verified and any issues found. Fix and re-verify before considering this plan complete.
