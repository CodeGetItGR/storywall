import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type FeedAddItem, FeedAddSectionSheet } from '@/components/feed/edit/FeedAddSectionSheet';
import { useFeedInvitationAddItems } from '@/hooks/useFeedInvitationAddItems';
import { defaultFeedLayout, wallThemeDesign } from '@/lib/feedLayout';
import { buildFeedSectionPreviews } from '@/lib/feedSectionPreview';
import type { NewSectionType } from '@/lib/invitation/newSection';
import type { FeedModeSectionType } from '@/lib/invitation/sections';
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
    const Sheet = () => (
        <FeedAddSectionSheet kind="invitation" open items={useFeedInvitationAddItems(previews(types), 'WEDDING')} tiles={tiles} {...on} />
    );
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <QueryClientProvider client={new QueryClient()}>
                <Sheet />
            </QueryClientProvider>
        </NextIntlClientProvider>,
    );
    return on;
}

function renderFeedSheet(items: FeedAddItem<FeedModeSectionType>[]) {
    const on = { onAdd: vi.fn(), onClose: vi.fn() };
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <FeedAddSectionSheet kind="feed" open items={items} tiles={null} {...on} />
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

describe('FeedAddSectionSheet in Feed mode', () => {
    const prompt: FeedAddItem<FeedModeSectionType> = { type: 'feedPrompt', name: names.feedPrompt, picture: <span>live</span> };

    it('lists only the feed sections, with no intro and no Premium', () => {
        renderFeedSheet([prompt]);
        expect(screen.getByRole('button', { name: names.feedPrompt })).toBeTruthy();
        expect(screen.getByAltText(names.feedPrompt).getAttribute('src')).toBe('/icons/sections/feedPrompt.svg');
        expect(screen.queryByText(en.FeedEditor.addIntro)).toBeNull();
        expect(screen.queryByRole('heading', { name: en.FeedEditor.premium })).toBeNull();
    });

    it('adds a section from its row', () => {
        const on = renderFeedSheet([prompt]);
        fireEvent.click(screen.getByRole('button', { name: names.feedPrompt }));
        expect(on.onAdd).toHaveBeenCalledWith('feedPrompt');
    });

    it('opens its live picture from the eye, without adding', async () => {
        const on = renderFeedSheet([prompt]);
        fireEvent.click(screen.getByRole('button', { name: `${en.InvitationEditor.preview}: ${names.feedPrompt}` }));
        expect(await screen.findByRole('dialog', { name: names.feedPrompt })).toBeTruthy();
        expect(screen.getByText('live')).toBeTruthy();
        expect(on.onAdd).not.toHaveBeenCalled();
    });

    it('says when there is nothing to add', () => {
        renderFeedSheet([]);
        expect(screen.getByText(en.InvitationEditor.sections.nothingToAdd)).toBeTruthy();
    });
});
