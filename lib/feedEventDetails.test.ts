import { describe, expect, it } from 'vitest';

import type { EventDetailResponseDto } from '@/lib/api/types';
import { feedEventData, feedEventDetails, showsPlaces, withEventDates, withEventDetails } from '@/lib/feedEventDetails';
import { defaultFeedLayout } from '@/lib/feedLayout';
import { dateOnlyEventData, editedTextLock } from '@/lib/invitation/eventLinks';
import { isEmptyForGuests } from '@/lib/invitation/gallery';
import { createSection } from '@/lib/invitation/newSection';
import type { RenderContext } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

const detail = (startAt: string | null, sessions: unknown[] | null = null) =>
    ({
        eventType: 'WEDDING',
        title: 'Maria & Nikos',
        schedule: { startAt, timezone: 'Europe/Athens', rsvpDeadline: null },
        location: { name: 'Town hall', address: 'Square 1', mapsUrl: null },
        modules: [{ moduleKey: 'schedule', isAvailable: true }],
        coverMedia: null,
        sessions,
    }) as unknown as EventDetailResponseDto;

const date = createSection('date', 'WEDDING') as Extract<InvitationSection, { type: 'date' }>;
const layout = { ...defaultFeedLayout(), sections: [...defaultFeedLayout().sections, date] };

describe("the feed's event details (KAN-293)", () => {
    it("writes the event's date into the Date sections, in the venue's time", () => {
        const resolved = withEventDates(layout, feedEventData(detail('2030-06-20T15:30:00Z')));
        const section = resolved.sections.find((item) => item.type === 'date') as typeof date;
        expect(section.data.iso).toBe('2030-06-20T18:30');
        expect(section.data.number).toBe('20');
        expect(section.data.time).toContain('18:30');
    });

    it('leaves the layout as it was without a date or a Date section', () => {
        expect(withEventDates(layout, feedEventData(detail(null)))).toBe(layout);
        const plain = defaultFeedLayout();
        expect(withEventDates(plain, feedEventData(detail('2030-06-20T15:30:00Z')))).toBe(plain);
    });

    it('gives the countdown the event date, and the places', () => {
        const details = feedEventDetails(feedEventData(detail('2030-06-20T15:30:00Z')));
        expect(details.iso).toBe('2030-06-20T18:30');
        expect(details.places.map((place) => place.name)).toEqual(['Town hall']);
        const ctx = withEventDetails({} as RenderContext, details);
        expect(ctx.eventIso).toBe('2030-06-20T18:30');
        expect(ctx.eventDetails).toBe(details);
    });

    it('hides Date and Countdown from guests without the event date, and Places without a place', () => {
        const none = withEventDetails({} as RenderContext, { iso: null, places: [] });
        const some = withEventDetails({} as RenderContext, feedEventDetails(feedEventData(detail('2030-06-20T15:30:00Z'))));
        for (const type of ['date', 'countdown', 'locations'] as const) {
            const section = createSection(type, 'WEDDING');
            expect(isEmptyForGuests(section, none)).toBe(true);
            expect(isEmptyForGuests(section, some)).toBe(false);
            // The Save my date page keeps its own rules.
            expect(isEmptyForGuests(section, {} as RenderContext)).toBe(false);
        }
    });

    it("locks the Date section's words in feed edit mode, and nothing else", () => {
        const event = dateOnlyEventData(feedEventData(detail('2030-06-20T15:30:00Z')));
        const names = createSection('coupleNames', 'WEDDING');
        const document = { ...layout, sections: [...layout.sections, names] };
        expect(editedTextLock(document, { sectionId: date.id, kind: 'field', path: 'month' }, event)).toBe('settings');
        expect(editedTextLock(document, { sectionId: names.id, kind: 'field', path: 'partnerAName' }, event)).toBeNull();
    });

    it('tells when the invitation shows its own Places', () => {
        expect(showsPlaces([createSection('locations', 'WEDDING')])).toBe(true);
        expect(showsPlaces([date])).toBe(false);
    });
});
