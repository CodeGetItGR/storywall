import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ModerationDecisionForm } from '@/components/admin/moderation/ModerationDecisionForm';

// Values are appended so a test can see what an ICU message was given.
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
}));

afterEach(cleanup);

const allAllowed = { removeContent: true, removeMember: true, banFromEvent: true, suspendAccount: true, suspendEvent: true };
const noneAllowed = { removeContent: false, removeMember: false, banFromEvent: false, suspendAccount: false, suspendEvent: false };

// The mock t returns the key, whatever the namespace: ground radios are named grounds.*, rule options rules.*.
function fillStatement() {
    fireEvent.click(screen.getByRole('radio', { name: 'grounds.GUIDELINES_BREACH' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'statement.rule' }), { target: { value: 'HARASSMENT' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'statement.explanation' }), {
        target: { value: 'Insults aimed at one guest, twice.' },
    });
}

describe('ModerationDecisionForm', () => {
    it('shows only the actions the server allows', () => {
        render(
            <ModerationDecisionForm
                allowed={{ ...noneAllowed, suspendAccount: true }}
                contentPresent
                activeReportCount={2}
                isSubmitting={false}
                error={null}
                onSubmitAction={vi.fn()}
            />,
        );
        fireEvent.click(screen.getByRole('radio', { name: 'form.takeAction' }));
        expect(screen.queryByRole('checkbox', { name: 'form.removeContent' })).toBeNull();
        expect(screen.getByRole('checkbox', { name: 'form.suspendAccount' })).toBeTruthy();
    });

    it('offers ban only once remove member is ticked', () => {
        render(
            <ModerationDecisionForm
                allowed={allAllowed}
                contentPresent
                activeReportCount={2}
                isSubmitting={false}
                error={null}
                onSubmitAction={vi.fn()}
            />,
        );
        fireEvent.click(screen.getByRole('radio', { name: 'form.takeAction' }));
        expect(screen.queryByRole('checkbox', { name: 'form.banFromEvent' })).toBeNull();
        fireEvent.click(screen.getByRole('checkbox', { name: 'form.removeMember' }));
        expect(screen.getByRole('checkbox', { name: 'form.banFromEvent' })).toBeTruthy();
    });

    it('drops the ban when remove member is unticked', () => {
        const onSubmit = vi.fn();
        render(
            <ModerationDecisionForm
                allowed={allAllowed}
                contentPresent
                activeReportCount={2}
                isSubmitting={false}
                error={null}
                onSubmitAction={onSubmit}
            />,
        );
        fireEvent.click(screen.getByRole('radio', { name: 'form.takeAction' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'form.removeMember' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'form.banFromEvent' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'form.removeMember' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'form.suspendAccount' }));
        fillStatement();
        fireEvent.click(screen.getByRole('button', { name: 'form.review' }));
        fireEvent.click(screen.getByRole('button', { name: 'form.confirm' }));
        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ removeMember: false, banFromEvent: false, suspendAccount: true }));
    });

    it('confirms with a summary of exactly what will happen, then submits', () => {
        const onSubmit = vi.fn();
        render(
            <ModerationDecisionForm
                allowed={allAllowed}
                contentPresent
                activeReportCount={2}
                isSubmitting={false}
                error={null}
                onSubmitAction={onSubmit}
            />,
        );
        fireEvent.click(screen.getByRole('radio', { name: 'form.takeAction' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'form.removeContent' }));
        fillStatement();
        fireEvent.click(screen.getByRole('button', { name: 'form.review' }));

        expect(screen.getByText('summary.removeContent')).toBeTruthy();
        expect(screen.queryByText('summary.removeMember')).toBeNull();
        expect(onSubmit).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'form.confirm' }));
        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'ACTION_TAKEN', removeContent: true, removeMember: false }));
    });

    it('goes back from the confirm step without submitting', () => {
        const onSubmit = vi.fn();
        render(
            <ModerationDecisionForm
                allowed={allAllowed}
                contentPresent
                activeReportCount={2}
                isSubmitting={false}
                error={null}
                onSubmitAction={onSubmit}
            />,
        );
        fireEvent.click(screen.getByRole('radio', { name: 'form.dismiss' }));
        fireEvent.click(screen.getByRole('button', { name: 'form.review' }));
        expect(screen.getByText('summary.dismiss')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'form.back' }));
        expect(screen.queryByText('summary.dismiss')).toBeNull();
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('cannot review an action with nothing ticked while the content exists', () => {
        render(
            <ModerationDecisionForm
                allowed={allAllowed}
                contentPresent
                activeReportCount={2}
                isSubmitting={false}
                error={null}
                onSubmitAction={vi.fn()}
            />,
        );
        fireEvent.click(screen.getByRole('radio', { name: 'form.takeAction' }));
        expect((screen.getByRole('button', { name: 'form.review' }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('lets an action with nothing ticked close a case whose content is gone', () => {
        render(
            <ModerationDecisionForm
                allowed={noneAllowed}
                contentPresent={false}
                activeReportCount={2}
                isSubmitting={false}
                error={null}
                onSubmitAction={vi.fn()}
            />,
        );
        fireEvent.click(screen.getByRole('radio', { name: 'form.takeAction' }));
        expect((screen.getByRole('button', { name: 'form.review' }) as HTMLButtonElement).disabled).toBe(false);
    });

    it('never sends an action the server stopped allowing after a refetch', () => {
        const onSubmit = vi.fn();
        const { rerender } = render(
            <ModerationDecisionForm
                allowed={allAllowed}
                contentPresent
                activeReportCount={2}
                isSubmitting={false}
                error={null}
                onSubmitAction={onSubmit}
            />,
        );
        fireEvent.click(screen.getByRole('radio', { name: 'form.takeAction' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'form.removeContent' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'form.suspendAccount' }));
        fillStatement();
        rerender(
            <ModerationDecisionForm
                allowed={{ ...allAllowed, suspendAccount: false }}
                contentPresent
                activeReportCount={2}
                isSubmitting={false}
                error={null}
                onSubmitAction={onSubmit}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'form.review' }));
        expect(screen.queryByText('summary.suspendAccount')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'form.confirm' }));
        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ removeContent: true, suspendAccount: false }));
    });

    it('leaves the confirm step when a refusal arrives with narrowed actions', () => {
        const onSubmit = vi.fn();
        const { rerender } = render(
            <ModerationDecisionForm
                allowed={allAllowed}
                contentPresent
                activeReportCount={2}
                isSubmitting={false}
                error={null}
                onSubmitAction={onSubmit}
            />,
        );
        fireEvent.click(screen.getByRole('radio', { name: 'form.takeAction' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'form.suspendAccount' }));
        fillStatement();
        fireEvent.click(screen.getByRole('button', { name: 'form.review' }));
        expect(screen.getByRole('button', { name: 'form.confirm' })).toBeTruthy();

        rerender(
            <ModerationDecisionForm
                allowed={{ ...allAllowed, suspendAccount: false }}
                contentPresent
                activeReportCount={2}
                isSubmitting={false}
                error="refused"
                onSubmitAction={onSubmit}
            />,
        );
        expect(screen.queryByRole('button', { name: 'form.confirm' })).toBeNull();
        expect((screen.getByRole('button', { name: 'form.review' }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('says how many reports close and what reporters are told', () => {
        render(
            <ModerationDecisionForm
                allowed={allAllowed}
                contentPresent
                activeReportCount={2}
                isSubmitting={false}
                error={null}
                onSubmitAction={vi.fn()}
            />,
        );
        fireEvent.click(screen.getByRole('radio', { name: 'form.dismiss' }));
        fireEvent.click(screen.getByRole('button', { name: 'form.review' }));
        expect(screen.getByText('summary.reports {"count":2,"outcome":"DISMISSED"}')).toBeTruthy();
    });

    it('moves focus into the summary on review and back to Review on back', () => {
        render(
            <ModerationDecisionForm
                allowed={allAllowed}
                contentPresent
                activeReportCount={2}
                isSubmitting={false}
                error={null}
                onSubmitAction={vi.fn()}
            />,
        );
        fireEvent.click(screen.getByRole('radio', { name: 'form.dismiss' }));
        fireEvent.click(screen.getByRole('button', { name: 'form.review' }));
        expect(document.activeElement).toBe(screen.getByRole('group', { name: 'summary.title' }));
        fireEvent.click(screen.getByRole('button', { name: 'form.back' }));
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'form.review' }));
    });

    it('labels the outcome choice as a group', () => {
        render(
            <ModerationDecisionForm
                allowed={allAllowed}
                contentPresent
                activeReportCount={2}
                isSubmitting={false}
                error={null}
                onSubmitAction={vi.fn()}
            />,
        );
        expect(screen.getByRole('radiogroup', { name: 'form.title' })).toBeTruthy();
    });

    it('shows a refusal', () => {
        render(
            <ModerationDecisionForm
                allowed={allAllowed}
                contentPresent
                activeReportCount={2}
                isSubmitting={false}
                error="refused"
                onSubmitAction={vi.fn()}
            />,
        );
        expect(screen.getByRole('alert').textContent).toBe('refused');
    });

    it('asks for a statement once an action is ticked, and only then', () => {
        render(
            <ModerationDecisionForm
                allowed={allAllowed}
                contentPresent
                activeReportCount={2}
                isSubmitting={false}
                error={null}
                onSubmitAction={vi.fn()}
            />,
        );
        fireEvent.click(screen.getByRole('radio', { name: 'form.takeAction' }));
        expect(screen.queryByRole('combobox', { name: 'statement.rule' })).toBeNull();
        fireEvent.click(screen.getByRole('checkbox', { name: 'form.removeContent' }));
        expect(screen.getByRole('combobox', { name: 'statement.rule' })).toBeTruthy();
        expect((screen.getByRole('button', { name: 'form.review' }) as HTMLButtonElement).disabled).toBe(true);
        fillStatement();
        expect((screen.getByRole('button', { name: 'form.review' }) as HTMLButtonElement).disabled).toBe(false);
    });

    it('keeps Review disabled while the explanation is under 20 characters after trimming', () => {
        render(
            <ModerationDecisionForm
                allowed={allAllowed}
                contentPresent
                activeReportCount={2}
                isSubmitting={false}
                error={null}
                onSubmitAction={vi.fn()}
            />,
        );
        fireEvent.click(screen.getByRole('radio', { name: 'form.takeAction' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'form.removeContent' }));
        fillStatement();
        fireEvent.change(screen.getByRole('textbox', { name: 'statement.explanation' }), { target: { value: `   ${'x'.repeat(19)}   ` } });
        expect((screen.getByRole('button', { name: 'form.review' }) as HTMLButtonElement).disabled).toBe(true);
        expect(screen.getByText('statement.explanationCount {"count":19,"min":20,"max":2000}')).toBeTruthy();
    });

    it('suspends the StoryWall with a statement and says the hosts are emailed', () => {
        const onSubmit = vi.fn();
        render(
            <ModerationDecisionForm
                allowed={allAllowed}
                contentPresent
                activeReportCount={1}
                isSubmitting={false}
                error={null}
                onSubmitAction={onSubmit}
            />,
        );
        fireEvent.click(screen.getByRole('radio', { name: 'form.takeAction' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'form.suspendEvent' }));
        fillStatement();
        fireEvent.click(screen.getByRole('button', { name: 'form.review' }));
        expect(screen.getByText('summary.suspendEvent')).toBeTruthy();
        expect(screen.getByText('summary.emailsHosts')).toBeTruthy();
        expect(screen.queryByText('summary.emailsAuthor')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'form.confirm' }));
        expect(onSubmit).toHaveBeenCalledWith(
            expect.objectContaining({
                outcome: 'ACTION_TAKEN',
                suspendEvent: true,
                removeContent: false,
                ground: 'GUIDELINES_BREACH',
                rule: 'HARASSMENT',
                explanation: 'Insults aimed at one guest, twice.',
            }),
        );
    });

    it('does not offer the suspension when the server does not allow it', () => {
        render(
            <ModerationDecisionForm
                allowed={{ ...allAllowed, suspendEvent: false }}
                contentPresent
                activeReportCount={2}
                isSubmitting={false}
                error={null}
                onSubmitAction={vi.fn()}
            />,
        );
        fireEvent.click(screen.getByRole('radio', { name: 'form.takeAction' }));
        expect(screen.queryByRole('checkbox', { name: 'form.suspendEvent' })).toBeNull();
    });

    it('sends a dismissal with no statement', () => {
        const onSubmit = vi.fn();
        render(
            <ModerationDecisionForm
                allowed={allAllowed}
                contentPresent
                activeReportCount={2}
                isSubmitting={false}
                error={null}
                onSubmitAction={onSubmit}
            />,
        );
        fireEvent.click(screen.getByRole('radio', { name: 'form.dismiss' }));
        expect(screen.queryByRole('combobox', { name: 'statement.rule' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'form.review' }));
        fireEvent.click(screen.getByRole('button', { name: 'form.confirm' }));
        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'DISMISSED', ground: null, rule: null, explanation: null }));
    });

    it('reminds the admin to name the legal provision only for the illegal-content ground', () => {
        render(
            <ModerationDecisionForm
                allowed={allAllowed}
                contentPresent
                activeReportCount={2}
                isSubmitting={false}
                error={null}
                onSubmitAction={vi.fn()}
            />,
        );
        fireEvent.click(screen.getByRole('radio', { name: 'form.takeAction' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'form.removeContent' }));
        fillStatement();
        expect(screen.queryByText('statement.illegalHint')).toBeNull();
        fireEvent.click(screen.getByRole('radio', { name: 'grounds.ILLEGAL_CONTENT' }));
        expect(screen.getByText('statement.illegalHint')).toBeTruthy();
    });
});
