import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CookieConsent } from '@/components/consent/CookieConsent';
import { CookieSettingsLink } from '@/components/consent/CookieSettingsLink';
import { readConsent, writeConsent } from '@/lib/consent';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
}));
vi.mock('@/lib/googleAds', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/googleAds')>()),
    GOOGLE_ADS_ID: 'AW-TEST',
}));
// A plain marker in place of next/script, so the test can see what would load.
vi.mock('next/script', () => ({
    default: ({ id, src }: { id: string; src?: string; children?: ReactNode }) => <span data-script={id} data-src={src} />,
}));
// The sheet's dialog and history handling are covered by the Modal's own tests.
vi.mock('@/components/ui/modal', () => {
    const Modal = ({ open, children }: { open: boolean; children: ReactNode }) => (open ? <div role="dialog">{children}</div> : null);
    Modal.Body = function ModalBody({ children }: { children: ReactNode }) {
        return <div>{children}</div>;
    };
    return { Modal };
});

function expireAll() {
    for (const part of document.cookie.split(';')) {
        const name = part.trim().split('=')[0];
        if (name) document.cookie = `${name}=; Max-Age=0; Path=/`;
    }
}

function gtagScript() {
    return document.querySelector('[data-script="google-ads-gtag"]');
}

describe('CookieConsent', () => {
    afterEach(() => {
        cleanup();
        expireAll();
    });

    it('asks when there is no choice and loads nothing yet', () => {
        render(<CookieConsent />);

        expect(screen.getByRole('region', { name: 'bannerLabel' })).toBeInTheDocument();
        expect(gtagScript()).toBeNull();
    });

    it('loads the Google tag after Accept all', () => {
        render(<CookieConsent />);

        fireEvent.click(screen.getByRole('button', { name: 'acceptAll' }));

        expect(screen.queryByRole('region', { name: 'bannerLabel' })).toBeNull();
        expect(gtagScript()).toHaveAttribute('data-src', 'https://www.googletagmanager.com/gtag/js?id=AW-TEST');
        expect(readConsent()?.ads).toBe(true);
    });

    it('saves a refusal and loads nothing after Reject all', () => {
        render(<CookieConsent />);

        fireEvent.click(screen.getByRole('button', { name: 'rejectAll' }));

        expect(screen.queryByRole('region', { name: 'bannerLabel' })).toBeNull();
        expect(gtagScript()).toBeNull();
        expect(readConsent()?.ads).toBe(false);
    });

    it('stays quiet when a choice is already saved', () => {
        writeConsent(false);
        render(<CookieConsent />);

        expect(screen.queryByRole('region', { name: 'bannerLabel' })).toBeNull();
    });

    it('lets a saved yes be withdrawn from the settings link', () => {
        writeConsent(true);
        document.cookie = '_gcl_aw=GCL.1.abc; Path=/';
        render(
            <>
                <CookieConsent />
                <CookieSettingsLink />
            </>,
        );
        expect(gtagScript()).not.toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'openSettings' }));
        const adsSwitch = screen.getByRole('switch', { name: /adsLabel/ });
        expect(adsSwitch).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByRole('switch', { name: /essentialLabel/ })).toBeDisabled();

        fireEvent.click(adsSwitch);
        act(() => fireEvent.click(screen.getByRole('button', { name: 'save' })));

        expect(screen.queryByRole('dialog')).toBeNull();
        expect(readConsent()?.ads).toBe(false);
        expect(document.cookie).not.toContain('_gcl_aw');
        expect(gtagScript()).toBeNull();
    });
});
