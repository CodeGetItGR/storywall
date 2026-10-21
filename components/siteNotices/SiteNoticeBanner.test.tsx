import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

import { SiteNoticeBanner } from '@/components/siteNotices/SiteNoticeBanner';

describe('SiteNoticeBanner', () => {
    afterEach(cleanup);

    it('announces a warning as an alert and an offer as a status', () => {
        const { rerender } = render(<SiteNoticeBanner tone="WARNING" message="Outage" link={null} onDismiss={null} />);
        expect(screen.getByRole('alert')).toHaveTextContent('Outage');
        rerender(<SiteNoticeBanner tone="OFFER" message="20% off" link={null} onDismiss={null} />);
        expect(screen.getByRole('status')).toHaveTextContent('20% off');
    });

    it('opens an external link in a new tab and keeps a site path in the tab', () => {
        const { rerender } = render(
            <SiteNoticeBanner tone="INFO" message="m" link={{ href: 'https://status.example.com', label: 'View details' }} onDismiss={null} />,
        );
        const external = screen.getByRole('link', { name: 'View details' });
        expect(external).toHaveAttribute('target', '_blank');
        expect(external).toHaveAttribute('rel', 'noopener noreferrer');
        rerender(<SiteNoticeBanner tone="INFO" message="m" link={{ href: '/pricing', label: 'See plans' }} onDismiss={null} />);
        expect(screen.getByRole('link', { name: 'See plans' })).not.toHaveAttribute('target');
    });

    it('shows a close button only when it can be closed', () => {
        const onDismiss = vi.fn();
        const { rerender } = render(<SiteNoticeBanner tone="INFO" message="m" link={null} onDismiss={null} />);
        expect(screen.queryByRole('button', { name: 'close' })).toBeNull();
        rerender(<SiteNoticeBanner tone="INFO" message="m" link={null} onDismiss={onDismiss} />);
        fireEvent.click(screen.getByRole('button', { name: 'close' }));
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });
});
