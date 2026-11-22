import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedEditBanner } from '@/components/manage/overview/FeedEditBanner';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

afterEach(cleanup);

describe('FeedEditBanner', () => {
    it('asks to unlock, with a lock', () => {
        const { container } = render(<FeedEditBanner state="locked" href="/events/e-1/settings/addons?add=SMD" illustration={<span />} />);
        expect(screen.getByRole('heading', { name: 'title' })).toBeTruthy();
        expect(screen.getByRole('link', { name: 'unlock' }).getAttribute('href')).toBe('/events/e-1/settings/addons?add=SMD');
        expect(container.querySelector('[data-banner-lock]')).not.toBeNull();
    });

    it('asks to start editing, without a lock', () => {
        const { container } = render(<FeedEditBanner state="included" href="/events/e-1/feed?edit=blocks" illustration={<span />} />);
        expect(screen.getByRole('link', { name: 'startEditing' }).getAttribute('href')).toBe('/events/e-1/feed?edit=blocks');
        expect(container.querySelector('[data-banner-lock]')).toBeNull();
    });

    it('names its picture', () => {
        render(<FeedEditBanner state="included" href="/x" illustration={<span />} />);
        expect(screen.getByRole('img', { name: 'previewAlt' })).toBeTruthy();
    });
});
