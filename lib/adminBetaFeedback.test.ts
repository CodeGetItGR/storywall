import { describe, expect, it } from 'vitest';

import { adminBugReportsPath, adminErrorEventsPath, isErrorRef, pagePathOf, toStoredRecentErrors } from '@/lib/adminBetaFeedback';

describe('adminErrorEventsPath', () => {
    it('adds source and a valid ref', () => {
        expect(adminErrorEventsPath({ page: 2, source: 'CLIENT', ref: ' A1B2C3D4E5F6 ' })).toBe(
            '/api/error-events?page=2&size=50&source=CLIENT&ref=a1b2c3d4e5f6',
        );
    });

    it('leaves out a partial ref and no source, since a malformed ref is a 400', () => {
        expect(adminErrorEventsPath({ page: 0, source: null, ref: 'a1b2' })).toBe('/api/error-events?page=0&size=50');
    });
});

describe('adminBugReportsPath', () => {
    it('pages the list', () => {
        expect(adminBugReportsPath(1)).toBe('/api/bug-reports?page=1&size=50');
    });
});

describe('isErrorRef', () => {
    it.each([
        ['a1b2c3d4e5f6', true],
        ['A1B2C3D4E5F6', false],
        ['a1b2c3d4e5f', false],
        [null, false],
    ])('%j → %j', (value, expected) => {
        expect(isErrorRef(value)).toBe(expected);
    });
});

describe('toStoredRecentErrors', () => {
    it('reads loose stored entries defensively', () => {
        expect(
            toStoredRecentErrors([
                { method: 'GET', path: '/api/qr/:token', status: 500, errorCode: 9001, errorRef: 'a1b2c3d4e5f6', at: '2026-09-28T10:00:00Z' },
                { method: null, path: 5, status: '404', errorCode: null, errorRef: 'bad', at: null },
            ]),
        ).toEqual([
            { method: 'GET', path: '/api/qr/:token', status: 500, errorCode: 9001, errorRef: 'a1b2c3d4e5f6', at: '2026-09-28T10:00:00Z' },
            { method: null, path: null, status: null, errorCode: null, errorRef: null, at: null },
        ]);
        expect(toStoredRecentErrors(null)).toEqual([]);
    });
});

describe('pagePathOf', () => {
    it('keeps only the path', () => {
        expect(pagePathOf('https://app.example/q/:token')).toBe('/q/:token');
        expect(pagePathOf(null)).toBeNull();
    });
});
