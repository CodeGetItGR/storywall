import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { type ToolMenuItem } from '@/hooks/useToolsMenuItems';

/**
 * The member-facing counterpart to HostContextSections: just the plain tool
 * links (RSVP, schedule, gallery, wishbook, gifts) that MobileTabBar's
 * context menu shows non-host members, for desktop widths where there's no
 * mobile tab bar to hold them.
 */
export function MemberActionsSection({ items }: { items: ToolMenuItem[] }) {
    const t = useTranslations('RightContextPanel');

    if (items.length === 0) return null;

    return (
        <div className={''}>
            <p className="mb-2 text-sm font-semibold text-ink">{t('toolsTitle')}</p>
            <div className="space-y-1">
                {items.map(({ key, href, icon: Icon, label }) => (
                    <Link
                        key={key}
                        href={href}
                        className="group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                    >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="min-w-0 truncate">{label}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
