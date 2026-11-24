import '@/components/event/feedBackdrop.css';

import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useQueryClient } from '@tanstack/react-query';
import { type CSSProperties, useState } from 'react';
import { fn } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { storyEvent, storyHostMember, storyMember, storyModules, storySession } from '@/.storybook/fixtures';
import { FeedEditBlock } from '@/components/feed/edit/FeedEditBlock';
import { FeedTop } from '@/components/feed/layout/FeedTop';
import { useFeedEditSectionPart } from '@/hooks/useFeedEditSectionPart';
import { useFeedModuleBlockPart } from '@/hooks/useFeedModuleBlockPart';
import { useFeedSectionPart } from '@/hooks/useFeedSectionPart';
import { useFeedTop } from '@/hooks/useFeedTop';
import type { EventDetailResponseDto, EventSessionResponseDto, FeedLayoutDto } from '@/lib/api/types';
import { eventThemeStyle } from '@/lib/eventTheme';
import { defaultFeedLayout, feedLayoutKeys } from '@/lib/feedLayout';
import type { FeedPageMode } from '@/lib/feedMode';
import { feedModuleSection } from '@/lib/feedModuleBlocks';
import { feedBackdropClassName, feedBackdropStyle } from '@/lib/feedPageBackdrop';
import { drawsCard } from '@/lib/feedSchedule';
import { createFeedModeSection } from '@/lib/feedSections';
import type { InvitationSection } from '@/lib/invitation/sections';
import { cn } from '@/lib/utils';
import { FeedEditorFlagProvider } from '@/providers/FeedEditorFlagProvider';

// Stand-ins for the blocks around it, so a gap left by a missing one would show.
const Box = ({ label }: { label: string }) => <div className="mx-4 my-3 rounded-xl bg-surface-muted p-4 text-sm text-ink">{label}</div>;

const block = feedModuleSection('schedule', () => 'module');
const todays = createFeedModeSection('feedSchedule', () => 'today');
const SECTIONS: InvitationSection[] = [block, todays];

function eventWith(sessions: EventSessionResponseDto[]): EventDetailResponseDto {
    const event = storyEvent({ sessions, modules: storyModules(['posts', 'stories', 'save_my_date', 'rsvp', 'schedule']) });
    return { ...event, schedule: { ...event.schedule, startAt: '2026-06-15T08:00:00Z', endAt: null } };
}

// Around the story clock (2026-06-15 12:00 UTC, 15:00 in Athens): one over, one on now, one to come.
const firstDay = [
    storySession({ startAt: '2026-06-15T08:00:00Z', endAt: '2026-06-15T09:30:00Z', rsvpEnabled: true }),
    storySession({
        id: 'ses-lunch',
        title: 'Lunch',
        startAt: '2026-06-15T11:00:00Z',
        endAt: '2026-06-15T13:30:00Z',
        locationName: 'Ktima Orizontes',
    }),
    storySession({ id: 'ses-party', title: 'Party', startAt: '2026-06-15T18:00:00Z', locationName: null, rsvpEnabled: true }),
];
const none = eventWith([]);
const oneDay = eventWith(firstDay);
const severalDays = eventWith([
    ...firstDay,
    storySession({ id: 'ses-brunch', title: 'Brunch by the sea', startAt: '2026-06-16T08:00:00Z', locationName: 'Ktima Orizontes' }),
    storySession({ id: 'ses-boat', title: 'Boat trip', startAt: '2026-06-17T07:00:00Z', locationName: 'Mandraki harbour' }),
]);

type PageArgs = { event: EventDetailResponseDto; mode: FeedPageMode; editing?: boolean; backdrop?: boolean };

function Page({ event, mode, editing = false, backdrop = false }: PageArgs) {
    const queryClient = useQueryClient();
    useState(() => {
        const base = defaultFeedLayout();
        const layout: FeedLayoutDto = {
            themeSlug: null,
            revision: 1,
            document: { ...base, sections: [...base.sections, ...SECTIONS] },
            design: null,
            imageUrls: {},
            updatedAt: '2026-06-01T10:00:00Z',
        };
        queryClient.setQueryData(feedLayoutKeys.detail(event.id), layout);
        return true;
    });
    return (
        <FeedEditorFlagProvider enabled>
            {editing ? <EditBlocks event={event} mode={mode} /> : <Feed event={event} mode={mode} backdrop={backdrop} />}
        </FeedEditorFlagProvider>
    );
}

const PAGE = {
    color: '#dfe9e4',
    cardColor: '#f2f6f4',
    image: { desktop: '/storybook-assets/light-photo.jpg', mobile: '/storybook-assets/light-photo.jpg' },
    size: '100% auto',
    repeat: 'repeat-y',
    position: 'center top',
    tiled: false,
    fixed: false,
};

function Feed({ event, mode, backdrop }: PageArgs) {
    const view = useFeedTop(event);
    const moduleBlock = useFeedModuleBlockPart(event);
    const feedSection = useFeedSectionPart(event, view.ctx.media);
    const style = backdrop
        ? ({ ...eventThemeStyle(PAGE.color, { cardColor: PAGE.cardColor }), ...feedBackdropStyle(PAGE) } as CSSProperties)
        : undefined;
    return (
        <div className={cn('bg-event', backdrop && feedBackdropClassName(PAGE))} style={style}>
            <FeedTop
                view={view}
                mode={mode}
                cover={<Box label="Cover + title" />}
                stories={<Box label="Stories" />}
                description={<Box label="Description" />}
                rsvp={<Box label="RSVP" />}
                moduleBlock={moduleBlock}
                feedSection={feedSection}
            />
            <Box label="Posts" />
        </div>
    );
}

const controls = { canHide: true, canDelete: true, movable: true, canMoveUp: true, canMoveDown: true };
const actions = { onToggleVisible: fn(), onDelete: fn(), onOpenSettings: fn(), onMenuOpenChange: fn() };

// The block alone under its tools; edit mode's whole page is in FeedEditTop's stories.
function EditBlocks({ event, mode }: PageArgs) {
    const moduleBlock = useFeedModuleBlockPart(event, true);
    const feedSection = useFeedEditSectionPart(event, () => undefined);
    const section = mode === 'feed' ? todays : block;
    const onCard = drawsCard(section, event);
    const content = mode === 'feed' ? feedSection(section) : moduleBlock(section);
    return (
        <DndContext>
            <SortableContext items={[section.id]}>
                <FeedEditBlock section={section} name="Schedule" controls={controls} hasSettings={false} actions={actions} onCard={onCard}>
                    <div className={mode === 'feed' && !onCard ? 'pt-15' : undefined}>{content}</div>
                </FeedEditBlock>
            </SortableContext>
        </DndContext>
    );
}

// Also shows FeedScheduleTimeline and FeedScheduleRow.
const meta = {
    title: 'Feed/Sections/FeedScheduleBlock',
    component: Page,
    args: { event: oneDay, mode: 'invitation' },
    parameters: { layout: 'fullscreen', app: { member: storyMember() } },
    decorators: [
        withAppContext,
        (Story) => (
            <div className="mx-auto max-w-2xl bg-event">
                <Story />
            </div>
        ),
    ],
    render: (args) => <Page {...args} />,
} satisfies Meta<PageArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

const host = { app: { member: storyHostMember } };
const mobile = { viewport: { value: 'mobile' } };

// Guests with no sessions: nothing between the blocks around it.
export const NoneGuest: Story = { args: { event: none } };
export const NoneGuestMobile: Story = { ...NoneGuest, globals: mobile };

// The host's card, opening the editor.
export const NoneHost: Story = { args: { event: none }, parameters: host };
export const NoneHostMobile: Story = { ...NoneHost, globals: mobile };

export const OneDayGuest: Story = {};
export const OneDayGuestMobile: Story = { ...OneDayGuest, globals: mobile };

// No RSVP buttons for hosts.
export const OneDayHost: Story = { parameters: host };
export const OneDayHostMobile: Story = { ...OneDayHost, globals: mobile };

export const SeveralDaysGuest: Story = { args: { event: severalDays } };
export const SeveralDaysGuestMobile: Story = { ...SeveralDaysGuest, globals: mobile };

export const SeveralDaysHost: Story = { args: { event: severalDays }, parameters: host };
export const SeveralDaysHostMobile: Story = { ...SeveralDaysHost, globals: mobile };

// On a light page picture, as a Save my date theme draws one. Dark ones are KAN-278.
export const OnThemePicture: Story = { args: { event: severalDays, backdrop: true } };

// Today's schedule in Social Feed mode, with no sessions.
export const TodayNoneGuest: Story = { args: { event: none, mode: 'feed' } };
export const TodayNoneHost: Story = { args: { event: none, mode: 'feed' }, parameters: host };
export const TodayNoneHostMobile: Story = { ...TodayNoneHost, globals: mobile };

// Edit mode: the tools over the timeline, or inside the card.
export const EditTimeline: Story = { args: { event: severalDays, editing: true }, parameters: host };
export const EditTimelineMobile: Story = { ...EditTimeline, globals: mobile };
export const EditCard: Story = { args: { event: none, editing: true }, parameters: host };
export const EditTodayCard: Story = { args: { event: none, editing: true, mode: 'feed' }, parameters: host };
export const EditTodayCardMobile: Story = { ...EditTodayCard, globals: mobile };
