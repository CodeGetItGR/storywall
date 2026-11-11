import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useHomeContent } from '@/hooks/useHomeContent';

const state = vi.hoisted(() => ({
    emailVerified: true as boolean | null,
    isLoading: false,
    memberships: [] as { eventId: string }[],
    wizard: false,
}));

vi.mock('@/hooks/useAuth', () => ({
    useAuth: () => ({ user: { emailVerified: state.emailVerified } }),
}));
vi.mock('@/hooks/useMe', () => ({ useMe: () => undefined }));
vi.mock('@/hooks/useMyEventList', () => ({
    useMyEventList: () => ({ eventQueries: [], isLoading: state.isLoading, memberships: state.memberships }),
}));
vi.mock('@/hooks/useEventGridItems', () => ({ useEventGridItems: () => [] }));
vi.mock('@/providers/CreateWizardFlagProvider', () => ({ useCreateWizardEnabled: () => state.wizard }));

afterEach(() => {
    state.emailVerified = true;
    state.isLoading = false;
    state.memberships = [];
    state.wizard = false;
});

describe('useHomeContent', () => {
    it('shows the no-events state to a verified account with no events', () => {
        const { result } = renderHook(() => useHomeContent());
        expect(result.current.emptyState).toBe('noEvents');
        expect(result.current.showVerifyBanner).toBe(false);
    });

    it('asks to verify the email instead of the banner when there are no events', () => {
        state.emailVerified = false;
        const { result } = renderHook(() => useHomeContent());
        expect(result.current.emptyState).toBe('verifyEmail');
        expect(result.current.showVerifyBanner).toBe(false);
    });

    it('keeps the banner above the events of an unverified account', () => {
        state.emailVerified = false;
        state.memberships = [{ eventId: 'e1' }];
        const { result } = renderHook(() => useHomeContent());
        expect(result.current.emptyState).toBeNull();
        expect(result.current.showVerifyBanner).toBe(true);
    });

    it('shows no empty state or banner while the list loads', () => {
        state.emailVerified = false;
        state.isLoading = true;
        const { result } = renderHook(() => useHomeContent());
        expect(result.current.emptyState).toBeNull();
        expect(result.current.showVerifyBanner).toBe(false);
    });

    it('treats an unknown verification status as verified', () => {
        state.emailVerified = null;
        const { result } = renderHook(() => useHomeContent());
        expect(result.current.emptyState).toBe('noEvents');
    });

    it('lets an unverified account create once the wizard is on', () => {
        state.wizard = true;
        state.emailVerified = false;
        const { result } = renderHook(() => useHomeContent());
        expect(result.current.canCreateEvent).toBe(true);
        expect(result.current.emptyState).toBe('noEvents');
        expect(result.current.showVerifyBanner).toBe(false);
        expect(result.current.showCreateButton).toBe(true);
    });

    it('keeps the old block with the wizard off', () => {
        state.emailVerified = false;
        const { result } = renderHook(() => useHomeContent());
        expect(result.current.canCreateEvent).toBe(false);
        expect(result.current.showCreateButton).toBe(false);
    });
});
