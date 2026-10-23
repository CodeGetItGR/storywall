import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProCreditLine } from '@/components/vendors/ProCreditLine';

vi.mock('next-intl', () => ({
    useTranslations: (ns: string) => (key: string, values?: Record<string, unknown>) => (values ? `${ns}.${key}:${JSON.stringify(values)}` : `${ns}.${key}`),
}));

afterEach(cleanup);

describe('ProCreditLine', () => {
    it('credits the business on a photo and on a video', () => {
        render(<ProCreditLine credit={{ businessName: 'Studio X', vendorType: 'PHOTOGRAPHER' }} mediaType="IMAGE" />);
        expect(screen.getByText('Vendors.credit.photo:{"name":"Studio X"}')).toBeTruthy();
        cleanup();
        render(<ProCreditLine credit={{ businessName: 'Reel Co', vendorType: 'VIDEOGRAPHER' }} mediaType="VIDEO" />);
        expect(screen.getByText('Vendors.credit.video:{"name":"Reel Co"}')).toBeTruthy();
    });

    it('falls back to the type without a business name, and to nothing without a credit', () => {
        render(<ProCreditLine credit={{ businessName: null, vendorType: 'PHOTOGRAPHER' }} mediaType="IMAGE" />);
        expect(screen.getByText('Vendors.credit.photo:{"name":"Vendors.types.PHOTOGRAPHER"}')).toBeTruthy();
        cleanup();
        const { container } = render(<ProCreditLine credit={null} mediaType="IMAGE" />);
        expect(container.textContent).toBe('');
    });
});
