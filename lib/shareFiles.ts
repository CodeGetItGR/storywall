// Sharing a guest's own photos and videos through the phone's share menu (Web Share API with files).
// See docs/superpowers/specs/2026-11-18-share-after-upload-design.md.

import { bakeStoryFilter, STORY_FILTER_PRESETS } from '@/lib/story/storyFilters';
import type { PublishJob } from '@/providers/publishQueue/PublishQueueContext';

// The files a finished job put online, as they were uploaded: a post photo with a filter is baked
// again (the job keeps the original), a story item already holds its baked file. Empty for songs,
// text-only posts and jobs that didn't finish.
export async function filesForFinishedJob(job: PublishJob): Promise<File[]> {
    if (job.status !== 'success') return [];
    if (job.kind === 'story') return job.payload.items.filter((item) => item.mediaId).map((item) => item.file);
    if (job.kind !== 'post') return [];
    return Promise.all(
        job.payload.images
            .filter((image) => image.status === 'uploaded')
            .map(async (image) => {
                if (image.file.type.startsWith('video/') || image.filterId === 'original') return image.file;
                const preset = STORY_FILTER_PRESETS.find((candidate) => candidate.id === image.filterId);
                return preset ? bakeStoryFilter(image.file, preset) : image.file;
            }),
    );
}

// After this many "Not now"s in one event, the share sheet stops opening by itself.
export const SHARE_PROMPT_MAX_DECLINES = 2;

const DECLINES_KEY_PREFIX = 'storywall:share-prompt-declines:';

// True on a phone or tablet whose browser can share these files. Desktop browsers can share
// files too, but their share menu has no Instagram or Facebook story, so they're left out.
export function canShareFiles(files: File[]): boolean {
    if (files.length === 0 || typeof navigator === 'undefined' || typeof window === 'undefined') return false;
    if (typeof navigator.canShare !== 'function' || typeof navigator.share !== 'function') return false;
    if (!window.matchMedia?.('(pointer: coarse)').matches) return false;
    try {
        return navigator.canShare({ files });
    } catch {
        return false;
    }
}

export function sharePromptDeclines(eventId: string): number {
    try {
        const value = Number(window.localStorage.getItem(DECLINES_KEY_PREFIX + eventId));
        return Number.isFinite(value) && value > 0 ? value : 0;
    } catch {
        return 0;
    }
}

export function recordSharePromptDecline(eventId: string): void {
    try {
        window.localStorage.setItem(DECLINES_KEY_PREFIX + eventId, String(sharePromptDeclines(eventId) + 1));
    } catch {
        // Storage blocked (private mode): the sheet keeps opening, which is harmless.
    }
}

export function shouldOpenSharePrompt(eventId: string): boolean {
    return sharePromptDeclines(eventId) < SHARE_PROMPT_MAX_DECLINES;
}

export type ShareFilesResult = 'shared' | 'cancelled' | 'failed';

export async function shareFiles(files: File[]): Promise<ShareFilesResult> {
    try {
        // Files only: some apps leave the menu when text or a link comes along.
        await navigator.share({ files });
        return 'shared';
    } catch (error) {
        return error instanceof DOMException && error.name === 'AbortError' ? 'cancelled' : 'failed';
    }
}
