import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';

const mocks = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn(), setLocale: vi.fn(), reload: vi.fn(), replacePageUrl: vi.fn(), sync: vi.fn() }));

vi.mock('next/navigation', () => ({ usePathname: () => '/q/abc', useRouter: () => ({ refresh: mocks.refresh, push: mocks.push }) }));
vi.mock('next-intl', () => ({ useLocale: () => 'en', useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: false }) }));
vi.mock('@/i18n/actions', () => ({ setLocale: mocks.setLocale }));
vi.mock('@/i18n/publicLocale', () => ({ publicTwinPath: () => null }));
vi.mock('@/lib/overlayHistory', () => ({ syncRouterWithAddressBar: mocks.sync, replacePageUrl: mocks.replacePageUrl }));

describe('LanguageSwitcher', () => {
    beforeEach(() => {
        mocks.refresh.mockReset();
        mocks.setLocale.mockReset().mockResolvedValue(undefined);
        mocks.reload.mockReset();
        mocks.replacePageUrl.mockReset();
        mocks.sync.mockReset();
        vi.stubGlobal('location', { ...window.location, href: 'http://localhost/q/abc', reload: mocks.reload });
    });
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it('swaps the language in place, without reloading the page', async () => {
        render(<LanguageSwitcher variant="auth" />);

        fireEvent.click(screen.getByRole('button', { name: 'languages.el' }));

        await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
        expect(mocks.setLocale).toHaveBeenCalledWith('el');
        expect(mocks.reload).not.toHaveBeenCalled();
    });

    it('reloads the page when asked to', async () => {
        render(<LanguageSwitcher variant="auth" reloadOnChange />);

        fireEvent.click(screen.getByRole('button', { name: 'languages.el' }));

        await waitFor(() => expect(mocks.reload).toHaveBeenCalled());
        expect(mocks.refresh).not.toHaveBeenCalled();
    });

    it('rewrites the lang param of a shared link to the new language', async () => {
        vi.stubGlobal('location', { ...window.location, href: 'http://localhost/q/abc?lang=en', reload: mocks.reload });
        render(<LanguageSwitcher variant="auth" />);

        fireEvent.click(screen.getByRole('button', { name: 'languages.el' }));

        await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
        expect(mocks.replacePageUrl).toHaveBeenCalledWith('http://localhost/q/abc?lang=el');
        expect(mocks.sync).not.toHaveBeenCalled();
    });

    it('leaves the URL alone when it names no language', async () => {
        render(<LanguageSwitcher variant="auth" />);

        fireEvent.click(screen.getByRole('button', { name: 'languages.el' }));

        await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
        expect(mocks.replacePageUrl).not.toHaveBeenCalled();
        expect(mocks.sync).toHaveBeenCalled();
    });
});
