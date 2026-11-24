import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse } from 'msw';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { storyEvent, storyHostMember, storyModules } from '@/.storybook/fixtures';
import { FeedAddSectionSheet } from '@/components/feed/edit/FeedAddSectionSheet';
import { useFeedInvitationAddItems } from '@/hooks/useFeedInvitationAddItems';
import { useFeedModeAddItems } from '@/hooks/useFeedModeAddItems';
import type { EventDetailResponseDto, EventTypeConvention } from '@/lib/api/types';
import { feedAddList } from '@/lib/feedAddList';
import { defaultFeedLayout, wallThemeDesign } from '@/lib/feedLayout';
import { buildFeedSectionPreviews } from '@/lib/feedSectionPreview';
import type { NewSectionType } from '@/lib/invitation/newSection';
import { FEED_MODE_SECTION_TYPES, type FeedModeSectionType } from '@/lib/invitation/sections';

// The wall theme: no Save my date samples, so every row previews a new section.
const previews = (types: NewSectionType[], eventType: string) =>
    buildFeedSectionPreviews({
        types,
        document: defaultFeedLayout(),
        theme: wallThemeDesign(null),
        media: () => undefined,
        eventType,
        samples: null,
        fonts: [],
        locale: 'en',
    });
const listFor = (eventType: string) => feedAddList(defaultFeedLayout(), eventType, []);

type InvitationArgs = { eventType: EventTypeConvention; types: NewSectionType[]; onAdd: () => void; onClose: () => void };

// Invitation mode's list, as edit mode hands it to the sheet.
function InvitationSheet({ eventType, types, onAdd, onClose }: InvitationArgs) {
    const items = useFeedInvitationAddItems(previews(types, eventType), eventType);
    return <FeedAddSectionSheet kind="invitation" open items={items} tiles={null} onAdd={onAdd} onClose={onClose} />;
}

const noMedia = () => undefined;

type FeedArgs = { event: EventDetailResponseDto; types: readonly FeedModeSectionType[] };

// Feed mode's list. Also shows FeedModeSectionPicture, in the eye's window.
function FeedSheet({ event, types }: FeedArgs) {
    const items = useFeedModeAddItems(event, types, noMedia, true);
    return <FeedAddSectionSheet kind="feed" open items={items} tiles={null} onAdd={fn()} onClose={fn()} />;
}

const boyOrGirl = storyEvent({
    eventType: 'GENDER_REVEAL',
    title: 'Baby Alexiou',
    modules: storyModules(['posts', 'stories', 'gallery', 'he_or_she']),
});

const meta = {
    title: 'Feed/Edit/FeedAddSectionSheet',
    component: InvitationSheet,
    args: { eventType: 'WEDDING', types: listFor('WEDDING'), onAdd: fn(), onClose: fn() },
    decorators: [withAppContext],
} satisfies Meta<typeof InvitationSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

// The eye opens the section's preview in a small window.
const openPreview = async (name: string, copy: ReturnType<typeof copyFor>['InvitationEditor']) => {
    const page = within(document.body);
    await userEvent.click(await page.findByRole('button', { name: `${copy.preview}: ${name}` }));
    const dialog = await page.findByRole('dialog', { name }, { timeout: 10_000 });
    // The popup fades and scales in.
    await waitFor(() => expect(dialog).toBeVisible(), { timeout: 10_000 });
};

export const Wedding: Story = {};
export const Baptism: Story = { args: { eventType: 'BAPTISM', types: listFor('BAPTISM') } };
export const NothingLeft: Story = { args: { types: [] } };

export const PreviewOpen: Story = {
    args: { types: ['faq', 'dressCode'] },
    play: async ({ globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        await openPreview(copy.sectionNames.faq, copy);
    },
};

const feedStory = (types: readonly FeedModeSectionType[]): Story => ({
    parameters: { app: { event: boyOrGirl, member: storyHostMember } },
    beforeEach({ msw }) {
        msw.use(
            http.get('*/api/events/:eventId/he-or-she', () =>
                HttpResponse.json({
                    status: 'OPEN',
                    closesAt: '2026-06-18T20:30:00Z',
                    canGuess: false,
                    myGuess: null,
                    tally: { he: 8, she: 12 },
                    questions: [],
                    myAnswers: {},
                }),
            ),
        );
    },
    render: () => <FeedSheet event={boyOrGirl} types={types} />,
});

const feedPreview = (type: 'feedSchedule' | 'feedPrompt' | 'feedPinned'): Story => ({
    ...feedStory(FEED_MODE_SECTION_TYPES),
    play: async ({ globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        await openPreview(copy.sectionNames[type], copy);
    },
});

// Feed mode: its own sections only, with no intro and no Premium.
export const FeedMode: Story = feedStory(FEED_MODE_SECTION_TYPES);
export const FeedModePreviewSchedule: Story = feedPreview('feedSchedule');
export const FeedModePreviewPrompt: Story = feedPreview('feedPrompt');
export const FeedModePreviewPinned: Story = feedPreview('feedPinned');
