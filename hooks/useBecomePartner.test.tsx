import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBecomePartner } from '@/hooks/useBecomePartner';

const dismiss = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useVendorProfile', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/hooks/useVendorProfile')>()),
    useVendorProfile: () => ({ data: { businessName: 'DJ Nik', vendorType: 'MUSIC', link: '@djnik', logoUrl: null, partnerPromptDismissed: false } }),
    useDismissPartnerPrompt: () => ({ mutateAsync: dismiss, isPending: false }),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { email: 'nik@example.com', firstName: 'Nik', lastName: 'Papas' } }) }));

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    dismiss.mockReset();
    client = new QueryClient();
});

describe('useBecomePartner', () => {
    it('fills the form from the profile and the account', () => {
        const { result } = renderHook(() => useBecomePartner(), { wrapper });
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
        const { result } = renderHook(() => useBecomePartner(), { wrapper });
        act(() => result.current.openSheet());
        expect(result.current.sheetOpen).toBe(true);
        act(() => result.current.closeSheet());
        expect(result.current.sheetOpen).toBe(false);
    });

    it('refreshes the vendor queries when the sheet closes, not while it is open', () => {
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useBecomePartner(), { wrapper });
        act(() => result.current.openSheet());
        expect(invalidate).not.toHaveBeenCalled();
        act(() => result.current.closeSheet());
        expect(invalidate).toHaveBeenCalledTimes(1);
        const { predicate } = invalidate.mock.calls[0][0] as { predicate: (query: { queryKey: readonly unknown[] }) => boolean };
        expect(predicate({ queryKey: ['events', 'e1', 'vendors', 'me'] })).toBe(true);
        expect(predicate({ queryKey: ['events', 'e1', 'media'] })).toBe(false);
    });

    it('stores the dismissal and survives a failure', async () => {
        dismiss.mockRejectedValueOnce(new Error('500'));
        const { result } = renderHook(() => useBecomePartner(), { wrapper });
        await act(() => result.current.dismiss());
        expect(dismiss).toHaveBeenCalledTimes(1);
    });
});
