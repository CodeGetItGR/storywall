import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse } from 'msw';
import { fn } from 'storybook/test';

import { withAdminShell } from '@/.storybook/adminShell';
import { withAppContext } from '@/.storybook/appContext';
import { AdminNavigationProvider } from '@/components/admin/AdminNavigationContext';
import { AdminShellNav } from '@/components/admin/AdminShellNav';

const emptyPage = { content: [], page: { size: 1, number: 0, totalElements: 0, totalPages: 0 } };

// The console's sidebar. Admins get the Save my date link in Catalog; marketing doesn't.
const meta = {
    title: 'Admin/AdminShellNav',
    component: AdminShellNav,
    args: { mobile: true, email: 'admin@storywall.gr', userId: 'usr-admin', onLogoutAction: fn() },
    decorators: [
        withAppContext,
        withAdminShell,
        (Story, context) => (
            <AdminNavigationProvider role={context.parameters.role ?? 'ADMIN'}>
                <div className="w-64">
                    <Story />
                </div>
            </AdminNavigationProvider>
        ),
    ],
    beforeEach({ msw }) {
        msw.use(
            http.get('*/api/admin/partner-applications', () => HttpResponse.json(emptyPage)),
            http.get('*/api/admin/vendor-messages', () => HttpResponse.json(emptyPage)),
            http.get('*/api/admin/outreach/requests/pending-count', () => HttpResponse.json({ count: 0 })),
        );
    },
} satisfies Meta<typeof AdminShellNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Admin: Story = {};

export const Marketing: Story = {
    parameters: { role: 'MARKETING' },
};
