import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
    setField: vi.fn(),
    submit: vi.fn(),
}));

vi.mock('@/hooks/useContentNoticeSubmit', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/hooks/useContentNoticeSubmit')>()),
    useContentNoticeSubmit: () => ({ ...state, isSubmitting: false }),
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
        state.setField.mockReset();
        state.submit.mockReset();
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

    it('reports typing and submitting to the hook', () => {
        const { container } = render(<ContentNoticeForm />);
        fireEvent.change(container.querySelector('#cn-email')!, { target: { value: 'e@example.com' } });
        expect(state.setField).toHaveBeenCalledWith('notifierEmail', 'e@example.com');
        fireEvent.submit(container.querySelector('form')!);
        expect(state.submit).toHaveBeenCalledTimes(1);
    });

    it('focuses the first invalid field in form order after a field-level error', () => {
        state.error = 'fieldErrors';
        state.fieldErrors = { notifierEmail: 'bad email', link: 'bad link' };
        const { container } = render(<ContentNoticeForm />);
        expect(container.querySelector('#cn-link')).toHaveFocus();
    });

    it('links the location hint and the errors to their fields', () => {
        state.error = 'fieldErrors';
        state.fieldErrors = { locationText: 'too short', category: 'pick one' };
        const { container } = render(<ContentNoticeForm />);
        expect(container.querySelector('#cn-location')).toHaveAttribute('aria-describedby', 'cn-location-help cn-location-error');
        expect(container.querySelector('fieldset')).toHaveAttribute('aria-describedby', 'cn-category-error');
        expect(container.querySelector('fieldset')).toHaveAttribute('aria-invalid', 'true');
    });
});
