import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import { THEME_PUBLIC_DTO } from '@/lib/invitation/__fixtures__/themePublicDto';
import { readThemePreview } from '@/lib/invitation/themePreview';

// The preview page with ?theme=<slug>: an active theme from the catalogue, read the way the page
// reads it. The theme here is made up; the real ones are on staging.
const preview = readThemePreview(THEME_PUBLIC_DTO);

const meta = {
    title: 'SaveMyDate/Pages/Preview Theme',
    component: InvitationRenderer,
    parameters: { layout: 'fullscreen' },
    args: { document: preview.document, theme: preview.theme, media: preview.media },
} satisfies Meta<typeof InvitationRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithTheme: Story = {};
