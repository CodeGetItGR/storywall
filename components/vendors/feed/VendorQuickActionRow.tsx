import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AppLink } from '@/components/ui/AppLink';
import { VendorToolIcon } from '@/components/vendors/VendorToolIcon';
import type { VendorActionKey } from '@/lib/vendors';

type Action = { key: VendorActionKey; href: string };

// The vendor's tools on the feed. The layout follows the count so the space is used well: one tool is a full-width
// row, two sit side by side, three or more are small tiles scrolling sideways.
export function VendorQuickActionRow({ actions }: { actions: Action[] }) {
    const t = useTranslations('Vendors');

    return (
        <section aria-labelledby="vendor-quick-actions-title" className="mt-5">
            {/* Title */}
            <h2 id="vendor-quick-actions-title" className="px-4 text-sm font-semibold text-ink">
                {t('me.toolsTitle')}
            </h2>

            {/* Actions */}
            {actions.length === 1 ? (
                <SingleAction action={actions[0]} label={t(`quickActions.${actions[0].key}`)} />
            ) : actions.length === 2 ? (
                <ul className="mt-2 grid grid-cols-2 gap-2 px-4">
                    {actions.map((action) => (
                        <li key={action.key}>
                            <AppLink
                                href={action.href}
                                className="flex h-full items-center gap-2.5 rounded-2xl bg-card p-2 pr-3 shadow-xs ring-1 ring-ink/5 focus-ring transition-colors hover:bg-surface-muted"
                            >
                                <VendorToolIcon tool={action.key} />
                                <span className="line-clamp-2 min-w-0 text-sm leading-tight font-semibold text-ink">
                                    {t(`quickActions.${action.key}`)}
                                </span>
                            </AppLink>
                        </li>
                    ))}
                </ul>
            ) : (
                <ul className="mt-2 no-scrollbar flex gap-1 overflow-x-auto px-2.5">
                    {actions.map((action) => (
                        <li key={action.key} className="shrink-0">
                            <AppLink
                                href={action.href}
                                className="flex w-20 flex-col items-center gap-1.5 rounded-2xl px-1 py-1.5 focus-ring transition-colors hover:bg-surface-muted"
                            >
                                <VendorToolIcon tool={action.key} />
                                <span className="line-clamp-2 text-center text-xs leading-tight font-medium text-ink">
                                    {t(`quickActions.${action.key}`)}
                                </span>
                            </AppLink>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

// One tool as a plain full-width row: icon, name and an arrow.
function SingleAction({ action, label }: { action: Action; label: string }) {
    return (
        <AppLink href={action.href} className="mt-1 flex items-center gap-3 px-4 py-2 focus-ring transition-colors hover:bg-surface-muted">
            <VendorToolIcon tool={action.key} />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{label}</span>
            <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
        </AppLink>
    );
}
