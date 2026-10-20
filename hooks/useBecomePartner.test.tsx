import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBecomePartner } from '@/hooks/useBecomePartner';

const dismiss = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useVendorProfile', () => ({
    useVendorProfile: () => ({ data: { businessName: 'DJ Nik', vendorType: 'MUSIC', link: '@djnik', logoUrl: null, partnerPromptDismissed: false } }),
    useDismissPartnerPrompt: () => ({ mutateAsync: dismiss, isPending: false }),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { email: 'nik@example.com', firstName: 'Nik', lastName: 'Papas' } }) }));

beforeEach(() => dismiss.mockReset());

describe('useBecomePartner', () => {
    it('fills the form from the profile and the account', () => {
        const { result } = renderHook(() => useBecomePartner());
        expect(result.current.defaults).toEqual({
            name: 'Nik Papas',
            businessName: 'DJ Nik',
            role: 'MUSIC',
            email: 'nik@example.com',
            link: '@djnik',
        });
        expect(result.current.search).toBe('?utm_source=storywall-vendor&utm_medium=MUSIC');
    });

    it('opens and closes the sheet', () => {
        const { result } = renderHook(() => useBecomePartner());
        act(() => result.current.openSheet());
        expect(result.current.sheetOpen).toBe(true);
        act(() => result.current.closeSheet());
        expect(result.current.sheetOpen).toBe(false);
    });

    it('stores the dismissal and survives a failure', async () => {
        dismiss.mockRejectedValueOnce(new Error('500'));
        const { result } = renderHook(() => useBecomePartner());
        await act(() => result.current.dismiss());
        expect(dismiss).toHaveBeenCalledTimes(1);
    });
});
