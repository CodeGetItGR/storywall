import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { AdminNavigationProvider, useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import messages from '@/messages/en.json';

function CurrentTab() {
    const { tab, tabs, activeHash } = useAdminNavigation();
    const keys = tabs.map((item) => item.key);
    return (
        <p>
            {tab}:{tabs.find((item) => item.key === tab)?.label}:{activeHash}:
            {keys.indexOf('themeFonts') + 1 === keys.indexOf('qrCards') ? 'afterThemeFonts' : 'elsewhere'}
        </p>
    );
}

afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
});

describe('QR cards tab', () => {
    it('opens from #qr-cards and sits right after Theme fonts', () => {
        window.history.replaceState(null, '', '/admin#qr-cards');
        render(
            <NextIntlClientProvider locale="en" messages={messages}>
                <AdminNavigationProvider>
                    <CurrentTab />
                </AdminNavigationProvider>
            </NextIntlClientProvider>,
        );

        expect(screen.getByText('qrCards:QR cards:#qr-cards:afterThemeFonts')).toBeInTheDocument();
    });
});
