import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PartnerBrandingNotice } from '@/components/checkout/PartnerBrandingNotice';
import type { PartnerBrandingNoticeDto } from '@/lib/api/types';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
}));

const NOTICE: PartnerBrandingNoticeDto = { displayName: 'Studio X', noticeVersion: '1' };

afterEach(cleanup);

describe('PartnerBrandingNotice', () => {
    it('adds the vendor line when the code sends the partner a vendor link', () => {
        render(<PartnerBrandingNotice notice={NOTICE} vendorOffer accepted onChangeAction={vi.fn()} />);
        expect(screen.getByText('vendorOffer:{"partner":"Studio X"}')).toBeTruthy();
    });

    it('has no vendor line otherwise', () => {
        render(<PartnerBrandingNotice notice={NOTICE} accepted onChangeAction={vi.fn()} />);
        expect(screen.queryByText(/^vendorOffer/)).toBeNull();
    });
});
