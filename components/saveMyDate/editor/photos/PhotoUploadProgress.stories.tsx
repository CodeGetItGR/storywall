import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useTranslations } from 'next-intl';

import { PhotoUploadProgress } from '@/components/saveMyDate/editor/photos/PhotoUploadProgress';

type ProgressArgs = { percent: number };

// Over a photo-sized box, as on the canvas. The label comes from the app's copy.
function Progress({ percent }: ProgressArgs) {
    const t = useTranslations('InvitationEditor.photos');
    return (
        <div className="relative h-60 w-72 overflow-hidden rounded-2xl bg-[#eee]">
            <PhotoUploadProgress percent={percent} label={t('uploading')} />
        </div>
    );
}

const meta = {
    title: 'SaveMyDate/Editor/Photos/PhotoUploadProgress',
    component: Progress,
    args: { percent: 0 },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Starting: Story = {};

export const Halfway: Story = {
    args: { percent: 45 },
};

// Sent, waiting for the server.
export const Sending: Story = {
    args: { percent: 90 },
};
