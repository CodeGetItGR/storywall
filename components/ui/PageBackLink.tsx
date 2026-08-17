'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type PageBackLinkProps = {
    href: ComponentPropsWithoutRef<typeof Link>['href'];
    children: ReactNode;
    className?: string;
};

export function PageBackLink({ href, children, className }: PageBackLinkProps) {
    return (
        <Link href={href} className={cn('inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-primary-dark', className)}>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            {children}
        </Link>
    );
}
