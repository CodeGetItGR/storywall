import type { Decorator } from '@storybook/nextjs-vite';

import { PortalScopeProvider } from '@/components/ui/PortalScope';

// The admin console's slate scope, as AdminLayoutShell gives it, for drawers and modals too.
export const withAdminShell: Decorator = (Story) => (
    <PortalScopeProvider className="admin-shell">
        <div className="admin-shell min-h-screen bg-canvas text-ink">
            <Story />
        </div>
    </PortalScopeProvider>
);
