'use client';

import { usePathname } from 'next/navigation';

import { isDemoPath } from '@/lib/demo/demoRouting';

export function useIsDemoRoute(): boolean {
    return isDemoPath(usePathname());
}
