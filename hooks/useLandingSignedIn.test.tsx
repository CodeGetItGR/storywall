import { act } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useLandingSignedIn } from '@/hooks/useLandingSignedIn';

const auth = vi.hoisted(() => ({ isAuthenticated: false, isBootstrapping: true }));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));

function Probe() {
    return <span>{useLandingSignedIn() ? 'signed in' : 'signed out'}</span>;
}

afterEach(() => {
    auth.isAuthenticated = false;
    auth.isBootstrapping = true;
    document.body.innerHTML = '';
});

describe('useLandingSignedIn', () => {
    it('hydrates signed out when the session settled first, then shows signed in', async () => {
        const container = document.createElement('div');
        container.innerHTML = renderToString(<Probe />);
        document.body.appendChild(container);
        auth.isAuthenticated = true;
        auth.isBootstrapping = false;
        const onRecoverableError = vi.fn();

        await act(async () => {
            hydrateRoot(container, <Probe />, { onRecoverableError });
        });

        expect(onRecoverableError).not.toHaveBeenCalled();
        expect(container).toHaveTextContent('signed in');
    });

    it('stays signed out while the session is still loading', async () => {
        const container = document.createElement('div');
        container.innerHTML = renderToString(<Probe />);
        document.body.appendChild(container);

        await act(async () => {
            hydrateRoot(container, <Probe />);
        });

        expect(container).toHaveTextContent('signed out');
    });
});
