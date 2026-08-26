import Image from 'next/image';
import Link from 'next/link';
import type { MouseEvent } from 'react';

import { cn } from '@/lib/utils';

interface TabLinkProps {
    href: string;
    icon: string;
    label: string;
    active: boolean;
    onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}

export function TabLink({ href, icon, label, active, onClick }: TabLinkProps) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className="flex min-w-12 flex-col items-center gap-0.5 px-3 py-1"
            aria-label={label}
            aria-current={active ? 'page' : undefined}
        >
            <span
                className={cn(
                    'flex h-10 w-10 items-center justify-center transition-all duration-200',
                    active ? 'scale-105 opacity-100' : 'scale-100 opacity-50'
                )}
            >
                <Image src={icon} alt={label} width={22} height={22} className="h-5.5 w-5.5 transition-all duration-200" loading="eager" />
            </span>
        </Link>
    );
}
