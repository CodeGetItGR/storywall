import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LiteQuickActions } from '@/components/liteHome/LiteQuickActions';
import type { LiteHomeState } from '@/hooks/useLiteHome';
import type { EventDetailResponseDto, QrLinkResponseDto } from '@/lib/api/types';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/navigation', () => ({ usePathname: () => '/events/e1/tools/gallery' }));
vi.mock('@/hooks/useQrCardTemplates', () => ({ useQrCardHref: () => null }));
vi.mock('@/hooks/useShareLink', () => ({ useShareLink: (url: string) => url }));
vi.mock('@/components/manage/invitations/QrCodeCard', () => ({
    QrCodeCard: ({ qrLink }: { qrLink: QrLinkResponseDto }) => <p>{qrLink.publicUrl}</p>,
}));

afterEach(cleanup);

const guestLink = { id: 'q1', targetType: 'GUEST', status: 'ACTIVE', publicUrl: 'https://storywall.gr/q/abc' } as QrLinkResponseDto;

function home(overrides: Partial<LiteHomeState> = {}): LiteHomeState {
    return {
        isHome: true,
        event: { id: 'e1', title: 'Anna & Nick' } as EventDetailResponseDto,
        tabs: null,
        actions: ['qr', 'share', 'download', 'upgrade'],
        guestLink,
        upgradeHref: '/events/e1/manage?tab=plan',
        onDownload: vi.fn(),
        ...overrides,
    };
}

describe('LiteQuickActions', () => {
    it('labels every action', () => {
        render(<LiteQuickActions home={home()} />);
        expect(screen.getByRole('heading', { name: 'actionsTitle' })).toBeInTheDocument();
        for (const label of ['actions.qr', 'actions.share', 'actions.download', 'actions.upgrade']) {
            expect(screen.getByText(label)).toBeInTheDocument();
        }
    });

    it('downloads everything through the page', () => {
        const onDownload = vi.fn();
        render(<LiteQuickActions home={home({ onDownload })} />);
        fireEvent.click(screen.getByRole('button', { name: 'actions.download' }));
        expect(onDownload).toHaveBeenCalledOnce();
    });

    it('opens the guest code in a sheet', () => {
        render(<LiteQuickActions home={home()} />);
        expect(screen.queryByText(guestLink.publicUrl)).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'actions.qr' }));
        expect(screen.getByRole('heading', { name: 'qrSheetTitle' })).toBeInTheDocument();
        expect(screen.getByText(guestLink.publicUrl)).toBeInTheDocument();
    });

    it('links the upgrade to the plan', () => {
        render(<LiteQuickActions home={home()} />);
        expect(screen.getByRole('link', { name: 'actions.upgrade' })).toHaveAttribute('href', '/events/e1/manage?tab=plan');
    });

    it('shows only the actions it is given', () => {
        render(<LiteQuickActions home={home({ actions: ['download'] })} />);
        expect(screen.queryByText('actions.qr')).toBeNull();
        expect(screen.queryByText('actions.upgrade')).toBeNull();
    });
});
