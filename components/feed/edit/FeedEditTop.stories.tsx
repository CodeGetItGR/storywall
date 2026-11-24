import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useQueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { type ReactNode, useState } from 'react';
import { fn } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { storyEvent, storyHostMember, storyModules } from '@/.storybook/fixtures';
import { FeedEditTop } from '@/components/feed/edit/FeedEditTop';
import { EventInfo } from '@/components/feed/EventInfo';
import type { EventDetailResponseDto, FeedLayoutDto } from '@/lib/api/types';
import { defaultFeedLayout, feedLayoutKeys } from '@/lib/feedLayout';
import type { FeedPageMode } from '@/lib/feedMode';
import { createFeedModeSection } from '@/lib/feedSections';
import type { InvitationSection } from '@/lib/invitation/sections';
import { FeedEditorFlagProvider } from '@/providers/FeedEditorFlagProvider';

// Stand-ins for today's feed blocks; their own stories cover how they look.
const Box = ({ label }: { label: string }) => <div className="mx-4 my-3 rounded-xl bg-surface-muted p-4 text-sm text-ink">{label}</div>;

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

type EditArgs = { event: EventDetailResponseDto; sections: InvitationSection[]; mode: FeedPageMode };

function EditStory({ event, sections, mode }: EditArgs) {
    return (
        <Saved event={event} sections={sections}>
            <FeedEditTop
                event={event}
                mode={mode}
                onDone={fn()}
                cover={<Box label="Cover + title" />}
                dateRow={<EventInfo date={Date.UTC(2026, 6, 4)} place="Rhodes" className="mt-3 w-full px-4" />}
                stories={<Box label="Stories" />}
                description={<Box label="Description" />}
                rsvp={<Box label="RSVP" />}
            />
        </Saved>
    );
}

const withSaveMyDate = storyEvent({ modules: storyModules(['posts', 'stories', 'save_my_date']) });

// Also shows how each feed section sits under its tools.
const meta = {
    title: 'Feed/Edit/FeedEditTop',
    component: EditStory,
    args: { event: withSaveMyDate, sections: [], mode: 'feed' },
    parameters: { layout: 'fullscreen', app: { event: withSaveMyDate, member: storyHostMember } },
    beforeEach({ msw }) {
        msw.use(http.get('*/api/invitation-*', () => HttpResponse.json([])));
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

// Just added: nothing to show yet, so each one is drawn by its name.
export const FeedModeEmptySections: Story = {
    args: { sections: [createFeedModeSection('feedPrompt', () => 'prompt'), createFeedModeSection('feedPinned', () => 'pinned')] },
};
