import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InvitationTab } from '@/components/manage/invitation/InvitationTab';
import type { EventOnlineInvitation } from '@/hooks/useEventOnlineInvitation';
import messages from '@/messages/en.json';

const invitation = (state: Partial<EventOnlineInvitation> = {}): EventOnlineInvitation => ({
    isLoading: false,
    isError: false,
    status: 'none',
    liveUntil: null,
    publicUrl: null,
    planMissing: false,
    locked: false,
    addOnHref: null,
    canExtend: false,
    editHref: null,
    planHref: '/events/evt-1/manage?tab=plan',
    catalogueHref: '/invitations?type=WEDDING',
    chooseTheme: vi.fn(),
    ...state,
});

function renderTab(state: Partial<EventOnlineInvitation>) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <InvitationTab invitation={invitation(state)} />
        </NextIntlClientProvider>,
    );
}

afterEach(cleanup);

describe('InvitationTab', () => {
    it('offers the upgrade instead of a theme when the plan lacks the invitation', () => {
        renderTab({ planMissing: true, locked: true });
        expect(screen.getByRole('img', { name: messages.ManagePage.invitation.artAlt })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: messages.InvitationEditor.planMissingTitle })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: messages.ManagePage.invitation.upgradePlan })).toHaveAttribute(
            'href',
            '/events/evt-1/manage?tab=plan',
        );
        expect(screen.queryByRole('link', { name: messages.ManagePage.invitation.chooseTheme })).not.toBeInTheDocument();
    });

    it('hides an unpublished draft behind the upgrade', () => {
        renderTab({ status: 'draft', editHref: '/save-my-date/editor/draft-1', planMissing: true, locked: true });
        expect(screen.getByRole('link', { name: messages.ManagePage.invitation.upgradePlan })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: messages.ManagePage.invitation.edit })).not.toBeInTheDocument();
    });

    it('lets a host whose plan includes it choose a theme', () => {
        renderTab({});
        expect(screen.getByRole('link', { name: messages.ManagePage.invitation.chooseTheme })).toHaveAttribute('href', '/invitations?type=WEDDING');
        expect(screen.queryByRole('link', { name: messages.ManagePage.invitation.upgradePlan })).not.toBeInTheDocument();
    });
});
