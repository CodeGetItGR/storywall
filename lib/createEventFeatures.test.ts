import { describe, expect, it } from 'vitest';

import type { AppConfigResponseDto, PlanTierResponseDto } from '@/lib/api/types';
import { createEventFeatures, featureLineSource, featurePriority } from '@/lib/createEventFeatures';

function plan(code: string, eventTypeKey: string, moduleKeys: string[], extra: Partial<PlanTierResponseDto> = {}) {
    return {
        id: code,
        code,
        scope: 'EVENT',
        isPublic: true,
        isAssignable: true,
        eventTypeKey,
        moduleKeys,
        paidModules: [],
        ...extra,
    } as unknown as PlanTierResponseDto;
}

const ALL = ['gallery', 'qr_cards', 'wishbook', 'rsvp', 'stories', 'playlist', 'schedule', 'co_hosts', 'theme', 'he_or_she', 'posts'];

function config(plans: PlanTierResponseDto[], disabled: string[] = []) {
    return {
        planTiers: plans,
        modules: ALL.map((moduleKey, sortOrder) => ({ moduleKey, isEnabled: !disabled.includes(moduleKey), sortOrder })),
    } as unknown as AppConfigResponseDto;
}

describe('createEventFeatures', () => {
    it('shows the wedding list in order: four big, then the small row', () => {
        const result = createEventFeatures(config([plan('STORY', 'WEDDING', ALL)]), 'WEDDING');
        expect(result.big).toEqual(['gallery', 'qr_cards', 'wishbook', 'rsvp']);
        expect(result.small).toEqual(['stories', 'playlist', 'schedule', 'co_hosts']);
        expect(result.showPlanNote).toBe(false);
    });

    it('moves the next feature up when no plan offers one (production weddings have no QR cards)', () => {
        const keys = ALL.filter((key) => key !== 'qr_cards');
        const result = createEventFeatures(config([plan('STORY', 'WEDDING', keys)]), 'WEDDING');
        expect(result.big).toEqual(['gallery', 'wishbook', 'rsvp', 'stories']);
        expect(result.small).toEqual(['playlist', 'schedule', 'co_hosts']);
    });

    it('counts add-ons as offered, and leaves out disabled modules', () => {
        const addOn = { grantsModuleKey: 'qr_cards' };
        const keys = ALL.filter((key) => key !== 'qr_cards');
        const withAddOn = createEventFeatures(config([plan('STORY', 'WEDDING', keys, { paidModules: [addOn] } as never)]), 'WEDDING');
        expect(withAddOn.big).toContain('qr_cards');
        expect(withAddOn.showPlanNote).toBe(true);

        const disabled = createEventFeatures(config([plan('STORY', 'WEDDING', ALL)], ['gallery']), 'WEDDING');
        expect(disabled.big[0]).toBe('qr_cards');
    });

    it('shows the note only when a shown feature is missing from some public plan of the type', () => {
        const plans = [plan('START', 'BAPTISM', ['gallery', 'wishbook', 'rsvp']), plan('STORY', 'BAPTISM', ALL)];
        expect(createEventFeatures(config(plans), 'BAPTISM').showPlanNote).toBe(true);
        const other = [
            plan(
                'ONE',
                'GENDER_REVEAL',
                ALL.filter((key) => key !== 'playlist'),
            ),
        ];
        const reveal = createEventFeatures(config(other), 'GENDER_REVEAL');
        expect(reveal.big).toEqual(['he_or_she', 'gallery', 'wishbook', 'rsvp']);
        expect(reveal.small).toEqual(['stories', 'schedule', 'theme']);
        expect(reveal.showPlanNote).toBe(false);
    });

    it('ignores other types, hidden plans and account plans', () => {
        const plans = [plan('W', 'WEDDING', ALL), plan('HIDDEN', 'REUNION', ALL, { isPublic: false }), plan('R', 'REUNION', ['gallery', 'rsvp'])];
        const result = createEventFeatures(config(plans), 'REUNION');
        expect(result.big).toEqual(['gallery', 'rsvp']);
        expect(result.small).toEqual([]);
    });

    it('uses the default list for a type without its own', () => {
        expect(featurePriority('BIRTHDAY')).toEqual(['gallery', 'rsvp', 'wishbook', 'stories', 'playlist', 'schedule', 'co_hosts', 'theme', 'posts']);
        const result = createEventFeatures(config([plan('B', 'BIRTHDAY', ALL)]), 'BIRTHDAY');
        expect(result.big).toEqual(['gallery', 'rsvp', 'wishbook', 'stories']);
        expect(result.small).toEqual(['playlist', 'schedule', 'co_hosts', 'theme']);
    });

    it('shows nothing before the config loads', () => {
        expect(createEventFeatures(null, 'WEDDING')).toEqual({ big: [], small: [], showPlanNote: false });
    });

    it('reads approved new lines from the wizard and reused ones from Modules', () => {
        expect(featureLineSource('qr_cards')).toBe('wizard');
        expect(featureLineSource('rsvp')).toBe('module');
        expect(featureLineSource('gallery')).toBe('module');
    });
});
