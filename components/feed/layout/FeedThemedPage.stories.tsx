import '@/components/event/feedBackdrop.css';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { CSSProperties, ReactNode } from 'react';

import { withAppContext } from '@/.storybook/appContext';
import { storyPhotos, storyPost } from '@/.storybook/fixtures';
import { STORY_THEME } from '@/.storybook/invitation';
import { FeedLookTop } from '@/components/feed/layout/FeedLookTop';
import { PostCard } from '@/components/feed/PostCard';
import type { FeedTopView } from '@/hooks/useFeedTop';
import { eventThemeStyle } from '@/lib/eventTheme';
import { defaultFeedLayout, feedFrame } from '@/lib/feedLayout';
import { feedBackdropStyle, feedPageBackdrop } from '@/lib/feedPageBackdrop';
import { INVITATION_LABELS } from '@/lib/invitation/labels';
import { buildRenderContext } from '@/lib/invitation/render';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';
import type { ThemeDesign } from '@/lib/invitation/theme';

// Stand-ins for today's feed blocks; their own stories cover how they look.
const Box = ({ label }: { label: string }) => <div className="mx-4 my-3 p-4 text-sm text-ink">{label}</div>;

const LIGHT: ThemeDesign = {
    ...STORY_THEME,
    backgrounds: { ...STORY_THEME.backgrounds, content: { desktop: { mediaId: 'page-light' }, mode: 'repeat', stableRepeat: true } },
};
const TEXTURE: ThemeDesign = {
    ...STORY_THEME,
    colors: { ...STORY_THEME.colors, secondary: '#dfe9e4' },
    backgrounds: { ...STORY_THEME.backgrounds, content: { desktop: { mediaId: 'page-dark' }, mode: 'texture', stableRepeat: false } },
};
const PAGE_IMAGES: Record<string, string> = { 'page-light': '/storybook-assets/light-photo.jpg', 'page-dark': '/storybook-assets/dark-photo.jpg' };
const media = (id: string) => PAGE_IMAGES[id];

const autoDressCode = {
    ...(SAMPLE_SECTIONS.dressCode as InvitationSection),
    id: 'dress',
    style: { ...SAMPLE_SECTIONS.dressCode.style, background: { kind: 'theme', slot: 'auto' } },
} as InvitationSection;

function ThemedPage({ theme, children }: { theme: ThemeDesign; children?: ReactNode }) {
    const base = defaultFeedLayout();
    const document = { ...base, themeId: 'story-theme', sections: [...base.sections, autoDressCode] };
    const backdrop = feedPageBackdrop(document, theme, media);
    const ctx = { ...buildRenderContext(document, theme, media), labels: INVITATION_LABELS.en, pageBackdrop: true };
    const view: FeedTopView = {
        look: true,
        lang: 'en',
        fontFaces: '',
        ctx,
        themeId: document.themeId,
        sections: document.sections,
        frame: feedFrame(document, { ended: false }),
        folds: false,
        open: true,
        toggle: () => undefined,
        drawsMiddle: true,
        pageBackground: null,
        backdrop,
    };
    const style = { ...eventThemeStyle(backdrop?.color, { cardColor: backdrop?.cardColor }), ...feedBackdropStyle(backdrop) } as CSSProperties;
    return (
        <div className="feed-backdrop mx-auto min-h-screen max-w-2xl bg-event pb-8" style={style}>
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
        </div>
    );
}

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

// A texture tiled at the invitation's tile size, with posts on a different light tone.
export const Texture: Story = { args: { theme: TEXTURE } };

// Mobile width: the tile size drops to 390px.
export const TextureMobile: Story = { args: { theme: TEXTURE }, globals: { viewport: { value: 'mobile' } } };
