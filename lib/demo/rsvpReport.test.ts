import { describe, expect, it } from 'vitest';

import { buildDemoRsvpReport } from '@/lib/demo/rsvpReport';

const members = [
    { id: 'a', displayName: 'Anna', role: 'ATTENDEE', deletedAt: null },
    { id: 'b', displayName: 'Bob', role: 'ATTENDEE', deletedAt: null },
    { id: 'h', displayName: 'Host', role: 'HOST', deletedAt: null },
];
const rsvps = [
    { id: 'ra', eventMemberId: 'a', attendanceStatus: 'ATTENDING' as const, phone: null, adultCount: 2, childCount: 1, notes: null },
    { id: 'rb', eventMemberId: 'b', attendanceStatus: 'DECLINED' as const, phone: null, adultCount: 0, childCount: 0, notes: null },
    { id: 'rh', eventMemberId: 'h', attendanceStatus: 'ATTENDING' as const, phone: null, adultCount: 2, childCount: 0, notes: null },
];
const event = { title: 'Demo', schedule: { startAt: '2026-10-11T15:00:00Z' } };

describe('buildDemoRsvpReport', () => {
    it('counts guests the way the backend does', () => {
        const report = buildDemoRsvpReport({ members, rsvps, event, reportType: 'STATISTICS', locale: 'en' });

        expect(report.totals).toEqual({ responses: 2, people: 3, adults: 2, children: 1 });
        expect(report.categories?.map((c) => [c.label, c.people, c.percentOfPeople])).toEqual([
            ['Attending', 3, 100],
            ['Not attending', 0, null],
        ]);
        expect(report.sessions).toEqual([]);
        expect(report.groups).toBeNull();
    });

    it('speaks Greek', () => {
        const report = buildDemoRsvpReport({ members, rsvps, event, reportType: 'FULL_LIST', locale: 'el' });

        expect(report.groups?.map((g) => g.label)).toEqual(['Θα έρθουν', 'Δεν θα έρθουν']);
        expect(report.groups?.[0].rows.map((r) => r.name)).toEqual(['Anna']);
    });

    it('filters like the list reports', () => {
        expect(buildDemoRsvpReport({ members, rsvps, event, reportType: 'ATTENDING_ONLY', locale: 'en' }).groups?.map((g) => g.label)).toEqual([
            'Attending',
        ]);
        expect(buildDemoRsvpReport({ members, rsvps, event, reportType: 'WITH_CHILDREN', locale: 'en' }).groups?.[0].rows.map((r) => r.name)).toEqual(
            ['Anna'],
        );
    });

    it('breaks ties between same-name guests by rsvpId', () => {
        const tiedMembers = [
            { id: 'c', displayName: 'Zoe', role: 'ATTENDEE', deletedAt: null },
            { id: 'd', displayName: 'Zoe', role: 'ATTENDEE', deletedAt: null },
        ];
        const tiedRsvps = [
            { id: 'rz2', eventMemberId: 'c', attendanceStatus: 'ATTENDING' as const, phone: null, adultCount: 1, childCount: 0, notes: null },
            { id: 'rz1', eventMemberId: 'd', attendanceStatus: 'ATTENDING' as const, phone: null, adultCount: 1, childCount: 0, notes: null },
        ];

        const report = buildDemoRsvpReport({ members: tiedMembers, rsvps: tiedRsvps, event, reportType: 'FULL_LIST', locale: 'en' });

        expect(report.groups?.[0].rows.map((r) => r.rsvpId)).toEqual(['rz1', 'rz2']);
    });
});
