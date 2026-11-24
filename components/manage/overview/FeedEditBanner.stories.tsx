import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { withAppContext } from '@/.storybook/appContext';
import { storyEvent, storyPhotos } from '@/.storybook/fixtures';
import { FeedEditBanner } from '@/components/manage/overview/FeedEditBanner';
import { FeedEditBannerPlaceholder } from '@/components/manage/overview/FeedEditBannerPlaceholder';
import { FeedEditBannerDrawing } from '@/components/manage/overview/FeedEditBannerPreview';
import { feedEditBannerLook, feedEditBannerPicture } from '@/lib/feedEditBannerLook';
import { readFeedLayout } from '@/lib/feedLayout';
import { SAMPLE_DOCUMENT, SAMPLE_THEME } from '@/lib/invitation/samples';
import type { InvitationThemePublicDto } from '@/lib/invitation/themePreview';

// The banner's picture as the Overview draws it: a wall layout on the event type's first Save my date theme, or,
// without one, the event's wall look.
const event = storyEvent({ coverMedia: storyPhotos[0] });
const layout = readFeedLayout(null, null);
const theme = { slug: 'story', name: 'Story', eventType: 'WEDDING', design: SAMPLE_THEME, document: SAMPLE_DOCUMENT, assetUrls: {} };
const picture = (fallback?: InvitationThemePublicDto) =>
    feedEditBannerPicture(feedEditBannerLook(layout, fallback), { event, layoutDocument: layout.document, fonts: [], locale: 'en' });

const meta = {
    title: 'Manage/Overview/FeedEditBanner',
    component: FeedEditBanner,
    decorators: [withAppContext],
    args: {
        state: 'included',
        href: '/events/e-1/feed?edit=blocks',
        illustration: <FeedEditBannerDrawing preview={picture(theme as unknown as InvitationThemePublicDto)} />,
    },
} satisfies Meta<typeof FeedEditBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Included: Story = {};
export const Locked: Story = { args: { state: 'locked', href: '/events/e-1/settings/addons?add=SMD' } };
// An event type with no Save my date themes: the wall look, the feed's own blocks.
export const WallLook: Story = { args: { illustration: <FeedEditBannerDrawing preview={picture()} /> } };
// While the picture's data or code loads.
export const Loading: Story = { args: { illustration: <FeedEditBannerPlaceholder /> } };
