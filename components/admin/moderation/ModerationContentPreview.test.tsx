import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ModerationContentPreview } from '@/components/admin/moderation/ModerationContentPreview';
import type { ModerationContentDto } from '@/lib/api/types';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const content: ModerationContentDto = {
    text: 'Congratulations!',
    authorMemberId: null,
    authorUserId: null,
    authorDisplayName: 'Maria',
    authorIsHost: false,
    media: [],
    audio: null,
    createdAt: '2026-11-16T10:00:00Z',
};

afterEach(cleanup);

describe('ModerationContentPreview', () => {
    it('shows the text of a written wish with nothing to play', () => {
        render(<ModerationContentPreview content={content} />);
        expect(screen.getByText('Congratulations!')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'play' })).toBeNull();
    });

    it('plays a voice-only wish and shows no empty text', () => {
        const { container } = render(
            <ModerationContentPreview content={{ ...content, text: null, audio: { url: 'https://cdn/w1.m4a', durationMs: 9000 } }} />,
        );
        expect(screen.getByRole('button', { name: 'play' })).toBeTruthy();
        expect(container.querySelector('p.whitespace-pre-wrap')).toBeNull();
    });

    it('says when the content is gone', () => {
        render(<ModerationContentPreview content={null} />);
        expect(screen.getByText('contentGone')).toBeTruthy();
    });
});
