import '@/components/event/feedBackdrop.css';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { CSSProperties, ReactNode } from 'react';
import { within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { storyHostMember, storyPhotos, storyPost } from '@/.storybook/fixtures';
import { hostPanelHandlers } from '@/.storybook/handlers';
import { STORY_THEME } from '@/.storybook/invitation';
import { FeedBackdropLayer } from '@/components/event/FeedBackdropLayer';
import { Header } from '@/components/feed/Header';
import { FeedLookTop } from '@/components/feed/layout/FeedLookTop';
import { PostCard } from '@/components/feed/PostCard';
import { RightContextPanel } from '@/components/layout/RightContextPanel';
import type { FeedTopView } from '@/hooks/useFeedTop';
import { eventThemeStyle } from '@/lib/eventTheme';
import { defaultFeedLayout, feedFrame } from '@/lib/feedLayout';
import { feedBackdropClassName, feedBackdropStyle, feedBackdropSurface, feedPageBackdrop } from '@/lib/feedPageBackdrop';
import { type FeedPageTheme, feedPageTheme } from '@/lib/feedPageTheme';
import { planFeedThemeSwitch } from '@/lib/feedThemes';
import type { InvitationDocument } from '@/lib/invitation/document';
import { INVITATION_LABELS } from '@/lib/invitation/labels';
import { buildRenderContext, onPageBackdrop } from '@/lib/invitation/render';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';
import type { ThemeDesign } from '@/lib/invitation/theme';
import { pageToneProps, pageToneStyle } from '@/lib/pageTone';
import { cn } from '@/lib/utils';

// Stand-ins for today's feed blocks; their own stories cover how they look.
const Box = ({ label }: { label: string }) => <div className="on-page mx-4 my-3 p-4 text-sm text-ink">{label}</div>;

const LIGHT: ThemeDesign = {
    ...STORY_THEME,
    backgrounds: { ...STORY_THEME.backgrounds, content: { desktop: { mediaId: 'page-light' }, mode: 'repeat', stableRepeat: true } },
};
const TEXTURE: ThemeDesign = {
    ...STORY_THEME,
    colors: { ...STORY_THEME.colors, secondary: '#dfe9e4' },
    backgrounds: { ...STORY_THEME.backgrounds, content: { desktop: { mediaId: 'page-dark' }, mode: 'texture', stableRepeat: false } },
};
// Different top and content images: a block that drew its own would show a seam against the page.
const TWO_IMAGES: ThemeDesign = {
    ...STORY_THEME,
    backgrounds: {
        ...STORY_THEME.backgrounds,
        top: { desktop: { mediaId: 'page-dark' }, mode: 'cover', stableRepeat: false },
        content: { desktop: { mediaId: 'page-light' }, mode: 'repeat', stableRepeat: true },
    },
};
// A tall content picture that doesn't repeat (like Γάμος 002): it fills the screen and stays still while the
// page scrolls over it, so it never repeats into a seam.
const COVER: ThemeDesign = {
    ...STORY_THEME,
    backgrounds: {
        ...STORY_THEME.backgrounds,
        top: { desktop: { mediaId: 'page-dark' }, mode: 'cover', stableRepeat: false },
        content: { desktop: { mediaId: 'page-tall' }, mode: 'cover', stableRepeat: false },
    },
};
// A dark picture that fills the screen, a busy one tiled over the page, and a theme with a colour and no picture.
const DARK: ThemeDesign = {
    ...STORY_THEME,
    backgrounds: { ...STORY_THEME.backgrounds, content: { desktop: { mediaId: 'page-dark' }, mode: 'cover', stableRepeat: false } },
};
const BUSY: ThemeDesign = {
    ...STORY_THEME,
    backgrounds: { ...STORY_THEME.backgrounds, content: { desktop: { mediaId: 'page-tall' }, mode: 'texture', stableRepeat: false } },
};
const DARK_TONE = { mean: 0.022, dark: 0.005, light: 0.067 };
const SOLID: ThemeDesign = {
    ...STORY_THEME,
    colors: { ...STORY_THEME.colors, secondary: '#dfe9e4' },
    backgrounds: { ...STORY_THEME.backgrounds, content: { mode: 'cover', stableRepeat: false } },
};
const PAGE_IMAGES: Record<string, string> = {
    'page-light': '/storybook-assets/light-photo.jpg',
    'page-dark': '/storybook-assets/dark-photo.jpg',
    'page-tall': '/landing/qr-wedding/guest-photo-reception-dancing.webp',
};
const media = (id: string) => PAGE_IMAGES[id];

const autoDressCode = {
    ...(SAMPLE_SECTIONS.dressCode as InvitationSection),
    id: 'dress',
    style: { ...SAMPLE_SECTIONS.dressCode.style, background: { kind: 'theme', slot: 'auto' } },
} as InvitationSection;

const base = defaultFeedLayout();
const AUTO_LAYOUT: InvitationDocument = { ...base, themeId: 'story-theme', sections: [...base.sections, autoDressCode] };

// The layout right after the host picks a theme whose own sections name the top or content image.
const withSlot = (section: InvitationSection, slot: 'top' | 'content') =>
    ({ ...section, style: { ...section.style, background: { kind: 'theme', slot } } }) as InvitationSection;
const faq = { ...(SAMPLE_SECTIONS.faq as InvitationSection), id: 'faq' } as InvitationSection;
const PICKED_LAYOUT = planFeedThemeSwitch(
    { ...base, sections: [...base.sections, faq] },
    {
        document: {
            ...base,
            themeId: 'story-theme',
            sections: [
                withSlot(SAMPLE_SECTIONS.top as InvitationSection, 'top'),
                withSlot(SAMPLE_SECTIONS.invitation as InvitationSection, 'content'),
                withSlot(SAMPLE_SECTIONS.faq as InvitationSection, 'top'),
                withSlot(SAMPLE_SECTIONS.rsvp as InvitationSection, 'top'),
            ],
        },
        theme: TWO_IMAGES,
        imageIds: new Set(),
    },
    new Set(),
);

// The whole page in one colour: no theme's backdrop.
const inColor = (color: string, document = AUTO_LAYOUT): InvitationDocument => ({
    ...document,
    overrides: { ...document.overrides, backgroundColor: color },
});

// Sections with fills of their own inside: FAQ, RSVP, gift, programme and accommodation.
const FILLED_LAYOUT: InvitationDocument = {
    ...AUTO_LAYOUT,
    sections: [
        ...base.sections,
        ...(['faq', 'rsvp', 'gift', 'programIcons', 'accommodation'] as const).map(
            (type) =>
                ({
                    ...SAMPLE_SECTIONS[type],
                    // No colours of the host's own: they stay as picked on any page.
                    data: { ...SAMPLE_SECTIONS[type].data, faqStyle: undefined, programStyle: undefined },
                    id: type,
                }) as unknown as InvitationSection,
        ),
    ],
};

// What the backend measures on the dark picture.
const pageTones = new Map([[DARK, DARK_TONE]]);

function pageOf({ theme, document = AUTO_LAYOUT }: PageProps): FeedPageTheme {
    const backdrop = feedPageBackdrop(document, theme, media, pageTones.get(theme));
    return feedPageTheme(null, document.overrides.backgroundColor, backdrop);
}

type PageProps = { theme: ThemeDesign; document?: InvitationDocument; children?: ReactNode; whole?: boolean };

function FeedColumn({ theme, document = AUTO_LAYOUT, children }: PageProps) {
    const backdrop = feedPageBackdrop(document, theme, media, pageTones.get(theme));
    const plain = buildRenderContext(document, theme, media);
    const ctx = {
        ...(backdrop ? onPageBackdrop(plain, feedBackdropSurface(backdrop)) : plain),
        labels: INVITATION_LABELS.en,
    };
    const view: FeedTopView = {
        look: true,
        lang: 'en',
        fontFaces: '',
        ctx,
        themeId: document.themeId,
        sections: document.sections,
        frame: feedFrame(document, { ended: false }),
        drawsMiddle: true,
        rsvpMoves: false,
        pageBackground: null,
        backdrop,
    };
    return (
        <>
            <FeedLookTop
                view={view}
                cover={<Box label="Cover + title" />}
                stories={<Box label="Stories" />}
                description={<Box label="Description" />}
                rsvp={<Box label="RSVP" />}
            />
            {children ?? (
                <>
                    <PostCard post={storyPost({ media: [storyPhotos[0]] })} />
                    <PostCard post={storyPost({ id: 'post-text', type: 'TEXT', media: [], content: 'What a day!' })} />
                </>
            )}
        </>
    );
}

// The page's backdrop as EventThemeScope draws it: a cover picture on its layer fixed to the screen, the page's
// content after it.
function BackdropScope({ page, className, children }: { page: FeedPageTheme; className: string; children: ReactNode }) {
    const { backdrop = null, cardColor, tone } = page;
    const style = {
        ...eventThemeStyle(page.theme?.backgroundColor, { cardColor, toned: Boolean(tone) }),
        ...feedBackdropStyle(backdrop),
        ...pageToneStyle(tone),
    } as CSSProperties;
    return (
        <div data-event-scope="" {...pageToneProps(tone)} className={cn(feedBackdropClassName(backdrop), className)} style={style}>
            {/* Fixed picture */}
            {backdrop?.fixed && <FeedBackdropLayer />}
            {/* Page */}
            <div className="feed-backdrop-content">{children}</div>
        </div>
    );
}

// `whole` draws the page as the app does: the sticky header and, on desktop, the side panel, in a
// scrolling page, so the header strip and the panel can be checked against the page behind them.
function ThemedPage({ whole = false, ...props }: PageProps) {
    const page = pageOf(props);
    if (!whole) {
        return (
            <BackdropScope page={page} className="mx-auto min-h-screen max-w-2xl bg-event pb-8">
                <FeedColumn {...props} />
            </BackdropScope>
        );
    }
    return (
        <div data-testid="page" className="no-scrollbar h-screen overflow-y-auto">
            <BackdropScope page={page} className="bg-event">
                <div className="flex">
                    {/* Feed */}
                    <div className="min-w-0 flex-1">
                        <div className="mx-auto flex w-full flex-col pb-8 lg:max-w-2xl">
                            <Header countdownTime={Date.parse('2026-07-04T15:00:00Z')} eventId="evt-story" />
                            <FeedColumn {...props} />
                        </div>
                    </div>
                    {/* Right panel */}
                    <RightContextPanel />
                </div>
            </BackdropScope>
        </div>
    );
}

// Scrolls the page to `top` (the end when it's past it) and waits for the header strip to line up.
const scrollPageTo =
    (top: number) =>
    async ({ canvasElement }: { canvasElement: HTMLElement }) => {
        const page = await within(canvasElement).findByTestId('page');
        page.scrollTop = Math.min(top, page.scrollHeight - page.clientHeight);
        page.dispatchEvent(new Event('scroll'));
        await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
    };

// Part way, so the header strip sits over the page's middle.
const scrollPage = scrollPageTo(420);

// A feed much longer than the screen: text posts, so the page behind them shows.
const LONG_FEED = Array.from({ length: 12 }, (_, index) => (
    <PostCard key={index} post={storyPost({ id: `post-${index}`, type: 'TEXT', media: [], content: 'What a day!' })} />
));

const meta = {
    title: 'Feed/Layout/FeedThemedPage',
    component: ThemedPage,
    decorators: [withAppContext],
    parameters: { layout: 'fullscreen' },
    args: { theme: LIGHT },
} satisfies Meta<typeof ThemedPage>;

export default meta;
type Story = StoryObj<typeof meta>;

// One image repeating down the page; the dress code section on "auto" shows the page through.
export const RepeatingImage: Story = {};

// Right after picking a theme with different top and content images: Description, FAQ and RSVP
// sit on the page, with no seams between them.
export const AfterThemePick: Story = { args: { theme: TWO_IMAGES, document: PICKED_LAYOUT } };

// The same at mobile width.
export const AfterThemePickMobile: Story = { ...AfterThemePick, globals: { viewport: { value: 'mobile' } } };

// A texture tiled at the invitation's tile size, with posts on a different light tone.
export const Texture: Story = { args: { theme: TEXTURE } };

// Mobile width: the tile size drops to 390px.
export const TextureMobile: Story = { args: { theme: TEXTURE }, globals: { viewport: { value: 'mobile' } } };

// The whole page on a content picture that doesn't repeat, scrolled: the picture fills the screen and stays still,
// and the header strip and the side panel show the same picture with no edge.
export const WholePageCover: Story = { args: { theme: COVER, document: PICKED_LAYOUT, whole: true }, play: scrollPage };

// The same at mobile width (no side panel).
export const WholePageCoverMobile: Story = { ...WholePageCover, globals: { viewport: { value: 'mobile' } } };

// A long feed on that picture, scrolled to its end, far past one picture's height: the picture is still in the same
// place, with no seam behind the blocks or the posts.
export const LongFeedCover: Story = {
    args: { theme: COVER, document: PICKED_LAYOUT, whole: true, children: LONG_FEED },
    play: scrollPageTo(Number.MAX_SAFE_INTEGER),
};

// The same at mobile width.
export const LongFeedCoverMobile: Story = { ...LongFeedCover, globals: { viewport: { value: 'mobile' } } };

// The whole page on a repeating picture, scrolled.
export const WholePageRepeating: Story = { args: { theme: LIGHT, whole: true }, play: scrollPage };

// The host's side panel on every kind of theme: a white curtain lets the theme through behind its text.
const hostPanel: Pick<Story, 'parameters' | 'beforeEach' | 'globals'> = {
    parameters: { app: { member: storyHostMember } },
    globals: { viewport: { value: 'desktop' } },
    beforeEach({ msw }) {
        msw.use(...hostPanelHandlers());
    },
};

export const HostPanelLight: Story = { ...hostPanel, tags: ['visual-desktop-only'], args: { theme: LIGHT, whole: true } };
export const HostPanelBusy: Story = { ...hostPanel, tags: ['visual-desktop-only'], args: { theme: BUSY, whole: true } };
export const HostPanelDark: Story = { ...hostPanel, tags: ['visual-desktop-only'], args: { theme: DARK, whole: true } };
export const HostPanelSolid: Story = { ...hostPanel, tags: ['visual-desktop-only'], args: { theme: SOLID, whole: true } };
export const HostPanelCoverScrolled: Story = {
    ...hostPanel,
    tags: ['visual-desktop-only'],
    args: { theme: COVER, document: PICKED_LAYOUT, whole: true },
    play: scrollPage,
};

// A dark solid colour stays dark: light text on it, posts on its light tone. A middle colour gets dark text.
export const DarkColor: Story = { args: { document: inColor('#1B2A4A'), whole: true } };
export const DarkColorMobile: Story = { ...DarkColor, globals: { viewport: { value: 'mobile' } } };
export const DarkColorSections: Story = { args: { document: inColor('#1B2A4A', FILLED_LAYOUT), children: <></> } };
export const MiddleColor: Story = { args: { document: inColor('#FF7A59'), whole: true } };
export const DarkPictureMobile: Story = { args: { theme: DARK, whole: true }, globals: { viewport: { value: 'mobile' } } };
export const HostPanelDarkColor: Story = { ...hostPanel, tags: ['visual-desktop-only'], args: { document: inColor('#1B2A4A'), whole: true } };
