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
            <Image
                src={icon}
                alt={label}
                width={20}
                height={20}
                className={cn('h-5 w-5 transition-opacity', active ? 'opacity-100' : 'opacity-70')}
                loading="eager"
            />
        </Link>
    );
}
