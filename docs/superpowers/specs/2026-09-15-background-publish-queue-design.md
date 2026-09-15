# Background publish queue (post & story) — design

## Problem

Today, submitting a post or a story keeps the composer modal open for the full duration of the upload + create request. The user is stuck looking at a busy composer with no real feedback until it succeeds or fails. FB/Instagram instead close the composer immediately and show a small pending indicator above the feed while publishing continues in the background.

## Scope

- Applies to the **post composer** and the **story composer**.
- Does **not** apply to the song/playlist composer (its submit is a lightweight suggestion request with no media upload; it keeps its current inline behavior).
- The composer closes immediately on submit (optimistic), before the server has confirmed anything.
- Users can open and submit a new post/story composer while a previous publish is still pending — jobs stack.
- On failure, Retry re-runs the same publish in place using the already-captured data (no reopening the composer), reusing any media that already finished uploading.
- Pending/error state persists across in-app navigation (not a full page reload), because it lives in a provider mounted at the app root — same lifetime as the existing `ComposerProvider`.
- Both post and story publishes render through the **same** small card UI above the feed. This replaces the story composer's existing avatar-spinner + inline-error affordance in `StoriesRow`.

## Architecture

A new `PublishQueueProvider` owns a list of background publish jobs and is nested inside `ComposerProvider` (so every place that mounts `ComposerProvider` today — the real app root in `providers/Providers.tsx` and demo mode in `app/demo/layout.tsx` — gets it automatically, no extra wiring).

```
ComposerProvider
└── PublishQueueProvider   (new)
    └── ComposerProvider's existing controller + modals
```

### New files

- `providers/publishQueue/PublishQueueContext.tsx` — context + `usePublishQueue()` hook, mirroring the existing `providers/composer/ComposerContext.tsx` pattern.
- `hooks/usePublishQueueController.ts` — the controller: owns `jobs` state, the mutation hooks that actually perform uploads/creates (`useCreatePost`, `useUploadMediaBatch`, `useCreateStoriesBatch`, and whatever `useDeleteMedia` cleanup story jobs still need), and the run/retry pipelines.
- `providers/PublishQueueProvider.tsx` — thin provider component wiring the controller into context, following the same shape as `providers/ComposerProvider.tsx`.
- `components/feed/PublishQueueCard.tsx` — single job card (pending / success / error visual states).
- `components/feed/PublishQueueCards.tsx` — maps `jobs` to `PublishQueueCard`s, newest first.

### Data model

```ts
type PublishJobStatus = 'pending' | 'success' | 'error';

interface PublishJobBase {
    id: string;
    status: PublishJobStatus;
    error?: string;
    createdAt: number;
}

interface PostPublishJob extends PublishJobBase {
    kind: 'post';
    payload: {
        eventId: string;
        authorMemberId: string;
        caption: string;
        images: PendingImage[]; // same shape as today's PendingImage, carries mediaId once uploaded
    };
    thumbnailUrl?: string;
}

interface StoryPublishJob extends PublishJobBase {
    kind: 'story';
    payload: {
        eventId: string;
        authorMemberId: string;
        items: PendingStory[]; // same shape as today's PendingStory
    };
    postedCount: number; // for partial-failure messaging ("2 of 3 stories couldn't post")
    totalCount: number;
}

type PublishJob = PostPublishJob | StoryPublishJob;
```

### Pipeline migration

The upload/create pipelines that exist today inside `useComposerController.uploadPendingImages`/`submitPost` and `useStoryComposerController.submit` move into `usePublishQueueController` essentially unchanged — same batch-upload call, same per-image filter baking, same video-processing wait (`waitForStoryVideos`), same partial-failure bookkeeping — except they operate on a job's `payload` snapshot (via `setJobs` updater keyed by job id) instead of the composer's live `images`/`items` state.

`submitPost` and `storyComposer.submit` in the existing controllers shrink to:

1. Build the payload snapshot from current local state.
2. Call `publishQueue.enqueuePost(payload)` / `publishQueue.enqueueStory(payload)`.
3. Immediately reset local composer state and close the modal (no `await`, no busy-gating on close).

`useComposerController` and `useStoryComposerController` drop their direct use of `useCreatePost`, `useUploadMediaBatch`, and `useCreateStoriesBatch` — those move to the queue controller. The story controller's **eager background video upload** (kicked off while the modal is still open, before submit) is untouched; it's pre-existing behavior and out of scope here.

### Retry

`retryJob(jobId)` re-runs the pipeline against the job's current payload, skipping any images/items that already carry a `mediaId` (they're not re-uploaded), matching the existing "toUpload = images that are pending or failed" logic.

## UI

`PublishQueueCards` renders in `FeedPageContent`, between `ComposerCard` and the posts list — the same visual slot for both post and story jobs.

- **Pending:** spinner + short label ("Posting…" / "Posting your story…").
- **Success:** brief checkmark state, then the card auto-dismisses (`dismissJob`) after ~1.5s. The feed itself updates independently via the existing `useCreatePost`/`useCreateStoriesBatch` query-invalidation on success — the card doesn't need to manually sync anything into the feed list.
- **Error:** short error message (reusing the existing `getComposerErrorMessage`-style mapping, relocated to the queue controller) + Retry + Dismiss buttons.
- Multiple jobs stack, most recent on top.

`StoriesRow`'s current `isCreatingStory` spinner overlay and adjacent `storyError` text are removed — replaced by the shared card.

## Error handling

- Upload/create failures set the job to `status: 'error'` with a message, same error-mapping rules as today (storage limit exceeded, module unavailable, generic).
- Partial story batch failures (some stories post, some don't) keep the job in `error` state showing only the failed subset for retry, mirroring today's `notice`/`partialSuccess` handling — successfully-created stories are not retried.
- A job that errors does not block other jobs or new composer submissions.

## Testing

- Unit-level: `usePublishQueueController` — enqueue → success (job removed after auto-dismiss delay, or exposed for the card to time), enqueue → failure → retry → success, partial story batch failure → retry only failed items.
- Component-level: `PublishQueueCard` renders each status correctly; `PublishQueueCards` stacks multiple jobs in order.
- Manual/browser verification: submit a post with images, confirm composer closes immediately and a pending card appears above the feed, then fades on success as the real post appears; force a failure (e.g. oversized/invalid) and confirm Retry works; repeat for stories; submit a second post while the first is still pending and confirm both cards stack.

## Localization

New copy (pending/success/error labels, retry/dismiss buttons, partial-failure messaging) goes under a `PublishQueue` namespace in `messages/en.json` and `messages/el.json`.
