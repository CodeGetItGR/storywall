import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ContentNoticeForm } from '@/components/contentNotice/ContentNoticeForm';
import type { ContentNoticeDraft, ContentNoticeFieldErrors } from '@/hooks/useContentNoticeSubmit';

const emptyDraft: ContentNoticeDraft = {
    category: null,
    locationText: '',
    link: '',
    explanation: '',
    notifierName: '',
    notifierEmail: '',
    goodFaith: false,
    website: '',
};

const state = vi.hoisted(() => ({
    draft: null as unknown as ContentNoticeDraft,
    reference: null as string | null,
    canSubmit: false,
    error: null as string | null,
    fieldErrors: {} as ContentNoticeFieldErrors,
}));

vi.mock('@/hooks/useContentNoticeSubmit', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/hooks/useContentNoticeSubmit')>()),
    useContentNoticeSubmit: () => ({
        ...state,
        setField: vi.fn(),
        submit: vi.fn(),
        isSubmitting: false,
    }),
}));
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
}));

describe('ContentNoticeForm', () => {
    afterEach(cleanup);

    beforeEach(() => {
        state.draft = emptyDraft;
        state.reference = null;
        state.canSubmit = false;
        state.error = null;
        state.fieldErrors = {};
    });

    it('offers the six categories as radios', () => {
        render(<ContentNoticeForm />);
        expect(screen.getAllByRole('radio')).toHaveLength(6);
    });

    it('requires name and email, except for child sexual abuse where it says so', () => {
        const { unmount } = render(<ContentNoticeForm />);
        expect(screen.getByLabelText(/fields.name/)).toBeRequired();
        expect(screen.queryByText('identityOptional')).not.toBeInTheDocument();
        unmount();

        state.draft = { ...emptyDraft, category: 'CHILD_SEXUAL_ABUSE' };
        render(<ContentNoticeForm />);
        expect(screen.getByLabelText(/fields.name/)).not.toBeRequired();
        expect(screen.getByLabelText(/fields.email/)).not.toBeRequired();
        expect(screen.getByText('identityOptional')).toBeInTheDocument();
    });

    it('hides the honeypot from people and assistive tech', () => {
        const { container } = render(<ContentNoticeForm />);
        const trap = container.querySelector('input[name="website"]')!;
        expect(trap).toHaveAttribute('tabindex', '-1');
        expect(trap).toHaveAttribute('autocomplete', 'off');
        expect(trap.closest('[aria-hidden="true"]')).not.toBeNull();
        expect(trap.closest('.hidden')).toBeNull();
    });

    it('shows the reference after sending', () => {
        state.reference = 'AB12CD34';
        render(<ContentNoticeForm />);
        expect(screen.getByRole('status')).toHaveTextContent('sent {"reference":"AB12CD34"}');
    });

    it('keeps the submit button disabled until the draft is valid', () => {
        render(<ContentNoticeForm />);
        expect(screen.getByRole('button', { name: 'submit' })).toBeDisabled();
    });

    it('shows field errors on the fields and a form-level alert', () => {
        state.error = 'fieldErrors';
        state.fieldErrors = { notifierEmail: 'must be a valid email' };
        render(<ContentNoticeForm />);
        expect(screen.getByLabelText(/fields.email/)).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByText('must be a valid email')).toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveTextContent('errors.fieldErrors');
    });
});
