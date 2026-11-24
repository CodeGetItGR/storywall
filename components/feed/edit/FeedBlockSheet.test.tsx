import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedBlockSheet } from '@/components/feed/edit/FeedBlockSheet';
import en from '@/messages/en.json';

// next/font only works when Next compiles the file.
vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));

afterEach(cleanup);

const noMedia = () => undefined;

function renderSheet(membersOnly: boolean | null, onMembersOnly = vi.fn(), props: Partial<ComponentProps<typeof FeedBlockSheet>> = {}) {
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <FeedBlockSheet
                title="Dress code"
                open
                scope={null}
                groups={[]}
                parts={[]}
                partLabels={{} as never}
                isDesktop
                membersOnly={membersOnly}
                onMembersOnly={onMembersOnly}
                promptText={null}
                onPromptText={vi.fn()}
                pinned={null}
                pinnedUploading={false}
                media={noMedia}
                onAddPinned={vi.fn()}
                onRemovePinned={vi.fn()}
                onMovePinned={vi.fn()}
                onOpenPart={vi.fn()}
                onClose={vi.fn()}
                {...props}
            />
        </NextIntlClientProvider>,
    );
    return onMembersOnly;
}

describe('FeedBlockSheet members only', () => {
    it('turns members only on and off', async () => {
        const onMembersOnly = renderSheet(false);
        const toggle = screen.getByRole('switch', { name: en.FeedLayout.membersOnly });
        expect((toggle as HTMLInputElement).checked).toBe(false);
        await userEvent.click(toggle);
        expect(onMembersOnly).toHaveBeenCalledExactlyOnceWith(true);
    });

    it("doesn't offer it on a block that can't be members only", () => {
        renderSheet(null);
        expect(screen.queryByRole('switch', { name: en.FeedLayout.membersOnly })).toBeNull();
    });
});

describe('FeedBlockSheet pinned photos', () => {
    it('lists the photos and takes new ones', () => {
        renderSheet(null, vi.fn(), { pinned: [{ id: 'a', image: { source: 'media', mediaId: 'm-a' } }], media: () => 'https://r2/a.jpg' });
        expect(screen.getByAltText('Photo 1 of 1')).toBeTruthy();
        expect(screen.getByLabelText(en.FeedEditor.addPhoto)).toBeTruthy();
    });

    it('has no photos on other blocks', () => {
        renderSheet(null);
        expect(screen.queryByLabelText(en.FeedEditor.addPhoto)).toBeNull();
    });
});

describe('FeedBlockSheet photo prompt', () => {
    it('types the photo prompt', async () => {
        const onPromptText = vi.fn();
        renderSheet(null, vi.fn(), { promptText: '', onPromptText });
        await userEvent.type(screen.getByRole('textbox', { name: en.FeedSections.prompt.question }), 'S');
        expect(onPromptText).toHaveBeenLastCalledWith('S');
    });

    it('has no prompt field on other blocks', () => {
        renderSheet(null);
        expect(screen.queryByRole('textbox', { name: en.FeedSections.prompt.question })).toBeNull();
    });
});
