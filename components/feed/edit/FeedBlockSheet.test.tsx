import { cleanup, render, screen, within } from '@testing-library/react';
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

describe("FeedBlockSheet of a Save my date section", () => {
    const background = { color: undefined, hasPhoto: false, failed: false, onColor: vi.fn(), onPickPhoto: vi.fn(), onRemovePhoto: vi.fn() };
    const content = {
        textColor: '#4A3B32',
        themeColors: ['#7A3B2E'],
        uploading: false,
        failed: false,
        onPhoto: vi.fn(),
        onTextColor: vi.fn(),
        background,
    };
    const group = (name: string) => within(screen.getByRole('group', { name }));
    const { image, color, tooDark } = en.FeedEditor.background;
    const failed = en.InvitationEditor.photos.errors.failed;

    it('adds a photo and colours the text from its settings', async () => {
        renderSheet(null, vi.fn(), { content });
        const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
        await userEvent.upload(screen.getAllByLabelText(en.FeedEditor.addPhoto)[0], file);
        expect(content.onPhoto).toHaveBeenCalledExactlyOnceWith(file);
        await userEvent.click(group(en.InvitationEditor.textColor).getByRole('button', { name: '#7A3B2E' }));
        expect(content.onTextColor).toHaveBeenCalledExactlyOnceWith('#7A3B2E');
    });

    it("says when the photo didn't upload, and has none of it on other blocks", () => {
        renderSheet(null, vi.fn(), { content: { ...content, failed: true } });
        expect(screen.getByText(failed)).toBeTruthy();
        expect(group(image).queryByText(failed)).toBeNull();
        cleanup();
        renderSheet(null, vi.fn(), { content: null });
        expect(screen.queryByLabelText(en.FeedEditor.addPhoto)).toBeNull();
        expect(screen.queryByRole('group', { name: image })).toBeNull();
    });

    it('sets a background photo, then changes and removes it', async () => {
        renderSheet(null, vi.fn(), { content });
        const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
        await userEvent.upload(group(image).getByLabelText(en.FeedEditor.addPhoto), file);
        expect(background.onPickPhoto).toHaveBeenCalledExactlyOnceWith(file);
        expect(group(image).queryByRole('button')).toBeNull();
        cleanup();
        renderSheet(null, vi.fn(), { content: { ...content, background: { ...background, hasPhoto: true } } });
        expect(group(image).getByLabelText(en.InvitationEditor.photos.change)).toBeTruthy();
        await userEvent.click(group(image).getByRole('button', { name: en.ImageDropInput.remove }));
        expect(background.onRemovePhoto).toHaveBeenCalledOnce();
    });

    it("takes another background photo after one that didn't upload", () => {
        renderSheet(null, vi.fn(), { content: { ...content, background: { ...background, failed: true } } });
        expect(group(image).getByText(failed)).toBeTruthy();
        expect(group(image).getByLabelText(en.FeedEditor.addPhoto)).toBeTruthy();
    });

    it("picks a background colour from the theme's and the four, and goes back with Default", async () => {
        const byDefault = en.InvitationEditor.lineHeightDefault;
        renderSheet(null, vi.fn(), { content });
        expect(screen.queryByRole('button', { name: byDefault })).toBeNull();
        await userEvent.click(group(color).getByRole('button', { name: '#7A3B2E' }));
        expect(background.onColor).toHaveBeenLastCalledWith('#7A3B2E');
        cleanup();
        renderSheet(null, vi.fn(), { content: { ...content, background: { ...background, color: '#B5BFA6' } } });
        expect(screen.queryByText(tooDark)).toBeNull();
        await userEvent.click(screen.getByRole('button', { name: byDefault }));
        expect(background.onColor).toHaveBeenLastCalledWith(undefined);
    });

    it('says when a lighter shade will be drawn', () => {
        renderSheet(null, vi.fn(), { content: { ...content, background: { ...background, color: '#3A2A20' } } });
        expect(screen.getByText(tooDark)).toBeTruthy();
    });
});

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
