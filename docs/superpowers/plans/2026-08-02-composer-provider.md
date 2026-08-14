# Composer Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract post-composing and story-creation logic out of `ComposerCard`/`StoriesRow` into a `ComposerProvider` + `useComposer()` hook that any component can call, turn the post composer into a global modal, add a "+" tab-bar button that opens a Post/Story menu, make story capture launch the camera directly, and add the missing "add another story" affordance.

**Architecture:** One new context provider (`providers/ComposerProvider.tsx`) owns all composer state (post caption/images/upload/submit, story upload/create) and renders the global post-composer `Modal` plus a hidden camera-capture `<input>`, both portaled so they work regardless of the current route. `ComposerCard` shrinks to just the collapsed placeholder trigger. `StoriesRow` and the new `MobileTabBar` "+" menu and `StoryAvatar` badge all call the same `useComposer()` actions instead of each owning their own file-input/upload logic.

**Tech Stack:** Next.js App Router (client components), TanStack Query, next-intl, Tailwind CSS v4, TypeScript, `@base-ui/react` (`Dialog` via the existing `Modal` component, `Menu` for the tab-bar popup).

**No test runner exists in this repo** (no `test` script, no Jest/Vitest/RTL in `package.json`). Verification steps below use `npx tsc --noEmit` (type safety), `npm run lint`, and manual checks via the dev server — matching the design spec's own Testing section and the convention already used in `docs/superpowers/plans/2026-07-31-feed-composer-card.md`.

---

## Task 1: `ComposerProvider` — post-composer state and modal

**Files:**

- Create: `providers/ComposerProvider.tsx`

- [ ] **Step 1: Create the provider with post-composer state, hidden story input, and the modal shell**

Create `providers/ComposerProvider.tsx`:

```tsx
'use client';

import { ImagePlus, Send, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';

import Avatar from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import { useCreatePost, useCreateStory, useUploadMedia, useUploadMediaBatch } from '@/hooks';
import { initialsFromName } from '@/lib/utils';
import { useActiveEvent, useActiveMember } from '@/providers/EventProvider';

const MAX_IMAGES = 10;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

interface PendingImage {
    key: string;
    file: File;
    previewUrl: string;
    status: 'pending' | 'uploading' | 'uploaded' | 'failed';
    mediaId?: string;
    error?: string;
}

interface ComposerContextValue {
    openPostComposer: () => void;
    openStoryCapture: () => void;
    isCreatingStory: boolean;
    storyError: string | null;
}

const ComposerContext = createContext<ComposerContextValue | null>(null);

export function ComposerProvider({ children }: { children: ReactNode }) {
    const t = useTranslations('ComposerCard');
    const router = useRouter();
    const activeEvent = useActiveEvent();
    const activeMember = useActiveMember();
    const createPost = useCreatePost();
    const uploadBatch = useUploadMediaBatch();
    const uploadMedia = useUploadMedia();
    const createStory = useCreateStory();

    const [isOpen, setIsOpen] = useState(false);
    const [caption, setCaption] = useState('');
    const [images, setImages] = useState<PendingImage[]>([]);
    const [sizeError, setSizeError] = useState<string | null>(null);
    const [countError, setCountError] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [storyError, setStoryError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const storyInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Focus the caption box once the modal (and its portaled DOM) has
    // actually mounted, rather than in the same tick as setIsOpen(true) —
    // the textarea doesn't exist yet at that point since Dialog.Portal only
    // renders its content once `open` takes effect.
    useEffect(() => {
        if (!isOpen) return;
        const raf = requestAnimationFrame(() => textareaRef.current?.focus());
        return () => cancelAnimationFrame(raf);
    }, [isOpen]);

    const imagesRef = useRef<PendingImage[]>([]);
    useEffect(() => {
        imagesRef.current = images;
    }, [images]);

    useEffect(() => {
        return () => {
            imagesRef.current.forEach((img) => URL.revokeObjectURL(img.previewUrl));
        };
    }, []);

    const hasUnresolvedFailures = images.some((img) => img.status === 'failed');
    const isPostBusy = createPost.isPending || uploadBatch.isPending;
    const canSubmit =
        (caption.trim().length > 0 || images.length > 0) && !hasUnresolvedFailures && !isPostBusy && Boolean(activeMember) && Boolean(activeEvent);

    function openPostComposer() {
        if (!activeMember || !activeEvent) return;
        setIsOpen(true);
    }

    function closePostComposer() {
        images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
        setCaption('');
        setImages([]);
        setSizeError(null);
        setCountError(null);
        setSubmitError(null);
        setIsOpen(false);
    }

    function handleFiles(fileList: FileList | null) {
        if (!fileList || fileList.length === 0) return;
        setSizeError(null);
        setCountError(null);

        const incoming = Array.from(fileList);
        const room = MAX_IMAGES - images.length;
        const accepted: File[] = [];
        const oversizeNames: string[] = [];

        for (const file of incoming) {
            if (accepted.length >= room) break;
            if (file.size > MAX_FILE_SIZE_BYTES) {
                oversizeNames.push(file.name);
                continue;
            }
            accepted.push(file);
        }

        if (incoming.length > room) setCountError(t('maxImagesReached'));
        if (oversizeNames.length > 0) setSizeError(t('fileTooLarge', { filename: oversizeNames.join(', ') }));

        if (accepted.length > 0) {
            setImages((prev) => [
                ...prev,
                ...accepted.map((file) => ({
                    key: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
                    file,
                    previewUrl: URL.createObjectURL(file),
                    status: 'pending' as const,
                })),
            ]);
        }
    }

    function removeImage(key: string) {
        setImages((prev) => {
            const target = prev.find((img) => img.key === key);
            if (target) URL.revokeObjectURL(target.previewUrl);
            return prev.filter((img) => img.key !== key);
        });
    }

    async function uploadPendingImages(): Promise<string[] | null> {
        const toUpload = images.filter((img) => img.status === 'pending' || img.status === 'failed');
        const alreadyUploaded = images.filter((img) => img.status === 'uploaded' && img.mediaId);

        if (toUpload.length === 0) {
            return alreadyUploaded.map((img) => img.mediaId!);
        }

        setImages((prev) => prev.map((img) => (toUpload.some((u) => u.key === img.key) ? { ...img, status: 'uploading', error: undefined } : img)));

        let result;
        try {
            result = await uploadBatch.mutateAsync({
                eventId: activeEvent!.id,
                files: toUpload.map((img) => img.file),
                mediaType: 'IMAGE',
                uploaderMemberId: activeMember?.id,
            });
        } catch {
            setImages((prev) => prev.map((img) => (toUpload.some((u) => u.key === img.key) ? { ...img, status: 'failed' as const } : img)));
            return null;
        }

        const createdByName = new Map<string, typeof result.created>();
        result.created.forEach((m) => {
            const arr = createdByName.get(m.originalFilename) ?? [];
            arr.push(m);
            createdByName.set(m.originalFilename, arr);
        });
        const failedByName = new Map<string, string[]>();
        result.failed.forEach((f) => {
            const arr = failedByName.get(f.filename) ?? [];
            arr.push(f.message);
            failedByName.set(f.filename, arr);
        });

        // Correlate each pending image with its result in a single synchronous
        // pass (not inside the setImages updater, whose timing isn't
        // guaranteed) so both the new image states and the ordered id list
        // below are derived from the same, reliable data.
        const newMediaIdByKey = new Map<string, string>();
        const newErrorByKey = new Map<string, string>();
        let hasFailure = false;
        for (const img of toUpload) {
            const failMsgs = failedByName.get(img.file.name);
            if (failMsgs && failMsgs.length > 0) {
                newErrorByKey.set(img.key, failMsgs.shift()!);
                hasFailure = true;
                continue;
            }
            const createdList = createdByName.get(img.file.name);
            const created = createdList?.shift();
            if (created) newMediaIdByKey.set(img.key, created.id);
        }

        setImages((prev) =>
            prev.map((img) => {
                if (newMediaIdByKey.has(img.key)) {
                    return {
                        ...img,
                        status: 'uploaded' as const,
                        mediaId: newMediaIdByKey.get(img.key),
                    };
                }
                if (newErrorByKey.has(img.key)) {
                    return { ...img, status: 'failed' as const, error: newErrorByKey.get(img.key) };
                }
                return img;
            })
        );

        if (hasFailure) return null;

        // Order the returned ids by the latest image state (via imagesRef, not
        // the closed-over `images` snapshot) so a removal that happened while
        // this round was in flight is reflected, rather than by the raw API
        // response order. Skip any image that was removed entirely (it won't
        // be in imagesRef.current).
        return imagesRef.current
            .map((img) => newMediaIdByKey.get(img.key) ?? (img.status === 'uploaded' ? img.mediaId : undefined))
            .filter((id): id is string => Boolean(id));
    }

    async function submitPost(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!canSubmit || !activeEvent || !activeMember) return;

        setSubmitError(null);

        const mediaIds = await uploadPendingImages();
        if (mediaIds === null) return;

        try {
            await createPost.mutateAsync({
                eventId: activeEvent.id,
                authorMemberId: activeMember.id,
                type: mediaIds.length > 0 ? 'MEDIA' : 'TEXT',
                content: caption.trim() || undefined,
                isPinned: false,
                mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
            });
        } catch {
            setSubmitError('Something went wrong. Please try again.');
            return;
        }

        closePostComposer();
    }

    function openStoryCapture() {
        storyInputRef.current?.click();
    }

    async function handleStoryFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file || !activeMember || !activeEvent) return;

        setStoryError(null);
        try {
            const media = await uploadMedia.mutateAsync({
                eventId: activeEvent.id,
                file,
                mediaType: 'IMAGE',
                uploaderMemberId: activeMember.id,
            });
            const story = await createStory.mutateAsync({
                eventId: activeEvent.id,
                authorMemberId: activeMember.id,
                mediaId: media.id,
            });
            router.push(`/story/${story.id}`);
        } catch {
            setStoryError(t('storyUploadFailed'));
        }
    }

    const initials = activeMember ? initialsFromName(activeMember.displayName) : '?';

    const value: ComposerContextValue = {
        openPostComposer,
        openStoryCapture,
        isCreatingStory: uploadMedia.isPending || createStory.isPending,
        storyError,
    };

    return (
        <ComposerContext.Provider value={value}>
            {children}

            <input
                ref={storyInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={handleStoryFileChange}
                aria-hidden="true"
                tabIndex={-1}
            />

            <Modal open={isOpen} onClose={closePostComposer} size="sm" closeLabel={t('cancel')}>
                <Modal.Body className="p-4">
                    <form onSubmit={submitPost} className="flex flex-col gap-4">
                        <div className="flex items-start gap-3">
                            <Avatar initials={initials} size="md" alt={activeMember?.displayName} />
                            <textarea
                                ref={textareaRef}
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                placeholder={t('captionPlaceholder')}
                                aria-label={t('captionAriaLabel')}
                                rows={3}
                                className="flex-1 bg-surface-muted rounded-2xl px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 resize-none transition leading-relaxed"
                            />
                        </div>

                        {images.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                                {images.map((img) => (
                                    <div key={img.key} className="relative aspect-square rounded-xl overflow-hidden bg-surface-muted">
                                        <Image src={img.previewUrl} alt="" fill className="object-cover" sizes="200px" />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(img.key)}
                                            disabled={img.status === 'uploading'}
                                            aria-label={t('removeImage')}
                                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-ink/60 flex items-center justify-center text-white hover:bg-ink/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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

                        {(sizeError || countError || submitError) && (
                            <p className="text-xs text-destructive">{sizeError ?? countError ?? submitError}</p>
                        )}

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
                                onChange={(e) => {
                                    handleFiles(e.target.files);
                                    e.target.value = '';
                                }}
                                aria-label={t('addPhotos')}
                                tabIndex={-1}
                            />

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={closePostComposer}
                                    disabled={isPostBusy}
                                    className="px-4 py-2 rounded-full text-sm font-medium text-ink-muted hover:bg-surface-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={!canSubmit}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-brand text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                                >
                                    <Send className="w-4 h-4" />
                                    {isPostBusy ? t('posting') : t('post')}
                                </button>
                            </div>
                        </div>
                    </form>
                </Modal.Body>
            </Modal>
        </ComposerContext.Provider>
    );
}

export function useComposer(): ComposerContextValue {
    const context = useContext(ComposerContext);
    if (!context) {
        throw new Error('useComposer must be used within a ComposerProvider');
    }
    return context;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: errors only about the not-yet-added `ComposerCard.storyUploadFailed` i18n key are **not** real TypeScript errors (next-intl key lookups aren't statically checked in this repo); expect no type errors from `providers/ComposerProvider.tsx` itself.

- [ ] **Step 3: Commit**

```bash
git add providers/ComposerProvider.tsx
git commit -m "feat: add ComposerProvider with global post-composer modal and story capture"
```

---

## Task 2: Mount `ComposerProvider`

**Files:**

- Modify: `providers/Providers.tsx`

- [ ] **Step 1: Nest `ComposerProvider` inside `EventProvider`, outside `ModalProvider`**

In `providers/Providers.tsx`, change:

```tsx
import { ApiError } from '@/lib/api/client';
import { AuthProvider } from '@/providers/AuthProvider';
import { EventProvider } from '@/providers/EventProvider';
import { ModalProvider } from '@/providers/ModalProvider';
```

to:

```tsx
import { ApiError } from '@/lib/api/client';
import { AuthProvider } from '@/providers/AuthProvider';
import { ComposerProvider } from '@/providers/ComposerProvider';
import { EventProvider } from '@/providers/EventProvider';
import { ModalProvider } from '@/providers/ModalProvider';
```

and change:

```tsx
<AuthProvider>
    <EventProvider>
        <ModalProvider>{children}</ModalProvider>
    </EventProvider>
</AuthProvider>
```

to:

```tsx
<AuthProvider>
    <EventProvider>
        <ComposerProvider>
            <ModalProvider>{children}</ModalProvider>
        </ComposerProvider>
    </EventProvider>
</AuthProvider>
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors from `providers/Providers.tsx`.

- [ ] **Step 3: Commit**

```bash
git add providers/Providers.tsx
git commit -m "feat: mount ComposerProvider"
```

---

## Task 3: Add composer i18n strings

**Files:**

- Modify: `messages/en.json`
- Modify: `messages/el.json`

- [ ] **Step 1: Add `storyUploadFailed` to `ComposerCard` and new keys to `MobileTabBar` and `StoryAvatar` in `messages/en.json`**

Change:

```json
    "StoryAvatar": {
        "addYourStory": "Add your story",
        "userStory": "{name}'s story",
        "yourStory": "Your story"
    },
```

to:

```json
    "StoryAvatar": {
        "addYourStory": "Add your story",
        "addAnotherStory": "Add another story",
        "userStory": "{name}'s story",
        "yourStory": "Your story"
    },
```

Change:

```json
    "MobileTabBar": {
        "mobileNavigation": "Mobile navigation",
        "newPost": "New post",
        "items": {
            "home": "Home",
            "tools": "Tools",
            "post": "Post",
            "alerts": "Notifications"
        }
    },
```

to:

```json
    "MobileTabBar": {
        "mobileNavigation": "Mobile navigation",
        "compose": "Create",
        "composeMenu": {
            "post": "Post",
            "story": "Story"
        },
        "items": {
            "home": "Home",
            "tools": "Tools",
            "post": "Post",
            "alerts": "Notifications"
        }
    },
```

Change:

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

to:

```json
    "ComposerCard": {
        "placeholder": "Celebrate the moment",
        "captionPlaceholder": "Share a memory, message, or moment...",
        "captionAriaLabel": "Post caption",
        "addPhotos": "Add photos",
        "removeImage": "Remove image",
        "uploadFailed": "Couldn't upload {filename}",
        "storyUploadFailed": "Couldn't upload your story. Please try again.",
        "retry": "Retry",
        "maxImagesReached": "You can add up to 10 photos",
        "fileTooLarge": "{filename} is over 20 MB",
        "cancel": "Cancel",
        "post": "Post",
        "posting": "Posting…"
    },
```

- [ ] **Step 2: Mirror the same changes in `messages/el.json`**

Change:

```json
    "StoryAvatar": {
        "addYourStory": "Προσθέστε την ιστορία σας",
        "userStory": "Ιστορία του/της {name}",
        "yourStory": "Η ιστορία σας"
    },
```

to:

```json
    "StoryAvatar": {
        "addYourStory": "Προσθέστε την ιστορία σας",
        "addAnotherStory": "Προσθήκη νέας ιστορίας",
        "userStory": "Ιστορία του/της {name}",
        "yourStory": "Η ιστορία σας"
    },
```

Change:

```json
    "MobileTabBar": {
        "mobileNavigation": "Πλοήγηση κινητού",
        "newPost": "Νέα ανάρτηση",
        "items": {
            "home": "Αρχική",
            "tools": "Εργαλεία",
            "post": "Ανάρτηση",
            "alerts": "Ειδοποιήσεις"
        }
    },
```

to:

```json
    "MobileTabBar": {
        "mobileNavigation": "Πλοήγηση κινητού",
        "compose": "Δημιουργία",
        "composeMenu": {
            "post": "Ανάρτηση",
            "story": "Ιστορία"
        },
        "items": {
            "home": "Αρχική",
            "tools": "Εργαλεία",
            "post": "Ανάρτηση",
            "alerts": "Ειδοποιήσεις"
        }
    },
```

Change:

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
        "posting": "Ανάρτηση…"
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
        "storyUploadFailed": "Δεν ήταν δυνατή η μεταφόρτωση της ιστορίας σας. Δοκιμάστε ξανά.",
        "retry": "Επανάληψη",
        "maxImagesReached": "Μπορείτε να προσθέσετε έως 10 φωτογραφίες",
        "fileTooLarge": "Το {filename} υπερβαίνει τα 20 MB",
        "cancel": "Ακύρωση",
        "post": "Ανάρτηση",
        "posting": "Ανάρτηση…"
    },
```

- [ ] **Step 3: Validate both files are still valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); JSON.parse(require('fs').readFileSync('messages/el.json','utf8')); console.log('ok')"`
Expected: `ok`

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/el.json
git commit -m "feat: add composer provider translations"
```

---

## Task 4: Shrink `ComposerCard` to the collapsed trigger

**Files:**

- Modify: `components/feed/ComposerCard.tsx`

- [ ] **Step 1: Replace the whole file with the collapsed-only trigger**

Replace the full contents of `components/feed/ComposerCard.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';

import Avatar from '@/components/ui/avatar';
import { initialsFromName } from '@/lib/utils';
import { useActiveMember } from '@/providers/EventProvider';
import { useComposer } from '@/providers/ComposerProvider';

export function ComposerCard() {
    const t = useTranslations('ComposerCard');
    const activeMember = useActiveMember();
    const { openPostComposer } = useComposer();

    const initials = activeMember ? initialsFromName(activeMember.displayName) : '?';

    return (
        <div className="bg-card rounded-2xl shadow-[0_2px_16px_0_rgba(36,31,26,0.07)] p-4">
            <button type="button" onClick={openPostComposer} className="w-full flex items-center gap-3 text-left">
                <Avatar initials={initials} size="md" alt={activeMember?.displayName} />
                <span className="flex-1 bg-surface-muted rounded-full px-4 py-2.5 text-sm text-ink-faint">{t('placeholder')}</span>
            </button>
        </div>
    );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: new errors at every call site still passing `eventId`/`autoExpand` props to `ComposerCard` (fixed in Task 6) — no errors from `ComposerCard.tsx` itself.

- [ ] **Step 3: Commit**

```bash
git add components/feed/ComposerCard.tsx
git commit -m "refactor: shrink ComposerCard to the collapsed trigger, delegate to useComposer"
```

---

## Task 5: `StoriesRow` delegates story creation to `useComposer`

**Files:**

- Modify: `components/feed/StoriesRow.tsx`

- [ ] **Step 1: Remove local upload/create logic, call `openStoryCapture()` instead**

Replace the full contents of `components/feed/StoriesRow.tsx`:

```tsx
'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { useComposer } from '@/providers/ComposerProvider';
import { useEventMembers, useEventStories } from '@/hooks';
import { groupStoriesByAuthor } from '@/lib/stories';
import { useActiveMember } from '@/providers/EventProvider';

import { StoryAvatar } from './StoryAvatar';

interface StoriesRowProps {
    eventId: string;
}

export function StoriesRow({ eventId }: StoriesRowProps) {
    const t = useTranslations('StoriesRow');
    const tAvatar = useTranslations('StoryAvatar');
    const activeMember = useActiveMember();
    const { data: stories = [] } = useEventStories(eventId);
    const { data: members = [] } = useEventMembers(eventId);
    const { openStoryCapture, isCreatingStory, storyError } = useComposer();

    const groups = useMemo(() => groupStoriesByAuthor(stories), [stories]);
    const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

    const ownGroup = activeMember ? groups.find((g) => g.authorMemberId === activeMember.id) : undefined;
    const otherGroups = groups.filter((g) => g.authorMemberId !== activeMember?.id);

    return (
        <section aria-label={t('ariaLabel')} className="flex items-start gap-4 overflow-x-auto no-scrollbar px-4 py-4">
            {/* Current user slot */}
            {ownGroup && activeMember ? (
                <StoryAvatar group={ownGroup} member={activeMember} isCurrentUser />
            ) : (
                <div className="flex flex-col items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={openStoryCapture}
                        disabled={!activeMember || isCreatingStory}
                        aria-label={tAvatar('addYourStory')}
                        className="relative w-15.5 h-15.5 flex items-center justify-center disabled:opacity-60"
                    >
                        <Image src="/assets/StoryAvatar.svg" alt="" className="w-full h-full object-cover rounded-xl" width={150} height={150} />
                    </button>
                    <span className="text-[11px] text-ink-muted font-medium text-center leading-tight max-w-14 truncate">{tAvatar('yourStory')}</span>
                </div>
            )}

            {storyError && (
                <p role="alert" className="text-xs text-destructive shrink-0 self-center max-w-32">
                    {storyError}
                </p>
            )}

            {/* Divider */}
            <div className="w-px h-14 bg-border self-center shrink-0" aria-hidden="true" />

            {/* Other stories */}
            {otherGroups.map((group) => {
                const member = membersById.get(group.authorMemberId);
                if (!member) return null;
                return <StoryAvatar key={group.authorMemberId} group={group} member={member} />;
            })}
        </section>
    );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors from `components/feed/StoriesRow.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/feed/StoriesRow.tsx
git commit -m "refactor: StoriesRow delegates story capture to useComposer"
```

---

## Task 6: `StoryAvatar` — add-another-story badge

**Files:**

- Modify: `components/feed/StoryAvatar.tsx`

- [ ] **Step 1: Replace the full contents to add the badge for `isCurrentUser`**

Replace the full contents of `components/feed/StoryAvatar.tsx`:

```tsx
'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import Avatar from '@/components/ui/avatar';
import { useComposer } from '@/providers/ComposerProvider';
import type { EventMemberResponseDto } from '@/lib/api/types';
import type { StoryGroup } from '@/lib/stories';
import { avatarColorFromId, cn, initialsFromName } from '@/lib/utils';

interface StoryAvatarProps {
    group: StoryGroup;
    member: EventMemberResponseDto;
    isCurrentUser?: boolean;
}

export function StoryAvatar({ group, member, isCurrentUser }: StoryAvatarProps) {
    const t = useTranslations('StoryAvatar');
    const { openStoryCapture } = useComposer();
    const firstStoryId = group.stories[0].id;

    const ring = (
        <div
            className={cn('w-15.5 h-15.5 rounded-full p-0.75 flex items-center justify-center', group.allSeen ? 'bg-border' : 'bg-gradient-brand')}
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
    );

    const label = (
        <span className="text-[11px] text-ink-muted font-medium text-center leading-tight max-w-14 truncate">
            {isCurrentUser ? t('yourStory') : member.displayName.split(' ')[0]}
        </span>
    );

    if (!isCurrentUser) {
        return (
            <Link
                href={`/story/${firstStoryId}`}
                className="flex flex-col items-center gap-2 shrink-0 group"
                aria-label={t('userStory', { name: member.displayName })}
            >
                {ring}
                {label}
            </Link>
        );
    }

    return (
        <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="relative">
                <Link href={`/story/${firstStoryId}`} aria-label={t('yourStory')}>
                    {ring}
                </Link>
                <button
                    type="button"
                    onClick={openStoryCapture}
                    aria-label={t('addAnotherStory')}
                    className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-gradient-brand border-2 border-background flex items-center justify-center"
                >
                    <Plus className="w-3 h-3 text-white" strokeWidth={3} />
                </button>
            </div>
            {label}
        </div>
    );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors from `components/feed/StoryAvatar.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/feed/StoryAvatar.tsx
git commit -m "feat: add add-another-story badge to StoryAvatar"
```

---

## Task 7: "+" tab in `MobileTabBar`

**Files:**

- Modify: `components/layout/MobileTabBar.tsx`

- [ ] **Step 1: Replace the full contents to add the center compose menu**

Replace the full contents of `components/layout/MobileTabBar.tsx`:

```tsx
'use client';

import { Menu } from '@base-ui/react/menu';
import { Bell, Home, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { ComponentType } from 'react';

import { useComposer } from '@/providers/ComposerProvider';
import { cn } from '@/lib/utils';

const tabItems = [
    { href: '/profile', icon: Home, key: 'home' },
    { href: '/notifications', icon: Bell, key: 'alerts' },
];

interface TabLinkProps {
    href: string;
    icon: ComponentType<{ className?: string; strokeWidth?: number }>;
    label: string;
    active: boolean;
}

function TabLink({ href, icon: Icon, label, active }: TabLinkProps) {
    return (
        <Link
            href={href}
            className="flex flex-col items-center gap-0.5 px-3 py-1 min-w-12"
            aria-label={label}
            aria-current={active ? 'page' : undefined}
        >
            <Icon className={cn('w-5 h-5 transition-colors', active ? 'text-primary' : 'text-ink-faint')} strokeWidth={active ? 2.5 : 1.8} />
            <span className={cn('text-[10px] font-medium transition-colors', active ? 'text-primary' : 'text-ink-faint')}>{label}</span>
        </Link>
    );
}

export function MobileTabBar() {
    const t = useTranslations('MobileTabBar');
    const pathname = usePathname();
    const { openPostComposer, openStoryCapture } = useComposer();

    const [home, alerts] = tabItems;
    const homeActive = pathname === home.href || pathname.startsWith(home.href + '/');
    const alertsActive = pathname === alerts.href || pathname.startsWith(alerts.href + '/');

    return (
        <nav
            aria-label={t('mobileNavigation')}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 h-16 bg-white/90 border-t border-border rounded-t-2xl flex items-center justify-around z-40 lg:hidden px-5 w-9/10"
        >
            <TabLink href={home.href} icon={home.icon} label={t(`items.${home.key}`)} active={homeActive} />

            <Menu.Root>
                <Menu.Trigger
                    aria-label={t('compose')}
                    className="w-12 h-12 rounded-full bg-gradient-brand flex items-center justify-center shadow-md"
                >
                    <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
                </Menu.Trigger>
                <Menu.Portal>
                    <Menu.Positioner side="top" sideOffset={8} className="z-50">
                        <Menu.Popup className="bg-background rounded-2xl shadow-[0_2px_16px_0_rgba(36,31,26,0.15)] border border-border py-1 min-w-36 outline-none">
                            <Menu.Item
                                onClick={openPostComposer}
                                className="mx-1 rounded-lg px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-muted cursor-pointer outline-none"
                            >
                                {t('composeMenu.post')}
                            </Menu.Item>
                            <Menu.Item
                                onClick={openStoryCapture}
                                className="mx-1 rounded-lg px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-muted cursor-pointer outline-none"
                            >
                                {t('composeMenu.story')}
                            </Menu.Item>
                        </Menu.Popup>
                    </Menu.Positioner>
                </Menu.Portal>
            </Menu.Root>

            <TabLink href={alerts.href} icon={alerts.icon} label={t(`items.${alerts.key}`)} active={alertsActive} />
        </nav>
    );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors from `components/layout/MobileTabBar.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/layout/MobileTabBar.tsx
git commit -m "feat: add + compose menu to MobileTabBar"
```

---

## Task 8: `DesktopNavRail` — "New Post" calls the hook directly

**Files:**

- Modify: `components/layout/DesktopNavRail.tsx`

- [ ] **Step 1: Swap the `Link` for a `button` calling `openPostComposer`**

In `components/layout/DesktopNavRail.tsx`, change the import block:

```tsx
'use client';

import { Bell, Heart, Home, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import Avatar from '@/components/ui/avatar';
import { CURRENT_USER_ID, getUser } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
```

to:

```tsx
'use client';

import { Bell, Heart, Home, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import Avatar from '@/components/ui/avatar';
import { CURRENT_USER_ID, getUser } from '@/lib/mock-data';
import { useComposer } from '@/providers/ComposerProvider';
import { cn } from '@/lib/utils';
```

Add the hook call inside the component, changing:

```tsx
export function DesktopNavRail() {
    const t = useTranslations('DesktopNavRail');
    const pathname = usePathname();
    const user = getUser(CURRENT_USER_ID);
```

to:

```tsx
export function DesktopNavRail() {
    const t = useTranslations('DesktopNavRail');
    const pathname = usePathname();
    const user = getUser(CURRENT_USER_ID);
    const { openPostComposer } = useComposer();
```

Change the "New Post CTA" block:

```tsx
{
    /* New Post CTA */
}
<div className="px-4 pb-4">
    <Link
        href="/feed?compose=1"
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity"
    >
        <Plus className="w-4 h-4" strokeWidth={2.5} />
        {t('newPost')}
    </Link>
</div>;
```

to:

```tsx
{
    /* New Post CTA */
}
<div className="px-4 pb-4">
    <button
        type="button"
        onClick={openPostComposer}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity"
    >
        <Plus className="w-4 h-4" strokeWidth={2.5} />
        {t('newPost')}
    </button>
</div>;
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors from `components/layout/DesktopNavRail.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/layout/DesktopNavRail.tsx
git commit -m "refactor: DesktopNavRail New Post button opens the composer directly"
```

---

## Task 9: Drop the `?compose=1` relay from the feed pages

**Files:**

- Modify: `app/(app)/feed/[eventId]/page.tsx`
- Modify: `app/(app)/feed/page.tsx`

- [ ] **Step 1: Remove `shouldCompose`/`composerRef` handling and the now-propless `ComposerCard` call**

In `app/(app)/feed/[eventId]/page.tsx`, change:

```tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { use, useEffect, useMemo, useRef } from 'react';

import { Banner, ComposerCard, EventInfo, EventNotFound, Header, PostCard, PostModal, RsvpPrompt, StoriesRow } from '@/components/feed';
import { useEventPosts } from '@/hooks';
import { useEvent } from '@/hooks/useEvent';
import { ApiError } from '@/lib/api/client';
import { ModuleKeyConvention } from '@/lib/api/types';
import { useEventSwitcher } from '@/providers/EventProvider';

export default function FeedPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = use(params);
    const t = useTranslations('FeedPage');
    const router = useRouter();
    const searchParams = useSearchParams();
    const shouldCompose = searchParams.get('compose') === '1';
    const composerRef = useRef<HTMLDivElement>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    const { data: event, error } = useEvent(eventId);
    const { setActiveEventId } = useEventSwitcher();
    const { data: postPages, fetchNextPage, hasNextPage, isFetchingNextPage } = useEventPosts(eventId);
    const posts = useMemo(() => postPages?.pages.flatMap((page) => page.content) ?? [], [postPages?.pages]);

    // Auto-load the next page as the sentinel at the bottom of the list
    // scrolls into view.
    useEffect(() => {
        const sentinel = loadMoreRef.current;
        if (!sentinel || !hasNextPage) return;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) fetchNextPage();
        });
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasNextPage, fetchNextPage, posts.length]);

    // Deep links (a shared invite, browser history, a bookmark) should make
    // this the active event for the rest of the app too, not just this page —
    // but only once we know it actually exists.
    useEffect(() => {
        if (event) setActiveEventId(eventId);
    }, [event, eventId, setActiveEventId]);

    // ?compose=1 (from the nav rail's "New Post" CTA) scrolls to and expands
    // the composer, then strips itself so a refresh doesn't re-trigger it.
    useEffect(() => {
        if (!shouldCompose || !event) return;
        composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const params = new URLSearchParams(searchParams.toString());
        params.delete('compose');
        const query = params.toString();
        router.replace(query ? `/feed/${eventId}?${query}` : `/feed/${eventId}`);
    }, [shouldCompose, eventId, router, event, searchParams]);
```

to:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { use, useEffect, useMemo, useRef } from 'react';

import { Banner, ComposerCard, EventInfo, EventNotFound, Header, PostCard, PostModal, RsvpPrompt, StoriesRow } from '@/components/feed';
import { useEventPosts } from '@/hooks';
import { useEvent } from '@/hooks/useEvent';
import { ApiError } from '@/lib/api/client';
import { ModuleKeyConvention } from '@/lib/api/types';
import { useEventSwitcher } from '@/providers/EventProvider';

export default function FeedPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = use(params);
    const t = useTranslations('FeedPage');
    const loadMoreRef = useRef<HTMLDivElement>(null);

    const { data: event, error } = useEvent(eventId);
    const { setActiveEventId } = useEventSwitcher();
    const { data: postPages, fetchNextPage, hasNextPage, isFetchingNextPage } = useEventPosts(eventId);
    const posts = useMemo(() => postPages?.pages.flatMap((page) => page.content) ?? [], [postPages?.pages]);

    // Auto-load the next page as the sentinel at the bottom of the list
    // scrolls into view.
    useEffect(() => {
        const sentinel = loadMoreRef.current;
        if (!sentinel || !hasNextPage) return;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) fetchNextPage();
        });
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasNextPage, fetchNextPage, posts.length]);

    // Deep links (a shared invite, browser history, a bookmark) should make
    // this the active event for the rest of the app too, not just this page —
    // but only once we know it actually exists.
    useEffect(() => {
        if (event) setActiveEventId(eventId);
    }, [event, eventId, setActiveEventId]);
```

- [ ] **Step 2: Drop the now-propless `ComposerCard` wrapper div**

Change:

```tsx
{
    moduleFlags.posts && (
        <div className="flex flex-col gap-4 px-4 pb-24 lg:pb-10">
            <div ref={composerRef}>
                <ComposerCard eventId={eventId} autoExpand={shouldCompose} />
            </div>
            {posts.map((post) => (
                <PostCard key={post.id} post={post} />
            ))}
            <div ref={loadMoreRef} className="h-1" />
            {isFetchingNextPage && <p className="text-center text-sm text-ink-muted py-2">{t('loadingMore')}</p>}
        </div>
    );
}
```

to:

```tsx
{
    moduleFlags.posts && (
        <div className="flex flex-col gap-4 px-4 pb-24 lg:pb-10">
            <ComposerCard />
            {posts.map((post) => (
                <PostCard key={post.id} post={post} />
            ))}
            <div ref={loadMoreRef} className="h-1" />
            {isFetchingNextPage && <p className="text-center text-sm text-ink-muted py-2">{t('loadingMore')}</p>}
        </div>
    );
}
```

- [ ] **Step 3: Revert the bare `/feed` redirect to a plain redirect (drop query forwarding)**

Replace the full contents of `app/(app)/feed/page.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useEventSwitcher } from '@/providers/EventProvider';

// Bare /feed has no event id, so it can't render a feed itself — it exists
// only so links like the nav rail's "Home" tab and the post-login redirect
// don't need to know an event id up front. It forwards to whichever event is
// active (falling back to the user's first membership) as soon as that's
// known, then the real page lives at /feed/[eventId].
export default function FeedRedirectPage() {
    const router = useRouter();
    const { activeEvent, memberships, isLoading } = useEventSwitcher();

    useEffect(() => {
        if (isLoading) return;
        const eventId = activeEvent?.id ?? memberships[0]?.eventId;
        if (!eventId) {
            router.replace('/welcome');
            return;
        }
        router.replace(`/feed/${eventId}`);
    }, [isLoading, activeEvent, memberships, router]);

    return null;
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors from `app/(app)/feed/[eventId]/page.tsx` or `app/(app)/feed/page.tsx`.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/feed/[eventId]/page.tsx" "app/(app)/feed/page.tsx"
git commit -m "refactor: drop the ?compose=1 relay now that the composer is a global modal"
```

---

## Task 10: Full type-check, lint, and manual verification

**Files:** none (verification only)

- [ ] **Step 1: Full type-check**

Run: `npx tsc --noEmit`
Expected: no errors anywhere in the repo.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no new errors (pre-existing warnings elsewhere in the repo, if any, are not this task's concern).

- [ ] **Step 3: Manual verification — post composer**

Run: `npm run dev`, open a browser to an event's feed page.

- Click the collapsed `ComposerCard` placeholder at the top of the post list → the global modal opens with the caption box focused.
- Close it via the X, via Cancel, and via clicking the backdrop — each time it resets (no leftover caption/images if you reopen).
- From `/notifications` (a page with no `ComposerCard` mounted), open the desktop nav rail's "New Post" button (desktop viewport) → the same modal opens instantly, no navigation.
- Create a text-only post and a post with 2 images from the modal; confirm `POST /api/events/{eventId}/media/batch` (only when images attached) then `POST /api/posts` fire with the right payload, and the modal closes on success.

- [ ] **Step 4: Manual verification — story capture and tab bar**

Resize to a mobile viewport (or use device emulation) so `MobileTabBar` is visible.

- Tap the center "+" tab → a popup menu with "Post" and "Story" appears.
- Tap "Post" → the composer modal opens.
- Tap "Story" (with a webcam/camera available, or a device) → the hidden file input's camera capture triggers; after selecting/taking a photo, confirm `POST /api/events/{eventId}/media` then `POST /api/stories` fire, and you're navigated to `/story/{id}`.
- Back on the feed, in `StoriesRow`: if you have no story yet, tap "Your story" → same instant-camera behavior as above (no gallery/camera OS chooser).
- After you have a story, confirm the "Your story" slot now renders your avatar ring; tapping the ring opens the story viewer, and tapping the small "+" badge on the ring's corner triggers `openStoryCapture()` again (camera opens) without navigating to the viewer first.

- [ ] **Step 5: Confirm no remaining references to the removed query-string mechanism**

Run: `grep -rn "compose=1\|shouldCompose\|composerRef" app components`
Expected: no matches.

---

## Final Self-Check (for whoever executes this plan)

1. `useComposer()` is importable from `@/providers/ComposerProvider` and throws a clear error if called outside `ComposerProvider` (verify by temporarily rendering a component using it above `Providers` in a scratch page, then remove the scratch check — don't commit it).
2. The post composer works identically to the pre-refactor `ComposerCard` (same validation, same upload-then-create sequencing, same reset-on-close behavior) — only the container changed from an inline card to a modal.
3. Story creation behaves identically from all three entry points (tab bar "Story" menu item, `StoriesRow`'s "no story yet" button, `StoryAvatar`'s add-badge) since they all call the same `openStoryCapture()`.
4. `app/(app)/new-post` remains deleted (pre-existing from the earlier composer-card work) and nothing reintroduces it.
