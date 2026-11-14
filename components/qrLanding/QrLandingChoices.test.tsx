import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { QrLandingChoices } from '@/components/qrLanding/QrLandingChoices';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

// KAN-208: the event row carries a line under its label; the upload row says where uploads go.
describe('QrLandingChoices', () => {
    afterEach(cleanup);

    it('shows the event line under Join and the gallery line under Upload', () => {
        render(
            <QrLandingChoices
                eventId="e1"
                onChoose={vi.fn()}
                plan={{ choices: ['join', 'upload'], joinInviteToken: 'inv', uploadToken: 'up', wishToken: null }}
            />,
        );

        expect(screen.getAllByText('choices.eventHint')).toHaveLength(1);
        expect(screen.getByText('choices.join').parentElement).toHaveTextContent('choices.eventHint');
        expect(screen.getByText('guestCode.uploadButton').parentElement).toHaveTextContent('choices.uploadHint');
    });

    it('shows the line under Open the event for a member', () => {
        render(
            <QrLandingChoices
                eventId="e1"
                onChoose={vi.fn()}
                plan={{ choices: ['open', 'upload', 'wishbook'], joinInviteToken: 'inv', uploadToken: 'up', wishToken: null }}
            />,
        );

        expect(screen.getAllByText('choices.eventHint')).toHaveLength(1);
        expect(screen.getByText('choices.open').parentElement).toHaveTextContent('choices.eventHint');
    });

    it('shows only the gallery line on a lite guest code', () => {
        render(
            <QrLandingChoices
                eventId={null}
                onChoose={vi.fn()}
                plan={{ choices: ['upload', 'wish'], joinInviteToken: null, uploadToken: 'self', wishToken: 'self' }}
            />,
        );

        expect(screen.queryByText('choices.eventHint')).toBeNull();
        expect(screen.getByText('guestCode.uploadButton').parentElement).toHaveTextContent('choices.uploadHint');
        expect(screen.getByText('guestCode.wishButton').parentElement?.textContent).toBe('guestCode.wishButton');
    });
});
