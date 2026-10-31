import { describe, expect, it } from 'vitest';

import {
    duplicateProspectId,
    EMPTY_PROSPECT_DRAFT,
    formatOutreachDay,
    instagramHandle,
    isEmailDraftChanged,
    linkLabel,
    localizedWhy,
    nextOutreachStatus,
    OUTREACH_STATUSES,
    outreachCityKey,
    outreachCityRows,
    outreachFunnelSteps,
    outreachReplyRate,
    outreachSortParam,
    outreachStatusSegments,
    outreachTip,
    progressPatch,
    prospectDraftErrors,
    reachChannels,
    safeHttpUrl,
    todayInAthens,
    toEmailDraft,
    toggleOutreachSort,
    toProgressDraft,
    toProspectCreateRequest,
    typeWithMostToContact,
} from '@/lib/adminOutreach';
import { ApiError } from '@/lib/api/client';
import type { OutreachStatusCounts, OutreachSummaryDto } from '@/lib/api/types';

function counts(partial: Partial<OutreachStatusCounts>): OutreachStatusCounts {
    return { NEW: 0, EMAILED: 0, FOLLOWED_UP: 0, REPLIED: 0, MEETING: 0, PARTNER: 0, DECLINED: 0, NO_RESPONSE: 0, ...partial };
}

const SUMMARY: OutreachSummaryDto = {
    total: 52,
    topPriority: 14,
    contacted: 12,
    replied: 4,
    meetings: 2,
    partners: 1,
    followupsDue: 3,
    byStatus: counts({ NEW: 40, EMAILED: 6, FOLLOWED_UP: 2, REPLIED: 1, MEETING: 1, PARTNER: 1, DECLINED: 1 }),
    byType: [
        { type: 'VENUES', total: 20, byStatus: counts({ NEW: 15, EMAILED: 5 }) },
        { type: 'PLANNERS', total: 12, byStatus: counts({ NEW: 9, REPLIED: 3 }) },
        { type: 'PHOTO_VIDEO', total: 10, byStatus: counts({ NEW: 16 }) },
        { type: 'SHOPS_DECOR', total: 0, byStatus: counts({}) },
    ],
    byCity: [
        { city: 'Thessaloniki', total: 12, contacted: 3 },
        { city: 'Athens', total: 40, contacted: 9 },
    ],
    dueSoon: [],
};

describe('next step', () => {
    it('moves a business one step along the pipeline', () => {
        expect(nextOutreachStatus('NEW')).toBe('EMAILED');
        expect(nextOutreachStatus('EMAILED')).toBe('FOLLOWED_UP');
        expect(nextOutreachStatus('FOLLOWED_UP')).toBe('REPLIED');
        expect(nextOutreachStatus('REPLIED')).toBe('MEETING');
        expect(nextOutreachStatus('MEETING')).toBe('PARTNER');
    });

    it('offers no step once there is an outcome', () => {
        expect(nextOutreachStatus('PARTNER')).toBeNull();
        expect(nextOutreachStatus('DECLINED')).toBeNull();
        expect(nextOutreachStatus('NO_RESPONSE')).toBeNull();
    });
});

describe('status tip', () => {
    it('has a tip for every status', () => {
        expect(OUTREACH_STATUSES.map((status) => outreachTip(status, '2026-11-04', '2026-10-30'))).toEqual([
            'new',
            'waiting',
            'waiting',
            'replied',
            'meeting',
            'partner',
            'closed',
            'closed',
        ]);
    });

    it('drops the reminder date when there is none', () => {
        expect(outreachTip('EMAILED', null, '2026-10-30')).toBe('waitingNoDate');
        expect(outreachTip('FOLLOWED_UP', null, '2026-10-30')).toBe('waitingNoDate');
        expect(outreachTip('NEW', null, '2026-10-30')).toBe('new');
    });

    it('says it is time to follow up from the reminder day on', () => {
        expect(outreachTip('EMAILED', '2026-10-30', '2026-10-30')).toBe('waitingDue');
        expect(outreachTip('FOLLOWED_UP', '2026-10-28', '2026-10-30')).toBe('waitingDue');
        expect(outreachTip('EMAILED', '2026-10-31', '2026-10-30')).toBe('waiting');
    });
});

describe('summary math', () => {
    it('shows each funnel step as a share of everything found', () => {
        expect(outreachFunnelSteps(SUMMARY)).toEqual([
            { key: 'researched', count: 52, share: 1 },
            { key: 'contacted', count: 12, share: 12 / 52 },
            { key: 'replied', count: 4, share: 4 / 52 },
            { key: 'meetings', count: 2, share: 2 / 52 },
            { key: 'partners', count: 1, share: 1 / 52 },
        ]);
    });

    it('has no shares before anything is found', () => {
        expect(outreachFunnelSteps({ ...SUMMARY, total: 0, contacted: 0 })[1].share).toBeNull();
    });

    it('rates replies against the businesses contacted', () => {
        expect(outreachReplyRate(SUMMARY)).toBe(4 / 12);
        expect(outreachReplyRate({ replied: 0, contacted: 0 })).toBeNull();
    });

    it('keeps only the statuses a bar holds, in pipeline order', () => {
        expect(outreachStatusSegments(counts({ REPLIED: 1, NEW: 3 }))).toEqual([
            { status: 'NEW', count: 3, share: 0.75 },
            { status: 'REPLIED', count: 1, share: 0.25 },
        ]);
        expect(outreachStatusSegments(counts({}))).toEqual([]);
    });

    it('finds the type with the most left to contact', () => {
        expect(typeWithMostToContact(SUMMARY.byType)).toEqual({ type: 'PHOTO_VIDEO', count: 16 });
        expect(typeWithMostToContact([{ type: 'VENUES', total: 2, byStatus: counts({ EMAILED: 2 }) }])).toBeNull();
    });

    it('lists the biggest city first', () => {
        expect(outreachCityRows(SUMMARY.byCity)).toEqual([
            { city: 'Athens', total: 40, contacted: 9, share: 9 / 40 },
            { city: 'Thessaloniki', total: 12, contacted: 3, share: 3 / 12 },
        ]);
    });
});

describe('dates', () => {
    it('takes today in Athens, not UTC', () => {
        expect(todayInAthens(new Date('2026-10-30T22:30:00Z'))).toBe('2026-10-31');
        expect(todayInAthens(new Date('2026-10-30T08:00:00Z'))).toBe('2026-10-30');
    });

    it('formats a calendar day as written', () => {
        expect(formatOutreachDay('en', '2026-11-04')).toBe('Nov 4, 2026');
        expect(formatOutreachDay('en', null)).toBeNull();
    });
});

describe('how to reach them', () => {
    it('accepts only http(s) links', () => {
        expect(safeHttpUrl('example.gr')).toBe('https://example.gr/');
        expect(safeHttpUrl('http://example.gr/a')).toBe('http://example.gr/a');
        expect(safeHttpUrl('javascript:alert(1)')).toBeNull();
        expect(safeHttpUrl('')).toBeNull();
    });

    it('shows links as short labels', () => {
        expect(linkLabel('https://www.example.gr/')).toBe('example.gr');
        expect(linkLabel('https://example.gr/contact/')).toBe('example.gr/contact');
    });

    it('reads an Instagram handle in any form', () => {
        expect(instagramHandle('@studio.lux')).toBe('studio.lux');
        expect(instagramHandle('https://www.instagram.com/studio.lux/')).toBe('studio.lux');
        expect(instagramHandle('not a handle')).toBeNull();
    });

    it('lists only the channels a business has', () => {
        const channels = reachChannels({
            email: 'hi@example.gr',
            phone: '+30 210 123 4567',
            website: 'https://www.example.gr',
            instagram: '@example',
            contactForm: null,
        });
        expect(channels.map(({ key, label, href }) => [key, label, href])).toEqual([
            ['email', 'hi@example.gr', 'mailto:hi@example.gr'],
            ['phone', '+30 210 123 4567', 'tel:+302101234567'],
            ['website', 'example.gr', 'https://www.example.gr/'],
            ['instagram', '@example', 'https://www.instagram.com/example/'],
        ]);
    });
});

describe('sort', () => {
    it('cycles ascending, descending, then the default order', () => {
        const asc = toggleOutreachSort(null, 'name');
        expect(asc).toEqual({ field: 'name', direction: 'asc' });
        const desc = toggleOutreachSort(asc, 'name');
        expect(desc).toEqual({ field: 'name', direction: 'desc' });
        expect(toggleOutreachSort(desc, 'name')).toBeNull();
        expect(toggleOutreachSort(desc, 'city')).toEqual({ field: 'city', direction: 'asc' });
    });

    it('writes Spring’s sort param', () => {
        expect(outreachSortParam({ field: 'nextFollowupOn', direction: 'desc' })).toBe('nextFollowupOn,desc');
        expect(outreachSortParam(null)).toBeNull();
    });
});

describe('add a business', () => {
    it('needs a name, a kind and a city', () => {
        expect(prospectDraftErrors(EMPTY_PROSPECT_DRAFT)).toEqual({ name: 'required', kind: 'required', city: 'required' });
    });

    it('checks emails and links loosely', () => {
        const draft = { ...EMPTY_PROSPECT_DRAFT, name: 'A', kind: 'VENUE' as const, city: 'Athens', email: 'nope', website: 'ftp://x' };
        expect(prospectDraftErrors(draft)).toEqual({ email: 'emailInvalid', website: 'linkInvalid' });
    });

    it('trims, nulls empty fields and adds the scheme to links', () => {
        const request = toProspectCreateRequest(
            {
                ...EMPTY_PROSPECT_DRAFT,
                name: '  Villa  ',
                kind: 'VENUE',
                city: 'Athens ',
                website: 'villa.gr',
                area: ' ',
            },
            'en',
        );
        expect(request).toMatchObject({ name: 'Villa', kind: 'VENUE', city: 'Athens', website: 'https://villa.gr/', area: null, priority: 'B' });
    });

    it('sends the why text in the UI language and leaves the other one for the agent', () => {
        const draft = { ...EMPTY_PROSPECT_DRAFT, name: 'Villa', kind: 'VENUE' as const, city: 'Athens', credibility: ' Known ', fit: '' };

        const english = toProspectCreateRequest(draft, 'en');
        expect(english).toMatchObject({ credibility: 'Known', fit: null });
        expect(english).not.toHaveProperty('credibilityEl');
        expect(english).not.toHaveProperty('fitEl');

        const greek = toProspectCreateRequest(draft, 'el');
        expect(greek).toMatchObject({ credibilityEl: 'Known', fitEl: null });
        expect(greek).not.toHaveProperty('credibility');
        expect(greek).not.toHaveProperty('fit');
    });

    it('reads the existing business from a 409', () => {
        expect(duplicateProspectId(new ApiError(409, { status: 409, errorCode: 5001, details: { existingId: 'p-9' } }))).toBe('p-9');
        expect(duplicateProspectId(new ApiError(409, {}))).toBeNull();
        expect(duplicateProspectId(new ApiError(400, {}))).toBeUndefined();
    });
});

describe('why this business, in the UI language', () => {
    const both = { credibility: 'Known', fit: 'Fits', credibilityEl: 'Γνωστό', fitEl: 'Ταιριάζει' };

    it('shows Greek for a Greek UI and English otherwise', () => {
        expect(localizedWhy(both, 'el')).toEqual({ credibility: 'Γνωστό', fit: 'Ταιριάζει' });
        expect(localizedWhy(both, 'en')).toEqual({ credibility: 'Known', fit: 'Fits' });
        expect(localizedWhy(both, 'de')).toEqual({ credibility: 'Known', fit: 'Fits' });
    });

    it('falls back to the other language, field by field', () => {
        expect(localizedWhy({ credibility: 'Known', fit: null, credibilityEl: null, fitEl: 'Ταιριάζει' }, 'el')).toEqual({
            credibility: 'Known',
            fit: 'Ταιριάζει',
        });
        expect(localizedWhy({ credibility: ' ', fitEl: 'Ταιριάζει' }, 'en')).toEqual({ credibility: null, fit: 'Ταιριάζει' });
    });

    it('is empty when neither language has the text', () => {
        expect(localizedWhy({}, 'el')).toEqual({ credibility: null, fit: null });
    });
});

describe('where it stands', () => {
    const prospect = {
        status: 'EMAILED' as const,
        nextFollowupOn: '2026-11-04',
        lastContactOn: '2026-10-30',
        contactPerson: null,
        outcome: 'Asked for prices',
    };

    it('sends nothing when nothing changed', () => {
        expect(progressPatch(prospect, toProgressDraft(prospect))).toEqual({});
    });

    it('sends a status change alone, so the server picks the follow-up date', () => {
        expect(progressPatch(prospect, { ...toProgressDraft(prospect), status: 'REPLIED' })).toEqual({ status: 'REPLIED' });
    });

    it('clears emptied fields with null and trims text', () => {
        expect(progressPatch(prospect, { ...toProgressDraft(prospect), nextFollowupOn: '', outcome: '  ', contactPerson: ' Maria ' })).toEqual({
            nextFollowupOn: null,
            outcome: null,
            contactPerson: 'Maria',
        });
    });
});

describe('cold email', () => {
    it('notices an edited subject or body', () => {
        const saved = { subject: 'Hi', body: null };
        expect(toEmailDraft(saved)).toEqual({ subject: 'Hi', body: '' });
        expect(isEmailDraftChanged(saved, { subject: 'Hi', body: '' })).toBe(false);
        expect(isEmailDraftChanged(saved, { subject: 'Hi', body: 'x' })).toBe(true);
    });
});

describe('outreachCityKey', () => {
    it('knows Athens and Thessaloniki in any case, and nothing else', () => {
        expect(outreachCityKey('Athens')).toBe('athens');
        expect(outreachCityKey(' thessaloniki ')).toBe('thessaloniki');
        expect(outreachCityKey('Patras')).toBeNull();
    });
});
