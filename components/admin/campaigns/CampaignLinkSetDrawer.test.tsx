import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CampaignLinkSetDrawer } from '@/components/admin/campaigns/CampaignLinkSetDrawer';
import { ApiError } from '@/lib/api/client';
import messages from '@/messages/en.json';

const mutateAsync = vi.fn();
let isPending = false;
vi.mock('@/hooks/useAdminCampaigns', () => ({
    useGenerateCampaignLinkSet: () => ({ mutateAsync, isPending }),
}));

function renderDrawer(onClose = vi.fn()) {
    render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <CampaignLinkSetDrawer open language="el" onCloseAction={onClose} />
        </NextIntlClientProvider>,
    );
    return onClose;
}

function fillAndSubmit() {
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Summer' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Link name' }), { target: { value: 'Summer Sale!' } });
    fireEvent.submit(screen.getByRole('textbox', { name: 'Name' }).closest('form') as HTMLFormElement);
}

describe('CampaignLinkSetDrawer', () => {
    beforeEach(() => {
        isPending = false;
        mutateAsync.mockReset();
        mutateAsync.mockResolvedValue({ links: [], created: 8 });
    });

    afterEach(cleanup);

    it('creates the set for its language and closes', async () => {
        const onClose = renderDrawer();

        fillAndSubmit();

        await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
        expect(mutateAsync).toHaveBeenCalledWith({ name: 'Summer', linkName: 'summer-sale', language: 'el' });
    });

    it('disables the create button while the set is being created and ignores another submit', () => {
        isPending = true;
        renderDrawer();

        expect(screen.getByRole('button', { name: 'Create links' })).toBeDisabled();

        fillAndSubmit();
        expect(mutateAsync).not.toHaveBeenCalled();
    });

    it('shows an invalid name through the admin error message and stays open', async () => {
        mutateAsync.mockRejectedValue(new ApiError(400, { status: 400, errorCode: 3122 }));
        const onClose = renderDrawer();

        fillAndSubmit();

        expect(await screen.findByText("Check the campaign's details.")).toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();
    });

    it.each([
        ['a link name that starts with a space', 'Summer', ' summer'],
        ['a name of only spaces', '   ', 'summer'],
        ['a link name of only spaces', 'Summer', '   '],
        ['an empty link name', 'Summer', ''],
    ])('sends nothing for %s', (_label, name, linkName) => {
        renderDrawer();
        fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: name } });
        fireEvent.change(screen.getByRole('textbox', { name: 'Link name' }), { target: { value: linkName } });

        expect(screen.getByRole('button', { name: 'Create links' })).toBeDisabled();
        fireEvent.submit(screen.getByRole('textbox', { name: 'Name' }).closest('form') as HTMLFormElement);
        expect(mutateAsync).not.toHaveBeenCalled();
    });
});
