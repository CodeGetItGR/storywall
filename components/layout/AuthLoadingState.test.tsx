import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthLoadingState } from '@/components/layout/AuthLoadingState';

const mocks = vi.hoisted(() => ({ auth: { isSessionUnavailable: false } }));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mocks.auth }));

const messages = {
    SessionUnavailable: {
        title: "Can't reach StoryWall",
        description: "You're still signed in. We'll reconnect as soon as the server is back.",
    },
};

function renderState() {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <AuthLoadingState />
        </NextIntlClientProvider>,
    );
}

describe('AuthLoadingState', () => {
    afterEach(cleanup);

    it('shows a spinner while the session is loading', () => {
        mocks.auth = { isSessionUnavailable: false };

        const { container } = renderState();

        expect(screen.getByRole('status')).toBeInTheDocument();
        expect(container.querySelector('.animate-spin')).not.toBeNull();
        expect(screen.queryByText("Can't reach StoryWall")).not.toBeInTheDocument();
    });

    it('explains the wait, still with a spinner, while the server is unreachable', () => {
        mocks.auth = { isSessionUnavailable: true };

        const { container } = renderState();

        expect(screen.getByRole('status')).toHaveTextContent("Can't reach StoryWall");
        expect(container.querySelector('.animate-spin')).not.toBeNull();
    });
});
