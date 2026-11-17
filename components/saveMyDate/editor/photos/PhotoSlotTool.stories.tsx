import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useLocale } from 'next-intl';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { hiddenDate, STORY_THEME, storyDocument, storyInvitationMedia, storyPeople, storySection } from '@/.storybook/invitation';
import { PhotoSlotTool } from '@/components/saveMyDate/editor/photos/PhotoSlotTool';
import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import type { PhotoUploadSlots } from '@/hooks/usePhotoUploads';
import { PhotoUploadsContext } from '@/hooks/usePhotoUploadsContext';
import type { CanvasTools } from '@/lib/invitation/canvasTools';
import type { PhotoFrameElement } from '@/lib/invitation/photoFrame';
import { photoSlotKey } from '@/lib/invitation/photoSlots';
import { createPhotoUploadStore } from '@/lib/invitation/photoUploadStore';
import type { InvitationSection } from '@/lib/invitation/sections';

const CAMERA: CanvasTools = { photo: (slot, hasPhoto) => <PhotoSlotTool slot={slot} hasPhoto={hasPhoto} /> };

type PhotoSlotStoryProps = {
    section: InvitationSection;
    // A slot whose upload is this far along.
    uploading?: { key: string; percent: number };
    upload: PhotoUploadSlots['upload'];
    canPick: () => boolean;
};

// One section of the invitation as the editor draws it, with its cameras.
function PhotoSlotStory({ section, uploading, upload, canPick }: PhotoSlotStoryProps) {
    const locale = useLocale();
    const [slots] = useState<PhotoUploadSlots>(() => {
        const uploads = createPhotoUploadStore();
        if (uploading) uploads.getState().set(uploading.key, { percent: uploading.percent });
        return { uploads, upload, canPick, report: () => {} };
    });

    return (
        <div className="smd-editor">
            <PhotoUploadsContext.Provider value={slots}>
                <InvitationRenderer
                    document={storyDocument([hiddenDate(locale), section])}
                    theme={STORY_THEME}
                    media={storyInvitationMedia}
                    canvasTools={CAMERA}
                />
            </PhotoUploadsContext.Provider>
        </div>
    );
}

const frame = storySection('photoFrame').elements[0] as PhotoFrameElement;

const meta = {
    title: 'SaveMyDate/Editor/Photos/PhotoSlotTool',
    component: PhotoSlotStory,
    parameters: { layout: 'fullscreen' },
    args: { section: storySection('baby', { babyPhoto: undefined }), upload: fn(), canPick: fn(() => false) },
} satisfies Meta<typeof PhotoSlotStory>;

export default meta;
type Story = StoryObj<typeof meta>;

// No photo yet: the camera with its label in the middle of the shape.
export const Empty: Story = {
    play: async ({ args, canvasElement, globals }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: copyFor(globals).InvitationEditor.photos.upload }));
        await expect(args.canPick).toHaveBeenCalledOnce();
    },
};

// A photo is there: a small camera at the bottom changes it.
export const WithPhoto: Story = {
    args: { section: storySection('baby') },
    play: async ({ canvasElement, globals }) => {
        await expect(within(canvasElement).getByRole('button', { name: copyFor(globals).InvitationEditor.photos.change })).toBeVisible();
    },
};

export const Uploading: Story = {
    args: { uploading: { key: photoSlotKey({ kind: 'field', sectionId: 's-baby', path: 'babyPhoto' }), percent: 45 } },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '45');
    },
};

// Godparents: one with a photo, one without.
export const People: Story = {
    args: { section: storySection('godparents', { godparents: [storyPeople(1)[0], { id: 'person-1', name: 'Άννα' }] }) },
};

export const EmptyPhotoBand: Story = {
    args: { section: storySection('photo', { photo: undefined }) },
};

export const EmptyFrame: Story = {
    args: { section: storySection('photoFrame', {}, { elements: [{ ...frame, photo: undefined, animation: 'none' }] }) },
};
