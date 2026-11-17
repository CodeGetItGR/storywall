import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useEventJourneyPhase } from '@/hooks/useEventJourneyPhase';

vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
}));

const event = {
    sessions: [{ id: 'main', isMain: true, startAt: '2026-12-12T16:00:00Z', endAt: null, deletedAt: null, displayOrder: 0 }],
    schedule: { startAt: '2026-12-12T16:00:00Z', timezone: 'Europe/Athens' },
} as never;

describe('useEventJourneyPhase', () => {
    it('opens on the current phase and counts the days to go', () => {
        const { result } = renderHook(() => useEventJourneyPhase(event, new Date('2026-11-18T10:00:00Z')));
        expect(result.current.current).toBe('before');
        expect(result.current.selected).toBe('before');
        expect(result.current.steps.map((step) => step.state)).toEqual(['current', 'upcoming', 'upcoming']);
        expect(result.current.steps[0].caption).toBe('phases.daysToGo:{"count":24}');
        expect(result.current.steps[2].caption).toMatch(/^phases\.from:/);
    });

    it('marks Before done and says Today on the day', () => {
        const { result } = renderHook(() => useEventJourneyPhase(event, new Date('2026-12-12T10:00:00Z')));
        expect(result.current.steps.map((step) => step.state)).toEqual(['done', 'current', 'upcoming']);
        expect(result.current.steps[0].caption).toBe('phases.done');
        expect(result.current.steps[1].caption).toBe('phases.today');
    });

    it('lets the host look at another phase', () => {
        const { result } = renderHook(() => useEventJourneyPhase(event, new Date('2026-11-18T10:00:00Z')));
        act(() => result.current.select('after'));
        expect(result.current.selected).toBe('after');
        expect(result.current.current).toBe('before');
    });
});
