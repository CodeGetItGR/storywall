// The invitation's RSVP form: what a guest can pick and what it sends.

// The same limits as the backend's RsvpLimits.
export const RSVP_MAX_ADULTS = 5;
export const RSVP_MAX_CHILDREN = 4;
export const RSVP_DEFAULT_ADULTS = 2;
export const RSVP_DEFAULT_CHILDREN = 1;

// The backend's field limits for a reply from the guests' page.
export const RSVP_MAX_NAME = 150;
export const RSVP_MAX_PHONE = 50;
export const RSVP_MAX_EMAIL = 255;
export const RSVP_MAX_NOTES = 500;

// The hidden field a person never fills in. A bot that fills it gets the
// same answer as a guest, and nothing is saved.
export const RSVP_HONEYPOT_FIELD = 'website';

export type RsvpAttendance = 'ATTENDING' | 'DECLINED';

// What POST /api/public/invitations/{slug}/rsvp takes.
export type RsvpReply = {
    guestName: string;
    attendanceStatus: RsvpAttendance;
    phone: string;
    email: string;
    adultCount: number;
    childCount: number;
    notes: string;
    website: string;
};

// How a send ended: saved, a message for the guest, or the invitation is
// gone (unknown or offline) and the page should reload to say so.
export type RsvpOutcome = { ok: true } | { ok: false; message: string } | { ok: false; reload: true };

export type RsvpSender = (reply: RsvpReply) => Promise<RsvpOutcome>;

// 1..max, or 0..max for children.
export function rsvpCountOptions(from: number, max: number): number[] {
    return Array.from({ length: max - from + 1 }, (_, index) => from + index);
}

// The backend's phone rule: digits, spaces and + ( ) . / -, with 7 to 15 digits.
export function isRsvpPhone(phone: string): boolean {
    if (phone.length > RSVP_MAX_PHONE || !/^[\d\s+().\/-]+$/.test(phone)) return false;
    const digits = phone.replace(/\D/g, '').length;
    return digits >= 7 && digits <= 15;
}

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.slice(0, max) : '');
const count = (value: unknown, max: number) => (typeof value === 'number' && Number.isInteger(value) ? Math.min(max, Math.max(0, value)) : 0);

// A reply as it arrived from the browser, cut down to the fields and sizes the
// backend takes, so the server sends nothing else.
export function rsvpRequestBody(reply: RsvpReply): RsvpReply {
    return {
        guestName: text(reply.guestName, RSVP_MAX_NAME),
        attendanceStatus: reply.attendanceStatus === 'DECLINED' ? 'DECLINED' : 'ATTENDING',
        phone: text(reply.phone, RSVP_MAX_PHONE),
        email: text(reply.email, RSVP_MAX_EMAIL),
        adultCount: count(reply.adultCount, RSVP_MAX_ADULTS),
        childCount: count(reply.childCount, RSVP_MAX_CHILDREN),
        notes: text(reply.notes, RSVP_MAX_NOTES),
        website: text(reply.website, RSVP_MAX_NAME),
    };
}

const field = (form: FormData, name: string) => String(form.get(name) ?? '').trim();

const clampCount = (value: string, min: number, max: number) => Math.min(max, Math.max(min, Number(value) || min));

export type RsvpFormProblem = 'name-missing' | 'phone-missing' | 'phone-invalid';

export type RsvpFormResult = { reply: RsvpReply } | { problem: RsvpFormProblem };

// Reads the form. Someone not attending sends no headcount.
export function readRsvpForm(form: FormData): RsvpFormResult {
    const guestName = field(form, 'guestName');
    const phone = field(form, 'phone');
    if (!guestName) return { problem: 'name-missing' };
    if (!phone) return { problem: 'phone-missing' };
    if (!isRsvpPhone(phone)) return { problem: 'phone-invalid' };

    const attending = field(form, 'attendance') !== 'declined';
    return {
        reply: {
            guestName,
            attendanceStatus: attending ? 'ATTENDING' : 'DECLINED',
            phone,
            email: field(form, 'email'),
            adultCount: attending ? clampCount(field(form, 'adultCount'), 1, RSVP_MAX_ADULTS) : 0,
            childCount: attending ? clampCount(field(form, 'childCount'), 0, RSVP_MAX_CHILDREN) : 0,
            notes: field(form, 'notes'),
            website: String(form.get(RSVP_HONEYPOT_FIELD) ?? ''),
        },
    };
}
