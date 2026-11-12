import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { QrLandingChoices } from '@/components/qrLanding/QrLandingChoices';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

// KAN-208: only the event row carries the line under its label.
describe('QrLandingChoices', () => {
    afterEach(cleanup);

    it('shows the line under Join, not under Upload', () => {
        render(
            <QrLandingChoices
                eventId="e1"
                onChoose={vi.fn()}
                plan={{ choices: ['join', 'upload'], joinInviteToken: 'inv', uploadToken: 'up', wishToken: null }}
            />,
        );

        expect(screen.getAllByText('choices.eventHint')).toHaveLength(1);
        expect(screen.getByText('choices.join').parentElement).toHaveTextContent('choices.eventHint');
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

    it('shows no line on a lite guest code', () => {
        render(
            <QrLandingChoices
                eventId={null}
                onChoose={vi.fn()}
                plan={{ choices: ['upload', 'wish'], joinInviteToken: null, uploadToken: 'self', wishToken: 'self' }}
            />,
        );

        expect(screen.queryByText('choices.eventHint')).toBeNull();
    });
});
