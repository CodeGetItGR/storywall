import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MemberRoleDrawer } from '@/components/admin/memberRoles/MemberRoleDrawer';
import type { MemberRoleCatalogDto } from '@/lib/api/types';

const drawerState = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
    useLocale: () => 'en',
}));
vi.mock('@/components/admin/AdminDrawer', () => ({
    AdminDrawer: ({ title, children, footer }: { title: ReactNode; children: ReactNode; footer: ReactNode }) => (
        <div>
            <h2>{title}</h2>
            {children}
            {footer}
        </div>
    ),
}));
vi.mock('@/components/ui/ConfirmActionModal', () => ({
    ConfirmActionModal: ({ open, title, confirmLabel, onConfirmAction }: { open: boolean; title: string; confirmLabel: string; onConfirmAction: () => void }) =>
        open ? (
            <div role="dialog" aria-label={title}>
                <button type="button" onClick={onConfirmAction}>
                    {confirmLabel}
                </button>
            </div>
        ) : null,
}));
vi.mock('@/hooks/useMemberRoleDrawer', () => ({ useMemberRoleDrawer: () => drawerState.current }));

afterEach(cleanup);

const ROLE: MemberRoleCatalogDto = {
    id: 'r1',
    eventTypeKey: 'WEDDING',
    roleKey: 'BEST_MAN',
    label: { en: 'Best man', el: 'Κουμπάρος' },
    emoji: null,
    maxHolders: null,
    sortOrder: 0,
    hostOnly: false,
    retired: false,
    sectionLabel: null,
};

function state(overrides: Record<string, unknown> = {}) {
    drawerState.current = {
        draft: {
            labelEn: 'Best man',
            labelEl: 'Κουμπάρος',
            sectionEn: '',
            sectionEl: '',
            emoji: '',
            limited: false,
            maxHolders: '',
            hostOnly: false,
        },
        errors: {},
        failure: null,
        failureMessage: null,
        confirmingRetire: false,
        isSaving: false,
        isRetiring: false,
        handleFieldChange: vi.fn(),
        handleLimitModeChange: vi.fn(),
        handleLimitValueChange: vi.fn(),
        handleHostOnlyChange: vi.fn(),
        handleSubmit: vi.fn(),
        requestRetire: vi.fn(),
        cancelRetire: vi.fn(),
        confirmRetire: vi.fn(),
        restore: vi.fn(),
        ...overrides,
    };
}

function renderDrawer(role: MemberRoleCatalogDto | null = ROLE) {
    render(<MemberRoleDrawer role={role} eventTypeKey="WEDDING" eventTypeName="Wedding" sortOrder={0} onCloseAction={vi.fn()} />);
}

describe('MemberRoleDrawer', () => {
    it('never shows or asks for the role key', () => {
        state();
        renderDrawer();
        expect(screen.queryByText('BEST_MAN')).toBeNull();
        expect(screen.getAllByRole('textbox')).toHaveLength(5);
        cleanup();
        renderDrawer(null);
        expect(screen.getAllByRole('textbox')).toHaveLength(5);
    });

    it('offers the book section titles as optional fields, with a hint', () => {
        state();
        renderDrawer();
        expect(screen.getByRole('textbox', { name: /sectionEn/ })).toBeTruthy();
        expect(screen.getByRole('textbox', { name: /sectionEl/ })).toBeTruthy();
        expect(screen.getByText('sectionHint')).toBeTruthy();
        expect(screen.queryByText('sectionInvalid')).toBeNull();
    });

    it('says both titles are needed when only one is filled in', () => {
        state({ errors: { sectionEl: true } });
        renderDrawer();
        expect(screen.getByText('sectionInvalid')).toBeTruthy();
        expect(screen.getByRole('textbox', { name: /sectionEl/ }).getAttribute('aria-invalid')).toBe('true');
        expect(screen.getByRole('textbox', { name: /sectionEn/ }).getAttribute('aria-invalid')).toBe('false');
    });

    it('asks before retiring', () => {
        const requestRetire = vi.fn();
        state({ requestRetire });
        renderDrawer();
        fireEvent.click(screen.getByRole('button', { name: 'retire' }));
        expect(requestRetire).toHaveBeenCalled();
    });

    it('retires from the confirmation', () => {
        const confirmRetire = vi.fn();
        state({ confirmingRetire: true, confirmRetire });
        renderDrawer();
        fireEvent.click(screen.getByRole('button', { name: 'retireConfirm' }));
        expect(confirmRetire).toHaveBeenCalled();
    });

    it('offers restore for a retired role', () => {
        state();
        renderDrawer({ ...ROLE, retired: true });
        expect(screen.getByRole('button', { name: 'restore' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'retire' })).toBeNull();
    });

    it('shows a failed save as an alert in the footer, next to save', () => {
        state({ failure: { kind: 'other', error: new Error('x') }, failureMessage: 'Something went wrong.' });
        renderDrawer(null);
        const alert = screen.getByRole('alert');
        expect(alert.textContent).toBe('Something went wrong.');
        expect(alert.parentElement?.contains(screen.getByRole('button', { name: 'save' }))).toBe(true);
    });

    it('shows not found and disables save', () => {
        state({ failure: { kind: 'notFound' }, failureMessage: 'notFound' });
        renderDrawer();
        expect(screen.getByText('notFound')).toBeTruthy();
        expect((screen.getByRole('button', { name: 'save' }) as HTMLButtonElement).disabled).toBe(true);
    });
});
