import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useVendorProfileForm } from '@/hooks/useVendorProfileForm';
import type { VendorProfileDto } from '@/lib/api/types';

const save = vi.fn();
const uploadLogo = vi.fn();
const deleteLogo = vi.fn();
const uploadBanner = vi.fn();
const deleteBanner = vi.fn();
vi.mock('@/hooks/useVendorProfile', () => ({
    useSaveVendorProfile: () => ({ mutateAsync: save, isPending: false }),
    useUploadVendorLogo: () => ({ mutateAsync: uploadLogo, isPending: false }),
    useDeleteVendorLogo: () => ({ mutateAsync: deleteLogo, isPending: false }),
    useUploadVendorBanner: () => ({ mutateAsync: uploadBanner, isPending: false }),
    useDeleteVendorBanner: () => ({ mutateAsync: deleteBanner, isPending: false }),
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
    uploadBanner.mockReset();
    deleteBanner.mockReset();
});

describe('useVendorProfileForm', () => {
    it('starts from the profile, or the event type when there is none', () => {
        const { result } = renderHook(() => useVendorProfileForm({ profile: null, defaultType: 'MUSIC', onSaved: vi.fn() }));
        expect(result.current.values).toEqual({
            businessName: '',
            vendorType: 'MUSIC',
            description: '',
            serviceTags: [],
            instagram: '',
            website: '',
            contactPhone: '',
            contactEmail: '',
            showPhone: false,
            showEmail: false,
        });
    });

    it('starts from an existing profile', () => {
        const profile: VendorProfileDto = {
            businessName: 'Studio X',
            vendorType: 'PHOTOGRAPHER',
            description: 'Weddings',
            serviceTags: ['DRONE', 'DJ'],
            instagram: 'studio.x',
            website: 'https://studio.gr',
            link: '@studio.x',
            contactPhone: '2101234567',
            showPhone: true,
            logoUrl: null,
            partnerPromptDismissed: false,
        };
        const { result } = renderHook(() => useVendorProfileForm({ profile, defaultType: 'MUSIC', onSaved: vi.fn() }));
        expect(result.current.values).toEqual({
            businessName: 'Studio X',
            vendorType: 'PHOTOGRAPHER',
            description: 'Weddings',
            serviceTags: ['DRONE'],
            instagram: '@studio.x',
            website: 'https://studio.gr',
            contactPhone: '2101234567',
            contactEmail: '',
            showPhone: true,
            showEmail: false,
        });
    });

    it('requires a business name and checks the links and contact details', async () => {
        const { result } = renderHook(() => useVendorProfileForm({ profile: null, defaultType: 'MUSIC', onSaved: vi.fn() }));
        act(() => {
            result.current.setField('instagram', 'bad handle');
            result.current.setField('website', 'http://studio.gr');
            result.current.setField('contactPhone', 'call me');
            result.current.setField('contactEmail', 'hi@studio');
        });
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(result.current.fieldErrors).toEqual({
            businessName: 'errors.businessNameRequired',
            instagram: 'errors.instagramInvalid',
            website: 'errors.websiteInvalid',
            contactPhone: 'errors.phoneInvalid',
            contactEmail: 'errors.emailInvalid',
        });
        expect(save).not.toHaveBeenCalled();
    });

    it('rejects a business name over the limit', async () => {
        const { result } = renderHook(() => useVendorProfileForm({ profile: null, defaultType: 'MUSIC', onSaved: vi.fn() }));
        act(() => {
            result.current.setField('businessName', 'x'.repeat(81));
            result.current.setField('instagram', '@djnik');
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
            result.current.setField('description', '  Weddings  ');
            result.current.setField('instagram', 'https://www.instagram.com/djnik/');
            result.current.setField('contactEmail', 'nik@dj.gr');
            result.current.toggleServiceTag('DJ');
            result.current.setShowEmail(true);
            result.current.setLogo(logo);
        });
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(save).toHaveBeenCalledWith({
            businessName: 'DJ Nik',
            vendorType: 'MUSIC',
            description: 'Weddings',
            serviceTags: ['DJ'],
            instagram: 'djnik',
            website: null,
            contactPhone: null,
            contactEmail: 'nik@dj.gr',
            showPhone: false,
            showEmail: true,
        });
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
            result.current.setField('instagram', '@djnik');
            result.current.setRemoveLogo(true);
        });
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(deleteLogo).toHaveBeenCalled();
        expect(uploadLogo).not.toHaveBeenCalled();
        expect(onSaved).toHaveBeenCalled();
    });

    it('uploads a picked banner and leaves the logo alone', async () => {
        save.mockResolvedValue({});
        uploadBanner.mockResolvedValue({});
        const file = new File(['x'], 'cover.png', { type: 'image/png' });
        const { result } = renderHook(() => useVendorProfileForm({ profile: null, defaultType: 'MUSIC', onSaved: vi.fn() }));
        act(() => {
            result.current.setField('businessName', 'DJ Nik');
            result.current.setField('instagram', '@djnik');
            result.current.setBanner(file);
        });
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(uploadBanner).toHaveBeenCalledWith(file);
        expect(uploadLogo).not.toHaveBeenCalled();
        expect(deleteLogo).not.toHaveBeenCalled();
    });

    it('removes the banner when asked and no new one is picked', async () => {
        save.mockResolvedValue({});
        deleteBanner.mockResolvedValue({});
        const { result } = renderHook(() => useVendorProfileForm({ profile: null, defaultType: 'MUSIC', onSaved: vi.fn() }));
        act(() => {
            result.current.setField('businessName', 'DJ Nik');
            result.current.setField('instagram', '@djnik');
            result.current.setRemoveBanner(true);
        });
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(deleteBanner).toHaveBeenCalled();
        expect(uploadBanner).not.toHaveBeenCalled();
    });

    it('toggles a tag and ignores a sixth one', () => {
        const { result } = renderHook(() => useVendorProfileForm({ profile: null, defaultType: 'MUSIC', onSaved: vi.fn() }));
        act(() => {
            for (const tag of ['DJ', 'LIVE_MUSIC', 'SOUND', 'LIGHTING', 'CHURCH', 'DANCE_FLOOR'] as const) result.current.toggleServiceTag(tag);
        });
        expect(result.current.values.serviceTags).toEqual(['DJ', 'LIVE_MUSIC', 'SOUND', 'LIGHTING', 'CHURCH']);
        act(() => result.current.toggleServiceTag('SOUND'));
        expect(result.current.values.serviceTags).toEqual(['DJ', 'LIVE_MUSIC', 'LIGHTING', 'CHURCH']);
    });

    it('shows the server error and keeps the sheet open', async () => {
        save.mockRejectedValue(new Error('500'));
        const onSaved = vi.fn();
        const { result } = renderHook(() => useVendorProfileForm({ profile: null, defaultType: 'MUSIC', onSaved }));
        act(() => {
            result.current.setField('businessName', 'DJ Nik');
            result.current.setField('instagram', '@djnik');
        });
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(result.current.error).toBe('failed');
        expect(onSaved).not.toHaveBeenCalled();
    });
});
