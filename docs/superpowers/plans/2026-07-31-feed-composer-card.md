# Feed Composer Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock-only `/new-post` page with a Facebook-style composer card inline on the feed — collapsed placeholder that expands into a real caption + multi-image post form, wired to the actual backend.

**Architecture:** One new self-contained client component (`ComposerCard`) holds all local form state (caption, pending images, upload/submit status) and calls two TanStack Query mutations: a new `useUploadMediaBatch()` hook (batch image upload) and the existing `useCreatePost()`. It's mounted at the top of the feed's posts section. The standalone `/new-post` page and its nav links are removed in favor of it.

**Tech Stack:** Next.js App Router (client components), TanStack Query, next-intl, Tailwind CSS v4, TypeScript.

**No test runner exists in this repo** (no `test` script, no Jest/Vitest/RTL in `package.json`). Verification steps below use `npx tsc --noEmit` (type safety), `npm run lint` (existing ESLint config), and manual checks via the dev server instead of automated tests — this matches the design spec's own Testing section.

---

## Task 1: Batch media upload API plumbing

**Files:**
- Modify: `lib/api/types.ts`
- Modify: `lib/api/endpoints.ts`
- Modify: `hooks/useMedia.ts`

- [ ] **Step 1: Add the batch-upload response types**

In `lib/api/types.ts`, right after the `MediaResponseDto` interface (ends at line 468, immediately before `export interface PostRequestDto`), insert:

```ts
export interface MediaBatchFailedItemDto {
  filename: string;
  errorCode: string;
  message: string;
}

export interface MediaBatchUploadResponseDto {
  created: MediaResponseDto[];
  failed: MediaBatchFailedItemDto[];
}

```

- [ ] **Step 2: Add the batch-upload endpoint**

In `lib/api/endpoints.ts`, in the `events` object, change:

```ts
    media: (eventId: string) => `/api/events/${eventId}/media`,
```

to:

```ts
    media: (eventId: string) => `/api/events/${eventId}/media`,
    mediaBatch: (eventId: string) => `/api/events/${eventId}/media/batch`,
```

- [ ] **Step 3: Add the `useUploadMediaBatch` hook**

In `hooks/useMedia.ts`, update the type import and append a new hook. Change the import line:

```ts
import type { MediaResponseDto, MediaTypeConvention } from "@/lib/api/types";
```

to:

```ts
import type { MediaBatchUploadResponseDto, MediaResponseDto, MediaTypeConvention } from "@/lib/api/types";
```

Then add this after `useUploadMedia` (before `useDeleteMedia`):

```ts
interface UploadMediaBatchInput {
  eventId: string;
  files: File[];
  mediaType: MediaTypeConvention;
  uploaderMemberId?: string;
}

// POST /api/events/{eventId}/media/batch (multipart/form-data, repeated
// "files" field, 1..10 files, 20MB/file). Always resolves 200 — per-file
// outcomes are in the response body's `created`/`failed`, not the HTTP
// status, so check those rather than treating a 200 as "all succeeded".
export function useUploadMediaBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, files, mediaType, uploaderMemberId }: UploadMediaBatchInput) => {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      formData.append("mediaType", mediaType);
      if (uploaderMemberId) formData.append("uploaderMemberId", uploaderMemberId);
      return api.postForm<MediaBatchUploadResponseDto>(endpoints.events.mediaBatch(eventId), formData);
    },
    onSuccess: (result, { eventId }) => {
      if (result.created.length > 0) {
        queryClient.invalidateQueries({ queryKey: mediaKeys.list(eventId) });
      }
    },
  });
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `lib/api/types.ts`, `lib/api/endpoints.ts`, or `hooks/useMedia.ts`.

- [ ] **Step 5: Commit**

```bash
git add lib/api/types.ts lib/api/endpoints.ts hooks/useMedia.ts
git commit -m "feat: add batch media upload endpoint and hook"
```

---

## Task 2: ComposerCard component

**Files:**
- Create: `components/feed/ComposerCard.tsx`
- Modify: `components/feed/index.ts`

- [ ] **Step 1: Create the component**

Create `components/feed/ComposerCard.tsx`:

```tsx
'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { ImagePlus, Send, X } from 'lucide-react'
import { useActiveMember } from '@/providers/EventProvider'
import { useCreatePost, useUploadMediaBatch } from '@/hooks'
import Avatar from '@/components/ui/avatar'

const MAX_IMAGES = 10
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024

interface ComposerCardProps {
  eventId: string
  autoExpand?: boolean
}

interface PendingImage {
  key: string
  file: File
  previewUrl: string
  status: 'pending' | 'uploading' | 'uploaded' | 'failed'
  mediaId?: string
  error?: string
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function ComposerCard({ eventId, autoExpand = false }: ComposerCardProps) {
  const t = useTranslations('ComposerCard')
  const activeMember = useActiveMember()
  const createPost = useCreatePost()
  const uploadBatch = useUploadMediaBatch()

  const [expanded, setExpanded] = useState(autoExpand)
  const [caption, setCaption] = useState('')
  const [images, setImages] = useState<PendingImage[]>([])
  const [sizeError, setSizeError] = useState<string | null>(null)
  const [countError, setCountError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const hasUnresolvedFailures = images.some(img => img.status === 'failed')
  const isBusy = createPost.isPending || uploadBatch.isPending
  const canSubmit = (caption.trim().length > 0 || images.length > 0) && !hasUnresolvedFailures && !isBusy

  function expand() {
    setExpanded(true)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  function reset() {
    images.forEach(img => URL.revokeObjectURL(img.previewUrl))
    setCaption('')
    setImages([])
    setSizeError(null)
    setCountError(null)
    setExpanded(false)
  }

  function handleContainerBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    if (caption.trim().length === 0 && images.length === 0) {
      setExpanded(false)
    }
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    setSizeError(null)
    setCountError(null)

    const incoming = Array.from(fileList)
    const room = MAX_IMAGES - images.length
    const accepted: File[] = []
    let oversizeName: string | null = null

    for (const file of incoming) {
      if (accepted.length >= room) break
      if (file.size > MAX_FILE_SIZE_BYTES) {
        oversizeName = file.name
        continue
      }
      accepted.push(file)
    }

    if (incoming.length > room) setCountError(t('maxImagesReached'))
    if (oversizeName) setSizeError(t('fileTooLarge', { filename: oversizeName }))

    if (accepted.length > 0) {
      setImages(prev => [
        ...prev,
        ...accepted.map(file => ({
          key: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
          file,
          previewUrl: URL.createObjectURL(file),
          status: 'pending' as const,
        })),
      ])
    }
  }

  function removeImage(key: string) {
    setImages(prev => {
      const target = prev.find(img => img.key === key)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter(img => img.key !== key)
    })
  }

  async function uploadPendingImages(): Promise<string[] | null> {
    const toUpload = images.filter(img => img.status === 'pending' || img.status === 'failed')
    const alreadyUploaded = images.filter(img => img.status === 'uploaded' && img.mediaId)

    if (toUpload.length === 0) {
      return alreadyUploaded.map(img => img.mediaId!)
    }

    setImages(prev =>
      prev.map(img => (toUpload.some(u => u.key === img.key) ? { ...img, status: 'uploading', error: undefined } : img)),
    )

    const result = await uploadBatch.mutateAsync({
      eventId,
      files: toUpload.map(img => img.file),
      mediaType: 'IMAGE',
      uploaderMemberId: activeMember?.id,
    })

    const failedByName = new Map(result.failed.map(f => [f.filename, f.message]))
    let allUploaded = true

    setImages(prev =>
      prev.map(img => {
        if (!toUpload.some(u => u.key === img.key)) return img
        const failure = failedByName.get(img.file.name)
        if (failure) {
          allUploaded = false
          return { ...img, status: 'failed' as const, error: failure }
        }
        const created = result.created.find(m => m.originalFilename === img.file.name)
        return created ? { ...img, status: 'uploaded' as const, mediaId: created.id } : img
      }),
    )

    if (!allUploaded) return null
    return [...alreadyUploaded.map(img => img.mediaId!), ...result.created.map(m => m.id)]
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    const mediaIds = await uploadPendingImages()
    if (mediaIds === null) return

    await createPost.mutateAsync({
      eventId,
      authorMemberId: activeMember?.id,
      type: mediaIds.length > 0 ? 'MEDIA' : 'TEXT',
      content: caption.trim() || undefined,
      isPinned: false,
      mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
    })

    reset()
  }

  const initials = activeMember ? initialsFromName(activeMember.displayName) : '?'

  return (
    <div className="bg-card rounded-2xl shadow-[0_2px_16px_0_rgba(36,31,26,0.07)] p-4" onBlur={handleContainerBlur}>
      {!expanded ? (
        <button type="button" onClick={expand} className="w-full flex items-center gap-3 text-left">
          <Avatar initials={initials} size="md" alt={activeMember?.displayName} />
          <span className="flex-1 bg-surface-muted rounded-full px-4 py-2.5 text-sm text-ink-faint">
            {t('placeholder')}
          </span>
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <Avatar initials={initials} size="md" alt={activeMember?.displayName} />
            <textarea
              ref={textareaRef}
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder={t('captionPlaceholder')}
              aria-label={t('captionAriaLabel')}
              rows={3}
              className="flex-1 bg-surface-muted rounded-2xl px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 resize-none transition leading-relaxed"
            />
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {images.map(img => (
                <div key={img.key} className="relative aspect-square rounded-xl overflow-hidden bg-surface-muted">
                  <Image src={img.previewUrl} alt="" fill className="object-cover" sizes="200px" />
                  <button
                    type="button"
                    onClick={() => removeImage(img.key)}
                    aria-label={t('removeImage')}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-ink/60 flex items-center justify-center text-white hover:bg-ink/80 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  {img.status === 'uploading' && (
                    <div className="absolute inset-0 bg-ink/40 flex items-center justify-center text-white text-xs">…</div>
                  )}
                  {img.status === 'failed' && (
                    <div className="absolute inset-x-0 bottom-0 bg-destructive/90 text-white text-[10px] px-1.5 py-1 flex items-center justify-between gap-1">
                      <span className="truncate">{t('uploadFailed', { filename: img.file.name })}</span>
                      <button type="button" onClick={() => uploadPendingImages()} className="underline shrink-0">
                        {t('retry')}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {(sizeError || countError) && <p className="text-xs text-destructive">{sizeError ?? countError}</p>}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={images.length >= MAX_IMAGES}
              className="flex items-center gap-2 text-sm font-medium text-ink-muted hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ImagePlus className="w-4 h-4" />
              {t('addPhotos')}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={e => {
                handleFiles(e.target.files)
                e.target.value = ''
              }}
              aria-label={t('addPhotos')}
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={reset}
                className="px-4 py-2 rounded-full text-sm font-medium text-ink-muted hover:bg-surface-muted transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-brand text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                <Send className="w-4 h-4" />
                {isBusy ? t('posting') : t('post')}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Export it from the barrel**

In `components/feed/index.ts`, add:

```ts
export * from './ComposerCard'
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: errors only about the missing `ComposerCard` i18n namespace being untyped are **not** expected (next-intl types aren't strict here); expect no errors from `ComposerCard.tsx` itself. (i18n keys are added in Task 5 — until then, calls like `t('placeholder')` are valid TypeScript, they'll just render missing-key warnings at runtime, which Task 3's manual check will not yet exercise since the component isn't mounted until Task 4.)

- [ ] **Step 4: Commit**

```bash
git add components/feed/ComposerCard.tsx components/feed/index.ts
git commit -m "feat: add ComposerCard component"
```

---

## Task 3: Add ComposerCard i18n strings

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/el.json`

- [ ] **Step 1: Replace the `FeedPage` block in `messages/en.json`**

Change:

```json
  "FeedPage": {
    "celebrateTheMoment": "Celebrate the moment"
  },
```

to:

```json
  "ComposerCard": {
    "placeholder": "Celebrate the moment",
    "captionPlaceholder": "Share a memory, message, or moment...",
    "captionAriaLabel": "Post caption",
    "addPhotos": "Add photos",
    "removeImage": "Remove image",
    "uploadFailed": "Couldn't upload {filename}",
    "retry": "Retry",
    "maxImagesReached": "You can add up to 10 photos",
    "fileTooLarge": "{filename} is over 20 MB",
    "cancel": "Cancel",
    "post": "Post",
    "posting": "Posting…"
  },
```

- [ ] **Step 2: Remove the `NewPostPage` block in `messages/en.json`**

Change:

```json
  "NewPostPage": {
    "goBack": "Go back",
    "title": "New Post",
    "captionPlaceholder": "Share a memory, message, or moment with Emma & James...",
    "captionAriaLabel": "Post caption",
    "postPreviewAlt": "Post preview",
    "removeImage": "Remove image",
    "addPhoto": "Add a photo",
    "photoFormats": "JPEG, PNG, HEIC up to 10 MB",
    "uploadImage": "Upload image",
    "addTagPlaceholder": "Add a tag — press Enter",
    "addTag": "Add tag",
    "removeTag": "Remove tag {tag}",
    "submit": "Share to the Wall"
  },
  "PostPage": {
```

to:

```json
  "PostPage": {
```

- [ ] **Step 3: Replace the `FeedPage` block in `messages/el.json`**

Change:

```json
  "FeedPage": {
    "celebrateTheMoment": "Γιορτάστε τη στιγμή"
  },
```

to:

```json
  "ComposerCard": {
    "placeholder": "Γιορτάστε τη στιγμή",
    "captionPlaceholder": "Μοιραστείτε μια ανάμνηση, μήνυμα ή στιγμή...",
    "captionAriaLabel": "Λεζάντα ανάρτησης",
    "addPhotos": "Προσθήκη φωτογραφιών",
    "removeImage": "Αφαίρεση εικόνας",
    "uploadFailed": "Δεν ήταν δυνατή η μεταφόρτωση του {filename}",
    "retry": "Επανάληψη",
    "maxImagesReached": "Μπορείτε να προσθέσετε έως 10 φωτογραφίες",
    "fileTooLarge": "Το {filename} υπερβαίνει τα 20 MB",
    "cancel": "Ακύρωση",
    "post": "Ανάρτηση",
    "posting": "Ανάρτηση..."
  },
```

- [ ] **Step 4: Remove the `NewPostPage` block in `messages/el.json`**

Change:

```json
  "NewPostPage": {
    "goBack": "Πίσω",
    "title": "Νέα Ανάρτηση",
    "captionPlaceholder": "Μοιραστείτε μια ανάμνηση, μήνυμα ή στιγμή με την Έμμα & τον Τζέιμς...",
    "captionAriaLabel": "Λεζάντα ανάρτησης",
    "postPreviewAlt": "Προεπισκόπηση ανάρτησης",
    "removeImage": "Αφαίρεση εικόνας",
    "addPhoto": "Προσθήκη φωτογραφίας",
    "photoFormats": "JPEG, PNG, HEIC έως 10 MB",
    "uploadImage": "Μεταφόρτωση εικόνας",
    "addTagPlaceholder": "Προσθήκη ετικέτας — πατήστε Enter",
    "addTag": "Προσθήκη ετικέτας",
    "removeTag": "Αφαίρεση ετικέτας {tag}",
    "submit": "Κοινοποίηση στον Τοίχο"
  },
  "PostPage": {
```

to:

```json
  "PostPage": {
```

- [ ] **Step 5: Validate both files are still valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); JSON.parse(require('fs').readFileSync('messages/el.json','utf8')); console.log('ok')"`
Expected: `ok`

- [ ] **Step 6: Commit**

```bash
git add messages/en.json messages/el.json
git commit -m "feat: add ComposerCard translations, remove NewPostPage translations"
```

---

## Task 4: Mount ComposerCard on the feed page

**Files:**
- Modify: `app/(app)/feed/[eventId]/page.tsx`

- [ ] **Step 1: Add imports and compose-query-param handling**

Change the top of the file from:

```tsx
'use client'

import {use, useEffect, useMemo, useState} from 'react'
import {StoriesRow, PostCard, Header, Banner, EventInfo, EventNotFound, RsvpPrompt} from '@/components/feed'
import { posts as initialPosts } from '@/lib/mock-data'
import { useEvent } from '@/hooks/useEvent'
import { useEventSwitcher } from '@/providers/EventProvider'
import { ApiError } from '@/lib/api/client'
import {ModuleKeyConvention} from "@/lib/api/types";
import {useEventPosts} from "@/hooks";

export default function FeedPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = use(params)
    const [posts, setPosts] = useState(initialPosts)

    const { data: event, error } = useEvent(eventId)
    const { setActiveEventId } = useEventSwitcher()
    const {data, isPending} = useEventPosts(eventId)
    console.log('data', data)


    // Deep links (a shared invite, browser history, a bookmark) should make
    // this the active event for the rest of the app too, not just this page —
    // but only once we know it actually exists.
    useEffect(() => {
        if (event) setActiveEventId(eventId)
    }, [event, eventId, setActiveEventId])
```

to:

```tsx
'use client'

import {use, useEffect, useMemo, useRef, useState} from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {StoriesRow, PostCard, Header, Banner, EventInfo, EventNotFound, RsvpPrompt, ComposerCard} from '@/components/feed'
import { posts as initialPosts } from '@/lib/mock-data'
import { useEvent } from '@/hooks/useEvent'
import { useEventSwitcher } from '@/providers/EventProvider'
import { ApiError } from '@/lib/api/client'
import {ModuleKeyConvention} from "@/lib/api/types";
import {useEventPosts} from "@/hooks";

export default function FeedPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = use(params)
    const [posts, setPosts] = useState(initialPosts)
    const router = useRouter()
    const searchParams = useSearchParams()
    const shouldCompose = searchParams.get('compose') === '1'
    const composerRef = useRef<HTMLDivElement>(null)

    const { data: event, error } = useEvent(eventId)
    const { setActiveEventId } = useEventSwitcher()
    const {data, isPending} = useEventPosts(eventId)
    console.log('data', data)


    // Deep links (a shared invite, browser history, a bookmark) should make
    // this the active event for the rest of the app too, not just this page —
    // but only once we know it actually exists.
    useEffect(() => {
        if (event) setActiveEventId(eventId)
    }, [event, eventId, setActiveEventId])

    // ?compose=1 (from the nav rail's "New Post" CTA) scrolls to and expands
    // the composer, then strips itself so a refresh doesn't re-trigger it.
    useEffect(() => {
        if (!shouldCompose) return
        composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        router.replace(`/feed/${eventId}`)
    }, [shouldCompose, eventId, router])
```

- [ ] **Step 2: Render the composer above the posts list**

Change:

```tsx
        {/* Posts */}
        <section className={'mt-5'}>
            {moduleFlags.posts && (
                <div className="flex flex-col gap-4 px-4 pb-24 lg:pb-10">
                    {posts.map(post => (
                        <PostCard key={post.id} post={post}/>
                    ))}
                </div>
            )}
        </section>
```

to:

```tsx
        {/* Posts */}
        <section className={'mt-5'}>
            {moduleFlags.posts && (
                <div className="flex flex-col gap-4 px-4 pb-24 lg:pb-10">
                    <div ref={composerRef}>
                        <ComposerCard eventId={eventId} autoExpand={shouldCompose} />
                    </div>
                    {posts.map(post => (
                        <PostCard key={post.id} post={post}/>
                    ))}
                </div>
            )}
        </section>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors from `app/(app)/feed/[eventId]/page.tsx`.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, then in a browser open the feed for an event that has the `posts` module enabled.
Expected:
- A compact card with your avatar and "Celebrate the moment" placeholder text appears above the post list.
- Clicking it expands into a caption box + "Add photos" + Cancel/Post, and the caption box is focused.
- Selecting 2–3 images shows thumbnails in a grid, each removable via the × button.
- Selecting an 11th image (or one over 20MB, if you have one handy) shows the corresponding inline error.
- Clicking Cancel collapses the card and clears the draft.
- Typing text and clicking Post: the button shows "Posting…", then the card resets to collapsed. Check the Network tab — you should see `POST /api/events/{eventId}/media/batch` (only if images were attached) followed by `POST /api/posts` with the right payload.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/feed/[eventId]/page.tsx"
git commit -m "feat: mount ComposerCard on the feed page"
```

---

## Task 5: Remove `/new-post` and repoint nav

**Files:**
- Delete: `app/(app)/new-post/page.tsx`
- Modify: `components/layout/DesktopNavRail.tsx`

- [ ] **Step 1: Delete the standalone new-post page**

```bash
rm "app/(app)/new-post/page.tsx"
```

If `app/(app)/new-post/` is now empty, also remove the empty directory:

```bash
rmdir "app/(app)/new-post" 2>/dev/null || true
```

- [ ] **Step 2: Repoint the "New Post" CTA**

In `components/layout/DesktopNavRail.tsx`, change:

```tsx
        <Link
          href="/new-post"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
```

to:

```tsx
        <Link
          href="/feed?compose=1"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors referencing `app/(app)/new-post` or `DesktopNavRail.tsx`. (Pre-existing lint warnings elsewhere in the repo, if any, are not this task's concern.)

- [ ] **Step 4: Commit**

```bash
git add -A "app/(app)/new-post" components/layout/DesktopNavRail.tsx
git commit -m "refactor: remove standalone new-post page in favor of the feed composer"
```

---

## Task 6: Forward `?compose=1` through the bare `/feed` redirect

**Files:**
- Modify: `app/(app)/feed/page.tsx`

- [ ] **Step 1: Forward the query string on redirect**

Replace the full contents of `app/(app)/feed/page.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEventSwitcher } from '@/providers/EventProvider'

// Bare /feed has no event id, so it can't render a feed itself — it exists
// only so links like the nav rail's "Home" tab and the post-login redirect
// don't need to know an event id up front. It forwards to whichever event is
// active (falling back to the user's first membership) as soon as that's
// known, then the real page lives at /feed/[eventId]. Any query string
// (e.g. ?compose=1 from the "New Post" CTA) is forwarded along.
export default function FeedRedirectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { activeEvent, memberships, isLoading } = useEventSwitcher()

  useEffect(() => {
    if (isLoading) return
    const eventId = activeEvent?.id ?? memberships[0]?.eventId
    if (!eventId) {
      router.replace('/welcome')
      return
    }
    const query = searchParams.toString()
    router.replace(`/feed/${eventId}${query ? `?${query}` : ''}`)
  }, [isLoading, activeEvent, memberships, router, searchParams])

  return null
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors from `app/(app)/feed/page.tsx`.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, navigate to `http://localhost:3000/feed?compose=1` directly.
Expected: you land on `/feed/{eventId}` (no `?compose=1` in the final URL bar after the redirect settles), the page scrolls to the composer, and it's expanded with the caption box focused.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/feed/page.tsx"
git commit -m "feat: forward query string through the /feed redirect"
```

---

## Final Self-Check (for whoever executes this plan)

After Task 6, do one end-to-end pass:
1. From the desktop nav rail, click "New Post" → should land on the feed with the composer expanded and focused.
2. Create a text-only post → verify `POST /api/posts` fires with `type: "TEXT"`, no `mediaIds`.
3. Create a post with 2 images → verify `POST /api/events/{eventId}/media/batch` fires first, then `POST /api/posts` with `type: "MEDIA"` and `mediaIds` in the order the images were added.
4. Confirm `app/(app)/new-post` no longer exists and nothing else in the repo references `/new-post` (`grep -r "new-post" app components` should only match the git history, not any remaining source file).
