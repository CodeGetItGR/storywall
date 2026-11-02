'use client';

import { type ReactNode, useRef } from 'react';

import { useVendorPageClickTracking } from '@/hooks/useVendorPageClickTracking';

export function VendorPageShell({ children }: { children: ReactNode }) {
    const pageRef = useRef<HTMLElement>(null);
    useVendorPageClickTracking(pageRef);

    return (
        <main id="top" className="landing-page overflow-x-clip bg-white text-[#151313]" ref={pageRef}>
            {children}
        </main>
    );
}
