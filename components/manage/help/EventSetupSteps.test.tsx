import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EventSetupSteps } from '@/components/manage/help/EventSetupSteps';
import type { EventDetailResponseDto, EventModuleResponseDto } from '@/lib/api/types';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useModuleCopy', () => ({ useModuleCopy: () => (moduleKey: string) => ({ name: moduleKey }) }));
vi.mock('@/hooks/useHelpProgress', () => ({
    useHelpProgress: () => ({ details: false, rsvp: false, giftAccount: false, schedule: false, invitations: false }),
}));
vi.mock('@/components/manage/help/HelpStepper', () => ({ HelpStepper: ({ children }: { children: React.ReactNode }) => <ol>{children}</ol> }));
vi.mock('@/components/manage/help/HelpStep', () => ({ HelpStep: ({ title }: { title: string }) => <li>{title}</li> }));

afterEach(cleanup);

function event(moduleKeys: string[]): EventDetailResponseDto {
    const modules = moduleKeys.map(
        (moduleKey) => ({ moduleKey, isEnabled: true, isAvailable: true, configuration: {} }) as unknown as EventModuleResponseDto,
    );
    return {
        id: 'e1',
        title: 'Wedding',
        eventType: 'WEDDING',
        status: 'ACTIVE',
        deletedAt: null,
        schedule: {},
        location: {},
        sessions: [],
        modules,
    } as unknown as EventDetailResponseDto;
}

describe('EventSetupSteps', () => {
    it('shows the heading and the invitations step on a full event', () => {
        render(<EventSetupSteps event={event(['posts', 'gallery'])} />);
        expect(screen.getByRole('heading', { name: 'steps.section.title' })).toBeInTheDocument();
        expect(screen.getByText('steps.invitations.title')).toBeInTheDocument();
    });

    // A lite event takes no guests: they use its guest code.
    it('leaves the invitations step out on a lite event', () => {
        render(<EventSetupSteps event={event(['gallery', 'wishbook'])} />);
        expect(screen.queryByText('steps.invitations.title')).toBeNull();
        expect(screen.getByText('steps.details.title')).toBeInTheDocument();
    });

    it('lists the RSVP step only when the plan has RSVP', () => {
        render(<EventSetupSteps event={event(['posts', 'rsvp'])} />);
        expect(screen.getByText('rsvp')).toBeInTheDocument();
    });
});
