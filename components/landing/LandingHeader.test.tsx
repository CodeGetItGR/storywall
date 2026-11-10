import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LandingHeader } from '@/components/landing/LandingHeader';
import { CreateWizardFlagProvider } from '@/providers/CreateWizardFlagProvider';

const auth = vi.hoisted(() => ({ user: null as { role: string } | null }));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('@/hooks/useLandingSignedIn', () => ({ useLandingSignedIn: () => false }));
vi.mock('@/components/common/ProtectedImage', () => ({ ProtectedImage: () => null }));
vi.mock('@/components/LanguageSwitcher', () => ({ LanguageSwitcher: () => null }));
vi.mock('@/components/landing/LandingMotionToggle', () => ({ LandingMotionToggle: () => null }));
vi.mock('@/components/landing/LandingProfileBadge', () => ({ LandingProfileBadge: () => null }));

afterEach(() => {
    cleanup();
    auth.user = null;
});

const header = <LandingHeader homeHref="/" links={[]} loginLabel="Log in" mobileLoginLabel="Log in" />;

describe('LandingHeader create button', () => {
    it('is absent with the wizard off (outside the provider)', () => {
        render(header);
        expect(screen.queryAllByRole('link', { name: 'Create an event' })).toHaveLength(0);
    });

    it('is absent with the wizard off (provider says off)', () => {
        render(
            <CreateWizardFlagProvider enabled={false} createLabel="Create an event">
                {header}
            </CreateWizardFlagProvider>,
        );
        expect(screen.queryAllByRole('link', { name: 'Create an event', hidden: true })).toHaveLength(0);
    });

    it('links to /events/new in the header and the phone menu with the wizard on', () => {
        render(
            <CreateWizardFlagProvider enabled createLabel="Create an event">
                {header}
            </CreateWizardFlagProvider>,
        );
        const links = screen.getAllByRole('link', { name: 'Create an event', hidden: true });
        expect(links).toHaveLength(2);
        for (const link of links) expect(link).toHaveAttribute('href', '/events/new');
    });

    it('is absent for an admin', () => {
        auth.user = { role: 'ADMIN' };
        render(
            <CreateWizardFlagProvider enabled createLabel="Create an event">
                {header}
            </CreateWizardFlagProvider>,
        );
        expect(screen.queryAllByRole('link', { name: 'Create an event', hidden: true })).toHaveLength(0);
    });
});
