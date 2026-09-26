import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppShell } from '@/components/layout/AppShell';

const mocks = vi.hoisted(() => ({
    replace: vi.fn(),
    auth: { user: null, isBootstrapping: true, isSessionUnavailable: false },
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ replace: mocks.replace }),
    usePathname: () => '/events/e1/feed',
    useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mocks.auth }));

const messages = {
    SessionUnavailable: {
        title: "Can't reach StoryWall",
        description: "You're still signed in. We'll reconnect as soon as the server is back.",
    },
};

function renderShell() {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <AppShell>
                <p>page</p>
            </AppShell>
        </NextIntlClientProvider>,
    );
}

describe('AppShell while the session check is unavailable', () => {
    afterEach(() => {
        cleanup();
        mocks.replace.mockReset();
    });

    it('explains the wait instead of sending the user to the login screen', () => {
        mocks.auth = { user: null, isBootstrapping: true, isSessionUnavailable: true };

        renderShell();

        expect(screen.getByRole('status')).toHaveTextContent("Can't reach StoryWall");
        expect(screen.queryByText('page')).not.toBeInTheDocument();
        expect(mocks.replace).not.toHaveBeenCalled();
    });

    it('shows a spinner, not a blank page, while an ordinary bootstrap is in flight', () => {
        mocks.auth = { user: null, isBootstrapping: true, isSessionUnavailable: false };

        renderShell();

        expect(screen.getByRole('status')).not.toHaveTextContent("Can't reach StoryWall");
        expect(screen.queryByText('page')).not.toBeInTheDocument();
        expect(mocks.replace).not.toHaveBeenCalled();
    });
});
