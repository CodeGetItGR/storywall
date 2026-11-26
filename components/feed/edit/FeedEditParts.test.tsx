import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedBlockSheet } from '@/components/feed/edit/FeedBlockSheet';
import { FeedEditRow } from '@/components/feed/edit/FeedEditRow';
import type { SettingsPart } from '@/lib/settingsPreview';
import en from '@/messages/en.json';

function renderIn(node: ReactNode) {
    return render(
        <NextIntlClientProvider locale="en" messages={en}>
            {node}
        </NextIntlClientProvider>,
    );
}

const noMedia = () => undefined;

const LABELS: Record<SettingsPart, string> = { cover: 'Cover photo', title: 'Title', date: 'Date', location: 'Location', description: 'Description' };

function renderSheet(props: { isDesktop: boolean; onOpenPart?: (part: SettingsPart) => void; onClose?: () => void }) {
    return renderIn(
        <FeedBlockSheet
            title="Cover"
            open
            scope={null}
            groups={[]}
            parts={['cover', 'title']}
            partLabels={LABELS}
            isDesktop={props.isDesktop}
            membersOnly={null}
            onMembersOnly={vi.fn()}
            promptText={null}
            onPromptText={vi.fn()}
            pinned={null}
            pinnedUploading={false}
            media={noMedia}
            onAddPinned={vi.fn()}
            onRemovePinned={vi.fn()}
            onMovePinned={vi.fn()}
            onOpenPart={props.onOpenPart ?? vi.fn()}
            onClose={props.onClose ?? vi.fn()}
        />,
    );
}

afterEach(cleanup);

describe('FeedBlockSheet', () => {
    it('draws the desktop panel in the body, outside the page shell, so it stays fixed while the feed scrolls', () => {
        const { container } = renderSheet({ isDesktop: true });

        const panel = screen.getByRole('dialog', { name: 'Cover' });
        expect(container.contains(panel)).toBe(false);
        expect(document.body.contains(panel)).toBe(true);
    });

    it('opens an event field and closes with Done on desktop', () => {
        const onOpenPart = vi.fn();
        const onClose = vi.fn();
        renderSheet({ isDesktop: true, onOpenPart, onClose });

        fireEvent.click(screen.getByRole('button', { name: 'Title' }));
        expect(onOpenPart).toHaveBeenCalledWith('title');

        fireEvent.click(screen.getByRole('button', { name: en.InvitationEditor.sectionSettings.done }));
        expect(onClose).toHaveBeenCalled();
    });
});

describe('FeedEditRow', () => {
    it('shows the save error under the row only after a failed save', () => {
        const props = { saving: false, previewing: false, onPreview: vi.fn(), onCancel: vi.fn(), onSave: vi.fn() };
        const { rerender } = renderIn(<FeedEditRow {...props} failed={false} />);
        expect(screen.queryByRole('alert')).toBeNull();

        rerender(
            <NextIntlClientProvider locale="en" messages={en}>
                <FeedEditRow {...props} failed />
            </NextIntlClientProvider>,
        );
        expect(screen.getByRole('alert').textContent).toBe(en.FeedEditor.saveFailed);
    });
});
