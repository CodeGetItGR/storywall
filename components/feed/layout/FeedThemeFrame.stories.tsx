import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useLocale } from 'next-intl';

import { withAppContext } from '@/.storybook/appContext';
import { storyEvent, storyHostMember, storyPhotos } from '@/.storybook/fixtures';
import { STORY_THEME, storyInvitationMedia } from '@/.storybook/invitation';
import { FeedCoverBlock } from '@/components/feed/layout/FeedCoverBlock';
import { FeedLookTop } from '@/components/feed/layout/FeedLookTop';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { defaultFeedLayout, feedFrame } from '@/lib/feedLayout';
import type { FeedPageMode } from '@/lib/feedMode';
import { planFeedThemeSwitch } from '@/lib/feedThemes';
import type { FeedTopArt } from '@/lib/feedTopArt';
import type { InvitationDocument } from '@/lib/invitation/document';
import { INVITATION_LABELS } from '@/lib/invitation/labels';
import { buildRenderContext } from '@/lib/invitation/render';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { ThemeDesign } from '@/lib/invitation/theme';

const THEME: ThemeDesign = {
    ...STORY_THEME,
    art: { main: { image: { mediaId: 'm-leaf' }, scale: 1, animation: 'none' } },
};

// The layout right after the host picks the theme, with or without a photo in its frame.
function pickedLayout(photo: string | undefined): InvitationDocument {
    const target = { document: { ...defaultFeedLayout(), themeId: 'story-theme', sections: [SAMPLE_SECTIONS.photoFrame] }, theme: THEME, imageIds: new Set<string>() };
    const picked = planFeedThemeSwitch(defaultFeedLayout(), target, new Set());
    if (!photo) return picked;
    const sections = picked.sections.map((section) => ({
        ...section,
        elements: section.elements.map((element) => (element.kind === 'photoFrame' ? { ...element, photo: { source: 'media', mediaId: photo } } : element)),
    }));
    return { ...picked, sections } as InvitationDocument;
}

type PageProps = { event: EventDetailResponseDto; photo?: string; mode: FeedPageMode; color?: string };

const coverOf = (event: EventDetailResponseDto) =>
    function Cover(topArt: FeedTopArt | null) {
        return <FeedCoverBlock event={event} isHost={false} wishlist={false} topArt={topArt} />;
    };

// The invitation's top as guests see it.
function Page({ event, photo, mode, color }: PageProps) {
    const locale = useLocale() === 'en' ? 'en' : 'el';
    const document = pickedLayout(photo);
    const ctx = { ...buildRenderContext(document, THEME, storyInvitationMedia), labels: INVITATION_LABELS[locale], centerText: true };
    return (
        <div className="mx-auto min-h-screen max-w-2xl pb-8" style={{ background: color }}>
            <FeedLookTop
                view={{
                    look: true,
                    lang: locale,
                    fontFaces: '',
                    ctx,
                    themeId: document.themeId,
                    sections: document.sections,
                    frame: feedFrame(document, { ended: false, rsvpMoves: true }),
                    drawsMiddle: true,
                    rsvpMoves: true,
                    pageBackground: null,
                    backdrop: null,
                }}
                mode={mode}
                cover={coverOf(event)}
                stories={null}
                description={<p className="px-4 py-3 text-center text-sm">{event.description}</p>}
                rsvp={null}
            />
        </div>
    );
}

const event = storyEvent();

const meta = {
    title: 'Feed/Layout/FeedThemeFrame',
    component: Page,
    args: { event, photo: 'm-framed', mode: 'invitation', color: '#efe7ec' },
    parameters: { layout: 'fullscreen', app: { event, member: storyHostMember } },
    decorators: [withAppContext],
} satisfies Meta<typeof Page>;

export default meta;
type Story = StoryObj<typeof meta>;

// The theme's illustration where the cover photo would be, then the host's photo in the theme's frame.
export const FramedPhoto: Story = {};

// Nothing until a photo is in it.
export const BeforeThePhoto: Story = { args: { photo: undefined } };

// The event has a cover photo: the illustration gives way to it.
export const WithCoverPhoto: Story = { args: { event: storyEvent({ coverMedia: storyPhotos[0] }) } };
