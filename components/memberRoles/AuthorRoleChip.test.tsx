import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthorRoleChip } from '@/components/memberRoles/AuthorRoleChip';
import type { AuthorDto } from '@/lib/api/types';

vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (key: string) => `${ns}.${key}` }));
vi.mock('@/hooks/useAuthorRole', () => ({
    useAuthorRole: (author: AuthorDto | null) => ({ label: author?.roleKey ? 'Bride' : null, isMine: false }),
}));

function author(overrides: Partial<AuthorDto> = {}): AuthorDto {
    return { memberId: 'm1', displayName: 'Nik', nickname: null, role: 'ATTENDEE', avatarUrl: null, roleKey: null, customRole: null, ...overrides };
}

afterEach(cleanup);

describe('AuthorRoleChip', () => {
    it('shows the vendor type for a vendor', () => {
        render(<AuthorRoleChip author={author({ vendorType: 'PHOTOGRAPHER' })} />);
        expect(screen.getByText('Vendors.types.PHOTOGRAPHER')).toBeTruthy();
    });

    it('prefers the vendor type over a member role', () => {
        render(<AuthorRoleChip author={author({ vendorType: 'MUSIC', roleKey: 'BRIDE' })} />);
        expect(screen.getByText('Vendors.types.MUSIC')).toBeTruthy();
        expect(screen.queryByText('Bride')).toBeNull();
    });

    it('keeps the member role for everyone else', () => {
        render(<AuthorRoleChip author={author({ roleKey: 'BRIDE' })} />);
        expect(screen.getByText('Bride')).toBeTruthy();
    });

    it('renders nothing without either', () => {
        const { container } = render(<AuthorRoleChip author={author({ vendorType: null })} />);
        expect(container.textContent).toBe('');
    });
});
