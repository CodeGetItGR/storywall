import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ComposerProvider } from '@/providers/ComposerProvider';

const mocks = vi.hoisted(() => ({ gateUp: false }));

vi.mock('@/hooks/useGuidelinesAcceptanceBlocking', () => ({ useGuidelinesAcceptanceBlocking: () => mocks.gateUp }));
vi.mock('@/hooks/useComposerController', () => ({ useComposerController: () => ({ contextValue: {}, storyComposer: {} }) }));
vi.mock('@/providers/PublishQueueProvider', () => ({ PublishQueueProvider: ({ children }: { children: unknown }) => children }));
vi.mock('@/components/composer/ComposerModal', () => ({ ComposerModal: () => <p>post composer</p> }));
vi.mock('@/components/composer/PostMediaPreviewModal', () => ({ PostMediaPreviewModal: () => <p>media preview</p> }));
vi.mock('@/components/composer/StoryComposerModal', () => ({ StoryComposerModal: () => <p>story composer</p> }));

describe('ComposerProvider while the guidelines gate is up', () => {
    afterEach(() => {
        cleanup();
        mocks.gateUp = false;
    });

    it('renders its modals normally', () => {
        render(<ComposerProvider>page</ComposerProvider>);

        expect(screen.getByText('post composer')).toBeInTheDocument();
        expect(screen.getByText('media preview')).toBeInTheDocument();
        expect(screen.getByText('story composer')).toBeInTheDocument();
    });

    // The gate replaces only the page; an open composer must not sit on top of it.
    it('leaves its modals out while the gate is up', () => {
        mocks.gateUp = true;
        render(<ComposerProvider>gate</ComposerProvider>);

        expect(screen.getByText('gate')).toBeInTheDocument();
        expect(screen.queryByText('post composer')).not.toBeInTheDocument();
        expect(screen.queryByText('media preview')).not.toBeInTheDocument();
        expect(screen.queryByText('story composer')).not.toBeInTheDocument();
    });
});
