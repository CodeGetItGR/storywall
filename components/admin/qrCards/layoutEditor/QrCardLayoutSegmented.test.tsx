import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { QrCardLayoutSegmented } from '@/components/admin/qrCards/layoutEditor/QrCardLayoutSegmented';

afterEach(cleanup);

describe('QrCardLayoutSegmented', () => {
    it('anchors each hidden radio to its label, so focusing it does not shift the editor', () => {
        render(
            <QrCardLayoutSegmented
                name="align"
                legend="Align"
                value="left"
                options={[
                    { value: 'left', label: 'Left' },
                    { value: 'right', label: 'Right' },
                ]}
                onChangeAction={vi.fn()}
            />,
        );

        for (const radio of screen.getAllByRole('radio')) {
            expect(radio.closest('label')).toHaveClass('relative');
        }
    });
});
