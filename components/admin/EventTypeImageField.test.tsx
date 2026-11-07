import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EventTypeImageField } from '@/components/admin/EventTypeImageField';
import type { EventTypeCardImage } from '@/hooks/useEventTypeCardImage';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/components/ui/ConfirmActionModal', () => ({ ConfirmActionModal: () => null }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => '' }));
vi.mock('@/hooks/useEventTypeCardImage', () => ({ EVENT_TYPE_IMAGE_ACCEPT: 'image/*' }));

afterEach(cleanup);

describe('EventTypeImageField', () => {
    it('anchors the hidden file input to its label, so focusing it does not shift the drawer', () => {
        const image = { imageUrl: null, isUploading: false, isRemoving: false, error: null, confirmingRemove: false } as unknown as EventTypeCardImage;
        const { container } = render(<EventTypeImageField image={image} />);

        expect(container.querySelector('input[type="file"]')?.closest('label')).toHaveClass('relative');
    });
});
