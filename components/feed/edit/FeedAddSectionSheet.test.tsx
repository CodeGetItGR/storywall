import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedAddSectionSheet } from '@/components/feed/edit/FeedAddSectionSheet';
import { defaultFeedLayout, wallThemeDesign } from '@/lib/feedLayout';
import { buildFeedSectionPreviews } from '@/lib/feedSectionPreview';
import type { NewSectionType } from '@/lib/invitation/newSection';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
// next/font only works when Next compiles the file.
vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));

afterEach(cleanup);

const previews = (types: NewSectionType[]) =>
    buildFeedSectionPreviews({
        types,
        document: defaultFeedLayout(),
        theme: wallThemeDesign(null),
        media: () => undefined,
        eventType: 'WEDDING',
        samples: null,
        fonts: [],
        locale: 'en',
    });

describe('FeedAddSectionSheet', () => {
    it('shows each block as a card named after it, and adds the one tapped', () => {
        const onAdd = vi.fn();
        render(<FeedAddSectionSheet open previews={previews(['dressCode', 'faq'])} onAdd={onAdd} onClose={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'sectionNames.faq' }));
        expect(onAdd).toHaveBeenCalledWith('faq');
        expect(screen.getByRole('button', { name: 'sectionNames.dressCode' })).toBeTruthy();
    });

    it('says when there is nothing left to add', () => {
        render(<FeedAddSectionSheet open previews={previews([])} onAdd={vi.fn()} onClose={vi.fn()} />);
        expect(screen.getByText('sections.nothingToAdd')).toBeTruthy();
    });

    it('draws empty tiles for a gallery with no photos, and the card still adds it', () => {
        const onAdd = vi.fn();
        render(<FeedAddSectionSheet open previews={previews(['gallery', 'faq'])} onAdd={onAdd} onClose={vi.fn()} />);
        const card = screen.getByRole('button', { name: 'sectionNames.gallery' });
        expect(card.querySelector('[data-testid="feed-gallery-placeholder"]')).toBeTruthy();
        expect(screen.getAllByTestId('feed-gallery-placeholder')).toHaveLength(1);
        fireEvent.click(card);
        expect(onAdd).toHaveBeenCalledWith('gallery');
    });
});
