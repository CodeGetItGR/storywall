import { describe, expect, it } from 'vitest';

import { answerError, formatAnswer, hasOneGap, msUntilReveal, splitFillGap, tallyPercent, toAnswerValue } from '@/lib/heOrShe';

const labels = { he: 'Boy', she: 'Girl', yes: 'Yes', no: 'No' };

describe('toAnswerValue', () => {
    it('is null for an empty field', () => {
        expect(toAnswerValue('DATE', '   ')).toBeNull();
        expect(toAnswerValue('FREE_TEXT', '')).toBeNull();
    });

    it('takes a comma as the decimal point', () => {
        expect(toAnswerValue('NUMBER', ' 3,5 ')).toBe('3.5');
    });

    it('drops seconds from a time', () => {
        expect(toAnswerValue('TIME', '07:05:00')).toBe('07:05');
    });

    it('keeps line breaks in free text', () => {
        expect(toAnswerValue('FREE_TEXT', '  one\ntwo  ')).toBe('one\ntwo');
    });
});

describe('answerError', () => {
    it('accepts what the backend accepts', () => {
        expect(answerError('NUMBER', '3.5')).toBeNull();
        expect(answerError('NUMBER', '-2')).toBeNull();
        expect(answerError('NUMBER', '999999999999.125')).toBeNull();
        expect(answerError('DATE', '2028-02-29')).toBeNull();
        expect(answerError('TIME', '23:59')).toBeNull();
        expect(answerError('FILL_GAP', 'α'.repeat(120))).toBeNull();
        expect(answerError('CHOICE', 'opt')).toBeNull();
        expect(answerError('DATE', null)).toBeNull();
    });

    it('flags what the backend refuses', () => {
        expect(answerError('NUMBER', 'abc')).toBe('invalidNumber');
        expect(answerError('NUMBER', '1234567890123')).toBe('invalidNumber');
        expect(answerError('NUMBER', '1.2345')).toBe('invalidNumber');
        expect(answerError('DATE', '2026-02-30')).toBe('invalidDate');
        expect(answerError('TIME', '24:00')).toBe('invalidTime');
        expect(answerError('FILL_GAP', 'α'.repeat(121))).toBe('tooLong');
        expect(answerError('FREE_TEXT', 'x'.repeat(1001))).toBe('tooLong');
    });
});

describe('formatAnswer', () => {
    it('labels the fixed choices', () => {
        expect(formatAnswer({ answerType: 'HE_SHE', options: null }, 'SHE', 'en', labels)).toBe('Girl');
        expect(formatAnswer({ answerType: 'YES_NO', options: null }, 'YES', 'en', labels)).toBe('Yes');
    });

    it('shows the option label, not its id', () => {
        const question = { answerType: 'CHOICE' as const, options: [{ id: 'a', label: 'Dark' }] };
        expect(formatAnswer(question, 'a', 'en', labels)).toBe('Dark');
    });

    it('formats a date as the same calendar day in any timezone', () => {
        expect(formatAnswer({ answerType: 'DATE', options: null }, '2026-11-03', 'en', labels)).toBe('Nov 3, 2026');
    });

    it('formats numbers for the locale', () => {
        expect(formatAnswer({ answerType: 'NUMBER', options: null }, '3.5', 'el', labels)).toBe('3,5');
    });
});

describe('fill in the gap', () => {
    it('splits around the blank', () => {
        expect(splitFillGap('Baby will have ___ eyes')).toEqual({ before: 'Baby will have ', after: ' eyes' });
        expect(splitFillGap('No blank')).toEqual({ before: 'No blank', after: '' });
    });

    it('needs exactly one blank', () => {
        expect(hasOneGap('A ___ b')).toBe(true);
        expect(hasOneGap('A __ b')).toBe(false);
        expect(hasOneGap('___ and ___')).toBe(false);
    });
});

describe('tallyPercent', () => {
    it('adds up to 100', () => {
        expect(tallyPercent({ he: 1, she: 2 })).toEqual({ he: 33, she: 67 });
        expect(tallyPercent({ he: 0, she: 0 })).toEqual({ he: 0, she: 0 });
    });
});

describe('msUntilReveal', () => {
    it('is the wait, never negative, and null without a time', () => {
        expect(msUntilReveal('2026-01-01T00:01:00Z', Date.parse('2026-01-01T00:00:00Z'))).toBe(60_000);
        expect(msUntilReveal('2025-01-01T00:00:00Z', Date.parse('2026-01-01T00:00:00Z'))).toBe(0);
        expect(msUntilReveal(null)).toBeNull();
    });
});
