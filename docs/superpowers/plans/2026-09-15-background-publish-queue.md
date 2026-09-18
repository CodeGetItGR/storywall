# Background Publish Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Note:** This project's `CLAUDE.md` forbids dispatching *parallel* subagents without explicit user permission. `subagent-driven-development` dispatches one subagent per task sequentially (not in parallel), which is compatible — but confirm with the user before choosing it if there's any doubt.

**Goal:** Make the post and story composers close immediately on submit and publish in the background, surfacing progress via small pending/error cards above the feed instead of blocking the composer modal open.

**Architecture:** A new `PublishQueueProvider` (nested inside `ComposerProvider`, so every existing mount point gets it for free) owns a `jobs` array and the upload/create mutation pipelines that today live inline in `useComposerController.submitPost` and `useStoryComposerController.submit`. Submitting now snapshots the payload, hands it to the queue, and resets/closes the composer synchronously — the queue runs the actual network work and updates job status independently. A new `PublishQueueCards` component (mounted between `ComposerCard` and the posts list in `FeedPageContent`) renders one card per job: pending spinner, brief success checkmark that auto-dismisses, or an error with Retry/Dismiss. This card also replaces the story composer's existing avatar-spinner/inline-error indicator in `StoriesRow`/`StoryAvatar`.

**Tech Stack:** Next.js App Router, React, TanStack Query (existing mutation hooks), next-intl, Vitest + Testing Library.

**Reference:** Design spec at `docs/superpowers/specs/2026-09-15-background-publish-queue-design.md`.

---

## File Structure

- Create `providers/publishQueue/PublishQueueContext.tsx` — types (`PublishJob`, `PostPublishPayload`, `StoryPublishPayload`) + context + `usePublishQueue()` hook.
- Create `hooks/usePublishQueueController.ts` — owns `jobs` state, the mutation hooks (`useCreatePost`, `useUploadMediaBatch`, `useCreateStoriesBatch`), and the `runPostJob`/`runStoryJob` pipelines (migrated from the composer hooks).
- Create `hooks/usePublishQueueController.test.ts` — unit tests for the controller.
- Create `providers/PublishQueueProvider.tsx` — thin provider wiring the controller into context.
- Create `components/feed/PublishQueueCard.tsx` — single job card UI.
- Create `components/feed/PublishQueueCards.tsx` — maps `jobs` to cards, mounted in `FeedPageContent`.
- Modify `providers/ComposerProvider.tsx` — nest `PublishQueueProvider`.
- Modify `hooks/useComposerController.ts` — `submitPost` becomes a snapshot-and-enqueue; drop `useCreatePost`/`useUploadMediaBatch`, `uploadPendingImages`, `getComposerErrorMessage`, `submitError`, `hasUnresolvedFailures`, `isPostBusy`, `handleRetryUploadClick`.
- Modify `components/composer/ComposerModal.tsx` — drop per-image uploading/failed/retry UI and the `submitError` banner (all now handled by the queue card).
- Modify `hooks/useStoryComposerController.ts` — `submit` becomes a snapshot-and-enqueue; drop `useUploadMediaBatch`/`useCreateStoriesBatch`, the inline pipeline, and `notice`.
- Modify `components/composer/StoryComposerModal.tsx` — drop the `notice` display.
- Modify `providers/composer/ComposerContext.tsx` — remove `isCreatingStory`/`storyError`.
- Modify `components/feed/StoriesRow.tsx` — remove the avatar-spinner placeholder and inline `storyError` text.
- Modify `components/feed/StoryAvatar.tsx` — remove `isCreatingStory`-driven spinner/disabled state.
- Modify `app/(app)/(event)/events/[eventId]/feed/FeedPageContent.tsx` — mount `PublishQueueCards`.
- Modify `messages/en.json` and `messages/el.json` — add a `PublishQueue` namespace.

---

### Task 1: Add `PublishQueue` translations

**Files:**
- Modify: `messages/en.json:350` (right after the `StoryComposer` block's closing `},`)
- Modify: `messages/el.json:350` (same location — both files are line-aligned)

- [ ] **Step 1: Insert the new namespace in `messages/en.json`**

Insert immediately after the `StoryComposer` block's closing `},` (currently line 350, right before `"EmailVerificationBanner": {`):

```json
    "PublishQueue": {
        "postingPost": "Posting…",
        "postingStory": "Posting {count, plural, one {your story} other {your stories}}…",
        "posted": "Posted",
        "storyPosted": "{count, plural, one {Story posted} other {Stories posted}}",
        "postFailed": "Couldn't post. Try again.",
        "storyPostFailed": "{failed} of {total} {total, plural, one {story} other {stories}} couldn't post.",
        "retry": "Retry",
        "dismiss": "Dismiss"
    },
```

- [ ] **Step 2: Insert the matching Greek namespace in `messages/el.json`**

Insert at the same location (line-aligned with `en.json`):

```json
    "PublishQueue": {
        "postingPost": "Δημοσίευση…",
        "postingStory": "Δημοσίευση {count, plural, one {της ιστορίας σου} other {των ιστοριών σου}}…",
        "posted": "Δημοσιεύτηκε",
        "storyPosted": "{count, plural, one {Η ιστορία δημοσιεύτηκε} other {Οι ιστορίες δημοσιεύτηκαν}}",
        "postFailed": "Η δημοσίευση απέτυχε. Δοκιμάστε ξανά.",
        "storyPostFailed": "{failed} από {total} {total, plural, one {ιστορία} other {ιστορίες}} απέτυχαν.",
        "retry": "Επανάληψη",
        "dismiss": "Απόρριψη"
    },
```

- [ ] **Step 3: Verify the JSON is still valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); JSON.parse(require('fs').readFileSync('messages/el.json','utf8')); console.log('ok')"`
Expected: `ok`

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/el.json
git commit -m "$(cat <<'EOF'
Add PublishQueue translation namespace

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Create `PublishQueueContext`

**Files:**
- Create: `providers/publishQueue/PublishQueueContext.tsx`

- [ ] **Step 1: Write the context file**

```tsx
'use client';

import { createContext, useContext } from 'react';

import type { PendingImage } from '@/hooks/useComposerController';
import type { PendingStory } from '@/hooks/useStoryComposerController';

export type PublishJobStatus = 'pending' | 'success' | 'error';

export interface PostPublishPayload {
    eventId: string;
    authorMemberId: string;
    caption: string;
    images: PendingImage[];
}

export interface StoryPublishPayload {
    eventId: string;
    authorMemberId: string;
    items: PendingStory[];
}

interface PublishJobCommon {
    id: string;
    status: PublishJobStatus;
    error?: string;
    createdAt: number;
}

export interface PostPublishJob extends PublishJobCommon {
    kind: 'post';
    payload: PostPublishPayload;
}

export interface StoryPublishJob extends PublishJobCommon {
    kind: 'story';
    payload: StoryPublishPayload;
    postedCount: number;
    totalCount: number;
}

export type PublishJob = PostPublishJob | StoryPublishJob;

export interface PublishQueueContextValue {
    jobs: PublishJob[];
    enqueuePost: (payload: PostPublishPayload) => void;
    enqueueStory: (payload: StoryPublishPayload) => void;
    retryJob: (jobId: string) => void;
    dismissJob: (jobId: string) => void;
}

export const PublishQueueContext = createContext<PublishQueueContextValue | null>(null);

export function usePublishQueue(): PublishQueueContextValue {
    const context = useContext(PublishQueueContext);
    if (!context) {
        throw new Error('usePublishQueue must be used within a PublishQueueProvider');
    }
    return context;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors (existing `PendingImage`/`PendingStory` exports are already public from their hook files, so this should resolve cleanly even though nothing consumes it yet).

- [ ] **Step 3: Commit**

```bash
git add providers/publishQueue/PublishQueueContext.tsx
git commit -m "$(cat <<'EOF'
Add PublishQueueContext types and hook

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Create `usePublishQueueController` — post job pipeline

**Files:**
- Create: `hooks/usePublishQueueController.ts`
- Test: `hooks/usePublishQueueController.test.ts`

This task migrates the post upload/create pipeline (today in `useComposerController.uploadPendingImages`/`submitPost`) into the queue controller, operating on a job's payload snapshot instead of component state.

- [ ] **Step 1: Write the failing test for a successful post job**

```ts
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePublishQueueController } from '@/hooks/usePublishQueueController';
import type { PendingImage } from '@/hooks/useComposerController';

const apiPost = vi.fn();
const apiPostForm = vi.fn();
vi.mock('@/lib/api/client', () => ({
    api: {
        post: (...a: unknown[]) => apiPost(...a),
        postForm: (...a: unknown[]) => apiPostForm(...a),
    },
    ApiError: class ApiError extends Error {},
}));

vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: undefined }) }));

function makeImage(overrides: Partial<PendingImage> = {}): PendingImage {
    return {
        key: 'img-1',
        file: new File(['x'], 'photo.jpg', { type: 'image/jpeg' }),
        previewUrl: 'blob:photo',
        status: 'pending',
        filterId: 'original',
        ...overrides,
    };
}

function wrapper({ children }: { children: React.ReactNode }) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return (
        <QueryClientProvider client={queryClient}>
            <NextIntlClientProvider locale="en" messages={{}}>
                {children}
            </NextIntlClientProvider>
        </QueryClientProvider>
    );
}

beforeEach(() => {
    apiPost.mockReset();
    apiPostForm.mockReset();
});

describe('usePublishQueueController — post jobs', () => {
    it('uploads images, creates the post, and marks the job successful', async () => {
        apiPostForm.mockResolvedValue({ created: [{ id: 'media-1', originalFilename: 'photo.jpg' }], failed: [] });
        apiPost.mockResolvedValue({ id: 'post-1', eventId: 'event-1' });

        const { result } = renderHook(() => usePublishQueueController(), { wrapper });

        act(() => {
            result.current.enqueuePost({
                eventId: 'event-1',
                authorMemberId: 'member-1',
                caption: 'Hello',
                images: [makeImage()],
            });
        });

        expect(result.current.jobs).toHaveLength(1);
        expect(result.current.jobs[0].status).toBe('pending');

        await waitFor(() => expect(result.current.jobs[0].status).toBe('success'));

        expect(apiPostForm).toHaveBeenCalledTimes(1);
        expect(apiPost).toHaveBeenCalledWith(
            expect.stringContaining('posts'),
            expect.objectContaining({ eventId: 'event-1', mediaIds: ['media-1'] })
        );
    });

    it('marks the job as error when the upload fails', async () => {
        apiPostForm.mockRejectedValue(new Error('network down'));

        const { result } = renderHook(() => usePublishQueueController(), { wrapper });

        act(() => {
            result.current.enqueuePost({
                eventId: 'event-1',
                authorMemberId: 'member-1',
                caption: '',
                images: [makeImage()],
            });
        });

        await waitFor(() => expect(result.current.jobs[0].status).toBe('error'));
        expect(apiPost).not.toHaveBeenCalled();
    });

    it('retry re-runs the failed job without re-uploading already-uploaded images', async () => {
        apiPostForm.mockResolvedValueOnce({ created: [], failed: [{ filename: 'photo.jpg', errorCode: 'STORAGE_UPLOAD_FAILED', message: 'nope' }] });
        apiPost.mockResolvedValue({ id: 'post-1', eventId: 'event-1' });

        const { result } = renderHook(() => usePublishQueueController(), { wrapper });

        act(() => {
            result.current.enqueuePost({
                eventId: 'event-1',
                authorMemberId: 'member-1',
                caption: 'Hello',
                images: [makeImage()],
            });
        });

        await waitFor(() => expect(result.current.jobs[0].status).toBe('error'));

        apiPostForm.mockResolvedValueOnce({ created: [{ id: 'media-1', originalFilename: 'photo.jpg' }], failed: [] });

        act(() => {
            result.current.retryJob(result.current.jobs[0].id);
        });

        await waitFor(() => expect(result.current.jobs[0].status).toBe('success'));
        expect(apiPostForm).toHaveBeenCalledTimes(2);
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run hooks/usePublishQueueController.test.ts`
Expected: FAIL — `Cannot find module '@/hooks/usePublishQueueController'`

- [ ] **Step 3: Write `hooks/usePublishQueueController.ts`**

```ts
'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import type { PendingImage } from '@/hooks/useComposerController';
import { useCreatePost, useUploadMediaBatch } from '@/hooks/usePosts';
import { useCreateStoriesBatch } from '@/hooks/useStories';
import type { PendingStory } from '@/hooks/useStoryComposerController';
import { ERROR_CODES, getErrorCode, getQuotaExceededDetails, isModuleNotAvailableError } from '@/lib/api/errors';
import { findNextPlan } from '@/lib/planTiers';
import { bakeStoryFilter, STORY_FILTER_PRESETS } from '@/lib/story/storyFilters';
import type {
    PostPublishJob,
    PostPublishPayload,
    PublishJob,
    PublishQueueContextValue,
    StoryPublishJob,
    StoryPublishPayload,
} from '@/providers/publishQueue/PublishQueueContext';

let jobCounter = 0;
function nextJobId(): string {
    jobCounter += 1;
    return `publish-${Date.now()}-${jobCounter}`;
}

export function usePublishQueueController(): PublishQueueContextValue {
    const tComposer = useTranslations('ComposerCard');
    const tStory = useTranslations('StoryComposer');
    const toErrorMessage = useApiErrorMessage();
    const { data: appConfig } = useAppConfig();
    const createPost = useCreatePost();
    const uploadBatch = useUploadMediaBatch();
    const createStories = useCreateStoriesBatch();

    const [jobs, setJobs] = useState<PublishJob[]>([]);
    const jobsRef = useRef<PublishJob[]>([]);
    jobsRef.current = jobs;

    function updateJob(jobId: string, updater: (job: PublishJob) => PublishJob) {
        setJobs((current) => current.map((job) => (job.id === jobId ? updater(job) : job)));
    }

    function getPostErrorMessage(error: unknown): string {
        if (getErrorCode(error) === ERROR_CODES.EVENT_STORAGE_LIMIT_EXCEEDED) {
            const details = getQuotaExceededDetails(error);
            const nextPlan = details ? findNextPlan(appConfig?.planTiers ?? [], 'EVENT', details.planCode) : undefined;
            return nextPlan ? tComposer('storageLimitExceededWithPlan', { plan: nextPlan.name }) : tComposer('storageLimitExceeded');
        }
        if (isModuleNotAvailableError(error)) return tComposer('moduleUnavailable');
        return toErrorMessage(error, tComposer('genericSubmitFailed'));
    }

    async function uploadPostImages(jobId: string, images: PendingImage[]): Promise<string[] | null> {
        const toUpload = images.filter((img) => img.status === 'pending' || img.status === 'failed');
        const alreadyUploaded = images.filter((img) => img.status === 'uploaded' && img.mediaId);
        if (toUpload.length === 0) return alreadyUploaded.map((img) => img.mediaId!);

        updateJob(jobId, (job) => ({
            ...(job as PostPublishJob),
            payload: {
                ...(job as PostPublishJob).payload,
                images: (job as PostPublishJob).payload.images.map((img) =>
                    toUpload.some((u) => u.key === img.key) ? { ...img, status: 'uploading' as const, error: undefined } : img
                ),
            },
        }));

        const job = jobsRef.current.find((candidate) => candidate.id === jobId) as PostPublishJob;
        const { eventId, authorMemberId } = job.payload;

        let result;
        try {
            const files = await Promise.all(
                toUpload.map(async (image) => {
                    if (image.file.type.startsWith('video/') || image.filterId === 'original') return image.file;
                    const preset = STORY_FILTER_PRESETS.find((candidate) => candidate.id === image.filterId);
                    return preset ? bakeStoryFilter(image.file, preset) : image.file;
                })
            );
            result = await uploadBatch.mutateAsync({ eventId, files, uploaderMemberId: authorMemberId });
        } catch (error) {
            updateJob(jobId, (current) => ({ ...current, status: 'error', error: getPostErrorMessage(error) }));
            return null;
        }

        const createdByName = new Map<string, typeof result.created>();
        result.created.forEach((m) => createdByName.set(m.originalFilename, [...(createdByName.get(m.originalFilename) ?? []), m]));
        const failedByName = new Map<string, string[]>();
        result.failed.forEach((f) => {
            const key = `uploadErrors.${f.errorCode}`;
            const message =
                f.errorCode === 'EVENT_STORAGE_LIMIT_EXCEEDED'
                    ? tComposer('storageLimitExceeded')
                    : tComposer.has(key)
                      ? tComposer(key, { filename: f.filename })
                      : tComposer('uploadFailed', { filename: f.filename });
            failedByName.set(f.filename, [...(failedByName.get(f.filename) ?? []), message]);
        });

        const newMediaIdByKey = new Map<string, string>();
        let hasFailure = false;
        let firstFailureMessage: string | undefined;
        for (const img of toUpload) {
            const failMsgs = failedByName.get(img.file.name);
            if (failMsgs && failMsgs.length > 0) {
                hasFailure = true;
                firstFailureMessage = firstFailureMessage ?? failMsgs[0];
                continue;
            }
            const created = createdByName.get(img.file.name)?.shift();
            if (created) newMediaIdByKey.set(img.key, created.id);
        }

        updateJob(jobId, (current) => {
            const postJob = current as PostPublishJob;
            return {
                ...postJob,
                payload: {
                    ...postJob.payload,
                    images: postJob.payload.images.map((img) =>
                        newMediaIdByKey.has(img.key) ? { ...img, status: 'uploaded' as const, mediaId: newMediaIdByKey.get(img.key) } : img
                    ),
                },
            };
        });

        if (hasFailure) {
            updateJob(jobId, (current) => ({ ...current, status: 'error', error: firstFailureMessage ?? tComposer('genericSubmitFailed') }));
            return null;
        }

        return [...alreadyUploaded.map((img) => img.mediaId!), ...toUpload.map((img) => newMediaIdByKey.get(img.key)).filter((id): id is string => Boolean(id))];
    }

    async function runPostJob(jobId: string, payload: PostPublishPayload) {
        const mediaIds = await uploadPostImages(jobId, payload.images);
        if (mediaIds === null) return;

        try {
            await createPost.mutateAsync({
                eventId: payload.eventId,
                authorMemberId: payload.authorMemberId,
                type: mediaIds.length > 0 ? 'MEDIA' : 'TEXT',
                content: payload.caption.trim() || undefined,
                isPinned: false,
                mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
            });
        } catch (error) {
            updateJob(jobId, (current) => ({ ...current, status: 'error', error: getPostErrorMessage(error) }));
            return;
        }

        updateJob(jobId, (current) => ({ ...current, status: 'success', error: undefined }));
    }

    const enqueuePost = useCallback((payload: PostPublishPayload) => {
        const job: PostPublishJob = { id: nextJobId(), kind: 'post', status: 'pending', createdAt: Date.now(), payload };
        setJobs((current) => [job, ...current]);
        void runPostJob(job.id, payload);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- runPostJob closes over mutation hooks that are stable across renders in practice
    }, []);

    async function runStoryJob(jobId: string, payload: StoryPublishPayload) {
        // Story pipeline implemented in Task 4.
        void jobId;
        void payload;
    }

    const enqueueStory = useCallback((payload: StoryPublishPayload) => {
        const job: StoryPublishJob = {
            id: nextJobId(),
            kind: 'story',
            status: 'pending',
            createdAt: Date.now(),
            payload,
            postedCount: 0,
            totalCount: payload.items.length,
        };
        setJobs((current) => [job, ...current]);
        void runStoryJob(job.id, payload);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const retryJob = useCallback((jobId: string) => {
        const job = jobsRef.current.find((candidate) => candidate.id === jobId);
        if (!job) return;
        updateJob(jobId, (current) => ({ ...current, status: 'pending', error: undefined }));
        if (job.kind === 'post') void runPostJob(jobId, (job as PostPublishJob).payload);
        else void runStoryJob(jobId, (job as StoryPublishJob).payload);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const dismissJob = useCallback((jobId: string) => {
        setJobs((current) => current.filter((job) => job.id !== jobId));
    }, []);

    return { jobs, enqueuePost, enqueueStory, retryJob, dismissJob };
}
```

Note: `runStoryJob` is a stub here — Task 4 fills it in and adds its own tests. `void tStory;` isn't needed since `tStory` will be used once Task 4 lands; if `npx tsc --noEmit` flags it as unused in the meantime, that's expected and resolved by Task 4 (this task's own tests only exercise post jobs, so it's fine to land as an intermediate step within the same PR/branch — don't commit this task in isolation if your workflow requires a green typecheck on every commit; otherwise fold Tasks 3 and 4 into one commit).

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run hooks/usePublishQueueController.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add hooks/usePublishQueueController.ts hooks/usePublishQueueController.test.ts
git commit -m "$(cat <<'EOF'
Add publish queue post-job pipeline

Migrates the post upload+create pipeline out of useComposerController
so it can keep running after the composer closes.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Add the story job pipeline to `usePublishQueueController`

**Files:**
- Modify: `hooks/usePublishQueueController.ts`
- Test: `hooks/usePublishQueueController.test.ts`

This migrates `useStoryComposerController.submit`'s pipeline (filter baking, batch upload, video-processing wait, batch create, partial-failure handling) into `runStoryJob`.

- [ ] **Step 1: Add failing tests for story jobs**

Append to `hooks/usePublishQueueController.test.ts`:

```ts
import { pollMediaUntilProcessed } from '@/hooks/useMedia';
import type { PendingStory } from '@/hooks/useStoryComposerController';

vi.mock('@/hooks/useMedia', async () => {
    const actual = await vi.importActual<typeof import('@/hooks/useMedia')>('@/hooks/useMedia');
    return { ...actual, pollMediaUntilProcessed: vi.fn() };
});

function makeStoryItem(overrides: Partial<PendingStory> = {}): PendingStory {
    return {
        key: 'story-1',
        file: new File(['x'], 'clip.jpg', { type: 'image/jpeg' }),
        previewUrl: 'blob:clip',
        caption: '',
        filterId: 'original',
        status: 'ready',
        ...overrides,
    };
}

describe('usePublishQueueController — story jobs', () => {
    it('uploads items and creates all stories', async () => {
        apiPostForm.mockResolvedValue({ created: [{ id: 'media-1', originalFilename: 'clip.jpg', mediaUrl: 'https://x/clip.jpg', status: 'READY' }], failed: [] });
        apiPost.mockResolvedValue({
            created: [{ id: 'story-1', eventId: 'event-1', mediaId: 'media-1' }],
            failed: [],
        });

        const { result } = renderHook(() => usePublishQueueController(), { wrapper });

        act(() => {
            result.current.enqueueStory({ eventId: 'event-1', authorMemberId: 'member-1', items: [makeStoryItem()] });
        });

        await waitFor(() => expect(result.current.jobs[0].status).toBe('success'));
        expect(apiPostForm).toHaveBeenCalledTimes(1);
        expect(apiPost).toHaveBeenCalledWith(expect.stringContaining('stories'), expect.any(Array));
    });

    it('keeps the job in error state with only the failed items on partial failure', async () => {
        apiPostForm.mockResolvedValue({
            created: [
                { id: 'media-1', originalFilename: 'clip.jpg', mediaUrl: 'https://x/clip.jpg', status: 'READY' },
                { id: 'media-2', originalFilename: 'clip2.jpg', mediaUrl: 'https://x/clip2.jpg', status: 'READY' },
            ],
            failed: [],
        });
        apiPost.mockResolvedValue({
            created: [{ id: 'story-1', eventId: 'event-1', mediaId: 'media-1' }],
            failed: [{ mediaId: 'media-2', message: 'nope' }],
        });

        const { result } = renderHook(() => usePublishQueueController(), { wrapper });

        act(() => {
            result.current.enqueueStory({
                eventId: 'event-1',
                authorMemberId: 'member-1',
                items: [makeStoryItem({ key: 'story-1', file: new File(['x'], 'clip.jpg', { type: 'image/jpeg' }) }), makeStoryItem({ key: 'story-2', file: new File(['x'], 'clip2.jpg', { type: 'image/jpeg' }) })],
            });
        });

        await waitFor(() => expect(result.current.jobs[0].status).toBe('error'));
        const job = result.current.jobs[0];
        if (job.kind !== 'story') throw new Error('expected story job');
        expect(job.postedCount).toBe(1);
        expect(job.totalCount).toBe(2);
        expect(job.payload.items).toHaveLength(1);
        expect(job.payload.items[0].key).toBe('story-2');
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run hooks/usePublishQueueController.test.ts`
Expected: FAIL — job stays `pending` forever (stub `runStoryJob` never settles it), tests time out.

- [ ] **Step 3: Implement `runStoryJob`**

Replace the stub in `hooks/usePublishQueueController.ts`:

```ts
    async function runStoryJob(jobId: string, payload: StoryPublishPayload) {
        let working: PendingStory[] = await Promise.all(
            payload.items.map(async (item) => {
                if (item.mediaId || item.filterId === 'original' || item.file.type.startsWith('video/')) {
                    return { ...item, status: item.mediaId ? item.status : ('uploading' as const), error: undefined };
                }
                const preset = STORY_FILTER_PRESETS.find((candidate) => candidate.id === item.filterId);
                const bakedFile = preset ? await bakeStoryFilter(item.file, preset) : item.file;
                return { ...item, file: bakedFile, status: 'uploading' as const, error: undefined };
            })
        );
        updateJob(jobId, (current) => ({ ...(current as StoryPublishJob), payload: { ...(current as StoryPublishJob).payload, items: working } }));

        const toUpload = working.filter((item) => !item.mediaId);
        if (toUpload.length > 0) {
            try {
                const result = await uploadBatch.mutateAsync({
                    eventId: payload.eventId,
                    files: toUpload.map((item) => item.file),
                    uploaderMemberId: payload.authorMemberId,
                    context: 'STORY',
                });
                working = mapBatchUploads(working, result);
            } catch (cause) {
                const message = toErrorMessage(cause, tStory('uploadFailed'));
                working = working.map((item) => (!item.mediaId ? { ...item, status: 'failed' as const, error: message } : item));
                updateJob(jobId, (current) => ({
                    ...current,
                    status: 'error',
                    error: message,
                    payload: { ...(current as StoryPublishJob).payload, items: working.filter((item) => item.status === 'failed') },
                }));
                return;
            }
            updateJob(jobId, (current) => ({ ...(current as StoryPublishJob), payload: { ...(current as StoryPublishJob).payload, items: working } }));
        }

        const processing = working.filter((item) => item.status === 'processing');
        if (processing.length > 0) {
            working = await waitForStoryVideos(working);
            working = working.map((item) => (item.status === 'failed' && item.error === undefined ? { ...item, error: tStory('processingFailed') } : item));
            updateJob(jobId, (current) => ({ ...(current as StoryPublishJob), payload: { ...(current as StoryPublishJob).payload, items: working } }));
        }

        const readyToPost = working.filter((item) => item.mediaId && item.status === 'uploaded');
        if (readyToPost.length === 0) {
            updateJob(jobId, (current) => ({ ...current, status: 'error', error: tStory('postFailed') }));
            return;
        }

        try {
            const result = await createStories.mutateAsync(
                readyToPost.map((item) => ({
                    eventId: payload.eventId,
                    authorMemberId: payload.authorMemberId,
                    mediaId: item.mediaId!,
                    caption: item.caption.trim() || undefined,
                }))
            );
            const failedByMediaId = new Map(result.failed.map((failure) => [failure.mediaId, failure.message]));
            const successfulMediaIds = new Set(result.created.map((story) => story.mediaId));
            const remaining = working
                .filter((item) => !item.mediaId || !successfulMediaIds.has(item.mediaId))
                .map((item) => {
                    const failure = item.mediaId ? failedByMediaId.get(item.mediaId) : undefined;
                    return failure ? { ...item, status: 'failed' as const, error: failure } : item;
                });

            if (remaining.length === 0) {
                updateJob(jobId, (current) => ({ ...current, status: 'success', error: undefined }));
                return;
            }

            updateJob(jobId, (current) => ({
                ...current,
                status: 'error',
                error: tStory('partialSuccess', { posted: result.created.length, failed: remaining.length }),
                postedCount: (current as StoryPublishJob).postedCount + result.created.length,
                payload: { ...(current as StoryPublishJob).payload, items: remaining },
            }));
        } catch (cause) {
            const message = toErrorMessage(cause, tStory('postFailed'));
            updateJob(jobId, (current) => ({
                ...current,
                status: 'error',
                error: message,
                payload: { ...(current as StoryPublishJob).payload, items: working.filter((item) => item.mediaId) },
            }));
        }
    }
```

Add the two helper functions above `usePublishQueueController` (migrated unchanged from `hooks/useStoryComposerController.ts`):

```ts
import type { MediaBatchUploadResponseDto, MediaResponseDto } from '@/lib/api/types';
import { pollMediaUntilProcessed } from '@/hooks/useMedia';

function mapBatchUploads(items: PendingStory[], result: MediaBatchUploadResponseDto): PendingStory[] {
    const createdByName = new Map<string, typeof result.created>();
    result.created.forEach((media) => createdByName.set(media.originalFilename, [...(createdByName.get(media.originalFilename) ?? []), media]));

    const failedByName = new Map<string, typeof result.failed>();
    result.failed.forEach((failure) => failedByName.set(failure.filename, [...(failedByName.get(failure.filename) ?? []), failure]));

    return items.map((item) => {
        if (item.mediaId) return item;
        const failure = failedByName.get(item.file.name)?.shift();
        if (failure) return { ...item, status: 'failed', error: failure.message };
        const media = createdByName.get(item.file.name)?.shift();
        if (!media) return item;
        return {
            ...item,
            mediaId: media.id,
            remoteUrl: media.mediaUrl,
            status: media.status === 'PROCESSING' ? 'processing' : 'uploaded',
            error: undefined,
        };
    });
}

async function waitForStoryVideos(items: PendingStory[]): Promise<PendingStory[]> {
    return Promise.all(
        items.map(async (item) => {
            if (!item.mediaId || !item.file.type.startsWith('video/') || item.status === 'failed') return item;
            const media: MediaResponseDto = await pollMediaUntilProcessed(item.mediaId);
            if (media.status === 'FAILED') return { ...item, status: 'failed' as const, error: undefined };
            return { ...item, status: 'uploaded' as const, remoteUrl: media.mediaUrl, error: undefined };
        })
    );
}
```

Also delete the now-unused `void jobId; void payload;` stub lines and the `void tStory;` note from Task 3.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run hooks/usePublishQueueController.test.ts`
Expected: PASS (5 tests total)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add hooks/usePublishQueueController.ts hooks/usePublishQueueController.test.ts
git commit -m "$(cat <<'EOF'
Add publish queue story-job pipeline

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Create `PublishQueueProvider` and nest it in `ComposerProvider`

**Files:**
- Create: `providers/PublishQueueProvider.tsx`
- Modify: `providers/ComposerProvider.tsx`

- [ ] **Step 1: Write `providers/PublishQueueProvider.tsx`**

```tsx
'use client';

import type { ReactNode } from 'react';

import { usePublishQueueController } from '@/hooks/usePublishQueueController';
import { PublishQueueContext, usePublishQueue } from '@/providers/publishQueue/PublishQueueContext';

export function PublishQueueProvider({ children }: { children: ReactNode }) {
    const controller = usePublishQueueController();
    return <PublishQueueContext.Provider value={controller}>{children}</PublishQueueContext.Provider>;
}

export { usePublishQueue };
```

- [ ] **Step 2: Nest it inside `providers/ComposerProvider.tsx`**

Replace the full file:

```tsx
'use client';

import type { ReactNode } from 'react';

import { ComposerModal } from '@/components/composer/ComposerModal';
import { PostMediaPreviewModal } from '@/components/composer/PostMediaPreviewModal';
import { StoryComposerModal } from '@/components/composer/StoryComposerModal';
import { useComposerController } from '@/hooks/useComposerController';
import { ComposerContext, useComposer } from '@/providers/composer/ComposerContext';
import { PublishQueueProvider } from '@/providers/PublishQueueProvider';

function ComposerProviderInner({ children }: { children: ReactNode }) {
    const controller = useComposerController();
    const { contextValue, storyComposer } = controller;

    return (
        <ComposerContext.Provider value={contextValue}>
            {children}
            <ComposerModal {...controller} />
            <PostMediaPreviewModal controller={controller} />
            <StoryComposerModal controller={storyComposer} />
        </ComposerContext.Provider>
    );
}

export function ComposerProvider({ children }: { children: ReactNode }) {
    return (
        <PublishQueueProvider>
            <ComposerProviderInner>{children}</ComposerProviderInner>
        </PublishQueueProvider>
    );
}

export { useComposer };
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (nothing calls `useComposerController`'s not-yet-updated body against `usePublishQueue` yet, so this is a pure passthrough at this point)

- [ ] **Step 4: Commit**

```bash
git add providers/PublishQueueProvider.tsx providers/ComposerProvider.tsx
git commit -m "$(cat <<'EOF'
Nest PublishQueueProvider inside ComposerProvider

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Refactor `useComposerController` to enqueue instead of uploading inline

**Files:**
- Modify: `hooks/useComposerController.ts`

- [ ] **Step 1: Remove the mutation hooks and pipeline that moved to the queue**

Remove these imports (now unused here):

```ts
import { useCreatePost, useUploadMediaBatch } from '@/hooks';
```

becomes:

```ts
import { usePublishQueue } from '@/providers/publishQueue/PublishQueueContext';
```

(check `hooks/index.ts` — if `useCreatePost`/`useUploadMediaBatch` are re-exported there and used by other files, leave the barrel export alone; only remove the import from this file.)

Also remove these now-unused imports: `ERROR_CODES`, `getErrorCode`, `getQuotaExceededDetails`, `isModuleNotAvailableError` (from `@/lib/api/errors`), `findNextPlan` (from `@/lib/planTiers`), `bakeStoryFilter` (from `@/lib/story/storyFilters` — keep `STORY_FILTER_PRESETS` only if still used elsewhere in the file; it's still used by `selectedImageForFilter`'s filter-preview rendering support in the modal, but not by this hook file directly — check with `npx tsc --noEmit` after and drop the import if unused).

- [ ] **Step 2: Delete `formatBytes`'s only-other-caller-free helper? No — keep `formatBytes`, still used by `requestTooLarge`.**

- [ ] **Step 3: Remove `uploadPendingImages` and `getComposerErrorMessage` entirely from this file** (both moved to `usePublishQueueController.ts` in Tasks 3-4).

- [ ] **Step 4: Remove `useCreatePost()`/`useUploadMediaBatch()` instantiation and `submitError` state**

Remove:

```ts
    const createPost = useCreatePost();
    const uploadBatch = useUploadMediaBatch();
```

```ts
    const [submitError, setSubmitError] = useState<string | null>(null);
```

Add instead:

```ts
    const publishQueue = usePublishQueue();
```

- [ ] **Step 5: Remove `hasUnresolvedFailures` and `isPostBusy`, simplify `canSubmit`**

Replace:

```ts
    const hasUnresolvedFailures = images.some((img) => img.status === 'failed');
    ...
    const isPostBusy = createPost.isPending || uploadBatch.isPending;
```

with nothing (delete both lines — images can no longer reach `'failed'` status inside the composer since nothing uploads before submit).

Replace:

```ts
    const canSubmit =
        (caption.trim().length > 0 || images.length > 0) &&
        caption.length <= maxCaptionLength &&
        !hasUnresolvedFailures &&
        !isPostBusy &&
        canComposePost;
```

with:

```ts
    const canSubmit = (caption.trim().length > 0 || images.length > 0) && caption.length <= maxCaptionLength && canComposePost;
```

- [ ] **Step 6: Simplify `closeComposer`** — remove the busy guard (submit now always closes synchronously, so nothing should ever block a manual close):

Replace:

```ts
    function closeComposer() {
        if (isPostBusy || isSongBusy) return;
```

with:

```ts
    function closeComposer() {
        if (isSongBusy) return;
```

(`isSongBusy` is untouched — the song composer keeps its current inline-submit behavior per the design.)

- [ ] **Step 7: Remove `handleRetryUploadClick`** (no longer meaningful — retries happen on the queue card, not per-image inside the composer):

Delete:

```ts
    function handleRetryUploadClick() {
        void uploadPendingImages();
    }
```

Remove it from the `ComposerController` interface and the returned object too.

- [ ] **Step 8: Rewrite `submitPost`**

Replace the whole function:

```ts
    function submitPost(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSubmit || !activeEvent || !activeMember) return;

        publishQueue.enqueuePost({
            eventId: activeEvent.id,
            authorMemberId: activeMember.id,
            caption,
            images,
        });

        closeComposer();
    }
```

It's no longer `async` — update the `ComposerController` interface's `submitPost` signature from `Promise<void>` to `void`, and update `ComposerModal.tsx`'s `onSubmit={submitPost}` usage if TypeScript complains (it won't — a `void`-returning handler is a valid `onSubmit`).

- [ ] **Step 9: Remove `submitError` from the interface, returned object, and `contextValue`/`closeComposer` reset**

Remove `setSubmitError(null)` calls from `closeComposer` and drop `submitError: string | null` from the `ComposerController` interface and the final returned object.

- [ ] **Step 10: Typecheck and run existing composer tests, if any**

Run: `npx tsc --noEmit`
Expected: errors will point at `ComposerModal.tsx` (Task 7 fixes those) and possibly unused-import warnings in this file — resolve unused imports now.

Run: `npx vitest run hooks/`
Expected: existing hook tests still pass (none currently cover `useComposerController` directly, based on the repo's current test files — if that's still true, this step is a no-op confirmation).

- [ ] **Step 11: Commit**

```bash
git add hooks/useComposerController.ts
git commit -m "$(cat <<'EOF'
Route post submission through the publish queue

submitPost now snapshots the composer's images/caption, hands them to
the publish queue, and closes immediately instead of waiting for the
upload+create request.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Simplify `ComposerModal.tsx`

**Files:**
- Modify: `components/composer/ComposerModal.tsx`

- [ ] **Step 1: Remove the props that no longer exist**

Remove `isPostBusy`, `submitError`, `handleRetryUploadClick` from the destructured props list (they were removed from `ComposerController` in Task 6).

- [ ] **Step 2: Remove the per-image uploading/failed overlay (images can no longer reach those statuses before submit)**

Replace (around what was lines 149-166 before edits):

```tsx
                                            {img.status === 'uploading' && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-ink/40 text-xs text-white">
                                                    {t('uploading')}
                                                </div>
                                            )}
                                            {img.status === 'failed' && (
                                                <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-1 bg-destructive/90 px-1.5 py-1 text-[10px] text-white">
                                                    <span className="truncate">{img.error ?? t('uploadFailed', { filename: img.file.name })}</span>
                                                    <button
                                                        type="button"
                                                        onClick={handleRetryUploadClick}
                                                        disabled={isPostBusy}
                                                        className="shrink-0 underline disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                        {t('retry')}
                                                    </button>
                                                </div>
                                            )}
```

with nothing (delete the block).

- [ ] **Step 3: Simplify the remove-image button's disabled condition**

Replace:

```tsx
                                                disabled={img.status === 'uploading'}
```

with nothing (remove the `disabled` attribute entirely — images in the composer are always removable now).

- [ ] **Step 4: Drop `submitError` from the error line**

Replace:

```tsx
                        {(sizeError || countError || submitError) && (
                            <p className="text-xs text-destructive">{sizeError ?? countError ?? submitError}</p>
                        )}
```

with:

```tsx
                        {(sizeError || countError) && <p className="text-xs text-destructive">{sizeError ?? countError}</p>}
```

- [ ] **Step 5: Simplify the submit button — it's never "busy" anymore, submitting closes the modal on the same tick**

Replace:

```tsx
                            <button
                                type="submit"
                                disabled={!canSubmit}
                                className="flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-full bg-gradient-brand px-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4"
                            >
                                <Send className="h-4 w-4" />
                                {isPostBusy ? t('posting') : t('post')}
                            </button>
```

with:

```tsx
                            <button
                                type="submit"
                                disabled={!canSubmit}
                                className="flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-full bg-gradient-brand px-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4"
                            >
                                <Send className="h-4 w-4" />
                                {t('post')}
                            </button>
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add components/composer/ComposerModal.tsx
git commit -m "$(cat <<'EOF'
Simplify ComposerModal now that submit closes synchronously

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Refactor `useStoryComposerController` to enqueue instead of submitting inline

**Files:**
- Modify: `hooks/useStoryComposerController.ts`

- [ ] **Step 1: Remove the mutation hooks and helpers that moved to the queue**

Remove:

```ts
    const uploadBatch = useUploadMediaBatch();
    ...
    const createStories = useCreateStoriesBatch();
```

Remove the `mapBatchUploads` and `waitForStoryVideos` module-level functions (moved to `usePublishQueueController.ts` in Task 4).

Remove the now-unused imports `useCreateStoriesBatch` (from `@/hooks/useStories`), `useUploadMediaBatch` (keep `useUploadMedia`, `useDeleteMedia`, `pollMediaUntilProcessed` — still used by the eager video upload and modal-close cleanup), `bakeStoryFilter`, `STORY_FILTER_PRESETS` (check: `STORY_FILTER_PRESETS` is still used by `filterPresetIds: STORY_FILTER_PRESETS.map(...)` in the returned object — keep that import), `MediaBatchUploadResponseDto` type import (drop if `mapBatchUploads` is gone and nothing else uses the type).

Add:

```ts
import { usePublishQueue } from '@/providers/publishQueue/PublishQueueContext';
```

- [ ] **Step 2: Instantiate the queue and remove `notice` state**

Add near the other hooks:

```ts
    const publishQueue = usePublishQueue();
```

Remove:

```ts
    const [notice, setNotice] = useState<string | null>(null);
```

and all `setNotice(...)` calls (in `reset`, `open`, and inside `submit`).

Remove `notice: string | null` from the `StoryComposerController` interface and the returned object.

- [ ] **Step 3: Narrow `isBusy`**

Replace:

```ts
    const isBusy = uploadSingle.isPending || uploadBatch.isPending || createStories.isPending;
```

with:

```ts
    const isBusy = uploadSingle.isPending;
```

- [ ] **Step 4: Rewrite `submit`**

Replace the whole function:

```ts
    function submit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!activeEvent || !activeMember || items.length === 0 || isBusy) return;

        publishQueue.enqueueStory({
            eventId: activeEvent.id,
            authorMemberId: activeMember.id,
            items,
        });

        reset();
        setIsOpen(false);
    }
```

It's no longer `async` — update the `StoryComposerController` interface's `submit` signature from `Promise<void>` to `void`.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors will point at `StoryComposerModal.tsx` (Task 9 fixes those).

- [ ] **Step 6: Commit**

```bash
git add hooks/useStoryComposerController.ts
git commit -m "$(cat <<'EOF'
Route story submission through the publish queue

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Simplify `StoryComposerModal.tsx`

**Files:**
- Modify: `components/composer/StoryComposerModal.tsx`

- [ ] **Step 1: Remove `notice` from the destructured props**

Remove `notice` from the `controller` destructure list.

- [ ] **Step 2: Drop it from the error/notice display**

Replace:

```tsx
                                    {(activeItem.error || error || notice) && (
                                        <p
                                            className={cn(
                                                'rounded-md bg-black/55 px-3 py-2 text-xs backdrop-blur-md',
                                                activeItem.error || error ? 'text-red-200' : 'text-white/75'
                                            )}
                                        >
                                            {activeItem.error ?? error ?? notice}
                                        </p>
                                    )}
```

with:

```tsx
                                    {(activeItem.error || error) && (
                                        <p className="rounded-md bg-black/55 px-3 py-2 text-xs text-red-200 backdrop-blur-md">
                                            {activeItem.error ?? error}
                                        </p>
                                    )}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add components/composer/StoryComposerModal.tsx
git commit -m "$(cat <<'EOF'
Drop the now-unused notice display from StoryComposerModal

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Remove the avatar-spinner story indicator

**Files:**
- Modify: `providers/composer/ComposerContext.tsx`
- Modify: `hooks/useComposerController.ts`
- Modify: `components/feed/StoriesRow.tsx`
- Modify: `components/feed/StoryAvatar.tsx`

- [ ] **Step 1: Remove `isCreatingStory`/`storyError` from the context interface**

In `providers/composer/ComposerContext.tsx`, remove:

```ts
    isCreatingStory: boolean;
    storyError: string | null;
```

from `ComposerContextValue`.

- [ ] **Step 2: Remove them from `useComposerController`'s `contextValue` and returned object**

In `hooks/useComposerController.ts`, remove `isCreatingStory: storyComposer.isBusy,` and `storyError: storyComposer.error,` from the `contextValue` `useMemo` (and its dependency array entries `storyComposer.isBusy`, `storyComposer.error`), and remove the top-level `storyError: storyComposer.error,` from the hook's returned object (keep `storyComposer` itself — `StoryComposerModal` still needs `storyComposer.error` via `controller.error`, which is unaffected — this only removes the *duplicate* exposure through `ComposerContext`).

- [ ] **Step 3: Remove the avatar-spinner placeholder and inline error in `StoriesRow.tsx`**

Replace:

```tsx
    const { openStoryCapture, isCreatingStory, storyError, canComposeStory } = useComposer();
```

with:

```tsx
    const { openStoryCapture, canComposeStory } = useComposer();
```

Replace:

```tsx
                    <button
                        type="button"
                        onClick={openStoryCapture}
                        disabled={!activeMember || isCreatingStory}
                        aria-label={tAvatar('addYourStory')}
                        className="relative w-15.5 h-15.5 flex items-center justify-center disabled:opacity-60"
                    >
                        <Avatar
                            src={memberAvatarUrl(activeMember?.id, activeMember?.avatarUrl)}
                            initials={initialsFromName(activeMember?.displayName ?? '?')}
                            color={avatarColorFromId(activeMember?.id ?? 'current-member')}
                            size="xl"
                            alt={activeMember?.displayName}
                        />
                        <span className="absolute right-0 bottom-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-primary text-white">
                            <Plus className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                        </span>
                        {isCreatingStory && (
                            <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/35">
                                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                            </span>
                        )}
                    </button>
```

with:

```tsx
                    <button
                        type="button"
                        onClick={openStoryCapture}
                        disabled={!activeMember}
                        aria-label={tAvatar('addYourStory')}
                        className="relative w-15.5 h-15.5 flex items-center justify-center disabled:opacity-60"
                    >
                        <Avatar
                            src={memberAvatarUrl(activeMember?.id, activeMember?.avatarUrl)}
                            initials={initialsFromName(activeMember?.displayName ?? '?')}
                            color={avatarColorFromId(activeMember?.id ?? 'current-member')}
                            size="xl"
                            alt={activeMember?.displayName}
                        />
                        <span className="absolute right-0 bottom-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-primary text-white">
                            <Plus className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                        </span>
                    </button>
```

Replace:

```tsx
            {hasStartItems && (
                <>
                    {storyError && (
                        <p role="alert" className="text-xs text-destructive shrink-0 self-center max-w-32">
                            {storyError}
                        </p>
                    )}

                    <div className="w-px h-14 bg-border self-center shrink-0" aria-hidden="true" />
                </>
            )}
```

with:

```tsx
            {hasStartItems && <div className="w-px h-14 bg-border self-center shrink-0" aria-hidden="true" />}
```

- [ ] **Step 4: Remove `isCreatingStory` usage in `StoryAvatar.tsx`**

Replace:

```tsx
    const { openStoryCapture, canComposeStory, isCreatingStory } = useComposer();
```

with:

```tsx
    const { openStoryCapture, canComposeStory } = useComposer();
```

Replace:

```tsx
                    <button
                        type="button"
                        onClick={handleOpenStory}
                        disabled={isCreatingStory}
                        aria-label={t('yourStory')}
                        className="disabled:opacity-70"
                    >
                        {ring}
                        {isCreatingStory && (
                            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/35">
                                <LoaderCircle className="h-5 w-5 animate-spin text-white" aria-hidden="true" />
                            </span>
                        )}
                    </button>
                    {canComposeStory && (
                        <button
                            type="button"
                            onClick={handleOpenComposeStory}
                            disabled={isCreatingStory}
                            aria-label={t('addAnotherStory')}
                            className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-gradient-brand"
                        >
                            {isCreatingStory ? (
                                <LoaderCircle className="h-3 w-3 animate-spin text-white" aria-hidden="true" />
                            ) : (
                                <Plus className="h-3 w-3 text-white" strokeWidth={3} />
                            )}
                        </button>
                    )}
```

with:

```tsx
                    <button type="button" onClick={handleOpenStory} aria-label={t('yourStory')}>
                        {ring}
                    </button>
                    {canComposeStory && (
                        <button
                            type="button"
                            onClick={handleOpenComposeStory}
                            aria-label={t('addAnotherStory')}
                            className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-gradient-brand"
                        >
                            <Plus className="h-3 w-3 text-white" strokeWidth={3} />
                        </button>
                    )}
```

Remove the now-unused `LoaderCircle` import from `lucide-react` in this file (check `npx tsc --noEmit`/lint for confirmation it's fully unused).

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint components/feed/StoriesRow.tsx components/feed/StoryAvatar.tsx hooks/useComposerController.ts providers/composer/ComposerContext.tsx`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add providers/composer/ComposerContext.tsx hooks/useComposerController.ts components/feed/StoriesRow.tsx components/feed/StoryAvatar.tsx
git commit -m "$(cat <<'EOF'
Remove the avatar-spinner story indicator

Replaced by the shared PublishQueueCard above the feed.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Build `PublishQueueCard` and `PublishQueueCards`

**Files:**
- Create: `components/feed/PublishQueueCard.tsx`
- Create: `components/feed/PublishQueueCards.tsx`

- [ ] **Step 1: Write `PublishQueueCard.tsx`**

```tsx
'use client';

import { Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import type { PublishJob } from '@/providers/publishQueue/PublishQueueContext';

const SUCCESS_DISMISS_DELAY_MS = 1500;

interface PublishQueueCardProps {
    job: PublishJob;
    onRetry: (jobId: string) => void;
    onDismiss: (jobId: string) => void;
}

export function PublishQueueCard({ job, onRetry, onDismiss }: PublishQueueCardProps) {
    const t = useTranslations('PublishQueue');

    useEffect(() => {
        if (job.status !== 'success') return;
        const timeout = setTimeout(() => onDismiss(job.id), SUCCESS_DISMISS_DELAY_MS);
        return () => clearTimeout(timeout);
    }, [job.id, job.status, onDismiss]);

    const pendingLabel = job.kind === 'post' ? t('postingPost') : t('postingStory', { count: job.totalCount });
    const successLabel = job.kind === 'post' ? t('posted') : t('storyPosted', { count: job.postedCount || job.totalCount });
    const errorLabel =
        job.kind === 'post' ? (job.error ?? t('postFailed')) : t('storyPostFailed', { failed: job.payload.items.length, total: job.totalCount });

    return (
        <article className="mx-2 mb-2 flex items-center gap-3 rounded-xl border border-border bg-card/95 px-4 py-3 text-sm">
            {job.status === 'pending' && (
                <>
                    <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary/30 border-t-primary" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-ink">{pendingLabel}</span>
                </>
            )}
            {job.status === 'success' && (
                <>
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-white" aria-hidden="true">
                        <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-ink">{successLabel}</span>
                </>
            )}
            {job.status === 'error' && (
                <>
                    <span className="min-w-0 flex-1 truncate text-destructive">{errorLabel}</span>
                    <button type="button" onClick={() => onRetry(job.id)} className="shrink-0 text-sm font-semibold text-primary underline">
                        {t('retry')}
                    </button>
                    <button
                        type="button"
                        onClick={() => onDismiss(job.id)}
                        aria-label={t('dismiss')}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-faint hover:text-ink"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </>
            )}
        </article>
    );
}
```

- [ ] **Step 2: Write `PublishQueueCards.tsx`**

```tsx
'use client';

import { PublishQueueCard } from '@/components/feed/PublishQueueCard';
import { usePublishQueue } from '@/providers/publishQueue/PublishQueueContext';

export function PublishQueueCards() {
    const { jobs, retryJob, dismissJob } = usePublishQueue();

    if (jobs.length === 0) return null;

    return (
        <div className="flex flex-col">
            {jobs.map((job) => (
                <PublishQueueCard key={job.id} job={job} onRetry={retryJob} onDismiss={dismissJob} />
            ))}
        </div>
    );
}
```

(`jobs` is already newest-first because `enqueuePost`/`enqueueStory` prepend with `[job, ...current]`.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add components/feed/PublishQueueCard.tsx components/feed/PublishQueueCards.tsx
git commit -m "$(cat <<'EOF'
Add PublishQueueCard/PublishQueueCards UI

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Mount `PublishQueueCards` in the feed

**Files:**
- Modify: `app/(app)/(event)/events/[eventId]/feed/FeedPageContent.tsx`

- [ ] **Step 1: Import and render it between `ComposerCard` and the posts list**

Add the import:

```tsx
import { PublishQueueCards } from '@/components/feed/PublishQueueCards';
```

Replace:

```tsx
                    <div className="flex flex-col px-0 pb-24 lg:pb-10">
                        <ComposerCard />
                        <div className="flex flex-col">
```

with:

```tsx
                    <div className="flex flex-col px-0 pb-24 lg:pb-10">
                        <ComposerCard />
                        <PublishQueueCards />
                        <div className="flex flex-col">
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/(event)/events/[eventId]/feed/FeedPageContent.tsx"
git commit -m "$(cat <<'EOF'
Mount PublishQueueCards above the feed

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: all tests pass, including the new `hooks/usePublishQueueController.test.ts`

- [ ] **Step 2: Typecheck and lint the whole project**

Run: `npx tsc --noEmit && npx eslint .`
Expected: no errors

- [ ] **Step 3: Manual browser verification — post composer**

Start the dev server, sign in to an event with the posts module enabled, open the post composer, add a caption and an image, and submit. Confirm:
- The composer closes immediately (no spinner inside it).
- A pending card with a spinner appears above the feed, right under the composer bar.
- After a moment, the card briefly shows a checkmark, then disappears, and the real post appears at the top of the feed.

- [ ] **Step 4: Manual browser verification — story composer**

Open the story composer, add a photo, and submit. Confirm the same close-immediately + pending card + success fade behavior, and that the stories row's own avatar no longer shows a spinner overlay.

- [ ] **Step 5: Manual browser verification — failure + retry**

Force a failure (e.g. temporarily throttle/block the network in devtools, or submit while offline) and confirm the card shows an error with Retry/Dismiss, that Retry re-attempts and can succeed once the network is restored, and that Dismiss removes the card.

- [ ] **Step 6: Manual browser verification — stacked jobs**

Submit a post, and before it settles, open the composer again and submit a second post. Confirm both pending cards stack above the feed, most recent on top.

- [ ] **Step 7: Confirm no stray references remain**

Run: `grep -rn "isCreatingStory\|storyError" --include="*.tsx" --include="*.ts" .`
Expected: no matches outside of `hooks/useStoryModal.ts` (its `storyError` is an unrelated local variable from a different query, not the removed context field — confirm by inspection, not a name match).

---

## Self-Review Notes

- **Spec coverage:** post + story scope (Tasks 6, 8), song composer untouched (no task touches `AddSongForm`/`submitPlaylistSuggestion`), optimistic close (Tasks 6/8 Step 8/4), stacked concurrent jobs (job list is an array, Task 3), retry reusing uploaded media (Task 3 Step 3 test + `uploadPostImages`/`runStoryJob` skip items with `mediaId`), app-session persistence (`PublishQueueProvider` nested in the root-mounted `ComposerProvider`, Task 5), shared card for both kinds (Task 11), avatar-spinner removal (Task 10), localization (Task 1).
- **Type consistency:** `PublishJob`/`PostPublishJob`/`StoryPublishJob`/`PostPublishPayload`/`StoryPublishPayload` are defined once in `PublishQueueContext.tsx` (Task 2) and referenced identically by name in every later task — no renamed duplicates.
- **No placeholders:** every step has literal code; the one intentional stub (`runStoryJob` in Task 3) is explicitly filled in by name in Task 4, not left open-ended.
