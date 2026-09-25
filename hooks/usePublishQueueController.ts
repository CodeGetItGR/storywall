'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { pollMediaUntilProcessed, useUploadMediaBatch } from '@/hooks/useMedia';
import { useCreatePlaylistSuggestion } from '@/hooks/usePlaylist';
import { useCreatePost } from '@/hooks/usePosts';
import { useCreateStoriesBatch } from '@/hooks/useStories';
import type { PendingStory } from '@/hooks/useStoryComposerController';
import { ERROR_CODES, getErrorCode, getQuotaExceededDetails, isModuleNotAvailableError } from '@/lib/api/errors';
import type { MediaBatchUploadResponseDto, MediaResponseDto } from '@/lib/api/types';
import { findNextPlan } from '@/lib/planTiers';
import { bakeStoryFilter, STORY_FILTER_PRESETS } from '@/lib/story/storyFilters';
import type {
    PostPublishJob,
    PostPublishPayload,
    PublishJob,
    PublishQueueContextValue,
    SongPublishJob,
    SongPublishPayload,
    StoryPublishJob,
    StoryPublishPayload,
} from '@/providers/publishQueue/PublishQueueContext';

let jobCounter = 0;
function nextJobId(): string {
    jobCounter += 1;
    return `publish-${Date.now()}-${jobCounter}`;
}

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
        }),
    );
}

export function usePublishQueueController(): PublishQueueContextValue {
    const tComposer = useTranslations('ComposerCard');
    const tStory = useTranslations('StoryComposer');
    const tPlaylist = useTranslations('PlaylistPage');
    const toErrorMessage = useApiErrorMessage();
    const { data: appConfig } = useAppConfig();
    const createPost = useCreatePost();
    const uploadBatch = useUploadMediaBatch();
    const createStories = useCreateStoriesBatch();
    const createPlaylistSuggestion = useCreatePlaylistSuggestion();

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

    async function uploadPostImages(jobId: string, payload: PostPublishPayload): Promise<string[] | null> {
        const { eventId, images } = payload;
        const toUpload = images.filter((img) => img.status === 'pending' || img.status === 'failed');
        const alreadyUploaded = images.filter((img) => img.status === 'uploaded' && img.mediaId);
        if (toUpload.length === 0) return alreadyUploaded.map((img) => img.mediaId!);

        updateJob(jobId, (job) => ({
            ...(job as PostPublishJob),
            payload: {
                ...(job as PostPublishJob).payload,
                images: (job as PostPublishJob).payload.images.map((img) =>
                    toUpload.some((u) => u.key === img.key) ? { ...img, status: 'uploading' as const, error: undefined } : img,
                ),
            },
        }));

        let result;
        try {
            const files = await Promise.all(
                toUpload.map(async (image) => {
                    if (image.file.type.startsWith('video/') || image.filterId === 'original') return image.file;
                    const preset = STORY_FILTER_PRESETS.find((candidate) => candidate.id === image.filterId);
                    return preset ? bakeStoryFilter(image.file, preset) : image.file;
                }),
            );
            result = await uploadBatch.mutateAsync({ eventId, files, context: 'POST' });
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
        const newErrorByKey = new Map<string, string>();
        let hasFailure = false;
        let firstFailureMessage: string | undefined;
        for (const img of toUpload) {
            const failMsgs = failedByName.get(img.file.name);
            if (failMsgs && failMsgs.length > 0) {
                newErrorByKey.set(img.key, failMsgs[0]);
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
                    images: postJob.payload.images.map((img) => {
                        if (newMediaIdByKey.has(img.key)) return { ...img, status: 'uploaded' as const, mediaId: newMediaIdByKey.get(img.key) };
                        if (newErrorByKey.has(img.key)) return { ...img, status: 'failed' as const, error: newErrorByKey.get(img.key) };
                        return img;
                    }),
                },
            };
        });

        if (hasFailure) {
            updateJob(jobId, (current) => ({ ...current, status: 'error', error: firstFailureMessage ?? tComposer('genericSubmitFailed') }));
            return null;
        }

        return [
            ...alreadyUploaded.map((img) => img.mediaId!),
            ...toUpload.map((img) => newMediaIdByKey.get(img.key)).filter((id): id is string => Boolean(id)),
        ];
    }

    async function runPostJob(jobId: string, payload: PostPublishPayload) {
        const mediaIds = await uploadPostImages(jobId, payload);
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
        let working: PendingStory[] = await Promise.all(
            payload.items.map(async (item) => {
                if (item.mediaId || item.filterId === 'original' || item.file.type.startsWith('video/')) {
                    return { ...item, status: item.mediaId ? item.status : ('uploading' as const), error: undefined };
                }
                const preset = STORY_FILTER_PRESETS.find((candidate) => candidate.id === item.filterId);
                const bakedFile = preset ? await bakeStoryFilter(item.file, preset) : item.file;
                return { ...item, file: bakedFile, status: 'uploading' as const, error: undefined };
            }),
        );
        updateJob(jobId, (current) => ({ ...(current as StoryPublishJob), payload: { ...(current as StoryPublishJob).payload, items: working } }));

        const toUpload = working.filter((item) => !item.mediaId);
        if (toUpload.length > 0) {
            try {
                const result = await uploadBatch.mutateAsync({
                    eventId: payload.eventId,
                    files: toUpload.map((item) => item.file),
                    context: 'STORY',
                });
                working = mapBatchUploads(working, result);
            } catch (cause) {
                const message = toErrorMessage(cause, tStory('uploadFailed'));
                working = working.map((item) => (!item.mediaId ? { ...item, status: 'failed' as const, error: message } : item));
                updateJob(jobId, (current) => ({
                    ...(current as StoryPublishJob),
                    status: 'error',
                    error: message,
                    payload: { ...(current as StoryPublishJob).payload, items: working.filter((item) => item.status === 'failed') },
                }));
                return;
            }
            updateJob(jobId, (current) => ({
                ...(current as StoryPublishJob),
                payload: { ...(current as StoryPublishJob).payload, items: working },
            }));
        }

        const processing = working.filter((item) => item.status === 'processing');
        if (processing.length > 0) {
            working = await waitForStoryVideos(working);
            working = working.map((item) =>
                item.status === 'failed' && item.error === undefined ? { ...item, error: tStory('processingFailed') } : item,
            );
            updateJob(jobId, (current) => ({
                ...(current as StoryPublishJob),
                payload: { ...(current as StoryPublishJob).payload, items: working },
            }));
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
                })),
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
                ...(current as StoryPublishJob),
                status: 'error',
                error: tStory('partialSuccess', { posted: result.created.length, failed: remaining.length }),
                postedCount: (current as StoryPublishJob).postedCount + result.created.length,
                payload: { ...(current as StoryPublishJob).payload, items: remaining },
            }));
        } catch (cause) {
            const message = toErrorMessage(cause, tStory('postFailed'));
            updateJob(jobId, (current) => ({
                ...(current as StoryPublishJob),
                status: 'error',
                error: message,
                payload: { ...(current as StoryPublishJob).payload, items: working.filter((item) => item.mediaId) },
            }));
        }
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
        // eslint-disable-next-line react-hooks/exhaustive-deps -- runStoryJob closes over mutation hooks that are stable across renders in practice
    }, []);

    async function runSongJob(jobId: string, payload: SongPublishPayload) {
        try {
            await createPlaylistSuggestion.mutateAsync(payload);
        } catch (error) {
            const message = isModuleNotAvailableError(error) ? tPlaylist('moduleUnavailable') : toErrorMessage(error, tPlaylist('submitFailed'));
            updateJob(jobId, (current) => ({ ...current, status: 'error', error: message }));
            return;
        }

        updateJob(jobId, (current) => ({ ...current, status: 'success', error: undefined }));
    }

    const enqueueSong = useCallback((payload: SongPublishPayload) => {
        const job: SongPublishJob = { id: nextJobId(), kind: 'song', status: 'pending', createdAt: Date.now(), payload };
        setJobs((current) => [job, ...current]);
        void runSongJob(job.id, payload);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- runSongJob closes over mutation hooks that are stable across renders in practice
    }, []);

    const retryJob = useCallback((jobId: string) => {
        const job = jobsRef.current.find((candidate) => candidate.id === jobId);
        if (!job) return;
        updateJob(jobId, (current) => ({ ...current, status: 'pending', error: undefined }));
        if (job.kind === 'post') void runPostJob(jobId, job.payload);
        else if (job.kind === 'song') void runSongJob(jobId, job.payload);
        else void runStoryJob(jobId, job.payload);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- runPostJob/runStoryJob/runSongJob close over mutation hooks that are stable across renders in practice
    }, []);

    const dismissJob = useCallback((jobId: string) => {
        setJobs((current) => current.filter((job) => job.id !== jobId));
    }, []);

    return { jobs, enqueuePost, enqueueStory, enqueueSong, retryJob, dismissJob };
}
