import { describe, expect, it } from 'vitest';

import {
    formatInlineDates,
    formatWithdrawalFacts,
    getKeepEventDayAvailability,
    sortWithdrawalSignals,
    splitWithdrawalGuidance,
} from './adminWithdrawals';
import type { WithdrawalAdminDto, WithdrawalLine } from './api/types';

// The shape WithdrawalRecommendation.render produces on the backend.
const RECOMMENDATION = [
    'WHAT IS WITHDRAWN',
    'The whole event.',
    '',
    'WHAT THE LAW REQUIRES',
    'They owe a proportionate amount.',
    '',
    'WHAT THE COMPUTATION PRODUCED',
    'Refund owed: 144.55 EUR of 152.15 EUR paid.',
    '',
    'WHY THIS WAS HELD',
    '- NEW_ACCOUNT_FAST_WITHDRAWAL: account 2 day(s) old (threshold account < 7 days)',
    'Signals that did not fire: PRIOR_WITHDRAWALS_USER',
    '',
    'YOUR DECISION',
    'Release: refund the amount above and delete the event.',
    'Keep the event day: only if the event took place on the date that was paid for.',
    '',
].join('\n');

describe('splitWithdrawalGuidance', () => {
    it('drops the held section and sets the decision apart', () => {
        const { sections, decision } = splitWithdrawalGuidance(RECOMMENDATION);

        expect(sections.map((section) => section.key)).toEqual(['withdrawn', 'law', 'refund']);
        expect(sections[2].paragraphs).toEqual(['Refund owed: 144.55 EUR of 152.15 EUR paid.']);
        expect(decision?.paragraphs).toHaveLength(2);
        expect(JSON.stringify(sections)).not.toContain('NEW_ACCOUNT_FAST_WITHDRAWAL');
    });

    it('keeps an unknown heading and plain text rather than dropping them', () => {
        const { sections, decision } = splitWithdrawalGuidance('NEW SECTION\nBody.\n\nJust a sentence.');

        expect(sections).toEqual([
            { key: null, heading: 'NEW SECTION', paragraphs: ['Body.'] },
            { key: null, heading: null, paragraphs: ['Just a sentence.'] },
        ]);
        expect(decision).toBeNull();
    });
});

describe('formatInlineDates', () => {
    it('rewrites only the timestamps', () => {
        const text = formatInlineDates('en', 'paid for 2026-10-03T18:00Z, now set to 2026-12-01T18:00Z');

        expect(text).toMatch(/^paid for Oct 3, 2026, .+, now set to Dec 1, 2026, .+$/);
        expect(text).not.toContain('T18:00Z');
    });
});

describe('sortWithdrawalSignals', () => {
    it('puts fired signals first and keeps the rest in order', () => {
        const signal = (code: string, fired: boolean) => ({ code, fired, observed: null, threshold: null });
        const sorted = sortWithdrawalSignals([signal('A', false), signal('B', true), signal('C', false)]);

        expect(sorted.map((s) => s.code)).toEqual(['B', 'A', 'C']);
    });
});

describe('formatWithdrawalFacts', () => {
    it('shows only facts no signal states, with readable dates', () => {
        const facts = formatWithdrawalFacts(
            {
                paidAt: '2026-09-25T08:37:28.980763Z',
                eventEndAt: null,
                postsEverCreated: 1200,
                guestsEverJoined: 3,
                priorWithdrawalsByUser365d: 0,
            },
            'en',
        );

        expect(facts.map((fact) => fact.key)).toEqual(['paidAt', 'eventEndAt', 'postsEverCreated']);
        expect(facts[0].value).toMatch(/^Sep 25, 2026, /);
        expect(facts[1].value).toBe('—');
        expect(facts[2].value).toBe('1,200');
    });

    it('is empty on a storage pack', () => {
        expect(formatWithdrawalFacts(null, 'en')).toEqual([]);
    });
});

describe('getKeepEventDayAvailability', () => {
    const line = (overrides: Partial<WithdrawalLine> = {}): WithdrawalLine => ({
        orderId: 'o1',
        orderKind: 'ACTIVATION',
        basis: 'CONSENTED_PRO_RATA',
        hostingStart: null,
        hostingEnd: null,
        usedSeconds: null,
        totalSeconds: null,
        eventPerformed: false,
        refundMinor: 0,
        providerRefunded: false,
        components: {},
        ...overrides,
    });
    const row = (activatedStartAt: string | null, lines: WithdrawalLine[] = [line()], usageFacts = true): WithdrawalAdminDto =>
        ({
            request: { createdAt: '2026-10-05T10:00:00Z', lines },
            usageFacts: usageFacts ? { activatedStartAt } : null,
            fraudSignals: [],
            recommendation: '',
        }) as unknown as WithdrawalAdminDto;

    it('is available once the date paid for had passed at filing', () => {
        expect(getKeepEventDayAvailability(row('2026-10-03T18:00:00Z'))).toBe('available');
    });

    it('is not due when the date had not passed at filing', () => {
        expect(getKeepEventDayAvailability(row('2026-10-10T18:00:00Z'))).toBe('notDue');
        expect(getKeepEventDayAvailability(row(null))).toBe('notDue');
    });

    it('needs consent on an activation or upgrade', () => {
        expect(getKeepEventDayAvailability(row('2026-10-03T18:00:00Z', [line({ basis: 'NO_CONSENT_FULL_REFUND' })]))).toBe('noConsent');
    });

    it('does not apply to storage packs or extensions', () => {
        expect(getKeepEventDayAvailability(row(null, [line({ orderKind: 'STORAGE_PACK' })], false))).toBe('notApplicable');
        expect(getKeepEventDayAvailability(row('2026-10-03T18:00:00Z', [line({ orderKind: 'EXTENSION' })]))).toBe('notApplicable');
    });
});
