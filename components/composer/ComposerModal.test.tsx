import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ComposerModal } from '@/components/composer/ComposerModal';
import type { ComposerController } from '@/hooks/useComposerController';
import messages from '@/messages/en.json';

vi.mock('@/hooks/useUploadAccept', () => ({ useUploadAccept: () => ({ media: 'image/*' }) }));
vi.mock('@/components/playlist/AddSongForm', () => ({ AddSongForm: () => null }));

afterEach(cleanup);

function renderModal(overrides: Partial<ComposerController> = {}) {
    const controller = {
        isOpen: true,
        composerMode: 'post',
        caption: '',
        images: [],
        selectedImageForFilter: null,
        sizeError: null,
        countError: null,
        songComposerKey: 0,
        fileRef: createRef<HTMLInputElement>(),
        textareaRef: createRef<HTMLTextAreaElement>(),
        canSubmit: true,
        canComposePost: true,
        canComposeSong: true,
        canAnnounce: false,
        isAnnouncing: false,
        announcementError: null,
        maxImages: 10,
        maxCaptionLength: 500,
        closeComposer: vi.fn(),
        selectPostMode: vi.fn(),
        selectSongMode: vi.fn(),
        selectAnnouncementMode: vi.fn(),
        handleCaptionChange: vi.fn(),
        handlePickPhotos: vi.fn(),
        handlePostFilesChange: vi.fn(),
        handleRemoveImageClick: vi.fn(),
        handleImageFilterSelection: vi.fn(),
        submitPost: vi.fn((event: { preventDefault: () => void }) => event.preventDefault()),
        submitAnnouncement: vi.fn((event: { preventDefault: () => void }) => event.preventDefault()),
        submitPlaylistSuggestion: vi.fn(),
        ...overrides,
    } as unknown as ComposerController;
    render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <ComposerModal {...controller} />
        </NextIntlClientProvider>,
    );
    return controller;
}

describe('ComposerModal Announcement mode', () => {
    it('shows no Announcement chip to a guest', () => {
        renderModal();
        expect(screen.queryByRole('button', { name: 'Announcement' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Music' })).toBeInTheDocument();
    });

    it('offers the chip to a host or planner', () => {
        const controller = renderModal({ canAnnounce: true });
        fireEvent.click(screen.getByRole('button', { name: 'Announcement' }));
        expect(controller.selectAnnouncementMode).toHaveBeenCalled();
    });

    it('is text only and posts as an announcement', () => {
        const controller = renderModal({ canAnnounce: true, composerMode: 'announcement', caption: 'Dinner at 9' });
        expect(screen.getByRole('button', { name: 'Announcement' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.queryByRole('button', { name: 'Add media' })).not.toBeInTheDocument();
        expect(screen.queryByText('Up to 10 items')).not.toBeInTheDocument();
        // The mode chip and the submit button both say Post.
        const submit = screen.getAllByRole('button', { name: 'Post' }).find((button) => button.getAttribute('type') === 'submit');
        fireEvent.click(submit!);
        expect(controller.submitAnnouncement).toHaveBeenCalled();
        expect(controller.submitPost).not.toHaveBeenCalled();
    });

    it('says Posting… while it sends and shows the server error', () => {
        renderModal({ canAnnounce: true, composerMode: 'announcement', isAnnouncing: true, canSubmit: false, announcementError: 'Only hosts' });
        expect(screen.getByRole('button', { name: 'Posting…' })).toBeDisabled();
        expect(screen.getByRole('alert')).toHaveTextContent('Only hosts');
    });

    it('keeps Add media in Post mode', () => {
        renderModal({ canAnnounce: true });
        expect(screen.getAllByRole('button', { name: 'Add media' }).length).toBeGreaterThan(0);
        expect(screen.getByText('Up to 10 items')).toBeInTheDocument();
    });
});
