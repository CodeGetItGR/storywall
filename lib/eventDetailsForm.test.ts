import { afterEach, describe, expect, it } from 'vitest';

import { upgradedCoverageEndsAt } from '@/lib/eventCoverage';
import { eventDetailsRequest, readEventDetailsValues, rememberEventDetailsValues } from '@/lib/eventDetailsForm';
import { upgradeEarliestStartAt, upgradeNeedsEventDetails } from '@/lib/upgradeOptions';

const VALUES = { startAt: '2027-06-01T18:00', timezone: 'Europe/Athens', locationName: ' Hall ', locationAddress: ' Main 1 ', mapsUrl: '' };

describe('eventDetailsRequest', () => {
    it('sends the start as an instant, trims the text and leaves out an empty map link', () => {
        expect(eventDetailsRequest(VALUES)).toEqual({
            startAt: new Date('2027-06-01T18:00').toISOString(),
            timezone: 'Europe/Athens',
            locationName: 'Hall',
            locationAddress: 'Main 1',
            mapsUrl: undefined,
        });
    });

    it('has no request without a start', () => {
        expect(eventDetailsRequest({ ...VALUES, startAt: '' })).toBeNull();
    });
});

describe('remembered event details', () => {
    afterEach(() => window.sessionStorage.clear());

    it('reads back what was remembered', () => {
        rememberEventDetailsValues('key', VALUES);
        expect(readEventDetailsValues('key')).toEqual(VALUES);
    });

    it('has nothing for an unknown key or broken storage', () => {
        expect(readEventDetailsValues('missing')).toBeNull();
        window.sessionStorage.setItem('broken', '{');
        expect(readEventDetailsValues('broken')).toBeNull();
    });

    it('fills fields that are missing from what was stored', () => {
        window.sessionStorage.setItem('partial', JSON.stringify({ locationName: 'Hall', startAt: 7 }));
        expect(readEventDetailsValues('partial')).toMatchObject({ locationName: 'Hall', startAt: '', mapsUrl: '' });
    });
});

describe('upgradeNeedsEventDetails', () => {
    const event = (hasSchedule: boolean) => ({ capabilities: { hasSchedule } }) as never;
    const entry = (needsSchedule: boolean) => ({ requirements: { needsSchedule } }) as never;

    it('asks when the new plan needs a date and the event has none', () => {
        expect(upgradeNeedsEventDetails(entry(true), event(false))).toBe(true);
    });

    it('does not ask when the new plan needs no date, or the event has one', () => {
        expect(upgradeNeedsEventDetails(entry(false), event(false))).toBe(false);
        expect(upgradeNeedsEventDetails(entry(true), event(true))).toBe(false);
    });

    it('does not ask before the option and the event are known', () => {
        expect(upgradeNeedsEventDetails(null, event(false))).toBe(false);
        expect(upgradeNeedsEventDetails(entry(true), undefined)).toBe(false);
    });
});

describe('upgradeEarliestStartAt', () => {
    const order = (kind: string, status: string, createdAt: string, paidAt: string | null) => ({ kind, status, createdAt, paidAt }) as never;

    it('is the latest paid activation', () => {
        const orders = [
            order('ACTIVATION', 'PAID', '2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z'),
            order('ACTIVATION', 'PAID', '2026-03-01T00:00:00Z', '2026-03-02T00:00:00Z'),
            order('ACTIVATION', 'PENDING', '2026-04-01T00:00:00Z', null),
            order('EXTENSION', 'PAID', '2026-05-01T00:00:00Z', '2026-05-02T00:00:00Z'),
        ];
        expect(upgradeEarliestStartAt(orders, '2025-12-01T00:00:00Z')).toBe('2026-03-02T00:00:00Z');
    });

    it('is the creation time when nothing was paid', () => {
        expect(upgradeEarliestStartAt([], '2025-12-01T00:00:00Z')).toBe('2025-12-01T00:00:00Z');
    });
});

describe('upgradedCoverageEndsAt', () => {
    it('adds the months the upgrade adds', () => {
        expect(upgradedCoverageEndsAt('2027-01-15T10:00:00.000Z', 6)).toBe('2027-07-15T10:00:00.000Z');
    });

    it('has none without a coverage end', () => {
        expect(upgradedCoverageEndsAt(null, 6)).toBeNull();
    });
});
