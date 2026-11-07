import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CollaboratorBrandingImageField } from '@/components/admin/collaborations/CollaboratorBrandingImageField';
import type { CollaboratorResponseDto } from '@/lib/api/types';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/components/ui/ConfirmActionModal', () => ({ ConfirmActionModal: () => null }));
vi.mock('@/hooks/useCollaboratorBranding', () => ({
    BRANDING_IMAGE_ACCEPT: 'image/*',
    useCollaboratorBrandingImage: () => ({ imageUrl: null, canRemove: false, isUploading: false, isRemoving: false, error: null, confirmingRemove: false }),
}));

afterEach(cleanup);

describe('CollaboratorBrandingImageField', () => {
    it('anchors the hidden file input to its label, so focusing it does not shift the drawer', () => {
        const { container } = render(<CollaboratorBrandingImageField collaborator={{} as CollaboratorResponseDto} kind="logo" />);

        expect(container.querySelector('input[type="file"]')?.closest('label')).toHaveClass('relative');
    });
});
