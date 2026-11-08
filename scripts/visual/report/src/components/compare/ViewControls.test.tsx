import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { copy } from '../../copy';
import { testEntry } from '../../testing/fixture';
import { ViewControls } from './ViewControls';

function show(props: Partial<Parameters<typeof ViewControls>[0]> = {}) {
    render(<ViewControls entry={testEntry('a')} compare="side" zoom="full" onCompare={vi.fn()} onZoom={vi.fn()} {...props} />);
}

const pressed = (name: string) =>
    within(screen.getByRole('group', { name }))
        .queryAllByRole('button', { pressed: true })
        .map((button) => button.textContent);

describe('ViewControls', () => {
    afterEach(cleanup);

    it('shows the choices on a changed story', () => {
        show();
        expect(pressed(copy.compare)).toEqual([copy.sideBySide]);
        expect(pressed(copy.zoom)).toEqual([copy.fullSize]);
    });

    it('shows nothing pressed on a control that is off', () => {
        show({ entry: testEntry('a', { state: 'new' }), compare: 'slider' });
        expect(pressed(copy.compare)).toEqual([]);
        expect(within(screen.getByRole('group', { name: copy.compare })).getByRole('button', { name: copy.slider })).toBeDisabled();
        expect(pressed(copy.zoom)).toEqual([copy.fullSize]);
    });

    it('shows no zoom while the slider is on', () => {
        show({ compare: 'slider' });
        expect(pressed(copy.compare)).toEqual([copy.slider]);
        expect(pressed(copy.zoom)).toEqual([]);
    });
});
