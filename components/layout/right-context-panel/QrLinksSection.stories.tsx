import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { storyQrLink } from '@/.storybook/fixtures';
import { QrLinksSection } from '@/components/layout/right-context-panel/QrLinksSection';

const meta = {
    title: 'Layout/RightContextPanel/QrLinksSection',
    component: QrLinksSection,
    args: {
        eventId: 'evt-story',
        showGallery: true,
        galleryQrLink: storyQrLink({ id: 'qr-gallery', targetType: 'MEDIA_UPLOAD' }),
        showInvitations: true,
        invitationsQrCount: 3,
    },
    decorators: [
        (Story) => (
            <div className="max-w-xs">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof QrLinksSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// The gallery upload code hasn't been made yet.
export const NoGalleryCode: Story = {
    args: { galleryQrLink: null },
};

export const InvitationsOnly: Story = {
    args: { showGallery: false, galleryQrLink: null, invitationsQrCount: 1 },
};
