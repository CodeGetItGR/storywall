'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { pollMediaUntilProcessed, useUploadMediaBatch } from '@/hooks/useMedia';
import { useCreatePlaylistSuggestion } from '@/hooks/usePlaylist';
import { useCreatePost } from '@/hooks/usePosts';
import { useCreateStoriesBatch } from '@/hooks/useStories';
import type { PendingStory } from '@/hooks/useStoryComposerController';
import { ERROR_CODES, getErrorCode, getQuotaExceededDetails, isModuleNotAvailableError } from '@/lib/api/errors';
import type { MediaBatchUploadResponseDto, MediaResponseDto } from '@/lib/api/types';
import { getAuthState, subscribeAuthState } from '@/lib/auth/tokenStore';
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

// One attempt at a job, owned by the account that started it. Every request
// reads the global access token, so a job that outlives its account would carry
// on as whoever signed in next: A's post, published under B. The attempt is
// aborted when that account changes (see the effect below) or the controller
// unmounts, and each step checks before sending anything.
interface JobRun {
    controller: AbortController;
    ownerId: string | null;
}

function isStopped(run: JobRun): boolean {
    if (getAuthState().userId !== run.ownerId) run.controller.abort();
    return run.controller.signal.aborted;
}

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

async function waitForStoryVideos(items: PendingStory[], signal: AbortSignal): Promise<PendingStory[]> {
    return Promise.all(
        items.map(async (item) => {
            if (!item.mediaId || !item.file.type.startsWith('video/') || item.status === 'failed') return item;
            const media: MediaResponseDto = await pollMediaUntilProcessed(item.mediaId, signal);
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
    const runsRef = useRef(new Map<string, JobRun>());

    useEffect(() => {
        jobsRef.current = jobs;
    }, [jobs]);

    // Aborts synchronously inside setSession/clearSession, before the account
    // change re-renders anything, so no request is sent with the new token.
    // A token refresh for the same user keeps the job going.
    useEffect(() => {
        const runs = runsRef.current;
        const unsubscribe = subscribeAuthState((state) => {
            runs.forEach((run, jobId) => {
                if (run.ownerId === state.userId) return;
                run.controller.abort();
                runs.delete(jobId);
            });
        });
        return () => {
            unsubscribe();
            runs.forEach((run) => run.controller.abort());
            runs.clear();
        };
    }, []);

    const launch = useCallback((jobId: string, work: (run: JobRun) => Promise<void>) => {
        runsRef.current.get(jobId)?.controller.abort();
        const run: JobRun = { controller: new AbortController(), ownerId: getAuthState().userId };
        runsRef.current.set(jobId, run);
        void work(run).finally(() => {
            if (runsRef.current.get(jobId) === run) runsRef.current.delete(jobId);
        });
    }, []);

    const updateJob = useCallback((jobId: string, updater: (job: PublishJob) => PublishJob) => {
        setJobs((current) => current.map((job) => (job.id === jobId ? updater(job) : job)));
    }, []);

    function getPostErrorMessage(error: unknown): string {
        if (getErrorCode(error) === ERROR_CODES.EVENT_STORAGE_LIMIT_EXCEEDED) {
            const details = getQuotaExceededDetails(error);
            const nextPlan = details ? findNextPlan(appConfig?.planTiers ?? [], 'EVENT', details.planCode) : undefined;
            return nextPlan ? tComposer('storageLimitExceededWithPlan', { plan: nextPlan.name }) : tComposer('storageLimitExceeded');
        }
        if (isModuleNotAvailableError(error)) return tComposer('moduleUnavailable');
        return toErrorMessage(error, tComposer('genericSubmitFailed'));
    }

    async function uploadPostImages(jobId: string, payload: PostPublishPayload, run: JobRun): Promise<string[] | null> {
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
            if (isStopped(run)) return null;
            result = await uploadBatch.mutateAsync({ eventId, files, context: 'POST', signal: run.controller.signal });
        } catch (error) {
            if (isStopped(run)) return null;
            updateJob(jobId, (current) => ({ ...current, status: 'error', error: getPostErrorMessage(error) }));
            return null;
        }

        if (isStopped(run)) return null;

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

    async function runPostJob(jobId: string, payload: PostPublishPayload, run: JobRun) {
        const mediaIds = await uploadPostImages(jobId, payload, run);
        if (mediaIds === null || isStopped(run)) return;

        try {
            await createPost.mutateAsync({
                eventId: payload.eventId,
                authorMemberId: payload.authorMemberId,
                type: mediaIds.length > 0 ? 'MEDIA' : 'TEXT',
                content: payload.caption.trim() || undefined,
                isPinned: false,
                mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
                signal: run.controller.signal,
            });
        } catch (error) {
            if (isStopped(run)) return;
            updateJob(jobId, (current) => ({ ...current, status: 'error', error: getPostErrorMessage(error) }));
            return;
        }

        if (isStopped(run)) return;
        updateJob(jobId, (current) => ({ ...current, status: 'success', error: undefined }));
    }

    async function runStoryJob(jobId: string, payload: StoryPublishPayload, run: JobRun) {
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
        if (isStopped(run)) return;
        updateJob(jobId, (current) => ({ ...(current as StoryPublishJob), payload: { ...(current as StoryPublishJob).payload, items: working } }));

        const toUpload = working.filter((item) => !item.mediaId);
        if (toUpload.length > 0) {
            try {
                const result = await uploadBatch.mutateAsync({
                    eventId: payload.eventId,
                    files: toUpload.map((item) => item.file),
                    context: 'STORY',
                    signal: run.controller.signal,
                });
                working = mapBatchUploads(working, result);
            } catch (cause) {
                if (isStopped(run)) return;
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
            if (isStopped(run)) return;
            updateJob(jobId, (current) => ({
                ...(current as StoryPublishJob),
                payload: { ...(current as StoryPublishJob).payload, items: working },
            }));
        }

        const processing = working.filter((item) => item.status === 'processing');
        if (processing.length > 0) {
            try {
                working = await waitForStoryVideos(working, run.controller.signal);
            } catch (cause) {
                if (isStopped(run)) return;
                throw cause;
            }
            if (isStopped(run)) return;
            working = working.map((item) =>
                item.status === 'failed' && item.error === undefined ? { ...item, error: tStory('processingFailed') } : item,
            );
            updateJob(jobId, (current) => ({
                ...(current as StoryPublishJob),
                payload: { ...(current as StoryPublishJob).payload, items: working },
            }));
        }

        if (isStopped(run)) return;
        const readyToPost = working.filter((item) => item.mediaId && item.status === 'uploaded');
        if (readyToPost.length === 0) {
            updateJob(jobId, (current) => ({ ...current, status: 'error', error: tStory('postFailed') }));
            return;
        }

        try {
            const result = await createStories.mutateAsync({
                stories: readyToPost.map((item) => ({
                    eventId: payload.eventId,
                    authorMemberId: payload.authorMemberId,
                    mediaId: item.mediaId!,
                    caption: item.caption.trim() || undefined,
                })),
                signal: run.controller.signal,
            });
            if (isStopped(run)) return;
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
            if (isStopped(run)) return;
            const message = toErrorMessage(cause, tStory('postFailed'));
            updateJob(jobId, (current) => ({
                ...(current as StoryPublishJob),
                status: 'error',
                error: message,
                payload: { ...(current as StoryPublishJob).payload, items: working.filter((item) => item.mediaId) },
            }));
        }
    }

    async function runSongJob(jobId: string, payload: SongPublishPayload, run: JobRun) {
        try {
            await createPlaylistSuggestion.mutateAsync({ ...payload, signal: run.controller.signal });
        } catch (error) {
            if (isStopped(run)) return;
            const message = isModuleNotAvailableError(error) ? tPlaylist('moduleUnavailable') : toErrorMessage(error, tPlaylist('submitFailed'));
            updateJob(jobId, (current) => ({ ...current, status: 'error', error: message }));
            return;
        }

        if (isStopped(run)) return;
        updateJob(jobId, (current) => ({ ...current, status: 'success', error: undefined }));
    }

    // The queue's callbacks stay stable, so the context doesn't change while a
    // job runs. Each run starts with the latest mutations, copy and config.
    const runnersRef = useRef({ runPostJob, runStoryJob, runSongJob });
    useEffect(() => {
        runnersRef.current = { runPostJob, runStoryJob, runSongJob };
    });

    const enqueuePost = useCallback(
        (payload: PostPublishPayload) => {
            const job: PostPublishJob = { id: nextJobId(), kind: 'post', status: 'pending', createdAt: Date.now(), payload };
            setJobs((current) => [job, ...current]);
            launch(job.id, (run) => runnersRef.current.runPostJob(job.id, payload, run));
        },
        [launch],
    );

    const enqueueStory = useCallback(
        (payload: StoryPublishPayload) => {
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
            launch(job.id, (run) => runnersRef.current.runStoryJob(job.id, payload, run));
        },
        [launch],
    );

    const enqueueSong = useCallback(
        (payload: SongPublishPayload) => {
            const job: SongPublishJob = { id: nextJobId(), kind: 'song', status: 'pending', createdAt: Date.now(), payload };
            setJobs((current) => [job, ...current]);
            launch(job.id, (run) => runnersRef.current.runSongJob(job.id, payload, run));
        },
        [launch],
    );

    const retryJob = useCallback(
        (jobId: string) => {
            const job = jobsRef.current.find((candidate) => candidate.id === jobId);
            if (!job) return;
            updateJob(jobId, (current) => ({ ...current, status: 'pending', error: undefined }));
            const runners = runnersRef.current;
            if (job.kind === 'post') launch(jobId, (run) => runners.runPostJob(jobId, job.payload, run));
            else if (job.kind === 'song') launch(jobId, (run) => runners.runSongJob(jobId, job.payload, run));
            else launch(jobId, (run) => runners.runStoryJob(jobId, job.payload, run));
        },
        [launch, updateJob],
    );

    const dismissJob = useCallback((jobId: string) => {
        setJobs((current) => current.filter((job) => job.id !== jobId));
    }, []);

    // Memoized by hand: the React Compiler can't compile this hook (it doesn't
    // support conditionals inside try blocks yet). Only a job change updates the context.
    return useMemo(
        () => ({ jobs, enqueuePost, enqueueStory, enqueueSong, retryJob, dismissJob }),
        [jobs, enqueuePost, enqueueStory, enqueueSong, retryJob, dismissJob],
    );
}
