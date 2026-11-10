import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const flag = vi.hoisted(() => ({ on: false }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useCookieConsent', () => ({
    useCookieConsent: () => ({ consent: null, acceptAll: vi.fn(), rejectAll: vi.fn(), openSettings: vi.fn() }),
}));
vi.mock('@/providers/CreateWizardFlagProvider', () => ({ useCreateWizardEnabled: () => flag.on }));

import { CookieBanner } from '@/components/consent/CookieBanner';

const banner = () => screen.getByRole('region', { name: 'bannerLabel' });

afterEach(() => {
    cleanup();
    flag.on = false;
});

describe('CookieBanner position', () => {
    it('sits at the bottom, as before, with the create wizard off', () => {
        render(<CookieBanner />);
        expect(banner().className).toBe(
            'fixed inset-x-2 bottom-[calc(var(--visual-viewport-bottom-inset,0px)+0.5rem)] z-40 mx-auto max-w-xl rounded-3xl bg-background p-4 text-ink shadow-[0_18px_50px_rgba(36,31,26,0.22)] sm:bottom-6 sm:p-5',
        );
    });

    it('moves to the top on phones with the create wizard on, and stays at the bottom from 761px up', () => {
        flag.on = true;
        render(<CookieBanner />);
        expect(banner()).toHaveClass('top-[calc(env(safe-area-inset-top,0px)+0.5rem)]', 'min-[761px]:top-auto', 'min-[761px]:bottom-6', 'z-40');
        expect(banner().className).not.toContain('bottom-[calc(');
    });
});
