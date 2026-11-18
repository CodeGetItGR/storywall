import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { createRef } from 'react';
import { fn } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { ComposerModal } from '@/components/composer/ComposerModal';
import type { ComposerController } from '@/hooks/useComposerController';

// Only the fields the modal reads; the rest of the controller is never touched here.
function controller(overrides: Partial<ComposerController> = {}): ComposerController {
    return {
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
        canSubmit: false,
        canComposePost: true,
        canComposeSong: true,
        canAnnounce: false,
        isAnnouncing: false,
        announcementError: null,
        maxImages: 10,
        maxCaptionLength: 500,
        closeComposer: fn(),
        selectPostMode: fn(),
        selectSongMode: fn(),
        selectAnnouncementMode: fn(),
        handleCaptionChange: fn(),
        handlePickPhotos: fn(),
        handlePostFilesChange: fn(),
        handleRemoveImageClick: fn(),
        handleImageFilterSelection: fn(),
        submitPost: fn(),
        submitAnnouncement: fn(),
        submitPlaylistSuggestion: fn(),
        ...overrides,
    } as ComposerController;
}

const meta = {
    title: 'Composer/ComposerModal',
    component: ComposerModal,
    decorators: [withAppContext],
    args: controller(),
} satisfies Meta<typeof ComposerModal>;

export default meta;
type Story = StoryObj<typeof meta>;

// A guest: Post and Music only.
export const Guest: Story = {};

// A host or planner: the Announcement chip beside Post and Music.
export const HostPost: Story = { args: controller({ canAnnounce: true }) };

// Text only: no media hint, no Add media.
export const Announcement: Story = {
    args: controller({ canAnnounce: true, composerMode: 'announcement', caption: 'Buses leave the hotel at 17:00.', canSubmit: true }),
};

export const AnnouncementPosting: Story = {
    args: controller({ canAnnounce: true, composerMode: 'announcement', caption: 'Buses leave the hotel at 17:00.', isAnnouncing: true }),
};
