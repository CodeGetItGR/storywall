import type { InvitationSection } from '@/lib/invitation/sections';

// The date section's display rules (old wedartDateDisplayModel and
// wedartDateCalendarHtml). `iso` is the one source of truth; the labels are
// the host's own words, so JUNE, ΙΟΥΝΙΟΣ or Juin never break the countdown or
// the calendar links.

type DateData = Extract<InvitationSection, { type: 'date' }>['data'];

export type DateLanguage = DateData['displayLanguage'];

// Defaults in the invitation's own language, not the app's: they are part
// of the host's content.
const DISPLAY_NAMES: Record<DateLanguage, { months: string[]; weekdays: string[]; period: string }> = {
    el: {
        months: ['Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'],
        weekdays: ['ΚΥΡ', 'ΔΕΥ', 'ΤΡΙ', 'ΤΕΤ', 'ΠΕΜ', 'ΠΑΡ', 'ΣΑΒ'],
        period: 'ΤΟ ΑΠΟΓΕΥΜΑ',
    },
    en: {
        months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        weekdays: ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'],
        period: 'IN THE AFTERNOON',
    },
};

const FALLBACK_ISO = '2026-07-12T18:00';

export type DateDisplayModel = {
    lang: DateLanguage;
    year: number;
    monthIndex: number;
    dayNum: number;
    monthName: string;
    monthNumber: string;
    yearLabel: string;
    yearShort: string;
    weekday: string;
    number: string;
    monthGenitive: string;
    time: string;
    periodLabel: string;
};

// The date and time as written, with no time zone: the invitation always
// shows the venue's own time.
export function isoParts(iso: string): { year: number; month: number; day: number; hour: number; minute: number } | undefined {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
    if (!match) return undefined;
    const [year, month, day, hour, minute] = match.slice(1).map(Number);
    return { year, month, day, hour, minute };
}

export function dateDisplayModel(data: DateData): DateDisplayModel {
    const lang = data.displayLanguage === 'en' ? 'en' : 'el';
    const names = DISPLAY_NAMES[lang];
    const raw = data.iso || FALLBACK_ISO;
    const parts = isoParts(raw);
    const year = parts?.year ?? 2026;
    const monthIndex = parts ? parts.month - 1 : 6;
    const dayNum = parts?.day ?? 12;
    const legacyMonth = data.month.replace(/\s+\d{4}\s*$/, '').trim();
    const monthName = data.monthName || legacyMonth || names.months[monthIndex];
    return {
        lang,
        year,
        monthIndex,
        dayNum,
        monthName,
        monthNumber: data.monthNumber || String(monthIndex + 1).padStart(2, '0'),
        yearLabel: data.yearLabel || String(year),
        yearShort: data.yearShort || String(year).slice(-2),
        weekday: data.day,
        number: data.number || String(dayNum),
        monthGenitive: data.monthGenitive || legacyMonth || monthName,
        time: data.time || raw.slice(11, 16) || '18:00',
        periodLabel: data.periodLabel || names.period,
    };
}

// Capitals without accents, as Greek typesetting writes them.
export function upperWithoutAccents(value: string): string {
    return value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ς/g, 'Σ').toUpperCase();
}

export type CalendarCell = { value: number; adjacent: boolean; event: boolean };

// A six-week month grid. Greek calendars start on Monday, English ones on Sunday.
export function calendarMonth(model: DateDisplayModel): { headings: string[]; cells: CalendarCell[] } {
    const startDow = model.lang === 'el' ? 1 : 0;
    const firstDow = new Date(model.year, model.monthIndex, 1).getDay();
    const offset = (firstDow - startDow + 7) % 7;
    const daysThis = new Date(model.year, model.monthIndex + 1, 0).getDate();
    const daysPrev = new Date(model.year, model.monthIndex, 0).getDate();
    const weekdays = DISPLAY_NAMES[model.lang].weekdays;
    const headings = Array.from({ length: 7 }, (_, i) => weekdays[(startDow + i) % 7]);
    const cells = Array.from({ length: 42 }, (_, i): CalendarCell => {
        const n = i - offset + 1;
        if (n < 1) return { value: daysPrev + n, adjacent: true, event: false };
        if (n > daysThis) return { value: n - daysThis, adjacent: true, event: false };
        return { value: n, adjacent: false, event: n === model.dayNum };
    });
    return { headings, cells };
}

// Date fields whose class makes them title text, and those shown in capitals.
const DATE_TITLE_CLASS = /(?:date-preset-number|date-preset-time|date-triple-number|date-calendar-month|date-calendar-year|date-original-number|date-original-time)/;
const DATE_UPPER_CLASS = /(?:date-preset-label|date-period|date-original-month)/;

export function dateFieldIsTitle(className: string): boolean {
    return DATE_TITLE_CLASS.test(className);
}

export function dateFieldIsUpper(className: string): boolean {
    return DATE_UPPER_CLASS.test(className);
}
