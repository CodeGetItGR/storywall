import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppLink } from '@/components/ui/AppLink';

const mocks = vi.hoisted(() => ({ pathname: '/events/e1/gallery', linkProps: vi.fn() }));

vi.mock('next/navigation', () => ({ usePathname: () => mocks.pathname }));
vi.mock('next/link', () => ({
    default: (props: { prefetch?: boolean | null }) => {
        mocks.linkProps(props);
        return null;
    },
}));

describe('AppLink', () => {
    beforeEach(() => {
        mocks.linkProps.mockReset();
        mocks.pathname = '/events/e1/gallery';
    });

    it('keeps the default prefetch outside the demo and the feed', () => {
        render(<AppLink href="/events/e1/manage">Manage</AppLink>);

        expect(mocks.linkProps).toHaveBeenCalledWith(expect.objectContaining({ href: '/events/e1/manage', prefetch: undefined }));
    });

    it('never prefetches inside the demo', () => {
        mocks.pathname = '/demo/wedding/feed';
        render(
            <AppLink href="/demo/wedding/manage" prefetch>
                Manage
            </AppLink>,
        );

        expect(mocks.linkProps).toHaveBeenCalledWith(expect.objectContaining({ prefetch: false }));
    });

    it('never prefetches on an event feed', () => {
        mocks.pathname = '/events/e1/feed';
        render(
            <AppLink href="/events/e1/manage" prefetch>
                Manage
            </AppLink>,
        );

        expect(mocks.linkProps).toHaveBeenCalledWith(expect.objectContaining({ prefetch: false }));
    });
});
