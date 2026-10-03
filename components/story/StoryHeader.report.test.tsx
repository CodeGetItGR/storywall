import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { StoryHeader } from '@/components/story/StoryHeader';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useMemberAvatarUrl', () => ({ useMemberAvatarUrl: () => () => null }));

afterEach(cleanup);

function renderHeader(overrides: Partial<Parameters<typeof StoryHeader>[0]> = {}) {
    const onReportRequest = vi.fn();
    const onDeleteRequest = vi.fn();
    const onToggleMenu = vi.fn();
    render(
        <StoryHeader
            authorName="Alice"
            authorId="m2"
            timeStr="10:00"
            canManage={false}
            canDelete={false}
            canReport={true}
            canReportRole={false}
            showMenu={true}
            onToggleMenu={onToggleMenu}
            onClose={vi.fn()}
            onDeleteRequest={onDeleteRequest}
            onReportRequest={onReportRequest}
            onReportRoleRequest={vi.fn()}
            {...overrides}
        />,
    );
    return { onReportRequest, onDeleteRequest, onToggleMenu };
}

describe('StoryHeader report', () => {
    it('shows a Report button that calls onReportRequest when the viewer can report', () => {
        const { onReportRequest } = renderHeader();

        fireEvent.click(screen.getByRole('button', { name: 'reportStory' }));

        expect(onReportRequest).toHaveBeenCalledTimes(1);
    });

    it('offers the options toggle to a reporter who cannot manage', () => {
        const { onToggleMenu } = renderHeader({ showMenu: false });

        fireEvent.click(screen.getByRole('button', { name: 'moreOptions' }));

        expect(onToggleMenu).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('button', { name: 'reportStory' })).toBeNull();
    });

    it('marks the options toggle expanded while the menu is open', () => {
        renderHeader({ showMenu: true });

        expect(screen.getByRole('button', { name: 'moreOptions' }).getAttribute('aria-expanded')).toBe('true');
    });

    it('shows no Report button and no options toggle when the viewer cannot report or manage', () => {
        renderHeader({ canReport: false });

        expect(screen.queryByRole('button', { name: 'reportStory' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'moreOptions' })).toBeNull();
    });

    it('keeps delete, without Report, for a manager who cannot report (own story)', () => {
        const { onDeleteRequest } = renderHeader({ canManage: true, canDelete: true, canReport: false });

        const deleteButton = screen.getByRole('button', { name: 'deleteStory' });
        expect(screen.queryByRole('button', { name: 'reportStory' })).toBeNull();
        fireEvent.click(deleteButton);
        expect(onDeleteRequest).toHaveBeenCalledTimes(1);
    });

    it('shows both Report and delete to a host viewing another member story', () => {
        renderHeader({ canManage: true, canDelete: true, canReport: true });

        expect(screen.getByRole('button', { name: 'reportStory' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'deleteStory' })).toBeTruthy();
    });
});
