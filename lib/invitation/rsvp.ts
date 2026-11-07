// The invitation's RSVP form: what a guest can pick and what it sends.

// The same limits as the backend's RsvpLimits.
export const RSVP_MAX_ADULTS = 5;
export const RSVP_MAX_CHILDREN = 4;
export const RSVP_DEFAULT_ADULTS = 2;
export const RSVP_DEFAULT_CHILDREN = 1;

export type RsvpReply = {
    guestName: string;
    phone: string;
    email: string;
    attending: boolean;
    adultsCount: number;
    childrenCount: number;
    note: string;
};

export type RsvpSender = (reply: RsvpReply) => Promise<void>;

// 1..max, or 0..max for children.
export function rsvpCountOptions(from: number, max: number): number[] {
    return Array.from({ length: max - from + 1 }, (_, index) => from + index);
}

const field = (form: FormData, name: string) => String(form.get(name) ?? '').trim();

const clampCount = (value: string, min: number, max: number) => Math.min(max, Math.max(min, Number(value) || min));

export type RsvpFormResult = { reply: RsvpReply } | { missing: 'name' | 'phone' };

// Reads the form. Someone not attending sends no headcount.
export function readRsvpForm(form: FormData): RsvpFormResult {
    const guestName = field(form, 'guestName');
    const phone = field(form, 'phone');
    if (!guestName) return { missing: 'name' };
    if (!phone) return { missing: 'phone' };

    const attending = field(form, 'attendance') !== 'declined';
    return {
        reply: {
            guestName,
            phone,
            email: field(form, 'email'),
            attending,
            adultsCount: attending ? clampCount(field(form, 'adultsCount'), 1, RSVP_MAX_ADULTS) : 0,
            childrenCount: attending ? clampCount(field(form, 'childrenCount'), 0, RSVP_MAX_CHILDREN) : 0,
            note: field(form, 'note'),
        },
    };
}
