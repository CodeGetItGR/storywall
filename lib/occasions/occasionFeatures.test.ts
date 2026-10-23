import { describe, expect, it } from 'vitest';

import type { AppConfigResponseDto, PaidServiceResponseDto, PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { occasionFeatureKeys, occasionModuleKeys, occasionOffersThemes } from '@/lib/occasions/occasionFeatures';

function plan(overrides: Partial<PlanTierResponseDto>): PlanTierResponseDto {
    return {
        scope: 'EVENT',
        isPublic: true,
        isAssignable: true,
        sortOrder: 0,
        moduleKeys: [],
        paidModules: [],
        eventTypeKey: 'BAPTISM',
        ...overrides,
    } as PlanTierResponseDto;
}

function module(moduleKey: string, sortOrder: number, isEnabled = true): PlatformModuleResponseDto {
    return { id: moduleKey, moduleKey, name: moduleKey, description: null, isEnabled, sortOrder };
}

const modules = [
    module('posts', 0),
    module('rsvp', 1),
    module('gallery', 2),
    module('wishbook', 3),
    module('co_hosts', 4),
    module('member_roles', 5),
    module('theme', 6),
    module('playlist', 7, false),
];

function config(planTiers: PlanTierResponseDto[]): AppConfigResponseDto {
    return { planTiers, modules } as AppConfigResponseDto;
}

describe('occasion features', () => {
    it('joins the modules of every public plan for the event type', () => {
        const keys = occasionModuleKeys(
            config([
                plan({ moduleKeys: ['posts', 'gallery'] }),
                plan({ moduleKeys: ['rsvp'], paidModules: [{ grantsModuleKey: 'wishbook' } as PaidServiceResponseDto] }),
                plan({ moduleKeys: ['theme'], isPublic: false }),
                plan({ moduleKeys: ['co_hosts'], eventTypeKey: 'WEDDING' }),
                plan({ moduleKeys: ['playlist'] }),
            ]),
            'BAPTISM',
        );
        // playlist is switched off platform-wide.
        expect([...keys].sort()).toEqual(['gallery', 'posts', 'rsvp', 'wishbook']);
    });

    it('lists the invitation first, then visible modules in platform order', () => {
        const value = config([plan({ moduleKeys: ['wishbook', 'theme', 'posts', 'member_roles', 'co_hosts', 'rsvp'] })]);
        expect(occasionFeatureKeys(value, 'BAPTISM', [])).toEqual(['invitation', 'posts', 'rsvp', 'wishbook']);
    });

    it('falls back to the given keys when the config is unknown', () => {
        expect(occasionFeatureKeys(null, 'BAPTISM', ['invitation', 'gallery'])).toEqual(['invitation', 'gallery']);
    });

    it('offers themes only when a public plan includes them', () => {
        expect(occasionOffersThemes(config([plan({ moduleKeys: ['theme'] })]), 'BAPTISM')).toBe(true);
        expect(occasionOffersThemes(config([plan({ moduleKeys: ['theme'] })]), 'WEDDING')).toBe(false);
        expect(occasionOffersThemes(null, 'BAPTISM')).toBe(false);
    });
});
