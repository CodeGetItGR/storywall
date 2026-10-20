import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AnnouncementScreen } from '@/components/announcement/AnnouncementScreen';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/components/tools/ModulePageShell', () => ({ ModulePageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/routing/EventRouteGate', () => ({
    useEventRouteContext: () => ({ eventId: 'e1', activeEvent: { id: 'e1' }, isHost: true }),
}));
const composer = vi.hoisted(() => ({
    value: {
        content: '',
        handleContentChange: vi.fn(),
        maxLength: 500,
        error: 'boom' as string | null,
        blockedMessage: null as string | null,
        isPosting: false,
        handleSubmit: vi.fn((event: { preventDefault: () => void }) => event.preventDefault()),
    },
}));
vi.mock('@/hooks/useAnnouncementComposer', () => ({ useAnnouncementComposer: () => composer.value }));

afterEach(() => {
    cleanup();
    composer.value.blockedMessage = null;
});

describe('AnnouncementScreen', () => {
    it('has one labelled message box, the error and the post button', () => {
        render(<AnnouncementScreen />);
        const box = screen.getByLabelText('label');
        expect(box.getAttribute('maxLength')).toBe('500');
        fireEvent.change(box, { target: { value: 'Hi' } });
        expect(composer.value.handleContentChange).toHaveBeenCalled();
        expect(screen.getByText('boom')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'send' }));
        expect(composer.value.handleSubmit).toHaveBeenCalled();
    });

    it('says why posting is closed and disables the button', () => {
        composer.value.blockedMessage = 'closed';
        render(<AnnouncementScreen />);
        expect(screen.getByText('closed')).toBeTruthy();
        expect((screen.getByRole('button', { name: 'send' }) as HTMLButtonElement).disabled).toBe(true);
    });
});
