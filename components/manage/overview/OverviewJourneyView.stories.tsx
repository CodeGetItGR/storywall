import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { STORY_EVENT_ID } from '@/.storybook/fixtures';
import { OverviewJourneyView } from '@/components/manage/overview/OverviewJourneyView';
import type { JourneyTotal, QuickTool } from '@/hooks/useDayJourney';
import type { PhaseStep } from '@/hooks/useEventJourneyPhase';
import type { OverviewPlanLine } from '@/hooks/useOverviewPlanLine';
import type { JourneyStopModel } from '@/lib/eventJourney';
import { routes } from '@/lib/routes';

const settingsHref = routes.events.manage(STORY_EVENT_ID, { tab: 'settings' });
const billingHref = routes.events.manage(STORY_EVENT_ID, { tab: 'billing' });
const rsvpHref = routes.events.manage(STORY_EVENT_ID, { tab: 'rsvp' });
const scheduleHref = routes.events.tools.schedule(STORY_EVENT_ID);
const giftHref = routes.events.tools.gifts(STORY_EVENT_ID);
const qrHref = routes.events.invitationsQr(STORY_EVENT_ID);
const galleryHref = routes.events.tools.gallery(STORY_EVENT_ID);

const beforeSteps: PhaseStep[] = [
    { phase: 'before', label: 'Before', caption: '12 days to go', state: 'current' },
    { phase: 'day', label: 'On the day', caption: 'Sat 27 Jun', state: 'upcoming' },
    { phase: 'after', label: 'After', caption: 'From 28 Jun', state: 'upcoming' },
];

const daySteps: PhaseStep[] = [
    { phase: 'before', label: 'Before', caption: 'Done', state: 'done' },
    { phase: 'day', label: 'On the day', caption: 'Today', state: 'current' },
    { phase: 'after', label: 'After', caption: 'From 16 Jun', state: 'upcoming' },
];

const afterSteps: PhaseStep[] = [
    { phase: 'before', label: 'Before', caption: 'Done', state: 'done' },
    { phase: 'day', label: 'On the day', caption: 'Sat 13 Jun', state: 'done' },
    { phase: 'after', label: 'After', caption: 'From 14 Jun', state: 'current' },
];

const detailsStop: JourneyStopModel = {
    key: 'details',
    title: 'Event details',
    icon: 'details',
    status: 'done',
    href: settingsHref,
    detail: 'Edit event details',
    links: [{ key: 'venue', label: 'Edit venue details', href: routes.events.tools.schedule(STORY_EVENT_ID, { section: 'venue-session' }) }],
};

const rsvpStop: JourneyStopModel = {
    key: 'rsvp',
    title: 'RSVP',
    icon: 'rsvp',
    status: 'done',
    href: rsvpHref,
    chips: [
        { key: 'attending', label: '42 Attending', tone: 'success' },
        { key: 'declined', label: '5 Declined', tone: 'neutral' },
        { key: 'noResponse', label: '11 No response', tone: 'warn' },
        { key: 'seats', label: '64 seats', tone: 'neutral' },
    ],
};

const beforeStops: JourneyStopModel[] = [
    detailsStop,
    rsvpStop,
    {
        key: 'schedule',
        title: 'Schedule',
        icon: 'schedule',
        status: 'current',
        href: scheduleHref,
        highlight: 'Add sessions',
        links: [],
        card: { body: 'Add the parts of your day so guests know when to come.', action: { label: 'Add sessions', href: scheduleHref } },
    },
    {
        key: 'giftAccount',
        title: 'Gift account',
        icon: 'gift',
        status: 'upcoming',
        href: giftHref,
        links: [{ key: 'action', label: 'Add gift account', href: giftHref }],
    },
    {
        key: 'invitations',
        title: 'Invitations & QR codes',
        icon: 'invitations',
        status: 'upcoming',
        href: qrHref,
        detail: '58 of 100 members',
        links: [{ key: 'action', label: 'Go to QR links', href: qrHref }],
    },
];

const allDoneStops: JourneyStopModel[] = [
    detailsStop,
    rsvpStop,
    { key: 'schedule', title: 'Schedule', icon: 'schedule', status: 'done', href: scheduleHref, detail: '3 sessions' },
    { key: 'giftAccount', title: 'Gift account', icon: 'gift', status: 'done', href: giftHref },
    { key: 'invitations', title: 'Invitations & QR codes', icon: 'invitations', status: 'done', href: qrHref, detail: '58 of 100 members' },
];

const dayStops: JourneyStopModel[] = [
    { key: 'session-ceremony', title: 'Ceremony', icon: 'session', status: 'done', href: scheduleHref, detail: '18:00' },
    { key: 'session-reception', title: 'Reception', icon: 'session', status: 'current', href: scheduleHref, highlight: 'Now', badge: '20:30' },
    { key: 'session-party', title: 'Party', icon: 'session', status: 'upcoming', href: scheduleHref, detail: '23:00' },
];

const tools: QuickTool[] = [
    { key: 'invitationsQr', label: 'Share links', href: qrHref, icon: 'invitations' },
    { key: 'announcement', label: 'Announcement', href: routes.events.feed(STORY_EVENT_ID, { compose: 'announcement' }), icon: 'announcement' },
    { key: 'playlist', label: 'Playlist', href: routes.events.tools.playlist(STORY_EVENT_ID), icon: 'playlist' },
];

const totals: JourneyTotal[] = [
    { key: 'media', icon: 'media', value: 14, label: 'Media' },
    { key: 'wishbook', icon: 'wishbook', value: 3, label: 'Wishbook' },
];

const afterStops: JourneyStopModel[] = [
    {
        key: 'media',
        title: 'Media',
        icon: 'media',
        status: 'current',
        href: galleryHref,
        detail: '128 images · 6 videos',
        card: { action: { label: 'Download all', href: galleryHref } },
    },
    {
        key: 'wishbook',
        title: 'Wishbook',
        icon: 'wishbook',
        status: 'upcoming',
        href: routes.events.tools.wishbook(STORY_EVENT_ID),
        detail: '24 messages',
    },
    {
        key: 'announcement',
        title: 'Announcement',
        icon: 'announcement',
        status: 'upcoming',
        href: routes.events.feed(STORY_EVENT_ID, { compose: 'announcement' }),
        detail: 'Thank your guests',
    },
    {
        key: 'plan',
        title: 'Premium',
        icon: 'plan',
        status: 'upcoming',
        href: billingHref,
        detail: 'Coverage ends 13 Sep',
        links: [{ key: 'extend', label: 'Extend', href: billingHref }],
    },
];

const planLine: OverviewPlanLine = {
    planName: 'Premium',
    usage: '1.2 GB of 10 GB',
    percent: 12,
    href: billingHref,
    showPro: false,
    proUsedBytes: 0,
    proAllowanceBytes: 0,
};

const meta = {
    title: 'Manage/Overview/OverviewJourneyView',
    component: OverviewJourneyView,
    decorators: [
        withAppContext,
        (Story) => (
            <div className="bg-event p-4">
                <Story />
            </div>
        ),
    ],
    args: {
        labels: { getReady: 'Get ready', day: 'On the day', afterEvent: 'After the event' },
        steps: beforeSteps,
        selected: 'before',
        onSelectPhase: fn(),
        before: { stops: beforeStops, allDone: false, printHref: qrHref },
        day: { stops: dayStops, tools, totals },
        after: { stops: afterStops },
        planLine,
    },
} satisfies Meta<typeof OverviewJourneyView>;

export default meta;
type Story = StoryObj<typeof meta>;

// Before: details and RSVP done, Schedule current, the rest to come.
export const BeforeMobile: Story = {
    tags: ['visual-mobile-only'],
    globals: { viewport: { value: 'mobile' } },
};

export const BeforeDesktop: Story = {
    tags: ['visual-desktop-only'],
};

// Every setup stop done: the All set card replaces the current card.
export const AllSetMobile: Story = {
    tags: ['visual-mobile-only'],
    globals: { viewport: { value: 'mobile' } },
    args: { before: { stops: allDoneStops, allDone: true, printHref: qrHref } },
};

// On the day: Reception running now, with the quick tools and totals.
export const OnTheDayMobile: Story = {
    tags: ['visual-mobile-only'],
    globals: { viewport: { value: 'mobile' } },
    args: { steps: daySteps, selected: 'day' },
};

export const OnTheDayDesktop: Story = {
    tags: ['visual-desktop-only'],
    args: { steps: daySteps, selected: 'day' },
};

// After: Media current with Download all, then Wishbook, Announcement and the plan.
export const AfterMobile: Story = {
    tags: ['visual-mobile-only'],
    globals: { viewport: { value: 'mobile' } },
    args: { steps: afterSteps, selected: 'after' },
};

export const AfterDesktop: Story = {
    tags: ['visual-desktop-only'],
    args: { steps: afterSteps, selected: 'after' },
};

// A lite event without a date: no phases, one path from its details to its media, wishbook and plan.
const undatedArgs = {
    undated: true,
    steps: [],
    before: { stops: [{ ...detailsStop, links: [] }], allDone: true, printHref: galleryHref },
    after: { stops: afterStops.filter((stop) => stop.key !== 'announcement') },
};

export const UndatedMobile: Story = {
    tags: ['visual-mobile-only'],
    globals: { viewport: { value: 'mobile' } },
    args: undatedArgs,
};

export const UndatedDesktop: Story = {
    tags: ['visual-desktop-only'],
    args: undatedArgs,
};
