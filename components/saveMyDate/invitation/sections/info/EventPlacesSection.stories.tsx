import '@/components/saveMyDate/invitation/invitation.css';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { storyEvent, storyModules, storySession } from '@/.storybook/fixtures';
import { STORY_THEME, storyInvitationMedia, storySection } from '@/.storybook/invitation';
import { INVITATION_FONT_CLASSES } from '@/components/saveMyDate/invitation/invitationFonts';
import { InvitationSection } from '@/components/saveMyDate/invitation/InvitationSection';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { feedEventData, feedEventDetails, withEventDates, withEventDetails } from '@/lib/feedEventDetails';
import type { InvitationDocument } from '@/lib/invitation/document';
import { buildRenderContext, themeCssVars } from '@/lib/invitation/render';
import { SAMPLE_DOCUMENT } from '@/lib/invitation/samples';

// The feed's Date, Countdown and Places, drawn from the event as useFeedTop draws them (KAN-293).
type Args = { event: EventDetailResponseDto };

const withSchedule = (sessions: EventDetailResponseDto['sessions']) =>
    storyEvent({ sessions, modules: storyModules(['posts', 'stories', 'save_my_date', 'rsvp', 'schedule']) });

const threePlaces = withSchedule([
    storySession({ locationAddress: 'Oia, Santorini' }),
    storySession({ id: 'ses-photos', title: 'Photos', startAt: '2026-07-04T16:30:00Z', isMain: false, locationName: 'Oia castle', displayOrder: 1 }),
    storySession({ id: 'ses-party', title: 'Reception', startAt: '2026-07-04T18:00:00Z', isMain: false, locationName: 'Villa Rosa', displayOrder: 2 }),
    storySession({ id: 'ses-dance', title: 'Party', startAt: '2026-07-04T22:00:00Z', isMain: false, locationName: 'Villa Rosa', displayOrder: 3 }),
]);
const onePlace = withSchedule([storySession({ locationAddress: 'Oia, Santorini' })]);
// Without the Schedule module the backend sends no sessions: the event's own place shows.
const noSessions = storyEvent({ location: { name: 'Santorini town hall', address: 'Fira, Santorini', mapsUrl: null } });

function Page({ event }: Args) {
    const data = feedEventData(event);
    const document: InvitationDocument = withEventDates(
        { ...SAMPLE_DOCUMENT, sections: [storySection('date'), storySection('countdown'), storySection('locations')] },
        data,
    );
    const ctx = withEventDetails(buildRenderContext(document, STORY_THEME, storyInvitationMedia), feedEventDetails(data));
    return (
        <div className={`smd-invitation ${INVITATION_FONT_CLASSES}`} style={themeCssVars(ctx)}>
            {/* Sections */}
            {document.sections.map((section, index) => (
                <InvitationSection key={section.id} section={section} index={index} ctx={ctx} />
            ))}
        </div>
    );
}

const meta = {
    title: 'SaveMyDate/Info/EventPlacesSection',
    component: Page,
    parameters: { layout: 'fullscreen' },
    args: { event: threePlaces },
} satisfies Meta<typeof Page>;

export default meta;
type Story = StoryObj<typeof meta>;

// Each place once, in the schedule's order, with the sessions held there.
export const ThreePlaces: Story = { tags: ['visual-desktop-only'] };
export const ThreePlacesMobile: Story = { tags: ['visual-mobile-only'] };

// One place takes the whole width.
export const OnePlace: Story = { tags: ['visual-desktop-only'], args: { event: onePlace } };
export const OnePlaceMobile: Story = { tags: ['visual-mobile-only'], args: { event: onePlace } };

export const EventPlaceOnly: Story = { tags: ['visual-desktop-only'], args: { event: noSessions } };
