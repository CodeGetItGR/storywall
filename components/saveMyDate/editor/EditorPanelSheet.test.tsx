import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EditorDockedPanel } from '@/components/saveMyDate/editor/EditorDockedPanel';
import { EditorPanelSheet } from '@/components/saveMyDate/editor/EditorPanelSheet';
import { SectionSettingsSheet } from '@/components/saveMyDate/editor/settings/SectionSettingsSheet';
import { TextColorSetting } from '@/components/saveMyDate/editor/TextColorSetting';
import { ColorSwatch } from '@/components/ui/color/ColorSwatch';
import en from '@/messages/en.json';

afterEach(cleanup);

const { moreColors } = en.InvitationEditor;
const swatch = <ColorSwatch value="#336699" label="Main color" onChange={vi.fn()} />;

const show = (children: ReactNode) =>
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            {children}
        </NextIntlClientProvider>,
    );

const sheet = (children: ReactNode) => (
    <EditorPanelSheet open title="Settings" onClose={vi.fn()}>
        {children}
    </EditorPanelSheet>
);

async function openSwatch() {
    await userEvent.click(await screen.findByRole('button', { name: 'Main color' }));
    return screen.findByRole('dialog', { name: 'Main color' });
}

async function openMixer(container: HTMLElement) {
    await userEvent.click(within(container).getByRole('button', { name: moreColors }));
    return screen.findByRole('dialog', { name: moreColors });
}

describe('EditorPanelSheet colour popovers', () => {
    it("are light: a swatch's circles and their mixer", async () => {
        show(sheet(swatch));
        const circles = await openSwatch();
        expect(circles).toHaveClass('smd-editor-sheet');
        expect(await openMixer(circles)).toHaveClass('smd-editor-sheet');
    });

    it("are light: the text colour's mixer", async () => {
        show(sheet(<TextColorSetting value="#4f4a3f" themeColors={[]} onChange={vi.fn()} />));
        expect(await openMixer(await screen.findByRole('dialog', { name: 'Settings' }))).toHaveClass('smd-editor-sheet');
    });

    it('stay dark in the dock', async () => {
        show(<EditorDockedPanel title="Settings">{swatch}</EditorDockedPanel>);
        const circles = await openSwatch();
        expect(circles).not.toHaveClass('smd-editor-sheet');
        expect(await openMixer(circles)).not.toHaveClass('smd-editor-sheet');
    });

    it("stay dark in a section's settings sheet", async () => {
        show(
            <SectionSettingsSheet open title="Date" onClose={vi.fn()}>
                {swatch}
            </SectionSettingsSheet>,
        );
        expect(await openSwatch()).not.toHaveClass('smd-editor-sheet');
    });
});
