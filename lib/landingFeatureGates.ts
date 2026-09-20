import type { ModuleKeyConvention } from '@/lib/api/types';

export const LANDING_FEATURE_MODULE_KEYS = [
    'posts',
    'stories',
    'posts',
    'posts',
    'posts',
    null,
    'schedule',
    'playlist',
    'rsvp',
    null,
    null,
    'wishlist',
] as const satisfies readonly (ModuleKeyConvention | null)[];

export const LANDING_FEATURE_DETAIL_MODULE_KEYS = [null, null, 'rsvp', null] as const satisfies readonly (ModuleKeyConvention | null)[];
