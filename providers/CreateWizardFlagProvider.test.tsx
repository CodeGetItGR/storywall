import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { CreateWizardFlagProvider, useCreateEventButtonLabel, useCreateWizardEnabled } from '@/providers/CreateWizardFlagProvider';

function Probe() {
    return (
        <span>
            {useCreateWizardEnabled() ? 'on' : 'off'}:{useCreateEventButtonLabel()}
        </span>
    );
}

afterEach(cleanup);

describe('CreateWizardFlagProvider', () => {
    it('is off, with no label, outside the provider', () => {
        render(<Probe />);
        expect(screen.getByText('off:')).toBeTruthy();
    });

    it('reads the values the server passed', () => {
        render(
            <CreateWizardFlagProvider enabled createLabel="Create an event">
                <Probe />
            </CreateWizardFlagProvider>,
        );
        expect(screen.getByText('on:Create an event')).toBeTruthy();
    });
});
