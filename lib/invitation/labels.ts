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
    parents: string;
    godparents: string;
    photoAlt: string;
    eventPhotoAlt: string;
    galleryPhotoAlt: string;
    galleryDot: string;
    previousPhoto: string;
    nextPhoto: string;
    close: string;
    map: string;
    website: string;
    copy: string;
    copied: string;
    rsvpName: string;
    rsvpPhone: string;
    rsvpEmail: string;
    rsvpAttend: string;
    rsvpYes: string;
    rsvpNo: string;
    rsvpAdults: string;
    rsvpChildren: string;
    rsvpNotes: string;
    rsvpPlaceholder: string;
    rsvpSubmit: string;
    rsvpSending: string;
    rsvpThanks: string;
    rsvpError: string;
    rsvpNameMissing: string;
    rsvpPhoneMissing: string;
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
    rsvpEmail: 'Email',
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
        parents: 'Γονείς',
        godparents: 'Νονοί',
        photoAlt: 'Φωτογραφία προσώπου',
        eventPhotoAlt: 'Φωτογραφία της εκδήλωσης',
        galleryPhotoAlt: 'Φωτογραφία {n} από {total}',
        galleryDot: 'Φωτογραφία {n}',
        previousPhoto: 'Προηγούμενη φωτογραφία',
        nextPhoto: 'Επόμενη φωτογραφία',
        close: 'Κλείσιμο',
        map: 'Χάρτης',
        website: 'Ιστοσελίδα',
        copy: 'Αντιγραφή',
        copied: 'Αντιγράφηκε ✓',
        rsvpName: 'Ονοματεπώνυμο *',
        rsvpPhone: 'Τηλέφωνο επικοινωνίας *',
        rsvpAttend: 'Θα παραστείτε; *',
        rsvpYes: 'Ναι, θα παραστώ',
        rsvpNo: 'Δυστυχώς δεν θα μπορέσω',
        rsvpAdults: 'Ενήλικοι',
        rsvpChildren: 'Παιδιά',
        rsvpNotes: 'Παρατηρήσεις',
        rsvpPlaceholder: 'Η απάντησή σας',
        rsvpSubmit: 'Υποβολή',
        rsvpSending: 'Αποστολή...',
        rsvpThanks: 'Ευχαριστούμε για την απάντηση σας',
        rsvpError: 'Κάτι πήγε στραβά — δοκιμάστε ξανά.',
        rsvpNameMissing: 'Συμπλήρωσε το ονοματεπώνυμό σου.',
        rsvpPhoneMissing: 'Συμπλήρωσε το τηλέφωνο επικοινωνίας.',
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
        parents: 'Parents',
        godparents: 'Godparents',
        photoAlt: 'Photo of a person',
        eventPhotoAlt: 'Event photo',
        galleryPhotoAlt: 'Photo {n} of {total}',
        galleryDot: 'Photo {n}',
        previousPhoto: 'Previous photo',
        nextPhoto: 'Next photo',
        close: 'Close',
        map: 'Map',
        website: 'Website',
        copy: 'Copy',
        copied: 'Copied ✓',
        rsvpName: 'Full name *',
        rsvpPhone: 'Contact phone *',
        rsvpAttend: 'Will you attend? *',
        rsvpYes: 'Yes, I will attend',
        rsvpNo: "Sorry, I can't make it",
        rsvpAdults: 'Adults',
        rsvpChildren: 'Children',
        rsvpNotes: 'Notes',
        rsvpPlaceholder: 'Your answer',
        rsvpSubmit: 'Submit',
        rsvpSending: 'Sending...',
        rsvpThanks: 'Thank you for your reply',
        rsvpError: 'Something went wrong. Please try again.',
        rsvpNameMissing: 'Fill in your full name.',
        rsvpPhoneMissing: 'Fill in your contact phone.',
    },
};

// The first date section's language, hidden or not; Greek without one.
export function invitationLanguage(document: InvitationDocument): DateLanguage {
    const dateSection = document.sections.find((section) => section.type === 'date');
    return dateSection?.type === 'date' && dateSection.data.displayLanguage === 'en' ? 'en' : 'el';
}
