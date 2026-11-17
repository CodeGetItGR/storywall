// components/manage/nav/ManageSectionHeader.test.tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ManageSectionHeader } from '@/components/manage/nav/ManageSectionHeader';
import { routes } from '@/lib/routes';
import messages from '@/messages/en.json';

afterEach(cleanup);

function renderHeader(onSelectSection?: (section: string) => void) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <ManageSectionHeader eventId="e1" title="Members" onSelectSection={onSelectSection} />
        </NextIntlClientProvider>,
    );
}

describe('ManageSectionHeader', () => {
    it('shows the page title and a way back to the Overview', () => {
        renderHeader();
        expect(screen.getByRole('heading', { level: 1, name: 'Members' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: messages.ManagePage.sections.overview })).toHaveAttribute('href', routes.events.manage('e1'));
    });

    it('goes back in place inside the dashboard', () => {
        const onSelectSection = vi.fn();
        renderHeader(onSelectSection);
        fireEvent.click(screen.getByRole('link', { name: messages.ManagePage.sections.overview }));
        expect(onSelectSection).toHaveBeenCalledWith('overview');
    });
});
