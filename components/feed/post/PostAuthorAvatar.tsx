import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import Avatar from '@/components/ui/avatar';
import { getInitials } from '@/lib/format';

export function PostAuthorAvatar({
    avatarUrl,
    name,
    subtitle,
    timeAgo,
    isHostPost = false,
    roleChip,
}: {
    avatarUrl?: string | null;
    name: string;
    subtitle?: string | null;
    timeAgo: { unit: 'now' | 'minutes' | 'hours' | 'days'; value: number };
    isHostPost?: boolean;
    roleChip?: ReactNode;
}) {
    const t = useTranslations('PostCard');

    return (
        <section className="group flex items-center gap-3">
            {/* Author marker */}
            {isHostPost ? (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full p-0.5 bg-gradient-logo" role="img" aria-label={name}>
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-background p-0.5">
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-logo">
                            <Star className="h-5 w-5 fill-white text-white" strokeWidth={1.8} aria-hidden="true" />
                        </div>
                    </div>
                </div>
            ) : (
                <Avatar src={avatarUrl} initials={getInitials(name)} size="md" alt={name} />
            )}

            {/* Author details */}
            <div className="min-w-0">
                <p className="flex min-w-0 items-center gap-1.5 text-sm leading-tight font-semibold text-ink">
                    <span className="truncate">{name}</span>
                    {roleChip}
                </p>
                <div className="flex items-center gap-1.5">
                    {subtitle && <span className="text-xs text-ink-muted capitalize">{subtitle}</span>}
                    {subtitle && <span className="text-xs text-ink-faint">·</span>}
                    <span className="text-xs text-ink-muted">
                        {timeAgo.unit === 'now' ? t('justNow') : t(`timeAgo.${timeAgo.unit}`, { count: timeAgo.value })}
                    </span>
                </div>
            </div>
        </section>
    );
}
