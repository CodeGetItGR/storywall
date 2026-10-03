import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PostActionsMenu } from '@/components/feed/post/PostActionsMenu';

afterEach(cleanup);

describe('PostActionsMenu', () => {
    it('offers Report role when given', async () => {
        const onReportRole = vi.fn();
        render(<PostActionsMenu disabled={false} isDeleting={false} moreLabel="More" reportRoleLabel="Report role" onReportRoleAction={onReportRole} />);

        fireEvent.click(screen.getByRole('button', { name: 'More' }));
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Report role' }));

        expect(onReportRole).toHaveBeenCalled();
    });

    it('leaves it out otherwise', async () => {
        render(<PostActionsMenu disabled={false} isDeleting={false} moreLabel="More" reportLabel="Report post" onReportAction={vi.fn()} />);

        fireEvent.click(screen.getByRole('button', { name: 'More' }));

        expect(await screen.findByRole('menuitem', { name: 'Report post' })).toBeInTheDocument();
        expect(screen.queryByRole('menuitem', { name: 'Report role' })).not.toBeInTheDocument();
    });
});
