import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { SectionSettingsStory } from '@/.storybook/sectionSettings';
import { waitForOpen } from '@/.storybook/waitForOpen';
import type { PhotoUploadSlots } from '@/hooks/usePhotoUploads';
import { PhotoUploadsContext } from '@/hooks/usePhotoUploadsContext';
import { photoSlotKey } from '@/lib/invitation/photoSlots';
import { createPhotoUploadStore } from '@/lib/invitation/photoUploadStore';

type GalleryStoryProps = {
    isDocked: boolean;
    // A photo being added, this far along.
    adding?: number;
    onClose: () => void;
};

// The gallery's settings with the editor's uploads on, as hosts see them.
function GalleryStory({ isDocked, adding, onClose }: GalleryStoryProps) {
    const [slots] = useState<PhotoUploadSlots>(() => {
        const uploads = createPhotoUploadStore();
        if (adding !== undefined)
            uploads.getState().set(photoSlotKey({ kind: 'galleryAdd', sectionId: 's-gallery', id: 'story' }), { percent: adding });
        return { uploads, upload: async () => {}, canPick: () => false, report: () => {} };
    });

    return (
        <PhotoUploadsContext.Provider value={slots}>
            <SectionSettingsStory sectionId="s-gallery" isAdmin={false} isDocked={isDocked} onClose={onClose} />
        </PhotoUploadsContext.Provider>
    );
}

const meta = {
    title: 'SaveMyDate/Editor/GallerySettings',
    component: GalleryStory,
    args: { isDocked: false, onClose: fn() },
    tags: ['visual-mobile-only'],
    globals: { viewport: { value: 'mobile' } },
} satisfies Meta<typeof GalleryStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Photos: Story = {
    play: async ({ globals }) => {
        const copy = copyFor(globals).InvitationEditor.photos.gallery;
        const sheet = within(await waitForOpen('dialog'));
        await expect(sheet.getAllByRole('button', { name: copy.delete })).toHaveLength(2);
        await expect(sheet.getByRole('button', { name: copy.add })).toBeVisible();
    },
};

// A photo still uploading, after the ones already in.
export const Uploading: Story = { args: { adding: 45 } };

// The slideshow shows each photo as it is, so there is no shape to pick.
export const Slideshow: Story = {
    play: async ({ globals }) => {
        const copy = copyFor(globals).InvitationEditor.photos.gallery;
        const sheet = within(await waitForOpen('dialog'));
        await userEvent.click(sheet.getByRole('radio', { name: copy.layouts.carousel }));
        await expect(sheet.queryByRole('radiogroup', { name: copy.shape })).not.toBeInTheDocument();
    },
};
