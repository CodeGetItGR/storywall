import { act, renderHook } from '@testing-library/react';
import type { ChangeEvent, SubmitEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useOutreachAddForm } from '@/hooks/useOutreachAddForm';

const mocks = vi.hoisted(() => ({ locale: 'en', createProspect: vi.fn(), createRequest: vi.fn() }));

vi.mock('next-intl', () => ({ useLocale: () => mocks.locale }));
vi.mock('@/hooks/useAdminOutreach', () => ({
    useCreateOutreachProspect: () => ({ mutate: mocks.createProspect, isPending: false, error: null }),
}));
vi.mock('@/hooks/useAdminOutreachRequests', () => ({
    useCreateOutreachRequest: () => ({ mutate: mocks.createRequest, isPending: false, error: null }),
}));

const submitEvent = { preventDefault: () => {} } as SubmitEvent<HTMLFormElement>;
const typed = (name: string, value: string) => ({ currentTarget: { name, value } }) as ChangeEvent<HTMLInputElement>;

function fillAndSubmit(suggest: boolean) {
    const { result } = renderHook(() => useOutreachAddForm(vi.fn(), vi.fn(), suggest));
    act(() => {
        result.current.handleChange(typed('name', 'Villa'));
        result.current.handleChange(typed('kind', 'VENUE'));
        result.current.handleChange(typed('city', 'Athens'));
        result.current.handleChange(typed('credibility', 'Well known'));
        result.current.handleChange(typed('fit', 'Weddings every weekend'));
    });
    if (suggest) act(() => result.current.handleNoteChange({ currentTarget: { value: 'Good fit' } } as ChangeEvent<HTMLTextAreaElement>));
    act(() => result.current.handleSubmit(submitEvent));
}

describe('useOutreachAddForm', () => {
    beforeEach(() => {
        mocks.locale = 'en';
        mocks.createProspect.mockReset();
        mocks.createRequest.mockReset();
    });

    it('sends the why text as English from an English UI', () => {
        fillAndSubmit(false);

        const [proposal] = mocks.createProspect.mock.calls[0];
        expect(proposal).toMatchObject({ credibility: 'Well known', fit: 'Weddings every weekend' });
        expect(proposal).not.toHaveProperty('credibilityEl');
        expect(proposal).not.toHaveProperty('fitEl');
    });

    it('sends the why text as Greek from a Greek UI, in a suggestion too', () => {
        mocks.locale = 'el';
        fillAndSubmit(true);

        const [request] = mocks.createRequest.mock.calls[0];
        expect(request.proposal).toMatchObject({ credibilityEl: 'Well known', fitEl: 'Weddings every weekend' });
        expect(request.proposal).not.toHaveProperty('credibility');
        expect(request.proposal).not.toHaveProperty('fit');
        expect(request.note).toBe('Good fit');
    });
});
