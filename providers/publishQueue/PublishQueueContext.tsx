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

export interface SongPublishPayload {
    eventId: string;
    title: string;
    artist?: string;
    youtubeUrl?: string;
    spotifyUrl?: string;
    comment?: string;
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

export interface SongPublishJob extends PublishJobCommon {
    kind: 'song';
    payload: SongPublishPayload;
}

export type PublishJob = PostPublishJob | StoryPublishJob | SongPublishJob;

export interface PublishQueueContextValue {
    jobs: PublishJob[];
    enqueuePost: (payload: PostPublishPayload) => void;
    enqueueStory: (payload: StoryPublishPayload) => void;
    enqueueSong: (payload: SongPublishPayload) => void;
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
