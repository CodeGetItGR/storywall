import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LegalPageShell } from '@/components/legal/LegalPageShell';

const intl = vi.hoisted(() => ({ locale: 'en' }));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => intl.locale }));
vi.mock('@/components/common/Logo', () => ({ Logo: () => null }));

afterEach(() => {
    cleanup();
    intl.locale = 'en';
});

describe('LegalPageShell', () => {
    it('is the scroll container, since the body never scrolls', () => {
        const { container } = render(<LegalPageShell current="terms">content</LegalPageShell>);
        expect(container.firstElementChild).toHaveClass('h-full', 'overflow-y-auto');
    });

    it('links every legal page and marks the current one', () => {
        render(<LegalPageShell current="privacy">content</LegalPageShell>);
        expect(screen.getByRole('link', { name: 'privacy' })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('link', { name: 'terms' })).not.toHaveAttribute('aria-current');
        expect(screen.getByRole('link', { name: 'contact' })).toHaveAttribute('href', '/contact');
        expect(screen.getByRole('link', { name: 'withdrawal' })).toHaveAttribute('href', '/legal/withdrawal-terms');
    });

    it('keeps the links of a Greek page in Greek', () => {
        intl.locale = 'el';
        render(<LegalPageShell current="privacy">content</LegalPageShell>);
        expect(screen.getByRole('link', { name: 'home' })).toHaveAttribute('href', '/el');
        expect(screen.getByRole('link', { name: 'terms' })).toHaveAttribute('href', '/el/legal/terms');
        expect(screen.getByRole('link', { name: 'contact' })).toHaveAttribute('href', '/el/contact');
    });
});
