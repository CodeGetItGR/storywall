import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Flag, Trash2 } from 'lucide-react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RowActionsMenu } from './RowActionsMenu';

afterEach(cleanup);

describe('RowActionsMenu', () => {
    it('runs the chosen item', async () => {
        const onReport = vi.fn();
        render(
            <RowActionsMenu
                label="More options for Anna"
                items={[
                    { key: 'report', label: 'Report', icon: Flag, onSelect: onReport },
                    { key: 'remove', label: 'Remove', icon: Trash2, tone: 'danger', onSelect: vi.fn() },
                ]}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'More options for Anna' }));
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Report' }));

        expect(onReport).toHaveBeenCalled();
    });

    it('renders nothing without items', () => {
        const { container } = render(<RowActionsMenu label="More" items={[]} />);
        expect(container).toBeEmptyDOMElement();
    });
});
