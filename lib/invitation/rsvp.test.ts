import { describe, expect, it } from 'vitest';

import { isRsvpPhone, readRsvpForm, rsvpCountOptions, type RsvpReply, rsvpRequestBody, rsvpSessionField } from '@/lib/invitation/rsvp';

function form(values: Record<string, string>) {
    const data = new FormData();
    Object.entries(values).forEach(([key, value]) => data.set(key, value));
    return data;
}

const filled = {
    guestName: ' Μαρία ',
    phone: ' 694 123 4567 ',
    email: ' m@example.com ',
    attendance: 'both',
    adultCount: '2',
    childCount: '1',
    notes: ' Γεια ',
    website: '',
};

describe('readRsvpForm', () => {
    it('reads a trimmed reply in the shape the backend takes', () => {
        expect(readRsvpForm(form(filled))).toEqual({
            reply: {
                guestName: 'Μαρία',
                attendanceStatus: 'ATTENDING',
                phone: '694 123 4567',
                email: 'm@example.com',
                adultCount: 2,
                childCount: 1,
                notes: 'Γεια',
                website: '',
            },
        });
    });

    it('asks for the name, then the phone, then a phone that can be called', () => {
        expect(readRsvpForm(form({ ...filled, guestName: '  ' }))).toEqual({ problem: 'name-missing' });
        expect(readRsvpForm(form({ ...filled, phone: '  ' }))).toEqual({ problem: 'phone-missing' });
        expect(readRsvpForm(form({ ...filled, phone: '12345' }))).toEqual({ problem: 'phone-invalid' });
    });

    it('sends no headcount for someone not attending', () => {
        const result = readRsvpForm(form({ ...filled, attendance: 'declined' }));
        expect(result).toMatchObject({ reply: { attendanceStatus: 'DECLINED', adultCount: 0, childCount: 0 } });
    });

    it('keeps counts within the limits', () => {
        const result = readRsvpForm(form({ ...filled, adultCount: '9', childCount: '9' }));
        expect(result).toMatchObject({ reply: { adultCount: 5, childCount: 4 } });
        const low = readRsvpForm(form({ ...filled, adultCount: '0', childCount: '-2' }));
        expect(low).toMatchObject({ reply: { adultCount: 1, childCount: 0 } });
    });

    it('passes the honeypot on as it was filled, so the backend can drop the reply', () => {
        expect(readRsvpForm(form({ ...filled, website: 'spam.example' }))).toMatchObject({ reply: { website: 'spam.example' } });
    });

    describe('with sessions that ask for an answer', () => {
        const sessions = ['s1', 's2'];
        const answered = { ...filled, [rsvpSessionField('s1')]: 'yes', [rsvpSessionField('s2')]: 'no' };

        it('sends an answer for each one', () => {
            expect(readRsvpForm(form(answered), sessions)).toMatchObject({
                reply: { sessionAnswers: [{ sessionId: 's1', attending: true }, { sessionId: 's2', attending: false }] },
            });
        });

        it('asks for every one before sending', () => {
            expect(readRsvpForm(form({ ...filled, [rsvpSessionField('s1')]: 'yes' }), sessions)).toEqual({ problem: 'sessions-missing' });
        });

        it('asks about none, and sends none, for someone not attending', () => {
            const result = readRsvpForm(form({ ...filled, attendance: 'declined' }), sessions);
            expect(result).toHaveProperty('reply');
            expect(result).not.toHaveProperty('reply.sessionAnswers');
        });
    });
});

describe('isRsvpPhone', () => {
    it.each(['6941234567', '+30 694 123 4567', '(210) 123-4567', '210.123.4567', '210/1234567'])('accepts %s', (phone) => {
        expect(isRsvpPhone(phone)).toBe(true);
    });

    it.each(['123456', '1234567890123456', '694 123 456a', `69412345${' '.repeat(50)}`])('refuses %j', (phone) => {
        expect(isRsvpPhone(phone)).toBe(false);
    });
});

describe('rsvpRequestBody', () => {
    const reply: RsvpReply = {
        guestName: 'Maria',
        attendanceStatus: 'ATTENDING',
        phone: '6941234567',
        email: '',
        adultCount: 2,
        childCount: 1,
        notes: '',
        website: '',
    };

    it('keeps a reply the form made as it is', () => {
        expect(rsvpRequestBody(reply)).toEqual(reply);
    });

    it('keeps only the backend fields, within its limits', () => {
        const tampered = { ...reply, guestName: 'x'.repeat(200), adultCount: 99, childCount: -1, extra: 'drop me', attendanceStatus: 'MAYBE' };
        const body = rsvpRequestBody(tampered as unknown as RsvpReply);
        expect(body).not.toHaveProperty('extra');
        expect(body).toMatchObject({ attendanceStatus: 'ATTENDING', adultCount: 5, childCount: 0 });
        expect(body.guestName).toHaveLength(150);
    });

    it('turns anything that is not text or a whole number into an empty value', () => {
        const odd = { ...reply, phone: 42, notes: null, adultCount: '3', childCount: 1.5 };
        expect(rsvpRequestBody(odd as unknown as RsvpReply)).toMatchObject({ phone: '', notes: '', adultCount: 0, childCount: 0 });
    });

    it('keeps session answers the backend reads, and no more than it takes', () => {
        const id = '0b0c1f9e-3c1a-4d55-9d1e-6a2c4b9f7a10';
        const answers = [
            { sessionId: id, attending: true, extra: 1 },
            { sessionId: 'not-an-id', attending: true },
            { sessionId: id, attending: 'yes' },
            ...Array.from({ length: 120 }, () => ({ sessionId: id, attending: false })),
        ];
        const body = rsvpRequestBody({ ...reply, sessionAnswers: answers } as unknown as RsvpReply);
        expect(body.sessionAnswers?.[0]).toEqual({ sessionId: id, attending: true });
        expect(body.sessionAnswers).toHaveLength(100);
        expect(rsvpRequestBody({ ...reply, sessionAnswers: 'all' } as unknown as RsvpReply).sessionAnswers).toEqual([]);
    });
});

describe('rsvpCountOptions', () => {
    it('lists each choice', () => {
        expect(rsvpCountOptions(1, 5)).toEqual([1, 2, 3, 4, 5]);
        expect(rsvpCountOptions(0, 4)).toEqual([0, 1, 2, 3, 4]);
    });
});
