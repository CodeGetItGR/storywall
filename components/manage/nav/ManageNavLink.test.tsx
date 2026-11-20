// components/manage/nav/ManageNavLink.test.tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ManageNavLink } from '@/components/manage/nav/ManageNavLink';
import { routes } from '@/lib/routes';

afterEach(cleanup);

describe('ManageNavLink', () => {
    it('opens a section in place inside the dashboard', () => {
        const onSelectSection = vi.fn();
        render(
            <ManageNavLink eventId="e1" navKey="rsvp" onSelectSection={onSelectSection}>
                RSVP
            </ManageNavLink>,
        );
        const link = screen.getByRole('link', { name: 'RSVP' });
        expect(link).toHaveAttribute('href', routes.events.manage('e1', { tab: 'rsvp' }));
        expect(fireEvent.click(link)).toBe(false);
        expect(onSelectSection).toHaveBeenCalledWith('rsvp');
    });

    it('follows the link for a page, and for a new-tab click', () => {
        const onSelectSection = vi.fn();
        render(
            <>
                <ManageNavLink eventId="e1" navKey="vendors" onSelectSection={onSelectSection}>
                    Vendors
                </ManageNavLink>
                <ManageNavLink eventId="e1" navKey="settings" onSelectSection={onSelectSection}>
                    Settings
                </ManageNavLink>
            </>,
        );
        expect(fireEvent.click(screen.getByRole('link', { name: 'Vendors' }))).toBe(true);
        fireEvent.click(screen.getByRole('link', { name: 'Settings' }), { metaKey: true });
        expect(onSelectSection).not.toHaveBeenCalled();
    });

    it('marks the open entry as the current page', () => {
        render(
            <ManageNavLink eventId="e1" navKey="settings" active>
                Settings
            </ManageNavLink>,
        );
        expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page');
    });
});
