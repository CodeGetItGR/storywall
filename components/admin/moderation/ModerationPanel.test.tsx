import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ModerationPanel } from '@/components/admin/moderation/ModerationPanel';

const hooks = vi.hoisted(() => ({ useAdminModerationCases: vi.fn(), useAdminNotices: vi.fn() }));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
    useLocale: () => 'en',
}));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => (error: Error) => error.message }));
vi.mock('@/hooks/useAdminModeration', () => ({
    useAdminModerationCases: (...args: unknown[]) => hooks.useAdminModerationCases(...args),
}));
vi.mock('@/hooks/useAdminNotices', () => ({ useAdminNotices: (...args: unknown[]) => hooks.useAdminNotices(...args) }));

const empty = { data: { content: [], page: { size: 50, number: 0, totalElements: 0, totalPages: 0 } }, error: null, isLoading: false };

beforeEach(() => {
    hooks.useAdminModerationCases.mockReset();
    hooks.useAdminModerationCases.mockReturnValue(empty);
    hooks.useAdminNotices.mockReset();
    hooks.useAdminNotices.mockReturnValue(empty);
});
afterEach(cleanup);

describe('ModerationPanel', () => {
    it('has a fourth Notices tab after the case tabs', () => {
        render(<ModerationPanel />);
        expect(screen.getAllByRole('button').filter((b) => b.hasAttribute('data-status'))).toHaveLength(4);
        expect(screen.getByRole('button', { name: 'tabs.NOTICES' })).toBeTruthy();
    });

    it('shows the notices panel on the Notices tab and stops fetching cases', () => {
        render(<ModerationPanel />);
        expect(hooks.useAdminModerationCases).toHaveBeenLastCalledWith('OPEN', 0, true);
        expect(hooks.useAdminNotices).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'tabs.NOTICES' }));
        expect(hooks.useAdminNotices).toHaveBeenCalledWith('NEW', 0);
        expect(hooks.useAdminModerationCases).toHaveBeenLastCalledWith('OPEN', 0, false);
        expect(screen.getByRole('button', { name: 'tabs.NOTICES' }).getAttribute('aria-pressed')).toBe('true');
    });
});
