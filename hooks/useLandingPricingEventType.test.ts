import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useLandingPricingEventType } from '@/hooks/useLandingPricingEventType';

const IDS = ['wedding', 'baby-shower', 'reunion'];

afterEach(() => window.history.replaceState(null, '', '/'));

describe('useLandingPricingEventType', () => {
    it('starts on the default without touching the URL', () => {
        const { result } = renderHook(() => useLandingPricingEventType(IDS, 'baby-shower'));
        expect(result.current.selectedId).toBe('baby-shower');
        expect(window.location.search).toBe('');
    });

    it('opens on the type in ?event=, in any case or with underscores', () => {
        window.history.replaceState(null, '', '/?event=Baby_Shower');
        const { result } = renderHook(() => useLandingPricingEventType(IDS, 'wedding'));
        expect(result.current.selectedId).toBe('baby-shower');
    });

    it('falls back to the default, else the first, for an unknown ?event=', () => {
        window.history.replaceState(null, '', '/?event=graduation');
        expect(renderHook(() => useLandingPricingEventType(IDS, 'reunion')).result.current.selectedId).toBe('reunion');
        expect(renderHook(() => useLandingPricingEventType(IDS, null)).result.current.selectedId).toBe('wedding');
    });

    it('writes a pick to ?event=, keeping other params and the hash', () => {
        window.history.replaceState(null, '', '/el?utm=x#pricing');
        const { result } = renderHook(() => useLandingPricingEventType(IDS, 'wedding'));

        act(() => result.current.selectEventType('reunion'));

        expect(result.current.selectedId).toBe('reunion');
        expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe('/el?utm=x&event=reunion#pricing');
    });

    it('ignores a pick that is not among the ids', () => {
        const { result } = renderHook(() => useLandingPricingEventType(IDS, 'wedding'));
        act(() => result.current.selectEventType('graduation'));
        expect(result.current.selectedId).toBe('wedding');
        expect(window.location.search).toBe('');
    });

    it('has nothing selected when there are no ids', () => {
        expect(renderHook(() => useLandingPricingEventType([], null)).result.current.selectedId).toBeNull();
    });
});
