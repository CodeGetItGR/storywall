import { describe, expect, it } from 'vitest';

import type { EventSessionResponseDto } from '@/lib/api/types';
import { buildScheduleDays } from '@/lib/eventSessions';

function session(id: string, displayOrder: number, startAt: string | null): EventSessionResponseDto {
    return { id, displayOrder, startAt } as EventSessionResponseDto;
}

describe('buildScheduleDays', () => {
    it('orders a day by start time, not by creation order', () => {
        const { days } = buildScheduleDays([
            session('ceremony', 0, '2026-08-07T17:30:00'),
            session('reception', 1, '2026-08-07T19:00:00'),
            session('arrival', 2, '2026-08-07T16:45:00'),
        ]);

        expect(days[0].sessions.map((s) => s.id)).toEqual(['arrival', 'ceremony', 'reception']);
    });

    it('falls back to creation order for equal start times and unscheduled sessions', () => {
        const { days, unscheduled } = buildScheduleDays([
            session('b', 1, '2026-08-07T17:00:00'),
            session('a', 0, '2026-08-07T17:00:00'),
            session('later', 3, null),
            session('sooner', 2, null),
        ]);

        expect(days[0].sessions.map((s) => s.id)).toEqual(['a', 'b']);
        expect(unscheduled.map((s) => s.id)).toEqual(['sooner', 'later']);
    });
});
