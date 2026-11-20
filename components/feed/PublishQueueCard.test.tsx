import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PublishQueueCard } from '@/components/feed/PublishQueueCard';
import { SLOW_UPLOAD_DELAY_MS } from '@/hooks/useSlowUpload';
import type { PublishJob } from '@/providers/publishQueue/PublishQueueContext';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

function postJob(overrides: Partial<PublishJob> = {}): PublishJob {
    return { id: 'job-1', kind: 'post', status: 'pending', createdAt: 0, payload: {}, ...overrides } as PublishJob;
}

describe('PublishQueueCard slow upload note', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it('shows the note once a post has been uploading past the delay', () => {
        render(<PublishQueueCard job={postJob()} onRetry={vi.fn()} onDismiss={vi.fn()} />);
        expect(screen.queryByText('uploadSlow')).toBeNull();

        act(() => {
            vi.advanceTimersByTime(SLOW_UPLOAD_DELAY_MS);
        });
        expect(screen.getByText('uploadSlow')).toBeInTheDocument();
        expect(screen.getByText('postingPost')).toBeInTheDocument();
    });

    it('lets the busy message take over from the slow note', () => {
        render(<PublishQueueCard job={postJob({ busy: true })} onRetry={vi.fn()} onDismiss={vi.fn()} />);
        act(() => {
            vi.advanceTimersByTime(SLOW_UPLOAD_DELAY_MS);
        });
        expect(screen.getByText('uploadBusy')).toBeInTheDocument();
        expect(screen.queryByText('uploadSlow')).toBeNull();
    });

    it('keeps a shareable success card until the guest acts on it', () => {
        const onDismiss = vi.fn();
        const onShare = vi.fn();
        render(<PublishQueueCard job={postJob({ status: 'success' })} onRetry={vi.fn()} onDismiss={onDismiss} onShare={onShare} />);
        act(() => {
            vi.advanceTimersByTime(10_000);
        });
        expect(onDismiss).not.toHaveBeenCalled();

        act(() => screen.getByRole('button', { name: 'share' }).click());
        expect(onShare).toHaveBeenCalledWith('job-1');
        act(() => screen.getByRole('button', { name: 'dismiss' }).click());
        expect(onDismiss).toHaveBeenCalledWith('job-1');
    });

    it('hides a success card without sharing after a few seconds', () => {
        const onDismiss = vi.fn();
        render(<PublishQueueCard job={postJob({ status: 'success' })} onRetry={vi.fn()} onDismiss={onDismiss} />);
        expect(screen.queryByRole('button', { name: 'share' })).toBeNull();
        act(() => {
            vi.advanceTimersByTime(4000);
        });
        expect(onDismiss).toHaveBeenCalledWith('job-1');
    });

    it('never shows the note for a song, which sends no files', () => {
        render(<PublishQueueCard job={postJob({ kind: 'song' } as Partial<PublishJob>)} onRetry={vi.fn()} onDismiss={vi.fn()} />);
        act(() => {
            vi.advanceTimersByTime(SLOW_UPLOAD_DELAY_MS * 2);
        });
        expect(screen.queryByText('uploadSlow')).toBeNull();
    });
});
