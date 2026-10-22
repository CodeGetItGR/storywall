import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SiteNoticeDrawer } from '@/components/admin/siteNotices/SiteNoticeDrawer';
import type { AdminSiteNoticeDto } from '@/lib/api/types';

const hooks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), remove: vi.fn() }));

// Keys come back as-is, with any values after a colon.
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${Object.values(values).join(',')}` : key),
    useLocale: () => 'en',
}));
vi.mock('@/components/admin/AdminDrawer', () => ({
    AdminDrawer: ({ open, title, children, footer }: { open: boolean; title: ReactNode; children: ReactNode; footer: ReactNode }) =>
        open ? (
            <div data-testid="admin-drawer">
                <h2>{title}</h2>
                {children}
                {footer}
            </div>
        ) : null,
}));
vi.mock('@/components/ui/ConfirmActionModal', () => ({
    ConfirmActionModal: ({
        open,
        title,
        body,
        confirmLabel,
        onConfirmAction,
        onCloseAction,
    }: {
        open: boolean;
        title: string;
        body: ReactNode;
        confirmLabel: string;
        onConfirmAction: () => void;
        onCloseAction: () => void;
    }) =>
        open ? (
            <div role="dialog" aria-label={title}>
                <p>{body}</p>
                <button type="button" onClick={onConfirmAction}>
                    {confirmLabel}
                </button>
                <button type="button" onClick={onCloseAction}>
                    dialog-cancel
                </button>
            </div>
        ) : null,
}));
vi.mock('@/hooks/useAdminSiteNotices', () => ({
    useCreateSiteNotice: () => ({ mutateAsync: hooks.create, isPending: false }),
    useUpdateSiteNotice: () => ({ mutateAsync: hooks.update, isPending: false }),
    useDeleteSiteNotice: () => ({ mutateAsync: hooks.remove, isPending: false }),
}));

const notice: AdminSiteNoticeDto = {
    id: 'n1',
    version: 1,
    tone: 'WARNING',
    message: { en: 'Slow uploads', el: 'Αργές μεταφορτώσεις' },
    linkUrl: null,
    linkLabel: {},
    areas: ['EVERYWHERE'],
    dismissible: true,
    startsAt: null,
    endsAt: null,
    active: true,
    status: 'LIVE',
    createdAt: '2026-10-22T08:00:00Z',
    updatedAt: '2026-10-22T08:00:00Z',
};

function renderDrawer(current: AdminSiteNoticeDto | null, onCloseAction = vi.fn()) {
    render(<SiteNoticeDrawer open notice={current} onCloseAction={onCloseAction} />);
    return onCloseAction;
}

function fillMessages(en: string, el: string) {
    fireEvent.change(screen.getByLabelText('siteNotices.fields.messageEn'), { target: { value: en } });
    fireEvent.change(screen.getByLabelText('siteNotices.fields.messageEl'), { target: { value: el } });
}

beforeEach(() => {
    for (const fn of Object.values(hooks)) fn.mockReset().mockResolvedValue(undefined);
});
afterEach(cleanup);

describe('SiteNoticeDrawer', () => {
    it('creates a notice shown everywhere from both messages', async () => {
        const onClose = renderDrawer(null);
        fillMessages(' Outage ', 'Διακοπή');
        fireEvent.click(screen.getByRole('button', { name: 'save' }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(hooks.create).toHaveBeenCalledWith({
            tone: 'INFO',
            message: { en: 'Outage', el: 'Διακοπή' },
            linkUrl: null,
            linkLabel: null,
            areas: ['EVERYWHERE'],
            dismissible: true,
            startsAt: null,
            endsAt: null,
            active: true,
        });
    });

    it('does not save without the Greek message', () => {
        const onClose = renderDrawer(null);
        fillMessages('Outage', '');
        fireEvent.click(screen.getByRole('button', { name: 'save' }));

        expect(screen.getByText('siteNotices.problems.message')).toBeInTheDocument();
        expect(hooks.create).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });

    it('sends only the picked areas', async () => {
        const onClose = renderDrawer(null);
        fillMessages('Outage', 'Διακοπή');
        fireEvent.click(screen.getByRole('button', { name: 'where.choose' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'area.PUBLIC' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'area.HOST' }));
        fireEvent.click(screen.getByRole('button', { name: 'save' }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(hooks.create).toHaveBeenCalledWith(expect.objectContaining({ areas: ['PUBLIC', 'HOST'] }));
    });

    it('deletes an existing notice after confirmation', async () => {
        const onClose = renderDrawer(notice);
        fireEvent.click(screen.getByRole('button', { name: 'siteNotices.delete' }));
        expect(hooks.remove).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'siteNotices.deleteConfirm' }));

        await waitFor(() => expect(hooks.remove).toHaveBeenCalledWith('n1'));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
    });
});
