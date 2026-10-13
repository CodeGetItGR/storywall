import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ComposerProvider } from '@/providers/ComposerProvider';

const mocks = vi.hoisted(() => ({ gateUp: false, canCompose: false, isOpen: false }));

vi.mock('@/hooks/useGuidelinesAcceptanceBlocking', () => ({
    useGuidelinesAcceptanceBlocking: () => ({ isBlocking: mocks.gateUp, guidelinesVersion: null, termsVersion: null }),
}));
vi.mock('@/hooks/useComposerController', () => ({
    useComposerController: () => ({ contextValue: { canCompose: mocks.canCompose }, isOpen: mocks.isOpen, storyComposer: { isOpen: false } }),
}));
vi.mock('@/providers/PublishQueueProvider', () => ({ PublishQueueProvider: ({ children }: { children: unknown }) => children }));
vi.mock('@/components/composer/ComposerModal', () => ({ ComposerModal: () => <p>post composer</p> }));
vi.mock('@/components/composer/PostMediaPreviewModal', () => ({ PostMediaPreviewModal: () => <p>media preview</p> }));
vi.mock('@/components/composer/StoryComposerModal', () => ({ StoryComposerModal: () => <p>story composer</p> }));

describe('ComposerProvider modals', () => {
    afterEach(() => {
        cleanup();
        mocks.gateUp = false;
        mocks.canCompose = false;
        mocks.isOpen = false;
    });

    it('renders its modals once a composer opens', async () => {
        mocks.isOpen = true;
        render(<ComposerProvider>page</ComposerProvider>);

        expect(await screen.findByText('post composer')).toBeInTheDocument();
        expect(screen.getByText('media preview')).toBeInTheDocument();
        expect(screen.getByText('story composer')).toBeInTheDocument();
    });

    it('leaves its modals out on a page where nobody can post', async () => {
        render(<ComposerProvider>page</ComposerProvider>);

        // Let a stray lazy import settle before checking nothing showed up.
        await act(async () => {});

        expect(screen.getByText('page')).toBeInTheDocument();
        expect(screen.queryByText('post composer')).not.toBeInTheDocument();
    });

    // The gate replaces only the page; an open composer must not sit on top of it.
    it('leaves its modals out while the gate is up', async () => {
        mocks.gateUp = true;
        mocks.isOpen = true;
        render(<ComposerProvider>gate</ComposerProvider>);

        await act(async () => {});

        expect(screen.getByText('gate')).toBeInTheDocument();
        expect(screen.queryByText('post composer')).not.toBeInTheDocument();
        expect(screen.queryByText('media preview')).not.toBeInTheDocument();
        expect(screen.queryByText('story composer')).not.toBeInTheDocument();
    });
});
