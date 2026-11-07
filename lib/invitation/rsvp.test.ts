import { describe, expect, it } from 'vitest';

import { readRsvpForm, rsvpCountOptions } from '@/lib/invitation/rsvp';

function form(values: Record<string, string>) {
    const data = new FormData();
    Object.entries(values).forEach(([key, value]) => data.set(key, value));
    return data;
}

const filled = { guestName: ' Μαρία ', phone: ' 6900000000 ', email: ' m@example.com ', attendance: 'both', adultsCount: '2', childrenCount: '1', note: ' Γεια ' };

describe('readRsvpForm', () => {
    it('reads a trimmed reply', () => {
        expect(readRsvpForm(form(filled))).toEqual({
            reply: { guestName: 'Μαρία', phone: '6900000000', email: 'm@example.com', attending: true, adultsCount: 2, childrenCount: 1, note: 'Γεια' },
        });
    });

    it('asks for the name, then the phone', () => {
        expect(readRsvpForm(form({ ...filled, guestName: '  ' }))).toEqual({ missing: 'name' });
        expect(readRsvpForm(form({ ...filled, phone: '  ' }))).toEqual({ missing: 'phone' });
    });

    it('sends no headcount for someone not attending', () => {
        const result = readRsvpForm(form({ ...filled, attendance: 'declined' }));
        expect(result).toMatchObject({ reply: { attending: false, adultsCount: 0, childrenCount: 0 } });
    });

    it('keeps counts within the limits', () => {
        const result = readRsvpForm(form({ ...filled, adultsCount: '9', childrenCount: '9' }));
        expect(result).toMatchObject({ reply: { adultsCount: 5, childrenCount: 4 } });
        const low = readRsvpForm(form({ ...filled, adultsCount: '0', childrenCount: '-2' }));
        expect(low).toMatchObject({ reply: { adultsCount: 1, childrenCount: 0 } });
    });
});

describe('rsvpCountOptions', () => {
    it('lists each choice', () => {
        expect(rsvpCountOptions(1, 5)).toEqual([1, 2, 3, 4, 5]);
        expect(rsvpCountOptions(0, 4)).toEqual([0, 1, 2, 3, 4]);
    });
});
