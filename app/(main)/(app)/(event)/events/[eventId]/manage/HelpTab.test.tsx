import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { capabilitiesOf } from '@/lib/__fixtures__/eventCapabilities';
import type { EventLocationDto, EventModuleResponseDto, EventScheduleDto } from '@/lib/api/types';

import HelpTab from './HelpTab';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useModuleCopy', () => ({ useModuleCopy: () => (moduleKey: string) => ({ name: moduleKey }) }));
vi.mock('@/hooks/useHelpProgress', () => ({
    useHelpProgress: () => ({ details: false, rsvp: false, giftAccount: false, schedule: false, invitations: false }),
}));
vi.mock('@/components/manage/help/HelpStepper', () => ({ HelpStepper: ({ children }: { children: React.ReactNode }) => <ol>{children}</ol> }));
vi.mock('@/components/manage/help/HelpStep', () => ({ HelpStep: ({ title }: { title: string }) => <li>{title}</li> }));
const active = vi.hoisted(() => ({ event: null as Record<string, unknown> | null }));
vi.mock('@/providers/EventProvider', () => ({ useActiveEvent: () => active.event }));

afterEach(cleanup);

function modules(keys: string[]): EventModuleResponseDto[] {
    return keys.map((moduleKey) => ({ moduleKey, isEnabled: true, isAvailable: true, configuration: {} }) as unknown as EventModuleResponseDto);
}

function renderHelp(moduleKeys: string[]) {
    const eventModules = modules(moduleKeys);
    active.event = { id: 'e1', status: 'ACTIVE', deletedAt: null, modules: eventModules, capabilities: capabilitiesOf(eventModules) };
    render(
        <HelpTab
            eventId="e1"
            eventTitle="Wedding"
            eventType="WEDDING"
            schedule={{} as EventScheduleDto}
            location={{} as EventLocationDto}
            sessions={[]}
            eventModules={eventModules}
        />,
    );
}

describe('HelpTab', () => {
    it('shows the invitations step on a full event', () => {
        renderHelp(['posts', 'gallery']);
        expect(screen.getByText('steps.invitations.title')).toBeTruthy();
    });

    // A lite event takes no guests: they use its guest code.
    it('leaves the invitations and schedule steps out on a lite event', () => {
        renderHelp(['gallery', 'wishbook']);
        expect(screen.queryByText('steps.invitations.title')).toBeNull();
        expect(screen.queryByText('schedule')).toBeNull();
        expect(screen.getByText('steps.details.title')).toBeTruthy();
    });
});
