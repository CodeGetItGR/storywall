import { describe, expect, it } from 'vitest';

import { createEventTypePhoto, getCreateEventCatalogEntry, getInitialSessionTitleKey } from '@/lib/createEventCatalog';
import { featurePriority } from '@/lib/createEventFeatures';
import { OCCASIONS } from '@/lib/occasions/occasions';
import en from '@/messages/en.json';
import el from '@/messages/el.json';

// Spec 2026-11-26-graduation-event-type-design.md §4.3, §8.
describe('the GRADUATION type', () => {
    it('has a ceremony first and a dinner second, with its own form labels', () => {
        const entry = getCreateEventCatalogEntry('GRADUATION');
        expect(entry).toEqual({
            startAtLabelKey: 'fieldLabels.GRADUATION.startAt',
            initialSessionTitleKey: 'initialSessions.GRADUATION.title',
            secondarySessionTitleKey: 'secondarySessions.GRADUATION.title',
        });
        expect(getInitialSessionTitleKey('GRADUATION')).toBe('initialSessions.GRADUATION.title');
        expect(en.CreateEventPage.initialSessions.GRADUATION.title).toBe('Ceremony');
        expect(el.CreateEventPage.initialSessions.GRADUATION.title).toBe('Ορκωμοσία');
        expect(en.CreateEventPage.secondarySessions.GRADUATION.title).toBe('Dinner');
        expect(el.CreateEventPage.secondarySessions.GRADUATION.title).toBe('Δείπνο');
        expect(en.CreateEventPage.fieldLabels.GRADUATION).toEqual({
            title: 'Event name',
            startAt: 'Ceremony date',
            locationName: 'Ceremony location',
        });
        expect(el.CreateEventPage.fieldLabels.GRADUATION).toEqual({
            title: 'Όνομα εκδήλωσης',
            startAt: 'Ημερομηνία ορκωμοσίας',
            locationName: 'Τοποθεσία ορκωμοσίας',
        });
    });

    it("uses REUNION's photo until an admin uploads one", () => {
        expect(createEventTypePhoto('GRADUATION', null)).toBe('/landing/friends-and-family-celebrating-at-sunset.webp');
        expect(createEventTypePhoto('GRADUATION', 'https://cdn.test/g.webp')).toBe('https://cdn.test/g.webp');
    });

    it('shows its features in the approved order', () => {
        expect(featurePriority('GRADUATION')).toEqual(['gallery', 'wishbook', 'rsvp', 'stories', 'co_hosts', 'schedule', 'posts']);
    });

    it('has an occasion entry that is not ready', () => {
        expect(OCCASIONS.find((occasion) => occasion.eventType === 'GRADUATION')).toEqual({
            eventType: 'GRADUATION',
            slugs: { en: 'graduations', el: 'apofoitisi' },
            ready: false,
            launched: false,
        });
    });
});
