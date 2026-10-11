import type { ModuleUsageResponseDto } from '@/lib/api/types';

export function moduleUsageFixture(): ModuleUsageResponseDto {
    return {
        minEvents: 5,
        eventsInScope: 140,
        modules: [
            {
                moduleKey: 'posts',
                suppressed: false,
                eventsWithModule: 120,
                eventsUsed: 90,
                metrics: [
                    { key: 'posts', kind: 'PER_EVENT', average: 12.34, median: 8, share: null },
                    { key: 'commentsPerPost', kind: 'PER_POST', average: 1.5, median: 1, share: null },
                    { key: 'eventsWithComments', kind: 'SHARE', average: null, median: null, share: 0.42 },
                ],
            },
            { moduleKey: 'wishlist', suppressed: false, eventsWithModule: 40, eventsUsed: 10, metrics: [] },
            { moduleKey: 'schedule', suppressed: true, eventsWithModule: null, eventsUsed: null, metrics: [] },
            {
                moduleKey: 'stories',
                suppressed: false,
                eventsWithModule: 0,
                eventsUsed: 0,
                metrics: [{ key: 'stories', kind: 'PER_EVENT', average: null, median: null, share: null }],
            },
        ],
    };
}

export function tooFewModuleUsageFixture(): ModuleUsageResponseDto {
    return {
        minEvents: 5,
        eventsInScope: null,
        modules: [{ moduleKey: 'posts', suppressed: true, eventsWithModule: null, eventsUsed: null, metrics: [] }],
    };
}
