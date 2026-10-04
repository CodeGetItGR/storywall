import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BlockedTermsSection } from '@/components/admin/memberRoles/BlockedTermsSection';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, string>) => (values?.term ? `${key}:${values.term}` : key),
    useLocale: () => 'en',
}));
vi.mock('@/components/admin/memberRoles/AddBlockedTermModal', () => ({ AddBlockedTermModal: () => null }));

const section = {
    terms: [] as { id: string; term: string; createdAt: string }[],
    isLoading: false,
    loadError: null as unknown,
    deleting: null,
    deleteError: null as unknown,
    isDeleting: false,
    openAdd: vi.fn(),
    requestDelete: vi.fn(),
    cancelDelete: vi.fn(),
    confirmDelete: vi.fn(),
};
vi.mock('@/hooks/useBlockedTermsSection', () => ({ useBlockedTermsSection: () => section }));

afterEach(() => {
    cleanup();
    section.terms = [];
    vi.clearAllMocks();
});

describe('BlockedTermsSection', () => {
    it('says when there are no words', () => {
        render(<BlockedTermsSection />);
        expect(screen.getByText('empty')).toBeInTheDocument();
    });

    it('lists a word and asks to delete it', () => {
        section.terms = [{ id: 't1', term: 'badword', createdAt: '2026-10-01T10:00:00Z' }];
        render(<BlockedTermsSection />);

        expect(screen.getByText('badword')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'delete:badword' }));
        expect(section.requestDelete).toHaveBeenCalledWith('t1');
    });

    it('opens the add modal', () => {
        render(<BlockedTermsSection />);
        fireEvent.click(screen.getByRole('button', { name: 'add' }));
        expect(section.openAdd).toHaveBeenCalled();
    });
});
