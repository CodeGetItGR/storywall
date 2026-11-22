import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedAddSectionSheet } from '@/components/feed/edit/FeedAddSectionSheet';
import { defaultFeedLayout, wallThemeDesign } from '@/lib/feedLayout';
import { feedSectionPreview } from '@/lib/feedSectionPreview';
import { buildRenderContext } from '@/lib/invitation/render';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
// next/font only works when Next compiles the file.
vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));

afterEach(cleanup);

const ctx = buildRenderContext(defaultFeedLayout(), wallThemeDesign(null), () => undefined);
const previews = (types: ('dressCode' | 'faq')[]) => ({
    items: types.map((type) => ({ type, section: feedSectionPreview(type, null, 'WEDDING') })),
    ctx,
    lang: 'en',
    fontFaces: '',
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
});
