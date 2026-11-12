import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import QrCodeLandingBoundary from '@/app/(main)/q/[token]/QrCodeLandingBoundary';
import { routes } from '@/lib/routes';

const mocks = vi.hoisted(() => ({
    resolution: vi.fn(),
    replace: vi.fn(),
    auth: { isAuthenticated: false, isBootstrapping: false },
    memberships: [] as { eventId: string; displayName: string }[],
    modules: [] as { moduleKey: string; isAvailable: boolean }[],
}));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock('next/image', () => ({ default: ({ alt }: { alt: string }) => <span>{`img:${alt}`}</span> }));
vi.mock('@/components/ui/AppLink', () => ({
    AppLink: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('@/hooks/useQrLinks', () => ({ useQrLinkResolution: (token: string) => mocks.resolution(token) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/hooks/useMyEvents', () => ({ useMyEvents: () => ({ data: mocks.memberships, isLoading: false }) }));
vi.mock('@/hooks/useEventModules', () => ({ useEventModules: () => ({ data: mocks.modules, isLoading: false }) }));
vi.mock('@/components/invite/InviteLayout', () => ({ InviteLayout: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/invite/AnonymousQrMediaUploadForm', () => ({
    AnonymousQrMediaUploadForm: ({ token, member }: { token: string; member: { displayName: string } | null }) => (
        <div>{`upload-form:${token}:${member?.displayName ?? 'guest'}`}</div>
    ),
}));
vi.mock('@/components/qrGuest/GuestWishForm', () => ({ GuestWishForm: ({ token }: { token: string }) => <div>{`wish-form:${token}`}</div> }));

function resolve(data: object) {
    mocks.resolution.mockReturnValue({ data: { eventId: 'e1', ...data }, isLoading: false, error: null });
}

describe('QrCodeLandingBoundary', () => {
    beforeEach(() => {
        mocks.resolution.mockReset();
        mocks.replace.mockReset();
        mocks.auth = { isAuthenticated: false, isBootstrapping: false };
        mocks.memberships = [];
        mocks.modules = [];
    });
    afterEach(cleanup);

    it('offers join and upload on a join code, and opens the upload form in place', () => {
        resolve({ status: 'ACTIVE', targetType: 'EVENT_JOIN', inviteToken: 'inv', uploadToken: 'up' });
        render(<QrCodeLandingBoundary token="t" />);

        expect(screen.getByRole('link', { name: /choices.join/ })).toHaveAttribute('href', routes.inviteToken('inv'));
        fireEvent.click(screen.getByRole('button', { name: /guestCode.uploadButton/ }));
        expect(screen.getByText('upload-form:up:guest')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'guestCode.back' }));
        expect(screen.getByText('choices.title')).toBeInTheDocument();
    });

    it('offers join and upload on an old printed upload code, uploading on that code', () => {
        resolve({ status: 'ACTIVE', targetType: 'MEDIA_UPLOAD', joinInviteToken: 'inv' });
        render(<QrCodeLandingBoundary token="t" />);

        expect(screen.getByRole('link', { name: /choices.join/ })).toHaveAttribute('href', routes.inviteToken('inv'));
        fireEvent.click(screen.getByRole('button', { name: /guestCode.uploadButton/ }));
        expect(screen.getByText('upload-form:t:guest')).toBeInTheDocument();
    });

    it('opens the upload form straight away when it is the only choice', () => {
        resolve({ status: 'ACTIVE', targetType: 'MEDIA_UPLOAD' });
        render(<QrCodeLandingBoundary token="t" />);
        expect(screen.getByText('upload-form:t:guest')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'guestCode.back' })).toBeNull();
    });

    it('goes straight to the invite page when join is the only choice', () => {
        resolve({ status: 'ACTIVE', targetType: 'EVENT_JOIN', inviteToken: 'inv' });
        render(<QrCodeLandingBoundary token="t" />);
        expect(mocks.replace).toHaveBeenCalledWith(routes.inviteToken('inv'));
    });

    it('offers upload and wish on a lite guest code', () => {
        resolve({ status: 'ACTIVE', targetType: 'GUEST', guestActions: ['UPLOAD', 'WISH'] });
        render(<QrCodeLandingBoundary token="t" />);
        fireEvent.click(screen.getByRole('button', { name: /guestCode.wishButton/ }));
        expect(screen.getByText('wish-form:t')).toBeInTheDocument();
    });

    it('gives a member the event, an upload under their name and the wishbook', () => {
        mocks.auth = { isAuthenticated: true, isBootstrapping: false };
        mocks.memberships = [{ eventId: 'e1', displayName: 'Maria' }];
        mocks.modules = [{ moduleKey: 'wishbook', isAvailable: true }];
        resolve({ status: 'ACTIVE', targetType: 'EVENT_JOIN', inviteToken: 'inv', uploadToken: 'up' });
        render(<QrCodeLandingBoundary token="t" />);

        expect(screen.getByRole('link', { name: /choices.open/ })).toHaveAttribute('href', routes.events.feed('e1'));
        expect(screen.getByRole('link', { name: /guestCode.wishButton/ })).toHaveAttribute('href', routes.events.tools.wishbook('e1'));
        expect(screen.queryByRole('link', { name: /choices.join/ })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /guestCode.uploadButton/ }));
        expect(screen.getByText('upload-form:up:Maria')).toBeInTheDocument();
    });

    it('shows unavailable for an active GUEST code with no actions', () => {
        resolve({ status: 'ACTIVE', targetType: 'GUEST', guestActions: [] });
        render(<QrCodeLandingBoundary token="t" />);
        expect(screen.getByText('unavailable.title')).toBeInTheDocument();
    });

    it('shows revoked for a revoked GUEST code', () => {
        resolve({ status: 'REVOKED', targetType: 'GUEST', guestActions: ['WISH'] });
        render(<QrCodeLandingBoundary token="t" />);
        expect(screen.getByText('revoked.title')).toBeInTheDocument();
    });
});
