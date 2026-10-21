import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useVendorProfileForm } from '@/hooks/useVendorProfileForm';
import type { VendorProfileDto } from '@/lib/api/types';

const save = vi.fn();
const uploadLogo = vi.fn();
const deleteLogo = vi.fn();
vi.mock('@/hooks/useVendorProfile', () => ({
    useSaveVendorProfile: () => ({ mutateAsync: save, isPending: false }),
    useUploadVendorLogo: () => ({ mutateAsync: uploadLogo, isPending: false }),
    useDeleteVendorLogo: () => ({ mutateAsync: deleteLogo, isPending: false }),
}));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'failed' }));

function submitEvent() {
    return { preventDefault: vi.fn() } as unknown as React.SubmitEvent<HTMLFormElement>;
}

beforeEach(() => {
    save.mockReset();
    uploadLogo.mockReset();
    deleteLogo.mockReset();
});

describe('useVendorProfileForm', () => {
    it('starts from the profile, or the event type when there is none', () => {
        const { result } = renderHook(() => useVendorProfileForm({ profile: null, defaultType: 'MUSIC', onSaved: vi.fn() }));
        expect(result.current.values).toEqual({ businessName: '', vendorType: 'MUSIC', link: '' });
    });

    it('starts from an existing profile', () => {
        const profile: VendorProfileDto = {
            businessName: 'Studio X',
            vendorType: 'PHOTOGRAPHER',
            link: '@studio.x',
            logoUrl: null,
            partnerPromptDismissed: false,
        };
        const { result } = renderHook(() => useVendorProfileForm({ profile, defaultType: 'MUSIC', onSaved: vi.fn() }));
        expect(result.current.values).toEqual({ businessName: 'Studio X', vendorType: 'PHOTOGRAPHER', link: '@studio.x' });
    });

    it('requires a business name and a valid link', async () => {
        const { result } = renderHook(() => useVendorProfileForm({ profile: null, defaultType: 'MUSIC', onSaved: vi.fn() }));
        act(() => result.current.setField('link', 'studio'));
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(result.current.fieldErrors).toEqual({ businessName: 'errors.businessNameRequired', link: 'errors.linkInvalid' });
        expect(save).not.toHaveBeenCalled();
    });

    it('rejects a business name over the limit', async () => {
        const { result } = renderHook(() => useVendorProfileForm({ profile: null, defaultType: 'MUSIC', onSaved: vi.fn() }));
        act(() => {
            result.current.setField('businessName', 'x'.repeat(81));
            result.current.setField('link', '@djnik');
        });
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(result.current.fieldErrors).toEqual({ businessName: 'errors.businessNameTooLong' });
        expect(save).not.toHaveBeenCalled();
    });

    it('saves trimmed values, then the logo, then calls onSaved', async () => {
        save.mockResolvedValue({});
        uploadLogo.mockResolvedValue({});
        const onSaved = vi.fn();
        const { result } = renderHook(() => useVendorProfileForm({ profile: null, defaultType: 'MUSIC', onSaved }));
        const logo = new File(['x'], 'logo.png', { type: 'image/png' });
        act(() => {
            result.current.setField('businessName', '  DJ Nik  ');
            result.current.setField('link', '@djnik');
            result.current.setLogo(logo);
        });
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(save).toHaveBeenCalledWith({ businessName: 'DJ Nik', vendorType: 'MUSIC', link: '@djnik' });
        expect(uploadLogo).toHaveBeenCalledWith(logo);
        expect(onSaved).toHaveBeenCalled();
    });

    it('removes the logo when asked and no new one is picked', async () => {
        save.mockResolvedValue({});
        deleteLogo.mockResolvedValue({});
        const onSaved = vi.fn();
        const { result } = renderHook(() => useVendorProfileForm({ profile: null, defaultType: 'MUSIC', onSaved }));
        act(() => {
            result.current.setField('businessName', 'DJ Nik');
            result.current.setField('link', '@djnik');
            result.current.setRemoveLogo(true);
        });
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(deleteLogo).toHaveBeenCalled();
        expect(uploadLogo).not.toHaveBeenCalled();
        expect(onSaved).toHaveBeenCalled();
    });

    it('shows the server error and keeps the sheet open', async () => {
        save.mockRejectedValue(new Error('500'));
        const onSaved = vi.fn();
        const { result } = renderHook(() => useVendorProfileForm({ profile: null, defaultType: 'MUSIC', onSaved }));
        act(() => {
            result.current.setField('businessName', 'DJ Nik');
            result.current.setField('link', '@djnik');
        });
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(result.current.error).toBe('failed');
        expect(onSaved).not.toHaveBeenCalled();
    });
});