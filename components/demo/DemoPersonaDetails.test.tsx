import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DemoPersonaDetails } from '@/components/demo/DemoPersonaDetails';
import type { EventMemberResponseDto } from '@/lib/api/types';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, string>) => (values?.name ? `${key}:${values.name}` : key),
}));
vi.mock('@/components/manage/members/MemberRoleSheet', () => ({ MemberRoleSheet: () => <div>role sheet</div> }));
vi.mock('@/components/demo/DemoPersonaRsvpSheet', () => ({ DemoPersonaRsvpSheet: () => <div>rsvp sheet</div> }));

const details = {
    roleLabel: null as string | null,
    canEditRole: true,
    canEditRsvp: true,
    rsvpStatus: 'rsvpNone',
    openSheet: null as 'role' | 'rsvp' | null,
    openRole: vi.fn(),
    openRsvp: vi.fn(),
    closeSheet: vi.fn(),
};
vi.mock('@/hooks/useDemoPersonaDetails', () => ({ useDemoPersonaDetails: () => details }));

const GUEST = { id: 'm1', displayName: 'Nikos' } as EventMemberResponseDto;

afterEach(() => {
    cleanup();
    Object.assign(details, { roleLabel: null, canEditRole: true, canEditRsvp: true, rsvpStatus: 'rsvpNone', openSheet: null });
});

describe('DemoPersonaDetails', () => {
    it('shows the current role and RSVP, and opens their sheets', () => {
        Object.assign(details, { roleLabel: '🤵 Best man', rsvpStatus: 'rsvpAttending' });
        render(<DemoPersonaDetails eventId="e1" guest={GUEST} />);

        fireEvent.click(screen.getByRole('button', { name: 'roleFor:Nikos' }));
        fireEvent.click(screen.getByRole('button', { name: 'rsvpFor:Nikos' }));

        expect(screen.getByText('🤵 Best man')).toBeInTheDocument();
        expect(screen.getByText('rsvpAttending')).toBeInTheDocument();
        expect(details.openRole).toHaveBeenCalled();
        expect(details.openRsvp).toHaveBeenCalled();
    });

    it('says when there is no role yet', () => {
        render(<DemoPersonaDetails eventId="e1" guest={GUEST} />);
        expect(screen.getByText('noRole')).toBeInTheDocument();
    });

    it('hides what the event does not offer', () => {
        Object.assign(details, { canEditRole: false, canEditRsvp: false });
        render(<DemoPersonaDetails eventId="e1" guest={GUEST} />);
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders the open sheet', () => {
        Object.assign(details, { openSheet: 'rsvp' });
        render(<DemoPersonaDetails eventId="e1" guest={GUEST} />);
        expect(screen.getByText('rsvp sheet')).toBeInTheDocument();
        expect(screen.queryByText('role sheet')).not.toBeInTheDocument();
    });
});
