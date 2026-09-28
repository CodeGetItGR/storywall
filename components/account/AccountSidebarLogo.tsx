import Image from 'next/image';
import Link from 'next/link';

import { Logo } from '@/components/common/Logo';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

export function AccountSidebarLogo({
    iconOnly = false,
    onNavigateAction,
    className,
}: {
    iconOnly?: boolean;
    onNavigateAction?: () => void;
    className?: string;
}) {
    return (
        <Link href={routes.landing} onClick={onNavigateAction} className={cn('inline-flex w-fit rounded-lg', className)}>
            {iconOnly ? (
                <Image src="/assets/Logo.svg" loading="eager" alt="StoryWall" width={30} height={32} className="h-8 w-auto" unoptimized />
            ) : (
                <Logo iconClassName="h-8 w-auto" wordmarkClassName="h-6 w-auto brightness-0 invert" />
            )}
        </Link>
    );
}
