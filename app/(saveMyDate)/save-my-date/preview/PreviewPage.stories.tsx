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

// The whole page, to scroll through. The visual check captures it one section
// at a time instead (Preview Sections).
export const Greek: Story = {
    tags: ['visual-skip'],
};

export const EnglishCalendarDate: Story = {
    tags: ['visual-skip'],
    args: { document: previewDocument('calendar', 'en') },
};
