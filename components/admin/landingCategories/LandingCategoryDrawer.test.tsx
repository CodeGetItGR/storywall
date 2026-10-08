import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LandingCategoryDrawer } from '@/components/admin/landingCategories/LandingCategoryDrawer';
import { ApiError } from '@/lib/api/client';
import type { AdminLandingCategoryDto, PlatformEventTypeResponseDto } from '@/lib/api/types';

const hooks = vi.hoisted(() => ({ create: vi.fn(), patch: vi.fn(), setTypes: vi.fn(), remove: vi.fn() }));

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
vi.mock('@/hooks/useAdminLandingCategories', () => ({
    useCreateLandingCategory: () => ({ mutateAsync: hooks.create, isPending: false }),
    usePatchLandingCategory: () => ({ mutateAsync: hooks.patch, isPending: false }),
    useSetLandingCategoryEventTypes: () => ({ mutateAsync: hooks.setTypes, isPending: false }),
    useDeleteLandingCategory: () => ({ mutateAsync: hooks.remove, isPending: false }),
}));

const eventTypes = [
    { eventTypeKey: 'SOCIAL_EVENT', name: { en: 'Social' }, sortOrder: 0 },
    { eventTypeKey: 'REUNION', name: { en: 'Reunion' }, sortOrder: 1 },
    { eventTypeKey: 'BIRTHDAY', name: { en: 'Birthday' }, sortOrder: 2 },
] as unknown as PlatformEventTypeResponseDto[];
const other: AdminLandingCategoryDto = {
    id: 'other',
    name: { en: 'Other', el: 'Άλλο' },
    description: {},
    sortOrder: 0,
    isVisible: true,
    isDefault: false,
    eventTypeKeys: ['REUNION'],
};
const mine: AdminLandingCategoryDto = {
    id: 'mine',
    name: { en: 'VIP', el: 'VIP' },
    description: { en: 'For the few' },
    sortOrder: 1,
    isVisible: true,
    isDefault: false,
    eventTypeKeys: ['SOCIAL_EVENT'],
};

function conflict(eventTypeKey = 'REUNION', categoryId = 'other', categoryName = 'Other') {
    return new ApiError(409, { status: 409, errorCode: 5150, details: { eventTypeKey, categoryId, categoryName } });
}

function setTypesCalls(): Array<{ eventTypeKeys: string[]; moveFromOtherCategory: boolean }> {
    return hooks.setTypes.mock.calls.map(([call]) => call.input);
}

function renderDrawer(category: AdminLandingCategoryDto | null, categories: AdminLandingCategoryDto[], onCloseAction = vi.fn()) {
    render(<LandingCategoryDrawer open category={category} categories={categories} eventTypes={eventTypes} onCloseAction={onCloseAction} />);
    return onCloseAction;
}

beforeEach(() => {
    for (const fn of Object.values(hooks)) fn.mockReset().mockResolvedValue({ id: 'new' });
});
afterEach(cleanup);

describe('LandingCategoryDrawer', () => {
    it('creates with both names at the end of the list, then sets the picked types', async () => {
        const onClose = renderDrawer(null, [other]);
        fireEvent.change(screen.getByLabelText('landingCategories.nameEn'), { target: { value: ' Parties ' } });
        fireEvent.change(screen.getByLabelText('landingCategories.nameEl'), { target: { value: 'Πάρτι' } });
        fireEvent.click(screen.getByRole('button', { name: 'Social' }));
        fireEvent.click(screen.getByRole('button', { name: 'save' }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(hooks.create).toHaveBeenCalledWith({
            name: { en: 'Parties', el: 'Πάρτι' },
            description: {},
            sortOrder: 1,
            isVisible: true,
            isDefault: false,
        });
        expect(hooks.setTypes).toHaveBeenCalledWith({ id: 'new', input: { eventTypeKeys: ['SOCIAL_EVENT'], moveFromOtherCategory: false } });
    });

    it('does not save without both names', () => {
        renderDrawer(null, []);
        fireEvent.change(screen.getByLabelText('landingCategories.nameEn'), { target: { value: 'Parties' } });
        fireEvent.change(screen.getByLabelText('landingCategories.nameEl'), { target: { value: '   ' } });
        expect(screen.getByRole('button', { name: 'save' })).toBeDisabled();
    });

    it('sends only the changed fields, and no PUT when the type set is the same', async () => {
        const onClose = renderDrawer({ ...mine, eventTypeKeys: ['SOCIAL_EVENT', 'REUNION'] }, [mine]);
        fireEvent.change(screen.getByLabelText('landingCategories.nameEn'), { target: { value: 'VIP club' } });
        // Remove and re-add: same set, different order.
        fireEvent.click(screen.getByRole('button', { name: 'Social' }));
        fireEvent.click(screen.getByRole('button', { name: 'Social' }));
        fireEvent.click(screen.getByRole('button', { name: 'save' }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(hooks.patch).toHaveBeenCalledWith({ id: 'mine', input: { name: { en: 'VIP club', el: 'VIP' } } });
        expect(hooks.setTypes).not.toHaveBeenCalled();
    });

    it('clears the default when hidden, and the default switch is off while hidden', async () => {
        const onClose = renderDrawer({ ...mine, isDefault: true }, [mine]);
        fireEvent.click(screen.getByRole('switch', { name: 'landingCategories.visible' }));
        expect(screen.getByRole('switch', { name: 'landingCategories.default' })).toBeDisabled();
        expect(screen.getByRole('switch', { name: 'landingCategories.default' })).toHaveAttribute('aria-checked', 'false');
        fireEvent.click(screen.getByRole('button', { name: 'save' }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(hooks.patch).toHaveBeenCalledWith({ id: 'mine', input: { isVisible: false, isDefault: false } });
    });

    it('asks before taking a type from another category, then moves it', async () => {
        const onClose = renderDrawer(mine, [other, mine]);
        expect(screen.getByText('landingCategories.inOtherCategory:Other')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Reunion/ }));
        expect(screen.getByRole('dialog', { name: 'landingCategories.moveTitle:Reunion' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'landingCategories.move' }));
        fireEvent.click(screen.getByRole('button', { name: 'save' }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(hooks.patch).not.toHaveBeenCalled();
        expect(hooks.setTypes).toHaveBeenCalledWith({
            id: 'mine',
            input: { eventTypeKeys: ['SOCIAL_EVENT', 'REUNION'], moveFromOtherCategory: true },
        });
    });

    it('on a 5150 from a stale list, shows the conflict and retries with the move once confirmed', async () => {
        hooks.setTypes.mockRejectedValueOnce(conflict());
        const onClose = renderDrawer(mine, [mine]);
        // The list says nobody holds REUNION, so no confirmation up front.
        fireEvent.click(screen.getByRole('button', { name: 'Reunion' }));
        fireEvent.click(screen.getByRole('button', { name: 'save' }));

        const dialog = await screen.findByRole('dialog', { name: 'landingCategories.moveTitle:Reunion' });
        expect(dialog).toHaveTextContent('landingCategories.moveBody:Reunion,Other');
        expect(onClose).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'landingCategories.move' }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(hooks.setTypes).toHaveBeenLastCalledWith({
            id: 'mine',
            input: { eventTypeKeys: ['SOCIAL_EVENT', 'REUNION'], moveFromOtherCategory: true },
        });
        expect(hooks.setTypes).toHaveBeenCalledTimes(2);
    });

    it('forgets a confirmed move when the type is taken out again', async () => {
        const onClose = renderDrawer(mine, [other, mine]);
        fireEvent.click(screen.getByRole('button', { name: /Reunion/ }));
        fireEvent.click(screen.getByRole('button', { name: 'landingCategories.move' }));
        // Out again, then back in: asked again.
        fireEvent.click(screen.getByRole('button', { name: /Reunion/ }));
        fireEvent.click(screen.getByRole('button', { name: /Reunion/ }));
        expect(screen.getByRole('dialog', { name: 'landingCategories.moveTitle:Reunion' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'dialog-cancel' }));
        fireEvent.click(screen.getByRole('button', { name: 'Birthday' }));
        fireEvent.click(screen.getByRole('button', { name: 'save' }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(setTypesCalls()).toEqual([{ eventTypeKeys: ['SOCIAL_EVENT', 'BIRTHDAY'], moveFromOtherCategory: false }]);
    });

    it('asks again on a 5150 for a type that was never confirmed', async () => {
        hooks.setTypes.mockRejectedValueOnce(conflict()).mockRejectedValueOnce(conflict());
        const onClose = renderDrawer(mine, [mine]);
        fireEvent.click(screen.getByRole('button', { name: 'Reunion' }));
        fireEvent.click(screen.getByRole('button', { name: 'save' }));
        await screen.findByRole('dialog', { name: 'landingCategories.moveTitle:Reunion' });
        fireEvent.click(screen.getByRole('button', { name: 'dialog-cancel' }));

        // Declined: the next save still does not move, and the server's answer asks again.
        fireEvent.click(screen.getByRole('button', { name: 'save' }));
        await screen.findByRole('dialog', { name: 'landingCategories.moveTitle:Reunion' });
        fireEvent.click(screen.getByRole('button', { name: 'landingCategories.move' }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(setTypesCalls().map((input) => input.moveFromOtherCategory)).toEqual([false, false, true]);
    });

    it('on a 5150 naming a confirmed type, asks about the type that was not', async () => {
        hooks.setTypes.mockRejectedValueOnce(conflict('BIRTHDAY', 'third', 'Third')).mockRejectedValueOnce(conflict('REUNION'));
        const onClose = renderDrawer(mine, [other, mine]);
        fireEvent.click(screen.getByRole('button', { name: 'Birthday' }));
        fireEvent.click(screen.getByRole('button', { name: 'save' }));
        // BIRTHDAY: learned from the server, declined.
        await screen.findByRole('dialog', { name: 'landingCategories.moveTitle:Birthday' });
        fireEvent.click(screen.getByRole('button', { name: 'dialog-cancel' }));
        // REUNION: shown as held, confirmed.
        fireEvent.click(screen.getByRole('button', { name: /Reunion/ }));
        fireEvent.click(screen.getByRole('button', { name: 'landingCategories.move' }));
        fireEvent.click(screen.getByRole('button', { name: 'save' }));

        const dialog = await screen.findByRole('dialog', { name: 'landingCategories.moveTitle:Birthday' });
        expect(dialog).toHaveTextContent('landingCategories.moveBody:Birthday,Third');
        fireEvent.click(screen.getByRole('button', { name: 'landingCategories.move' }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(setTypesCalls().map((input) => input.moveFromOtherCategory)).toEqual([false, false, true]);
    });

    it('names the holding category of a 5150 in the admin locale when the list has it', async () => {
        hooks.setTypes.mockRejectedValueOnce(conflict('REUNION', 'other', 'Server name'));
        renderDrawer(mine, [{ ...other, name: { en: 'Others (en)', el: 'Άλλο' }, eventTypeKeys: [] }, mine]);
        fireEvent.click(screen.getByRole('button', { name: 'Reunion' }));
        fireEvent.click(screen.getByRole('button', { name: 'save' }));

        const dialog = await screen.findByRole('dialog', { name: 'landingCategories.moveTitle:Reunion' });
        expect(dialog).toHaveTextContent('landingCategories.moveBody:Reunion,Others (en)');
    });

    it('puts a new category at the end, but not past the server cap', async () => {
        const onClose = renderDrawer(null, [{ ...other, sortOrder: 1000 }]);
        fireEvent.change(screen.getByLabelText('landingCategories.nameEn'), { target: { value: 'Parties' } });
        fireEvent.change(screen.getByLabelText('landingCategories.nameEl'), { target: { value: 'Πάρτι' } });
        fireEvent.click(screen.getByRole('button', { name: 'save' }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(hooks.create).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: 1000 }));
    });

    it('does not create twice when the types fail after the create succeeded', async () => {
        hooks.setTypes.mockRejectedValueOnce(conflict());
        const onClose = renderDrawer(null, []);
        fireEvent.change(screen.getByLabelText('landingCategories.nameEn'), { target: { value: 'Parties' } });
        fireEvent.change(screen.getByLabelText('landingCategories.nameEl'), { target: { value: 'Πάρτι' } });
        fireEvent.click(screen.getByRole('button', { name: 'Reunion' }));
        fireEvent.click(screen.getByRole('button', { name: 'save' }));
        await screen.findByRole('dialog', { name: 'landingCategories.moveTitle:Reunion' });
        fireEvent.click(screen.getByRole('button', { name: 'landingCategories.move' }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(hooks.create).toHaveBeenCalledTimes(1);
        expect(hooks.setTypes).toHaveBeenLastCalledWith({ id: 'new', input: { eventTypeKeys: ['REUNION'], moveFromOtherCategory: true } });
    });

    it('shows any other error and stays open', async () => {
        hooks.patch.mockRejectedValueOnce(new Error('boom'));
        const onClose = renderDrawer(mine, [mine]);
        fireEvent.change(screen.getByLabelText('landingCategories.nameEn'), { target: { value: 'VIP club' } });
        fireEvent.click(screen.getByRole('button', { name: 'save' }));

        expect(await screen.findByText('errors.generic')).toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();
    });

    it('deletes after confirmation', async () => {
        const onClose = renderDrawer(mine, [mine]);
        fireEvent.click(screen.getByRole('button', { name: 'landingCategories.delete' }));
        expect(hooks.remove).not.toHaveBeenCalled();
        const dialog = screen.getByRole('dialog', { name: 'landingCategories.deleteTitle:VIP' });
        fireEvent.click(dialog.querySelector('button')!);

        await waitFor(() => expect(hooks.remove).toHaveBeenCalledWith('mine'));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
    });
});
