import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { feedCanvasTools } from '@/components/feed/edit/feedCanvasTools';
import type { InvitationElement } from '@/lib/invitation/elements';
import en from '@/messages/en.json';

afterEach(cleanup);

const photo: InvitationElement = { id: 'p1', kind: 'image', image: { source: 'media', mediaId: 'img-1' }, width: 320 };

describe('feedCanvasTools', () => {
    it('puts a ✕ on an added photo that removes it', () => {
        const onRemove = vi.fn();
        render(<NextIntlClientProvider locale="en" messages={en}>{feedCanvasTools(onRemove).element?.(photo)}</NextIntlClientProvider>);
        fireEvent.click(screen.getByRole('button', { name: en.InvitationEditor.sections.delete }));
        expect(onRemove).toHaveBeenCalledWith('p1');
    });

    it('draws nothing in other elements', () => {
        const spacer = { id: 's1', kind: 'spacer', height: 24 } as InvitationElement;
        expect(feedCanvasTools(vi.fn()).element?.(spacer)).toBeNull();
    });
});
