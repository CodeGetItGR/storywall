import { describe, expect, it } from 'vitest';

import { moduleUsageFixture, tooFewModuleUsageFixture } from '@/components/admin/moduleUsage/__fixtures__/moduleUsage';
import { moduleUsageRows } from '@/lib/adminModuleUsage';
import type { ModuleUsageResponseDto } from '@/lib/api/types';

describe('moduleUsageRows', () => {
    it('orders modules and formats each metric by kind', () => {
        const rows = moduleUsageRows('en', moduleUsageFixture());

        expect(rows?.map((row) => row.moduleKey)).toEqual(['posts', 'stories', 'schedule', 'wishlist']);
        expect(rows?.[0]).toEqual({
            moduleKey: 'posts',
            suppressed: false,
            events: '120',
            used: '75%',
            usedCount: '90',
            metrics: [
                { key: 'posts', average: '12.3', median: '8', share: '—' },
                { key: 'commentsPerPost', average: '1.5', median: '1', share: '—' },
                { key: 'eventsWithComments', average: '—', median: '—', share: '42%' },
            ],
        });
    });

    it('shows — instead of NaN when a module has no events', () => {
        const stories = moduleUsageRows('en', moduleUsageFixture())?.find((row) => row.moduleKey === 'stories');
        expect(stories).toMatchObject({ used: '—', metrics: [{ average: '—', median: '—' }] });
    });

    it('keeps a suppressed module free of numbers', () => {
        const schedule = moduleUsageRows('en', moduleUsageFixture())?.find((row) => row.moduleKey === 'schedule');
        expect(schedule).toEqual({ moduleKey: 'schedule', suppressed: true });
    });

    it('returns null when too few events match overall', () => {
        expect(moduleUsageRows('en', tooFewModuleUsageFixture())).toBeNull();
    });

    it('drops modules and metrics it has no label for', () => {
        const usage = {
            ...moduleUsageFixture(),
            modules: [
                { moduleKey: 'quiz', suppressed: false, eventsWithModule: 9, eventsUsed: 1, metrics: [] },
                {
                    moduleKey: 'posts',
                    suppressed: false,
                    eventsWithModule: 9,
                    eventsUsed: 1,
                    metrics: [{ key: 'shares', kind: 'PER_EVENT', average: 1, median: 1, share: null }],
                },
            ],
        } as unknown as ModuleUsageResponseDto;

        expect(moduleUsageRows('en', usage)).toEqual([
            { moduleKey: 'posts', suppressed: false, events: '9', used: '11%', usedCount: '1', metrics: [] },
        ]);
    });
});
