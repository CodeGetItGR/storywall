import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { withAppContext } from '@/.storybook/appContext';
import { guestAuthor, storyComment, storyPhotos, storyPost } from '@/.storybook/fixtures';
import { FeedPostList } from '@/components/feed/FeedPostList';
import type { PartnerBrandingDto, PostResponseDto } from '@/lib/api/types';
import { eventThemeStyle } from '@/lib/eventTheme';

const text = (id: string, overrides: Partial<PostResponseDto> = {}) =>
    storyPost({ id, type: 'TEXT', media: [], content: 'What a day!', author: guestAuthor, authorMemberId: guestAuthor.memberId, ...overrides });
const photo = storyPost({ id: 'photo', media: [storyPhotos[0]] });
const announcement = text('announcement', { type: 'ANNOUNCEMENT', content: 'The ceremony starts at 18:00.' });
const digest = storyPost({ id: 'digest', type: 'PLAYLIST', author: null, media: [], content: '🎵 5 new songs were added to the playlist!' });
const commented = text('commented', { commentCount: 1, recentComments: [storyComment('c1')] });

const branding: PartnerBrandingDto = {
    variant: 'COMPACT_ROW',
    displayName: 'Aegean Weddings',
    role: 'PLANNER',
    logoUrl: '/landing/decor-03.webp',
    coverUrl: '/landing/03-wedding-ceremony-santorini.webp',
    tagline: { en: 'Island weddings planned down to the last petal.', el: 'Γάμοι στα νησιά, οργανωμένοι ως την τελευταία λεπτομέρεια.' },
    services: { en: 'Planning · Styling · Venues', el: 'Οργάνωση · Styling · Χώροι' },
    linkUrl: '/api/partner-branding/click/abc',
    placement: { firstAfter: 2, every: 25 },
};

// Posts in a row stay joined; only the ends of each run are rounded.
const meta = {
    title: 'Feed/FeedPostList',
    component: FeedPostList,
    args: { posts: [text('a'), text('b'), text('c')], partnerBranding: null, eventId: 'evt-story' },
    decorators: [
        withAppContext,
        (Story, { parameters }) => (
            <div className="bg-event py-6" style={eventThemeStyle(parameters.page ?? '#dfe9e4', { cardColor: parameters.card ?? '#ffffff' })}>
                <div className="mx-auto flex max-w-2xl flex-col">
                    <Story />
                </div>
            </div>
        ),
    ],
    parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof FeedPostList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneRun: Story = {};

export const LonePost: Story = { args: { posts: [photo] } };

// The announcement's tint and the comments' background follow the corners.
export const TintAndComments: Story = { args: { posts: [announcement, photo, commented] } };

// A playlist digest and a partner card each end a run and start the next.
export const BrokenByCards: Story = {
    args: { posts: [text('a'), text('b'), text('c'), digest, announcement, commented], partnerBranding: branding },
};

// A wall theme: cards in the page's own colour.
export const WallTheme: Story = { ...BrokenByCards, parameters: { page: '#f6e7dd', card: '#f6e7dd' } };
