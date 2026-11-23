import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VendorListRow } from '@/components/vendors/list/VendorListRow';
import type { VendorRowDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

vi.mock('@/components/common/ProtectedImage', () => ({
    // eslint-disable-next-line @next/next/no-img-element
    ProtectedImage: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const VENDOR: VendorRowDto = {
    id: 'v1',
    memberId: 'm1',
    vendorType: 'PHOTOGRAPHER',
    businessName: 'Lens & Light',
    link: null,
    logoUrl: null,
    joinedAt: '2026-10-01T10:00:00Z',
};

function renderRow(vendor: VendorRowDto, onAsk = vi.fn()) {
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
            <ul>
                <VendorListRow vendor={vendor} onOpenAction={vi.fn()} onAskAction={onAsk} />
            </ul>
        </NextIntlClientProvider>,
    );
    return onAsk;
}

describe('VendorListRow asking', () => {
    afterEach(cleanup);

    it('offers no ask on a vendor who is not a partner', () => {
        renderRow(VENDOR);
        expect(screen.queryByRole('button', { name: 'Ask about my date' })).not.toBeInTheDocument();
    });

    it('asks a partner', () => {
        const onAsk = renderRow({ ...VENDOR, inquiry: { canAsk: true, sentAt: null } });
        fireEvent.click(screen.getByRole('button', { name: 'Ask about my date' }));
        expect(onAsk).toHaveBeenCalledWith(expect.objectContaining({ id: 'v1' }));
    });
});
