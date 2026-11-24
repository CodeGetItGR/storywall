import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useQueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { type ReactNode, useState } from 'react';
import { fn, userEvent, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { storyEvent, storyHostMember, storyModules, storyPhotos } from '@/.storybook/fixtures';
import { FeedEditTop } from '@/components/feed/edit/FeedEditTop';
import { EventDescription } from '@/components/feed/EventDescription';
import { EventInfo } from '@/components/feed/EventInfo';
import { FeedCoverBlock } from '@/components/feed/layout/FeedCoverBlock';
import type { EventDetailResponseDto, FeedLayoutDto } from '@/lib/api/types';
import type { FeedEditScope } from '@/lib/feedEditing';
import { defaultFeedLayout, feedLayoutKeys } from '@/lib/feedLayout';
import type { FeedPageMode } from '@/lib/feedMode';
import { feedModuleSection } from '@/lib/feedModuleBlocks';
import { createFeedModeSection } from '@/lib/feedSections';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';
import { cn } from '@/lib/utils';
import { FeedEditorFlagProvider } from '@/providers/FeedEditorFlagProvider';

// Stand-ins for today's feed blocks; their own stories cover how they look.
const Box = ({ label, className }: { label: string; className?: string }) => (
    <div className={cn('mx-4 my-3 rounded-xl bg-surface-muted p-4 text-sm text-ink', className)}>{label}</div>
);

// Clear of the block's tools.
const UNDER_TOOLS = 'py-12 text-center';

const PHOTOS: Record<string, string> = {
    florals: '/images/post-florals.png',
    cake: '/images/post-cake.png',
    flowers: '/images/post-flowers.png',
};

const sectionsWith = (promptText: string): InvitationSection[] => [
    createFeedModeSection('feedSchedule', () => 'schedule'),
    { ...createFeedModeSection('feedPrompt', () => 'prompt'), data: { text: promptText } } as InvitationSection,
    {
        ...createFeedModeSection('feedPinned', () => 'pinned'),
        data: { photos: Object.keys(PHOTOS).map((mediaId) => ({ id: mediaId, image: { source: 'media', mediaId } })) },
    } as InvitationSection,
];

// The saved layout, already in the cache when edit mode opens.
function Saved({ event, sections, children }: { event: EventDetailResponseDto; sections: InvitationSection[]; children: ReactNode }) {
    const queryClient = useQueryClient();
    useState(() => {
        const base = defaultFeedLayout();
        const layout: FeedLayoutDto = {
            themeSlug: null,
            revision: 1,
            document: { ...base, sections: [...base.sections, ...sections] },
            design: null,
            imageUrls: PHOTOS,
            updatedAt: '2026-06-01T10:00:00Z',
        };
        queryClient.setQueryData(feedLayoutKeys.detail(event.id), layout);
        return true;
    });
    return <FeedEditorFlagProvider enabled>{children}</FeedEditorFlagProvider>;
}

type EditArgs = { event: EventDetailResponseDto; sections: InvitationSection[]; mode: FeedPageMode; scope: FeedEditScope };

function EditStory({ event, sections, mode, scope }: EditArgs) {
    return (
        <Saved event={event} sections={sections}>
            <FeedEditTop
                event={event}
                mode={mode}
                scope={scope}
                guest={{ cover: <FeedCoverBlock event={event} isHost={false} wishlist={false} />, rsvp: <Box label="RSVP" /> }}
                onDone={fn()}
                cover={<FeedCoverBlock event={event} isHost wishlist={false} editing />}
                dateRow={<EventInfo date={Date.UTC(2026, 6, 4)} place="Rhodes" className="mt-3 w-full px-4" />}
                stories={<Box label="Stories" />}
                description={<EventDescription eventId={event.id} description={event.description ?? ''} keepShown />}
                rsvp={<Box label="RSVP" className={mode === 'invitation' ? UNDER_TOOLS : undefined} />}
            />
        </Saved>
    );
}

const withSaveMyDate = storyEvent({ modules: storyModules(['posts', 'stories', 'save_my_date']) });

// Also shows how each feed section sits under its tools.
const meta = {
    title: 'Feed/Edit/FeedEditTop',
    component: EditStory,
    args: { event: withSaveMyDate, sections: [], mode: 'feed', scope: 'all' },
    parameters: { layout: 'fullscreen', app: { event: withSaveMyDate, member: storyHostMember } },
    beforeEach({ msw }) {
        msw.use(
            http.get('*/api/invitation-*', () => HttpResponse.json([])),
            http.get('*/gift-account', () => new HttpResponse(null, { status: 404 })),
        );
    },
    decorators: [
        withAppContext,
        (Story) => (
            <div className="mx-auto max-w-2xl bg-event pb-6">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof EditStory>;

export default meta;
type Story = StoryObj<typeof meta>;

// Feed mode: its sections under the stories, each with its tools, then Add section.
export const FeedMode: Story = {
    render: (args, { globals }) => <EditStory {...args} sections={sectionsWith(copyFor(globals).FeedSections.prompt.placeholder)} />,
};

// Invitation mode: a Save my date block, and a module block with its tools inside the card.
const withModules = storyEvent({ modules: storyModules(['posts', 'stories', 'save_my_date', 'quiz_polls']) });

export const InvitationMode: Story = {
    args: {
        event: withModules,
        mode: 'invitation',
        sections: [{ ...(SAMPLE_SECTIONS.dressCode as InvitationSection), id: 'dress' }, feedModuleSection('quiz_polls', () => 'quiz')],
    },
    parameters: { app: { event: withModules, member: storyHostMember } },
};

const withoutSaveMyDate = storyEvent({ modules: storyModules(['posts', 'stories', 'rsvp']) });

// A cover photo, at 360 px.
export const FeedModeNarrow: Story = {
    args: { event: storyEvent({ modules: withSaveMyDate.modules, coverMedia: storyPhotos[0] }) },
    tags: ['visual-mobile-only'],
    decorators: [
        (Story) => (
            <div className="w-[360px]">
                <Story />
            </div>
        ),
    ],
    render: (args, { globals }) => <EditStory {...args} sections={sectionsWith(copyFor(globals).FeedSections.prompt.placeholder)} />,
};

// Without Save my date, on the one page: no Theme, and tools on the feed sections only.
export const WithoutSaveMyDate: Story = {
    args: { event: withoutSaveMyDate, mode: 'single', scope: 'feedSections' },
    parameters: { app: { event: withoutSaveMyDate, member: storyHostMember } },
    render: (args, { globals }) => (
        <EditStory {...args} sections={[sectionsWith(copyFor(globals).FeedSections.prompt.placeholder)[1], createFeedModeSection('feedPinned')]} />
    ),
};

// The eye: as guests will see it, the hidden section gone with the tools.
export const Preview: Story = {
    render: (args, { globals }) => {
        const [schedule, prompt, pinned] = sectionsWith(copyFor(globals).FeedSections.prompt.placeholder);
        return <EditStory {...args} sections={[schedule, { ...prompt, visible: false }, pinned]} />;
    },
    play: async ({ canvasElement, globals }) => {
        await userEvent.click(await within(canvasElement).findByRole('button', { name: copyFor(globals).InvitationEditor.preview }));
    },
};

// Just added: nothing to show yet, so each one is drawn by its name.
export const FeedModeEmptySections: Story = {
    args: { sections: [createFeedModeSection('feedPrompt', () => 'prompt'), createFeedModeSection('feedPinned', () => 'pinned')] },
};
