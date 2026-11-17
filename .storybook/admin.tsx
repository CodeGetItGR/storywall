import type { Decorator } from '@storybook/nextjs-vite';

// The admin console's slate tokens and canvas, which the real page gets from AdminLayoutShell. Drawers,
// dialogs and tip bubbles portal out and carry the scope themselves.
export const withAdminShell: Decorator = (Story) => (
    <div className="admin-shell bg-canvas p-4 text-ink">
        <Story />
    </div>
);
