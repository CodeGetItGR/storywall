import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import { PREVIEW_THEME, previewDocument, previewMedia } from '@/lib/saveMyDatePreview';

// What the staging preview page renders. The page itself only adds the release
// check and the uploaded fonts, which come from the server.
const meta = {
    title: 'SaveMyDate/Pages/Preview',
    component: InvitationRenderer,
    parameters: { layout: 'fullscreen' },
    args: { document: previewDocument(), theme: PREVIEW_THEME, media: previewMedia },
} satisfies Meta<typeof InvitationRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Greek: Story = {};

export const EnglishCalendarDate: Story = {
    args: { document: previewDocument('calendar', 'en') },
};
