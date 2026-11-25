import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { guestAuthor, storyComment, storyPhotos, storyPost } from '@/.storybook/fixtures';
import { FeedPostList } from '@/components/feed/FeedPostList';
import { useFeedItems } from '@/hooks/useFeedItems';
import type { PartnerBrandingDto, PostResponseDto } from '@/lib/api/types';
import { eventThemeStyle } from '@/lib/eventTheme';
import { feedEndsWithPost } from '@/lib/feed/feedEnd';
import { cn } from '@/lib/utils';

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

// The page's end as the feed draws it: nothing below a last post, room below any other card.
function FeedEnd({ posts, partnerBranding }: { posts: PostResponseDto[]; partnerBranding: PartnerBrandingDto | null }) {
    const items = useFeedItems(posts, partnerBranding);
    const endsWithPost = feedEndsWithPost(items, false);
    return (
        <div className={cn('flow-root', !endsWithPost && 'pb-24 md:pb-16')}>
            <FeedPostList items={items} partnerBranding={partnerBranding} eventId="evt-story" endsWithPost={endsWithPost} />
        </div>
    );
}

// Phones: posts in a row stay joined and square, with only the feed's first card rounded on top. Desktop: every
// post is a card of its own.
const meta = {
    title: 'Feed/FeedPostList',
    component: FeedEnd,
    args: { posts: [text('a'), text('b'), text('c')], partnerBranding: null },
    decorators: [
        withAppContext,
        (Story, { parameters }) => (
            <div className="bg-event pt-6" style={eventThemeStyle(parameters.page ?? '#dfe9e4', { cardColor: parameters.card ?? '#ffffff' })}>
                <div className="mx-auto max-w-2xl">
                    <Story />
                </div>
            </div>
        ),
    ],
    parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof FeedEnd>;

export default meta;
type Story = StoryObj<typeof meta>;

// A post draws its card on the article itself; the music and vendor cards draw theirs inside it.
async function cardsAlign({ canvasElement }: { canvasElement: HTMLElement }) {
    const articles = await within(canvasElement).findAllByRole('article');
    if (window.innerWidth < 1024) return;
    const edges = articles.map((article) => {
        const card = article.classList.contains('px-2') ? article.firstElementChild! : article;
        const { left, right } = card.getBoundingClientRect();
        return `${left} ${right}`;
    });
    await expect(new Set(edges).size).toBe(1);
}

export const PostsOnly: Story = {};

export const LonePost: Story = { args: { posts: [photo] } };

// Announcements stay joined to the posts; the tint and the comments' background follow the corners.
export const TintAndComments: Story = { args: { posts: [announcement, photo, commented] } };

// Space before and after a playlist digest and a partner card. On desktop every card is as wide as the others.
export const WithOtherCards: Story = {
    args: { posts: [text('a'), text('b'), text('c'), digest, announcement, commented], partnerBranding: branding },
    play: cardsAlign,
};

// A digest at the end keeps its room below.
export const DigestLast: Story = { args: { posts: [text('a'), digest] } };

// No rounded post when the feed starts with another card.
export const DigestFirst: Story = { args: { posts: [digest, text('a'), text('b')] } };

// The whole vendor card, with the page around it.
export const VendorPhotoCard: Story = { args: { posts: [text('a'), text('b')], partnerBranding: { ...branding, variant: 'FEATURE_CARD', placement: { firstAfter: 1, every: 25 } } }, play: cardsAlign };

// A wall theme: cards in the page's own colour.
export const WallTheme: Story = { ...WithOtherCards, parameters: { page: '#f6e7dd', card: '#f6e7dd' } };
