import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThemeSwitchDialog } from '@/components/saveMyDate/editor/theme/ThemeSwitchDialog';
import { ThemeSwitchPanel } from '@/components/saveMyDate/editor/theme/ThemeSwitchPanel';
import { ThemeSwitchSheet } from '@/components/saveMyDate/editor/theme/ThemeSwitchSheet';
import type { DraftTheme } from '@/hooks/useDraftThemes';
import type { ThemeSwitchList, ThemeSwitchStep } from '@/hooks/useThemeSwitch';
import type { InvitationDocument } from '@/lib/invitation/document';
import type { ThemeSwitchPlan } from '@/lib/invitation/themeSwitch';
import en from '@/messages/en.json';

function renderIn(node: ReactNode) {
    return render(
        <NextIntlClientProvider locale="en" messages={en}>
            {node}
        </NextIntlClientProvider>,
    );
}

const THEMES: ThemeSwitchList = {
    kind: 'themes',
    themes: [
        { slug: 'olive', name: 'Olive', eventType: 'WEDDING', cardColor: '#8a9a5b', cardThumbUrl: null },
        { slug: 'linen', name: 'Linen', eventType: 'WEDDING', cardColor: '#efe6d8', cardThumbUrl: null },
    ],
};

function confirming(plan: Partial<ThemeSwitchPlan>): ThemeSwitchStep {
    return {
        kind: 'confirming',
        slug: 'linen',
        themeId: 'linen',
        theme: { slug: 'linen', name: 'Linen' } as DraftTheme,
        plan: { document: {} as InvitationDocument, hidden: [], restored: [], resetsTextLook: false, ...plan },
    };
}

function sheet(step: ThemeSwitchStep, list: ThemeSwitchList = THEMES) {
    const props = { onChoose: vi.fn(), onRetryList: vi.fn(), onClose: vi.fn() };
    renderIn(<ThemeSwitchSheet step={step} list={list} currentSlug="olive" {...props} />);
    return props;
}

describe('ThemeSwitchPanel', () => {
    afterEach(cleanup);

    it('names the design and opens the picker', () => {
        const onChange = vi.fn();
        renderIn(<ThemeSwitchPanel themeName="Olive" onChange={onChange} />);
        expect(screen.getByText('Design: Olive')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Change design' }));
        expect(onChange).toHaveBeenCalledOnce();
    });
});

describe('ThemeSwitchSheet', () => {
    afterEach(cleanup);

    it('stays shut while closed or confirming', () => {
        sheet({ kind: 'closed' });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        cleanup();
        sheet(confirming({}));
        expect(screen.queryByRole('button', { name: /Linen/ })).not.toBeInTheDocument();
    });

    it('marks the current design and picks another', () => {
        const { onChoose } = sheet({ kind: 'picking' });
        const current = screen.getByRole('button', { name: /Olive/ });
        expect(current).toBeDisabled();
        expect(within(current).getByText('Current')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Linen/ }));
        expect(onChoose).toHaveBeenCalledWith('linen');
    });

    it('shows which design is loading and blocks the others', () => {
        sheet({ kind: 'loading', slug: 'linen' });
        expect(screen.getByRole('button', { name: /Linen/ })).toHaveAttribute('aria-busy', 'true');
        expect(screen.getByRole('button', { name: /Linen/ })).toBeDisabled();
    });

    it("says when a design didn't load", () => {
        sheet({ kind: 'failed', slug: 'linen' });
        expect(screen.getByRole('alert')).toHaveTextContent("We couldn't load this design. Try again.");
        expect(screen.getByRole('button', { name: /Linen/ })).toBeEnabled();
    });

    it('tries the list again', () => {
        const { onRetryList } = sheet({ kind: 'picking' }, { kind: 'error' });
        expect(screen.getByText("We couldn't load the designs.")).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
        expect(onRetryList).toHaveBeenCalledOnce();
    });
});

describe('ThemeSwitchDialog', () => {
    afterEach(cleanup);

    function dialog(step: ThemeSwitchStep) {
        const props = { onConfirm: vi.fn(), onCancel: vi.fn() };
        renderIn(<ThemeSwitchDialog step={step} {...props} />);
        return props;
    }

    it('says only what stays when nothing else changes', () => {
        dialog(confirming({}));
        expect(screen.getByText('Switch to Linen?')).toBeInTheDocument();
        expect(screen.getByText('Your texts, photos and dates stay. Only the design changes. You can undo this.')).toBeInTheDocument();
        expect(screen.queryByRole('list')).not.toBeInTheDocument();
        expect(screen.queryByText(en.InvitationEditor.themeSwitch.textLookReset)).not.toBeInTheDocument();
    });

    it('lists hidden and restored sections once per kind, and the text look', () => {
        dialog(
            confirming({
                hidden: [
                    { id: 'a', type: 'photo' },
                    { id: 'b', type: 'photo' },
                ],
                restored: [{ id: 'c', type: 'faq' }],
                resetsTextLook: true,
            }),
        );
        const lists = screen.getAllByRole('list');
        expect(lists).toHaveLength(2);
        expect(within(lists[0]).getAllByRole('listitem')).toHaveLength(1);
        expect(within(lists[1]).getByText('FAQ')).toBeInTheDocument();
        expect(screen.getByText(en.InvitationEditor.themeSwitch.textLookReset)).toBeInTheDocument();
    });

    it('confirms or goes back', () => {
        const { onConfirm, onCancel } = dialog(confirming({}));
        const modal = screen.getByText('Switch to Linen?').closest<HTMLElement>('[role="dialog"]')!;
        fireEvent.click(within(modal).getByRole('button', { name: 'Change design' }));
        expect(onConfirm).toHaveBeenCalledOnce();
        fireEvent.click(within(modal).getByText('Cancel'));
        expect(onCancel).toHaveBeenCalled();
    });

    it('stays shut unless confirming', () => {
        dialog({ kind: 'picking' });
        expect(screen.queryByText(/Switch to/)).not.toBeInTheDocument();
    });
});
