'use client';

import { createContext, type ReactNode, useContext } from 'react';

const PortalScopeContext = createContext<string | undefined>(undefined);

// Overlays portal into <body>, outside any wrapper that re-skins its subtree by
// redeclaring tokens (e.g. the admin console's .admin-shell). A provider around
// such a wrapper hands its scope class to shared overlays like Modal, so they
// re-enter that scope instead of falling back to the app's default palette.
export function PortalScopeProvider({ className, children }: { className: string; children: ReactNode }) {
    return <PortalScopeContext.Provider value={className}>{children}</PortalScopeContext.Provider>;
}

export function usePortalScopeClass() {
    return useContext(PortalScopeContext);
}
