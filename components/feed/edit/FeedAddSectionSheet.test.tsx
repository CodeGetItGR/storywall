import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedAddSectionSheet } from '@/components/feed/edit/FeedAddSectionSheet';
import { defaultFeedLayout, wallThemeDesign } from '@/lib/feedLayout';
import { buildFeedSectionPreviews } from '@/lib/feedSectionPreview';
import type { NewSectionType } from '@/lib/invitation/newSection';
import en from '@/messages/en.json';

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

function renderSheet({ types, tiles = null }: { types: NewSectionType[]; tiles?: ReactNode | null }) {
    const on = { onAdd: vi.fn(), onClose: vi.fn() };
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <FeedAddSectionSheet open eventType="WEDDING" previews={previews(types)} tiles={tiles} {...on} />
        </NextIntlClientProvider>,
    );
    return on;
}

const names = en.InvitationEditor.sectionNames;

describe('FeedAddSectionSheet', () => {
    it('shows the intro and one row per section, by name', () => {
        renderSheet({ types: ['invitation', 'faq'] });
        expect(screen.getByText(en.FeedEditor.addIntro)).toBeTruthy();
        expect(screen.getByRole('button', { name: names.invitation })).toBeTruthy();
        expect(screen.getByRole('button', { name: names.faq })).toBeTruthy();
    });

    it('names the schedule after the event type', () => {
        renderSheet({ types: ['program'] });
        expect(screen.getByRole('button', { name: names.programWedding })).toBeTruthy();
    });

    it('adds the section when its row is tapped', () => {
        const on = renderSheet({ types: ['faq'] });
        fireEvent.click(screen.getByRole('button', { name: names.faq }));
        expect(on.onAdd).toHaveBeenCalledWith('faq');
    });

    it('opens a preview from the eye, without adding', async () => {
        const on = renderSheet({ types: ['faq'] });
        fireEvent.click(screen.getByRole('button', { name: `${en.InvitationEditor.preview}: ${names.faq}` }));
        expect(await screen.findByRole('dialog', { name: names.faq })).toBeTruthy();
        expect(on.onAdd).not.toHaveBeenCalled();
    });

    it('draws empty tiles in the preview of a gallery with no photos', async () => {
        renderSheet({ types: ['gallery'] });
        fireEvent.click(screen.getByRole('button', { name: `${en.InvitationEditor.preview}: ${names.gallery}` }));
        const dialog = await screen.findByRole('dialog', { name: names.gallery });
        expect(dialog.querySelector('[data-testid="feed-gallery-placeholder"]')).toBeTruthy();
    });

    it('shows Premium with its tiles', () => {
        renderSheet({ types: ['faq'], tiles: <span>tiles</span> });
        expect(screen.getByRole('heading', { name: en.FeedEditor.premium })).toBeTruthy();
        expect(screen.getByText('tiles')).toBeTruthy();
    });

    it('says when there is nothing to add', () => {
        renderSheet({ types: [] });
        expect(screen.getByText(en.InvitationEditor.sections.nothingToAdd)).toBeTruthy();
    });

    it('says nothing of that while tiles are left', () => {
        renderSheet({ types: [], tiles: <span>tiles</span> });
        expect(screen.queryByText(en.InvitationEditor.sections.nothingToAdd)).toBeNull();
    });
});
