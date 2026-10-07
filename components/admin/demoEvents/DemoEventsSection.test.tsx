import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DemoEventsSection } from '@/components/admin/demoEvents/DemoEventsSection';
import type { PlatformEventTypeResponseDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const eventType = {
    id: 't-1',
    eventTypeKey: 'WEDDING',
    name: { en: 'Wedding', el: 'Γάμος' },
    sortOrder: 0,
} as unknown as PlatformEventTypeResponseDto;

// BackButton steps back through the router when the previous page is in the app.
vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn() }) }));

vi.mock('@/hooks/useAdmin', () => ({
    useAdminPlatformEventTypes: () => ({ data: [eventType], isLoading: false, error: null }),
}));

vi.mock('@/hooks/useAdminDemoEvents', () => ({
    useAdminDemoEvents: () => ({ data: [], isLoading: false, error: null }),
}));

vi.mock('@/hooks/useDemoEventDetail', () => ({
    useDemoEventDetail: () => ({
        host: null,
        provisionOptions: {},
        createDrawer: { open: false, toggle: vi.fn() },
        removeConfirm: { open: false, toggle: vi.fn() },
        handleSubmit: vi.fn(),
        confirmRemove: vi.fn(),
        error: null,
        isSaving: false,
        isRemoving: false,
    }),
}));

afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
});

function renderSection() {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <DemoEventsSection />
        </NextIntlClientProvider>,
    );
}

describe('DemoEventsSection', () => {
    it('returns to the list when Back is clicked on an event type page', () => {
        window.history.replaceState(null, '', '/admin#demo-events/WEDDING');
        renderSection();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('link', { name: messages.AdminPage.demoEvents.title }));

        expect(window.location.hash).toBe('#demo-events');
        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 1, name: messages.AdminPage.demoEvents.title })).toBeInTheDocument();
    });
});
