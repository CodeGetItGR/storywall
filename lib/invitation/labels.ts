import type { DateLanguage } from '@/lib/invitation/dateDisplay';
import type { InvitationDocument } from '@/lib/invitation/document';

// The invitation's fixed labels (countdown units, calendar and contact
// buttons). They follow the invitation's own language, set on its date
// section, not the guest's app language: a Greek invitation reads ΜΕΡΕΣ for
// every guest.

export type InvitationLabels = {
    calendar: string;
    calendarEventTitle: string;
    addToCalendar: string;
    googleCalendar: string;
    outlookCalendar: string;
    yahooCalendar: string;
    appleCalendar: string;
    countdownDays: string;
    countdownHours: string;
    countdownMinutes: string;
    countdownSeconds: string;
    contactPhone: string;
    contactSms: string;
    contactEmail: string;
    contactFacebook: string;
    contactInstagram: string;
    contactTiktok: string;
};

const SHARED = {
    googleCalendar: 'Google Calendar',
    outlookCalendar: 'Outlook Calendar',
    yahooCalendar: 'Yahoo Calendar',
    appleCalendar: 'Apple Calendar',
    contactEmail: 'Email',
    contactFacebook: 'Facebook',
    contactInstagram: 'Instagram',
    contactTiktok: 'TikTok',
};

export const INVITATION_LABELS: Record<DateLanguage, InvitationLabels> = {
    el: {
        ...SHARED,
        calendar: 'Ημερολόγιο',
        calendarEventTitle: 'Η εκδήλωσή μας',
        addToCalendar: 'Προσθήκη στο ημερολόγιο',
        countdownDays: 'ΜΕΡΕΣ',
        countdownHours: 'ΩΡΕΣ',
        countdownMinutes: 'ΛΕΠΤΑ',
        countdownSeconds: 'ΔΕΥΤ.',
        contactPhone: 'Τηλέφωνο',
        contactSms: 'Μήνυμα',
    },
    en: {
        ...SHARED,
        calendar: 'Calendar',
        calendarEventTitle: 'Our event',
        addToCalendar: 'Add to calendar',
        countdownDays: 'DAYS',
        countdownHours: 'HOURS',
        countdownMinutes: 'MINS',
        countdownSeconds: 'SECS',
        contactPhone: 'Phone',
        contactSms: 'Message',
    },
};

// The first date section's language, hidden or not; Greek without one.
export function invitationLanguage(document: InvitationDocument): DateLanguage {
    const dateSection = document.sections.find((section) => section.type === 'date');
    return dateSection?.type === 'date' && dateSection.data.displayLanguage === 'en' ? 'en' : 'el';
}
