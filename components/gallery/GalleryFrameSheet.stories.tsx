import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { GalleryFrameRow } from '@/components/gallery/GalleryFrameRow';
import { GalleryFrameSheet } from '@/components/gallery/GalleryFrameSheet';
import type { GalleryFrameSetting } from '@/hooks/useGalleryFrameSetting';
import { FRAME_PREVIEW_SIZE, frameSvg, frameSvgDataUrl, UPLOAD_FRAME_OPTIONS } from '@/lib/uploadFrame';

const LABELS = { NONE: 'No frame', CLASSIC: 'Classic', LAUREL: 'Laurel', CONFETTI: 'Confetti' } as const;
const text = { title: 'Η αποφοίτηση της Μαρίας', date: '2 Ιουλίου 2026' };

const setting: GalleryFrameSetting = {
    label: 'Photo frame',
    value: 'Classic',
    options: UPLOAD_FRAME_OPTIONS.map((frame) => ({
        frame,
        label: LABELS[frame],
        previewSrc: frame === 'NONE' ? null : frameSvgDataUrl(frameSvg(frame, FRAME_PREVIEW_SIZE, text)),
    })),
    current: 'CLASSIC',
    open: true,
    openSheet: fn(),
    close: fn(),
    choose: fn(),
    saving: false,
    error: null,
};

const meta = {
    title: 'Gallery/GalleryFrameSheet',
    component: GalleryFrameSheet,
    args: { setting },
} satisfies Meta<typeof GalleryFrameSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Classic: Story = {};

export const NoFrame: Story = { args: { setting: { ...setting, current: 'NONE', value: 'No frame' } } };

export const Row: Story = {
    render: () => (
        <div className="max-w-md p-4">
            <GalleryFrameRow setting={{ ...setting, open: false }} />
        </div>
    ),
};
