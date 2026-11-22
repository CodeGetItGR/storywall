import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppLink } from '@/components/ui/AppLink';
import { useInAppLeaveGuard } from '@/hooks/useInAppLeaveGuard';

afterEach(cleanup);

function Page({ active, onLeave }: { active: boolean; onLeave: (href: string) => void }) {
    useInAppLeaveGuard(active, onLeave);
    return <AppLink href="/events/e-1/manage">Manage</AppLink>;
}

describe('useInAppLeaveGuard', () => {
    it('stops an in-app link and hands its page over', () => {
        const onLeave = vi.fn();
        render(<Page active onLeave={onLeave} />);
        // fireEvent returns false when the default was prevented.
        expect(fireEvent.click(screen.getByText('Manage'))).toBe(false);
        expect(onLeave).toHaveBeenCalledWith('/events/e-1/manage');
    });

    it('does nothing while off', () => {
        const onLeave = vi.fn();
        render(<Page active={false} onLeave={onLeave} />);
        fireEvent.click(screen.getByText('Manage'));
        expect(onLeave).not.toHaveBeenCalled();
    });
});
