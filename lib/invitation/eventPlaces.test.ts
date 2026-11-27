import { describe, expect, it } from 'vitest';

import type { InvitationEventData, InvitationEventSession } from '@/lib/invitation/eventLinks';
import { eventPlaces } from '@/lib/invitation/eventPlaces';

const session = (id: string, startAt: string | null, place: Partial<InvitationEventSession> = {}): InvitationEventSession => ({
    id,
    title: id,
    description: null,
    startAt,
    locationName: null,
    locationAddress: null,
    mapsUrl: null,
    displayOrder: 0,
    isMain: false,
    isSecondary: false,
    ...place,
});

const event = (sessions: InvitationEventSession[] | null, location: InvitationEventData['location'] = { name: null, address: null, mapsUrl: null }) =>
    ({ eventType: 'WEDDING', title: 'A & B', timezone: 'Europe/Athens', startAt: null, rsvp: null, cover: null, location, sessions, joinUrl: null }) as InvitationEventData;

const church = { locationName: 'St. Nicholas', locationAddress: 'Pine 1, Athens' };
const villa = { locationName: 'Villa Rosa', locationAddress: 'Sea road 4', mapsUrl: 'https://maps.example/villa' };

describe('eventPlaces', () => {
    it('lists each session with a place, in time order, with the sessions held there', () => {
        const places = eventPlaces(
            event([
                session('Party', '2030-06-20T18:00:00Z', villa),
                session('Ceremony', '2030-06-20T15:00:00Z', church),
                session('Dinner', '2030-06-20T20:00:00Z', { ...villa, locationName: ' villa  rosa ', locationAddress: 'SEA ROAD 4' }),
                session('Photos', '2030-06-20T16:00:00Z'),
            ]),
        );
        expect(places.map(({ sessions, name, address, mapUrl }) => ({ sessions, name, address, mapUrl }))).toEqual([
            {
                sessions: ['Ceremony'],
                name: 'St. Nicholas',
                address: 'Pine 1, Athens',
                mapUrl: 'https://www.google.com/maps/search/?api=1&query=St.%20Nicholas%2C%20Pine%201%2C%20Athens',
            },
            { sessions: ['Party', 'Dinner'], name: 'Villa Rosa', address: 'Sea road 4', mapUrl: 'https://maps.example/villa' },
        ]);
    });

    it("puts sessions without a time last, in the event's order", () => {
        const places = eventPlaces(
            event([
                session('Later', null, { ...villa, displayOrder: 2 }),
                session('Sooner', null, { ...church, displayOrder: 1 }),
                session('Timed', '2030-06-20T15:00:00Z', { locationName: 'Town hall' }),
            ]),
        );
        expect(places.map((place) => place.name)).toEqual(['Town hall', 'St. Nicholas', 'Villa Rosa']);
    });

    it("gives the main session the event's address when it has none", () => {
        const [place] = eventPlaces(
            event([session('Ceremony', null, { locationName: 'St. Nicholas', isMain: true })], { name: 'St. Nicholas', address: 'Pine 1', mapsUrl: null }),
        );
        expect(place.address).toBe('Pine 1');
    });

    it("shows the event's own place without sessions, or without one at a place", () => {
        const location = { name: 'Town hall', address: 'Square 1', mapsUrl: 'https://maps.example/hall' };
        const own = [{ key: 'town hall|square 1', sessions: [], name: 'Town hall', address: 'Square 1', mapUrl: 'https://maps.example/hall' }];
        expect(eventPlaces(event(null, location))).toEqual(own);
        expect(eventPlaces(event([session('Party', '2030-06-20T18:00:00Z')], location))).toEqual(own);
    });

    it('has nothing without any place', () => {
        expect(eventPlaces(event(null))).toEqual([]);
        expect(eventPlaces(event([session('Party', null)]))).toEqual([]);
    });
});
