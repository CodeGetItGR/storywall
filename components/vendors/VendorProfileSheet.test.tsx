import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VendorProfileSheet } from '@/components/vendors/VendorProfileSheet';

vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (key: string) => `${ns}.${key}` }));
const form = vi.hoisted(() => ({
    value: {
        values: { businessName: '', vendorType: 'MUSIC', link: '' },
        setField: vi.fn(),
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

afterEach(cleanup);

describe('VendorProfileSheet', () => {
    it('shows the fields, the field error, and every type', () => {
        render(<VendorProfileSheet open profile={null} defaultType="MUSIC" onCloseAction={vi.fn()} />);
        expect(screen.getByLabelText(/Vendors\.profile\.businessName/)).toBeTruthy();
        expect(screen.getByLabelText(/Vendors\.profile\.link/)).toBeTruthy();
        expect(screen.getByText('required')).toBeTruthy();
        expect(screen.getAllByRole('option')).toHaveLength(8);
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
