import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GuestChoicesList } from '@/components/manage/invitations/GuestChoicesList';
import type { EventOnlineInvitation } from '@/hooks/useEventOnlineInvitation';
import type { GuestChoiceRow } from '@/lib/invitationsQr';
import messages from '@/messages/en.json';

vi.mock('@/components/ui/AppLink', () => ({
    AppLink: ({ href, className, children }: { href: string; className?: string; children: ReactNode }) => (
        <a href={href} className={className}>
            {children}
        </a>
    ),
}));

const invitation = (state: Partial<EventOnlineInvitation> = {}): EventOnlineInvitation => ({
    isLoading: false,
    isError: false,
    status: 'live',
    liveUntil: '12 Mar 2027',
    publicUrl: 'https://invite.storywall.gr/maria-nikos',
    planMissing: false,
    locked: false,
    addOnHref: null,
    canExtend: true,
    editHref: '/save-my-date/editor/draft-1',
    planHref: '/events/evt-story/manage?tab=plan',
    catalogueHref: '/invitations?type=WEDDING',
    chooseTheme: vi.fn(),
    ...state,
});

function renderList(rows: GuestChoiceRow[], value: EventOnlineInvitation | null) {
    render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <GuestChoicesList rows={rows} invitation={value} />
        </NextIntlClientProvider>,
    );
}

afterEach(cleanup);

describe('GuestChoicesList', () => {
    it('lists every choice, with the live invitation on its row', () => {
        renderList(['join', 'invitation', 'upload', 'wish'], invitation());

        expect(screen.getByRole('heading', { name: messages.ManagePage.invitationsQr.guestsSee })).toBeInTheDocument();
        expect(screen.getByText(messages.QrCodePage.choices.join)).toBeInTheDocument();
        expect(screen.getByText(messages.QrCodePage.choices.eventHint)).toBeInTheDocument();
        expect(screen.getByText(messages.QrCodePage.choices.invitation)).toBeInTheDocument();
        expect(screen.getByText('Live until 12 Mar 2027')).toBeInTheDocument();
        expect(screen.getByText(messages.QrCodePage.guestCode.uploadButton)).toBeInTheDocument();
        expect(screen.getByText(messages.QrCodePage.guestCode.wishButton)).toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(4);
    });

    it('shows only joining when that is all the code offers', () => {
        renderList(['join'], null);

        expect(screen.getByText(messages.QrCodePage.choices.join)).toBeInTheDocument();
        expect(screen.queryByText(messages.QrCodePage.choices.invitation)).toBeNull();
    });

    it('leaves the invitation out without its status', () => {
        renderList(['join', 'invitation'], null);

        expect(screen.queryByText(messages.QrCodePage.choices.invitation)).toBeNull();
        expect(screen.getAllByRole('listitem')).toHaveLength(1);
    });

    it('offers a theme when there is no invitation yet', () => {
        renderList(['join', 'invitation'], invitation({ status: 'none', liveUntil: null, publicUrl: null, editHref: null, canExtend: false }));

        expect(screen.getByText(messages.ManagePage.invitation.empty)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: messages.ManagePage.invitation.chooseTheme })).toHaveAttribute('href', '/invitations?type=WEDDING');
    });

    it('offers the upgrade when the plan lacks the invitation', () => {
        renderList(['join', 'invitation'], invitation({ status: 'none', locked: true, planMissing: true, editHref: null, canExtend: false }));

        expect(screen.getByRole('link', { name: messages.ManagePage.invitation.upgradePlan })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: messages.ManagePage.invitation.chooseTheme })).toBeNull();
    });

    it('says when the invitation could not load', () => {
        renderList(['join', 'invitation'], invitation({ isError: true }));

        expect(screen.getByRole('alert')).toHaveTextContent(messages.InvitationEditor.loadFailed);
    });
});
