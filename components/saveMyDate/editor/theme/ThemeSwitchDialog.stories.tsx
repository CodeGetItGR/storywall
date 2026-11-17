import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { ThemeSwitchDialog } from '@/components/saveMyDate/editor/theme/ThemeSwitchDialog';
import type { DraftTheme } from '@/hooks/useDraftThemes';
import type { ThemeSwitchStep } from '@/hooks/useThemeSwitch';
import type { InvitationDocument } from '@/lib/invitation/document';
import type { ThemeSwitchPlan } from '@/lib/invitation/themeSwitch';

function confirming(plan: Partial<ThemeSwitchPlan>): ThemeSwitchStep {
    return {
        kind: 'confirming',
        slug: 'linen',
        theme: { slug: 'linen', name: 'Linen' } as DraftTheme,
        plan: { document: {} as InvitationDocument, hidden: [], restored: [], resetsTextLook: false, ...plan },
    };
}

const meta = {
    title: 'SaveMyDate/Editor/ThemeSwitchDialog',
    component: ThemeSwitchDialog,
    args: { step: confirming({}), onConfirm: fn(), onCancel: fn() },
} satisfies Meta<typeof ThemeSwitchDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NothingElseChanges: Story = {
    play: async ({ args, globals }) => {
        const dialog = await waitForOpen('dialog');
        await userEvent.click(within(dialog).getByRole('button', { name: copyFor(globals).InvitationEditor.themeSwitch.change }));
        await expect(args.onConfirm).toHaveBeenCalledOnce();
    },
};

export const HidesSections: Story = {
    args: {
        step: confirming({
            hidden: [
                { id: 's-gift', type: 'gift' },
                { id: 's-faq', type: 'faq' },
            ],
            resetsTextLook: true,
        }),
    },
    play: async () => {
        await waitForOpen('dialog');
    },
};

export const ShowsSectionsAgain: Story = {
    args: { step: confirming({ restored: [{ id: 's-gift', type: 'gift' }] }) },
    tags: ['visual-mobile-only'],
    globals: { viewport: { value: 'mobile' } },
    play: async () => {
        await waitForOpen('dialog');
    },
};
