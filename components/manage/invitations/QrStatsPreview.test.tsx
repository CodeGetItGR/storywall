// components/manage/invitations/QrStatsPreview.test.tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { QrStatsPreview } from '@/components/manage/invitations/QrStatsPreview';
import type { QrLinkStatsDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

afterEach(cleanup);

const stats: QrLinkStatsDto = {
    qrLinkId: 'q1',
    label: null,
    labelKey: null,
    targetType: 'EVENT_JOIN',
    status: 'ACTIVE',
    joinCount: 42,
    maxGuests: 100,
    remainingSlots: 58,
    lastJoinedAt: null,
    uploadCount: 17,
};

function renderPreview(lowSlots: number | null = null, onSeeMore = vi.fn()) {
    render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <QrStatsPreview stats={stats} lowSlots={lowSlots} onSeeMore={onSeeMore} />
        </NextIntlClientProvider>,
    );
    return onSeeMore;
}

describe('QrStatsPreview', () => {
    it('shows joined guests and their uploads', () => {
        renderPreview();
        expect(screen.getByRole('region', { name: 'QR performance' })).toBeInTheDocument();
        expect(screen.getByText('Joined').nextSibling).toHaveTextContent('42');
        expect(screen.getByText('Uploads by joined guests').nextSibling).toHaveTextContent('17');
        expect(screen.queryByText(/slots left/)).toBeNull();
    });

    it('See more opens the full stats', () => {
        const onSeeMore = renderPreview();
        fireEvent.click(screen.getByRole('button', { name: 'See more' }));
        expect(onSeeMore).toHaveBeenCalledOnce();
    });

    it('warns when slots run low', () => {
        renderPreview(3);
        expect(screen.getByText('3 slots left')).toBeInTheDocument();
    });
});
