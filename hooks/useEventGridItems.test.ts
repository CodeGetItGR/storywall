import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { EventGridItem } from '@/hooks/useEventGridItems';
import { useRecentEventItems } from '@/hooks/useEventGridItems';
import type { EventDetailResponseDto, EventMemberResponseDto } from '@/lib/api/types';

const DAY = 24 * 60 * 60 * 1000;

function item(id: string, startAt: string | null, createdAt: string): EventGridItem {
    return {
        member: { eventId: id } as EventMemberResponseDto,
        event: { id, schedule: { startAt }, createdAt } as EventDetailResponseDto,
        isLoading: false,
    };
}

const at = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString();

describe('useRecentEventItems', () => {
    it('ranks a lite event without a date by when it was created', () => {
        const upcoming = item('upcoming', at(10), at(-60));
        const lite = item('lite', null, at(-2));
        const past = item('past', at(-30), at(-90));
        const { result } = renderHook(() => useRecentEventItems([past, lite, upcoming], 3));
        expect(result.current.map((entry) => entry.member.eventId)).toEqual(['upcoming', 'lite', 'past']);
    });
});
