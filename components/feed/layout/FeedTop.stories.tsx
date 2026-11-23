import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { FeedLookTop } from '@/components/feed/layout/FeedLookTop';
import { FeedTop } from '@/components/feed/layout/FeedTop';
import type { FeedTopView } from '@/hooks/useFeedTop';
import { defaultFeedLayout, feedFrame, foldsMiddle, usesInvitationLook, wallThemeDesign } from '@/lib/feedLayout';
import { INVITATION_LABELS } from '@/lib/invitation/labels';
import { buildRenderContext } from '@/lib/invitation/render';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';

// Stand-ins for today's feed blocks; their own stories cover how they look.
const Box = ({ label }: { label: string }) => <div className="mx-4 my-3 rounded-xl bg-surface-muted p-4 text-sm text-ink">{label}</div>;

type StoryArgs = { extra: InvitationSection[]; ended?: boolean; styledDetails?: boolean };

function TopStory({ extra, ended = false, styledDetails = false }: StoryArgs) {
    const [open, setOpen] = useState(false);
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
        folds: foldsMiddle(frame.middle.length),
        open,
        toggle: () => setOpen((current) => !current),
        drawsMiddle: frame.middle.length > 0 && (!foldsMiddle(frame.middle.length) || open),
        pageBackground: null,
        backdrop: null,
    };
    // The look straight away, not through FeedTop's lazy load, so a snapshot never catches it loading.
    const Top = view.look ? FeedLookTop : FeedTop;
    return (
        <Top
            view={view}
            cover={<Box label="Cover + title" />}
            stories={<Box label="Stories" />}
            description={<Box label="Description" />}
            rsvp={<Box label="RSVP" />}
        />
    );
}

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

export const Folded: Story = {
    args: { extra: [SAMPLE_SECTIONS.dressCode as InvitationSection, SAMPLE_SECTIONS.faq as InvitationSection] },
};

export const Opened: Story = {
    args: Folded.args,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { expanded: false }));
        await expect(canvas.getByText('Description')).toBeVisible();
    },
};

export const StyledDetails: Story = { args: { styledDetails: true } };

export const AfterTheEvent: Story = { args: { ...Folded.args, ended: true } };
