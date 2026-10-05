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
            {keys.indexOf('reactionTypes') + 1 === keys.indexOf('themePresets') ? 'afterReactions' : 'elsewhere'}
        </p>
    );
}

afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
});

describe('Themes tab', () => {
    it('opens from #theme-presets and sits right after Reactions', () => {
        window.history.replaceState(null, '', '/admin#theme-presets');
        render(
            <NextIntlClientProvider locale="en" messages={messages}>
                <AdminNavigationProvider>
                    <CurrentTab />
                </AdminNavigationProvider>
            </NextIntlClientProvider>,
        );

        expect(screen.getByText('themePresets:Themes:#theme-presets:afterReactions')).toBeInTheDocument();
    });
});
