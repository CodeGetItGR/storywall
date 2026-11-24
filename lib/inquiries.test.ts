import { describe, expect, it } from 'vitest';

import type { EventDetailResponseDto, PartnerBrandingDto, VendorRowDto } from '@/lib/api/types';
import { formatInquiryDate, inquiryDateBounds, markCardInquirySent, markVendorInquirySent } from '@/lib/inquiries';

describe('inquiryDateBounds', () => {
    it('runs from the local today to three years ahead', () => {
        expect(inquiryDateBounds(new Date(2026, 10, 23, 23, 30))).toEqual({ min: '2026-11-23', max: '2029-11-23' });
    });
});

describe('formatInquiryDate', () => {
    it('formats a calendar date without shifting it', () => {
        expect(formatInquiryDate('en', '2027-06-12')).toBe('Jun 12, 2027');
    });
});

describe('markVendorInquirySent', () => {
    it('closes the ask on that vendor only', () => {
        const rows = [
            { id: 'a', inquiry: { canAsk: true, sentAt: null } },
            { id: 'b', inquiry: { canAsk: true, sentAt: null } },
        ] as VendorRowDto[];
        const next = markVendorInquirySent(rows, 'a', '2026-11-23T10:00:00Z');
        expect(next?.[0].inquiry).toEqual({ canAsk: false, sentAt: '2026-11-23T10:00:00Z' });
        expect(next?.[1].inquiry).toEqual({ canAsk: true, sentAt: null });
    });
});

describe('markCardInquirySent', () => {
    it('closes the ask on the feed card', () => {
        const event = { partnerBranding: { inquiry: { canAsk: true, sentAt: null } } as PartnerBrandingDto } as EventDetailResponseDto;
        expect(markCardInquirySent(event, '2026-11-23T10:00:00Z')?.partnerBranding?.inquiry).toEqual({
            canAsk: false,
            sentAt: '2026-11-23T10:00:00Z',
        });
    });

    it('leaves an event without a card alone', () => {
        const event = { partnerBranding: null } as EventDetailResponseDto;
        expect(markCardInquirySent(event, 'x')).toBe(event);
    });
});
