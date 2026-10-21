import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProfileVendorSection } from '@/components/profile/ProfileVendorSection';

vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (key: string) => `${ns}.${key}` }));
vi.mock('@/components/vendors/VendorProfileSheet', () => ({ VendorProfileSheet: () => <div>sheet</div> }));
vi.mock('@/components/vendors/VendorLogo', () => ({ VendorLogo: () => null }));
const profile = vi.hoisted(() => ({ data: null as unknown }));
vi.mock('@/hooks/useVendorProfile', () => ({ useVendorProfile: () => ({ data: profile.data, isLoading: false }) }));

afterEach(cleanup);

describe('ProfileVendorSection', () => {
    it('is hidden for people who never joined as a vendor', () => {
        profile.data = null;
        const { container } = render(<ProfileVendorSection />);
        expect(container.textContent).toBe('');
    });

    it('shows the business, type and link with an edit action', () => {
        profile.data = { businessName: 'Studio X', vendorType: 'PHOTOGRAPHER', link: '@studio.x', logoUrl: null, partnerPromptDismissed: false };
        render(<ProfileVendorSection />);
        expect(screen.getByText('Studio X')).toBeTruthy();
        expect(screen.getByText('Vendors.types.PHOTOGRAPHER')).toBeTruthy();
        expect(screen.getByText('@studio.x')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Vendors.profile.edit' })).toBeTruthy();
    });

    it('opens the sheet from the edit action', () => {
        profile.data = { businessName: 'Studio X', vendorType: 'PHOTOGRAPHER', link: '@studio.x', logoUrl: null, partnerPromptDismissed: false };
        render(<ProfileVendorSection />);
        expect(screen.queryByText('sheet')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Vendors.profile.edit' }));
        expect(screen.getByText('sheet')).toBeTruthy();
    });
});
