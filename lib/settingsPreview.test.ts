import { describe, expect, it } from 'vitest';

import { storyEvent, storyModules } from '@/.storybook/fixtures';
import type { EventCapabilitiesDto } from '@/lib/api/types';
import { changedTextFields, formatPreviewDateTime, getSettingsParts, showsVenuePart } from '@/lib/settingsPreview';

const LITE: EventCapabilitiesDto = {
    kind: 'LITE',
    home: 'GALLERY',
    takesGuests: false,
    hasSchedule: false,
    showsDetailsSettings: false,
    showsShareLinks: false,
    showsGuestCode: true,
    guestCodeActions: [],
};

describe('getSettingsParts', () => {
    it('shows every part on a full event', () => {
        expect(getSettingsParts(storyEvent())).toEqual(['cover', 'title', 'date', 'location', 'description']);
    });

    it('leaves out the date and place on a lite event', () => {
        expect(getSettingsParts(storyEvent({ capabilities: LITE }))).toEqual(['cover', 'title', 'description']);
    });
});

describe('showsVenuePart', () => {
    it('shows for a wedding with the schedule', () => {
        expect(showsVenuePart(storyEvent())).toBe(true);
    });

    it('shows for a baptism', () => {
        expect(showsVenuePart(storyEvent({ eventType: 'BAPTISM' }))).toBe(true);
    });

    it('hides for event types without a venue', () => {
        expect(showsVenuePart(storyEvent({ eventType: 'BIRTHDAY' }))).toBe(false);
    });

    it('hides when the plan has no schedule', () => {
        expect(showsVenuePart(storyEvent({ modules: storyModules(['posts', 'rsvp']) }))).toBe(false);
    });

    it('hides on a lite event', () => {
        expect(showsVenuePart(storyEvent({ capabilities: LITE }))).toBe(false);
    });
});

describe('changedTextFields', () => {
    it('keeps only the trimmed fields that changed', () => {
        expect(
            changedTextFields(
                { locationName: ' Ktima Lena ', locationAddress: 'Marathonos 12', mapsUrl: '' },
                { locationName: 'Santorini', locationAddress: 'Marathonos 12', mapsUrl: '' },
            ),
        ).toEqual({ locationName: 'Ktima Lena' });
    });

    it('is empty when nothing changed', () => {
        expect(changedTextFields({ title: 'Eleni & Nikos ' }, { title: 'Eleni & Nikos' })).toEqual({});
    });
});

describe('formatPreviewDateTime', () => {
    it('joins the date and time in the event time zone', () => {
        const formatted = formatPreviewDateTime('en', '2026-07-04T15:00:00Z', 'Europe/Athens');
        // 15:00 UTC is 18:00 in Athens in July.
        expect(formatted).toMatch(/6:00|18:00/);
        expect(formatted).toContain(' · ');
    });

    it('is null without a date', () => {
        expect(formatPreviewDateTime('en', null, 'Europe/Athens')).toBeNull();
    });
});
