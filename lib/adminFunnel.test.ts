import { describe, expect, it } from 'vitest';

import {
    cohortChartRows,
    formatMinorMoney,
    formatRate,
    funnelBreakdown,
    funnelRangeBounds,
    funnelSteps,
    rateOf,
    toHoursDisplay,
} from '@/lib/adminFunnel';
import { endpoints } from '@/lib/api/endpoints';

const noCustom = { from: '', to: '' };

describe('funnelRangeBounds', () => {
    it('sends nothing for all time', () => {
        expect(funnelRangeBounds('ALL', noCustom, '2026-09-30')).toEqual({ since: null, until: null, isValid: true });
    });

    it('ends presets at the exclusive next-day midnight', () => {
        expect(funnelRangeBounds('LAST_30', noCustom, '2026-09-30')).toEqual({
            since: '2026-09-01T00:00:00Z',
            until: '2026-10-01T00:00:00Z',
            isValid: true,
        });
        expect(funnelRangeBounds('THIS_YEAR', noCustom, '2026-09-30').since).toBe('2026-01-01T00:00:00Z');
    });

    it('includes the whole last day of a custom range', () => {
        expect(funnelRangeBounds('CUSTOM', { from: '2026-03-01', to: '2026-09-30' }, '2026-10-05')).toEqual({
            since: '2026-03-01T00:00:00Z',
            until: '2026-10-01T00:00:00Z',
            isValid: true,
        });
    });

    it('leaves an open end open and flags an end before the start', () => {
        expect(funnelRangeBounds('CUSTOM', { from: '2026-03-01', to: '' }, '2026-10-05').until).toBeNull();
        expect(funnelRangeBounds('CUSTOM', { from: '2026-03-02', to: '2026-03-01' }, '2026-10-05').isValid).toBe(false);
    });
});

describe('funnel endpoints', () => {
    it('omits absent params and encodes present ones', () => {
        expect(endpoints.admin.metrics.funnel()).toBe('/api/admin/metrics/funnel');
        expect(endpoints.admin.metrics.funnel(null, null)).toBe('/api/admin/metrics/funnel');
        expect(endpoints.admin.metrics.funnel('2026-09-01T00:00:00Z', null)).toBe('/api/admin/metrics/funnel?since=2026-09-01T00%3A00%3A00Z');
        expect(endpoints.admin.metrics.funnel(null, '2026-10-01T00:00:00+02:00')).toBe(
            '/api/admin/metrics/funnel?until=2026-10-01T00%3A00%3A00%2B02%3A00',
        );
        expect(endpoints.admin.metrics.funnel('a b', 'c')).toBe('/api/admin/metrics/funnel?since=a%20b&until=c');
        expect(endpoints.admin.metrics.funnelCohorts(26)).toBe('/api/admin/metrics/funnel/cohorts?weeks=26');
    });
});

describe('rates', () => {
    it('never divides by zero', () => {
        expect(rateOf(0, 0)).toBeNull();
        expect(formatRate('en', rateOf(3, 0))).toBe('—');
        expect(formatRate('en', rateOf(1, 4))).toBe('25%');
    });

    it('builds funnel steps without NaN on an empty funnel', () => {
        const steps = funnelSteps({
            signedUp: 0,
            emailVerified: 0,
            createdEvent: 0,
            paidHost: 0,
            repeatPaidHost: 0,
            engagedHost: 0,
            adminSettledHost: 0,
        });
        expect(steps.every((step) => step.ofPrevious === null && step.ofSignups === null && step.share === 0)).toBe(true);
    });
});

describe('toHoursDisplay', () => {
    it('switches to days at 48 hours and keeps a negative sign', () => {
        expect(toHoursDisplay('en', 3.24)).toEqual({ unit: 'hours', value: '3.2' });
        expect(toHoursDisplay('en', 108)).toEqual({ unit: 'days', value: '4.5' });
        expect(toHoursDisplay('en', -72)).toEqual({ unit: 'days', value: '-3.0' });
        expect(toHoursDisplay('en', null)).toBeNull();
    });
});

describe('formatMinorMoney', () => {
    it('uses each currency’s own decimals', () => {
        expect(formatMinorMoney('en', 123456, 'EUR')).toBe('€1,234.56');
        expect(formatMinorMoney('en', 1500, 'JPY')).toBe('¥1,500');
    });
});

describe('funnelBreakdown', () => {
    it('fills missing known keys with 0 and keeps unknown keys', () => {
        expect(funnelBreakdown({ OAUTH: 3, SAML: 1 }, ['LOCAL', 'OAUTH', 'INVITE']).map((row) => [row.key, row.value])).toEqual([
            ['LOCAL', 0],
            ['OAUTH', 3],
            ['INVITE', 0],
            ['SAML', 1],
        ]);
    });
});

describe('cohortChartRows', () => {
    it('shows shares of signups, null for an empty week', () => {
        const rows = cohortChartRows(
            [
                { weekStart: '2026-09-21T00:00:00Z', signedUp: 4, emailVerified: 2, createdEvent: 1, paidHost: 1, engagedHost: 0 },
                { weekStart: '2026-09-28T00:00:00Z', signedUp: 0, emailVerified: 0, createdEvent: 0, paidHost: 0, engagedHost: 0 },
            ],
            'PERCENT',
        );
        expect(rows[0].emailVerified).toBe(0.5);
        expect(rows[1].paidHost).toBeNull();
    });
});
