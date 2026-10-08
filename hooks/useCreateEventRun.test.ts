import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCreateEventRun } from '@/hooks/useCreateEventRun';

const nav = vi.hoisted(() => ({ search: '' }));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ replace: vi.fn() }),
    useSearchParams: () => new URLSearchParams(nav.search),
}));

afterEach(() => window.history.replaceState(null, '', '/'));

describe('useCreateEventRun', () => {
    it('adds a run id, keeping the step and the linked event type', () => {
        nav.search = 'step=type&type=baby-shower';
        window.history.replaceState(null, '', `/events/new?${nav.search}`);

        renderHook(() => useCreateEventRun());

        const params = new URLSearchParams(window.location.search);
        expect(params.get('step')).toBe('type');
        expect(params.get('type')).toBe('baby-shower');
        expect(params.get('run')).toMatch(/\w+/);
    });
});
