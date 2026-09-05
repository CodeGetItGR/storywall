'use client';

import type { ReactNode } from 'react';

import { DEMO_USER_ID } from '@/lib/demo/demoConstants';
import { AuthContext } from '@/providers/AuthProvider';

// Renders the real AuthContext (imported, not reimplemented) with a static fake session —
// every component calling useAuth()/useIsHost()/etc. keeps working completely unmodified.
// No network bootstrap, no isBootstrapping flicker: the demo is "logged in" the instant this
// mounts.
export function DemoAuthProvider({ children }: { children: ReactNode }) {
    return (
        <AuthContext.Provider
            value={{
                user: {
                    userId: DEMO_USER_ID,
                    email: null,
                    firstName: 'Alex',
                    lastName: 'Rivera',
                    profilePictureUrl: null,
                    authProvider: 'LOCAL',
                    isGuestAccount: false,
                    status: 'ACTIVE',
                    createdAt: new Date().toISOString(),
                    role: 'USER',
                },
                isAuthenticated: true,
                isBootstrapping: false,
                register: () => Promise.reject(new Error('Not available in the demo')),
                login: () => Promise.reject(new Error('Not available in the demo')),
                oauth: () => Promise.reject(new Error('Not available in the demo')),
                logout: () => Promise.resolve(),
                updateProfile: () => {},
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
