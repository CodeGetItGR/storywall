import type { EventDetailResponseDto, VendorRowDto } from '@/lib/api/types';

export const INQUIRY_NOTE_MAX = 500;
const YEARS_AHEAD = 3;

// YYYY-MM-DD for the device's own calendar day, as <input type="date"> expects.
function localIsoDate(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// The dates a guest may ask about: today to three years ahead. The server checks the same range in Athens time.
export function inquiryDateBounds(now: Date = new Date()): { min: string; max: string } {
    const max = new Date(now);
    max.setFullYear(now.getFullYear() + YEARS_AHEAD);
    return { min: localIsoDate(now), max: localIsoDate(max) };
}

// "2027-06-12" → "Jun 12, 2027". A calendar date, so UTC keeps it from moving a day.
export function formatInquiryDate(locale: string, isoDate: string): string {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${isoDate}T00:00:00Z`));
}

const sent = (sentAt: string) => ({ canAsk: false, sentAt });

// The vendor list with one vendor's ask closed.
export function markVendorInquirySent(rows: VendorRowDto[] | undefined, vendorId: string, sentAt: string): VendorRowDto[] | undefined {
    return rows?.map((row) => (row.id === vendorId && row.inquiry ? { ...row, inquiry: sent(sentAt) } : row));
}

// The event with its feed card's ask closed.
export function markCardInquirySent(event: EventDetailResponseDto | undefined, sentAt: string): EventDetailResponseDto | undefined {
    if (!event?.partnerBranding?.inquiry) return event;
    return { ...event, partnerBranding: { ...event.partnerBranding, inquiry: sent(sentAt) } };
}

// Made-up rows behind the locked list on My business. Blurred and hidden from assistive tech; never real data.
export const SAMPLE_INQUIRIES: readonly { guestName: string; eventDate: string }[] = [
    { guestName: 'Maria P.', eventDate: '2027-06-12' },
    { guestName: 'Nikos K.', eventDate: '2027-09-04' },
];

// A mail link with a plain @, which mail apps need. Everything else stays encoded, so a typed address can't add mail
// headers or recipients.
export function inquiryMailHref(email: string): string {
    return `mailto:${encodeURIComponent(email).replaceAll('%40', '@')}`;
}
