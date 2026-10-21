import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EventVendorsSection } from '@/components/admin/events/EventVendorsSection';

vi.mock('next-intl', () => ({
    useTranslations: (ns: string) => (key: string, values?: Record<string, unknown>) =>
        values ? `${ns}.${key}:${JSON.stringify(values)}` : `${ns}.${key}`,
    useLocale: () => 'en',
}));
vi.mock('@/lib/datetime', () => ({ formatDate: () => '1 Jul 2027' }));
const query = vi.hoisted(() => ({ value: { data: [] as unknown[], isLoading: false } }));
vi.mock('@/hooks/useAdminEvents', () => ({ useAdminEventVendors: () => query.value }));

afterEach(cleanup);

describe('EventVendorsSection', () => {
    it('lists type, business name and joined date', () => {
        query.value = {
            data: [
                {
                    id: 'v1',
                    memberId: 'm1',
                    vendorType: 'PHOTOGRAPHER',
                    businessName: 'Studio X',
                    link: null,
                    logoUrl: null,
                    joinedAt: '2027-07-01T10:00:00Z',
                    hiddenByHost: false,
                    optedOut: false,
                },
            ],
            isLoading: false,
        };
        render(<EventVendorsSection eventId="e1" />);
        expect(screen.getByText('Vendors.types.PHOTOGRAPHER')).toBeTruthy();
        expect(screen.getByText('Studio X')).toBeTruthy();
        expect(screen.getByText('Vendors.admin.joined:{"date":"1 Jul 2027"}')).toBeTruthy();
    });

    it('shows the empty line', () => {
        query.value = { data: [], isLoading: false };
        render(<EventVendorsSection eventId="e1" />);
        expect(screen.getByText('Vendors.admin.empty')).toBeTruthy();
    });
});
