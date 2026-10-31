import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VendorProfileSheet } from '@/components/vendors/VendorProfileSheet';

vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (key: string) => `${ns}.${key}` }));
const form = vi.hoisted(() => ({
    value: {
        values: {
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
        },
        setField: vi.fn(),
        toggleServiceTag: vi.fn(),
        setShowPhone: vi.fn(),
        setShowEmail: vi.fn(),
        logo: null,
        setLogo: vi.fn(),
        removeLogo: false,
        setRemoveLogo: vi.fn(),
        fieldErrors: { businessName: 'required' } as Record<string, string>,
        error: null as string | null,
        isSaving: false,
        handleSubmit: vi.fn((event: { preventDefault: () => void }) => event.preventDefault()),
    },
}));
vi.mock('@/components/vendors/VendorLogo', () => ({ VendorLogo: () => null }));
vi.mock('@/hooks/useVendorProfileForm', () => ({ useVendorProfileForm: () => form.value }));
const me = vi.hoisted(() => ({ partner: false }));
vi.mock('@/hooks/useMe', () => ({ useMe: () => ({ data: me }) }));

afterEach(() => {
    cleanup();
    me.partner = false;
});

describe('VendorProfileSheet', () => {
    it('shows the fields and the field error, without a type picker', () => {
        render(<VendorProfileSheet open profile={null} defaultType="MUSIC" onCloseAction={vi.fn()} />);
        expect(screen.getByLabelText(/Vendors\.profile\.businessName/)).toBeTruthy();
        expect(screen.getByLabelText(/Vendors\.profile\.description/)).toBeTruthy();
        expect(screen.getByLabelText(/Vendors\.profile\.instagram/)).toBeTruthy();
        expect(screen.getByLabelText(/Vendors\.profile\.website/)).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Vendors.serviceTags.DJ' }).getAttribute('aria-pressed')).toBe('false');
        expect(screen.getByText('required')).toBeTruthy();
        expect(screen.queryByRole('combobox')).toBeNull();
    });

    it('shows the contact fields to approved partners only', () => {
        render(<VendorProfileSheet open profile={null} defaultType="MUSIC" onCloseAction={vi.fn()} />);
        expect(screen.queryByLabelText(/Vendors\.profile\.phone/)).toBeNull();
        cleanup();
        me.partner = true;
        render(<VendorProfileSheet open profile={null} defaultType="MUSIC" onCloseAction={vi.fn()} />);
        expect(screen.getByRole('textbox', { name: 'Vendors.profile.phone' })).toBeTruthy();
        fireEvent.click(screen.getByRole('switch', { name: 'Vendors.profile.phone: Vendors.profile.showOnCard' }));
        expect(form.value.setShowPhone).toHaveBeenCalledWith(true);
    });

    it('picks a logo through a button, with the allowed image types', () => {
        render(<VendorProfileSheet open profile={null} defaultType="MUSIC" onCloseAction={vi.fn()} />);
        expect(screen.getByRole('button', { name: 'Vendors.profile.logoChoose' })).toBeTruthy();
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        expect(input.accept).toBe('image/jpeg,image/png,image/webp,image/gif');
    });

    it('submits through the form hook and offers "Later"', () => {
        const onClose = vi.fn();
        render(<VendorProfileSheet open profile={null} defaultType="MUSIC" onCloseAction={onClose} />);
        fireEvent.click(screen.getByRole('button', { name: 'Vendors.profile.save' }));
        expect(form.value.handleSubmit).toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Vendors.profile.later' }));
        expect(onClose).toHaveBeenCalled();
    });
});
