import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { FeedEditPencil } from '@/components/feed/edit/FeedEditPencil';
import { EventInfo } from '@/components/feed/EventInfo';
import { FeedLookTop } from '@/components/feed/layout/FeedLookTop';
import { FeedModeSwitch } from '@/components/feed/layout/FeedModeSwitch';
import { FeedTop } from '@/components/feed/layout/FeedTop';
import type { FeedTopView } from '@/hooks/useFeedTop';
import { defaultFeedLayout, feedFrame, usesInvitationLook, wallThemeDesign } from '@/lib/feedLayout';
import type { FeedMode as Mode, FeedPageMode } from '@/lib/feedMode';
import { createFeedModeSection } from '@/lib/feedSections';
import { INVITATION_LABELS } from '@/lib/invitation/labels';
import { buildRenderContext } from '@/lib/invitation/render';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';

// Stand-ins for today's feed blocks; their own stories cover how they look.
const Box = ({ label }: { label: string }) => <div className="mx-4 my-3 rounded-xl bg-surface-muted p-4 text-sm text-ink">{label}</div>;

type StoryArgs = { extra: InvitationSection[]; ended?: boolean; styledDetails?: boolean; mode?: FeedPageMode; canEdit?: boolean };

function TopStory({ extra, ended = false, styledDetails = false, mode = 'single', canEdit = false }: StoryArgs) {
    const base = defaultFeedLayout();
    const sections = base.sections.map((section) =>
        styledDetails && section.type === 'feedDetails'
            ? { ...section, style: { ...section.style, background: { kind: 'color' as const, color: '#F6E7EA' } } }
            : section,
    );
    const document = { ...base, sections: [...sections, ...extra] };
    const ctx = { ...buildRenderContext(document, wallThemeDesign(null), () => undefined), labels: INVITATION_LABELS.en };
    const frame = feedFrame(document, { ended });
    const view: FeedTopView = {
        look: usesInvitationLook(document),
        lang: 'en',
        fontFaces: '',
        ctx,
        themeId: document.themeId,
        sections: document.sections,
        frame,
        drawsMiddle: frame.middle.length > 0,
        rsvpMoves: false,
        pageBackground: null,
        backdrop: null,
    };
    // The look straight away, not through FeedTop's lazy load, so a snapshot never catches it loading.
    const Top = view.look ? FeedLookTop : FeedTop;
    return (
        <Top
            view={view}
            mode={mode}
            modeSwitch={mode === 'single' ? undefined : canEdit ? <PageSwitch mode={mode} /> : <FeedModeSwitch mode={mode} onSelect={noop} />}
            editRow={
                canEdit &&
                mode === 'single' && (
                    <div className="mt-3 flex justify-center">
                        <FeedEditPencil onClick={fn()} />
                    </div>
                )
            }
            // The pure row, with no calendar sheet; the frame draws it in Social Feed mode only.
            dateRow={<EventInfo date={Date.UTC(2026, 11, 30)} place="Rhodes" className="mt-3 w-full px-4" />}
            cover={<Box label="Cover + title" />}
            stories={<Box label="Stories" />}
            description={<Box label="Description" />}
            rsvp={<Box label="RSVP" />}
            feedSection={feedSection}
        />
    );
}

const feedSection = (section: InvitationSection) => <Box label={`Feed section: ${section.type}`} />;

const noop = () => undefined;

// A host's switch as the page places it, half over the cover.
const PageSwitch = ({ mode }: { mode: Mode }) => (
    <div className="relative z-10 -mt-4.5 flex justify-center">
        <FeedModeSwitch mode={mode} onSelect={noop} onEdit={fn()} />
    </div>
);

const meta = {
    title: 'Feed/Layout/FeedTop',
    component: TopStory,
    args: { extra: [] },
    parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof TopStory>;

export default meta;
type Story = StoryObj<typeof meta>;

// Every event today: a lone description stays open.
export const DefaultLayout: Story = {};

// With Save my date, before the event day: the invitation, nothing folded.
export const InvitationMode: Story = { args: { extra: [SAMPLE_SECTIONS.dressCode as InvitationSection, SAMPLE_SECTIONS.faq as InvitationSection], mode: 'invitation' } };

// With Save my date, from the event day: stories under the switch (posts follow on the page).
export const FeedMode: Story = { args: { extra: [SAMPLE_SECTIONS.dressCode as InvitationSection], mode: 'feed' } };

const FEED_SECTIONS = [createFeedModeSection('feedSchedule', () => 'schedule'), createFeedModeSection('feedPrompt', () => 'prompt')];

// Feed sections under the stories, never among the invitation's own.
export const FeedModeSections: Story = { args: { extra: [SAMPLE_SECTIONS.dressCode as InvitationSection, ...FEED_SECTIONS], mode: 'feed' } };

export const InvitationModeSections: Story = {
    args: { extra: [SAMPLE_SECTIONS.dressCode as InvitationSection, ...FEED_SECTIONS], mode: 'invitation' },
};

// Without Save my date: the feed sections last, right above the posts. They need no invitation look.
export const OnePageSections: Story = { args: { extra: FEED_SECTIONS } };

// A host's page: the Edit pencil in the switch, or alone under the cover without one.
export const HostInvitationMode: Story = { args: { ...InvitationMode.args, canEdit: true } };
export const HostFeedMode: Story = { args: { ...FeedMode.args, canEdit: true } };
export const HostOnePage: Story = { args: { canEdit: true } };

export const StyledDetails: Story = { args: { styledDetails: true } };

export const AfterTheEvent: Story = {
    args: { extra: [SAMPLE_SECTIONS.dressCode as InvitationSection, SAMPLE_SECTIONS.faq as InvitationSection], ended: true },
};
