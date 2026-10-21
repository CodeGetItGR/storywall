import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ScheduleScreen } from '@/components/schedule/ScheduleScreen';

const can = vi.hoisted(() => ({ edit: false, limitEnabled: [] as boolean[] }));
vi.mock('@/hooks/useCanEditSchedule', () => ({ useCanEditSchedule: () => can.edit }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams({ section: 'schedule' }) }));
vi.mock('@/components/routing/EventRouteGate', () => ({
    useEventRouteContext: () => ({
        isHost: false,
        eventId: 'e1',
        activeEvent: {
            id: 'e1',
            status: 'ACTIVE',
            eventType: 'WEDDING',
            modules: [{ moduleKey: 'schedule', isAvailable: true }],
            schedule: { startAt: null },
        },
    }),
}));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'failed' }));
vi.mock('@/hooks/useModuleCopy', () => ({ useActiveModuleCopy: () => ({ name: 'Schedule', description: '' }) }));
vi.mock('@/hooks/useEventSessions', () => ({
    useEventSessions: () => ({ data: [{ id: 's1', title: 'Ceremony' }], isLoading: false }),
    useCreateEventSession: () => ({ isPending: false, mutateAsync: vi.fn() }),
    useUpdateEventSession: () => ({ isPending: false, mutateAsync: vi.fn() }),
    useDeleteEventSession: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));
vi.mock('@/hooks/useScheduleSessionLimit', () => ({
    useScheduleSessionLimit: (_: string, enabled: boolean) => {
        can.limitEnabled.push(enabled);
        return { atSessionLimit: false, sessionLimitMessage: undefined };
    },
}));
vi.mock('@/lib/createEventCatalog', () => ({ getCreateEventCatalogEntry: () => undefined }));
vi.mock('@/lib/datetime', () => ({ toDatetimeLocalValue: () => '' }));
vi.mock('@/components/schedule/ScheduleSkeletons', () => ({ SchedulePageSkeleton: () => null }));
vi.mock('@/components/tools/ModulePageShell', () => ({ ModulePageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/tools/ModuleNotice', () => ({ ModuleNotice: ({ children }: { children: React.ReactNode }) => <p>{children}</p> }));
vi.mock('@/components/ui/ConfirmActionModal', () => ({ ConfirmActionModal: () => null }));
vi.mock('@/components/schedule/ScheduleEditSessionsTable', () => ({ ScheduleEditSessionsTable: () => <p>edit table</p> }));
vi.mock('@/app/(main)/(app)/(event)/events/[eventId]/tools/schedule/components/ScheduleSessionsList', () => ({
    ScheduleSessionsList: () => <p>public list</p>,
}));
vi.mock('@/app/(main)/(app)/(event)/events/[eventId]/tools/schedule/components/ScheduleEditorSheet', () => ({ ScheduleEditorSheet: () => null }));
vi.mock('@/app/(main)/(app)/(event)/events/[eventId]/tools/schedule/components/ScheduleEmptyState', () => ({ ScheduleEmptyState: () => null }));

afterEach(() => {
    cleanup();
    can.limitEnabled = [];
});

describe('ScheduleScreen for a planner', () => {
    it('shows the view toggle and the edit table, and leaves the host-only limit lookup off', () => {
        can.edit = true;
        render(<ScheduleScreen />);
        expect(screen.getByRole('button', { name: 'views.edit' })).toBeTruthy();
        expect(screen.getByText('edit table')).toBeTruthy();
        expect(can.limitEnabled.every((enabled) => enabled === false)).toBe(true);
    });

    it('keeps guests on the public list without a toggle, even with a section in the link', () => {
        can.edit = false;
        render(<ScheduleScreen />);
        expect(screen.queryByRole('button', { name: 'views.edit' })).toBeNull();
        expect(screen.queryByText('edit table')).toBeNull();
        expect(screen.getByText('public list')).toBeTruthy();
    });
});
