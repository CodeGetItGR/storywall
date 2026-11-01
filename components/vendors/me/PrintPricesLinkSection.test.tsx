import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PrintPricesLinkSection } from '@/components/vendors/me/PrintPricesLinkSection';

vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (key: string) => `${ns}.${key}` }));

afterEach(cleanup);

describe('PrintPricesLinkSection', () => {
    it('links to the print prices on the business page', () => {
        render(<PrintPricesLinkSection />);
        expect(screen.getByRole('link', { name: 'Vendors.me.printPrices.openBusiness' }).getAttribute('href')).toBe('/business#print-prices');
    });

    it('shows the included prints row under the link', () => {
        render(<PrintPricesLinkSection includedRow={<p>included row</p>} />);
        expect(screen.getByText('included row')).toBeTruthy();
    });
});
