import { describe, expect, it } from 'vitest';

import { calendarIcs, calendarLinks } from '@/lib/invitation/calendarLinks';
import { contactLinks } from '@/lib/invitation/contactLinks';
import { COUNTDOWN_ZERO, countdownParts } from '@/lib/invitation/countdown';
import {
    calendarMonth,
    dateDisplayModel,
    dateFieldIsTitle,
    dateFieldIsUpper,
    isoParts,
    upperWithoutAccents,
} from '@/lib/invitation/dateDisplay';
import { buildRenderContext } from '@/lib/invitation/render';
import { SAMPLE_DOCUMENT, SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
import { contactVars, countdownVars, faqVars, fieldTextRole, footerTextCss } from '@/lib/invitation/sectionCss';

const ctx = buildRenderContext(SAMPLE_DOCUMENT, SAMPLE_THEME, (id) => `https://cdn.test/${id}`);
const dateData = SAMPLE_SECTIONS.date.data;

describe('dateDisplayModel', () => {
    it('reads the date from iso and keeps the host labels', () => {
        const model = dateDisplayModel(dateData);
        expect(model).toMatchObject({ lang: 'el', year: 2026, monthIndex: 6, dayNum: 12, monthName: 'Ιούλιος', weekday: 'Κυριακή' });
        expect(model.monthGenitive).toBe('Ιουλίου');
    });

    it('fills empty labels in the invitation language', () => {
        const model = dateDisplayModel({ ...dateData, displayLanguage: 'en', month: '', monthName: '', monthNumber: '', periodLabel: undefined });
        expect(model.monthName).toBe('July');
        expect(model.monthNumber).toBe('07');
        expect(model.periodLabel).toBe('IN THE AFTERNOON');
    });

    it('rejects a malformed iso', () => {
        expect(isoParts('12/07/2026')).toBeUndefined();
    });
});

describe('upperWithoutAccents', () => {
    it('drops Greek accents and final sigma', () => {
        expect(upperWithoutAccents('Κυριακής Ιουλίου')).toBe('ΚΥΡΙΑΚΗΣ ΙΟΥΛΙΟΥ');
    });
});

describe('calendarMonth', () => {
    it('starts Greek weeks on Monday and marks the event day', () => {
        const { headings, cells } = calendarMonth(dateDisplayModel(dateData));
        expect(headings[0]).toBe('ΔΕΥ');
        expect(cells).toHaveLength(42);
        // 1 July 2026 is a Wednesday: two days of June come first.
        expect(cells.slice(0, 3).map((cell) => [cell.value, cell.adjacent])).toEqual([[29, true], [30, true], [1, false]]);
        expect(cells.filter((cell) => cell.event).map((cell) => cell.value)).toEqual([12]);
    });

    it('starts English weeks on Sunday', () => {
        const { headings, cells } = calendarMonth(dateDisplayModel({ ...dateData, displayLanguage: 'en' }));
        expect(headings[0]).toBe('SU');
        expect(cells[3]).toEqual({ value: 1, adjacent: false, event: false });
    });
});

describe('date field classes', () => {
    it('knows title and capital fields', () => {
        expect(dateFieldIsTitle('date-preset-number')).toBe(true);
        expect(dateFieldIsTitle('date-preset-label')).toBe(false);
        expect(dateFieldIsUpper('date-preset-label')).toBe(true);
    });
});

describe('calendarLinks', () => {
    it('builds floating two-hour links', () => {
        const links = calendarLinks('2026-07-12T18:00', 'Our event');
        expect(links?.google).toContain('text=Our%20event&dates=20260712T180000/20260712T200000');
        expect(links?.outlook).toContain('enddt=2026-07-12T20%3A00%3A00');
        expect(links?.yahoo).toContain('st=20260712T180000&dur=0200');
    });

    it('rolls a late event into the next day', () => {
        expect(calendarLinks('2026-12-31T23:30', 'x')?.google).toContain('dates=20261231T233000/20270101T013000');
    });

    it('has no links without a valid date', () => {
        expect(calendarLinks('', 'x')).toBeUndefined();
        expect(calendarIcs('', 'x')).toBeUndefined();
    });

    it('escapes the ics summary', () => {
        const ics = calendarIcs('2026-07-12T18:00', 'A, B; C');
        expect(ics).toContain('SUMMARY:A\\, B\\; C');
        expect(ics).toContain('DTEND:20260712T200000');
    });
});

describe('countdownParts', () => {
    it('counts down to the local date', () => {
        const now = new Date('2026-07-10T16:30:15').getTime();
        expect(countdownParts('2026-07-12T18:00', now)).toEqual({ days: '2', hours: '01', mins: '29', secs: '45' });
    });

    it('stops at zero once the date has passed', () => {
        expect(countdownParts('2026-07-12T18:00', new Date('2026-08-01T00:00').getTime())).toEqual({
            days: '0',
            hours: '00',
            mins: '00',
            secs: '00',
        });
        expect(countdownParts(undefined, 0)).toBe(COUNTDOWN_ZERO);
    });
});

describe('contactLinks', () => {
    it('returns only filled-in links, ready to open', () => {
        const fields = { phone: '+30 690 000 0000', sms: '', email: ' a@b.gr ', facebook: '', instagram: 'instagram.com/x', tiktok: 'https://tiktok.com/@x' };
        expect(contactLinks(fields)).toEqual([
            { key: 'phone', href: 'tel:+306900000000' },
            { key: 'email', href: 'mailto:a@b.gr' },
            { key: 'instagram', href: 'https://instagram.com/x' },
            { key: 'tiktok', href: 'https://tiktok.com/@x' },
        ]);
    });
});

describe('section css', () => {
    it('gives headings and names the title font', () => {
        expect(fieldTextRole('h3', 'contact-title')).toBe('title');
        expect(fieldTextRole('span', 'couple-name')).toBe('title');
        expect(fieldTextRole('p', 'faq-a')).toBe('body');
    });

    it('sets only the variables a section fills in', () => {
        expect(countdownVars(SAMPLE_SECTIONS.countdown.data, 'normal', ctx)).toMatchObject({ '--cd-size': '44px', '--cd-color': '#2f2b2d' });
        expect(faqVars(SAMPLE_SECTIONS.faq.data, 'normal', ctx)).toMatchObject({ '--faq-border-width': '1px' });
        expect(contactVars(undefined, ctx)).toBeUndefined();
    });

    it('drops section fonts when a preset replaces every font', () => {
        const forced = { ...ctx, forcePreset: true };
        expect(contactVars({ font: 'Lora' }, forced)).toBeUndefined();
        expect(footerTextCss({ ...SAMPLE_SECTIONS.footer.data, font: 'Lora' }, 'normal', forced)?.fontFamily).toBeUndefined();
    });
});
