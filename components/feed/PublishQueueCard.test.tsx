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

    it('never shows the note for a song, which sends no files', () => {
        render(<PublishQueueCard job={postJob({ kind: 'song' } as Partial<PublishJob>)} onRetry={vi.fn()} onDismiss={vi.fn()} />);
        act(() => {
            vi.advanceTimersByTime(SLOW_UPLOAD_DELAY_MS * 2);
        });
        expect(screen.queryByText('uploadSlow')).toBeNull();
    });
});
